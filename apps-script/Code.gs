/**
 * Sarle — newsletter sign-ups → Google Sheets.
 *
 * Deployed as a web app (Execute as: Me, Who has access: Anyone). The web app
 * only APPENDS rows; it never returns sheet contents to the visitor.
 *
 * Script Properties (Project Settings → Script Properties):
 *   SPREADSHEET_ID   — ID of the Google Sheet (not the uploaded .xlsx file).
 *   NOTIFY_EMAIL     — where notice emails go (optional).
 *   NOTIFY_FROM      — the address notices are sent FROM, e.g. gallery@sarle.ee
 *                      (optional). It must be a verified "Send mail as" alias
 *                      in the Gmail of the account that runs the script.
 *   TURNSTILE_SECRET — Cloudflare Turnstile secret key (optional). When set,
 *                      every sign-up and application must carry a valid
 *                      captcha token; the site key goes into
 *                      site/js/newsletter-config.js.
 *
 * Sheet "Подписчики", row 1 must be exactly:
 *   A1: Дата подписки | B1: RU | C1: EN | D1: ET
 * Every sign-up is one new row: [date, email in its language column, the other two empty].
 *
 * Requests with form=open-call are Open Call 2027 applications: they go to
 * handleOpenCall_ in OpenCall.gs (same project, same web app URL).
 */

var SHEET_NAME = 'Подписчики';
var HEADERS = ['Дата подписки', 'RU', 'EN', 'ET'];
var LANG_COLUMN = { RU: 2, EN: 3, ET: 4 };
var TIME_ZONE = 'Europe/Tallinn';
var DATE_FORMAT = 'dd.MM.yyyy HH:mm';
var MAX_EMAIL_LENGTH = 254;
var LOCK_WAIT_MS = 10000;
var GLOBAL_LIMIT_PER_MINUTE = 30;
// Email notice for every NEW subscriber (not for repeats). Address: see notifyEmail_.
var NEWSLETTER_NOTIFY_DEFAULT = 'gallery@sarle.ee';
// At most this many notice emails per day (subscribers and applications
// together), so a flood of fake sign-ups cannot use up the Google mail quota
// (about 100 a day on a free account). Saving is never limited by this.
var MAIL_LIMIT_PER_DAY = 60;
var NOTICE_SENDER_NAME = 'Sarle Art Gallery & Studio';
var TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// First character must be a letter or digit, so a stored address can never
// start with = + - @ (spreadsheet formula injection).
var EMAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._%+'-]{0,63}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

