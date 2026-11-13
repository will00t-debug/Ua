// Shared gaps after round 6. Synthetic cards exercise the new engine.
// IMC-1-011, 012, 039, 051, 061, 075 and 107 stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_PROGRAMS_STARTER} from '../dist/universal-v2/imc/programs-starter.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';

const trait='お願い！シンデレラ';
const girls='ガールズ・イン・ザ・フロンティア';
function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length||rest.mainAbility||
   rest.bpGainFollow||rest.ownEffectPresenceBp||rest.ownTurnBp||rest.unblockedAttack?'dsl':'vanilla'),
  effects
 };
}
function open(cards,{seed=61,first=0,phase='main'}={}){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe',version:'imc-gap-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
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
function fuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function play(pack,s,id,p=0,line='front'){
 const card=hold(s,id,p);
 fuel(s,2,p);
 const action=legalUniversalActions(pack,s).find(a=>a.uid===card.uid&&a.type==='play'&&
  a.line===line&&a.replaceUid===undefined);
 assert.ok(action,id);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function cast(pack,s,id,p=0){
 const card=hold(s,id,p);
 fuel(s,2,p);
 const action=legalUniversalActions(pack,s).find(a=>a.uid===card.uid&&a.type==='event');
 assert.ok(action,id);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,s.pending?.kind||'action');
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function passTo(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(pack,s,a=>a.type==='chooseHandLimit');
   continue;
  }
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>30)throw Error('Did not reach player '+player+' '+phase+' (now '+s.active+' '+s.phase+')');
 }
 return s;
}
function find(s,p,id){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c&&c.cardId===id);
}
function follows(c){
 return (c.buffs||[]).filter(b=>b&&b.bpGainFollow===true);
}
function sniper(pack,s,uid){
 return legalUniversalActions(pack,s).filter(a=>a.type==='attack'&&a.uid===uid&&a.targetUid);
}
function bodies(s){
 let n=0;
 const walk=c=>{
  if(!c)return;
  n+=1;
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of p[zone]||[])walk(c);
  for(const line of ['front','energy'])for(const c of p[line])walk(c);
 }
 return n;
}

test('BP gain follow separates passive, temporary and its own echo',()=>{
 const cards=[
  face({id:'OBS',name:'觀察',bp:2000,bpGainFollow:{bp:1000},
   effects:{onPlay:[{op:'buffSelf',bp:1000}]}}),
  face({id:'HALF',name:'一半',bp:2000,bpGainFollow:{bp:500},
   effects:{onPlay:[{op:'buffSelf',bp:1000}]}}),
  face({id:'PAS',name:'被動',bp:2000,ownTurnBp:1000,bpGainFollow:{bp:1000}}),
  face({id:'PLAIN',name:'一般',bp:2000,effects:{onPlay:[{op:'buffSelf',bp:1000}]}}),
  face({id:'BUF',name:'加值',type:'event',effects:{onPlay:[
   {op:'buffAnyCharacter',bp:1000,optional:false,excludeSelf:false}]}})
 ];
 const started=open(cards,{seed:611});
 const before=bodies(started.s);
 let s=play(started.pack,started.s,'OBS');
 const obs=find(s,0,'OBS');
 assert.equal(universalBp(started.pack,s,obs),4000);
 assert.equal(follows(obs).length,1);
 assert.equal(follows(obs)[0].bp,1000);
 assert.equal(obs.bpGainFollowTurn,s.turn);
 s=cast(started.pack,s,'BUF');
 s=act(started.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===find(s,0,'OBS').uid);
 assert.equal(follows(find(s,0,'OBS')).length,1);
 assert.equal(universalBp(started.pack,s,find(s,0,'OBS')),5000);
 s=dispatchUniversalAction(started.pack,s,{type:'next'});
 assert.equal(universalBp(started.pack,s,find(s,0,'OBS')),5000);
 assert.equal(follows(find(s,0,'OBS')).length,1);
 s=passTo(started.pack,s,0,'main');
 s=play(started.pack,s,'HALF');
 assert.equal(universalBp(started.pack,s,find(s,0,'HALF')),3500);
 assert.equal(follows(find(s,0,'HALF'))[0].bp,500);
 s=play(started.pack,s,'PAS');
 const passive=find(s,0,'PAS');
 assert.equal(universalBp(started.pack,s,passive),3000);
 assert.equal(follows(passive).length,0);
 assert.equal(passive.bpGainFollowTurn,undefined);
 s=cast(started.pack,s,'BUF');
 s=act(started.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===passive.uid);
 assert.equal(universalBp(started.pack,s,find(s,0,'PAS')),5000);
 assert.equal(follows(find(s,0,'PAS')).length,1);
 s=play(started.pack,s,'PLAIN');
 const plain=find(s,0,'PLAIN');
 assert.equal(universalBp(started.pack,s,plain),3000);
 assert.equal(plain.bpGainNoted,undefined);
 assert.equal(follows(plain).length,0);
 assert.equal(bodies(s),before);
});

