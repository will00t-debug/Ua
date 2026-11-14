// MHA-2-046, 050, 051, 053, 054, 056, 057. Official effectJa and the stored FAQ.
// Passing these scenes is not an FAQ acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA2_CARDS_037_073} from '../dist/mha/cards-2-037-073.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {MHA2_PROGRAMS_037_073} from '../dist/universal-v2/mha/programs-2-037-073.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp, zoneRequiredEnergy, universalCardEnergy,
 universalAttackDamage, universalImpact
} from '../dist/universal-v2/engine.mjs';

const byId=new Map(MHA2_CARDS_037_073.map(card=>[card.id,card]));
const packReady=createMha2Pack();

function fixture(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'green',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1000, gen:extra.gen??1, traits:extra.traits||[],
  trigger:extra.trigger??null, implementation:extra.implementation||'vanilla',
  effects:extra.effects||{}, ...extra
 };
}
function readyCard(id){
 const row=byId.get(id);
 const program=MHA2_PROGRAMS_037_073[id];
 const card={
  id, name:row.nameJa, color:row.color, type:row.type, energy:row.energy,
  ap:row.ap, bp:row.bp, gen:row.gen, traits:[...(row.traits||[])],
  trigger:row.trigger, implementation:program.implementation,
  effects:program.effects||{}
 };
 for(const key of Object.keys(program)){
  if(key==='ready'||key==='implementation'||key==='effects'||key==='notes')continue;
  card[key]=program[key];
 }
 return card;
}
function shell(){
 const bodies=[
  readyCard('MHA-2-046'), readyCard('MHA-2-050'), readyCard('MHA-2-051'),
  readyCard('MHA-2-053'), readyCard('MHA-2-054'),
  readyCard('MHA-2-056'), readyCard('MHA-2-057'),
  fixture({id:'PURPLE', name:'紫燃料', color:'purple', gen:6}),
  fixture({id:'GREEN', name:'綠燃料', gen:2}),
  fixture({id:'FUEL', name:'綠燃料六', gen:6}),
  fixture({id:'NAGANT', name:'レディ・ナガン', color:'purple', bp:1500}),
  fixture({id:'MIRIO', name:'通形 ミリオ', bp:2000}),
  fixture({id:'PLAIN', name:'路人', bp:3000}),
  fixture({id:'LOW', name:'低', bp:3000}),
  fixture({id:'MID', name:'中', bp:3500}),
  fixture({id:'HIGH', name:'高', bp:5000}),
  fixture({id:'COST4', name:'能源四', energy:4, bp:2000}),
  fixture({id:'COST3', name:'能源三', energy:3, bp:2000}),
  fixture({id:'BRING', name:'帶出場', energy:0, bp:1000, implementation:'dsl',
   effects:{onPlay:[{op:'deployOwnHandRest', type:'character', color:'green',
    energy:6, ap:1, max:1}]}}),
  fixture({id:'OCHAKO', name:'麗日 お茶子', bp:1500}),
  fixture({id:'ENTER', name:'綠三', energy:3, ap:1, bp:2000, implementation:'dsl',
   effects:{onPlay:[{op:'buffSelf', bp:1000}]}}),
  fixture({id:'BIG', name:'綠四', energy:4, ap:1, bp:2000}),
  fixture({id:'REDAP', name:'紅一', color:'red', energy:1, ap:1, bp:2000}),
  fixture({id:'YES', name:'對手一', color:'purple', energy:1, ap:1, bp:2500, implementation:'dsl',
   effects:{onPlay:[{op:'buffSelf', bp:1000}]}}),
  fixture({id:'TWO', name:'兩費', ap:2, bp:2000}),
  fixture({id:'BAND', name:'四千', bp:4000}),
  fixture({id:'OVER', name:'五千五', bp:5500})
 ];
 for(let n=1;n<=40;n++)
  bodies.push(fixture({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n}));
 return createUniversalPack({id:'mha2-b46', version:'mha2-b46', cards:bodies});
}
function open(seed){
 const pack=shell();
 const deck={};
 for(const id of Object.keys(pack.cards))deck[id]=1;
 deck['MHA-2-050']=2;
 deck['MHA-2-053']=2;
 let total=Object.values(deck).reduce((sum,n)=>sum+n,0);
 for(const id of Object.keys(deck)){
  if(total<=50)break;
  if(!id.startsWith('FILL-'))continue;
  deck[id]-=1; total-=1;
  if(deck[id]===0)delete deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 for(let i=0;i<8&&(s.phase!=='main'||s.active!==0);i++)
  s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=pl[zone];
  const index=pile.findIndex(c=>c?.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const slot=pl[line].findIndex(c=>c?.cardId===id);
  if(slot>=0){const body=pl[line][slot];pl[line][slot]=null;return body;}
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 const occupant=s.players[p][line][slot];
 if(occupant){
  s.players[p][line][slot]=null;
  s.players[p].removed.push(occupant);
 }
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,pred){
 const choice=legal(pack,s).find(pred);
 if(!choice)throw Error('missing action '+(s.pending?.kind||s.phase)+' '+
  JSON.stringify(legal(pack,s).slice(0,8)));
 return dispatchUniversalAction(pack,s,choice);
}
function readyAp(s){
 s.players[s.active].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=true;});
}
function reach(pack,s,phase,player=0){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='block')s=act(pack,s,a=>a.uid===null);
  else if(s.pending?.kind==='end-hand-limit')
   s=act(pack,s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('pending '+s.pending.kind);
  else s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>24)throw Error('stuck '+player+' '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const hit=s.players[p][line].find(c=>c?.uid===uid);
  if(hit)return hit;
 }
 return null;
}
function skipLive(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===uid);
}
function vanillaLife(s){
 for(const pl of s.players){
  const n=pl.life.length;
  pl.deck.push(...pl.life.splice(0));
  for(let i=0;i<n;i++){
   const at=pl.deck.findIndex(c=>c.cardId.startsWith('FILL-'));
   pl.life.push(pl.deck.splice(at,1)[0]);
  }
 }
}

