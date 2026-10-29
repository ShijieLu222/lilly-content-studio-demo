import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  FileText,
  LoaderCircle,
  Music2,
  RotateCcw,
  Sparkles,
  VolumeX,
} from "lucide-react";
import {
  buildVideoPrompt,
  canConfirmVideoPromptWorkflow,
  getVideoWorkflowScenes,
  updateVideoPromptWorkflow,
  type VideoPromptWorkflow,
  type VideoWorkflowContext,
} from "../lib/videoPromptWorkflow";
import "./VideoDemoProcess.css";

const progressSteps = {
  analyzing: ["梳理一句话需求", "拆解内容与画面", "准备提示词引导"],
  preparing: ["确认完整提示词", "整理镜头与声音安排", "准备演示成片"],
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
            {phase === "analyzing"
              ? "先把你的想法变成具体画面"
              : "完整提示词已确认，正在准备成片"}
          </strong>
          <p>
            {phase === "analyzing"
              ? referenceCount
                ? `结合你的需求与 ${referenceCount} 个参考素材，逐步明确内容、动作、转场和声音。`
                : "从你的简单需求出发，一起补齐画面安排和生成提示词。"
              : "本轮提示词与镜头安排已保存，即将展示现有演示成片。"}
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

const stepLabels = [
  "内容顺序",
  "画面动作",
  "转场与声音",
  "确认提示词",
] as const;
const demoImages = [
  "/assets/video-references/poc-reference-1.png",
  "/assets/video-references/poc-reference-2.png",
  "/assets/video-references/poc-reference-3.png",
];
const exampleVideos = ["cover", "data", "guide"];
const stepTitles = [
  "先确认：这条视频按什么顺序讲？",
  "再具体一点：每个画面怎样动起来？",
  "最后补齐：画面怎样衔接，声音怎么配？",
  "把这些选择，整理成一份完整提示词。",
] as const;
const nextLabels = [
  "确认顺序，安排动作",
  "确认动作，完善转场",
  "整理完整提示词",
] as const;

function time(value: number) {
  return Number(value.toFixed(1)).toString();
}

function Choice({
  name,
  value,
  checked,
  title,
  description,
  example,
  recommended,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  title: string;
  description: string;
  example?: string;
  recommended?: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`vguide-choice ${checked ? "is-selected" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="vguide-choice-check" aria-hidden="true">
        <Check size={11} />
      </span>
      <span className="vguide-choice-copy">
        <span className="vguide-choice-title">
          {title}
          {recommended && <small>成片方案</small>}
        </span>
        <span className="vguide-choice-description">{description}</span>
        {example && <span className="vguide-choice-example">{example}</span>}
      </span>
    </label>
  );
}

function WrittenPrompt({ text }: { text: string }) {
  return (
    <div className="vguide-written">
      <span>
        <FileText size={13} /> 已写入提示词
      </span>
      <p>{text}</p>
    </div>
  );
}

export function VideoPromptGuide({
  context,
  workflow,
  onChange,
  onConfirm,
}: {
  context: VideoWorkflowContext;
  workflow: VideoPromptWorkflow;
  onChange: (workflow: VideoPromptWorkflow) => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(workflow.step);
  const [copyState, setCopyState] = useState("");
  const scenes = getVideoWorkflowScenes(context, workflow);
  const reachedStep = workflow.reachedStep ?? workflow.step;
  const fullPrompt =
    workflow.promptOverride ?? buildVideoPrompt(context, workflow);
  const update = (patch: Partial<VideoPromptWorkflow>) => {
    setCopyState("");
    onChange(updateVideoPromptWorkflow(workflow, patch));
  };
  const goTo = (step: number) =>
    update({ step: step as VideoPromptWorkflow["step"] });

  useEffect(() => {
    if (previousStep.current !== workflow.step) {
      previousStep.current = workflow.step;
      heading.current?.focus({ preventScroll: true });
      heading.current?.closest(".vguide")?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [workflow.step]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopyState("提示词已复制");
    } catch {
      setCopyState("可在下方选中文字复制");
    }
  }

  const orderText =
    scenes
      .map(
        (scene) => `${time(scene.start)}–${time(scene.end)} 秒：${scene.title}`,
      )
      .join("；") + "。";
  const transitionText =
    workflow.transition === "halo"
      ? "用白色光环扫过画面边缘，带出下一幕，转场不遮挡主要文字。"
      : "镜头之间使用约 0.3 秒柔和叠化，前后画面短暂重叠后完成切换。";
  const audioText =
    workflow.audio === "music"
      ? "配轻快器乐背景音乐，不额外添加旁白。"
      : "输出无声视频，不添加背景音乐或旁白。";

  return (
    <section className="vguide" aria-label="逐步完善视频提示词">
      <div className="vguide-topline">
        <span>
          <Sparkles size={13} /> 一句话 → 完整视频提示词
        </span>
        <span>
          {context.duration}s · {context.resolution}
        </span>
      </div>
      <ol className="vguide-steps" aria-label="提示词完善步骤">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={
              index === workflow.step
                ? "is-current"
                : index < reachedStep
                  ? "is-complete"
                  : ""
            }
          >
            <button
              type="button"
              aria-current={index === workflow.step ? "step" : undefined}
              disabled={index > reachedStep}
              onClick={() => goTo(index)}
            >
              <span>
                {index < reachedStep && index !== workflow.step ? (
                  <Check size={12} />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <div className="vguide-heading">
        <span>STEP 0{workflow.step + 1} / 04</span>
        <h3 tabIndex={-1} ref={heading}>
          {stepTitles[workflow.step]}
        </h3>
        <p>
          {workflow.step === 0
            ? context.isDemo
              ? "三张图分别承担开场、数据说明和指南收尾。先确认每一段讲什么、停多久。"
              : "先将你的需求拆成开场、主体和收尾，画面内容以本轮需求及参考素材为准。"
            : workflow.step === 1
              ? "把动作写到元素和出场顺序。点开下方片段，可以看到现有成片怎样呈现。"
              : workflow.step === 2
                ? "用具体的衔接动作和声音要求，让镜头之间连贯起来。"
                : "内容顺序、动作与声音都已补齐。你可以直接修改，再确认生成。"}
        </p>
      </div>

      {workflow.step === 0 && (
        <div className="vguide-stage">
          <div className="vguide-scenes vguide-order-scenes">
            {scenes.map((scene, index) => (
              <article className="vguide-order-card" key={scene.id}>
                <div className="vguide-source-thumb">
                  {context.isDemo ? (
                    <img
                      src={demoImages[index]}
                      alt={`参考图 ${index + 1}：${scene.title}`}
                    />
                  ) : (
                    <>
                      <Clapperboard size={22} />
                      <span>画面 {index + 1}</span>
                    </>
                  )}
                </div>
                <div>
                  <span className="vguide-time">
                    {time(scene.start)}–{time(scene.end)}s
                  </span>
                  <h4>{scene.title}</h4>
                  <p>{scene.sourceLabel}</p>
                </div>
              </article>
            ))}
          </div>
          <fieldset className="vguide-choice-group">
            <legend>你希望怎么分配时间？</legend>
            <div className="vguide-two-options">
              <Choice
                name={`${id}-structure`}
                value="balanced"
                checked={workflow.structure === "balanced"}
                title={
                  context.isDemo ? "开场 → 数据 → 指南" : "开场 → 主体 → 收尾"
                }
                description="让三个部分都得到清楚呈现。"
                recommended={context.isDemo}
                example={`约 ${time(context.duration * 0.3)}s / ${time(context.duration * 0.4)}s / ${time(context.duration * 0.3)}s`}
                onChange={() => update({ structure: "balanced" })}
              />
              <Choice
                name={`${id}-structure`}
                value="guide"
                checked={workflow.structure === "guide"}
                title={
                  context.isDemo
                    ? "给指南结尾多留一点时间"
                    : "给收尾重点多留一点时间"
                }
                description={
                  context.isDemo
                    ? "压缩开场，让最后的手机页面停留更久。"
                    : "压缩开场，给最后要记住的信息更长停留。"
                }
                example={`约 ${time(context.duration * 0.2)}s / ${time(context.duration * 0.4)}s / ${time(context.duration * 0.4)}s`}
                onChange={() => update({ structure: "guide" })}
              />
            </div>
          </fieldset>
          <WrittenPrompt text={orderText} />
        </div>
      )}

      {workflow.step === 1 && (
        <div className="vguide-stage">
          <div className="vguide-example-caption">
            <Clapperboard size={13} /> 现有成片的三个动作示例{" "}
            <span>点击播放查看</span>
          </div>
          <div className="vguide-scenes vguide-motion-scenes">
            {scenes.map((scene, index) => (
              <article className="vguide-motion-card" key={scene.id}>
                <div className="vguide-video-frame">
                  <video
                    key={exampleVideos[index]}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    src={`/assets/videos/workflow-${exampleVideos[index]}.mp4`}
                    poster={`/assets/videos/workflow-${exampleVideos[index]}-poster.jpg`}
                    aria-label={`${["标题入场", "数据出现", "手机入场"][index]}成片示例`}
                  />
                  <span>成片示例 0{index + 1}</span>
                </div>
                <div className="vguide-motion-copy">
                  <span className="vguide-time">
                    {time(scene.start)}–{time(scene.end)}s
                  </span>
                  <h4>{scene.title}</h4>
                  <p>{scene.action}</p>
                </div>
              </article>
            ))}
          </div>
          <fieldset className="vguide-choice-group">
            <legend>选择要写进提示词的动作安排</legend>
            <div className="vguide-two-options">
              <Choice
                name={`${id}-motion`}
                value="layered"
                checked={workflow.motion === "layered"}
                title="让元素按顺序出现"
                recommended={context.isDemo}
                description={
                  context.isDemo
                    ? "标题逐层展开 → 数据依序显现 → 手机转入，信息卡浮现。"
                    : "主体先出现，再依次呈现辅助信息；不改写原有文字与数据。"
                }
                onChange={() => update({ motion: "layered" })}
              />
              <Choice
                name={`${id}-motion`}
                value="gentle"
                checked={workflow.motion === "gentle"}
                title="保留整张画面，轻微推进"
                description="每一幕由完整画面缓慢放大约 3%，不拆开文字或图表。"
                onChange={() => update({ motion: "gentle" })}
              />
            </div>
          </fieldset>
          <WrittenPrompt
            text={scenes
              .map((scene) => `${scene.title}：${scene.action}`)
              .join("\n")}
          />
        </div>
      )}

      {workflow.step === 2 && (
        <div className="vguide-stage">
          <div className="vguide-transition-layout">
            <div className="vguide-transition-preview">
              <video
                controls
                muted
                playsInline
                preload="metadata"
                src="/assets/videos/workflow-transition.mp4"
                poster="/assets/videos/workflow-transition-poster.jpg"
                aria-label="白色光环转场成片示例"
              />
              <p>
                <Clapperboard size={12} /> 成片示例：白色光环将前后画面串联
              </p>
            </div>
            <fieldset className="vguide-choice-group">
              <legend>画面怎么切换？</legend>
              <Choice
                name={`${id}-transition`}
                value="halo"
                checked={workflow.transition === "halo"}
                title="白色光环扫过，带出下一幕"
                recommended={context.isDemo}
                description="光环沿画面边缘运动，衔接标题、数据与收尾。"
                onChange={() => update({ transition: "halo" })}
              />
              <Choice
                name={`${id}-transition`}
                value="dissolve"
                checked={workflow.transition === "dissolve"}
                title="前后画面柔和叠化"
                description="用约 0.3 秒完成渐隐与渐显，不额外添加光效。"
                onChange={() => update({ transition: "dissolve" })}
              />
            </fieldset>
          </div>
          <fieldset className="vguide-choice-group">
            <legend>
              <Music2 size={14} /> 声音怎么处理？
            </legend>
            <div className="vguide-two-options">
              <Choice
                name={`${id}-audio`}
                value="music"
                checked={workflow.audio === "music"}
                title="轻快器乐，不加旁白"
                description="让音乐连接镜头，保留观众阅读画面文字的空间。"
                onChange={() => update({ audio: "music" })}
              />
              <Choice
                name={`${id}-audio`}
                value="silent"
                checked={workflow.audio === "silent"}
                title="无声版本"
                description="不加入音乐、音效或旁白，适合后续统一配音。"
                onChange={() => update({ audio: "silent" })}
              />
            </div>
          </fieldset>
          <label className="vguide-notes">
            <span>
              还有什么需要补充？<small>选填</small>
            </span>
            <textarea
              value={workflow.notes}
              maxLength={600}
              rows={2}
              aria-label="视频补充要求"
              placeholder="例如：结尾保留半秒完整画面；品牌标志全程清晰。"
              onChange={(event) => update({ notes: event.target.value })}
            />
          </label>
          <WrittenPrompt
            text={`${transitionText}${audioText}${workflow.notes.trim() ? `\n补充要求：${workflow.notes.trim()}` : ""}`}
          />
        </div>
      )}

      {workflow.step === 3 && (
        <div className="vguide-stage">
          <div className="vguide-prompt-specs">
            <span>
              <Check size={12} /> {scenes.length} 段画面
            </span>
            <span>
              <Check size={12} /> 已明确动作与转场
            </span>
            <span>
              {workflow.audio === "silent" ? (
                <VolumeX size={12} />
              ) : (
                <Music2 size={12} />
              )}
              {workflow.audio === "silent" ? "无声" : "配乐 · 无旁白"}
            </span>
          </div>
          <div className="vguide-prompt-label">
            <label htmlFor={`${id}-prompt`}>最终生成提示词</label>
            <button type="button" onClick={() => void copyPrompt()}>
              <Copy size={12} />
              复制提示词
            </button>
          </div>
          <textarea
            id={`${id}-prompt`}
            className="vguide-final-prompt"
            aria-label="完整视频提示词"
            value={fullPrompt}
            rows={13}
            maxLength={8000}
            onChange={(event) => update({ promptOverride: event.target.value })}
          />
          <div className="vguide-prompt-tools">
            <span>
              {copyState || "可直接编辑；修改前面步骤时，会按新选择重新整理。"}
            </span>
            <button
              type="button"
              disabled={workflow.promptOverride === undefined}
              onClick={() => update({ promptOverride: undefined })}
            >
              <RotateCcw size={11} />
              还原步骤生成内容
            </button>
          </div>
        </div>
      )}

      <div className="vguide-footer">
        <button
          className="vguide-back"
          type="button"
          disabled={workflow.step === 0}
          onClick={() => goTo(workflow.step - 1)}
        >
          <ArrowLeft size={13} />
          上一步
        </button>
        <span>
          {workflow.step === 3
            ? "确认后保存本轮完整提示词"
            : "每次选择都会更新提示词"}
        </span>
        <button
          className="vguide-next"
          type="button"
          disabled={
            workflow.step === 3 &&
            (!canConfirmVideoPromptWorkflow(workflow) || !fullPrompt.trim())
          }
          onClick={() =>
            workflow.step === 3 ? onConfirm() : goTo(workflow.step + 1)
          }
        >
          {workflow.step === 3
            ? "确认提示词，生成视频"
            : nextLabels[workflow.step]}
          {workflow.step === 3 ? (
            <ArrowUpRight size={15} />
          ) : (
            <ArrowRight size={15} />
          )}
        </button>
      </div>
      <p className="vguide-demo-note">
        片段来自已有成片。选择会更新提示词；本地演示播放同一份成片。
      </p>
    </section>
  );
}

export function VideoPromptSummary({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <details className="vguide-summary">
      <summary>
        <span>
          <Check size={13} /> 已确认的完整提示词
        </span>
        <ChevronDown size={13} />
      </summary>
      <div>
        <p>{prompt}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopied(true);
              setCopyError(false);
            } catch {
              setCopyError(true);
            }
          }}
        >
          <Copy size={12} />
          {copied ? "已复制" : "复制提示词"}
        </button>
        {copyError && <small role="status">请选中文字后复制。</small>}
      </div>
    </details>
  );
}
