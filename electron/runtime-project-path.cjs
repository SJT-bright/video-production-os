'use strict';

const fs = require('fs');
const path = require('path');

// A packaged macOS app lives at:
// <project>/视频制作OS/dist/<arch-dir>/<name>.app/Contents/Resources/app.
// This anchor lets the whole project move without retaining the build machine's paths.
const MAC_PROJECT_ROOT_FROM_APP = '../../../../../../..';
const PROJECT_OS_DIRECTORY = '视频制作OS';

function resolveMacProjectRootFromBundle(osDir, exists = fs.existsSync) {
  const candidate = path.resolve(osDir, MAC_PROJECT_ROOT_FROM_APP);
  const packageFile = path.join(candidate, PROJECT_OS_DIRECTORY, 'package.json');
  return exists(packageFile) ? candidate : '';
}

function macProjectDataDir(projectRoot) {
  return path.join(projectRoot, PROJECT_OS_DIRECTORY, 'data');
}

module.exports = {
  MAC_PROJECT_ROOT_FROM_APP,
  PROJECT_OS_DIRECTORY,
  resolveMacProjectRootFromBundle,
  macProjectDataDir,
};
