import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {beginTtgRed051Entry,legalTtgRed051Discards,resolveTtgRed051Discard,
 beginTtgRed052Entry,legalTtgRed052Discards,resolveTtgRed052Discard,
 legalTtgRed052Recovers,resolveTtgRed052Recover,
 legalTtgRed053Main,resolveTtgRed053Main} from '../dist/ttg-red-fourth-three.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const c=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id]?.nameJa,ready:true,stack:[],under:[],...extra});
const p=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],
 life:[],outside:[],removed:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:true}]});
const game=()=>({phase:'main',turn:3,active:0,status:'playing',players:[p(),p()]});
const inventory=(pl)=>[...pl.front.filter(Boolean),...pl.energy.filter(Boolean),...pl.hand,...pl.deck,...pl.life,...pl.outside,...pl.removed]
 .flatMap(function deep(x){return [x.uid,...(x.stack||[]).flatMap(deep),...(x.under||[]).flatMap(deep)]}).sort();
test('051 mandatory draw then discard: must not accidentally discard nothing or duplicate card',()=>{
 const s=game(),pl=s.players[0];pl.front[0]=c('sim','TTG-1-051',{enteredTurn:3});
 pl.hand=[c('hand','TTG-1-042')];pl.deck=[c('top','TTG-1-047')];
 const before=inventory(pl),started=beginTtgRed051Entry(s,{player:0,uid:'sim'});
 assert.equal(started.pending.kind,'ttgRed051Discard');
 assert.equal(started.players[0].hand.length,2);
 assert.throws(()=>resolveTtgRed051Discard(started,{type:'ttgRed051Discard',player:0,uid:'sim',discardUid:'bogus'}),/051/);
 const selected=legalTtgRed051Discards(started).find(x=>x.discardUid==='hand');
 const done=resolveTtgRed051Discard(started,selected);
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['top']);
 assert.deepEqual(done.players[0].outside.map(x=>x.uid),['hand']);
 assert.deepEqual(inventory(done.players[0]),before);
 assert.equal(done.pending,null);
});
test('052 may skip discard; if discarded, can recover that card itself or another <=2 red outside',()=>{
 const s=game(),pl=s.players[0];
 pl.front[0]=c('sim','TTG-1-052',{enteredTurn:3});
 pl.hand=[c('one','TTG-1-042')];
 pl.outside=[c('eligible','TTG-1-043'),c('tooCostly','TTG-1-050'),c('green','TTG-1-006')];
 const initial=inventory(pl),started=beginTtgRed052Entry(s,{player:0,uid:'sim'});
 const skip=resolveTtgRed052Discard(started,legalTtgRed052Discards(started)[0]);
 assert.equal(skip.pending,null);
 assert.deepEqual(skip.players[0].hand.map(x=>x.uid),['one']);
 const discarded=resolveTtgRed052Discard(started,legalTtgRed052Discards(started).find(x=>x.discardUid==='one'));
 assert.equal(discarded.pending.kind,'ttgRed052Recover');
 const offers=legalTtgRed052Recovers(discarded);
 assert.deepEqual(offers.filter(x=>x.recoverUid).map(x=>x.recoverUid).sort(),['eligible','one']);
 assert.throws(()=>resolveTtgRed052Recover(discarded,{...offers[0],recoverUid:'tooCostly'}),/052/);
 const recovered=resolveTtgRed052Recover(discarded,offers.find(x=>x.recoverUid==='one'));
 assert.deepEqual(recovered.players[0].hand.map(x=>x.uid),['one']);
 assert.deepEqual(inventory(recovered.players[0]),initial);
});
test('053 self REST and top1 milled; can repeat only if externally readied',()=>{
 let s=game();s.players[0].front[0]=c('sim','TTG-1-053');
 s.players[0].deck=[c('first','TTG-1-042'),c('second','TTG-1-043')];
 const before=inventory(s.players[0]),a=legalTtgRed053Main(s,0)[0];
 s=resolveTtgRed053Main(s,a);
 assert.deepEqual(s.players[0].outside.map(x=>x.uid),['first']);
 assert.equal(s.players[0].front[0].ready,false);
 assert.deepEqual(legalTtgRed053Main(s,0),[]);
 assert.deepEqual(inventory(s.players[0]),before);
 s.players[0].front[0].ready=true;
 s=resolveTtgRed053Main(s,legalTtgRed053Main(s,0)[0]);
 assert.deepEqual(s.players[0].outside.map(x=>x.uid),['first','second']);
});
test('053 shares legal player/AI action source, 051-053 kept within a 50 card full smoke deck',()=>{
 let s=game();s.players[0].front[0]=c('sim','TTG-1-053');
 const action=legalTtgRuleActions(s,0).find(x=>x.type==='ttgRed053Main');
 assert.ok(action);
 const done=dispatchTtgRuleAction(s,action);
 assert.equal(done.players[0].front[0].ready,false);
 for(const n of ['051','052','053'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 const counts=Object.fromEntries(['042','043','044','046','047','048','049','050','051','052','053','064'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 const match=runTtgCoreAiMatch(newTtgCoreMatch({decks:[counts,counts],seed:54}),{maxSteps:6000});
 assert.equal(match.truncated,false);
 assert.ok(assertTtgCoreState(match.state));
});
