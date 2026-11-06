import test from 'node:test';
import assert from 'node:assert/strict';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalImpact,
 universalPrivateChoices, universalPublicView, zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];

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
function pick(s,pred){
 const actions=acts(s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(actions.slice(0,6)));
 return use(s,action);
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
function passBlock(s){
 if(s.pending?.kind!=='block')return s;
 return pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
}
function swing(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='attack-pay'||s.pending?.step==='pay')
  s=pick(s,a=>a.mode==='pay'||a.mode==='skip'||a.uid==null);
 return passBlock(s);
}

const LIFE={
 'AOT-2-001':null,'AOT-2-002':null,'AOT-2-003':'active','AOT-2-004':null,
 'AOT-2-005':'active','AOT-2-006':null,'AOT-2-007':'active','AOT-2-008':'color',
 'AOT-2-009':'get','AOT-2-010':null,'AOT-2-011':'draw','AOT-2-012':'draw',
 'AOT-2-013':'raid','AOT-2-014':null,'AOT-2-015':'active','AOT-2-016':null,
 'AOT-2-017':'raid','AOT-2-018':'draw','AOT-2-019':'raid','AOT-2-020':'get',
 'AOT-2-021':null,'AOT-2-022':'raid','AOT-2-023':'get','AOT-2-024':null,
 'AOT-2-025':'raid'
};

test('AOT-2-001 through 025 keep the printed life trigger',()=>{
 for(const [id,trigger] of Object.entries(LIFE))
  assert.equal(pack.cards[id].trigger,trigger,id);
});

test('Yelena generates 2 while active on energy, 1 while rested, and 0 on the front',()=>{
 const counts=countsFor(['AOT-2-001']);
 let s=toPhase(fresh(counts,1),'main');
 const ready=put(s,0,'AOT-2-001','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,ready),2);
 ready.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,ready),1);
 const front=put(s,0,'AOT-2-001','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
 assertUniversalMatch(packs,s);
});

test('Onyankopon may enter nothing, rests a new name, and that entry still resolves',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-002','AOT-2-004','AOT-2-011','AOT-2-015','AOT-2-020']);
 let skipped=toPhase(fresh(counts,2),'main');
 put(skipped,0,'AOT-2-001','energy',0,true);
 put(skipped,0,'AOT-2-004','energy',1,true);
 readyAp(skipped,0,1);
 const onya=toHand(skipped,0,'AOT-2-002');
 const before=skipped.players[0].hand.length;
 skipped=play(skipped,onya.uid);
 assert.equal(skipped.pending.id,'AOT-2-002');
 assert.equal(acts(skipped).some(a=>a.mode==='done'),true);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.pending,null);
 assert.equal(field(skipped,0,onya.uid).ready,false);
 assert.equal(skipped.players[0].hand.length,before-1);

 let s=toPhase(fresh(counts,3),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 const named=put(s,0,'AOT-2-015','front',0,true);
 readyAp(s,0,1);
 toHand(s,0,'AOT-2-002');
 const duplicate=toHand(s,0,'AOT-2-015');
 const rumble=toHand(s,0,'AOT-2-020');
 const freshName=toHand(s,0,'AOT-2-011');
 const handBefore=s.players[0].hand.length;
 s=play(s,s.players[0].hand.find(c=>c.cardId==='AOT-2-002').uid);
 const choices=acts(s).map(a=>a.uid);
 assert.equal(choices.includes(duplicate.uid),false);
 assert.equal(choices.includes(rumble.uid),false);
 assert.equal(choices.includes(named.uid),false);
 assert.equal(choices.includes(freshName.uid),true);
 s=pick(s,a=>a.uid===freshName.uid&&a.line==='energy');
 assert.equal(s.pending.kind,'effect-discard','the entered Armin still draws and discards');
 const discard=s.players[0].hand[0];
 s=pick(s,a=>a.uid===discard.uid);
 const entered=s.players[0].energy.find(c=>c?.uid===freshName.uid);
 assert.equal(entered.ready,false);
 assert.equal(s.players[0].hand.some(c=>c.uid===discard.uid),false);
 assert.equal(s.players[0].hand.length,handBefore-2);
 assertUniversalMatch(packs,s);
});

test('Gabi counts herself toward four names and may buff nobody',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-005']);
 let none=toPhase(fresh(counts,30),'main');
 put(none,0,'AOT-2-001','energy',0,true);
 put(none,0,'AOT-2-004','energy',1,true);
 readyAp(none,0,1);
 const early=toHand(none,0,'AOT-2-003');
 none=play(none,early.uid);
 assert.equal(none.pending,null);
 assert.equal(universalBp(packs,none,field(none,0,early.uid)),2500);

 let s=toPhase(fresh(counts,31),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-005','energy',1,true);
 const ally=put(s,0,'AOT-2-004','front',1,true);
 readyAp(s,0,1);
 const gabi=toHand(s,0,'AOT-2-003');
 s=play(s,gabi.uid);
 assert.equal(s.pending.id,'AOT-2-003');
 assert.equal(acts(s).some(a=>a.uid===gabi.uid),false);
 s=pick(s,a=>a.mode==='done');
 assert.equal(universalBp(packs,s,field(s,0,ally.uid)),1500);
 assertUniversalMatch(packs,s);

 let paid=toPhase(fresh(counts,32),'main');
 put(paid,0,'AOT-2-001','energy',0,true);
 put(paid,0,'AOT-2-004','energy',1,true);
 put(paid,0,'AOT-2-005','energy',2,true);
 const target=put(paid,0,'AOT-2-004','front',1,true);
 readyAp(paid,0,1);
 paid=play(paid,toHand(paid,0,'AOT-2-003').uid);
 paid=pick(paid,a=>a.uid===target.uid);
 assert.equal(universalBp(packs,paid,field(paid,0,target.uid)),3000);
 assertUniversalMatch(packs,paid);
});

