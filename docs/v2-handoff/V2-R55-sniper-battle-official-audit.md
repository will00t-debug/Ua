# UNION ARENA V2 | R55 SNIPER, Battle Victory, Whole-Print TTG-1-067

Date: 2026-10-24. Authoritative work branch `gpt/v2-resume-20261022`, Draft PR #78 only; base `cursor/v2-multi-retire-life-6ff5`. No production deploy, no force push, no Cursor PR #77 modifications.

## Actual official rulings

- [Official UA56BT/TTG-1-067 ヨーコ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-067) verified whole text: red CHARACTER, needed energy4, AP2, BP3500, gen red1, 大グレン団, enters ACTIVE, cannot be blocked by character with **current BP >=4000**, onPlay gains this turn the ability to choose enemy FRONT via 〖狙い撃ち〗 and **when it attacks and wins a character battle, draws one**, ACTIVE LIFE selects own character, readies it and grants BP+3000 this turn.
- [Q2295, published 2026-08-21](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=%E5%A4%A9%E5%85%83%E7%AA%81%E7%A0%B4%E3%82%B0%E3%83%AC%E3%83%B3%E3%83%A9%E3%82%AC%E3%83%B3): attacker's BP at least defender BP means victory when battling another character, **not direct LIFE**.
- [Official shared SNIPER Q65-Q70](https://www.unionarena-tcg.com/jp/faq/list.php?freeword=%E7%8B%99%E3%81%84%E6%92%83%E3%81%A1): targeted FRONT is a genuine battle; no BLOCK step, no onBlock / readyOnBlockCount, target need not be ACTIVE; when BP equality attacker wins, with target combat winner/loser rules. Normal attack remains a distinct action.
- Source-locked TTG original printed record `TTG_BY_ID['TTG-1-067']` independently pins id, color, stats, trait, AP2 and trigger; `dist/universal-v2/title-packs/ttg.mjs` pins reviewed source clause and test evidence.

## Implementation in independently reviewable batches

- `2112b79a73be0b7b2a9c79d2024f295797e191e0`: two reusable `onPlay` grant operations, `grantSelfSniperThisTurn` and `grantSelfAttackWinDrawThisTurn`. They attach to the physically stamped CHARACTER current entry and current turn; one legal action list supplies Human/AI targeted actions, never separate arbitrary targeting logic. Existing attack effect queue resolves first; targeted attack goes directly to physical BP battle without offering a block action. Source UID/stamp & target UID/stamp validated on queued action and serialized continuation.
- `11752289436a8ea04dc1cebb67ffafea0c4501e0`: earned attack victory draw also after a legal ordinary BLOCK, to avoid implementing only sniper. Direct LIFE does not count as character battle.
- `ed62a5912d9d73fb14f48470b699de70d365052a`: whole-print TTG-1-067 registered in common TTG adapter/independent formal source+manifest with original real 50 red deck, two AP paid real play, always ACTIVE, legal 3999/4000 blocker shared R53, sniper and ordinary victories, direct LIFE no draw, ACTIVE LIFE, AI/legal actions, hidden information and serialization tests. Final status **REGISTERED only upon new matching Actions SUCCESS**.
- This batch introduces a fresh reproducible `r55SniperBattleFiveTitleAudit()` after R54 historical scanner; all currently unported identities are checked without treating text matches as READY.

## Cross-title candidate triage

| Candidate | Status | Next review |
|---|---|---|
| TTG-1-067 | REGISTERED if current CI SUCCESS | Full ordinary+sniper comparison, time/stamp/ACTIVE life |
| BLC-4-044 | REVIEW PENDING | Individual Japanese entire print, source type/trigger and sniper timing |
| SLG-1-022 | REVIEW PENDING | Full sniper plus other effects; attack-end swap interaction |
| SAO-1-097 | REVIEW PENDING | Full printed attacker battle victory/draw and additional conditions |
| SLG-1-021 | PARTIAL | R54 group BP ready; mandatory legal block, printed BP based optional recovery, IMPACT, raid |
| MST-1-009 | PARTIAL | Q2147 own-effect entry versus paid play, temporary granted R47 swap |
| SAO-1-071 | REGISTERED | R54 full card; do not re-implement |

No partial card counted as formally registered; independent all-card FAQ certification remains zero. Unknown nesting, BLC-4-034 Raid under/retirement, MST-1-067 Q2162 protection, mixed AP/hand cost still fail closed.

Run Node22 `npm test`, 60 match matrix, independent manifest, source certification, R35-R55 scans and get **latest SHA's** Actions SUCCESS before declaring completion.
