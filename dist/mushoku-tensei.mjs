// UA54BT catalogue: 80 numbered effect cards + 12 non-deck AP cards.
// Unverified fields remain null; these placeholders are not playable nor fabricated.
export const UA54BT_PRODUCT='https://www.unionarena-tcg.com/jp/products/boosters/mst-1.php';
export const UA54BT_CARDLIST='https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570154';
const numberOf=n=>'UA54BT/MST-1-'+String(n).padStart(3,'0');
const official=n=>'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(numberOf(n));
const pending=n=>({id:'MST-1-'+String(n).padStart(3,'0'),identity:'MST-1-'+String(n).padStart(3,'0'),number:numberOf(n),title:'mushoku-tensei',name:'待核對卡片 '+String(n).padStart(3,'0'),nameJa:null,color:null,energy:null,ap:null,bp:null,gen:null,type:null,traits:[],rarity:null,trigger:null,effect:null,auto:false,verified:false,reason:'官方卡面與 FAQ 尚未逐項核對；禁止用於自動對戰。',variants:[],image:null,source:official(n)});
const VERIFIED={
 25:{name:'ルーデウス',nameJa:'ルーデウス',color:'blue',energy:4,ap:1,bp:4000,gen:1,type:'character',traits:[],rarity:'R',trigger:'raid',effect:'レイド〈ルーデウス〉。登場時：自分の場のキャラを1枚まで選び、このターン中BP+1000。起動メイン（フロントL、ターン1）：このキャラの登場時を発動する、またはレイド状態の〈エリス〉に狙い撃ちを与え、このキャラのレイド頂卡を場外に置く。',reason:'Q2148～Q2151：頂卡離場時，底板留場、繼承 REST/ACTIVE，不重發登場效果且失去頂卡所受效果。',source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-025'},
 73:{name:'ルーデウス',nameJa:'ルーデウス',color:'green',energy:4,ap:1,bp:4000,gen:3,type:'character',traits:['ラノア魔法大学'],rarity:'R',trigger:'get',effect:'エナジーLに登場・移動できず、自分の効果以外でアクティブにならない。起動メイン（発生エナジー7以上）：このキャラをアクティブ、1枚引く、任意の自分の場のキャラBP+2000（ターン中）、このキャラがアタックフェイズ終了時アクティブになる能力を得る。〈ルーデウス〉のこの効果はターンに1回。',reason:'Q2164/Q2165/Q2208：同名限制跨卡共用，已 ACTIVE 仍可發動。',source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-073'},
 7:{name:'エリス',nameJa:'エリス',color:'blue',energy:1,ap:1,bp:2000,gen:1,type:'character',traits:[],rarity:'SR',trigger:null,effect:'登場時：1つ選ぶ。1枚引き手札1枚を場外に置く。自分の効果で登場した場合、必要エナジー3以下・消費AP1の青の〈ルーデウス〉〈エリス〉〈ルイジェルド〉を手札から1枚までレストで登場またはレイド。後者は〈エリス〉で1ターン1回のみ選択可能。'},
 9:{name:'エリス',nameJa:'エリス',color:'blue',energy:3,ap:1,bp:3500,gen:1,type:'character',traits:[],rarity:'SR',trigger:'raid',effect:'レイド〈エリス〉、インパクト（1）。自分のターン中BP+500。自分の効果で登場した場合、登場時に次の自分のターン開始までBP+1000、またはアタック終了時エナジーLのキャラ1枚と位置交換できる能力をターン終了まで得る。'},
 26:{name:'ルーデウス',nameJa:'ルーデウス',color:'blue',energy:3,ap:1,bp:4000,gen:2,type:'character',rarity:'SR',trigger:'get',effect:'このカードはフロントLに登場できず、自分の効果以外で移動できない。アタック時：以下から1つ選ぶ。自分の場の他のキャラを1枚まで選びBP+1000／カードを1枚引く／このターン中に〈豪雷積層雲〉を使用している場合インパクト（1）を得る。'},
 31:{name:'ロキシー',nameJa:'ロキシー',color:'blue',energy:4,ap:1,bp:4000,gen:1,type:'character',rarity:'R',trigger:'raid',effect:'レイド〈ロキシー〉。インパクト無効。自分のターン中、イベントカードを使用している場合インパクト（1）。登場時、次に手札から使用する必要エナジー3以下のイベントカードの消費APを-1。'},
 35:{name:'お前は戦士だ',nameJa:'お前は戦士だ',color:'blue',energy:4,ap:1,bp:0,gen:0,type:'event',rarity:'C',trigger:'draw',effect:'以下から3つまで選ぶ。自分の場に〈ルーデウス〉がある場合1枚引く／〈エリス〉がある場合1枚引く／〈ルイジェルド〉がある場合1枚引く。'},
 62:{name:'ナナホシ',nameJa:'ナナホシ',color:'green',energy:3,ap:1,bp:2000,gen:2,type:'character',traits:['ラノア魔法大学'],rarity:'SR',trigger:'color',effect:'登場時、以下から1つ選ぶ。〈ナナホシ〉以外の自分の場のキャラを1枚手札に戻してもよい。そうした場合、次に手札から使用する元々の発生エナジー2以上のキャラの消費AP-1／カードを1枚引く。'},
 67:{name:'フィッツ',nameJa:'フィッツ',color:'green',energy:4,ap:1,bp:4000,gen:1,type:'character',traits:['ラノア魔法大学'],rarity:'R',trigger:'raid',effect:'〈シルフィエット〉としても扱う。レイド〈シルフィエット〉。登場時、元々の発生エナジー1以上の自分の［特徴：ラノア魔法大学］を1枚まで選び、次の自分のターン開始時まで相手の効果で選ばれない。退場時、このキャラのレイド元1枚までをレストで登場させるか手札に加える。'},
 1:{name:'エリス',nameJa:'エリス',color:'blue',energy:0,ap:1,bp:1500,gen:1,type:'character',rarity:'C',trigger:'get',effect:'-',triggerEffect:'このカードを手札に加える。'},
 40:{name:'私がついていますから',nameJa:'私がついていますから',color:'blue',energy:2,ap:1,bp:0,gen:0,type:'event',rarity:'C',trigger:'color',effect:'このカードは自分の場に〈ロキシー〉がある場合のみ使用できる。自分の手札から必要エナジーを満たし消費APが1の青の〔〈ルーデウス〉か〈ロキシー〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。カードを1枚引く。自分の場の〈ルーデウス〉を1枚まで選び、別のラインに移動させる。',triggerEffect:'BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。'},
 55:{name:'アリエル',nameJa:'アリエル',color:'green',energy:1,ap:1,bp:2000,gen:1,type:'character',traits:['ラノア魔法大学'],rarity:'R',trigger:'draw',effect:'登場時：自分の山札の上から3枚見て、［特徴：ラノア魔法大学］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'}
};
export const UA54BT_VERIFIED=Array.from({length:80},(_,i)=>{const n=i+1,entry=pending(n);return VERIFIED[n]?{...entry,...VERIFIED[n],verified:true,reason:'部分欄位已核對；翻譯、判定與卡圖待逐項驗證。'}:entry;});

export const UA54BT_DATA_STATUS={expectedRegularCards:80,parallelArtExcluded:true,apArtExcluded:true,engineReady:0};
