'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SOURCE_FILES, SOURCE_DIRS, BUILD_SCHEMA_VERSION } = require('./build-contract.cjs');
const { collectExpectedSourceFiles, verifyPackagedApp } = require('./verify-build-manifest.cjs');

const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-build-manifest-'));

function hash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyContract(sourceRoot, targetRoot) {
  for (const relativePath of SOURCE_FILES) fs.cpSync(path.join(sourceRoot, relativePath), path.join(targetRoot, relativePath), { force: true });
  for (const relativePath of SOURCE_DIRS) fs.cpSync(path.join(sourceRoot, relativePath), path.join(targetRoot, relativePath), { recursive: true, force: true });
}

function writeFixture(overrides = {}) {
  const sourceRoot = path.join(runRoot, `source-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const appRoot = path.join(runRoot, `app-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const projectRoot = path.join(runRoot, 'project');
  const dataDir = path.join(runRoot, 'data');
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(appRoot, { recursive: true });
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  copyContract(__dirname, sourceRoot);
  copyContract(sourceRoot, appRoot);
  const expectedFiles = collectExpectedSourceFiles(sourceRoot);
  const runtimeConfig = {
    projectRoot,
    dataDir,
    compatibilityMode: true,
    buildSchemaVersion: BUILD_SCHEMA_VERSION,
  };
  const manifest = {
    buildSchemaVersion: BUILD_SCHEMA_VERSION,
    product: '测试发行包', platform: 'win32', arch: 'x64',
    sourceHashes: Object.fromEntries(expectedFiles.map(relativePath => [relativePath, hash(path.join(sourceRoot, relativePath))])),
    runtimeConfig,
  };
  Object.assign(manifest, overrides);
  fs.writeFileSync(path.join(appRoot, 'runtime-config.json'), `${JSON.stringify(runtimeConfig, null, 2)}\n`);
  fs.writeFileSync(path.join(appRoot, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { sourceRoot, appRoot, projectRoot, dataDir, manifest };
}

function verifyFixture(fixture) {
  return verifyPackagedApp({
    sourceRoot: fixture.sourceRoot,
    appRoot: fixture.appRoot,
    projectRoot: fixture.projectRoot,
    dataDir: fixture.dataDir,
    platform: 'win32', arch: 'x64', compatibilityMode: true,
  });
}

try {
  assert.ok(SOURCE_FILES.includes('creative-projects.cjs'), '构建合同没有包含剧本项目注册表');
  const valid = writeFixture();
  const validResult = verifyFixture(valid);
  assert.equal(validResult.checkedFiles, collectExpectedSourceFiles(valid.sourceRoot).length);
  assert.ok(validResult.expectedFiles.includes('creative-projects.cjs'), '发行包清单没有校验剧本项目注册表');

  const missing = writeFixture();
  delete missing.manifest.sourceHashes['style.css'];
  fs.writeFileSync(path.join(missing.appRoot, 'build-manifest.json'), JSON.stringify(missing.manifest));
  assert.throws(() => verifyFixture(missing), /文件集合不完整或异常/);

  const extra = writeFixture();
  extra.manifest.sourceHashes['not-in-contract.js'] = '0'.repeat(64);
  fs.writeFileSync(path.join(extra.appRoot, 'build-manifest.json'), JSON.stringify(extra.manifest));
  assert.throws(() => verifyFixture(extra), /文件集合不完整或异常/);

  const stale = writeFixture();
  fs.appendFileSync(path.join(stale.appRoot, 'creator.js'), '\n// stale package probe\n');
  assert.throws(() => verifyFixture(stale), /发行包已过期/);

  const staleSource = writeFixture();
  fs.appendFileSync(path.join(staleSource.sourceRoot, 'creator.js'), '\n// stale source probe\n');
  assert.throws(() => verifyFixture(staleSource), /发行包已过期/);

  const staleCreativeProjects = writeFixture();
  fs.appendFileSync(path.join(staleCreativeProjects.appRoot, 'creative-projects.cjs'), '\n// stale project registry probe\n');
  assert.throws(() => verifyFixture(staleCreativeProjects), /发行包已过期：creative-projects\.cjs/);

  const oldSchema = writeFixture();
  oldSchema.manifest.buildSchemaVersion = BUILD_SCHEMA_VERSION - 1;
  fs.writeFileSync(path.join(oldSchema.appRoot, 'build-manifest.json'), JSON.stringify(oldSchema.manifest));
  assert.throws(() => verifyFixture(oldSchema), /构建清单版本过旧/);

  const wrongPlatform = writeFixture();
  wrongPlatform.manifest.platform = 'darwin';
  fs.writeFileSync(path.join(wrongPlatform.appRoot, 'build-manifest.json'), JSON.stringify(wrongPlatform.manifest));
  assert.throws(() => verifyFixture(wrongPlatform), /平台与当前验证目标不一致/);

  const malformedHash = writeFixture();
  malformedHash.manifest.sourceHashes['app.js'] = 'not-a-sha256';
  fs.writeFileSync(path.join(malformedHash.appRoot, 'build-manifest.json'), JSON.stringify(malformedHash.manifest));
  assert.throws(() => verifyFixture(malformedHash), /哈希格式无效/);

  const dataLeak = writeFixture();
  fs.mkdirSync(path.join(dataLeak.appRoot, 'data'));
  assert.throws(() => verifyFixture(dataLeak), /不应包含实时 data 目录/);

  const configMismatch = writeFixture();
  const changedConfig = { ...configMismatch.manifest.runtimeConfig, compatibilityMode: false };
  fs.writeFileSync(path.join(configMismatch.appRoot, 'runtime-config.json'), JSON.stringify(changedConfig));
  assert.throws(() => verifyFixture(configMismatch), /兼容模式与平台契约不一致/);
  console.log('BUILD_MANIFEST_TEST_PASS');
} finally {
  fs.rmSync(runRoot, { recursive: true, force: true });
}
