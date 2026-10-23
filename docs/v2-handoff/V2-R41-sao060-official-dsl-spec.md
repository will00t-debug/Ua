# V2 R41 Batch A — SAO-2-060 source-to-DSL audit and independently testable specification

Date: 2026-10-23 (Asia/Taipei). PR #78, branch `gpt/v2-resume-20261022`. Not a full independent FAQ certification.

## Primary source
- BANDAI JP [EX08BT/SAO-2-060](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-060): purple EVENT, printed required energy **4**, consumed AP **1**, trait **歌**, trigger **SPECIAL**.
- Full printed event effect: `自分の場外からキャラカードを1枚まで手札に加える。自分の手札から消費APが1の紫の［特徴：SAOサバイバー］を1枚まで自分の場にアクティブで登場させる。そのキャラに次の自分のターン開始時まで、「このキャラは、相手のキャラの効果で選ばれない。」を与える。`
- SPECIAL: `相手のフロントLのキャラを1枚選び、退場させる。`
- [Official Q1207](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX08BT), 2024-11-08: “選び” effects cannot select the protected character. Scope is the **opponent CHARACTER effect** specified in print, NOT EVENT or all opponents' effects.

## Full-print gap table (baseline 1d2a4967)
| Printed obligation | Existing implementation | Gap / verification |
| --- | --- | --- |
| Pay normal EVENT AP1 at energy purple 4 | existing legal EVENT and AP payment | event main preflight + paid cost verification |
| Recover **0 or 1 own outside CHARACTER**, with no other printed filter | `recoverOutsideOne` + `{field:'type',value:'character'}`, `optional:true` | reuse, must allow decline even with matches |
| Recover first; then recompute current hand including recovered UID | serial existing `effectQueue`, `effect-recover-outside` | sequential tests: skip/recover same UID/different UID |
| Deploy **0 or 1** own-hand printed purple CHARACTER/AP1/`SAOサバイバー` | R39 `deployOwnHandRest` only matches color/energy/AP and enters REST | missing printed trait filter + ACTIVE mode. **Do not require any unprinted energy threshold** |
| Special deploy is free (no further AP/energy, no paid PLAY discount used) | existing effect-hand entry/AP code | extend same entry path; do not create a second payment/queue |
| Legal lines, full replacement, physical UID, new `fieldEntryStamp`, completed movement | existing `legalDestinations`, `commitDestination`, `recordCompletedMove` | reuse, test replacement and illegal action atomicity |
| Successful entry alone grants until next own START protection | existing `grantContinuousState` with `cannotBeChosenByOppEffect` scope `character` | grant to actual newly entered UID + stamp, never stale/non-entry target |
| OnPlay triggered after successful effect entry | existing `applyEffects(...,'onPlay',...,'ownEffect')` | queue ordering and nested pending tests |
| Opponent CHARACTER effect prohibited only for explicit choice | R40 effect-choice provenance | negative against EVENT; allow own/battle/global |
| SPECIAL LIFE retires one chosen opponent FRONT | existing explicit `triggerEffect:{op:'retireOppFront'}`, LIFE entry | verify independent from main EVENT effect |

## Acceptance spec
1. Pairwise selections `recover none/one` × `enter none/one`, including recovered same UID and pre-existing hand different UID.
2. Reject EVENT/FIELD, other color/trait, or printed AP != 1 for special deploy; no extra hand-deploy required energy restriction.
3. Verify ACTIVE, no extra AP payment, no consumption of next hand PLAY AP discount, and entry onPlay before continuing suspended source jobs.
4. Only on actual successful entry: scope `character`, target UID + `fieldEntryStamp`, survives source departure, expires next own START, no inheritance on re-entry.
5. Illegal forged UID, swapped owner, stale destination/replacement and invalid pending action rejected atomically by existing clone/preflight.
6. Own private hand visible solely to acting player, public outside movement serializes safely, Human/Normal/Hard AI share `legalUniversalActions`.
7. SPECIAL LIFE selects genuine opponent FRONT and actually retires it; combat/block and opponent EVENT actions remain otherwise legal.
8. Genuine 50-card SAO deck and five-title matrix; Node22 test, certification, manifests, scans, and **HEAD-specific** GitHub Actions.
9. No registry/manifest change until all printed obligations and known Q1207 are exercised. Full per-card independent FAQ certification count must remain unchanged without its separate audit procedure.

Rule boundary: official print says nothing about first recovery's color, energy, trait, or AP; add none. Second step does not have to use the recovered card. MST-1-067/Q2162 and BLC-4-034 remain RULE BLOCKED.
