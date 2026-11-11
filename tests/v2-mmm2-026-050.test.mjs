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

function countsFor(required,each=4,more={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=more[id]??each;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(copies,2,4-caps[trigger]);
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
 assert.equal(total,50);
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
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function acts(s){return legalUniversalActions(packs,s);}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(acts(s).slice(0,6)));
 return use(s,action);
}
function play(s,uid,line='front'){
 const action=acts(s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&
  a.replaceUid===undefined);
 if(!action)throw Error('No play '+uid+' '+line);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=acts(s).find(a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);
 if(!action)throw Error('No raid '+uid+' onto '+baseUid);
 return use(s,action);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' at '+s.phase);
 }
 return s;
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
function green(s,p=0){return universalEnergyByColor(packs,s,p).green??0;}
function settle(s){
 let guard=0;
 while(s.pending&&['life-batch-order','life-trigger'].includes(s.pending.kind)){
  const action=s.pending.kind==='life-batch-order'?acts(s)[0]:{type:'chooseTrigger',mode:'skip'};
  s=use(s,action);
  if(++guard>12)throw Error('Life resolution stuck');
 }
 return s;
}
function passTurn(s){
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[1].deck.push(...s.players[1].hand.splice(0));
 let guard=0;
 while(s.active===0){
  if(s.pending)throw Error('Pending blocked the turn '+s.pending.kind+' '+s.pending.step);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Turn did not pass at '+s.phase);
 }
 return s;
}
function orderBottoms(s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  s=pick(s,a=>a.type==='chooseTopOrder');
  if(++guard>6)throw Error('Shared order stuck');
 }
 return s;
}

test('MMM-2-026 publishes one villa or Ui and discards only after adding it',()=>{
 const counts=countsFor(['MMM-2-026','MMM-2-027','MMM-2-042','MMM-2-044']);
 let s=toPhase(fresh(counts,12026),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 const iroha=toHand(s,0,'MMM-2-026');
 const [villa,magius,alina]=crown(s,0,['MMM-2-027','MMM-2-042','MMM-2-044']);
 readyAp(s,0,1);
 s=play(s,iroha.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[villa.uid,magius.uid,alina.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===magius.uid),false);
 assert.equal(looked.options.some(o=>o.action.uid===alina.uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===villa.uid));
 assertHidden(s,[villa.uid,magius.uid,alina.uid]);
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.players[0].hand.some(c=>c.uid===villa.uid),false);
 s=pick(s,a=>a.uid===alina.uid);
 s=pick(s,a=>a.uid===magius.uid);
 s=pick(s,a=>a.uid===villa.uid);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[alina.uid,magius.uid,villa.uid]);
 assert.equal(s.publicReveals.some(r=>r.uid===villa.uid),false);
 assertUniversalMatch(packs,s);

 let added=toPhase(fresh(counts,12027),'main');
 put(added,0,'MMM-2-042','energy',0,true);
 const played=toHand(added,0,'MMM-2-026');
 const window=crown(added,0,['MMM-2-027','MMM-2-042','MMM-2-044']);
 readyAp(added,0,1);
 const outside=added.players[0].outside.length;
 added=play(added,played.uid);
 added=pick(added,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(added.pending.kind,'effect-top-order');
 assert.equal(added.publicReveals.some(r=>r.uid===window[0].uid&&r.kind==='searched-to-hand'),true);
 assertHidden(added,[window[1].uid,window[2].uid]);
 added=orderBottoms(added);
 assert.equal(added.pending.kind,'effect-discard');
 assert.equal(acts(added).some(a=>a.uid==null),false);
 added=pick(added,a=>a.type==='chooseDiscard'&&a.uid!==window[0].uid);
 assert.equal(added.pending,null);
 assert.equal(added.players[0].outside.length,outside+1);
 assert.ok(added.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.deepEqual(added.players[0].deck.slice(-2).map(c=>c.uid),[window[1].uid,window[2].uid]);
 assertUniversalMatch(packs,added);
});

test('Q2353 MMM-2-027 draws when she is the third distinct villa name',()=>{
 const counts=countsFor(['MMM-2-027','MMM-2-037','MMM-2-039']);
 let few=toPhase(fresh(counts,12028),'main');
 readyAp(few);
 const first=toHand(few,0,'MMM-2-037');
 const second=toHand(few,0,'MMM-2-027');
 const quiet=few.players[0].deck.length;
 few=play(few,first.uid,'energy');
 few=play(few,second.uid,'energy');
 assert.equal(few.pending,null);
 assert.equal(few.players[0].deck.length,quiet);
 assert.equal(universalBp(packs,few,field(few,0,first.uid)),1500);
 assertUniversalMatch(packs,few);

 let s=toPhase(fresh(counts,12029),'main');
 readyAp(s);
 const felicia=toHand(s,0,'MMM-2-037');
 const tsuruno=toHand(s,0,'MMM-2-039');
 const iroha=toHand(s,0,'MMM-2-027');
 s=play(s,felicia.uid,'energy');
 s=play(s,tsuruno.uid,'energy');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(acts(s).some(a=>a.uid===tsuruno.uid),false);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 const before=s.players[0].deck.length;
 s=play(s,iroha.uid,'front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(universalBp(packs,s,field(s,0,felicia.uid)),3000);
 assertUniversalMatch(packs,s);
});

test('MMM-2-028 block floor is live without a raid, and the frame is not',()=>{
 const counts=countsFor(['MMM-2-028','MMM-2-027','MMM-2-037','MMM-2-039','MMM-2-030','MMM-2-032','MMM-2-042','MMM-2-026','MMM-2-029']);
 let plain=toPhase(fresh(counts,12030),'main');
 put(plain,0,'MMM-2-042','energy',0,true);
 put(plain,0,'MMM-2-042','energy',1,true);
 put(plain,0,'MMM-2-042','energy',2,true);
 const paid=toHand(plain,0,'MMM-2-028');
 const low=put(plain,1,'MMM-2-030','front',0,true);
 const high=put(plain,1,'MMM-2-032','front',1,true);
 readyAp(plain,0,1);
 plain=play(plain,paid.uid);
 assert.equal(plain.pending,null);
 assert.equal(acts(plain).some(a=>a.type==='activate'&&a.uid===paid.uid),false);
 plain=toPhase(plain,'attack');
 plain.players[0].front.find(c=>c?.uid===paid.uid).ready=true;
 plain=use(plain,{type:'attack',uid:paid.uid});
 assert.equal(plain.pending.kind,'block');
 assert.ok(acts(plain).some(a=>a.uid===low.uid));
 assert.ok(acts(plain).some(a=>a.uid===high.uid));
 assertUniversalMatch(packs,plain);

 let s=toPhase(fresh(counts,12031),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 readyAp(s);
 const b=toHand(s,0,'MMM-2-037');
 const c=toHand(s,0,'MMM-2-039');
 const iroha=toHand(s,0,'MMM-2-028');
 s=play(s,b.uid,'energy');
 s=play(s,c.uid,'energy');
 if(s.pending?.kind==='effect-buff-own')s=pick(s,x=>x.type==='chooseOwnBuff'&&x.uid===null);
 const wall=put(s,1,'MMM-2-030','front',0,true);
 const huge=put(s,1,'MMM-2-032','front',1,true);
 s=play(s,iroha.uid);
 assert.equal(s.pending,null);
 assert.equal(green(s),3);
 s=toPhase(s,'attack');
 field(s,0,iroha.uid).ready=true;
 s=use(s,{type:'attack',uid:iroha.uid});
 assert.equal(s.pending.kind,'block');
 assert.ok(acts(s).some(a=>a.uid===wall.uid));
 assert.equal(acts(s).some(a=>a.uid===huge.uid),false);
 assertUniversalMatch(packs,s);

 let raid=toPhase(fresh(counts,12032),'main');
 put(raid,0,'MMM-2-029','energy',0,true);
 put(raid,0,'MMM-2-029','energy',1,true);
 put(raid,0,'MMM-2-029','energy',2,true);
 const base=put(raid,0,'MMM-2-026','front',0,true);
 const top=toHand(raid,0,'MMM-2-028');
 readyAp(raid,0,1);
 raid=raidOnto(raid,top.uid,base.uid);
 assert.equal(raid.pending.kind,'effect-buff-own');
 assert.ok(acts(raid).some(a=>a.type==='chooseOwnBuff'&&a.uid===null));
 assert.ok(acts(raid).some(a=>a.uid===top.uid));
 raid=pick(raid,a=>a.type==='chooseOwnBuff'&&a.uid===top.uid);
 assert.equal(universalBp(packs,raid,field(raid,0,top.uid)),4500);
 const main=acts(raid).find(a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='mmm2:0');
 assert.ok(main);
 raid=use(raid,main);
 assert.equal(raid.pending.step,'buffMany');
 assert.ok(acts(raid).some(a=>a.mode==='done'));
 const ally=raid.players[0].energy.find(Boolean);
 raid=pick(raid,a=>a.uid===ally.uid);
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(raid.pending,null);
 assert.equal(universalBp(packs,raid,field(raid,0,ally.uid)),2500);
 assert.equal(acts(raid).some(a=>a.type==='activate'&&a.uid===top.uid),false);
 assert.equal(field(raid,0,top.uid).stack.some(layer=>layer.uid===base.uid),true);
 assertUniversalMatch(packs,raid);
});

test('MMM-2-029 draws and must discard; its life draw does not',()=>{
 const counts=countsFor(['MMM-2-029','MMM-2-042']);
 let s=toPhase(fresh(counts,12033),'main');
 const yachiyo=toHand(s,0,'MMM-2-029');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,yachiyo.uid,'energy');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,12034),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-029','MMM-2-042']);
 const before=life.players[1].deck.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='MMM-2-029'),true);
 assertUniversalMatch(packs,life);
});

