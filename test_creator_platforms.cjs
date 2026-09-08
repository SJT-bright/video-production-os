'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  LEGACY_CREATOR_PLATFORM_CONFIG_VERSION,
  CREATOR_PLATFORM_CONFIG_VERSION,
  CUSTOM_PLATFORM_MODES,
  MAX_CUSTOM_PLATFORM_NAME_LENGTH,
  createCreatorPlatformStore,
  normalizeCustomPlatformInput,
} = require('./electron/creator-platforms.cjs');

const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-creator-platforms-'));
const builtinIds = ['gpt', 'gemini', 'grok', 'updream'];
const uuids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];

function idFactory() {
  const next = uuids.shift();
  if (!next) throw new Error('测试 UUID 已用完');
  return next;
}

try {
  const renamePath = path.join(runRoot, 'rename', 'creator-platforms.json');
  const renameStore = createCreatorPlatformStore({ filePath: renamePath, builtinIds });
  const namedSite = renameStore.add({ name: '素材站', url: 'https://assets.example.com/' });
  renameStore.rename('gpt', '图片创作');
  renameStore.rename(namedSite.id, '收藏图片');
  renameStore.hideBuiltin('grok');
  const renameReload = createCreatorPlatformStore({ filePath: renamePath, builtinIds });
  assert.equal(renameReload.displayName('gpt'), '图片创作', '内置网站名称需跨重启保存');
  assert.equal(renameReload.displayName(namedSite.id), '收藏图片', '自定义网站名称需跨重启保存');
  assert.equal(renameReload.list()[0].url, namedSite.url, '改名不能改变网站地址或登录分区 ID');
  assert.throws(() => renameReload.rename('missing', '示例'), /不存在/);
  assert.throws(() => renameReload.rename('gpt', '  '), /名称/);
  renameReload.remove(namedSite.id);
  assert.equal(renameReload.displayName(namedSite.id), '', '删除网站应移除名称记录');

  assert.deepEqual(normalizeCustomPlatformInput({ name: '  Runway  ', url: 'runwayml.com' }), {
    label: 'Runway',
    url: 'https://runwayml.com/',
  });
  assert.throws(() => normalizeCustomPlatformInput({ name: '', url: 'example.com' }), /平台名称/);
  assert.throws(() => normalizeCustomPlatformInput({ name: '坏\n名称', url: 'example.com' }), /控制字符/);
  assert.throws(() => normalizeCustomPlatformInput({ name: 'x'.repeat(MAX_CUSTOM_PLATFORM_NAME_LENGTH + 1), url: 'example.com' }), /不能超过/);
  for (const url of ['javascript:alert(1)', 'file:///tmp/demo', 'https://user:pass@example.com/']) {
    assert.throws(() => normalizeCustomPlatformInput({ name: '危险平台', url }), /只支持|账号或密码/);
  }

  const configPath = path.join(runRoot, 'normal', 'creator-platforms.json');
  const warnings = [];
  const store = createCreatorPlatformStore({
    filePath: configPath,
    builtinIds,
    maxPlatforms: 2,
    idFactory,
    onWarning: warning => warnings.push(warning),
  });
  assert.deepEqual(store.list(), []);
  assert.deepEqual(store.status(), { warning: '', recovered: false, backupPath: '', writable: true });

  const runway = store.add({ name: '  Runway  ', url: 'runwayml.com' });
  assert.deepEqual(runway, {
    id: 'custom-11111111-1111-4111-8111-111111111111',
    label: 'Runway',
    url: 'https://runwayml.com/',
    custom: true,
    modes: [...CUSTOM_PLATFORM_MODES],
  });
  assert.deepEqual(store.list(), [runway]);
  assert.equal(warnings.length, 0);
  assert.equal(fs.existsSync(configPath), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf-8')), {
    version: CREATOR_PLATFORM_CONFIG_VERSION,
    services: [{ id: runway.id, label: runway.label, url: runway.url }],
    hiddenBuiltinIds: [],
  });
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(configPath).mode & 0o777, 0o600, '配置文件应仅允许当前用户读写');
  }
  assert.equal(fs.readdirSync(path.dirname(configPath)).some(name => name.endsWith('.tmp')), false, '原子写入不应遗留临时文件');

  assert.throws(() => store.add({ name: 'runway', url: 'https://different.example/' }), /名称已存在/);
  assert.throws(() => store.add({ name: '另一个名称', url: 'https://runwayml.com' }), /URL 已存在/);
  const pika = store.add({ name: 'Pika', url: 'https://pika.art/create' });
  assert.equal(pika.id, 'custom-22222222-2222-4222-8222-222222222222');
  assert.deepEqual(pika.modes, ['image', 'video'], '自定义平台默认应同时进入图片和视频模式');
  assert.throws(() => store.add({ name: '第三个平台', url: 'third.example' }), /最多只能添加 2 个/);
  assert.throws(() => store.remove('gpt'), /只能删除有效的自定义平台/, '存储模块不应接受内置平台 ID');
  assert.throws(() => store.remove('custom-99999999-9999-4999-8999-999999999999'), /不存在/);
  assert.deepEqual(store.hideBuiltin('grok'), { id: 'grok', changed: true });
  assert.deepEqual(store.hideBuiltin('GROK'), { id: 'grok', changed: false }, '隐藏已隐藏的内置平台应幂等');
  assert.deepEqual(store.hiddenBuiltinIds(), ['grok']);
  assert.throws(() => store.hideBuiltin('unknown'), /已登记的内置平台/);
  assert.throws(() => store.hideBuiltin(runway.id), /已登记的内置平台/, '自定义 ID 不能冒充内置平台');
  assert.throws(() => store.restoreBuiltin('unknown'), /已登记的内置平台/);
  assert.throws(() => store.restoreBuiltin(runway.id), /已登记的内置平台/);

  const reloaded = createCreatorPlatformStore({ filePath: configPath, builtinIds });
  assert.deepEqual(reloaded.list(), [runway, pika], '重新创建 store 后应保留稳定 ID、顺序和双模式');
  assert.deepEqual(reloaded.hiddenBuiltinIds(), ['grok'], '内置平台隐藏状态应跨 store 持久化');
  assert.deepEqual(store.remove(runway.id), runway);
  assert.deepEqual(store.list(), [pika]);
  const afterCustomRemove = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  assert.deepEqual(afterCustomRemove.services, [
    { id: pika.id, label: pika.label, url: pika.url },
  ]);
  assert.deepEqual(afterCustomRemove.hiddenBuiltinIds, ['grok'], '删除自定义平台不应丢失内置隐藏状态');
  assert.deepEqual(store.restoreBuiltin('grok'), { id: 'grok', changed: true });
  assert.deepEqual(store.restoreBuiltin('grok'), { id: 'grok', changed: false }, '恢复已显示的内置平台应幂等');
  store.hideBuiltin('grok');
  store.hideBuiltin('gpt');
  assert.deepEqual(store.hiddenBuiltinIds(), ['gpt', 'grok'], '隐藏顺序应按 builtinIds 规范化');
  assert.deepEqual(store.restoreBuiltins(), ['gpt', 'grok']);
  assert.deepEqual(store.restoreBuiltins(), [], '无隐藏项时批量恢复应幂等');
  assert.deepEqual(store.list(), [pika], '恢复内置平台不应删除自定义平台');
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf-8')), {
    version: CREATOR_PLATFORM_CONFIG_VERSION,
    services: [{ id: pika.id, label: pika.label, url: pika.url }],
    hiddenBuiltinIds: [],
  });

  const legacyPath = path.join(runRoot, 'legacy-v1', 'creator-platforms.json');
  fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
  const legacyService = {
    id: 'custom-55555555-5555-4555-8555-555555555555',
    label: '旧版自定义站',
    url: 'https://legacy.example/',
  };
  const legacyPayload = {
    version: LEGACY_CREATOR_PLATFORM_CONFIG_VERSION,
    services: [legacyService],
  };
  fs.writeFileSync(legacyPath, JSON.stringify(legacyPayload), 'utf-8');
  const legacy = createCreatorPlatformStore({ filePath: legacyPath, builtinIds });
  assert.deepEqual(legacy.list(), [{ ...legacyService, custom: true, modes: [...CUSTOM_PLATFORM_MODES] }]);
  assert.deepEqual(legacy.hiddenBuiltinIds(), [], 'v1 配置应安全迁移为无隐藏项');
  assert.deepEqual(JSON.parse(fs.readFileSync(legacyPath, 'utf-8')), legacyPayload, '只读加载 v1 时不应擅自改写文件');
  legacy.hideBuiltin('grok');
  assert.deepEqual(JSON.parse(fs.readFileSync(legacyPath, 'utf-8')), {
    version: CREATOR_PLATFORM_CONFIG_VERSION,
    services: [legacyService],
    hiddenBuiltinIds: ['grok'],
  }, '首次写操作应原子升级 v1 并保留自定义平台');

  const damagedPath = path.join(runRoot, 'damaged', 'creator-platforms.json');
  fs.mkdirSync(path.dirname(damagedPath), { recursive: true });
  fs.writeFileSync(damagedPath, '{not-json', 'utf-8');
  const damageWarnings = [];
  const damaged = createCreatorPlatformStore({
    filePath: damagedPath,
    builtinIds,
    idFactory,
    onWarning: warning => damageWarnings.push(warning),
  });
  assert.doesNotThrow(() => damaged.list(), '损坏配置不能拖垮主程序');
  assert.deepEqual(damaged.list(), []);
  const damagedStatus = damaged.status();
  assert.equal(damagedStatus.recovered, true);
  assert.equal(damagedStatus.writable, true);
  assert.ok(damagedStatus.backupPath.includes('.corrupt-'), '损坏备份应使用可识别的 corrupt 后缀');
  assert.equal(fs.existsSync(damagedStatus.backupPath), true, '损坏文件应保留为备份');
  assert.equal(fs.readFileSync(damagedStatus.backupPath, 'utf-8'), '{not-json');
  assert.equal(fs.existsSync(damagedPath), false);
  assert.equal(damageWarnings.length, 1);
  assert.match(damageWarnings[0], /已损坏/);
  const recovered = damaged.add({ name: '恢复后的平台', url: 'recover.example' });
  assert.equal(recovered.id, 'custom-33333333-3333-4333-8333-333333333333');
  assert.equal(JSON.parse(fs.readFileSync(damagedPath, 'utf-8')).services.length, 1);

  const invalidSchemaPath = path.join(runRoot, 'invalid-schema', 'creator-platforms.json');
  fs.mkdirSync(path.dirname(invalidSchemaPath), { recursive: true });
  fs.writeFileSync(invalidSchemaPath, JSON.stringify({
    version: CREATOR_PLATFORM_CONFIG_VERSION,
    services: [{
      id: 'custom-44444444-4444-4444-8444-444444444444',
      label: '无效协议',
      url: 'data:text/html,bad',
    }],
  }), 'utf-8');
  const invalidSchema = createCreatorPlatformStore({ filePath: invalidSchemaPath, builtinIds, idFactory });
  assert.deepEqual(invalidSchema.list(), []);
  assert.equal(invalidSchema.status().recovered, true, '持久化条目也必须重新执行 URL 安全校验');

  const newerPath = path.join(runRoot, 'newer', 'creator-platforms.json');
  fs.mkdirSync(path.dirname(newerPath), { recursive: true });
  const newerPayload = JSON.stringify({ version: CREATOR_PLATFORM_CONFIG_VERSION + 1, services: [] });
  fs.writeFileSync(newerPath, newerPayload, 'utf-8');
  const newer = createCreatorPlatformStore({ filePath: newerPath, builtinIds, idFactory });
  assert.deepEqual(newer.list(), [], '较新版本配置不应影响内置平台启动');
  assert.equal(newer.status().writable, false, '较新版本配置不应被旧版本覆盖');
  assert.equal(fs.readFileSync(newerPath, 'utf-8'), newerPayload);
  assert.throws(() => newer.add({ name: '不能覆盖', url: 'no-overwrite.example' }), /不支持的自定义平台配置版本/);

  const factoryValidationPath = path.join(runRoot, 'factory-validation', 'creator-platforms.json');
  assert.throws(() => createCreatorPlatformStore({ filePath: factoryValidationPath }), /builtinIds/);
  assert.throws(() => createCreatorPlatformStore({ filePath: factoryValidationPath, builtinIds: [] }), /非空数组/);
  assert.throws(() => createCreatorPlatformStore({ filePath: factoryValidationPath, builtinIds: ['gpt', 'gpt'] }), /重复/);
  assert.throws(() => createCreatorPlatformStore({ filePath: factoryValidationPath, builtinIds: ['GPT'] }), /小写/);
  assert.throws(() => createCreatorPlatformStore({ filePath: factoryValidationPath, builtinIds: ['custom-built-in'] }), /内置平台 ID/);
  assert.throws(() => createCreatorPlatformStore({ filePath: 'relative.json', builtinIds }), /绝对路径/);
  console.log('CREATOR_PLATFORMS PASS: v1 migration, v2 custom services and hidden built-ins, atomic persistence and corrupt-file recovery');
} finally {
  const safeRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(path.resolve(runRoot).startsWith(safeRoot), '拒绝清理系统临时目录以外的路径');
  fs.rmSync(runRoot, { recursive: true, force: true });
}
