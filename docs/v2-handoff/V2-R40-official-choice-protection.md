# UNION ARENA V2 — R40 A｜Effect-selection protection official scope audit

2026-10-23 · GPT Draft PR #78 · branch `gpt/v2-resume-20261022` · base `cursor/v2-multi-retire-life-6ff5`.
This source review is **not** a full per-card FAQ certification and does not authorize any partial card registration.

## Official full-print scope (checked 2026-10-23)

| Card | Printed protection | FAQ phrasing | Source scope | Other full-print components |
|---|---|---|---|---|
| [EX08BT/SAO-2-058](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-058) | `相手の効果で選ばれない` | Q1206 (2024-11-08): only effects actually instructing `選び` select illegally | **all opponent card effects, including character/EVENT and opponent LIFE Trigger choosing a target** where wording makes a choice; controller's own selections still legal | Purple EVENT energy 2/AP1; mandatory own FRONT target; until next own turn START; when chosen unit is 〈アスナ〉, up to one own AP ACTIVE; ACTIVE LIFE chooses own field character, makes ACTIVE and grants BP+3000 this turn |
| [EX08BT/SAO-2-060](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-060) | `相手のキャラの効果で選ばれない` | Q1207 (2024-11-08): explains `選び`, without deleting the printed character-only restriction | **opponent CHARACTER effects only**; EVENT / Trigger not automatically blocked | Purple EVENT energy 4/AP1, affinity 歌; recover up to one own outside CHARACTER to hand, optionally ACTIVE deploy own-hand purple AP1 SAOサバイバー and grant it restricted protection through next own START; SPECIAL LIFE retires one chosen opponent FRONT |
| [UA54BT/MST-1-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067) | Card database shows `相手の効果で選ばれない` | **Q2162 (2026-06-12) quotes `相手のキャラの効果で選ばれない`** | **RULE BLOCKED: wording conflicts.** Do not silently map card to character-only or all-opponent scope until errata/current authority establishes the effective text | Green 4/AP1/BP4000, ラノア魔法大学, name alias シルフィエット; Raid 〈シルフィエット〉; onPlay choose up to one own field character with original generated energy >=1 and affinity, protect through next own START; on true retire choose up to one raid-under card to REST deploy or hand; RAID LIFE |
| [EX15BT/BLC-4-022](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT) | `相手の効果で選ばれない` | Q2311 (2026-09-04) | All opponent sources which explicitly choose | Historical comparison only; do not register from keyword |
| [EX15BT/BLC-4-027](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT) | `トリガーの効果で選ばれない` | Q2313 (2026-09-04) | Trigger-sourced choices only, not every opposing card effect | Historical comparison only |

## Source-scope resolution matrix

| Effect source/action | opponent-any | opponent-character | trigger-only |
|---|---|---|---|
| Opponent CHARACTER effect explicitly choosing target | prohibited | prohibited | allowed |
| Opponent EVENT effect explicitly choosing target | prohibited | allowed | allowed |
| Opponent LIFE Trigger explicitly choosing target | prohibited | allowed (unless separately a character effect) | prohibited |
| Controller's own target selection | allowed | allowed | allowed unless actual text independently says otherwise |
| Global effect without `選び` / explicit individual choice | applies | applies | applies |
| Attack declaration / legal blocking | unaffected | unaffected | unaffected |
| Selection AP surcharge | **different rule**; never substitutes for target immunity | different rule | different rule |

Granting source being silenced or leaving later does not retract a **resolved, independently granted** effect absent a printed source-linked condition. A source silenced **before** it can grant the ability does not grant it. Each grant is tied to its target physical UID AND field-entry stamp, with expiration at next specified own START; simultaneous grants with different expiration times coexist. Leaving and redeploying breaks the old incarnation. Malformed controller/source/UID/expiry must be rejected. Hidden-zone card identities must not be used to expose private information when filtering legally selectable field targets.

**Important distinction:** Q1206/Q1207/Q2162/Q2311/Q2313 explain that a printed `選び` effect chooses a target; they **do not** themselves erase each ability's printed source qualifier. In particular, no errata resolving the MST difference was verified in this review.

## Batch A outcome

Evidence table and fail-closed MST boundary established. SAO-2-058 is a candidate for complete registration only after action validator, AP optional activation, ACTIVE LIFE, actual deck and UID tests pass. SAO-2-060 is not READY based solely on protection; outside recovery, free ACTIVE deploy, print filter and SPECIAL LIFE must all pass. MST-1-067 is RULE BLOCKED pending effective source scope and multi-layer Raid bottom/retirement resolution. No newly certified card counts from this document.
