// D group owns this file. The official product page says the starter is a
// 50-card deck of 18 kinds, plus 3 copies of one AP card, plus four new-text
// R cards. It does not publish the per-card copy counts, so this loader
// refuses to build a 50-card list. Rechecked 2026-11-12: the product page,
// the series 570055 card list, and the Bandai catalog still have no counts.
import {IMC_PROMO_IDS,IMC_STARTER,IMC_STARTER_DECK_IDS} from './product.mjs';
import {imcCatalog} from './catalog.mjs';

export function loadImcOfficialStarter(){
 const catalog=imcCatalog();
 const kinds=IMC_STARTER_DECK_IDS.map(id=>{
  const card=catalog.byId.get(id);
  if(!card)throw Error('Starter kind is not in the catalog '+id);
  return {id,number:card.number,name:card.nameJa,set:card.set};
 });
 const reprints=kinds.filter(card=>card.set==='UA55BT');
 const exclusive=kinds.filter(card=>card.set==='UA55ST');
 if(kinds.length!==IMC_STARTER.deckKinds)throw Error('Starter kind count drifted');
 if(reprints.length+exclusive.length!==IMC_STARTER.deckKinds)
  throw Error('Starter kinds were not split');
 return {
  ready:false,
  counts:null,
  deckCards:IMC_STARTER.deckCards,
  kinds,
  reprints:reprints.map(card=>card.id),
  exclusive:exclusive.map(card=>card.id),
  promo:IMC_PROMO_IDS.map(id=>{
   const card=catalog.byId.get(id);
   return {id,number:card.number,name:card.nameJa,color:card.color,rarity:card.rarity};
  }),
  ap:{id:IMC_STARTER.apId,copies:IMC_STARTER.apCopies,set:'UA55ST',deckLegal:false},
  countSearch:{
   date:'2026-11-12',
   found:false,
   sources:[
    IMC_STARTER.url,
    IMC_STARTER.list,
    'https://www.bandai.co.jp/catalog/item.php?jan_cd=4582770012507000'
   ]
  },
  reason:'官方商品頁公布 50 張、18 種與 AP 3 張，卡表有這 18 個編號。2026-11-12 再查商品頁、series 570055 卡表與萬代目錄，仍沒有每一種的張數，所以不組成 50 張牌組。'
 };
}
