import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const op={op:'deployNamedFromZones',name:'Soldier',zones:['hand','outside'],line:'any',ready:false,optional:true};
const mk=(i,p={})=>({id:'QA-'+String(i).padStart(3,'0'),name:'Other'+i,type:'character',color:'purple',energy:0,ap:1,bp:1000,gen:1,traits:[],implementation:'vanilla',...p});
const cards=[mk(1,{name:'Source',implementation:'dsl',effects:{onPlay:[op]}}),mk(2,{name:'Soldier',implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}}),...Array.from({length:11},(_,i)=>mk(i+3))];
const pack=createUniversalPack({id:'r42-zones',cards}),deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const run=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){const list=s.players[0][z],i=list.findIndex(c=>c.cardId===id);if(i>=0)return list.splice(i,1)[0]}throw Error('missing '+id)}
function scene(zone){let s=newUniversalMatch(pack,{decks:[deck,deck],seed:42028,first:0});
 const src=take(s,'QA-001'),target=take(s,'QA-002');s.players[0].hand.push(src);s.players[0][zone].push(target);
 for(let i=0;i<4&&s.phase!=='main';i++)s=run(s,{type:'next'});
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 assert.ok(action);return {s:run(s,action),src,target};}
for(const zone of ['hand','outside'])test('R42 '+zone+' can freely REST enter same named character with UID and no AP fee',()=>{
 let {s,src,target}=scene(zone);
 assert.equal(s.pending.kind,'effect-named-zone-entry');
 const action=legalUniversalActions(pack,s).find(a=>a.type==='chooseNamedZoneDeploy'&&a.zone===zone&&a.uid===target.uid&&a.line==='energy');
 assert.ok(action);const before=s.players[0].apCards.filter(c=>c.ready).length;
 s=run(s,action);
 assert.ok(s.players[0].energy.some(c=>c?.uid===target.uid&&!c.ready));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before);
 assert.ok(s.zoneMoveEvents.some(x=>x.from===zone&&x.to==='energy'&&x.uid===target.uid&&x.sourceUid===src.uid));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R42 hand/private choices and AI shared; forged zone UID atomically rejected',()=>{
 let {s,target}=scene('hand');
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(pack,s,{difficulty});
  assert.ok(legalUniversalActions(pack,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
 }
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.ok(universalPrivateChoices(pack,s,0).options.some(x=>x.action.uid===target.uid));
 assert.equal(universalPublicView(pack,s,1).players[0].hand,null);
 const before=structuredClone(s);
 assert.throws(()=>run(s,{type:'chooseNamedZoneDeploy',zone:'outside',uid:target.uid,line:'front',slot:0}),/not currently legal/);
 assert.deepEqual(s,before);
 s=run(s,{type:'chooseNamedZoneDeploy',uid:null});assert.equal(s.pending,null);
});
test('R42 named entry rejects invented AP cost, deck zone and malformed printed name',()=>{
 for(const bad of [{...op,payAp:1},{...op,zones:['deck']},{...op,name:''},{...op,line:'removed'}])
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],effects:{onPlay:[bad]}},...cards.slice(1)]}),/invalid/);
});

test('R42 saved pending cannot mint free ACTIVE, forge other zone or change printed name',()=>{
 let {s}=scene('hand');
 assert.equal(assertUniversalMatch(pack,s),true);
 for(const mutate of [q=>{q.ready=true},q=>{q.name='Other'},
  q=>{q.outsideChoices=[q.handChoices[0]]},q=>{q.sourceUid='0-forged'},
  q=>{q.sourceName='forged'},q=>{q.extra=1}]){
  const forged=structuredClone(s);mutate(forged.pending);
  assert.throws(()=>assertUniversalMatch(pack,forged),/Invalid named free zone entry/);
 }
});
