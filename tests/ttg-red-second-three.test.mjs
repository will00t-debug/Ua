import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {beginTtgRed045Raided,legalTtgRed045Choices,resolveTtgRed045Choice,
 legalTtgRed046Main,resolveTtgRed046Main} from '../dist/ttg-red-second-three.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
const c=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:false,
 stack:[],under:[],...extra});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],
 life:[],outside:[],removed:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:true}]});
const game=()=>({turn:9,phase:'main',active:0,status:'playing',players:[pl(),pl()],log:[]});
const ids=p=>[...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.hand,...p.deck,...p.life,...p.outside,...p.removed]
 .flatMap(function inner(x){return [x.uid,...(x.stack||[]).flatMap(inner),...(x.under||[]).flatMap(inner)]}).sort();
test('045 Q2286: base Kamina triggers after a chain Raid, even with intermediate facedown top',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('raid','TTG-1-073',{ready:true,raidedTurn:9,stack:[c('base','TTG-1-045')],under:[c('oldTop','TTG-1-072',{faceDown:true})]});
 p.front[1]=c('ally','TTG-1-042');
 p.deck=[c('draw','TTG-1-047')];
 const before=ids(p),opened=beginTtgRed045Raided(s,{player:0,raidUid:'raid',baseUid:'base'});
 assert.equal(opened.pending.kind,'ttgRed045Raided');
 const choice=legalTtgRed045Choices(opened).find(x=>x.targetUid==='ally');
 assert.ok(choice);
 const done=resolveTtgRed045Choice(opened,choice);
 assert.equal(done.players[0].front[1].currentBp,3000);
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['draw']);
 assert.equal(done.pending,null);
 assert.deepEqual(ids(done.players[0]),before);
 assert.throws(()=>beginTtgRed045Raided(done,{player:0,raidUid:'raid',baseUid:'base'}),/cannot enter/);
 assert.deepEqual(s.players[0].hand,[]);
});
test('045 optional BP choice never skips mandatory conditional draw, and invalid targets are rejected',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('raid','TTG-1-072',{raidedTurn:9,stack:[c('kamina','TTG-1-045')],
  under:[c('below','TTG-1-005',{faceDown:true})]});
 p.deck=[c('top','TTG-1-006')];
 const opened=beginTtgRed045Raided(s,{player:0,raidUid:'raid',baseUid:'kamina'});
 assert.throws(()=>resolveTtgRed045Choice(opened,{type:'ttgRed045Choice',player:0,
   raidUid:'raid',baseUid:'kamina',targetUid:'opponent'}),/Illegal 045/);
 const done=resolveTtgRed045Choice(opened,legalTtgRed045Choices(opened)[0]);
 assert.equal(done.players[0].hand[0].uid,'top','draw still applies after declining optional BP');
});
test('046 Q2288-Q2290: ready then buff, two different choices, once-per-name ready across copies',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('k1','TTG-1-046');
 p.front[1]=c('k2','TTG-1-046');
 p.front[2]=c('raid','TTG-1-073',{raidedTurn:9,stack:[c('base','TTG-1-045')]});
 const opts=legalTtgRed046Main(s,0);
 assert.ok(opts.some(x=>x.uid==='k1'&&x.mode==='both'&&x.targetUid==='k2'));
 assert.equal(opts.some(x=>x.mode==='readyTwice'),false);
 const both=opts.find(x=>x.uid==='k1'&&x.mode==='both'&&x.targetUid==='k2');
 const done=resolveTtgRed046Main(s,both);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(done.players[0].front[1].currentBp,5000);
 assert.equal(done.players[0].red046ReadyUsedTurn,9);
 assert.deepEqual(legalTtgRed046Main(done,0).filter(x=>x.uid==='k1'),[]);
 assert.deepEqual(legalTtgRed046Main(done,0).filter(x=>x.uid==='k2').map(x=>x.mode),['buff','buff','buff']);
 assert.throws(()=>resolveTtgRed046Main(done,{...both,uid:'k2'}),/Illegal 046/);
 const another=legalTtgRed046Main(done,0).find(x=>x.uid==='k2'&&x.targetUid==='k1');
 const after=resolveTtgRed046Main(done,another);
 assert.equal(after.players[0].front[0].currentBp,5000);
 assert.equal(after.players[0].front[1].currentBp,5000);
});
test('046 actions travel through unified restricted rule dispatcher only after an own Raid',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('k','TTG-1-046');
 assert.deepEqual(legalTtgRuleActions(s,0).filter(x=>x.type==='ttgRed046Main'),[]);
 p.front[1]=c('raided','TTG-1-073',{raidedTurn:9,stack:[c('base','TTG-1-045')]});
 const options=legalTtgRuleActions(s,0).filter(x=>x.type==='ttgRed046Main');
 assert.ok(options.length);
 const ready=options.find(x=>x.mode==='ready');
 const done=dispatchTtgRuleAction(s,ready);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(done.players[0].red046ReadyUsedTurn,9);
});
test('047 official first attack BP: engine already gates +1500 to own first attack',()=>{
 assert.equal(TTG_BY_ID['TTG-1-047'].bp,1500);
 assert.equal(TTG_BY_ID['TTG-1-047'].trigger,'draw');
});
