'use strict';

const assert = require('assert/strict');
const { isLoginRejectedUrl } = require('./electron/login-reject-url.cjs');

// 真实拒绝页（含查询参数与 v3 前缀）
assert.equal(
  isLoginRejectedUrl('https://accounts.google.com/v3/signin/rejected?app_domain=https%3A%2F%2Fauth.openai.com'),
  true,
  'v3 拒绝页应命中',
);
assert.equal(isLoginRejectedUrl('https://accounts.google.com/signin/rejected'), true, '无版本前缀拒绝页应命中');
// 正常登录页与同域其他页面不应命中
assert.equal(isLoginRejectedUrl('https://accounts.google.com/v3/signin/identifier'), false, '正常登录页不应命中');
assert.equal(isLoginRejectedUrl('https://accounts.google.com/'), false, '账号首页不应命中');
// 仿冒域名与参数不应命中
assert.equal(isLoginRejectedUrl('https://evil.example/accounts.google.com/signin/rejected'), false, '仿冒路径域名不应命中');
assert.equal(isLoginRejectedUrl('https://accounts.google.com/?redirect=signin/rejected'), false, '查询参数不应命中');
assert.equal(isLoginRejectedUrl('https://accounts.google.com.evil.example/signin/rejected'), false, '后缀仿冒域名不应命中');
// 非法输入
assert.equal(isLoginRejectedUrl(''), false);
assert.equal(isLoginRejectedUrl('不是网址'), false);
assert.equal(isLoginRejectedUrl(null), false);

console.log('LOGIN_REJECT_URL PASS');
