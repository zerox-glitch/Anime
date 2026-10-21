# Audio build — Dusk on the Open Steppe

Everything here is generated, not licensed: narration from TTS, the drone bed
from sine oscillators, the riser/whoosh/impacts from filtered noise. No outside
samples are used, so the channel owns the track.

The mix is 20 seconds, 48 kHz stereo, normalised to -14 LUFS / -1.5 dBTP
(YouTube's loudness target).

## Stems

| File | What it is | In the mix |
| --- | --- | --- |
| `vo-1.mp3` | "Before the empire, there was only the steppe." | 0.20 |
| `vo-2.mp3` | "Temujin. A boy with a bow." | 3.45 |
| `vo-3.mp3` | "Then the clans knelt. He became Genghis Khan." | 6.30 |
| `vo-5.mp3` | "I am the punishment of God." | 17.45 |
| `vo-mix.wav` | the four lines placed on the timeline | — |
| `bed.wav` | 55 Hz + 82.5 Hz drone, brown-noise air, slow tremolo | — |
| `riser.wav` | filtered white noise, 7.6 s to 11.2 s | — |
| `whoosh.wav` | pink noise burst at the release (11.22 s) | — |
| `impacts.wav` | 52 Hz hits at 0.02, 8.9, 11.3 and 17.45 s | — |
| `film-audio.wav` | the final 20 s mix | the MP4 |

## Rebuild

```bash
cd films/dusk-open-steppe-rider/audio

# 1. voice on the timeline
ffmpeg -y \
  -i vo-1.mp3 -i vo-2.mp3 -i vo-3.mp3 -i vo-5.mp3 \
  -filter_complex "\
[0:a]aresample=48000,aformat=channel_layouts=mono,adelay=200|200[v1];\
[1:a]aresample=48000,aformat=channel_layouts=mono,adelay=3450|3450[v2];\
[2:a]aresample=48000,aformat=channel_layouts=mono,adelay=6300|6300[v3];\
[3:a]aresample=48000,aformat=channel_layouts=mono,adelay=17450|17450,volume=1.12[v4];\
[v1][v2][v3][v4]amix=inputs=4:normalize=0,highpass=f=85,lowpass=f=9000,\
acompressor=threshold=-18dB:ratio=3:attack=8:release=160,apad=pad_dur=1[vo]" \
  -map "[vo]" -t 20 -c:a pcm_s16le vo-mix.wav

# 2. bed
ffmpeg -y -f lavfi -t 20 -i "sine=frequency=55:sample_rate=48000" \
  -f lavfi -t 20 -i "sine=frequency=82.5:sample_rate=48000" \
  -f lavfi -t 20 -i "anoisesrc=color=brown:sample_rate=48000:amplitude=0.6" \
  -filter_complex "[0:a]volume=0.34[a0];[1:a]volume=0.14[a1];[2:a]lowpass=f=110,volume=0.16[a2];\
[a0][a1][a2]amix=inputs=3:normalize=0,tremolo=f=0.14:d=0.35,\
afade=t=in:st=0:d=2.6,afade=t=out:st=17.4:d=2.6[bed]" \
  -map "[bed]" -t 20 -c:a pcm_s16le bed.wav

# 3. riser, whoosh, impacts (see the git history for the exact generators) and

# 4. the mix
ffmpeg -y -i vo-mix.wav -i bed.wav -i riser.wav -i whoosh.wav -i impacts.wav \
  -filter_complex "\
[0:a]volume=1.5[vo];[1:a]volume=1.15[bed];[2:a]volume=0.9[ris];\
[3:a]volume=1.0[wh];[4:a]volume=1.6[imp];\
[vo][bed][ris][wh][imp]amix=inputs=5:normalize=0:duration=longest,\
highpass=f=32,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11,\
aresample=48000,aformat=channel_layouts=stereo[out]" \
  -map "[out]" -t 20 -c:a pcm_s16le film-audio.wav
```
