# BLEACH Arena – Instructions for AI Coding Agents

## Resumed V2 work (2026-10-21)
The user has explicitly returned development to ChatGPT/Codex. Historical
2026-10-15 Cursor-only / stop-development handoffs remain provenance, not a
current stop instruction. Read `docs/v2-handoff/GPT-resume.md` first for the
resumed integration status. Read `docs/v2-handoff/V2-do-not-regress.md`
before any Universal V2 rule, Raid, LIFE, energy, pending-choice, privacy,
AI, online, or deck-builder change. Every entry there is a shipped mistake
that was later corrected. Do not reintroduce it. Work on the new integration
branch; preserve the original workstream branches, main, and production.
Do not count registration or passing tests as full official FAQ acceptance.

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
- Cloudflare Workers (accounts / online matches / unified host): existing Worker `ua-arena` via `.github/workflows/cloudflare-unified-deploy.yml`. **GPT-direct deploy:** merge a green PR into `main` (deploy paths) and Actions deploys production automatically; Secrets stay in GitHub. Read `docs/ops/cloudflare-github-actions-deploy.md`. Never paste Cloudflare tokens into chat, code, or logs; never delete or rename Durable Object classes/data.

## Fixed V2 errors — do not reintroduce
`docs/v2-handoff/V2-do-not-regress.md` is the closed ledger (2026-10-14 through
2026-11-16, 256 entries, including RNK-1-009 and the Hiko Raid). New cards reuse the corrected behavior.
Do not simplify a fix back into the old bug. Do not bring these back:

1. An inspected window shows every card, including cards that cannot be chosen. Unchosen cards stay private.
2. Raid-frame text runs only in a face-up Raid. Paid Raid is base, then destination. An effect that prints both modes is card, then mode, then cell. Do not invent the missing mode, and do not put one execute button on every cell.
3. Generated energy is the physical card on the field now. Printed pips are the icons, not a filename, a dash, or an ability plus.
4. A facedown card does not supply its printed name or trait.
5. BP at 0 or below leaves the field. A higher-BP blocker does not retire the attacker (Q34). Equal BP retires the blocker.
6. Damage 2 reveals life together (Q73). The last life trigger does not force an order (Q12). Impact life damage uses the attacker's life selection.
7. Once-per-turn on a field ability is keyed by the physical source UID (Q770), not the printed name.
8. A new pending kind gets its own allowlist entry. Saved pending rejects a forged source.
9. A mandatory choose-1 cannot be played with no legal target, and then it does not charge AP (Q1119). An already REST character can still be chosen to REST (Q91).
10. Hard AI does not read hidden cards, does not REST an already REST target, and treats an equal-BP blocker as leaving.
11. A full line is removal, not a move. A front Raid base does not teleport between cells. Stripping a Raid sends the base outside as a rule move (Q60–Q61), and the base does not keep the top's buffs.
12. An earned ability survives its printed text being sealed, and stops when that physical card leaves. Silence does not delete an already earned draw (Q974).
13. The opening hand is one official 7-card mulligan. An occupied-slot check needs an explicit replace UID.
14. Life trigger type comes from the immutable pack. "Cannot become ACTIVE until the opponent's attack ends" survives the phase refresh (Q2205).
15. A buried Raid base does not pass its own front restriction to the top. An energy-only base can still Raid onto the front.

## Modification protocol
1. Check `README.md`, `MIGRATION_GITHUB_VERCEL.md`, `docs/v2-handoff/V2-do-not-regress.md`, `docs/ops/cloudflare-github-actions-deploy.md` (for Worker deploys) and the latest GitHub history before changes.
2. When adding cards or rule effects, implement actual state transitions, legal choices, paid costs and trigger timing. **Never only flip an auto-supported flag.**
   Deck search, looking at the top, and milling must show every card the controller inspected, including cards that cannot be chosen. Ineligible cards stay on screen with their art and cannot be selected. Closed titles store the full window on `pending.data.uids` or `pending.data.window` (order steps use `data.left`, an entry window uses `data.windowUids`). Do not publish only the matching targets and expect the UI to invent the rest. A new closed title is added once to the pending-kind allowlist and the private-choice reader; individual new cards inherit the window.
2a. Effects that put a character onto the field use the shared board gesture: select the physical card, then 突襲進場 or 普通進場 only when the printed effect allows both, then tap the destination cell. Do not list one execute button per destination. Raid-only and REST-only prints do not invent the other mode. Paid hand play stays an empty cell or a Raid base, with no mode buttons. Kamen Rider entry goes through `offerFieldEntry` in `dist/universal-v2/kmr-runtime.mjs`.
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
