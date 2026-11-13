// Round 5 shared rules. Synthetic cards exercise the new combinations.
// Unfinished IMC cards stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage} from '../dist/universal-v2/engine.mjs';

const union={op:'chooseFrontOrOwnTrait',bp:500,optional:false,trait:'LiPPS',excludeName:'速水 奏'};
const raidWhen={kind:'selfOwnEffectRaid',turn:'any'};
const raidFace={kind:'ownRaidColorTrait',turn:'any',zone:'field',color:'yellow',
 trait:'ポジティブパッション',raidKeyword:true};
const namedRaid={op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
 names:['本田 未央','日野 茜']};

function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length||rest.mainAbility||rest.nameActive?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed=5){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe',version:'imc-r5-'+seed,cards:bodies});
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
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++){
  const next=legalUniversalActions(pack,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(pack,s,next);
 }
 assert.equal(s.phase,'main');
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
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
function seat(s,p,id,line,slot,ready=false){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function fuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function play(pack,s,id,line='front',p=0){
 const card=hold(s,id,p);
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [dispatchUniversalAction(pack,s,action),card];
}
function live(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const card=p[line].find(c=>c?.uid===uid);
  if(card)return card;
 }
 return null;
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
 function pass(pack,s){
 const start=s.active;
 for(let i=0;i<16;i++){
  if(s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=act(pack,s,a=>a.type==='chooseHandLimit'&&a.uid===uid);
   continue;
  }
  assert.equal(s.pending,null,s.pending?.kind);
  s=act(pack,s,a=>a.type==='next');
  if(s.active!==start&&s.phase==='start')return s;
 }
 throw Error('turn did not pass');
}
function clearBlock(pack,s){
 if(s.pending?.kind==='block')return dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null});
 return s;
}

