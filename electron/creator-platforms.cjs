'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { normalizeBrowserAddress } = require('./browser-address.cjs');

const LEGACY_CREATOR_PLATFORM_CONFIG_VERSION = 1;
const CREATOR_PLATFORM_CONFIG_VERSION = 2;
const DEFAULT_MAX_CUSTOM_PLATFORMS = 20;
const MAX_CUSTOM_PLATFORM_NAME_LENGTH = 40;
const MAX_CREATOR_PLATFORM_CONFIG_BYTES = 64 * 1024;
const CUSTOM_PLATFORM_MODES = Object.freeze(['image', 'video']);
const CUSTOM_PLATFORM_ID_PATTERN = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUILTIN_PLATFORM_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;

class InvalidPlatformConfigError extends Error {}
class UnsupportedPlatformConfigError extends Error {}

function normalizePlatformName(value) {
  const label = String(value ?? '').normalize('NFC').trim().replace(/[\t ]+/g, ' ');
  if (!label) throw new Error('请输入平台名称');
  if (UNSAFE_NAME_CHARACTERS.test(label)) throw new Error('平台名称不能包含控制字符或双向文本控制符');
  if (label === '.' || label === '..') throw new Error('平台名称无效');
  if ([...label].length > MAX_CUSTOM_PLATFORM_NAME_LENGTH) {
    throw new Error(`平台名称不能超过 ${MAX_CUSTOM_PLATFORM_NAME_LENGTH} 个字符`);
  }
  return label;
}

function normalizeCustomPlatformInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('平台信息格式无效');
  return {
    label: normalizePlatformName(input.name ?? input.label),
    url: normalizeBrowserAddress(input.url),
  };
}

function publicPlatform(service) {
  return {
    id: service.id,
    label: service.label,
    url: service.url,
    custom: true,
    modes: [...CUSTOM_PLATFORM_MODES],
  };
}

function cloneServices(services) {
  return services.map(publicPlatform);
}

