/**
 * Sarle — Open Call 2027 applications → Google Sheets.
 *
 * Lives in the SAME Apps Script project as Code.gs (newsletter) and uses the
 * same web app URL: Code.gs's doPost sends requests with form=open-call here.
 * Everything in this file is prefixed OC_/oc… so nothing clashes with Code.gs
 * (all .gs files of a project share one global scope).
 *
 * Writes one application per COLUMN on the applications sheet: field names in
 * column A, the newest application on the right. Labels and list answers are
 * in Russian. The sheet is found by its layout (column A holds
 * "Имя / имя художника" and "Email"), preferably the tab named «Заявки»; if no
 * tab has the layout, a new «Заявки» tab is created and laid out.
 *
 * The spreadsheet is the one from the Script Property SPREADSHEET_ID (the
 * same as for the newsletter).
 */

var OC_SHEET_NAME = 'Заявки';
var OC_SUMMARY_SHEET = 'Сводка';

// Email notices: the address comes from the Script Property NOTIFY_EMAIL
// (see notifyEmail_ in Code.gs); without it, notices go to this address.
var OC_NOTIFY_EMAIL = 'gallery@sarle.ee';

var OC_MAX_SHORT = 300;    // one-line answers
var OC_REPEAT_MINUTES = 10; // a second application from the same email within this time is not added
var OC_MAX_LONG = 6000;    // free texts

// Column A, top to bottom: [label, kind, form field, required?, max length]
// kind: sec = section heading; field = filled from the form (__time,
// __status and __empty are filled by the script).
var OC_LAYOUT = [
  ['Дата и время подачи', 'field', '__time'],
  ['Статус', 'field', '__status'],
  ['Заметки команды', 'field', '__empty'],
  ['О ХУДОЖНИКЕ', 'sec'],
  ['Имя / имя художника', 'field', 'Full name / Artist name', true, OC_MAX_SHORT],
  ['Email', 'field', 'Email', true, 254],
  ['Страна / город', 'field', '__location'],   // Country (from the list) + City, see ocLocation_
  ['Instagram / соцсети', 'field', 'Instagram / Social media', false, OC_MAX_SHORT],
  ['Сайт / портфолио', 'field', 'Website / Portfolio', false, 1000],
  ['ТВОРЧЕСТВО', 'sec'],
  ['Основная техника', 'field', 'Primary medium', true, OC_MAX_SHORT],
  ['О творческой практике', 'field', 'Artistic practice', true, OC_MAX_LONG],
  ['Опыт выставок', 'field', 'Previous exhibitions', false, OC_MAX_SHORT],
  ['ПОРТФОЛИО', 'sec'],
  ['Ссылка на портфолио (5–10 работ)', 'field', 'Portfolio link', true, 1000],
  ['Artist statement — идеи работ', 'field', 'Artist statement', false, OC_MAX_LONG],
  ['ИНТЕРЕСЫ', 'sec'],
  ['Что интересует в сотрудничестве', 'field', 'Interests', true, 2000],
  ['Почему Sarle', 'field', 'Why Sarle', false, OC_MAX_LONG],
  ['ПОДТВЕРЖДЕНИЯ', 'sec'],
  ['Понимает условия отбора', 'field', 'Confirm: selection process', true, 10],
  ['Права на работы принадлежат автору', 'field', 'Confirm: rights to artworks', true, 10],
  ['Согласие на связь', 'field', 'Confirm: may be contacted', true, 10],
  ['Согласие с политикой конфиденциальности', 'field', 'Confirm: privacy policy', true, 10],
  ['ТЕХНИЧЕСКОЕ', 'sec'],
  ['Язык сайта', 'field', 'Language', false, 10],
  ['Страница', 'field', 'Source page', false, 500]
];

// Answers chosen from lists on the site arrive in English: stored in Russian.
var OC_RU = {
  'Painting': 'Живопись', 'Sculpture': 'Скульптура', 'Photography': 'Фотография',
  'Digital Art': 'Цифровое искусство', 'Mixed Media': 'Смешанная техника',
  'Installation': 'Инсталляция', 'Textile Art': 'Текстильное искусство', 'Other': 'Другое',
  'Yes, internationally': 'Да, международные', 'Yes, locally': 'Да, местные', 'Not yet': 'Пока нет',
  'Participating in international exhibitions': 'Участие в международных выставках',
  'Presenting my work to new audiences': 'Показ работ новой аудитории',
  'Building professional relationships': 'Профессиональные связи',
  'Exploring long-term gallery collaboration': 'Долгосрочное сотрудничество с галереей',
  'Developing my international artistic career': 'Развитие международной карьеры',
  'All of the above': 'Всё перечисленное',
  'Yes': 'Да',
  'en': 'английский', 'et': 'эстонский', 'ru': 'русский'
};

