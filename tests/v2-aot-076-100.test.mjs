import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalPrivateChoices,
 zoneRequiredEnergy}
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
function fresh(ids,seed){return match(ids,ids,seed);}
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
  ' '+actions.map(a=>a.type+':'+(a.mode||'')+':'+(a.uid||'')).slice(0,12).join(','));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function cast(s,uid){return pick(s,a=>a.type==='event'&&a.uid===uid);}
function activate(s,uid){return pick(s,a=>a.type==='activate'&&a.uid===uid);}
function canActivate(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}
function canEvent(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
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
  else if(s.pending)throw Error('Pending '+s.pending.kind+'/'+s.pending.step+' blocked '+label);
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach '+label);
 }
 return s;
}
function toPhase(s,phase){return advance(s,x=>x.phase===phase,phase);}
function toActiveMain(s,p){return advance(s,x=>x.phase==='main'&&x.active===p,'player '+p);}
function ownMainAgain(s){
 const started=s.turn;
 return advance(s,x=>x.phase==='main'&&x.active===0&&x.turn>started,'own main');
}
function finish(s){assertUniversalMatch(packs,s);return s;}
function live(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,c){return universalBp(packs,s,c);}
function cardEnergy(s,p,c){return universalCardEnergy(packs,s,p,c);}
function pool(s,p=0){return universalEnergyByColor(packs,s,p);}
function modes(s,mode){return (s.pending?.actions||[]).filter(a=>a.mode===mode);}
function printed(id){return AOT_CARDS.find(c=>c.id===id);}
function uids(s){return legalUniversalActions(packs,s).map(a=>a.uid);}
function revealed(s,uid){return s.publicReveals.some(e=>e.uid===uid);}
function orderBottom(s){
 const order=[];
 while(s.pending?.kind==='effect-top-order'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder'&&!order.includes(a.uid));
  order.push(next.uid);
  s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===next.uid);
 }
 return {s,order};
}
function lifeOrder(s){
 let guard=0;
 while(s.pending?.kind==='life-batch-order'){
  s=pick(s,a=>a.type==='chooseLifeOrder');
  if(++guard>6)throw Error('LIFE order did not finish');
 }
 return s;
}
function orderLook(s){
 const clicks=[];
 while(s.pending?.step==='lookOrder'){
  const uid=s.pending.data.left[0];
  clicks.push(uid);
  s=pick(s,a=>a.mode==='next'&&a.uid===uid);
 }
 return {s,clicks};
}
function fuel(s,ids,p=0){
 ids.forEach((id,i)=>put(s,p,id,'energy',i,true));
}
function resolveFood(s){
 s=cast(s,toHand(s,0,'AOT-1-100').uid);
 s=pick(s,a=>a.mode==='done');
 if(s.pending?.step==='ready')s=pick(s,a=>a.mode==='skip');
 return s;
}

test('076 through 100 each have one UA23BT printing',()=>{
 for(let n=76;n<=100;n++){
  const id='AOT-1-'+String(n).padStart(3,'0');
  const card=printed(id);
  assert.equal(card.printings.filter(p=>p.number==='UA23BT/'+id).length,1,id);
  assert.equal(pack.cards[id].name,card.nameJa);
  assert.equal(pack.cards[id].energy,card.energy);
  assert.equal(pack.cards[id].ap,card.ap);
  assert.equal(pack.cards[id].bp,card.bp);
  assert.equal(pack.cards[id].trigger||'',card.trigger||'');
 }
});

test('076 may discard the returned energy-1 red Armin, then draws two and discards one',()=>{
 const own=['AOT-1-076','AOT-1-075','AOT-1-077','AOT-1-078'];
 const foe=['AOT-1-009','AOT-1-023'];
 let skipped=toPhase(match(own,foe,76001,'red','blue'),'attack');
 const returned=put(skipped,0,'AOT-1-076','front',0,true);
 const striker=put(skipped,0,'AOT-1-078','front',1,true);
 const cheap=toHand(skipped,0,'AOT-1-075');
 const costly=toHand(skipped,0,'AOT-1-077');
 const other=toHand(skipped,0,'AOT-1-076');
 setLife(skipped,1,['AOT-1-009','AOT-1-023']);
 const deck=skipped.players[0].deck.length;
 skipped=pick(skipped,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 skipped=pick(skipped,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(skipped.pending.trigger,'color');
 skipped=pick(skipped,a=>a.mode==='colorBounce'&&a.uid===returned.uid);
 assert.equal(skipped.pending.step,'armin');
 assert.equal(skipped.players[0].hand.some(c=>c.uid===returned.uid),true);
 const offered=modes(skipped,'discard').map(a=>a.uid);
 assert.equal(offered.includes(returned.uid),true);
 assert.equal(offered.includes(other.uid),true);
 assert.equal(offered.includes(cheap.uid),false);
 assert.equal(offered.includes(costly.uid),false);
 assert.equal(modes(skipped,'skip').length,1);
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,deck);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===returned.uid),true);
 finish(skipped);

 let paid=toPhase(match(own,foe,76002,'red','blue'),'attack');
 const armin=put(paid,0,'AOT-1-076','front',0,true);
 const attacker=put(paid,0,'AOT-1-078','front',1,true);
 const spare=toHand(paid,0,'AOT-1-075');
 setLife(paid,1,['AOT-1-009','AOT-1-023']);
 park(paid,0,[spare.uid]);
 paid=pick(paid,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 paid=pick(paid,a=>a.type==='chooseBlock'&&a.uid==null);
 paid=pick(paid,a=>a.mode==='colorBounce'&&a.uid===armin.uid);
 const before=paid.players[0].deck.length;
 paid=pick(paid,a=>a.mode==='discard'&&a.uid===armin.uid);
 assert.equal(paid.pending.step,'discard');
 assert.equal(modes(paid,'skip').length,0);
 assert.equal(paid.players[0].deck.length,before-2);
 paid=pick(paid,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].outside.some(c=>c.uid===armin.uid),true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(paid.players[0].hand.length,2);
 finish(paid);

 let quiet=toPhase(match(['AOT-1-025','AOT-1-023'],['AOT-1-076','AOT-1-078'],76003,'blue','red'),'main');
 fuel(quiet,['AOT-1-023','AOT-1-023','AOT-1-023','AOT-1-023']);
 readyAp(quiet,0,2);
 const theirs=put(quiet,1,'AOT-1-076','front',0,true);
 quiet=play(quiet,toHand(quiet,0,'AOT-1-025').uid);
 quiet=pick(quiet,a=>a.type==='chooseBounceBp'&&a.uid===theirs.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].hand.some(c=>c.uid===theirs.uid),true);
 finish(quiet);

 let life=toPhase(fresh(['AOT-1-076','AOT-1-078'],76004),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-076','AOT-1-078']);
 const hand=life.players[1].hand.length;
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,hand+1);
 finish(life);
});

test('077 chooses a buff or the next BP range, and the main replays onPlay once from the front',()=>{
 const ids=['AOT-1-077','AOT-1-078','AOT-1-095','AOT-1-090'];
 let alone=toPhase(fresh(ids,76010),'main');
 fuel(alone,['AOT-1-095','AOT-1-095']);
 readyAp(alone,0,1);
 alone=play(alone,toHand(alone,0,'AOT-1-077').uid);
 assert.equal(alone.pending.step,'fork77');
 assert.deepEqual(modes(alone,'range').map(a=>a.mode),['range']);
 assert.equal(modes(alone,'buffMode').length,0);
 assert.equal(modes(alone,'skip').length,0);
 alone=pick(alone,a=>a.mode==='range');
 assert.equal(alone.aotBpRange[0],1000);
 const ranged=alone;
 const cleared=ownMainAgain(ranged);
 assert.equal(cleared.aotBpRange[0],0);
 assert.equal(canActivate(cleared,live(cleared,0,cleared.players[0].front.find(c=>c?.cardId==='AOT-1-077').uid).uid),true);
 finish(cleared);

 let buffed=toPhase(fresh(ids,76011),'main');
 fuel(buffed,['AOT-1-095','AOT-1-090']);
 const ally=put(buffed,0,'AOT-1-078','front',0,true);
 readyAp(buffed,0,1);
 const armin=toHand(buffed,0,'AOT-1-077');
 buffed=play(buffed,armin.uid);
 assert.equal(modes(buffed,'skip').length,0);
 assert.equal(modes(buffed,'buffMode').length,1);
 buffed=pick(buffed,a=>a.mode==='buffMode');
 assert.equal(buffed.pending.step,'buffOne');
 assert.equal(uids(buffed).includes(armin.uid),false);
 assert.equal(uids(buffed).includes(ally.uid),true);
 assert.equal(modes(buffed,'skip').length,1);
 buffed=pick(buffed,a=>a.mode==='buff'&&a.uid===ally.uid);
 assert.equal(bp(buffed,live(buffed,0,ally.uid)),1500);
 assert.equal(buffed.aotBpRange[0],0);
 buffed=activate(buffed,armin.uid);
 buffed=pick(buffed,a=>a.mode==='range');
 assert.equal(buffed.aotBpRange[0],1000);
 assert.equal(canActivate(buffed,armin.uid),false);
 const bench=put(buffed,0,'AOT-1-077','energy',2,true);
 assert.equal(canActivate(buffed,bench.uid),false);
 const later=ownMainAgain(buffed);
 assert.equal(bp(later,live(later,0,ally.uid)),500);
 assert.equal(canActivate(later,armin.uid),true);
 finish(later);
});

