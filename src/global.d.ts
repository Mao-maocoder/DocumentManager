import type { FileManagerApi } from "./shared/types";

declare global {
  interface Window {
    fileManager: FileManagerApi;
  }
}

export {};
