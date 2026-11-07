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
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.id||'')+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function toSide(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.id||'')+' '+(s.pending.step||'')+' blocked '+player+' '+phase);
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
 if(!action)throw Error('No event for '+uid+' '+JSON.stringify(acts(s).filter(a=>a.uid===uid).slice(0,3)));
 return use(s,action);
}
function pick(s,pred){
 const actions=acts(s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.id||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(actions.slice(0,8)));
 return use(s,action);
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
function assertSeen(s,uids){
 const shown=universalPublicView(packs,s,1).publicReveals.map(entry=>entry.uid);
 for(const uid of uids)assert.equal(shown.includes(uid),true,uid);
}
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.step==='lookOrder'||s.pending.kind==='effect-top-order')){
  s=pick(s,a=>true);
  if(++guard>12)throw Error('order did not finish');
 }
 return s;
}
function orderAs(s,uids){
 for(const uid of uids){
  if(!s.pending||(s.pending.kind!=='effect-top-order'&&s.pending.step!=='lookOrder'))break;
  s=pick(s,a=>a.uid===uid);
 }
 return s;
}
function passBlock(s){
 if(s.pending?.kind!=='block')return s;
 return pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
}
function swing(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='attack-pay'||s.pending?.step==='pay')
  s=pick(s,a=>a.mode==='skip'||a.uid==null);
 return s;
}
function quietLife(s,p,n=3){
 const pl=s.players[p];
 while(pl.life.length)pl.deck.push(pl.life.pop());
 const blanks=pl.deck.filter(c=>!pack.cards[c.cardId].trigger).slice(0,n);
 assert.equal(blanks.length,n);
 for(const card of blanks){
  pl.deck.splice(pl.deck.indexOf(card),1);
  pl.life.push(card);
 }
}
function keepOnly(s,p,uids){
 const pl=s.players[p];
 const keep=new Set(uids);
 for(let i=pl.hand.length-1;i>=0;i--){
  if(keep.has(pl.hand[i].uid))continue;
  pl.deck.push(pl.hand.splice(i,1)[0]);
 }
}
function raidOnto(s,id,baseUid,line){
 const card=toHand(s,0,id);
 const action=acts(s).find(a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===baseUid&&
  (line?a.line===line:!a.line||a.line==='front'));
 if(!action)throw Error('No raid '+id+' onto '+baseUid+' '+(line||'front'));
 return {s:use(s,action),card};
}
function dropCapacity(s,prefer){
 let guard=0;
 while(s.pending?.id==='capacity'){
  s=pick(s,a=>a.uid===prefer);
  if(++guard>4)throw Error('capacity did not finish');
 }
 return s;
}

test('051-073 print the life symbols on the card',()=>{
 for(const [id,trigger] of Object.entries(LIFE))
  assert.equal(pack.cards[id].trigger,trigger,id);
});

test('Falco activates on the energy line, then discards and buffs another warrior',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-056']);
 let rested=toPhase(fresh(counts,5101),'main');
 put(rested,0,'AOT-2-054','energy',0,true);
 put(rested,0,'AOT-2-055','energy',1,true);
 put(rested,0,'AOT-2-057','energy',2,true);
 readyAp(rested,0,1);
 const front=toHand(rested,0,'AOT-2-051');
 rested=play(rested,front.uid,'front');
 assert.equal(field(rested,0,front.uid).ready,false);
 assert.equal(rested.pending,null);

 let live=toPhase(fresh(counts,5102),'main');
 put(live,0,'AOT-2-054','energy',0,true);
 put(live,0,'AOT-2-057','energy',1,true);
 put(live,0,'AOT-2-054','energy',2,true);
 const warrior=put(live,0,'AOT-2-055','front',0,true);
 readyAp(live,0,1);
 const falco=toHand(live,0,'AOT-2-051');
 live=play(live,falco.uid,'energy');
 assert.equal(field(live,0,falco.uid).ready,true);
 const spare=toHand(live,0,'AOT-2-054');
 keepOnly(live,0,[spare.uid]);
 assert.equal(acts(live).some(a=>a.type==='activate'&&a.uid===falco.uid),true);
 live=use(live,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-051'});
 assert.equal(field(live,0,falco.uid).ready,false);
 assert.equal(live.pending.step,'discardRaid');
 assert.equal(acts(live).some(a=>a.mode==='done'),false);
 live=pick(live,a=>a.uid===spare.uid);
 assert.equal(live.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(live.pending.step,'raidBuff');
 assert.equal(acts(live).some(a=>a.uid===falco.uid),false);
 assert.equal(acts(live).some(a=>a.mode==='done'),false);
 live=pick(live,a=>a.uid===warrior.uid);
 assert.equal(universalBp(packs,live,field(live,0,warrior.uid)),3000);
 assert.equal(universalBp(packs,live,field(live,0,falco.uid)),2000);
 assertUniversalMatch(packs,live);
});

test('Falco gives a raided warrior 2000 and does not buff himself',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-054','AOT-2-055','AOT-2-056','AOT-2-057']);
 let s=toPhase(fresh(counts,5103),'main');
 put(s,0,'AOT-2-055','energy',0,true);
 put(s,0,'AOT-2-057','energy',1,true);
 put(s,0,'AOT-2-051','energy',2,true);
 const host=put(s,0,'AOT-2-054','front',0,true);
 readyAp(s,0,2);
 const raided=raidOnto(s,'AOT-2-056',host.uid);
 s=raided.s;
 assert.equal(s.pending.id,'AOT-2-056');
 s=pick(s,a=>a.mode==='skip');
 const falco=toHand(s,0,'AOT-2-051');
 s=play(s,falco.uid,'front');
 field(s,0,falco.uid).ready=true;
 const spare=toHand(s,0,'AOT-2-057');
 keepOnly(s,0,[spare.uid]);
 s=use(s,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-051'});
 s=pick(s,a=>a.uid===spare.uid);
 assert.equal(acts(s).some(a=>a.uid===falco.uid),false);
 s=pick(s,a=>a.uid===raided.card.uid);
 assert.equal(universalBp(packs,s,field(s,0,raided.card.uid)),6000);
 assert.equal(universalBp(packs,s,field(s,0,falco.uid)),2000);
 assertUniversalMatch(packs,s);
});

test('Zeke looks at five privately and does not discard a hand card',()=>{
 const counts=countsFor(['AOT-2-052','AOT-2-054','AOT-2-055','AOT-2-057','AOT-1-040','AOT-2-001']);
 let s=toPhase(fresh(counts,5201),'main');
 put(s,0,'AOT-2-054','energy',0,true);
 put(s,0,'AOT-2-055','energy',1,true);
 put(s,0,'AOT-2-057','energy',2,true);
 readyAp(s,0,1);
 const spare=toHand(s,0,'AOT-2-052');
 keepOnly(s,0,[spare.uid]);
 stackTop(s,0,['AOT-2-001','AOT-2-054','AOT-1-040','AOT-2-055','AOT-2-001']);
 const window=s.players[0].deck.slice(0,5);
 const titan=window.find(c=>c.cardId==='AOT-1-040');
 const hand=s.players[0].hand.length;
 const actorAt=s.players[0].deck.findIndex(c=>c.cardId==='AOT-2-052');
 const actor=s.players[0].deck.splice(actorAt,1)[0];
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid).sort(),window.map(c=>c.uid).sort());
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,window.map(c=>c.uid));
 s=pick(s,a=>a.uid==null);
 s=orderRest(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].deck.some(c=>c.uid===titan.uid),true);
 assertHidden(s,window.map(c=>c.uid));

 let taken=toPhase(fresh(counts,5202),'main');
 put(taken,0,'AOT-2-054','energy',0,true);
 put(taken,0,'AOT-2-055','energy',1,true);
 put(taken,0,'AOT-2-057','energy',2,true);
 readyAp(taken,0,1);
 const held=toHand(taken,0,'AOT-2-052');
 keepOnly(taken,0,[held.uid]);
 stackTop(taken,0,['AOT-2-001','AOT-2-054','AOT-1-040','AOT-2-055','AOT-2-001']);
 const seen=taken.players[0].deck.slice(0,5);
 const pure=seen.find(c=>c.cardId==='AOT-1-040');
 const before=taken.players[0].hand.length;
 const playedAt=taken.players[0].deck.findIndex(c=>c.cardId==='AOT-2-052');
 const played=taken.players[0].deck.splice(playedAt,1)[0];
 taken.players[0].hand.push(played);
 taken=play(taken,played.uid);
 taken=pick(taken,a=>a.uid===pure.uid);
 assertSeen(taken,[pure.uid]);
 assertHidden(taken,seen.filter(c=>c.uid!==pure.uid).map(c=>c.uid));
 const rest=seen.filter(c=>c.uid!==pure.uid).map(c=>c.uid);
 taken=orderAs(taken,rest);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.filter(c=>c.uid===pure.uid||c.uid===held.uid).length,2);
 assert.equal(taken.players[0].hand.length,before+1);
 assert.deepEqual(taken.players[0].deck.slice(-rest.length).map(c=>c.uid).sort(),[...rest].sort());
 assert.equal(rest.includes(taken.players[0].deck[0].uid),false);
 assertUniversalMatch(packs,taken);
});

