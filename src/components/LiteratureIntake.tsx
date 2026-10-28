import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileSearch,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { h5Case, scriptCase } from "../literatureData";
import { caseInput, validateLiteratureInput } from "../lib/literatureWorkflow";
import { isExampleSubmission } from "../lib/literatureSubmission";
import {
  readLiteratureDocument,
  recognizeImageText,
  waitForTextPreview,
  type ImageTextProgress,
} from "../lib/literatureImport";
import "./LiteratureIntake.css";

export type LiteratureSubmission = {
  kind: "script" | "h5";
  mode: "example" | "custom";
  title: string;
  text: string;
  images: { id: string; name: string; src: string; text: string }[];
};

type IntakeProps = {
  kind: LiteratureSubmission["kind"];
  initialText?: string;
  onKindChange: (kind: LiteratureSubmission["kind"]) => void;
  onStart: (submission: LiteratureSubmission) => void;
  resumeLabel?: string;
  onResume?: () => void;
};

const MAX_IMAGES = 8;

type ExampleImage = LiteratureSubmission["images"][number];
type ImageParseState = ImageTextProgress & {
  status: "queued" | "parsing" | "ready" | "failed";
  example?: boolean;
  error?: string;
};
let exampleImagesByHash: Promise<Map<string, ExampleImage>> | undefined;

async function imageHash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function getExampleImagesByHash(): Promise<Map<string, ExampleImage>> {
  if (!exampleImagesByHash) {
    exampleImagesByHash = Promise.all(
      (h5Case.images || []).map(async (image) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(image.src, {
            signal: controller.signal,
          });
          if (!response.ok) return null;
          const hash = await imageHash(await response.arrayBuffer());
          return [
            hash,
            {
              id: image.id,
              src: image.src,
              name: image.label,
              text: h5Case.segments
                .filter((segment) => segment.imageId === image.id)
                .map((segment) => segment.original)
                .join("\n\n"),
            },
          ] as const;
        } catch {
          // Recognition is optional. A missing local sample or unavailable
          // Web Crypto must not prevent an ordinary image upload.
          return null;
        } finally {
          window.clearTimeout(timer);
        }
      }),
    ).then((entries) => new Map(entries.filter((entry) => entry !== null)));
  }
  return exampleImagesByHash;
}

async function recognizeExampleImage(
  file: File,
): Promise<ExampleImage | undefined> {
  try {
    const [hash, originals] = await Promise.all([
      imageHash(await file.arrayBuffer()),
      getExampleImagesByHash(),
    ]);
    return originals.get(hash);
  } catch {
    return undefined;
  }
}

function IntakeHeader({
  kind,
  onKindChange,
}: Pick<IntakeProps, "kind" | "onKindChange">) {
  return (
    <header className="li-header">
      <div className="li-brand">
        <span>
          <FileSearch size={22} />
        </span>
        <div>
          <h1>文献支持</h1>
          <p>让每一段表达，都有据可循。</p>
        </div>
      </div>
      <div className="li-kind-tabs" role="tablist" aria-label="文献任务类型">
        <button
          type="button"
          role="tab"
          aria-selected={kind === "script"}
          onClick={() => onKindChange("script")}
        >
          <FileText size={15} />
          达人脚本优化
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === "h5"}
          onClick={() => onKindChange("h5")}
        >
          <ImagePlus size={15} />
          H5 文献支持
        </button>
      </div>
    </header>
  );
}

