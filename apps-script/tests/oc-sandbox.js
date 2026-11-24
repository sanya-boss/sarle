// Loads ../Code.gs and ../OpenCall.gs into a Node vm with an in-memory
// spreadsheet (tabs of cells) and stand-ins for the Apps Script services.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = ['Code.gs', 'OpenCall.gs'].map(f => [f, fs.readFileSync(path.join(__dirname, '..', f), 'utf8')]);

// The layout of the «Заявки» tab as uploaded from the xlsx (column A).
const XLSX_LAYOUT = ['Дата и время подачи', 'Статус', 'Заметки команды', 'О ХУДОЖНИКЕ', 'Имя / имя художника', 'Email',
  'Страна / город', 'Instagram / соцсети', 'Сайт / портфолио', 'ТВОРЧЕСТВО', 'Основная техника',
  'О творческой практике', 'Опыт выставок', 'ПОРТФОЛИО', 'Ссылка на портфолио (5–10 работ)',
  'Artist statement — идеи работ', 'ИНТЕРЕСЫ', 'Что интересует в сотрудничестве', 'Почему Sarle', 'ПОДТВЕРЖДЕНИЯ',
  'Понимает условия отбора', 'Права на работы принадлежат автору', 'Согласие на связь',
  'Согласие с политикой конфиденциальности', 'ТЕХНИЧЕСКОЕ', 'Язык сайта', 'Страница'];

// Any styling call returns the same object, so chains like .setWrap().setFontSize() work.
function chain(target) {
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return () => chain(t);
    },
  });
}

function makeSheet(state, name, cells) {
  // cells: Map "r,c" → value
  const sh = { name, cells: cells || new Map(), maxCols: 26, writes: 0 };
  const lastRow = () => Math.max(0, ...[...sh.cells.keys()].map(k => +k.split(',')[0]));
  const lastCol = () => Math.max(0, ...[...sh.cells.keys()].map(k => +k.split(',')[1]));
  sh.api = chain({
    getName: () => name,
    getLastRow() { return lastRow(); },
    getLastColumn() { return lastCol(); },
    getMaxColumns: () => sh.maxCols,
    insertColumnAfter() { sh.maxCols++; },
    getConditionalFormatRules: () => [],
    getRange(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      return chain({
        getDisplayValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const line = [];
            for (let j = 0; j < nc; j++) { const v = sh.cells.get((r + i) + ',' + (c + j)); line.push(v == null ? '' : String(v)); }
            out.push(line);
          }
          return out;
        },
        setValues(vals) {
          if (!state.lockHeld && !state.layingOut) throw new Error('write without the script lock');
          vals.forEach((line, i) => line.forEach((v, j) => {
            if (v !== '' && v != null) sh.cells.set((r + i) + ',' + (c + j), v); else sh.cells.delete((r + i) + ',' + (c + j));
          }));
          sh.writes++;
          return this;
        },
      });
    },
  });
  return sh;
}

function createSandbox(opts) {
  opts = opts || {};
  const state = { props: Object.assign({}, opts.props || {}), lockHeld: false, cache: {}, mails: [], logs: [], sheets: [], layingOut: false };
  const layoutCells = labels => new Map(labels.map((l, i) => [(i + 1) + ',1', l]));
  (opts.tabs || [['Подписчики', new Map([['1,1', 'Дата подписки'], ['1,2', 'RU'], ['1,3', 'EN'], ['1,4', 'ET']])],
                 ['Заявки', layoutCells(XLSX_LAYOUT)]])
    .forEach(([n, cells]) => state.sheets.push(makeSheet(state, n, cells)));

  const book = {
    getSheetByName: n => { const s = state.sheets.find(x => x.name === n); return s ? s.api : null; },
    getSheets: () => state.sheets.map(s => s.api),
    insertSheet(n) { const s = makeSheet(state, n); state.sheets.push(s); state.layingOut = true; return s.api; },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST_ID/edit',
    getSpreadsheetTimeZone: () => 'Europe/Tallinn',
  };
  const ctx = {
    console: { log: (...a) => state.logs.push(a.join(' ')), error: (...a) => state.logs.push(a.join(' ')) },
    Date, Math, JSON, String, Number, Object, Error,
    SpreadsheetApp: {
      openById(id) { if (id !== 'TEST_ID') throw new Error('not found'); return book; },
      flush() {},
      BorderStyle: { SOLID: 'SOLID' },
      newDataValidation: () => chain({}),
      newConditionalFormatRule: () => chain({}),
      getUi: () => chain({}),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'SPREADSHEET_ID' ? 'TEST_ID' : (k in state.props ? state.props[k] : null)), setProperty: (k, v) => { state.props[k] = String(v); } }) },
    LockService: {
      getScriptLock: () => ({
        tryLock() { if (opts.lockBusy || state.lockHeld) return false; state.lockHeld = true; return true; },
        releaseLock() { state.lockHeld = false; },
      }),
    },
    CacheService: { getScriptCache: () => ({ get: k => state.cache[k] || null, put: (k, v) => { state.cache[k] = v; } }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(text) { return { text, setMimeType() { return this; } }; },
    },
    MailApp: { sendEmail(m) { if (opts.mailFails) throw new Error('quota'); state.mails.push(m); } },
    Session: { getScriptTimeZone: () => 'Europe/Tallinn' },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10) },
  };
  vm.createContext(ctx);
  SRC.forEach(([f, code]) => vm.runInContext(code, ctx, { filename: f }));

  // Like Apps Script: e.parameter holds the first value, e.parameters every value.
  function post(fields) {
    const parameters = {};
    for (const [k, v] of fields) (parameters[k] = parameters[k] || []).push(v);
    const parameter = Object.fromEntries(Object.entries(parameters).map(([k, v]) => [k, v[0]]));
    return JSON.parse(ctx.doPost({ parameter, parameters }).text);
  }
  const tab = n => state.sheets.find(s => s.name === n);
  const column = (n, c) => {
    const s = tab(n); const out = {};
    for (let r = 1; r <= 40; r++) { const l = s.cells.get(r + ',1'); if (l) out[l] = s.cells.get(r + ',' + c); }
    return out;
  };
  return { ctx, state, post, tab, column };
}

module.exports = { createSandbox, XLSX_LAYOUT };