function validatePositiveInteger(value, fallback, label) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label}必须是正整数`);
  return number;
}

function validateBuiltinIds(value) {
  if (!Array.isArray(value) || value.length < 1) throw new Error('builtinIds 必须是非空数组');
  const ids = [];
  const seen = new Set();
  for (const valueAtIndex of value) {
    if (typeof valueAtIndex !== 'string'
      || valueAtIndex !== valueAtIndex.trim()
      || valueAtIndex !== valueAtIndex.toLowerCase()
      || !BUILTIN_PLATFORM_ID_PATTERN.test(valueAtIndex)
      || valueAtIndex.startsWith('custom-')) {
      throw new Error('builtinIds 只能包含规范的小写内置平台 ID');
    }
    if (seen.has(valueAtIndex)) throw new Error(`builtinIds 存在重复平台 ID：${valueAtIndex}`);
    seen.add(valueAtIndex);
    ids.push(valueAtIndex);
  }
  return Object.freeze(ids);
}

function normalizeBuiltinId(value, builtinIdSet) {
  const id = String(value || '').trim().toLowerCase();
  if (!BUILTIN_PLATFORM_ID_PATTERN.test(id) || id.startsWith('custom-') || !builtinIdSet.has(id)) {
    throw new Error('只能管理已登记的内置平台');
  }
  return id;
}

function validatePersistedHiddenBuiltinIds(value, builtinIds, builtinIdSet) {
  if (!Array.isArray(value)) throw new InvalidPlatformConfigError('hiddenBuiltinIds 必须是数组');
  if (value.length > builtinIds.length) throw new InvalidPlatformConfigError('隐藏的内置平台数量超过已登记数量');
  const ids = [];
  const seen = new Set();
  for (const valueAtIndex of value) {
    if (typeof valueAtIndex !== 'string' || valueAtIndex !== valueAtIndex.trim().toLowerCase()) {
      throw new InvalidPlatformConfigError('隐藏的内置平台 ID 必须是规范小写字符串');
    }
    let id;
    try {
      id = normalizeBuiltinId(valueAtIndex, builtinIdSet);
    } catch (error) {
      throw new InvalidPlatformConfigError(`隐藏的内置平台 ID 无效：${valueAtIndex}`);
    }
    if (seen.has(id)) throw new InvalidPlatformConfigError(`存在重复的隐藏内置平台 ID：${id}`);
    seen.add(id);
    ids.push(id);
  }
  return builtinIds.filter(id => seen.has(id));
}

function validatePersistedDocument(document, maxPlatforms, builtinIds, builtinIdSet) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new InvalidPlatformConfigError('配置根节点必须是对象');
  }
  if (![LEGACY_CREATOR_PLATFORM_CONFIG_VERSION, CREATOR_PLATFORM_CONFIG_VERSION].includes(document.version)) {
    throw new UnsupportedPlatformConfigError(`不支持的自定义平台配置版本：${String(document.version)}`);
  }
  if (!Array.isArray(document.services)) throw new InvalidPlatformConfigError('services 必须是数组');
  if (document.services.length > maxPlatforms) {
    throw new InvalidPlatformConfigError(`自定义平台数量超过上限 ${maxPlatforms}`);
  }

  const ids = new Set();
  const labels = new Set();
  const urls = new Set();
  const services = document.services.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new InvalidPlatformConfigError(`第 ${index + 1} 个平台格式无效`);
    }
    const id = String(entry.id || '').trim().toLowerCase();
    if (!CUSTOM_PLATFORM_ID_PATTERN.test(id)) {
      throw new InvalidPlatformConfigError(`第 ${index + 1} 个平台 ID 无效`);
    }
    let normalized;
    try {
      normalized = normalizeCustomPlatformInput({ name: entry.label, url: entry.url });
    } catch (error) {
      throw new InvalidPlatformConfigError(`第 ${index + 1} 个平台无效：${error.message}`);
    }
    const labelKey = normalized.label.toLowerCase();
    if (ids.has(id)) throw new InvalidPlatformConfigError(`存在重复的平台 ID：${id}`);
    if (labels.has(labelKey)) throw new InvalidPlatformConfigError(`存在重复的平台名称：${normalized.label}`);
    if (urls.has(normalized.url)) throw new InvalidPlatformConfigError(`存在重复的平台 URL：${normalized.url}`);
    ids.add(id);
    labels.add(labelKey);
    urls.add(normalized.url);
    return { id, ...normalized };
  });
  const hiddenBuiltinIds = document.version === LEGACY_CREATOR_PLATFORM_CONFIG_VERSION
    ? []
    : validatePersistedHiddenBuiltinIds(document.hiddenBuiltinIds, builtinIds, builtinIdSet);
  const displayNames = {};
  if (document.displayNames !== undefined) {
    if (!document.displayNames || typeof document.displayNames !== 'object' || Array.isArray(document.displayNames)) {
      throw new InvalidPlatformConfigError('网站名称配置无效');
    }
    for (const [id, name] of Object.entries(document.displayNames)) {
      if (!builtinIdSet.has(id) && !ids.has(id)) continue;
      displayNames[id] = normalizePlatformName(name);
    }
  }
  return { services, hiddenBuiltinIds, displayNames };
}

function persistedDocument(services, hiddenBuiltinIds, displayNames) {
  return {
    version: CREATOR_PLATFORM_CONFIG_VERSION,
    services: services.map(({ id, label, url }) => ({ id, label, url })),
    hiddenBuiltinIds: [...hiddenBuiltinIds],
    ...(Object.keys(displayNames).length ? { displayNames } : {}),
  };
}

function writeConfigAtomically(filePath, services, hiddenBuiltinIds, displayNames) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const payload = `${JSON.stringify(persistedDocument(services, hiddenBuiltinIds, displayNames), null, 2)}\n`;
  let descriptor = null;
  try {
    descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, payload, 'utf-8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryPath, filePath);
    try { fs.chmodSync(filePath, 0o600); } catch {}
  } catch (error) {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch {}
    }
    try { fs.unlinkSync(temporaryPath); } catch {}
    throw error;
  }
}

function nextBackupPath(filePath) {
  const base = `${filePath}.corrupt-${Date.now()}`;
  if (!fs.existsSync(base)) return base;
  for (let index = 2; index < 1000; index++) {
    const candidate = `${base}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error('无法为损坏配置生成备份文件名');
}