test('the Beast Titan retires only from the raid frame, then may pay to rest a pure titan',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-052','AOT-2-053','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-058','AOT-1-040']);
 let plain=toPhase(fresh(counts,5301),'main');
 put(plain,0,'AOT-2-051','energy',0,true);
 put(plain,0,'AOT-2-052','energy',1,true);
 put(plain,0,'AOT-2-054','energy',2,true);
 put(plain,0,'AOT-2-055','energy',3,true);
 put(plain,1,'AOT-2-057','front',0,true);
 readyAp(plain,0,1);
 const played=toHand(plain,0,'AOT-2-053');
 plain=play(plain,played.uid);
 assert.equal(plain.pending,null);
 assert.equal(field(plain,0,played.uid).ready,false);
 assert.equal(plain.players[1].front.filter(Boolean).length,1);

 let skipped=toPhase(fresh(counts,5302),'main');
 put(skipped,0,'AOT-2-051','energy',0,true);
 put(skipped,0,'AOT-2-054','energy',1,true);
 put(skipped,0,'AOT-2-055','energy',2,true);
 put(skipped,0,'AOT-2-057','energy',3,true);
 const host=put(skipped,0,'AOT-2-052','front',0,true);
 const low=put(skipped,1,'AOT-2-057','front',0,true);
 const high=put(skipped,1,'AOT-2-058','front',1,true);
 const titan=toOutside(skipped,0,'AOT-1-040');
 readyAp(skipped,0,2);
 const body=raidOnto(skipped,'AOT-2-053',host.uid);
 skipped=body.s;
 assert.equal(skipped.pending.step,'retire');
 const offered=acts(skipped).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(offered.includes(low.uid),true);
 assert.equal(offered.includes(high.uid),false);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.pending,null);
 assert.equal(field(skipped,1,low.uid)!==null,true);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===titan.uid),true);

 let paid=toPhase(fresh(counts,5303),'main');
 put(paid,0,'AOT-2-051','energy',0,true);
 put(paid,0,'AOT-2-054','energy',1,true);
 put(paid,0,'AOT-2-055','energy',2,true);
 put(paid,0,'AOT-2-057','energy',3,true);
 const zeke=put(paid,0,'AOT-2-052','front',0,true);
 const victim=put(paid,1,'AOT-2-057','front',0,true);
 const pure=toOutside(paid,0,'AOT-1-040');
 readyAp(paid,0,2);
 const beast=raidOnto(paid,'AOT-2-053',zeke.uid);
 paid=beast.s;
 paid=pick(paid,a=>a.uid===victim.uid);
 assert.equal(paid.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(paid.pending.step,'payEnter');
 assert.equal(acts(paid).some(a=>a.mode==='skip'),true);
 assert.equal(acts(paid).filter(a=>a.mode==='enter'&&a.uid===pure.uid).every(a=>a.ready===false),true);
 paid=pick(paid,a=>a.mode==='enter'&&a.uid===pure.uid);
 assert.equal(field(paid,0,pure.uid).ready,false);
 assert.equal(paid.players[0].apCards.filter(c=>c.ready).length,0);
 assertUniversalMatch(packs,paid);
});

test('Pieck may buff nothing, and a raided warrior gains 2000 without buffing Pieck',()=>{
 const counts=countsFor(['AOT-2-054','AOT-2-055','AOT-2-056','AOT-2-057','AOT-2-051']);
 let none=toPhase(fresh(counts,5501),'main');
 put(none,0,'AOT-2-054','energy',0,true);
 const other=put(none,0,'AOT-2-057','front',0,true);
 readyAp(none,0,1);
 none=play(none,toHand(none,0,'AOT-2-055').uid);
 assert.equal(none.pending.step,'raidBuff');
 assert.equal(acts(none).some(a=>a.mode==='done'),true);
 none=pick(none,a=>a.mode==='done');
 assert.equal(universalBp(packs,none,field(none,0,other.uid)),2000);

 let raid=toPhase(fresh(counts,5502),'main');
 put(raid,0,'AOT-2-055','energy',0,true);
 put(raid,0,'AOT-2-057','energy',1,true);
 put(raid,0,'AOT-2-051','energy',2,true);
 const host=put(raid,0,'AOT-2-054','front',0,true);
 readyAp(raid,0,2);
 const cart=raidOnto(raid,'AOT-2-056',host.uid);
 raid=cart.s;
 raid=pick(raid,a=>a.mode==='skip');
 raid=play(raid,toHand(raid,0,'AOT-2-055').uid);
 assert.equal(acts(raid).some(a=>a.uid===raid.players[0].front.find(c=>c?.cardId==='AOT-2-055').uid),false);
 raid=pick(raid,a=>a.uid===cart.card.uid);
 const pieck=raid.players[0].front.find(c=>c?.cardId==='AOT-2-055');
 assert.equal(universalBp(packs,raid,field(raid,0,cart.card.uid)),6000);
 assert.equal(universalBp(packs,raid,pieck),2000);
 assertUniversalMatch(packs,raid);
});

