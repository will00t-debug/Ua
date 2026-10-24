import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['001','002','005','006','007','010','013','015','016','026','032','043'];
const counts=Object.fromEntries(ids.map(id=>['SLG-1-'+id,4]));
counts['SLG-1-041']=2;
function fresh(){return newUniversalMatch(packs,{decks:[counts,counts],seed:7013,first:0});}
function take(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[owner][zone],index=list.findIndex(x=>x.cardId==='SLG-1-'+id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('No physical SLG '+id+' in owned zones');
}
function set(s,owner,id,line='energy',slot=0){
 const c=take(s,owner,id);assert.equal(s.players[owner][line][slot],null);
 c.ready=true;s.players[owner][line][slot]=c;return c;
}
function phase(s,phaseWanted,p=packs){
 for(let n=0;n<5&&s.phase!==phaseWanted;n++){
  const action=legalUniversalActions(p,s).find(a=>a.type==='next');
  assert.ok(action);s=dispatchUniversalAction(p,s,action);
 }
 assert.equal(s.phase,phaseWanted);return s;
}
function play(s,uid,line='energy'){
 const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);
 assert.ok(a,'printed cost and AP must be met before play');
 return dispatchUniversalAction(packs,s,a);
}
test('only official audited 007/013 enter real SLG V2 registry with complete printed abilities',()=>{
 const retirement=pack.cards['SLG-1-007'],timed=pack.cards['SLG-1-013'];
 assert.deepEqual(retirement.effects.onRetire,[{op:'draw',count:1}]);
 assert.equal(retirement.trigger,'draw');
 assert.deepEqual(timed.mainAbility,{op:'restSelfGainEnergyRetireEndMain',
  energyOnly:true,oncePerTurn:true,extraEnergy:1});
 assert.equal(timed.trigger,null);
 assert.equal(retirement.energy,0);assert.equal(retirement.bp,500);
 assert.equal(timed.energy,0);assert.equal(timed.gen,1);
 assert.ok(Object.isFrozen(retirement.effects.onRetire));
});
test('real SLG-007 battle retirement queues DRAW for printed owner; not the attacking player',()=>{
 let s=fresh(),attacker=set(s,0,'010','front',0),
  defender=set(s,1,'007','front',0);
 s=phase(s,'attack');
 const beforeDeck=s.players[1].deck.length,beforeHand=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 assert.ok(legalUniversalActions(packs,s).some(x=>x.type==='chooseBlock'&&x.uid===defender.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:'0-bogus'}),
  /not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(s.players[1].hand.length,beforeHand+1);
 assert.equal(s.players[1].deck.length,beforeDeck-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('own bounce of 007 is NOT retirement; no draw and its real UID arrives in hand',()=>{
 let s=fresh(),target=set(s,0,'007','front',0);
 set(s,0,'005','energy',0);
 const bounce=take(s,0,'026');s.players[0].hand.push(bounce);
 s=phase(s,'main');const beforeDeck=s.players[0].deck.length;
 s=play(s,bounce.uid,'front');
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===target.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:target.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 assert.equal(s.players[0].deck.length,beforeDeck,'bounce did not fire onRetire draw');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('replacement into full ENERGY line REMOVES 007, does not RETIRE or draw',()=>{
 let s=fresh(),target=set(s,0,'007','energy',0);
 for(let i=1;i<4;i++)set(s,0,'005','energy',i);
 const incoming=take(s,0,'002');s.players[0].hand.push(incoming);
 s=phase(s,'main');const beforeDeck=s.players[0].deck.length;
 const a=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===incoming.uid&&
  x.line==='energy'&&x.slot===0&&x.replaceUid===target.uid);
 assert.ok(a);
 s=dispatchUniversalAction(packs,s,a);
 assert.ok(s.players[0].removed.some(x=>x.uid===target.uid));
 assert.ok(!s.players[0].outside.some(x=>x.uid===target.uid));
 assert.equal(s.players[0].deck.length,beforeDeck);
 // Incoming 002 still has its own normal onPlay mode, not a retirement trigger.
 assert.equal(s.pending?.kind,'effect-choice-mode');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('013 MAIN source REST gives current +1 energy and retires exactly once at phase end',()=>{
 let s=fresh(),source=set(s,0,'013','energy',0);
 s=phase(s,'main');
 const before=universalEnergyByColor(packs,s,0).purple;
 assert.equal(before,1);
 const a={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
 assert.equal(uiActionLabel(a,{pack,state:s}).includes('主要階段結束退場'),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,a,{actor:1}),/Wrong player/);
 const orig=structuredClone(s);
 s=dispatchUniversalAction(packs,s,a);
 assert.deepEqual(orig.players[0].energy[0],source,'pure reducer keeps caller unchanged');
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 assert.equal(s.delayedEffects.length,1);
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.type==='activate'&&x.uid===a.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,a),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(x=>x.uid===source.uid));
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalEnergyByColor(packs,s,0).purple||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('same physical 013 bouncing before main end cancels its deferred retirement on re-entry',()=>{
 let s=fresh(),source=set(s,0,'013','energy',0);
 set(s,0,'005','energy',1);
 const bounce=take(s,0,'026');s.players[0].hand.push(bounce);
 s=phase(s,'main');
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'});
 assert.equal(s.delayedEffects.length,1);
 s=play(s,bounce.uid,'front');
 assert.equal(s.pending?.kind,'effect-bounce-own');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:source.uid});
 assert.ok(s.players[0].hand.some(x=>x.uid===source.uid));
 const restored=s.players[0].hand.splice(s.players[0].hand.findIndex(x=>x.uid===source.uid),1)[0];
 assert.equal(restored.fieldEntryStamp,null,'leaving wipes the prior incarnation');
 restored.ready=false;s.players[0].energy[0]=restored; // explicit second-entry fixture, no AP charged
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0]?.uid,source.uid,'old delayed action cannot retire new incarnation');
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),1,'old energy buff cleared');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('013 cannot activate from FRONT and old ACTIVE energy bonus remains source separated',()=>{
 let s=fresh(),front=set(s,0,'013','front',0),active=set(s,0,'006','energy',0);
 s=phase(s,'main');
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.type==='activate'&&x.uid===front.uid));
 assert.equal(universalCardEnergy(packs,s,0,active),2);
 active.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,active),2,'detached pre-dispatch reference cannot change live production');
 s.players[0].energy[0].ready=false;
 assert.equal(universalCardEnergy(packs,s,0,active),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('AI action for 013 is from legal list; synthetic onRetire/mill verification rejects unsupported operations',()=>{
 let s=fresh(),c=set(s,0,'013','energy',0);s=phase(s,'main');
 const legal=legalUniversalActions(packs,s);
 const action=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(action)));
 const bad={id:'QA',type:'character',color:'purple',name:'QA',energy:0,
  bp:1000,ap:1,gen:1,implementation:'dsl',effects:{onRetire:[{op:'recoverAp',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'retire-qa',cards:[bad]}),/unsupported onRetire/);
 assert.throws(()=>createUniversalPack({id:'retire-qa',cards:[{...bad,
  effects:{},mainAbility:{op:'restSelfGainEnergyRetireEndMain',
   energyOnly:true,oncePerTurn:false,extraEnergy:1}}]}),/unsupported main action/);
 assert.ok(c.uid);
});

