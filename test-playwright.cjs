'use strict';

const fs = require('fs');
const { chromium } = require('playwright');

function installedBrowserCandidates() {
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }
  return [];
}

function browserLaunchOptions() {
  const executablePath = String(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '').trim();
  if (executablePath && !fs.existsSync(executablePath)) {
    throw new Error(`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH 指向的 Chromium 不存在：${executablePath}`);
  }
  if (executablePath) return { executablePath };
  if (fs.existsSync(chromium.executablePath())) return {};
  const installedBrowser = installedBrowserCandidates().find(candidate => fs.existsSync(candidate));
  return installedBrowser ? { executablePath: installedBrowser } : {};
}

function launchChromium(options = {}) {
  return chromium.launch({ headless: true, ...browserLaunchOptions(), ...options });
}

module.exports = { launchChromium };