test('ordinary Cart Titan has no raid-frame impact, and the raid may attack from energy',()=>{
 const counts=countsFor(['AOT-2-054','AOT-2-055','AOT-2-056','AOT-2-057','AOT-2-051','AOT-2-052','AOT-2-063']);
 let ordinary=toPhase(fresh(counts,5601),'main');
 put(ordinary,0,'AOT-2-052','energy',0,true);
 put(ordinary,0,'AOT-2-051','energy',1,true);
 put(ordinary,0,'AOT-2-055','energy',2,true);
 put(ordinary,0,'AOT-2-057','energy',3,true);
 readyAp(ordinary,0,1);
 const played=toHand(ordinary,0,'AOT-2-056');
 ordinary=play(ordinary,played.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(universalImpact(packs,ordinary,field(ordinary,0,played.uid)),0);

 let live=toPhase(fresh(counts,5602),'main');
 put(live,0,'AOT-2-052','energy',0,true);
 put(live,0,'AOT-2-051','energy',1,true);
 put(live,0,'AOT-2-055','energy',2,true);
 const host=put(live,0,'AOT-2-054','energy',3,true);
 const blocker=put(live,1,'AOT-2-063','front',0,true);
 blocker.ready=true;
 readyAp(live,0,1);
 quietLife(live,1,3);
 const cart=raidOnto(live,'AOT-2-056',host.uid,'energy');
 live=cart.s;
 const body=field(live,0,cart.card.uid);
 assert.equal(universalImpact(packs,live,body),0);
 assert.equal(live.players[0].energy.some(c=>c?.uid===cart.card.uid),true);
 live=pick(live,a=>a.mode==='down');
 assert.equal(universalBp(packs,live,field(live,0,cart.card.uid)),2000);
 assert.equal(field(live,0,cart.card.uid).aot2EnergyAttack.turn,live.turn);
 assert.equal(field(live,0,cart.card.uid).aot2Sniper.turn,live.turn);
 live=toPhase(live,'attack');
 const aimed=acts(live).find(a=>a.type==='attack'&&a.uid===cart.card.uid&&a.targetUid===blocker.uid);
 const open=acts(live).find(a=>a.type==='attack'&&a.uid===cart.card.uid&&!a.targetUid);
 assert.ok(aimed,'sniper may designate the front character');
 assert.ok(open,'an undesignated energy-line attack stays available');
 live=use(live,open);
 assert.equal(live.pending.kind,'block');
 live=pick(live,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assertUniversalMatch(packs,live);
});

test('Jaw Titan searches only while raided, and draws on attack at 6000',()=>{
 const counts=countsFor(['AOT-2-057','AOT-2-058','AOT-2-054','AOT-2-055','AOT-2-051','AOT-2-001']);
 let plain=toPhase(fresh(counts,5801),'main');
 put(plain,0,'AOT-2-054','energy',0,true);
 put(plain,0,'AOT-2-055','energy',1,true);
 put(plain,0,'AOT-2-051','energy',2,true);
 put(plain,0,'AOT-2-057','energy',3,true);
 readyAp(plain,0,1);
 stackTop(plain,0,['AOT-2-001','AOT-2-054','AOT-2-055','AOT-2-051']);
 plain=play(plain,toHand(plain,0,'AOT-2-058').uid);
 assert.equal(plain.pending,null);

 let raid=toPhase(fresh(counts,5802),'main');
 put(raid,0,'AOT-2-054','energy',0,true);
 put(raid,0,'AOT-2-055','energy',1,true);
 put(raid,0,'AOT-2-051','energy',2,true);
 const host=put(raid,0,'AOT-2-057','front',0,true);
 readyAp(raid,0,2);
 stackTop(raid,0,['AOT-2-001','AOT-2-054','AOT-2-055','AOT-2-051']);
 const window=raid.players[0].deck.slice(0,4);
 const warrior=window.find(c=>c.cardId==='AOT-2-055');
 const jaw=raidOnto(raid,'AOT-2-058',host.uid);
 raid=jaw.s;
 assert.equal(raid.pending.kind,'effect-top-filter-choice');
 assertHidden(raid,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,raid,1),null);
 raid=pick(raid,a=>a.uid===warrior.uid);
 assertSeen(raid,[warrior.uid]);
 raid=orderRest(raid);
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].hand.some(c=>c.uid===warrior.uid),true);
 const before=raid.players[0].hand.length;
 raid=toSide(raid,0,'attack');
 quietLife(raid,1,3);
 raid=swing(raid,jaw.card.uid);
 raid=passBlock(raid);
 assert.equal(raid.players[0].hand.length,before);
 assert.equal(universalBp(packs,raid,field(raid,0,jaw.card.uid)),4000);

 let tall=toPhase(fresh(counts,5803),'main');
 put(tall,0,'AOT-2-054','energy',0,true);
 put(tall,0,'AOT-2-051','energy',1,true);
 put(tall,0,'AOT-2-057','energy',2,true);
 const porco=put(tall,0,'AOT-2-057','front',1,true);
 readyAp(tall,0,2);
 stackTop(tall,0,['AOT-2-001','AOT-2-001','AOT-2-001','AOT-2-001']);
 const raised=raidOnto(tall,'AOT-2-058',porco.uid);
 tall=raised.s;
 assert.equal(tall.pending.kind,'effect-top-order');
 tall=orderRest(tall);
 tall=play(tall,toHand(tall,0,'AOT-2-055').uid);
 tall=pick(tall,a=>a.uid===raised.card.uid);
 assert.equal(universalBp(packs,tall,field(tall,0,raised.card.uid)),6000);
 const drawn=tall.players[0].hand.length;
 tall=toSide(tall,0,'attack');
 quietLife(tall,1,3);
 tall=swing(tall,raised.card.uid);
 tall=passBlock(tall);
 assert.equal(tall.players[0].hand.length,drawn+1);
 assertUniversalMatch(packs,tall);
});

