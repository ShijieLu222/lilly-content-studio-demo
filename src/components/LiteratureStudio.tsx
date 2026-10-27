import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  FileSearch,
  FileText,
  GitBranch,
  ImagePlus,
  Info,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  literatureCases,
  type EvidenceReference,
  type EvidenceLink,
  type EvidenceStatus,
  type LiteratureCase,
  type LiteratureSegment,
} from "../literatureData";
import {
  LITERATURE_STORE,
  createLiteratureSession,
  restoreLiteratureSession,
  transitionLiterature,
  getLiteratureSegments,
  isPresetInput,
  createLiteratureReport,
  literatureReportMarkdown,
  literatureSteps,
  evidenceStatusLabels,
  validateLiteratureInput,
  type LiteratureAction,
  type LiteratureSession,
} from "../lib/literatureWorkflow";
import "./LiteratureStudio.css";

type ResultView = "comparison" | "manuscript" | "references" | "process";
const stepIcons = [
  FileText,
  ListChecks,
  Search,
  Sparkles,
  CheckCheck,
  BookOpen,
];
const safeHref = (url?: string) =>
  url && /^https?:\/\//i.test(url) ? url : undefined;
const citation = (reference: EvidenceReference) =>
  `${reference.authors}. ${reference.title}. ${reference.publication}${reference.doi ? ` DOI: ${reference.doi}` : ""}${reference.url ? ` ${reference.url}` : ""}`;

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function Status({ value }: { value: EvidenceStatus }) {
  return (
    <span className={`evidence-status evidence-status-${value}`}>
      {evidenceStatusLabels[value]}
    </span>
  );
}

