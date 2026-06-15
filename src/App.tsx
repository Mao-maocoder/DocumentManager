import {
  AlertTriangle,
  Archive,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  FilePlus2,
  FileText,
  FolderOpen,
  GraduationCap,
  List,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import audioIcon from "../assets/icons/file-types/audio-v4.png";
import codeIcon from "../assets/icons/file-types/code-v4.png";
import excelIcon from "../assets/icons/file-types/excel-v4.png";
import folderIcon from "../assets/icons/file-types/folder-v4.png";
import htmlIcon from "../assets/icons/file-types/html-v4.png";
import imageIcon from "../assets/icons/file-types/image-v4.png";
import pdfIcon from "../assets/icons/file-types/pdf-v4.png";
import pptIcon from "../assets/icons/file-types/ppt-v4.png";
import textIcon from "../assets/icons/file-types/text-simple.png";
import videoIcon from "../assets/icons/file-types/video-v4.png";
import wordIcon from "../assets/icons/file-types/word-v4.png";
import zipIcon from "../assets/icons/file-types/zip-v4.png";
import type {
  FileManagerData,
  FilePreview,
  ManagedFile,
  ManagedScene,
  ThemeSettings,
  UpdateDownloadProgress,
  UpdatePromptInfo
} from "./shared/types";
import { UNCATEGORIZED_SCENE_ID } from "./shared/types";

const NEW_SCENE_COLORS = ["#0a84ff", "#34c759", "#ff3b30", "#af52de", "#ff9500", "#5ac8fa"];
const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  backgroundImageUrl: null,
  backgroundStrength: 0.58,
  backgroundBlur: 6,
  panelOpacity: 0.74,
  panelBlur: 12
};

type FileTypeFilter = "all" | "word" | "excel" | "ppt" | "pdf" | "image" | "video" | "audio" | "archive" | "html" | "code" | "text" | "folder" | "other";
type StatusFilter = "all" | "ok" | "missing";
type SortMode = "recent" | "added" | "name" | "type";
type ListDensity = "comfortable" | "compact";
type UpdateDialogMode = "prompt" | "downloading" | "ready";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "从未打开";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function extensionFor(file: ManagedFile): string {
  const name = file.name || file.path;
  const part = name.split(".").pop();
  if (!part || part === name) {
    return "";
  }
  return part.toLocaleLowerCase();
}

function fileTypeText(file: ManagedFile): string {
  return getFileKind(file).label;
}

function fileTypeFilterFor(file: ManagedFile): Exclude<FileTypeFilter, "all"> {
  const extension = extensionFor(file);

  if (["doc", "docx", "rtf", "odt"].includes(extension)) {
    return "word";
  }
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) {
    return "excel";
  }
  if (["ppt", "pptx", "key", "odp"].includes(extension)) {
    return "ppt";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "mpeg", "mpg", "3gp"].includes(extension)) {
    return "video";
  }
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma", "aiff", "ape"].includes(extension)) {
    return "audio";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "archive";
  }
  if (["html", "htm"].includes(extension)) {
    return "html";
  }
  if (["js", "ts", "tsx", "jsx", "json", "css", "py", "java", "cpp", "cs", "xml", "yaml", "yml"].includes(extension)) {
    return "code";
  }
  if (["txt", "md", "log"].includes(extension)) {
    return "text";
  }
  if (!extension) {
    return "folder";
  }
  return "other";
}