test('opponent-turn BP does not spend the once-per-turn follow',()=>{
 const cards=[
  face({id:'OBS',name:'觀察',bp:2000,bpGainFollow:{bp:1000}}),
  face({id:'BUF',name:'加值',type:'event',effects:{onPlay:[
   {op:'buffAnyCharacter',bp:1000,optional:false,excludeSelf:false}]}})
 ];
 const started=open(cards,{seed:612,first:1});
 const obs=seat(started.s,0,'OBS','front',0);
 let s=cast(started.pack,started.s,'BUF',1);
 s=act(started.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===obs.uid);
 const watched=find(s,0,'OBS');
 assert.equal(universalBp(started.pack,s,watched),3000);
 assert.equal(follows(watched).length,0);
 assert.equal(watched.bpGainFollowTurn,undefined);
 s=passTo(started.pack,s,0,'main');
 s=cast(started.pack,s,'BUF',0);
 s=act(started.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===find(s,0,'OBS').uid);
 assert.equal(follows(find(s,0,'OBS')).length,1);
 assert.equal(universalBp(started.pack,s,find(s,0,'OBS')),4000);
 const spent=s.turn;
 s=dispatchUniversalAction(started.pack,s,{type:'next'});
 s=passTo(started.pack,s,0,'main');
 assert.notEqual(s.turn,spent);
 s=cast(started.pack,s,'BUF');
 s=act(started.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===find(s,0,'OBS').uid);
 assert.equal(follows(find(s,0,'OBS')).length,1);
 assert.equal(find(s,0,'OBS').bpGainFollowTurn,s.turn);
 assert.equal(universalBp(started.pack,s,find(s,0,'OBS')),4000);
});

test('conditional sniper rereads BP and immediate sniper does not',()=>{
 const cards=[
  face({id:'LOW',name:'未達',bp:6000,effects:{onPlay:[
   {op:'grantConditionalSniperThisTurn',minBp:7000}]}}),
  face({id:'RISE',name:'達標',bp:6500,effects:{onPlay:[
   {op:'buffSelf',bp:500},{op:'grantConditionalSniperThisTurn',minBp:7000}]}}),
  face({id:'ECHO',name:'追加',bp:6000,bpGainFollow:{bp:500},effects:{onPlay:[
   {op:'buffSelf',bp:500},{op:'grantConditionalSniperThisTurn',minBp:7000}]}}),
  face({id:'NOW',name:'立即',bp:6000,effects:{onPlay:[
   {op:'grantSelfSniperThisTurn'}]}}),
  face({id:'PASS',name:'被動達標',bp:6000,ownTurnBp:1000,effects:{onPlay:[
   {op:'grantConditionalSniperThisTurn',minBp:7000}]}}),
  face({id:'TGT',name:'目標',bp:1000})
 ];
 const started=open(cards,{seed:613});
 seat(started.s,1,'TGT','front',0);
 let s=play(started.pack,started.s,'LOW');
 const low=find(s,0,'LOW');
 low.ready=true;
 s=passTo(started.pack,s,0,'attack');
 assert.equal(sniper(started.pack,s,low.uid).length,0);
 s=passTo(started.pack,s,0,'main');
 s=play(started.pack,s,'RISE');
 assert.equal(universalBp(started.pack,s,find(s,0,'RISE')),7000);
 find(s,0,'RISE').ready=true;
 s=passTo(started.pack,s,0,'attack');
 assert.equal(sniper(started.pack,s,find(s,0,'RISE').uid).length,1);
 s=passTo(started.pack,s,0,'main');
 s=play(started.pack,s,'ECHO');
 const echo=find(s,0,'ECHO');
 assert.equal(universalBp(started.pack,s,echo),7000);
 assert.equal(follows(echo).length,1);
 echo.ready=true;
 s=passTo(started.pack,s,0,'attack');
 assert.equal(sniper(started.pack,s,echo.uid).length,1);
 s=passTo(started.pack,s,0,'main');
 s=play(started.pack,s,'NOW');
 find(s,0,'NOW').ready=true;
 s=passTo(started.pack,s,0,'attack');
 assert.equal(universalBp(started.pack,s,find(s,0,'NOW')),6000);
 assert.equal(sniper(started.pack,s,find(s,0,'NOW').uid).length,1);
 s=passTo(started.pack,s,0,'main');
 const crowded=s.players[0].front.findIndex(c=>c&&c.cardId==='LOW');
 s.players[0].outside.push(s.players[0].front[crowded]);
 s.players[0].front[crowded]=null;
 s=play(started.pack,s,'PASS');
 const passive=find(s,0,'PASS');
 assert.equal(universalBp(started.pack,s,passive),7000);
 assert.equal(follows(passive).length,0);
 passive.ready=true;
 s=passTo(started.pack,s,0,'attack');
 assert.equal(sniper(started.pack,s,passive.uid).length,1);
});

