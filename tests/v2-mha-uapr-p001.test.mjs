// UAPR/MHA-P-001 緑谷 出久. Hand entry, impact null, and own-turn BP.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lab,match,hold,take,occupy,toMain,act,legal,play} from './v2-mha-uapr-lab.mjs';
import {universalBp,universalImpactNull,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const NEED=['MHA-P-001','LAB-Y','LAB-A','LAB-DEKU','LAB-OFA-A','LAB-OFA-B','LAB-HIT','LAB-RAIDER'];

function open(seed){
 const game=match(seed,NEED);
 game.s=toMain(lab,game.s);
 return game;
}
function promo(s){return hold(s,0,'MHA-P-001');}

test('hand entry is legal with an empty field once yellow energy exists, and raid is never offered',()=>{
 const {s}=open(1);
 const card=promo(s);
 occupy(s,0,'LAB-Y','energy',0);
 const actions=legal(lab,s).filter(a=>a.uid===card.uid);
 assert.equal(actions.some(a=>a.type==='play'),true);
 assert.equal(actions.some(a=>a.type==='raid'),false);
 const played=play(lab,s,card.uid);
 assert.equal(played.players[0].front.some(c=>c?.uid===card.uid),true);
});

test('another A組 name blocks hand play, including from the energy line',()=>{
 const {s}=open(2);
 const card=promo(s);
 occupy(s,0,'LAB-A','energy',0);
 assert.equal(legal(lab,s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'play',uid:card.uid,line:'front',slot:0}),
  /Action not currently legal/);
});

test('the same printed name, a different trait, and A組 outside the field stay legal',()=>{
 const same=open(3);
 const card=promo(same.s);
 occupy(same.s,0,'LAB-DEKU','front',0,{ready:true});
 occupy(same.s,0,'LAB-Y','energy',0);
 assert.equal(legal(lab,same.s).some(a=>a.type==='play'&&a.uid===card.uid),true);
 occupy(same.s,0,'LAB-DEKU','energy',1);
 assert.equal(legal(lab,same.s).some(a=>a.type==='play'&&a.uid===card.uid),true);

 const other=open(4);
 const second=promo(other.s);
 const outsider=hold(other.s,0,'LAB-A');
 other.s.players[0].outside.push(other.s.players[0].hand.splice(
  other.s.players[0].hand.findIndex(c=>c.uid===outsider.uid),1)[0]);
 occupy(other.s,0,'LAB-Y','energy',0);
 assert.equal(legal(lab,other.s).some(a=>a.type==='play'&&a.uid===second.uid),true);

 const trait=open(5);
 const third=promo(trait.s);
 occupy(trait.s,0,'LAB-OFA-A','front',0);
 occupy(trait.s,0,'LAB-Y','energy',0);
 assert.equal(legal(lab,trait.s).some(a=>a.type==='play'&&a.uid===third.uid),true);
});

test('a face-down A組 character does not block hand entry',()=>{
 const {s}=open(6);
 const card=promo(s);
 const hidden=occupy(s,0,'LAB-A','front',0);
 hidden.faceDown=true;
 occupy(s,0,'LAB-Y','energy',0);
 assert.equal(legal(lab,s).some(a=>a.type==='play'&&a.uid===card.uid),true);
});

test('own-turn BP counts each distinct One For All name on the field and outside once',()=>{
 const {s}=open(7);
 const card=occupy(s,0,'MHA-P-001','front',0,{ready:true});
 assert.equal(universalBp(lab,s,card),1500);
 const first=occupy(s,0,'LAB-OFA-A','front',1,{ready:true});
 assert.equal(universalBp(lab,s,card),2000);
 const twin=take(s,0,'LAB-OFA-A');
 s.players[0].outside.push(twin);
 assert.equal(universalBp(lab,s,card),2000);
 const second=take(s,0,'LAB-OFA-B');
 s.players[0].outside.push(second);
 assert.equal(universalBp(lab,s,card),2500);
 const hidden=take(s,0,'LAB-OFA-A');
 const buried=occupy(s,0,'LAB-RAIDER','front',2,{ready:true});
 buried.stack=[hidden];
 assert.equal(first.cardId,'LAB-OFA-A');
 assert.equal(universalBp(lab,s,card),2500);
 const foe=occupy(s,1,'LAB-OFA-B','front',0,{ready:true});
 assert.equal(foe.cardId,'LAB-OFA-B');
 assert.equal(universalBp(lab,s,card),2500);
});

test('the BP bonus is off on the opponent turn and while silenced',()=>{
 let {s}=open(8);
 const card=occupy(s,0,'MHA-P-001','front',0,{ready:true});
 occupy(s,0,'LAB-OFA-A','energy',0);
 assert.equal(universalBp(lab,s,card),2000);
 let guard=0;
 while(!(s.active===1&&s.phase==='main')){
  assert.equal(s.pending,null);
  s=act(lab,s,{type:'next'});
  if(++guard>12)throw Error('turn did not pass');
 }
 assert.equal(universalBp(lab,s,card),1500);
 while(!(s.active===0&&s.phase==='main')){
  assert.equal(s.pending,null);
  s=act(lab,s,{type:'next'});
 }
 assert.equal(universalBp(lab,s,card),2000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:card.uid,targetUid:card.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 assert.equal(universalBp(lab,s,card),1500);
 assert.equal(universalImpactNull(lab,s,card),false);
});

test('impact null stops the attacker impact when this character loses the battle',()=>{
 let {s}=open(9);
 const attacker=occupy(s,0,'LAB-HIT','front',0,{ready:true});
 const wall=occupy(s,1,'MHA-P-001','front',0,{ready:true});
 assert.equal(universalImpactNull(lab,s,wall),true);
 s=act(lab,s,{type:'next'});
 assert.equal(s.phase,'attack');
 const life=s.players[1].life.length;
 s=act(lab,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 s=act(lab,s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
});
