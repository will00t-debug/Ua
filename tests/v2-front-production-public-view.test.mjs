import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalEnergyByColor,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const md=Object.fromEntries(['002','010','012','013','016','017','019','050','055','063','070']
 .map(n=>['MST-1-'+n,4]));
Object.assign(md,{'MST-1-001':2,'MST-1-057':2,'MST-1-029':2});
const sd=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043']
 .map(n=>['SLG-1-'+n,4]));
sd['SLG-1-041']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index!==-1)return cards.splice(index,1)[0];
 }
 throw Error('Missing real card '+id);
}
assert.deepEqual(validateUniversalDeck(mst,md),[]);
assert.deepEqual(validateUniversalDeck(slg,sd),[]);

for(const owner of [0,1])test('MST057 FRONT producer remains publicly visible and pays real costs after legal movement, seat '+owner,()=>{
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[md,sd]:[sd,md],first:owner,seed:575700+owner});
 const producer=take(s,owner,'MST-1-057');
 producer.ready=false; // Printed production is not conditional on READY.
 s.players[owner].energy[0]=producer;
 for(let i=1;i<=3;i++){
  const c=take(s,owner,'MST-1-050');c.ready=true;
  s.players[owner].energy[i]=c;
 }
 const payable=take(s,owner,'MST-1-057');
 s.players[owner].hand.push(payable);
 assert.equal(universalEnergyByColor(packs,s,owner).green,4);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'next'},{actor:owner});
 assert.equal(s.phase,'move');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='move'&&a.uid===producer.uid&&a.slot===0);
 assert.ok(action,'source-verified physical producer must have a legal move');
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:1-owner}),/Wrong player/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{...action,uid:payable.uid},{actor:owner}));
 assert.deepEqual(s,before,'invalid actions may not mutate live state');
 s=dispatchUniversalAction(packs,s,action,{actor:owner});
 assert.equal(s.players[owner].front[0].uid,producer.uid);
 assert.equal(s.players[owner].energy[0],null);
 assert.equal(universalEnergyByColor(packs,s,owner).green,4);
 const opponentView=universalPublicView(packs,s,1-owner);
 const ownView=universalPublicView(packs,s,owner);
 for(const view of [opponentView,ownView]){
  assert.equal(view.players[owner].front[0].uid,producer.uid);
  assert.equal(view.players[owner].front[0].produces,1);
  assert.equal(view.players[owner].energyTotal,4);
  assert.equal(view.players[owner].energyByColor.green,4);
 }
 assert.equal(opponentView.players[owner].hand,null);
 assert.equal(JSON.stringify(opponentView).includes(payable.uid),false,
  'the hidden physical hand UID must not leak via public production');
 assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:owner}),
  'the same physical UID may not move twice in one phase');
 const ap=s.players[owner].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,{type:'next'},{actor:owner});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===payable.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play,'FRONT producer must contribute to the real printed green-4 play cost');
 s=dispatchUniversalAction(packs,s,play,{actor:owner});
 assert.equal(s.players[owner].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.players[owner].front[1].uid,payable.uid);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].front[1].produces,1);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].energyTotal,5);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('preview consumes sanitized public produces values for FRONT and ENERGY lines',()=>{
 const source=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(source,/Number\.isInteger\(card\.produces\)/);
 assert.match(source,/text:'產能 '\+card\.produces/);
 assert.match(source,/function zoneSlots\(view,side,line/);
});
