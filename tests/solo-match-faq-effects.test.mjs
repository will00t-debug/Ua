import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingDispatch,soloTrainingLegalActions,assertSoloTrainingMatch,soloMatchBp,inspectSoloAttached} from '../dist/solo-match.mjs';
const make=(purple=true,seed=998)=>{const deck=purple?SOLO_SHADOW_TRAINING_PRESET:SOLO_TRAINING_PRESET;return newSoloTrainingMatch({decks:[deck,deck],seed,first:0});};
const extract=(p,id)=>{for(const zone of ['hand','deck','life']){const i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0];}throw Error('missing '+id)};
const place=(s,id,line,slot,owner=0,ready=true)=>{
 const p=s.players[owner],c=extract(p,id);Object.assign(c,{owner,line,slot,ready});p[line][slot]=c;return c;
};
const take=(s,a)=>soloTrainingDispatch(s,a);
const select=(s,uid)=>take(s,{type:'choose',uid});
// Complete an optional life Trigger before issuing the next attack in the same turn.
const resolveLife=s=>{while(s.pending&&['soloOptionalLife','raidTrigger','colorTrigger','specialTrigger','activeTrigger'].includes(s.pending.kind)){
 const legal=soloTrainingLegalActions(s);const action=legal.find(a=>a.mode==='skip'||a.uid===null)||legal[0];s=take(s,action);
}return s;};
test('Q2031–Q2033 Kaiser shared per mode and original printed BP; REST before block choice',()=>{
 let s=make(),p=s.players[0],one=place(s,'SLG-1-030','front',0),two=place(s,'SLG-1-030','front',1);
 const k1=place(s,'SLG-1-029','energy',0),k2=place(s,'SLG-1-029','energy',1);
 s.phase='attack';
 s=take(s,{type:'attack',uid:one.uid});assert.equal(s.pending.kind,'kaiserPick');
 s=select(s,k1.uid);assert.equal(s.pending.kind,'kaiserMode');
 s=take(s,{type:'choose',mode:'block'});
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.groupUsed['0:kaiser:block'],s.turn);
 assertSoloTrainingMatch(s);s=resolveLife(s);
 // Another shadow attacker; second Kaiser cannot choose already used mode.
 s=take(s,{type:'attack',uid:two.uid});assert.equal(s.pending.kind,'kaiserPick');
 s=select(s,k2.uid);assert.deepEqual(soloTrainingLegalActions(s),[{type:'choose',mode:'untargetable'}]);
 s=take(s,{type:'choose',mode:'untargetable'});
 assert.equal(s.groupUsed['0:kaiser:untargetable'],s.turn);assertSoloTrainingMatch(s);
});
test('Q2034/2035 Kiba chooses draw and discard or BP; all same-name cards share each option',()=>{
 let s=make(),a=place(s,'SLG-1-030','front',0),k1=place(s,'SLG-1-031','energy',0),k2=place(s,'SLG-1-031','energy',1);
 s.phase='attack';
 s=take(s,{type:'attack',uid:a.uid});
 // Kaiser is not present: Kiba is offered immediately
 assert.equal(s.pending.kind,'kibaPick');s=select(s,k1.uid);
 s=take(s,{type:'choose',mode:'buff'});assert.equal(s.players[0].front[0].buffs[0].bp,1500);
 assert.equal(s.groupUsed['0:kiba:buff'],s.turn);assertSoloTrainingMatch(s);s=resolveLife(s);
 // Other copy can only choose draw mode this turn
 s.players[0].front[0].ready=true;
 s=take(s,{type:'attack',uid:a.uid});s=select(s,k2.uid);
 assert.deepEqual(soloTrainingLegalActions(s),[{type:'choose',mode:'draw'}]);
 s=take(s,{type:'choose',mode:'draw'});
 assert.equal(s.pending.kind,'kibaDiscard');s=select(s,s.players[0].hand[0].uid);
 assert.equal(s.groupUsed['0:kiba:draw'],s.turn);assertSoloTrainingMatch(s);
});
test('Q2037/Q2071 Bel needs 4 REST original BP <=3000 shadow CHARACTERS and shares once per turn',()=>{
 let s=make(),p=s.players[0],bel=place(s,'SLG-1-033','front',0);
 for(let i=0;i<4;i++)place(s,'SLG-1-030','energy',i,0,false);
 s.phase='attack';const oldHand=p.hand.length;
 s=take(s,{type:'attack',uid:bel.uid});assert.equal(s.pending.kind,'belDiscard');
 s=select(s,s.players[0].hand[0].uid);
 assert.equal(s.players[0].hand.length,oldHand-1);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.groupUsed['0:bel'],s.turn);assertSoloTrainingMatch(s);s=resolveLife(s);
 s=take(s,{type:'attack',uid:bel.uid});
 assert.notEqual(s.pending?.kind,'belDiscard');assertSoloTrainingMatch(s);
});
test('Q2061 Kana group-once triggers only at DFN >=3 including newly entered character',()=>{
 let s=make(false),p=s.players[0];s.phase='main';p.ap=3;p.maxAp=3;
 place(s,'SLG-1-066','energy',0);place(s,'SLG-1-066','energy',1);place(s,'SLG-1-041','energy',2);place(s,'SLG-1-041','energy',3);
 const k1=extract(p,'SLG-1-067'),k2=extract(p,'SLG-1-067');p.hand.push(k1,k2);
 const action=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===k1.uid&&a.line==='front');
 assert.ok(action);s=take(s,action);
 assert.equal(s.groupUsed['0:kana'],s.turn);
 assert.equal(s.players[0].front[action.slot].ready,true);
 assert.equal(soloMatchBp(s,s.players[0].front[action.slot]),4000);
 const act2=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===k2.uid&&a.line==='front');
 assert.ok(act2);s=take(s,act2);assert.equal(s.players[0].front[act2.slot].ready,false);
 assertSoloTrainingMatch(s);
});
test('Q2064 Daily Quest facedown UID and cardId visible only to owner; cost and recovery are optional separately',()=>{
 let s=make(false),p=s.players[0];s.phase='main';p.ap=3;p.maxAp=3;
 const sung=place(s,'SLG-1-045','front',0),daily=place(s,'SLG-1-075','energy',0);
 daily.ready=true;
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===daily.uid&&a.mode==='attach'));
 s=take(s,{type:'ability',uid:daily.uid,mode:'attach'});
 const under=s.players[0].energy[0].under[0];
 assert.ok(under);
 assert.equal(inspectSoloAttached(s,{viewer:0,owner:0,hostUid:daily.uid})[0].uid,under.uid);
 assert.deepEqual(inspectSoloAttached(s,{viewer:1,owner:0,hostUid:daily.uid}),[{faceDown:true}]);
 assertSoloTrainingMatch(s);
 const toRecover=extract(s.players[0],'SLG-1-045');p=s.players[0];p.outside.push(toRecover);
 p.energy[0].ready=true;
 const can=soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===daily.uid&&a.mode==='recover');
 assert.equal(can,true);
 s=take(s,{type:'ability',uid:daily.uid,mode:'recover'});assert.equal(s.pending.kind,'dailyDiscard');
 s=select(s,s.players[0].hand[0].uid);assert.equal(s.pending.kind,'dailyUnder');
 s=select(s,under.uid);assert.equal(s.pending.kind,'dailyRecover');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===toRecover.uid));
 s=select(s,toRecover.uid);assert.ok(s.players[0].hand.some(c=>c.uid===toRecover.uid));
 assertSoloTrainingMatch(s);
});
