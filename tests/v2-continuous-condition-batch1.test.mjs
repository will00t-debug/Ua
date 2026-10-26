import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalBp,universalEnergy,
 universalEnergyByColor,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
const p=registeredV2TitlePack('solo-leveling'),packs=[p,p];
const ids=['001','005','006','010','012','015','016','018','026','032','036','037','038'];
const deck=Object.fromEntries(ids.map((id,i)=>['SLG-1-'+id,i===12?2:4]));
function fresh(){return newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:817});}
function take(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[owner][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Physical card '+id+' not in source match');
}
function field(s,owner,id,line,slot){
 const c=take(s,owner,id);c.ready=true;
 assert.equal(s.players[owner][line][slot],null);
 s.players[owner][line][slot]=c;return c;
}
function moveToOutside(s,owner,count){
 for(let i=0;i<count;i++){
  const c=s.players[owner].deck.shift();
  assert.ok(c,'fixture must retain real cards');
  s.players[owner].outside.push(c);
 }
}
function phase(s,target,localPacks=packs){
 for(let i=0;s.phase!==target&&i<5;i++)
  s=dispatchUniversalAction(localPacks,s,{type:'next'});
 assert.equal(s.phase,target);return s;
}
test('registered official SLG 001/010 immutable source pinned, exact ongoing predicates and life',()=>{
 for(const [id,min,bp,trigger,energy,body] of [
  ['SLG-1-001',5,500,null,1,2500],
  ['SLG-1-010',10,1000,'draw',3,3000]
 ]){
  const c=p.cards[id];
  assert.ok(c,'must go through formal title-pack registry');
  assert.deepEqual(c.passiveBonuses,[{condition:{kind:'outsideCount',turn:'own',min},bp}]);
  assert.equal(c.bp,body);assert.equal(c.energy,energy);
  assert.equal(c.gen,1);assert.equal(c.trigger,trigger);
  assert.deepEqual(c.effects,{});
  assert.ok(Object.isFrozen(c.passiveBonuses));
 }
 const rin=p.cards['SLG-1-003'];
 assert.equal(rin.passiveBonuses[0].extraEnergy,1);
 assert.equal(rin.effects.onOutsideRecover[0].op,'buffOwnField');
 const monarch=p.cards['SLG-1-022'];
 assert.equal(monarch.fieldTraitEnergyDiscount.trait,'影の軍団');
 assert.equal(monarch.energyAttackSwap.trait,'影の軍団');
 assert.equal(monarch.printedImpact,1);
});
test('SLG-001 own turn outside five exactly; opponent turn and fourth card both disable',()=>{
 const s=fresh(),c=field(s,0,'SLG-1-001','front',0);
 assert.equal(universalBp(packs,s,c),2500);
 moveToOutside(s,0,4);assert.equal(universalBp(packs,s,c),2500);
 moveToOutside(s,1,10);assert.equal(universalBp(packs,s,c),2500,'opponent outside never counted');
 moveToOutside(s,0,1);assert.equal(universalBp(packs,s,c),3000);
 s.active=1;assert.equal(universalBp(packs,s,c),2500);
 s.active=0;assert.equal(universalBp(packs,s,c),3000);
 const taken=s.players[0].outside.pop();s.players[0].hand.push(taken);
 assert.equal(universalBp(packs,s,c),2500,'returning a card retracts passive without cache');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-010 own turn outside ten; Raid physical layers/hand/energy do not count as outside',()=>{
 const s=fresh(),c=field(s,0,'SLG-1-010','energy',0);
 assert.equal(universalBp(packs,s,c),3000);
 moveToOutside(s,0,9);assert.equal(universalBp(packs,s,c),3000);
 moveToOutside(s,0,1);assert.equal(universalBp(packs,s,c),4000);
 assert.deepEqual(universalPublicView(packs,s,0).players[0].energy[0].produces,1,
  'BP bonus cannot change printed energy');
 c.ready=false;assert.equal(universalBp(packs,s,c),4000,'passive is not an ACTIVE trigger');
 s.active=1;assert.equal(universalBp(packs,s,c),3000);
 s.active=0;assert.equal(assertUniversalMatch(packs,s),true);
});
test('live condition library: own-front NAME, distinct from trait CARD COPIES; excludeSelf and turn',()=>{
 const s=fresh(),c=field(s,0,'SLG-1-001','front',0);
 const name=p.cards[c.cardId].name;
 const resolve=x=>p.cards[x.cardId];
 const testCond=x=>matchesV2LiveCondition(s,0,c.uid,x,resolve,()=>0);
 assert.equal(testCond({kind:'ownNameExists',turn:'own',name,zone:'front',excludeSelf:true}),false);
 assert.equal(testCond({kind:'ownNameExists',turn:'own',name,zone:'front',excludeSelf:false}),true);
 const other=field(s,0,'SLG-1-001','energy',0);
 assert.equal(testCond({kind:'ownNameExists',turn:'own',name,zone:'energy',excludeSelf:true}),true);
 assert.equal(testCond({kind:'ownNameExists',turn:'own',name,zone:'front',excludeSelf:true}),false);
 assert.equal(testCond({kind:'ownNameExists',turn:'opponent',name,zone:'field',excludeSelf:false}),false);
 assert.ok(other.uid!==c.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict schema refuses ambiguous fields, unsupported predicates and ENERGY self-referential loops',()=>{
 const def=p.cards['SLG-1-001'];
 const basic={id:'QA-001',name:'QA',type:'character',color:'purple',
  energy:0,ap:1,bp:1500,gen:1,implementation:'dsl',effects:{}};
 const base={kind:'outsideCount',turn:'own',min:5};
 const compile=(condition,{bp=500,extraEnergy}={})=>createUniversalPack({
  id:'qa-conditions',cards:[{...basic,passiveBonuses:[
   {condition,...(bp?{bp}:{}),...(extraEnergy?{extraEnergy}:{})}]}]});
 assert.ok(compile(base).cards['QA-001']);
 for(const invalid of [
  {kind:'outsideCount',turn:'own',min:0},
  {kind:'outsideCount',turn:'any',min:5,zone:'front'},
  {kind:'ownNameExists',turn:'own',zone:'field',name:'QA'},
  {kind:'ownTraitCount',turn:'own',zone:'energy',trait:'Guild',min:2,excludeSelf:'no'},
  {kind:'other',turn:'own',min:1},
  {kind:'outsideCount',turn:'ours',min:1}
 ])assert.throws(()=>compile(invalid),/invalid(?: or cyclic)? passive condition/,JSON.stringify(invalid));
 assert.throws(()=>compile({kind:'ownEnergyAtLeast',turn:'own',min:2},
  {bp:0,extraEnergy:1}),/cyclic passive condition/);
 assert.throws(()=>createUniversalPack({id:'qa-bad',cards:[{...basic,
  implementation:'vanilla',passiveBonuses:[{condition:base,bp:500}]}]}),/claims vanilla/);
 assert.equal(def.gen,1);
});
test('reusable energy passive is live and never helps its own pre-play energy requirement',()=>{
 const base=(id,override={})=>({
  id,name:id,color:'purple',energy:0,ap:1,bp:1500,gen:1,
  type:'character',implementation:'vanilla',...override
 });
 const cards=Array.from({length:13},(_,i)=>base('QA-'+i,i===0?{
  energy:3,implementation:'dsl',passiveBonuses:[{condition:
   {kind:'outsideCount',turn:'any',min:5},extraEnergy:2}]
 }:{}));
 const qa=createUniversalPack({id:'qa-passive-energy',cards});
 const d=Object.fromEntries(cards.map((x,i)=>[x.id,i===12?2:4]));
 let s=newUniversalMatch([qa,qa],{decks:[d,d],first:0,seed:18});
 const target=s.players[0].deck.find(x=>x.cardId==='QA-0')||
  s.players[0].hand.find(x=>x.cardId==='QA-0')||
  s.players[0].life.find(x=>x.cardId==='QA-0');
 assert.ok(target);
 for(const zone of ['deck','hand','life']){
  const a=s.players[0][zone],i=a.findIndex(c=>c.uid===target.uid);
  if(i>=0){a.splice(i,1);break;}
 }
 s.players[0].hand.push(target);
 for(let i=1;i<=2;i++){
  let q;
  for(const zone of ['deck','hand','life']){
   const a=s.players[0][zone],j=a.findIndex(x=>x.cardId==='QA-'+i);
   if(j>=0){q=a.splice(j,1)[0];break;}
  }
  assert.ok(q);q.ready=true;s.players[0].energy[i-1]=q;
 }
 while(s.players[0].outside.length<5)s.players[0].outside.push(s.players[0].deck.shift());
 s=phase(s,'main',[qa,qa]);
 const play=legalUniversalActions([qa,qa],s).find(a=>a.type==='play'&&a.uid===target.uid);
 assert.equal(play,undefined,'cannot pay 3 energy with only pre-play 2');
 const e=s.players[0].deck.shift();e.ready=true;s.players[0].energy[2]=e;
 const legal=legalUniversalActions([qa,qa],s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='energy');
 assert.ok(legal);
 s=dispatchUniversalAction([qa,qa],s,legal);
 assert.equal(universalEnergyByColor([qa,qa],s,0).purple,6,'three existing energy + new base1 and +2');
 assert.equal(universalEnergy([qa,qa],s,0),6);
 assert.equal(assertUniversalMatch([qa,qa],s),true);
});