test('the seven finished cards are in the pack',()=>{
 for(const id of ['MHA-2-046','MHA-2-050','MHA-2-051','MHA-2-053','MHA-2-054','MHA-2-056','MHA-2-057'])
  assert.equal(packReady.cards[id].id,id);
 const nagant=packReady.cards['MHA-2-046'];
 assert.equal(nagant.raidName,'レディ・ナガン');
 assert.equal(nagant.printedMains.length,3);
 const step=packReady.cards['MHA-2-051'];
 assert.equal(step.step,true);
 assert.equal(step.frontEnergyWhen.checks[0].min,2);
 assert.equal(step.mainAbility.op,'restBuffOtherReturnHand');
 const might=packReady.cards['MHA-2-054'];
 assert.equal(might.energyLineForbidden,true);
 assert.equal(might.oppFrontHandEnergy.amount,4);
 assert.equal(might.conditionalImpactBpAtLeast,6000);
 const riki=packReady.cards['MHA-2-056'];
 assert.equal(riki.passiveBonuses[0].attackDamage,2);
 assert.equal(riki.mainAbility.op,'repeatHandOutsideBuff');
 const mirio=packReady.cards['MHA-2-057'];
 assert.equal(mirio.raidName,'通形 ミリオ');
 assert.deepEqual(mirio.blockBpRestriction,{relation:'atMost',bp:3000,condition:null});
 assert.equal(mirio.effects.onRetire[0].op,'returnOwnRaidBase');
 const aoyama=packReady.cards['MHA-2-050'];
 assert.equal(aoyama.effects.onPlay[0].op,'mayHandRestThenOppFrontRest');
 assert.equal(aoyama.effects.onPlay[0].skipOnPlay,true);
 const ochako=packReady.cards['MHA-2-053'];
 assert.equal(ochako.raidName,'麗日 お茶子');
 assert.equal(ochako.effects.onAttack[0].cardLock,true);
});

