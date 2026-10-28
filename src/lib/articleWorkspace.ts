import type { ArticleInput } from "../components/ArticleIntake";
import { isProjectDeleted } from "./projectTrash";

export type ArticleSection = {
  id: string;
  title: string;
  body: string;
  imageId?: string;
};

export type ArticleDraft = {
  id: string;
  input: ArticleInput;
  sections: ArticleSection[];
  createdAt: number;
  updatedAt: number;
};

const DATABASE = "lilly-article-workspace-v1";
const DRAFTS = "drafts";
const META = "meta";
const SCHEMA_VERSION = 1;
const MAX_TEXT_LENGTH = 40000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128;

type PendingWrite = {
  draft: ArticleDraft;
  waiters: { resolve: () => void; reject: (reason: unknown) => void }[];
};

// Keep accepted edits across Workspace remounts, including when a browser write
// is still pending or has failed. Callers receive copies of these snapshots.
const snapshots = new Map<string, ArticleDraft>();
const pendingWrites = new Map<string, PendingWrite>();
let latestSnapshotId: string | undefined;
let writing = false;

function copyDraft(draft: ArticleDraft): ArticleDraft {
  return {
    ...draft,
    input: {
      ...draft.input,
      images: draft.input.images.map((image) => ({ ...image })),
    },
    sections: draft.sections.map((section) => ({ ...section })),
  };
}

function currentSnapshot(id?: string): ArticleDraft | null {
  const key = id ?? latestSnapshotId;
  const snapshot =
    key && !isProjectDeleted(key) ? snapshots.get(key) : undefined;
  return snapshot ? copyDraft(snapshot) : null;
}

function latestAvailableSnapshot(): ArticleDraft | null {
  let latest: ArticleDraft | null = null;
  for (const snapshot of snapshots.values()) {
    if (
      !isProjectDeleted(snapshot.id) &&
      (!latest || snapshot.updatedAt > latest.updatedAt)
    )
      latest = snapshot;
  }
  return latest ? copyDraft(latest) : null;
}

function validString(
  value: unknown,
  max: number,
  required = true,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    !value.includes("\0") &&
    (!required || !!value.trim())
  );
}

function splitParagraphs(text: string): string[] {
  // Only blank-line separators are removed. The original paragraph text,
  // including line breaks, numbers and references, remains untouched.
  return text.split(/\r?\n(?:[\t ]*\r?\n)+/).filter((part) => part.trim());
}

function validImageSource(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_DATA_URL_LENGTH)
    return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([a-z\d+/]+={0,2})$/i.exec(
    value,
  );
  if (!match || match[2].length % 4 !== 0) return false;
  const payload = match[2];
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  if ((payload.length * 3) / 4 - padding > MAX_IMAGE_BYTES) return false;
  try {
    const header = atob(payload.slice(0, 24));
    switch (match[1].toLowerCase()) {
      case "png":
        return header.startsWith("\x89PNG\r\n\x1a\n");
      case "jpeg":
        return header.startsWith("\xff\xd8\xff");
      case "webp":
        return header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function inputIssue(value: unknown): string | null {
  if (!value || typeof value !== "object")
    return "图文内容不完整，请重新上传。";
  const input = value as ArticleInput;
  if (!validString(input.title, 300, false)) return "作品标题需在 300 字以内。";
  if (!validString(input.brief, MAX_TEXT_LENGTH, false))
    return "创作要求需在 40,000 字以内。";
  if (!validString(input.text, MAX_TEXT_LENGTH, false))
    return "正文需在 40,000 字以内。";
  if (
    !["long", "series"].includes(input.format) ||
    !["custom", "example"].includes(input.mode)
  )
    return "请选择有效的图文形式。";
  if (!Array.isArray(input.images) || input.images.length > 8)
    return "最多上传 8 张图片。";
  if (splitParagraphs(input.text).length > 40)
    return "请将正文整理为 40 段以内。";
  if (!input.text.trim() && !input.images.length)
    return "请先提供正文或至少一张图片。";
  const ids = new Set<string>();
  for (const image of input.images) {
    if (
      !image ||
      typeof image !== "object" ||
      !validString(image.id, 150) ||
      ids.has(image.id) ||
      !validString(image.name, 500) ||
      !validImageSource(image.src)
    )
      return "图片信息无效，请重新上传 PNG、JPG 或 WebP 图片。";
    ids.add(image.id);
  }
  return null;
}

function validDraft(value: unknown): value is ArticleDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as ArticleDraft;
  if (
    !validString(draft.id, 150) ||
    inputIssue(draft.input) ||
    !Number.isFinite(draft.createdAt) ||
    draft.createdAt <= 0 ||
    !Number.isFinite(draft.updatedAt) ||
    draft.updatedAt < draft.createdAt ||
    !Array.isArray(draft.sections) ||
    !draft.sections.length ||
    draft.sections.length > 40
  )
    return false;
  const sectionIds = new Set<string>();
  const imageIds = new Set(draft.input.images.map((image) => image.id));
  let bodyLength = 0;
  for (const section of draft.sections) {
    if (
      !section ||
      typeof section !== "object" ||
      !validString(section.id, 200) ||
      sectionIds.has(section.id) ||
      !validString(section.title, 300, false) ||
      !validString(section.body, MAX_TEXT_LENGTH, false) ||
      (section.imageId !== undefined && !imageIds.has(section.imageId))
    )
      return false;
    bodyLength += section.body.length;
    if (bodyLength > MAX_TEXT_LENGTH) return false;
    sectionIds.add(section.id);
  }
  return true;
}

export function createArticleDraft(
  input: ArticleInput,
  id: string,
): ArticleDraft {
  const issue = inputIssue(input);
  if (issue) throw new Error(issue);
  if (!validString(id, 150)) throw new Error("文稿标识无效，请重新新建。");
  const paragraphs = splitParagraphs(input.text);
  const count = Math.max(paragraphs.length, input.images.length);
  const now = Date.now();
  return {
    id,
    input: { ...input, images: input.images.map((image) => ({ ...image })) },
    sections: Array.from({ length: count }, (_, index) => ({
      id: `${id}-section-${index + 1}`,
      title: `章节 ${String(index + 1).padStart(2, "0")}`,
      body: paragraphs[index] || "",
      imageId: input.images[index]?.id,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, SCHEMA_VERSION);
    let rejected = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFTS))
        request.result.createObjectStore(DRAFTS, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(META))
        request.result.createObjectStore(META);
    };
    request.onsuccess = () => {
      if (rejected) request.result.close();
      else {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      }
    };
    request.onerror = () =>
      reject(request.error || new Error("无法打开图文存储。"));
    request.onblocked = () => {
      rejected = true;
      reject(new Error("图文存储被其他页面占用，请关闭旧页面后重试。"));
    };
  });
}