test('078 buffs one other character, and 079 has no effect beyond its active trigger',()=>{
 const ids=['AOT-1-078','AOT-1-079','AOT-1-090'];
 let s=toPhase(fresh(ids,76020),'main');
 readyAp(s,0,2);
 const other=put(s,0,'AOT-1-090','front',0,true);
 const krista=toHand(s,0,'AOT-1-078');
 s=play(s,krista.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(uids(s).includes(krista.uid),false);
 assert.equal(uids(s).includes(other.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),true);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(bp(s,live(s,0,other.uid)),1500);
 s=play(s,toHand(s,0,'AOT-1-078').uid);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid);
 assert.equal(bp(s,live(s,0,other.uid)),2500);
 const expired=ownMainAgain(s);
 assert.equal(bp(expired,live(expired,0,other.uid)),1500);
 finish(expired);

 let blank=toPhase(fresh(ids,76021),'main');
 fuel(blank,['AOT-1-090']);
 const connie=toHand(blank,0,'AOT-1-079');
 blank=play(blank,connie.uid);
 assert.equal(blank.pending,null);
 assert.equal(live(blank,0,connie.uid).ready,false);
 assert.equal(bp(blank,live(blank,0,connie.uid)),2500);
 finish(blank);

 let life=toPhase(fresh(ids,76022),'attack');
 const hitter=put(life,0,'AOT-1-090','front',0,true);
 const rested=put(life,1,'AOT-1-078','front',0,false);
 setLife(life,1,['AOT-1-079','AOT-1-090']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'active');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='skip'),true);
 life=pick(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(live(life,1,rested.uid).ready,true);
 assert.equal(bp(life,live(life,1,rested.uid)),3500);
 finish(life);
});

