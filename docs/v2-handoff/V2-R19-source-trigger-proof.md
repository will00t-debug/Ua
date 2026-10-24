# UNION ARENA R19 source-aware completed moves / deferred trigger audit

Source card: [BLC-2-047 official JP](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047).
Printed blue2/AP1 event, no Life; primary play draws 2. The *separate*
hand-to-outside ability requires the cause to be an effect of an OWN BLUE
`黒崎 一護` on the field. No generic discard trigger has been authorized.

Official Q1046: the hand-to-outside effect can trigger even without the
required printed 2 blue energy; never add an energy gate to this condition.
Official Q1033 on EX07BT/BLC-2-019: resolve the complete originating
Ichigo main ability, *then* resolve the Zangetsu draw. Official Q2315
on EX15BT/BLC-4-034: the draw remains eligible even if this card is
subsequently placed facedown underneath another card. A snapshot of the
**completed move** is therefore required rather than testing its current
location later.

This batch implements source-aware **strict predicates / replay scans**, not
automatic ability queue insertion. The current verified BLEACH V2 card pack
does not contain full audited BLC-2-019 / BLC-2-047 interaction; registering
047 without its true source resolution boundary would risk premature trigger.
Both remain formally **unported**. Once that source ability is audited,
the resolver can enqueue already supported `{op:'draw',count:1}` after the
source program drains, without a special title reducer or inventing an op.

Negative cases exercised: wrong source identity/color, opponent effect,
generic discarded payment, deck mill, wrong moved card, wrong owner, delayed
scan only newer events, and a skipped/previewed change. A correct Ichigo
payment is source-qualified, unlike an arbitrary cost. No opponent hand
identity is exposed through `universalPublicView`. Full official FAQ
per-card certification remains a separate goal.
