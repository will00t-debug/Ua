import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {mhaCatalog,mhaEditorCards,MHA_CATALOG,MHA_CATALOG_051_100} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {createMhaV2Pack,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {MHA_UA10ST_PROGRAMS} from '../dist/universal-v2/mha/programs.mjs';
import {MHA_UA10ST_REQUESTS} from '../dist/universal-v2/mha/requests.mjs';
import {MHA_PROGRAMS_001_050} from '../dist/universal-v2/mha/programs-001-050.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_001_050} from '../dist/universal-v2/mha/requests-001-050.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';

const READY=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065','MHA-1-101','MHA-1-102',
 'MHA-1-103','MHA-1-104','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108',
 'MHA-1-109'];
const OPEN=MHA_UA10ST_REQUESTS.map(row=>row.cardId);
const pack=createMhaV2Pack();
const catalog=mhaCatalog();
const byId=Object.fromEntries(catalog.deck.map(card=>[card.id,card]));
function battle(id){
 return mhaBattleCard(byId[id],mhaProgramFor(id));
}

function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'green',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??1000,gen:extra.gen??1,traits:[],trigger:extra.trigger??null,
  implementation:extra.implementation||'vanilla',effects:extra.effects||{},...extra
 };
}
function open(cards,{seed=10,phase='main'}={}){
 const bodies=[...cards];
 let extra=1;
 while(bodies.length*4<50){
  bodies.push(face({id:'FILL-'+String(extra).padStart(2,'0'),name:'填充'+extra,bp:1000}));
  extra++;
 }
 const built=createUniversalPack({id:'probe',version:'ua10st-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(built,counts),[]);
 let s=newUniversalMatch(built,{decks:[counts,counts],seed,first:0,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(built,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 assert.equal(assertUniversalMatch(built,s),true);
 return {pack:built,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function legal(built,s){return legalUniversalActions(built,s);}
function act(built,s,action){
 if(typeof action==='function'){
  const found=legal(built,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(built,s,action);
 assert.equal(assertUniversalMatch(built,next),true);
 return next;
}
function play(built,s,id,line='front',slot=0){
 const card=hold(s,id);
 const action=legal(built,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line&&a.slot===slot);
 assert.ok(action,id+' play');
 return [act(built,s,action),card];
}
function energy(built,s){return universalEnergyByColor(built,s,0);}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
}
function reach(built,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=act(built,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach '+phase);
 }
 return s;
}
function pay(s,pips,ap,p=0){
 const gen=Math.ceil(pips/2);
 for(let i=0;i<gen;i++){
  if(s.players[p].energy[i]?.cardId==='GEN')s.players[p].energy[i].ready=true;
  else seat(s,p,'GEN','energy',i,true);
 }
 s.players[p].apCards.forEach((card,index)=>{
  card.inPlay=index<ap;
  card.ready=index<ap;
 });
}
function eventPlay(built,s,id){
 const card=hold(s,id);
 const action=legal(built,s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id+' event');
 return [act(built,s,action),card];
}
function finishOrder(built,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(built,s,{type:'chooseTopOrder',uid});
  if(++guard>8)throw Error('order');
 }
 return s;
}
function stackTop(s,ids){
 const cards=ids.map(id=>pull(s,0,id));
 s.players[0].deck.unshift(...cards);
 return cards;
}
function blankLife(s,p){
 const life=s.players[p].life;
 for(let i=0;i<life.length;i++){
  if(String(life[i].cardId).startsWith('FILL-'))continue;
  const index=s.players[p].deck.findIndex(c=>String(c.cardId).startsWith('FILL-'));
  const swap=s.players[p].deck.splice(index,1)[0];
  s.players[p].deck.push(life[i]);
  life[i]=swap;
 }
}
const gen=face({id:'GEN',name:'能源',gen:2});

test('UA10ST catalog matches the official series and does not invent a deck recipe',()=>{
 assert.equal(catalog.deck.length,18);
 assert.equal(catalog.ap.length,2);
 assert.equal(catalog.all.length,20);
 assert.equal(UA10ST_PRODUCT.deckCards,50);
 assert.equal(UA10ST_PRODUCT.apCardsInProduct,3);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.match(UA10ST_PRODUCT.recipeStatus,/待查/);
 assert.equal(UA10ST_PRODUCT.cardList.includes('series=570010'),true);
 const ids=catalog.deck.map(card=>card.id);
 assert.deepEqual(ids,ids.slice().sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
 for(const card of catalog.deck){
  assert.equal(card.color,'green');
  assert.equal(card.traits.length,0);
  assert.equal(card.battleReady,false);
  assert.equal(card.auto,false);
  assert.equal(card.deckLegal,true);
  assert.equal(card.source.includes(encodeURIComponent(card.number)),true);
  assert.equal(card.image.endsWith(card.number.replace('/','_')+'.png'),true);
  assert.equal(card.sourceTc,null);
 }
 assert.equal(catalog.deck.find(card=>card.id==='MHA-1-102').bpMark,'+');
 assert.equal(catalog.deck.find(card=>card.id==='MHA-1-106').bp,3000);
 assert.equal(catalog.deck.find(card=>card.id==='MHA-1-109').type,'event');
 assert.equal(catalog.deck.find(card=>card.id==='MHA-1-108').type,'field');
 const booster=new Map([...MHA_CATALOG,...MHA_CATALOG_051_100].map(card=>[card.id,card]));
 const shared=[];
 for(const card of catalog.deck){
  assert.equal(card.image.startsWith('https://www.unionarena-tcg.com/jp/images/cardlist/card/UA10ST_'),true,card.id);
  assert.equal(card.source.startsWith('https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA10ST%2F'),true,card.id);
  const other=booster.get(card.id);
  if(!other)continue;
  shared.push(card.id);
  assert.equal(other.nameJa,card.nameJa,card.id);
  assert.equal(other.type,card.type,card.id);
  assert.equal(other.energy,card.energy,card.id);
  assert.equal(other.ap,card.ap,card.id);
  assert.equal(other.bp,card.bp,card.id);
  assert.equal(other.trigger,card.trigger,card.id);
  assert.equal(other.image.includes('UA10BT_'),true,card.id);
 }
 assert.deepEqual(shared,['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
  'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065']);
 assert.equal(mhaEditorCards().filter(card=>catalog.deck.some(row=>row.id===card.id)).length,18);
 for(const card of catalog.ap){
  assert.equal(card.deckLegal,false);
  assert.equal(card.type,'action-point');
  assert.equal(card.nameJa.includes('僕のヒーローアカデミア'),true);
 }
});

test('only complete UA10ST sentences enter the battle pack',()=>{
 assert.deepEqual(Object.keys(MHA_UA10ST_PROGRAMS).sort(),[...READY].sort());
 assert.deepEqual(OPEN,[]);
 assert.equal(READY.length,catalog.deck.length);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-063'],undefined);
 assert.equal(mhaProgramFor('MHA-1-063'),MHA_UA10ST_PROGRAMS['MHA-1-063']);
 for(const id of READY)assert.equal(pack.cards[id].id,id);
 assert.equal(READY.every(id=>Object.prototype.hasOwnProperty.call(pack.cards,id)),true);
 for(const id of READY){
  const card=catalog.deck.find(row=>row.id===id);
  const program=MHA_UA10ST_PROGRAMS[id];
  assert.equal(program.ready,true);
  if(card.effectJa!=='-')assert.equal(program.implementation,'dsl');
  assert.equal(pack.cards[id].name,card.nameJa);
  assert.equal(pack.cards[id].trigger,card.trigger);
 }
 for(const id of OPEN){
  assert.equal(MHA_UA10ST_PROGRAMS[id],undefined);
  assert.equal(pack.cards[id],undefined);
 }
 const four=Object.fromEntries(READY.map(id=>[id,4]));
 assert.match(validateUniversalDeck(pack,four).join('\n'),/50/);
});

test('IMC has 113 open V2 cards while MHA remains at 99 closed cards among 109',()=>{
 const editor=mhaEditorCards();
 assert.equal(editor.length,109);
 assert.equal(new Set(editor.map(card=>card.id)).size,109);
 assert.equal(editor.every(card=>card.playable===false&&card.battleReady===false&&card.deckLegal===true),true);
 const ready=Object.keys(pack.cards);
 assert.deepEqual(ready,editor.map(card=>card.id).filter(id=>pack.cards[id]));
 assert.equal(ready.length,99);
 const pending=editor.map(card=>card.id).filter(id=>!pack.cards[id]);
 assert.equal(pending.length,10);
 assert.equal(pack.cards['MHA-1-001'].effects.onRetire[0].count,1);
 assert.equal(pack.cards['MHA-1-013'].effects.onPlay[0].op,'optionalOwnLifeToHandThenDraw');
 assert.equal(pack.cards['MHA-1-014'].effects.onPlay[0].then[0].bp,3500);
 assert.equal(pack.cards['MHA-1-018'].mainAbility.then[0].op,'grantSelfAttackWinDrawThisTurn');
 assert.equal(pack.cards['MHA-1-070'].printedMains[0].op,'discardHandThenActive');
 assert.equal(pack.cards['MHA-1-051'].unblockedAttack.oncePerTurn,true);
 assert.equal(pack.cards['MHA-1-051'].effects.onRetire[0].op,'deployRaidBottomActive');
 assert.equal(pack.cards['MHA-1-054'].effects.onPlay[0].discard,false);
 assert.equal(pack.cards['MHA-1-012'].mainAbility.op,'restSelfGainEnergyRetireEndMain');
 assert.equal(pack.cards['MHA-1-019'].mainAbility.then[0].minBp,1500);
 assert.equal(pack.cards['MHA-1-027'].passiveBonuses[0].condition.kind,'ownNameOrRaidBase');
 assert.equal(pack.cards['MHA-1-053'].effects.onAttack[0].op,'chooseOne');
 assert.equal(pack.cards['MHA-1-063'].effects.onPlay[0].op,'grantOwnFieldAttackKit');
 assert.equal(pack.cards['MHA-1-063'].effects.onPlay[0].bp,2500);
 assert.equal(pack.cards['MHA-1-101'].implementation,'vanilla');
 assert.equal(pack.cards['MHA-1-101'].trigger,'active');
 assert.equal(pack.cards['MHA-1-102'].printedAttackDamage,2);
 assert.equal(pack.cards['MHA-1-102'].ownTurnBp,1000);
 assert.equal(pack.cards['MHA-1-102'].effects.onPlay[0].line,'front');
 assert.equal(pack.cards['MHA-1-105'].effects.onAttack[0].optional,true);
 assert.equal(pack.cards['MHA-1-105'].effects.onAttack[0].bp,2500);
 assert.equal(pack.cards['MHA-1-106'].passiveBonuses[0].condition.kind,'oppFrontCountAtLeast');
 assert.equal(pack.cards['MHA-1-107'].printedImpact,1);
 assert.equal(pack.cards['MHA-1-107'].effects.onPlay[0].when.min,3);
 assert.equal(pack.cards['MHA-1-108'].passiveBonuses[0].extraEnergy,1);
 assert.equal(pack.cards['MHA-1-109'].effects.onPlay[0].count,5);
 assert.equal(pack.cards['MHA-1-109'].effects.onPlay[0].takes[0].type,'character');
 for(const id of ['MHA-1-012','MHA-1-019','MHA-1-027','MHA-1-053',...READY])
  assert.equal(pending.includes(id),false,id);
 const requestIds=new Set([
  ...Object.keys(MHA_REQUESTS_001_050),
  ...MHA_REQUESTS_051_100.map(row=>row.cardId),
  ...MHA_UA10ST_REQUESTS.map(row=>row.cardId)
 ]);
 assert.equal(requestIds.size,10);
 assert.deepEqual([...requestIds].sort(),pending.slice().sort());
 assert.equal(getTitle('mha').playable,false);
 assert.equal(getTitle('imc').playable,true);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(Object.keys(createImcV2Pack().cards).length,113);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-012'].ready,true);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-019'].ready,true);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-027'].ready,true);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-053'].ready,true);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-063'],undefined);
});

test('MHA-1-034 adds green energy only while active',()=>{
 const opened=open([battle('MHA-1-034')],{seed:3401});
 let s=opened.s;
 seat(s,0,'FILL-01','energy',0,false);
 seat(s,0,'FILL-02','energy',1,false);
 let self;
 const base=energy(opened.pack,s).green;
 [s,self]=play(opened.pack,s,'MHA-1-034','energy',2);
 assert.equal(live(s,self.uid).ready,false);
 assert.equal(energy(opened.pack,s).green,base+1);
 live(s,self.uid).ready=true;
 assert.equal(energy(opened.pack,s).green,base+2);
 live(s,self.uid).ready=false;
 assert.equal(energy(opened.pack,s).green,base+1);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-036 steps from the front to energy and another card does not',()=>{
 const opened=open([battle('MHA-1-036'),face({id:'PLAIN',name:'普通',bp:2000})],{seed:3601,phase:'move'});
 let s=opened.s;
 const self=seat(s,0,'MHA-1-036','front',0,true);
 const plain=seat(s,0,'PLAIN','front',1,true);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='step'&&a.uid===self.uid),true);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 s=act(opened.pack,s,legal(opened.pack,s).find(a=>a.type==='step'&&a.uid===self.uid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===self.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-041 returns another energy-1 character, or itself',()=>{
 const opened=open([
  battle('MHA-1-041'),battle('MHA-1-103'),battle('MHA-1-034')
 ],{seed:4101});
 let s=opened.s;
 const low=seat(s,0,'MHA-1-103','front',1,true);
 const high=seat(s,0,'MHA-1-034','energy',0,false);
 let self;
 [s,self]=play(opened.pack,s,'MHA-1-041','front',0);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(self.uid),false);
 s=act(opened.pack,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===low.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));
 const alone=open([battle('MHA-1-041'),battle('MHA-1-034')],{seed:4102});
 s=alone.s;
 seat(s,0,'MHA-1-034','energy',0,false);
 [s,self]=play(alone.pack,s,'MHA-1-041','front',0);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===self.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(assertUniversalMatch(alone.pack,s),true);
});

test('MHA-1-044 rests for green energy and leaves at the end of main',()=>{
 const opened=open([battle('MHA-1-044')],{seed:4401});
 let s=opened.s;
 let self;
 [s,self]=play(opened.pack,s,'MHA-1-044','energy');
 assert.equal(energy(opened.pack,s).green,1);
 live(s,self.uid).ready=true;
 s=act(opened.pack,s,legal(opened.pack,s).find(a=>a.type==='activate'&&a.uid===self.uid));
 assert.equal(live(s,self.uid).ready,false);
 assert.equal(energy(opened.pack,s).green,2);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 s=act(opened.pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.ok(s.players[0].outside.some(c=>c.uid===self.uid));
 assert.equal(energy(opened.pack,s).green||0,0);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-052 cuts one opposing character at BP 1000 or more',()=>{
 const opened=open([
  battle('MHA-1-052'),
  face({id:'TALL',name:'高',bp:1000}),
  face({id:'SHORT',name:'低',bp:500}),
  face({id:'BACK',name:'後',bp:1500})
 ],{seed:5201,phase:'attack'});
 let s=opened.s;
 const self=seat(s,0,'MHA-1-052','front',0,true);
 const tall=seat(s,1,'TALL','front',0,true);
 const short=seat(s,1,'SHORT','front',1,true);
 const back=seat(s,1,'BACK','energy',0,true);
 s=act(opened.pack,s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.choices.includes(tall.uid),true);
 assert.equal(s.pending.choices.includes(back.uid),true);
 assert.equal(s.pending.choices.includes(short.uid),false);
 const skipped=act(opened.pack,structuredClone(s),{type:'chooseTarget',uid:null});
 assert.equal(universalBp(opened.pack,skipped,live(skipped,tall.uid)),1000);
 s=act(opened.pack,s,{type:'chooseTarget',uid:tall.uid});
 assert.equal(universalBp(opened.pack,s,live(s,tall.uid)),500);
 assert.equal(universalBp(opened.pack,s,live(s,back.uid)),1500);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-057 and MHA-1-103 have no printed effect',()=>{
 const opened=open([battle('MHA-1-057'),battle('MHA-1-103')],{seed:5701});
 let s=opened.s;
 let self;
 [s,self]=play(opened.pack,s,'MHA-1-057','front');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));
 assert.equal(battle('MHA-1-057').trigger,'get');
 s.players[0].apCards.find(card=>!card.ready).ready=true;
 [s]=play(opened.pack,s,'MHA-1-103','front',1);
 assert.equal(s.pending,null);
 assert.equal(battle('MHA-1-103').trigger,null);
 assert.equal(live(s,self.uid).bp??battle('MHA-1-057').bp,1500);
});

test('MHA-1-061 draws one card on play',()=>{
 const opened=open([battle('MHA-1-061'),battle('MHA-1-034'),battle('MHA-1-044')],{seed:6101});
 let s=opened.s;
 seat(s,0,'MHA-1-034','energy',0,false);
 seat(s,0,'MHA-1-044','energy',1,false);
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 let self;
 [s,self]=play(opened.pack,s,'MHA-1-061','front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand);
 assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-065 activates up to two AP cards',()=>{
 const opened=open([
  battle('MHA-1-065'),battle('MHA-1-034'),battle('MHA-1-044'),battle('MHA-1-103')
 ],{seed:6501});
 let s=opened.s;
 seat(s,0,'MHA-1-034','energy',0,false);
 seat(s,0,'MHA-1-044','energy',1,false);
 seat(s,0,'MHA-1-103','energy',2,false);
 s.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index===0;});
 const event=hold(s,'MHA-1-065');
 s=act(opened.pack,s,legal(opened.pack,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(opened.pack,s).some(a=>a.uid===null),true);
 const skipped=act(opened.pack,structuredClone(s),{type:'chooseApRecovery',uid:null});
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,0);
 const first=s.players[0].apCards.find(c=>!c.ready).uid;
 s=act(opened.pack,s,{type:'chooseApRecovery',uid:first});
 const second=s.players[0].apCards.find(c=>!c.ready).uid;
 s=act(opened.pack,s,{type:'chooseApRecovery',uid:second});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-104 shows the top three and returns all of them to the top',()=>{
 const opened=open([battle('MHA-1-104'),battle('MHA-1-034')],{seed:10401});
 let s=opened.s;
 seat(s,0,'MHA-1-034','energy',0,false);
 const top=[];
 for(const id of ['FILL-01','FILL-02','FILL-03'])top.push(pull(s,0,id));
 s.players[0].deck.unshift(...top);
 let self;
 [s,self]=play(opened.pack,s,'MHA-1-104','front');
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,top.map(card=>card.uid));
 assert.equal(legal(opened.pack,s).some(a=>a.type==='chooseOutside'),false);
 const order=[...s.pending.uids].reverse();
 for(const uid of order)s=act(opened.pack,s,{type:'chooseTopOrder',uid});
 assert.deepEqual(s.players[0].deck.slice(0,3).map(card=>card.uid),order);
 assert.equal(s.players[0].outside.some(card=>top.some(item=>item.uid===card.uid)),false);
 assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('a ready UA10ST character can attack and be blocked',()=>{
 const opened=open([battle('MHA-1-103')],{seed:10301,phase:'attack'});
 let s=opened.s;
 const attacker=seat(s,0,'FILL-01','front',0,true);
 const blocker=seat(s,1,'MHA-1-103','front',0,true);
 const life=s.players[1].life.length;
 s=act(opened.pack,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(legal(opened.pack,s).some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid),true);
 s=act(opened.pack,s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(s.players[1].life.length,life);
 assert.ok(s.players[0].front.some(c=>c?.uid===attacker.uid));
 assert.equal(live(s,attacker.uid).ready,false);
 assert.ok(s.players[1].front.some(c=>c?.uid===blocker.uid));
 assert.equal(live(s,blocker.uid).ready,false);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-063 grants BP and a battle-win draw, and sniper only to the two names',()=>{
 const alias=face({id:'AKA',name:'出久',nameAliases:['緑谷 出久'],implementation:'dsl'});
 const senior=face({id:'SENIOR',name:'オールマイト先輩'});
 const zone=face({id:'ZONE',name:'場域',type:'field',gen:2,bp:0});
 const opened=open([zone,battle('MHA-1-063'),battle('MHA-1-102'),battle('MHA-1-105'),
  battle('MHA-1-106'),alias,senior],{seed:6301});
 let s=opened.s;
 hold(s,'MHA-1-063');
 assert.equal(legal(opened.pack,s).some(a=>a.type==='event'),false);
 seat(s,0,'ZONE','energy',0,true);
 seat(s,0,'ZONE','energy',1,true);
 s.players[0].apCards.forEach((card,index)=>{card.inPlay=index<2;card.ready=index<2;});
 const emptyHand=s.players[0].hand.length;
 let [played]=eventPlay(opened.pack,s,'MHA-1-063');
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.cardId==='MHA-1-063'),true);
 assert.equal(played.players[0].hand.length,emptyHand-1);
 const hero=seat(s,0,'MHA-1-102','front',0,true);
 const other=seat(s,0,'MHA-1-105','front',1,true);
 const foe=seat(s,1,'MHA-1-106','front',0,false);
 const back=seat(s,1,'FILL-01','energy',0,true);
 [played]=eventPlay(opened.pack,s,'MHA-1-063');
 assert.equal(played.pending.kind,'effect-own-attack-kit');
 assert.equal(played.pending.optional,false);
 assert.deepEqual(played.pending.sniperNames,['オールマイト','緑谷 出久']);
 assert.ok(played.pending.choices.includes(hero.uid));
 assert.ok(played.pending.choices.includes(other.uid));
 assert.equal(played.pending.choices.includes(foe.uid),false);
 assert.equal(legal(opened.pack,played).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,played,{type:'chooseOwnAttackKit',uid:null}),
  /not currently legal|cannot be skipped/);
 assert.throws(()=>dispatchUniversalAction(opened.pack,played,{type:'chooseOwnAttackKit',uid:foe.uid}),
  /not currently legal|Illegal attack kit/);
 const hand=played.players[0].hand.length;
 played=act(opened.pack,played,a=>a.type==='chooseOwnAttackKit'&&a.uid===hero.uid);
 const granted=live(played,hero.uid);
 assert.equal(universalBp(opened.pack,played,granted),4000+1000+2500);
 assert.equal(granted.eventSniperGranted.bp,2500);
 played=reach(opened.pack,played,0,'attack');
 const shots=legal(opened.pack,played).filter(a=>a.type==='attack'&&a.uid===hero.uid&&a.targetUid);
 assert.deepEqual(shots.map(a=>a.targetUid),[foe.uid]);
 assert.equal(shots.some(a=>a.targetUid===back.uid),false);
 played=act(opened.pack,played,a=>a.type==='attack'&&a.uid===hero.uid&&a.targetUid===foe.uid);
 assert.equal(played.pending,null);
 assert.equal(played.players[1].front[0],null);
 assert.equal(played.players[0].hand.length,hand+1);
 const plain=open([gen,battle('MHA-1-063'),battle('MHA-1-103')],{seed:6302});
 pay(plain.s,4,1);
 const guy=seat(plain.s,0,'MHA-1-103','front',0,true);
 const blocker=seat(plain.s,1,'GEN','front',0,true);
 [s]=eventPlay(plain.pack,plain.s,'MHA-1-063');
 const before=s.players[0].hand.length;
 s=act(plain.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===guy.uid);
 assert.equal(live(s,guy.uid).eventSniperGranted,undefined);
 assert.equal(universalBp(plain.pack,s,live(s,guy.uid)),2000+2500);
 s=reach(plain.pack,s,0,'attack');
 assert.equal(legal(plain.pack,s).some(a=>a.uid===guy.uid&&a.targetUid),false);
 s=act(plain.pack,s,a=>a.type==='attack'&&a.uid===guy.uid);
 s=act(plain.pack,s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(s.players[0].hand.length,before+1);
 const named=open([gen,battle('MHA-1-063'),battle('MHA-1-106'),alias,senior],{seed:6303});
 pay(named.s,4,1);
 const deku=seat(named.s,0,'MHA-1-106','front',0,true);
 const aka=seat(named.s,0,'AKA','front',1,true);
 const long=seat(named.s,0,'SENIOR','energy',3,true);
 [s]=eventPlay(named.pack,named.s,'MHA-1-063');
 assert.ok(s.pending.choices.includes(deku.uid));
 assert.ok(s.pending.choices.includes(aka.uid));
 assert.ok(s.pending.choices.includes(long.uid));
 s=act(named.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===deku.uid);
 assert.equal(live(s,deku.uid).eventSniperGranted.bp,2500);
 const aliasGame=open([gen,battle('MHA-1-063'),alias],{seed:6304});
 pay(aliasGame.s,4,1);
 const copied=seat(aliasGame.s,0,'AKA','front',0,true);
 [s]=eventPlay(aliasGame.pack,aliasGame.s,'MHA-1-063');
 s=act(aliasGame.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===copied.uid);
 assert.equal(live(s,copied.uid).eventSniperGranted.bp,2500);
 const miss=open([gen,battle('MHA-1-063'),senior],{seed:6305});
 pay(miss.s,4,1);
 const partial=seat(miss.s,0,'SENIOR','front',0,true);
 [s]=eventPlay(miss.pack,miss.s,'MHA-1-063');
 s=act(miss.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===partial.uid);
 assert.equal(live(s,partial.uid).eventSniperGranted,undefined);
 assert.equal(universalBp(miss.pack,s,live(s,partial.uid)),1000+2500);
});