function doPost(e) {
  var params = (e && e.parameter) || {};
  var openCall = String(params.form || '') === 'open-call';
  var result;
  try {
    // Open Call applications (OpenCall.gs) share this web app and its URL.
    result = openCall ? handleOpenCall_((e && e.parameters) || {}) : handleSubscription_(params);
  } catch (err) {
    // Details go to the Executions log only, never to the visitor.
    console.error((openCall ? 'Open Call application' : 'Subscription') + ' failed: ' + (err && err.stack ? err.stack : err));
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

  if (!verifyCaptcha_(p['cf-turnstile-response'])) return { ok: false, code: 'captcha_failed' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return { ok: false, code: 'busy' };
  var added = false, mayMail = false;
  try {
    var result = addSubscriber_(email, lang, function () { added = true; });
    if (added) mayMail = takeMailSlot_();
    return result;
  } finally {
    lock.releaseLock();
    if (mayMail) notifySubscriber_(email, lang);
  }
}

// Runs under the script lock. Calls onAdd() once a new row has been written.
function addSubscriber_(email, lang, onAdd) {
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
  onAdd();
  return { ok: true, code: 'ok' };
}

/* Where email notices go: the Script Property NOTIFY_EMAIL (Project Settings →
   Script Properties), so no personal address sits in this public code.
   Several addresses: comma-separated. "off" switches notices off. Without the
   property, notices go to `fallback`. Shared with OpenCall.gs. */
function notifyEmail_(fallback) {
  var p = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (p == null || String(p).trim() === '') return fallback;
  p = String(p).trim();
  return p.toLowerCase() === 'off' ? '' : p;
}

// A short notice about a new subscriber. Runs after the row is saved; a failed
// notice never turns the sign-up into an error.
function notifySubscriber_(email, lang) {
  var to = notifyEmail_(NEWSLETTER_NOTIFY_DEFAULT);
  if (!to) return;
  try {
    sendNotice_(to, 'Sarle: новый подписчик рассылки (' + lang + ')',
      'Новый подписчик рассылки: ' + email + '\nЯзык сайта: ' + lang + '\n\nЛист «' + SHEET_NAME + '» в таблице подписчиков.');
  } catch (err) {
    console.error('Newsletter notice not sent: ' + err);
  }
}

/* Cloudflare Turnstile: checks the token the visitor's browser got from the
   captcha. Off (always true) while the Script Property TURNSTILE_SECRET is not
   set. If Cloudflare itself cannot be reached, the request is let through and
   logged, so an outage there never blocks real visitors. Shared with
   OpenCall.gs. */
function verifyCaptcha_(token) {
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret || !String(secret).trim()) return true;
  token = String(token == null ? '' : token).trim();
  if (!token || token.length > 2048) return false;
  var data;
  try {
    var res = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
      method: 'post',
      payload: { secret: String(secret).trim(), response: token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
    data = JSON.parse(res.getContentText());
  } catch (err) {
    console.error('Turnstile check unavailable, request let through: ' + err);
    return true;
  }
  return data && data.success === true;
}

/* Sends a notice email. With the Script Property NOTIFY_FROM set to an address
   that is a verified "Send mail as" alias of this Gmail account (for example
   gallery@sarle.ee), the email goes out FROM that address through Gmail; the
   recipient sees the company address and replies go there. Otherwise it is
   sent from the script owner's address with the gallery's name. Shared with
   OpenCall.gs. */
function sendNotice_(to, subject, body) {
  var from = String(PropertiesService.getScriptProperties().getProperty('NOTIFY_FROM') || '').trim();
  if (from) {
    var aliases = GmailApp.getAliases().map(function (a) { return String(a).toLowerCase(); });
    if (aliases.indexOf(from.toLowerCase()) !== -1) {
      GmailApp.sendEmail(to, subject, body, { from: from, name: NOTICE_SENDER_NAME, replyTo: from });
      return 'alias';
    }
    console.error('NOTIFY_FROM "' + from + '" is not a "Send mail as" address of this Gmail; sending from the account address instead.');
  }
  MailApp.sendEmail({ to: to, subject: subject, body: body, name: NOTICE_SENDER_NAME, replyTo: from || undefined });
  return 'account';
}

/* Run from the editor after setting NOTIFY_FROM: sends one test notice and
   says in the log which address it went out from. */
function checkNoticeSender() {
  var to = notifyEmail_(NEWSLETTER_NOTIFY_DEFAULT);
  var from = PropertiesService.getScriptProperties().getProperty('NOTIFY_FROM');
  console.log('Gmail «Отправлять как»: ' + (GmailApp.getAliases().join(', ') || '(нет)'));
  var how = sendNotice_(to, 'Sarle: проверка отправителя уведомлений', 'Проверка: письмо отправлено скриптом сайта Sarle.');
  console.log(how === 'alias'
    ? 'Письмо отправлено на ' + to + ' С АДРЕСА ' + from + '.'
    : 'Письмо отправлено на ' + to + ' с адреса аккаунта Google (' + Session.getEffectiveUser().getEmail() + '). ' +
      (from ? 'Адрес ' + from + ' не найден среди «Отправлять как» в Gmail.' : 'Свойство NOTIFY_FROM не задано.'));
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

// One of MAIL_LIMIT_PER_DAY notice emails for today (Tallinn date). Called
// under the script lock, so the count is exact.
function takeMailSlot_() {
  var props = PropertiesService.getScriptProperties();
  var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  var saved = String(props.getProperty('MAIL_COUNT') || '').split(' ');
  var count = saved[0] === today ? Number(saved[1]) || 0 : 0;
  if (count >= MAIL_LIMIT_PER_DAY) return false;
  props.setProperty('MAIL_COUNT', today + ' ' + (count + 1));
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
