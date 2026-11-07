import test from 'node:test';
import assert from 'node:assert/strict';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalImpact, universalImpactNull,
 universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];
const LIFE={
 'AOT-2-051':'active','AOT-2-052':'draw','AOT-2-053':'raid','AOT-2-054':'get',
 'AOT-2-055':null,'AOT-2-056':'raid','AOT-2-057':'draw','AOT-2-058':'get',
 'AOT-2-059':'active','AOT-2-060':'raid','AOT-2-061':'special','AOT-2-062':null,
 'AOT-2-063':null,'AOT-2-064':'active','AOT-2-065':'draw','AOT-2-066':null,
 'AOT-2-067':'raid','AOT-2-068':'draw','AOT-2-069':'get','AOT-2-070':'draw',
 'AOT-2-071':'active','AOT-2-072':'raid','AOT-2-073':'active'
};

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
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
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
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
 if(s.players[p][line][slot])throw Error('Slot occupied '+line+' '+slot);
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.reverse())s.players[p].deck.unshift(card);
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function toSide(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+player+' '+phase);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase+' from '+s.active+' '+s.phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,line='front'){
 const action=acts(s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid+' '+line);
 return use(s,action);
}
function cast(s,uid){
 const action=acts(s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return use(s,action);
}
function raidOnto(s,uid,baseUid,line='front'){
 const action=acts(s).find(a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&
  (line==='energy'?a.line==='energy':a.line!=='energy'));
 if(!action)throw Error('No raid '+uid+' onto '+baseUid+' '+line);
 return use(s,action);
}
function pick(s,pred){
 const actions=acts(s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(actions.slice(0,8)));
 return use(s,action);
}
function fromDeck(s,p,id){
 const pile=s.players[p].deck;
 const index=pile.findIndex(c=>c.cardId===id);
 if(index<0)throw Error('Missing deck '+id);
 return pile.splice(index,1)[0];
}
function blankLife(s,p,n){
 const pl=s.players[p];
 while(pl.life.length)pl.deck.push(pl.life.pop());
 const blanks=pl.deck.filter(c=>!pack.cards[c.cardId].trigger).slice(0,n);
 assert.equal(blanks.length,n);
 for(const card of blanks){
  pl.deck.splice(pl.deck.indexOf(card),1);
  pl.life.push(card);
 }
}
function setLife(s,p,n){
 const pl=s.players[p];
 while(pl.life.length>n)pl.deck.push(pl.life.pop());
 while(pl.life.length<n&&pl.deck.length)pl.life.push(pl.deck.pop());
 assert.equal(pl.life.length,n);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function listedUids(value,found=new Set()){
 if(!value||typeof value!=='object')return found;
 if(typeof value.uid==='string')found.add(value.uid);
 for(const child of Object.values(value))listedUids(child,found);
 return found;
}
function assertHidden(s,uids){
 const found=listedUids(universalPublicView(packs,s,1));
 for(const uid of uids)assert.equal(found.has(uid),false,uid);
}
function assertSeen(s,uids,kind){
 const shown=universalPublicView(packs,s,1).publicReveals.filter(entry=>!kind||entry.kind===kind);
 for(const uid of uids)assert.equal(shown.some(entry=>entry.uid===uid),true,uid);
}
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.step==='lookOrder'||s.pending.kind==='effect-top-order')){
  s=pick(s,a=>true);
  if(++guard>12)throw Error('order did not finish');
 }
 return s;
}
function orderExact(s,uids){
 for(const uid of uids)s=pick(s,a=>a.uid===uid);
 return s;
}
function passBlock(s){
 if(s.pending?.kind!=='block')return s;
 return pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
}
function swing(s,uid){
 s=use(s,{type:'attack',uid});
 return passBlock(s);
}
function fuel(s,ids,p=0){
 ids.forEach((id,slot)=>put(s,p,id,'energy',slot,true));
}
function finish(s){assertUniversalMatch(packs,s);return s;}

test('AOT-2-051 through 073 keep the printed life trigger',()=>{
 for(const [id,trigger] of Object.entries(LIFE))
  assert.equal(pack.cards[id].trigger,trigger,id);
});

test('life triggers from this range resolve, and a blank trigger does not',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-054','AOT-2-055','AOT-2-061']);
 let active=toPhase(fresh(counts,5101),'attack');
 const hitter=put(active,0,'AOT-2-001','front',0,true);
 const rested=put(active,1,'AOT-2-001','front',0,false);
 setLife(active,1,1);
 const opened=take(active,1,'AOT-2-051');
 active.players[1].life.unshift(opened);
 active=swing(active,hitter.uid);
 assert.equal(active.pending.trigger,'active');
 const before=universalBp(packs,active,field(active,1,rested.uid));
 active=pick(active,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(active,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,active,field(active,1,rested.uid)),before+3000);
 finish(active);

 let got=toPhase(fresh(counts,5102),'attack');
 const striker=put(got,0,'AOT-2-001','front',0,true);
 setLife(got,1,1);
 const life=take(got,1,'AOT-2-054');
 got.players[1].life.unshift(life);
 got=swing(got,striker.uid);
 assert.equal(got.pending.trigger,'get');
 got=pick(got,a=>a.mode!=='skip');
 assert.equal(got.players[1].hand.some(c=>c.uid===life.uid),true);
 finish(got);

 let blank=toPhase(fresh(counts,5103),'attack');
 const plain=put(blank,0,'AOT-2-001','front',0,true);
 setLife(blank,1,1);
 const quiet=take(blank,1,'AOT-2-055');
 blank.players[1].life.unshift(quiet);
 blank=swing(blank,plain.uid);
 assert.equal(blank.pending,null);
 assert.equal(blank.players[1].outside.some(c=>c.uid===quiet.uid),true);
 finish(blank);

 let special=toPhase(fresh(counts,5104),'attack');
 const victim=put(special,0,'AOT-2-001','front',0,true);
 setLife(special,1,1);
 const trick=take(special,1,'AOT-2-061');
 special.players[1].life.unshift(trick);
 special=swing(special,victim.uid);
 assert.equal(special.pending.trigger,'special');
 special=pick(special,a=>a.uid===victim.uid);
 assert.equal(special.players[0].front.some(c=>c?.uid===victim.uid),false);
 finish(special);

 let drawn=toPhase(fresh(counts,5105),'attack');
 const swinger=put(drawn,0,'AOT-2-001','front',0,true);
 setLife(drawn,1,1);
 const sheet=take(drawn,1,'AOT-2-052');
 drawn.players[1].life.unshift(sheet);
 const held=drawn.players[1].hand.length;
 drawn=swing(drawn,swinger.uid);
 assert.equal(drawn.pending.trigger,'draw');
 drawn=pick(drawn,a=>a.mode!=='skip');
 assert.equal(drawn.players[1].hand.length,held+1);
 assert.equal(drawn.players[1].outside.some(c=>c.uid===sheet.uid),true);
 finish(drawn);

 let raided=toPhase(fresh(counts,5106),'attack');
 fuel(raided,['AOT-2-051','AOT-2-051','AOT-2-052'],1);
 const home=put(raided,1,'AOT-2-052','front',0,true);
 const opener=put(raided,0,'AOT-2-001','front',0,true);
 setLife(raided,1,1);
 const beast=take(raided,1,'AOT-2-053');
 raided.players[1].life.unshift(beast);
 raided=swing(raided,opener.uid);
 assert.equal(raided.pending.trigger,'raid');
 assert.equal(acts(raided).some(a=>a.mode==='get'),true);
 assert.equal(acts(raided).some(a=>a.mode==='raid'&&a.baseUid===home.uid),true);
 raided=pick(raided,a=>a.mode==='get');
 assert.equal(raided.players[1].hand.some(c=>c.uid===beast.uid),true);
 finish(raided);
});

