import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const ids=Array.from({length:13},(_,i)=>'U'+String(i).padStart(2,'0'));
const moveTrigger={when:{from:'hand',to:'outside',
 reasons:['payment','own-effect'],sourceOnField:true,
 sourceName:'SourceRole',sourceColor:'blue'},
 then:[{op:'draw',count:1}]};
const cards=ids.map(id=>({
 id,name:id==='U00'?'SourceRole':id,type:id==='U01'?'event':'character',
 color:'blue',energy:0,ap:1,bp:1000,gen:1,
 implementation:['U00','U01'].includes(id)?'dsl':'vanilla',
 ...(id==='U00'?{effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1},{op:'draw',count:1}]}}:{}),
 ...(id==='U01'?{moveTriggers:[moveTrigger]}:{})
}));
const pack=createUniversalPack({id:'r20-after-source-discard',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[0][zone],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function opened(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:20203});
 const source=take(s,'U00'),trigger=take(s,'U01');
 s.players[0].hand.push(source,trigger);
 for(let n=0;n<5&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseDiscard'&&a.uid===trigger.uid));
 return {s,source,trigger};
}
test('a physical discarded card draws AFTER remaining source program, not during the choice',()=>{
 let {s,source,trigger}=opened();
 assert.equal(s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand').length,1);
 assert.equal(s.effectQueue.some(e=>e.op==='sourceResolutionBoundary'),true);
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:trigger.uid});
 const drawn=s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand');
 assert.equal(drawn.length,3);
 assert.deepEqual(drawn.map(e=>e.sourceUid),[source.uid,source.uid,trigger.uid]);
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(x=>x.uid===trigger.uid),true);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('same source discarding the wrong printed card never grants trigger draw',()=>{
 let {s,source,trigger}=opened();
 const other=s.players[0].hand.find(x=>x.uid!==trigger.uid);
 assert.ok(other);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:other.uid});
 const draws=s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand');
 assert.equal(draws.length,2);
 assert.ok(draws.every(e=>e.sourceUid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict source profile fails closed on missing qualifiers, wrong causes, extra effects',()=>{
 for(const when of [
  {...moveTrigger.when,sourceOnField:false},
  {...moveTrigger.when,reasons:['opponent-effect']},
  {...moveTrigger.when,sourceName:''},
  {...moveTrigger.when,from:'deck'},
  {...moveTrigger.when,sourceTrait:'unstated'},
  {...moveTrigger.when,reasons:['payment','payment']}
 ])assert.throws(()=>createUniversalPack({id:'invalid-move-source',cards:[{
  ...cards[1],moveTriggers:[{when,then:moveTrigger.then}]
 }]}),/invalid|unsupported/i);
 for(const then of [[{op:'unreviewedMagic'}],[{op:'draw',count:0}]])
  assert.throws(()=>createUniversalPack({id:'invalid-source-op',cards:[{
   ...cards[1],moveTriggers:[{when:moveTrigger.when,then}]
  }]}),/invalid|unsupported/i);
});
