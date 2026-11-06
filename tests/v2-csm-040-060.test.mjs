import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalEnergyByColor,universalImpactNull}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {controllerChoiceArt,controllerDeckWindowCards}
 from '../dist/universal-v2/preview-actions.mjs';
import {csmFacedowns} from '../dist/universal-v2/csm-continuous.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {csmOnAttackDeclare,csmOnAttackEnd,csmOnMovedOutsideMove,csmOnTurnStart}
 from '../dist/universal-v2/csm-runtime.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
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
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function fuel(s,p=0){
 put(s,p,'CSM-1-008','energy',0);
 put(s,p,'CSM-1-001','energy',1);
 put(s,p,'CSM-1-002','energy',2);
 put(s,p,'CSM-1-003','energy',3);
}
function redFuel(s,p=0,ids=['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-043']){
 ids.forEach((id,slot)=>put(s,p,id,'energy',slot));
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined&&a.baseUid===undefined);
 if(!action)throw Error('No '+type+' '+line+' for '+uid+' pending '+s.pending?.kind);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify((s.pending?.actions||[]).slice(0,6)));
 return use(s,action);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function open(seed,required){
 const counts=countsFor(required);
 let s=toPhase(fresh(counts,seed),'main');
 readyAp(s);dumpHand(s);
 return s;
}
function revealLife(s,defender,id){
 const trigger=take(s,defender,id);
 const buried=s.players[defender].life[0];
 s.players[defender].life[0]=trigger;
 s.players[defender].deck.push(buried);
 return trigger;
}
function census(s){
 const ids=[];
 const walk=c=>{
  if(!c)return;
  ids.push(c.uid);
  for(const child of [...(c.stack||[]),...(c.under||[])])walk(child);
 };
 for(const pl of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed'])
   for(const c of pl[zone]||[])ids.push(c.uid);
  for(const c of pl.resolvingEvents||[])ids.push(c.uid);
  for(const line of ['front','energy'])for(const c of pl[line])walk(c);
 }
 return ids.sort();
}
function playedEvent(s){
 const event=toHand(s,0,'CSM-1-036');
 s=play(s,event.uid,'event');
 if(s.pending?.kind==='effect-recover-ap')
  s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.pending,null);
 return s;
}

test('CSM-1-040 still offers the later BP buff when nothing can be retired',()=>{
 let s=open(1040,['CSM-1-040','CSM-1-022','CSM-1-036','CSM-1-008','CSM-1-001','CSM-1-048']);
 fuel(s);
 const gated=toHand(s,0,'CSM-1-040');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===gated.uid),false);
 s.players[0].deck.push(s.players[0].hand.pop());
 const makima=put(s,0,'CSM-1-022','front',0);
 const huge=put(s,1,'CSM-1-048','front',0);
 huge.buffs=[{bp:1,untilTurn:s.turn}];
 assert.ok(universalBp(pack,s,huge)>5000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&
  a.uid&&s.players[0].hand.some(c=>c.uid===a.uid&&c.cardId==='CSM-1-040')),false);
 const bare=toHand(s,0,'CSM-1-040');
 s=play(s,bare.uid,'event');
 assert.equal(s.pending,null,'no earlier event and no legal retire ends cleanly');
 assert.equal(live(s,1,huge.uid)?.uid,huge.uid);

 s=playedEvent(s);
 const event=toHand(s,0,'CSM-1-040');
 const before=census(s);
 s=play(s,event.uid,'event');
 assert.equal(s.pending?.id,'CSM-1-040');
 assert.equal(s.pending?.step,'buffOther');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(s.pending.actions.some(a=>a.uid===huge.uid),false);
 s=choose(s,a=>a.mode==='pick'&&a.uid===makima.uid);
 assert.equal(universalBp(pack,s,live(s,0,makima.uid)),pack.cards['CSM-1-022'].bp+1000);
 assert.equal(live(s,1,huge.uid)?.uid,huge.uid);
 assert.deepEqual(census(s),before);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-040 life trigger retires any opposing front, above the main-effect cap',()=>{
 const counts=countsFor(['CSM-1-040','CSM-1-042','CSM-1-005','CSM-1-008']);
 let s=toPhase(fresh(counts,1041),'attack');
 const victim=put(s,0,'CSM-1-042','front',1,true);
 victim.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.ok(universalBp(pack,s,victim)>5000);
 const striker=put(s,0,'CSM-1-005','front',0,true);
 revealLife(s,1,'CSM-1-040');
 s=use(s,{type:'attack',uid:striker.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.trigger,'special');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='special'&&a.uid===victim.uid),true);
 s=use(s,{type:'chooseTrigger',mode:'special',uid:victim.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-042 enters active and buffs up to two other characters the turn it enters',()=>{
 let s=open(1042,['CSM-1-042','CSM-1-041','CSM-1-043','CSM-1-060','CSM-1-057']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-057','CSM-1-043']);
 const one=put(s,0,'CSM-1-041','front',1);
 const kishibe=toHand(s,0,'CSM-1-042');
 s=play(s,kishibe.uid);
 const entered=live(s,0,kishibe.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.pending,null);
 s=use(s,{type:'activate',uid:kishibe.uid,mode:'csm:0'});
 assert.equal(s.pending?.step,'buffTwo');
 s=choose(s,a=>a.mode==='done');
 assert.equal(universalBp(pack,s,live(s,0,one.uid)),pack.cards['CSM-1-041'].bp);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kishibe.uid),false);

 let again=open(1043,['CSM-1-042','CSM-1-041','CSM-1-052','CSM-1-060','CSM-1-057']);
 redFuel(again,0,['CSM-1-060','CSM-1-060','CSM-1-057','CSM-1-041']);
 const left=put(again,0,'CSM-1-041','front',1);
 const right=put(again,0,'CSM-1-052','front',2);
 const second=toHand(again,0,'CSM-1-042');
 again=play(again,second.uid);
 again=use(again,{type:'activate',uid:second.uid,mode:'csm:0'});
 again=choose(again,a=>a.mode==='pick'&&a.uid===left.uid);
 assert.equal(again.pending?.step,'buffTwo');
 again=choose(again,a=>a.mode==='pick'&&a.uid===right.uid);
 assert.equal(again.pending,null);
 assert.equal(universalBp(pack,again,live(again,0,left.uid)),pack.cards['CSM-1-041'].bp+1000);
 assert.equal(universalBp(pack,again,live(again,0,right.uid)),pack.cards['CSM-1-052'].bp+1000);
 const parkedFuel=again.players[0].energy[3];
 again.players[0].energy[3]=null;
 again.players[0].deck.push(parkedFuel);
 const parked=put(again,0,'CSM-1-042','energy',3);
 assert.equal(legalUniversalActions(packs,again).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 assertUniversalMatch(packs,again);
});