test('046 raids Lady Nagant active onto the front, then uses each main',()=>{
 const {pack,s}=open(4601);
 seat(s,0,'PURPLE','energy',0);
 const base=seat(s,0,'NAGANT','front',0);
 const foe=seat(s,1,'PLAIN','front',0);
 const card=hold(s,'MHA-2-046');
 const pay=hold(s,'GREEN');
 hold(s,'PLAIN');
 readyAp(s);
 let now=act(pack,s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===base.uid);
 assert.equal(legal(pack,s).some(a=>a.type==='raid'&&a.baseUid===foe.uid),false);
 const top=now.players[0].front.find(c=>c?.cardId==='MHA-2-046');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(top.sniperGranted.turn,now.turn);
 assert.equal(universalBp(pack,now,top),4000);
 now=act(pack,now,a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='restBp');
 const rested=live(now,0,top.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalBp(pack,now,rested),5000);
 assert.equal(universalImpact(pack,now,rested),1);
 assert.equal(legal(pack,now).some(a=>a.mode==='restBp'),false);
 assert.equal(legal(pack,now).some(a=>a.mode==='restDraw'),false);
 const hand=now.players[0].hand.length;
 now=act(pack,now,a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='payActive');
 if(now.pending?.kind==='effect-mode-discard')
  now=act(pack,now,a=>a.type==='chooseModeDiscard'&&a.uid===pay.uid);
 assert.equal(live(now,0,top.uid).ready,true);
 assert.ok(now.players[0].hand.length<hand);
 now=act(pack,now,a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='restDraw');
 assert.equal(live(now,0,top.uid).attackDrawGranted.turn,now.turn);
 assert.equal(legal(pack,now).some(a=>a.mode==='restDraw'),false);
 now=act(pack,now,a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='payActive');
 if(now.pending?.kind==='effect-mode-discard')
  now=act(pack,now,a=>a.type==='chooseModeDiscard');
 assert.equal(live(now,0,top.uid).ready,true);
 now=reach(pack,now,'attack');
 const aimed=legal(pack,now).find(a=>a.type==='attack'&&a.uid===top.uid&&a.targetUid===foe.uid);
 assert.ok(aimed);
 const before=now.players[0].hand.length;
 now=dispatchUniversalAction(pack,now,aimed);
 assert.equal(now.pending?.kind==='block',false);
 assert.equal(now.players[0].hand.length,before+1);
 assert.equal(assertUniversalMatch(pack,now),true);
});

test('051 generates front energy only beside another front character and can pay twice',()=>{
 const {pack,s}=open(5101);
 const self=seat(s,0,'MHA-2-051','front',0);
 assert.equal(universalCardEnergy(pack,s,0,self),0);
 const other=seat(s,0,'PLAIN','energy',0);
 assert.equal(universalCardEnergy(pack,s,0,self),0);
 const ally=seat(s,0,'COST3','front',1);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 assert.equal(universalCardEnergy(pack,s,0,other),1);
 s.phase='move';
 assert.equal(legal(pack,s).some(a=>a.type==='step'&&a.uid===self.uid),true);
 assert.equal(legal(pack,s).some(a=>a.type==='step'&&a.uid===other.uid),false);
 s.phase='main';
 const alone=live(s,0,self.uid);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=null;
 s.players[0].removed.push(ally,other);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
 s.players[0].removed.splice(s.players[0].removed.indexOf(ally),1);
 s.players[0].removed.splice(s.players[0].removed.indexOf(other),1);
 s.players[0].front[1]=ally;
 s.players[0].energy[0]=other;
 let now=act(pack,s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restBuffReturn');
 now=act(pack,now,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(pack,now,live(now,0,ally.uid)),3000);
 assert.equal(now.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(live(now,0,self.uid),null);
 seat(now,0,'GREEN','energy',1);
 readyAp(now);
 const replay=now.players[0].hand.find(c=>c.uid===self.uid);
 now=act(pack,now,a=>a.type==='play'&&a.uid===replay.uid&&a.line==='front');
 const back=now.players[0].front.find(c=>c?.uid===self.uid);
 back.ready=true;
 assert.ok(legal(pack,now).some(a=>a.type==='activate'&&a.uid===back.uid&&a.mode==='restBuffReturn'));
 assert.equal(assertUniversalMatch(pack,now),true);
});

test('054 cuts hand energy only, refuses the energy line, and buffs an effect entry',()=>{
 const {pack,s}=open(5401);
 const card=hold(s,'MHA-2-054');
 const printed=pack.cards['MHA-2-054'];
 seat(s,1,'PLAIN','front',0);
 seat(s,1,'LOW','front',1);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),6);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),6);
 seat(s,1,'MID','front',2);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),6);
 seat(s,0,'GREEN','energy',0);
 s.players[0].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=false;});
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 readyAp(s);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy'),false);
 let now=act(pack,s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 const paid=now.players[0].front.find(c=>c.cardId==='MHA-2-054');
 assert.equal(universalBp(pack,now,paid),4000);
 assert.equal(universalImpact(pack,now,paid),0);
 paid.buffs??=[];
 paid.buffs.push({bp:2000,untilTurn:now.turn});
 assert.equal(universalImpact(pack,now,paid),1);
 paid.buffs[0].bp=1500;
 assert.equal(universalBp(pack,now,paid),5500);
 assert.equal(universalImpact(pack,now,paid),0);
 now.phase='move';
 assert.equal(legal(pack,now).some(a=>a.type==='step'&&a.uid===paid.uid),false);

 const brought=open(5402);
 const host=hold(brought.s,'BRING');
 const guest=hold(brought.s,'MHA-2-054');
 readyAp(brought.s);
 let entered=act(brought.pack,brought.s,a=>a.type==='play'&&a.uid===host.uid&&a.line==='energy');
 assert.equal(legal(brought.pack,entered).some(a=>a.type==='chooseHandRest'&&a.uid===guest.uid&&a.line==='energy'),false);
 entered=act(brought.pack,entered,a=>a.type==='chooseHandRest'&&a.uid===guest.uid&&a.line==='front');
 const body=entered.players[0].front.find(c=>c.cardId==='MHA-2-054');
 assert.equal(body.ready,false);
 assert.equal(universalBp(brought.pack,entered,body),5000);
 assert.equal(assertUniversalMatch(brought.pack,entered),true);
});