test('a rested activate pays before the union choice and does not stick',()=>{
 const cards=[
  face({id:'GEN',name:'能源',color:'blue',gen:1}),
  face({id:'SRC',name:'速水 奏',traits:['LiPPS'],mainAbility:{
   op:'restSelfThen',frontOnly:false,then:[union]}}),
  face({id:'ALLY',name:'同伴',traits:['LiPPS']}),
  face({id:'NAMED',name:'速水 奏',traits:['LiPPS']}),
  face({id:'PLAIN',name:'無特徵'}),
  face({id:'FOE',name:'前線',bp:3000}),
  face({id:'BACK',name:'能量區',bp:2500})
 ];
 const front=open(cards,51);
 fuel(front.s);
 const ally=seat(front.s,0,'ALLY','energy',0,true);
 const named=seat(front.s,0,'NAMED','front',1,true);
 const plain=seat(front.s,0,'PLAIN','front',2,true);
 const foe=seat(front.s,1,'FOE','front',0,true);
 const back=seat(front.s,1,'BACK','energy',1,true);
 const src=seat(front.s,0,'SRC','front',0,true);
 let s=act(front.pack,front.s,a=>a.type==='activate'&&a.uid===src.uid&&a.mode==='selfRestThen');
 assert.equal(live(s,src.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.optional,false);
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.ok(s.pending.choices.includes(foe.uid));
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.equal(s.pending.choices.includes(src.uid),false);
 assert.equal(legalUniversalActions(front.pack,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(front.pack,s,{type:'chooseAnyBuff',uid:null}),
  /not currently legal|Mandatory buff/);
 assert.throws(()=>dispatchUniversalAction(front.pack,s,{type:'chooseAnyBuff',uid:back.uid}),
  /not currently legal/);
 s=act(front.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===foe.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(front.pack,s,live(s,foe.uid)),3500);
 assert.equal(universalBp(front.pack,s,live(s,ally.uid)),2000);

 const energy=open(cards,52);
 fuel(energy.s);
 const energyAlly=seat(energy.s,0,'ALLY','front',0,true);
 const energyFoe=seat(energy.s,1,'FOE','front',0,true);
 const energySrc=seat(energy.s,0,'SRC','energy',0,true);
 s=act(energy.pack,energy.s,a=>a.type==='activate'&&a.uid===energySrc.uid);
 assert.equal(live(s,energySrc.uid).ready,false);
 assert.ok(s.pending.choices.includes(energyAlly.uid));
 assert.ok(s.pending.choices.includes(energyFoe.uid));
 s=act(energy.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===energyAlly.uid);
 assert.equal(universalBp(energy.pack,s,live(s,energyAlly.uid)),2500);

 const empty=open(cards,53);
 fuel(empty.s);
 const only=seat(empty.s,0,'NAMED','front',1,true);
 const lonely=seat(empty.s,0,'SRC','front',0,true);
 assert.equal(legalUniversalActions(empty.pack,empty.s).some(a=>a.type==='activate'&&a.uid===lonely.uid),false);
 assert.throws(()=>dispatchUniversalAction(empty.pack,empty.s,{
  type:'activate',uid:lonely.uid,mode:'selfRestThen'}),/not currently legal|REST main action/);
 assert.equal(live(empty.s,lonely.uid).ready,true);
 assert.equal(empty.s.pending,null);
 assert.equal(live(empty.s,only.uid).ready,true);

 const onceCards=[face({id:'GEN',name:'能源',color:'blue',gen:1}),face({
  id:'ONCE',name:'一次',mainAbility:{op:'restSelfThen',frontOnly:true,oncePerTurn:true,then:[union]}
 })];
 const once=open([...onceCards,face({id:'FOE',name:'前線'})],54);
 fuel(once.s);
 const onceFoe=seat(once.s,1,'FOE','front',0,true);
 const onceSrc=seat(once.s,0,'ONCE','front',0,true);
 s=act(once.pack,once.s,a=>a.type==='activate'&&a.uid===onceSrc.uid);
 s=act(once.pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===onceFoe.uid);
 assert.equal(legalUniversalActions(once.pack,s).some(a=>a.type==='activate'&&a.uid===onceSrc.uid),false);
 let again=pass(once.pack,pass(once.pack,s));
 assert.equal(again.active,0);
 while(again.phase!=='main')again=act(once.pack,again,a=>a.type==='next');
 const stood=live(again,onceSrc.uid);
 assert.equal(stood.ready,true);
 assert.ok(legalUniversalActions(once.pack,again).some(a=>a.type==='activate'&&a.uid===onceSrc.uid));
 assert.equal(assertUniversalMatch(once.pack,again),true);
});

test('front once and name once stay separate, and 110 is unchanged',()=>{
 const when={kind:'oppCharacterBpAtLeast',turn:'any',zone:'field',minBp:4500};
 const cards=[
  face({id:'A',name:'速水 奏',bp:4000,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[union]},
   nameActive:{op:'nameOnceActive',scope:'name',when}}),
  face({id:'B',name:'速水 奏',bp:4000,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[union]},
   nameActive:{op:'nameOnceActive',scope:'name',when}}),
  face({id:'OTHER',name:'別的名字',nameActive:{op:'nameOnceActive',scope:'name',when}}),
  face({id:'ALLY',name:'同伴',traits:['LiPPS']}),
  face({id:'LOW',name:'不足',bp:4000}),
  face({id:'HIGH',name:'達標',bp:4500}),
  face({id:'ENERGY',name:'能量達標',bp:4500})
 ];
 const low=open(cards,55);
 fuel(low.s);
 const lowA=seat(low.s,0,'A','front',0,false);
 seat(low.s,1,'LOW','front',0,true);
 assert.equal(legalUniversalActions(low.pack,low.s).some(a=>
  a.type==='activate'&&a.uid===lowA.uid&&a.mode==='nameOnceActive'),false);
 assert.ok(legalUniversalActions(low.pack,low.s).some(a=>
  a.type==='activate'&&a.uid===lowA.uid&&a.mode==='frontOnce'));

 const exact=open(cards,56);
 fuel(exact.s);
 const a=seat(exact.s,0,'A','front',0,false);
 const b=seat(exact.s,0,'B','front',3,false);
 const other=seat(exact.s,0,'OTHER','front',1,false);
 const ally=seat(exact.s,0,'ALLY','front',2,true);
 const high=seat(exact.s,1,'HIGH','energy',0,true);
 assert.equal(universalBp(exact.pack,exact.s,high),4500);
 let s=act(exact.pack,exact.s,action=>action.type==='activate'&&action.uid===a.uid&&action.mode==='nameOnceActive');
 assert.equal(live(s,a.uid).ready,true);
 assert.equal(legalUniversalActions(exact.pack,s).some(x=>
  x.uid===b.uid&&x.mode==='nameOnceActive'),false);
 assert.equal(legalUniversalActions(exact.pack,s).some(x=>
  x.uid===other.uid&&x.mode==='nameOnceActive'),true);
 s=act(exact.pack,s,x=>x.type==='activate'&&x.uid===a.uid&&x.mode==='frontOnce');
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(live(s,a.uid).ready,true);
 s=act(exact.pack,s,x=>x.type==='chooseAnyBuff'&&x.uid===ally.uid);
 assert.equal(legalUniversalActions(exact.pack,s).some(x=>
  x.uid===a.uid&&x.mode==='frontOnce'),false);
 assert.ok(legalUniversalActions(exact.pack,s).some(x=>
  x.uid===b.uid&&x.mode==='frontOnce'));
 let next=pass(exact.pack,pass(exact.pack,s));
 while(next.phase!=='main')next=act(exact.pack,next,a=>a.type==='next');
 assert.ok(legalUniversalActions(exact.pack,next).some(x=>
  x.uid===a.uid&&x.mode==='nameOnceActive'));
 assert.ok(legalUniversalActions(exact.pack,next).some(x=>
  x.uid===b.uid&&x.mode==='nameOnceActive'));

 const hidden=open(cards,57);
 fuel(hidden.s);
 const hiddenSrc=seat(hidden.s,0,'A','front',0,false);
 const energyCopy=seat(hidden.s,0,'B','energy',0,false);
 seat(hidden.s,1,'ENERGY','energy',1,true);
 assert.ok(legalUniversalActions(hidden.pack,hidden.s).some(x=>
  x.uid===hiddenSrc.uid&&x.mode==='nameOnceActive'));
 assert.ok(legalUniversalActions(hidden.pack,hidden.s).some(x=>
  x.uid===energyCopy.uid&&x.mode==='nameOnceActive'));

 const none=open(cards,58);
 fuel(none.s);
 const bareSrc=seat(none.s,0,'A','front',0,true);
 assert.equal(legalUniversalActions(none.pack,none.s).some(x=>
  x.uid===bareSrc.uid&&x.mode==='frontOnce'),false);

 const imc=createImcV2Pack();
 assert.equal(Object.keys(imc.cards).length,106);
 assert.equal(imc.cards['IMC-1-110'].mainAbility.minSelfBp,4000);
 assert.equal(imc.cards['IMC-1-110'].mainAbility.then[0].op,'chooseOne');
 assert.equal(imc.cards['IMC-1-020'].effects.onPlay[0].skipWhen.kind,'selfOwnEffectRaid');
 assert.equal(imc.cards['IMC-1-024'].effects.onAttack[1].firstOwnAttack,true);
 assert.equal(imc.cards['IMC-1-052'].mainAbility.op,'restSelfThen');
 assert.equal(imc.cards['IMC-1-054'].nameActive.op,'nameOnceActive');
 assert.equal(imc.cards['IMC-1-111'].effects.onAttack[0].when.kind,'ownRaidColorTrait');
 assert.equal(imc.cards['IMC-1-028'].effects.onPlay[0].op,'choosePrintedOptions');
 assert.equal(imc.cards['IMC-1-107'],undefined);
 assert.equal(getTitle('imc').playable,false);
});

