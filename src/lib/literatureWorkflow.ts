import type { LiteratureCase, LiteratureSegment } from "../literature/types";

export const LITERATURE_STORE = "lilly-literature-session-v2";
export const literatureSteps = [
  { title: "确认输入", description: "锁定脚本版本与原始素材" },
  { title: "拆解主张", description: "保留原句，识别需要支持的表述" },
  { title: "文献匹配", description: "载入本地预置的来源与关联" },
  { title: "表达优化", description: "整理建议表达与修改理由" },
  { title: "结果复核", description: "确认交付范围与待核查项" },
  { title: "报告交付", description: "查看逐段对照与参考文献" },
];
export const evidenceStatusLabels = {
  supported: "有对应依据",
  partial: "部分支持",
  pending: "待核查",
  "not-needed": "无需引用",
};
export type LiteratureLog = { step: number; at: string; detail: string };
export interface LiteratureSession {
  schema: 2;
  caseId: string;
  sourceVersion: string;
  input: string;
  imageName: string;
  stage: number;
  completed: number[];
  confirmedInput: string | null;
  selected: number;
  runId: number;
  version: number;
  logs: LiteratureLog[];
}
export type LiteratureAction =
  | { type: "load"; case: LiteratureCase }
  | { type: "edit"; text: string; imageName?: string }
  | { type: "reset" }
  | { type: "select"; index: number }
  | { type: "parse" }
  | { type: "match" }
  | { type: "tick"; runId: number }
  | { type: "deliver" };
export const caseInput = (item: LiteratureCase) =>
  item.segments.map((segment) => segment.original).join("\n\n");
