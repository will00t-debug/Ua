// Round 11 A. Shared engine only. 001, 013, 014 and 018 stay pending.
// 051 and 054 are complete D-group programs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {boardEntryMode,uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

const ENERGY={
 kind:'ownOtherRequiredEnergyAtLeast', turn:'any', zone:'field',
 excludeSelf:true, minEnergy:4, min:3
};
const GREEN_FIELD=[
 {field:'type', value:'field'},
 {field:'color', value:'green'},
 {field:'printedRequiredEnergyAtMost', value:2}
];

function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id, name:rest.name||rest.id, color:rest.color||'green',
  type:rest.type||'character', energy:rest.energy??0, ap:rest.ap??1,
  bp:rest.bp??2000, gen:rest.gen??0, traits:rest.traits||[], trigger:null,
  ...rest, implementation:implementation||(Object.keys(effects).length||rest.mainAbility||rest.unblockedAttack?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed=111){
 const fillers=Array.from({length:Math.max(12,13-cards.length)},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'), name:'填充'+i, implementation:'vanilla', bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe', version:'r11a-'+seed, cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 let s=newUniversalMatch(pack,{decks:[counts,counts], seed, first:0});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone], index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
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
function fuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,s.pending?.kind||'action');
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function passTo(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(pack,s,a=>a.type==='chooseHandLimit');
   continue;
  }
  if(s.pending?.kind==='block'){
   s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null});
   continue;
  }
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>40)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function play(pack,s,id,line='front'){
 const card=hold(s,id);
 fuel(s);
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [dispatchUniversalAction(pack,s,action),card];
}
function stackTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function placed(s,p,uid){
 for(const line of ['front','energy']){
  const card=s.players[p][line].find(c=>c?.uid===uid);
  if(card)return card;
 }
 return null;
}
function finishOrder(pack,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(pack,s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
  if(++guard>8)throw Error('order');
 }
 return s;
}
function reject(card,pattern){
 assert.throws(()=>createUniversalPack({id:'bad', version:'r11a', cards:[
  card, ...Array.from({length:12},(_,i)=>face({id:'BAD-'+i, implementation:'vanilla'}))
 ]}), pattern);
}

test('001, 013, 014, 018 and 070 are in the MHA pack, and IMC stays 113',()=>{
 const mha=createMhaV2Pack();
 assert.equal(Object.keys(mha.cards).length,93);
 for(const id of ['MHA-1-001','MHA-1-013','MHA-1-014','MHA-1-018','MHA-1-070'])
  assert.equal(mha.cards[id].id,id);
 assert.equal(mha.cards['MHA-1-001'].impactNull,true);
 assert.equal(mha.cards['MHA-1-001'].effects.onRetire[0].op,'drawDiscard');
 assert.equal(mha.cards['MHA-1-013'].effects.onPlay[0].then[0].op,'activeOwnOther');
 assert.equal(mha.cards['MHA-1-014'].raidName,'荼毘');
 assert.equal(mha.cards['MHA-1-018'].mainAbility.frontOnly,false);
 assert.deepEqual(mha.cards['MHA-1-070'].printedMains,[
  {id:'outside',op:'discardHandThenActive',discard:1}
 ]);
 assert.equal(mha.cards['MHA-1-006'].mainAbility.op,'payHandMoveOrSwap');
 assert.equal(mha.cards['MHA-1-056'].effects.onAttack[0].op,'stripFacedownToOutside');
 assert.equal(mha.cards['MHA-1-071'].effects.onPlay[0].op,'placeHandOutside');
 const mirio=mha.cards['MHA-1-051'];
 assert.equal(mirio.raidName,'通形 ミリオ');
 assert.deepEqual(mirio.blockBpRestriction,{relation:'atMost',bp:3000,condition:null});
 assert.equal(mirio.unblockedAttack.oncePerTurn,true);
 assert.equal(mirio.unblockedAttack.optional,false);
 assert.deepEqual(mirio.unblockedAttack.then,[{op:'draw',count:1}]);
 assert.equal(mirio.effects.onRetire[0].op,'deployRaidBottomActive');
 assert.equal(mirio.effects.onRetire[0].when.minEnergy,4);
 assert.equal(mirio.effects.onRetire[0].when.min,3);
 const mei=mha.cards['MHA-1-054'];
 assert.equal(mei.effects.onPlay[0].op,'searchTopOneBottomDiscard');
 assert.equal(mei.effects.onPlay[0].count,7);
 assert.equal(mei.effects.onPlay[0].discard,false);
 assert.equal(mei.effects.onPlay[0].logic,'all');
 assert.equal(Object.keys(createImcV2Pack().cards).length,113);
 const optional=createImcV2Pack().cards['IMC-1-061'];
 assert.equal(optional.unblockedAttack.optional,true);
 assert.equal(optional.unblockedAttack.oncePerTurn,undefined);
 assert.equal(createImcV2Pack().cards['IMC-1-056'].effects.onPlay[0].discard,undefined);
});

