import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions,assertState,energy} from '../dist/engine.mjs';
import {CARDS} from '../dist/cards.mjs';

function game(){
 let s=newGame({seed:23});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const p of s.players){p.deck.push(...p.hand,...p.life);p.hand=[];p.life=[];p.front.fill(null);p.energy.fill(null);p.ap=3;p.maxAp=3;p.turnCount=3;}
 s.phase='main';s.turn=5;s.active=0;return s;
}
function take(s,id,p=0){const a=s.players[p].deck,i=a.findIndex(c=>c.cardId===id);assert.ok(i>=0,'missing '+id);return a.splice(i,1)[0];}
function setup(s,{baseId='039',baseLine='front',baseSlot=0,topId='104'}={}){
 const source=take(s,'102');source.ready=true;s.players[0].energy[0]=source;
 const power=take(s,'103');power.ready=true;s.players[0].energy[2]=power;
 const base=take(s,baseId);base.ready=false;base.skipActive=2;base.buffs=[{turn:s.turn,bp:500}];
 s.players[0][baseLine][baseSlot]=base;
 const top=take(s,topId);s.players[0].hand.push(top);
 const action=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'legal Raid action');
 return {base,top,action};
}
test('REST front Raid base becomes ACTIVE without inheriting its transient restrictions',()=>{
 let s=game();const {base,top,action}=setup(s);
 s=dispatch(s,action);const raid=s.players[0].front[0];
 assert.equal(raid.uid,top.uid);assert.equal(raid.ready,true);assert.equal(raid.skipActive,undefined);
 assert.equal(raid.stack[0].uid,base.uid);assert.equal(raid.stack[0].ready,false);
 assert.equal(raid.stack[0].skipActive,undefined);assert.deepEqual(raid.stack[0].buffs,[]);
 s.phase='attack';assert.ok(legalActions(s).some(a=>a.type==='attack'&&a.uid===top.uid));assertState(s);
});
test('REST energy base Raids to front and energy production follows the new location',()=>{
 let s=game();const {base,top,action}=setup(s,{baseId:'103',baseLine:'energy',baseSlot:1});
 s=dispatch(s,action);assert.equal(s.players[0].energy[1],null);
 assert.equal(s.players[0].front[0].uid,top.uid);assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);assert.equal(energy(s,0),4);assertState(s);
});
test('normal deployment of a printed Raid remains REST and does not consume base',()=>{
 let s=game();const {base,top}=setup(s);
 s=dispatch(s,{type:'play',uid:top.uid,line:'front',slot:1});
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[0].front[1].stack.length,0);
 assert.equal(s.players[0].front[0].uid,base.uid);assertState(s);
});
test('all printed Raid profiles use the shared state rule rather than card-specific overrides',()=>{
 const raidCards=CARDS.filter(c=>c.raid);
 assert.equal(raidCards.length,24);
 for(const card of raidCards)assert.equal(card.type,'character',card.identity);
});