test('only an own-effect raid skips the chosen character once',()=>{
 const star=face({id:'STAR',name:'星',color:'yellow',energy:1,raidName:'星',trigger:'raid',
  effects:{onPlay:[{op:'restOppFrontOne',optional:true,skipWhen:raidWhen}]}});
 const cards=[
  face({id:'GEN',name:'能源',color:'yellow',gen:1}),
  star,
  face({id:'BASE',name:'星',bp:1500}),
  face({id:'WIT',name:'見證',bp:3000}),
  face({id:'OTHER',name:'另一',bp:2500}),
  face({id:'HOOK',name:'使之',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
   color:'yellow',maxEnergy:5,ap:1,max:1,optional:true,names:['星'],requireAffordableEnergy:true}]}})
 ];
 const caused=open(cards,61);
 fuel(caused.s);
 seat(caused.s,0,'GEN','energy',0,false);
 const host=seat(caused.s,0,'BASE','front',0,true);
 const wit=seat(caused.s,1,'WIT','front',0,true);
 const other=seat(caused.s,1,'OTHER','front',1,true);
 hold(caused.s,'STAR');
 let s=caused.s;
 [s]=play(caused.pack,s,'HOOK');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='STAR');
 s=act(caused.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&
  a.uid===fromHand.uid&&a.baseUid===host.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.skipNextActive,true);
 const declined=dispatchUniversalAction(caused.pack,structuredClone(s),{type:'chooseRestBp',uid:null});
 assert.equal(declined.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 s=act(caused.pack,s,a=>a.type==='chooseRestBp'&&a.uid===wit.uid);
 assert.equal(live(s,wit.uid).ready,false);
 assert.equal(live(s,other.uid).ready,true);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===wit.uid));
 const opp=pass(caused.pack,s);
 assert.equal(opp.active,1);
 assert.equal(live(opp,wit.uid).ready,false);
 assert.equal(opp.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed),false);
 const back=pass(caused.pack,opp);
 assert.equal(live(back,wit.uid).ready,true);

 const paid=open(cards,62);
 fuel(paid.s);
 seat(paid.s,0,'GEN','energy',0,false);
 const paidBase=seat(paid.s,0,'BASE','front',0,true);
 const paidWit=seat(paid.s,1,'WIT','front',0,true);
 const paidStar=hold(paid.s,'STAR');
 s=act(paid.pack,paid.s,a=>a.type==='raid'&&a.uid===paidStar.uid&&a.baseUid===paidBase.uid);
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.skipNextActive,false);
 s=act(paid.pack,s,a=>a.type==='chooseRestBp'&&a.uid===paidWit.uid);
 assert.equal(live(s,paidWit.uid).ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'),false);

 const rested=open(cards,63);
 fuel(rested.s);
 seat(rested.s,0,'GEN','energy',0,false);
 const restWit=seat(rested.s,1,'WIT','front',0,true);
 hold(rested.s,'STAR');
 [s]=play(rested.pack,rested.s,'HOOK');
 const resting=s.players[0].hand.find(c=>c.cardId==='STAR');
 s=act(rested.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&
  a.uid===resting.uid&&a.line==='front');
 assert.equal(s.pending.skipNextActive,false);
 s=act(rested.pack,s,a=>a.type==='chooseRestBp'&&a.uid===restWit.uid);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'),false);

 const life=open(cards,64);
 fuel(life.s,1,1);
 seat(life.s,1,'GEN','energy',0,false);
 const home=seat(life.s,1,'BASE','energy',1,false);
 const hitter=seat(life.s,0,'OTHER','front',0,true);
 const witness=seat(life.s,0,'WIT','front',1,true);
 const revealed=pull(life.s,1,'STAR');
 life.s.players[1].life.unshift(revealed);
 s=life.s;
 while(s.phase!=='attack')s=act(life.pack,s,a=>a.type==='next');
 s=clearBlock(life.pack,act(life.pack,s,a=>a.type==='attack'&&a.uid===hitter.uid));
 assert.equal(s.pending.trigger,'raid');
 s=act(life.pack,s,a=>a.mode==='raid'&&a.baseUid===home.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.skipNextActive,true);
 s=act(life.pack,s,a=>a.type==='chooseRestBp'&&a.uid===witness.uid);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===witness.uid));
 assert.equal(assertUniversalMatch(life.pack,s),true);
});