test('CSM-1-044 returns another energy-1-or-less character, otherwise itself',()=>{
 let s=open(1044,['CSM-1-044','CSM-1-049','CSM-1-045','CSM-1-060']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const small=put(s,0,'CSM-1-049','front',1);
 const big=put(s,0,'CSM-1-045','energy',2);
 const kobeni=toHand(s,0,'CSM-1-044');
 s=play(s,kobeni.uid);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(small.uid),true);
 assert.equal(s.pending.choices.includes(big.uid),false);
 assert.equal(s.pending.choices.includes(kobeni.uid),false);
 s=choose(s,a=>a.uid===small.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===small.uid),true);
 assert.equal(live(s,0,kobeni.uid)?.uid,kobeni.uid);
 assertUniversalMatch(packs,s);

 let self=open(1045,['CSM-1-044','CSM-1-045','CSM-1-060']);
 redFuel(self,0,['CSM-1-060','CSM-1-060']);
 put(self,0,'CSM-1-045','front',1);
 const alone=toHand(self,0,'CSM-1-044');
 self=play(self,alone.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===alone.uid),true);
 assert.equal(self.players[0].front.some(c=>c?.uid===alone.uid),false);
 assertUniversalMatch(packs,self);
});

test('CSM-1-045 steps only during the move phase',()=>{
 let s=toPhase(fresh(countsFor(['CSM-1-045','CSM-1-060']),1046),'move');
 readyAp(s);dumpHand(s);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const kobeni=put(s,0,'CSM-1-045','front',0);
 const stepNow=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===kobeni.uid);
 assert.ok(stepNow);
 s=toPhase(s,'main');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='step'&&a.uid===kobeni.uid),false);
 s=toPhase(fresh(countsFor(['CSM-1-045','CSM-1-060']),10461),'move');
 readyAp(s);dumpHand(s);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const again=put(s,0,'CSM-1-045','front',0);
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===again.uid);
 assert.ok(step);
 s=use(s,step);
 assert.equal(s.players[0].energy.some(c=>c?.uid===again.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-046 does not gain its move text during the move phase',()=>{
 let s=toPhase(fresh(countsFor(['CSM-1-046','CSM-1-060']),1047),'move');
 readyAp(s);dumpHand(s);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const kobeni=put(s,0,'CSM-1-046','front',0);
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===kobeni.uid);
 s=use(s,step);
 const moved=live(s,0,kobeni.uid);
 assert.equal(moved.csmUnblockedDraw,undefined);
 assert.equal(moved.blockAtLeastGranted,undefined);
 assert.equal(s.effectQueue.some(job=>job.id==='CSM-1-046'),false);
 assertUniversalMatch(packs,s);
 s.phase='main';
 csmOnMovedOutsideMove(pack,s,0,moved);
 assert.equal(s.effectQueue[0]?.slot,'moved');
 assert.equal(s.effectQueue[0]?.sourceUid,kobeni.uid);
});

