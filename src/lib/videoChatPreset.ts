import type {
  VideoChatDraft,
  VideoDuration,
  VideoResolution,
} from "./videoChatStore";

export const VIDEO_DEMO_DURATION: VideoDuration = 10;
export const VIDEO_DEMO_RESOLUTION: VideoResolution = "1080p";
export const VIDEO_DEMO_PROMPT =
  "把这三张图做成一条 10 秒的视频，介绍肥胖诊疗路径。";

const LEGACY_DEMO_PROMPT =
  "请基于这三张参考图，制作一支 8 秒的肥胖诊疗路径主题视频。依次呈现主题封面、诊疗数据、指南探索页面，延续红粉色视觉，用流畅转场和轻微镜头推进让画面动起来，配合轻快、专业的背景音乐。完整保留原图的文字、数据、品牌标志与引用，不新增医学结论。";

export function initialVideoPrompt(value?: string): string {
  const prompt = value?.trim() || "";
  return prompt === LEGACY_DEMO_PROMPT ? VIDEO_DEMO_PROMPT : prompt;
}

// Only upgrade the complete old preset; preserve user-authored text and settings.
// Completed turns are historical records and are never rewritten here.
export function upgradeVideoDemoDraft(draft: VideoChatDraft): VideoChatDraft {
  if (
    draft.prompt.trim() !== LEGACY_DEMO_PROMPT ||
    draft.duration !== 8 ||
    draft.resolution !== "720p"
  )
    return draft;
  return {
    ...draft,
    prompt: VIDEO_DEMO_PROMPT,
    duration: VIDEO_DEMO_DURATION,
    resolution: VIDEO_DEMO_RESOLUTION,
  };
}
