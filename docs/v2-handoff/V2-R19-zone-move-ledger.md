# V2 R19 movement journal coverage and semantics

Source-pinned implementation from PR #78. The private `zoneMoveEvents`
array is *inside* existing `dist/universal-v2/engine.mjs` match state,
not exposed by `universalPublicView`. The helper
`zone-move-events.mjs` only verifies and records completed physical UID
destination and source snapshots. Sequence numbers are monotonic; records
are cleared at the next normal turn boundary. Invalid, skipped and previewed
actions create none.

Reason enum: `payment`, `own-effect`, `opponent-effect`, `rule`,
`life-trigger`, `retirement`, `raid-strip`; source zone and to zone
are distinct and data-driven. On opponent-forced discard, owner is victim,
controller is effect source. The legacy turnEffectZoneMoves boolean is
deliberately broader (it historically marks opponent discard too); use
`zoneMoveEvents` for source-sensitive future triggers.

Actual touched transition families: hand discard payment; effect discard;
opponent-controlled discard; outside→hand own-effect recovery; true
field→outside retirement; selected outside→field effects; LIFE damage
life→outside; LIFE GET outside→hand; COLOR outside→front or hand→energy;
Raid top stripping; explicit deck→outside mills and inspected TOP-N choices;
field→hand bounce; hand→outside event play; and ordinary hand→front/energy
play. The ledger remains **partial**: normal deck→hand draws, specialized
Raid and under-card relocations, replacements, and some other branches still
need audited coverage. Do not infer a trigger from the mere existence of
a broad legacy boolean or count an unrecorded movement.

Source-aware trigger condition is strictly typed and can match exact
source cardName/color, actor/controller/owner, specific card, reason,
zones and afterOrder, but is a PURE SELECTOR. Automatic queue insertion
after the COMPLETE original ability requires additional design, and no
new BLC card was declared V2-ported. Official BLC-2-047 Q1033/1046 and
BLC-4-034 Q2315 proof:
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034_p1

Per-card official FAQ certification remains 0. No new real cards.
