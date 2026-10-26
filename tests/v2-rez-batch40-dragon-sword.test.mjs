import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-073'],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}

test('REZ-2-073 retires any front character, and playing it does not active Reinhard',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-073'].effectJa,/相手のフロントLのキャラを1枚選び、退場させる/);
 assert.equal(rez.cards['REZ-2-073'].effects.onPlay[0].op,'retireOppFrontOne');
 assert.equal(rez.cards['REZ-2-073'].triggerEffect.op,'retireOppFront');
 let s=fresh(deck,2073);
 s=toPhase(rezPacks,s,'main');
 const otto=sit(s,0,'REZ-2-033','energy',0);otto.ready=true;
 const second=sit(s,0,'REZ-2-033','energy',1);
 sit(s,0,'REZ-2-055','energy',2);
 sit(s,0,'REZ-2-055','energy',3);
 const rein=sit(s,0,'REZ-2-046','front',0);rein.ready=false;
 const event=take(s,0,'REZ-2-073');s.players[0].hand.push(event);
 const wall=sit(s,1,'REZ-2-046','front',0);wall.buffs=[{bp:2000,untilTurn:s.turn}];
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.ok(s.pending.choices.includes(wall.uid));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRetireBp',uid:wall.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].ready,false);
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(second.cardId,'REZ-2-033');
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('a green Reinhard own-effect discard can active one Reinhard',()=>{
 let s=fresh(deck,3073);
 s=toPhase(rezPacks,s,'main');
 for(let i=0;i<4;i++)sit(s,0,'REZ-2-055','energy',i);
 const rein=take(s,0,'REZ-2-046');s.players[0].hand.push(rein);
 const dragon=take(s,0,'REZ-2-073');s.players[0].hand.push(dragon);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===rein.uid&&a.line==='front'),{actor:0});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].front[0].ready,false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:dragon.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-active-own-named');
 assert.ok(s.pending.choices.includes(rein.uid));
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseActiveOwnNamed',uid:null},{actor:0});
 assert.equal(skipped.players[0].front[0].ready,false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseActiveOwnNamed',uid:rein.uid},{actor:0});
 assert.equal(s.players[0].front[0].ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===dragon.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,skipped),true);
});
