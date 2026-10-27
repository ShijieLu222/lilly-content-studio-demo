import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowUpFromLine,
  Check,
  CircleAlert,
  Film,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Images,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  AssetValidationError,
  assetSlots,
  bundledVideoAssets,
  deleteAsset,
  MAX_ASSET_BYTES,
  saveAsset,
  type Asset,
} from "../lib/assets";
import "./AssetLibrary.css";

const IMAGE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif";
const VIDEO_ACCEPT = ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime";

function identifyFile(file: File): "image" | "video" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    ["png", "jpg", "jpeg", "webp", "gif"].includes(extension ?? "") &&
    (!file.type || file.type.startsWith("image/"))
  )
    return "image";
  if (
    ["mp4", "webm", "mov"].includes(extension ?? "") &&
    (!file.type ||
      file.type.startsWith("video/") ||
      file.type === "application/octet-stream")
  )
    return "video";
  return null;
}

function humanSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return "浏览器本地空间不足，请先移除部分素材，或换用体积更小的文件。";
  if (error instanceof DOMException && error.name === "SecurityError")
    return "浏览器未允许本地存储，请使用普通窗口并允许网站保存数据。";
  return error instanceof Error ? error.message : "素材保存失败，请重试。";
}

interface Props {
  assets: Asset[];
  onChange: () => void;
  onClose?: () => void;
}

