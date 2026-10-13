import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_RED_BETA_PRESET,ttgExecutableActions,ttgFilteredActions,ttgActionLabel} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,ttgCoreAiChoice,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
// Real mobile buttons must be executable actions, not rule templates with missing AP/target choices.
test('TTG-1-081 player UI offers explicit legal target and physical AP, matching working AI match action',()=>{
 const deck={...TTG_RED_BETA_PRESET,'TTG-1-042':3,'TTG-1-081':1};
 let s=newTtgCoreMatch({decks:[deck,deck],seed:5081,first:0});
 let found=false;
 for(let step=0;step<3000&&s.status==='playing';step++){
  const ai=ttgCoreAiChoice(s),used=s.players[s.active].hand.find(c=>c.uid===ai?.handUid);
  if(used?.cardId==='TTG-1-081'&&ai.type==='playTtgEvent'){
   const matches=ttgExecutableActions(s).filter(a=>a.type==='playTtgEvent'&&a.handUid===ai.handUid);
   assert.ok(matches.length,'081 event must render at least one playable action');
   assert.ok(matches.every(a=>a.targetUid&&a.payApUids?.length===1&&!a.readyApUids?.length));
   assert.ok(matches.some(a=>a.targetUid===ai.targetUid));
   const fromUI=ttgFilteredActions(s,{kind:'playTtgEvent',limit:200}).actions.find(a=>a.handUid===ai.handUid&&a.targetUid===ai.targetUid);
   assert.ok(fromUI,'081 target appears in browser action list');
   assert.match(ttgActionLabel(s,fromUI),/巨鑽爆破|ギガドリルブレイク|081/);
   const clicked=JSON.parse(decodeURIComponent(encodeURIComponent(JSON.stringify(fromUI))));
   const next=dispatchTtgCoreAction(s,clicked);
   assert.ok(assertTtgCoreState(next));
   assert.ok(next.players[s.active].outside.some(c=>c.uid===used.uid),'081 event must be physically spent');
   found=true;break;
  }
  s=dispatchTtgCoreAction(s,ai);
 }
 assert.equal(found,true,'deterministic 081 targeted-event scenario must be visited');
});
test('TTG-1-078/079 event templates expose AP-ready choices and pay exactly one AP',()=>{
 const deck={...TTG_RED_BETA_PRESET};
 const s=newTtgCoreMatch({decks:[deck,deck],seed:912,first:0});
 // Directly create a physically consistent hand/energy state, without conjuring copies.
 s.phase='main';let pl=s.players[0];
 const move=id=>{for(const zone of ['hand','deck','life']){let i=pl[zone].findIndex(c=>c.cardId===id);if(i>=0)return pl[zone].splice(i,1)[0];}throw Error('missing event '+id);};
 for(const id of ['TTG-1-078','TTG-1-079']){const c=move(id);pl.hand.push(c);}
 const generator=move('TTG-1-042');generator.ready=true;pl.energy[0]=generator;
 generator.energyBonus=4;
 pl.energyProduced.red=5;
 pl.apCards[0].ready=true;
 const offered=ttgExecutableActions(s).filter(a=>a.type==='playTtgEvent'&&[...pl.hand].some(c=>c.uid===a.handUid&&['TTG-1-078','TTG-1-079'].includes(c.cardId)));
 assert.ok(offered.length>=2);
 assert.ok(offered.every(a=>a.payApUids?.length===1&&Array.isArray(a.readyApUids)));
 for(const act of offered){
  const next=dispatchTtgCoreAction(s,act);assert.ok(assertTtgCoreState(next));
 }
});