test('other characters with required energy are counted on both lines',()=>{
 const printed=c=>({type:c.cardId==='FIELD'?'field':'character', energy:c.energy});
 const reader=c=>c.energy;
 const state={active:0, players:[
  {front:[
    {uid:'0-self', faceDown:false, cardId:'SELF', energy:4},
    {uid:'0-a', faceDown:false, cardId:'A', energy:4},
    {uid:'0-down', faceDown:true, cardId:'DOWN', energy:4}
   ], energy:[
    {uid:'0-b', faceDown:false, cardId:'B', energy:4},
    {uid:'0-low', faceDown:false, cardId:'LOW', energy:3},
    {uid:'0-field', faceDown:false, cardId:'FIELD', energy:4}
   ]},
  {front:[], energy:[]}
 ]};
 assert.equal(matchesV2LiveCondition(state,0,'0-self',ENERGY,printed,()=>0,()=>0,reader),false);
 state.players[0].energy.push({uid:'0-c', faceDown:false, cardId:'C', energy:4});
 assert.equal(matchesV2LiveCondition(state,0,'0-self',ENERGY,printed,()=>0,()=>0,reader),true);
 reject(face({
  id:'BAD-ENERGY', raidName:'底',
  effects:{onRetire:[{op:'deployRaidBottomActive', optional:true, when:{...ENERGY, min:0}}]}
 }), /invalid other required-energy count|invalid raid-bottom active entry/);
});

test('001 draws one and puts one hand card outside when it retires',()=>{
 const {pack,s}=open([
  face({id:'LEAVE', name:'退場', bp:1000, impactNull:true,
   effects:{onRetire:[{op:'drawDiscard', count:1}]}}),
  face({id:'HIT', name:'攻擊', bp:5000, implementation:'vanilla'})
 ], 1001);
 let state=s;
 const defender=seat(state,0,'LEAVE','front',0,true);
 const attacker=seat(state,1,'HIT','front',0,true);
 const hand=state.players[0].hand.length;
 const deck=state.players[0].deck.length;
 state=passTo(pack,state,1,'attack');
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(state.pending?.kind,'block');
 state=dispatchUniversalAction(pack,state,{type:'chooseBlock', uid:defender.uid});
 assert.equal(assertUniversalMatch(pack,state),true);
 assert.ok(state.players[0].outside.some(c=>c.uid===defender.uid));
 assert.equal(state.players[0].hand.length,hand+1);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.pending?.kind,'effect-discard');
 const discarded=state.players[0].hand[0];
 state=act(pack,state,a=>a.uid===discarded.uid);
 assert.ok(state.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(state.players[0].hand.length,hand);
});

