export const UNCATEGORIZED_SCENE_ID = "uncategorized";

export interface ManagedScene {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface ManagedFile {
  id: string;
  name: string;
  path: string;
  sceneId: string;
  tags: string[];
  note: string;
  addedAt: string;
  lastOpenedAt: string | null;
  openCount: number;
  missing: boolean;
}

export interface FileManagerData {
  scenes: ManagedScene[];
  files: ManagedFile[];
}

export interface OperationResult {
  ok: boolean;
  message?: string;
}

export type FilePreviewKind = "image" | "video" | "audio" | "pdf" | "unsupported";

export interface FilePreview {
  ok: boolean;
  kind: FilePreviewKind;
  url?: string;
  message?: string;
}

export interface FileManagerApi {
  listData(): Promise<FileManagerData>;
  addFiles(sceneId: string): Promise<FileManagerData>;
  createScene(name: string, color: string): Promise<FileManagerData>;
  updateScene(scene: ManagedScene): Promise<FileManagerData>;
  deleteScene(sceneId: string): Promise<FileManagerData>;
  updateFile(file: ManagedFile): Promise<FileManagerData>;
  removeFileEntry(fileId: string): Promise<FileManagerData>;
  openFile(fileId: string): Promise<OperationResult>;
  showInFolder(fileId: string): Promise<OperationResult>;
  getPreview(fileId: string): Promise<FilePreview>;
  onUpdateAvailable(callback: (version: string) => void): () => void;
  onUpdateDownloaded(callback: () => void): () => void;
  onUpdateError(callback: (message: string) => void): () => void;
  installUpdate(): void;
}
