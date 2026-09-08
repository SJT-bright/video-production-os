'use strict';

const fs = require('fs');
const path = require('path');
const { sanitizeFilename, uniquePath } = require('./electron/download-router.cjs');

const SCHEMA_VERSION = 'video-production-os.script-breakdown.v1';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const GENERATION_STATUSES = new Set(['ready', 'needs-input', 'plan-only']);
const GENERATION_TOOLS = new Set([
  'Seedance 2.0',
  'Seedance 2.0 Fast',
  'Grok',
  'GPT Image',
  'Post-production',
]);
const SOURCE_MODES = new Set(['text', 'video+transcript', 'video']);

function breakdownError(message, statusCode = 400, code = 'INVALID_BREAKDOWN') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringField(owner, key, label, maxLength, { allowEmpty = false } = {}) {
  const value = owner && owner[key];
  if (typeof value !== 'string') throw breakdownError(`${label}必须是字符串`);
  const trimmed = value.trim();
  if (!allowEmpty && !trimmed) throw breakdownError(`${label}不能为空`);
  if (value.length > maxLength) throw breakdownError(`${label}超过长度限制`);
  return trimmed;
}

function stringArray(owner, key, label, maxItems, maxLength, { allowEmpty = true } = {}) {
  const value = owner && owner[key];
  if (!Array.isArray(value)) throw breakdownError(`${label}必须是数组`);
  if (!allowEmpty && value.length === 0) throw breakdownError(`${label}不能为空`);
  if (value.length > maxItems) throw breakdownError(`${label}条目过多`);
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) throw breakdownError(`${label}第${index + 1}项无效`);
    if (item.length > maxLength) throw breakdownError(`${label}第${index + 1}项超过长度限制`);
  });
  return value;
}

function durationField(owner, key, label) {
  const value = owner && owner[key];
  if (!Number.isInteger(value) || value < 1 || value > 900) {
    throw breakdownError(`${label}必须是 1—900 的整数秒`);
  }
  return value;
}

