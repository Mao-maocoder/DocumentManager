import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import type { FileManagerData, FilePreview, FilePreviewKind, ManagedFile, ManagedScene, OperationResult } from "../src/shared/types";
import { UNCATEGORIZED_SCENE_ID } from "../src/shared/types";

const DEFAULT_SCENES: ManagedScene[] = [
  { id: UNCATEGORIZED_SCENE_ID, name: "未分类", color: "#64748b", sortOrder: 0 },
  { id: "scene-work", name: "工作", color: "#2563eb", sortOrder: 1 },
  { id: "scene-study", name: "学习", color: "#16a34a", sortOrder: 2 },
  { id: "scene-documents", name: "证件", color: "#dc2626", sortOrder: 3 },
  { id: "scene-assets", name: "素材", color: "#9333ea", sortOrder: 4 }
];

let mainWindow: BrowserWindow | null = null;
const APP_ICON_PATH = path.join(__dirname, "../../assets/icons/app-icon.png");

function getDataFilePath(): string {
  const dataDir = path.join(app.getPath("userData"), "file-entry-manager");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "data.json");
}

function sanitizeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().slice(0, 300);
}

function sanitizeColor(value: unknown, fallback = "#64748b"): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return fallback;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 40))
    )
  ).slice(0, 12);
}

function createDefaultData(): FileManagerData {
  return {
    scenes: DEFAULT_SCENES,
    files: []
  };
}

function normalizeData(raw: unknown): FileManagerData {
  if (!raw || typeof raw !== "object") {
    return createDefaultData();
  }

  const source = raw as Partial<FileManagerData>;
  const sceneMap = new Map<string, ManagedScene>();

  for (const scene of DEFAULT_SCENES) {
    sceneMap.set(scene.id, scene);
  }

  if (Array.isArray(source.scenes)) {
    for (const scene of source.scenes) {
      if (!scene || typeof scene !== "object") {
        continue;
      }
      const candidate = scene as Partial<ManagedScene>;
      const id = sanitizeText(candidate.id);
      const name = sanitizeText(candidate.name);
      if (!id || !name) {
        continue;
      }
      sceneMap.set(id, {
        id,
        name,
        color: sanitizeColor(candidate.color),
        sortOrder: Number.isFinite(candidate.sortOrder) ? Number(candidate.sortOrder) : sceneMap.size
      });
    }
  }

  const scenes = Array.from(sceneMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const files: ManagedFile[] = [];

  if (Array.isArray(source.files)) {
    for (const file of source.files) {
      if (!file || typeof file !== "object") {
        continue;
      }
      const candidate = file as Partial<ManagedFile>;
      const id = sanitizeText(candidate.id);
      const filePath = typeof candidate.path === "string" ? candidate.path : "";
      if (!id || !filePath) {
        continue;
      }

      files.push({
        id,
        name: sanitizeText(candidate.name, path.basename(filePath)),
        path: filePath,
        sceneId:
          typeof candidate.sceneId === "string" && sceneIds.has(candidate.sceneId)
            ? candidate.sceneId
            : UNCATEGORIZED_SCENE_ID,
        tags: cleanTags(candidate.tags),
        note: sanitizeText(candidate.note),
        addedAt: typeof candidate.addedAt === "string" ? candidate.addedAt : new Date().toISOString(),
        lastOpenedAt: typeof candidate.lastOpenedAt === "string" ? candidate.lastOpenedAt : null,
        openCount: Number.isFinite(candidate.openCount) ? Math.max(0, Number(candidate.openCount)) : 0,
        missing: !fs.existsSync(filePath)
      });
    }
  }

  return { scenes, files };
}

function loadData(): FileManagerData {
  const filePath = getDataFilePath();
  if (!fs.existsSync(filePath)) {
    const data = createDefaultData();
    saveData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const data = normalizeData(parsed);
    saveData(data);
    return data;
  } catch {
    const data = createDefaultData();
    saveData(data);
    return data;
  }
}

function saveData(data: FileManagerData): void {
  const filePath = getDataFilePath();
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function refreshMissingFlags(data: FileManagerData): FileManagerData {
  let changed = false;
  const files = data.files.map((file) => {
    const missing = !fs.existsSync(file.path);
    if (missing !== file.missing) {
      changed = true;
      return { ...file, missing };
    }
    return file;
  });

  const next = { ...data, files };
  if (changed) {
    saveData(next);
  }
  return next;
}

function findFile(data: FileManagerData, fileId: unknown): ManagedFile | null {
  if (typeof fileId !== "string") {
    return null;
  }
  return data.files.find((file) => file.id === fileId) ?? null;
}

function getExtension(filePath: string): string {
  return path.extname(filePath).replace(".", "").toLocaleLowerCase();
}

function getPreviewKind(filePath: string): FilePreviewKind {
  const extension = getExtension(filePath);

  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "mpeg", "mpg", "3gp"].includes(extension)) {
    return "video";
  }
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma", "aiff", "ape"].includes(extension)) {
    return "audio";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  return "unsupported";
}

