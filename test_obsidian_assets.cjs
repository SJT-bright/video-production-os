'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { resolveObsidianImage } = require('./electron/obsidian-assets.cjs');

const artifactRoot = path.resolve(__dirname, 'test-artifacts');
fs.mkdirSync(artifactRoot, { recursive: true });
const testRoot = fs.mkdtempSync(path.join(artifactRoot, 'obsidian-assets-'));

try {
  const nested = path.join(testRoot, '人物资产');
  const hidden = path.join(testRoot, '.obsidian');
  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(hidden, { recursive: true });
  const image = path.join(nested, '女主正脸.png');
  fs.writeFileSync(image, Buffer.from('image'));
  fs.writeFileSync(path.join(nested, '说明.txt'), Buffer.from('text'));
  fs.writeFileSync(path.join(hidden, '缓存.png'), Buffer.from('hidden'));

  assert.equal(resolveObsidianImage(testRoot, '人物资产/女主正脸.png'), fs.realpathSync(image));
  assert.equal(resolveObsidianImage(testRoot, '人物资产\\女主正脸.png'), fs.realpathSync(image));
  assert.equal(resolveObsidianImage(testRoot, '../逃逸.png'), null);
  assert.equal(resolveObsidianImage(testRoot, image), null);
  assert.equal(resolveObsidianImage(testRoot, '.obsidian/缓存.png'), null);
  assert.equal(resolveObsidianImage(testRoot, '人物资产/说明.txt'), null);
  assert.equal(resolveObsidianImage(testRoot, '人物资产/不存在.png'), null);
  assert.equal(resolveObsidianImage('', '人物资产/女主正脸.png'), null);

  console.log('OBSIDIAN_ASSETS PASS: valid image, traversal, absolute, hidden, type and missing-file checks');
} finally {
  const resolved = path.resolve(testRoot);
  assert.ok(resolved.startsWith(`${artifactRoot}${path.sep}`), '拒绝清理测试目录以外的路径');
  fs.rmSync(resolved, { recursive: true, force: true });
}
