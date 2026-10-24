import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPrivateChoices,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
const packs=[registeredV2TitlePack('sword-art-online'),registeredV2TitlePack('mushoku-tensei')];
const src=packs[0],ID='SAO-1-056';
const ids=['SAO-1-056','SAO-1-051','SAO-1-057','SAO-1-005','SAO-1-066',
 'SAO-1-020','SAO-1-007','SAO-1-017','SAO-1-079','SAO-1-068','SAO-1-084',
 'SAO-2-074','SAO-1-031'];
const opp=['MST-1-060','MST-1-080','MST-1-062','MST-1-059','MST-1-065',
 'MST-1-056','MST-1-041','MST-1-023','MST-1-066','MST-1-004',
 'MST-1-043','MST-1-042','MST-1-046'];
const decks=[ids,opp].map(v=>Object.fromEntries(v.map((id,i)=>[id,i===12?2:4])));
for(let i=0;i<2;i++)assert.deepEqual(validateUniversalDeck(packs[i],decks[i]),[]);
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,id,owner=0){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[owner][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing '+id);
}
function scene(top=[]){
 let s=newUniversalMatch(packs,{decks,first:0,seed:39056});
 const source=take(s,ID);s.players[0].hand.push(source);
 for(let i=0;i<3;i++){
  const g=take(s,'SAO-1-051');
  g.ready=true;g.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=g;
 }
 const entrant=take(s,'SAO-1-051');s.players[0].hand.push(entrant);
 const inspected=top.map(id=>take(s,id));
 s.players[0].deck.unshift(...inspected);
 s=act(s,{type:'next'});s=act(s,{type:'next'});
 const p=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(p,'printed 3-blue energy is paid to play source');
 const ap=s.players[0].apCards.filter(c=>c.ready&&c.inPlay).length;
 s=act(s,p);
 assert.equal(s.players[0].apCards.filter(c=>c.ready&&c.inPlay).length,ap-1);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,source,entrant,inspected};
}
test('SAO056 exact official source, typed choose-one, DRAW LIFE, independent manifest',()=>{
 const source=SAO_OFFICIAL_CARDS.find(x=>x.id===ID),d=src.cards[ID];
 assert.equal(source.number,'UA15BT/'+ID);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(ID));
 assert.deepEqual([d.name,d.type,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger],
 ['ユイ','character','blue',3,1,2000,1,'draw']);
 assert.equal(d.effects.onPlay.length,1);
 assert.equal(d.effects.onPlay[0].op,'chooseOne');
 assert.deepEqual(d.effects.onPlay[0].options.map(x=>x.id),['topTwo','freeRest']);
 assert.deepEqual(d.effects.onPlay[0].options[1].then,[{
  op:'deployOwnHandRest',type:'character',color:'blue',energy:2,ap:1,max:1
 }]);
});
for(const picked of [false,true])test('mode TOP2 '+(picked?'one':'zero')+' revealed, rest ordered bottom and no other mode',()=>{
 let {s,inspected,entrant}=scene(['SAO-1-007','SAO-1-066']);
 const before=s.players[0].deck.map(c=>c.uid);
 s=act(s,{type:'chooseEffectMode',mode:'topTwo'});
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(x=>x.uid===inspected[0].uid));
 assert.ok(!choices.some(x=>x.uid===inspected[1].uid));
 const snap=structuredClone(s);
 assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid:inspected[1].uid}),/not currently legal/);
 assert.deepEqual(s,snap);
 const uid=picked?inspected[0].uid:null;
 s=act(s,{type:'chooseTopFilteredMany',uid});
 assert.equal(s.pending.kind,'effect-top-order');
 const remaining=inspected.map(c=>c.uid).filter(x=>x!==uid).reverse();
 for(const rest of remaining)s=act(s,{type:'chooseTopOrder',uid:rest});
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...before.slice(2),...remaining]);
 const view=universalPublicView(packs,s,1);
 assert.deepEqual(view.publicReveals.filter(e=>e.kind==='searched-to-hand').map(e=>e.uid),uid?[uid]:[]);
 assert.ok(!view.publicReveals.some(e=>e.uid===inspected[1].uid));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('mode TOP2 allows FIELD and rejects EVENT',()=>{
 let {s,inspected}=scene(['SAO-2-074','SAO-1-066']);
 s=act(s,{type:'chooseEffectMode',mode:'topTwo'});
 assert.ok(legalUniversalActions(packs,s).some(x=>x.uid===inspected[0].uid));
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.uid===inspected[1].uid));
 s=act(s,{type:'chooseTopFilteredMany',uid:inspected[0].uid});
 s=act(s,{type:'chooseTopOrder',uid:inspected[1].uid});
 assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,s),true);
});
test('mode REST own hand free entry: printed filter, no extra AP, no normal discount, UID and no leak',()=>{
 let {s,source,entrant}=scene();
 const modes=legalUniversalActions(packs,s);
 assert.deepEqual(modes,[{type:'chooseEffectMode',mode:'topTwo'},
 {type:'chooseEffectMode',mode:'freeRest'}]);
 s=act(s,{type:'chooseEffectMode',mode:'freeRest'});
 assert.equal(s.pending.kind,'effect-hand-rest');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(x=>x.uid===null));
 const enter=opts.find(x=>x.uid===entrant.uid&&x.line==='energy');
 assert.ok(enter);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const view=universalPublicView(packs,s,1);assert.equal(view.players[0].hand,null);
 assert.ok(!JSON.stringify(view).includes(entrant.uid));
 const ap=s.players[0].apCards.filter(c=>c.ready&&c.inPlay).length;
 const count=s.zoneMoveEvents.length;
 const old=structuredClone(s);
 assert.throws(()=>act(s,{type:'chooseHandRest',uid:'1-forged',line:'energy',slot:0}),/not currently legal/);
 assert.deepEqual(s,old);
 for(const difficulty of ['easy','normal','hard']){
  const choice=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(opts.some(x=>JSON.stringify(x)===JSON.stringify(choice)));
 }
 s=act(s,enter);
 assert.equal(s.players[0].apCards.filter(c=>c.ready&&c.inPlay).length,ap);
 assert.ok(s.players[0].energy.some(c=>c?.uid===entrant.uid&&!c.ready));
 assert.equal(s.zoneMoveEvents.length,count+1);
 const m=s.zoneMoveEvents.at(-1);
 assert.deepEqual([m.from,m.to,m.uid,m.sourceUid,m.reason],['hand','energy',entrant.uid,source.uid,'own-effect']);
 assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('mode REST selecting zero is legal and does not move hand or reveal hidden UID',()=>{
 let {s,entrant}=scene();
 s=act(s,{type:'chooseEffectMode',mode:'freeRest'});
 const n=s.zoneMoveEvents.length,ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.zoneMoveEvents.length,n);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.ok(s.players[0].hand.some(c=>c.uid===entrant.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
