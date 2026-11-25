// Macross catalog. Official Japanese print is the rules source.
// Set 1 (UA36BT / UA36ST) display is Rugia HK and confirmedTc stays false.
// Set 2 (EX14BT) display is the published Bandai TC page and confirmedTc is true.
// Rugia HK splits a set-2 raid frame only. UA36ST reprints that keep a UA36BT
// number stay one identity. battleReady stays false. A shared V2 program,
// not this file, admits a card.
import {MCR_CARDS_001_050} from './cards-001-050.mjs?v=20261125mcr4';
import {MCR_CARDS_051_100} from './cards-051-100.mjs?v=20261125mcr4';
import {MCR_CARDS_STARTER} from './cards-starter.mjs?v=20261125mcr4';
import {MCR_AP_CARDS} from './cards-ap.mjs?v=20261125mcr4';
import {MCR_REPRINT_IDS,MCR_REPRINT_NUMBERS} from './reprint-ids.mjs?v=20261125mcr4';
import {MCR2_CARDS_001_040} from './cards-ex14-001-040.mjs?v=20261125mcr12';
import {MCR2_CARDS_041_077} from './cards-ex14-041-077.mjs?v=20261125mcr12';
import {MCR2_AP_CARDS} from './cards-ex14-ap.mjs?v=20261125mcr12';

const COLORS=new Set(['yellow','blue','red']);
const VOL2_COLORS=new Set(['yellow','blue','red','purple']);
const DECK_TYPES=new Set(['character','event','field']);
const IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
const PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';
const TC_PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const RUGIA='https://rugiacreation.com/ua/search?Name=HK&Find1=';
const BIRD_ERRATA='https://www.unionarena-tcg.com/en/news/034.php';
export const MCR_BOOSTER_RARITIES=Object.freeze({C:35,U:35,R:18,SR:12});
export const MCR2_BOOSTER_RARITIES=Object.freeze({C:28,U:25,R:12,SR:12});
export const MCR_RAID_FRAME_NUMBERS=Object.freeze([
 9,10,11,12,22,23,43,44,45,46,60,62,63,79,91,92,93,95,107
]);
export const MCR2_RAID_FRAME_NUMBERS=Object.freeze([4,8,16,36,45,52,53,54,69]);

function serial(id){
 const match=/^MCR-1-(\d{3})$/.exec(id);
 return match?Number(match[1]):null;
}
function serial2(id){
 const match=/^MCR-2-(\d{3})$/.exec(id);
 return match?Number(match[1]):null;
}
function requireRow(card,group){
 const vol2=group==='ex14'||group==='ex14-ap';
 if(card.battleReady!==false||card.auto!==false||card.playable!==false||
  card.effectImplemented!==false)
  throw Error(card.id+' catalog row cannot claim battle support');
 if(card.cardDataVerified!==false)throw Error(card.id+' is not an independently signed rules audit');
 if(vol2){
  if(card.confirmedTc!==true)throw Error(card.id+' Traditional Chinese page is published');
  if(card.displaySource!==TC_PAGE+encodeURIComponent(card.set+'/'+card.id))
   throw Error(card.id+' display source is not its Bandai TC page');
  if(card.id==='MCR-2-071'){
   if(card.errata!==BIRD_ERRATA||!card.effectJa.includes('〈サラ・ノーム〉を1枚'))
    throw Error(card.id+' is missing the printed 1枚 errata');
  }else if(card.errata!==undefined)throw Error(card.id+' has an unaudited errata');
 }else{
  if(card.confirmedTc!==false)throw Error(card.id+' Traditional Chinese is not an official confirmation');
  if(card.displaySource!==RUGIA+card.id)throw Error(card.id+' display source is not its Rugia page');
  if(card.errata!==undefined)throw Error(card.id+' has an unaudited errata');
 }
 if(card.title!=='mcr')throw Error(card.id+' is not a Macross catalog row');
 if(typeof card.effectJa!=='string'||!card.effectJa)throw Error(card.id+' is missing the Japanese print');
 if(!card.image?.startsWith(IMAGE)||!card.source?.startsWith(PAGE))
  throw Error(card.id+' is missing an official Japanese page');
 if(!Array.isArray(card.traits)||card.traits.some(trait=>typeof trait!=='string'||!trait.trim()))
  throw Error(card.id+' traits are not a printed list');
 if(card.traits.some(trait=>trait.includes('／'))&&card.traits.length!==1)
  throw Error(card.id+' slash trait was split before an audit');
 if(!Array.isArray(card.officialFaqIds))throw Error(card.id+' FAQ ids are not a list');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>30)
  throw Error(card.id+' required energy is not a printed integer');
 if(!Number.isInteger(card.gen)||card.gen<0||card.gen>8)
  throw Error(card.id+' generated energy is not a printed integer');
 if(card.genMark!==''&&card.genMark!=='+')throw Error(card.id+' generated-energy mark is unknown');
 if(card.bpMark!==''&&card.bpMark!=='+')throw Error(card.id+' BP mark is unknown');
 if(card.raidFrame!==null&&(
  card.raidFrame?.source!=='rugia-hk'||typeof card.raidFrame.inside!=='string'||
  typeof card.raidFrame.outside!=='string'||typeof card.raidFrame.wholeInside!=='boolean'))
  throw Error(card.id+' raid frame is not a Rugia span');
 const n=serial(card.id);
 if(group==='001-050'||group==='051-100'){
  const low=group==='001-050'?1:51,high=group==='001-050'?50:100;
  if(n==null||n<low||n>high||card.set!=='UA36BT'||card.deckLegal!==true||
   !COLORS.has(card.color)||!DECK_TYPES.has(card.type))
   throw Error(card.id+' is outside its booster range');
 }else if(group==='starter'){
  if(n==null||n<101||n>113||card.set!=='UA36ST'||card.deckLegal!==true||
   !COLORS.has(card.color)||!DECK_TYPES.has(card.type))
   throw Error(card.id+' is outside the starter-only range');
 }else if(group==='ap'){
  if(!/^MCR-1-AP\d{2}$/.test(card.id)||card.deckLegal!==false||card.type!=='action-point')
   throw Error(card.id+' is not an action-point card');
 }else if(group==='ex14'){
  const n2=serial2(card.id);
  if(n2==null||n2<1||n2>77||card.set!=='EX14BT'||card.deckLegal!==true||
   !VOL2_COLORS.has(card.color)||!DECK_TYPES.has(card.type))
   throw Error(card.id+' is outside the Vol.2 deck range');
  const framed=MCR2_RAID_FRAME_NUMBERS.includes(n2);
  if(framed!==(card.raidFrame!==null))throw Error(card.id+' raid frame does not match the Rugia split');
 }else if(group==='ex14-ap'){
  if(!/^MCR-2-AP0[1-7]$/.test(card.id)||card.set!=='EX14BT'||
   card.deckLegal!==false||card.type!=='action-point'||card.raidFrame!==null)
   throw Error(card.id+' is not a Vol.2 action-point card');
 }
 return Object.freeze({...card,group});
}

