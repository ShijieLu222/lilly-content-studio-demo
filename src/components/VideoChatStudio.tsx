import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Clapperboard,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Music2,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  createVideoReference,
  loadVideoConversation,
  MAX_VIDEO_REFERENCES,
  saveVideoConversation,
  type VideoChatReference,
  type VideoChatTurn,
  type VideoCreativeAnswers,
  type VideoDuration,
  type VideoResolution,
} from "../lib/videoChatStore";
import { VideoDemoProgress, VideoDemoQuestions } from "./VideoDemoProcess";
import "./VideoChatStudio.css";

interface Props {
  projectId: string;
  initialPrompt?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
  onNotify?: (text: string) => void;
}

const samples = [
  {
    src: "/assets/videos/conference-opening-a.mp4",
    poster: "/assets/videos/conference-opening-a-poster.jpg",
    meta: "5.03 秒 · 1920 × 1080",
  },
  {
    src: "/assets/videos/conference-opening-b.mp4",
    poster: "/assets/videos/conference-opening-b-poster.jpg",
    meta: "6.08 秒 · 1280 × 720",
  },
] as const;

const pocReferences = [
  {
    src: "/assets/video-references/poc-reference-1.png",
    name: "肥胖诊疗路径 · 主题封面",
    prompt:
      "以这张主题封面为参考，保持原有文字、标志与构图清晰完整，加入轻柔的光影与转场，呈现专业、克制的医学内容风格。",
  },
  {
    src: "/assets/video-references/poc-reference-2.png",
    name: "诊疗现状 · 数据页面",
    prompt:
      "以这张数据页面为参考，按阅读顺序引导视线，保留图中所有数据、注释和引用，使用轻柔的高亮变化，不新增医学结论。",
  },
  {
    src: "/assets/video-references/poc-reference-3.png",
    name: "指南探索 · 移动页面",
    prompt:
      "以这张指南探索页面为参考，让手机与背景产生轻微景深变化，完整保留原有内容和页面构图，镜头缓慢推进后定格。",
  },
];
const resolutionOptions: { value: VideoResolution; label: string }[] = [
  { value: "360p", label: "流畅预览" },
  { value: "720p", label: "标准清晰度" },
  { value: "1080p", label: "高清细节" },
];
const groupPrompt =
  "请基于这三张参考图，制作一支 8 秒的肥胖诊疗路径主题视频。依次呈现主题封面、诊疗数据、指南探索页面，延续红粉色视觉，用流畅转场和轻微镜头推进让画面动起来，配合轻快、专业的背景音乐。完整保留原图的文字、数据、品牌标志与引用，不新增医学结论。";

async function loadDemoReferences(): Promise<VideoChatReference[]> {
  return Promise.all(
    pocReferences.map(async (reference) => {
      const response = await fetch(reference.src);
      if (!response.ok) throw new Error("参考图无法载入，请检查本地服务。");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/"))
        throw new Error("参考图文件格式异常，请检查本地素材。");
      return {
        id: crypto.randomUUID(),
        name: `${reference.name}.png`,
        kind: "image" as const,
        blob,
      };
    }),
  );
}

function sampleFor(turn: VideoChatTurn) {
  if (turn.sample === "client-final")
    return {
      src: "/assets/videos/client-demo-final.mp4",
      poster: "/assets/videos/client-demo-final-poster.jpg",
      meta: "8.06 秒 · 960 × 960 · 含配乐",
      square: true,
    };
  if (turn.sample !== "reference-demo")
    return { ...samples[turn.sample], square: false };
  const size = Number.parseInt(turn.resolution, 10);
  return {
    src: `/assets/videos/reference-demo-${turn.duration}s-${turn.resolution}.mp4`,
    poster: pocReferences[0].src,
    meta: `${turn.duration} 秒 · ${size} × ${size}`,
    square: true,
  };
}

