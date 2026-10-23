import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','015','016','018','027','032','041','043','045','052'];
const deck=Object.fromEntries(ids.map(i=>['SLG-1-'+i,4]));deck['SLG-1-028']=4;deck['SLG-1-030']=2;
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const run=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];
 }throw Error('no physical '+id);
}
function fixture(zone){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:420280,first:0});
 const src=take(s,'SLG-1-028'),target=take(s,'SLG-1-030');
 s.players[0].hand.push(src);s.players[0][zone].push(target);
 const producers=Object.keys(deck).filter(id=>pack.cards[id].color==='purple'&&pack.cards[id].gen>0&&id!=='SLG-1-028');
 assert.ok(producers.length>=4);
 for(let n=0;n<4;n++){
  const c=take(s,producers[n]);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[n]=c;
 }
 for(let k=0;k<4&&s.phase!=='main';k++)s=run(s,{type:'next'});
 // Arrange the inspected top window AFTER phase changes/mandatory draw.
 const inspected=take(s,'SLG-1-027');s.players[0].deck.unshift(inspected);
 for(const ap of s.players[0].apCards){ap.ready=true;ap.inPlay=true;} // AP2 is genuinely paid once
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 assert.ok(play,'4 purple energy and AP2 source can be played');
 return {s:run(s,play),src,target,inspected};
}
test('R42 028 official print and 030 actual registry, legal 50-card deck',()=>{
 const source=SOLO_LEVELING_CARDS.find(x=>x.id==='SLG-1-028');
 assert.equal(source.number,'UA51BT/SLG-1-028');
 assert.equal(source.nameJa,'イグリット');
 assert.deepEqual([source.energy,source.ap,source.bp,source.gen,source.trigger],[4,2,4000,1,'get']);
 const d=pack.cards['SLG-1-028'];
 assert.equal(d.enterAlwaysActive,true);assert.deepEqual(d.traits,['影の軍団']);
 assert.deepEqual(d.effects.onPlay,[{op:'deployNamedFromZones',name:'影の兵士',
  zones:['hand','outside'],line:'any',ready:false,optional:true}]);
 assert.equal(pack.cards['SLG-1-030'].maxCopies,12);
});
for(const zone of ['hand','outside'])test('R42 028 ACTIVE; printed named 030 enters REST from '+zone+'; its TOP2 opens',()=>{
 let {s,src,target,inspected}=fixture(zone);
 assert.ok(s.players[0].front.some(c=>c?.uid===src.uid&&c.ready));
 assert.equal(s.pending.kind,'effect-named-zone-entry');
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseNamedZoneDeploy'&&x.zone===zone&&x.uid===target.uid&&x.line==='front');
 assert.ok(a);const paid=s.players[0].apCards.filter(x=>x.ready).length;
 s=run(s,a);assert.ok(s.players[0].front.some(c=>c?.uid===target.uid&&!c.ready));
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,paid);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===target.uid&&e.sourceUid===src.uid&&e.from===zone&&e.to==='front'));
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 const select=legalUniversalActions(packs,s).find(x=>x.type==='chooseTopTraitOutside'&&x.uid===inspected.uid);
 assert.ok(select);s=run(s,select);
 assert.ok(s.players[0].outside.some(c=>c.uid===inspected.uid));
 for(let i=0;i<3&&s.pending?.kind==='effect-top-order';i++)s=run(s,legalUniversalActions(packs,s)[0]);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R42 028 may decline either zone and never incurs a second AP or leaks hidden hand',()=>{
 let {s,target}=fixture('hand');
 assert.ok(universalPrivateChoices(packs,s,0).options.some(x=>x.action.uid===target.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
 }
 const saved=structuredClone(s);
 assert.throws(()=>run(s,{type:'chooseNamedZoneDeploy',zone:'outside',uid:target.uid,line:'front',slot:0}),/not currently legal/);
 assert.deepEqual(s,saved);
 s=run(s,{type:'chooseNamedZoneDeploy',uid:null});
 assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,s),true);
});