test('rest and retire pay before an optional outside or hand entry',()=>{
 const outside={op:'deployOutsideColorTraitRest',color:'blue',trait:'LiPPS',
  maxEnergy:2,ready:false,optional:true};
 const hand={op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:1};
 const cards=[
  face({id:'ACT',name:'起動',mainAbility:{op:'restRetireSequence',
   gate:{kind:'oppCharacterBpAtLeast',bp:4500},then:[outside]}}),
  face({id:'FIELD',name:'場域',type:'field',bp:0,color:'red',mainAbility:{
   op:'restRetireSequence',draw:1,then:[hand]}}),
  face({id:'BIG',name:'高BP',bp:4500}),
  face({id:'SMALL',name:'低BP',bp:4000}),
  face({id:'OK',name:'可登場',color:'blue',energy:2,traits:['LiPPS']}),
  face({id:'HIGH',name:'太貴',color:'blue',energy:3,traits:['LiPPS']}),
  face({id:'RED',name:'紅',color:'red',energy:2,traits:['LiPPS']}),
  face({id:'HAND',name:'手牌',color:'red',energy:3,ap:1}),
  face({id:'DRAWN',name:'抽到',color:'red',energy:3,ap:1})
 ];
 assert.throws(()=>createUniversalPack({id:'bad',version:'x',cards:[
  face({id:'BAD',name:'混用',mainAbility:{op:'restRetireSequence',
   then:[{op:'draw',count:1}]}})]}),/invalid rest and retire sequence/);
 const closed=open(cards,{seed:621});
 seat(closed.s,1,'SMALL','front',0);
 seat(closed.s,0,'ACT','front',0);
 assert.equal(legalUniversalActions(closed.pack,closed.s).some(a=>a.mode==='restRetireSequence'),false);
 const empty=open(cards,{seed:622});
 const actor=seat(empty.s,0,'ACT','energy',0);
 seat(empty.s,1,'BIG','front',0);
 const before=bodies(empty.s);
 let s=act(empty.pack,empty.s,a=>a.uid===actor.uid&&a.mode==='restRetireSequence');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===actor.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(bodies(s),before);
 const paid=open(cards,{seed:623});
 const source=seat(paid.s,0,'ACT','front',0);
 seat(paid.s,1,'BIG','front',0);
 const ok=pull(paid.s,0,'OK');
 const high=pull(paid.s,0,'HIGH');
 const red=pull(paid.s,0,'RED');
 paid.s.players[0].outside.push(ok,high,red);
 s=act(paid.pack,paid.s,a=>a.uid===source.uid&&a.mode==='restRetireSequence');
 assert.equal(s.pending.kind,'effect-outside-color-rest');
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.deepEqual(s.pending.choices,[ok.uid]);
 s=act(paid.pack,s,a=>a.type==='chooseOutsideColorRest'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===ok.uid));
 const chosen=open(cards,{seed:624});
 const again=seat(chosen.s,0,'ACT','front',0);
 seat(chosen.s,1,'BIG','front',0);
 const pick=pull(chosen.s,0,'OK');
 chosen.s.players[0].outside.push(pick);
 s=act(chosen.pack,chosen.s,a=>a.uid===again.uid&&a.mode==='restRetireSequence');
 s=act(chosen.pack,s,a=>a.type==='chooseOutsideColorRest'&&a.uid===pick.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c&&c.uid===pick.uid).ready,false);
 const field=open(cards,{seed:625});
 const zone=seat(field.s,0,'FIELD','energy',0);
 const drawn=pull(field.s,0,'DRAWN');
 field.s.players[0].deck.unshift(drawn);
 const handBefore=field.s.players[0].hand.length;
 s=act(field.pack,field.s,a=>a.uid===zone.uid&&a.mode==='restRetireSequence');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.ok(s.players[0].outside.some(c=>c.uid===zone.uid));
 assert.equal(s.players[0].hand.length,handBefore+1);
 assert.ok(s.pending.choices.includes(drawn.uid));
 assert.ok(!s.pending.choices.includes(zone.uid));
 s=act(field.pack,s,a=>a.type==='chooseHandRest'&&a.uid===drawn.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c&&c.uid===drawn.uid).ready,false);
 const skipped=open(cards,{seed:626});
 const resting=seat(skipped.s,0,'FIELD','energy',0);
 const top=pull(skipped.s,0,'DRAWN');
 skipped.s.players[0].deck.unshift(top);
 s=act(skipped.pack,skipped.s,a=>a.uid===resting.uid&&a.mode==='restRetireSequence');
 s=act(skipped.pack,s,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===top.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===resting.uid));
 assert.equal(s.players[0].front.some(c=>c&&c.uid===top.uid),false);
});