export default function AssetLibrary({ assets, onChange, onClose }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});
  const batchInput = useRef<HTMLInputElement>(null);
  const slotInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragDepth = useRef(0);
  const imageCount = assets.filter((asset) => asset.type === "image").length;
  const videoCount = assets.filter((asset) => asset.type === "video").length;

  useEffect(() => {
    const next = Object.fromEntries(
      assets.map((asset) => [asset.id, URL.createObjectURL(asset.blob)]),
    );
    setUrls(next);
    setMediaErrors({});
    return () => Object.values(next).forEach((url) => URL.revokeObjectURL(url));
  }, [assets]);

  async function importFiles(files: File[], targetId?: string) {
    if (!files.length || busy) return;
    setBusy(true);
    setNotice(null);
    const occupied = new Set(assets.map((asset) => asset.id));
    let imported = 0;
    const issues: string[] = [];
    try {
      for (const file of files) {
        const type = identifyFile(file);
        if (!type) {
          issues.push(`${file.name}：文件格式不支持`);
          continue;
        }
        if (!file.size) {
          issues.push(`${file.name}：文件为空`);
          continue;
        }
        if (file.size > MAX_ASSET_BYTES) {
          issues.push(`${file.name}：超过 200 MB`);
          continue;
        }
        const slot = targetId
          ? assetSlots.find((item) => item.id === targetId)
          : assetSlots.find(
              (item) => item.type === type && !occupied.has(item.id),
            );
        if (!slot) {
          issues.push(
            `${file.name}：${type === "image" ? "海报" : "视频"}位置已满，请使用对应卡片的“替换”`,
          );
          continue;
        }
        if (slot.type !== type) {
          issues.push(
            `${file.name}：这里需要${slot.type === "image" ? "图片" : "视频"}文件`,
          );
          continue;
        }
        try {
          await saveAsset({
            id: slot.id,
            name: file.name,
            type,
            blob: file,
            updatedAt: Date.now(),
          });
        } catch (error) {
          if (error instanceof AssetValidationError) {
            issues.push(`${file.name}：${error.message}`);
            continue;
          }
          throw error;
        }
        occupied.add(slot.id);
        imported += 1;
      }
      setNotice({
        text: [
          imported ? `已保存 ${imported} 个成品，刷新页面后仍可使用。` : "",
          ...issues,
        ]
          .filter(Boolean)
          .join(" "),
        error: issues.length > 0,
      });
    } catch (error) {
      setNotice({
        text: `${imported ? `已保存 ${imported} 个成品。` : ""}${errorMessage(error)}`,
        error: true,
      });
    } finally {
      setBusy(false);
      if (imported) onChange();
    }
  }

  function handleInput(
    event: ChangeEvent<HTMLInputElement>,
    targetId?: string,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void importFiles(files, targetId);
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await deleteAsset(id);
      const original = bundledVideoAssets.find((video) => video.id === id);
      setNotice({
        text: original
          ? `已恢复${original.title}原始成品，电脑中的文件不受影响。`
          : "已从本地素材库移除，电脑中的原始文件不受影响。",
        error: false,
      });
      onChange();
    } catch (error) {
      setNotice({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="asset-library" aria-labelledby="asset-library-title">
      <header className="asset-header">
        <div className="asset-header-title">
          <span className="asset-header-icon">
            <FolderOpen size={23} />
          </span>
          <div>
            <div className="asset-eyebrow">CREATIVE ASSETS</div>
            <h2 id="asset-library-title">让好内容，成为演示的主角</h2>
            <p>接入已完成的作品，图文与视频工作流将同步展示。</p>
          </div>
        </div>
        {onClose && (
          <button
            className="asset-icon-button"
            aria-label="关闭素材库"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </header>

      <div
        className={`asset-dropzone ${dragging ? "asset-dropzone-active" : ""}`}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragLeave={() => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
      >
        <span className="asset-upload-mark">
          <ArrowUpFromLine size={23} />
        </span>
        <div className="asset-drop-copy">
          <strong>
            {dragging
              ? "松开鼠标，添加到本地素材库"
              : "拖入成品，或从电脑中选择"}
          </strong>
          <p>图片按选择顺序填入空位，已保存的成品不会被批量覆盖。</p>
          <span>
            PNG · JPG · WEBP · GIF · MP4 · WEBM · MOV / 单文件 ≤ 200 MB
          </span>
        </div>
        <button
          className="asset-primary-button"
          disabled={busy}
          onClick={() => batchInput.current?.click()}
        >
          <ArrowUpFromLine size={16} />
          {busy ? "正在保存…" : "导入本地成品"}
        </button>
        <input
          ref={batchInput}
          className="asset-hidden-input"
          type="file"
          accept={`${IMAGE_ACCEPT},${VIDEO_ACCEPT}`}
          multiple
          aria-label="批量导入本地成品"
          onChange={(event) => handleInput(event)}
        />
      </div>

      {notice && (
        <div
          className={`asset-notice ${notice.error ? "asset-notice-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? <CircleAlert size={17} /> : <Check size={17} />}
          <span>{notice.text}</span>
          <button
            className="asset-icon-button"
            aria-label="关闭提示"
            onClick={() => setNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="asset-section-heading">
        <div>
          <Images size={17} />
          <h3>系列海报</h3>
          <span>同一视觉体系 · 五个独立主题</span>
        </div>
        <b>{imageCount} / 5 已接入</b>
      </div>
      <div className="asset-poster-grid">
        {assetSlots
          .filter((slot) => slot.type === "image")
          .map((slot, index) => {
            const asset = assets.find((item) => item.id === slot.id);
            return (
              <article
                className={`asset-card ${asset ? "asset-card-filled" : ""}`}
                key={slot.id}
              >
                <div className="asset-poster-preview">
                  {asset && urls[slot.id] && !mediaErrors[slot.id] ? (
                    <img
                      src={urls[slot.id]}
                      alt={`${slot.title}成品海报`}
                      onError={() =>
                        setMediaErrors((previous) => ({
                          ...previous,
                          [slot.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="asset-empty-art">
                      <span className="asset-empty-number">0{index + 1}</span>
                      <ImagePlus size={26} strokeWidth={1.35} />
                      <span>
                        {mediaErrors[slot.id]
                          ? "图片无法预览，请替换文件"
                          : "等待接入成品"}
                      </span>
                    </div>
                  )}
                  {asset && (
                    <span className="asset-connected">
                      <Check size={11} />
                      已接入
                    </span>
                  )}
                </div>
                <div className="asset-card-details">
                  <h4>{slot.title}</h4>
                  <p title={asset?.name}>
                    {asset ? asset.name : "预留海报展示位置"}
                  </p>
                  <div className="asset-card-actions">
                    <button
                      className="asset-outline-button"
                      disabled={busy}
                      onClick={() => slotInputs.current[slot.id]?.click()}
                    >
                      {asset ? (
                        <RefreshCw size={13} />
                      ) : (
                        <ImagePlus size={14} />
                      )}
                      {asset ? "替换" : "选择图片"}
                    </button>
                    {asset && (
                      <button
                        className="asset-icon-button asset-delete-button"
                        disabled={busy}
                        aria-label={`移除${slot.title}海报`}
                        onClick={() => void remove(slot.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {asset && (
                    <span className="asset-file-size">
                      {humanSize(asset.blob.size)}
                    </span>
                  )}
                </div>
                <input
                  ref={(node) => {
                    slotInputs.current[slot.id] = node;
                  }}
                  className="asset-hidden-input"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  aria-label={`导入${slot.title}海报`}
                  onChange={(event) => handleInput(event, slot.id)}
                />
              </article>
            );
          })}
      </div>

      <div className="asset-section-heading">
        <div>
          <Film size={17} />
          <h3>视频成品</h3>
          <span>领峰者之夜 · 同一大会的两个开场版本</span>
        </div>
        <b>{videoCount} / 2 已接入</b>
      </div>
      {assetSlots
        .filter((slot) => slot.type === "video")
        .map((slot) => {
          const asset = assets.find((item) => item.id === slot.id);
          const original = bundledVideoAssets.find(
            (item) => item.id === slot.id,
          );
          const bundled = asset?.source === "bundled";
          return (
            <article className="asset-video-card" key={slot.id}>
              <div
                className={`asset-video-preview ${asset ? "asset-video-preview-filled" : ""}`}
              >
                {asset && urls[slot.id] && !mediaErrors[slot.id] ? (
                  <video
                    src={urls[slot.id]}
                    controls
                    preload="metadata"
                    playsInline
                    poster={asset.poster}
                    onError={() =>
                      setMediaErrors((previous) => ({
                        ...previous,
                        [slot.id]: true,
                      }))
                    }
                    aria-label={`${slot.title}预览`}
                  />
                ) : (
                  <div className="asset-video-empty">
                    <span>
                      <Film size={29} strokeWidth={1.3} />
                    </span>
                    <p>
                      {mediaErrors[slot.id]
                        ? "浏览器无法播放此编码，请替换为 H.264 MP4"
                        : "你的下一支精彩短片，即将在这里呈现"}
                    </p>
                  </div>
                )}
              </div>
              <div className="asset-video-details">
                <span className="asset-video-label">
                  {bundled ? "ORIGINAL CONFERENCE FILM" : "VIDEO OUTPUT"}
                </span>
                <h4>{slot.title}</h4>
                <p>
                  {asset
                    ? asset.name
                    : "保留真实画质与声音，在视频工作流的成稿阶段直接播放。"}
                </p>
                <span className="asset-video-hint">
                  {asset
                    ? bundled && original
                      ? `${original.duration.toFixed(2)} 秒 · ${original.width} × ${original.height} · ${original.fps} fps · ${humanSize(asset.blob.size)} · 随项目提供`
                      : `${humanSize(asset.blob.size)} · 当前浏览器的替换版本`
                    : "推荐 H.264 MP4；MOV 的可播放性取决于视频编码。"}
                </span>
                <div className="asset-video-actions">
                  <button
                    className="asset-outline-button"
                    disabled={busy}
                    onClick={() => slotInputs.current[slot.id]?.click()}
                  >
                    {asset ? (
                      <RefreshCw size={14} />
                    ) : (
                      <ArrowUpFromLine size={15} />
                    )}
                    {asset ? "替换视频" : "选择视频"}
                  </button>
                  {asset && !bundled && (
                    <button
                      className="asset-outline-button"
                      disabled={busy}
                      aria-label={`恢复${slot.title}原版`}
                      onClick={() => void remove(slot.id)}
                    >
                      <RefreshCw size={14} />
                      恢复原版
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={(node) => {
                  slotInputs.current[slot.id] = node;
                }}
                className="asset-hidden-input"
                type="file"
                accept={VIDEO_ACCEPT}
                aria-label={`导入${slot.title}`}
                onChange={(event) => handleInput(event, slot.id)}
              />
            </article>
          );
        })}
      <footer className="asset-footer">
        <HardDrive size={15} />
        <span>
          两个开场原版随项目保存；新导入的素材仅保存在当前浏览器，不会上传。清除浏览器数据会移除导入内容。
        </span>
      </footer>
    </section>
  );
}
