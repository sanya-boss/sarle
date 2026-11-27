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
  s.post(application([], ['Full name / Artist name', 'Email']).concat([['Full name / Artist name', 'Second Artist'], ['Email', 'second@example.com']]));
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

test('notice goes to the NOTIFY_EMAIL script property when set', () => {
  const s = createSandbox({ props: { NOTIFY_EMAIL: ' team@example.org ' } });
  s.post(application());
  assert.equal(s.state.mails.length, 1);
  assert.equal(s.state.mails[0].to, 'team@example.org');
});

test('NOTIFY_EMAIL "off" switches notices off; the application is still saved', () => {
  const s = createSandbox({ props: { NOTIFY_EMAIL: 'off' } });
  const r = s.post(application());
  assert.equal(r.ok, true);
  assert.equal(s.state.mails.length, 0);
  assert.equal(s.column('Заявки', 2)['Имя / имя художника'], 'Anna Tamm');
});

test('without NOTIFY_EMAIL the notice goes to the gallery address', () => {
  const s = createSandbox();
  s.post(application());
  assert.equal(s.state.mails[0].to, 'gallery@sarle.ee');
});

test('same email again within minutes: neutral ok, no second column, no second notice', () => {
  const s = createSandbox();
  s.post(application());
  const r = s.post(application([['Email', 'ANNA@example.com']], ['Email']));
  assert.equal(r.ok, true);
  assert.equal(s.column('Заявки', 3)['Имя / имя художника'], undefined);
  assert.equal(s.state.mails.length, 1);
});

test('notices stop at the daily limit, applications are still saved', () => {
  const s = createSandbox({ props: { MAIL_COUNT: new Date().toISOString().slice(0, 10) + ' 60' } });
  const r = s.post(application());
  assert.equal(r.ok, true);
  assert.equal(s.column('Заявки', 2)['Имя / имя художника'], 'Anna Tamm');
  assert.equal(s.state.mails.length, 0);
});

test('control characters and line breaks are removed from one-line answers', () => {
  const s = createSandbox();
  s.post(application([['Full name / Artist name', 'Anna\r\nBcc: x@evil.test\u0007'], ['City', 'Tal\nlinn']], ['Full name / Artist name', 'City']));
  const col = s.column('Заявки', 2);
  assert.equal(col['Имя / имя художника'], 'Anna Bcc: x@evil.test');
  assert.equal(col['Страна / город'], 'Эстония, Tal linn');
  assert.doesNotMatch(s.state.mails[0].subject, /[\r\n]/);
});

test('captcha on: application without a token is refused, nothing written', () => {
  const s = createSandbox({ props: { TURNSTILE_SECRET: 'sec' }, turnstile: 'pass' });
  const r = s.post(application());
  assert.equal(r.code, 'captcha_failed');
  assert.equal(s.tab('Заявки').writes, 0);
  assert.equal(s.state.mails.length, 0);
});

test('captcha on: valid token -> saved; rejected token -> captcha_failed', () => {
  const s = createSandbox({ props: { TURNSTILE_SECRET: 'sec' }, turnstile: p => p.response === 'good' });
  assert.equal(s.post(application([['cf-turnstile-response', 'good']])).ok, true);
  assert.equal(s.column('Заявки', 2)['Имя / имя художника'], 'Anna Tamm');
  const r = s.post(application([['cf-turnstile-response', 'bad'], ['Email', 'other@example.com']], ['Email']));
  assert.equal(r.code, 'captcha_failed');
  assert.equal(s.column('Заявки', 3)['Имя / имя художника'], undefined);
});

test('application notice goes out from the NOTIFY_FROM alias', () => {
  const s = createSandbox({ props: { NOTIFY_FROM: 'gallery@sarle.ee' }, aliases: ['gallery@sarle.ee'] });
  s.post(application());
  assert.equal(s.state.mails[0].via, 'gmail');
  assert.equal(s.state.mails[0].from, 'gallery@sarle.ee');
});
