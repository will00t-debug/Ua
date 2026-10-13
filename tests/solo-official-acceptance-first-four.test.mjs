import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {
 SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,
 soloTrainingDispatch,soloMatchBp,soloEnergy,assertSoloTrainingMatch
} from '../dist/solo-match.mjs';

// First direct official-card acceptance batch; these cases do NOT establish
// full 80-card official certification or authorized image reproduction.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-001
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-002
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-005
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-006
const by=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const match=(deck=SOLO_SHADOW_TRAINING_PRESET)=>newSoloTrainingMatch({decks:[deck,deck],first:0,seed:403});
function take(p,id){
 for(const z of ['hand','deck','life']){
  const i=p[z].findIndex(c=>c.cardId===id);
  if(i>=0)return p[z].splice(i,1)[0];
 }
 throw Error('card unavailable in fixture '+id);
}
function place(s,id,line='front',slot=0,ready=true){
 const c=take(s.players[0],id);
 Object.assign(c,{owner:0,line,slot,ready});
 s.players[0][line][slot]=c;
 return c;
}
function moveHand(s,id){
 const card=take(s.players[0],id);s.players[0].hand.push(card);return card;
}
const action=(s,fn)=>{const a=soloTrainingLegalActions(s).find(fn);assert.ok(a,'expected legal action');return a;};

test('SLG-1-001 official BP: threshold >=5 outside, only during its owner turn',()=>{
 let s=match(),c=place(s,'SLG-1-001');
 const p=s.players[0];
 assert.equal(by['SLG-1-001'].bp,2500);
 assert.equal(soloMatchBp(s,c),2500);
 for(let i=0;i<4;i++)p.outside.push(p.deck.shift());
 assert.equal(soloMatchBp(s,c),2500,'4 cards not enough');
 p.outside.push(p.deck.shift());
 assert.equal(soloMatchBp(s,c),3000,'5 cards grant 500BP');
 s.active=1;
 assert.equal(soloMatchBp(s,c),2500,'not active on opponent turn');
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-002 official entry: draw 1 and discard exactly 1 as chosen',()=>{
 const deck={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-009':0,'SLG-1-002':4};
 let s=match(deck);s.phase='main';s.players[0].maxAp=3;s.players[0].ap=3;
 const c=moveHand(s,'SLG-1-002');
 s=soloTrainingDispatch(s,action(s,a=>a.type==='play'&&a.uid===c.uid&&a.line==='energy'&&a.slot===0));
 assert.equal(s.pending?.kind,'entry002Mode');
 let hand=s.players[0].hand.length;
 const outside=s.players[0].outside.length;
 s=soloTrainingDispatch(s,action(s,a=>a.mode==='drawDiscard'));
 assert.equal(s.pending?.kind,'entry002Discard');
 assert.equal(s.players[0].hand.length,hand+1);
 s=soloTrainingDispatch(s,action(s,a=>a.type==='choose'&&a.uid!=null));
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].outside.length,outside+1);
 assert.equal(s.pending,null);
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-002 official entry alternative: another character gets 1000 BP, self excluded',()=>{
 const deck={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-009':0,'SLG-1-002':4};
 let s=match(deck);s.phase='main';s.players[0].maxAp=3;s.players[0].ap=3;
 const target=place(s,'SLG-1-001','front',0,true);
 const card=moveHand(s,'SLG-1-002');
 s=soloTrainingDispatch(s,action(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy'&&a.slot===0));
 s=soloTrainingDispatch(s,action(s,a=>a.mode==='buff'));
 assert.equal(s.pending.kind,'entry002Buff');
 const choices=soloTrainingLegalActions(s);
 assert.ok(choices.some(x=>x.uid===target.uid),'other own character eligible');
 assert.ok(!choices.some(x=>x.uid===card.uid),'never self');
 s=soloTrainingDispatch(s,action(s,a=>a.uid===target.uid));
 assert.equal(soloMatchBp(s,s.players[0].front[0]),3500);
 assert.equal(s.pending,null);
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-005 official vanilla character: no printed character effect, DRAW trigger recorded',()=>{
 const d=by['SLG-1-005'];
 assert.equal(d.energy,0);assert.equal(d.ap,1);assert.equal(d.bp,2000);
 assert.equal(d.gen,1);assert.equal(d.trigger,'draw');
 assert.equal(d.effect,'無印刷角色能力。');
 assert.equal(d.type,'character');
});
test('SLG-1-006 official bonus energy only while ACTIVE',()=>{
 const s=match(),c=place(s,'SLG-1-006','energy',0,false);
 assert.equal(by['SLG-1-006'].energy,2);
 assert.equal(by['SLG-1-006'].gen,1);
 assert.equal(soloEnergy(s,0),1);
 c.ready=true;
 assert.equal(soloEnergy(s,0),2,'ACTIVE generates additional purple energy');
 c.ready=false;
 assert.equal(soloEnergy(s,0),1,'REST must not produce extra');
 assert.ok(assertSoloTrainingMatch(s));
});