test('Kiyomi returns another energy-1 character, or herself when none qualifies',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-010']);
 let s=toPhase(fresh(counts,4),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 const annie=put(s,0,'AOT-2-010','energy',1,true);
 readyAp(s,0,1);
 s=play(s,toHand(s,0,'AOT-2-004').uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 s=pick(s,a=>a.uid===annie.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===annie.uid),true);
 assert.equal(s.players[0].energy.some(c=>c?.uid===annie.uid),false);

 let self=toPhase(fresh(counts,41),'main');
 put(self,0,'AOT-2-001','energy',0,true);
 readyAp(self,0,1);
 const kiyomi=toHand(self,0,'AOT-2-004');
 self=play(self,kiyomi.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===kiyomi.uid),true);
 assert.equal(self.players[0].front.some(c=>c?.uid===kiyomi.uid),false);
 assertUniversalMatch(packs,self);
});

test('Connie and Jean use the four-name BP, and Jean stops on the opponent turn',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-006']);
 let s=toPhase(fresh(counts,5),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 const connie=put(s,0,'AOT-2-005','front',0,true);
 const jean=put(s,0,'AOT-2-006','front',1,true);
 assert.equal(universalBp(packs,s,connie),2000);
 assert.equal(universalBp(packs,s,jean),2500);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-006','energy',2,true);
 assert.equal(universalBp(packs,s,connie),3000);
 assert.equal(universalBp(packs,s,jean),4000);
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,0,connie.uid)),3000);
 assert.equal(universalBp(packs,s,field(s,0,jean.uid)),2500);
 assertUniversalMatch(packs,s);
});

test('Hange enters active, gains sniper at four names, and leaves when the opponent attack ends',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-007','AOT-2-012','AOT-2-013']);
 let shy=toPhase(fresh(counts,7),'main');
 put(shy,0,'AOT-2-001','energy',0,true);
 put(shy,0,'AOT-2-004','energy',1,true);
 put(shy,0,'AOT-2-004','energy',2,true);
 readyAp(shy,0,2);
 const plain=toHand(shy,0,'AOT-2-007');
 shy=play(shy,plain.uid);
 const quiet=field(shy,0,plain.uid);
 assert.equal(quiet.ready,true);
 assert.equal(quiet.aot2Sniper,undefined);
 assert.equal(universalBp(packs,shy,quiet),4000);

 let s=toPhase(fresh(counts,71),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-012','energy',2,true);
 readyAp(s,0,2);
 const hange=toHand(s,0,'AOT-2-007');
 s=play(s,hange.uid);
 const live=field(s,0,hange.uid);
 assert.equal(live.ready,true);
 assert.equal(live.aot2Sniper.turn,s.turn);
 assert.equal(universalBp(packs,s,live),6000);
 const wall=put(s,1,'AOT-2-013','front',0,true);
 setLife(s,1,3);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:hange.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 const after=field(s,0,hange.uid);
 assert.equal(after.ready,true);
 assert.equal(after.aot2Sniper,undefined);
 assert.equal(after.aot2SniperLost,true);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);

 let small=toPhase(fresh(counts,72),'main');
 put(small,0,'AOT-2-001','energy',0,true);
 put(small,0,'AOT-2-004','energy',1,true);
 put(small,0,'AOT-2-012','energy',2,true);
 readyAp(small,0,2);
 const again=toHand(small,0,'AOT-2-007');
 small=play(small,again.uid);
 const blocker=put(small,1,'AOT-2-004','front',0,true);
 setLife(small,1,3);
 small=toPhase(small,'attack');
 small=use(small,{type:'attack',uid:again.uid});
 small=pick(small,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 const stayed=field(small,0,again.uid);
 assert.equal(stayed.ready,false);
 assert.equal(stayed.aot2Sniper.turn,small.turn);
 assert.equal(small.players[1].outside.some(c=>c.uid===blocker.uid),true);

 let leave=toPhase(fresh(counts,73),'main');
 put(leave,0,'AOT-2-001','energy',0,true);
 const going=put(leave,0,'AOT-2-007','front',0,true);
 leave=toSide(leave,0,'start');
 assert.equal(leave.players[0].outside.some(c=>c.uid===going.uid),true);
 assert.equal(field(leave,0,going.uid),null);
 assertUniversalMatch(packs,leave);
});