test('MMM-2-030 steps from the front during the move phase only',()=>{
 const counts=countsFor(['MMM-2-030','MMM-2-042']);
 let move=toPhase(fresh(counts,12035),'move');
 const body=put(move,0,'MMM-2-030','front',0,true);
 const other=put(move,0,'MMM-2-042','front',1,true);
 assert.ok(acts(move).some(a=>a.type==='step'&&a.uid===body.uid&&a.slot===0));
 assert.equal(acts(move).some(a=>a.type==='step'&&a.uid===other.uid),false);
 move=use(move,acts(move).find(a=>a.type==='step'&&a.uid===body.uid&&a.slot===0));
 assert.equal(move.players[0].energy[0].uid,body.uid);
 assert.equal(move.players[0].front[0],null);
 assertUniversalMatch(packs,move);

 let energy=toPhase(fresh(counts,12036),'move');
 const parked=put(energy,0,'MMM-2-030','energy',0,true);
 assert.equal(acts(energy).some(a=>a.type==='step'&&a.uid===parked.uid),false);
 let main=toPhase(fresh(counts,12037),'main');
 const stuck=put(main,0,'MMM-2-030','front',0,true);
 assert.equal(acts(main).some(a=>a.type==='step'&&a.uid===stuck.uid),false);
 assertUniversalMatch(packs,main);
});

test('Q2355 MMM-2-031 can replay the card it just returned',()=>{
 const counts=countsFor(['MMM-2-031','MMM-2-029','MMM-2-028','MMM-2-042']);
 let s=toPhase(fresh(counts,12038),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 put(s,0,'MMM-2-042','energy',2,true);
 const returned=put(s,0,'MMM-2-029','front',0,true);
 const costly=put(s,0,'MMM-2-028','front',1,true);
 const yachiyo=toHand(s,0,'MMM-2-031');
 readyAp(s,0,1);
 s=play(s,yachiyo.uid,'energy');
 assert.equal(s.pending.id,'MMM-2-031');
 assert.equal(acts(s).some(a=>a.uid===costly.uid),false);
 assert.ok(acts(s).some(a=>a.uid===returned.uid));
 assert.ok(acts(s).some(a=>a.mode==='skip'));
 s=pick(s,a=>a.uid===returned.uid);
 assert.equal(s.pending.step,'deploy');
 assert.ok(s.players[0].hand.some(c=>c.uid===returned.uid));
 s=pick(s,a=>a.uid===returned.uid&&a.line==='front'&&a.mode==='rest');
 assert.equal(s.pending.kind,'effect-discard');
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assert.equal(field(s,0,returned.uid).ready,false);
 assert.equal(s.players[0].front.find(c=>c?.uid===returned.uid).ready,false);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,12039),'main');
 put(skipped,0,'MMM-2-042','energy',0,true);
 put(skipped,0,'MMM-2-042','energy',1,true);
 put(skipped,0,'MMM-2-042','energy',2,true);
 const staying=put(skipped,0,'MMM-2-029','front',0,true);
 const other=toHand(skipped,0,'MMM-2-031');
 readyAp(skipped,0,1);
 skipped=play(skipped,other.uid);
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.ok(field(skipped,0,staying.uid));
 assert.equal(skipped.players[0].hand.some(c=>c.uid===staying.uid),false);
 assertUniversalMatch(packs,skipped);
});

