import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  FileText,
  Images,
  LayoutTemplate,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  articleDraftHtml,
  articleDraftText,
  type ArticleDraft,
  type ArticleSection,
} from "../lib/articleWorkspace";
import "./ArticleResults.css";

type ArticleResultsProps = {
  draft: ArticleDraft;
  onChange: (next: ArticleDraft) => void;
  onNew: () => void;
  onEditSource: () => void;
  saveState: "saving" | "saved" | "error";
  onRetrySave: () => void;
};

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function ArticleResults({
  draft,
  onChange,
  onNew,
  onEditSource,
  saveState,
  onRetrySave,
}: ArticleResultsProps) {
  const [selectedId, setSelectedId] = useState(draft.sections[0]?.id || "");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [exportError, setExportError] = useState("");
  const editorScroll = useRef<HTMLDivElement>(null);
  const previewScroll = useRef<HTMLDivElement>(null);
  const previewSections = useRef<Record<string, HTMLElement | null>>({});
  const selectedIndex = Math.max(
    0,
    draft.sections.findIndex((section) => section.id === selectedId),
  );
  const selected = draft.sections[selectedIndex];
  const isSeries = draft.input.format === "series";
  const displayedSections = isSeries && selected ? [selected] : draft.sections;
  const selectedImage = draft.input.images.find(
    (image) => image.id === selected?.imageId,
  );
  const bodyLength = draft.sections.reduce(
    (total, section) => total + section.body.length,
    0,
  );

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const image of draft.input.images) {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(
        image.src,
      );
      if (!match) continue;
      try {
        const bytes = Uint8Array.from(atob(match[2]), (char) =>
          char.charCodeAt(0),
        );
        urls[image.id] = URL.createObjectURL(
          new Blob([bytes], { type: match[1] }),
        );
      } catch {
        // Persisted inputs are validated by the model; keep the preview usable
        // if an individual image cannot be turned into a separate original tab.
      }
    }
    setImageUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [draft.input.images]);

  function updateSection(patch: Partial<ArticleSection>) {
    if (!selected) return;
    onChange({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === selected.id ? { ...section, ...patch } : section,
      ),
      updatedAt: Date.now(),
    });
  }

  function selectSection(index: number) {
    const section = draft.sections[index];
    if (!section) return;
    setSelectedId(section.id);
    editorScroll.current?.scrollTo({ top: 0, behavior: "instant" });
    if (isSeries)
      previewScroll.current?.scrollTo({ top: 0, behavior: "instant" });
    else {
      const viewport = previewScroll.current;
      const target = previewSections.current[section.id];
      if (viewport && target)
        viewport.scrollTo({
          top:
            viewport.scrollTop +
            target.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top -
            14,
          behavior: "instant",
        });
    }
  }

  function exportDraft(format: "html" | "txt") {
    const filename = (draft.input.title.trim() || "新的图文创作").replace(
      /[\\/:*?"<>|]/g,
      "-",
    );
    try {
      download(
        format === "html" ? articleDraftHtml(draft) : articleDraftText(draft),
        `${filename}.${format}`,
        format === "html"
          ? "text/html;charset=utf-8"
          : "text/plain;charset=utf-8",
      );
      setExportError("");
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "导出失败，请检查文稿后重试。",
      );
    }
  }

  return (
    <main className="article-results">
      <header className="ar-header">
        <div className="ar-brand">
          <span>
            <FileImage size={21} />
          </span>
          <div>
            <h1>图文创作</h1>
            <p>
              上传内容 <ChevronRight size={10} /> 分析与编排{" "}
              <ChevronRight size={10} /> <b>查看结果</b>
            </p>
          </div>
        </div>
        <div className="ar-header-actions">
          <button type="button" className="ar-button" onClick={onNew}>
            <Plus size={14} />
            新建图文
          </button>
          <button type="button" className="ar-button" onClick={onEditSource}>
            <RotateCcw size={13} />
            调整输入
          </button>
          <button
            type="button"
            className="ar-button"
            onClick={() => exportDraft("txt")}
          >
            <FileText size={14} />
            导出文稿
          </button>
          <button
            type="button"
            className="ar-button ar-primary"
            onClick={() => exportDraft("html")}
          >
            <ArrowDownToLine size={14} />
            导出 HTML
          </button>
        </div>
      </header>
      {exportError && (
        <p className="ar-export-error" role="alert">
          {exportError}
        </p>
      )}

      <div className="ar-workspace">
        <section className="ar-editor-panel" aria-label="图文内容编辑">
          <header className="ar-panel-heading">
            <div>
              <Pencil size={15} />
              <h2>内容编辑</h2>
            </div>
            <span>
              {draft.sections.length} 个章节 · {bodyLength.toLocaleString()} 字
            </span>
          </header>
          <div className="ar-editor-scroll" ref={editorScroll}>
            <label className="ar-field">
              <span>文稿标题</span>
              <input
                aria-label="文稿标题"
                value={draft.input.title}
                maxLength={300}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    input: { ...draft.input, title: event.target.value },
                    updatedAt: Date.now(),
                  })
                }
              />
            </label>

            <div className="ar-format-field">
              <span>展示形式</span>
              <div
                className="ar-format-tabs"
                role="group"
                aria-label="展示形式"
              >
                <button
                  type="button"
                  aria-pressed={!isSeries}
                  onClick={() =>
                    onChange({
                      ...draft,
                      input: { ...draft.input, format: "long" },
                      updatedAt: Date.now(),
                    })
                  }
                >
                  <FileText size={14} />
                  长图文
                </button>
                <button
                  type="button"
                  aria-pressed={isSeries}
                  onClick={() =>
                    onChange({
                      ...draft,
                      input: { ...draft.input, format: "series" },
                      updatedAt: Date.now(),
                    })
                  }
                >
                  <Images size={14} />
                  系列图文
                </button>
              </div>
            </div>

            <details className="ar-source-brief">
              <summary>查看原始需求与正文</summary>
              {draft.input.brief && (
                <div>
                  <strong>创作需求</strong>
                  <p>{draft.input.brief}</p>
                </div>
              )}
              <div>
                <strong>原始正文</strong>
                <p>
                  {draft.input.text ||
                    "本次仅上传了图片素材，可在下方补充文案。"}
                </p>
              </div>
            </details>

            <div className="ar-section-nav-heading">
              <strong>章节内容</strong>
              <span>点击切换并编辑</span>
            </div>
            <nav className="ar-section-nav" aria-label="图文章节">
              {draft.sections.map((section, index) => (
                <button
                  type="button"
                  key={section.id}
                  aria-current={
                    selected?.id === section.id ? "true" : undefined
                  }
                  onClick={() => selectSection(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{section.title || `章节 ${index + 1}`}</b>
                </button>
              ))}
            </nav>

            {selected && (
              <div className="ar-section-editor">
                <div className="ar-active-section">
                  <span>
                    正在编辑 · 章节 {String(selectedIndex + 1).padStart(2, "0")}
                  </span>
                  <Pencil size={12} />
                </div>
                <label className="ar-field">
                  <span>章节标题</span>
                  <input
                    aria-label="章节标题"
                    value={selected.title}
                    maxLength={300}
                    onChange={(event) =>
                      updateSection({ title: event.target.value })
                    }
                  />
                </label>
                <label className="ar-field">
                  <span>正文</span>
                  <textarea
                    aria-label="章节正文"
                    value={selected.body}
                    rows={7}
                    maxLength={Math.max(
                      0,
                      40000 - bodyLength + selected.body.length,
                    )}
                    onChange={(event) =>
                      updateSection({ body: event.target.value })
                    }
                    placeholder="为这一节补充正文…"
                  />
                </label>
                <label className="ar-field">
                  <span>搭配图片</span>
                  <select
                    aria-label="搭配图片"
                    value={selected.imageId || ""}
                    onChange={(event) =>
                      updateSection({
                        imageId: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">不使用图片</option>
                    {draft.input.images.map((image, index) => (
                      <option key={image.id} value={image.id}>
                        {index + 1}. {image.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedImage && (
                  <div className="ar-assigned-image">
                    <img src={selectedImage.src} alt={selectedImage.name} />
                    <div>
                      <strong>{selectedImage.name}</strong>
                      <span>素材原图</span>
                      {imageUrls[selectedImage.id] && (
                        <a
                          href={imageUrls[selectedImage.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看完整图 <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <footer
            className={`ar-save-status ${saveState === "error" ? "is-error" : ""}`}
            aria-live="polite"
          >
            {saveState === "saving" ? (
              <LoaderCircle className="ar-spin" size={13} />
            ) : (
              <CheckCheck size={13} />
            )}
            <span>
              {saveState === "saving"
                ? "正在保存修改…"
                : saveState === "saved"
                  ? "修改已保存在此浏览器"
                  : "修改未能保存，请重试或导出"}
            </span>
            {saveState === "error" && (
              <button type="button" onClick={onRetrySave}>
                重试保存
              </button>
            )}
          </footer>
        </section>

        <section className="ar-preview-panel" aria-label="图文编排预览">
          <header className="ar-panel-heading">
            <div>
              <LayoutTemplate size={16} />
              <h2>编排预览</h2>
            </div>
            <span className="ar-preview-badge">
              {isSeries ? "系列图文" : "长图文"}
            </span>
          </header>
          <div
            className={`ar-preview-scroll ${isSeries ? "ar-series-preview" : ""}`}
            ref={previewScroll}
          >
            <article className="ar-paper">
              <header className="ar-paper-cover">
                <span>LILLY · EDITORIAL</span>
                <h2>{draft.input.title.trim() || "新的图文创作"}</h2>
                <p>
                  {isSeries
                    ? `第 ${selectedIndex + 1} / ${draft.sections.length} 页`
                    : `${draft.sections.length} 个章节 · 连续阅读`}
                </p>
              </header>
              {displayedSections.map((section) => {
                const index = draft.sections.findIndex(
                  (item) => item.id === section.id,
                );
                const image = draft.input.images.find(
                  (item) => item.id === section.imageId,
                );
                return (
                  <section
                    className={`ar-paper-section ${section.id === selected?.id ? "is-selected" : ""}`}
                    key={section.id}
                    ref={(node) => {
                      previewSections.current[section.id] = node;
                    }}
                  >
                    <div className="ar-paper-section-title">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <button
                        type="button"
                        onClick={() => selectSection(index)}
                        aria-label={`编辑章节 ${index + 1}`}
                      >
                        <Pencil size={11} />
                        编辑本节
                      </button>
                    </div>
                    <h3>{section.title || `章节 ${index + 1}`}</h3>
                    {image && (
                      <figure>
                        <img src={image.src} alt={image.name} />
                        <figcaption>素材原图 · {image.name}</figcaption>
                      </figure>
                    )}
                    {section.body ? (
                      <p>{section.body}</p>
                    ) : (
                      <p className="ar-empty-copy">
                        可在左侧为这张图片补充文案。
                      </p>
                    )}
                  </section>
                );
              })}
              <footer>图文编排预览 · 内容以最终确认稿为准</footer>
            </article>
          </div>
          <footer className="ar-preview-footer">
            {isSeries ? (
              <div className="ar-page-navigation">
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  aria-label="上一页"
                  onClick={() => selectSection(selectedIndex - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  {selectedIndex + 1} / {draft.sections.length}
                </span>
                <button
                  type="button"
                  disabled={selectedIndex >= draft.sections.length - 1}
                  aria-label="下一页"
                  onClick={() => selectSection(selectedIndex + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : (
              <span>正文与图片随编辑即时更新</span>
            )}
            <small>本地编排预览 · 未调用图像生成模型</small>
          </footer>
        </section>
      </div>
    </main>
  );
}
