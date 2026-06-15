# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Midnight Keys is a gothic-themed browser piano + rhythm game built with **zero dependencies and no build step** — vanilla HTML, CSS, and JS served as static files. There is no package.json, bundler, test suite, or linter.

## Running

Open `index.html` directly, or serve the folder over HTTP (needed only if a browser blocks the Google Fonts/AudioContext under `file://`):

```
python3 -m http.server 8000   # then open http://localhost:8000
```

Audio (Web Audio API) only initializes on the first user gesture (`ensureAudio()`), so notes are silent until a key is pressed or Start is clicked — this is expected, not a bug.

## Architecture

Everything lives in [app.js](app.js); state is module-level globals, not classes.

**Two coupled subsystems share one input path.** A keypress or pointer-down on a key calls `handlePianoInput()`, which does two independent things: `playNote()` (synth) and `tryHitEnemy()` (game scoring). The synth works with the game stopped; the game scores only while `game.running`.

- **Synth engine** — `INSTRUMENTS` defines each voice as a set of additive oscillator `partials` (type/ratio/gain/detune) plus an ADSR `envelope`. `playNote()` builds an oscillator graph per note into a per-voice gain → `masterGain` → destination. Voices are tracked in `activeVoices` keyed by the keyboard key, so a key already sounding won't retrigger. The `cathedral` instrument additionally routes through a feedback `cathedralDelay` for reverb. `stopNote()` ramps the release (longer when the Sustain toggle is on).

- **Rhythm game** — `SONGS` are arrays of keyboard-key letters; `LEVELS` set tempo/difficulty. `startGame()` kicks off a `requestAnimationFrame` loop (`updateGame`) driven by `performance.now()`. `noteTime(index, level)` is the single source of truth for when note N is due (spacing + per-phrase gap + swing on beats 3/7) — it's used both to schedule spawns and to set each enemy's `spawnTime`. Enemies (bats) descend the `#stage`; `tryHitEnemy()` scores a hit when an enemy's `progress` is within `level.hitWindow` of `HIT_PROGRESS` (0.88), and `updateGame` auto-misses past `MISS_PROGRESS` (1.08).

**Note model.** `NOTE_LAYOUT` is the canonical map binding a computer key → musical note → `semitone` → white/black type, spanning one octave plus the top C (keys `a`–`k` with black keys on `w e t y u`). `frequencyFor(semitone, octave)` converts to Hz via MIDI. The octave is read live from the `#octave` control, so held notes use whatever octave was set at press time.

**DOM contract.** Controls and containers are looked up once by ID at the top of [app.js](app.js) (`#keyboard`, `#stage`, `#start-game`, `#volume`, `#octave`, `#level`, `#song`, `#instrument`, `#sustain`). `buildKeyboard()` generates the key buttons from `NOTE_LAYOUT` (white keys first, then black) — keys are not authored in HTML. Note that `app.js` also references `#score`, `#combo`, and `#game-status` elements that do not currently exist in [index.html](index.html); the scoreboard-update calls are guarded with null checks, so scoring runs but is not displayed until those elements are added.

## Conventions

- Adding an instrument: add an entry to `INSTRUMENTS` **and** an `<option>` to the `#instrument` select in [index.html](index.html). Set `destination: "cathedral"` to route through reverb, otherwise `"dry"`.
- Adding a song: add an array of `NOTE_LAYOUT` key letters to `SONGS` **and** an `<option>` (under the right `<optgroup>`) to `#song`. Songs are phrased in groups of 8 notes (see `noteTime`).
- Styling is plain CSS in [style.css](style.css) using CSS custom properties; enemy position/scale are passed from JS via `--x`/`--y`/`--scale` style properties.
