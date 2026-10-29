import type {
  VideoChatTurn,
  VideoCreativeAnswers,
  VideoDuration,
  VideoResolution,
} from "./videoChatStore";

type WorkflowStep = 0 | 1 | 2 | 3;

export interface VideoPromptWorkflow {
  version: 1;
  step: WorkflowStep;
  reachedStep: WorkflowStep;
  structure: "balanced" | "guide";
  motion: "layered" | "gentle";
  transition: "halo" | "dissolve";
  audio: "music" | "silent";
  notes: string;
  promptOverride?: string;
}

export interface VideoWorkflowContext {
  prompt: string;
  duration: VideoDuration;
  resolution: VideoResolution;
  referenceCount: number;
  isDemo: boolean;
}

export interface VideoWorkflowScene {
  id: string;
  title: string;
  sourceLabel: string;
  start: number;
  end: number;
  action: string;
}

const demoNames = [
  "肥胖诊疗路径 · 主题封面.png",
  "诊疗现状 · 数据页面.png",
  "指南探索 · 移动页面.png",
];

export function getVideoWorkflowContext(
  turn: Pick<
    VideoChatTurn,
    "prompt" | "duration" | "resolution" | "references"
  >,
): VideoWorkflowContext {
  return {
    prompt: turn.prompt,
    duration: turn.duration,
    resolution: turn.resolution,
    referenceCount: turn.references.length,
    isDemo:
      turn.references.length === demoNames.length &&
      turn.references.every(
        (reference, index) =>
          reference.kind === "image" && reference.name === demoNames[index],
      ),
  };
}

export function createVideoPromptWorkflow(
  answers?: VideoCreativeAnswers,
): VideoPromptWorkflow {
  return {
    version: 1,
    step: 0,
    reachedStep: 0,
    structure: answers?.emphasis === "guide" ? "guide" : "balanced",
    motion: answers?.rhythm === "gentle" ? "gentle" : "layered",
    transition: "halo",
    audio: "music",
    notes: "",
  };
}

function isStep(value: unknown): value is WorkflowStep {
  return typeof value === "number" && [0, 1, 2, 3].includes(value);
}

export function isVideoPromptWorkflow(
  value: unknown,
): value is VideoPromptWorkflow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const workflow = value as VideoPromptWorkflow;
  return (
    workflow.version === 1 &&
    isStep(workflow.step) &&
    isStep(workflow.reachedStep) &&
    workflow.step <= workflow.reachedStep &&
    ["balanced", "guide"].includes(workflow.structure) &&
    ["layered", "gentle"].includes(workflow.motion) &&
    ["halo", "dissolve"].includes(workflow.transition) &&
    ["music", "silent"].includes(workflow.audio) &&
    typeof workflow.notes === "string" &&
    workflow.notes.length <= 600 &&
    (workflow.promptOverride === undefined ||
      (typeof workflow.promptOverride === "string" &&
        workflow.promptOverride.length <= 8000))
  );
}

export function updateVideoPromptWorkflow(
  current: VideoPromptWorkflow,
  patch: Partial<VideoPromptWorkflow>,
): VideoPromptWorkflow {
  const next = { ...current };
  // A visited step is revisitable; new steps must be reached in order.
  if (
    isStep(patch.step) &&
    (patch.step <= current.reachedStep || patch.step === current.step + 1)
  ) {
    next.step = patch.step;
    next.reachedStep = Math.max(
      current.reachedStep,
      patch.step,
    ) as WorkflowStep;
  }
  let changed = false;
  const choices = {
    structure: ["balanced", "guide"],
    motion: ["layered", "gentle"],
    transition: ["halo", "dissolve"],
    audio: ["music", "silent"],
  } as const;
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    const value = patch[key];
    if (
      value !== undefined &&
      (choices[key] as readonly string[]).includes(value)
    ) {
      changed ||= value !== current[key];
      Object.assign(next, { [key]: value });
    }
  }
  if (typeof patch.notes === "string") {
    next.notes = patch.notes.slice(0, 600);
    changed ||= next.notes !== current.notes;
  }
  if (changed) {
    delete next.promptOverride;
  } else if (Object.prototype.hasOwnProperty.call(patch, "promptOverride")) {
    if (typeof patch.promptOverride === "string")
      next.promptOverride = patch.promptOverride.slice(0, 8000);
    else if (patch.promptOverride === undefined) delete next.promptOverride;
  }
  return next;
}