test('Mikasa locks the name only after a successful entry, and a second copy stays quiet',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-008','AOT-2-013']);
 let s=toPhase(fresh(counts,8),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-005','front',1,true);
 setLife(s,1,6);
 readyAp(s,0,2);
 const key='ミカサ・アッカーマン|AOT-2-008|onPlay';
 const first=toHand(s,0,'AOT-2-008');
 s=play(s,first.uid);
 assert.equal(s.mainReadyOnceByName[0].includes(key),false);
 assert.equal(field(s,0,first.uid).ready,false);
 setLife(s,1,5);
 const second=toHand(s,0,'AOT-2-008');
 s=play(s,second.uid,'energy');
 assert.equal(field(s,0,second.uid).ready,true);
 assert.equal(s.mainReadyOnceByName[0].includes(key),true);
 assertUniversalMatch(packs,s);

 let repeat=toPhase(fresh(counts,83),'main');
 put(repeat,0,'AOT-2-001','energy',0,true);
 put(repeat,0,'AOT-2-004','energy',1,true);
 put(repeat,0,'AOT-2-005','front',1,true);
 setLife(repeat,1,4);
 readyAp(repeat,0,2);
 const opened=toHand(repeat,0,'AOT-2-008');
 repeat=play(repeat,opened.uid);
 assert.equal(field(repeat,0,opened.uid).ready,true);
 const later=toHand(repeat,0,'AOT-2-008');
 repeat=play(repeat,later.uid,'energy');
 assert.equal(field(repeat,0,later.uid).ready,false);
 assertUniversalMatch(packs,repeat);

 let battle=toPhase(fresh(counts,81),'attack');
 put(battle,0,'AOT-2-001','energy',0,true);
 const mikasa=put(battle,0,'AOT-2-008','front',0,true);
 const legal=put(battle,1,'AOT-2-004','front',0,true);
 const huge=put(battle,1,'AOT-2-013','front',1,true);
 setLife(battle,1,2);
 battle=use(battle,{type:'attack',uid:mikasa.uid});
 const blocks=acts(battle).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(legal.uid),true);
 assert.equal(blocks.includes(huge.uid),false);
 assert.equal(universalImpact(packs,battle,field(battle,0,mikasa.uid)),0);
 battle=pick(battle,a=>a.uid==null);
 assert.equal(battle.players[1].life.length,1);

 let last=toPhase(fresh(counts,82),'attack');
 put(last,0,'AOT-2-001','energy',0,true);
 const finisher=put(last,0,'AOT-2-008','front',0,true);
 put(last,1,'AOT-2-004','front',0,true);
 setLife(last,1,1);
 assert.equal(universalImpact(packs,last,finisher),1);
 last=use(last,{type:'attack',uid:finisher.uid});
 last=pick(last,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(last.players[1].life.length,0);
 assertUniversalMatch(packs,last);
});

test('two Levis share one main, and choosing both follows the printed order',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-009']);
 let s=toPhase(fresh(counts,9),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-005','front',1,true);
 const first=put(s,0,'AOT-2-009','front',0,false);
 const second=put(s,0,'AOT-2-009','front',2,true);
 readyAp(s,0,1);
 assert.equal(universalBp(packs,s,first),5000);
 s=use(s,{type:'activate',uid:first.uid,mode:'aot2:AOT-2-009'});
 assert.equal(acts(s).some(a=>a.mode==='two'),true);
 s=pick(s,a=>a.mode==='one');
 const modes=acts(s).map(a=>a.mode);
 assert.deepEqual(modes.sort(),['active','double']);
 s=pick(s,a=>a.mode==='active');
 assert.equal(field(s,0,first.uid).ready,true);
 assert.equal(field(s,0,first.uid).readyOnAttackGranted,undefined);
 assert.equal(acts(s).some(a=>a.mode==='aot2:AOT-2-009'),false);

 let both=toPhase(fresh(counts,91),'main');
 put(both,0,'AOT-2-001','energy',0,true);
 put(both,0,'AOT-2-004','energy',1,true);
 put(both,0,'AOT-2-005','front',1,true);
 const levi=put(both,0,'AOT-2-009','front',0,false);
 readyAp(both,0,1);
 const payment=toHand(both,0,'AOT-2-004');
 both=use(both,{type:'activate',uid:levi.uid,mode:'aot2:AOT-2-009'});
 both=pick(both,a=>a.mode==='two');
 assert.equal(both.pending.step,'discard');
 both=pick(both,a=>a.uid===payment.uid);
 const risen=field(both,0,levi.uid);
 assert.equal(both.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(risen.ready,true);
 assert.equal(risen.readyOnAttackGranted.turn,both.turn);
 assert.equal(risen.readyOnAttackGranted.stamp,risen.fieldEntryStamp);
 assertUniversalMatch(packs,both);
});

test('Annie rests on either line, adds yellow energy, and the same entry leaves at main end',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-010']);
 let front=toPhase(fresh(counts,10),'main');
 const annie=put(front,0,'AOT-2-010','front',0,true);
 readyAp(front,0,1);
 assert.equal(acts(front).some(a=>a.mode==='aot2:AOT-2-010'),true);
 front=use(front,{type:'activate',uid:annie.uid,mode:'aot2:AOT-2-010'});
 assert.equal(field(front,0,annie.uid).ready,false);
 assert.equal(acts(front).some(a=>a.mode==='aot2:AOT-2-010'),false);
 front=toPhase(front,'attack');
 assert.equal(front.players[0].outside.some(c=>c.uid===annie.uid),true);

 let s=toPhase(fresh(counts,101),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 const energy=put(s,0,'AOT-2-010','energy',1,true);
 assert.equal(universalCardEnergy(packs,s,0,energy),1);
 readyAp(s,0,1);
 s=use(s,{type:'activate',uid:energy.uid,mode:'aot2:AOT-2-010'});
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,energy.uid)),2);
 const stamp=field(s,0,energy.uid).fieldEntryStamp;
 const kiyomi=toHand(s,0,'AOT-2-004');
 s=play(s,kiyomi.uid);
 s=pick(s,a=>a.uid===energy.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===energy.uid),true);
 readyAp(s,0,1);
 s=play(s,energy.uid,'energy');
 const returned=field(s,0,energy.uid);
 assert.notEqual(returned.fieldEntryStamp,stamp);
 assert.equal(returned.ready,false);
 s=toPhase(s,'attack');
 assert.equal(field(s,0,energy.uid)!==null,true);
 assert.equal(s.players[0].outside.some(c=>c.uid===energy.uid),false);
 assertUniversalMatch(packs,s);
});

