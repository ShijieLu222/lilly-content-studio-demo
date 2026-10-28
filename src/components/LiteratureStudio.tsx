import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileSearch,
  FileText,
  ImagePlus,
  List,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  literatureCases,
  type EvidenceReference,
  type EvidenceLink,
  type LiteratureCase,
  type LiteratureSegment,
} from "../literatureData";
import {
  caseInput,
  createLiteratureSession,
  getLiteratureSegments,
  isPresetInput,
  evidenceStatusLabels,
} from "../lib/literatureWorkflow";
import {
  createEditableRtf,
  revisionKind,
  revisionRuns,
  type RevisionRun,
} from "../lib/literatureEditor";
import {
  referenceDestination,
  referenceDoiUrl,
  referencePmidUrl,
} from "../lib/literatureLinks";
import "./LiteratureStudio.css";

type RevisionSnapshot = {
  drafts: Record<string, string>;
  ignored: string[];
};
type EditorDocument = {
  input: string;
  drafts: Record<string, string>;
  ignored: string[];
  imageName: string;
  resetSnapshot?: RevisionSnapshot;
};
type EditorStore = {
  caseId: string;
  documents: Record<string, EditorDocument>;
};
const STORE = "lilly-literature-editor-v1";
const initialDocument = (item: LiteratureCase): EditorDocument => ({
  input: caseInput(item),
  drafts: {},
  ignored: [],
  imageName: "",
});
function restoreEditor(item: LiteratureCase, storageKey: string): EditorStore {
  const fallback = { caseId: item.id, documents: {} };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      !stored ||
      stored.caseId !== item.id ||
      !stored.documents ||
      typeof stored.documents !== "object"
    )
      return fallback;
    const documents: Record<string, EditorDocument> = {};
    for (const current of [item]) {
      const doc = stored.documents[current.id];
      if (
        !doc ||
        typeof doc.input !== "string" ||
        doc.input.length > 40000 ||
        !doc.drafts ||
        typeof doc.drafts !== "object" ||
        !Array.isArray(doc.ignored)
      )
        continue;
      const drafts: Record<string, string> = {};
      for (const [key, value] of Object.entries(doc.drafts))
        if (typeof value === "string" && value.length <= 40000)
          drafts[key] = value;
      const ignored = doc.ignored.filter(
        (id: unknown) => typeof id === "string",
      );
      let resetSnapshot: RevisionSnapshot | undefined;
      // An undo snapshot belongs to the unchanged document immediately after reset.
      if (
        !Object.keys(drafts).length &&
        !ignored.length &&
        doc.resetSnapshot &&
        typeof doc.resetSnapshot.drafts === "object" &&
        doc.resetSnapshot.drafts &&
        !Array.isArray(doc.resetSnapshot.drafts) &&
        Array.isArray(doc.resetSnapshot.ignored)
      ) {
        resetSnapshot = {
          drafts: Object.fromEntries(
            Object.entries(doc.resetSnapshot.drafts).filter(
              ([, value]) => typeof value === "string" && value.length <= 40000,
            ),
          ) as Record<string, string>,
          ignored: doc.resetSnapshot.ignored.filter(
            (id: unknown) => typeof id === "string",
          ),
        };
      }
      documents[item.id] = {
        input: doc.input,
        drafts,
        ignored,
        imageName: typeof doc.imageName === "string" ? doc.imageName : "",
        resetSnapshot,
      };
    }
    return { caseId: stored.caseId, documents };
  } catch {
    return fallback;
  }
}
const citation = (ref: EvidenceReference) =>
  `${ref.authors}. ${ref.title}. ${ref.publication}${ref.doi ? ` DOI: ${ref.doi}` : ""} ${referenceDestination(ref).isSearch ? "检索入口（原文待定位）：" : ""}${referenceDestination(ref).url}`;
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function ReferenceLink({
  reference,
  children,
  className,
}: {
  reference: EvidenceReference;
  children: ReactNode;
  className?: string;
}) {
  const destination = referenceDestination(reference);
  return (
    <a
      className={className}
      href={destination.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${destination.label}：${reference.title}（新标签页打开）`}
      aria-label={`${destination.label}：${reference.title}（新标签页打开）`}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
function CitedText({
  text,
  references,
}: {
  text: string;
  references: Map<string, EvidenceReference>;
}) {
  return text.split(/(\[\d+(?:[,，\s]+\d+)*\])/g).map((part, index) =>
    /^\[\d+(?:[,，\s]+\d+)*\]$/.test(part) ? (
      <span key={index}>
        [
        {part
          .slice(1, -1)
          .split(/(\d+)/g)
          .map((token, tokenIndex) => {
            const reference = references.get(token);
            return reference ? (
              <ReferenceLink
                key={tokenIndex}
                reference={reference}
                className="le-inline-citation"
              >
                {token}
              </ReferenceLink>
            ) : (
              token
            );
          })}
        ]
      </span>
    ) : (
      part
    ),
  );
}
function MarkedText({
  runs,
  references,
}: {
  runs: RevisionRun[];
  references: Map<string, EvidenceReference>;
}) {
  return (
    <>
      {runs.map((run, index) =>
        run.kind === "deletion" ? (
          <del key={index} className="le-mark le-mark-deletion">
            <CitedText text={run.text} references={references} />
          </del>
        ) : (
          <span
            key={index}
            className={
              run.kind === "unchanged"
                ? undefined
                : `le-mark le-mark-${run.kind}`
            }
          >
            <CitedText text={run.text} references={references} />
          </span>
        ),
      )}
    </>
  );
}

export default function LiteratureStudio({
  item,
  runId,
  isExample,
  onNew,
}: {
  item: LiteratureCase;
  runId: string;
  isExample: boolean;
  onNew: (kind: "script" | "h5") => void;
}) {
  const storageKey = `${STORE}:${runId}`;
  const [store, setStore] = useState<EditorStore>(() =>
    restoreEditor(item, storageKey),
  );
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"marked" | "final">("marked");
  const [sideView, setSideView] = useState<"suggestions" | "references">(
    "suggestions",
  );
  const [editing, setEditing] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState<{
    id: string;
    sequence: number;
  } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageFailed, setStorageFailed] = useState(false);
  const [includeReferences, setIncludeReferences] = useState(true);
  const exportMenu = useRef<HTMLDivElement>(null);
  const documentScroll = useRef<HTMLDivElement>(null);
  const reviewScroll = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<Record<string, HTMLElement | null>>({});
  const currentCase = item;
  const [selectedImageId, setSelectedImageId] = useState(
    item.images?.[0]?.id || "",
  );
  const document =
    store.documents[currentCase.id] || initialDocument(currentCase);
  const session = {
    ...createLiteratureSession(currentCase),
    input: document.input,
    imageName: document.imageName,
  };
  const preset = isExample && isPresetInput(session, currentCase);
  const allSegments =
    document.input === caseInput(currentCase)
      ? currentCase.segments
      : getLiteratureSegments(session, currentCase);
  const selectedImage = currentCase.images?.find(
    (image) => image.id === selectedImageId,
  );
  const segments =
    currentCase.kind === "h5" && selectedImage
      ? allSegments.filter((segment) => segment.imageId === selectedImage.id)
      : allSegments;
  const active = segments[selected] || segments[0];
  const references = preset ? currentCase.references : [];
  const imageReferenceIds = new Set(
    segments.flatMap((segment) =>
      segment.evidence.map((link) => link.referenceId),
    ),
  );
  const displayedReferences = selectedImage
    ? references.filter((reference) => imageReferenceIds.has(reference.id))
    : references;
  const refNumber = (id: string) => {
    const index = references.findIndex((ref) => ref.id === id);
    return references[index]?.label && /^\d+$/.test(references[index].label!)
      ? references[index].label!
      : String(index + 1);
  };
  const referencesByNumber = new Map(
    references.map((ref) => [refNumber(ref.id), ref]),
  );
  const canApply = (segment: LiteratureSegment) =>
    preset &&
    segment.original !== segment.revised &&
    (currentCase.kind !== "h5" || segment.status === "supported");
  const proposed = (segment: LiteratureSegment) => {
    if (!canApply(segment)) return segment.original;
    const numbers = [
      ...new Set(segment.evidence.map((link) => refNumber(link.referenceId))),
    ];
    return (
      segment.revised +
      (currentCase.kind === "script" && numbers.length
        ? ` [${numbers.join(",")}]`
        : "")
    );
  };
  const draft = (segment: LiteratureSegment) =>
    document.drafts[segment.id] ?? segment.original;
  const pending = segments.filter(
    (segment) =>
      canApply(segment) &&
      document.drafts[segment.id] === undefined &&
      !document.ignored.includes(segment.id),
  );
  const changed = segments.filter(
    (segment) => draft(segment) !== segment.original,
  ).length;
  const activeRefs = active
    ? references.filter((ref) =>
        active.evidence.some((link) => link.referenceId === ref.id),
      )
    : [];
  const activeManuallyEdited =
    !!active &&
    document.drafts[active.id] !== undefined &&
    draft(active) !== proposed(active);
  const title = selectedImage
    ? `${currentCase.title} · ${selectedImage.label}`
    : currentCase.title;
  const finalBody = segments.map(draft).join("\n\n");
  const citedNumbers = new Set(
    [...finalBody.matchAll(/\[([\d,，\s]+)\]/g)].flatMap((match) =>
      match[1].split(/[,，\s]+/),
    ),
  );
  const finalReferences = includeReferences
    ? references
        .filter((ref) => citedNumbers.has(refNumber(ref.id)))
        .map((ref) => ({
          reference: ref,
          text: `[${refNumber(ref.id)}] ${citation(ref)}`,
          url: referenceDestination(ref).url,
        }))
    : [];
  const finalText = `${title}\n\n${finalBody}${finalReferences.length ? `\n\n参考文献\n${finalReferences.map((ref) => ref.text).join("\n\n")}` : ""}`;

  function updateDocument(
    update: (doc: EditorDocument) => EditorDocument,
    keepResetSnapshot = false,
  ) {
    setStore((value) => {
      const current =
        value.documents[currentCase.id] || initialDocument(currentCase);
      // A new document edit ends the previous reset's undo opportunity.
      const editable = keepResetSnapshot
        ? current
        : { ...current, resetSnapshot: undefined };
      return {
        ...value,
        documents: { ...value.documents, [currentCase.id]: update(editable) },
      };
    });
  }
  function returnToDemoStart() {
    setSelected(0);
    setEditing(false);
    setView("marked");
    setSideView("suggestions");
    setShowOutline(false);
    setShowExport(false);
    setNavigationRequest(null);
    requestAnimationFrame(() => {
      documentScroll.current?.scrollTo({ top: 0, behavior: "instant" });
      reviewScroll.current?.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  function resetDemo() {
    if (!Object.keys(document.drafts).length && !document.ignored.length)
      return;
    updateDocument((doc) => ({
      ...doc,
      drafts: {},
      ignored: [],
      resetSnapshot: { drafts: { ...doc.drafts }, ignored: [...doc.ignored] },
    }));
    returnToDemoStart();
    setNotice("已回到应用前，可重新演示。误点可在右下角撤销重置。");
  }
  function undoDemoReset() {
    if (!document.resetSnapshot) return;
    updateDocument(
      (doc) =>
        doc.resetSnapshot
          ? {
              ...doc,
              drafts: { ...doc.resetSnapshot.drafts },
              ignored: [...doc.resetSnapshot.ignored],
              resetSnapshot: undefined,
            }
          : doc,
      true,
    );
    returnToDemoStart();
    setNotice("已恢复重置前的文稿，包括手动修改。");
  }
  function selectImage(id: string) {
    setSelectedImageId(id);
    setSelected(0);
    setEditing(false);
    setShowOutline(false);
    setNavigationRequest(null);
  }
  function selectParagraph(index: number) {
    const segment = segments[index];
    if (!segment) return;
    setSelected(index);
    setShowOutline(false);
    setNavigationRequest((request) => ({
      id: segment.id,
      sequence: (request?.sequence ?? 0) + 1,
    }));
  }
  function applySegment(segment: LiteratureSegment) {
    updateDocument((doc) => ({
      ...doc,
      drafts: { ...doc.drafts, [segment.id]: proposed(segment) },
      ignored: doc.ignored.filter((id) => id !== segment.id),
    }));
    setNotice(`第 ${segment.sourceNumber} 段建议已应用，仍可继续编辑。`);
  }
  function applyAll() {
    if (!pending.length) return;
    updateDocument((doc) => ({
      ...doc,
      drafts: {
        ...doc.drafts,
        ...Object.fromEntries(
          pending.map((segment) => [segment.id, proposed(segment)]),
        ),
      },
    }));
    setNotice(`已应用 ${pending.length} 段建议。你已手动修改的段落保持原样。`);
  }
  function editParagraph(segment: LiteratureSegment, text: string) {
    updateDocument((doc) => ({
      ...doc,
      drafts: { ...doc.drafts, [segment.id]: text },
    }));
  }
  function resetParagraph(segment: LiteratureSegment) {
    updateDocument((doc) => {
      const drafts = { ...doc.drafts };
      delete drafts[segment.id];
      return {
        ...doc,
        drafts,
        ignored: doc.ignored.filter((id) => id !== segment.id),
      };
    });
    setNotice("本段已恢复原文，建议可重新应用。");
  }
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label}已复制。`);
    } catch {
      setNotice("浏览器未允许复制，请使用导出按钮保存文稿。");
    }
  }
  function exportDocument(format: "txt" | "rtf" | "marked") {
    const filename = title.replace(/[\\/:*?"<>|]/g, "-");
    if (format === "txt")
      download(
        finalText,
        `${filename}-当前文稿.txt`,
        "text/plain;charset=utf-8",
      );
    else {
      const paragraphs = segments.map((segment) =>
        format === "marked"
          ? revisionRuns(
              segment.original,
              draft(segment),
              draft(segment) === proposed(segment)
                ? revisionKind(segment)
                : "polish",
            )
          : [{ text: draft(segment), kind: "unchanged" as const }],
      );
      download(
        createEditableRtf(
          title,
          paragraphs,
          finalReferences,
          format === "marked",
        ),
        `${filename}-${format === "marked" ? "修订标注" : "当前文稿"}.rtf`,
        "application/rtf",
      );
    }
    setShowExport(false);
    setNotice(
      "已导出当前文稿，包含已应用和手动编辑的内容。未应用建议不会写入正文。",
    );
  }
  useLayoutEffect(() => {
    if (!navigationRequest) return;
    const viewport = documentScroll.current;
    const target = paragraphRefs.current[navigationRequest.id];
    if (!viewport || !target) return;
    // Measure after React commits both the new selection and the closed outline.
    // Only the document viewport moves; the page and neighboring panel stay put.
    const top =
      viewport.scrollTop +
      target.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      14;
    viewport.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [navigationRequest]);
  useLayoutEffect(() => {
    reviewScroll.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [selected, currentCase.id, selectedImageId]);
  useLayoutEffect(() => {
    documentScroll.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [currentCase.id, document.input, selectedImageId]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
      setNotice("浏览器无法保存当前编辑，请及时导出文稿。");
    }
  }, [store, storageKey]);
  useEffect(() => {
    if (!showExport) return;
    function outside(event: PointerEvent) {
      if (!exportMenu.current?.contains(event.target as Node))
        setShowExport(false);
    }
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") setShowExport(false);
    }
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", close);
    };
  }, [showExport]);

  return (
    <div className="literature-editor">
      <header className="le-header">
        <div className="le-heading">
          <span className="le-heading-icon">
            <FileSearch size={20} />
          </span>
          <div>
            <h1>文献支持</h1>
            <p>上传内容 › 分析与整理 › 查看结果</p>
          </div>
        </div>
        <div className="le-case-tabs" role="tablist" aria-label="文献任务类型">
          {literatureCases.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={item.kind === currentCase.kind}
              onClick={() => onNew(item.kind)}
            >
              {item.kind === "script" ? (
                <FileText size={14} />
              ) : (
                <ImagePlus size={14} />
              )}
              {item.kind === "script" ? "达人脚本优化" : "H5 文献支持"}
            </button>
          ))}
        </div>
        <div className="le-header-actions">
          <button className="le-button" onClick={() => onNew(currentCase.kind)}>
            新建文献支持
          </button>
          <div className="le-export-wrap" ref={exportMenu}>
            <button
              className="le-button le-primary"
              onClick={() => setShowExport(!showExport)}
              aria-expanded={showExport}
            >
              <ArrowDownToLine size={14} />
              {selectedImage ? "导出本图" : "导出文稿"}
              <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="le-export-menu">
                <strong>
                  {selectedImage ? "导出当前图片的文稿" : "导出当前已编辑文稿"}
                </strong>
                <button onClick={() => exportDocument("rtf")}>
                  <FileText size={15} />
                  <span>
                    Word 可编辑文稿<small>RTF 格式 · Word / WPS 可打开</small>
                  </span>
                </button>
                <button onClick={() => exportDocument("txt")}>
                  <FileText size={15} />
                  <span>
                    纯文本 TXT<small>仅正文与选定的引用</small>
                  </span>
                </button>
                <button onClick={() => exportDocument("marked")}>
                  <Pencil size={15} />
                  <span>
                    带颜色的修订标注<small>保留已应用修改与删除线 · RTF</small>
                  </span>
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={includeReferences}
                    onChange={(event) =>
                      setIncludeReferences(event.target.checked)
                    }
                  />
                  包含正文引用的参考文献
                </label>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="le-workspace">
        <section className="le-document-panel" aria-label="全文文稿">
          <div className="le-document-toolbar">
            <div className="le-view-tabs" role="tablist" aria-label="文稿视图">
              <button
                role="tab"
                aria-selected={view === "marked" && !editing}
                onClick={() => {
                  setView("marked");
                  setEditing(false);
                }}
              >
                修订预览
              </button>
              <button
                role="tab"
                aria-selected={view === "final" && !editing}
                onClick={() => {
                  setView("final");
                  setEditing(false);
                }}
              >
                当前文稿
              </button>
            </div>
            <div className="le-doc-actions">
              <button
                aria-pressed={showOutline}
                onClick={() => setShowOutline(!showOutline)}
              >
                <List size={14} />
                <span>段落导航</span>
              </button>
              <button
                className={editing ? "active" : ""}
                aria-pressed={editing}
                onClick={() => {
                  setEditing(!editing);
                  setView("final");
                }}
              >
                <Pencil size={14} />
                {editing ? "完成编辑" : "编辑全文"}
              </button>
              <button
                onClick={() => void copy(finalText, "当前文稿")}
                aria-label="复制当前文稿"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div className="le-legend">
            <span>
              <i className="deletion" />
              删除
            </span>
            <span>
              <i className="compliance" />
              合规调整
            </span>
            <span>
              <i className="addition" />
              补充
            </span>
            <span>
              <i className="polish" />
              润色 / 手动修改
            </span>
            <small>
              {editing
                ? "直接编辑下方文字，修改自动保存"
                : view === "marked"
                  ? "未应用的内容仅作建议预览"
                  : "这里是实际导出的文稿内容"}
            </small>
          </div>
          <div className="le-document-body">
            {showOutline && (
              <nav className="le-outline" aria-label="段落导航">
                <div>
                  <strong>段落导航</strong>
                  <button
                    aria-label="关闭段落导航"
                    onClick={() => setShowOutline(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                {segments.map((segment, index) => (
                  <button
                    key={segment.id}
                    aria-current={index === selected ? "true" : undefined}
                    onClick={() => selectParagraph(index)}
                  >
                    <span>{segment.sourceNumber.padStart(2, "0")}</span>
                    {segment.title}
                  </button>
                ))}
              </nav>
            )}
            <div className="le-document-scroll" ref={documentScroll}>
              <div className="le-document-title">
                <div>
                  <span className="le-eyebrow">
                    {preset ? "AI 辅助审阅 · 预置案例" : "自定义文稿"}
                  </span>
                  <h2>{currentCase.title}</h2>
                  <p>
                    {segments.length} 段正文<span>·</span>
                    {changed} 段已修改<span>·</span>
                    {finalBody.length} 字
                  </p>
                </div>
              </div>
              {currentCase.kind === "h5" && currentCase.images && (
                <>
                  <div className="le-image-selection-heading">
                    <strong>选择图片，查看对应内容</strong>
                    <span>{currentCase.images.length} 张图片</span>
                  </div>
                  <div
                    className="le-source-images"
                    role="tablist"
                    aria-label="H5 图片选择"
                  >
                    {currentCase.images.map((img, index) => (
                      <button
                        key={img.id}
                        type="button"
                        role="tab"
                        aria-selected={img.id === selectedImageId}
                        aria-controls="le-image-content"
                        onClick={() => selectImage(img.id)}
                      >
                        <img src={img.src} alt={img.label} />
                        <span>
                          <b>图 {index + 1}</b>
                          {img.label}
                        </span>
                        <small>
                          {
                            allSegments.filter(
                              (segment) => segment.imageId === img.id,
                            ).length
                          }{" "}
                          段内容
                        </small>
                      </button>
                    ))}
                  </div>
                  {selectedImage && (
                    <div
                      className="le-selected-image-label"
                      id="le-image-content"
                    >
                      <div>
                        <strong>{selectedImage.label}</strong>
                        <span>以下仅显示这张图片的文字与建议</span>
                      </div>
                      <a
                        href={selectedImage.src}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        查看完整原图 <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </>
              )}
              {!preset && (
                <div className="le-custom-note">
                  自定义内容未进行自动改写或实时文献检索。你可以直接编辑、添加引用并导出。
                </div>
              )}
              {segments.map((segment, index) => {
                const manual =
                  document.drafts[segment.id] !== undefined &&
                  draft(segment) !== proposed(segment);
                const applied =
                  document.drafts[segment.id] !== undefined &&
                  draft(segment) === proposed(segment) &&
                  canApply(segment);
                const ignored = document.ignored.includes(segment.id);
                const showingSuggestion =
                  view === "marked" && !manual && !ignored && canApply(segment);
                const displayed = showingSuggestion
                  ? proposed(segment)
                  : draft(segment);
                return (
                  <article
                    key={segment.id}
                    ref={(node) => {
                      paragraphRefs.current[segment.id] = node;
                    }}
                    className={`le-paragraph${index === selected ? " selected" : ""}`}
                    onClick={() => setSelected(index)}
                  >
                    <button
                      className="le-paragraph-number"
                      onClick={() => setSelected(index)}
                      aria-label={`选择第 ${segment.sourceNumber} 段`}
                    >
                      {segment.sourceNumber.padStart(2, "0")}
                    </button>
                    <div className="le-paragraph-content">
                      <div className="le-paragraph-top">
                        <h3>{segment.title}</h3>
                        <span
                          className={
                            manual
                              ? "le-status-manual"
                              : applied
                                ? "le-status-applied"
                                : ""
                          }
                        >
                          {manual ? (
                            "已手动编辑"
                          ) : applied ? (
                            <>
                              <Check size={11} />
                              已应用
                            </>
                          ) : ignored ? (
                            "保留原文"
                          ) : canApply(segment) ? (
                            "建议待应用"
                          ) : (
                            "待复核"
                          )}
                        </span>
                      </div>
                      {editing ? (
                        <textarea
                          aria-label={`编辑第 ${segment.sourceNumber} 段`}
                          value={draft(segment)}
                          rows={Math.max(
                            3,
                            Math.ceil(draft(segment).length / 42),
                          )}
                          onFocus={() => setSelected(index)}
                          onChange={(event) =>
                            editParagraph(segment, event.target.value)
                          }
                        />
                      ) : (
                        <p className="le-paragraph-text">
                          {view === "marked" ? (
                            <MarkedText
                              references={referencesByNumber}
                              runs={revisionRuns(
                                segment.original,
                                displayed,
                                manual ? "polish" : revisionKind(segment),
                              )}
                            />
                          ) : (
                            <CitedText
                              text={draft(segment)}
                              references={referencesByNumber}
                            />
                          )}
                        </p>
                      )}
                      {index === selected && !editing && (
                        <div className="le-paragraph-bottom">
                          <span
                            className={`evidence-status evidence-status-${manual ? "pending" : segment.status}`}
                          >
                            {manual
                              ? "编辑后待复核"
                              : evidenceStatusLabels[segment.status]}
                          </span>
                          <button
                            onClick={() => {
                              setEditing(true);
                              setView("final");
                            }}
                          >
                            编辑这一段 <Pencil size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              {view === "final" && finalReferences.length > 0 && (
                <section className="le-document-references">
                  <h3>参考文献</h3>
                  {finalReferences.map((ref) => (
                    <p key={ref.reference.id}>
                      <ReferenceLink reference={ref.reference}>
                        {ref.text} <ExternalLink size={11} />
                      </ReferenceLink>
                    </p>
                  ))}
                </section>
              )}
            </div>
          </div>
          <footer className="le-document-footer">
            <span>
              <CheckCheck size={13} />
              {storageFailed
                ? "当前修改尚未保存，请导出"
                : "修改自动保存在此浏览器"}
            </span>
            <span>
              {changed ? `${changed} 段已修改` : "原文已保留"} ·{" "}
              {pending.length} 段建议待应用
            </span>
          </footer>
        </section>
        <aside className="le-review-panel" aria-label="修改建议与文献">
          <div className="le-review-tabs" role="tablist" aria-label="审阅内容">
            <button
              role="tab"
              aria-selected={sideView === "suggestions"}
              onClick={() => setSideView("suggestions")}
            >
              <Sparkles size={15} />
              修改建议
            </button>
            <button
              role="tab"
              aria-selected={sideView === "references"}
              onClick={() => setSideView("references")}
            >
              <BookOpen size={15} />
              参考文献<span>{displayedReferences.length}</span>
            </button>
          </div>
          <div className="le-review-scroll" ref={reviewScroll}>
            {sideView === "suggestions" ? (
              <>
                <div className="le-review-intro">
                  <span className="le-eyebrow">
                    {preset ? "AI REVIEW" : "CONTENT REVIEW"}
                  </span>
                  <h2>{preset ? "让修改清楚可见" : "继续核对这份内容"}</h2>
                  <p>在全文中查看上下文，逐段确认表达。</p>
                  <div className="le-review-order">
                    <span>文案润色</span>
                    <ArrowRight size={12} />
                    <span>合规审核</span>
                    <ArrowRight size={12} />
                    <span>引用添加</span>
                  </div>
                </div>
                <div className="le-apply-all">
                  <div>
                    <b>{pending.length}</b>
                    <span>段建议待应用</span>
                  </div>
                  <button
                    className="le-button le-primary"
                    disabled={!pending.length}
                    onClick={applyAll}
                  >
                    <CheckCheck size={14} />
                    {selectedImage ? "应用本图建议" : "一键应用修改"}
                  </button>
                </div>
                {active && (
                  <>
                    <div className="le-selected-heading">
                      <span>
                        当前段落 {String(selected + 1).padStart(2, "0")} /{" "}
                        {segments.length}
                      </span>
                      <div>
                        <button
                          disabled={selected <= 0}
                          onClick={() => selectParagraph(selected - 1)}
                          aria-label="上一段"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          disabled={selected >= segments.length - 1}
                          onClick={() => selectParagraph(selected + 1)}
                          aria-label="下一段"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                    <h3 className="le-active-title">{active.title}</h3>
                    <div className="le-suggestion-card">
                      <div className="le-suggestion-label">
                        <ShieldCheck size={14} />
                        {!preset
                          ? "内容待核查"
                          : revisionKind(active) === "polish"
                            ? "文案润色"
                            : revisionKind(active) === "addition"
                              ? "信息补充"
                              : "合规措辞调整"}
                        <span
                          className={`evidence-status evidence-status-${document.drafts[active.id] !== undefined && draft(active) !== proposed(active) ? "pending" : active.status}`}
                        >
                          {document.drafts[active.id] !== undefined &&
                          draft(active) !== proposed(active)
                            ? "编辑后待复核"
                            : evidenceStatusLabels[active.status]}
                        </span>
                      </div>
                      <p>
                        <CitedText
                          text={active.reason}
                          references={referencesByNumber}
                        />
                      </p>
                      <div className="le-suggestion-copy">
                        <strong>
                          {canApply(active) ? "建议表达" : "复核建议"}
                        </strong>
                        <p>
                          <CitedText
                            text={active.revised}
                            references={referencesByNumber}
                          />
                        </p>
                      </div>
                      {!canApply(active) && (
                        <small className="le-review-note">
                          此段保留原文，复核说明不会直接写入成稿。
                        </small>
                      )}
                      <div className="le-suggestion-actions">
                        {canApply(active) && (
                          <button
                            className="le-button le-primary"
                            disabled={
                              document.drafts[active.id] !== undefined ||
                              document.ignored.includes(active.id)
                            }
                            onClick={() => applySegment(active)}
                          >
                            <Check size={13} />
                            {document.drafts[active.id] !== undefined
                              ? "已处理"
                              : "应用本段"}
                          </button>
                        )}
                        <button
                          className="le-button"
                          onClick={() => {
                            updateDocument((doc) => ({
                              ...doc,
                              ignored: [
                                ...new Set([...doc.ignored, active.id]),
                              ],
                            }));
                            setNotice("已保留本段原文。其他段落仍可应用修改。");
                          }}
                          disabled={
                            document.drafts[active.id] !== undefined ||
                            document.ignored.includes(active.id)
                          }
                        >
                          保留原文
                        </button>
                        {(document.drafts[active.id] !== undefined ||
                          document.ignored.includes(active.id)) && (
                          <button
                            className="le-reset-paragraph"
                            onClick={() => resetParagraph(active)}
                          >
                            <RotateCcw size={12} />
                            恢复
                          </button>
                        )}
                      </div>
                    </div>
                    {active.evidence.length > 0 && (
                      <div className="le-linked-references">
                        <div>
                          <BookOpen size={14} />
                          <strong>
                            {activeManuallyEdited
                              ? "原文参考文献"
                              : "本段参考文献"}
                          </strong>
                          <span>{activeRefs.length} 篇</span>
                        </div>
                        {activeManuallyEdited && (
                          <p className="le-review-note">
                            以下来源对应原始文案，手动改写后的支持范围需重新核对。
                          </p>
                        )}
                        {activeRefs.map((ref) => (
                          <ReferenceLink key={ref.id} reference={ref}>
                            <b>[{refNumber(ref.id)}]</b>
                            <span>
                              {ref.title}
                              {referenceDestination(ref).isSearch && (
                                <small>检索文献 · 原文待定位</small>
                              )}
                            </span>
                            <ExternalLink size={13} />
                          </ReferenceLink>
                        ))}
                      </div>
                    )}
                    {active.evidence.length > 0 && (
                      <details className="le-boundary">
                        <summary>查看证据支持范围</summary>
                        {active.evidence.map((link, index) => (
                          <div key={index}>
                            <strong>
                              [{refNumber(link.referenceId)}] {link.locator}
                            </strong>
                            <p>{link.support}</p>
                            <p className="le-boundary-note">
                              边界：{link.boundary}
                            </p>
                          </div>
                        ))}
                      </details>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="le-reference-heading">
                  <h2>参考文献</h2>
                  <p>
                    {active
                      ? `第 ${active.sourceNumber} 段关联 ${activeRefs.length} 篇`
                      : "暂无关联文献"}
                  </p>
                  <button onClick={() => setSideView("suggestions")}>
                    <ChevronLeft size={12} />
                    返回修改建议
                  </button>
                </div>
                {activeManuallyEdited && (
                  <p className="le-custom-note">
                    当前段落已手动修改。以下为原文关联来源，尚未重新核验编辑后的表达。
                  </p>
                )}
                {!activeRefs.length && (
                  <p className="le-empty-refs">
                    本段暂无对应文献。
                    {preset
                      ? "可选择其他段落查看其引用。"
                      : "自定义内容的引用需要人工补充核对。"}
                  </p>
                )}
                {activeRefs.map((ref) => (
                  <ReferenceCard
                    key={ref.id}
                    reference={ref}
                    number={Number(refNumber(ref.id))}
                    links={active.evidence.filter(
                      (link) => link.referenceId === ref.id,
                    )}
                    onCopy={(text, label) => void copy(text, label)}
                  />
                ))}
                <details className="le-all-references">
                  <summary>
                    {selectedImage ? "本图参考文献" : "全部参考文献"}（
                    {displayedReferences.length}）
                  </summary>
                  {displayedReferences.map((ref) => (
                    <ReferenceCard
                      key={ref.id}
                      reference={ref}
                      number={Number(refNumber(ref.id))}
                      onCopy={(text, label) => void copy(text, label)}
                    />
                  ))}
                </details>
              </>
            )}
          </div>
          <footer className="le-review-footer">
            <span>
              {preset
                ? "本地预置审阅结果 · 不代表医学审批通过"
                : "自定义内容 · 证据待人工核查"}
            </span>
            <button
              type="button"
              className="le-demo-reset"
              disabled={
                !document.resetSnapshot &&
                !Object.keys(document.drafts).length &&
                !document.ignored.length
              }
              onClick={document.resetSnapshot ? undoDemoReset : resetDemo}
              title={
                document.resetSnapshot
                  ? "恢复重置前的文稿，包括手动修改"
                  : "重置当前文稿的应用与编辑，保留原文，回到建议待应用状态"
              }
            >
              <RotateCcw size={11} />
              {document.resetSnapshot ? "撤销重置" : "重置演示"}
            </button>
          </footer>
        </aside>
      </div>
      {notice && (
        <div className="le-notice" role="status">
          <Check size={14} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
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
  const destination = referenceDestination(reference);
  const doiUrl = referenceDoiUrl(reference);
  const pmidUrl = referencePmidUrl(reference);
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
      <h4>
        <ReferenceLink reference={reference}>
          {reference.title} <ExternalLink size={12} />
        </ReferenceLink>
      </h4>
      <p className="evidence-ref-authors">{reference.authors}</p>
      <p className="evidence-ref-publication">{reference.publication}</p>
      {(reference.doi || reference.pmid) && (
        <div className="evidence-ref-id">
          {doiUrl && (
            <a href={doiUrl} target="_blank" rel="noopener noreferrer">
              DOI · {reference.doi}
            </a>
          )}
          {pmidUrl && (
            <a href={pmidUrl} target="_blank" rel="noopener noreferrer">
              PMID · {reference.pmid}
            </a>
          )}
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
        <ReferenceLink reference={reference}>
          <ExternalLink size={11} /> {destination.label}
        </ReferenceLink>
        {doiUrl && doiUrl !== destination.url && (
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