test('own-effect entry or move grants presence BP and a move-phase move does not',()=>{
 const cards=[
  face({id:'SELF',name:'本人',color:'purple',energy:2,ap:3,bp:3000,ownEffectPresenceBp:1000}),
  face({id:'PAID',name:'付費',bp:3000,ownEffectPresenceBp:1000}),
  face({id:'EVT',name:'登場',type:'event',effects:{onPlay:[{op:'deployOwnHandRest',
   type:'character',color:'purple',energy:2,ap:3,max:1}]}}),
  face({id:'MOVE',name:'移動',bp:3000,ownEffectPresenceBp:1000,mainAbility:{
   op:'discardExactFrontMove',line:'energy',dest:'front',attackEnd:'energy',
   trait:girls,count:3}}),
  face({id:'GIRL',name:'前線',traits:[girls]}),
  face({id:'OTHER',name:'其他',traits:['其他']})
 ];
 const moved=open(cards,{seed:631,phase:'move'});
 const walker=seat(moved.s,0,'SELF','energy',0);
 let s=act(moved.pack,moved.s,a=>a.type==='move'&&a.uid===walker.uid);
 assert.equal(find(s,0,'SELF').ownEffectMovedTurn,undefined);
 assert.equal(find(s,0,'SELF').ownEffectEnteredTurn,undefined);
 assert.equal(universalBp(moved.pack,s,find(s,0,'SELF')),3000);
 const paid=open(cards,{seed:632});
 s=play(paid.pack,paid.s,'PAID');
 assert.equal(find(s,0,'PAID').ownEffectEnteredTurn,undefined);
 assert.equal(universalBp(paid.pack,s,find(s,0,'PAID')),3000);
 const entered=open(cards,{seed:633});
 hold(entered.s,'SELF');
 s=cast(entered.pack,entered.s,'EVT');
 s=act(entered.pack,s,a=>a.type==='chooseHandRest'&&a.uid&&a.line==='front');
 const arrived=find(s,0,'SELF');
 assert.equal(arrived.ownEffectEnteredTurn,s.turn);
 assert.equal(universalBp(entered.pack,s,arrived),4000);
 const exact=open(cards,{seed:634});
 seat(exact.s,0,'MOVE','energy',0);
 seat(exact.s,0,'GIRL','front',0);
 seat(exact.s,0,'GIRL','front',1);
 assert.equal(legalUniversalActions(exact.pack,exact.s).some(a=>a.mode==='discardExactFrontMove'),false);
 seat(exact.s,0,'GIRL','front',2);
 seat(exact.s,0,'GIRL','front',3);
 assert.equal(legalUniversalActions(exact.pack,exact.s).some(a=>a.mode==='discardExactFrontMove'),false);
 const ready=open(cards,{seed:635});
 const mover=seat(ready.s,0,'MOVE','energy',0);
 for(let i=0;i<3;i++)seat(ready.s,0,'GIRL','front',i);
 const discard=hold(ready.s,'FILL-01');
 const count=bodies(ready.s);
 s=act(ready.pack,ready.s,a=>a.uid===mover.uid&&a.mode==='discardExactFrontMove');
 assert.equal(s.pending.kind,'effect-discard');
 s=act(ready.pack,s,a=>a.type==='chooseDiscard'&&a.uid===discard.uid);
 const shifted=find(s,0,'MOVE');
 assert.equal(shifted.ownEffectMovedTurn,s.turn);
 assert.equal(universalBp(ready.pack,s,shifted),4000);
 assert.equal(shifted.attackEndLineGranted.line,'energy');
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.pending,null);
 assert.equal(bodies(s),count);
 const full=open(cards,{seed:636});
 const blocked=seat(full.s,0,'MOVE','energy',0);
 for(let i=0;i<3;i++)seat(full.s,0,'GIRL','front',i);
 const other=seat(full.s,0,'OTHER','front',3);
 const cost=hold(full.s,'FILL-01');
 s=act(full.pack,full.s,a=>a.uid===blocked.uid&&a.mode==='discardExactFrontMove');
 s=act(full.pack,s,a=>a.type==='chooseDiscard'&&a.uid===cost.uid);
 assert.equal(s.pending.kind,'effect-move-self');
 assert.ok(s.players[0].outside.some(c=>c.uid===cost.uid));
 s=act(full.pack,s,a=>a.type==='chooseMoveSelf'&&a.replaceUid===other.uid);
 assert.equal(s.players[0].front.find(c=>c&&c.uid===blocked.uid)&&true,true);
 assert.ok(s.players[0].removed.some(c=>c.uid===other.uid));
 assert.equal(find(s,0,'MOVE').attackEndLineGranted.line,'energy');
});

