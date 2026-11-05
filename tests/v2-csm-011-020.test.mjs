import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalAttackDamage,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify((s.pending?.actions||[]).map(a=>a.mode||a.type)));
 return use(s,action);
}
function fuel(s){
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function bury(s,p,card){
 const under=s.players[p].deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return under;
}
function swing(s,uid){
 let state=s.phase==='attack'?s:toPhase(s,'attack');
 state=use(state,{type:'attack',uid});
 assert.equal(state.pending?.kind,'block');
 return state;
}

test('CSM-1-011 and CSM-1-020 may buff another own character, including energy',()=>{
 const counts=countsFor(['CSM-1-011','CSM-1-020','CSM-1-001','CSM-1-008','CSM-1-002','CSM-1-003']);
 let s=toPhase(fresh(counts,1011),'main');
 readyAp(s);fuel(s);
 const ally=put(s,0,'CSM-1-001','front',1,true);
 const printed=pack.cards['CSM-1-001'].bp;
 const aki=toHand(s,0,'CSM-1-011');
 s=play(s,aki.uid);
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(aki.uid),false);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(s.players[0].energy[0].uid),true);
 s=choose(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,live(s,0,ally.uid)),printed+1000);
 assert.equal(universalBp(packs,s,live(s,0,aki.uid)),pack.cards['CSM-1-011'].bp);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,1020),'main');
 readyAp(skipped);fuel(skipped);
 const rear=put(skipped,0,'CSM-1-001','front',1,true);
 const makima=toHand(skipped,0,'CSM-1-020');
 skipped=play(skipped,makima.uid);
 assert.equal(skipped.pending?.kind,'effect-buff-own');
 assert.equal(skipped.pending.choices.includes(rear.uid),true);
 assert.equal(skipped.pending.choices.includes(makima.uid),false);
 skipped=choose(skipped,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(packs,skipped,live(skipped,0,rear.uid)),printed);
 assertUniversalMatch(packs,skipped);
});

test('CSM-1-012 discards one hand card only after its own battle win',()=>{
 const counts=countsFor(['CSM-1-012','CSM-1-001','CSM-1-016','CSM-1-011']);
 function board(){
  const s=toPhase(fresh(counts,1012),'attack');
  return s;
 }
 const won=board();
 const power=put(won,0,'CSM-1-012','front',0,true);
 const wall=put(won,1,'CSM-1-001','front',0,true);
 const hand=won.players[0].hand.length;
 const life=won.players[1].life.length;
 let s=swing(won,power.uid);
 s=use(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.players[1].outside.filter(c=>c.uid===wall.uid).length,1);
 assert.equal(s.pending?.id,'CSM-1-012');
 assert.equal(s.pending.step,'discard');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 const tossed=s.players[0].hand[0];
 s=choose(s,a=>a.mode==='discard'&&a.uid===tossed.uid);
 assert.equal(s.players[0].outside.filter(c=>c.uid===tossed.uid).length,1);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.pending?.id==='CSM-1-012',false);
 assertUniversalMatch(packs,s);

 const empty=board();
 const quiet=put(empty,0,'CSM-1-012','front',0,true);
 const soft=put(empty,1,'CSM-1-001','front',0,true);
 empty.players[0].deck.push(...empty.players[0].hand.splice(0));
 s=swing(empty,quiet.uid);
 s=use(s,{type:'chooseBlock',uid:soft.uid});
 assert.notEqual(s.pending?.id,'CSM-1-012');
 assert.equal(s.players[1].outside.filter(c=>c.uid===soft.uid).length,1);
 assert.equal(s.players[0].hand.length,0);
 assertUniversalMatch(packs,s);

 const lost=board();
 const loser=put(lost,0,'CSM-1-012','front',0,true);
 const bigger=put(lost,1,'CSM-1-016','front',0,true);
 const before=lost.players[0].hand.length;
 s=swing(lost,loser.uid);
 s=use(s,{type:'chooseBlock',uid:bigger.uid});
 assert.notEqual(s.pending?.id,'CSM-1-012');
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.players[0].front.some(c=>c?.uid===loser.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===bigger.uid),true);
 assertUniversalMatch(packs,s);

 const open=board();
 const free=put(open,0,'CSM-1-012','front',0,true);
 put(open,1,'CSM-1-001','front',0,true);
 const topLife=open.players[1].life[0];
 const blank=take(open,1,'CSM-1-011');
 open.players[1].life[0]=blank;
 open.players[1].deck.push(topLife);
 const openHand=open.players[0].hand.length;
 s=swing(open,free.uid);
 s=use(s,{type:'chooseBlock',uid:null});
 assert.notEqual(s.pending?.id,'CSM-1-012');
 assert.equal(s.players[0].hand.length,openHand);
 assertUniversalMatch(packs,s);
});

