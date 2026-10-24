import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
const pack=registeredV2TitlePack('sword-art-online'),packs=[pack,pack];
const src=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-069');
const ids=['SAO-1-001','SAO-1-005','SAO-2-035','SAO-2-047','SAO-1-004','SAO-1-019',
 'SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-068','SAO-1-069','SAO-2-068','SAO-2-069'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
 if(i>=0)return arr.splice(i,1)[0];}throw Error('No physical '+id);}
function scene(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:44069});
 const base=take(s,0,'SAO-2-068'),top=take(s,0,'SAO-2-069'),as=take(s,0,'SAO-1-068');
 base.ready=true;base.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=base;
 s.players[0].hand.push(top);
 for(let i=0;i<3;i++){const c=take(s,0,'SAO-1-068');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;}
 const c=take(s,0,'SAO-1-069');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[3]=c;
 // Do NOT let take() retrieve the intended in-hand Asuna as an energy producer.
 s.players[0].hand.push(as);
 const enemy=take(s,1,'SAO-1-068');enemy.ready=true;
 enemy.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=enemy;
 for(let k=0;k<2;k++)s=use(s,{type:'next'});
 assert.equal(s.phase,'main');return {s,base,top,as,enemy};
}
test('R44 complete original SAO-069 printed Raid/phase/onPlay/onRetire and RAID LIFE',()=>{
 assert.equal(src.number,'EX08BT/SAO-2-069');
 assert.deepEqual([src.color,src.energy,src.ap,src.bp,src.gen,src.trigger],
 ['green',4,1,4000,1,'raid']);
 for(const part of ['【レイド】〈ユウキ〉','自分と相手のアタックフェイズ終了時',
 '【登場時】BP4000以下','【退場時】','必要エナジーが3以下','消費APが1の緑の〈アスナ〉'])
  assert.ok(src.effectJa.includes(part),part);
 const d=pack.cards['SAO-2-069'];
 assert.equal(d.raidName,'ユウキ');
 assert.deepEqual(d.effects.onPlay,[{op:'retireOppFrontOneUnderBp',bp:4000,optional:true}]);
 assert.deepEqual(d.effects.onRetire,[{op:'deployNamedFromZones',name:'アスナ',zones:['hand'],
  line:'any',ready:false,optional:true,color:'green',ap:1,maxEnergy:3}]);
 assert.deepEqual(d.phaseEffects,['own','opponent'].map(turn=>({
  phase:'attack',edge:'end',turn,then:[{op:'retireSourceOnPhaseEnd'}]})));
});
test('R44 actual paid RAID onPlay BP check and attack-end self retirement leads HAND Asuna REST',()=>{
 let {s,base,top,as,enemy}=scene();
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid,'printed green4 Raid on Yuuki must be legal');
 s=use(s,raid);
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.ok(legalUniversalActions(packs,s).some(x=>x.uid===enemy.uid));
 const kill=legalUniversalActions(packs,s).find(x=>x.uid===enemy.uid);
 s=use(s,kill);
 assert.ok(s.players[1].outside.some(x=>x.uid===enemy.uid));
 assert.ok(s.players[0].front.some(x=>x?.uid===top.uid&&x.ready));
 s=use(s,{type:'next'});assert.equal(s.phase,'attack');
 s=use(s,{type:'next'});
 assert.ok(s.players[0].outside.some(x=>x.uid===top.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===base.uid));
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const choice=legalUniversalActions(packs,s).find(x=>x.type==='chooseNamedZoneDeploy'&&
  x.uid===as.uid&&x.zone==='hand'&&x.line==='front');
 assert.ok(choice);
 const before=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,choice);
 const entered=s.players[0].front[choice.slot];
 assert.equal(entered.uid,as.uid);
 // Asuna enters REST, then this turn player's END refresh happens immediately
 // once the attack-end retirement/entry queue has fully resolved.
 assert.equal(s.active,1);assert.equal(entered.ready,true);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,before);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R44 no automatic FREE REST if no eligible current hand card; clean skip',()=>{
 let {s,base,top,as}=scene();
 // Remove every eligible printed Asuna from hand without violating conservation.
 for(const c of [...s.players[0].hand]){
  const d=pack.cards[c.cardId];
  if(d.name==='アスナ'&&d.color==='green'&&d.ap===1&&d.energy<=3){
   s.players[0].hand.splice(s.players[0].hand.findIndex(x=>x.uid===c.uid),1);
   s.players[0].outside.push(c);
  }
 }
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.baseUid===base.uid&&a.uid===top.uid);
 s=use(s,raid);
 const skip=legalUniversalActions(packs,s).find(a=>a.uid===null);
 assert.ok(skip);s=use(s,skip);s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('R44 generic RAID LIFE GET mode returns real card to own hand with no printed onPlay',()=>{
 let {s,top,base}=scene();
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===top.uid),1);
 s.players[0].outside.push(top);
 s.pending={kind:'life-trigger',player:0,uid:top.uid,trigger:'raid'};
 const actions=legalUniversalActions(packs,s);
 const get=actions.find(a=>a.type==='chooseTrigger'&&a.mode==='get');
 const raid=actions.find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(get);assert.ok(raid);
 const before=s.players[0].front[0].uid;
 s=use(s,get);
 assert.ok(s.players[0].hand.some(c=>c.uid===top.uid));
 assert.equal(s.players[0].front[0].uid,before);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R44 actual RAID LIFE free Raid enters shared onPlay and spends no normal AP',()=>{
 let {s,top,base}=scene();
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===top.uid),1);
 s.players[0].outside.push(top);
 s.pending={kind:'life-trigger',player:0,uid:top.uid,trigger:'raid'};
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTrigger'&&x.mode==='raid'&&x.baseUid===base.uid);
 assert.ok(a);const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,a);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.ok(s.players[0].front.some(c=>c?.uid===top.uid));
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R44 BP-limit uses CURRENT opponent BP; buffs above 4000 make onPlay skip safely',()=>{
 let {s,base,top,enemy}=scene();
 // dispatch returns a cloned state; mutate its current physical target, not the stale fixture reference.
 s.players[1].front[0].buffs.push({bp:4000,untilTurn:s.turn});
 const a=legalUniversalActions(packs,s).find(x=>x.type==='raid'&&x.baseUid===base.uid&&x.uid===top.uid);
 assert.ok(a);s=use(s,a);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].front.some(c=>c?.uid===enemy.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R44 opponent attack-end retires printed Yuuki and opens own-hand REST entry',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:1,seed:44070});
 const top=take(s,0,'SAO-2-069'),as=take(s,0,'SAO-1-068');
 top.ready=true;top.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=top;
 s.players[0].hand.push(as);
 for(let i=0;i<3;i++)s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');assert.equal(s.active,1);
 s=use(s,{type:'next'});
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 assert.ok(s.zoneMoveEvents.some(x=>x.uid===top.uid&&x.reason==='retirement'));
 const a=legalUniversalActions(packs,s).find(x=>x.uid===as.uid&&x.type==='chooseNamedZoneDeploy'&&x.line==='energy');
 assert.ok(a);s=use(s,a);
 assert.ok(s.players[0].energy.some(c=>c?.uid===as.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
