import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloEnergy,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';

// Official UA51BT/SLG-1-014: after own-effect recovery from outside to hand,
// may enter own ENERGY line REST without paying AP / energy; cannot enter or
// move to FRONT, including replacement/movement (official FAQ Q2025).
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-014
// Also verifies official 015 vanilla GET and 016 Impact-Null, on-entry mill 2.
const counts={...SOLO_SHADOW_TRAINING_PRESET};
for(const id of ['001','009','010','029','031'])delete counts['SLG-1-'+id];
for(const id of ['014','037','026','012','016'])counts['SLG-1-'+id]=4;
const print=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
function take(p,id){
 const actual='SLG-1-'+id;
 for(const area of ['hand','deck','life']){const i=p[area].findIndex(c=>c.cardId===actual);if(i>=0)return p[area].splice(i,1)[0];}
 throw Error('missing card '+actual);
}
function game(){
 const s=newSoloTrainingMatch({decks:[counts,counts],first:0,seed:14014});
 s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;
 const p=s.players[0];
 for(let i=0;i<2;i++){
  const c=take(p,'006');Object.assign(c,{owner:0,line:'energy',slot:i,ready:true});p.energy[i]=c;
 }
 assert.equal(soloEnergy(s,0),4);
 return s;
}
function choose(s,pred){
 const a=soloTrainingLegalActions(s).find(pred);assert.ok(a,'expected a real legal action');
 return soloTrainingDispatch(s,a);
}
function recovered(){
 let s=game(),p=s.players[0];
 const satoko=take(p,'014');p.outside.push(satoko);
 const potion=take(p,'037');p.hand.push(potion);
 s=choose(s,a=>a.type==='playEvent'&&a.uid===potion.uid);
 assert.equal(s.pending?.kind,'eventRecover');
 s=choose(s,a=>a.type==='choose'&&a.uid===satoko.uid);
 assert.equal(s.pending?.kind,'slgRecoveredDeploy');
 assert.ok(s.players[0].hand.some(x=>x.uid===satoko.uid));
 return {s,uid:satoko.uid};
}
test('014 own-effect recovery offers optional free REST placement in ENERGY ONLY; real entry mills exactly 1',()=>{
 const {s,uid}=recovered(),p=s.players[0],ap=p.ap;
 const legal=soloTrainingLegalActions(s);
 assert.ok(legal.some(a=>a.uid===null));
 assert.ok(legal.some(a=>a.uid===uid&&a.line==='energy'));
 assert.ok(!legal.some(a=>a.uid===uid&&a.line==='front'));
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',uid,line:'front',slot:2}),/illegal/i);
 const beforeDeck=p.deck.length,beforeOutside=p.outside.length;
 const placed=choose(s,a=>a.uid===uid&&a.line==='energy'&&a.slot===2);
 assert.equal(placed.players[0].energy[2].uid,uid);
 assert.equal(placed.players[0].energy[2].ready,false);
 assert.equal(placed.players[0].ap,ap);
 assert.equal(placed.players[0].deck.length,beforeDeck-1);
 assert.equal(placed.players[0].outside.length,beforeOutside+1);
 assert.ok(assertSoloTrainingMatch(placed));
 const skipped=choose(s,a=>a.uid===null);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===uid));
 assert.equal(skipped.players[0].deck.length,beforeDeck);
 assert.equal(skipped.players[0].energy[2],null);
 assert.ok(assertSoloTrainingMatch(skipped));
});
test('014 recovery itself does not require printed energy (only ordinary AP-paid play does)',()=>{
 const {s,uid}=recovered(),p=s.players[0];
 for(let i=0;i<2;i++){p.outside.push(p.energy[i]);p.energy[i]=null;}
 assert.equal(soloEnergy(s,0),0);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===uid&&a.line==='energy'));
 const next=choose(s,a=>a.uid===uid&&a.line==='energy');
 assert.equal(next.players[0].energy[0].ready,false);
 assert.ok(assertSoloTrainingMatch(next));
});
test('014 ordinary entry is energy-only, movement to front prohibited by Q2025',()=>{
 let s=game(),p=s.players[0];
 const c=take(p,'014');p.hand.push(c);
 const play=soloTrainingLegalActions(s).filter(x=>x.type==='play'&&x.uid===c.uid);
 assert.ok(play.length>0);
 assert.ok(play.every(x=>x.line==='energy'));
 const old=p.deck.length;
 s=choose(s,a=>a.type==='play'&&a.uid===c.uid&&a.line==='energy'&&a.slot===2);
 assert.equal(s.players[0].deck.length,old-1);
 assert.equal(s.players[0].energy[2].ready,false);
 s.phase='move';
 assert.ok(!soloTrainingLegalActions(s).some(a=>a.type==='move'&&a.uid===c.uid));
 assert.ok(assertSoloTrainingMatch(s));
});
test('015 ordinary character has no printed ability and GET trigger; 016 mills exactly 2 on AP-paid entry',()=>{
 let s=game(),p=s.players[0];const c=print['SLG-1-015'],d=print['SLG-1-016'];
 assert.equal(c.energy,0);assert.equal(c.bp,1500);assert.equal(c.trigger,'get');assert.equal(c.effect,'無印刷角色能力。');
 assert.equal(d.energy,3);assert.equal(d.bp,3000);assert.equal(d.gen,2);assert.equal(d.trigger,null);
 const sung=take(p,'016');p.hand.push(sung);
 const deckSize=p.deck.length,oldOutside=p.outside.length;
 s=choose(s,a=>a.type==='play'&&a.uid===sung.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.players[0].front[0].uid,sung.uid);
 assert.equal(s.players[0].deck.length,deckSize-2);
 assert.equal(s.players[0].outside.length,oldOutside+2);
 assert.ok(assertSoloTrainingMatch(s));
});
