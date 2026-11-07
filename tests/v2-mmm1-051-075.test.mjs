import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalAttackDamage, universalBp,
 universalCardEnergy, universalEnergyByColor, universalImpact, universalImpactNull,
 universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const ids=[...new Set(required)];
 const colors=new Set(ids.map(id=>pack.cards[id].color));
 const fillers=Object.values(pack.cards).filter(c=>!ids.includes(c.id)&&
  colors.has(c.color)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
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
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
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
 for(const card of [...cards].reverse())s.players[p].deck.unshift(card);
 return cards;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
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
function play(s,uid,kind='play',baseUid){
 const action=acts(s).find(a=>a.type===kind&&a.uid===uid&&!a.from&&
  (kind!=='play'||(a.line==='front'&&a.replaceUid===undefined))&&
  (kind!=='event'||a.targetUid===undefined)&&
  (kind!=='raid'||(a.baseUid===baseUid&&(a.line==null||a.line==='front'))));
 if(!action)throw Error('No '+kind+' for '+uid+' pending '+(s.pending?.kind||''));
 return use(s,action);
}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+
  JSON.stringify(acts(s).slice(0,6)));
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
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.kind==='effect-top-order'||s.pending.step==='order')){
  s=pick(s,a=>true);
  if(++guard>8)throw Error('order stuck');
 }
 return s;
}
function hit(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function openLife(counts,seed,id,hitter,backup,setup){
 let s=toPhase(fresh(counts,seed),'attack');
 const attacker=put(s,0,hitter,'front',0,true);
 if(setup)setup(s);
 setLife(s,1,[id,backup]);
 s=hit(s,attacker.uid);
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.players[1].outside.some(c=>c.cardId===id),true);
 return s;
}

test('024 and 048 can still place both looked cards outside',()=>{
 assert.deepEqual(pack.cards['MMM-1-024'].effects.onPlay,[{
  op:'ifEnteredFromRemoved',then:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]
 }]);
 assert.deepEqual(pack.cards['MMM-1-048'].effects.onPlay,[
  {op:'inspectTopAnyOutside',count:2,rest:'top'}
 ]);
});

test('MMM-1-051 draws one and must place one hand card outside',()=>{
 const counts=countsFor(['MMM-1-051','MMM-1-058','MMM-1-057']);
 let s=toPhase(fresh(counts,11051),'main');
 put(s,0,'MMM-1-058','energy',0,true);
 const played=toHand(s,0,'MMM-1-051');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,played.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.ok(field(s,0,played.uid));
 const outside=s.players[0].outside.length;
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.length,outside+1);
 assertUniversalMatch(packs,s);
});

