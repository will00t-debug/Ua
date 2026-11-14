// EX06BT MHA-2-001 through 036. Official rows stay in the vol.2 catalog.
// Ready cards battle through the existing V2 pack. Pending cards stay out
// of that pack. Set 1 remains 109, and 037–073 are not in these files.
import assert from 'node:assert/strict';
import test from 'node:test';
import {MHA2_CARDS_001_036} from '../dist/mha/cards-mha2-001-036.mjs';
import {MHA2_PROGRAMS_001_036} from '../dist/universal-v2/mha/programs-mha2-001-036.mjs';
import {MHA2_REQUESTS_001_036} from '../dist/universal-v2/mha/requests-mha2-001-036.mjs';
import {createMha2Pack,mha2ReadyBattleCards} from '../dist/universal-v2/mha2-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {
 legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 newUniversalMatch,universalBp,universalEnergyByColor,universalImpact,
 universalImpactNull,universalPrivateChoices,zoneRequiredEnergy
} from '../dist/universal-v2/engine.mjs';

const pack=createMha2Pack();
const byId=new Map(MHA2_CARDS_001_036.map(card=>[card.id,card]));
const IDS=Array.from({length:36},(_,i)=>'MHA-2-'+String(i+1).padStart(3,'0'));
const READY=IDS.filter(id=>MHA2_PROGRAMS_001_036[id].ready===true);
const PENDING=IDS.filter(id=>MHA2_PROGRAMS_001_036[id].ready!==true);

function deck(extra={}){
 const counts={...extra};
 for(const id of READY)if(!counts[id])counts[id]=1;
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 for(const id of READY){
  while((counts[id]||0)<4&&total<50){
   counts[id]=(counts[id]||0)+1;
   total++;
  }
 }
 if(total!==50)throw Error('Deck stopped at '+total);
 return counts;
}
function face(id){
 const card=byId.get(id);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:null,
  traits:[...(card.traits||[])],implementation:'vanilla'
 };
}
function open(seed,faces=[],extra={}){
 const cards=[...mha2ReadyBattleCards(),...faces];
 const live=faces.length?createUniversalPack({
  id:'mha',version:pack.version+'-scene',cards
 }):pack;
 const counts=deck({...extra,...Object.fromEntries(faces.map(card=>[card.id,1]))});
 const issues=validateUniversalDeck(live,counts);
 if(issues.length)throw Error(issues.join('; '));
 const s=newUniversalMatch(live,{decks:[counts,counts],seed,attackerChoosesLife:true});
 return {pack:live,s};
}
function act(live,s,action){
 if(typeof action==='function'){
  const found=legalUniversalActions(live,s).find(action);
  assert.ok(found,'missing action; pending='+(s.pending?.kind||'none'));
  action=found;
 }
 const next=dispatchUniversalAction(live,s,action);
 assert.equal(assertUniversalMatch(live,next),true);
 return next;
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside','removed']){
  const index=pl[zone].findIndex(card=>card.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const zone of ['front','energy']){
  const index=pl[zone].findIndex(card=>card?.cardId===id);
  if(index>=0){
   const card=pl[zone][index];
   pl[zone][index]=null;
   return card;
  }
 }
 throw Error('Missing '+id+' for player '+p);
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
function order(live,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(live,s,{type:'chooseTopOrder',uid});
  if(++guard>8)throw Error('order');
 }
 return s;
}
function reachMainAp(live,s,player,count){
 for(let i=0;i<24;i++){
  const ready=s.players[player].apCards.filter(card=>card.inPlay&&card.ready).length;
  if(s.active===player&&s.phase==='main'&&!s.pending&&ready>=count)return s;
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+s.active+' '+s.phase);
  s=act(live,s,{type:'next'});
 }
 throw Error('Did not reach '+player+' main with '+count+' AP');
}
function reach(live,s,player,phase){
 for(let i=0;i<16;i++){
  if(s.active===player&&s.phase===phase&&!s.pending)return s;
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+s.active+' '+s.phase);
  s=act(live,s,{type:'next'});
 }
 throw Error('Did not reach '+player+' '+phase);
}

test('001-036 keep official identity and the 109-card set stays closed',()=>{
 assert.equal(MHA2_CARDS_001_036.length,36);
 assert.equal(READY.length+PENDING.length,36);
 assert.equal(pack.version,'mha2-ex06-ready-73');
 assert.equal(READY.length,36);
 assert.equal(Object.keys(pack.cards).length,73);
 assert.equal(Object.keys(createMhaV2Pack().cards).length,109);
 assert.equal(mhaEditorCards().filter(card=>card.id.startsWith('MHA-1-')).length,109);
 assert.equal(mhaEditorCards().filter(card=>card.id.startsWith('MHA-2-')).length,73);
 assert.equal(getTitle('mha').playable,true);
 for(const [index,id] of IDS.entries()){
  const card=byId.get(id);
  assert.equal(card.number,'EX06BT/'+id);
  assert.equal(card.set,'EX06BT');
  assert.equal(card.color,'yellow');
  assert.equal(card.title,'mha');
  assert.ok(card.nameJa);
  assert.equal(typeof card.effectJa,'string');
  assert.ok(card.effectJa.length>0);
  assert.match(card.image,/EX06BT_MHA-2-/);
  assert.match(card.source,/card_no=EX06BT%2F/);
  assert.equal(card.battleReady,false);
  assert.equal(card.deckLegal,true);
  assert.equal(card.auto,false);
  assert.equal(MHA2_PROGRAMS_001_036[id]!=null,true);
  assert.equal(index+1,Number(id.slice(6)));
 }
 const issues=validateUniversalDeck(pack,deck({'MHA-2-035':2}));
 assert.deepEqual(issues,[]);
});

test('MHA-2-001 rests for yellow energy and leaves at the end of main',()=>{
 let {s}=open(2001);
 s=reach(pack,s,0,'main');
 const self=seat(s,0,'MHA-2-001','energy',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 s=act(pack,s,action=>action.type==='activate'&&action.uid===self.uid);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='activate'&&action.uid===self.uid),false);
 s=act(pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.ok(s.players[0].outside.some(card=>card.uid===self.uid));
 assert.equal(universalEnergyByColor(pack,s,0).yellow||0,0);
});

