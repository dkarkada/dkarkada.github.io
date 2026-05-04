# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # local dev server (no type-checking)
pnpm checkdev         # dev server with astro type-checking
pnpm build            # type-check + build + LQIP generation (used before deploy)
pnpm preview          # preview production build locally
pnpm lint             # run ESLint
pnpm lint:fix         # run ESLint with auto-fix
pnpm new-post <path>  # scaffold a new post, e.g. pnpm new-post blog/2026-05-01-my-title
pnpm format-posts     # auto-format existing post frontmatter
pnpm update-theme     # merge upstream theme changes
```

**Deploying:** run `./deploy.sh` — it builds the site and force-pushes the `dist/` output to the `gh-pages` branch on GitHub, which serves the live site at dkarkada.xyz. The working branch (`main`/`refactor`) is the source; `gh-pages` is build output only.

## Architecture

This is an **Astro 5** static blog with plain CSS and React for interactive islands.

### Content

All posts live under `src/content/posts/` organized into subdirectories (`blog/`, `guides/`). Images shared across posts go in `src/content/posts/_images/`. Posts are Markdown or MDX with this frontmatter:

```yaml
title: string          # required
published: date        # required
description: string    # optional
tags: string[]         # optional
draft: boolean         # hides from production
hidden: boolean        # hides from listing but still accessible by URL
pin: 0–99             # higher = pinned higher in list
abbrlink: string       # custom URL slug (overrides filename-based slug)
toc: boolean           # table of contents
lang: string           # locale override
```

### Routing

Dynamic routes are in `src/pages/`:
- `[...posts_slug].astro` — individual post pages
- `[...index].astro` — paginated post list
- `[...tags].astro` / `[...tags_tag].astro` — tag index and per-tag pages
- `[lang]/` — localized variants
- `rss.xml.ts` / `atom.xml.ts` — feeds
- `og/` — OG image generation

### Config

All site-wide configuration (title, colors, nav, features, social links) is in `src/config.ts` as a single `themeConfig` object. This is the single source of truth consumed by both Astro and the build scripts.

### Markdown pipeline

`astro.config.ts` registers several custom remark/rehype plugins from `src/plugins/`:
- `remark-admonitions` — `:::note`, `:::warning`, etc. directives
- `remark-github-card` — GitHub repo card embeds
- `remark-reading-time` — injects reading-time into frontmatter
- `rehype-code-copy-button` — adds copy button to code blocks
- `rehype-img-to-figure` / `rehype-unwrap-img` — wraps `<img>` in `<figure>` with caption support

KaTeX is enabled globally (math blocks via `remark-math` + `rehype-katex`).

### LQIP (Low-Quality Image Placeholders)

`scripts/generate-lqip.ts` scans built HTML for images and generates blur placeholders; `scripts/apply-lqip.ts` injects them. Both run automatically as part of `pnpm build`.

### Styling

Plain CSS (no UnoCSS/Tailwind). Styles live in `src/styles/`:
- `theme.css` — CSS variables for colors, fonts, spacing (driven by `themeConfig`)
- `global.css` — base/reset styles
- `markdown.css` — prose styles for post content
- `anim.css` / `transition.css` — animations and page transitions
