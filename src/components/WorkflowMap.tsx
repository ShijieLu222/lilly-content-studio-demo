import {
  ArrowRight,
  Bot,
  Check,
  CheckCheck,
  ClipboardList,
  FileSearch,
  GitBranch,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  WandSparkles,
} from "lucide-react";
import "./WorkflowMap.css";

type FlowStage = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  output: string;
  gate: boolean;
};

type WorkflowMapProps = {
  kind: "article" | "video";
  stages: FlowStage[];
  currentStage: number;
  completedStages: number[];
  onSelect: (index: number) => void;
};

const stageIcons = [
  ClipboardList,
  FileSearch,
  Lightbulb,
  Palette,
  WandSparkles,
  ShieldCheck,
  CheckCheck,
];

export default function WorkflowMap({
  kind,
  stages,
  currentStage,
  completedStages,
  onSelect,
}: WorkflowMapProps) {
  const completed = new Set(
    completedStages.filter((index) => index >= 0 && index < stages.length),
  );
  const activeStage = stages[currentStage];
  const completeCount = completed.size;
  const isFinished = completeCount === stages.length;

  return (
    <section
      className="flow-map"
      aria-label={`${kind === "article" ? "图文" : "视频"}创作工作流`}
    >
      <div className="flow-topline">
        <div className="flow-heading">
          <span className="flow-kicker">THE CREATIVE PROCESS</span>
          <h2>让每一步创意，都有迹可循</h2>
          <p>一个 Agent 串联创作，在关键节点由你决定方向。</p>
        </div>
        <span className="flow-demo-label">
          <span /> 预设演示流程
        </span>
      </div>

      <div className="flow-canvas">
        <div className="flow-orchestrator">
          <span className="flow-orchestrator-icon">
            <Bot size={22} strokeWidth={1.7} />
          </span>
          <div className="flow-orchestrator-copy">
            <strong>Lilly 创意 Agent</strong>
            <span>
              {kind === "article" ? "图文创作与系列延展" : "视频创意与视听编排"}{" "}
              · 统一协调
            </span>
          </div>
          <span className="flow-orchestrator-state">
            <span />
            {isFinished ? "流程已完成" : "流程进行中"}
          </span>
        </div>
        <div className="flow-branch" aria-hidden="true">
          <span />
          <GitBranch size={15} />
          <span />
        </div>

        <ol className="flow-nodes">
          {stages.map((stage, index) => {
            const Icon = stageIcons[index % stageIcons.length];
            const isCurrent = index === currentStage;
            const isCompleted = completed.has(index);
            const isAvailable = isCurrent || isCompleted;
            const status = isCompleted
              ? "已完成"
              : isCurrent
                ? stage.gate
                  ? "待你确认"
                  : "当前阶段"
                : "尚未开始";
            return (
              <li
                key={stage.id}
                className={`flow-node-cell${isCurrent ? " flow-node-cell-current" : ""}`}
              >
                <button
                  type="button"
                  className={`flow-node${isCurrent ? " flow-node-current" : ""}${isCompleted ? " flow-node-completed" : ""}${!isAvailable ? " flow-node-locked" : ""}`}
                  onClick={() => {
                    if (isAvailable) onSelect(index);
                  }}
                  disabled={!isAvailable}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`第 ${index + 1} 步，${stage.title}，${status}${!isAvailable ? "，完成前序步骤后解锁" : "，查看阶段详情"}`}
                  title={
                    isAvailable ? `查看${stage.title}` : "完成前序步骤后解锁"
                  }
                >
                  <span className="flow-node-meta">
                    <span className="flow-step-index">
                      STEP {String(index + 1).padStart(2, "0")}
                    </span>
                    {isCompleted ? (
                      <span className="flow-done-icon">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                    ) : !isAvailable ? (
                      <LockKeyhole size={12} />
                    ) : (
                      <span className="flow-active-dot" />
                    )}
                  </span>
                  <span className="flow-node-icon">
                    <Icon size={21} strokeWidth={1.6} />
                  </span>
                  <strong className="flow-node-title">
                    {stage.shortTitle || stage.title}
                  </strong>
                  <span className="flow-node-description">
                    {stage.description}
                  </span>
                  <span
                    className={`flow-node-status${stage.gate ? " flow-node-gate" : ""}`}
                  >
                    {isCompleted ? (
                      <Check size={11} />
                    ) : stage.gate ? (
                      <UserRoundCheck size={11} />
                    ) : isCurrent ? (
                      <Play size={10} fill="currentColor" />
                    ) : (
                      <span className="flow-status-dot" />
                    )}
                    {isCompleted
                      ? "已完成"
                      : stage.gate
                        ? isCurrent
                          ? "待你确认"
                          : "人工确认"
                        : isCurrent
                          ? "当前阶段"
                          : "完成前序后解锁"}
                  </span>
                </button>
                {index < stages.length - 1 && (
                  <ArrowRight
                    className="flow-node-arrow"
                    size={16}
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div className="flow-progress-section">
          <div className="flow-progress-caption">
            <span>
              <span className="flow-progress-indicator" />
              {isFinished
                ? "全部阶段已完成"
                : activeStage
                  ? `当前：${activeStage.title}`
                  : "准备开始"}
            </span>
            <strong>
              {completeCount}
              <span> / {stages.length} 阶段完成</span>
            </strong>
          </div>
          <div
            className="flow-progress-track"
            role="progressbar"
            aria-label="创作流程完成度"
            aria-valuenow={completeCount}
            aria-valuemin={0}
            aria-valuemax={stages.length}
          >
            <span
              style={{
                width: `${stages.length ? (completeCount / stages.length) * 100 : 0}%`,
              }}
            />
          </div>
          {activeStage && (
            <p className="flow-output-hint">
              <Layers3 size={13} />
              本阶段产物：{activeStage.output}
            </p>
          )}
        </div>
      </div>

      <div className="flow-capabilities">
        <div className="flow-capabilities-title">
          <Sparkles size={15} />
          <strong>协同能力</strong>
          <span>工作流统一调度</span>
        </div>
        <div className="flow-capability-tags">
          {(kind === "article"
            ? [
                "需求理解",
                "品牌与案例参考",
                "创意策划",
                "视觉设计",
                "图文制作",
                "质量检查",
              ]
            : [
                "需求理解",
                "参考图解读",
                "脚本策划",
                "分镜设计",
                "视听合成",
                "质量检查",
              ]
          ).map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <p>当前展示预设流程与阶段产物，未调用在线模型或自动审核服务。</p>
      </div>

      <div className="flow-records">
        <div className="flow-record">
          <FileSearch size={17} />
          <div>
            <strong>有来源的创作依据</strong>
            <p>保留输入、参考素材与品牌规则的关联。</p>
          </div>
        </div>
        <div className="flow-record">
          <UserRoundCheck size={17} />
          <div>
            <strong>有记录的创意决策</strong>
            <p>概念、画面、成稿，三次确认决定下一步。</p>
          </div>
        </div>
        <div className="flow-record">
          <GitBranch size={17} />
          <div>
            <strong>可追溯的成果版本</strong>
            <p>修改返回对应阶段，保留已确认的方向。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