test('Falco readies only from the energy line, then buffs another warrior',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-055','AOT-2-001']);
 let front=toPhase(fresh(counts,51),'main');
 fuel(front,['AOT-2-051','AOT-2-052','AOT-2-054']);
 readyAp(front);
 const stayed=toHand(front,0,'AOT-2-051');
 front=play(front,stayed.uid,'front');
 assert.equal(field(front,0,stayed.uid).ready,false);
 assert.equal(front.pending,null);
 const woke=toHand(front,0,'AOT-2-051');
 front=play(front,woke.uid,'energy');
 assert.equal(field(front,0,woke.uid).ready,true);
 assert.equal(acts(front).some(a=>a.type==='activate'&&a.uid===woke.uid),true);
 finish(front);

 let paid=toPhase(fresh(counts,511),'main');
 fuel(paid,['AOT-2-052','AOT-2-052','AOT-2-054']);
 const other=put(paid,0,'AOT-2-055','front',0,true);
 readyAp(paid);
 const falco=toHand(paid,0,'AOT-2-051');
 const junk=toHand(paid,0,'AOT-2-001');
 paid=play(paid,falco.uid,'energy');
 assert.equal(acts(paid).some(a=>a.type==='activate'&&a.uid===falco.uid),true);
 paid=use(paid,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-051'});
 assert.equal(field(paid,0,falco.uid).ready,false);
 assert.equal(paid.pending.step,'discardRaid');
 assert.equal(acts(paid).some(a=>a.mode==='done'),false);
 assert.equal(acts(paid).some(a=>a.uid===falco.uid),false);
 paid=pick(paid,a=>a.uid===junk.uid);
 assert.equal(paid.players[0].outside.some(c=>c.uid===junk.uid),true);
 assert.equal(acts(paid).some(a=>a.uid===other.uid),true);
 assert.equal(acts(paid).some(a=>a.uid===falco.uid),false);
 paid=pick(paid,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,paid,field(paid,0,other.uid)),3000);
 finish(paid);
});

test('Falco replaces the bonus with 2000 when the chosen warrior is raided',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-054','AOT-2-056','AOT-2-001']);
 let s=toPhase(fresh(counts,512),'main');
 fuel(s,['AOT-2-052','AOT-2-053','AOT-2-052']);
 const host=put(s,0,'AOT-2-054','front',1,true);
 const falco=put(s,0,'AOT-2-051','energy',3,true);
 readyAp(s,0,3);
 s=raidOnto(s,toHand(s,0,'AOT-2-056').uid,host.uid);
 s=pick(s,a=>a.mode==='skip');
 const cart=s.players[0].front.find(c=>c?.cardId==='AOT-2-056');
 const junk=toHand(s,0,'AOT-2-001');
 s=use(s,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-051'});
 s=pick(s,a=>a.uid===junk.uid);
 s=pick(s,a=>a.uid===cart.uid);
 assert.equal(universalBp(packs,s,field(s,0,cart.uid)),6000);
 finish(s);
});

test('Zeke looks at five privately, publishes only the pure titan, and discards nothing',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-055','AOT-2-057','AOT-1-040','AOT-2-001']);
 let skipped=toPhase(fresh(counts,52),'main');
 fuel(skipped,['AOT-2-051','AOT-2-052','AOT-2-054']);
 readyAp(skipped);
 stackTop(skipped,0,['AOT-2-001','AOT-1-040','AOT-2-055','AOT-2-057','AOT-2-054']);
 const window=skipped.players[0].deck.slice(0,5).map(c=>c.uid);
 const zeke=toHand(skipped,0,'AOT-2-052');
 skipped=play(skipped,zeke.uid);
 assert.equal(skipped.pending.kind,'effect-top-filter-choice');
 const look=universalPrivateChoices(packs,skipped,0);
 assert.equal(look.inspected.map(c=>c.uid).join(),window.join());
 assert.equal(look.inspected.filter(c=>c.cardId==='AOT-1-040').length,1);
 assert.equal(universalPrivateChoices(packs,skipped,1),null);
 assertHidden(skipped,window);
 skipped=pick(skipped,a=>a.uid==null);
 const bottom=[...window].reverse();
 skipped=orderExact(skipped,bottom);
 assert.deepEqual(skipped.players[0].deck.slice(-5).map(c=>c.uid),bottom);
 assert.equal(skipped.publicReveals.some(entry=>window.includes(entry.uid)),false);
 finish(skipped);

 let taken=toPhase(fresh(counts,521),'main');
 fuel(taken,['AOT-2-051','AOT-2-052','AOT-2-054']);
 readyAp(taken);
 stackTop(taken,0,['AOT-2-001','AOT-1-040','AOT-2-055','AOT-2-057','AOT-2-054']);
 const titan=taken.players[0].deck[1];
 const rest=taken.players[0].deck.slice(0,5).map(c=>c.uid).filter(uid=>uid!==titan.uid);
 taken=play(taken,toHand(taken,0,'AOT-2-052').uid);
 assert.equal(acts(taken).some(a=>a.uid===taken.players[0].deck[0].uid),false);
 taken=pick(taken,a=>a.uid===titan.uid);
 assertSeen(taken,[titan.uid],'searched-to-hand');
 assertHidden(taken,rest);
 taken=orderExact(taken,rest);
 assert.equal(taken.players[0].hand.some(c=>c.uid===titan.uid),true);
 assert.deepEqual(taken.players[0].deck.slice(-4).map(c=>c.uid),rest);
 assert.equal(taken.pending,null);
 finish(taken);
});