test('MMM-1-054 nullifies impact life when it loses, and a plain copy does not',()=>{
 const counts=countsFor(['MMM-1-054','MMM-1-052','MMM-1-053','MMM-1-062','MMM-1-058','MMM-1-057']);
 let nulled=toPhase(fresh(counts,11054),'main');
 put(nulled,0,'MMM-1-058','energy',0,true);
 put(nulled,0,'MMM-1-058','energy',1,true);
 const attacker=put(nulled,0,'MMM-1-052','front',0,true);
 const wall=put(nulled,1,'MMM-1-054','front',0,true);
 setLife(nulled,1,['MMM-1-057','MMM-1-057']);
 const spell=toHand(nulled,0,'MMM-1-062');
 readyAp(nulled,0,1);
 nulled=play(nulled,spell.uid,'event');
 nulled=pick(nulled,a=>a.type==='chooseFrontGrant'&&a.uid===attacker.uid);
 assert.equal(universalImpact(packs,nulled,field(nulled,0,attacker.uid)),1);
 assert.equal(universalImpactNull(packs,nulled,wall),true);
 nulled=toPhase(nulled,'attack');
 const life=nulled.players[1].life.length;
 nulled=use(nulled,{type:'attack',uid:attacker.uid});
 nulled=pick(nulled,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(nulled.players[1].life.length,life);
 assert.ok(nulled.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(universalImpact(packs,nulled,field(nulled,0,attacker.uid)),1);
 assert.equal(nulled.pending,null);
 assertUniversalMatch(packs,nulled);

 let open=toPhase(fresh(counts,11055),'main');
 put(open,0,'MMM-1-058','energy',0,true);
 put(open,0,'MMM-1-058','energy',1,true);
 const hitter=put(open,0,'MMM-1-052','front',0,true);
 const plain=put(open,1,'MMM-1-053','front',0,true);
 setLife(open,1,['MMM-1-057','MMM-1-057']);
 const again=toHand(open,0,'MMM-1-062');
 readyAp(open,0,1);
 open=play(open,again.uid,'event');
 open=pick(open,a=>a.type==='chooseFrontGrant'&&a.uid===hitter.uid);
 assert.equal(universalImpactNull(packs,open,plain),false);
 open=toPhase(open,'attack');
 open=use(open,{type:'attack',uid:hitter.uid});
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid===plain.uid);
 assert.equal(open.players[1].life.length,1);
 assert.ok(open.players[1].outside.some(c=>c.uid===plain.uid));
 assert.equal(open.pending,null);
 assertUniversalMatch(packs,open);
});

test('MMM-1-056 on play stays inside the raid frame and shows ineligible cards',()=>{
 const counts=countsFor(['MMM-1-056','MMM-1-053','MMM-1-055','MMM-1-061','MMM-1-062','MMM-1-063','MMM-1-058']);
 let plain=toPhase(fresh(counts,11056),'main');
 put(plain,0,'MMM-1-058','energy',0,true);
 put(plain,0,'MMM-1-058','energy',1,true);
 const quiet=toHand(plain,0,'MMM-1-056');
 readyAp(plain,0,1);
 const deck=plain.players[0].deck.length;
 plain=play(plain,quiet.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.ok(field(plain,0,quiet.uid));
 assert.equal(universalImpact(packs,plain,field(plain,0,quiet.uid)),0);
 assertUniversalMatch(packs,plain);

 let looked=toPhase(fresh(counts,11057),'main');
 put(looked,0,'MMM-1-058','energy',0,true);
 put(looked,0,'MMM-1-058','energy',1,true);
 const host=put(looked,0,'MMM-1-053','front',0,true);
 const raider=toHand(looked,0,'MMM-1-056');
 const window=stackTop(looked,0,['MMM-1-055','MMM-1-061','MMM-1-062','MMM-1-063']);
 readyAp(looked,0,1);
 looked=play(looked,raider.uid,'raid',host.uid);
 assert.equal(looked.players[0].front.find(c=>c?.uid===raider.uid).stack[0].uid,host.uid);
 assert.equal(looked.pending.kind,'effect-top-deploy-rest');
 assert.deepEqual(looked.pending.uids,window.map(c=>c.uid));
 const legalUids=new Set(acts(looked).map(a=>a.uid));
 assert.equal(legalUids.has(window[0].uid),true);
 assert.equal(legalUids.has(window[1].uid),false);
 assert.equal(legalUids.has(window[2].uid),false);
 assert.equal(legalUids.has(null),true);
 const shown=universalPrivateChoices(packs,looked,0);
 assert.deepEqual(shown.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assertHidden(looked,window.map(c=>c.uid));
 looked=pick(looked,a=>a.type==='chooseTopDeployRest'&&a.uid===null);
 assert.equal(looked.pending.kind,'effect-top-deploy-rest');
 assert.equal(looked.pending.step,'order');
 looked=orderRest(looked);
 assert.equal(looked.pending,null);
 assert.equal(universalImpact(packs,looked,field(looked,0,raider.uid)),0);
 assert.equal(looked.players[0].deck.slice(-4).map(c=>c.uid).sort().join(),
  window.map(c=>c.uid).sort().join());
 assertUniversalMatch(packs,looked);
});

test('MMM-1-057 and 070 rest for one energy and leave at the end of that main',()=>{
 const purple=countsFor(['MMM-1-057','MMM-1-053']);
 let s=toPhase(fresh(purple,11057),'main');
 const body=put(s,0,'MMM-1-057','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,body),1);
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===body.uid&&a.mode==='selfRestEnergyRetire'));
 assert.equal(field(s,0,body.uid).ready,false);
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,body.uid)),2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 field(s,0,body.uid).ready=true;
 assert.equal(acts(s).some(a=>a.uid===body.uid&&a.mode==='selfRestEnergyRetire'),false);
 s=toPhase(s,'attack');
 assert.equal(field(s,0,body.uid),null);
 assert.ok(s.players[0].outside.some(c=>c.uid===body.uid));
 assert.equal(universalEnergyByColor(packs,s,0).purple??0,0);
 assertUniversalMatch(packs,s);

 let front=toPhase(fresh(purple,11058),'main');
 const face=put(front,0,'MMM-1-057','front',0,true);
 assert.equal(universalCardEnergy(packs,front,0,face),0);
 front=use(front,acts(front).find(a=>a.uid===face.uid&&a.mode==='selfRestEnergyRetire'));
 assert.equal(universalCardEnergy(packs,front,0,field(front,0,face.uid)),0);
 front=toPhase(front,'attack');
 assert.ok(front.players[0].outside.some(c=>c.uid===face.uid));
 assertUniversalMatch(packs,front);

 const red=countsFor(['MMM-1-070','MMM-1-072']);
 let kyosuke=toPhase(fresh(red,11070),'main');
 const fuel=put(kyosuke,0,'MMM-1-070','energy',0,true);
 assert.equal(universalEnergyByColor(packs,kyosuke,0).red,1);
 kyosuke=use(kyosuke,acts(kyosuke).find(a=>a.uid===fuel.uid&&a.mode==='selfRestEnergyRetire'));
 assert.equal(universalEnergyByColor(packs,kyosuke,0).red,2);
 assert.equal(field(kyosuke,0,fuel.uid).ready,false);
 kyosuke=toPhase(kyosuke,'attack');
 assert.ok(kyosuke.players[0].outside.some(c=>c.uid===fuel.uid));
 assert.equal(universalEnergyByColor(packs,kyosuke,0).red??0,0);
 assertUniversalMatch(packs,kyosuke);
});

test('MMM-1-058 returns an energy-1 ally, or itself when none exists',()=>{
 const counts=countsFor(['MMM-1-058','MMM-1-053','MMM-1-054','MMM-1-061','MMM-1-060']);
 let forced=toPhase(fresh(counts,11058),'main');
 put(forced,0,'MMM-1-060','energy',0,true);
 const heavy=put(forced,0,'MMM-1-054','front',0,true);
 const fieldCard=put(forced,0,'MMM-1-061','energy',1,true);
 const self=toHand(forced,0,'MMM-1-058');
 readyAp(forced,0,1);
 forced=play(forced,self.uid);
 assert.equal(forced.pending,null);
 assert.equal(field(forced,0,self.uid),null);
 assert.ok(forced.players[0].hand.some(c=>c.uid===self.uid));
 assert.ok(field(forced,0,heavy.uid));
 assert.ok(field(forced,0,fieldCard.uid));
 assertUniversalMatch(packs,forced);

 let chosen=toPhase(fresh(counts,11059),'main');
 put(chosen,0,'MMM-1-060','energy',0,true);
 const small=put(chosen,0,'MMM-1-053','front',0,true);
 const other=put(chosen,0,'MMM-1-054','front',1,true);
 const body=toHand(chosen,0,'MMM-1-058');
 readyAp(chosen,0,1);
 chosen=play(chosen,body.uid);
 assert.equal(chosen.pending.kind,'effect-bounce-own');
 assert.equal(chosen.pending.choices.includes(small.uid),true);
 assert.equal(chosen.pending.choices.includes(body.uid),false);
 assert.equal(chosen.pending.choices.includes(other.uid),false);
 assert.equal(acts(chosen).some(a=>a.uid==null),false);
 chosen=pick(chosen,a=>a.uid===small.uid);
 assert.equal(chosen.pending,null);
 assert.ok(chosen.players[0].hand.some(c=>c.uid===small.uid));
 assert.ok(field(chosen,0,body.uid));
 assertUniversalMatch(packs,chosen);
});

