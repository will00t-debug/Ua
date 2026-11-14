// MHA-2-020, 024, 030, 036, 038, 040, 042. Printed sentences and the
// shared DSL they use. Guests exist only so a test can supply a trigger,
// a copied main, or a trait the ready pack does not otherwise retire.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createMha2Pack,mha2ReadyBattleCards} from '../dist/universal-v2/mha2-pack.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {
 legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 newUniversalMatch,universalBp,universalEnergyByColor,universalImpact
} from '../dist/universal-v2/engine.mjs';

const payMain={op:'payHandGrantImpact',oncePerTurn:true,pay:1,amount:1};
function guest(extra){
 return {
  color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:0,trigger:null,
  traits:[],implementation:'vanilla',...extra
 };
}
const GUESTS=[
 guest({id:'SPEC',name:'特殊',color:'red',bp:1000,trigger:'special',
  triggerEffect:{op:'retireOppFront'}}),
 guest({id:'OFA-A',name:'煙影',color:'yellow',bp:1000,traits:['ワン・フォー・オール']}),
 guest({id:'OFA-B',name:'殘影',color:'yellow',bp:1000,traits:['ワン・フォー・オール']}),
 guest({id:'GUEST-MAIN',name:'客',implementation:'dsl',mainAbility:payMain}),
 guest({id:'GUEST-RAID',name:'突襲客',implementation:'dsl',trigger:'raid',raidName:'突襲客',
  mainAbility:payMain}),
 guest({id:'GUEST-AFO',name:'オール・フォー・ワン',implementation:'dsl',mainAbility:payMain}),
 guest({id:'GUEST-YEL',name:'黃客',color:'yellow',implementation:'dsl',mainAbility:payMain}),
 guest({id:'GUEST-NONE',name:'無能力',bp:1500}),
 guest({id:'TALL',name:'高牆',color:'red',bp:5000}),
 guest({id:'TOGA-BASE',name:'トガヒミコ',color:'purple',bp:2000})
];
const pack=createUniversalPack({
 id:'mha',version:'mha2-group7',cards:[...mha2ReadyBattleCards(),...GUESTS]
});
const FILL=['MHA-2-001','MHA-2-004','MHA-2-005','MHA-2-006','MHA-2-009','MHA-2-010',
 'MHA-2-014','MHA-2-015','MHA-2-019','MHA-2-021','MHA-2-029','MHA-2-031','MHA-2-032','MHA-2-033','MHA-2-043',
 'MHA-2-044','MHA-2-045','MHA-2-020','MHA-2-024','MHA-2-030','MHA-2-036','MHA-2-038',
 'MHA-2-040','MHA-2-042',...GUESTS.map(card=>card.id)];

