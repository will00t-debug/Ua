# V2 C10 — BLC-4-074 alias and field-line energy retirement

Parent: C9 `a7cccc8630bec1b3c3f2fb0bd1aec1e04a91f34e`. Actions run 40059482097 SUCCESS, 2026-10-24 11:43–11:45 Asia/Taipei, Node v22.23.3, 2238/2238, matrix 60/60, manifest 367/700. This round registers one card. No `pack.mjs` or `engine.mjs` edit.

Official page checked 2026-10-24. No FAQ.

- BLC-4-074 EX15BT 山本 重國. 緑- / AP1 / BP1000 / 護廷十三隊 / 発生緑+ / no trigger. The whole print is 「このカードは〈山本 元柳斎 重國〉としても扱う。【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+緑と「メインフェイズ終了時、このキャラを退場させる。」を得る。」 The alias is the existing `nameAliases` field. The activate is the existing `restSelfGainEnergyRetireEndMain` with `lines:'field'`, the same resolved REST, +1, and end-of-MAIN retirement as SAO-2-050. 緑+ is one green pip, so the V2 REST base is 1. The imported catalogue `gen:2` stays as `legacyImportedGen`. Silence before activation blocks the ability. Silence after activation does not remove the gained energy or the scheduled retirement. A front character can activate and still generates 0.

A five-title scan found no other unported card with that catalogue sentence.

Local Node v22.23.4: `npm test` 2242/2242 fail 0, matrix 60/60, manifest bleach 118, gurren-lagann 38, solo-leveling 46, sword-art-online 111, mushoku-tensei 55, total 368/700. Unported 332, of which BLEACH 158 and MST 25. FAQ certification stays 0. Push Actions run 40060307791 on `edde298` succeeded at 2026-10-24 11:55–11:56 Asia/Taipei, Node v22.23.3, with the same 2242/2242, 60/60 and 368/700.

Phase 2 battle AI has not started. BLEACH is 118/276 and MST is 55/80.