test('the energy-0 Armin draws and discards, and the energy-3 Armin skips the discard at four names',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-011','AOT-2-012']);
 let small=toPhase(fresh(counts,11),'main');
 const before=small.players[0].hand.length;
 small=play(small,toHand(small,0,'AOT-2-011').uid,'energy');
 assert.equal(small.pending.kind,'effect-discard');
 assert.equal(small.players[0].hand.length,before);
 const discarded=small.players[0].hand[0];
 small=pick(small,a=>a.uid===discarded.uid);
 assert.equal(small.players[0].outside.some(c=>c.uid===discarded.uid),true);
 assert.equal(small.players[0].hand.length,before-1);

 let open=toPhase(fresh(counts,12),'main');
 put(open,0,'AOT-2-001','energy',0,true);
 put(open,0,'AOT-2-004','energy',1,true);
 put(open,0,'AOT-2-005','energy',2,true);
 readyAp(open,0,1);
 const drawn=toHand(open,0,'AOT-2-012');
 const hand=open.players[0].hand.length;
 open=play(open,drawn.uid);
 assert.equal(open.pending,null);
 assert.equal(open.players[0].hand.length,hand);

 let forced=toPhase(fresh(counts,121),'main');
 put(forced,0,'AOT-2-001','energy',0,true);
 put(forced,0,'AOT-2-004','energy',1,true);
 readyAp(forced,0,1);
 const played=toHand(forced,0,'AOT-2-012');
 const held=forced.players[0].hand.length;
 forced=play(forced,played.uid);
 assert.equal(forced.pending.id,'AOT-2-012');
 assert.equal(forced.players[0].hand.length,held);
 assert.equal(acts(forced).some(a=>a.mode==='done'),false);
 const lose=forced.players[0].hand[0];
 forced=pick(forced,a=>a.uid===lose.uid);
 assert.equal(forced.players[0].hand.length,held-1);
 assertUniversalMatch(packs,forced);
});

test('Colossal Armin discounts only off the field, and an ordinary play does not retire',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-011','AOT-2-012','AOT-2-013']);
 let s=toPhase(fresh(counts,13),'main');
 const printed=pack.cards['AOT-2-013'];
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'hand'),9);
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-003','energy',1,true);
 put(s,0,'AOT-2-004','energy',2,true);
 const ally=put(s,0,'AOT-2-012','front',1,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'hand'),6);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'field'),9);
 const victim=put(s,1,'AOT-2-004','front',0,true);
 readyAp(s,0,2);
 const arm=toHand(s,0,'AOT-2-013');
 s=play(s,arm.uid);
 assert.equal(s.pending,null);
 assert.equal(universalImpact(packs,s,field(s,0,arm.uid)),0);
 assert.equal(field(s,1,victim.uid)!==null,true);
 const base=put(s,0,'AOT-2-011','front',2,true);
 const second=toHand(s,0,'AOT-2-013');
 const raid=acts(s).find(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 const raider=s.players[0].hand.find(c=>c.uid===raid.uid);
 s=use(s,raid);
 if(s.pending?.id==='capacity')s=pick(s,a=>a.uid===ally.uid);
 assert.equal(s.pending.id,'AOT-2-013');
 assert.equal(acts(s).some(a=>a.mode==='done'),true);
 assert.equal(acts(s).some(a=>a.uid===victim.uid),true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(field(s,1,victim.uid)!==null,true);
 assert.equal(universalImpact(packs,s,field(s,0,raider.uid)),1);
 assertUniversalMatch(packs,s);
});

test('Pieck actives on energy at four names, and her main works from the front',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-014']);
 let energy=toPhase(fresh(counts,14),'main');
 put(energy,0,'AOT-2-001','energy',0,true);
 put(energy,0,'AOT-2-004','energy',1,true);
 put(energy,0,'AOT-2-005','energy',2,true);
 readyAp(energy,0,1);
 const pieck=toHand(energy,0,'AOT-2-014');
 energy=play(energy,pieck.uid,'energy');
 assert.equal(field(energy,0,pieck.uid).ready,true);

 let front=toPhase(fresh(counts,141),'main');
 put(front,0,'AOT-2-001','energy',0,true);
 put(front,0,'AOT-2-004','energy',1,true);
 put(front,0,'AOT-2-005','energy',2,true);
 const ally=put(front,0,'AOT-2-004','front',1,true);
 readyAp(front,0,1);
 const stood=toHand(front,0,'AOT-2-014');
 front=play(front,stood.uid);
 assert.equal(field(front,0,stood.uid).ready,false);
 const ready=put(front,0,'AOT-2-014','front',2,true);
 assert.equal(acts(front).some(a=>a.mode==='aot2:AOT-2-014'&&a.uid===ready.uid),true);
 front=use(front,{type:'activate',uid:ready.uid,mode:'aot2:AOT-2-014'});
 assert.equal(acts(front).some(a=>a.mode==='done'),false);
 front=pick(front,a=>a.uid===ally.uid);
 assert.equal(field(front,0,ready.uid).ready,false);
 assert.equal(universalBp(packs,front,field(front,0,ally.uid)),2500);
 assertUniversalMatch(packs,front);

 let alone=toPhase(fresh(counts,142),'main');
 put(alone,0,'AOT-2-014','front',0,true);
 assert.equal(acts(alone).some(a=>a.mode==='aot2:AOT-2-014'),false);
 assertUniversalMatch(packs,alone);
});

