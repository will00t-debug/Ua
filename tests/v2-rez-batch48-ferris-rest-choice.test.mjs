import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-016','REZ-2-020','REZ-2-014','REZ-2-015','REZ-2-033','REZ-2-035',
 'REZ-2-040','REZ-2-041','REZ-2-042','REZ-2-046','REZ-2-049','REZ-2-055','REZ-2-056'
],'REZ-2-014');

test('REZ-2-016 actives on energy only while Crusch is on the field',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-016'].effectJa,/エナジーLにある場合/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-016'].effectJa,/〈クルシュ・カルステン〉がある場合、このキャラをアクティブにする/);
 assert.equal(rez.cards['REZ-2-016'].effects.onPlay[0].op,'activeSelfIf');
 let s=fresh(deck,3016);
 const blue=['REZ-2-020','REZ-2-014'];
 for(let i=0;i<2;i++){
  const gen=take(s,0,blue[i]);gen.ready=true;s.players[0].energy[i]=gen;
 }
 const ferris=take(s,0,'REZ-2-016');s.players[0].hand.push(ferris);
 s=toPhase(rezPacks,s,'main');
 const front=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===ferris.uid&&a.line==='front');
 let stayed=dispatchUniversalAction(rezPacks,structuredClone(s),front,{actor:0});
 assert.equal(stayed.players[0].front.find(c=>c?.uid===ferris.uid).ready,false);
 const energy=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===ferris.uid&&a.line==='energy');
 s=dispatchUniversalAction(rezPacks,s,energy,{actor:0});
 assert.equal(s.players[0].energy.find(c=>c?.uid===ferris.uid).ready,true);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-016 rests and buffs another character, or reveals a hand card to the bottom',()=>{
 let s=fresh(deck,3017);
 const ferris=take(s,0,'REZ-2-016');ferris.ready=true;s.players[0].front[0]=ferris;
 const ally=take(s,0,'REZ-2-014');ally.ready=true;s.players[0].front[1]=ally;
 const foe=take(s,1,'REZ-2-014');foe.ready=true;s.players[1].front[0]=foe;
 const low=take(s,0,'REZ-2-014');s.players[0].hand.push(low);
 const high=take(s,0,'REZ-2-020');s.players[0].hand.push(high);
 s=toPhase(rezPacks,s,'main');
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===ferris.uid&&a.mode==='restSelfChoose');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['bottom','buff']);
 let buffed=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseEffectMode',mode:'buff'},{actor:0});
 assert.equal(buffed.pending.kind,'effect-buff-any');
 assert.equal(buffed.pending.choices.includes(ferris.uid),false);
 assert.ok(buffed.pending.choices.includes(foe.uid));
 assert.throws(()=>dispatchUniversalAction(rezPacks,buffed,{type:'chooseAnyBuff',uid:ferris.uid},{actor:0}),/not currently legal/);
 buffed=dispatchUniversalAction(rezPacks,buffed,{type:'chooseAnyBuff',uid:ally.uid},{actor:0});
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front[1]),3000);
 assert.equal(buffed.pending,null);
 const before=s.players[0].hand.length;
 const top=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'bottom'},{actor:0});
 assert.equal(s.pending.kind,'effect-reveal-bottom');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRevealBottom',uid:low.uid},{actor:0});
 assert.equal(s.players[0].deck.at(-1).uid,low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===top),false);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.bp,2000);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAnyBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[0].front[1]),2000);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before-1);
 s.players[0].front[0].ready=true;
 const again=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===ferris.uid);
 s=dispatchUniversalAction(rezPacks,s,again,{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'bottom'},{actor:0});
 const handBefore=s.players[0].hand.length;
 const drawn=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRevealBottom',uid:high.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn));
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.bp,2000);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAnyBuff',uid:foe.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.bp,1000);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAnyBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[1].front[0]),4000);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
