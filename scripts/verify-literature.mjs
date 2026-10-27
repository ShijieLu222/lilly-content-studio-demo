import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}
const flow = await load("../src/lib/literatureWorkflow.ts");
const { scriptCase } = await load("../src/literature/scriptCase.ts");
const { h5Case } = await load("../src/literature/h5Case.ts");
const cases = [scriptCase, h5Case];
let checks = 0;
function check(value, label) {
  assert.ok(value, label);
  checks++;
}
function run(session, item) {
  for (const action of [{ type: "parse" }, { type: "match" }])
    session = flow.transitionLiterature(session, action, item);
  for (let n = 0; n < 2; n++)
    session = flow.transitionLiterature(
      session,
      { type: "tick", runId: session.runId },
      item,
    );
  return flow.transitionLiterature(session, { type: "deliver" }, item);
}
for (const item of cases) {
  let state = flow.createLiteratureSession(item);
  check(
    !flow.createLiteratureReport(state, item),
    `${item.id}: initial report locked`,
  );
  check(
    flow.transitionLiterature(state, { type: "deliver" }, item).stage === 0,
    "cannot skip delivery gate",
  );
  for (const action of [{ type: "parse" }, { type: "match" }]) {
    state = flow.transitionLiterature(state, action, item);
    check(
      !flow.createLiteratureReport(state, item),
      "early stage report locked",
    );
  }
  const staleRun = state.runId;
  for (let n = 0; n < 2; n++) {
    state = flow.transitionLiterature(
      state,
      { type: "tick", runId: state.runId },
      item,
    );
    check(
      !flow.createLiteratureReport(state, item),
      "processing and review results locked",
    );
  }
  check(state.stage === 4, "simulation stops at human confirmation");
  state = flow.transitionLiterature(state, { type: "deliver" }, item);
  const report = flow.createLiteratureReport(state, item);
  check(
    report?.segments.length === item.segments.length,
    "delivery reveals full result",
  );
  check(
    flow.isLiteratureComplete(
      flow.restoreLiteratureSession(JSON.stringify(state), cases),
      item,
    ),
    "valid completion survives reload",
  );
  check(
    !flow.isLiteratureComplete({ ...state, completed: [0, 1, 2, 3, 4] }, item),
    "missing completed stage blocks output",
  );
  check(
    !flow.isLiteratureComplete({ ...state, confirmedInput: "different" }, item),
    "changed input blocks output",
  );
  check(
    !flow.isLiteratureComplete(state, { ...item, version: "updated" }),
    "changed source version blocks stale output",
  );
  const reset = flow.transitionLiterature(state, { type: "reset" }, item);
  check(!flow.createLiteratureReport(reset, item), "reset clears result");
  check(
    flow.transitionLiterature(reset, { type: "tick", runId: staleRun }, item)
      .stage === 0,
    "stale timer cannot reopen result",
  );
  check(reset.input === state.input, "reset retains source");
  const edited = flow.transitionLiterature(
    state,
    { type: "edit", text: "这是全新的内容。" },
    item,
  );
  check(!flow.isPresetInput(edited, item), "edited input exits preset");
  const custom = flow.createLiteratureReport(run(edited, item), item);
  check(
    custom?.references.length === 0 &&
      custom.segments.every(
        (s) =>
          s.status === "pending" &&
          s.evidence.length === 0 &&
          s.revised === s.original,
      ),
    "custom input never inherits preset evidence or revisions",
  );
  const imageInput = flow.transitionLiterature(
    state,
    { type: "edit", text: flow.caseInput(item), imageName: "new-image.png" },
    item,
  );
  check(
    !flow.isPresetInput(imageInput, item),
    "image transcription does not impersonate preset",
  );
  const invalid = flow.restoreLiteratureSession(
    JSON.stringify({ ...state, completed: [] }),
    cases,
  );
  check(
    !flow.isLiteratureComplete(invalid, item),
    "corrupt completion cannot restore results",
  );
  let interrupted = flow.createLiteratureSession(item);
  interrupted = flow.transitionLiterature(interrupted, { type: "parse" }, item);
  interrupted = flow.transitionLiterature(interrupted, { type: "match" }, item);
  const restored = flow.restoreLiteratureSession(
    JSON.stringify(interrupted),
    cases,
  );
  check(
    restored.stage === 1 && !flow.createLiteratureReport(restored, item),
    "reload during processing returns to confirmation",
  );
  const refIds = new Set(item.references.map((r) => r.id));
  check(refIds.size === item.references.length, "reference IDs unique");
  for (const segment of item.segments) {
    check(
      Boolean(
        segment.original.trim() &&
        segment.revised.trim() &&
        segment.reason.trim(),
      ),
      "segment retains original, suggestion and rationale",
    );
    check(
      segment.evidence.every(
        (e) =>
          refIds.has(e.referenceId) && e.locator && e.support && e.boundary,
      ),
      "evidence links resolve and carry boundaries",
    );
    if (segment.status === "supported")
      check(
        segment.evidence.some(
          (e) => item.references.find((r) => r.id === e.referenceId)?.verified,
        ),
        "supported row has a checked source",
      );
    if (segment.region) {
      const r = segment.region;
      check(
        r.x >= 0 &&
          r.y >= 0 &&
          r.width > 0 &&
          r.height > 0 &&
          r.x + r.width <= 100.01 &&
          r.y + r.height <= 100.01,
        "H5 hotspot stays inside image",
      );
      check(
        item.images?.some((i) => i.id === segment.imageId),
        "H5 region resolves to original image",
      );
    }
  }
  for (const ref of item.references)
    check(
      !ref.url || /^https:\/\//.test(ref.url),
      "external source link uses HTTPS",
    );
  const md = flow.literatureReportMarkdown(report);
  check(
    md.includes("逐段对照") &&
      md.includes("参考文献") &&
      md.includes("过程记录"),
    "export includes evidence and process",
  );
}
let switched = flow.createLiteratureSession(scriptCase);
switched = flow.transitionLiterature(switched, { type: "parse" }, scriptCase);
switched = flow.transitionLiterature(switched, { type: "match" }, scriptCase);
const previousRun = switched.runId;
switched = flow.transitionLiterature(
  switched,
  { type: "load", case: h5Case },
  scriptCase,
);
check(
  flow.transitionLiterature(
    switched,
    { type: "tick", runId: previousRun },
    h5Case,
  ).stage === 0,
  "case switch invalidates previous timer",
);
check(
  scriptCase.segments.length === 13,
  "all 13 original script segments included",
);
check(h5Case.images.length === 3, "all 3 original H5 images included");
check(Boolean(flow.validateLiteratureInput("   ")), "empty input blocked");
check(
  Boolean(flow.validateLiteratureInput("x".repeat(40001))),
  "oversized input blocked",
);
check(
  Boolean(flow.validateLiteratureInput(Array(41).fill("x").join("\n\n"))),
  "too many paragraphs blocked",
);
for (const bad of [
  { stage: 1, completed: [0], input: "   " },
  { stage: 1, completed: [], input: flow.caseInput(scriptCase) },
  {
    stage: 4,
    completed: [0, 1, 2, 3],
    input: Array(41).fill("x").join("\n\n"),
  },
]) {
  const corrupt = {
    ...flow.createLiteratureSession(scriptCase),
    ...bad,
    confirmedInput: bad.input,
  };
  check(
    flow.restoreLiteratureSession(JSON.stringify(corrupt), cases).stage === 0,
    "damaged persisted progress returns safely to input",
  );
}
check(
  scriptCase.references.length === 11,
  "researched bibliography contains eleven real records",
);
check(
  scriptCase.segments
    .slice(1, 12)
    .every((segment) => segment.evidence.length > 0),
  "all eleven medical-claim paragraphs map to retrieved sources",
);
check(
  scriptCase.segments.reduce(
    (sum, segment) => sum + segment.evidence.length,
    0,
  ) === 28,
  "all twenty-eight claim mappings retained",
);
check(
  scriptCase.segments[9].evidence.filter(
    (link) => link.referenceId === "ning-nhc-obesity-2024",
  ).length === 4,
  "four clinical claims retain separate guideline locators",
);
check(scriptCase.research.queries.length > 0, "actual query history included");
for (const ref of scriptCase.references) {
  check(
    Boolean(
      ref.retrievedAt &&
      ref.verificationLevel &&
      ref.checkedSections?.length &&
      ref.url,
    ),
    "research provenance present",
  );
  if (ref.localUrl) {
    const pdf = await readFile(
      new URL("../public" + ref.localUrl, import.meta.url),
    );
    check(
      pdf.subarray(0, 4).toString() === "%PDF" && pdf.length > 100000,
      "local official PDF is available",
    );
  }
}
const researchedReport = flow.createLiteratureReport(
  run(flow.createLiteratureSession(scriptCase), scriptCase),
  scriptCase,
);
check(
  researchedReport.research.performedAt === "2026-10-27",
  "report preserves actual research date",
);
check(
  flow.literatureReportMarkdown(researchedReport).includes("联网检索记录"),
  "report export includes source search provenance",
);
const ris = await readFile(
  new URL(
    "../public/literature/references/ning-references.ris",
    import.meta.url,
  ),
  "utf8",
);
check(
  (ris.match(/^TY  - /gm) || []).length === 11,
  "RIS exports all eleven references",
);
check(
  scriptCase.references
    .filter((ref) => ref.doi)
    .every((ref) => ris.includes("DO  - " + ref.doi)),
  "RIS identifiers match researched bibliography",
);
console.log(`Literature workflow: ${checks} checks passed.`);