test('080 looks at seven privately, publishes only a taken food card, and discards only then',()=>{
 const ids=['AOT-1-080','AOT-1-100','AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085','AOT-1-086','AOT-1-087','AOT-1-090'];
 let none=toPhase(fresh(ids,76030),'main');
 fuel(none,['AOT-1-090']);
 const window=crown(none,0,['AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085','AOT-1-086','AOT-1-087','AOT-1-100']);
 const spare=toHand(none,0,'AOT-1-090');
 none=play(none,toHand(none,0,'AOT-1-080').uid);
 assert.equal(none.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(none.pending.uids,window.map(c=>c.uid));
 assert.deepEqual(none.pending.choices,[window[6].uid]);
 assert.equal(universalPrivateChoices(packs,none,0).inspected.length,7);
 assert.equal(universalPrivateChoices(packs,none,1),null);
 assert.equal(window.every(c=>revealed(none,c.uid)),false);
 none=pick(none,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 const ordered=orderBottom(none);
 none=ordered.s;
 assert.equal(none.pending,null);
 assert.equal(none.players[0].deck.at(-1).uid,ordered.order.at(-1));
 assert.equal(none.players[0].deck.at(-7).uid,ordered.order[0]);
 assert.equal(none.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(window.every(c=>revealed(none,c.uid)),false);
 finish(none);

 let taken=toPhase(fresh(ids,76031),'main');
 fuel(taken,['AOT-1-090']);
 const cards=crown(taken,0,['AOT-1-100','AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085','AOT-1-086','AOT-1-087']);
 const dump=toHand(taken,0,'AOT-1-078');
 taken=play(taken,toHand(taken,0,'AOT-1-080').uid);
 taken=pick(taken,a=>a.type==='chooseTopFiltered'&&a.uid===cards[0].uid);
 assert.equal(taken.publicReveals.filter(r=>r.kind==='searched-to-hand').map(r=>r.uid).join(),cards[0].uid);
 assert.equal(revealed(taken,cards[1].uid),false);
 taken=orderBottom(taken).s;
 assert.equal(taken.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,taken).some(a=>a.uid===null),false);
 taken=pick(taken,a=>a.type==='chooseDiscard'&&a.uid===dump.uid);
 assert.equal(taken.players[0].hand.some(c=>c.uid===cards[0].uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===dump.uid),true);
 finish(taken);
});

test('081 gains BP and impact only on the turn its controller used a food card',()=>{
 const ids=['AOT-1-081','AOT-1-100','AOT-1-095','AOT-1-090','AOT-1-080','AOT-1-078'];
 let s=toPhase(fresh(ids,76040),'main');
 fuel(s,['AOT-1-095','AOT-1-090']);
 const sasha=put(s,0,'AOT-1-081','front',0,true);
 assert.equal(bp(s,sasha),3500);
 assert.equal(universalImpact(packs,s,sasha),0);
 readyAp(s,0,1);
 s=resolveFood(s);
 assert.equal(bp(s,live(s,0,sasha.uid)),4000);
 assert.equal(universalImpact(packs,s,live(s,0,sasha.uid)),1);
 const foe=toActiveMain(s,1);
 assert.equal(bp(foe,live(foe,0,sasha.uid)),3500);
 assert.equal(universalImpact(packs,foe,live(foe,0,sasha.uid)),0);
 const again=ownMainAgain(foe);
 assert.equal(bp(again,live(again,0,sasha.uid)),3500);
 assert.equal(universalImpact(packs,again,live(again,0,sasha.uid)),0);
 finish(again);

 let battle=toPhase(fresh(ids,76041),'main');
 fuel(battle,['AOT-1-095','AOT-1-090']);
 const hunter=put(battle,0,'AOT-1-081','front',0,true);
 readyAp(battle,0,1);
 battle=resolveFood(battle);
 const wall=put(battle,1,'AOT-1-078','front',0,true);
 setLife(battle,1,['AOT-1-080','AOT-1-080']);
 battle=toPhase(battle,'attack');
 battle=pick(battle,a=>a.type==='attack'&&a.uid===hunter.uid&&!a.targetUid);
 battle=pick(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].life.length,1);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 finish(battle);

 let theirs=toPhase(fresh(ids,76042),'main');
 const ours=put(theirs,0,'AOT-1-081','front',0,true);
 fuel(theirs,['AOT-1-095','AOT-1-090'],1);
 readyAp(theirs,1,1);
 theirs=toActiveMain(theirs,1);
 theirs=cast(theirs,toHand(theirs,1,'AOT-1-100').uid);
 theirs=pick(theirs,a=>a.mode==='done');
 if(theirs.pending?.step==='ready')theirs=pick(theirs,a=>a.mode==='skip');
 assert.equal(bp(theirs,live(theirs,0,ours.uid)),3500);
 assert.equal(universalImpact(packs,theirs,live(theirs,0,ours.uid)),0);
 finish(theirs);
});

test('082 may buff one corps including itself, and readies only when food was already used',()=>{
 const ids=['AOT-1-082','AOT-1-100','AOT-1-095','AOT-1-090','AOT-1-078'];
 let fed=toPhase(fresh(ids,76050),'main');
 fuel(fed,['AOT-1-095','AOT-1-090','AOT-1-090']);
 const ally=put(fed,0,'AOT-1-078','front',0,true);
 readyAp(fed,0,2);
 fed=resolveFood(fed);
 const sasha=toHand(fed,0,'AOT-1-082');
 fed=play(fed,sasha.uid);
 assert.equal(fed.pending.kind,'effect-buff-own');
 assert.equal(uids(fed).includes(sasha.uid),true);
 assert.equal(uids(fed).includes(ally.uid),true);
 assert.equal(live(fed,0,sasha.uid).ready,false);
 fed=pick(fed,a=>a.type==='chooseOwnBuff'&&a.uid===sasha.uid);
 assert.equal(bp(fed,live(fed,0,sasha.uid)),4000);
 assert.equal(live(fed,0,sasha.uid).ready,true);
 assert.equal(bp(fed,live(fed,0,ally.uid)),500);
 const faded=ownMainAgain(fed);
 assert.equal(bp(faded,live(faded,0,sasha.uid)),3000);
 finish(faded);

 let plain=toPhase(fresh(ids,76051),'main');
 fuel(plain,['AOT-1-095']);
 readyAp(plain,0,1);
 const rested=toHand(plain,0,'AOT-1-082');
 plain=play(plain,rested.uid);
 plain=pick(plain,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(live(plain,0,rested.uid).ready,false);
 finish(plain);
});

test('083 only draws from life, and 084 rests to buff exactly one other character',()=>{
 const ids=['AOT-1-083','AOT-1-084','AOT-1-078','AOT-1-090'];
 let blank=toPhase(fresh(ids,76060),'main');
 const jean=toHand(blank,0,'AOT-1-083');
 blank=play(blank,jean.uid);
 assert.equal(blank.pending,null);
 assert.equal(live(blank,0,jean.uid).ready,false);
 assert.equal(bp(blank,live(blank,0,jean.uid)),2000);
 finish(blank);

 let drawn=toPhase(fresh(ids,76061),'attack');
 const hitter=put(drawn,0,'AOT-1-078','front',0,true);
 setLife(drawn,1,['AOT-1-083','AOT-1-078']);
 const hand=drawn.players[1].hand.length;
 drawn=pick(drawn,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 drawn=pick(drawn,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(drawn.pending.trigger,'draw');
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].hand.length,hand+1);
 finish(drawn);

 let lone=toPhase(fresh(ids,76062),'main');
 const only=put(lone,0,'AOT-1-084','front',0,true);
 assert.equal(canActivate(lone,only.uid),false);
 finish(lone);

 let s=toPhase(fresh(ids,76063),'main');
 const actor=put(s,0,'AOT-1-084','energy',0,true);
 const ally=put(s,0,'AOT-1-078','front',0,true);
 s=activate(s,actor.uid);
 assert.equal(live(s,0,actor.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.equal(uids(s).includes(actor.uid),false);
 assert.equal(uids(s).includes(ally.uid),true);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(bp(s,live(s,0,ally.uid)),1500);
 live(s,0,actor.uid).ready=true;
 s=activate(s,actor.uid);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(bp(s,live(s,0,ally.uid)),2500);
 const later=ownMainAgain(s);
 assert.equal(bp(later,live(later,0,ally.uid)),500);
 finish(later);
});

test('085 has no effect, and its active trigger can be skipped',()=>{
 let s=toPhase(fresh(['AOT-1-085','AOT-1-078'],76070),'main');
 const mikasa=toHand(s,0,'AOT-1-085');
 s=play(s,mikasa.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,live(s,0,mikasa.uid)),2000);
 finish(s);

 let life=toPhase(fresh(['AOT-1-085','AOT-1-078'],76071),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 const rested=put(life,1,'AOT-1-078','front',0,false);
 setLife(life,1,['AOT-1-085','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 life=pick(life,a=>a.mode==='skip');
 assert.equal(live(life,1,rested.uid).ready,false);
 finish(life);
});

test('086 and 087 use the printed corps count and the active energy bonus',()=>{
 const ids=['AOT-1-086','AOT-1-087','AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085','AOT-1-090'];
 let short=toPhase(fresh(ids,76080),'main');
 const self=put(short,0,'AOT-1-086','front',0,true);
 put(short,0,'AOT-1-078','front',1,true);
 put(short,0,'AOT-1-079','front',2,true);
 put(short,0,'AOT-1-083','front',3,true);
 put(short,0,'AOT-1-085','energy',0,true);
 assert.equal(bp(short,self),3000);
 put(short,0,'AOT-1-090','energy',1,true);
 assert.equal(bp(short,live(short,0,self.uid)),4000);
 const foe=toActiveMain(short,1);
 assert.equal(bp(foe,live(foe,0,self.uid)),3000);
 finish(foe);

 let energy=toPhase(fresh(ids,76081),'main');
 const active=put(energy,0,'AOT-1-087','energy',0,true);
 assert.equal(cardEnergy(energy,0,active),2);
 assert.equal(pool(energy).red,2);
 active.ready=false;
 assert.equal(cardEnergy(energy,0,active),1);
 assert.equal(pool(energy).red,1);
 const front=put(energy,0,'AOT-1-087','front',0,true);
 assert.equal(cardEnergy(energy,0,front),0);
 finish(energy);

 let life=toPhase(fresh(['AOT-1-086','AOT-1-087','AOT-1-080','AOT-1-078'],76082),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-086','AOT-1-080']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].life.length,1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='AOT-1-086'),true);
 setLife(life,1,['AOT-1-087','AOT-1-080']);
 const again=put(life,0,'AOT-1-078','front',1,true);
 life=pick(life,a=>a.type==='attack'&&a.uid===again.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].life.length,1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='AOT-1-087'),true);
 finish(life);
});

test('088 may discard instead of bouncing on its own turn, and the corps bonus is 500',()=>{
 const own=['AOT-1-088','AOT-1-078','AOT-1-090'];
 const foe=['AOT-1-009','AOT-1-023'];
 let kept=toPhase(match(own,foe,76090,'red','blue'),'attack');
 const mikasa=put(kept,0,'AOT-1-088','front',0,true);
 const striker=put(kept,0,'AOT-1-078','front',1,true);
 const spare=toHand(kept,0,'AOT-1-090');
 park(kept,0,[spare.uid]);
 setLife(kept,1,['AOT-1-009','AOT-1-023']);
 kept=pick(kept,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 kept=pick(kept,a=>a.type==='chooseBlock'&&a.uid==null);
 kept=pick(kept,a=>a.mode==='colorBounce'&&a.uid===mikasa.uid);
 assert.equal(kept.pending.step,'bounceInstead');
 assert.equal(modes(kept,'skip').length,1);
 assert.equal(uids(kept).includes(spare.uid),true);
 kept=pick(kept,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(kept.pending,null);
 assert.equal(live(kept,0,mikasa.uid)?.cardId,'AOT-1-088');
 assert.equal(kept.players[0].outside.some(c=>c.uid===spare.uid),true);
 finish(kept);

 let bounced=toPhase(match(own,foe,76091,'red','blue'),'attack');
 const leaving=put(bounced,0,'AOT-1-088','front',0,true);
 const attacker=put(bounced,0,'AOT-1-078','front',1,true);
 const held=toHand(bounced,0,'AOT-1-090');
 park(bounced,0,[held.uid]);
 setLife(bounced,1,['AOT-1-009','AOT-1-023']);
 bounced=pick(bounced,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 bounced=pick(bounced,a=>a.type==='chooseBlock'&&a.uid==null);
 bounced=pick(bounced,a=>a.mode==='colorBounce'&&a.uid===leaving.uid);
 bounced=pick(bounced,a=>a.mode==='skip');
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===leaving.uid),true);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===held.uid),true);
 finish(bounced);

 let empty=toPhase(match(own,foe,76092,'red','blue'),'attack');
 const bare=put(empty,0,'AOT-1-088','front',0,true);
 const swinger=put(empty,0,'AOT-1-078','front',1,true);
 park(empty,0,[]);
 setLife(empty,1,['AOT-1-009','AOT-1-023']);
 empty=pick(empty,a=>a.type==='attack'&&a.uid===swinger.uid&&!a.targetUid);
 empty=pick(empty,a=>a.type==='chooseBlock'&&a.uid==null);
 empty=pick(empty,a=>a.mode==='colorBounce'&&a.uid===bare.uid);
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].hand.some(c=>c.uid===bare.uid),true);
 finish(empty);

 let opp=toPhase(match(['AOT-1-025','AOT-1-023'],['AOT-1-088','AOT-1-078'],76093,'blue','red'),'main');
 fuel(opp,['AOT-1-023','AOT-1-023','AOT-1-023','AOT-1-023']);
 readyAp(opp,0,2);
 const target=put(opp,1,'AOT-1-088','front',0,true);
 toHand(opp,1,'AOT-1-078');
 opp=play(opp,toHand(opp,0,'AOT-1-025').uid);
 assert.equal(opp.pending.kind,'effect-bounce-bp');
 opp=pick(opp,a=>a.type==='chooseBounceBp'&&a.uid===target.uid);
 assert.equal(opp.pending,null);
 assert.equal(opp.players[1].hand.some(c=>c.uid===target.uid),true);
 finish(opp);

 const corps=['AOT-1-088','AOT-1-078','AOT-1-079','AOT-1-083','AOT-1-085','AOT-1-090','AOT-1-080'];
 let few=toPhase(fresh(corps,76094),'main');
 const card=put(few,0,'AOT-1-088','front',0,true);
 put(few,0,'AOT-1-078','front',1,true);
 put(few,0,'AOT-1-079','front',2,true);
 put(few,0,'AOT-1-083','front',3,true);
 put(few,0,'AOT-1-085','energy',0,true);
 assert.equal(bp(few,card),3500);
 put(few,0,'AOT-1-090','energy',1,true);
 assert.equal(bp(few,live(few,0,card.uid)),4000);
 const turned=toActiveMain(few,1);
 assert.equal(bp(turned,live(turned,0,card.uid)),3500);
 finish(turned);

 let color=toPhase(fresh(['AOT-1-088','AOT-1-079','AOT-1-086','AOT-1-078','AOT-1-080'],76095),'attack');
 const hitter=put(color,0,'AOT-1-086','front',0,true);
 const legal=put(color,0,'AOT-1-079','front',1,true);
 setLife(color,1,['AOT-1-088','AOT-1-080']);
 color=pick(color,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 color=pick(color,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(color.pending.trigger,'color');
 const targets=legalUniversalActions(packs,color).filter(a=>a.mode==='colorRetire').map(a=>a.uid);
 assert.equal(targets.includes(legal.uid),true);
 assert.equal(targets.includes(hitter.uid),false);
 assert.equal(legalUniversalActions(packs,color).some(a=>a.mode==='skip'),true);
 color=pick(color,a=>a.mode==='colorRetire'&&a.uid===legal.uid);
 assert.equal(color.players[0].outside.some(c=>c.uid===legal.uid),true);
 finish(color);
});

test('089 retires only while raided and only when another Eren is on the field',()=>{
 const ids=['AOT-1-089','AOT-1-085','AOT-1-090','AOT-1-071','AOT-1-088','AOT-1-092','AOT-1-095','AOT-1-078'];
 let played=toPhase(fresh(ids,76100),'main');
 fuel(played,['AOT-1-095','AOT-1-090']);
 put(played,0,'AOT-1-090','front',0,true);
 const victim=put(played,1,'AOT-1-088','front',0,true);
 readyAp(played,0,1);
 played=play(played,toHand(played,0,'AOT-1-089').uid);
 assert.equal(played.pending,null);
 assert.equal(live(played,1,victim.uid)?.cardId,'AOT-1-088');
 assert.equal(live(played,0,played.players[0].front.find(c=>c?.cardId==='AOT-1-089').uid).ready,false);
 finish(played);

 let quiet=toPhase(fresh(ids,76101),'main');
 fuel(quiet,['AOT-1-095','AOT-1-078']);
 const base=put(quiet,0,'AOT-1-085','front',0,true);
 put(quiet,0,'AOT-1-071','front',1,true);
 const wall=put(quiet,1,'AOT-1-088','front',0,true);
 readyAp(quiet,0,1);
 quiet=raidOnto(quiet,toHand(quiet,0,'AOT-1-089').uid,base.uid);
 assert.equal(quiet.pending,null);
 assert.equal(live(quiet,0,quiet.players[0].front.find(c=>c?.cardId==='AOT-1-089').uid).ready,true);
 assert.equal(live(quiet,1,wall.uid)?.cardId,'AOT-1-088');
 finish(quiet);

 let s=toPhase(fresh(ids,76102),'main');
 fuel(s,['AOT-1-095','AOT-1-090']);
 const mikasa=put(s,0,'AOT-1-085','front',0,true);
 put(s,0,'AOT-1-090','energy',2,true);
 const low=put(s,1,'AOT-1-088','front',0,true);
 const high=put(s,1,'AOT-1-092','front',1,true);
 const bench=put(s,1,'AOT-1-078','energy',0,true);
 readyAp(s,0,1);
 s=raidOnto(s,toHand(s,0,'AOT-1-089').uid,mikasa.uid);
 assert.equal(s.pending.step,'retire');
 assert.equal(uids(s).includes(low.uid),true);
 assert.equal(uids(s).includes(high.uid),false);
 assert.equal(uids(s).includes(bench.uid),false);
 assert.equal(modes(s,'skip').length,1);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(live(s,1,low.uid)?.cardId,'AOT-1-088');
 finish(s);

 let retired=toPhase(fresh(ids,76103),'main');
 fuel(retired,['AOT-1-095','AOT-1-090']);
 const host=put(retired,0,'AOT-1-085','front',0,true);
 const foe=put(retired,1,'AOT-1-088','front',0,true);
 readyAp(retired,0,1);
 retired=raidOnto(retired,toHand(retired,0,'AOT-1-089').uid,host.uid);
 retired=pick(retired,a=>a.mode==='retire'&&a.uid===foe.uid);
 assert.equal(retired.players[1].outside.some(c=>c.uid===foe.uid),true);
 finish(retired);

 let life=toPhase(fresh(['AOT-1-089','AOT-1-085','AOT-1-078','AOT-1-090'],76104),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 fuel(life,['AOT-1-090','AOT-1-090','AOT-1-090','AOT-1-090'],1);
 const home=put(life,1,'AOT-1-085','front',0,true);
 setLife(life,1,['AOT-1-089','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='get'),true);
 life=pick(life,a=>a.mode==='raid'&&a.baseUid===home.uid);
 assert.equal(life.players[1].front.some(c=>c?.cardId==='AOT-1-089'&&c.stack?.[0]?.uid===home.uid),true);
 finish(life);
});

test('090 has no effect and its get trigger adds it to hand',()=>{
 let s=toPhase(fresh(['AOT-1-090','AOT-1-078'],76110),'main');
 const eren=toHand(s,0,'AOT-1-090');
 s=play(s,eren.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,live(s,0,eren.uid)),1500);
 finish(s);

 let life=toPhase(fresh(['AOT-1-090','AOT-1-078'],76111),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-090','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'get');
 const uid=life.pending.uid;
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===uid),true);
 finish(life);
});

test('091 steps from the front and adds one life to hand before gaining BP',()=>{
 const ids=['AOT-1-091','AOT-1-099','AOT-1-078','AOT-1-090'];
 let moved=toPhase(fresh(ids,76120),'move');
 const eren=put(moved,0,'AOT-1-091','front',0,true);
 assert.equal(legalUniversalActions(packs,moved).some(a=>a.type==='step'&&a.uid===eren.uid),true);
 moved=pick(moved,a=>a.type==='step'&&a.uid===eren.uid);
 assert.equal(live(moved,0,eren.uid)&&moved.players[0].energy.some(c=>c?.uid===eren.uid),true);
 assert.equal(legalUniversalActions(packs,moved).some(a=>a.type==='step'&&a.uid===eren.uid),false);
 finish(moved);

 let none=toPhase(fresh(ids,76121),'main');
 const empty=put(none,0,'AOT-1-091','front',0,true);
 setLife(none,0,[]);
 assert.equal(canActivate(none,empty.uid),false);
 const line=put(none,0,'AOT-1-091','energy',0,true);
 setLife(none,0,['AOT-1-078']);
 assert.equal(canActivate(none,line.uid),false);
 assert.equal(canActivate(none,empty.uid),true);
 finish(none);

 let s=toPhase(fresh(ids,76122),'main');
 const actor=put(s,0,'AOT-1-091','front',0,true);
 const secret=setLife(s,0,['AOT-1-099','AOT-1-078'])[0];
 const foe=put(s,1,'AOT-1-078','front',0,true);
 s=activate(s,actor.uid);
 assert.equal(s.pending.step,'lifeHand');
 assert.equal(modes(s,'skip').length,0);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=pick(s,a=>a.mode==='life'&&a.uid===secret.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===secret.uid),true);
 assert.equal(revealed(s,secret.uid),false);
 assert.equal(s.players[1].front.some(c=>c?.uid===foe.uid),true);
 assert.equal(bp(s,live(s,0,actor.uid)),4000);
 assert.equal(canActivate(s,actor.uid),false);
 const later=ownMainAgain(s);
 assert.equal(bp(later,live(later,0,actor.uid)),3000);
 assert.equal(canActivate(later,actor.uid),true);
 finish(later);
});

test('092 impact and the attack deploy exist only while it is face-up raided',()=>{
 const ids=['AOT-1-092','AOT-1-090','AOT-1-095','AOT-1-078','AOT-1-085','AOT-1-077','AOT-1-080'];
 let plain=toPhase(fresh(ids,76130),'main');
 fuel(plain,['AOT-1-095','AOT-1-090']);
 readyAp(plain,0,1);
 const played=toHand(plain,0,'AOT-1-092');
 plain=play(plain,played.uid);
 assert.equal(plain.pending,null);
 assert.equal(universalImpact(packs,plain,live(plain,0,played.uid)),0);
 live(plain,0,played.uid).ready=true;
 plain=toPhase(plain,'attack');
 plain=pick(plain,a=>a.type==='attack'&&a.uid===played.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 finish(plain);

 let raid=toPhase(fresh(ids,76131),'main');
 fuel(raid,['AOT-1-095','AOT-1-090']);
 const host=put(raid,0,'AOT-1-090','front',0,true);
 const side=put(raid,0,'AOT-1-078','energy',2,true);
 readyAp(raid,0,1);
 const eren=toHand(raid,0,'AOT-1-092');
 raid=raidOnto(raid,eren.uid,host.uid);
 assert.equal(universalImpact(packs,raid,live(raid,0,eren.uid)),1);
 const recruit=toHand(raid,0,'AOT-1-085');
 const ineligible=toHand(raid,0,'AOT-1-077');
 raid=toPhase(raid,'attack');
 raid=pick(raid,a=>a.type==='attack'&&a.uid===eren.uid&&!a.targetUid);
 assert.equal(raid.pending.step,'tuck92');
 assert.equal(uids(raid).includes(eren.uid),false);
 assert.equal(uids(raid).includes(side.uid),false);
 assert.equal(modes(raid,'skip').length,1);
 raid=pick(raid,a=>a.mode==='skip');
 assert.equal(raid.pending.step,'corps');
 assert.equal(uids(raid).includes(recruit.uid),true);
 assert.equal(uids(raid).includes(ineligible.uid),false);
 assert.equal(modes(raid,'done').length,1);
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(raid.pending.kind,'block');
 finish(raid);

 let full=toPhase(fresh(ids,76132),'main');
 fuel(full,['AOT-1-095','AOT-1-090']);
 const base=put(full,0,'AOT-1-090','front',0,true);
 const a=put(full,0,'AOT-1-078','front',1,true);
 put(full,0,'AOT-1-078','front',2,true);
 put(full,0,'AOT-1-078','front',3,true);
 readyAp(full,0,1);
 const top=toHand(full,0,'AOT-1-092');
 const extra=toHand(full,0,'AOT-1-085');
 full=raidOnto(full,top.uid,base.uid);
 full=toPhase(full,'attack');
 full=pick(full,a=>a.type==='attack'&&a.uid===top.uid&&!a.targetUid);
 assert.equal(uids(full).includes(a.uid),true);
 full=pick(full,a=>a.mode==='tuck'&&a.uid===a.uid);
 assert.equal(full.players[0].deck[0].uid,a.uid);
 assert.equal(full.pending.step,'corps');
 full=pick(full,a=>a.uid===extra.uid&&a.line==='front');
 assert.equal(live(full,0,extra.uid).ready,true);
 assert.equal(live(full,0,extra.uid).aotReturnHandAtAttackEnd.turn,full.turn);
 setLife(full,1,['AOT-1-080','AOT-1-080','AOT-1-080']);
 park(full,0,[extra.uid]);
 full=pick(full,a=>a.type==='chooseBlock'&&a.uid==null);
 const started=full.turn;
 full=advance(full,x=>x.turn>started,'after attack');
 assert.equal(full.players[0].hand.some(c=>c.uid===extra.uid),true);
 finish(full);

 let impact=toPhase(fresh(ids,76133),'main');
 fuel(impact,['AOT-1-095','AOT-1-090']);
 const home=put(impact,0,'AOT-1-090','front',0,true);
 readyAp(impact,0,1);
 const raider=toHand(impact,0,'AOT-1-092');
 impact=raidOnto(impact,raider.uid,home.uid);
 const wall=put(impact,1,'AOT-1-078','front',0,true);
 setLife(impact,1,['AOT-1-080','AOT-1-080']);
 impact=toPhase(impact,'attack');
 impact=pick(impact,a=>a.type==='attack'&&a.uid===raider.uid&&!a.targetUid);
 impact=pick(impact,a=>a.mode==='skip');
 impact=pick(impact,a=>a.mode==='done');
 impact=pick(impact,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(impact.players[1].life.length,1);
 assert.equal(impact.players[1].outside.some(c=>c.uid===wall.uid),true);
 finish(impact);
});

test('093 damage, own-turn BP, and the attack choice exist only while raided',()=>{
 const ids=['AOT-1-093','AOT-1-090','AOT-1-095','AOT-1-083','AOT-1-079','AOT-1-080','AOT-1-078'];
 let plain=toPhase(fresh(ids,76140),'main');
 fuel(plain,['AOT-1-095','AOT-1-095']);
 readyAp(plain,0,1);
 const played=toHand(plain,0,'AOT-1-093');
 plain=play(plain,played.uid);
 assert.equal(plain.pending,null);
 assert.equal(bp(plain,live(plain,0,played.uid)),4000);
 assert.equal(universalAttackDamage(packs,plain,live(plain,0,played.uid)),1);
 live(plain,0,played.uid).ready=true;
 plain=toPhase(plain,'attack');
 plain=pick(plain,a=>a.type==='attack'&&a.uid===played.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 finish(plain);

 let s=toPhase(fresh(ids,76141),'main');
 fuel(s,['AOT-1-095','AOT-1-095']);
 const host=put(s,0,'AOT-1-090','front',0,true);
 readyAp(s,0,1);
 const titan=toHand(s,0,'AOT-1-093');
 s=raidOnto(s,titan.uid,host.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,live(s,0,titan.uid)),5000);
 assert.equal(universalAttackDamage(packs,s,live(s,0,titan.uid)),2);
 const away=toActiveMain(s,1);
 assert.equal(bp(away,live(away,0,titan.uid)),4000);
 let back=toPhase(ownMainAgain(away),'attack');
 setLife(back,0,['AOT-1-080','AOT-1-080','AOT-1-080']);
 const legal=put(back,1,'AOT-1-083','front',0,true);
 const over=put(back,1,'AOT-1-079','front',1,true);
 const bench=put(back,1,'AOT-1-078','energy',0,true);
 park(back,0,[]);
 const one=toHand(back,0,'AOT-1-078');
 const two=toHand(back,0,'AOT-1-090');
 const three=toHand(back,0,'AOT-1-080');
 const deck=back.players[0].deck.length;
 back=pick(back,a=>a.type==='attack'&&a.uid===titan.uid&&!a.targetUid);
 assert.equal(back.pending.step,'fork93');
 assert.equal(modes(back,'skip').length,0);
 assert.equal(modes(back,'draw').length,1);
 assert.equal(modes(back,'discard2').length,1);
 back=pick(back,a=>a.mode==='discard2');
 assert.equal(back.pending.step,'discard');
 assert.equal(modes(back,'skip').length,1);
 back=pick(back,a=>a.mode==='skip');
 assert.equal(back.players[0].deck.length,deck);
 assert.equal(back.players[0].hand.some(c=>c.uid===one.uid),true);
 assert.equal(live(back,1,legal.uid)?.cardId,'AOT-1-083');
 assert.equal(back.pending.kind,'block');
 finish(back);

 let paid=toPhase(fresh(ids,76142),'main');
 fuel(paid,['AOT-1-095','AOT-1-095']);
 const base=put(paid,0,'AOT-1-090','front',0,true);
 readyAp(paid,0,1);
 const body=toHand(paid,0,'AOT-1-093');
 paid=raidOnto(paid,body.uid,base.uid);
 paid=toPhase(paid,'attack');
 setLife(paid,0,['AOT-1-080','AOT-1-080','AOT-1-080']);
 const small=put(paid,1,'AOT-1-083','front',0,true);
 const big=put(paid,1,'AOT-1-079','front',1,true);
 const energy=put(paid,1,'AOT-1-078','energy',0,true);
 park(paid,0,[]);
 const payA=toHand(paid,0,'AOT-1-078');
 const payB=toHand(paid,0,'AOT-1-090');
 const stay=toHand(paid,0,'AOT-1-080');
 setLife(paid,1,['AOT-1-080','AOT-1-080','AOT-1-080']);
 paid=pick(paid,a=>a.type==='attack'&&a.uid===body.uid&&!a.targetUid);
 paid=pick(paid,a=>a.mode==='discard2');
 paid=pick(paid,a=>a.mode==='discard'&&a.uid===payA.uid);
 assert.equal(paid.pending.step,'discard');
 assert.equal(modes(paid,'skip').length,0);
 paid=pick(paid,a=>a.mode==='discard'&&a.uid===payB.uid);
 assert.equal(paid.pending.step,'retire');
 assert.equal(uids(paid).includes(small.uid),true);
 assert.equal(uids(paid).includes(big.uid),false);
 assert.equal(uids(paid).includes(energy.uid),false);
 assert.equal(modes(paid,'skip').length,1);
 assert.equal(paid.players[0].hand.some(c=>c.uid===stay.uid),true);
 paid=pick(paid,a=>a.mode==='retire'&&a.uid===small.uid);
 assert.equal(paid.players[1].outside.some(c=>c.uid===small.uid),true);
 paid=pick(paid,a=>a.type==='chooseBlock'&&a.uid==null);
 paid=lifeOrder(paid);
 assert.equal(paid.players[1].life.length,1);
 finish(paid);

 let high=toPhase(fresh(ids,76143),'main');
 fuel(high,['AOT-1-095','AOT-1-095']);
 const stand=put(high,0,'AOT-1-090','front',0,true);
 readyAp(high,0,1);
 const copy=toHand(high,0,'AOT-1-093');
 high=raidOnto(high,copy.uid,stand.uid);
 high=toPhase(high,'attack');
 setLife(high,0,['AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-080']);
 const before=high.players[0].deck.length;
 high=pick(high,a=>a.type==='attack'&&a.uid===copy.uid&&!a.targetUid);
 assert.equal(modes(high,'discard2').length,0);
 high=pick(high,a=>a.mode==='draw');
 assert.equal(high.players[0].deck.length,before-1);
 assert.equal(high.pending.kind,'block');
 finish(high);

 let life=toPhase(fresh(['AOT-1-093','AOT-1-078'],76144),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-093','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'get');
 const uid=life.pending.uid;
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===uid),true);
 finish(life);
});

test('094 damage, main, and once-per-turn attack choice exist only while raided on the printed line',()=>{
 const ids=['AOT-1-094','AOT-1-090','AOT-1-095','AOT-1-083','AOT-1-086','AOT-1-080','AOT-1-078'];
 let plain=toPhase(fresh(ids,76150),'main');
 fuel(plain,['AOT-1-095','AOT-1-095','AOT-1-090','AOT-1-090']);
 readyAp(plain,0,1);
 const played=toHand(plain,0,'AOT-1-094');
 plain=play(plain,played.uid);
 assert.equal(canActivate(plain,played.uid),false);
 assert.equal(universalAttackDamage(packs,plain,live(plain,0,played.uid)),1);
 live(plain,0,played.uid).ready=true;
 plain=toPhase(plain,'attack');
 plain=pick(plain,a=>a.type==='attack'&&a.uid===played.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 finish(plain);

 let s=toPhase(fresh(ids,76151),'main');
 fuel(s,['AOT-1-095','AOT-1-095','AOT-1-090','AOT-1-090']);
 const host=put(s,0,'AOT-1-090','front',0,true);
 readyAp(s,0,1);
 const titan=toHand(s,0,'AOT-1-094');
 s=raidOnto(s,titan.uid,host.uid);
 assert.equal(universalAttackDamage(packs,s,live(s,0,titan.uid)),2);
 const low=put(s,1,'AOT-1-083','front',0,true);
 const high=put(s,1,'AOT-1-086','front',1,true);
 s=activate(s,titan.uid);
 assert.equal(s.pending.step,'retire');
 assert.equal(uids(s).includes(low.uid),true);
 assert.equal(uids(s).includes(high.uid),false);
 assert.equal(modes(s,'skip').length,1);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(canActivate(s,titan.uid),false);
 assert.equal(live(s,1,low.uid)?.cardId,'AOT-1-083');
 let later=ownMainAgain(s);
 assert.equal(canActivate(later,titan.uid),true);
 later=activate(later,titan.uid);
 later=pick(later,a=>a.mode==='retire'&&a.uid===low.uid);
 assert.equal(later.players[1].outside.some(c=>c.uid===low.uid),true);
 finish(later);

 let energy=toPhase(fresh(ids,76152),'main');
 fuel(energy,['AOT-1-095','AOT-1-095','AOT-1-090']);
 const bench=put(energy,0,'AOT-1-090','energy',3,true);
 readyAp(energy,0,1);
 energy=raidOnto(energy,toHand(energy,0,'AOT-1-094').uid,bench.uid,'energy');
 const stayed=energy.players[0].energy.find(c=>c?.cardId==='AOT-1-094');
 assert.equal(canActivate(energy,stayed.uid),false);
 assert.equal(universalAttackDamage(packs,energy,stayed),2);
 finish(energy);

 let once=toPhase(fresh(ids,76153),'main');
 fuel(once,['AOT-1-095','AOT-1-095','AOT-1-090','AOT-1-090']);
 const home=put(once,0,'AOT-1-090','front',0,true);
 readyAp(once,0,1);
 const body=toHand(once,0,'AOT-1-094');
 once=raidOnto(once,body.uid,home.uid);
 once=toPhase(once,'attack');
 setLife(once,0,['AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-080']);
 setLife(once,1,['AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-086']);
 once=pick(once,a=>a.type==='attack'&&a.uid===body.uid&&!a.targetUid);
 assert.equal(once.pending.step,'fork94');
 assert.equal(modes(once,'skip').length,0);
 assert.equal(modes(once,'ready').length,0);
 once=pick(once,a=>a.mode==='impact');
 assert.equal(universalImpact(packs,once,live(once,0,body.uid)),1);
 once=pick(once,a=>a.type==='chooseBlock'&&a.uid==null);
 once=lifeOrder(once);
 assert.equal(once.players[1].life.length,3);
 live(once,0,body.uid).ready=true;
 once=pick(once,a=>a.type==='attack'&&a.uid===body.uid&&!a.targetUid);
 assert.equal(once.pending.kind,'block');
 once=pick(once,a=>a.type==='chooseBlock'&&a.uid==null);
 once=lifeOrder(once);
 const next=ownMainAgain(once);
 assert.equal(universalImpact(packs,next,live(next,0,body.uid)),0);
 finish(next);

 let ready=toPhase(fresh(ids,76154),'main');
 fuel(ready,['AOT-1-095','AOT-1-095','AOT-1-090','AOT-1-090']);
 const stand=put(ready,0,'AOT-1-090','front',0,true);
 readyAp(ready,0,1);
 const copy=toHand(ready,0,'AOT-1-094');
 ready=raidOnto(ready,copy.uid,stand.uid);
 ready=toPhase(ready,'attack');
 setLife(ready,0,['AOT-1-080','AOT-1-080','AOT-1-080']);
 setLife(ready,1,['AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-080','AOT-1-086']);
 ready=pick(ready,a=>a.type==='attack'&&a.uid===copy.uid&&!a.targetUid);
 assert.equal(modes(ready,'ready').length,1);
 ready=pick(ready,a=>a.mode==='ready');
 assert.equal(universalImpact(packs,ready,live(ready,0,copy.uid)),0);
 assert.equal(live(ready,0,copy.uid).ready,true);
 finish(ready);

 let life=toPhase(fresh(['AOT-1-094','AOT-1-090','AOT-1-078','AOT-1-095'],76155),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 const homeLife=put(life,1,'AOT-1-090','front',0,true);
 put(life,1,'AOT-1-095','energy',0,true);
 put(life,1,'AOT-1-095','energy',1,true);
 put(life,1,'AOT-1-090','energy',2,true);
 put(life,1,'AOT-1-078','energy',3,true);
 setLife(life,1,['AOT-1-094','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'raid');
 life=pick(life,a=>a.mode==='raid'&&a.baseUid===homeLife.uid);
 assert.equal(life.players[1].front.some(c=>c?.cardId==='AOT-1-094'),true);
 finish(life);
});

test('095 discounts two red in hand only while the basement key is outside',()=>{
 const ids=['AOT-1-095','AOT-1-098','AOT-1-090','AOT-1-078'];
 let s=toPhase(fresh(ids,76160),'main');
 assert.equal(zoneRequiredEnergy(packs,s,0,pack.cards['AOT-1-095'],'hand'),6);
 const key=toHand(s,0,'AOT-1-098');
 assert.equal(zoneRequiredEnergy(packs,s,0,pack.cards['AOT-1-095'],'hand'),6);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===key.uid),1);
 s.players[0].deck.unshift(key);
 assert.equal(zoneRequiredEnergy(packs,s,0,pack.cards['AOT-1-095'],'hand'),6);
 s.players[0].deck.shift();
 s.players[0].outside.push(key);
 assert.equal(zoneRequiredEnergy(packs,s,0,pack.cards['AOT-1-095'],'hand'),4);
 assert.equal(zoneRequiredEnergy(packs,s,0,pack.cards['AOT-1-095'],'field'),6);
 fuel(s,['AOT-1-095','AOT-1-090']);
 readyAp(s,0,1);
 const playing=toHand(s,0,'AOT-1-095');
 const spare=toHand(s,0,'AOT-1-078');
 const deck=s.players[0].deck.length;
 s=play(s,playing.uid,'energy');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(cardEnergy(s,0,live(s,0,playing.uid)),3);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 finish(s);

 let life=toPhase(fresh(['AOT-1-095','AOT-1-078'],76161),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-095','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'get');
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='AOT-1-095'),true);
 finish(life);
});

test('096 costs one less AP while an Eren is on the field, then may retire and grant the titan',()=>{
 const ids=['AOT-1-096','AOT-1-093','AOT-1-090','AOT-1-095','AOT-1-078','AOT-1-094','AOT-1-080'];
 let pricey=toPhase(fresh(ids,76170),'main');
 fuel(pricey,['AOT-1-095','AOT-1-078','AOT-1-078']);
 readyAp(pricey,0,1);
 const blocked=toHand(pricey,0,'AOT-1-096');
 assert.equal(canEvent(pricey,blocked.uid),false);
 readyAp(pricey,0,2);
 assert.equal(canEvent(pricey,blocked.uid),true);
 finish(pricey);

 let s=toPhase(fresh(ids,76171),'main');
 fuel(s,['AOT-1-095','AOT-1-090','AOT-1-090']);
 const eren=put(s,0,'AOT-1-093','front',0,true);
 eren.stack=[take(s,0,'AOT-1-090')];
 eren.stack[0].faceDown=false;
 eren.stack[0].ready=false;
 const named=put(s,0,'AOT-1-090','front',1,true);
 const low=put(s,1,'AOT-1-078','front',0,true);
 const huge=put(s,1,'AOT-1-094','front',1,true);
 huge.buffs=[{bp:1000,untilTurn:s.turn}];
 readyAp(s,0,1);
 s=cast(s,toHand(s,0,'AOT-1-096').uid);
 assert.equal(s.pending.step,'retire');
 assert.equal(uids(s).includes(low.uid),true);
 assert.equal(uids(s).includes(huge.uid),false);
 assert.equal(modes(s,'skip').length,1);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.pending.step,'special96');
 const grants=modes(s,'grant').map(a=>a.uid);
 assert.equal(grants.includes(eren.uid),true);
 assert.equal(grants.includes(named.uid),false);
 assert.equal(modes(s,'skip').length,1);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(live(s,0,eren.uid).aotSpecialReplace,undefined);
 finish(s);

 let granted=toPhase(fresh(ids,76172),'main');
 fuel(granted,['AOT-1-095','AOT-1-090','AOT-1-090']);
 const titan=put(granted,0,'AOT-1-093','front',0,true);
 titan.stack=[take(granted,0,'AOT-1-090')];
 titan.stack[0].faceDown=false;
 titan.stack[0].ready=false;
 const victim=put(granted,1,'AOT-1-078','front',0,true);
 readyAp(granted,0,1);
 granted=cast(granted,toHand(granted,0,'AOT-1-096').uid);
 granted=pick(granted,a=>a.mode==='retire'&&a.uid===victim.uid);
 granted=pick(granted,a=>a.mode==='grant'&&a.uid===titan.uid);
 assert.equal(granted.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(live(granted,0,titan.uid).aotSpecialReplace.turn,granted.turn);
 const striker=put(granted,0,'AOT-1-078','front',1,true);
 granted=toPhase(granted,'attack');
 setLife(granted,1,['AOT-1-096','AOT-1-080']);
 granted=pick(granted,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 granted=pick(granted,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(granted.pending.trigger,'special');
 granted=pick(granted,a=>a.mode==='special'&&a.uid===titan.uid);
 assert.equal(live(granted,0,titan.uid)?.cardId,'AOT-1-093');
 assert.equal(granted.players[1].hand.some(c=>c.cardId==='AOT-1-096'),true);
 assert.equal(granted.players[1].outside.some(c=>c.cardId==='AOT-1-096'),false);
 const gone=ownMainAgain(granted);
 setLife(gone,1,['AOT-1-080','AOT-1-080']);
 const freshStriker=put(gone,0,'AOT-1-078','front',2,true);
 let lost=toPhase(gone,'attack');
 lost=pick(lost,a=>a.type==='attack'&&a.uid===freshStriker.uid&&!a.targetUid);
 lost=pick(lost,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(lost.pending,null);
 assert.equal(live(lost,0,titan.uid).aotSpecialReplace,undefined);
 finish(lost);
});

test('097 readies up to two AP, and the final trigger places a life only when none remain',()=>{
 const ids=['AOT-1-097','AOT-1-090','AOT-1-080'];
 let skipped=toPhase(fresh(ids,76180),'main');
 fuel(skipped,['AOT-1-090','AOT-1-090','AOT-1-090']);
 readyAp(skipped,0,3);
 skipped.players[0].apCards[1].ready=false;
 skipped.players[0].apCards[2].ready=false;
 skipped=cast(skipped,toHand(skipped,0,'AOT-1-097').uid);
 assert.equal(skipped.pending.kind,'effect-recover-ap');
 assert.equal(skipped.pending.remaining,2);
 skipped=pick(skipped,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(skipped.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 finish(skipped);

 let both=toPhase(fresh(ids,76181),'main');
 fuel(both,['AOT-1-090','AOT-1-090','AOT-1-090']);
 readyAp(both,0,3);
 both.players[0].apCards[1].ready=false;
 both.players[0].apCards[2].ready=false;
 both=cast(both,toHand(both,0,'AOT-1-097').uid);
 both=pick(both,a=>a.type==='chooseApRecovery'&&a.uid===both.players[0].apCards[1].uid);
 assert.equal(both.pending.remaining,1);
 both=pick(both,a=>a.type==='chooseApRecovery'&&a.uid===both.players[0].apCards[2].uid);
 assert.equal(both.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,2);
 finish(both);

 let early=toPhase(fresh(ids,76182),'attack');
 const hitter=put(early,0,'AOT-1-090','front',0,true);
 setLife(early,1,['AOT-1-097','AOT-1-080']);
 const top=early.players[1].deck[0];
 early=pick(early,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 early=pick(early,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(early.pending,null);
 assert.equal(early.players[1].life.length,1);
 assert.equal(early.players[1].life.some(c=>c.uid===top.uid),false);
 assert.equal(early.players[1].outside.some(c=>c.cardId==='AOT-1-097'),true);
 finish(early);

 let last=toPhase(fresh(ids,76183),'attack');
 const striker=put(last,0,'AOT-1-090','front',0,true);
 setLife(last,1,['AOT-1-097']);
 const incoming=last.players[1].deck[0];
 last=pick(last,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 last=pick(last,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(last.pending.trigger,'final');
 assert.equal(last.players[1].life.length,0);
 assert.equal(last.winner,null);
 last=pick(last,a=>a.mode==='final');
 assert.equal(last.players[1].life.some(c=>c.uid===incoming.uid),true);
 assert.equal(last.winner,null);
 finish(last);
});

test('098 looks privately and readies an AP only after publishing a card of energy 6 or more',()=>{
 const ids=['AOT-1-098','AOT-1-095','AOT-1-090','AOT-1-100','AOT-1-078','AOT-1-083','AOT-1-080'];
 let none=toPhase(fresh(ids,76190),'main');
 fuel(none,['AOT-1-090','AOT-1-090']);
 readyAp(none,0,2);
 none.players[0].apCards[1].ready=false;
 const window=crown(none,0,['AOT-1-095','AOT-1-090','AOT-1-100','AOT-1-078','AOT-1-083']);
 none=cast(none,toHand(none,0,'AOT-1-098').uid);
 assert.equal(none.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(packs,none,0).inspected.map(c=>c.uid).join(),window.map(c=>c.uid).join());
 assert.equal(universalPrivateChoices(packs,none,1),null);
 assert.deepEqual(modes(none,'take').map(a=>a.uid).sort(),[window[0].uid,window[1].uid].sort());
 none=pick(none,a=>a.mode==='done');
 const ordered=orderLook(none);
 none=ordered.s;
 assert.equal(none.pending,null);
 assert.equal(none.players[0].deck.at(-1).uid,ordered.clicks[0]);
 assert.equal(none.players[0].apCards[1].ready,false);
 assert.equal(window.every(c=>revealed(none,c.uid)),false);
 finish(none);

 let heavy=toPhase(fresh(ids,76191),'main');
 fuel(heavy,['AOT-1-090','AOT-1-090']);
 readyAp(heavy,0,2);
 heavy.players[0].apCards[1].ready=false;
 const cards=crown(heavy,0,['AOT-1-078','AOT-1-095','AOT-1-083','AOT-1-100','AOT-1-090']);
 heavy=cast(heavy,toHand(heavy,0,'AOT-1-098').uid);
 heavy=pick(heavy,a=>a.mode==='take'&&a.uid===cards[1].uid);
 assert.equal(heavy.publicReveals.filter(e=>e.kind==='searched-to-hand'||e.kind==='revealed-window').some(e=>e.uid===cards[1].uid),true);
 assert.equal(revealed(heavy,cards[0].uid),false);
 heavy=orderLook(heavy).s;
 assert.equal(heavy.pending.step,'ready');
 assert.equal(modes(heavy,'skip').length,1);
 heavy=pick(heavy,a=>a.mode==='ready'&&a.uid===heavy.players[0].apCards[1].uid);
 assert.equal(heavy.players[0].apCards[1].ready,true);
 assert.equal(heavy.players[0].hand.some(c=>c.uid===cards[1].uid),true);
 finish(heavy);

 let light=toPhase(fresh(ids,76192),'main');
 fuel(light,['AOT-1-090','AOT-1-090']);
 readyAp(light,0,2);
 light.players[0].apCards[1].ready=false;
 const low=crown(light,0,['AOT-1-090','AOT-1-078','AOT-1-083','AOT-1-100','AOT-1-080']);
 light=cast(light,toHand(light,0,'AOT-1-098').uid);
 light=pick(light,a=>a.mode==='take'&&a.uid===low[0].uid);
 light=orderLook(light).s;
 assert.equal(light.pending,null);
 assert.equal(light.players[0].apCards[1].ready,false);
 finish(light);

 let color=toPhase(fresh(['AOT-1-098','AOT-1-079','AOT-1-086','AOT-1-078','AOT-1-080'],76193),'attack');
 const hitter=put(color,0,'AOT-1-086','front',0,true);
 const legal=put(color,0,'AOT-1-079','front',1,true);
 setLife(color,1,['AOT-1-098','AOT-1-080']);
 color=pick(color,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 color=pick(color,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(color.pending.trigger,'color');
 assert.equal(legalUniversalActions(packs,color).some(a=>a.mode==='colorRetire'&&a.uid===legal.uid),true);
 assert.equal(legalUniversalActions(packs,color).some(a=>a.mode==='colorRetire'&&a.uid===hitter.uid),false);
 color=pick(color,a=>a.mode==='skip');
 assert.equal(live(color,0,legal.uid)?.cardId,'AOT-1-079');
 finish(color);
});

test('099 draws two, then plays up to two legal corps that return at the end of the attack',()=>{
 const ids=['AOT-1-099','AOT-1-091','AOT-1-090','AOT-1-077','AOT-1-100','AOT-1-095','AOT-1-078','AOT-1-080'];
 let none=toPhase(fresh(ids,76200),'main');
 fuel(none,['AOT-1-095','AOT-1-090']);
 readyAp(none,0,1);
 park(none,0,[]);
 crown(none,0,['AOT-1-100','AOT-1-100']);
 const missed=toHand(none,0,'AOT-1-077');
 const legal=toHand(none,0,'AOT-1-090');
 const event=toHand(none,0,'AOT-1-099');
 const before=none.players[0].deck.length;
 none=cast(none,event.uid);
 assert.equal(none.players[0].deck.length,before-2);
 assert.equal(none.pending?.step,'corps');
 assert.equal(uids(none).includes(missed.uid),false);
 assert.equal(uids(none).includes(legal.uid),true);
 none=pick(none,a=>a.mode==='done');
 assert.equal(live(none,0,legal.uid),undefined);
 assert.equal(none.pending,null);
 finish(none);

 let full=toPhase(fresh(ids,76201),'main');
 fuel(full,['AOT-1-095','AOT-1-090']);
 put(full,0,'AOT-1-078','front',0,true);
 put(full,0,'AOT-1-078','front',1,true);
 put(full,0,'AOT-1-078','front',2,true);
 put(full,0,'AOT-1-078','front',3,true);
 readyAp(full,0,1);
 park(full,0,[]);
 const recruit=toHand(full,0,'AOT-1-090');
 const blocked=toHand(full,0,'AOT-1-099');
 const deck=full.players[0].deck.length;
 full=cast(full,blocked.uid);
 assert.equal(live(full,0,recruit.uid),undefined);
 assert.equal(full.players[0].deck.length,deck-2);
 assert.equal(full.pending,null);
 finish(full);

 let s=toPhase(fresh(ids,76202),'main');
 fuel(s,['AOT-1-095','AOT-1-090']);
 readyAp(s,0,1);
 park(s,0,[]);
 const drawn=crown(s,0,['AOT-1-080','AOT-1-080']);
 const first=toHand(s,0,'AOT-1-090');
 const second=toHand(s,0,'AOT-1-091');
 s=cast(s,toHand(s,0,'AOT-1-099').uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn[0].uid),true);
 s=pick(s,a=>a.uid===first.uid&&a.line==='front');
 assert.equal(s.pending.step,'corps');
 assert.equal(live(s,0,first.uid).ready,true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(live(s,0,second.uid),undefined);
 s=toPhase(s,'move');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='step'&&a.uid===second.uid),false);
 const started=s.turn;
 s=advance(s,x=>x.turn>started,'after attack');
 assert.equal(s.players[0].hand.some(c=>c.uid===first.uid),true);
 finish(s);

 let stepped=toPhase(fresh(ids,76203),'main');
 fuel(stepped,['AOT-1-095','AOT-1-090']);
 readyAp(stepped,0,1);
 park(stepped,0,[]);
 crown(stepped,0,['AOT-1-100','AOT-1-080']);
 const mover=toHand(stepped,0,'AOT-1-091');
 stepped=cast(stepped,toHand(stepped,0,'AOT-1-099').uid);
 stepped=pick(stepped,a=>a.uid===mover.uid&&a.line==='front');
 assert.equal(stepped.phase,'main');
 assert.equal(legalUniversalActions(packs,stepped).some(a=>a.type==='step'&&a.uid===mover.uid),false);
 stepped=pick(stepped,a=>a.mode==='done');
 const startedStep=stepped.turn;
 stepped=advance(stepped,x=>x.turn>startedStep,'after attack');
 assert.equal(stepped.players[0].hand.some(c=>c.uid===mover.uid),true);
 assert.equal(stepped.players[0].front.some(c=>c?.uid===mover.uid),false);
 finish(stepped);

 let life=toPhase(fresh(['AOT-1-099','AOT-1-078','AOT-1-080'],76204),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 const victim=put(life,0,'AOT-1-078','front',1,true);
 setLife(life,1,['AOT-1-099','AOT-1-080']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='skip'),true);
 life=pick(life,a=>a.mode==='special'&&a.uid===victim.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===victim.uid),true);
 finish(life);
});

test('100 puts up to three hand cards on the bottom in the chosen order, draws that many, then may ready an AP',()=>{
 const ids=['AOT-1-100','AOT-1-095','AOT-1-090','AOT-1-078','AOT-1-080','AOT-1-083'];
 let zero=toPhase(fresh(ids,76210),'main');
 fuel(zero,['AOT-1-095']);
 readyAp(zero,0,2);
 zero.players[0].apCards[1].ready=false;
 const deck=zero.players[0].deck.length;
 zero=cast(zero,toHand(zero,0,'AOT-1-100').uid);
 zero=pick(zero,a=>a.mode==='done');
 assert.equal(zero.players[0].deck.length,deck);
 assert.equal(zero.pending.step,'ready');
 zero=pick(zero,a=>a.mode==='skip');
 assert.equal(zero.players[0].apCards[1].ready,false);
 finish(zero);

 let s=toPhase(fresh(ids,76211),'main');
 fuel(s,['AOT-1-095']);
 readyAp(s,0,2);
 s.players[0].apCards[1].ready=false;
 park(s,0,[]);
 const first=take(s,0,'AOT-1-090');
 const second=take(s,0,'AOT-1-078');
 const third=take(s,0,'AOT-1-080');
 const top=crown(s,0,['AOT-1-080','AOT-1-083','AOT-1-078']);
 s.players[0].hand.push(first,second,third);
 s=cast(s,toHand(s,0,'AOT-1-100').uid);
 s=pick(s,a=>a.mode==='bottom'&&a.uid===first.uid);
 s=pick(s,a=>a.mode==='bottom'&&a.uid===second.uid);
 s=pick(s,a=>a.mode==='bottom'&&a.uid===third.uid);
 assert.equal(s.players[0].deck.at(-1).uid,third.uid);
 assert.equal(s.players[0].deck.at(-2).uid,second.uid);
 assert.equal(s.players[0].deck.at(-3).uid,first.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===top[0].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===top[2].uid),true);
 assert.equal(s.pending.step,'ready');
 const ap=legalUniversalActions(packs,s).find(a=>a.mode==='ready');
 s=pick(s,a=>a.mode==='ready'&&a.uid===ap.uid);
 assert.equal(s.players[0].apCards.find(c=>c.uid===ap.uid).ready,true);
 finish(s);

 let life=toPhase(fresh(['AOT-1-100','AOT-1-078'],76212),'attack');
 const hitter=put(life,0,'AOT-1-078','front',0,true);
 setLife(life,1,['AOT-1-100','AOT-1-078']);
 life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(life.pending.trigger,'get');
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='AOT-1-100'),true);
 finish(life);
});

test('077, 078, 081, 084 and 091 ready from an active trigger, 082 draws, 080 checks nothing, and 092 can raid',()=>{
 for(const [id,seed] of [['AOT-1-077',76220],['AOT-1-078',76221],['AOT-1-081',76222],['AOT-1-084',76223],['AOT-1-091',76224]]){
  let life=toPhase(fresh([id,'AOT-1-078'],seed),'attack');
  const hitter=put(life,0,'AOT-1-078','front',0,true);
  const rested=put(life,1,'AOT-1-078','front',0,false);
  setLife(life,1,[id,'AOT-1-078']);
  life=pick(life,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
  life=pick(life,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(life.pending.trigger,'active');
  life=pick(life,a=>a.mode==='active'&&a.uid===rested.uid);
  assert.equal(live(life,1,rested.uid).ready,true);
  assert.equal(bp(life,live(life,1,rested.uid)),3500);
  finish(life);
 }
 let drawn=toPhase(fresh(['AOT-1-082','AOT-1-078'],76225),'attack');
 const hitter=put(drawn,0,'AOT-1-078','front',0,true);
 setLife(drawn,1,['AOT-1-082','AOT-1-078']);
 const hand=drawn.players[1].hand.length;
 drawn=pick(drawn,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 drawn=pick(drawn,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(drawn.pending.trigger,'draw');
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].hand.length,hand+1);
 finish(drawn);

 let blank=toPhase(fresh(['AOT-1-080','AOT-1-078'],76226),'attack');
 const striker=put(blank,0,'AOT-1-078','front',0,true);
 setLife(blank,1,['AOT-1-080','AOT-1-078']);
 blank=pick(blank,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 blank=pick(blank,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(blank.pending,null);
 assert.equal(blank.players[1].life.length,1);
 assert.equal(blank.players[1].outside.some(c=>c.cardId==='AOT-1-080'),true);
 finish(blank);

 let raid=toPhase(fresh(['AOT-1-092','AOT-1-090','AOT-1-095','AOT-1-078'],76227),'attack');
 const attacker=put(raid,0,'AOT-1-078','front',0,true);
 fuel(raid,['AOT-1-095','AOT-1-090'],1);
 const base=put(raid,1,'AOT-1-090','front',0,true);
 setLife(raid,1,['AOT-1-092','AOT-1-078']);
 raid=pick(raid,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
 raid=pick(raid,a=>a.mode==='raid'&&a.baseUid===base.uid);
 assert.equal(raid.players[1].front.some(c=>c?.cardId==='AOT-1-092'),true);
 finish(raid);
});
