'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopOS', Object.freeze({
  isElectron: true,
  openCreatorBrowser: request => ipcRenderer.invoke('os:open-creator', request),
  addMediaSource: kind => ipcRenderer.invoke('os:add-media-source', kind),
  removeMediaSource: sourceId => ipcRenderer.invoke('os:remove-media-source', sourceId),
  onOpenProjectPicker: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('os:open-project-picker', listener);
    return () => ipcRenderer.removeListener('os:open-project-picker', listener);
  },
  onDownloadComplete: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('os:download-complete', listener);
    return () => ipcRenderer.removeListener('os:download-complete', listener);
  },
}));
