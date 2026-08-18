# Naga Film Gallery

A public-facing **movie-stills / TV-frame gallery** surface inside Naga Films Studio — a discovery & reference layer that duplicates the layout and UX of stillslab.com, built on the existing Next.js app on a branch (`feat/naga-film-gallery`). It does **not** touch the shipped generative `/studio` studios, credit packs, auth, or the Drizzle/Neon schema.

## Where it lives

- Route group: `app/(gallery)/` — shares the Next.js app shell but renders its own scoped gold/black design system (see `app/(gallery)/gallery.css`, wrapped under a `.nf` root so it never bleeds into the neon-green studio UI).
- Data: `lib/gallery/items.json` + `lib/gallery/data.js` — local JSON, no headless CMS in v1.
- Components: `components/gallery/` — `Header`, `Footer`, `Card`, `HeroCarousel`, `BrowseContent`, `FrameGrid`, `DiscoverClient`.

## Routes (match the real stillslab.com URL structure)

| Route | Purpose |
|---|---|
| `/film` | Home — 3-slide hero carousel, Community Showcase, Browse Content grid |
| `/film/movie` | Movies category |
| `/film/series` | Series category |
| `/film/music-video` | Music Videos category |
| `/film/commercial` | Commercials category |
| `/film/gallery/[slug]` | Title detail — backdrop header (director/cinematographer/runtime/genres/frame count) + 5-column infinite frame grid + lightbox |
| `/film/filter?search=` | Text search |
| `/film/discover` | Curated collections (Trending / Featured / New / Most Liked) |
| `/film/visual-search` | Placeholder — reverse-image search (labs) |
| `/film/news`, `/film/labs`, `/film/pricing`, `/film/contact` | Supporting pages |

Sign-in links into the existing `/login` flow; Request links into `/film/contact`. The gallery lives at `/film`; the studio landing at `/` links to it via the new "Film" nav item.

## Design system (stillslab editorial — scoped)

- Base `#0A0A0A`, surfaces `#141414` / `#252525`, gold accent `#E8BD2C`, white + muted gray, error `#FF4757`.
- System font stack only (no webfonts). Wide-tracking uppercase labels (`.3em`–`.5em`).
- Rounded cards, yellow active category pill, grid/full-width view toggle (yellow = active grid).

## Image sourcing — HARD RULE (honored)

**Only freely-licensed or original imagery. Naga Film never hosts copyrighted film frames.**

This gallery is seeded exclusively with:

1. **Original AI-generated cinematic stills** produced inside Naga Films Studio (Gemini image generation). These are original scenes — neo-noir alley, subway platform, spotlight stage, product hero — *not* frames from any real film. Licensed: original Naga Films work.
2. **CC0 / freely-licensed cinematic stock** from:
   - **Pexels** — Pexels License (free for commercial use, no attribution required).
   - **Unsplash** — Unsplash License (free for commercial use, no attribution required).
   - (Pixabay also permitted under its content license; not used in the initial seed.)

**Explicitly NOT used:** stillslab.com frames, frames from real copyrighted movies or TV shows, recognizable content from any studio film. The "titles" in the gallery (Naga Noir, Naga Transit, Naga - Frequency, Naga Aura) are original Naga Films productions, not real films — they exist to exercise the browse → detail → frame-grid UX.

### Credit & attribution

Per the Pexels and Unsplash licenses, attribution is not required but is appreciated. Where a still is clearly sourced from a photographer, the per-still `creditLine` field in `items.json` should record it. The initial seed uses anonymous/collective sources; add credits as the library grows.

## Data model

Verbatim field names mirror the real stillslab.com RSC payload so the structure is portable:

```jsonc
// Browse Content card
{ "id", "slug", "title", "type": "movie"|"series"|"music"|"commercial",
  "year", "link": "/gallery/[slug]", "thumbUrl", "aspect", "imageCount",
  "published", "locked", "director", "cinematographer", "runtime",
  "country", "genres": [], "synopsis", "stills": [] }

// Community Showcase project
{ "id", "slug", "title", "year", "typeLabel", "link": "/gallery/[slug]",
  "thumbUrl", "frameCount", "aspect" }

// Hero slide
{ "id", "title", "subtitle", "imageUrl", "buttonText", "buttonUrl", "showButton" }

// Discover collection
{ "id", "title", "creator", "stills", "likes", "followers", "tab", "thumb" }
```

## Stack

Built on the repo's existing stack — **Next.js 15 App Router, React 19, Tailwind 3.4, JavaScript**. No Tailwind v4, no TypeScript, no new dependencies, no `next.config.mjs` changes, no `package.json` changes. Gallery images are loaded via plain `<img loading="lazy">` (not `next/image`) so no `remotePatterns` config is needed and no existing config files are touched.

## Adding content

1. Add an entry to `lib/gallery/items.json` under `items` (and optionally `projects` for the showcase, `heroSlides` for the carousel, `collections` for Discover).
2. Drop a thumbnail + stills. Either reference a remote CC0/own-AI URL, or place files under `public/images/<type>/<slug>/` and reference `/images/...`.
3. The detail page, category filters, and search pick it up automatically — no code changes.

## Out of scope for v1

- Headless CMS (Sanity/Contentful) — local JSON only.
- Visual/reverse-image search backend — placeholder route.
- Tailwind v4 / TypeScript migration.
- Any change to the generative `/studio` studios, credit packs, auth, or the Drizzle/Neon schema.

---

© Naga Films / Naga Codex. Built on Open Generative AI · MIT.
