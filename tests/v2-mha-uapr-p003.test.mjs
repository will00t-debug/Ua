// UAPR/MHA-P-003 ホークス. Impact null, optional facedown, and the self-only look.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lab,match,hold,occupy,take,toMain,act,legal} from './v2-mha-uapr-lab.mjs';
import {universalImpactNull,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {uiCardLabel} from '../dist/universal-v2/preview-actions.mjs';

const NEED=['MHA-P-003','LAB-R','LAB-HAWKS','LAB-Y','LAB-FILL-0','LAB-FILL-1','LAB-HIT'];

function open(seed){
 const game=match(seed,NEED);
 game.s=toMain(lab,game.s);
 return game;
}
function enter(s){
 const card=hold(s,0,'MHA-P-003');
 occupy(s,0,'LAB-R','energy',0);
 const action=legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 return {card,s:act(lab,s,action)};
}
function parkDeck(s,p,leave){
 const deck=s.players[p].deck;
 while(deck.length>leave)s.players[p].outside.push(deck.pop());
}

test('skipping the tuck does not look at the deck',()=>{
 let {s}=open(41);
 hold(s,0,'LAB-Y');
 ({s}=enter(s));
 const before=s.players[0].deck.length;
 assert.equal(s.pending.kind,'effect-tuck-facedown');
 assert.equal(s.pending.step,'card');
 s=act(lab,s,{type:'chooseTuckFacedown',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
});

test('tucking under this Hawks looks at two cards and can take one or none',()=>{
 let {s}=open(42);
 const spare=hold(s,0,'LAB-Y');
 const first=take(s,0,'LAB-FILL-0');
 const second=take(s,0,'LAB-FILL-1');
 s.players[0].deck.unshift(first,second);
 ({s}=enter(s));
 const hawks=s.players[0].front.find(c=>c?.cardId==='MHA-P-003');
 assert.equal(universalImpactNull(lab,s,hawks),true);
 s=act(lab,s,{type:'chooseTuckFacedown',uid:spare.uid});
 assert.equal(s.pending.kind,'effect-top-take-one');
 assert.deepEqual(s.pending.uids,[first.uid,second.uid]);
 assert.equal(legal(lab,s).some(a=>a.type==='chooseTopTakeOne'&&a.uid===null),true);
 s=act(lab,s,{type:'chooseTopTakeOne',uid:second.uid});
 const host=s.players[0].front.find(c=>c?.uid===hawks.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===second.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(host.under.some(c=>c.uid===spare.uid&&c.faceDown===true),true);
 assert.equal(uiCardLabel(lab,s,spare.uid),'黃能源');

 let none=open(43).s;
 const pay=hold(none,0,'LAB-Y');
 const top=take(none,0,'LAB-FILL-0');
 const next=take(none,0,'LAB-FILL-1');
 none.players[0].deck.unshift(top,next);
 ({s:none}=enter(none));
 none=act(lab,none,{type:'chooseTuckFacedown',uid:pay.uid});
 none=act(lab,none,{type:'chooseTopTakeOne',uid:null});
 assert.equal(none.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(none.players[0].outside.some(c=>c.uid===next.uid),true);
 assert.equal(none.players[0].hand.some(c=>c.uid===top.uid||c.uid===next.uid),false);
});

test('tucking under a different Hawks does not look, and the host step can be skipped',()=>{
 let {s}=open(44);
 const spare=hold(s,0,'LAB-Y');
 const other=occupy(s,0,'LAB-HAWKS','front',1,{ready:true});
 ({s}=enter(s));
 const before=s.players[0].deck.length;
 assert.equal(s.pending.step,'host');
 s=act(lab,s,{type:'chooseTuckFacedown',uid:other.uid});
 s=act(lab,s,{type:'chooseTuckFacedown',uid:spare.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
 const host=s.players[0].front.find(c=>c?.uid===other.uid);
 assert.equal(host.under.some(c=>c.uid===spare.uid&&c.faceDown===true),true);
 assert.equal(uiCardLabel(lab,s,spare.uid),'黃能源');

 let skipped=open(45).s;
 hold(skipped,0,'LAB-Y');
 occupy(skipped,0,'LAB-HAWKS','front',1,{ready:true});
 ({s:skipped}=enter(skipped));
 assert.equal(skipped.pending.step,'host');
 skipped=act(lab,skipped,{type:'chooseTuckFacedown',uid:null});
 assert.equal(skipped.pending,null);
});

test('no hand card, an empty deck, and a one-card deck stay inside the printed window',()=>{
 let {s}=open(46);
 const card=hold(s,0,'MHA-P-003');
 const hand=s.players[0].hand;
 for(let i=hand.length-1;i>=0;i--){
  if(hand[i].uid!==card.uid)s.players[0].deck.push(hand.splice(i,1)[0]);
 }
 occupy(s,0,'LAB-R','energy',0);
 s=act(lab,s,legal(lab,s).find(a=>a.type==='play'&&a.uid===card.uid));
 assert.equal(s.pending,null);

 let bare=open(47).s;
 const pay=hold(bare,0,'LAB-Y');
 parkDeck(bare,0,0);
 ({s:bare}=enter(bare));
 bare=act(lab,bare,{type:'chooseTuckFacedown',uid:pay.uid});
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].deck.length,0);

 let one=open(48).s;
 const cost=hold(one,0,'LAB-Y');
 const only=take(one,0,'LAB-FILL-0');
 one.players[0].deck.unshift(only);
 parkDeck(one,0,1);
 ({s:one}=enter(one));
 one=act(lab,one,{type:'chooseTuckFacedown',uid:cost.uid});
 assert.deepEqual(one.pending.uids,[only.uid]);
 one=act(lab,one,{type:'chooseTopTakeOne',uid:null});
 assert.equal(one.players[0].outside.some(c=>c.uid===only.uid),true);
 assert.equal(one.players[0].hand.some(c=>c.uid===only.uid),false);
});

test('a hand card that is not a legal tuck and a foreign host are rejected',()=>{
 let {s}=open(49);
 const spare=hold(s,0,'LAB-Y');
 const other=occupy(s,0,'LAB-HAWKS','front',1,{ready:true});
 ({s}=enter(s));
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseTuckFacedown',uid:'0-nope'}),
  /Action not currently legal/);
 s=act(lab,s,{type:'chooseTuckFacedown',uid:other.uid});
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseTuckFacedown',uid:other.uid}),
  /Action not currently legal/);
 assert.equal(spare.cardId,'LAB-Y');
});

test('impact null stops the attacker impact when Hawks loses the battle',()=>{
 let {s}=open(50);
 const attacker=occupy(s,0,'LAB-HIT','front',0,{ready:true});
 const wall=occupy(s,1,'MHA-P-003','front',0,{ready:true});
 s=act(lab,s,{type:'next'});
 const life=s.players[1].life.length;
 s=act(lab,s,{type:'attack',uid:attacker.uid});
 s=act(lab,s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
});