function validateBreakdownDocument(document) {
  if (!isPlainObject(document)) throw breakdownError('拆解文件必须是 JSON 对象');
  if (document.schemaVersion !== SCHEMA_VERSION) {
    throw breakdownError(`schemaVersion 必须是 ${SCHEMA_VERSION}`, 400, 'SCHEMA_MISMATCH');
  }

  stringField(document, 'documentId', 'documentId', 120);
  stringField(document, 'project', 'project', 200);
  stringField(document, 'title', 'title', 300);
  stringField(document, 'episode', 'episode', 80);
  const createdAt = stringField(document, 'createdAt', 'createdAt', 80);
  if (!Number.isFinite(Date.parse(createdAt))) throw breakdownError('createdAt 必须是有效 ISO 时间');

  if (!isPlainObject(document.source)) throw breakdownError('source 必须是对象');
  const sourceMode = stringField(document.source, 'mode', 'source.mode', 40);
  if (!SOURCE_MODES.has(sourceMode)) throw breakdownError('source.mode 不受支持');
  stringField(document.source, 'file', 'source.file', 600, { allowEmpty: true });
  stringField(document.source, 'note', 'source.note', 2000, { allowEmpty: true });

  if (!isPlainObject(document.summary)) throw breakdownError('summary 必须是对象');
  stringField(document.summary, 'logline', 'summary.logline', 2000);

  if (!Array.isArray(document.groups) || document.groups.length === 0 || document.groups.length > 500) {
    throw breakdownError('groups 必须包含 1—500 个分组');
  }
  const groupIds = new Set();
  document.groups.forEach((group, index) => {
    const prefix = `groups[${index}]`;
    if (!isPlainObject(group)) throw breakdownError(`${prefix} 必须是对象`);
    const id = stringField(group, 'id', `${prefix}.id`, 80);
    if (groupIds.has(id)) throw breakdownError(`分组 id 重复：${id}`);
    groupIds.add(id);
    stringField(group, 'title', `${prefix}.title`, 300);
    durationField(group, 'durationSec', `${prefix}.durationSec`);
    stringField(group, 'storyFunction', `${prefix}.storyFunction`, 3000);
    stringField(group, 'scene', `${prefix}.scene`, 1000);
    stringArray(group, 'characters', `${prefix}.characters`, 100, 160);
    stringField(group, 'description', `${prefix}.description`, 40000);
    stringField(group, 'voiceover', `${prefix}.voiceover`, 10000);
    stringField(group, 'endBeat', `${prefix}.endBeat`, 10000);
  });

  if (!Array.isArray(document.shots) || document.shots.length === 0 || document.shots.length > 2000) {
    throw breakdownError('shots 必须包含 1—2000 个镜头');
  }
  const shotIds = new Set();
  document.shots.forEach((shot, index) => {
    const prefix = `shots[${index}]`;
    if (!isPlainObject(shot)) throw breakdownError(`${prefix} 必须是对象`);
    const id = stringField(shot, 'id', `${prefix}.id`, 120);
    if (shotIds.has(id)) throw breakdownError(`镜头 id 重复：${id}`);
    shotIds.add(id);
    stringField(shot, 'shotNo', `${prefix}.shotNo`, 80);
    const groupId = stringField(shot, 'groupId', `${prefix}.groupId`, 80);
    if (!groupIds.has(groupId)) throw breakdownError(`${prefix}.groupId 没有对应分组：${groupId}`);
    stringField(shot, 'title', `${prefix}.title`, 300);
    stringField(shot, 'storyTask', `${prefix}.storyTask`, 3000);
    durationField(shot, 'durationSec', `${prefix}.durationSec`);
    stringField(shot, 'scene', `${prefix}.scene`, 1000);
    stringArray(shot, 'characters', `${prefix}.characters`, 100, 160);
    stringField(shot, 'startState', `${prefix}.startState`, 10000);
    stringField(shot, 'action', `${prefix}.action`, 20000);
    stringField(shot, 'performance', `${prefix}.performance`, 20000);
    stringField(shot, 'camera', `${prefix}.camera`, 10000);
    stringField(shot, 'endState', `${prefix}.endState`, 10000);
    stringArray(shot, 'acceptance', `${prefix}.acceptance`, 100, 2000, { allowEmpty: false });

    if (!isPlainObject(shot.generation)) throw breakdownError(`${prefix}.generation 必须是对象`);
    const generation = shot.generation;
    const tool = stringField(generation, 'tool', `${prefix}.generation.tool`, 80);
    if (!GENERATION_TOOLS.has(tool)) throw breakdownError(`${prefix}.generation.tool 不受支持`);
    const status = stringField(generation, 'status', `${prefix}.generation.status`, 40);
    if (!GENERATION_STATUSES.has(status)) throw breakdownError(`${prefix}.generation.status 不受支持`);
    stringField(generation, 'promptLanguage', `${prefix}.generation.promptLanguage`, 20);
    const prompt = stringField(generation, 'prompt', `${prefix}.generation.prompt`, 60000, { allowEmpty: true });
    const missingInputs = stringArray(generation, 'missingInputs', `${prefix}.generation.missingInputs`, 100, 2000);
    stringArray(generation, 'referenceAssets', `${prefix}.generation.referenceAssets`, 100, 2000);
    if (status === 'ready' && !prompt) {
      throw breakdownError(`${prefix} 标记为 ready 时必须包含可复制提示词`);
    }
    if (status === 'ready' && missingInputs.length) {
      throw breakdownError(`${prefix} 标记为 ready 时不能仍有 missingInputs`);
    }
    if (status === 'needs-input' && (!missingInputs.length || prompt)) {
      throw breakdownError(`${prefix} 标记为 needs-input 时必须列出缺失输入，并保持 prompt 为空`);
    }
    if (status === 'plan-only' && prompt) {
      throw breakdownError(`${prefix} 标记为 plan-only 时 prompt 必须为空`);
    }
  });

  return document;
}

