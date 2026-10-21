# Batch 25 — MST-1-051 mandatory onPlay draw-discard + generic official 1-copy limit

Source-pin UA54BT/MST-1-051 ロキシー GREEN3 AP1 BP3000 gen2 no trait, DRAW Life independently. Full Japanese printed text `〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。` Official detail: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-051

Official deck restriction effective 2026-10-01: `MST_V2_OFFICIAL_LIMITS['MST-1-051']`, 1 physical copy per deck, source https://www.unionarena-tcg.com/jp/rules/limited.php . Reuse mandatory shared `drawDiscardOne` onPlay template, no MST-specific reducer. New generic V2 card `maxCopies` field defaults4, checks integer 1..4, is enforced at V2 50-card deck validation, and verified sourceRecord.deckLimit must match a limited card's authored definition in the title contract (fail closed). No globally fabricated restrictions on other cards.

Dedicated tests: Japanese full-text fingerprint, official restriction and effective date, generic invalid 0/5/fraction/null caps, valid 1, invalid two-copy 50-card exact deck, source tamper rejection, one paid realistic 3-green-cost ordinary play with exact AP, physical own draw and mandatory own-hand UID discard, wrong fabricated discard, hidden opponent information, physical card conservation. Separate DRAW Life trigger remains generic independent.

Target after successful exact HEAD CI: BLEACH85 TTG30 SLG33 SAO56 MST29 = 233/700 candidate, 467 unported, 0 full independent official FAQ reviews. No main merge or production deployment.