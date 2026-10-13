import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {red067Entry,red067MayBlock,red068BpBonus,legalRed068Main,resolveRed068Main,canRed068EnergyAttack,expireRed068AtTurnEnd} from '../dist/ttg-red-ninth-three.mjs';
import {legalTtgRuleActions} from '../dist/ttg-rule-adapter.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const c=(uid,id,extra={})=>({uid,cardId:id,ready:true,stack:[],under:[],...extra});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],turnCount:2,apCards:[{uid:'a',ready:true},{uid:'b',ready:true}]});
const game=()=>({phase:'main',turn:4,active:0,status:'playing',players:[pl(),pl()],raidCountThisTurn:0});
test('066 only generates extra red energy while ACTIVE',()=>{
 const s=game();s.players[0].energy[0]=c('y','TTG-1-066',{ready:false});
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 s.players[0].energy[0].ready=true;
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
});
test('067 AP2 printed active entry, high-BP blocker forbidden and snipe valid only entry turn',()=>{
 const s=game();s.players[0].front[0]=c('sniper','TTG-1-067',{enteredTurn:4,ready:false});
 let r=red067Entry(s,{player:0,uid:'sniper'});
 assert.equal(r.players[0].front[0].ready,true);
 assert.equal(r.players[0].front[0].red067SniperUntilTurn,4);
 assert.equal(red067MayBlock(r,1,r.players[0].front[0],c('def','TTG-1-042'),4000),false);
 assert.equal(red067MayBlock(r,1,r.players[0].front[0],c('def','TTG-1-042'),3999),true);
 assert.equal(TTG_CORE_SMOKE_IDS.includes('TTG-1-067'),true);
});
test('068 discard to attack from energy; turn-1 limitation across all Yoko 068',()=>{
 const s=game(),p=s.players[0];p.energy[0]=c('y','TTG-1-068');p.energy[1]=c('y2','TTG-1-068');
 p.hand=[c('cost','TTG-1-042')];
 s.raidCountThisTurn=3;
 assert.equal(red068BpBonus(s,0,p.energy[0]),3000);
 const a=legalRed068Main(s,0).find(x=>x.uid==='y');
 assert.ok(a);const r=resolveRed068Main(s,a);
 assert.equal(r.players[0].red068AttackCap,4);
 assert.equal(canRed068EnergyAttack({...r,phase:'attack'},0,r.players[0].energy[0]),true);
 assert.equal(legalRed068Main(r,0).length,0);
 assert.equal(legalTtgRuleActions(r,0).filter(x=>x.type==='ttgRed068Main').length,0);
 assert.deepEqual(r.players[0].outside.map(x=>x.uid),['cost']);
 const end=expireRed068AtTurnEnd(r,0);
 assert.equal(canRed068EnergyAttack({...end,phase:'attack'},0,end.players[0].energy[0]),false);
});
test('066/067/068 in restricted 50-card smoke and turn/uid invariants remain',()=>{
 for(const n of ['066','067','068'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 const ids=['042','043','044','047','048','049','051','052','053','057','066','068'];
 const counts=Object.fromEntries(ids.map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 const match=runTtgCoreAiMatch(newTtgCoreMatch({decks:[counts,counts],seed:68}),{maxSteps:6000});
 assert.equal(match.truncated,false);assert.ok(assertTtgCoreState(match.state));
});