test('CSM-1-046 unblocked draw is up to one card',()=>{
 const counts=countsFor(['CSM-1-046','CSM-1-005','CSM-1-044','CSM-1-041','CSM-1-043','CSM-1-060']);
 let skipped=toPhase(fresh(counts,1048),'attack');
 const attacker=put(skipped,0,'CSM-1-046','front',0,true);
 attacker.csmUnblockedDraw=skipped.turn;
 const drawn=top(skipped,0,['CSM-1-041'])[0];
 revealLife(skipped,1,'CSM-1-044');
 const hand=skipped.players[0].hand.length;
 skipped=use(skipped,{type:'attack',uid:attacker.uid});
 skipped=use(skipped,{type:'chooseBlock',uid:null});
 assert.equal(skipped.pending?.step,'mayDraw');
 assert.equal(skipped.pending.actions.some(a=>a.mode==='skip'),true);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[0].hand.some(c=>c.uid===drawn.uid),false);
 assert.equal(skipped.players[0].hand.length,hand);
 assertUniversalMatch(packs,skipped);

 let taken=toPhase(fresh(counts,1049),'attack');
 const striker=put(taken,0,'CSM-1-046','front',0,true);
 striker.csmUnblockedDraw=taken.turn;
 const card=top(taken,0,['CSM-1-043'])[0];
 revealLife(taken,1,'CSM-1-044');
 taken=use(taken,{type:'attack',uid:striker.uid});
 taken=use(taken,{type:'chooseBlock',uid:null});
 assert.equal(taken.pending?.step,'mayDraw');
 const beforeLife=taken.players[1].life.length;
 taken=choose(taken,a=>a.mode==='draw');
 assert.equal(taken.players[0].hand.some(c=>c.uid===card.uid),true);
 assert.ok(taken.players[1].life.length<beforeLife||taken.pending?.kind==='life-trigger');
 assertUniversalMatch(packs,taken);
});

test('CSM-1-047 impact null is raid-only and the facedown gate replays this card',()=>{
 let s=open(1050,['CSM-1-047','CSM-1-050','CSM-1-040','CSM-1-022','CSM-1-008','CSM-1-041','CSM-1-060']);
 const plain=put(s,0,'CSM-1-047','front',0);
 assert.equal(universalImpactNull(pack,s,plain),false);
 const base=take(s,0,'CSM-1-050');
 base.faceDown=false;
 plain.stack=[base];
 assert.equal(universalImpactNull(pack,s,plain),true);
 assert.equal(raidBoxListed('CSM-1-047','onRetire'),false);

 fuel(s);
 put(s,0,'CSM-1-022','front',1);
 const host=put(s,1,'CSM-1-047','front',0);
 const under=take(s,1,'CSM-1-041');
 under.faceDown=true;under.ready=false;under.fieldEntryStamp=null;
 host.under=[under];
 const before=census(s);
 const event=toHand(s,0,'CSM-1-040');
 s=play(s,event.uid,'event');
 s=choose(s,a=>a.mode==='pick'&&a.uid===host.uid);
 assert.equal(s.pending?.id,'CSM-1-047');
 assert.equal(s.pending.actions.some(a=>a.mode==='draw'),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='reenter'),true);
 s=choose(s,a=>a.mode==='reenter');
 assert.equal(s.pending?.step,'deploy');
 assert.equal(s.pending.actions.some(a=>a.uid===host.uid&&a.line==='front'),true);
 assert.equal(s.pending.actions.some(a=>a.uid===under.uid),false);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===host.uid&&a.line==='front');
 const returned=live(s,1,host.uid);
 assert.equal(returned?.ready,true);
 assert.equal(s.players[1].outside.filter(c=>c.uid===host.uid).length,0);
 assert.equal(s.players[1].outside.filter(c=>c.uid===under.uid).length,1);
 assert.deepEqual(census(s),before);
 assertUniversalMatch(packs,s);

 let draw=open(1051,['CSM-1-047','CSM-1-040','CSM-1-022','CSM-1-008']);
 fuel(draw);
 put(draw,0,'CSM-1-022','front',0);
 const bare=put(draw,1,'CSM-1-047','front',0);
 const hand=draw.players[1].hand.length;
 draw=play(draw,toHand(draw,0,'CSM-1-040').uid,'event');
 draw=choose(draw,a=>a.mode==='pick'&&a.uid===bare.uid);
 assert.equal(draw.pending.actions.some(a=>a.mode==='reenter'),false);
 draw=choose(draw,a=>a.mode==='draw');
 assert.equal(draw.players[1].hand.length,hand+2);
 assert.equal(draw.players[1].outside.filter(c=>c.uid===bare.uid).length,1);
 assert.equal(draw.pending,null);
 assertUniversalMatch(packs,draw);
});

test('CSM-1-048 attack end stays inside the raid frame',()=>{
 let s=open(1052,['CSM-1-048','CSM-1-050','CSM-1-067','CSM-1-060']);
 const plain=put(s,0,'CSM-1-048','front',0);
 csmOnAttackEnd(pack,s,plain);
 assert.equal(s.effectQueue.some(job=>job.id==='CSM-1-048'),false);
 const base=take(s,0,'CSM-1-050');
 base.faceDown=false;
 plain.stack=[base];
 csmOnAttackEnd(pack,s,plain);
 assert.equal(s.effectQueue[0]?.slot,'attackEnd');
 assert.equal(s.effectQueue[0]?.sourceUid,plain.uid);
 assert.equal(raidBoxListed('CSM-1-048','attackEnd'),true);
 assert.equal(raidBoxListed('CSM-1-048','onPlay'),false);
});

