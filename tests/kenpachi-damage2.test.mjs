import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRESETS, BY_ID} from '../dist/cards.mjs';
import {newGame, dispatch, legalActions, bp, damageOf, assertState} from '../dist/engine.mjs';

// Official card EX07BT/BLC-2-067: Raid on a base with printed energy >= 4
// gains BP +1000 and DAMAGE (2) for this turn. It does NOT deal 2 life
// damage upon entering; DAMAGE (2) is resolved when its direct attack hits.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-067
function fixture() {
 const needed=['BLC-2-067','BLC-1-080','BLC-2-066','BLC-1-075'];
 const counts={...PRESETS[0].counts};
 for(const id of needed) {
  assert.ok(BY_ID[id], 'missing '+id);
  if(counts[id]>0)continue;
  const donor=Object.keys(counts).find(k=>counts[k]>0&&!needed.includes(k));
  assert.ok(donor,'missing donor for '+id);
  counts[donor]--;counts[id]=(counts[id]||0)+1;
 }
 let s=newGame({seed:267,first:0,decks:[counts,counts]});
 s=dispatch(s,{type:'keep'});
 s=dispatch(s,{type:'keep'});
 for(const pl of s.players){
  pl.deck.push(...pl.hand,...pl.life);
  pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);
  pl.ap=3;pl.maxAp=3;pl.turnCount=3;
 }
 s.phase='main';s.active=0;s.turn=5;s.queue=[];s.pending=null;
 return s;
}
function take(s,p,id){
 const cards=s.players[p].deck;const index=cards.findIndex(x=>x.cardId===id);
 assert.ok(index>=0,'expected '+id+' in deck');
 return cards.splice(index,1)[0];
}
function setupRaid(baseId){
 let s=fixture();
 const power=take(s,0,'BLC-1-075');
 power.ready=true;power.energyBoostTurn=s.turn;power.energyBoostAmount=12;
 s.players[0].energy[0]=power;
 const base=take(s,0,baseId);base.ready=false;
 s.players[0].front[0]=base;
 const top=take(s,0,'BLC-2-067');s.players[0].hand.push(top);
 s.players[1].life.push(...s.players[1].deck.splice(0,5));
 const action=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'Kenpachi must be able to Raid onto '+baseId);
 return {s:dispatch(s,action),base,top};
}

test('EX07BT/BLC-2-067 high-energy Raid base grants DAMAGE 2 and +1000 BP, not immediate 2 life loss',()=>{
 let {s,top}=setupRaid('BLC-1-080'); // printed energy 4
 const c=s.players[0].front[0];
 assert.equal(c.uid,top.uid);
 assert.equal(c.ready,true);
 assert.equal(bp(s,c),5000);
 assert.equal(damageOf(s,c),2);
 assert.equal(s.players[1].life.length,5,'Raid entry does not immediately deal damage');
 assert.ok(s.log.some(x=>x.message.includes('DAMAGE 2')),'player gets confirmation of temporary keyword');
 assertState(s);
});

test('Kenpachi DAMAGE 2 actually causes two direct life damage when not blocked',()=>{
 let {s,top}=setupRaid('BLC-1-080');
 s.phase='attack';
 s=dispatch(s,{type:'attack',uid:top.uid});
 assert.equal(s.pending?.effect.kind,'block');
 s=dispatch(s,{type:'choose',ids:['pass']});
 assert.equal(s.players[1].life.length,3,'unblocked direct attack must take 2 life');
 assertState(s);
});

test('Kenpachi blocked attack deals only printed IMPACT 1, not DAMAGE 2',()=>{
 let {s,top}=setupRaid('BLC-1-080');
 const defender=take(s,1,'BLC-2-066');defender.ready=true;
 s.players[1].front[0]=defender;
 s.phase='attack';
 s=dispatch(s,{type:'attack',uid:top.uid});
 assert.equal(s.pending?.effect.kind,'block');
 assert.ok(s.pending.choices.some(x=>x.id===defender.uid));
 s=dispatch(s,{type:'choose',ids:[defender.uid]});
 assert.equal(s.players[1].life.length,4,'winning blocked attack should deal only Impact 1');
 assertState(s);
});

test('Kenpachi low-energy base and normal play must not gain conditional DAMAGE 2',()=>{
 let {s}=setupRaid('BLC-2-066'); // printed energy 0
 const c=s.players[0].front[0];
 assert.equal(damageOf(s,c),1);
 assert.equal(bp(s,c),4000);
 assert.ok(!s.log.some(x=>x.message.includes('DAMAGE 2')),'low base does not trigger');
 assertState(s);
});

test('temporary Kenpachi DAMAGE 2 expires after the current turn',()=>{
 let {s}=setupRaid('BLC-1-080');
 const c=s.players[0].front[0];
 assert.equal(damageOf(s,c),2);
 s.turn++;
 assert.equal(damageOf(s,c),1);
 assertState(s);
});

test('arena shows Kenpachi damage keyword on board and for accessibility',()=>{
 const ui=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(ui,/damageOf\(game,c\)===2/);
 assert.match(ui,/DAMAGE 2/);
});
