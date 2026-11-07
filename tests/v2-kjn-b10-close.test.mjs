import test from 'node:test';
import assert from 'node:assert/strict';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalImpact,
 universalImpactNull} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];

function countsFor(required,color='purple'){
 for(const id of required)assert.equal(pack.cards[id].color,color,id);
 const groups={special:[],color:[],final:[]};
 for(const id of required){
  const trigger=pack.cards[id].trigger;
  if(groups[trigger])groups[trigger].push(id);
 }
 const copies=Object.fromEntries(required.map(id=>[id,4]));
 for(const ids of Object.values(groups)){
  if(!ids.length)continue;
  const each=Math.floor(4/ids.length);
  assert.ok(each>=1,ids.join(','));
  let used=0;
  ids.forEach((id,i)=>{
   const n=i===ids.length-1?4-used:each;
   copies[id]=n;used+=n;
  });
 }
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  c.color===color&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 let total=Object.values(copies).reduce((n,x)=>n+x,0);
 assert.ok(total<=50,'required copies '+total);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  copies[id]=add;total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,copies),[]);
 return copies;
}
function fresh(ids,seed){
 return newUniversalMatch(packs,{decks:[countsFor(ids),countsFor(ids)],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' p'+p);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function legal(s,pred){return legalUniversalActions(packs,s).some(pred);}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify(legalUniversalActions(packs,s).slice(0,8)));
 return use(s,action);
}
function attack(s,uid){return use(s,{type:'attack',uid});}
function hit(s,uid){
 s=attack(s,uid);
 if(s.pending?.kind==='block')s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function find(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,p,uid){return universalBp(pack,s,find(s,p,uid));}
function produced(s,p,uid){return universalCardEnergy(pack,s,p,find(s,p,uid));}
function onBoard(s,p,uid){
 return s.players[p].front.some(c=>c?.uid===uid)||s.players[p].energy.some(c=>c?.uid===uid);
}
function stackRaid(s,p,topId,baseId,line,slot){
 const base=put(s,p,baseId,line,slot,true);
 const top=take(s,p,topId);
 top.ready=true;
 top.fieldEntryStamp=s.nextFieldEntryStamp++;
 base.faceDown=false;
 top.stack=[base];
 s.players[p][line][slot]=top;
 return top;
}
function openLife(ids,id,seed,setup){
 let s=toPhase(fresh(ids,seed),'attack');
 put(s,0,'KJN-1-052','front',0,true);
 if(setup)setup(s);
 setLife(s,1,[id,'KJN-1-057']);
 s=hit(s,s.players[0].front[0].uid);
 return s;
}

function drawLife(id,seed,setup){
 const ids=['KJN-1-052','KJN-1-057',id];
 if(setup)setup.ids?.forEach(extra=>{if(!ids.includes(extra))ids.push(extra);});
 let life=openLife(ids,id,seed,setup?.board);
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'draw');
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 assert.equal(legal(life,a=>a.mode==='draw'),true);
 const revealed=life.players[1].outside.find(c=>c.cardId===id);
 assert.ok(revealed);
 assert.equal(onBoard(life,1,revealed.uid),false);
 const hand=life.players[1].hand.length;
 const deck=life.players[1].deck.length;
 const top=life.players[1].deck[0];
 const outside=life.players[1].outside.length;
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].hand.length,hand+1);
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.players[1].hand.some(c=>c.uid===top.uid),true);
 assert.equal(life.players[1].deck[0]?.uid===top.uid,false);
 assert.equal(life.players[1].outside.length,outside);
 assert.equal(life.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(onBoard(life,1,revealed.uid),false);
 assert.equal(life.players[1].life.length,1);
 return {life,revealed};
}

test('KJN-1-051 life draws one and can be declined without its on-play look',()=>{
 const drawn=drawLife('KJN-1-051',51011);
 assertUniversalMatch(packs,drawn.life);
 let skipped=openLife(['KJN-1-051','KJN-1-052','KJN-1-057'],'KJN-1-051',51012);
 const hand=skipped.players[1].hand.length;
 const deck=skipped.players[1].deck.length;
 skipped.players[1].outside.push(...skipped.players[1].deck.splice(0));
 assert.equal(legal(skipped,a=>a.mode==='draw'),false);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].hand.length,hand);
 assert.equal(skipped.players[1].deck.length,0);
 assert.equal(skipped.players[1].outside.some(c=>c.cardId==='KJN-1-051'),true);
 assertUniversalMatch(packs,skipped);
});

