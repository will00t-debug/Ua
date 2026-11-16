// Evangelion: New Theatrical Edition catalog. Official print data only.
// UA44ST reprints that use a UA44BT card number stay one id.
// battleReady stays false. A shared V2 program, not this file, decides the pack.
import {EVA_CARDS_001_050} from './cards-001-050.mjs';
import {EVA_CARDS_051_100} from './cards-051-100.mjs';
import {EVA_CARDS_STARTER} from './cards-starter.mjs';
import {EVA_AP_CARDS} from './cards-ap.mjs';

const COLORS=new Set(['purple','yellow','green','blue','red']);
const DECK_TYPES=new Set(['character','event','field']);
const IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
const PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';
const TC_PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
export const EVA_BOOSTER_RARITIES=Object.freeze({C:35,U:35,R:18,SR:12});
export const EVA_REPRINT_NUMBERS=Object.freeze([68,69,72,73,76,83,85,95,100]);

function serial(id){
 const match=/^EVA-1-(\d{3})$/.exec(id);
 return match?Number(match[1]):null;
}
function requireRow(card,group){
 if(card.battleReady!==false||card.auto!==false||card.playable!==false||card.effectImplemented!==false)
  throw Error(card.id+' catalog row cannot claim battle support');
 if(card.cardDataVerified!==false)throw Error(card.id+' is not an independently signed rules audit');
 if(card.title!=='eva')throw Error(card.id+' is not an EVA catalog row');
 if(!card.image.startsWith(IMAGE)||!card.source.startsWith(PAGE)||!card.sourceTc.startsWith(TC_PAGE))
  throw Error(card.id+' is missing an official page');
 if(!Array.isArray(card.traits))throw Error(card.id+' traits are not a list');
 if(!Array.isArray(card.officialFaqIds))throw Error(card.id+' FAQ ids are not a list');
 const n=serial(card.id);
 if(group==='001-050'||group==='051-100'){
  const low=group==='001-050'?1:51,high=group==='001-050'?50:100;
  if(n==null||n<low||n>high||card.set!=='UA44BT'||card.deckLegal!==true)
   throw Error(card.id+' is outside its booster range');
 }else if(group==='starter'){
  if(n==null||n<101||n>113||card.set!=='UA44ST'||card.deckLegal!==true)
   throw Error(card.id+' is outside the starter-only range');
 }else if(group==='ap'){
  if(!/^EVA-1-AP\d{2}$/.test(card.id)||card.deckLegal!==false||card.type!=='action-point')
   throw Error(card.id+' is not an action-point card');
  if(card.effect!==''||card.effectJa!=='-')throw Error(card.id+' action-point card has rules text');
  return;
 }
 if(!DECK_TYPES.has(card.type)||!COLORS.has(card.color))throw Error(card.id+' has a bad type or color');
 if(typeof card.nameJa!=='string'||!card.nameJa||typeof card.name!=='string'||!card.name)
  throw Error(card.id+' is missing a printed name');
 if(typeof card.effectJa!=='string'||!card.effectJa)throw Error(card.id+' has no Japanese effect text');
 if(card.effectJa==='-'&&card.effect!=='')throw Error(card.id+' empty Japanese effect has display text');
 if(card.effectJa!=='-'&&!card.effect)throw Error(card.id+' has no Traditional Chinese effect text');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>30)throw Error(card.id+' bad energy');
 if(!Number.isInteger(card.ap)||card.ap<0||card.ap>3)throw Error(card.id+' bad AP');
 if(!Number.isInteger(card.bp)||card.bp<0||card.bp>20000)throw Error(card.id+' bad BP');
 if(!Number.isInteger(card.gen)||card.gen<0||card.gen>3)throw Error(card.id+' bad generated energy');
}

let cached=null;
export function evaCatalog(){
 if(cached)return cached;
 const groups=[
  ['001-050',EVA_CARDS_001_050],
  ['051-100',EVA_CARDS_051_100],
  ['starter',EVA_CARDS_STARTER],
  ['ap',EVA_AP_CARDS]
 ];
 const cards=[];
 const seen=new Set();
 for(const [group,list] of groups){
  for(const card of list){
   requireRow(card,group);
   if(seen.has(card.id))throw Error('Duplicate EVA id '+card.id);
   seen.add(card.id);
   cards.push({...card,group,printings:card.printings.map(item=>({...item}))});
  }
 }
 const byId=new Map(cards.map(card=>[card.id,card]));
 const reprints=[];
 for(const number of EVA_REPRINT_NUMBERS){
  const card=byId.get('EVA-1-'+String(number).padStart(3,'0'));
  const starter=card?.printings.find(item=>item.set==='UA44ST');
  if(!card||card.set!=='UA44BT'||!starter)throw Error('Missing UA44ST reprint '+number);
  reprints.push(card.id);
 }
 const deck=cards.filter(card=>card.deckLegal);
 const booster=deck.filter(card=>card.set==='UA44BT');
 const rarity={};
 for(const card of booster)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 for(const [rare,count] of Object.entries(EVA_BOOSTER_RARITIES)){
  if(rarity[rare]!==count)throw Error('UA44BT '+rare+' count is '+rarity[rare]);
 }
 if(booster.length!==100)throw Error('Booster identity count drifted');
 if(deck.length!==113)throw Error('Deck identity count drifted');
 const ap=cards.filter(card=>card.group==='ap');
 if(ap.length!==6)throw Error('AP identity count drifted');
 if(!byId.get('EVA-1-AP01').sets.includes('UA44ST'))throw Error('Starter AP01 print is missing');
 cached={cards,byId,deck,booster,ap,reprints};
 return cached;
}

export function evaEditorCards(){
 return evaCatalog().deck.map(card=>({...card,playable:false,battleReady:false,deckLegal:true}));
}
