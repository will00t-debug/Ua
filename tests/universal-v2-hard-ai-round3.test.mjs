import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalImpact,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,lastHardAiTrace,
 hardPositionKey,hardCachedScores} from '../dist/universal-v2/hard-ai-search-3.mjs';
import {chooseFrozenHardSearch2} from '../dist/universal-v2/hard-ai-search-2.mjs';
import {deckPlan,openingKeeps,planStage} from '../dist/universal-v2/hard-ai-plans.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const decks=Object.fromEntries(summarizeDesignatedDecks(id=>!!pack.cards[id])
 .map(row=>[row.key,designatedPlayableCounts(row)]));
const REPLAY={ms:10000,seed:11};

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c?.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function reach(s,phase){
 for(let n=0;s.phase!==phase&&s.status==='playing'&&n<8;n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 return s;
}
function hold(s,p,cards){
 const keep=new Set(cards.map(c=>c.uid));
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0;i--)if(!keep.has(hand[i].uid))
  s.players[p].deck.push(hand.splice(i,1)[0]);
 for(const card of cards)if(!hand.includes(card))hand.push(card);
}
function setLife(player,n){
 while(player.life.length>n)player.deck.push(player.life.pop());
 while(player.life.length<n&&player.deck.length)player.life.push(player.deck.pop());
}
function clearFront(player){
 for(let i=0;i<player.front.length;i++)if(player.front[i]){
  player.deck.push(player.front[i]);player.front[i]=null;
 }
}
function trimDeck(player,n){
 while(player.deck.length>n)player.removed.push(player.deck.pop());
}
function boot(key,seed){
 return newUniversalMatch(packs,{decks:[decks[key],decks[key]],seed,first:0});
}
// The hard-search-2 key stopped at uid, card id, ready and buffs. A face-up
// raid under or a granted damage amount did not change it.
function legacyBoardKey(c){
 if(!c)return '-';
 const buff=(c.buffs||[]).map(b=>(b.bp||0)+':'+(b.untilTurn??'')+':'+(b.untilOwnTurnStart??'')).join('.');
 return c.uid+c.cardId+(c.ready?'r':'t')+buff;
}
function choose(s){
 resetHardAiReport();
 const before=structuredClone(s);
 const action=chooseStrengthenedHardAction(packs,s,REPLAY);
 assert.deepEqual(s,before);
 const again=chooseStrengthenedHardAction(packs,s,REPLAY);
 assert.deepEqual(again,action);
 return {action,frozen:chooseFrozenHardSearch2(packs,s,REPLAY),trace:lastHardAiTrace()};
}

test('score cache separates raid layers and granted damage',()=>{
 let plain=reach(boot('white-sword',3),'main');
 const top=place(plain,0,'BLC-2-067','front',0,true);
 for(let i=0;i<4;i++)place(plain,0,'BLC-1-083','energy',i);
 clearFront(plain.players[1]);
 const raided=structuredClone(plain);
 const buried=raided.players[0].front.find(c=>c?.cardId==='BLC-2-067');
 const under=raided.players[0].deck.pop();
 under.faceDown=false;
 buried.stack=[under];
 const granted=structuredClone(plain);
 const hitter=granted.players[0].front.find(c=>c?.cardId==='BLC-2-067');
 hitter.attackDamageGranted={turn:granted.turn,stamp:hitter.fieldEntryStamp,amount:2};
 assert.equal(universalImpact(packs,plain,top),0);
 assert.equal(universalImpact(packs,raided,raided.players[0].front.find(c=>c?.cardId==='BLC-2-067')),1);
 assert.equal(universalAttackDamage(packs,granted,granted.players[0].front.find(c=>c?.cardId==='BLC-2-067')),2);
 assert.equal(legacyBoardKey(plain.players[0].front[0]),legacyBoardKey(raided.players[0].front[0]));
 assert.equal(legacyBoardKey(plain.players[0].front[0]),legacyBoardKey(granted.players[0].front[0]));
 assert.notEqual(hardPositionKey(packs,plain,0),hardPositionKey(packs,raided,0));
 assert.notEqual(hardPositionKey(packs,plain,0),hardPositionKey(packs,granted,0));
 const forward=hardCachedScores(packs,[plain,raided,granted],0);
 const reverse=hardCachedScores(packs,[granted,raided,plain],0);
 assert.notEqual(forward[0].score,forward[1].score);
 assert.notEqual(forward[0].score,forward[2].score);
 assert.deepEqual(reverse.map(row=>row.score),[forward[2].score,forward[1].score,forward[0].score]);
 const hidden=structuredClone(plain);
 const deck=hidden.players[1].deck;
 const last=deck.length-1;
 [deck[last],deck[last-1]]=[deck[last-1],deck[last]];
 const same=hardCachedScores(packs,[plain,hidden],0);
 assert.equal(same[0].key,same[1].key);
 assert.equal(same[0].score,same[1].score);
});

