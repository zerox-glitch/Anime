# tools

Two scripts make the film files. The film itself is `films/<slug>/index.html`
and obeys the five skills in `skills/`.

## `render-frame.mjs`

Chrome could not run in the sandbox this film was drawn in (no system NSS, no
headless browser download), so the frames are rasterised without a browser.

It reads the film's `index.html`, replays the cue list in
`<script id="cues">` at any frame time, and hands the composed SVG to resvg.

```bash
npm run frames          # 480 frames at 24 fps into ./frames
# or a slice, for a fast look:
node tools/render-frame.mjs films/dusk-open-steppe-rider /tmp/frames 24 240 300
```

What it supports, and what it deliberately does not:

- colour dips, clip in/out on `data-start` / `data-duration`, drawing swaps
- `opacity`, `x`, `y`, `scale`, and the GSAP eases the film uses
- no paths, no `attr` tweens, no text metrics — add a cue kind before you use one

`frames/` is ignored by Git.

## `encode-film.mjs`

Muxes `frames/` and `films/dusk-open-steppe-rider/audio/film-audio.wav` into
`media/dusk-open-steppe-rider.mp4` (H.264 high, CRF 16, yuv420p, faststart,
AAC 192k).

```bash
npm run film
```

Needs ffmpeg on PATH, or `FFMPEG_PATH=/path/to/ffmpeg npm run film`.

## Gates

```bash
npm test     # the sheet compiler's own tests
npm run lint # hyperframes lint on the film directory
```

`hyperframes validate` needs the headless Chrome that this sandbox cannot
install. Run it on a machine that has Chrome before publishing:

```bash
cd films/dusk-open-steppe-rider && npx hyperframes@0.8.185 validate
```