function sceneExists(data: FileManagerData, sceneId: unknown): sceneId is string {
  return typeof sceneId === "string" && data.scenes.some((scene) => scene.id === sceneId);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    title: "文件助手",
    icon: APP_ICON_PATH,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  mainWindow.once("ready-to-show", () => {
    checkForUpdates();
  });
}

function checkForUpdates(): void {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.checkForUpdates().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "检查更新失败。";
    mainWindow?.webContents.send("update-error", message);
  });
}

autoUpdater.autoDownload = true;
autoUpdater.on("update-available", (info) => {
  mainWindow?.webContents.send("update-available", info.version);
});
autoUpdater.on("update-downloaded", () => {
  mainWindow?.webContents.send("update-downloaded");
});
autoUpdater.on("error", (error) => {
  mainWindow?.webContents.send("update-error", error.message);
});

ipcMain.handle("file-manager:list-data", () => refreshMissingFlags(loadData()));

ipcMain.handle("file-manager:add-files", async (_event, sceneId: unknown) => {
  const data = loadData();
  const targetSceneId = sceneExists(data, sceneId) ? sceneId : UNCATEGORIZED_SCENE_ID;
  const openDialogOptions = {
    title: "选择要加入管理的文件",
    properties: ["openFile", "multiSelections"] as Array<"openFile" | "multiSelections">
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openDialogOptions)
    : await dialog.showOpenDialog(openDialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return refreshMissingFlags(data);
  }

  const knownPaths = new Set(data.files.map((file) => file.path.toLocaleLowerCase()));
  const now = new Date().toISOString();
  const newFiles = result.filePaths
    .filter((filePath) => !knownPaths.has(filePath.toLocaleLowerCase()))
    .map((filePath): ManagedFile => ({
      id: crypto.randomUUID(),
      name: path.basename(filePath),
      path: filePath,
      sceneId: targetSceneId,
      tags: [],
      note: "",
      addedAt: now,
      lastOpenedAt: null,
      openCount: 0,
      missing: !fs.existsSync(filePath)
    }));

  const next = { ...data, files: [...newFiles, ...data.files] };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:create-scene", (_event, payload: unknown) => {
  const data = loadData();
  const input = payload as { name?: unknown; color?: unknown };
  const name = sanitizeText(input?.name);
  if (!name) {
    return refreshMissingFlags(data);
  }

  const scene: ManagedScene = {
    id: crypto.randomUUID(),
    name,
    color: sanitizeColor(input.color),
    sortOrder: data.scenes.length
  };
  const next = { ...data, scenes: [...data.scenes, scene] };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:update-scene", (_event, payload: unknown) => {
  const data = loadData();
  const input = payload as Partial<ManagedScene>;
  const id = sanitizeText(input?.id);
  if (!id || id === UNCATEGORIZED_SCENE_ID) {
    return refreshMissingFlags(data);
  }

  const scenes = data.scenes.map((scene) =>
    scene.id === id
      ? {
          ...scene,
          name: sanitizeText(input.name, scene.name),
          color: sanitizeColor(input.color, scene.color),
          sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : scene.sortOrder
        }
      : scene
  );
  const next = { ...data, scenes };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:delete-scene", (_event, sceneId: unknown) => {
  const data = loadData();
  if (typeof sceneId !== "string" || sceneId === UNCATEGORIZED_SCENE_ID) {
    return refreshMissingFlags(data);
  }

  const scenes = data.scenes.filter((scene) => scene.id !== sceneId);
  const files = data.files.map((file) =>
    file.sceneId === sceneId ? { ...file, sceneId: UNCATEGORIZED_SCENE_ID } : file
  );
  const next = { scenes, files };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:update-file", (_event, payload: unknown) => {
  const data = loadData();
  const input = payload as Partial<ManagedFile>;
  const id = sanitizeText(input?.id);
  const existing = data.files.find((file) => file.id === id);
  if (!existing) {
    return refreshMissingFlags(data);
  }

  const files = data.files.map((file) =>
    file.id === id
      ? {
          ...file,
          name: sanitizeText(input.name, file.name),
          sceneId: sceneExists(data, input.sceneId) ? input.sceneId : file.sceneId,
          tags: cleanTags(input.tags),
          note: sanitizeText(input.note),
          missing: !fs.existsSync(file.path)
        }
      : file
  );
  const next = { ...data, files };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:remove-file-entry", (_event, fileId: unknown) => {
  const data = loadData();
  if (typeof fileId !== "string") {
    return refreshMissingFlags(data);
  }

  const next = { ...data, files: data.files.filter((file) => file.id !== fileId) };
  saveData(next);
  return refreshMissingFlags(next);
});

