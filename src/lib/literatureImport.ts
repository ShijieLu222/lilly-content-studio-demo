import type { Worker } from "tesseract.js";

export type ImageTextProgress = {
  phase: string;
  progress?: number;
};

function aborted() {
  return new DOMException("解析已取消。", "AbortError");
}

export function waitForTextPreview(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const cancel = () => {
      window.clearTimeout(timer);
      reject(aborted());
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function readLiteratureDocument(file: File): Promise<string> {
  const word = /\.docx$/i.test(file.name);
  if (/\.doc$/i.test(file.name))
    throw new Error("旧版 .doc 文件请先在 Word 中另存为 .docx，再上传。");
  if (!word && !/\.txt$/i.test(file.name))
    throw new Error(
      "请上传 Word（.docx）或 UTF-8 TXT 文件，也可以直接粘贴脚本。",
    );
  const limit = word ? 10 : 2;
  if (!file.size || file.size > limit * 1024 * 1024)
    throw new Error(
      `请选择 ${limit} MB 以内的非空 ${word ? "Word" : "TXT"} 文件。`,
    );
  if (!word) {
    const text = await file.text();
    if (text.includes("\0") || text.includes("\uFFFD"))
      throw new Error("文件编码无法识别，请另存为 UTF-8 TXT，或直接粘贴文字。");
    return text;
  }
  let result;
  try {
    const [mammoth, arrayBuffer] = await Promise.all([
      import("mammoth"),
      file.arrayBuffer(),
    ]);
    // Extract text only: document links, images, and embedded HTML are not rendered.
    result = await mammoth.extractRawText({ arrayBuffer });
  } catch {
    throw new Error(
      "无法读取这份 Word 文件。请确认文件完整且未加密，另存为 .docx 后重试。",
    );
  }
  if (!result.value.trim())
    throw new Error(
      "这份 Word 文件中没有可读取的文字，请粘贴正文或上传含文字的 .docx 文件。",
    );
  return result.value.replace(/\r\n?/g, "\n").trim();
}

export async function recognizeImageText(
  image: string,
  signal: AbortSignal,
  onProgress: (value: ImageTextProgress) => void,
): Promise<string> {
  if (signal.aborted) throw aborted();
  let worker: Worker | undefined;
  let finished = false;
  let rejectTask: (error: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    rejectTask = reject;
  });
  const cancel = () => rejectTask(aborted());
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = window.setTimeout(
    () =>
      rejectTask(
        new Error("文字解析超时，请重新上传，或手动补充这张图的文字。"),
      ),
    90000,
  );
  const report = (phase: string, progress?: number) => {
    if (!finished && !signal.aborted) onProgress({ phase, progress });
  };
  const work = async () => {
    report("准备文字识别");
    const { createWorker, OEM, PSM } = await import("tesseract.js");
    if (finished || signal.aborted) throw aborted();
    const created = await createWorker(["chi_sim", "eng"], OEM.LSTM_ONLY, {
      workerPath: "/assets/ocr/worker.min.js",
      corePath: "/assets/ocr/core",
      langPath: "/assets/ocr/lang",
      logger: ({ status, progress }) => {
        if (status === "recognizing text") report("识别图片中的文字", progress);
        else if (status === "loading language traineddata")
          report("载入中英文识别资源", progress);
        else if (status === "loading tesseract core")
          report("载入文字识别引擎");
        else if (
          status === "initializing api" ||
          status === "initializing tesseract"
        )
          report("准备图片解析");
      },
      errorHandler: () =>
        rejectTask(
          new Error("文字识别暂时不可用，请重新上传，或手动补充文字。"),
        ),
    });
    worker = created;
    if (finished || signal.aborted) {
      await created.terminate();
      throw aborted();
    }
    await created.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const result = await created.recognize(image);
    const text = result.data.text.replace(/\r\n?/g, "\n").trim();
    if (!text)
      throw new Error("未识别到清晰文字，请上传更清晰的图片，或手动补充内容。");
    return text;
  };
  try {
    return await Promise.race([work(), interrupted]);
  } finally {
    finished = true;
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
    if (worker) void worker.terminate().catch(() => {});
  }
}