function ReferenceCard({
  reference,
  number,
  links,
  onCopy,
}: {
  reference: EvidenceReference;
  number: number;
  links?: EvidenceLink[];
  onCopy: (text: string, label: string) => void;
}) {
  const url = safeHref(reference.url);
  const doiUrl = reference.doi
    ? `https://doi.org/${encodeURI(reference.doi)}`
    : undefined;
  const verificationLabel =
    reference.verificationLevel === "full-text"
      ? "全文段落已核对"
      : reference.verificationLevel === "abstract"
        ? "摘要级核对"
        : reference.verificationLevel === "official-document"
          ? "官方文件核对"
          : "来源已核对";
  const localUrl = reference.localUrl?.startsWith("/literature/references/")
    ? reference.localUrl
    : undefined;
  return (
    <article className="evidence-reference">
      <div className="evidence-ref-top">
        <span className="evidence-ref-number">
          {reference.label && /^\d+$/.test(reference.label)
            ? `[${reference.label}]`
            : `[${number}] ${reference.label || "参考文献"}`}
        </span>
        <span
          className={`evidence-ref-verified${reference.verified ? "" : " evidence-ref-pending"}`}
        >
          {reference.verified ? <CheckCheck size={11} /> : <Clock3 size={11} />}
          {reference.verified ? verificationLabel : "书目待核查"}
        </span>
      </div>
      <h4>{reference.title}</h4>
      <p className="evidence-ref-authors">{reference.authors}</p>
      <p className="evidence-ref-publication">{reference.publication}</p>
      {(reference.doi || reference.pmid) && (
        <div className="evidence-ref-id">
          {reference.doi && <span>DOI · {reference.doi}</span>}
          {reference.pmid && <span>PMID · {reference.pmid}</span>}
        </div>
      )}
      <dl className="evidence-ref-evidence">
        {links?.length ? (
          links.map((link, index) => (
            <div
              className="evidence-source-claim"
              key={`${link.referenceId}-${index}`}
            >
              {link.claim && (
                <div>
                  <dt>核对主张</dt>
                  <dd>{link.claim}</dd>
                </div>
              )}
              <div>
                <dt>支持位置</dt>
                <dd>
                  {link.locator}
                  {localUrl &&
                    /PDF第\d+页|PDF第\d+[–—-]/.test(link.locator) && (
                      <a
                        className="evidence-page-link"
                        href={`${localUrl}#page=${link.locator.match(/PDF第(\d+)/)?.[1]}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看对应 PDF 页 <ExternalLink size={11} />
                      </a>
                    )}
                </dd>
              </div>
              <div>
                <dt>与本段的关联</dt>
                <dd>{link.support}</dd>
              </div>
              <div className="evidence-ref-boundary">
                <dt>需要保留的边界</dt>
                <dd>{link.boundary}</dd>
              </div>
            </div>
          ))
        ) : (
          <div>
            <dt>来源适用范围</dt>
            <dd>{reference.scope}</dd>
          </div>
        )}
      </dl>
      <p className="evidence-ref-check-note">
        核对记录：{reference.verificationNote}
      </p>
      {reference.checkedSections?.length ? (
        <p className="evidence-ref-check-note">
          已查阅：{reference.checkedSections.join("；")}
          {reference.retrievedAt && ` · ${reference.retrievedAt}`}
        </p>
      ) : null}
      <div className="evidence-ref-actions">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={11} /> 来源原文
          </a>
        ) : (
          <span>原文入口待核查</span>
        )}
        {doiUrl && doiUrl !== url && (
          <a href={doiUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={11} /> DOI 入口
          </a>
        )}
        {localUrl && (
          <a href={localUrl} target="_blank" rel="noreferrer">
            <FileText size={11} /> 本地官方 PDF
          </a>
        )}
        <button
          type="button"
          onClick={() => onCopy(citation(reference), "引用")}
          aria-label={`复制引用：${reference.title}`}
        >
          <Copy size={11} /> 复制引用
        </button>
      </div>
    </article>
  );
}

function LockedResult({
  session,
  kind,
}: {
  session: LiteratureSession;
  kind: LiteratureCase["kind"];
}) {
  const busy = session.stage === 2 || session.stage === 3;
  const progress = new Set(session.completed).size;
  return (
    <section
      className="evidence-result evidence-locked"
      aria-label="文献报告尚未解锁"
    >
      <div className="evidence-locked-head">
        <div>
          <span className="evidence-eyebrow">YOUR EVIDENCE REPORT</span>
          <h2>最终成果</h2>
        </div>
        <span className="evidence-lock-badge">
          <LockKeyhole size={11} /> 尚未解锁
        </span>
      </div>
      <div className="evidence-locked-content">
        <div className="evidence-lock-art" aria-hidden="true">
          {busy ? (
            <LoaderCircle
              size={31}
              className="evidence-spin"
              strokeWidth={1.3}
            />
          ) : (
            <LockKeyhole size={31} strokeWidth={1.3} />
          )}
        </div>
        <h3>
          {busy
            ? "正在整理本次报告"
            : session.stage === 4
              ? "完成流程后，查看完整报告"
              : "先走完流程，再看见有依据的表达"}
        </h3>
        <p>
          {busy
            ? kind === "h5"
              ? "逐段对照、审阅建议与来源记录将在全部流程完成后一起呈现。"
              : "逐段对照、建议表达与来源记录将在全部流程完成后一起呈现。"
            : session.stage === 4
              ? kind === "h5"
                ? "请在左侧确认交付范围。确认后解锁逐段结果、审阅建议与文献清单。"
                : "请在左侧确认交付范围。确认后解锁逐段结果、完整建议稿与文献清单。"
              : "从确认原文开始，核对主张与交付范围，让每一段内容有清楚的来处。"}
        </p>
        <div className="evidence-lock-progress">
          <div>
            <span>本轮流程</span>
            <b>{progress} / 6 阶段</b>
          </div>
          <div
            className="evidence-progress-track"
            role="progressbar"
            aria-label="文献报告解锁进度"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={6}
          >
            <span style={{ width: `${(progress / 6) * 100}%` }} />
          </div>
          <p>
            <Clock3 size={11} /> 当前：{literatureSteps[session.stage]?.title}
          </p>
        </div>
        <div className="evidence-locked-footer">
          重新演示或编辑原文后，成果会重新收起。
        </div>
      </div>
    </section>
  );
}

function SourceSegmentButton({
  segment,
  selected,
  finished,
  onSelect,
}: {
  segment: LiteratureSegment;
  selected: boolean;
  finished: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="evidence-segment-button"
      aria-pressed={selected}
      onClick={onSelect}
      aria-label={`选择第 ${segment.sourceNumber} 段：${segment.title}`}
    >
      <span className="evidence-segment-top">
        <span className="evidence-segment-num">
          {segment.sourceNumber.padStart(2, "0")}
        </span>
        <span className="evidence-segment-title">
          <strong>{segment.title}</strong>
          <small>
            {segment.duration ? `${segment.duration} · ` : ""}
            {segment.imageId ? "H5 原文区域" : "保留原始段落"}
          </small>
        </span>
        <ChevronRight size={13} />
      </span>
      <span className="evidence-segment-original">{segment.original}</span>
      {finished && (
        <span style={{ display: "block", marginTop: 8 }}>
          <Status value={segment.status} />
        </span>
      )}
    </button>
  );
}

export default function LiteratureStudio({
  initialText,
  onConsumed,
}: {
  initialText?: string;
  onConsumed?: () => void;
}) {
  const [session, setSession] = useState<LiteratureSession>(() => {
    try {
      return restoreLiteratureSession(
        localStorage.getItem(LITERATURE_STORE),
        literatureCases,
      );
    } catch {
      return createLiteratureSession(literatureCases[0]);
    }
  });
  const [view, setView] = useState<ResultView>("comparison");
  const [notice, setNotice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const textInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const priorInitial = useRef<string | undefined>(undefined);
  const inputToken = useRef(0);
  const h5Viewport = useRef<HTMLDivElement>(null);
  const h5RegionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const currentCase =
    literatureCases.find((item) => item.id === session.caseId) ||
    literatureCases[0];
  const preset = isPresetInput(session, currentCase);
  const segments = getLiteratureSegments(session, currentCase);
  const selected = segments[session.selected] || segments[0];
  const report = createLiteratureReport(session, currentCase);
  const finished = !!report;
  const busy = session.stage === 2 || session.stage === 3;
  const sourceImage =
    currentCase.images?.find((item) => item.id === selectedImage) ||
    currentCase.images?.[0];
  const showH5Images = currentCase.kind === "h5" && preset;
  const resultSegment =
    report?.segments[session.selected] || report?.segments[0];
  const referenceIds = new Set(
    resultSegment?.evidence.map((item) => item.referenceId),
  );
  const selectedReferences =
    report?.references.filter((item) => referenceIds.has(item.id)) || [];

  function dispatch(action: LiteratureAction) {
    setSession((value) =>
      transitionLiterature(
        value,
        action,
        literatureCases.find((item) => item.id === value.caseId) ||
          literatureCases[0],
      ),
    );
  }
  function cancelFileWork() {
    inputToken.current += 1;
    setFileBusy(false);
  }
  function loadCase(item: LiteratureCase) {
    cancelFileWork();
    setImageUrl("");
    setSelectedImage(item.images?.[0]?.id || "");
    setNotice("");
    setView("comparison");
    dispatch({ type: "load", case: item });
  }
  function restart() {
    cancelFileWork();
    setView("comparison");
    setNotice("已收起报告。当前原文已保留，请重新确认本轮流程。");
    dispatch({ type: "reset" });
  }
  function editInput(text: string) {
    setView("comparison");
    dispatch({ type: "edit", text });
  }
  function selectSegment(index: number) {
    dispatch({ type: "select", index });
    const segment = segments[index];
    if (segment?.imageId) setSelectedImage(segment.imageId);
  }

  useEffect(() => {
    if (session.sourceVersion === currentCase.version) return;
    loadCase(currentCase);
    setNotice("文献资料已更新，请重新确认原文并运行本轮流程。");
  }, [currentCase.id, currentCase.version, session.sourceVersion]);

  useEffect(() => {
    try {
      localStorage.setItem(LITERATURE_STORE, JSON.stringify(session));
    } catch {
      setNotice("浏览器未能保存本轮记录。你仍可继续演示，并在完成后导出报告。");
    }
  }, [session]);

  useEffect(() => {
    if (session.stage !== 2 && session.stage !== 3) return;
    const runId = session.runId;
    const timer = window.setTimeout(
      () => {
        setSession((value) =>
          transitionLiterature(
            value,
            { type: "tick", runId },
            literatureCases.find((item) => item.id === value.caseId) ||
              literatureCases[0],
          ),
        );
      },
      session.stage === 2 ? 1800 : 1800,
    );
    return () => window.clearTimeout(timer);
  }, [session.stage, session.runId, session.caseId]);

  useEffect(() => {
    if (initialText === undefined) {
      priorInitial.current = undefined;
      return;
    }
    if (priorInitial.current === initialText) return;
    priorInitial.current = initialText;
    inputToken.current += 1;
    setFileBusy(false);
    setImageUrl("");
    setView("comparison");
    setNotice("");
    const item =
      literatureCases.find((entry) => entry.kind === "script") ||
      literatureCases[0];
    setSession((value) => {
      const loaded = transitionLiterature(
        value,
        { type: "load", case: item },
        item,
      );
      return initialText.trim()
        ? transitionLiterature(
            loaded,
            { type: "edit", text: initialText, imageName: "" },
            item,
          )
        : loaded;
    });
    onConsumed?.();
  }, [initialText, onConsumed]);

  useEffect(() => {
    if (!imageUrl) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(
    () => () => {
      inputToken.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!showH5Images || !selected || selected.imageId !== sourceImage?.id)
      return;
    const target = h5RegionRefs.current[selected.id];
    const viewport = h5Viewport.current;
    if (!target || !viewport) return;
    const center = target.offsetTop + target.offsetHeight / 2;
    viewport.scrollTop = Math.max(0, center - viewport.clientHeight / 2);
  }, [selected?.id, sourceImage?.id, showH5Images]);

  function parse() {
    const error = validateLiteratureInput(session.input);
    if (error) {
      setNotice(error);
      return;
    }
    setNotice("");
    dispatch({ type: "parse" });
  }
  function deliver() {
    dispatch({ type: "deliver" });
    setView("comparison");
    setNotice(
      currentCase.kind === "h5" && preset
        ? "本轮流程完成，逐段对照、审阅建议和文献记录已开放。"
        : "本轮流程完成，逐段对照、完整建议稿和文献记录已开放。",
    );
  }
  async function copy(text: string, label: string) {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label}已复制。`);
    } catch {
      setNotice("当前浏览器未允许复制，请使用报告导出保留内容。");
    }
  }
  function exportReport(format: "json" | "md") {
    if (!report) return;
    const name = `${report.title.replace(/[\\/:*?"<>|]/g, "-")}-V${report.version}`;
    download(
      format === "json"
        ? JSON.stringify(report, null, 2)
        : literatureReportMarkdown(report),
      `${name}.${format}`,
      format === "json"
        ? "application/json;charset=utf-8"
        : "text/markdown;charset=utf-8",
    );
    setNotice(
      `${format === "json" ? "JSON" : "Markdown"} 报告已导出，包含原文、建议表达、证据边界与过程记录。`,
    );
  }
  async function importText(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || fileBusy) return;
    if (!/\.txt$/i.test(file.name) || file.size > 50 * 1024) {
      setNotice("请选择 50 KB 以内的 TXT 文件。");
      return;
    }
    const token = ++inputToken.current;
    setFileBusy(true);
    dispatch({ type: "reset" });
    try {
      const text = await file.text();
      if (token !== inputToken.current) return;
      if (text.includes("\0")) throw new Error("invalid text");
      const error = validateLiteratureInput(text);
      if (error) {
        setNotice(error);
        return;
      }
      setImageUrl("");
      dispatch({ type: "edit", text, imageName: "" });
      setView("comparison");
      setNotice("TXT 已载入。自定义内容将保留原文，引用保持待核查。");
    } catch {
      if (token === inputToken.current)
        setNotice("无法读取脚本文件，请另存为 UTF-8 TXT 或直接粘贴文字。");
    } finally {
      if (token === inputToken.current) setFileBusy(false);
    }
  }
  async function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || fileBusy) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 20 * 1024 * 1024 ||
      !file.size
    ) {
      setNotice("请选择 20 MB 以内的 PNG、JPG 或 WebP 图片。");
      return;
    }
    const token = ++inputToken.current;
    setFileBusy(true);
    dispatch({ type: "reset" });
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        const timer = window.setTimeout(
          () => reject(new Error("图片读取超时")),
          10000,
        );
        image.onload = () => {
          clearTimeout(timer);
          image.naturalWidth > 0
            ? resolve()
            : reject(new Error("图片无有效画面"));
        };
        image.onerror = () => {
          clearTimeout(timer);
          reject(new Error("图片无法解码"));
        };
        image.src = url;
      });
      if (token !== inputToken.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setImageUrl(url);
      dispatch({
        type: "edit",
        text: session.imageName === file.name ? session.input : "",
        imageName: file.name,
      });
      setView("comparison");
      setNotice("图片已载入。请手动填写并确认图片文字；当前不会进行自动 OCR。");
    } catch {
      URL.revokeObjectURL(url);
      if (token === inputToken.current)
        setNotice("图片无法读取，请检查文件或重新导出后再试。");
    } finally {
      if (token === inputToken.current) setFileBusy(false);
    }
  }

  return (
    <div className="evidence-studio">
      <header className="evidence-heading">
        <div className="evidence-title">
          <FileSearch size={20} aria-hidden="true" />
          <h1>让每一段表达，都有据可循。</h1>
          <span className="evidence-local">本地演示</span>
        </div>
        <div
          className="evidence-modes"
          role="tablist"
          aria-label="文献任务类型"
        >
          {literatureCases.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === currentCase.id}
              onClick={() => item.id !== currentCase.id && loadCase(item)}
            >
              {item.kind === "script" ? (
                <FileText size={15} />
              ) : (
                <ImagePlus size={15} />
              )}
              {item.kind === "script" ? "达人脚本优化" : "H5 文献支持"}
            </button>
          ))}
        </div>
        <div className="evidence-header-actions">
          <button className="ev-button" type="button" onClick={restart}>
            <RotateCcw size={13} /> 重新演示
          </button>
          {finished && (
            <button
              className="ev-button ev-primary"
              type="button"
              onClick={() => exportReport("md")}
            >
              <ArrowDownToLine size={13} /> 导出报告
            </button>
          )}
        </div>
      </header>

      <ol className="evidence-steps" aria-label="文献工作流">
        {literatureSteps.map((step, index) => {
          const Icon = stepIcons[index];
          const done = session.completed.includes(index);
          const current = index === session.stage && !done;
          const status = done
            ? "已完成"
            : current
              ? busy
                ? "模拟进行中"
                : "等待确认"
              : "完成前序后解锁";
          return (
            <li
              key={step.title}
              className={`evidence-step${done ? " evidence-step-done" : ""}${current ? " evidence-step-current" : ""}`}
              aria-current={current ? "step" : undefined}
              title={`${step.title} · ${status}`}
            >
              <span className="evidence-step-icon" aria-hidden="true">
                {done ? <Check size={13} /> : <Icon size={13} />}
              </span>
              <span className="evidence-step-copy">
                <strong>{step.title}</strong>
                <small>{status}</small>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="evidence-columns">
        <section className="evidence-source" aria-label="原文与流程">
          <div className="evidence-panel-head">
            <div>
              <span className="evidence-eyebrow">SOURCE MATERIAL</span>
              <h2>
                {session.stage === 0 ? "确认本次输入" : "原文与待核对主张"}
              </h2>
            </div>
            <span className="evidence-count">
              {segments.length} 段 · V{session.version}
            </span>
          </div>
          <div className="evidence-source-scroll">
            <div className="evidence-source-card">
              <div>
                {preset ? <FileText size={13} /> : <ImagePlus size={13} />}
                <span>
                  {preset ? "核心 POC 原始材料" : "自定义输入 · 待建立证据"}
                </span>
              </div>
              <h3>
                {preset ? currentCase.title : session.imageName || "自定义脚本"}
              </h3>
              <p>
                {preset
                  ? currentCase.subtitle
                  : "保留原始表达，按段整理。自定义内容不使用固定案例的文献或改写。"}
              </p>
              {preset && currentCase.sourceFile && (
                <a
                  className="evidence-source-download"
                  href={currentCase.sourceFile}
                  download
                >
                  <ArrowDownToLine size={12} /> 下载原始 Word 脚本
                </a>
              )}
            </div>

            {session.stage === 0 && (
              <>
                <div className="evidence-input-tools">
                  <button
                    className="ev-button ev-small"
                    type="button"
                    onClick={() => textInput.current?.click()}
                    disabled={fileBusy}
                  >
                    <FileText size={12} /> 导入 TXT
                  </button>
                  <button
                    className="ev-button ev-small"
                    type="button"
                    onClick={() => imageInput.current?.click()}
                    disabled={fileBusy}
                  >
                    <ImagePlus size={12} /> 导入图片
                  </button>
                  <button
                    className="ev-button ev-small"
                    type="button"
                    onClick={() => loadCase(currentCase)}
                  >
                    <RotateCcw size={12} /> 载入原始案例
                  </button>
                </div>
                <input
                  ref={textInput}
                  type="file"
                  accept=".txt,text/plain"
                  hidden
                  aria-label="导入文献脚本TXT"
                  onChange={importText}
                />
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  aria-label="导入文献来源图片"
                  onChange={importImage}
                />
              </>
            )}

            {showH5Images && sourceImage && (
              <>
                <div
                  className="evidence-h5-images"
                  aria-label="选择 H5 原始截图"
                >
                  {currentCase.images?.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={sourceImage.id === item.id}
                      aria-label={`查看${item.label}`}
                      onClick={() => {
                        setSelectedImage(item.id);
                        const index = segments.findIndex(
                          (segment) => segment.imageId === item.id,
                        );
                        if (index >= 0) dispatch({ type: "select", index });
                      }}
                    >
                      <img src={item.src} alt="" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="evidence-h5-viewport" ref={h5Viewport}>
                  <div className="evidence-h5-canvas">
                    <img src={sourceImage.src} alt={sourceImage.label} />
                    {segments
                      .filter(
                        (segment) =>
                          segment.imageId === sourceImage.id && segment.region,
                      )
                      .map((segment) => (
                        <button
                          key={segment.id}
                          ref={(node) => {
                            h5RegionRefs.current[segment.id] = node;
                          }}
                          type="button"
                          className="evidence-h5-region"
                          style={{
                            left: `${segment.region!.x}%`,
                            top: `${segment.region!.y}%`,
                            width: `${segment.region!.width}%`,
                            height: `${segment.region!.height}%`,
                          }}
                          aria-label={`选择 H5 原文区域 ${segment.sourceNumber}：${segment.title}`}
                          aria-pressed={selected?.id === segment.id}
                          onClick={() =>
                            selectSegment(
                              segments.findIndex(
                                (item) => item.id === segment.id,
                              ),
                            )
                          }
                        >
                          <span>{segment.sourceNumber}</span>
                        </button>
                      ))}
                  </div>
                </div>
                <p className="evidence-input-hint">
                  <Info size={11} /> 原始 H5
                  截图可上下滚动；点击标记关联对应原句。
                </p>
              </>
            )}

            {session.imageName &&
              (imageUrl ? (
                <figure className="evidence-custom-image">
                  <img src={imageUrl} alt={`输入图片：${session.imageName}`} />
                  <figcaption>
                    <span>{session.imageName}</span>
                    {session.stage === 0 && (
                      <button
                        type="button"
                        aria-label="移除输入图片"
                        onClick={() => {
                          setImageUrl("");
                          dispatch({
                            type: "edit",
                            text: session.input,
                            imageName: "",
                          });
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </figcaption>
                </figure>
              ) : (
                <div className="evidence-image-lost">
                  <ImagePlus size={15} />
                  <span>
                    已保留图片名称与转录文字。图片只在当前会话预览，重新选择文件后可再次查看。
                  </span>
                </div>
              ))}

            {session.stage === 0 ? (
              <>
                <label
                  className="evidence-input-label"
                  htmlFor="evidence-input"
                >
                  <span>
                    {session.imageName
                      ? "确认图片转录文字"
                      : currentCase.kind === "h5" && preset
                        ? "H5 原始段落"
                        : "脚本原文"}
                  </span>
                  <small>
                    {session.input.length.toLocaleString()} / 40,000 字
                  </small>
                </label>
                <textarea
                  id="evidence-input"
                  className="evidence-input-text"
                  aria-label="脚本或图片转录原文"
                  value={session.input}
                  onChange={(event) => editInput(event.target.value)}
                  disabled={fileBusy}
                  placeholder="粘贴需要核对的原文，每个自然段之间留一个空行…"
                />
                <p className="evidence-input-hint">
                  <Info size={11} />
                  <span>
                    {session.imageName
                      ? "请人工核对转录文字；当前没有自动 OCR。"
                      : "修改原文后按自定义输入处理，引用保持待核查。完整原始案例使用预置关联。"}
                  </span>
                </p>
                {preset && (
                  <p className="evidence-source-note">
                    来源：{currentCase.source}
                    <br />
                    {currentCase.sourceNote}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="evidence-input-label">
                  <span>{showH5Images ? "H5 内容区域" : "原始脚本段落"}</span>
                  <button
                    type="button"
                    className="ev-button ev-quiet ev-small"
                    onClick={restart}
                  >
                    重新编辑
                  </button>
                </div>
                <div
                  className="evidence-segment-list"
                  aria-label="原文段落列表"
                >
                  {segments.map((segment, index) => (
                    <SourceSegmentButton
                      key={segment.id}
                      segment={segment}
                      selected={selected?.id === segment.id}
                      finished={finished}
                      onSelect={() => selectSegment(index)}
                    />
                  ))}
                </div>
                {selected && !finished && (
                  <section className="evidence-claim-panel">
                    <h3>
                      <Quote size={13} /> 第 {selected.sourceNumber} 段 ·
                      原文与主张
                    </h3>
                    <p className="evidence-claim-original">
                      {selected.original}
                    </p>
                    <span className="evidence-claim-label">
                      本段需要核对的表述
                    </span>
                    <ul className="evidence-claims">
                      {selected.claims.map((claim, index) => (
                        <li key={index}>{claim}</li>
                      ))}
                    </ul>
                    {selected.keywords.length > 0 && (
                      <div className="evidence-keywords">
                        {selected.keywords.map((keyword) => (
                          <span key={keyword}>{keyword}</span>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
          <div className="evidence-flow-controls">
            {session.stage === 0 && (
              <div className="evidence-source-actions">
                <span>
                  {fileBusy ? "正在读取本地文件…" : "原文确认后进入主张拆解"}
                </span>
                <button
                  type="button"
                  className="ev-button ev-primary"
                  disabled={fileBusy}
                  onClick={parse}
                >
                  确认输入，拆解主张 <ArrowRight size={13} />
                </button>
              </div>
            )}
            {session.stage === 1 && (
              <div className="evidence-source-actions">
                <span>确认主张范围后继续</span>
                <button
                  type="button"
                  className="ev-button ev-primary"
                  onClick={() => {
                    setNotice("");
                    dispatch({ type: "match" });
                  }}
                >
                  确认主张，开始匹配 <ArrowRight size={13} />
                </button>
              </div>
            )}
            {busy && (
              <div className="evidence-running" role="status">
                <div>
                  <LoaderCircle className="evidence-spin" size={16} />
                  {session.stage === 2
                    ? "正在整理文献关联"
                    : "正在整理建议表达"}
                </div>
                <p>
                  {session.stage === 2
                    ? "按原文主张整理本地候选来源，保留尚未核查的关联。"
                    : "建议表达、修改理由与来源边界将随最终报告一起交付。"}
                </p>
                <small>本地预置流程 · 不调用实时检索或自动医学审批</small>
              </div>
            )}
            {session.stage === 4 && (
              <div className="evidence-preflight">
                <h3>
                  <ListChecks size={15} /> 确认报告交付范围
                </h3>
                <p>
                  本轮已整理 {segments.length}{" "}
                  段原文。报告将保留建议表达、关联依据及待核查项；来源核对不等于医学审批通过。
                </p>
                {!preset && (
                  <p>
                    当前为自定义内容，将保留原文并标注待核查，不产生预设改写或引用。
                  </p>
                )}
                <button
                  type="button"
                  className="ev-button ev-primary"
                  onClick={deliver}
                >
                  完成流程，查看报告 <CheckCheck size={14} />
                </button>
              </div>
            )}
            {finished && (
              <div className="evidence-source-actions">
                <span>
                  <CheckCheck size={12} /> 本轮流程已完成
                </span>
                <button
                  type="button"
                  className="ev-button ev-small"
                  onClick={restart}
                >
                  <RotateCcw size={12} /> 重新演示
                </button>
              </div>
            )}
          </div>
        </section>

        {!report ? (
          <LockedResult session={session} kind={currentCase.kind} />
        ) : (
          <section className="evidence-result" aria-label="已交付文献报告">
            <div
              className="evidence-result-tabs"
              role="tablist"
              aria-label="报告视图"
            >
              {(
                [
                  ["comparison", "逐段对照", Quote],
                  [
                    "manuscript",
                    preset
                      ? currentCase.kind === "h5"
                        ? "修改建议汇总"
                        : "完整优化稿"
                      : "原文待整理",
                    FileText,
                  ],
                  ["references", "参考文献", BookOpen],
                  ["process", "过程记录", GitBranch],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
            <div className="evidence-result-body">
              <div className="evidence-report-heading">
                <div>
                  <span className="evidence-eyebrow">
                    PARAGRAPH EVIDENCE MAP
                  </span>
                  <h2>
                    {view === "comparison"
                      ? "原文与依据，逐段对应。"
                      : view === "manuscript"
                        ? preset
                          ? currentCase.kind === "h5"
                            ? "逐项审阅建议，保留核查边界。"
                            : "完整建议稿，清楚保留边界。"
                          : "原文待整理，等待建立证据。"
                        : view === "references"
                          ? "本轮内容的参考来源"
                          : "每一步，都有记录。"}
                  </h2>
                  <p>
                    {preset
                      ? "保留原始表达，让建议、理由与支持范围同处一页。"
                      : "自定义内容未进行在线检索，原文与待核查主张已保留。"}
                  </p>
                </div>
                <span className="evidence-count">V{session.version}</span>
              </div>
              <div className="evidence-summary-grid">
                <div>
                  <strong>{report.segments.length}</strong>
                  <span>原文段落</span>
                </div>
                <div>
                  <strong>{report.references.length}</strong>
                  <span>关联来源</span>
                </div>
                <div>
                  <strong>
                    {
                      report.segments.filter(
                        (item) => item.status === "supported",
                      ).length
                    }
                  </strong>
                  <span>有对应依据</span>
                </div>
                <div>
                  <strong>
                    {
                      report.segments.filter(
                        (item) =>
                          item.status === "pending" ||
                          item.status === "partial",
                      ).length
                    }
                  </strong>
                  <span>需保留边界</span>
                </div>
              </div>

              {view === "comparison" && resultSegment && (
                <>
                  <article className="evidence-comparison">
                    <div className="evidence-comparison-header">
                      <strong>
                        段落 {resultSegment.sourceNumber} ·{" "}
                        {resultSegment.title}
                      </strong>
                      <Status value={resultSegment.status} />
                    </div>
                    <div className="evidence-text-label">
                      <Quote size={11} /> 原始表达
                    </div>
                    <p className="evidence-original-text">
                      {resultSegment.original}
                    </p>
                    <div
                      className={`evidence-revised-box${resultSegment.status === "pending" ? " evidence-revised-pending" : ""}`}
                    >
                      <div className="evidence-text-label">
                        <Sparkles size={11} />
                        {preset
                          ? currentCase.kind === "h5"
                            ? "审阅建议 · 非可发布稿"
                            : "建议表达"
                          : "原文保留 · 待核查"}
                      </div>
                      <p>{resultSegment.revised}</p>
                    </div>
                    <div className="evidence-reason">
                      <Info size={13} />
                      <p>
                        <b>调整理由</b>
                        {resultSegment.reason}
                      </p>
                    </div>
                    {(resultSegment.duration ||
                      resultSegment.visual ||
                      resultSegment.caption) && (
                      <div className="evidence-source-meta">
                        {resultSegment.duration && (
                          <div>
                            <span>时长</span>
                            {resultSegment.duration}
                          </div>
                        )}
                        {resultSegment.visual && (
                          <div>
                            <span>画面</span>
                            {resultSegment.visual}
                          </div>
                        )}
                        {resultSegment.caption && (
                          <div>
                            <span>花字</span>
                            {resultSegment.caption}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                  <div className="evidence-section-title">
                    <h3>
                      <BookOpen size={15} /> 对应参考来源
                    </h3>
                    <span>{selectedReferences.length} 条</span>
                  </div>
                  {selectedReferences.length ? (
                    selectedReferences.map((reference) => (
                      <ReferenceCard
                        key={reference.id}
                        reference={reference}
                        number={
                          report.references.findIndex(
                            (item) => item.id === reference.id,
                          ) + 1
                        }
                        links={resultSegment.evidence.filter(
                          (item) => item.referenceId === reference.id,
                        )}
                        onCopy={copy}
                      />
                    ))
                  ) : (
                    <div className="evidence-empty-evidence">
                      <FileSearch size={24} />
                      {resultSegment.status === "not-needed"
                        ? "本段属于叙事或行动建议，无需为每一句补充文献。"
                        : "当前没有已建立的对应来源。保留原文与主张，等待人工核对。"}
                    </div>
                  )}
                </>
              )}

              {view === "manuscript" && (
                <>
                  <div className="evidence-section-title">
                    <h3>
                      <FileText size={15} />{" "}
                      {preset
                        ? currentCase.kind === "h5"
                          ? "修改建议汇总"
                          : "完整建议稿"
                        : "原文待整理"}
                    </h3>
                    <button
                      type="button"
                      className="ev-button ev-small"
                      onClick={() =>
                        copy(
                          report.segments
                            .map((item) => item.revised)
                            .join("\n\n"),
                          currentCase.kind === "h5" && preset
                            ? "审阅建议"
                            : "完整稿件",
                        )
                      }
                    >
                      <Copy size={12} />{" "}
                      {currentCase.kind === "h5" && preset
                        ? "复制审阅建议"
                        : "复制完整稿"}
                    </button>
                  </div>
                  <div className="evidence-manuscript">
                    {report.segments.map((segment) => (
                      <section key={segment.id}>
                        <h3>
                          <span>{segment.sourceNumber.padStart(2, "0")}</span>
                          {segment.title}
                          <Status value={segment.status} />
                        </h3>
                        <p>{segment.revised}</p>
                        {segment.evidence.length > 0 && (
                          <small>
                            关联来源：
                            {Array.from(
                              new Set(
                                segment.evidence.map(
                                  (link) => link.referenceId,
                                ),
                              ),
                            )
                              .map(
                                (referenceId) =>
                                  report.references.find(
                                    (ref) => ref.id === referenceId,
                                  )?.label || referenceId,
                              )
                              .join("、")}
                          </small>
                        )}
                      </section>
                    ))}
                  </div>
                </>
              )}

              {view === "references" && (
                <>
                  {report.research && (
                    <div className="evidence-research-note">
                      <h3>
                        <Search size={15} /> 已完成联网检索{" "}
                        <span>{report.research.performedAt}</span>
                      </h3>
                      <p>{report.research.summary}</p>
                      {report.research.bibliographyUrl?.startsWith(
                        "/literature/references/",
                      ) && (
                        <a
                          className="evidence-source-download"
                          href={report.research.bibliographyUrl}
                          download
                        >
                          <ArrowDownToLine size={13} /> 下载参考文献（RIS）
                        </a>
                      )}
                      <details>
                        <summary>查看检索词与核对范围</summary>
                        <ol>
                          {report.research.queries.map((query, index) => (
                            <li key={`${query.query}-${index}`}>
                              <strong>{query.source}</strong>
                              <p>{query.query}</p>
                            </li>
                          ))}
                        </ol>
                        {report.research.limitations.map((note) => (
                          <p key={note}>{note}</p>
                        ))}
                      </details>
                    </div>
                  )}
                  {report.references.length ? (
                    report.references.map((reference, index) => (
                      <ReferenceCard
                        key={reference.id}
                        reference={reference}
                        number={index + 1}
                        onCopy={copy}
                      />
                    ))
                  ) : (
                    <div className="evidence-empty-evidence">
                      <BookOpen size={25} />
                      本轮没有可直接关联的参考文献。自定义输入仍需建立并核对证据。
                    </div>
                  )}
                </>
              )}

              {view === "process" && (
                <ol className="evidence-log-list">
                  {report.logs.map((log, index) => (
                    <li key={`${log.step}-${index}`}>
                      <span className="evidence-log-icon">
                        <Check size={12} />
                      </span>
                      <div>
                        <strong>
                          {String(log.step + 1).padStart(2, "0")} ·{" "}
                          {literatureSteps[log.step]?.title}
                        </strong>
                        <time>{log.at}</time>
                        <p>{log.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="evidence-report-footnote">
                <CircleAlert size={12} /> {report.note}
              </p>
            </div>
            <footer className="evidence-output-actions">
              <button
                type="button"
                className="ev-button"
                onClick={() => exportReport("md")}
              >
                <ArrowDownToLine size={12} /> 导出 Markdown
              </button>
              <button
                type="button"
                className="ev-button"
                onClick={() => exportReport("json")}
              >
                <ArrowDownToLine size={12} /> 导出 JSON
              </button>
              <button
                type="button"
                className="ev-button"
                onClick={() =>
                  copy(
                    report.segments.map((item) => item.revised).join("\n\n"),
                    currentCase.kind === "h5" && preset
                      ? "审阅建议"
                      : "完整稿件",
                  )
                }
              >
                <Copy size={12} />{" "}
                {currentCase.kind === "h5" && preset
                  ? "复制审阅建议"
                  : "复制稿件"}
              </button>
            </footer>
          </section>
        )}
      </div>
      {notice && (
        <footer className="evidence-notice" role="status">
          <Info size={14} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="关闭提示"
            onClick={() => setNotice("")}
          >
            <X size={13} />
          </button>
        </footer>
      )}
    </div>
  );
}