test('the Beast Titan retires and deploys only while raided',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-054','AOT-1-040','AOT-2-001','AOT-2-013']);
 let plain=toPhase(fresh(counts,53),'main');
 fuel(plain,['AOT-2-051','AOT-2-052','AOT-2-051','AOT-2-054']);
 const foe=put(plain,1,'AOT-2-001','front',0,true);
 readyAp(plain);
 plain=play(plain,toHand(plain,0,'AOT-2-053').uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[1].front.some(c=>c?.uid===foe.uid),true);
 finish(plain);

 let raid=toPhase(fresh(counts,531),'main');
 fuel(raid,['AOT-2-051','AOT-2-051','AOT-2-054']);
 const host=put(raid,0,'AOT-2-052','front',0,true);
 const small=put(raid,1,'AOT-2-001','front',0,true);
 const tall=put(raid,1,'AOT-2-013','front',1,true);
 const side=put(raid,1,'AOT-2-001','energy',0,true);
 const titan=toOutside(raid,0,'AOT-1-040');
 readyAp(raid,0,2);
 raid=raidOnto(raid,toHand(raid,0,'AOT-2-053').uid,host.uid);
 assert.equal(raid.pending.id,'AOT-2-053');
 assert.equal(acts(raid).some(a=>a.uid===small.uid),true);
 assert.equal(acts(raid).some(a=>a.uid===tall.uid),false);
 assert.equal(acts(raid).some(a=>a.uid===side.uid),false);
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(raid.pending,null);
 assert.equal(raid.players[1].front.some(c=>c?.uid===small.uid),true);
 finish(raid);

 let paid=toPhase(fresh(counts,532),'main');
 fuel(paid,['AOT-2-051','AOT-2-051','AOT-2-054']);
 const base=put(paid,0,'AOT-2-052','front',0,true);
 const target=put(paid,1,'AOT-2-001','front',0,true);
 const body=toOutside(paid,0,'AOT-1-040');
 readyAp(paid,0,2);
 const before=paid.players[0].hand.length;
 paid=raidOnto(paid,toHand(paid,0,'AOT-2-053').uid,base.uid);
 paid=pick(paid,a=>a.uid===target.uid);
 assert.equal(paid.pending.step,'payEnter');
 paid=pick(paid,a=>a.mode==='skip');
 assert.equal(paid.players[0].outside.some(c=>c.uid===body.uid),true);
 assert.equal(paid.pending,null);
 finish(paid);

 let entered=toPhase(fresh(counts,533),'main');
 fuel(entered,['AOT-2-051','AOT-2-051','AOT-2-054']);
 const home=put(entered,0,'AOT-2-052','front',0,true);
 const victim=put(entered,1,'AOT-2-001','front',0,true);
 const pure=toOutside(entered,0,'AOT-1-040');
 readyAp(entered,0,2);
 const hand=entered.players[0].hand.length;
 entered=raidOnto(entered,toHand(entered,0,'AOT-2-053').uid,home.uid);
 entered=pick(entered,a=>a.uid===victim.uid);
 entered=pick(entered,a=>a.mode==='enter'&&a.uid===pure.uid);
 assert.equal(field(entered,0,pure.uid).ready,false);
 assert.equal(entered.players[0].hand.length,hand+1);
 finish(entered);
});

test('the Cart Titan may return its raid base when an effect retires it',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-054','AOT-2-056','AOT-2-061']);
 let skipped=toPhase(fresh(counts,564),'main');
 fuel(skipped,['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-051']);
 const host=put(skipped,0,'AOT-2-054','front',0,true);
 readyAp(skipped,0,2);
 const cart=toHand(skipped,0,'AOT-2-056');
 skipped=raidOnto(skipped,cart.uid,host.uid);
 skipped=pick(skipped,a=>a.mode==='skip');
 skipped=cast(skipped,toHand(skipped,0,'AOT-2-061').uid);
 skipped=pick(skipped,a=>a.uid===cart.uid);
 assert.equal(skipped.pending.id,'AOT-2-056');
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.players[0].outside.some(c=>c.uid===host.uid),true);
 assert.equal(skipped.pending.id,'AOT-2-061');
 assert.equal(skipped.pending.step,'pick');
 assert.equal(acts(skipped).some(a=>a.uid===cart.uid),true);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.players[0].outside.some(c=>c.uid===cart.uid),true);
 finish(skipped);

 let taken=toPhase(fresh(counts,565),'main');
 fuel(taken,['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-051']);
 const base=put(taken,0,'AOT-2-054','front',0,true);
 readyAp(taken,0,2);
 const top=toHand(taken,0,'AOT-2-056');
 taken=raidOnto(taken,top.uid,base.uid);
 taken=pick(taken,a=>a.mode==='skip');
 taken=cast(taken,toHand(taken,0,'AOT-2-061').uid);
 taken=pick(taken,a=>a.uid===top.uid);
 taken=pick(taken,a=>a.uid===base.uid);
 assert.equal(taken.players[0].hand.some(c=>c.uid===base.uid),true);
 assert.equal(taken.pending.id,'AOT-2-061');
 assert.equal(taken.pending.step,'pick');
 assert.equal(acts(taken).some(a=>a.uid===top.uid),true);
 assert.equal(acts(taken).some(a=>a.uid===base.uid),false);
 taken=pick(taken,a=>a.mode==='done');
 finish(taken);
});

test('Pieck and Porco with no effect stay quiet, and the other Pieck buffs one warrior',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-001']);
 let quiet=toPhase(fresh(counts,54),'main');
 readyAp(quiet);
 quiet=play(quiet,toHand(quiet,0,'AOT-2-054').uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.find(c=>c?.cardId==='AOT-2-054').ready,false);
 quiet=play(quiet,toHand(quiet,0,'AOT-2-057').uid);
 assert.equal(quiet.pending,null);
 finish(quiet);

 let buff=toPhase(fresh(counts,55),'main');
 fuel(buff,['AOT-2-054']);
 const self=toHand(buff,0,'AOT-2-055');
 const mate=put(buff,0,'AOT-2-054','front',0,true);
 readyAp(buff);
 buff=play(buff,self.uid,'energy');
 assert.equal(buff.pending.step,'raidBuff');
 assert.equal(acts(buff).some(a=>a.uid===self.uid),false);
 assert.equal(acts(buff).some(a=>a.mode==='done'),true);
 buff=pick(buff,a=>a.mode==='done');
 assert.equal(universalBp(packs,buff,field(buff,0,mate.uid)),1500);
 finish(buff);
});

