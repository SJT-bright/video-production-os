'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { launchChromium } = require('./test-playwright.cjs');

const BASE_URL = process.argv[2] || 'http://127.0.0.1:3750';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const PROJECT = {
  id: 'project-11111111-1111-4111-8111-111111111111', name: '校园心动', folder: '校园心动', kind: 'script',
  categories: [{ id: 'frames', label: '首帧与尾帧', path: '校园心动/首帧与尾帧', children: [
    { label: '首帧', path: '校园心动/首帧与尾帧/首帧' },
    { label: '尾帧', path: '校园心动/首帧与尾帧/尾帧' },
  ] }],
};
const BULK_IMAGES = Array.from({ length: 123 }, (_, index) => ({
  kind: 'file', type: 'image',
  name: `批量资产-${String(index + 1).padStart(3, '0')}.png`,
  path: `校园心动/人物资产/批量资产-${String(index + 1).padStart(3, '0')}.png`,
  ext: '.png', size: 1024, sizeText: '1 KB', mtime: `2026-08-29T00:${String(index % 60).padStart(2, '0')}:00.000Z`,
}));
const TREE = {
  available: true,
  project: PROJECT,
  rootName: '创作资产库',
  stats: { folders: 3, files: 129, image: 125, audio: 1, video: 1, document: 1, other: 1, sizeText: '18.4 MB' },
  tree: {
    kind: 'folder', name: '创作资产库', path: '', fileCount: 129, children: [
      {
        kind: 'folder', name: '校园心动', path: '校园心动', fileCount: 128, children: [
          {
            kind: 'folder', name: '人物资产', path: '校园心动/人物资产', fileCount: 125, children: [
              { kind: 'file', type: 'image', name: '女主正脸.png', path: '校园心动/人物资产/女主正脸.png', ext: '.png', size: 2048, sizeText: '2 KB', mtime: '2026-08-30T10:00:00.000Z' },
              { kind: 'file', type: 'image', name: '校服三视图.jpg', path: '校园心动/人物资产/校服三视图.jpg', ext: '.jpg', size: 3072, sizeText: '3 KB', mtime: '2026-08-30T09:00:00.000Z' },
              ...BULK_IMAGES,
            ],
          },
          { kind: 'file', type: 'audio', name: '女主声线.wav', path: '校园心动/女主声线.wav', ext: '.wav', size: 4096, sizeText: '4 KB', mtime: '2026-08-30T08:00:00.000Z' },
          { kind: 'file', type: 'video', name: '走廊参考.mp4', path: '校园心动/走廊参考.mp4', ext: '.mp4', size: 8192, sizeText: '8 KB', mtime: '2026-08-30T07:00:00.000Z' },
          { kind: 'file', type: 'document', name: '资产说明.md', path: '校园心动/资产说明.md', ext: '.md', size: 512, sizeText: '512 B', mtime: '2026-08-30T06:00:00.000Z' },
        ],
      },
      { kind: 'folder', name: '第二个剧本', path: '第二个剧本', fileCount: 1, children: [
        { kind: 'file', type: 'other', name: '工程源文件.psd', path: '第二个剧本/工程源文件.psd', ext: '.psd', size: 1024, sizeText: '1 KB', mtime: '2026-08-30T05:00:00.000Z' },
      ] },
    ],
  },
};

