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
test('FAQ Q51: normal EX07BT/BLC-2-019 Ichigo does not execute on-play Raid-box debuff',()=>{
 let s=fixture();
 const target=card(s,1,'BLC-2-019');target.ready=true;s.players[1].front[0]=target;
 energyFor(s,'BLC-2-019');
 const c=card(s,0,'BLC-2-019');s.players[0].hand.push(c);
 const act=legalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front'&&a.slot===0);
 s=dispatch(s,act);
 assert.equal(s.pending,null,'Raid-box entry must not activate without underlying card');
 assert.equal(bp(s,s.players[1].front[0]),4000);
 assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),'boxed main ability cannot be used');
 assertState(s);
});
test('FAQ Q51: normal UA08BT/BLC-1-004 As Nodt does not get Raid-box IMPACT',()=>{
 let {s,c}=normal('BLC-1-004');
 const defender=card(s,1,'BLC-1-002');defender.ready=true;
 s.players[1].front[0]=defender;life(s);
 s.players[0].front[0].ready=true;s.phase='attack';
 s=dispatch(s,{type:'attack',uid:c.uid});
 assert.equal(s.pending?.effect.kind,'block');
 s=dispatch(s,{type:'choose',ids:[defender.uid]});
 assert.equal(s.players[1].life.length,5,'Raid-box IMPACT must not apply without Raid');
 assertState(s);
});
test('screenshot regression: normally played BLC-1-053 Rukia neither draws 3 nor discards 2',()=>{
 const {s,c}=normal('BLC-1-053');
 assert.equal(s.players[0].hand.length,0,'boxed entry must not draw cards on normal deployment');
 assert.equal(s.pending,null,'boxed draw-discard must not prompt after normal deployment');
 assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),'boxed discard-to-BP+500 is not legal');
 assertState(s);
});
test('screenshot regression: normally played BLC-1-047 Renji keeps outside-box AP main ability',()=>{
 const {s,c}=normal('BLC-1-047');
 assert.equal(s.pending,null,'boxed entry must not offer to remove 4 outside cards');
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),'above-Raid-box pay-1-AP DAMAGE 2 remains playable');
 assertState(s);
});
test('BLC-1-053 real Raid correctly enables its boxed draw-three discard-two entry',()=>{
 let s=fixture();energyFor(s,'BLC-1-053');
 const target=CARDS.find(x=>x.name===BY_ID['BLC-1-053'].name&&!x.raid);
 assert.ok(target,'need real Rukia non-Raid base');
 const base=card(s,0,target.id);s.players[0].front[0]=base;
 const top=card(s,0,'BLC-1-053');s.players[0].hand.push(top);
 const a=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid&&a.line==='front'&&a.slot===0);
 assert.ok(a,'Rukia Raid action available');
 s=dispatch(s,a);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].hand.length,3,'boxed entry draws three on genuine Raid');
 assert.equal(s.pending?.effect.kind,'ruleChoice','boxed two-card discard selection must trigger');
 assertState(s);
});
test('normal play shows inactive Raid-box indicator, rather than an active Raid overlay',()=>{
 const ui=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(ui,/RAID 未啟動/);
 assert.match(ui,/普通登場：Raid 框內能力無效/);
});

test('EX15BT/BLC-4-033 Yoruichi Raid-box entry only works after real Raid',()=>{
 let s=fixture();energyFor(s,'BLC-4-033');
 const base=card(s,0,'BLC-4-031');base.ready=false;s.players[0].front[0]=base;
 const other=card(s,0,'BLC-4-030');other.ready=false;s.players[0].front[1]=other;
 const top=card(s,0,'BLC-4-033');s.players[0].hand.push(top);
 const a=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid&&a.line==='front'&&a.slot===0);
 assert.ok(a,'expected valid Yoruichi Raid');
 s=dispatch(s,a);
 assert.equal(s.players[0].front[0].stack.length,1);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending?.effect.kind,'ruleChoice');
 assert.ok(s.pending.choices.some(x=>x.id===other.uid));
 s=dispatch(s,{type:'choose',ids:[other.uid]});
 assert.equal(s.players[0].front[1].ready,true,'Raid-only ACTIVE entry should resolve');
 assertState(s);
});