test('the triple name is a legal Armored Titan raid base',()=>{
 const counts=countsFor(['AOT-2-059','AOT-2-060','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-051','AOT-2-001']);
 let s=toPhase(fresh(counts,5901),'main');
 put(s,0,'AOT-2-054','energy',0,true);
 put(s,0,'AOT-2-055','energy',1,true);
 put(s,0,'AOT-2-057','energy',2,true);
 put(s,0,'AOT-2-051','energy',3,true);
 const alias=put(s,0,'AOT-2-059','front',0,true);
 const other=put(s,0,'AOT-2-001','front',1,true);
 readyAp(s,0,1);
 const armored=toHand(s,0,'AOT-2-060');
 const raids=acts(s).filter(a=>a.type==='raid'&&a.uid===armored.uid);
 assert.equal(raids.some(a=>a.baseUid===alias.uid),true);
 assert.equal(raids.some(a=>a.baseUid===other.uid),false);
 s=use(s,raids.find(a=>a.baseUid===alias.uid));
 assert.equal(universalImpactNull(packs,s,field(s,0,armored.uid)),true);
 assert.equal(s.pending.step,'discardBuff');
 const spare=toHand(s,0,'AOT-2-001');
 keepOnly(s,0,[spare.uid]);
 s=pick(s,a=>a.mode==='done');
 assert.equal(universalBp(packs,s,field(s,0,armored.uid)),4000);
 assert.equal(s.players[0].hand.some(c=>c.uid===spare.uid),true);

 let buffed=toPhase(fresh(counts,5902),'main');
 put(buffed,0,'AOT-2-054','energy',0,true);
 put(buffed,0,'AOT-2-055','energy',1,true);
 put(buffed,0,'AOT-2-057','energy',2,true);
 put(buffed,0,'AOT-2-051','energy',3,true);
 const base=put(buffed,0,'AOT-2-059','front',0,true);
 const discard=toHand(buffed,0,'AOT-2-001');
 keepOnly(buffed,0,[discard.uid]);
 readyAp(buffed,0,1);
 const copy=raidOnto(buffed,'AOT-2-060',base.uid);
 buffed=copy.s;
 buffed=pick(buffed,a=>a.uid===discard.uid);
 assert.equal(universalBp(packs,buffed,field(buffed,0,copy.card.uid)),6000);
 assert.equal(buffed.players[0].outside.some(c=>c.uid===discard.uid),true);
 const hand=buffed.players[0].hand.length;
 buffed=toSide(buffed,0,'attack');
 quietLife(buffed,1,3);
 buffed=swing(buffed,copy.card.uid);
 buffed=passBlock(buffed);
 assert.equal(buffed.players[0].hand.length,hand+1);
 assert.equal(universalImpact(packs,buffed,field(buffed,0,copy.card.uid)),1);
 assertUniversalMatch(packs,buffed);
});

test('the ambush reads the outside Pieck after the retire, then may take one back',()=>{
 const counts=countsFor(['AOT-2-061','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-058','AOT-2-056','AOT-2-051','AOT-2-052','AOT-2-059']);
 let narrow=toPhase(fresh(counts,6101),'main');
 put(narrow,0,'AOT-2-052','energy',0,true);
 put(narrow,0,'AOT-2-051','energy',1,true);
 put(narrow,0,'AOT-2-057','energy',2,true);
 put(narrow,0,'AOT-2-059','energy',3,true);
 const low=put(narrow,1,'AOT-2-057','front',0,true);
 const mid=put(narrow,1,'AOT-2-058','front',1,true);
 readyAp(narrow,0,1);
 narrow=cast(narrow,toHand(narrow,0,'AOT-2-061').uid);
 assert.equal(narrow.pending.step,'retire');
 const first=acts(narrow).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(first.includes(low.uid),true);
 assert.equal(first.includes(mid.uid),false);
 narrow=pick(narrow,a=>a.mode==='done');
 assert.equal(narrow.pending,null);
 assert.equal(field(narrow,1,low.uid)!==null,true);

 let wide=toPhase(fresh(counts,6102),'main');
 put(wide,0,'AOT-2-054','energy',0,true);
 put(wide,0,'AOT-2-057','energy',1,true);
 put(wide,0,'AOT-2-051','energy',2,true);
 put(wide,0,'AOT-2-051','energy',3,true);
 const mine=put(wide,0,'AOT-2-055','front',0,true);
 const small=put(wide,1,'AOT-2-057','front',0,true);
 const tall=put(wide,1,'AOT-2-058','front',1,true);
 readyAp(wide,0,1);
 wide=cast(wide,toHand(wide,0,'AOT-2-061').uid);
 assert.equal(wide.pending.step,'ownRetire');
 wide=pick(wide,a=>a.uid===mine.uid);
 assert.equal(wide.players[0].outside.some(c=>c.uid===mine.uid),true);
 assert.equal(wide.pending.step,'retire');
 const second=acts(wide).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(second.includes(small.uid),true);
 assert.equal(second.includes(tall.uid),true);
 wide=pick(wide,a=>a.mode==='done');
 assert.equal(wide.pending.step,'pick');
 assert.equal(acts(wide).some(a=>a.uid===mine.uid),true);
 wide=pick(wide,a=>a.uid===mine.uid);
 assert.equal(wide.players[0].hand.some(c=>c.uid===mine.uid),true);
 assert.equal(field(wide,1,tall.uid)!==null,true);
 assertUniversalMatch(packs,wide);
});

test('a raided Cart Titan returns its base before the ambush continues',()=>{
 const counts=countsFor(['AOT-2-061','AOT-2-056','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-051','AOT-2-058']);
 let s=toPhase(fresh(counts,6103),'main');
 put(s,0,'AOT-2-055','energy',0,true);
 put(s,0,'AOT-2-057','energy',1,true);
 put(s,0,'AOT-2-051','energy',2,true);
 put(s,0,'AOT-2-051','energy',3,true);
 const host=put(s,0,'AOT-2-054','front',0,true);
 const foe=put(s,1,'AOT-2-058','front',0,true);
 readyAp(s,0,2);
 const cart=raidOnto(s,'AOT-2-056',host.uid);
 s=cart.s;
 s=pick(s,a=>a.mode==='skip');
 s=cast(s,toHand(s,0,'AOT-2-061').uid);
 s=pick(s,a=>a.uid===cart.card.uid);
 assert.equal(s.pending.id,'AOT-2-056');
 assert.equal(acts(s).some(a=>a.uid===host.uid&&a.mode==='take'),true);
 s=pick(s,a=>a.uid===host.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===host.uid),true);
 assert.equal(acts(s).some(a=>a.mode==='retire'&&a.uid===foe.uid),true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending.step,'pick');
 s=pick(s,a=>a.uid===cart.card.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===cart.card.uid),true);
 assertUniversalMatch(packs,s);
});

test('Nicolo waits through a non-food card and two copies reduce the next food by 2',()=>{
 const counts=countsFor(['AOT-2-062','AOT-2-073','AOT-2-063','AOT-2-066','AOT-2-070']);
 let s=toPhase(fresh(counts,6201),'main');
 put(s,0,'AOT-2-066','energy',0,true);
 put(s,0,'AOT-2-070','energy',1,true);
 put(s,0,'AOT-2-063','energy',2,true);
 readyAp(s,0,4);
 s=play(s,toHand(s,0,'AOT-2-062').uid);
 s=play(s,toHand(s,0,'AOT-2-062').uid);
 assert.equal(s.players[0].aot2FoodAp.amount,2);
 s=play(s,toHand(s,0,'AOT-2-063').uid);
 assert.equal(s.players[0].aot2FoodAp.amount,2);
 const food=toHand(s,0,'AOT-2-073');
 assert.equal(acts(s).some(a=>a.type==='event'&&a.uid===food.uid),true);
 s=cast(s,food.uid);
 assert.equal(s.players[0].aot2FoodAp,null);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 s=pick(s,a=>a.mode==='three');
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending,null);
 const later=toHand(s,0,'AOT-2-073');
 assert.equal(acts(s).some(a=>a.type==='event'&&a.uid===later.uid),false);
 assertUniversalMatch(packs,s);
});