test('MHA-2-002 publishes one Deku or One For All card, then discards only if it took one',()=>{
 let {pack:live,s}=open(2002);
 s=reach(live,s,0,'main');
 fuel(s,0,['MHA-2-001']);
 const hero=hold(s,0,'MHA-2-002');
 const named=pull(s,0,'MHA-2-021');
 const trait=pull(s,0,'MHA-2-029');
 const plain=pull(s,0,'MHA-2-001');
 const other=pull(s,0,'MHA-2-006');
 s.players[0].deck.unshift(other,plain,trait,named);
 s=act(live,s,action=>action.type==='play'&&action.uid===hero.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[other.uid,plain.uid,trait.uid,named.uid]);
 assert.equal(s.pending.choices.includes(named.uid),true);
 assert.equal(s.pending.choices.includes(trait.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 assert.equal(universalPrivateChoices(live,s,1),null);
 assert.equal(universalPrivateChoices(live,s,0).inspected.length,4);
 assert.throws(()=>dispatchUniversalAction(live,s,{type:'chooseTopFiltered',uid:plain.uid}),
  /not currently legal|Filtered top search/);
 s=act(live,s,{type:'chooseTopFiltered',uid:named.uid});
 s=order(live,s);
 assert.equal(s.pending.kind,'effect-discard');
 assert.throws(()=>dispatchUniversalAction(live,s,{type:'chooseDiscard',uid:null}),
  /not currently legal|Discard/);
 const spare=s.players[0].hand.find(card=>card.uid!==named.uid);
 s=act(live,s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(card=>card.uid===named.uid));
 assert.ok(s.players[0].outside.some(card=>card.uid===spare.uid));

 let skipped=open(2003);
 skipped.s=reach(skipped.pack,skipped.s,0,'main');
 fuel(skipped.s,0,['MHA-2-001']);
 const waiting=hold(skipped.s,0,'MHA-2-002');
 const window=[['MHA-2-006','MHA-2-010','MHA-2-029','MHA-2-021'].map(id=>pull(skipped.s,0,id))];
 skipped.s.players[0].deck.unshift(...window[0]);
 const before=skipped.s.players[0].outside.length;
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='play'&&action.uid===waiting.uid);
 skipped.s=act(skipped.pack,skipped.s,{type:'chooseTopFiltered',uid:null});
 skipped.s=order(skipped.pack,skipped.s);
 assert.equal(skipped.s.pending,null);
 assert.equal(skipped.s.players[0].outside.length,before);
});

test('MHA-2-004 adds yellow energy only while active on the energy line',()=>{
 let {s}=open(2004);
 const self=seat(s,0,'MHA-2-004','energy',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 self.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 s.players[0].energy[0]=null;
 seat(s,0,'MHA-2-004','front',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).yellow||0,0);
});

test('MHA-2-005 and 015 draw one and must put one hand card outside',()=>{
 let {s}=open(2005);
 s=reach(pack,s,0,'main');
 const self=hold(s,0,'MHA-2-005');
 const before=s.players[0].hand.length;
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(pack,s).some(action=>action.uid===null),false);
 const dumped=s.players[0].hand[0];
 s=act(pack,s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(s.players[0].hand.length,before-1);
 assert.ok(s.players[0].outside.some(card=>card.uid===dumped.uid));

 let costly=open(2015);
 costly.s=reach(pack,costly.s,0,'main');
 fuel(costly.s,0,['MHA-2-012','MHA-2-014','MHA-2-009']);
 const jiro=hold(costly.s,0,'MHA-2-015');
 costly.s=act(pack,costly.s,action=>action.type==='play'&&action.uid===jiro.uid);
 assert.equal(costly.s.pending.kind,'effect-discard');
 const away=costly.s.players[0].hand.find(card=>card.uid!==jiro.uid);
 const left=costly.s.players[0].hand.findIndex(card=>card.uid===away.uid);
 costly.s.players[0].deck.push(costly.s.players[0].hand.splice(left,1)[0]);
 assert.throws(()=>dispatchUniversalAction(pack,costly.s,{type:'chooseDiscard',uid:away.uid}),
  /not currently legal|Discard/);
});

test('MHA-2-006, 010 and 017 enter rested with no effect',()=>{
 for(const [id,seed,trigger] of [['MHA-2-006',2006,'get'],['MHA-2-010',2010,'get'],['MHA-2-017',2017,'active']]){
  let {s}=open(seed);
  s=reach(pack,s,0,'main');
  const self=hold(s,0,id);
  s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
  assert.equal(s.pending,null);
  assert.equal(s.players[0].front[0].ready,false);
  assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='activate'&&action.uid===self.uid),false);
  assert.equal(universalBp(pack,s,s.players[0].front[0]),byId.get(id).bp);
  assert.equal(pack.cards[id].trigger,trigger);
  assert.equal(pack.cards[id].implementation,'vanilla');
 }
});

test('MHA-2-007 steps from the front during the move phase only',()=>{
 let {s}=open(2007);
 s=reach(pack,s,0,'move');
 const self=seat(s,0,'MHA-2-007','front',0,true);
 const plain=seat(s,0,'MHA-2-006','front',1,true);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='step'&&action.uid===self.uid),true);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='step'&&action.uid===plain.uid),false);
 s=act(pack,s,action=>action.type==='step'&&action.uid===self.uid&&action.slot===0);
 assert.equal(s.players[0].energy[0].uid,self.uid);
 assert.equal(s.players[0].front[0],null);
 s=reach(pack,s,0,'main');
 const again=seat(s,0,'MHA-2-007','front',0,true);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='step'&&action.uid===again.uid),false);
});

test('MHA-2-008 enters active, looks at three A-class cards, and gains BP beside Deku',()=>{
 let {pack:live,s}=open(2008);
 s=reachMainAp(live,s,0,2);
 fuel(s,0,['MHA-2-014','MHA-2-004','MHA-2-001']);
 const self=hold(s,0,'MHA-2-008');
 const shown=pull(s,0,'MHA-2-004');
 const missed=pull(s,0,'MHA-2-001');
 const event=pull(s,0,'MHA-2-035');
 s.players[0].deck.unshift(event,missed,shown);
 s=act(live,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='energy'&&action.slot===3);
 assert.equal(s.players[0].energy[3].ready,true);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.choices.includes(shown.uid),true);
 assert.equal(s.pending.choices.includes(missed.uid),false);
 assert.equal(s.pending.choices.includes(event.uid),false);
 s=act(live,s,{type:'chooseTopFiltered',uid:shown.uid});
 s=order(live,s);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(card=>card.uid===shown.uid));
 assert.equal(s.players[0].outside.some(card=>card.cardId==='MHA-2-001'&&card.uid!==missed.uid),false);
 const named=seat(s,0,'MHA-2-021','front',0,true);
 assert.equal(universalBp(live,s,s.players[0].energy[3]),4000);
 named.ready=false;
 s=reach(live,s,1,'main');
 assert.equal(universalBp(live,s,s.players[0].energy[3]),3000);
});

test('MHA-2-013 removes impact from the character it battles',()=>{
 let {pack:live,s}=open(2013);
 s=reach(live,s,0,'attack');
 const striker=seat(s,0,'MHA-2-019','front',0,true);
 seat(s,0,'MHA-2-021','front',1,true);
 const wall=seat(s,1,'MHA-2-013','front',0,true);
 assert.equal(universalImpact(live,s,striker),1);
 assert.equal(universalImpactNull(live,s,wall),true);
 const life=s.players[1].life.length;
 s=act(live,s,{type:'attack',uid:striker.uid});
 s=act(live,s,action=>action.type==='chooseBlock'&&action.uid===wall.uid);
 assert.equal(s.players[1].life.length,life);
 assert.ok(s.players[1].outside.some(card=>card.uid===wall.uid));
 assert.equal(s.players[0].front[0].uid,striker.uid);
});

test('MHA-2-014 gains 1000 BP only on its controller turn',()=>{
 let {s}=open(2014);
 const self=seat(s,0,'MHA-2-014','front',0,true);
 const other=seat(s,1,'MHA-2-014','front',0,true);
 assert.equal(universalBp(pack,s,self),4000);
 assert.equal(universalBp(pack,s,other),3000);
});

test('MHA-2-019 gains BP and impact only on its turn beside Deku',()=>{
 let {pack:live,s}=open(2019);
 const self=seat(s,0,'MHA-2-019','front',0,true);
 assert.equal(universalBp(live,s,self),4000);
 assert.equal(universalImpact(live,s,self),0);
 const named=seat(s,0,'MHA-2-021','energy',0,true);
 assert.equal(universalBp(live,s,self),5000);
 assert.equal(universalImpact(live,s,self),1);
 const away=seat(s,1,'MHA-2-019','front',0,true);
 seat(s,1,'MHA-2-021','front',1,true);
 assert.equal(universalBp(live,s,away),4000);
 assert.equal(universalImpact(live,s,away),0);
 assert.equal(named.cardId,'MHA-2-021');
});