test('013 activates another front character only after a life card is taken',()=>{
 const {pack,s}=open([
  face({id:'LIFE13', name:'生命活動', effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'activeOwnOther', optional:true, line:'front'}]
  }]}}),
  face({id:'ALLY', name:'同伴', implementation:'vanilla'}),
  face({id:'BACK', name:'能量', implementation:'vanilla'})
 ], 1013);
 let state=s;
 const ally=seat(state,0,'ALLY','front',1,false);
 const back=seat(state,0,'BACK','energy',0,false);
 state.players[0].deck.push(...state.players[0].life.splice(1));
 const life=state.players[0].life[0].uid;
 let [next]=play(pack,state,'LIFE13');
 assert.equal(next.pending?.kind,'effect-life-to-hand');
 assert.equal(next.pending.follow?.op,'activeOwnOther');
 next=act(pack,next,a=>a.type==='chooseLifeToHand'&&a.uid===null);
 assert.equal(next.players[0].life.length,1);
 assert.equal(ally.ready,false);
 [next]=play(pack,next,'LIFE13','energy');
 assert.equal(next.pending?.kind,'effect-life-to-hand');
 next=act(pack,next,a=>a.type==='chooseLifeToHand'&&a.uid===life);
 assert.equal(next.status,'playing');
 assert.equal(next.players[0].life.length,0);
 assert.equal(next.pending?.kind,'effect-active-own-other');
 assert.equal(next.pending.line,'front');
 assert.ok(next.pending.choices.includes(ally.uid));
 assert.equal(next.pending.choices.includes(back.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,next,{type:'chooseActiveOwnOther', uid:back.uid}),
  /not currently legal|Illegal/);
 next=act(pack,next,a=>a.type==='chooseActiveOwnOther'&&a.uid===ally.uid);
 assert.equal(placed(next,0,ally.uid)?.ready,true);
 assert.equal(next.status,'finished');
 assert.equal(next.endReason,'life-zero');
});

test('014 retires a low front character only after the life card is taken',()=>{
 const {pack,s}=open([
  face({id:'LIFE14', name:'荼毘後', raidName:'荼毘', effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'retireOppFrontUnderBp', bp:3500, optional:true}]
  }]}}),
  face({id:'LOW', name:'低', bp:3000, implementation:'vanilla'}),
  face({id:'HIGH', name:'高', bp:4000, implementation:'vanilla'})
 ], 1014);
 let state=s;
 const low=seat(state,1,'LOW','front',0,true);
 const high=seat(state,1,'HIGH','front',1,true);
 let [next]=play(pack,state,'LIFE14');
 const life=next.pending.choices[0];
 next=act(pack,next,a=>a.type==='chooseLifeToHand'&&a.uid===null);
 assert.equal(next.pending,null);
 assert.equal(state.players[1].front[0]?.uid,low.uid);
 [next]=play(pack,next,'LIFE14','energy');
 next=act(pack,next,a=>a.type==='chooseLifeToHand'&&a.uid===life);
 assert.equal(next.pending?.kind,'effect-retire-bp');
 assert.equal(next.pending.limit,3500);
 assert.deepEqual(next.pending.choices,[low.uid]);
 next=act(pack,next,a=>a.type==='chooseRetireBp'&&a.uid===low.uid);
 assert.ok(next.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(next.players[1].front[1]?.uid,high.uid);
});

