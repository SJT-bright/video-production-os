'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  CREATIVE_PROJECTS_SCHEMA_VERSION,
  INSPIRATION_PROJECT_ID,
  INSPIRATION_PROJECT_NAME,
  PROJECT_CATEGORIES,
  createCreativeProjectStore,
} = require('./creative-projects.cjs');
const { buildCreativeAssetTree } = require('./creative-assets.cjs');

const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-creative-projects-'));
const projectRoot = path.join(runRoot, 'project');
const assetRoot = path.join(projectRoot, '创作资产库');
const dataDir = path.join(runRoot, 'data');
const registryPath = path.join(dataDir, 'creative-projects.json');

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function assertProjectStructure(project, expectedRoot) {
  assert.equal(project.categories.length, PROJECT_CATEGORIES.length, `${project.name} 的标准分类数量不正确`);
  for (const definition of PROJECT_CATEGORIES) {
    const category = project.categories.find(item => item.id === definition.id);
    assert.ok(category, `${project.name} 缺少 ${definition.label}`);
    assert.equal(category.label, definition.label);
    assert.equal(category.folder, definition.label, `新建项目的 ${definition.label} 没有使用标准目录名`);
    const absolute = path.join(assetRoot, ...category.path.split('/'));
    assert.equal(isWithin(expectedRoot, absolute), true, `${definition.label} 越出剧本目录`);
    assert.equal(fs.statSync(absolute).isDirectory(), true, `${definition.label} 目录没有落盘`);
    if (definition.id === 'frames') {
      assert.deepEqual(category.children.map(item => item.label), ['首帧', '尾帧']);
      for (const child of category.children) {
        assert.equal(fs.statSync(path.join(assetRoot, ...child.path.split('/'))).isDirectory(), true, `${child.label}目录没有落盘`);
      }
    }
  }
}