test('056 pays hand more than once and skips the next active only at BP 5000',()=>{
 const {pack,s}=open(5601);
 const self=seat(s,0,'MHA-2-056','front',0);
 assert.equal(universalAttackDamage(pack,s,self),1);
 const first=hold(s,'GREEN');
 const second=hold(s,'PLAIN');
 let now=act(pack,s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='repeatHandBuff');
 now=act(pack,now,a=>a.type==='chooseMainDiscard'&&a.uid===first.uid);
 assert.equal(universalBp(pack,now,live(now,0,self.uid)),4000);
 assert.equal(universalAttackDamage(pack,now,live(now,0,self.uid)),1);
 now=act(pack,now,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='repeatHandBuff');
 now=act(pack,now,a=>a.type==='chooseMainDiscard'&&a.uid===second.uid);
 const pumped=live(now,0,self.uid);
 assert.equal(universalBp(pack,now,pumped),5000);
 assert.equal(universalAttackDamage(pack,now,pumped),2);
 assert.ok(legal(pack,now).some(a=>a.mode==='repeatHandBuff'&&a.uid===self.uid));
 const leftover=now.players[0].hand.splice(0);
 now.players[0].outside.push(...leftover);
 assert.equal(legal(pack,now).some(a=>a.mode==='repeatHandBuff'),false);
 const blocker=seat(now,1,'MID','front',0);
 blocker.ready=true;
 now=reach(pack,now,'attack');
 const before=now.continuousStates.filter(e=>e.kind==='skipNextActive').length;
 now=act(pack,now,a=>a.type==='attack'&&a.uid===self.uid&&a.targetUid===undefined);
 now=act(pack,now,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(skipLive(now,self.uid),true);
 assert.ok(now.continuousStates.filter(e=>e.kind==='skipNextActive').length>before);
 assert.equal(live(now,0,self.uid).ready,false);
 now=dispatchUniversalAction(pack,now,{type:'next'});
 assert.equal(live(now,0,self.uid).ready,false);
 assert.equal(skipLive(now,self.uid),false);
 assert.equal(assertUniversalMatch(pack,now),true);

 const quiet=open(5602);
 const low=seat(quiet.s,0,'MHA-2-056','front',0);
 let missed=reach(quiet.pack,quiet.s,'attack');
 missed=act(quiet.pack,missed,a=>a.type==='attack'&&a.uid===low.uid&&a.targetUid===undefined);
 if(missed.pending?.kind==='block')missed=act(quiet.pack,missed,a=>a.uid===null);
 assert.equal(skipLive(missed,low.uid),false);
 assert.equal(universalAttackDamage(quiet.pack,missed,live(missed,0,low.uid)),1);
});

test('057 is not blocked at BP 3000, chooses one front grant, and may return its raid base',()=>{
 const {pack,s}=open(5701);
 const self=seat(s,0,'MHA-2-057','front',0);
 const cheap=seat(s,0,'COST3','front',1);
 const rich=seat(s,0,'COST4','energy',0);
 seat(s,1,'LOW','front',0);
 const mid=seat(s,1,'MID','front',1);
 const parked=s.players[0].front[0];
 s.players[0].front[0]=null;
 s.players[0].energy[2]=parked;
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 s.players[0].energy[2]=null;
 s.players[0].front[0]=parked;
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===self.uid&&a.targetUid===cheap.uid),false);
 assert.equal(legal(pack,s).some(a=>a.mode==='frontEnergyBp'&&a.targetUid===rich.uid),true);
 let now=act(pack,s,a=>a.mode==='frontEnergyImpact'&&a.uid===self.uid&&a.targetUid===rich.uid);
 assert.equal(universalImpact(pack,now,live(now,0,rich.uid)),1);
 assert.equal(universalBp(pack,now,live(now,0,rich.uid)),2000);
 assert.equal(legal(pack,now).some(a=>a.uid===self.uid&&a.type==='activate'),false);
 now=reach(pack,now,'attack');
 now=act(pack,now,a=>a.type==='attack'&&a.uid===self.uid&&a.targetUid===undefined);
 assert.equal(now.pending.kind,'block');
 const blocks=legal(pack,now).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===null),true);
 assert.equal(blocks.some(a=>a.uid===mid.uid),true);
 assert.equal(blocks.some(a=>a.uid===now.players[1].front.find(c=>c?.cardId==='LOW')?.uid),false);

 const raid=open(5702);
 const top=seat(raid.s,0,'MHA-2-057','front',0);
 const base=pull(raid.s,0,'MIRIO');
 base.ready=false; base.faceDown=false; base.stack=[]; base.under=[];
 top.stack=[base]; top.raidBaseUid=base.uid;
 const hitter=seat(raid.s,1,'HIGH','front',0);
 let lost=reach(raid.pack,raid.s,'attack',1);
 lost=act(raid.pack,lost,a=>a.type==='attack'&&a.uid===hitter.uid);
 lost=act(raid.pack,lost,a=>a.type==='chooseBlock'&&a.uid===top.uid);
 assert.equal(lost.pending.kind,'effect-return-raid-base');
 assert.equal(legal(raid.pack,lost).some(a=>a.type==='chooseReturnRaidBase'&&a.uid===null),true);
 lost=act(raid.pack,lost,a=>a.type==='chooseReturnRaidBase'&&a.uid===base.uid);
 assert.equal(lost.players[0].hand.some(c=>c.uid===base.uid),true);
 assert.equal(lost.players[0].front.some(c=>c?.uid===top.uid),false);
 assert.equal(assertUniversalMatch(raid.pack,lost),true);
});