test('CSM-1-049 rests, adds red energy, and retires at the end of main',()=>{
 let s=open(1053,['CSM-1-049','CSM-1-060']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const denji=put(s,0,'CSM-1-049','energy',2,true);
 const before=universalEnergyByColor(pack,s,0).red;
 s=use(s,{type:'activate',uid:denji.uid,mode:'selfRestEnergyRetire'});
 assert.equal(live(s,0,denji.uid).ready,false);
 assert.equal(universalEnergyByColor(pack,s,0).red,before+1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===denji.uid),false);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===denji.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===denji.uid),false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-050 draws, then discards one hand card including the card just drawn',()=>{
 let s=open(1054,['CSM-1-050','CSM-1-060','CSM-1-041','CSM-1-043']);
 redFuel(s,0,['CSM-1-060','CSM-1-043']);
 const drawn=top(s,0,['CSM-1-041'])[0];
 const other=toHand(s,0,'CSM-1-043');
 const denji=toHand(s,0,'CSM-1-050');
 s=play(s,denji.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===drawn.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===other.uid),true);
 s=choose(s,a=>a.uid===drawn.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-051 shows both looked cards, then tucks only a legal outside card',()=>{
 let s=open(1055,['CSM-1-051','CSM-1-049','CSM-1-050','CSM-1-006','CSM-1-067','CSM-1-076','CSM-1-060','CSM-1-041','CSM-1-052']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-041']);
 const host=put(s,0,'CSM-1-049','front',1);
 const raided=put(s,0,'CSM-1-050','front',2);
 const buried=take(s,0,'CSM-1-052');
 buried.faceDown=false;
 raided.stack=[buried];
 const covered=put(s,0,'CSM-1-006','energy',3);
 const down=take(s,0,'CSM-1-052');
 down.faceDown=true;down.ready=false;down.fieldEntryStamp=null;
 covered.under=[down];
 const pochita=toOutside(s,0,'CSM-1-067');
 const dream=toOutside(s,0,'CSM-1-076');
 const junk=toOutside(s,0,'CSM-1-041');
 const [first,second]=top(s,0,['CSM-1-041','CSM-1-052']);
 const reveals=s.publicReveals.length;
 const denji=toHand(s,0,'CSM-1-051');
 s=play(s,denji.uid);
 assert.equal(s.pending?.step,'arrange');
 assert.deepEqual(s.pending.data.window,[first.uid,second.uid]);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-041','CSM-1-052']);
 const art=controllerChoiceArt(pack,s,{type:'csm',mode:'keep',uid:second.uid});
 assert.equal(art[0]?.cardId,'CSM-1-052');
 assert.equal(s.publicReveals.length,reveals);
 s=choose(s,a=>a.mode==='keep'&&a.uid===second.uid);
 const still=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(still.map(c=>c.uid),[first.uid,second.uid]);
 s=choose(s,a=>a.mode==='outside'&&a.uid===first.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(s.players[0].deck[0]?.uid,second.uid);
 assert.equal(s.pending?.step,'tuckCard');
 const hosts=s.pending.data.hosts;
 assert.equal(hosts.includes(host.uid),true);
 assert.equal(hosts.includes(denji.uid),true);
 assert.equal(hosts.includes(raided.uid),false);
 assert.equal(hosts.includes(covered.uid),false);
 const cards=s.pending.actions.filter(a=>a.mode==='card').map(a=>a.uid);
 assert.deepEqual(cards.sort(),[pochita.uid,dream.uid].sort());
 assert.equal(cards.includes(junk.uid),false);
 s=choose(s,a=>a.mode==='card'&&a.uid===pochita.uid);
 assert.equal(s.pending?.step,'tuckHost');
 s=choose(s,a=>a.mode==='host'&&a.uid===host.uid);
 assert.equal(csmFacedowns(live(s,0,host.uid)).some(c=>c.uid===pochita.uid),true);
 const tucked=s.zoneMoveEvents.find(e=>e.uid===pochita.uid&&e.to==='raid-under');
 assert.equal(tucked?.sourceUid,host.uid);
 assert.equal(tucked?.reason,'own-effect');
 assert.equal(s.players[0].outside.some(c=>c.uid===dream.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-053 shows ineligible cards, orders the rest, then discards one hand card',()=>{
 let s=open(1056,['CSM-1-053','CSM-1-052','CSM-1-001','CSM-1-002','CSM-1-060']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const [miss,hit,other]=top(s,0,['CSM-1-001','CSM-1-052','CSM-1-002']);
 const aki=toHand(s,0,'CSM-1-053');
 s=play(s,aki.uid);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[miss.uid,hit.uid,other.uid]);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-001','CSM-1-052','CSM-1-002']);
 assert.equal(shown.find(c=>c.uid===miss.uid).caption,'目前不能選');
 assert.equal(shown.find(c=>c.uid===hit.uid).action?.uid,hit.uid);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===hit.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===hit.uid),true);
 assert.equal(s.publicReveals.some(e=>e.uid===hit.uid&&e.kind==='searched-to-hand'),true);
 assert.equal(s.publicReveals.some(e=>e.uid===miss.uid),false);
 assert.equal(s.pending?.kind,'effect-top-order');
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===other.uid);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===miss.uid);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===hit.uid),true);
 s=choose(s,a=>a.uid===hit.uid);
 assert.equal(s.players[0].outside.filter(c=>c.uid===hit.uid).length,1);
 assert.equal(s.players[0].hand.some(c=>c.uid===hit.uid),false);
 const deck=s.players[0].deck;
 assert.equal(deck.at(-1)?.uid,miss.uid);
 assert.equal(deck.at(-2)?.uid,other.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let missed=open(1057,['CSM-1-053','CSM-1-001','CSM-1-002','CSM-1-009','CSM-1-060']);
 redFuel(missed,0,['CSM-1-060','CSM-1-060']);
 const window=top(missed,0,['CSM-1-001','CSM-1-002','CSM-1-009']);
 const played=toHand(missed,0,'CSM-1-053');
 const hand=missed.players[0].hand.length;
 missed=play(missed,played.uid);
 assert.equal(missed.pending?.kind,'effect-top-order');
 assert.deepEqual(missed.pending.uids,window.map(c=>c.uid));
 const missedShown=controllerDeckWindowCards(missed,packs,legalUniversalActions(packs,missed));
 assert.deepEqual(missedShown.map(c=>c.cardId),['CSM-1-001','CSM-1-002','CSM-1-009']);
 while(missed.pending?.kind==='effect-top-order')
  missed=choose(missed,a=>a.type==='chooseTopOrder');
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.length,hand-1);
 assert.equal(missed.players[0].deck.at(-1)?.uid,window[2].uid);
 assertUniversalMatch(packs,missed);
});