test('MMM-1-059 may buff itself and the bonus ends with the turn',()=>{
 const counts=countsFor(['MMM-1-059','MMM-1-058','MMM-1-053']);
 let s=toPhase(fresh(counts,11059),'main');
 put(s,0,'MMM-1-058','energy',0,true);
 const ally=put(s,0,'MMM-1-053','front',1,true);
 const foe=put(s,1,'MMM-1-053','front',0,true);
 const self=toHand(s,0,'MMM-1-059');
 readyAp(s,0,1);
 s=play(s,self.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(self.uid));
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.equal(s.pending.choices.includes(foe.uid),false);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===self.uid);
 assert.equal(universalBp(packs,s,field(s,0,self.uid)),4000);
 assert.equal(universalBp(packs,s,field(s,0,ally.uid)),1500);
 for(const p of [0,1])while(s.players[p].hand.length>7)
  s.players[p].outside.push(s.players[p].hand.pop());
 let guard=0;
 while(!(s.active===0&&s.phase==='main'&&s.turn>1)){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach the next own main');
 }
 assert.equal(universalBp(packs,s,field(s,0,self.uid)),3000);
 assertUniversalMatch(packs,s);
});

test('MMM-1-060 recovers one purple magical girl and can decline',()=>{
 const counts=countsFor(['MMM-1-060','MMM-1-053','MMM-1-058','MMM-1-062','MMM-1-068']);
 let s=toPhase(fresh(counts,11060),'main');
 put(s,0,'MMM-1-058','energy',0,true);
 put(s,0,'MMM-1-058','energy',1,true);
 const girl=take(s,0,'MMM-1-053');
 const event=take(s,0,'MMM-1-062');
 const red=take(s,0,'MMM-1-068');
 s.players[0].outside.push(girl,event,red);
 const played=toHand(s,0,'MMM-1-060');
 readyAp(s,0,2);
 s=play(s,played.uid);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[girl.uid]);
 s=pick(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===girl.uid));
 assertUniversalMatch(packs,s);

 let taken=toPhase(fresh(counts,11061),'main');
 put(taken,0,'MMM-1-058','energy',0,true);
 put(taken,0,'MMM-1-058','energy',1,true);
 const kept=take(taken,0,'MMM-1-053');
 taken.players[0].outside.push(kept);
 const again=toHand(taken,0,'MMM-1-060');
 readyAp(taken,0,2);
 taken=play(taken,again.uid);
 taken=pick(taken,a=>a.uid===kept.uid);
 assert.ok(taken.players[0].hand.some(c=>c.uid===kept.uid));
 assert.equal(taken.players[0].outside.some(c=>c.uid===kept.uid),false);
 assert.equal(taken.pending,null);
 assertUniversalMatch(packs,taken);
});

test('MMM-1-063 readies up to two AP cards and can stop at zero',()=>{
 const counts=countsFor(['MMM-1-063','MMM-1-058','MMM-1-060']);
 let s=toPhase(fresh(counts,11063),'main');
 put(s,0,'MMM-1-058','energy',0,true);
 put(s,0,'MMM-1-060','energy',1,true);
 const event=toHand(s,0,'MMM-1-063');
 readyAp(s,0,3);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 assert.equal(s.pending.optional===false,false);
 const first=s.players[0].apCards[0].uid;
 const second=s.players[0].apCards[1].uid;
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===first);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.pending.remaining,1);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===second);
 assert.equal(s.players[0].apCards[1].ready,true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,11064),'main');
 put(skipped,0,'MMM-1-058','energy',0,true);
 put(skipped,0,'MMM-1-060','energy',1,true);
 const other=toHand(skipped,0,'MMM-1-063');
 readyAp(skipped,0,2);
 skipped.players[0].apCards[0].ready=false;
 skipped=play(skipped,other.uid,'event');
 skipped=pick(skipped,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(skipped.players[0].apCards[0].ready,false);
 assert.equal(skipped.pending,null);
 assertUniversalMatch(packs,skipped);
});

