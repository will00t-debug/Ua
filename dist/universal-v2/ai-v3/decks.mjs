// Legal 50-card decks used as the ai-v3 comparison pool.
// Steins;Gate and Attack on Titan are outside the old five-title census.
import {officialV2Pack,practiceDeck,steinsGatePracticeDeck,aotPracticeDeck} from '../official-entry.mjs';
import {validateUniversalDeck} from '../pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../bleach-designated-decks.mjs';

function fromPractice(id,title,color){
 const pack=officialV2Pack(title);
 const counts=practiceDeck(pack,color?{color}:undefined);
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(id+': '+issues.join('; '));
 return {id,title,pack,counts};
}
export function mainDecks(){
 const bleach=fromPractice('bleach','bleach');
 const sao=fromPractice('sword-art-online','sword-art-online');
 const slg=fromPractice('solo-leveling','solo-leveling');
 const steins=steinsGatePracticeDeck();
 const titan=aotPracticeDeck();
 for(const deck of [steins,titan]){
  const issues=validateUniversalDeck(deck.pack,deck.counts);
  if(issues.length)throw Error(deck.pack.id+': '+issues.join('; '));
 }
 return [
  bleach,sao,slg,
  {id:'steins-gate',title:'steins-gate',pack:steins.pack,counts:steins.counts,kind:'practice'},
  {id:'aot',title:'aot',pack:titan.pack,counts:titan.counts,kind:'practice'}
 ].map(deck=>({kind:'practice',...deck}));
}
function squash(value){return String(value||'').replace(/\s+/g,'');}
function triggerRoom(triggers,card,copies){
 if(!Object.prototype.hasOwnProperty.call(triggers,card.trigger))return copies;
 return Math.min(copies,4-(triggers[card.trigger]||0));
}
function addCopies(pack,counts,triggers,total,card,copies){
 const have=counts[card.id]||0;
 const limit=card.maxCopies||4;
 const room=Math.min(copies,limit-have,50-total);
 const allowed=triggerRoom(triggers,card,room);
 if(allowed<=0)return total;
 counts[card.id]=have+allowed;
 total+=allowed;
 if(Object.prototype.hasOwnProperty.call(triggers,card.trigger))triggers[card.trigger]+=allowed;
 return total;
}
export function deckProfile(pack,counts){
 const rows=Object.entries(counts).map(([id,copies])=>({...pack.cards[id],copies}));
 const curve={};
 for(const card of rows)curve[card.energy]=(curve[card.energy]||0)+(card.copies||0);
 const names=new Map();
 for(const card of rows)if(card.type==='character'&&card.name){
  const key=squash(card.name);
  if(!names.has(key))names.set(key,[]);
  names.get(key).push(card);
 }
 const pairs=[];
 for(const raid of rows.filter(card=>card.raidName)){
  const wanted=[raid.raidName,...(raid.raidBaseNames||[])].map(squash);
  const bases=[];
  for(const name of wanted)for(const base of names.get(name)||[])if(base.id!==raid.id&&!bases.some(item=>item.id===base.id))bases.push(base);
  pairs.push({id:raid.id,name:raid.name,energy:raid.energy,ap:raid.ap||0,copies:raid.copies,
   bases:bases.map(base=>({id:base.id,name:base.name,energy:base.energy,copies:base.copies}))});
 }
 const baseIds=new Set(pairs.flatMap(pair=>pair.bases.map(base=>base.id)));
 return {
  curve,kinds:rows.length,cards:rows.reduce((sum,card)=>sum+card.copies,0),
  raidCopies:rows.filter(card=>card.raidName).reduce((sum,card)=>sum+card.copies,0),
  baseCopies:rows.filter(card=>baseIds.has(card.id)).reduce((sum,card)=>sum+card.copies,0),
  energy4Plus:rows.filter(card=>(card.energy||0)>=4).reduce((sum,card)=>sum+card.copies,0),
  comboReady:pairs.some(pair=>pair.bases.length>0),
  pairs:pairs.filter(pair=>pair.bases.length),
  list:rows.map(card=>card.copies+'x '+card.id+' '+(card.name||'')+' E'+(card.energy??'?')).sort()
 };
}
export function designatedBattleDecks(){
 const pack=officialV2Pack('bleach');
 return summarizeDesignatedDecks(id=>!!pack.cards[id]).filter(row=>row.playable).map(row=>({
  id:row.key,title:'bleach',name:row.name,kind:'designated',pack,
  counts:{...designatedPlayableCounts(row)}
 }));
}
function raidPairs(pack){
 const cards=Object.values(pack.cards).filter(card=>card&&card.type==='character');
 const byName=new Map();
 for(const card of cards){
  const key=squash(card.name);
  const current=byName.get(key);
  if(!current||(card.energy||0)<(current.energy||0))byName.set(key,card);
 }
 const pairs=[];
 for(const raid of cards.filter(card=>card.raidName)){
  const names=[...new Set([raid.raidName,...(raid.raidBaseNames||[])].map(squash))];
  const base=names.map(name=>byName.get(name)).find(card=>card&&card.id!==raid.id);
  if(!base)continue;
  if((raid.energy||0)>8||(base.energy||0)>6)continue;
  pairs.push({raid,base,color:raid.color});
 }
 return pairs;
}
function buildRaidDeck(title){
 let pack;
 try{pack=officialV2Pack(title);}catch{return null;}
 const pairs=raidPairs(pack);
 if(!pairs.length)return null;
 const colors=new Map();
 for(const pair of pairs){
  const list=colors.get(pair.color)||[];
  list.push(pair);
  colors.set(pair.color,list);
 }
 const [color,chosen]=[...colors.entries()].sort((a,b)=>b[1].length-a[1].length)[0];
 const counts={};
 const triggers={final:0,color:0,special:0,draw:0};
 let total=0;
 const sameColor=card=>card&&card.color===color;
 const baseOk=card=>card&&(!pack.restrictColors||card.color===color);
 for(const pair of chosen.slice(0,3)){
  if(baseOk(pair.base))total=addCopies(pack,counts,triggers,total,pair.base,4);
  if(sameColor(pair.raid))total=addCopies(pack,counts,triggers,total,pair.raid,4);
 }
 const fillers=Object.values(pack.cards).filter(card=>sameColor(card)&&(card.gen||0)>0&&(card.energy||0)<=2)
  .sort((a,b)=>(a.energy||0)-(b.energy||0)||(b.gen||0)-(a.gen||0)||String(a.id).localeCompare(String(b.id)));
 let guard=0;
 while(total<50&&guard++<80){
  let moved=false;
  for(const card of fillers){
   const next=addCopies(pack,counts,triggers,total,card,1);
   if(next!==total){total=next;moved=true;if(total>=50)break;}
  }
  if(!moved)break;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)return null;
 const profile=deckProfile(pack,counts);
 if(!profile.comboReady)return null;
 return {id:title+'-raid',title,name:title,kind:'raid',pack,counts,color};
}
const RAID_TITLES=['sword-art-online','solo-leveling','steins-gate','rezero','madoka','inuyasha','kjn','csm','aot','kmr','mushoku-tensei','gurren-lagann'];
export function raidArchetypeDecks(){
 return RAID_TITLES.map(buildRaidDeck).filter(Boolean);
}
export function battleDecks(){
 return [...designatedBattleDecks(),...raidArchetypeDecks()];
}
