'use strict';

const assert = require('assert/strict');
const { buildCreatorContextMenuTemplate } = require('./electron/creator-context-menu.cjs');

function fakeContents() {
  const calls = [];
  return {
    calls,
    isDestroyed: () => false,
    navigationHistory: {
      canGoBack: () => true,
      canGoForward: () => false,
      goBack: () => calls.push(['back']),
      goForward: () => calls.push(['forward']),
    },
    copyImageAt: (x, y) => calls.push(['copy-image', x, y]),
    copyVideoFrameAt: (x, y) => calls.push(['copy-video-frame', x, y]),
    undo: () => calls.push(['undo']),
    redo: () => calls.push(['redo']),
    cut: () => calls.push(['cut']),
    copy: () => calls.push(['copy']),
    paste: () => calls.push(['paste']),
    selectAll: () => calls.push(['select-all']),
    reload: () => calls.push(['reload']),
  };
}

const contents = fakeContents();
const clipboardWrites = [];
const clipboard = { writeText: value => clipboardWrites.push(value) };
const imageMenu = buildCreatorContextMenuTemplate({
  contents,
  clipboard,
  params: {
    x: 321,
    y: 654,
    mediaType: 'image',
    hasImageContents: true,
    srcURL: 'https://images.example/asset.png',
    linkURL: '',
    selectionText: '',
    isEditable: false,
    editFlags: {},
  },
});

const imageIds = imageMenu.filter(item => item.id).map(item => item.id);
assert.deepEqual(imageIds, ['copy-image', 'copy-image-address', 'go-back', 'go-forward', 'reload']);
imageMenu.find(item => item.id === 'copy-image').click();
imageMenu.find(item => item.id === 'copy-image-address').click();
imageMenu.find(item => item.id === 'go-back').click();
imageMenu.find(item => item.id === 'reload').click();
assert.deepEqual(contents.calls, [
  ['copy-image', 321, 654],
  ['back'],
  ['reload'],
]);
assert.deepEqual(clipboardWrites, ['https://images.example/asset.png']);
assert.equal(imageMenu.find(item => item.id === 'go-forward').enabled, false);

const editable = buildCreatorContextMenuTemplate({
  contents,
  clipboard,
  params: {
    mediaType: 'none',
    isEditable: true,
    editFlags: { canUndo: false, canRedo: true, canCut: false, canCopy: true, canPaste: true, canSelectAll: true },
  },
});
assert.equal(editable.find(item => item.id === 'undo').enabled, false);
assert.equal(editable.find(item => item.id === 'copy').enabled, true);
editable.find(item => item.id === 'copy').click();
assert.deepEqual(contents.calls.at(-1), ['copy']);

const video = buildCreatorContextMenuTemplate({
  contents,
  clipboard,
  params: { x: 8, y: 9, mediaType: 'video', isEditable: false, editFlags: {} },
});
video.find(item => item.id === 'copy-video-frame').click();
assert.deepEqual(contents.calls.at(-1), ['copy-video-frame', 8, 9]);

assert.deepEqual(buildCreatorContextMenuTemplate({
  contents: { isDestroyed: () => true },
  clipboard,
  params: { mediaType: 'image', hasImageContents: true },
}), []);

console.log('CREATOR_CONTEXT_MENU PASS: native image, video, edit and navigation actions');
