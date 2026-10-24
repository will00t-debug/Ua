import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,universalCardEnergy,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const mstIds=['001','002','003','010','012','013','016','017','019','020','024','027','029'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-029']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043']
 .map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing actual '+id);
}
function place(s,p,id,line,slot){
 assert.equal(s.players[p][line][slot],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;
 return c;
}
function main(packs,s){
 for(let i=0;i<4&&s.phase!=='main';i++){
  const step=legalUniversalActions(packs,s).find(x=>x.type==='next');
  assert.ok(step);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(s.phase,'main');return s;
}
function setupEnergy(owner=0){
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{
  decks:owner===0?[mstDeck,slgDeck]:[slgDeck,mstDeck],
  seed:16024+owner,first:owner});
 const source=place(s,owner,'MST-1-016','energy',0);
 s=main(packs,s);
 return {packs,s,source,owner};
}

test('MST016/024 source-complete official JP print and exact generic V2 profile',()=>{
 const z=MST_V2_OFFICIAL_BY_ID['MST-1-016'],r=MST_V2_OFFICIAL_BY_ID['MST-1-024'];
 assert.equal(z.effectJa,'〖起動メイン〗 〖レストにする〗 〖ターン1〗 このキャラはこのターン中、発生エナジー+ 〖青〗 と「メインフェイズ終了時、このキャラを退場させる。」を得る。');
 assert.equal(r.effectJa,'〖自分のターン中〗 自分の場に〈ロキシー〉がある場合、このキャラはBP+1000。');
 assert.deepEqual([mst.cards['MST-1-016'].name,mst.cards['MST-1-016'].color,
  mst.cards['MST-1-016'].energy,mst.cards['MST-1-016'].ap,
  mst.cards['MST-1-016'].bp,mst.cards['MST-1-016'].gen,
  mst.cards['MST-1-016'].trigger],['ゼニス','blue',0,1,1000,1,null]);
 assert.deepEqual([mst.cards['MST-1-024'].name,mst.cards['MST-1-024'].color,
  mst.cards['MST-1-024'].energy,mst.cards['MST-1-024'].ap,
  mst.cards['MST-1-024'].bp,mst.cards['MST-1-024'].gen,
  mst.cards['MST-1-024'].trigger],['ルーデウス','blue',1,1,2000,1,'draw']);
 assert.deepEqual(mst.cards['MST-1-016'].mainAbility,
  slg.cards['SLG-1-013'].mainAbility);
 assert.deepEqual(mst.cards['MST-1-024'].passiveBonuses,[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:true,
   name:'ロキシー'},bp:1000}]);
 assert.equal(mst.cards['MST-1-016'].implementation,'dsl');
 assert.equal(mst.cards['MST-1-024'].implementation,'dsl');
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
test('P0 MST016 MAIN own-REST pays once, gains BLUE1, scheduled retirement on MAIN close',()=>{
 const {packs,source,s:initial}=setupEnergy();
 const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 const ap=initial.players[0].apCards.filter(x=>x.ready).length;
 assert.equal(universalEnergyByColor(packs,initial,0).blue,1);
 assert.ok(legalUniversalActions(packs,initial).some(x=>JSON.stringify(x)===JSON.stringify(action)));
 assert.match(uiActionLabel(action,{pack:mst,state:initial}),/主要階段結束退場/);
 assert.throws(()=>dispatchUniversalAction(packs,initial,action,{actor:1}),/Wrong player/);
 let s=dispatchUniversalAction(packs,initial,action,{actor:0});
 assert.equal(initial.players[0].energy[0].ready,true,'reducer preserves caller');
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalEnergyByColor(packs,s,0).blue,2);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap,'activation spends no AP');
 assert.equal(s.delayedEffects.length,1);
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.type==='activate'&&x.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST016 P1 vs SLG P0: correct owner energy, no opponent activation or UID leakage',()=>{
 const {packs,s:before,source,owner}=setupEnergy(1);
 assert.equal(owner,1);
 assert.ok(source.uid.startsWith('1-'));
 assert.equal(universalEnergyByColor(packs,before,1).blue,1);
 assert.ok(!legalUniversalActions(packs,before).some(a=>a.type==='activate'&&a.uid==='0-fake'));
 let s=dispatchUniversalAction(packs,before,
  {type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'},{actor:1});
 assert.equal(universalEnergyByColor(packs,s,1).blue,2);
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST016 cannot MAIN-activate while FRONT, REST or on another player turn',()=>{
 const {packs,s:initial,source}=setupEnergy();
 const s=structuredClone(initial);
 s.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 const q=structuredClone(initial);
 q.players[0].energy[0]=null;
 q.players[0].front[0]=source;
 assert.ok(!legalUniversalActions(packs,q).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,q),true);
});
test('MST024 live own-turn name predicate: own Roxy in ENERGY or FRONT adds 1000; opponent turn drops',()=>{
 const packs=[mst,slg];
 const s=newUniversalMatch(packs,{decks:[mstDeck,slgDeck],first:0,seed:2424});
 const r=place(s,0,'MST-1-024','front',0);
 assert.equal(universalBp(packs,s,r),2000);
 const roxy=place(s,0,'MST-1-027','energy',0);
 assert.equal(universalBp(packs,s,r),3000);
 assert.equal(universalPublicView(packs,s,1).players[0].front[0].bp,3000);
 roxy.ready=false;
 assert.equal(universalBp(packs,s,r),3000,'REST ally exists');
 s.active=1;
 assert.equal(universalBp(packs,s,r),2000);
 s.active=0;
 s.players[0].energy[0]=null;s.players[0].front[1]=roxy;
 assert.equal(universalBp(packs,s,r),3000,'FRONT ally also satisfies');
 s.players[0].front[1]=null;s.players[0].outside.push(roxy);
 assert.equal(universalBp(packs,s,r),2000,'outside no longer counts');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST024 cannot take named ally from opponent field, own hand, outside or underlayers',()=>{
 const packs=[mst,mst],s=newUniversalMatch(packs,{decks:[mstDeck,mstDeck],first:0,seed:2425});
 const r=place(s,0,'MST-1-024','front',0);
 place(s,1,'MST-1-027','front',0);
 const hand=take(s,0,'MST-1-027');
 const out=take(s,0,'MST-1-027');
 assert.notEqual(hand.uid,out.uid);
 s.players[0].hand.push(hand);
 s.players[0].outside.push(out);
 assert.equal(universalBp(packs,s,r),2000);
 const q=structuredClone(s);
 const roxy=q.players[0].hand.splice(q.players[0].hand.findIndex(c=>c.uid===hand.uid),1)[0];
 q.players[0].energy[0]=roxy;
 assert.equal(universalBp(packs,q,q.players[0].front[0]),3000);
 q.players[0].energy[0]=null;q.players[0].hand.push(roxy);
 assert.equal(universalBp(packs,q,q.players[0].front[0]),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,q),true);
});
test('generic source schema rejects fake delayed energy and illegal own-name bonus fields',()=>{
 const base={id:'QA-1',name:'QA',color:'blue',type:'character',energy:0,
  ap:1,bp:1000,gen:1,implementation:'dsl',effects:{}};
 const create=c=>createUniversalPack({id:'source-locked-qa',cards:[c]});
 const mainAbility={op:'restSelfGainEnergyRetireEndMain',energyOnly:true,
  oncePerTurn:true,extraEnergy:1};
 assert.doesNotThrow(()=>create({...base,mainAbility}));
 for(const bad of [
  {...mainAbility,oncePerTurn:false},
  {...mainAbility,energyOnly:false},
  {...mainAbility,extraEnergy:0},
  {...mainAbility,frontOnly:true}
 ])assert.throws(()=>create({...base,mainAbility:bad}),/unsupported main action/);
 const good={kind:'ownNameExists',turn:'own',zone:'field',
  excludeSelf:true,name:'ロキシー'};
 assert.doesNotThrow(()=>create({...base,passiveBonuses:[{condition:good,bp:1000}]}));
 for(const bad of [
  {...good,name:''},
  {...good,turn:'other'},
  {...good,zone:'outside'},
  {...good,excludeSelf:'true'},
  {...good,allowOpponent:true},
  {...good,min:1}
 ])assert.throws(()=>create({...base,passiveBonuses:[{condition:bad,bp:1000}]}),/invalid/);
 assert.throws(()=>create({...base,implementation:'vanilla',mainAbility}),/vanilla/);
});