async function writeArticleDraft(draft: ArticleDraft): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DRAFTS, META], "readwrite");
      transaction
        .objectStore(DRAFTS)
        .put({ id: draft.id, schemaVersion: SCHEMA_VERSION, draft });
      transaction.objectStore(META).put(draft.id, "latest");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          transaction.error ||
            new Error("图文保存失败，请保留原始文件并导出文稿。"),
        );
      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error("图文保存失败，浏览器存储空间可能不足。"),
        );
    });
  } finally {
    db.close();
  }
}

async function flushPendingWrites(): Promise<void> {
  if (writing) return;
  writing = true;
  try {
    while (pendingWrites.size) {
      const [id, pending] = pendingWrites.entries().next().value!;
      pendingWrites.delete(id);
      try {
        await writeArticleDraft(pending.draft);
        pending.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        pending.waiters.forEach(({ reject }) => reject(error));
      }
    }
  } finally {
    writing = false;
  }
}

export async function saveArticleDraft(draft: ArticleDraft): Promise<void> {
  if (isProjectDeleted(draft.id))
    throw new Error("此创作已删除，请先恢复后再编辑。");
  if (!validDraft(draft))
    throw new Error("文稿或图片信息不完整，暂时无法保存。");
  const snapshot = copyDraft(draft);
  snapshots.set(snapshot.id, snapshot);
  latestSnapshotId = snapshot.id;
  return new Promise<void>((resolve, reject) => {
    const previous = pendingWrites.get(snapshot.id);
    // Move a coalesced write to the end so the durable latest pointer follows
    // the order of edits even when multiple projects are being saved.
    pendingWrites.delete(snapshot.id);
    pendingWrites.set(snapshot.id, {
      draft: snapshot,
      waiters: [...(previous?.waiters ?? []), { resolve, reject }],
    });
    void flushPendingWrites();
  });
}

