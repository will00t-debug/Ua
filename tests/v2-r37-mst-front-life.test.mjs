import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const packs=[registeredV2TitlePack('sword-art-online'),registeredV2TitlePack('mushoku-tensei')];
const sa=['SAO-1-031','SAO-1-066','SAO-1-005','SAO-1-020','SAO-1-051','SAO-1-057',
 'SAO-1-019','SAO-1-068','SAO-1-073','SAO-1-077','SAO-1-079','SAO-1-082','SAO-1-084'];
const mst=['MST-1-060','MST-1-080','MST-1-062','MST-1-046','MST-1-050','MST-1-059',
 'MST-1-063','MST-1-055','MST-1-057','MST-1-052','MST-1-069','MST-1-054','MST-1-070'];
const decks=[sa,mst].map(ids=>Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4])));
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function pull(s,p,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
for(const [id,mode] of [['MST-1-060','get'],['MST-1-080','draw']])
 test('R37 real 50-card combat LIFE '+id+' '+mode+' trigger is distinct from PLAY/MAIN',()=>{
  let s=newUniversalMatch(packs,{decks,first:0,seed:id==='MST-1-060'?39060:39080});
  const attacker=pull(s,0,'SAO-1-051');
  attacker.ready=true;attacker.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=attacker;
  const physical=pull(s,1,id);
  s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(physical);
  s=act(act(act(s,{type:'next'}),{type:'next'}),{type:'next'});
  s=act(s,{type:'attack',uid:attacker.uid});
  s=act(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.kind,'life-trigger');
  const handBefore=s.players[1].hand.length,deckBefore=s.players[1].deck.length;
  const use=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode===mode);
  assert.ok(use);s=act(s,use);
  assert.equal(s.pending,null);
  if(mode==='get'){
   assert.ok(s.players[1].hand.some(c=>c.uid===physical.uid));
   assert.equal(s.players[1].hand.length,handBefore+1);
   assert.equal(s.players[1].deck.length,deckBefore);
  }else{
   assert.equal(s.players[1].deck.length,deckBefore-1);
   assert.equal(s.players[1].hand.length,handBefore+1);
   assert.ok(!s.players[1].hand.some(c=>c.uid===physical.uid));
  }
  assert.equal(assertUniversalMatch(packs,s),true);
 });
