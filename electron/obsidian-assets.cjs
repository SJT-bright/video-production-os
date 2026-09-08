'use strict';

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);

function isWithin(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function resolveObsidianImage(vaultPath, relativePath) {
  if (typeof vaultPath !== 'string' || !vaultPath) return null;
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\0')) return null;

  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length || parts.some(part => part === '..' || part.startsWith('.'))) return null;
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) return null;
  if (!IMAGE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return null;

  try {
    const realVault = fs.realpathSync(vaultPath);
    const candidate = path.resolve(realVault, normalized);
    const realCandidate = fs.realpathSync(candidate);
    if (!isWithin(realVault, realCandidate)) return null;
    if (!fs.statSync(realCandidate).isFile()) return null;
    return realCandidate;
  } catch {
    return null;
  }
}

module.exports = { IMAGE_EXTENSIONS, resolveObsidianImage };