test('Falco may buff nobody',()=>{
 const counts=countsFor(['AOT-2-005','AOT-2-015']);
 let s=toPhase(fresh(counts,15),'main');
 const ally=put(s,0,'AOT-2-005','front',1,true);
 s=play(s,toHand(s,0,'AOT-2-015').uid,'energy');
 assert.equal(s.pending.kind,'effect-buff-own');
 s=pick(s,a=>a.uid===null);
 assert.equal(universalBp(packs,s,field(s,0,ally.uid)),2000);
 assertUniversalMatch(packs,s);
});

test('Falco reveals three, orders the rest, then discards',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-016','AOT-2-020']);
 let s=toPhase(fresh(counts,16),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 readyAp(s,0,1);
 stackTop(s,0,['AOT-2-020','AOT-2-004','AOT-2-020']);
 const window=s.players[0].deck.slice(0,3).map(c=>c.uid);
 const payment=toHand(s,0,'AOT-2-001');
 s=play(s,toHand(s,0,'AOT-2-016').uid);
 assert.equal(s.pending.step,'lookPick');
 const own=universalPrivateChoices(packs,s,0);
 assert.deepEqual(own.inspected.map(c=>c.uid),window);
 assert.equal(own.inspected.some(c=>c.cardId==='AOT-2-020'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const shown=universalPublicView(packs,s,1).publicReveals.map(c=>c.uid);
 for(const uid of window)assert.equal(shown.includes(uid),true);
 const takeable=acts(s).filter(a=>a.mode==='take').map(a=>a.uid);
 assert.equal(takeable.length,1);
 const kept=s.players[0].deck.find(c=>c.cardId==='AOT-2-004');
 s=pick(s,a=>a.uid===kept.uid);
 assert.equal(s.pending.step,'lookOrder');
 assert.equal(s.pending.step==='discard',false);
 const rest=acts(s).map(a=>a.uid);
 s=pick(s,a=>a.uid===rest[0]);
 if(s.pending?.step==='lookOrder')s=pick(s,a=>true);
 assert.equal(s.pending.step,'discard');
 const bottom=s.players[0].deck.slice(-2).map(c=>c.uid);
 assert.equal(bottom.includes(rest[0]),true);
 assert.equal(bottom.includes(window.find(uid=>uid!==kept.uid&&uid!==rest[0])),true);
 s=pick(s,a=>a.uid===payment.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===kept.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Jaw Falco tucks only from the raid frame, and the opponent cannot see under it',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-015','AOT-2-017']);
 let ordinary=toPhase(fresh(counts,17),'main');
 put(ordinary,0,'AOT-2-001','energy',0,true);
 put(ordinary,0,'AOT-2-003','energy',1,true);
 put(ordinary,0,'AOT-2-004','front',1,true);
 readyAp(ordinary,0,2);
 const played=toHand(ordinary,0,'AOT-2-017');
 ordinary=play(ordinary,played.uid);
 assert.equal(ordinary.pending,null);
 assert.equal((field(ordinary,0,played.uid).under||[]).length,0);
 ordinary=toSide(ordinary,0,'move');
 assert.equal(acts(ordinary).some(a=>a.type==='step'&&a.uid===played.uid),false);

 let s=toPhase(fresh(counts,171),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-003','energy',1,true);
 put(s,0,'AOT-2-001','energy',2,true);
 const base=put(s,0,'AOT-2-015','front',0,true);
 const buried=put(s,0,'AOT-2-004','front',1,true);
 readyAp(s,0,1);
 const falco=toHand(s,0,'AOT-2-017');
 const raid=acts(s).find(a=>a.type==='raid'&&a.uid===falco.uid&&a.baseUid===base.uid);
 s=use(s,raid);
 assert.equal(s.pending.step,'tuck');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(acts(s).some(a=>a.mode==='done'),true);
 s=pick(s,a=>a.uid===buried.uid);
 s=pick(s,a=>a.mode==='done');
 const host=field(s,0,falco.uid);
 assert.equal(host.under.length,1);
 assert.equal(universalPublicView(packs,s,1).players[0].front.find(c=>c?.uid===falco.uid).underLayers[0].faceDown,true);
 assert.equal(universalPublicView(packs,s,0).players[0].front.find(c=>c?.uid===falco.uid).underLayers[0].cardId,'AOT-2-004');
 host.ready=true;
 s=use(s,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-017'});
 assert.equal(s.pending.step,'under');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=pick(s,a=>a.mode==='done');
 assert.equal(field(s,0,falco.uid).under.length,1);
 assert.equal(field(s,0,falco.uid).ready,false);
 assert.equal(acts(s).some(a=>a.type==='reorderUnder'&&a.uid===falco.uid),false);
 s=toSide(s,0,'move');
 assert.equal(acts(s).some(a=>a.type==='step'&&a.uid===falco.uid),true);
 const stepped=use(s,{type:'step',uid:falco.uid,slot:3});
 assert.equal(stepped.players[0].front.some(c=>c?.uid===falco.uid),false);
 assert.equal(stepped.players[0].energy[3]?.uid,falco.uid);
 assertUniversalMatch(packs,stepped);
});

test('Reiner grants the tax only from the raid on-play, and a new entry drops it',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-018','AOT-2-019']);
 let ordinary=toPhase(fresh(counts,19),'main');
 put(ordinary,0,'AOT-2-001','energy',0,true);
 put(ordinary,0,'AOT-2-004','energy',1,true);
 put(ordinary,0,'AOT-2-005','energy',2,true);
 readyAp(ordinary,0,2);
 const played=toHand(ordinary,0,'AOT-2-019');
 ordinary=play(ordinary,played.uid);
 const plain=field(ordinary,0,played.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(plain.aot2SelectTax,undefined);
 assert.equal(universalBp(packs,ordinary,plain),4000);
 assert.equal(universalImpact(packs,ordinary,plain),0);

 let s=toPhase(fresh(counts,191),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-005','energy',2,true);
 const base=put(s,0,'AOT-2-018','front',0,true);
 readyAp(s,0,2);
 const reiner=toHand(s,0,'AOT-2-019');
 const raid=acts(s).find(a=>a.type==='raid'&&a.uid===reiner.uid&&a.baseUid===base.uid);
 s=use(s,raid);
 const armored=field(s,0,reiner.uid);
 assert.equal(universalBp(packs,s,armored),5000);
 assert.equal(universalImpact(packs,s,armored),1);
 assert.equal(armored.aot2SelectTax.stamp,armored.fieldEntryStamp);
 const stamp=armored.fieldEntryStamp;
 s=toSide(s,0,'start');
 const later=field(s,0,reiner.uid);
 assert.equal(later.aot2SelectTax,undefined);
 assert.equal(universalBp(packs,s,later),4000);
 assert.equal(later.fieldEntryStamp,stamp);
 assertUniversalMatch(packs,s);
});

test('Eren and Zeke with no effect do not count as yellow names',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-020','AOT-2-023']);
 let s=toPhase(fresh(counts,20),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-020','front',0,true);
 put(s,0,'AOT-2-023','front',1,true);
 const connie=put(s,0,'AOT-2-005','front',2,true);
 assert.equal(universalBp(packs,s,connie),2000);
 assertUniversalMatch(packs,s);
});

test('Eren generates an extra yellow only while Founding Ymir is on the field or outside',()=>{
 const counts=countsFor(['AOT-2-021','AOT-2-031']);
 let s=toPhase(fresh(counts,21),'main');
 const eren=put(s,0,'AOT-2-021','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,eren),1);
 const ymir=toHand(s,0,'AOT-2-031');
 assert.equal(universalCardEnergy(packs,s,0,eren),1);
 s.players[0].hand.splice(s.players[0].hand.indexOf(ymir),1);
 s.players[0].outside.push(ymir);
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,eren.uid)),2);
 s.players[0].outside.pop();
 s.players[0].energy[1]=ymir;
 ymir.fieldEntryStamp=s.nextFieldEntryStamp++;
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,eren.uid)),2);
 assertUniversalMatch(packs,s);
});