function WorkflowSteps({ stage }: { stage: number }) {
  return (
    <ol className="li-workflow" aria-label="文献支持流程">
      {["上传内容", "分析与整理", "查看结果"].map((label, index) => (
        <li
          key={label}
          className={
            index === stage ? "active" : index < stage ? "complete" : ""
          }
          aria-current={index === stage ? "step" : undefined}
        >
          <span>{index < stage ? <Check size={13} /> : `0${index + 1}`}</span>
          {label}
          {index < 2 && <ChevronRight size={14} />}
        </li>
      ))}
    </ol>
  );
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法读取「${file.name}」`));
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      const timeout = window.setTimeout(
        () => reject(new Error(`「${file.name}」读取超时，请重试。`)),
        10000,
      );
      image.onload = () => {
        window.clearTimeout(timeout);
        resolve(src);
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error(`「${file.name}」不是可读取的图片。`));
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function LiteratureIntake({
  kind,
  initialText = "",
  onKindChange,
  onStart,
  resumeLabel,
  onResume,
}: IntakeProps) {
  const [text, setText] = useState(initialText);
  const [images, setImages] = useState<LiteratureSubmission["images"]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState<LiteratureSubmission["mode"]>("custom");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [parseStates, setParseStates] = useState<
    Record<string, ImageParseState>
  >({});
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputToken = useRef(0);
  const importController = useRef<AbortController | null>(null);
  const importing = useRef(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const selectedImage =
    images.find((image) => image.id === selectedId) || images[0];
  const selectedParse = selectedImage
    ? parseStates[selectedImage.id]
    : undefined;
  const parsingSelected =
    selectedParse?.status === "parsing" || selectedParse?.status === "queued";
  const combinedText =
    kind === "script" ? text : images.map((image) => image.text).join("\n\n");
  const validation = validateLiteratureInput(combinedText);
  const missingText = images.filter((image) => !image.text.trim()).length;
  const canStart =
    !busy &&
    !validation &&
    (kind === "script" || (images.length > 0 && !missingText));

  useEffect(
    () => () => {
      inputToken.current++;
      importController.current?.abort();
    },
    [],
  );

  function beginImport() {
    importController.current?.abort();
    const controller = new AbortController();
    importController.current = controller;
    const token = ++inputToken.current;
    importing.current = true;
    setBusy(true);
    setError("");
    setUploadNote("");
    return { token, signal: controller.signal };
  }

  function finishImport(token: number) {
    if (inputToken.current !== token) return;
    importing.current = false;
    setBusy(false);
    importController.current = null;
  }

  async function parseImageTexts(
    pendingImages: LiteratureSubmission["images"],
    originals: Map<string, string>,
    token: number,
    signal: AbortSignal,
  ) {
    const current = () => inputToken.current === token && !signal.aborted;
    const failures: string[] = [];
    for (const image of pendingImages) {
      if (!current()) return;
      const exampleText = originals.get(image.id);
      const report = (value: ImageTextProgress) => {
        if (current())
          setParseStates((states) => ({
            ...states,
            [image.id]: {
              status: "parsing",
              example: exampleText !== undefined,
              ...value,
            },
          }));
      };
      try {
        let parsed: string;
        if (exampleText !== undefined) {
          report({ phase: "读取示例图片", progress: 0.2 });
          await waitForTextPreview(400, signal);
          report({ phase: "整理图片文字", progress: 0.65 });
          await waitForTextPreview(500, signal);
          parsed = exampleText;
        } else {
          parsed = await recognizeImageText(image.src, signal, report);
        }
        if (!current()) return;
        // Never restore a removed image or replace text in another upload run.
        const next = imagesRef.current.map((item) =>
          item.id === image.id ? { ...item, text: parsed } : item,
        );
        imagesRef.current = next;
        setImages(next);
        setParseStates((states) => ({
          ...states,
          [image.id]: {
            status: "ready",
            phase: "文字已解析",
            progress: 1,
            example: exampleText !== undefined,
          },
        }));
      } catch (reason) {
        if (!current()) return;
        const message =
          reason instanceof Error
            ? reason.message
            : "解析失败，请手动补充文字。";
        failures.push(image.name);
        setParseStates((states) => ({
          ...states,
          [image.id]: {
            status: "failed",
            phase: "请手动补充文字",
            error: message,
          },
        }));
      }
    }
    if (!current()) return;
    const nextImages = imagesRef.current;
    const example = isExampleSubmission({
      kind: "h5",
      mode: "example",
      title: title || "H5 图片文献支持",
      text: nextImages.map((image) => image.text).join("\n\n"),
      images: nextImages,
    });
    setMode(example ? "example" : "custom");
    if (failures.length)
      setUploadNote(
        `${failures.length} 张图片未能完成文字解析，可选择对应图片手动补充。`,
      );
    else
      setUploadNote(
        example
          ? "三张图片文字已整理完成，可逐图核对后开始分析。"
          : "图片文字已解析，请核对数字、标点和引用编号后继续。",
      );
  }

  async function loadExample() {
    if (importing.current) return;
    setError("");
    setUploadNote("");
    setMode("example");
    if (kind === "script") {
      setTitle(scriptCase.title);
      setText(caseInput(scriptCase));
      return;
    }
    const { token, signal } = beginImport();
    const exampleImages = (h5Case.images || []).map((image) => ({
      id: image.id,
      src: image.src,
      name: image.label,
      text: "",
    }));
    const originals = new Map(
      exampleImages.map((image) => [
        image.id,
        h5Case.segments
          .filter((segment) => segment.imageId === image.id)
          .map((segment) => segment.original)
          .join("\n\n"),
      ]),
    );
    imagesRef.current = exampleImages;
    setImages(exampleImages);
    setParseStates(
      Object.fromEntries(
        exampleImages.map((image) => [
          image.id,
          { status: "queued", phase: "等待解析", example: true },
        ]),
      ),
    );
    setSelectedId(exampleImages[0]?.id || "");
    setTitle(h5Case.title);
    try {
      await parseImageTexts(exampleImages, originals, token, signal);
    } finally {
      finishImport(token);
    }
  }

  async function importFiles(files: File[]) {
    if (!files.length || importing.current) return;
    setError("");
    setUploadNote("");
    if (kind === "script") {
      if (files.length !== 1) {
        setError("请一次上传一份 Word（.docx）或 TXT 文件。");
        return;
      }
      const file = files[0];
      const { token } = beginImport();
      try {
        const next = await readLiteratureDocument(file);
        if (inputToken.current !== token) return;
        const issue = validateLiteratureInput(next);
        if (issue) throw new Error(issue);
        setText(next);
        setTitle(file.name.replace(/\.(?:docx|txt)$/i, ""));
        setMode("custom");
        setUploadNote(`已读取「${file.name}」的文字，保留原有段落。`);
      } catch (err) {
        if (inputToken.current === token)
          setError(
            err instanceof Error ? err.message : "文稿读取失败，请重试。",
          );
      } finally {
        finishImport(token);
      }
      return;
    }
    if (files.length + imagesRef.current.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片。请先移除不需要的图片。`);
      return;
    }
    const invalid = files.find(
      (file) =>
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        !file.size ||
        file.size > 20 * 1024 * 1024,
    );
    if (invalid) {
      setError(
        `「${invalid.name}」不符合要求。请选择 20 MB 以内的 PNG、JPG 或 WebP 图片。`,
      );
      return;
    }
    const { token, signal } = beginImport();
    try {
      const decoded = await Promise.all(
        files.map(async (file) => {
          const [src, original] = await Promise.all([
            readImage(file),
            recognizeExampleImage(file),
          ]);
          return { file, src, original };
        }),
      );
      if (inputToken.current !== token) return;
      const current = imagesRef.current;
      const usedIds = new Set(current.map((image) => image.id));
      const originals = new Map<string, string>();
      const uploaded = decoded.map(({ file, src, original }) => {
        const id =
          original && !usedIds.has(original.id)
            ? original.id
            : crypto.randomUUID();
        usedIds.add(id);
        if (original) originals.set(id, original.text);
        return { id, name: file.name, src: original?.src || src, text: "" };
      });
      const nextImages = [...current, ...uploaded];
      imagesRef.current = nextImages;
      setImages(nextImages);
      setParseStates((states) => ({
        ...states,
        ...Object.fromEntries(
          uploaded.map((image) => [
            image.id,
            {
              status: "queued",
              phase: "等待解析",
              example: originals.has(image.id),
            },
          ]),
        ),
      }));
      setSelectedId(uploaded[0].id);
      setTitle(title || "H5 图片文献支持");
      setMode("custom");
      await parseImageTexts(uploaded, originals, token, signal);
    } catch (err) {
      if (inputToken.current === token)
        setError(err instanceof Error ? err.message : "图片读取失败，请重试。");
    } finally {
      finishImport(token);
    }
  }

  function cancelImageParsing() {
    inputToken.current++;
    importController.current?.abort();
    importController.current = null;
    importing.current = false;
    setBusy(false);
    setMode("custom");
    setParseStates((states) =>
      Object.fromEntries(
        Object.entries(states).map(([id, state]) => [
          id,
          state.status === "queued" || state.status === "parsing"
            ? {
                status: "failed",
                phase: "请手动补充文字",
                error: "文字解析已停止，可手动补充内容。",
              }
            : state,
        ]),
      ),
    );
    setUploadNote("已停止解析，已完成的文字会保留；其余图片可手动补充。");
  }

  function removeImage(id: string) {
    if (importing.current) cancelImageParsing();
    const next = imagesRef.current.filter((image) => image.id !== id);
    imagesRef.current = next;
    setImages(next);
    setParseStates((states) => {
      const nextStates = { ...states };
      delete nextStates[id];
      return nextStates;
    });
    setMode("custom");
    setError("");
    setUploadNote("");
  }

  function dropFiles(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }

  function submit() {
    if (!canStart) {
      setError(
        kind === "h5" && missingText
          ? "请为每张图片补充对应的文字内容。"
          : validation || "请先上传内容。",
      );
      return;
    }
    onStart({
      kind,
      mode,
      title:
        title.trim().slice(0, 300) ||
        (kind === "script" ? "新脚本文献支持" : "H5 图片文献支持"),
      text: combinedText,
      images,
    });
  }

  return (
    <main className="literature-intake">
      <IntakeHeader kind={kind} onKindChange={onKindChange} />
      <div className="li-content">
        <WorkflowSteps stage={0} />
        <section className="li-intro">
          <span className="li-eyebrow">LITERATURE & EVIDENCE</span>
          <h2>
            {kind === "script"
              ? "从一份脚本，开始专业表达。"
              : "上传 H5 图片，逐图核对内容。"}
          </h2>
          <p>
            {kind === "script"
              ? "上传或粘贴原文，整理段落、修改建议和对应文献。"
              : "每张图拥有独立的文字内容，结果中可随时点击图片切换查看。"}
          </p>
        </section>
        <section
          className={`li-upload-card ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setDragging(false);
          }}
          onDrop={dropFiles}
          aria-label={kind === "script" ? "上传或粘贴脚本" : "上传 H5 图片"}
        >
          <input
            ref={input}
            type="file"
            accept={
              kind === "script"
                ? ".docx,.doc,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                : "image/png,image/jpeg,image/webp"
            }
            multiple={kind === "h5"}
            hidden
            onChange={(event) => {
              void importFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <div className="li-card-heading">
            <div>
              {kind === "script" ? (
                <FileText size={18} />
              ) : (
                <ImagePlus size={18} />
              )}
              <strong>{kind === "script" ? "脚本原文" : "H5 图片"}</strong>
              <span>
                {kind === "script"
                  ? "Word / TXT / 粘贴文字"
                  : `${images.length} / ${MAX_IMAGES} 张`}
              </span>
            </div>
            <button
              className="li-text-button"
              type="button"
              onClick={() => void loadExample()}
              disabled={busy}
            >
              <Sparkles size={13} />
              {kind === "script" ? "使用示例文本" : "载入 3 张示例图"}
            </button>
          </div>
          {kind === "script" ? (
            <>
              <textarea
                className="li-script-input"
                aria-label="脚本原文"
                value={text}
                disabled={busy}
                onChange={(event) => {
                  setText(event.target.value);
                  setMode("custom");
                  setError("");
                }}
                placeholder={
                  "将需要分析的脚本粘贴在这里……\n\n也可以拖入 Word（.docx）或 TXT 文件，保留原文段落，后续可逐段核对。"
                }
              />
              <div className="li-input-footer">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  disabled={busy}
                >
                  <Upload size={14} />
                  上传 Word / TXT
                </button>
                <span>{text.length.toLocaleString()} / 40,000 字</span>
              </div>
            </>
          ) : (
            <>
              {!images.length ? (
                <button
                  type="button"
                  className="li-dropzone"
                  onClick={() => input.current?.click()}
                  disabled={busy}
                >
                  <span className="li-upload-icon">
                    <ImagePlus size={30} strokeWidth={1.4} />
                  </span>
                  <strong>点击上传，或将图片拖到这里</strong>
                  <span>可一次选择多张 H5 图片，按上传顺序整理</span>
                  <small>PNG、JPG、WebP · 单张不超过 20 MB · 最多 8 张</small>
                </button>
              ) : (
                <div className="li-image-workspace">
                  <div
                    className="li-image-rail"
                    role="group"
                    aria-label="已上传的 H5 图片"
                  >
                    {images.map((image, index) => (
                      <div
                        className={`li-image-tile ${selectedImage?.id === image.id ? "selected" : ""}`}
                        key={image.id}
                      >
                        <button
                          type="button"
                          className="li-image-select"
                          aria-pressed={selectedImage?.id === image.id}
                          aria-label={`选择图片 ${index + 1}：${image.name}`}
                          onClick={() => setSelectedId(image.id)}
                        >
                          <img src={image.src} alt={image.name} />
                          <span>
                            <b>{String(index + 1).padStart(2, "0")}</b>
                            {image.name}
                          </span>
                          <small>
                            {parseStates[image.id]?.status === "parsing"
                              ? "正在解析文字…"
                              : parseStates[image.id]?.status === "queued"
                                ? "等待解析"
                                : image.text.trim()
                                  ? "文字已准备好"
                                  : "待手动补充文字"}
                          </small>
                        </button>
                        <button
                          className="li-image-remove"
                          type="button"
                          onClick={() => removeImage(image.id)}
                          aria-label={`移除图片 ${index + 1}：${image.name}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        className="li-add-image"
                        disabled={busy}
                        onClick={() => input.current?.click()}
                      >
                        <Plus size={20} />
                        <span>添加图片</span>
                      </button>
                    )}
                  </div>
                  {selectedImage && (
                    <div
                      className="li-image-transcript"
                      aria-busy={parsingSelected}
                    >
                      <div>
                        <strong>这张图的文字内容</strong>
                        <span>
                          图{" "}
                          {images.findIndex(
                            (image) => image.id === selectedImage.id,
                          ) + 1}
                        </span>
                      </div>
                      {parsingSelected ? (
                        <div
                          className="li-parse-panel"
                          role="status"
                          aria-live="polite"
                        >
                          <div className="li-parse-icon">
                            <FileSearch size={27} strokeWidth={1.4} />
                            <LoaderCircle size={14} className="li-spin" />
                          </div>
                          <strong>
                            {selectedParse.status === "queued"
                              ? "等待解析图片文字"
                              : "正在解析图片文字"}
                          </strong>
                          <p>
                            {selectedParse.phase}
                            {selectedParse.progress !== undefined &&
                              ` · ${Math.round(selectedParse.progress * 100)}%`}
                          </p>
                          <progress
                            max={1}
                            value={selectedParse.progress}
                            aria-label="图片文字解析进度"
                          />
                          <small>
                            {selectedParse.example
                              ? "正在按原图整理示例文字，完成后可逐图核对。"
                              : "解析完成后，文字会显示在这里供你核对与编辑。"}
                          </small>
                          <button type="button" onClick={cancelImageParsing}>
                            停止解析，手动填写
                          </button>
                        </div>
                      ) : (
                        <>
                          {selectedParse?.error && (
                            <p className="li-parse-error" role="status">
                              {selectedParse.error}
                            </p>
                          )}
                          <textarea
                            aria-label={`图片 ${images.findIndex((image) => image.id === selectedImage.id) + 1} 的文字内容`}
                            value={selectedImage.text}
                            onChange={(event) => {
                              const next = imagesRef.current.map((image) =>
                                image.id === selectedImage.id
                                  ? { ...image, text: event.target.value }
                                  : image,
                              );
                              imagesRef.current = next;
                              setImages(next);
                              setParseStates((states) => ({
                                ...states,
                                [selectedImage.id]: {
                                  status: "ready",
                                  phase: "文字已填写",
                                },
                              }));
                              setMode("custom");
                              setError("");
                            }}
                            placeholder="粘贴或输入这张图片中的文字，使用空行区分内容段落。"
                          />
                          <small className="li-transcript-note">
                            {selectedParse?.example
                              ? "示例文字已按原图整理，可点击不同图片核对。"
                              : "请对照原图核对文字、数字与引用编号，可在这里直接修改。"}
                          </small>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {images.length > 0 && (
                <div className="li-image-summary">
                  <span>
                    已添加 {images.length} 张图片 ·{" "}
                    {images
                      .reduce((count, image) => count + image.text.length, 0)
                      .toLocaleString()}{" "}
                    字
                  </span>
                  <span>
                    {busy
                      ? "正在解析图片文字…"
                      : missingText
                        ? `${missingText} 张待补充文字`
                        : "各图文字已准备好"}
                  </span>
                </div>
              )}
            </>
          )}
          {busy && (kind === "script" || !images.length) && (
            <div className="li-feedback" role="status">
              <LoaderCircle className="li-spin" size={15} />
              {kind === "script" ? "正在解析文稿文字…" : "正在读取图片…"}
            </div>
          )}
          {!busy && uploadNote && (
            <div className="li-feedback" role="status">
              <Check size={15} />
              {uploadNote}
            </div>
          )}
          {(error || (combinedText.trim() && validation)) && (
            <p className="li-error" role="alert">
              {error || validation}
            </p>
          )}
          <div className="li-submit-row">
            <p>
              <BookOpen size={14} />
              示例含预置文献；新内容将建立待核查文稿。
            </p>
            <button
              type="button"
              className="li-start"
              onClick={submit}
              disabled={!canStart}
            >
              <Sparkles size={16} />
              开始分析
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <div className="li-bottom-note">
          <span>原文与修改建议分别保留，结果可继续编辑和导出。</span>
          {onResume && resumeLabel && (
            <button type="button" onClick={onResume}>
              <RotateCcw size={12} />
              继续上次文稿：{resumeLabel}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export function LiteratureLoading({
  submission,
  step,
  onCancel,
}: {
  submission: LiteratureSubmission;
  step: number;
  onCancel: () => void;
}) {
  const example = submission.mode === "example";
  const steps = example
    ? [
        {
          title: "整理内容",
          detail:
            submission.kind === "h5"
              ? "按图片顺序整理原文，保留各图的内容关联。"
              : "整理原文段落，保留脚本的表达和顺序。",
        },
        {
          title: "关联预置证据",
          detail: "载入示例已保存的文献、支持范围和核对记录。",
        },
        {
          title: "准备审阅结果",
          detail: "将原文、修改建议与可点击的文献入口放在一起。",
        },
      ]
    : [
        {
          title: "整理内容",
          detail:
            submission.kind === "h5"
              ? "按图片整理你提供的文字内容。"
              : "将上传的文字整理为可逐段编辑的文稿。",
        },
        {
          title: "标记待核查项",
          detail: "保留原始表达，标记尚未建立文献支持的段落。",
        },
        {
          title: "准备文稿",
          detail: "准备可编辑的工作区，供继续补充和核对文献。",
        },
      ];
  const active = Math.max(0, Math.min(2, step));
  return (
    <main className="literature-intake li-loading-page">
      <header className="li-header">
        <div className="li-brand">
          <span>
            <FileSearch size={22} />
          </span>
          <div>
            <h1>文献支持</h1>
            <p>让每一段表达，都有据可循。</p>
          </div>
        </div>
      </header>
      <div className="li-content">
        <WorkflowSteps stage={1} />
        <section
          className="li-loading-card"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="li-thinking-icon">
            <FileSearch size={32} strokeWidth={1.4} />
            <span />
          </div>
          <span className="li-eyebrow">
            {example ? "示例分析流程" : "内容整理中"}
          </span>
          <h2>{steps[active].title}</h2>
          <p>{steps[active].detail}</p>
          <div className="li-loading-source">
            {submission.kind === "h5" ? (
              <ImagePlus size={16} />
            ) : (
              <FileText size={16} />
            )}
            <span>{submission.title}</span>
            <small>
              {submission.kind === "h5"
                ? `${submission.images.length} 张图片`
                : `${submission.text.length.toLocaleString()} 字`}
            </small>
          </div>
          <ol className="li-analysis-steps">
            {steps.map((item, index) => (
              <li
                key={item.title}
                className={
                  index === active ? "active" : index < active ? "complete" : ""
                }
              >
                <span>
                  {index < active ? (
                    <Check size={14} />
                  ) : index === active ? (
                    <LoaderCircle className="li-spin" size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <strong>{item.title}</strong>
                <small>
                  {index < active
                    ? "已完成"
                    : index === active
                      ? "进行中"
                      : "待开始"}
                </small>
              </li>
            ))}
          </ol>
          <p className="li-loading-note">
            {example
              ? "展示本地已保存的示例分析，不执行实时联网检索。"
              : "新内容尚未自动匹配文献，整理后可继续人工核查。"}
          </p>
          <button type="button" className="li-text-button" onClick={onCancel}>
            <RotateCcw size={13} />
            返回上传，继续调整
          </button>
        </section>
      </div>
    </main>
  );
}
