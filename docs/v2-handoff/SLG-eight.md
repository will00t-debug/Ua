# SLG eight shared-engine batches

Work continues on `cursor/slg-eight-593a` from `cursor/ttg-finish-593a`.
`fullyAccepted` stays 0. Registration plus these scenario tests is not official FAQ certification.
Official Japanese pages for these cards were not re-read in this session. The catalogue Traditional Chinese in `dist/solo-leveling.mjs` is the text anchor. Where that paraphrase and a later official reading disagree, keep the disagreement visible here.

## Batch 1 — pay, other Impact, named retire recovery, rest-buff-hand

Registered:

- UA51BT/SLG-1-017 水篠 旬. Empty own field reduces required energy by 2. The card is purple and costs 2, so the shared empty-field discount matches the printed purple-2 reduction. OnPlay peeks one top card.
- UA51BT/SLG-1-074 ルノー. OnPlay may grant Impact 1 this turn to one other own DFN character. New shared op `grantOtherImpactThisTurn`.
- UA51BT/SLG-1-050 観月 絵里. Main REST, true retire, then optional recovery of one own outside character named 水篠 旬. New shared main `restRetireRecoverName`.
- UA51BT/SLG-1-071 マリー. Main once per physical card: REST, BP+1000 to another own character this turn, then this card returns to hand. New shared main `restBuffOtherThenHand`.

Official trait token for 074 and 071 is `DFN／第四次架南島レイド`. The catalogue split is not registered.
ACTIVE and DRAW life texts stay on the shared life handler.

## Batch 2 — top windows

Registered with existing shared top-window ops:

- UA51BT/SLG-1-063 最上 真. Top 3, up to one official trait 第四次架南島レイド to hand, the rest to the bottom in chosen order, discard 1 only if a card was added.
- UA51BT/SLG-1-054 黒須 圭介. Top 2, up to one card with that trait to outside, the rest back to the top.

The catalogue label 第四次架南島Raid is not the registered token.

## Batch 3 — outside recovery buff and opponent blocker ceiling

Registered:

- UA51BT/SLG-1-003 朝比奈 りん. When an own effect moves this card from outside to hand, it may give one own character BP+1000 this turn, including itself. Ten or more own outside cards add one purple energy on either turn. OnAttack peeks one top card. The shared `onOutsideRecover` buff is the existing optional own-field BP choice, not the SLG-014 energy entry.
- UA51BT/SLG-1-024 道門 泰星. Printed blocker ceiling: characters of BP 4000 or higher cannot block it. On retire the opponent may give one of their field characters the same this-turn ceiling. New shared onRetire op `grantOppBlockAtLeast`.

Official pages were not re-read. The catalogue Chinese is the text anchor. Not a full FAQ certification.

## Batch 4 — attack-time REST modes

Registered:

- UA51BT/SLG-1-029 カイセル. When an own 影の軍団 character of printed BP 2000 or less attacks, this READY card may REST and choose one mode. The attacker cannot be blocked by BP 4000 or higher this turn, or it cannot be chosen by opponent effects. Each mode is once per printed name this turn. New shared profile `allyAttackRest`.
- UA51BT/SLG-1-031 キバ. The same window may give the attacker BP+1500 this turn, or draw 1 and discard 1. Each mode is once per printed name.

The catalogue does not put 本回合 on 029's untargetable clause. The shared protection status expires at that controller's next START, which is the only legal expiry for that status. Official pages were not re-read. The catalogue trait 影之軍團 is not the registered token 影の軍団.

## Batch 5 — 水篠 旬 raid

Registered UA51BT/SLG-1-020. Raid name 水篠 旬. OnPlay draws 1, then may discard 1 hand card to recover up to one own outside character other than 水篠 旬 whose printed BP is 3000 or less. `recoverOutsidePrintedBp` now accepts that printed-name exclusion. OnAttack draws 1, discards 1, and gains BP+500 this turn for each 5 own outside cards. Official page was not re-read. Not a full FAQ certification.

