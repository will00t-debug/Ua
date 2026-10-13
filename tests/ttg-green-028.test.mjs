import test from 'node:test';
import assert from 'node:assert/strict';
import {legalTtgGreen028Raids,dispatchTtgGreen028Raid,legalTtgGreen028EntryChoices,resolveTtgGreen028Entry,canTtgGreen028Attack,resolveTtgGreen028Start} from '../dist/ttg-green-028.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction} from '../dist/ttg-rule-adapter.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const c=(uid,id,other={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...other});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],apCards:[{uid:'ap0',ready:true},{uid:'ap1',ready:false}],turnCount:2,energyProduced:{green:0,red:0}});
const init=()=>{
 const state={active:0,phase:'main',status:'playing',turn:8,energyMode:'derive',players:[pl(),pl()],log:[]};
 const a=state.players[0],b=state.players[1];
 a.hand=[c('top','TTG-1-028')];
 a.front[0]=c('base','TTG-1-009',{ready:false});
 a.energy[0]=c('g1','TTG-1-017');
 a.energy[1]=c('g2','TTG-1-017');
 a.deck=[c('draw','TTG-1-005'),c('d2','TTG-1-011')];
 b.front[0]=c('enemy','TTG-1-005',{ready:true});
 b.front[1]=c('high','TTG-1-006',{ready:false});
 b.energy[0]=c('enemyEnergy','TTG-1-009');
 return withTtgDerivedEnergy(state,0);
};
const ids=pl=>{
 const dive=x=>[x.uid,...(x.stack||[]).flatMap(dive),...(x.under||[]).flatMap(dive)];
 return [...pl.hand,...pl.deck,...pl.life,...pl.outside,...pl.removed,
  ...pl.front.filter(Boolean),...pl.energy.filter(Boolean)].flatMap(dive).sort();
};
const raid=state=>dispatchTtgGreen028Raid(state,{
 player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:['ap0']
});
test('028 printed RAID from Simon/Viral pays one physical AP, ACTIVE top and conserves base',()=>{
 const s=init(),snapshot=JSON.stringify(s),before=ids(s.players[0]);
 const options=legalTtgGreen028Raids(s,0);
 assert.deepEqual(options.map(x=>[x.baseUid,x.line,x.slot]),[['base','front',0]]);
 assert.throws(()=>dispatchTtgGreen028Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:1,payApUids:['ap0']}));
 assert.throws(()=>dispatchTtgGreen028Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:['ap1']}));
 const after=raid(s),top=after.players[0].front[0];
 assert.equal(top.uid,'top');assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,'base');assert.equal(top.stack[0].ready,false);
 assert.equal(after.players[0].apCards[0].ready,false);
 assert.equal(after.pending.kind,'ttgGreen028Entry','must not skip mandatory draw/optional target');
 assert.deepEqual(ids(after.players[0]),before);
 assert.equal(JSON.stringify(s),snapshot);
});
test('028 from energy line can move to ONLY an empty front slot',()=>{
 const s=init(),pl=s.players[0];
 pl.energy[2]=pl.front[0];pl.front[0]=c('occupied','TTG-1-005');
 const opts=legalTtgGreen028Raids(s,0);
 assert.deepEqual(opts.map(x=>[x.line,x.slot]),[['energy',2],['front',1],['front',2],['front',3]]);
 const r=dispatchTtgGreen028Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:2,payApUids:['ap0']});
 assert.equal(r.players[0].energy[2],null);
 assert.equal(r.players[0].front[2].uid,'top');
 assert.equal(r.players[0].front[0].uid,'occupied');
});
test('028 on-play always draws one, may suppress one legal enemy front until caster NEXT turn',()=>{
 const s=raid(init());
 assert.deepEqual(legalTtgGreen028EntryChoices(s).map(x=>x.targetUid),['enemy','high',null]);
 assert.throws(()=>resolveTtgGreen028Entry(s,{player:0,uid:'top',targetUid:'enemyEnergy'}));
 s.players[1].front[1].protectedFromEffects=true;
 assert.deepEqual(legalTtgGreen028EntryChoices(s).map(x=>x.targetUid),['enemy',null]);
 const original=JSON.stringify(s),before=ids(s.players[0]);
 const finished=resolveTtgGreen028Entry(s,{player:0,uid:'top',targetUid:'enemy'});
 assert.equal(finished.pending,null);
 assert.deepEqual(finished.players[0].hand.map(x=>x.uid),['draw']);
 assert.deepEqual(finished.players[0].deck.map(x=>x.uid),['d2']);
 assert.equal(canTtgGreen028Attack(finished,1,finished.players[1].front[0]),false);
 assert.equal(canTtgGreen028Attack(finished,1,finished.players[1].front[1]),true);
 assert.deepEqual(ids(finished.players[0]),before);
 assert.equal(JSON.stringify(s),original);
 const later=structuredClone(finished);
 later.players[0].turnCount++;
 const expired=resolveTtgGreen028Start(later,0);
 assert.equal(canTtgGreen028Attack(expired,1,expired.players[1].front[0]),true);
});
test('028 optional target can be declined, but mandatory draw still occurs',()=>{
 const s=raid(init());
 const r=resolveTtgGreen028Entry(s,{player:0,uid:'top',targetUid:null});
 assert.deepEqual(r.players[0].hand.map(x=>x.uid),['draw']);
 assert.equal(r.players[1].front[0].ttg028AttackLocks,undefined);
 assert.equal(r.pending,null);
});
test('028 fail-closed with simultaneous front 004 Viral until Q2260 ordering is implemented',()=>{
 const s=init();
 s.players[0].front[1]=c('viralSR','TTG-1-004');
 assert.deepEqual(legalTtgGreen028Raids(s,0),[],'do not silently skip Viral once-per-name effect');
 assert.throws(()=>raid(s));
});
test('028 rejects wrong base, enemy base, missing green energy, REST AP and pending effects',()=>{
 const s=init();
 for(const mutate of [
  x=>{x.players[0].front[0].nameJa='キタン';},
  x=>{x.players[0].front[0].stack=[c('lower','TTG-1-005')];},
  x=>{x.players[0].energy[1]=null;},
  x=>{x.players[0].apCards[0].ready=false;},
  x=>{x.pending={kind:'unknown'};},
  x=>{x.active=1;},
  x=>{x.phase='attack';}
 ]){
  const t=structuredClone(s);mutate(t);
  assert.deepEqual(legalTtgGreen028Raids(t,0),[]);
  const before=JSON.stringify(t);
  assert.throws(()=>raid(t));
  assert.equal(JSON.stringify(t),before);
 }
});
test('same human + AI legal set exposes 028 RAID then forced draw/suppression decision',()=>{
 const s=init(),actions=legalTtgRuleActions(s,0).filter(a=>a.type==='ttgGreen028Raid');
 assert.equal(actions.length,1);
 const ai=chooseTtgRuleAiAction(s,0);
 assert.equal(ai.type,'ttgGreen028Raid');assert.deepEqual(ai.payApUids,['ap0']);
 const raidState=dispatchTtgRuleAction(s,ai);
 assert.deepEqual(legalTtgRuleActions(raidState,0).map(a=>a.type),Array(3).fill('ttgGreen028Entry'));
 const next=chooseTtgRuleAiAction(raidState,0);
 assert.equal(next.targetUid,'enemy');
 const final=dispatchTtgRuleAction(raidState,next);
 assert.equal(final.players[0].hand.at(-1).uid,'draw');
 assert.equal(final.players[1].front[0].ttg028AttackLocks[0].byPlayer,0);
 assert.equal(final.pending,null);
});
test('028 mandatory draw with empty deck ends match, not silently skipping required draw',()=>{
 const s=init();s.players[0].deck=[];
 const entering=raid(s),r=resolveTtgGreen028Entry(entering,{player:0,uid:'top',targetUid:null});
 assert.equal(r.status,'finished');assert.equal(r.winner,1);assert.equal(r.endReason,'requiredDrawEmpty');
});
