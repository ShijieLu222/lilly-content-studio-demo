import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import LiteratureStudio from "./LiteratureStudio";
import LiteratureIntake, {
  LiteratureLoading,
  type LiteratureSubmission,
} from "./LiteratureIntake";
import {
  buildSubmissionCase,
  isExampleSubmission,
  loadLatestLiteratureSubmission,
  saveLiteratureSubmission,
  type SavedLiteratureSubmission,
} from "../lib/literatureSubmission";

export default function LiteratureWorkspace({
  initialText,
  onConsumed,
}: {
  initialText?: string;
  onConsumed?: () => void;
}) {
  const [kind, setKind] = useState<"script" | "h5">("script");
  const [phase, setPhase] = useState<"intake" | "loading" | "result">("intake");
  const [intakeKey, setIntakeKey] = useState(0);
  const [seedText, setSeedText] = useState(initialText || "");
  const [step, setStep] = useState(0);
  const [active, setActive] = useState<SavedLiteratureSubmission | null>(null);
  const [latest, setLatest] = useState<SavedLiteratureSubmission | null>(null);
  const [notice, setNotice] = useState("");
  const consumed = useRef<string | undefined>(undefined);
  const currentRun = useRef(0);

  useEffect(() => {
    let mounted = true;
    loadLatestLiteratureSubmission()
      .then((saved) => {
        if (mounted) setLatest((current) => current ?? saved);
      })
      .catch(() => {
        if (mounted) setNotice("暂时无法读取上次文稿，可继续新建。");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialText === undefined) {
      consumed.current = undefined;
      return;
    }
    if (consumed.current === initialText) return;
    consumed.current = initialText;
    currentRun.current++;
    setSeedText(initialText);
    setKind("script");
    setPhase("intake");
    setIntakeKey((key) => key + 1);
    onConsumed?.();
  }, [initialText, onConsumed]);

  function newTask(nextKind: "script" | "h5") {
    currentRun.current++;
    setKind(nextKind);
    setPhase("intake");
    setSeedText("");
    setIntakeKey((key) => key + 1);
    setNotice("");
  }

  function start(submission: LiteratureSubmission) {
    const next = { id: crypto.randomUUID(), submission, createdAt: Date.now() };
    try {
      buildSubmissionCase(submission, next.id);
      currentRun.current++;
      setActive(next);
      setKind(submission.kind);
      setStep(0);
      setNotice("");
      setPhase("loading");
    } catch {
      setNotice("内容不完整，请检查文字和图片后重新提交。");
    }
  }

  useEffect(() => {
    if (phase !== "loading" || !active) return;
    const revision = currentRun.current;
    const timer = window.setTimeout(() => {
      if (revision !== currentRun.current) return;
      if (step < 2) {
        setStep(step + 1);
        return;
      }
      setLatest(active);
      setPhase("result");
      saveLiteratureSubmission(active).catch(() => {
        if (revision === currentRun.current)
          setNotice(
            "本次结果可继续编辑，但内容未能保存到浏览器，请保留原始文件并导出文稿。",
          );
      });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [phase, active, step]);

  function resume() {
    if (!latest) return;
    currentRun.current++;
    setActive(latest);
    setKind(latest.submission.kind);
    setPhase("result");
  }

  return (
    <>
      {phase === "result" && active ? (
        <LiteratureStudio
          key={active.id}
          item={buildSubmissionCase(active.submission, active.id)}
          runId={active.id}
          isExample={isExampleSubmission(active.submission)}
          onNew={newTask}
        />
      ) : (
        <div hidden={phase !== "intake"}>
          <LiteratureIntake
            key={intakeKey}
            kind={kind}
            initialText={seedText}
            onKindChange={newTask}
            onStart={start}
            resumeLabel={latest?.submission.title}
            onResume={latest ? resume : undefined}
          />
        </div>
      )}
      {phase === "loading" && active && (
        <LiteratureLoading
          submission={active.submission}
          step={step}
          onCancel={() => {
            currentRun.current++;
            setPhase("intake");
          }}
        />
      )}
      {notice && (
        <div className="le-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
