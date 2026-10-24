# Batch 29 — SAO-1-057 universal own hand-count BP threshold

Official UA15BT/SAO-1-057 ユージーン: BLUE3 AP1 base BP3500+ gen1, ALO trait, ACTIVE life trigger. Original complete body `【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+500。` https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-057

New generic live condition `{kind:'ownHandCountAtLeast',turn:'own',min:5}` in shared V2 evaluator, with a strict integer minimum schema; current physical controller's OWN hand length is read at each BP call and never opponent hand, no extra public hand data leaked. Same existing `passiveBonuses` runtime shared by SAO-2-019, MST-1-024, etc; no SAO-specific battle reducer and no cached modifier. Original printed characteristics, ACT life and full Japanese body fail-closed in SAO V2 official adapter.

Dedicated true-physical tests: both owners vs MST across FRONT+ENERGY; own live 5→4→5 hand cards BP4000→3500→4000, opponent turn 3500, opponent with hand 7 fails to satisfy, no secret hand reveals, source UID and deck conservation; actual AP-paid BLUE3 legal normal play, no phantom onPlay draw; malformed condition scopes/min schema strictly rejected.

After exact HEAD green: BLEACH85/276, TTG30/81, SLG34/80, SAO59/183, MST29/80, total 237/700 source-verified V2 candidates, 463 unported, 0 comprehensively per-card FAQ-certified. Do not merge main or deploy.