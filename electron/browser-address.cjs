'use strict';

const MAX_BROWSER_ADDRESS_LENGTH = 2048;

function looksLikeLocalAddress(value) {
  return /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:[/?#]|$)/i.test(value);
}

function looksLikeHostWithPort(value) {
  return /^(?:[a-z\d-]+\.)+[a-z\d-]+:\d+(?:[/?#]|$)/i.test(value);
}

function normalizeBrowserAddress(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('请输入网址');
  if (raw.length > MAX_BROWSER_ADDRESS_LENGTH) throw new Error('网址过长，请缩短后重试');

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw)
    && !looksLikeLocalAddress(raw)
    && !looksLikeHostWithPort(raw);
  const candidate = hasScheme
    ? raw
    : `${looksLikeLocalAddress(raw) ? 'http' : 'https'}://${raw}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('网址格式不正确');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只支持 http 或 https 网页');
  }
  if (!parsed.hostname) throw new Error('网址缺少网站域名');
  if (parsed.username || parsed.password) throw new Error('网址中不能包含账号或密码');
  return parsed.toString();
}

function isSafeBrowserAddress(value) {
  try {
    normalizeBrowserAddress(value);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  MAX_BROWSER_ADDRESS_LENGTH,
  isSafeBrowserAddress,
  normalizeBrowserAddress,
};
