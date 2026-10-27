export interface Asset {
  id: string;
  name: string;
  type: "image" | "video";
  blob: Blob;
  updatedAt: number;
  source?: "bundled" | "imported";
  poster?: string;
}

// These are the user's original conference films, served entirely from this
// project. Browser imports can override either slot without changing the files.
export const bundledVideoAssets = [
  {
    id: "video-1",
    title: "大会开场 · 版本 A",
    name: "领峰者之夜-开场动画-版本A.mp4",
    src: "/assets/videos/conference-opening-a.mp4",
    poster: "/assets/videos/conference-opening-a-poster.jpg",
    duration: 5.033333,
    width: 1920,
    height: 1080,
    fps: 30,
  },
  {
    id: "video-2",
    title: "大会开场 · 版本 B",
    name: "领峰者之夜-开场动画-版本B.mp4",
    src: "/assets/videos/conference-opening-b.mp4",
    poster: "/assets/videos/conference-opening-b-poster.jpg",
    duration: 6.082993,
    width: 1280,
    height: 720,
    fps: 24,
  },
] as const;

export const assetSlots: Array<{
  id: string;
  title: string;
  type: "image" | "video";
}> = [
  { id: "poster-1", title: "一站式服务", type: "image" },
  { id: "poster-2", title: "前沿资讯", type: "image" },
  { id: "poster-3", title: "文献查询", type: "image" },
  { id: "poster-4", title: "临床研究", type: "image" },
  { id: "poster-5", title: "用药指南", type: "image" },
  { id: "video-1", title: "大会开场 · 版本 A", type: "video" },
  { id: "video-2", title: "大会开场 · 版本 B", type: "video" },
];

const bundledCache = new Map<string, Promise<Asset>>();

function loadBundledVideo(
  video: (typeof bundledVideoAssets)[number],
): Promise<Asset> {
  const cached = bundledCache.get(video.id);
  if (cached) return cached;
  const promise = fetch(video.src)
    .then(async (response): Promise<Asset> => {
      if (!response.ok) throw new Error(`${video.title}加载失败，请刷新页面。`);
      const blob = await response.blob();
      if (!blob.size || !blob.type.startsWith("video/"))
        throw new Error(`${video.title}文件不可用，请检查本地项目素材。`);
      return {
        id: video.id,
        name: video.name,
        type: "video",
        blob,
        updatedAt: 1793059200000,
        source: "bundled",
        poster: video.poster,
      };
    })
    .catch((error) => {
      bundledCache.delete(video.id);
      throw error;
    });
  bundledCache.set(video.id, promise);
  return promise;
}

const DATABASE = "lilly-creative-studio-assets";
const STORE = "assets";
export const MAX_ASSET_BYTES = 200 * 1024 * 1024;

export class AssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetValidationError";
  }
}

// Decode one image or video frame before committing the file. A matching suffix
// or MIME type alone does not prove that a supplied file can be presented.
function validateMedia(blob: Blob, type: Asset["type"]): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(blob);
    const element =
      type === "image" ? new Image() : document.createElement("video");
    let finished = false;
    const finish = (message?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      element.onload = null;
      element.onerror = null;
      if (element instanceof HTMLVideoElement) {
        element.onloadeddata = null;
        element.pause();
        element.removeAttribute("src");
        element.load();
      } else {
        element.removeAttribute("src");
      }
      URL.revokeObjectURL(source);
      if (message) reject(new AssetValidationError(message));
      else resolve();
    };
    const timeout = window.setTimeout(
      () =>
        finish(
          type === "image"
            ? "图片解码超时，请检查文件或另存为 PNG / JPG 后重试。"
            : "视频解码超时，请转换为 H.264 MP4 或 WebM 后重试。",
        ),
      12000,
    );
    element.onerror = () =>
      finish(
        type === "image"
          ? "图片无法解码，文件可能已损坏，请重新导出后再导入。"
          : "当前浏览器无法解码此视频，请转换为 H.264 MP4 或 WebM 后重试。",
      );
    if (element instanceof HTMLImageElement) {
      element.onload = () =>
        finish(
          element.naturalWidth > 0 && element.naturalHeight > 0
            ? undefined
            : "图片没有有效画面，请重新导出后再导入。",
        );
      element.src = source;
    } else {
      element.preload = "auto";
      element.muted = true;
      element.playsInline = true;
      element.onloadeddata = () =>
        finish(
          element.videoWidth > 0 && element.videoHeight > 0
            ? undefined
            : "视频没有可解码的画面，请转换为 H.264 MP4 或 WebM 后重试。",
        );
      element.src = source;
      element.load();
    }
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "当前浏览器不支持本地素材存储，请使用 Chrome、Edge 或 Safari 的普通窗口。",
        ),
      );
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("无法打开本地素材库。"));
    request.onblocked = () =>
      reject(new Error("素材库正在被另一个窗口使用，请关闭旧版页面后重试。"));
  });
}

export async function getAssets(): Promise<Asset[]> {
  const database = await openDatabase();
  const saved = await new Promise<Asset[]>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result as Asset[]);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("读取本地素材失败，请重试。"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("读取本地素材已中断。"));
    };
  });
  const defaults = await Promise.all(
    bundledVideoAssets
      .filter((video) => !saved.some((asset) => asset.id === video.id))
      .map(loadBundledVideo),
  );
  const values = [...saved, ...defaults];
  return assetSlots.flatMap((slot) =>
    values.filter((asset) => asset.id === slot.id),
  );
}

export async function saveAsset(asset: Asset): Promise<void> {
  const slot = assetSlots.find((item) => item.id === asset.id);
  if (!slot || slot.type !== asset.type)
    throw new Error("素材类型与目标位置不匹配。");
  if (!asset.blob.size) throw new Error("文件为空，请重新选择。");
  if (asset.blob.size > MAX_ASSET_BYTES)
    throw new Error("单个文件不能超过 200 MB。");
  await validateMedia(asset.blob, asset.type);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put({
      ...asset,
      source: "imported",
      poster: undefined,
    });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("保存本地素材失败。"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("保存本地素材已中断。"));
    };
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("移除素材失败，请重试。"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("移除素材已中断。"));
    };
  });
}
