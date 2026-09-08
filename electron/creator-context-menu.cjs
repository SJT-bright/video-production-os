'use strict';

function invoke(action, onError) {
  try {
    return action();
  } catch (error) {
    if (typeof onError === 'function') onError(error);
    return undefined;
  }
}

function isAlive(contents) {
  return contents && (typeof contents.isDestroyed !== 'function' || !contents.isDestroyed());
}

function historyFor(contents) {
  const history = contents?.navigationHistory;
  return {
    canGoBack: () => (typeof history?.canGoBack === 'function'
      ? history.canGoBack()
      : Boolean(contents?.canGoBack?.())),
    canGoForward: () => (typeof history?.canGoForward === 'function'
      ? history.canGoForward()
      : Boolean(contents?.canGoForward?.())),
    goBack: () => (typeof history?.goBack === 'function' ? history.goBack() : contents?.goBack?.()),
    goForward: () => (typeof history?.goForward === 'function' ? history.goForward() : contents?.goForward?.()),
  };
}

function cleanSeparators(items) {
  const result = [];
  for (const item of items) {
    if (!item) continue;
    if (item.type === 'separator' && (!result.length || result.at(-1)?.type === 'separator')) continue;
    result.push(item);
  }
  while (result.at(-1)?.type === 'separator') result.pop();
  return result;
}

function buildCreatorContextMenuTemplate({ contents, params = {}, clipboard, onError } = {}) {
  if (!isAlive(contents)) return [];
  const items = [];
  const mediaType = String(params.mediaType || 'none');
  const hasImage = mediaType === 'image' || params.hasImageContents === true;
  const srcURL = String(params.srcURL || '').trim();
  const linkURL = String(params.linkURL || '').trim();
  const selectionText = String(params.selectionText || '');
  const editFlags = params.editFlags || {};
  const x = Number.isFinite(params.x) ? params.x : 0;
  const y = Number.isFinite(params.y) ? params.y : 0;

  if (hasImage) {
    items.push({
      id: 'copy-image',
      label: '复制图片',
      enabled: params.hasImageContents !== false,
      click: () => invoke(() => contents.copyImageAt(x, y), onError),
    });
    if (srcURL) {
      items.push({
        id: 'copy-image-address',
        label: '复制图片地址',
        click: () => invoke(() => clipboard.writeText(srcURL), onError),
      });
    }
  }

  if (mediaType === 'video' && typeof contents.copyVideoFrameAt === 'function') {
    items.push({
      id: 'copy-video-frame',
      label: '复制当前画面',
      click: () => invoke(() => contents.copyVideoFrameAt(x, y), onError),
    });
  }

  if (linkURL) {
    if (items.length) items.push({ type: 'separator' });
    items.push({
      id: 'copy-link-address',
      label: '复制链接地址',
      click: () => invoke(() => clipboard.writeText(linkURL), onError),
    });
  }

  if (params.isEditable) {
    if (items.length) items.push({ type: 'separator' });
    items.push(
      { id: 'undo', label: '撤销', enabled: editFlags.canUndo !== false, click: () => invoke(() => contents.undo(), onError) },
      { id: 'redo', label: '重做', enabled: editFlags.canRedo !== false, click: () => invoke(() => contents.redo(), onError) },
      { type: 'separator' },
      { id: 'cut', label: '剪切', enabled: editFlags.canCut !== false, click: () => invoke(() => contents.cut(), onError) },
      { id: 'copy', label: '复制', enabled: editFlags.canCopy !== false, click: () => invoke(() => contents.copy(), onError) },
      { id: 'paste', label: '粘贴', enabled: editFlags.canPaste !== false, click: () => invoke(() => contents.paste(), onError) },
      { id: 'select-all', label: '全选', enabled: editFlags.canSelectAll !== false, click: () => invoke(() => contents.selectAll(), onError) },
    );
  } else if (selectionText) {
    if (items.length) items.push({ type: 'separator' });
    items.push({
      id: 'copy-selection',
      label: '复制所选文字',
      enabled: editFlags.canCopy !== false,
      click: () => invoke(() => contents.copy(), onError),
    });
  }

  if (items.length) items.push({ type: 'separator' });
  const history = historyFor(contents);
  items.push(
    { id: 'go-back', label: '后退', enabled: history.canGoBack(), click: () => invoke(history.goBack, onError) },
    { id: 'go-forward', label: '前进', enabled: history.canGoForward(), click: () => invoke(history.goForward, onError) },
    { id: 'reload', label: '重新载入', click: () => invoke(() => contents.reload(), onError) },
  );

  return cleanSeparators(items);
}

module.exports = { buildCreatorContextMenuTemplate };