test('damage 2 and a named hand raid follow only the printed cause',()=>{
 const star=face({id:'STAR',name:'星',color:'yellow',energy:1,raidName:'星',trigger:'raid',
  effects:{onPlay:[{op:'ifLiveThen',when:raidWhen,
   then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}]}});
 const cards=[
  face({id:'GEN',name:'能源',color:'yellow',gen:1}),
  star,
  face({id:'BASE',name:'星',bp:1500}),
  face({id:'HOOK',name:'使之',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
   color:'yellow',maxEnergy:5,ap:1,max:1,optional:true,names:['星'],requireAffordableEnergy:true}]}})
 ];
 const caused=open(cards,71);
 fuel(caused.s);
 seat(caused.s,0,'GEN','energy',0,false);
 const host=seat(caused.s,0,'BASE','front',0,true);
 hold(caused.s,'STAR');
 let s=caused.s;
 [s]=play(caused.pack,s,'HOOK');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='STAR');
 s=act(caused.pack,s,a=>a.mode==='raid'&&a.uid===fromHand.uid&&a.baseUid===host.uid&&a.line==='front');
 const raided=s.players[0].front.find(c=>c?.cardId==='STAR');
 assert.equal(universalAttackDamage(caused.pack,s,raided),2);

 const paid=open(cards,72);
 fuel(paid.s);
 seat(paid.s,0,'GEN','energy',0,false);
 const paidBase=seat(paid.s,0,'BASE','front',0,true);
 const paidStar=hold(paid.s,'STAR');
 s=act(paid.pack,paid.s,a=>a.type==='raid'&&a.uid===paidStar.uid&&a.baseUid===paidBase.uid);
 assert.equal(universalAttackDamage(paid.pack,s,s.players[0].front.find(c=>c?.cardId==='STAR')),1);

 const rested=open(cards,73);
 fuel(rested.s);
 seat(rested.s,0,'GEN','energy',0,false);
 hold(rested.s,'STAR');
 [s]=play(rested.pack,rested.s,'HOOK');
 const resting=s.players[0].hand.find(c=>c.cardId==='STAR');
 s=act(rested.pack,s,a=>a.mode==='enter'&&a.uid===resting.uid&&a.line==='energy');
 assert.equal(universalAttackDamage(rested.pack,s,s.players[0].energy.find(c=>c?.cardId==='STAR')),1);
 const bare=open([face({id:'BARE',name:'裸',effects:{
  onPlay:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}})],74);
 fuel(bare.s);
 assert.throws(()=>play(bare.pack,bare.s,'BARE'),/Unproven this-turn attack damage/);

 const raidCards=[
  face({id:'GEN',name:'能源',color:'yellow',gen:1}),
  face({id:'SRC',name:'起動',mainAbility:{op:'restSelfThen',frontOnly:true,oncePerTurn:true,
   then:[namedRaid]}}),
  face({id:'BASE',name:'本田 未央',bp:1500}),
  face({id:'MIO',name:'本田 未央',color:'yellow',energy:1,raidName:'本田 未央'}),
  face({id:'AKANE',name:'日野 茜',color:'yellow',energy:5,raidName:'日野 茜'}),
  face({id:'AIKO',name:'高森 藍子',color:'yellow',energy:1,raidName:'高森 藍子'}),
  face({id:'PLAIN',name:'本田 未央',color:'yellow',energy:1})
 ];
 const raid=open(raidCards,75);
 fuel(raid.s);
 seat(raid.s,0,'GEN','energy',0,false);
 const base=seat(raid.s,0,'BASE','front',1,true);
 const src=seat(raid.s,0,'SRC','front',0,true);
 const mio=hold(raid.s,'MIO');
 const akane=hold(raid.s,'AKANE');
 const aiko=hold(raid.s,'AIKO');
 const plain=hold(raid.s,'PLAIN');
 assert.equal(legalUniversalActions(raid.pack,raid.s).some(a=>
  a.type==='activate'&&a.uid===src.uid),true);
 s=act(raid.pack,raid.s,a=>a.type==='activate'&&a.uid===src.uid);
 assert.equal(live(s,src.uid).ready,false);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(s.pending.raidOnly,true);
 const offered=legalUniversalActions(raid.pack,s).filter(a=>a.type==='chooseHandRestOrRaid');
 assert.equal(offered.some(a=>a.uid===null),true);
 assert.equal(offered.some(a=>a.uid===mio.uid&&a.mode==='raid'&&a.baseUid===base.uid),true);
 assert.equal(offered.some(a=>a.mode==='enter'),false);
 assert.equal(offered.some(a=>a.uid===akane.uid),false);
 assert.equal(offered.some(a=>a.uid===aiko.uid),false);
 assert.equal(offered.some(a=>a.uid===plain.uid),false);
 assert.throws(()=>dispatchUniversalAction(raid.pack,s,{
  type:'chooseHandRestOrRaid',mode:'enter',uid:mio.uid,line:'front',slot:2}),
  /not currently legal|cannot enter/);
 const skipped=dispatchUniversalAction(raid.pack,structuredClone(s),{
  type:'chooseHandRestOrRaid',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,src.uid).ready,false);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===mio.uid),true);
 s=act(raid.pack,s,a=>a.mode==='raid'&&a.uid===mio.uid&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===mio.uid).ready,true);
 assert.equal(legalUniversalActions(raid.pack,s).some(a=>a.uid===src.uid&&a.type==='activate'),false);
 const energySrc=open(raidCards,76);
 fuel(energySrc.s);
 const energyCard=seat(energySrc.s,0,'SRC','energy',0,true);
 assert.equal(legalUniversalActions(energySrc.pack,energySrc.s).some(a=>
  a.uid===energyCard.uid&&a.type==='activate'),false);
});