test('MHA-2-027 bounces another energy-1 character, or itself when none exists',()=>{
 let {s}=open(2027);
 s=reach(pack,s,0,'main');
 fuel(s,0,['MHA-2-014']);
 const other=seat(s,0,'MHA-2-006','front',0,true);
 const fuelCard=s.players[0].energy[0];
 const self=hold(s,0,'MHA-2-027');
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front'&&action.slot===1);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='chooseOwnBounce'&&action.uid===other.uid),true);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='chooseOwnBounce'&&action.uid===fuelCard.uid),false);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.uid===null),false);
 s=act(pack,s,{type:'chooseOwnBounce',uid:other.uid});
 assert.ok(s.players[0].hand.some(card=>card.uid===other.uid));
 assert.equal(s.players[0].front[1].uid,self.uid);

 let alone=open(2028);
 alone.s=reach(pack,alone.s,0,'main');
 fuel(alone.s,0,['MHA-2-014']);
 const body=hold(alone.s,0,'MHA-2-027');
 alone.s=act(pack,alone.s,action=>action.type==='play'&&action.uid===body.uid&&action.line==='front');
 assert.equal(alone.s.pending,null);
 assert.ok(alone.s.players[0].hand.some(card=>card.uid===body.uid));
 assert.equal(alone.s.players[0].front.every(card=>!card),true);
});

test('MHA-2-028 shows three cards and discards a hand card only after taking A-class',()=>{
 let {s}=open(2028);
 s=reach(pack,s,0,'main');
 fuel(s,0,['MHA-2-014']);
 const self=hold(s,0,'MHA-2-028');
 const shown=pull(s,0,'MHA-2-004');
 const missed=pull(s,0,'MHA-2-001');
 const event=pull(s,0,'MHA-2-035');
 s.players[0].deck.unshift(event,missed,shown);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.choices.includes(shown.uid),true);
 assert.equal(s.pending.choices.includes(event.uid),false);
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,3);
 s=act(pack,s,{type:'chooseTopFiltered',uid:null});
 s=order(pack,s);
 assert.equal(s.pending,null);

 let taken=open(2029);
 taken.s=reach(pack,taken.s,0,'main');
 fuel(taken.s,0,['MHA-2-014']);
 const body=hold(taken.s,0,'MHA-2-028');
 const pick=pull(taken.s,0,'MHA-2-005');
 taken.s.players[0].deck.unshift(pull(taken.s,0,'MHA-2-006'),pull(taken.s,0,'MHA-2-010'),pick);
 taken.s=act(pack,taken.s,action=>action.type==='play'&&action.uid===body.uid);
 taken.s=act(pack,taken.s,{type:'chooseTopFiltered',uid:pick.uid});
 taken.s=order(pack,taken.s);
 assert.equal(taken.s.pending.kind,'effect-discard');
 const spare=taken.s.players[0].hand.find(card=>card.uid!==pick.uid);
 taken.s=act(pack,taken.s,{type:'chooseDiscard',uid:spare.uid});
 assert.ok(taken.s.players[0].outside.some(card=>card.uid===spare.uid));
});

test('MHA-2-035 activates up to two rested AP cards and can stop early',()=>{
 let {s}=open(2035);
 s=reachMainAp(pack,s,0,2);
 fuel(s,0,['MHA-2-015','MHA-2-014']);
 const inPlay=s.players[0].apCards.filter(card=>card.inPlay);
 const sidelined=s.players[0].apCards.find(card=>!card.inPlay);
 inPlay[1].ready=false;
 const event=hold(s,0,'MHA-2-035');
 s=act(pack,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legalUniversalActions(pack,s).some(action=>action.uid===sidelined.uid),false);
 assert.equal(legalUniversalActions(pack,s).some(action=>action.type==='chooseApRecovery'&&action.uid===null),true);
 s=act(pack,s,{type:'chooseApRecovery',uid:inPlay[0].uid});
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=act(pack,s,{type:'chooseApRecovery',uid:inPlay[1].uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.filter(card=>card.inPlay&&card.ready).length,2);
 assert.equal(s.players[0].apCards.find(card=>!card.inPlay).ready,false);

 let early=open(2036);
 early.s=reachMainAp(pack,early.s,0,2);
 fuel(early.s,0,['MHA-2-015','MHA-2-004']);
 const rested=early.s.players[0].apCards.find(card=>card.inPlay&&card.ready);
 rested.ready=false;
 const one=hold(early.s,0,'MHA-2-035');
 early.s=act(pack,early.s,action=>action.type==='event'&&action.uid===one.uid);
 early.s=act(pack,early.s,{type:'chooseApRecovery',uid:null});
 assert.equal(early.s.pending,null);
 assert.equal(early.s.players[0].apCards.filter(card=>card.inPlay&&card.ready).length,0);
});

test('MHA-2-022 cannot enter from hand beside another A組, steps, and gains BP at three names',()=>{
 let banned=open(2022);
 banned.s=reach(banned.pack,banned.s,0,'main');
 fuel(banned.s,0,['MHA-2-014','MHA-2-001']);
 const self=hold(banned.s,0,'MHA-2-022');
 assert.equal(legalUniversalActions(banned.pack,banned.s).some(action=>
  action.type==='play'&&action.uid===self.uid),false);
 const gem={id:'GEM',name:'燃料',color:'yellow',type:'character',energy:0,ap:1,bp:1000,
  gen:1,trigger:null,traits:[],implementation:'vanilla'};
 const otherDeku={id:'OTHER-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:1,ap:1,
  bp:1000,gen:1,trigger:null,traits:['A組'],implementation:'vanilla'};
 let named=open(2122,[gem,otherDeku]);
 named.s=reach(named.pack,named.s,0,'main');
 fuel(named.s,0,['MHA-2-001','MHA-2-002','GEM']);
 const deku=hold(named.s,0,'MHA-2-022');
 seat(named.s,0,'OTHER-DEKU','front',0,true);
 assert.equal(legalUniversalActions(named.pack,named.s).some(action=>
  action.type==='play'&&action.uid===deku.uid),true);

 let stepped=open(3022);
 stepped.s=reach(stepped.pack,stepped.s,0,'move');
 const mover=seat(stepped.s,0,'MHA-2-022','front',0,true);
 assert.equal(legalUniversalActions(stepped.pack,stepped.s).some(action=>
  action.type==='step'&&action.uid===mover.uid),true);

 const names=['オールマイト','飯田 天哉','麗日 お茶子'].map((name,i)=>({
  id:'OFA-'+i,name,color:'yellow',type:'character',energy:1,ap:1,bp:1000,gen:1,
  trigger:null,traits:['ワン・フォー・オール'],implementation:'vanilla'
 }));
 let bonus=open(4022,names);
 const body=seat(bonus.s,0,'MHA-2-022','front',0,true);
 assert.equal(universalBp(bonus.pack,bonus.s,body),3000);
 for(const card of names)bonus.s.players[0].outside.push(pull(bonus.s,0,card.id));
 assert.equal(universalBp(bonus.pack,bonus.s,body),4000);
});

test('MHA-2-009 buffs on entry and may pay one other hand card for a raiding Deku',()=>{
 const raidDeku={
  id:'RAID-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:4,ap:1,
  bp:2500,gen:1,trigger:null,traits:['A組'],raidName:'オールマイト',implementation:'vanilla'
 };
 const loud={
  id:'LOUD-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:5,ap:1,
  bp:2500,gen:1,trigger:null,traits:['A組'],implementation:'vanilla'
 };
 const handDeku={
  id:'HAND-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:1,ap:1,
  bp:1000,gen:1,trigger:null,traits:['A組'],implementation:'vanilla'
 };
 let scene=open(2009,[raidDeku,loud,handDeku]);
 scene.s=reachMainAp(scene.pack,scene.s,0,1);
 fuel(scene.s,0,['MHA-2-014','MHA-2-015','MHA-2-006','MHA-2-010']);
 const base=seat(scene.s,0,'MHA-2-006','front',0,true);
 const self=hold(scene.s,0,'MHA-2-009');
 assert.equal(legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='raid'&&action.uid===self.uid&&action.baseUid===base.uid),true);
 const other=hold(scene.s,0,'MHA-2-001');
 const named=hold(scene.s,0,'HAND-DEKU');
 scene.s.players[0].outside.push(pull(scene.s,0,'RAID-DEKU'),pull(scene.s,0,'LOUD-DEKU'));
 scene.s=act(scene.pack,scene.s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='energy');
 assert.equal(scene.s.pending.kind,'effect-except-hand-rest');
 assert.equal(scene.s.pending.choices.includes(named.uid),false);
 assert.equal(scene.s.pending.choices.includes(other.uid),true);
 const viewed=universalPrivateChoices(scene.pack,scene.s,0);
 assert.equal(viewed.options.some(row=>row.action.uid===other.uid&&row.card.name==='一般女性'),true);
 scene.s=act(scene.pack,scene.s,{type:'chooseExceptHandRest',mode:'decline'});
 const entered=scene.s.players[0].energy.find(card=>card?.uid===self.uid);
 assert.equal(universalBp(scene.pack,scene.s,entered),5000);
 assert.equal(universalImpact(scene.pack,scene.s,entered),1);
 assert.equal(scene.s.players[0].hand.some(card=>card.uid===other.uid),true);

 let paid=open(2109,[raidDeku]);
 paid.s=reachMainAp(paid.pack,paid.s,0,1);
 fuel(paid.s,0,['MHA-2-014','MHA-2-015','MHA-2-010','MHA-2-005']);
 const payer=hold(paid.s,0,'MHA-2-009');
 const cost=hold(paid.s,0,'MHA-2-001');
 const guest=pull(paid.s,0,'RAID-DEKU');
 paid.s.players[0].outside.push(guest);
 paid.s=act(paid.pack,paid.s,action=>action.type==='play'&&action.uid===payer.uid&&action.line==='front');
 paid.s=act(paid.pack,paid.s,{type:'chooseExceptHandRest',mode:'hand',uid:cost.uid});
 assert.equal(paid.s.pending.kind,'effect-outside-rest');
 assert.deepEqual(paid.s.pending.choices,[guest.uid]);
 paid.s=act(paid.pack,paid.s,action=>action.type==='chooseOutsideRest'&&action.uid===guest.uid&&action.line==='front');
 assert.equal(paid.s.players[0].front.some(card=>card?.uid===guest.uid&&card.ready===false),true);
 assert.equal(paid.s.players[0].outside.some(card=>card.uid===cost.uid),true);
});

