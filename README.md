# Dusk on the Open Steppe

A 20-second vertical anime short about Genghis Khan, drawn in HTML. Built with
[html-anime](https://github.com/blixvip/html-anime): a shot sheet, five skills,
and one code-drawn film. No video model, no editor timeline.

- **Watch:** [media/dusk-open-steppe-rider.mp4](media/dusk-open-steppe-rider.mp4) — 1080×1920, 24 fps, 20 s, voiceover and drone bed
- **Poster:** [media/dusk-poster.png](media/dusk-poster.png)
- **Frame sheet:** [media/dusk-contact-sheet.png](media/dusk-contact-sheet.png)
- **The sheet it was drawn from:** [films/dusk-open-steppe-rider/SHEET.md](films/dusk-open-steppe-rider/SHEET.md)

## The cut

Before the empire, there was only the steppe.

| # | Shot | Time | What it is |
| --- | --- | --- | --- |
| 1 | Establish | 0.0–3.0 | The steppe at dusk under a ringed moon. A rider on the far ridge. Camera 100→106%. |
| 2 | Approach | 3.0–6.0 | Cut closer. The archer, seen from behind, cloak moving. |
| 3 | Turn | 6.0–9.0 | The bow comes up, tipped back. Anticipation, then a hold. |
| 4 | **Sakuga** | 9.0–14.0 | The expensive shot, eight drawings: nock, raise, half draw, full draw, deeper, the release smear, recoil, settle. Camera locked. |
| 5 | Aftermath | 14.0–17.5 | Back to the wide. The rider holds the lifted bow. The moon at full vermilion. |
| 6 | Button | 17.5–20.0 | The close-up, one blink, and the line. |

Shot times sum to 20.00 s. One sakuga shot. Every hex is from the sheet's
`Vermilion eclipse` colour script: `#2a1016` sky, `#14080c` ink, `#ff3b3b`
accent, `#e8b8a8` skin, `#f6e4e4` line.

The line, verbatim, on the button shot: **I am the punishment of God.**

## Narration

| Time | Line |
| --- | --- |
| 0.20 | Before the empire, there was only the steppe. |
| 3.45 | Temujin. A boy with a bow. |
| 6.30 | Then the clans knelt. He became Genghis Khan. |
| 17.45 | I am the punishment of God. |

Under it: a 55 Hz drone, a filter-noise riser into the release, a whoosh on the
arrow, and low hits on every cut. Mixed to −14 LUFS. All of it is generated, so
the channel owns the audio outright.

## Rebuild it

```bash
npm install
npm run frames   # 480 PNG frames, deterministic, no browser needed
npm run film     # muxes frames + audio -> media/dusk-open-steppe-rider.mp4
npm run lint     # hyperframes lint on films/dusk-open-steppe-rider
```

The film is one file: [films/dusk-open-steppe-rider/index.html](films/dusk-open-steppe-rider/index.html).
Open it with `python -m http.server` and `npx hyperframes@0.8.185 preview` to
scrub it. Details of the offline renderer are in [tools/README.md](tools/README.md).

## Publishing notes

- Upload `media/dusk-open-steppe-rider.mp4` to YouTube Shorts. It is already
  9:16, 20 s, −14 LUFS, with faststart enabled.
- A title that matches the cut: *Dusk on the Open Steppe — the boy who became
  Genghis Khan*.
- The quote is the one traditionally attributed to him at Bukhara (1220). The
  film paraphrases the steppe years; keep the description honest about that.

## What is in the repo

- `skills/` — the five html-anime skills (direct, cel, timing, camera, render)
- `harness/compile.js` — logline to sheet
- `films/dusk-open-steppe-rider/` — this film, its audio and its sheet
- `films/roof/` — the reference short the skills point at, unchanged
- `tools/` — the offline frame renderer and the encoder
- `media/` — the MP4, poster and frame sheet

License: MIT (see [LICENSE](LICENSE-html-anime)). The font is Shippori Mincho,
SIL OFL 1.1; see `films/dusk-open-steppe-rider/fonts/NOTICE.txt`.
