import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Clapperboard,
  Clock3,
  FileImage,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import "./HomeDashboard.css";

export type HomeDashboardProject = {
  id: string;
  kind: "article" | "video";
  title: string;
  createdAt: string;
  stage: number;
  articleWorkflow?: "upload-v1";
};
type CreationKind = "article" | "video" | "literature";
type ProjectFilter = "all" | "article" | "video";
type Props = {
  projects: HomeDashboardProject[];
  onCreate: (kind: CreationKind, prompt?: string) => void;
  onOpenProject: (id: string) => void;
  onProjectMenu: (id: string, position: { x: number; y: number }) => void;
  onOpenTrash: () => void;
  trashCount: number;
};

const tools = [
  {
    kind: "article" as const,
    number: "01",
    Icon: FileImage,
    title: "图文创作",
    eyebrow: "IMAGE & EDITORIAL",
    description: "放入正文与图片，整理成可编辑的长图文或系列图文。",
    steps: ["上传内容", "分析编排", "编辑导出"],
    action: "新建图文",
  },
  {
    kind: "video" as const,
    number: "02",
    Icon: Clapperboard,
    title: "视频创作",
    eyebrow: "VIDEO & MOTION",
    description: "带上想法和参考图片，通过对话确认方案，查看视频演示。",
    steps: ["描述需求", "对话确认", "查看视频"],
    action: "新建视频",
  },
  {
    kind: "literature" as const,
    number: "03",
    Icon: BookOpenCheck,
    title: "文献支持",
    eyebrow: "LITERATURE & EVIDENCE",
    description: "上传脚本或 H5 图片，逐段核对表达，查看对应文献来源。",
    steps: ["上传文稿", "逐段分析", "查阅依据"],
    action: "新建文献任务",
  },
];

function creationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近创建";
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const days = Math.round((start.getTime() - startOfDate.getTime()) / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return date.toLocaleDateString("zh-CN", {
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export default function HomeDashboard({
  projects,
  onCreate,
  onOpenProject,
  onProjectMenu,
  onOpenTrash,
  trashCount,
}: Props) {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CreationKind>("article");
  const [prompt, setPrompt] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return projects.filter(
      (project) =>
        (filter === "all" || project.kind === filter) &&
        (project.title || "未命名创作").toLocaleLowerCase().includes(search),
    );
  }, [projects, filter, query]);
  const counts = {
    all: projects.length,
    article: projects.filter((project) => project.kind === "article").length,
    video: projects.filter((project) => project.kind === "video").length,
  };

  function createWithPrompt() {
    if (!prompt.trim()) return;
    onCreate(kind, prompt.trim());
  }

  return (
    <div className="home-dashboard">
      <section className="hd-welcome" aria-labelledby="hd-welcome-title">
        <div className="hd-welcome-copy">
          <p className="hd-eyebrow">
            <Sparkles size={13} /> LILLY · CONTENT STUDIO
          </p>
          <h1 id="hd-welcome-title">今天，从一个好想法开始。</h1>
          <p className="hd-welcome-description">
            新建一份创作，或继续上次的内容。你的素材、文稿与进度，都在这里。
          </p>
        </div>
        <div className="hd-welcome-note" aria-hidden="true">
          <div className="hd-note-icons">
            <FileImage size={19} />
            <Clapperboard size={19} />
            <BookOpenCheck size={19} />
          </div>
          <span>内容 · 画面 · 依据</span>
        </div>
      </section>

      <section className="hd-tools" aria-labelledby="hd-tools-title">
        <div className="hd-section-heading">
          <h2 id="hd-tools-title">开始新的创作</h2>
          <p>选择入口，从上传或对话开始</p>
        </div>
        <div className="hd-tool-grid">
          {tools.map(
            ({
              kind: toolKind,
              number,
              Icon,
              title,
              eyebrow,
              description,
              steps,
              action,
            }) => (
              <button
                type="button"
                key={toolKind}
                className={`hd-tool-card hd-tool-${toolKind}`}
                onClick={() => onCreate(toolKind)}
              >
                <div className="hd-tool-top">
                  <span className="hd-tool-icon">
                    <Icon size={23} strokeWidth={1.6} />
                  </span>
                  <span className="hd-tool-number">{number}</span>
                </div>
                <span className="hd-tool-eyebrow">{eyebrow}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="hd-tool-steps" aria-label={`${title}流程`}>
                  {steps.map((step, index) => (
                    <span key={step}>
                      {index > 0 && <ArrowRight size={10} />} {step}
                    </span>
                  ))}
                </div>
                <span className="hd-tool-action">
                  {action}
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="hd-recents" aria-labelledby="hd-recent-title">
        <div className="hd-section-heading hd-recent-heading">
          <div className="hd-heading-title">
            <h2 id="hd-recent-title">最近创作</h2>
            <span className="hd-count">{projects.length}</span>
          </div>
          <button
            type="button"
            className="hd-trash-button"
            onClick={onOpenTrash}
          >
            <Trash2 size={14} />
            回收站{trashCount > 0 && <span>{trashCount}</span>}
          </button>
        </div>
        <div className="hd-recent-toolbar">
          <div
            className="hd-filter-tabs"
            role="group"
            aria-label="筛选创作类型"
          >
            {(
              [
                ["all", "全部"],
                ["article", "图文"],
                ["video", "视频"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{counts[value]}</span>
              </button>
            ))}
          </div>
          <label className="hd-search">
            <Search size={15} />
            <input
              aria-label="搜索最近创作"
              placeholder="搜索作品名称"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="清空作品搜索"
                onClick={() => setQuery("")}
              >
                <X size={13} />
              </button>
            )}
          </label>
        </div>
        {filtered.length ? (
          <div className="hd-project-list" aria-label="最近创作列表">
            {filtered.map((project) => {
              const title = project.title || "未命名创作";
              const Icon =
                project.kind === "article" ? FileImage : Clapperboard;
              return (
                <div
                  key={project.id}
                  className="hd-project-row"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.currentTarget.querySelector("button")?.focus();
                    const bounds = event.currentTarget.getBoundingClientRect();
                    onProjectMenu(project.id, {
                      x: event.clientX || bounds.left + 24,
                      y: event.clientY || bounds.bottom,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ContextMenu" ||
                      (event.shiftKey && event.key === "F10")
                    ) {
                      event.preventDefault();
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      onProjectMenu(project.id, {
                        x: bounds.right - 24,
                        y: bounds.bottom,
                      });
                    }
                  }}
                >
                  <button
                    type="button"
                    className="hd-project-open"
                    onClick={() => onOpenProject(project.id)}
                    aria-label={`打开创作：${title}`}
                  >
                    <span
                      className={`hd-project-icon hd-project-${project.kind}`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="hd-project-copy">
                      <strong title={title}>{title}</strong>
                      <span>
                        {project.kind === "article" ? "图文创作" : "视频创作"}
                        <i />
                        {creationDate(project.createdAt)}
                      </span>
                    </span>
                    <span
                      className={`hd-project-status ${project.stage === 6 ? "is-ready" : ""}`}
                    >
                      {project.stage === 6 ? "可查看" : "创作中"}
                    </span>
                    <ArrowUpRight className="hd-project-arrow" size={15} />
                  </button>
                  <button
                    type="button"
                    className="hd-project-more"
                    aria-label={`更多操作：${title}`}
                    title="更多操作，也可右键点击作品"
                    aria-haspopup="menu"
                    onClick={(event) => {
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      onProjectMenu(project.id, {
                        x: bounds.right,
                        y: bounds.bottom + 5,
                      });
                    }}
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hd-empty">
            {projects.length ? (
              <Search size={26} strokeWidth={1.4} />
            ) : (
              <FolderOpen size={28} strokeWidth={1.4} />
            )}
            <h3>
              {projects.length
                ? "没有找到符合条件的创作"
                : "让第一份创作，从这里开始"}
            </h3>
            <p>
              {projects.length
                ? "换个关键词，或切换其他创作类型。"
                : "选择上方任一入口，保存后的作品会出现在这里。"}
            </p>
            {projects.length ? (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
              >
                清除筛选
              </button>
            ) : (
              <button type="button" onClick={() => onCreate("article")}>
                <Plus size={14} />
                新建图文
              </button>
            )}
          </div>
        )}
        {projects.length > 0 && (
          <p className="hd-list-note">
            <Clock3 size={12} />
            按创建顺序排列<span>右键作品或点击 ··· 管理创作</span>
          </p>
        )}
      </section>

      <section className="hd-quick" aria-labelledby="hd-quick-title">
        <div className="hd-quick-heading">
          <span>
            <Sparkles size={18} />
          </span>
          <div>
            <h2 id="hd-quick-title">已经有想法了？</h2>
            <p>写下需求，带到下一步继续。</p>
          </div>
        </div>
        <form
          className="hd-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            createWithPrompt();
          }}
        >
          <textarea
            aria-label="创作需求或脚本"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={10000}
            placeholder={
              kind === "article"
                ? "例如：将医生服务介绍编排成长图文，保留原始文案与图片……"
                : kind === "video"
                  ? "例如：参考图片，制作一段节奏轻快的视频演示……"
                  : "粘贴需要核对依据的脚本，进入下一步后继续补充材料……"
            }
          />
          <div className="hd-quick-controls">
            <label>
              <span className="hd-sr-only">创作类型</span>
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as CreationKind)
                }
              >
                <option value="article">图文创作</option>
                <option value="video">视频创作</option>
                <option value="literature">文献支持</option>
              </select>
            </label>
            <button type="submit" disabled={!prompt.trim()}>
              继续创作
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </section>
      <footer className="hd-footer">
        <span>LILLY · CONTENT STUDIO</span>
        <span>本地交互演示 · 内容保存在此浏览器</span>
      </footer>
    </div>
  );
}
