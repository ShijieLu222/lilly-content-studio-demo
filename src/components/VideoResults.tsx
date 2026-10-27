import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Clapperboard,
  Film,
  Info,
  Maximize2,
  Play,
} from "lucide-react";
import type { Asset } from "../lib/assets";
import { videoVersions } from "../videoDemo";
import "./VideoResults.css";

type VideoResultsProps = {
  assets: Asset[];
  selectedVersionId: string;
  previewVersionId: string;
  onPreviewVersion: (id: string) => void;
  onDownload: (asset: Asset) => void;
  onExpand?: () => void;
  large?: boolean;
};

function timestamp(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${(safe % 60).toFixed(2).padStart(5, "0")}`;
}

export default function VideoResults({
  assets,
  selectedVersionId,
  previewVersionId,
  onPreviewVersion,
  onDownload,
  onExpand,
  large = false,
}: VideoResultsProps) {
  const version =
    videoVersions.find((item) => item.id === previewVersionId) ||
    videoVersions[0];
  const chosen = videoVersions.find((item) => item.id === selectedVersionId);
  const asset = assets.find((item) => item.id === version.id);
  const original = asset?.source === "bundled";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<{ url: string; blob: Blob } | null>(
    null,
  );
  const [metadata, setMetadata] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [failed, setFailed] = useState(false);
  const mediaUrl = source?.blob === asset?.blob ? source?.url : undefined;

  useEffect(() => {
    setMetadata(null);
    setCurrentTime(0);
    setFailed(false);
    if (!asset) {
      setSource(null);
      return;
    }
    const url = URL.createObjectURL(asset.blob);
    setSource({ url, blob: asset.blob });
    return () => URL.revokeObjectURL(url);
  }, [asset?.blob]);

  function seek(seconds: number) {
    const player = videoRef.current;
    if (!player || !metadata || failed) return;
    const position = Math.min(seconds, Math.max(0, metadata.duration - 0.05));
    player.currentTime = position;
    setCurrentTime(position);
  }

  return (
    <section
      className={`video-results${large ? " video-results-large" : ""}`}
      aria-label="大会开场动画成果"
    >
      <header className="vr-heading">
        <div>
          <span className="vr-eyebrow">CONFERENCE OPENING</span>
          <h3>领峰者之夜</h3>
          <p>大会开场动画 · 双版本成果</p>
        </div>
        <span className="vr-ready">
          <Film size={13} />
          {
            videoVersions.filter((item) => assets.some((a) => a.id === item.id))
              .length
          }
          / 2 已就位
        </span>
      </header>

      <div className="vr-versions" aria-label="切换成片版本">
        {videoVersions.map((item) => {
          const itemAsset = assets.find((a) => a.id === item.id);
          const active = version.id === item.id;
          const selected = selectedVersionId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`vr-version${active ? " vr-version-active" : ""}`}
              onClick={() => onPreviewVersion(item.id)}
              aria-pressed={active}
              aria-label={`预览${item.label}，${item.title}${selected ? "，当前流程选择" : ""}`}
            >
              <span className="vr-version-image">
                {itemAsset?.source === "bundled" ? (
                  <img src={itemAsset.poster || item.poster} alt="" />
                ) : (
                  <Film size={22} />
                )}
                <span>{item.label}</span>
                {active && <Play size={11} fill="currentColor" />}
              </span>
              <span className="vr-version-copy">
                <strong>{item.title}</strong>
                <span>
                  {selected ? (
                    <>
                      <Check size={10} /> 当前流程选择
                    </>
                  ) : (
                    "切换预览"
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="vr-player-wrap">
        {asset && mediaUrl ? (
          <video
            key={`${asset.id}:${asset.updatedAt}:${mediaUrl}`}
            ref={videoRef}
            src={mediaUrl}
            poster={original ? asset.poster || version.poster : undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={`${version.label}开场动画播放器`}
            onLoadedMetadata={(event) => {
              const player = event.currentTarget;
              if (
                !Number.isFinite(player.duration) ||
                player.videoWidth === 0
              ) {
                setFailed(true);
                return;
              }
              setMetadata({
                duration: player.duration,
                width: player.videoWidth,
                height: player.videoHeight,
              });
              setFailed(false);
            }}
            onTimeUpdate={(event) =>
              setCurrentTime(event.currentTarget.currentTime)
            }
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="vr-player-empty">
            <Clapperboard size={30} />
            <strong>
              {asset ? "正在载入成片" : `${version.label}尚未就位`}
            </strong>
            <span>
              {asset
                ? "本地视频即将呈现"
                : "在素材库接入成片或恢复原版后即可预览。"}
            </span>
          </div>
        )}
      </div>

      {failed && (
        <p className="vr-error" role="alert">
          此视频暂时无法播放。请在素材库重新导入可播放的 H.264 MP4，或恢复原版。
        </p>
      )}

      <div className="vr-player-meta">
        <div>
          <strong>{version.label}</strong>
          {metadata ? (
            <span>
              {metadata.duration.toFixed(2)} 秒 · {metadata.width} ×{" "}
              {metadata.height}
            </span>
          ) : (
            <span>{asset ? "读取视频规格中" : "等待接入成片"}</span>
          )}
        </div>
        <span className="vr-time">{timestamp(currentTime)}</span>
      </div>

      {chosen && (
        <p
          className={`vr-selection-note${chosen.id !== version.id ? " vr-comparing" : ""}`}
        >
          {chosen.id === version.id ? <Check size={12} /> : <Info size={12} />}
          {chosen.id === version.id
            ? `当前流程对应${chosen.label}，可切换另一版本对比。`
            : `正在对比${version.label}；当前流程仍对应${chosen.label}。`}
        </p>
      )}

      {original && (
        <div className="vr-storyboard">
          <div className="vr-section-heading">
            <h4>
              <Clapperboard size={13} /> 成片分镜
            </h4>
            <span>点击定位画面</span>
          </div>
          <div className="vr-scenes">
            {version.scenes.map((scene, index) => {
              const active =
                currentTime >= scene.start &&
                (currentTime < scene.end ||
                  index === version.scenes.length - 1);
              return (
                <button
                  key={scene.start}
                  type="button"
                  className={`vr-scene${active ? " vr-scene-active" : ""}`}
                  onClick={() => seek(scene.sampleTime)}
                  disabled={!metadata || failed}
                  aria-label={`定位到${scene.title}，${scene.sampleTime.toFixed(2)}秒`}
                  aria-pressed={active}
                  title={scene.description}
                >
                  <span className="vr-scene-image">
                    <img src={scene.frame} alt="" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </span>
                  <span className="vr-scene-copy">
                    <strong>{scene.title}</strong>
                    <small>
                      {timestamp(scene.start)} — {timestamp(scene.end)}
                    </small>
                  </span>
                  <Play size={11} />
                </button>
              );
            })}
          </div>
          <p className="vr-scene-note">
            分镜来自已提供成片，节点用于演示定位。
          </p>
        </div>
      )}

      {asset && !original && (
        <p className="vr-import-note">
          <Info size={13} />
          当前为本地替换成片，播放与下载使用此文件。原版抽帧分镜暂不展示。
        </p>
      )}

      <footer className="vr-footer">
        <span title={asset?.name}>{asset?.name || "成片待接入"}</span>
        <div>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="放大视频预览"
              title="放大视频预览"
            >
              <Maximize2 size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => asset && onDownload(asset)}
            disabled={!asset}
            aria-label={`下载${version.label}成片`}
            title={`下载${version.label}成片`}
          >
            <ArrowDownToLine size={16} />
          </button>
        </div>
      </footer>
    </section>
  );
}
