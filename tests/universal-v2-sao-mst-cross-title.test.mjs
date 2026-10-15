import test from 'node:test';
import assert from 'node:assert/strict';
import {saoV2Pack,SAO_V2_PILOT_IDS} from '../dist/universal-v2/sao-pack.mjs';
import {mstV2Pack,MST_V2_PILOT_IDS} from '../dist/universal-v2/mst-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const packs=[saoV2Pack(),mstV2Pack()];
function deck(pack,ids){
 const eligible=ids.filter(id=>pack.cards[id].trigger!=='final').slice(0,13);
 const d=Object.fromEntries(eligible.map(id=>[id,4]));d[eligible.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(pack,d),[]);
 return d;
}
const decks=[deck(packs[0],SAO_V2_PILOT_IDS),deck(packs[1],MST_V2_PILOT_IDS)];
function take(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside']){
  const ix=pl[zone].findIndex(c=>c.cardId===id);
  if(ix>=0)return pl[zone].splice(ix,1)[0];
 }
 throw Error('Absent physical card '+id);
}
test('V2 SAO vs MST cross-title life GET and legal choice preserve full physical identities',()=>{
 let s=newUniversalMatch(packs,{decks,seed:1007,first:0});
 assert.equal(s.title,'cross-title');
 const attacker=take(s,0,'SAO-1-001');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const get=take(s,1,'MST-1-001'),old=s.players[1].life.shift();
 s.players[1].deck.push(old);s.players[1].life.unshift(get);
 const source=structuredClone(s);
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(attack);s=dispatchUniversalAction(packs,s,attack,{actor:0});
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending?.trigger,'get');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='skip'));
 const getAction=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.ok(getAction);
 const resolved=dispatchUniversalAction(packs,s,getAction,{actor:1});
 assert.ok(resolved.players[1].hand.some(c=>c.uid===get.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
 assert.equal(assertUniversalMatch(packs,source),true);
 const view=universalPublicView(packs,resolved,0);
 assert.equal(view.players[0].title,'sword-art-online');
 assert.equal(view.players[1].title,'mushoku-tensei');
});
