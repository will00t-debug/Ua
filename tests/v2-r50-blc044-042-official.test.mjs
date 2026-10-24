import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack,BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalEnergyByColor,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
const official=createBleachV2Pack();
const must=['BLC-2-044','BLC-4-042'];
const blue=Object.values(official.cards).filter(c=>c.color==='blue'&&c.type==='character'&&c.gen>=1);
const ordered=[...must,'BLC-2-040',...blue.map(c=>c.id)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,13);
assert.equal(ordered.length,13);
const deck=Object.fromEntries(ordered.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(official,deck),[]);
function take(s,id,p=0){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing physical '+id);}
const run=(pack,s,a)=>dispatchUniversalAction(pack,s,a);
function scene(pack=official,counts=deck){
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:50042,first:0});
 const source=take(s,'BLC-4-042'),wantedField=take(s,'BLC-2-044');
 const victim=take(s,'BLC-2-040');
 s.players[0].hand.push(source,wantedField);
 victim.ready=true;victim.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=victim;
 const supporters=[];
 for(let i=1;i<3;i++){const c=take(s,blue.find(b=>
   ![source.cardId,wantedField.cardId,victim.cardId,...supporters.map(x=>x.cardId)].includes(b.id))?.id);
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;supporters.push(c);}
 for(let i=0;i<4&&s.phase!=='main';i++)s=run(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 const use=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(use,'play true blue3 Mayuri via printed AP and energy');
 s=run(pack,s,use);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,source,wantedField,victim,supporters};
}
test('R50 BLC-4-042 official printed full source stats, three modes and blue TWO base',()=>{
 const p=official.cards['BLC-4-042'],f=official.cards['BLC-2-044'];
 assert.deepEqual([p.name,p.color,p.energy,p.ap,p.bp,p.gen,p.trigger],
  ['涅 マユリ','blue',3,1,2000,2,'draw']);
 assert.equal(p.effects.onPlay[0].op,'chooseOne');
 assert.deepEqual(p.effects.onPlay[0].options.map(x=>x.id),['top','recover','field']);
 assert.deepEqual([f.name,f.color,f.type,f.energy,f.ap,f.gen,f.trigger],
  ['涅骸部隊','blue','field',3,1,1,'get']);
 assert.equal(f.mainAbility.op,'fieldDualMain');
 assert.equal(f.mainAbility.buffName,'涅 ネム');
 assert.equal(f.mainAbility.retireTrait,'涅骸部隊');
});
test('R50 REAL source 042 TOP2 and exact two-UID cost are legal ordinary player decisions',()=>{
 let {s,source}=scene();
 s=run(official,s,{type:'chooseEffectMode',mode:'top'});
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 const two=[...s.pending.uids];const before=s.players[0].deck.length;
 s=run(official,s,{type:'chooseInspectedOutside',uid:two[0]});
 s=run(official,s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 const choice=legalUniversalActions(official,s).find(x=>x.type==='chooseTopOrder');
 assert.ok(choice);s=run(official,s,choice);
 assert.ok(s.players[0].outside.some(c=>c.uid===two[0]));
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(official,JSON.parse(JSON.stringify(s))),true);
 ({s}=scene());
 s=run(official,s,{type:'chooseEffectMode',mode:'recover'});
 assert.equal(s.pending?.kind,'effect-discard-gate');
 const pairs=legalUniversalActions(official,s).filter(a=>a.uids?.length===2);
 assert.ok(pairs.length>0);
 const beforeOut=s.players[0].outside.length;
 s=run(official,s,pairs[0]);
 assert.equal(s.players[0].outside.length,beforeOut+2);
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.ok(legalUniversalActions(official,s).some(a=>a.uid===source?.uid)===false||
  s.players[0].outside.some(c=>c.cardId==='BLC-4-042'));
 assert.equal(assertUniversalMatch(official,s),true);
});
test('R50 REAL 042 mode C retires other physical character before true BLUE FIELD ACTIVE ENERGY',()=>{
 let {s,source,wantedField,victim}=scene();
 s=run(official,s,{type:'chooseEffectMode',mode:'field'});
 assert.equal(s.pending?.kind,'effect-retire-own-character');
 assert.ok(!legalUniversalActions(official,s).some(a=>a.uid===source.uid));
 const choice=legalUniversalActions(official,s).find(a=>a.uid===victim.uid);
 assert.ok(choice);s=run(official,s,choice);
 assert.ok(s.players[0].outside.some(x=>x.uid===victim.uid));
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const deploy=legalUniversalActions(official,s).find(a=>a.uid===wantedField.uid&&a.line==='energy');
 assert.ok(deploy);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=run(official,s,deploy);
 assert.ok(s.players[0].energy.some(c=>c?.uid===wantedField.uid&&c.ready));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.ok(legalUniversalActions(official,s).some(a=>a.type==='activate'&&
  a.uid===wantedField.uid&&a.mode==='fieldRestBuffGroup'));
 const buff=legalUniversalActions(official,s).find(a=>a.mode==='fieldRestBuffGroup');
 s=run(official,s,buff);
 assert.ok(s.players[0].energy.some(c=>c?.uid===wantedField.uid&&!c.ready));
 assert.ok(!legalUniversalActions(official,s).some(a=>a.mode==='fieldRestBuffGroup'));
 assert.equal(assertUniversalMatch(official,JSON.parse(JSON.stringify(s))),true);
});
test('R50 generic FIELD two printed MAIN modes are independently keyed and strict conditional',()=>{
 const printable=checkedBleachAddonDefinition(BLEACH_V2_ADDON_PROFILES.find(p=>p.id==='BLC-2-044'));
 const char={id:'R50-C',name:'Other Mukuro',color:'blue',type:'character',energy:0,
  ap:1,bp:1000,gen:1,traits:['涅骸部隊'],implementation:'vanilla'};
 // Synthetic ally tests a legal generic trait predicate, NOT a further official registered ID.
 const pack=createUniversalPack({id:'r50-dual-main-fixture',cards:[printable,char,
  ...Array.from({length:11},(_,i)=>({id:'R50-F'+i,name:'F'+i,color:'blue',
   type:'character',energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla'}))]});
 const counts=Object.fromEntries(Object.keys(pack.cards).map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:50044,first:0});
 const source=take(s,'BLC-2-044'),victim=take(s,'R50-C');
 source.ready=true;source.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=source;
 victim.ready=true;victim.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=victim;
 for(let i=0;i<4&&s.phase!=='main';i++)s=run(pack,s,{type:'next'});
 assert.ok(legalUniversalActions(pack,s).some(a=>a.mode==='fieldRetireTrait'));
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.mode==='fieldRestBuffGroup'));
 s=run(pack,s,{type:'activate',uid:source.uid,mode:'fieldRetireTrait'});
 assert.equal(s.pending?.kind,'main-field-trait-retire');
 const forged=structuredClone(s);forged.pending.sourceStamp++;
 assert.throws(()=>assertUniversalMatch(pack,forged),/dual FIELD trait-retirement/);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=run(pack,s,{type:'chooseFieldTraitRetire',uid:victim.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.ok(legalUniversalActions(pack,s).some(a=>a.mode==='fieldRestBuffGroup'));
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.mode==='fieldRetireTrait'));
 s=run(pack,s,{type:'activate',uid:source.uid,mode:'fieldRestBuffGroup'});
 assert.ok(!source.ready||s.players[0].energy.find(c=>c?.uid===source.uid).ready===false);
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.mode==='fieldRestBuffGroup'));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
