import type { LiteratureSubmission } from "../components/LiteratureIntake";
import { h5Case, scriptCase } from "../literatureData";
import type { LiteratureCase, LiteratureSegment } from "../literature/types";
import { caseInput, validateLiteratureInput } from "./literatureWorkflow";

export interface SavedLiteratureSubmission {
  id: string;
  submission: LiteratureSubmission;
  createdAt: number;
}

const DB_NAME = "lilly-literature-submissions-v1";
const STORE_NAME = "submissions";
const LATEST_KEY = "latest";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128;

function validImageSource(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (src.startsWith("/literature/")) {
    return (
      /^\/literature\/(?:[a-z\d_.-]+\/)*[a-z\d_.-]+\.(?:png|jpe?g|webp)$/i.test(
        src,
      ) && !src.split("/").some((part) => part === "." || part === "..")
    );
  }
  if (src.length > MAX_DATA_URL_LENGTH) return false;
  const match =
    /^data:image\/(?:png|jpeg|webp);base64,([a-z\d+/]+={0,2})$/i.exec(src);
  if (!match || match[1].length % 4 !== 0) return false;
  const padding = match[1].endsWith("==") ? 2 : match[1].endsWith("=") ? 1 : 0;
  return (match[1].length * 3) / 4 - padding <= MAX_IMAGE_BYTES;
}

function validString(
  value: unknown,
  max: number,
  nonempty = true,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (!nonempty || !!value.trim())
  );
}

export function isValidLiteratureSubmission(
  value: unknown,
): value is LiteratureSubmission {
  if (!value || typeof value !== "object") return false;
  const submission = value as LiteratureSubmission;
  if (
    !["script", "h5"].includes(submission.kind) ||
    !["example", "custom"].includes(submission.mode) ||
    !validString(submission.title, 300) ||
    !validString(submission.text, 40000, false) ||
    !Array.isArray(submission.images) ||
    submission.images.length > 8
  )
    return false;
  if (submission.kind === "script") {
    return (
      submission.images.length === 0 &&
      !validateLiteratureInput(submission.text)
    );
  }
  if (!submission.images.length) return false;
  const ids = new Set<string>();
  for (const image of submission.images) {
    if (
      !image ||
      typeof image !== "object" ||
      !validString(image.id, 150) ||
      ids.has(image.id) ||
      !validString(image.name, 500) ||
      !validImageSource(image.src) ||
      !validString(image.text, 40000)
    )
      return false;
    ids.add(image.id);
  }
  return !validateLiteratureInput(
    submission.images.map((image) => image.text).join("\n\n"),
  );
}

export function isExampleSubmission(submission: LiteratureSubmission): boolean {
  if (submission.mode !== "example") return false;
  if (submission.kind === "script") {
    return (
      submission.text === caseInput(scriptCase) &&
      submission.images.length === 0
    );
  }
  return (
    submission.images.length === h5Case.images!.length &&
    submission.images.every((image, index) => {
      const original = h5Case.images![index];
      return (
        image.id === original.id &&
        image.src === original.src &&
        image.text ===
          h5Case.segments
            .filter((segment) => segment.imageId === original.id)
            .map((segment) => segment.original)
            .join("\n\n")
      );
    })
  );
}

export function buildSubmissionCase(
  submission: LiteratureSubmission,
  runId: string,
): LiteratureCase {
  if (!isValidLiteratureSubmission(submission) || !validString(runId, 150)) {
    throw new Error("文稿或图片文字不完整，请返回上传页检查后再试。");
  }
  if (isExampleSubmission(submission)) {
    const source = submission.kind === "script" ? scriptCase : h5Case;
    return { ...source, id: runId };
  }
  const inputs =
    submission.kind === "h5"
      ? submission.images.map((image) => ({
          text: image.text,
          imageId: image.id,
          name: image.name,
        }))
      : [{ text: submission.text, imageId: undefined, name: undefined }];
  const segments: LiteratureSegment[] = [];
  for (const input of inputs) {
    for (const paragraph of input.text
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean)) {
      const number = segments.length + 1;
      const original = paragraph.trim();
      segments.push({
        id: `${runId}-segment-${number}`,
        sourceNumber: String(number).padStart(2, "0"),
        title: input.name
          ? `${input.name} · 文本 ${number}`
          : `文稿段落 ${number}`,
        original,
        revised: original,
        imageId: input.imageId,
        reason:
          "新上传内容已按段落整理，尚未进行实时文献检索或医学审阅；请人工核对表述及对应证据。",
        status: "pending",
        claims: [original],
        keywords: [],
        evidence: [],
      });
    }
  }
  return {
    id: runId,
    kind: submission.kind,
    title: submission.title,
    subtitle: `${submission.kind === "h5" ? `${submission.images.length} 张图片 · ` : ""}${segments.length} 段文字 · 待核查`,
    source:
      submission.kind === "h5"
        ? "用户上传的 H5 图片与确认文字"
        : "用户上传或粘贴的文本",
    sourceNote:
      "已整理用户提供的文字并保留图片对应关系。尚未执行实时 OCR、文献检索或医学审核，待人工补充证据。",
    version: runId,
    segments,
    references: [],
    images:
      submission.kind === "h5"
        ? submission.images.map((image) => ({
            id: image.id,
            src: image.src,
            label: image.name,
          }))
        : undefined,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    let rejected = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      if (rejected) request.result.close();
      else {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      }
    };
    request.onerror = () =>
      reject(request.error || new Error("无法打开文稿存储。"));
    request.onblocked = () => {
      rejected = true;
      reject(new Error("文稿存储被其他页面占用，请关闭旧页面后重试。"));
    };
  });
}

function validSavedSubmission(
  value: unknown,
): value is SavedLiteratureSubmission {
  if (!value || typeof value !== "object") return false;
  const saved = value as SavedLiteratureSubmission;
  return (
    validString(saved.id, 150) &&
    Number.isFinite(saved.createdAt) &&
    saved.createdAt > 0 &&
    isValidLiteratureSubmission(saved.submission)
  );
}

export async function saveLiteratureSubmission(
  saved: SavedLiteratureSubmission,
): Promise<void> {
  if (!validSavedSubmission(saved))
    throw new Error("无法保存不完整的文稿。请检查上传内容。");
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(saved, LATEST_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          transaction.error ||
            new Error("文稿保存失败，浏览器存储空间可能不足。"),
        );
      transaction.onerror = () =>
        reject(transaction.error || new Error("文稿保存失败。"));
    });
  } finally {
    db.close();
  }
}

export async function loadLatestLiteratureSubmission(): Promise<SavedLiteratureSubmission | null> {
  const db = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(LATEST_KEY);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(transaction.error || new Error("无法读取上次文稿。"));
      transaction.onerror = () =>
        reject(transaction.error || new Error("无法读取上次文稿。"));
    });
    return validSavedSubmission(value) ? value : null;
  } finally {
    db.close();
  }
}