test('MMM-1-065 looks at five privately and publishes at most two quintet',()=>{
 const counts=countsFor(['MMM-1-065','MMM-1-053','MMM-1-054','MMM-1-061','MMM-1-062','MMM-1-063','MMM-1-058','MMM-1-060']);
 let none=toPhase(fresh(counts,11065),'main');
 put(none,0,'MMM-1-058','energy',0,true);
 put(none,0,'MMM-1-060','energy',1,true);
 const event=toHand(none,0,'MMM-1-065');
 const window=stackTop(none,0,['MMM-1-053','MMM-1-054','MMM-1-061','MMM-1-062','MMM-1-063']);
 readyAp(none,0,1);
 none=play(none,event.uid,'event');
 assert.equal(none.pending.kind,'effect-top-filter-many-choice');
 assert.equal(none.pending.max,2);
 assert.deepEqual(none.pending.uids,window.map(c=>c.uid));
 const choices=new Set(acts(none).filter(a=>a.uid).map(a=>a.uid));
 assert.equal(choices.has(window[0].uid),true);
 assert.equal(choices.has(window[1].uid),true);
 assert.equal(choices.has(window[2].uid),false);
 assert.equal(choices.has(window[3].uid),false);
 assert.equal(choices.has(window[4].uid),false);
 assert.deepEqual(universalPrivateChoices(packs,none,0).inspected.map(c=>c.uid),
  window.map(c=>c.uid));
 assertHidden(none,window.map(c=>c.uid));
 none=pick(none,a=>a.type==='chooseTopFilteredMany'&&a.uid===null);
 assert.equal(none.publicReveals.some(entry=>window.some(c=>c.uid===entry.uid)),false);
 none=orderRest(none);
 assert.equal(none.players[0].hand.some(c=>window.some(w=>w.uid===c.uid)),false);
 assert.equal(none.players[0].deck.slice(-5).map(c=>c.uid).sort().join(),
  window.map(c=>c.uid).sort().join());
 assertUniversalMatch(packs,none);

 let both=toPhase(fresh(counts,11066),'main');
 put(both,0,'MMM-1-058','energy',0,true);
 put(both,0,'MMM-1-060','energy',1,true);
 const spell=toHand(both,0,'MMM-1-065');
 const looked=stackTop(both,0,['MMM-1-053','MMM-1-054','MMM-1-061','MMM-1-062','MMM-1-063']);
 readyAp(both,0,1);
 both=play(both,spell.uid,'event');
 both=pick(both,a=>a.uid===looked[0].uid);
 assert.equal(both.publicReveals.some(entry=>entry.uid===looked[0].uid),true);
 assertHidden(both,[looked[2].uid,looked[3].uid,looked[4].uid]);
 both=pick(both,a=>a.uid===looked[1].uid);
 assert.equal(both.pending.kind,'effect-top-order');
 assert.equal(both.players[0].hand.filter(c=>c.uid===looked[0].uid||c.uid===looked[1].uid).length,2);
 both=orderRest(both);
 assert.equal(both.pending,null);
 assert.equal(both.players[0].hand.some(c=>c.uid===looked[2].uid),false);
 assertUniversalMatch(packs,both);
});

test('MMM-1-066 retires at 3000, or 5000 while Homura is on the field',()=>{
 const counts=countsFor(['MMM-1-066','MMM-1-054','MMM-1-052','MMM-1-072','MMM-1-058','MMM-1-060']);
 let low=toPhase(fresh(counts,11066),'main');
 put(low,0,'MMM-1-058','energy',0,true);
 put(low,0,'MMM-1-060','energy',1,true);
 const small=put(low,1,'MMM-1-054','front',0,true);
 const mid=put(low,1,'MMM-1-052','front',1,true);
 const event=toHand(low,0,'MMM-1-066');
 readyAp(low,0,1);
 low=play(low,event.uid,'event');
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,3000);
 assert.deepEqual(low.pending.choices,[small.uid]);
 assert.equal(acts(low).some(a=>a.uid==null),false);
 low=pick(low,a=>a.uid===small.uid);
 assert.ok(low.players[1].outside.some(c=>c.uid===small.uid));
 assert.ok(field(low,1,mid.uid));
 assertUniversalMatch(packs,low);

 let wide=toPhase(fresh(counts,11067),'main');
 put(wide,0,'MMM-1-058','energy',0,true);
 put(wide,0,'MMM-1-060','energy',1,true);
 put(wide,0,'MMM-1-072','front',0,true);
 const victim=put(wide,1,'MMM-1-052','front',0,true);
 victim.buffs=[{bp:1000,untilTurn:wide.turn}];
 const huge=put(wide,1,'MMM-1-052','front',1,true);
 huge.buffs=[{bp:2500,untilTurn:wide.turn}];
 assert.equal(universalBp(packs,wide,victim),5000);
 assert.equal(universalBp(packs,wide,huge),6500);
 const again=toHand(wide,0,'MMM-1-066');
 readyAp(wide,0,1);
 wide=play(wide,again.uid,'event');
 assert.equal(wide.pending.limit,5000);
 assert.deepEqual(wide.pending.choices,[victim.uid]);
 wide=pick(wide,a=>a.uid===victim.uid);
 assert.ok(wide.players[1].outside.some(c=>c.uid===victim.uid));
 assert.ok(field(wide,1,huge.uid));
 assertUniversalMatch(packs,wide);
});

