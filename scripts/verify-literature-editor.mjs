import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

async function compile(file, replacements = {}) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  let javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) {
    javascript = javascript.replaceAll(
      JSON.stringify(from),
      JSON.stringify(to),
    );
  }
  return `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`;
}

const citationModule = await compile("../src/lib/literatureCitations.ts");
const { normalizeInlineCitations, proposedCitedText, citedReferenceNumbers } =
  await import(citationModule);
const { scriptCase } = await import(
  await compile("../src/literature/scriptCase.ts")
);
const { h5Case } = await import(await compile("../src/literature/h5Case.ts"));
const { createLiteratureDocx } = await import(
  await compile("../src/lib/literatureDocx.ts", {
    "./literatureCitations": citationModule,
    docx: import.meta.resolve("docx"),
  })
);

const numberFor = (id) =>
  String(scriptCase.references.findIndex((ref) => ref.id === id) + 1);
for (const segment of scriptCase.segments) {
  const proposed = proposedCitedText(segment, numberFor);
  assert.equal(
    proposed.replace(/\[[\d,]+\]/g, ""),
    segment.revised,
    `${segment.id}: wording is unchanged`,
  );
  assert.deepEqual(
    citedReferenceNumbers(proposed),
    new Set(segment.evidence.map((link) => numberFor(link.referenceId))),
    `${segment.id}: all and only existing evidence is cited`,
  );
}
const plateau = proposedCitedText(scriptCase.segments[1], numberFor);
assert.match(plateau, /有所回升。\[\d+,\d+\]出现这些情况/);
assert.ok(
  !plateau.endsWith("]"),
  "references attach to the factual sentence, before the closing reassurance",
);
const unknown = { ...scriptCase.segments[1], id: "custom-text" };
assert.equal(
  proposedCitedText(unknown, numberFor),
  unknown.revised,
  "custom paragraphs do not inherit automatic placements",
);
for (const segment of h5Case.segments) {
  assert.deepEqual(
    citedReferenceNumbers(normalizeInlineCitations(segment.original)),
    citedReferenceNumbers(segment.original),
    "H5 keeps its original source numbers",
  );
}
assert.equal(
  normalizeInlineCitations("甲[3]。乙[4]。"),
  "甲。[3]乙。[4]",
  "citations do not move between claims",
);
assert.equal(
  normalizeInlineCitations("核对文献[10]全文。"),
  "核对文献[10]全文。",
  "in-prose reference mentions stay in place",
);

const paragraphs = [
  "已应用的修改结果。[1]\n手动编辑也会保留。",
  "未应用建议时保留原文。",
];
const references = [
  {
    number: "1",
    text: "[1] 示例文献. https://example.com/reference",
    url: "https://example.com/reference",
  },
];
const docx = await createLiteratureDocx(
  "H5 当前图片的文字",
  paragraphs,
  references,
);
const temporary = await mkdtemp(join(tmpdir(), "lilly-literature-export-"));
try {
  const path = join(temporary, "result.docx");
  await writeFile(path, Buffer.from(await docx.arrayBuffer()));
  const xml = execFileSync("unzip", ["-p", path, "word/document.xml"], {
    encoding: "utf8",
  });
  const relationships = execFileSync(
    "unzip",
    ["-p", path, "word/_rels/document.xml.rels"],
    { encoding: "utf8" },
  );
  const entries = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" });
  for (const text of [
    "已应用的修改结果。",
    "手动编辑也会保留。",
    "未应用建议时保留原文。",
    "参考文献",
    "示例文献",
  ])
    assert.ok(xml.includes(text), `DOCX contains ${text}`);
  assert.match(
    xml,
    /w:vertAlign w:val="superscript"/,
    "DOCX retains small superscript citations",
  );
  assert.ok(
    relationships.includes("https://example.com/reference"),
    "DOCX retains source links",
  );
  assert.doesNotMatch(
    xml,
    /<w:(?:ins|del|strike|highlight)\b/,
    "DOCX has no revision markup or deleted text",
  );
  assert.ok(
    !entries.includes("word/media/"),
    "H5 DOCX exports text, without image attachments",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  "Literature editor checks passed: sentence citations, preserved source mapping, clean text-only DOCX and linked bibliography.",
);