test('050 rests a cheap green character only while the opponent front is open, and the opponent may decline',()=>{
 const full=open(5001);
 for(const [slot,id] of [[0,'PLAIN'],[1,'LOW'],[2,'MID'],[3,'HIGH']])
  seat(full.s,1,id,'front',slot);
 seat(full.s,0,'GREEN','energy',0);
 const blocked=hold(full.s,'MHA-2-050');
 readyAp(full.s);
 let shut=act(full.pack,full.s,a=>a.type==='play'&&a.uid===blocked.uid&&a.line==='front');
 assert.equal(shut.pending,null);
 assert.equal(live(shut,0,blocked.uid).ready,false);

 const {pack,s}=open(5002);
 seat(s,0,'GREEN','energy',0);
 const first=hold(s,'MHA-2-050');
 const pl=s.players[0];
 let second=null;
 for(const zone of ['deck','hand','life','outside','removed']){
  const index=pl[zone].findIndex(c=>c?.cardId==='MHA-2-050'&&c.uid!==first.uid);
  if(index>=0){second=pl[zone].splice(index,1)[0];break;}
 }
 if(!second)throw Error('needed a second 050');
 pl.hand.push(second);
 const enter=hold(s,'ENTER');
 const big=hold(s,'BIG');
 const red=hold(s,'REDAP');
 const yes=hold(s,'YES',1);
 const two=hold(s,'TWO',1);
 readyAp(s);
 let now=act(pack,s,a=>a.type==='play'&&a.uid===first.uid&&a.line==='front');
 assert.equal(now.pending.kind,'effect-may-hand-rest');
 const own=legal(pack,now).filter(a=>a.type==='chooseMayHandRest');
 assert.equal(own.some(a=>a.uid===null),true);
 assert.equal(own.some(a=>a.uid===enter.uid),true);
 assert.equal(own.some(a=>a.uid===big.uid),false);
 assert.equal(own.some(a=>a.uid===red.uid),false);
 now=act(pack,now,a=>a.uid===null);
 assert.equal(now.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===enter.uid)||now.players[0].hand.some(c=>c.uid===enter.uid),true);

 readyAp(now);
 now=act(pack,now,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front');
 now=act(pack,now,a=>a.type==='chooseMayHandRest'&&a.uid===enter.uid&&a.line==='energy');
 const entered=live(now,0,enter.uid);
 assert.equal(entered.ready,false);
 assert.equal(universalBp(pack,now,entered),2000);
 assert.equal(now.pending.kind,'effect-opp-may-front-rest');
 assert.equal(now.pending.player,1);
 const opp=legal(pack,now).filter(a=>a.type==='chooseOppFrontRest');
 assert.equal(opp.some(a=>a.uid===null),true);
 assert.equal(opp.some(a=>a.uid===yes.uid&&a.line==='front'),true);
 assert.equal(opp.some(a=>a.uid===two.uid),false);
 now=act(pack,now,a=>a.uid===yes.uid&&a.line==='front');
 const guest=live(now,1,yes.uid);
 assert.equal(guest.ready,false);
 assert.equal(universalBp(pack,now,guest),2500);
 assert.equal(assertUniversalMatch(pack,now),true);
});

