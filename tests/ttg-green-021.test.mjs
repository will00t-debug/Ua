import test from 'node:test';
import assert from 'node:assert/strict';
import {legalGreen021Step,resolveGreen021Step,beginGreen021AttackPhase,legalGreen021AttackStartChoices,resolveGreen021AttackStart} from '../dist/ttg-green-021.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction,resolveTtgTurnEnd} from '../dist/ttg-rule-adapter.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const c=(uid,id,attrs={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:false,stack:[],under:[],...attrs});
const pl=()=>({hand:[],deck:[],life:[],outside:[],removed:[],front:[null,null,null,null],energy:[null,null,null,null],apCards:[],turnCount:2});
const state=()=>({phase:'attack',active:0,turn:8,players:[pl(),pl()],energyMode:'external',log:[]});
const physical=pl=>{
 const visit=c=>[c.uid,...(c.stack||[]).flatMap(visit),...(c.under||[]).flatMap(visit)];
 return [...pl.hand,...pl.deck,...pl.life,...pl.outside,...pl.removed,...pl.front.filter(Boolean),...pl.energy.filter(Boolean)].flatMap(visit).sort();
};
function setup(){
 const s=state(),p=s.players[0];
 p.energy[0]=c('yoko','TTG-1-021');
 p.front[0]=c('gurren','TTG-1-029',{
  stack:[c('base','TTG-1-009')],under:[c('fd','TTG-1-027',{faceDown:true})]
 });
 return s;
}
test('Q2271 021 requires Gurren-Lagann-name character WITH facedown card below',()=>{
 let s=setup();
 assert.deepEqual(legalGreen021AttackStartChoices(s),[],'not offered before explicit phase-start hook');
 const begin=beginGreen021AttackPhase(s,0);
 assert.equal(begin.pending.kind,'ttgGreen021PhaseStart');
 assert.ok(legalGreen021AttackStartChoices(begin).some(x=>x.mode==='move'&&x.uid==='yoko'));
 const without=setup();without.players[0].front[0].under=[];
 assert.equal(beginGreen021AttackPhase(without,0).pending,undefined);
 without.players[0].front[0].under=[c('up','TTG-1-027',{faceDown:false})];
 assert.equal(beginGreen021AttackPhase(without,0).pending,undefined);
});
test('021 STEP moves own Front to empty Energy without changing REST or paying AP',()=>{
 const s=state();s.phase='move';
 s.players[0].front[0]=c('yoko','TTG-1-021',{ready:false});
 s.players[0].energy[0]=c('occupied','TTG-1-005');
 assert.deepEqual(legalGreen021Step(s,{player:0,uid:'yoko'}).map(x=>x.slot),[1,2,3]);
 assert.throws(()=>resolveGreen021Step(s,{player:0,uid:'yoko',slot:0}));
 const before=physical(s.players[0]),r=resolveGreen021Step(s,{player:0,uid:'yoko',slot:2});
 assert.equal(r.players[0].front[0],null);
 assert.equal(r.players[0].energy[2].uid,'yoko');
 assert.equal(r.players[0].energy[2].ready,false);
 assert.deepEqual(physical(r.players[0]),before);
});
test('021 free-front attack start moves Yoko with +1000 BP until current turn end',()=>{
 const s=setup(),initial=JSON.stringify(s),before=physical(s.players[0]);
 const pending=beginGreen021AttackPhase(s,0);
 const legal=legalGreen021AttackStartChoices(pending);
 const move=legal.find(x=>x.mode==='move'&&x.slot===2);
 assert.ok(move);
 const r=resolveGreen021AttackStart(pending,move);
 assert.equal(r.players[0].energy[0],null);
 assert.equal(r.players[0].front[2].uid,'yoko');
 assert.equal(r.players[0].front[2].currentBp,TTG_BY_ID['TTG-1-021'].bp+1000);
 assert.equal(r.players[0].front[2].ready,false);
 assert.equal(r.pending,null);assert.equal(r.players[0].green021UsedAtTurn,s.turn);
 assert.deepEqual(physical(r.players[0]),before);
 assert.equal(JSON.stringify(s),initial);
 const ended=resolveTtgTurnEnd(r);
 assert.equal(ended.players[0].front[2].currentBp,TTG_BY_ID['TTG-1-021'].bp);
});
test('Q2269 when Front is full, select ONE displaced own character into REMOVED, NOT OUTSIDE',()=>{
 const s=setup(),p=s.players[0];
 p.front[1]=c('first','TTG-1-006');
 p.front[2]=c('replace','TTG-1-029',{stack:[c('anotherBase','TTG-1-009')],under:[c('oldfd','TTG-1-035',{faceDown:true})]});
 p.front[3]=c('last','TTG-1-005');
 const before=physical(p),pending=beginGreen021AttackPhase(s,0);
 const options=legalGreen021AttackStartChoices(pending);
 assert.equal(options.filter(x=>x.mode==='move').length,4);
 assert.ok(!options.some(x=>x.mode==='move'&&x.replaceUid===null));
 assert.throws(()=>resolveGreen021AttackStart(pending,{type:'green021PhaseStart',player:0,mode:'move',uid:'yoko',slot:2,replaceUid:'first'}));
 const pick=options.find(x=>x.replaceUid==='replace');
 const r=resolveGreen021AttackStart(pending,pick);
 assert.equal(r.players[0].front[2].uid,'yoko');
 assert.equal(r.players[0].removed.length,1);
 assert.equal(r.players[0].removed[0].uid,'replace');
 assert.deepEqual(r.players[0].removed[0].under.map(x=>x.uid),['oldfd']);
 assert.deepEqual(r.players[0].outside,[]);
 assert.deepEqual(physical(r.players[0]),before);
});
test('Q2270 two Yoko copies share ONE name activation per turn; decline is legal',()=>{
 const s=setup();
 s.players[0].energy[1]=c('yoko2','TTG-1-021');
 const pending=beginGreen021AttackPhase(s,0),options=legalGreen021AttackStartChoices(pending);
 assert.ok(options.some(x=>x.uid==='yoko2'));
 const r=resolveGreen021AttackStart(pending,options.find(x=>x.mode==='move'&&x.uid==='yoko2'));
 assert.equal(r.players[0].front.filter(x=>x?.cardId==='TTG-1-021').length,1);
 assert.equal(r.players[0].energy[0].uid,'yoko');
 assert.throws(()=>beginGreen021AttackPhase(r,0));
 const skip=resolveGreen021AttackStart(pending,{type:'green021PhaseStart',player:0,mode:'decline'});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].green021UsedAtTurn,undefined);
 assert.ok(!skip.players[0].front.some(x=>x?.uid==='yoko'));
});
test('021 choices are shared by human legal dispatcher and AI (including replacement)',()=>{
 const s=setup(),pending=beginGreen021AttackPhase(s,0);
 const legal=legalTtgRuleActions(pending,0);
 assert.equal(legal.filter(x=>x.mode==='move').length,3);
 assert.throws(()=>dispatchTtgRuleAction(pending,{type:'green021PhaseStart',player:0,mode:'move',uid:'yoko',slot:0,replaceUid:null}));
 const ai=chooseTtgRuleAiAction(pending,0);
 assert.equal(ai.mode,'move');assert.equal(ai.replaceUid,null);
 const r=dispatchTtgRuleAction(pending,ai);
 assert.equal(r.pending,null);assert.equal(r.players[0].front[ai.slot].uid,'yoko');
});