test('Connie nullifies the impact of the character that battles him',()=>{
 const counts=countsFor(['AOT-2-063','AOT-2-071','AOT-2-066','AOT-2-070','AOT-2-062']);
 let s=toPhase(fresh(counts,6301),'main');
 const connie=put(s,0,'AOT-2-063','front',0,true);
 assert.equal(universalImpactNull(packs,s,connie),true);
 quietLife(s,0,3);
 s=toSide(s,1,'main');
 const eren=put(s,1,'AOT-2-071','front',0,true);
 s=use(s,{type:'activate',uid:eren.uid,mode:'aot2:AOT-2-071'});
 const life=s.players[1].life[0];
 assertHidden(s,[life.uid]);
 s=pick(s,a=>a.uid===life.uid);
 assert.equal(universalPublicView(packs,s,0).publicReveals.some(e=>e.uid===life.uid),false);
 assert.equal(universalImpact(packs,s,field(s,1,eren.uid)),1);
 s=toPhase(s,'attack');
 quietLife(s,0,3);
 s=swing(s,eren.uid);
 if(s.pending?.step==='top')s=pick(s,a=>a.mode==='top');
 assert.equal(s.pending.kind,'block');
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===connie.uid);
 assert.equal(s.players[0].life.length,3);
 assert.equal(s.players[0].outside.some(c=>c.uid===connie.uid),true);
 assertUniversalMatch(packs,s);
});

test('Jean looks at three privately and puts the chosen order on top',()=>{
 const counts=countsFor(['AOT-2-064','AOT-2-066','AOT-2-070','AOT-2-063','AOT-2-062','AOT-2-001']);
 let s=toPhase(fresh(counts,6401),'main');
 put(s,0,'AOT-2-062','energy',0,true);
 put(s,0,'AOT-2-066','energy',1,true);
 put(s,0,'AOT-2-070','energy',2,true);
 readyAp(s,0,1);
 const jean=toHand(s,0,'AOT-2-064');
 s=play(s,jean.uid);
 assert.equal(field(s,0,jean.uid).ready,false);
 s=toSide(s,0,'start');
 s=toPhase(s,'attack');
 quietLife(s,1,3);
 stackTop(s,0,['AOT-2-001','AOT-2-063','AOT-2-062']);
 const window=s.players[0].deck.slice(0,3).map(c=>c.uid);
 s=swing(s,jean.uid);
 assert.equal(s.pending.kind==='effect-top-order'||s.pending.step==='lookOrder',true);
 assertHidden(s,window);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const order=[window[2],window[0],window[1]];
 s=orderAs(s,order);
 s=passBlock(s);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),order);
 assertHidden(s,window);
 assertUniversalMatch(packs,s);
});

test('Sasha stays locked only after the food condition actually activates',()=>{
 const counts=countsFor(['AOT-2-065','AOT-2-073','AOT-2-062','AOT-2-066','AOT-2-070']);
 const key='サシャ・ブラウス|AOT-2-065|onPlay';
 let early=toPhase(fresh(counts,6501),'main');
 put(early,0,'AOT-2-062','energy',0,true);
 put(early,0,'AOT-2-066','energy',1,true);
 put(early,0,'AOT-2-070','energy',2,true);
 readyAp(early,0,2);
 const first=toHand(early,0,'AOT-2-065');
 early=play(early,first.uid);
 assert.equal(field(early,0,first.uid).ready,false);
 assert.equal(early.mainReadyOnceByName[0].includes(key),false);
 early=cast(early,toHand(early,0,'AOT-2-073').uid);
 early=pick(early,a=>a.mode==='three');
 early=pick(early,a=>a.mode==='done');
 readyAp(early,0,1);
 const second=toHand(early,0,'AOT-2-065');
 early=play(early,second.uid);
 assert.equal(field(early,0,second.uid).ready,true);
 assert.equal(early.mainReadyOnceByName[0].includes(key),true);
 const third=toHand(early,0,'AOT-2-065');
 readyAp(early,0,1);
 early=play(early,third.uid);
 assert.equal(field(early,0,third.uid).ready,false);
 assertUniversalMatch(packs,early);
});

test('Mikasa offers a rested replay after an opponent bounce, and only one copy enters',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-070','AOT-2-062','AOT-2-063','AOT-1-009','AOT-2-001']);
 let s=toPhase(fresh(counts,6601),'attack');
 put(s,0,'AOT-2-062','energy',0,true);
 put(s,0,'AOT-2-063','energy',1,true);
 const soldier=put(s,0,'AOT-2-070','front',0,true);
 const hitter=put(s,0,'AOT-2-001','front',1,true);
 hitter.ready=true;
 quietLife(s,1,1);
 const trigger=take(s,1,'AOT-1-009');
 s.players[1].life.unshift(trigger);
 const replay=toHand(s,0,'AOT-2-066');
 const deckIndex=s.players[0].deck.findIndex(c=>c.cardId==='AOT-2-066');
 const extra=s.players[0].deck.splice(deckIndex,1)[0];
 s.players[0].hand.push(extra);
 s=swing(s,hitter.uid);
 s=passBlock(s);
 assert.equal(s.pending.trigger,'color');
 s=pick(s,a=>a.mode==='colorBounce'&&a.uid===soldier.uid);
 if(s.pending?.kind==='block')s=passBlock(s);
 assert.equal(s.players[0].hand.some(c=>c.uid===soldier.uid),true);
 s=use(s,{type:'next'});
 assert.equal(s.pending.id,'AOT-2-066');
 const enters=acts(s).filter(a=>a.mode==='enter');
 assert.equal(enters.length>0,true);
 assert.equal(enters.every(a=>a.ready===false),true);
 assert.equal(acts(s).some(a=>a.mode==='done'),true);
 s=pick(s,a=>a.mode==='enter'&&a.uid===replay.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===extra.uid),true);
 assert.equal(field(s,0,replay.uid)!==null,true);
 assertUniversalMatch(packs,s);
});