test('054 shows the whole top window and adds one non-character without discarding',()=>{
 const {pack,s}=open([
  face({id:'LOOK', name:'檢索', effects:{onPlay:[{
   op:'searchTopOneBottomDiscard', count:7, discard:false, logic:'all',
   filters:GREEN_FIELD
  }]}}),
  face({id:'OK', name:'合格', type:'field', color:'green', energy:2, bp:0, implementation:'vanilla'}),
  face({id:'COST', name:'太貴', type:'field', color:'green', energy:3, bp:0, implementation:'vanilla'}),
  face({id:'PERSON', name:'角色', type:'character', color:'green', energy:1, implementation:'vanilla'}),
  face({id:'BLUE', name:'藍', type:'field', color:'blue', energy:1, bp:0, implementation:'vanilla'})
 ], 1054);
 let state=s;
 const [ok,cost,person,blue]=stackTop(state,0,['OK','COST','PERSON','BLUE','FILL-01','FILL-02','FILL-03']);
 const before=state.players[0].hand.length;
 let [next]=play(pack,state,'LOOK');
 assert.equal(next.pending?.kind,'effect-top-filter-choice');
 assert.equal(next.pending.discard,false);
 assert.equal(next.pending.uids.length,7);
 assert.deepEqual(next.pending.choices,[ok.uid]);
 assert.ok(next.pending.uids.includes(cost.uid));
 assert.ok(next.pending.uids.includes(person.uid));
 assert.ok(next.pending.uids.includes(blue.uid));
 assert.equal(next.publicReveals.some(r=>r.kind==='revealed-window'),false);
 assert.throws(()=>dispatchUniversalAction(pack,next,{type:'chooseTopFiltered', uid:cost.uid}),
  /not currently legal|Filtered top search/);
 const handAfterTake=before;
 next=act(pack,next,a=>a.type==='chooseTopFiltered'&&a.uid===ok.uid);
 assert.equal(next.pending?.kind,'effect-top-order');
 assert.equal(next.pending.discardAfter,undefined);
 assert.ok(next.players[0].hand.some(c=>c.uid===ok.uid));
 assert.equal(next.players[0].hand.length,handAfterTake+1);
 assert.equal(next.publicReveals.filter(r=>r.kind==='searched-to-hand').length,1);
 assert.equal(next.publicReveals.find(r=>r.kind==='searched-to-hand').cardId,'OK');
 next=finishOrder(pack,next);
 assert.equal(next.pending,null);
 assert.equal(next.players[0].hand.length,handAfterTake+1);
 reject(face({
  id:'BAD-LOOK',
  effects:{onPlay:[{
   op:'searchTopOneBottomDiscard', count:7, discard:false, logic:'all',
   filters:[{field:'type', value:'character'},{field:'color', value:'green'}]
  }]}
 }), /invalid top-N filtered bottom\/discard profile/);
});

