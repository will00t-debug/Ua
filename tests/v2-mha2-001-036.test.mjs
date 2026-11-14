// EX06BT MHA-2-001 through 036. Official rows stay in the vol.2 catalog.
// Ready cards battle through the existing V2 pack. Pending cards stay out
// of that pack. Set 1 remains 109, and 037–073 are not in these files.
import assert from 'node:assert/strict';
import test from 'node:test';
import {MHA2_CARDS_001_036} from '../dist/mha/cards-mha2-001-036.mjs';
import {MHA2_PROGRAMS_001_036} from '../dist/universal-v2/mha/programs-mha2-001-036.mjs';
import {createMha2Pack,mha2ReadyBattleCards} from '../dist/universal-v2/mha2-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {
 legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 newUniversalMatch,universalBp,universalEnergyByColor,universalImpact,
 universalImpactNull,universalPrivateChoices
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
function open(seed,faces=[]){
 const cards=[...mha2ReadyBattleCards(),...faces];
 const live=faces.length?createUniversalPack({
  id:'mha',version:pack.version+'-scene',cards
 }):pack;
 const counts=deck(Object.fromEntries(faces.map(card=>[card.id,1])));
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
  if(index>=0)return pl[zone][index];
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
 assert.equal(pack.version,'mha2-ex06-ready-30');
 assert.equal(READY.length,17);
 assert.equal(Object.keys(pack.cards).length,30);
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
 const deku=face('MHA-2-021');
 const ofa=face('MHA-2-029');
 let {pack:live,s}=open(2002,[deku,ofa]);
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

 let skipped=open(2003,[deku,ofa]);
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
 fuel(costly.s,0,['MHA-2-015','MHA-2-014']);
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
 const deku=face('MHA-2-021');
 let {pack:live,s}=open(2008,[deku]);
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
 const deku=face('MHA-2-021');
 let {pack:live,s}=open(2013,[deku]);
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
 const deku=face('MHA-2-021');
 let {pack:live,s}=open(2019,[deku]);
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

test('MHA-2-022 cannot be hand-played beside other A-class, steps, and gains BP at three names',()=>{
 const faces=['MHA-2-021','MHA-2-029','MHA-2-030','MHA-2-031'].map(face);
 let {pack:live,s}=open(2022,faces);
 s=reach(live,s,0,'main');
 fuel(s,0,['MHA-2-001','MHA-2-001','MHA-2-001']);
 const other=seat(s,0,'MHA-2-004','front',1,true);
 const self=hold(s,0,'MHA-2-022');
 assert.equal(legalUniversalActions(live,s).some(action=>action.type==='play'&&action.uid===self.uid),false);
 s.players[0].front[1]=null;
 s.players[0].outside.push(other);
 const deku=seat(s,0,'MHA-2-021','front',1,true);
 assert.equal(legalUniversalActions(live,s).some(action=>action.type==='play'&&action.uid===self.uid),true);
 s=act(live,s,{type:'play',uid:self.uid,line:'front',slot:0});
 assert.equal(s.pending,null);
 assert.equal(universalBp(live,s,s.players[0].front[0]),3000);
 s.players[0].outside.push(pull(s,0,'MHA-2-029'),pull(s,0,'MHA-2-030'));
 assert.equal(universalBp(live,s,s.players[0].front[0]),3000);
 s.players[0].outside.push(pull(s,0,'MHA-2-031'));
 assert.equal(universalBp(live,s,s.players[0].front[0]),4000);
 s=reach(live,s,1,'main');
 assert.equal(universalBp(live,s,s.players[0].front[0]),4000);
 s.players[0].outside.pop();
 assert.equal(universalBp(live,s,s.players[0].front[0]),3000);
 assert.equal(deku.cardId,'MHA-2-021');

 let moved=open(20221);
 moved.s=reach(pack,moved.s,0,'move');
 const stepper=seat(moved.s,0,'MHA-2-022','front',0,true);
 const plain=seat(moved.s,0,'MHA-2-006','front',1,true);
 assert.equal(legalUniversalActions(pack,moved.s).some(action=>action.type==='step'&&action.uid===stepper.uid),true);
 assert.equal(legalUniversalActions(pack,moved.s).some(action=>action.type==='step'&&action.uid===plain.uid),false);
 moved.s=act(pack,moved.s,action=>action.type==='step'&&action.uid===stepper.uid&&action.slot===2);
 assert.equal(moved.s.players[0].energy[2].uid,stepper.uid);
 moved.s=reach(pack,moved.s,0,'main');
 moved.s.players[0].energy[2]=null;
 stepper.ready=true;
 moved.s.players[0].front[0]=stepper;
 assert.equal(legalUniversalActions(pack,moved.s).some(action=>action.type==='step'&&action.uid===stepper.uid),false);
});

test('pending 001-036 cards stay out of the vol.2 battle pack',()=>{
 assert.equal(PENDING.length,19);
 for(const id of PENDING){
  const card=byId.get(id);
  const program=MHA2_PROGRAMS_001_036[id];
  assert.equal(program.ready,false,id);
  assert.equal(typeof program.notes,'string');
  assert.ok(program.notes.length>12,id);
  assert.equal(pack.cards[id],undefined,id);
  assert.equal(card.effectJa==='-'||card.effectJa.includes('【')||card.effectJa.includes('この'),true,id);
  const counts=deck();
  counts[READY[0]]-=1;
  counts[id]=1;
  assert.ok(validateUniversalDeck(pack,counts).some(issue=>issue.includes('Unregistered/unsupported card: '+id)));
 }
});