test('the first own attack can pay, and a later own attack cannot',()=>{
 const pay={op:'optionalPayApThen',ap:1,optional:true,firstOwnAttack:true,then:[namedRaid]};
 const cards=[
  face({id:'GEN',name:'能源',color:'yellow',gen:1}),
  face({id:'BASE',name:'本田 未央',bp:1500}),
  face({id:'MIO',name:'本田 未央',color:'yellow',energy:1,raidName:'本田 未央'}),
  face({id:'AIKO',name:'高森 藍子',color:'yellow',energy:1,raidName:'高森 藍子'}),
  face({id:'A',name:'先攻',effects:{onAttack:[{op:'draw',count:1},pay]}}),
  face({id:'B',name:'後攻',effects:{onAttack:[{op:'draw',count:1},pay]}}),
  face({id:'C',name:'舊規則',effects:{onAttack:[{op:'optionalPayApThen',ap:1,optional:true,
   oncePerAttackTurn:true,then:[namedRaid]}]}})
 ];
 const first=open(cards,81);
 fuel(first.s,1);
 seat(first.s,0,'GEN','energy',0,false);
 const base=seat(first.s,0,'BASE','energy',1,false);
 const attacker=seat(first.s,0,'A','front',0,true);
 const mio=hold(first.s,'MIO');
 hold(first.s,'AIKO');
 const before=first.s.players[0].hand.length;
 let s=first.s;
 while(s.phase!=='attack')s=act(first.pack,s,a=>a.type==='next');
 s=act(first.pack,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(s.attacksThisTurn,1);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const readyBefore=s.players[0].apCards.filter(c=>c.ready).length;
 const skipped=clearBlock(first.pack,dispatchUniversalAction(first.pack,structuredClone(s),{
  type:'chooseOptionalPayAp',mode:'skip'}));
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,readyBefore);
 assert.equal(skipped.pending,null);
 const paid=dispatchUniversalAction(first.pack,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.players[0].apCards.filter(c=>c.ready).length,readyBefore-1);
 assert.equal(paid.pending.raidOnly,true);
 const choices=legalUniversalActions(first.pack,paid).filter(a=>a.type==='chooseHandRestOrRaid'&&a.uid);
 assert.equal(choices.some(a=>a.mode==='enter'),false);
 assert.equal(choices.some(a=>a.uid===mio.uid&&a.mode==='raid'&&a.baseUid===base.uid),true);
 assert.equal(assertUniversalMatch(first.pack,paid),true);

 const later=open(cards,82);
 fuel(later.s,1);
 seat(later.s,0,'GEN','energy',0,false);
 const lead=seat(later.s,0,'FILL-01','front',0,true);
 const second=seat(later.s,0,'B','front',1,true);
 const handBefore=later.s.players[0].hand.length;
 s=later.s;
 while(s.phase!=='attack')s=act(later.pack,s,a=>a.type==='next');
 s=clearBlock(later.pack,act(later.pack,s,a=>a.type==='attack'&&a.uid===lead.uid));
 assert.equal(s.attacksThisTurn,1);
 assert.equal(s.pending,null);
 s=act(later.pack,s,a=>a.type==='attack'&&a.uid===second.uid);
 assert.equal(s.attacksThisTurn,2);
 assert.equal(s.players[0].hand.length,handBefore+1);
 assert.notEqual(s.pending?.kind,'effect-optional-pay-ap');
 s=clearBlock(later.pack,s);
 assert.equal(s.pending,null);

 const old=open(cards,83);
 fuel(old.s,1);
 const oldLead=seat(old.s,0,'FILL-01','front',0,true);
 const oldCard=seat(old.s,0,'C','front',1,true);
 s=old.s;
 while(s.phase!=='attack')s=act(old.pack,s,a=>a.type==='next');
 s=clearBlock(old.pack,act(old.pack,s,a=>a.type==='attack'&&a.uid===oldLead.uid));
 s=act(old.pack,s,a=>a.type==='attack'&&a.uid===oldCard.uid);
 assert.equal(s.attacksThisTurn,2);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 assert.equal(assertUniversalMatch(old.pack,s),true);

 assert.throws(()=>createUniversalPack({id:'probe',version:'both-flags',cards:[face({
  id:'BOTH',name:'兩者',effects:{onAttack:[{op:'optionalPayApThen',ap:1,optional:true,
   oncePerAttackTurn:true,firstOwnAttack:true,then:[{op:'draw',count:1}]}]}})]}),
  /first own attack is not once per this card/);
});

