import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temporary = await mkdtemp(join(tmpdir(), "lilly-video-workflow-"));
let checks = 0;
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
}
function same(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  checks++;
}

try {
  // Compile the real modules, including their local imports, without a browser
  // or an IndexedDB mock. Storage normalization itself is a pure operation.
  const modules = [
    "videoPromptWorkflow",
    "videoChatStore",
    "videoChatPreset",
    "projectTrash",
  ];
  for (const name of modules) {
    const source = await readFile(
      new URL(`../src/lib/${name}.ts`, import.meta.url),
      "utf8",
    );
    let compiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;
    for (const dependency of modules) {
      compiled = compiled.replaceAll(
        JSON.stringify(`./${dependency}`),
        JSON.stringify(`./${dependency}.mjs`),
      );
    }
    await writeFile(join(temporary, `${name}.mjs`), compiled);
  }
  const flow = await import(
    pathToFileURL(join(temporary, "videoPromptWorkflow.mjs")).href
  );
  const { normalizeVideoTurnWorkflow } = await import(
    pathToFileURL(join(temporary, "videoChatStore.mjs")).href
  );
  const initial = flow.createVideoPromptWorkflow();
  same(
    initial,
    {
      version: 1,
      step: 0,
      reachedStep: 0,
      structure: "balanced",
      motion: "layered",
      transition: "halo",
      audio: "music",
      notes: "",
    },
    "new workflows begin with the documented demo defaults",
  );
  check(flow.isVideoPromptWorkflow(initial), "default workflow is valid");
  check(
    !flow.canConfirmVideoPromptWorkflow(initial),
    "cannot generate before reviewing the steps",
  );
  const skipped = flow.updateVideoPromptWorkflow(initial, { step: 3 });
  check(
    skipped.step !== 3 && skipped.reachedStep !== 3,
    "navigation cannot jump over unreviewed steps",
  );

  let complete = initial;
  for (const step of [1, 2, 3]) {
    complete = flow.updateVideoPromptWorkflow(complete, { step });
    same(complete.step, step, "adjacent forward navigation advances");
    same(complete.reachedStep, step, "completed navigation is persisted");
  }
  check(
    flow.canConfirmVideoPromptWorkflow(complete),
    "complete automatic prompt can be confirmed",
  );
  const manual = flow.updateVideoPromptWorkflow(complete, {
    promptOverride: "这是用户手动确认的完整提示词。",
  });
  const back = flow.updateVideoPromptWorkflow(manual, { step: 1 });
  same(
    back.promptOverride,
    manual.promptOverride,
    "back navigation retains manual prompt edits",
  );
  same(back.reachedStep, 3, "back navigation retains completed progress");
  check(
    !flow.canConfirmVideoPromptWorkflow(back),
    "generation stays gated outside the final review step",
  );
  const returned = flow.updateVideoPromptWorkflow(back, { step: 3 });
  same(
    returned.promptOverride,
    manual.promptOverride,
    "returning to a reached step retains manual prompt",
  );
  check(
    flow.canConfirmVideoPromptWorkflow(returned),
    "a previously reached final step can be confirmed",
  );
  for (const patch of [
    { structure: "guide" },
    { motion: "gentle" },
    { transition: "dissolve" },
    { audio: "silent" },
    { notes: "结尾多停留半秒" },
  ]) {
    const updated = flow.updateVideoPromptWorkflow(manual, patch);
    same(
      updated.promptOverride,
      undefined,
      "changing a production choice invalidates stale manual prompt",
    );
    check(flow.isVideoPromptWorkflow(updated), "choice changes remain valid");
  }
  same(
    flow.updateVideoPromptWorkflow(manual, { motion: manual.motion })
      .promptOverride,
    manual.promptOverride,
    "selecting the same value does not discard manual text",
  );
  for (const promptOverride of ["", "   ", "x".repeat(8001)]) {
    check(
      !flow.canConfirmVideoPromptWorkflow({ ...complete, promptOverride }),
      "blank or excessive manual prompts cannot be confirmed",
    );
  }
  check(
    flow.canConfirmVideoPromptWorkflow({
      ...complete,
      promptOverride: "x".repeat(8000),
    }),
    "manual prompt length limit includes 8,000 characters",
  );
  for (const invalid of [
    null,
    [],
    { ...initial, version: 2 },
    { ...initial, step: -1 },
    { ...initial, step: 4 },
    { ...initial, reachedStep: 1.5 },
    { ...initial, step: 2, reachedStep: 1 },
    { ...initial, structure: "unknown" },
    { ...initial, motion: "unknown" },
    { ...initial, transition: "unknown" },
    { ...initial, audio: "unknown" },
    { ...initial, notes: "x".repeat(601) },
    { ...initial, promptOverride: 42 },
    { ...initial, promptOverride: "x".repeat(8001) },
  ]) {
    check(
      !flow.isVideoPromptWorkflow(invalid),
      "malformed persisted workflow is rejected",
    );
  }

  const names = [
    "肥胖诊疗路径 · 主题封面.png",
    "诊疗现状 · 数据页面.png",
    "指南探索 · 移动页面.png",
  ];
  const baseTurn = {
    id: "verification-turn",
    prompt: "把这三张图做成一条视频。",
    duration: 10,
    resolution: "1080p",
    references: names.map((name, index) => ({
      id: String(index),
      name,
      kind: "image",
      blob: new Blob(["reference"], { type: "image/png" }),
    })),
    status: "ready",
    sample: "client-final",
    createdAt: "2026-10-29T00:00:00.000Z",
  };
  const demo = flow.getVideoWorkflowContext(baseTurn);
  check(
    demo.isDemo && demo.referenceCount === 3,
    "three known images enable the matching demo plan",
  );
  same(
    demo.prompt,
    baseTurn.prompt,
    "the original user request remains part of the context",
  );

  for (const duration of Array.from({ length: 11 }, (_, index) => index + 5)) {
    for (const structure of ["balanced", "guide"]) {
      const scenes = flow.getVideoWorkflowScenes(
        { ...demo, duration },
        { ...complete, structure },
      );
      same(scenes.length, 3, "the three-image example has three scenes");
      same(scenes[0].start, 0, "the first scene begins at zero");
      same(
        scenes[2].end,
        duration,
        "the scene plan ends at the requested duration",
      );
      check(
        new Set(scenes.map((scene) => scene.id)).size === 3,
        "scene identifiers are unique",
      );
      for (let index = 0; index < scenes.length; index++) {
        const scene = scenes[index];
        check(
          Number.isFinite(scene.start) &&
            Number.isFinite(scene.end) &&
            scene.end > scene.start,
          "each scene has a positive finite duration",
        );
        check(
          Boolean(scene.title && scene.sourceLabel && scene.action),
          "each scene explains its material and concrete action",
        );
        if (index)
          same(
            scene.start,
            scenes[index - 1].end,
            "scene timing has no overlap or gaps",
          );
      }
    }
  }
  same(
    flow
      .getVideoWorkflowScenes(demo, complete)
      .map(({ start, end }) => [start, end]),
    [
      [0, 3],
      [3, 7],
      [7, 10],
    ],
    "10-second balanced scene allocation is 3/4/3",
  );
  same(
    flow
      .getVideoWorkflowScenes(demo, { ...complete, structure: "guide" })
      .map(({ start, end }) => [start, end]),
    [
      [0, 2],
      [2, 6],
      [6, 10],
    ],
    "10-second guide scene allocation is 2/4/4",
  );
  const defaultPrompt = flow.buildVideoPrompt(demo, complete);
  check(
    defaultPrompt.includes(baseTurn.prompt),
    "generated prompt includes the user's brief",
  );
  check(
    defaultPrompt.includes("1080p") && defaultPrompt.includes("10"),
    "generated prompt includes requested output settings",
  );
  for (const patch of [
    { structure: "guide" },
    { motion: "gentle" },
    { transition: "dissolve" },
    { audio: "silent" },
    { notes: "最后一幕保留标题，背景不要闪烁。" },
  ]) {
    check(
      flow.buildVideoPrompt(demo, { ...complete, ...patch }) !== defaultPrompt,
      "each production choice changes the resulting prompt",
    );
  }
  check(
    flow
      .buildVideoPrompt(demo, {
        ...complete,
        notes: "最后一幕保留标题，背景不要闪烁。",
      })
      .includes("最后一幕保留标题，背景不要闪烁。"),
    "custom production notes are carried into the generation prompt",
  );
  for (const references of [
    [],
    baseTurn.references.slice(0, 2),
    [{ ...baseTurn.references[0], name: "咖啡杯.png" }],
  ]) {
    const context = flow.getVideoWorkflowContext({
      ...baseTurn,
      prompt: "制作一条咖啡新品短片，突出杯身标志。",
      references,
    });
    check(
      !context.isDemo,
      "custom or incomplete references do not inherit the medical example",
    );
    const prompt = flow.buildVideoPrompt(context, complete);
    check(
      prompt.includes("制作一条咖啡新品短片，突出杯身标志。"),
      "custom request is preserved",
    );
    check(
      !/肥胖|诊疗|指南页|手机从右下|41%|9%/.test(prompt),
      "custom content never receives example-specific claims or phone scene",
    );
  }

  const legacy = {
    ...baseTurn,
    answers: { rhythm: "gentle", emphasis: "guide" },
  };
  const migrated = flow.createVideoPromptWorkflow(legacy.answers);
  same(
    migrated.motion,
    "gentle",
    "legacy rhythm maps to the corresponding concrete motion",
  );
  same(migrated.structure, "guide", "legacy emphasis maps to guide structure");
  const untouchedLegacy = normalizeVideoTurnWorkflow(legacy);
  for (const key of [
    "id",
    "prompt",
    "duration",
    "resolution",
    "answers",
    "status",
    "references",
  ])
    same(
      untouchedLegacy[key],
      legacy[key],
      "normalization retains existing history",
    );
  const saved = {
    ...baseTurn,
    workflow: returned,
    generationPrompt: "冻结的生成提示词，不随后续选项变化。",
  };
  const normalized = normalizeVideoTurnWorkflow(saved);
  same(
    normalized.workflow,
    returned,
    "valid persisted step and manual text survive normalization",
  );
  same(
    normalized.generationPrompt,
    saved.generationPrompt,
    "confirmed generation prompt remains frozen",
  );
  for (const broken of [
    { ...baseTurn, workflow: { ...initial, motion: "broken" } },
    { ...baseTurn, workflow: null, generationPrompt: 42 },
    { ...baseTurn, workflow: { step: 3 }, generationPrompt: "x".repeat(8001) },
  ]) {
    const recovered = normalizeVideoTurnWorkflow(broken);
    same(
      recovered.id,
      baseTurn.id,
      "corrupt workflow must not discard the historical turn",
    );
    same(
      recovered.prompt,
      baseTurn.prompt,
      "corrupt workflow must not discard the original request",
    );
    check(
      recovered.workflow === undefined ||
        flow.isVideoPromptWorkflow(recovered.workflow),
      "invalid workflow is removed or safely replaced",
    );
    check(
      recovered.generationPrompt === undefined ||
        (typeof recovered.generationPrompt === "string" &&
          recovered.generationPrompt.length <= 8000),
      "invalid frozen prompt is removed",
    );
  }
  const reloaded = JSON.parse(JSON.stringify(returned));
  check(
    flow.isVideoPromptWorkflow(reloaded) &&
      flow.canConfirmVideoPromptWorkflow(reloaded),
    "plain persisted workflow restores to a confirmable final review",
  );
  same(
    reloaded.promptOverride,
    returned.promptOverride,
    "manual edits survive serialization",
  );
  console.log(`Video prompt workflow: ${checks} checks passed.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