test('MMM-2-032 impact and the rested deploy live only on a raid',()=>{
 const counts=countsFor(['MMM-2-032','MMM-2-030','MMM-2-029','MMM-2-027','MMM-2-039']);
 let bare=toPhase(fresh(counts,12040),'main');
 const copy=put(bare,0,'MMM-2-032','front',0,true);
 assert.equal(universalImpactNull(packs,bare,copy),false);
 assert.equal(universalImpact(packs,bare,copy),0);
 assertUniversalMatch(packs,bare);

 let s=toPhase(fresh(counts,12041),'main');
 for(let slot=0;slot<4;slot++)put(s,0,'MMM-2-029','energy',slot,true);
 const base=put(s,0,'MMM-2-030','front',0,true);
 const iroha=take(s,0,'MMM-2-027');
 const extra=take(s,0,'MMM-2-027');
 s.players[0].hand.push(iroha,extra);
 const tsuruno=toHand(s,0,'MMM-2-039');
 const top=toHand(s,0,'MMM-2-032');
 readyAp(s);
 s=play(s,iroha.uid,'front');
 s=play(s,tsuruno.uid,'front');
 if(s.pending)s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(green(s),4);
 s=raidOnto(s,top.uid,base.uid);
 assert.equal(s.pending.step,'deploy');
 assert.ok(acts(s).some(a=>a.mode==='skip'));
 assert.ok(acts(s).some(a=>a.uid===extra.uid&&a.mode==='rest'));
 s=pick(s,a=>a.mode==='skip');
 const lived=field(s,0,top.uid);
 assert.equal(universalImpactNull(packs,s,lived),true);
 assert.equal(universalImpact(packs,s,lived),1);
 assert.equal(lived.stack.some(layer=>layer.uid===base.uid),true);
 assertUniversalMatch(packs,s);
});

test('MMM-2-033 draws from an effect entry and not from a paid play',()=>{
 const counts=countsFor(['MMM-2-033','MMM-2-031','MMM-2-029','MMM-2-042']);
 let paid=toPhase(fresh(counts,12042),'main');
 put(paid,0,'MMM-2-042','energy',0,true);
 const sana=toHand(paid,0,'MMM-2-033');
 readyAp(paid,0,1);
 const deck=paid.players[0].deck.length;
 paid=play(paid,sana.uid);
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck.length,deck);
 assertUniversalMatch(packs,paid);

 let s=toPhase(fresh(counts,12043),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 put(s,0,'MMM-2-042','energy',2,true);
 const bounced=put(s,0,'MMM-2-029','front',0,true);
 const yachiyo=toHand(s,0,'MMM-2-031');
 const effect=toHand(s,0,'MMM-2-033');
 readyAp(s,0,1);
 s=play(s,yachiyo.uid);
 s=pick(s,a=>a.uid===bounced.uid);
 const before=s.players[0].deck.length;
 s=pick(s,a=>a.uid===effect.uid&&a.line==='energy'&&a.mode==='rest');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(field(s,0,effect.uid).ready,false);
 assertUniversalMatch(packs,s);
});

