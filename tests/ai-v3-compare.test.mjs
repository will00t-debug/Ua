import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {comparedLines,mergeRows} from '../dist/universal-v2/ai-v3/search.mjs';
import {keepBest} from '../dist/universal-v2/ai-v3/beam.mjs';

function deck(pack){
 const counts={'BLC-1-042':4,'BLC-1-043':2,'BLC-1-051':2};
 let total=8;
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function place(state,player,card,line,slot){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
function take(state,player,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
const pack=officialV2Pack('bleach');
const counts=deck(pack);

function attackState(){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:1});
 while(state.phase!=='attack')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 const blocker=take(state,0,'BLC-1-051');
 const attacker=take(state,1,'BLC-1-042');
 place(state,0,blocker,'front',0);
 place(state,1,attacker,'front',0);
 while(state.players[0].life.length>1)state.players[0].deck.push(state.players[0].life.pop());
 return {packs,state,attacker,blocker};
}

test('compare: a finished loss does not hide an unfinished alternative',()=>{
 const {packs,state,attacker}=attackState();
 const legal=legalUniversalActions(packs,state);
 const attack=legal.find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const pass=legal.find(action=>action.type==='next');
 assert.ok(attack&&pass);
 assert.equal(assertUniversalMatch(packs,state),true);
 const loss=comparedLines([
  {action:attack,search:-100000,boundary:'terminal',settled:true},
  {action:pass,search:20,boundary:'pending',settled:false,phase:'attack',pending:'block',
   leafTurn:state.turn,leafActive:state.active,leafPendingPlayer:0,leafOwnTurns:[1,1]}
 ]);
 assert.equal(loss.contested,true);
 assert.equal(loss.rows.length,0);
 const onlyLoss=comparedLines([
  {action:attack,search:-100000,boundary:'terminal',settled:true}
 ]);
 assert.equal(onlyLoss.rows.length,1);
 assert.equal(onlyLoss.rows[0].action.uid,attack.uid);
 const win=comparedLines([
  {action:attack,search:90000,boundary:'terminal',settled:true},
  {action:pass,search:20,boundary:'pending',settled:false}
 ]);
 assert.equal(win.rows.length,1);
 assert.equal(win.rows[0].search,90000);
});

test('compare: a settled loss does not outrank an unfinished line for us',()=>{
 const unfinished=keepBest({value:-100000,snap:{id:'loss'},settled:true},20,{id:'open'},false,true);
 assert.equal(unfinished.settled,false);
 assert.equal(unfinished.value,20);
 const kept=keepBest({value:30,snap:{id:'home'},settled:true},80,{id:'open'},false,true);
 assert.equal(kept.settled,true);
 assert.equal(kept.value,30);
 const blocked=keepBest({value:90000,snap:{id:'win'},settled:true},12,{id:'block'},true,false);
 assert.equal(blocked.value,12);
});

test('compare: only the same friendly plan accepts an opponent refutation',()=>{
 const plan=[{kind:'root',type:'play',uid:'0-1',line:'front',mode:''}];
 const reply=[...plan,{kind:'reply',type:'block',uid:'1-2',line:'',mode:''}];
 const other=[{kind:'root',type:'play',uid:'0-1',line:'front',mode:''},{kind:'choice',type:'raid',uid:'0-9',line:'',mode:''}];
 const refuted=mergeRows(
  {search:90000,settled:true,boundary:'terminal',sequence:plan,refuted:false},
  {search:12,settled:true,boundary:'returned',sequence:reply,refuted:true}
 );
 assert.equal(refuted.search,12);
 const different=mergeRows(
  {search:40,settled:true,boundary:'returned',sequence:plan,refuted:false},
  {search:10,settled:true,boundary:'returned',sequence:other,refuted:true}
 );
 assert.equal(different.search,40);
 const improved=mergeRows(
  {search:10,settled:true,boundary:'returned',sequence:plan},
  {search:25,settled:true,boundary:'returned',sequence:other,refuted:false}
 );
 assert.equal(improved.search,25);
});

test('compare: pending controllers are not the same boundary',()=>{
 const {packs,state,attacker}=attackState();
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const pending=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(pending.pending.kind,'block');
 assert.ok(pending.pending.player===0||pending.pending.player===1);
 const controller=pending.pending.player;
 const base={search:10,boundary:'pending',settled:false,phase:pending.phase,pending:pending.pending.kind,
  leafTurn:pending.turn,leafActive:pending.active,leafOwnTurns:pending.players.map(player=>player.ownTurns),
  leafSource:pending.pending.sourceUid||null,leafProgress:''};
 const block=legalUniversalActions(packs,pending);
 const pass=block.find(action=>action.uid==null);
 const body=block.find(action=>action.uid);
 assert.ok(pass&&body);
 const split=comparedLines([
  {...base,action:pass,leafPendingPlayer:controller},
  {...base,action:body,leafPendingPlayer:1-controller,search:30}
 ]);
 assert.equal(split.rows.length,0);
 const samePlayer=comparedLines([
  {...base,action:pass,leafPendingPlayer:controller},
  {...base,action:body,leafPendingPlayer:controller,search:30}
 ]);
 assert.equal(samePlayer.rows.length,2);
 console.log('compare pending',controller,'active',pending.active);
});

test('compare: an unchosen life is not a scored attack',()=>{
 const raid={type:'raid',uid:'0-11',baseUid:'0-8'};
 const play={type:'play',uid:'0-11',line:'front'};
 const open={action:raid,search:500,boundary:'pending',pending:'attack-life-target',damageOpen:true,
  settled:false,stopReason:'unhandled',stopPending:'attack-life-target',stopPlayer:0};
 const home={action:play,search:100,boundary:'returned',settled:true,damageOpen:false};
 const ranked=comparedLines([open,home]);
 assert.equal(ranked.unresolved,1);
 assert.equal(ranked.rows.length,1);
 assert.equal(ranked.rows[0].action.type,'play');
 const only=comparedLines([open]);
 assert.equal(only.rows.length,0);
 assert.equal(only.unresolved,1);
 const loss=comparedLines([
  {action:play,search:-100000,boundary:'terminal',settled:true},
  open
 ]);
 assert.equal(loss.contested,true);
 assert.equal(loss.rows.length,0);
});
