'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { BUILD_SCHEMA_VERSION } = require('./build-contract.cjs');
const { verifyDesktopBuild } = require('./verify-desktop-build.cjs');

const packageRoot = path.join(__dirname, 'dist', '视频制作OS-win32-x64');
const executable = path.join(packageRoot, '视频制作OS.exe');
const runRoot = path.join(__dirname, 'test-artifacts', `desktop-package-${process.pid}-${Date.now()}`);

async function run() {
  const verified = verifyDesktopBuild();
  assert.ok(fs.existsSync(executable), '桌面发行版不存在，请先执行 npm run build:desktop');
  assert.equal(
    verified.runtimeConfig.buildSchemaVersion,
    BUILD_SCHEMA_VERSION,
    '发行包缺少当前构建协议版本'
  );
  const runtimeConfig = JSON.parse(fs.readFileSync(path.join(packageRoot, 'resources', 'app', 'runtime-config.json'), 'utf-8'));
  assert.equal(runtimeConfig.compatibilityMode, true, '发行版没有启用本机稳定兼容模式');
  assert.equal(path.resolve(runtimeConfig.dataDir), path.resolve(__dirname, 'data'), '发行版没有连接权威 data 目录');
  assert.equal(fs.existsSync(path.join(packageRoot, 'resources', 'app', 'data')), false, '发行包不应复制实时 data 目录');
  assert.equal(fs.existsSync(path.join(packageRoot, 'resources', 'app', 'production-store.cjs')), true, '发行包缺少制作台账模块');
  const launcher = fs.readFileSync(path.join(__dirname, '启动OS.bat'), 'utf-8');
  assert.ok(!launcher.includes('node server.js --open'), '桌面入口仍会自动跳转系统浏览器');
  assert.ok(launcher.includes('视频制作OS.exe'), '桌面入口没有优先启动独立 EXE');

  fs.mkdirSync(path.join(runRoot, 'project'), { recursive: true });
  fs.mkdirSync(path.join(runRoot, 'obsidian'), { recursive: true });
  fs.mkdirSync(path.join(runRoot, 'user-data'), { recursive: true });
  fs.mkdirSync(path.join(runRoot, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(runRoot, 'obsidian', '测试角色.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  );

  let child = null;
  try {
    const output = await new Promise((resolve, reject) => {
      child = spawn(executable, [], {
        cwd: packageRoot,
        windowsHide: true,
        env: {
          ...process.env,
          CREATOR_BROWSER_TEST: '1',
          VIDEO_OS_SMOKE_TEST: '1',
          VIDEO_OS_PORT: '3795',
          VIDEO_OS_TEST_PROJECT_ROOT: path.join(runRoot, 'project'),
          VIDEO_OS_TEST_OBSIDIAN_VAULT: path.join(runRoot, 'obsidian'),
          OBSIDIAN_VAULT_PATH: path.join(runRoot, 'obsidian'),
          VIDEO_OS_USER_DATA: path.join(runRoot, 'user-data'),
          VIDEO_OS_DATA_DIR: path.join(runRoot, 'data'),
          ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let combined = '';
      child.stdout.on('data', chunk => { combined += chunk.toString(); });
      child.stderr.on('data', chunk => { combined += chunk.toString(); });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`桌面发行版烟雾测试超时：\n${combined}`));
      }, 35000);
      child.once('error', error => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', code => {
        clearTimeout(timer);
        if (code === 0) resolve(combined);
        else reject(new Error(`桌面发行版退出码 ${code}：\n${combined}`));
      });
    });

    assert.match(output, /ELECTRON_SMOKE_PASS/, output);
    assert.match(output, /"packaged":true/, output);
    assert.match(output, /Gemini/, output);
    assert.match(output, /Grok/, output);
    assert.match(output, /核绘/, output);
    assert.match(output, /LibTV/, output);
    assert.match(output, /"production":\{"health":true,"activeShot":"SMOKE-\d+"\}/, output);
    console.log('DESKTOP_PACKAGE PASS: independent packaged EXE launched without browser fallback');
  } finally {
    if (child && child.exitCode === null) child.kill();
    const artifactRoot = path.resolve(__dirname, 'test-artifacts') + path.sep;
    assert.ok(path.resolve(runRoot).startsWith(artifactRoot), '拒绝清理测试产物目录以外的路径');
    try {
      fs.rmSync(runRoot, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch (error) {
      console.warn(`测试临时目录稍后清理：${error.message}`);
    }
  }
}

run().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
