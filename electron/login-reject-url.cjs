'use strict';

// 精确识别 Google 账号“拒绝内嵌登录”落地页：
// 仅匹配 accounts.google.com 主机 + /signin/rejected（含 /v3/ 前缀）路径，
// 不匹配仿冒域名、普通登录页、仅出现在查询参数里的相似字串。
function isLoginRejectedUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (url.hostname !== 'accounts.google.com') return false;
    return /^\/(v3\/)?signin\/rejected\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

module.exports = { isLoginRejectedUrl };