test('053 raids Ochaco, locks a choice on that card, and bans block only this turn',()=>{
 const {pack,s}=open(5301);
 seat(s,0,'FUEL','energy',0);
 const base=seat(s,0,'OCHAKO','front',0);
 const card=hold(s,'MHA-2-053');
 readyAp(s);
 let now=act(pack,s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===base.uid);
 const top=now.players[0].front.find(c=>c?.cardId==='MHA-2-053');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 const other=seat(now,0,'MHA-2-053','front',1);
 const low=seat(now,1,'MID','front',0);
 low.buffs=[{bp:1000,untilTurn:now.turn}];
 low.ready=true;
 const edge=seat(now,1,'BAND','front',1);
 edge.ready=true;
 const over=seat(now,1,'OVER','front',2);
 over.ready=true;
 const out=seat(now,1,'LOW','front',3);
 out.ready=true;
 vanillaLife(now);
 now=reach(pack,now,'attack');
 now=act(pack,now,a=>a.type==='attack'&&a.uid===top.uid&&a.targetUid===undefined);
 assert.equal(now.pending.kind,'effect-choice-mode');
 assert.deepEqual(legal(pack,now).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode).sort(),['block','bp']);
 now=act(pack,now,a=>a.type==='chooseEffectMode'&&a.mode==='block');
 assert.equal(now.pending.kind,'effect-this-turn-block');
 const bans=legal(pack,now).filter(a=>a.type==='chooseThisTurnBlock');
 assert.equal(bans.some(a=>a.uid===null),true);
 assert.equal(bans.some(a=>a.uid===low.uid),true);
 assert.equal(bans.some(a=>a.uid===edge.uid),true);
 assert.equal(bans.some(a=>a.uid===over.uid),false);
 assert.equal(bans.some(a=>a.uid===out.uid),false);
 now=act(pack,now,a=>a.type==='chooseThisTurnBlock'&&a.uid===low.uid);
 assert.equal(now.pending.kind,'block');
 assert.equal(legal(pack,now).some(a=>a.uid===low.uid),false);
 assert.equal(legal(pack,now).some(a=>a.uid===edge.uid),true);
 now=act(pack,now,a=>a.type==='chooseBlock'&&a.uid===null);
 live(now,0,top.uid).ready=true;
 now=act(pack,now,a=>a.type==='attack'&&a.uid===top.uid&&a.targetUid===undefined);
 assert.deepEqual(legal(pack,now).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode),['bp']);
 now=act(pack,now,a=>a.type==='chooseEffectMode'&&a.mode==='bp');
 assert.equal(universalBp(pack,now,live(now,0,top.uid)),4000);
 if(now.pending?.kind==='block')now=act(pack,now,a=>a.type==='chooseBlock'&&a.uid===null);
 now=act(pack,now,a=>a.type==='attack'&&a.uid===other.uid&&a.targetUid===undefined);
 assert.deepEqual(legal(pack,now).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode).sort(),['block','bp']);
 now=act(pack,now,a=>a.type==='chooseEffectMode'&&a.mode==='bp');
 assert.equal(universalBp(pack,now,live(now,0,other.uid)),4000);
 if(now.pending?.kind==='block')now=act(pack,now,a=>a.type==='chooseBlock'&&a.uid===null);
 now=dispatchUniversalAction(pack,now,{type:'next'});
 assert.equal(now.continuousStates.some(e=>e.kind==='cannotBlock'&&!e.consumed&&e.targetUid===low.uid),false);
 assert.equal(assertUniversalMatch(pack,now),true);
});
