# Eight Solo Leveling batches on the shared V2 engine

Official pages checked 2026-10-26. Catalogue Traditional Chinese is a paraphrase. Filters use the Japanese printed name and trait. Registration and these tests are not full FAQ acceptance. `fullyAccepted` stays 0.

| Card | Print | Shared behavior |
| --- | --- | --- |
| SLG-1-063 最上 真 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-063 | Reuses `searchTopOneBottomDiscard`. Trait token is 第四次架南島レイド. |
| SLG-1-054 黒須 圭介 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-054 | Reuses `inspectTopTraitOutside` (top 2, rest to top). ACTIVE life stays generic. |
| SLG-1-017 水篠 旬 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-017 | Reuses empty-field hand energy discount 2 and `peekTopOne`. |
| SLG-1-074 ルノー | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-074 | New `grantOwnOtherTraitImpact`: up to one other own DFN gets Impact 1 this turn. |
| SLG-1-071 マリー | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-071 | New `restSelfBuffOtherThenHand`: REST, once per physical UID, BP+1000 on another own character, then this card returns to hand. |
| SLG-1-050 観月 絵里 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-050 | New `restRetireRecoverNamed`: REST and retire, then optionally recover one outside character named 水篠 旬. |
| SLG-1-080 舞姫 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-080 | Draw 1, then `grantOnAttack` may name one own 向坂 雫. The attack-time icon belongs to the granted draw. |
| SLG-1-035 スキル：君主の領域 | https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-035 | Field enters ACTIVE. New `restBuffOwnTraitScaled`: own 影の軍団 cards get BP+500, or BP+1000 when five or more are on the own field. |

Inventory after this batch: 420/700 pilot, 280 unported (BLEACH 116, TTG 43, SLG 26, SAO 72, MST 23). Fully per-card FAQ certified 0. No main merge and no production deploy.
