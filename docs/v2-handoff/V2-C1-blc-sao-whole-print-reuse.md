# UNION ARENA V2 | Cursor C1 BLEACH whole-print reuse

Date: 2026-10-24 (Asia/Taipei). Work branch `cursor/v2-blc-sao-batch-port-20261024-6ff5`. Base is the verified GPT HEAD `878cc9ec4aab040b4887a1e17e7082f2edbfc2c8` on `gpt/v2-resume-20261022`. Draft PR only. No production deploy, no force push, no edits to GPT PR #78, Cursor PR #77, or `main`.

Actions run `40049736025` belongs only to `878cc9e` (push success, Node v22.23.3, 2169/2169, matrix 60/60, manifest 346, unported 354). It does not cover this branch.

## What was registered

Official pages read 2026-10-24. None of these four pages contained an FAQ block. Each whole print is one existing shared primitive plus a standard life trigger, or no trigger.

| ID | Print | Reused primitive |
|---|---|---|
| UA08BT/BLC-1-058 二枚屋 王悦 | purple 2 / AP 1 / BP 2500 / 零番隊 / gen 紫 / no trigger. 【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。 | `mainAbility restSelfBuffOther` BP+1000 |
| UA08BT/BLC-1-088 斑目 一角 | green 3 / AP 1 / BP 3500 / 護廷十三隊 / gen 緑 / ドロー. 【2回ブロック】 | `readyOnBlockCount: 1`. DRAW life is the generic draw 1. Q80 (2023-03-17) |
| UA08ST/BLC-1-101 井上 織姫 | purple 2 / AP 1 / BP 3000 / no trait / gen 紫 / アクティブ. 【2回ブロック】 | `readyOnBlockCount: 1`. ACTIVE life is the generic own-character ACTIVE plus BP+3000. Starter `nameJa` is `井上 織姫`. Legacy `doubleBlock` stays on the source record and is not copied into the V2 definition |
| EX15BT/BLC-4-073 斑目 一角 | green 2 / AP 1 / BP 2500 / 護廷十三隊 / gen 緑 / no trigger. 【自分のターン中】自分の場に〈更木 剣八〉がある場合、このキャラはBP+1500。 | `ownNameExists` turn `own`, zone `field`, name `更木 剣八`, BP+1500 |

SAO new complete cards this round: 0. No new shared operation. Keyword hits were not promoted to READY. Exact catalogue-text duplicates against already registered BLEACH and SAO effects: 0.

The same physical UID keeps its block count after it leaves and re-enters. No FAQ was found that resets that count.

## Local Node 22 evidence

Node v22.23.4, 2026-10-24 10:00 Asia/Taipei, clean tree at the feature commit: `npm test` 2174/2174, fail 0. Matrix `60/60 finished (failures 0)`. Manifest `bleach 107, gurren-lagann 37, solo-leveling 45, sword-art-online 107, mushoku-tensei 54; total 350`. Unported report: 總卡 700／Pilot 350／尚未移植 350／嚴格全面驗收 0. Certification `independentlyCertified: 0`. R35–R55 scans that exist in this tree reported `readyVerified: 0`. This HEAD still needs its own push Actions SUCCESS before acceptance.

## Official reviews that stay unported

ENGINE BLOCKED, shared hand-cost primitive not added (GPT owns the shared play loop; printed `energy` must stay the printed number; SAO catalogue gen 3 on the three SAO cards is 黄黄/青青/緑緑, official gen 2):

- BLC-1-007, BLC-1-044, BLC-1-073, SAO-1-015, SAO-1-050, SAO-1-092

ENGINE BLOCKED, other missing primitives:

- BLC-1-076: on play, optional ACTIVE of one own 〈更木 剣八〉
- BLC-1-084, BLC-2-068: other cards with exact trait 護廷十三隊, not characters only (`ownTraitCount` was not changed)
- BLC-2-041: BP while another own character retired this turn
- SAO-1-076: on play, REST-play a hand character with energy at most 2, AP 1, trait ALO, no color
- SAO-1-085: on attack, draw 1 when this character's current BP is at least 5000
- SAO-1-090: Impact 1 while this character's current BP is at least 4000; official gen is 2
- SAO-1-103: on play, move up to one own character to the other line; COLOR life is a printed BP 3500 front bounce
- SAO-2-037: on retire, optional mill of up to 2
- SAO-2-039: this-turn BP+1000 after this player used a 歌 card
- SAO-2-066: top 2, up to one green card with exact trait ALO to outside

PARTIAL:

- BLC-1-091: name alias exists; BP while own front has no other character does not

C1 census of the live BLEACH+SAO complement: official reviewed still unported 18, REVIEW PENDING 227, READY from keywords 0. FAQ certification remains 0.