// List answers must be one of these (anything else is refused).
var OC_CHOICES = {
  'Primary medium': ['Painting', 'Sculpture', 'Photography', 'Digital Art', 'Mixed Media', 'Installation', 'Textile Art', 'Other'],
  'Previous exhibitions': ['Yes, internationally', 'Yes, locally', 'Not yet'],
  'Interests': ['Participating in international exhibitions', 'Presenting my work to new audiences',
    'Building professional relationships', 'Exploring long-term gallery collaboration',
    'Developing my international artistic career', 'All of the above'],
  'Confirm: selection process': ['Yes'],
  'Confirm: rights to artworks': ['Yes'],
  'Confirm: may be contacted': ['Yes'],
  'Confirm: privacy policy': ['Yes']
};

// Countries in the site's list (ISO 3166-1 codes) and their names in the sheet.
var OC_COUNTRIES = {
  AD: 'Андорра', AE: 'ОАЭ', AF: 'Афганистан', AG: 'Антигуа и Барбуда', AI: 'Ангилья', AL: 'Албания',
  AM: 'Армения', AO: 'Ангола', AQ: 'Антарктида', AR: 'Аргентина', AS: 'Американское Самоа', AT: 'Австрия',
  AU: 'Австралия', AW: 'Аруба', AX: 'Аландские о-ва', AZ: 'Азербайджан', BA: 'Босния и Герцеговина', BB: 'Барбадос',
  BD: 'Бангладеш', BE: 'Бельгия', BF: 'Буркина-Фасо', BG: 'Болгария', BH: 'Бахрейн', BI: 'Бурунди',
  BJ: 'Бенин', BL: 'Сен-Бартелеми', BM: 'Бермудские о-ва', BN: 'Бруней', BO: 'Боливия', BQ: 'Бонэйр, Синт-Эстатиус и Саба',
  BR: 'Бразилия', BS: 'Багамы', BT: 'Бутан', BV: 'о-в Буве', BW: 'Ботсвана', BY: 'Беларусь',
  BZ: 'Белиз', CA: 'Канада', CC: 'Кокосовые о-ва', CD: 'Конго - Киншаса', CF: 'Центрально-Африканская Республика', CG: 'Конго - Браззавиль',
  CH: 'Швейцария', CI: 'Кот-д’Ивуар', CK: 'о-ва Кука', CL: 'Чили', CM: 'Камерун', CN: 'Китай',
  CO: 'Колумбия', CR: 'Коста-Рика', CU: 'Куба', CV: 'Кабо-Верде', CW: 'Кюрасао', CX: 'о-в Рождества',
  CY: 'Кипр', CZ: 'Чехия', DE: 'Германия', DJ: 'Джибути', DK: 'Дания', DM: 'Доминика',
  DO: 'Доминиканская Республика', DZ: 'Алжир', EC: 'Эквадор', EE: 'Эстония', EG: 'Египет', EH: 'Западная Сахара',
  ER: 'Эритрея', ES: 'Испания', ET: 'Эфиопия', FI: 'Финляндия', FJ: 'Фиджи', FK: 'Фолклендские о-ва',
  FM: 'Федеративные Штаты Микронезии', FO: 'Фарерские о-ва', FR: 'Франция', GA: 'Габон', GB: 'Великобритания', GD: 'Гренада',
  GE: 'Грузия', GF: 'Французская Гвиана', GG: 'Гернси', GH: 'Гана', GI: 'Гибралтар', GL: 'Гренландия',
  GM: 'Гамбия', GN: 'Гвинея', GP: 'Гваделупа', GQ: 'Экваториальная Гвинея', GR: 'Греция', GS: 'Южная Георгия и Южные Сандвичевы о-ва',
  GT: 'Гватемала', GU: 'Гуам', GW: 'Гвинея-Бисау', GY: 'Гайана', HK: 'Гонконг (САР)', HM: 'о-ва Херд и Макдональд',
  HN: 'Гондурас', HR: 'Хорватия', HT: 'Гаити', HU: 'Венгрия', ID: 'Индонезия', IE: 'Ирландия',
  IL: 'Израиль', IM: 'о-в Мэн', IN: 'Индия', IO: 'Британская территория в Индийском океане', IQ: 'Ирак', IR: 'Иран',
  IS: 'Исландия', IT: 'Италия', JE: 'Джерси', JM: 'Ямайка', JO: 'Иордания', JP: 'Япония',
  KE: 'Кения', KG: 'Киргизия', KH: 'Камбоджа', KI: 'Кирибати', KM: 'Коморы', KN: 'Сент-Китс и Невис',
  KP: 'КНДР', KR: 'Республика Корея', KW: 'Кувейт', KY: 'о-ва Кайман', KZ: 'Казахстан', LA: 'Лаос',
  LB: 'Ливан', LC: 'Сент-Люсия', LI: 'Лихтенштейн', LK: 'Шри-Ланка', LR: 'Либерия', LS: 'Лесото',
  LT: 'Литва', LU: 'Люксембург', LV: 'Латвия', LY: 'Ливия', MA: 'Марокко', MC: 'Монако',
  MD: 'Молдова', ME: 'Черногория', MF: 'Сен-Мартен', MG: 'Мадагаскар', MH: 'Маршалловы о-ва', MK: 'Северная Македония',
  ML: 'Мали', MM: 'Мьянма (Бирма)', MN: 'Монголия', MO: 'Макао (САР)', MP: 'Северные Марианские о-ва', MQ: 'Мартиника',
  MR: 'Мавритания', MS: 'Монтсеррат', MT: 'Мальта', MU: 'Маврикий', MV: 'Мальдивы', MW: 'Малави',
  MX: 'Мексика', MY: 'Малайзия', MZ: 'Мозамбик', NA: 'Намибия', NC: 'Новая Каледония', NE: 'Нигер',
  NF: 'о-в Норфолк', NG: 'Нигерия', NI: 'Никарагуа', NL: 'Нидерланды', NO: 'Норвегия', NP: 'Непал',
  NR: 'Науру', NU: 'Ниуэ', NZ: 'Новая Зеландия', OM: 'Оман', PA: 'Панама', PE: 'Перу',
  PF: 'Французская Полинезия', PG: 'Папуа — Новая Гвинея', PH: 'Филиппины', PK: 'Пакистан', PL: 'Польша', PM: 'Сен-Пьер и Микелон',
  PN: 'о-ва Питкэрн', PR: 'Пуэрто-Рико', PS: 'Палестинские территории', PT: 'Португалия', PW: 'Палау', PY: 'Парагвай',
  QA: 'Катар', RE: 'Реюньон', RO: 'Румыния', RS: 'Сербия', RU: 'Россия', RW: 'Руанда',
  SA: 'Саудовская Аравия', SB: 'Соломоновы о-ва', SC: 'Сейшельские о-ва', SD: 'Судан', SE: 'Швеция', SG: 'Сингапур',
  SH: 'о-в Св. Елены', SI: 'Словения', SJ: 'Шпицберген и Ян-Майен', SK: 'Словакия', SL: 'Сьерра-Леоне', SM: 'Сан-Марино',
  SN: 'Сенегал', SO: 'Сомали', SR: 'Суринам', SS: 'Южный Судан', ST: 'Сан-Томе и Принсипи', SV: 'Сальвадор',
  SX: 'Синт-Мартен', SY: 'Сирия', SZ: 'Эсватини', TC: 'Тёркс и Кайкос', TD: 'Чад', TF: 'Французские Южные территории',
  TG: 'Того', TH: 'Таиланд', TJ: 'Таджикистан', TK: 'Токелау', TL: 'Восточный Тимор', TM: 'Туркменистан',
  TN: 'Тунис', TO: 'Тонга', TR: 'Турция', TT: 'Тринидад и Тобаго', TV: 'Тувалу', TW: 'Тайвань',
  TZ: 'Танзания', UA: 'Украина', UG: 'Уганда', UM: 'Внешние малые о-ва (США)', US: 'Соединенные Штаты', UY: 'Уругвай',
  UZ: 'Узбекистан', VA: 'Ватикан', VC: 'Сент-Винсент и Гренадины', VE: 'Венесуэла', VG: 'Виргинские о-ва (Великобритания)', VI: 'Виргинские о-ва (США)',
  VN: 'Вьетнам', VU: 'Вануату', WF: 'Уоллис и Футуна', WS: 'Самоа', XK: 'Косово', YE: 'Йемен',
  YT: 'Майотта', ZA: 'Южно-Африканская Республика', ZM: 'Замбия', ZW: 'Зимбабве'
};