test('conditional attack draw-discard does not change an unconditional one',()=>{
 const trait='ポジティブパッション';
 const gated={op:'drawDiscard',count:1,discardCount:1,when:raidFace};
 const cards=[
  face({id:'GATE',name:'條件',color:'yellow',effects:{onAttack:[gated]}}),
  face({id:'PLAIN',name:'無條件',color:'green',effects:{onAttack:[
   {op:'drawDiscard',count:1,discardCount:1}]}}),
  face({id:'CGD-1-001',name:'其他作品',color:'red',effects:{onAttack:[gated]}}),
  face({id:'YES',name:'符合',color:'yellow',traits:[trait],raidName:'符合'}),
  face({id:'COLOR',name:'錯色',color:'blue',traits:[trait],raidName:'錯色'}),
  face({id:'WORD',name:'無突襲',color:'yellow',traits:[trait]}),
  face({id:'FIELD',name:'場地',color:'yellow',type:'field',traits:[trait]})
 ];
 const hit=open(cards,91);
 fuel(hit.s);
 const attacker=seat(hit.s,0,'GATE','front',0,true);
 seat(hit.s,0,'YES','energy',0,true);
 const before=hit.s.players[0].hand.length;
 const top=hit.s.players[0].deck[0].uid;
 let s=hit.s;
 while(s.phase!=='attack')s=act(hit.pack,s,a=>a.type==='next');
 s=act(hit.pack,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(s.players[0].hand.length,before+1);
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.player,0);
 assert.equal(legalUniversalActions(hit.pack,s).some(a=>a.uid===null),false);
 s=act(hit.pack,s,a=>a.type==='chooseDiscard'&&a.uid===top);
 assert.equal(s.players[0].hand.some(c=>c.uid===top),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===top));
 assert.equal(s.players[0].hand.length,before);

 function misses(id,seed,line='front'){
  const opened=open(cards,seed);
  fuel(opened.s);
  const who=seat(opened.s,0,'GATE','front',0,true);
  seat(opened.s,0,id,line,line==='front'?1:0,true);
  const size=opened.s.players[0].hand.length;
  let state=opened.s;
  while(state.phase!=='attack')state=act(opened.pack,state,a=>a.type==='next');
  state=act(opened.pack,state,a=>a.type==='attack'&&a.uid===who.uid);
  assert.equal(state.players[0].hand.length,size);
  assert.notEqual(state.pending?.kind,'effect-discard');
  return clearBlock(opened.pack,state);
 }
 misses('COLOR',92);
 misses('WORD',93);
 misses('FIELD',94,'energy');
 const absent=open(cards,95);
 fuel(absent.s);
 const nobody=seat(absent.s,0,'GATE','front',0,true);
 const absentSize=absent.s.players[0].hand.length;
 s=absent.s;
 while(s.phase!=='attack')s=act(absent.pack,s,a=>a.type==='next');
 s=act(absent.pack,s,a=>a.type==='attack'&&a.uid===nobody.uid);
 assert.equal(s.players[0].hand.length,absentSize);
 assert.notEqual(s.pending?.kind,'effect-discard');

 const plain=open(cards,96);
 fuel(plain.s);
 const green=seat(plain.s,0,'PLAIN','front',0,true);
 const plainBefore=plain.s.players[0].hand.length;
 const plainTop=plain.s.players[0].deck[0].uid;
 s=plain.s;
 while(s.phase!=='attack')s=act(plain.pack,s,a=>a.type==='next');
 s=act(plain.pack,s,a=>a.type==='attack'&&a.uid===green.uid);
 assert.equal(s.players[0].hand.length,plainBefore+1);
 assert.equal(s.pending.kind,'effect-discard');
 s=act(plain.pack,s,a=>a.type==='chooseDiscard'&&a.uid===plainTop);
 assert.equal(s.players[0].hand.length,plainBefore);

 const other=open(cards,97);
 fuel(other.s);
 const red=seat(other.s,0,'CGD-1-001','front',0,true);
 seat(other.s,0,'YES','energy',1,true);
 s=other.s;
 while(s.phase!=='attack')s=act(other.pack,s,a=>a.type==='next');
 s=act(other.pack,s,a=>a.type==='attack'&&a.uid===red.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(assertUniversalMatch(other.pack,s),true);
});
