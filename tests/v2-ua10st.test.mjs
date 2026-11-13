import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {mhaCatalog,mhaEditorCards} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {createMhaV2Pack,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {MHA_UA10ST_PROGRAMS} from '../dist/universal-v2/mha/programs.mjs';
import {MHA_UA10ST_REQUESTS} from '../dist/universal-v2/mha/requests.mjs';
import {MHA_PROGRAMS_001_050} from '../dist/universal-v2/mha/programs-001-050.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_001_050} from '../dist/universal-v2/mha/requests-001-050.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const READY=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-065','MHA-1-103','MHA-1-104'];
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
 for(const card of catalog.ap){
  assert.equal(card.deckLegal,false);
  assert.equal(card.type,'action-point');
  assert.equal(card.nameJa.includes('僕のヒーローアカデミア'),true);
 }
});

test('only complete UA10ST sentences enter the battle pack',()=>{
 assert.deepEqual(Object.keys(MHA_UA10ST_PROGRAMS).sort(),[...READY].sort());
 assert.deepEqual(OPEN,['MHA-1-063','MHA-1-101','MHA-1-102','MHA-1-105',
  'MHA-1-106','MHA-1-107','MHA-1-108','MHA-1-109']);
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

test('the closed MHA pack is 49 ready cards among 109 distinct deck cards',()=>{
 const editor=mhaEditorCards();
 assert.equal(editor.length,109);
 assert.equal(new Set(editor.map(card=>card.id)).size,109);
 assert.equal(editor.every(card=>card.playable===false&&card.battleReady===false&&card.deckLegal===true),true);
 const ready=Object.keys(pack.cards);
 assert.equal(ready.length,49);
 const pending=editor.map(card=>card.id).filter(id=>!pack.cards[id]);
 assert.equal(pending.length,60);
 assert.deepEqual(ready,editor.map(card=>card.id).filter(id=>pack.cards[id]));
 assert.equal(pack.cards['MHA-1-012'].mainAbility.op,'restSelfGainEnergyRetireEndMain');
 assert.equal(pack.cards['MHA-1-012'].mainAbility.extraEnergy,1);
 assert.equal(pack.cards['MHA-1-019'].mainAbility.then[0].op,'enemyBpDown');
 assert.equal(pack.cards['MHA-1-019'].mainAbility.then[0].minBp,1500);
 assert.equal(pack.cards['MHA-1-019'].mainAbility.then[0].zone,'front');
 assert.equal(pack.cards['MHA-1-027'].passiveBonuses[0].condition.kind,'ownNameOrRaidBase');
 assert.equal(pack.cards['MHA-1-027'].passiveBonuses[0].condition.zone,'front');
 assert.equal(pack.cards['MHA-1-027'].passiveBonuses[0].condition.name,'オーバーホール');
 assert.equal(pack.cards['MHA-1-053'].effects.onAttack[0].op,'chooseOne');
 assert.equal(pack.cards['MHA-1-053'].effects.onAttack[0].optional,false);
 assert.deepEqual(pack.cards['MHA-1-053'].effects.onAttack[0].options.map(option=>option.id),['bp','impact']);
 assert.equal(pack.cards['MHA-1-053'].effects.onAttack[0].options[1].then[0].amount,1);
 for(const id of ['MHA-1-012','MHA-1-019','MHA-1-027','MHA-1-053'])
  assert.equal(pending.includes(id),false);
 for(const id of OPEN){
  assert.equal(pending.includes(id),true,id);
  assert.equal(pack.cards[id],undefined,id);
 }
 const requestIds=new Set([
  ...Object.keys(MHA_REQUESTS_001_050),
  ...MHA_REQUESTS_051_100.map(row=>row.cardId),
  ...MHA_UA10ST_REQUESTS.map(row=>row.cardId)
 ]);
 assert.equal(requestIds.size,60);
 assert.deepEqual([...requestIds].sort(),pending.slice().sort());
 const sharedPending=MHA_UA10ST_REQUESTS.map(row=>row.cardId)
  .filter(id=>MHA_REQUESTS_051_100.some(row=>row.cardId===id)||Object.hasOwn(MHA_REQUESTS_001_050,id));
 assert.deepEqual(sharedPending,['MHA-1-063']);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(getTitle('imc').playable,false);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-012'].ready,true);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-019'].ready,true);
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-027'].ready,true);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-053'].ready,true);
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