test('MHA-2-012 and 018 pay the printed hand or AP cost before the same Deku entry',()=>{
 const guest={
  id:'REST-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:3,ap:1,
  bp:2000,gen:1,trigger:null,traits:['A組'],raidName:'オールマイト',implementation:'vanilla'
 };
 let ap=open(2012,[guest]);
 ap.s=reachMainAp(ap.pack,ap.s,0,2);
 fuel(ap.s,0,['MHA-2-014','MHA-2-015','MHA-2-006','MHA-2-010']);
 const striker=hold(ap.s,0,'MHA-2-012');
 ap.s.players[0].outside.push(pull(ap.s,0,'REST-DEKU'));
 ap.s=act(ap.pack,ap.s,action=>action.type==='play'&&action.uid===striker.uid&&action.line==='front');
 assert.equal(legalUniversalActions(ap.pack,ap.s).some(action=>action.mode==='ap'),true);
 ap.s=act(ap.pack,ap.s,{type:'chooseExceptHandRest',mode:'ap'});
 const home=ap.s.players[0].front.findIndex(card=>card?.uid===striker.uid);
 const body=ap.s.players[0].front[home];
 ap.s=act(ap.pack,ap.s,action=>action.type==='chooseOutsideRest'&&action.uid&&
  action.line==='front'&&action.slot!==home&&!action.replaceUid);
 assert.equal(ap.s.players[0].front.some(card=>card?.cardId==='REST-DEKU'&&card.ready===false),true);
 assert.equal(universalImpactNull(ap.pack,ap.s,body),true);
 const tall=seat(ap.s,1,'MHA-2-009','front',0,true);
 const short=seat(ap.s,1,'MHA-2-014','front',1,true);
 ap.s=reach(ap.pack,ap.s,0,'attack');
 const attacker=ap.s.players[0].front.find(card=>card?.cardId==='MHA-2-012');
 // 手牌登場預設休息。這裡只測 BP 4000 的阻擋門檻。
 attacker.ready=true;
 ap.s=act(ap.pack,ap.s,{type:'attack',uid:attacker.uid});
 const blocks=legalUniversalActions(ap.pack,ap.s).filter(action=>action.type==='chooseBlock'&&action.uid);
 assert.equal(blocks.some(action=>action.uid===short.uid),true);
 assert.equal(blocks.some(action=>action.uid===tall.uid),false);

 let both=open(2018,[guest]);
 both.s=reachMainAp(both.pack,both.s,0,2);
 fuel(both.s,0,['MHA-2-014','MHA-2-015','MHA-2-006','MHA-2-010']);
 const cold=hold(both.s,0,'MHA-2-018');
 const cost=hold(both.s,0,'MHA-2-001');
 both.s.players[0].outside.push(pull(both.s,0,'REST-DEKU'));
 both.s=act(both.pack,both.s,action=>action.type==='play'&&action.uid===cold.uid&&action.line==='front');
 assert.equal(legalUniversalActions(both.pack,both.s).some(action=>action.mode==='ap'),false);
 both.s=act(both.pack,both.s,{type:'chooseExceptHandRest',mode:'hand',uid:cost.uid});
 assert.equal(both.s.pending.kind,'effect-outside-rest');
 assert.equal(both.s.players[0].apCards.filter(card=>card.inPlay&&card.ready).length,0);
});

test('MHA-2-021 pays one AP from hand, moves outside, then draws and readies an AP',()=>{
 let scene=open(2021);
 scene.s=reachMainAp(scene.pack,scene.s,0,1);
 seat(scene.s,0,'MHA-2-004','front',0,true);
 const self=hold(scene.s,0,'MHA-2-021');
 const plays=()=>legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='play'&&action.uid===self.uid);
 const activates=()=>legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='handActivate'&&action.mode==='handPayApOutside'&&action.uid===self.uid);
 assert.equal(plays(),false);
 assert.equal(activates(),false);
 fuel(scene.s,0,['MHA-2-001','MHA-2-001']);
 assert.equal(plays(),false);
 assert.equal(activates(),true);
 scene.s=act(scene.pack,scene.s,action=>action.type==='handActivate'&&action.uid===self.uid);
 assert.equal(scene.s.players[0].hand.some(card=>card.uid===self.uid),false);
 assert.equal(scene.s.players[0].outside.some(card=>card.uid===self.uid),true);
 assert.equal(scene.s.players[0].apCards.filter(card=>card.inPlay&&card.ready).length,0);
 assert.equal(scene.s.pending.kind,'effect-discard');
 const dumped=scene.s.players[0].hand[0];
 scene.s=act(scene.pack,scene.s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(scene.s.players[0].outside.some(card=>card.uid===dumped.uid),true);
 assert.equal(scene.s.pending.kind,'effect-recover-ap');
 const rested=scene.s.players[0].apCards.find(card=>card.inPlay&&!card.ready);
 scene.s=act(scene.pack,scene.s,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(scene.s.players[0].apCards.some(card=>card.uid===rested.uid&&card.ready),true);
 assert.equal(scene.s.pending,null);
});

