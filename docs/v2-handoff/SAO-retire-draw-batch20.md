# Batch 20 — SAO-2-016 and SAO-1-105 share native retirement draw

Official printed Japanese card sources:
- https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-016
- https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15ST%2FSAO-1-105

Both independently print the exact complete card body: 【退場時】カードを1枚引く。
SAO-2-016 クラディール BLUE0/AP1/BP1000/gen1/アインクラッド/no Life. SAO-1-105 サチ BLUE1/AP1/BP2000/gen1/アインクラッド/no Life.
Both reuse native shared effects.onRetire draw 1 from SLG-1-007 and MST-1-013, with no title-specific engine rule or unsupported flags. All printed numbers and characteristics source-pinned and require fail-closed import.

Cross-title test scenarios: source and common effect equality, two SAO defender cards physically retired by a TTG attacker with exact owner draw, SAO reversed P0 ownership and opponent secrecy, normal paid play does not trigger draw, full energy-line replacement enters REMOVED rather than retire, generic invalid effect/vanilla schema. No tests skipped.

After exact HEAD CI green: BLEACH 80, TTG 29, SLG 32, SAO 56, MST 28 = 225/700 pilot cards. Blocked 475. Fully independently FAQ-certified cards remain 0. No main merge, production deployment, manual mobile/web QA.