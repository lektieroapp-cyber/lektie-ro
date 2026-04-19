# Mascot SVG files

Drop animal mascot SVGs in this folder. They're served as static files from
`/mascots/*.svg` and loaded by `components/mascot/Companion.tsx`.

## Naming convention

One SVG file per animal, using the type slug as filename:

```
public/mascots/
  lion.svg    → used when companion.type === "lion"
  fox.svg     → used when companion.type === "fox"
  owl.svg     → used when companion.type === "owl"
  bear.svg    → optional, add to COMPANIONS in components/mascot/types.ts
  rabbit.svg  → ditto
```

Slug must match `CompanionType` in `components/mascot/types.ts`. To add a
new animal: add the SVG file here, then add an entry to `COMPANIONS`.

## SVG requirements

- **Square viewBox** (e.g. `viewBox="0 0 104 104"`). The renderer scales
  the file to the requested size — a non-square file will look stretched.
- **No hard-coded width/height** on the root `<svg>` — or set them to
  `100%`. The wrapper sets dimensions via props.
- **No external references** (no `<image href="...">`, no external fonts).
  All paths / fills inline.
- **Transparent background** — the canvas cream (#F5F1EA) shows through.
- **Reasonable file size** — under 30 KB ideally. Run through
  [svgomg.net](https://jakearchibald.github.io/svgomg/) before committing.

## Mood variants (optional, future)

Currently the loader uses one file per animal regardless of mood. If you
later want per-mood expressions, add files named:

```
lion-happy.svg
lion-cheer.svg
lion-thinking.svg
...
```

And the loader will fall back from `{type}-{mood}.svg` → `{type}.svg`
automatically (wiring in `Companion.tsx`).

## What NOT to put here

- Non-mascot icons → `components/icons/*.tsx` (inline React SVG instead).
- Mascot with per-screen mood baked in → see "Mood variants" above.
- Bitmap files (PNG/JPG) — mascots must be vector.