test('the Cart Titan gains impact, energy attack and sniper only inside the raid',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-056','AOT-2-001','AOT-2-063']);
 let ordinary=toPhase(fresh(counts,56),'main');
 fuel(ordinary,['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-054']);
 readyAp(ordinary);
 const plain=toHand(ordinary,0,'AOT-2-056');
 ordinary=play(ordinary,plain.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(universalImpact(packs,ordinary,field(ordinary,0,plain.uid)),0);
 ordinary=toPhase(ordinary,'attack');
 assert.equal(acts(ordinary).some(a=>a.type==='attack'&&a.uid===plain.uid),false);
 finish(ordinary);

 let raid=toPhase(fresh(counts,561),'main');
 fuel(raid,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const host=put(raid,0,'AOT-2-054','energy',3,true);
 readyAp(raid);
 const cart=toHand(raid,0,'AOT-2-056');
 raid=raidOnto(raid,cart.uid,host.uid,'energy');
 assert.equal(raid.pending.step,'mode');
 raid=pick(raid,a=>a.mode==='skip');
 const stayed=field(raid,0,cart.uid);
 assert.equal(universalBp(packs,raid,stayed),4000);
 assert.equal(universalImpact(packs,raid,stayed),0);
 raid=toPhase(raid,'attack');
 assert.equal(acts(raid).some(a=>a.type==='attack'&&a.uid===cart.uid),false);
 finish(raid);

 let line=toPhase(fresh(counts,564),'main');
 fuel(line,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const seat=put(line,0,'AOT-2-054','energy',3,true);
 readyAp(line);
 const rider=toHand(line,0,'AOT-2-056');
 line=raidOnto(line,rider.uid,seat.uid,'energy');
 line=pick(line,a=>a.mode==='down');
 assert.equal(universalBp(packs,line,field(line,0,rider.uid)),2000);
 const target=put(line,1,'AOT-2-063','front',0,true);
 line=toPhase(line,'attack');
 const shot=acts(line).find(a=>a.type==='attack'&&a.uid===rider.uid&&a.targetUid===target.uid);
 assert.ok(shot);
 line=use(line,shot);
 assert.equal(line.pending?.kind==='block',false);
 assert.equal(line.players[1].front.some(c=>c?.uid===target.uid),false);
 assert.equal(field(line,0,rider.uid)!==null,true);
 finish(line);

 let short=toPhase(fresh(counts,565),'main');
 fuel(short,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const bench=put(short,0,'AOT-2-054','energy',3,true);
 readyAp(short);
 const low=toHand(short,0,'AOT-2-056');
 short=raidOnto(short,low.uid,bench.uid,'energy');
 short=pick(short,a=>a.mode==='down');
 const taller=put(short,1,'AOT-2-001','front',0,true);
 short=toPhase(short,'attack');
 short=use(short,acts(short).find(a=>a.type==='attack'&&a.uid===low.uid&&a.targetUid===taller.uid));
 assert.equal(short.pending?.kind==='block',false);
 assert.equal(short.players[1].front.some(c=>c?.uid===taller.uid),true);
 assert.equal(field(short,0,low.uid),null);
 finish(short);

 let down=toPhase(fresh(counts,562),'main');
 fuel(down,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const base=put(down,0,'AOT-2-054','energy',3,true);
 readyAp(down);
 const top=toHand(down,0,'AOT-2-056');
 down=raidOnto(down,top.uid,base.uid);
 assert.equal(universalImpact(packs,down,field(down,0,top.uid)),1);
 down=pick(down,a=>a.mode==='down');
 assert.equal(universalBp(packs,down,field(down,0,top.uid)),2000);
 const wall=put(down,1,'AOT-2-063','front',0,true);
 down=toPhase(down,'attack');
 const sniper=acts(down).find(a=>a.type==='attack'&&a.uid===top.uid&&a.targetUid===wall.uid);
 assert.ok(sniper);
 down=use(down,acts(down).find(a=>a.type==='attack'&&a.uid===top.uid&&a.targetUid===wall.uid));
 assert.equal(down.pending?.kind==='block',false);
 assert.equal(down.players[1].front.some(c=>c?.uid===wall.uid),false);
 assert.equal(down.players[1].life.length>0,true);
 finish(down);

 let later=toPhase(fresh(counts,563),'main');
 fuel(later,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const home=put(later,0,'AOT-2-054','front',0,true);
 readyAp(later);
 const body=toHand(later,0,'AOT-2-056');
 later=raidOnto(later,body.uid,home.uid);
 later=pick(later,a=>a.mode==='skip');
 later=toSide(later,1,'main');
 later=toSide(later,0,'main');
 assert.equal(universalImpact(packs,later,field(later,0,body.uid)),0);
 assert.equal(universalBp(packs,later,field(later,0,body.uid)),4000);
 finish(later);
});

test('the Jaw Titan looks only while raided and draws on attack only at 6000',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-058','AOT-2-001']);
 let ordinary=toPhase(fresh(counts,58),'main');
 fuel(ordinary,['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-054']);
 readyAp(ordinary);
 stackTop(ordinary,0,['AOT-2-001','AOT-2-054','AOT-2-055','AOT-2-057']);
 const before=ordinary.players[0].deck.slice(0,4).map(c=>c.uid);
 ordinary=play(ordinary,toHand(ordinary,0,'AOT-2-058').uid);
 assert.equal(ordinary.pending,null);
 assert.deepEqual(ordinary.players[0].deck.slice(0,4).map(c=>c.uid),before);
 finish(ordinary);

 let raid=toPhase(fresh(counts,581),'main');
 fuel(raid,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const host=put(raid,0,'AOT-2-057','front',0,true);
 readyAp(raid,0,2);
 stackTop(raid,0,['AOT-2-001','AOT-2-054','AOT-2-055','AOT-2-001']);
 const window=raid.players[0].deck.slice(0,4).map(c=>c.uid);
 const jaw=toHand(raid,0,'AOT-2-058');
 raid=raidOnto(raid,jaw.uid,host.uid);
 assert.equal(raid.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,raid,1),null);
 assertHidden(raid,window);
 const chosen=raid.players[0].deck.find(c=>c.cardId==='AOT-2-054');
 raid=pick(raid,a=>a.uid===chosen.uid);
 assertSeen(raid,[chosen.uid],'searched-to-hand');
 raid=orderRest(raid);
 assert.equal(raid.pending,null);
 assert.equal(universalBp(packs,raid,field(raid,0,jaw.uid)),4000);
 raid=play(raid,toHand(raid,0,'AOT-2-055').uid,'energy');
 raid=pick(raid,a=>a.uid===jaw.uid);
 assert.equal(universalBp(packs,raid,field(raid,0,jaw.uid)),6000);
 const hand=raid.players[0].hand.length;
 raid=toPhase(raid,'attack');
 raid=swing(raid,jaw.uid);
 assert.equal(raid.players[0].hand.length,hand+1);
 finish(raid);

 let short=toPhase(fresh(counts,582),'attack');
 fuel(short,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const home=put(short,0,'AOT-2-057','front',0,true);
 readyAp(short);
 short=toPhase(fresh(counts,583),'main');
 fuel(short,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const pile=put(short,0,'AOT-2-057','front',0,true);
 readyAp(short);
 stackTop(short,0,['AOT-2-001']);
 const low=toHand(short,0,'AOT-2-058');
 short=raidOnto(short,low.uid,pile.uid);
 short=pick(short,a=>a.uid==null);
 short=orderRest(short);
 const held=short.players[0].hand.length;
 short=toPhase(short,'attack');
 short=swing(short,low.uid);
 assert.equal(short.players[0].hand.length,held);
 finish(short);
});

test('the triple name is a legal Reiner base and not a different character',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-059','AOT-2-060','AOT-2-001']);
 let s=toPhase(fresh(counts,59),'main');
 fuel(s,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const alias=put(s,0,'AOT-2-059','energy',3,true);
 const stranger=put(s,0,'AOT-2-001','front',0,true);
 readyAp(s);
 const reiner=toHand(s,0,'AOT-2-060');
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===reiner.uid&&a.baseUid===alias.uid),true);
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===reiner.uid&&a.baseUid===stranger.uid),false);
 s=raidOnto(s,reiner.uid,alias.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===reiner.uid),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===reiner.uid).stack[0].uid,alias.uid);
 finish(s);
});

