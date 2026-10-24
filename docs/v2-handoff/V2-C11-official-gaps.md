# V2 C11 — four official BLEACH pages, no registration

Parent: C10 `edde2983cce62db04bdeb14d6ea44d59d15e93a9`. Actions run 40060307791 SUCCESS, 2026-10-24 11:55–11:56 Asia/Taipei, Node v22.23.3, 2242/2242, matrix 60/60, manifest 368/700. This note registers nothing. The C11 commit `06c39ea` itself passed Actions run 40060671975 at 2026-10-24 12:01–12:02 Asia/Taipei, Node v22.23.3, with the same 2242/2242, 60/60 and 368/700. BLEACH stays 118/276 and MST stays 55/80.

Fetched 2026-10-24.

- BLC-2-062 EX07BT 綾瀬川 弓親. 緑2 / AP1 / BP2500 / 護廷十三隊 / 発生緑+ / no trigger. The only sentence is 「自分の場に他の［特徴：護廷十三隊］が合計3枚以上ある場合、このキャラの発生エナジー+緑。」 The page had no FAQ. `ownTraitCount` still counts characters only. C1 left that counter unchanged for the same 護廷十三隊 wording on BLC-1-084 and BLC-2-068. The current BLEACH catalogue has no non-character card with that trait, but the printed count is not limited to キャラ. SAO-2-006 uses the same counter for a different trait and is not a reason to widen it here.
- BLC-1-015 UA08BT. On play, draw 1 if the opponent has a rested character. `draw` has no opponent-rest gate. The page had no FAQ.
- BLC-1-027 UA08BT. On play, draw 1 if the opponent has a character at current BP 4000 or higher. `oppCharacterBpAtLeast` is a passive check, not a draw gate. The page had no FAQ.
- BLC-1-003 UA08BT. BP+1000 for each rested opposing front character. Q535: if this character attacks and an active opposing character rests to block, this character does gain BP+1000. `bpEach` is not that per-card rested-opponent count.

Phase 2 battle AI has not started.
