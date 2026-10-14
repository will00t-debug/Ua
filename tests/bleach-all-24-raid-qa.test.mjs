import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,BY_ID} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,assertState,bp,damageOf} from '../dist/engine.mjs';

// Inventory: all printed Raid characters in the BLEACH simulator, including
// the UA08ST starter deck. Official reference: UNION ARENA FAQ Q51.
// Each variant must be normally playable *without* a base and (separately)
// genuinely Raid onto a legal base. Follow-on card-effect QA is distinct.
const raiders=CARDS.filter(d=>d.type==='character'&&!!d.raid);
const plainCharacters=CARDS.filter(d=>d.type==='character'&&!d.raid);
assert.equal(raiders.length,24,'New printed Raid card: update inventory/coverage before merging');

function fixture(){
 let s=newGame({seed:20261014,first:0,mode:'hotseat'});
 s=dispatch(s,{type:'keep'});
 s=dispatch(s,{type:'keep'});
 for(const pl of s.players){
  pl.deck.push(...pl.hand,...pl.life);
  pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);
  pl.ap=3;pl.maxAp=3;pl.turnCount=3;
 }
 s.phase='main';s.active=0;s.turn=12;s.queue=[];s.pending=null;
 return s;
}
function staged(id,{withBase=false}={}){
 let s=fixture(),owner=s.players[0],d=BY_ID[id];
 const energyProvider=plainCharacters.find(x=>x.color===d.color&&x.gen>0);
 assert.ok(energyProvider,'missing energy provider '+id);
 const provider=owner.deck.shift();
 provider.cardId=energyProvider.id;
 provider.ready=true;provider.energyBoostTurn=s.turn;provider.energyBoostAmount=20;
 owner.energy[0]=provider;
 const top=owner.deck.shift();
 top.cardId=id;owner.hand.push(top);
 let base;
 if(withBase){
  base=owner.deck.shift();
  base.cardId=energyProvider.id;base.ready=true;
  if(d.rules?.energyOnly)owner.energy[1]=base;
  else owner.front[1]=base;
 }
 return {s,owner,d,top,base};
}

for(const d of raiders){
 test('Q51: '+d.number+' ordinary deployment does not create a Raid stack',()=>{
  let {s,top}=staged(d.id);
  const moves=legalActions(s).filter(a=>a.type==='play'&&a.uid===top.uid);
  assert.ok(moves.length,'No legal ordinary deployment for '+d.number);
  s=dispatch(s,moves[0]);
  assert.equal(s.players[0][moves[0].line][moves[0].slot]?.uid,top.uid);
  assert.equal(s.players[0][moves[0].line][moves[0].slot]?.stack?.length||0,0,
    'Normal deployment unexpectedly created Raid state for '+d.number);
  assertState(s);
 });

 test('Q51: '+d.number+' can actually Raid on an eligible unraided base',()=>{
  let {s,owner,top,base}=staged(d.id,{withBase:true});
  let choice=null;
  for(const candidate of plainCharacters){
   base.cardId=candidate.id;
   const actions=legalActions(s);
   choice=actions.find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid);
   if(choice)break;
  }
  assert.ok(choice,'No legal Raid base found in 24-card catalog for '+d.number);
  const after=dispatch(s,choice);
  const placed=after.players[0][choice.line][choice.slot];
  assert.equal(placed?.uid,top.uid,'Raid top not present '+d.number);
  assert.equal(placed?.stack?.length,1,'Raid must have exactly one face-up base '+d.number);
  assert.equal(placed.stack[0].uid,base.uid,'Raid lost wrong base '+d.number);
  assert.equal(placed.ready,true,'Raid character should enter ACTIVE '+d.number);
  assertState(after);
 });
}

test('UA08ST/BLC-1-104: normal Ichigo cannot use boxed remove-four/draw/IMPACT ability',()=>{
 let {s,top}=staged('104');
 const play=legalActions(s).find(a=>a.type==='play'&&a.uid===top.uid);
 s=dispatch(s,play);
 assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===top.uid),
  'Printed Raid card without stack illegally accesses boxed starter ability');
 assertState(s);
});
test('UA08ST/BLC-1-104: genuine Raid Ichigo can use boxed ability but loses it under silence (Q2330)',()=>{
 let {s,top,base}=staged('104',{withBase:true});
 base.cardId='039'; // starter Ichigo 0-energy base
 const raid=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid);
 assert.ok(raid);
 s=dispatch(s,raid);
 const live=s.players[0][raid.line][raid.slot];
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===top.uid),
  'genuine Raid must be able to activate its main ability');
 live.silencedUntilSource={p:1,turnCount:s.players[1].turnCount+2};
 assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===top.uid),
  'Q2330: losing original text disables boxed main ability even if stack persists');
 assertState(s);
});

test('EX15BT/BLC-4-053: 3 BP-reduced enemy Front characters are needed for DAMAGE 2',()=>{
 let s=fixture();
 const owner=s.players[0];
 const top=owner.deck.shift();top.cardId='BLC-4-053';
 const base=owner.deck.shift();base.cardId='BLC-4-051';
 top.stack=[base];top.ready=true;owner.front[0]=top;
 for(let i=0;i<3;i++){
  const enemy=s.players[1].deck.shift();enemy.cardId='BLC-2-019';enemy.ready=true;
  s.players[1].front[i]=enemy;
 }
 for(let i=0;i<3;i++){
  assert.equal(damageOf(s,top),i===3?2:1,'Premature DAMAGE 2 with '+i+' reduced enemies');
  s.players[1].front[i].buffs.push({turn:s.turn,bp:-500});
 }
 assert.equal(s.players[1].front.filter(c=>c&&bp(s,c)<BY_ID[c.cardId].bp).length,3);
 assert.equal(damageOf(s,top),2,'Three BP-reduced opposing Front characters activate DAMAGE 2');
 s.active=1;
 assert.equal(damageOf(s,top),1,'Only during the owning player turn');
 s.active=0;
 top.stack=[];
 assert.equal(damageOf(s,top),1,'Normal deployment never has conditional Raid DAMAGE 2');
 top.stack=[base];
 assertState(s);
});
