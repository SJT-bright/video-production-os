'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { MAC_PROJECT_ROOT_FROM_APP, resolveMacProjectRootFromBundle, macProjectDataDir } = require('./electron/runtime-project-path.cjs');

const root = __dirname;
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf-8');

function run() {
  const packageInfo = JSON.parse(read('package.json'));
  assert.equal(packageInfo.scripts['build:mac'], 'node build-mac.cjs');
  assert.ok(packageInfo.devDependencies['@electron/packager'], 'macOS 构建缺少标准 Electron Packager');

  const macBuild = read('build-mac.cjs');
  assert.ok(macBuild.includes("process.platform !== 'darwin'"), 'macOS 构建没有拒绝在 Windows 伪造 .app');
  assert.ok(macBuild.includes("await import('@electron/get')") && macBuild.includes("require('./node_modules/electron/checksums.json')") && macBuild.includes('electronZipDir: path.dirname(electronZip)'),
    'macOS 构建没有复用已校验的 Electron 运行时缓存');
  assert.ok(macBuild.includes('const buildKeepalive = setInterval') && macBuild.includes('.finally(() => clearInterval(buildKeepalive))'),
    'macOS 构建在新版 Node 等待解包时可能提前退出');
  assert.ok(macBuild.includes("packagerUnzip.extractElectronZip") && macBuild.includes("'/usr/bin/ditto'"),
    'macOS 构建没有规避新版 Node 下 Packager 旧 ZIP 读取器停滞的问题');
  assert.ok(macBuild.includes("assertMacBundle"), 'macOS Bundle 构建后没有接入完整 Bundle 验证');
  assert.ok(macBuild.includes("compatibilityMode: false"), 'macOS 构建错误继承了 Windows GPU/no-sandbox 兼容模式');
  assert.ok(macBuild.includes("executableName: EXECUTABLE_NAME"), 'macOS Bundle 没有稳定的 ASCII 内部可执行文件名');
  assert.ok(macBuild.includes('const appBundle = path.join(apps[0], `${PRODUCT_NAME}.app`)'),
    'macOS 构建错误地把 Packager 输出目录当成 .app Bundle');
  assert.ok(macBuild.includes("appBundleId: BUNDLE_ID"), 'macOS Bundle 没有稳定 Bundle ID');
  assert.ok(macBuild.includes("icon: path.join(APP_DIR, 'assets', 'app-icon.icns')") && macBuild.includes("'-replace', 'CFBundleDisplayName'"),
    'macOS Bundle 没有使用项目图标与中文显示名');
  assert.ok(macBuild.includes("'/usr/bin/codesign'") && macBuild.includes("'--force', '--deep', '--sign', '-'"),
    'macOS 构建后没有重新签署完整本地 Bundle');
  assert.ok(macBuild.includes("projectRootFromBundle: MAC_PROJECT_ROOT_FROM_APP"), 'macOS Bundle 没有写入可重定位项目根目录契约');
  const macBundle = read('verify-mac-bundle.cjs');
  assert.ok(macBundle.includes("verifyPackagedApp"), 'macOS Bundle 没有接入与 Windows 一致的构建清单验证');
  assert.ok(macBundle.includes("fs.existsSync(path.join(appRoot, 'data'))"), 'macOS Bundle 没有禁止复制实时 data');
  assert.ok(macBundle.includes("plutil") && macBundle.includes("lipo") && macBundle.includes("'--verify', '--deep', '--strict'"),
    'macOS 构建后缺少 plist、架构或签名静态验收');
  assert.ok(macBundle.includes("CFBundleExecutable") && macBundle.includes("assertRegularExecutable"), 'macOS Bundle 没有校验 Info.plist 与可执行文件一致性');
  assert.ok(macBundle.includes("projectRootFromBundle"), 'macOS Bundle 没有校验可重定位项目根目录契约');
  assert.ok(macBundle.includes('const relocatedProjectRoot = path.resolve(appRoot, verified.runtimeConfig.projectRootFromBundle)'),
    'macOS Bundle 验证没有实际断言资源目录可回溯到项目根');

  for (const file of ['启动OS-mac.command', '安装桌面版依赖-mac.command', '启动OS-浏览器版-mac.command']) {
    const script = read(file);
    assert.ok(script.startsWith('#!/bin/zsh\n'), `${file} 不是可在 Finder 调用的 zsh 脚本`);
    assert.equal(script.includes('\r'), false, `${file} 不是 LF 行尾`);
    assert.ok(script.includes('Darwin'), `${file} 缺少 macOS 平台保护`);
    assert.ok((fs.statSync(path.join(root, file)).mode & 0o111) !== 0, `${file} 没有 Finder 双击所需的执行权限`);
  }
  assert.ok(read('启动OS-mac.command').includes('verify-mac-build.cjs'), 'macOS 启动器不会拒绝陈旧 App');
  assert.ok(read('verify-mac-build.cjs').includes('assertMacBundle'), 'macOS 验证器没有复用完整 Bundle 合同');

  const server = read('server.js');
  assert.ok(server.includes("'Library', 'Application Support', 'obsidian'"), 'macOS 没有 Obsidian Vault 自动发现路径');
  assert.ok(server.includes("execFile('open', [ASSET_DIR]"), 'macOS 没有 Finder 打开素材库分支');
  assert.ok(server.includes("execFile('open', ['-R', entry.abs]"), 'macOS 没有 Finder 定位文件分支');

  const main = read(path.join('electron', 'main.cjs'));
  assert.ok(main.includes("function configureApplicationMenu()"), 'macOS 没有标准应用菜单');
  assert.ok(main.includes("titleBarStyle: 'hiddenInset'") && main.includes('trafficLightPosition'),
    'macOS 主窗口没有采用原生 inset 标题栏与系统交通灯');
  assert.ok(main.includes("vibrancy: 'under-window'"), 'macOS 主窗口没有接入系统材质');
  assert.ok(main.includes("app.on('activate'"), 'macOS Dock 点击后不会恢复主窗口');
  assert.ok(main.includes("resolveMacProjectRootFromBundle") && main.includes("macProjectDataDir"), 'macOS App 没有从当前 Bundle 位置重定位项目数据');
  assert.ok(main.includes("启动OS-mac.command"), '移动后的 macOS App 不会给出安全重建提示');
  assert.equal(main.includes("macPackagedApp && !explicitProjectRoot"), false,
    'macOS 发行 App 不得让 VIDEO_OS_PROJECT_ROOT 绕过 Bundle 位置门禁');
  assert.ok(main.indexOf('|| macProjectRootFromBundle') < main.indexOf('|| explicitProjectRoot'),
    'macOS 发行 App 必须优先使用当前 Bundle 解析出的项目根');
  const expectedProjectRoot = path.resolve('fixture-project');
  const expectedPackage = path.join(expectedProjectRoot, '视频制作OS', 'package.json');
  for (const arch of ['arm64', 'x64']) {
    const bundleAppRoot = path.join('fixture-project', '视频制作OS', 'dist', `视频制作 OS-darwin-${arch}`, '视频制作 OS.app', 'Contents', 'Resources', 'app');
    assert.equal(path.resolve(bundleAppRoot, MAC_PROJECT_ROOT_FROM_APP), expectedProjectRoot,
      `${arch} 标准 .app 资源目录必须恰好回溯到项目根，不能多退或少退一层`);
    assert.equal(resolveMacProjectRootFromBundle(bundleAppRoot, candidate => candidate === expectedPackage), expectedProjectRoot,
      `移动整个 ${arch} 项目后必须从当前 Bundle 位置解析新的项目根`);
    assert.equal(resolveMacProjectRootFromBundle(bundleAppRoot, () => false), '', `${arch} 孤立移动 .app 时必须拒绝猜测项目根`);
  }
  assert.equal(macProjectDataDir(expectedProjectRoot), path.join(expectedProjectRoot, '视频制作OS', 'data'));
  console.log('MAC_CONTRACT_TEST_PASS');
}

run();