async function run() {
  const consoleErrors = [];
  const pageErrors = [];
  const folderRequests = [];
  const importRequests = [];
  const browser = await launchChromium();
  try {
    const page = await browser.newPage({ viewport: { width: 720, height: 860 } });
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(String(error)));
    await page.route('**/api/**', route => {
      if (route.request().method() !== 'GET') return route.abort('blockedbyclient');
      return route.continue();
    });
    await page.route('**/api/creative-assets?*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(TREE),
    }));
    await page.route('**/api/creative-assets/file?*', route => route.fulfill({
      status: 200, contentType: 'image/png', body: PNG,
    }));
    await page.route('**/api/creative-assets/folder?*', async route => {
      const body = route.request().postDataJSON();
      folderRequests.push(body);
      const folderPath = body.parent ? `${body.parent}/${body.name}` : body.name;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, folder: { name: body.name, path: folderPath } }) });
    });
    const renameRequests = [];
    const moveRequests = [];
    const normalizeRequests = [];
    await page.route('**/api/creative-assets/normalize?*', async route => {
      normalizeRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, renamed: [{ from: 'a.png', to: '生成图片-001.png' }, { from: 'b.png', to: '生成图片-002.png' }] }) });
    });
    await page.route('**/api/creative-assets/rename?*', async route => {
      const body = route.request().postDataJSON();
      renameRequests.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, name: `${body.name}.png`, path: body.path }) });
    });
    await page.route('**/api/creative-assets/move?*', async route => {
      const body = route.request().postDataJSON();
      moveRequests.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, name: 'moved.png', path: body.folder, folder: body.folder }) });
    });
    await page.route('**/api/creative-assets/import?*', async route => {
      importRequests.push(new URL(route.request().url()).searchParams.get('name'));
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, type: 'image', name: '新资产.png' }) });
    });
    await page.addInitScript(() => {
      const listeners = { panel: [], drag: [] };
      let panel = { open: true, layout: 'overlay', width: 520, creativeAssetAvailable: true };
      window.__assetTest = { states: [], dragPaths: [], copied: [], shown: [], deleted: [], opened: 0, projectPickers: 0 };
      window.assetAPI = {
        getConfig: async () => ({ panel, project: {
          id: 'project-11111111-1111-4111-8111-111111111111', name: '校园心动', folder: '校园心动', kind: 'script',
          categories: [{ id: 'frames', label: '首帧与尾帧', path: '校园心动/首帧与尾帧', children: [
            { label: '首帧', path: '校园心动/首帧与尾帧/首帧' }, { label: '尾帧', path: '校园心动/首帧与尾帧/尾帧' },
          ] }],
        }, rootName: '校园心动', rootPath: '/mock/创作资产库/校园心动', creativeAssetAvailable: true }),
        setPanelState: async patch => {
          panel = { ...panel, ...patch };
          window.__assetTest.states.push({ ...panel });
          listeners.panel.forEach(callback => callback(panel));
          return panel;
        },
        startDrag: assetPath => {
          window.__assetTest.dragPaths.push(assetPath);
          listeners.drag.forEach(callback => callback({ ok: true, path: assetPath }));
        },
        copyImage: async assetPath => { window.__assetTest.copied.push(assetPath); return true; },
        showItem: async assetPath => { window.__assetTest.shown.push(assetPath); return true; },
        deleteItem: async assetPath => { window.__assetTest.deleted.push(assetPath); return true; },
        openLibrary: async () => { window.__assetTest.opened += 1; return true; },
        showProjectPicker: async () => { window.__assetTest.projectPickers += 1; return true; },
        onPanelState: callback => { listeners.panel.push(callback); return () => {}; },
        onDragResult: callback => { listeners.drag.push(callback); return () => {}; },
      };
    });

    const response = await page.goto(`${BASE_URL}/creator-assets.html`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.locator('body[data-ready="true"]').waitFor();
    assert.equal(await page.locator('.asset-card').count(), 120, '大量资产应分批渲染');
    assert.equal(await page.locator('.load-more').count(), 1);
    await page.locator('.load-more').click();
    assert.equal(await page.locator('.asset-card').count(), 129);
    assert.equal(await page.locator('.folder-button').count(), 4, '应显示根、剧本与下级文件夹');

    // Obsidian 式折叠树：箭头旋转 + 子级高度动画（collapsed 类切换），子级行保留在 DOM 中
    const rootDisclosure = page.locator('.folder-disclosure:not(.empty)').first();
    assert.equal(await rootDisclosure.getAttribute('aria-expanded'), 'true', '默认应全部展开');
    await rootDisclosure.click();
    const rootWrapper = page.locator('.folder-children').first();
    assert.equal(await rootWrapper.evaluate(node => node.classList.contains('collapsed')), true, '点击箭头后子级应折叠');
    assert.equal(await page.locator('.folder-row').count(), 4, '折叠只是视觉收起，子级行不应从 DOM 移除');
    await rootDisclosure.click();
    assert.equal(await rootWrapper.evaluate(node => !node.classList.contains('collapsed')), true, '再次点击应重新展开');
    assert.equal(await page.locator('.source-list').evaluate(node => getComputedStyle(node).borderRightWidth), '1px', '展开态应采用左右 Split View');

    await page.locator('#assetSearch').fill('校服');
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.asset-card').count(), 1);
    assert.match(await page.locator('.asset-card').innerText(), /校服三视图/);
    await page.locator('#clearSearch').click();
    assert.equal(await page.locator('.asset-card').count(), 120, '清空搜索后应回到首批资产');

    await page.locator('[data-filter="audio"]').click();
    assert.equal(await page.locator('.asset-card[data-kind="audio"]').count(), 1);
    await page.locator('.asset-card[data-kind="audio"] .asset-preview-button').click();
    assert.equal(await page.locator('#previewMedia audio').count(), 1);
    await page.locator('#closePreview').click();
    assert.equal(await page.locator('#previewMedia audio').count(), 0, '关闭预览后应卸载音频');

    await page.locator('[data-filter="video"]').click();
    await page.locator('.asset-card[data-kind="video"] .asset-preview-button').click();
    assert.equal(await page.locator('#previewMedia video').count(), 1);
    assert.equal(await page.locator('#captureFirstFrame').isVisible(), true);
    assert.equal(await page.locator('#captureTailFrame').isVisible(), true);
    await page.locator('#closePreview').click();

    await page.locator('[data-filter="image"]').click();
    const heroCard = page.locator('.asset-card', { hasText: '女主正脸.png' });
    await heroCard.dispatchEvent('dragstart');
    assert.deepEqual(await page.evaluate(() => window.__assetTest.dragPaths), ['校园心动/人物资产/女主正脸.png']);
    await heroCard.locator('.asset-preview-button').click();
    await page.locator('#zoomIn').click();
    assert.equal(await page.locator('#zoomValue').textContent(), '110%');
    await page.locator('#previewCopy').click();
    await page.locator('#previewShow').click();
    assert.equal(await page.evaluate(() => window.__assetTest.copied.length), 1);
    assert.equal(await page.evaluate(() => window.__assetTest.shown.length), 1);
    await page.locator('#closePreview').click();

    // 资产卡右上角删除：确认后移入废纸篓并刷新列表
    page.once('dialog', dialog => dialog.accept());
    await heroCard.hover();
    await heroCard.locator('.asset-delete-button').click();
    await page.waitForFunction(() => window.__assetTest.deleted.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__assetTest.deleted), ['校园心动/人物资产/女主正脸.png']);

    // 单卡改名：对话框预填去扩展名名称，提交后调用 rename 接口
    await heroCard.hover();
    await heroCard.locator('.asset-card-actions button', { hasText: '改名' }).click();
    await page.locator('#renameDialog[open]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#renameInput').inputValue(), '女主正脸', '改名框应预填去扩展名的名称');
    await page.locator('#renameInput').fill('女主四视图-白裙');
    await page.locator('#renameForm button[type="submit"]').click();
    for (let i = 0; i < 50 && !renameRequests.length; i++) await page.waitForTimeout(100);
    assert.equal(renameRequests.length, 1, '改名请求没有发出');
    assert.deepEqual(renameRequests[0], { path: '校园心动/人物资产/女主正脸.png', name: '女主四视图-白裙' });

    // 单卡移动：选目标文件夹后调用 move 接口
    await heroCard.hover();
    await heroCard.locator('.asset-card-actions button', { hasText: '移动' }).click();
    await page.locator('#moveDialog[open]').waitFor({ state: 'attached' });
    await page.locator('.move-folder-row', { hasText: '第二个剧本' }).click();
    for (let i = 0; i < 50 && !moveRequests.length; i++) await page.waitForTimeout(100);
    assert.equal(moveRequests.length, 1, '移动请求没有发出');
    assert.deepEqual(moveRequests[0], { path: '校园心动/人物资产/女主正脸.png', folder: '第二个剧本' });

    // 多选：勾选两张卡 → 批量删除（先等移动后列表重渲染完成）
    await page.waitForFunction(() => document.querySelector('#moveDialog') && !document.querySelector('#moveDialog').open);
    await page.waitForTimeout(400);
    // 移动成功后会自动跳到目标文件夹；切回「校园心动」再做批量选择
    await page.locator('.folder-button', { hasText: '校园心动' }).click();
    await page.waitForTimeout(200);
    const secondCard = page.locator('.asset-card', { hasText: '校服三视图.jpg' });
    await secondCard.waitFor({ state: 'attached' });
    await secondCard.hover();
    await secondCard.locator('.asset-check').click();
    assert.equal(await page.locator('#selectionBar').isVisible(), true, '勾选后应出现批量操作栏');
    await page.locator('.asset-card', { hasText: '女主正脸.png' }).hover();
    await page.locator('.asset-card', { hasText: '女主正脸.png' }).locator('.asset-check').click();
    assert.match(await page.locator('#selectionCount').textContent(), /已选 2 项/);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#batchDelete').click();
    await page.waitForFunction(() => window.__assetTest.deleted.length === 3);
    assert.deepEqual(await page.evaluate(() => window.__assetTest.deleted.slice(1)), [
      '校园心动/人物资产/校服三视图.jpg', '校园心动/人物资产/女主正脸.png',
    ]);
    assert.equal(await page.locator('#selectionBar').isHidden(), true, '批量删除后操作栏应收起');

    // 整理文件名：确认后对当前分类发起 normalize 请求
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#normalizeNames').click();
    for (let i = 0; i < 50 && !normalizeRequests.length; i++) await page.waitForTimeout(100);
    assert.equal(normalizeRequests.length, 1, '整理文件名请求没有发出');
    assert.equal(normalizeRequests[0].folder, '校园心动', '应针对当前选中分类');

    await page.locator('.folder-button', { hasText: '校园心动' }).click();
    assert.equal(await page.locator('#newSubfolder').isDisabled(), false);
    await page.locator('#newSubfolder').click();
    await page.locator('#folderName').fill('音频');
    await page.locator('#folderForm .primary-button').click();
    assert.deepEqual(folderRequests.at(-1), { project: PROJECT.id, parent: '校园心动', name: '音频' });

    await page.locator('#newScriptFolder').click();
    assert.equal(await page.evaluate(() => window.__assetTest.projectPickers), 1, '切换剧本应回到统一剧本选择器');

    await page.locator('.folder-button', { hasText: '校园心动' }).click();
    await page.locator('#assetFileInput').setInputFiles({ name: '新资产.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => document.querySelector('#importAssets:not(:disabled)'));
    assert.deepEqual(importRequests, ['新资产.png']);

    // 整库拖拽导入：Finder 文件直接拖到资产区，应进入当前选中的文件夹
    await page.locator('#assetGrid').evaluate(grid => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([137, 80, 78, 71])], '拖进来.png', { type: 'image/png' }));
      grid.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
    await page.waitForFunction(() => document.querySelector('#importAssets:not(:disabled)'));
    assert.deepEqual(importRequests, ['新资产.png', '拖进来.png'], '拖拽导入没有把文件送入当前分类');

    await page.locator('#expandPanel').click();
    assert.equal((await page.evaluate(() => window.__assetTest.states)).at(-1).width, 720);
    await page.locator('[data-layout="push"]').click();
    assert.equal(await page.locator('body').getAttribute('data-layout'), 'push');
    await page.locator('#closePanel').click();
    const states = await page.evaluate(() => window.__assetTest.states);
    assert.equal(states.at(-1).open, false);
    assert.ok(states.some(item => item.layout === 'push'));

    await page.setViewportSize({ width: 360, height: 760 });
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);

    const artifactDir = path.join(__dirname, 'test-artifacts');
    fs.mkdirSync(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, `creator-assets-library-${process.pid}-${Date.now()}.png`), fullPage: true });

    const browserOnlyPage = await browser.newPage({ viewport: { width: 720, height: 760 } });
    await browserOnlyPage.route('**/api/creative-projects', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ activeProjectId: PROJECT.id, projects: [PROJECT] }),
    }));
    await browserOnlyPage.route('**/api/creative-assets?*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(TREE),
    }));
    await browserOnlyPage.route('**/api/creative-assets/file?*', route => route.fulfill({
      status: 200, contentType: 'image/png', body: PNG,
    }));
    await browserOnlyPage.goto(`${BASE_URL}/creator-assets.html`, { waitUntil: 'networkidle' });
    await browserOnlyPage.locator('body[data-ready="true"]').waitFor();
    assert.match(await browserOnlyPage.locator('#capabilityNote').textContent(), /浏览器预览/);
    assert.equal(await browserOnlyPage.locator('.asset-card').count(), 120, '浏览器预览模式仍应读取完整资产索引');
    await browserOnlyPage.close();

    const librarySurfacePage = await browser.newPage({ viewport: { width: 1180, height: 760 }, colorScheme: 'dark' });
    await librarySurfacePage.route('**/api/creative-projects', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ activeProjectId: PROJECT.id, projects: [PROJECT] }),
    }));
    await librarySurfacePage.route('**/api/creative-assets?*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(TREE),
    }));
    await librarySurfacePage.route('**/api/creative-assets/file?*', route => route.fulfill({
      status: 200, contentType: 'image/png', body: PNG,
    }));
    await librarySurfacePage.goto(`${BASE_URL}/creator-assets.html?surface=library`, { waitUntil: 'networkidle' });
    await librarySurfacePage.locator('body[data-ready="true"]').waitFor();
    assert.equal(await librarySurfacePage.locator('body').getAttribute('data-surface'), 'library');
    assert.equal(await librarySurfacePage.locator('html').evaluate(node => getComputedStyle(node).colorScheme), 'light', '资产中心不应跟随系统深色模式');
    assert.equal(await librarySurfacePage.locator('.resize-handle').evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await librarySurfacePage.locator('.header-actions').evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await librarySurfacePage.locator('.layout-switch').evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await librarySurfacePage.locator('.asset-shell').evaluate(node => getComputedStyle(node).borderLeftWidth), '0px');
    assert.match(await librarySurfacePage.locator('.asset-breadcrumb').textContent(), /资产中心 \/ 创作资产/);
    assert.equal(await librarySurfacePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await librarySurfacePage.close();

    const failurePage = await browser.newPage({ viewport: { width: 520, height: 720 } });
    await failurePage.route('**/api/creative-assets?*', route => route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ error: '模拟读取失败' }),
    }));
    await failurePage.addInitScript(() => {
      window.assetAPI = {
        getConfig: async () => ({ panel: { open: true, layout: 'overlay', width: 520 }, project: {
          id: 'project-11111111-1111-4111-8111-111111111111', name: '校园心动', folder: '校园心动', categories: [],
        }, rootName: '故障测试库' }),
        setPanelState: async patch => ({ open: true, layout: 'overlay', width: 520, ...patch }),
        startDrag: () => {}, copyImage: async () => true, showItem: async () => true, openLibrary: async () => true, showProjectPicker: async () => true,
        onPanelState: () => () => {}, onDragResult: () => () => {},
      };
    });
    const failureResponse = await failurePage.goto(`${BASE_URL}/creator-assets.html`, { waitUntil: 'networkidle' });
    assert.equal(failureResponse.status(), 200);
    await failurePage.locator('body[data-ready="error"]').waitFor();
    assert.match(await failurePage.locator('.asset-state.error').innerText(), /模拟读取失败/);
    await failurePage.close();
    console.log('CREATOR_ASSETS PASS: script folders, import, type filters, media preview, image zoom, native drag and 360–760px layout');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
