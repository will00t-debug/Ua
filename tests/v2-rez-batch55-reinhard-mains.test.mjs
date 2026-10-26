import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-047','REZ-2-055','REZ-2-056','REZ-2-014','REZ-2-066','REZ-2-049',
 'REZ-2-043','REZ-2-041','REZ-2-060','REZ-2-035','REZ-2-033','REZ-2-050','REZ-2-042'
],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}

test('REZ-2-047 draws per copy and shares the green hand trigger by name',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-047'].effectJa,/\[インパクト（1）\]/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-047'].note,/Q2418/);
 assert.equal(rez.cards['REZ-2-047'].printedImpact,1);
 let s=fresh(deck,2047);
 const first=sit(s,0,'REZ-2-047','front',0);
 const second=sit(s,0,'REZ-2-047','front',1);
 const energyCopy=sit(s,0,'REZ-2-047','energy',0);
 const green=take(s,0,'REZ-2-055');
 const blank=take(s,0,'REZ-2-056');
 const blue=take(s,0,'REZ-2-014');
 s.players[0].hand.push(green,blank,blue);
 s=toPhase(rezPacks,s,'main');
 const before=s.players[0].hand.length;
 const draw=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='frontDraw');
 s=dispatchUniversalAction(rezPacks,s,draw,{actor:0});
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===first.uid&&a.mode==='frontDraw'),false);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.uid===second.uid&&a.mode==='frontDraw'));
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===energyCopy.uid&&a.mode==='frontDraw'),false);
 const trigger=legalUniversalActions(rezPacks,s).filter(a=>a.mode==='handTrigger');
 assert.deepEqual(trigger.map(a=>a.uid).sort(),[first.uid,second.uid].sort());
 s=dispatchUniversalAction(rezPacks,s,trigger.find(a=>a.uid===first.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-hand-trigger-card');
 const offered=legalUniversalActions(rezPacks,s).map(a=>a.uid);
 assert.ok(offered.includes(green.uid));
 assert.ok(offered.includes(blank.uid));
 assert.equal(offered.includes(blue.uid),false);
 const quiet=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseHandTriggerCard',uid:blank.uid},{actor:0});
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===blank.uid));
 assert.equal(legalUniversalActions(rezPacks,quiet).some(a=>a.mode==='handTrigger'),false);
 assert.ok(legalUniversalActions(rezPacks,quiet).some(a=>a.uid===second.uid&&a.mode==='frontDraw'));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandTriggerCard',uid:green.uid},{actor:0});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'draw');
 assert.ok(s.players[0].outside.some(c=>c.uid===green.uid));
 const hand=s.players[0].hand.length;
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skipped.players[0].hand.length,hand);
 assert.equal(skipped.pending,null);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'draw'},{actor:0});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='handTrigger'),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,quiet),true);
 assert.equal(assertUniversalMatch(rezPacks,skipped),true);
});

test('REZ-2-047 Impact 1 damages life only after winning a battle',()=>{
 let s=fresh(deck,3047);
 const attacker=sit(s,0,'REZ-2-047','front',0);
 const wall=sit(s,1,'REZ-2-014','front',0);
 const quiet=take(s,1,'REZ-2-056');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(quiet);
 s=toPhase(rezPacks,s,'attack');
 const life=s.players[1].life.length;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 const blocked=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(blocked.players[1].front[0],null);
 assert.equal(blocked.players[1].life.length,life-1);
 assert.equal(blocked.pending,null);
 const open=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(open.players[1].life.length,life-1);
 assert.equal(open.pending,null);
 assert.throws(()=>createUniversalPack({id:'bad-047',cards:[{
  id:'X',name:'ラインハルト・ヴァン・アストレア',color:'green',type:'character',
  energy:8,ap:1,bp:5000,gen:1,trigger:'get',implementation:'dsl',effects:{},
  printedImpact:2
 }]}),/IMPACT|printed/);
 assert.throws(()=>createUniversalPack({id:'bad-047b',cards:[{
  id:'X',name:'ラインハルト・ヴァン・アストレア',color:'green',type:'character',
  energy:8,ap:1,bp:5000,gen:1,trigger:'get',implementation:'dsl',effects:{},
  mainAbility:{op:'frontDrawOrHandTrigger',frontOnly:false,drawOnce:'card',
   triggerOnce:'name',handColor:'green'}
 }]}),/unsupported main/);
 assert.equal(assertUniversalMatch(rezPacks,blocked),true);
 assert.equal(assertUniversalMatch(rezPacks,open),true);
});
