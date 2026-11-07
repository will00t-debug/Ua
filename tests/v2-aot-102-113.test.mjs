import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalEnergyByColor, universalImpact,
 universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];

function countsFor(required,color){
 const fillers=Object.values(pack.cards).filter(c=>c.id.startsWith('AOT-1-')&&
  c.color===color&&!required.includes(c.id)&&
  !['special','color','final','raid'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const card=pack.cards[id];
  if(card.color!==color)throw Error(id+' is not '+color);
  let copies=4;
  if(card.trigger==='special'||card.trigger==='color'||card.trigger==='final'){
   copies=Math.min(2,4-caps[card.trigger]);
   caps[card.trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function match(own,foe,seed,ownColor='red',foeColor=ownColor){
 return newUniversalMatch(packs,{decks:[countsFor(own,ownColor),countsFor(foe,foeColor)],
  seed,first:0});
}
function fresh(ids,seed,color='red'){return match(ids,ids,seed,color);}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function setLife(s,p,ids){
 const life=ids.map(id=>take(s,p,id));
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=life;
 return life;
}
function park(s,p,keep=[]){
 const stay=[],rest=[];
 for(const c of s.players[p].hand)(keep.includes(c.uid)?stay:rest).push(c);
 s.players[p].hand=stay;
 s.players[p].deck.push(...rest);
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
 const action=actions.find(pred);
 if(!action)throw Error('No legal action in '+s.pending?.kind+'/'+(s.pending?.step||s.phase)+
  ' '+actions.map(a=>a.type+':'+(a.mode||'')+':'+(a.uid||'')+':'+(a.line||'')).slice(0,14).join(','));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function cast(s,uid){return pick(s,a=>a.type==='event'&&a.uid===uid);}
function canActivate(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}
function raidOnto(s,uid,baseUid,line){
 return pick(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&
  (line?a.line===line:a.line!=='energy'));
}
function advance(s,pred,label){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit')s=pick(s,a=>a.type==='chooseHandLimit');
  else if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
  else if(s.pending?.kind==='aot'&&s.pending.step==='overflow')
   s=pick(s,a=>a.type==='aot'&&a.mode==='remove');
  else if(s.pending)throw Error('Pending '+s.pending.kind+'/'+s.pending.step+' blocked '+label);
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach '+label);
 }
 return s;
}
function toPhase(s,phase){return advance(s,x=>x.phase===phase,phase);}
function ownMainAgain(s){
 const started=s.turn;
 return advance(s,x=>x.phase==='main'&&x.active===0&&x.turn>started,'own main');
}
function finish(s){assertUniversalMatch(packs,s);return s;}
function live(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,c){return universalBp(packs,s,c);}
function modes(s,mode){return (s.pending?.actions||[]).filter(a=>a.mode===mode);}
function uids(s){return legalUniversalActions(packs,s).map(a=>a.uid);}
function revealed(s,uid){return s.publicReveals.some(e=>e.uid===uid);}
function fuel(s,ids,p=0){ids.forEach((id,i)=>put(s,p,id,'energy',i,true));}
function orderLook(s){
 const clicks=[];
 while(s.pending?.step==='lookOrder'){
  const uid=s.pending.data.left[0];
  clicks.push(uid);
  s=pick(s,a=>a.mode==='next'&&a.uid===uid);
 }
 return {s,clicks};
}
function printed(id){return AOT_CARDS.find(c=>c.id===id);}

test('102 through 113 each have one UA23ST printing',()=>{
 for(let n=102;n<=113;n++){
  const id='AOT-1-'+n;
  const card=printed(id);
  const built=pack.cards[id];
  assert.equal(card.printings.filter(p=>p.set==='UA23ST').length,1);
  assert.equal(built.name,card.nameJa);
  assert.equal(built.energy,card.energy);
  assert.equal(built.ap,card.ap);
  assert.equal(built.bp,card.bp);
  assert.equal(built.color,card.color);
  assert.equal(built.trigger,card.trigger);
 }
});

test('102 has no effect, and its active trigger readies one character',()=>{
 const ids=['AOT-1-102','AOT-1-095','AOT-1-078'];
 let s=toPhase(fresh(ids,10201),'main');
 fuel(s,['AOT-1-095']);
 readyAp(s,0,1);
 const bert=toHand(s,0,'AOT-1-102');
 s=play(s,bert.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,bert.uid).ready,false);
 assert.equal(bp(s,live(s,0,bert.uid)),3000);
 finish(s);

 let life=toPhase(fresh(ids,10202),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 const rested=put(life,1,'AOT-1-078','front',0,false);
 setLife(life,1,['AOT-1-102','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'active');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='skip'),true);
 life=pick(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(live(life,1,rested.uid).ready,true);
 assert.equal(bp(life,live(life,1,rested.uid)),3500);
 finish(life);
});

test('103 steps once from the front and has no life trigger',()=>{
 const ids=['AOT-1-103','AOT-1-090','AOT-1-078'];
 let moved=toPhase(fresh(ids,10301),'move');
 const reiner=put(moved,0,'AOT-1-103','front',0,true);
 assert.equal(legalUniversalActions(packs,moved).some(a=>a.type==='step'&&a.uid===reiner.uid),true);
 moved=pick(moved,a=>a.type==='step'&&a.uid===reiner.uid);
 assert.equal(moved.players[0].energy.some(c=>c?.uid===reiner.uid),true);
 assert.equal(legalUniversalActions(packs,moved).some(a=>a.type==='step'&&a.uid===reiner.uid),false);
 finish(moved);

 let life=toPhase(fresh(ids,10302),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-103','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='AOT-1-103'),true);
 assert.equal(life.players[1].life.length,1);
 finish(life);
});

test('104 chooses a private look or a returning corps only from the energy line',()=>{
 const ids=['AOT-1-104','AOT-1-095','AOT-1-082','AOT-1-077','AOT-1-100','AOT-1-090','AOT-1-105','AOT-1-078'];
 let front=toPhase(fresh(ids,10401),'main');
 fuel(front,['AOT-1-095']);
 readyAp(front,0,1);
 front=play(front,toHand(front,0,'AOT-1-104').uid,'front');
 assert.equal(front.pending,null);
 finish(front);

 let look=toPhase(fresh(ids,10402),'main');
 fuel(look,['AOT-1-095']);
 readyAp(look,0,1);
 const window=crown(look,0,['AOT-1-082','AOT-1-077','AOT-1-100']);
 look=play(look,toHand(look,0,'AOT-1-104').uid,'energy');
 assert.equal(look.pending.step,'mode104');
 assert.equal(modes(look,'skip').length,0);
 assert.deepEqual(modes(look,'mode').map(a=>a.key).sort(),['deploy','search']);
 look=pick(look,a=>a.key==='search');
 assert.equal(look.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(packs,look,0).inspected.length,3);
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assert.deepEqual(uids(look).filter(Boolean).sort(),[window[0].uid].sort());
 look=pick(look,a=>a.mode==='done');
 const ordered=orderLook(look);
 look=ordered.s;
 assert.equal(look.pending,null);
 assert.equal(look.players[0].deck.at(-1).uid,ordered.clicks[0]);
 assert.equal(window.every(c=>revealed(look,c.uid)),false);
 finish(look);

 let taken=toPhase(fresh(ids,10403),'main');
 fuel(taken,['AOT-1-095']);
 readyAp(taken,0,1);
 const cards=crown(taken,0,['AOT-1-100','AOT-1-082','AOT-1-078']);
 taken=play(taken,toHand(taken,0,'AOT-1-104').uid,'energy');
 taken=pick(taken,a=>a.key==='search');
 taken=pick(taken,a=>a.mode==='take'&&a.uid===cards[1].uid);
 assert.equal(revealed(taken,cards[1].uid),true);
 assert.equal(revealed(taken,cards[0].uid),false);
 taken=orderLook(taken).s;
 assert.equal(taken.players[0].hand.some(c=>c.uid===cards[1].uid),true);
 finish(taken);

 let deployed=toPhase(fresh(ids,10404),'main');
 fuel(deployed,['AOT-1-095']);
 readyAp(deployed,0,2);
 park(deployed,0,[]);
 const legal=toHand(deployed,0,'AOT-1-090');
 const heavy=toHand(deployed,0,'AOT-1-077');
 const ap2=toHand(deployed,0,'AOT-1-105');
 deployed=play(deployed,toHand(deployed,0,'AOT-1-104').uid,'energy');
 deployed=pick(deployed,a=>a.key==='deploy');
 assert.equal(uids(deployed).includes(legal.uid),true);
 assert.equal(uids(deployed).includes(heavy.uid),false);
 assert.equal(uids(deployed).includes(ap2.uid),false);
 assert.equal(modes(deployed,'done').length,1);
 deployed=pick(deployed,a=>a.uid===legal.uid&&a.line==='front');
 assert.equal(live(deployed,0,legal.uid).ready,true);
 assert.equal(live(deployed,0,legal.uid).aotReturnHandAtAttackEnd.turn,deployed.turn);
 park(deployed,0,[]);
 const started=deployed.turn;
 deployed=advance(deployed,x=>x.turn>started,'after attack');
 assert.equal(deployed.players[0].hand.some(c=>c.uid===legal.uid),true);
 assert.equal(deployed.players[0].front.some(c=>c?.uid===legal.uid),false);
 finish(deployed);
});

test('105 enters active only while a face-up Eren name is on this field, and impact is printed',()=>{
 const ids=['AOT-1-105','AOT-1-095','AOT-1-090','AOT-1-071','AOT-1-078','AOT-1-080'];
 let plain=toPhase(fresh(ids,10501),'main');
 fuel(plain,['AOT-1-095','AOT-1-071']);
 readyAp(plain,0,2);
 const rested=toHand(plain,0,'AOT-1-105');
 plain=play(plain,rested.uid);
 assert.equal(plain.pending,null);
 assert.equal(live(plain,0,rested.uid).ready,false);
 assert.equal(universalImpact(packs,plain,live(plain,0,rested.uid)),1);
 finish(plain);

 let named=toPhase(fresh(ids,10502),'main');
 fuel(named,['AOT-1-095']);
 put(named,0,'AOT-1-090','energy',3,true);
 readyAp(named,0,2);
 const active=toHand(named,0,'AOT-1-105');
 named=play(named,active.uid);
 assert.equal(live(named,0,active.uid).ready,true);
 finish(named);

 let covered=toPhase(fresh(ids,10507),'main');
 fuel(covered,['AOT-1-095','AOT-1-071']);
 const hidden=put(covered,0,'AOT-1-090','front',0,true);
 hidden.faceDown=true;
 readyAp(covered,0,2);
 const sleeper=toHand(covered,0,'AOT-1-105');
 covered=play(covered,sleeper.uid);
 assert.equal(live(covered,0,sleeper.uid).ready,false);
 assert.equal(universalImpact(packs,covered,live(covered,0,sleeper.uid)),1);
 finish(covered);

 let buried=toPhase(fresh(ids,10508),'main');
 fuel(buried,['AOT-1-095','AOT-1-071']);
 const host=put(buried,0,'AOT-1-078','front',0,true);
 const under=take(buried,0,'AOT-1-090');
 under.faceDown=true;
 host.under=[under];
 readyAp(buried,0,2);
 const above=toHand(buried,0,'AOT-1-105');
 buried=play(buried,above.uid);
 assert.equal(live(buried,0,above.uid).ready,false);
 finish(buried);

 let foe=toPhase(fresh(ids,10503),'main');
 fuel(foe,['AOT-1-095','AOT-1-071']);
 put(foe,1,'AOT-1-090','front',0,true);
 readyAp(foe,0,2);
 const quiet=toHand(foe,0,'AOT-1-105');
 foe=play(foe,quiet.uid);
 assert.equal(live(foe,0,quiet.uid).ready,false);
 finish(foe);

 let battle=toPhase(fresh(ids,10505),'main');
 fuel(battle,['AOT-1-095','AOT-1-090']);
 put(battle,0,'AOT-1-090','front',0,true);
 readyAp(battle,0,2);
 const striker=toHand(battle,0,'AOT-1-105');
 battle=play(battle,striker.uid);
 const wall=put(battle,1,'AOT-1-078','front',0,true);
 setLife(battle,1,['AOT-1-080','AOT-1-080']);
 battle=toPhase(battle,'attack');
 battle=pick(battle,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 battle=pick(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].life.length,1);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 finish(battle);

 let life=toPhase(fresh(['AOT-1-105','AOT-1-078'],10506),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-105','AOT-1-078']);
 const hand=life.players[1].hand.length;
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,hand+1);
 finish(life);
});

test('106 gains 1000 while its controller has 3 life or fewer, on either turn',()=>{
 const ids=['AOT-1-106','AOT-1-095','AOT-1-078','AOT-1-080'];
 let high=toPhase(fresh(ids,10601),'main');
 setLife(high,0,['AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-080']);
 const eren=put(high,0,'AOT-1-106','front',0,true);
 assert.equal(bp(high,eren),3000);
 setLife(high,0,['AOT-1-080','AOT-1-080','AOT-1-080']);
 assert.equal(bp(high,live(high,0,eren.uid)),4000);
 const foe=advance(high,x=>x.active===1&&x.phase==='main','opponent main');
 assert.equal(bp(foe,live(foe,0,eren.uid)),4000);
 setLife(foe,0,[]);
 assert.equal(bp(foe,live(foe,0,eren.uid)),4000);
 finish(foe);

 let life=toPhase(fresh(ids,10602),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-106','AOT-1-080']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='AOT-1-106'),true);
 finish(life);
});

test('107 draws and may spend one life only while face-up raided, once per Eren name',()=>{
 const ids=['AOT-1-107','AOT-1-090','AOT-1-095','AOT-1-080','AOT-1-078'];
 let plain=toPhase(fresh(ids,10701),'main');
 fuel(plain,['AOT-1-095','AOT-1-090']);
 put(plain,0,'AOT-1-090','front',0,true);
 readyAp(plain,0,1);
 setLife(plain,0,['AOT-1-080','AOT-1-080','AOT-1-078']);
 const played=toHand(plain,0,'AOT-1-107');
 const deck=plain.players[0].deck.length;
 plain=play(plain,played.uid);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(plain.pending,null);
 assert.equal(canActivate(plain,played.uid),false);
 finish(plain);

 let raid=toPhase(fresh(ids,10702),'main');
 fuel(raid,['AOT-1-095','AOT-1-095','AOT-1-095']);
 const base=put(raid,0,'AOT-1-090','front',0,true);
 const other=put(raid,0,'AOT-1-090','front',1,true);
 readyAp(raid,0,2);
 setLife(raid,0,['AOT-1-080','AOT-1-078','AOT-1-078']);
 const before=raid.players[0].deck.length;
 const first=toHand(raid,0,'AOT-1-107');
 raid=raidOnto(raid,first.uid,base.uid);
 assert.equal(raid.players[0].deck.length,before-1);
 assert.equal(live(raid,0,first.uid).ready,true);
 assert.equal(canActivate(raid,first.uid),true);
 const secret=raid.players[0].life[0];
 raid=pick(raid,a=>a.type==='activate'&&a.uid===first.uid);
 assert.equal(raid.pending.step,'lifeOut');
 assert.equal(modes(raid,'skip').length,0);
 assert.equal(universalPrivateChoices(packs,raid,1),null);
 raid=pick(raid,a=>a.mode==='life'&&a.uid===secret.uid);
 assert.equal(raid.players[0].outside.some(c=>c.uid===secret.uid),true);
 assert.equal(raid.players[0].life.some(c=>c.uid===secret.uid),false);
 assert.equal(raid.pending?.trigger,undefined);
 if(raid.pending?.step==='ready'){
  assert.equal(modes(raid,'skip').length,1);
  raid=pick(raid,a=>a.mode==='skip');
 }
 assert.equal(canActivate(raid,first.uid),false);
 const second=toHand(raid,0,'AOT-1-107');
 const mid=raid.players[0].deck.length;
 raid=raidOnto(raid,second.uid,other.uid);
 assert.equal(raid.players[0].deck.length,mid-1);
 assert.equal(canActivate(raid,second.uid),false);
 const later=ownMainAgain(raid);
 assert.equal(canActivate(later,second.uid),true);
 finish(later);

 let bench=toPhase(fresh(ids,10703),'main');
 fuel(bench,['AOT-1-095','AOT-1-090']);
 const energyBase=put(bench,0,'AOT-1-090','energy',3,true);
 readyAp(bench,0,1);
 const side=toHand(bench,0,'AOT-1-107');
 const sideDeck=bench.players[0].deck.length;
 bench=raidOnto(bench,side.uid,energyBase.uid,'energy');
 assert.equal(bench.players[0].deck.length,sideDeck-1);
 assert.equal(bench.players[0].energy.some(c=>c?.cardId==='AOT-1-107'),true);
 assert.equal(canActivate(bench,side.uid),false);
 finish(bench);

 let life=toPhase(fresh(['AOT-1-107','AOT-1-090','AOT-1-095','AOT-1-078'],10704),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 fuel(life,['AOT-1-095','AOT-1-090'],1);
 const home=put(life,1,'AOT-1-090','front',0,true);
 setLife(life,1,['AOT-1-107','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='get'),true);
 life=pick(life,a=>a.mode==='raid'&&a.baseUid===home.uid);
 assert.equal(life.players[1].front.some(c=>c?.cardId==='AOT-1-107'),true);
 finish(life);
});

test('108 enters active at five corps, then rests and retires to buff the corps already on the field',()=>{
 const ids=['AOT-1-108','AOT-1-095','AOT-1-090','AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085'];
 let short=toPhase(fresh(ids,10801),'main');
 fuel(short,['AOT-1-095']);
 put(short,0,'AOT-1-090','front',0,true);
 put(short,0,'AOT-1-078','front',1,true);
 put(short,0,'AOT-1-079','front',2,true);
 put(short,0,'AOT-1-083','front',3,true);
 readyAp(short,0,1);
 const field=toHand(short,0,'AOT-1-108');
 short=play(short,field.uid,'energy');
 assert.equal(short.pending,null);
 assert.equal(live(short,0,field.uid).ready,false);
 assert.equal(canActivate(short,field.uid),false);
 finish(short);

 let s=toPhase(fresh(ids,10802),'main');
 fuel(s,['AOT-1-095']);
 const corps=[
  put(s,0,'AOT-1-090','front',0,true),
  put(s,0,'AOT-1-078','front',1,true),
  put(s,0,'AOT-1-079','front',2,true),
  put(s,0,'AOT-1-083','front',3,true),
  put(s,0,'AOT-1-085','energy',3,true)
 ];
 put(s,1,'AOT-1-090','front',0,true);
 readyAp(s,0,2);
 const school=toHand(s,0,'AOT-1-108');
 s=play(s,school.uid,'energy');
 assert.equal(live(s,0,school.uid).ready,true);
 const coveredSchool=toPhase(fresh(ids,10804),'main');
 fuel(coveredSchool,['AOT-1-095']);
 const down=put(coveredSchool,0,'AOT-1-090','front',0,true);
 down.faceDown=true;
 put(coveredSchool,0,'AOT-1-078','front',1,true);
 put(coveredSchool,0,'AOT-1-079','front',2,true);
 put(coveredSchool,0,'AOT-1-083','front',3,true);
 put(coveredSchool,0,'AOT-1-085','energy',3,true);
 readyAp(coveredSchool,0,1);
 const hiddenField=toHand(coveredSchool,0,'AOT-1-108');
 const restedField=play(coveredSchool,hiddenField.uid,'energy');
 assert.equal(live(restedField,0,hiddenField.uid).ready,false);
 finish(restedField);
 s=pick(s,a=>a.type==='activate'&&a.uid===school.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===school.uid),true);
 for(const c of corps)assert.equal(bp(s,live(s,0,c.uid)),(c.cardId==='AOT-1-090'?1500:c.cardId==='AOT-1-078'?500:c.cardId==='AOT-1-079'?2500:c.cardId==='AOT-1-083'?2000:2000)+1000);
 assert.equal(bp(s,s.players[1].front[0]),1500);
 const late=toHand(s,0,'AOT-1-083');
 s=play(s,late.uid,'energy');
 assert.equal(bp(s,live(s,0,late.uid)),2000);
 const faded=ownMainAgain(s);
 assert.equal(bp(faded,live(faded,0,corps[0].uid)),1500);
 finish(faded);

 let life=toPhase(fresh(['AOT-1-108','AOT-1-078'],10803),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-108','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'get');
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='AOT-1-108'),true);
 finish(life);
});

test('109 retires one opposing front character at 1000 BP per own corps',()=>{
 const ids=['AOT-1-109','AOT-1-095','AOT-1-090','AOT-1-078','AOT-1-083','AOT-1-079','AOT-1-080'];
 let s=toPhase(match(ids,['AOT-1-083','AOT-1-079','AOT-1-078'],10902),'main');
 fuel(s,['AOT-1-095']);
 put(s,0,'AOT-1-090','front',0,true);
 put(s,0,'AOT-1-078','energy',3,true);
 const legal=put(s,1,'AOT-1-083','front',0,true);
 const high=put(s,1,'AOT-1-079','front',1,true);
 const bench=put(s,1,'AOT-1-083','energy',0,true);
 readyAp(s,0,1);
 s=cast(s,toHand(s,0,'AOT-1-109').uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,2000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.equal(uids(s).includes(legal.uid),true);
 assert.equal(uids(s).includes(high.uid),false);
 assert.equal(uids(s).includes(bench.uid),false);
 s=pick(s,a=>a.type==='chooseRetireBp'&&a.uid===legal.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===legal.uid),true);
 assert.equal(live(s,1,high.uid)?.cardId,'AOT-1-079');
 finish(s);

 let none=toPhase(match(ids,['AOT-1-083','AOT-1-079','AOT-1-078'],10904),'main');
 fuel(none,['AOT-1-095']);
 const huge=put(none,1,'AOT-1-083','front',0,true);
 readyAp(none,0,1);
 const unused=toHand(none,0,'AOT-1-109');
 const apBefore=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legalUniversalActions(packs,none).some(a=>a.type==='event'&&a.uid===unused.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,none,{type:'event',uid:unused.uid}),/not currently legal/);
 assert.equal(none.players[0].hand.some(c=>c.uid===unused.uid),true);
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,apBefore);
 assert.equal(none.players[1].front.some(c=>c?.uid===huge.uid),true);
 finish(none);

 let over=toPhase(match(ids,['AOT-1-079','AOT-1-078'],10905),'main');
 fuel(over,['AOT-1-095']);
 put(over,0,'AOT-1-090','front',0,true);
 put(over,0,'AOT-1-078','energy',3,true);
 const onlyHigh=put(over,1,'AOT-1-079','front',0,true);
 readyAp(over,0,1);
 const blocked=toHand(over,0,'AOT-1-109');
 assert.equal(legalUniversalActions(packs,over).some(a=>a.type==='event'&&a.uid===blocked.uid),false);
 assert.equal(over.players[1].front.some(c=>c?.uid===onlyHigh.uid),true);
 finish(over);

 let hiddenCorps=toPhase(match(ids,['AOT-1-083','AOT-1-078'],10906),'main');
 fuel(hiddenCorps,['AOT-1-095']);
 const coveredCorps=put(hiddenCorps,0,'AOT-1-090','front',0,true);
 coveredCorps.faceDown=true;
 put(hiddenCorps,0,'AOT-1-078','energy',3,true);
 const stillHigh=put(hiddenCorps,1,'AOT-1-083','front',0,true);
 readyAp(hiddenCorps,0,1);
 const unseen=toHand(hiddenCorps,0,'AOT-1-109');
 assert.equal(legalUniversalActions(packs,hiddenCorps).some(a=>a.type==='event'&&a.uid===unseen.uid),false);
 assert.equal(hiddenCorps.players[1].front.some(c=>c?.uid===stillHigh.uid),true);
 finish(hiddenCorps);

 let life=toPhase(match(['AOT-1-078'],['AOT-1-109','AOT-1-083','AOT-1-080'],10903,'red','red'),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 const victim=put(life,0,'AOT-1-078','front',1,true);
 setLife(life,1,['AOT-1-109','AOT-1-080']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='skip'),true);
 life=pick(life,a=>a.mode==='special'&&a.uid===victim.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===victim.uid),true);
 finish(life);
});

test('110 debuffs and bounces only while face-up raided onto Levi',()=>{
 const ids=['AOT-1-110','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-001','AOT-1-008','AOT-1-004'];
 let plain=toPhase(fresh(ids,11001,'blue'),'main');
 fuel(plain,['AOT-1-002','AOT-1-006','AOT-1-001']);
 readyAp(plain,0,1);
 const played=toHand(plain,0,'AOT-1-110');
 plain=play(plain,played.uid);
 assert.equal(plain.pending,null);
 plain=toPhase(plain,'attack');
 live(plain,0,played.uid).ready=true;
 plain=pick(plain,a=>a.type==='attack'&&a.uid===played.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 finish(plain);

 let s=toPhase(fresh(ids,11002,'blue'),'main');
 fuel(s,['AOT-1-002','AOT-1-006','AOT-1-001']);
 const base=put(s,0,'AOT-1-007','front',0,true);
 const legal=put(s,1,'AOT-1-008','front',0,true);
 const low=put(s,1,'AOT-1-001','front',1,true);
 const bench=put(s,1,'AOT-1-008','energy',0,true);
 readyAp(s,0,1);
 const levi=toHand(s,0,'AOT-1-110');
 s=raidOnto(s,levi.uid,base.uid);
 assert.equal(live(s,0,levi.uid).ready,true);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 assert.equal(uids(s).includes(legal.uid),true);
 assert.equal(uids(s).includes(low.uid),false);
 assert.equal(uids(s).includes(bench.uid),false);
 s=pick(s,a=>a.type==='chooseTarget'&&a.uid===legal.uid);
 assert.equal(bp(s,live(s,1,legal.uid)),500);
 const later=ownMainAgain(s);
 assert.equal(bp(later,live(later,1,legal.uid)),2500);
 finish(later);

 let attack=toPhase(fresh(ids,11003,'blue'),'main');
 fuel(attack,['AOT-1-002','AOT-1-006','AOT-1-001']);
 const home=put(attack,0,'AOT-1-007','front',0,true);
 const tall=put(attack,1,'AOT-1-008','front',0,true);
 readyAp(attack,0,2);
 const copy=toHand(attack,0,'AOT-1-110');
 attack=raidOnto(attack,copy.uid,home.uid);
 attack=pick(attack,a=>a.type==='chooseTarget'&&a.uid==null);
 assert.equal(bp(attack,live(attack,1,tall.uid)),2500);
 const bounce=put(attack,1,'AOT-1-001','front',1,true);
 setLife(attack,1,['AOT-1-006','AOT-1-006']);
 attack=toPhase(attack,'attack');
 attack=pick(attack,a=>a.type==='attack'&&a.uid===copy.uid&&!a.targetUid);
 assert.equal(attack.pending.step,'pay');
 attack=pick(attack,a=>a.mode==='skip');
 assert.equal(attack.pending.kind,'block');
 finish(attack);

 let paid=toPhase(fresh(ids,11004,'blue'),'main');
 fuel(paid,['AOT-1-002','AOT-1-006','AOT-1-001']);
 const stand=put(paid,0,'AOT-1-007','front',0,true);
 readyAp(paid,0,2);
 const body=toHand(paid,0,'AOT-1-110');
 paid=raidOnto(paid,body.uid,stand.uid);
 if(paid.pending)paid=pick(paid,a=>a.type==='chooseTarget'&&a.uid==null);
 const back=put(paid,1,'AOT-1-004','front',0,true);
 const wall=put(paid,1,'AOT-1-008','front',1,true);
 const energy=put(paid,1,'AOT-1-001','energy',1,true);
 setLife(paid,1,['AOT-1-006','AOT-1-006']);
 paid=toPhase(paid,'attack');
 paid=pick(paid,a=>a.type==='attack'&&a.uid===body.uid&&!a.targetUid);
 paid=pick(paid,a=>a.mode==='pay');
 assert.equal(paid.pending.step,'bounce');
 assert.equal(modes(paid,'skip').length,1);
 assert.equal(uids(paid).includes(back.uid),true);
 assert.equal(uids(paid).includes(wall.uid),false);
 assert.equal(uids(paid).includes(energy.uid),false);
 paid=pick(paid,a=>a.mode==='bounce'&&a.uid===back.uid);
 assert.equal(paid.players[1].hand.some(c=>c.uid===back.uid),true);
 finish(paid);

 let life=toPhase(fresh(ids,11005,'blue'),'attack');
 const hitter=put(life,0,'AOT-1-001','front',0,true);
 fuel(life,['AOT-1-002','AOT-1-006','AOT-1-001'],1);
 const homeLife=put(life,1,'AOT-1-007','front',0,true);
 setLife(life,1,['AOT-1-110','AOT-1-006']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'raid');
 life=pick(life,a=>a.mode==='raid'&&a.baseUid===homeLife.uid);
 assert.equal(life.players[1].front.some(c=>c?.cardId==='AOT-1-110'),true);
 finish(life);
});

test('111 readies an AP at its own attack start and may pay one AP for 500 BP',()=>{
 const ids=['AOT-1-111','AOT-1-002','AOT-1-001','AOT-1-006'];
 let ready=toPhase(fresh(ids,11101,'blue'),'main');
 const erwin=put(ready,0,'AOT-1-111','front',0,true);
 readyAp(ready,0,2);
 ready.players[0].apCards[1].ready=false;
 ready=pick(ready,a=>a.type==='next');
 assert.equal(ready.phase,'attack');
 assert.equal(ready.pending.step,'ready');
 assert.equal(modes(ready,'skip').length,1);
 ready=pick(ready,a=>a.mode==='skip');
 assert.equal(ready.players[0].apCards[1].ready,false);
 const foeAttack=advance(ready,x=>x.active===1&&x.phase==='attack','opponent attack');
 assert.equal(foeAttack.pending,null);
 finish(foeAttack);
 let chosen=toPhase(fresh(ids,11107,'blue'),'main');
 put(chosen,0,'AOT-1-111','front',0,true);
 readyAp(chosen,0,2);
 chosen.players[0].apCards[1].ready=false;
 chosen=pick(chosen,a=>a.type==='next');
 chosen=pick(chosen,a=>a.mode==='ready'&&a.uid===chosen.players[0].apCards[1].uid);
 assert.equal(chosen.players[0].apCards[1].ready,true);
 finish(chosen);

 let rested=toPhase(fresh(ids,11102,'blue'),'main');
 put(rested,0,'AOT-1-111','front',0,false);
 readyAp(rested,0,1);
 rested.players[0].apCards[0].ready=false;
 rested=pick(rested,a=>a.type==='next');
 assert.equal(rested.pending,null);
 finish(rested);

 let line=toPhase(fresh(ids,11103,'blue'),'main');
 put(line,0,'AOT-1-111','energy',0,true);
 readyAp(line,0,1);
 line.players[0].apCards[0].ready=false;
 line=pick(line,a=>a.type==='next');
 assert.equal(line.pending,null);
 finish(line);

 let paid=toPhase(fresh(ids,11104,'blue'),'main');
 fuel(paid,['AOT-1-002','AOT-1-001']);
 const actor=put(paid,0,'AOT-1-111','front',0,false);
 readyAp(paid,0,1);
 paid=toPhase(paid,'attack');
 paid.players[0].front.find(c=>c?.uid===actor.uid).ready=true;
 setLife(paid,1,['AOT-1-006','AOT-1-006']);
 paid=pick(paid,a=>a.type==='attack'&&a.uid===actor.uid&&!a.targetUid);
 assert.equal(paid.pending.step,'pay');
 paid=pick(paid,a=>a.mode==='pay');
 assert.equal(bp(paid,live(paid,0,actor.uid)),4000);
 paid=pick(paid,a=>a.type==='chooseBlock'&&a.uid==null);
 const faded=ownMainAgain(paid);
 assert.equal(bp(faded,live(faded,0,actor.uid)),3500);
 finish(faded);

 let skipped=toPhase(fresh(ids,11105,'blue'),'main');
 const quiet=put(skipped,0,'AOT-1-111','front',0,false);
 readyAp(skipped,0,1);
 skipped=toPhase(skipped,'attack');
 skipped.players[0].front.find(c=>c?.uid===quiet.uid).ready=true;
 skipped.players[0].apCards.forEach(c=>{c.ready=false;});
 skipped=pick(skipped,a=>a.type==='attack'&&a.uid===quiet.uid&&!a.targetUid);
 assert.equal(skipped.pending.kind,'block');
 assert.equal(bp(skipped,live(skipped,0,quiet.uid)),3500);
 finish(skipped);

 let life=toPhase(fresh(['AOT-1-111','AOT-1-001'],11106,'blue'),'attack');
 const hitter=put(life,0,'AOT-1-001','front',0,true);
 setLife(life,1,['AOT-1-111','AOT-1-001']);
 const hand=life.players[1].hand.length;
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,hand+1);
 finish(life);
});

test('112 raises its retire cap at 8 energy, and a trigger does not pay the selection AP',()=>{
 const own=['AOT-1-112','AOT-1-060','AOT-1-039','AOT-1-042'];
 const foe=['AOT-1-083','AOT-1-079','AOT-1-086','AOT-1-092','AOT-1-078','AOT-1-080'];
 let low=toPhase(match(own,foe,11201,'green','red'),'main');
 fuel(low,['AOT-1-060','AOT-1-039']);
 const small=put(low,1,'AOT-1-083','front',0,true);
 const mid=put(low,1,'AOT-1-079','front',1,true);
 const bench=put(low,1,'AOT-1-083','energy',0,true);
 readyAp(low,0,2);
 low=play(low,toHand(low,0,'AOT-1-112').uid);
 assert.equal(low.pending.step,'retire');
 assert.equal(low.pending.data.limit,2000);
 assert.equal(uids(low).includes(small.uid),true);
 assert.equal(uids(low).includes(mid.uid),false);
 assert.equal(uids(low).includes(bench.uid),false);
 assert.equal(modes(low,'skip').length,1);
 low=pick(low,a=>a.mode==='skip');
 assert.equal(live(low,1,small.uid)?.cardId,'AOT-1-083');
 finish(low);

 let high=toPhase(match(own,foe,11202,'green','red'),'main');
 fuel(high,['AOT-1-060','AOT-1-060','AOT-1-039']);
 const edge=put(high,1,'AOT-1-092','front',0,true);
 const over=put(high,1,'AOT-1-078','front',1,true);
 readyAp(high,0,2);
 high=play(high,toHand(high,0,'AOT-1-112').uid);
 assert.equal(high.pending.data.limit,4000);
 assert.equal(uids(high).includes(edge.uid),true);
 high=pick(high,a=>a.mode==='retire'&&a.uid===edge.uid);
 assert.equal(high.players[1].outside.some(c=>c.uid===edge.uid),true);
 assert.equal(bp(high,over),500);
 finish(high);

 let life=toPhase(match(['AOT-1-112','AOT-1-042'],['AOT-1-078','AOT-1-080','AOT-1-109'],11203,'green','red'),'attack');
 const titan=put(life,0,'AOT-1-112','front',0,true);
 const hitter=put(life,0,'AOT-1-042','front',1,true);
 setLife(life,1,['AOT-1-109','AOT-1-080']);
 life.players[1].apCards.forEach(c=>{c.ready=false;});
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='special'&&a.uid===titan.uid),true);
 life=pick(life,a=>a.mode==='skip');
 assert.equal(live(life,0,titan.uid)?.cardId,'AOT-1-112');
 finish(life);

 let trigger=toPhase(fresh(['AOT-1-112','AOT-1-042'],11204,'green'),'attack');
 const hitter2=put(trigger,0,'AOT-1-042','front',0,true);
 const rested=put(trigger,1,'AOT-1-042','front',0,false);
 setLife(trigger,1,['AOT-1-112','AOT-1-042']);
 trigger=pick(trigger,a=>a.type==='attack'&&a.uid===hitter2.uid&&!a.targetUid);
 trigger=pick(trigger,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(trigger.pending.trigger,'active');
 trigger=pick(trigger,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(live(trigger,1,rested.uid).ready,true);
 assert.equal(bp(trigger,live(trigger,1,rested.uid)),5000);
 finish(trigger);
});

test('113 cannot enter the energy line, shrinks the front, and may retire one opposing field',()=>{
 const own=['AOT-1-113','AOT-1-060','AOT-1-042','AOT-1-045'];
 const foe=['AOT-1-095','AOT-1-108','AOT-1-078','AOT-1-080'];
 let banned=toPhase(match(own,foe,11301,'green','red'),'main');
 fuel(banned,['AOT-1-060','AOT-1-060']);
 readyAp(banned,0,1);
 const hand=toHand(banned,0,'AOT-1-113');
 assert.equal(legalUniversalActions(packs,banned).some(a=>a.type==='play'&&a.uid===hand.uid&&a.line==='energy'),false);
 assert.equal(legalUniversalActions(packs,banned).some(a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front'),true);
 finish(banned);

 let open=toPhase(match(own,foe,11302,'green','red'),'main');
 fuel(open,['AOT-1-060','AOT-1-060']);
 const energyField=put(open,1,'AOT-1-095','energy',0,true);
 const otherField=put(open,1,'AOT-1-108','energy',1,true);
 const character=put(open,1,'AOT-1-078','front',0,true);
 readyAp(open,0,1);
 open=play(open,toHand(open,0,'AOT-1-113').uid);
 assert.equal(open.pending.step,'retireField');
 assert.equal(uids(open).includes(otherField.uid),true);
 assert.equal(uids(open).includes(energyField.uid),true);
 assert.equal(uids(open).includes(character.uid),false);
 assert.equal(modes(open,'skip').length,1);
 open=pick(open,a=>a.mode==='retire'&&a.uid===energyField.uid);
 assert.equal(open.players[1].outside.some(c=>c.uid===energyField.uid),true);
 assert.equal(live(open,1,otherField.uid)?.cardId,'AOT-1-108');
 assert.equal(open.players[0].aotFrontLimit,3);
 finish(open);

 let crowded=toPhase(match(own,['AOT-1-078','AOT-1-080'],11303,'green','red'),'main');
 fuel(crowded,['AOT-1-060','AOT-1-060']);
 put(crowded,0,'AOT-1-042','front',0,true);
 put(crowded,0,'AOT-1-045','front',1,true);
 const extra=put(crowded,0,'AOT-1-042','front',2,true);
 readyAp(crowded,0,1);
 crowded=play(crowded,toHand(crowded,0,'AOT-1-113').uid);
 assert.equal(crowded.pending.step,'overflow');
 crowded=pick(crowded,a=>a.mode==='remove'&&a.uid===extra.uid);
 assert.equal(crowded.players[0].removed.some(c=>c.uid===extra.uid),true);
 assert.equal(crowded.players[0].front.filter(Boolean).length,3);
 assert.equal(crowded.pending,null);
 finish(crowded);

 let life=toPhase(match(['AOT-1-078'],['AOT-1-113','AOT-1-035'],11304,'red','green'),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-113','AOT-1-035']);
 const handSize=life.players[1].hand.length;
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,handSize+1);
 finish(life);
});