test('CSM-1-054 tucks a drawn card under itself and may peel a front Aki',()=>{
 let quiet=open(1058,['CSM-1-054','CSM-1-060']);
 redFuel(quiet,0,['CSM-1-060','CSM-1-060']);
 const played=toHand(quiet,0,'CSM-1-054');
 const hand=quiet.players[0].hand.length;
 quiet=play(quiet,played.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.length,hand-1);
 assertUniversalMatch(packs,quiet);

 let s=open(1059,['CSM-1-054','CSM-1-063','CSM-1-052','CSM-1-011','CSM-1-060','CSM-1-041','CSM-1-043']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-043']);
 put(s,0,'CSM-1-063','front',1);
 const drawn=top(s,0,['CSM-1-041'])[0];
 const spare=toHand(s,0,'CSM-1-043');
 const aki=toHand(s,0,'CSM-1-054');
 s=play(s,aki.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.pending?.step,'tuckHand');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(s.pending.actions.some(a=>a.uid===drawn.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===spare.uid),true);
 s=choose(s,a=>a.mode==='card'&&a.uid===drawn.uid);
 assert.equal(csmFacedowns(live(s,0,aki.uid)).some(c=>c.uid===drawn.uid),true);
 const move=s.zoneMoveEvents.find(e=>e.uid===drawn.uid&&e.to==='raid-under');
 assert.equal(move?.sourceUid,aki.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let attack=toPhase(fresh(countsFor(['CSM-1-054','CSM-1-052','CSM-1-011','CSM-1-005','CSM-1-044','CSM-1-041','CSM-1-043']),1060),'attack');
 const striker=put(attack,0,'CSM-1-054','front',0,true);
 const frontAki=put(attack,0,'CSM-1-052','front',1);
 const energyAki=put(attack,0,'CSM-1-011','energy',0);
 const frontDown=take(attack,0,'CSM-1-041');
 const energyDown=take(attack,0,'CSM-1-043');
 for(const c of [frontDown,energyDown]){c.faceDown=true;c.ready=false;c.fieldEntryStamp=null;}
 frontAki.under=[frontDown];
 energyAki.under=[energyDown];
 revealLife(attack,1,'CSM-1-044');
 attack=use(attack,{type:'attack',uid:striker.uid});
 assert.equal(attack.pending?.step,'peelBuff');
 assert.equal(attack.pending.actions.some(a=>a.uid===frontDown.uid),true);
 assert.equal(attack.pending.actions.some(a=>a.uid===energyDown.uid),false);
 assert.equal(attack.pending.actions.some(a=>a.mode==='skip'),true);
 attack=choose(attack,a=>a.mode==='peel'&&a.uid===frontDown.uid);
 assert.equal(attack.players[0].outside.some(c=>c.uid===frontDown.uid),true);
 assert.equal(universalBp(pack,attack,live(attack,0,striker.uid)),pack.cards['CSM-1-054'].bp+1500);
 assert.equal(csmFacedowns(live(attack,0,energyAki.uid)).some(c=>c.uid===energyDown.uid),true);
 if(attack.pending?.kind==='block')attack=use(attack,{type:'chooseBlock',uid:null});
 assertUniversalMatch(packs,attack);
});

test('CSM-1-055 cannot activate a branch Aki already chose, and pays the hand card first',()=>{
 let s=open(1061,['CSM-1-055','CSM-1-052','CSM-1-001','CSM-1-049','CSM-1-057','CSM-1-060','CSM-1-041','CSM-1-043']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-043']);
 const first=put(s,0,'CSM-1-055','front',0);
 const second=put(s,0,'CSM-1-055','front',1);
 const third=put(s,0,'CSM-1-055','front',2);
 const costs=['CSM-1-041','CSM-1-043','CSM-1-057'].map(id=>toHand(s,0,id));
 const [miss,denji,power]=top(s,0,['CSM-1-001','CSM-1-049','CSM-1-057']);
 s=use(s,{type:'activate',uid:first.uid,mode:'csm:0'});
 s=choose(s,a=>a.mode==='discard'&&a.uid===costs[0].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===costs[0].uid),true);
 s=choose(s,a=>a.mode==='search');
 assert.equal(s.mainReadyOnceByName[0].includes('akiSearch'),true);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-001','CSM-1-049','CSM-1-057']);
 assert.equal(shown.find(c=>c.uid===miss.uid).caption,'目前不能選');
 s=choose(s,a=>a.mode==='take'&&a.uid===denji.uid);
 while(s.pending?.step==='lookOrder')s=choose(s,a=>a.mode==='next');
 assert.equal(s.players[0].hand.some(c=>c.uid===denji.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===power.uid),false);
 s=use(s,{type:'activate',uid:second.uid,mode:'csm:0'});
 s=choose(s,a=>a.mode==='discard'&&a.uid===costs[1].uid);
 assert.equal(s.pending.actions.some(a=>a.mode==='search'),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='block'),true);
 s=choose(s,a=>a.mode==='block');
 assert.equal(s.mainReadyOnceByName[0].includes('akiBlock'),true);
 assert.equal(s.pending?.step,'grantBlock3k');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(s.pending.actions.some(a=>a.uid===third.uid),true);
 s=choose(s,a=>a.mode==='pick'&&a.uid===third.uid);
 assert.equal(live(s,0,third.uid).blockAtLeastGranted?.bp,3000);
 assertUniversalMatch(packs,s);
});

test('CSM-1-056 on play is live without a raid, and the later sentences are not',()=>{
 let s=open(1062,['CSM-1-056','CSM-1-052','CSM-1-060','CSM-1-041','CSM-1-043','CSM-1-057']);
 redFuel(s);
 const [a,b,c]=top(s,0,['CSM-1-041','CSM-1-043','CSM-1-057']);
 const aki=toHand(s,0,'CSM-1-056');
 s=play(s,aki.uid);
 const entered=live(s,0,aki.uid);
 assert.equal(universalBp(pack,s,entered),pack.cards['CSM-1-056'].bp+1000);
 assert.deepEqual(csmFacedowns(entered).map(card=>card.uid),[a.uid,b.uid,c.uid]);
 for(const card of [a,b,c]){
  const move=s.zoneMoveEvents.find(e=>e.uid===card.uid&&e.to==='raid-under');
  assert.equal(move?.from,'deck');
  assert.equal(move?.sourceUid,aki.uid);
  assert.equal(move?.reason,'own-effect');
 }
 csmOnTurnStart(pack,s,0);
 assert.equal(live(s,0,aki.uid)?.uid,aki.uid);
 assert.equal(raidBoxListed('CSM-1-056','onPlay'),false);
 assert.equal(raidBoxListed('CSM-1-056','phase'),true);
 assert.equal(raidBoxListed('CSM-1-056','onAttack'),true);
 assertUniversalMatch(packs,s);

 let raid=open(1063,['CSM-1-056','CSM-1-052','CSM-1-063','CSM-1-060','CSM-1-041']);
 redFuel(raid,0,['CSM-1-060','CSM-1-060']);
 const base=put(raid,0,'CSM-1-052','front',0,false);
 put(raid,0,'CSM-1-063','front',1);
 const topCard=toHand(raid,0,'CSM-1-056');
 const action=legalUniversalActions(packs,raid).find(a=>a.type==='raid'&&
  a.uid===topCard.uid&&a.baseUid===base.uid);
 assert.ok(action);
 raid=use(raid,action);
 const host=live(raid,0,topCard.uid);
 assert.ok(host.stack?.some(card=>card.uid===base.uid));
 assert.equal(host.ready,true);
 while(csmFacedowns(host).length){
  const peeled=csmFacedowns(host).at(-1);
  host.under=host.under.filter(card=>card.uid!==peeled.uid);
  peeled.faceDown=false;
  raid.players[0].deck.push(peeled);
 }
 const turn=raid.turn;
 let guard=0;
 while(!(raid.active===0&&raid.phase==='start'&&raid.turn>turn)){
  if(raid.pending)throw Error('Pending blocked the turn loop '+raid.pending.kind);
  raid=use(raid,{type:'next'});
  if(++guard>20)throw Error('Did not reach the next own turn');
 }
 assert.equal(raid.players[0].outside.some(card=>card.uid===topCard.uid),true);
 assert.equal(raid.players[0].front.some(card=>card?.uid===topCard.uid),false);
 assertUniversalMatch(packs,raid);

 let attack=open(10631,['CSM-1-056','CSM-1-052','CSM-1-060','CSM-1-041','CSM-1-043','CSM-1-044']);
 redFuel(attack);
 const raidBase=put(attack,0,'CSM-1-052','front',0,false);
 const raider=toHand(attack,0,'CSM-1-056');
 const raidAction=legalUniversalActions(packs,attack).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===raidBase.uid);
 attack=use(attack,raidAction);
 const liveRaider=live(attack,0,raider.uid);
 assert.equal(csmFacedowns(liveRaider).length,3);
 attack=toPhase(attack,'attack');
 revealLife(attack,1,'CSM-1-044');
 const beforeHand=attack.players[0].hand.map(c=>c.uid);
 attack=use(attack,{type:'attack',uid:raider.uid});
 assert.equal(attack.pending?.step,'peelUnder');
 const peeledUid=csmFacedowns(live(attack,0,raider.uid))[0].uid;
 attack=choose(attack,a=>a.mode==='peel'&&a.uid===peeledUid);
 assert.equal(attack.players[0].hand.some(c=>c.uid===peeledUid),true);
 assert.equal(csmFacedowns(live(attack,0,raider.uid)).length,2);
 assert.equal(live(attack,0,raider.uid).sniperGranted,undefined);
 assert.equal(beforeHand.includes(peeledUid),false);
 if(attack.pending?.kind==='block')attack=use(attack,{type:'chooseBlock',uid:null});
 assertUniversalMatch(packs,attack);

 let grant=open(10632,['CSM-1-056','CSM-1-052','CSM-1-063','CSM-1-060','CSM-1-041']);
 redFuel(grant,0,['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-052']);
 const grantBase=put(grant,0,'CSM-1-052','front',0,false);
 put(grant,0,'CSM-1-063','front',1);
 const grantCard=toHand(grant,0,'CSM-1-056');
 grant=use(grant,legalUniversalActions(packs,grant).find(a=>a.type==='raid'&&
  a.uid===grantCard.uid&&a.baseUid===grantBase.uid));
 const granted=live(grant,0,grantCard.uid);
 while(csmFacedowns(granted).length>1){
  const extra=csmFacedowns(granted).at(-1);
  granted.under=granted.under.filter(c=>c.uid!==extra.uid);
  extra.faceDown=false;
  grant.players[0].deck.push(extra);
 }
 const last=csmFacedowns(granted)[0];
 csmOnAttackDeclare(pack,grant,granted);
 assert.equal(csmFacedowns(granted).length,0);
 assert.equal(grant.players[0].hand.some(c=>c.uid===last.uid),true);
 assert.equal(last.faceDown,false);
 assert.equal(granted.sniperGranted?.turn,grant.turn);
 assert.equal(granted.impactGranted?.amount,1);
 assertUniversalMatch(packs,grant);
});