test('051 draws once when an attack is not blocked and can replay the raid bottom',()=>{
 const bottomWhen={...ENERGY};
 const {pack,s}=open([
  face({id:'MIRI', name:'通形', bp:5000, raidName:'通形 ミリオ',
   blockBpRestriction:{relation:'atMost', bp:3000, condition:null},
   unblockedAttack:{oncePerTurn:true, optional:false, then:[{op:'draw', count:1}]},
   effects:{onRetire:[{op:'deployRaidBottomActive', optional:true, when:bottomWhen}]}}),
  face({id:'BASE', name:'底板', bp:1500, implementation:'vanilla'}),
  face({id:'TALL', name:'高能', energy:4, bp:1000, implementation:'vanilla'}),
  face({id:'SHORT', name:'低能', energy:3, bp:1000, implementation:'vanilla'}),
  face({id:'FOE', name:'對手', bp:4000, implementation:'vanilla'})
 ], 1051);
 let state=s;
 const attacker=seat(state,0,'MIRI','front',0,true);
 const foe=seat(state,1,'FOE','front',0,true);
 const hand=state.players[0].hand.length;
 const deck=state.players[0].deck.length;
 state=passTo(pack,state,0,'attack');
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=dispatchUniversalAction(pack,state,{type:'chooseBlock', uid:foe.uid});
 assert.equal(assertUniversalMatch(pack,state),true);
 assert.equal(state.players[0].hand.length,hand);
 assert.equal(state.players[0].deck.length,deck);
 assert.equal(state.mainAbilityUsedUids.includes(attacker.uid+'|unblockedOnce'),false);
 placed(state,0,attacker.uid).ready=true;
 const blockedHand=state.players[0].hand.length;
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=dispatchUniversalAction(pack,state,{type:'chooseBlock', uid:null});
 assert.equal(assertUniversalMatch(pack,state),true);
 assert.equal(state.players[0].hand.length,blockedHand+1);
 assert.ok(state.mainAbilityUsedUids.includes(attacker.uid+'|unblockedOnce'));
 placed(state,0,attacker.uid).ready=true;
 const onceHand=state.players[0].hand.length;
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=dispatchUniversalAction(pack,state,{type:'chooseBlock', uid:null});
 assert.equal(state.players[0].hand.length,onceHand);

 const again=open([
  face({id:'MIRI', name:'通形', bp:1000, raidName:'通形 ミリオ',
   effects:{onRetire:[{op:'deployRaidBottomActive', optional:true, when:bottomWhen}]}}),
  face({id:'BASE', name:'底板', bp:1500, implementation:'vanilla'}),
  face({id:'TALL', name:'高能', energy:4, bp:1000, implementation:'vanilla'}),
  face({id:'HIT', name:'攻擊', bp:5000, implementation:'vanilla'})
 ], 1052);
 state=again.s;
 const raider=seat(state,0,'MIRI','front',0,true);
 const base=pull(state,0,'BASE');
 raider.stack=[base];
 seat(state,0,'TALL','front',1,true);
 seat(state,0,'TALL','front',2,true);
 seat(state,0,'TALL','energy',0,true);
 const hitter=seat(state,1,'HIT','front',0,true);
 state=passTo(again.pack,state,1,'attack');
 state=act(again.pack,state,a=>a.type==='attack'&&a.uid===hitter.uid);
 state=dispatchUniversalAction(again.pack,state,{type:'chooseBlock', uid:raider.uid});
 assert.equal(assertUniversalMatch(again.pack,state),true);
 assert.equal(state.pending?.kind,'effect-raid-bottom-active');
 assert.equal(state.pending.baseUid,base.uid);
 assert.equal(V2_PENDING_LABELS[state.pending.kind],'可將這疊突襲最下方的卡以活動狀態登場');
 assert.ok(legalUniversalActions(again.pack,state).some(a=>
  a.type==='chooseRaidBottomActive'&&a.uid===null));
 const entry=legalUniversalActions(again.pack,state).find(a=>
  a.type==='chooseRaidBottomActive'&&a.uid===base.uid&&a.line==='front');
 assert.ok(entry);
 assert.equal(boardEntryMode(entry),'normal');
 assert.match(uiActionLabel({type:'chooseRaidBottomActive',uid:null},
  {pack:again.pack,state}),/不將突襲最下段/);
 state=dispatchUniversalAction(again.pack,state,entry);
 assert.equal(assertUniversalMatch(again.pack,state),true);
 const entered=placed(state,0,base.uid);
 assert.equal(entered?.ready,true);
 assert.ok(state.players[0].front.some(c=>c?.uid===base.uid));
 assert.equal(state.players[0].energy.some(c=>c?.uid===base.uid),false);

 const skipped=open([
  face({id:'MIRI', name:'通形', bp:1000, raidName:'通形 ミリオ',
   effects:{onRetire:[{op:'deployRaidBottomActive', optional:true, when:bottomWhen}]}}),
  face({id:'BASE', name:'底板', implementation:'vanilla'}),
  face({id:'TALL', name:'高能', energy:4, implementation:'vanilla'}),
  face({id:'HIT', name:'攻擊', bp:5000, implementation:'vanilla'})
 ], 1056);
 state=skipped.s;
 const declining=seat(state,0,'MIRI','front',0,true);
 const kept=pull(state,0,'BASE');
 declining.stack=[kept];
 seat(state,0,'TALL','front',1,true);
 seat(state,0,'TALL','front',2,true);
 seat(state,0,'TALL','energy',0,true);
 const swinger=seat(state,1,'HIT','front',0,true);
 state=passTo(skipped.pack,state,1,'attack');
 state=act(skipped.pack,state,a=>a.type==='attack'&&a.uid===swinger.uid);
 state=dispatchUniversalAction(skipped.pack,state,{type:'chooseBlock', uid:declining.uid});
 state=act(skipped.pack,state,a=>a.type==='chooseRaidBottomActive'&&a.uid===null);
 assert.ok(state.players[0].outside.some(c=>c.uid===kept.uid));
 assert.equal(state.players[0].front.some(c=>c?.uid===kept.uid),false);

 const low=open([
  face({id:'MIRI', name:'通形', bp:1000, raidName:'通形 ミリオ',
   effects:{onRetire:[{op:'deployRaidBottomActive', optional:true, when:bottomWhen}]}}),
  face({id:'BASE', name:'底板', implementation:'vanilla'}),
  face({id:'TALL', name:'高能', energy:4, implementation:'vanilla'}),
  face({id:'HIT', name:'攻擊', bp:5000, implementation:'vanilla'})
 ], 1053);
 state=low.s;
 const small=seat(state,0,'MIRI','front',0,true);
 const buried=pull(state,0,'BASE');
 small.stack=[buried];
 seat(state,0,'TALL','front',1,true);
 seat(state,0,'TALL','energy',0,true);
 const hammer=seat(state,1,'HIT','front',0,true);
 state=passTo(low.pack,state,1,'attack');
 state=act(low.pack,state,a=>a.type==='attack'&&a.uid===hammer.uid);
 state=dispatchUniversalAction(low.pack,state,{type:'chooseBlock', uid:small.uid});
 assert.equal(assertUniversalMatch(low.pack,state),true);
 assert.equal(state.pending?.kind==='effect-raid-bottom-active',false);
 assert.ok(state.players[0].outside.some(c=>c.uid===buried.uid));
});

