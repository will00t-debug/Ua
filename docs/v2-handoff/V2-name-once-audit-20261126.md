# V2 card-name once-per-turn audit (2026-11-26)

Scope: the registered card catalogue and runtime on the TTG-1-033 fix branch
(base main `3d2d8b38fc7b3269e99c8f6060901f84dabe1ecc`). This is a targeted
audit of the reported duplicate-name activation bug, not new official FAQ
certification or exhaustive play testing of every registered card.

## Catalogue pass

Enumerate `TITLES` from `dist/title-registry.mjs`, and look up the corresponding
`officialV2Pack(title.id).cards[id]` in `dist/universal-v2/official-entry.mjs`.
21 titles, 2,898 registered cards. Search the stored Japanese and Chinese card
text for an explicit named effect limit (e.g. `〈…〉のこの効果は1ターンに1回`,
`同名…每回合`, `所有〈…〉的此效果`), including differently worded limitations
such as `〈エリス〉で1ターン1回のみ選択可能`. Keep the restriction scoped to the
specific effect or option printed, not every ability of that card name.

100 direct name-limit candidates, grouped by prefix:

- AOT: 1-021, 1-107, 2-008, 2-009, 2-065, 2-066
- BLC: 2-039, 2-043, 3-005, 4-004, 4-007, 4-012, 4-017, 4-036, 4-053, 4-065, 4-068, 4-071
- CSM: 1-007, 1-031, 1-037
- DGM: 1-003, 1-005, 1-011, 1-047, 1-064
- EVA: 1-008, 1-039, 1-087, 1-092
- IMC: 1-054
- IYS: 1-022
- KJN: 1-008, 1-028, 1-047, 1-056, 1-069
- KMR: 1-021, 1-062, 1-063, 1-065, 2-022, 2-056
- MCR: 1-022, 1-023, 1-068, 1-082, 1-109, 2-007, 2-011, 2-019, 2-035, 2-049
- MGS: 1-059, 1-112, 2-023, 2-027, 2-054
- MHA: 1-096, 3-003, 3-004, 3-006
- MMM: 1-022, 2-008, 2-012, 2-038, 2-044, 2-055, 2-070
- MST: 1-007, 1-042, 1-048
- REZ: 1-060, 2-010, 2-011, 2-013, 2-047
- SAO: 2-010, 2-022
- SLG: 1-029, 1-031, 1-033, 1-057, 1-067, 1-073
- STG: 1-018, 1-028, 1-039
- TRK: 1-060, 1-084
- TTG: 1-003, 1-004, 1-012, 1-016, 1-021, 1-031, 1-033, 1-040, 1-046, 1-068

Additional related clauses inspected as separate categories (16 candidates):
per-name per-option selection REZ-2-018, STG-1-050, MMM-2-003, MMM-2-056,
CSM-1-055, MHA-3-008, MCR-1-051, MCR-1-052, MCR-2-008, MGS-2-064;
per-name event use MMM-1-033, MMM-1-034, MMM-2-073, AOT-1-067, MCR-2-018;
conditional free Raid restriction MCR-2-036. These are not blanket
once-per-name ability limits. A plain [ターン1] or translated once-per-turn
ability remains per physical card.

## Runtime findings

- TTG-1-033 and TTG-1-004: Raid witnesses could be queued together before
  either spent the name limit. Recheck the name key as each witness opens,
  and reject stale saved choices. Mark only on actual activation. TTG-1-034
  has no such name limit, so must not inherit it.
- MGS-2-027: the ACTIVE main granted by returning 忍野扇 used physical UID
  (`uid|readyGrant`) despite the text explicitly naming 阿良々木暦. Two
  copies can each earn the granted ability, but the ability's activation
  must share one player-scoped `阿良々木暦|readyGrant` use per turn. Recheck
  at legal-action generation and actual activation. Honor a legacy UID
  use in a saved match. Leave the ordinary bottom-name MAIN keyed by UID.
  The added real-match test fails before the fix and passes afterward.
- Reviewed the generic shared name-gate queue and representative special
  entry/retire/LIFE and main/selection paths for stale or UID-only checks,
  including TTG-1-021/031, MHA-1-096, BLC-4-012, EVA-1-087/092,
  KMR-1-021/063/065, AOT-2-066, MCR-1-109 and MMM-2-055.
  No further reproduction was confirmed in those inspected paths.

The scope is catalogue-wide text screening plus runtime inspection, not a
new individual two-copy match or official-source verification for every
candidate. Regression tests in `tests/v2-ttg-finish.test.mjs` and
`tests/v2-mgs-set2.test.mjs` cover the three confirmed affected prints,
including previously queued actions and the legacy grant key.