var OC_STATUSES = ['Новая', 'На рассмотрении', 'В шорт-листе', 'Отобрана', 'Не отобрана'];
var OC_STATUS_COLORS = ['#DDEBF7', '#FFF2CC', '#FCE4D6', '#E2EFDA', '#EDEDED'];
var OC_INK = '#1F1F1D', OC_LABEL_BG = '#F4F2ED', OC_SEC_BG = '#E3DED2', OC_LINE = '#DDD9CF';

/* ------------------------------------------------------------ an application */

/**
 * Called by doPost in Code.gs. `params` is e.parameters (every field is an
 * array, so the several ticked interests all arrive). Returns { ok, code }.
 */
function handleOpenCall_(params) {
  params = params || {};
  // Honeypot: people never see this field. Answer like a success, write nothing.
  if (ocFirst_(params, '_hp') !== '') return { ok: true, code: 'ok' };

  var answers = ocValidate_(params);
  if (!answers) return { ok: false, code: 'invalid_application' };
  if (!verifyCaptcha_(ocFirst_(params, 'cf-turnstile-response'))) return { ok: false, code: 'captcha_failed' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return { ok: false, code: 'busy' };
  var mayMail = false;
  try {
    if (!takeRateSlot_()) return { ok: false, code: 'rate_limited' };
    // The same address again within OC_REPEAT_MINUTES (a double click, a
    // script hammering the form): neutral success, nothing new is written.
    var cache = CacheService.getScriptCache();
    var key = 'oc:' + normalizeEmail_(answers['Email']);
    if (cache.get(key)) return { ok: true, code: 'ok' };
    ocWrite_(ocSheet_(), answers);
    SpreadsheetApp.flush();
    cache.put(key, '1', OC_REPEAT_MINUTES * 60);
    mayMail = takeMailSlot_();
  } finally {
    lock.releaseLock();
  }

  // The application is saved; a failed notice must not turn it into an error.
  var notify = mayMail ? notifyEmail_(OC_NOTIFY_EMAIL) : '';
  if (notify) {
    try {
      MailApp.sendEmail({
        to: notify,
        subject: 'Open Call 2027: новая заявка от ' + (answers['Full name / Artist name'] || 'без имени').slice(0, 80),
        body: 'Новая заявка от ' + answers['Full name / Artist name'] + ' (' + answers['Email'] + ').\n\n' +
              'Таблица: ' + ocBook_().getUrl()
      });
    } catch (err) {
      console.error('Open Call notice not sent: ' + err);
    }
  }
  return { ok: true, code: 'ok' };
}

/* Checks every field; returns { form field: text } or null if anything is wrong. */
function ocValidate_(params) {
  var out = {};
  for (var i = 0; i < OC_LAYOUT.length; i++) {
    var row = OC_LAYOUT[i];
    if (row[1] !== 'field' || row[2].indexOf('__') === 0) continue;
    var key = row[2], required = row[3], max = row[4];
    var oneLine = max <= 1000;
    var list = (params[key] || []).map(function (x) { return ocClean_(x, oneLine); })
      .filter(function (x) { return x !== ''; });
    if (!list.length) {
      if (required) return null;
      out[key] = '';
      continue;
    }
    if (list.length > 1 && key !== 'Interests') return null;  // only interests may be several
    if (OC_CHOICES[key]) {
      var allowed = OC_CHOICES[key];
      if (list.some(function (x) { return allowed.indexOf(x) === -1; })) return null;
      list = list.filter(function (x, k) { return list.indexOf(x) === k; }).map(function (x) { return OC_RU[x] || x; });
      out[key] = key === 'Interests' ? list.map(function (x) { return '• ' + x; }).join('\n') : list.join(', ');
    } else {
      out[key] = key === 'Language' && OC_RU[list[0]] ? OC_RU[list[0]] : list[0];
    }
    if (out[key].length > max) return null;
  }
  if (!isValidEmail_(out['Email'])) return null;
  out.__location = ocLocation_(params);
  if (!out.__location) return null;
  return out;
}

/* "Эстония, Таллинн": the country is an ISO code from the site's list, the city
   is typed. The older form sent one free field "Country / City"; still accepted. */
function ocLocation_(params) {
  var code = ocFirst_(params, 'Country').toUpperCase();
  var city = ocClean_(ocFirst_(params, 'City'), true);
  if (code || city) {
    if (!Object.prototype.hasOwnProperty.call(OC_COUNTRIES, code)) return '';
    if (!city || city.length > 120) return '';
    return OC_COUNTRIES[code] + ', ' + city;
  }
  var old = ocFirst_(params, 'Country / City');
  return old && old.length <= OC_MAX_SHORT ? old : '';
}

/* Control characters out; one-line answers also lose line breaks. */
function ocClean_(value, oneLine) {
  var s = String(value == null ? '' : value);
  s = oneLine ? s.replace(/[\u0000-\u001F\u007F]+/g, ' ') : s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ');
  return s.trim();
}

/* Text that starts with = + - @ would become a formula in the sheet. */
function ocText_(value) {
  var s = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/* A new column on the right, written under the script lock. */
function ocWrite_(sheet, answers) {
  var labels = ocLabels_(sheet);
  var src = {};
  OC_LAYOUT.forEach(function (r) { if (r[1] === 'field') src[r[0]] = r[2]; });

  var values = labels.map(function (label) {
    var from = src[label];
    if (!from || from === '__empty') return [''];
    if (from === '__time') return [new Date()];
    if (from === '__status') return [OC_STATUSES[0]];
    if (from === '__location') return [ocText_(answers.__location)];
    return [ocText_(answers[from])];
  });

  var n = labels.length;
  var col = Math.max(sheet.getLastColumn(), 1) + 1;
  if (col > sheet.getMaxColumns()) sheet.insertColumnAfter(sheet.getMaxColumns());
  var range = sheet.getRange(1, col, n, 1);
  range.setValues(values).setFontFamily('Arial').setFontSize(10).setFontColor(OC_INK)
    .setWrap(true).setVerticalAlignment('top').setFontWeight('normal');
  sheet.setColumnWidth(col, 440);
  labels.forEach(function (label, i) {
    var cell = sheet.getRange(i + 1, col);
    if (src[label] === undefined) cell.setBackground(OC_SEC_BG);  // section heading row
    else cell.setBackground(null).setBorder(null, null, true, true, null, null, OC_LINE, SpreadsheetApp.BorderStyle.SOLID);
  });

  var timeRow = labels.indexOf('Дата и время подачи') + 1;
  if (timeRow) sheet.getRange(timeRow, col).setNumberFormat('dd.mm.yyyy hh:mm').setHorizontalAlignment('left');
  var statusRow = labels.indexOf('Статус') + 1;
  if (statusRow) {
    sheet.getRange(statusRow, col).setFontWeight('bold').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(OC_STATUSES, true).build());
    ocStatusColors_(sheet, statusRow);
  }
  sheet.autoResizeRows(1, n);
}

/* ---------------------------------------------------------------- the sheet */

function ocBook_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Script Property SPREADSHEET_ID is not set');
  return SpreadsheetApp.openById(id);
}