try {
  fs.mkdirSync(assetRoot, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  assert.notEqual(path.resolve(projectRoot), path.resolve(__dirname, '..'), '测试不得使用真实项目根');
  assert.notEqual(path.resolve(dataDir), path.resolve(__dirname, 'data'), '测试不得使用正式 data 目录');
  assert.equal(isWithin(runRoot, assetRoot), true);
  assert.equal(isWithin(runRoot, registryPath), true);

  const discoveredRoot = path.join(assetRoot, '旧有剧本资产');
  fs.mkdirSync(discoveredRoot);
  fs.writeFileSync(path.join(discoveredRoot, '保留文件.txt'), 'legacy asset', 'utf-8');
  fs.mkdirSync(path.join(assetRoot, '.隐藏目录'));
  const outsideRoot = path.join(runRoot, '外部目录');
  fs.mkdirSync(outsideRoot);
  let symlinkCreated = false;
  try {
    fs.symlinkSync(outsideRoot, path.join(assetRoot, '符号链接剧本'), 'dir');
    symlinkCreated = true;
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
  }

  const warnings = [];
  const store = createCreativeProjectStore({
    filePath: registryPath,
    assetRoot,
    onWarning: message => warnings.push(message),
  });

  assert.equal(store.schemaVersion, CREATIVE_PROJECTS_SCHEMA_VERSION);
  assert.equal(fs.existsSync(registryPath), true, '首次启动没有持久化剧本注册表');
  const initialProjects = store.list();
  assert.equal(initialProjects[0].id, INSPIRATION_PROJECT_ID, '灵感生成必须固定排在首位');
  const inspiration = store.get(INSPIRATION_PROJECT_ID);
  assert.ok(inspiration, '系统内置灵感项目不存在');
  assert.equal(inspiration.name, INSPIRATION_PROJECT_NAME);
  assert.equal(inspiration.kind, 'inspiration');
  assert.equal(inspiration.folder, INSPIRATION_PROJECT_NAME);
  assert.equal(inspiration.available, true);
  assertProjectStructure(inspiration, store.resolveRoot(INSPIRATION_PROJECT_ID));

  const discovered = store.findByName('旧有剧本资产');
  assert.ok(discovered, '没有发现创作资产库中的已有一级目录');
  assert.match(discovered.id, /^project-[a-f0-9]{12}$/);
  assert.equal(discovered.kind, 'script');
  assert.equal(fs.readFileSync(path.join(discoveredRoot, '保留文件.txt'), 'utf-8'), 'legacy asset', '目录发现破坏了已有资产');
  assertProjectStructure(discovered, discoveredRoot);
  assert.equal(store.findByName('.隐藏目录'), null, '隐藏目录不应成为剧本项目');
  if (symlinkCreated) assert.equal(store.findByName('符号链接剧本'), null, '符号链接目录不应成为剧本项目');

  const created = store.create({ name: '校园心动' });
  assert.match(created.id, /^project-[0-9a-f-]{20,}$/);
  assert.equal(created.kind, 'script');
  assert.equal(created.active, true, '新建项目应立即激活');
  const createdRoot = store.resolveRoot(created.id);
  assert.equal(createdRoot, path.join(assetRoot, '校园心动'));
  assert.equal(isWithin(assetRoot, createdRoot), true);
  assertProjectStructure(created, createdRoot);
  assert.throws(
    () => store.create({ name: ' 校园心动 ' }),
    error => error && error.code === 'PROJECT_EXISTS',
    '同名剧本没有被拒绝',
  );
  assert.throws(() => store.create({ name: INSPIRATION_PROJECT_NAME }), /系统工作区/);
  for (const unsafeName of ['../逃逸', '子/目录', '.隐藏剧本', 'CON', '坏|名字']) {
    assert.throws(() => store.create({ name: unsafeName }), undefined, `不安全剧本名未被拒绝：${unsafeName}`);
  }
  assert.equal(fs.existsSync(path.join(projectRoot, '逃逸')), false, '路径逃逸在资产库外创建了目录');

  const inspirationImages = store.category(INSPIRATION_PROJECT_ID, 'generated-images').absolutePath;
  const createdImages = store.category(created.id, 'generated-images').absolutePath;
  fs.writeFileSync(path.join(inspirationImages, '同名结果.png'), 'inspiration', 'utf-8');
  fs.writeFileSync(path.join(createdImages, '同名结果.png'), 'script', 'utf-8');
  assert.notEqual(inspirationImages, createdImages, '灵感生成与剧本项目共用了图片目录');
  assert.equal(fs.readFileSync(path.join(inspirationImages, '同名结果.png'), 'utf-8'), 'inspiration');
  assert.equal(fs.readFileSync(path.join(createdImages, '同名结果.png'), 'utf-8'), 'script');
  const inspirationTree = buildCreativeAssetTree(assetRoot, { scopePath: inspiration.folder });
  const inspirationTreeJson = JSON.stringify(inspirationTree.tree);
  assert.match(inspirationTreeJson, /同名结果\.png/);
  assert.doesNotMatch(inspirationTreeJson, /校园心动/, '灵感资产树泄漏了正式剧本目录');
  const createdTree = buildCreativeAssetTree(assetRoot, { scopePath: created.folder });
  assert.doesNotMatch(JSON.stringify(createdTree.tree), /灵感生成/, '正式剧本资产树泄漏了灵感目录');

  const activatedInspiration = store.activate(INSPIRATION_PROJECT_ID);
  assert.equal(activatedInspiration.active, true);
  assert.equal(store.active().id, INSPIRATION_PROJECT_ID);
  const restartedOnInspiration = createCreativeProjectStore({ filePath: registryPath, assetRoot });
  assert.equal(restartedOnInspiration.active().id, INSPIRATION_PROJECT_ID, '重启后没有保留灵感项目激活状态');
  assert.equal(restartedOnInspiration.list().filter(project => project.id === INSPIRATION_PROJECT_ID).length, 1,
    '重启后重复创建了灵感项目');
  assert.equal(restartedOnInspiration.get(created.id).folder, created.folder, '重启后丢失新建剧本记录');

  restartedOnInspiration.activate(created.id);
  const restartedOnScript = createCreativeProjectStore({ filePath: registryPath, assetRoot });
  assert.equal(restartedOnScript.active().id, created.id, '重启后没有保留已有剧本激活状态');
  assert.throws(() => restartedOnScript.activate('project-does-not-exist'), /不存在/);
  assert.throws(() => restartedOnScript.category(created.id, '../generated-images'), /分类不存在/);

  const unsafeArea = path.join(runRoot, 'unsafe-registry-case');
  const unsafeAssetRoot = path.join(unsafeArea, '创作资产库');
  const unsafeRegistryPath = path.join(unsafeArea, 'data', 'creative-projects.json');
  fs.mkdirSync(unsafeAssetRoot, { recursive: true });
  fs.mkdirSync(path.dirname(unsafeRegistryPath), { recursive: true });
  fs.writeFileSync(unsafeRegistryPath, JSON.stringify({
    version: CREATIVE_PROJECTS_SCHEMA_VERSION,
    activeProjectId: 'project-aaaaaaaaaaaa',
    projects: [{
      id: 'project-aaaaaaaaaaaa', name: '越界项目', folder: '../越界目录', kind: 'script',
      createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    }],
  }), 'utf-8');
  const unsafeWarnings = [];
  const recovered = createCreativeProjectStore({
    filePath: unsafeRegistryPath,
    assetRoot: unsafeAssetRoot,
    onWarning: message => unsafeWarnings.push(message),
  });
  assert.equal(unsafeWarnings.length, 1, '恶意注册表没有触发安全恢复警告');
  assert.equal(recovered.active().id, INSPIRATION_PROJECT_ID);
  assert.equal(recovered.get('project-aaaaaaaaaaaa'), null, '恶意越界项目仍被注册');
  assert.equal(fs.existsSync(path.join(unsafeArea, '越界目录')), false, '恶意注册表在资产根外创建了目录');

  assert.throws(() => createCreativeProjectStore({ filePath: 'relative.json', assetRoot }), /绝对路径/);
  assert.throws(() => createCreativeProjectStore({ filePath: path.join(runRoot, 'root.json'), assetRoot: path.parse(runRoot).root }), /磁盘根目录/);
  assert.deepEqual(warnings, []);
  console.log('CREATIVE_PROJECTS_TEST_PASS');
} finally {
  const relative = path.relative(os.tmpdir(), runRoot);
  assert.ok(relative.startsWith('video-os-creative-projects-') && !relative.includes(`..${path.sep}`), '拒绝清理非测试临时目录');
  fs.rmSync(runRoot, { recursive: true, force: true });
}
