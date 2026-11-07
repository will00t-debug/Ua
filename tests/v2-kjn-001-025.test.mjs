import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalImpactNull, universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  c.color==='yellow'&&!['special','color','final','raid'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const colors=new Set(ids.map(id=>pack.cards[id].color));
 assert.deepEqual([...colors],['yellow']);
 return counts;
}
function fresh(ids,seed){
 return newUniversalMatch(packs,{decks:[countsFor(ids),countsFor(ids)],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){const card=take(s,p,id);s.players[p].hand.push(card);return card;}
function toOutside(s,p,id){const card=take(s,p,id);s.players[p].outside.push(card);return card;}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.slice().reverse())s.players[p].deck.unshift(card);
 return cards;
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
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function legal(s,pred){return legalUniversalActions(packs,s).some(pred);}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify(legalUniversalActions(packs,s).slice(0,6)));
 return use(s,action);
}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.from!=='removed'&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play '+uid+' '+line);
 return use(s,action);
}
function playRemoved(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.from==='removed'&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No removed play '+uid);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.line!=='energy');
 if(!action)throw Error('No raid onto '+baseUid);
 return use(s,action);
}
function activate(s,uid,mode='kjn:0'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode===mode);
 if(!action)throw Error('No activate '+uid+' '+mode);
 return use(s,action);
}
function pay(s,ids,p=0){ids.forEach((id,i)=>put(s,p,id,'energy',i));}
function passTo(s,player,phase){
 const startTurn=s.turn,startActive=s.active,startPhase=s.phase;
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&(s.turn>startTurn||s.active!==startActive||s.phase!==startPhase))){
  if(s.pending?.kind==='end-hand-limit')s=choose(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('Turn blocked by '+s.pending.kind+' '+(s.pending.step||''));
  else s=use(s,{type:'next'});
  if(++guard>40)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
}
function find(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,p,uid){return universalBp(pack,s,find(s,p,uid));}
function yellow(s,p=0){return universalEnergyByColor(pack,s,p).yellow||0;}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;}
function attack(s,uid){return use(s,{type:'attack',uid});}
function hit(s,uid){
 s=attack(s,uid);
 if(s.pending?.kind==='block')s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function takeLife(ids,seed,cardId,kind){
 let s=toPhase(fresh(ids,seed),'attack');
 const hitter=put(s,0,'KJN-1-010','front',0,true);
 const rested=kind==='active'?put(s,1,'KJN-1-010','front',0,false):null;
 setLife(s,1,[cardId,'KJN-1-010','KJN-1-010']);
 const lifeUid=s.players[1].life[0].uid;
 s=hit(s,hitter.uid);
 if(kind==='null'){
  assert.equal(s.pending,null);
  assert.equal(s.players[1].outside.some(c=>c.uid===lifeUid),true);
  assert.equal(s.players[1].hand.some(c=>c.uid===lifeUid),false);
 }else if(kind==='draw'){
  assert.equal(s.pending.trigger,'draw');
  const deck=s.players[1].deck.length;
  s=choose(s,a=>a.mode==='draw');
  assert.equal(s.players[1].deck.length,deck-1);
  assert.equal(s.players[1].outside.some(c=>c.uid===lifeUid),true);
 }else if(kind==='active'){
  assert.equal(s.pending.trigger,'active');
  s=choose(s,a=>a.mode==='active'&&a.uid===rested.uid);
  assert.equal(find(s,1,rested.uid).ready,true);
  assert.equal(bp(s,1,rested.uid),5000);
 }else if(kind==='raid'){
  assert.equal(s.pending.trigger,'raid');
  assert.equal(legal(s,a=>a.mode==='skip'),true);
  s=choose(s,a=>a.mode==='skip');
  assert.equal(s.pending,null);
  assert.equal(s.players[1].outside.some(c=>c.uid===lifeUid),true);
 }
 assertUniversalMatch(packs,s);
}
function silence(s,card){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
}
function hidden(s,uids){
 const view=JSON.stringify(universalPublicView(packs,s,1));
 const priv=universalPrivateChoices(packs,s,1);
 const text=priv===null?'':JSON.stringify(priv);
 return uids.every(uid=>!view.includes(uid)&&!text.includes(uid));
}
function inspected(s){return universalPrivateChoices(packs,s,0)?.inspected||[];}
function layer(s,viewer,owner,uid){
 const view=universalPublicView(packs,s,viewer);
 const lines=[...view.players[owner].front,...view.players[owner].energy];
 return lines.find(c=>c&&c.uid===uid);
}
function main(ids,seed){
 readyAp(toPhase(fresh(ids,seed),'main'));
 const s=toPhase(fresh(ids,seed),'main');
 readyAp(s);
 return s;
}

test('KJN-1-001 enters active, forces a strictly higher block, and readies once after a loss',()=>{
 const ids=['KJN-1-001','KJN-1-011','KJN-1-010','KJN-1-005','KJN-1-026','KJN-1-004'];
 let entered=main(ids,1001);
 pay(entered,['KJN-1-026','KJN-1-026']);
 const card=toHand(entered,0,'KJN-1-001');
 entered=play(entered,card.uid);
 const body=find(entered,0,card.uid);
 assert.equal(body.ready,true);
 assert.equal(universalAttackDamage(pack,entered,body),2);
 assertUniversalMatch(packs,entered);

 let equal=toPhase(fresh(ids,1002),'attack');
 const iris=put(equal,0,'KJN-1-001','front',0,true);
 const same=put(equal,1,'KJN-1-004','front',0,true);
 equal=attack(equal,iris.uid);
 assert.equal(legal(equal,a=>a.type==='chooseBlock'&&a.uid===null),true);
 assert.equal(legal(equal,a=>a.type==='chooseBlock'&&a.uid===same.uid),true);
 equal=choose(equal,a=>a.uid===null);
 assert.equal(find(equal,0,iris.uid).ready,false);
 assert.equal(bp(equal,0,iris.uid),4000);

 let forced=toPhase(fresh(ids,1003),'attack');
 const attacker=put(forced,0,'KJN-1-001','front',0,true);
 const big=put(forced,1,'KJN-1-011','front',0,true);
 big.ownEffectFront=true;
 const small=put(forced,1,'KJN-1-010','front',1,true);
 forced=attack(forced,attacker.uid);
 assert.equal(legal(forced,a=>a.type==='chooseBlock'&&a.uid===null),false);
 assert.equal(legal(forced,a=>a.uid===small.uid),false);
 forced=choose(forced,a=>a.uid===big.uid);
 assert.equal(find(forced,0,attacker.uid).ready,true);
 assert.equal(bp(forced,0,attacker.uid),5000);
 const opener=put(forced,0,'KJN-1-010','front',1,true);
 setLife(forced,1,['KJN-1-005','KJN-1-010']);
 forced=hit(forced,opener.uid);
 assert.equal(forced.pending.trigger,'active');
 forced=choose(forced,a=>a.mode==='active'&&a.uid===big.uid);
 assert.equal(bp(forced,1,big.uid),8000);
 forced=attack(forced,attacker.uid);
 assert.equal(legal(forced,a=>a.type==='chooseBlock'&&a.uid===null),false);
 forced=choose(forced,a=>a.uid===big.uid);
 assert.equal(find(forced,0,attacker.uid).ready,false);
 assert.equal(bp(forced,0,attacker.uid),5000);
 const later=passTo(forced,1,'main');
 assert.equal(bp(later,0,attacker.uid),4000);
 assertUniversalMatch(packs,later);

 let quiet=toPhase(fresh(ids,1004),'attack');
 const muted=put(quiet,0,'KJN-1-001','front',0,true);
 const wall=put(quiet,1,'KJN-1-011','front',0,true);
 wall.ownEffectFront=true;
 silence(quiet,muted);
 assert.equal(universalAttackDamage(pack,quiet,muted),1);
 quiet=attack(quiet,muted.uid);
 assert.equal(legal(quiet,a=>a.type==='chooseBlock'&&a.uid===null),true);
 quiet=choose(quiet,a=>a.uid===wall.uid);
 assert.equal(find(quiet,0,muted.uid).ready,false);
 assert.equal(bp(quiet,0,muted.uid),4000);

 let life=toPhase(fresh(ids,1005),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-001','KJN-1-010','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'get');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-001'),true);
 assert.equal(life.players[1].life.length,2);

 let direct=toPhase(fresh(ids,1006),'attack');
 const striker=put(direct,0,'KJN-1-001','front',0,true);
 setLife(direct,1,['KJN-1-010','KJN-1-010','KJN-1-010']);
 direct=hit(direct,striker.uid);
 assert.equal(direct.pending.kind,'life-batch-order');
 direct=choose(direct,a=>a.type==='chooseLifeOrder');
 assert.equal(direct.pending.trigger,'draw');
 direct=choose(direct,a=>a.mode==='skip');
 assert.equal(direct.pending.trigger,'draw');
 direct=choose(direct,a=>a.mode==='skip');
 assert.equal(direct.players[1].life.length,1);
 assert.equal(direct.players[1].outside.filter(c=>c.cardId==='KJN-1-010').length>=2,true);
 assertUniversalMatch(packs,direct);
});

test('KJN-1-002 tucks under a clear Claire, then draws two and discards one',()=>{
 const ids=['KJN-1-002','KJN-1-012','KJN-1-010','KJN-1-026'];
 let s=toPhase(fresh(ids,2001),'main');
 const claire=put(s,0,'KJN-1-012','front',0,true);
 const self=put(s,0,'KJN-1-002','energy',0,true);
 const before=s.players[0].hand.length;
 const deck=s.players[0].deck.length;
 s=activate(s,self.uid);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='host'&&a.uid===claire.uid);
 assert.equal(s.players[0].hand.length,before+2);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.step,'pay');
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 const discarded=s.players[0].hand.find(c=>c.cardId!=='KJN-1-002');
 s=choose(s,a=>a.mode==='discard'&&a.uid===discarded.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===discarded.uid),true);
 assert.equal(find(s,0,claire.uid).under.length,1);
 assert.equal(layer(s,1,0,claire.uid).underLayers[0].faceDown,true);
 assert.equal(layer(s,1,0,claire.uid).underLayers[0].cardId,undefined);
 assert.equal(layer(s,0,0,claire.uid).underLayers[0].cardId,'KJN-1-002');
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 const bare=toPhase(fresh(ids,2002),'main');
 const alone=put(bare,0,'KJN-1-002','front',0,true);
 assert.equal(legal(bare,a=>a.type==='activate'&&a.uid===alone.uid),false);

 let life=toPhase(fresh(ids,2003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const trigger=setLife(life,1,['KJN-1-002'])||null;
 setLife(life,1,['KJN-1-002','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-002'),true);
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-002'),false);
 assertUniversalMatch(packs,life);
 void trigger;
});