test('MHA-2-023 shows four cards and adds at most two that are not Deku',()=>{
 let scene=open(2023);
 scene.s=reachMainAp(scene.pack,scene.s,0,1);
 fuel(scene.s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 seat(scene.s,0,'MHA-2-004','front',0,true);
 const self=hold(scene.s,0,'MHA-2-023');
 const window=['MHA-2-021','MHA-2-014','MHA-2-009','MHA-2-006'].map(id=>pull(scene.s,0,id));
 scene.s.players[0].deck.unshift(...window);
 assert.equal(legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='play'&&action.uid===self.uid),false);
 scene.s=act(scene.pack,scene.s,action=>action.type==='handActivate'&&action.uid===self.uid);
 assert.equal(scene.s.players[0].outside.some(card=>card.uid===self.uid),true);
 assert.equal(scene.s.pending.kind,'effect-top-filter-many-choice');
 assert.deepEqual(scene.s.pending.uids,window.map(card=>card.uid));
 assert.equal(scene.s.pending.choices.includes(window[0].uid),false);
 assert.equal(scene.s.pending.choices.length,3);
 const looked=universalPrivateChoices(scene.pack,scene.s,0);
 assert.equal(looked.inspected.length,4);
 assert.equal(looked.inspected.some(card=>card.cardId==='MHA-2-021'),true);
 assert.equal(looked.options.some(option=>option.action.uid===window[0].uid),false);
 scene.s=act(scene.pack,scene.s,{type:'chooseTopFilteredMany',uid:window[1].uid});
 scene.s=act(scene.pack,scene.s,{type:'chooseTopFilteredMany',uid:null});
 assert.equal(scene.s.pending.kind,'effect-top-order');
 scene.s=order(scene.pack,scene.s);
 assert.equal(scene.s.players[0].hand.some(card=>card.uid===window[1].uid),true);
 assert.equal(scene.s.players[0].hand.some(card=>card.uid===window[0].uid),false);
 const bottom=scene.s.players[0].deck.slice(-3).map(card=>card.uid);
 assert.deepEqual(bottom.slice().sort(),[window[0].uid,window[2].uid,window[3].uid].sort());
});

test('MHA-2-025 retires a front character, and three other A組 raise the cap',()=>{
 const ally=n=>({
  id:'ALLY-'+n,name:'仲間'+n,color:'yellow',type:'character',energy:1,ap:1,
  bp:1500,gen:0,trigger:null,traits:['A組'],implementation:'vanilla'
 });
 const low={
  id:'LOW-BP',name:'低標',color:'red',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const mid={
  id:'MID-BP',name:'中標',color:'red',type:'character',energy:1,ap:1,
  bp:4000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const deku={
  id:'FIELD-DEKU',name:'緑谷 出久',color:'yellow',type:'character',energy:1,ap:1,
  bp:3000,gen:0,trigger:null,traits:['A組'],implementation:'vanilla'
 };
 const prepare=(seed,faces,allies)=>{
  let scene=open(seed,[low,mid,...faces]);
  scene.s=reachMainAp(scene.pack,scene.s,0,1);
  fuel(scene.s,0,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
  allies.forEach((id,slot)=>seat(scene.s,0,id,'front',slot,true));
  const small=seat(scene.s,1,'LOW-BP','front',0,true);
  const tall=seat(scene.s,1,'MID-BP','front',1,true);
  const self=hold(scene.s,0,'MHA-2-025');
  return {scene,self,small,tall};
 };
 let plain=prepare(2025,[],[ ]);
 assert.equal(legalUniversalActions(plain.scene.pack,plain.scene.s).some(action=>
  action.type==='handActivate'&&action.uid===plain.self.uid),true);
 plain.scene.s=act(plain.scene.pack,plain.scene.s,action=>
  action.type==='handActivate'&&action.uid===plain.self.uid);
 assert.equal(plain.scene.s.pending.kind,'effect-retire-bp');
 assert.equal(plain.scene.s.pending.limit,3000);
 assert.equal(plain.scene.s.pending.optional,true);
 assert.deepEqual(plain.scene.s.pending.choices,[plain.small.uid]);
 plain.scene.s=act(plain.scene.pack,plain.scene.s,{type:'chooseRetireBp',uid:null});
 assert.equal(plain.scene.s.players[1].front[0]?.uid,plain.small.uid);

 let raised=prepare(2026,[ally(1),ally(2),ally(3)],['ALLY-1','ALLY-2','ALLY-3']);
 assert.equal(legalUniversalActions(raised.scene.pack,raised.scene.s).some(action=>
  action.type==='play'&&action.uid===raised.self.uid),false);
 raised.scene.s=act(raised.scene.pack,raised.scene.s,action=>
  action.type==='handActivate'&&action.uid===raised.self.uid);
 assert.equal(raised.scene.s.pending.limit,5000);
 assert.equal(raised.scene.s.pending.choices.includes(raised.tall.uid),true);
 raised.scene.s=act(raised.scene.pack,raised.scene.s,{type:'chooseRetireBp',uid:raised.tall.uid});
 assert.equal(raised.scene.s.players[1].front[1],null);

 let named=prepare(2027,[ally(1),ally(2),deku],['ALLY-1','ALLY-2','FIELD-DEKU']);
 named.scene.s=act(named.scene.pack,named.scene.s,action=>
  action.type==='handActivate'&&action.uid===named.self.uid);
 assert.equal(named.scene.s.pending.limit,3000);
 assert.equal(named.scene.s.pending.choices.includes(named.tall.uid),false);
 assert.equal(named.scene.s.pending.choices.includes(named.small.uid),true);
});

test('MHA-2-034 discounts each One For All name and must retire a front character',()=>{
 const low={
  id:'LOW-BP',name:'低標',color:'red',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const high={
  id:'HIGH-BP',name:'高標',color:'red',type:'character',energy:1,ap:1,
  bp:4000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 let scene=open(2034,[low,high]);
 scene.s=reachMainAp(scene.pack,scene.s,0,1);
 fuel(scene.s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 const small=seat(scene.s,1,'LOW-BP','front',0,true);
 const tall=seat(scene.s,1,'HIGH-BP','front',1,true);
 const event=hold(scene.s,0,'MHA-2-034');
 const printed=scene.pack.cards['MHA-2-034'];
 const playable=()=>legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='event'&&action.uid===event.uid);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'hand'),6);
 assert.equal(playable(),false);
 const fields=['MHA-2-029','MHA-2-030','MHA-2-031'].map(id=>pull(scene.s,0,id));
 scene.s.players[0].outside.push(...fields);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'hand'),3);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'life'),6);
 assert.equal(playable(),true);
 fields[0].faceDown=true;
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'hand'),4);
 assert.equal(playable(),false);
 fields[0].faceDown=false;
 scene.s=act(scene.pack,scene.s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(scene.s.pending.kind,'effect-retire-bp');
 assert.equal(scene.s.pending.limit,3000);
 assert.equal(scene.s.pending.optional,undefined);
 assert.deepEqual(scene.s.pending.choices,[small.uid]);
 scene.s=act(scene.pack,scene.s,{type:'chooseRetireBp',uid:small.uid});
 assert.equal(scene.s.players[1].front[0],null);
 assert.equal(scene.s.players[1].front[1]?.uid,tall.uid);

 let capped=open(2035,[high]);
 capped.s=reachMainAp(capped.pack,capped.s,0,1);
 fuel(capped.s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 const only=seat(capped.s,1,'HIGH-BP','front',0,true);
 const again=hold(capped.s,0,'MHA-2-034');
 capped.s.players[0].outside.push(...['MHA-2-029','MHA-2-030','MHA-2-031'].map(id=>pull(capped.s,0,id)));
 assert.equal(legalUniversalActions(capped.pack,capped.s).some(action=>
  action.type==='event'&&action.uid===again.uid),false);
 seat(capped.s,0,'MHA-2-021','front',0,true);
 assert.equal(legalUniversalActions(capped.pack,capped.s).some(action=>
  action.type==='event'&&action.uid===again.uid),true);
 capped.s=act(capped.pack,capped.s,action=>action.type==='event'&&action.uid===again.uid);
 assert.equal(capped.s.pending.limit,5000);
 assert.deepEqual(capped.s.pending.choices,[only.uid]);
});

