'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  SCHEMA_VERSION,
  ScriptBreakdownStore,
  validateBreakdownDocument,
} = require('./script-breakdown-store.cjs');

function fixture() {
  return {
    schemaVersion: SCHEMA_VERSION,
    documentId: 'episode-01-breakdown',
    project: '青春校园短剧',
    title: '第一集测试拆解',
    episode: 'E01',
    createdAt: '2026-08-30T08:00:00.000Z',
    source: { mode: 'text', file: '第一集.md', note: '时长为文本节拍估算' },
    summary: { logline: '两位学生在走廊意外重逢。' },
    groups: [{
      id: 'G01',
      title: '场次1-1｜走廊重逢',
      durationSec: 12,
      storyFunction: '建立意外重逢并留下关系悬念。',
      scene: '教学楼走廊／日内',
      characters: ['苏晚', '陈叙'],
      description: '苏晚停步，陈叙从走廊另一端抬眼。',
      voiceover: '无',
      endBeat: '两人隔着数步对视，动作同时停住。',
    }],
    shots: [{
      id: 'E01-S001',
      shotNo: 'S001',
      groupId: 'G01',
      title: '走廊停步',
      storyTask: '让两人第一次看见彼此。',
      durationSec: 6,
      scene: '教学楼走廊／日内',
      characters: ['苏晚', '陈叙'],
      startState: '苏晚从画面左侧走入，陈叙位于走廊尽头。',
      action: '苏晚听见脚步后停下并抬眼。',
      performance: '她的呼吸短暂停顿，视线稳定落在陈叙脸上。',
      camera: '真实三脚架平视中景，40mm 适度景深。',
      endState: '苏晚停在画面左侧，陈叙仍在右后景。',
      generation: {
        tool: 'Seedance 2.0',
        status: 'ready',
        promptLanguage: 'zh-CN',
        missingInputs: [],
        referenceAssets: ['@图1：用于锁定苏晚面部。'],
        prompt: '一条完整、可复制并通过输入门禁的测试提示词。',
      },
      acceptance: ['人物数量为两人', '动作结束后站位清楚'],
    }],
  };
}

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-breakdown-'));
  if (!tempRoot.startsWith(os.tmpdir() + path.sep)) throw new Error('临时目录不在系统 tmp 内');
  try {
    const store = new ScriptBreakdownStore({ directory: path.join(tempRoot, 'breakdowns') });
    assert.deepEqual(store.list().items, []);

    const first = store.import(fixture(), '第一集.json');
    assert.equal(first.summary.title, '第一集测试拆解');
    assert.equal(first.summary.shots, 1);
    assert.equal(first.summary.ready, 1);
    assert.equal(first.summary.needsInput, 0);
    assert.equal(store.read(first.summary.filename).document.shots[0].shotNo, 'S001');

    const second = store.import(fixture(), '第一集.json');
    assert.notEqual(second.summary.filename, first.summary.filename, '同名导入不应覆盖现有文件');
    assert.equal(store.list().items.length, 2);

    assert.throws(() => store.read('../第一集.json'), /文件名无效/);

    const outsideFile = path.join(tempRoot, '目录外.json');
    fs.writeFileSync(outsideFile, JSON.stringify(fixture()), 'utf-8');
    fs.symlinkSync(outsideFile, path.join(tempRoot, 'breakdowns', '链接.json'));
    assert.throws(() => store.read('链接.json'), /不存在或超过 2 MB/, '不得跟随剧本目录中的符号链接');

    const needsInput = fixture();
    needsInput.documentId = 'episode-01-needs-input';
    needsInput.shots[0].generation = {
      tool: 'Seedance 2.0',
      status: 'needs-input',
      promptLanguage: 'zh-CN',
      missingInputs: ['上一段真实成片尾帧'],
      referenceAssets: [],
      prompt: '',
    };
    assert.doesNotThrow(() => validateBreakdownDocument(needsInput));

    const unsafeReady = structuredClone(needsInput);
    unsafeReady.shots[0].generation.status = 'ready';
    assert.throws(() => validateBreakdownDocument(unsafeReady), /ready 时必须包含可复制提示词/);

    const fakePlaceholder = fixture();
    fakePlaceholder.shots[0].generation.status = 'needs-input';
    fakePlaceholder.shots[0].generation.missingInputs = ['尾帧'];
    assert.throws(() => validateBreakdownDocument(fakePlaceholder), /保持 prompt 为空/);

    const wrongGroup = fixture();
    wrongGroup.shots[0].groupId = 'G99';
    assert.throws(() => validateBreakdownDocument(wrongGroup), /没有对应分组/);

    fs.writeFileSync(path.join(tempRoot, 'breakdowns', '损坏.json'), '{not-json', 'utf-8');
    const listing = store.list();
    assert.equal(listing.invalid.length, 1);
    assert.equal(listing.invalid[0].filename, '损坏.json');
    console.log('SCRIPT_BREAKDOWN_STORE_TEST_PASS');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run();