test('MHA-1-063 special trigger retires one opposing front character',()=>{
 const opened=open([battle('MHA-1-063'),battle('MHA-1-103')],{seed:6311,phase:'attack'});
 let s=opened.s;
 const attacker=seat(s,0,'MHA-1-103','front',0,true);
 const extra=seat(s,0,'FILL-01','front',1,true);
 const hidden=seat(s,0,'FILL-02','energy',0,true);
 const trig=pull(s,1,'MHA-1-063');
 s.players[1].life.unshift(trig);
 s=act(opened.pack,s,{type:'attack',uid:attacker.uid});
 s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const modes=legal(opened.pack,s).filter(a=>a.type==='chooseTrigger');
 assert.ok(modes.some(a=>a.mode==='skip'));
 assert.ok(modes.some(a=>a.mode==='special'&&a.uid===attacker.uid));
 assert.ok(modes.some(a=>a.mode==='special'&&a.uid===extra.uid));
 assert.equal(modes.some(a=>a.uid===hidden.uid),false);
 const skipped=act(opened.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.ok(skipped.players[0].front.some(c=>c?.uid===attacker.uid));
 s=act(opened.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===extra.uid);
 assert.equal(s.players[0].front[1],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===extra.uid),true);
 assert.ok(s.players[0].front.some(c=>c?.uid===attacker.uid));
});

