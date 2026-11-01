import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
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

test('REZ-2-047 discarding Dragon Sword can stand that Reinhard after the trigger',()=>{
 const combo=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'&&id!=='REZ-2-014'),
  'REZ-2-047','REZ-2-073'],'REZ-2-056');
 let s=fresh(combo,4073);
 s=toPhase(rezPacks,s,'main');
 for(let i=0;i<3;i++)sit(s,0,'REZ-2-055','energy',i);
 const rein=sit(s,0,'REZ-2-047','front',0);rein.ready=false;
 const bench=sit(s,0,'REZ-2-047','energy',3);bench.ready=false;
 const dragon=take(s,0,'REZ-2-073');s.players[0].hand.push(dragon);
 const other=take(s,0,'REZ-2-055');s.players[0].hand.push(other);
 const wall=sit(s,1,'REZ-2-033','front',0);
 const activate=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='activate'&&a.uid===rein.uid&&a.mode==='handTrigger');
 s=dispatchUniversalAction(rezPacks,s,activate,{actor:0});
 assert.equal(s.pending.kind,'effect-hand-trigger-card');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandTriggerCard',uid:dragon.uid},{actor:0});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 assert.equal(s.players[0].front[0].ready,false);
 const retired=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseTrigger',mode:'special',uid:wall.uid},{actor:0});
 assert.ok(retired.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(retired.pending.kind,'effect-active-own-named');
 assert.ok(retired.pending.choices.includes(rein.uid));
 assert.ok(retired.pending.choices.includes(bench.uid));
 const stand=legalUniversalActions(rezPacks,retired).find(a=>
  a.type==='chooseActiveOwnNamed'&&a.uid===rein.uid);
 assert.equal(uiActionLabel(stand,{pack:rez,state:retired}),'將 ラインハルト・ヴァン・アストレア 轉為 ACTIVE');
 const stood=dispatchUniversalAction(rezPacks,retired,
  {type:'chooseActiveOwnNamed',uid:rein.uid},{actor:0});
 assert.equal(stood.players[0].front[0].ready,true);
 assert.equal(stood.players[0].energy[3].ready,false);
 assert.equal(stood.pending,null);
 const skipped=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skipped.pending.kind,'effect-active-own-named');
 assert.ok(skipped.pending.choices.includes(rein.uid));
 const declined=dispatchUniversalAction(rezPacks,skipped,
  {type:'chooseActiveOwnNamed',uid:null},{actor:0});
 assert.equal(declined.players[0].front[0].ready,false);
 assert.equal(declined.pending,null);
 let plain=fresh(combo,5073);
 plain=toPhase(rezPacks,plain,'main');
 for(let i=0;i<4;i++)sit(plain,0,'REZ-2-055','energy',i);
 const quiet=sit(plain,0,'REZ-2-047','front',0);quiet.ready=false;
 const filler=take(plain,0,'REZ-2-056');plain.players[0].hand.push(filler);
 plain=dispatchUniversalAction(rezPacks,plain,legalUniversalActions(rezPacks,plain).find(a=>
  a.type==='activate'&&a.uid===quiet.uid&&a.mode==='handTrigger'),{actor:0});
 plain=dispatchUniversalAction(rezPacks,plain,{type:'chooseHandTriggerCard',uid:filler.uid},{actor:0});
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].front[0].ready,false);
 assert.equal(assertUniversalMatch(rezPacks,stood),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,plain),true);
});