export function createLiteratureSession(
  item: LiteratureCase,
): LiteratureSession {
  return {
    schema: 2,
    caseId: item.id,
    sourceVersion: item.version,
    input: caseInput(item),
    imageName: "",
    stage: 0,
    completed: [],
    confirmedInput: null,
    selected: 0,
    runId: 0,
    version: 1,
    logs: [],
  };
}
export function isPresetInput(
  session: LiteratureSession,
  item: LiteratureCase,
) {
  return (
    session.caseId === item.id &&
    session.sourceVersion === item.version &&
    !session.imageName &&
    session.input === caseInput(item)
  );
}
export function validateLiteratureInput(text: string): string | null {
  if (!text.trim()) return "请先输入脚本或确认图片中的文字。";
  if (text.length > 40000) return "内容超过 40,000 字，请缩减后继续。";
  if (
    text
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean).length > 40
  )
    return "请将输入整理为 40 段以内。";
  return null;
}
export function getLiteratureSegments(
  session: LiteratureSession,
  item: LiteratureCase,
): LiteratureSegment[] {
  if (isPresetInput(session, item)) return item.segments;
  return session.input
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((text, index) => ({
      id: `custom-${index + 1}`,
      sourceNumber: String(index + 1),
      title: `自定义段落 ${index + 1}`,
      original: text.trim(),
      revised: text.trim(),
      reason: "自定义内容尚未建立对应证据，保留原文，等待人工整理。",
      status: "pending",
      claims: [text.trim()],
      keywords: [],
      evidence: [],
    }));
}
export function isLiteratureComplete(
  session: LiteratureSession,
  item: LiteratureCase,
) {
  return (
    session.caseId === item.id &&
    session.sourceVersion === item.version &&
    session.stage === 5 &&
    session.confirmedInput === session.input &&
    !validateLiteratureInput(session.input) &&
    [0, 1, 2, 3, 4, 5].every((step) => session.completed.includes(step))
  );
}
const at = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });
function clearProgress(session: LiteratureSession): LiteratureSession {
  return {
    ...session,
    stage: 0,
    completed: [],
    confirmedInput: null,
    selected: 0,
    runId: session.runId + 1,
    logs: [],
  };
}
export function transitionLiterature(
  session: LiteratureSession,
  action: LiteratureAction,
  item: LiteratureCase,
): LiteratureSession {
  if (action.type === "load")
    return {
      ...createLiteratureSession(action.case),
      version: session.version + 1,
      runId: session.runId + 1,
    };
  if (action.type === "reset")
    return { ...clearProgress(session), version: session.version + 1 };
  if (action.type === "edit")
    return {
      ...clearProgress(session),
      input: action.text,
      imageName: action.imageName ?? session.imageName,
      version: session.stage > 0 ? session.version + 1 : session.version,
    };
  if (action.type === "select")
    return {
      ...session,
      selected: Math.max(
        0,
        Math.min(action.index, getLiteratureSegments(session, item).length - 1),
      ),
    };
  if (session.caseId !== item.id || session.sourceVersion !== item.version)
    return session;
  if (
    action.type === "parse" &&
    session.stage === 0 &&
    !validateLiteratureInput(session.input)
  ) {
    return {
      ...session,
      stage: 1,
      completed: [0],
      selected: 0,
      logs: [
        {
          step: 0,
          at: at(),
          detail: `已确认 ${getLiteratureSegments(session, item).length} 段原文。${isPresetInput(session, item) ? "保留核心 POC 原始版本。" : "自定义输入，仅整理原文，不套用案例证据。"}`,
        },
      ],
    };
  }
  if (
    action.type === "match" &&
    session.stage === 1 &&
    !validateLiteratureInput(session.input) &&
    session.completed.includes(0)
  ) {
    return {
      ...session,
      stage: 2,
      completed: [0, 1],
      confirmedInput: session.input,
      runId: session.runId + 1,
      logs: [
        ...session.logs,
        {
          step: 1,
          at: at(),
          detail: "已确认段落与主张范围，开始本地模拟流程。",
        },
      ],
    };
  }
  const unchanged = session.confirmedInput === session.input;
  if (action.type === "tick" && action.runId === session.runId && unchanged) {
    if (
      session.stage === 2 &&
      [0, 1].every((step) => session.completed.includes(step))
    ) {
      return {
        ...session,
        stage: 3,
        completed: [0, 1, 2],
        logs: [
          ...session.logs,
          {
            step: 2,
            at: at(),
            detail: isPresetInput(session, item)
              ? item.research
                ? `已载入 ${item.research.performedAt} 联网检索并核对的 ${item.references.length} 条来源及逐段关联；本轮页面读取保存的结果。`
                : "已载入本地预置的文献候选及原句关联；未发起实时检索。"
              : "自定义内容没有预置证据，所有段落保留待核查。",
          },
        ],
      };
    }
    if (
      session.stage === 3 &&
      [0, 1, 2].every((step) => session.completed.includes(step))
    ) {
      return {
        ...session,
        stage: 4,
        completed: [0, 1, 2, 3],
        logs: [
          ...session.logs,
          {
            step: 3,
            at: at(),
            detail: isPresetInput(session, item)
              ? "已整理建议表达、修改理由与支持范围，等待确认交付。"
              : "保留原文，不输出未经准备的改写或引用。",
          },
        ],
      };
    }
  }
  if (
    action.type === "deliver" &&
    session.stage === 4 &&
    !validateLiteratureInput(session.input) &&
    unchanged &&
    [0, 1, 2, 3].every((step) => session.completed.includes(step))
  ) {
    return {
      ...session,
      stage: 5,
      completed: [0, 1, 2, 3, 4, 5],
      logs: [
        ...session.logs,
        {
          step: 4,
          at: at(),
          detail: "已确认报告包含待核查项；本次交付不代表医学审批通过。",
        },
        { step: 5, at: at(), detail: "流程完成，逐段结果与导出已解锁。" },
      ],
    };
  }
  return session;
}
export function restoreLiteratureSession(
  raw: string | null,
  cases: LiteratureCase[],
): LiteratureSession {
  const fallback = () => createLiteratureSession(cases[0]);
  try {
    const value = JSON.parse(raw || "null") as LiteratureSession | null;
    const item = cases.find((entry) => entry.id === value?.caseId);
    if (
      !value ||
      !item ||
      value.schema !== 2 ||
      value.sourceVersion !== item.version ||
      typeof value.input !== "string" ||
      value.input.length > 40000 ||
      typeof value.imageName !== "string" ||
      !Number.isInteger(value.stage) ||
      value.stage < 0 ||
      value.stage > 5 ||
      !Number.isInteger(value.runId) ||
      !Number.isInteger(value.version) ||
      !Array.isArray(value.completed) ||
      !value.completed.every((n) => Number.isInteger(n) && n >= 0 && n <= 5) ||
      !Array.isArray(value.logs) ||
      !value.logs.every(
        (log) =>
          log &&
          Number.isInteger(log.step) &&
          typeof log.at === "string" &&
          typeof log.detail === "string",
      )
    )
      return fallback();
    if (
      value.stage > 0 &&
      (validateLiteratureInput(value.input) ||
        !Array.from({ length: value.stage }, (_, index) => index).every(
          (step) => value.completed.includes(step),
        ))
    )
      return createLiteratureSession(item);
    const restored = {
      ...value,
      selected: Number.isInteger(value.selected)
        ? Math.max(
            0,
            Math.min(
              value.selected,
              getLiteratureSegments(value, item).length - 1,
            ),
          )
        : 0,
    };
    if ([2, 3].includes(value.stage))
      return {
        ...restored,
        stage: 1,
        completed: [0],
        confirmedInput: null,
        runId: value.runId + 1,
        logs: value.logs.filter((log) => log.step === 0),
      };
    if (value.stage === 5 && !isLiteratureComplete(restored, item))
      return createLiteratureSession(item);
    if (
      value.stage === 4 &&
      (value.confirmedInput !== value.input ||
        ![0, 1, 2, 3].every((step) => value.completed.includes(step)))
    )
      return createLiteratureSession(item);
    return restored;
  } catch {
    return fallback();
  }
}
export function createLiteratureReport(
  session: LiteratureSession,
  item: LiteratureCase,
) {
  if (!isLiteratureComplete(session, item)) return null;
  const segments = getLiteratureSegments(session, item);
  const used = new Set(
    segments.flatMap((segment) =>
      segment.evidence.map((link) => link.referenceId),
    ),
  );
  const preset = isPresetInput(session, item);
  return {
    title: preset ? item.title : "自定义内容证据整理",
    kind: preset ? item.kind : "custom",
    mode: preset ? "preset-local-demo" : "custom-awaiting-evidence",
    source: preset
      ? item.source
      : session.imageName
        ? `用户图片：${session.imageName}（人工转录）`
        : "用户输入脚本",
    version: session.version,
    input: session.input,
    segments,
    references: item.references.filter((reference) => used.has(reference.id)),
    research: preset ? item.research : undefined,
    logs: session.logs,
    note:
      preset && item.research
        ? `文献已于 ${item.research.performedAt} 根据固定脚本联网检索并核对，当前页面在本地展示保存的结果。核对层级见各来源，部分支持与证据缺口保留；不代表医学审批。`
        : "本地预置流程演示；书目核对不等于医学审批，待核查项保留。自定义输入未进行在线检索。",
  };
}
export type LiteratureReport = NonNullable<
  ReturnType<typeof createLiteratureReport>