test('MHA-1-101 active trigger readies an own character, including one already active',()=>{
 const opened=open([battle('MHA-1-101'),battle('MHA-1-108')],{seed:10101,phase:'attack'});
 let s=opened.s;
 const striker=seat(s,0,'FILL-01','front',0,true);
 const rested=seat(s,1,'FILL-02','front',0,false);
 const already=seat(s,1,'FILL-03','front',1,true);
 const energyChar=seat(s,1,'FILL-04','energy',0,false);
 const field=seat(s,1,'MHA-1-108','energy',1,true);
 const trig=pull(s,1,'MHA-1-101');
 s.players[1].life.unshift(trig);
 s=act(opened.pack,s,{type:'attack',uid:striker.uid});
 s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'active');
 assert.equal(pack.cards['MHA-1-101'].triggerEffect,null);
 const modes=legal(opened.pack,s).filter(a=>a.type==='chooseTrigger');
 assert.ok(modes.some(a=>a.mode==='skip'));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===rested.uid));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===already.uid));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===energyChar.uid));
 assert.equal(modes.some(a=>a.uid===field.uid),false);
 assert.equal(modes.some(a=>a.uid===striker.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,{type:'chooseTrigger',mode:'active',uid:striker.uid}),
  /not currently legal|Illegal ACTIVE/);
 const skipped=act(opened.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(live(skipped,rested.uid).ready,false);
 assert.equal(universalBp(opened.pack,skipped,live(skipped,rested.uid)),1000);
 s=act(opened.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(live(s,rested.uid).ready,true);
 assert.equal(universalBp(opened.pack,s,live(s,rested.uid)),4000);
 const again=open([battle('MHA-1-101')],{seed:10102,phase:'attack'});
 const attacker=seat(again.s,0,'FILL-01','front',0,true);
 const liveOne=seat(again.s,1,'FILL-02','front',0,true);
 again.s.players[1].life.unshift(pull(again.s,1,'MHA-1-101'));
 s=act(again.pack,again.s,{type:'attack',uid:attacker.uid});
 s=act(again.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 s=act(again.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===liveOne.uid);
 assert.equal(live(s,liveOne.uid).ready,true);
 assert.equal(universalBp(again.pack,s,live(s,liveOne.uid)),4000);
 const paid=open([gen,battle('MHA-1-101')],{seed:10103});
 pay(paid.s,0,0);
 assert.equal(legal(paid.pack,paid.s).some(a=>a.type==='play'&&a.uid===hold(paid.s,'MHA-1-101').uid),false);
 pay(paid.s,3,1);
 const [entered,card]=play(paid.pack,paid.s,'MHA-1-101','front');
 assert.equal(entered.pending,null);
 assert.equal(live(entered,card.uid).ready,false);
 assert.equal(universalBp(paid.pack,entered,live(entered,card.uid)),3000);
});

test('MHA-1-102 deals 2 damage, gains own-turn BP, and the lasting bonus only on the front',()=>{
 const opened=open([gen,battle('MHA-1-102')],{seed:10201});
 let s=opened.s;
 pay(s,4,1);
 hold(s,'MHA-1-102');
 assert.equal(legal(opened.pack,s).some(a=>a.type==='play'&&a.uid===s.players[0].hand.find(c=>c.cardId==='MHA-1-102').uid),false);
 pay(s,4,2);
 let [played,card]=play(opened.pack,s,'MHA-1-102','front');
 let self=live(played,card.uid);
 assert.equal(universalBp(opened.pack,played,self),6000);
 played=reach(opened.pack,played,1,'main');
 self=live(played,card.uid);
 assert.equal(universalBp(opened.pack,played,self),5000);
 played=reach(opened.pack,played,0,'start');
 self=live(played,card.uid);
 assert.equal(universalBp(opened.pack,played,self),5000);
 const energyLine=open([gen,battle('MHA-1-102')],{seed:10202});
 pay(energyLine.s,4,2);
 [played,card]=play(energyLine.pack,energyLine.s,'MHA-1-102','energy',2);
 self=live(played,card.uid);
 assert.equal(universalBp(energyLine.pack,played,self),5000);
 assert.equal((self.buffs||[]).some(b=>Number.isInteger(b.untilOwnTurnStart)),false);
 const damage=open([gen,battle('MHA-1-102'),battle('MHA-1-103')],{seed:10203,phase:'attack'});
 pay(damage.s,0,2);
 const mighty=seat(damage.s,0,'MHA-1-102','front',0,true);
 const vanilla=seat(damage.s,0,'MHA-1-103','front',1,true);
 blankLife(damage.s,1);
 const before=damage.s.players[1].life.length;
 const snapshot=structuredClone(damage.s);
 s=act(damage.pack,damage.s,{type:'attack',uid:mighty.uid});
 if(s.pending?.kind==='block')s=act(damage.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.players[1].life.length,before-2);
 assert.equal(s.players[1].lifeRevealed.length,2);
 const one=act(damage.pack,snapshot,{type:'attack',uid:vanilla.uid});
 const afterOne=one.pending?.kind==='block'
  ?act(damage.pack,one,a=>a.type==='chooseBlock'&&a.uid===null):one;
 assert.equal(afterOne.players[1].life.length,before-1);
});

test('MHA-1-105 retires at most one opposing front character of BP 2500 or less',()=>{
 const lowCard=face({id:'LOW',name:'低',bp:2500});
 const highCard=face({id:'HIGH',name:'高',bp:3000});
 const opened=open([gen,battle('MHA-1-105'),lowCard,highCard],{seed:10501,phase:'attack'});
 let s=opened.s;
 pay(s,0,1);
 const unpaid=seat(s,0,'MHA-1-105','front',0,true);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='attack'&&a.uid===unpaid.uid),true);
 const low=seat(s,1,'LOW','front',0,true);
 const high=seat(s,1,'HIGH','front',1,true);
 const back=seat(s,1,'GEN','energy',0,true);
 s=act(opened.pack,s,{type:'attack',uid:unpaid.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[low.uid]);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,{type:'chooseRetireBp',uid:high.uid}),
  /not currently legal|Illegal BP/);
 const skipped=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===null);
 assert.equal(skipped.players[1].front[0].uid,low.uid);
 assert.equal(skipped.pending.kind,'block');
 s=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===low.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[1].front[1].uid,high.uid);
 const none=open([battle('MHA-1-105'),battle('MHA-1-106')],{seed:10502,phase:'attack'});
 const lone=seat(none.s,0,'MHA-1-105','front',0,true);
 seat(none.s,1,'MHA-1-106','front',0,true);
 s=act(none.pack,none.s,{type:'attack',uid:lone.uid});
 assert.equal(s.pending.kind,'block');
 const cost=open([gen,battle('MHA-1-105')],{seed:10503});
 pay(cost.s,4,1);
 const unpaidCard=hold(cost.s,'MHA-1-105');
 assert.equal(legal(cost.pack,cost.s).some(a=>a.type==='play'&&a.uid===unpaidCard.uid),false);
 pay(cost.s,4,2);
 const [entered]=play(cost.pack,cost.s,'MHA-1-105','front');
 assert.equal(entered.pending,null);
 assert.equal(universalBp(cost.pack,entered,entered.players[0].front.find(c=>c?.cardId==='MHA-1-105')),4000);
});

