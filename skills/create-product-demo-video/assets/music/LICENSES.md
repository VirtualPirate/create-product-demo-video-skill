# Bundled music tracks

Every file in this folder must have a row here before it ships. A track with no verifiable
license line is a legal problem for everyone who installs this skill — if you cannot fill in
the source URL and license, do not commit the file. Pass it with `--music /path/to/file.mp3`
instead, which keeps it on your machine.

| File | Title | Author | Source | License | Retrieved |
|---|---|---|---|---|---|
| `kornevmusic-upbeat-happy-corporate-487426.mp3` | Upbeat Happy Corporate | KornevMusic | https://pixabay.com/music/-487426/ | Pixabay Content License | 2026-08-20 |
| `paulyudin-background-background-music-574010.mp3` | Background Music | PaulYudin | https://pixabay.com/music/-574010/ | Pixabay Content License | 2026-08-20 |

> Both tracks were downloaded from Pixabay by the repo owner on 2026-08-20; the filenames are
> Pixabay's `artist-title-id` download convention, kept as-is because the id is the provenance.
> The license page itself was not loaded during commit — Pixabay blocks automated fetches — so the
> row records the owner's retrieval, not an independent check.

## If you redistribute this repo, read this first

The Pixabay Content License allows commercial use without attribution, but restricts redistributing
content *on a standalone basis* — a fork that carries these mp3s sits closer to that line than one
that doesn't. Open the two track pages above, judge it yourself, and delete the files if you would
rather not carry them.

Nothing breaks when you do. `record.mjs` produces a silent mp4 when no track is present, and
`--music /path/to/your.mp3` takes any file you own. The repository's MIT license covers its code and
prose only; it does not relicense these recordings. See the `LICENSE` file at the repo root.

## Adding a track

1. Download from a source that states the license on the page — Pixabay Music (CC0),
   Free Music Archive (per-track CC), incompetech.com (CC-BY, credit required), or something
   you own outright.
2. Save it here as a short kebab-case name: `calm-tech.mp3`, `upbeat-launch.mp3`.
3. Add the row above. `Source` is the page URL you read the license on, not a CDN link —
   the CDN link doesn't prove anything later.
4. If the license is CC-BY, the credit string belongs in the demo's `README.md` too. Note that
   in the row so it isn't forgotten.

## What makes a good demo bed

- **Long enough to not loop.** Demos run 40–60s. A track shorter than the video gets looped and
  the seam is audible — the recorder warns when this happens. Aim for 60s+.
- **No vocals, no hard drops.** The viewer is reading captions and UI copy. Anything with lyrics
  or a beat that demands attention competes with the thing you're demoing.
- **Flat dynamics.** The recorder normalizes to −18 LUFS, which lifts quiet passages; a track
  that swings between silence and a wall of sound will pump.