test('the Founding Titan distinguishes a raid entry, an ordinary play, and a line change',()=>{
 const counts=countsFor(['AOT-2-003','AOT-2-004','AOT-2-012','AOT-2-017','AOT-2-020','AOT-2-022','AOT-2-023','AOT-2-026','AOT-2-008']);
 let cost=toPhase(fresh(counts,22),'main');
 const printed=pack.cards['AOT-2-022'];
 put(cost,0,'AOT-2-023','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,cost,0,printed,'hand'),8);
 put(cost,0,'AOT-2-022','front',1,true);
 assert.equal(zoneRequiredEnergy(packs,cost,0,printed,'hand'),13);

 let played=toPhase(fresh(counts,221),'main');
 put(played,0,'AOT-2-003','energy',0,true);
 put(played,0,'AOT-2-004','energy',1,true);
 put(played,0,'AOT-2-012','energy',2,true);
 put(played,0,'AOT-2-017','energy',3,true);
 put(played,0,'AOT-2-023','front',1,true);
 readyAp(played,0,3);
 const ordinary=toHand(played,0,'AOT-2-022');
 assert.equal(zoneRequiredEnergy(packs,played,0,printed,'hand'),8);
 played=play(played,ordinary.uid);
 assert.equal(played.pending,null);
 assert.equal(universalImpact(packs,played,field(played,0,ordinary.uid)),0);
 assert.equal(acts(played).some(a=>a.mode==='aot2:AOT-2-022'),false);
 played=toSide(played,0,'main');
 assert.equal(acts(played).some(a=>a.mode==='aot2:AOT-2-022'),false);

 let raid=toPhase(fresh(counts,222),'main');
 put(raid,0,'AOT-2-003','energy',0,true);
 put(raid,0,'AOT-2-004','energy',1,true);
 put(raid,0,'AOT-2-012','energy',2,true);
 put(raid,0,'AOT-2-017','energy',3,true);
 put(raid,0,'AOT-2-023','front',1,true);
 const base=put(raid,0,'AOT-2-020','front',0,true);
 readyAp(raid,0,1);
 const titan=toHand(raid,0,'AOT-2-026');
 const founding=toHand(raid,0,'AOT-2-022');
 const action=acts(raid).find(a=>a.type==='raid'&&a.uid===founding.uid&&a.baseUid===base.uid);
 raid=use(raid,action);
 assert.equal(raid.pending.id,'AOT-2-022');
 assert.equal(acts(raid).some(a=>a.mode==='done'),true);
 assert.equal(acts(raid).some(a=>a.uid===titan.uid),true);
 raid=pick(raid,a=>a.uid===titan.uid&&a.line==='front');
 assert.equal(field(raid,0,titan.uid).ready,true);
 assert.equal(universalImpact(packs,raid,field(raid,0,founding.uid)),1);
 assert.equal(acts(raid).some(a=>a.mode==='aot2:AOT-2-022'),false);
 raid=toSide(raid,1,'start');
 raid=toSide(raid,0,'main');
 readyAp(raid,0,1);
 assert.equal(acts(raid).some(a=>a.mode==='aot2:AOT-2-022'&&a.uid===founding.uid),true);
 const before=raid.players[0].hand.length;
 raid=use(raid,{type:'activate',uid:founding.uid,mode:'aot2:AOT-2-022'});
 assert.equal(raid.pending.id,'AOT-2-022');
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(raid.players[0].hand.length,before);
 assert.equal(acts(raid).some(a=>a.mode==='aot2:AOT-2-022'),false);

 let moved=toPhase(fresh(counts,223),'move');
 const sitting=put(moved,0,'AOT-2-022','energy',0,true);
 const shift=acts(moved).find(a=>a.type==='move'&&a.uid===sitting.uid);
 assert.ok(shift,'a line change is a normal move');
 moved=use(moved,shift);
 moved=toPhase(moved,'main');
 readyAp(moved,0,1);
 assert.equal(acts(moved).some(a=>a.mode==='aot2:AOT-2-022'&&a.uid===sitting.uid),false);

 let block=toPhase(fresh(counts,224),'main');
 const attacker=put(block,1,'AOT-2-008','front',0,true);
 const wall=put(block,0,'AOT-2-022','front',0,true);
 const small=put(block,0,'AOT-2-004','front',1,true);
 setLife(block,0,1);
 block=toSide(block,1,'attack');
 block=use(block,{type:'attack',uid:attacker.uid});
 const blockers=acts(block).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(wall.uid),false);
 assert.equal(blockers.includes(small.uid),true);
 assertUniversalMatch(packs,block);
});

