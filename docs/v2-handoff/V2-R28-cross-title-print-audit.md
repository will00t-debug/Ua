# R28 Batch D — genuine unported cross-title full-print review

Date 2026-10-22. PR #78 branch `gpt/v2-resume-20261022`. This is an **independent source audit**, not an official card port, and is not a claim that a subset of matching DSL operations proves full-card compatibility.

## Live inventory consulted

Node22 remote Actions #39809160866, script `node scripts/v2-unported-report.mjs` against code SHA `06f3bd3ba0d354a4bab46f90cab6288d50d8013d`: TTG 46 unported, SLG 39 (12 catalog source-metadata gaps), SAO 92, MST 32. Source count only; no assumption of later unchanged roster.

## Four actual printed candidates, each in unported list

| Candidate/source | Complete printed lines at source | Reusable mechanism | Blocker / classification |
|---|---|---|---|
| [TTG-1-028](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028) | Green 4/AP1/4000, `大グレン団／ガンメン`, Raid over Simon **or** Viral, active/front option; onPlay draw 1 and, **only on own turn**, choose up to one opposing front character to receive *cannot attack* until **next own turn starts**; RAID LIFE | Shared Raid, optional target, draw, explicit trait components | A next-own-turn temporary target-specific attack prohibition and its seal/retire/reentry lifetime must be fully proved; no whole-card port. |
| [SLG-1-070](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-070) | Green 0/AP1/1000, `DFN／第四次架南島レイド`; onPlay choose up to one **other** DFN on own field: through opponent's next turn, opponent must pay extra 1 AP **to select** that character with card effects; ACTIVE LIFE | Audited compound traits, optional own-field target, temporary grant, AP legality | Official [Q2062](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-070): pay extra AP or choose other/zero valid target; not a generic energy cost, and not yet a universal validated selection tax. No whole-card port. |
| [SAO-1-005](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-005) | Yellow 2/AP1/3000, onPlay private TOP4, take up to one named Kirito **or** Alice, reveal and add to hand; order remaining inspected cards on deck bottom; **if added**, discard one from hand; no LIFE | `searchTopOneBottomDiscard` from TTG 010/023 covers TOP, order and conditional discard core | Need confirm strict multi-name printed-name filter profile without widening trait filter unsafely, legal 50-card SAO setup, AP/energy, hidden info; no whole-card port. |
| [MST-1-059](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-059) | Green 2/AP1/3000; onPlay choose exactly **one**: (i) draw 1 then discard 1 own hand or (ii) up to one **other own front** Ranoa Magic University character gains energy generation in front for this turn; no LIFE | `chooseOne`, existing draw/discard, optional printed trait selection | Mode (ii) is a temporary **front-generation permission**, not a plain BP/grantOnAttack buff. Need full active energy and expiration legality. No whole-card port. |

## Cross-title evidence vs support claim

- R24-R27 generic primitives are **structurally relevant** across TTG, SLG, SAO, MST; they are not automatically a valid mapping for every printed line.
- Especially distinguish `grantOnAttack` (earned attack-time optional draw 1, independent grant UID and field stamp) from a character that **cannot attack** (TTG-028), pays a **selection AP tax** (SLG-070), or **generates energy while front** (MST-059).
- Reject source card with any missing line, conditional duration, normal or LIFE trigger, forbidden target, missing energy/AP rule, or private ordering. Do not auto-register it.
- Follow-up: evaluate SAO-005 multi-name filter as the narrowest reusable improvement, then TTG-028 duration and SLG-070 AP target tax. For MST-059 model granting front energy with independent physical target UID and turn-end expiry without expanding `grantOnAttack` semantics.

## Safeguards

No registry, independent manifest, title data, published site, or legacy engine changed by this audit. `312/700` and `0` full-card independent FAQ certifications remain the most recently measured inventory, not a new certification result.
