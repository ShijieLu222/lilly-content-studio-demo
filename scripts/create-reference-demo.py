"""Create missing local reference samples for every supported duration and size."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIZES = (360, 720, 1080)


def valid_sample(path, duration, size):
    if not path.is_file():
        return False
    try:
        data = json.loads(subprocess.check_output([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "format=duration:stream=width,height,codec_name,r_frame_rate",
            "-of", "json", str(path),
        ]))
        stream = data["streams"][0]
        return (stream["width"] == size and stream["height"] == size
                and stream["codec_name"] == "h264"
                and stream["r_frame_rate"] == "24/1"
                and abs(float(data["format"]["duration"]) - duration) < 0.01)
    except (subprocess.CalledProcessError, ValueError, KeyError, IndexError):
        return False


def sample_path(duration, size):
    return ROOT / f"public/assets/videos/reference-demo-{duration}s-{size}p.mp4"


created = 0
for duration in range(5, 16):
    master = sample_path(duration, 1080)
    if not valid_sample(master, duration, 1080):
        inputs = []
        for index in range(1, 4):
            inputs += ["-loop", "1", "-framerate", "24", "-i",
                       str(ROOT / f"public/assets/video-references/poc-reference-{index}.png")]
        chains = []
        for index in range(3):
            # Every integer second divides into whole frames at 24 fps.
            # Keep the complete original text visible between gentle fades.
            chains.append(
                f"[{index}:v]scale=1080:1080,setsar=1,trim=duration={duration / 3},"
                f"setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.22,"
                f"fade=t=out:st={duration / 3 - 0.22}:d=0.22[v{index}]"
            )
        chains.append("[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v]")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
            "-filter_complex", ";".join(chains), "-map", "[v]", "-t", str(duration),
            "-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "21",
            "-movflags", "+faststart", str(master),
        ], check=True)
        created += 1
    for size in SIZES[:-1]:
        destination = sample_path(duration, size)
        if valid_sample(destination, duration, size):
            continue
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(master),
            "-vf", f"scale={size}:{size}", "-an", "-c:v", "libx264",
            "-preset", "fast", "-crf", "21", "-movflags", "+faststart", str(destination),
        ], check=True)
        created += 1
    assert all(valid_sample(sample_path(duration, size), duration, size) for size in SIZES)
    print(f"Verified {duration}s at 360p, 720p, 1080p", flush=True)

print(f"Created {created} clips; all 33 reference samples verified.")