test('018 grants this turn battle-win draw from either line and only once',()=>{
 const card=face({id:'WIN', name:'勝利', bp:4000, mainAbility:{
  op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
  then:[{op:'grantSelfAttackWinDrawThisTurn'}]
 }});
 const foe=face({id:'FOE', name:'對手', bp:2000, implementation:'vanilla'});
 const {pack,s}=open([card,foe], 1018);
 let state=s;
 const energy=seat(state,0,'WIN','energy',0,true);
 assert.ok(legalUniversalActions(pack,state).some(a=>a.type==='activate'&&a.uid===energy.uid));
 state=act(pack,state,a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='frontOnce');
 assert.equal(placed(state,0,energy.uid)?.attackWinDrawGranted?.turn,state.turn);
 assert.equal(legalUniversalActions(pack,state).some(a=>a.type==='activate'&&a.uid===energy.uid),false);

 const front=open([card,foe], 1019);
 state=front.s;
 const winner=seat(state,0,'WIN','front',0,true);
 const loser=seat(state,1,'FOE','front',0,true);
 state=act(front.pack,state,a=>a.type==='activate'&&a.uid===winner.uid);
 const hand=state.players[0].hand.length;
 state=passTo(front.pack,state,0,'attack');
 state=act(front.pack,state,a=>a.type==='attack'&&a.uid===winner.uid);
 state=dispatchUniversalAction(front.pack,state,{type:'chooseBlock', uid:loser.uid});
 assert.equal(assertUniversalMatch(front.pack,state),true);
 assert.equal(state.players[0].hand.length,hand+1);
 assert.ok(state.players[1].outside.some(c=>c.uid===loser.uid));

 const lost=open([
  card,
  face({id:'BIG', name:'更大', bp:6000, implementation:'vanilla'})
 ], 1020);
 state=lost.s;
 const small=seat(state,0,'WIN','front',0,true);
 const big=seat(state,1,'BIG','front',0,true);
 state=act(lost.pack,state,a=>a.type==='activate'&&a.uid===small.uid);
 const still=state.players[0].hand.length;
 state=passTo(lost.pack,state,0,'attack');
 state=act(lost.pack,state,a=>a.type==='attack'&&a.uid===small.uid);
 state=dispatchUniversalAction(lost.pack,state,{type:'chooseBlock', uid:big.uid});
 assert.equal(assertUniversalMatch(lost.pack,state),true);
 assert.equal(state.players[0].hand.length,still);
 reject(face({
  id:'BAD-WIN',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:[{op:'grantSelfAttackWinDrawThisTurn', count:1}]
  }
 }), /unsupported main action ability/);
});