test('Zeke looks privately, and the outside draw belongs only to this entry',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-024','AOT-2-031','AOT-2-004','AOT-2-020']);
 let look=toPhase(fresh(counts,24),'main');
 put(look,0,'AOT-2-001','energy',0,true);
 readyAp(look,0,1);
 stackTop(look,0,['AOT-2-004','AOT-2-020','AOT-2-001']);
 const window=look.players[0].deck.slice(0,3).map(c=>c.uid);
 const reveals=look.publicReveals.length;
 look=play(look,toHand(look,0,'AOT-2-024').uid,'energy');
 assert.equal(look.pending.step,'lookPick');
 assert.equal(acts(look).some(a=>a.mode==='draw'),false);
 assert.deepEqual(universalPrivateChoices(packs,look,0).inspected.map(c=>c.uid),window);
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assert.equal(look.publicReveals.length,reveals);
 look=pick(look,a=>a.mode==='done');
 while(look.pending?.step==='lookOrder')look=pick(look,a=>true);
 assert.equal(look.pending,null);
 assert.deepEqual(look.players[0].deck.slice(-3).map(c=>c.uid).sort(),[...window].sort());
 assertUniversalMatch(packs,look);

 let moved=toPhase(fresh(counts,241),'move');
 const sitting=put(moved,0,'AOT-2-024','energy',0,true);
 moved=use(moved,acts(moved).find(a=>a.type==='move'&&a.uid===sitting.uid));
 assert.equal(moved.pending,null);
 assert.equal(field(moved,0,sitting.uid)!==null,true);
 assertUniversalMatch(packs,moved);
});

test('the Beast Titan grants impact and the higher cap only from its raid on-play',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-009','AOT-2-012','AOT-2-020','AOT-2-023','AOT-2-025','AOT-2-031']);
 let ordinary=toPhase(fresh(counts,25),'main');
 put(ordinary,0,'AOT-2-001','energy',0,true);
 put(ordinary,0,'AOT-2-003','energy',1,true);
 put(ordinary,0,'AOT-2-004','energy',2,true);
 readyAp(ordinary,0,2);
 const played=toHand(ordinary,0,'AOT-2-025');
 ordinary=play(ordinary,played.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(universalImpact(packs,ordinary,field(ordinary,0,played.uid)),0);

 let low=toPhase(fresh(counts,251),'main');
 put(low,0,'AOT-2-001','energy',0,true);
 put(low,0,'AOT-2-003','energy',1,true);
 put(low,0,'AOT-2-012','energy',2,true);
 const base=put(low,0,'AOT-2-023','front',0,true);
 const small=put(low,1,'AOT-2-004','front',0,true);
 const mid=put(low,1,'AOT-2-009','front',1,true);
 readyAp(low,0,2);
 const beast=toHand(low,0,'AOT-2-025');
 low=use(low,acts(low).find(a=>a.type==='raid'&&a.uid===beast.uid&&a.baseUid===base.uid));
 assert.equal(low.pending.id,'AOT-2-025');
 const targets=acts(low).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(targets.includes(small.uid),true);
 assert.equal(targets.includes(mid.uid),false);
 assert.equal(acts(low).some(a=>a.mode==='done'),true);
 low=pick(low,a=>a.mode==='done');
 assert.equal(field(low,1,small.uid)!==null,true);
 assert.equal(universalImpact(packs,low,field(low,0,beast.uid)),1);

 let high=toPhase(fresh(counts,252),'main');
 put(high,0,'AOT-2-001','energy',0,true);
 put(high,0,'AOT-2-003','energy',1,true);
 put(high,0,'AOT-2-012','energy',2,true);
 const zeke=put(high,0,'AOT-2-023','front',0,true);
 put(high,0,'AOT-2-020','front',1,true);
 const ymir=toHand(high,0,'AOT-2-031');
 high.players[0].hand.splice(high.players[0].hand.indexOf(ymir),1);
 high.players[0].outside.push(ymir);
 const victim=put(high,1,'AOT-2-009','front',0,true);
 readyAp(high,0,2);
 const copy=toHand(high,0,'AOT-2-025');
 high=use(high,acts(high).find(a=>a.type==='raid'&&a.uid===copy.uid&&a.baseUid===zeke.uid));
 assert.equal(acts(high).some(a=>a.mode==='retire'&&a.uid===victim.uid),true);
 high=pick(high,a=>a.uid===victim.uid);
 assert.equal(high.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(universalImpact(packs,high,field(high,0,copy.uid)),1);
 assertUniversalMatch(packs,high);
});

test('Armored Reiner removes impact for that battle',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-008','AOT-2-018']);
 let s=toPhase(fresh(counts,18),'attack');
 put(s,0,'AOT-2-001','energy',0,true);
 const mikasa=put(s,0,'AOT-2-008','front',0,true);
 const reiner=put(s,1,'AOT-2-018','front',0,true);
 setLife(s,1,1);
 assert.equal(universalImpact(packs,s,mikasa),1);
 s=use(s,{type:'attack',uid:mikasa.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===reiner.uid);
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].outside.some(c=>c.uid===reiner.uid),true);
 assertUniversalMatch(packs,s);
});

