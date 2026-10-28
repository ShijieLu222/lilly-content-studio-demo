import type { LiteratureSegment } from "../literature/types";

export type RevisionKind =
  "unchanged" | "deletion" | "compliance" | "addition" | "polish";
export type RevisionRun = { text: string; kind: RevisionKind };

export function revisionKind(segment: LiteratureSegment): RevisionKind {
  if (segment.status === "not-needed") return "polish";
  if (/补齐|补充调查|补充.*范围|名称、年份/.test(segment.reason))
    return "addition";
  return "compliance";
}

// Sentence-sized changes remain readable in a Chinese document; common prefix
// and suffix are kept outside the colored replacement, including punctuation.
export function revisionRuns(
  original: string,
  revised: string,
  kind: RevisionKind,
): RevisionRun[] {
  if (original === revised) return [{ text: revised, kind: "unchanged" }];
  const before = Array.from(original);
  const after = Array.from(revised);
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - end - 1] === after[after.length - end - 1]
  )
    end++;
  const runs: RevisionRun[] = [];
  if (start)
    runs.push({ text: before.slice(0, start).join(""), kind: "unchanged" });
  if (before.length - end > start)
    runs.push({
      text: before.slice(start, before.length - end).join(""),
      kind: "deletion",
    });
  if (after.length - end > start)
    runs.push({ text: after.slice(start, after.length - end).join(""), kind });
  if (end)
    runs.push({
      text: after.slice(after.length - end).join(""),
      kind: "unchanged",
    });
  return runs.flatMap((run): RevisionRun[] => {
    if (run.kind === "unchanged" || run.kind === "deletion") return [run];
    return run.text
      .split(/(\[\d+(?:[,，\s]+\d+)*\])/g)
      .filter(Boolean)
      .map((text) => ({
        text,
        kind: /^\[\d+(?:[,，\s]+\d+)*\]$/.test(text) ? "addition" : run.kind,
      }));
  });
}

function escapeRtf(text: string): string {
  // RTF uses signed UTF-16 code units, so astral characters need both surrogates.
  let output = "";
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    const char = text[index];
    if (char === "\\" || char === "{" || char === "}") output += `\\${char}`;
    else if (char === "\n") output += "\\line ";
    else if (char === "\r") continue;
    else if (code >= 32 && code < 127) output += char;
    else if (char === "\t") output += "\\tab ";
    else output += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return output;
}

export type RtfReference = string | { text: string; url: string };

function referenceRtf(reference: RtfReference): string {
  if (typeof reference === "string") return escapeRtf(reference);
  const text = escapeRtf(reference.text);
  try {
    if (
      !/^https?:\/\//i.test(reference.url) ||
      /[\u0000-\u001f\u007f]/.test(reference.url)
    )
      return text;
    const url = new URL(reference.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return text;
    // Encode characters that can delimit an RTF field instruction, then escape
    // the RTF syntax itself. The displayed citation remains unchanged.
    const href = escapeRtf(
      url.href.replace(/["\\{}]/g, (char) =>
        `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    );
    return `{\\field{\\*\\fldinst HYPERLINK "${href}"}{\\fldrslt{\\cf5\\ul ${text}}}}`;
  } catch {
    return text;
  }
}

export function createEditableRtf(
  title: string,
  paragraphs: RevisionRun[][],
  references: RtfReference[] = [],
  annotated = false,
): string {
  const colors: Record<RevisionKind, number> = {
    unchanged: 1,
    deletion: 2,
    compliance: 3,
    addition: 4,
    polish: 5,
  };
  const body = paragraphs
    .map(
      (runs) =>
        runs
          .map(
            (run) =>
              `{\\cf${colors[run.kind]}${run.kind === "deletion" ? "\\strike" : ""} ${escapeRtf(run.text)}}`,
          )
          .join("") + "\\par\\par\n",
    )
    .join("");
  const legend = annotated
    ? `{\\cf2 ${escapeRtf("红色删除")}}  {\\cf3 ${escapeRtf("橙色合规调整")}}  {\\cf4 ${escapeRtf("绿色补充")}}  {\\cf5 ${escapeRtf("蓝色润色 / 手动修改")}}\\par\\par\n`
    : "";
  const refs = references.length
    ? `\\b ${escapeRtf("参考文献")}\\b0\\par\n${references.map((ref) => referenceRtf(ref) + "\\par\\par\n").join("")}`
    : "";
  return (
    "{\\rtf1\\ansi\\deff0\\uc1\n{\\fonttbl{\\f0\\fnil Arial;}}\n{\\colortbl;\\red48\\green45\\blue51;\\red183\\green55\\blue64;\\red151\\green91\\blue12;\\red28\\green117\\blue78;\\red54\\green101\\blue170;}\n\\f0\\fs24\\sl360\\slmult1\n" +
    `\\b\\fs32 ${escapeRtf(title)}\\b0\\fs24\\par\\par\n` +
    legend +
    body +
    refs +
    "}"
  );
}