test('raid life of 047, 048 and 056 can be taken or raided onto the printed base',()=>{
 const cases=[
  ['CSM-1-047','CSM-1-049',['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-043']],
  ['CSM-1-048','CSM-1-049',['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-041']],
  ['CSM-1-056','CSM-1-052',['CSM-1-060','CSM-1-060','CSM-1-041','CSM-1-043']]
 ];
 for(const [id,baseId,fuelIds] of cases){
  const counts=countsFor([id,baseId,'CSM-1-041','CSM-1-043','CSM-1-005','CSM-1-060','CSM-1-044']);
  let s=toPhase(fresh(counts,1700+Number(id.slice(-3))),'attack');
  const striker=put(s,0,'CSM-1-005','front',0,true);
  const base=put(s,1,baseId,'front',0,true);
  const other=put(s,1,'CSM-1-041','front',1,true);
  redFuel(s,1,fuelIds);
  const life=revealLife(s,1,id);
  s=use(s,{type:'attack',uid:striker.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'raid',id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='get'),true,id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='raid'&&a.baseUid===other.uid),false,id);
  const raidAction=legalUniversalActions(packs,s).find(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
  assert.ok(raidAction,id);
  s=use(s,raidAction);
  const raided=live(s,1,life.uid);
  assert.equal(raided.ready,true,id);
  assert.equal(raided.stack.some(c=>c.uid===base.uid),true,id);
  if(id==='CSM-1-056'){
   assert.equal(csmFacedowns(raided).length,3);
   assert.equal(universalBp(pack,s,raided),pack.cards[id].bp+1000);
  }
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-057 shows both cards, puts at most one outside, and orders the rest on top',()=>{
 let s=open(1064,['CSM-1-057','CSM-1-041','CSM-1-052']);
 const [left,right]=top(s,0,['CSM-1-041','CSM-1-052']);
 const reveals=s.publicReveals.length;
 s=play(s,toHand(s,0,'CSM-1-057').uid);
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids,[left.uid,right.uid]);
 assert.equal(s.pending.maxOutside,1);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-041','CSM-1-052']);
 s=choose(s,a=>a.type==='chooseInspectedOutside'&&a.uid===right.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===right.uid),true);
 assert.equal(s.publicReveals.length,reveals);
 s=choose(s,a=>a.uid===left.uid);
 assert.equal(s.players[0].deck[0]?.uid,left.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-058 draws one when it retires',()=>{
 let s=open(1065,['CSM-1-058','CSM-1-040','CSM-1-022','CSM-1-008']);
 fuel(s);
 put(s,0,'CSM-1-022','front',0);
 const power=put(s,1,'CSM-1-058','front',0);
 const hand=s.players[1].hand.length;
 s=play(s,toHand(s,0,'CSM-1-040').uid,'event');
 s=choose(s,a=>a.mode==='pick'&&a.uid===power.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===power.uid),true);
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-059 discards one hand card and adds red energy the turn it enters',()=>{
 let s=open(1066,['CSM-1-059','CSM-1-060','CSM-1-041','CSM-1-043']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const cost=toHand(s,0,'CSM-1-041');
 const power=toHand(s,0,'CSM-1-059');
 const before=universalEnergyByColor(pack,s,0).red;
 s=play(s,power.uid,'play','energy');
 assert.equal(universalEnergyByColor(pack,s,0).red,before+pack.cards['CSM-1-059'].gen);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===power.uid),true);
 s=use(s,{type:'activate',uid:power.uid,mode:'csm:0'});
 assert.equal(s.pending?.step,'discardEnergy');
 s=choose(s,a=>a.mode==='discard'&&a.uid===cost.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===cost.uid),true);
 assert.equal(universalEnergyByColor(pack,s,0).red,before+pack.cards['CSM-1-059'].gen+1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===power.uid),false);
 const energyCopy=put(s,0,'CSM-1-059','energy',3);
 toHand(s,0,'CSM-1-043');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-060 draws on play only while Denji is on the field',()=>{
 let empty=open(1067,['CSM-1-060','CSM-1-041']);
 redFuel(empty,0,['CSM-1-060','CSM-1-060']);
 const played=toHand(empty,0,'CSM-1-060');
 const hand=empty.players[0].hand.length;
 empty=play(empty,played.uid);
 assert.equal(empty.players[0].hand.length,hand-1);
 assert.equal(empty.pending,null);
 assertUniversalMatch(packs,empty);

 let s=open(1068,['CSM-1-060','CSM-1-049','CSM-1-041','CSM-1-052']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 put(s,0,'CSM-1-049','energy',2);
 const drawn=top(s,0,['CSM-1-052'])[0];
 const before=s.players[0].hand.length;
 s=play(s,toHand(s,0,'CSM-1-060').uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.players[0].hand.length,before+1);
 assertUniversalMatch(packs,s);
});

