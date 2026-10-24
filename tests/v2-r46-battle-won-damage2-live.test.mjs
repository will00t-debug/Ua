import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const normal=(id,bp=2000)=>({id,name:id,color:'green',type:'character',
 energy:0,ap:1,bp,gen:1,traits:[],implementation:'vanilla',effects:{}});
const cards=[{...normal('watch',4000),implementation:'dsl',
 otherOwnBattleWonDamageTwo:true},normal('atk',2000),normal('block',2000),
 normal('high',3000),...Array.from({length:9},(_,i)=>normal('f'+i))];
const pack=createUniversalPack({id:'r46-battle-won',cards});
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===0?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function pull(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function place(s,p,id,slot){
 const c=pull(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p].front[slot]=c;return c;
}
function battle({blockBp='block',defenderWatcher=false,noBlock=false,selfWatch=false}={}){
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:46321});
 const attacker=place(s,0,selfWatch?'watch':'atk',0);
 const watcher=place(s,defenderWatcher?1:0,'watch',defenderWatcher?1:1);
 const blocker=place(s,1,blockBp,0);
 s.active=0;s.phase='attack';s.players[0].ownTurns++;
 assert.equal(assertUniversalMatch(pack,s),true);
 const attack=legalUniversalActions(pack,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(attack);
 s=use(s,attack);
 assert.equal(s.pending?.kind,'block');
 const options=legalUniversalActions(pack,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(pack,s,{difficulty});
  assert.ok(options.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 s=use(s,{type:'chooseBlock',uid:noBlock?null:blocker.uid});
 return {s,attacker,watcher,blocker};
}
test('Q763 attack BP equal block wins; other own watcher earns this-turn DAMAGE2',()=>{
 const {s,attacker,watcher}=battle();
 const own=s.players[0].front.find(x=>x?.uid===watcher.uid);
 assert.ok(own);assert.equal(universalAttackDamage(pack,s,own),2);
 const win=s.players[0].front.find(x=>x?.uid===attacker.uid);
 assert.equal(universalAttackDamage(pack,s,win),1);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('Q763 STRICT blocker BP > attacker grants defender watcher; no win for attacking side',()=>{
 const {s,watcher}=battle({blockBp:'high',defenderWatcher:true});
 const defender=s.players[1].front.find(x=>x?.uid===watcher.uid);
 assert.equal(universalAttackDamage(pack,s,defender),2);
 assert.ok(s.players[1].front[0]);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('No blocker means no battle-won grant even when LIFE damage resolves',()=>{
 const {s,watcher}=battle({noBlock:true});
 const recipient=s.players[0].front.find(x=>x?.uid===watcher.uid);
 assert.equal(universalAttackDamage(pack,s,recipient),1);
});
test('Temporary DAMAGE2 expires when turn increments, does not stack, is stamp-bound',()=>{
 const {s,watcher}=battle();
 const target=s.players[0].front.find(x=>x?.uid===watcher.uid);
 assert.equal(universalAttackDamage(pack,s,target),2);
 const cloned=structuredClone(s);cloned.turn++;
 assert.equal(universalAttackDamage(pack,cloned,target),1);
 const entered=structuredClone(s);
 entered.players[0].front[1].fieldEntryStamp=entered.nextFieldEntryStamp++;
 assert.equal(universalAttackDamage(pack,entered,entered.players[0].front[1]),1);
 assert.equal(assertUniversalMatch(pack,entered),true);
});
test('Forged winner UID, stamp, role and unknown fields fail saved state validation',()=>{
 const {s}=battle();
 for(const mutate of [
  g=>g.winnerUid='0-forged',g=>g.winnerStamp=-1,
  g=>g.role='unblocked',g=>g.extra=2,g=>g.turn=s.turn+1
 ]){
  const fake=structuredClone(s);
  mutate(fake.players[0].front[1].otherOwnBattleWinDamage2);
  assert.throws(()=>assertUniversalMatch(pack,fake),
   /Invalid saved other-own battle-win DAMAGE2 grant/);
 }
});
test('Non-printed grants fail closed and no registered real card is implied',()=>{
 assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...normal('eventlike'),type:'event',otherOwnBattleWonDamageTwo:true,implementation:'dsl'}]}));
 assert.equal(pack.cards.watch.otherOwnBattleWonDamageTwo,true);
 assert.equal(pack.cards.atk.otherOwnBattleWonDamageTwo,false);
});