function syntheticRetirePack({protect=false}={}){
 const raw=Array.from({length:13},(_,i)=>({
  id:'T'+i,name:'T'+i,color:'purple',energy:0,ap:1,bp:1000,gen:1,
  type:'character',implementation:'vanilla',effects:{}
 }));
 raw[0]={...raw[0],implementation:'dsl',effects:{onRetire:[{op:'draw',count:1}]},
  ...(protect?{raidName:'T0',conditionalUnderFaceDown:{
   bp:1000,impact:1,leaveReplacementMinBp:1000}}:{})};
 raw[1]={...raw[1],implementation:'dsl',effects:{onRetire:[{op:'millTop',count:1}]}};
 raw[2]={...raw[2],type:'event',bp:0,gen:0,implementation:'dsl',
  effects:{onPlay:[{op:'retireOppFrontAllUnderBp',bp:2000}]}};
 const p=createUniversalPack({id:'synthetic-retire-qa',cards:raw});
 const deck=Object.fromEntries(raw.map((x,i)=>[x.id,i===12?2:4]));
 return {p,deck};
}
function syntheticPull(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[owner][zone],idx=a.findIndex(c=>c.cardId===id);
  if(idx>=0)return a.splice(idx,1)[0];
 }
 throw Error('Synthetic UID missing '+id);
}
test('simultaneous retirement lets the controller choose onRetire order; both still resolve once',()=>{
 const {p,deck}=syntheticRetirePack(),pair=[p,p];
 let s=newUniversalMatch(pair,{decks:[deck,deck],seed:884,first:0});
 const first=syntheticPull(s,1,'T0'),second=syntheticPull(s,1,'T1');
 for(const [i,c] of [first,second].entries()){c.ready=true;s.players[1].front[i]=c;}
 const event=syntheticPull(s,0,'T2');s.players[0].hand.push(event);
 s=phase(s,'main',pair);
 const handBefore=s.players[1].hand.length,deckBefore=s.players[1].deck.length;
 const top=s.players[1].deck.slice(0,2).map(c=>c.uid);
 const playEvent=legalUniversalActions(pair,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(playEvent);
 s=dispatchUniversalAction(pair,s,playEvent);
 assert.equal(s.pending?.kind,'retirement-order');
 assert.equal(s.pending.player,1,'the retired cards controller orders their own triggers');
 assert.equal(s.active,0);
 const choices=legalUniversalActions(pair,s);
 assert.equal(choices.length,2);
 assert.ok(choices.every(a=>a.type==='chooseRetirementOrder'));
 const drawFirst=choices.find(a=>a.key.startsWith(first.uid));
 assert.ok(drawFirst);
 assert.throws(()=>dispatchUniversalAction(pair,s,{type:'chooseRetirementOrder',key:'forged'},{actor:1}),
  /not currently legal/);
 s=dispatchUniversalAction(pair,s,drawFirst,{actor:1});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===first.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===second.uid));
 assert.ok(s.players[1].hand.some(c=>c.uid===top[0]),
  'choosing the left victim first draws that deck top');
 assert.ok(s.players[1].outside.some(c=>c.uid===top[1]),
  'the other victim then mills the next card');
 assert.equal(s.players[1].hand.length,handBefore+1);
 assert.equal(s.players[1].deck.length,deckBefore-2);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===first.uid).length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===second.uid).length,1);
 assert.equal(assertUniversalMatch(pair,s),true);
});
test('protected retirement never fires onRetire; choosing genuine leave DOES fire from pre-exit source',()=>{
 const {p,deck}=syntheticRetirePack({protect:true}),pair=[p,p];
 const setup=()=>{
  let s=newUniversalMatch(pair,{decks:[deck,deck],seed:917,first:0});
  const source=syntheticPull(s,1,'T0'),under=syntheticPull(s,1,'T4');
  under.faceDown=true;source.under=[under];source.ready=true;s.players[1].front[0]=source;
  const event=syntheticPull(s,0,'T2');s.players[0].hand.push(event);
  s=phase(s,'main',pair);
  const action=legalUniversalActions(pair,s).find(a=>a.type==='event'&&a.uid===event.uid);
  assert.ok(action);
  s=dispatchUniversalAction(pair,s,action);
  assert.equal(s.pending?.kind,'leave-replacement');
  return {s,source,under};
 };
 let {s,source,under}=setup();
 const before=s.players[1].deck.length;
 s=dispatchUniversalAction(pair,s,{type:'chooseLeaveReplacement',mode:'protect'});
 assert.equal(s.players[1].front[0]?.uid,source.uid);
 assert.ok(s.players[1].outside.some(c=>c.uid===under.uid));
 assert.equal(s.players[1].deck.length,before,'protection does not draw');
 assert.equal(assertUniversalMatch(pair,s),true);
 ({s,source}=setup());
 const beforeHand=s.players[1].hand.length;
 s=dispatchUniversalAction(pair,s,{type:'chooseLeaveReplacement',mode:'leave'});
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[1].hand.length,beforeHand+1,'actual retirement queues printed draw');
 assert.equal(assertUniversalMatch(pair,s),true);
});
