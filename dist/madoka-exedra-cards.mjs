// Official EX16BT Magia Exedra booster. Japanese pages fetched 2026-10-29.
// Display name, effect, and trigger text are the official Traditional Chinese
// card pages fetched 2026-11-03. The engine matches effectJa and nameJa.
// Do not invent a translation. Traits stay the printed Japanese tokens.
// One identity per card number. Parallel art and AP cards are not identities.
// BP+ is a design mark. A generated-energy + sits after the colored pips:
// those pips are the base gen, and the + is extra energy only while the
// printed effect is live. engineKind names the tested program for the whole
// Japanese print.
// Asset revision 20261103: republish this module. The 2026-11-03 deploy
// reported success, but workers.dev was still serving the previous asset set.
export const EXEDRA_FETCHED='2026-10-29';
export const EXEDRA_SET='EX16BT';
export const EXEDRA_CARDS=
[
{
   "id": "MMM-2-001",
   "identity": "MMM-2-001",
   "number": "EX16BT/MMM-2-001",
   "name": "最終形態鹿目圓",
   "nameJa": "アルティメットまどか",
   "ruby": "あるてぃめっとまどか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-001",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-001",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-001.png"
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
   "rarity": "SR",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "【突襲】〈鹿目圓〉置為活動，並可移動至前線 【登場時】抽1張卡片。之後，可將1張自己的手牌放置在移除區。若有執行此動作時，從自己的移除區，使最多1張〈鹿目圓〉以外能源需求3以下消耗AP1的黃色［特徵：魔法少女］以休息狀態在自己場上登場。 【退場時】將這張角色卡放置在移除區。將最多1張自己場外的角色卡放置在移除區。",
   "effectJa": "【レイド】〈鹿目 まどか〉アクティブにし、フロントLに移動できる【登場時】カードを1枚引く。その後、自分の手札を1枚リムーブエリアに置いてもよい。そうした場合、自分のリムーブエリアから〈鹿目 まどか〉以外の必要エナジーが3以下で消費APが1の黄の［特徴：魔法少女］を1枚まで自分の場にレストで登場させる。【退場時】このキャラをリムーブエリアに置く。自分の場外のキャラカードを1枚までリムーブエリアに置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-001.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-001",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-001",
   "auto": false,
   "engineKind": "MMM-2-001",
   "faq": [
     {
       "id": "Q2344",
       "date": "2026.09.18 更新",
       "q": "この【登場時】でリムーブエリアに置いたカードが〈鹿目 まどか〉以外の必要エナジーが3以下で消費APが1の黄の［特徴：魔法少女］だった場合、自分の場にレストで登場させることはできますか？",
       "a": "はい、登場させられます。"
     }
   ]
 },
{
   "id": "MMM-2-002",
   "identity": "MMM-2-002",
   "number": "EX16BT/MMM-2-002",
   "name": "丘比",
   "nameJa": "キュゥべえ",
   "ruby": "きゅぅべえ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-002",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-002",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-002.png"
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
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【衝擊無效】（與這張角色卡對戰的角色卡在這場對戰中，失去【衝擊】）",
   "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-002.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-002",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-002",
   "auto": false,
   "engineKind": "impactNull",
   "faq": []
 },
{
   "id": "MMM-2-003",
   "identity": "MMM-2-003",
   "number": "EX16BT/MMM-2-003",
   "name": "曉美焰",
   "nameJa": "暁美 ほむら",
   "ruby": "あけみ ほむら",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-003",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-003",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-003.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【登場時】從以下選擇1項。在這個回合中，〈曉美焰〉已選擇的效果無法選擇。 ・若自己場上有〈最終形態鹿目圓〉，且這張角色卡是從手牌登場時，抽1張卡片。 ・可將1張自己移除區的〈最終形態鹿目圓〉放置在場外。若有執行此動作時，選擇最多1張對手前線的角色卡，轉為休息。",
   "effectJa": "【登場時】以下から1つ選ぶ。このターン中に〈暁美 ほむら〉が既に選んだ効果は選べない。・自分の場に〈アルティメットまどか〉があり、このキャラが手札から登場していた場合、カードを1枚引く。・自分のリムーブエリアの〈アルティメットまどか〉を1枚場外に置いてもよい。そうした場合、相手のフロントLのキャラを1枚まで選び、レストにする。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-003.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-003",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-003",
   "auto": false,
   "engineKind": "MMM-2-003",
   "faq": []
 },
{
   "id": "MMM-2-004",
   "identity": "MMM-2-004",
   "number": "EX16BT/MMM-2-004",
   "name": "鹿目圓",
   "nameJa": "鹿目 まどか",
   "ruby": "かなめ まどか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-004",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-004",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-004.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "若自己場上沒有任何卡片時，手牌中這張卡片的能源需求減少【黃×2】。 【登場時】查看1張自己卡組上面的卡片，將該張卡片放置在自己卡組的上面或場外。",
   "effectJa": "自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【黄×2】減らす。【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-004.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-004",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-004",
   "auto": false,
   "engineKind": "MMM-2-004",
   "faq": []
 },
{
   "id": "MMM-2-005",
   "identity": "MMM-2-005",
   "number": "EX16BT/MMM-2-005",
   "name": "佐倉杏子",
   "nameJa": "佐倉 杏子",
   "ruby": "さくら きょうこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-005",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-005",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-005.png"
     }
   ],
   "color": "yellow",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【階梯】（在自己的移動階段可以從前線移動至能源線） 【對方回合中】這張角色卡BP+1000。",
   "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）【相手のターン中】このキャラはBP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-005.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-005",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-005",
   "auto": false,
   "engineKind": "MMM-2-005",
   "faq": []
 },
{
   "id": "MMM-2-006",
   "identity": "MMM-2-006",
   "number": "EX16BT/MMM-2-006",
   "name": "巴麻美",
   "nameJa": "巴 マミ",
   "ruby": "ともえ まみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-006",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-006",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-006.png"
     }
   ],
   "color": "yellow",
   "energy": 0,
   "ap": 1,
   "bp": 2000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "若自己場外有4張以上事件卡時，這張角色卡BP+1000。",
   "effectJa": "自分の場外にイベントカードが4枚以上ある場合、このキャラはBP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-006.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-006",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-006",
   "auto": false,
   "engineKind": "MMM-2-006",
   "faq": []
 },
{
   "id": "MMM-2-007",
   "identity": "MMM-2-007",
   "number": "EX16BT/MMM-2-007",
   "name": "巴麻美",
   "nameJa": "巴 マミ",
   "ruby": "ともえ まみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-007",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-007",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-007.png"
     }
   ],
   "color": "yellow",
   "energy": 3,
   "ap": 1,
   "bp": 2000,
   "bpMark": "+",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "SR",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "若自己場上有〈巴麻美〉以外的［特徵：魔法少女］時，這張卡片無法登場。 以自己的效果參照自己場外事件卡的張數時，該張數視為多1張。〈巴麻美〉的這個效果不重複。 【登場時】選擇最多1張自己場上的角色卡，在這個回合中，BP+1000。 【啟動主要】【轉為休息】【每回合1】僅限自己場外有6張以上事件卡時可發動。發動這張角色卡的【登場時】。",
   "effectJa": "自分の場に〈巴 マミ〉以外の［特徴：魔法少女］がある場合、このカードは登場できない。自分の効果で自分の場外にあるイベントカードの枚数を参照する場合、その枚数は1枚多くあるものとして扱う。〈巴 マミ〉のこの効果は重複しない。【登場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。【起動メイン】【レストにする】 【ターン1】自分の場外にイベントカードが6枚以上ある場合のみ発動できる。このキャラの【登場時】を発動する。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-007.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-007",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-007",
   "auto": false,
   "engineKind": "MMM-2-007",
   "faq": [
     {
       "id": "Q2345",
       "date": "2026.09.18 更新",
       "q": "「〈巴 マミ〉のこの効果は重複しない。」とはどういうことですか？",
       "a": "この〈巴 マミ〉が自分の場に2枚あったとしても、自分の効果で自分の場外にあるイベントカードの枚数を参照する場合に多くあるものとして扱うのが『1枚』だけであるということです。"
     },
     {
       "id": "Q2346",
       "date": "2026.09.18 更新",
       "q": "「自分の効果で自分の場外にあるイベントカードの枚数を参照する場合、その枚数は1枚多くあるものとして扱う。」はこのカードの【起動メイン】にも適用されますか？",
       "a": "はい、適用されます。自分の場外にイベントカードが5枚ある場合、6枚あるものとして扱われ、このカードの【起動メイン】を発動できます。"
     }
   ]
 },
{
   "id": "MMM-2-008",
   "identity": "MMM-2-008",
   "number": "EX16BT/MMM-2-008",
   "name": "美樹沙耶香",
   "nameJa": "美樹 さやか",
   "ruby": "みき さやか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-008",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-008",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-008.png"
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
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【啟動主要】【轉為休息】僅限在這個回合中有角色卡從自己的移除區登場時可發動。抽1張卡片，並將1張自己的手牌放置在場外。〈美樹沙耶香〉的這個效果每回合僅可發動1次。",
   "effectJa": "【起動メイン】【レストにする】このターン中に自分のリムーブエリアからキャラが登場している場合のみ発動できる。カードを1枚引き、自分の手札を1枚場外に置く。〈美樹 さやか〉のこの効果は1ターンに1回のみ発動できる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-008.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-008",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-008",
   "auto": false,
   "engineKind": "MMM-2-008",
   "faq": [
     {
       "id": "Q2347",
       "date": "2026.09.18 更新",
       "q": "このカードが自分の場に2枚ある場合、このカードの【起動メイン】を同じターンにそれぞれ1回ずつ発動できますか？",
       "a": "いいえ、どちらか片方しか発動できません。"
     }
   ]
 },
{
   "id": "MMM-2-009",
   "identity": "MMM-2-009",
   "number": "EX16BT/MMM-2-009",
   "name": "挑戰手作蛋糕中",
   "nameJa": "手作りケーキに挑戦中",
   "ruby": "てづくりけーきにちょうせんちゅう",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-009",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-009",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-009.png"
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
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "選擇最多2張自己場上的角色卡，在這個回合中，BP+2000。抽『1張』卡片。若自己場外有6張以上其他的事件卡時，則替換成『2張』。",
   "effectJa": "自分の場のキャラを2枚まで選び、このターン中、BP+2000。カードを『1枚』引く。自分の場外に他のイベントカードが6枚以上ある場合、『2枚』に代わる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-009.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-009",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-009",
   "auto": false,
   "engineKind": "MMM-2-009",
   "faq": []
 },
{
   "id": "MMM-2-010",
   "identity": "MMM-2-010",
   "number": "EX16BT/MMM-2-010",
   "name": "下次見，小焰",
   "nameJa": "またね、ほむらちゃん",
   "ruby": "またね ほむらちゃん",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-010",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-010",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-010.png"
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
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "抽『2張』卡片，並將這張卡片與1張自己的手牌放置在移除區。若自己場上有〈鹿目圓〉時，則替換成『3張』。",
   "effectJa": "カードを『2枚』引き、このカードと自分の手札を1枚リムーブエリアに置く。自分の場に〈鹿目 まどか〉がある場合、『3枚』に代わる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-010.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-010",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-010",
   "auto": false,
   "engineKind": "MMM-2-010",
   "faq": []
 },
{
   "id": "MMM-2-011",
   "identity": "MMM-2-011",
   "number": "EX16BT/MMM-2-011",
   "name": "最終形態鹿目圓",
   "nameJa": "アルティメットまどか",
   "ruby": "あるてぃめっとまどか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-011",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-011",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-011.png"
     }
   ],
   "color": "purple",
   "energy": 5,
   "ap": 1,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [],
   "rarity": "R",
   "trigger": "color",
   "triggerText": "[顔色] 使1張自己場外能源需求2以下消耗AP1的紫色角色卡以活動狀態在自己前線登場。",
   "triggerTextJa": "【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。",
   "effect": "這張卡片也視為〈鹿目圓〉。 我方回合中，這張角色卡從自己場上放回手牌時，可將1張自己手牌中的紫色〈最終形態鹿目圓〉放置在場外。若有執行此動作時，從自己手牌或場外，使最多1張能源需求1以下的紫色角色卡以休息狀態在自己場上登場，並選擇最多1張自己場上的〈鹿目圓〉，置為活動，在這個回合中，BP+2500。",
   "effectJa": "このカードは〈鹿目 まどか〉としても扱う。自分のターン中にこのキャラが自分の場から手札に戻った時、自分の手札の紫の〈アルティメットまどか〉を1枚場外に置いてもよい。そうした場合、自分の手札か場外から必要エナジーが1以下の紫のキャラカードを1枚まで自分の場にレストで登場させ、自分の場の〈鹿目 まどか〉を1枚まで選び、アクティブにし、このターン中、BP+2500。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-011.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-011",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-011",
   "auto": false,
   "engineKind": "MMM-2-011",
   "faq": [
     {
       "id": "Q2348",
       "date": "2026.09.18 更新",
       "q": "「自分の場の〈鹿目 まどか〉を1枚まで選び、アクティブにし、このターン中、BP+2500。」はその手前の「自分の手札か場外から必要エナジーが1以下の紫のキャラカードを1枚まで自分の場にレストで登場させ」で登場させた〈鹿目 まどか〉を選ぶことはできますか？",
       "a": "はい、できます。"
     }
   ]
 },
{
   "id": "MMM-2-012",
   "identity": "MMM-2-012",
   "number": "EX16BT/MMM-2-012",
   "name": "惡魔焰",
   "nameJa": "悪魔ほむら",
   "ruby": "あくまほむら",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-012",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-012",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-012.png"
     }
   ],
   "color": "purple",
   "energy": 4,
   "ap": 1,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [],
   "rarity": "SR",
   "trigger": "get",
   "triggerText": "[獲得] 將這張卡片加入手牌。",
   "triggerTextJa": "【ゲット】このカードを手札に加える。",
   "effect": "這張卡片也視為〈曉美焰〉。 【啟動主要】【若在前線時】【每回合1】將1張自己場上的〈鹿目圓〉放回手牌。若有執行此動作時，查看2張自己卡組上面的卡片，將最多1張加入手牌，其餘卡片放置在場外。 【啟動主要】從自己場外選擇任意張〈鹿目圓〉，使其能源需求合計為4以上，並依任意順序放置在自己卡組下面。若有執行此動作時，將這張角色卡置為活動。〈惡魔焰〉的這個效果每回合僅可發動1次。",
   "effectJa": "このカードは〈暁美 ほむら〉としても扱う。【起動メイン】【フロントLにある場合】 【ターン1】自分の場の〈鹿目 まどか〉を1枚手札に戻す。そうした場合、自分の山札の上から2枚見て、1枚まで手札に加え、残りを場外に置く。【起動メイン】自分の場外の〈鹿目 まどか〉を必要エナジーの合計が4以上になるように望む枚数を望む順で自分の山札の下に置く。そうした場合、このキャラをアクティブにする。〈悪魔ほむら〉のこの効果は1ターンに1回のみ発動できる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-012.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-012",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-012",
   "auto": false,
   "engineKind": "MMM-2-012",
   "faq": [
     {
       "id": "Q2349",
       "date": "2026.09.18 更新",
       "q": "このカードが自分の場に2枚ある場合、このカードの【起動メイン】を同じターンにそれぞれ1回ずつ発動できますか？",
       "a": "いいえ、どちらか片方しか発動できません。"
     }
   ]
 },
{
   "id": "MMM-2-013",
   "identity": "MMM-2-013",
   "number": "EX16BT/MMM-2-013",
   "name": "曉美焰",
   "nameJa": "暁美 ほむら",
   "ruby": "あけみ ほむら",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-013",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-013",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-013.png"
     }
   ],
   "color": "purple",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "+",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【我方回合中】若自己場上有〈鹿目圓〉時，這張角色卡BP+1000。",
   "effectJa": "【自分のターン中】自分の場に〈鹿目 まどか〉がある場合、このキャラはBP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-013.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-013",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-013",
   "auto": false,
   "engineKind": "MMM-2-013",
   "faq": []
 },
{
   "id": "MMM-2-014",
   "identity": "MMM-2-014",
   "number": "EX16BT/MMM-2-014",
   "name": "曉美焰",
   "nameJa": "暁美 ほむら",
   "ruby": "あけみ ほむら",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-014",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-014",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-014.png"
     }
   ],
   "color": "purple",
   "energy": 0,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】若在我方回合中，且這張角色卡是因自己的效果登場時，選擇最多1張對手前線的角色卡，在這個回合中，BP-1000。",
   "effectJa": "【登場時】自分のターン中で、このキャラが自分の効果で登場していた場合、相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-014.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-014",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-014",
   "auto": false,
   "engineKind": "MMM-2-014",
   "faq": []
 },
{
   "id": "MMM-2-015",
   "identity": "MMM-2-015",
   "number": "EX16BT/MMM-2-015",
   "name": "鹿目圓",
   "nameJa": "鹿目 まどか",
   "ruby": "かなめ まどか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-015",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-015",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-015.png"
     }
   ],
   "color": "purple",
   "energy": 1,
   "ap": 1,
   "bp": 2500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】抽1張卡片，並將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-015.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-015",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-015",
   "auto": false,
   "engineKind": "drawDiscard",
   "faq": []
 },
{
   "id": "MMM-2-016",
   "identity": "MMM-2-016",
   "number": "EX16BT/MMM-2-016",
   "name": "百江渚",
   "nameJa": "百江 なぎさ",
   "ruby": "ももえ なぎさ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-016",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-016",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-016.png"
     }
   ],
   "color": "purple",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "SR",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【啟動主要】【每回合1】使1張自己場上其他能源需求4以下的角色卡退場。若有執行此動作時，抽1張卡片，並將這張角色卡置為活動。 【啟動主要】【若在前線時】【每回合1】公開1張自己卡組上面的卡片，將該張卡片放置在自己卡組的上面或場外。依據公開的紫色卡片的能源需求，這張角色卡在這個回合中獲得以下所有效果。 ・2以下：這張角色卡不會被BP4000以上的角色卡防禦。 ・1以下：這張角色卡不會被BP2000以下的角色卡防禦。",
   "effectJa": "【起動メイン】【ターン1】自分の場の必要エナジーが4以下の他のキャラを1枚退場させる。そうした場合、カードを1枚引き、このキャラをアクティブにする。【起動メイン】【フロントLにある場合】 【ターン1】自分の山札の上から1枚を公開し、山札の上か場外に置く。公開した紫のカードの必要エナジーの数により、このキャラはこのターン中、以下の効果を全て得る。・2以下：このキャラはBP4000以上のキャラにブロックされない。・1以下：このキャラはBP2000以下のキャラにブロックされない。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-016.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-016",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-016",
   "auto": false,
   "engineKind": "MMM-2-016",
   "faq": [
     {
       "id": "Q2350",
       "date": "2026.09.18 更新",
       "q": "【起動メイン】で山札の上から1枚を公開し、必要エナジーが1以下の紫のカードが公開された場合、「2以下：このキャラはBP4000以上のキャラにブロックされない。」と「1以下：このキャラはBP2000以下のキャラにブロックされない。」は両方得ることができますか。",
       "a": "はい、両方の効果を得ることができます。"
     }
   ]
 },
{
   "id": "MMM-2-017",
   "identity": "MMM-2-017",
   "number": "EX16BT/MMM-2-017",
   "name": "巴麻美",
   "nameJa": "巴 マミ",
   "ruby": "ともえ まみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-017",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-017",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-017.png"
     }
   ],
   "color": "purple",
   "energy": 2,
   "ap": 1,
   "bp": 1000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／ピュエラ・マギ・ホーリー・クインテット"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "自己卡組中的紫色卡片能源需求減少1。 【啟動主要】【轉為休息】選擇1張自己場上其他的角色卡，在這個回合中，BP+1000。",
   "effectJa": "自分の山札にある紫のカードの必要エナジーを1減らす。【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-017.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-017",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-017",
   "auto": false,
   "engineKind": "MMM-2-017",
   "faq": []
 },
{
   "id": "MMM-2-018",
   "identity": "MMM-2-018",
   "number": "EX16BT/MMM-2-018",
   "name": "將回憶珍藏於心",
   "nameJa": "思い出をこの胸に",
   "ruby": "おもいでをこのむねに",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-018",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-018",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-018.png"
     }
   ],
   "color": "purple",
   "energy": 3,
   "ap": 2,
   "bp": 0,
   "bpMark": "",
   "gen": 0,
   "genMark": "",
   "type": "event",
   "traits": [],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "從自己場外，使最多各1張能源需求1以下的紫色〔〈曉美焰〉與〈鹿目圓〉〕以休息狀態在自己場上登場。若自己前線有〈惡魔焰〉時，將1張自己的AP卡置為活動。",
   "effectJa": "自分の場外から必要エナジーが1以下の紫の〔〈暁美 ほむら〉と〈鹿目 まどか〉〕をそれぞれ1枚まで自分の場にレストで登場させる。自分のフロントLに〈悪魔ほむら〉がある場合、自分のAPカードを1枚アクティブにする。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-018.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-018",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-018",
   "auto": false,
   "engineKind": "MMM-2-018",
   "faq": []
 },
{
   "id": "MMM-2-019",
   "identity": "MMM-2-019",
   "number": "EX16BT/MMM-2-019",
   "name": "秋野楓",
   "nameJa": "秋野 かえで",
   "ruby": "あきの かえで",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-019",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-019",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-019.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【啟動主要】【轉為休息】抽1張卡片，並將1張自己的手牌放置在場外。",
   "effectJa": "【起動メイン】【レストにする】カードを1枚引き、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-019.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-019",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-019",
   "auto": false,
   "engineKind": "MMM-2-019",
   "faq": []
 },
{
   "id": "MMM-2-020",
   "identity": "MMM-2-020",
   "number": "EX16BT/MMM-2-020",
   "name": "吳紀里香",
   "nameJa": "呉 キリカ",
   "ruby": "くれ きりか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-020",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-020",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-020.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "+",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【我方回合中】若自己場上有〈美國織莉子〉時，這張角色卡BP+1000。 【退場時】選擇最多1張自己場上的〈美國織莉子〉，在這個回合中，BP+1000。",
   "effectJa": "【自分のターン中】自分の場に〈美国 織莉子〉がある場合、このキャラはBP+1000。【退場時】自分の場の〈美国 織莉子〉を1枚まで選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-020.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-020",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-020",
   "auto": false,
   "engineKind": "MMM-2-020",
   "faq": []
 },
{
   "id": "MMM-2-021",
   "identity": "MMM-2-021",
   "number": "EX16BT/MMM-2-021",
   "name": "環羽衣",
   "nameJa": "環 うい",
   "ruby": "たまき うい",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-021",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-021",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-021.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1000,
   "bpMark": "",
   "gen": 1,
   "genMark": "+",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【啟動主要】【轉為休息】【每回合1】這張角色卡在這個回合中，獲得產生能源+【綠】與「主要階段結束時，使這張角色卡退場。」。",
   "effectJa": "【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【緑】と「メインフェイズ終了時、このキャラを退場させる。」を得る。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-021.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-021",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-021",
   "auto": false,
   "engineKind": "restEnergyRetire",
   "faq": []
 },
{
   "id": "MMM-2-022",
   "identity": "MMM-2-022",
   "number": "EX16BT/MMM-2-022",
   "name": "十咎桃子",
   "nameJa": "十咎 ももこ",
   "ruby": "とがめ ももこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-022",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-022",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-022.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】選擇最多1張自己場上其他的角色卡，在這個回合中，BP+1000。",
   "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-022.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-022",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-022",
   "auto": false,
   "engineKind": "buffOther",
   "faq": []
 },
{
   "id": "MMM-2-023",
   "identity": "MMM-2-023",
   "number": "EX16BT/MMM-2-023",
   "name": "美國織莉子",
   "nameJa": "美国 織莉子",
   "ruby": "みくに おりこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-023",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-023",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-023.png"
     }
   ],
   "color": "green",
   "energy": 4,
   "ap": 2,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": "get",
   "triggerText": "[獲得] 將這張卡片加入手牌。",
   "triggerTextJa": "【ゲット】このカードを手札に加える。",
   "effect": "這張角色卡以活動狀態在場上登場。 【登場時】可將1張自己的手牌放置在場外。若有執行此動作時，使最多1張自己場外能源需求3以下消耗AP1的綠色〈吳紀里香〉以休息狀態在自己場上登場。",
   "effectJa": "このキャラはアクティブで登場させる。【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが3以下で消費APが1の緑の〈呉 キリカ〉を1枚まで自分の場にレストで登場させる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-023.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-023",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-023",
   "auto": false,
   "engineKind": "MMM-2-023",
   "faq": [
     {
       "id": "Q2351",
       "date": "2026.09.18 更新",
       "q": "【登場時】で置いた自分の手札が必要エナジーが3以下で消費APが1の緑の〈呉 キリカ〉だった場合、そのカードを自分の場にレストで登場させることはできますか？",
       "a": "はい、できます。"
     }
   ]
 },
{
   "id": "MMM-2-024",
   "identity": "MMM-2-024",
   "number": "EX16BT/MMM-2-024",
   "name": "水波玲奈",
   "nameJa": "水波 レナ",
   "ruby": "みなみ れな",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-024",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-024",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-024.png"
     }
   ],
   "color": "green",
   "energy": 1,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】將1張自己場上其他能源需求1以下的角色卡放回手牌。若無法放回手牌時，將這張角色卡放回手牌。",
   "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-024.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-024",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-024",
   "auto": false,
   "engineKind": "bounce",
   "faq": []
 },
{
   "id": "MMM-2-025",
   "identity": "MMM-2-025",
   "number": "EX16BT/MMM-2-025",
   "name": "環彩羽",
   "nameJa": "環 いろは",
   "ruby": "たまき いろは",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-025",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-025",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-025.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【啟動主要】【每回合1】選擇1張自己前線其他的［特徵：三日月莊小隊］，使其移動至能源線。",
   "effectJa": "【起動メイン】【ターン1】自分のフロントLの他の［特徴：チームみかづき荘］を1枚選び、エナジーLに移動させる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-025.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-025",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-025",
   "auto": false,
   "engineKind": "MMM-2-025",
   "faq": [
     {
       "id": "Q2352",
       "date": "2026.09.18 更新",
       "q": "移動させる時にそのラインに空きがない場合どうなりますか？",
       "a": "移動させる時にそのラインに空きがない場合、カードを1枚選んでリムーブエリアに置いてから移動させます。"
     }
   ]
 },
{
   "id": "MMM-2-026",
   "identity": "MMM-2-026",
   "number": "EX16BT/MMM-2-026",
   "name": "環彩羽",
   "nameJa": "環 いろは",
   "ruby": "たまき いろは",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-026",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-026",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-026.png"
     }
   ],
   "color": "green",
   "energy": 1,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】查看3張自己卡組上面的卡片，公開其中最多1張〈環羽衣〉或［特徵：三日月莊小隊］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若有加入手牌時，將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】自分の山札の上から3枚見て、〈環 うい〉か［特徴：チームみかづき荘］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-026.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-026",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-026",
   "auto": false,
   "engineKind": "MMM-2-026",
   "faq": []
 },
{
   "id": "MMM-2-027",
   "identity": "MMM-2-027",
   "number": "EX16BT/MMM-2-027",
   "name": "環彩羽",
   "nameJa": "環 いろは",
   "ruby": "たまき いろは",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-027",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-027",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-027.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "R",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，抽1張卡片。",
   "effectJa": "【登場時】このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、カードを1枚引く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-027.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-027",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-027",
   "auto": false,
   "engineKind": "MMM-2-027",
   "faq": [
     {
       "id": "Q2353",
       "date": "2026.09.18 更新",
       "q": "このカードがこのターン中に登場する3種類目のカード名の［特徴：チームみかづき荘］だった場合、「カードを1枚引く」ことはできますか？",
       "a": "はい、できます。"
     }
   ]
 },
{
   "id": "MMM-2-028",
   "identity": "MMM-2-028",
   "number": "EX16BT/MMM-2-028",
   "name": "環彩羽",
   "nameJa": "環 いろは",
   "ruby": "たまき いろは",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-028",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-028",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-028.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3500,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "SR",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "【突襲】〈環彩羽〉置為活動，並可移動至前線 若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，這張角色卡不會被BP4000以上的角色卡防禦。 【登場時】選擇最多1張自己場上的角色卡，在這個回合中，BP+1000。 【啟動主要】【若在前線時】【每回合1】選擇最多2張自己場上的角色卡，在這個回合中，BP+1000。",
   "effectJa": "【レイド】〈環 いろは〉アクティブにし、フロントLに移動できるこのターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、このキャラはBP4000以上のキャラにブロックされない。【登場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。【起動メイン】【フロントLにある場合】 【ターン1】自分の場のキャラを2枚まで選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-028.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-028",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-028",
   "auto": false,
   "engineKind": "MMM-2-028",
   "faq": [
     {
       "id": "Q2354",
       "date": "2026.09.18 更新",
       "q": "このカードがこのターン中に登場する3種類目のカード名の［特徴：チームみかづき荘］だった場合、「このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合」を満たしますか？",
       "a": "はい、満たします。"
     }
   ]
 },
{
   "id": "MMM-2-029",
   "identity": "MMM-2-029",
   "number": "EX16BT/MMM-2-029",
   "name": "七海八千代",
   "nameJa": "七海 やちよ",
   "ruby": "ななみ やちよ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-029",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-029",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-029.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】抽1張卡片，並將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-029.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-029",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-029",
   "auto": false,
   "engineKind": "drawDiscard",
   "faq": []
 },
{
   "id": "MMM-2-030",
   "identity": "MMM-2-030",
   "number": "EX16BT/MMM-2-030",
   "name": "七海八千代",
   "nameJa": "七海 やちよ",
   "ruby": "ななみ やちよ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-030",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-030",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-030.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【階梯】（在自己的移動階段可以從前線移動至能源線）",
   "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-030.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-030",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-030",
   "auto": false,
   "engineKind": "step",
   "faq": []
 },
{
   "id": "MMM-2-031",
   "identity": "MMM-2-031",
   "number": "EX16BT/MMM-2-031",
   "name": "七海八千代",
   "nameJa": "七海 やちよ",
   "ruby": "ななみ やちよ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-031",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-031",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-031.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "R",
   "trigger": "color",
   "triggerText": "[顔色] 使1張自己手牌中能源需求2以下消耗AP1的綠色角色卡以活動狀態在自己場上登場。",
   "triggerTextJa": "【カラー】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。",
   "effect": "【登場時】若在我方回合中，可將1張自己場上能源需求2以下的［特徵：三日月莊小隊］放回手牌。若有執行此動作時，從自己手牌中，使最多1張能源需求3以下消耗AP1的綠色［特徵：三日月莊小隊］以休息狀態在自己場上登場。",
   "effectJa": "【登場時】自分のターン中の場合、自分の場の必要エナジーが2以下の［特徴：チームみかづき荘］を1枚手札に戻してもよい。そうした場合、自分の手札から必要エナジーが3以下で消費APが1の緑の［特徴：チームみかづき荘］を1枚まで自分の場にレストで登場させる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-031.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-031",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-031",
   "auto": false,
   "engineKind": "MMM-2-031",
   "faq": [
     {
       "id": "Q2355",
       "date": "2026.09.18 更新",
       "q": "【登場時】で手札に戻したカードをその後の「自分の手札から必要エナジーが3以下で消費APが1の緑の［特徴：チームみかづき荘］を1枚まで自分の場にレストで登場させる。」で登場させることはできますか？",
       "a": "はい、できます。"
     }
   ]
 },
{
   "id": "MMM-2-032",
   "identity": "MMM-2-032",
   "number": "EX16BT/MMM-2-032",
   "name": "七海八千代",
   "nameJa": "七海 やちよ",
   "ruby": "ななみ やちよ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-032",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-032",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-032.png"
     }
   ],
   "color": "green",
   "energy": 4,
   "ap": 1,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "SR",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "【突襲】〈七海八千代〉置為活動，並可移動至前線 【衝擊無效】（與這張角色卡對戰的角色卡在這場對戰中，失去【衝擊】） 若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，這張角色卡獲得【衝擊（1）】。 【登場時】從自己手牌中，使最多1張能源需求3以下消耗AP1的綠色［特徵：三日月莊小隊］以休息狀態在自己場上登場。",
   "effectJa": "【レイド】〈七海 やちよ〉アクティブにし、フロントLに移動できる【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、このキャラは【インパクト（1）】を得る。【登場時】自分の手札から必要エナジーが3以下で消費APが1の緑の［特徴：チームみかづき荘］を1枚まで自分の場にレストで登場させる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-032.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-032",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-032",
   "auto": false,
   "engineKind": "MMM-2-032",
   "faq": []
 },
{
   "id": "MMM-2-033",
   "identity": "MMM-2-033",
   "number": "EX16BT/MMM-2-033",
   "name": "二葉紗奈",
   "nameJa": "二葉 さな",
   "ruby": "ふたば さな",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-033",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-033",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-033.png"
     }
   ],
   "color": "green",
   "energy": 1,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】若這張角色卡是因自己的效果而登場時，抽1張卡片。",
   "effectJa": "【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-033.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-033",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-033",
   "auto": false,
   "engineKind": "MMM-2-033",
   "faq": []
 },
{
   "id": "MMM-2-034",
   "identity": "MMM-2-034",
   "number": "EX16BT/MMM-2-034",
   "name": "二葉紗奈",
   "nameJa": "二葉 さな",
   "ruby": "ふたば さな",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-034",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-034",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-034.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 1,
   "genMark": "+",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "若自己前線有2種以上不同卡片名稱的［特徵：三日月莊小隊］時，這張角色卡的產生能源+【綠】。",
   "effectJa": "自分のフロントLに異なるカード名の［特徴：チームみかづき荘］が2種類以上ある場合、このキャラの発生エナジー+【緑】。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-034.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-034",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-034",
   "auto": false,
   "engineKind": "MMM-2-034",
   "faq": []
 },
{
   "id": "MMM-2-035",
   "identity": "MMM-2-035",
   "number": "EX16BT/MMM-2-035",
   "name": "二葉紗奈",
   "nameJa": "二葉 さな",
   "ruby": "ふたば さな",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-035",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-035",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-035.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 2500,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【衝擊無效】（與這張角色卡對戰的角色卡在這場對戰中，失去【衝擊】） 【若在能源線時】自己的攻擊階段結束時，可選擇1張自己前線具有「三日月莊小隊」特徵的角色卡，與這張角色卡互相交換位置。",
   "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【エナジーLにある場合】自分のアタックフェイズ終了時、自分のフロントLの特徴に「チームみかづき荘」を持つキャラを1枚選び、このキャラと位置を入れ替えてもよい。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-035.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-035",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-035",
   "auto": false,
   "engineKind": "MMM-2-035",
   "faq": []
 },
{
   "id": "MMM-2-036",
   "identity": "MMM-2-036",
   "number": "EX16BT/MMM-2-036",
   "name": "深月菲莉西亞",
   "nameJa": "深月 フェリシア",
   "ruby": "みつき ふぇりしあ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-036",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-036",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-036.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3500,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【我方回合中】這張角色卡BP+500。",
   "effectJa": "【自分のターン中】このキャラはBP+500。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-036.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-036",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-036",
   "auto": false,
   "engineKind": "MMM-2-036",
   "faq": []
 },
{
   "id": "MMM-2-037",
   "identity": "MMM-2-037",
   "number": "EX16BT/MMM-2-037",
   "name": "深月菲莉西亞",
   "nameJa": "深月 フェリシア",
   "ruby": "みつき ふぇりしあ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-037",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-037",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-037.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1500,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，這張角色卡BP+1500。",
   "effectJa": "このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、このキャラはBP+1500。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-037.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-037",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-037",
   "auto": false,
   "engineKind": "MMM-2-037",
   "faq": []
 },
{
   "id": "MMM-2-038",
   "identity": "MMM-2-038",
   "number": "EX16BT/MMM-2-038",
   "name": "深月菲莉西亞",
   "nameJa": "深月 フェリシア",
   "ruby": "みつき ふぇりしあ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-038",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-038",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-038.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，這張角色卡BP+1000。 【攻擊時】若對手前線有角色卡，且這張角色卡BP為5000以上時，這張角色卡在這個回合中，獲得【傷害（2）】。〈深月菲莉西亞〉的這個效果每回合僅發動1次。 這張角色卡攻擊後沒有被防禦時，這張角色卡在這個回合的結束階段不會置為活動。",
   "effectJa": "このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、このキャラはBP+1000。【アタック時】相手のフロントLにキャラがあり、このキャラのBPが5000以上の場合、このキャラはこのターン中、【ダメージ（2）】を得る。〈深月 フェリシア〉のこの効果は1ターンに1回のみ発動する。このキャラのアタックがブロックされなかった時、このキャラはこのターンのエンドフェイズにアクティブにならない。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-038.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-038",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-038",
   "auto": false,
   "engineKind": "MMM-2-038",
   "faq": [
     {
       "id": "Q2356",
       "date": "2026.09.18 更新",
       "q": "「このキャラのアタックがブロックされなかった時」が条件の効果が発動するタイミングはいつですか？",
       "a": "相手の【ブロック時】が発動する時と同じ、「ブロックキャラクター指定タイミング」でブロックするか選択した後になります。"
     },
     {
       "id": "Q2357",
       "date": "2026.09.18 更新",
       "q": "このカードが自分の場に2枚ある場合、このカードの【アタック時】は同じターンにそれぞれ1回ずつ発動しますか？",
       "a": "いいえ、どちらか片方しか発動できません。"
     }
   ]
 },
{
   "id": "MMM-2-039",
   "identity": "MMM-2-039",
   "number": "EX16BT/MMM-2-039",
   "name": "由比鶴乃",
   "nameJa": "由比 鶴乃",
   "ruby": "ゆい つるの",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-039",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-039",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-039.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】選擇最多1張自己場上其他的［特徵：三日月莊小隊］，在這個回合中，BP+1000。",
   "effectJa": "【登場時】自分の場の他の［特徴：チームみかづき荘］を1枚まで選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-039.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-039",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-039",
   "auto": false,
   "engineKind": "MMM-2-039",
   "faq": []
 },
{
   "id": "MMM-2-040",
   "identity": "MMM-2-040",
   "number": "EX16BT/MMM-2-040",
   "name": "由比鶴乃",
   "nameJa": "由比 鶴乃",
   "ruby": "ゆい つるの",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-040",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-040",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-040.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【啟動主要】【轉為休息】選擇1張自己場上其他的［特徵：三日月莊小隊］，在這個回合中，BP+1000。",
   "effectJa": "【起動メイン】【レストにする】自分の場の他の［特徴：チームみかづき荘］を1枚選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-040.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-040",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-040",
   "auto": false,
   "engineKind": "MMM-2-040",
   "faq": []
 },
{
   "id": "MMM-2-041",
   "identity": "MMM-2-041",
   "number": "EX16BT/MMM-2-041",
   "name": "由比鶴乃",
   "nameJa": "由比 鶴乃",
   "ruby": "ゆい つるの",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-041",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-041",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-041.png"
     }
   ],
   "color": "green",
   "energy": 4,
   "ap": 2,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／チームみかづき荘"
   ],
   "rarity": "SR",
   "trigger": "get",
   "triggerText": "[獲得] 將這張卡片加入手牌。",
   "triggerTextJa": "【ゲット】このカードを手札に加える。",
   "effect": "這張角色卡以活動狀態在場上登場。 【登場時】這張角色卡在這個回合中，獲得【雙重攻擊】。 【攻擊時】【每回合1】若在這個回合中，自己場上已有3種以上不同卡片名稱的［特徵：三日月莊小隊］登場時，查看3張自己卡組上面的卡片，公開其中最多1張［特徵：三日月莊小隊］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。",
   "effectJa": "このキャラはアクティブで登場させる。【登場時】このキャラはこのターン中、【2回アタック】を得る。【アタック時】【ターン1】このターン中に自分の場に異なるカード名の［特徴：チームみかづき荘］が3種類以上登場している場合、自分の山札の上から3枚見て、［特徴：チームみかづき荘］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-041.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-041",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-041",
   "auto": false,
   "engineKind": "MMM-2-041",
   "faq": []
 },
{
   "id": "MMM-2-042",
   "identity": "MMM-2-042",
   "number": "EX16BT/MMM-2-042",
   "name": "阿莉娜・格雷",
   "nameJa": "アリナ・グレイ",
   "ruby": "ありな ぐれい",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-042",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-042",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-042.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "C",
   "trigger": "get",
   "triggerText": "[獲得] 將這張卡片加入手牌。",
   "triggerTextJa": "【ゲット】このカードを手札に加える。",
   "effect": "-",
   "effectJa": "-",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-042.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-042",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-042",
   "auto": false,
   "engineKind": "plain",
   "faq": []
 },
{
   "id": "MMM-2-043",
   "identity": "MMM-2-043",
   "number": "EX16BT/MMM-2-043",
   "name": "阿莉娜・格雷",
   "nameJa": "アリナ・グレイ",
   "ruby": "ありな ぐれい",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-043",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-043",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-043.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 2000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "若自己場上沒有任何卡片時，手牌中這張卡片的能源需求減少【綠×2】。 【啟動主要】【若在前線時】【每回合1】將1張自己場上其他的角色卡放置在自己卡組的上面。若有執行此動作時，這張角色卡在這個回合中，BP+2000。",
   "effectJa": "自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【緑×2】減らす。【起動メイン】【フロントLにある場合】 【ターン1】自分の場の他のキャラを1枚自分の山札の上に置く。そうした場合、このキャラはこのターン中、BP+2000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-043.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-043",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-043",
   "auto": false,
   "engineKind": "MMM-2-043",
   "faq": []
 },
{
   "id": "MMM-2-044",
   "identity": "MMM-2-044",
   "number": "EX16BT/MMM-2-044",
   "name": "阿莉娜・格雷",
   "nameJa": "アリナ・グレイ",
   "ruby": "ありな ぐれい",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-044",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-044",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-044.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 1,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "R",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【衝擊無效】（與這張角色卡對戰的角色卡在這場對戰中，失去【衝擊】） 【啟動主要】【若在前線時】【每回合1】公開1張自己卡組上面的卡片，將該張卡片放置在自己卡組的上面或場外。 【啟動主要】僅限在這個回合中有從自己卡組公開能源需求5以上的卡片時可發動。將這張角色卡置為活動。〈阿莉娜・格雷〉的這個效果每回合僅可發動1次。",
   "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【起動メイン】【フロントLにある場合】 【ターン1】自分の山札の上から1枚を公開し、山札の上か場外に置く。【起動メイン】このターン中に自分の山札から必要エナジーが5以上のカードが公開されている場合のみ発動できる。このキャラをアクティブにする。〈アリナ・グレイ〉のこの効果は1ターンに1回のみ発動できる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-044.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-044",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-044",
   "auto": false,
   "engineKind": "MMM-2-044",
   "faq": [
     {
       "id": "Q2358",
       "date": "2026.09.18 更新",
       "q": "このカードが自分の場に2枚ある場合、このカードの「【起動メイン】このターン中に自分の山札から必要エナジーが5以上のカードが公開されている場合のみ発動できる。このキャラをアクティブにする。」を同じターンにそれぞれ1回ずつ発動できますか？",
       "a": "いいえ、どちらか片方しか発動できません。"
     }
   ]
 },
{
   "id": "MMM-2-045",
   "identity": "MMM-2-045",
   "number": "EX16BT/MMM-2-045",
   "name": "阿莉娜・格雷",
   "nameJa": "アリナ・グレイ",
   "ruby": "ありな ぐれい",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-045",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-045",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-045.png"
     }
   ],
   "color": "green",
   "energy": 6,
   "ap": 1,
   "bp": 4000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "SR",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "每有2張對手前線的角色卡，這張角色卡BP+500。 【突襲】〈阿莉娜・格雷〉置為活動，並可移動至前線 【登場時】選擇最多1張對手前線的角色卡，使其移動至能源線。公開1張自己卡組上面的卡片並加入手牌。若公開卡片的能源需求為5以上時，選擇最多1張對手能源線的角色卡，並獲得「這張角色卡無法移動。」，直到下一個我方回合開始為止。",
   "effectJa": "相手のフロントLのキャラ2枚につき、このキャラはBP+500。【レイド】〈アリナ・グレイ〉アクティブにし、フロントLに移動できる【登場時】相手のフロントLのキャラを1枚まで選び、エナジーLに移動させる。自分の山札の上から1枚を公開し手札に加える。公開したカードの必要エナジーが5以上の場合、相手のエナジーLのキャラを1枚まで選び、次の自分のターン開始時まで、「このキャラは移動できない。」を与える。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-045.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-045",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-045",
   "auto": false,
   "engineKind": "MMM-2-045",
   "faq": [
     {
       "id": "Q2359",
       "date": "2026.09.18 更新",
       "q": "移動させる時にそのラインに空きがない場合どうなりますか？",
       "a": "移動させる時にそのラインに空きがない場合、カードを1枚選んでリムーブエリアに置いてから移動させます。"
     },
     {
       "id": "Q2360",
       "date": "2026.09.18 更新",
       "q": "「このキャラは移動できない。」の効果を受けたキャラがレイドした場合、移動することはできますか？",
       "a": "はい、移動できます。レイド元のカードが受けていた効果は、レイドした後残りません。"
     }
   ]
 },
{
   "id": "MMM-2-046",
   "identity": "MMM-2-046",
   "number": "EX16BT/MMM-2-046",
   "name": "里見燈花",
   "nameJa": "里見 灯花",
   "ruby": "さとみ とうか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-046",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-046",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-046.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "C",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【登場時】查看2張自己卡組上面的卡片，將其中最多1張［特徵：Magius］或［特徵：Magius之翼］放置在場外。其餘卡片依任意順序放置在自己卡組的上面。",
   "effectJa": "【登場時】自分の山札の上から2枚見て、［特徴：マギウス］か［特徴：マギウスの翼］を1枚まで場外に置く。残りを望む順で山札の上に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-046.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-046",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-046",
   "auto": false,
   "engineKind": "MMM-2-046",
   "faq": []
 },
{
   "id": "MMM-2-047",
   "identity": "MMM-2-047",
   "number": "EX16BT/MMM-2-047",
   "name": "里見燈花",
   "nameJa": "里見 灯花",
   "ruby": "さとみ とうか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-047",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-047",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-047.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 1,
   "genMark": "+",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "C",
   "trigger": "color",
   "triggerText": "[顔色] 使1張自己手牌中能源需求2以下消耗AP1的綠色角色卡以活動狀態在自己場上登場。",
   "triggerTextJa": "【カラー】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。",
   "effect": "【啟動主要】【每回合1】將1張自己的手牌放置在自己卡組的上面。若有執行此動作時，這張角色卡在這個回合中，產生能源+【綠】。",
   "effectJa": "【起動メイン】【ターン1】自分の手札を1枚自分の山札の上に置く。そうした場合、このキャラはこのターン中、発生エナジー+【緑】。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-047.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-047",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-047",
   "auto": false,
   "engineKind": "MMM-2-047",
   "faq": []
 },
{
   "id": "MMM-2-048",
   "identity": "MMM-2-048",
   "number": "EX16BT/MMM-2-048",
   "name": "里見燈花",
   "nameJa": "里見 灯花",
   "ruby": "さとみ とうか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-048",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-048",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-048.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 3000,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】查看3張自己卡組上面的卡片，並依任意順序放置在自己卡組的上面。",
   "effectJa": "【登場時】自分の山札の上から3枚見て、望む順で山札の上に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-048.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-048",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-048",
   "auto": false,
   "engineKind": "MMM-2-048",
   "faq": []
 },
{
   "id": "MMM-2-049",
   "identity": "MMM-2-049",
   "number": "EX16BT/MMM-2-049",
   "name": "里見燈花",
   "nameJa": "里見 灯花",
   "ruby": "さとみ とうか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-049",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-049",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-049.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 1,
   "bp": 4000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "SR",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "【突襲】〈里見燈花〉置為活動，並可移動至前線 這張角色卡若在前線時也可產生能源。 【登場時】抽2張卡片，並將1張自己的手牌放置在自己卡組的上面或場外。 【啟動主要】【若在前線時】【每回合1】抽1張卡片，並將1張自己的手牌放置在自己卡組的上面。",
   "effectJa": "【レイド】〈里見 灯花〉アクティブにし、フロントLに移動できるこのキャラはフロントLでもエナジーを発生させる。【登場時】カードを2枚引き、自分の手札を1枚自分の山札の上か場外に置く。【起動メイン】【フロントLにある場合】 【ターン1】カードを1枚引き、自分の手札を1枚自分の山札の上に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-049.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-049",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-049",
   "auto": false,
   "engineKind": "MMM-2-049",
   "faq": []
 },
{
   "id": "MMM-2-050",
   "identity": "MMM-2-050",
   "number": "EX16BT/MMM-2-050",
   "name": "柊音夢",
   "nameJa": "柊 ねむ",
   "ruby": "ひいらぎ ねむ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-050",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-050",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-050.png"
     }
   ],
   "color": "green",
   "energy": 1,
   "ap": 1,
   "bp": 1500,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】查看3張自己卡組上面的卡片，公開其中最多1張［特徵：Magius］或［特徵：Magius之翼］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若有加入手牌時，將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】自分の山札の上から3枚見て、［特徴：マギウス］か［特徴：マギウスの翼］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-050.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-050",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-050",
   "auto": false,
   "engineKind": "MMM-2-050",
   "faq": []
 },
{
   "id": "MMM-2-051",
   "identity": "MMM-2-051",
   "number": "EX16BT/MMM-2-051",
   "name": "柊音夢",
   "nameJa": "柊 ねむ",
   "ruby": "ひいらぎ ねむ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-051",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-051",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-051.png"
     }
   ],
   "color": "green",
   "energy": 3,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウス"
   ],
   "rarity": "R",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】【若在能源線時】可將1張自己的手牌放置在場外。若有執行此動作時，將這張角色卡置為活動。 【啟動主要】【轉為休息】【支付1AP】【每回合1】公開1張自己卡組上面的卡片並加入手牌。若公開卡片的能源需求為5以上時，在這個回合中，下一張從手牌中使用，原本能源需求為5以上的卡片，其消耗AP-1。",
   "effectJa": "【登場時】【エナジーLにある場合】自分の手札を1枚場外に置いてもよい。そうした場合、このキャラをアクティブにする。【起動メイン】【レストにする】 【APを1支払う】 【ターン1】自分の山札の上から1枚を公開し手札に加える。公開したカードの必要エナジーが5以上の場合、このターン中、次に手札から使用する元々の必要エナジーが5以上のカードの消費APを-1する。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-051.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-051",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-051",
   "auto": false,
   "engineKind": "MMM-2-051",
   "faq": []
 },
{
   "id": "MMM-2-052",
   "identity": "MMM-2-052",
   "number": "EX16BT/MMM-2-052",
   "name": "天音月咲",
   "nameJa": "天音 月咲",
   "ruby": "あまね つかさ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-052",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-052",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-052.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウスの翼"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "-",
   "effectJa": "-",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-052.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-052",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-052",
   "auto": false,
   "engineKind": "plain",
   "faq": []
 },
{
   "id": "MMM-2-053",
   "identity": "MMM-2-053",
   "number": "EX16BT/MMM-2-053",
   "name": "天音月夜",
   "nameJa": "天音 月夜",
   "ruby": "あまね つくよ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-053",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-053",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-053.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウスの翼"
   ],
   "rarity": "C",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "-",
   "effectJa": "-",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-053.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-053",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-053",
   "auto": false,
   "engineKind": "plain",
   "faq": []
 },
{
   "id": "MMM-2-054",
   "identity": "MMM-2-054",
   "number": "EX16BT/MMM-2-054",
   "name": "梓美冬",
   "nameJa": "梓 みふゆ",
   "ruby": "あずさ みふゆ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-054",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-054",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-054.png"
     }
   ],
   "color": "green",
   "energy": 2,
   "ap": 1,
   "bp": 2500,
   "bpMark": "",
   "gen": 1,
   "genMark": "+",
   "type": "character",
   "traits": [
     "魔法少女／マギウスの翼"
   ],
   "rarity": "U",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "若這張角色卡為活動時，這張角色卡的產生能源+【綠】。",
   "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【緑】。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-054.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-054",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-054",
   "auto": false,
   "engineKind": "activeEnergy",
   "faq": []
 },
{
   "id": "MMM-2-055",
   "identity": "MMM-2-055",
   "number": "EX16BT/MMM-2-055",
   "name": "梓美冬",
   "nameJa": "梓 みふゆ",
   "ruby": "あずさ みふゆ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-055",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-055",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-055.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 1,
   "bp": 3000,
   "bpMark": "+",
   "gen": 2,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウスの翼"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "我方回合中，這張卡片從自己卡組被公開時，選擇最多1張自己場上的［特徵：Magius］，在這個回合中，獲得BP+1000與【衝擊（1）】。〈梓美冬〉的這個效果每回合僅可發動1次。 手牌中這張卡片的能源需求減少【綠×2】。 【我方回合中】若自己場上有3種以上不同卡片名稱的［特徵：Magius］時，這張角色卡BP+1000。",
   "effectJa": "自分のターン中にこのカードが山札から公開された時、自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と【インパクト（1）】を与える。〈梓 みふゆ〉のこの効果は1ターンに1回のみ発動できる。手札にあるこのカードの必要エナジーを【緑×2】減らす。【自分のターン中】自分の場に異なるカード名の［特徴：マギウス］が3種類以上ある場合、このキャラはBP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-055.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-055",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-055",
   "auto": false,
   "engineKind": "MMM-2-055",
   "faq": [
     {
       "id": "Q2361",
       "date": "2026.09.18 更新",
       "q": "「MMM-2-050 柊 ねむ」の【登場時】によってこのカードを公開して手札に加えました。その場合、このカードの「自分のターン中にこのカードが山札から公開された時、自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と▼インパクト（1）▼を与える。」を発動できますか？",
       "a": "はい、発動できます。「MMM-2-050 柊 ねむ」の【登場時】の処理がすべて終わった後にこのカードの「自分のターン中にこのカードが山札から公開された時、自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と▼インパクト（1）▼を与える。」を発動できます。"
     },
     {
       "id": "Q2362",
       "date": "2026.09.18 更新",
       "q": "自分のターン中にこのカードが山札から公開され「自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と▼インパクト（1）▼を与える。」を発動させた後、同じターンに2枚目のこのカードが山札から公開された場合、2枚目のこのカードは「自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と▼インパクト（1）▼を与える。」を発動できますか？",
       "a": "いいえ、後から公開されたこのカード「自分の場の［特徴：マギウス］を1枚まで選び、このターン中、BP+1000と▼インパクト（1）▼を与える。」は発動できません。"
     }
   ]
 },
{
   "id": "MMM-2-056",
   "identity": "MMM-2-056",
   "number": "EX16BT/MMM-2-056",
   "name": "聖麻美",
   "nameJa": "ホーリーマミ",
   "ruby": "ほーりーまみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-056",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-056",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-056.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 2,
   "bp": 4000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女／マギウスの翼"
   ],
   "rarity": "SR",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "若在這個回合中有從自己卡組公開能源需求5以上的卡片時，這張角色卡獲得【傷害（2）】。 【登場時】將這張角色卡置為活動。若自己場上有3種以上不同卡片名稱的［特徵：Magius］時，從以下選擇1項。在這個回合中，〈聖麻美〉已選擇的效果無法選擇。 ・將1張自己的AP卡置為活動。這張角色卡在這個回合中，BP+1000。 ・這張角色卡在這個回合中，獲得BP+1000與【衝擊（1）】。",
   "effectJa": "このターン中に自分の山札から必要エナジーが5以上のカードが公開されている場合、このキャラは【ダメージ（2）】を得る。【登場時】このキャラをアクティブにする。自分の場に異なるカード名の［特徴：マギウス］が3種類以上ある場合、以下から1つ選ぶ。このターン中に〈ホーリーマミ〉が既に選んだ効果は選べない。・自分のAPカードを1枚アクティブにする。このキャラはこのターン中、BP+1000。・このキャラはこのターン中、BP+1000と【インパクト（1）】を得る。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-056.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-056",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-056",
   "auto": false,
   "engineKind": "MMM-2-056",
   "faq": []
 },
{
   "id": "MMM-2-057",
   "identity": "MMM-2-057",
   "number": "EX16BT/MMM-2-057",
   "name": "三日月莊小隊——！",
   "nameJa": "チームみかづき荘ー！",
   "ruby": "ちーむみかづきそうー",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-057",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-057",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-057.png"
     }
   ],
   "color": "green",
   "energy": 0,
   "ap": 1,
   "bp": 0,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "field",
   "traits": [
     "チームみかづき荘"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【啟動主要】【轉為休息】【使這張卡片退場】從自己手牌或場外，使最多1張〈三日月莊小隊——！〉以外能源需求0以下的綠色［特徵：三日月莊小隊］以休息狀態在自己場上登場。",
   "effectJa": "【起動メイン】【レストにする】 【このカードを退場させる】自分の手札か場外から〈チームみかづき荘ー！〉以外の必要エナジーが0以下の緑の［特徴：チームみかづき荘］を1枚まで自分の場にレストで登場させる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-057.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-057",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-057",
   "auto": false,
   "engineKind": "MMM-2-057",
   "faq": []
 },
{
   "id": "MMM-2-058",
   "identity": "MMM-2-058",
   "number": "EX16BT/MMM-2-058",
   "name": "回去吧，回到我們的家",
   "nameJa": "帰ろう、わたしたちの家へ",
   "ruby": "かえろう わたしたちのいえへ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-058",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-058",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-058.png"
     }
   ],
   "color": "green",
   "energy": 4,
   "ap": 1,
   "bp": 0,
   "bpMark": "",
   "gen": 0,
   "genMark": "",
   "type": "event",
   "traits": [],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "查看5張自己卡組上面的卡片。從中公開最多3張不同卡片名稱的［特徵：三日月莊小隊］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。",
   "effectJa": "自分の山札の上から5枚見て、異なるカード名の［特徴：チームみかづき荘］をそれぞれ1枚ずつ合計3枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-058.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-058",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-058",
   "auto": false,
   "engineKind": "MMM-2-058",
   "faq": []
 },
{
   "id": "MMM-2-059",
   "identity": "MMM-2-059",
   "number": "EX16BT/MMM-2-059",
   "name": "沉默的魔女化身",
   "nameJa": "沈黙のドッペル",
   "ruby": "ちんもくのどっぺる",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-059",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-059",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-059.png"
     }
   ],
   "color": "green",
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
   "triggerText": "[特別] 選擇1張對手前線的角色卡，使其退場。",
   "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
   "effect": "選擇1張對手前線『BP3000以下』的角色卡，使其退場。若自己場上有〈環彩羽〉時，則替換成『BP5000以下』。",
   "effectJa": "『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈環 いろは〉がある場合、『BP5000以下』に代わる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-059.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-059",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-059",
   "auto": false,
   "engineKind": "MMM-2-059",
   "faq": []
 },
{
   "id": "MMM-2-060",
   "identity": "MMM-2-060",
   "number": "EX16BT/MMM-2-060",
   "name": "箱庭創造者",
   "nameJa": "箱庭クリエイター",
   "ruby": "はこにわくりえいたー",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-060",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-060",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-060.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 1,
   "bp": 0,
   "bpMark": "",
   "gen": 0,
   "genMark": "",
   "type": "event",
   "traits": [],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "手牌中這張卡片的能源需求減少【綠×2】。 查看4張自己卡組上面的卡片，將最多2張加入手牌。其餘卡片依任意順序放置在自己卡組的上面。",
   "effectJa": "手札にあるこのカードの必要エナジーを【緑×2】減らす。自分の山札の上から4枚見て、2枚まで手札に加える。残りを望む順で山札の上に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-060.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-060",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-060",
   "auto": false,
   "engineKind": "MMM-2-060",
   "faq": []
 },
{
   "id": "MMM-2-061",
   "identity": "MMM-2-061",
   "number": "EX16BT/MMM-2-061",
   "name": "Marigold Dadaism",
   "nameJa": "Marigold Dadaism",
   "ruby": "まりーごーるど だだいずむ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-061",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-061",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-061.png"
     }
   ],
   "color": "green",
   "energy": 5,
   "ap": 1,
   "bp": 0,
   "bpMark": "",
   "gen": 0,
   "genMark": "",
   "type": "event",
   "traits": [],
   "rarity": "U",
   "trigger": "special",
   "triggerText": "[特別] 選擇1張對手前線的角色卡，使其退場。",
   "triggerTextJa": "【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。",
   "effect": "選擇1張對手前線BP為自己場上［特徵：Magius］與［特徵：Magius之翼］合計張數×1000以下的角色卡，使其退場。抽1張卡片，並將1張自己的手牌放置在場外。",
   "effectJa": "自分の場の［特徴：マギウス］と［特徴：マギウスの翼］の合計枚数×1000以下のBPの相手のフロントLのキャラを1枚選び、退場させる。カードを1枚引き、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-061.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-061",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-061",
   "auto": false,
   "engineKind": "MMM-2-061",
   "faq": []
 },
{
   "id": "MMM-2-062",
   "identity": "MMM-2-062",
   "number": "EX16BT/MMM-2-062",
   "name": "歡迎來到八雲偵探事務所",
   "nameJa": "八雲探偵事務所へようこそ",
   "ruby": "やくもたんていじむしょへようこそ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-062",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-062",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-062.png"
     }
   ],
   "color": "green",
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
   "triggerText": "[最終] 若自己沒有生命卡時，將1張自己卡組上面的卡片放置在自己的生命區。",
   "triggerTextJa": "【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。",
   "effect": "選擇最多2張自己的AP卡，置為活動。",
   "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-062.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-062",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-062",
   "auto": false,
   "engineKind": "recoverAp2",
   "faq": []
 },
{
   "id": "MMM-2-063",
   "identity": "MMM-2-063",
   "number": "EX16BT/MMM-2-063",
   "name": "曉美焰",
   "nameJa": "暁美 ほむら",
   "ruby": "あけみ ほむら",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-063",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-063",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-063.png"
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
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【登場時】可將1張自己的手牌放置在場外。若有執行此動作時，查看1張自己卡組上面的卡片，將該張卡片放置在自己卡組的上面或下面，並抽1張卡片。",
   "effectJa": "【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-063.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-063",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-063",
   "auto": false,
   "engineKind": "MMM-2-063",
   "faq": []
 },
{
   "id": "MMM-2-064",
   "identity": "MMM-2-064",
   "number": "EX16BT/MMM-2-064",
   "name": "鹿目圓",
   "nameJa": "鹿目 まどか",
   "ruby": "かなめ まどか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-064",
       "set": "EX16BT",
       "rarity": "U",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-064",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-064.png"
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
     "魔法少女"
   ],
   "rarity": "U",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "-",
   "effectJa": "-",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-064.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-064",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-064",
   "auto": false,
   "engineKind": "plain",
   "faq": []
 },
{
   "id": "MMM-2-065",
   "identity": "MMM-2-065",
   "number": "EX16BT/MMM-2-065",
   "name": "佐倉杏子",
   "nameJa": "佐倉 杏子",
   "ruby": "さくら きょうこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-065",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-065",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-065.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【雙重防禦】（這張角色卡在這個回合的第一次防禦時置為活動） 【登場時】若自己在這個回合中已將生命區的卡片加入手牌時，抽1張卡片。",
   "effectJa": "【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）【登場時】このターン中に自分がライフエリアにあるカードを手札に加えている場合、カードを1枚引く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-065.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-065",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-065",
   "auto": false,
   "engineKind": "MMM-2-065",
   "faq": []
 },
{
   "id": "MMM-2-066",
   "identity": "MMM-2-066",
   "number": "EX16BT/MMM-2-066",
   "name": "佐倉杏子",
   "nameJa": "佐倉 杏子",
   "ruby": "さくら きょうこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-066",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-066",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-066.png"
     }
   ],
   "color": "red",
   "energy": 1,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "R",
   "trigger": null,
   "triggerText": "-",
   "triggerTextJa": "-",
   "effect": "【登場時】查看4張自己卡組上面的卡片，公開其中最多1張〈佐倉杏子〉或〈美樹沙耶香〉並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若有加入手牌時，將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】自分の山札の上から4枚見て、〈佐倉 杏子〉か〈美樹 さやか〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-066.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-066",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-066",
   "auto": false,
   "engineKind": "MMM-2-066",
   "faq": []
 },
{
   "id": "MMM-2-067",
   "identity": "MMM-2-067",
   "number": "EX16BT/MMM-2-067",
   "name": "佐倉杏子",
   "nameJa": "佐倉 杏子",
   "ruby": "さくら きょうこ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-067",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-067",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-067.png"
     }
   ],
   "color": "red",
   "energy": 2,
   "ap": 1,
   "bp": 2000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "SR",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "若自己場上沒有任何卡片時，手牌中這張卡片的能源需求減少【紅×2】。 【我方回合中】若自己場上除這張卡片以外的［特徵：魔法少女］有4種以上不同卡片名稱，或自己在這個回合中已將生命區的卡片加入手牌時，這張角色卡BP+1000。 這張角色卡被突襲時，選擇最多1張自己場上的角色卡，在這個回合中，獲得「這張角色卡攻擊後沒有被防禦時，抽最多1張卡片。」。",
   "effectJa": "自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【赤×2】減らす。【自分のターン中】このカード以外の自分の場の［特徴：魔法少女］のカード名が4種類以上あるか、このターン中に自分がライフエリアにあるカードを手札に加えている場合、このキャラはBP+1000。このキャラがレイドされた時、自分の場のキャラを1枚まで選び、このターン中、「このキャラのアタックがブロックされなかった時、カードを1枚まで引く。」を与える。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-067.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-067",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-067",
   "auto": false,
   "engineKind": "MMM-2-067",
   "faq": [
     {
       "id": "Q2363",
       "date": "2026.09.18 更新",
       "q": "「このキャラのアタックがブロックされなかった時」が条件の効果が発動するタイミングはいつですか？",
       "a": "相手の【ブロック時】が発動する時と同じ、「ブロックキャラクター指定タイミング」でブロックするか選択した後になります。"
     }
   ]
 },
{
   "id": "MMM-2-068",
   "identity": "MMM-2-068",
   "number": "EX16BT/MMM-2-068",
   "name": "巴麻美",
   "nameJa": "巴 マミ",
   "ruby": "ともえ まみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-068",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-068",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-068.png"
     }
   ],
   "color": "red",
   "energy": 1,
   "ap": 1,
   "bp": 2000,
   "bpMark": "",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【登場時】抽1張卡片，並將1張自己的手牌放置在場外。",
   "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-068.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-068",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-068",
   "auto": false,
   "engineKind": "drawDiscard",
   "faq": []
 },
{
   "id": "MMM-2-069",
   "identity": "MMM-2-069",
   "number": "EX16BT/MMM-2-069",
   "name": "巴麻美",
   "nameJa": "巴 マミ",
   "ruby": "ともえ まみ",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-069",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-069",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-069.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "R",
   "trigger": "raid",
   "triggerText": "[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。",
   "triggerTextJa": "【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。",
   "effect": "【突襲】〈巴麻美〉置為活動，並可移動至前線 【登場時】查看4張自己卡組上面的卡片，公開其中最多1張［特徵：魔法少女］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。 【退場時】若自己場上除這張卡片以外的［特徵：魔法少女］有4種以上不同卡片名稱時，可發動這張卡片的【登場時】。",
   "effectJa": "【レイド】〈巴 マミ〉アクティブにし、フロントLに移動できる【登場時】自分の山札の上から4枚見て、［特徴：魔法少女］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。【退場時】このカード以外の自分の場の［特徴：魔法少女］のカード名が4種類以上ある場合、このカードの【登場時】を発動してもよい。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-069.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-069",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-069",
   "auto": false,
   "engineKind": "MMM-2-069",
   "faq": []
 },
{
   "id": "MMM-2-070",
   "identity": "MMM-2-070",
   "number": "EX16BT/MMM-2-070",
   "name": "美樹沙耶香",
   "nameJa": "美樹 さやか",
   "ruby": "みき さやか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-070",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-070",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-070.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "【啟動主要】【轉為休息】僅限自己在這個回合中已將生命區的卡片加入手牌時可發動。抽1張卡片。將這張角色卡以正面朝上放置在自己的生命區。〈美樹沙耶香〉的這個效果每回合僅可發動1次。",
   "effectJa": "【起動メイン】【レストにする】このターン中に自分がライフエリアにあるカードを手札に加えている場合のみ発動できる。カードを1枚引く。このキャラを自分のライフエリアに表向きで置く。〈美樹 さやか〉のこの効果は1ターンに1回のみ発動できる。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-070.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-070",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-070",
   "auto": false,
   "engineKind": "MMM-2-070",
   "faq": [
     {
       "id": "Q2364",
       "date": "2026.09.18 更新",
       "q": "ライフエリアに表向きで置かれたライフのトリガーはトリガーチェック時に発動することはできますか？",
       "a": "はい、裏向きで置かれたライフのトリガーチェックと同様に発動できます。"
     },
     {
       "id": "Q2365",
       "date": "2026.09.18 更新",
       "q": "このカードの【起動メイン】を発動させた後、同じターンに2枚目のこのカードは【起動メイン】を発動できますか？",
       "a": "いいえ、2枚目のこのカードは発動できません。"
     },
     {
       "id": "Q2366",
       "date": "2026.09.18 更新",
       "q": "対戦相手はライフエリアに表向きで置かれたカードを確認することができますか？",
       "a": "はい、確認できます。ライフエリアに表向きで置かれたカードは公開情報です。"
     }
   ]
 },
{
   "id": "MMM-2-071",
   "identity": "MMM-2-071",
   "number": "EX16BT/MMM-2-071",
   "name": "美樹沙耶香",
   "nameJa": "美樹 さやか",
   "ruby": "みき さやか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-071",
       "set": "EX16BT",
       "rarity": "R",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-071",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-071.png"
     }
   ],
   "color": "red",
   "energy": 0,
   "ap": 1,
   "bp": 2000,
   "bpMark": "+",
   "gen": 1,
   "genMark": "",
   "type": "character",
   "traits": [
     "魔法少女"
   ],
   "rarity": "R",
   "trigger": "active",
   "triggerText": "[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。",
   "triggerTextJa": "【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。",
   "effect": "【啟動主要】【每回合1】將1張自己生命區的卡片加入手牌。若有執行此動作時，這張角色卡在這個回合中，BP+2000。",
   "effectJa": "【起動メイン】【ターン1】自分のライフエリアにあるカードを1枚手札に加える。そうした場合、このキャラはこのターン中、BP+2000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-071.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-071",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-071",
   "auto": false,
   "engineKind": "MMM-2-071",
   "faq": [
     {
       "id": "Q2367",
       "date": "2026.09.18 更新",
       "q": "「自分のライフエリアにあるカードを1枚手札に加える。」でカードを手札に加える際に公開しますか。またトリガーチェックはしますか？",
       "a": "いいえ、公開せず手札に加えます。トリガーチェックもしません。"
     },
     {
       "id": "Q2368",
       "date": "2026.09.18 更新",
       "q": "「自分のライフエリアにあるカードを1枚手札に加える。」の効果で自分のライフが0枚になった場合、敗北しますか？",
       "a": "はい、このカードの効果を処理した後に敗北します。"
     }
   ]
 },
{
   "id": "MMM-2-072",
   "identity": "MMM-2-072",
   "number": "EX16BT/MMM-2-072",
   "name": "美樹沙耶香",
   "nameJa": "美樹 さやか",
   "ruby": "みき さやか",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-072",
       "set": "EX16BT",
       "rarity": "SR",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-072",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-072.png"
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
   "traits": [
     "魔法少女"
   ],
   "rarity": "SR",
   "trigger": "get",
   "triggerText": "[獲得] 將這張卡片加入手牌。",
   "triggerTextJa": "【ゲット】このカードを手札に加える。",
   "effect": "【啟動主要】【每回合1】從以下選擇最多2項。 ・這張角色卡在這個回合中，BP+1000。 ・若自己場上除這張卡片以外的［特徵：魔法少女］有4種以上不同卡片名稱，或自己在這個回合中已將生命區的卡片加入手牌時，選擇1張自己場上其他的角色卡，在這個回合中，BP+1000。",
   "effectJa": "【起動メイン】【ターン1】以下から2つまで選ぶ。・このキャラはこのターン中、BP+1000。・このカード以外の自分の場の［特徴：魔法少女］のカード名が4種類以上あるか、このターン中に自分がライフエリアにあるカードを手札に加えている場合、自分の場の他のキャラを1枚選び、このターン中、BP+1000。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-072.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-072",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-072",
   "auto": false,
   "engineKind": "MMM-2-072",
   "faq": [
     {
       "id": "Q2369",
       "date": "2026.09.18 更新",
       "q": "以下から2つ選ぶ場合、同じ効果を2回選ぶことはできますか？",
       "a": "いいえ、できません。"
     },
     {
       "id": "Q2370",
       "date": "2026.09.18 更新",
       "q": "2つ選んだ場合、望む順で処理を行うことができますか？",
       "a": "いいえ、できません。上にある効果から処理を行います。"
     }
   ]
 },
{
   "id": "MMM-2-073",
   "identity": "MMM-2-073",
   "number": "EX16BT/MMM-2-073",
   "name": "懷抱各自的心意",
   "nameJa": "それぞれの想いを胸に",
   "ruby": "それぞれのおもいをむねに",
   "title": "madoka",
   "set": "EX16BT",
   "sets": [
     "EX16BT"
   ],
   "printings": [
     {
       "number": "EX16BT/MMM-2-073",
       "set": "EX16BT",
       "rarity": "C",
       "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-073",
       "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-073.png"
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
   "traits": [],
   "rarity": "C",
   "trigger": "draw",
   "triggerText": "[抽卡] 抽1張卡片。",
   "triggerTextJa": "【ドロー】カードを1枚引く。",
   "effect": "〈懷抱各自的心意〉在1個回合中只能使用1張。 抽1張卡片。選擇最多1張自己場上的［特徵：魔法少女］，在這個回合中，BP+2000。若選擇的角色卡為〈鹿目圓〉時，在這個回合中，再獲得【衝擊（1）】。若自己場上的［特徵：魔法少女］有5種以上不同卡片名稱時，將1張自己的AP卡置為活動。",
   "effectJa": "〈それぞれの想いを胸に〉は1ターンに1枚のみ使用できる。カードを1枚引く。自分の場の［特徴：魔法少女］を1枚まで選び、このターン中、BP+2000。選んだキャラが〈鹿目 まどか〉の場合、さらにこのターン中、【インパクト（1）】を与える。自分の場の［特徴：魔法少女］のカード名が5種類以上ある場合、自分のAPカードを1枚アクティブにする。",
   "image": "https://www.unionarena-tcg.com/jp/images/cardlist/card/EX16BT_MMM-2-073.png",
   "source": "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-073",
   "sourceTc": "https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX16BT%2FMMM-2-073",
   "auto": false,
   "engineKind": "MMM-2-073",
   "faq": [
     {
       "id": "Q2371",
       "date": "2026.09.18 更新",
       "q": "選んだキャラが〈鹿目 まどか〉でなく、自分の場の［特徴：魔法少女］のカード名が5種類以上ある場合、「自分のAPカードを1枚アクティブにする」はできますか？",
       "a": "はい、できます。"
     }
   ]
 }
];
export const EXEDRA_BY_ID=Object.freeze(Object.fromEntries(EXEDRA_CARDS.map(c=>[c.id,c])));
