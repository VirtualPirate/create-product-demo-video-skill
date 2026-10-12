# create-product-demo-video

A Claude Code skill that records a **product demo video of a real user flow in your own web app** —
no screen recorder, no editor, no staging environment.

Claude reads the actual routes, components, design tokens and copy out of your repo, transcribes
them into a self-playing HTML demo, and records that to mp4 with Playwright + ffmpeg. You describe
the flow in a sentence; you get back a 40–60s clip you can drop in a launch tweet, a changelog, or a
support doc.

```
/create-product-demo-video connecting a data source and getting the first report
```

```
your repo ──read routes & components──▶ demo/v1/index.html ──Playwright──▶ .webm
                                                                             │
                                                    music bed ──ffmpeg mux──▶ .mp4  (+ .gif)
```

## The one rule that makes it worth using

**Every screen is a transcription of the real UI, not an impression of it.**

A demo that invents layout, copy or components is worse than no demo — it teaches viewers a product
that doesn't exist, and the first person who actually signs up spots it in a second. So the skill
spends most of its budget reading source, not writing markup: the route file, the components it
renders, the shared shell, the design-system primitives, and anything that *generates* strings the
demo shows. Product copy is copied verbatim. Derived values — a hashed avatar colour, a slug, a
relative timestamp — are produced by running your app's own helper, not chosen by eye.

That constraint is the whole skill. Everything below is machinery in service of it.

## Install

### Claude Code — plugin (recommended)

Two separate commands. Run the first, let it finish, then run the second — if
`/plugin marketplace add` opens a prompt asking for a source, that prompt wants the
`owner/repo` on its own, nothing else.

```
/plugin marketplace add VirtualPirate/create-product-demo-video-skill
```

```
/plugin install create-product-demo-video@virtualpirate-demo-video
```

Updates arrive with `/plugin update create-product-demo-video`.

### Any agent — clone and link

Works for Claude Code, Codex and Cursor, which all read `SKILL.md` folders.

```bash
git clone https://github.com/VirtualPirate/create-product-demo-video-skill
cd create-product-demo-video-skill
./install.sh              # symlink into whichever of ~/.claude ~/.codex ~/.cursor exist
./install.sh --project    # or scope it to one project, from that project's root
./install.sh --copy       # copy instead of symlink
```

Symlinks track the clone, so `git pull` updates the skill in place.

### Manual

```bash
cp -R skills/create-product-demo-video ~/.claude/skills/
```

Restart the agent after any of these.

## Requirements

| Need | Why | Install |
|---|---|---|
| `ffmpeg` + `ffprobe` | Encode the mp4, mux the music, read durations for the fade-out | `brew install ffmpeg` · `sudo apt install ffmpeg` · `winget install Gyan.FFmpeg` |
| Playwright + Chromium | Captures the page at real time, so your CSS transitions are what you see | `pnpm add -D playwright && pnpm exec playwright install chromium` |
| Node 18+ | Runs the recorder | — |

Playwright is not a dependency of this repo. `record.mjs` resolves whichever copy is already on the
machine — the repo you're demoing, `~/.claude`, or a global install — and prints the install command
if it finds none.

## Use

Ask in plain English ("record a demo of onboarding") or invoke it directly:

```
/create-product-demo-video signing up and inviting a teammate
/create-product-demo-video connecting a data source and getting the first report
/create-product-demo-video the bulk-edit flow, as a gif for the changelog
```

Vague prompts don't block on questions — the skill picks the narrowest complete flow that ends in
visible value, says which one it picked, and builds it.

### What lands

```
demo/v1/
├─ index.html            the demo itself — open it in a browser, press R to replay
├─ record.mjs            this version's recorder
├─ music.mp3             the bed, copied in so v1 stays re-recordable forever
├─ README.md             scene table, which source file each screen came from, what it skips
└─ out/
   ├─ product-demo.mp4   1280×800, 30fps, +faststart
   ├─ product-demo.webm  raw silent capture
   └─ product-demo.gif   with --gif, 900px wide
```

Each run makes a **new** `demo/vN/` — earlier versions are never overwritten, and `record.mjs` is
copied per version so an old cut can always be re-recorded exactly as it was.

### Recording flags

```bash
node demo/v1/record.mjs                    # uses demo/v1/music.* if present, silent if not
node demo/v1/record.mjs --gif              # also emit a 900px gif (no audio track)
node demo/v1/record.mjs --music ~/bed.mp3  # explicit track wins over the sibling
node demo/v1/record.mjs --music-db -4      # quieter bed
node demo/v1/record.mjs --no-music         # silent even with a sibling track
```

## Caption styles

Four ship in the skeleton; switching is one constant, and `index.html` replays on `R` so you can
compare all four in a browser without recording anything.

| `CAPTIONS.style` | What it is | Pick it when |
|---|---|---|
| `pill` *(default)* | Ink capsule, bottom centre | Anything short and marketing-facing. Least occlusion |
| `lower-third` | Left block with step index and progress track | Longer flows; most legible in a gif |
| `rail` | 68px band under the window, chapter dots | Docs and support clips where nothing may be covered |
| `coach` | Callout anchored to the element in play, rest dimmed | Follow-along walkthroughs |

## Zoom

Optional camera push-in on a small control, such as a short input, a toggle or a generated value.
Before building, the skill asks whether to zoom on key moments or not at all. It skips the question
when your prompt already asks for zoom or says no zoom. In `play()`, `zoom('#sel')` pushes in and
`zoom()` eases back out. The pointer stays full size and follows the zoomed content.

## Music

Optional and off unless a track is there — Playwright captures no audio at all, so the bed is muxed
in at encode time and never touches the demo page. Before building, the skill asks which bundled
track to use or **No music**. It skips the question when your prompt already names a track or file,
or says no music.

Two beds ship in `assets/music/`. Every track is driven to −18 LUFS with a −1.5 dB true-peak ceiling,
so swapping beds between versions needs no hand-tuning, and fades (1.5s in, 2.5s out) are timed off
the real video duration. Bring your own with `--music`.

A dropped audio stream is invisible in a frame check, so `record.mjs` asserts the stream exists after
encoding rather than trusting the mux.

## Credits

Bundled audio, redistributed under the [Pixabay Content License](https://pixabay.com/service/license-summary/):

- **Upbeat Happy Corporate** — KornevMusic — <https://pixabay.com/music/-487426/>
- **Background Music** — PaulYudin — <https://pixabay.com/music/-574010/>

Both retrieved 2026-08-20. If you fork or mirror this repo, check those track pages yourself — the
Pixabay license restricts redistributing content on a standalone basis. Deleting the mp3s costs you
nothing: the recorder runs silent without them. Full provenance in
[`assets/music/LICENSES.md`](skills/create-product-demo-video/assets/music/LICENSES.md).

## License

[MIT](LICENSE) for the code and documentation. The bundled mp3s are **not** MIT — they stay under
the Pixabay Content License, as spelled out in [`NOTICE`](NOTICE).
