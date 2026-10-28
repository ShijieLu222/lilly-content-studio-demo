import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BookOpen,
  BookOpenCheck,
  SearchCheck,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CirclePause,
  Clapperboard,
  Clock3,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  GitBranch,
  ImagePlus,
  Images,
  Info,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  LoaderCircle,
  Maximize2,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { productInfo, seriesItems } from "./content";
import type { ProductKind } from "./content";
import AssetLibrary from "./components/AssetLibrary";
import WorkflowMap from "./components/WorkflowMap";
import LiteratureStudio from "./components/LiteratureWorkspace";
import ArticleWorkspace from "./components/ArticleWorkspace";
import type { ArticleDraft } from "./lib/articleWorkspace";
import VideoChatStudio from "./components/VideoChatStudio";
import VideoResults from "./components/VideoResults";
import VideoWorkflow from "./components/VideoWorkflow";
import ResultPending from "./components/ResultPending";
import { isResultReady } from "./lib/workflowState";
import { videoVersions } from "./videoDemo";
import { getAssets, assetSlots } from "./lib/assets";
import type { Asset } from "./lib/assets";
import "./components/CreativeStudio.css";
import "./components/ArticleStudio.css";

type Decision = { stage: number; text: string; at: string; version: number };
type Project = {
  id: string;
  kind: ProductKind;
  title: string;
  prompt: string;
  stage: number;
  completed: number[];
  concept: string | null;
  layout: number | null;
  version: number;
  decisions: Decision[];
  feedback: string[];
  createdAt: string;
  confirmedAssets?: string;
  revisionAssets?: string;
  videoVersionId?: string;
  articleWorkflow?: "upload-v1";
};
type Page = "home" | "studio" | "article" | "literature" | "assets" | "brand";
type HomeKind = ProductKind | "literature";
type Modal = "assets" | "help" | "reset" | "preview" | null;
const STORAGE = "lilly-studio-projects-v1";
function readProjects(): Project[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (p) =>
            p &&
            (p.kind === "article" || p.kind === "video") &&
            Number.isInteger(p.stage) &&
            p.stage >= 0 &&
            p.stage <= 6 &&
            Array.isArray(p.completed) &&
            Array.isArray(p.decisions) &&
            Array.isArray(p.feedback),
        )
      : [];
  } catch {
    return [];
  }
}
const videoIdFor = (p: Project) =>
  p.videoVersionId ||
  videoVersions.find((v) => v.conceptId === p.concept)?.id ||
  videoVersions[0].id;
