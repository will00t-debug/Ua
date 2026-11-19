import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,zoneRequiredEnergy,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=officialV2Pack('eva');
const deck={'EVA-1-057':4,'EVA-1-031':4,'EVA-1-028':4,'EVA-1-024':4};
let left=34;
for(const d of Object.values(pack.cards)){
 if(left<=0)break;
 if(d.color!=='purple'||d.type!=='character'||d.energy>3||deck[d.id])continue;
 const n=Math.min(4,left);deck[d.id]=n;left-=n;
}
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[0][zone];const i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('missing '+id);
}
function act(s,predicate){
 const a=legalUniversalActions(pack,s).find(predicate);
 assert.ok(a,JSON.stringify(s.pending||s.phase));
 return dispatchUniversalAction(pack,s,a);
}
test('EVA-1-057 can deploy EVA-1-031 at its current outside energy, not printed 5',()=>{
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:22});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 const pl=s.players[0],striker=take(s,'EVA-1-057');
 striker.ready=true;striker.fieldEntryStamp=s.nextFieldEntryStamp++;striker.entryTurn=s.turn;
 pl.front[0]=striker;
 const target=take(s,'EVA-1-031'),wrong=take(s,'EVA-1-024'),pay=take(s,'EVA-1-028');
 pl.outside.push(target,wrong);
 pl.hand.push(pay);
 const d=pack.cards[target.cardId];
 assert.equal(d.energy,5);
 assert.equal(zoneRequiredEnergy(pack,s,0,d,'outside'),3);
 assert.equal(zoneRequiredEnergy(pack,s,0,d,'field'),5);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 s=act(s,a=>a.type==='attack'&&a.uid===striker.uid);
 assert.equal(s.pending.kind,'effect-discard-gate');
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscardGate',uid:pay.uid});
 const legal=legalUniversalActions(pack,s).filter(a=>a.type==='chooseOutsideNameRest');
 assert.ok(legal.some(a=>a.uid===target.uid&&a.line==='energy'));
 assert.ok(!legal.some(a=>a.uid===wrong.uid));
 assert.ok(legal.some(a=>a.uid===null));
 const before=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,a=>a.type==='chooseOutsideNameRest'&&a.uid===target.uid&&a.line==='energy');
 assert.ok(s.players[0].energy.some(c=>c?.uid===target.uid&&c.ready===false));
 assert.ok(!s.players[0].outside.some(c=>c.uid===target.uid));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before);
 assert.equal(assertUniversalMatch(pack,s),true);
});
