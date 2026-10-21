# BLEACH Arena – Instructions for AI Coding Agents

## Resumed V2 work (2026-10-21)
The user has explicitly returned development to ChatGPT/Codex. Historical
2026-10-15 Cursor-only / stop-development handoffs remain provenance, not a
current stop instruction. Read `docs/v2-handoff/GPT-resume.md` first for the
resumed integration status. Work on the new integration branch; preserve the
original workstream branches, main, and production. Do not count registration
or passing tests as full official FAQ acceptance.

## Project purpose
Non-official BLEACH / UNION ARENA practice simulator in Traditional Chinese.
App version baseline: v9.1.1 (2026-10-12). This repository is meant for GitHub + Vercel, **not** the original ChatGPT Sites project.

## Structure
- Static application (ES modules, CSS, images): `dist/` (published website root).
- Game rules and state transitions: `dist/engine.mjs`, `dist/card-rules.mjs`, `dist/extra-rules.mjs`, `dist/v9-rules.mjs`.
- Card data: `dist/cards.mjs`, `dist/expansion-cards.mjs`, `dist/advanced-cards.mjs`.
- UI: `dist/app.mjs`, `dist/index.html`, `dist/styles.css`, `dist/clean.css`.
- Tests: `tests/*.test.mjs`; run `npm test` with Node.js 22.
- Deployment: `vercel.json` serves `dist/` directly, no compile/build step needed.

## Modification protocol
1. Check `README.md`, `MIGRATION_GITHUB_VERCEL.md` and the latest GitHub history before changes.
2. When adding cards or rule effects, implement actual state transitions, legal choices, paid costs and trigger timing. **Never only flip an auto-supported flag.**
3. Cite official card numbers and FAQ decisions in issue, PR or tests when relevant. Where sources conflict or are not verified, flag the uncertainty.
4. Add test cases for the new effect, run `npm test`, verify relevant UI behavior, and ensure cards don't disappear or duplicate.
5. Prefer feature branches and pull requests. Deploy preview first; merge to `main` after checks and review.
6. Do not change the original `chatgpt.site` URL or try to use its project ID for Vercel.
7. Do not put API keys, auth tokens, or private data in the repository.
8. Verify the Vercel deployment, cards/art, Raid, REST, deck builder and AI matches after publishing.

## Known gaps; do not claim full official compliance
Some complex multi-Yoruichi interactions, facedown cards/view permissions, UA01DC reprint aliases and untested official FAQ/chain interactions may still need work. The original v9.1 card coverage flag (276/276) is **not** a formal validation of every scenario. On migration from another hosting copy, compare against the latest upstream source before overwriting.

## Local preview
`python3 -m http.server 8000 --directory dist`, then visit http://localhost:8000.
