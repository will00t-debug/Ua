// UA40BT/REZ-1-076–088. Official pages and card images checked 2026-11-11.
// Each case plays that card. A shared sentence on another number is not evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,rezeroPackCard} from '../dist/universal-v2/rezero-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 effectiveHandRequiredEnergy,universalPrivateChoices,universalPublicView
} from '../dist/universal-v2/engine.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const FILL=['REZ-1-086','REZ-1-072','REZ-1-068','REZ-1-081','REZ-1-084','REZ-1-085',
 'REZ-1-007','REZ-1-014','REZ-1-043','REZ-1-036','REZ-1-001','REZ-1-006',
 'REZ-1-012','REZ-1-013','REZ-1-022','REZ-1-037','REZ-1-038','REZ-1-045'];
function counts(extra){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of FILL){
  const add=Math.min(4-(c[id]||0),50-n);
  if(add>0){c[id]=(c[id]||0)+add;n+=add;}
  if(n===50)break;
 }
 assert.equal(n,50);
 assert.deepEqual(validateUniversalDeck(pack,c),[]);
 return c;
}
const fresh=(seed,extra)=>newUniversalMatch(packs,{decks:[counts(extra),counts(extra)],first:0,seed});
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function fuel(s,ids,p=0){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=false;
  s.players[p].energy[i]=card;
 });
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function legal(s){return legalUniversalActions(packs,s);}
function act(s,action){return dispatchUniversalAction(packs,s,action);}
function reach(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++){
  const next=legal(s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase+' '+(s.pending?.kind||s.phase));
  s=act(s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function play(s,id,line='front',p=0){
 const card=pull(s,p,id);
 s.players[p].hand.push(card);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [act(s,action),card];
}
function raid(s,id,baseUid){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legal(s).find(a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===baseUid);
 assert.ok(action,id+' raid');
 return [act(s,action),card];
}
function setTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=act(s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function armLife(s,owner,id){
 const trigger=pull(s,owner,id);
 while(s.players[owner].life.length>=7)
  s.players[owner].deck.push(s.players[owner].life.shift());
 s.players[owner].life.unshift(trigger);
 assert.equal(s.players[owner].life[0].uid,trigger.uid);
 return trigger;
}
function readyAp(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function live(s,uid){
 for(const pl of s.players){
  for(const zone of ['front','energy','hand','deck','outside','life','removed']){
   const found=(pl[zone]||[]).find(c=>c?.uid===uid);
   if(found)return found;
  }
 }
 throw Error('Missing physical '+uid);
}
function toOpponentMain(s){
 for(let guard=0;guard<24&&!(s.active===1&&s.phase==='main'&&!s.pending);guard++){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
  }else if(s.pending?.kind==='block'){
   s=act(s,{type:'chooseBlock',uid:null});
  }else{
   const next=legal(s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=act(s,next);
  }
 }
 assert.equal(s.active,1);
 assert.equal(s.phase,'main');
 return s;
}
function restByTrial(s,uid){
 const trial=pull(s,0,'REZ-1-098');
 s.players[0].hand.push(trial);
 s=act(s,legal(s).find(a=>a.type==='event'&&a.uid===trial.uid));
 assert.equal(s.pending.kind,'effect-discard');
 const dumped=s.players[0].hand.find(c=>c.uid!==trial.uid);
 s=act(s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(s.pending.kind,'effect-rest-front-ap');
 assert.ok(s.pending.choices.includes(uid));
 s=act(s,{type:'chooseRestFrontAp',uid});
 if(s.pending?.kind==='effect-recover-ap')s=act(s,{type:'chooseApRecovery',uid:null});
 assert.equal(live(s,uid).ready,false);
 return s;
}

test('printed text, energy orbs and raid panels match the 2026-11-11 card images',()=>{
 const expect={
  'REZ-1-076':{energy:2,bp:3000,gen:1,trigger:'color'},
  'REZ-1-077':{energy:3,bp:3500,gen:1,trigger:'raid'},
  'REZ-1-078':{energy:4,bp:4000,gen:1,trigger:'raid'},
  'REZ-1-079':{energy:3,bp:3000,gen:2,trigger:null},
  'REZ-1-080':{energy:1,bp:1500,gen:2,trigger:null},
  'REZ-1-081':{energy:0,bp:2000,gen:1,trigger:'draw'},
  'REZ-1-082':{energy:0,bp:1000,gen:1,trigger:null},
  'REZ-1-083':{energy:0,bp:1000,gen:1,trigger:'active'},
  'REZ-1-084':{energy:1,bp:2500,gen:1,trigger:'active'},
  'REZ-1-085':{energy:2,bp:3000,gen:1,trigger:'draw'},
  'REZ-1-086':{energy:2,bp:2500,gen:1,trigger:null},
  'REZ-1-087':{energy:4,bp:3000,gen:1,trigger:'draw'},
  'REZ-1-088':{energy:3,bp:3000,gen:2,trigger:'active'}
 };
 for(const [id,row] of Object.entries(expect)){
  const card=REZERO_BY_ID[id];
  assert.equal(card.energy,row.energy,id);
  assert.equal(card.bp,row.bp,id);
  assert.equal(card.gen,row.gen,id);
  assert.equal(card.trigger,row.trigger,id);
  assert.equal(card.color,'purple',id);
  assert.equal(pack.cards[id].gen,row.gen,id);
 }
 assert.equal(raidBoxListed('REZ-1-077','onPlay'),true);
 assert.equal(raidBoxListed('REZ-1-077','passive'),true);
 assert.equal(raidBoxListed('REZ-1-078','onPlay'),true);
 assert.equal(raidBoxListed('REZ-1-078','passive'),true);
 for(const id of ['REZ-1-076','REZ-1-079','REZ-1-080','REZ-1-081','REZ-1-082','REZ-1-083',
  'REZ-1-084','REZ-1-085','REZ-1-086','REZ-1-087','REZ-1-088']){
  for(const feature of ['onPlay','passive','main'])assert.equal(raidBoxListed(id,feature),false,id+' '+feature);
 }
 assert.equal(pack.cards['REZ-1-076'].impactNull,true);
 assert.equal(pack.cards['REZ-1-086'].activeExtraEnergy,1);
 assert.equal(pack.cards['REZ-1-087'].ownTurnBp,1000);
});

test('REZ-1-076 places one private hand card on top and gains 1000 only from the front',()=>{
 let s=reach(fresh(7601,{'REZ-1-076':2}),'main');
 fuel(s,['REZ-1-086','REZ-1-086']);
 const marker=pull(s,0,'REZ-1-081');
 s.players[0].hand.push(marker);
 let actor;
 [s,actor]=play(s,'REZ-1-076');
 assert.equal(s.pending,null);
 assert.equal(live(s,actor.uid).ready,false);
 assert.equal(universalBp(packs,s,live(s,actor.uid)),3000);
 const reveals=s.publicReveals.length;
 const top=s.players[0].deck[0];
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='frontOnce'));
 assert.equal(s.pending.kind,'effect-hand-top');
 assert.equal(legal(s).some(a=>a.type==='chooseHandTop'&&a.uid==null),false);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).pending.kind,'effect-hand-top');
 assert.equal(Object.hasOwn(universalPublicView(packs,s,1).pending,'choices'),false);
 const seen=universalPrivateChoices(packs,s,0);
 assert.ok(seen.options.some(o=>o.card?.cardId==='REZ-1-081'&&o.action.uid===marker.uid));
 s=act(s,{type:'chooseHandTop',uid:marker.uid});
 assert.equal(s.players[0].deck[0].uid,marker.uid);
 assert.equal(s.players[0].deck[1].uid,top.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===marker.uid),false);
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(universalBp(packs,s,live(s,actor.uid)),4000);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 s=toOpponentMain(s);
 assert.equal(universalBp(packs,s,live(s,actor.uid)),3000);

 let empty=reach(fresh(7602,{'REZ-1-076':1}),'main');
 fuel(empty,['REZ-1-086','REZ-1-086']);
 let quiet;
 [empty,quiet]=play(empty,'REZ-1-076');
 empty.players[0].outside.push(...empty.players[0].hand.splice(0));
 assert.equal(legal(empty).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);

 let lined=reach(fresh(7603,{'REZ-1-076':1}),'main');
 fuel(lined,['REZ-1-086','REZ-1-086']);
 let energyCard;
 [lined,energyCard]=play(lined,'REZ-1-076','energy');
 assert.equal(legal(lined).some(a=>a.type==='activate'&&a.uid===energyCard.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
 assert.equal(assertUniversalMatch(packs,lined),true);
});

test('REZ-1-076 color trigger deploys one purple energy-2 AP-1 character, active, and can be declined',()=>{
 let s=fresh(7604,{'REZ-1-076':1,'REZ-1-087':1,'REZ-1-098':1});
 const attacker=seat(s,0,'REZ-1-072','front',0,true);
 const match=pull(s,1,'REZ-1-085');
 const edge=pull(s,1,'REZ-1-086');
 const tall=pull(s,1,'REZ-1-087');
 const other=pull(s,1,'REZ-1-007');
 const event=pull(s,1,'REZ-1-098');
 s.players[1].outside.push(match,edge,tall,other,event);
 armLife(s,1,'REZ-1-076');
 s=reach(s,'attack');
 const ap=s.players[1].apCards.filter(c=>c.ready).length;
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'color');
 const choices=legal(s);
 assert.ok(choices.some(a=>a.mode==='colorOutside'&&a.uid===match.uid&&a.line==='front'));
 assert.ok(choices.some(a=>a.mode==='colorOutside'&&a.uid===edge.uid));
 assert.equal(choices.some(a=>a.uid===tall.uid||a.uid===other.uid||a.uid===event.uid),false);
 assert.equal(choices.some(a=>a.line==='energy'),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].outside.some(c=>c.uid===match.uid),true);
 assert.equal(skipped.players[1].front.some(c=>c?.uid===match.uid),false);
 s=act(s,choices.find(a=>a.mode==='colorOutside'&&a.uid===match.uid&&a.replaceUid===undefined));
 assert.equal(s.players[1].front.some(c=>c?.uid===match.uid&&c.ready),true);
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,ap);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('REZ-1-076 removes the attacker impact for that battle',()=>{
 let open=reach(fresh(7605,{'REZ-1-078':1,'REZ-1-076':1,'REZ-1-081':1}),'main');
 fuel(open,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=seat(open,0,'REZ-1-072','front',0,false);
 seat(open,0,'REZ-1-068','front',1,true);
 let raider;
 [open,raider]=raid(open,'REZ-1-078',base.uid);
 assert.equal(universalImpact(pack,open,live(open,raider.uid)),1);
 open=act(open,{type:'chooseActiveOwnNamed',uid:null});
 const wall=seat(open,1,'REZ-1-076','front',0,true);
 const life=open.players[1].life.length;
 open=act(open,legal(open).find(a=>a.type==='next'));
 assert.equal(open.phase,'attack');
 open=act(open,{type:'attack',uid:raider.uid});
 open=act(open,{type:'chooseBlock',uid:wall.uid});
 assert.equal(open.players[1].life.length,life);
 assert.equal(open.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(open.pending,null);

 let hit=reach(fresh(7606,{'REZ-1-078':1,'REZ-1-081':1}),'main');
 fuel(hit,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const home=seat(hit,0,'REZ-1-072','front',0,false);
 seat(hit,0,'REZ-1-068','front',1,true);
 let striker;
 [hit,striker]=raid(hit,'REZ-1-078',home.uid);
 hit=act(hit,{type:'chooseActiveOwnNamed',uid:null});
 const soft=seat(hit,1,'REZ-1-081','front',0,true);
 const before=hit.players[1].life.map(c=>c.uid);
 hit=act(hit,legal(hit).find(a=>a.type==='next'));
 hit=act(hit,{type:'attack',uid:striker.uid});
 hit=act(hit,{type:'chooseBlock',uid:soft.uid});
 assert.equal(hit.players[1].life.length,before.length-1);
 assert.equal(hit.players[1].life.some(c=>c.uid===before[0]),false);
 assert.equal(assertUniversalMatch(packs,open),true);
 assert.equal(assertUniversalMatch(packs,hit),true);
});

test('REZ-1-077 resolves the Subaru bonus and the move only while raided',()=>{
 let plain=reach(fresh(7701,{'REZ-1-077':1}),'main');
 fuel(plain,['REZ-1-086','REZ-1-086','REZ-1-086']);
 seat(plain,0,'REZ-1-068','energy',3,true);
 const victim=seat(plain,1,'REZ-1-014','front',0,true);
 let body;
 [plain,body]=play(plain,'REZ-1-077');
 assert.equal(plain.pending,null);
 assert.equal(live(plain,body.uid).ready,false);
 assert.equal(universalBp(packs,plain,live(plain,body.uid)),3500);
 assert.equal(plain.players[1].front[0].uid,victim.uid);

 let liveRaid=reach(fresh(7702,{'REZ-1-077':1}),'main');
 fuel(liveRaid,['REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=seat(liveRaid,0,'REZ-1-072','front',0,false);
 seat(liveRaid,0,'REZ-1-068','energy',3,true);
 const moved=seat(liveRaid,1,'REZ-1-014','front',0,true);
 let top;
 [liveRaid,top]=raid(liveRaid,'REZ-1-077',base.uid);
 assert.equal(live(liveRaid,top.uid).ready,true);
 assert.equal(live(liveRaid,top.uid).stack[0].uid,base.uid);
 assert.equal(universalBp(packs,liveRaid,live(liveRaid,top.uid)),4000);
 const side=liveRaid.active;
 liveRaid.active=1;
 assert.equal(universalBp(packs,liveRaid,live(liveRaid,top.uid)),3500);
 liveRaid.active=side;
 assert.equal(liveRaid.pending.kind,'effect-move-opp-front');
 assert.equal(liveRaid.pending.optional,true);
 assert.equal(liveRaid.pending.lock,false);
 assert.deepEqual(liveRaid.pending.choices,[moved.uid]);
 const skipped=act(structuredClone(liveRaid),{type:'chooseMoveOppFront',uid:null});
 assert.equal(skipped.players[1].front[0].uid,moved.uid);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='cannotMove'),false);
 liveRaid=act(liveRaid,legal(liveRaid).find(a=>a.type==='chooseMoveOppFront'&&a.uid===moved.uid&&a.replaceUid===undefined));
 assert.equal(liveRaid.players[1].energy.some(c=>c?.uid===moved.uid),true);
 assert.equal(liveRaid.players[1].front[0],null);
 assert.equal(liveRaid.continuousStates.some(e=>e.kind==='cannotMove'),false);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,liveRaid),true);
});

test('REZ-1-077 Q1576 removes one energy card before a full line accepts the front character',()=>{
 let s=reach(fresh(7703,{'REZ-1-077':1}),'main');
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=seat(s,0,'REZ-1-072','front',0,false);
 const victim=seat(s,1,'REZ-1-036','front',0,true);
 const occupants=['REZ-1-007','REZ-1-014','REZ-1-081','REZ-1-068'].map((id,i)=>seat(s,1,id,'energy',i,true));
 let top;
 [s,top]=raid(s,'REZ-1-077',base.uid);
 assert.equal(s.pending.kind,'effect-move-opp-front');
 const shifts=legal(s).filter(a=>a.type==='chooseMoveOppFront'&&a.uid===victim.uid);
 assert.equal(shifts.length,4);
 assert.equal(shifts.some(a=>a.replaceUid===undefined),false);
 const displaced=occupants[2];
 s=act(s,shifts.find(a=>a.replaceUid===displaced.uid));
 assert.equal(s.players[1].energy.some(c=>c?.uid===victim.uid),true);
 assert.equal(s.players[1].removed.some(c=>c.uid===displaced.uid),true);
 assert.equal(s.players[1].hand.some(c=>c.uid===displaced.uid),false);
 assert.equal(live(s,top.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-077 life trigger adds to hand, or raids without the own-effect lock',()=>{
 let short=fresh(7704,{'REZ-1-077':1});
 const attacker=seat(short,0,'REZ-1-072','front',0,true);
 armLife(short,1,'REZ-1-077');
 short=reach(short,'attack');
 short=act(short,{type:'attack',uid:attacker.uid});
 short=act(short,{type:'chooseBlock',uid:null});
 assert.equal(short.pending.trigger,'raid');
 assert.equal(legal(short).some(a=>a.mode==='raid'),false);
 short=act(short,{type:'chooseTrigger',mode:'get'});
 assert.equal(short.players[1].hand.some(c=>c.cardId==='REZ-1-077'),true);

 let paid=fresh(7705,{'REZ-1-077':1});
 fuel(paid,['REZ-1-086','REZ-1-086','REZ-1-086'],1);
 const foe=seat(paid,0,'REZ-1-014','front',0,true);
 const home=seat(paid,1,'REZ-1-072','energy',3,false);
 armLife(paid,1,'REZ-1-077');
 paid=reach(paid,'attack');
 paid=act(paid,{type:'attack',uid:foe.uid});
 paid=act(paid,{type:'chooseBlock',uid:null});
 const ontoFront=legal(paid).find(a=>a.mode==='raid'&&a.baseUid===home.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(ontoFront);
 paid=act(paid,ontoFront);
 assert.equal(paid.players[1].front.some(c=>c?.cardId==='REZ-1-077'&&c.ready&&c.stack[0].uid===home.uid),true);
 assert.equal(paid.pending.kind,'effect-move-opp-front');
 assert.equal(paid.pending.lock,false);
 paid=act(paid,{type:'chooseMoveOppFront',uid:null});
 assert.equal(paid.players[0].front.some(c=>c?.uid===foe.uid),true);
 assert.equal(assertUniversalMatch(packs,short),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
});

test('REZ-1-078 gains impact and readies Subaru only inside the raid panel',()=>{
 let plain=reach(fresh(7801,{'REZ-1-078':1}),'main');
 fuel(plain,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const subaru=seat(plain,0,'REZ-1-068','front',1,false);
 const coming=pull(plain,0,'REZ-1-078');
 plain.players[0].hand.push(coming);
 const deck=plain.players[0].deck.length;
 plain=act(plain,legal(plain).find(a=>a.type==='play'&&a.uid===coming.uid&&a.line==='front'));
 const body=coming;
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(live(plain,subaru.uid).ready,false);
 assert.equal(universalImpact(pack,plain,live(plain,body.uid)),0);
 assert.equal(live(plain,body.uid).ready,false);

 let raided=reach(fresh(7802,{'REZ-1-078':1}),'main');
 fuel(raided,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=seat(raided,0,'REZ-1-072','front',0,false);
 const named=seat(raided,0,'REZ-1-068','front',1,false);
 const other=seat(raided,0,'REZ-1-081','front',2,false);
 let top;
 [raided,top]=raid(raided,'REZ-1-078',base.uid);
 assert.equal(live(raided,top.uid).ready,true);
 assert.equal(universalImpact(pack,raided,live(raided,top.uid)),1);
 assert.equal(raided.pending.kind,'effect-active-own-named');
 assert.equal(raided.pending.choices.includes(named.uid),true);
 assert.equal(raided.pending.choices.includes(other.uid),false);
 assert.equal(raided.pending.choices.includes(top.uid),false);
 const before=raided.players[0].deck.length;
 const skipped=act(structuredClone(raided),{type:'chooseActiveOwnNamed',uid:null});
 assert.equal(live(skipped,named.uid).ready,false);
 assert.equal(skipped.players[0].deck.length,before);
 raided=act(raided,{type:'chooseActiveOwnNamed',uid:named.uid});
 assert.equal(live(raided,named.uid).ready,true);
 assert.equal(raided.players[0].deck.length,before);
 const held=raided.players[0].front[1];
 raided.players[0].front[1]=null;
 const displaced=raided.players[0].energy[0];
 raided.players[0].energy[0]=held;
 assert.equal(universalImpact(pack,raided,live(raided,top.uid)),1);
 raided.players[0].energy[0]=displaced;
 raided.players[0].deck.push(held);
 assert.equal(universalImpact(pack,raided,live(raided,top.uid)),0);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,raided),true);
});

test('REZ-1-078 draws only after an own-effect raid, including a life raid that does not draw',()=>{
 let life=fresh(7803,{'REZ-1-078':1});
 fuel(life,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086'],1);
 const attacker=seat(life,0,'REZ-1-014','front',0,true);
 const home=seat(life,1,'REZ-1-072','front',0,false);
 const subaru=seat(life,1,'REZ-1-068','front',1,false);
 armLife(life,1,'REZ-1-078');
 life=reach(life,'attack');
 life=act(life,{type:'attack',uid:attacker.uid});
 life=act(life,{type:'chooseBlock',uid:null});
 const deck=life.players[1].deck.length;
 life=act(life,legal(life).find(a=>a.mode==='raid'&&a.baseUid===home.uid&&a.line==='front'));
 assert.equal(life.pending.kind,'effect-active-own-named');
 life=act(life,{type:'chooseActiveOwnNamed',uid:subaru.uid});
 assert.equal(live(life,subaru.uid).ready,true);
 assert.equal(life.players[1].deck.length,deck);

 const lab=(id)=>({id,name:id,color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rez-078-own',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-078']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-072']),
  {id:'LAB-SUB',name:'ナツキ・スバル',color:'purple',type:'character',energy:0,ap:1,bp:1500,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-DEPLOY',name:'Deploy',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'dsl',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
    color:'purple',maxEnergy:4,ap:1,max:1,optional:true,names:['ベアトリス']}]}},
  ...['A','B','C','D','E','F','G','H','I'].map(id=>lab('LAB-'+id))
 ]});
 const fixtureCounts={'REZ-1-078':4,'REZ-1-072':4,'LAB-SUB':4,'LAB-DEPLOY':4,
  'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':4,'LAB-G':4,'LAB-H':4,'LAB-I':2};
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let own=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:7804});
 const base=pull(own,0,'REZ-1-072');
 own.players[0].front[0]=base;
 const named=pull(own,0,'LAB-SUB');
 named.ready=false;
 own.players[0].front[1]=named;
 own=dispatchUniversalAction(fp,own,{type:'next'});
 own=dispatchUniversalAction(fp,own,{type:'next'});
 const card=pull(own,0,'REZ-1-078');
 own.players[0].hand.push(card);
 const caster=pull(own,0,'LAB-DEPLOY');
 own.players[0].hand.push(caster);
 own=dispatchUniversalAction(fp,own,{type:'event',uid:caster.uid});
 own=dispatchUniversalAction(fp,own,legalUniversalActions(fp,own).find(a=>
  a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&a.uid===card.uid&&a.baseUid===base.uid));
 const drawn=own.players[0].deck.length;
 own=dispatchUniversalAction(fp,own,{type:'chooseActiveOwnNamed',uid:named.uid});
 assert.equal(own.players[0].deck.length,drawn-1);
 assert.equal(assertUniversalMatch(packs,life),true);
 assert.equal(assertUniversalMatch(fp,own),true);
});

