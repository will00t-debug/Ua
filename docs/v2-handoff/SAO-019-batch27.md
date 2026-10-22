# Batch 27 — SAO-2-019 own-turn Silica live BP using generic ownNameExists

Official EX08BT/SAO-2-019 ピナ: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-019

FULL printed Japanese: `【自分のターン中】自分の場に〈シリカ〉がある場合、このキャラはBP+2000。`, blue2/AP1/BP2000+ (numeric base BP2000)/gen1, アインクラッド trait, ACTIVE Life separately. No printed onPlay or other hidden side effects. Reuses MST-1-024's shared strict passive live condition `{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:true,name:'シリカ'}`, modifier +2000, without per-title reducer.

Real physical SAO vs MST cases: owner P0 and P1; シリカ in own FRONT or ENERGY grants 4000 only own turn; opponent active or own SILICA removed => base2000 instantly (no stale snapshot); opponent-only own hand/outside negative; strict source and passive schema. All UID conserved. Increment SAO 57/183, 235/700 candidate, 465 unported, 0 independently FAQ-certified. No production deployment or merge.