test('MHA-2-003 adds one yellow at three names and draws only after the trait card leaves',()=>{
 const guest={
  id:'OFA-GUEST',name:'客',color:'yellow',type:'character',energy:1,ap:1,
  bp:1000,gen:1,traits:['ワン・フォー・オール'],trigger:null,implementation:'vanilla'
 };
 let {pack,s}=open(2003,[guest]);
 const names=['MHA-2-029','MHA-2-030','MHA-2-031'];
 s=reach(pack,s,0,'main');
 const self=seat(s,0,'MHA-2-003','energy',0,false);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 const fields=names.map(id=>pull(s,0,id));
 s.players[0].outside.push(fields[0],fields[1]);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 s.players[0].outside.push(fields[2]);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 fields[2].faceDown=true;
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 fields[2].faceDown=false;
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 const plain=hold(s,0,'MHA-2-006');
 s.players[0].deck.push(...s.players[0].hand.filter(card=>
  card.uid!==plain.uid&&(pack.cards[card.cardId].traits||[]).includes('ワン・フォー・オール')));
 s.players[0].hand=s.players[0].hand.filter(card=>
  card.uid===plain.uid||!(pack.cards[card.cardId].traits||[]).includes('ワン・フォー・オール'));
 self.ready=true;
 assert.equal(legalUniversalActions(pack,s).some(action=>
  action.type==='activate'&&action.uid===self.uid),false);
 const body=hold(s,0,'OFA-GUEST');
 s=act(pack,s,action=>action.type==='activate'&&action.uid===self.uid&&
  action.mode==='restTraitOutside');
 assert.equal(s.players[0].energy.find(card=>card?.uid===self.uid).ready,false);
 assert.equal(s.pending.kind,'effect-trait-hand-outside');
 assert.deepEqual(s.pending.choices,[body.uid]);
 assert.equal(universalPrivateChoices(pack,s,0).options.some(option=>
  option.card?.cardId==='OFA-GUEST'),true);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseTraitHandOutside',uid:plain.uid}),
  /not currently legal|Trait hand/);
 const before=s.players[0].hand.length;
 s=act(pack,s,{type:'chooseTraitHandOutside',uid:body.uid});
 assert.equal(s.players[0].outside.some(card=>card.uid===body.uid),true);
 assert.equal(s.players[0].hand.some(card=>card.uid===plain.uid),true);
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.pending,null);
});

test('MHA-2-026 bans other Class 1-A, discounts each name, and rests one trait character onto energy',()=>{
 const names=['MHA-2-029','MHA-2-030','MHA-2-031','MHA-2-032','MHA-2-033'];
 const guest={
  id:'OFA-GUEST',name:'客',color:'yellow',type:'character',energy:1,ap:1,
  bp:1000,gen:1,traits:['ワン・フォー・オール'],trigger:null,implementation:'vanilla'
 };
 const banned={
  id:'LINE-BAN',name:'禁',color:'yellow',type:'character',energy:1,ap:1,
  bp:1000,gen:0,traits:['ワン・フォー・オール'],trigger:null,
  implementation:'dsl',energyLineForbidden:true
 };
 let scene=open(2026,[guest,banned]);
 scene.s=reach(scene.pack,scene.s,0,'main');
 fuel(scene.s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 const self=hold(scene.s,0,'MHA-2-026');
 const printed=scene.pack.cards['MHA-2-026'];
 const playable=()=>legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='play'&&action.uid===self.uid);
 assert.equal(printed.printedImpact,1);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'hand'),8);
 assert.equal(playable(),false);
 const fields=names.map(id=>pull(scene.s,0,id));
 scene.s.players[0].outside.push(...fields);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'hand'),3);
 assert.equal(zoneRequiredEnergy(scene.pack,scene.s,0,printed,'life'),8);
 assert.equal(playable(),true);
 const ally=seat(scene.s,0,'MHA-2-004','front',0,true);
 assert.equal(playable(),false);
 scene.s.players[0].front[0]=null;
 scene.s.players[0].removed.push(ally);
 const body=hold(scene.s,0,'OFA-GUEST');
 const blocked=hold(scene.s,0,'LINE-BAN');
 scene.s=act(scene.pack,scene.s,action=>action.type==='play'&&action.uid===self.uid&&
  action.line==='front');
 assert.equal(scene.s.pending.kind,'effect-named-zone-entry');
 assert.equal(scene.s.pending.trait,'ワン・フォー・オール');
 assert.equal(scene.s.pending.handChoices.includes(body.uid),true);
 assert.equal(scene.s.pending.handChoices.includes(blocked.uid),false);
 assert.equal(scene.s.pending.outsideChoices.includes(fields[0].uid),false);
 const entered=scene.s.players[0].front.find(card=>card?.uid===self.uid);
 assert.equal(universalImpact(scene.pack,scene.s,entered),1);
 scene.s=act(scene.pack,scene.s,action=>action.type==='chooseNamedZoneDeploy'&&
  action.uid===body.uid&&action.line==='energy');
 const rested=scene.s.players[0].energy.find(card=>card?.uid===body.uid);
 assert.equal(rested.ready,false);
 assert.equal(scene.s.players[0].hand.some(card=>card.uid===blocked.uid),true);
 assert.equal(scene.s.pending,null);

 let skipped=open(2027,[guest]);
 skipped.s=reach(skipped.pack,skipped.s,0,'main');
 fuel(skipped.s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 skipped.s.players[0].outside.push(...names.map(id=>pull(skipped.s,0,id)));
 const waiting=hold(skipped.s,0,'MHA-2-026');
 const staying=hold(skipped.s,0,'OFA-GUEST');
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='play'&&action.uid===waiting.uid&&
  action.line==='front');
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='chooseNamedZoneDeploy'&&action.uid===null);
 assert.equal(skipped.s.players[0].hand.some(card=>card.uid===staying.uid),true);
 assert.equal(skipped.s.pending,null);
});

