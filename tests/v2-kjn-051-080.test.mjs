import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalEnergyByColor,
 universalImpact, universalImpactNull, universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];
const SID='シド・カゲノー';
const SEVEN=['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070'];

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
function parkHand(s,p){s.players[p].deck.push(...s.players[p].hand.splice(0));}
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
 if(!action)throw Error('No play '+uid+' '+line+(s.pending?' pending '+s.pending.kind:''));
 return use(s,action);
}
function cast(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event '+uid);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.from!=='removed');
 if(!action)throw Error('No raid onto '+baseUid);
 return use(s,action);
}
function activate(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode==='kjn:0');
 if(!action)throw Error('No activate '+uid+' '+s.phase);
 return use(s,action);
}
function fuel(s,id,n,p=0){for(let i=0;i<n;i++)put(s,p,id,'energy',i,true);}
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
function produced(s,p,uid){return universalCardEnergy(pack,s,p,find(s,p,uid));}
function purple(s,p=0){return universalEnergyByColor(pack,s,p).purple||0;}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;}
function attack(s,uid){return use(s,{type:'attack',uid});}
function hit(s,uid){
 s=attack(s,uid);
 if(s.pending?.kind==='block')s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function silence(s,card,controller=1){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function hiddenFrom(s,viewer,uids){
 const view=JSON.stringify(universalPublicView(packs,s,viewer));
 const priv=universalPrivateChoices(packs,s,viewer);
 const text=view+(priv===null?'':JSON.stringify(priv));
 return uids.every(uid=>!text.includes(uid));
}
function controllerSees(s,viewer,cardId){
 const priv=universalPrivateChoices(packs,s,viewer);
 return JSON.stringify(priv||'').includes(cardId);
}
function main(ids,seed){
 const s=toPhase(fresh(ids,seed),'main');
 readyAp(s);
 return s;
}
function orderTop(s,uids){
 for(const uid of uids)s=choose(s,a=>a.uid===uid);
 return s;
}
function fillOutside(s,p,n){
 while(s.players[p].outside.length<n&&s.players[p].deck.length)
  s.players[p].outside.push(s.players[p].deck.pop());
}
function lay(s,p,ids,ready=true){
 ids.forEach((id,i)=>put(s,p,id,i<4?'front':'energy',i<4?i:i-4,ready));
}
function lift(s,p,uid){
 for(const line of ['front','energy']){
  const slot=s.players[p][line].findIndex(c=>c?.uid===uid);
  if(slot<0)continue;
  const card=s.players[p][line][slot];
  s.players[p][line][slot]=null;
  card.fieldEntryStamp=null;
  s.players[p].outside.push(card);
  return card;
 }
 throw Error('Not on the field '+uid);
}
function openLife(ids,id,seed,setup){
 let s=toPhase(fresh(ids,seed),'attack');
 const hitter=put(s,0,'KJN-1-052','front',0,true);
 if(setup)setup(s);
 setLife(s,1,[id,'KJN-1-052']);
 s=hit(s,hitter.uid);
 return s;
}

test('KJN-1-048 and 049 count as Sid until silenced, and their raid life uses printed energy',()=>{
 assert.equal(cardHasName(pack.cards['KJN-1-048'],SID),true);
 assert.equal(cardHasName(pack.cards['KJN-1-049'],SID),true);
 const ids=['KJN-1-048','KJN-1-049','KJN-1-055','KJN-1-044','KJN-1-041','KJN-1-052','KJN-1-042'];
 let named=main(ids,48001);
 fuel(named,'KJN-1-041',2);
 const alias=put(named,0,'KJN-1-048','front',0,true);
 parkHand(named,0);
 toHand(named,0,'KJN-1-042');
 const sided=toHand(named,0,'KJN-1-055');
 named=play(named,sided.uid);
 assert.equal(named.pending.step,'handOut');
 named=choose(named,a=>a.mode==='done');
 let other=main(ids,48002);
 fuel(other,'KJN-1-041',2);
 put(other,0,'KJN-1-049','energy',2,true);
 const second=toHand(other,0,'KJN-1-055');
 other=play(other,second.uid);
 assert.equal(other.pending.step,'handOut');
 let muted=main(ids,48003);
 fuel(muted,'KJN-1-041',2);
 const quiet=put(muted,0,'KJN-1-048','front',0,true);
 silence(muted,quiet);
 const blocked=toHand(muted,0,'KJN-1-055');
 muted=play(muted,blocked.uid);
 assert.equal(muted.pending,null);
 assert.equal(cardHasName(pack.cards['KJN-1-048'],SID,true),false);

 let paid=openLife(ids,'KJN-1-048',48004,s=>{
  fuel(s,'KJN-1-041',3,1);
  put(s,1,'KJN-1-044','front',0,true);
  top(s,1,['KJN-1-042','KJN-1-041']);
 });
 assert.equal(paid.pending.trigger,'raid');
 assert.ok(purple(paid,1)>=6);
 const base=paid.players[1].front.find(c=>c?.cardId==='KJN-1-044');
 assert.equal(legal(paid,a=>a.mode==='get'),true);
 assert.equal(legal(paid,a=>a.mode==='raid'&&a.baseUid===base.uid),true);
 const ap=apReady(paid,1);
 const window=paid.players[1].deck.slice(0,2).map(c=>c.uid);
 paid=choose(paid,a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(apReady(paid,1),ap);
 const body=paid.players[1].front.find(c=>c?.cardId==='KJN-1-048');
 assert.equal(body.ready,true);
 assert.equal(body.stack[0].uid,base.uid);
 assert.equal(paid.pending.step,'takeOne');
 assert.equal(hiddenFrom(paid,0,window),true);
 assert.equal(controllerSees(paid,1,'KJN-1-042'),true);
 paid=choose(paid,a=>a.mode==='take');
 assert.equal(paid.pending,null);

 let short=openLife(ids,'KJN-1-048',48005,s=>{
  fuel(s,'KJN-1-041',2,1);
  put(s,1,'KJN-1-044','front',0,true);
 });
 assert.ok(purple(short,1)<6);
 assert.equal(legal(short,a=>a.mode==='get'),true);
 assert.equal(legal(short,a=>a.mode==='raid'),false);
 short=choose(short,a=>a.mode==='get');
 assert.equal(short.players[1].hand.some(c=>c.cardId==='KJN-1-048'),true);

 let bare=openLife(ids,'KJN-1-049',48006,s=>{
  fuel(s,'KJN-1-041',4,1);
 });
 assert.ok(purple(bare,1)>=8);
 assert.equal(legal(bare,a=>a.mode==='raid'),false);
 assert.equal(legal(bare,a=>a.mode==='get'),true);

 let raided=openLife(ids,'KJN-1-049',48007,s=>{
  fuel(s,'KJN-1-041',4,1);
  put(s,1,'KJN-1-044','front',0,true);
  toOutside(s,1,'KJN-1-042');
 });
 const printed=raided.players[1].front.find(c=>c?.cardId==='KJN-1-044');
 const before=apReady(raided,1);
 raided=choose(raided,a=>a.mode==='raid'&&a.baseUid===printed.uid&&a.line==='front');
 const shadow=raided.players[1].front.find(c=>c?.cardId==='KJN-1-049');
 assert.equal(shadow.ready,true);
 assert.equal(universalImpact(pack,raided,shadow),1);
 assert.equal(raided.pending.step,'recoverEnergy');
 assert.equal(apReady(raided,1),before);
 raided=choose(raided,a=>a.mode==='done');
 assert.equal(raided.pending,null);
 assertUniversalMatch(packs,paid);
 assertUniversalMatch(packs,raided);
});

test('KJN-1-051 adds one purple per ten outside cards and orders any kept top privately',()=>{
 const ids=['KJN-1-051','KJN-1-041','KJN-1-042','KJN-1-044'];
 let s=main(ids,51001);
 const body=put(s,0,'KJN-1-051','energy',0,true);
 assert.equal(produced(s,0,body.uid),1);
 fillOutside(s,0,9);
 assert.equal(produced(s,0,body.uid),1);
 fillOutside(s,0,20);
 assert.equal(produced(s,0,body.uid),3);
 silence(s,body);
 assert.equal(produced(s,0,body.uid),1);

 let look=main(ids,51002);
 fuel(look,'KJN-1-041',2);
 const window=top(look,0,['KJN-1-044','KJN-1-042']);
 const card=toHand(look,0,'KJN-1-051');
 look=play(look,card.uid);
 assert.equal(look.pending.kind,'effect-top-inspect-many');
 assert.equal(hiddenFrom(look,1,window.map(c=>c.uid)),true);
 assert.equal(controllerSees(look,0,'KJN-1-044'),true);
 assert.equal(controllerSees(look,0,'KJN-1-042'),true);
 look=choose(look,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
 look=orderTop(look,[window[1].uid,window[0].uid]);
 assert.deepEqual(look.players[0].deck.slice(0,2).map(c=>c.uid),[window[1].uid,window[0].uid]);
 assert.equal(look.players[0].outside.some(c=>window.some(x=>x.uid===c.uid)),false);
 const again=top(look,0,['KJN-1-044','KJN-1-042']);
 const second=toHand(look,0,'KJN-1-051');
 look=play(look,second.uid);
 look=choose(look,a=>a.type==='chooseInspectedOutside'&&a.uid===again[0].uid);
 look=choose(look,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
 look=orderTop(look,[again[1].uid]);
 assert.equal(look.players[0].deck[0].uid,again[1].uid);
 assert.equal(look.players[0].outside.some(c=>c.uid===again[0].uid),true);
 assert.equal(look.publicReveals.some(r=>r.uid===again[1].uid),false);
 assertUniversalMatch(packs,look);
});

test('KJN-1-052 draws one and must discard one',()=>{
 const ids=['KJN-1-052','KJN-1-041'];
 let s=main(ids,52001);
 parkHand(s,0);
 const pay=toHand(s,0,'KJN-1-041');
 const card=toHand(s,0,'KJN-1-052');
 const deck=s.players[0].deck.length;
 s=play(s,card.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(legal(s,a=>a.uid===null),false);
 s=choose(s,a=>a.type==='chooseDiscard'&&a.uid===pay.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assertUniversalMatch(packs,s);
});

test('KJN-1-053 generates on the front only with ten outside and a Sid',()=>{
 const ids=['KJN-1-053','KJN-1-048','KJN-1-041'];
 let s=main(ids,53001);
 const sid=put(s,0,'KJN-1-048','energy',0,true);
 const body=put(s,0,'KJN-1-053','front',0,true);
 fillOutside(s,0,9);
 assert.equal(produced(s,0,body.uid),0);
 fillOutside(s,0,10);
 assert.equal(produced(s,0,body.uid),1);
 silence(s,sid);
 assert.equal(produced(s,0,body.uid),0);
 assertUniversalMatch(packs,s);
});

test('KJN-1-054 shows every top card, publishes only the one added, then discards',()=>{
 const ids=['KJN-1-054','KJN-1-057','KJN-1-041','KJN-1-042','KJN-1-044'];
 let s=main(ids,54001);
 fuel(s,'KJN-1-041',1);
 parkHand(s,0);
 const pay=toHand(s,0,'KJN-1-042');
 const window=top(s,0,['KJN-1-057','KJN-1-041','KJN-1-044']);
 const card=toHand(s,0,'KJN-1-054');
 s=play(s,card.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(hiddenFrom(s,1,window.map(c=>c.uid)),true);
 assert.equal(controllerSees(s,0,'KJN-1-041'),true);
 assert.equal(legal(s,a=>a.uid===window[0].uid),true);
 assert.equal(legal(s,a=>a.uid===window[1].uid),false);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[0].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid||r.uid===window[2].uid),false);
 s=orderTop(s,[window[2].uid,window[1].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.uid===pay.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 let miss=main(ids,54002);
 fuel(miss,'KJN-1-041',1);
 const blanks=top(miss,0,['KJN-1-041','KJN-1-042','KJN-1-044']);
 const other=toHand(miss,0,'KJN-1-054');
 const hand=miss.players[0].hand.length;
 miss=play(miss,other.uid);
 assert.equal(legal(miss,a=>a.uid!==null&&a.type==='chooseTopFiltered'),false);
 miss=orderTop(miss,blanks.map(c=>c.uid));
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].hand.length,hand-1);
 assert.equal(miss.publicReveals.some(r=>blanks.some(c=>c.uid===r.uid)),false);
 assertUniversalMatch(packs,miss);
});

test('KJN-1-055 discards up to two and draws that many only while Sid is live',()=>{
 const ids=['KJN-1-055','KJN-1-048','KJN-1-049','KJN-1-041','KJN-1-042'];
 let none=main(ids,55001);
 fuel(none,'KJN-1-041',2);
 none=play(none,toHand(none,0,'KJN-1-055').uid);
 assert.equal(none.pending,null);
 let sided=main(ids,55002);
 fuel(sided,'KJN-1-041',2);
 put(sided,0,'KJN-1-049','front',1,true);
 parkHand(sided,0);
 const a=toHand(sided,0,'KJN-1-042');
 const b=toHand(sided,0,'KJN-1-041');
 const firstCopy=toHand(sided,0,'KJN-1-055');
 const deck=sided.players[0].deck.length;
 sided=play(sided,firstCopy.uid);
 sided=choose(sided,x=>x.mode==='done');
 assert.equal(sided.players[0].deck.length,deck);
 const secondCopy=toHand(sided,0,'KJN-1-055');
 const next=sided.players[0].deck.length;
 sided=play(sided,secondCopy.uid);
 sided=choose(sided,x=>x.mode==='out'&&x.uid===a.uid);
 assert.equal(legal(sided,x=>x.mode==='done'),true);
 sided=choose(sided,x=>x.mode==='out'&&x.uid===b.uid);
 assert.equal(sided.players[0].deck.length,next-2);
 assert.equal(sided.players[0].hand.length,2);
 let muted=main(ids,55003);
 fuel(muted,'KJN-1-041',2);
 silence(muted,put(muted,0,'KJN-1-048','front',0,true));
 muted=play(muted,toHand(muted,0,'KJN-1-055').uid);
 assert.equal(muted.pending,null);
 assertUniversalMatch(packs,muted);
});

test('KJN-1-056 publishes two, takes distinct names, and one Alpha main replaces itself at seven names',()=>{
 const ids=['KJN-1-056','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070','KJN-1-041','KJN-1-051'];
 let look=main(ids,56001);
 fuel(look,'KJN-1-041',3);
 const base=put(look,0,'KJN-1-052','front',0,true);
 const window=top(look,0,['KJN-1-057','KJN-1-051']);
 look=raidOnto(look,toHand(look,0,'KJN-1-056').uid,base.uid);
 assert.equal(look.pending.step,'distinctHand');
 assert.equal(look.publicReveals.filter(r=>window.some(c=>c.uid===r.uid)).length,2);
 assert.equal(hiddenFrom(look,1,window.map(c=>c.uid)),false);
 assert.equal(legal(look,a=>a.uid===window[1].uid),false);
 look=choose(look,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(look.players[0].outside.some(c=>c.uid===window[1].uid),true);
 const body=look.players[0].front.find(c=>c?.cardId==='KJN-1-056');
 look=activate(look,body.uid);
 assert.equal(universalImpact(pack,look,find(look,0,body.uid)),1);
 assert.equal(legal(look,a=>a.type==='activate'&&a.uid===body.uid),false);

 let many=main(ids,56002);
 fuel(many,'KJN-1-041',3);
 const root=put(many,0,'KJN-1-052','front',0,true);
 const pair=top(many,0,['KJN-1-057','KJN-1-059']);
 many=raidOnto(many,toHand(many,0,'KJN-1-056').uid,root.uid);
 many=choose(many,a=>a.mode==='take'&&a.uid===pair[0].uid);
 many=choose(many,a=>a.mode==='take'&&a.uid===pair[1].uid);
 assert.equal(many.players[0].hand.filter(c=>pair.some(x=>x.uid===c.uid)).length,2);
 assert.equal(many.players[0].outside.some(c=>pair.some(x=>x.uid===c.uid)),false);
 for(let i=0;i<4;i++){
  const sitting=many.players[0].energy[i];
  if(sitting)lift(many,0,sitting.uid);
 }
 ['KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070']
  .forEach((id,i)=>put(many,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 const live=many.players[0].front.find(c=>c?.cardId==='KJN-1-056');
 many=activate(many,live.uid);
 assert.equal(many.pending.step,'buffImpact');
 assert.equal(legal(many,a=>a.mode==='skip'),false);
 const picked=many.players[0].energy.find(c=>c?.cardId==='KJN-1-070');
 many=choose(many,a=>a.mode==='buff'&&a.uid===picked.uid);
 assert.equal(bp(many,0,picked.uid),3000);
 assert.equal(universalImpact(pack,many,find(many,0,picked.uid)),1);
 assert.equal(universalImpact(pack,many,find(many,0,live.uid)),0);

 let twice=main(ids,56003);
 fuel(twice,'KJN-1-041',3);
 const firstBase=put(twice,0,'KJN-1-052','front',0,true);
 top(twice,0,['KJN-1-057','KJN-1-059']);
 const first=toHand(twice,0,'KJN-1-056');
 twice=raidOnto(twice,first.uid,firstBase.uid);
 twice=choose(twice,a=>a.mode==='done');
 const secondBase=put(twice,0,'KJN-1-052','front',1,true);
 top(twice,0,['KJN-1-062','KJN-1-065']);
 const second=toHand(twice,0,'KJN-1-056');
 twice=raidOnto(twice,second.uid,secondBase.uid);
 twice=choose(twice,a=>a.mode==='done');
 twice=activate(twice,first.uid);
 assert.equal(legal(twice,a=>a.type==='activate'&&a.uid===second.uid),false);

 let life=openLife(ids,'KJN-1-056',56004,s=>{
  fuel(s,'KJN-1-041',3,1);
  put(s,1,'KJN-1-052','front',0,true);
 });
 assert.equal(legal(life,a=>a.mode==='get'),true);
 const host=life.players[1].front.find(c=>c?.cardId==='KJN-1-052');
 life=choose(life,a=>a.mode==='raid'&&a.baseUid===host.uid&&a.line==='front');
 assert.equal(life.pending.step,'distinctHand');
 assert.equal(life.players[1].front.find(c=>c?.cardId==='KJN-1-056').ready,true);
 life=choose(life,a=>a.mode==='done');
 assertUniversalMatch(packs,life);
});

test('KJN-1-057 looks at one card privately and puts it on top or outside',()=>{
 const ids=['KJN-1-057','KJN-1-041','KJN-1-042'];
 let s=main(ids,57001);
 const window=top(s,0,['KJN-1-042']);
 s=play(s,toHand(s,0,'KJN-1-057').uid);
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(hiddenFrom(s,1,[window[0].uid]),true);
 assert.equal(controllerSees(s,0,'KJN-1-042'),true);
 s=choose(s,a=>a.type==='chooseTopCard'&&a.mode==='top');
 assert.equal(s.players[0].deck[0].uid,window[0].uid);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 const gone=top(s,0,['KJN-1-041']);
 s=play(s,toHand(s,0,'KJN-1-057').uid);
 s=choose(s,a=>a.mode==='outside');
 assert.equal(s.players[0].outside.some(c=>c.uid===gone[0].uid),true);
 assert.equal(s.players[0].deck[0]?.uid===gone[0].uid,false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-058 rests and buffs one other character, or a second when seven names exist',()=>{
 const ids=['KJN-1-058','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070','KJN-1-052','KJN-1-041'];
 let s=main(ids,58001);
 const self=put(s,0,'KJN-1-058','front',0,true);
 const other=put(s,0,'KJN-1-041','front',1,true);
 s=activate(s,self.uid);
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(legal(s,a=>a.uid===self.uid),false);
 assert.equal(legal(s,a=>a.mode==='done'),false);
 s=choose(s,a=>a.mode==='buff'&&a.uid===other.uid);
 assert.equal(bp(s,0,other.uid),2500);
 assert.equal(s.pending,null);
 let many=main(ids,58002);
 const actor=put(many,0,'KJN-1-058','front',0,true);
 SEVEN.forEach((id,i)=>put(many,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 many=activate(many,actor.uid);
 const first=many.players[0].front.find(c=>c?.cardId==='KJN-1-052');
 many=choose(many,a=>a.mode==='buff'&&a.uid===first.uid);
 assert.equal(legal(many,a=>a.mode==='done'),true);
 const second=many.players[0].energy.find(c=>c?.cardId==='KJN-1-070');
 many=choose(many,a=>a.mode==='done');
 assert.equal(bp(many,0,first.uid),2500);
 assert.equal(bp(many,0,second.uid),2000);
 assertUniversalMatch(packs,many);
});

test('KJN-1-059 returns the top three to the top in the chosen order',()=>{
 const ids=['KJN-1-059','KJN-1-041','KJN-1-042','KJN-1-044'];
 let s=main(ids,59001);
 const window=top(s,0,['KJN-1-044','KJN-1-042','KJN-1-041']);
 s=play(s,toHand(s,0,'KJN-1-059').uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(hiddenFrom(s,1,window.map(c=>c.uid)),true);
 assert.equal(controllerSees(s,0,'KJN-1-041'),true);
 s=orderTop(s,[window[2].uid,window[0].uid,window[1].uid]);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),[window[2].uid,window[0].uid,window[1].uid]);
 assert.equal(s.players[0].outside.some(c=>window.some(x=>x.uid===c.uid)),false);
 assert.equal(s.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-060 generates one extra purple only while active on the energy line',()=>{
 const ids=['KJN-1-060','KJN-1-041'];
 let s=main(ids,60001);
 const body=put(s,0,'KJN-1-060','energy',0,true);
 assert.equal(produced(s,0,body.uid),2);
 body.ready=false;
 assert.equal(produced(s,0,body.uid),1);
 const front=put(s,0,'KJN-1-060','front',0,true);
 assert.equal(produced(s,0,front.uid),0);
 assertUniversalMatch(packs,s);
});

test('KJN-1-061 bottoms another Seven Shadow, then may rest-deploy one whose onPlay does not fire',()=>{
 const ids=['KJN-1-061','KJN-1-052','KJN-1-060','KJN-1-065','KJN-1-041'];
 let s=main(ids,61001);
 const self=put(s,0,'KJN-1-061','front',0,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 const buried=put(s,0,'KJN-1-065','front',1,true);
 const recruit=toOutside(s,0,'KJN-1-052');
 toOutside(s,0,'KJN-1-060');
 s=activate(s,self.uid);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='bottom'&&a.uid===buried.uid);
 assert.equal(s.players[0].deck.at(-1).uid,buried.uid);
 assert.equal(legal(s,a=>a.uid===s.players[0].outside.find(c=>c.cardId==='KJN-1-060').uid),false);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='dest'&&a.uid===recruit.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.equal(find(s,0,recruit.uid).ready,false);
 assert.equal(s.pending,null);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-062 draws and discards once, including when the deck is empty',()=>{
 const ids=['KJN-1-062','KJN-1-041'];
 let s=main(ids,62001);
 const self=put(s,0,'KJN-1-062','energy',0,true);
 parkHand(s,0);
 const pay=toHand(s,0,'KJN-1-041');
 const deck=s.players[0].deck.length;
 s=activate(s,self.uid);
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(s.players[0].deck.length,deck-1);
 s=choose(s,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 let empty=main(ids,62002);
 const actor=put(empty,0,'KJN-1-062','front',0,true);
 parkHand(empty,0);
 const left=toHand(empty,0,'KJN-1-041');
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty=activate(empty,actor.uid);
 assert.equal(empty.pending.step,'pay');
 empty=choose(empty,a=>a.mode==='discard'&&a.uid===left.uid);
 assert.equal(empty.players[0].outside.some(c=>c.uid===left.uid),true);
 assertUniversalMatch(packs,empty);
});

test('KJN-1-063 pays a card, mills up to one, and gains energy once outside reaches ten',()=>{
 const ids=['KJN-1-063','KJN-1-041'];
 let low=main(ids,63001);
 const self=put(low,0,'KJN-1-063','energy',0,true);
 parkHand(low,0);
 const pay=toHand(low,0,'KJN-1-041');
 fillOutside(low,0,8);
 low=activate(low,self.uid);
 low=choose(low,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(low.pending.step,'millMaybe');
 const secret=low.players[0].deck[0].uid;
 assert.equal(hiddenFrom(low,1,[secret]),true);
 low=choose(low,a=>a.mode==='skip');
 assert.equal(produced(low,0,self.uid),1);
 assert.equal(low.players[0].deck[0].uid,secret);
 let grown=main(ids,63002);
 const actor=put(grown,0,'KJN-1-063','energy',0,true);
 parkHand(grown,0);
 toHand(grown,0,'KJN-1-041');
 fillOutside(grown,0,8);
 const milled=grown.players[0].deck[0].uid;
 grown=activate(grown,actor.uid);
 grown=choose(grown,a=>a.mode==='discard');
 grown=choose(grown,a=>a.mode==='mill');
 assert.equal(grown.players[0].outside.some(c=>c.uid===milled),true);
 assert.equal(grown.pending,null);
 assert.equal(produced(grown,0,actor.uid),2);
 let already=main(ids,63003);
 const resting=put(already,0,'KJN-1-063','energy',0,true);
 parkHand(already,0);
 toHand(already,0,'KJN-1-041');
 fillOutside(already,0,10);
 already=activate(already,resting.uid);
 already=choose(already,a=>a.mode==='discard');
 already=choose(already,a=>a.mode==='skip');
 assert.equal(produced(already,0,resting.uid),2);
 assertUniversalMatch(packs,already);
});

test('KJN-1-064 draws on entry and actives another front Seven Shadow only at seven names',()=>{
 const ids=['KJN-1-064','KJN-1-055','KJN-1-057','KJN-1-059','KJN-1-065','KJN-1-067','KJN-1-070','KJN-1-041'];
 let draw=main(ids,64001);
 fuel(draw,'KJN-1-041',2);
 const drawn=toHand(draw,0,'KJN-1-064');
 const deck=draw.players[0].deck.length;
 draw=play(draw,drawn.uid);
 assert.equal(draw.pending,null);
 assert.equal(draw.players[0].deck.length,deck-1);
 let many=main(ids,64002);
 const fuelA=put(many,0,'KJN-1-055','energy',0,true);
 put(many,0,'KJN-1-055','energy',1,true);
 const rested=put(many,0,'KJN-1-057','front',0,false);
 ['KJN-1-059','KJN-1-065','KJN-1-067','KJN-1-070'].forEach((id,i)=>put(many,0,id,i<3?'front':'energy',i<3?i+1:2,true));
 const self=put(many,0,'KJN-1-064','energy',3,true);
 many=activate(many,self.uid);
 assert.equal(find(many,0,self.uid).ready,false);
 assert.equal(legal(many,a=>a.mode==='skip'),false);
 assert.equal(legal(many,a=>a.uid===self.uid),false);
 many=choose(many,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(many,0,rested.uid).ready,true);
 assert.equal(legal(many,a=>a.type==='activate'&&a.uid===self.uid),false);
 assert.equal(fuelA.cardId,'KJN-1-055');
 let few=main(ids,64003);
 put(few,0,'KJN-1-055','energy',0,true);
 put(few,0,'KJN-1-057','front',0,false);
 put(few,0,'KJN-1-059','front',1,true);
 put(few,0,'KJN-1-065','front',2,true);
 put(few,0,'KJN-1-067','front',3,true);
 const quiet=put(few,0,'KJN-1-064','energy',1,true);
 assert.equal(legal(few,a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assertUniversalMatch(packs,few);
});

test('KJN-1-065 has no continuous effect and its active trigger gives 3000',()=>{
 const ids=['KJN-1-065','KJN-1-052','KJN-1-041'];
 let s=main(ids,65001);
 s=play(s,toHand(s,0,'KJN-1-065').uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='KJN-1-065'),true);
 let life=openLife(ids,'KJN-1-065',65002,g=>{
  put(g,1,'KJN-1-052','front',0,false);
 });
 assert.equal(life.pending.trigger,'active');
 const rested=life.players[1].front.find(c=>c?.cardId==='KJN-1-052');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(bp(life,1,rested.uid),4500);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-065'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-066 is not blocked by BP 4000 at seven names, and the entry buff is only on its turn',()=>{
 const ids=['KJN-1-066','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-067','KJN-1-070','KJN-1-053','KJN-1-041','KJN-1-061','KJN-1-069'];
 let blocked=toPhase(fresh(ids,66001),'attack');
 const names=['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-067','KJN-1-070'];
 names.forEach((id,i)=>put(blocked,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 const self=put(blocked,0,'KJN-1-066','front',0,true);
 const big=put(blocked,1,'KJN-1-053','front',0,true);
 const small=put(blocked,1,'KJN-1-052','front',1,true);
 blocked=attack(blocked,self.uid);
 assert.equal(blocked.pending.kind,'block');
 assert.equal(legal(blocked,a=>a.type==='chooseBlock'&&a.uid===big.uid),false);
 assert.equal(legal(blocked,a=>a.type==='chooseBlock'&&a.uid===small.uid),true);
 let open=toPhase(fresh(ids,66002),'attack');
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-067'].forEach((id,i)=>put(open,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 const attacker=put(open,0,'KJN-1-066','front',0,true);
 const wall=put(open,1,'KJN-1-053','front',0,true);
 open=attack(open,attacker.uid);
 assert.equal(legal(open,a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 let silenced=toPhase(fresh(ids,66003),'attack');
 names.forEach((id,i)=>put(silenced,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 const muted=put(silenced,0,'KJN-1-066','front',0,true);
 silence(silenced,muted);
 const still=put(silenced,1,'KJN-1-053','front',0,true);
 silenced=attack(silenced,muted.uid);
 assert.equal(legal(silenced,a=>a.type==='chooseBlock'&&a.uid===still.uid),true);

 let own=main(ids,66004);
 fuel(own,'KJN-1-041',1);
 ['KJN-1-052','KJN-1-057','KJN-1-059'].forEach((id,i)=>put(own,0,id,'front',i,true));
 own=play(own,toHand(own,0,'KJN-1-066').uid,'energy');
 assert.equal(own.pending,null);
 let five=main(ids,66005);
 fuel(five,'KJN-1-041',1);
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062'].forEach((id,i)=>put(five,0,id,'front',i,true));
 const ally=five.players[0].front[0];
 five=play(five,toHand(five,0,'KJN-1-066').uid,'energy');
 assert.equal(five.pending.step,'buff');
 assert.equal(legal(five,a=>a.mode==='skip'),true);
 five=choose(five,a=>a.mode==='buff'&&a.uid===ally.uid);
 assert.equal(bp(five,0,ally.uid),2500);

 let theirs=openLife(ids,'KJN-1-069',66006,g=>{
  ['KJN-1-052','KJN-1-057','KJN-1-059'].forEach((id,i)=>put(g,1,id,'front',i,true));
  put(g,1,'KJN-1-062','energy',0,true);
  toOutside(g,1,'KJN-1-066');
  toOutside(g,1,'KJN-1-061');
 });
 assert.equal(theirs.pending.trigger,'color');
 const recruit=theirs.players[1].outside.find(c=>c.cardId==='KJN-1-066');
 const heavy=theirs.players[1].outside.find(c=>c.cardId==='KJN-1-061');
 assert.equal(legal(theirs,a=>a.mode==='colorOutside'&&a.uid===recruit.uid&&a.line==='front'),true);
 assert.equal(legal(theirs,a=>a.mode==='colorOutside'&&a.uid===recruit.uid&&a.line==='energy'),false);
 assert.equal(legal(theirs,a=>a.uid===heavy.uid),false);
 const ap=apReady(theirs,1);
 theirs=choose(theirs,a=>a.mode==='colorOutside'&&a.uid===recruit.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(apReady(theirs,1),ap);
 assert.equal(find(theirs,1,recruit.uid).ready,true);
 assert.equal(theirs.pending,null);
 assertUniversalMatch(packs,theirs);
});

test('KJN-1-067 has no continuous effect and its draw trigger draws one',()=>{
 const ids=['KJN-1-067','KJN-1-052','KJN-1-041'];
 let s=main(ids,67001);
 s=play(s,toHand(s,0,'KJN-1-067').uid);
 assert.equal(s.pending,null);
 let life=openLife(ids,'KJN-1-067',67002);
 assert.equal(life.pending.trigger,'draw');
 const hand=life.players[1].hand.length;
 const deck=life.players[1].deck.length;
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,hand+1);
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-067'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-068 pays one card only at five names, then becomes active and gains 1000',()=>{
 const ids=['KJN-1-068','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-041'];
 let few=main(ids,68001);
 const quiet=put(few,0,'KJN-1-068','front',0,false);
 ['KJN-1-052','KJN-1-057','KJN-1-059'].forEach((id,i)=>put(few,0,id,'front',i+1,true));
 toHand(few,0,'KJN-1-041');
 assert.equal(legal(few,a=>a.type==='activate'&&a.uid===quiet.uid),false);
 let s=main(ids,68002);
 const self=put(s,0,'KJN-1-068','front',0,false);
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062'].forEach((id,i)=>put(s,0,id,'energy',i,true));
 parkHand(s,0);
 const pay=toHand(s,0,'KJN-1-041');
 s=activate(s,self.uid);
 assert.equal(find(s,0,self.uid).ready,false);
 s=choose(s,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(find(s,0,self.uid).ready,true);
 assert.equal(bp(s,0,self.uid),4000);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-069 locks Delta only after it activates, and sniper lasts through its turn',()=>{
 const ids=['KJN-1-069','KJN-1-055','KJN-1-041','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-070','KJN-1-052'];
 let seven=main(ids,69001);
 put(seven,0,'KJN-1-055','energy',0,true);
 put(seven,0,'KJN-1-055','energy',1,true);
 ['KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-070'].forEach((id,i)=>put(seven,0,id,i<3?'front':'energy',i<3?i:i-1,true));
 const first=toHand(seven,0,'KJN-1-069');
 seven=play(seven,first.uid,'front');
 assert.equal(find(seven,0,first.uid).sniperGranted?.turn,seven.turn);
 const covered=seven.players[0].energy.find(c=>c?.cardId==='KJN-1-055');
 const second=toHand(seven,0,'KJN-1-069');
 seven=use(seven,legalUniversalActions(packs,seven).find(a=>a.type==='play'&&a.uid===second.uid&&a.replaceUid===covered.uid));
 assert.equal(find(seven,0,second.uid).sniperGranted,undefined);
 const foe=put(seven,1,'KJN-1-052','front',0,true);
 seven=toPhase(seven,'attack');
 const shot=legalUniversalActions(packs,seven).find(a=>a.type==='attack'&&a.uid===first.uid&&a.targetUid===foe.uid);
 assert.ok(shot);
 seven=use(seven,shot);
 assert.equal(seven.pending,null);
 assert.equal(seven.blocksByUid[foe.uid],undefined);
 assert.equal(seven.players[1].outside.some(c=>c.uid===foe.uid),true);
 let later=main(ids,69002);
 put(later,0,'KJN-1-055','energy',0,true);
 put(later,0,'KJN-1-055','energy',1,true);
 put(later,0,'KJN-1-057','front',0,true);
 put(later,0,'KJN-1-059','front',1,true);
 const early=toHand(later,0,'KJN-1-069');
 later=play(later,early.uid);
 assert.equal(find(later,0,early.uid).sniperGranted,undefined);
 put(later,0,'KJN-1-062','front',3,true);
 put(later,0,'KJN-1-065','energy',2,true);
 put(later,0,'KJN-1-070','energy',3,true);
 const coveredLater=later.players[0].energy.find(c=>c?.cardId==='KJN-1-055');
 const next=toHand(later,0,'KJN-1-069');
 later=use(later,legalUniversalActions(packs,later).find(a=>a.type==='play'&&a.uid===next.uid&&a.replaceUid===coveredLater.uid));
 assert.equal(find(later,0,next.uid).sniperGranted?.turn,later.turn);
 assert.equal(find(later,0,early.uid).sniperGranted,undefined);
 later=passTo(later,1,'main');
 assert.equal(find(later,0,next.uid).sniperGranted,undefined);
 assertUniversalMatch(packs,later);
});

test('KJN-1-070 rests another active front character and then generates one more purple',()=>{
 const ids=['KJN-1-070','KJN-1-052','KJN-1-041'];
 let s=main(ids,70001);
 const self=put(s,0,'KJN-1-070','energy',0,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 const ally=put(s,0,'KJN-1-052','front',0,false);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 ally.ready=true;
 s=activate(s,self.uid);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='rest'&&a.uid===ally.uid);
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(find(s,0,ally.uid).ready,false);
 assert.equal(produced(s,0,self.uid),2);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-071 may rest-deploy one purple Seven Shadow of energy 2 or less',()=>{
 const ids=['KJN-1-071','KJN-1-065','KJN-1-061','KJN-1-051','KJN-1-041'];
 let s=main(ids,71001);
 fuel(s,'KJN-1-041',2);
 parkHand(s,0);
 const good=toHand(s,0,'KJN-1-065');
 const heavy=toHand(s,0,'KJN-1-061');
 const plain=toHand(s,0,'KJN-1-051');
 s=play(s,toHand(s,0,'KJN-1-071').uid);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(legal(s,a=>a.uid===good.uid),true);
 assert.equal(legal(s,a=>a.uid===heavy.uid),false);
 assert.equal(legal(s,a=>a.uid===plain.uid),false);
 assert.equal(legal(s,a=>a.uid===null),true);
 s=choose(s,a=>a.type==='chooseHandRest'&&a.uid===good.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(find(s,0,good.uid).ready,false);
 assert.equal(s.pending,null);
 let skipped=main(ids,71002);
 fuel(skipped,'KJN-1-041',2);
 parkHand(skipped,0);
 const kept=toHand(skipped,0,'KJN-1-065');
 skipped=play(skipped,toHand(skipped,0,'KJN-1-071').uid);
 skipped=choose(skipped,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===kept.uid),true);
 assertUniversalMatch(packs,skipped);
});

test('KJN-1-072 gains 1500 on its turn only while five Seven Shadow names are on the field',()=>{
 const ids=['KJN-1-072','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-041'];
 let s=main(ids,72001);
 const self=put(s,0,'KJN-1-072','front',0,true);
 ['KJN-1-052','KJN-1-057','KJN-1-059'].forEach((id,i)=>put(s,0,id,'front',i+1,true));
 assert.equal(bp(s,0,self.uid),1500);
 put(s,0,'KJN-1-062','energy',0,true);
 assert.equal(bp(s,0,self.uid),3000);
 silence(s,self);
 assert.equal(bp(s,0,self.uid),1500);
 let live=main(ids,72002);
 const body=put(live,0,'KJN-1-072','front',0,true);
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062'].forEach((id,i)=>put(live,0,id,'energy',i,true));
 assert.equal(bp(live,0,body.uid),3000);
 live=passTo(live,1,'main');
 assert.equal(bp(live,0,body.uid),1500);
 assertUniversalMatch(packs,live);
});

test('KJN-1-073 gains energy only for a front Sid and mills up to two hidden cards',()=>{
 const ids=['KJN-1-073','KJN-1-048','KJN-1-041','KJN-1-044'];
 let s=main(ids,73001);
 const body=put(s,0,'KJN-1-073','energy',0,true);
 const sid=put(s,0,'KJN-1-048','energy',1,true);
 assert.equal(produced(s,0,body.uid),1);
 lift(s,0,sid.uid);
 const front=put(s,0,'KJN-1-048','front',0,true);
 assert.equal(produced(s,0,body.uid),2);
 silence(s,front);
 assert.equal(produced(s,0,body.uid),1);
 let mill=main(ids,73002);
 fuel(mill,'KJN-1-041',1);
 const window=top(mill,0,['KJN-1-044','KJN-1-048']);
 mill=play(mill,toHand(mill,0,'KJN-1-073').uid);
 assert.equal(mill.pending.kind,'effect-optional-mill');
 assert.equal(hiddenFrom(mill,1,window.map(c=>c.uid)),true);
 mill=choose(mill,a=>a.mode==='mill');
 assert.equal(mill.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(mill.pending.kind,'effect-optional-mill');
 mill=choose(mill,a=>a.mode==='skip');
 assert.equal(mill.players[0].deck[0].uid,window[1].uid);
 assert.equal(mill.pending,null);
 assertUniversalMatch(packs,mill);
});

test('KJN-1-074 nulls impact only while raided, bottoms only after a deploy that leaves four names, and draws at seven',()=>{
 const ids=['KJN-1-074','KJN-1-070','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-075','KJN-1-041','KJN-1-065','KJN-1-067'];
 let lone=main(ids,74001);
 const sitting=put(lone,0,'KJN-1-074','front',0,true);
 assert.equal(universalImpactNull(pack,lone,sitting),false);
 let skipped=main(ids,74002);
 fuel(skipped,'KJN-1-041',2);
 const base=put(skipped,0,'KJN-1-070','front',0,true);
 skipped=raidOnto(skipped,toHand(skipped,0,'KJN-1-074').uid,base.uid);
 const raider=skipped.players[0].front.find(c=>c?.cardId==='KJN-1-074');
 assert.equal(universalImpactNull(pack,skipped,raider),true);
 assert.equal(raider.ready,true);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);

 let fifth=main(ids,74003);
 fuel(fifth,'KJN-1-041',2);
 const host=put(fifth,0,'KJN-1-070','front',0,true);
 put(fifth,0,'KJN-1-052','front',1,true);
 put(fifth,0,'KJN-1-057','front',2,true);
 put(fifth,0,'KJN-1-059','front',3,true);
 const recruit=toHand(fifth,0,'KJN-1-062');
 fifth=raidOnto(fifth,toHand(fifth,0,'KJN-1-074').uid,host.uid);
 fifth=choose(fifth,a=>a.mode==='dest'&&a.uid===recruit.uid&&a.line==='energy'&&a.slot===2&&a.replaceUid===undefined);
 assert.equal(find(fifth,0,recruit.uid).ready,false);
 assert.equal(fifth.pending,null);

 let bottom=main(ids,74004);
 fuel(bottom,'KJN-1-041',2);
 const root=put(bottom,0,'KJN-1-070','front',0,true);
 put(bottom,0,'KJN-1-052','front',1,true);
 put(bottom,0,'KJN-1-057','front',2,true);
 put(bottom,0,'KJN-1-065','front',3,true);
 const field=put(bottom,0,'KJN-1-075','energy',2,true);
 const copy=toOutside(bottom,0,'KJN-1-065');
 bottom=raidOnto(bottom,toHand(bottom,0,'KJN-1-074').uid,root.uid);
 const topCard=bottom.players[0].front.find(c=>c?.cardId==='KJN-1-074');
 bottom=choose(bottom,a=>a.mode==='dest'&&a.uid===copy.uid&&a.line==='energy'&&a.slot===3);
 assert.equal(bottom.pending.step,'bottom');
 assert.equal(legal(bottom,a=>a.mode==='skip'),false);
 assert.equal(legal(bottom,a=>a.uid===copy.uid),false);
 assert.equal(legal(bottom,a=>a.uid===field.uid),true);
 assert.equal(legal(bottom,a=>a.uid===topCard.uid),true);
 bottom=choose(bottom,a=>a.mode==='bottom'&&a.uid===field.uid);
 assert.equal(bottom.players[0].deck.at(-1).uid,field.uid);
 assert.equal(find(bottom,0,copy.uid).ready,false);

 let plain=main(ids,74005);
 const unraided=put(plain,0,'KJN-1-074','front',0,true);
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067'].forEach((id,i)=>put(plain,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 assert.equal(legal(plain,a=>a.type==='activate'&&a.uid===unraided.uid),false);
 let draw=main(ids,74007);
 fuel(draw,'KJN-1-041',2);
 const raidHost=put(draw,0,'KJN-1-070','front',0,true);
 draw=raidOnto(draw,toHand(draw,0,'KJN-1-074').uid,raidHost.uid);
 draw=choose(draw,a=>a.mode==='skip');
 for(const sitting of draw.players[0].energy.filter(Boolean))lift(draw,0,sitting.uid);
 ['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067'].forEach((id,i)=>put(draw,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 const actor=draw.players[0].front.find(c=>c?.cardId==='KJN-1-074');
 assert.equal(legal(draw,a=>a.type==='activate'&&a.uid===actor.uid),true);
 const energyCopy=put(draw,0,'KJN-1-074','energy',3,true);
 assert.equal(legal(draw,a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 const hand=draw.players[0].hand.length;
 draw=activate(draw,actor.uid);
 assert.equal(draw.players[0].hand.length,hand+1);
 assert.equal(legal(draw,a=>a.type==='activate'&&a.uid===actor.uid),false);
 let life=openLife(ids,'KJN-1-074',74006,g=>{
  fuel(g,'KJN-1-041',2,1);
  put(g,1,'KJN-1-070','front',0,true);
 });
 assert.equal(legal(life,a=>a.mode==='get'),true);
 const lifeBase=life.players[1].front.find(c=>c?.cardId==='KJN-1-070');
 life=choose(life,a=>a.mode==='raid'&&a.baseUid===lifeBase.uid&&a.line==='front');
 assert.equal(life.pending.step,'betaDeploy');
 assert.equal(life.players[1].front.find(c=>c?.cardId==='KJN-1-074').ready,true);
 life=choose(life,a=>a.mode==='skip');
 assertUniversalMatch(packs,life);
});

test('KJN-1-075 enters active, peeks privately, and buffs only after outside reaches ten',()=>{
 const ids=['KJN-1-075','KJN-1-052','KJN-1-041','KJN-1-044'];
 let s=main(ids,75001);
 fuel(s,'KJN-1-041',2);
 const card=toHand(s,0,'KJN-1-075');
 assert.equal(legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'),false);
 s=play(s,card.uid,'energy');
 assert.equal(find(s,0,card.uid).ready,true);
 assert.equal(s.pending,null);
 const ally=put(s,0,'KJN-1-052','front',0,true);
 fillOutside(s,0,9);
 const seen=top(s,0,['KJN-1-044']);
 s=activate(s,card.uid);
 assert.equal(s.pending.step,'peekPlace');
 assert.equal(hiddenFrom(s,1,[seen[0].uid]),true);
 assert.equal(controllerSees(s,0,'KJN-1-044'),true);
 s=choose(s,a=>a.mode==='top');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,seen[0].uid);
 let grown=main(ids,75002);
 fuel(grown,'KJN-1-041',2);
 const field=toHand(grown,0,'KJN-1-075');
 grown=play(grown,field.uid,'energy');
 const target=put(grown,0,'KJN-1-052','front',0,true);
 fillOutside(grown,0,9);
 const moving=top(grown,0,['KJN-1-044']);
 grown=activate(grown,field.uid);
 grown=choose(grown,a=>a.mode==='outside');
 assert.equal(grown.players[0].outside.some(c=>c.uid===moving[0].uid),true);
 assert.equal(grown.pending.step,'buff');
 grown=choose(grown,a=>a.mode==='buff'&&a.uid===target.uid);
 assert.equal(bp(grown,0,target.uid),2500);
 let ready=main(ids,75003);
 fuel(ready,'KJN-1-041',2);
 const area=toHand(ready,0,'KJN-1-075');
 ready=play(ready,area.uid,'energy');
 const other=put(ready,0,'KJN-1-052','front',0,true);
 fillOutside(ready,0,10);
 ready=activate(ready,area.uid);
 ready=choose(ready,a=>a.mode==='top');
 assert.equal(ready.pending.step,'buff');
 ready=choose(ready,a=>a.mode==='skip');
 assert.equal(bp(ready,0,other.uid),1500);
 assertUniversalMatch(packs,ready);
});

test('KJN-1-076 costs two less beside Sid and must retire a front character of BP 5000 or less',()=>{
 const ids=['KJN-1-076','KJN-1-048','KJN-1-041','KJN-1-054','KJN-1-052','KJN-1-053','KJN-1-049'];
 let cheap=main(ids,76001);
 fuel(cheap,'KJN-1-041',2);
 put(cheap,0,'KJN-1-048','front',0,true);
 const small=put(cheap,1,'KJN-1-052','front',0,true);
 const big=put(cheap,1,'KJN-1-053','front',1,true);
 big.buffs=[{bp:2000,untilTurn:cheap.turn}];
 assert.equal(purple(cheap),4);
 assert.equal(bp(cheap,1,big.uid),6000);
 const event=toHand(cheap,0,'KJN-1-076');
 assert.equal(legal(cheap,a=>a.type==='event'&&a.uid===event.uid),true);
 cheap=cast(cheap,event.uid);
 assert.equal(cheap.pending.kind,'effect-retire-bp');
 assert.equal(legal(cheap,a=>a.uid===null),false);
 assert.equal(legal(cheap,a=>a.uid===small.uid),true);
 assert.equal(legal(cheap,a=>a.uid===big.uid),false);
 cheap=choose(cheap,a=>a.type==='chooseRetireBp'&&a.uid===small.uid);
 assert.equal(cheap.players[1].front.some(c=>c?.uid===small.uid),false);

 let full=main(ids,76002);
 fuel(full,'KJN-1-041',1);
 put(full,0,'KJN-1-054','energy',1,true);
 put(full,1,'KJN-1-052','front',0,true);
 assert.equal(purple(full),3);
 assert.equal(legal(full,a=>a.type==='event'&&a.uid===toHand(full,0,'KJN-1-076').uid),false);
 let muted=main(ids,76003);
 fuel(muted,'KJN-1-041',2);
 silence(muted,put(muted,0,'KJN-1-048','front',0,true));
 put(muted,1,'KJN-1-052','front',0,true);
 assert.equal(legal(muted,a=>a.type==='event'),false);
 let none=main(ids,76004);
 fuel(none,'KJN-1-041',2);
 put(none,0,'KJN-1-048','front',0,true);
 assert.equal(legal(none,a=>a.type==='event'&&a.uid===toHand(none,0,'KJN-1-076').uid),false);

 let life=openLife(ids,'KJN-1-076',76005,g=>{
  const victim=put(g,0,'KJN-1-053','front',1,true);
  victim.buffs=[{bp:2000,untilTurn:g.turn}];
 });
 assert.equal(life.pending.trigger,'special');
 const tall=life.players[0].front.find(c=>c?.cardId==='KJN-1-053');
 assert.equal(bp(life,0,tall.uid),6000);
 life=choose(life,a=>a.mode==='special'&&a.uid===tall.uid);
 assert.equal(life.players[0].front.some(c=>c?.uid===tall.uid),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-077 adds an AP-1 Seven Shadow, or rest-deploys it when the name is new and affordable',()=>{
 const ids=['KJN-1-077','KJN-1-052','KJN-1-065','KJN-1-061','KJN-1-041'];
 let same=main(ids,77001);
 fuel(same,'KJN-1-041',1);
 put(same,0,'KJN-1-052','front',0,true);
 const known=toOutside(same,0,'KJN-1-052');
 same=cast(same,toHand(same,0,'KJN-1-077').uid);
 assert.equal(same.pending.step,'sevenPick');
 assert.equal(legal(same,a=>a.mode==='skip'),false);
 same=choose(same,a=>a.mode==='pick'&&a.uid===known.uid);
 assert.equal(same.pending,null);
 assert.equal(same.players[0].hand.some(c=>c.uid===known.uid),true);
 let freshName=main(ids,77002);
 fuel(freshName,'KJN-1-041',1);
 const body=toOutside(freshName,0,'KJN-1-065');
 const costly=toOutside(freshName,0,'KJN-1-061');
 freshName=cast(freshName,toHand(freshName,0,'KJN-1-077').uid);
 freshName=choose(freshName,a=>a.mode==='pick'&&a.uid===costly.uid);
 assert.equal(freshName.pending,null);
 assert.equal(freshName.players[0].hand.some(c=>c.uid===costly.uid),true);
 freshName=cast(freshName,toHand(freshName,0,'KJN-1-077').uid);
 assert.equal(freshName.pending.step,'sevenPick');
 freshName=choose(freshName,a=>a.mode==='pick'&&a.uid===body.uid);
 assert.equal(freshName.pending.step,'handOrDeploy');
 assert.equal(legal(freshName,a=>a.mode==='hand'),true);
 freshName=choose(freshName,a=>a.mode==='dest'&&a.uid===body.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(find(freshName,0,body.uid).ready,false);
 let empty=main(ids,77003);
 fuel(empty,'KJN-1-041',1);
 toOutside(empty,0,'KJN-1-041');
 const useless=toHand(empty,0,'KJN-1-077');
 assert.equal(legal(empty,a=>a.type==='event'&&a.uid===useless.uid),false);
 assertUniversalMatch(packs,empty);
});

test('KJN-1-078 retires by the number of Seven Shadow cards, and its special trigger has no cap',()=>{
 const ids=['KJN-1-078','KJN-1-052','KJN-1-056','KJN-1-063','KJN-1-072','KJN-1-053','KJN-1-041'];
 let one=main(ids,78001);
 fuel(one,'KJN-1-041',2);
 put(one,0,'KJN-1-052','front',0,true);
 const low=put(one,1,'KJN-1-063','front',0,true);
 const mid=put(one,1,'KJN-1-072','front',1,true);
 assert.equal(legal(one,a=>a.type==='event'&&a.uid===toHand(one,0,'KJN-1-078').uid),true);
 one=cast(one,toHand(one,0,'KJN-1-078').uid);
 assert.equal(legal(one,a=>a.uid===low.uid),true);
 assert.equal(legal(one,a=>a.uid===mid.uid),false);
 assert.equal(legal(one,a=>a.uid===null),false);
 one=choose(one,a=>a.uid===low.uid);
 assert.equal(one.players[1].front.some(c=>c?.uid===low.uid),false);
 let two=main(ids,78002);
 fuel(two,'KJN-1-041',2);
 put(two,0,'KJN-1-052','front',0,true);
 put(two,0,'KJN-1-052','front',1,true);
 const beater=put(two,1,'KJN-1-072','front',0,true);
 const wall=put(two,1,'KJN-1-053','front',1,true);
 two=cast(two,toHand(two,0,'KJN-1-078').uid);
 assert.equal(legal(two,a=>a.uid===beater.uid),true);
 assert.equal(legal(two,a=>a.uid===wall.uid),false);
 let buried=main(ids,78003);
 fuel(buried,'KJN-1-041',3);
 const base=put(buried,0,'KJN-1-052','front',0,true);
 top(buried,0,['KJN-1-052','KJN-1-052']);
 buried=raidOnto(buried,toHand(buried,0,'KJN-1-056').uid,base.uid);
 buried=choose(buried,a=>a.mode==='done');
 const tiny=put(buried,1,'KJN-1-063','front',0,true);
 const larger=put(buried,1,'KJN-1-072','front',1,true);
 buried=cast(buried,toHand(buried,0,'KJN-1-078').uid);
 assert.equal(legal(buried,a=>a.uid===tiny.uid),true);
 assert.equal(legal(buried,a=>a.uid===larger.uid),false);
 let life=openLife(ids,'KJN-1-078',78004,g=>{
  put(g,0,'KJN-1-053','front',1,true);
 });
 const tall=life.players[0].front.find(c=>c?.cardId==='KJN-1-053');
 life=choose(life,a=>a.mode==='special'&&a.uid===tall.uid);
 assert.equal(life.players[0].front.some(c=>c?.uid===tall.uid),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-079 readies up to two AP, and its final trigger needs an empty life',()=>{
 const ids=['KJN-1-079','KJN-1-041','KJN-1-052'];
 let s=main(ids,79001);
 fuel(s,'KJN-1-041',2);
 readyAp(s,0,3);
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=false;
 s=cast(s,toHand(s,0,'KJN-1-079').uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(s,a=>a.uid===null),true);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(apReady(s),0);
 let both=main(ids,79004);
 fuel(both,'KJN-1-041',2);
 readyAp(both,0,3);
 both.players[0].apCards[1].ready=false;
 both.players[0].apCards[2].ready=false;
 both=cast(both,toHand(both,0,'KJN-1-079').uid);
 both=choose(both,a=>a.type==='chooseApRecovery'&&a.uid!==null);
 both=choose(both,a=>a.type==='chooseApRecovery'&&a.uid!==null);
 assert.equal(apReady(both),2);
 assert.equal(both.pending,null);
 let kept=openLife(ids,'KJN-1-079',79002);
 assert.equal(kept.pending,null);
 assert.equal(kept.players[1].life.length,1);
 assert.equal(kept.players[1].outside.some(c=>c.cardId==='KJN-1-079'),true);
 let last=toPhase(fresh(ids,79003),'attack');
 const hitter=put(last,0,'KJN-1-052','front',0,true);
 const deckTop=last.players[1].deck[0];
 setLife(last,1,['KJN-1-079']);
 last=hit(last,hitter.uid);
 assert.equal(legal(last,a=>a.mode==='final'),true);
 last=choose(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,deckTop.uid);
 assert.equal(last.players[1].outside.some(c=>c.cardId==='KJN-1-079'),true);
 assertUniversalMatch(packs,last);
});

test('KJN-1-080 draws three, discards two, then may give one Sid energy',()=>{
 const ids=['KJN-1-080','KJN-1-048','KJN-1-041','KJN-1-042'];
 let bare=main(ids,80001);
 fuel(bare,'KJN-1-041',2);
 parkHand(bare,0);
 const a=toHand(bare,0,'KJN-1-041');
 const b=toHand(bare,0,'KJN-1-042');
 const event=toHand(bare,0,'KJN-1-080');
 const deck=bare.players[0].deck.length;
 bare=cast(bare,event.uid);
 assert.equal(bare.pending.kind,'effect-discard');
 assert.equal(bare.players[0].deck.length,deck-3);
 bare=choose(bare,x=>x.uid===a.uid);
 bare=choose(bare,x=>x.uid===b.uid);
 assert.equal(bare.pending,null);
 let sided=main(ids,80002);
 fuel(sided,'KJN-1-041',2);
 const sid=put(sided,0,'KJN-1-048','energy',2,true);
 const frontSid=put(sided,0,'KJN-1-048','front',0,true);
 parkHand(sided,0);
 const c=toHand(sided,0,'KJN-1-041');
 const d=toHand(sided,0,'KJN-1-042');
 sided=cast(sided,toHand(sided,0,'KJN-1-080').uid);
 assert.equal(sided.pending.kind,'effect-discard');
 sided=choose(sided,x=>x.uid===c.uid);
 sided=choose(sided,x=>x.uid===d.uid);
 assert.equal(sided.pending.step,'energySid');
 assert.equal(legal(sided,a=>a.mode==='skip'),true);
 assert.equal(legal(sided,a=>a.mode==='energy'&&a.uid===sid.uid),true);
 assert.equal(legal(sided,a=>a.mode==='energy'&&a.uid===frontSid.uid),true);
 sided=choose(sided,a=>a.mode==='skip');
 assert.equal(produced(sided,0,sid.uid),1);
 assert.equal(produced(sided,0,frontSid.uid),0);
 sided=cast(sided,toHand(sided,0,'KJN-1-080').uid);
 sided=choose(sided,x=>x.type==='chooseDiscard');
 sided=choose(sided,x=>x.type==='chooseDiscard');
 sided=choose(sided,a=>a.mode==='energy'&&a.uid===sid.uid);
 assert.equal(produced(sided,0,sid.uid),2);
 assert.equal(produced(sided,0,frontSid.uid),0);
 let muted=main(ids,80003);
 fuel(muted,'KJN-1-041',2);
 const quiet=put(muted,0,'KJN-1-048','front',0,true);
 silence(muted,quiet);
 parkHand(muted,0);
 toHand(muted,0,'KJN-1-041');
 toHand(muted,0,'KJN-1-042');
 muted=cast(muted,toHand(muted,0,'KJN-1-080').uid);
 muted=choose(muted,x=>x.type==='chooseDiscard');
 muted=choose(muted,x=>x.type==='chooseDiscard');
 assert.equal(muted.pending,null);
 assert.equal(produced(muted,0,quiet.uid),0);
 assertUniversalMatch(packs,muted);
});
