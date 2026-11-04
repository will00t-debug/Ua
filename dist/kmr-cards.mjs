// Official UA29BT booster and UA29ST starter, Kamen Rider.
// Fetched 2026-11-01 from unionarena-tcg.com. Official Traditional Chinese
// card pages do not exist for these products (the TC list only has Vol.2
// EX12BT). Display names and effects are Traditional Chinese in the same
// wording as the other closed titles. They are not an official TC printing.
// The engine matches effectJa. Traits inside ［特徵：］ stay the printed
// Japanese token. One identity per card number. Reprints that match merge
// into the booster identity and keep both printings. Parallel character art
// is not a separate deck card. Action-point cards live in kmr-point-cards.mjs
// and are not deck cards. BP+ is a design mark: the integer is the printed
// base. Generated energy has no printed plus. engineKind is the classifier
// of effectJa. Registration is not an official FAQ certification.
export const KMR_FETCHED='2026-11-01';
export const KMR_SETS=Object.freeze(['UA29BT','UA29ST']);
export const KMR_CARDS=
[
 {
  "id": "KMR-1-001",
  "identity": "KMR-1-001",
  "number": "UA29BT/KMR-1-001",
  "name": "假面騎士ARK-ONE",
  "nameJa": "仮面ライダーアークワン",
  "ruby": "かめんらいだーあーくわん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-001",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-001",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-001.png"
   }
  ],
  "color": "yellow",
  "energy": 10,
  "ap": 2,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "color",
  "triggerText": "【顏色】對手的前線的角色選擇1張，休息，する。それ，下一次不會變為活動。",
  "triggerTextJa": "【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。",
  "effect": "依自己場外、消耗AP為2且持有特徵的卡的張數，手牌中的這張卡獲得以下全部效果。・2張以上：所需能量減少【黃×5】。・5張以上：這個角色以活動狀態登場。【衝擊（1）】（攻擊並在戰鬥中勝利時，對對手玩家造成1點傷害）【登場時】可以將自己牌組頂10張置於場外。這樣做的話，選擇對手前線BP 4000以下的角色最多1張，令其退場。",
  "effectJa": "自分の場外にある消費APが2で特徴を持つカードの枚数により、手札にあるこのカードは以下の効果を全て得る。・2枚以上：必要エナジーを【黄×5】減らす。・5枚以上：このキャラはアクティブで場に登場させる。【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）【登場時】自分の山札の上から10枚を場外に置いてもよい。そうした場合、BP4000以下の相手のフロントLのキャラを1枚まで選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-001.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-001",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-001",
  "faq": [
   {
    "id": "Q1136",
    "date": "2024.10.18 更新",
    "q": "このキャラの【登場時】で自分の山札の上から10枚を場外に置いた結果、場外にある消費APが2で特徴を持つカードが5枚以上になった場合、このキャラをアクティブにすることはできますか？",
    "a": "いいえ、できません。"
   }
  ]
 },
 {
  "id": "KMR-1-002",
  "identity": "KMR-1-002",
  "number": "UA29BT/KMR-1-002",
  "name": "假面騎士Woz",
  "nameJa": "仮面ライダーウォズ",
  "ruby": "かめんらいだーうぉず",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-002",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-002",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-002.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【在自己的回合中】這個回合中，自己的牌組從【Raid】，持有黃色以外的卡，公開並手牌，已加入時，這個角色，BP+1500。",
  "effectJa": "【自分のターン中】このターン中に自分の山札から【レイド】を持つ黄以外のカードを公開して手札に加えている場合、このキャラはBP+1500。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-002.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-002",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-002",
  "faq": []
 },
 {
  "id": "KMR-1-003",
  "identity": "KMR-1-003",
  "number": "UA29BT/KMR-1-003",
  "name": "假面騎士Woz銀河終結",
  "nameJa": "仮面ライダーウォズギンガファイナリー",
  "ruby": "かめんらいだーうぉずぎんがふぁいなりー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-003",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-003",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-003.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "+",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【啟動主要】【每回合1次】這個回合中，自己的牌組從【Raid】，持有黃色以外的卡，公開並手牌，已加入時才發動可以。從以下選擇1項。・抽1張牌，將自己的1張手牌置於場外。・這個角色，這個回合中、BP+1000。",
  "effectJa": "【起動メイン】【ターン1】このターン中に自分の山札から【レイド】を持つ黄以外のカードを公開して手札に加えている場合のみ発動できる。以下から1つ選ぶ。・カードを1枚引き、自分の手札を1枚場外に置く。・このキャラはこのターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-003.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-003",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-003",
  "faq": []
 },
 {
  "id": "KMR-1-004",
  "identity": "KMR-1-004",
  "number": "UA29BT/KMR-1-004",
  "name": "假面騎士Ohma Zi-O (2019)",
  "nameJa": "仮面ライダーオーマジオウ (2019)",
  "ruby": "かめんらいだーおーまじおう（にせんじゅうきゅう）",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-004",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-004",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-004.png"
   }
  ],
  "color": "yellow",
  "energy": 6,
  "ap": 2,
  "bp": 5000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "這個角色以活動狀態登場。【在前線時】自己的攻擊階段結束時、自己的場，卡名包含「ライダー」，含み、不同的卡名的角色，8張以上ある時，對手玩家，1傷害。【登場時】這個角色，這個回合中、【衝擊（1）】（攻擊並在戰鬥中勝利時，對對手玩家造成1點傷害），獲得。",
  "effectJa": "このキャラはアクティブで場に登場させる。【フロントLにある場合】自分のアタックフェイズ終了時、自分の場にカード名に「ライダー」を含み、異なるカード名のキャラが8枚以上ある場合、相手プレイヤーに1ダメージ。【登場時】このキャラはこのターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-004.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-004",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-004",
  "faq": []
 },
 {
  "id": "KMR-1-005",
  "identity": "KMR-1-005",
  "number": "UA29BT/KMR-1-005",
  "name": "假面騎士Grand Zi-O",
  "nameJa": "仮面ライダーグランドジオウ",
  "ruby": "かめんらいだーぐらんどじおう",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-005",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-005",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-005.png"
   }
  ],
  "color": "yellow",
  "energy": 6,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「ZI-O」的角色 可以置為活動，並移動到前線【登場時】自己的手牌從BP4000以下，【Raid】，持有黃色以外的不同的卡名的角色卡，2張為止自己的前線，休息，令其登場。自己的前線的角色最多選擇1張，活動，する。【啟動主要】【在前線時】 【支付1點AP】 【每回合1次】自己的場的角色全部，這個回合中、BP+1000。",
  "effectJa": "【レイド】カード名に「ジオウ」を含むキャラ アクティブにし、フロントLに移動できる【登場時】自分の手札からBP4000以下で【レイド】を持つ黄以外の異なるカード名のキャラカードを2枚まで自分のフロントLにレストで登場させる。自分のフロントLのキャラを1枚まで選び、アクティブにする。【起動メイン】【フロントLにある場合】 【APを1支払う】 【ターン1】自分の場のキャラ全ては、このターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-005.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-005",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-005",
  "faq": []
 },
 {
  "id": "KMR-1-006",
  "identity": "KMR-1-006",
  "number": "UA29BT/KMR-1-006",
  "name": "假面騎士Geiz",
  "nameJa": "仮面ライダーゲイツ",
  "ruby": "かめんらいだーげいつ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-006",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-006",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-006.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-006.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-006",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-007",
  "identity": "KMR-1-007",
  "number": "UA29BT/KMR-1-007",
  "name": "假面騎士Geiz Ghost Armor",
  "nameJa": "仮面ライダーゲイツ ゴーストアーマー",
  "ruby": "かめんらいだーげいつ　ごーすとあーまー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-007",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-007",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-007.png"
   }
  ],
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去【衝擊】）",
  "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-007.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-007",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "impactNull",
  "faq": []
 },
 {
  "id": "KMR-1-008",
  "identity": "KMR-1-008",
  "number": "UA29BT/KMR-1-008",
  "name": "假面騎士Geiz Revive剛烈",
  "nameJa": "仮面ライダーゲイツリバイブ剛烈",
  "ruby": "かめんらいだーげいつりばいぶごうれつ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-008",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-008",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-008.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去【衝擊】）這個角色不會因對手的效果返回手牌。自己的攻擊階段結束時、「自己的手牌，1張場外，置き、這個角色，令其退場。」，可以。這樣做的話，自己的場外從〈假面騎士Geiz Revive疾風〉，1張為止自己的場，休息，令其登場。",
  "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）このキャラは相手の効果で手札に戻らない。自分のアタックフェイズ終了時、「自分の手札を1枚場外に置き、このキャラを退場させる。」をしてもよい。そうした場合、自分の場外から〈仮面ライダーゲイツリバイブ疾風〉を1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-008.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-008",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-008",
  "faq": [
   {
    "id": "Q1473",
    "date": "2025.03.28 更新",
    "q": "「このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。」を持つ相手のキャラクターをブロックし、バトルに敗北した場合はどうなりますか？",
    "a": "退場する代わりに手札に戻ります。「このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。」等、バトルの敗北による「退場」を別の処理へ置き換える効果は、ルールによる処理を変更する効果の為、「相手の効果」に含まれません。"
   }
  ]
 },
 {
  "id": "KMR-1-009",
  "identity": "KMR-1-009",
  "number": "UA29BT/KMR-1-009",
  "name": "假面騎士Geiz Revive疾風",
  "nameJa": "仮面ライダーゲイツリバイブ疾風",
  "ruby": "かめんらいだーげいつりばいぶしっぷう",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-009",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-009",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-009.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 3000,
  "bpMark": "+",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "這個角色不受令BP減少的效果影響。【在自己的回合中】這個角色BP+1000。自己的攻擊階段結束時、「自己的手牌，1張場外，置き、這個角色，令其退場。」，可以。這樣做的話，自己的場外從〈假面騎士Geiz Revive剛烈〉，1張為止自己的場，休息，令其登場。",
  "effectJa": "このキャラはBPをマイナスする効果を受けない。【自分のターン中】このキャラはBP+1000。自分のアタックフェイズ終了時、「自分の手札を1枚場外に置き、このキャラを退場させる。」をしてもよい。そうした場合、自分の場外から〈仮面ライダーゲイツリバイブ剛烈〉を1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-009.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-009",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-009",
  "faq": []
 },
 {
  "id": "KMR-1-010",
  "identity": "KMR-1-010",
  "number": "UA29BT/KMR-1-010",
  "name": "假面騎士ZI-O",
  "nameJa": "仮面ライダージオウ",
  "ruby": "かめんらいだーじおう",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-010",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-010",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-010.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1000,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【置為休息】【每回合1次】這個角色在這個回合中獲得產生能量+【黃】，以及「主要階段結束時，令這個角色退場。」",
  "effectJa": "【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【黄】と「メインフェイズ終了時、このキャラを退場させる。」を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-010.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-010",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-010",
  "faq": []
 },
 {
  "id": "KMR-1-011",
  "identity": "KMR-1-011",
  "number": "UA29BT/KMR-1-011",
  "name": "假面騎士ZI-OII",
  "nameJa": "仮面ライダージオウⅡ",
  "ruby": "かめんらいだーじおうつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-011",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-011",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-011.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】查看自己牌庫上方 2 張牌。將其中任意張數依想要的順序放回牌庫頂，其餘依想要的順序放到牌庫底。",
  "effectJa": "【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを望む順で下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-011.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-011",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-011",
  "faq": []
 },
 {
  "id": "KMR-1-012",
  "identity": "KMR-1-012",
  "number": "UA29BT/KMR-1-012",
  "name": "假面騎士ZI-O Decade Armor",
  "nameJa": "仮面ライダージオウ ディケイドアーマー",
  "ruby": "かめんらいだーじおう　でぃけいどあーまー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-012",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-012",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-012.png"
   }
  ],
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "color",
  "triggerText": "【顏色】對手的前線的角色選擇1張，休息，する。それ，下一次不會變為活動。",
  "triggerTextJa": "【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。",
  "effect": "【登場時】自己的從牌組頂7張查看。そ的中從【Raid】，持有黃色以外的卡，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。",
  "effectJa": "【登場時】自分の山札の上から7枚見る。その中から【レイド】を持つ黄以外のカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-012.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-012",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-012",
  "faq": [
   {
    "id": "Q1211",
    "date": "2024.11.08 更新",
    "q": "「レイドを持つ黄以外のカード」は具体的にはどういうことですか？",
    "a": "レイドを持つ、赤か青か緑か紫のカードです。"
   }
  ]
 },
 {
  "id": "KMR-1-013",
  "identity": "KMR-1-013",
  "number": "UA29BT/KMR-1-013",
  "name": "假面騎士ZI-O Trinity",
  "nameJa": "仮面ライダージオウトリニティ",
  "ruby": "かめんらいだーじおうとりにてぃ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-013",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-013",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-013.png"
   }
  ],
  "color": "yellow",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「ZI-O」的角色 可以置為活動，並移動到前線【登場時】自己的從牌組頂5張查看。そ的中從卡名包含「ライダー」的卡，『1張』為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。自己的場，卡名包含「Geiz」的角色和卡名包含「Woz」的角色，どちら也ある時，『2張』，代わる。",
  "effectJa": "【レイド】カード名に「ジオウ」を含むキャラ アクティブにし、フロントLに移動できる【登場時】自分の山札の上から5枚見る。その中からカード名に「ライダー」を含むカードを『1枚』まで公開し手札に加える。残りを望む順で自分の山札の下に置く。自分の場にカード名に「ゲイツ」を含むキャラとカード名に「ウォズ」を含むキャラがどちらもある場合、『2枚』に代わる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-013.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-013",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-013",
  "faq": []
 },
 {
  "id": "KMR-1-014",
  "identity": "KMR-1-014",
  "number": "UA29BT/KMR-1-014",
  "name": "假面騎士ZI-O Build Armor",
  "nameJa": "仮面ライダージオウ ビルドアーマー",
  "ruby": "かめんらいだーじおう　びるどあーまー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-014",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-014",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-014.png"
   }
  ],
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【登場時】自己的從牌組頂1張，公開可以。這樣做的話，公開した卡，【Raid】，持有黃色以外的卡なら、そ的卡，加入手牌。公開した卡，それ以外なら、そ的卡，自己的牌組頂或下，放置。",
  "effectJa": "【登場時】自分の山札の上から1枚を公開してもよい。そうした場合、公開したカードが【レイド】を持つ黄以外のカードなら、そのカードを手札に加える。公開したカードがそれ以外なら、そのカードを自分の山札の上か下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-014.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-014",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-014",
  "faq": []
 },
 {
  "id": "KMR-1-015",
  "identity": "KMR-1-015",
  "number": "UA29BT/KMR-1-015",
  "name": "假面騎士Tsukuyomi",
  "nameJa": "仮面ライダーツクヨミ",
  "ruby": "かめんらいだーつくよみ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-015",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-015",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-015.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "對手場上有藍或紅的卡時，手牌中這張卡的所需能量減少【黃×1】。",
  "effectJa": "相手の場に青か赤のカードがある場合、手札にあるこのカードの必要エナジーを【黄×1】減らす。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-015.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-015",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-015",
  "faq": []
 },
 {
  "id": "KMR-1-016",
  "identity": "KMR-1-016",
  "number": "UA29BT/KMR-1-016",
  "name": "假面騎士Vulcan Assault Wolf",
  "nameJa": "仮面ライダーバルカン アサルトウルフ",
  "ruby": "かめんらいだーばるかん　あさるとうるふ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-016",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-016",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-016.png"
   },
   {
    "number": "UA29ST/KMR-1-016",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-016",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-016.png"
   }
  ],
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "這個角色為活動時，這個角色的產生能量+【黃】。",
  "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【黄】。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-016.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-016",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-016",
  "faq": []
 },
 {
  "id": "KMR-1-017",
  "identity": "KMR-1-017",
  "number": "UA29BT/KMR-1-017",
  "name": "假面騎士Vulcan Shooting Wolf",
  "nameJa": "仮面ライダーバルカン シューティングウルフ",
  "ruby": "かめんらいだーばるかん　しゅーてぃんぐうるふ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-017",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-017",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-017.png"
   },
   {
    "number": "UA29ST/KMR-1-017",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-017",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-017.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【步進】（在自己的移動階段，可以從前線移到能量區）",
  "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-017.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-017",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-017",
  "faq": []
 },
 {
  "id": "KMR-1-018",
  "identity": "KMR-1-018",
  "number": "UA29BT/KMR-1-018",
  "name": "假面騎士Valkyrie Rushing Cheetah",
  "nameJa": "仮面ライダーバルキリー ラッシングチーター",
  "ruby": "かめんらいだーばるきりー　らっしんぐちーたー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-018",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-018",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-018.png"
   },
   {
    "number": "UA29ST/KMR-1-018",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-018",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-018.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【登場時】抽1張牌，將自己的1張手牌置於場外。",
  "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-018.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-018",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "drawDiscard",
  "faq": []
 },
 {
  "id": "KMR-1-019",
  "identity": "KMR-1-019",
  "number": "UA29BT/KMR-1-019",
  "name": "假面騎士Rampage Vulcan",
  "nameJa": "仮面ライダーランペイジバルカン",
  "ruby": "かめんらいだーらんぺいじばるかん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-019",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-019",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-019.png"
   }
  ],
  "color": "yellow",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "R",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「Vulcan」的角色 可以置為活動，並移動到前線【啟動主要】【每回合1次】從以下選擇『1項』。這個角色，這個回合中，尚未登場時，AP，1支払って也よい。這樣做的話，『全部』，代わる。・這個角色，這個回合中、【衝擊（1）】，獲得。・這個角色，這個回合中、【傷害（2）】，獲得。・這個角色，這個回合中、BP+1000。",
  "effectJa": "【レイド】カード名に「バルカン」を含むキャラ アクティブにし、フロントLに移動できる【起動メイン】【ターン1】以下から『1つ』選ぶ。このキャラがこのターン中に登場していない場合、APを1支払ってもよい。そうした場合、『全て』に代わる。・このキャラはこのターン中、【インパクト（1）】を得る。・このキャラはこのターン中、【ダメージ（2）】を得る。・このキャラはこのターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-019.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-019",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-019",
  "faq": []
 },
 {
  "id": "KMR-1-020",
  "identity": "KMR-1-020",
  "number": "UA29BT/KMR-1-020",
  "name": "假面騎士Thouser",
  "nameJa": "仮面ライダーサウザー",
  "ruby": "かめんらいだーさうざー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-020",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-020",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-020.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ザイアエンタープライズ"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "自己的場外，不同的卡名的〔［特徵：飛電インテリジェンス］和［特徵：A.I.M.S. SQUAD］和［特徵：滅亡迅雷.net］〕，合計4張以上ある時，這個角色，【傷害（2）】（這個角色以攻擊造成直接傷害時，改為造成2點傷害），獲得。",
  "effectJa": "自分の場外に異なるカード名の〔［特徴：飛電インテリジェンス］と［特徴：A.I.M.S. SQUAD］と［特徴：滅亡迅雷.net］〕が合計4枚以上ある場合、このキャラは【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-020.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-020",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-020",
  "faq": []
 },
 {
  "id": "KMR-1-021",
  "identity": "KMR-1-021",
  "number": "UA29BT/KMR-1-021",
  "name": "假面騎士ZERO-TWO（伊茲）",
  "nameJa": "仮面ライダーゼロツー（イズ）",
  "ruby": "かめんらいだーぜろつー（いず）",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-021",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-021",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-021.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 2,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "SR",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "自己的在攻擊階段中〈假面騎士ZERO-ONE Realizing Hopper〉，レイドした時、自己的場，［特徵：飛電インテリジェンス］，3張以上ある時，手牌，ある這張卡，自己的場，休息，登場させて也よい。〈假面騎士ZERO-TWO（伊茲）〉的這個效果，1ターン，1回的み發動可以。【登場時】自己的場的卡名包含「ZERO-ONE」的角色最多選擇1張，這個回合中、BP+1000和【傷害（2）】，給予。",
  "effectJa": "自分のアタックフェイズ中に〈仮面ライダーゼロワン リアライジングホッパー〉がレイドした時、自分の場に［特徴：飛電インテリジェンス］が3枚以上ある場合、手札にあるこのカードを自分の場にレストで登場させてもよい。〈仮面ライダーゼロツー（イズ）〉のこの効果は1ターンに1回のみ発動できる。【登場時】自分の場のカード名に「ゼロワン」を含むキャラを1枚まで選び、このターン中、BP+1000と【ダメージ（2）】を与える。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-021.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-021",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-021",
  "faq": [
   {
    "id": "Q1137",
    "date": "2024.10.18 更新",
    "q": "「〈仮面ライダーゼロツー（イズ）〉のこの効果は1ターンに1回のみ発動できる。」の「この効果」は何を指しますか？",
    "a": "「自分のアタックフェイズ中に〈仮面ライダーゼロワン リアライジングホッパー〉がレイドした時、自分の場に［特徴：飛電インテリジェンス］が3枚以上ある場合、手札にあるこのカードを自分の場にレストで登場させてもよい。」の効果のみを指します。同一カードにある他の効果は指しません。"
   },
   {
    "id": "Q1138",
    "date": "2024.10.18 更新",
    "q": "このカードが手札に2枚ある場合、このカードの「自分のアタックフェイズ中に〈仮面ライダーゼロワン リアライジングホッパー〉がレイドした時、自分の場に［特徴：飛電インテリジェンス］が3枚以上ある場合、手札にあるこのカードを自分の場にレストで登場させてもよい。」の効果を同じターンにそれぞれ1回ずつ発動できますか？",
    "a": "いいえ、どちらか片方しか発動できません。"
   }
  ]
 },
 {
  "id": "KMR-1-022",
  "identity": "KMR-1-022",
  "number": "UA29BT/KMR-1-022",
  "name": "假面騎士ZERO-ONE Metal Cluster Hopper",
  "nameJa": "仮面ライダーゼロワン メタルクラスタホッパー",
  "ruby": "かめんらいだーぜろわん　めたるくらすたほっぱー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-022",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-022",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-022.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "R",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「ZERO-ONE」的角色 可以置為活動，並移動到前線【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去【衝擊】）【登場時】自己的手牌或自己的場外從所需能量，1以下，消耗AP，1的黃的角色卡，1張為止自己的場，休息，令其登場。手牌從登場させた時，卡，1張為止抽。",
  "effectJa": "【レイド】カード名に「ゼロワン」を含むキャラ アクティブにし、フロントLに移動できる【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【登場時】自分の手札か自分の場外から必要エナジーが1以下で消費APが1の黄のキャラカードを1枚まで自分の場にレストで登場させる。手札から登場させた場合、カードを1枚まで引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-022.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-022",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-022",
  "faq": []
 },
 {
  "id": "KMR-1-023",
  "identity": "KMR-1-023",
  "number": "UA29BT/KMR-1-023",
  "name": "假面騎士ZERO-ONE Rising Hopper",
  "nameJa": "仮面ライダーゼロワン ライジングホッパー",
  "ruby": "かめんらいだーぜろわん　らいじんぐほっぱー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-023",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-023",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-023.png"
   },
   {
    "number": "UA29ST/KMR-1-023",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-023",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-023.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "C",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-023.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-023",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-024",
  "identity": "KMR-1-024",
  "number": "UA29BT/KMR-1-024",
  "name": "假面騎士Ark-Zero",
  "nameJa": "仮面ライダーアークゼロ",
  "ruby": "かめんらいだーあーくぜろ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-024",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-024",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-024.png"
   }
  ],
  "color": "yellow",
  "energy": 5,
  "ap": 2,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "滅亡迅雷.net"
  ],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【登場時】抽2張牌，將自己的2張手牌置於場外。之後，『BP2000』以下的對手的前線的角色最多選擇1張，令其退場。這個效果，場外，置いた［特徵：滅亡迅雷.net］1張，つき、這個效果，選べる角色的BP的範囲+1000。",
  "effectJa": "【登場時】カードを2枚引き、自分の手札を2枚場外に置く。その後、『BP2000』以下の相手のフロントLのキャラを1枚まで選び、退場させる。この効果で場外に置いた［特徴：滅亡迅雷.net］1枚につき、この効果で選べるキャラのBPの範囲+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-024.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-024",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-024",
  "faq": []
 },
 {
  "id": "KMR-1-025",
  "identity": "KMR-1-025",
  "number": "UA29BT/KMR-1-025",
  "name": "假面騎士迅 Burning Falcon",
  "nameJa": "仮面ライダー迅 バーニングファルコン",
  "ruby": "かめんらいだーじん　ばーにんぐふぁるこん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-025",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-025",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-025.png"
   },
   {
    "number": "UA29ST/KMR-1-025",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-025",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-025.png"
   }
  ],
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "滅亡迅雷.net"
  ],
  "rarity": "U",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【在前線時】〈假面騎士迅 Burning Falcon〉以外的自己的場的角色，對手的角色的効果，因退場時，代わり，這個角色，退場させて也よい。【退場時】抽1張牌，將自己的1張手牌置於場外。",
  "effectJa": "【フロントLにある場合】〈仮面ライダー迅 バーニングファルコン〉以外の自分の場のキャラが相手のキャラの効果によって退場する場合、代わりにこのキャラを退場させてもよい。【退場時】カードを1枚引き、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-025.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-025",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-025",
  "faq": [
   {
    "id": "Q1139",
    "date": "2024.10.18 更新",
    "q": "相手のキャラの効果でBPが0になったキャラが退場する場合にこのキャラを代わりに退場させることができますか？",
    "a": "いいえ、できません。BPが0になったことによる退場はキャラの効果による退場ではありません。"
   }
  ]
 },
 {
  "id": "KMR-1-026",
  "identity": "KMR-1-026",
  "number": "UA29BT/KMR-1-026",
  "name": "假面騎士迅 Flying Falcon",
  "nameJa": "仮面ライダー迅 フライングファルコン",
  "ruby": "かめんらいだーじん　ふらいんぐふぁるこん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-026",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-026",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-026.png"
   },
   {
    "number": "UA29ST/KMR-1-026",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-026",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-026.png"
   }
  ],
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "滅亡迅雷.net"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】將自己場上另1張所需能量1以下的角色返回手牌。無法返回時，將這個角色返回手牌。",
  "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-026.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-026",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "bounce1",
  "faq": []
 },
 {
  "id": "KMR-1-027",
  "identity": "KMR-1-027",
  "number": "UA29BT/KMR-1-027",
  "name": "假面騎士滅",
  "nameJa": "仮面ライダー滅",
  "ruby": "かめんらいだーほろび",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-027",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-027",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-027.png"
   },
   {
    "number": "UA29ST/KMR-1-027",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-027",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-027.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "+",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "滅亡迅雷.net"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【將1張手牌置於場外】 【每回合1次】這個角色，這個回合中、BP+1000。【啟動主要】【在前線時】 【每回合1次】自己的從牌組頂1張查看。そ的卡，自己的牌組頂或場外，放置。",
  "effectJa": "【起動メイン】【手札を1枚場外に置く】 【ターン1】このキャラはこのターン中、BP+1000。【起動メイン】【フロントLにある場合】 【ターン1】自分の山札の上から1枚見る。そのカードを自分の山札の上か場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-027.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-027",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-027",
  "faq": []
 },
 {
  "id": "KMR-1-028",
  "identity": "KMR-1-028",
  "number": "UA29BT/KMR-1-028",
  "name": "Time Mazine",
  "nameJa": "タイムマジーン",
  "ruby": "たいむまじーん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-028",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-028",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-028.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "field",
  "traits": [],
  "rarity": "C",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "【登場時】自己的從牌組頂4張查看。そ的中從卡名包含「ZI-O」或「Geiz」或「Woz」或「Tsukuyomi」的角色卡，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。【啟動主要】【置為休息】 【令這張卡退場】自己的場外從【Raid】，持有黃色以外的卡，1張為止自己的牌組頂，放置。",
  "effectJa": "【登場時】自分の山札の上から4枚見る。その中からカード名に「ジオウ」か「ゲイツ」か「ウォズ」か「ツクヨミ」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。【起動メイン】【レストにする】 【このカードを退場させる】自分の場外から【レイド】を持つ黄以外のカードを1枚まで自分の山札の上に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-028.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-028",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-028",
  "faq": []
 },
 {
  "id": "KMR-1-029",
  "identity": "KMR-1-029",
  "number": "UA29BT/KMR-1-029",
  "name": "衛星Ark",
  "nameJa": "衛星アーク",
  "ruby": "えいせいあーく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-029",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-029",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-029.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 2,
  "bp": 0,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "field",
  "traits": [
   "滅亡迅雷.net"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【置為休息】 【令這張卡退場】自己的從牌組頂4張查看。そ的中從［特徵：滅亡迅雷.net］或卡名包含「アサルト」或「アーク」的卡，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。【啟動主要】【在場外時】 【支付1點AP】自己的產生能量，3以上ある時才發動可以。場外的這張卡，自己的能量區，休息，令其登場。",
  "effectJa": "【起動メイン】【レストにする】 【このカードを退場させる】自分の山札の上から4枚見る。その中から［特徴：滅亡迅雷.net］かカード名に「アサルト」か「アーク」を含むカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。【起動メイン】【場外にある場合】 【APを1支払う】自分の発生エナジーが3以上ある場合のみ発動できる。場外のこのカードを自分のエナジーLにレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-029.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-029",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-029",
  "faq": []
 },
 {
  "id": "KMR-1-030",
  "identity": "KMR-1-030",
  "number": "UA29BT/KMR-1-030",
  "name": "慶祝吧！",
  "nameJa": "祝え！",
  "ruby": "いわえ！",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-030",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-030",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-030.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "自己的從牌組頂7張查看。そ的中從卡名包含「ZI-O」的角色卡和【Raid】，持有黃色以外的卡，それぞれ1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。",
  "effectJa": "自分の山札の上から7枚見る。その中からカード名に「ジオウ」を含むキャラカードと【レイド】を持つ黄以外のカードをそれぞれ1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-030.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-030",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-030",
  "faq": []
 },
 {
  "id": "KMR-1-031",
  "identity": "KMR-1-031",
  "number": "UA29BT/KMR-1-031",
  "name": "Time Break",
  "nameJa": "タイムブレーク",
  "ruby": "たいむぶれーく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-031",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-031",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-031.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "U",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "『BP2000以下』的對手的前線的角色選擇1張，令其退場。自己的場，卡名包含「ZI-O」的角色，ある時，『BP5000以下』，代わる。這個回合中，自己的牌組從【Raid】，持有黃色以外的卡，公開並手牌，已加入時，自己的場的角色最多選擇1張，這個回合中、BP+1000。",
  "effectJa": "『BP2000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場にカード名に「ジオウ」を含むキャラがある場合、『BP5000以下』に代わる。このターン中に自分の山札から【レイド】を持つ黄以外のカードを公開して手札に加えている場合、自分の場のキャラを1枚まで選び、このターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-031.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-031",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-031",
  "faq": []
 },
 {
  "id": "KMR-1-032",
  "identity": "KMR-1-032",
  "number": "UA29BT/KMR-1-032",
  "name": "變身",
  "nameJa": "変身",
  "ruby": "へんしん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-032",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-032",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-032.png"
   },
   {
    "number": "UA29ST/KMR-1-032",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-032",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-032.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "U",
  "trigger": "final",
  "triggerText": "【終結】自己的生命，無い時，自己的從牌組頂1張，自己的生命區，放置。",
  "triggerTextJa": "【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。",
  "effect": "選擇自己最多2張AP卡，置為活動。",
  "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-032.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-032",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "recover2",
  "faq": []
 },
 {
  "id": "KMR-1-033",
  "identity": "KMR-1-033",
  "number": "UA29BT/KMR-1-033",
  "name": "Rising Impact",
  "nameJa": "ライジングインパクト",
  "ruby": "らいじんぐいんぱくと",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT",
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-033",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-033",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-033.png"
   },
   {
    "number": "UA29ST/KMR-1-033",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-033",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-033.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "R",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "BP5000以下的對手的前線的角色選擇1張，『休息，する。それ，下一次不會變為活動』。自己的場，卡名包含「ZERO-ONE」的角色，ある時，『令其退場』，代わる。",
  "effectJa": "BP5000以下の相手のフロントLのキャラを1枚選び、『レストにする。それは次の1回アクティブにならない』。自分の場にカード名に「ゼロワン」を含むキャラがある場合、『退場させる』に代わる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-033.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-033",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-033",
  "faq": []
 },
 {
  "id": "KMR-1-034",
  "identity": "KMR-1-034",
  "number": "UA29BT/KMR-1-034",
  "name": "假面騎士OOO Gatakiriba Combo",
  "nameJa": "仮面ライダーオーズ ガタキリバ コンボ",
  "ruby": "かめんらいだーおーず　がたきりば　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-034",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-034",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-034.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 3500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【在前線時】 【每回合1次】自己的手牌的所需能量，相同的卡，3張場外，放置。這樣做的話，自己的手牌從所需能量，3以下，消耗AP，1的卡名包含「OOO」的角色卡，1張為止自己的場，休息，登場させ、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の必要エナジーが同じカードを3枚場外に置く。そうした場合、自分の手札から必要エナジーが3以下で消費APが1のカード名に「オーズ」を含むキャラカードを1枚まで自分の場にレストで登場させ、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-034.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-034",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-034",
  "faq": [
   {
    "id": "Q1140",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-035",
  "identity": "KMR-1-035",
  "number": "UA29BT/KMR-1-035",
  "name": "假面騎士OOO Sagohzo Combo",
  "nameJa": "仮面ライダーオーズ サゴーゾ コンボ",
  "ruby": "かめんらいだーおーず　さごーぞ　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-035",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-035",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-035.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 3500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【啟動主要】【在前線時】 【每回合1次】自己的手牌的所需能量，相同的卡，3張場外，放置。這樣做的話，對手的前線的角色最多選擇1張，休息，し、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の必要エナジーが同じカードを3枚場外に置く。そうした場合、相手のフロントLのキャラを1枚まで選び、レストにし、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-035.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-035",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-035",
  "faq": [
   {
    "id": "Q1141",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-036",
  "identity": "KMR-1-036",
  "number": "UA29BT/KMR-1-036",
  "name": "假面騎士OOO Shauta Combo",
  "nameJa": "仮面ライダーオーズ シャウタ コンボ",
  "ruby": "かめんらいだーおーず　しゃうた　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-036",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-036",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-036.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【啟動主要】【在前線時】 【每回合1次】自己的手牌的所需能量，相同的卡，3張場外，放置。這樣做的話，這個角色，這個回合中、「這個角色，BP4000以上的角色，阻擋されない。」，得て、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の必要エナジーが同じカードを3枚場外に置く。そうした場合、このキャラはこのターン中、「このキャラはBP4000以上のキャラにブロックされない。」を得て、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-036.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-036",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-036",
  "faq": [
   {
    "id": "Q1142",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-037",
  "identity": "KMR-1-037",
  "number": "UA29BT/KMR-1-037",
  "name": "假面騎士OOO Takakiriba",
  "nameJa": "仮面ライダーオーズ タカキリバ",
  "ruby": "かめんらいだーおーず　たかきりば",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-037",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-037",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-037.png"
   }
  ],
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "color",
  "triggerText": "【顏色】BP3500以下的對手的前線的角色選擇1張，返回手牌。",
  "triggerTextJa": "【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。",
  "effect": "【登場時】自己的從牌組頂3張查看。そ的中從卡名包含「OOO」的角色卡或〈Core Medal〉或〈Cell Medal〉，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。",
  "effectJa": "【登場時】自分の山札の上から3枚見る。その中からカード名に「オーズ」を含むキャラカードか〈コアメダル〉か〈セルメダル〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-037.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-037",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-037",
  "faq": []
 },
 {
  "id": "KMR-1-038",
  "identity": "KMR-1-038",
  "number": "UA29BT/KMR-1-038",
  "name": "假面騎士OOO Takatorartar",
  "nameJa": "仮面ライダーオーズ タカトラーター",
  "ruby": "かめんらいだーおーず　たかとらーた",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-038",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-038",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-038.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【在自己的回合中】這個角色BP+1000。",
  "effectJa": "【自分のターン中】このキャラはBP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-038.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-038",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-038",
  "faq": []
 },
 {
  "id": "KMR-1-039",
  "identity": "KMR-1-039",
  "number": "UA29BT/KMR-1-039",
  "name": "假面騎士OOO Tajadol Combo",
  "nameJa": "仮面ライダーオーズ タジャドル コンボ",
  "ruby": "かめんらいだーおーず　たじゃどる　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-039",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-039",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-039.png"
   }
  ],
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「OOO」的角色 可以置為活動，並移動到前線自己的手牌，7張以上的時，這個角色，【傷害（2）】，獲得。【登場時】自己的場或自己的手牌的〈Ankh〉，1張移除區，置いて也よい。這樣做的話，卡，1張為止引き、這個角色，這個回合中、BP+1000和【衝擊（1）】，獲得。【啟動主要】【在前線時】 【每回合1次】自己的手牌的所需能量，相同的卡，3張場外，放置。這樣做的話，卡，1張引き、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【レイド】カード名に「オーズ」を含むキャラ アクティブにし、フロントLに移動できる自分の手札が7枚以上の場合、このキャラは【ダメージ（2）】を得る。【登場時】自分の場か自分の手札の〈アンク〉を1枚リムーブエリアに置いてもよい。そうした場合、カードを1枚まで引き、このキャラはこのターン中、BP+1000と【インパクト（1）】を得る。【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の必要エナジーが同じカードを3枚場外に置く。そうした場合、カードを1枚引き、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-039.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-039",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-039",
  "faq": [
   {
    "id": "Q1143",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-040",
  "identity": "KMR-1-040",
  "number": "UA29BT/KMR-1-040",
  "name": "假面騎士OOO Tatoba Combo",
  "nameJa": "仮面ライダーオーズ タトバ コンボ",
  "ruby": "かめんらいだーおーず　たとば　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-040",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-040",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-040.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】自己的從牌組頂7張查看。そ的中從〈Ankh〉，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌的〈Ankh〉或所需能量，1以下的卡，1張場外，放置。",
  "effectJa": "【登場時】自分の山札の上から7枚見る。その中から〈アンク〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札の〈アンク〉か必要エナジーが1以下のカードを1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-040.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-040",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-040",
  "faq": []
 },
 {
  "id": "KMR-1-041",
  "identity": "KMR-1-041",
  "number": "UA29BT/KMR-1-041",
  "name": "假面騎士OOO Putotyra Combo",
  "nameJa": "仮面ライダーオーズ プトティラ コンボ",
  "ruby": "かめんらいだーおーず　ぷとてぃら　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-041",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-041",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-041.png"
   }
  ],
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "這張卡的【Raid觸發】，レイド可以時，發動並レイド必須。【Raid】卡名包含「OOO」的角色 可以置為活動，並移動到前線這個角色，与えた傷害，よるトリガーチェック在、對手，【活動】，發動不能。【登場時】BP4000以下的對手的前線的角色最多選擇1張，對手的牌組底，放置。自己的生命，2以上的時，自己的生命區，ある卡，1張自己的牌組底，放置。",
  "effectJa": "このカードの【レイドトリガー】はレイドできる場合、発動しレイドしなければならない。【レイド】カード名に「オーズ」を含むキャラ アクティブにし、フロントLに移動できるこのキャラが与えたダメージによるトリガーチェックでは、相手は【アクティブ】を発動できない。【登場時】BP4000以下の相手のフロントLのキャラを1枚まで選び、相手の山札の下に置く。自分のライフが2以上の場合、自分のライフエリアにあるカードを1枚自分の山札の下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-041.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-041",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-041",
  "faq": [
   {
    "id": "Q1144",
    "date": "2024.10.18 更新",
    "q": "「このカードの▼レイドトリガー▼はレイドできる場合、発動しレイドしなければならない。」とはどういうことですか？",
    "a": "トリガーチェックでこのカードが表向きになった際に、自分の場にこのカードのレイド元があり、このカードの必要エナジーを満たしている場合、このカードを手札に加えることはできず、必ずレイドしなければならないということです。"
   },
   {
    "id": "Q1145",
    "date": "2024.10.18 更新",
    "q": "この【登場時】で選べる相手のキャラクターが無い場合でも自分のライフが2以上の場合、自分のライフエリアにあるカードを1枚自分の山札の下に置く必要がありますか？",
    "a": "はい、置く必要があります。"
   }
  ]
 },
 {
  "id": "KMR-1-042",
  "identity": "KMR-1-042",
  "number": "UA29BT/KMR-1-042",
  "name": "假面騎士OOO Latorartar Combo",
  "nameJa": "仮面ライダーオーズ ラトラーター コンボ",
  "ruby": "かめんらいだーおーず　らとらーたー　こんぼ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-042",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-042",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-042.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 2500,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【在自己的回合中】這個角色BP+1500。【啟動主要】【在前線時】 【每回合1次】自己的手牌的所需能量，相同的卡，3張場外，放置。這樣做的話，這個角色，活動，し、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【自分のターン中】このキャラはBP+1500。【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の必要エナジーが同じカードを3枚場外に置く。そうした場合、このキャラをアクティブにし、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-042.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-042",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-042",
  "faq": [
   {
    "id": "Q1146",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-043",
  "identity": "KMR-1-043",
  "number": "UA29BT/KMR-1-043",
  "name": "假面騎士Genm Action Gamer Level2",
  "nameJa": "仮面ライダーゲンム アクションゲーマー レベル2",
  "ruby": "かめんらいだーげんむ　あくしょんげーまー　れべるつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-043",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-043",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-043.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "自己場上沒有任何卡時，手牌中這張卡的所需能量減少【藍×2】。",
  "effectJa": "自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-043.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-043",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-043",
  "faq": []
 },
 {
  "id": "KMR-1-044",
  "identity": "KMR-1-044",
  "number": "UA29BT/KMR-1-044",
  "name": "假面騎士Genm Zombie Gamer LevelX",
  "nameJa": "仮面ライダーゲンム ゾンビゲーマー レベルX",
  "ruby": "かめんらいだーげんむ　ぞんびげーまー　れべるてん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-044",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-044",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-044.png"
   }
  ],
  "color": "blue",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【登場時】自己的手牌，1張場外，放置。【退場時】自己的場，ある卡，全部藍的時，這個角色，返回手牌。【Raid】卡名包含「Genm」的角色 可以置為活動，並移動到前線【啟動主要】【在前線時】 【每回合1次】自己的場外，ある卡名包含「Zombie Gamer」的卡，1張移除區，放置。這樣做的話，BP3000以下的對手的前線的角色最多選擇1張，令其退場。",
  "effectJa": "【登場時】自分の手札を1枚場外に置く。【退場時】自分の場にあるカードが全て青の場合、このキャラを手札に戻す。【レイド】カード名に「ゲンム」を含むキャラ アクティブにし、フロントLに移動できる【起動メイン】【フロントLにある場合】 【ターン1】自分の場外にあるカード名に「ゾンビゲーマー」を含むカードを1枚リムーブエリアに置く。そうした場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-044.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-044",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-044",
  "faq": [
   {
    "id": "Q1147",
    "date": "2024.10.18 更新",
    "q": "【退場時】の「このキャラを手札に戻す」効果は、このキャラがレイド状態だった場合、レイド元のカードも手札に戻しますか？",
    "a": "いいえ、レイド元のカードは場外に置かれます。"
   }
  ]
 },
 {
  "id": "KMR-1-045",
  "identity": "KMR-1-045",
  "number": "UA29BT/KMR-1-045",
  "name": "假面騎士Birth",
  "nameJa": "仮面ライダーバース",
  "ruby": "かめんらいだーばーす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-045",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-045",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-045.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【啟動主要】【置為休息】 【每回合1次】自己的場的他的角色選擇1張，這個回合中、BP+1000。這張卡，返回手牌。",
  "effectJa": "【起動メイン】【レストにする】 【ターン1】自分の場の他のキャラを1枚選び、このターン中、BP+1000。このカードを手札に戻す。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-045.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-045",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-045",
  "faq": []
 },
 {
  "id": "KMR-1-046",
  "identity": "KMR-1-046",
  "number": "UA29BT/KMR-1-046",
  "name": "假面騎士Birth",
  "nameJa": "仮面ライダーバース",
  "ruby": "かめんらいだーばーす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-046",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-046",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-046.png"
   }
  ],
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】將自己場上另1張所需能量1以下的角色返回手牌。無法返回時，將這個角色返回手牌。",
  "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-046.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-046",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "bounce1",
  "faq": []
 },
 {
  "id": "KMR-1-047",
  "identity": "KMR-1-047",
  "number": "UA29BT/KMR-1-047",
  "name": "Birth・Day",
  "nameJa": "バース・デイ",
  "ruby": "ばーす　でい",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-047",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-047",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-047.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【啟動主要】【每回合1次】這個回合中、次，手牌從使用する〈Cell Medal〉的消耗AP，-1する。",
  "effectJa": "【起動メイン】【ターン1】このターン中、次に手札から使用する〈セルメダル〉の消費APを-1する。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-047.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-047",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-047",
  "faq": []
 },
 {
  "id": "KMR-1-048",
  "identity": "KMR-1-048",
  "number": "UA29BT/KMR-1-048",
  "name": "假面騎士EX-AID Action Gamer Level2",
  "nameJa": "仮面ライダーエグゼイド アクションゲーマー レベル2",
  "ruby": "かめんらいだーえぐぜいど　あくしょんげーまー　れべるつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-048",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-048",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-048.png"
   }
  ],
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "U",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "這個角色下方有背面朝上的卡時，這個角色的產生能量+【藍】。【登場時】所需能量，1以下，卡名包含「EX-AID」，包含自己的場的他的角色可以選擇1張。這樣做的話，そ的角色和そ的角色的下的背面朝上的卡，背面朝上，這個角色的下，置き、抽1張牌。",
  "effectJa": "このキャラの下に裏向きのカードがある場合、このキャラの発生エナジー+【青】。【登場時】必要エナジーが1以下でカード名に「エグゼイド」を含む自分の場の他のキャラを1枚選んでもよい。そうした場合、そのキャラとそのキャラの下の裏向きのカードを裏向きでこのキャラの下に置き、カードを1枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-048.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-048",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-048",
  "faq": [
   {
    "id": "Q1148",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   }
  ]
 },
 {
  "id": "KMR-1-049",
  "identity": "KMR-1-049",
  "number": "UA29BT/KMR-1-049",
  "name": "假面騎士EX-AID Action Gamer Level1",
  "nameJa": "仮面ライダーエグゼイド アクションゲーマー レベル1",
  "ruby": "かめんらいだーえぐぜいど　あくしょんげーまー　れべるわん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-049",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-049",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-049.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1000,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【置為休息】【每回合1次】這個角色在這個回合中獲得產生能量+【藍】，以及「主要階段結束時，令這個角色退場。」",
  "effectJa": "【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【青】と「メインフェイズ終了時、このキャラを退場させる。」を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-049.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-049",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-049",
  "faq": []
 },
 {
  "id": "KMR-1-050",
  "identity": "KMR-1-050",
  "number": "UA29BT/KMR-1-050",
  "name": "假面騎士EX-AID Double Action Gamer LevelXX",
  "nameJa": "仮面ライダーエグゼイド ダブルアクションゲーマー レベルXX",
  "ruby": "かめんらいだーえぐぜいど　だぶるあくしょんげーまー　れべるだぶるえっくす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-050",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-050",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-050.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "U",
  "trigger": "color",
  "triggerText": "【顏色】BP3500以下的對手的前線的角色選擇1張，返回手牌。",
  "triggerTextJa": "【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。",
  "effect": "【登場時】所需能量，3以下，卡名包含「EX-AID」，包含自己的場的他的角色可以選擇1張。這樣做的話，そ的角色和そ的角色的下的背面朝上的卡，背面朝上，這個角色的下，置き、卡，1張引き、自己的手牌或自己的場外從所需能量，3以下，卡名包含「EX-AID」的角色卡，1張為止自己的場，休息，令其登場。這個效果，登場した角色的【登場時】，發動並ない。",
  "effectJa": "【登場時】必要エナジーが3以下でカード名に「エグゼイド」を含む自分の場の他のキャラを1枚選んでもよい。そうした場合、そのキャラとそのキャラの下の裏向きのカードを裏向きでこのキャラの下に置き、カードを1枚引き、自分の手札か自分の場外から必要エナジーが3以下でカード名に「エグゼイド」を含むキャラカードを1枚まで自分の場にレストで登場させる。この効果で登場したキャラの【登場時】は発動しない。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-050.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-050",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-050",
  "faq": [
   {
    "id": "Q1149",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   }
  ]
 },
 {
  "id": "KMR-1-051",
  "identity": "KMR-1-051",
  "number": "UA29BT/KMR-1-051",
  "name": "假面騎士EX-AID Maximum Gamer Level99",
  "nameJa": "仮面ライダーエグゼイド マキシマムゲーマー レベル99",
  "ruby": "かめんらいだーえぐぜいど　まきしまむげーまー　れべるないんてぃないん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-051",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-051",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-051.png"
   }
  ],
  "color": "blue",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "SR",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "這個角色的下，背面朝上的卡，あり、這個角色，對手的効果，退場時，代わり，這個角色的下的背面朝上的卡，1張場外，置いて也よい。【登場時】所需能量，5以下，卡名包含「EX-AID」，包含自己的場的他的角色可以選擇1張。這樣做的話，そ的角色和そ的角色的下的背面朝上的卡，背面朝上，這個角色的下，置き、卡，1張引き、對手的前線的角色最多選擇1張，直到自己下一個回合開始、元々的効果，全部失わせる。",
  "effectJa": "このキャラの下に裏向きのカードがあり、このキャラが相手の効果で退場する場合、代わりにこのキャラの下の裏向きのカードを1枚場外に置いてもよい。【登場時】必要エナジーが5以下でカード名に「エグゼイド」を含む自分の場の他のキャラを1枚選んでもよい。そうした場合、そのキャラとそのキャラの下の裏向きのカードを裏向きでこのキャラの下に置き、カードを1枚引き、相手のフロントLのキャラを1枚まで選び、次の自分のターン開始時まで、元々の効果を全て失わせる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-051.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-051",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-051",
  "faq": [
   {
    "id": "Q1150",
    "date": "2025.12.12 更新",
    "q": "「元々の効果」とは何ですか？",
    "a": "そのカードに記載されている効果です。トリガーは失いません。"
   },
   {
    "id": "Q1151",
    "date": "2024.10.18 更新",
    "q": "このカードの【登場時】でレイド状態の相手のキャラの元々の効果を全て失わせました。レイド状態は維持されますか？",
    "a": "はい、レイド状態は維持されます。また、レイドによって囲まれている部分は無効になります。"
   },
   {
    "id": "Q1152",
    "date": "2024.10.18 更新",
    "q": "他のカードの効果によって2回ブロックを得ているキャラクターにこのカードの【登場時】を使用した場合、2回ブロックを失いますか？",
    "a": "いいえ、他のカードによって得た効果は失いません。"
   },
   {
    "id": "Q1153",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   },
   {
    "id": "Q2217",
    "date": "2026.07.24 更新",
    "q": "【退場時】や「このキャラがレイドされた時」や「このキャラが自分の場から手札に戻った時」等の「場ではない場所で発動する効果」は「元々の効果を失う」効果を受けた場合、発動しますか？",
    "a": "それが元々持っている効果の場合、発動しません。※それが『このターン中、「【退場時】○○」を得る』等の得た効果の場合は元々の効果ではないため、失われず発動します。"
   },
   {
    "id": "Q2225",
    "date": "2026.07.24 更新",
    "q": "「元々の効果を全て失わせる。」を受けたキャラは、自身や他のカードの効果によって既に得ていた効果を失いますか？・自身の効果の例：CGH-1-059 ランスロット「【登場時】このキャラは、次の自分のターン開始時まで、BP+1000。」・他のカードの効果の例：CGH-1-015ルルーシュ・ランペルージ「【登場時】自分の場のキャラを1枚まで選び、このターン中、「このキャラはBP2000以下のキャラにブロックされない。」を与える。」",
    "a": "いいえ、失いません。そのカードが元々持っている常時参照する効果は、有効になっていたとしても失います。・常時参照する効果の例：CGH-1-054ギルバート・G・P・ギルフォード「【自分のターン中】自分のフロントLのキャラの数が相手のフロントLのキャラの数以上の場合、このキャラはBP+1000。」"
   }
  ]
 },
 {
  "id": "KMR-1-052",
  "identity": "KMR-1-052",
  "number": "UA29BT/KMR-1-052",
  "name": "假面騎士EX-AID Muteki Gamer",
  "nameJa": "仮面ライダーエグゼイド ムテキゲーマー",
  "ruby": "かめんらいだーえぐぜいど　むてきげーまー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-052",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-052",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-052.png"
   }
  ],
  "color": "blue",
  "energy": 7,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「EX-AID」的角色 可以置為活動，並移動到前線這個角色，BP+1000。這個角色的下的背面朝上的卡的張数，依、這個角色，以下的効果，全部獲得。・2張以上：【可以攻擊2次】・4張以上：這個角色，戰鬥的敗北和卡的効果，場，離れず、BP，マイナスする効果，受けない。【登場時】這個角色的レイド元，所需能量，5以上的卡的時，自己的從牌組頂1張，背面朝上，這個角色的下，置いて也よい。",
  "effectJa": "【レイド】カード名に「エグゼイド」を含むキャラ アクティブにし、フロントLに移動できるこのキャラはBP+1000。このキャラの下の裏向きのカードの枚数により、このキャラは以下の効果を全て得る。・2枚以上：【2回アタック】・4枚以上：このキャラはバトルの敗北とカードの効果で場を離れず、BPをマイナスする効果を受けない。【登場時】このキャラのレイド元が必要エナジーが5以上のカードの場合、自分の山札の上から1枚を裏向きでこのキャラの下に置いてもよい。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-052.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-052",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-052",
  "faq": [
   {
    "id": "Q1154",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   },
   {
    "id": "Q1212",
    "date": "2024.11.08 更新",
    "q": "「カードの効果」にトリガーの効果は含まれますか？",
    "a": "はい、含まれます。"
   }
  ]
 },
 {
  "id": "KMR-1-053",
  "identity": "KMR-1-053",
  "number": "UA29BT/KMR-1-053",
  "name": "假面騎士Snipe Simulation Gamer Level50",
  "nameJa": "仮面ライダースナイプ シミュレーションゲーマー レベル50",
  "ruby": "かめんらいだーすないぷ　しみゅれーしょんげーまー　れべるふぃふてぃ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-053",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-053",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-053.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 2,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "R",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "【登場時】自己的從牌組頂3張查看。そ的中從卡，1張手牌，加え、1張，背面朝上，自己的場的［特徵：ドクター］的下，置き、残り，自己的牌組頂或下，放置。【啟動主要】【每回合1次】這個角色的下的背面朝上的卡，1張場外，放置。這樣做的話，BP3000以下的對手的前線的角色最多選擇1張，返回手牌。",
  "effectJa": "【登場時】自分の山札の上から3枚見る。その中からカードを1枚手札に加え、1枚を裏向きで自分の場の［特徴：ドクター］の下に置き、残りを自分の山札の上か下に置く。【起動メイン】【ターン1】このキャラの下の裏向きのカードを1枚場外に置く。そうした場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、手札に戻す。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-053.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-053",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-053",
  "faq": [
   {
    "id": "Q1155",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   }
  ]
 },
 {
  "id": "KMR-1-054",
  "identity": "KMR-1-054",
  "number": "UA29BT/KMR-1-054",
  "name": "假面騎士Snipe Shooting Gamer Level2",
  "nameJa": "仮面ライダースナイプ シューティングゲーマー レベル2",
  "ruby": "かめんらいだーすないぷ　しゅーてぃんぐげーまー　れべるつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-054",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-054",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-054.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去【衝擊】）",
  "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-054.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-054",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "impactNull",
  "faq": []
 },
 {
  "id": "KMR-1-055",
  "identity": "KMR-1-055",
  "number": "UA29BT/KMR-1-055",
  "name": "假面騎士Snipe Shooting Gamer Level1",
  "nameJa": "仮面ライダースナイプ シューティングゲーマー レベル1",
  "ruby": "かめんらいだーすないぷ　しゅーてぃんぐげーまー　れべるわん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-055",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-055",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-055.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【登場時】抽1張牌，將自己的1張手牌置於場外。",
  "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-055.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-055",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "drawDiscard",
  "faq": []
 },
 {
  "id": "KMR-1-056",
  "identity": "KMR-1-056",
  "number": "UA29BT/KMR-1-056",
  "name": "假面騎士Brave Quest Gamer Level2",
  "nameJa": "仮面ライダーブレイブ クエストゲーマー レベル2",
  "ruby": "かめんらいだーぶれいぶ　くえすとげーまー　れべるつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-056",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-056",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-056.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "這個角色為活動時，這個角色的產生能量+【藍】。",
  "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【青】。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-056.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-056",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-056",
  "faq": []
 },
 {
  "id": "KMR-1-057",
  "identity": "KMR-1-057",
  "number": "UA29BT/KMR-1-057",
  "name": "假面騎士Brave Quest Gamer Level1",
  "nameJa": "仮面ライダーブレイブ クエストゲーマー レベル1",
  "ruby": "かめんらいだーぶれいぶ　くえすとげーまー　れべるわん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-057",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-057",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-057.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-057.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-057",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-058",
  "identity": "KMR-1-058",
  "number": "UA29BT/KMR-1-058",
  "name": "假面騎士Brave Fantasy Gamer Level50",
  "nameJa": "仮面ライダーブレイブ ファンタジーゲーマー レベル50",
  "ruby": "かめんらいだーぶれいぶ　ふぁんたじーげーまー　れべるふぃふてぃ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-058",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-058",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-058.png"
   }
  ],
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "R",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】從以下選擇1項。・自己的場的他的［特徵：ドクター］，1張為止選擇。自己的從牌組頂1張，背面朝上，そ的角色的下，置き、そ的角色，這個回合中、BP+1000。・自己的手牌從所需能量，1以下，消耗AP，1的藍的［特徵：ドクター］，1張為止自己的場，休息，令其登場。",
  "effectJa": "【登場時】以下から1つ選ぶ。・自分の場の他の［特徴：ドクター］を1枚まで選ぶ。自分の山札の上から1枚を裏向きでそのキャラの下に置き、そのキャラはこのターン中、BP+1000。・自分の手札から必要エナジーが1以下で消費APが1の青の［特徴：ドクター］を1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-058.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-058",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-058",
  "faq": [
   {
    "id": "Q1156",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   }
  ]
 },
 {
  "id": "KMR-1-059",
  "identity": "KMR-1-059",
  "number": "UA29BT/KMR-1-059",
  "name": "假面騎士Lazer Bike Gamer Level2",
  "nameJa": "仮面ライダーレーザー バイクゲーマー レベル2",
  "ruby": "かめんらいだーれーざー　ばいくげーまー　れべるつー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-059",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-059",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-059.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "ドクター"
  ],
  "rarity": "U",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "自己的從牌組頂5張查看。そ的中從卡名包含「EX-AID」的角色卡，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。",
  "effectJa": "自分の山札の上から5枚見る。その中からカード名に「エグゼイド」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-059.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-059",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-059",
  "faq": [
   {
    "id": "Q1193",
    "date": "2024.10.25 更新",
    "q": "このカードの訂正後の効果について教えてください。",
    "a": "以下になります。【登場時】自分の山札の上から5枚見る。その中からカード名に「エグゼイド」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
   }
  ]
 },
 {
  "id": "KMR-1-060",
  "identity": "KMR-1-060",
  "number": "UA29BT/KMR-1-060",
  "name": "假面騎士Para-DX Puzzle Gamer Level50",
  "nameJa": "仮面ライダーパラドクス パズルゲーマー レベル50",
  "ruby": "かめんらいだーぱらどくす　ぱずるげーまー　れべるふぃふてぃ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-060",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-060",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-060.png"
   }
  ],
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【登場時】自己的場的他的角色最多選擇1張，這個回合中、BP+1000。【啟動主要】【置為休息】卡名包含「EX-AID」，包含自己的場的角色選擇1張，そ的角色的下，這個角色，背面朝上，放置。",
  "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。【起動メイン】【レストにする】カード名に「エグゼイド」を含む自分の場のキャラを1枚選び、そのキャラの下にこのキャラを裏向きで置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-060.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-060",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-060",
  "faq": [
   {
    "id": "Q1157",
    "date": "2025.09.17 更新",
    "q": "自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？",
    "a": "はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。確認した裏向きのカードは望む順で置いて下さい。"
   }
  ]
 },
 {
  "id": "KMR-1-061",
  "identity": "KMR-1-061",
  "number": "UA29BT/KMR-1-061",
  "name": "假面騎士Para-DX Fighter Gamer Level50",
  "nameJa": "仮面ライダーパラドクス ファイターゲーマー レベル50",
  "ruby": "かめんらいだーぱらどくす　ふぁいたーげーまー　れべるふぃふてぃ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-061",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-061",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-061.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "對手場上有黃或紅的卡時，手牌中這張卡的所需能量減少【藍×1】。",
  "effectJa": "相手の場に黄か赤のカードがある場合、手札にあるこのカードの必要エナジーを【青×1】減らす。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-061.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-061",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-061",
  "faq": []
 },
 {
  "id": "KMR-1-062",
  "identity": "KMR-1-062",
  "number": "UA29BT/KMR-1-062",
  "name": "Ankh",
  "nameJa": "アンク",
  "ruby": "あんく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-062",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-062",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-062.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "field",
  "traits": [],
  "rarity": "C",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "【啟動主要】【置為休息】這個效果，這個回合中，卡名包含「OOO」的角色的効果，自己的手牌，3張以上場外，置いている時才發動可以。抽1張牌。〈Ankh〉的這個效果，1ターン，1回的み發動可以。",
  "effectJa": "【起動メイン】【レストにする】この効果はこのターン中にカード名に「オーズ」を含むキャラの効果で自分の手札を3枚以上場外に置いている場合のみ発動できる。カードを1枚引く。〈アンク〉のこの効果は1ターンに1回のみ発動できる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-062.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-062",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-062",
  "faq": [
   {
    "id": "Q1158",
    "date": "2024.10.18 更新",
    "q": "このカードが2枚ある場合、このカードの「【起動メイン】＃レストにする＃この効果はこのターン中にカード名に「オーズ」を含むキャラの効果で自分の手札を3枚以上場外に置いている場合のみ発動できる。カードを1枚引く。」の効果を同じターンにそれぞれ1回ずつ発動できますか？",
    "a": "いいえ、どちらか片方しか発動できません。"
   }
  ]
 },
 {
  "id": "KMR-1-063",
  "identity": "KMR-1-063",
  "number": "UA29BT/KMR-1-063",
  "name": "Core Medal",
  "nameJa": "コアメダル",
  "ruby": "こあめだる",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-063",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-063",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-063.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "卡，2張抽。【在自己的回合中】【在場外時】攻擊階段結束時、這個回合中，卡名包含「OOO」或「Birth」的角色，攻擊している時，場外的這張卡，手牌，加えて也よい。這樣做的話，自己的手牌，1張自己的牌組底，放置。〈Core Medal〉的這個效果，1ターン，1回的み發動可以。",
  "effectJa": "カードを2枚引く。【自分のターン中】【場外にある場合】アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。〈コアメダル〉のこの効果は1ターンに1回のみ発動できる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-063.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-063",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-063",
  "faq": [
   {
    "id": "Q1159",
    "date": "2024.10.18 更新",
    "q": "「〈コアメダル〉のこの効果は1ターンに1回のみ発動できる。」の「この効果」は何を指しますか？",
    "a": "「【自分のターン中】＃場外にある場合＃アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。」の効果のみを指します。同一カードにある他の効果は指しません。"
   },
   {
    "id": "Q1160",
    "date": "2024.10.18 更新",
    "q": "このカードが場外に2枚ある場合、このカードの「【自分のターン中】＃場外にある場合＃アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。」の効果を同じターンにそれぞれ1回ずつ発動できますか？",
    "a": "いいえ、どちらか片方しか発動できません。"
   }
  ]
 },
 {
  "id": "KMR-1-064",
  "identity": "KMR-1-064",
  "number": "UA29BT/KMR-1-064",
  "name": "Scanning Charge",
  "nameJa": "スキャニングチャージ",
  "ruby": "すきゃにんぐちゃーじ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-064",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-064",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-064.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "R",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "『BP2000以下』的對手的前線的角色選擇1張，令其退場。自己的場，卡名包含「OOO」的角色，ある時，『BP4000以下』，代わり、另外自己的他的手牌，3張以上あるなら、『BP5000以下』，代わる。",
  "effectJa": "『BP2000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場にカード名に「オーズ」を含むキャラがある場合、『BP4000以下』に代わり、さらに自分の他の手札が3枚以上あるなら、『BP5000以下』に代わる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-064.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-064",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-064",
  "faq": [
   {
    "id": "Q1161",
    "date": "2024.10.18 更新",
    "q": "自分の場にカード名に「オーズ」を含むキャラがなく、自分の他の手札が3枚以上ある場合、『BP2000以下』は『BP5000以下』に代わりますか？",
    "a": "いいえ、代わりません。カード名に「オーズ」を含むキャラあり、自分の他の手札が3枚以上ある必要があります。"
   }
  ]
 },
 {
  "id": "KMR-1-065",
  "identity": "KMR-1-065",
  "number": "UA29BT/KMR-1-065",
  "name": "Cell Medal",
  "nameJa": "セルメダル",
  "ruby": "せるめだる",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-065",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-065",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-065.png"
   }
  ],
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "卡，1張引き、自己的場的角色最多選擇1張，這個回合中、BP+500。【在自己的回合中】【在場外時】攻擊階段結束時、這個回合中，卡名包含「OOO」或「Birth」的角色，攻擊している時，場外的這張卡，手牌，加えて也よい。這樣做的話，自己的手牌，1張自己的牌組底，放置。〈Cell Medal〉的這個效果，1ターン，1回的み發動可以。",
  "effectJa": "カードを1枚引き、自分の場のキャラを1枚まで選び、このターン中、BP+500。【自分のターン中】【場外にある場合】アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。〈セルメダル〉のこの効果は1ターンに1回のみ発動できる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-065.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-065",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-065",
  "faq": [
   {
    "id": "Q1162",
    "date": "2024.10.18 更新",
    "q": "「〈セルメダル〉のこの効果は1ターンに1回のみ発動できる。」の「この効果」は何を指しますか？",
    "a": "「【自分のターン中】＃場外にある場合＃アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。」の効果のみを指します。同一カードにある他の効果は指しません。"
   },
   {
    "id": "Q1163",
    "date": "2024.10.18 更新",
    "q": "このカードが場外に2枚ある場合、このカードの「【自分のターン中】＃場外にある場合＃アタックフェイズ終了時、このターン中にカード名に「オーズ」か「バース」を含むキャラがアタックしている場合、場外のこのカードを手札に加えてもよい。そうした場合、自分の手札を1枚自分の山札の下に置く。」の効果を同じターンにそれぞれ1回ずつ発動できますか？",
    "a": "いいえ、どちらか片方しか発動できません。"
   }
  ]
 },
 {
  "id": "KMR-1-066",
  "identity": "KMR-1-066",
  "number": "UA29BT/KMR-1-066",
  "name": "變身",
  "nameJa": "変身",
  "ruby": "へんしん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-066",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-066",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-066.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "U",
  "trigger": "final",
  "triggerText": "【終結】自己的生命，無い時，自己的從牌組頂1張，自己的生命區，放置。",
  "triggerTextJa": "【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。",
  "effect": "選擇自己最多2張AP卡，置為活動。",
  "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-066.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-066",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "recover2",
  "faq": []
 },
 {
  "id": "KMR-1-067",
  "identity": "KMR-1-067",
  "number": "UA29BT/KMR-1-067",
  "name": "Mighty Critical Strike",
  "nameJa": "マイティクリティカルストライク",
  "ruby": "まいてぃくりてぃかるすとらいく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-067",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-067",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-067.png"
   }
  ],
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "U",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "『BP3000以下』的對手的前線的角色選擇1張，令其退場。自己的場，卡名包含「EX-AID」或「Genm」的角色，ある時，『BP5000以下』，代わる。",
  "effectJa": "『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場にカード名に「エグゼイド」か「ゲンム」を含むキャラがある場合、『BP5000以下』に代わる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-067.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-067",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-067",
  "faq": []
 },
 {
  "id": "KMR-1-068",
  "identity": "KMR-1-068",
  "number": "UA29BT/KMR-1-068",
  "name": "Auto Vajin",
  "nameJa": "オートバジン",
  "ruby": "おーとばじん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-068",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-068",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-068.png"
   }
  ],
  "color": "red",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【置為休息】 【令這張卡退場】自己的場外從〈Sparkle Cut〉，1張加入手牌。",
  "effectJa": "【起動メイン】【レストにする】 【このカードを退場させる】自分の場外から〈スパークルカット〉を1枚手札に加える。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-068.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-068",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-068",
  "faq": []
 },
 {
  "id": "KMR-1-069",
  "identity": "KMR-1-069",
  "number": "UA29BT/KMR-1-069",
  "name": "假面騎士Kaixa",
  "nameJa": "仮面ライダーカイザ",
  "ruby": "かめんらいだーかいざ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-069",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-069",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-069.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【登場時】抽1張牌，將自己的1張手牌置於場外。",
  "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-069.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-069",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "drawDiscard",
  "faq": []
 },
 {
  "id": "KMR-1-070",
  "identity": "KMR-1-070",
  "number": "UA29BT/KMR-1-070",
  "name": "假面騎士Kaixa",
  "nameJa": "仮面ライダーカイザ",
  "ruby": "かめんらいだーかいざ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-070",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-070",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-070.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "+",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "自己的前線，空き，ある時，這個角色，BP+1000。【攻擊時】自己的前線的角色，1張退場させて也よい。",
  "effectJa": "自分のフロントLに空きがある場合、このキャラはBP+1000。【アタック時】自分のフロントLのキャラを1枚退場させてもよい。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-070.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-070",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-070",
  "faq": []
 },
 {
  "id": "KMR-1-071",
  "identity": "KMR-1-071",
  "number": "UA29BT/KMR-1-071",
  "name": "假面騎士Zeronos Altair Form",
  "nameJa": "仮面ライダーゼロノス アルタイルフォーム",
  "ruby": "かめんらいだーぜろのす　あるたいるふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-071",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-071",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-071.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】自己的手牌，1張場外，放置。【啟動主要】【在前線時】 【每回合1次】這個角色，登場したターン中的み發動可以。自己的手牌從〈Deneb Imagin〉，1張自己的場，休息，令其登場。",
  "effectJa": "【登場時】自分の手札を1枚場外に置く。【起動メイン】【フロントLにある場合】 【ターン1】このキャラが登場したターン中のみ発動できる。自分の手札から〈デネブイマジン〉を1枚自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-071.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-071",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-071",
  "faq": []
 },
 {
  "id": "KMR-1-072",
  "identity": "KMR-1-072",
  "number": "UA29BT/KMR-1-072",
  "name": "假面騎士Delta",
  "nameJa": "仮面ライダーデルタ",
  "ruby": "かめんらいだーでるた",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-072",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-072",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-072.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-072.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-072",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-073",
  "identity": "KMR-1-073",
  "number": "UA29BT/KMR-1-073",
  "name": "假面騎士Delta",
  "nameJa": "仮面ライダーデルタ",
  "ruby": "かめんらいだーでるた",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-073",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-073",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-073.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "這個角色為活動時，這個角色的產生能量+【紅】。",
  "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【赤】。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-073.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-073",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-073",
  "faq": []
 },
 {
  "id": "KMR-1-074",
  "identity": "KMR-1-074",
  "number": "UA29BT/KMR-1-074",
  "name": "假面騎士Den-O Ax Form",
  "nameJa": "仮面ライダー電王 アックスフォーム",
  "ruby": "かめんらいだーでんおう　あっくすふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-074",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-074",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-074.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 3500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "這張卡，〈Kintaros〉，作為也扱う。【Raid】〈Kintaros〉可以置為活動，並移動到前線【登場時】這個角色，這個回合中、對手的効果，不會被選擇。【退場時】這個角色的レイド元的卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "このカードは〈キンタロス〉としても扱う。【レイド】〈キンタロス〉アクティブにし、フロントLに移動できる【登場時】このキャラはこのターン中、相手の効果で選ばれない。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-074.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-074",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-074",
  "faq": [
   {
    "id": "Q1164",
    "date": "2024.10.18 更新",
    "q": "「相手の効果で選ばれない。」の「効果で選ばれない。」とはどういうことですか？",
    "a": "「BP3000以下の相手のフロントLのキャラクターを1枚選び、退場させる。」のような、「選び」と書かれている効果で選ぶことができないということです。"
   },
   {
    "id": "Q1165",
    "date": "2024.10.18 更新",
    "q": "このキャラの【退場時】の効果で登場したレイド元のカードが持つ【登場時】は発動しますか？",
    "a": "はい、発動します。"
   }
  ]
 },
 {
  "id": "KMR-1-075",
  "identity": "KMR-1-075",
  "number": "UA29BT/KMR-1-075",
  "name": "假面騎士Den-O Gun Form",
  "nameJa": "仮面ライダー電王 ガンフォーム",
  "ruby": "かめんらいだーでんおう　がんふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-075",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-075",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-075.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "這張卡，〈Ryutaros〉，作為也扱う。【Raid】〈Ryutaros〉可以置為活動，並移動到前線【登場時】所需能量，0的對手的前線的角色最多選擇1張，令其退場。【退場時】這個角色的レイド元的卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "このカードは〈リュウタロス〉としても扱う。【レイド】〈リュウタロス〉アクティブにし、フロントLに移動できる【登場時】必要エナジーが0の相手のフロントLのキャラを1枚まで選び、退場させる。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-075.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-075",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-075",
  "faq": [
   {
    "id": "Q1166",
    "date": "2024.10.18 更新",
    "q": "このキャラの【退場時】の効果で登場したレイド元のカードが持つ【登場時】は発動しますか？",
    "a": "はい、発動します。"
   }
  ]
 },
 {
  "id": "KMR-1-076",
  "identity": "KMR-1-076",
  "number": "UA29BT/KMR-1-076",
  "name": "假面騎士Den-O Climax Form",
  "nameJa": "仮面ライダー電王 クライマックスフォーム",
  "ruby": "かめんらいだーでんおう　くらいまっくすふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-076",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-076",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-076.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 2,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "自己的場和場外，〈Momotaros〉、〈Urataros〉、〈Kintaros〉、〈Ryutaros〉，合計何種類ある或，依、這個角色，以下的効果，全部獲得。・2種以上：【登場時】這個角色，活動，し、抽1張牌。・4種以上：【攻擊時】自己的手牌從所需能量，3以下，消耗AP，1的卡名包含「Den-O」的角色卡，1張為止レイドさせる。そ的角色，這個回合中、BP+1000。",
  "effectJa": "自分の場と場外に〈モモタロス〉、〈ウラタロス〉、〈キンタロス〉、〈リュウタロス〉が合計何種類あるかにより、このキャラは以下の効果を全て得る。・2種類以上：【登場時】このキャラをアクティブにし、カードを1枚引く。・4種類以上：【アタック時】自分の手札から必要エナジーが3以下で消費APが1のカード名に「電王」を含むキャラカードを1枚までレイドさせる。そのキャラはこのターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-076.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-076",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-076",
  "faq": [
   {
    "id": "Q1167",
    "date": "2024.10.18 更新",
    "q": "自分の場に「このカードは〈モモタロス〉としても扱う。」を持つ〈仮面ライダー電王 ソードフォーム〉（KMR-1-077）と〈モモタロス〉（KMR-1-092）がそれぞれ1枚ずつある場合、このカードの効果で2種類として数えますか？",
    "a": "いいえ、数えません。〈モモタロス〉が何枚あったとしても1種類として数えます。"
   }
  ]
 },
 {
  "id": "KMR-1-077",
  "identity": "KMR-1-077",
  "number": "UA29BT/KMR-1-077",
  "name": "假面騎士Den-O Sword Form",
  "nameJa": "仮面ライダー電王 ソードフォーム",
  "ruby": "かめんらいだーでんおう　そーどふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-077",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-077",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-077.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "這張卡，〈Momotaros〉，作為也扱う。【Raid】〈Momotaros〉可以置為活動，並移動到前線【登場時】這個角色，這個回合中、【衝擊（1）】（攻擊並在戰鬥中勝利時，對對手玩家造成1點傷害），獲得。【退場時】這個角色的レイド元的卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "このカードは〈モモタロス〉としても扱う。【レイド】〈モモタロス〉アクティブにし、フロントLに移動できる【登場時】このキャラはこのターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-077.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-077",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-077",
  "faq": [
   {
    "id": "Q1168",
    "date": "2024.10.18 更新",
    "q": "このキャラの【退場時】の効果で登場したレイド元のカードが持つ【登場時】は発動しますか？",
    "a": "はい、発動します。"
   }
  ]
 },
 {
  "id": "KMR-1-078",
  "identity": "KMR-1-078",
  "number": "UA29BT/KMR-1-078",
  "name": "假面騎士Den-O Platform",
  "nameJa": "仮面ライダー電王 プラットフォーム",
  "ruby": "かめんらいだーでんおう　ぷらっとふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-078",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-078",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-078.png"
   }
  ],
  "color": "red",
  "energy": 1,
  "ap": 1,
  "bp": 500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "自己的【Raid】，持有卡名包含「Den-O」的角色卡，這個角色，レイド可以。【登場時】抽1張牌，將自己的1張手牌置於場外。",
  "effectJa": "自分の【レイド】を持つカード名に「電王」を含むキャラカードはこのキャラにレイドできる。【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-078.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-078",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-078",
  "faq": []
 },
 {
  "id": "KMR-1-079",
  "identity": "KMR-1-079",
  "number": "UA29BT/KMR-1-079",
  "name": "假面騎士Den-O Liner Form",
  "nameJa": "仮面ライダー電王 ライナーフォーム",
  "ruby": "かめんらいだーでんおう　らいなーふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-079",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-079",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-079.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】〈假面騎士Den-O Platform〉可以置為活動，並移動到前線【登場時】自己的場和場外，合わせて〈Momotaros〉、〈Urataros〉、〈Kintaros〉、〈Ryutaros〉，全部ある時，這個角色，這個回合中、【狙擊】（可以指定對手前線的角色進行攻擊；指定時，對手不能阻擋），獲得。【攻擊時】自己的場的レイド状態的卡名包含「タロス」的角色最多選擇1張，選んだ角色的持有全部的【登場時】，這張卡，發動可以。【退場時】這個角色的レイド元的卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "【レイド】〈仮面ライダー電王 プラットフォーム〉アクティブにし、フロントLに移動できる【登場時】自分の場と場外を合わせて〈モモタロス〉、〈ウラタロス〉、〈キンタロス〉、〈リュウタロス〉が全てある場合、このキャラはこのターン中、【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、指定した場合、相手はブロックできない）を得る。【アタック時】自分の場のレイド状態のカード名に「タロス」を含むキャラを1枚まで選び、選んだキャラの持つ全ての【登場時】をこのカードが発動してもよい。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-079.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-079",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-079",
  "faq": [
   {
    "id": "Q1169",
    "date": "2024.10.18 更新",
    "q": "このキャラの【退場時】の効果で登場したレイド元のカードが持つ【登場時】は発動しますか？",
    "a": "はい、発動します。"
   },
   {
    "id": "Q1897",
    "date": "2026.01.09 更新",
    "q": "このキャラクターの【アタック時】で、「元々の効果を全て失わせる」効果によって効果を失っているキャラクターを選んだ場合、そのキャラクターが持っている【登場時】をこのカードが発動できますか？",
    "a": "いいえ、できません。"
   }
  ]
 },
 {
  "id": "KMR-1-080",
  "identity": "KMR-1-080",
  "number": "UA29BT/KMR-1-080",
  "name": "假面騎士Den-O Rod Form",
  "nameJa": "仮面ライダー電王 ロッドフォーム",
  "ruby": "かめんらいだーでんおう　ろっどふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-080",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-080",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-080.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "這張卡，〈Urataros〉，作為也扱う。【Raid】〈Urataros〉可以置為活動，並移動到前線【登場時】這個角色，這個回合中、「這個角色，攻擊して阻擋されな或った時、卡，1張為止抽。」，獲得。【退場時】這個角色的レイド元的卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "このカードは〈ウラタロス〉としても扱う。【レイド】〈ウラタロス〉アクティブにし、フロントLに移動できる【登場時】このキャラはこのターン中、「このキャラがアタックしてブロックされなかった時、カードを1枚まで引く。」を得る。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-080.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-080",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-080",
  "faq": [
   {
    "id": "Q1170",
    "date": "2024.10.18 更新",
    "q": "「アタックしてブロックされなかった時」が条件の効果が発動するタイミングはいつですか？",
    "a": "相手の【ブロック時】が発動する時と同じ、「ブロックキャラクター指定タイミング」でブロックするか選択した後になります。"
   },
   {
    "id": "Q1171",
    "date": "2024.10.18 更新",
    "q": "このキャラの【退場時】の効果で登場したレイド元のカードが持つ【登場時】は発動しますか？",
    "a": "はい、発動します。"
   }
  ]
 },
 {
  "id": "KMR-1-081",
  "identity": "KMR-1-081",
  "number": "UA29BT/KMR-1-081",
  "name": "假面騎士Next Faiz",
  "nameJa": "仮面ライダーネクストファイズ",
  "ruby": "かめんらいだーねくすとふぁいず",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-081",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-081",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-081.png"
   }
  ],
  "color": "red",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "【在自己的回合中】【在前線時】自己的角色的効果，自己的手牌從［特徵：Faizギア］，場外，置いた時、そ的卡，自己的牌組頂，置いて也よい。【啟動主要】【將1張手牌置於場外】 【每回合1次】這個回合中、次，自己，「BP的範囲，指定，ある効果」，角色，選擇際、指定可以BP的範囲+1000。（BP3000以下的角色，選べる効果，BP4000以下，選べるよう，なる）【攻擊時】這個回合中，自己的効果，自己的手牌，場外，置いている時，卡，1張為止抽。",
  "effectJa": "【自分のターン中】【フロントLにある場合】自分のキャラの効果で自分の手札から［特徴：ファイズギア］を場外に置いた時、そのカードを自分の山札の上に置いてもよい。【起動メイン】【手札を1枚場外に置く】 【ターン1】このターン中、次に自分が「BPの範囲に指定がある効果」でキャラを選ぶ際、指定できるBPの範囲+1000。（BP3000以下のキャラを選べる効果でBP4000以下を選べるようになる）【アタック時】このターン中に自分の効果で自分の手札を場外に置いている場合、カードを1枚まで引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-081.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-081",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-081",
  "faq": [
   {
    "id": "Q1172",
    "date": "2024.10.18 更新",
    "q": "「BPの範囲に指定がない効果」でキャラクターを選びました。この場合、この効果はなくなりますか？",
    "a": "いいえ、なくなりません。"
   },
   {
    "id": "Q1173",
    "date": "2024.10.18 更新",
    "q": "指定できるBPの範囲が増える効果は重複しますか？",
    "a": "はい、重複します。2回発動した場合、選べるBPの範囲が+2000されます。"
   }
  ]
 },
 {
  "id": "KMR-1-082",
  "identity": "KMR-1-082",
  "number": "UA29BT/KMR-1-082",
  "name": "假面騎士Faiz",
  "nameJa": "仮面ライダーファイズ",
  "ruby": "かめんらいだーふぁいず",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-082",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-082",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-082.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-082.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-082",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-083",
  "identity": "KMR-1-083",
  "number": "UA29BT/KMR-1-083",
  "name": "假面騎士Faiz",
  "nameJa": "仮面ライダーファイズ",
  "ruby": "かめんらいだーふぁいず",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-083",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-083",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-083.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】自己的從牌組頂5張查看。そ的中從［特徵：Faizギア］，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。",
  "effectJa": "【登場時】自分の山札の上から5枚見る。その中から［特徴：ファイズギア］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-083.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-083",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-083",
  "faq": []
 },
 {
  "id": "KMR-1-084",
  "identity": "KMR-1-084",
  "number": "UA29BT/KMR-1-084",
  "name": "假面騎士Faiz",
  "nameJa": "仮面ライダーファイズ",
  "ruby": "かめんらいだーふぁいず",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-084",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-084",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-084.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 1500,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "color",
  "triggerText": "【顏色】BP2500以下的對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "【登場時】自己的手牌，1張場外，置いて也よい。這樣做的話，卡，2張抽。【在自己的回合中】這個回合中，自己，手牌從［特徵：Faizギア］，使用している時，這個角色，BP+500。",
  "effectJa": "【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、カードを2枚引く。【自分のターン中】このターン中に自分が手札から［特徴：ファイズギア］を使用している場合、このキャラはBP+500。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-084.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-084",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-084",
  "faq": []
 },
 {
  "id": "KMR-1-085",
  "identity": "KMR-1-085",
  "number": "UA29BT/KMR-1-085",
  "name": "假面騎士Faiz Axel Form",
  "nameJa": "仮面ライダーファイズ アクセルフォーム",
  "ruby": "かめんらいだーふぁいず　あくせるふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-085",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-085",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-085.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "這個角色不能以Raid以外的方式登場。【Raid】卡名包含「Faiz」的角色可以置為活動，並移動到前線自己的攻擊階段結束時、レイド状態的這個角色的一番上的卡，場外，放置。【攻擊時】【每回合1次】這個角色，活動，し、卡，2張抽。之後，自己的手牌的［特徵：Faizギア］，1張場外，置いて也よい。這樣做的話，BP1500以下的對手的前線的角色最多選擇1張，令其退場。",
  "effectJa": "このキャラはレイド以外で登場できない。【レイド】カード名に「ファイズ」を含むキャラアクティブにし、フロントLに移動できる自分のアタックフェイズ終了時、レイド状態のこのキャラの一番上のカードを場外に置く。【アタック時】【ターン1】このキャラをアクティブにし、カードを2枚引く。その後、自分の手札の［特徴：ファイズギア］を1枚場外に置いてもよい。そうした場合、BP1500以下の相手のフロントLのキャラを1枚まで選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-085.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-085",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-085",
  "faq": [
   {
    "id": "Q1174",
    "date": "2024.10.18 更新",
    "q": "「レイド状態のこのキャラの一番上のカード」とは何を指しますか？",
    "a": "「レイド状態のこのキャラの一番上のカード」とは、レイド状態のこのカードの一番上にあるカードを指します。"
   },
   {
    "id": "Q1175",
    "date": "2024.10.18 更新",
    "q": "レイド状態のこのキャラの一番上のカードを場外に置きました。その場合、下にあったカードは場に残りますか？",
    "a": "はい、残ります。"
   },
   {
    "id": "Q1176",
    "date": "2024.10.18 更新",
    "q": "レイド状態のこのキャラの一番上のカードを場外に置きました。その場合、場に残ったレイド元のカードの【登場時】は発動しますか？",
    "a": "いいえ、登場でないため、発動しません。"
   },
   {
    "id": "Q1177",
    "date": "2024.10.18 更新",
    "q": "レイド状態のこのキャラの一番上のカードを場外に置きました。その場合、場に残ったレイド元のカードはアクティブとレストのどちらで場に残りますか？",
    "a": "レイド状態のカードがレストだった場合、レストで場に残ります。下にあった表向きのカードはレイド状態のカードの「アクティブ」「レスト」を引き継ぎます。"
   },
   {
    "id": "Q1178",
    "date": "2024.10.18 更新",
    "q": "レイド状態のこのキャラの一番上のカードを場外に置きました。その場合、場に残ったレイド元のカードはレイド状態の時に受けていた効果を受けたままですか？",
    "a": "いいえ、レイド状態のカードが受けていた効果は無効になります。"
   }
  ]
 },
 {
  "id": "KMR-1-086",
  "identity": "KMR-1-086",
  "number": "UA29BT/KMR-1-086",
  "name": "假面騎士Faiz Blaster Form",
  "nameJa": "仮面ライダーファイズ ブラスターフォーム",
  "ruby": "かめんらいだーふぁいず　ぶらすたーふぉーむ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-086",
    "set": "UA29BT",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-086",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-086.png"
   }
  ],
  "color": "red",
  "energy": 5,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「Faiz」的角色可以置為活動，並移動到前線【傷害（2）】（這個角色以攻擊造成直接傷害時，改為造成2點傷害）這個角色，攻擊して戰鬥，勝利した時、自己的手牌的［特徵：Faizギア］，1張場外，置いて也よい。這樣做的話，BP3000以下的對手的前線的角色最多選擇1張，令其退場。",
  "effectJa": "【レイド】カード名に「ファイズ」を含むキャラアクティブにし、フロントLに移動できる【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）このキャラがアタックしてバトルに勝利した時、自分の手札の［特徴：ファイズギア］を1枚場外に置いてもよい。そうした場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-086.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-086",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-086",
  "faq": [
   {
    "id": "Q1179",
    "date": "2024.10.18 更新",
    "q": "「アタックしてバトルに勝利した時」とはどういうことですか？",
    "a": "自分のキャラクターがアタックをして相手のキャラクターとバトルをし、アタックをした自分のキャラクターのBPが相手のキャラクターのBP以上だった時を指します。"
   }
  ]
 },
 {
  "id": "KMR-1-087",
  "identity": "KMR-1-087",
  "number": "UA29BT/KMR-1-087",
  "name": "Snake Orphnoch",
  "nameJa": "スネークオルフェノク",
  "ruby": "すねーくおるふぇのく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-087",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-087",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-087.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "對手場上有黃或藍的卡時，手牌中這張卡的所需能量減少【紅×1】。",
  "effectJa": "相手の場に黄か青のカードがある場合、手札にあるこのカードの必要エナジーを【赤×1】減らす。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-087.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-087",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-087",
  "faq": []
 },
 {
  "id": "KMR-1-088",
  "identity": "KMR-1-088",
  "number": "UA29BT/KMR-1-088",
  "name": "Horse Orphnoch",
  "nameJa": "ホースオルフェノク",
  "ruby": "ほーすおるふぇのく",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-088",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-088",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-088.png"
   }
  ],
  "color": "red",
  "energy": 5,
  "ap": 2,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【登場時】BP4000以下的對手的前線的角色選擇1張，退場させて也よい。這樣做的話，對手，自身的手牌，2張場外，置いて也よい。這樣做的話，對手，這個效果，退場させた角色，1張加入手牌。",
  "effectJa": "【登場時】BP4000以下の相手のフロントLのキャラを1枚選び、退場させてもよい。そうした場合、相手は自身の手札を2枚場外に置いてもよい。そうした場合、相手はこの効果で退場させたキャラを1枚手札に加える。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-088.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-088",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-088",
  "faq": []
 },
 {
  "id": "KMR-1-089",
  "identity": "KMR-1-089",
  "number": "UA29BT/KMR-1-089",
  "name": "Urataros",
  "nameJa": "ウラタロス",
  "ruby": "うらたろす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-089",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-089",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-089.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "イマジン"
  ],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "這個角色不會被BP 2000以下的角色阻擋。",
  "effectJa": "このキャラはBP2000以下のキャラにブロックされない。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-089.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-089",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-089",
  "faq": []
 },
 {
  "id": "KMR-1-090",
  "identity": "KMR-1-090",
  "number": "UA29BT/KMR-1-090",
  "name": "Kintaros",
  "nameJa": "キンタロス",
  "ruby": "きんたろす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-090",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-090",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-090.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "イマジン"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去【衝擊】）",
  "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-090.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-090",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "impactNull",
  "faq": []
 },
 {
  "id": "KMR-1-091",
  "identity": "KMR-1-091",
  "number": "UA29BT/KMR-1-091",
  "name": "Deneb Imagin",
  "nameJa": "デネブイマジン",
  "ruby": "でねぶいまじん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-091",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-091",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-091.png"
   }
  ],
  "color": "red",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "イマジン"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】將自己場上另1張所需能量1以下的角色返回手牌。無法返回時，將這個角色返回手牌。",
  "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-091.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-091",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "bounce1",
  "faq": []
 },
 {
  "id": "KMR-1-092",
  "identity": "KMR-1-092",
  "number": "UA29BT/KMR-1-092",
  "name": "Momotaros",
  "nameJa": "モモタロス",
  "ruby": "ももたろす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-092",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-092",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-092.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "イマジン"
  ],
  "rarity": "C",
  "trigger": "color",
  "triggerText": "【顏色】BP2500以下的對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "【登場時】自己的從牌組頂5張查看。そ的中從〈假面騎士Den-O Platform〉，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌的〈假面騎士Den-O Platform〉或所需能量，1以下的卡，1張場外，放置。",
  "effectJa": "【登場時】自分の山札の上から5枚見る。その中から〈仮面ライダー電王 プラットフォーム〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札の〈仮面ライダー電王 プラットフォーム〉か必要エナジーが1以下のカードを1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-092.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-092",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-092",
  "faq": []
 },
 {
  "id": "KMR-1-093",
  "identity": "KMR-1-093",
  "number": "UA29BT/KMR-1-093",
  "name": "Ryutaros",
  "nameJa": "リュウタロス",
  "ruby": "りゅうたろす",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-093",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-093",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-093.png"
   }
  ],
  "color": "red",
  "energy": 0,
  "ap": 1,
  "bp": 1000,
  "bpMark": "",
  "gen": 1,
  "genMark": "+",
  "type": "character",
  "traits": [
   "イマジン"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【啟動主要】【置為休息】【每回合1次】這個角色在這個回合中獲得產生能量+【紅】，以及「主要階段結束時，令這個角色退場。」",
  "effectJa": "【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【赤】と「メインフェイズ終了時、このキャラを退場させる。」を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-093.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-093",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-093",
  "faq": []
 },
 {
  "id": "KMR-1-094",
  "identity": "KMR-1-094",
  "number": "UA29BT/KMR-1-094",
  "name": "Den-Liner",
  "nameJa": "デンライナー",
  "ruby": "でんらいなー",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-094",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-094",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-094.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "field",
  "traits": [],
  "rarity": "C",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "這張場地以活動狀態登場。【啟動主要】【置為休息】自己的場的レイド状態，卡名包含「Den-O」的角色選擇1張，這個回合中、BP+1000。【啟動主要】【將1張手牌置於場外】 【每回合1次】這個回合中，自己，レイドしている時才發動可以。這張場地，活動，する。",
  "effectJa": "このフィールドはアクティブで場に登場させる。【起動メイン】【レストにする】自分の場のレイド状態でカード名に「電王」を含むキャラを1枚選び、このターン中、BP+1000。【起動メイン】【手札を1枚場外に置く】 【ターン1】このターン中に自分がレイドしている場合のみ発動できる。このフィールドをアクティブにする。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-094.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-094",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-094",
  "faq": []
 },
 {
  "id": "KMR-1-095",
  "identity": "KMR-1-095",
  "number": "UA29BT/KMR-1-095",
  "name": "我來了！",
  "nameJa": "俺、参上！",
  "ruby": "おれ　さんじょう！",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-095",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-095",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-095.png"
   }
  ],
  "color": "red",
  "energy": 1,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "自己的從牌組頂5張查看。そ的中從卡名包含「Den-O」的角色卡或〈Den-Liner〉，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。對手的生命，5以上的時，選擇自己最多1張AP卡，置為活動。",
  "effectJa": "自分の山札の上から5枚見る。その中からカード名に「電王」を含むキャラカードか〈デンライナー〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。相手のライフが5以上の場合、自分のAPカードを1枚まで選び、アクティブにする。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-095.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-095",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-095",
  "faq": []
 },
 {
  "id": "KMR-1-096",
  "identity": "KMR-1-096",
  "number": "UA29BT/KMR-1-096",
  "name": "我的必殺技！",
  "nameJa": "俺の必殺技！",
  "ruby": "おれのひっさつわざ！",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-096",
    "set": "UA29BT",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-096",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-096.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "R",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "『BP3000以下』的對手的前線的角色選擇1張，令其退場。自己的場，レイド状態，卡名包含「Den-O」的角色，ある時，『BP5000以下』，代わる。",
  "effectJa": "『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場にレイド状態でカード名に「電王」を含むキャラがある場合、『BP5000以下』に代わる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-096.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-096",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-096",
  "faq": []
 },
 {
  "id": "KMR-1-097",
  "identity": "KMR-1-097",
  "number": "UA29BT/KMR-1-097",
  "name": "變身",
  "nameJa": "変身",
  "ruby": "へんしん",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-097",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-097",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-097.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "U",
  "trigger": "final",
  "triggerText": "【終結】自己的生命，無い時，自己的從牌組頂1張，自己的生命區，放置。",
  "triggerTextJa": "【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。",
  "effect": "選擇自己最多2張AP卡，置為活動。",
  "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-097.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-097",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "recover2",
  "faq": []
 },
 {
  "id": "KMR-1-098",
  "identity": "KMR-1-098",
  "number": "UA29BT/KMR-1-098",
  "name": "Grand Impact",
  "nameJa": "グランインパクト",
  "ruby": "ぐらんいんぱくと",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-098",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-098",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-098.png"
   }
  ],
  "color": "red",
  "energy": 2,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [
   "ファイズギア"
  ],
  "rarity": "U",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "BP3000以下的對手的前線的角色選擇1張，令其退場。",
  "effectJa": "BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-098.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-098",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-098",
  "faq": []
 },
 {
  "id": "KMR-1-099",
  "identity": "KMR-1-099",
  "number": "UA29BT/KMR-1-099",
  "name": "Crimson Smash",
  "nameJa": "クリムゾンスマッシュ",
  "ruby": "くりむぞんすまっしゅ",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-099",
    "set": "UA29BT",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-099",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-099.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [
   "ファイズギア"
  ],
  "rarity": "U",
  "trigger": "special",
  "triggerText": "【特殊】對手的前線的角色選擇1張，令其退場。",
  "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
  "effect": "『BP3000以下』的對手的前線的角色最多選擇1張，令其退場。自己的場，卡名包含「Faiz」的角色，ある時，『BP4000以下』，代わり、這個回合中、次，自己，「BP的範囲，指定，ある効果」，角色，選擇際、指定可以BP的範囲+1000。（BP3000以下的角色，選べる効果，BP4000以下，選べるよう，なる）",
  "effectJa": "『BP3000以下』の相手のフロントLのキャラを1枚まで選び、退場させる。自分の場にカード名に「ファイズ」を含むキャラがある場合、『BP4000以下』に代わり、このターン中、次に自分が「BPの範囲に指定がある効果」でキャラを選ぶ際、指定できるBPの範囲+1000。（BP3000以下のキャラを選べる効果でBP4000以下を選べるようになる）",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-099.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-099",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-099",
  "faq": [
   {
    "id": "Q1180",
    "date": "2024.10.18 更新",
    "q": "「BPの範囲に指定がない効果」でキャラクターを選びました。この場合、この効果はなくなりますか？",
    "a": "いいえ、なくなりません。"
   },
   {
    "id": "Q1181",
    "date": "2024.10.18 更新",
    "q": "指定できるBPの範囲が増える効果は重複しますか？",
    "a": "はい、重複します。2回発動した場合、選べるBPの範囲が+2000されます。"
   }
  ]
 },
 {
  "id": "KMR-1-100",
  "identity": "KMR-1-100",
  "number": "UA29BT/KMR-1-100",
  "name": "Sparkle Cut",
  "nameJa": "スパークルカット",
  "ruby": "すぱーくるかっと",
  "title": "kmr",
  "set": "UA29BT",
  "sets": [
   "UA29BT"
  ],
  "printings": [
   {
    "number": "UA29BT/KMR-1-100",
    "set": "UA29BT",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-100",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-100.png"
   }
  ],
  "color": "red",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [
   "ファイズギア"
  ],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "自己的場的角色最多選擇1張，這個回合中、BP+2000。BP2000以下的對手的前線的角色最多選擇1張，令其退場。",
  "effectJa": "自分の場のキャラを1枚まで選び、このターン中、BP+2000。BP2000以下の相手のフロントLのキャラを1枚まで選び、退場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29BT_KMR-1-100.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29BT%2FKMR-1-100",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-100",
  "faq": []
 },
 {
  "id": "KMR-1-101",
  "identity": "KMR-1-101",
  "number": "UA29ST/KMR-1-101",
  "name": "假面騎士001",
  "nameJa": "仮面ライダー001",
  "ruby": "かめんらいだーぜろぜろわん",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-101",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-101",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-101.png"
   }
  ],
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-101.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-101",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": [
   {
    "id": "Q1194",
    "date": "2024.10.25 更新",
    "q": "このキャラクターは、カード名に「ゼロワン」を含むキャラですか？",
    "a": "いいえ、違います。"
   }
  ]
 },
 {
  "id": "KMR-1-102",
  "identity": "KMR-1-102",
  "number": "UA29ST/KMR-1-102",
  "name": "假面騎士Vulcan Punching Kong",
  "nameJa": "仮面ライダーバルカン パンチングコング",
  "ruby": "かめんらいだーばるかん　ぱんちんぐこんぐ",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-102",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-102",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-102.png"
   }
  ],
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "C",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-102.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-102",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-103",
  "identity": "KMR-1-103",
  "number": "UA29ST/KMR-1-103",
  "name": "假面騎士Valkyrie Lightning Hornet",
  "nameJa": "仮面ライダーバルキリー ライトニングホーネット",
  "ruby": "かめんらいだーばるきりー　らいとにんぐほーねっと",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-103",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-103",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-103.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "A.I.M.S. SQUAD"
  ],
  "rarity": "U",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "",
  "effectJa": "",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-103.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-103",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "plain",
  "faq": []
 },
 {
  "id": "KMR-1-104",
  "identity": "KMR-1-104",
  "number": "UA29ST/KMR-1-104",
  "name": "假面騎士ZERO-TWO（或人）",
  "nameJa": "仮面ライダーゼロツー（或人）",
  "ruby": "かめんらいだーぜろつー（あると）",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-104",
    "set": "UA29ST",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-104",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-104.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "SR",
  "trigger": "color",
  "triggerText": "【顏色】對手的前線的角色選擇1張，休息，する。それ，下一次不會變為活動。",
  "triggerTextJa": "【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。",
  "effect": "【攻擊時】卡，1張引き、自己的手牌，1張自己的牌組頂或下，放置。【退場時】自己的場，他的［特徵：飛電インテリジェンス］，3張以上ある時，自己的手牌從卡名包含「ZERO-TWO」的角色卡，1張為止自己的場，休息，令其登場。",
  "effectJa": "【アタック時】カードを1枚引き、自分の手札を1枚自分の山札の上か下に置く。【退場時】自分の場に他の［特徴：飛電インテリジェンス］が3枚以上ある場合、自分の手札からカード名に「ゼロツー」を含むキャラカードを1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-104.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-104",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-104",
  "faq": []
 },
 {
  "id": "KMR-1-105",
  "identity": "KMR-1-105",
  "number": "UA29ST/KMR-1-105",
  "name": "假面騎士ZERO-ONE Shining Assault Hopper",
  "nameJa": "仮面ライダーゼロワン シャイニングアサルトホッパー",
  "ruby": "かめんらいだーぜろわん　しゃいにんぐあさるとほっぱー",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-105",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-105",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-105.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "bpMark": "+",
  "gen": 2,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "R",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【步進】（在自己的移動階段，可以從前線移到能量區）【在自己的回合中】這個回合中，自己的場，角色，3張以上登場している時，這個角色，BP+1000。",
  "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）【自分のターン中】このターン中に自分の場にキャラが3枚以上登場している場合、このキャラはBP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-105.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-105",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-105",
  "faq": []
 },
 {
  "id": "KMR-1-106",
  "identity": "KMR-1-106",
  "number": "UA29ST/KMR-1-106",
  "name": "假面騎士ZERO-ONE Shining Hopper",
  "nameJa": "仮面ライダーゼロワン シャイニングホッパー",
  "ruby": "かめんらいだーぜろわん　しゃいにんぐほっぱー",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-106",
    "set": "UA29ST",
    "rarity": "C",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-106",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-106.png"
   }
  ],
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 2000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "C",
  "trigger": null,
  "triggerText": "",
  "triggerTextJa": "",
  "effect": "【登場時】自己的從牌組頂3張查看。そ的中從［特徵：飛電インテリジェンス］，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。",
  "effectJa": "【登場時】自分の山札の上から3枚見る。その中から［特徴：飛電インテリジェンス］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-106.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-106",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-106",
  "faq": []
 },
 {
  "id": "KMR-1-107",
  "identity": "KMR-1-107",
  "number": "UA29ST/KMR-1-107",
  "name": "假面騎士ZERO-ONE Realizing Hopper",
  "nameJa": "仮面ライダーゼロワン リアライジングホッパー",
  "ruby": "かめんらいだーぜろわん　りあらいじんぐほっぱー",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-107",
    "set": "UA29ST",
    "rarity": "SR",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-107",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-107.png"
   }
  ],
  "color": "yellow",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "SR",
  "trigger": "raid",
  "triggerText": "【Raid】這張卡，加入手牌或、所需能量，満たしている時，レイドさせる。",
  "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
  "effect": "【Raid】卡名包含「ZERO-ONE」的角色 可以置為活動，並移動到前線這個角色的攻擊結束時、自己的前線的活動的卡名包含「ZERO-ONE」的角色1張，レイド状態的這個角色的一番上的卡，レイドさせて也よい。【登場時】這個角色，這個回合中、BP+1000和「這個角色，對手的効果，不會被選擇。」，獲得。【在自己的回合中】自己的前線，活動的角色，ない時，這個角色，【衝擊（1）】（攻擊並在戰鬥中勝利時，對對手玩家造成1點傷害），獲得。",
  "effectJa": "【レイド】カード名に「ゼロワン」を含むキャラ アクティブにし、フロントLに移動できるこのキャラのアタック終了時、自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせてもよい。【登場時】このキャラはこのターン中、BP+1000と「このキャラは、相手の効果で選ばれない。」を得る。【自分のターン中】自分のフロントLにアクティブのキャラがない場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに１ダメージ）を得る。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-107.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-107",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-107",
  "faq": [
   {
    "id": "Q1182",
    "date": "2024.10.18 更新",
    "q": "「このキャラのアタック終了時」が条件の効果が発動するタイミングはいつですか？",
    "a": "バトルを行った場合はバトル終了後、プレイヤーにダメージを与えた場合はトリガーチェック終了後になります。"
   },
   {
    "id": "Q1183",
    "date": "2024.10.18 更新",
    "q": "「自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせてもよい。」とはどういうことですか？",
    "a": "レイド状態のこのカードの一番上にあるカードを自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に新たにレイドさせるということです。"
   },
   {
    "id": "Q1184",
    "date": "2024.10.18 更新",
    "q": "「レイド状態のこのキャラの一番上のカード」とは何を指しますか？",
    "a": "「レイド状態のこのキャラの一番上のカード」とは、レイド状態のこのカードの一番上にあるカードを指します。"
   },
   {
    "id": "Q1185",
    "date": "2024.10.18 更新",
    "q": "自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、下にあったカードは場に残りますか？",
    "a": "はい、残ります。"
   },
   {
    "id": "Q1186",
    "date": "2024.10.18 更新",
    "q": "自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、場に残ったレイド元のカードの【登場時】は発動しますか？",
    "a": "いいえ、登場でないため、発動しません。"
   },
   {
    "id": "Q1187",
    "date": "2024.10.18 更新",
    "q": "自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、場に残ったレイド元のカードはアクティブとレストのどちらで場に残りますか？",
    "a": "レイド状態のカードがレストだった場合、レストで場に残ります。下にあった表向きのカードはレイド状態のカードの「アクティブ」「レスト」を引き継ぎます。"
   },
   {
    "id": "Q1188",
    "date": "2024.10.18 更新",
    "q": "自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、場に残ったレイド元のカードはレイド状態の時に受けていた効果を受けたままですか？",
    "a": "いいえ、レイド状態のカードが受けていた効果は無効になります。"
   },
   {
    "id": "Q1189",
    "date": "2024.10.18 更新",
    "q": "▼ダメージ（2）▼を得たこのキャラのアタック終了時、このキャラの効果で自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、レイドさせる前に得ていた▼ダメージ（2）▼は得たままですか？",
    "a": "いいえ、レイド状態のカードが受けていた効果は無効になります。"
   },
   {
    "id": "Q1190",
    "date": "2024.10.18 更新",
    "q": "自分のフロントLのアクティブのカード名に「ゼロワン」を含むキャラ1枚に、レイド状態のこのキャラの一番上のカードをレイドさせました。その場合、このカードの【登場時】は発動しますか？",
    "a": "はい、発動します。"
   },
   {
    "id": "Q1191",
    "date": "2024.10.18 更新",
    "q": "「相手の効果で選ばれない。」の「効果で選ばれない。」とはどういうことですか？",
    "a": "「BP3000以下の相手のフロントLのキャラクターを1枚選び、退場させる。」のような、「選び」と書かれている効果で選ぶことができないということです。"
   }
  ]
 },
 {
  "id": "KMR-1-108",
  "identity": "KMR-1-108",
  "number": "UA29ST/KMR-1-108",
  "name": "衛星Zea",
  "nameJa": "衛星ゼア",
  "ruby": "えいせいぜあ",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-108",
    "set": "UA29ST",
    "rarity": "U",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-108",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-108.png"
   }
  ],
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "field",
  "traits": [
   "飛電インテリジェンス"
  ],
  "rarity": "U",
  "trigger": "get",
  "triggerText": "【獲得】這張卡，加入手牌。",
  "triggerTextJa": "【ゲット】このカードを手札に加える。",
  "effect": "【登場時】自己的從牌組頂1張查看。そ的卡，自己的牌組頂或下，放置。【啟動主要】【置為休息】 【將1張手牌置於場外】 【支付1點AP】自己的場外從所需能量，1以下，消耗AP，1的黃的［特徵：飛電インテリジェンス］，1張為止自己的場，休息，令其登場。",
  "effectJa": "【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。【起動メイン】【レストにする】 【手札を1枚場外に置く】 【APを1支払う】自分の場外から必要エナジーが1以下で消費APが1の黄の［特徴：飛電インテリジェンス］を1枚まで自分の場にレストで登場させる。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-108.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-108",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-108",
  "faq": []
 },
 {
  "id": "KMR-1-109",
  "identity": "KMR-1-109",
  "number": "UA29ST/KMR-1-109",
  "name": "能阻止你的只有一個人，就是我！",
  "nameJa": "お前を止められるのはただ一人、俺だ！",
  "ruby": "おまえをとめられるのはただひとり　おれだ！",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-109",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-109",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-109.png"
   }
  ],
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "bpMark": "",
  "gen": 0,
  "genMark": "",
  "type": "event",
  "traits": [],
  "rarity": "R",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "自己的從牌組頂4張查看。そ的中從所需能量，4以下，消耗AP，1的黃的特徵，「飛電インテリジェンス」，持有角色卡，1張為止自己的場，休息，令其登場或レイドさせる。其餘依想要的順序自己的牌組底，放置。",
  "effectJa": "自分の山札の上から4枚見る。その中から必要エナジーが4以下で消費APが1の黄の特徴に「飛電インテリジェンス」を持つキャラカードを1枚まで自分の場にレストで登場させるかレイドさせる。残りを望む順で自分の山札の下に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-109.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-109",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-109",
  "faq": []
 },
 {
  "id": "KMR-1-110",
  "identity": "KMR-1-110",
  "number": "UA29ST/KMR-1-110",
  "name": "假面騎士OOO Tatoba Combo",
  "nameJa": "仮面ライダーオーズ タトバ コンボ",
  "ruby": "かめんらいだーおーず　たとば　こんぼ",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-110",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-110",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-110.png"
   }
  ],
  "color": "blue",
  "energy": 3,
  "ap": 2,
  "bp": 3000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【在自己的回合中】自己的場外，ある卡名包含「メダル」的卡1張，つき、這個角色，BP+500。【登場時】自己的主要階段中的時，自己的手牌的所需能量，相同的卡，3張場外，置いて也よい。這樣做的話，BP4000以下的對手的前線的角色最多選擇1張，退場させ、こ的主要階段結束時、卡，3張抽。",
  "effectJa": "【自分のターン中】自分の場外にあるカード名に「メダル」を含むカード1枚につき、このキャラはBP+500。【登場時】自分のメインフェイズ中の場合、自分の手札の必要エナジーが同じカードを3枚場外に置いてもよい。そうした場合、BP4000以下の相手のフロントLのキャラを1枚まで選び、退場させ、このメインフェイズ終了時、カードを3枚引く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-110.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-110",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-110",
  "faq": [
   {
    "id": "Q1192",
    "date": "2024.10.18 更新",
    "q": "必要エナジーが同じカードとは、このキャラと同じ必要エナジーということですか？",
    "a": "いいえ、違います。場外に置くカード3枚の必要エナジーが同じということです。"
   }
  ]
 },
 {
  "id": "KMR-1-111",
  "identity": "KMR-1-111",
  "number": "UA29ST/KMR-1-111",
  "name": "假面騎士Genm Action Gamer Level0",
  "nameJa": "仮面ライダーゲンム アクションゲーマー レベル0",
  "ruby": "かめんらいだーげんむ　あくしょんげーまー　れべるぜろ",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-111",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-111",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-111.png"
   }
  ],
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【啟動主要】【在場外時】 【將2張手牌置於場外】 【支付1點AP】自己的產生能量，4以上ある時才發動可以。場外的這張卡，自己的場，休息，令其登場。【退場時】這個角色，戰鬥，因退場した時，BP1500以上的對手的前線的角色最多選擇1張，這個回合中、BP-1000。",
  "effectJa": "【起動メイン】【場外にある場合】 【手札を2枚場外に置く】 【APを1支払う】自分の発生エナジーが4以上ある場合のみ発動できる。場外のこのカードを自分の場にレストで登場させる。【退場時】このキャラがバトルによって退場した場合、BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-111.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-111",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-111",
  "faq": [
   {
    "id": "Q1213",
    "date": "2024.11.08 更新",
    "q": "「自分の発生エナジーが4以上ある場合のみ発動できる」は青以外の発生エナジーが4あることでも満たせますか？",
    "a": "はい、満たせます。"
   }
  ]
 },
 {
  "id": "KMR-1-112",
  "identity": "KMR-1-112",
  "number": "UA29ST/KMR-1-112",
  "name": "假面騎士Zeronos Vega Form",
  "nameJa": "仮面ライダーゼロノス ベガフォーム",
  "ruby": "かめんらいだーぜろのす　べがふぉーむ",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-112",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-112",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-112.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "+",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "active",
  "triggerText": "【活動】自己的場的角色選擇1張，活動，し、這個回合中、BP+3000。",
  "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
  "effect": "【傷害（2）】（這個角色以攻擊造成直接傷害時，改為造成2點傷害）【登場時】自己的手牌，1張場外，放置。【攻擊時】自己的場的角色最多選擇1張，這個回合中、BP+1000。",
  "effectJa": "【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）【登場時】自分の手札を1枚場外に置く。【アタック時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-112.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-112",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-112",
  "faq": []
 },
 {
  "id": "KMR-1-113",
  "identity": "KMR-1-113",
  "number": "UA29ST/KMR-1-113",
  "name": "假面騎士Muse",
  "nameJa": "仮面ライダーミューズ",
  "ruby": "かめんらいだーみゅーず",
  "title": "kmr",
  "set": "UA29ST",
  "sets": [
   "UA29ST"
  ],
  "printings": [
   {
    "number": "UA29ST/KMR-1-113",
    "set": "UA29ST",
    "rarity": "R",
    "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-113",
    "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-113.png"
   }
  ],
  "color": "red",
  "energy": 4,
  "ap": 1,
  "bp": 4000,
  "bpMark": "",
  "gen": 1,
  "genMark": "",
  "type": "character",
  "traits": [],
  "rarity": "R",
  "trigger": "draw",
  "triggerText": "【抽牌】抽1張牌。",
  "triggerTextJa": "【ドロー】カードを1枚引く。",
  "effect": "【登場時】對手，自身的從牌組頂1張，公開する。自己，這個效果，公開された卡，對手的牌組頂或場外，放置。【退場時】自己的從牌組頂4張查看。そ的中從卡名包含「Faiz」的卡，1張為止公開並加入手牌。其餘依想要的順序自己的牌組底，放置。手牌，加えた時，自己的手牌，1張場外，放置。",
  "effectJa": "【登場時】相手は自身の山札の上から1枚を公開する。自分はこの効果で公開されたカードを相手の山札の上か場外に置く。【退場時】自分の山札の上から4枚見る。その中からカード名に「ファイズ」を含むカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
  "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/UA29ST_KMR-1-113.png",
  "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA29ST%2FKMR-1-113",
  "sourceTc": "官方繁中卡表沒有 UA29BT／UA29ST。這裡的中文是翻譯，效果以 effectJa 為準。",
  "auto": false,
  "engineKind": "KMR-1-113",
  "faq": []
 }
];