test('raid Mikasa must choose a bullet, and the 5000 discard can be declined',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-067','AOT-2-070','AOT-2-069','AOT-2-063','AOT-2-062','AOT-1-061','AOT-2-058']);
 let s=toPhase(fresh(counts,6701),'main');
 put(s,0,'AOT-2-062','energy',0,true);
 put(s,0,'AOT-2-062','energy',1,true);
 const host=put(s,0,'AOT-2-066','front',0,true);
 const corps=toOutside(s,0,'AOT-2-070');
 const raider=toOutside(s,0,'AOT-2-069');
 const low=put(s,1,'AOT-2-063','front',0,true);
 readyAp(s,0,1);
 const mikasa=toHand(s,0,'AOT-2-067');
 assert.equal(acts(s).some(a=>a.type==='play'&&a.uid===mikasa.uid),false);
 s=use(s,acts(s).find(a=>a.type==='raid'&&a.uid===mikasa.uid&&a.baseUid===host.uid));
 assert.equal(s.pending.step,'mode');
 assert.equal(acts(s).some(a=>a.mode==='done'),false);
 assert.equal(acts(s).some(a=>a.mode==='hand'),true);
 assert.equal(acts(s).some(a=>a.mode==='battle'),true);
 s=pick(s,a=>a.mode==='hand');
 const takes=acts(s).filter(a=>a.mode==='take').map(a=>a.uid);
 assert.equal(takes.includes(corps.uid),true);
 assert.equal(takes.includes(raider.uid),false);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.players[0].outside.some(c=>c.uid===corps.uid),true);

 let battle=toPhase(fresh(counts,6702),'main');
 put(battle,0,'AOT-2-062','energy',0,true);
 put(battle,0,'AOT-2-062','energy',1,true);
 const base=put(battle,0,'AOT-2-066','front',0,true);
 const small=put(battle,1,'AOT-2-058','front',0,true);
 const armored=put(battle,1,'AOT-1-061','front',1,true);
 readyAp(battle,0,1);
 const copy=toHand(battle,0,'AOT-2-067');
 const a=toHand(battle,0,'AOT-2-070');
 const b=toHand(battle,0,'AOT-2-063');
 keepOnly(battle,0,[copy.uid,a.uid,b.uid]);
 battle=use(battle,acts(battle).find(x=>x.type==='raid'&&x.uid===copy.uid&&x.baseUid===base.uid));
 battle=pick(battle,a=>a.mode==='battle');
 battle=pick(battle,a=>a.uid===small.uid);
 assert.equal(battle.pending,null);
 assert.equal(field(battle,1,small.uid)!==null,true);

 let declined=toPhase(fresh(counts,6703),'main');
 put(declined,0,'AOT-2-062','energy',0,true);
 put(declined,0,'AOT-2-062','energy',1,true);
 const home=put(declined,0,'AOT-2-066','front',0,true);
 const wall=put(declined,1,'AOT-1-061','front',0,true);
 readyAp(declined,0,1);
 const again=toHand(declined,0,'AOT-2-067');
 const c=toHand(declined,0,'AOT-2-070');
 const d=toHand(declined,0,'AOT-2-063');
 keepOnly(declined,0,[again.uid,c.uid,d.uid]);
 declined=use(declined,acts(declined).find(x=>x.type==='raid'&&x.uid===again.uid&&x.baseUid===home.uid));
 declined=pick(declined,a=>a.mode==='battle');
 declined=pick(declined,a=>a.uid===wall.uid);
 assert.equal(declined.pending.step,'discard');
 assert.equal(acts(declined).some(a=>a.mode==='done'),true);
 declined=pick(declined,a=>a.mode==='done');
 assert.equal(field(declined,1,wall.uid)!==null,true);
 assert.equal(declined.players[0].hand.some(card=>card.uid===c.uid),true);
 assert.equal(declined.players[0].hand.some(card=>card.uid===d.uid),true);
 assertUniversalMatch(packs,declined);
});

test('Bertolt reduces only the red Colossal, whose raid frame draws, stands, and hits',()=>{
 const counts=countsFor(['AOT-2-068','AOT-2-069','AOT-2-062','AOT-2-064','AOT-2-066','AOT-2-013','AOT-2-001','AOT-2-004','AOT-2-005']);
 let red=toPhase(fresh(counts,6801),'main');
 put(red,0,'AOT-2-062','energy',0,true);
 put(red,0,'AOT-2-062','energy',1,true);
 put(red,0,'AOT-2-064','energy',2,true);
 put(red,0,'AOT-2-066','energy',3,true);
 const host=put(red,0,'AOT-2-068','front',0,true);
 const other=put(red,0,'AOT-2-001','front',1,true);
 readyAp(red,0,1);
 const colossal=toHand(red,0,'AOT-2-069');
 const raids=acts(red).filter(a=>a.type==='raid'&&a.uid===colossal.uid);
 assert.equal(raids.some(a=>a.baseUid===host.uid),true);
 assert.equal(raids.some(a=>a.baseUid===other.uid),false);
 const deck=red.players[0].deck.length;
 red=use(red,raids.find(a=>a.baseUid===host.uid));
 red=dropCapacity(red);
 const body=field(red,0,colossal.uid);
 assert.equal(universalImpact(packs,red,body),1);
 assert.ok(red.players[0].deck.length<=deck-3);
 assert.equal(universalBp(packs,red,body),6000);

 let yellow=toPhase(fresh(counts,6802),'main');
 put(yellow,0,'AOT-2-004','energy',0,true);
 put(yellow,0,'AOT-2-004','energy',1,true);
 put(yellow,0,'AOT-2-004','energy',2,true);
 put(yellow,0,'AOT-2-001','energy',3,true);
 const same=put(yellow,0,'AOT-2-068','front',0,true);
 readyAp(yellow,0,1);
 const twin=toHand(yellow,0,'AOT-2-013');
 assert.equal(acts(yellow).some(a=>a.type==='raid'&&a.uid===twin.uid&&a.baseUid===same.uid),false);

 let bare=toPhase(fresh(counts,6803),'main');
 put(bare,0,'AOT-2-062','energy',0,true);
 put(bare,0,'AOT-2-064','energy',1,true);
 put(bare,0,'AOT-2-066','energy',2,true);
 put(bare,0,'AOT-2-066','energy',3,true);
 readyAp(bare,0,1);
 const sat=toHand(bare,0,'AOT-2-069');
 assert.equal(acts(bare).some(a=>a.type==='raid'&&a.uid===sat.uid),false);
 assert.equal(acts(bare).some(a=>a.type==='play'&&a.uid===sat.uid),false);
 assert.equal(bare.players[0].hand.some(c=>c.uid===sat.uid),true);
 assertUniversalMatch(packs,bare);
});

test('raid-state Colossals raise BP ranges, and a copy outside raid does not',()=>{
 const counts=countsFor(['AOT-2-068','AOT-2-069','AOT-2-062','AOT-2-064','AOT-2-066','AOT-2-072','AOT-2-071','AOT-2-013','AOT-2-057']);
 let plain=toPhase(fresh(counts,6901),'main');
 put(plain,0,'AOT-2-062','energy',0,true);
 put(plain,0,'AOT-2-062','energy',1,true);
 put(plain,0,'AOT-2-064','energy',2,true);
 put(plain,0,'AOT-2-066','energy',3,true);
 put(plain,0,'AOT-2-069','front',0,true);
 const host=put(plain,0,'AOT-2-071','front',1,true);
 const huge=put(plain,1,'AOT-2-013','front',0,true);
 readyAp(plain,0,1);
 while(plain.players[0].life.length>2)plain.players[0].deck.push(plain.players[0].life.pop());
 const alone=raidOnto(plain,'AOT-2-072',host.uid);
 plain=alone.s;
 assert.equal(plain.pending&&plain.pending.step,'mode',
  JSON.stringify({pending:plain.pending&&plain.pending.step,life:plain.players[0].life.length,
   modes:acts(plain).map(a=>a.mode||a.type)}));
 plain=pick(plain,a=>a.mode==='bare');
 assert.equal(acts(plain).some(a=>a.mode==='retire'&&a.uid===huge.uid),false);
 if(plain.pending)plain=pick(plain,a=>a.mode==='done');

 let stood=toPhase(fresh(counts,6902),'main');
 put(stood,0,'AOT-2-062','energy',0,true);
 put(stood,0,'AOT-2-062','energy',1,true);
 put(stood,0,'AOT-2-064','energy',2,true);
 put(stood,0,'AOT-2-066','energy',3,true);
 const bert=put(stood,0,'AOT-2-068','front',0,true);
 const eren=put(stood,0,'AOT-2-071','front',1,true);
 const wall=put(stood,1,'AOT-2-013','front',0,true);
 readyAp(stood,0,1);
 const colossal=raidOnto(stood,'AOT-2-069',bert.uid);
 stood=colossal.s;
 assert.equal(universalImpact(packs,stood,field(stood,0,colossal.card.uid)),1);
 stood=toSide(stood,0,'main');
 readyAp(stood,0,1);
 while(stood.players[0].life.length>2)stood.players[0].deck.push(stood.players[0].life.pop());
 const attack=raidOnto(stood,'AOT-2-072',eren.uid);
 stood=attack.s;
 stood=pick(stood,a=>a.mode==='bare');
 assert.equal(acts(stood).some(a=>a.mode==='retire'&&a.uid===wall.uid),true);
 stood=pick(stood,a=>a.mode==='done');
 assert.equal(universalBp(packs,stood,field(stood,0,colossal.card.uid)),6000);
 assertUniversalMatch(packs,stood);
});

