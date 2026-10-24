# V2 C14 — four official BLEACH pages, no registration

Parent: C13 `faa5d9e3c21815ef5da1c950d4867b8b25dcc987`. Actions run 40061220009 SUCCESS, 2026-10-24 12:09–12:11 Asia/Taipei, Node v22.23.3, 2242/2242, matrix 60/60, manifest 368/700. This note registers nothing. BLEACH stays 118/276 and MST stays 55/80.

Fetched 2026-10-24.

- BLC-2-004 EX07BT ユーグラム・ハッシュヴァルト. 黄4 / AP1 / BP4000 / 星十字騎士団 / 発生黄 / no trigger. On play, draw 1 only when 〈ユーハバッハ〉 is on the own field and this player's hand has fewer cards than the opponent's. `drawIfOwnName` has no hand-size comparison. The page had no FAQ.
- BLC-2-039 EX07BT シャルロッテ・クールホーン. 青2 / AP1 / BP3000 / 破面 and 涅骸部隊 / 発生青 / ACTIVE. On retire, during your turn, rest up to one opposing front character. Every copy of this name shares one use of that sentence per turn. Q1041: 「この効果」 means only that retire sentence. Q1042: two copies cannot each use it in the same turn. `restOppFrontOne` is not an on-retire operation, and it has no own-turn gate or shared name limit. ACTIVE life is the generic one.
- BLC-4-024 EX15BT 浦原 喜助. 青3 / AP1 / BP3000 / no trait / 発生青青 / ACTIVE. On play, move up to one other own character that has no trait to the other line. Q2312: if that line has no empty slot, choose one card, put it in the remove area, then move. No operation moves a character between lines. ACTIVE life is the generic one.
- BLC-1-092 UA08BT 山本 元柳斎 重國. 緑5 / AP1 / BP4000 / 護廷十三隊 / 発生緑 / COLOR. This character also generates energy on the front line, and during your turn a character that loses a battle against it is put in the remove area instead of retiring. Q572: that removed character's on-retire effect does not happen. Front-line generation exists, but the battle replacement does not, so the print is not one existing operation. COLOR deploys one green hand character of energy 2 or less and AP 1.

Phase 2 battle AI has not started.
