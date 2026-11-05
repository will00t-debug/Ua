import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalActor} from '../dist/universal-v2/engine.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'LIFE-'+i,name:'LIFE '+i,color:'yellow',type:'character',
 energy:0,ap:1,bp:4000,gen:1,implementation:i===0?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{})
}));
const pack=createUniversalPack({id:'attacker-life-target',cards});
const packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function putAttacker(state,id){
 const player=state.players[0];
 const zones=['deck','hand','life','outside'];
 let physical;
 for(const zone of zones){
  const i=player[zone].findIndex(c=>c.cardId===id);
  if(i>=0){physical=player[zone].splice(i,1)[0];break;}
 }
 assert.ok(physical,'test attacker found');
 physical.ready=true;physical.fieldEntryStamp=state.nextFieldEntryStamp++;
 player.front[0]=physical;
 return physical;
}
function open(id='LIFE-1',targeting=true){
 let state=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:991,
  attackerChoosesLife:targeting});
 const attacker=putAttacker(state,id);
 state.phase='attack';
 assertUniversalMatch(packs,state);
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(state.pending.kind,'block');
 assert.equal(state.players[0].front[0].ready,false,'attack declaration must REST source');
 assert.equal(universalActor(state),1,'defender controls BLOCK');
 return state;
}

test('after declining BLOCK, attacker selects any face-down opponent LIFE slot',()=>{
 let state=open();
 const before=[...state.players[1].life];
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(state.pending.kind,'attack-life-target');
 assert.equal(state.pending.player,0,'attacker controls LIFE selection');
 assert.equal(state.pending.defender,1);
 assert.equal(state.pending.count,1);
 const view=universalPublicView(packs,state,0);
 assert.deepEqual(view.pending,{kind:'attack-life-target',player:0,defender:1,count:1});
 assert.equal(view.players[1].life,undefined,'hidden LIFE identities stay private');
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.length,before.length);
 assert.ok(legal.every(a=>a.type==='chooseAttackLife'&&a.indices.length===1));
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseAttackLife',indices:[3]},{actor:1}));
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseAttackLife',indices:[99]},{actor:0}));
 state=dispatchUniversalAction(packs,state,{type:'chooseAttackLife',indices:[3]},{actor:0});
 assert.equal(state.players[1].life.length,before.length-1);
 assert.equal(state.publicReveals.at(-1).uid,before[3].uid);
 assert.equal(assertUniversalMatch(packs,state),true);
});

test('DAMAGE 2 chooses two distinct LIFE positions atomically, then checks their triggers',()=>{
 let state=open('LIFE-0');
 const before=[...state.players[1].life];
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(state.pending.kind,'attack-life-target');
 assert.equal(state.pending.count,2);
 assert.equal(state.players[1].life.length,before.length,'choice happens before damage');
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.length,(before.length*(before.length-1))/2);
 assert.ok(legal.some(a=>JSON.stringify(a.indices)==='[1,5]'));
 for(const invalid of [[1,1],[5,1],[1],[1,2,3]]){
  assert.throws(()=>dispatchUniversalAction(packs,state,
   {type:'chooseAttackLife',indices:invalid},{actor:0}));
 }
 const beforeReveals=state.publicReveals.length;
 state=dispatchUniversalAction(packs,state,{type:'chooseAttackLife',indices:[1,5]},{actor:0});
 assert.equal(state.players[1].life.length,before.length-2);
 assert.deepEqual(state.publicReveals.slice(beforeReveals).map(r=>r.uid),
  [before[1].uid,before[5].uid],'reveals the exact chosen physical cards');
 assert.equal(state.lifeRevealBatch?.owner,1);
 assert.equal(assertUniversalMatch(packs,state),true);
});

test('legacy matches remain top-of-LIFE automatic until opt-in',()=>{
 let state=open('LIFE-1',false);
 const before=[...state.players[1].life];
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null},{actor:1});
 assert.notEqual(state.pending?.kind,'attack-life-target');
 assert.equal(state.players[1].life.length,before.length-1);
 assert.equal(state.publicReveals.at(-1).uid,before[0].uid);
 assert.equal(assertUniversalMatch(packs,state),true);
});

test('AI and online share tabletop while LIFE choices expose only public indices',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const desktop=read('dist/universal-v2/desktop-battle-ui.mjs');
 const solo=read('dist/universal-v2-preview.mjs');
 const online=read('dist/universal-v2/online-battle-ui.mjs');
 const server=read('server/domain.mjs');
 const css=read('dist/universal-v2-reference-table.css');
 assert.match(desktop,/v2-reference-table/);
 assert.match(desktop,/v2-life-rail/);
 assert.match(desktop,/v2-pile-rail/);
 assert.match(desktop,/v2-table-ap/);
 assert.match(desktop,/v2-life-target/);
 assert.match(desktop,/v2-life-confirm/);
 assert.match(solo,/lifeTargetActions:legal,onLifeTargetAction:applyAction/);
 assert.match(online,/lifeTargetActions:choices,onLifeTargetAction:action=>onAction\(action.index\)/);
 assert.match(online,/defender:relative\(view.pending.defender\)/);
 assert.match(server,/choice.indices=\[\.\.\.action.indices\]/);
 assert.match(css,/\.v2-life-selected/);
 assert.match(css,/\.v2-life-picker-slot/);
});
