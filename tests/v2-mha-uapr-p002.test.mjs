// UAPR/MHA-P-002 死柄木 弔. Empty-field cost, raid replay, and the paid BP cut.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lab,match,hold,occupy,toMain,act,legal} from './v2-mha-uapr-lab.mjs';
import {zoneRequiredEnergy,universalBp,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const NEED=['MHA-P-002','LAB-P','LAB-RAIDER','LAB-2500','LAB-2000','LAB-3000','LAB-Y'];

function open(seed){
 const game=match(seed,NEED);
 game.s=toMain(lab,game.s);
 return game;
}
function emptyHand(s,p,keep){
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0;i--){
  if(hand[i].uid===keep)continue;
  s.players[p].deck.push(hand.splice(i,1)[0]);
 }
}

test('the purple 2 discount applies only to a hand card while the field is empty',()=>{
 const {s}=open(21);
 const card=hold(s,0,'MHA-P-002');
 const printed=lab.cards['MHA-P-002'];
 assert.equal(printed.energy,2);
 assert.equal(zoneRequiredEnergy(lab,s,0,printed,'hand'),0);
 assert.equal(zoneRequiredEnergy(lab,s,0,printed,'life'),2);
 assert.equal(zoneRequiredEnergy(lab,s,0,printed,'field'),2);
 assert.equal(zoneRequiredEnergy(lab,s,0,printed,'outside'),2);
 occupy(s,0,'LAB-Y','energy',0);
 assert.equal(zoneRequiredEnergy(lab,s,0,printed,'hand'),2);
 assert.equal(legal(lab,s).some(a=>a.type==='play'&&a.uid===card.uid),false);
});

test('an empty field lets the card enter, and declining the hand payment skips the BP cut',()=>{
 let {s}=open(22);
 const card=hold(s,0,'MHA-P-002');
 const spare=hold(s,0,'LAB-Y');
 const victim=occupy(s,1,'LAB-2500','front',0,{ready:true});
 assert.equal(legal(lab,s).some(a=>a.type==='play'&&a.uid===card.uid),true);
 s=act(lab,s,legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-optional-hand-outside');
 assert.equal(legal(lab,s).some(a=>a.type==='chooseOptionalHandOutside'&&a.uid===null),true);
 s=act(lab,s,{type:'chooseOptionalHandOutside',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(universalBp(lab,s,victim),2500);
});

test('paying a hand card reduces only a front character of BP 2500 or more',()=>{
 let {s}=open(23);
 const card=hold(s,0,'MHA-P-002');
 const spare=hold(s,0,'LAB-Y');
 const high=occupy(s,1,'LAB-2500','front',0,{ready:true});
 const low=occupy(s,1,'LAB-2000','front',1,{ready:true});
 const energy=occupy(s,1,'LAB-3000','energy',0);
 s=act(lab,s,legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 assert.equal(legal(lab,s).some(a=>a.uid===low.uid),false);
 assert.equal(legal(lab,s).some(a=>a.uid===energy.uid),false);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseTarget',uid:low.uid}),
  /Action not currently legal/);
 s=act(lab,s,{type:'chooseOptionalHandOutside',uid:spare.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(s.pending.kind,'effect-target');
 assert.deepEqual(s.pending.choices,[high.uid]);
 s=act(lab,s,{type:'chooseTarget',uid:high.uid});
 const live=uid=>[...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
 assert.equal(universalBp(lab,s,live(high.uid)),500);
 assert.equal(universalBp(lab,s,live(low.uid)),2000);
 assert.equal(universalBp(lab,s,live(energy.uid)),3000);
});

test('a successful payment with no legal front still moves the hand card',()=>{
 let {s}=open(24);
 const card=hold(s,0,'MHA-P-002');
 const spare=hold(s,0,'LAB-Y');
 occupy(s,1,'LAB-2000','front',0,{ready:true});
 s=act(lab,s,legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid));
 s=act(lab,s,{type:'chooseOptionalHandOutside',uid:spare.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
});

test('an empty hand does not ask for a payment',()=>{
 let {s}=open(25);
 const card=hold(s,0,'MHA-P-002');
 emptyHand(s,0,card.uid);
 s=act(lab,s,legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,0);
});

test('raiding the character replays its on-play in either order',()=>{
 let {s}=open(26);
 const base=occupy(s,0,'MHA-P-002','front',0,{ready:true});
 const raider=hold(s,0,'LAB-RAIDER');
 const spare=hold(s,0,'LAB-Y');
 const high=occupy(s,1,'LAB-2500','front',0,{ready:true});
 const deckBefore=s.players[0].deck.length;
 s=act(lab,s,legal(lab,s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid));
 assert.equal(s.pending.kind,'raid-effect-order');
 s=act(lab,s,{type:'chooseRaidOrder',mode:'baseFirst'});
 assert.equal(s.pending.kind,'effect-optional-hand-outside');
 assert.equal(s.players[0].deck.length,deckBefore);
 s=act(lab,s,{type:'chooseOptionalHandOutside',uid:spare.uid});
 s=act(lab,s,{type:'chooseTarget',uid:high.uid});
 const victim=s.players[1].front.find(c=>c?.uid===high.uid);
 assert.equal(universalBp(lab,s,victim),500);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].front[0].uid,raider.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);

 let later=open(27).s;
 const other=occupy(later,0,'MHA-P-002','front',0,{ready:true});
 const top=hold(later,0,'LAB-RAIDER');
 hold(later,0,'LAB-Y');
 const before=later.players[0].deck.length;
 const hand=later.players[0].hand.length;
 later=act(lab,later,legal(lab,later).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===other.uid));
 later=act(lab,later,{type:'chooseRaidOrder',mode:'entryFirst'});
 assert.equal(later.players[0].deck.length,before-1);
 assert.equal(later.players[0].hand.length,hand);
 assert.equal(later.pending.kind,'effect-optional-hand-outside');
});

test('base-first with no other hand card skips payment, and a silenced base does not replay',()=>{
 let {s}=open(28);
 const base=occupy(s,0,'MHA-P-002','front',0,{ready:true});
 const raider=hold(s,0,'LAB-RAIDER');
 emptyHand(s,0,raider.uid);
 const before=s.players[0].deck.length;
 s=act(lab,s,legal(lab,s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid));
 s=act(lab,s,{type:'chooseRaidOrder',mode:'baseFirst'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.players[0].hand.length,1);

 let quiet=open(29).s;
 const silenced=occupy(quiet,0,'MHA-P-002','front',0,{ready:true});
 const incoming=hold(quiet,0,'LAB-RAIDER');
 hold(quiet,0,'LAB-Y');
 grantContinuousState(quiet,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:silenced.uid,targetUid:silenced.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 const deck=quiet.players[0].deck.length;
 quiet=act(lab,quiet,legal(lab,quiet).find(a=>a.type==='raid'&&a.uid===incoming.uid&&a.baseUid===silenced.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deck-1);
 assert.equal(quiet.players[0].hand.some(c=>c.cardId==='LAB-Y'),true);
});

test('a different name is not a legal raid base',()=>{
 const {s}=open(30);
 occupy(s,0,'LAB-Y','front',0,{ready:true});
 const raider=hold(s,0,'LAB-RAIDER');
 assert.equal(legal(lab,s).some(a=>a.type==='raid'&&a.uid===raider.uid),false);
});