test('KJN-1-052 life draws one and does not also discard',()=>{
 const {life}=drawLife('KJN-1-052',52011);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-064 life draws one and does not draw the on-play copy',()=>{
 const {life}=drawLife('KJN-1-064',64011);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-066 life draws one and does not offer the entry buff',()=>{
 const {life,revealed}=drawLife('KJN-1-066',66011,{
  ids:['KJN-1-059','KJN-1-062','KJN-1-065'],
  board(s){
   put(s,1,'KJN-1-052','front',0,true);
   put(s,1,'KJN-1-057','front',1,true);
   put(s,1,'KJN-1-059','front',2,true);
   put(s,1,'KJN-1-062','front',3,true);
   put(s,1,'KJN-1-065','energy',0,true);
  }
 });
 assert.equal(bp(life,1,life.players[1].front[0].uid),1500);
 assert.equal(onBoard(life,1,revealed.uid),false);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-068 life draws one and does not ask for its activate cost',()=>{
 const {life}=drawLife('KJN-1-068',68011);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-072 life draws one and the revealed card does not enter',()=>{
 const {life,revealed}=drawLife('KJN-1-072',72011);
 assert.equal(onBoard(life,1,revealed.uid),false);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-073 life draws one and does not mill',()=>{
 const {life}=drawLife('KJN-1-073',73011);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

function activeLife(id,seed,setup){
 const ids=['KJN-1-052','KJN-1-057','KJN-1-075',id];
 if(setup)setup.ids?.forEach(extra=>{if(!ids.includes(extra))ids.push(extra);});
 let life=openLife(ids,id,seed,s=>{
  put(s,1,'KJN-1-057','front',0,false);
  put(s,1,'KJN-1-052','energy',0,true);
  put(s,1,'KJN-1-075','energy',1,true);
  put(s,0,'KJN-1-057','front',1,false);
  if(setup?.board)setup.board(s);
 });
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'active');
 const rested=life.players[1].front.find(c=>c?.cardId==='KJN-1-057');
 const energy=life.players[1].energy.find(c=>c?.cardId==='KJN-1-052');
 const field=life.players[1].energy.find(c=>c?.cardId==='KJN-1-075');
 const foe=life.players[0].front.find(c=>c?.cardId==='KJN-1-057');
 const revealed=life.players[1].outside.find(c=>c.cardId===id);
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 assert.equal(legal(life,a=>a.mode==='active'&&a.uid===rested.uid),true);
 assert.equal(legal(life,a=>a.mode==='active'&&a.uid===energy.uid),true);
 assert.equal(legal(life,a=>a.mode==='active'&&a.uid===field.uid),false);
 assert.equal(legal(life,a=>a.mode==='active'&&a.uid===foe.uid),false);
 assert.equal(legal(life,a=>a.mode==='active'&&a.uid===revealed.uid),false);
 const deck=life.players[1].deck.length;
 const hand=life.players[1].hand.length;
 const outside=life.players[1].outside.length;
 const picked=setup?.pick==='energy'?energy:rested;
 life=choose(life,a=>a.mode==='active'&&a.uid===picked.uid);
 assert.equal(life.pending,null);
 assert.equal(find(life,1,picked.uid).ready,true);
 assert.equal(bp(life,1,picked.uid),picked.uid===energy.uid?4500:5000);
 assert.equal(bp(life,1,picked.uid===energy.uid?rested.uid:energy.uid),picked.uid===energy.uid?2000:1500);
 assert.equal(life.players[1].deck.length,deck);
 assert.equal(life.players[1].hand.length,hand);
 assert.equal(life.players[1].outside.length,outside);
 assert.equal(life.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(onBoard(life,1,revealed.uid),false);
 assert.equal(life.players[1].life.length,1);
 return {life,revealed,rested,energy};
}

test('KJN-1-053 life actives one character and does not grant front energy',()=>{
 const {life,revealed}=activeLife('KJN-1-053',53011,{pick:'energy'});
 assert.equal(onBoard(life,1,revealed.uid),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-055 life actives one character and does not open the Sid discard',()=>{
 const {life}=activeLife('KJN-1-055',55011,{
  ids:['KJN-1-048'],
  board(s){put(s,1,'KJN-1-048','front',1,true);}
 });
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-058 life actives one character and does not buff a second',()=>{
 const {life,energy}=activeLife('KJN-1-058',58011);
 assert.equal(bp(life,1,energy.uid),1500);
 assert.equal(find(life,1,energy.uid).ready,true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-061 life actives one character and does not bottom another',()=>{
 const {life}=activeLife('KJN-1-061',61011,{
  ids:['KJN-1-065'],
  board(s){put(s,1,'KJN-1-065','front',2,true);}
 });
 assert.equal(life.players[1].front.some(c=>c?.cardId==='KJN-1-065'),true);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-063 life actives one character and does not mill or gain energy',()=>{
 const {life,energy}=activeLife('KJN-1-063',63011);
 assert.equal(produced(life,1,energy.uid),1);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-080 life actives one character and does not cast the event',()=>{
 const {life}=activeLife('KJN-1-080',80011,{
  ids:['KJN-1-048'],
  board(s){put(s,1,'KJN-1-048','energy',2,true);}
 });
 const sid=life.players[1].energy.find(c=>c?.cardId==='KJN-1-048');
 assert.equal(produced(life,1,sid.uid),1);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-075 life adds itself to hand and does not enter or look',()=>{
 const ids=['KJN-1-075','KJN-1-052','KJN-1-057'];
 let life=openLife(ids,'KJN-1-075',75011);
 assert.equal(life.pending.trigger,'get');
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 assert.equal(legal(life,a=>a.mode==='get'),true);
 const revealed=life.players[1].outside.find(c=>c.cardId==='KJN-1-075');
 const hand=life.players[1].hand.length;
 const deck=life.players[1].deck.length;
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].hand.length,hand+1);
 assert.equal(life.players[1].hand.some(c=>c.uid===revealed.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===revealed.uid),false);
 assert.equal(onBoard(life,1,revealed.uid),false);
 assert.equal(life.players[1].deck.length,deck);
 let declined=openLife(ids,'KJN-1-075',75012);
 const held=declined.players[1].hand.length;
 const card=declined.players[1].outside.find(c=>c.cardId==='KJN-1-075');
 declined=choose(declined,a=>a.mode==='skip');
 assert.equal(declined.pending,null);
 assert.equal(declined.players[1].hand.length,held);
 assert.equal(declined.players[1].outside.some(c=>c.uid===card.uid),true);
 assert.equal(onBoard(declined,1,card.uid),false);
 assertUniversalMatch(packs,life);
 assertUniversalMatch(packs,declined);
});

test('KJN-1-074 raided impact null stops the life hit, and an ordinary copy does not',()=>{
 const ids=['KJN-1-074','KJN-1-049','KJN-1-048','KJN-1-070','KJN-1-054','KJN-1-057','KJN-1-052'];
 let raided=toPhase(fresh(ids,74011),'attack');
 const attacker=stackRaid(raided,0,'KJN-1-049','KJN-1-048','front',0);
 const wall=stackRaid(raided,1,'KJN-1-074','KJN-1-070','front',0);
 setLife(raided,1,['KJN-1-054','KJN-1-057']);
 const lives=raided.players[1].life.map(c=>c.uid);
 assert.equal(universalImpact(pack,raided,attacker),1);
 assert.equal(universalImpactNull(pack,raided,wall),true);
 raided=attack(raided,attacker.uid);
 assert.equal(raided.pending.kind,'block');
 assert.equal(legal(raided,a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 raided=choose(raided,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(raided.pending,null);
 assert.equal(raided.players[1].life.length,2);
 assert.deepEqual(raided.players[1].life.map(c=>c.uid),lives);
 assert.equal(raided.players[1].front.some(c=>c?.uid===wall.uid),false);
 assert.equal(raided.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(raided.players[1].outside.some(c=>c.cardId==='KJN-1-070'),true);
 assert.equal(raided.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(universalImpact(pack,raided,find(raided,0,attacker.uid)),1);

 let plain=toPhase(fresh(ids,74012),'attack');
 const hitter=stackRaid(plain,0,'KJN-1-049','KJN-1-048','front',0);
 const copy=put(plain,1,'KJN-1-074','front',0,true);
 setLife(plain,1,['KJN-1-054','KJN-1-057']);
 const top=plain.players[1].life[0];
 assert.equal(universalImpactNull(pack,plain,copy),false);
 assert.equal(universalImpact(pack,plain,hitter),1);
 plain=attack(plain,hitter.uid);
 plain=choose(plain,a=>a.type==='chooseBlock'&&a.uid===copy.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[1].life.length,1);
 assert.equal(plain.players[1].life.some(c=>c.uid===top.uid),false);
 assert.equal(plain.players[1].outside.some(c=>c.uid===top.uid),true);
 assert.equal(plain.players[1].outside.some(c=>c.uid===copy.uid),true);
 assert.equal(plain.players[0].front.some(c=>c?.uid===hitter.uid),true);
 assert.equal(plain.status,'playing');
 assertUniversalMatch(packs,raided);
 assertUniversalMatch(packs,plain);
});