function ocLabels_(sheet) {
  var last = sheet.getLastRow();
  if (!last) return [];
  return sheet.getRange(1, 1, last, 1).getDisplayValues().map(function (r) { return String(r[0]).trim(); });
}

function ocHasLayout_(sheet) {
  var labels = ocLabels_(sheet);
  return labels.indexOf('Имя / имя художника') !== -1 && labels.indexOf('Email') !== -1;
}

/* The tab with the applications layout («Заявки» first); created if there is none. */
function ocSheet_() {
  var ss = ocBook_();
  var named = ss.getSheetByName(OC_SHEET_NAME);
  if (named && ocHasLayout_(named)) return named;
  var found = ss.getSheets().filter(function (s) { return ocHasLayout_(s); })[0];
  if (found) return found;
  if (named && named.getLastRow() === 0 && named.getLastColumn() === 0) return ocLayout_(named);
  // never write over a tab that holds something else
  return ocLayout_(ss.insertSheet(named ? OC_SHEET_NAME + ' Open Call 2027' : OC_SHEET_NAME));
}

/* Column A with the field names and sections, styled; plus the summary tab. */
function ocLayout_(sheet) {
  var n = OC_LAYOUT.length;
  sheet.getRange(1, 1, n, 1).setValues(OC_LAYOUT.map(function (r) { return [r[0]]; }))
    .setFontFamily('Arial').setFontColor(OC_INK).setWrap(true).setVerticalAlignment('top');
  OC_LAYOUT.forEach(function (r, i) {
    var cell = sheet.getRange(i + 1, 1);
    if (r[1] === 'sec') {
      cell.setBackground(OC_SEC_BG).setFontWeight('bold').setFontSize(9).setVerticalAlignment('middle');
      sheet.setRowHeight(i + 1, 24);
    } else {
      cell.setBackground(OC_LABEL_BG).setFontWeight('bold').setFontSize(10)
        .setBorder(null, null, true, true, null, null, OC_LINE, SpreadsheetApp.BorderStyle.SOLID);
    }
  });
  sheet.setColumnWidth(1, 280);
  sheet.setFrozenColumns(1);
  sheet.setHiddenGridlines(true);
  ocSummary_(sheet);
  return sheet;
}

