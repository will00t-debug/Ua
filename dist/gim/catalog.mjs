// Gakuen Idolmaster set 1 catalog. Official Japanese print is the rules source.
// UA27BT has no starter. Display is Rugia HK and confirmedTc stays false.
// battleReady stays false. A shared V2 program, not this file, admits a card.
import {GIM_CARDS_001_040} from './cards-001-040.mjs?v=20261126gim1';
import {GIM_CARDS_041_080} from './cards-041-080.mjs?v=20261126gim1';
import {GIM_AP_CARDS} from './cards-ap.mjs?v=20261126gim1';
import {gimDisplayImage} from './art.mjs?v=20261126gim1';

const COLORS=new Set(['blue','red']);
const DECK_TYPES=new Set(['character','event','field']);
const IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
const PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';
const RUGIA='https://rugiacreation.com/ua/search?Name=HK&Find1=';
export const GIM_BOOSTER_RARITIES=Object.freeze({C:28,U:28,R:12,SR:12});
// Rugia HK span.raidBorder encloses the whole print of these eight.
// The Raid permission line is not a framed keyword. A card stays out of the
// battle pack until every framed keyword is listed in raid-box.mjs.
export const GIM_RAID_FRAME_NUMBERS=Object.freeze([6,11,20,24,48,53,63,72]);

function serial(id){
 const match=/^GIM-1-(\d{3})$/.exec(id);
 return match?Number(match[1]):null;
}
function requireRow(card,group){
 if(card.battleReady!==false||card.auto!==false||card.playable!==false||
  card.effectImplemented!==false)
  throw Error(card.id+' catalog row cannot claim battle support');
 if(card.cardDataVerified!==false)throw Error(card.id+' is not an independently signed rules audit');
 if(card.confirmedTc!==false)throw Error(card.id+' Traditional Chinese is not an official confirmation');
 if(card.displaySource!==RUGIA+card.id)throw Error(card.id+' display source is not its Rugia page');
 if(card.title!=='gim')throw Error(card.id+' is not a Gakuen Idolmaster catalog row');
 if(typeof card.effectJa!=='string'||!card.effectJa)throw Error(card.id+' is missing the Japanese print');
 if(!card.image?.startsWith(IMAGE)||!card.source?.startsWith(PAGE))
  throw Error(card.id+' is missing an official Japanese page');
 if(!Array.isArray(card.traits)||card.traits.some(trait=>typeof trait!=='string'||!trait.trim()))
  throw Error(card.id+' traits are not a printed list');
 if(!Array.isArray(card.officialFaqIds))throw Error(card.id+' FAQ ids are not a list');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>30)
  throw Error(card.id+' required energy is not a printed integer');
 if(!Number.isInteger(card.gen)||card.gen<0||card.gen>8)
  throw Error(card.id+' generated energy is not a printed integer');
 if(card.genMark!==''&&card.genMark!=='+')throw Error(card.id+' generated-energy mark is unknown');
 if(card.bpMark!==''&&card.bpMark!=='+')throw Error(card.id+' BP mark is unknown');
 if(card.raidFrame!==null&&(
  card.raidFrame?.source!=='rugia-hk'||typeof card.raidFrame.inside!=='string'||
  typeof card.raidFrame.outside!=='string'||card.raidFrame.wholeInside!==true||
  card.raidFrame.outside!==''))
  throw Error(card.id+' raid frame is not a whole Rugia span');
 const n=serial(card.id);
 if(group==='001-040'||group==='041-080'){
  const low=group==='001-040'?1:41,high=group==='001-040'?40:80;
  if(n==null||n<low||n>high||card.set!=='UA27BT'||card.deckLegal!==true||
   !COLORS.has(card.color)||!DECK_TYPES.has(card.type))
   throw Error(card.id+' is outside its booster range');
  const framed=GIM_RAID_FRAME_NUMBERS.includes(n);
  if(framed!==(card.raidFrame!==null))throw Error(card.id+' raid frame does not match the Rugia split');
 }else if(group==='ap'){
  if(!/^GIM-1-AP\d{2}$/.test(card.id)||card.set!=='UA27BT'||
   card.deckLegal!==false||card.type!=='action-point'||card.raidFrame!==null)
   throw Error(card.id+' is not an action-point card');
 }
 return Object.freeze({...card,group});
}

let cached=null;
export function gimCatalog(){
 if(cached)return cached;
 const cards=[
  ...GIM_CARDS_001_040.map(card=>requireRow(card,'001-040')),
  ...GIM_CARDS_041_080.map(card=>requireRow(card,'041-080')),
  ...GIM_AP_CARDS.map(card=>requireRow(card,'ap'))
 ];
 const byId=new Map(cards.map(card=>[card.id,card]));
 if(byId.size!==cards.length)throw Error('Duplicate Gakuen Idolmaster identity');
 const deck=cards.filter(card=>card.deckLegal);
 const rarity={};
 for(const card of deck)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 for(const [rare,count] of Object.entries(GIM_BOOSTER_RARITIES)){
  if(rarity[rare]!==count)throw Error('UA27BT '+rare+' count is '+rarity[rare]);
 }
 if(deck.length!==80)throw Error('Deck identity count drifted');
 const ap=cards.filter(card=>card.group==='ap');
 if(ap.length!==19)throw Error('AP identity count drifted');
 const frames=deck.filter(card=>card.raidFrame).map(card=>serial(card.id));
 if(JSON.stringify(frames)!==JSON.stringify([...GIM_RAID_FRAME_NUMBERS]))
  throw Error('Raid frame identities drifted: '+frames.join(','));
 const mao=byId.get('GIM-1-001');
 if(mao.energy!==1||mao.gen!==2||mao.genMark!==''||mao.color!=='blue')
  throw Error('GIM-1-001 printed energy drifted');
 const neo=byId.get('GIM-1-012');
 if(neo.energy!==0||neo.gen!==1||neo.genMark!=='+')
  throw Error('GIM-1-012 printed energy or generated energy drifted');
 cached={cards,byId,deck,ap};
 return cached;
}

export function gimEditorCards(){
 return gimCatalog().deck.map(card=>{
  const onlineImage=gimDisplayImage(card);
  if(!onlineImage)throw Error(card.id+' has no embeddable card image');
  return {...card,onlineImage,playable:false,battleReady:false,deckLegal:true};
 });
}
