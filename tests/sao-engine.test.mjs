import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions,cardOf,bp,assertState} from '../dist/engine.mjs';
import {SAO_BY_ID,SAO_IMPLEMENTED_RULES,SAO_RULE_COVERAGE} from '../dist/sao-cards.mjs';
function fixture(){
 let s=newGame({seed:7802});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){
  pl.deck.push(...pl.hand,...pl.life);pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;
 }
 s.phase='main';s.turn=6;s.active=0;
 const put=(id,zone='hand',slot=0)=>{const c=s.players[0].deck.shift();c.cardId=id;if(zone==='hand')s.players[0].hand.push(c);else s.players[0][zone][slot]=c;return c;};
 return {s,put};
}
test('four SAO rule profiles are registered but the title remains gated',()=>{
 assert.deepEqual(Object.keys(SAO_IMPLEMENTED_RULES).sort(),['SAO-1-001','SAO-1-004','SAO-1-055','SAO-2-034']);
 assert.equal(SAO_BY_ID['SAO-1-055'].auto,false);
 assert.equal(SAO_BY_ID['SAO-2-002'].raid,'キリト');
});
test('SAO-1-055 Yui entry costs 1 AP, draws then chooses a discard without duplicating cards',()=>{
 const {s,put}=fixture(),card=put('SAO-1-055');
 assertState(s);
 const beforeDeck=s.players[0].deck.length;
 const a=legalActions(s).find(x=>x.type==='play'&&x.uid===card.uid&&x.line==='energy'&&x.slot===0);
 assert.ok(a);let g=dispatch(s,a);
 assert.equal(g.players[0].ap,2);
 assert.equal(g.players[0].deck.length,beforeDeck-1);
 assert.equal(g.pending?.effect.kind,'ruleChoice');
 assert.ok(g.pending?.choices.length);
 g=dispatch(g,{type:'choose',ids:[g.pending.choices[0].id]});
 assert.equal(g.players[0].outside.length,1);
 assertState(g);
});
test('SAO-1-004 Eugeo entry grants optional +1000 BP to another character',()=>{
 const {s,put}=fixture(),other=put('SAO-1-001','front',0),eugeo=put('SAO-1-004');
 const before=bp(s,other);
 const action=legalActions(s).find(a=>a.type==='play'&&a.uid===eugeo.uid&&a.line==='energy'&&a.slot===1);
 assert.ok(action);let g=dispatch(s,action);
 assert.equal(g.pending?.effect.kind,'ruleChoice');assert.ok(g.pending.choices.some(x=>x.id===other.uid));
 g=dispatch(g,{type:'choose',ids:[other.uid]});
 assert.equal(bp(g,g.players[0].front[0]),before+1000);assertState(g);
});
test('SAO-1-001 Kirito can STEP from Front L to Energy L without spending AP',()=>{
 const {s,put}=fixture(),kirito=put('SAO-1-001','front',0);
 s.phase='move';kirito.ready=false;
 const action=legalActions(s).find(x=>x.type==='step'&&x.uid===kirito.uid&&x.slot===2);
 assert.ok(action);const g=dispatch(s,action);
 assert.equal(g.players[0].ap,3);assert.equal(g.players[0].energy[2].uid,kirito.uid);
 assert.equal(g.players[0].front[0],null);assertState(g);
});
test('SAO-2-034 Eiji attack optionally mills one card to outside',()=>{
 const {s,put}=fixture(),eiji=put('SAO-2-034','front',0);
 s.phase='attack';eiji.ready=true;
 const before=s.players[0].deck.length;
 const action=legalActions(s).find(x=>x.type==='attack'&&x.uid===eiji.uid);
 assert.ok(action);let g=dispatch(s,action);
 assert.equal(g.pending?.effect.kind,'optionalMill');
 g=dispatch(g,{type:'choose',ids:['yes']});
 assert.equal(g.players[0].deck.length,before-1);
 assert.ok(g.players[0].outside.length>=1);assertState(g);
});
test('SAO-2-002 Kirito Raid uses printed same-name base and enters active',()=>{
 const {s,put}=fixture(),base=put('SAO-1-001','front',0),raid=put('SAO-2-002'),source=put('SAO-1-001','energy',0);
 source.energyBoostTurn=s.turn;source.energyBoostAmount=12;
 const a=legalActions(s).find(x=>x.type==='raid'&&x.uid===raid.uid&&x.target===base.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 const g=dispatch(s,a);
 assert.equal(g.players[0].front[0].uid,raid.uid);
 assert.equal(g.players[0].front[0].ready,true);
 assert.equal(g.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(g.players[0].ap,2);assertState(g);
});

test('strict official-text rules are compiled for vanilla, STEP and simple draw/discard profiles',()=>{
 assert.ok(SAO_RULE_COVERAGE.basicEngineImplemented>=20);
 assert.equal(SAO_RULE_COVERAGE.basicEngineImplemented+SAO_RULE_COVERAGE.pending,183);
 assert.deepEqual(SAO_BY_ID['SAO-1-107'].rules.entry,[{op:'drawDiscard',draw:3,discard:1}]);
 assert.deepEqual(SAO_BY_ID['SAO-2-041'].rules.entry,[{op:'draw',count:1}]);
 assert.equal(SAO_BY_ID['SAO-1-082'].rules.step,true);
 assert.deepEqual(SAO_BY_ID['SAO-1-019'].rules,{});
 assert.equal(SAO_BY_ID['SAO-1-021'].engineImplemented,undefined);
});
test('SAO-1-107 official 3 draw 1 discard entry is resolved in common engine',()=>{
 const {s,put}=fixture(),c=put('SAO-1-107'),source=put('SAO-1-107','energy',2);
 source.energyBoostTurn=s.turn;source.energyBoostAmount=12;
 const deckBefore=s.players[0].deck.length;
 const play=legalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='energy'&&a.slot===0);
 assert.ok(play);let g=dispatch(s,play);
 assert.equal(g.players[0].deck.length,deckBefore-3);
 assert.equal(g.pending?.effect.kind,'ruleChoice');
 g=dispatch(g,{type:'choose',ids:[g.pending.choices[0].id]});
 assert.equal(g.players[0].outside.length,1);
 assertState(g);
});
test('SAO-2-041 official one-card draw entry requires AP and moves one card out of deck',()=>{
 const {s,put}=fixture(),c=put('SAO-2-041');
 // White/blue/purple required energy may prevent play; feed correct source in Energy L.
 const source=put('SAO-2-041','energy',2);source.energyBoostTurn=s.turn;source.energyBoostAmount=12;
 const before=s.players[0].deck.length;
 const a=legalActions(s).find(x=>x.type==='play'&&x.uid===c.uid&&x.line==='energy'&&x.slot===0);
 assert.ok(a);const g=dispatch(s,a);
 assert.equal(g.players[0].deck.length,before-1);assert.equal(g.players[0].ap,3-cardOf(c).ap);
 assertState(g);
});