const time = () =>
  new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function AssetMedia({
  asset,
  className = "",
  controls = true,
}: {
  asset: Asset;
  className?: string;
  controls?: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const src = URL.createObjectURL(asset.blob);
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [asset.blob]);
  return asset.type === "video" ? (
    <video
      className={className}
      src={url}
      controls={controls}
      playsInline
      preload="metadata"
    />
  ) : (
    <img className={className} src={url} alt={asset.name} />
  );
}
function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Logo({ small = false }: { small?: boolean }) {
  if (small)
    return (
      <div className="brand small">
        <span className="brand-symbol">
          <Sparkles size={16} strokeWidth={1.6} />
        </span>
      </div>
    );
  return (
    <div className="brand brand-official">
      <img src="/assets/lilly-logo.svg" alt="礼来 Lilly" />
    </div>
  );
}
function ConceptArt({
  variant = 0,
  video = false,
}: {
  variant?: number;
  video?: boolean;
}) {
  return (
    <div
      className={`concept-art variant-${variant} ${video ? "video-art" : ""}`}
      aria-hidden="true"
    >
      <div className="art-orbit orbit-a" />
      <div className="art-orbit orbit-b" />
      <div className="art-grid" />
      <div className="art-sheet sheet-back">
        <i />
        <i />
        <i />
      </div>
      <div className="art-sheet sheet-front">
        {video ? (
          <Play size={27} fill="currentColor" />
        ) : (
          <BookOpen size={27} strokeWidth={1.25} />
        )}
        <span />
        <span />
      </div>
      <div className="art-spark">
        <Sparkles size={20} />
      </div>
      <div className="art-cube" />
      <div className="art-dot" />
    </div>
  );
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [activeId, setActiveId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("project"),
  );
  const [page, setPage] = useState<Page>(() =>
    new URLSearchParams(window.location.search).get("page") === "literature"
      ? "literature"
      : new URLSearchParams(window.location.search).get("page") === "article"
        ? "article"
        : new URLSearchParams(window.location.search).get("page") === "video"
          ? "studio"
          : "home",
  );
  const [tab, setTab] = useState<"chat" | "flow" | "records">("chat");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetLoadState, setAssetLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [input, setInput] = useState("");
  const [homeKind, setHomeKind] = useState<HomeKind>("video");
  const [literatureInput, setLiteratureInput] = useState<string | undefined>();
  const [literatureEntry, setLiteratureEntry] = useState(0);
  const [articleEntry, setArticleEntry] = useState(0);
  const [articleBrief, setArticleBrief] = useState("");
  const [articleDraftId, setArticleDraftId] = useState<string | undefined>(
    () =>
      new URLSearchParams(window.location.search).get("page") === "article"
        ? new URLSearchParams(window.location.search).get("project") ||
          undefined
        : undefined,
  );
  const [selectedPoster, setSelectedPoster] = useState(0);
  const [previewVideoId, setPreviewVideoId] = useState<string>(
    videoVersions[0].id,
  );
  const [previewMode, setPreviewMode] = useState<"series" | "long">("series");
  const [inspectedStage, setInspectedStage] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [revisionScope, setRevisionScope] = useState<
    "local" | "visual" | "concept"
  >("local");
  const [focusPreview, setFocusPreview] = useState(false);
  const [brandRules, setBrandRules] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("lilly-brand-rules") || "[true,true,true,true]",
      ) as boolean[];
    } catch {
      return [true, true, true, true];
    }
  });
  const routeRecoveryRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const active = projects.find((p) => p.id === activeId);
  const focusedWorkspace =
    page === "literature" ||
    page === "article" ||
    (page === "studio" && active?.kind === "video");
  const info = active ? productInfo[active.kind] : productInfo.article;
  const shownStage = inspectedStage ?? active?.stage ?? 0;
  const busy = !!active && [0, 1, 4].includes(active.stage);
  const posterAssets = assetSlots
    .filter((s) => s.type === "image")
    .map((s) => assets.find((a) => a.id === s.id));
  const chosenVideoVersion =
    videoVersions.find(
      (v) => v.id === (active ? videoIdFor(active) : undefined),
    ) || videoVersions[0];
  const videoAsset = assets.find((a) => a.id === chosenVideoVersion.id);
  const selectedAsset =
    active?.kind === "video"
      ? assets.find((a) => a.id === previewVideoId)
      : posterAssets[selectedPoster];
  const readyCount =
    active?.kind === "video"
      ? Number(!!videoAsset)
      : posterAssets.filter(Boolean).length;
  const completeAssets =
    active?.kind === "video"
      ? !!videoAsset
      : posterAssets.filter(Boolean).length === 5;
  const signatureFor = (kind: ProductKind, list: Asset[], videoId?: string) =>
    list
      .filter((a) => (kind === "video" ? a.id === videoId : a.type === "image"))
      .map((a) => `${a.id}:${a.updatedAt}`)
      .sort()
      .join("|");
  const canPreviewResults = isResultReady({
    project: active,
    assetsLoaded: assetLoadState === "ready",
    hasRequiredAssets: completeAssets,
    assetSignature: active
      ? signatureFor(active.kind, assets, chosenVideoVersion.id)
      : "",
  });
  const notify = (message: string) => setToast(message);
  async function refreshAssets() {
    setAssetLoadState("loading");
    try {
      const next = await getAssets();
      setAssets(next);
      setAssetLoadState("ready");
      setProjects((all) =>
        all.map((p) =>
          p.kind === "article" &&
          p.articleWorkflow !== "upload-v1" &&
          p.stage === 6 &&
          p.confirmedAssets !== signatureFor(p.kind, next, videoIdFor(p))
            ? {
                ...p,
                stage: 5,
                completed: p.completed.filter((s) => s < 5),
                confirmedAssets: undefined,
                decisions: [
                  ...p.decisions,
                  {
                    stage: 5,
                    text: "素材已变更，成稿确认失效，等待重新复核",
                    at: time(),
                    version: p.version,
                  },
                ],
              }
            : p,
        ),
      );
    } catch {
      setAssetLoadState("error");
      notify("无法读取本地素材，请检查浏览器存储权限。");
    }
  }
  useEffect(() => {
    void refreshAssets();
  }, []);
  useEffect(() => {
    setPreviewVideoId(chosenVideoVersion.id);
  }, [active?.id, chosenVideoVersion.id]);
  useEffect(() => {
    if (!canPreviewResults) {
      setFocusPreview(false);
      setModal((current) => (current === "preview" ? null : current));
    }
  }, [canPreviewResults]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(projects));
    } catch {
      notify("浏览器存储空间不足，请先导出项目记录。");
    }
  }, [projects]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (
      page !== "studio" ||
      !active ||
      active.kind === "video" ||
      ![0, 1, 4].includes(active.stage)
    )
      return;
    const id = active.id,
      stage = active.stage;
    const timer = setTimeout(
      () => {
        setProjects((all) =>
          all.map((p) =>
            p.id === id && p.stage === stage
              ? {
                  ...p,
                  completed: [...new Set([...p.completed, stage])],
                  stage: stage + 1,
                }
              : p,
          ),
        );
      },
      stage === 4 ? 2200 : 1100,
    );
    return () => clearTimeout(timer);
  }, [page, active?.id, active?.stage]);
  useEffect(() => {
    setInspectedStage(null);
  }, [active?.id, active?.stage]);
  useEffect(() => {
    if (!active || active.stage < 2 || tab !== "chat") return;
    const frame = requestAnimationFrame(() => {
      const container = conversationRef.current;
      const label = container?.querySelector(
        ".stage-label, .delivery-card, .production-card",
      );
      if (container && label)
        container.scrollTop +=
          label.getBoundingClientRect().top -
          container.getBoundingClientRect().top -
          14;
    });
    return () => cancelAnimationFrame(frame);
  }, [active?.stage, active?.id, tab]);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement;
    const timer = setTimeout(() => dialogRef.current?.focus(), 0);
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [modal]);
  function update(patch: Partial<Project>) {
    if (active)
      setProjects((all) =>
        all.map((p) => (p.id === active.id ? { ...p, ...patch } : p)),
      );
  }
  useEffect(() => {
    if (page === "studio" && !active) {
      if (!routeRecoveryRef.current) {
        routeRecoveryRef.current = true;
        start("video");
      }
      return;
    }
    routeRecoveryRef.current = false;
    const url = new URL(window.location.href);
    if (page === "literature") {
      url.searchParams.set("page", "literature");
      url.searchParams.delete("project");
    } else if (page === "article") {
      url.searchParams.set("page", "article");
      if (articleDraftId) url.searchParams.set("project", articleDraftId);
      else url.searchParams.delete("project");
    } else if (page === "studio" && active?.kind === "video") {
      url.searchParams.set("page", "video");
      url.searchParams.set("project", active.id);
    } else {
      url.searchParams.delete("page");
      url.searchParams.delete("project");
    }
    window.history.replaceState(null, "", url);
  }, [page, active?.id, articleDraftId]);
  function openArticle(brief = "") {
    setArticleEntry((entry) => entry + 1);
    setArticleBrief(brief);
    setArticleDraftId(undefined);
    setActiveId(null);
    setPage("article");
    setInput("");
  }
  const articleResultReady = useCallback((draft: ArticleDraft) => {
    setArticleDraftId(draft.id);
    setActiveId(draft.id);
  }, []);
  const rememberArticle = useCallback((draft: ArticleDraft) => {
    setProjects((all) => {
      const existing = all.find((project) => project.id === draft.id);
      const title = draft.input.title.trim() || "新的图文创作";
      if (
        existing?.title === title &&
        existing.prompt === draft.input.brief
      )
        return all;
      const summary: Project = {
        id: draft.id,
        kind: "article",
        articleWorkflow: "upload-v1",
        title,
        prompt: draft.input.brief,
        stage: 6,
        completed: [0, 1, 2, 3, 4, 5, 6],
        concept: null,
        layout: null,
        version: 1,
        decisions: [],
        feedback: [],
        createdAt: new Date(draft.createdAt).toISOString(),
      };
      return existing
        ? all.map((project) => (project.id === draft.id ? summary : project))
        : [summary, ...all];
    });
  }, []);
  function start(kind: ProductKind, prompt?: string, videoVersionId?: string) {
    if (kind === "article") {
      openArticle(prompt);
      return;
    }
    const videoVersion = videoVersions.find((v) => v.id === videoVersionId);
    const p: Project = {
      id: crypto.randomUUID(),
      kind,
      title: prompt?.trim().slice(0, 22) || "新的视频创作",
      prompt: prompt?.trim() || "",
      stage: 0,
      completed: [],
      concept: videoVersion?.conceptId || null,
      videoVersionId: videoVersion?.id || videoVersions[0].id,
      layout: null,
      version: 1,
      decisions: [],
      feedback: [],
      createdAt: new Date().toISOString(),
    };
    setProjects((all) => [p, ...all]);
    setActiveId(p.id);
    setPage("studio");
    setTab("chat");
    setInput("");
    setPreviewMode("series");
    setSelectedPoster(0);
    setFocusPreview(false);
  }
  function openProject(p: Project) {
    if (p.kind === "article" && p.articleWorkflow === "upload-v1") {
      setArticleEntry((entry) => entry + 1);
      setArticleBrief("");
      setArticleDraftId(p.id);
      setActiveId(p.id);
      setPage("article");
      return;
    }
    setActiveId(p.id);
    setPage("studio");
    setTab("chat");
    setInput("");
    setFocusPreview(false);
  }
  function advance(confirmedLayout?: number) {
    if (!active) return;
    if (active.stage === 2 && !active.concept) return;
    if (
      active.stage === 3 &&
      active.layout === null &&
      confirmedLayout === undefined
    )
      return;
    if (active.stage === 5 && assetLoadState !== "ready") {
      notify(
        assetLoadState === "error"
          ? "素材载入失败，请在右侧重试后继续。"
          : "素材正在载入，请稍候再确认。",
      );
      return;
    }
    if (active.stage === 5 && !completeAssets) {
      setModal("assets");
      return;
    }
    if (
      active.stage === 5 &&
      active.revisionAssets ===
        signatureFor(active.kind, assets, chosenVideoVersion.id)
    ) {
      notify("请先导入修改后的成品，再确认当前版本。");
      setModal("assets");
      return;
    }
    const choice =
      active.stage === 2
        ? info.concepts.find((c) => c.id === active.concept)?.title
        : active.stage === 3
          ? active.kind === "video"
            ? `确认${chosenVideoVersion.label}的四段分镜 · ${chosenVideoVersion.title}`
            : active.layout === 0
              ? "方案一"
              : "方案二"
          : active.kind === "video"
            ? `确认${chosenVideoVersion.label}交付准备 · ${videoAsset?.name}`
            : "确认素材与方案，完成流程并展示成果";
    update({
      layout: confirmedLayout ?? active.layout,
      stage: active.stage + 1,
      completed: [
        ...new Set([
          ...active.completed,
          active.stage,
          ...(active.stage === 5 ? [6] : []),
        ]),
      ],
      confirmedAssets:
        active.stage === 5
          ? signatureFor(active.kind, assets, chosenVideoVersion.id)
          : active.confirmedAssets,
      revisionAssets: active.stage === 5 ? undefined : active.revisionAssets,
      decisions: [
        ...active.decisions,
        {
          stage: active.stage,
          text: choice || "",
          at: time(),
          version: active.version,
        },
      ],
    });
  }
  function revise(stage: number, feedback?: string) {
    if (!active) return;
    update({
      stage,
      confirmedAssets: undefined,
      revisionAssets:
        active.stage >= 5
          ? signatureFor(active.kind, assets, chosenVideoVersion.id)
          : active.revisionAssets,
      completed: active.completed.filter((s) => s < stage),
      concept: stage <= 2 ? null : active.concept,
      layout: stage <= 3 ? null : active.layout,
      version: active.version + 1,
      feedback: feedback ? [...active.feedback, feedback] : active.feedback,
      decisions: [
        ...active.decisions,
        {
          stage,
          text: feedback || `返回${info.stages[stage].title}重新确认`,
          at: time(),
          version: active.version + 1,
        },
      ],
    });
    setInspectedStage(null);
    setFocusPreview(false);
    setModal((current) => (current === "preview" ? null : current));
    setTab("chat");
  }
  function submit() {
    if (!input.trim()) return;
    if (!active || page === "home") {
      startFromHome();
      return;
    }
    if (busy) return;
    const text = input.trim();
    const destination =
      active.stage < 4
        ? active.stage
        : revisionScope === "concept"
          ? 2
          : revisionScope === "visual"
            ? 3
            : 5;
    revise(destination, text);
    setInput("");
    notify(
      destination === 5
        ? "修改意见已记录。请导入修改后的成品，再确认版本。"
        : "修改意见已记录，请重新确认当前方案。",
    );
  }
  function exportProject() {
    if (!active) return;
    const output = {
      ...active,
      mode: "local-preset-demo",
      product: info.name,
      selectedConcept: info.concepts.find((c) => c.id === active.concept),
      stages: info.stages,
      videoResult:
        active.kind === "video"
          ? {
              selectedVersionId: chosenVideoVersion.id,
              selectedVersion: chosenVideoVersion.label,
              title: chosenVideoVersion.title,
              source: videoAsset?.source || "imported",
              storyboardReference: chosenVideoVersion.scenes,
              bundledOriginal:
                videoAsset?.source === "bundled"
                  ? chosenVideoVersion
                  : undefined,
              note: "分镜按原版成片拆解；若素材已替换，需重新核对镜头与时长。",
            }
          : undefined,
      assets: assets
        .filter((a) =>
          active.kind === "video" ? a.type === "video" : a.type === "image",
        )
        .map(({ id, name, type, updatedAt, source }) => ({
          id,
          name,
          type,
          updatedAt,
          source: source || "imported",
        })),
      brandRules,
      note: "预设工作流演示；素材为随项目保存或本地导入的成品；未进行在线生成、医学审核或外部发布。",
    };
    saveBlob(
      new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }),
      `${active.title}-v${active.version}.json`,
    );
    notify("项目记录已导出，包含流程、选择、修改意见和素材清单。");
  }
  async function downloadAsset() {
    if (!canPreviewResults) return;
    if (active?.kind === "article" && previewMode === "long") {
      const escape = (text: string) =>
        text.replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c]!,
        );
      const sections = await Promise.all(
        seriesItems.map(async (item, i) => {
          const asset = posterAssets[i];
          const url = asset
            ? await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(asset.blob);
              })
            : "";
          return `<section><small>0${i + 1}</small><h2>${escape(item.title)}</h2>${url ? `<img src="${url}" alt="${escape(item.title)}">` : '<p class="empty">海报待导入</p>'}<p>${escape(item.description)}</p></section>`;
        }),
      );
      saveBlob(
        new Blob(
          [
            `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>礼医系列图文编排预览</title><style>body{margin:0;background:#f6eff3;color:#825269;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}main{max-width:640px;margin:auto;background:white}header{padding:50px 35px;background:linear-gradient(135deg,#fff3f1,#ead1e4)}header h1{font-size:38px;line-height:1.6;font-weight:500}header p,footer{font-size:12px;line-height:1.8}section{padding:30px;border-bottom:1px solid #f2e5ed}section small{color:#c386a4}h2{font-size:23px;font-weight:500}img{width:100%;height:auto}section p{font-size:14px;line-height:1.9;color:#a17a90}.empty{padding:60px 20px;text-align:center;background:#f9eff5}footer{padding:30px;color:#b99aad}</style><main><header><small>LILLY · EDITORIAL</small><h1>连接知识<br>让灵感发生</h1><p>医生服务系列 · 长图文编排示意</p></header>${sections.join("")}<footer>本地浏览器编排预览。文案为演示说明，正式医学文案与引用待确认。未验证公众号兼容性。</footer></main></html>`,
          ],
          { type: "text/html" },
        ),
        `${active.title}-编排预览.html`,
      );
      notify("已导出可离线打开的长图文编排预览。");
      return;
    }
    if (selectedAsset) saveBlob(selectedAsset.blob, selectedAsset.name);
  }
  function openLiterature(text?: string) {
    setLiteratureEntry((entry) => entry + 1);
    setLiteratureInput(text);
    setPage("literature");
  }
  function startFromHome() {
    if (homeKind === "literature") {
      openLiterature(input.trim() || undefined);
      setInput("");
    } else start(homeKind, input);
  }
  const switchProduct = (kind: ProductKind) => {
    if (kind === "article") {
      openArticle();
      return;
    }
    const previous = projects.find((p) => p.kind === kind);
    if (previous) openProject(previous);
    else start(kind);
  };

  function renderPreview({ large = false }: { large?: boolean }) {
    if (!canPreviewResults)
      return (
        <ResultPending
          kind={active?.kind || "article"}
          stage={active?.stage || 0}
          completed={active?.completed || []}
          total={info.stages.length}
          stageTitle={info.stages[active?.stage || 0].title}
          loading={assetLoadState === "loading"}
          error={assetLoadState === "error"}
          needsAssets={!completeAssets}
          onRetry={() => void refreshAssets()}
        />
      );
    if (active?.kind === "video" && modal === "preview" && !large)
      return (
        <div className="result-preview">
          <div className="note">
            <Monitor size={16} />
            <span>视频已在放大视图中打开</span>
          </div>
        </div>
      );
    if (active?.kind === "video")
      return (
        <VideoResults
          assets={assets}
          selectedVersionId={chosenVideoVersion.id}
          previewVersionId={previewVideoId}
          onPreviewVersion={setPreviewVideoId}
          onDownload={(a) => {
            if (canPreviewResults) saveBlob(a.blob, a.name);
          }}
          onExpand={large ? undefined : () => setModal("preview")}
          large={large}
        />
      );
    return renderArticlePreview({ large });
  }
  function renderArticlePreview({ large = false }: { large?: boolean }) {
    return (
      <div className={`result-preview ${large ? "large-preview" : ""}`}>
        <div className="preview-heading">
          <div>
            <span className="eyebrow">LIVE CANVAS</span>
            <h3>{active?.kind === "video" ? "视频预览" : "作品预览"}</h3>
          </div>
          <Badge tone={selectedAsset ? "green" : "muted"}>
            {selectedAsset ? "已导入成品" : "待接入成品"}
          </Badge>
        </div>
        {active?.kind === "article" && (
          <div className="preview-segment">
            <button
              className={previewMode === "series" ? "selected" : ""}
              onClick={() => setPreviewMode("series")}
            >
              <Images size={14} />
              系列海报
            </button>
            <button
              className={previewMode === "long" ? "selected" : ""}
              onClick={() => setPreviewMode("long")}
            >
              <FileText size={14} />
              长图文编排
            </button>
          </div>
        )}
        <div
          className={`preview-canvas ${active?.kind === "video" ? "video-canvas" : ""} ${previewMode === "long" && active?.kind === "article" ? "long-canvas" : ""}`}
        >
          {previewMode === "long" ? (
            <div className="long-article">
              <div className="long-cover">
                <span>LILLY · EDITORIAL</span>
                <h2>
                  连接知识
                  <br />
                  让灵感发生
                </h2>
                <p>医生服务系列 · 长图文编排示意</p>
                <Sparkles size={32} />
              </div>
              {seriesItems.map((item, i) => (
                <section className="long-section" key={item.title}>
                  <span className="section-no">0{i + 1}</span>
                  <h4>{item.title}</h4>
                  {posterAssets[i] ? (
                    <AssetMedia asset={posterAssets[i]!} />
                  ) : (
                    <div className="long-image-empty">
                      <FileImage size={26} />
                      <span>海报 {i + 1} 待导入</span>
                    </div>
                  )}
                  <p>{item.description}</p>
                </section>
              ))}
              <footer>版式为演示编排，医学文案与引用待提供和确认。</footer>
            </div>
          ) : selectedAsset ? (
            <AssetMedia asset={selectedAsset} />
          ) : (
            <div className="poster-placeholder">
              <div className="poster-label">
                <span>LILLY</span>
                <small>VISUAL CONCEPT</small>
              </div>
              <div className="poster-copy">
                <span className="poster-kicker">让知识，触手可及</span>
                <h2>
                  {[
                    "连接资源\n开启更多可能",
                    "前沿新知\n尽在视野之内",
                    "每一次查找\n都有清晰路径",
                    "探索研究\n看见新的可能",
                    "专业参考\n陪伴每次查阅",
                  ][selectedPoster]
                    .split("\n")
                    .map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                </h2>
              </div>
              <ConceptArt variant={selectedPoster % 3} />
              <div className="poster-footer">
                <span>{seriesItems[selectedPoster]?.title}</span>
                <span>版式示意 · 非生成成品</span>
              </div>
            </div>
          )}
        </div>
        {active?.kind === "article" && previewMode === "series" && (
          <div className="poster-thumbnails">
            {assetSlots
              .filter((s) => s.type === "image")
              .map((s, i) => (
                <button
                  key={s.id}
                  className={selectedPoster === i ? "active" : ""}
                  onClick={() => setSelectedPoster(i)}
                  aria-label={`预览${s.title}`}
                  aria-pressed={selectedPoster === i}
                >
                  {posterAssets[i] ? (
                    <AssetMedia asset={posterAssets[i]!} />
                  ) : (
                    <>
                      <FileImage size={18} />
                      <small>0{i + 1}</small>
                    </>
                  )}
                  <span>
                    {
                      [
                        "一站服务",
                        "前沿资讯",
                        "文献查询",
                        "临床研究",
                        "用药指南",
                      ][i]
                    }
                  </span>
                </button>
              ))}
          </div>
        )}
        <div className="preview-caption">
          <span>
            {active?.kind === "video"
              ? videoAsset?.name || "导入视频后可原生播放"
              : `已接入 ${posterAssets.filter(Boolean).length} / 5 张海报`}
          </span>
          <div>
            {!large && (
              <button
                className="icon-button"
                title="放大预览"
                onClick={() => setModal("preview")}
              >
                <Maximize2 size={16} />
              </button>
            )}
            <button
              className="icon-button"
              title={
                previewMode === "long" && active?.kind === "article"
                  ? "下载编排预览 HTML"
                  : "下载当前成品"
              }
              disabled={
                previewMode === "long" && active?.kind === "article"
                  ? !posterAssets.some(Boolean)
                  : !selectedAsset
              }
              onClick={downloadAsset}
            >
              <ArrowDownToLine size={16} />
            </button>
          </div>
        </div>
        {!selectedAsset && (
          <button className="import-inline" onClick={() => setModal("assets")}>
            <ImagePlus size={16} />
            接入已有{active?.kind === "video" ? "视频" : "海报"}成品
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    );
  }

  function renderStageContent() {
    if (!active) return null;
    const isCurrent = shownStage === active.stage;
    const currentConcept = info.concepts.find((c) => c.id === active.concept);
    return (
      <>
        <div className="agent-message-head">
          <Logo small />
          <strong>Lilly 创意助手</strong>
          <span>{busy && isCurrent ? "正在编排" : "创作伙伴"}</span>
          <Badge tone="muted">预设演示</Badge>
        </div>
        <div className="agent-intro">
          {shownStage === 0
            ? "我会先整理你的传播目标、内容要求和交付形式，为这次创作建立清晰的依据。"
            : shownStage === 1
              ? "正在整理已提供的项目资料，区分品牌约束、参考案例与可发挥的创作空间。"
              : shownStage === 2
                ? `已梳理这次${active.kind === "article" ? "系列图文" : "视频"}的创作任务。下面是三个不同的叙事方向，你可以选择一个继续，也可以补充你的想法。`
                : shownStage === 3
                  ? `我们将沿着「${currentConcept?.title || "已选创意"}」继续。请选择${active.kind === "video" ? "镜头节奏与分镜方案" : "画面构图与信息组织方式"}。`
                  : shownStage === 4
                    ? "已收到你的方案选择。正在演示制作编排，并准备呈现素材库中的对应成品。"
                    : shownStage === 5
                      ? "请核对已选方案与交付素材。完成本次确认后，右侧将展示最终成果；画面与文案可在展示后继续复核。"
                      : "本轮创作流程已完成。创意选择、画面方案和成稿版本已保存，可以导出项目记录与已导入的成品。"}
        </div>
        {shownStage <= 1 && (
          <div className="analysis-card">
            <div className="processing-line">
              <LoaderCircle className="spin" size={17} />
              {shownStage === 0 ? "整理创作任务" : "整理参考依据"}
              <span>演示中</span>
            </div>
            {[
              ["受众与渠道", "医生服务场景 · 品牌内容展示"],
              [
                "固定要求",
                active.kind === "article"
                  ? "5 张系列海报 · 统一视觉体系"
                  : "A 版约 5 秒 / B 版约 6 秒 · 大会开场",
              ],
              ["视觉基调", "礼来红 · 温暖专业 · 适量梦幻紫"],
            ].map(([a, b]) => (
              <div className="analysis-row" key={a}>
                <Check size={15} />
                <span>{a}</span>
                <strong>{b}</strong>
              </div>
            ))}
          </div>
        )}
        {shownStage === 2 && (
          <>
            <div className="source-strip">
              <FileText size={14} />
              <span>会议需求与创意工作流</span>
              <span className="source-dot" />
              <span>项目资料依据</span>
              <CheckCheck size={14} />
            </div>
            <div className="stage-label">
              <span>01</span>
              <h3>确认创意概念</h3>
              <Badge>需要你的选择</Badge>
            </div>
            <div className="concept-list">
              {info.concepts.map((concept, i) => (
                <button
                  key={concept.id}
                  className={`concept-card ${active.concept === concept.id ? "chosen" : ""}`}
                  disabled={!isCurrent}
                  onClick={() => update({ concept: concept.id })}
                >
                  <div className="concept-mini">
                    <ConceptArt variant={i} video={active.kind === "video"} />
                  </div>
                  <div className="concept-body">
                    <span className="concept-eyebrow">{concept.eyebrow}</span>
                    <h4>{concept.title}</h4>
                    <p>{concept.description}</p>
                    <div className="concept-tags">
                      {concept.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    {active.concept === concept.id && (
                      <div className="concept-expanded">
                        <p>
                          <b>画面事件</b>
                          {concept.scene}
                        </p>
                        <p>
                          <b>推荐理由</b>
                          {concept.reason}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="selection-circle">
                    {active.concept === concept.id && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
            {isCurrent && (
              <div className="gate-actions">
                <span>
                  <CirclePause size={14} />
                  选择之后，才进入画面设计
                </span>
                <button
                  className="button primary"
                  disabled={!active.concept}
                  onClick={() => advance()}
                >
                  确认创意
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {shownStage === 3 && (
          <>
            <div className="decision-summary">
              <Check size={15} />
              <span>已确认创意</span>
              <strong>{currentConcept?.title}</strong>
            </div>
            <div className="stage-label">
              <span>02</span>
              <h3>确认{active.kind === "video" ? "分镜" : "画面"}方案</h3>
              <Badge>需要你的选择</Badge>
            </div>
            <div className="layout-options">
              {[0, 1].map((i) => (
                <button
                  className={`layout-option ${active.layout === i ? "chosen" : ""}`}
                  key={i}
                  disabled={!isCurrent}
                  onClick={() => update({ layout: i })}
                >
                  <div
                    className={`layout-sketch sketch-${i} ${active.kind === "video" ? "film-sketch" : ""}`}
                  >
                    {active.kind === "video" ? (
                      [0, 1, 2].map((n) => (
                        <div key={n}>
                          <span>0{n + 1}</span>
                          <Play size={18} />
                          <small>
                            {i === 0
                              ? ["品牌引入", "内容展开", "画面定格"][n]
                              : ["细节特写", "空间推进", "主题揭示"][n]}
                          </small>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="sketch-copy">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="sketch-person">
                          <BookOpen size={28} />
                        </div>
                        <div className="sketch-caption" />
                      </>
                    )}
                  </div>
                  <div className="layout-copy">
                    <h4>
                      方案 {i + 1} ·{" "}
                      {active.kind === "video"
                        ? i === 0
                          ? "舒展叙事"
                          : "镜头探索"
                        : i === 0
                          ? "叙事与信息并置"
                          : "视觉中心展开"}
                    </h4>
                    <p>
                      {active.kind === "video"
                        ? i === 0
                          ? "3 秒品牌引入 → 8 秒主题展开 → 4 秒定格，节奏从容。"
                          : "4 秒细节特写 → 7 秒镜头推进 → 4 秒主题揭示，更有探索感。"
                        : i === 0
                          ? "人物与场景在左，标题与信息在右；兼顾故事和阅读效率。"
                          : "主体居中，信息向四周展开；突出视觉关系与主题识别。"}
                    </p>
                    <span>
                      {active.layout === i ? (
                        <Check size={14} />
                      ) : (
                        <span className="empty-radio" />
                      )}
                      {active.layout === i ? "已选择" : "选择此方案"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="note">
              <Info size={14} />
              <span>
                这里展示构图草图与节奏示意，最终画面使用你导入的成品。
              </span>
            </div>
            {isCurrent && (
              <div className="gate-actions">
                <button className="text-button" onClick={() => revise(2)}>
                  <ArrowLeft size={14} />
                  调整创意
                </button>
                <button
                  className="button primary"
                  disabled={active.layout === null}
                  onClick={() => advance()}
                >
                  确认方案，开始制作
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {shownStage === 4 && (
          <div className="production-card">
            <div className="production-orb">
              <WandSparkles size={29} />
            </div>
            <h3>正在编排你的创意</h3>
            <p>组织视觉素材、文字层与输出规格</p>
            <div className="progress-track">
              <i />
            </div>
            <div className="production-steps">
              <span>
                <Check size={13} />
                创意方案已锁定
              </span>
              <span>
                <LoaderCircle className="spin" size={13} />
                装配演示结果
              </span>
            </div>
            <small>流程动画演示 · 不调用在线生成模型</small>
          </div>
        )}
        {shownStage === 5 && (
          <>
            <div className="stage-label">
              <span>03</span>
              <h3>确认交付准备</h3>
              <Badge>需要你的确认</Badge>
            </div>
            <div className="review-summary">
              <div>
                <Images size={24} />
                <strong>
                  {readyCount}
                  <small>
                    {" "}
                    / {active.kind === "article" ? "5 张海报" : "1 个视频"}
                  </small>
                </strong>
                <span>已接入成品</span>
              </div>
              <div>
                <GitBranch size={24} />
                <strong>V{active.version.toString().padStart(2, "0")}</strong>
                <span>当前流程版本</span>
              </div>
            </div>
            <div className="review-checks">
              <h4>成果展示后复核清单</h4>
              {[
                "创意与所选主题的表达一致",
                "品牌、主体、文案与素材准确",
                "规格与渠道展示尺寸适配",
              ].map((t) => (
                <div key={t}>
                  <ListChecks size={16} />
                  <span>{t}</span>
                  <Badge tone="muted">待人工复核</Badge>
                </div>
              ))}
            </div>
            <p className="review-disclaimer">
              演示检查项不代表已通过医学或品牌正式审批。
            </p>
            {!completeAssets && (
              <div className="missing-assets">
                <ImagePlus size={18} />
                <div>
                  <strong>等待接入你的最终成品</strong>
                  <p>
                    当前可完整演示流程。导入
                    {active.kind === "article" ? "5 张海报" : "1 个视频"}
                    后可确认交付。
                  </p>
                </div>
                <button
                  className="button light small"
                  onClick={() => setModal("assets")}
                >
                  导入
                </button>
              </div>
            )}
            {isCurrent && (
              <div className="gate-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setRevisionScope("visual");
                    revise(3);
                  }}
                >
                  <Settings2 size={14} />
                  调整方案
                </button>
                <button className="button primary" onClick={() => advance()}>
                  {completeAssets ? "完成流程，展示成果" : "接入成品后确认"}
                  <CheckCheck size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {shownStage === 6 && (
          <div className="delivery-card">
            <div className="delivery-icon">
              <CheckCheck size={30} />
            </div>
            <h3>创意，已准备就绪</h3>
            <p>
              {active.kind === "article"
                ? "五张系列海报与项目决策记录"
                : "视频成片与分镜决策记录"}
              已进入交付状态。
            </p>
            <div className="delivery-details">
              <span>
                流程版本 <b>V{active.version.toString().padStart(2, "0")}</b>
              </span>
              <span>
                确认记录{" "}
                <b>
                  {
                    active.decisions.filter((d) => [2, 3, 5].includes(d.stage))
                      .length
                  }{" "}
                  项
                </b>
              </span>
            </div>
            <div className="delivery-actions">
              <button className="button primary" onClick={exportProject}>
                <ArrowDownToLine size={15} />
                导出项目记录
              </button>
              <button
                className="button secondary"
                onClick={() => setModal("assets")}
              >
                <FolderOpen size={15} />
                查看成品素材
              </button>
            </div>
            <small>交付指本地演示流程完成；未进行外部发布。</small>
          </div>
        )}
        {!isCurrent && (
          <button className="revisit-button" onClick={() => revise(shownStage)}>
            <RotateCcw size={14} />
            从这个阶段重新编辑，下游确认将失效
          </button>
        )}
        {active.feedback.length > 0 && (
          <div className="feedback-record">
            <MessageSquare size={15} />
            <div>
              <strong>最新修改意见</strong>
              <p>{active.feedback[active.feedback.length - 1]}</p>
              <small>意见已记录；成品变化以重新导入的文件为准。</small>
            </div>
          </div>
        )}
      </>
    );
  }

  const stageRail = active ? (
    <nav className="stage-rail" aria-label="创作工作流">
      {info.stages.map((s, i) => (
        <button
          key={s.id}
          title={s.title}
          aria-label={`查看${s.title}`}
          aria-current={i === active.stage ? "step" : undefined}
          aria-pressed={i === shownStage}
          disabled={i > active.stage}
          className={`${i === shownStage ? "current" : ""} ${active.completed.includes(i) ? "done" : ""}`}
          onClick={() => {
            setInspectedStage(i);
            setTab("chat");
            setFocusPreview(false);
          }}
        >
          <span>
            {active.completed.includes(i) ? (
              <Check size={11} />
            ) : (
              String(i + 1).padStart(2, "0")
            )}
          </span>
          <small>{s.shortTitle}</small>
        </button>
      ))}
    </nav>
  ) : null;

  const focusToggle = (
    <button
      className="focus-toggle"
      disabled={!canPreviewResults}
      title={
        canPreviewResults ? "专注查看本次成果" : "完成流程并确认交付后解锁"
      }
      onClick={() => {
        if (canPreviewResults) setFocusPreview(!focusPreview);
      }}
    >
      <Monitor size={14} />
      {focusPreview ? "回到创作" : "专注预览"}
    </button>
  );

  return (
    <div
      className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"} ${focusedWorkspace ? "focused-workspace" : ""}`}
    >
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button"
            title={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            aria-label={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        </div>
        <button
          className="new-project"
          aria-label="开启新创作"
          title="开启新创作"
          onClick={() => {
            if (page === "article") openArticle();
            else if (page === "studio" && active?.kind === "video")
              start("video");
            else {
              setPage("home");
              setActiveId(null);
              setInput("");
            }
          }}
        >
          <Plus size={18} />
          <span className="new-project-label">开启新创作</span>
          <span>⌘</span>
        </button>
        <div className="nav-label">创作空间</div>
        <nav>
          <button
            aria-label="工作台"
            title="工作台"
            className={page === "home" ? "active" : ""}
            onClick={() => setPage("home")}
          >
            <LayoutDashboard size={18} />
            工作台
          </button>
          <button
            className={
              page === "article" ||
              (page === "studio" && active?.kind === "article")
                ? "active"
                : ""
            }
            aria-label="图文创作"
            title="图文创作"
            onClick={() => switchProduct("article")}
          >
            <FileImage size={18} />
            图文创作<span className="nav-new">Agent</span>
          </button>
          <button
            className={
              page === "studio" && active?.kind === "video" ? "active" : ""
            }
            aria-label="视频创作"
            title="视频创作"
            onClick={() => switchProduct("video")}
          >
            <Clapperboard size={18} />
            视频创作<span className="nav-new purple">Agent</span>
          </button>
          <button
            aria-label="文献支持"
            title="文献支持"
            className={page === "literature" ? "active" : ""}
            onClick={() => openLiterature()}
          >
            <BookOpenCheck size={18} />
            文献支持<span className="nav-new literature">Agent</span>
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label history-label">
          最近创作
          <span>
            {projects.length ? String(projects.length).padStart(2, "0") : "—"}
          </span>
        </div>
        <div className="history-list">
          {projects.length ? (
            projects.slice(0, 6).map((p) => (
              <button
                key={p.id}
                className={
                  page === "studio" && activeId === p.id ? "selected" : ""
                }
                onClick={() => openProject(p)}
              >
                {p.kind === "article" ? (
                  <MessageSquare size={14} />
                ) : (
                  <Film size={14} />
                )}
                <span>{p.title}</span>
                {p.stage === 6 && <span className="tiny-dot green-dot" />}
              </button>
            ))
          ) : (
            <p className="history-empty">
              你的下一次灵感
              <br />
              会从这里开始。
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="tiny-dot green-dot" />
            <span>本地演示空间</span>
            <Monitor size={14} />
          </div>
          <button className="profile" onClick={() => setModal("help")}>
            <span className="avatar">L</span>
            <div>
              <strong>Lilly 创意团队</strong>
              <small>Health Above All</small>
            </div>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <main className="main">
        {!focusedWorkspace && (
          <header className="topbar">
            <div className="breadcrumb">
              {!sidebarOpen && (
                <button
                  className="icon-button"
                  title="展开侧栏"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeftOpen size={18} />
                </button>
              )}
              <span>Lilly</span>
              <ChevronRight size={13} />
              <strong>
                {page === "home"
                  ? "创意工作台"
                  : page === "assets"
                    ? "素材库"
                    : page === "brand"
                      ? "品牌规范"
                      : info.name}
              </strong>
            </div>
            <div className="topbar-right">
              <div className="topbar-utilities">
                <button
                  className="icon-button"
                  title="素材库"
                  aria-label="打开素材库"
                  onClick={() => setModal("assets")}
                >
                  <FolderOpen size={17} />
                </button>
                <button
                  className="icon-button"
                  title="品牌规范"
                  aria-label="查看品牌设置"
                  onClick={() => setPage("brand")}
                >
                  <ShieldCheck size={17} />
                </button>
              </div>
              <span className="demo-label">
                <span className="tiny-dot" />
                POC 演示版
              </span>
              <button
                className="icon-button"
                title="演示指南"
                onClick={() => setModal("help")}
              >
                <CircleHelp size={18} />
              </button>
              <span className="mini-avatar">L</span>
            </div>
          </header>
        )}
        {page === "home" && (
          <div className="home-page">
            <section className="welcome-hero">
              <div className="hero-wash" />
              <div className="hero-copy">
                <div className="hero-eyebrow">
                  <Sparkles size={14} /> YOUR IDEAS, BROUGHT TO LIFE
                </div>
                <h1>
                  让每一个好想法，
                  <br />
                  <span>成为看得见的精彩。</span>
                </h1>
                <p>
                  从一句灵感，到一份作品。和你的 AI 创意伙伴一起，
                  <br className="desktop-br" />
                  串联图文、视频与有据可循的专业表达。
                </p>
                <div className="hero-badges">
                  <span>
                    <Check size={13} />
                    品牌一致
                  </span>
                  <span>
                    <Check size={13} />
                    人机共创
                  </span>
                  <span>
                    <Check size={13} />
                    全流程可追溯
                  </span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="hero-orbit hero-orbit-one" />
                <div className="hero-orbit hero-orbit-two" />
                <div className="floating-note note-image">
                  <ImagePlus size={22} />
                  <span>每一个灵感</span>
                  <i />
                  <i />
                </div>
                <div className="floating-note note-main">
                  <div className="note-top">
                    <Sparkles size={16} />
                    <span>CREATIVE STUDIO</span>
                  </div>
                  <div className="note-center">
                    <Sparkles size={51} strokeWidth={1.15} />
                  </div>
                  <b>由创意，到精彩</b>
                  <span className="note-mini">IMAGINE. CREATE. INSPIRE.</span>
                </div>
                <div className="floating-note note-video">
                  <Play size={23} fill="currentColor" />
                  <span>每一帧可能</span>
                  <div className="mini-wave">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▄</div>
                </div>
                <span className="floating-spark spark-one">✦</span>
                <span className="floating-spark spark-two">✧</span>
                <span className="floating-spark spark-three">✦</span>
              </div>
            </section>
            <section className="creation-section">
              <div className="section-heading">
                <div>
                  <h2>今天，想创作些什么？</h2>
                  <p>选择一种创作方式，让灵感继续发生。</p>
                </div>
                <span className="subtle-label">
                  三个专业 Agent，一个工作空间
                </span>
              </div>
              <div className="product-grid three-products">
                <button
                  className="product-card article-product"
                  onClick={() => start("article")}
                >
                  <div className="product-card-body">
                    <span className="product-icon">
                      <FileImage size={25} strokeWidth={1.5} />
                    </span>
                    <div className="product-en">IMAGE & EDITORIAL</div>
                    <h3>图文创作 Agent</h3>
                    <p>
                      把专业内容，变成有故事的视觉表达。
                      <br />
                      从创意概念到系列海报与长图文。
                    </p>
                    <div className="product-tags">
                      <span>系列海报</span>
                      <span>生成式长图文</span>
                      <span>动态拓展</span>
                    </div>
                    <span className="product-link">
                      开始图文创作
                      <ArrowUp className="diagonal-arrow" size={17} />
                    </span>
                  </div>
                  <div className="product-visual article-visual">
                    <div className="mini-poster back-poster">
                      <span>EXPLORE</span>
                      <div />
                    </div>
                    <div className="mini-poster front-poster">
                      <small>
                        新的视野
                        <br />
                        从这里展开
                      </small>
                      <BookOpen size={34} strokeWidth={1.1} />
                      <i />
                      <i />
                      <span>LILLY</span>
                    </div>
                    <div className="mini-tag">
                      <Sparkles size={12} />
                      让知识更有画面
                    </div>
                  </div>
                </button>
                <button
                  className="product-card video-product"
                  onClick={() => start("video")}
                >
                  <div className="product-card-body">
                    <span className="product-icon">
                      <Clapperboard size={25} strokeWidth={1.5} />
                    </span>
                    <div className="product-en">VIDEO & MOTION</div>
                    <h3>视频创作 Agent</h3>
                    <p>
                      用文字与参考图片，聊出你的下一支视频。
                      <br />
                      持续创作、编辑重发，每次结果都保留。
                    </p>
                    <div className="product-tags">
                      <span>全能参考</span>
                      <span>5–15s</span>
                      <span>多轮对话</span>
                    </div>
                    <span className="product-link">
                      开始视频创作
                      <ArrowUp className="diagonal-arrow" size={17} />
                    </span>
                  </div>
                  <div className="product-visual video-visual">
                    <div className="mini-film">
                      <div className="film-top">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="film-picture">
                        <img
                          className="video-home-frame"
                          src="/assets/video-references/poc-reference-1.png"
                          alt="诊疗路径视频参考图"
                        />
                        <Play size={29} fill="currentColor" />
                      </div>
                      <div className="film-bottom">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <div className="film-timeline">
                      <span>00:00</span>
                      <div>▂ ▆ ▃ ▅ ▇ ▃ ▂ ▅ ▃ ▅ ▂ ▆</div>
                      <span>00:06</span>
                    </div>
                    <div className="mini-tag">
                      <Play size={11} />
                      让每一帧讲述故事
                    </div>
                  </div>
                </button>
                <button
                  className="product-card literature-product"
                  onClick={() => openLiterature()}
                >
                  <div className="product-card-body">
                    <span className="product-icon">
                      <BookOpenCheck size={25} strokeWidth={1.5} />
                    </span>
                    <div className="product-en">LITERATURE & EVIDENCE</div>
                    <h3>脚本优化与文献支持</h3>
                    <p>
                      让每一段专业表达，都有据可循。
                      <br />
                      从达人脚本与 H5 到建议表达和逐段依据。
                    </p>
                    <div className="product-tags">
                      <span>文案润色</span>
                      <span>合规审核</span>
                      <span>引用添加</span>
                    </div>
                    <span className="product-link">
                      开始文献溯源
                      <ArrowUp className="diagonal-arrow" size={17} />
                    </span>
                  </div>
                  <div
                    className="product-visual literature-visual"
                    aria-hidden="true"
                  >
                    <div className="citation-sheet sheet-rear">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="citation-sheet sheet-top">
                      <span>REFERENCES</span>
                      <SearchCheck size={33} strokeWidth={1.2} />
                      <i />
                      <i />
                      <small>每一段 · 有据可循</small>
                    </div>
                    <div className="citation-link">
                      [1] <span /> [2]
                    </div>
                  </div>
                </button>
              </div>
            </section>
            <section className="quick-create">
              <div className="quick-title">
                <span className="quick-spark">
                  <Sparkles size={19} />
                </span>
                <div>
                  <h3>或者，从一句话开始</h3>
                  <p>告诉我你的想法，剩下的我们一起完成。</p>
                </div>
              </div>
              <div className="home-composer">
                <textarea
                  aria-label="描述你的创作需求"
                  placeholder={
                    homeKind === "literature"
                      ? "粘贴需要查找文献的脚本，以空行分段；进入工作区后逐段确认主张…"
                      : homeKind === "video"
                        ? "例如：参考三张图片，制作一支 15 秒的诊疗路径介绍视频…"
                        : "例如：为礼医制作 5 张风格统一的医生服务海报，专业、明亮，有一点探索感…"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      if (input.trim()) startFromHome();
                    }
                  }}
                />
                <div>
                  <button
                    className="composer-attach"
                    onClick={() =>
                      homeKind === "literature"
                        ? openLiterature(input.trim() || undefined)
                        : setModal("assets")
                    }
                  >
                    <Paperclip size={16} />
                    <span>
                      {homeKind === "literature"
                        ? "添加脚本或图片"
                        : "添加成品素材"}
                    </span>
                  </button>
                  <div className="composer-end">
                    <select
                      aria-label="创作类型"
                      value={homeKind}
                      onChange={(e) => setHomeKind(e.target.value as HomeKind)}
                    >
                      <option value="article">图文创作</option>
                      <option value="video">视频创作</option>
                      <option value="literature">文献溯源</option>
                    </select>
                    <button
                      className="send-button"
                      disabled={!input.trim()}
                      aria-label="开始创作"
                      onClick={startFromHome}
                    >
                      <ArrowUp size={19} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="prompt-suggestions">
                <span>试试这样开始</span>
                <button onClick={() => start("article")}>
                  <Images size={13} />
                  制作 5 张系列海报
                  <ArrowUp size={12} />
                </button>
                <button onClick={() => start("video")}>
                  <Film size={13} />
                  制作一段品牌开场动画
                  <ArrowUp size={12} />
                </button>
                <button onClick={() => openLiterature()}>
                  <BookOpenCheck size={13} />
                  给脚本逐段匹配文献
                  <ArrowUp size={12} />
                </button>
              </div>
            </section>
            <section className="journey-strip">
              <div>
                <GitBranch size={19} />
                <strong>好创意，每一步都有迹可循</strong>
              </div>
              <div className="journey-items">
                <span>理解需求</span>
                <ChevronRight size={12} />
                <span>确认创意</span>
                <ChevronRight size={12} />
                <span>设计画面</span>
                <ChevronRight size={12} />
                <span>评审交付</span>
              </div>
              <span className="journey-note">你掌握方向，Agent 串联创作。</span>
            </section>
            <footer className="home-footer">
              <span>LILLY · CONTENT STUDIO</span>
              <span>本地交互演示 · 创作内容保存在此浏览器</span>
            </footer>
          </div>
        )}
        {page === "article" && (
          <ArticleWorkspace
            key={articleEntry}
            draftId={articleDraftId}
            initialBrief={articleBrief}
            assets={assets}
            onResultReady={articleResultReady}
            onSaved={rememberArticle}
            onNew={() => openArticle()}
          />
        )}
        {page === "literature" && (
          <LiteratureStudio
            key={literatureEntry}
            initialText={literatureInput}
            onConsumed={() => setLiteratureInput(undefined)}
          />
        )}
        {page === "studio" && active?.kind === "video" && (
          <VideoChatStudio
            key={active.id}
            projectId={active.id}
            initialPrompt={active.prompt}
            title={active.title}
            onTitleChange={(title) => update({ title })}
            onNotify={notify}
          />
        )}
        {page === "studio" && active && !["video"].includes(active.kind) && (
          <div className={`studio-page compact-studio ${active.kind}-studio`}>
            <div className="studio-toolbar">
              <div className="studio-heading">
                <div className="studio-title">
                  <span className={`studio-icon ${active.kind}`}>
                    {active.kind === "article" ? (
                      <FileImage size={22} />
                    ) : (
                      <Clapperboard size={22} />
                    )}
                  </span>
                  <div>
                    <div>
                      <h1 title={active.title}>{active.title}</h1>
                      <Badge tone="muted">
                        V{active.version.toString().padStart(2, "0")}
                      </Badge>
                    </div>
                    <p>
                      <span
                        className={`tiny-dot ${active.stage === 6 ? "green-dot" : ""}`}
                      />
                      {busy
                        ? "正在编排演示流程"
                        : active.stage === 6
                          ? "已完成本地交付"
                          : info.stages[active.stage].description}
                    </p>
                  </div>
                </div>
                <div className="studio-actions">
                  <button
                    className="button secondary small"
                    onClick={() => setModal("reset")}
                  >
                    <RotateCcw size={14} />
                    重新演示
                  </button>
                  <button
                    className="button secondary small"
                    onClick={exportProject}
                  >
                    <ArrowDownToLine size={14} />
                    导出项目
                  </button>
                </div>
              </div>
              <div className="studio-tabs">
                <div>
                  <button
                    className={tab === "chat" ? "active" : ""}
                    onClick={() => setTab("chat")}
                  >
                    <MessageSquare size={15} />
                    创作对话
                  </button>
                  <button
                    className={tab === "flow" ? "active" : ""}
                    onClick={() => setTab("flow")}
                  >
                    <GitBranch size={15} />
                    工作流
                  </button>
                  <button
                    className={tab === "records" ? "active" : ""}
                    onClick={() => setTab("records")}
                  >
                    <Clock3 size={15} />
                    决策与版本<span>{active.decisions.length}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="studio-progress-row">
              {stageRail}
              {focusToggle}
            </div>
            {focusPreview && canPreviewResults ? (
              <div className="focus-preview">
                {renderPreview({ large: true })}
              </div>
            ) : tab === "flow" ? (
              <div className="workflow-view">
                <WorkflowMap
                  kind={active.kind}
                  stages={info.stages}
                  currentStage={active.stage}
                  completedStages={active.completed}
                  onSelect={(i) => {
                    setInspectedStage(i);
                    setTab("chat");
                  }}
                />
                <div className="flow-current">
                  <span className="brand-symbol">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <small>当前阶段</small>
                    <strong>{info.stages[active.stage].title}</strong>
                  </div>
                  <button
                    className="button primary small"
                    onClick={() => setTab("chat")}
                  >
                    返回当前任务
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : tab === "records" ? (
              <div className="records-page">
                <div className="records-header">
                  <h2>每一次选择，都成为创作依据。</h2>
                  <p>
                    记录确认节点与修改范围，保留已确认的部分。记录在本机浏览器中保存。
                  </p>
                </div>
                <div className="project-brief">
                  <h3>
                    <FileText size={18} />
                    原始需求
                  </h3>
                  <p>{active.prompt}</p>
                  <div>
                    <Badge tone="muted">{info.name}</Badge>
                    <Badge tone="muted">
                      {new Date(active.createdAt).toLocaleDateString("zh-CN")}
                    </Badge>
                    <Badge tone="muted">V{active.version}</Badge>
                  </div>
                </div>
                <div className="decision-timeline">
                  {active.decisions.length ? (
                    active.decisions.map((d, i) => (
                      <div className="decision-item" key={i}>
                        <span className="decision-dot">
                          <Check size={12} />
                        </span>
                        <div>
                          <small>
                            {d.at} · V{d.version} ·{" "}
                            {info.stages[d.stage]?.title}
                          </small>
                          <h4>{d.text}</h4>
                          <p>
                            {d.version < active.version
                              ? "保留的历史记录；当前采用最新版本。"
                              : "本轮项目决定已保存。"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="records-empty">
                      <Clock3 size={30} />
                      <h3>让第一个决定发生</h3>
                      <p>在创作对话中确认创意后，这里会出现记录。</p>
                      <button
                        className="button secondary"
                        onClick={() => setTab("chat")}
                      >
                        前往创作对话
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="workspace-columns">
                <div className="conversation">
                  <div className="conversation-scroll" ref={conversationRef}>
                    <details className="studio-brief-summary">
                      <summary>
                        <FileText size={14} /> 创作需求
                        <span>查看完整需求</span>
                        <ChevronDown size={14} />
                      </summary>
                      <p>{active.prompt}</p>
                    </details>
                    <div className="agent-message">
                      {active.kind === "video" ? (
                        <VideoWorkflow
                          stage={shownStage}
                          currentStage={active.stage}
                          concept={active.concept}
                          layout={active.layout}
                          flowVersion={active.version}
                          decisionCount={
                            active.decisions.filter((d) =>
                              [2, 3, 5].includes(d.stage),
                            ).length
                          }
                          version={chosenVideoVersion}
                          assets={assets}
                          canConfirm={completeAssets}
                          needsReplacement={
                            active.revisionAssets ===
                            signatureFor(
                              active.kind,
                              assets,
                              chosenVideoVersion.id,
                            )
                          }
                          onChoose={(v) => {
                            update({
                              concept: v.conceptId,
                              videoVersionId: v.id,
                              title: `领峰者之夜 · ${v.label}`,
                              layout: null,
                            });
                            setPreviewVideoId(v.id);
                          }}
                          onStoryboardConfirm={() =>
                            advance(
                              videoVersions.findIndex(
                                (v) => v.id === chosenVideoVersion.id,
                              ),
                            )
                          }
                          onAdvance={() => advance()}
                          onRevise={() => revise(2)}
                          onCurrent={() => setInspectedStage(null)}
                          onAssets={() => setModal("assets")}
                          onExport={exportProject}
                          onStartOther={() =>
                            start(
                              "video",
                              undefined,
                              videoVersions.find(
                                (v) => v.id !== chosenVideoVersion.id,
                              )!.id,
                            )
                          }
                        />
                      ) : (
                        renderStageContent()
                      )}
                    </div>
                  </div>
                  <div className="chat-composer-wrap">
                    {active.stage >= 5 && (
                      <div className="revision-options">
                        <span>修改范围</span>
                        {[
                          ["local", "局部调整"],
                          [
                            "visual",
                            active.kind === "video" ? "调整分镜" : "调整画面",
                          ],
                          ["concept", "更换创意"],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={revisionScope === id ? "active" : ""}
                            onClick={() =>
                              setRevisionScope(id as typeof revisionScope)
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="chat-composer">
                      <textarea
                        aria-label="补充创意或修改意见"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          busy
                            ? "Agent 正在编排流程…"
                            : "补充你的想法，或告诉我想调整的地方…"
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            submit();
                          }
                        }}
                      />
                      <div>
                        <button
                          className="icon-button"
                          title="接入成品素材"
                          onClick={() => setModal("assets")}
                        >
                          <Paperclip size={17} />
                        </button>
                        <span>与 Lilly 创意助手协作</span>
                        <button
                          className="send-button"
                          disabled={busy || !input.trim()}
                          aria-label="发送修改意见"
                          onClick={submit}
                        >
                          <ArrowUp size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <aside className="preview-panel">
                  {renderPreview({})}
                  <div className="context-card">
                    <div>
                      <Palette size={15} />
                      <strong>本项目视觉基调</strong>
                      <button
                        title="查看品牌规范"
                        className="icon-button"
                        onClick={() => setPage("brand")}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="color-dots">
                      <i style={{ background: "#d82d36" }} />
                      <i style={{ background: "#eea6b2" }} />
                      <i style={{ background: "#b7a4d1" }} />
                      <i style={{ background: "#faf4f1" }} />
                      <span>温暖 · 专业 · 有生命力</span>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}
        {page === "assets" && (
          <div className="assets-page">
            <div className="page-heading">
              <span className="eyebrow">CREATIVE ASSETS</span>
              <h1>让每一份成品，都找到它的位置。</h1>
              <p>
                五张系列海报，两个大会开场版本。视频已随项目接入，可播放对比，也可替换为新的成品。
              </p>
            </div>
            <AssetLibrary
              assets={assets}
              onChange={() => void refreshAssets()}
            />
          </div>
        )}
        {page === "brand" && (
          <div className="brand-page">
            <div className="page-heading">
              <span className="eyebrow">BRAND FOUNDATION</span>
              <h1>有一致的底色，也有创意的空间。</h1>
              <p>
                以礼来红为核心，延续参考界面中的粉色与梦幻紫，为三个创作 Agent
                建立统一视觉。
              </p>
            </div>
            <div className="brand-preview">
              <div>
                <Logo />
                <h2>
                  专业有温度。
                  <br />
                  创意有方向。
                </h2>
                <p>本 Demo 的界面视觉方案</p>
              </div>
              <div className="brand-swatch-cards">
                {[
                  ["Lilly Red", "#D82D36"],
                  ["Warm Rose", "#EEA6B2"],
                  ["Dream Lavender", "#B7A4D1"],
                  ["Soft Ivory", "#FAF4F1"],
                ].map(([n, c]) => (
                  <div style={{ background: c }} key={c}>
                    <span>{n}</span>
                    <small>{c}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="brand-bottom">
              <div className="brand-rule-panel">
                <h3>
                  <ShieldCheck size={19} />
                  项目约束
                </h3>
                <p>选择会保存到项目导出记录，作为人工复核清单。</p>
                {[
                  "保留指定文案与信息层级",
                  "使用正式提供的品牌标识素材",
                  "人物与场景保持专业、成熟",
                  "医学表述与参考依据需人工复核",
                ].map((r, i) => (
                  <label key={r}>
                    <span>{r}</span>
                    <input
                      type="checkbox"
                      checked={!!brandRules[i]}
                      onChange={() => {
                        const next = [0, 1, 2, 3].map((n) =>
                          n === i ? !brandRules[n] : !!brandRules[n],
                        );
                        setBrandRules(next);
                        localStorage.setItem(
                          "lilly-brand-rules",
                          JSON.stringify(next),
                        );
                      }}
                    />
                  </label>
                ))}
              </div>
              <div className="brand-boundary">
                <Palette size={24} />
                <h3>品牌规范与项目偏好分别记录</h3>
                <p>
                  当前颜色为依据参考界面制定的 Demo
                  配色，并非完整的官方品牌手册。正式字体与医学审批信息，可在后续接入。
                </p>
                <div className="note">
                  <Info size={14} />
                  <span>
                    页首采用礼来官网原版红色标识，保持原始比例与颜色。
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {modal && (
        <div
          className={`modal-backdrop ${modal === "preview" ? "preview-backdrop" : ""}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "assets"
                ? "接入成品素材"
                : modal === "preview"
                  ? "作品完整预览"
                  : modal === "reset"
                    ? "重新演示"
                    : "演示指南"
            }
            className={`modal modal-${modal}`}
          >
            <button
              className="modal-close icon-button"
              aria-label="关闭弹窗"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "assets" ? (
              <AssetLibrary
                assets={assets}
                onChange={() => void refreshAssets()}
                onClose={() => setModal(null)}
              />
            ) : modal === "preview" ? (
              renderPreview({ large: true })
            ) : modal === "reset" ? (
              <div className="reset-dialog">
                <RotateCcw size={30} />
                <h2>从一个新的创意开始</h2>
                <p>
                  将新建一次演示。当前项目和已经导入的素材会保留，随时可以从左侧继续。
                </p>
                <div>
                  <button
                    className="button secondary"
                    onClick={() => setModal(null)}
                  >
                    继续当前项目
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setModal(null);
                      start(active?.kind || "article");
                    }}
                  >
                    开始新演示
                  </button>
                </div>
              </div>
            ) : (
              <div className="help-dialog">
                <span className="eyebrow">DEMO GUIDE</span>
                <h2>三个专业入口，一场完整演示。</h2>
                <p>
                  这个工作台展示从需求到成果的 Agent
                  协作体验，图文、视频与文献溯源分别拥有独立流程。
                </p>
                <ol>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>选择产品，提出需求</strong>
                      <p>从图文、视频或文献溯源入口开始，输入需求或脚本。</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>在关键节点作出选择</strong>
                      <p>
                        创作流程确认概念与方案；文献流程确认段落主张后，演示检索匹配。
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>接入成品，评审交付</strong>
                      <p>
                        图文与视频接入已完成素材；文献页展示逐段证据、来源链接与待确认项。
                      </p>
                    </div>
                  </li>
                </ol>
                <div className="note">
                  <Info size={16} />
                  <span>
                    全部文件保存在当前浏览器本地。不会上传或调用模型；清除浏览器数据会清除保存记录。预设流程不会自动分析附件或生成新媒体。
                  </span>
                </div>
                <button
                  className="button primary"
                  onClick={() => setModal(null)}
                >
                  开始体验
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Info size={16} />
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