export function canConfirmVideoPromptWorkflow(
  workflow: VideoPromptWorkflow,
): boolean {
  return (
    isVideoPromptWorkflow(workflow) &&
    workflow.step === 3 &&
    workflow.reachedStep === 3 &&
    (workflow.promptOverride === undefined || !!workflow.promptOverride.trim())
  );
}

export function getVideoWorkflowScenes(
  context: VideoWorkflowContext,
  workflow: VideoPromptWorkflow,
): VideoWorkflowScene[] {
  const firstEnd = Number(
    (context.duration * (workflow.structure === "guide" ? 0.2 : 0.3)).toFixed(
      1,
    ),
  );
  const secondEnd = Number(
    (context.duration * (workflow.structure === "guide" ? 0.6 : 0.7)).toFixed(
      1,
    ),
  );
  const times = [0, firstEnd, secondEnd, context.duration];
  const titles = context.isDemo
    ? [
        "主题封面：引出诊疗路径",
        "诊疗数据：依序呈现信息",
        "指南探索：手机页面收尾",
      ]
    : ["开场：引出主题", "主体：呈现核心内容", "收尾：停留重点信息"];
  const layeredActions = context.isDemo
    ? [
        "沿用参考图 1 的红粉色背景，白色流光沿边缘移动；标题由上至下逐层出现，完整显示后短暂停留。",
        "数据卡片先入场，图表和数字依次显现，最终停在参考图 2 的原始数据；底部说明保持清晰可读。",
        "参考图 3 中的手机从右下方轻微旋转入场，周围信息卡依次浮现；最后停留在完整指南页面。",
      ]
    : [
        "围绕用户需求先呈现主题主体，再让标题淡入；主体保持稳定，给观众留出阅读时间。",
        "先展示核心内容，再按阅读顺序依次显现辅助信息；每次只突出一个重点，保持原文与数据不变。",
        "将需求中的收尾重点完整呈现，其他元素逐渐稳定；最后半秒保持完整画面。",
      ];
  return titles.map((title, index) => ({
    id: ["cover", "body", "ending"][index],
    title,
    sourceLabel: context.isDemo
      ? `参考图 ${index + 1} · ${["主题封面", "诊疗现状", "指南探索"][index]}`
      : context.referenceCount
        ? `结合本轮 ${context.referenceCount} 个素材与原始需求安排画面`
        : "根据原始需求安排画面内容",
    start: times[index],
    end: times[index + 1],
    action:
      workflow.motion === "gentle"
        ? `保留${context.isDemo ? `参考图 ${index + 1} 的` : "本幕"}完整画面，缓慢放大约 3%；不拆开文字或图表，保持主体与边缘文字完整可读。${index === 2 ? "最后半秒停留在完整画面。" : ""}`
        : layeredActions[index],
  }));
}

export function buildVideoPrompt(
  context: VideoWorkflowContext,
  workflow: VideoPromptWorkflow,
): string {
  const scenes = getVideoWorkflowScenes(context, workflow);
  const transition =
    workflow.transition === "halo"
      ? "白色光环沿画面边缘扫过，带出下一幕；转场不遮挡主要文字。"
      : "镜头之间使用约 0.3 秒柔和叠化，前后画面短暂重叠后完成切换，不额外添加光效。";
  const audio =
    workflow.audio === "silent"
      ? "输出无声视频，不添加背景音乐、音效或旁白。"
      : "配轻快器乐背景音乐，随镜头衔接自然延续，不额外添加旁白；结尾音乐自然收束。";
  return [
    `原始需求：${context.prompt.trim()}`,
    `视频规格：总时长 ${context.duration} 秒，${context.resolution}${context.isDemo ? "，1:1 方形画面" : ""}。`,
    context.isDemo
      ? "参考素材：按上传顺序使用主题封面、诊疗数据、指南探索三张图，延续原图红粉色视觉。"
      : context.referenceCount
        ? `参考素材：结合本轮上传的 ${context.referenceCount} 个素材，内容以原始需求和素材为准。`
        : "画面内容：围绕原始需求展开，不补入未经提供的具体数据或引文。",
    "镜头安排：\n" +
      scenes
        .map(
          (scene, index) =>
            `${index + 1}. ${scene.start}–${scene.end} 秒｜${scene.title}\n${scene.action}`,
        )
        .join("\n"),
    `转场：${transition}`,
    `声音：${audio}`,
    "保留要求：原有文字、数据、品牌标志与引用保持准确、清晰，不裁掉重要内容。" +
      (context.isDemo ? "不新增医学结论。" : "不改写素材中的事实。"),
    ...(workflow.notes.trim() ? [`补充要求：${workflow.notes.trim()}`] : []),
  ].join("\n\n");
}
