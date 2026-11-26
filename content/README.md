# content/

Single source of truth for the site's repeated content, validated by `src/content.config.ts` (a schema error fails the build). YAML files, one folder per collection:

| Folder | Used for |
|---|---|
| `problems/` | The three ideas (home tiles and page intros) |
| `projects/` | Example cards on the Build it page |
| `roles/` | Career stops on the Every angle page |
| `recognition/` | Credentials (Career page) and awards (Minds page) |
| `links/` | External links (LinkedIn, request-CV) |
| `commands/` | Command palette questions and answers |

`skills/`, `readme/` and `case-files/` are defined in the schema but unused and empty.

Only Tier 1 (public CV facts) and Tier 2 (anonymised) content belongs here. See `CLAUDE.md`. To find which file controls a given piece of copy, see `COPY-MAP.md` in the repo root.
