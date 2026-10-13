import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTtgButa063,resolveTtgMainEndRetire,resolveTtgYoko065Step} from '../dist/ttg-pending-rules.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const c=(id,uid,extra={})=>({uid,cardId:id,ready:true,...extra});
const player=()=>({front:[null,null,null,null],energy:[null,null,null,null],outside:[],hand:[],deck:[],apCards:[]});
const match=()=>({turn:4,active:0,phase:'main',players:[player(),player()]});
test('063 printed turn-1 REST bonus cannot be repeated even if external effect readies it',()=>{
 const s=match();s.players[0].energy[0]=c('TTG-1-063','buta');
 const x=resolveTtgButa063(s,{player:0,uid:'buta'});
 assert.equal(x.players[0].energy[0].energyBonus,1);
 x.players[0].energy[0].ready=true;
 assert.deepEqual(legalTtgRuleActions(x,0).filter(a=>a.type==='activateButa063'),[]);
 assert.throws(()=>resolveTtgButa063(x,{player:0,uid:'buta'}),/not used/);
 const retired=resolveTtgMainEndRetire(x);
 assert.equal(retired.players[0].energy[0],null);
 assert.equal(retired.players[0].outside[0].uid,'buta');
});
test('064 no printed ability, DRAW trigger only, and 065 STEP moves without activation',()=>{
 assert.equal(TTG_BY_ID['TTG-1-064'].trigger,'draw');
 const s=match();s.phase='move';
 s.players[0].front[0]=c('TTG-1-065','yoko',{ready:false});
 const stepped=resolveTtgYoko065Step(s,{player:0,uid:'yoko',toSlot:1});
 assert.equal(stepped.players[0].front[0],null);
 assert.equal(stepped.players[0].energy[1].uid,'yoko');
 assert.equal(stepped.players[0].energy[1].ready,false);
});