test('CSM-1-013 gains 500 BP on attack only while its controller has Denji',()=>{
 const counts=countsFor(['CSM-1-013','CSM-1-006','CSM-1-001']);
 const printed=pack.cards['CSM-1-013'].bp;
 let s=toPhase(fresh(counts,1013),'attack');
 const power=put(s,0,'CSM-1-013','front',0,true);
 put(s,0,'CSM-1-006','energy',0,true);
 put(s,1,'CSM-1-001','front',0,true);
 s=swing(s,power.uid);
 assert.equal(universalBp(packs,s,live(s,0,power.uid)),printed+500);
 assertUniversalMatch(packs,s);

 let none=toPhase(fresh(counts,1014),'attack');
 const lone=put(none,0,'CSM-1-013','front',0,true);
 put(none,1,'CSM-1-006','front',1,true);
 put(none,1,'CSM-1-001','front',0,true);
 none=swing(none,lone.uid);
 assert.equal(universalBp(packs,none,live(none,0,lone.uid)),printed);
 assertUniversalMatch(packs,none);
});

test('CSM-1-014 rests, retires itself, then may grant one Denji BP and impact',()=>{
 const counts=countsFor(['CSM-1-014','CSM-1-006','CSM-1-001']);
 let s=toPhase(fresh(counts,1140),'main');
 const beam=put(s,0,'CSM-1-014','front',0,true);
 const denji=put(s,0,'CSM-1-006','front',1,true);
 const other=put(s,0,'CSM-1-001','energy',0,true);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===beam.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===beam.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===beam.uid),true);
 assert.equal(s.pending?.id,'CSM-1-014');
 assert.equal(s.pending.step,'buffImpact');
 assert.equal(s.pending.actions.some(a=>a.uid===denji.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===other.uid),false);
 assert.equal(live(s,0,denji.uid).impactGranted,undefined);
 s=choose(s,a=>a.mode==='pick'&&a.uid===denji.uid);
 assert.equal(universalBp(packs,s,live(s,0,denji.uid)),pack.cards['CSM-1-006'].bp+1000);
 assert.equal(live(s,0,denji.uid).impactGranted.amount,1);
 assert.equal(universalBp(packs,s,live(s,0,other.uid)),pack.cards['CSM-1-001'].bp);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,1141),'main');
 const rested=put(skipped,0,'CSM-1-014','front',0,false);
 put(skipped,0,'CSM-1-006','front',1,true);
 assert.equal(legalUniversalActions(packs,skipped).some(a=>a.type==='activate'&&a.uid===rested.uid),false);
 const readyBeam=put(skipped,0,'CSM-1-014','front',2,true);
 const spared=skipped.players[0].front.find(c=>c?.cardId==='CSM-1-006');
 skipped=use(skipped,legalUniversalActions(packs,skipped).find(a=>a.type==='activate'&&a.uid===readyBeam.uid));
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[0].outside.some(c=>c.uid===readyBeam.uid),true);
 assert.equal(universalBp(packs,skipped,live(skipped,0,spared.uid)),pack.cards['CSM-1-006'].bp);
 assert.equal(live(skipped,0,spared.uid).impactGranted,undefined);
 assertUniversalMatch(packs,skipped);
});

