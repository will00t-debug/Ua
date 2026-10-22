import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','009','015','016','018','025','032','041','043','045','052'];
const deck=Object.fromEntries(ids.map(x=>['SLG-1-'+x,4]));deck['SLG-1-037']=2;
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],seed:9009,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],index=list.findIndex(c=>c.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('missing '+id);
}
function main(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function entered(line='front'){
 let s=fresh(),unit=take(s,0,'SLG-1-009');
 s.players[0].hand.push(unit);s=main(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===unit.uid&&a.line===line&&a.slot===0);
 assert.ok(play,'zero energy requirement / one AP can deploy');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0][line][0].ready,false,'normal play is REST');
 return {s,unit};
}
const ability=(s,uid)=>legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode==='discardSelfBuff');

test('official UA51BT/SLG-1-009 printed character / ACTIVE Life and generic strict MAIN profile',()=>{
 const c=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-009'),d=pack.cards[c.id];
 assert.equal(c.number,'UA51BT/SLG-1-009');
 assert.equal(c.nameJa,'向坂 雫');
 assert.ok(c.source.includes('/cardlist/'));assert.match(c.effect,/主要階段每回合一次/);
 assert.deepEqual([d.color,d.energy,d.ap,d.bp,d.gen,d.trigger,d.type],
  ['purple',0,1,1500,1,'active','character']);
 assert.deepEqual(d.effects,{});
 assert.deepEqual(d.mainAbility,{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500});
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
});
test('REST own FRONT character can activate without further AP, selecting an OWN hand UID before BP',()=>{
 let {s,unit}=entered();
 const pre=structuredClone(s),ap=s.players[0].apCards.filter(c=>c.ready).length;
 assert.ok(ability(s,unit.uid),'source does not require ACTIVE, REST or further AP');
 assert.match(uiActionLabel(ability(s,unit.uid),{pack:packs,state:s}),/棄一張手牌/);
 s=dispatchUniversalAction(packs,s,ability(s,unit.uid));
 assert.equal(s.pending.kind,'main-discard-buff');
 assert.ok(s.players[0].front[0]&&!s.players[0].front[0].ready);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500,'BP must not increase BEFORE paying cost');
 assert.equal(s.mainAbilityUsedUids.includes(unit.uid),false,'not used until payment');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.match(V2_PENDING_LABELS[s.pending.kind],/支付/);
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.every(a=>a.type==='chooseMainDiscard'&&
  s.players[0].hand.some(c=>c.uid===a.uid)));
 const forbidden=take(s,1,'SLG-1-005');s.players[1].outside.push(forbidden);
 for(const invalid of [
  {type:'chooseMainDiscard',uid:unit.uid},
  {type:'chooseMainDiscard',uid:forbidden.uid},
  {type:'chooseMainDiscard',uid:null}
 ])assert.throws(()=>dispatchUniversalAction(packs,s,invalid),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,legal[0],{actor:1}),/Wrong player/);
 const publicEnemy=universalPublicView(packs,s,1);
 assert.deepEqual(publicEnemy.pending,{kind:'main-discard-buff',player:0});
 assert.equal(publicEnemy.players[0].hand,null);
 assert.deepEqual(pre.players[0].hand.map(c=>c.uid).includes(legal[0].uid),true);
 const handBefore=s.players[0].hand.length,expected=legal[0].uid;
 const out=dispatchUniversalAction(packs,s,legal[0],{actor:0});
 assert.equal(out.pending,null);
 assert.equal(out.players[0].hand.length,handBefore-1);
 assert.ok(out.players[0].outside.some(c=>c.uid===expected));
 assert.equal(out.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(out.players[0].front[0].ready,false);
 assert.equal(universalBp(packs,out,out.players[0].front[0]),3000);
 assert.deepEqual(out.mainAbilityUsedUids,[unit.uid]);
 assert.ok(!ability(out,unit.uid),'once-per-turn lock covers follow-up requests');
 assert.throws(()=>dispatchUniversalAction(packs,out,{type:'activate',uid:unit.uid,mode:'discardSelfBuff'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,out),true);
});
test('own ENERGY character may activate while REST and MAIN buff does not add generated energy',()=>{
 let {s,unit}=entered('energy');
 const oldReady=s.players[0].energy[0].ready,action=ability(s,unit.uid);
 assert.ok(action);
 const old=s.players[0].energy[0].buffs.length,priorAp=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'main-discard-buff');
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===ai.uid),'AI chooses real OWN hand UID');
 s=dispatchUniversalAction(packs,s,ai);
 assert.equal(s.players[0].energy[0].ready,oldReady);
 assert.equal(s.players[0].energy[0].buffs.length,old+1);
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),3000);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,priorAp);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('empty OWN hand disables MAIN discard ability without making an illegal unpaid buff',()=>{
 let {s,unit}=entered();
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(ability(s,unit.uid),undefined);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:unit.uid,mode:'discardSelfBuff'}),/not currently legal/);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BP expires and once-use unlocks on later own turn, without restoring paid hand card',()=>{
 let {s,unit}=entered(),act=ability(s,unit.uid);
 s=dispatchUniversalAction(packs,s,act);
 const paid=legalUniversalActions(packs,s)[0];
 s=dispatchUniversalAction(packs,s,paid);
 const spentUid=paid.uid;
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3000);
 // End MAIN, ATTACK, opponent START/MOVE/MAIN/ATTACK and then own START/MOVE/MAIN.
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=main(s);
 assert.equal(s.mainAbilityUsedUids.includes(unit.uid),false);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500);
 assert.ok(ability(s,unit.uid),'source can pay cost once again NEXT own turn');
 assert.ok(s.players[0].outside.some(x=>x.uid===spentUid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-009 ACTIVE Life separately readies one owned field unit and buffs +3000, NOT MAIN discarded cost',()=>{
 let s=fresh(),flipped=take(s,1,'SLG-1-009'),
  attacker=take(s,0,'SLG-1-005'),target=take(s,1,'SLG-1-005');
 attacker.ready=true;target.ready=false;
 s.players[0].front[0]=attacker;s.players[1].front[0]=target;
 s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(flipped);
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 const act=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===target.uid);
 assert.ok(act);
 const handBefore=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,act,{actor:1});
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),5000);
 assert.equal(s.players[1].hand.length,handBefore);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict main discard self-buff schema refuses unknown keys, non-characters and invented optional or AP cost',()=>{
 const base={id:'SYN',name:'Test',type:'character',color:'purple',
  energy:0,ap:1,bp:1500,gen:1,implementation:'dsl',effects:{},
  mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500}};
 const create=c=>createUniversalPack({id:'synthetic',cards:[c]});
 assert.doesNotThrow(()=>create(base));
 for(const profile of [
  {op:'discardHandBuffSelf',oncePerTurn:false,discardCount:1,bp:1500},
  {op:'discardHandBuffSelf',oncePerTurn:true,discardCount:0,bp:1500},
  {op:'discardHandBuffSelf',oncePerTurn:true,discardCount:2,bp:1500},
  {op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:0},
  {op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500,ap:1},
  {op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500,rest:true}
 ])assert.throws(()=>create({...base,mainAbility:profile}),/unsupported main action ability/);
 assert.throws(()=>create({...base,type:'event',bp:0,gen:0}),/unsupported main action ability/);
 assert.throws(()=>create({...base,implementation:'vanilla'}),/claims vanilla/);
});
