import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CirclePause,
  Clapperboard,
  FileText,
  Film,
  FolderOpen,
  GitBranch,
  Info,
  ListChecks,
  LoaderCircle,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { productInfo } from "../content";
import { videoVersions } from "../videoDemo";
import type { Asset } from "../lib/assets";
import "./VideoWorkflow.css";

type Version = (typeof videoVersions)[number];
interface Props {
  stage: number;
  currentStage: number;
  concept: string | null;
  layout: number | null;
  flowVersion: number;
  decisionCount: number;
  version: Version;
  assets: Asset[];
  canConfirm: boolean;
  needsReplacement: boolean;
  onChoose: (version: Version) => void;
  onStoryboardConfirm: () => void;
  onAdvance: () => void;
  onRevise: () => void;
  onCurrent: () => void;
  onAssets: () => void;
  onExport: () => void;
  onStartOther: () => void;
}

export default function VideoWorkflow(p: Props) {
  const isCurrent = p.stage === p.currentStage;
  const asset = p.assets.find((a) => a.id === p.version.id);
  const isOriginal = asset?.source === "bundled";
  const concept = productInfo.video.concepts.find((c) => c.id === p.concept);
  const other = videoVersions.find((v) => v.id !== p.version.id)!;
  const format = (n: number) => `${n.toFixed(2)}s`;
  return (
    <>
      <div className="agent-message-head">
        <span className="brand-symbol">
          <Sparkles size={16} />
        </span>
        <strong>Lilly 创意助手</strong>
        <span>大会开场创作</span>
        <span className="badge muted">预设演示</span>
      </div>
      <div className="agent-intro">
        {
          [
            "为「领峰者之夜」建立开场任务：在会场大屏呈现大会主题，并保留两个版本的创作与确认记录。",
            "把大会主题、视觉元素与成片片段关联起来。以下参考来自提供的两版开场动画。",
            "同一场大会，两种开场表达。选择本轮要演示的方向，后续分镜与交付将对应这一版成片。",
            `本轮采用「${p.version.label} · ${p.version.title}」。把画面推进拆成可确认的分镜，再进入制作编排。`,
            `正在按已确认的分镜组织 ${p.version.label} 的演示制作，准备载入对应成片。`,
            `确认本轮交付对象为 ${p.version.label}，并检查素材是否就绪。完成流程后，右侧将展示成片与版本对比；以下清单留待成果展示后逐项复核。`,
            `${p.version.label} 的七阶段流程已完成。创意、分镜与交付准备记录已留档，现在可以查看最终成果。`,
          ][p.stage]
        }
      </div>

      {p.stage <= 1 && (
        <div className="video-brief-card">
          <div className="video-brief-eyebrow">
            <Clapperboard size={16} /> CONFERENCE OPENING{" "}
            <span>领峰者之夜</span>
          </div>
          <h3>
            {p.stage === 0
              ? "从大会主题，走向开场画面"
              : "让每个视觉元素都有来源"}
          </h3>
          {(p.stage === 0
            ? [
                ["使用场景", "大会现场 · 横屏开场动画"],
                ["核心信息", "领峰者之夜 · 暨穆峰达®全球重磅研究中国发布盛典"],
                ["视觉要求", "紫色星空、橙金光束、主题文字与星芒"],
                ["交付版本", "A 版约 5 秒 / 1080p；B 版约 6 秒 / 720p"],
              ]
            : [
                ["品牌依据", "礼来 Logo 与大会已提供的视觉内容"],
                ["画面依据", "两支原始成片及其关键帧"],
                ["运动线索", "星空铺陈 → 光束展开 → 主题显现"],
                ["版本差异", "A 保留讲者题卡与披露页；B 连续呈现大会主题"],
              ]
          ).map(([label, text]) => (
            <div className="video-brief-row" key={label}>
              <Check size={14} />
              <span>{label}</span>
              <strong>{text}</strong>
            </div>
          ))}
          <div className="video-source-pair">
            {videoVersions.map((v) => (
              <figure key={v.id}>
                <img src={v.poster} alt={`${v.label} 大会主题参考帧`} />
                <figcaption>
                  {v.label} · {v.duration.toFixed(2)} 秒
                </figcaption>
              </figure>
            ))}
          </div>
          <small>已提供成片的参考拆解 · 内容与原文件保持对应</small>
        </div>
      )}

      {p.stage === 2 && (
        <>
          <div className="source-strip">
            <FileText size={14} />
            <span>大会主题与双版本成片</span>
            <span className="source-dot" />
            <span>本地参考已就绪</span>
          </div>
          <div className="stage-label">
            <span>01</span>
            <h3>确认开场创意</h3>
            <span className="badge">选择本轮版本</span>
          </div>
          <div className="conference-concepts">
            {videoVersions.map((v) => {
              const c = productInfo.video.concepts.find(
                (item) => item.id === v.conceptId,
              )!;
              return (
                <button
                  key={v.id}
                  className={`conference-concept ${p.concept === v.conceptId ? "chosen" : ""}`}
                  disabled={!isCurrent}
                  onClick={() => p.onChoose(v)}
                  aria-pressed={p.concept === v.conceptId}
                >
                  <div className="conference-concept-image">
                    <img src={v.poster} alt="" />
                    <span>
                      {v.label} · {v.duration.toFixed(2)}s
                    </span>
                  </div>
                  <div className="conference-concept-copy">
                    <span className="concept-eyebrow">{c.eyebrow}</span>
                    <h4>{v.title}</h4>
                    <p>{c.description}</p>
                    <div className="concept-tags">
                      {c.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    {p.concept === v.conceptId && (
                      <p className="conference-concept-reason">{c.reason}</p>
                    )}
                  </div>
                  <span className="selection-circle">
                    {p.concept === v.conceptId && <Check size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
          {isCurrent && (
            <div className="gate-actions">
              <span>
                <CirclePause size={14} />
                确认后进入对应版本的分镜
              </span>
              <button
                className="button primary"
                disabled={!p.concept}
                onClick={p.onAdvance}
              >
                确认创意
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {p.stage === 3 && (
        <>
          <div className="decision-summary">
            <Check size={15} />
            <span>已确认方向</span>
            <strong>{concept?.title || p.version.title}</strong>
          </div>
          <div className="stage-label">
            <span>02</span>
            <h3>{p.version.label} · 分镜与时间轴</h3>
            <span className="badge">需要你的确认</span>
          </div>
          <div className="conference-storyboard">
            {p.version.scenes.map((s, i) => (
              <article key={s.title}>
                <div>
                  <img src={s.frame} alt={`${s.title}原片抽帧`} />
                  <span>SHOT 0{i + 1}</span>
                </div>
                <section>
                  <small>
                    {format(s.start)} — {format(s.end)}
                  </small>
                  <h4>{s.title}</h4>
                  <p>{s.description}</p>
                </section>
              </article>
            ))}
          </div>
          <div className="note">
            <Info size={14} />
            <span>
              {isOriginal
                ? "分镜来自本版本成片的真实关键帧；时间段为演示拆解，原片画面与声音完整保留。"
                : "以上为原版成片的分镜参考。当前槽位有替换素材，可在素材库核对文件；完成流程后将展示实际成片。"}
            </span>
          </div>
          {isCurrent && (
            <div className="gate-actions">
              <button className="text-button" onClick={p.onRevise}>
                <ArrowLeft size={14} />
                更换创意版本
              </button>
              <button
                className="button primary"
                onClick={p.onStoryboardConfirm}
              >
                确认分镜，开始制作
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {p.stage === 4 && (
        <div className="production-card">
          <div className="production-orb">
            <WandSparkles size={29} />
          </div>
          <h3>让确认的分镜，汇成成片</h3>
          <p>
            {p.version.label} · {p.version.title}
          </p>
          <div className="progress-track">
            <i />
          </div>
          <div className="production-steps">
            <span>
              <Check size={13} />
              分镜与版本已锁定
            </span>
            <span>
              <LoaderCircle className="spin" size={13} />
              串联画面与声音
            </span>
            <span>
              <Film size={13} />
              装配本地成片
            </span>
          </div>
          <small>制作过程演示 · 使用已提供成品</small>
        </div>
      )}

      {p.stage === 5 && (
        <>
          <div className="stage-label">
            <span>03</span>
            <h3>确认交付准备</h3>
            <span className="badge">需要你的确认</span>
          </div>
          <div className="video-review-target">
            <Clapperboard size={24} />
            <div>
              <small>本轮待展示的交付对象</small>
              <strong>
                {p.version.label} · {p.version.title}
              </strong>
              <span>{asset?.name || "等待接入本版本成片"}</span>
            </div>
            <span className="badge green">
              {asset ? "成品已就绪" : "待接入"}
            </span>
          </div>
          <div className="review-checks">
            <h4>成果展示后检查清单</h4>
            {[
              "大会主标题、副标题与画面文字",
              "镜头起止、转场节奏与主题停留",
              "现场播放尺寸、声音与大屏效果",
            ].map((t) => (
              <div key={t}>
                <ListChecks size={16} />
                <span>{t}</span>
                <span className="badge muted">展示后复核</span>
              </div>
            ))}
          </div>
          <div className="conference-review-notes">
            <strong>
              <Info size={14} />
              展示后重点核对
            </strong>
            {(isOriginal
              ? p.version.reviewNotes
              : [
                  "已接入本地替换成片，成果展示后请重新核对实际片长、分辨率、声音与起止画面。",
                  "原版分镜与复核说明仅作为参考，展示后需按替换成片的实际画面逐项确认。",
                ]
            ).map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
          {p.needsReplacement && (
            <div className="note">
              <Info size={14} />
              <span>修改意见已记录，请接入修改后的成品再完成确认。</span>
            </div>
          )}
          <p className="review-disclaimer">
            本次确认表示交付准备就绪；成果展示后的画面复核与现场播出确认仍需完成。
          </p>
          {isCurrent && (
            <div className="gate-actions">
              <button className="text-button" onClick={p.onAssets}>
                <FolderOpen size={14} />
                管理成片
              </button>
              <button className="button primary" onClick={p.onAdvance}>
                {p.canConfirm ? "完成流程，展示成果" : "接入本版本成片"}
                <CheckCheck size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {p.stage === 6 && (
        <div className="delivery-card">
          <div className="delivery-icon">
            <CheckCheck size={30} />
          </div>
          <h3>{p.version.label}，流程已完成</h3>
          <p>「领峰者之夜」开场动画 · {p.version.title}</p>
          <div className="delivery-details">
            <span>
              工作流 <b>7 / 7 阶段</b>
            </span>
            <span>
              确认记录 <b>{p.decisionCount} 项</b>
            </span>
            <span>
              流程版本 <b>V{p.flowVersion.toString().padStart(2, "0")}</b>
            </span>
          </div>
          <div className="delivery-actions">
            <button className="button primary" onClick={p.onExport}>
              <FileText size={15} />
              导出本版项目记录
            </button>
            <button className="button secondary" onClick={p.onStartOther}>
              <GitBranch size={15} />
              演示{other.label}完整流程
            </button>
          </div>
          <small>
            右侧已开放播放、版本对比与下载。请按检查清单复核成果；两个版本分别保留流程记录。
          </small>
        </div>
      )}
      {!isCurrent && (
        <button
          className="video-return-current button secondary small"
          onClick={p.onCurrent}
        >
          返回当前阶段
          <ArrowRight size={14} />
        </button>
      )}
    </>
  );
}
