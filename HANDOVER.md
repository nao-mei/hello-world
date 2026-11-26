# Handover: maintaining and launching the portfolio site

Written for a new maintainer (person, model or account) who has never seen this project. It is safe to keep in the repo: it contains no banned terms, no private background and no client information. Owner-only context lives in a separate private file (see "What is NOT in this repo").

Read `CLAUDE.md` first (hard confidentiality rules), then this file. To change any words on the site, use `COPY-MAP.md`, which maps each page section to the file that holds its copy.
## 1. Purpose

A static personal portfolio that *demonstrates* the owner's ideas rather than listing a CV. The site itself is the argument:

- Everything is connected, and people matter as much as technology.
- Design for different people; diverse minds do brilliant things.
- Try things, keep going, learn from what fails, share it.
- AI is about people. Do the right thing.

Audience: hiring managers, clients, peers and collaborators who arrive cold, often on a phone. They should understand within seconds who the owner is, what they care about and what they build.

## 2. Structure of the site

Home is a front door; three numbered ideas lead to three pages, each with a shape (circle, square, triangle) from the hero object.

| Page | Route | File | Idea |
|---|---|---|---|
| Home | `/` | `src/pages/index.astro` | Hero (dot-matrix name, turning object), three idea tiles, "What I stand for" |
| 01 Every angle | `/career/` | `src/pages/career.astro` | Career as "what each role taught me", credentials. The only page that names the current employer |
| 02 Build it with people | `/making/` | `src/pages/making/index.astro` | The build loop, four example cards |
| Case studies | `/making/<slug>/` | `src/pages/making/*.astro` using `src/layouts/Case.astro` | One page per example |
| 03 Fits more minds | `/minds/` | `src/pages/minds.astro` | Inclusion, accessibility, recognition |

Shared: `src/layouts/Base.astro` (header, nav, footer, theme toggle, command palette), `src/styles/tokens.css` (colour tokens, dark by default, optional light theme), `src/styles/global.css`.

## 3. Stack and how to run it

Astro 7 (static output) + strict TypeScript + Svelte 5 islands. No backend, no analytics, no third-party requests at runtime (fonts self-hosted via `@fontsource`). Dependencies are exact-pinned; Node 22+.

```bash
npm install          # also sets core.hooksPath to .githooks
npm run dev          # local dev server
npm run build        # static build into dist/
npm run check        # astro check (types)
npm run lint:banned  # banned-terms lint (needs the list, see section 5)
npm run test:contrast
npm run test:a11y    # pa11y-ci; needs `astro preview --port 4321` running
```

Config: `astro.config.mjs` sets `site: https://nao-mei.github.io` and `base: /hello-world`. Every internal link must use `import.meta.env.BASE_URL` (pattern: `const base = import.meta.env.BASE_URL.replace(/\/$/, '')`). If the repo is renamed or a custom domain is added, change both values.

Windows note: on this machine Node may not be on the shell PATH (`export PATH="/c/Program Files/nodejs:$PATH"` in Git Bash). `node_modules`, `dist` and `.astro` are git-ignored.

## 4. Content model

Content is YAML in `content/`, validated with Zod in `src/content.config.ts`. A schema failure fails the build.

- `problems/`: the three ideas (label, summary, order). Drive home tiles and page intros.
- `projects/`: the example cards on `/making/`. Fields: `title, summary, case` (slug of the page), optional `link`, `icon` (enum), `tags`, `order`.
- `roles/`: career stops with `theme`, `lesson`, `skills` (powers the career carousel).
- `recognition/`: credentials and awards. Credentials show on Career, awards on Minds.
- `links/`: external links (LinkedIn, request-CV).
- `commands/`: entries for the command palette (a button-first navigator; the typed commands are labelled honestly, not fake natural language).
- `skills/`, `readme/`, `case-files/`: empty or legacy. `content/README.md` is stale.

Islands (`src/islands/`): `DotName` (canvas dot-matrix name), `ShapeObject` (hero object), `Palette`, `CareerCarousel`, `LoopRing`. Diagrams are plain Astro components in `src/components/diagrams/`.

### Adding a case study
1. Add `content/projects/<slug>.yaml` (pick an `icon`, set `order`).
2. Copy an existing page in `src/pages/making/` and edit; it uses `Case.astro` (glance panel, optional outbound `link`, back link).
3. Add the URL to `.pa11yci.json`.
4. `npm run build`, run the banned lint, have the owner approve the wording.

## 5. Rules that must not be broken

Full text in `CLAUDE.md`. Summary:

- **Tier 1 Named**: employers, titles and years exactly as on the owner's public CV/LinkedIn. Never invent them.
- **Tier 2 Anonymised**: projects, problems, tools and outcomes in generic, rounded, relative terms ("hours to minutes", never exact figures; "first twenty", not "17th").
- **Tier 3 Never**: client names, project codes, internal tool or system names, internal metrics, performance-review content, internal screenshots, colleague quotes without permission. This applies to commit messages, comments, alt text, filenames and metadata too. Commercial AI tool names (Copilot, Claude) are fine.
- The **banned-terms list is not in the repo** and must never be committed, pasted or echoed. Locally it is read from the file at `BANNED_TERMS_FILE` (outside the repo and outside OneDrive); in CI from the `BANNED_TERMS` secret. The lint fails closed, never prints the matched term, and runs on pre-commit, commit-msg and CI (source and `dist/`). A new maintainer must be given the list through a separate secure channel.
- Never commit `.claude/` (it is git-ignored, and `settings.local.json` inside it can save approved commands word for word, including any password or key typed into one). Never type secrets into commands; refer to them as variables or files. Prune saved rules in that file now and then.
- Never commit-then-delete sensitive text: git history becomes public with the repo. If something slips in, stop, tell the owner, and rewrite history before any publishing.
- Claude-drafted public text is a draft until the owner approves it. Do not state facts about the owner you cannot verify (certifications, dates, "first/only" claims).
- Accessibility: WCAG 2.2 AA. Every animation has a static equivalent and respects `prefers-reduced-motion`. Core pages work without JS. External links open in a new tab with `rel="noopener noreferrer"`. Keep touch targets large on phones.
- Design: dark navy default, one bright-blue accent, Bricolage Grotesque headings, Inter body, hairline panels. No beige, heavy shadows, amber/yellow highlights or generic Venn diagrams.
- Career details stay limited to what the public CV shows.

## 6. Quality checks before every push

1. `npm run build` and `npm run check`.
2. `npm run lint:banned` (hooks also run it).
3. Contrast and accessibility: `npm run test:contrast`, `npm run test:a11y`, and an axe run in both dark and light themes on all eight pages.
4. View at phone width (about 375px) and desktop; check with reduced motion.
5. Commit only when the owner asks. Commit messages carry the attribution line the harness specifies.

## 7. CI and deployment

`.github/workflows/ci.yml` on every push to `main` and every PR: lint self-test, contrast, banned lint (source), type-check, build, banned lint (dist), pa11y, upload Pages artifact. The `deploy` job has `if: false`.

## 8. Making it public (go-live checklist)

This checklist has been followed and the site is live. It is kept for reference. Order mattered because public repos expose full history.

1. **Owner review** of every drafted line (the owner can regenerate a reading copy of all page text from `dist/`) and of every factual claim (certifications, dates, award names, issuers).
2. **Fresh scan**: run the banned lint over source, `dist/`, and the whole git history (`git log -p` through the lint, or scan a fresh clone). If any hit exists in history, rewrite history or start a new repo from a clean tree before going public. Safest is to publish a single clean commit of the final tree.
3. **Hosting**: GitHub Pages is free for a public repo (a private repo needs a paid plan). The site is published from this repo through the Actions workflow.
4. **Settings**: repo Settings, Pages, Source = GitHub Actions; confirm `base`/`site` in `astro.config.mjs` match the final URL (or set a custom domain and `base: '/'`).
5. **CI** (done): actions are pinned to commit SHAs, the `BANNED_TERMS` secret is set, and the deploy job runs on pushes to `main`. When you update an action, replace its SHA with the new release commit and keep the version as a comment.
6. **Launch content**: the site is deliberately **unlisted**: `src/layouts/Base.astro` carries a `noindex` robots tag, so it is reachable by link but kept out of search engines (remove that tag only if the owner wants it indexed). The share image is `public/og.png` (generated from the name, tagline and three shapes; no screenshots or internal material), the favicon is `public/favicon.svg`, and `src/pages/404.astro` is the 404 page. Check `<title>` and meta on every page.
7. **Final checks on the live URL**: axe/pa11y, Lighthouse (aim 90+), no third-party requests (network tab), keyboard and screen-reader pass, JS-off pass, phone check.
8. **After launch**: update the LinkedIn link text, keep CI green, and re-run the banned lint whenever the list changes.

## 9. Known open items

- Owner's own content for the Minds page ("what I have done") is a placeholder to be written by them.
- Unverified claims to confirm with the owner before launch: certification and award wording, role dates versus LinkedIn.
- Check the GitHub Actions tab after each push (no `gh` CLI was available on the owner's machine).

## 10. What is NOT in this repo

Deliberately kept out: the banned-terms list, owner-specific context and review drafts (`drafts/`, git-ignored). A private companion file holds what a new maintainer needs beyond this document. It is transferred directly and never committed.