function dateValue(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

function getFileKind(file: ManagedFile) {
  const extension = extensionFor(file);

  if (["doc", "docx", "rtf", "odt"].includes(extension)) {
    return { icon: wordIcon, label: "Word 文档" };
  }
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) {
    return { icon: excelIcon, label: "Excel 表格" };
  }
  if (["ppt", "pptx", "key", "odp"].includes(extension)) {
    return { icon: pptIcon, label: "演示文稿" };
  }
  if (["pdf"].includes(extension)) {
    return { icon: pdfIcon, label: "PDF 文档" };
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(extension)) {
    return { icon: imageIcon, label: "图片" };
  }
  if (["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "mpeg", "mpg", "3gp"].includes(extension)) {
    return { icon: videoIcon, label: "视频" };
  }
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma", "aiff", "ape"].includes(extension)) {
    return { icon: audioIcon, label: "音频" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return { icon: zipIcon, label: "压缩包" };
  }
  if (["html", "htm"].includes(extension)) {
    return { icon: htmlIcon, label: "HTML 文件" };
  }
  if (["js", "ts", "tsx", "jsx", "json", "css", "py", "java", "cpp", "cs", "xml", "yaml", "yml"].includes(extension)) {
    return { icon: codeIcon, label: "代码文件" };
  }
  if (["txt", "md", "log"].includes(extension)) {
    return { icon: textIcon, label: "文本" };
  }
  if (!extension) {
    return { icon: folderIcon, label: "文件夹" };
  }
  return { icon: textIcon, label: "文件" };
}

function FileTypeIcon({ file, size = "normal" }: { file: ManagedFile; size?: "normal" | "large" }) {
  const kind = getFileKind(file);
  return (
    <img
      alt={kind.label}
      className={size === "large" ? "file-type-icon large" : "file-type-icon"}
      draggable={false}
      src={kind.icon}
      title={kind.label}
    />
  );
}

function PreviewFallback({ file, message }: { file: ManagedFile; message: string }) {
  return (
    <div className="preview-fallback">
      <FileTypeIcon file={file} size="large" />
      <span>{message}</span>
    </div>
  );
}

function FilePreviewPanel({ file, preview }: { file: ManagedFile; preview: FilePreview | null }) {
  if (file.missing) {
    return (
      <section className="file-preview-panel" aria-label="文件预览">
        <PreviewFallback file={file} message="文件不存在或已移动" />
      </section>
    );
  }

  if (!preview) {
    return (
      <section className="file-preview-panel loading" aria-label="文件预览">
        <span>正在加载预览</span>
      </section>
    );
  }

  if (!preview.ok || !preview.url) {
    return (
      <section className="file-preview-panel" aria-label="文件预览">
        <PreviewFallback file={file} message={preview.message ?? "这个文件类型暂不支持预览"} />
      </section>
    );
  }

  if (preview.kind === "image") {
    return (
      <section className="file-preview-panel" aria-label="文件预览">
        <img className="file-preview-image" alt={`${file.name} 预览`} src={preview.url} />
      </section>
    );
  }

  if (preview.kind === "video") {
    return (
      <section className="file-preview-panel media" aria-label="文件预览">
        <video className="file-preview-video" controls preload="metadata" src={preview.url} />
      </section>
    );
  }

  if (preview.kind === "audio") {
    return (
      <section className="file-preview-panel audio" aria-label="文件预览">
        <FileTypeIcon file={file} size="large" />
        <audio controls preload="metadata" src={preview.url} />
      </section>
    );
  }

  if (preview.kind === "pdf") {
    return (
      <section className="file-preview-panel pdf" aria-label="文件预览">
        <iframe title={`${file.name} 预览`} src={preview.url} />
      </section>
    );
  }

  return (
    <section className="file-preview-panel" aria-label="文件预览">
      <PreviewFallback file={file} message="这个文件类型暂不支持预览" />
    </section>
  );
}

function parseTagInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function getSceneIcon(sceneId: string) {
  if (sceneId === "scene-work") {
    return BriefcaseBusiness;
  }
  if (sceneId === "scene-study") {
    return GraduationCap;
  }
  if (sceneId === "scene-documents") {
    return Archive;
  }
  if (sceneId === "scene-assets") {
    return LayoutGrid;
  }
  if (sceneId === UNCATEGORIZED_SCENE_ID) {
    return FolderOpen;
  }
  return BookOpen;
}

function useToast() {
  const [message, setMessage] = useState("");

  function show(next: string) {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 2600);
  }

  return { message, show };
}

