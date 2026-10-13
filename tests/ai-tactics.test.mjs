import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions,controller} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

function board(){
 let s=newGame({seed:321});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 s.active=0;s.phase='main';s.turn=9;s.pending=null;s.queue=[];
 for(const p of s.players){p.hand=[];p.front.fill(null);p.energy.fill(null);p.turnCount=5;p.ap=3;}
 return s;
}
let uid=0;
const card=(id,extra={})=>({uid:'fixture-'+(++uid),cardId:id,ready:true,buffs:[],stack:[],under:[],usedTurn:-1,blockTurn:-1,...extra});
const setLife=(s,p,n)=>s.players[p].life=s.players[p].deck.slice(0,n);
function attack(s,c){s.phase='attack';return dispatch(s,{type:'attack',uid:c.uid});}

test('opening zero-cost unit builds energy instead of an unusable front line',()=>{
 const s=board(),c=card('039');s.players[0].hand=[c];s.players[0].ap=1;
 for(const difficulty of ['normal','hard'])assert.equal(chooseAiAction(s,{difficulty}).line,'energy');
});
test('visible removal target is resolved in planning instead of being scored as a lost AP',()=>{
 const s=board(),event=card('064');s.players[0].hand=[event];
 for(let i=0;i<4;i++)s.players[0].energy[i]=card('039');
 s.players[1].front[0]=card('037');
 assert.equal(chooseAiAction(s,{difficulty:'hard'}).uid,event.uid);
});
test('DAMAGE 2 at two life is blocked even if the defender retires',()=>{
 const s=board(),a=card('101',{damageTurn:s.turn}),b=card('039');
 s.players[0].front[0]=a;s.players[1].front[0]=b;setLife(s,1,2);
 const pending=attack(s,a),move=chooseAiAction(pending,{difficulty:'hard'});
 assert.deepEqual(move,{type:'choose',ids:[b.uid]});
 assert.ok(legalActions(pending).some(x=>JSON.stringify(x)===JSON.stringify(move)));
});
test('reserve the strong blocker for a later IMPACT attack',()=>{
 const s=board(),small=card('039'),big=card('101',{impactTurn:s.turn}),weak=card('039'),strong=card('104',{buffs:[{turn:s.turn,bp:1000}]});
 s.players[0].front=[small,big,null,null];s.players[1].front=[strong,weak,null,null];setLife(s,1,1);
 const pending=attack(s,small);
 assert.deepEqual(chooseAiAction(pending,{difficulty:'hard'}),{type:'choose',ids:[weak.uid]});
});
test('mandatory blocking never produces a pass action',()=>{
 const s=board(),a=card('101'),b=card('039',{forcedBlockTurn:s.turn});
 s.players[0].front[0]=a;s.players[1].front[0]=b;
 const pending=attack(s,a);
 assert.deepEqual(chooseAiAction(pending,{difficulty:'hard'}),{type:'choose',ids:[b.uid]});
});
test('combat and main planning do not use secret card identities or mutate state',()=>{
 for(const phase of ['main','attack']){
  const s=board();s.phase=phase;s.players[0].hand=[card('039'),card('101')];
  s.players[0].front[0]=card('101');s.players[1].front[0]=card('037');
  const altered=structuredClone(s);
  for(const [p,pl] of altered.players.entries()){
   for(const zone of ['deck','life',...(p===1?['hand']:[])])
    pl[zone]=pl[zone].map(c=>({...c,cardId:'064'})).reverse();
  }
  const before=JSON.stringify(s);
  assert.deepEqual(chooseAiAction(s,{difficulty:'hard'}),chooseAiAction(altered,{difficulty:'hard'}));
  assert.equal(JSON.stringify(s),before);
 }
});
test('reordering hand candidates does not starve a good play of search budget',()=>{
 const s=board();for(let i=0;i<4;i++)s.players[0].energy[i]=card('039');
 s.players[0].hand=[card('039'),card('037'),card('101'),card('064')];s.players[1].front[0]=card('037');
 const reordered=structuredClone(s);reordered.players[0].hand.reverse();
 assert.deepEqual(chooseAiAction(s,{difficulty:'hard'}),chooseAiAction(reordered,{difficulty:'hard'}));
});

test('sniper can target a valuable REST unit instead of making a low-impact direct attack',()=>{
  const s=board(),sniper=card('101',{sniperTurn:s.turn,buffs:[{turn:s.turn,bp:3000}]}),
    target=card('104',{ready:false,buffs:[{turn:s.turn,bp:1000}]});
  s.phase='attack';s.players[0].front[0]=sniper;s.players[1].front[0]=target;setLife(s,1,7);
  const picked=chooseAiAction(s,{difficulty:'hard'});
  assert.deepEqual(picked,{type:'snipe',uid:sniper.uid,target:target.uid});
  assert.ok(legalActions(s).some(a=>JSON.stringify(a)===JSON.stringify(picked)));
});
test('sniper does not give up an unblocked lethal direct attack',()=>{
  const s=board(),sniper=card('101',{sniperTurn:s.turn,buffs:[{turn:s.turn,bp:3000}]}),
    target=card('104',{ready:false,buffs:[{turn:s.turn,bp:1000}]});
  s.phase='attack';s.players[0].front[0]=sniper;s.players[1].front[0]=target;setLife(s,1,1);
  const picked=chooseAiAction(s,{difficulty:'hard'});
  assert.equal(picked.type,'attack');
  assert.equal(picked.uid,sniper.uid);
});
