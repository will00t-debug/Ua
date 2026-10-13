import test from 'node:test';
import assert from 'node:assert/strict';
import {legalTtgGreen029Raids,dispatchTtgGreen029Raid,legalTtgGreen029EntryChoices,resolveTtgGreen029Entry} from '../dist/ttg-green-029.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction} from '../dist/ttg-rule-adapter.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const card=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...extra});
const player=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:false}],turnCount:2,energyProduced:{green:0,red:0}});
const setup=()=>{
 const s={active:0,turn:8,phase:'main',energyMode:'derive',status:'playing',players:[player(),player()],log:[]};
 const pl=s.players[0];
 pl.hand=[card('raid','TTG-1-029')];
 pl.front[0]=card('base','TTG-1-009',{ready:false});
 for(let i=0;i<3;i++)pl.energy[i]=card('gen'+i,'TTG-1-017');
 pl.outside=[card('simple','TTG-1-005'),card('simon','TTG-1-010'),card('red','TTG-1-042'),card('expensive','TTG-1-029')];
 return withTtgDerivedEnergy(s,0);
};
const all=pl=>{
 const rec=c=>[c.uid,...(c.stack||[]).flatMap(rec),...(c.under||[]).flatMap(rec)];
 return [...pl.hand,...pl.deck,...pl.life,...pl.outside,...pl.removed,
  ...pl.front.filter(Boolean),...pl.energy.filter(Boolean)].flatMap(rec).sort();
};
const raid=s=>dispatchTtgGreen029Raid(s,{player:0,handUid:'raid',baseUid:'base',line:'front',slot:0,payApUids:['AP0']});
test('029 printed green5/AP1 normal Raid keeps Simon/Viral base and requires ON FRONT recovery choice',()=>{
 const s=setup(),before=all(s.players[0]),snapshot=JSON.stringify(s);
 assert.deepEqual(legalTtgGreen029Raids(s,0).map(x=>[x.line,x.slot]),[['front',0]]);
 assert.throws(()=>dispatchTtgGreen029Raid(s,{player:0,handUid:'raid',baseUid:'base',line:'front',slot:0,payApUids:['AP1']}));
 const result=raid(s),top=result.players[0].front[0];
 assert.equal(top.uid,'raid');assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,'base');assert.equal(top.stack[0].ready,false);
 assert.equal(result.players[0].apCards[0].ready,false);
 assert.equal(result.pending.kind,'ttgGreen029Entry');
 assert.deepEqual(all(result.players[0]),before);
 assert.equal(JSON.stringify(s),snapshot);
});
test('029 from outside can recover ONE qualifying green cost<=3 AP1 great-gurren card to hand',()=>{
 const s=raid(setup()),before=all(s.players[0]);
 const actions=legalTtgGreen029EntryChoices(s);
 assert.ok(actions.some(x=>x.mode==='hand'&&x.outsideUid==='simple'));
 assert.ok(actions.some(x=>x.mode==='hand'&&x.outsideUid==='simon'));
 assert.ok(!actions.some(x=>x.outsideUid==='red'||x.outsideUid==='expensive'));
 assert.throws(()=>resolveTtgGreen029Entry(s,{player:0,uid:'raid',mode:'hand',outsideUid:'red'}));
 const r=resolveTtgGreen029Entry(s,{player:0,uid:'raid',mode:'hand',outsideUid:'simple'});
 assert.deepEqual(r.players[0].hand.map(x=>x.uid),['simple']);
 assert.equal(r.pending,null);
 assert.deepEqual(all(r.players[0]),before);
 const skipped=resolveTtgGreen029Entry(s,{player:0,uid:'raid',mode:'decline'});
 assert.equal(skipped.players[0].outside.length,4);
 assert.equal(skipped.pending,null);
});
test('029 at 6+ energy can REST-play into chosen EMPTY line and keeps physical UID',()=>{
 const s=raid(setup()),before=all(s.players[0]);
 const legal=legalTtgGreen029EntryChoices(s).filter(x=>x.mode==='restPlay'&&x.outsideUid==='simple');
 assert.ok(legal.some(x=>x.line==='front'&&x.slot===2));
 assert.throws(()=>resolveTtgGreen029Entry(s,{player:0,uid:'raid',mode:'restPlay',outsideUid:'simple',line:'front',slot:0}));
 const a=legal.find(x=>x.line==='front'&&x.slot===2);
 const r=resolveTtgGreen029Entry(s,a);
 assert.equal(r.players[0].front[2].uid,'simple');
 assert.equal(r.players[0].front[2].ready,false);
 assert.ok(!r.players[0].outside.some(c=>c.uid==='simple'));
 assert.equal(r.pending,null);
 assert.deepEqual(all(r.players[0]),before);
});
test('029 if recovered card has its own On Entry, unresolved effect becomes pending, not skipped',()=>{
 const s=raid(setup()),before=all(s.players[0]);
 const a=legalTtgGreen029EntryChoices(s).find(x=>x.mode==='restPlay'&&x.outsideUid==='simon'&&x.line==='energy');
 const r=resolveTtgGreen029Entry(s,a);
 assert.equal(r.pending.kind,'ttgGreenEntry');
 assert.equal(r.pending.sourceUid,'simon');
 assert.equal(r.players[0].energy[a.slot].uid,'simon');
 assert.equal(r.players[0].energy[a.slot].ready,false);
 assert.deepEqual(all(r.players[0]),before);
});
test('029 if moving Raid FROM energy drops current green below 6, rest-play option is NOT offered',()=>{
 const s=setup(),pl=s.players[0];
 // Printed green 5 before RAID: two 017 (4) plus a Simon base (1).
 pl.energy[2]=pl.front[0];pl.front[0]=null;
 const present=legalTtgGreen029Raids(s,0);
 assert.ok(present.some(x=>x.baseUid==='base'&&x.line==='front'&&x.slot===0));
 const raidState=dispatchTtgGreen029Raid(s,{player:0,handUid:'raid',baseUid:'base',line:'front',slot:0,payApUids:['AP0']});
 const options=legalTtgGreen029EntryChoices(raidState);
 assert.ok(options.some(x=>x.mode==='hand'));
 assert.ok(!options.some(x=>x.mode==='restPlay'),'post-Raid energy dropped to four');
});
test('029 entry effect is only if in front, and crossing 004 Viral Q2260 is fail-closed',()=>{
 const s=setup();s.players[0].energy[3]=s.players[0].front[0];s.players[0].front[0]=null;
 const remain=dispatchTtgGreen029Raid(s,{player:0,handUid:'raid',baseUid:'base',line:'energy',slot:3,payApUids:['AP0']});
 assert.equal(remain.pending,undefined);
 const withViral=setup();withViral.players[0].front[1]=card('viralSR','TTG-1-004');
 assert.deepEqual(legalTtgGreen029Raids(withViral,0),[]);
 assert.throws(()=>raid(withViral));
});
test('029 shared player and AI entry chooses legal REST-play, with AP and targets guarded',()=>{
 const s=setup();
 const options=legalTtgRuleActions(s,0).filter(x=>x.type==='ttgGreen029Raid');
 assert.equal(options.length,1);
 const ai=chooseTtgRuleAiAction(s,0);
 assert.equal(ai.type,'ttgGreen029Raid');
 assert.deepEqual(ai.payApUids,['AP0']);
 const r=dispatchTtgRuleAction(s,ai);
 assert.equal(r.pending.kind,'ttgGreen029Entry');
 const next=chooseTtgRuleAiAction(r,0);
 assert.equal(next.type,'ttgGreen029Entry');
 assert.equal(next.mode,'restPlay');
 assert.throws(()=>dispatchTtgRuleAction(r,{...next,outsideUid:'red'}));
 const resolved=dispatchTtgRuleAction(r,next);
 assert.equal(resolved.players[0][next.line][next.slot].ready,false);
 assert.equal(resolved.pending,null,'first candidate has no on-entry effect');
});
test('029 wrong base, stolen target or insufficient live energy/AP cannot mutate cards',()=>{
 const s=setup();
 for(const f of [
  x=>{x.players[0].front[0].nameJa='キタン';},
  x=>{x.players[0].energy[2]=null;},
  x=>{x.players[0].apCards[0].ready=false;},
  x=>{x.pending={kind:'other'};},
  x=>{x.phase='attack';},
  x=>{x.active=1;}
 ]){
  const v=structuredClone(s);f(v);
  assert.deepEqual(legalTtgGreen029Raids(v,0),[]);
  const before=JSON.stringify(v);
  assert.throws(()=>raid(v));
  assert.equal(JSON.stringify(v),before);
 }
});
