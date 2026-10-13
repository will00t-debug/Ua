import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {ttgRedStarterImpactNull} from '../dist/ttg-red-first-three.mjs';
import {beginTtgRed049Entry,legalTtgRed049Choices,resolveTtgRed049Choice,
 resolveTtgRed050Entry,legalTtgRed050Main,resolveTtgRed050Main,
 expireTtgRed050Energy} from '../dist/ttg-red-third-three.mjs';
import {resolveTtgPendingEndTurn} from '../dist/ttg-pending-rules.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_CORE_SMOKE_IDS,validateTtgCoreDeck,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const c=(uid,id,more={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...more});
const p=()=>({front:[null,null,null,null],energy:[null,null,null,null],
 hand:[],deck:[],life:[],outside:[],removed:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:true}]});
const game=()=>({turn:9,active:0,phase:'main',players:[p(),p()],status:'playing'});
const ids=pl=>[...pl.front.filter(Boolean),...pl.energy.filter(Boolean),...pl.hand,...pl.deck,...pl.life,...pl.outside,...pl.removed].flatMap(function f(c){return [c.uid,...(c.stack||[]).flatMap(f),...(c.under||[]).flatMap(f)]}).sort();
test('048 only has IMPACT null while first-attack double-block status is active',()=>{
 const card=c('k','TTG-1-048');
 assert.equal(ttgRedStarterImpactNull(card),false);
 card.doubleBlockUntilOwnStartTurnCount=3;
 assert.equal(ttgRedStarterImpactNull(card),true);
 delete card.doubleBlockUntilOwnStartTurnCount;
 assert.equal(ttgRedStarterImpactNull(card),false);
});
test('049 mandatory on-entry returns other <=1 energy character if available and does not refund AP',()=>{
 const s=game();s.players[0].front[0]=c('source','TTG-1-049',{enteredTurn:9});
 s.players[0].energy[0]=c('other','TTG-1-042');
 const original=ids(s.players[0]),open=beginTtgRed049Entry(s,{player:0,uid:'source'});
 const choices=legalTtgRed049Choices(open);
 assert.deepEqual(choices.map(x=>x.targetUid),['other']);
 assert.throws(()=>resolveTtgRed049Choice(open,{...choices[0],targetUid:null}),/invalid/);
 const done=resolveTtgRed049Choice(open,choices[0]);
 assert.equal(done.players[0].energy[0],null);
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['other']);
 assert.equal(done.players[0].front[0].uid,'source');
 assert.deepEqual(ids(done.players[0]),original);
 assert.equal(done.pending,null);
});
test('049 with no other legal <=1 character MUST bounce itself',()=>{
 const s=game();s.players[0].front[0]=c('source','TTG-1-049',{enteredTurn:9});
 s.players[0].energy[0]=c('expensive','TTG-1-050');
 const open=beginTtgRed049Entry(s,{player:0,uid:'source'});
 assert.deepEqual(legalTtgRed049Choices(open).map(x=>x.targetUid),[null]);
 const done=resolveTtgRed049Choice(open,legalTtgRed049Choices(open)[0]);
 assert.equal(done.players[0].front[0],null);
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['source']);
});
test('050 on entry draws one if Kittan exists as a physical card or Raid base',()=>{
 const s=game();s.players[0].front[0]=c('sisters','TTG-1-050',{enteredTurn:9});
 s.players[0].energy[0]=c('raider','TTG-1-071',{stack:[c('kittan','TTG-1-047')]});
 s.players[0].deck=[c('top','TTG-1-042')];
 const before=ids(s.players[0]),done=resolveTtgRed050Entry(s,{player:0,uid:'sisters'});
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['top']);
 assert.deepEqual(ids(done.players[0]),before);
 assert.throws(()=>resolveTtgRed050Entry(done,{player:0,uid:'sisters'}),/fresh entry/);
 const no=game();no.players[0].front[0]=c('sisters','TTG-1-050',{enteredTurn:9});
 no.players[0].deck=[c('top','TTG-1-042')];
 assert.deepEqual(resolveTtgRed050Entry(no,{player:0,uid:'sisters'}).players[0].hand,[]);
});
test('050 distinct per-turn costs: discard->ACTIVE, REST->red +1, discard->BP+1000; expire temporary energy',()=>{
 let s=game();s.players[0].energy[0]=c('sisters','TTG-1-050',{ready:true});
 s.players[0].hand=[c('a','TTG-1-042'),c('b','TTG-1-043')];
 const original=ids(s.players[0]);
 const energy=legalTtgRed050Main(s,0).find(x=>x.mode==='energy');
 s=resolveTtgRed050Main(s,energy);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.players[0].energy[0].energyBonus,1);
 assert.equal(legalTtgRed050Main(s,0).some(x=>x.mode==='energy'),false);
 s=resolveTtgRed050Main(s,legalTtgRed050Main(s,0).find(x=>x.mode==='ready'&&x.discardUid==='a'));
 assert.equal(s.players[0].energy[0].ready,true);
 s=resolveTtgRed050Main(s,legalTtgRed050Main(s,0).find(x=>x.mode==='bp'&&x.discardUid==='b'));
 assert.equal(s.players[0].energy[0].currentBp,4000);
 assert.deepEqual(s.players[0].outside.map(x=>x.uid),['a','b']);
 assert.deepEqual(legalTtgRed050Main(s,0),[]);
 assert.deepEqual(ids(s.players[0]),original);
 const end=expireTtgRed050Energy(resolveTtgPendingEndTurn(s));
 assert.equal(end.players[0].energy[0].energyBonus,0);
 assert.equal(end.players[0].energy[0].currentBp,3000);
});
test('050 is accessible via shared TTG action validator and kept isolated from BLEACH',()=>{
 const s=game();s.players[0].front[0]=c('sisters','TTG-1-050',{ready:true});
 const energy=legalTtgRuleActions(s,0).find(x=>x.type==='ttgRed050Main'&&x.mode==='energy');
 assert.ok(energy);
 const done=dispatchTtgRuleAction(s,energy);
 assert.equal(done.players[0].front[0].ready,false);
 assert.equal(done.players[0].front[0].energyBonus,1);
});
test('red 049/050 available to STRICT 50-card TTG AI smoke, still not formal website auto',()=>{
 for(const n of ['048','049','050'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 const counts=Object.fromEntries(['042','043','044','046','047','048','049','050','063','064','065','066'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 assert.deepEqual(validateTtgCoreDeck(counts),[]);
 const s=newTtgCoreMatch({decks:[counts,counts],seed:45});
 const match=runTtgCoreAiMatch(s,{maxSteps:6000});
 assert.equal(match.truncated,false);
 assert.ok(assertTtgCoreState(match.state));
});
