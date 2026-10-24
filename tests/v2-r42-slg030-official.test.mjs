import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','015','016','018','027','032','041','043','045','052','066'];
const deck=Object.fromEntries(ids.map(i=>['SLG-1-'+i,4]));deck['SLG-1-030']=2;
const run=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0]}throw Error('Missing '+id)}
function scene(withOther=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:42030,first:0});
 const target=take(s,'SLG-1-030');s.players[0].hand.push(target);
 // Only arrange the inspected window AFTER automatic phase draws.
 let candidate;
 if(withOther){const other=take(s,'SLG-1-027');other.ready=true;other.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[1]=other;}
 for(let i=0;i<4&&s.phase!=='main';i++)s=run(s,{type:'next'});
 candidate=take(s,'SLG-1-027');s.players[0].deck.unshift(candidate);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='energy');
 assert.ok(play);
 return {s:run(s,play),target,candidate};
}
test('R42 030 independent official print, 12 copies and DRAW LIFE',()=>{
 const source=SOLO_LEVELING_CARDS.find(x=>x.id==='SLG-1-030');
 assert.equal(source.number,'UA51BT/SLG-1-030');
 const d=pack.cards['SLG-1-030'];
 assert.deepEqual([d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger,d.maxCopies],
 ['影の兵士','purple',0,1,1500,1,'draw',12]);
 assert.deepEqual(d.traits,['影の軍団']);
 assert.deepEqual(d.effects.onPlay,[{op:'inspectTopTraitOutside',count:2,trait:'影の軍団',
  orName:'水篠 旬',requiresOtherOwnTrait:'影の軍団',rest:'top'}]);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
});
test('R42 own other field Army enables top2, one outside UID, remainder TOP and JSON',()=>{
 let {s,candidate,target}=scene(true);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTopTraitOutside'&&x.uid===candidate.uid);
 assert.ok(a);assert.ok(universalPrivateChoices(packs,s,0).options.some(x=>x.action.uid===candidate.uid));
 s=run(s,a);
 assert.ok(s.players[0].outside.some(x=>x.uid===candidate.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===candidate.uid&&e.sourceUid===target.uid&&e.from==='deck'&&e.to==='outside'));
 for(let i=0;i<3&&s.pending?.kind==='effect-top-order';i++)s=run(s,legalUniversalActions(packs,s)[0]);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R42 printed OTHER gate is not fulfilled by source itself',()=>{
 const {s}=scene(false);assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,s),true);
});
