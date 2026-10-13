import test from 'node:test';
import assert from 'node:assert/strict';
import {legalGreen008Raids,resolveGreen008Raid,applyGreen008UnblockedDraw,resolveGreen008TurnEnd} from '../dist/ttg-green-008.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalTtgRuleActions,chooseTtgRuleAiAction,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
import {newTtgCoreMatch,validateTtgCoreDeck,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState,runTtgCoreAiMatch} from '../dist/ttg-core-match.mjs';
const c=(uid,id,other={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...other});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],outside:[],removed:[],life:[],turnCount:2,apCards:[{uid:'ap',ready:true}],energyProduced:{green:0,red:0}});
const standalone=(baseId='TTG-1-007')=>{
 const s={phase:'main',active:0,turn:9,status:'playing',energyMode:'derive',players:[pl(),pl()],log:[]},p=s.players[0];
 p.front[0]=c('base',baseId,{ready:false});
 p.energy[0]=c('gen1','TTG-1-017');p.energy[1]=c('gen2','TTG-1-017');
 p.hand=[c('top','TTG-1-008')];p.deck=[c('draw','TTG-1-005'),c('draw2','TTG-1-006')];
 return withTtgDerivedEnergy(s,0);
};
const all=p=>{
 const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
 return [...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.hand,...p.deck,...p.life,...p.outside,...p.removed].flatMap(deep).sort();
};
const raid=s=>resolveGreen008Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:['ap']});
test('008 printed Raid needs green4, AP1, Team Dai-Gurren physical base and open destination',()=>{
 const s=standalone(),before=JSON.stringify(s);
 assert.ok(legalGreen008Raids(s,0).some(a=>a.baseUid==='base'&&a.line==='front'));
 assert.throws(()=>resolveGreen008Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:0,payApUids:['bad']}));
 assert.throws(()=>resolveGreen008Raid(s,{player:0,handUid:'top',baseUid:'base',line:'front',slot:2,payApUids:['ap']}));
 assert.equal(JSON.stringify(s),before);
 s.players[0].energy[1]=null;
 assert.deepEqual(legalGreen008Raids(s,0),[]);
});
test('008 Gimmy base grants only temporary IMPACT1 and mandatory draw, top ACTIVE',()=>{
 const s=standalone('TTG-1-007'),before=all(s.players[0]);
 const r=raid(s);
 assert.equal(r.players[0].front[0].uid,'top');
 assert.equal(r.players[0].front[0].ready,true);
 assert.equal(r.players[0].front[0].stack[0].uid,'base');
 assert.equal(r.players[0].front[0].stack[0].ready,false);
 assert.equal(r.players[0].front[0].green008Impact,1);
 assert.equal(r.players[0].front[0].green008UnblockedDraw,undefined);
 assert.equal(r.players[0].apCards[0].ready,false);
 assert.deepEqual(r.players[0].hand.map(x=>x.uid),['draw']);
 assert.deepEqual(all(r.players[0]),before);
 const expired=resolveGreen008TurnEnd(r);
 assert.equal(expired.players[0].front[0].green008Impact,undefined);
});
test('008 Darry base grants temporary UNBLOCKED draw; no draw if ability expired',()=>{
 const s=standalone('TTG-1-013'),before=all(s.players[0]);
 const r=raid(s);
 assert.equal(r.players[0].front[0].green008UnblockedDraw,true);
 assert.equal(r.players[0].front[0].green008Impact,undefined);
 const draw=applyGreen008UnblockedDraw(r,0,'top');
 assert.deepEqual(draw.players[0].hand.map(x=>x.uid),['draw','draw2']);
 assert.deepEqual(all(draw.players[0]),before);
 const expired=resolveGreen008TurnEnd(r);
 assert.equal(expired.players[0].front[0].green008UnblockedDraw,undefined);
 const no=applyGreen008UnblockedDraw(expired,0,'top');
 assert.deepEqual(no.players[0].hand.map(x=>x.uid),['draw']);
});
test('008 if base is neither Gimmy nor Darry draws but has neither buff',()=>{
 const s=standalone('TTG-1-009');
 const r=raid(s);
 assert.equal(r.players[0].front[0].green008Impact,undefined);
 assert.equal(r.players[0].front[0].green008UnblockedDraw,undefined);
 assert.deepEqual(r.players[0].hand.map(x=>x.uid),['draw']);
});
test('008 with empty mandatory draw source ends game and maintains every printed card',()=>{
 const s=standalone();s.players[0].deck=[];
 const before=all(s.players[0]),r=raid(s);
 assert.equal(r.status,'finished');assert.equal(r.endReason,'requiredDrawEmpty');
 assert.equal(r.winner,1);
 assert.deepEqual(all(r.players[0]),before);
});
test('008 shared human/AI player chooses a printed legal RAID rather than normal deploy',()=>{
 const s=standalone();
 const actions=legalTtgRuleActions(s,0).filter(x=>x.type==='green008Raid');
 assert.ok(actions.some(x=>x.baseUid==='base'));
 const ai=chooseTtgRuleAiAction(s,0);
 assert.equal(ai.type,'green008Raid');assert.deepEqual(ai.payApUids,['ap']);
 assert.equal(ai.baseUid,'base');
 const r=dispatchTtgRuleAction(s,ai);
 assert.equal(r.players[0].front[0].uid,'top');
 assert.deepEqual(legalTtgRuleActions(r,0).filter(x=>x.type==='green008Raid'),[]);
});
const deck=()=>Object.fromEntries([
 ...['005','006','007','009','010','011','013','014','015','016','017','019'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-008',2]
]);
function take(p,id){
 for(const z of ['hand','deck','life','outside']){
  const i=p[z].findIndex(c=>c.cardId===id);
  if(i>=0)return p[z].splice(i,1)[0];
 }
 throw new Error('Missing '+id);
}
function simulated(baseId){
 const s=newTtgCoreMatch({decks:[deck(),deck()],seed:78}),p=s.players[0],op=s.players[1];
 s.phase='main';p.turnCount=2;p.apCards[0].ready=true;
 p.front[0]={...take(p,baseId),ready:false};
 p.energy[0]=take(p,'TTG-1-017');p.energy[1]=take(p,'TTG-1-017');
 p.hand.push(take(p,'TTG-1-008'));
 const lifeIdx=op.life.findIndex(c=>c.cardId==='TTG-1-006');
 if(lifeIdx>0)[op.life[0],op.life[lifeIdx]]=[op.life[lifeIdx],op.life[0]];
 else if(lifeIdx<0){op.deck.push(op.life.shift());op.life.unshift(take(op,'TTG-1-006'));}
 op.front[0]={...take(op,'TTG-1-006'),ready:true};
 return withTtgDerivedEnergy(s,0);
}
function enter(s){
 const option=legalTtgCoreActions(s).find(a=>a.type==='green008Raid'&&a.baseUid===s.players[0].front[0].uid&&a.line==='front');
 assert.ok(option);
 const out=dispatchTtgCoreAction(s,{...option,payApUids:[s.players[0].apCards.find(x=>x.ready).uid]});
 assert.equal(out.players[0].front[0].uid,option.handUid);
 return dispatchTtgCoreAction(out,{type:'next'});
}
test('008 Gimmy IMPACT wins BLOCKED battle and deals precisely one life in full 50-card state',()=>{
 const state=enter(simulated('TTG-1-007')),before=state.players[1].life.length;
 const attacker=state.players[0].front[0].uid,defender=state.players[1].front[0].uid;
 const attack=dispatchTtgCoreAction(state,{type:'attack',uid:attacker});
 const after=dispatchTtgCoreAction(attack,{type:'block',blockUid:defender});
 assert.equal(after.players[1].front[0],null);
 assert.equal(after.players[1].life.length,before-1);
 assert.ok(assertTtgCoreState(after));
});
test('008 Darry unblocked draw occurs in addition to ONE ordinary direct life damage',()=>{
 const state=enter(simulated('TTG-1-013')),beforeLife=state.players[1].life.length,beforeHand=state.players[0].hand.length;
 const attack=dispatchTtgCoreAction(state,{type:'attack',uid:state.players[0].front[0].uid});
 const after=dispatchTtgCoreAction(attack,{type:'block',blockUid:null});
 assert.equal(after.players[0].hand.length,beforeHand+1);
 assert.equal(after.players[1].life.length,beforeLife-1);
 assert.ok(assertTtgCoreState(after));
});
test('008 real 50-card mono-green decks can finish AI matches without card duplication',()=>{
 assert.deepEqual(validateTtgCoreDeck(deck()),[]);
 for(const seed of [8,20]){
  const s=newTtgCoreMatch({decks:[deck(),deck()],seed});
  const r=runTtgCoreAiMatch(s,{maxSteps:9000});
  assert.equal(r.truncated,false,JSON.stringify({seed,actions:r.actions,turns:r.state.turn}));
  assert.equal(r.state.status,'finished');
  assert.ok(assertTtgCoreState(r.state));
 }
});