/* Summary tab: counts by status, medium and exhibition experience. Only made
   when the applications tab is laid out by the script; an existing «Сводка»
   is left as it is. */
function ocSummary_(sheet) {
  var ss = ocBook_();
  if (ss.getSheetByName(OC_SUMMARY_SHEET)) return;
  var s = ss.insertSheet(OC_SUMMARY_SHEET);
  var ref = "'" + sheet.getName().replace(/'/g, "''") + "'!";
  var row = function (label) {
    for (var i = 0; i < OC_LAYOUT.length; i++) if (OC_LAYOUT[i][0] === label) return i + 1;
  };
  var nameRow = row('Имя / имя художника');
  var out = [['Open Call 2027 — сводка', ''], ['', ''], ['Всего заявок', '=COUNTA(' + ref + 'B' + nameRow + ':ZZ' + nameRow + ')'], ['', '']];
  var block = function (title, items, r) {
    out.push([title, '']);
    items.forEach(function (it) { out.push([it, '=COUNTIF(' + ref + '$B$' + r + ':$ZZ$' + r + ',"' + it + '")']); });
    out.push(['', '']);
  };
  block('По статусу', OC_STATUSES, row('Статус'));
  block('По технике', OC_CHOICES['Primary medium'].map(function (x) { return OC_RU[x]; }), row('Основная техника'));
  block('Опыт выставок', OC_CHOICES['Previous exhibitions'].map(function (x) { return OC_RU[x]; }), row('Опыт выставок'));
  s.getRange(1, 1, out.length, 2).setValues(out).setFontFamily('Arial');
  s.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  s.setColumnWidth(1, 260);
}

/* The status cell takes the colour of its status. */
function ocStatusColors_(sheet, statusRow) {
  var range = sheet.getRange(statusRow, 2, 1, Math.max(sheet.getMaxColumns() - 1, 1));
  var keep = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (r) { return r.getRow() === statusRow && r.getColumn() === 2; });
  });
  var add = OC_STATUSES.map(function (st, i) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(st)
      .setBackground(OC_STATUS_COLORS[i]).setRanges([range]).build();
  });
  sheet.setConditionalFormatRules(keep.concat(add));
}

