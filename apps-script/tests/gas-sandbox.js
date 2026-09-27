// Loads ../Code.gs into a Node vm with in-memory stand-ins for the Apps Script
// services it uses. The fake sheet refuses any access made without the script
// lock held, so tests prove the duplicate check and the write run under it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');

function createSandbox(opts) {
  opts = opts || {};
  const state = {
    headers: opts.headers || ['Дата подписки', 'RU', 'EN', 'ET'],
    rows: [],          // data rows (without header): [date, ru, en, et]
    formats: [],
    lockHeld: false,
    lockAvailable: opts.lockAvailable !== false,
    cache: {},
    props: { SPREADSHEET_ID: opts.spreadsheetId === undefined ? 'TEST_ID' : opts.spreadsheetId },
    logs: [],
    flushes: 0,
  };

  function requireLock() {
    if (!state.lockHeld && !state.allowUnlocked) throw new Error('sheet accessed without the script lock');
  }
  function grid() { return [state.headers.slice()].concat(state.rows); }

  const sheet = {
    getLastRow() { requireLock(); return state.rows.length + 1; },
    getRange(row, col, numRows, numCols) {
      requireLock();
      numRows = numRows || 1; numCols = numCols || 1;
      return {
        getDisplayValues() {
          const g = grid();
          const out = [];
          for (let r = 0; r < numRows; r++) {
            const src = g[row - 1 + r] || [];
            const line = [];
            for (let c = 0; c < numCols; c++) {
              const v = src[col - 1 + c];
              line.push(v instanceof Date ? v.toISOString() : v == null ? '' : String(v));
            }
            out.push(line);
          }
          return out;
        },
        setNumberFormats(f) { state.formats.push({ row, f: Array.from(f, r => Array.from(r)) }); return this; },
        setValues(values) {
          if (row === 1) throw new Error('attempt to overwrite the header row');
          if (row - 2 !== state.rows.length) throw new Error('write is not an append at the end');
          values.forEach(v => state.rows.push(Array.from(v)));
          return this;
        },
      };
    },
  };

  const ctx = {
    console: {
      log: (...a) => state.logs.push(['log', a.join(' ')]),
      error: (...a) => state.logs.push(['error', a.join(' ')]),
    },
    Date, Math, JSON, String, Number, Object, Error,
    SpreadsheetApp: {
      openById(id) {
        if (id !== 'TEST_ID') throw new Error('not found');
        return {
          getSheetByName: name => (name === 'Подписчики' && !opts.noSheet ? sheet : null),
          getSpreadsheetTimeZone: () => opts.sheetTimeZone || 'Europe/Tallinn',
        };
      },
      flush() { state.flushes++; },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => state.props[k] || null }) },
    LockService: {
      getScriptLock: () => ({
        tryLock() {
          if (!state.lockAvailable || state.lockHeld) return false;
          state.lockHeld = true;
          return true;
        },
        releaseLock() { state.lockHeld = false; },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: k => (k in state.cache ? state.cache[k] : null),
        put: (k, v) => { state.cache[k] = v; },
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(text) {
        return { text, mime: null, setMimeType(m) { this.mime = m; return this; } };
      },
    },
    Session: { getScriptTimeZone: () => opts.scriptTimeZone || 'Europe/Tallinn' },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: 'Code.gs' });

  function post(params) {
    const out = ctx.doPost({ parameter: params });
    return { body: JSON.parse(out.text), mime: out.mime };
  }
  return { ctx, state, post };
}

module.exports = { createSandbox };