test('attack-end energy move waits until the life trigger check finishes',()=>{
 const cards=[
  face({id:'MOVE',name:'移動',bp:5000,ownEffectPresenceBp:1000,mainAbility:{
   op:'discardExactFrontMove',line:'energy',dest:'front',attackEnd:'energy',
   trait:girls,count:3}}),
  face({id:'GIRL',name:'前線',traits:[girls]}),
  face({id:'HOLD',name:'佔位'}),
  face({id:'LIFE',name:'觸發',trigger:'draw'})
 ];
 const started=open(cards,{seed:637});
 const mover=seat(started.s,0,'MOVE','energy',3);
 for(let i=0;i<3;i++){
  seat(started.s,0,'GIRL','front',i);
  seat(started.s,0,'HOLD','energy',i);
 }
 const discard=hold(started.s,'FILL-01');
 let s=act(started.pack,started.s,a=>a.uid===mover.uid&&a.mode==='discardExactFrontMove');
 s=act(started.pack,s,a=>a.type==='chooseDiscard'&&a.uid===discard.uid);
 assert.ok(s.players[0].front.some(c=>c&&c.uid===mover.uid));
 const life=pull(s,1,'LIFE');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life=[life];
 s=passTo(started.pack,s,0,'attack');
 s=act(started.pack,s,a=>a.type==='attack'&&a.uid===mover.uid&&!a.targetUid);
 if(s.pending?.kind==='block')s=act(started.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.ok(s.players[0].front.some(c=>c&&c.uid===mover.uid));
 s=act(started.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].energy.some(c=>c&&c.uid===mover.uid));
 assert.equal(s.players[0].front.some(c=>c&&c.uid===mover.uid),false);
});

