// Server-side tests for Code.gs. Run: node --test apps-script/tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox } = require('./gas-sandbox');

const base = { consent: 'yes', website: '', requestId: 'req-12345678' };
const req = (email, lang, extra) => Object.assign({}, base, { email, lang }, extra || {});

test('writes EN email only into column C with a real Date in A', () => {
  const s = createSandbox();
  const r = s.post(req('Anna@Example.com', 'EN'));
  assert.deepEqual(r.body, { ok: true, code: 'ok', requestId: 'req-12345678' });
  assert.equal(r.mime, 'application/json');
  assert.equal(s.state.rows.length, 1);
  const [date, ru, en, et] = s.state.rows[0];
  assert.ok(date instanceof Date);
  assert.deepEqual([ru, en, et], ['', 'Anna@Example.com', '']);
  assert.deepEqual(s.state.formats[0].f, [['dd.MM.yyyy HH:mm', '@', '@', '@']]);
  assert.equal(s.state.lockHeld, false, 'lock released');
});

test('RU goes to column B, ET to column D, one row per sign-up', () => {
  const s = createSandbox();
  s.post(req('a@example.com', 'RU'));
  s.post(req('b@example.com', 'ET'));
  assert.deepEqual(s.state.rows.map(r => r.slice(1)), [
    ['a@example.com', '', ''],
    ['', '', 'b@example.com'],
  ]);
});

test('duplicate in the same language: no new row, neutral success (trim + case-insensitive)', () => {
  const s = createSandbox();
  s.post(req('Anna@Example.com', 'EN'));
  const r = s.post(req('  anna@example.COM ', 'EN'));
  assert.deepEqual(r.body, { ok: true, code: 'ok', requestId: 'req-12345678' });
  assert.equal(s.state.rows.length, 1);
});

test('same email in another language creates a new row', () => {
  const s = createSandbox();
  s.post(req('anna@example.com', 'EN'));
  s.post(req('anna@example.com', 'RU'));
  assert.equal(s.state.rows.length, 2);
  assert.deepEqual(s.state.rows[1].slice(1), ['anna@example.com', '', '']);
});

test('stores the trimmed email as entered', () => {
  const s = createSandbox();
  s.post(req('  Mixed.Case@Example.org  ', 'ET'));
  assert.equal(s.state.rows[0][3], 'Mixed.Case@Example.org');
});

for (const lang of ['', 'ru', 'en-GB', 'EST', 'RUS', 'DE', 'Ru', 'RU ,EN']) {
  test(`rejects language ${JSON.stringify(lang)} without writing`, () => {
    const s = createSandbox();
    const r = s.post(req('a@example.com', lang));
    assert.equal(r.body.code, 'invalid_language');
    assert.equal(r.body.ok, false);
    assert.equal(s.state.rows.length, 0);
  });
}

const badEmails = [
  '', 'plain', 'a@b', 'a@b.c', 'a..b@example.com', 'a@example..com', 'a b@example.com',
  '=HYPERLINK("http://x")@example.com', '+1@example.com', '-a@example.com', '@a@example.com',
  '=cmd@example.com', 'a@example.com\n=1+1', 'a@-example.com',
  'x'.repeat(65) + '@example.com', 'a@' + 'b'.repeat(250) + '.com',
];
for (const email of badEmails) {
  test(`rejects email ${JSON.stringify(email.slice(0, 40))}`, () => {
    const s = createSandbox();
    const r = s.post(req(email, 'EN'));
    assert.equal(r.body.code, 'invalid_email');
    assert.equal(s.state.rows.length, 0);
  });
}

test('accepts common valid addresses', () => {
  const s = createSandbox();
  for (const e of ['a@example.ee', 'first.last+news@sub.domain.co.uk', "o'neil@example.com", 'x_1-2@ex-ample.com']) {
    assert.equal(s.post(req(e, 'EN')).body.ok, true, e);
  }
  assert.equal(s.state.rows.length, 4);
});

test('consent is required on the server', () => {
  for (const consent of [undefined, '', 'no', 'true', 'on']) {
    const s = createSandbox();
    const r = s.post(req('a@example.com', 'EN', { consent }));
    assert.equal(r.body.code, 'consent_required');
    assert.equal(s.state.rows.length, 0);
  }
});

test('honeypot filled: neutral answer, nothing written', () => {
  const s = createSandbox();
  const r = s.post(req('a@example.com', 'EN', { website: 'http://spam' }));
  assert.equal(r.body.ok, true);
  assert.equal(s.state.rows.length, 0);
});

test('header mismatch: server_error, nothing written, details only in log', () => {
  const s = createSandbox({ headers: ['Дата подписки', 'RU', 'EN', 'Язык'] });
  const r = s.post(req('a@example.com', 'EN'));
  assert.deepEqual(r.body, { ok: false, code: 'server_error', requestId: 'req-12345678' });
  assert.equal(s.state.rows.length, 0);
  assert.equal(s.state.lockHeld, false, 'lock released after error');
  assert.match(s.state.logs[0][1], /Header mismatch/);
  assert.doesNotMatch(JSON.stringify(r.body), /Header|Язык/);
});

test('missing SPREADSHEET_ID or sheet: server_error', () => {
  assert.equal(createSandbox({ spreadsheetId: null }).post(req('a@example.com', 'EN')).body.code, 'server_error');
  assert.equal(createSandbox({ spreadsheetId: 'OTHER' }).post(req('a@example.com', 'EN')).body.code, 'server_error');
  assert.equal(createSandbox({ noSheet: true }).post(req('a@example.com', 'EN')).body.code, 'server_error');
});

test('lock not obtained (concurrent execution holds it): busy, sheet untouched', () => {
  const s = createSandbox();
  s.state.lockHeld = true; // another execution is inside the critical section
  const r = s.post(req('a@example.com', 'EN'));
  assert.equal(r.body.code, 'busy');
  assert.equal(s.state.rows.length, 0);
});

test('rate limit per minute', () => {
  const s = createSandbox();
  let last;
  for (let i = 0; i < 31; i++) last = s.post(req(`u${i}@example.com`, 'EN'));
  assert.equal(last.body.code, 'rate_limited');
  assert.equal(s.state.rows.length, 30);
});

test('requestId echoed only when well-formed', () => {
  const s = createSandbox();
  assert.equal(s.post(req('a@example.com', 'EN', { requestId: '<script>' })).body.requestId, '');
  const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
  assert.equal(s.post(req('b@example.com', 'EN', { requestId: id })).body.requestId, id);
});

test('doGet exposes nothing', () => {
  const s = createSandbox();
  assert.deepEqual(JSON.parse(s.ctx.doGet().text), { ok: false, code: 'method_not_allowed' });
});

test('checkSetup reports wrong time zones and headers, writes nothing', () => {
  const ok = createSandbox();
  ok.state.allowUnlocked = true; // read-only diagnostics, run by hand from the editor
  assert.deepEqual(Array.from(ok.ctx.checkSetup()), []);
  const bad = createSandbox({ sheetTimeZone: 'Etc/GMT', scriptTimeZone: 'America/New_York', headers: ['Date', 'RU', 'EN', 'ET'] });
  bad.state.allowUnlocked = true;
  const problems = Array.from(bad.ctx.checkSetup());
  assert.equal(problems.length, 3);
  assert.equal(bad.state.rows.length, 0);
});
