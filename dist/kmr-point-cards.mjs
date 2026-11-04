// Kamen Rider action-point cards. These are the three cards a player brings
// beside the 50-card deck. They are not deck identities.
//
// Rugia (rugiacreation.com) lists every printing below as 「AP卡」. The twelve
// booster normals also exist on the official card list. Their official name is
// アクションポイントカード(仮面ライダー). The official Traditional Chinese page
// for EX12BT prints 行動值卡(假面騎士). Set 1 has no official TC page; the
// Japanese name is the same, so the same Traditional Chinese name is used.
// None of these cards print an effect. The pictured rider is the title on the
// illustration, kept so sixteen identical names stay distinguishable. It is
// not a rules text and it does not add an ability.
//
// Images are loaded from Rugia. No image bytes are stored in this repository.
// The copyright in the printed artwork belongs to BANDAI.
// Registration is not an official FAQ certification.
export const KMR_POINT_FETCHED='2026-11-04';
export const KMR_POINT_ART_CREDIT='卡圖：路基亞（rugiacreation.com）；卡圖著作權屬 BANDAI';
export const KMR_POINT_SOURCE='https://rugiacreation.com/ua/deckEdit?Version=KMR';
const RUGIA='https://rugiacreation.com/ua/cardlist/small/';
const ART_VERSION='?v=20261030';
const OFFICIAL_NAME='行動值卡(假面騎士)';
const OFFICIAL_NAME_JA='アクションポイントカード(仮面ライダー)';

function officialPage(set, number){
 const card=encodeURIComponent(set+'/'+number);
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+card;
}

function point(entry){
 return Object.freeze({
  id:entry.id,
  number:entry.number,
  name:'行動值卡・'+entry.pictured,
  officialName:OFFICIAL_NAME,
  nameJa:OFFICIAL_NAME_JA,
  pictured:entry.pictured,
  type:'action-point',
  effect:'',
  effectJa:'',
  set:entry.set,
  rarity:entry.rarity||'',
  illustration:entry.illustration,
  image:RUGIA+entry.file+'.jpg'+ART_VERSION,
  source:KMR_POINT_SOURCE,
  officialSource:entry.officialSource||'',
  artCredit:KMR_POINT_ART_CREDIT,
  deckCard:false
 });
}

// Order is the default bring order: the first three of a pack's list are the
// cards a match uses when the player has not chosen a trio.
const ENTRIES=[
 {id:'KMR-1-AP01',number:'UA29BT/KMR-1-AP01',set:'UA29BT',file:'UA29BT_KMR-1-AP01',illustration:'N',pictured:'ZI-O',officialSource:officialPage('UA29BT','KMR-1-AP01')},
 {id:'KMR-1-AP02',number:'UA29BT/KMR-1-AP02',set:'UA29BT',file:'UA29BT_KMR-1-AP02',illustration:'N',pictured:'ZERO-ONE',officialSource:officialPage('UA29BT','KMR-1-AP02')},
 {id:'KMR-1-AP03',number:'UA29BT/KMR-1-AP03',set:'UA29BT',file:'UA29BT_KMR-1-AP03',illustration:'N',pictured:'EX-AID',officialSource:officialPage('UA29BT','KMR-1-AP03')},
 {id:'KMR-1-AP04',number:'UA29BT/KMR-1-AP04',set:'UA29BT',file:'UA29BT_KMR-1-AP04',illustration:'N',pictured:'OOO',officialSource:officialPage('UA29BT','KMR-1-AP04')},
 {id:'KMR-1-AP05',number:'UA29BT/KMR-1-AP05',set:'UA29BT',file:'UA29BT_KMR-1-AP05',illustration:'N',pictured:'電王',officialSource:officialPage('UA29BT','KMR-1-AP05')},
 {id:'KMR-1-AP06',number:'UA29BT/KMR-1-AP06',set:'UA29BT',file:'UA29BT_KMR-1-AP06',illustration:'N',pictured:'FAIZ',officialSource:officialPage('UA29BT','KMR-1-AP06')},
 {id:'KMR-1-AP01-st',number:'UA29ST/KMR-1-AP01',set:'UA29ST',file:'UA29ST_KMR-1-AP01',illustration:'N',pictured:'ZERO-ONE 預組'},
 {id:'KMR-1-AP01-star',number:'UA29BT/KMR-1-AP01★',set:'UA29BT',file:'UA29BT_KMR-1-AP01_2',illustration:'P',rarity:'★',pictured:'ZI-O★'},
 {id:'KMR-2-AP01',number:'EX12BT/KMR-2-AP01',set:'EX12BT',file:'EX12BT_KMR-2-AP01',illustration:'N',pictured:'GAVV',officialSource:officialPage('EX12BT','KMR-2-AP01')},
 {id:'KMR-2-AP02',number:'EX12BT/KMR-2-AP02',set:'EX12BT',file:'EX12BT_KMR-2-AP02',illustration:'N',pictured:'FOURZE',officialSource:officialPage('EX12BT','KMR-2-AP02')},
 {id:'KMR-2-AP03',number:'EX12BT/KMR-2-AP03',set:'EX12BT',file:'EX12BT_KMR-2-AP03',illustration:'N',pictured:'W',officialSource:officialPage('EX12BT','KMR-2-AP03')},
 {id:'KMR-2-AP04',number:'EX12BT/KMR-2-AP04',set:'EX12BT',file:'EX12BT_KMR-2-AP04',illustration:'N',pictured:'DECADE',officialSource:officialPage('EX12BT','KMR-2-AP04')},
 {id:'KMR-2-AP05',number:'EX12BT/KMR-2-AP05',set:'EX12BT',file:'EX12BT_KMR-2-AP05',illustration:'N',pictured:'龍騎',officialSource:officialPage('EX12BT','KMR-2-AP05')},
 {id:'KMR-2-AP06',number:'EX12BT/KMR-2-AP06',set:'EX12BT',file:'EX12BT_KMR-2-AP06',illustration:'N',pictured:'集合',officialSource:officialPage('EX12BT','KMR-2-AP06')},
 {id:'KMR-2-AP01-star',number:'EX12BT/KMR-2-AP01★',set:'EX12BT',file:'EX12BT_KMR-2-AP01_2',illustration:'P',rarity:'★',pictured:'GAVV★'},
 {id:'KMR-AP01',number:'UAPB/KMR-AP01',set:'UAPB',file:'UAPB_KMR-AP01',illustration:'N',pictured:'集合 Fest',officialSource:'https://www.unionarena-tcg.com/tc/products/other/bcgfest24-25_spset/kmr.php'}
];

export const KMR_POINT_CARDS=Object.freeze(ENTRIES.map(point));

export function kmrPointCardsFor(scope){
 const sets=scope==='battle'?null:new Set(['UA29BT','UA29ST']);
 return Object.freeze(KMR_POINT_CARDS.filter(card=>!sets||sets.has(card.set)));
}
