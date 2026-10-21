import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';

const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','015','016','026','032','041','043','045','052','055','078','025'];
const deck=Object.fromEntries(ids.map((id,i)=>['SLG-1-'+id,i===ids.length-1?2:4]));
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:25025});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const items=s.players[p][zone],i=items.findIndex(c=>c.cardId===id);
  if(i>=0)return items.splice(i,1)[0];
 }
 throw Error('Missing exact card '+id);
}
function phase(s,name){
 for(let i=0;i<5&&s.phase!==name;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,name);return s;
}
function entered(){
 let s=fresh();
 const source=take(s,0,'SLG-1-025');
 const valid=take(s,0,'SLG-1-005'),trait=take(s,0,'SLG-1-032');
 const event=take(s,0,'SLG-1-078'),foe=take(s,1,'SLG-1-005');
 for(let i=0;i<3;i++){
  const energy=take(s,0,'SLG-1-005');energy.ready=true;s.players[0].energy[i]=energy;
 }
 s.players[0].hand.push(source);
 s.players[0].outside.push(valid,trait,event);
 s.players[1].outside.push(foe);
 s=phase(s,'main');
 // Fixture represents a later own turn with two ready AP; ordinary play still
 // must charge both printed AP through the real legal V2 action.
 for(let i=0;i<2;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
 const readyBefore=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action,'printed purple3/AP2 card is legally playable');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(readyBefore-s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,2);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,source,valid,trait,event,foe};
}
test('SLG-1-025 printed source, true mandatory two-choice queue, separate ACTIVE life',()=>{
 const source=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-025'),p=pack.cards['SLG-1-025'];
 assert.equal(source.nameJa,'観月 絵里');
 assert.ok(source.source.includes('UA51BT'));
 assert.deepEqual([p.color,p.energy,p.ap,p.bp,p.gen,p.trigger,p.type],
  ['purple',3,2,2000,2,'active','character']);
 assert.deepEqual(p.effects.onPlay,[{op:'chooseOne',optional:false,options:[
  {id:'drawTwo',label:'抽兩張牌',turn:'any',then:[{op:'draw',count:2}]},
  {id:'drawRecover',label:'抽一張，再回收最多一張能源3以下無特徵角色',
   turn:'any',then:[{op:'draw',count:1},
    {op:'recoverOutsideTraitlessUnderEnergy',energy:3,optional:true}]}
 ]}]);
 const {s}=entered();
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseEffectMode',mode:'drawTwo'},
  {type:'chooseEffectMode',mode:'drawRecover'}]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('draw-two branch never executes outside recovery and consumes no extra AP',()=>{
 let {s,valid}=entered();
 const beforeHand=s.players[0].hand.length,beforeDeck=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'drawTwo'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,beforeHand+2);
 assert.equal(s.players[0].deck.length,beforeDeck-2);
 assert.ok(s.players[0].outside.some(c=>c.uid===valid.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('draw-one branch offers only OWN OUTSIDE traitless CHARACTER with printed energy <=3',()=>{
 let {s,valid,trait,event,foe}=entered();
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'drawRecover'});
 assert.equal(s.players[0].deck.length,before-1,'draw MUST resolve first');
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:valid.uid}]);
 for(const uid of [trait.uid,event.uid,foe.uid,'0-forged']){
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseOutsideRecovery',uid}),/not currently legal|Illegal|eligible/);
 }
 const publicEnemy=universalPublicView(packs,s,1);
 assert.deepEqual(publicEnemy.pending,{kind:'effect-recover-outside',player:0},
  'opponent sees pending kind but not controller decision candidates');
 assert.equal(publicEnemy.players[0].hand,null,'other player hand stays concealed');
 assert.ok(publicEnemy.players[0].outside.some(c=>c.uid===valid.uid),
  'own outside is PUBLIC; its physical UID is not secret');
 const chosen=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:valid.uid});
 assert.ok(chosen.players[0].hand.some(c=>c.uid===valid.uid));
 assert.ok(!chosen.players[0].outside.some(c=>c.uid===valid.uid));
 assert.equal(assertUniversalMatch(packs,chosen),true);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:null});
 assert.ok(skipped.players[0].outside.some(c=>c.uid===valid.uid));
 assert.equal(assertUniversalMatch(packs,skipped),true);
});
test('ACTIVE life of SLG-1-025 still readies own field character and adds exactly 3000 BP',()=>{
 let s=fresh(),flip=take(s,1,'SLG-1-025');
 const attacker=take(s,0,'SLG-1-005'),target=take(s,1,'SLG-1-005');
 attacker.ready=true;target.ready=false;
 s.players[0].front[0]=attacker;s.players[1].front[0]=target;
 const old=s.players[1].life.shift();s.players[1].deck.push(old);s.players[1].life.unshift(flip);
 s=phase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.mode==='active'&&a.uid===target.uid));
 assert.ok(!choices.some(a=>a.uid===attacker.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:target.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),5000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict traitless-energy DSL rejects foreign keys and malformed or mandatory branch profiles',()=>{
 const p={id:'SYN-1',name:'Synthetic',color:'purple',type:'character',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',
  effects:{onPlay:[{op:'chooseOne',optional:false,options:[
   {id:'draw',label:'Draw',turn:'any',then:[{op:'draw',count:1}]},
   {id:'rec',label:'Recover',turn:'any',
    then:[{op:'recoverOutsideTraitlessUnderEnergy',energy:3,optional:true}]}
  ]}]}};
 assert.doesNotThrow(()=>createUniversalPack({id:'synthetic',cards:[p]}));
 for(const bad of [
  {energy:-1,optional:true},
  {energy:3,optional:'yes'},
  {energy:3},
  {energy:3,optional:true,trait:'影之軍團'}
 ]){
  const clone=structuredClone(p);clone.effects.onPlay[0].options[1].then[0]=
   {op:'recoverOutsideTraitlessUnderEnergy',...bad};
  assert.throws(()=>createUniversalPack({id:'synthetic',cards:[clone]}),
   /invalid traitless printed-energy recovery/);
 }
});