test('MMM-2-034 adds one green energy only while two villa names are on the front',()=>{
 const counts=countsFor(['MMM-2-034','MMM-2-026','MMM-2-029']);
 let s=toPhase(fresh(counts,12044),'main');
 const sana=put(s,0,'MMM-2-034','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,sana),1);
 assert.equal(green(s),1);
 put(s,0,'MMM-2-026','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,sana),1);
 put(s,0,'MMM-2-029','front',1,true);
 assert.equal(universalCardEnergy(packs,s,0,sana),2);
 assert.equal(green(s),2);
 const front=put(s,0,'MMM-2-034','front',2,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
 assertUniversalMatch(packs,s);
});

test('MMM-2-035 swaps with a front villa at the end of its own attack',()=>{
 const counts=countsFor(['MMM-2-035','MMM-2-029','MMM-2-042']);
 let s=toPhase(fresh(counts,12045),'attack');
 const sana=put(s,0,'MMM-2-035','energy',0,true);
 const villa=put(s,0,'MMM-2-029','front',1,true);
 const magius=put(s,0,'MMM-2-042','front',0,true);
 assert.equal(universalImpactNull(packs,s,sana),true);
 s=use(s,{type:'next'});
 assert.equal(s.pending.step,'swap');
 assert.ok(acts(s).some(a=>a.mode==='skip'));
 assert.ok(acts(s).some(a=>a.uid===villa.uid));
 assert.equal(acts(s).some(a=>a.uid===magius.uid),false);
 s=pick(s,a=>a.uid===villa.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[1].uid,sana.uid);
 assert.equal(s.players[0].energy[0].uid,villa.uid);
 assert.equal(s.players[0].front[0].uid,magius.uid);
 assertUniversalMatch(packs,s);

 let front=toPhase(fresh(counts,12046),'attack');
 put(front,0,'MMM-2-035','front',0,true);
 put(front,0,'MMM-2-029','front',1,true);
 const before=front.players[0].front.map(c=>c?.uid||null);
 front=use(front,{type:'next'});
 assert.equal(front.pending,null);
 assert.equal(front.active,1);
 assert.deepEqual(front.players[0].front.map(c=>c?.uid||null),before);
 assertUniversalMatch(packs,front);
});

test('MMM-2-036 gains 500 BP on its own turn only',()=>{
 const counts=countsFor(['MMM-2-036','MMM-2-042']);
 let s=toPhase(fresh(counts,12047),'main');
 const felicia=put(s,0,'MMM-2-036','front',0,true);
 assert.equal(universalBp(packs,s,felicia),4000);
 s=passTurn(s);
 assert.equal(s.active,1);
 assert.equal(universalBp(packs,s,field(s,0,felicia.uid)),3500);
 assertUniversalMatch(packs,s);
});

test('MMM-2-038 deals 2 once per name and stays rested only when unblocked',()=>{
 const counts=countsFor(['MMM-2-038','MMM-2-027','MMM-2-039','MMM-2-040','MMM-2-042','MMM-2-026']);
 let s=toPhase(fresh(counts,12048),'main');
 const bufferA=put(s,0,'MMM-2-040','front',0,true);
 const bufferB=put(s,0,'MMM-2-040','front',1,true);
 const other=put(s,0,'MMM-2-038','front',2,true);
 const iroha=toHand(s,0,'MMM-2-027');
 const tsuruno=toHand(s,0,'MMM-2-039');
 const played=toHand(s,0,'MMM-2-038');
 readyAp(s);
 s=play(s,iroha.uid,'energy');
 s=play(s,tsuruno.uid,'energy');
 if(s.pending)s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 s=play(s,played.uid);
 assert.equal(universalBp(packs,s,field(s,0,played.uid)),4000);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===bufferA.uid));
 s=pick(s,a=>a.uid===played.uid);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===bufferB.uid));
 s=pick(s,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,s,field(s,0,played.uid)),5000);
 assert.equal(universalBp(packs,s,field(s,0,other.uid)),5000);
 assert.equal(field(s,0,bufferA.uid).ready,false);
 field(s,0,played.uid).ready=true;
 const foe=put(s,1,'MMM-2-042','front',0,true);
 setLife(s,1,['MMM-2-026','MMM-2-026','MMM-2-026','MMM-2-026']);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:played.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(universalAttackDamage(packs,s,field(s,0,played.uid)),2);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(field(s,0,played.uid).mmm2SkipEndActive,s.turn);
 assert.equal(s.pending.kind,'life-batch-order');
 s=settle(s);
 assert.equal(s.players[1].life.length,2);
 s=use(s,{type:'attack',uid:other.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(universalAttackDamage(packs,s,field(s,0,other.uid)),1);
 assert.ok(field(s,1,foe.uid));
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 s=settle(s);
 s=passTurn(s);
 assert.equal(field(s,0,played.uid).ready,false);
 assert.equal(field(s,0,other.uid).ready,false);
 assertUniversalMatch(packs,s);

 let blocked=toPhase(fresh(counts,12049),'attack');
 const attacker=put(blocked,0,'MMM-2-038','front',0,true);
 const wall=put(blocked,1,'MMM-2-042','front',0,true);
 setLife(blocked,1,['MMM-2-026','MMM-2-026']);
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 blocked=pick(blocked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(blocked.pending,null);
 assert.equal(field(blocked,0,attacker.uid).mmm2SkipEndActive,undefined);
 assert.equal(field(blocked,0,attacker.uid).ready,false);
 assert.equal(blocked.players[1].life.length,2);
 blocked=passTurn(blocked);
 assert.equal(field(blocked,0,attacker.uid).ready,true);
 assertUniversalMatch(packs,blocked);
});

test('MMM-2-039 buffs another villa and cannot choose itself',()=>{
 const counts=countsFor(['MMM-2-039','MMM-2-037','MMM-2-042']);
 let s=toPhase(fresh(counts,12050),'main');
 const felicia=put(s,0,'MMM-2-037','front',0,true);
 const magius=put(s,0,'MMM-2-042','energy',0,true);
 const tsuruno=toHand(s,0,'MMM-2-039');
 readyAp(s,0,1);
 s=play(s,tsuruno.uid,'energy');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(acts(s).some(a=>a.uid===tsuruno.uid),false);
 assert.equal(acts(s).some(a=>a.uid===magius.uid),false);
 assert.ok(acts(s).some(a=>a.uid===felicia.uid));
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===felicia.uid);
 assert.equal(universalBp(packs,s,field(s,0,felicia.uid)),2500);
 assert.equal(universalBp(packs,s,field(s,0,tsuruno.uid)),1000);
 assertUniversalMatch(packs,s);
});

test('MMM-2-040 can pay the rest again after it is readied',()=>{
 const counts=countsFor(['MMM-2-040','MMM-2-037']);
 let s=toPhase(fresh(counts,12051),'main');
 const tsuruno=put(s,0,'MMM-2-040','front',0,true);
 const felicia=put(s,0,'MMM-2-037','energy',0,true);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===tsuruno.uid));
 assert.equal(s.pending.step,'buff');
 assert.equal(acts(s).some(a=>a.mode==='skip'||a.mode==='done'),false);
 s=pick(s,a=>a.uid===felicia.uid);
 assert.equal(field(s,0,tsuruno.uid).ready,false);
 assert.equal(universalBp(packs,s,field(s,0,felicia.uid)),2500);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===tsuruno.uid),false);
 field(s,0,tsuruno.uid).ready=true;
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===tsuruno.uid));
 s=pick(s,a=>a.uid===felicia.uid);
 assert.equal(universalBp(packs,s,field(s,0,felicia.uid)),3500);
 assertUniversalMatch(packs,s);
});