test('Eren publishes one corps card from three and discards only after taking it',()=>{
 const counts=countsFor(['AOT-2-070','AOT-2-066','AOT-2-063','AOT-2-062','AOT-2-001']);
 let skipped=toPhase(fresh(counts,7001),'main');
 put(skipped,0,'AOT-2-066','energy',0,true);
 readyAp(skipped,0,1);
 stackTop(skipped,0,['AOT-2-001','AOT-2-066','AOT-2-063']);
 const window=skipped.players[0].deck.slice(0,3);
 const spare=toHand(skipped,0,'AOT-2-062');
 keepOnly(skipped,0,[spare.uid]);
 skipped=play(skipped,toHand(skipped,0,'AOT-2-070').uid);
 assert.equal(skipped.pending.kind,'effect-top-filter-choice');
 assertHidden(skipped,window.map(c=>c.uid));
 skipped=pick(skipped,a=>a.uid==null);
 skipped=orderRest(skipped);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===spare.uid),true);
 assertHidden(skipped,window.map(c=>c.uid));

 let taken=toPhase(fresh(counts,7002),'main');
 put(taken,0,'AOT-2-066','energy',0,true);
 readyAp(taken,0,1);
 stackTop(taken,0,['AOT-2-001','AOT-2-066','AOT-2-063']);
 const seen=taken.players[0].deck.slice(0,3);
 const corps=seen.find(c=>c.cardId==='AOT-2-066');
 const held=toHand(taken,0,'AOT-2-062');
 keepOnly(taken,0,[held.uid]);
 taken=play(taken,toHand(taken,0,'AOT-2-070').uid);
 taken=pick(taken,a=>a.uid===corps.uid);
 assertSeen(taken,[corps.uid]);
 taken=orderRest(taken);
 assert.equal(taken.pending.kind==='effect-discard'||taken.pending.step==='discard',true);
 taken=pick(taken,a=>a.uid===held.uid);
 assert.equal(taken.players[0].hand.some(c=>c.uid===corps.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===held.uid),true);
 assert.equal(taken.players[0].hand.some(c=>c.uid===held.uid),false);
 assertUniversalMatch(packs,taken);
});

test('Eren adds a hidden life for impact, and the attack look is private unless taken',()=>{
 const counts=countsFor(['AOT-2-071','AOT-2-066','AOT-2-070','AOT-2-063','AOT-2-001']);
 let s=toPhase(fresh(counts,7101),'main');
 const eren=put(s,0,'AOT-2-071','front',0,false);
 assert.equal(universalImpactNull(packs,s,eren),true);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===eren.uid),true);
 s=use(s,{type:'activate',uid:eren.uid,mode:'aot2:AOT-2-071'});
 const life=s.players[0].life[0];
 assert.equal(universalPrivateChoices(packs,s,0).options.every(o=>o.card===null),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=pick(s,a=>a.uid===life.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===life.uid),true);
 assert.equal(universalPublicView(packs,s,1).publicReveals.some(e=>e.uid===life.uid),false);
 assert.equal(universalImpact(packs,s,field(s,0,eren.uid)),1);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===eren.uid),false);
 field(s,0,eren.uid).ready=true;
 s=toPhase(s,'attack');
 quietLife(s,1,3);
 while(s.players[0].life.length>3)s.players[0].deck.push(s.players[0].life.pop());
 const before=s.players[0].hand.length;
 s=swing(s,eren.uid);
 s=passBlock(s);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending,null);

 let look=toPhase(fresh(counts,7102),'attack');
 const body=put(look,0,'AOT-2-071','front',0,true);
 quietLife(look,1,3);
 while(look.players[0].life.length<4&&look.players[0].deck.length)
  look.players[0].life.push(look.players[0].deck.pop());
 stackTop(look,0,['AOT-2-070']);
 const top=look.players[0].deck[0];
 look=swing(look,body.uid);
 assert.equal(look.pending.step,'top');
 assertHidden(look,[top.uid]);
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assert.equal(acts(look).some(a=>a.mode==='hand'),true);
 look=pick(look,a=>a.mode==='bottom');
 look=passBlock(look);
 assert.equal(look.players[0].deck.at(-1).uid,top.uid);
 assertHidden(look,[top.uid]);
 assert.equal(look.players[0].hand.some(c=>c.uid===top.uid),false);
 assertUniversalMatch(packs,look);
});

test('the Attack Titan keeps 1000 until the next own start and each mode stays optional inside',()=>{
 const counts=countsFor(['AOT-2-072','AOT-2-071','AOT-2-062','AOT-2-064','AOT-2-066','AOT-2-068','AOT-2-057','AOT-2-058']);
 let s=toPhase(fresh(counts,7201),'main');
 put(s,0,'AOT-2-062','energy',0,true);
 put(s,0,'AOT-2-064','energy',1,true);
 put(s,0,'AOT-2-068','energy',2,true);
 put(s,0,'AOT-2-066','energy',3,true);
 const host=put(s,0,'AOT-2-071','front',0,true);
 const low=put(s,1,'AOT-2-057','front',0,true);
 const mid=put(s,1,'AOT-2-058','front',1,true);
 readyAp(s,0,1);
 while(s.players[0].life.length>2)s.players[0].deck.push(s.players[0].life.pop());
 const titan=raidOnto(s,'AOT-2-072',host.uid);
 s=titan.s;
 assert.equal(universalBp(packs,s,field(s,0,titan.card.uid)),5000);
 assert.equal(s.pending.step,'mode');
 assert.equal(acts(s).some(a=>a.mode==='done'),false);
 assert.equal(acts(s).some(a=>a.mode==='low'),true);
 assert.equal(acts(s).some(a=>a.mode==='life'),true);
 assert.equal(acts(s).some(a=>a.mode==='bare'),true);
 s=pick(s,a=>a.mode==='low');
 const uids=acts(s).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(uids.includes(low.uid),true);
 assert.equal(uids.includes(mid.uid),false);
 s=pick(s,a=>a.mode==='done');
 assert.equal(field(s,1,low.uid)!==null,true);
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,0,titan.card.uid)),5000);
 s=toSide(s,0,'start');
 assert.equal(universalBp(packs,s,field(s,0,titan.card.uid)),4000);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7202),'main');
 put(life,0,'AOT-2-062','energy',0,true);
 put(life,0,'AOT-2-064','energy',1,true);
 put(life,0,'AOT-2-068','energy',2,true);
 put(life,0,'AOT-2-066','energy',3,true);
 const eren=put(life,0,'AOT-2-071','front',0,true);
 readyAp(life,0,1);
 const hidden=life.players[0].life[0];
 const attack=raidOnto(life,'AOT-2-072',eren.uid);
 life=attack.s;
 life=pick(life,a=>a.mode==='life');
 assert.equal(universalPrivateChoices(packs,life,0).options.every(o=>o.card===null),true);
 assert.equal(universalPrivateChoices(packs,life,1),null);
 life=pick(life,a=>a.uid===hidden.uid);
 assert.equal(life.players[0].hand.some(c=>c.uid===hidden.uid),true);
 assert.equal(universalPublicView(packs,life,1).publicReveals.some(e=>e.uid===hidden.uid),false);
 if(life.pending?.step==='retire')life=pick(life,a=>a.mode==='done');
 assertUniversalMatch(packs,life);
});

