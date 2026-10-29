import { isProjectDeleted } from "./projectTrash";
import {
  isVideoPromptWorkflow,
  type VideoPromptWorkflow,
} from "./videoPromptWorkflow";
import {
  VIDEO_DEMO_DURATION,
  VIDEO_DEMO_RESOLUTION,
  upgradeVideoDemoDraft,
} from "./videoChatPreset";

export type VideoResolution = "360p" | "720p" | "1080p";
export type VideoDuration = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export function isVideoDuration(value: unknown): value is VideoDuration {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 5 &&
    value <= 15
  );
}
export type VideoReferenceKind = "image" | "video" | "audio";

export interface VideoChatReference {
  id: string;
  name: string;
  kind: VideoReferenceKind;
  blob: Blob;
}

export interface VideoCreativeAnswers {
  rhythm?: "gentle" | "dynamic";
  emphasis?: "balanced" | "guide";
}

export interface VideoChatTurn {
  id: string;
  prompt: string;
  references: VideoChatReference[];
  resolution: VideoResolution;
  duration: VideoDuration;
  createdAt: string;
  status:
    | "analyzing"
    | "awaiting-confirmation"
    | "preparing"
    | "ready"
    | "interrupted";
  sample: 0 | 1 | "reference-demo" | "client-final";
  answers?: VideoCreativeAnswers;
  confirmedAt?: string;
  sourceTurnId?: string;
  workflow?: VideoPromptWorkflow;
  generationPrompt?: string;
}

export interface VideoChatDraft {
  prompt: string;
  references: VideoChatReference[];
  resolution: VideoResolution;
  duration: VideoDuration;
  sourceTurnId?: string;
}

export interface VideoChatConversation {
  projectId: string;
  turns: VideoChatTurn[];
  draft: VideoChatDraft;
  updatedAt: string;
}

const DATABASE = "lilly-video-conversations";
const STORE = "conversations";
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE, { keyPath: "projectId" });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = undefined;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("浏览器中的另一个页面正在使用视频记录。"));
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

function validReference(value: unknown): value is VideoChatReference {
  if (!value || typeof value !== "object") return false;
  const reference = value as VideoChatReference;
  return (
    typeof reference.id === "string" &&
    typeof reference.name === "string" &&
    ["image", "video", "audio"].includes(reference.kind) &&
    reference.blob instanceof Blob
  );
}

function validTurn(value: unknown): value is VideoChatTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as VideoChatTurn;
  return (
    typeof turn.id === "string" &&
    typeof turn.prompt === "string" &&
    Array.isArray(turn.references) &&
    turn.references.every(validReference) &&
    ["360p", "720p", "1080p"].includes(turn.resolution) &&
    isVideoDuration(turn.duration) &&
    [0, 1, "reference-demo", "client-final"].includes(turn.sample) &&
    typeof turn.createdAt === "string" &&
    Number.isFinite(Date.parse(turn.createdAt)) &&
    [
      "analyzing",
      "awaiting-confirmation",
      "preparing",
      "ready",
      "interrupted",
    ].includes(turn.status) &&
    (turn.answers === undefined ||
      (turn.answers !== null &&
        typeof turn.answers === "object" &&
        !Array.isArray(turn.answers) &&
        (turn.answers.rhythm === undefined ||
          ["gentle", "dynamic"].includes(turn.answers.rhythm)) &&
        (turn.answers.emphasis === undefined ||
          ["balanced", "guide"].includes(turn.answers.emphasis)))) &&
    (turn.confirmedAt === undefined ||
      (typeof turn.confirmedAt === "string" &&
        Number.isFinite(Date.parse(turn.confirmedAt))))
  );
}