test('readying an AP schedules the attack-phase hand return and skipping does not',()=>{
 const cards=[
  face({id:'BACK',name:'回手',unblockedAttack:{optional:true,then:[{op:'draw',count:1}]},
   effects:{onPlay:[{op:'activeSelf'},
    {op:'optionalReadyApThen',then:[{op:'grantAttackPhaseEndHand'}]}]}}),
  face({id:'HOST',name:'宿主',effects:{onPlay:[
   {op:'recoverAp',count:1},
   {op:'deployOwnHandRest',type:'character',color:'purple',energy:1,ap:2,max:1}]}}),
  face({id:'QUIET',name:'沒有休息AP',color:'purple',energy:1,ap:2,effects:{onPlay:[
   {op:'activeSelf'},
   {op:'optionalReadyApThen',then:[{op:'grantAttackPhaseEndHand'}]}]}})
 ];
 const skipped=open(cards,{seed:641});
 let s=play(skipped.pack,skipped.s,'BACK');
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 s=act(skipped.pack,s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(find(s,0,'BACK').attackPhaseEndHand,undefined);
 assert.equal(rested.ready,false);
 s=passTo(skipped.pack,s,1,'start');
 assert.ok(find(s,0,'BACK'));
 const granted=open(cards,{seed:642});
 s=play(granted.pack,granted.s,'BACK');
 const ap=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 s=act(granted.pack,s,a=>a.type==='chooseApRecovery'&&a.uid===ap.uid);
 assert.equal(find(s,0,'BACK').attackPhaseEndHand.turn,s.turn);
 assert.equal(s.players[0].apCards.find(c=>c.uid===ap.uid).ready,true);
 const uid=find(s,0,'BACK').uid;
 s=passTo(granted.pack,s,1,'start');
 assert.equal(find(s,0,'BACK'),undefined);
 assert.ok(s.players[0].hand.some(c=>c.uid===uid));
 const quiet=open(cards,{seed:643});
 fuel(quiet.s,1);
 hold(quiet.s,'QUIET');
 s=play(quiet.pack,quiet.s,'HOST');
 s=act(quiet.pack,s,a=>a.type==='chooseApRecovery'&&a.uid);
 s=act(quiet.pack,s,a=>a.type==='chooseHandRest'&&a.line==='front');
 const entered=find(s,0,'QUIET');
 assert.equal(entered.ready,true);
 assert.equal(entered.attackPhaseEndHand,undefined);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.some(c=>c.inPlay&&!c.ready),false);
});

test('a trait bounce updates the hand before the optional rest entry',()=>{
 const bounce={op:'bounceOwnOtherUnderEnergy',optional:true,energy:1,trait,
  then:[{op:'deployOwnHandRest',type:'character',color:'red',energy:1,ap:null,max:1,trait}]};
 const cards=[
  face({id:'SRC',name:'來源',color:'red',traits:[trait],effects:{onPlay:[bounce]}}),
  face({id:'ALLY',name:'同伴',color:'red',energy:1,traits:[trait]}),
  face({id:'HELD',name:'原手牌',color:'red',energy:1,traits:[trait]}),
  face({id:'TALL',name:'太貴',color:'red',energy:2,traits:[trait]})
 ];
 const declined=open(cards,{seed:651});
 seat(declined.s,0,'ALLY','front',1);
 let s=play(declined.pack,declined.s,'SRC');
 assert.equal(s.pending.kind,'effect-bounce-own');
 const ally=find(s,0,'ALLY');
 s=act(declined.pack,s,a=>a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(find(s,0,'ALLY').uid,ally.uid);
 const accepted=open(cards,{seed:652});
 const target=seat(accepted.s,0,'ALLY','energy',0);
 const held=hold(accepted.s,'HELD');
 hold(accepted.s,'TALL');
 s=play(accepted.pack,accepted.s,'SRC');
 assert.ok(s.pending.choices.includes(target.uid));
 s=act(accepted.pack,s,a=>a.uid===target.uid);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 assert.ok(s.pending.choices.includes(target.uid));
 assert.ok(s.pending.choices.includes(held.uid));
 assert.equal(s.pending.choices.includes(hold(s,'TALL').uid),false);
 s=act(accepted.pack,s,a=>a.type==='chooseHandRest'&&a.uid===target.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c&&c.uid===target.uid).ready,false);
 assert.equal(s.players[0].hand.some(c=>c.uid===target.uid),false);
});

test('the new shared cards stay out of the IMC battle pack',()=>{
 const ids=['IMC-1-011','IMC-1-012','IMC-1-039','IMC-1-051','IMC-1-061','IMC-1-075','IMC-1-107'];
 const programs={...IMC_PROGRAMS_001_050,...IMC_PROGRAMS_051_100,...IMC_PROGRAMS_STARTER};
 for(const id of ids)assert.notEqual(programs[id]?.ready,true);
 const pack=createImcV2Pack();
 assert.equal(Object.keys(pack.cards).length,105);
 assert.equal(getTitle('imc').playable,false);
 assert.equal(loadImcOfficialStarter().counts,null);
});
