import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloMatchBp,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

// Regression tests derived from official UA51BT FAQs:
// https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT
const deck=add=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-009':0,...add});
const game=(x=SOLO_SHADOW_TRAINING_PRESET)=>{const s=newSoloTrainingMatch({decks:[x,x],seed:305,first:0});s.phase='attack';return s;};
function extract(p,id){for(const z of ['hand','deck','life']){const i=p[z].findIndex(c=>c.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('fixture card missing '+id);}
function put(s,id,owner,line,slot,ready=true){
 const c=extract(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});s.players[owner][line][slot]=c;return c;
}
function doAction(s,action){return soloTrainingDispatch(s,action);}
test('Q2032 Kaisel effect-selected immunity excludes attacker from opponent SPECIAL Trigger targets',()=>{
 let s=game();
 const attacker=put(s,'SLG-1-030',0,'front',0),kaiser=put(s,'SLG-1-029',0,'energy',0);
 s.players[1].life[0].cardId='SLG-1-040'; // SPECIAL life trigger, no additional cards created
 s=doAction(s,{type:'attack',uid:attacker.uid});assert.equal(s.pending.kind,'kaiserPick');
 s=doAction(s,{type:'choose',uid:kaiser.uid});
 s=doAction(s,{type:'choose',mode:'untargetable'});
 assert.equal(s.players[0].front[0].untargetableTurn,s.turn);
 assert.notEqual(s.pending?.kind,'specialTrigger','untargetable character must never be a target');
 assertSoloTrainingMatch(s);
});
test('Q2055-Q2060 skip ACTIVE once, then another ACTIVE attempt succeeds',()=>{
 let s=game(),attacker=put(s,'SLG-1-030',0,'front',0),target=put(s,'SLG-1-030',1,'front',0,false);
 target.skipActive=1;
 for(let k=0;k<2;k++){
  s.players[1].life[0].cardId='SLG-1-029'; // ACTIVE trigger in first life
  s=doAction(s,{type:'attack',uid:attacker.uid});
  assert.equal(s.pending?.kind,'activeTrigger');
  s=doAction(s,{type:'choose',uid:target.uid});
  assert.equal(s.players[1].front[0].ready,k===1,'skip once, then ACTIVE');
  assert.equal(s.players[1].front[0].skipActive,0);
  if(k===0)s.players[0].front[0].ready=true;
 }
 assertSoloTrainingMatch(s);
});
test('Q2070-Q2071 printed-BP REST shadow character count excludes BP-less fields and ignores temporary BP buffs',()=>{
 let s=game();
 const iron=put(s,'SLG-1-027',0,'front',0);
 const soldier=put(s,'SLG-1-030',0,'front',1,false);
 const realm=put(s,'SLG-1-035',0,'energy',0,false);
 soldier.buffs.push({turn:s.turn,bp:4000});
 realm.ready=false;
 assert.equal(soloMatchBp(s,iron),3500,'REST soldier with original BP1500 still counts');
 soldier.ready=true;
 assert.equal(soloMatchBp(s,iron),3000,'BP-less field does not count although REST');
 assertSoloTrainingMatch(s);
});