function summaryFor(document, filename, stat) {
  const ready = document.shots.filter(shot => shot.generation.status === 'ready').length;
  const needsInput = document.shots.filter(shot => shot.generation.status === 'needs-input').length;
  return {
    filename,
    documentId: document.documentId,
    title: document.title,
    project: document.project,
    episode: document.episode,
    createdAt: document.createdAt,
    mtime: stat.mtime.toISOString(),
    size: stat.size,
    logline: document.summary.logline,
    groups: document.groups.length,
    shots: document.shots.length,
    ready,
    needsInput,
    durationSec: document.shots.reduce((sum, shot) => sum + shot.durationSec, 0),
  };
}

class ScriptBreakdownStore {
  constructor(options = {}) {
    if (!options.directory) throw new Error('剧本拆解目录不能为空');
    this.directory = path.resolve(options.directory);
    if (this.directory === path.parse(this.directory).root) throw new Error('拒绝把磁盘根目录作为剧本拆解目录');
    fs.mkdirSync(this.directory, { recursive: true });
  }

  requireFilename(filename) {
    if (typeof filename !== 'string' || filename !== path.basename(filename) || !/\.json$/i.test(filename)) {
      throw breakdownError('剧本拆解文件名无效', 400, 'INVALID_FILENAME');
    }
    return filename;
  }

  read(filename) {
    const safeName = this.requireFilename(filename);
    const absolutePath = path.join(this.directory, safeName);
    let stat;
    try { stat = fs.lstatSync(absolutePath); }
    catch { throw breakdownError('剧本拆解文件不存在', 404, 'NOT_FOUND'); }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_BYTES) {
      throw breakdownError('剧本拆解文件不存在或超过 2 MB', 404, 'NOT_FOUND');
    }
    let document;
    try { document = JSON.parse(fs.readFileSync(absolutePath, 'utf-8')); }
    catch { throw breakdownError('剧本拆解文件不是有效 JSON', 422, 'INVALID_JSON'); }
    validateBreakdownDocument(document);
    return { document, summary: summaryFor(document, safeName, stat) };
  }

  list() {
    fs.mkdirSync(this.directory, { recursive: true });
    let filenames = [];
    try {
      filenames = fs.readdirSync(this.directory, { withFileTypes: true })
        .filter(entry => entry.isFile() && /\.json$/i.test(entry.name))
        .map(entry => entry.name);
    } catch {}
    const items = [];
    const invalid = [];
    for (const filename of filenames) {
      try { items.push(this.read(filename).summary); }
      catch (error) { invalid.push({ filename, error: error.message, code: error.code || 'INVALID_BREAKDOWN' }); }
    }
    items.sort((a, b) => b.mtime.localeCompare(a.mtime));
    invalid.sort((a, b) => a.filename.localeCompare(b.filename, 'zh-CN'));
    return { schemaVersion: SCHEMA_VERSION, items, invalid };
  }

  import(document, suggestedFilename = '') {
    validateBreakdownDocument(document);
    const defaultName = `${document.episode}-${document.title}.json`;
    let filename = sanitizeFilename(suggestedFilename || defaultName);
    if (!/\.json$/i.test(filename)) filename += '.json';
    filename = this.requireFilename(filename);
    const absolutePath = uniquePath(path.join(this.directory, filename));
    const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf-8', flag: 'wx' });
      fs.renameSync(temporaryPath, absolutePath);
    } catch (error) {
      try { fs.unlinkSync(temporaryPath); } catch {}
      throw error;
    }
    return this.read(path.basename(absolutePath));
  }
}

module.exports = {
  SCHEMA_VERSION,
  MAX_FILE_BYTES,
  ScriptBreakdownStore,
  validateBreakdownDocument,
};
