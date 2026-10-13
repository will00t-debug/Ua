import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {legalTtgRedNiaKaminaPlay,beginTtgRed057Or058Entry,legalTtgRed057058Choices,
 resolveTtgRed057058Choice,ttgRed057ImpactNull,expireTtgRed057GrantedNullAtOwnStart} from '../dist/ttg-red-sixth-three.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState,legalTtgCoreActions} from '../dist/ttg-core-match.mjs';
const c=(uid,id,more={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...more});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],turnCount:3,apCards:[{uid:'A',ready:true}]});
const game=()=>({turn:4,active:0,phase:'main',status:'playing',players:[pl(),pl()]});
test('058/059 Nia and any Kamina are mutually exclusive on entry, including Kamina in Raid base',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('raid','TTG-1-072',{stack:[c('kamina','TTG-1-042')]});
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,c('nia','TTG-1-058')),false);
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,c('nia2','TTG-1-059')),false);
 p.front[0]=c('nia','TTG-1-058');
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,c('kamina','TTG-1-043')),false);
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,c('simon','TTG-1-054')),true);
});
test('057 target gets temporary IMPACT null until next own turn; 057 itself always null',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('day','TTG-1-057',{enteredTurn:4});
 p.front[1]=c('ally','TTG-1-042');
 const started=beginTtgRed057Or058Entry(s,{player:0,uid:'day'});
 const chosen=legalTtgRed057058Choices(started).find(x=>x.targetUid==='ally');
 const result=resolveTtgRed057058Choice(started,chosen);
 assert.equal(ttgRed057ImpactNull(result,0,result.players[0].front[1]),true);
 assert.equal(ttgRed057ImpactNull(result,0,result.players[0].front[0]),true);
 assert.equal(result.players[0].front[1].extraImpactNullUntilOwnStartTurnCount,4);
 const next=structuredClone(result);next.players[0].turnCount=4;
 const expired=expireTtgRed057GrantedNullAtOwnStart(next,0);
 assert.equal(ttgRed057ImpactNull(expired,0,expired.players[0].front[1]),false);
 assert.equal(ttgRed057ImpactNull(expired,0,expired.players[0].front[0]),true);
});
test('058 chooses other Simon/Raid-Simon for BP+1500, non-Simon ally for +1000',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('nia','TTG-1-058',{enteredTurn:4});
 p.front[1]=c('simon','TTG-1-054');
 p.energy[0]=c('kittan','TTG-1-047');
 const started=beginTtgRed057Or058Entry(s,{player:0,uid:'nia'});
 assert.equal(legalTtgRed057058Choices(started).some(x=>x.targetUid==='nia'),false);
 assert.throws(()=>resolveTtgRed057058Choice(started,{type:'ttgRed057058Entry',player:0,uid:'nia',targetUid:'nia'}),/057\/058/);
 const chosen=legalTtgRed057058Choices(started).find(x=>x.targetUid==='simon');
 const result=resolveTtgRed057058Choice(started,chosen);
 assert.equal(result.players[0].front[1].currentBp,4000);
 assert.equal(result.players[0].front[1].buffs[0].until,'endTurn');
 const other=legalTtgRed057058Choices(started).find(x=>x.targetUid==='kittan');
 assert.equal(resolveTtgRed057058Choice(started,other).players[0].energy[0].currentBp,2500);
});
test('059 main REST to boost Simon uses common validator and printed constraints',()=>{
 const s=game(),p=s.players[0];
 p.front[0]=c('nia','TTG-1-059',{ready:true});
 p.front[1]=c('simon','TTG-1-054');
 const action=legalTtgRuleActions(s,0).find(x=>x.type==='activateNia059'&&x.targetUid==='simon');
 assert.ok(action);
 const done=dispatchTtgRuleAction(s,action);
 assert.equal(done.players[0].front[0].ready,false);
 assert.equal(done.players[0].front[1].currentBp,3500);
});
test('057/058/059 integrated only in STRICT TTG smoke; denied Kamina play with a Nia in field',()=>{
 for(const n of ['057','058','059'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 const counts=Object.fromEntries(['042','044','046','049','050','051','052','053','054','055','057','058'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 const match=runTtgCoreAiMatch(newTtgCoreMatch({decks:[counts,counts],seed:57}),{maxSteps:6000});
 assert.equal(match.truncated,false);
 assert.ok(assertTtgCoreState(match.state));
});
