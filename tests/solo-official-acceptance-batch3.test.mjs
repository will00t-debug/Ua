import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloMatchBp,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

// Verified against official Japanese card fronts:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-008
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-009
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-010
const deck=id=>({...SOLO_SHADOW_TRAINING_PRESET,...(id==='008'?{'SLG-1-009':0,'SLG-1-008':4}:{})});
const game=id=>newSoloTrainingMatch({decks:[deck(id),deck(id)],seed:721,first:0});
function pull(pl,id){for(const z of ['hand','deck','life']){const idx=pl[z].findIndex(x=>x.cardId===id);if(idx>=0)return pl[z].splice(idx,1)[0];}throw Error('missing card '+id);}
function choose(s,f){const action=soloTrainingLegalActions(s).find(f);assert.ok(action,'expected action');return soloTrainingDispatch(s,action);}

test('SLG-1-008: mandatory printed search resolves legal top-4 pickup, ordered bottom 3, then discard exactly one',()=>{
 let s=game('008'),p=s.players[0];s.phase='main';p.maxAp=3;p.ap=3;
 const source=pull(p,'SLG-1-008');p.hand.push(source);
 const e=pull(p,'SLG-1-006');Object.assign(e,{owner:0,line:'energy',slot:0,ready:true});p.energy[0]=e;
 const sung=pull(p,'SLG-1-015');p.deck.unshift(sung);
 s=choose(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending?.kind,'slgSearch');assert.equal(s.pending.topUids.length,4);
 assert.ok(s.pending.eligible.includes(sung.uid));
 const afterPlay=s.players[0].hand.length,outBefore=s.players[0].outside.length;
 const pick=soloTrainingLegalActions(s).find(a=>Array.isArray(a.picks)&&a.picks.length===1&&a.picks[0]===sung.uid);
 assert.ok(pick);
 s=soloTrainingDispatch(s,pick);
 assert.equal(s.pending?.kind,'slgDiscard');
 assert.equal(s.players[0].hand.length,afterPlay+1);
 assert.ok(s.players[0].hand.some(x=>x.uid===sung.uid));
 s=choose(s,a=>a.type==='choose'&&a.uid!==sung.uid);
 assert.equal(s.pending,null);assert.equal(s.players[0].hand.length,afterPlay);
 assert.equal(s.players[0].outside.length,outBefore+1);
 assert.ok(assertSoloTrainingMatch(s));
});

test('SLG-1-009: Main action requires a real hand discard; cost grants 1500 BP and same copy cannot reactivate this turn',()=>{
 let s=game('009'),p=s.players[0];s.phase='main';
 const shizuku=pull(p,'SLG-1-009');Object.assign(shizuku,{owner:0,line:'front',slot:0,ready:false});p.front[0]=shizuku;
 const before=p.hand.length,discard=p.outside.length;
 assert.equal(soloMatchBp(s,shizuku),1500);
 s=choose(s,a=>a.type==='ability'&&a.uid===shizuku.uid);
 assert.equal(s.pending?.kind,'mainDiscard');
 s=choose(s,a=>a.type==='choose'&&a.uid!=null);
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(s.players[0].outside.length,discard+1);
 assert.equal(soloMatchBp(s,s.players[0].front[0]),3000);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===shizuku.uid),false);
 assert.ok(assertSoloTrainingMatch(s));
});

test('SLG-1-010: 9 -> 10 physical outside cards gates +1000 BP only during controller turn',()=>{
 const s=game('010'),p=s.players[0];
 const shizuku=pull(p,'SLG-1-010');Object.assign(shizuku,{owner:0,line:'front',slot:0,ready:true});p.front[0]=shizuku;
 assert.equal(soloMatchBp(s,shizuku),3000);
 for(let i=0;i<9;i++)p.outside.push(p.deck.shift());
 assert.equal(soloMatchBp(s,shizuku),3000);
 p.outside.push(p.deck.shift());
 assert.equal(soloMatchBp(s,shizuku),4000);
 s.active=1;
 assert.equal(soloMatchBp(s,shizuku),3000);
 assert.ok(assertSoloTrainingMatch(s));
});
