export type VideoVersionId = "video-1" | "video-2";

export interface VideoScene {
  start: number;
  end: number;
  sampleTime: number;
  title: string;
  description: string;
  frame: string;
}

export interface VideoVersion {
  id: VideoVersionId;
  conceptId: "opening-a" | "opening-b";
  label: string;
  title: string;
  description: string;
  originalName: string;
  src: string;
  poster: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  scenes: VideoScene[];
  reviewNotes: string[];
}

export const conferenceDemo = {
  title: "领峰者之夜",
  subtitle: "暨穆峰达®全球重磅研究中国发布盛典",
  slogan: "代谢风尚 · 难掩峰芒",
  palette: "紫色星空 · 橙金光束 · 银色主题字",
  timelineNote:
    "分镜按原片代表帧整理；光束与标题为连续渐变，区间用于演示叙事节奏，非逐帧剪辑点。",
};

export const conferenceTitle = conferenceDemo.title;

export const videoVersions: VideoVersion[] = [
  {
    id: "video-1",
    conceptId: "opening-a",
    label: "版本 A",
    title: "光束转场，主题揭幕",
    description:
      "从讲者题卡切入橙金光束，展开大会主视觉，再衔接原片的英文披露页。",
    originalName: "47ef63d8-c3aa-4717-bb02-fa6b601710a5.mp4",
    src: "/assets/videos/conference-opening-a.mp4",
    poster: "/assets/videos/conference-opening-a-poster.jpg",
    duration: 5.033,
    width: 1920,
    height: 1080,
    fps: 30,
    scenes: [
      {
        start: 0,
        end: 0.567,
        sampleTime: 0,
        title: "讲者题卡",
        description: "保留原片开头的「代谢溯源」讲者题卡，建立场次衔接。",
        frame: "/assets/videos/conference-opening-a-scene-1.jpg",
      },
      {
        start: 0.567,
        end: 2.2,
        sampleTime: 1.5,
        title: "光束展开",
        description: "橙金色扇形光束在紫色空间中展开，亮点与流线连接主题画面。",
        frame: "/assets/videos/conference-opening-a-scene-2.jpg",
      },
      {
        start: 2.2,
        end: 4.3,
        sampleTime: 3,
        title: "主题揭幕",
        description:
          "「领峰者之夜」及大会副标题渐次显现，与光束组成完整主视觉。",
        frame: "/assets/videos/conference-opening-a-scene-3.jpg",
      },
      {
        start: 4.3,
        end: 5.033,
        sampleTime: 4.6,
        title: "披露页衔接",
        description: "原片在 4.30 秒切入英文披露说明页，完整保留此段内容。",
        frame: "/assets/videos/conference-opening-a-scene-4.jpg",
      },
    ],
    reviewNotes: [
      "原片包含片首讲者题卡与片尾英文披露页；确认这两个衔接画面符合大会实际播放顺序。",
      "核对大会名称、副标题、讲者信息与片尾说明；当前演示未改动原片文字。",
      "结合现场大屏与播放设备复核 1080p 画面、声音及落版停留时间。",
    ],
  },
  {
    id: "video-2",
    conceptId: "opening-b",
    label: "版本 B",
    title: "星光汇聚，盛典启幕",
    description:
      "从紫色星空与地平线亮点开始，光束汇聚展开，银色主题字渐显并稳定落版。",
    originalName: "45d17732225fa07ce494c296407c6b6c.mp4",
    src: "/assets/videos/conference-opening-b.mp4",
    poster: "/assets/videos/conference-opening-b-poster.jpg",
    duration: 6.083,
    width: 1280,
    height: 720,
    fps: 24,
    scenes: [
      {
        start: 0,
        end: 1.6,
        sampleTime: 0,
        title: "星空蓄势",
        description:
          "紫色星空与地平线亮点建立开场空间，画面留出主题出现的位置。",
        frame: "/assets/videos/conference-opening-b-scene-1.jpg",
      },
      {
        start: 1.6,
        end: 2.8,
        sampleTime: 2,
        title: "光束汇聚",
        description: "橙金光束自亮点向右上方展开，流星与光线增加动态层次。",
        frame: "/assets/videos/conference-opening-b-scene-2.jpg",
      },
      {
        start: 2.8,
        end: 4,
        sampleTime: 3.4,
        title: "标题渐显",
        description: "银色立体主题字与大会副标题渐显，完成信息层次的建立。",
        frame: "/assets/videos/conference-opening-b-scene-3.jpg",
      },
      {
        start: 4,
        end: 6.083,
        sampleTime: 5.5,
        title: "主视觉落版",
        description:
          "保持完整大会主视觉，字面高光与星点继续闪动，形成稳定结束画面。",
        frame: "/assets/videos/conference-opening-b-scene-4.jpg",
      },
    ],
    reviewNotes: [
      "确认「领峰者之夜」、副标题与「难掩峰芒」的文字展示和现场主题一致。",
      "结合会场大屏复核 720p 原片的清晰度；当前演示保留原始分辨率。",
      "确认约 6 秒的节奏、主题停留与声音符合现场开场及后续节目的衔接。",
    ],
  },
];