let cached=null;
export function mcrCatalog(){
 if(cached)return cached;
 const cards=[
  ...MCR_CARDS_001_050.map(card=>requireRow(card,'001-050')),
  ...MCR_CARDS_051_100.map(card=>requireRow(card,'051-100')),
  ...MCR_CARDS_STARTER.map(card=>requireRow(card,'starter')),
  ...MCR_AP_CARDS.map(card=>requireRow(card,'ap')),
  ...MCR2_CARDS_001_040.map(card=>requireRow(card,'ex14')),
  ...MCR2_CARDS_041_077.map(card=>requireRow(card,'ex14')),
  ...MCR2_AP_CARDS.map(card=>requireRow(card,'ex14-ap'))
 ];
 const byId=new Map(cards.map(card=>[card.id,card]));
 if(byId.size!==cards.length)throw Error('Duplicate Macross identity');
 const reprints=[];
 for(const number of MCR_REPRINT_NUMBERS){
  const card=byId.get('MCR-1-'+String(number).padStart(3,'0'));
  if(!card||card.set!=='UA36BT'||!card.sets?.includes('UA36ST'))
   throw Error('Missing UA36ST reprint '+number);
  reprints.push(card.id);
 }
 if(JSON.stringify(reprints)!==JSON.stringify(MCR_REPRINT_IDS))
  throw Error('Reprint identity list drifted');
 const deck=cards.filter(card=>card.deckLegal);
 const booster=deck.filter(card=>card.set==='UA36BT');
 const rarity={};
 for(const card of booster)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 for(const [rare,count] of Object.entries(MCR_BOOSTER_RARITIES)){
  if(rarity[rare]!==count)throw Error('UA36BT '+rare+' count is '+rarity[rare]);
 }
 if(booster.length!==100)throw Error('Booster identity count drifted');
 const vol2=deck.filter(card=>card.set==='EX14BT');
 const vol2Rarity={};
 for(const card of vol2)vol2Rarity[card.rarity]=(vol2Rarity[card.rarity]||0)+1;
 for(const [rare,count] of Object.entries(MCR2_BOOSTER_RARITIES)){
  if(vol2Rarity[rare]!==count)throw Error('EX14BT '+rare+' count is '+vol2Rarity[rare]);
 }
 if(vol2.length!==77)throw Error('Vol.2 deck identity count drifted');
 const set1Deck=deck.filter(card=>card.set!=='EX14BT');
 if(set1Deck.length!==113||deck.length!==190)throw Error('Deck identity count drifted');
 const starterOnly=deck.filter(card=>card.set==='UA36ST');
 if(starterOnly.length!==13)throw Error('Starter-only identity count drifted');
 const ap=cards.filter(card=>card.group==='ap'||card.group==='ex14-ap');
 if(ap.filter(card=>card.group==='ap').length!==6)throw Error('AP identity count drifted');
 if(ap.filter(card=>card.group==='ex14-ap').length!==7)throw Error('Vol.2 AP identity count drifted');
 if(!byId.get('MCR-1-AP01').sets.includes('UA36ST'))throw Error('Starter AP01 print is missing');
 const frames=set1Deck.filter(card=>card.raidFrame).map(card=>serial(card.id));
 if(JSON.stringify(frames)!==JSON.stringify([...MCR_RAID_FRAME_NUMBERS]))
  throw Error('Raid frame identities drifted: '+frames.join(','));
 const frames2=vol2.filter(card=>card.raidFrame).map(card=>serial2(card.id));
 if(JSON.stringify(frames2)!==JSON.stringify([...MCR2_RAID_FRAME_NUMBERS]))
  throw Error('Vol.2 raid frame identities drifted: '+frames2.join(','));
 const sheryl=byId.get('MCR-1-001');
 if(sheryl.energy!==0||sheryl.gen!==1||sheryl.genMark!=='+')
  throw Error('MCR-1-001 printed energy or generated energy drifted');
 const sheryl2=byId.get('MCR-2-001');
 if(sheryl2.energy!==0||sheryl2.gen!==1||sheryl2.genMark!==''||sheryl2.color!=='yellow')
  throw Error('MCR-2-001 printed energy or generated energy drifted');
 cached={cards,byId,deck,booster,starterOnly,ap,reprints,vol2};
 return cached;
}

export function mcrEditorCards(){
 return mcrCatalog().deck.map(card=>({...card,playable:false,battleReady:false,deckLegal:true}));
}