## Batch 6 — own-effect retirement and a shared name gate

Registered:

- UA51BT/SLG-1-049 水篠 旬. Raid name 水篠 旬. Printed Impact 1. The catalogue BP+500 sentence has no 自己的回合 limit, so the bonus applies on both turns. OnPlay may retire one opponent front character only when this card entered by an own effect during its controller's turn. Paid play does not open that choice. New shared op `retireOppFrontOne`; a null retirement limit is uncapped, and `bp > null` is not used. No registered host can put this green energy-6 character onto the field from outside, so the positive own-effect entry is untested. OnAttack draws 1, then one hand card is placed facedown under this character. New shared op `tuckHandFaceDown`.
- UA51BT/SLG-1-067 カナ. Official trait token `DFN／第四次架南島レイド`. OnPlay, when at least three own DFN characters are on the field including this card, draw 1, set this card ACTIVE, and BP+1000 this turn. The printed name shares that entry once per turn. `oncePerTurnGate` now accepts a `when` condition, and a miss does not spend the name. `activeSelf` is a legal follow-up. The catalogue does not say 自己的回合 for the count. The catalogue also omits the color life sentence. The attached profile deploys one green AP 1 character of energy 2 or less from hand, matching the in-repo life fixture. That energy cap was not re-read from the official page.

Official pages were not re-read. Not a full FAQ certification.

## Batch 7 — two field mains

Registered:

- UA51BT/SLG-1-035 スキル：君主の領域. Enters ACTIVE. Main REST gives every own 影の軍団 character BP+500 this turn, or BP+1000 when at least five own field cards have that trait. The field itself has the trait and is included in the count. Only characters receive the BP. Official trait is 影の軍団. New shared field main `restScaleTrait`. `enterAlwaysActive` now also applies to fields.
- UA51BT/SLG-1-075 デイリークエスト. It does not enter ACTIVE, so the REST mains are not legal on the turn it is paid from hand. One main RESTs and, while an own character named 水篠 旬 is on the field, puts the top deck card facedown under this field. The other RESTs, discards one hand card, may send one facedown card from under an own card outside, and only after that send may recover one own outside character named 水篠 旬 with energy 0 or less. New shared field mains `restTuckTopIfName` and `restDiscardFacedownRecover`.

Official pages were not re-read. GET life stays on the shared handler. Not a full FAQ certification.

## Batch 8 — three events

Registered:

- UA51BT/SLG-1-077 架南島レイド攻略開始. Retires one opponent front character of BP 2000 or less. Five or more own field cards with 第四次架南島レイド raise that ceiling to 5000. `retireOppFrontUnderBp` now accepts that trait count. Five or more distinct printed names of the same trait may give one own character, including a character without the trait, BP+1000 this turn. New shared op `buffOwnIfDistinctTrait`. The catalogue says 張, so fields are counted with characters. No registered field has this trait, so the scenarios use characters. Five copies of one name do not open the BP choice. SPECIAL life is the shared unconditional front retirement, separate from the printed ceiling.
- UA51BT/SLG-1-080 舞姫. Draws 1, then may give one own character named 向坂 雫 an attack-time draw of up to one card this turn. `grantOnAttack` accepts that printed name, and an event that has already moved outside remains a legal source. The catalogue body does not restate the DRAW life icon. DRAW life stays on the shared handler.
- UA51BT/SLG-1-039 影の君主. Choose one: up to one own outside 影の軍団 character enters ACTIVE, or up to two own outside 影の軍団 characters of energy 3 or less enter REST. New shared op `deployOutsideTrait`. The catalogue trait list is empty; the token is taken from the effect sentence. An energy-4 影の軍団 character is legal only in the ACTIVE mode. SPECIAL life is the shared unconditional front retirement.

Official pages were not re-read. Not a full FAQ certification.