test('MMM-2-041 looks once on the first swing after three villa names enter',()=>{
 const counts=countsFor(['MMM-2-041','MMM-2-031','MMM-2-027','MMM-2-029','MMM-2-042','MMM-2-026','MMM-2-044','MMM-2-039']);
 let s=toPhase(fresh(counts,12052),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 put(s,0,'MMM-2-042','energy',2,true);
 const bounced=put(s,0,'MMM-2-029','front',0,true);
 const yachiyo=toHand(s,0,'MMM-2-031');
 const iroha=toHand(s,0,'MMM-2-027');
 const tsuruno=toHand(s,0,'MMM-2-041');
 readyAp(s);
 s=play(s,yachiyo.uid,'energy');
 s=pick(s,a=>a.uid===bounced.uid);
 s=pick(s,a=>a.uid===iroha.uid&&a.line==='front'&&a.mode==='rest');
 assert.ok(green(s)>=4);
 s=play(s,tsuruno.uid);
 assert.equal(field(s,0,tsuruno.uid).ready,true);
 assert.equal(field(s,0,tsuruno.uid).mmm2DoubleAttack,s.turn);
 setLife(s,1,['MMM-2-026','MMM-2-026','MMM-2-026']);
 const [villa,magius,alina]=crown(s,0,['MMM-2-039','MMM-2-042','MMM-2-044']);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:tsuruno.uid});
 assert.equal(s.pending.step,'u041');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[villa.uid,magius.uid,alina.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===magius.uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===villa.uid));
 assertHidden(s,[villa.uid,magius.uid,alina.uid]);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending.step,'orderWindow');
 s=pick(s,a=>a.uid===alina.uid);
 s=pick(s,a=>a.uid===magius.uid);
 assert.equal(s.pending.kind,'block');
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[alina.uid,magius.uid,villa.uid]);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.players[1].life.length,2);
 assert.equal(field(s,0,tsuruno.uid).ready,true);
 const before=s.players[1].life.length;
 s=use(s,{type:'attack',uid:tsuruno.uid});
 assert.equal(s.pending.kind,'block');
 assert.notEqual(s.pending.step,'u041');
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.players[1].life.length,before-1);
 assert.equal(field(s,0,tsuruno.uid).ready,false);
 assertUniversalMatch(packs,s);
});

test('MMM-2-043 discounts an empty field and puts another character on top',()=>{
 const counts=countsFor(['MMM-2-043','MMM-2-042']);
 let s=toPhase(fresh(counts,12053),'main');
 const hand=toHand(s,0,'MMM-2-043');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-2-043'],hand),0);
 const other=put(s,0,'MMM-2-042','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-2-043'],hand),2);
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 readyAp(s,0,1);
 s=play(s,hand.uid);
 const act=acts(s).find(a=>a.type==='activate'&&a.uid===hand.uid&&a.mode==='mmm2:0');
 assert.ok(act);
 s=use(s,act);
 assert.equal(s.pending.step,'u043');
 assert.equal(acts(s).some(a=>a.uid===hand.uid),false);
 assert.ok(acts(s).some(a=>a.uid===other.uid));
 s=pick(s,a=>a.uid===other.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,other.uid);
 assert.equal(universalBp(packs,s,field(s,0,hand.uid)),4000);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===hand.uid),false);
 const energyCopy=put(s,0,'MMM-2-043','energy',2,true);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2358 MMM-2-044 actives once per name after revealing energy 5 or more',()=>{
 const counts=countsFor(['MMM-2-044','MMM-2-045','MMM-2-042']);
 let s=toPhase(fresh(counts,12054),'main');
 const front=put(s,0,'MMM-2-044','front',0,false);
 const other=put(s,0,'MMM-2-044','energy',0,false);
 const energyLine=put(s,0,'MMM-2-044','energy',1,false);
 const [big]=crown(s,0,['MMM-2-045']);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===other.uid&&a.mode==='mmm2:0'),false);
 assert.equal(acts(s).some(a=>a.mode==='mmm2:1'),false);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='mmm2:0'));
 assert.equal(s.pending.step,'placeTop');
 assert.equal(s.publicReveals.some(r=>r.uid===big.uid),true);
 s=pick(s,a=>a.mode==='top');
 assert.equal(s.players[0].deck[0].uid,big.uid);
 assert.equal(s.players[0].deckRevealEnergy5,s.turn);
 const first=acts(s).find(a=>a.type==='activate'&&a.uid===other.uid&&a.mode==='mmm2:1');
 const second=acts(s).find(a=>a.type==='activate'&&a.uid===energyLine.uid&&a.mode==='mmm2:1');
 assert.ok(first&&second);
 s=use(s,first);
 assert.equal(field(s,0,other.uid).ready,true);
 assert.equal(acts(s).some(a=>a.mode==='mmm2:1'),false);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='mmm2:0'),false);
 assertUniversalMatch(packs,s);
});