test('CSM-1-015 gains 500 BP for each event its controller used this turn',()=>{
 const counts=countsFor(['CSM-1-015','CSM-1-016','CSM-1-038','CSM-1-001','CSM-1-008']);
 let s=toPhase(fresh(counts,1015),'main');
 readyAp(s);
 put(s,0,'CSM-1-001','energy',0);
 const fiend=put(s,0,'CSM-1-015','front',0,true);
 const reze=put(s,0,'CSM-1-016','front',1,true);
 const victim=put(s,0,'CSM-1-008','front',2,true);
 assert.equal(universalBp(packs,s,fiend),pack.cards['CSM-1-015'].bp);
 const event=toHand(s,0,'CSM-1-038');
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(universalBp(packs,s,live(s,0,fiend.uid)),pack.cards['CSM-1-015'].bp+500);
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),pack.cards['CSM-1-016'].bp);
 s=choose(s,a=>a.mode==='pick'&&a.uid===victim.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===victim.uid),false);
 assert.equal(universalBp(packs,s,live(s,0,fiend.uid)),pack.cards['CSM-1-015'].bp+500);
 if(s.pending?.step==='ap')s=choose(s,a=>a.mode==='ap');
 assert.equal(s.pending,null);
 const second=toHand(s,0,'CSM-1-038');
 const fuel=live(s,0,s.players[0].energy.find(c=>c)?.uid);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===second.uid));
 assert.equal(universalBp(packs,s,live(s,0,fiend.uid)),pack.cards['CSM-1-015'].bp+1000);
 s=choose(s,a=>a.mode==='pick'&&a.uid===fuel.uid);
 if(s.pending?.step==='ap')s=choose(s,a=>a.mode==='ap');
 assert.equal(universalBp(packs,s,live(s,0,fiend.uid)),pack.cards['CSM-1-015'].bp+1000);
 s=toPhase(s,'attack');
 s=use(s,{type:'next'});
 assert.notEqual(s.active,0);
 assert.equal(universalBp(packs,s,live(s,0,fiend.uid)),pack.cards['CSM-1-015'].bp);
 assertUniversalMatch(packs,s);
});

test('CSM-1-016 gains damage 2 only after its Denji leaves, and the kit follows that leave',()=>{
 const counts=countsFor(['CSM-1-016','CSM-1-006','CSM-1-001','CSM-1-008','CSM-1-002','CSM-1-003']);
 let s=toPhase(fresh(counts,1016),'main');
 readyAp(s);fuel(s);
 const denji=put(s,0,'CSM-1-006','front',1,true);
 const bomb=toHand(s,0,'CSM-1-016');
 s=play(s,bomb.uid);
 assert.equal(universalAttackDamage(packs,s,live(s,0,bomb.uid)),1);
 assert.equal(s.pending?.step,'retireThenKit');
 s=choose(s,a=>a.mode==='pick'&&a.uid===denji.uid);
 assert.equal(s.pending?.id,'CSM-1-006');
 assert.equal(live(s,0,bomb.uid).impactGranted,undefined);
 s=choose(s,a=>a.mode==='draw');
 if(s.pending?.step==='ap')s=choose(s,a=>a.mode==='ap');
 const lived=live(s,0,bomb.uid);
 assert.equal(lived.ready,true);
 assert.equal(lived.impactGranted.amount,1);
 assert.equal(universalBp(packs,s,lived),pack.cards['CSM-1-016'].bp+1000);
 assert.equal(universalAttackDamage(packs,s,lived),2);
 assert.equal(s.players[0].outside.some(c=>c.uid===denji.uid),true);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,1017),'main');
 readyAp(skipped);fuel(skipped);
 put(skipped,0,'CSM-1-006','front',1,true);
 const staying=toHand(skipped,0,'CSM-1-016');
 skipped=play(skipped,staying.uid);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(universalAttackDamage(packs,skipped,live(skipped,0,staying.uid)),1);
 assert.equal(live(skipped,0,staying.uid).impactGranted,undefined);
 assertUniversalMatch(packs,skipped);
});

test('CSM-1-017 raid main grants impact and puts one raid base outside once',()=>{
 const counts=countsFor(['CSM-1-017','CSM-1-016','CSM-1-001']);
 let s=toPhase(fresh(counts,1170),'main');
 const bomb=put(s,0,'CSM-1-017','front',0,true);
 const base=bury(s,0,bomb);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===bomb.uid),true);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===bomb.uid));
 const lived=live(s,0,bomb.uid);
 assert.equal(lived.impactGranted.amount,1);
 assert.equal(lived.stack.some(c=>c?.uid===base.uid),false);
 assert.equal(s.players[0].outside.filter(c=>c.uid===base.uid).length,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===bomb.uid),false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-018 has no character effect, and CSM-1-019 rests to buff another character',()=>{
 assert.deepEqual(pack.cards['CSM-1-018'].effects,{});
 const counts=countsFor(['CSM-1-019','CSM-1-018','CSM-1-001']);
 let s=toPhase(fresh(counts,1019),'main');
 const makima=put(s,0,'CSM-1-019','front',0,true);
 const ally=put(s,0,'CSM-1-001','front',1,true);
 const idle=put(s,0,'CSM-1-018','energy',0,true);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===makima.uid&&a.mode==='selfRestBuff'));
 assert.equal(live(s,0,makima.uid).ready,false);
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.equal(s.pending.choices.includes(makima.uid),false);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(idle.uid),true);
 s=choose(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,live(s,0,ally.uid)),pack.cards['CSM-1-001'].bp+1000);
 assert.equal(universalBp(packs,s,live(s,0,idle.uid)),pack.cards['CSM-1-018'].bp);
 assert.equal(s.mainAbilityUsedUids.includes(makima.uid),false);
 assertUniversalMatch(packs,s);
});