test('the three designated decks have shared roles, not per-card scripts',()=>{
 const plans={
  'reject-blue':deckPlan(pack.cards,decks['reject-blue']),
  'white-sword':deckPlan(pack.cards,decks['white-sword']),
  renruki:deckPlan(pack.cards,decks.renruki)
 };
 assert.equal(plans['reject-blue'].color,'blue');
 assert.equal(plans['white-sword'].color,'green');
 assert.equal(plans.renruki.color,'purple');
 assert.equal(plans['reject-blue'].curve,4);
 assert.equal(plans['white-sword'].hasRaid,true);
 assert.equal(plans['reject-blue'].win,'raid-then-attack');
 assert.equal(plans['white-sword'].keep.has('更木剣八'),true);
 assert.equal(plans.renruki.keep.has('朽木ルキア'),true);
 assert.equal(plans['reject-blue'].fuel.has('浦原喜助'),true);
 assert.equal(planStage(plans['reject-blue'],1,40),'early');
 assert.equal(planStage(plans['reject-blue'],4,40),'mid');
 assert.equal(planStage(plans['reject-blue'],1,10),'late');
 assert.equal(openingKeeps(pack.cards,decks['reject-blue'],[
  {cardId:'BLC-2-047'},{cardId:'BLC-2-047'},{cardId:'BLC-2-046'},
  {cardId:'BLC-2-046'},{cardId:'BLC-2-049'},{cardId:'BLC-2-049'},{cardId:'BLC-2-049'}
 ]),false);
 assert.equal(openingKeeps(pack.cards,decks['reject-blue'],[
  {cardId:'BLC-2-016'},{cardId:'BLC-2-016'},{cardId:'BLC-2-047'},
  {cardId:'BLC-2-046'},{cardId:'BLC-2-049'},{cardId:'BLC-2-049'},{cardId:'BLC-2-049'}
 ]),true);
});

test('opening mulligan keeps a curve hand and redraws an event hand',()=>{
 let redraw=newUniversalMatch(packs,{
  decks:[decks['reject-blue'],decks['reject-blue']],seed:8,first:0,openingMulligan:true
 });
 const events=['BLC-2-047','BLC-2-047','BLC-2-046','BLC-2-046','BLC-2-049','BLC-2-049','BLC-2-049']
  .map(id=>take(redraw,0,id));
 hold(redraw,0,events);
 const dumped=choose(redraw);
 assert.equal(dumped.action.mode,'redraw');
 let keep=newUniversalMatch(packs,{
  decks:[decks['reject-blue'],decks['reject-blue']],seed:9,first:0,openingMulligan:true
 });
 const starters=['BLC-2-016','BLC-2-016','BLC-2-047','BLC-2-046','BLC-2-049','BLC-2-049','BLC-2-049']
  .map(id=>take(keep,0,id));
 hold(keep,0,starters);
 const kept=choose(keep);
 assert.equal(kept.action.mode,'keep');
});

test('a ready attack is taken over more energy, and declined into a wall',()=>{
 let go=reach(boot('reject-blue',4),'main');
 const fuel=take(go,0,'BLC-4-034');
 place(go,0,'BLC-2-016','front',0,true);
 place(go,0,'BLC-2-016','front',1,false);
 place(go,0,'BLC-2-016','front',2,false);
 place(go,0,'BLC-2-016','front',3,false);
 for(let i=0;i<3;i++)place(go,0,'BLC-4-022','energy',i);
 hold(go,0,[fuel]);
 setLife(go.players[1],2);clearFront(go.players[1]);
 trimDeck(go.players[0],8);
 const taken=choose(go);
 assert.equal(taken.frozen.type,'play');
 assert.equal(taken.frozen.line,'energy');
 assert.equal(taken.action.type,'next');

 let stop=reach(boot('reject-blue',6),'main');
 const fuel2=take(stop,0,'BLC-4-034');
 const mine=place(stop,0,'BLC-2-016','front',0,true);
 place(stop,0,'BLC-4-022','energy',0);
 hold(stop,0,[fuel2]);
 const wall=place(stop,1,'BLC-2-019','front',0,true);
 setLife(stop.players[1],7);
 assert.ok(universalAttackDamage(packs,stop,mine)>=1);
 assert.ok(wall);
 const declined=choose(stop);
 assert.equal(declined.action.type,'play');
 assert.equal(declined.action.line,'energy');
 assert.notEqual(declined.action.type,'next');
});

test('a winning raid takes the energy-4 base, and the last generator stays',()=>{
 // EX07BT/BLC-2-067 raids 更木 剣八. Damage 2 needs the energy-4 base.
 let raid=reach(boot('white-sword',3),'main');
 const raider=take(raid,0,'BLC-2-067');
 hold(raid,0,[raider]);
 const low=place(raid,0,'BLC-4-070','front',0);
 const high=place(raid,0,'BLC-3-008','front',1);
 for(let i=0;i<4;i++)place(raid,0,'BLC-1-083','energy',i);
 setLife(raid.players[1],3);clearFront(raid.players[1]);
 const won=choose(raid);
 assert.equal(won.action.type,'raid');
 assert.equal(won.action.baseUid,high.uid);
 assert.notEqual(won.action.baseUid,low.uid);

 // EX07BT/BLC-2-016 is the only energy. Moving it to the front empties the curve.
 let stay=reach(boot('reject-blue',4),'move');
 for(const player of stay.players){
  clearFront(player);
  for(let i=0;i<player.energy.length;i++)if(player.energy[i]){
   player.deck.push(player.energy[i]);player.energy[i]=null;
  }
 }
 place(stay,0,'BLC-2-016','energy',0,true);
 hold(stay,0,[take(stay,0,'BLC-2-016'),take(stay,0,'BLC-4-034')]);
 clearFront(stay.players[1]);
 const kept=choose(stay);
 assert.equal(kept.action.type,'next');
 assert.equal(kept.frozen.type,'next');
});