function deck(){
 const counts={};
 for(const id of FILL)counts[id]=1;
 counts['MHA-2-042']=2;
 counts['MHA-2-043']=2;
 counts['MHA-2-044']=2;
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 for(const id of FILL){
  while(counts[id]<4&&total<50){counts[id]++;total++;}
 }
 if(total!==50)throw Error('Deck stopped at '+total);
 return counts;
}
const counts=deck();
function open(seed){
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 const s=newUniversalMatch(pack,{decks:[counts,counts],seed,attackerChoosesLife:true});
 return s;
}
function act(s,action){
 if(typeof action==='function'){
  const found=legalUniversalActions(pack,s).find(action);
  assert.ok(found,'missing action; pending='+(s.pending?.kind||'none'));
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function legal(s){return legalUniversalActions(pack,s);}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside','removed']){
  const index=pl[zone].findIndex(card=>card.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const zone of ['front','energy']){
  const index=pl[zone].findIndex(card=>card?.cardId===id);
  if(index>=0){const card=pl[zone][index];pl[zone][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function hold(s,p,id){
 const card=s.players[p].hand.find(body=>body.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function seat(s,p,id,line,slot,ready=false){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function fuel(s,p,ids){
 ids.forEach((id,slot)=>seat(s,p,id,'energy',slot,false));
}
function reach(s,player,phase,ap=0){
 for(let i=0;i<24;i++){
  const ready=s.players[player].apCards.filter(card=>card.inPlay&&card.ready).length;
  if(s.active===player&&s.phase===phase&&!s.pending&&ready>=ap)return s;
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+s.active+' '+s.phase);
  s=act(s,{type:'next'});
 }
 throw Error('Did not reach '+player+' '+phase);
}
function body(s,uid){
 for(const pl of s.players){
  for(const line of ['front','energy']){
   const card=pl[line].find(item=>item?.uid===uid);
   if(card)return card;
  }
  for(const zone of ['hand','deck','life','outside','removed']){
   const card=pl[zone].find(item=>item.uid===uid);
   if(card)return card;
  }
  const token=pl.apCards.find(item=>item.uid===uid);
  if(token)return token;
 }
 return null;
}
function zoneOf(s,p,uid){
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside','removed'])
  if(pl[zone].some(card=>card.uid===uid))return zone;
 for(const line of ['front','energy'])
  if(pl[line].some(card=>card?.uid===uid))return line;
 return null;
}

test('MHA-2-020 pays the entry, then resolves one printed sentence before the other',()=>{
 let s=reach(open(20),0,'main',2);
 const self=hold(s,0,'MHA-2-020');
 assert.equal(legal(s).some(action=>action.type==='play'&&action.uid===self.uid),false);
 fuel(s,0,['MHA-2-001','MHA-2-004','MHA-2-014']);
 assert.equal(universalEnergyByColor(pack,s,0).yellow>=4,true);
 assert.ok(legal(s).some(action=>action.type==='play'&&action.uid===self.uid));
 s.players[0].apCards.forEach(card=>{card.ready=false;});
 assert.equal(legal(s).some(action=>action.type==='play'&&action.uid===self.uid),false);
 s.players[0].apCards[0].ready=true;
 s.players[0].apCards[1].ready=true;
 const low=seat(s,1,'MHA-2-005','front',0,true);
 const tall=seat(s,1,'MHA-2-019','front',1,true);
 s=act(s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='energy');
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.equal(s.pending.optional,false);
 assert.equal(body(s,self.uid).ready,false);
 assert.equal(legal(s).some(action=>action.type==='chooseEffectMode'&&action.mode==='skip'),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'skip'}),
  /Action not currently legal/);
 s=act(s,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(tall.uid),false);
 assert.equal(legal(s).some(action=>action.type==='chooseRetireBp'&&action.uid===tall.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:tall.uid}),
  /Action not currently legal/);
 s=act(s,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(zoneOf(s,1,low.uid),'outside');
 assert.equal(body(s,self.uid).ready,false);
 assert.equal(s.pending,null);

 s=reach(open(21),0,'main',2);
 fuel(s,0,['MHA-2-001','MHA-2-004','MHA-2-014']);
 const active=hold(s,0,'MHA-2-020');
 s=act(s,action=>action.type==='play'&&action.uid===active.uid&&action.line==='front');
 s=act(s,{type:'chooseEffectMode',mode:'active'});
 assert.equal(s.pending,null);
 assert.equal(body(s,active.uid).ready,true);
});

test('MHA-2-020 rests before the kit, then buffs before the optional active',()=>{
 let s=reach(open(22),0,'main',2);
 const self=seat(s,0,'MHA-2-020','front',0,true);
 const deku=seat(s,0,'MHA-2-021','energy',0,true);
 const other=seat(s,0,'MHA-2-005','front',1,true);
 const rested=s.players[0].apCards.find(card=>card.inPlay);
 rested.ready=false;
 assert.ok(legal(s).some(action=>action.type==='activate'&&action.uid===self.uid&&action.mode==='namedKit'));
 s=act(s,{type:'activate',uid:self.uid,mode:'namedKit'});
 assert.equal(body(s,self.uid).ready,false);
 assert.equal(s.pending.kind,'effect-named-kit');
 assert.deepEqual(s.pending.choices,[deku.uid]);
 assert.equal(universalBp(pack,s,body(s,deku.uid)),3000);
 assert.equal(legal(s).some(action=>action.type==='chooseNamedKit'&&action.uid===other.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseNamedKit',uid:other.uid}),
  /Action not currently legal/);
 s=act(s,{type:'chooseNamedKit',uid:deku.uid});
 assert.equal(universalBp(pack,s,body(s,deku.uid)),4000);
 assert.equal(universalImpact(pack,s,body(s,deku.uid)),1);
 assert.equal(s.pending.kind,'effect-active-self-or-ap');
 assert.equal(s.pending.choices.includes(self.uid),true);
 assert.equal(s.pending.choices.includes(rested.uid),true);
 s=act(s,{type:'chooseSelfOrAp',uid:null});
 assert.equal(body(s,self.uid).ready,false);
 assert.equal(body(s,rested.uid).ready,false);
 assert.equal(universalBp(pack,s,body(s,deku.uid)),4000);
 assert.equal(legal(s).some(action=>action.uid===self.uid&&action.mode==='namedKit'),false);

 s=reach(open(23),0,'main',1);
 const source=seat(s,0,'MHA-2-020','front',0,true);
 const named=seat(s,0,'MHA-2-024','front',1,false);
 s=act(s,{type:'activate',uid:source.uid,mode:'namedKit'});
 s=act(s,{type:'chooseNamedKit',uid:named.uid});
 s=act(s,{type:'chooseSelfOrAp',uid:source.uid});
 assert.equal(body(s,source.uid).ready,true);
 assert.equal(universalImpact(pack,s,body(s,named.uid)),1);

 s=reach(open(24),0,'main',1);
 const bakugo=seat(s,0,'MHA-2-020','energy',0,true);
 seat(s,0,'MHA-2-021','front',0,true);
 assert.equal(legal(s).some(action=>action.uid===bakugo.uid&&action.mode==='namedKit'),false);
 bakugo.ready=false;
 s.players[0].energy[0]=null;
 s.players[0].front[1]=bakugo;
 assert.equal(legal(s).some(action=>action.uid===bakugo.uid&&action.mode==='namedKit'),false);
});

test('MHA-2-024 blocks another A-class, draws once after a trait leaves, and pays AP on attack',()=>{
 let s=reach(open(240),0,'main',1);
 fuel(s,0,['MHA-2-001','MHA-2-029','MHA-2-031','MHA-2-033']);
 const banned=hold(s,0,'MHA-2-024');
 const other=seat(s,0,'MHA-2-005','front',0,true);
 assert.equal(legal(s).some(action=>action.type==='play'&&action.uid===banned.uid),false);
 s.players[0].front[0]=null;
 s.players[0].outside.push(other);
 const deku=seat(s,0,'MHA-2-021','front',0,true);
 assert.ok(legal(s).some(action=>action.type==='play'&&action.uid===banned.uid));
 s.players[0].front[0]=null;
 s.players[0].hand.push(deku);
 s=act(s,action=>action.type==='play'&&action.uid===banned.uid&&action.line==='front');
 const entered=body(s,banned.uid);
 assert.equal(entered.traitLeaveDraw.used,false);
 assert.equal(entered.traitLeaveDraw.trait,'ワン・フォー・オール');
 for(const id of ['MHA-2-030','MHA-2-032'])s.players[0].outside.push(pull(s,0,id));
 const readyField=id=>{
  const card=s.players[0].energy.find(body=>body?.cardId===id);
  card.ready=true;
  return card.uid;
 };
 s=act(s,{type:'activate',uid:readyField('MHA-2-029'),mode:'gatedRestRetire'});
 assert.equal(s.pending.kind,'effect-trait-leave-draw');
 s=act(s,{type:'chooseTraitLeaveDraw',mode:'skip'});
 assert.equal(body(s,banned.uid).traitLeaveDraw.used,false);
 while(s.pending){
  if(s.pending.kind==='effect-named-follow')
   s=act(s,{type:'chooseNamedFollow',uid:s.pending.choices[0]});
  else throw Error('Unexpected follow-up '+s.pending.kind);
 }
 s=act(s,{type:'activate',uid:readyField('MHA-2-031'),mode:'gatedRestRetire'});
 assert.equal(s.pending.kind,'effect-trait-leave-draw');
 const beforeDraw=s.players[0].hand.length;
 s=act(s,{type:'chooseTraitLeaveDraw',mode:'draw'});
 assert.equal(body(s,banned.uid).traitLeaveDraw.used,true);
 assert.equal(s.players[0].hand.length,beforeDraw+1);
 while(s.pending){
  if(s.pending.kind==='effect-active-own-named')
   s=act(s,{type:'chooseActiveOwnNamed',uid:banned.uid});
  else throw Error('Unexpected follow-up '+s.pending.kind);
 }
 s=act(s,{type:'activate',uid:readyField('MHA-2-033'),mode:'gatedRestRetire'});
 assert.notEqual(s.pending?.kind,'effect-trait-leave-draw');

 s=reach(open(241),0,'attack',1);
 const striker=seat(s,0,'MHA-2-024','front',0,true);
 for(const id of ['MHA-2-029','MHA-2-030','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 const before=s.players[0].apCards.filter(card=>card.ready).length;
 s=act(s,{type:'attack',uid:striker.uid});
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=act(s,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(s.players[0].apCards.filter(card=>card.ready).length,before);
 assert.equal(universalImpact(pack,s,body(s,striker.uid)),0);
 s=reach(open(242),0,'attack',1);
 const payer=seat(s,0,'MHA-2-024','front',0,true);
 for(const id of ['MHA-2-029','MHA-2-030','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 const paid=s.players[0].apCards.filter(card=>card.ready).length;
 s=act(s,{type:'attack',uid:payer.uid});
 s=act(s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.players[0].apCards.filter(card=>card.ready).length,paid-1);
 assert.equal(universalImpact(pack,s,body(s,payer.uid)),1);

 s=reach(open(243),0,'attack',1);
 const short=seat(s,0,'MHA-2-024','front',0,true);
 s.players[0].outside.push(pull(s,0,'MHA-2-029'),pull(s,0,'MHA-2-030'));
 s=act(s,{type:'attack',uid:short.uid});
 assert.notEqual(s.pending?.kind,'effect-optional-pay-ap');
 s=reach(open(244),0,'attack',1);
 const broke=seat(s,0,'MHA-2-024','front',0,true);
 for(const id of ['MHA-2-029','MHA-2-030','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 s.players[0].apCards.forEach(card=>{card.ready=false;});
 s=act(s,{type:'attack',uid:broke.uid});
 assert.notEqual(s.pending?.kind,'effect-optional-pay-ap');
 assert.equal(universalImpact(pack,s,body(s,broke.uid)),0);

 const color=open(245);
 const revealed=pull(color,0,'MHA-2-024');
 color.players[0].outside.push(revealed);
 const foe=seat(color,1,'MHA-2-005','front',0,true);
 color.pending={kind:'life-trigger',player:0,uid:revealed.uid,trigger:'color'};
 const rested=act(color,action=>action.type==='chooseTrigger'&&action.mode==='colorRestSkip'&&action.uid===foe.uid);
 assert.equal(body(rested,foe.uid).ready,false);
 assert.equal(rested.continuousStates.some(entry=>entry.kind==='skipNextActive'&&
  entry.targetUid===foe.uid&&!entry.consumed),true);
});

test('MHA-2-030 replaces only an opponent trigger on your turn when three names exist',()=>{
 let s=reach(open(300),0,'main');
 const deku=seat(s,0,'MHA-2-021','front',0,true);
 const field=seat(s,0,'MHA-2-030','energy',0,true);
 for(const id of ['MHA-2-029','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 const special=pull(s,1,'SPEC');
 s.players[1].outside.push(special);
 s.pending={kind:'life-trigger',player:1,uid:special.uid,trigger:'special'};
 s=act(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===deku.uid);
 assert.equal(s.pending.kind,'effect-trigger-leave-rest');
 assert.deepEqual(s.pending.choices,[field.uid]);
 s=act(s,{type:'chooseTriggerLeave',uid:field.uid});
 assert.equal(zoneOf(s,0,field.uid),'outside');
 assert.equal(zoneOf(s,0,deku.uid),'front');
 assert.equal(body(s,deku.uid).ready,false);

 s=reach(open(301),0,'main');
 const stayed=seat(s,0,'MHA-2-021','front',0,true);
 const kept=seat(s,0,'MHA-2-030','energy',0,true);
 for(const id of ['MHA-2-029','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 const other=pull(s,1,'SPEC');
 s.players[1].outside.push(other);
 s.pending={kind:'life-trigger',player:1,uid:other.uid,trigger:'special'};
 s=act(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===stayed.uid);
 s=act(s,{type:'chooseTriggerLeave',uid:null});
 assert.equal(zoneOf(s,0,stayed.uid),'outside');
 assert.equal(zoneOf(s,0,kept.uid),'energy');

 s=reach(open(302),0,'main');
 const few=seat(s,0,'MHA-2-021','front',0,true);
 const lone=seat(s,0,'MHA-2-030','energy',0,true);
 const loneTrigger=pull(s,1,'SPEC');
 s.players[1].outside.push(loneTrigger);
 s.pending={kind:'life-trigger',player:1,uid:loneTrigger.uid,trigger:'special'};
 s=act(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===few.uid);
 assert.notEqual(s.pending?.kind,'effect-trigger-leave-rest');
 assert.equal(zoneOf(s,0,few.uid),'outside');
 assert.equal(zoneOf(s,0,lone.uid),'energy');

 s=reach(open(303),1,'main');
 const victim=seat(s,0,'MHA-2-021','front',0,true);
 const asleep=seat(s,0,'MHA-2-030','energy',0,true);
 for(const id of ['MHA-2-029','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 const night=pull(s,1,'SPEC');
 s.players[1].outside.push(night);
 s.pending={kind:'life-trigger',player:1,uid:night.uid,trigger:'special'};
 s=act(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===victim.uid);
 assert.notEqual(s.pending?.kind,'effect-trigger-leave-rest');
 assert.equal(zoneOf(s,0,victim.uid),'outside');
 assert.equal(zoneOf(s,0,asleep.uid),'energy');

 s=reach(open(304),0,'main');
 const ruled=seat(s,0,'MHA-2-021','front',0,true);
 const watcher=seat(s,0,'MHA-2-030','energy',0,true);
 for(const id of ['MHA-2-029','MHA-2-031'])s.players[0].outside.push(pull(s,0,id));
 ruled.buffs=[{bp:-99999,untilTurn:s.turn}];
 s=act(s,{type:'next'});
 assert.notEqual(s.pending?.kind,'effect-trigger-leave-rest');
 assert.equal(zoneOf(s,0,ruled.uid),'outside');
 assert.equal(zoneOf(s,0,watcher.uid),'energy');
});

test('MHA-2-036 needs three other A-class cards and resolves two different sentences in print order',()=>{
 let s=reach(open(360),0,'main',1);
 fuel(s,0,['MHA-2-001','MHA-2-029','MHA-2-031','MHA-2-032']);
 const event=hold(s,0,'MHA-2-036');
 seat(s,0,'MHA-2-005','front',0,true);
 seat(s,0,'MHA-2-006','front',1,true);
 assert.equal(legal(s).some(action=>action.type==='event'&&action.uid===event.uid),false);
 const third=seat(s,0,'MHA-2-010','front',2,true);
 s.players[0].apCards.forEach(card=>{card.ready=false;});
 assert.equal(legal(s).some(action=>action.type==='event'&&action.uid===event.uid),false);
 s.players[0].apCards[0].ready=true;
 const dropped=s.players[0].energy[0];
 s.players[0].energy[0]=null;
 s.players[0].outside.push(dropped);
 assert.equal(legal(s).some(action=>action.type==='event'&&action.uid===event.uid),false);
 fuel(s,0,['MHA-2-001']);
 s=act(s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.order,['rest','enter','buff']);
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 assert.deepEqual(s.pending.selected,[]);
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'enter'});
 assert.equal(legal(s).some(action=>action.mode==='pick'&&action.id==='buff'),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseOrderedSubset',mode:'pick',id:'buff'}),
  /Action not currently legal/);

 s=reach(open(361),0,'main',1);
 fuel(s,0,['MHA-2-001','MHA-2-004','MHA-2-014']);
 const printed=hold(s,0,'MHA-2-036');
 const a=seat(s,0,'MHA-2-005','front',0,true);
 const b=seat(s,0,'MHA-2-006','front',1,true);
 const c=seat(s,0,'MHA-2-010','front',2,true);
 const foe=seat(s,1,'MHA-2-019','front',0,true);
 const cheap=hold(s,0,'MHA-2-005');
 const heavy=hold(s,0,'MHA-2-009');
 const wrongAp=hold(s,0,'MHA-2-020');
 s=act(s,action=>action.type==='event'&&action.uid===printed.uid);
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'buff'});
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 const before=universalBp(pack,s,a);
 s=act(s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(universalBp(pack,s,a),before);
 s=act(s,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(body(s,foe.uid).ready,false);
 assert.equal(universalBp(pack,s,body(s,a.uid)),before+1000);
 assert.equal(universalBp(pack,s,body(s,b.uid)),before+1000);
 assert.equal(universalBp(pack,s,body(s,c.uid)),before+1000);

 s=reach(open(362),0,'main',1);
 fuel(s,0,['MHA-2-001','MHA-2-004','MHA-2-014']);
 const cast=hold(s,0,'MHA-2-036');
 seat(s,0,'MHA-2-006','front',0,true);
 seat(s,0,'MHA-2-010','front',1,true);
 seat(s,0,'MHA-2-005','front',2,true);
 const playable=hold(s,0,'MHA-2-006');
 const unaffordable=hold(s,0,'MHA-2-009');
 const wrongCost=hold(s,0,'MHA-2-020');
 s=act(s,action=>action.type==='event'&&action.uid===cast.uid);
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'enter'});
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'buff'});
 s=act(s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.kind,'effect-hand-active-or-raid');
 assert.equal(s.pending.choices.includes(playable.uid),true);
 assert.equal(s.pending.choices.includes(unaffordable.uid),false);
 assert.equal(s.pending.choices.includes(wrongCost.uid),false);
 s=act(s,action=>action.type==='chooseHandActiveOrRaid'&&action.mode==='active'&&
  action.uid===playable.uid&&action.line==='front');
 assert.equal(body(s,playable.uid).ready,true);
 assert.equal(universalBp(pack,s,body(s,playable.uid)),2500);
 assert.equal(s.pending,null);

 s=reach(open(363),0,'main',1);
 fuel(s,0,['MHA-2-001','MHA-2-014','MHA-2-015']);
 const raidEvent=hold(s,0,'MHA-2-036');
 const base=seat(s,0,'MHA-2-006','energy',3,true);
 seat(s,0,'MHA-2-010','front',0,true);
 seat(s,0,'MHA-2-005','front',1,true);
 const raider=hold(s,0,'MHA-2-009');
 s=act(s,action=>action.type==='event'&&action.uid===raidEvent.uid);
 s=act(s,{type:'chooseOrderedSubset',mode:'pick',id:'enter'});
 s=act(s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.choices.includes(raider.uid),true);
 s=act(s,action=>action.type==='chooseHandActiveOrRaid'&&action.mode==='raid'&&
  action.uid===raider.uid&&action.baseUid===base.uid);
 const raided=body(s,raider.uid);
 assert.equal(raided.ready,true);
 assert.equal(raided.stack?.[0]?.uid,base.uid);
});

test('MHA-2-038 removes one legal hand main, draws, then copies it for this turn',()=>{
 let s=reach(open(380),0,'main',1);
 const self=hold(s,0,'MHA-2-038');
 assert.equal(legal(s).some(action=>action.type==='play'&&action.uid===self.uid),false);
 fuel(s,0,['MHA-2-043','MHA-2-044','MHA-2-045','MHA-2-040']);
 const legalMain=hold(s,0,'GUEST-MAIN');
 const raid=hold(s,0,'GUEST-RAID');
 const afo=hold(s,0,'GUEST-AFO');
 const yellow=hold(s,0,'GUEST-YEL');
 const none=hold(s,0,'GUEST-NONE');
 const host=seat(s,0,'MHA-2-042','front',1,false);
 s.players[0].apCards[0].ready=true;
 s=act(s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-remove-hand-main');
 assert.deepEqual(s.pending.choices,[legalMain.uid]);
 for(const card of [raid,afo,yellow,none])
  assert.equal(s.pending.choices.includes(card.uid),false);
 const hand=s.players[0].hand.length;
 const deckSize=s.players[0].deck.length;
 s=act(s,{type:'chooseRemoveHandMain',uid:null});
 assert.equal(s.pending,null);
 assert.equal(zoneOf(s,0,legalMain.uid),'hand');
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].deck.length,deckSize);

 s=reach(open(381),0,'main',1);
 fuel(s,0,['MHA-2-043','MHA-2-044','MHA-2-045','MHA-2-040']);
 const played=hold(s,0,'MHA-2-038');
 const taken=hold(s,0,'GUEST-MAIN');
 const copyHost=seat(s,0,'MHA-2-042','front',0,false);
 hold(s,0,'GUEST-RAID');
 s=act(s,action=>action.type==='play'&&action.uid===played.uid&&action.line==='front');
 const beforeHand=s.players[0].hand.length;
 s=act(s,{type:'chooseRemoveHandMain',uid:taken.uid});
 assert.equal(zoneOf(s,0,taken.uid),'removed');
 assert.equal(s.players[0].hand.length,beforeHand);
 assert.equal(s.pending.kind,'effect-copy-main');
 s=act(s,{type:'chooseCopyMain',uid:copyHost.uid});
 assert.equal(s.pending,null);
 assert.equal(body(s,copyHost.uid).gainedMains.items[0].ability.op,'payHandGrantImpact');
 assert.ok(legal(s).some(action=>action.type==='activate'&&action.uid===copyHost.uid&&
  action.mode==='payHandImpact'&&action.gained===taken.uid));
 const payment=s.players[0].hand[0];
 s=act(s,{type:'activate',uid:copyHost.uid,mode:'payHandImpact',gained:taken.uid});
 s=act(s,{type:'choosePayHandImpact',uid:payment.uid});
 assert.equal(universalImpact(pack,s,body(s,copyHost.uid)),1);
 assert.equal(legal(s).some(action=>action.uid===copyHost.uid&&action.mode==='payHandImpact'),false);
 while(s.players[0].hand.length>1)s.players[0].outside.push(s.players[0].hand.pop());
 s=reach(s,0,'main',1);
 assert.equal(body(s,copyHost.uid).gainedMains,undefined);
 assert.equal(legal(s).some(action=>action.uid===copyHost.uid&&action.mode==='payHandImpact'),false);
 assert.equal(host.cardId,'MHA-2-042');
});

test('MHA-2-040 grants the echo and the zero-BP removal without resting',()=>{
 let s=reach(open(400),0,'main');
 const self=seat(s,0,'MHA-2-040','front',0,true);
 const small=seat(s,1,'MHA-2-005','front',0,true);
 const cutter=seat(s,0,'MHA-2-042','front',1,true);
 assert.equal(self.ready,true);
 s=act(s,{type:'activate',uid:self.uid,mode:'grantBpRules',targetUid:small.uid});
 assert.equal(body(s,self.uid).ready,true);
 assert.equal(body(s,small.uid).bpDownEcho.amount,500);
 assert.equal(body(s,small.uid).zeroBpToRemoved.turn,s.turn);
 assert.equal(legal(s).some(action=>action.uid===self.uid&&action.mode==='grantBpRules'),false);
 s=act(s,{type:'activate',uid:cutter.uid,mode:'oppDownSelfUp',targetUid:small.uid});
 assert.equal(zoneOf(s,1,small.uid),'removed');
 assert.equal(universalBp(pack,s,body(s,cutter.uid)),4000);
 assert.equal(body(s,cutter.uid).ready,true);
 assert.equal(legal(s).some(action=>action.uid===cutter.uid&&action.mode==='oppDownSelfUp'),false);

 s=reach(open(401),0,'main');
 const source=seat(s,0,'MHA-2-040','energy',0,true);
 const foe=seat(s,1,'MHA-2-019','front',0,true);
 assert.equal(legal(s).some(action=>action.uid===source.uid&&action.mode==='grantBpRules'),false);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=source;
 assert.ok(legal(s).some(action=>action.mode==='grantBpRules'&&action.targetUid===foe.uid));
 s.players[1].front[0]=null;
 s.players[1].outside.push(foe);
 assert.equal(legal(s).some(action=>action.uid===source.uid&&action.mode==='grantBpRules'),false);

 s=reach(open(402),0,'main');
 const marker=seat(s,0,'MHA-2-040','front',0,true);
 const marked=seat(s,1,'MHA-2-019','front',0,true);
 const again=seat(s,0,'MHA-2-042','front',1,true);
 s=act(s,{type:'activate',uid:marker.uid,mode:'grantBpRules',targetUid:marked.uid});
 again.ready=true;
 s=act(s,{type:'activate',uid:again.uid,mode:'oppDownSelfUp',targetUid:marked.uid});
 assert.equal(universalBp(pack,s,body(s,marked.uid)),2500);
 assert.equal(body(s,marked.uid).bpDownEcho.used,true);
 const follow=seat(s,0,'MHA-2-042','front',2,true);
 s=act(s,{type:'activate',uid:follow.uid,mode:'oppDownSelfUp',targetUid:marked.uid});
 assert.equal(universalBp(pack,s,body(s,marked.uid)),1500);
 assert.equal(zoneOf(s,1,marked.uid),'front');

 s=reach(open(403),0,'main');
 seat(s,0,'MHA-2-040','front',0,true);
 const living=seat(s,1,'MHA-2-019','front',0,true);
 const trigger=pull(s,0,'SPEC');
 s.players[0].outside.push(trigger);
 s=act(s,action=>action.type==='activate'&&action.mode==='grantBpRules'&&action.targetUid===living.uid);
 s.pending={kind:'life-trigger',player:0,uid:trigger.uid,trigger:'special'};
 s=act(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===living.uid);
 assert.equal(zoneOf(s,1,living.uid),'outside');
});

test('MHA-2-042 raids active, then cuts a front and raises itself without resting',()=>{
 let s=reach(open(420),0,'main',1);
 fuel(s,0,['MHA-2-043','MHA-2-044','MHA-2-045','MHA-2-040']);
 const base=seat(s,0,'TOGA-BASE','front',0,false);
 const hand=hold(s,0,'MHA-2-042');
 s.players[0].apCards[0].ready=true;
 s=act(s,action=>action.type==='raid'&&action.uid===hand.uid&&action.baseUid===base.uid);
 if(s.pending?.kind==='effect-target')s=act(s,{type:'chooseTarget',uid:null});
 assert.equal(body(s,hand.uid).ready,true);
 assert.equal(zoneOf(s,0,base.uid)!=='energy'||body(s,hand.uid).uid!==base.uid,true);

 s=reach(open(421),0,'main',1);
 fuel(s,0,['MHA-2-043','MHA-2-044','MHA-2-045','MHA-2-040']);
 const played=hold(s,0,'MHA-2-042');
 const front=seat(s,1,'MHA-2-019','front',0,true);
 const energy=seat(s,1,'MHA-2-005','energy',0,true);
 s=act(s,action=>action.type==='play'&&action.uid===played.uid&&action.line==='front');
 assert.equal(body(s,played.uid).ready,false);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.choices.includes(front.uid),true);
 assert.equal(s.pending.choices.includes(energy.uid),false);
 s=act(s,{type:'chooseTarget',uid:front.uid});
 assert.equal(universalBp(pack,s,body(s,front.uid)),3000);
 assert.equal(universalBp(pack,s,body(s,energy.uid)),1500);

 s=reach(open(422),0,'main');
 const self=seat(s,0,'MHA-2-042','front',0,true);
 const target=seat(s,1,'MHA-2-019','front',0,true);
 const readyBefore=self.ready;
 s=act(s,{type:'activate',uid:self.uid,mode:'oppDownSelfUp',targetUid:target.uid});
 assert.equal(body(s,self.uid).ready,readyBefore);
 assert.equal(universalBp(pack,s,body(s,target.uid)),3000);
 assert.equal(universalBp(pack,s,body(s,self.uid)),4000);
 assert.equal(legal(s).some(action=>action.uid===self.uid&&action.mode==='oppDownSelfUp'),false);
 const stayed=body(s,self.uid);
 stayed.ready=false;
 s.players[0].front[0]=null;
 s.players[0].energy[1]=stayed;
 assert.equal(legal(s).some(action=>action.uid===self.uid&&action.mode==='oppDownSelfUp'),false);
});
