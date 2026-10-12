---
name: create-product-demo-video
description: "Produce a product demo video of a user flow in whatever web app the repo contains — a self-playing HTML demo transcribed from the real UI, recorded to mp4 with Playwright + ffmpeg, optionally over a music bed. Use when asked to create, record, or update a product demo, walkthrough video, screen recording of a flow, launch/marketing clip, or a GIF of a feature. Takes a prompt describing what should happen (e.g. 'signing up and inviting a teammate', 'connecting a data source and getting the first report')."
user-invocable: true
---

Build a demo video of the flow the user described. Output lands in a **new** `demo/vN/` folder.

**The one rule that matters: every screen is a transcription of the real UI, not an impression of it.**
A demo that invents layout, copy, or components is worse than no demo — it teaches viewers a
product that doesn't exist. Read the source for each screen before writing any markup for it.

## Inputs

`/create-product-demo-video <what should happen>` — a flow description. If it is vague ("show off
the product"), pick the narrowest complete flow that ends in visible value, say which one you
picked in one line, and build it. Don't block on questions — music, zoom and format are the
exceptions.

**Ask about music, zoom and format before step 1, unless the prompt already settles them.** Put
every open question in one `AskUserQuestion` call where the harness has it; elsewhere, ask in chat
and wait for the answer. Ask once, then build without stopping.

- **Music** — one option per track listed in `assets/music/LICENSES.md` (title — author) plus a
  **No music** option. A free-text answer may be a path to the user's own file. Settled when the
  prompt names a track or a music file, or says no music / silent / without audio. "With music"
  alone names no track, so it still gets the question.
- **Zoom** — **Zoom on key moments** (you pick the 1–3 small controls the flow hinges on) or
  **No zoom**. A free-text answer names what to zoom on. Settled when the prompt asks for zoom,
  close-ups or punch-ins, or says no zoom. See [Zoom](#zoom).
- **Format** — **16:10** (default; docs, product pages), **16:9** (YouTube, slides), **9:16**
  (Reels, Shorts, TikTok) and **1:1** (LinkedIn, X feed). A free-text answer may be `4:5`. Settled
  when the prompt names a ratio, or a target that implies one: YouTube or widescreen → `16:9`,
  vertical, Reels, Shorts, TikTok or stories → `9:16`, square → `1:1`, portrait feed post → `4:5`.
  See [Format](#format).

## Steps

1. **Map the flow to routes.** Turn the prompt into an ordered list of real routes the user would
   pass through. Find the router first — a `routes/` directory, an `app/` tree, a `<Routes>` block,
   a route manifest — and list only paths that exist. If the flow needs an entity that must be
   created before a later screen can exist (a project before a project-scoped report), either
   include that screen or pick a scope that doesn't need it — don't skip a required step silently.

2. **Read the source for every screen.** For each route: the route file, the components it renders,
   the app's shared layout components (shell, page header, empty state), and its design-system
   primitives (`components/ui/` or wherever they live). Also read anything that *generates* strings
   the demo shows — preview helpers, derived names, backend render/template services. Copy strings
   verbatim; do not paraphrase product copy.

3. **Scaffold.** `mkdir -p demo/vN` (next unused N — **never overwrite an existing vN**), then copy
   `assets/skeleton.html` → `demo/vN/index.html` and `assets/record.mjs` → `demo/vN/record.mjs`.
   `assets/` sits next to this `SKILL.md`, wherever the skill is installed — a plugin cache dir,
   `~/.claude/skills/`, or a project's `.claude/skills/`. Resolve it from the skill's own directory,
   never from the repo being demoed. The skeleton carries a placeholder shell, a token scale, and
   the playback engine.
   If the music answer picked a track, copy it → `demo/vN/music.<ext>` (bundled tracks come from
   `assets/music/`); for **No music**, copy nothing — see [Music](#music). Copying it in (rather than referencing the skill folder) is what keeps `vN/`
   re-recordable later, the same reason `record.mjs` is copied per version.

4. **Fit the skeleton to this product.** Everything marked `REPLACE:` is a placeholder that must be
   swapped before any scene is written, because every screen inherits it:
   | In `index.html` | Replace with |
   |---|---|
   | `PRODUCT` | The app's name, the host its address bar shows, and its real logo svg |
   | `NAV` | The sidebar transcribed from the real nav — same sections, same order, same labels |
   | `TOPBAR` | The real topbar; delete controls the app doesn't have |
   | `:root` tokens | The `:root` block from the app's stylesheet, so colour/radius/type match |
   | `ICONS` | Path data from the icon set the app actually uses |
   Delete the optional CSS blocks (third-party screen, delivery panels) the flow doesn't use.
   Set `FORMAT` at the top of the script to the format answer before writing any scene — every
   screen is laid out at that stage size.

5. **Write the scenes.** One `<section class="scene" data-scene="N">` per screen, in order. Reuse
   the skeleton's CSS classes (`.pagehead`, `.card`, `.btn`, `.seg`, `.opt`, `.chip`, `.scopeid`,
   `.statusbadge`, `.empty`, `.input`, `.pillbar`, `.toast`) — they are shaped like the output of a
   Tailwind/shadcn-style system, so check each against the real component's classes and adjust
   rather than assume. Add new CSS only for a component the skeleton lacks, and derive it from that
   component's actual classes.

6. **Write `play()`.** Title card → screens → outro. Use captions to name each step, and set
   `CAPTIONS` at the top of the script — the style, and `steps` = how many `say()` calls the run
   makes. Interactions go through the pointer helpers so the viewer can follow what's being clicked.
   If the zoom answer was yes, wrap the chosen moments in `zoom(sel)` … `zoom()`.

7. **Record.** `node demo/vN/record.mjs` → `demo/vN/out/product-demo.mp4`, at the size `FORMAT`
   names. Add `--gif` for a gif 900px on its long side. A `demo/vN/music.*` file is picked up
   automatically; `--music <path>` points at one elsewhere, `--music-db <n>` shifts the level,
   `--no-music` forces silence.

8. **Verify by looking.** Extract frames and *read the images* — this is not optional, it is how
   layout bugs get caught:
   ```bash
   for t in 5 12 20 28 36 44; do ffmpeg -y -loglevel error -ss $t \
     -i demo/vN/out/product-demo.mp4 -frames:v 1 /tmp/f$t.png; done
   ```
   Check: no oversized icons, nothing clipped at the fold, the pointer lands on the element it
   claims to click, text isn't collapsed onto one line. Fix and re-record until clean.

   **Frames cannot show you the audio.** On a scored demo, also check the stream and the ramps —
   `volumedetect` logs at info level, so `-v error` would swallow its output:
   ```bash
   ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,duration \
     -of default=nw=1 demo/vN/out/product-demo.mp4
   for w in "-ss 0 -t 0.25" "-ss 12 -t 0.5" "-sseof -0.25"; do \
     ffmpeg -hide_banner -nostats $w -i demo/vN/out/product-demo.mp4 \
       -af volumedetect -f null - 2>&1 | grep mean_volume; done
   ```
   Expect an `aac` stream within ~0.05s of the video duration, `max_volume` below 0 dB, and the
   head and tail means well under the middle one — that is the fade proving it ran.

9. **Write `demo/vN/README.md`** — scene table with routes, the source-file mapping, duration, the
   `CAPTIONS` style, format, music track and zoom moments the version was recorded with, and what
   the flow deliberately skips. Update `demo/README.md` to list the new version.

Report the path, duration and size, then open the mp4 so the user can watch it — `open` on macOS,
`xdg-open` on Linux, `start` on Windows.

## Engine API

Available inside `play()`:

| Call | Effect |
|---|---|
| `scene(n)` | Cross-fade to scene `n`, update the address bar from `URLS` |
| `tap(sel, ms)` | Move pointer to element and click it (ripple + press) |
| `moveTo(sel, ms)` / `click(sel)` | The two halves, when you need state changes between them |
| `hideCursor()` / `place(x, y, 0)` | Reset the pointer when entering a scene |
| `say(text, opts?)` / `hush()` | Caption in/out. `{ at: sel }` anchors a `coach` caption; `{ step: n }` forces the index |
| `zoom(sel, k?, ms?)` / `zoom()` | Push the camera in on an element (default `1.6`×, `900`ms); no target eases back out |
| `type(el, text, ms)` | Character-by-character typing into a `<span>` |
| `wait(ms)` | Hold |
| `reveal(el)` | Auto-called by `moveTo` — smooth-scrolls `.main` so off-fold targets are visible |

Set `window.__demoDone = true` at the end (the skeleton already does) — the recorder waits on it.

## Caption design

`const CAPTIONS = { style: 'pill', steps: 6 }` sits with `URLS` at the top of the engine. All four
styles ship in the skeleton; `say()` is the same call whichever is on. Pick per video:

| `style` | What it is | Pick it when |
|---|---|---|
| `pill` *(default)* | Ink capsule, bottom centre | Anything short and marketing-facing. Least occlusion, ~10 words per caption |
| `lower-third` | Left-anchored block with step index + progress track | Longer flows where the viewer should feel the sequence; most legible in a gif |
| `rail` | 68px band under the window, chapter dots | Docs and support clips where nothing may be covered. Costs app height — see below |
| `coach` | Callout anchored to the element in play, rest dimmed | Follow-along walkthroughs. Every caption needs `{ at: sel }`; ones without fall back to `pill` |

`steps` drives the index, the progress track and the rail's dots — count the `say()` calls and set it,
or the run ends reading `05 / 06`. Unsure which style? Open `index.html` in a browser and switch
`CAPTIONS.style` — the page replays on `R`, so all four can be compared without recording.

## Zoom

Optional, and off unless the zoom answer asked for it. `zoom(sel)` scales the live scene so `sel`
sits mid-frame, clamped so the scene's edges never show; `zoom()` eases back to the full frame.
The pointer, ripple and captions stay full size, and the pointer is carried along with the content
under it, so `tap()` and `click()` land correctly while zoomed.

```js
await zoom('#invite-email');        // push in on the field
await tap('#invite-email');
await type($('#invite-email'), 'sam@acme.dev');
await wait(1000);                   // hold so the viewer reads it
await zoom();                       // back out before the next step
```

- **Zoom where the frame is too small to read** — a short input, a toggle, a status badge, a
  generated value. Never on a full-page change; the viewer needs the whole screen for that.
- **1–3 per video.** A push-in on every click reads as motion sickness, not emphasis.
- **`k` 1.4–2.** Past 2× the viewer loses where on the page they are.
- **Hold ≥1s at full zoom**, and `zoom()` out before a target outside the zoomed frame. `scene(n)`
  resets the camera, so the next screen always opens at full frame.

## Format

`const FORMAT = '16:10'` sits at the top of the script. It sets the stage size the app is laid out
at, and `record.mjs` reads it off the page, so the mp4 comes out at the right size with no flag.

| `FORMAT` | Stage (CSS px) | mp4 | For |
|---|---|---|---|
| `16:10` *(default)* | 1280×800 | 1280×800 | Docs, product pages, changelogs |
| `16:9` | 1280×720 | 1920×1080 | YouTube, slides |
| `1:1` | 900×900 | 1080×1080 | LinkedIn and X feeds |
| `4:5` | 864×1080 | 1080×1350 | Instagram and LinkedIn portrait posts |
| `9:16` | 720×1280 | 1080×1920 | Reels, Shorts, TikTok |

The recorder opens its window at the mp4 size and `fit()` scales the stage up into it, so text is
drawn sharp at the output size, not upscaled. A narrow stage keeps the UI big enough to read on a
phone; a 1080px-wide desktop layout would leave every label too small to read there.

- **Narrow stages cross the app's breakpoints.** 900px and under is below most apps' `lg`, and
  720px is below `md`. Read the responsive classes (`md:flex`, `lg:w-64`, a `useMediaQuery`) and
  transcribe what the app renders at that width — a collapsed sidebar, a menu button, stacked
  columns. Never squeeze the desktop shell into a narrow frame; that layout doesn't ship.
- **Short captions on `9:16`.** The pill wraps at half the stage width, so ~6 words per caption.
- **Previews letterbox.** `index.html` scales the stage to fit the browser window, so a
  tall format previews letterboxed — that is expected, the mp4 has no bars.

## Music

Optional, and off unless a track is there. The bed is muxed at encode time — Playwright captures no
audio at all, so nothing about it touches the demo page or the engine.

```
node demo/vN/record.mjs                      # uses demo/vN/music.* if present, silent if not
node demo/vN/record.mjs --music ~/beds/x.mp3  # explicit path wins over the sibling
node demo/vN/record.mjs --music-db -4        # quieter bed
node demo/vN/record.mjs --no-music           # silent even with a sibling track
```

- **Bundled tracks live in `assets/music/`**, one row per file in its `LICENSES.md`. No track ships
  without a verifiable CC0/CC-BY line — an unlicensed mp3 is everyone-who-installs-this's problem,
  not just yours. Unsure? Keep it off-repo and pass `--music <path>`.
- **Level is normalized, not set.** Every track is driven to −18 LUFS with a −1.5 dB true-peak
  ceiling, so beds swapped between versions match each other without hand-tuning. `--music-db`
  shifts that target; it does not add gain on top.
- **Fades are automatic** — 1.5s in, 2.5s out, the out timed off the real video duration.
- **Pick a track longer than the video.** Anything shorter gets looped and the seam is audible; the
  recorder warns when it has to. 60s+ covers a normal 40–60s demo.
- **No vocals, no hard drops.** The viewer is reading captions and UI copy at the same time.
- **Audio lands in the mp4 only.** The webm is the raw silent capture, and a gif has no audio track
  at all — a music-only change is invisible in `--gif` output.

## Conventions

- **Stage is a mock browser at the `FORMAT` size** — 1280×800 by default; 44px of the height is
  browser chrome, leaving 1280×756 for the app. The skeleton ships a 48px topbar, a 240px sidebar
  and a 1152px page — measure the real shell and change them if it differs. Content longer than the
  fold scrolls, same as the app. `CAPTIONS.style = 'rail'` is the exception — it takes another 68px
  for the band, so pages reach the fold sooner.
- **Pace:** ~2.8s title, 3–6s per screen, 1s+ hold after a state change so the viewer registers it.
  40–60s total. Rushed beats long, but never cut a hold below ~800ms.
- **`data-active` on the sidebar** must name the `NAV` id for the route being shown.
- **Sample data must be internally consistent, and derived values must actually be derived.**
  Totals sum to their parts, a count matches the list it counts, and anything the app computes —
  an avatar colour hashed from a name, an initial, a relative timestamp, a slug — is produced by
  running the app's own helper on the exact string the demo shows, not chosen by eye. Lift the
  helper out and run it:
  ```bash
  # example: an app whose avatar colour is hashed from the entity name
  node -e 'const f=s=>{let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0}
    return `hsl(${Math.abs(h)%360}deg 65% 55%)`};console.log(f("acme-robotics"))'
  ```
- **Third-party screens** (an OAuth consent page, a chat message, an email) get that product's
  styling, not yours. For anything the backend renders rather than the UI — a notification, an
  email body, an exported file — find the service or template that renders it and match that
  output, not what the app's own components would produce.
- **Captions state what is happening**, not what the product is worth. No marketing voice mid-flow;
  save the claim for the title and outro cards. `coach` is tighter still — a 330px card wants six
  words, so write the caption as an instruction.

## Pitfalls (all of these have bitten)

- **Inline `svg()` icons render huge** unless a CSS rule sizes them. Every container that holds an
  icon needs `width`/`height` on its `svg` — `.btn svg`, `.sb-item svg`, `.sb-label svg`,
  `.cmdk svg` are already handled; new containers are not.
- **Clicking below the fold** puts the pointer off-canvas. `moveTo` scrolls first, but only inside
  `.main` — targets outside a `.main` must fit on screen.
- **Multi-paragraph prose** needs `white-space: pre-wrap`, matching the app's `whitespace-pre-wrap`.
  Without it, paragraphs collapse into one block.
- **`record.mjs` overwrites `out/` in place.** New version → new folder. Never re-point an existing
  version's recorder at different content.
- **A silent mp4 looks identical in frames.** If the mux drops the stream the video still checks out
  scene by scene, which is why `record.mjs` asserts the audio stream after encoding and step 8 probes
  it. Never call a scored demo done off the frames alone.
- **A `coach` caption measures the live element**, so `say(text, { at })` goes *after* `moveTo()` has
  scrolled the target into view — before it, the callout lands on the pre-scroll position.
  Same with `zoom()`: a coach caption shown before the zoom stays at the old position, so call
  `say(text, { at })` after it.
- **`lower-third` owns the lower-left corner** of every frame. Compose scenes around it, or a table's
  first row spends the whole demo behind the caption block.

## Requirements

`ffmpeg` and `ffprobe` (same install — `ffprobe` reads the durations the fade-out and the loop
warning are timed off), and a Playwright with Chromium. Playwright is not a repo dependency —
`record.mjs` resolves whichever copy is on the machine and prints the install command if there is
none.

```bash
# ffmpeg — ffprobe ships with it
brew install ffmpeg                    # macOS
sudo apt install ffmpeg                # Debian/Ubuntu
winget install Gyan.FFmpeg             # Windows

# Playwright + Chromium — any one, in the repo being demoed or installed globally
pnpm add -D playwright && pnpm exec playwright install chromium
npm  i  -D playwright && npx  playwright install chromium
yarn add -D playwright && yarn playwright install chromium
```

Confirm both before the first record — `ffmpeg -version` and `node -e "require('playwright')"`.
Either failure otherwise surfaces late, after the capture has already run.

## Why step 2 is the whole skill

A demo built without reading the source looks fine and matches nothing: the sidebar carries
sections the app doesn't have, the empty state invents its own copy, the pointer clicks a button
nobody shipped. It passes every check except the one that matters, and the first person who
actually uses the product spots it in a second. Budget most of the build for reading, not markup.

If `demo/` already holds earlier versions, read the newest `index.html` before scaffolding — it is
the closest thing to a house style for this app, and its `README.md` names the source each screen
was transcribed from.