test('MHA-1-106 gains BP only while three opposing face-up front characters are present',()=>{
 const opened=open([gen,battle('MHA-1-106'),battle('MHA-1-103')],{seed:10601});
 let s=opened.s;
 pay(s,3,0);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='play'),false);
 pay(s,3,1);
 const [played,card]=play(opened.pack,s,'MHA-1-106','front');
 s=played;
 assert.equal(universalBp(opened.pack,s,live(s,card.uid)),3000);
 seat(s,1,'FILL-01','front',0,true);
 seat(s,1,'FILL-02','front',1,true);
 seat(s,0,'MHA-1-103','front',1,true);
 seat(s,1,'GEN','energy',0,true);
 assert.equal(universalBp(opened.pack,s,live(s,card.uid)),3000);
 const hidden=seat(s,1,'FILL-03','front',2,true);
 hidden.faceDown=true;
 assert.equal(universalBp(opened.pack,s,live(s,card.uid)),3000);
 hidden.faceDown=false;
 assert.equal(universalBp(opened.pack,s,live(s,card.uid)),4000);
 s.players[1].front[2]=null;
 s.players[1].energy[2]=hidden;
 assert.equal(universalBp(opened.pack,s,live(s,card.uid)),3000);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
});

test('MHA-1-107 raids a named character, deals impact, and draws only at three opposing front characters',()=>{
 const bodies=[gen,battle('MHA-1-107'),battle('MHA-1-106'),battle('MHA-1-103')];
 const low=open(bodies,{seed:10701});
 pay(low.s,4,1);
 seat(low.s,1,'FILL-01','front',0,true);
 seat(low.s,1,'FILL-02','front',1,true);
 hold(low.s,'MHA-1-107');
 const lowHand=low.s.players[0].hand.length,lowDeck=low.s.players[0].deck.length;
 let [s]=play(low.pack,low.s,'MHA-1-107','front');
 assert.equal(s.players[0].hand.length,lowHand-1);
 assert.equal(s.players[0].deck.length,lowDeck);
 assert.equal(s.pending,null);
 const high=open(bodies,{seed:10702});
 pay(high.s,4,1);
 seat(high.s,1,'FILL-01','front',0,true);
 seat(high.s,1,'FILL-02','front',1,true);
 seat(high.s,1,'FILL-03','front',2,true);
 hold(high.s,'MHA-1-107');
 const highHand=high.s.players[0].hand.length,highDeck=high.s.players[0].deck.length;
 [s]=play(high.pack,high.s,'MHA-1-107','front');
 assert.equal(s.players[0].hand.length,highHand);
 assert.equal(s.players[0].deck.length,highDeck-1);
 const moved=open(bodies,{seed:10703});
 pay(moved.s,4,1);
 const base=seat(moved.s,0,'MHA-1-106','energy',3,false);
 const raider=hold(moved.s,'MHA-1-107');
 const raids=legal(moved.pack,moved.s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.ok(raids.some(a=>a.line!=='energy'&&a.baseUid===base.uid&&Number.isInteger(a.slot)));
 assert.ok(raids.some(a=>a.line==='energy'&&a.slot===3&&a.baseUid===base.uid));
 s=act(moved.pack,moved.s,a=>a.type==='raid'&&a.uid===raider.uid&&a.line!=='energy');
 const top=s.players[0].front.find(Boolean);
 assert.equal(top.cardId,'MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
 assert.equal(s.players[0].energy[3],null);
 const stayed=open(bodies,{seed:10704});
 pay(stayed.s,4,1);
 const pile=seat(stayed.s,0,'MHA-1-106','energy',3,false);
 const card=hold(stayed.s,'MHA-1-107');
 s=act(stayed.pack,stayed.s,a=>a.type==='raid'&&a.uid===card.uid&&a.line==='energy'&&a.slot===3);
 assert.equal(s.players[0].energy[3].cardId,'MHA-1-107');
 assert.equal(s.players[0].energy[3].stack[0].cardId,'MHA-1-106');
 assert.equal(s.players[0].front.some(Boolean),false);
 assert.equal(pile.cardId,'MHA-1-106');
 const fixed=open(bodies,{seed:10705});
 pay(fixed.s,4,1);
 const front=seat(fixed.s,0,'MHA-1-106','front',0,false);
 const hand=hold(fixed.s,'MHA-1-107');
 const only=legal(fixed.pack,fixed.s).filter(a=>a.type==='raid'&&a.uid===hand.uid);
 assert.ok(only.length>0);
 assert.ok(only.every(a=>a.line!=='energy'&&a.slot===0));
 assert.throws(()=>dispatchUniversalAction(fixed.pack,fixed.s,
  {type:'raid',uid:hand.uid,baseUid:front.uid,line:'front',slot:1}),/not currently legal/);
 const impact=open(bodies,{seed:10706,phase:'attack'});
 const attacker=seat(impact.s,0,'MHA-1-107','front',0,true);
 const blocker=seat(impact.s,1,'MHA-1-103','front',0,true);
 blankLife(impact.s,1);
 const life=impact.s.players[1].life.length+impact.s.players[1].lifeRevealed.length;
 s=act(impact.pack,impact.s,{type:'attack',uid:attacker.uid});
 s=act(impact.pack,s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(s.players[1].life.length+s.players[1].lifeRevealed.length,life-1);
 assert.equal(s.players[1].front[0],null);
 const other=open([gen,battle('MHA-1-107'),battle('MHA-1-105')],{seed:10707});
 pay(other.s,4,1);
 const wrong=seat(other.s,0,'MHA-1-105','energy',3,false);
 hold(other.s,'MHA-1-107');
 assert.equal(legal(other.pack,other.s).some(a=>a.type==='raid'&&a.baseUid===wrong.uid),false);
});

test('MHA-1-108 adds one green energy only while two own front characters are present',()=>{
 const back=face({id:'BACK',name:'能量',gen:0});
 const opened=open([gen,battle('MHA-1-108'),back],{seed:10801});
 let s=opened.s;
 pay(s,2,0);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='play'),false);
 pay(s,2,1);
 const [played,card]=play(opened.pack,s,'MHA-1-108','energy',1);
 s=played;
 assert.equal(live(s,card.uid).cardId,'MHA-1-108');
 const base=energy(opened.pack,s).green;
 seat(s,0,'FILL-01','front',0,true);
 assert.equal(energy(opened.pack,s).green,base);
 seat(s,0,'BACK','energy',2,true);
 seat(s,1,'FILL-02','front',0,true);
 assert.equal(energy(opened.pack,s).green,base);
 seat(s,0,'FILL-03','front',1,true);
 assert.equal(energy(opened.pack,s).green,base+1);
 const opp=reach(opened.pack,s,1,'main');
 assert.equal(energy(opened.pack,opp).green,base+1);
 assert.equal(assertUniversalMatch(opened.pack,opp),true);
});

test('MHA-1-109 publishes one character and draws only when that card is Midoriya',()=>{
 const opened=open([gen,battle('MHA-1-109'),battle('MHA-1-063'),battle('MHA-1-105'),
  battle('MHA-1-106'),battle('MHA-1-108'),battle('MHA-1-103'),battle('MHA-1-104')],{seed:10901});
 let s=opened.s;
 pay(s,2,0);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='event'),false);
 pay(s,2,1);
 const window=stackTop(s,['MHA-1-063','MHA-1-105','MHA-1-106','MHA-1-108','MHA-1-103','MHA-1-104']);
 const next=window[5];
 [s]=eventPlay(opened.pack,s,'MHA-1-109');
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 const mine=universalPrivateChoices(opened.pack,s,0);
 assert.deepEqual(mine.inspected.map(c=>c.cardId),
  ['MHA-1-063','MHA-1-105','MHA-1-106','MHA-1-108','MHA-1-103']);
 const picks=mine.options.filter(o=>o.action.mode==='pick').map(o=>o.card.cardId).sort();
 assert.deepEqual(picks,['MHA-1-103','MHA-1-105','MHA-1-106']);
 const eventUid=mine.inspected.find(c=>c.cardId==='MHA-1-063').uid;
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,{type:'chooseTopScript',mode:'pick',uid:eventUid}),
  /not currently legal|cannot take/);
 assert.equal(JSON.stringify(universalPublicView(opened.pack,s,1).pending).includes('MHA-1-063'),false);
 const heroUid=mine.inspected.find(c=>c.cardId==='MHA-1-106').uid;
 s=act(opened.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='pick'&&a.uid===heroUid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.players[0].hand.some(c=>c.uid===next.uid),false);
 assert.equal(universalPublicView(opened.pack,s,1).publicReveals.some(x=>x.cardId==='MHA-1-106'),true);
 assert.equal(universalPublicView(opened.pack,s,1).publicReveals.some(x=>x.cardId==='MHA-1-063'),false);
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 s=finishOrder(opened.pack,s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===heroUid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===next.uid),true);
 assert.equal(s.players[0].deck.slice(-4).some(c=>c.uid===window[0].uid),true);
 const windowCards=[gen,battle('MHA-1-109'),battle('MHA-1-063'),battle('MHA-1-105'),
  battle('MHA-1-106'),battle('MHA-1-108'),battle('MHA-1-103'),battle('MHA-1-104')];
 const miss=open(windowCards,{seed:10902});
 pay(miss.s,2,1);
 const missed=stackTop(miss.s,['MHA-1-063','MHA-1-105','MHA-1-106','MHA-1-108','MHA-1-103','MHA-1-104']);
 [s]=eventPlay(miss.pack,miss.s,'MHA-1-109');
 s=act(miss.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='pick'&&a.uid===missed[1].uid);
 s=finishOrder(miss.pack,s);
 assert.equal(s.players[0].hand.some(c=>c.uid===missed[1].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===missed[5].uid),false);
 assert.equal(s.players[0].deck[0].uid,missed[5].uid);
 const skipped=open(windowCards,{seed:10903});
 pay(skipped.s,2,1);
 const kept=stackTop(skipped.s,['MHA-1-063','MHA-1-105','MHA-1-106','MHA-1-108','MHA-1-103','MHA-1-104']);
 [s]=eventPlay(skipped.pack,skipped.s,'MHA-1-109');
 s=act(skipped.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='skip');
 s=finishOrder(skipped.pack,s);
 assert.equal(s.players[0].hand.some(c=>kept.some(card=>card.uid===c.uid)),false);
 assert.equal(s.players[0].deck[0].uid,kept[5].uid);
 assert.equal(universalPublicView(skipped.pack,s,1).publicReveals.some(x=>x.cardId==='MHA-1-106'),false);
});