test('MMM-1-068 discounts one red only while the opponent has yellow or purple',()=>{
 const yellow=countsFor(['MMM-1-068','MMM-1-006','MMM-1-072']);
 let y=toPhase(fresh(yellow,11068),'main');
 const card=toHand(y,0,'MMM-1-068');
 assert.equal(effectiveHandRequiredEnergy(pack,y,0,pack.cards['MMM-1-068'],card),3);
 put(y,1,'MMM-1-072','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,y,0,pack.cards['MMM-1-068'],card),3);
 const madoka=put(y,1,'MMM-1-006','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,y,0,pack.cards['MMM-1-068'],card),2);
 y.players[1].energy[0]=null;
 y.players[1].deck.push(madoka);
 assert.equal(effectiveHandRequiredEnergy(pack,y,0,pack.cards['MMM-1-068'],card),3);
 assertUniversalMatch(packs,y);

 const purple=countsFor(['MMM-1-068','MMM-1-053']);
 let p=toPhase(fresh(purple,11069),'main');
 const other=toHand(p,0,'MMM-1-068');
 put(p,1,'MMM-1-053','front',0,true);
 put(p,1,'MMM-1-053','front',1,true);
 assert.equal(effectiveHandRequiredEnergy(pack,p,0,pack.cards['MMM-1-068'],other),2);
 assertUniversalMatch(packs,p);
});

test('MMM-1-069 returns the same card to hand when it loses a battle',()=>{
 const counts=countsFor(['MMM-1-069','MMM-1-052','MMM-1-070']);
 let s=toPhase(fresh(counts,11069),'attack');
 const attacker=put(s,0,'MMM-1-052','front',0,true);
 const kyubey=put(s,1,'MMM-1-069','front',0,true);
 setLife(s,1,['MMM-1-070','MMM-1-070']);
 s=use(s,{type:'attack',uid:attacker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===kyubey.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].hand.some(c=>c.uid===kyubey.uid));
 assert.equal(s.players[1].outside.some(c=>c.uid===kyubey.uid),false);
 assert.equal(field(s,1,kyubey.uid),null);
 assert.equal(s.players[1].life.length,2);
 assertUniversalMatch(packs,s);
});

test('MMM-1-071 deals 1 and can be blocked at BP 2000 until it is raided',()=>{
 const counts=countsFor(['MMM-1-071','MMM-1-072','MMM-1-073','MMM-1-076','MMM-1-070']);
 let plain=toPhase(fresh(counts,11071),'attack');
 const witch=put(plain,0,'MMM-1-071','front',0,true);
 const low=put(plain,1,'MMM-1-076','front',0,true);
 const high=put(plain,1,'MMM-1-073','front',1,true);
 assert.equal(universalAttackDamage(packs,plain,witch),1);
 assert.equal(universalBp(packs,plain,low),1500);
 plain=use(plain,{type:'attack',uid:witch.uid});
 assert.equal(plain.pending.kind,'block');
 assert.ok(acts(plain).some(a=>a.type==='chooseBlock'&&a.uid===low.uid));
 assert.ok(acts(plain).some(a=>a.type==='chooseBlock'&&a.uid===high.uid));
 assertUniversalMatch(packs,plain);

 let raided=toPhase(fresh(counts,11072),'attack');
 const base=take(raided,0,'MMM-1-072');
 const top=put(raided,0,'MMM-1-071','front',0,true);
 base.faceDown=false;
 top.stack=[base];
 const small=put(raided,1,'MMM-1-076','front',0,true);
 const big=put(raided,1,'MMM-1-073','front',1,true);
 setLife(raided,1,['MMM-1-070','MMM-1-070']);
 assert.equal(universalAttackDamage(packs,raided,top),2);
 raided=use(raided,{type:'attack',uid:top.uid});
 assert.equal(acts(raided).some(a=>a.uid===small.uid),false);
 assert.ok(acts(raided).some(a=>a.type==='chooseBlock'&&a.uid===big.uid));
 raided=pick(raided,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raided.players[1].life.length,0);
 assert.equal(raided.pending.kind,'life-batch-order');
 assertUniversalMatch(packs,raided);
});

test('MMM-1-073 steps from front to energy only during the move phase',()=>{
 const counts=countsFor(['MMM-1-073','MMM-1-072']);
 let move=toPhase(fresh(counts,11073),'move');
 const body=put(move,0,'MMM-1-073','front',0,true);
 const other=put(move,0,'MMM-1-072','front',1,true);
 assert.ok(acts(move).some(a=>a.type==='step'&&a.uid===body.uid&&a.slot===0));
 assert.equal(acts(move).some(a=>a.type==='step'&&a.uid===other.uid),false);
 move=use(move,acts(move).find(a=>a.type==='step'&&a.uid===body.uid&&a.slot===0));
 assert.equal(move.players[0].energy[0].uid,body.uid);
 assert.equal(move.players[0].front[0],null);
 assert.equal(field(move,0,other.uid).uid,other.uid);
 assertUniversalMatch(packs,move);

 let main=toPhase(fresh(counts,11074),'main');
 const stuck=put(main,0,'MMM-1-073','front',0,true);
 assert.equal(acts(main).some(a=>a.type==='step'&&a.uid===stuck.uid),false);
 assertUniversalMatch(packs,main);
});

test('MMM-1-074 draws only when own Madoka is on the field',()=>{
 const counts=countsFor(['MMM-1-074','MMM-1-076','MMM-1-073']);
 let dry=toPhase(fresh(counts,11074),'main');
 put(dry,0,'MMM-1-073','energy',0,true);
 const alone=toHand(dry,0,'MMM-1-074');
 readyAp(dry,0,1);
 const deck=dry.players[0].deck.length;
 dry=play(dry,alone.uid);
 assert.equal(dry.pending,null);
 assert.equal(dry.players[0].deck.length,deck);
 assertUniversalMatch(packs,dry);

 let live=toPhase(fresh(counts,11075),'main');
 put(live,0,'MMM-1-073','energy',0,true);
 const madoka=put(live,0,'MMM-1-076','energy',1,true);
 const homura=toHand(live,0,'MMM-1-074');
 readyAp(live,0,1);
 const before=live.players[0].deck.length;
 live=play(live,homura.uid);
 assert.equal(live.pending,null);
 assert.equal(live.players[0].deck.length,before-1);
 assert.ok(field(live,0,madoka.uid));
 assertUniversalMatch(packs,live);

 let foe=toPhase(fresh(counts,11076),'main');
 put(foe,0,'MMM-1-073','energy',0,true);
 put(foe,1,'MMM-1-076','front',0,true);
 const copy=toHand(foe,0,'MMM-1-074');
 readyAp(foe,0,1);
 const stayed=foe.players[0].deck.length;
 foe=play(foe,copy.uid);
 assert.equal(foe.players[0].deck.length,stayed);
 assert.equal(foe.pending,null);
 assertUniversalMatch(packs,foe);
});

test('MMM-1-075 raid entry counts a Madoka it just played, and an ordinary play does neither',()=>{
 const counts=countsFor(['MMM-1-075','MMM-1-072','MMM-1-073','MMM-1-068','MMM-1-076','MMM-1-006']);
 assert.equal(pack.cards['MMM-1-075'].raidName,'暁美 ほむら');
 assert.deepEqual(pack.cards['MMM-1-075'].effects.onPlay.map(e=>e.op),
  ['deployOwnHandSpecial','forbidAttackOppFrontOne']);
 let quiet=toPhase(fresh(counts,11075),'main');
 put(quiet,0,'MMM-1-073','energy',0,true);
 put(quiet,0,'MMM-1-068','energy',1,true);
 const madoka=toHand(quiet,0,'MMM-1-076');
 const ordinary=toHand(quiet,0,'MMM-1-075');
 readyAp(quiet,0,1);
 quiet=play(quiet,ordinary.uid);
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].hand.some(c=>c.uid===madoka.uid));
 assert.equal(universalAttackDamage(packs,quiet,field(quiet,0,ordinary.uid)),1);
 assertUniversalMatch(packs,quiet);

 let skipped=toPhase(fresh(counts,11077),'main');
 put(skipped,0,'MMM-1-073','energy',0,true);
 put(skipped,0,'MMM-1-068','energy',1,true);
 const host=put(skipped,0,'MMM-1-072','front',0,true);
 const foe=put(skipped,1,'MMM-1-072','front',0,true);
 toHand(skipped,0,'MMM-1-076');
 const raider=toHand(skipped,0,'MMM-1-075');
 readyAp(skipped,0,1);
 skipped=play(skipped,raider.uid,'raid',host.uid);
 assert.equal(skipped.players[0].front.find(c=>c?.uid===raider.uid).stack[0].uid,host.uid);
 assert.equal(skipped.pending.kind,'effect-hand-rest');
 skipped=pick(skipped,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(skipped.pending,null);
 assert.equal(field(skipped,1,foe.uid).attackBan,undefined);
 assertUniversalMatch(packs,skipped);

 let brought=toPhase(fresh(counts,11078),'main');
 put(brought,0,'MMM-1-073','energy',0,true);
 put(brought,0,'MMM-1-068','energy',1,true);
 const base=put(brought,0,'MMM-1-072','front',0,true);
 const victim=put(brought,1,'MMM-1-006','front',0,true);
 const girl=toHand(brought,0,'MMM-1-076');
 const yellow=toHand(brought,0,'MMM-1-006');
 const source=toHand(brought,0,'MMM-1-075');
 readyAp(brought,0,1);
 brought=play(brought,source.uid,'raid',base.uid);
 assert.equal(brought.pending.kind,'effect-hand-rest');
 const offered=new Set(acts(brought).map(a=>a.uid));
 assert.equal(offered.has(girl.uid),true);
 assert.equal(offered.has(yellow.uid),false);
 assert.equal(offered.has(null),true);
 brought=pick(brought,a=>a.type==='chooseHandRest'&&a.uid===girl.uid&&a.line==='front');
 assert.equal(field(brought,0,girl.uid).ready,false);
 assert.equal(brought.pending.kind,'effect-attack-ban');
 assert.equal(brought.pending.optional,true);
 assert.ok(brought.pending.choices.some(c=>c.uid===victim.uid));
 brought=pick(brought,a=>a.type==='chooseAttackBan'&&a.uid===victim.uid);
 assert.equal(brought.pending,null);
 for(const p of [0,1])while(brought.players[p].hand.length>7)
  brought.players[p].outside.push(brought.players[p].hand.pop());
 let guard=0;
 while(!(brought.active===1&&brought.phase==='attack')){
  if(brought.pending)throw Error('Pending '+brought.pending.kind);
  brought=use(brought,{type:'next'});
  if(++guard>12)throw Error('Did not reach the opposing attack');
 }
 assert.equal(acts(brought).some(a=>a.type==='attack'&&a.uid===victim.uid),false);
 guard=0;
 while(!(brought.active===0&&brought.phase==='start')){
  if(brought.pending)throw Error('Pending '+brought.pending.kind);
  brought=use(brought,{type:'next'});
  if(++guard>8)throw Error('Did not reach the next own start');
 }
 guard=0;
 while(!(brought.active===1&&brought.phase==='attack')){
  if(brought.pending)throw Error('Pending '+brought.pending.kind);
  brought=use(brought,{type:'next'});
  if(++guard>12)throw Error('Did not reach the later attack');
 }
 assert.ok(acts(brought).some(a=>a.type==='attack'&&
  a.uid===brought.players[1].front.find(c=>c?.uid===victim.uid).uid));
 assertUniversalMatch(packs,brought);
});

test('life triggers on MMM-1-051 through 075 use the printed card',()=>{
 const purple=countsFor(['MMM-1-051','MMM-1-053','MMM-1-054','MMM-1-055','MMM-1-056',
  'MMM-1-057','MMM-1-058','MMM-1-060','MMM-1-061','MMM-1-062','MMM-1-063','MMM-1-065']);
 for(const id of ['MMM-1-051','MMM-1-054','MMM-1-065']){
  let life=openLife(purple,12000+Number(id.slice(-3)),id,'MMM-1-053','MMM-1-057');
  assert.equal(life.pending.trigger,'draw');
  assert.equal(acts(life).some(a=>a.mode==='skip'),true);
  assert.equal(acts(life).some(a=>a.mode==='draw'),true);
  assert.equal(acts(life).some(a=>a.mode==='get'),false);
  const revealed=life.players[1].outside.find(c=>c.cardId===id);
  const top=life.players[1].deck[0];
  const deck=life.players[1].deck.length;
  const hand=life.players[1].hand.length;
  life=pick(life,a=>a.mode==='draw');
  assert.equal(life.pending,null);
  assert.equal(life.players[1].deck.length,deck-1);
  assert.ok(life.players[1].hand.some(c=>c.uid===top.uid));
  assert.ok(life.players[1].outside.some(c=>c.uid===revealed.uid));
  assert.equal(life.players[1].hand.length,hand+1);
  assertUniversalMatch(packs,life);
 }
 let empty=openLife(purple,12051,'MMM-1-051','MMM-1-053','MMM-1-057');
 empty.players[1].outside.push(...empty.players[1].deck.splice(0));
 assert.equal(acts(empty).some(a=>a.mode==='draw'),false);
 assert.ok(acts(empty).some(a=>a.mode==='skip'));
 const stayed=empty.players[1].outside.find(c=>c.cardId==='MMM-1-051');
 empty=pick(empty,a=>a.mode==='skip');
 assert.equal(empty.pending,null);
 assert.ok(empty.players[1].outside.some(c=>c.uid===stayed.uid));
 assert.equal(empty.players[1].hand.some(c=>c.uid===stayed.uid),false);
 assertUniversalMatch(packs,empty);

 for(const id of ['MMM-1-053','MMM-1-061','MMM-1-072']){
  const counts=id==='MMM-1-072'?
   countsFor(['MMM-1-072','MMM-1-070','MMM-1-073']):purple;
  const hitter=id==='MMM-1-072'?'MMM-1-073':'MMM-1-053';
  const backup=id==='MMM-1-072'?'MMM-1-070':'MMM-1-057';
  let life=openLife(counts,12100+Number(id.slice(-3)),id,hitter,backup);
  assert.equal(life.pending.trigger,'get');
  const revealed=life.players[1].outside.find(c=>c.cardId===id);
  assert.equal(acts(life).some(a=>a.mode==='draw'),false);
  life=pick(life,a=>a.mode==='get');
  assert.equal(life.pending,null);
  assert.ok(life.players[1].hand.some(c=>c.uid===revealed.uid));
  assert.equal(life.players[1].outside.some(c=>c.uid===revealed.uid),false);
  assertUniversalMatch(packs,life);
 }

 let color=openLife(purple,12055,'MMM-1-055','MMM-1-053','MMM-1-057',s=>{
  const girl=take(s,1,'MMM-1-053');
  const heavy=take(s,1,'MMM-1-056');
  s.players[1].outside.push(girl,heavy);
 });
 assert.equal(color.pending.trigger,'color');
 const offers=acts(color).filter(a=>a.mode==='colorOutside');
 const revealed=color.players[1].outside.find(c=>c.cardId==='MMM-1-055');
 const colorGirl=color.players[1].outside.find(c=>c.cardId==='MMM-1-053');
 const colorHeavy=color.players[1].outside.find(c=>c.cardId==='MMM-1-056');
 assert.ok(offers.some(a=>a.uid===colorGirl.uid&&a.line==='front'));
 assert.ok(offers.some(a=>a.uid===revealed.uid&&a.line==='front'));
 assert.equal(offers.some(a=>a.uid===colorHeavy.uid),false);
 assert.equal(offers.some(a=>a.line==='energy'),false);
 color=pick(color,a=>a.mode==='colorOutside'&&a.uid===colorGirl.uid&&a.slot===0);
 assert.equal(field(color,1,colorGirl.uid).ready,true);
 assert.equal(color.players[1].front.some(c=>c?.uid===colorGirl.uid),true);
 assert.equal(color.pending,null);
 assertUniversalMatch(packs,color);

 let raidLife=openLife(purple,12056,'MMM-1-056','MMM-1-053','MMM-1-057');
 assert.equal(raidLife.pending.trigger,'raid');
 assert.equal(acts(raidLife).some(a=>a.mode==='raid'),false);
 assert.ok(acts(raidLife).some(a=>a.mode==='get'));
 const mami=raidLife.players[1].outside.find(c=>c.cardId==='MMM-1-056');
 raidLife=pick(raidLife,a=>a.mode==='get');
 assert.equal(raidLife.pending,null);
 assert.ok(raidLife.players[1].hand.some(c=>c.uid===mami.uid));
 assert.equal(raidLife.players[1].deck.length>0,true);
 assertUniversalMatch(packs,raidLife);

 let active=openLife(purple,12060,'MMM-1-060','MMM-1-053','MMM-1-057',s=>{
  put(s,1,'MMM-1-053','front',0,false);
  put(s,1,'MMM-1-054','front',1,true);
  put(s,1,'MMM-1-061','energy',0,true);
 });
 assert.equal(active.pending.trigger,'active');
 const rested=active.players[1].front[0];
 const awake=active.players[1].front[1];
 const area=active.players[1].energy[0];
 const lifeCard=active.players[1].outside.find(c=>c.cardId==='MMM-1-060');
 assert.equal(acts(active).some(a=>a.uid===area.uid),false);
 assert.equal(acts(active).some(a=>a.uid===lifeCard.uid),false);
 assert.ok(acts(active).some(a=>a.mode==='active'&&a.uid===awake.uid));
 assert.ok(acts(active).some(a=>a.mode==='active'&&a.uid===rested.uid));
 const before=universalBp(packs,active,awake);
 active=pick(active,a=>a.mode==='active'&&a.uid===awake.uid);
 assert.equal(field(active,1,awake.uid).ready,true);
 assert.equal(universalBp(packs,active,field(active,1,awake.uid)),before+3000);
 assert.equal(field(active,1,rested.uid).ready,false);
 assert.equal(universalBp(packs,active,field(active,1,rested.uid)),1500);
 assert.equal(active.pending,null);
 assertUniversalMatch(packs,active);

 let secondActive=openLife(purple,12062,'MMM-1-062','MMM-1-053','MMM-1-057',s=>{
  put(s,1,'MMM-1-053','energy',0,false);
 });
 const energyTarget=secondActive.players[1].energy[0];
 secondActive=pick(secondActive,a=>a.mode==='active'&&a.uid===energyTarget.uid);
 assert.equal(field(secondActive,1,energyTarget.uid).ready,true);
 assert.equal(universalBp(packs,secondActive,field(secondActive,1,energyTarget.uid)),4500);
 assert.equal(secondActive.pending,null);
 assertUniversalMatch(packs,secondActive);

 let blockedFinal=toPhase(fresh(purple,12063),'attack');
 const keeper=put(blockedFinal,0,'MMM-1-053','front',0,true);
 setLife(blockedFinal,1,['MMM-1-063','MMM-1-057']);
 blockedFinal=hit(blockedFinal,keeper.uid);
 assert.equal(blockedFinal.pending,null);
 assert.equal(blockedFinal.players[1].life.length,1);
 assert.ok(blockedFinal.players[1].outside.some(c=>c.cardId==='MMM-1-063'));
 assertUniversalMatch(packs,blockedFinal);

 let last=toPhase(fresh(purple,12064),'attack');
 const hitter=put(last,0,'MMM-1-053','front',0,true);
 setLife(last,1,['MMM-1-063']);
 last=hit(last,hitter.uid);
 assert.equal(last.pending.trigger,'final');
 assert.equal(last.players[1].life.length,0);
 const top=last.players[1].deck[0];
 const soul=last.players[1].outside.find(c=>c.cardId==='MMM-1-063');
 last=pick(last,a=>a.mode==='final');
 assert.equal(last.pending,null);
 assert.equal(last.players[1].life.length,1);
 assert.equal(last.players[1].life[0].uid,top.uid);
 assert.ok(last.players[1].outside.some(c=>c.uid===soul.uid));
 assertUniversalMatch(packs,last);

 const specials=[['MMM-1-064',13064],['MMM-1-066',13066],['MMM-1-067',13067]];
 for(const [id,seed] of specials){
  const counts=countsFor([id,'MMM-1-052','MMM-1-053','MMM-1-057','MMM-1-058']);
  let life=openLife(counts,seed,id,'MMM-1-053','MMM-1-057',s=>{
   const big=put(s,0,'MMM-1-052','front',1,true);
   big.buffs=[{bp:2500,untilTurn:s.turn}];
  });
  const big=life.players[0].front[1];
  assert.equal(life.pending.trigger,'special');
  assert.equal(universalBp(packs,life,big),6500);
  assert.ok(acts(life).some(a=>a.mode==='special'&&a.uid===big.uid));
  life=pick(life,a=>a.mode==='special'&&a.uid===big.uid);
  assert.ok(life.players[0].outside.some(c=>c.uid===big.uid));
  assert.equal(life.pending,null);
  assertUniversalMatch(packs,life);
 }

 const red=countsFor(['MMM-1-071','MMM-1-073','MMM-1-075','MMM-1-072','MMM-1-068','MMM-1-070']);
 let got=openLife(red,12071,'MMM-1-071','MMM-1-073','MMM-1-070');
 assert.equal(got.pending.trigger,'get');
 const witch=got.players[1].outside.find(c=>c.cardId==='MMM-1-071');
 got=pick(got,a=>a.mode==='get');
 assert.ok(got.players[1].hand.some(c=>c.uid===witch.uid));
 assert.equal(got.pending,null);
 assertUniversalMatch(packs,got);

 let homuraDraw=openLife(red,12073,'MMM-1-073','MMM-1-072','MMM-1-070');
 assert.equal(homuraDraw.pending.trigger,'draw');
 const drawn=homuraDraw.players[1].deck[0];
 homuraDraw=pick(homuraDraw,a=>a.mode==='draw');
 assert.ok(homuraDraw.players[1].hand.some(c=>c.uid===drawn.uid));
 assert.equal(homuraDraw.pending,null);
 assertUniversalMatch(packs,homuraDraw);

 let paid=openLife(red,12075,'MMM-1-075','MMM-1-073','MMM-1-070',s=>{
  put(s,1,'MMM-1-073','energy',0,true);
  put(s,1,'MMM-1-068','energy',1,true);
  put(s,1,'MMM-1-072','front',0,true);
 });
 const base=paid.players[1].front[0];
 assert.equal(paid.pending.trigger,'raid');
 assert.ok(acts(paid).some(a=>a.mode==='get'));
 assert.ok(acts(paid).some(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front'));
 const homura=paid.players[1].outside.find(c=>c.cardId==='MMM-1-075');
 paid=pick(paid,a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front'&&a.slot===0);
 assert.equal(field(paid,1,homura.uid).stack[0].uid,base.uid);
 if(paid.pending?.kind==='effect-hand-rest')
  paid=pick(paid,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(paid.pending,null);
 assertUniversalMatch(packs,paid);
});