test('the Armored Titan discards for BP and draws only at 6000 while raided',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-059','AOT-2-060','AOT-2-001']);
 let plain=toPhase(fresh(counts,60),'main');
 fuel(plain,['AOT-2-051','AOT-2-052','AOT-2-051','AOT-2-054']);
 readyAp(plain);
 const body=toHand(plain,0,'AOT-2-060');
 const spare=toHand(plain,0,'AOT-2-001');
 plain=play(plain,body.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(universalImpactNull(packs,plain,field(plain,0,body.uid)),false);
 plain=toSide(plain,1,'main');
 plain=toSide(plain,0,'attack');
 const held=plain.players[0].hand.length;
 plain=swing(plain,body.uid);
 assert.equal(plain.players[0].hand.length,held);
 assert.equal(universalImpact(packs,plain,field(plain,0,body.uid)),0);
 finish(plain);

 let raid=toPhase(fresh(counts,601),'main');
 fuel(raid,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const host=put(raid,0,'AOT-2-059','front',0,true);
 readyAp(raid);
 const top=toHand(raid,0,'AOT-2-060');
 const pay=toHand(raid,0,'AOT-2-001');
 raid=raidOnto(raid,top.uid,host.uid);
 assert.equal(universalImpactNull(packs,raid,field(raid,0,top.uid)),true);
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(universalBp(packs,raid,field(raid,0,top.uid)),4000);
 assert.equal(raid.players[0].hand.some(c=>c.uid===pay.uid),true);
 finish(raid);

 let paid=toPhase(fresh(counts,602),'main');
 fuel(paid,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const home=put(paid,0,'AOT-2-059','front',0,true);
 readyAp(paid);
 const armor=toHand(paid,0,'AOT-2-060');
 const cost=toHand(paid,0,'AOT-2-001');
 paid=raidOnto(paid,armor.uid,home.uid);
 paid=pick(paid,a=>a.uid===cost.uid);
 assert.equal(universalBp(packs,paid,field(paid,0,armor.uid)),6000);
 const hand=paid.players[0].hand.length;
 paid=toPhase(paid,'attack');
 paid=swing(paid,armor.uid);
 assert.equal(paid.players[0].hand.length,hand+1);
 assert.equal(universalImpact(packs,paid,field(paid,0,armor.uid)),1);
 finish(paid);
});

test('the ambush retires Pieck first, then raises the cap and may take her back',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-054','AOT-2-055','AOT-2-061','AOT-2-001','AOT-2-013','AOT-2-058']);
 let freshCap=toPhase(fresh(counts,61),'main');
 fuel(freshCap,['AOT-2-051','AOT-2-051','AOT-2-054','AOT-2-054']);
 const pieck=put(freshCap,0,'AOT-2-054','front',0,true);
 const low=put(freshCap,1,'AOT-2-001','front',0,true);
 const mid=put(freshCap,1,'AOT-2-058','front',1,true);
 readyAp(freshCap);
 freshCap=cast(freshCap,toHand(freshCap,0,'AOT-2-061').uid);
 freshCap=pick(freshCap,a=>a.uid===pieck.uid);
 assert.equal(freshCap.players[0].outside.some(c=>c.uid===pieck.uid),true);
 assert.equal(acts(freshCap).some(a=>a.uid===low.uid),true);
 assert.equal(acts(freshCap).some(a=>a.uid===mid.uid),true);
 freshCap=pick(freshCap,a=>a.mode==='done');
 assert.equal(freshCap.pending.step,'pick');
 freshCap=pick(freshCap,a=>a.uid===pieck.uid);
 assert.equal(freshCap.players[0].hand.some(c=>c.uid===pieck.uid),true);
 assert.equal(freshCap.players[1].front.some(c=>c?.uid===mid.uid),true);
 finish(freshCap);

 let outside=toPhase(fresh(counts,611),'main');
 fuel(outside,['AOT-2-051','AOT-2-051','AOT-2-054','AOT-2-054']);
 const waiting=toOutside(outside,0,'AOT-2-055');
 const four=put(outside,1,'AOT-2-058','front',0,true);
 readyAp(outside);
 outside=cast(outside,toHand(outside,0,'AOT-2-061').uid);
 outside=pick(outside,a=>a.mode==='done');
 assert.equal(acts(outside).some(a=>a.uid===four.uid),true);
 outside=pick(outside,a=>a.mode==='done');
 assert.equal(outside.pending,null);
 assert.equal(outside.players[0].outside.some(c=>c.uid===waiting.uid),true);
 finish(outside);

 let skipped=toPhase(fresh(counts,612),'main');
 fuel(skipped,['AOT-2-051','AOT-2-051','AOT-2-054','AOT-2-054']);
 const mine=put(skipped,0,'AOT-2-054','front',0,true);
 const three=put(skipped,1,'AOT-2-001','front',0,true);
 readyAp(skipped);
 skipped=cast(skipped,toHand(skipped,0,'AOT-2-061').uid);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(acts(skipped).some(a=>a.uid===three.uid),true);
 assert.equal(acts(skipped).some(a=>a.uid===put.length),false);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===mine.uid),true);
 finish(skipped);
});

test('Nicolo waits for the next food, and Sasha readies only the first success',()=>{
 const counts=countsFor(['AOT-2-062','AOT-2-065','AOT-2-073','AOT-2-063','AOT-1-069','AOT-1-070']);
 let s=toPhase(fresh(counts,62),'main');
 fuel(s,['AOT-1-069','AOT-1-070','AOT-1-069']);
 readyAp(s,0,4);
 s=play(s,toHand(s,0,'AOT-2-062').uid);
 assert.equal(s.players[0].aot2FoodAp.amount,1);
 s=play(s,toHand(s,0,'AOT-2-063').uid,'energy');
 assert.equal(s.players[0].aot2FoodAp.amount,1);
 const early=toHand(s,0,'AOT-2-065');
 s=play(s,early.uid);
 assert.equal(field(s,0,early.uid).ready,false);
 assert.equal(s.mainReadyOnceByName[0].includes('サシャ・ブラウス|AOT-2-065|onPlay'),false);
 const food=toHand(s,0,'AOT-2-073');
 assert.equal(acts(s).some(a=>a.type==='event'&&a.uid===food.uid),true);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=cast(s,food.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.players[0].aot2FoodAp,null);
 s=pick(s,a=>a.mode==='three');
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.players[0].hand.length>=0,true);
 readyAp(s,0,1);
 const later=toHand(s,0,'AOT-2-065');
 s=play(s,later.uid);
 assert.equal(field(s,0,later.uid).ready,true);
 readyAp(s,0,1);
 const third=toHand(s,0,'AOT-2-065');
 s=play(s,third.uid);
 assert.equal(field(s,0,third.uid).ready,false);
 s=toSide(s,1,'main');
 s=toSide(s,0,'main');
 assert.equal(s.players[0].aot2FoodAp,null);
 finish(s);
});

test('Connie removes impact from the character that battles him',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-054','AOT-2-056','AOT-2-063','AOT-2-001']);
 let s=toPhase(fresh(counts,63),'main');
 fuel(s,['AOT-2-051','AOT-2-052','AOT-2-054']);
 const host=put(s,0,'AOT-2-054','front',0,true);
 const connie=put(s,1,'AOT-2-063','front',0,true);
 const open=put(s,1,'AOT-2-001','front',1,true);
 readyAp(s);
 const cart=toHand(s,0,'AOT-2-056');
 s=raidOnto(s,cart.uid,host.uid);
 s=pick(s,a=>a.mode==='down');
 assert.equal(universalImpact(packs,s,field(s,0,cart.uid)),1);
 const life=s.players[1].life.length;
 s=toPhase(s,'attack');
 s=use(s,acts(s).find(a=>a.type==='attack'&&a.uid===cart.uid&&a.targetUid===connie.uid));
 assert.notEqual(s.pending?.kind,'block');
 assert.equal(s.players[1].front.some(c=>c?.uid===connie.uid),false);
 assert.equal(s.players[1].life.length,life);
 finish(s);
});