test('MMM-2-045 moves one front character, then locks only after energy 5',()=>{
 const counts=countsFor(['MMM-2-045','MMM-2-042','MMM-2-034','MMM-2-026','MMM-2-029','MMM-2-044','MMM-2-027','MMM-2-035']);
 let board=toPhase(fresh(counts,12055),'main');
 const self=put(board,0,'MMM-2-045','front',0,true);
 assert.equal(universalBp(packs,board,self),4000);
 put(board,1,'MMM-2-042','front',0,true);
 assert.equal(universalBp(packs,board,self),4000);
 put(board,1,'MMM-2-042','front',1,true);
 assert.equal(universalBp(packs,board,self),4500);
 put(board,1,'MMM-2-042','energy',0,true);
 assert.equal(universalBp(packs,board,self),4500);
 assertUniversalMatch(packs,board);

 let paid=toPhase(fresh(counts,12056),'main');
 put(paid,0,'MMM-2-026','front',0,true);
 put(paid,0,'MMM-2-029','front',1,true);
 put(paid,0,'MMM-2-034','energy',0,true);
 put(paid,0,'MMM-2-034','energy',1,true);
 put(paid,0,'MMM-2-034','energy',2,true);
 const ordinary=toHand(paid,0,'MMM-2-045');
 put(paid,1,'MMM-2-042','front',0,true);
 readyAp(paid,0,1);
 assert.equal(green(paid),6);
 const deck=paid.players[0].deck.length;
 paid=play(paid,ordinary.uid);
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck.length,deck);
 assert.equal(paid.players[1].front[0].cardId,'MMM-2-042');
 assertUniversalMatch(packs,paid);

 let full=toPhase(fresh(counts,12057),'main');
 put(full,0,'MMM-2-026','front',1,true);
 put(full,0,'MMM-2-029','front',2,true);
 put(full,0,'MMM-2-034','energy',0,true);
 put(full,0,'MMM-2-034','energy',1,true);
 put(full,0,'MMM-2-034','energy',2,true);
 const fullBase=put(full,0,'MMM-2-042','front',0,true);
 const fullTop=toHand(full,0,'MMM-2-045');
 const crowded=put(full,1,'MMM-2-042','front',0,true);
 for(let slot=0;slot<4;slot++)put(full,1,'MMM-2-027','energy',slot,true);
 const [shown]=crown(full,0,['MMM-2-044']);
 readyAp(full,0,1);
 full=raidOnto(full,fullTop.uid,fullBase.uid);
 assert.equal(full.pending.step,'u045');
 const replace=acts(full).find(a=>a.uid===crowded.uid&&a.replaceUid);
 assert.ok(replace);
 full=use(full,replace);
 assert.equal(full.players[1].energy.some(c=>c?.uid===crowded.uid),true);
 assert.equal(full.players[1].removed.some(c=>c.cardId==='MMM-2-027'),true);
 assert.equal(full.players[1].outside.some(c=>c.cardId==='MMM-2-027'),false);
 assert.equal(full.pending.step,'u045lock');
 assert.ok(full.players[0].hand.some(c=>c.uid===shown.uid));
 full=pick(full,a=>a.mode==='skip');
 assert.equal(full.pending,null);
 assertUniversalMatch(packs,full);

 let raid=toPhase(fresh(counts,12057),'main');
 put(raid,0,'MMM-2-026','front',1,true);
 put(raid,0,'MMM-2-029','front',2,true);
 put(raid,0,'MMM-2-034','energy',0,true);
 put(raid,0,'MMM-2-034','energy',1,true);
 put(raid,0,'MMM-2-034','energy',2,true);
 const base=put(raid,0,'MMM-2-042','front',0,true);
 crown(raid,0,['MMM-2-045']);
 const top=toHand(raid,0,'MMM-2-045');
 put(raid,1,'MMM-2-026','front',1,true);
 put(raid,1,'MMM-2-029','front',2,true);
 const foe=put(raid,1,'MMM-2-042','front',0,true);
 put(raid,1,'MMM-2-035','energy',0,true);
 put(raid,1,'MMM-2-035','energy',1,true);
 put(raid,1,'MMM-2-035','energy',2,true);
 readyAp(raid,0,1);
 raid=raidOnto(raid,top.uid,base.uid);
 raid=pick(raid,a=>a.uid===foe.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.equal(raid.pending.step,'u045lock');
 raid=pick(raid,a=>a.uid===foe.uid);
 assert.equal(raid.players[1].energy.some(c=>c?.uid===foe.uid),true);
 raid=passTurn(raid);
 raid=toPhase(raid,'move');
 assert.equal(raid.active,1);
 assert.equal(acts(raid).some(a=>a.type==='move'&&a.uid===foe.uid),false);
 raid=toPhase(raid,'main');
 const rider=toHand(raid,1,'MMM-2-045');
 readyAp(raid,1,1);
 assert.ok(green(raid,1)>=6);
 const raidAction=acts(raid).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===foe.uid&&
  a.line!=='energy');
 assert.ok(raidAction);
 raid=use(raid,raidAction);
 const lived=field(raid,1,rider.uid);
 assert.equal(lived.stack.some(layer=>layer.uid===foe.uid),true);
 assert.equal(raid.players[1].front.some(c=>c?.uid===rider.uid),true);
 assertUniversalMatch(packs,raid);
});

test('MMM-2-046 shows the whole window, moves one match outside, and orders the rest',()=>{
 const counts=countsFor(['MMM-2-046','MMM-2-042','MMM-2-026']);
 let s=toPhase(fresh(counts,12058),'main');
 const tomoka=toHand(s,0,'MMM-2-046');
 const [magius,villa]=crown(s,0,['MMM-2-042','MMM-2-026']);
 readyAp(s,0,1);
 s=play(s,tomoka.uid);
 assert.equal(s.pending.step,'u046');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[magius.uid,villa.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===villa.uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===magius.uid));
 assertHidden(s,[magius.uid,villa.uid]);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending.step,'orderWindow');
 assertHidden(s,[magius.uid,villa.uid]);
 s=pick(s,a=>a.uid===villa.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,villa.uid);
 assert.equal(s.players[0].deck[1].uid,magius.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===magius.uid),false);
 assertUniversalMatch(packs,s);

 let moved=toPhase(fresh(counts,12059),'main');
 const again=toHand(moved,0,'MMM-2-046');
 const window=crown(moved,0,['MMM-2-042','MMM-2-026']);
 readyAp(moved,0,1);
 moved=play(moved,again.uid);
 moved=pick(moved,a=>a.uid===window[0].uid);
 assert.equal(moved.pending,null);
 assert.ok(moved.players[0].outside.some(c=>c.uid===window[0].uid));
 assert.equal(moved.players[0].deck[0].uid,window[1].uid);
 assertHidden(moved,[window[1].uid]);
 assert.equal(universalPublicView(packs,moved,1).players[0].outside.some(c=>c.uid===window[0].uid),true);
 assertUniversalMatch(packs,moved);
});

test('MMM-2-047 puts one hand card on top and adds green energy this turn',()=>{
 const counts=countsFor(['MMM-2-047','MMM-2-042']);
 let s=toPhase(fresh(counts,12060),'main');
 const tomoka=put(s,0,'MMM-2-047','energy',0,true);
 const card=toHand(s,0,'MMM-2-042');
 assert.equal(green(s),1);
 s=use(s,acts(s).find(a=>a.type==='activate'&&a.uid===tomoka.uid));
 assert.equal(s.pending.step,'u047');
 assert.equal(acts(s).some(a=>a.mode==='skip'),false);
 s=pick(s,a=>a.uid===card.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,card.uid);
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,tomoka.uid)),2);
 assert.equal(green(s),2);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===tomoka.uid),false);
 assertHidden(s,[card.uid]);
 assertUniversalMatch(packs,s);
});

