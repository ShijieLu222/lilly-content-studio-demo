import { useEffect, useRef, useState } from "react";
import { FileImage, LoaderCircle, X } from "lucide-react";
import ArticleIntake, {
  ArticleLoading,
  type ArticleInput,
} from "./ArticleIntake";
import ArticleResults from "./ArticleResults";
import {
  createArticleDraft,
  loadArticleDraft,
  saveArticleDraft,
  type ArticleDraft,
} from "../lib/articleWorkspace";
import { assetSlots, type Asset } from "../lib/assets";

export default function ArticleWorkspace({
  draftId,
  initialBrief,
  assets,
  onResultReady,
  onSaved,
  onNew,
}: {
  draftId?: string;
  initialBrief?: string;
  assets: Asset[];
  onResultReady: (draft: ArticleDraft) => void;
  onSaved: (draft: ArticleDraft) => void;
  onNew: () => void;
}) {
  const [phase, setPhase] = useState<
    "intake" | "loading" | "result" | "restore"
  >(draftId ? "restore" : "intake");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const [prepared, setPrepared] = useState<ArticleDraft | null>(null);
  const [latest, setLatest] = useState<ArticleDraft | null>(null);
  const [seed, setSeed] = useState<ArticleInput | undefined>();
  const [intakeKey, setIntakeKey] = useState(0);
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">(
    "saved",
  );
  const [exampleImages, setExampleImages] = useState<ArticleInput["images"]>(
    [],
  );
  const run = useRef(0);
  const alive = useRef(true);
  const activeDraft = useRef<ArticleDraft | null>(null);
  const saveRevision = useRef(0);
  const callbacks = useRef({ onResultReady, onSaved });
  callbacks.current = { onResultReady, onSaved };

  // The model owns queued writes so a new Workspace can restore pending edits.
  // Only the most recent request may update this instance's save indicator.
  async function persist(next: ArticleDraft) {
    const revision = ++saveRevision.current;
    if (alive.current) {
      setLatest(next);
      setSaveState("saving");
    }
    try {
      await saveArticleDraft(next);
      if (revision === saveRevision.current) {
        callbacks.current.onSaved(next);
        if (alive.current) setSaveState("saved");
      }
    } catch {
      if (alive.current && revision === saveRevision.current)
        setSaveState("error");
    }
  }

  useEffect(() => {
    alive.current = true;
    const initialRun = run.current;
    loadArticleDraft()
      .then((saved) => {
        if (alive.current) setLatest((current) => current ?? saved);
      })
      .catch(() => {
        if (alive.current) setNotice("暂时无法读取上次作品，可以继续新建。");
      });
    if (draftId) {
      loadArticleDraft(draftId)
        .then((saved) => {
          if (!alive.current || initialRun !== run.current) return;
          if (saved) {
            activeDraft.current = saved;
            setDraft(saved);
            setPhase("result");
            // A remounted workspace may have recovered an in-memory edit whose
            // earlier write is pending or failed. Retry and expose its status.
            void persist(saved);
          } else {
            setNotice(
              "此作品的本地内容暂不可用，请重新上传，或返回原浏览器查看。",
            );
            setPhase("intake");
          }
        })
        .catch(() => {
          if (alive.current && initialRun === run.current) {
            setNotice("作品读取失败，可刷新重试或新建作品。");
            setPhase("intake");
          }
        });
    }
    return () => {
      alive.current = false;
      run.current++;
    };
  }, []);

  useEffect(() => {
    let current = true;
    const posters = assetSlots
      .filter((slot) => slot.type === "image")
      .map((slot) => assets.find((asset) => asset.id === slot.id))
      .filter(
        (asset): asset is Asset =>
          !!asset &&
          asset.blob.size <= 20 * 1024 * 1024 &&
          /^image\/(png|jpeg|webp)$/.test(asset.blob.type),
      );
    Promise.all(
      posters.map(
        (asset) =>
          new Promise<ArticleInput["images"][number]>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () =>
              resolve({
                id: asset.id,
                name: asset.name,
                src: String(reader.result),
              });
            reader.readAsDataURL(asset.blob);
          }),
      ),
    )
      .then((images) => {
        if (current) setExampleImages(images);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [assets]);

  function start(input: ArticleInput) {
    try {
      const next = createArticleDraft(input, crypto.randomUUID());
      run.current++;
      setPrepared(next);
      setStep(0);
      setNotice("");
      setPhase("loading");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "请检查上传内容后重试。",
      );
    }
  }

  useEffect(() => {
    if (phase !== "loading" || !prepared) return;
    const token = run.current;
    const timer = window.setTimeout(() => {
      if (token !== run.current) return;
      if (step < 2) setStep((step + 1) as 1 | 2);
      else {
        activeDraft.current = prepared;
        setDraft(prepared);
        setLatest(prepared);
        setPhase("result");
        callbacks.current.onResultReady(prepared);
        void persist(prepared);
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [phase, step, prepared]);

  function resume() {
    if (!latest) return;
    run.current++;
    activeDraft.current = latest;
    setDraft(latest);
    setPhase("result");
    callbacks.current.onResultReady(latest);
    void persist(latest);
  }

  return (
    <>
      {phase === "result" && draft ? (
        <ArticleResults
          key={draft.id}
          draft={draft}
          onChange={(next) => {
            activeDraft.current = next;
            setDraft(next);
            void persist(next);
          }}
          onNew={onNew}
          onEditSource={() => {
            run.current++;
            setSeed(draft.input);
            setIntakeKey((key) => key + 1);
            setPhase("intake");
          }}
          saveState={saveState}
          onRetrySave={() => {
            if (activeDraft.current) void persist(activeDraft.current);
          }}
        />
      ) : phase === "restore" ? (
        <main className="literature-intake">
          <div className="li-header">
            <div className="li-brand">
              <FileImage size={24} />
              <h1>图文创作</h1>
            </div>
          </div>
          <div className="li-loading-card" role="status">
            <LoaderCircle className="spin" size={28} />
            <h2>正在恢复作品</h2>
            <p>载入上次保存的文案、图片与编辑。</p>
            <button className="le-button" onClick={onNew}>
              新建图文
            </button>
          </div>
        </main>
      ) : (
        <div hidden={phase !== "intake"}>
          <ArticleIntake
            key={intakeKey}
            initialBrief={initialBrief}
            initialInput={seed}
            onStart={start}
            onResume={latest ? resume : undefined}
            resumeLabel={latest?.input.title.trim() || "新的图文创作"}
            exampleImages={exampleImages}
          />
        </div>
      )}
      {phase === "loading" && (
        <ArticleLoading
          step={step}
          onCancel={() => {
            run.current++;
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