test('Jean looks at three privately and puts every card back on top',()=>{
 const counts=countsFor(['AOT-2-064','AOT-2-001','AOT-2-062','AOT-2-063']);
 let s=toPhase(fresh(counts,64),'attack');
 const jean=put(s,0,'AOT-2-064','front',0,true);
 stackTop(s,0,['AOT-2-062','AOT-2-063','AOT-2-001']);
 const window=s.players[0].deck.slice(0,3).map(c=>c.uid);
 s=swing(s,jean.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,window);
 const own=universalPrivateChoices(packs,s,0);
 assert.deepEqual(own.options.map(o=>o.action.uid).sort(),[...window].sort());
 assert.ok(own.options.every(o=>o.card&&o.card.cardId));
 s=orderExact(s,[window[2],window[0],window[1]]);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),[window[2],window[0],window[1]]);
 assert.equal(s.publicReveals.some(entry=>window.includes(entry.uid)),false);
 finish(s);
});

test('Mikasa from hand stays in hand, and the end choice is rested before the refresh',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-004','AOT-2-063','AOT-1-069','AOT-1-009','AOT-2-001']);
 let early=toPhase(fresh(counts,66),'main');
 fuel(early,['AOT-2-001','AOT-1-069']);
 const mikasa=put(early,0,'AOT-2-066','front',0,true);
 readyAp(early);
 early=play(early,toHand(early,0,'AOT-2-004').uid);
 early=pick(early,a=>a.uid===mikasa.uid);
 assert.equal(early.players[0].hand.some(c=>c.uid===mikasa.uid),true);
 const copy=toHand(early,0,'AOT-2-066');
 early=toPhase(early,'attack');
 early=use(early,{type:'next'});
 assert.equal(early.pending?.id==='AOT-2-066',false);
 assert.equal(early.players[0].hand.some(c=>c.uid===copy.uid),true);
 finish(early);

 let bounced=toPhase(fresh(counts,661),'attack');
 fuel(bounced,['AOT-1-069']);
 const corps=put(bounced,0,'AOT-2-063','front',0,true);
 const first=toHand(bounced,0,'AOT-2-066');
 const second=fromDeck(bounced,0,'AOT-2-066');
 bounced.players[0].hand.push(second);
 setLife(bounced,1,1);
 const trigger=take(bounced,1,'AOT-1-009');
 bounced.players[1].life.unshift(trigger);
 bounced=swing(bounced,corps.uid);
 assert.equal(bounced.pending.trigger,'color');
 bounced=pick(bounced,a=>a.uid===corps.uid);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===corps.uid),true);
 bounced=use(bounced,{type:'next'});
 assert.equal(bounced.pending.id,'AOT-2-066');
 const choice=acts(bounced).find(a=>a.mode==='enter'&&a.uid===first.uid);
 assert.equal(choice.ready,false);
 bounced=pick(bounced,a=>a.mode==='enter'&&a.uid===first.uid);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===second.uid),true);
 const entered=bounced.players[0].front.find(c=>c?.cardId==='AOT-2-066');
 assert.equal(!!entered,true);
 assert.equal(bounced.players[0].front.filter(c=>c?.cardId==='AOT-2-066').length,1);
 // End-phase start effects run, then the end refresh sets the turn player's
 // rested characters active before the opponent's turn. She can block then.
 assert.equal(entered.ready,true);
 assert.equal(bounced.active,1);
 finish(bounced);
});

test('raid Mikasa must choose a printed mode and ignores the standing bonus',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-067','AOT-2-069','AOT-2-063','AOT-1-069','AOT-1-061','AOT-2-070']);
 let banned=toPhase(fresh(counts,67),'main');
 fuel(banned,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const host=put(banned,0,'AOT-2-066','front',0,true);
 readyAp(banned);
 const outs=toOutside(banned,0,'AOT-2-070');
 const raidedOut=toOutside(banned,0,'AOT-2-067');
 const mikasa=toHand(banned,0,'AOT-2-067');
 assert.equal(acts(banned).some(a=>a.type==='play'&&a.uid===mikasa.uid),false);
 const small=put(banned,1,'AOT-2-063','front',0,true);
 put(banned,0,'AOT-2-069','front',1,true);
 banned=raidOnto(banned,mikasa.uid,host.uid);
 assert.equal(banned.pending.step,'mode');
 assert.equal(acts(banned).some(a=>a.mode==='done'),false);
 assert.equal(acts(banned).some(a=>a.mode==='hand'),true);
 banned=pick(banned,a=>a.mode==='hand');
 assert.equal(acts(banned).some(a=>a.uid===outs.uid),true);
 assert.equal(acts(banned).some(a=>a.uid===raidedOut.uid),false);
 banned=pick(banned,a=>a.mode==='done');
 assert.equal(banned.players[0].outside.some(c=>c.uid===outs.uid),true);
 finish(banned);

 let battle=toPhase(fresh(counts,671),'main');
 fuel(battle,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const base=put(battle,0,'AOT-2-066','front',0,true);
 put(battle,0,'AOT-2-069','front',1,true);
 const low=put(battle,1,'AOT-2-063','front',0,true);
 const high=put(battle,1,'AOT-1-061','front',1,true);
 readyAp(battle);
 const top=toHand(battle,0,'AOT-2-067');
 battle=raidOnto(battle,top.uid,base.uid);
 battle=pick(battle,a=>a.mode==='battle');
 battle=pick(battle,a=>a.uid===low.uid);
 assert.equal(battle.pending,null);
 assert.equal(battle.players[1].front.some(c=>c?.uid===low.uid),true);
 finish(battle);

 let kill=toPhase(fresh(counts,672),'main');
 fuel(kill,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const pile=put(kill,0,'AOT-2-066','front',0,true);
 put(kill,0,'AOT-2-069','front',1,true);
 const armored=put(kill,1,'AOT-1-061','front',0,true);
 readyAp(kill);
 const copy=toHand(kill,0,'AOT-2-067');
 const first=toHand(kill,0,'AOT-2-063');
 const second=fromDeck(kill,0,'AOT-2-063');
 kill.players[0].hand.push(second);
 kill=raidOnto(kill,copy.uid,pile.uid);
 kill=pick(kill,a=>a.mode==='battle');
 kill=pick(kill,a=>a.uid===armored.uid);
 assert.equal(kill.pending.step,'discard');
 assert.equal(acts(kill).some(a=>a.mode==='done'),true);
 kill=pick(kill,a=>a.uid===first.uid);
 kill=pick(kill,a=>a.uid===second.uid);
 assert.equal(kill.players[1].outside.some(c=>c.uid===armored.uid),true);
 finish(kill);

 let declined=toPhase(fresh(counts,673),'main');
 fuel(declined,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const seat=put(declined,0,'AOT-2-066','front',0,true);
 const wall=put(declined,1,'AOT-1-061','front',0,true);
 readyAp(declined);
 const raider=toHand(declined,0,'AOT-2-067');
 declined.players[0].hand.push(fromDeck(declined,0,'AOT-2-063'),fromDeck(declined,0,'AOT-2-063'));
 declined=raidOnto(declined,raider.uid,seat.uid);
 declined=pick(declined,a=>a.mode==='battle');
 declined=pick(declined,a=>a.uid===wall.uid);
 assert.equal(acts(declined).some(a=>a.mode==='done'),true);
 declined=pick(declined,a=>a.mode==='done');
 assert.equal(declined.players[1].front.some(c=>c?.uid===wall.uid),true);
 finish(declined);
});

test('Q1565 judges the 5000 line on current BP and ignores the standing bonus',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-067','AOT-2-069','AOT-2-063','AOT-1-069','AOT-1-061']);
 let raised=toPhase(fresh(counts,15651),'main');
 fuel(raised,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const base=put(raised,0,'AOT-2-066','front',0,true);
 put(raised,0,'AOT-2-069','front',1,true);
 const conny=put(raised,1,'AOT-2-063','front',0,true);
 conny.buffs=[{bp:3000,untilTurn:raised.turn}];
 assert.equal(universalBp(packs,raised,conny),5000);
 readyAp(raised);
 const raider=toHand(raised,0,'AOT-2-067');
 toHand(raised,0,'AOT-2-063');
 toHand(raised,0,'AOT-2-063');
 raised=raidOnto(raised,raider.uid,base.uid);
 raised=pick(raised,a=>a.mode==='battle');
 raised=pick(raised,a=>a.uid===conny.uid);
 assert.equal(raised.pending.step,'discard');
 finish(raised);

 let lowered=toPhase(fresh(counts,15652),'main');
 fuel(lowered,['AOT-1-069','AOT-1-069','AOT-1-069']);
 const seat=put(lowered,0,'AOT-2-066','front',0,true);
 put(lowered,0,'AOT-2-069','front',1,true);
 const armored=put(lowered,1,'AOT-1-061','front',0,true);
 armored.buffs=[{bp:-1000,untilTurn:lowered.turn}];
 assert.equal(universalBp(packs,lowered,armored),4000);
 readyAp(lowered);
 const copy=toHand(lowered,0,'AOT-2-067');
 toHand(lowered,0,'AOT-2-063');
 toHand(lowered,0,'AOT-2-063');
 lowered=raidOnto(lowered,copy.uid,seat.uid);
 lowered=pick(lowered,a=>a.mode==='battle');
 lowered=pick(lowered,a=>a.uid===armored.uid);
 assert.equal(lowered.pending,null);
 assert.equal(lowered.players[1].front.some(c=>c?.uid===armored.uid),true);
 finish(lowered);
});

test('Bertolt cuts two red only when the Colossal Titan raids onto him',()=>{
 const counts=countsFor(['AOT-2-068','AOT-2-069','AOT-1-069','AOT-1-070','AOT-2-066','AOT-2-013','AOT-2-013']);
 let s=toPhase(fresh(counts,68),'main');
 fuel(s,['AOT-1-069','AOT-1-070']);
 const host=put(s,0,'AOT-2-068','energy',2,true);
 const other=put(s,0,'AOT-2-013','front',0,true);
 readyAp(s);
 const red=toHand(s,0,'AOT-2-069');
 assert.equal(acts(s).some(a=>a.type==='play'&&a.uid===red.uid),false);
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===red.uid&&a.baseUid===host.uid),false);
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===red.uid&&a.baseUid===other.uid),false);
 put(s,0,'AOT-2-066','energy',3,true);
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===red.uid&&a.baseUid===host.uid),true);
 assert.equal(acts(s).some(a=>a.type==='play'&&a.uid===red.uid),false);
 const yellow=toHand(s,0,'AOT-2-013');
 assert.equal(acts(s).some(a=>a.type==='raid'&&a.uid===yellow.uid&&a.baseUid===host.uid),false);
 s=raidOnto(s,red.uid,host.uid);
 assert.equal(s.players[0].hand.length>=3,true);
 finish(s);
});

