// Server-side tests for OpenCall.gs (routed from Code.gs doPost).
// Run: node --test apps-script/tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, XLSX_LAYOUT } = require('./oc-sandbox');

function application(extra, drop) {
  const f = [
    ['form', 'open-call'], ['requestId', 'req-12345678'],
    ['Full name / Artist name', 'Anna Tamm'], ['Email', 'anna@example.com'], ['Country', 'EE'], ['City', 'Tallinn'],
    ['Instagram / Social media', '@anna'], ['Website / Portfolio', ''],
    ['Primary medium', 'Painting'], ['Artistic practice', 'Oil on canvas, northern light.'],
    ['Previous exhibitions', 'Yes, locally'], ['Portfolio link', 'https://anna.example.com'], ['Artist statement', ''],
    ['Interests', 'Presenting my work to new audiences'], ['Interests', 'Building professional relationships'],
    ['Why Sarle', ''], ['Confirm: selection process', 'Yes'], ['Confirm: rights to artworks', 'Yes'],
    ['Confirm: may be contacted', 'Yes'], ['Confirm: privacy policy', 'Yes'], ['_hp', ''],
    ['Language', 'et'], ['Source page', 'https://www.sarle.ee/et/'],
  ].filter(([k]) => !(drop || []).includes(k));
  return f.concat(extra || []);
}

test('application goes to column B of «Заявки», in Russian, under the lock', () => {
  const s = createSandbox();
  const r = s.post(application());
  assert.deepEqual(r, { ok: true, code: 'ok', requestId: 'req-12345678' });
  const col = s.column('Заявки', 2);
  assert.ok(col['Дата и время подачи'] instanceof Date);
  assert.equal(col['Статус'], 'Новая');
  assert.equal(col['Имя / имя художника'], 'Anna Tamm');
  assert.equal(col['Email'], 'anna@example.com');
  assert.equal(col['Страна / город'], 'Эстония, Tallinn');
  assert.equal(col['Основная техника'], 'Живопись');
  assert.equal(col['Опыт выставок'], 'Да, местные');
  assert.equal(col['Что интересует в сотрудничестве'], '• Показ работ новой аудитории\n• Профессиональные связи');
  assert.equal(col['Согласие с политикой конфиденциальности'], 'Да');
  assert.equal(col['Язык сайта'], 'эстонский');
  assert.equal(col['О ХУДОЖНИКЕ'], undefined, 'section rows stay empty');
  assert.equal(s.state.lockHeld, false, 'lock released');
  assert.equal(s.tab('Подписчики').writes, 0, 'newsletter sheet untouched');
  assert.equal(s.state.mails.length, 1);
  assert.match(s.state.mails[0].subject, /Anna Tamm/);
});

test('the next application goes to the next column', () => {
  const s = createSandbox();
  s.post(application());
  s.post(application([], ['Full name / Artist name']).concat([['Full name / Artist name', 'Second Artist']]));
  assert.equal(s.column('Заявки', 2)['Имя / имя художника'], 'Anna Tamm');
  assert.equal(s.column('Заявки', 3)['Имя / имя художника'], 'Second Artist');
});

for (const [why, extra, drop] of [
  ['missing name', [], ['Full name / Artist name']],
  ['missing portfolio link', [], ['Portfolio link']],
  ['no interest ticked', [], ['Interests']],
  ['a confirmation missing', [], ['Confirm: privacy policy']],
  ['invalid email', [['Email', 'not-an-email']], ['Email']],
  ['email starting with =', [['Email', '=x@example.com']], ['Email']],
  ['unknown country', [['Country', 'XX']], ['Country']],
  ['no city', [], ['City']],
  ['no country', [], ['Country']],
  ['unknown medium', [['Primary medium', 'Hacking']], ['Primary medium']],
  ['two media', [['Primary medium', 'Sculpture']], []],
  ['far too long text', [['Artistic practice', 'x'.repeat(7000)]], ['Artistic practice']],
]) {
  test(`refused, nothing written: ${why}`, () => {
    const s = createSandbox();
    const r = s.post(application(extra, drop));
    assert.equal(r.ok, false);
    assert.equal(r.code, 'invalid_application');
    assert.equal(s.tab('Заявки').writes, 0);
    assert.equal(s.state.mails.length, 0);
  });
}

test('honeypot filled: answers ok, writes nothing', () => {
  const s = createSandbox();
  const r = s.post(application([['_hp', 'http://spam']], ['_hp']));
  assert.equal(r.ok, true);
  assert.equal(s.tab('Заявки').writes, 0);
  assert.equal(s.state.mails.length, 0);
});

test('text that would be a formula is stored as text', () => {
  const s = createSandbox();
  s.post(application([['Artistic practice', '=IMPORTXML("http://x","//a")'], ['Why Sarle', '+1']], ['Artistic practice', 'Why Sarle']));
  const col = s.column('Заявки', 2);
  assert.equal(col['О творческой практике'], '\'=IMPORTXML("http://x","//a")');
  assert.equal(col['Почему Sarle'], "'+1");
});

test('a failed email notice does not fail the saved application', () => {
  const s = createSandbox({ mailFails: true });
  const r = s.post(application());
  assert.equal(r.ok, true);
  assert.equal(s.column('Заявки', 2)['Имя / имя художника'], 'Anna Tamm');
});

test('lock held by another request: busy, nothing written', () => {
  const s = createSandbox({ lockBusy: true });
  const r = s.post(application());
  assert.equal(r.code, 'busy');
  assert.equal(s.tab('Заявки').writes, 0);
});

test('finds the layout on a tab with another name and leaves other tabs alone', () => {
  const layout = new Map(XLSX_LAYOUT.map((l, i) => [(i + 1) + ',1', l]));
  const s = createSandbox({ tabs: [['Подписчики', new Map([['1,1', 'Дата подписки']])], ['Лист7', layout]] });
  s.post(application());
  assert.equal(s.column('Лист7', 2)['Имя / имя художника'], 'Anna Tamm');
  assert.equal(s.tab('Подписчики').writes, 0);
});

test('no applications tab: «Заявки» is created and laid out, a summary tab added', () => {
  const s = createSandbox({ tabs: [['Подписчики', new Map([['1,1', 'Дата подписки']])]] });
  const r = s.post(application());
  assert.equal(r.ok, true);
  const col = s.column('Заявки', 2);
  assert.equal(col['Имя / имя художника'], 'Anna Tamm');
  assert.ok(s.tab('Сводка'), 'summary created');
  assert.equal(s.tab('Подписчики').writes, 0);
});

test('newsletter requests still go to the newsletter handler', () => {
  const s = createSandbox();
  let called = false;
  s.ctx.handleSubscription_ = () => { called = true; return { ok: true, code: 'ok' }; };
  const r = s.post([['email', 'a@example.com'], ['lang', 'EN'], ['consent', 'yes'], ['requestId', 'req-12345678']]);
  assert.equal(called, true);
  assert.equal(r.ok, true);
  assert.equal(s.tab('Заявки').writes, 0);
});

test('the older form (one free "Country / City" field) is still accepted', () => {
  const s = createSandbox();
  const r = s.post(application([['Country / City', 'Latvia / Riga']], ['Country', 'City']));
  assert.equal(r.ok, true);
  assert.equal(s.column('Заявки', 2)['Страна / город'], 'Latvia / Riga');
});
