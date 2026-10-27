import {
  Check,
  ChevronRight,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import "./ResultPending.css";

type ResultPendingProps = {
  kind: "article" | "video";
  stage: number;
  completed: number[];
  total: number;
  stageTitle: string;
  loading?: boolean;
  error?: boolean;
  needsAssets?: boolean;
  onRetry?: () => void;
};

export default function ResultPending({
  kind,
  stage,
  completed,
  total,
  stageTitle,
  loading = false,
  error = false,
  needsAssets = false,
  onRetry,
}: ResultPendingProps) {
  const done = new Set(completed.filter((item) => item >= 0 && item < total));
  const count = done.size;
  const percent = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  const preparing = stage >= 6 && loading;
  const waitingForAssets = stage >= 5 && needsAssets;
  const title = error
    ? "成果暂未就绪"
    : preparing
      ? "正在载入本次成果"
      : waitingForAssets
        ? "等待接入交付成品"
        : stage === 4
          ? "正在制作中"
          : stage === 5
            ? "等待交付确认"
            : stage >= 6
              ? "成果暂未就绪"
              : "完成创作流程后，成果将在这里呈现";
  const explanation = error
    ? "本地素材读取未完成，请重试后继续。"
    : preparing
      ? "正在核对本次确认的素材与版本。"
      : waitingForAssets
        ? "接入本次作品并完成交付确认后，即可查看成果。"
        : stage === 4
          ? "正在演示制作编排，接下来核对素材并确认交付。"
          : stage === 5
            ? "完成本轮交付确认后，解锁作品预览与下载。"
            : stage >= 6
              ? "请完成当前版本的流程与交付确认。"
              : `先确认创意与${kind === "video" ? "分镜" : "画面"}方案，再进入制作、核对与交付。`;
  const milestones = [
    {
      label: "需求与方案",
      complete: [0, 1, 2, 3].every((item) => done.has(item)),
      active: stage < 4,
      state: "进行中",
    },
    {
      label: "制作与核对",
      complete: [4, 5].every((item) => done.has(item)),
      active: stage === 4 || stage === 5,
      state: stage === 5 ? "待确认" : "进行中",
    },
    {
      label: "完成后展示",
      complete: false,
      active: stage >= 6,
      state: preparing ? "准备呈现" : "待解锁",
    },
  ];

  return (
    <section className="result-pending" aria-label="成果预览尚未解锁">
      <header className="rp-header">
        <div>
          <span className="rp-eyebrow">YOUR CREATIVE OUTPUT</span>
          <h3>成果预览</h3>
        </div>
        <span className="rp-lock-badge">
          <LockKeyhole size={11} /> 尚未解锁
        </span>
      </header>

      <div className="rp-message" aria-live="polite">
        <div className="rp-symbol" aria-hidden="true">
          {preparing || stage === 4 ? (
            <LoaderCircle className="rp-loading" size={25} strokeWidth={1.35} />
          ) : (
            <LockKeyhole size={25} strokeWidth={1.35} />
          )}
        </div>
        <h4>{title}</h4>
        <p>{explanation}</p>
      </div>

      <div className="rp-progress-section">
        <div className="rp-progress-label">
          <span>
            <Clock3 size={12} /> 创作进度
          </span>
          <strong>
            {count}
            <small> / {total} 阶段</small>
          </strong>
        </div>
        <div
          className="rp-progress-track"
          role="progressbar"
          aria-label="成果解锁进度"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="rp-current">
          <span /> 当前：{stageTitle}
        </p>
      </div>

      <ol className="rp-milestones">
        {milestones.map((milestone, index) => (
          <li
            key={milestone.label}
            className={`${milestone.complete ? "rp-milestone-done" : ""}${milestone.active ? " rp-milestone-current" : ""}`}
          >
            <span className="rp-milestone-index">
              {milestone.complete ? (
                <Check size={11} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <span className="rp-milestone-name">{milestone.label}</span>
            <small>
              {milestone.complete
                ? "已完成"
                : milestone.active
                  ? milestone.state
                  : "待进行"}
            </small>
            {!milestone.complete && <ChevronRight size={11} />}
          </li>
        ))}
      </ol>

      {onRetry && error && (
        <button
          className="rp-retry"
          type="button"
          onClick={onRetry}
          disabled={loading}
        >
          <RefreshCw size={13} /> {loading ? "正在重试" : "重新载入素材"}
        </button>
      )}
      <footer className="rp-footer">
        成果随本轮流程解锁，重新演示时将再次收起。
      </footer>
    </section>
  );
}
