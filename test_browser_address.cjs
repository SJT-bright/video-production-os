'use strict';

const assert = require('assert/strict');
const {
  MAX_BROWSER_ADDRESS_LENGTH,
  isSafeBrowserAddress,
  normalizeBrowserAddress,
} = require('./electron/browser-address.cjs');

const HEHUI_PROJECT_URL = 'https://hehui.dawncoreai.com/drama/project-manage/project-details/project-role?id=1704&project_name=%E7%9F%AD%E5%89%A7+%E3%80%8A%E9%99%86%E6%80%BB%EF%BC%8C%E5%88%AB%E8%BF%BD%E4%BA%86%E3%80%8B';
assert.equal(normalizeBrowserAddress('gemini.google.com/app'), 'https://gemini.google.com/app');
assert.equal(normalizeBrowserAddress('  https://grok.com/  '), 'https://grok.com/');
assert.equal(normalizeBrowserAddress('localhost:3750/creator.html'), 'http://localhost:3750/creator.html');
assert.equal(normalizeBrowserAddress('127.0.0.1:3750'), 'http://127.0.0.1:3750/');
assert.equal(isSafeBrowserAddress('https://www.liblib.tv/wappro?sourceid=040004'), true);
assert.equal(normalizeBrowserAddress(HEHUI_PROJECT_URL), HEHUI_PROJECT_URL);

for (const blocked of [
  '',
  'javascript:alert(1)',
  'file:///C:/Windows/System32/calc.exe',
  'data:text/html,<h1>bad</h1>',
  'mailto:test@example.com',
  'https://user:password@example.com/',
  `https://${'a'.repeat(MAX_BROWSER_ADDRESS_LENGTH)}.example.com/`,
]) {
  assert.equal(isSafeBrowserAddress(blocked), false, `危险或无效地址未被拒绝：${blocked.slice(0, 80)}`);
  assert.throws(() => normalizeBrowserAddress(blocked));
}

console.log('BROWSER_ADDRESS PASS: scheme completion, local HTTP and unsafe protocol rejection');
