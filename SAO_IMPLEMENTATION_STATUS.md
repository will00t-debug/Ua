# Sword Art Online / UNION ARENA integration status

Last verified: 2026-10-13 (Asia/Taipei). **Work in progress — do not merge or deploy.**

## Official Japanese printed card catalog

Source: `dist/sao-official-import.mjs`; reproducible fetcher: `scripts/fetch-sao-official.mjs`; deduplication audit: `dist/sao-official-audit.json`.

| Set/product | Verified non-AP printings |
|---|---:|
| UA15BT | 100 |
| EX08BT | 74 |
| UA15ST | 18 |
| UAPR (SAO-1 / SAO-2, official pages currently verified) | 10 |
| Total official printings | 202 |
| Unique playable card IDs after deduplication | **183** |

All eighteen overlapping card identities have identical core stats/effects in the current audit (one code occurs in three products), and the same number may be used only four times regardless of printing. These counts are not proof that every independent event/game premium outside the scanned official prefixes has been located.

**Not collected:** Action Point artwork cards; cosmetic parallel, foil and signature printings. Each actual gameplay card retains its **printed AP cost**. Official artwork is referenced by URL only, and the image binary is not copied into this repository.

## Data & UI

- All 183 unique IDs are exposed in the SAO-only builder, with Japanese official title/effect, canonical printed stats, official source, image URL, energy, AP, BP, generation, features and trigger.
- Existing individually reviewed Chinese translations and a small set of unambiguous names are retained. Most effect descriptions still lack a reviewed Traditional Chinese translation and fall back to official Japanese; this is **not** complete Chinese localization.
- Starter, boosters and UAPR are selectable filters; same-card reprints share a single four-copy limit and can be inspected via `printings`.
- SAO drafts are isolated from BLEACH and Gurren Lagann. SAO matches remain unavailable.

## Engine work and safety gate

Of 183 cards, **26** currently have basic engine implementations or verified vanilla behavior (STEP, simple card draw/discard, selected entry/attack effects and normal deploy). Other **157** cards remain pending. The shared engine has explicit SAO card-ID lookup, with regression cases for AP, energy, REST/ACTIVE, Raid base/stack, optional selections, draw/discard, buff, mill and card conservation.

The tested basic profiles do **not** certify full card-specific logic for the full series; `auto:false` is intentionally retained for all SAO cards while match entry is gated. Conditional Raid entries, trigger timing, replacement effects, movement outside the movement phase, life manipulation, target immunity, multi-step choices, battle wins and complex cross-turn effects still need card-by-card rules and scenarios.

## Verification

- Current pull request: https://github.com/will00t-debug/Ua/pull/9
- CI `npm test`: **140 passed, 0 failed** on commit `7f75c1271aa2239a41567adc0804c420ea302e23`.
- Do not edit `main` or deploy Vercel until the complete rule coverage and UI battle flow pass review.
