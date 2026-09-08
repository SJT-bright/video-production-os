'use strict';

const fs = require('fs');
const path = require('path');
const { BUILD_SCHEMA_VERSION } = require('./build-contract.cjs');
const { verifyPackagedApp } = require('./verify-build-manifest.cjs');

const APP_DIR = __dirname;
const PACKAGE_ROOT = path.join(APP_DIR, 'dist', '视频制作OS-win32-x64');
const PACKAGE_APP = path.join(PACKAGE_ROOT, 'resources', 'app');
function verifyDesktopBuild() {
  const exe = path.join(PACKAGE_ROOT, '视频制作OS.exe');
  if (!fs.existsSync(exe)) throw new Error('桌面 EXE 不存在');
  const result = verifyPackagedApp({
    sourceRoot: APP_DIR,
    appRoot: PACKAGE_APP,
    projectRoot: path.dirname(APP_DIR),
    dataDir: path.join(APP_DIR, 'data'),
    platform: 'win32',
    arch: 'x64',
    compatibilityMode: true,
  });
  if (result.runtimeConfig.buildSchemaVersion !== BUILD_SCHEMA_VERSION) throw new Error('桌面发行包构建协议版本不正确');
  return { exe, ...result };
}

if (require.main === module) {
  try {
    const result = verifyDesktopBuild();
    console.log(`DESKTOP_BUILD_VERIFY_PASS checked=${result.checkedFiles} exe=${result.exe}`);
  } catch (error) {
    console.error(`DESKTOP_BUILD_VERIFY_FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyDesktopBuild, PACKAGE_ROOT, PACKAGE_APP };
