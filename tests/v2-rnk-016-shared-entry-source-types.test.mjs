import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_BLUE_COMMON} from '../dist/rnk/jp-evidence-blue-common.mjs';
import {RNK_PROGRAMS_BLUE_COMMON} from '../dist/universal-v2/rnk/programs-blue-common.mjs';
import {rnkSharedCard} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';

const strict={kind:'selfEnteredByOwnEffect',turn:'any',sourceTypes:['character','event']};
const legacy={kind:'selfEnteredByOwnEffect',turn:'any'};
const definitions={
 'CHAR':{id:'CHAR',type:'character'},
 'EVT':{id:'EVT',type:'event'},
 'FLD':{id:'FLD',type:'field'}
};
const printed=ref=>definitions[ref.cardId];
const entry=(sourceCardId,reason='own-effect')=>({
 uid:'0-16',cardId:'RNK-1-016',owner:0,controller:0,
 from:'outside',to:'energy',reason,sourceCardId,
 sourceUid:'0-source'
});
const hit=(events,condition=strict)=>matchesV2LiveCondition(
 {active:0,zoneMoveEvents:events},0,'0-16',condition,printed,
 ()=>0,()=>0,()=>0
);
test('common live predicate accepts own CHARACTER and EVENT effect entries, not FIELD',()=>{
 assert.equal(hit([entry('CHAR')]),true);
 assert.equal(hit([entry('EVT')]),true);
 assert.equal(hit([entry('FLD')]),false);
 assert.equal(hit([entry(null)]),false);
 assert.equal(hit([entry('UNKNOWN')]),false);
 assert.equal(hit([entry('CHAR','rule')]),false);
 assert.equal(hit([entry('EVT','life-trigger')]),false);
});
test('latest own entry wins, not first earlier valid card; movement between field lines is ignored',()=>{
 assert.equal(hit([entry('CHAR'),entry('FLD')]),false);
 assert.equal(hit([entry('FLD'),entry('EVT')]),true);
 assert.equal(hit([{...entry('CHAR'),to:'front'},{
   ...entry('FLD'),from:'front',to:'energy'
 }]),true);
 assert.equal(hit([{...entry('CHAR'),owner:1,controller:1}]),false);
});
test('legacy any own-effect entry remains supported for all existing V2 titles',()=>{
 assert.equal(hit([entry('FLD')],legacy),true);
 assert.equal(hit([entry(null)],legacy),true);
 assert.equal(hit([entry('EVT','opponent-effect')],legacy),false);
});
test('shared pack validates only the exact CHARACTER/EVENT source kinds, closes malformed predicates',()=>{
 const id='RNK-1-016',source=RNK_TC_CATALOG.find(c=>c.id===id),
   jap=RNK_JP_EVIDENCE_BLUE_COMMON[id],program=RNK_PROGRAMS_BLUE_COMMON[id];
 assert.equal(createRnkBcdBatchStagingPack().cards[id].name,'四乃森 蒼紫');
 assert.equal(program.ready,true);
 for(const bad of [['character'],['character','field'],['event','event'],[],['field','character','event']]){
   const malformed=rnkSharedCard(source,{
     ...program,effects:{onPlay:[{
       op:'ifLiveThen',when:{kind:'selfEnteredByOwnEffect',turn:'any',sourceTypes:bad},
       then:[{op:'draw',count:1}]
     }]}
   },jap);
   assert.throws(()=>createUniversalPack({id:'rnk',cards:[malformed]}),
     /invalid own-effect entry source kinds|invalid or cyclic passive condition/,
     JSON.stringify(bad));
 }
});
