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
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputToken = useRef(0);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const selectedImage =
    images.find((image) => image.id === selectedId) || images[0];
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
    },
    [],
  );

  function loadExample() {
    inputToken.current++;
    setBusy(false);
    setError("");
    setUploadNote("");
    setMode("example");
    if (kind === "script") {
      setTitle(scriptCase.title);
      setText(caseInput(scriptCase));
    } else {
      const exampleImages = (h5Case.images || []).map((image) => ({
        id: image.id,
        src: image.src,
        name: image.label,
        text: h5Case.segments
          .filter((segment) => segment.imageId === image.id)
          .map((segment) => segment.original)
          .join("\n\n"),
      }));
      setImages(exampleImages);
      setSelectedId(exampleImages[0]?.id || "");
      setTitle(h5Case.title);
    }
  }

  async function importFiles(files: File[]) {
    if (!files.length || busy) return;
    const token = ++inputToken.current;
    setError("");
    setUploadNote("");
    if (kind === "script") {
      const file = files[0];
      if (files.length !== 1 || !/\.txt$/i.test(file.name)) {
        setError("请上传一份 UTF-8 TXT 文本，或直接粘贴脚本。");
        return;
      }
      if (!file.size || file.size > 2 * 1024 * 1024) {
        setError("请选择 2 MB 以内的非空 TXT 文件。");
        return;
      }
      setBusy(true);
      try {
        const next = await file.text();
        if (inputToken.current !== token) return;
        if (next.includes("\0") || next.includes("\uFFFD"))
          throw new Error(
            "文件编码无法识别，请另存为 UTF-8 TXT，或直接粘贴文字。",
          );
        const issue = validateLiteratureInput(next);
        if (issue) throw new Error(issue);
        setText(next);
        setTitle(file.name.replace(/\.txt$/i, ""));
        setMode("custom");
      } catch (err) {
        if (inputToken.current === token)
          setError(
            err instanceof Error ? err.message : "文本读取失败，请重试。",
          );
      } finally {
        if (inputToken.current === token) setBusy(false);
      }
      return;
    }
    if (files.length + images.length > MAX_IMAGES) {
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
    setBusy(true);
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
      const uploaded = decoded.map(({ file, src, original }) => {
        const id =
          original && !usedIds.has(original.id)
            ? original.id
            : crypto.randomUUID();
        usedIds.add(id);
        return {
          id,
          name: file.name,
          src: original?.src || src,
          text: original?.text || "",
        };
      });
      const nextImages = [...current, ...uploaded];
      const nextTitle = title || "H5 图片文献支持";
      const isCompleteExample = isExampleSubmission({
        kind: "h5",
        mode: "example",
        title: nextTitle,
        text: nextImages.map((image) => image.text).join("\n\n"),
        images: nextImages,
      });
      setImages(nextImages);
      setSelectedId(uploaded[0].id);
      setTitle(nextTitle);
      setMode(isCompleteExample ? "example" : "custom");
      const recognizedCount = decoded.filter((item) => item.original).length;
      if (recognizedCount)
        setUploadNote(
          `${recognizedCount} 张已识别为示例原图，载入已整理文字。${isCompleteExample ? "三张原图齐全，可查看预置文献分析。" : "当前组合将作为新内容整理，文献待核查。"}`,
        );
    } catch (err) {
      if (inputToken.current === token)
        setError(err instanceof Error ? err.message : "图片读取失败，请重试。");
    } finally {
      if (inputToken.current === token) setBusy(false);
    }
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
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
                ? ".txt,text/plain"
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
                  ? "TXT / 粘贴文字"
                  : `${images.length} / ${MAX_IMAGES} 张`}
              </span>
            </div>
            <button
              className="li-text-button"
              type="button"
              onClick={loadExample}
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
                onChange={(event) => {
                  setText(event.target.value);
                  setMode("custom");
                  setError("");
                }}
                placeholder={
                  "将需要分析的脚本粘贴在这里……\n\n也可以拖入一份 TXT 文本。使用空行区分段落，后续可逐段核对。"
                }
              />
              <div className="li-input-footer">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  disabled={busy}
                >
                  <Upload size={14} />
                  上传 TXT 文本
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
                            {image.text.trim() ? "已填写文字" : "待补充文字"}
                          </small>
                        </button>
                        <button
                          className="li-image-remove"
                          type="button"
                          disabled={busy}
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
                    <div className="li-image-transcript">
                      <div>
                        <strong>这张图的文字内容</strong>
                        <span>
                          图{" "}
                          {images.findIndex(
                            (image) => image.id === selectedImage.id,
                          ) + 1}
                        </span>
                      </div>
                      <textarea
                        aria-label={`图片 ${images.findIndex((image) => image.id === selectedImage.id) + 1} 的文字内容`}
                        value={selectedImage.text}
                        onChange={(event) => {
                          setImages((current) =>
                            current.map((image) =>
                              image.id === selectedImage.id
                                ? { ...image, text: event.target.value }
                                : image,
                            ),
                          );
                          setMode("custom");
                          setError("");
                        }}
                        placeholder="粘贴或输入这张图片中的文字，使用空行区分内容段落。"
                      />
                      <small>
                        {mode === "example"
                          ? "示例文字已按原图整理，可点击不同图片核对。"
                          : "请补充图片中的文字后继续；当前演示尚未接入自动文字识别。"}
                      </small>
                    </div>
                  )}
                </div>
              )}
              {images.length > 0 && (
                <div className="li-image-summary">
                  <span>
                    已添加 {images.length} 张图片 ·{" "}
                    {combinedText.length.toLocaleString()} 字
                  </span>
                  <span>
                    {missingText
                      ? `${missingText} 张待补充文字`
                      : "各图文字已准备好"}
                  </span>
                </div>
              )}
            </>
          )}
          {busy && (
            <div className="li-feedback" role="status">
              <LoaderCircle className="li-spin" size={15} />
              正在读取文件…
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