test('the Colossal Titan draws three only from the front raid and shrinks the front',()=>{
 const counts=countsFor(['AOT-2-068','AOT-2-069','AOT-1-069','AOT-1-070','AOT-2-066','AOT-2-001']);
 let front=toPhase(fresh(counts,69),'main');
 fuel(front,['AOT-1-069','AOT-1-070','AOT-1-069','AOT-1-070']);
 const host=put(front,0,'AOT-2-068','front',0,true);
 readyAp(front);
 const colossal=toHand(front,0,'AOT-2-069');
 const deck=front.players[0].deck.length;
 const hand=front.players[0].hand.length;
 front=raidOnto(front,colossal.uid,host.uid);
 assert.equal(front.players[0].deck.length,deck-3);
 assert.equal(front.players[0].hand.length,hand+2);
 assert.equal(front.players[0].aotFrontLimit,3);
 finish(front);

 let energy=toPhase(fresh(counts,691),'main');
 fuel(energy,['AOT-1-069','AOT-1-070','AOT-2-066']);
 const base=put(energy,0,'AOT-2-068','energy',3,true);
 readyAp(energy);
 const titan=toHand(energy,0,'AOT-2-069');
 const held=energy.players[0].hand.length;
 energy=raidOnto(energy,titan.uid,base.uid,'energy');
 assert.equal(energy.players[0].hand.length,held-1);
 assert.equal(energy.players[0].aotFrontLimit,undefined);
 assert.equal(universalImpact(packs,energy,field(energy,0,titan.uid)),1);
 const stood=put(energy,0,'AOT-2-069','front',0,true);
 energy=use(energy,{type:'next'});
 assert.equal(energy.players[0].aotFrontLimit,3);
 assert.equal(universalImpact(packs,energy,field(energy,0,stood.uid)),0);
 finish(energy);
});

test('Eren publishes only the corps card he keeps, then must discard',()=>{
 const counts=countsFor(['AOT-2-070','AOT-2-062','AOT-2-063','AOT-2-001','AOT-1-069']);
 let skipped=toPhase(fresh(counts,70),'main');
 fuel(skipped,['AOT-1-069']);
 readyAp(skipped);
 stackTop(skipped,0,['AOT-2-001','AOT-2-063','AOT-2-062']);
 const window=skipped.players[0].deck.slice(0,3).map(c=>c.uid);
 skipped=play(skipped,toHand(skipped,0,'AOT-2-070').uid);
 assert.equal(universalPrivateChoices(packs,skipped,1),null);
 assertHidden(skipped,window);
 skipped=pick(skipped,a=>a.uid==null);
 skipped=orderExact(skipped,[...window].reverse());
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(-3).map(c=>c.uid),[...window].reverse());
 finish(skipped);

 let taken=toPhase(fresh(counts,701),'main');
 fuel(taken,['AOT-1-069']);
 readyAp(taken);
 stackTop(taken,0,['AOT-2-062','AOT-2-063','AOT-2-001']);
 const top=taken.players[0].deck[0];
 const corps=taken.players[0].deck[1];
 const rest=taken.players[0].deck.slice(0,3).map(c=>c.uid).filter(uid=>uid!==corps.uid);
 taken=play(taken,toHand(taken,0,'AOT-2-070').uid);
 assert.equal(top.cardId==='AOT-2-062',true);
 assert.equal(acts(taken).some(a=>a.uid===top.uid),false);
 taken=pick(taken,a=>a.uid===corps.uid);
 assertSeen(taken,[corps.uid],'searched-to-hand');
 taken=orderExact(taken,rest);
 assert.equal(taken.pending.kind,'effect-discard');
 assert.equal(acts(taken).some(a=>a.uid==null||a.mode==='done'),false);
 const discard=taken.players[0].hand.find(c=>c.uid!==corps.uid);
 taken=pick(taken,a=>a.uid===discard.uid);
 assert.equal(taken.players[0].hand.some(c=>c.uid===corps.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===discard.uid),true);
 finish(taken);
});