test('KJN-1-003 uses the same tuck, then its draw trigger draws one',()=>{
 const ids=['KJN-1-003','KJN-1-012','KJN-1-010'];
 let s=toPhase(fresh(ids,3001),'main');
 const claire=put(s,0,'KJN-1-012','front',0,true);
 const self=put(s,0,'KJN-1-003','energy',0,true);
 const deck=s.players[0].deck.length;
 s=activate(s,self.uid);
 s=choose(s,a=>a.mode==='host'&&a.uid===claire.uid);
 assert.equal(s.pending.step,'pay');
 assert.equal(s.players[0].deck.length,deck-2);
 const discarded=s.players[0].hand[0];
 s=choose(s,a=>a.mode==='discard'&&a.uid===discarded.uid);
 assert.equal(layer(s,1,0,claire.uid).underLayers[0].cardId,undefined);
 assert.equal(layer(s,0,0,claire.uid).underLayers[0].cardId,'KJN-1-003');

 let life=toPhase(fresh(ids,3002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-003','KJN-1-010']);
 const before=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-003'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-004 returns from outside unless it lost its text, and its color trigger rests',()=>{
 const ids=['KJN-1-004','KJN-1-012','KJN-1-014','KJN-1-011','KJN-1-010','KJN-1-026','KJN-1-037'];
 let playBoard=main(ids,4001);
 pay(playBoard,['KJN-1-026','KJN-1-026']);
 const played=toHand(playBoard,0,'KJN-1-004');
 const hand=playBoard.players[0].hand.length;
 playBoard=play(playBoard,played.uid);
 assert.equal(playBoard.players[0].hand.length,hand);
 assert.equal(playBoard.pending.kind,'effect-discard');
 const dumped=playBoard.players[0].hand[0];
 playBoard=choose(playBoard,a=>a.type==='chooseDiscard'&&a.uid===dumped.uid);
 assert.equal(playBoard.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(find(playBoard,0,played.uid).ready,false);

 let tuck=toPhase(fresh(ids,4002),'main');
 const host=put(tuck,0,'KJN-1-012','front',0,true);
 const aurora=put(tuck,0,'KJN-1-004','energy',0,true);
 const deck=tuck.players[0].deck.length;
 tuck=activate(tuck,aurora.uid);
 tuck=choose(tuck,a=>a.mode==='host'&&a.uid===host.uid);
 assert.equal(tuck.pending,null);
 assert.equal(tuck.players[0].deck.length,deck-2);
 assert.equal(find(tuck,0,host.uid).under.some(c=>c.uid===aurora.uid),true);
 assert.equal(layer(tuck,1,0,host.uid).underLayers[0].cardId,undefined);

 let field=toPhase(fresh(ids,4003),'attack');
 const body=put(field,0,'KJN-1-004','front',0,true);
 const hitter=put(field,0,'KJN-1-010','front',1,true);
 setLife(field,1,['KJN-1-037','KJN-1-010']);
 field=hit(field,hitter.uid);
 field=choose(field,a=>a.mode==='special'&&a.uid===body.uid);
 assert.equal(field.pending.step,'deckTop');
 field=choose(field,a=>a.mode==='top');
 assert.equal(field.players[0].deck[0].uid,body.uid);
 assert.equal(hidden(field,[body.uid]),true);

 let silenced=toPhase(fresh(ids,4004),'attack');
 const quiet=put(silenced,0,'KJN-1-004','front',0,true);
 const hitter2=put(silenced,0,'KJN-1-010','front',1,true);
 setLife(silenced,1,['KJN-1-037','KJN-1-010']);
 silence(silenced,quiet);
 silenced=hit(silenced,hitter2.uid);
 silenced=choose(silenced,a=>a.mode==='special'&&a.uid===quiet.uid);
 assert.equal(silenced.pending,null);
 assert.equal(silenced.players[0].outside.some(c=>c.uid===quiet.uid),true);

 let buried=main(ids,4005);
 pay(buried,['KJN-1-026','KJN-1-026']);
 top(buried,0,['KJN-1-004','KJN-1-010','KJN-1-010']);
 const elizabeth=toHand(buried,0,'KJN-1-011');
 buried=play(buried,elizabeth.uid,'energy');
 const parked=find(buried,0,elizabeth.uid);
 assert.equal(parked.under.map(c=>c.cardId).join(','),'KJN-1-004,KJN-1-010,KJN-1-010');
 buried=passTo(buried,0,'main');
 const liveElizabeth=find(buried,0,elizabeth.uid);
 buried=activate(buried,liveElizabeth.uid);
 const under=liveElizabeth.under.find(c=>c.cardId==='KJN-1-004');
 buried=choose(buried,a=>a.mode==='out'&&a.uid===under.uid);
 assert.equal(buried.pending.step,'deckTop');
 buried=choose(buried,a=>a.mode==='stay');
 assert.equal(buried.players[0].outside.some(c=>c.uid===under.uid),true);
 assertUniversalMatch(packs,buried);

 let color=toPhase(fresh(ids,4006),'attack');
 const mark=put(color,0,'KJN-1-010','front',0,true);
 const striker=put(color,0,'KJN-1-026','front',1,true);
 setLife(color,1,['KJN-1-004','KJN-1-010']);
 color=hit(color,striker.uid);
 assert.equal(color.pending.trigger,'color');
 color=choose(color,a=>a.mode==='colorRestSkip'&&a.uid===mark.uid);
 assert.equal(find(color,0,mark.uid).ready,false);
 if(color.pending?.step==='deckTop')color=choose(color,a=>a.mode==='stay');
 color=passTo(color,1,'main');
 assert.equal(find(color,0,mark.uid).ready,false);
 color=passTo(color,0,'main');
 assert.equal(find(color,0,mark.uid).ready,true);
 assertUniversalMatch(packs,color);
});

test('KJN-1-005 looks at the top card privately and puts it on the top or the bottom',()=>{
 const ids=['KJN-1-005','KJN-1-010','KJN-1-026'];
 let s=main(ids,5001);
 pay(s,['KJN-1-026']);
 const [first,second]=top(s,0,['KJN-1-010','KJN-1-026']);
 const card=toHand(s,0,'KJN-1-005');
 s=play(s,card.uid);
 assert.equal(s.pending.step,'peekBottom');
 assert.deepEqual(inspected(s).map(c=>c.uid),[first.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(hidden(s,[first.uid,second.uid]),true);
 s=choose(s,a=>a.mode==='bottom');
 assert.equal(s.players[0].deck.at(-1).uid,first.uid);
 assert.equal(s.players[0].deck[0].uid,second.uid);
 assert.equal(hidden(s,[first.uid]),true);
 assert.equal(s.publicReveals.some(r=>r.uid===first.uid&&r.kind==='revealed-window'),false);

 let stay=main(ids,5002);
 pay(stay,['KJN-1-026']);
 const kept=top(stay,0,['KJN-1-010'])[0];
 const other=toHand(stay,0,'KJN-1-005');
 stay=play(stay,other.uid);
 stay=choose(stay,a=>a.mode==='top');
 assert.equal(stay.players[0].deck[0].uid,kept.uid);
 assertUniversalMatch(packs,stay);

 let life=toPhase(fresh(ids,5003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-005','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(bp(life,1,rested.uid),5000);
 assertUniversalMatch(packs,life);
});

test('KJN-1-006 pays one hand card, mills one, and that card is playable only this turn',()=>{
 const ids=['KJN-1-006','KJN-1-010','KJN-1-005','KJN-1-026'];
 let s=toPhase(fresh(ids,6001),'main');
 const self=put(s,0,'KJN-1-006','front',0,true);
 const fuel=toHand(s,0,'KJN-1-005');
 const milled=top(s,0,['KJN-1-010'])[0];
 readyAp(s);
 s=activate(s,self.uid);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===milled.uid&&c.kjnRemovedPlay===s.turn),true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 const before=apReady(s);
 s=playRemoved(s,milled.uid,'energy');
 assert.equal(apReady(s),before-1);
 assert.equal(find(s,0,milled.uid)!==undefined,true);
 const later=passTo(s,0,'main');
 const again=top(later,0,['KJN-1-010'])[0];
 const fuel2=toHand(later,0,'KJN-1-005');
 let next=activate(later,self.uid);
 next=choose(next,a=>a.mode==='discard'&&a.uid===fuel2.uid);
 assert.equal(legal(next,a=>a.from==='removed'&&a.uid===milled.uid),false);
 assert.equal(legal(next,a=>a.from==='removed'&&a.uid===again.uid),true);
 const energyLine=toPhase(fresh(ids,6002),'main');
 const back=put(energyLine,0,'KJN-1-006','energy',0,true);
 toHand(energyLine,0,'KJN-1-005');
 assert.equal(legal(energyLine,a=>a.type==='activate'&&a.uid===back.uid),false);

 let life=toPhase(fresh(ids,6003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-006','KJN-1-010']);
 const beforeDeck=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,beforeDeck-1);
 assertUniversalMatch(packs,life);
});

test('KJN-1-007 shows the whole top three, reveals only the added card, and discards only then',()=>{
 const ids=['KJN-1-007','KJN-1-006','KJN-1-010','KJN-1-026'];
 let s=main(ids,7001);
 pay(s,['KJN-1-026']);
 const window=top(s,0,['KJN-1-010','KJN-1-006','KJN-1-026']);
 const card=toHand(s,0,'KJN-1-007');
 s=play(s,card.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(inspected(s).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(legal(s,a=>a.uid===window[0].uid),false);
 assert.equal(legal(s,a=>a.uid===window[1].uid),true);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[1].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 assert.equal(s.pending.kind,'effect-top-order');
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[0].uid);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[2].uid);
 assert.equal(s.players[0].deck.at(-1).uid,window[2].uid);
 assert.equal(s.pending.kind,'effect-discard');
 const dumped=s.players[0].hand.find(c=>c.uid!==window[1].uid);
 s=choose(s,a=>a.uid===dumped.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(hidden(s,[window[0].uid,window[2].uid]),true);

 let none=main(ids,7002);
 pay(none,['KJN-1-026']);
 const rest=top(none,0,['KJN-1-010','KJN-1-026','KJN-1-010']);
 const other=toHand(none,0,'KJN-1-007');
 const reveals=none.publicReveals.length;
 none=play(none,other.uid);
 assert.equal(none.pending.kind,'effect-top-order');
 const seen=universalPrivateChoices(packs,none,0);
 assert.deepEqual(seen.options.map(o=>o.action.uid),rest.map(c=>c.uid));
 assert.deepEqual(seen.options.map(o=>o.card.cardId),rest.map(c=>c.cardId));
 assert.equal(universalPrivateChoices(packs,none,1),null);
 none=choose(none,a=>a.uid===rest[0].uid);
 none=choose(none,a=>a.uid===rest[1].uid);
 none=choose(none,a=>a.uid===rest[2].uid);
 assert.equal(none.pending,null);
 assert.equal(none.publicReveals.length,reveals);
 assert.equal(none.players[0].deck.at(-1).uid,rest[2].uid);
 assertUniversalMatch(packs,none);
 takeLife(ids,7003,'KJN-1-007','draw');
});

test('KJN-1-008 discounts the next removed-area play once, and a hand play leaves it',()=>{
 const ids=['KJN-1-008','KJN-1-006','KJN-1-010','KJN-1-005','KJN-1-012','KJN-1-026'];
 let s=main(ids,8001);
 pay(s,['KJN-1-026','KJN-1-026']);
 const first=toHand(s,0,'KJN-1-008');
 const payCard=toHand(s,0,'KJN-1-005');
 const handCard=toHand(s,0,'KJN-1-010');
 s=play(s,first.uid,'front');
 s=activate(s,first.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===payCard.uid);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 const spent=apReady(s);
 s=play(s,handCard.uid,'energy');
 assert.equal(apReady(s),spent-1);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 const miller=put(s,0,'KJN-1-006','front',1,true);
 const removedCard=top(s,0,['KJN-1-005'])[0];
 const fuel=toHand(s,0,'KJN-1-010');
 s=activate(s,miller.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel.uid);
 const before=apReady(s);
 s=playRemoved(s,removedCard.uid,'energy');
 assert.equal(s.pending.step,'peekBottom');
 s=choose(s,a=>a.mode==='top');
 assert.equal(apReady(s),before);
 assert.equal(s.players[0].nextRemovedApCut,null);
 s=passTo(s,0,'main');
 const secondMill=top(s,0,['KJN-1-012'])[0];
 const liveMiller=find(s,0,miller.uid);
 const fuel2=toHand(s,0,'KJN-1-010');
 s=activate(s,liveMiller.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel2.uid);
 const full=apReady(s);
 s=playRemoved(s,secondMill.uid,'front');
 assert.equal(apReady(s),full-1);

 let locked=main(ids,8002);
 readyAp(locked);
 pay(locked,['KJN-1-026','KJN-1-026']);
 const one=toHand(locked,0,'KJN-1-008');
 const deck=locked.players[0].deck;
 const two=deck.splice(deck.findIndex(c=>c.cardId==='KJN-1-008'),1)[0];
 locked.players[0].hand.push(two);
 const cost=toHand(locked,0,'KJN-1-005');
 locked=play(locked,one.uid,'front');
 locked=play(locked,two.uid,'energy');
 locked=activate(locked,one.uid);
 locked=choose(locked,a=>a.mode==='discard'&&a.uid===cost.uid);
 assert.equal(legal(locked,a=>a.type==='activate'&&a.uid===two.uid),false);
 const later=passTo(locked,0,'main');
 assert.equal(legal(later,a=>a.type==='activate'&&a.uid===one.uid),false);
 const third=toHand(later,0,'KJN-1-008');
 const cost2=toHand(later,0,'KJN-1-010');
 let again=play(later,third.uid,'front');
 assert.equal(legal(again,a=>a.type==='activate'&&a.uid===third.uid),true);
 silence(again,find(again,0,third.uid));
 assert.equal(legal(again,a=>a.type==='activate'&&a.uid===third.uid),false);

 let life=toPhase(fresh(ids,8003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-008','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-008'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-009 looks only while raided, keeps the look private, and mills from the front',()=>{
 const ids=['KJN-1-009','KJN-1-006','KJN-1-010','KJN-1-026'];
 let s=main(ids,9001);
 pay(s,['KJN-1-026','KJN-1-026']);
 const base=put(s,0,'KJN-1-006','front',0,true);
 const window=top(s,0,['KJN-1-010','KJN-1-026']);
 const raider=toHand(s,0,'KJN-1-009');
 s=raidOnto(s,raider.uid,base.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.deepEqual(inspected(s).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 assert.equal(hidden(s,[window[1].uid]),true);
 const topCard=s.players[0].front.find(c=>c?.cardId==='KJN-1-009');
 const milled=s.players[0].deck[0];
 s=activate(s,topCard.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].removed.some(c=>c.uid===milled.uid&&c.kjnRemovedPlay===s.turn),true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===topCard.uid),false);
 assert.equal(legal(s,a=>a.from==='removed'&&a.uid===milled.uid),true);

 let plain=main(ids,9002);
 pay(plain,['KJN-1-026','KJN-1-026']);
 const ordinary=toHand(plain,0,'KJN-1-009');
 plain=play(plain,ordinary.uid);
 assert.equal(plain.pending,null);
 assert.equal(legal(plain,a=>a.type==='activate'&&a.uid===ordinary.uid),false);

 let life=toPhase(fresh(ids,9003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-009','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'raid');
 assert.equal(legal(life,a=>a.mode==='get'),true);
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 life=choose(life,a=>a.mode==='skip');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-009'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-010 has no effect and its draw trigger draws one',()=>{
 const ids=['KJN-1-010','KJN-1-026'];
 let s=main(ids,10001);
 const card=toHand(s,0,'KJN-1-010');
 s=play(s,card.uid);
 assert.equal(s.pending,null);
 assert.equal(find(s,0,card.uid).ready,false);
 let life=toPhase(fresh(ids,10002),'attack');
 const hitter=put(life,0,'KJN-1-026','front',0,true);
 setLife(life,1,['KJN-1-010','KJN-1-026']);
 const before=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-010'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-011 cannot enter or move while covered, then moves after the last facedown',()=>{
 const ids=['KJN-1-011','KJN-1-010','KJN-1-012','KJN-1-005','KJN-1-026'];
 let s=main(ids,11001);
 pay(s,['KJN-1-026','KJN-1-026']);
 const window=top(s,0,['KJN-1-010','KJN-1-026','KJN-1-010']);
 const card=toHand(s,0,'KJN-1-011');
 assert.equal(legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'),false);
 s=play(s,card.uid,'energy');
 const self=find(s,0,card.uid);
 assert.deepEqual(self.under.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(layer(s,1,0,self.uid).underLayers.every(c=>c.faceDown===true&&c.cardId===undefined),true);
 assert.equal(layer(s,0,0,self.uid).underLayers.map(c=>c.cardId).join(','),window.map(c=>c.cardId).join(','));
 let move=toPhase(s,'move');
 assert.equal(legal(move,a=>a.type==='move'&&a.uid===self.uid),false);
 move=passTo(toPhase(s,'main'),0,'main');
 let live=find(move,0,self.uid);
 move=activate(move,live.uid);
 const first=live.under[0];
 move=choose(move,a=>a.mode==='out'&&a.uid===first.uid);
 assert.equal(move.pending,null);
 assert.equal(find(move,0,self.uid).ready,false);
 assert.equal(find(move,0,self.uid).under.length,2);
 move=passTo(move,0,'main');
 live=find(move,0,self.uid);
 move=activate(move,live.uid);
 move=choose(move,a=>a.mode==='out');
 move=passTo(move,0,'main');
 live=find(move,0,self.uid);
 assert.equal(live.under.filter(c=>c.faceDown).length,1);
 move=activate(move,live.uid);
 const last=live.under.find(c=>c.faceDown);
 move=choose(move,a=>a.mode==='out'&&a.uid===last.uid);
 assert.equal(find(move,0,self.uid).ready,true);
 assert.equal(move.pending.step,'moveFront');
 move=choose(move,a=>a.mode==='dest'&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(move.players[0].front.some(c=>c?.uid===self.uid),true);
 assert.equal(universalAttackDamage(pack,move,find(move,0,self.uid)),2);
 assertUniversalMatch(packs,move);

 let full=main(ids,11002);
 pay(full,['KJN-1-026','KJN-1-026']);
 top(full,0,['KJN-1-010']);
 const one=toHand(full,0,'KJN-1-011');
 full=play(full,one.uid,'energy');
 assert.equal(find(full,0,one.uid).under.length,3);
 full=passTo(full,0,'main');
 full=activate(full,one.uid);
 full=choose(full,a=>a.mode==='out');
 assert.equal(full.pending,null);
 full=passTo(full,0,'main');
 full=activate(full,one.uid);
 full=choose(full,a=>a.mode==='out');
 assert.equal(find(full,0,one.uid).under.length,1);
 ['KJN-1-012','KJN-1-012','KJN-1-005','KJN-1-005'].forEach((id,slot)=>put(full,0,id,'front',slot,true));
 full=passTo(full,0,'main');
 const mover=find(full,0,one.uid);
 full=activate(full,mover.uid);
 full=choose(full,a=>a.mode==='out');
 assert.equal(full.pending.step,'moveFront');
 assert.equal(legal(full,a=>a.replaceUid===undefined),false);
 const replaced=full.players[0].front[0];
 full=choose(full,a=>a.replaceUid===replaced.uid);
 assert.equal(full.players[0].front[0].uid,one.uid);
 assert.equal(full.players[0].removed.some(c=>c.uid===replaced.uid),true);
 assertUniversalMatch(packs,full);
 takeLife(ids,11003,'KJN-1-011','active');
});

test('KJN-1-012 has no effect and its get trigger adds the life card',()=>{
 const ids=['KJN-1-012','KJN-1-010'];
 let s=main(ids,12001);
 const card=toHand(s,0,'KJN-1-012');
 s=play(s,card.uid);
 assert.equal(s.pending,null);
 let life=toPhase(fresh(ids,12002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-012','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-012'),true);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-012'),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-013 reveals only the card it adds, and Sid widens the filter to any character',()=>{
 const ids=['KJN-1-013','KJN-1-012','KJN-1-019','KJN-1-010','KJN-1-035','KJN-1-026'];
 let s=main(ids,13001);
 pay(s,['KJN-1-026']);
 const window=top(s,0,['KJN-1-010','KJN-1-012','KJN-1-019']);
 const card=toHand(s,0,'KJN-1-013');
 s=play(s,card.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.deepEqual(inspected(s).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(legal(s,a=>a.mode==='take'&&a.uid===window[0].uid),false);
 assert.equal(legal(s,a=>a.mode==='take'&&a.uid===window[1].uid),true);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[1].uid);
 assert.equal(s.publicReveals.filter(r=>r.kind==='revealed-window').map(r=>r.uid).join(','),window[1].uid);
 assert.equal(hidden(s,[window[0].uid,window[2].uid]),true);
 assert.equal(s.pending.step,'pay');
 const dumped=s.players[0].hand.find(c=>c.uid!==window[1].uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===dumped.uid);
 assert.equal(s.pending.step,'lookOrder');
 s=choose(s,a=>a.mode==='next'&&a.uid===window[0].uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,window[0].uid);
 assert.equal(s.players[0].deck.at(-2).uid,window[2].uid);

 let open=main(ids,13002);
 pay(open,['KJN-1-026']);
 put(open,0,'KJN-1-019','front',0,true);
 const wide=top(open,0,['KJN-1-010','KJN-1-035','KJN-1-026']);
 const claire=toHand(open,0,'KJN-1-013');
 open=play(open,claire.uid);
 assert.equal(legal(open,a=>a.mode==='take'&&a.uid===wide[0].uid),true);
 assert.equal(legal(open,a=>a.mode==='take'&&a.uid===wide[1].uid),false);
 const reveals=open.publicReveals.length;
 open=choose(open,a=>a.mode==='done');
 assert.equal(open.publicReveals.length,reveals);
 assert.equal(open.pending.step,'lookOrder');
 open=choose(open,a=>a.mode==='next'&&a.uid===wide[0].uid);
 open=choose(open,a=>a.mode==='next'&&a.uid===wide[1].uid);
 assert.equal(open.pending,null);
 assert.equal(open.players[0].deck.at(-1).uid,wide[0].uid);

 let life=toPhase(fresh(ids,13003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-013','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-014 offers the Aurora tuck before that Aurora may return to the deck',()=>{
 const ids=['KJN-1-014','KJN-1-004','KJN-1-012','KJN-1-010','KJN-1-026'];
 let s=main(ids,14001);
 pay(s,['KJN-1-026','KJN-1-026']);
 const claire=put(s,0,'KJN-1-012','front',0,true);
 const aurora=toHand(s,0,'KJN-1-004');
 const card=toHand(s,0,'KJN-1-014');
 s=play(s,card.uid);
 assert.equal(s.pending.step,'pay');
 s=choose(s,a=>a.mode==='discard'&&a.uid===aurora.uid);
 assert.equal(s.pending.step,'tuckAurora');
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.pending.step,'deckTop');
 s=choose(s,a=>a.mode==='stay');
 assert.equal(s.players[0].outside.some(c=>c.uid===aurora.uid),true);

 let tucked=main(ids,14002);
 pay(tucked,['KJN-1-026','KJN-1-026']);
 const host=put(tucked,0,'KJN-1-012','front',0,true);
 const target=toHand(tucked,0,'KJN-1-004');
 const playCard=toHand(tucked,0,'KJN-1-014');
 tucked=play(tucked,playCard.uid);
 tucked=choose(tucked,a=>a.mode==='discard'&&a.uid===target.uid);
 tucked=choose(tucked,a=>a.mode==='host'&&a.uid===host.uid);
 assert.equal(tucked.pending,null);
 assert.equal(find(tucked,0,host.uid).under.some(c=>c.uid===target.uid),true);
 assert.equal(layer(tucked,1,0,host.uid).underLayers[0].cardId,undefined);
 assert.equal(layer(tucked,0,0,host.uid).underLayers[0].cardId,'KJN-1-004');

 let other=main(ids,14003);
 pay(other,['KJN-1-026','KJN-1-026']);
 put(other,0,'KJN-1-012','front',0,true);
 const plain=toHand(other,0,'KJN-1-010');
 const event=toHand(other,0,'KJN-1-014');
 other=play(other,event.uid);
 other=choose(other,a=>a.mode==='discard'&&a.uid===plain.uid);
 assert.equal(other.pending,null);
 assert.equal(other.players[0].outside.some(c=>c.uid===plain.uid),true);
 assertUniversalMatch(packs,other);
 takeLife(ids,14004,'KJN-1-014','draw');
});

test('KJN-1-015 is impact-null only while raided, and may rest-enter one cheap yellow Sid',()=>{
 const ids=['KJN-1-015','KJN-1-012','KJN-1-019','KJN-1-020','KJN-1-010','KJN-1-002','KJN-1-026'];
 let s=main(ids,15001);
 pay(s,['KJN-1-026','KJN-1-026','KJN-1-010']);
 const base=put(s,0,'KJN-1-012','front',0,true);
 const sid=toOutside(s,0,'KJN-1-019');
 const costly=toOutside(s,0,'KJN-1-010');
 const raider=toHand(s,0,'KJN-1-015');
 s=raidOnto(s,raider.uid,base.uid);
 const topCard=s.players[0].front.find(c=>c?.cardId==='KJN-1-015');
 assert.equal(universalImpactNull(pack,s,topCard),true);
 assert.equal(bp(s,0,topCard.uid),4000);
 assert.equal(universalImpact(pack,s,topCard),0);
 assert.equal(s.pending.step,'deploy');
 assert.equal(legal(s,a=>a.uid===sid.uid),true);
 assert.equal(legal(s,a=>a.uid===costly.uid),false);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.players[0].outside.some(c=>c.uid===sid.uid),true);
 const aurora=put(s,0,'KJN-1-002','energy',3,true);
 const live=find(s,0,topCard.uid);
 s=activate(s,aurora.uid);
 s=choose(s,a=>a.mode==='host'&&a.uid===live.uid);
 s=choose(s,a=>a.mode==='discard');
 assert.equal(bp(s,0,live.uid),5000);
 assert.equal(universalImpact(pack,s,find(s,0,live.uid)),1);
 assert.equal(layer(s,1,0,live.uid).underLayers[0].cardId,undefined);
 const opp=passTo(s,1,'main');
 assert.equal(bp(opp,0,live.uid),4000);
 assert.equal(universalImpact(pack,opp,find(opp,0,live.uid)),0);
 assert.equal(universalImpactNull(pack,opp,find(opp,0,live.uid)),true);
 silence(opp,find(opp,0,live.uid));
 const back=passTo(opp,0,'main');
 assert.equal(bp(back,0,live.uid),4000);
 assert.equal(universalImpact(pack,back,find(back,0,live.uid)),0);
 assert.equal(universalImpactNull(pack,back,find(back,0,live.uid)),false);

 let plain=main(ids,15002);
 pay(plain,['KJN-1-026','KJN-1-026','KJN-1-010']);
 const normal=toHand(plain,0,'KJN-1-015');
 plain=play(plain,normal.uid);
 assert.equal(plain.pending,null);
 assert.equal(universalImpactNull(pack,plain,find(plain,0,normal.uid)),false);
 silence(plain,find(plain,0,normal.uid));
 assert.equal(bp(plain,0,normal.uid),4000);

 let enter=main(ids,15003);
 pay(enter,['KJN-1-026','KJN-1-026','KJN-1-010']);
 const host=put(enter,0,'KJN-1-012','front',0,true);
 const coming=toOutside(enter,0,'KJN-1-020');
 const top2=toHand(enter,0,'KJN-1-015');
 enter=raidOnto(enter,top2.uid,host.uid);
 enter=choose(enter,a=>a.uid===coming.uid&&a.line==='energy');
 const entered=find(enter,0,coming.uid);
 assert.equal(entered.ready,false);
 assert.equal(enter.players[0].energy.some(c=>c?.uid===coming.uid),true);
 assertUniversalMatch(packs,enter);
 takeLife(ids,15004,'KJN-1-015','raid');
});

test('KJN-1-016 doubles the attack, forces only the first block, and can recover the raid base',()=>{
 const ids=['KJN-1-016','KJN-1-013','KJN-1-019','KJN-1-002','KJN-1-014','KJN-1-010','KJN-1-026','KJN-1-023','KJN-1-037'];
 let s=main(ids,16001);
 pay(s,['KJN-1-026','KJN-1-014','KJN-1-023']);
 const base=put(s,0,'KJN-1-013','front',0,true);
 put(s,0,'KJN-1-019','front',1,true);
 const raider=toHand(s,0,'KJN-1-016');
 s=raidOnto(s,raider.uid,base.uid);
 const topCard=s.players[0].front.find(c=>c?.cardId==='KJN-1-016');
 assert.equal(topCard.kjnFirstMustBlock.turn,s.turn);
 assert.equal(bp(s,0,topCard.uid),4000);
 const aurora=put(s,0,'KJN-1-002','energy',3,true);
 const live=find(s,0,topCard.uid);
 s=activate(s,aurora.uid);
 s=choose(s,a=>a.mode==='host'&&a.uid===live.uid);
 s=choose(s,a=>a.mode==='discard');
 assert.equal(bp(s,0,live.uid),5000);
 assert.equal(layer(s,1,0,live.uid).underLayers[0].faceDown,true);
 assert.equal(layer(s,1,0,live.uid).underLayers[0].cardId,undefined);
 const blocker=put(s,1,'KJN-1-010','front',0,true);
 setLife(s,1,['KJN-1-010','KJN-1-010','KJN-1-010']);
 s=toPhase(s,'attack');
 s=attack(s,live.uid);
 assert.equal(find(s,0,live.uid).ready,true);
 assert.equal(legal(s,a=>a.type==='chooseBlock'&&a.uid===null),false);
 assert.equal(legal(s,a=>a.uid===blocker.uid),true);
 s=choose(s,a=>a.uid===blocker.uid);
 assertUniversalMatch(packs,s);
 s=attack(s,live.uid);
 assert.equal(legal(s,a=>a.type==='chooseBlock'&&a.uid===null),true);
 s=choose(s,a=>a.uid===null);
 assert.equal(find(s,0,live.uid).ready,false);
 silence(s,find(s,0,live.uid));
 assert.equal(bp(s,0,live.uid),4000);

 let retire=main(ids,16002);
 pay(retire,['KJN-1-026','KJN-1-014','KJN-1-023']);
 const root=put(retire,0,'KJN-1-013','front',0,true);
 const cover=put(retire,0,'KJN-1-002','energy',3,true);
 const big=toHand(retire,0,'KJN-1-016');
 const heavy=toOutside(retire,0,'KJN-1-014');
 retire=raidOnto(retire,big.uid,root.uid);
 retire=activate(retire,cover.uid);
 const raided=retire.players[0].front.find(c=>c?.cardId==='KJN-1-016');
 retire=choose(retire,a=>a.mode==='host'&&a.uid===raided.uid);
 retire=choose(retire,a=>a.mode==='discard');
 const hitter=put(retire,0,'KJN-1-010','front',2,true);
 setLife(retire,1,['KJN-1-037','KJN-1-010']);
 retire=toPhase(retire,'attack');
 retire=hit(retire,hitter.uid);
 retire=choose(retire,a=>a.mode==='special'&&a.uid===raided.uid);
 assert.equal(retire.pending.step,'recoverClaire');
 assert.equal(legal(retire,a=>a.uid===root.uid),true);
 assert.equal(legal(retire,a=>a.uid===heavy.uid),false);
 retire=choose(retire,a=>a.mode==='hand'&&a.uid===root.uid);
 assert.equal(retire.players[0].hand.some(c=>c.uid===root.uid),true);
 assertUniversalMatch(packs,retire);

 let plain=main(ids,16003);
 pay(plain,['KJN-1-026','KJN-1-014','KJN-1-023']);
 put(plain,0,'KJN-1-019','front',0,true);
 const normal=toHand(plain,0,'KJN-1-016');
 plain=play(plain,normal.uid);
 assert.equal(find(plain,0,normal.uid).kjnFirstMustBlock,undefined);
 assert.equal(bp(plain,0,normal.uid),4000);
 assertUniversalMatch(packs,plain);
 takeLife(ids,16004,'KJN-1-016','raid');
});

test('KJN-1-017 reveals one yellow event or field and orders the rest privately',()=>{
 const ids=['KJN-1-017','KJN-1-035','KJN-1-037','KJN-1-010','KJN-1-026'];
 let s=main(ids,17001);
 const window=top(s,0,['KJN-1-010','KJN-1-035','KJN-1-037']);
 const card=toHand(s,0,'KJN-1-017');
 s=play(s,card.uid);
 assert.deepEqual(inspected(s).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(legal(s,a=>a.uid===window[0].uid),false);
 assert.equal(legal(s,a=>a.uid===window[1].uid),true);
 assert.equal(legal(s,a=>a.uid===window[2].uid),true);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[2].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[2].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid||r.uid===window[1].uid),false);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[0].uid);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[1].uid);
 assert.equal(s.players[0].deck.at(-1).uid,window[1].uid);
 s=choose(s,a=>a.type==='chooseDiscard');
 assert.equal(hidden(s,[window[0].uid,window[1].uid]),true);

 let none=main(ids,17002);
 const rest=top(none,0,['KJN-1-010','KJN-1-026','KJN-1-010']);
 const other=toHand(none,0,'KJN-1-017');
 const reveals=none.publicReveals.length;
 none=play(none,other.uid);
 assert.equal(none.pending.kind,'effect-top-order');
 const seen=universalPrivateChoices(packs,none,0);
 assert.deepEqual(seen.options.map(o=>o.action.uid),rest.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,none,1),null);
 none=choose(none,a=>a.uid===rest[0].uid);
 none=choose(none,a=>a.uid===rest[1].uid);
 none=choose(none,a=>a.uid===rest[2].uid);
 assert.equal(none.pending,null);
 assert.equal(none.publicReveals.length,reveals);
 assertUniversalMatch(packs,none);
 takeLife(ids,17003,'KJN-1-017','null');
});

test('KJN-1-018 can rest on either line, adds yellow only while it generates, and retires',()=>{
 const ids=['KJN-1-018','KJN-1-010'];
 let s=toPhase(fresh(ids,18001),'main');
 const self=put(s,0,'KJN-1-018','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 s=activate(s,self.uid,'selfRestEnergyRetire');
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(yellow(s),2);
 assert.equal(legal(s,a=>a.uid===self.uid&&a.mode==='selfRestEnergyRetire'),false);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===self.uid),true);

 let front=toPhase(fresh(ids,18002),'main');
 const ahead=put(front,0,'KJN-1-018','front',0,true);
 const other=put(front,0,'KJN-1-018','energy',1,true);
 assert.equal(legal(front,a=>a.uid===ahead.uid&&a.mode==='selfRestEnergyRetire'),true);
 const before=yellow(front);
 front=activate(front,ahead.uid,'selfRestEnergyRetire');
 assert.equal(yellow(front),before);
 assert.equal(legal(front,a=>a.uid===other.uid&&a.mode==='selfRestEnergyRetire'),true);
 silence(front,other);
 assert.equal(legal(front,a=>a.uid===other.uid&&a.mode==='selfRestEnergyRetire'),false);
 front=use(front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===ahead.uid),true);
 assertUniversalMatch(packs,front);
 takeLife(ids,18003,'KJN-1-018','null');
});

test('KJN-1-019 removes impact from a character that battles it',()=>{
 const ids=['KJN-1-019','KJN-1-015','KJN-1-012','KJN-1-002','KJN-1-010','KJN-1-026'];
 let s=main(ids,19001);
 pay(s,['KJN-1-026','KJN-1-026','KJN-1-010']);
 const base=put(s,0,'KJN-1-012','front',0,true);
 const raider=toHand(s,0,'KJN-1-015');
 s=raidOnto(s,raider.uid,base.uid);
 assert.equal(s.pending,null);
 const claire=s.players[0].front.find(c=>c?.cardId==='KJN-1-015');
 const tuck=put(s,0,'KJN-1-002','energy',3,true);
 s=activate(s,tuck.uid);
 s=choose(s,a=>a.mode==='host'&&a.uid===claire.uid);
 s=choose(s,a=>a.mode==='discard');
 const sid=put(s,1,'KJN-1-019','front',0,true);
 setLife(s,1,['KJN-1-010','KJN-1-010']);
 assert.equal(universalImpact(pack,s,find(s,0,claire.uid)),1);
 s=toPhase(s,'attack');
 s=attack(s,claire.uid);
 s=choose(s,a=>a.uid===sid.uid);
 assert.equal(s.players[1].life.length,2);

 let lost=main(ids,19002);
 pay(lost,['KJN-1-026','KJN-1-026','KJN-1-010']);
 const root=put(lost,0,'KJN-1-012','front',0,true);
 const again=toHand(lost,0,'KJN-1-015');
 lost=raidOnto(lost,again.uid,root.uid);
 assert.equal(lost.pending,null);
 const body=lost.players[0].front.find(c=>c?.cardId==='KJN-1-015');
 const cover=put(lost,0,'KJN-1-002','energy',3,true);
 lost=activate(lost,cover.uid);
 lost=choose(lost,a=>a.mode==='host'&&a.uid===body.uid);
 lost=choose(lost,a=>a.mode==='discard');
 const muted=put(lost,1,'KJN-1-019','front',0,true);
 silence(lost,muted);
 setLife(lost,1,['KJN-1-010','KJN-1-010']);
 lost=toPhase(lost,'attack');
 lost=attack(lost,body.uid);
 lost=choose(lost,a=>a.uid===muted.uid);
 assert.equal(lost.pending?.trigger,'draw');
 lost=choose(lost,a=>a.mode==='skip');
 assert.equal(lost.players[1].life.length,1);

 let life=toPhase(fresh(ids,19003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-019','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(universalImpactNull(pack,life,find(life,1,rested.uid)),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-020 draws one and discards one, and its draw trigger is separate',()=>{
 const ids=['KJN-1-020','KJN-1-010','KJN-1-026'];
 let s=main(ids,20001);
 pay(s,['KJN-1-026']);
 const card=toHand(s,0,'KJN-1-020');
 const before=s.players[0].deck.length;
 s=play(s,card.uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-discard');
 const dumped=s.players[0].hand[0];
 s=choose(s,a=>a.uid===dumped.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 let life=toPhase(fresh(ids,20002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-020','KJN-1-010']);
 const deck=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('KJN-1-021 adds one yellow while active on the energy line',()=>{
 const ids=['KJN-1-021','KJN-1-010'];
 let s=toPhase(fresh(ids,21001),'main');
 const self=put(s,0,'KJN-1-021','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,self),2);
 self.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 self.ready=true;
 const front=put(s,0,'KJN-1-021','front',0,true);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 silence(s,self);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 assertUniversalMatch(packs,s);
 takeLife(ids,21002,'KJN-1-021','null');
});

test('KJN-1-022 readies any own character, including itself, only after a removed-area play',()=>{
 const ids=['KJN-1-022','KJN-1-006','KJN-1-010','KJN-1-026'];
 let hand=main(ids,22001);
 pay(hand,['KJN-1-026','KJN-1-026']);
 const fromHand=toHand(hand,0,'KJN-1-022');
 hand=play(hand,fromHand.uid);
 assert.equal(hand.pending,null);
 assert.equal(find(hand,0,fromHand.uid).ready,false);

 let s=toPhase(fresh(ids,22002),'main');
 pay(s,['KJN-1-026','KJN-1-026']);
 readyAp(s);
 const miller=put(s,0,'KJN-1-006','front',0,true);
 const other=put(s,0,'KJN-1-010','front',1,false);
 const fuel=toHand(s,0,'KJN-1-010');
 top(s,0,['KJN-1-022']);
 s=activate(s,miller.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel.uid);
 const removed=s.players[0].removed[0];
 s=playRemoved(s,removed.uid,'front');
 const self=find(s,0,removed.uid);
 assert.equal(self.ready,false);
 assert.equal(s.pending.step,'activeAny');
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 assert.equal(legal(s,a=>a.mode==='active'&&a.uid===self.uid),true);
 assert.equal(legal(s,a=>a.mode==='active'&&a.uid===other.uid),true);
 s=choose(s,a=>a.mode==='active'&&a.uid===self.uid);
 assert.equal(find(s,0,self.uid).ready,true);
 assert.equal(find(s,0,other.uid).ready,false);

 let named=toPhase(fresh(ids,22003),'attack');
 const beta=put(named,0,'KJN-1-022','front',0,true);
 setLife(named,1,['KJN-1-010','KJN-1-010']);
 named=attack(named,beta.uid);
 assert.deepEqual(named.attackedNames.at(-1).aliases,['ベータ']);
 named=choose(named,a=>a.uid===null);
 if(named.pending?.kind==='life-trigger')named=choose(named,a=>a.mode==='skip');
 const quiet=put(named,0,'KJN-1-022','front',1,true);
 silence(named,quiet);
 named=attack(named,quiet.uid);
 assert.deepEqual(named.attackedNames.at(-1).aliases,[]);
 assert.equal(cardHasName(pack.cards['KJN-1-022'],'ベータ',true),false);
 assert.equal(cardHasName(pack.cards['KJN-1-022'],'ナツメ・カフカ',true),true);
 assertUniversalMatch(packs,named);
 takeLife(ids,22004,'KJN-1-022','null');
});

test('KJN-1-023 chooses a draw and a deck placement, or a discard that mills to removed',()=>{
 const ids=['KJN-1-023','KJN-1-010','KJN-1-026'];
 let draw=main(ids,23001);
 pay(draw,['KJN-1-026','KJN-1-026']);
 const extra=toHand(draw,0,'KJN-1-010');
 const card=toHand(draw,0,'KJN-1-023');
 draw=play(draw,card.uid);
 assert.equal(legal(draw,a=>a.mode==='draw'),true);
 assert.equal(legal(draw,a=>a.mode==='mill'),true);
 draw=choose(draw,a=>a.mode==='draw');
 assert.equal(draw.pending.step,'handEither');
 assert.equal(legal(draw,a=>a.mode==='skip'),false);
 draw=choose(draw,a=>a.mode==='top'&&a.uid===extra.uid);
 assert.equal(draw.players[0].deck[0].uid,extra.uid);
 assert.equal(draw.publicReveals.some(r=>r.uid===extra.uid),false);

 let mill=main(ids,23002);
 pay(mill,['KJN-1-026','KJN-1-026']);
 const fuel=toHand(mill,0,'KJN-1-010');
 const milled=top(mill,0,['KJN-1-010'])[0];
 const body=toHand(mill,0,'KJN-1-023');
 mill=play(mill,body.uid);
 mill=choose(mill,a=>a.mode==='mill');
 mill=choose(mill,a=>a.mode==='discard');
 assert.equal(mill.players[0].removed.some(c=>c.uid===milled.uid&&c.kjnRemovedPlay===mill.turn),true);
 assert.equal(legal(mill,a=>a.from==='removed'&&a.uid===milled.uid),true);

 let empty=main(ids,23003);
 pay(empty,['KJN-1-026','KJN-1-026']);
 empty.players[0].deck.push(...empty.players[0].hand.splice(0));
 const only=toHand(empty,0,'KJN-1-023');
 empty=play(empty,only.uid);
 assert.equal(legal(empty,a=>a.mode==='mill'),false);
 assert.equal(legal(empty,a=>a.mode==='draw'),true);
 empty=choose(empty,a=>a.mode==='draw');
 assert.equal(empty.pending.step,'handEither');
 assert.equal(cardHasName(pack.cards['KJN-1-023'],'ベータ',false),true);
 assert.equal(cardHasName(pack.cards['KJN-1-023'],'ベータ',true),false);
 assertUniversalMatch(packs,empty);
 takeLife(ids,23004,'KJN-1-023','draw');
});

test('KJN-1-024 gains 1500 BP on its own turn after a removed-area play',()=>{
 const ids=['KJN-1-024','KJN-1-006','KJN-1-010','KJN-1-026'];
 let s=toPhase(fresh(ids,24001),'main');
 readyAp(s);
 pay(s,['KJN-1-026']);
 const self=put(s,0,'KJN-1-024','front',0,true);
 const miller=put(s,0,'KJN-1-006','front',1,true);
 const fuel=toHand(s,0,'KJN-1-010');
 top(s,0,['KJN-1-010']);
 assert.equal(bp(s,0,self.uid),1500);
 s=activate(s,miller.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel.uid);
 const removed=s.players[0].removed[0];
 assert.equal(bp(s,0,self.uid),1500);
 s=playRemoved(s,removed.uid,'energy');
 assert.equal(bp(s,0,self.uid),3000);
 silence(s,self);
 assert.equal(bp(s,0,self.uid),1500);
 assert.equal(cardHasName(pack.cards['KJN-1-024'],'ベータ',true),false);
 const freshTurn=toPhase(fresh(ids,24002),'main');
 readyAp(freshTurn);
 pay(freshTurn,['KJN-1-026']);
 const later=put(freshTurn,0,'KJN-1-024','front',0,true);
 const miller2=put(freshTurn,0,'KJN-1-006','front',1,true);
 const fuel2=toHand(freshTurn,0,'KJN-1-010');
 top(freshTurn,0,['KJN-1-010']);
 let turned=activate(freshTurn,miller2.uid);
 turned=choose(turned,a=>a.mode==='discard');
 turned=playRemoved(turned,turned.players[0].removed[0].uid,'energy');
 assert.equal(bp(turned,0,later.uid),3000);
 const opp=passTo(turned,1,'main');
 assert.equal(bp(opp,0,later.uid),1500);
 const back=passTo(opp,0,'main');
 assert.equal(bp(back,0,later.uid),1500);
 assertUniversalMatch(packs,back);
 takeLife(ids,24003,'KJN-1-024','active');
});

test('KJN-1-025 has two front activates and the same yellow color trigger',()=>{
 const ids=['KJN-1-025','KJN-1-006','KJN-1-010','KJN-1-026','KJN-1-005'];
 let s=main(ids,25001);
 pay(s,['KJN-1-026','KJN-1-026']);
 const self=put(s,0,'KJN-1-025','front',0,true);
 const back=put(s,0,'KJN-1-025','energy',2,true);
 const held=toHand(s,0,'KJN-1-010');
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===back.uid),false);
 s=activate(s,self.uid,'kjn:0');
 assert.equal(s.pending.step,'handPlace');
 s=choose(s,a=>a.mode==='place'&&a.uid===held.uid);
 assert.equal(s.players[0].deck[0].uid,held.uid);
 assert.equal(legal(s,a=>a.mode==='kjn:0'&&a.uid===self.uid),false);
 assert.equal(legal(s,a=>a.mode==='kjn:1'&&a.uid===self.uid),false);
 const miller=put(s,0,'KJN-1-006','front',1,true);
 const fuel=toHand(s,0,'KJN-1-005');
 top(s,0,['KJN-1-010']);
 s=activate(s,miller.uid);
 s=choose(s,a=>a.mode==='discard'&&a.uid===fuel.uid);
 s=playRemoved(s,s.players[0].removed[0].uid,'energy');
 assert.equal(legal(s,a=>a.mode==='kjn:1'&&a.uid===self.uid),true);
 s=activate(s,self.uid,'kjn:1');
 assert.equal(legal(s,a=>a.mode==='buff'&&a.uid===self.uid),true);
 s=choose(s,a=>a.mode==='buff'&&a.uid===self.uid);
 assert.equal(bp(s,0,self.uid),5000);
 assert.equal(legal(s,a=>a.mode==='kjn:1'&&a.uid===self.uid),false);
 const later=passTo(s,1,'main');
 assert.equal(bp(later,0,self.uid),4000);

 let color=toPhase(fresh(ids,25002),'attack');
 const mark=put(color,0,'KJN-1-010','front',0,true);
 const hitter=put(color,0,'KJN-1-026','front',1,true);
 setLife(color,1,['KJN-1-025','KJN-1-010']);
 color=hit(color,hitter.uid);
 color=choose(color,a=>a.mode==='colorRestSkip'&&a.uid===mark.uid);
 assert.equal(find(color,0,mark.uid).ready,false);
 color=passTo(color,1,'main');
 assert.equal(find(color,0,mark.uid).ready,false);
 assert.equal(cardHasName(pack.cards['KJN-1-025'],'ベータ',false),true);
 assert.equal(cardHasName(pack.cards['KJN-1-025'],'ベータ',true),false);
 assertUniversalMatch(packs,color);
});