function ocFirst_(params, key) {
  return params[key] && params[key][0] != null ? String(params[key][0]).trim() : '';
}

/* ------------------------------------------------------------------- the menu */

/* Menu «Sarle» in the spreadsheet (appears after saving and reloading the sheet). */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sarle')
    .addItem('Open Call: где лист заявок', 'ocShowSheet')
    .addItem('Open Call: подогнать высоту строк', 'ocFitRows')
    .addToUi();
}
function ocShowSheet() {
  var s = ocSheet_();
  SpreadsheetApp.getUi().alert('Заявки Open Call приходят на лист «' + s.getName() + '».');
}
function ocFitRows() {
  var s = ocSheet_();
  s.getDataRange().setWrap(true).setVerticalAlignment('top');
  s.autoResizeRows(1, s.getLastRow());
}

/**
 * Test without the website: in the Apps Script editor choose ocTestSubmit and
 * press Run. A test column appears on the applications sheet (delete it afterwards).
 */
function ocTestSubmit() {
  var res = handleOpenCall_({
    'Full name / Artist name': ['TEST: проверка скрипта'],
    'Email': ['script.test@example.com'],
    'Country': ['EE'],
    'City': ['Tallinn'],
    'Primary medium': ['Photography'],
    'Artistic practice': ['Тестовая запись из ocTestSubmit() в Apps Script. Длинный текст нужен, чтобы проверить, что строка раздвигается и текст читается целиком.'],
    'Previous exhibitions': ['Not yet'],
    'Portfolio link': ['https://example.com'],
    'Interests': ['Building professional relationships', 'Presenting my work to new audiences'],
    'Confirm: selection process': ['Yes'],
    'Confirm: rights to artworks': ['Yes'],
    'Confirm: may be contacted': ['Yes'],
    'Confirm: privacy policy': ['Yes'],
    'Language': ['ru'],
    'Source page': ['Apps Script test']
  });
  console.log(JSON.stringify(res));
}
