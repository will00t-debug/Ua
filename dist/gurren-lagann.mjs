// Verified, non-playable UA56BT catalogue entries. Do not merge into BLEACH CARDS until game rules are implemented.
export const TITLE_ID='gurren-lagann';
export const PRODUCT='UA56BT';
export const SOURCE='https://www.unionarena-tcg.com/jp/cardlist/';
export const UA56BT_VERIFIED=[
 {id:'TTG-1-001',number:'UA56BT/TTG-1-001',identity:'TTG-1-001',title:TITLE_ID,name:'ヴィラル',nameJa:'ヴィラル',color:'green',energy:0,ap:1,bp:2000,gen:1,type:'character',traits:['大グレン団'],rarity:'C',trigger:null,effect:'登場時：自分の山札の上から1枚見て、山札の上か場外に置く。',auto:false,reason:'Unimplemented top-deck look and optional ordering.',variants:[],image:null,source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-001'},
 {id:'TTG-1-081',number:'UA56BT/TTG-1-081',identity:'TTG-1-081',title:TITLE_ID,name:'ギガドリルブレイク',nameJa:'ギガドリルブレイク',color:'red',energy:4,ap:1,bp:0,gen:0,type:'event',traits:[],rarity:'U',trigger:'special',effect:'BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場か自分のキャラのレイド元に〈シモン〉か〈カミナ〉がある場合、BP5000以下に代わる。',auto:false,reason:'Corrected erratum verified but event/trigger not wired to shared engine.',variants:[],image:null,source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-081',errata:'https://www.unionarena-tcg.com/tc/news/033.php'}
];
export const UA56BT_BY_NUMBER=Object.fromEntries(UA56BT_VERIFIED.map(card=>[card.number,card]));
export function isEligibleGigaDrillTarget({line,bp}){return line==='front'&&Number.isFinite(bp)&&bp<=3000;}
export function gigaDrillLimit(hasSimonOrKamina){return hasSimonOrKamina?5000:3000;}
export function gigaDrillTargets(candidates,{hasSimonOrKamina=false}={}){const limit=gigaDrillLimit(hasSimonOrKamina);return candidates.filter(c=>c.owner==='opponent'&&c.line==='front'&&Number.isFinite(c.bp)&&c.bp<=limit);}
