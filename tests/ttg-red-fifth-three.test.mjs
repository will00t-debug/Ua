import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {red054Conditions,red054BpBonus,red054ImpactNull,red056CanAttack,
 beginTtgRed054Entry,legalTtgRed054Choices,resolveTtgRed054Mill,
 beginTtgRed055Entry,legalTtgRed055Mills,resolveTtgRed055Mill,
 legalTtgRed055Discards,resolveTtgRed055Discard,legalTtgRed055Recovers,
 resolveTtgRed055Recover,legalRed056AfterAttackRaids} from '../dist/ttg-red-fifth-three.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const c=(uid,id,x={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...x});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],
 hand:[],deck:[],life:[],outside:[],removed:[],apCards:[{uid:'A',ready:true}]});
const game=()=>({turn:4,active:0,phase:'main',status:'playing',players:[pl(),pl()]});
const physical=p=>[...p.hand,...p.deck,...p.life,...p.outside,...p.removed,...p.front.filter(Boolean),...p.energy.filter(Boolean)].flatMap(function deep(c){return [c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)]}).sort();
test('054 requires Nia on field AND deck <=20; +1500 only own turn, impact null in both turns',()=>{
 const s=game(),p=s.players[0];
 const sim=c('sim','TTG-1-054');p.front[0]=sim;
 p.deck=Array.from({length:21},(_,i)=>c('d'+i,'TTG-1-042'));
 assert.equal(red054Conditions(s,0,sim),false);
 p.front[1]=c('nia','TTG-1-059');
 assert.equal(red054Conditions(s,0,sim),false);
 p.deck.shift();
 assert.equal(red054BpBonus(s,0,sim),1500);
 assert.equal(red054ImpactNull(s,0,sim),true);
 s.active=1;
 assert.equal(red054BpBonus(s,0,sim),0);
 assert.equal(red054ImpactNull(s,0,sim),true);
});
test('054 optional mill 0/1, no public reveal or double move',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('sim','TTG-1-054',{enteredTurn:4});
 p.deck=[c('top','TTG-1-047'),c('next','TTG-1-042')];
 const before=physical(p),started=beginTtgRed054Entry(s,{player:0,uid:'sim'});
 assert.deepEqual(legalTtgRed054Choices(started).map(x=>x.mill),[false,true]);
 const no=resolveTtgRed054Mill(started,legalTtgRed054Choices(started)[0]);
 assert.deepEqual(no.players[0].deck.map(x=>x.uid),['top','next']);
 const yes=resolveTtgRed054Mill(started,legalTtgRed054Choices(started)[1]);
 assert.deepEqual(yes.players[0].outside.map(x=>x.uid),['top']);
 assert.deepEqual(yes.players[0].deck.map(x=>x.uid),['next']);
 assert.deepEqual(physical(yes.players[0]),before);
});
test('055 optional 0-2 mill; hand discard gates retrieval strictly to own just-milled cards',()=>{
 const s=game(),p=s.players[0];p.front[0]=c('sim','TTG-1-055',{enteredTurn:4});
 p.hand=[c('pay','TTG-1-042')];
 p.deck=[c('one','TTG-1-047'),c('two','TTG-1-048'),c('rest','TTG-1-042')];
 p.outside=[c('earlier','TTG-1-043')];
 const before=physical(p),begin=beginTtgRed055Entry(s,{player:0,uid:'sim'});
 const milled=resolveTtgRed055Mill(begin,legalTtgRed055Mills(begin)[2]);
 assert.deepEqual(milled.players[0].outside.map(x=>x.uid),['earlier','one','two']);
 const passed=resolveTtgRed055Discard(milled,legalTtgRed055Discards(milled)[0]);
 assert.equal(passed.pending,null);
 assert.deepEqual(passed.players[0].hand.map(x=>x.uid),['pay']);
 const paid=resolveTtgRed055Discard(milled,legalTtgRed055Discards(milled).find(x=>x.discardUid==='pay'));
 const choices=legalTtgRed055Recovers(paid);
 assert.deepEqual(choices.filter(x=>x.recoverUid).map(x=>x.recoverUid),['one','two']);
 assert.throws(()=>resolveTtgRed055Recover(paid,{...choices[0],recoverUid:'earlier'}),/055/);
 assert.throws(()=>resolveTtgRed055Recover(paid,{...choices[0],recoverUid:'pay'}),/055/);
 const done=resolveTtgRed055Recover(paid,choices.find(x=>x.recoverUid==='two'));
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['two']);
 assert.deepEqual(physical(done.players[0]),before);
});
test('056 Q2291: attack requires Nia and deck <=20; after-attack unresolved Raid cards only offered as guarded choices',()=>{
 const s=game(),p=s.players[0];s.phase='attack';
 const sim=c('sim','TTG-1-056');p.front[0]=sim;
 assert.equal(red056CanAttack(s,0,sim),false);
 p.front[1]=c('nia','TTG-1-059');
 p.deck=Array.from({length:21},(_,i)=>c('d'+i,'TTG-1-042'));
 assert.equal(red056CanAttack(s,0,sim),false);
 p.deck.shift();assert.equal(red056CanAttack(s,0,sim),true);
 p.hand=[c('lagan','TTG-1-076'),c('gurrenLagann','TTG-1-073')];
 const actions=legalRed056AfterAttackRaids(s,0,'sim');
 assert.deepEqual(actions.map(x=>x.handUid),['lagan','gurrenLagann']);
 assert.equal(actions.every(x=>x.requiresFullRaidResolver),true);
 s.raidNamesThisTurn=['ラガン'];
 assert.deepEqual(legalRed056AfterAttackRaids(s,0,'sim').map(x=>x.handUid),['gurrenLagann']);
 assert.equal(TTG_CORE_SMOKE_IDS.includes('TTG-1-056'),true);
});
test('054/055 entered restricted smoke pool, Q2291 056 cannot be claimed fully automated',()=>{
 for(const n of ['054','055'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 const counts=Object.fromEntries(['042','043','044','046','047','048','049','050','051','052','054','055'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 const match=runTtgCoreAiMatch(newTtgCoreMatch({decks:[counts,counts],seed:92}),{maxSteps:6000});
 assert.equal(match.truncated,false);
 assert.ok(assertTtgCoreState(match.state));
});
