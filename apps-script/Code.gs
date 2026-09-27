/**
 * Sarle — newsletter sign-ups → Google Sheets.
 *
 * Deployed as a web app (Execute as: Me, Who has access: Anyone). The web app
 * only APPENDS rows; it never returns sheet contents to the visitor.
 *
 * Script Properties (Project Settings → Script Properties):
 *   SPREADSHEET_ID — ID of the Google Sheet (not the uploaded .xlsx file).
 *
 * Sheet "Подписчики", row 1 must be exactly:
 *   A1: Дата подписки | B1: RU | C1: EN | D1: ET
 * Every sign-up is one new row: [date, email in its language column, the other two empty].
 */

var SHEET_NAME = 'Подписчики';
var HEADERS = ['Дата подписки', 'RU', 'EN', 'ET'];
var LANG_COLUMN = { RU: 2, EN: 3, ET: 4 };
var TIME_ZONE = 'Europe/Tallinn';
var DATE_FORMAT = 'dd.MM.yyyy HH:mm';
var MAX_EMAIL_LENGTH = 254;
var LOCK_WAIT_MS = 10000;
var GLOBAL_LIMIT_PER_MINUTE = 30;

// First character must be a letter or digit, so a stored address can never
// start with = + - @ (spreadsheet formula injection).
var EMAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._%+'-]{0,63}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

function doPost(e) {
  var params = (e && e.parameter) || {};
  var result;
  try {
    result = handleSubscription_(params);
  } catch (err) {
    // Details go to the Executions log only, never to the visitor.
    console.error('Subscription failed: ' + (err && err.stack ? err.stack : err));
    result = { ok: false, code: 'server_error' };
  }
  result.requestId = cleanRequestId_(params.requestId);
  return jsonOutput_(result);
}

function doGet() {
  return jsonOutput_({ ok: false, code: 'method_not_allowed' });
}

function handleSubscription_(p) {
  // Honeypot: real visitors never see or fill this field. Answer like a
  // success so bots learn nothing, but write nothing.
  if (String(p.website || '') !== '') return { ok: true, code: 'ok' };

  if (String(p.consent || '') !== 'yes') return { ok: false, code: 'consent_required' };

  var lang = String(p.lang || '').trim();
  if (!Object.prototype.hasOwnProperty.call(LANG_COLUMN, lang)) return { ok: false, code: 'invalid_language' };

  var email = String(p.email || '').trim();
  if (!isValidEmail_(email)) return { ok: false, code: 'invalid_email' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return { ok: false, code: 'busy' };
  try {
    if (!takeRateSlot_()) return { ok: false, code: 'rate_limited' };

    var sheet = getSheet_();
    assertHeaders_(sheet);

    var col = LANG_COLUMN[lang];
    var needle = normalizeEmail_(email);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existing = sheet.getRange(2, col, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < existing.length; i++) {
        // Same address in the same language column: no new row, neutral success.
        if (normalizeEmail_(existing[i][0]) === needle) return { ok: true, code: 'ok' };
      }
    }

    var row = [new Date(), '', '', ''];
    row[col - 1] = email;
    var target = sheet.getRange(lastRow + 1, 1, 1, HEADERS.length);
    // Emails are stored as plain text ('@'), the date as a real Date value.
    target.setNumberFormats([[DATE_FORMAT, '@', '@', '@']]);
    target.setValues([row]);
    SpreadsheetApp.flush();
    return { ok: true, code: 'ok' };
  } finally {
    lock.releaseLock();
  }
}

function isValidEmail_(email) {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (/^[=+\-@\t\r]/.test(email)) return false;
  if (email.indexOf('..') !== -1) return false;
  return EMAIL_RE.test(email);
}

function normalizeEmail_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Script Property SPREADSHEET_ID is not set');
  var sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');
  return sheet;
}

function assertHeaders_(sheet) {
  var actual = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
  for (var i = 0; i < HEADERS.length; i++) {
    if (String(actual[i]).trim() !== HEADERS[i]) {
      throw new Error('Header mismatch in column ' + (i + 1) + ': expected "' + HEADERS[i] + '", got "' + actual[i] + '"');
    }
  }
}

// Basic abuse brake: at most GLOBAL_LIMIT_PER_MINUTE accepted requests per
// minute for the whole form. Called under the script lock, so it is atomic.
function takeRateSlot_() {
  var cache = CacheService.getScriptCache();
  var key = 'rate:' + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(key) || 0);
  if (count >= GLOBAL_LIMIT_PER_MINUTE) return false;
  cache.put(key, String(count + 1), 120);
  return true;
}

function cleanRequestId_(value) {
  var s = String(value || '');
  return /^[A-Za-z0-9-]{8,64}$/.test(s) ? s : '';
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run manually from the editor (select checkSetup → Run) after setting
 * SPREADSHEET_ID. Checks access, sheet name, headers and time zones.
 * Writes nothing to the sheet.
 */
function checkSetup() {
  var problems = [];
  var ss = null;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    problems.push('Script Property SPREADSHEET_ID не задан.');
  } else {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (err) {
      problems.push('Не удалось открыть таблицу по SPREADSHEET_ID. Проверьте, что это Google Таблица, а не файл .xlsx: ' + err);
    }
  }
  if (ss) {
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      problems.push('Лист «' + SHEET_NAME + '» не найден.');
    } else {
      try { assertHeaders_(sheet); } catch (err) { problems.push(String(err.message || err)); }
    }
    if (ss.getSpreadsheetTimeZone() !== TIME_ZONE) {
      problems.push('Часовой пояс таблицы: ' + ss.getSpreadsheetTimeZone() + ', нужен ' + TIME_ZONE + ' (Файл → Настройки).');
    }
  }
  if (Session.getScriptTimeZone() !== TIME_ZONE) {
    problems.push('Часовой пояс проекта: ' + Session.getScriptTimeZone() + ', нужен ' + TIME_ZONE + ' (Настройки проекта).');
  }
  if (problems.length) {
    console.error('Найдены проблемы:\n- ' + problems.join('\n- '));
  } else {
    console.log('Всё в порядке: таблица доступна, заголовки и часовые пояса верны.');
  }
  return problems;
}