export function App() {
  const [data, setData] = useState<FileManagerData>({ scenes: [], files: [] });
  const [selectedSceneId, setSelectedSceneId] = useState("all");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [listDensity, setListDensity] = useState<ListDensity>("comfortable");
  const [sceneDraft, setSceneDraft] = useState("");
  const [sceneEditName, setSceneEditName] = useState("");
  const [sceneColor, setSceneColor] = useState(NEW_SCENE_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdatePromptInfo | null>(null);
  const [updateDialogMode, setUpdateDialogMode] = useState<UpdateDialogMode>("prompt");
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateDownloadProgress>({ percent: 0, transferred: 0, total: 0 });
  const [updateInBackground, setUpdateInBackground] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const { message, show } = useToast();

  useEffect(() => {
    window.fileManager
      .listData()
      .then((next) => {
        setData(next);
        setSelectedFileId(next.files[0]?.id ?? null);
      })
      .catch(() => show("读取本地数据失败"))
      .finally(() => setLoading(false));
    window.fileManager
      .getAppVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(""));
    window.fileManager
      .getThemeSettings()
      .then(setThemeSettings)
      .catch(() => setThemeSettings(DEFAULT_THEME_SETTINGS));
  }, []);

  useEffect(() => {
    const removeUpdateAvailable = window.fileManager.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateDialogMode("prompt");
      setUpdateDialogVisible(true);
      setUpdateInBackground(false);
      setUpdateProgress({ percent: 0, transferred: 0, total: 0 });
      setUpdateError("");
      setUpdateChecking(false);
    });
    const removeUpdateNotAvailable = window.fileManager.onUpdateNotAvailable((version) => {
      setUpdateChecking(false);
      show(`当前已是最新版本 v${version}`);
    });
    const removeUpdateDownloaded = window.fileManager.onUpdateDownloaded(() => {
      setUpdateDialogMode("ready");
      setUpdateDialogVisible(true);
      setUpdateInBackground(false);
      setUpdateError("");
      setUpdateChecking(false);
    });
    const removeUpdateDownloadProgress = window.fileManager.onUpdateDownloadProgress((progress) => {
      setUpdateProgress(progress);
      setUpdateDialogMode("downloading");
      setUpdateChecking(false);
    });
    const removeUpdateError = window.fileManager.onUpdateError((nextMessage) => {
      setUpdateError(nextMessage);
      setUpdateDialogVisible(true);
      setUpdateInBackground(false);
      setUpdateChecking(false);
    });

    return () => {
      removeUpdateAvailable();
      removeUpdateNotAvailable();
      removeUpdateDownloaded();
      removeUpdateDownloadProgress();
      removeUpdateError();
    };
  }, []);

  const sceneById = useMemo(
    () => new Map(data.scenes.map((scene) => [scene.id, scene])),
    [data.scenes]
  );
  const selectedScene = selectedSceneId === "all" ? null : sceneById.get(selectedSceneId) ?? null;

  const fileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of data.files) {
      counts.set(file.sceneId, (counts.get(file.sceneId) ?? 0) + 1);
    }
    return counts;
  }, [data.files]);

  const filteredFiles = useMemo(() => {
    const lowerQuery = query.trim().toLocaleLowerCase();
    return data.files
      .filter((file) => {
        const matchesScene = selectedSceneId === "all" || file.sceneId === selectedSceneId;
        const matchesTag = !activeTag || file.tags.includes(activeTag);
        const matchesType = typeFilter === "all" || fileTypeFilterFor(file) === typeFilter;
        const matchesStatus = statusFilter === "all" || (statusFilter === "missing" ? file.missing : !file.missing);
        const haystack = [file.name, file.path, file.note, ...file.tags].join(" ").toLocaleLowerCase();
        const matchesQuery = !lowerQuery || haystack.includes(lowerQuery);
        return matchesScene && matchesTag && matchesType && matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (sortMode === "name") {
          return a.name.localeCompare(b.name, "zh-CN");
        }
        if (sortMode === "added") {
          return dateValue(b.addedAt) - dateValue(a.addedAt);
        }
        if (sortMode === "type") {
          return fileTypeText(a).localeCompare(fileTypeText(b), "zh-CN") || a.name.localeCompare(b.name, "zh-CN");
        }
        return dateValue(b.lastOpenedAt) - dateValue(a.lastOpenedAt);
      });
  }, [activeTag, data.files, query, selectedSceneId, sortMode, statusFilter, typeFilter]);

  const selectedFile = inspectorOpen
    ? data.files.find((file) => file.id === selectedFileId) ?? filteredFiles[0] ?? null
    : null;

  useEffect(() => {
    if (filteredFiles.length === 0) {
      setSelectedFileId(null);
      return;
    }
    if (inspectorOpen && (!selectedFileId || !filteredFiles.some((file) => file.id === selectedFileId))) {
      setSelectedFileId(filteredFiles[0].id);
    }
  }, [filteredFiles, inspectorOpen, selectedFileId]);

  useEffect(() => {
    setSceneEditName(selectedScene?.name ?? "");
  }, [selectedScene]);

  async function refreshFrom(promise: Promise<FileManagerData>, successMessage?: string) {
    setBusy(true);
    try {
      const next = await promise;
      setData(next);
      if (successMessage) {
        show(successMessage);
      }
      return next;
    } catch {
      show("操作失败，请稍后重试");
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function addFiles() {
    const sceneId = selectedSceneId === "all" ? UNCATEGORIZED_SCENE_ID : selectedSceneId;
    const beforeCount = data.files.length;
    const next = await refreshFrom(window.fileManager.addFiles(sceneId));
    if (next.files.length > beforeCount) {
      show("文件入口已添加");
    }
    setInspectorOpen(next.files.length > 0);
    setSelectedFileId(next.files[0]?.id ?? null);
  }

  async function createScene() {
    const name = sceneDraft.trim();
    if (!name) {
      show("请输入场景名称");
      return;
    }
    const next = await refreshFrom(window.fileManager.createScene(name, sceneColor), "场景已创建");
    const created = next.scenes[next.scenes.length - 1];
    setSelectedSceneId(created?.id ?? "all");
    setSceneDraft("");
    setSceneColor(NEW_SCENE_COLORS[(NEW_SCENE_COLORS.indexOf(sceneColor) + 1) % NEW_SCENE_COLORS.length]);
  }

  async function updateScene(scene: ManagedScene, partial: Partial<ManagedScene>) {
    await refreshFrom(window.fileManager.updateScene({ ...scene, ...partial }), "场景已更新");
  }

  async function updateFile(file: ManagedFile) {
    const next = await refreshFrom(window.fileManager.updateFile(file));
    setInspectorOpen(true);
    setSelectedFileId(file.id);
    return next;
  }

  async function openFile(file: ManagedFile) {
    setBusy(true);
    try {
      const result = await window.fileManager.openFile(file.id);
      if (!result.ok) {
        show(result.message ?? "无法打开文件");
      }
      const next = await window.fileManager.listData();
      setData(next);
      setInspectorOpen(true);
      setSelectedFileId(file.id);
    } finally {
      setBusy(false);
    }
  }

  async function showInFolder(file: ManagedFile) {
    const result = await window.fileManager.showInFolder(file.id);
    if (!result.ok) {
      show(result.message ?? "无法定位文件");
      const next = await window.fileManager.listData();
      setData(next);
    }
  }

  async function removeFileEntry(file: ManagedFile) {
    const confirmed = window.confirm("只会从软件中移除这个入口，不会删除电脑里的真实文件。确定移除吗？");
    if (!confirmed) {
      return;
    }
    const next = await refreshFrom(window.fileManager.removeFileEntry(file.id), "入口已移除，真实文件未删除");
    setInspectorOpen(next.files.length > 0);
    setSelectedFileId(next.files[0]?.id ?? null);
  }

  async function deleteScene(scene: ManagedScene) {
    const confirmed = window.confirm("只会删除这个场景分组，里面的文件入口会移动到“未分类”。确定删除吗？");
    if (!confirmed) {
      return;
    }
    await refreshFrom(window.fileManager.deleteScene(scene.id), "场景已删除，文件入口已移到未分类");
    setSelectedSceneId("all");
  }

  function clearFilters() {
    setQuery("");
    setActiveTag(null);
    setTypeFilter("all");
    setStatusFilter("all");
  }

  async function checkLatestVersion() {
    if (updateChecking) {
      return;
    }
    setUpdateChecking(true);
    setUpdateError("");
    show("正在检查更新");
    try {
      const result = await window.fileManager.checkForUpdates();
      if (!result.ok) {
        setUpdateChecking(false);
        show(result.message ?? "检查更新失败");
      }
    } catch {
      setUpdateChecking(false);
      show("检查更新失败");
    }
  }

  async function startUpdateDownload() {
    setUpdateDialogMode("downloading");
    setUpdateDialogVisible(true);
    setUpdateInBackground(false);
    setUpdateError("");
    const result = await window.fileManager.downloadUpdate();
    if (!result.ok) {
      setUpdateError(result.message ?? "更新下载失败");
      setUpdateDialogVisible(true);
      setUpdateInBackground(false);
    }
  }

  function sendUpdateToBackground() {
    setUpdateDialogVisible(false);
    setUpdateInBackground(true);
    show("更新正在后台下载");
  }

  async function updateTheme(partial: Partial<ThemeSettings>) {
    const next = { ...themeSettings, ...partial };
    setThemeSettings(next);
    try {
      const saved = await window.fileManager.updateThemeSettings(next);
      setThemeSettings(saved);
    } catch {
      show("主题保存失败");
    }
  }

  async function chooseThemeBackground() {
    const result = await window.fileManager.chooseThemeBackground();
    setThemeSettings(result.theme);
    if (result.message) {
      show(result.message);
    }
  }

  async function clearThemeBackground() {
    const next = await window.fileManager.clearThemeBackground();
    setThemeSettings(next);
    show("背景已移除");
  }

  const themeScrimOpacity = themeSettings.backgroundImageUrl
    ? Math.max(0.18, 0.82 - themeSettings.backgroundStrength * 0.62)
    : 0;
  const appThemeStyle = {
    "--theme-background-image": themeSettings.backgroundImageUrl ? `url("${themeSettings.backgroundImageUrl}")` : "none",
    "--theme-background-strength": String(themeSettings.backgroundStrength),
    "--theme-background-blur": `${themeSettings.backgroundBlur}px`,
    "--theme-scrim-opacity": String(themeScrimOpacity),
    "--panel-opacity": String(themeSettings.panelOpacity),
    "--panel-blur": `${themeSettings.panelBlur}px`
  } as CSSProperties;

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loader" />
        <span>正在加载文件助手</span>
      </main>
    );
  }

  return (
    <main className="app-shell" style={appThemeStyle}>
      {updateDialogVisible && (updateInfo || updateError) && (
        <div className="update-dialog-overlay" role="presentation">
          <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-dialog-title">
            <div className="update-dialog-header">
              <div>
                <p className="eyebrow">Software Update</p>
                <h2 id="update-dialog-title">
                  {updateError ? "更新检查失败" : updateDialogMode === "ready" ? "更新已准备好" : `发现新版本 v${updateInfo?.version ?? ""}`}
                </h2>
              </div>
              {updateDialogMode !== "downloading" && (
                <button className="icon-button" type="button" onClick={() => setUpdateDialogVisible(false)} title="关闭">
                  <X size={18} />
                </button>
              )}
            </div>

            {updateError ? (
              <p className="update-error-message">{updateError}</p>
            ) : updateDialogMode === "ready" ? (
              <p className="update-ready-message">新版本 v{updateInfo?.version} 已下载完成，重启后会完成安装。</p>
            ) : updateDialogMode === "downloading" ? (
              <div className="update-progress-panel">
                <div className="update-progress-head">
                  <span>正在下载 v{updateInfo?.version}</span>
                  <strong>{Math.round(updateProgress.percent)}%</strong>
                </div>
                <div className="update-progress-track">
                  <span style={{ width: `${Math.max(2, Math.min(100, updateProgress.percent))}%` }} />
                </div>
              </div>
            ) : (
              <>
                <div className="release-notes">
                  <strong>更新内容</strong>
                  <p>{updateInfo?.releaseNotes}</p>
                </div>
                <p className="update-dialog-hint">是否现在下载并安装这个更新？</p>
              </>
            )}

            <div className="update-dialog-actions">
              {updateError ? (
                <button className="secondary-button" type="button" onClick={() => setUpdateDialogVisible(false)}>
                  知道了
                </button>
              ) : updateDialogMode === "ready" ? (
                <button className="primary-action" type="button" onClick={() => window.fileManager.installUpdate()}>
                  重启安装
                </button>
              ) : updateDialogMode === "downloading" ? (
                <button className="secondary-button" type="button" onClick={sendUpdateToBackground}>
                  后台下载
                </button>
              ) : (
                <>
                  <button className="plain-action" type="button" onClick={() => setUpdateDialogVisible(false)}>
                    稍后
                  </button>
                  <button className="primary-action" type="button" onClick={startUpdateDownload}>
                    立即更新
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {updateInBackground && updateDialogMode === "downloading" && (
        <button className="background-download-button" type="button" onClick={() => setUpdateDialogVisible(true)}>
          后台下载 {Math.round(updateProgress.percent)}%
        </button>
      )}

      <aside className="sidebar">
        <div className="brand-block">
          <div>
            <p className="eyebrow">Local Library</p>
            <h1>文件助手</h1>
          </div>
          <button className="sidebar-add-button" type="button" onClick={addFiles} disabled={busy} title="添加文件">
            <Plus size={18} />
            添加
          </button>
        </div>

        <button
          className={selectedSceneId === "all" ? "scene-row active" : "scene-row"}
          type="button"
          onClick={() => setSelectedSceneId("all")}
        >
          <span className="scene-symbol all">
            <FileText size={18} />
          </span>
          <span>全部文件</span>
          <strong>{data.files.length}</strong>
        </button>

        <div className="sidebar-section-label">场景</div>
        <div className="scene-list">
          {data.scenes.map((scene) => {
            const Icon = getSceneIcon(scene.id);
            const canDelete = scene.id !== UNCATEGORIZED_SCENE_ID;
            return (
              <div className={selectedSceneId === scene.id ? "scene-row-wrap active-wrap" : "scene-row-wrap"} key={scene.id}>
                <button className="scene-row" type="button" onClick={() => setSelectedSceneId(scene.id)}>
                  <span className="scene-symbol" style={{ color: scene.color, backgroundColor: `${scene.color}18` }}>
                    <Icon size={17} />
                  </span>
                  <span>{scene.name}</span>
                  <strong>{fileCounts.get(scene.id) ?? 0}</strong>
                </button>
                {canDelete && (
                  <button className="ghost-dot" type="button" onClick={() => deleteScene(scene)} title="删除场景">
                    <MoreHorizontal size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedScene && selectedScene.id !== UNCATEGORIZED_SCENE_ID && (
          <div className="scene-edit">
            <div className="sidebar-section-label">当前场景</div>
            <input
              aria-label="修改场景名称"
              value={sceneEditName}
              onBlur={() => {
                const name = sceneEditName.trim();
                if (name && name !== selectedScene.name) {
                  updateScene(selectedScene, { name });
                }
              }}
              onChange={(event) => setSceneEditName(event.target.value)}
            />
            <div className="color-palette">
              {NEW_SCENE_COLORS.map((color) => (
                <button
                  aria-label={`修改场景颜色 ${color}`}
                  className={selectedScene.color === color ? "color-dot selected" : "color-dot"}
                  key={color}
                  style={{ backgroundColor: color }}
                  type="button"
                  onClick={() => updateScene(selectedScene, { color })}
                />
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-settings">
          <button
            className={settingsOpen ? "settings-row active" : "settings-row"}
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span className="scene-symbol settings">
              <Settings size={17} />
            </span>
            <span>设置</span>
          </button>
          {settingsOpen && (
            <div className="settings-panel">
              <button
                className={updateInfo && updateDialogMode === "prompt" ? "version-button has-update" : "version-button"}
                type="button"
                onClick={checkLatestVersion}
                disabled={updateChecking}
                title="检查更新"
              >
                <span>版本号</span>
                <span className="version-value">
                  <strong>{appVersion ? `v${appVersion}` : "未知"}</strong>
                  {updateInfo && updateDialogMode === "prompt" && <em>新版本</em>}
                </span>
              </button>
              <div className="theme-settings">
                <div className="settings-group-title">主题</div>
                <div className="theme-actions">
                  <button className="theme-action-button" type="button" onClick={chooseThemeBackground}>
                    选择背景
                  </button>
                  <button
                    className="theme-action-button"
                    type="button"
                    onClick={clearThemeBackground}
                    disabled={!themeSettings.backgroundImageUrl}
                  >
                    移除
                  </button>
                </div>
                <label className="theme-slider">
                  <span>背景强度</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={themeSettings.backgroundStrength}
                    onChange={(event) => updateTheme({ backgroundStrength: Number(event.target.value) })}
                  />
                </label>
                <label className="theme-slider">
                  <span>背景模糊</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={themeSettings.backgroundBlur}
                    onChange={(event) => updateTheme({ backgroundBlur: Number(event.target.value) })}
                  />
                </label>
                <label className="theme-slider">
                  <span>卡片透明度</span>
                  <input
                    type="range"
                    min="0"
                    max="0.96"
                    step="0.02"
                    value={themeSettings.panelOpacity}
                    onChange={(event) => updateTheme({ panelOpacity: Number(event.target.value) })}
                  />
                </label>
                <label className="theme-slider">
                  <span>卡片磨砂</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={themeSettings.panelBlur}
                    onChange={(event) => updateTheme({ panelBlur: Number(event.target.value) })}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="new-scene">
          <input
            aria-label="新场景名称"
            placeholder="新建场景"
            value={sceneDraft}
            onChange={(event) => setSceneDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                createScene();
              }
            }}
          />
          <div className="color-palette">
            {NEW_SCENE_COLORS.map((color) => (
              <button
                aria-label={`选择颜色 ${color}`}
                className={sceneColor === color ? "color-dot selected" : "color-dot"}
                key={color}
                style={{ backgroundColor: color }}
                type="button"
                onClick={() => setSceneColor(color)}
              />
            ))}
          </div>
          <button className="secondary-button" type="button" onClick={createScene} disabled={busy}>
            创建场景
          </button>
        </div>
      </aside>

      <section className="content-panel">
        <div className="content-topbar">
          <div className="search-row">
            <Search size={18} />
            <input
              placeholder="搜索文件、标签、备注"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="list-toolbar">
          <div className="filter-strip">
            <select
              aria-label="文件类型筛选"
              className="filter-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as FileTypeFilter)}
            >
              <option value="all">全部类型</option>
              <option value="word">Word 文档</option>
              <option value="excel">Excel 表格</option>
              <option value="ppt">演示文稿</option>
              <option value="pdf">PDF 文档</option>
              <option value="image">图片</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
              <option value="archive">压缩包</option>
              <option value="html">HTML 文件</option>
              <option value="code">代码文件</option>
              <option value="text">文本</option>
              <option value="folder">文件夹</option>
              <option value="other">其他文件</option>
            </select>
            <select
              aria-label="文件状态筛选"
              className="filter-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">全部状态</option>
              <option value="ok">正常</option>
              <option value="missing">失效</option>
            </select>
            <button className="filter-chip" type="button" onClick={clearFilters}>
              清除筛选
            </button>
            {activeTag && (
              <button className="filter-chip active" type="button" onClick={() => setActiveTag(null)}>
                {activeTag}
              </button>
            )}
          </div>
          <div className="view-tools">
            <select
              aria-label="列表排序"
              className="view-select"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="recent">按最近打开</option>
              <option value="added">按添加时间</option>
              <option value="name">按文件名</option>
              <option value="type">按文件类型</option>
            </select>
            <label className="view-density-control" title="列表密度">
              <List size={18} />
              <select
                aria-label="列表密度"
                value={listDensity}
                onChange={(event) => setListDensity(event.target.value as ListDensity)}
              >
                <option value="comfortable">标准列表</option>
                <option value="compact">紧凑列表</option>
              </select>
            </label>
          </div>
        </div>

        <div className="list-head" aria-hidden="true">
          <span>文件</span>
          <span>标签</span>
          <span>最近打开</span>
          <span>状态</span>
        </div>

        <div className={listDensity === "compact" ? "file-list compact" : "file-list"} aria-label="文件列表">
          {filteredFiles.length === 0 ? (
            <div className="empty-state">
              <FilePlus2 size={34} />
              <h3>还没有文件入口</h3>
              <p>点击“添加文件”，把常用文件加入这个软件。这里不会删除或移动真实文件。</p>
              <button className="add-button" type="button" onClick={addFiles}>
                <Plus size={18} />
                添加文件
              </button>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const selected = selectedFile?.id === file.id;
              const scene = sceneById.get(file.sceneId);
              return (
                <button
                  className={selected ? "file-row selected" : "file-row"}
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setInspectorOpen(true);
                    setSelectedFileId(file.id);
                  }}
                >
                  <FileTypeIcon file={file} />
                  <span className="file-meta">
                    <span className="file-title-line">
                      <strong>{file.name}</strong>
                    </span>
                    <span className="path-line">{file.path}</span>
                  </span>
                  <span className="row-tags">
                    <span className="scene-mini" style={{ color: scene?.color, backgroundColor: `${scene?.color ?? "#64748b"}16` }}>
                      {scene?.name ?? "未分类"}
                    </span>
                    {file.tags.slice(0, 2).map((tag) => (
                      <em key={tag}>#{tag}</em>
                    ))}
                  </span>
                  <span className="file-time">
                    <CalendarClock size={14} />
                    {formatDateTime(file.lastOpenedAt)}
                  </span>
                  <span className={file.missing ? "status-badge warning" : "status-badge ok"}>
                    {file.missing && <AlertTriangle size={13} />}
                    {file.missing ? "失效" : "正常"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <aside className="inspector">
        {selectedFile ? (
          <FileInspector
            file={selectedFile}
            scenes={data.scenes}
            onClose={() => {
              setInspectorOpen(false);
              setSelectedFileId(null);
            }}
            onOpen={() => openFile(selectedFile)}
            onRemove={() => removeFileEntry(selectedFile)}
            onShowFolder={() => showInFolder(selectedFile)}
            onUpdate={updateFile}
          />
        ) : (
          <div className="empty-inspector">
            <MapPin size={30} />
            <h2>文件详情</h2>
            <p>选择一个文件入口后，可以编辑标签、备注和场景。</p>
          </div>
        )}
      </aside>

      {message && <div className="toast">{message}</div>}
    </main>
  );
}

function FileInspector({
  file,
  scenes,
  onClose,
  onOpen,
  onRemove,
  onShowFolder,
  onUpdate
}: {
  file: ManagedFile;
  scenes: ManagedScene[];
  onClose(): void;
  onOpen(): void;
  onRemove(): void;
  onShowFolder(): void;
  onUpdate(file: ManagedFile): Promise<FileManagerData>;
}) {
  const [name, setName] = useState(file.name);
  const [note, setNote] = useState(file.note);
  const [tagInput, setTagInput] = useState(file.tags.join(" "));
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const currentScene = scenes.find((scene) => scene.id === file.sceneId);

  useEffect(() => {
    let active = true;
    setName(file.name);
    setNote(file.note);
    setTagInput(file.tags.join(" "));
    setPreview(null);
    window.fileManager
      .getPreview(file.id)
      .then((nextPreview) => {
        if (active) {
          setPreview(nextPreview);
        }
      })
      .catch(() => {
        if (active) {
          setPreview({
            ok: false,
            kind: "unsupported",
            message: "预览加载失败"
          });
        }
      });
    return () => {
      active = false;
    };
  }, [file]);

  function commit(partial: Partial<ManagedFile>) {
    onUpdate({ ...file, ...partial });
  }

  return (
    <div className="inspector-inner">
      <header className="inspector-titlebar">
        <h2>文件详情</h2>
        <div className="inspector-window-actions">
          <button type="button" title="关闭详情" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>

      <section className="inspector-summary">
        <FileTypeIcon file={file} size="large" />
        <div>
          <h3>{file.name}</h3>
          <p>{fileTypeText(file)}</p>
        </div>
      </section>

      <FilePreviewPanel file={file} preview={preview} />

      <section className="form-section">
        <label>
          <span>名称</span>
          <input
            value={name}
            onBlur={() => commit({ name })}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span>场景</span>
          <select value={file.sceneId} onChange={(event) => commit({ sceneId: event.target.value })}>
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="form-section">
        <label>
          <span>
            <Tag size={14} />
            标签
          </span>
          <input
            placeholder="用空格或逗号分隔"
            value={tagInput}
            onBlur={() => commit({ tags: parseTagInput(tagInput) })}
            onChange={(event) => setTagInput(event.target.value)}
          />
        </label>
        <div className="tag-preview">
          {parseTagInput(tagInput).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>

      <section className="form-section">
        <label>
          <span>备注</span>
          <textarea
            placeholder="记录用途、版本或注意事项"
            value={note}
            onBlur={() => commit({ note })}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </section>

      <section className="detail-table">
        <div>
          <span>路径</span>
          <strong>{file.path}</strong>
        </div>
        <div>
          <span>类型</span>
          <strong>{fileTypeText(file)}</strong>
        </div>
        <div>
          <span>所在场景</span>
          <strong>{currentScene?.name ?? "未分类"}</strong>
        </div>
        <div>
          <span>添加时间</span>
          <strong>{formatDateTime(file.addedAt)}</strong>
        </div>
        <div>
          <span>最近打开</span>
          <strong>{formatDateTime(file.lastOpenedAt)}</strong>
        </div>
        <div>
          <span>打开次数</span>
          <strong>{file.openCount}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>
            <span className={file.missing ? "status-badge warning" : "status-badge ok"}>
              {file.missing ? "失效" : "正常"}
            </span>
          </strong>
        </div>
      </section>

      <div className="action-stack">
        <button className="primary-action" type="button" onClick={onOpen} disabled={file.missing}>
          <FileText size={18} />
          打开文件
        </button>
        <button className="plain-action" type="button" onClick={onShowFolder} disabled={file.missing}>
          <FolderOpen size={18} />
          所在文件夹
        </button>
        <button className="danger-action" type="button" onClick={onRemove}>
          <Trash2 size={18} />
          移除入口
        </button>
      </div>

      {file.missing && (
        <div className="warning-box">
          <AlertTriangle size={17} />
          <div>
            <strong>失效</strong>
            <span>文件不存在或已移动，请检查路径。</span>
          </div>
        </div>
      )}
    </div>
  );
}
