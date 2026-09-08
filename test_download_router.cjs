'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  classifyDownload,
  sanitizeFilename,
  dateFolder,
  uniquePath,
  resolveDownloadTarget,
} = require('./electron/download-router.cjs');

const fixedNow = new Date('2026-08-22T03:04:05.000Z');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-os-download-router-'));
const projectRoot = path.join(fixtureRoot, 'project');
const obsidianVault = path.join(fixtureRoot, 'obsidian-vault');
const projectDirectories = {
  image: path.join(projectRoot, '创作资产库', '校园心动', '生成图片'),
  video: path.join(projectRoot, '素材库', '校园心动', '生成视频'),
  audio: path.join(projectRoot, '素材库', '校园心动', '音频'),
};

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function assertScoped(target, base, label) {
  assert.equal(isWithin(base, target.directory), true, `${label}目录越出剧本项目`);
  assert.equal(isWithin(base, target.targetPath), true, `${label}文件越出剧本项目`);
  assert.equal(isWithin(fixtureRoot, target.targetPath), true, `${label}文件越出测试临时根`);
}

try {

assert.equal(classifyDownload({ filename: 'shot.MP4' }), 'video');
assert.equal(classifyDownload({ filename: 'voice.bin', mimeType: 'audio/wav' }), 'audio');
assert.equal(classifyDownload({ filename: 'frame.webp' }), 'image');
assert.equal(classifyDownload({ filename: 'unknown.bin', mode: 'image' }), 'image-other');
assert.equal(classifyDownload({ filename: 'unknown.bin', mode: 'video', serviceId: 'updream' }), 'video-other');

assert.equal(sanitizeFilename('../bad:<shot>?.mp4', fixedNow), 'bad__shot__.mp4');
assert.equal(sanitizeFilename('..\\bad:<shot>?.mp4', fixedNow), 'bad__shot__.mp4',
  '来自 Windows 的下载建议也必须先剥离路径再生成本机文件名');
assert.equal(sanitizeFilename('CON.png', fixedNow), '_CON.png');
assert.match(sanitizeFilename('', fixedNow), /^download-\d{14}$/);
const longName = `${'x'.repeat(210)}.png`;
const safeLongName = sanitizeFilename(longName, fixedNow);
assert.equal(safeLongName.length, 180);
assert.ok(safeLongName.endsWith('.png'), '长文件名必须保留扩展名');
const chineseLongName = sanitizeFilename(`${'镜'.repeat(100)}.mp4`, fixedNow);
assert.ok(Buffer.byteLength(chineseLongName, 'utf8') <= 240, '中文下载名必须低于跨平台文件名字节预算');
assert.ok(chineseLongName.endsWith('.mp4'), '中文长文件名必须保留扩展名');
const emojiLongName = sanitizeFilename(`${'🎬'.repeat(100)}.webm`, fixedNow);
assert.ok(Buffer.byteLength(emojiLongName, 'utf8') <= 240, 'emoji 下载名必须低于跨平台文件名字节预算');
assert.ok(emojiLongName.endsWith('.webm'), 'emoji 长文件名必须保留扩展名');
assert.equal(dateFolder(new Date(2026, 7, 22)), '2026-08-22');

const nativeShotPath = path.join(fixtureRoot, 'shot.mp4');
assert.equal(uniquePath(nativeShotPath, () => false), nativeShotPath);
const collision = uniquePath(nativeShotPath, candidate => !candidate.includes(' (3)'));
assert.equal(path.basename(collision), 'shot (3).mp4');
assert.equal(path.win32.basename('C:\\test-root\\shot (3).mp4'), 'shot (3).mp4',
  'Windows 路径语义必须由 path.win32 明确测试，而不是依赖当前主机');

const scopedImageTarget = resolveDownloadTarget({
  projectRoot,
  obsidianVault: '',
  serviceId: 'midjourney',
  serviceLabel: 'Midjourney',
  mode: 'image',
  filename: '../character.png',
  mimeType: 'image/png',
  projectDirectories,
  now: new Date(2026, 7, 22),
  exists: () => false,
});
assert.equal(scopedImageTarget.kind, 'image');
assert.equal(scopedImageTarget.isImage, true);
assert.equal(scopedImageTarget.projectScoped, true);
assert.equal(scopedImageTarget.directory, path.join(projectDirectories.image, 'Midjourney', '2026-08-22'));
assert.equal(path.basename(scopedImageTarget.targetPath), 'character.png');
assertScoped(scopedImageTarget, projectDirectories.image, '图片下载');

const scopedVideoTarget = resolveDownloadTarget({
  projectRoot,
  obsidianVault: '',
  serviceId: 'updream',
  serviceLabel: 'Updream',
  mode: 'video',
  filename: 'scene.mp4',
  mimeType: 'video/mp4',
  projectDirectories,
  now: new Date(2026, 7, 22),
  exists: () => false,
});
assert.equal(scopedVideoTarget.kind, 'video');
assert.equal(scopedVideoTarget.isImage, false);
assert.equal(scopedVideoTarget.projectScoped, true);
assert.equal(scopedVideoTarget.directory, path.join(projectDirectories.video, 'Updream', '2026-08-22'));
assertScoped(scopedVideoTarget, projectDirectories.video, '视频下载');

const scopedAudioTarget = resolveDownloadTarget({
  projectRoot,
  obsidianVault: '',
  serviceId: 'updream',
  serviceLabel: 'Updream',
  mode: 'video',
  filename: '人物对白.wav',
  mimeType: 'audio/wav',
  projectDirectories,
  now: new Date(2026, 7, 22),
  exists: () => false,
});
assert.equal(scopedAudioTarget.kind, 'audio');
assert.equal(scopedAudioTarget.isImage, false);
assert.equal(scopedAudioTarget.projectScoped, true);
assert.equal(scopedAudioTarget.directory, path.join(projectDirectories.audio, 'Updream', '2026-08-22'));
assertScoped(scopedAudioTarget, projectDirectories.audio, '音频下载');

const legacyImageTarget = resolveDownloadTarget({
  projectRoot,
  obsidianVault,
  serviceId: 'midjourney',
  serviceLabel: 'Midjourney',
  mode: 'image',
  filename: 'legacy-character.png',
  mimeType: 'image/png',
  now: new Date(2026, 7, 22),
  exists: () => false,
});
assert.equal(legacyImageTarget.projectScoped, false);
assert.equal(legacyImageTarget.directory, path.join(obsidianVault, 'ai创作短剧', '韩剧制作', '浏览器生成', 'Midjourney', '2026-08-22'));

for (const legacy of [
  { filename: 'legacy-scene.mp4', mimeType: 'video/mp4', kind: 'video' },
  { filename: 'legacy-dialogue.wav', mimeType: 'audio/wav', kind: 'audio' },
]) {
  const target = resolveDownloadTarget({
    projectRoot,
    obsidianVault: '',
    serviceId: 'updream',
    serviceLabel: 'Updream',
    mode: 'video',
    filename: legacy.filename,
    mimeType: legacy.mimeType,
    now: new Date(2026, 7, 22),
    exists: () => false,
  });
  assert.equal(target.kind, legacy.kind);
  assert.equal(target.projectScoped, false);
  assert.equal(target.directory, path.join(projectRoot, '素材库', '浏览器生成', 'Updream', '2026-08-22'));
  assert.equal(isWithin(fixtureRoot, target.targetPath), true, '旧调用目标越出测试临时根');
}

assert.throws(() => resolveDownloadTarget({
  projectRoot,
  obsidianVault: '',
  serviceId: 'gpt',
  serviceLabel: 'GPT',
  mode: 'image',
  filename: 'frame.png',
}), /图片归档目录/);

console.log('DOWNLOAD_ROUTER PASS: classification, sanitization, project-scoped image/video/audio routing and legacy archive compatibility');
} finally {
  const relative = path.relative(os.tmpdir(), fixtureRoot);
  assert.ok(relative.startsWith('video-os-download-router-') && !relative.includes(`..${path.sep}`), '拒绝清理非测试临时目录');
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
