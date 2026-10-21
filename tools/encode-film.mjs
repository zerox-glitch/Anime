/**
 * Encode the rendered frames and the mixed audio into the deliverable MP4.
 *
 *   node tools/encode-film.mjs [framesDir] [outFile]
 *
 * Needs ffmpeg. If `ffmpeg` is not on PATH, set HYPERFRAMES_FFMPEG_PATH or
 * FFMPEG_PATH to a binary.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const filmDir = "films/dusk-open-steppe-rider";
const framesDir = process.argv[2] || "frames";
const outFile = process.argv[3] || "media/dusk-open-steppe-rider.mp4";
const audio = path.join(filmDir, "audio", "film-audio.wav");

const ffmpeg =
  process.env.HYPERFRAMES_FFMPEG_PATH || process.env.FFMPEG_PATH || "ffmpeg";

if (!fs.existsSync(path.join(framesDir, "frame_0000.png"))) {
  console.error(`no frames in ${framesDir} — run: npm run frames`);
  process.exit(1);
}
if (!fs.existsSync(audio)) {
  console.error(`missing ${audio} — build it with films/dusk-open-steppe-rider/audio/BUILD.md`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const args = [
  "-y",
  "-loglevel",
  "error",
  "-framerate",
  "24",
  "-i",
  path.join(framesDir, "frame_%04d.png"),
  "-i",
  audio,
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  "16",
  "-pix_fmt",
  "yuv420p",
  "-profile:v",
  "high",
  "-movflags",
  "+faststart",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  outFile,
];

const res = spawnSync(ffmpeg, args, { stdio: "inherit" });
if (res.status !== 0) {
  console.error("ffmpeg failed — is it installed? see tools/README.md");
  process.exit(res.status || 1);
}
const size = (fs.statSync(outFile).size / 1e6).toFixed(1);
console.log(`wrote ${outFile} (${size} MB)`);