test('REZ-1-079 cuts one purple only while the opponent has yellow or blue on the field',()=>{
 let s=reach(fresh(7901,{'REZ-1-079':2,'REZ-1-088':1}),'main');
 fuel(s,['REZ-1-086']);
 s.players[0].energy[0].ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 const ram=pull(s,0,'REZ-1-079');
 s.players[0].hand.push(ram);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-079']),3);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===ram.uid),false);
 const purpleOnly=seat(s,1,'REZ-1-068','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-079']),3);
 s.players[1].front[0]=null;
 s.players[1].deck.push(purpleOnly);
 const outside=pull(s,1,'REZ-1-007');
 s.players[1].outside.push(outside);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-079']),3);
 s.players[1].deck.push(s.players[1].outside.pop());
 const yellow=seat(s,1,'REZ-1-007','front',0,true);
 const blue=seat(s,1,'REZ-1-043','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-079']),2);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-088']),3);
 assert.equal(legal(s).some(a=>a.type==='raid'&&a.uid===ram.uid),false);
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===ram.uid&&a.line==='front'));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===ram.uid),true);
 s.players[1].front[0]=null;
 s.players[1].deck.push(yellow);
 const second=pull(s,0,'REZ-1-079');
 s.players[0].hand.push(second);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-079']),2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-080 returns another energy-1 character, or itself when none exists',()=>{
 let forced=reach(fresh(8001,{'REZ-1-080':1}),'main');
 fuel(forced,['REZ-1-086']);
 const zero=seat(forced,0,'REZ-1-081','front',0,true);
 const one=seat(forced,0,'REZ-1-084','energy',1,true);
 const two=seat(forced,0,'REZ-1-085','front',1,true);
 let ram;
 [forced,ram]=play(forced,'REZ-1-080');
 assert.equal(forced.pending.kind,'effect-bounce-own');
 assert.equal(forced.pending.optional,undefined);
 assert.ok(forced.pending.choices.includes(zero.uid));
 assert.ok(forced.pending.choices.includes(one.uid));
 assert.equal(forced.pending.choices.includes(two.uid),false);
 assert.equal(forced.pending.choices.includes(ram.uid),false);
 assert.equal(legal(forced).some(a=>a.uid===null),false);
 assert.throws(()=>act(forced,{type:'chooseOwnBounce',uid:null}),/not currently legal/);
 forced=act(forced,{type:'chooseOwnBounce',uid:zero.uid});
 assert.equal(forced.players[0].hand.some(c=>c.uid===zero.uid),true);
 assert.equal(forced.players[0].front.some(c=>c?.uid===ram.uid),true);
 assert.equal(forced.players[0].energy.some(c=>c?.uid===one.uid),true);

 let alone=reach(fresh(8002,{'REZ-1-080':1}),'main');
 fuel(alone,['REZ-1-086']);
 seat(alone,0,'REZ-1-085','front',0,true);
 let self;
 [alone,self]=play(alone,'REZ-1-080');
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(alone.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(alone.players[0].energy.some(c=>c?.uid===self.uid),false);
 assert.equal(assertUniversalMatch(packs,forced),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('REZ-1-081 has no play effect and its life trigger draws one card',()=>{
 let s=reach(fresh(8101,{'REZ-1-081':1}),'main');
 const card=pull(s,0,'REZ-1-081');
 s.players[0].hand.push(card);
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const body=card;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(universalBp(packs,s,live(s,body.uid)),2000);
 assert.equal(live(s,body.uid).ready,false);

 let life=fresh(8102,{'REZ-1-081':1});
 const attacker=seat(life,0,'REZ-1-072','front',0,true);
 armLife(life,1,'REZ-1-081');
 life=reach(life,'attack');
 life=act(life,{type:'attack',uid:attacker.uid});
 life=act(life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'draw');
 const held=life.players[1].hand.length;
 life=act(life,{type:'chooseTrigger',mode:'draw'});
 assert.equal(life.players[1].hand.length,held+1);
 assert.equal(life.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('REZ-1-082 rests for one purple this turn and leaves at the end of main',()=>{
 let energy=reach(fresh(8201,{'REZ-1-082':1}),'main');
 const card=seat(energy,0,'REZ-1-082','energy',0,true);
 assert.equal(universalEnergyByColor(packs,energy,0).purple,1);
 assert.equal(legal(energy).some(a=>a.type==='activate'&&a.uid===card.uid),true);
 energy=act(energy,{type:'activate',uid:card.uid,mode:'selfRestEnergyRetire'});
 assert.equal(live(energy,card.uid).ready,false);
 assert.equal(universalEnergyByColor(packs,energy,0).purple,2);
 live(energy,card.uid).ready=true;
 assert.equal(legal(energy).some(a=>a.type==='activate'&&a.uid===card.uid),false);
 energy=act(energy,legal(energy).find(a=>a.type==='next'));
 assert.equal(energy.phase,'attack');
 assert.equal(energy.players[0].energy[0],null);
 assert.equal(energy.players[0].outside.some(c=>c.uid===card.uid),true);
 assert.equal(universalEnergyByColor(packs,energy,0).purple||0,0);

 let front=reach(fresh(8202,{'REZ-1-082':1}),'main');
 const stood=seat(front,0,'REZ-1-082','front',0,false);
 assert.equal(legal(front).some(a=>a.type==='activate'&&a.uid===stood.uid),false);
 live(front,stood.uid).ready=true;
 front=act(front,{type:'activate',uid:stood.uid,mode:'selfRestEnergyRetire'});
 assert.equal(universalEnergyByColor(packs,front,0).purple||0,0);
 front=act(front,legal(front).find(a=>a.type==='next'));
 assert.equal(front.players[0].front[0],null);
 assert.equal(front.players[0].outside.some(c=>c.uid===stood.uid),true);
 assert.equal(assertUniversalMatch(packs,energy),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});

test('REZ-1-083 looks at two private cards, may set one aside, and orders the rest on top',()=>{
 let s=reach(fresh(8301,{'REZ-1-083':1}),'main');
 const window=setTop(s,0,['REZ-1-081','REZ-1-068']);
 const reveals=s.publicReveals.length;
 [s]=play(s,'REZ-1-083');
 assert.equal(s.pending.kind,'effect-top-inspect');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].deckCount,s.players[0].deck.length);
 assert.equal(Object.hasOwn(universalPublicView(packs,s,1).pending,'uids'),false);
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.options.filter(o=>o.card).map(o=>o.card.cardId).sort(),['REZ-1-068','REZ-1-081']);
 assert.equal(s.publicReveals.length,reveals);
 const kept=act(structuredClone(s),{type:'chooseInspectedOutside',uid:null});
 const ordered=order(kept,[window[1].uid,window[0].uid]);
 assert.deepEqual(ordered.players[0].deck.slice(0,2).map(c=>c.uid),[window[1].uid,window[0].uid]);
 assert.equal(ordered.players[0].outside.some(c=>window.some(card=>card.uid===c.uid)),false);
 assert.equal(ordered.publicReveals.length,reveals);
 s=act(s,{type:'chooseInspectedOutside',uid:window[0].uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(universalPublicView(packs,s,1).players[0].outside.some(c=>c.cardId==='REZ-1-081'),true);
 s=order(s,[window[1].uid]);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
 assert.equal(s.publicReveals.length,reveals);

 let one=reach(fresh(8302,{'REZ-1-083':1}),'main');
 const only=setTop(one,0,['REZ-1-072']);
 one.players[0].outside.push(...one.players[0].deck.splice(1));
 [one]=play(one,'REZ-1-083');
 assert.deepEqual(one.pending.uids,[only[0].uid]);
 one=act(one,{type:'chooseInspectedOutside',uid:only[0].uid});
 assert.equal(one.pending,null);
 assert.equal(one.players[0].outside.some(c=>c.uid===only[0].uid),true);
 assert.equal(one.players[0].deck.length,0);

 let empty=reach(fresh(8303,{'REZ-1-083':1}),'main');
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 [empty]=play(empty,'REZ-1-083');
 assert.equal(empty.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,one),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('REZ-1-084 has no play effect and its active trigger readies one character for 3000',()=>{
 let s=reach(fresh(8401,{'REZ-1-084':1}),'main');
 fuel(s,['REZ-1-086']);
 const card=pull(s,0,'REZ-1-084');
 s.players[0].hand.push(card);
 const deck=s.players[0].deck.length;
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const body=card;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(universalBp(packs,s,live(s,body.uid)),2500);

 let life=fresh(8402,{'REZ-1-084':1});
 const attacker=seat(life,0,'REZ-1-072','front',0,true);
 const rested=seat(life,1,'REZ-1-081','front',0,false);
 const asleep=seat(life,1,'REZ-1-068','energy',0,false);
 armLife(life,1,'REZ-1-084');
 life=reach(life,'attack');
 life=act(life,{type:'attack',uid:attacker.uid});
 life=act(life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'active');
 assert.ok(legal(life).some(a=>a.mode==='active'&&a.uid===rested.uid));
 assert.ok(legal(life).some(a=>a.mode==='active'&&a.uid===asleep.uid));
 const skipped=act(structuredClone(life),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,rested.uid).ready,false);
 assert.equal(universalBp(packs,skipped,live(skipped,rested.uid)),2000);
 life=act(life,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(live(life,rested.uid).ready,true);
 assert.equal(universalBp(packs,life,live(life,rested.uid)),5000);
 assert.equal(live(life,asleep.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,life),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('REZ-1-085 discounts the next hand Emilia only after an own effect rests her',()=>{
 let quiet=reach(fresh(8501,{'REZ-1-085':1,'REZ-1-098':1,'REZ-1-088':1}),'main');
 readyAp(quiet,2);
 fuel(quiet,['REZ-1-086','REZ-1-086']);
 let holder;
 [quiet,holder]=play(quiet,'REZ-1-085');
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===holder.uid),false);
 live(quiet,holder.uid).ready=true;
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===holder.uid),false);
 live(quiet,holder.uid).ready=false;
 assert.equal(quiet.ownEffectRests[0].length,0);
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===holder.uid),false);
 live(quiet,holder.uid).ready=true;
 quiet=restByTrial(quiet,holder.uid);
 const slot=quiet.players[0].front.findIndex(c=>c?.uid===holder.uid);
 const parked=quiet.players[0].front[slot];
 quiet.players[0].front[slot]=null;
 quiet.players[0].energy[2]=parked;
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===holder.uid),false);
 quiet.players[0].energy[2]=null;
 quiet.players[0].front[slot]=parked;
 quiet=act(quiet,legal(quiet).find(a=>a.type==='activate'&&a.uid===holder.uid));
 let expired=toOpponentMain(structuredClone(quiet));
 for(let guard=0;guard<24&&!(expired.active===0&&expired.phase==='main'&&!expired.pending);guard++){
  if(expired.pending?.kind==='end-hand-limit'){
   expired=act(expired,{type:'chooseHandLimit',uid:expired.players[expired.pending.player].hand[0].uid});
  }else if(expired.pending?.kind==='block'){
   expired=act(expired,{type:'chooseBlock',uid:null});
  }else{
   const next=legal(expired).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(expired.pending?.kind||expired.phase));
   expired=act(expired,next);
  }
 }
 assert.equal(expired.players[0].nextNamedHandEnergy.length,0);
 assert.equal(effectiveHandRequiredEnergy(pack,expired,0,pack.cards['REZ-1-088']),3);
 assert.equal(quiet.players[0].nextNamedHandEnergy.length,1);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),2);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-068']),0);
 readyAp(quiet,2);
 const other=pull(quiet,0,'REZ-1-068');
 quiet.players[0].hand.push(other);
 quiet=act(quiet,legal(quiet).find(a=>a.type==='play'&&a.uid===other.uid&&a.line==='front'));
 assert.equal(quiet.players[0].nextNamedHandEnergy.length,1);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),2);
 const emilia=pull(quiet,0,'REZ-1-081');
 quiet.players[0].hand.push(emilia);
 quiet=act(quiet,legal(quiet).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='front'));
 assert.equal(quiet.players[0].nextNamedHandEnergy.length,0);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),3);
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===holder.uid),false);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('REZ-1-086 adds one purple only while active on the energy line',()=>{
 let s=fresh(8601,{'REZ-1-086':1});
 const card=seat(s,0,'REZ-1-086','energy',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 live(s,card.uid).ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 const front=seat(s,0,'REZ-1-086','front',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 live(s,front.uid).ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 let played=reach(fresh(8602,{'REZ-1-086':1}),'main');
 fuel(played,['REZ-1-086','REZ-1-086']);
 const coming=pull(played,0,'REZ-1-086');
 played.players[0].hand.push(coming);
 const deck=played.players[0].deck.length;
 played=act(played,legal(played).find(a=>a.type==='play'&&a.uid===coming.uid&&a.line==='front'));
 assert.equal(played.pending,null);
 assert.equal(played.players[0].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,played),true);
});

test('REZ-1-087 gains 1000 on its turn and readies only after removing the sanctuary trial',()=>{
 let bare=reach(fresh(8701,{'REZ-1-087':1,'REZ-1-098':1}),'main');
 fuel(bare,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 let actor;
 [bare,actor]=play(bare,'REZ-1-087');
 assert.equal(bare.pending,null);
 assert.equal(live(bare,actor.uid).ready,false);
 assert.equal(universalBp(packs,bare,live(bare,actor.uid)),4000);
 const frontSlot=bare.players[0].front.findIndex(c=>c?.uid===actor.uid);
 const parked=bare.players[0].front[frontSlot];
 const displaced=bare.players[0].energy[3];
 bare.players[0].front[frontSlot]=null;
 bare.players[0].energy[3]=parked;
 assert.equal(universalBp(packs,bare,parked),4000);
 bare.players[0].energy[3]=displaced;
 bare.players[0].front[frontSlot]=parked;
 bare=toOpponentMain(bare);
 assert.equal(universalBp(packs,bare,live(bare,actor.uid)),3000);

 let moved=reach(fresh(8702,{'REZ-1-087':1,'REZ-1-098':2}),'main');
 fuel(moved,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const trial=pull(moved,0,'REZ-1-098');
 const other=pull(moved,0,'REZ-1-081');
 const foe=pull(moved,1,'REZ-1-098');
 moved.players[0].outside.push(trial);
 moved.players[0].hand.push(other);
 moved.players[1].outside.push(foe);
 let body;
 [moved,body]=play(moved,'REZ-1-087');
 assert.equal(moved.pending.kind,'effect-remove-named');
 assert.equal(moved.pending.optional,true);
 assert.deepEqual(moved.pending.choices,[trial.uid]);
 const skipped=act(structuredClone(moved),{type:'chooseRemoveNamed',uid:null});
 assert.equal(live(skipped,body.uid).ready,false);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===trial.uid),true);
 moved=act(moved,{type:'chooseRemoveNamed',uid:trial.uid});
 assert.equal(moved.players[0].removed.some(c=>c.uid===trial.uid),true);
 assert.equal(live(moved,body.uid).ready,true);
 assert.equal(universalBp(packs,moved,live(moved,body.uid)),4000);
 assert.equal(assertUniversalMatch(packs,bare),true);
 assert.equal(assertUniversalMatch(packs,moved),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('REZ-1-088 readies and keeps 1000 until the next own turn starts',()=>{
 let s=reach(fresh(8801,{'REZ-1-088':1,'REZ-1-098':1}),'main');
 readyAp(s,2);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086']);
 let body;
 [s,body]=play(s,'REZ-1-088');
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===body.uid),false);
 live(s,body.uid).ready=true;
 s=restByTrial(s,body.uid);
 const slot=s.players[0].front.findIndex(c=>c?.uid===body.uid);
 const parked=s.players[0].front[slot];
 s.players[0].front[slot]=null;
 s.players[0].energy[3]=parked;
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===body.uid),false);
 s.players[0].energy[3]=null;
 s.players[0].front[slot]=parked;
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===body.uid));
 assert.equal(live(s,body.uid).ready,true);
 assert.equal(universalBp(packs,s,live(s,body.uid)),4000);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===body.uid),false);
 s=toOpponentMain(s);
 assert.equal(universalBp(packs,s,live(s,body.uid)),4000);
 for(let guard=0;guard<24&&!(s.active===0&&s.phase==='main'&&!s.pending);guard++){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
  }else s=act(s,legal(s).find(a=>a.type==='next'));
 }
 assert.equal(s.active,0);
 assert.equal(s.phase,'main');
 assert.equal(universalBp(packs,s,live(s,body.uid)),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('every life symbol in 076-088 resolves on that card',()=>{
 const rows=[
  ['REZ-1-076','color'],['REZ-1-077','raid'],['REZ-1-078','raid'],['REZ-1-079',null],
  ['REZ-1-080',null],['REZ-1-081','draw'],['REZ-1-082',null],['REZ-1-083','active'],
  ['REZ-1-084','active'],['REZ-1-085','draw'],['REZ-1-086',null],['REZ-1-087','draw'],
  ['REZ-1-088','active']
 ];
 rows.forEach(([id,symbol],index)=>{
  let s=fresh(8900+index,{[id]:1});
  const attacker=seat(s,0,'REZ-1-036','front',0,true);
  armLife(s,1,id);
  s=reach(s,'attack');
  s=act(s,{type:'attack',uid:attacker.uid});
  if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
  if(!symbol){
   assert.equal(s.pending,null,id);
   assert.equal(s.players[1].outside.some(c=>c.cardId===id),true,id);
  }else{
   assert.equal(s.pending.trigger,symbol,id);
   if(symbol==='draw'){
    const hand=s.players[1].hand.length;
    s=act(s,{type:'chooseTrigger',mode:'draw'});
    assert.equal(s.players[1].hand.length,hand+1,id);
   }else if(symbol==='active'){
    const rested=seat(s,1,'REZ-1-081','front',0,false);
    s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
    assert.equal(live(s,rested.uid).ready,true,id);
    assert.equal(universalBp(packs,s,live(s,rested.uid)),5000,id);
   }else if(symbol==='raid'){
    assert.equal(legal(s).some(a=>a.mode==='raid'),false,id);
    s=act(s,{type:'chooseTrigger',mode:'get'});
    assert.equal(s.players[1].hand.some(c=>c.cardId===id),true,id);
   }else if(symbol==='color'){
    assert.ok(legal(s).some(a=>a.mode==='skip'),id);
    s=act(s,{type:'chooseTrigger',mode:'skip'});
    assert.equal(s.players[1].outside.some(c=>c.cardId===id),true,id);
   }
  }
  assert.equal(assertUniversalMatch(packs,s),true,id);
 });
});
