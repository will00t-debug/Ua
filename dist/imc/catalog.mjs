// Merges the three card ranges, starter-only cards, AP cards, and UA55ST
// reprint printings. A catalog row is official print data. It is not a
// battle card and it is not an audit pass.
import {IMC_CARDS_001_050} from './cards-001-050.mjs';
import {IMC_CARDS_051_100} from './cards-051-100.mjs';
import {IMC_CARDS_STARTER} from './cards-starter.mjs';
import {IMC_AP_CARDS} from './cards-ap.mjs';
import {IMC_REPRINT_CHECKS,IMC_STARTER_PRINTINGS} from './starter-printings.mjs';
import {IMC_BOOSTER,IMC_PROMO_IDS,IMC_STARTER_DECK_IDS} from './product.mjs';

const COLORS=new Set(['purple','yellow','green','blue','red']);
const DECK_TYPES=new Set(['character','event','field']);
const OFFICIAL_IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
const OFFICIAL_PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';

function serial(id){
 const match=/^IMC-1-(\d{3})$/.exec(id);
 return match?Number(match[1]):null;
}
function printingId(number){
 const id=String(number||'').split('/')[1]||'';
 return id.replace(/_p\d+$/,'');
}
function requireOfficial(card){
 if(card.battleReady!==false)throw Error(card.id+' is marked battle-ready in the catalog');
 if(card.auto!==false)throw Error(card.id+' is marked auto');
 if('engineKind' in card||card.playable===true)
  throw Error(card.id+' cannot be marked implemented in the catalog');
 if(card.title!=='imc')throw Error(card.id+' is not an IMC catalog row');
 if(!card.image.startsWith(OFFICIAL_IMAGE))throw Error(card.id+' image is not an official card image');
 if(!card.source.startsWith(OFFICIAL_PAGE))throw Error(card.id+' source is not an official card page');
 if(card.type==='action-point'){
  if(card.effect!==''||card.effectJa!=='-')throw Error(card.id+' action-point card has rules text');
 }else{
  if(typeof card.effectJa!=='string'||!card.effectJa)throw Error(card.id+' has no Japanese effect text');
  if(typeof card.effect!=='string'||!card.effect)throw Error(card.id+' has no effect text');
 }
 if(typeof card.nameJa!=='string'||!card.nameJa)throw Error(card.id+' has no Japanese name');
 if(!Array.isArray(card.traits))throw Error(card.id+' traits are not a list');
 if(card.traitComponents){
  if(card.traits.length!==1||
   card.traits[0].split('／').map(part=>part.trim()).join('／')!==card.traitComponents.join('／'))
   throw Error(card.id+' trait components do not match the printed trait');
 }
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>30)throw Error(card.id+' bad energy');
 if(!Number.isInteger(card.ap)||card.ap<0||card.ap>3)throw Error(card.id+' bad AP');
 if(!Number.isInteger(card.bp)||card.bp<0||card.bp>20000)throw Error(card.id+' bad BP');
}

function validateGroup(card,group){
 requireOfficial(card);
 const n=serial(card.id);
 if(group==='001-050'){
  if(n==null||n<1||n>50||card.set!=='UA55BT'||card.deckLegal!==true)
   throw Error(card.id+' is outside B');
 }else if(group==='051-100'){
  if(n==null||n<51||n>100||card.set!=='UA55BT'||card.deckLegal!==true)
   throw Error(card.id+' is outside C');
 }else if(group==='starter'){
  if(n==null||n<101||n>113||card.set!=='UA55ST'||card.deckLegal!==true)
   throw Error(card.id+' is outside the starter-only range');
 }else if(group==='ap'){
  if(!/^IMC-1-AP\d{2}$/.test(card.id)||card.deckLegal!==false||card.type!=='action-point')
   throw Error(card.id+' is not an AP card');
 }
 if(group!=='ap'){
  if(!DECK_TYPES.has(card.type))throw Error(card.id+' has a bad card type');
  if(!COLORS.has(card.color))throw Error(card.id+' has no color');
 }
}

let cached=null;
export function imcCatalog(){
 if(cached)return cached;
 const groups=[
  ['001-050',IMC_CARDS_001_050],
  ['051-100',IMC_CARDS_051_100],
  ['starter',IMC_CARDS_STARTER],
  ['ap',IMC_AP_CARDS]
 ];
 const cards=[];
 const seen=new Set();
 for(const [group,list] of groups){
  for(const card of list){
   validateGroup(card,group);
   if(seen.has(card.id))throw Error('Duplicate IMC id '+card.id);
   seen.add(card.id);
   cards.push({...card,group,printings:[...card.printings]});
  }
 }
 const byId=new Map(cards.map(card=>[card.id,card]));
 for(const printing of IMC_STARTER_PRINTINGS){
  const id=printingId(printing.number);
  const card=byId.get(id);
  if(!card||card.group==='starter'||card.group==='ap')
   throw Error('Starter reprint has no booster card '+printing.number);
  if(card.printings.some(item=>item.number===printing.number))
   throw Error('Duplicate printing '+printing.number);
  card.printings.push(printing);
  if(!card.sets.includes(printing.set))card.sets=[...card.sets,printing.set];
 }
 for(const check of IMC_REPRINT_CHECKS){
  if(check.samePrintedText!==true)throw Error(check.id+' starter text differs from the booster');
  if(!byId.has(check.id))throw Error('Missing reprint '+check.id);
 }
 const deck=cards.filter(card=>card.deckLegal);
 const booster=deck.filter(card=>card.set==='UA55BT');
 const rarity={};
 for(const card of booster)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 for(const [rare,count] of Object.entries(IMC_BOOSTER.rarities)){
  if(rarity[rare]!==count)throw Error('UA55BT '+rare+' count is '+rarity[rare]);
 }
 if(booster.length!==IMC_BOOSTER.regular)throw Error('Booster identity count drifted');
 const ap=cards.filter(card=>card.group==='ap');
 if(ap.length!==IMC_BOOSTER.ap)throw Error('AP identity count drifted');
 for(const id of IMC_STARTER_DECK_IDS)if(!byId.has(id)||!byId.get(id).deckLegal)
  throw Error('Starter deck kind missing '+id);
 for(const id of IMC_PROMO_IDS){
  const card=byId.get(id);
  if(!card||card.group!=='starter'||card.rarity!=='R')throw Error('Promotion R missing '+id);
 }
 cached={cards,byId,deck,booster,ap,reprints:IMC_REPRINT_CHECKS};
 return cached;
}

export function imcEditorCards(){
 return imcCatalog().deck.map(card=>({...card,playable:false}));
}

export function imcCardFace(card){
 if(!card)throw Error('IMC face needs a catalog card');
 return {
  id:card.id,number:card.number,name:card.name,nameJa:card.nameJa,
  image:card.image,effect:card.effect,effectJa:card.effectJa,
  source:card.source,sourceTc:card.sourceTc||''
 };
}
