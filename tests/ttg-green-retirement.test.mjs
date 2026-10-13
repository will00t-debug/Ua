import test from 'node:test';
import assert from 'node:assert/strict';
import {sidelineGreen030} from '../dist/ttg-green-030.mjs';
import {legalGreenRetirementChoices,resolveGreenRetirementChoice,flattenSidelinedPile} from '../dist/ttg-green-retirement.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const c=(uid,id,more={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...more});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],deck:[],hand:[],life:[],outside:[],removed:[],apCards:[{uid:'ap',ready:true}],energyProduced:{green:0,red:0},turnCount:2});
const state=()=>{
 const s={status:'playing',active:0,phase:'attack',turn:9,energyMode:'derive',players:[pl(),pl()]},p=s.players[0];
 p.front[0]=c('top','TTG-1-030',{stack:[c('base','TTG-1-006')]});
 p.energy[0]=c('site','TTG-1-034');
 p.energy[1]=c('g1','TTG-1-017');p.energy[2]=c('g2','TTG-1-017');
 return s;
};
const all=p=>[...p.hand,...p.deck,...p.life,...p.outside,...p.removed,
 ...p.front.filter(Boolean),...p.energy.filter(Boolean)]
 .flatMap(function rec(c){return [c.uid,...(c.stack||[]).flatMap(rec),...(c.under||[]).flatMap(rec)]}).sort();
test('030/034 simultaneous exit: both orderings are available, and physical 030 capture remains facedown',()=>{
 for(const first of ['030','034']){
  const s=state(),original=all(s.players[0]),pending=sidelineGreen030(s,{player:0,uid:'top'});
  assert.equal(pending.pending.kind,'greenRetireOrder');
  const options=legalGreenRetirementChoices(pending);
  assert.ok(options.some(x=>x.retirementEffect==='030'));
  assert.ok(options.some(x=>x.retirementEffect==='034'));
  const a=options.find(x=>x.retirementEffect===first&&
   (first==='030'?x.mode==='recover'&&x.line==='front':x.siteUid==='site'));
  const r=resolveGreenRetirementChoice(pending,a);
  assert.equal(r.pending.kind,'greenRetireOrder');
  assert.deepEqual(r.pending.remaining,[first==='030'?'034':'030']);
  assert.deepEqual(all(r.players[0]),original);
  const b=legalGreenRetirementChoices(r).find(x=>x.retirementEffect!==first&&
   (first==='030'?x.siteUid==='site':x.mode==='recover'&&x.line==='front'));
  const done=resolveGreenRetirementChoice(r,b);
  assert.equal(done.pending,null);
  assert.equal(done.players[0].energy[0].under[0].uid,'top');
  assert.equal(done.players[0].energy[0].under[0].faceDown,true);
  assert.ok(done.players[0].front.some(x=>x?.uid==='base'));
  assert.deepEqual(all(done.players[0]),original);
 }
});
test('030/034 simultaneous decisions are exposed to human and AI, and illegal stage rejected without AP/card loss',()=>{
 const s=sidelineGreen030(state(),{player:0,uid:'top'}),before=JSON.stringify(s);
 const options=legalTtgRuleActions(s,0);
 assert.ok(options.some(x=>x.retirementEffect==='030'));
 assert.ok(options.some(x=>x.retirementEffect==='034'));
 assert.throws(()=>dispatchTtgRuleAction(s,{type:'green034Capture',player:0,retirementEffect:'034',retiredUid:'top',siteUid:'unknown'}));
 const ai=chooseTtgRuleAiAction(s,0);
 assert.ok(['030','034'].includes(ai.retirementEffect));
 const moved=dispatchTtgRuleAction(s,ai);
 assert.equal(moved.pending.kind,'greenRetireOrder');
 assert.equal(JSON.stringify(s),before);
});
test('physically sidelined ordinary multi-Raid piles are public individual cards, not duplicated nested stack',()=>{
 const pile=c('top','TTG-1-031',{stack:[c('base','TTG-1-009')],under:[c('hidden','TTG-1-027',{faceDown:true})]});
 const out=flattenSidelinedPile(pile);
 assert.deepEqual(out.map(x=>x.uid),['top','base','hidden']);
 assert.ok(out.every(x=>!x.faceDown&&!x.stack.length&&!x.under.length));
});
