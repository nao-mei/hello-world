# Portfolio site

Static GitHub Pages portfolio (Astro + TypeScript + Svelte islands). No backend, no LLM calls, no analytics, no runtime third-party requests (fonts self-hosted). Maintainer handover and go-live checklist: `HANDOVER.md`; where each piece of copy lives: `COPY-MAP.md`.

## Confidentiality tiers (hard constraints)
1. **Named**: employers, titles, years exactly as on the public CV / LinkedIn. Owner supplies these; never invent them.
2. **Anonymised**: projects, problems, tools, outcomes. Generic descriptors, invented scenarios, fictional data and organisations. Outcomes are rounded and relative ("hours to minutes"), never exact figures.
3. **Never** (anywhere, including commit messages, comments, alt text, filenames, metadata, OG image): client names, project codes, internal tool/system names, internal metrics, performance-review content, screenshots of internal systems, unpermitted colleague quotes.

## Rules
- The banned-terms list is NOT in this repo and must never be committed, pasted into files, or echoed in output. It is read from `BANNED_TERMS_FILE` (a path outside the repo and outside OneDrive) locally, and the `BANNED_TERMS` secret in CI. The lint fails closed.
- Run `npm run lint:banned` before every commit; the pre-commit and commit-msg hooks do this (`npm install` sets `core.hooksPath`).
- Never commit-then-delete sensitive text: history is public. Start clean.
- Repo stays private and the deploy job stays disabled (`if: false` in ci.yml) until the owner decides to go live.
- Claude-drafted public text must be reviewed by the owner before publishing.

## Stack decisions
Astro (static) + strict TS, Svelte islands, content in `/content` validated by Zod in `src/content.config.ts`, exact-pinned deps (`.npmrc` save-exact). Core pages must work without JS; every animation needs a static equivalent and respects `prefers-reduced-motion`.