// Bad optional data must not erase an otherwise valid historical conversation.
export function normalizeVideoTurnWorkflow(turn: VideoChatTurn): VideoChatTurn {
  const normalized = { ...turn };
  if (!isVideoPromptWorkflow(normalized.workflow)) delete normalized.workflow;
  if (
    typeof normalized.generationPrompt !== "string" ||
    !normalized.generationPrompt.trim() ||
    normalized.generationPrompt.length > 8000
  )
    delete normalized.generationPrompt;
  return normalized;
}

export async function loadVideoConversation(
  projectId: string,
): Promise<VideoChatConversation | undefined> {
  if (isProjectDeleted(projectId)) return undefined;
  const database = await openDatabase();
  if (isProjectDeleted(projectId)) return undefined;
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .get(projectId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (isProjectDeleted(projectId)) return resolve(undefined);
      const value = request.result as VideoChatConversation | undefined;
      if (!value || !Array.isArray(value.turns)) return resolve(undefined);
      const draft = value.draft;
      resolve({
        projectId,
        // The conversation component resumes timed demo phases after a reload.
        turns: value.turns.filter(validTurn).map(normalizeVideoTurnWorkflow),
        draft: upgradeVideoDemoDraft({
          prompt: typeof draft?.prompt === "string" ? draft.prompt : "",
          references: Array.isArray(draft?.references)
            ? draft.references.filter(validReference)
            : [],
          resolution: ["360p", "720p", "1080p"].includes(draft?.resolution)
            ? draft.resolution
            : VIDEO_DEMO_RESOLUTION,
          duration: isVideoDuration(draft?.duration)
            ? draft.duration
            : VIDEO_DEMO_DURATION,
          sourceTurnId:
            typeof draft?.sourceTurnId === "string"
              ? draft.sourceTurnId
              : undefined,
        }),
        updatedAt: value.updatedAt,
      });
    };
  });
}

export async function saveVideoConversation(
  value: VideoChatConversation,
): Promise<void> {
  if (isProjectDeleted(value.projectId))
    throw new Error("此创作已删除，请先恢复后再编辑。");
  const database = await openDatabase();
  if (isProjectDeleted(value.projectId))
    throw new Error("此创作已删除，请先恢复后再编辑。");
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const MAX_VIDEO_REFERENCES = 6;
const supportedImages = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const supportedVideos = ["video/mp4", "video/webm", "video/quicktime"];
const supportedAudio = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
];

export async function createVideoReference(
  file: File,
): Promise<VideoChatReference> {
  const kind: VideoReferenceKind | undefined = supportedImages.includes(
    file.type,
  )
    ? "image"
    : supportedVideos.includes(file.type)
      ? "video"
      : supportedAudio.includes(file.type)
        ? "audio"
        : undefined;
  if (!kind)
    throw new Error(
      `“${file.name}”格式暂不支持，请上传 JPG、PNG、WebP、GIF、MP4、WebM 或音频文件。`,
    );
  const limit = kind === "video" ? 30 : kind === "audio" ? 15 : 10;
  if (!file.size || file.size > limit * 1024 * 1024)
    throw new Error(
      `“${file.name}”${file.size ? `超过 ${limit} MB 上限` : "是空文件"}。`,
    );
  await new Promise<void>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const media = kind === "image" ? new Image() : document.createElement(kind);
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      media.onload = null;
      media.onerror = null;
      if (media instanceof HTMLMediaElement) {
        media.onloadedmetadata = null;
        media.removeAttribute("src");
        media.load();
      }
      URL.revokeObjectURL(source);
    };
    const success = () => {
      cleanup();
      resolve();
    };
    const failure = () => {
      cleanup();
      reject(
        new Error(`无法读取“${file.name}”，请检查文件是否完整或更换格式。`),
      );
    };
    timeout = setTimeout(failure, 10000);
    media.onerror = failure;
    if (media instanceof HTMLMediaElement) {
      media.preload = "metadata";
      media.onloadedmetadata = success;
    } else media.onload = success;
    media.src = source;
  });
  return { id: crypto.randomUUID(), name: file.name, kind, blob: file };
}