>;
export function literatureReportMarkdown(report: LiteratureReport): string {
  return [
    `# ${report.title}`,
    `\n版本 V${report.version}\n\n${report.note}`,
    report.kind === "custom"
      ? "\n## 原文待整理"
      : report.kind === "h5"
        ? "\n## 修改建议汇总"
        : "\n## 完整建议稿",
    ...report.segments.map((segment) => `\n${segment.revised}`),
    "\n## 逐段对照",
    ...report.segments.flatMap((segment) => [
      `\n### ${segment.sourceNumber}. ${segment.title}`,
      `原文：${segment.original}`,
      `\n建议表达：${segment.revised}`,
      `\n修改理由：${segment.reason}`,
      `\n状态：${evidenceStatusLabels[segment.status]}`,
      ...segment.evidence.map((link) => {
        const reference = report.references.find(
          (entry) => entry.id === link.referenceId,
        );
        return `\n引用：${reference?.label || reference?.id || link.referenceId} · ${reference?.title || "待核查"}${link.claim ? `\n核对主张：${link.claim}` : ""}\n支持位置：${link.locator}\n支持范围：${link.support}\n边界：${link.boundary}`;
      }),
    ]),
    "\n## 参考文献",
    ...report.references.map(
      (reference, index) =>
        `\n[${reference.label && /^\d+$/.test(reference.label) ? reference.label : index + 1}] ${reference.authors}. ${reference.title}. ${reference.publication}\n${reference.doi ? `DOI: ${reference.doi}\n` : ""}${reference.pmid ? `PMID: ${reference.pmid}\n` : ""}${reference.url || "原文入口待核查"}\n核对记录：${reference.verificationNote}${reference.checkedSections?.length ? `\n核对位置：${reference.checkedSections.join("；")}` : ""}${reference.retrievedAt ? `\n检索日期：${reference.retrievedAt}` : ""}`,
    ),
    ...(report.research
      ? [
          "\n## 联网检索记录",
          `\n${report.research.performedAt} · ${report.research.summary}`,
          ...report.research.queries.map(
            (query) => `\n- ${query.source}：${query.query}`,
          ),
          ...report.research.limitations.map(
            (limitation) => `\n- 核对范围：${limitation}`,
          ),
        ]
      : []),
    "\n## 过程记录",
    ...report.logs.map(
      (log) => `\n${log.at} ${literatureSteps[log.step]?.title}：${log.detail}`,
    ),
  ].join("\n");
}