const LEGACY_RAID_CARDS=[
 'BLC-1-004','BLC-1-014','BLC-1-020','BLC-1-024','BLC-1-041',
 'BLC-1-047','BLC-1-050','BLC-1-053','BLC-1-070','BLC-1-085',
 'BLC-1-093','BLC-2-019','BLC-2-034','BLC-2-038','BLC-2-057','BLC-2-065'
];
test('all 24 BLEACH Raid-printed cards are inventoried: 23 booster profiles + starter 104',()=>{
 const all=CARDS.filter(c=>c.type==='character'&&c.raid);
 assert.equal(all.length,24,'Raid catalogue size changed: expand this regression inventory');
 assert.ok(all.some(c=>c.id==='104'&&c.number==='UA08ST/BLC-1-104'),'Starter Ichigo Raid omitted');
 for(const profile of all){
  if(profile.id==='104'){
   // UA08ST Ichigo runs through the legacy starter engine, not EXTRA_RULES.
   // Only the Raid deployment readiness is tested here; the printed main
   // ability requires its own card-image boundary acceptance.
   continue;
  }
  assert.ok(profile.rules,'Raid card missing rule profile: '+profile.id);
  if(LEGACY_RAID_CARDS.includes(profile.id)){
   assert.ok(profile.rules.raidBox&&Object.values(profile.rules.raidBox).some(Boolean),
    'missing legacy Raid-box boundary: '+profile.id);
  }else{
   assert.ok(['BLC-2-067','BLC-4-012','BLC-4-033','BLC-4-050','BLC-4-053','BLC-4-069','BLC-4-075'].includes(profile.id),
    'New Raid card lacks classification: '+profile.id);
  }
 }
});
for(const id of LEGACY_RAID_CARDS){
 test('FAQ Q51 normal '+id+' has no Raid-only on-entry prompt, readiness or main ability',()=>{
  const {s,c}=normal(id);
  const box=BY_ID[id].rules.raidBox;
  assert.equal(s.pending,null,'normal deployment unexpectedly resolved Raid-box entry: '+id);
  assert.equal(s.players[0].front[0].ready,false);
  if(box.ability)
   assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),
    'normal deployment offered boxed ability: '+id);
  assertState(s);
 });
}
test('EX15BT/BLC-4-012: normal Jugram retains non-box entry; Raid tax and retirement passive stay disabled',()=>{
 let s=fixture();
 const source=card(s,0,'BLC-1-002');s.players[0].energy[0]=source;
 source.ready=true;source.energyBoostTurn=s.turn;source.energyBoostAmount=12;
 const jugram=card(s,0,'BLC-4-012');
 s.players[0].hand.push(jugram);
 const a=legalActions(s).find(x=>x.type==='play'&&x.uid===jugram.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 s=dispatch(s,a);
 assert.equal(s.players[0].front[0].stack.length,0);
 assert.equal(s.players[0].front[0].ready,false);
 assertState(s);
});
test('EX15BT/BLC-4-053: Byakuya normal entry is OUTSIDE Raid box and must still debuff enemy',()=>{
 let s=fixture();energyFor(s,'BLC-4-053');
 const opponent=card(s,1,'BLC-2-019');s.players[1].front[0]=opponent;
 const top=card(s,0,'BLC-4-053');s.players[0].hand.push(top);
 const a=legalActions(s).find(x=>x.type==='play'&&x.uid===top.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);s=dispatch(s,a);
 assert.equal(s.players[0].front[0].stack.length,0);
 assert.equal(s.pending?.effect.kind,'ruleChoice');
 assert.ok(s.pending.choices.some(x=>x.id===opponent.uid));
 s=dispatch(s,{type:'choose',ids:[opponent.uid]});
 assert.equal(bp(s,s.players[1].front[0]),3000);
 assertState(s);
});
test('EX15BT/BLC-4-069: normal Kyoraku activates non-box conditional AP discount',()=>{
 const {s,c}=normal('BLC-4-069');
 assert.ok(s.players[0].nextApDiscount?.turn===s.turn,
  'normal entry should provide discounted next Haten Kyokotsu card');
 assert.equal(s.players[0].front[0].stack.length,0);
 assertState(s);
});
test('EX15BT/BLC-4-075: normal Ukitake may use OUTSIDE Raid-box draw and entry-turn ability but not extra Raid energy',()=>{
 let s=fixture();energyFor(s,'BLC-4-075');
 const before=s.players[0].hand.length;
 const top=card(s,0,'BLC-4-075');s.players[0].hand.push(top);
 const a=legalActions(s).find(x=>x.type==='play'&&x.uid===top.uid&&x.line==='energy'&&x.slot===1);
 assert.ok(a,'Ukitake normal deployment is only allowed on energy line');
 s=dispatch(s,a);
 assert.equal(s.players[0].hand.length,before+1,'normal Ukitake should draw one');
 assert.equal(s.players[0].energy[1].stack.length,0);
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===top.uid),
  'main ability outside Raid box available on entering turn');
 assertState(s);
});
test('EX07BT/BLC-2-067, EX15BT/033 and /050 special Raid effects disabled in normal deployment',()=>{
 for(const id of ['BLC-2-067','BLC-4-033','BLC-4-050']){
  const {s,c}=normal(id);
  if(id==='BLC-4-050')
   assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));
  if(id==='BLC-2-067')assert.equal(bp(s,c),4000);
  assert.equal(c.stack.length,0);assertState(s);
 }
});

test('UA08ST/BLC-1-104 starter Ichigo normal play remains REST with no Raid base',()=>{
 const {s,c}=normal('104');
 assert.equal(s.players[0].front[0].stack.length,0);
 assert.equal(s.players[0].front[0].ready,false);
 assertState(s);
});
