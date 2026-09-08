'use strict';

// 使用独立目录和本地平台测试页，重现“图片两个 GPT → 视频新开 GPT → 返回图片”。
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function run() {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-mode-tabs-'));
  for (const name of ['project', 'data', 'user-data', 'obsidian']) fs.mkdirSync(path.join(testRoot, name));
  let app;
  try {
    app = await electron.launch({
      executablePath: path.join(__dirname, 'dist', `视频制作 OS-darwin-${process.arch}`, '视频制作 OS.app/Contents/MacOS/VideoProductionOS'),
      timeout: 20000,
      env: {
        ...process.env,
        CREATOR_BROWSER_TEST: '1', VIDEO_OS_SMOKE_TEST: '0', VIDEO_OS_PORT: '3787',
        VIDEO_OS_USER_DATA: path.join(testRoot, 'user-data'),
        VIDEO_OS_DATA_DIR: path.join(testRoot, 'data'),
        VIDEO_OS_TEST_PROJECT_ROOT: path.join(testRoot, 'project'),
        VIDEO_OS_TEST_OBSIDIAN_VAULT: path.join(testRoot, 'obsidian'),
        OBSIDIAN_VAULT_PATH: path.join(testRoot, 'obsidian'),
      },
    });
    const page = await app.firstWindow();
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    const tabIds = () => page.locator('.platform-tab').evaluateAll(nodes => nodes.map(node => node.dataset.tabId));
    const switchMode = async mode => {
      await page.locator(`.mode-button[data-mode="${mode}"]`).click();
      await page.waitForFunction(expected => document.body.dataset.mode === expected && !document.querySelector('.mode-button').disabled, mode);
    };
    assert.equal(await page.locator('body').getAttribute('data-mode'), 'image');
    assert.equal(await page.locator('.platform-tab[data-service="gpt"]').count(), 1);
    await page.locator('#addPlatform').click();
    await page.locator('#duplicateTab').click();
    await page.waitForFunction(() => document.querySelectorAll('.platform-tab').length === 2);
    const imageTabs = await tabIds();
    const lastImageTab = await page.locator('.platform-tab.active').getAttribute('data-tab-id');

    // 每个真实网页留一份未提交内容和独立地址，检测是否被销毁、重载或挪用。
    const imageContents = await app.evaluate(async ({ webContents }) => {
      let pages = [];
      for (let attempt = 0; attempt < 200; attempt++) {
        pages = webContents.getAllWebContents().filter(contents => contents.getURL().includes('/creator-fixture.html?service=gpt'));
        if (pages.length === 2 && pages.every(contents => !contents.isLoading())) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      for (const [index, contents] of pages.entries()) {
        if (contents.isLoading()) await new Promise(resolve => contents.once('did-finish-load', resolve));
        await contents.executeJavaScript(`
          const draft = document.createElement('textarea');
          draft.id = 'modeDraft'; draft.value = 'IMAGE-DRAFT-${index}';
          document.body.appendChild(draft);
          history.replaceState(null, '', '#image-${index}');
        `);
      }
      return pages.map(contents => contents.id);
    });
    assert.equal(imageContents.length, 2);
    await switchMode('video');
    await page.locator('#addPlatform').click();
    await page.locator('[data-open-service="gpt"]').click();
    await page.waitForFunction(() => document.querySelector('.platform-tab.active')?.dataset.service === 'gpt');
    const videoGptId = await page.locator('.platform-tab.active').getAttribute('data-tab-id');
    assert.ok(!imageTabs.includes(videoGptId), '视频 GPT 必须是独立标签');
    assert.equal(await page.locator('.platform-tab[data-service="gpt"]').count(), 1);
    // 再明确多开一个视频 GPT，不能带走图片标签。
    await page.locator('#addPlatform').click();
    await page.locator('#duplicateTab').click();
    await page.waitForFunction(() => document.querySelectorAll('.platform-tab[data-service="gpt"]').length === 2);
    const videoTabs = await tabIds();

    for (let cycle = 0; cycle < 3; cycle++) {
      await switchMode('image');
      assert.deepEqual(await tabIds(), imageTabs, '两个图片标签的 ID 和顺序必须保持');
      assert.equal(await page.locator('.platform-tab.active').getAttribute('data-tab-id'), lastImageTab);
      const drafts = await app.evaluate(async ({ webContents }, ids) => Promise.all(ids.map(async id => {
        const contents = webContents.fromId(id);
        if (!contents || contents.isDestroyed()) throw new Error('图片网页已被销毁');
        return contents.executeJavaScript('({ value: document.getElementById("modeDraft")?.value, hash: location.hash })');
      })), imageContents);
      assert.deepEqual(drafts, imageContents.map((_, index) => ({ value: `IMAGE-DRAFT-${index}`, hash: `#image-${index}` })));
      await switchMode('video');
      assert.deepEqual(await tabIds(), videoTabs, '视频标签也必须独立恢复');
    }
    console.log('PACKAGED_MODE_TABS_PASS imageGpt=2 videoGpt=2 roundTrips=3 samePageIds=true draftsPreserved=true urlsPreserved=true');
  } finally {
    if (app) await app.close();
    fs.rmSync(testRoot, { recursive: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