export async function loadArticleDraft(
  id?: string,
): Promise<ArticleDraft | null> {
  if (id !== undefined && !validString(id, 150)) return null;
  if (id !== undefined && isProjectDeleted(id)) return null;
  const snapshot = currentSnapshot(id);
  if (snapshot) return snapshot;
  const db = await openDatabase();
  try {
    const record = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction([DRAFTS, META], "readonly");
      let value: unknown;
      // A deleted latest pointer must not appear in the resume entry. Scan only
      // as a fallback and retain one candidate instead of loading every image.
      const readLatestAvailable = () => {
        const request = transaction.objectStore(DRAFTS).openCursor();
        let latest: ArticleDraft | null = null;
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const candidate = cursor.value as {
            id?: unknown;
            schemaVersion?: unknown;
            draft?: unknown;
          };
          if (
            typeof candidate.id === "string" &&
            !isProjectDeleted(candidate.id) &&
            candidate.schemaVersion === SCHEMA_VERSION &&
            validDraft(candidate.draft) &&
            candidate.id === candidate.draft.id &&
            (!latest || candidate.draft.updatedAt > latest.updatedAt)
          ) {
            latest = candidate.draft;
            value = candidate;
          }
          cursor.continue();
        };
      };
      const readDraft = (draftId: unknown) => {
        if (!validString(draftId, 150) || isProjectDeleted(draftId)) {
          if (id === undefined) readLatestAvailable();
          return;
        }
        const request = transaction.objectStore(DRAFTS).get(draftId);
        request.onsuccess = () => {
          value = request.result;
          if (id === undefined && (!value || isProjectDeleted(draftId))) {
            value = undefined;
            readLatestAvailable();
          }
        };
      };
      if (id !== undefined) readDraft(id);
      else {
        const pointer = transaction.objectStore(META).get("latest");
        pointer.onsuccess = () => readDraft(pointer.result);
      }
      transaction.oncomplete = () => resolve(value);
      transaction.onabort = () =>
        reject(transaction.error || new Error("无法读取图文文稿。"));
      transaction.onerror = () =>
        reject(transaction.error || new Error("无法读取图文文稿。"));
    });
    // An edit may have arrived while the IndexedDB read was in progress.
    if (id !== undefined && isProjectDeleted(id)) return null;
    const newer = currentSnapshot(id);
    if (newer) return newer;
    const memoryFallback = id === undefined ? latestAvailableSnapshot() : null;
    if (!record || typeof record !== "object") return memoryFallback;
    const saved = record as {
      id?: unknown;
      schemaVersion?: unknown;
      draft?: unknown;
    };
    if (
      id === undefined &&
      typeof saved.id === "string" &&
      isProjectDeleted(saved.id)
    ) {
      // A different tab may have deleted the chosen candidate after the read.
      // Reselect the latest available draft instead of exposing that record.
      return loadArticleDraft();
    }
    const available =
      saved.schemaVersion === SCHEMA_VERSION &&
      validDraft(saved.draft) &&
      saved.id === saved.draft.id &&
      !isProjectDeleted(saved.draft.id)
        ? saved.draft
        : null;
    return memoryFallback &&
      (!available || memoryFallback.updatedAt > available.updatedAt)
      ? memoryFallback
      : available;
  } finally {
    db.close();
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

function checkExport(draft: ArticleDraft): void {
  if (!validDraft(draft)) throw new Error("文稿内容无效，请检查后再导出。");
}

export function articleDraftText(draft: ArticleDraft): string {
  checkExport(draft);
  const images = new Map(draft.input.images.map((image) => [image.id, image]));
  return [
    draft.input.title.trim() || "新的图文创作",
    ...draft.sections.map((section) => {
      const image = section.imageId ? images.get(section.imageId) : undefined;
      return [section.title, section.body, image ? `[图片：${image.name}]` : ""]
        .filter(Boolean)
        .join("\n\n");
    }),
    "图文编排预览 · 未验证微信公众号编辑器兼容性",
  ].join("\n\n");
}

export function articleDraftHtml(draft: ArticleDraft): string {
  checkExport(draft);
  const title = draft.input.title.trim() || "新的图文创作";
  const images = new Map(draft.input.images.map((image) => [image.id, image]));
  const sections = draft.sections
    .map((section, index) => {
      const image = section.imageId ? images.get(section.imageId) : undefined;
      return `<section class="article-section"><span class="section-number">${String(index + 1).padStart(2, "0")}</span>${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}${image ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.name)}">` : ""}${section.body ? `<div class="body-copy">${escapeHtml(section.body)}</div>` : ""}</section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#faf7f8;color:#3f3841;font-family:system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.8}main{max-width:760px;margin:32px auto;background:#fff;border:1px solid #ede4e8;border-radius:16px;overflow:hidden}header{padding:44px 36px 36px;background:#fff5f5;border-bottom:3px solid #d52b35}.eyebrow{color:#b94758;font-size:12px;letter-spacing:2px}h1{font-size:30px;line-height:1.5;margin:16px 0 10px;overflow-wrap:anywhere}header p{font-size:13px;color:#957a85;margin:0}.sections{padding:0 36px}.article-section{position:relative;padding:32px 0;border-bottom:1px solid #eee6ea;break-inside:avoid}.section-number{color:#bd596f;font-size:12px;font-weight:600}h2{font-size:21px;line-height:1.6;margin:8px 0 20px;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto;margin:0 auto 24px;border-radius:8px}.body-copy{font-size:16px;white-space:pre-wrap;overflow-wrap:anywhere}footer{padding:24px 36px;color:#9b8791;font-size:12px}.series{max-width:1100px}.series .sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:28px}.series .article-section{border:1px solid #eee1e6;border-radius:12px;padding:24px}.series .body-copy{font-size:15px}@media(max-width:600px){main{margin:0;border:0;border-radius:0}header{padding:32px 22px}h1{font-size:25px}.sections{padding:0 22px}.series .sections{grid-template-columns:1fr;padding:20px}.series .article-section{padding:20px}footer{padding:24px 22px}}@media print{body{background:#fff}main{border:0;margin:0;max-width:none}header{background:#fff}.series .sections{grid-template-columns:1fr}footer{color:#666}}
</style>
</head>
<body><main class="${draft.input.format}"><header><span class="eyebrow">${draft.input.format === "series" ? "系列图文" : "长图文"} · 编排预览</span><h1>${escapeHtml(title)}</h1><p>${draft.sections.length} 个内容单元 · 原始文案与图片编排</p></header><div class="sections">${sections}</div><footer>本地编排预览 · 未验证微信公众号编辑器兼容性</footer></main></body>
</html>`;
}
