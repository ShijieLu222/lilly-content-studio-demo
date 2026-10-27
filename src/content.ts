export type ProductKind = "article" | "video";

export interface Concept {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  scene: string;
  reason: string;
  tags: string[];
}

export interface Stage {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  output: string;
  gate: boolean;
}

export interface ProductInfo {
  name: string;
  english: string;
  description: string;
  starter: string;
  promptExamples: string[];
  stages: Stage[];
  concepts: Concept[];
}

export const productInfo: Record<ProductKind, ProductInfo> = {
  article: {
    name: "生成式长图文",
    english: "ARTICLE STUDIO",
    description:
      "从传播任务到创意叙事，让图文、系列海报与互动表达形成一个完整故事。",
    starter:
      "帮礼医做一篇面向医生的文献查询长图文，用在微信内容场景。以明亮的立体漫画呈现，把“分散资料逐渐清晰”讲成一个故事，保留原有文案，并考虑延展为系列海报。",
    promptExamples: [
      "把文献查询的价值，讲成一篇有探索感的长图文",
      "基于已确认的母版，延展五张礼医服务系列海报",
      "为已完成的图文设计展开、滑动与局部动态效果",
    ],
    stages: [
      {
        id: "brief",
        title: "理解传播任务",
        shortTitle: "需求解析",
        description:
          "梳理受众、渠道、传播目标与必须保留的文案。区分固定要求、创作偏好和待补素材。",
        output: "创作任务卡 · 固定要求与创作空间",
        gate: false,
      },
      {
        id: "reference",
        title: "建立创作依据",
        shortTitle: "参考检索",
        description:
          "展示预设的品牌、渠道与案例参考，说明参考如何影响本次创意。历史项目偏好单独记录。",
        output: "参考依据 · 品牌与渠道约束",
        gate: false,
      },
      {
        id: "concept",
        title: "选择创意概念",
        shortTitle: "创意概念",
        description:
          "比较三种叙事机制：面对什么处境、画面发生什么，以及礼医怎样参与。选择后再深化。",
        output: "创意概念卡 · 确认传播命题与故事",
        gate: true,
      },
      {
        id: "design",
        title: "确认画面与叙事",
        shortTitle: "画面方案",
        description:
          "把概念转为章节、构图与文字留白。确认视觉焦点、人物动作、阅读顺序和局部互动位置。",
        output: "章节草图 · 视觉说明与互动脚本",
        gate: true,
      },
      {
        id: "production",
        title: "组织素材与排版",
        shortTitle: "制作合成",
        description:
          "演示素材制作、精确文字排版与质量检查的协作流程，并载入预先完成的本地成品。",
        output: "成品装配 · 素材与版本记录",
        gate: false,
      },
      {
        id: "review",
        title: "确认交付准备",
        shortTitle: "交付确认",
        description:
          "确认五张海报与本轮方案已就绪，并保留展示后检查清单。完成全部流程后，再开放最终图文预览。",
        output: "交付准备记录 · 展示后检查清单",
        gate: true,
      },
      {
        id: "delivery",
        title: "展示并保存创作成果",
        shortTitle: "成果交付",
        description:
          "全部阶段完成且确认素材未变更后，展示图文成果并开放预览与下载；依照清单复核成稿，渠道适配单独验收。",
        output: "成果文件 · 创作记录与后续适配说明",
        gate: false,
      },
    ],
    concepts: [
      {
        id: "clues",
        title: "关键线索，逐渐清晰",
        eyebrow: "方向 A · 探索与发现",
        description:
          "把查找资料表现为线索整理，让分散的关键词、文献与指南逐步建立关联。",
        scene:
          "医生在明亮桌前查阅资料；随着阅读展开，相关信息集中到一个清晰的资料窗口。",
        reason:
          "资料之间的关系可以自然延伸为长图文的章节推进，也适合用展开动效呈现发现过程。",
        tags: ["资料汇集", "明亮立体漫画", "逐步展开"],
      },
      {
        id: "mountain",
        title: "书山之间，有路可循",
        eyebrow: "方向 B · 探索与路径",
        description:
          "将庞杂资料具象为桌面的微缩书山，以路线连接相关资源，表达查询与获取的过程。",
        scene:
          "医生仍处在真实工作环境中，桌面上的文献形成微缩地形，路径逐段点亮资源入口。",
        reason:
          "主题明确，适合系列延展；需要让资料与查询始终成为重点，避免景物掩盖功能。",
        tags: ["微缩书山", "连续叙事", "系列延展"],
      },
      {
        id: "daily",
        title: "下一次讨论，准备就绪",
        eyebrow: "方向 C · 医生日常",
        description:
          "从医生熟悉的资料准备时刻切入，让查询功能体现在具体工作动作里。",
        scene:
          "从提出资料需求，到屏幕检索，再到桌面文献准备，三段场景共同组成一条清楚的阅读路径。",
        reason:
          "情境直接，便于欢迎消息与首次介绍中理解功能；以具体动作建立记忆点。",
        tags: ["工作场景", "清晰易读", "专业克制"],
      },
    ],
  },
  video: {
    name: "生成式视频",
    english: "MOTION STUDIO",
    description:
      "围绕大会开场的两个成片版本，串联创意选择、分镜确认、制作与交付。",
    starter:
      "为「领峰者之夜」大会准备开场动画，延续紫色星空、橙金光束与银色主题字。以已提供的两支成片为目标，分别展示版本 A 的光束转场与版本 B 的星光启幕，从需求、创意、分镜走到成片评审和交付。保留大会名称、副标题和原始视频内容。",
    promptExamples: [
      "演示「领峰者之夜」版本 A：光束转场，主题揭幕",
      "演示「领峰者之夜」版本 B：星光汇聚，盛典启幕",
      "对比两版大会开场动画，查看分镜与成片交付",
    ],
    stages: [
      {
        id: "brief",
        title: "明确大会开场任务",
        shortTitle: "需求解析",
        description:
          "围绕「领峰者之夜」大会，整理主题、使用场景、两版成片规格与必须保留的信息。",
        output: "大会任务卡 · 两版成片目标",
        gate: false,
      },
      {
        id: "reference",
        title: "整理主视觉与成片依据",
        shortTitle: "参考检索",
        description:
          "展示原片中的星空、光束与主题字，保留大会文案；从实际成片提取代表帧作为分镜依据。",
        output: "主视觉拆解 · 真实成片代表帧",
        gate: false,
      },
      {
        id: "concept",
        title: "选择开场动画版本",
        shortTitle: "创意概念",
        description:
          "对比光束转场与星光启幕两种叙事，确认本轮演示版本，再展开对应分镜与真实成片。",
        output: "版本选择 · 对应成片与叙事方向",
        gate: true,
      },
      {
        id: "design",
        title: "确认分镜与时间轴",
        shortTitle: "分镜方案",
        description:
          "依据所选原片展示四个叙事段落与代表帧，核对画面衔接、主题出现和结束方式。",
        output: "四段分镜 · 与原片对应的时间轴",
        gate: true,
      },
      {
        id: "production",
        title: "组织动态制作",
        shortTitle: "制作合成",
        description:
          "演示主视觉组织、镜头衔接与视听合成的协作过程，装配所选版本的完整本地原片。",
        output: "成片装配 · 原始画质与声音",
        gate: false,
      },
      {
        id: "review",
        title: "确认交付准备",
        shortTitle: "交付确认",
        description:
          "确认所选版本的交付对象与素材就绪状态，保留展示后复核项；完成全部流程后再呈现最终成片。",
        output: "所选版本交付准备 · 展示后检查清单",
        gate: true,
      },
      {
        id: "delivery",
        title: "展示并保存视频成果",
        shortTitle: "成果交付",
        description:
          "全部阶段完成且确认素材未变更后，开放最终成片、双版本对比与下载；保留另一版本的完整流程入口。",
        output: "所选原片 · 分镜与版本决策记录",
        gate: false,
      },
    ],
    concepts: [
      {
        id: "opening-a",
        title: "光束转场，主题揭幕",
        eyebrow: "版本 A · 场次衔接",
        description:
          "从讲者题卡切入橙金光束，展开大会主视觉，再衔接原片的英文披露页。",
        scene:
          "约 5.03 秒：讲者题卡 → 光束展开 →「领峰者之夜」主题揭幕 → 英文披露页。",
        reason:
          "展示大会画面之间的动态衔接。使用完整原片，片首与片尾的播放安排需结合现场顺序确认。",
        tags: ["场次衔接", "5.03 秒", "1080p"],
      },
      {
        id: "opening-b",
        title: "星光汇聚，盛典启幕",
        eyebrow: "版本 B · 主题开场",
        description:
          "从紫色星空开始，让橙金光束汇聚展开，银色主题字渐显并稳定落版。",
        scene:
          "约 6.08 秒：星空蓄势 → 光束汇聚 → 标题渐显 → 大会主视觉稳定落版。",
        reason:
          "开场叙事集中于大会主题，便于展示主视觉由静到动的层次，以及标题揭示后的停留节奏。",
        tags: ["主题开场", "6.08 秒", "720p"],
      },
    ],
  },
};