test('Eren adds a hidden life, then looks or draws from the printed life count',()=>{
 const counts=countsFor(['AOT-2-071','AOT-2-063','AOT-2-070','AOT-2-001','AOT-1-069']);
 let main=toPhase(fresh(counts,71),'main');
 const eren=put(main,0,'AOT-2-071','front',0,true);
 setLife(main,0,2);
 const trigger=take(main,0,'AOT-2-070');
 main.players[0].deck.push(main.players[0].life[0]);
 main.players[0].life[0]=trigger;
 main=use(main,{type:'activate',uid:eren.uid,mode:'aot2:AOT-2-071'});
 assert.equal(main.pending.step,'life');
 assert.equal(universalPrivateChoices(packs,main,0).options.every(o=>o.card===null),true);
 assert.equal(universalPrivateChoices(packs,main,1),null);
 assertHidden(main,[trigger.uid]);
 main=pick(main,a=>a.uid===trigger.uid);
 assert.equal(main.pending?.kind==='life-trigger',false);
 assert.equal(main.players[0].hand.some(c=>c.uid===trigger.uid),true);
 assert.equal(universalImpact(packs,main,field(main,0,eren.uid)),1);
 assert.equal(acts(main).some(a=>a.type==='activate'&&a.uid===eren.uid),false);
 assert.equal(universalPublicView(packs,main,1).publicReveals.some(e=>e.uid===trigger.uid),false);
 finish(main);

 let look=toPhase(fresh(counts,711),'attack');
 const body=put(look,0,'AOT-2-071','front',0,true);
 const oppLife=look.players[1];
 while(oppLife.life.length)oppLife.deck.push(oppLife.life.pop());
 const blanks=oppLife.deck.filter(c=>!pack.cards[c.cardId].trigger).slice(0,4);
 for(const card of blanks){oppLife.deck.splice(oppLife.deck.indexOf(card),1);oppLife.life.push(card);}
 setLife(look,0,4);
 stackTop(look,0,['AOT-2-070']);
 const top=look.players[0].deck[0];
 look=swing(look,body.uid);
 assert.equal(look.pending.step,'top');
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assertHidden(look,[top.uid]);
 look=pick(look,a=>a.mode==='hand');
 assertSeen(look,[top.uid]);
 assert.equal(look.players[0].hand.some(c=>c.uid===top.uid),true);
 finish(look);

 let draw=toPhase(fresh(counts,712),'attack');
 const copy=put(draw,0,'AOT-2-071','front',0,true);
 blankLife(draw,1,2);
 setLife(draw,0,3);
 const hand=draw.players[0].hand.length;
 draw=swing(draw,copy.uid);
 assert.equal(draw.pending,null);
 assert.equal(draw.players[0].hand.length,hand+1);
 finish(draw);
});

test('the Attack Titan keeps BP until the next own start and offers the printed modes',()=>{
 const counts=countsFor(['AOT-2-071','AOT-2-072','AOT-1-069','AOT-1-070','AOT-2-062','AOT-2-001','AOT-2-013']);
 let wide=toPhase(fresh(counts,72),'main');
 fuel(wide,['AOT-1-069','AOT-1-070','AOT-2-062','AOT-1-069']);
 const host=put(wide,0,'AOT-2-071','front',0,true);
 const low=put(wide,1,'AOT-2-001','front',0,true);
 const mid=put(wide,1,'AOT-2-013','front',1,true);
 setLife(wide,0,4);
 readyAp(wide);
 wide=raidOnto(wide,toHand(wide,0,'AOT-2-072').uid,host.uid);
 const titan=wide.players[0].front.find(c=>c?.cardId==='AOT-2-072');
 assert.equal(universalBp(packs,wide,titan),5000);
 const modes=acts(wide).map(a=>a.mode);
 assert.equal(modes.includes('low'),true);
 assert.equal(modes.includes('life'),true);
 assert.equal(modes.includes('bare'),false);
 wide=pick(wide,a=>a.mode==='low');
 assert.equal(acts(wide).some(a=>a.uid===low.uid),true);
 assert.equal(acts(wide).some(a=>a.uid===mid.uid),false);
 wide=pick(wide,a=>a.mode==='done');
 wide=toSide(wide,1,'main');
 assert.equal(universalBp(packs,wide,field(wide,0,titan.uid)),5000);
 wide=toSide(wide,0,'start');
 assert.equal(universalBp(packs,wide,field(wide,0,titan.uid)),4000);
 finish(wide);

 let bare=toPhase(fresh(counts,721),'main');
 fuel(bare,['AOT-1-069','AOT-1-070','AOT-2-062','AOT-1-069']);
 const home=put(bare,0,'AOT-2-071','front',0,true);
 setLife(bare,0,3);
 const hidden=bare.players[0].life[0];
 const five=put(bare,1,'AOT-2-001','front',0,true);
 readyAp(bare);
 bare=raidOnto(bare,toHand(bare,0,'AOT-2-072').uid,home.uid);
 assert.equal(acts(bare).some(a=>a.mode==='bare'),true);
 bare=pick(bare,a=>a.mode==='life');
 assert.equal(universalPrivateChoices(packs,bare,1),null);
 assertHidden(bare,[hidden.uid]);
 bare=pick(bare,a=>a.uid===hidden.uid);
 assert.equal(bare.pending?.kind==='life-trigger',false);
 assert.equal(bare.players[0].hand.some(c=>c.uid===hidden.uid),true);
 assert.equal(acts(bare).some(a=>a.uid===five.uid),true);
 bare=pick(bare,a=>a.mode==='done');
 finish(bare);
});

test('the seafood event draws the count of the chosen mode and may buff zero',()=>{
 const counts=countsFor(['AOT-2-073','AOT-2-063','AOT-1-069','AOT-1-070','AOT-2-062']);
 let s=toPhase(fresh(counts,73),'main');
 fuel(s,['AOT-1-069','AOT-1-070','AOT-2-062']);
 const one=put(s,0,'AOT-2-063','front',0,true);
 const two=put(s,0,'AOT-2-063','energy',3,true);
 readyAp(s);
 const hand=s.players[0].hand.length;
 s=cast(s,toHand(s,0,'AOT-2-073').uid);
 assert.equal(acts(s).map(a=>a.mode).sort().join(),'one,three,two');
 s=pick(s,a=>a.mode==='one');
 assert.equal(acts(s).some(a=>a.uid===one.uid),true);
 assert.equal(acts(s).some(a=>a.uid===two.uid),true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalBp(packs,s,field(s,0,one.uid)),2000);
 finish(s);

 let many=toPhase(fresh(counts,731),'main');
 fuel(many,['AOT-1-069','AOT-1-070','AOT-2-062']);
 const first=put(many,0,'AOT-2-063','front',0,true);
 const second=put(many,0,'AOT-2-063','front',1,true);
 const third=put(many,0,'AOT-2-063','energy',3,true);
 readyAp(many);
 const before=many.players[0].hand.length;
 many=cast(many,toHand(many,0,'AOT-2-073').uid);
 many=pick(many,a=>a.mode==='three');
 many=pick(many,a=>a.uid===first.uid);
 many=pick(many,a=>a.uid===second.uid);
 many=pick(many,a=>a.uid===third.uid);
 assert.equal(many.players[0].hand.length,before);
 assert.equal(universalBp(packs,many,field(many,0,third.uid)),3000);
 finish(many);
});