test('MMM-2-048 arranges the top three back onto the deck',()=>{
 const counts=countsFor(['MMM-2-048','MMM-2-042','MMM-2-026','MMM-2-027']);
 let s=toPhase(fresh(counts,12061),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 put(s,0,'MMM-2-042','energy',2,true);
 const tomoka=toHand(s,0,'MMM-2-048');
 const window=crown(s,0,['MMM-2-026','MMM-2-027','MMM-2-042']);
 readyAp(s,0,1);
 s=play(s,tomoka.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assertHidden(s,window.map(c=>c.uid));
 s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===window[2].uid);
 s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===window[0].uid);
 s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===window[1].uid);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),[window[2].uid,window[0].uid,window[1].uid]);
 assertHidden(s,window.map(c=>c.uid));
 assertUniversalMatch(packs,s);
});

test('MMM-2-049 generates on the front and draws only after a raid',()=>{
 const counts=countsFor(['MMM-2-049','MMM-2-046','MMM-2-034','MMM-2-026','MMM-2-030','MMM-2-029','MMM-2-042']);
 let plain=toPhase(fresh(counts,12062),'main');
 const front=put(plain,0,'MMM-2-049','front',0,true);
 const energy=put(plain,0,'MMM-2-049','energy',0,true);
 assert.equal(universalCardEnergy(packs,plain,0,front),0);
 assert.equal(universalCardEnergy(packs,plain,0,energy),1);
 assert.equal(acts(plain).some(a=>a.type==='activate'&&a.uid===front.uid),false);
 assertUniversalMatch(packs,plain);

 let raid=toPhase(fresh(counts,12063),'main');
 put(raid,0,'MMM-2-026','front',1,true);
 put(raid,0,'MMM-2-030','front',2,true);
 put(raid,0,'MMM-2-034','energy',0,true);
 put(raid,0,'MMM-2-034','energy',1,true);
 put(raid,0,'MMM-2-029','energy',2,true);
 const base=put(raid,0,'MMM-2-046','front',0,true);
 const top=toHand(raid,0,'MMM-2-049');
 const placed=toHand(raid,0,'MMM-2-042');
 readyAp(raid,0,1);
 assert.equal(green(raid),5);
 const deck=raid.players[0].deck.length;
 raid=raidOnto(raid,top.uid,base.uid);
 assert.equal(raid.players[0].deck.length,deck-2);
 assert.equal(raid.pending.step,'handPlace');
 assert.ok(acts(raid).some(a=>a.uid===placed.uid&&a.mode==='top'));
 assert.ok(acts(raid).some(a=>a.uid===placed.uid&&a.mode==='outside'));
 assert.equal(acts(raid).some(a=>a.mode==='skip'),false);
 raid=pick(raid,a=>a.uid===placed.uid&&a.mode==='outside');
 assert.equal(raid.pending,null);
 assert.ok(raid.players[0].outside.some(c=>c.uid===placed.uid));
 const lived=field(raid,0,top.uid);
 assert.equal(universalCardEnergy(packs,raid,0,lived),1);
 assert.equal(universalPublicView(packs,raid,1).players[0].front.find(c=>c?.uid===top.uid).produces,1);
 const before=raid.players[0].deck.length;
 const hand=raid.players[0].hand.length;
 raid=use(raid,acts(raid).find(a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='mmm2:0'));
 assert.equal(raid.players[0].deck.length,before-1);
 assert.equal(raid.players[0].hand.length,hand+1);
 assert.equal(raid.pending.step,'handTop');
 assert.equal(acts(raid).some(a=>a.mode==='outside'),false);
 const buried=raid.players[0].hand[0];
 raid=pick(raid,a=>a.uid===buried.uid);
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].deck[0].uid,buried.uid);
 assert.equal(acts(raid).some(a=>a.type==='activate'&&a.uid===top.uid),false);
 assertUniversalMatch(packs,raid);
});

test('Q2361 MMM-2-050 finishes the discard before Mifuyu\'s reveal',()=>{
 const counts=countsFor(['MMM-2-050','MMM-2-055','MMM-2-042','MMM-2-026']);
 let s=toPhase(fresh(counts,12064),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 const nemu=toHand(s,0,'MMM-2-050');
 const [mifuyu,magius,villa]=crown(s,0,['MMM-2-055','MMM-2-042','MMM-2-026']);
 readyAp(s,0,1);
 s=play(s,nemu.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[mifuyu.uid,magius.uid,villa.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===villa.uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===mifuyu.uid));
 assertHidden(s,[mifuyu.uid,magius.uid,villa.uid]);
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===mifuyu.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.notEqual(s.pending.step,'u055');
 s=orderBottoms(s);
 assert.equal(s.pending.kind,'effect-discard');
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid!==mifuyu.uid);
 assert.equal(s.pending.id,'MMM-2-055');
 assert.equal(s.pending.step,'u055');
 assert.ok(acts(s).some(a=>a.mode==='skip'));
 assert.ok(acts(s).some(a=>a.uid===nemu.uid));
 s=pick(s,a=>a.uid===nemu.uid);
 assert.equal(universalBp(packs,s,field(s,0,nemu.uid)),2500);
 assert.equal(universalImpact(packs,s,field(s,0,nemu.uid)),1);
 assert.equal(s.players[0].hand.some(c=>c.uid===mifuyu.uid),true);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[magius.uid,villa.uid]);
 assertUniversalMatch(packs,s);
});

