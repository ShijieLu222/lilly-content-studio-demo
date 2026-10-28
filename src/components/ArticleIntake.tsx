import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileImage,
  FileText,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { productInfo, seriesItems } from "../content";
import "./ArticleIntake.css";

export type ArticleInput = {
  title: string;
  brief: string;
  text: string;
  format: "long" | "series";
  images: { id: string; name: string; src: string }[];
  mode: "custom" | "example";
};

type ArticleIntakeProps = {
  initialBrief?: string;
  initialInput?: ArticleInput;
  onStart: (input: ArticleInput) => void;
  onResume?: () => void;
  resumeLabel?: string;
  exampleImages?: ArticleInput["images"];
};

function ArticleHeader() {
  return (
    <header className="ai-header">
      <div className="ai-brand">
        <span>
          <FileImage size={22} />
        </span>
        <div>
          <h1>图文创作</h1>
          <p>从原始内容，到一份清楚的图文表达。</p>
        </div>
      </div>
      <span className="ai-header-note">ARTICLE STUDIO</span>
    </header>
  );
}

function ArticleSteps({ stage }: { stage: number }) {
  return (
    <ol className="ai-workflow" aria-label="图文创作流程">
      {["上传内容", "分析与编排", "查看结果"].map((label, index) => (
        <li
          key={label}
          className={
            index === stage ? "active" : index < stage ? "complete" : ""
          }
          aria-current={index === stage ? "step" : undefined}
        >
          <span>{index < stage ? <Check size={13} /> : `0${index + 1}`}</span>
          {label}
          {index < 2 && <ChevronRight size={13} />}
        </li>
      ))}
    </ol>
  );
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`无法读取「${file.name}」，请重试。`));
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      const timeout = window.setTimeout(
        () => reject(new Error(`「${file.name}」读取超时，请换一张图片。`)),
        10000,
      );
      image.onload = () => {
        window.clearTimeout(timeout);
        if (image.naturalWidth && image.naturalHeight) resolve(src);
        else reject(new Error(`「${file.name}」没有有效画面。`));
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        reject(
          new Error(
            `「${file.name}」无法解码，请重新导出为 PNG、JPG 或 WebP。`,
          ),
        );
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function ArticleIntake({
  initialBrief = "",
  initialInput,
  onStart,
  onResume,
  resumeLabel,
  exampleImages = [],
}: ArticleIntakeProps) {
  const [title, setTitle] = useState(initialInput?.title || "");
  const [brief, setBrief] = useState(initialInput?.brief ?? initialBrief);
  const [text, setText] = useState(initialInput?.text || "");
  const [format, setFormat] = useState<ArticleInput["format"]>(
    initialInput?.format || "long",
  );
  const [images, setImages] = useState<ArticleInput["images"]>(
    () => initialInput?.images.map((image) => ({ ...image })) || [],
  );
  const [mode, setMode] = useState<ArticleInput["mode"]>(
    initialInput?.mode || "custom",
  );
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const textInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const token = useRef(0);
  const issue =
    text.length > 40000
      ? "正文超过 40,000 字，请缩减后继续。"
      : brief.length > 10000
        ? "创作需求超过 10,000 字，请缩减后继续。"
        : title.length > 300
          ? "标题请控制在 300 字以内。"
          : "";
  const canStart = !busy && !issue && (!!text.trim() || images.length > 0);

  useEffect(
    () => () => {
      token.current++;
    },
    [],
  );

  function edited() {
    setMode("custom");
    setError("");
  }

  function loadExample() {
    token.current++;
    setTitle("礼医 · 医生服务系列");
    setBrief(productInfo.article.starter);
    setText(
      seriesItems
        .map((item) => `${item.title}\n${item.description}`)
        .join("\n\n"),
    );
    setImages(exampleImages.slice(0, 8).map((image) => ({ ...image })));
    setMode("example");
    setError("");
    setBusy(false);
  }

  async function importFiles(files: File[]) {
    if (!files.length || busy) return;
    setError("");
    const textFiles = files.filter((file) => /\.txt$/i.test(file.name));
    const pictureFiles = files.filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );
    if (textFiles.length + pictureFiles.length !== files.length) {
      setError("支持 UTF-8 TXT 文本和 PNG、JPG、WebP 图片，请检查文件类型。");
      return;
    }
    if (textFiles.length > 1) {
      setError("每次可导入一份 TXT 正文，请先合并多个文本文件。");
      return;
    }
    if (images.length + pictureFiles.length > 8) {
      setError("最多添加 8 张图片，请先移除不需要的图片。");
      return;
    }
    if (textFiles.some((file) => !file.size || file.size > 2 * 1024 * 1024)) {
      setError("请选择 2 MB 以内的非空 TXT 文件。");
      return;
    }
    const invalid = pictureFiles.find(
      (file) => !file.size || file.size > 20 * 1024 * 1024,
    );
    if (invalid) {
      setError(`「${invalid.name}」不符合要求，单张图片不得超过 20 MB。`);
      return;
    }
    const current = ++token.current;
    setBusy(true);
    try {
      const uploadedText = textFiles.length
        ? await textFiles[0].text()
        : undefined;
      if (
        uploadedText !== undefined &&
        (uploadedText.includes("\0") || uploadedText.includes("\uFFFD"))
      )
        throw new Error(
          "文本编码无法识别，请另存为 UTF-8 TXT，或直接粘贴文字。",
        );
      if (
        uploadedText !== undefined &&
        (!uploadedText.trim() || uploadedText.length > 40000)
      )
        throw new Error("请导入有正文内容且不超过 40,000 字的 TXT 文本。");
      const uploadedImages = await Promise.all(
        pictureFiles.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          src: await readImage(file),
        })),
      );
      if (token.current !== current) return;
      if (uploadedText !== undefined) {
        setText(uploadedText);
        setTitle(
          (value) =>
            value || textFiles[0].name.replace(/\.txt$/i, "").slice(0, 300),
        );
      }
      setImages((value) => [...value, ...uploadedImages]);
      setMode("custom");
    } catch (err) {
      if (token.current === current)
        setError(err instanceof Error ? err.message : "文件读取失败，请重试。");
    } finally {
      if (token.current === current) setBusy(false);
    }
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }

  function submit() {
    if (!canStart) {
      setError(issue || "请先添加正文或至少一张图片，再开始编排。");
      return;
    }
    onStart({
      title:
        title.trim() ||
        text.trim().split(/\n/)[0]?.slice(0, 28) ||
        "新的图文创作",
      brief: brief.trim(),
      text,
      format,
      images: images.map((image) => ({ ...image })),
      mode,
    });
  }

  return (
    <main className="article-intake">
      <ArticleHeader />
      <div className="ai-content">
        <ArticleSteps stage={0} />
        <div className="ai-intro">
          <h2>把内容放进来，让图文成形。</h2>
          <p>上传文案与图片，整理顺序，进入可继续编辑的编排预览。</p>
        </div>
        <section
          className={`ai-upload-card${dragging ? " is-dragging" : ""}`}
          aria-label="图文创作内容上传"
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
          onDrop={drop}
        >
          <input
            ref={textInput}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(event) => {
              void importFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(event) => {
              void importFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <div className="ai-form-top">
            <label className="ai-title-field">
              <span>
                作品标题 <small>可选</small>
              </span>
              <input
                aria-label="作品标题"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  edited();
                }}
                placeholder="为这次创作取个名字"
              />
            </label>
            <fieldset className="ai-format">
              <legend>编排形式</legend>
              <div>
                <button
                  type="button"
                  aria-pressed={format === "long"}
                  onClick={() => {
                    setFormat("long");
                    edited();
                  }}
                >
                  <FileText size={14} />
                  长图文
                </button>
                <button
                  type="button"
                  aria-pressed={format === "series"}
                  onClick={() => {
                    setFormat("series");
                    edited();
                  }}
                >
                  <Images size={14} />
                  系列图文
                </button>
              </div>
            </fieldset>
          </div>
          <div className="ai-form-grid">
            <div className="ai-copy-panel">
              <div className="ai-field-heading">
                <label htmlFor="ai-article-text">
                  <FileText size={15} />
                  正文内容
                </label>
                <button
                  type="button"
                  className="ai-text-button"
                  onClick={loadExample}
                  disabled={busy}
                >
                  <Sparkles size={12} />
                  使用礼医示例
                </button>
              </div>
              <textarea
                id="ai-article-text"
                className="ai-body-input"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  edited();
                }}
                placeholder={
                  "粘贴需要编排的正文……\n\n用空行区分段落，也可以上传 TXT 文件。正文将按原意保留，图片不会自动转换为文字。"
                }
              />
              <div className="ai-input-footer">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => textInput.current?.click()}
                >
                  <Upload size={13} />
                  上传 TXT
                </button>
                <span>{text.length.toLocaleString()} / 40,000 字</span>
              </div>
            </div>
            <div className="ai-material-panel">
              <div className="ai-field-heading">
                <span>
                  <ImagePlus size={15} />
                  图片素材
                </span>
                <small>{images.length} / 8 张</small>
              </div>
              {images.length ? (
                <div className="ai-image-list" aria-label="已添加的图片">
                  {images.map((image, index) => (
                    <div className="ai-image-tile" key={image.id}>
                      <img src={image.src} alt={image.name} />
                      <span title={image.name}>
                        {index + 1}. {image.name}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`移除图片 ${index + 1}：${image.name}`}
                        onClick={() => {
                          setImages((current) =>
                            current.filter((item) => item.id !== image.id),
                          );
                          edited();
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      type="button"
                      className="ai-add-image"
                      disabled={busy}
                      onClick={() => imageInput.current?.click()}
                    >
                      <Plus size={18} />
                      <span>添加图片</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="ai-dropzone"
                  disabled={busy}
                  onClick={() => imageInput.current?.click()}
                >
                  <ImagePlus size={25} strokeWidth={1.4} />
                  <strong>点击上传或拖入图片</strong>
                  <span>PNG、JPG、WebP · 单张 20 MB 内</span>
                </button>
              )}
              <label className="ai-brief-field">
                <span>
                  创作需求 <small>可选</small>
                </span>
                <textarea
                  aria-label="创作需求"
                  value={brief}
                  onChange={(event) => {
                    setBrief(event.target.value);
                    edited();
                  }}
                  placeholder="受众、风格、使用场景，或需要特别保留的内容……"
                />
              </label>
            </div>
          </div>
          {(error || issue) && (
            <p className="ai-error" role="alert">
              {error || issue}
            </p>
          )}
          {busy && (
            <p className="ai-feedback" role="status">
              <LoaderCircle size={14} className="ai-spin" />
              正在读取文件…
            </p>
          )}
          <div className="ai-submit-row">
            <p>
              原文与图片分别保留，结果可编辑和导出。
              <small>本地编排演示，不自动改写正文或生成新图片。</small>
            </p>
            <button
              type="button"
              className="ai-start"
              disabled={!canStart}
              onClick={submit}
            >
              <Sparkles size={15} />
              开始分析与编排
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <div className="ai-bottom-note">
          <span>从空白开始，也可以主动载入示例体验完整流程。</span>
          {onResume && resumeLabel && (
            <button type="button" onClick={onResume}>
              <RotateCcw size={12} />
              继续上次创作：{resumeLabel}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export function ArticleLoading({
  step,
  onCancel,
}: {
  step: 0 | 1 | 2;
  onCancel: () => void;
}) {
  const steps = [
    { title: "整理文案", detail: "整理上传的段落与素材，保留你的原始内容。" },
    {
      title: "安排图文顺序",
      detail: "按正文与图片的顺序组织内容，建立可编辑的图文结构。",
    },
    {
      title: "准备可编辑预览",
      detail: "准备编排预览和内容编辑区，稍后可继续调整。",
    },
  ];
  const active = Math.max(0, Math.min(2, step));
  return (
    <main className="article-intake ai-loading-page">
      <ArticleHeader />
      <div className="ai-content">
        <ArticleSteps stage={1} />
        <section
          className="ai-loading-card"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="ai-thinking-icon">
            <FileImage size={31} strokeWidth={1.5} />
            <span />
          </div>
          <span className="ai-eyebrow">正在整理你的创作</span>
          <h2>{steps[active].title}</h2>
          <p>{steps[active].detail}</p>
          <ol className="ai-analysis-steps">
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
                    <LoaderCircle className="ai-spin" size={14} />
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
          <p className="ai-loading-note">本地编排演示 · 未调用图像生成模型</p>
          <button type="button" className="ai-text-button" onClick={onCancel}>
            <RotateCcw size={13} />
            返回上传，继续调整
          </button>
        </section>
      </div>
    </main>
  );
}
