/**
 * Offline frame renderer for the html-anime film.
 *
 * Chrome could not render in the sandbox where the film was drawn, so this
 * reads films/<slug>/index.html directly:
 *   1. parses the clip elements (#s1..#s6) and the colour-dip divs
 *   2. replays the cue list in <script id="cues"> at any frame time
 *   3. rasterises the composed frame with resvg
 *
 * Usage:
 *   node tools/render-frame.mjs <film-dir> <out-dir> [fps]
 * Writes frame_0000.png ... and film.json (fps, frames, width, height).
 *
 * Deterministic: no clock, no random. Same file in, same frame out.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { Resvg } from "@resvg/resvg-js";
import woff2 from "wawoff2";

const EASINGS = {
  none: (p) => p,
  linear: (p) => p,
  "power1.in": (p) => p * p,
  "power1.out": (p) => 1 - (1 - p) * (1 - p),
  "power1.inOut": (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p)),
  "power2.in": (p) => p * p * p,
  "power2.out": (p) => 1 - Math.pow(1 - p, 3),
  "power2.inOut": (p) => (p < 0.5 ? 4 * p * p * p : 1 - 4 * Math.pow(1 - p, 3)),
  "power3.out": (p) => 1 - Math.pow(1 - p, 4),
};

const PROPS = ["opacity", "x", "y", "scale"];

function ease(name, p) {
  const fn = EASINGS[name] || EASINGS.none;
  return fn(p);
}

/** Base opacity before any tween: `.draw` starts hidden, everything else shows. */
function baseOpacity(el) {
  const cls = el.getAttribute("class") || "";
  if (/\bdraw\b/.test(cls)) return 0;
  const attr = el.getAttribute("opacity");
  if (attr !== undefined && attr !== null && attr !== "") return Number(attr);
  const style = el.getAttribute("style") || "";
  const m = style.match(/opacity:\s*([0-9.]+)/);
  if (m) return Number(m[1]);
  return 1;
}

/** Replay the cue list at time t and return the state of every touched element. */
function stateAt(cues, t, baseById) {
  const state = new Map();
  const sorted = [...cues].sort((a, b) => a.t - b.t);
  for (const cue of sorted) {
    if (cue.t > t + 1e-9) continue;
    const cur = state.get(cue.target) || {};
    const base = {
      opacity: cur.opacity ?? (baseById.has(cue.target) ? baseById.get(cue.target) : 1),
      x: cur.x ?? 0,
      y: cur.y ?? 0,
      scale: cur.scale ?? 1,
    };
    if (cue.from) {
      for (const k of PROPS) if (cue.from[k] !== undefined) base[k] = cue.from[k];
    }
    const span = Math.max(cue.d, 1e-6);
    const raw = t - cue.t;
    const p = raw <= 0 ? 0 : Math.min(1, raw / span);
    const e = ease(cue.ease, p);
    const next = { ...base };
    for (const k of PROPS) {
      if (cue.to && cue.to[k] !== undefined) next[k] = base[k] + (cue.to[k] - base[k]) * e;
    }
    state.set(cue.target, next);
  }
  return state;
}

/** Write the tweened values back onto the parsed markup as SVG attributes. */
function applyState(root, state, pivots) {
  let changed = 0;
  root.querySelectorAll("[id]").forEach((el) => {
    const st = state.get("#" + el.getAttribute("id"));
    if (!st) return;
    changed++;
    const op = Math.max(0, Math.min(1, st.opacity));
    el.setAttribute("opacity", String(Number(op.toFixed(4))));
    const x = st.x || 0;
    const y = st.y || 0;
    const s = st.scale || 1;
    if (Math.abs(x) > 1e-6 || Math.abs(y) > 1e-6 || Math.abs(s - 1) > 1e-6) {
      const pivot = pivots["#" + el.getAttribute("id")] || null;
      const ox = pivot ? pivot[0] : 0;
      const oy = pivot ? pivot[1] : 0;
      const extra =
        `translate(${x.toFixed(3)} ${y.toFixed(3)}) ` +
        `translate(${ox} ${oy}) scale(${s.toFixed(5)}) translate(${-ox} ${-oy})`;
      const own = el.getAttribute("transform");
      el.setAttribute("transform", own ? `${extra} ${own}` : extra);
    }
  });
  return changed;
}

