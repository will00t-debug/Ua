import test from 'node:test';
import assert from 'node:assert/strict';
import {legalTtgRaidEntries,dispatchTtgRaidEntry} from '../dist/ttg-raid-entry.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';

const card=(uid,cardId,nameJa,other={})=>({uid,cardId,nameJa,ready:false,stack:[],under:[],...other});
const player=()=>({hand:[],front:[null,null,null,null],energy:[null,null,null,null],outside:[],life:[],deck:[],energyProduced:{red:4,green:0},apCards:[{uid:'ap1',ready:true},{uid:'ap2',ready:false},{uid:'ap3',ready:true}]});
const state=()=>({phase:'main',active:0,turn:8,players:[player(),player()],log:[],energyMode:'external'});
function legalFixture(){
 const s=state();
 s.players[0].hand=[card('top','TTG-1-071','キングキタンDX')];
 s.players[0].energy[0]=card('base','TTG-1-047','キタン',{ready:false});
 return s;
}
const allUids=p=>[...p.hand,...p.deck,...p.life,...p.outside,...p.front.filter(Boolean),...p.energy.filter(Boolean)].flatMap(function expand(c){return [c.uid,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)]});
test('071 Raid legal actions enumerate own Kittan base and only free destinations',()=>{
 const s=legalFixture();s.players[0].front[0]=card('occupied','TTG-1-042','カミナ');
 const options=legalTtgRaidEntries(s,0);
 assert.deepEqual(options.map(x=>[x.line,x.slot]),[['energy',0],['front',1],['front',2],['front',3]]);
 assert.ok(options.every(x=>x.baseUid==='base'&&x.handUid==='top'&&x.requiredAp===1));
 assert.equal(legalTtgRaidEntries(s,1).length,0);
 s.players[0].energy[0].nameJa='シモン';assert.deepEqual(legalTtgRaidEntries(s,0),[]);
});
test('071 Raid pays physical AP and turns top ACTIVE without changing physical Kittan base',()=>{
 const s=legalFixture();const before=JSON.stringify(s),ids=allUids(s.players[0]).sort();
 const r=dispatchTtgRaidEntry(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:2,payApUids:['ap1']});
 assert.equal(JSON.stringify(s),before,'must not mutate caller');
 assert.equal(r.players[0].apCards[0].ready,false);
 assert.equal(r.players[0].front[2].cardId,'TTG-1-071');
 assert.equal(r.players[0].front[2].ready,true);
 assert.equal(r.players[0].front[2].raidedTurn,8);
 assert.equal(r.players[0].front[2].stack[0].uid,'base');
 assert.equal(r.players[0].front[2].stack[0].ready,false,'REST Raid base remains physical, top is ACTIVE');
 assert.equal(r.players[0].energy[0],null);
 assert.equal(r.players[0].hand.length,0);
 assert.deepEqual(allUids(r.players[0]).sort(),ids,'physical-card conservation');
 assert.equal(r.raidCountThisTurn,1);
 assert.equal(r.log.at(-1).type,'ttgRaidEntered');
});
test('071 Raid may remain in energy lane and cannot overwrite front',()=>{
 const s=legalFixture();s.players[0].front[2]=card('other','TTG-1-042','カミナ');
 assert.throws(()=>dispatchTtgRaidEntry(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:2,payApUids:['ap1']}));
 const kept=dispatchTtgRaidEntry(s,{player:0,handUid:'top',baseUid:'base',line:'energy',slot:0,payApUids:['ap1']});
 assert.equal(kept.players[0].energy[0].uid,'top');
 assert.equal(kept.players[0].front[2].uid,'other');
});
test('Raid fails without energy, AP, correct phase or eligible printed card',()=>{
 const s=legalFixture();
 for(const bad of [
  x=>{x.players[0].energyProduced.red=3;},
  x=>{x.players[0].apCards.forEach(t=>t.ready=false);},
  x=>{x.phase='attack';},
  x=>{x.active=1;},
  x=>{x.pending={kind:'effect'};},
  x=>{x.players[0].hand[0].cardId='TTG-1-072';},
  x=>{x.players[0].energy[0].stack=[card('old','TTG-1-005','キタン')];}
 ]){
  const x=structuredClone(s);bad(x);
  const before=JSON.stringify(x);
  assert.deepEqual(legalTtgRaidEntries(x,0),[]);
  assert.throws(()=>dispatchTtgRaidEntry(x,{player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:['ap1']}));
  assert.equal(JSON.stringify(x),before);
 }
});
test('AP must exist, be ready, unique and belong to controller',()=>{
 const s=legalFixture();
 for(const pays of [[],['ap2'],['unknown'],['ap1','ap3'],['ap1','ap1']]){
  assert.throws(()=>dispatchTtgRaidEntry(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:pays}));
 }
 assert.equal(s.players[0].apCards[0].ready,true);
});
test('RAID action is available in shared human/AI adapter and reuses source legality',()=>{
 const s=legalFixture();
 const acts=legalTtgRuleActions(s,0).filter(x=>x.type==='raidTtg');
 assert.equal(acts.length,5);
 const ai=chooseTtgRuleAiAction(s,0);
 assert.equal(ai.type,'raidTtg');
 assert.equal(ai.line,'front');
 assert.equal(ai.baseUid,'base');
 assert.equal(ai.payApUids.length,1);
 const result=dispatchTtgRuleAction(s,ai);
 assert.equal(result.players[0].front[ai.slot].cardId,'TTG-1-071');
 assert.equal(result.players[0].front[ai.slot].ready,true);
 assert.deepEqual(legalTtgRuleActions(result,0).filter(x=>x.type==='raidTtg'),[]);
});
test('full 50-card state preserves every printed card through Raid 071',()=>{
 const s=legalFixture();
 for(let i=0;i<48;i++){
  const id=i%2?'TTG-1-042':'TTG-1-047';
  s.players[0].deck.push(card('d'+i,id,TTG_BY_ID[id].nameJa));
 }
 const before=allUids(s.players[0]).sort();
 assert.equal(before.length,50);assert.equal(new Set(before).size,50);
 const result=dispatchTtgRuleAction(s,{type:'raidTtg',player:0,handUid:'top',baseUid:'base',line:'front',slot:1,payApUids:['ap1']});
 const after=allUids(result.players[0]).sort();
 assert.deepEqual(after,before);
 assert.equal(result.players[0].deck.length,48);
});