export const briefFacts: Array<{ label: string; value: string }> = [
  {
    label: "演示目标",
    value: "用已完成的成果，展示可理解、可决策、可回溯的创作流程",
  },
  { label: "三个产品", value: "生成式长图文 · 生成式视频 · 文献溯源" },
  { label: "交互方式", value: "一个 Agent 对话入口，三个关键确认节点" },
  { label: "品牌方向", value: "礼来红与柔和粉色为主，浅紫用于辅助层次" },
  { label: "运行方式", value: "仅在本地运行，成品由本地素材导入" },
  {
    label: "演示边界",
    value: "预设流程演示，不实时生成；医学检查不替代正式审批",
  },
];

export const seriesItems: Array<{ title: string; description: string }> = [
  { title: "一站式服务", description: "从分散的入口，到集中获取所需资源。" },
  { title: "前沿资讯", description: "让医生更便捷地接近资讯与专家解读。" },
  { title: "文献查询", description: "连接关键词、文献、指南与全文资源。" },
  { title: "临床研究", description: "梳理分散的研究内容，呈现重点与关联。" },
  { title: "用药指南", description: "通过查询与比对，提供专业参考支持。" },
];

export const demoDisclaimer =
  "本地 POC 演示 · 流程与对话为预设示例，成果由本地导入，不调用真实生成模型。";
export const reviewDisclaimer =
  "创作确认与演示检查不替代正式医学、品牌或发布审批。";