ipcMain.handle("file-manager:open-file", async (_event, fileId: unknown): Promise<OperationResult> => {
  const data = loadData();
  const file = findFile(data, fileId);
  if (!file) {
    return { ok: false, message: "没有找到这条文件记录。" };
  }
  if (!fs.existsSync(file.path)) {
    const next = {
      ...data,
      files: data.files.map((item) => (item.id === file.id ? { ...item, missing: true } : item))
    };
    saveData(next);
    return { ok: false, message: "文件已经不存在或路径不可访问。" };
  }

  const error = await shell.openPath(file.path);
  if (error) {
    return { ok: false, message: error };
  }

  const now = new Date().toISOString();
  const next = {
    ...data,
    files: data.files.map((item) =>
      item.id === file.id
        ? { ...item, lastOpenedAt: now, openCount: item.openCount + 1, missing: false }
        : item
    )
  };
  saveData(next);
  return { ok: true };
});

ipcMain.handle("file-manager:show-in-folder", (_event, fileId: unknown): OperationResult => {
  const data = loadData();
  const file = findFile(data, fileId);
  if (!file) {
    return { ok: false, message: "没有找到这条文件记录。" };
  }
  if (!fs.existsSync(file.path)) {
    const next = {
      ...data,
      files: data.files.map((item) => (item.id === file.id ? { ...item, missing: true } : item))
    };
    saveData(next);
    return { ok: false, message: "文件已经不存在或路径不可访问。" };
  }

  shell.showItemInFolder(file.path);
  return { ok: true };
});

ipcMain.handle("file-manager:get-preview", (_event, fileId: unknown): FilePreview => {
  const data = loadData();
  const file = findFile(data, fileId);
  if (!file) {
    return { ok: false, kind: "unsupported", message: "没有找到这条文件记录。" };
  }
  if (!fs.existsSync(file.path)) {
    return { ok: false, kind: "unsupported", message: "文件已经不存在或路径不可访问。" };
  }

  const kind = getPreviewKind(file.path);
  if (kind === "unsupported") {
    return { ok: false, kind, message: "这个文件类型暂不支持预览。" };
  }

  return {
    ok: true,
    kind,
    url: pathToFileURL(file.path).toString()
  };
});

ipcMain.on("file-manager:install-update", () => {
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

