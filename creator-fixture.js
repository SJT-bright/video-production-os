'use strict';

window.fixtureDroppedFiles = [];
const dropZone = document.getElementById('testAssetDropZone');
dropZone.addEventListener('dragover', event => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener('drop', async event => {
  event.preventDefault();
  for (const file of event.dataTransfer.files) {
    const bytes = await file.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    window.fixtureDroppedFiles.push({ name: file.name, size: file.size, type: file.type, hash });
  }
  document.getElementById('testAssetDropResult').textContent = '已收到文件：' + window.fixtureDroppedFiles.map(file => `${file.name}（${file.size} 字节）`).join('、');
});