test('life triggers of CSM-1-041 through 060 stay on the printed trigger',()=>{
 const active=['CSM-1-041','CSM-1-042','CSM-1-045','CSM-1-050','CSM-1-052','CSM-1-057'];
 for(const id of active){
  const counts=countsFor([id,'CSM-1-005','CSM-1-003','CSM-1-008']);
  let s=toPhase(fresh(counts,1400+Number(id.slice(-3))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const ally=put(s,1,'CSM-1-003','front',0,false);
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'active',id);
  s=use(s,{type:'chooseTrigger',mode:'active',uid:ally.uid});
  assert.equal(live(s,1,ally.uid).ready,true);
  assert.equal(universalBp(pack,s,live(s,1,ally.uid)),pack.cards['CSM-1-003'].bp+3000);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-043','CSM-1-053','CSM-1-059','CSM-1-060']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,1500+Number(id.slice(-3))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  revealLife(s,1,id);
  const hand=s.players[1].hand.length;
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'draw',id);
  s=use(s,{type:'chooseTrigger',mode:'draw'});
  assert.equal(s.players[1].hand.length,hand+1);
  assertUniversalMatch(packs,s);
 }
 const counts=countsFor(['CSM-1-055','CSM-1-005','CSM-1-008']);
 let got=toPhase(fresh(counts,1555),'attack');
 put(got,0,'CSM-1-005','front',0,true);
 const life=revealLife(got,1,'CSM-1-055');
 got=use(got,{type:'attack',uid:got.players[0].front[0].uid});
 got=use(got,{type:'chooseBlock',uid:null});
 assert.equal(got.pending?.trigger,'get');
 got=use(got,{type:'chooseTrigger',mode:'get'});
 assert.equal(got.players[1].hand.some(c=>c.uid===life.uid),true);
 assertUniversalMatch(packs,got);
 for(const id of ['CSM-1-044','CSM-1-046','CSM-1-049','CSM-1-051','CSM-1-054','CSM-1-058']){
  const quietCounts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(quietCounts,1600+Number(id.slice(-3))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const lives=s.players[1].life.length;
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].life.length,lives-1);
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-046 gains the unblocked text when an effect moves it outside the move phase',()=>{
 let s=open(2046,['CSM-1-046','CSM-1-066','CSM-1-048','CSM-1-041']);
 const moved=put(s,0,'CSM-1-046','energy',0,true);
 put(s,0,'CSM-1-041','energy',1,true);
 const power=put(s,0,'CSM-1-066','front',0,true);
 const attacker=put(s,1,'CSM-1-048','front',0,true);
 s.active=1;
 s.phase='attack';
 s=use(s,{type:'attack',uid:attacker.uid});
 s=use(s,{type:'chooseBlock',uid:power.uid});
 assert.equal(s.players[0].front.some(c=>c?.uid===power.uid),false);
 assert.equal(s.pending?.id,'CSM-1-066');
 assert.equal(s.pending?.step,'buffMoveFront');
 s=choose(s,a=>a.mode==='pick'&&a.uid===moved.uid);
 if(s.pending?.step==='moveFront')s=choose(s,a=>a.mode==='move'&&(a.uid===moved.uid||a.uid==null));
 const landed=s.players[0].front.find(c=>c?.uid===moved.uid);
 assert.ok(landed);
 assert.equal(landed.blockAtLeastGranted?.bp,4000);
 assert.equal(landed.csmUnblockedDraw,s.turn);
 assertUniversalMatch(packs,s);
});