test('life triggers for MMM-2-026 through 050 follow the printed symbol',()=>{
 const none=['MMM-2-026','MMM-2-027','MMM-2-034','MMM-2-036','MMM-2-044'];
 const draw=['MMM-2-030','MMM-2-033','MMM-2-037','MMM-2-039','MMM-2-040','MMM-2-043','MMM-2-048','MMM-2-050'];
 const ids=[...none,...draw,'MMM-2-031','MMM-2-035','MMM-2-038','MMM-2-041','MMM-2-042','MMM-2-046','MMM-2-047','MMM-2-028','MMM-2-032','MMM-2-045','MMM-2-049','MMM-2-029'];
 const counts=countsFor(ids,1,{'MMM-2-026':2,'MMM-2-042':2,'MMM-2-029':3});
 let seed=12100;
 for(const id of none){
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  setLife(s,1,[id,'MMM-2-026']);
  const deck=s.players[1].deck.length;
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].life.length,1,id);
  assert.equal(s.players[1].deck.length,deck,id);
  assert.ok(s.players[1].outside.some(c=>c.cardId===id),id);
  assertUniversalMatch(packs,s);
 }
 for(const id of draw){
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  setLife(s,1,[id,'MMM-2-026']);
  const deck=s.players[1].deck.length;
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending.trigger,'draw',id);
  s=pick(s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(s.players[1].deck.length,deck-1,id);
  assert.equal(s.pending,null,id);
  assert.ok(s.players[1].outside.some(c=>c.cardId===id),id);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['MMM-2-035','MMM-2-038','MMM-2-046']){
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  const ally=put(s,1,'MMM-2-042','front',0,false);
  setLife(s,1,[id,'MMM-2-026']);
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending.trigger,'active',id);
  assert.equal(acts(s).some(a=>a.mode==='active'&&a.uid===attacker.uid),false,id);
  s=pick(s,a=>a.mode==='active'&&a.uid===ally.uid);
  assert.equal(field(s,1,ally.uid).ready,true,id);
  assert.equal(universalBp(packs,s,field(s,1,ally.uid)),4500,id);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['MMM-2-041','MMM-2-042']){
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  setLife(s,1,[id,'MMM-2-026']);
  const deck=s.players[1].deck.length;
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  const revealed=s.players[1].outside.find(c=>c.cardId===id);
  s=pick(s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].deck.length,deck,id);
  assert.ok(s.players[1].hand.some(c=>c.uid===revealed.uid),id);
  assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),false,id);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['MMM-2-031','MMM-2-047']){
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  const legal=toHand(s,1,'MMM-2-029');
  const illegal=toHand(s,1,'MMM-2-032');
  setLife(s,1,[id,'MMM-2-026']);
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending.trigger,'color',id);
  assert.equal(acts(s).some(a=>a.uid===illegal.uid),false,id);
  s=pick(s,a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front');
  assert.equal(field(s,1,legal.uid).ready,true,id);
  assert.ok(s.players[1].outside.some(c=>c.cardId===id),id);
  assertUniversalMatch(packs,s);
 }
 let raidLife=toPhase(fresh(counts,seed++),'attack');
 const hitter=put(raidLife,0,'MMM-2-042','front',0,true);
 const base=put(raidLife,1,'MMM-2-026','front',0,true);
 put(raidLife,1,'MMM-2-029','energy',0,true);
 put(raidLife,1,'MMM-2-029','energy',1,true);
 put(raidLife,1,'MMM-2-029','energy',2,true);
 setLife(raidLife,1,['MMM-2-028','MMM-2-026']);
 raidLife=use(raidLife,{type:'attack',uid:hitter.uid});
 raidLife=pick(raidLife,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raidLife.pending.trigger,'raid');
 assert.ok(acts(raidLife).some(a=>a.mode==='get'));
 assert.ok(acts(raidLife).some(a=>a.mode==='raid'&&a.baseUid===base.uid));
 const revealed=raidLife.players[1].outside.find(c=>c.cardId==='MMM-2-028');
 raidLife=pick(raidLife,a=>a.mode==='get');
 assert.ok(raidLife.players[1].hand.some(c=>c.uid===revealed.uid));
 assertUniversalMatch(packs,raidLife);

 const lifeRaid=(id,baseId,energyIds,frontIds)=>{
  let s=toPhase(fresh(counts,seed++),'attack');
  const attacker=put(s,0,'MMM-2-042','front',0,true);
  energyIds.forEach((cardId,slot)=>put(s,1,cardId,'energy',slot,true));
  const host=put(s,1,baseId,'front',0,true);
  frontIds.forEach((cardId,index)=>put(s,1,cardId,'front',index+1,true));
  setLife(s,1,[id,'MMM-2-026']);
  s=use(s,{type:'attack',uid:attacker.uid});
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending.trigger,'raid',id);
  assert.ok(acts(s).some(a=>a.mode==='get'),id);
  return {s,host};
 };
 let opened=lifeRaid('MMM-2-032','MMM-2-030',['MMM-2-035','MMM-2-029','MMM-2-029'],[]);
 assert.ok(acts(opened.s).some(a=>a.mode==='raid'&&a.baseUid===opened.host.uid));
 opened.s=pick(opened.s,a=>a.mode==='get');
 assert.ok(opened.s.players[1].hand.some(c=>c.cardId==='MMM-2-032'));
 assertUniversalMatch(packs,opened.s);
 opened=lifeRaid('MMM-2-049','MMM-2-046',['MMM-2-035','MMM-2-029','MMM-2-029','MMM-2-029'],[]);
 assert.ok(acts(opened.s).some(a=>a.mode==='raid'&&a.baseUid===opened.host.uid));
 opened.s=pick(opened.s,a=>a.mode==='get');
 assert.ok(opened.s.players[1].hand.some(c=>c.cardId==='MMM-2-049'));
 assertUniversalMatch(packs,opened.s);
 const short=lifeRaid('MMM-2-045','MMM-2-042',['MMM-2-029'],[]);
 assert.equal(acts(short.s).some(a=>a.mode==='raid'),false);
 short.s=pick(short.s,a=>a.mode==='get');
 assert.ok(short.s.players[1].hand.some(c=>c.cardId==='MMM-2-045'));
 assertUniversalMatch(packs,short.s);
 opened=lifeRaid('MMM-2-045','MMM-2-042',['MMM-2-035','MMM-2-034','MMM-2-029','MMM-2-029'],
  ['MMM-2-026','MMM-2-030']);
 assert.equal(green(opened.s,1),6);
 assert.ok(acts(opened.s).some(a=>a.mode==='raid'&&a.baseUid===opened.host.uid));
 opened.s=pick(opened.s,a=>a.mode==='get');
 assert.ok(opened.s.players[1].hand.some(c=>c.cardId==='MMM-2-045'));
 assertUniversalMatch(packs,opened.s);
});