function ReferencePreview({
  reference,
  compact = false,
  onRemove,
}: {
  reference: VideoChatReference;
  compact?: boolean;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const source = URL.createObjectURL(reference.blob);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [reference.blob]);
  return (
    <div
      className={`vchat-reference ${compact ? "vchat-reference-compact" : ""}`}
      title={reference.name}
    >
      {reference.kind === "image" ? (
        <img src={url || undefined} alt={reference.name} />
      ) : reference.kind === "video" ? (
        <video
          src={url || undefined}
          muted
          preload="metadata"
          aria-label={reference.name}
        />
      ) : (
        <div className="vchat-audio-thumb">
          <Music2 size={22} />
        </div>
      )}
      <span className="vchat-reference-name">{reference.name}</span>
      {onRemove && (
        <button
          type="button"
          className="vchat-reference-remove"
          aria-label={`移除参考素材 ${reference.name}`}
          onClick={onRemove}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function ResultVideo({
  turn,
  number,
  onReuse,
  onNotify,
}: {
  turn: VideoChatTurn;
  number: number;
  onReuse: () => void;
  onNotify: (text: string) => void;
}) {
  const sample = sampleFor(turn);
  const isFinal = turn.sample === "client-final";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [downloading, setDownloading] = useState(false);
  async function download() {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(sample.src);
      if (!response.ok) throw new Error("视频读取失败");
      const blob = await response.blob();
      if (!blob.size) throw new Error("视频为空");
      const source = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = source;
      anchor.download = `视频创作-${isFinal ? "成片" : "示例"}-${String(number).padStart(2, "0")}.mp4`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(source), 10000);
    } catch {
      onNotify("视频下载失败，请检查本地服务后重试。");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div
      className={`vchat-result-card ${sample.square ? "vchat-result-square" : ""}`}
    >
      <div className="vchat-result-heading">
        <span>
          {isFinal ? "视频成片" : "演示视频"} {String(number).padStart(2, "0")}
        </span>
        <span className="vchat-sample-label">
          {isFinal ? "预置成片" : "预置示例"}
        </span>
      </div>
      <div className="vchat-video-wrap">
        <video
          key={reload}
          ref={videoRef}
          src={sample.src}
          poster={sample.poster}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          aria-label={`第 ${number} 次对话的${isFinal ? "成片" : "示例视频"}`}
        />
        {failed && (
          <div className="vchat-media-error" role="alert">
            <CircleAlert size={24} />
            <p>示例视频暂时无法载入</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setReload((value) => value + 1);
              }}
            >
              <RotateCcw size={14} /> 重新载入
            </button>
          </div>
        )}
      </div>
      <div className="vchat-result-info">
        <span>
          {isFinal ? "成片实际规格" : "示例实际规格"}：{sample.meta}
        </span>
        <span>{sample.square ? "参考图预置动效" : "原始素材"}</span>
      </div>
      <div className="vchat-result-actions">
        <button type="button" className="vchat-reuse" onClick={onReuse}>
          <PencilLine size={15} /> 编辑提示词，再次生成
        </button>
        <div>
          <button
            type="button"
            className="vchat-icon-button"
            aria-label={`全屏播放第 ${number} 个视频`}
            title="全屏播放"
            onClick={() => {
              void videoRef.current
                ?.requestFullscreen?.()
                .catch(() =>
                  onNotify(
                    "当前浏览器暂不支持全屏，请使用播放器中的全屏按钮。",
                  ),
                );
            }}
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            className="vchat-icon-button"
            aria-label={`下载第 ${number} 个${isFinal ? "成片" : "示例视频"}`}
            title={isFinal ? "下载成片" : "下载示例视频"}
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading ? (
              <LoaderCircle size={15} className="vchat-spin" />
            ) : (
              <ArrowDownToLine size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoChatStudio({
  projectId,
  initialPrompt,
  title,
  onTitleChange,
  onNotify,
}: Props) {
  const [turns, setTurns] = useState<VideoChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<VideoChatReference[]>([]);
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [sourceTurnId, setSourceTurnId] = useState<string>();
  const [durationOpen, setDurationOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [storageReadFailed, setStorageReadFailed] = useState(false);
  const [error, setError] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);
  const resolutionRef = useRef<HTMLDivElement>(null);
  const resolutionTriggerRef = useRef<HTMLButtonElement>(null);
  const resolutionOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef(false);
  const uploadBusyRef = useRef(false);
  const draggingDepth = useRef(0);
  const storedRevisionRef = useRef(0);
  const onNotifyRef = useRef(onNotify);
  const projectRef = useRef(projectId);
  projectRef.current = projectId;
  onNotifyRef.current = onNotify;
  const ready = loadedProjectId === projectId;
  const activeTurn = turns.find((turn) =>
    ["analyzing", "awaiting-confirmation", "preparing"].includes(turn.status),
  );
  const pending = Boolean(activeTurn);
  const awaitingConfirmation = activeTurn?.status === "awaiting-confirmation";
  const notify = (message: string) => {
    setError(message);
    onNotifyRef.current?.(message);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadedProjectId("");
    setError("");
    setStorageError(false);
    setStorageReadFailed(false);
    setDurationOpen(false);
    setResolutionOpen(false);
    setUploading(false);
    pendingRef.current = false;
    uploadBusyRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    async function openConversation() {
      let conversation;
      try {
        conversation = await loadVideoConversation(projectId);
      } catch {
        if (cancelled) return;
        setStorageError(true);
        setStorageReadFailed(true);
        setError(
          "浏览器暂时无法保存对话。你仍可在当前页面体验，离开前请下载需要的视频。",
        );
      }
      if (cancelled) return;
      let startingReferences: VideoChatReference[] = [];
      if (!conversation) {
        try {
          startingReferences = await loadDemoReferences();
        } catch (reason) {
          if (!cancelled)
            setError(
              reason instanceof Error
                ? reason.message
                : "参考图载入失败，可在右下角重新载入演示。",
            );
        }
      }
      if (cancelled) return;
      setTurns(conversation?.turns || []);
      setPrompt(
        conversation
          ? conversation.draft.prompt
          : initialPrompt?.trim() || groupPrompt,
      );
      setReferences(
        conversation ? conversation.draft.references : startingReferences,
      );
      setResolution(conversation?.draft.resolution || "720p");
      setDuration(conversation?.draft.duration || 8);
      setSourceTurnId(conversation?.draft.sourceTurnId);
      setLoadedProjectId(projectId);
    }
    void openConversation();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // A new project selects a different conversation. Changing the title must not reload it.
  }, [projectId]);

  useEffect(() => {
    pendingRef.current = pending;
    if (!ready || !activeTurn || activeTurn.status === "awaiting-confirmation")
      return;
    const { id, status } = activeTurn;
    // Each phase is a local presentation timer. Reloading resumes the current phase.
    timerRef.current = setTimeout(
      () => {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id && turn.status === status
              ? {
                  ...turn,
                  status:
                    status === "analyzing" ? "awaiting-confirmation" : "ready",
                }
              : turn,
          ),
        );
        timerRef.current = undefined;
      },
      status === "analyzing" ? 4400 : 5200,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ready, activeTurn?.id, activeTurn?.status]);

  useEffect(() => {
    // Never overwrite unread history if storage failed while opening the conversation.
    if (!ready || storageReadFailed) return;
    const revision = ++storedRevisionRef.current;
    setSaving(true);
    void saveVideoConversation({
      projectId,
      turns,
      draft: { prompt, references, resolution, duration, sourceTurnId },
      updatedAt: new Date().toISOString(),
    })
      .then(() => {
        if (revision === storedRevisionRef.current) {
          setSaving(false);
          setStorageError(false);
        }
      })
      .catch(() => {
        if (revision === storedRevisionRef.current) {
          setSaving(false);
          setStorageError(true);
        }
      });
  }, [
    projectId,
    ready,
    storageReadFailed,
    turns,
    prompt,
    references,
    resolution,
    duration,
    sourceTurnId,
  ]);

  useEffect(() => {
    if (!durationOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!durationRef.current?.contains(event.target as Node))
        setDurationOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDurationOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [durationOpen]);

  useEffect(() => {
    if (!resolutionOpen) return;
    resolutionOptionRefs.current[
      resolutionOptions.findIndex((option) => option.value === resolution)
    ]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!resolutionRef.current?.contains(event.target as Node))
        setResolutionOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [resolutionOpen]);

  function selectResolution(value: VideoResolution) {
    setResolution(value);
    setResolutionOpen(false);
    resolutionTriggerRef.current?.focus();
  }

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      const feed = feedRef.current;
      if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior });
    });
  }
  useEffect(() => {
    if (ready) scrollToLatest("instant");
  }, [ready]);
  useEffect(() => {
    if (ready && turns.length) scrollToLatest();
  }, [turns.length, activeTurn?.status]);

  async function addFiles(files: File[]) {
    if (!files.length || uploadBusyRef.current || !ready) return;
    const available = MAX_VIDEO_REFERENCES - references.length;
    if (available <= 0)
      return notify(`每次最多添加 ${MAX_VIDEO_REFERENCES} 个参考素材。`);
    uploadBusyRef.current = true;
    setUploading(true);
    setError("");
    const requestedProject = projectId;
    const accepted: VideoChatReference[] = [];
    const errors: string[] = [];
    if (files.length > available)
      errors.push(
        `已选择前 ${available} 个文件，每次最多添加 ${MAX_VIDEO_REFERENCES} 个参考素材。`,
      );
    for (const file of files.slice(0, available)) {
      try {
        accepted.push(await createVideoReference(file));
      } catch (reason) {
        errors.push(
          reason instanceof Error ? reason.message : "素材读取失败，请重试。",
        );
      }
    }
    if (projectRef.current !== requestedProject) return;
    setReferences((current) =>
      [...current, ...accepted].slice(0, MAX_VIDEO_REFERENCES),
    );
    setUploading(false);
    uploadBusyRef.current = false;
    if (errors.length) notify(errors.join(" "));
    inputRef.current?.focus();
  }
  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      void addFiles(files);
    }
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    draggingDepth.current = 0;
    void addFiles(Array.from(event.dataTransfer.files));
  }

  async function usePocReferences() {
    if (uploadBusyRef.current || !ready || pending) return;
    const requestedProject = projectId;
    uploadBusyRef.current = true;
    setUploading(true);
    setError("");
    try {
      const values = await loadDemoReferences();
      if (projectRef.current !== requestedProject) return;
      setReferences(values);
      setPrompt(groupPrompt);
      setDuration(8);
      setResolution("720p");
      setSourceTurnId(undefined);
      inputRef.current?.focus();
    } catch (reason) {
      if (projectRef.current === requestedProject)
        notify(reason instanceof Error ? reason.message : "参考图载入失败。");
    } finally {
      if (projectRef.current === requestedProject) {
        setUploading(false);
        uploadBusyRef.current = false;
      }
    }
  }

  function chooseAnswers(id: string, answers: VideoCreativeAnswers) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === id && turn.status === "awaiting-confirmation"
          ? { ...turn, answers }
          : turn,
      ),
    );
  }
  function confirmAnswers(id: string) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === id &&
        turn.status === "awaiting-confirmation" &&
        turn.answers?.rhythm &&
        turn.answers?.emphasis
          ? {
              ...turn,
              status: "preparing",
              confirmedAt: new Date().toISOString(),
            }
          : turn,
      ),
    );
  }

  function submit() {
    const text = prompt.trim();
    if (!text || !ready || pendingRef.current || pending || uploading) return;
    if (text.length > 4000)
      return notify("提示词最多支持 4,000 个字，请适当精简后发送。");
    pendingRef.current = true;
    setError("");
    setDurationOpen(false);
    setResolutionOpen(false);
    const turn: VideoChatTurn = {
      id: crypto.randomUUID(),
      prompt: text,
      references: references.map((reference) => ({ ...reference })),
      resolution,
      duration,
      createdAt: new Date().toISOString(),
      status: "analyzing",
      sample: "client-final",
      sourceTurnId,
    };
    setTurns((current) => [...current, turn]);
    if (!turns.length)
      onTitleChange?.(
        text === groupPrompt
          ? "肥胖诊疗路径 · 视频创作"
          : text.length > 18
            ? `${text.slice(0, 18)}…`
            : text,
      );
    setPrompt("");
    setReferences([]);
    setSourceTurnId(undefined);
  }
  function reuse(turn: VideoChatTurn) {
    setPrompt(turn.prompt);
    setReferences(turn.references.map((reference) => ({ ...reference })));
    setResolution(turn.resolution);
    setDuration(turn.duration);
    setSourceTurnId(turn.id);
    setError("");
    setDurationOpen(false);
    setResolutionOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        turn.prompt.length,
        turn.prompt.length,
      );
    });
  }

  return (
    <section className="vchat-studio" aria-label="视频创作对话">
      <header className="vchat-header">
        <div className="vchat-header-title">
          <span className="vchat-header-icon">
            <Clapperboard size={20} />
          </span>
          <div>
            <h1>{turns.length && title ? title : "视频创作"}</h1>
            <p>把创意说出来，让画面动起来</p>
          </div>
        </div>
        <div className="vchat-header-meta">
          <span className="vchat-local-label">
            <span /> 本地交互演示
          </span>
          <span
            className={`vchat-save-state ${storageError ? "has-error" : ""}`}
            title={
              storageError
                ? "当前记录仅保留在此页面，浏览器存储不可用。"
                : "对话和参考素材保存在当前浏览器。"
            }
          >
            {storageError ? (
              <CircleAlert size={12} />
            ) : saving ? (
              <LoaderCircle size={12} className="vchat-spin" />
            ) : (
              <Check size={12} />
            )}
            {storageError ? "未能保存" : saving ? "保存中" : "已保存"}
          </span>
        </div>
      </header>
      <div
        ref={feedRef}
        className="vchat-feed"
        onScroll={() => {
          const element = feedRef.current;
          if (element)
            setShowScrollButton(
              element.scrollHeight - element.scrollTop - element.clientHeight >
                250,
            );
        }}
      >
        <div className="vchat-feed-inner">
          {!ready ? (
            <div className="vchat-loading">
              <LoaderCircle size={24} className="vchat-spin" />
              <p>正在读取创作记录…</p>
            </div>
          ) : turns.length === 0 ? (
            <div className="vchat-empty">
              <div className="vchat-empty-emblem">
                <Clapperboard size={30} strokeWidth={1.4} />
                <span>
                  <Sparkles size={13} />
                </span>
              </div>
              <span className="vchat-kicker">LILLY VIDEO STUDIO</span>
              <h2>
                你的下一支视频，
                <br />
                从一句想法开始。
              </h2>
              <p>
                参考图与提示词已放入下方输入框，可以直接发送。
                <br />
                一起确认创作方向，再让画面动起来。
              </p>
            </div>
          ) : (
            <div className="vchat-turns">
              {turns.map((turn, index) => (
                <article
                  key={turn.id}
                  className="vchat-turn"
                  aria-label={`第 ${index + 1} 轮创作`}
                >
                  <div className="vchat-user-message">
                    <div className="vchat-user-top">
                      <span>
                        {turn.sourceTurnId ? "修改后重新发送" : "创作需求"}
                      </span>
                      <time dateTime={turn.createdAt}>
                        {new Date(turn.createdAt).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    {turn.references.length > 0 && (
                      <div className="vchat-message-references">
                        {turn.references.map((reference) => (
                          <ReferencePreview
                            key={reference.id}
                            reference={reference}
                            compact
                          />
                        ))}
                      </div>
                    )}
                    <p>{turn.prompt}</p>
                    <div className="vchat-request-params">
                      <span>全能参考</span>
                      <span>{turn.resolution}</span>
                      <span>{turn.duration}s</span>
                      <span>{turn.references.length} 个参考素材</span>
                      <button
                        type="button"
                        aria-label={`编辑第 ${index + 1} 轮提示词`}
                        onClick={() => reuse(turn)}
                      >
                        <PencilLine size={13} /> 编辑
                      </button>
                    </div>
                  </div>
                  <div className="vchat-assistant-message">
                    <div className="vchat-assistant-avatar">
                      <Sparkles size={17} />
                    </div>
                    <div className="vchat-assistant-body">
                      <div className="vchat-assistant-heading">
                        <strong>Lilly 视频助手</strong>
                        <span>
                          {turn.status === "analyzing"
                            ? "正在分析"
                            : turn.status === "awaiting-confirmation"
                              ? "等你确认"
                              : turn.status === "preparing"
                                ? "正在准备成片"
                                : turn.status === "interrupted"
                                  ? "本轮已中断"
                                  : "本轮已保留"}
                        </span>
                      </div>
                      {turn.confirmedAt && turn.answers && (
                        <div
                          className="vchat-confirmed-answer"
                          aria-label="已确认的创作偏好"
                        >
                          <span>
                            <Check size={13} /> 你的选择
                          </span>
                          <p>
                            {turn.answers.rhythm === "dynamic"
                              ? "轻快流畅"
                              : "舒展自然"}{" "}
                            ·{" "}
                            {turn.answers.emphasis === "guide"
                              ? "突出指南"
                              : "均衡呈现"}
                          </p>
                        </div>
                      )}
                      {turn.status === "analyzing" ||
                      turn.status === "preparing" ? (
                        <VideoDemoProgress
                          key={turn.status}
                          phase={turn.status}
                          referenceCount={turn.references.length}
                        />
                      ) : turn.status === "awaiting-confirmation" ? (
                        <VideoDemoQuestions
                          answers={turn.answers || {}}
                          onChange={(answers) =>
                            chooseAnswers(turn.id, answers)
                          }
                          onConfirm={() => confirmAnswers(turn.id)}
                        />
                      ) : turn.status === "interrupted" ? (
                        <div className="vchat-interrupted">
                          <CircleAlert size={19} />
                          <div>
                            <strong>上次离开页面时，演示还未完成</strong>
                            <p>本轮提示词和素材已保留，可以重新提交。</p>
                            <button type="button" onClick={() => reuse(turn)}>
                              <RotateCcw size={14} /> 恢复到输入框
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="vchat-assistant-copy">
                            {turn.sample === "client-final"
                              ? "成片已就绪。创作偏好与本轮需求已保留，你可以播放查看，也可以修改提示词，再开始一轮创作。"
                              : "本轮需求已保存。下方保留此前的演示结果，可以编辑提示词继续创作。"}
                          </p>
                          <ResultVideo
                            turn={turn}
                            number={index + 1}
                            onReuse={() => reuse(turn)}
                            onNotify={notify}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="vchat-compose-area">
        {showScrollButton && (
          <button
            type="button"
            className="vchat-scroll-latest"
            onClick={() => scrollToLatest()}
          >
            <ArrowDown size={14} /> 回到最新
          </button>
        )}
        <div
          className={`vchat-composer ${turns.length > 0 && !prompt && !references.length ? "is-waiting" : ""} ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (event.dataTransfer.types.includes("Files")) {
              draggingDepth.current += 1;
              setDragging(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            draggingDepth.current -= 1;
            if (draggingDepth.current <= 0) setDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          {dragging && (
            <div className="vchat-drop-overlay">
              <ImagePlus size={25} />
              <strong>松开，添加参考素材</strong>
            </div>
          )}
          {sourceTurnId && (
            <div className="vchat-editing-note">
              <PencilLine size={13} />
              <span>
                正在编辑第{" "}
                {turns.findIndex((turn) => turn.id === sourceTurnId) + 1}{" "}
                轮提示词 · 发送后会保留原视频
              </span>
              <button
                type="button"
                aria-label="取消编辑引用"
                onClick={() => setSourceTurnId(undefined)}
              >
                <X size={13} />
              </button>
            </div>
          )}
          {(references.length > 0 || uploading) && (
            <div className="vchat-composer-references">
              {references.map((reference) => (
                <ReferencePreview
                  key={reference.id}
                  reference={reference}
                  onRemove={() =>
                    setReferences((current) =>
                      current.filter((item) => item.id !== reference.id),
                    )
                  }
                />
              ))}
              {uploading && (
                <div className="vchat-reference-loading">
                  <LoaderCircle size={20} className="vchat-spin" />
                  <span>读取素材</span>
                </div>
              )}
              {references.length < MAX_VIDEO_REFERENCES && !uploading && (
                <button
                  type="button"
                  className="vchat-add-reference"
                  aria-label="继续添加参考素材"
                  onClick={() => uploadRef.current?.click()}
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={prompt}
            disabled={!ready}
            rows={turns.length > 0 && !prompt && !references.length ? 1 : 3}
            maxLength={4000}
            aria-label="视频提示词"
            placeholder={
              awaitingConfirmation
                ? "请在上方选择创作偏好，确认后继续生成…"
                : pending
                  ? "正在准备本轮内容，你可以先写下下一轮的想法…"
                  : turns.length
                    ? "继续描述你想调整的画面，或点击上方“编辑提示词”再次创作…"
                    : "描述你想生成的视频。可以添加参考图，告诉我主体、动作、镜头与氛围…"
            }
            onChange={(event) => setPrompt(event.target.value)}
            onPaste={onPaste}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="vchat-composer-toolbar">
            <div className="vchat-composer-options">
              <button
                type="button"
                className="vchat-upload-button"
                title="支持图片、视频与音频；最多 6 个参考素材"
                aria-label="添加参考素材"
                disabled={
                  !ready ||
                  uploading ||
                  references.length >= MAX_VIDEO_REFERENCES
                }
                onClick={() => uploadRef.current?.click()}
              >
                <Plus size={18} />
              </button>
              <span className="vchat-toolbar-divider" />
              <span className="vchat-reference-mode">
                <ImagePlus size={14} /> 全能参考
              </span>
              <div className="vchat-resolution-control" ref={resolutionRef}>
                <button
                  ref={resolutionTriggerRef}
                  type="button"
                  className={`vchat-resolution-button ${resolutionOpen ? "is-open" : ""}`}
                  aria-label={`视频清晰度：${resolution}`}
                  aria-haspopup="listbox"
                  aria-expanded={resolutionOpen}
                  aria-controls="vchat-resolution-options"
                  onClick={() => {
                    setResolutionOpen((value) => !value);
                    setDurationOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                      event.preventDefault();
                      setResolutionOpen(true);
                      setDurationOpen(false);
                    }
                  }}
                >
                  {resolution}
                  <ChevronDown size={12} />
                </button>
                {resolutionOpen && (
                  <div className="vchat-resolution-popover">
                    <div
                      className="vchat-resolution-heading"
                      id="vchat-resolution-label"
                    >
                      视频清晰度
                    </div>
                    <div
                      id="vchat-resolution-options"
                      role="listbox"
                      aria-labelledby="vchat-resolution-label"
                    >
                      {resolutionOptions.map((option, index) => (
                        <button
                          key={option.value}
                          ref={(element) => {
                            resolutionOptionRefs.current[index] = element;
                          }}
                          type="button"
                          role="option"
                          aria-selected={resolution === option.value}
                          className="vchat-resolution-option"
                          tabIndex={resolution === option.value ? 0 : -1}
                          onClick={() => selectResolution(option.value)}
                          onKeyDown={(event) => {
                            if (
                              ["ArrowDown", "ArrowUp", "Home", "End"].includes(
                                event.key,
                              )
                            ) {
                              event.preventDefault();
                              const next =
                                event.key === "Home"
                                  ? 0
                                  : event.key === "End"
                                    ? resolutionOptions.length - 1
                                    : (index +
                                        (event.key === "ArrowDown" ? 1 : -1) +
                                        resolutionOptions.length) %
                                      resolutionOptions.length;
                              resolutionOptionRefs.current[next]?.focus();
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              setResolutionOpen(false);
                              resolutionTriggerRef.current?.focus();
                            } else if (event.key === "Tab") {
                              setResolutionOpen(false);
                              resolutionTriggerRef.current?.focus();
                            }
                          }}
                        >
                          <span>
                            <strong>{option.value}</strong>
                            <small>{option.label}</small>
                          </span>
                          {resolution === option.value && (
                            <Check size={15} strokeWidth={2} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="vchat-duration-control" ref={durationRef}>
                <button
                  type="button"
                  className={`vchat-duration-button ${durationOpen ? "is-open" : ""}`}
                  aria-expanded={durationOpen}
                  aria-controls="vchat-duration-options"
                  onClick={() => {
                    setDurationOpen((value) => !value);
                    setResolutionOpen(false);
                  }}
                >
                  <Clock3 size={13} /> {duration}s <ChevronDown size={12} />
                </button>
                {durationOpen && (
                  <div
                    className="vchat-duration-popover"
                    id="vchat-duration-options"
                  >
                    <div>
                      <strong>视频时长</strong>
                      <b>{duration}s</b>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={15}
                      step={1}
                      value={duration}
                      aria-label="视频时长，5 至 15 秒"
                      aria-valuetext={`${duration} 秒`}
                      onChange={(event) =>
                        setDuration(Number(event.target.value) as VideoDuration)
                      }
                    />
                    <div className="vchat-duration-labels">
                      <button
                        type="button"
                        aria-pressed={duration === 5}
                        onClick={() => setDuration(5)}
                      >
                        5s
                      </button>
                      <button
                        type="button"
                        aria-pressed={duration === 10}
                        onClick={() => setDuration(10)}
                      >
                        10s
                      </button>
                      <button
                        type="button"
                        aria-pressed={duration === 15}
                        onClick={() => setDuration(15)}
                      >
                        15s
                      </button>
                    </div>
                    <p>5–15 秒，每次调整 1 秒</p>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="vchat-send"
              disabled={!ready || !prompt.trim() || pending || uploading}
              onClick={submit}
            >
              {pending ? (
                <LoaderCircle size={17} className="vchat-spin" />
              ) : (
                <ArrowUp size={18} />
              )}
              <span>
                {awaitingConfirmation
                  ? "等待确认"
                  : pending
                    ? "处理中"
                    : "生成视频"}
              </span>
            </button>
          </div>
          <input
            ref={uploadRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg,audio/webm,audio/aac"
            className="vchat-file-input"
            aria-label="上传参考素材文件"
            onChange={onFiles}
          />
        </div>
        {error && (
          <div className="vchat-error" role="alert">
            <CircleAlert size={13} />
            <span>{error}</span>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => setError("")}
            >
              <X size={13} />
            </button>
          </div>
        )}
        <div className="vchat-composer-footer">
          <span>
            支持拖入、粘贴参考图 · 图片 ≤ 10 MB · 视频 ≤ 30 MB · 音频 ≤ 15 MB
          </span>
          <div className="vchat-footer-actions">
            <span>Enter 发送 · Shift + Enter 换行</span>
            <button
              type="button"
              disabled={!ready || pending || uploading}
              title="将三张参考图和提示词重新放入输入框，保留所有历史结果"
              onClick={() => void usePocReferences()}
            >
              <RotateCcw size={11} /> 载入演示
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