test('MHA-2-011 hides Deku from an opponent choice only while it is on the front',()=>{
 const deku={
  id:'DEKU-LOW',name:'緑谷 出久',color:'yellow',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:['A組'],implementation:'vanilla'
 };
 const other={
  id:'OTHER-LOW',name:'別',color:'red',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const play=(seed,line)=>{
  let scene=open(seed,[deku,other]);
  scene.s=reachMainAp(scene.pack,scene.s,1,1);
  seat(scene.s,0,'MHA-2-011',line,0,true);
  const hero=seat(scene.s,0,'DEKU-LOW','front',1,true);
  const bystander=seat(scene.s,0,'OTHER-LOW','front',2,true);
  fuel(scene.s,1,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
  const hand=hold(scene.s,1,'MHA-2-025');
  scene.s=act(scene.pack,scene.s,action=>action.type==='handActivate'&&action.uid===hand.uid);
  const chosen=()=>legalUniversalActions(scene.pack,scene.s)
   .filter(action=>action.type==='chooseRetireBp').map(action=>action.uid);
  return {hero,bystander,chosen};
 };
 const covered=play(2011,'front');
 assert.equal(covered.chosen().includes(covered.hero.uid),false);
 assert.equal(covered.chosen().includes(covered.bystander.uid),true);
 const openLine=play(2012,'energy');
 assert.equal(openLine.chosen().includes(openLine.hero.uid),true);
 let battle=open(2013,[deku]);
 battle.s=reach(battle.pack,battle.s,1,'attack');
 seat(battle.s,0,'MHA-2-011','front',0,true);
 seat(battle.s,0,'DEKU-LOW','front',1,true);
 const striker=seat(battle.s,1,'MHA-2-006','front',0,true);
 striker.ready=true;
 assert.equal(legalUniversalActions(battle.pack,battle.s).some(action=>
  action.type==='attack'&&action.uid===striker.uid),true);
});

test('MHA-2-016 may shift one character after it leaves, and a full line removes one first',()=>{
 const mover={
  id:'MOVER',name:'移動',color:'yellow',type:'character',energy:1,ap:1,
  bp:4000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const retire=(seed,faces,fill)=>{
  let scene=open(seed,faces);
  scene.s=reachMainAp(scene.pack,scene.s,1,1);
  const self=seat(scene.s,0,'MHA-2-016','front',0,true);
  fuel(scene.s,1,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
  if(fill)for(let slot=0;slot<4;slot++)seat(scene.s,0,'MHA-2-001','energy',slot,false);
  const hand=hold(scene.s,1,'MHA-2-025');
  scene.s=act(scene.pack,scene.s,action=>action.type==='handActivate'&&action.uid===hand.uid);
  scene.s=act(scene.pack,scene.s,{type:'chooseRetireBp',uid:self.uid});
  return scene;
 };
 let alone=retire(2016,[]);
 assert.equal(alone.s.pending,null);
 assert.ok(alone.s.players[0].outside.some(card=>card.cardId==='MHA-2-016'));

 let scene=open(2017,[mover]);
 scene.s=reachMainAp(scene.pack,scene.s,1,1);
 const self=seat(scene.s,0,'MHA-2-016','front',0,true);
 const moving=seat(scene.s,0,'MOVER','front',1,true);
 fuel(scene.s,1,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
 const hand=hold(scene.s,1,'MHA-2-025');
 scene.s=act(scene.pack,scene.s,action=>action.type==='handActivate'&&action.uid===hand.uid);
 scene.s=act(scene.pack,scene.s,{type:'chooseRetireBp',uid:self.uid});
 assert.equal(scene.s.pending.kind,'effect-line-move');
 assert.equal(scene.s.pending.player,0);
 assert.deepEqual(scene.s.pending.choices,[moving.uid]);
 assert.equal(legalUniversalActions(scene.pack,scene.s).some(action=>
  action.type==='chooseLineMove'&&action.uid===null),true);
 let skipped=structuredClone(scene.s);
 skipped=act(scene.pack,skipped,{type:'chooseLineMove',uid:null});
 assert.equal(skipped.players[0].front[1]?.uid,moving.uid);
 scene.s=act(scene.pack,scene.s,{type:'chooseLineMove',uid:moving.uid});
 assert.equal(scene.s.pending.kind,'effect-line-slot');
 const slot=legalUniversalActions(scene.pack,scene.s).find(action=>action.type==='chooseLineSlot');
 scene.s=act(scene.pack,scene.s,slot);
 assert.equal(scene.s.players[0].energy.some(card=>card?.uid===moving.uid),true);
 assert.equal(scene.s.players[0].front[1],null);

 let full=open(2018,[mover]);
 full.s=reachMainAp(full.pack,full.s,1,1);
 const leaving=seat(full.s,0,'MHA-2-016','front',0,true);
 const shifting=seat(full.s,0,'MOVER','front',1,true);
 const occupants=[];
 for(let slot=0;slot<4;slot++)occupants.push(seat(full.s,0,'MHA-2-001','energy',slot,false));
 fuel(full.s,1,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
 const payer=hold(full.s,1,'MHA-2-025');
 full.s=act(full.pack,full.s,action=>action.type==='handActivate'&&action.uid===payer.uid);
 full.s=act(full.pack,full.s,{type:'chooseRetireBp',uid:leaving.uid});
 full.s=act(full.pack,full.s,{type:'chooseLineMove',uid:shifting.uid});
 const swap=legalUniversalActions(full.pack,full.s).find(action=>
  action.type==='chooseLineSlot'&&action.replaceUid===occupants[0].uid);
 full.s=act(full.pack,full.s,swap);
 assert.equal(full.s.players[0].energy[0]?.uid,shifting.uid);
 assert.ok(full.s.players[0].removed.some(card=>card.uid===occupants[0].uid));
});

test('MHA-2-029 through 033 rest and retire only at three names, then follow the printed sentence',()=>{
 const deku={
  id:'DEKU-LOW',name:'緑谷 出久',color:'yellow',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:['A組'],implementation:'vanilla'
 };
 const other={
  id:'OTHER-LOW',name:'別',color:'red',type:'character',energy:1,ap:1,
  bp:2000,gen:0,trigger:null,traits:[],implementation:'vanilla'
 };
 const prepare=(seed,id,outsideIds,withDeku)=>{
  let scene=open(seed,[deku,other],{'MHA-2-045':1});
  scene.s=reach(scene.pack,scene.s,0,'main');
  scene.s.players[0].outside.push(...outsideIds.map(card=>pull(scene.s,0,card)));
  const self=seat(scene.s,0,id,'energy',0,true);
  const hero=withDeku?seat(scene.s,0,'DEKU-LOW','front',0,false):null;
  const bystander=seat(scene.s,0,'OTHER-LOW','front',1,true);
  const offered=()=>legalUniversalActions(scene.pack,scene.s).some(action=>
   action.type==='activate'&&action.uid===self.uid&&action.mode==='gatedRestRetire');
  return {scene,self,hero,bystander,offered};
 };
 let short=prepare(2029,'MHA-2-029',['MHA-2-030'],true);
 assert.equal(short.offered(),false);
 let nameless=prepare(2030,'MHA-2-029',['MHA-2-030','MHA-2-031'],false);
 assert.equal(nameless.offered(),false);
 let scene=prepare(2031,'MHA-2-029',['MHA-2-030','MHA-2-031'],true);
 assert.equal(scene.offered(),true);
 const before=scene.scene.s.players[0].hand.length;
 scene.scene.s=act(scene.scene.pack,scene.scene.s,action=>
  action.type==='activate'&&action.uid===scene.self.uid);
 assert.ok(scene.scene.s.players[0].outside.some(card=>card.uid===scene.self.uid));
 assert.equal(scene.scene.s.pending.kind,'effect-named-follow');
 assert.equal(scene.scene.s.pending.follow,'shield');
 assert.deepEqual(legalUniversalActions(scene.scene.pack,scene.scene.s)
  .map(action=>action.uid),[scene.hero.uid]);
 assert.throws(()=>dispatchUniversalAction(scene.scene.pack,scene.scene.s,
  {type:'chooseNamedFollow',uid:null}),/not currently legal|Named follow/);
 scene.scene.s=act(scene.scene.pack,scene.scene.s,{type:'chooseNamedFollow',uid:scene.hero.uid});
 const shielded=scene.scene.s.players[0].front.find(card=>card?.uid===scene.hero.uid);
 assert.equal(scene.scene.s.players[0].hand.length,before+1);
 assert.equal(shielded.sniperImmune.stamp,shielded.fieldEntryStamp);
 assert.equal(scene.scene.s.continuousStates.some(status=>
  status.kind==='cannotBeChosenByOppEffect'&&status.selectionScope==='character'&&
  status.targetUid===scene.hero.uid),true);
 scene.scene.s=reachMainAp(scene.scene.pack,scene.scene.s,1,1);
 fuel(scene.scene.s,1,['MHA-2-001','MHA-2-001','MHA-2-001','MHA-2-001']);
 const character=hold(scene.scene.s,1,'MHA-2-025');
 scene.scene.s=act(scene.scene.pack,scene.scene.s,action=>
  action.type==='handActivate'&&action.uid===character.uid);
 const characterChoices=legalUniversalActions(scene.scene.pack,scene.scene.s)
  .filter(action=>action.type==='chooseRetireBp').map(action=>action.uid);
 assert.equal(characterChoices.includes(shielded.uid),false);
 assert.equal(characterChoices.includes(scene.bystander.uid),true);

 let event=prepare(2032,'MHA-2-029',['MHA-2-030','MHA-2-031'],true);
 event.scene.s=act(event.scene.pack,event.scene.s,action=>
  action.type==='activate'&&action.uid===event.self.uid);
 event.scene.s=act(event.scene.pack,event.scene.s,{type:'chooseNamedFollow',uid:event.hero.uid});
 event.scene.s=reachMainAp(event.scene.pack,event.scene.s,1,1);
 fuel(event.scene.s,1,['MHA-2-001','MHA-2-001','MHA-2-001']);
 event.scene.s.players[1].outside.push(...['MHA-2-029','MHA-2-030','MHA-2-031']
  .map(id=>pull(event.scene.s,1,id)));
 const played=hold(event.scene.s,1,'MHA-2-034');
 event.scene.s=act(event.scene.pack,event.scene.s,action=>
  action.type==='event'&&action.uid===played.uid);
 assert.equal(legalUniversalActions(event.scene.pack,event.scene.s).some(action=>
  action.type==='chooseRetireBp'&&action.uid===event.hero.uid),true);

 let sniper=prepare(2033,'MHA-2-029',['MHA-2-030','MHA-2-031'],true);
 sniper.scene.s=act(sniper.scene.pack,sniper.scene.s,action=>
  action.type==='activate'&&action.uid===sniper.self.uid);
 sniper.scene.s=act(sniper.scene.pack,sniper.scene.s,{type:'chooseNamedFollow',uid:sniper.hero.uid});
 sniper.scene.s=reach(sniper.scene.pack,sniper.scene.s,1,'main');
 const hunter=seat(sniper.scene.s,1,'MHA-2-045','front',0,true);
 const pay=sniper.scene.s.players[1].hand.slice(0,2);
 sniper.scene.s=act(sniper.scene.pack,sniper.scene.s,action=>
  action.type==='activate'&&action.uid===hunter.uid&&action.mode==='oncePay');
 sniper.scene.s=act(sniper.scene.pack,sniper.scene.s,action=>
  action.type==='chooseDiscardGate'&&action.uids&&
  action.uids.includes(pay[0].uid)&&action.uids.includes(pay[1].uid));
 sniper.scene.s=reach(sniper.scene.pack,sniper.scene.s,1,'attack');
 hunter.ready=true;
 const shots=legalUniversalActions(sniper.scene.pack,sniper.scene.s)
  .filter(action=>action.type==='attack'&&action.uid===hunter.uid);
 assert.equal(shots.some(action=>action.targetUid===sniper.hero.uid),false);
 assert.equal(shots.some(action=>action.targetUid===sniper.bystander.uid),true);

 let active=prepare(2034,'MHA-2-031',['MHA-2-029','MHA-2-030'],true);
 assert.equal(prepare(2035,'MHA-2-031',['MHA-2-030'],true).offered(),false);
 const held=active.scene.s.players[0].hand.length;
 active.scene.s=act(active.scene.pack,active.scene.s,action=>
  action.type==='activate'&&action.uid===active.self.uid);
 assert.equal(active.scene.s.pending.kind,'effect-active-own-named');
 assert.equal(active.scene.s.pending.optional,false);
 assert.throws(()=>dispatchUniversalAction(active.scene.pack,active.scene.s,
  {type:'chooseActiveOwnNamed',uid:null}),/not currently legal|Mandatory named/);
 active.scene.s=act(active.scene.pack,active.scene.s,
  {type:'chooseActiveOwnNamed',uid:active.hero.uid});
 const readied=active.scene.s.players[0].front.find(card=>card?.uid===active.hero.uid);
 assert.equal(readied.ready,true);
 assert.equal(active.scene.s.players[0].hand.length,held);

 let paid=prepare(2036,'MHA-2-032',['MHA-2-030','MHA-2-031'],true);
 const pocket=paid.scene.s.players[0].hand.splice(0);
 paid.scene.s.players[0].deck.push(...pocket);
 assert.equal(paid.offered(),false);
 const payment=paid.scene.s.players[0].deck.pop();
 paid.scene.s.players[0].hand.push(payment);
 assert.equal(paid.offered(),true);
 paid.scene.s=act(paid.scene.pack,paid.scene.s,action=>
  action.type==='activate'&&action.uid===paid.self.uid);
 assert.equal(paid.scene.s.pending.kind,'effect-gated-hand-retire');
 paid.scene.s=act(paid.scene.pack,paid.scene.s,
  {type:'chooseGatedHandRetire',uid:payment.uid});
 assert.ok(paid.scene.s.players[0].outside.some(card=>card.uid===paid.self.uid));
 assert.ok(paid.scene.s.players[0].outside.some(card=>card.uid===payment.uid));
 paid.scene.s=act(paid.scene.pack,paid.scene.s,
  {type:'chooseNamedFollow',uid:paid.hero.uid});
 const sniping=paid.scene.s.players[0].front.find(card=>card?.uid===paid.hero.uid);
 assert.equal(sniping.sniperGranted.turn,paid.scene.s.turn);
 sniping.ready=true;
 const foe=seat(paid.scene.s,1,'OTHER-LOW','front',0,true);
 paid.scene.s=reach(paid.scene.pack,paid.scene.s,0,'attack');
 assert.equal(legalUniversalActions(paid.scene.pack,paid.scene.s).some(action=>
  action.type==='attack'&&action.uid===sniping.uid&&action.targetUid===foe.uid),true);

 let buffed=prepare(2037,'MHA-2-033',['MHA-2-030','MHA-2-031'],true);
 assert.equal(prepare(2038,'MHA-2-033',['MHA-2-030'],true).offered(),false);
 const drawn=buffed.scene.s.players[0].hand.length;
 const printed=universalBp(buffed.scene.pack,buffed.scene.s,buffed.hero);
 buffed.scene.s=act(buffed.scene.pack,buffed.scene.s,action=>
  action.type==='activate'&&action.uid===buffed.self.uid);
 buffed.scene.s=act(buffed.scene.pack,buffed.scene.s,
  {type:'chooseNamedFollow',uid:buffed.hero.uid});
 const boosted=buffed.scene.s.players[0].front.find(card=>card?.uid===buffed.hero.uid);
 assert.equal(universalBp(buffed.scene.pack,buffed.scene.s,boosted),printed+2000);
 assert.equal(buffed.scene.s.players[0].hand.length,drawn+1);
});

test('pending 001-036 cards stay out of the vol.2 battle pack',()=>{
 assert.equal(PENDING.length,0);
 assert.deepEqual(Object.keys(MHA2_REQUESTS_001_036).sort(),[...PENDING].sort());
 for(const id of PENDING){
  const card=byId.get(id);
  const program=MHA2_PROGRAMS_001_036[id];
  const request=MHA2_REQUESTS_001_036[id];
  assert.equal(program.ready,false,id);
  assert.equal(typeof program.notes,'string');
  assert.ok(program.notes.length>12,id);
  assert.equal(typeof request.missing,'string');
  assert.ok(request.missing.length>12,id);
  assert.deepEqual(request.faq||[],card.faq.map(row=>row.id));
  assert.equal(pack.cards[id],undefined,id);
  assert.equal(card.effectJa==='-'||card.effectJa.includes('【')||card.effectJa.includes('この'),true,id);
  const counts=deck();
  counts[READY[0]]-=1;
  counts[id]=1;
  assert.ok(validateUniversalDeck(pack,counts).some(issue=>issue.includes('Unregistered/unsupported card: '+id)));
 }
});
