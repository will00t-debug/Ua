# UNION ARENA V2 — R52 SAO official full-print and Q767 source audit (2026-10-24)

Scope: GPT Draft PR #78 / `gpt/v2-resume-20261022`. This is **source review only**, not a card registration, runtime certification or independent complete-FAQ certification.

## Official full print

| Card | Official source | Full printed conditions | Existing / missing |
|---|---|---|---|
| SAO-1-100 マザーズ・ロザリオ | [UA15BT/SAO-1-100](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-100) | Green EVENT, green energy 4, AP 1, BP -, no generated energy or trait. Mandatory select one opposing FRONT character with CURRENT BP <=5000. Ordinarily return to its owner's hand; if total of OWN OUTSIDE physical cards with printed names 〈ユウキ〉 or 〈マザーズ・ロザリオ〉 >=3, instead truly retire. SPECIAL LIFE independently selects and retires one opposing FRONT character. | Reuse R51 `ownOutsideNamedCountAtLeast`, one-card physical choice, bounce, true retirement, SPECIAL; missing generic atomic conditional switch and deferred EVENT source release. |
| SAO-1-070 アスナ | [UA15BT/SAO-1-070](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-070) | Green CHARACTER, energy 3, AP 1, printed BP 3500+, generated green energy 1, ALO, no LIFE trigger. Own OUTSIDE matching names >=4 grants own-turn BP+500. Independently >=6 grants IMPACT1, including opponent turn. | Both live passive predicates already supported by R51; missing exact source pin, true-source six-card scenario, integrated Impact/battle/50-card regression. |

## Binding official FAQ

- **Q767, updated 2024-01-19** on SAO-1-100 official page: an EVENT played from hand enters OUTSIDE **after its entire EVENT effect resolves**. With only two matching cards in OUTSIDE before use, the resolving SAO-1-100 does NOT supply the third card, so the effect returns the selected enemy to hand. Three previously present sources really retire the enemy.
- **Q1119, updated 2024-09-06**: mandatory EVENT one-target selection with no legal target prohibits use before AP payment. Protection / selection taxes remain independent filters.
- **Q62**: bouncing a Raid returns its visible top to hand; Raid-base cards go OUTSIDE, not back with the top.
- **Q87**: an expressly printed alternate card name applies in every zone. Do not invent aliases from artwork, traits, descriptions or characters.
- **Q74/Q75**: IMPACT applies only when attacking and winning a battle; it does not add damage to an ordinary direct player attack.

## Actual registered printed-name sources at R51

Review of `dist/universal-v2/sao-pack.mjs` `PRINTED_PINS` finds four registered sources with exact printed name 〈ユウキ〉:
`SAO-1-078`, `SAO-1-079`, `SAO-2-068`, `SAO-2-069`.
`SAO-2-068` can become OUTSIDE through its printed REST + own hand discard + true retirement MAIN; `SAO-2-069` can become OUTSIDE through its printed attack-phase-end self retirement. Ordinary true retirement of either also qualifies. Confirm each full printed effect in the independent R43/R44 tests.
**No previously registered `PRINTED_PINS` card with printed name 〈マザーズ・ロザリオ〉** before SAO-1-100. Its EVENT source must not be a vanilla placeholder.

These four named source IDs each allow up to four copies in the same 50-card SAO title deck. In particular, six physical 〈ユウキ〉 copies can be gathered with `SAO-1-078` and `SAO-1-079` copies even if SAO-1-100 is not yet registered; actual legal game actions and a 50-card deck remain necessary before SAO-1-070 can be declared complete. Every physical UID counts at most once even when an audited alias matches both names. This audit makes no unsupported new alias claim.

## Required R52 tests / certification gates

1. Paid EVENT from hand: own OUTSIDE 0, 2, 3, >3; Q767 source moves after chosen outcome and remains in-flight on pending.
2. Q1119 AP/green energy/BP / target protection and physical UID/owner proof; both bounce and retirement are exclusive and preserve Raid geometry.
3. SPECIAL LIFE must use existing Trigger retirement, not the EVENT branch.
4. Source restoration, invalid pending, AI levels, opponent hidden zones, existing R50 Q770 and full five-title regression.
5. Separate SAO-1-070 3/4/5/6 matching physical sources, attack/block/IMPACT and dynamic own/opponent turn BP.

Any skipped test or unavailable real 50-card source keeps the respective card **PARTIAL**. Full independent card-by-card official FAQ certification remains **0**.
