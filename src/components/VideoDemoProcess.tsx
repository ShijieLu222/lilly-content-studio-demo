import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import type { VideoCreativeAnswers } from "../lib/videoChatStore";
import "./VideoDemoProcess.css";

const progressSteps = {
  analyzing: ["分析参考素材", "梳理画面顺序", "整理确认项"],
  preparing: ["确认画面衔接", "准备配乐与转场", "整理成片"],
} as const;

export function VideoDemoProgress({
  phase,
  referenceCount,
}: {
  phase: "analyzing" | "preparing";
  referenceCount: number;
}) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
    const second = setTimeout(() => setActiveStep(1), 1200);
    const third = setTimeout(() => setActiveStep(2), 2400);
    return () => {
      clearTimeout(second);
      clearTimeout(third);
    };
  }, [phase]);

  return (
    <div className="vdemo-progress" role="status" aria-live="polite">
      <div className="vdemo-progress-heading">
        <span className="vdemo-progress-symbol">
          <Sparkles size={17} />
        </span>
        <div>
          <strong>
            {phase === "analyzing" ? "正在分析创作需求" : "正在准备视频成片"}
          </strong>
          <p>
            {phase === "analyzing"
              ? referenceCount
                ? `结合提示词与 ${referenceCount} 个参考素材，整理本轮创作方向。`
                : "结合提示词，整理本轮创作方向。"
              : "已记录你的选择，正在衔接画面、节奏与声音。"}
          </p>
        </div>
        <span className="vdemo-progress-label">演示进度</span>
      </div>
      <ol className="vdemo-progress-steps">
        {progressSteps[phase].map((label, index) => (
          <li
            key={label}
            className={
              index < activeStep
                ? "is-done"
                : index === activeStep
                  ? "is-active"
                  : ""
            }
          >
            <span className="vdemo-step-icon" aria-hidden="true">
              {index < activeStep ? (
                <Check size={12} />
              ) : index === activeStep ? (
                <LoaderCircle size={12} className="vdemo-spin" />
              ) : (
                <span />
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

const rhythmOptions = [
  {
    value: "dynamic",
    title: "轻快流畅",
    description: "清晰切换，节奏鲜明",
    recommended: true,
  },
  {
    value: "gentle",
    title: "舒展自然",
    description: "缓慢推进，柔和过渡",
    recommended: false,
  },
] as const;

const emphasisOptions = [
  {
    value: "balanced",
    title: "均衡呈现",
    description: "封面 → 数据 → 指南",
    recommended: true,
  },
  {
    value: "guide",
    title: "突出指南",
    description: "强化手机页面与结尾停留",
    recommended: false,
  },
] as const;

export function VideoDemoQuestions({
  answers,
  onChange,
  onConfirm,
}: {
  answers: VideoCreativeAnswers;
  onChange: (answers: VideoCreativeAnswers) => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const complete = Boolean(answers.rhythm && answers.emphasis);

  return (
    <div className="vdemo-questions">
      <p className="vdemo-questions-intro">
        参考素材已就绪，再确认两个创作偏好。
      </p>
      <div className="vdemo-question-grid">
        <fieldset className="vdemo-question">
          <legend>
            <span>01</span>你希望画面是什么节奏？
          </legend>
          {rhythmOptions.map((option) => (
            <label className="vdemo-option" key={option.value}>
              <input
                type="radio"
                name={`${id}-rhythm`}
                value={option.value}
                checked={answers.rhythm === option.value}
                onChange={() => onChange({ ...answers, rhythm: option.value })}
              />
              <span className="vdemo-option-indicator" aria-hidden="true">
                <Check size={11} />
              </span>
              <span className="vdemo-option-text">
                <span className="vdemo-option-title">
                  {option.title}
                  {option.recommended && <small>推荐</small>}
                </span>
                <span className="vdemo-option-description">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="vdemo-question">
          <legend>
            <span>02</span>内容重点希望怎样呈现？
          </legend>
          {emphasisOptions.map((option) => (
            <label className="vdemo-option" key={option.value}>
              <input
                type="radio"
                name={`${id}-emphasis`}
                value={option.value}
                checked={answers.emphasis === option.value}
                onChange={() =>
                  onChange({ ...answers, emphasis: option.value })
                }
              />
              <span className="vdemo-option-indicator" aria-hidden="true">
                <Check size={11} />
              </span>
              <span className="vdemo-option-text">
                <span className="vdemo-option-title">
                  {option.title}
                  {option.recommended && <small>推荐</small>}
                </span>
                <span className="vdemo-option-description">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="vdemo-question-footer">
        <span>
          {complete ? "创作偏好已选好，可以继续了" : "每题选择一项，再继续生成"}
        </span>
        <button type="button" disabled={!complete} onClick={onConfirm}>
          确认，继续生成 <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
}
