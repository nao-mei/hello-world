# Where each bit of copy lives

Cheat sheet for changing words on the site. Find the section on the page, then open the file listed. Paths are relative to the repo root. After any change: `npm run build`, `npm run lint:banned`, and have the owner approve public wording (see `CLAUDE.md`).

Rule of thumb: **words about a collection of things** (ideas, projects, roles, awards, links, palette answers) live in `content/*.yaml`; **page-specific prose** lives inline in the `.astro` page; **layout furniture** (nav, footer, palette text) lives in `Base.astro` and `Palette.svelte`.

## Site-wide (every page)

| What | File |
|---|---|
| Nav labels and order (Home, Every angle, Build it, Minds) | `src/layouts/Base.astro`, the `nav` array |
| Footer ("Say hello" link, "Work in progress.") | `src/layouts/Base.astro`, footer; the link target comes from `content/links/linkedin.yaml` |
| Page `<title>` | the `title` prop on `<Base title="…">` in each page |
| `noindex` robots tag (blocks search engines until launch) | `src/layouts/Base.astro`, `<head>` |
| Theme toggle (dark default, optional light) | `src/layouts/Base.astro` (button and inline scripts); colours in `src/styles/tokens.css` |
| Command palette greeting, "no answer" text, input placeholders | `src/islands/Palette.svelte` (`GREETING`, `FALLBACK`, `placeholder`) |
| Palette questions and answers | `content/commands/*.yaml`, one file each |
| Palette menu items (contact links, projects, "Go to…") | built in `Base.astro` from `content/links`, `content/projects` and `nav` |
| External links (header/footer/palette) | `content/links/*.yaml` |

### Palette answer files (`content/commands/*.yaml`)
Fields: `name` (the question or command), `aliases`, `keywords` (typed matching), `group` (`main` = shown first, `more` = behind the More button, `fun` = fun ones), `hidden` (typed only), `output` (the answer text), `href` (optional link), `art` (ASCII art flag). Keep the answers factual and in the owner's voice.

## Home (`src/pages/index.astro`)

| Section | Where |
|---|---|
| Kicker ("Ideas · AI · People"), subtitle, tagline ("Same thing, different angle."), hint "Turn the object, or choose an idea" | inline in `index.astro`, hero |
| Name shown as dots | `src/islands/DotName.svelte` (default `first` and `last` props); plain-text fallback `h1.name-static` in `index.astro` |
| The turning object, its alt description, 01/02/03 buttons | `src/islands/ShapeObject.svelte`; button labels come from `content/problems/*.yaml` (`label`) |
| "Three ideas" tiles: title and paragraph | `content/problems/{every-angle,build-with-people,fits-more-minds}.yaml` (`label`, `summary`, `order`) |
| Tile link line ("Every angle, and the career behind it →", etc.), "↑ Back to the object" | inline in `index.astro` |
| Tile diagrams and their step captions | `src/components/diagrams/{EveryAngle,BuildTogether,FitsMoreMinds}.astro` |
| "What I stand for": six beliefs | inline `beliefs` array at the top of `index.astro` |

## 01 Every angle: `/career/` (`src/pages/career.astro`)

| Section | Where |
|---|---|
| Heading, intro line, "The thread" story, "Awards are on the Minds page", CV line | inline in `career.astro` (the CV link target is `content/links/request-cv.yaml`) |
| Small diagram beside the intro | `src/components/diagrams/EveryAngle.astro` |
| Career carousel: employer, title, years, theme, "What it taught me", skills | `content/roles/*.yaml` (`employer`, `title`, `startYear`, `endYear`, `theme`, `lesson`, `skills`, `earlyCareer`) |
| "Early career" stop: theme, lesson, added skills (Psychology, Cognitive science) | inline in `src/components/CareerPath.astro` (`earlyTheme`, `earlyLesson`, `uniq([...])`) |
| Carousel behaviour and button text ("Show N skills from earlier stops") | `src/islands/CareerCarousel.svelte` |
| Credentials list | `content/recognition/*.yaml` with `kind: credential` (`title`, `issuer`, `year`, `href`, `note`, `featured`) |

Employer names, titles and years are Tier 1: they must match the public CV/LinkedIn exactly and come from the owner.

## 02 Build it with people: `/making/` (`src/pages/making/index.astro`)

| Section | Where |
|---|---|
| Heading, intro paragraph | heading inline; paragraph is the `summary` in `content/problems/build-with-people.yaml` |
| "The pattern behind most of what I make": four steps | inline `steps` array in `index.astro`; animation in `src/islands/LoopRing.svelte` |
| Example cards: title, summary, tags, icon, order, which page they open | `content/projects/*.yaml` (`title`, `summary`, `tags`, `icon`, `order`, `case`); icons in `src/components/CardIcon.astro` |
| "Read the case study →", "← Back to the three ideas" | inline in `index.astro` |
| Diagram beside the intro | `src/components/diagrams/BuildTogether.astro` |

## Case study pages: `/making/<slug>/`

One file each in `src/pages/making/`: `pricing-workbench.astro`, `lived-experience-agent.astro`, `c4-study-guide.astro`, `ai-po-coach.astro`, `certified-in-a-week.astro`.

| What | Where |
|---|---|
| Page body prose and headings | inline in that page |
| "At a glance" panel (What / Built with / Status / Shown) | `glance` array in that page |
| Kicker ("Creating with AI · Case study"), "Anonymised where needed. Work in progress.", back link | `src/layouts/Case.astro` |
| Outbound button (e.g. LinkedIn post) | `link` and `linkLabel` props on `<Case>` in that page |
| Agent page diagram | `src/components/diagrams/AgentIdea.astro` |

## 03 Fits more minds: `/minds/` (`src/pages/minds.astro`)

| Section | Where |
|---|---|
| Heading and intro | heading inline; intro is the `summary` in `content/problems/fits-more-minds.yaml` |
| Different minds, Accessible and fair, What I have done about it | inline in `minds.astro` |
| Recognition list (awards) | `content/recognition/*.yaml` with `kind: award` |
| Diagram beside the intro | `src/components/diagrams/FitsMoreMinds.astro` |

## Styling and behaviour

| What | Where |
|---|---|
| Colours, light/dark | `src/styles/tokens.css` (check with `npm run test:contrast`) |
| Layout, tiles, cards, diagrams sizing, phone rules | `src/styles/global.css` plus scoped `<style>` in each component |
| Content field rules (what a YAML file must contain) | `src/content.config.ts` |

## Gotchas
- The collections `skills`, `readme` and `case-files` are defined in `src/content.config.ts` but unused; their folders hold only `.gitkeep`.
- Internal links must use the `base` prefix (`import.meta.env.BASE_URL`); never hard-code `/career/`.
- Diagrams are SVG with CSS animations; any new motion needs a static equivalent and `prefers-reduced-motion` handling.
- Every outbound link opens in a new tab with `rel="noopener noreferrer"`.
