import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
const op={op:'inspectTopTraitOutside',count:2,trait:'Army',orName:'Hero',requiresOtherOwnTrait:'Army',rest:'top'};
const mk=(i,p={})=>({id:'QA-'+String(i).padStart(3,'0'),name:'NPC'+i,type:'character',color:'purple',energy:0,ap:1,bp:1000,gen:1,traits:[],implementation:'vanilla',...p});
const cards=[mk(1,{name:'source',traits:['Army'],implementation:'dsl',effects:{onPlay:[op]}}),mk(2,{name:'Other',traits:['Army']}),mk(3,{name:'Hero'}),...Array.from({length:10},(_,i)=>mk(i+4))];
const pack=createUniversalPack({id:'r42-top',cards}),deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0]}throw Error('missing '+id)}
function fixture(other){
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed:4202,first:0});
 const src=take(s,'QA-001'),hero=take(s,'QA-003');s.players[0].hand.push(src);s.players[0].deck.unshift(hero);
 if(other){const c=take(s,'QA-002');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=c;}
 for(let i=0;i<4&&s.phase!=='main';i++)s=use(s,{type:'next'});
 const a=legalUniversalActions(pack,s).find(x=>x.type==='play'&&x.uid===src.uid&&x.line==='front');
 assert.ok(a);s=use(s,a);return {s,src,hero};
}
test('R42 other own trait cannot be satisfied by the entering source itself',()=>{const {s}=fixture(false);assert.equal(s.pending,null);assert.equal(assertUniversalMatch(pack,s),true)});
test('R42 exact NAME OR trait TOP2 optionally outside; keep UID and hand visibility',()=>{
 let {s,src,hero}=fixture(true);assert.equal(s.pending.kind,'effect-top-trait-outside');
 const a=legalUniversalActions(pack,s).find(x=>x.type==='chooseTopTraitOutside'&&x.uid===hero.uid);assert.ok(a);
 assert.ok(universalPrivateChoices(pack,s,0).options.some(x=>x.action.uid===hero.uid));
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=use(s,a);assert.ok(s.players[0].outside.some(c=>c.uid===hero.uid));
 assert.ok(s.zoneMoveEvents.some(x=>x.uid===hero.uid&&x.sourceUid===src.uid&&x.from==='deck'&&x.to==='outside'));
 for(let i=0;i<3&&s.pending?.kind==='effect-top-order';i++)s=use(s,legalUniversalActions(pack,s)[0]);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R42 malformed OR/name/other-trait filters fail closed',()=>{
 for(const wrong of [{...op,orName:''},{...op,requiresOtherOwnTrait:''},{...op,rest:'bottom'},{...op,payAp:1}])
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],effects:{onPlay:[wrong]}},...cards.slice(1)]}),/invalid/);
});