test('UA10ST life triggers use the printed choice, including a raid onto Midoriya',()=>{
 const cards=[gen,battle('MHA-1-065'),battle('MHA-1-102'),battle('MHA-1-107'),
  battle('MHA-1-109'),battle('MHA-1-106')];
 function reveal(id,seed,prepare){
  const opened=open(cards,{seed,phase:'attack'});
  const attacker=seat(opened.s,0,'FILL-01','front',0,true);
  if(prepare)prepare(opened);
  opened.s.players[1].life.unshift(pull(opened.s,1,id));
  let s=act(opened.pack,opened.s,{type:'attack',uid:attacker.uid});
  if(s.pending?.kind==='block')s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
  return {pack:opened.pack,s};
 }
 const got=reveal('MHA-1-102',5701);
 assert.equal(got.s.pending.trigger,'get');
 const hand=got.s.players[1].hand.length;
 const copies=got.s.players[1].hand.filter(c=>c.cardId==='MHA-1-102').length;
 const taken=act(got.pack,got.s,a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.equal(taken.players[1].hand.filter(c=>c.cardId==='MHA-1-102').length,copies+1);
 assert.equal(taken.players[1].hand.length,hand+1);
 const drawn=reveal('MHA-1-109',5702);
 assert.equal(drawn.s.pending.trigger,'draw');
 const before=drawn.s.players[1].hand.length;
 const drew=act(drawn.pack,drawn.s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(drew.players[1].hand.length,before+1);
 const skipped=act(drawn.pack,drawn.s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(skipped.players[1].hand.length,before);
 const early=reveal('MHA-1-065',5703);
 assert.equal(early.s.players[1].life.length>0,true);
 if(early.s.pending){
  assert.notEqual(early.s.pending.trigger,'final');
  assert.equal(legal(early.pack,early.s).some(a=>a.mode==='final'),false);
 }
 const last=reveal('MHA-1-065',5704,opened=>{
  const extra=opened.s.players[1].life.splice(0);
  opened.s.players[1].deck.push(...extra);
 });
 assert.equal(last.s.players[1].life.length,0);
 assert.equal(legal(last.pack,last.s).some(a=>a.type==='chooseTrigger'&&a.mode==='final'),true);
 const restored=act(last.pack,last.s,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(restored.players[1].life.length,1);
 const dry=reveal('MHA-1-107',5705,opened=>{
  seat(opened.s,1,'MHA-1-106','energy',2,false);
 });
 assert.equal(dry.s.pending.trigger,'raid');
 assert.equal(legal(dry.pack,dry.s).some(a=>a.mode==='get'),true);
 assert.equal(legal(dry.pack,dry.s).some(a=>a.mode==='raid'),false);
 const paid=reveal('MHA-1-107',5706,opened=>{
  pay(opened.s,4,1,1);
  seat(opened.s,1,'MHA-1-106','energy',2,false);
 });
 const raid=legal(paid.pack,paid.s).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.line==='front');
 assert.ok(raid);
 const entered=act(paid.pack,paid.s,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.line==='front'&&a.baseUid===raid.baseUid);
 const top=entered.players[1].front.find(c=>c?.cardId==='MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
});
