import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const slg=createSlgV2Pack(),ttg=createTtgV2Pack(),packs=[ttg,slg];
const sd=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
sd['SLG-1-043']=0;sd['SLG-1-036']=4;sd['SLG-1-038']=2;
const td=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
td['TTG-1-036']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=s.players[p][zone].findIndex(c=>c.cardId===id);
  if(i>=0)return s.players[p][zone].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function setup(){
 let s=newUniversalMatch(packs,{decks:[td,sd],seed:361,first:1});
 const source=take(s,1,'SLG-1-036');s.players[1].hand.push(source);
 for(let i=0;i<3;i++){const energy=take(s,1,'SLG-1-015');energy.ready=true;s.players[1].energy[i]=energy;}
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const event=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===source.uid);
 assert.ok(event);
 return {s,event,source};
}
test('SLG-036 official exact text, printed costs, life icon and accepted V2 implementation',()=>{
 const printed=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-036');
 assert.equal(printed.nameJa,'あの人に追いつきたい');
 assert.match(printed.effect,/抽3張後將2張手牌送場外/);
 assert.equal(printed.trigger,'active');
 assert.equal(slg.cards['SLG-1-036'].type,'event');
 assert.equal(slg.cards['SLG-1-036'].energy,3);
 assert.equal(slg.cards['SLG-1-036'].ap,1);
 assert.equal(slg.cards['SLG-1-036'].trigger,'active');
 assert.deepEqual(slg.cards['SLG-1-036'].effects.onPlay,[{op:'drawDiscard',count:3,discardCount:2}]);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,sd),[]);
 assert.deepEqual(slg.cards['SLG-1-037'].effects.onPlay,[
  {op:'recoverOutsidePrintedBp',bp:4000,optional:true},{op:'draw',count:1}
 ]);
});
test('SLG-036 event blocked before payment if insufficient purple energy or ready AP',()=>{
 const {s,event}=setup();
 for(const which of ['energy','ap']){
  const q=structuredClone(s);
  if(which==='energy'){q.players[1].hand.push(q.players[1].energy[0]);q.players[1].energy[0]=null;}
  else for(const card of q.players[1].apCards)card.ready=false;
  assert.ok(!legalUniversalActions(packs,q).some(a=>a.type==='event'&&a.uid===event.uid));
  assert.throws(()=>dispatchUniversalAction(packs,q,event),/not currently legal/);
 }
});
test('SLG-036 pays exactly one AP then draws three and forces two different hand UIDs outside',()=>{
 let {s,event,source}=setup();
 const deck=s.players[1].deck.length,hand=s.players[1].hand.length;
 const outside=s.players[1].outside.length,ap=s.players[1].apCards.filter(x=>x.ready).length;
 s=dispatchUniversalAction(packs,s,event);
 assert.equal(s.players[1].deck.length,deck-3);
 assert.equal(s.players[1].hand.length,hand+2);
 assert.equal(s.players[1].outside.length,outside+1);
 assert.equal(s.players[1].apCards.filter(x=>x.ready).length,ap-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending?.remaining,2);
 const options=legalUniversalActions(packs,s);
 assert.ok(options.length>=2&&options.every(x=>x.type==='chooseDiscard'&&x.uid!==null));
 const saved=structuredClone(s);
 for(const bad of [{type:'chooseDiscard',uid:null},{type:'chooseDiscard',uid:'0-99999'}]){
  assert.throws(()=>dispatchUniversalAction(packs,s,bad),/not currently legal/);
  assert.deepEqual(s,saved);
 }
 const first=options[0];
 assert.throws(()=>dispatchUniversalAction(packs,s,first,{actor:0}),/Wrong player/);
 s=dispatchUniversalAction(packs,s,first,{actor:1});
 assert.equal(s.pending?.remaining,1);
 assert.ok(s.players[1].outside.some(c=>c.uid===first.uid));
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.uid===first.uid));
 const second=legalUniversalActions(packs,s).find(x=>x.type==='chooseDiscard');
 assert.ok(second);
 s=dispatchUniversalAction(packs,s,second,{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].hand.length,hand);
 assert.equal(s.players[1].outside.length,outside+3);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-036 pending hand UIDs stay secret from opponent public view',()=>{
 const {s,event}=setup(),pending=dispatchUniversalAction(packs,s,event);
 const view=universalPublicView(packs,pending,0);
 assert.equal(view.players[1].hand,null);
 for(const card of pending.players[1].hand)
  assert.ok(!JSON.stringify(view).includes(JSON.stringify(card.uid)),'private UID leaked');
 assert.equal(assertUniversalMatch(packs,pending),true);
});
