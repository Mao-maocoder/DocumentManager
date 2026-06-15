import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { FileManagerApi, ManagedFile, ManagedScene } from "../src/shared/types";

function onIpcMessage<T extends unknown[]>(
  channel: string,
  callback: (...args: T) => void
): () => void {
  const listener = (_event: IpcRendererEvent, ...args: T) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: FileManagerApi = {
  listData: () => ipcRenderer.invoke("file-manager:list-data"),
  addFiles: (sceneId: string) => ipcRenderer.invoke("file-manager:add-files", sceneId),
  createScene: (name: string, color: string) =>
    ipcRenderer.invoke("file-manager:create-scene", { name, color }),
  updateScene: (scene: ManagedScene) => ipcRenderer.invoke("file-manager:update-scene", scene),
  deleteScene: (sceneId: string) => ipcRenderer.invoke("file-manager:delete-scene", sceneId),
  updateFile: (file: ManagedFile) => ipcRenderer.invoke("file-manager:update-file", file),
  removeFileEntry: (fileId: string) => ipcRenderer.invoke("file-manager:remove-file-entry", fileId),
  openFile: (fileId: string) => ipcRenderer.invoke("file-manager:open-file", fileId),
  showInFolder: (fileId: string) => ipcRenderer.invoke("file-manager:show-in-folder", fileId),
  getPreview: (fileId: string) => ipcRenderer.invoke("file-manager:get-preview", fileId),
  getAppVersion: () => ipcRenderer.invoke("file-manager:get-app-version"),
  checkForUpdates: () => ipcRenderer.invoke("file-manager:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("file-manager:download-update"),
  getThemeSettings: () => ipcRenderer.invoke("file-manager:get-theme-settings"),
  updateThemeSettings: (settings) => ipcRenderer.invoke("file-manager:update-theme-settings", settings),
  chooseThemeBackground: () => ipcRenderer.invoke("file-manager:choose-theme-background"),
  clearThemeBackground: () => ipcRenderer.invoke("file-manager:clear-theme-background"),
  onUpdateAvailable: (callback) =>
    onIpcMessage("update-available", callback),
  onUpdateNotAvailable: (callback: (version: string) => void) =>
    onIpcMessage<[string]>("update-not-available", callback),
  onUpdateDownloadProgress: (callback) =>
    onIpcMessage("update-download-progress", callback),
  onUpdateDownloaded: (callback: () => void) =>
    onIpcMessage<[]>("update-downloaded", callback),
  onUpdateError: (callback: (message: string) => void) =>
    onIpcMessage<[string]>("update-error", callback),
  installUpdate: () => ipcRenderer.send("file-manager:install-update")
};

contextBridge.exposeInMainWorld("fileManager", api);