function createCreatorPlatformStore(options = {}) {
  const requestedPath = String(options.filePath || '');
  if (!requestedPath || !path.isAbsolute(requestedPath) || requestedPath.includes('\0')) {
    throw new Error('自定义平台配置文件必须使用有效的绝对路径');
  }
  const filePath = path.resolve(requestedPath);
  const maxPlatforms = validatePositiveInteger(
    options.maxPlatforms,
    DEFAULT_MAX_CUSTOM_PLATFORMS,
    '自定义平台数量上限',
  );
  const maxConfigBytes = validatePositiveInteger(
    options.maxConfigBytes,
    MAX_CREATOR_PLATFORM_CONFIG_BYTES,
    '配置文件大小上限',
  );
  const builtinIds = validateBuiltinIds(options.builtinIds);
  const builtinIdSet = new Set(builtinIds);
  const idFactory = typeof options.idFactory === 'function' ? options.idFactory : randomUUID;
  const onWarning = typeof options.onWarning === 'function' ? options.onWarning : () => {};

  let loaded = false;
  let services = [];
  let hiddenBuiltinIds = [];
  let displayNames = {};
  let storeStatus = { warning: '', recovered: false, backupPath: '', writable: true };

  function warn(message) {
    storeStatus.warning = message;
    try { onWarning(message); } catch {}
  }

  function recoverDamagedConfig(reason) {
    let backupPath = '';
    try {
      backupPath = nextBackupPath(filePath);
      fs.renameSync(filePath, backupPath);
      storeStatus = { warning: '', recovered: true, backupPath, writable: true };
      warn(`自定义平台配置已损坏，已备份并恢复为空配置：${reason}`);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        storeStatus = { warning: '', recovered: true, backupPath: '', writable: true };
        warn(`自定义平台配置读取时已移除，已恢复为空配置：${reason}`);
        return;
      }
      storeStatus = { warning: '', recovered: false, backupPath: '', writable: false };
      warn(`自定义平台配置已损坏且无法备份；已忽略该配置：${reason}；${error.message}`);
    }
  }

  function loadOnce() {
    if (loaded) return;
    loaded = true;
    try {
      const stat = fs.lstatSync(filePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        storeStatus = { warning: '', recovered: false, backupPath: '', writable: false };
        warn('自定义平台配置路径不是普通文件；已忽略该配置');
        return;
      }
      if (stat.size > maxConfigBytes) {
        recoverDamagedConfig(`配置文件超过 ${maxConfigBytes} 字节`);
        return;
      }
      let document;
      try {
        document = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (error) {
        recoverDamagedConfig(`JSON 无法解析：${error.message}`);
        return;
      }
      try {
        const validated = validatePersistedDocument(document, maxPlatforms, builtinIds, builtinIdSet);
        services = validated.services;
        hiddenBuiltinIds = validated.hiddenBuiltinIds;
        displayNames = validated.displayNames;
      } catch (error) {
        if (error instanceof UnsupportedPlatformConfigError) {
          storeStatus = { warning: '', recovered: false, backupPath: '', writable: false };
          warn(`${error.message}；为避免覆盖较新版本数据，本次仅使用内置平台`);
          return;
        }
        recoverDamagedConfig(error.message);
      }
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      storeStatus = { warning: '', recovered: false, backupPath: '', writable: false };
      warn(`自定义平台配置无法读取；本次仅使用内置平台：${error.message}`);
    }
  }

  function assertWritable() {
    loadOnce();
    if (!storeStatus.writable) {
      throw new Error(storeStatus.warning || '自定义平台配置当前不可写');
    }
  }

  function assertUnique(normalized) {
    const labelKey = normalized.label.toLowerCase();
    if (services.some(service => service.label.toLowerCase() === labelKey)) {
      throw new Error(`自定义平台名称已存在：${normalized.label}`);
    }
    if (services.some(service => service.url === normalized.url)) {
      throw new Error(`自定义平台 URL 已存在：${normalized.url}`);
    }
  }

  function createId() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const token = String(idFactory() || '').trim().toLowerCase();
      const id = token.startsWith('custom-') ? token : `custom-${token}`;
      if (!CUSTOM_PLATFORM_ID_PATTERN.test(id)) throw new Error('自定义平台 ID 生成器返回了无效 UUID');
      if (!services.some(service => service.id === id)) return id;
    }
    throw new Error('无法生成唯一的自定义平台 ID');
  }

  function commit(nextServices, nextHiddenBuiltinIds, nextDisplayNames = displayNames) {
    writeConfigAtomically(filePath, nextServices, nextHiddenBuiltinIds, nextDisplayNames);
    services = nextServices;
    hiddenBuiltinIds = nextHiddenBuiltinIds;
    displayNames = nextDisplayNames;
    storeStatus = { warning: '', recovered: false, backupPath: '', writable: true };
  }

  return Object.freeze({
    filePath,

    displayName(serviceId) {
      loadOnce();
      return displayNames[serviceId] || '';
    },

    rename(serviceId, name) {
      assertWritable();
      if (!builtinIdSet.has(serviceId) && !services.some(service => service.id === serviceId)) {
        throw new Error('网站不存在或已被删除');
      }
      const displayName = normalizePlatformName(name);
      commit(services, hiddenBuiltinIds, { ...displayNames, [serviceId]: displayName });
      return { id: serviceId, displayName };
    },

    list() {
      loadOnce();
      return cloneServices(services);
    },

    hiddenBuiltinIds() {
      loadOnce();
      return [...hiddenBuiltinIds];
    },

    add(input) {
      assertWritable();
      if (services.length >= maxPlatforms) throw new Error(`自定义平台最多只能添加 ${maxPlatforms} 个`);
      const normalized = normalizeCustomPlatformInput(input);
      assertUnique(normalized);
      const service = { id: createId(), ...normalized };
      const next = [...services, service];
      commit(next, hiddenBuiltinIds);
      return publicPlatform(service);
    },

    remove(serviceId) {
      assertWritable();
      const id = String(serviceId || '').trim().toLowerCase();
      if (!CUSTOM_PLATFORM_ID_PATTERN.test(id)) throw new Error('只能删除有效的自定义平台');
      const index = services.findIndex(service => service.id === id);
      if (index < 0) throw new Error('自定义平台不存在或已被删除');
      const removed = services[index];
      const next = services.filter((_service, serviceIndex) => serviceIndex !== index);
      const nextDisplayNames = { ...displayNames };
      delete nextDisplayNames[id];
      commit(next, hiddenBuiltinIds, nextDisplayNames);
      return publicPlatform(removed);
    },

    hideBuiltin(serviceId) {
      assertWritable();
      const id = normalizeBuiltinId(serviceId, builtinIdSet);
      if (hiddenBuiltinIds.includes(id)) return { id, changed: false };
      const hiddenSet = new Set([...hiddenBuiltinIds, id]);
      commit(services, builtinIds.filter(builtinId => hiddenSet.has(builtinId)));
      return { id, changed: true };
    },

    restoreBuiltin(serviceId) {
      assertWritable();
      const id = normalizeBuiltinId(serviceId, builtinIdSet);
      if (!hiddenBuiltinIds.includes(id)) return { id, changed: false };
      commit(services, hiddenBuiltinIds.filter(hiddenId => hiddenId !== id));
      return { id, changed: true };
    },

    restoreBuiltins() {
      assertWritable();
      const restored = [...hiddenBuiltinIds];
      if (restored.length) commit(services, []);
      return restored;
    },

    status() {
      loadOnce();
      return { ...storeStatus };
    },
  });
}

module.exports = {
  LEGACY_CREATOR_PLATFORM_CONFIG_VERSION,
  CREATOR_PLATFORM_CONFIG_VERSION,
  DEFAULT_MAX_CUSTOM_PLATFORMS,
  MAX_CUSTOM_PLATFORM_NAME_LENGTH,
  MAX_CREATOR_PLATFORM_CONFIG_BYTES,
  CUSTOM_PLATFORM_MODES,
  CUSTOM_PLATFORM_ID_PATTERN,
  BUILTIN_PLATFORM_ID_PATTERN,
  normalizeCustomPlatformInput,
  normalizePlatformName,
  createCreatorPlatformStore,
};