test('seafood chooses one size, may buff nobody, and still draws the printed number',()=>{
 const counts=countsFor(['AOT-2-073','AOT-2-066','AOT-2-070','AOT-2-063','AOT-2-062']);
 let one=toPhase(fresh(counts,7301),'main');
 put(one,0,'AOT-2-066','energy',0,true);
 put(one,0,'AOT-2-070','energy',1,true);
 put(one,0,'AOT-2-063','energy',2,true);
 const ally=put(one,0,'AOT-2-063','front',0,true);
 readyAp(one,0,2);
 const before=one.players[0].hand.length;
 one=cast(one,toHand(one,0,'AOT-2-073').uid);
 assert.equal(one.pending.step,'mode');
 assert.equal(acts(one).some(a=>a.mode==='done'),false);
 one=pick(one,a=>a.mode==='one');
 assert.equal(acts(one).some(a=>a.mode==='done'),true);
 one=pick(one,a=>a.mode==='done');
 assert.equal(universalBp(packs,one,field(one,0,ally.uid)),2000);
 assert.equal(one.players[0].hand.length,before+1);

 let three=toPhase(fresh(counts,7302),'main');
 put(three,0,'AOT-2-066','energy',0,true);
 put(three,0,'AOT-2-070','energy',1,true);
 put(three,0,'AOT-2-062','energy',2,true);
 const left=put(three,0,'AOT-2-063','front',0,true);
 const right=put(three,0,'AOT-2-062','front',1,true);
 readyAp(three,0,1);
 const hand=three.players[0].hand.length;
 three=cast(three,toHand(three,0,'AOT-2-073').uid);
 three=pick(three,x=>x.mode==='three');
 three=pick(three,x=>x.uid===left.uid);
 three=pick(three,x=>x.uid===right.uid);
 three=pick(three,x=>x.mode==='done');
 assert.equal(universalBp(packs,three,field(three,0,left.uid)),3000);
 assert.equal(universalBp(packs,three,field(three,0,right.uid)),3000);
 assert.equal(three.players[0].hand.length,hand-1);
 assertUniversalMatch(packs,three);
});

test('each life kind in 051-073 resolves once',()=>{
 const counts=countsFor(['AOT-2-051','AOT-2-054','AOT-2-055','AOT-2-057','AOT-2-059','AOT-2-060','AOT-2-061','AOT-2-001','AOT-2-070']);
 let draw=toPhase(fresh(counts,7401),'attack');
 const hitter=put(draw,0,'AOT-2-070','front',0,true);
 quietLife(draw,1,1);
 const drawn=take(draw,1,'AOT-2-057');
 draw.players[1].life.unshift(drawn);
 const hands=draw.players[1].hand.length;
 draw=swing(draw,hitter.uid);
 draw=passBlock(draw);
 assert.equal(draw.pending.trigger,'draw');
 draw=pick(draw,a=>a.mode==='draw');
 assert.equal(draw.players[1].hand.length,hands+1);
 assert.equal(draw.players[1].outside.some(c=>c.uid===drawn.uid),true);

 let active=toPhase(fresh(counts,7402),'attack');
 const attacker=put(active,0,'AOT-2-070','front',0,true);
 const rested=put(active,1,'AOT-2-070','front',0,false);
 quietLife(active,1,1);
 const act=take(active,1,'AOT-2-051');
 active.players[1].life.unshift(act);
 active=swing(active,attacker.uid);
 active=passBlock(active);
 assert.equal(active.pending.trigger,'active');
 active=pick(active,a=>a.uid===rested.uid);
 assert.equal(field(active,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,active,field(active,1,rested.uid)),4500);

 let got=toPhase(fresh(counts,7403),'attack');
 const swinger=put(got,0,'AOT-2-070','front',0,true);
 quietLife(got,1,1);
 const card=take(got,1,'AOT-2-054');
 got.players[1].life.unshift(card);
 got=swing(got,swinger.uid);
 got=passBlock(got);
 assert.equal(got.pending.trigger,'get');
 got=pick(got,a=>a.mode==='get'||a.uid===card.uid);
 assert.equal(got.players[1].hand.some(c=>c.uid===card.uid),true);

 let special=toPhase(fresh(counts,7404),'attack');
 const hammer=put(special,0,'AOT-2-070','front',0,true);
 quietLife(special,1,1);
 const event=take(special,1,'AOT-2-061');
 special.players[1].life.unshift(event);
 special=swing(special,hammer.uid);
 special=passBlock(special);
 assert.equal(special.pending.trigger,'special');
 special=pick(special,a=>a.uid===hammer.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===hammer.uid),true);
 assert.equal(special.pending,null);

 let raid=toPhase(fresh(counts,7405),'main');
 put(raid,1,'AOT-2-054','energy',0,true);
 put(raid,1,'AOT-2-055','energy',1,true);
 put(raid,1,'AOT-2-057','energy',2,true);
 put(raid,1,'AOT-2-051','energy',3,true);
 const host=put(raid,1,'AOT-2-059','front',0,true);
 const opener=put(raid,0,'AOT-2-070','front',0,true);
 quietLife(raid,1,1);
 const flipped=take(raid,1,'AOT-2-060');
 raid.players[1].life.unshift(flipped);
 readyAp(raid,1,1);
 raid=toPhase(raid,'attack');
 raid=swing(raid,opener.uid);
 raid=passBlock(raid);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(acts(raid).some(a=>a.mode==='get'),true);
 raid=pick(raid,a=>a.mode==='raid'&&a.baseUid===host.uid);
 if(raid.pending?.step==='discard')raid=pick(raid,a=>a.mode==='done');
 assert.equal(field(raid,1,flipped.uid).ready,true);
 assert.equal(raid.players[1].front.some(c=>c?.uid===flipped.uid&&c.stack?.some(x=>x.uid===host.uid)),true);
 assertUniversalMatch(packs,raid);
});
