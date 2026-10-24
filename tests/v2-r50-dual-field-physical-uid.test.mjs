import test from 'node:test';
import assert from 'node:assert/strict';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition}
 from '../dist/universal-v2/bleach-pack.mjs';
import {createUniversalPack,validateUniversalDeck}
 from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

// Regression for a shared engine rule: each physical copy of a FIELD has its
// OWN once-per-turn MAIN usage. A printed-name key incorrectly makes the
// second copy unusable after the first copy resolves.
// Only the FIELD is official; other cards are synthetic controlled fixtures.
const field=checkedBleachAddonDefinition(
 BLEACH_V2_ADDON_PROFILES.find(p=>p.id==='BLC-2-044'));
const cards=[field,...Array.from({length:12},(_,i)=>({
 id:'R50-DUAL-'+i,name:'Independent character '+i,type:'character',
 color:'blue',energy:0,ap:1,bp:1000,gen:1,
 traits:i<3?['涅骸部隊']:[],implementation:'vanilla'
}))];
const pack=createUniversalPack({id:'r50-dual-field-physical-uid',cards});
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[0][zone],index=arr.findIndex(c=>c.cardId===id);
  if(index>=0)return arr.splice(index,1)[0];
 }
 throw Error('Missing source physical card '+id);
}
const run=(s,a)=>dispatchUniversalAction(pack,s,a);
function setup(){
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:500442,first:0});
 const fields=[take(s,'BLC-2-044'),take(s,'BLC-2-044')];
 const victims=[0,1,2].map(i=>take(s,'R50-DUAL-'+i));
 fields.forEach((c,i)=>{
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=c;
 });
 victims.forEach((c,i)=>{
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[i]=c;
 });
 while(s.phase!=='main')s=run(s,{type:'next'});
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,fields,victims};
}
const available=(s,uid,mode)=>legalUniversalActions(pack,s).some(a=>
 a.type==='activate'&&a.uid===uid&&a.mode===mode);

test('R50 two physical copies independently pay each printed FIELD retirement MAIN',()=>{
 let {s,fields,victims}=setup();
 assert.ok(fields.every(c=>available(s,c.uid,'fieldRetireTrait')));
 s=run(s,{type:'activate',uid:fields[0].uid,mode:'fieldRetireTrait'});
 assert.equal(s.pending?.kind,'main-field-trait-retire');
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 s=run(s,{type:'chooseFieldTraitRetire',uid:victims[0].uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===victims[0].uid));
 assert.equal(available(s,fields[0].uid,'fieldRetireTrait'),false);
 assert.equal(available(s,fields[1].uid,'fieldRetireTrait'),true,
  'second identical printed FIELD retains its own once-per-turn ability');
 s=run(s,{type:'activate',uid:fields[1].uid,mode:'fieldRetireTrait'});
 assert.equal(s.pending?.sourceUid,fields[1].uid);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 s=run(s,{type:'chooseFieldTraitRetire',uid:victims[1].uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===victims[1].uid));
 assert.ok(fields.every(c=>!available(s,c.uid,'fieldRetireTrait')));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('R50 identical FIELD copies independently REST for the second printed MAIN',()=>{
 let {s,fields,victims}=setup();
 s=run(s,{type:'activate',uid:fields[0].uid,mode:'fieldRetireTrait'});
 s=run(s,{type:'chooseFieldTraitRetire',uid:victims[0].uid});
 assert.ok(fields.every(c=>available(s,c.uid,'fieldRestBuffGroup')));
 s=run(s,{type:'activate',uid:fields[0].uid,mode:'fieldRestBuffGroup'});
 assert.equal(available(s,fields[0].uid,'fieldRestBuffGroup'),false);
 assert.equal(available(s,fields[1].uid,'fieldRestBuffGroup'),true,
  'second printed FIELD must not inherit first copy usage');
 s=run(s,{type:'activate',uid:fields[1].uid,mode:'fieldRestBuffGroup'});
 assert.ok(fields.every(c=>s.players[0].energy.some(x=>x?.uid===c.uid&&!x.ready)));
 assert.ok(fields.every(c=>!available(s,c.uid,'fieldRestBuffGroup')));
 const survivor=s.players[0].front.find(c=>c?.uid===victims[2].uid);
 assert.ok(survivor);
 assert.equal(survivor.buffs.filter(b=>b.bp===1000&&b.untilTurn===s.turn).length,2);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