function readFilm(filmDir) {
  const file = path.join(filmDir, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const doc = parse(html);
  const root = doc.querySelector("#root");
  if (!root) throw new Error("no #root in " + file);

  const width = Number(root.getAttribute("data-width"));
  const height = Number(root.getAttribute("data-height"));
  const duration = Number(root.getAttribute("data-duration"));

  const cues = JSON.parse(doc.querySelector("#cues").textContent).map((c) => ({ ...c }));

  const clips = [];
  const dips = [];
  for (const el of root.childNodes) {
    if (!el.getAttribute) continue;
    const start = el.getAttribute("data-start");
    if (start === null) continue;
    const item = {
      el,
      start: Number(start),
      duration: Number(el.getAttribute("data-duration")),
      z: el.getAttribute("id"),
    };
    if (el.rawTagName === "div" && /^s\d/.test(item.z)) clips.push(item);
    else if (el.rawTagName === "div") dips.push(item);
  }
  return { doc, root, width, height, duration, cues, clips, dips };
}

async function fontFile(filmDir) {
  const dir = path.join(filmDir, "fonts");
  const out = path.join(osTmp(), "film-font.ttf");
  if (!fs.existsSync(dir)) return null;
  const woff = fs.readdirSync(dir).find((f) => f.endsWith(".woff2"));
  if (!woff) return null;
  if (!fs.existsSync(out)) {
    const ttf = await woff2.decompress(fs.readFileSync(path.join(dir, woff)));
    fs.writeFileSync(out, Buffer.from(ttf));
  }
  return out;
}

import os from "node:os";
function osTmp() {
  return os.tmpdir();
}

/** Build one frame as an SVG string. */
function frameSvg(film, t, font) {
  const { width, height, cues, clips, dips } = film;
  const baseById = new Map();
  for (const clip of clips) {
    const svg = clip.el.querySelector("svg");
    if (!svg) continue;
    for (const el of svg.querySelectorAll("[id]")) {
      baseById.set("#" + el.getAttribute("id"), baseOpacity(el));
    }
  }
  const state = stateAt(cues, t, baseById);

  const parts = [];
  for (const clip of clips) {
    const visible = t >= clip.start - 1e-9 && t < clip.start + clip.duration - 1e-9;
    if (!visible) continue;
    const svg = clip.el.querySelector("svg");
    if (!svg) continue;
    const clone = parse(svg.toString()).querySelector("svg");
    applyState(clone, state, film.pivots);
    parts.push(`<g data-clip="${clip.z}">${clone.innerHTML}</g>`);
  }
  for (const dip of dips) {
    const visible = t >= dip.start - 1e-9 && t < dip.start + dip.duration - 1e-9;
    if (!visible) continue;
    const id = "#" + dip.z;
    const st = state.get(id) || { opacity: baseOpacity(dip.el) };
    const color = dip.el.getAttribute("data-color") || "#14080c";
    parts.push(
      `<rect width="${width}" height="${height}" fill="${color}" opacity="${Number(
        Math.max(0, Math.min(1, st.opacity)).toFixed(4),
      )}"/>`,
    );
  }

  const body = parts.join("\n").replace(/href="#/g, 'xlink:href="#');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
  );
}

async function main() {
  let [filmDir, outDir, fpsArg, fromArg, toArg] = process.argv.slice(2);
  if (!filmDir || !outDir) {
    console.error("usage: node tools/render-frame.mjs <film-dir> <out-dir> [fps]");
    process.exit(1);
  }
  const fps = Number(fpsArg || 24);
  const film = readFilm(filmDir);
  film.pivots = { "#s1world": [540, 960] };
  fs.mkdirSync(outDir, { recursive: true });
  const font = await fontFile(filmDir);
  const fontOpts = font
    ? { font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: "Shippori Mincho" } }
    : { font: { loadSystemFonts: false } };

  const frames = Math.round(film.duration * fps);
  const from = Number(fromArg || 0);
  const to = Number(toArg || frames);
  for (let f = from; f < Math.min(to, frames); f++) {
    const t = f / fps;
    const svg = frameSvg(film, t, font);
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: film.width },
      ...fontOpts,
    })
      .render()
      .asPng();
    fs.writeFileSync(path.join(outDir, `frame_${String(f).padStart(4, "0")}.png`), png);
    if (f % 48 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
    if (typeof global.gc === 'function' && f % 24 === 0) global.gc();
  }
  fs.writeFileSync(
    path.join(outDir, "film.json"),
    JSON.stringify({ fps, frames, width: film.width, height: film.height, duration: film.duration }, null, 2),
  );
  console.log(`wrote ${frames} frames to ${outDir}`);
}

if (process.argv[1] && process.argv[1].endsWith("render-frame.mjs")) main();
export { readFilm, frameSvg, fontFile };