test('life triggers of CSM-1-013 through 020 resolve on the revealed card',()=>{
 const drawIds=['CSM-1-013','CSM-1-018','CSM-1-019'];
 const activeIds=['CSM-1-014','CSM-1-020'];
 for(const id of drawIds){
  const counts=countsFor([id,'CSM-1-005','CSM-1-011']);
  let s=toPhase(fresh(counts,1300+Number(id.slice(-3))),'attack');
  const poke=put(s,0,'CSM-1-005','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;
  s.players[1].deck.push(buried);
  const hand=s.players[1].hand.length;
  s=use(s,{type:'attack',uid:poke.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'draw',id);
  s=use(s,{type:'chooseTrigger',mode:'draw'});
  assert.equal(s.players[1].hand.length,hand+1);
  assertUniversalMatch(packs,s);
 }
 for(const id of activeIds){
  const counts=countsFor([id,'CSM-1-005','CSM-1-003']);
  let s=toPhase(fresh(counts,1400+Number(id.slice(-3))),'attack');
  const poke=put(s,0,'CSM-1-005','front',0,true);
  const ally=put(s,1,'CSM-1-003','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;
  s.players[1].deck.push(buried);
  s=use(s,{type:'attack',uid:poke.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'active',id);
  s=use(s,{type:'chooseTrigger',mode:'active',uid:ally.uid});
  assert.equal(live(s,1,ally.uid).ready,true);
  assert.equal(universalBp(packs,s,live(s,1,ally.uid)),pack.cards['CSM-1-003'].bp+3000);
  assertUniversalMatch(packs,s);
 }
 const getCounts=countsFor(['CSM-1-016','CSM-1-005']);
 let got=toPhase(fresh(getCounts,1016),'attack');
 const poke=put(got,0,'CSM-1-005','front',0,true);
 const trigger=take(got,1,'CSM-1-016');
 const buried=got.players[1].life[0];
 got.players[1].life[0]=trigger;
 got.players[1].deck.push(buried);
 got=use(got,{type:'attack',uid:poke.uid});
 got=use(got,{type:'chooseBlock',uid:null});
 assert.equal(got.pending?.trigger,'get');
 got=use(got,{type:'chooseTrigger',mode:'get'});
 assert.equal(got.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,got);

 const raidCounts=countsFor(['CSM-1-017','CSM-1-016','CSM-1-008','CSM-1-009','CSM-1-001','CSM-1-005']);
 let raid=toPhase(fresh(raidCounts,1017),'attack');
 const attacker=put(raid,0,'CSM-1-005','front',0,true);
 const base=put(raid,1,'CSM-1-016','front',0,true);
 put(raid,1,'CSM-1-008','energy',0);
 put(raid,1,'CSM-1-009','energy',1);
 put(raid,1,'CSM-1-001','energy',2);
 const life=take(raid,1,'CSM-1-017');
 const old=raid.players[1].life[0];
 raid.players[1].life[0]=life;
 raid.players[1].deck.push(old);
 raid=use(raid,{type:'attack',uid:attacker.uid});
 raid=use(raid,{type:'chooseBlock',uid:null});
 assert.equal(raid.pending?.trigger,'raid');
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.type==='chooseTrigger'&&a.mode==='get'),true);
 const raidAction=legalUniversalActions(packs,raid).find(a=>a.type==='chooseTrigger'&&
  a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raidAction);
 raid=use(raid,raidAction);
 const raided=raid.players[1].front.find(c=>c?.uid===life.uid);
 assert.ok(raided);
 assert.equal(raided.ready,true);
 assert.equal(raided.stack.some(c=>c?.uid===base.uid),true);
 if(raid.pending?.id==='CSM-1-017')raid=choose(raid,a=>a.mode==='debuff'||a.mode==='skip');
 if(raid.pending?.step==='debuff')raid=choose(raid,a=>a.mode==='skip');
 assertUniversalMatch(packs,raid);
});
