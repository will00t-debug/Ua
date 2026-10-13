import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BY_ID, CARDS} from '../dist/cards.mjs';
import {newGame, dispatch, legalActions, bp, assertState} from '../dist/engine.mjs';

function fixture(){
 let s=newGame({seed:5101,first:0,mode:'hotseat'});
 s=dispatch(s,{type:'keep'});
 s=dispatch(s,{type:'keep'});
 for(const pl of s.players){
  pl.deck.push(...pl.hand,...pl.life);
  pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);
  pl.ap=3;pl.maxAp=3;pl.turnCount=3;
 }
 s.active=0;s.phase='main';s.turn=10;s.queue=[];s.pending=null;
 return s;
}
function card(s,p,id){
 assert.ok(BY_ID[id],'missing card id: '+id);
 const x=s.players[p].deck.shift();
 assert.ok(x,'no cards remaining in deck for fixture');
 x.cardId=id;return x;
}
function energyFor(s,id){
 const d=BY_ID[id];
 const source=CARDS.find(c=>c.color===d.color&&c.type==='character'&&!c.raid);
 assert.ok(source,'no energy source for '+id);
 const e=card(s,0,source.id);
 e.ready=true;e.energyBoostTurn=s.turn;e.energyBoostAmount=12;
 s.players[0].energy[0]=e;
}
function normal(id){
 let s=fixture();energyFor(s,id);
 const c=card(s,0,id);s.players[0].hand.push(c);
 const a=legalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front'&&a.slot===0);
 assert.ok(a,'expected legal normal play for '+id);
 s=dispatch(s,a);
 assert.equal(s.players[0].front[0].uid,c.uid);
 assert.equal(s.players[0].front[0].stack.length,0,'normal play must not accidentally attach a Raid base');
 assert.equal(s.players[0].front[0].ready,false,'normal Raid card does not ready itself');
 return {s,c};
}
function life(s,n=5){
 s.players[1].life.push(...s.players[1].deck.splice(0,n));
}
test('FAQ Q51: normal EX15BT/BLC-4-033 Yoruichi does not trigger Raid-box ACTIVE entry',()=>{
 const {s,c}=normal('BLC-4-033');
 assert.equal(s.pending,null,'Raid-only choice must not appear on normal deployment');
 assert.ok(!s.log.some(x=>x.kind==='effect'&&x.message.includes('轉為 ACTIVE')),'no Raid-only activation');
 assertState(s);
});
test('FAQ Q51: normal EX15BT/BLC-4-050 Renji cannot use Raid-only main ability',()=>{
 const {s,c}=normal('BLC-4-050');
 assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));
 assertState(s);
});
test('FAQ Q51: normal EX07BT/BLC-2-067 Kenpachi never gains high-base Raid buff',()=>{
 let {s,c}=normal('BLC-2-067');
 assert.equal(bp(s,s.players[0].front[0]),4000);
 assertState(s);
 // A normal-played character cannot attack on entry, but on a later turn its
 // direct attack still deals 1, not DAMAGE (2) from the Raid-only condition.
 s.players[0].front[0].ready=true;s.phase='attack';life(s);
 s=dispatch(s,{type:'attack',uid:c.uid});
 assert.equal(s.pending?.effect.kind,'block');
 s=dispatch(s,{type:'choose',ids:['pass']});
 assert.equal(s.players[1].life.length,4);
 assertState(s);
});
test('FAQ Q51: normal EX07BT/BLC-2-019 Ichigo keeps its out-of-box on-play debuff',()=>{
 let s=fixture();
 const target=card(s,1,'BLC-2-019');target.ready=true;
 s.players[1].front[0]=target;
 energyFor(s,'BLC-2-019');
 const c=card(s,0,'BLC-2-019');s.players[0].hand.push(c);
 const act=legalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front'&&a.slot===0);
 s=dispatch(s,act);
 assert.equal(s.pending?.effect.kind,'ruleChoice','out-of-Raid-box entry remains active');
 assert.ok(s.pending.choices.some(x=>x.id===target.uid));
 s=dispatch(s,{type:'choose',ids:[target.uid]});
 assert.equal(bp(s,s.players[1].front[0]),2500);
 assertState(s);
});
test('FAQ Q51: normal UA08BT/BLC-1-004 As Nodt keeps printed IMPACT 1 outside Raid box',()=>{
 let {s,c}=normal('BLC-1-004');
 const defender=card(s,1,'BLC-1-002');defender.ready=true;
 s.players[1].front[0]=defender;life(s);
 s.players[0].front[0].ready=true;s.phase='attack';
 s=dispatch(s,{type:'attack',uid:c.uid});
 assert.equal(s.pending?.effect.kind,'block');
 s=dispatch(s,{type:'choose',ids:[defender.uid]});
 assert.equal(s.players[1].life.length,4,'outside-box printed IMPACT still applies without Raid');
 assertState(s);
});
test('normal play shows inactive Raid-box indicator, rather than an active Raid overlay',()=>{
 const ui=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(ui,/RAID 未啟動/);
 assert.match(ui,/普通登場：Raid 框內能力無效/);
});