test('life triggers for this batch follow the printed kind',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-005','AOT-2-008','AOT-2-009','AOT-2-011','AOT-2-015','AOT-2-017']);
 let none=toPhase(fresh(counts,2501),'attack');
 put(none,0,'AOT-2-001','energy',0,true);
 const striker=put(none,0,'AOT-2-005','front',0,true);
 setLife(none,1,2);
 none.players[1].life.unshift(take(none,1,'AOT-2-001'));
 none=swing(none,striker.uid);
 const flipped=none.players[1].outside.find(c=>c.cardId==='AOT-2-001');
 assert.ok(flipped);
 assert.equal(none.pending,null);

 let active=toPhase(fresh(counts,2503),'attack');
 put(active,1,'AOT-2-001','energy',0,true);
 const rested=put(active,1,'AOT-2-005','front',0,false);
 const attacker=put(active,0,'AOT-2-005','front',0,true);
 put(active,0,'AOT-2-001','energy',0,true);
 setLife(active,1,2);
 active.players[1].life.unshift(take(active,1,'AOT-2-003'));
 active=swing(active,attacker.uid);
 assert.equal(active.pending.kind,'life-trigger');
 assert.equal(active.pending.trigger,'active');
 active=pick(active,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(active,1,rested.uid).ready,true);

 let color=toPhase(fresh(counts,2508),'main');
 put(color,0,'AOT-2-001','energy',0,true);
 put(color,0,'AOT-2-004','energy',1,true);
 put(color,0,'AOT-2-005','energy',2,true);
 const victim=put(color,0,'AOT-2-009','front',0,true);
 setLife(color,1,2);
 color.players[1].life.unshift(take(color,1,'AOT-2-008'));
 color=toPhase(color,'attack');
 color=swing(color,victim.uid);
 assert.equal(color.pending.trigger,'color');
 color=pick(color,a=>a.mode==='colorRestSkip'&&a.uid===victim.uid);
 assert.equal(field(color,0,victim.uid).ready,false);
 color=toSide(color,1,'start');
 assert.equal(field(color,0,victim.uid).ready,false);
 color=toSide(color,0,'start');
 assert.equal(field(color,0,victim.uid).ready,true);

 let got=toPhase(fresh(counts,2509),'attack');
 put(got,0,'AOT-2-001','energy',0,true);
 const hand=got.players[1].hand.length;
 const getter=put(got,0,'AOT-2-005','front',0,true);
 setLife(got,1,2);
 const life=take(got,1,'AOT-2-009');
 got.players[1].life.unshift(life);
 got=swing(got,getter.uid);
 assert.equal(got.pending.trigger,'get');
 got=pick(got,a=>a.mode==='get');
 assert.equal(got.players[1].hand.some(c=>c.uid===life.uid),true);
 assert.equal(got.players[1].hand.length,hand+1);

 let drawn=toPhase(fresh(counts,2511),'attack');
 put(drawn,0,'AOT-2-001','energy',0,true);
 const drawer=put(drawn,0,'AOT-2-005','front',0,true);
 setLife(drawn,1,2);
 const before=drawn.players[1].hand.length;
 const trigger=take(drawn,1,'AOT-2-011');
 drawn.players[1].life.unshift(trigger);
 drawn=swing(drawn,drawer.uid);
 assert.equal(drawn.pending.trigger,'draw');
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].hand.length,before+1);
 assert.equal(drawn.players[1].hand.some(c=>c.uid===trigger.uid),false);
 assert.equal(drawn.players[1].outside.some(c=>c.uid===trigger.uid),true);

 let raid=toPhase(fresh(counts,2517),'attack');
 put(raid,1,'AOT-2-001','energy',0,true);
 put(raid,1,'AOT-2-003','energy',1,true);
 put(raid,1,'AOT-2-004','energy',2,true);
 const base=put(raid,1,'AOT-2-015','front',0,true);
 const hitter=put(raid,0,'AOT-2-005','front',0,true);
 put(raid,0,'AOT-2-001','energy',0,true);
 setLife(raid,1,2);
 const jaw=take(raid,1,'AOT-2-017');
 raid.players[1].life.unshift(jaw);
 raid=swing(raid,hitter.uid);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(acts(raid).some(a=>a.mode==='get'),true);
 assert.equal(acts(raid).some(a=>a.mode==='raid'&&a.baseUid===base.uid),true);
 raid=pick(raid,a=>a.mode==='get');
 assert.equal(raid.players[1].hand.some(c=>c.uid===jaw.uid),true);
 assertUniversalMatch(packs,raid);
});
