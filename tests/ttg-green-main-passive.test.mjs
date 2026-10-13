import test from 'node:test';
import assert from 'node:assert/strict';
import {legalGreen003,resolveGreen003,legalGreen011,resolveGreen011,legalGreen015,resolveGreen015,legalGreen018,resolveGreen018,legalGreen022,resolveGreen022,resolveGreenMainEnd,resolveGreenTurnEnd,resolveGreenOwnStart,legalGreen020Step,resolveGreen020Step,legalGreen016,resolveGreen016,legalGreen017,resolveGreen017} from '../dist/ttg-green-main.mjs';
import {greenTtgCurrentBp,greenTtgBpBonus,greenTtgNeedsEnergy,greenTtgCanAttackOrBlock,greenTtgImpactNull} from '../dist/ttg-green-passives.mjs';
import {calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const card=(uid,id,extra={})=>({uid,cardId:id,ready:true,nameJa:TTG_BY_ID[id].nameJa,...extra});
const player=()=>({front:[null,null,null,null],energy:[null,null,null,null],deck:[card('draw','TTG-1-005')],hand:[],outside:[],
 apCards:[{uid:'ap',ready:true},{uid:'rest',ready:false}],turnCount:2,energyProduced:{green:0,red:0}});
const game=()=>({turn:7,active:0,phase:'main',players:[player(),player()],energyMode:'derive'});
test('015 draw AP cost and energy boost cannot be reused; wrong AP illegal and immutable',()=>{
 const s=game();s.players[0].energy[0]=card('nia','TTG-1-015');
 assert.deepEqual(legalGreen015(s,{player:0,uid:'nia'}).map(x=>x.apUid),['ap']);
 assert.throws(()=>resolveGreen015(s,{player:0,uid:'nia',apUid:'rest'}));
 const original=JSON.stringify(s);
 const after=resolveGreen015(s,{player:0,uid:'nia',apUid:'ap'});
 assert.equal(after.players[0].energy[0].energyBonus,1);
 assert.equal(after.players[0].apCards[0].ready,false);
 assert.deepEqual(after.players[0].hand.map(x=>x.uid),['draw']);
 assert.equal(calculateTtgEnergyByColor(after,0).green,2);
 assert.deepEqual(legalGreen015(after,{player:0,uid:'nia'}),[]);
 assert.equal(JSON.stringify(s),original);
 const ended=resolveGreenTurnEnd(after);
 assert.equal(ended.players[0].energy[0].energyBonus,0);
});
test('018 Buta REST boost retires at Main end, 022 Yomako returns to hand instead',()=>{
 for(const [id,legal,resolve,zone] of [
 ['TTG-1-018',legalGreen018,resolveGreen018,'outside'],
 ['TTG-1-022',legalGreen022,resolveGreen022,'hand']]){
  const s=game();s.players[0].energy[0]=card('source',id);
  assert.equal(legal(s,{player:0,uid:'source'}).length,1);
  const after=resolve(s,{player:0,uid:'source'});
  assert.equal(after.players[0].energy[0].ready,false);
  assert.equal(calculateTtgEnergyByColor(after,0).green,2);
  assert.deepEqual(legal(after,{player:0,uid:'source'}),[]);
  const done=resolveGreenMainEnd(after);
  assert.equal(done.players[0].energy[0],null);
  assert.deepEqual(done.players[0][zone].map(x=>x.uid),['source']);
  assert.equal(s.players[0].energy[0].uid,'source');
 }
});
test('011 Simon modes: +1 energy or front generation until next own start',()=>{
 for(const mode of ['boost','frontEnergy']){
  const s=game();
  if(mode==='boost')s.players[0].energy[0]=card('simon','TTG-1-011');
  else s.players[0].front[0]=card('simon','TTG-1-011');
  const acts=legalGreen011(s,{player:0,uid:'simon'});
  assert.deepEqual(acts.map(x=>x.mode),['boost','frontEnergy']);
  const after=resolveGreen011(s,{player:0,uid:'simon',mode});
  assert.deepEqual(legalGreen011(after,{player:0,uid:'simon'}),[]);
  assert.equal(calculateTtgEnergyByColor(after,0).green,mode==='boost'?2:1,mode);
  const later=structuredClone(after);later.players[0].turnCount=3;
  const expired=resolveGreenOwnStart(later,0);
  assert.equal(calculateTtgEnergyByColor(expired,0).green,mode==='boost'?1:0);
 }
});
test('003 Viral self front-gen threshold immediately unlocks 8+ other front producers',()=>{
 const s=game();s.players[0].front[0]=card('v','TTG-1-003');
 s.players[0].front[1]=card('ally','TTG-1-006');
 s.players[0].energy[0]=card('g1','TTG-1-033',{gen:2});
 s.players[0].energy[1]=card('g2','TTG-1-019',{gen:2,ready:false});
 s.players[0].energy[2]=card('g3','TTG-1-005');
 assert.equal(calculateTtgEnergyByColor(s,0).green,6);
 const acts=legalGreen003(s,{player:0,uid:'v'});
 assert.equal(acts[0].type,'ttgGreen003Front');
 const result=resolveGreen003(s,{player:0,uid:'v',type:'ttgGreen003Front'});
 assert.equal(result.players[0].front[0].frontGenerates,true);
 assert.equal(result.players[0].frontGeneratesAll,undefined,'self raises 6 to 7, not 8');
 const next=structuredClone(s);next.players[0].energy[3]=card('g4','TTG-1-005');
 const boosted=resolveGreen003(next,{player:0,uid:'v',type:'ttgGreen003Front'});
 assert.equal(boosted.players[0].frontGeneratesAll,true,'7+1 immediately reaches eight after self generation');
 assert.equal(calculateTtgEnergyByColor(boosted,0).green,9,'both front characters produce');
 const ended=resolveGreenTurnEnd(boosted);
 assert.equal(ended.players[0].frontGeneratesAll,undefined);
 assert.equal(ended.players[0].front[0].frontGenerates,undefined);
});
test('003 Viral energy20 same-name readiness choice only once over two physical copies',()=>{
 const s=game();s.players[0].front[0]=card('v','TTG-1-003');
 s.players[0].front[1]=card('v2','TTG-1-003');
 s.players[0].energy[0]=card('g','TTG-1-034',{gen:20});
 s.players[0].front[2]=card('rested','TTG-1-005',{ready:false});
 const a=legalGreen003(s,{player:0,uid:'v'}).find(x=>x.type==='ttgGreen003Ready');
 assert.equal(a.targetUid,'rested');
 const r=resolveGreen003(s,{...a});
 assert.equal(r.players[0].front[2].ready,true);
 assert.equal(legalGreen003(r,{player:0,uid:'v2'}).filter(x=>x.type==='ttgGreen003Ready').length,0);
 assert.throws(()=>resolveGreen003(r,{...a}));
});
test('020 STEP moves to only empty energy slots preserving REST; empty-field discount',()=>{
 let s=game(),h=card('y','TTG-1-020',{ready:false});
 assert.equal(greenTtgNeedsEnergy(s,0,h),0);
 s.players[0].front[2]=h;
 assert.equal(greenTtgNeedsEnergy(s,0,h),2);
 s.phase='move';
 assert.deepEqual(legalGreen020Step(s,{player:0,uid:'y'}).map(x=>x.slot),[0,1,2,3]);
 const moved=resolveGreen020Step(s,{player:0,uid:'y',slot:1});
 assert.equal(moved.players[0].energy[1].uid,'y');
 assert.equal(moved.players[0].energy[1].ready,false);
 assert.equal(s.players[0].front[2].uid,'y');
 assert.throws(()=>resolveGreen020Step(moved,{player:0,uid:'y',slot:2}));
});
test('energy-responsive 006/011 BP and 007/013 GIMMY/DALLY pair are live, no stale flags',()=>{
 const s=game();const k=card('k','TTG-1-006'),sim=card('sim','TTG-1-011'),g=card('g','TTG-1-007'),d=card('d','TTG-1-013');
 s.players[0].energy=[card('big','TTG-1-034',{gen:8}),null,null,null];
 s.players[0].front=[k,sim,g,d];
 assert.equal(greenTtgCurrentBp(s,0,k),TTG_BY_ID[k.cardId].bp+1000);
 assert.equal(greenTtgCurrentBp(s,0,sim),TTG_BY_ID[sim.cardId].bp+1500);
 assert.equal(greenTtgBpBonus(s,0,g),1000);
 assert.equal(greenTtgBpBonus(s,0,d),1000);
 s.players[0].front[3]=null;
 assert.equal(greenTtgBpBonus(s,0,g),0,'Darry exits play: buff removed immediately');
 s.active=1;
 assert.equal(greenTtgBpBonus(s,0,k),0,'own turn ends: bonus disappears');
 assert.equal(greenTtgBpBonus(s,0,sim),0);
});
test('024 Reite gunmen energy and field discounts use live zone contents',()=>{
 const s=game(),reite=card('r','TTG-1-024'),field=card('field','TTG-1-033');
 s.players[0].energy[0]=reite;
 assert.equal(calculateTtgEnergyByColor(s,0).green,1);
 assert.equal(greenTtgNeedsEnergy(s,0,field),1,'own Reite reduces field cost by one');
 s.players[0].energy[1]=card('gun','TTG-1-029');
 assert.equal(calculateTtgEnergyByColor(s,0).green,3,'gunmen grants Reite +1 and other generator +1');
 s.players[0].energy[1]=null;
 assert.equal(calculateTtgEnergyByColor(s,0).green,1);
 assert.equal(greenTtgImpactNull(card('x','TTG-1-005')),true);
 assert.equal(greenTtgImpactNull(card('x','TTG-1-025')),false);
});

test('016 Nia energy20 REST draws only once per NAME across physical copies',()=>{
 const s=game();
 s.players[0].energy[0]=card('n1','TTG-1-016');
 s.players[0].energy[1]=card('n2','TTG-1-016');
 s.players[0].energy[2]=card('g','TTG-1-034',{gen:20});
 assert.equal(legalGreen016(s,{player:0,uid:'n1'}).length,1);
 const result=resolveGreen016(s,{player:0,uid:'n1'});
 assert.equal(result.players[0].energy[0].ready,false);
 assert.deepEqual(result.players[0].hand.map(x=>x.uid),['draw']);
 assert.deepEqual(legalGreen016(result,{player:0,uid:'n2'}),[]);
 assert.throws(()=>resolveGreen016(result,{player:0,uid:'n2'}));
});
test('017 Nia energy8 gains exactly two temporary green generators and expires',()=>{
 const s=game();
 s.players[0].energy[0]=card('nia','TTG-1-017',{gen:2});
 s.players[0].energy[1]=card('field','TTG-1-034',{gen:6});
 assert.equal(legalGreen017(s,{player:0,uid:'nia'}).length,1);
 const active=resolveGreen017(s,{player:0,uid:'nia'});
 assert.equal(calculateTtgEnergyByColor(active,0).green,10);
 assert.equal(active.players[0].energy[0].ttgGreenBonusCount,2);
 assert.deepEqual(legalGreen017(active,{player:0,uid:'nia'}),[]);
 const expired=resolveGreenTurnEnd(active);
 assert.equal(calculateTtgEnergyByColor(expired,0).green,8);
 assert.equal(expired.players[0].energy[0].energyBonus,0);
});
