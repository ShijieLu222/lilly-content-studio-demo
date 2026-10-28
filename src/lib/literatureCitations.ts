import type { LiteratureSegment } from "../literature/types";

const citationPattern = /\[\d+(?:[,，\s]+\d+)*\]/g;

// Keep each source attached to its existing claim. Only move a marker across
// adjacent sentence punctuation; never relocate a citation to another sentence.
export function normalizeInlineCitations(text: string): string {
  return text
    .replace(/(\[\d+(?:[,，\s]+\d+)*\])([。！？；])/g, "$2$1")
    .replace(/([。！？；])[^\S\n]+(?=\[\d)/g, "$1");
}

export function splitCitationText(text: string) {
  const normalized = normalizeInlineCitations(text);
  return normalized
    .split(/(\[\d+(?:[,，\s]+\d+)*\])/g)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      numbers: /^\[\d+(?:[,，\s]+\d+)*\]$/.test(part)
        ? part.slice(1, -1).split(/[,，\s]+/)
        : undefined,
    }));
}

export function citedReferenceNumbers(text: string): Set<string> {
  return new Set(
    [...text.matchAll(citationPattern)].flatMap((match) =>
      match[0].slice(1, -1).split(/[,，\s]+/),
    ),
  );
}

// These exact anchors are the reviewed claim sentences in the bundled script.
// Source IDs still come from that segment's evidence links. An unknown or
// changed sentence receives no automatically inferred citation placement.
const scriptClaimAnchors: Record<string, string> = {
  "ning-02": "减下来的体重，后来又有所回升。",
  "ning-03": "具体原因仍需结合饮食、活动和健康状况评估。",
  "ning-04": "研究观察到了静息能量消耗的适应性下降。",
  "ning-05": "在初次减重一年后仍可观察到。",
  "ning-06": "也需要关注脂肪量、肌肉力量和身体功能的变化。",
  "ning-07": "还需要结合体成分、力量和相关健康指标评估。",
  "ning-08": "具体安排需结合个人情况。",
  "ning-09": "是判断中心性肥胖的腰围界值。",
  "ning-10": "与阻塞性睡眠呼吸暂停、血糖异常和心血管疾病等风险相关。",
  "ning-11": "避免盲目采取极端做法。",
  "ning-12": "是否需要药物等治疗，应依据适应证和个体评估决定。",
};

export function proposedCitedText(
  segment: LiteratureSegment,
  refNumber: (id: string) => string,
): string {
  const text = normalizeInlineCitations(segment.revised);
  const anchor = scriptClaimAnchors[segment.id];
  if (!anchor || !text.includes(anchor)) return text;
  const numbers = [
    ...new Set(segment.evidence.map((link) => refNumber(link.referenceId))),
  ];
  if (!numbers.length) return text;
  return text.replace(anchor, `${anchor}[${numbers.join(",")}]`);
}
