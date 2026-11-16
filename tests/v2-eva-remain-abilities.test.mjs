// Shared sentences for the remaining EVA prints. Probes use ordinary fields.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalAttackDamage,universalImpact,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'purple',type:extra.type||'character',
  energy:extra.energy??1,ap:extra.ap??1,bp:extra.bp??3000,gen:extra.gen??1,
  traits:extra.traits||[],trigger:extra.trigger===undefined?null:extra.trigger,
  implementation:extra.implementation||'dsl',effects:extra.effects||{},...extra
 };
}
const probes=[
 face({id:'WARD',impactNull:true,oppTurnWard:true}),
 face({id:'START',bpPerDirectFacedown:{amount:500,turn:'own'},phaseEffects:[{
  phase:'start',edge:'start',turn:'own',then:[{op:'retireSelfIfFacedownAtLeast',min:3}]
 }],effects:{onAttack:[{op:'tuckFacedownUnder',from:'deckTop',host:'self',count:1,optional:false}]}}),
 face({id:'MOVE',impactNull:true,effects:{onPlay:[{op:'stripAnyOwnFacedown',optional:true}]},
  mainAbility:{op:'moveSelfEnergyToFront'}}),
 face({id:'COUNT',raidName:'碇 シンジ',raidBaseNames:['碇 シンジ','渚 カヲル'],
  outsideCountGrants:[
   {min:13,turn:'own',bp:1000,attackDamage:2},
   {min:26,turn:'own',bp:1000,impact:4}
  ],mainAbility:{op:'stripFacedownThenDraw',oncePerTurn:true,frontOnly:true}}),
 face({id:'WAKE',name:'渚 カヲル',trigger:'color',
  triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
  mainAbility:{op:'restSelfBuffOther',bp:500},
  energyWakeNamed:{name:'碇 シンジ',once:'name'}}),
 face({id:'DOWN',bpPerDirectFacedown:{amount:500,turn:'any'},
  effects:{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]},
  mainAbility:{op:'frontBpDownThenTuck',bp:1000,oncePerTurn:true,frontOnly:true}}),
 face({id:'GRANT',name:'真希波・マリ・イラストリアス',traits:['WILLE'],trigger:'color',
  triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
  mainAbility:{op:'entryTurnGrantUnblockedDraw',trait:'WILLE',oncePerTurn:true}}),
 face({id:'FIELD',type:'field',bp:0,trigger:'get',effects:{
  onPlay:[{op:'tuckFacedownUnder',from:'deckTop',host:'self',count:2,optional:false}],
  onRetire:[
   {op:'recoverOutsideAny',zone:'outside',max:1,optional:true,anyOf:[{field:'type',value:'character'}]},
   {op:'ownTurnHandOutsideActiveAp'}
  ]
 },mainAbility:{op:'restRetireIfClearUnder'}}),
 face({id:'ZERO',raidName:'綾波 レイ',mainAbility:{op:'retireSelfGrantNextPlay',frontOnly:true,
  name:'碇 シンジ',includes:'初号機',color:'red',energy:1,ap:1},
  effects:{onRetire:[{op:'draw',count:2}]}}),
 face({id:'BEAST',printedAttackDamage:2,phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
  {op:'optionalTriggerlessHandActive',count:2,bp:3000}
 ]}] }),
 face({id:'COME',type:'event',bp:0,color:'red',trigger:'special',triggerEffect:{op:'retireOppFront'},
  playRequiresNameOrIncludes:{name:'碇 シンジ',includes:'初号機'},
  effects:{onPlay:[
   {op:'retireOppFrontUnderBp',bp:5000},
   {op:'tuckOutsideUnderNamedHost',name:'綾波 レイ',host:'碇 シンジ',optional:true,hostNeedsEmptyUnder:true}
  ]}}),
 face({id:'SHINJI',name:'碇 シンジ',implementation:'vanilla'}),
 face({id:'UNIT',name:'エヴァンゲリオン初号機',color:'red',energy:1,implementation:'vanilla'}),
 face({id:'REI',name:'綾波 レイ',implementation:'vanilla'}),
 face({id:'WILLE',name:'味方',traits:['WILLE'],implementation:'vanilla'}),
 face({id:'FOE',name:'敵',bp:1000,color:'yellow',implementation:'vanilla'}),
 face({id:'PLAIN',implementation:'vanilla'}),
 face({id:'TRIG',trigger:'draw',implementation:'vanilla'}),
 ...Array.from({length:9},(_,i)=>face({id:'FILL-'+i,implementation:'vanilla'}))
];
const pack=createUniversalPack({id:'probe',version:'eva-remain',cards:probes});
function deck(){
 const spec={};
 for(const card of probes)if(!card.id.startsWith('FILL-'))spec[card.id]=1;
 for(let i=0;i<8;i++)spec['FILL-'+i]=4;
 return spec;
}
const decks=[deck(),deck()];
function pull(s,id,player=0){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function main(seed){
 let s=newUniversalMatch(pack,{decks,first:0,seed});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function seat(s,id,line,slot,player=0){
 const card=pull(s,id,player);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.entryTurn=s.turn;
 s.players[player][line][slot]=card;
 return card;
}
function layer(uid){
 return {uid,cardId:'PLAIN',faceDown:true,ready:false,stack:[],under:[],buffs:[]};
}
function act(s,pred){
 const found=legalUniversalActions(pack,s).find(pred);
 assert.ok(found,JSON.stringify(s.pending||s.phase));
 return dispatchUniversalAction(pack,s,found);
}
function bpOf(s,uid){
 for(const viewer of [0,1]){
  const board=universalPublicView(pack,s,viewer).players[viewer];
  const row=[...board.front,...board.energy].find(c=>c?.uid===uid);
  if(row)return row.bp;
 }
 throw Error('Missing BP '+uid);
}
function live(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const found=p[line].find(c=>c?.uid===uid);
  if(found)return found;
 }
 return null;
}

test('an opponent-turn ward ignores BP reduction and a hand return',()=>{
 let s=main(2);
 const card=seat(s,'WARD','front',0);
 card.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(bpOf(s,card.uid),2000);
 s.active=1;
 assert.equal(bpOf(s,card.uid),3000);
 const bounced=s.players[0].front[0];
 s.players[0].hand.push(bounced);
 s.players[0].front[0]=null;
 s.players[0].front[0]=s.players[0].hand.pop();
 assert.equal(s.players[0].front[0].uid,card.uid);
});

test('three facedown cards retire the character at its next own start, and an attack tucks the deck top',()=>{
 let s=main(3);
 const card=seat(s,'START','front',0);
 const buried=[];
 for(let i=0;i<2;i++){
  const c=s.players[0].deck.pop();
  c.faceDown=true;c.ready=false;c.stack=[];c.under=[];c.buffs=[];
  buried.push(c);
 }
 card.under=buried;
 assert.equal(bpOf(s,card.uid),4000);
 const third=s.players[0].deck.pop();
 third.faceDown=true;third.ready=false;third.stack=[];third.under=[];third.buffs=[];
 card.under.push(third);
 const top=s.players[0].deck[0];
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:card.uid});
 const attacker=live(s,card.uid);
 assert.equal(attacker.under.some(c=>c.uid===top.uid&&c.faceDown),true);
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 let guard=0;
 while(!(s.active===0&&s.phase==='start'&&s.turn>1)&&guard<40){
  if(s.pending){
   const legal=legalUniversalActions(pack,s);
   const skip=legal.find(a=>a.uid===null||a.mode==='skip'||a.slot===null);
   s=dispatchUniversalAction(pack,s,skip||legal[0]);
  }else s=dispatchUniversalAction(pack,s,{type:'next'});
  guard++;
 }
 assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===card.uid),true);
});

test('a field facedown may be sent outside, and a resting energy character can move itself forward',()=>{
 let s=main(4);
 const host=seat(s,'SHINJI','energy',1);
 const buried=s.players[0].deck.pop();
 buried.faceDown=true;buried.ready=false;buried.stack=[];buried.under=[];buried.buffs=[];
 host.under=[buried];
 const mover=pull(s,'MOVE');
 mover.ready=false;
 s.players[0].hand.push(mover);
 s=dispatchUniversalAction(pack,s,{type:'play',uid:mover.uid,line:'energy',slot:0});
 assert.equal(s.pending.kind,'effect-strip-facedown');
 s=act(s,a=>a.uid===buried.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===buried.uid),true);
 s=act(s,a=>a.mode==='moveFront'&&a.uid===mover.uid);
 assert.equal(s.pending.kind,'effect-self-to-front');
 s=act(s,a=>a.type==='chooseSelfFront'&&Number.isInteger(a.slot));
 assert.equal(s.players[0].front.some(c=>c?.uid===mover.uid),true);
 assert.equal(live(s,mover.uid).ready,false);
});

test('outside-count bonuses stack, and sending one facedown outside draws',()=>{
 let s=main(5);
 const card=seat(s,'COUNT','front',0);
 for(let i=0;i<13;i++)s.players[0].outside.push(s.players[0].deck.pop());
 assert.equal(bpOf(s,card.uid),4000);
 assert.equal(universalAttackDamage(pack,s,live(s,card.uid)),2);
 assert.equal(universalImpact(pack,s,live(s,card.uid)),0);
 for(let i=0;i<13;i++)s.players[0].outside.push(s.players[0].deck.pop()||s.players[0].hand.pop());
 assert.equal(bpOf(s,card.uid),5000);
 assert.equal(universalImpact(pack,s,live(s,card.uid)),4);
 const host=seat(s,'SHINJI','energy',0);
 const buried=s.players[0].deck.pop();
 buried.faceDown=true;buried.ready=false;buried.stack=[];buried.under=[];buried.buffs=[];
 host.under=[buried];
 const hand=s.players[0].hand.length;
 s=act(s,a=>a.mode==='stripDraw');
 s=act(s,a=>a.uid===buried.uid);
 assert.equal(s.players[0].hand.length,hand+1);
 assertUniversalMatch(pack,s);
});

test('a named energy character can be readied once per name, and the other main rests for BP',()=>{
 let s=main(6);
 const source=seat(s,'WAKE','energy',0);
 source.ready=false;
 const shinji=seat(s,'SHINJI','energy',1);
 shinji.ready=false;
 const other=seat(s,'WILLE','front',0);
 s=act(s,a=>a.mode==='wakeNamed'&&a.targetUid===shinji.uid);
 assert.equal(live(s,shinji.uid).ready,true);
 assert.equal(live(s,source.uid).ready,true);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='wakeNamed'),false);
 live(s,source.uid).ready=true;
 s=act(s,a=>a.mode==='selfRestBuff'&&a.uid===source.uid);
 s=act(s,a=>a.uid===other.uid);
 assert.equal(bpOf(s,other.uid),3500);
 assert.equal(live(s,source.uid).ready,false);
});

test('reducing an opponent to 0 BP tucks the deck top before that character leaves',()=>{
 let s=main(7);
 const card=seat(s,'DOWN','front',0);
 const foe=seat(s,'FOE','front',0,1);
 const top=pull(s,'PLAIN');
 s.players[0].deck.unshift(top);
 s=act(s,a=>a.mode==='frontDownTuck');
 s=act(s,a=>a.uid===foe.uid);
 assert.equal(live(s,card.uid).under.some(c=>c.uid===top.uid&&c.faceDown),true);
 assert.equal(s.players[1].front[0],null);
});

test('an entry-turn trait grant draws when that character attacks unblocked',()=>{
 let s=main(8);
 const source=seat(s,'GRANT','front',0);
 const ally=seat(s,'WILLE','front',1);
 s=act(s,a=>a.mode==='entryDraw');
 s=act(s,a=>a.uid===ally.uid);
 assert.equal(s.mainAbilityUsedUids.includes(source.uid),true);
 s.phase='attack';
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:ally.uid});
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 assert.equal(s.pending?.kind,'effect-may-draw');
 s=act(s,a=>a.type==='chooseMayDraw'&&a.mode==='draw');
 assert.equal(s.players[0].hand.length,hand+1);
 assertUniversalMatch(pack,s);
});

test('a clear field tucks its deck, and retiring it may recover a character then ready an AP',()=>{
 let s=main(9);
 const top=[s.players[0].deck.pop(),s.players[0].deck.pop()];
 s.players[0].deck.unshift(...top);
 seat(s,'SHINJI','energy',1);
 s.players[0].hand.push(pull(s,'FIELD'));
 const played=s.players[0].hand.at(-1);
 s=dispatchUniversalAction(pack,s,{type:'play',uid:played.uid,line:'energy',slot:0});
 const field=s.players[0].energy.find(c=>c?.cardId==='FIELD');
 assert.equal(field.under.filter(c=>c.faceDown).length,2);
 for(const c of field.under){c.faceDown=false;s.players[0].deck.push(c);}
 field.under=[];
 field.ready=true;
 const rei=pull(s,'REI');
 s.players[0].outside.push(rei);
 s.players[0].hand.push(s.players[0].deck.pop());
 const paid=s.players[0].hand.at(-1).uid;
 s.players[0].apCards[0].ready=false;
 s=act(s,a=>a.mode==='clearUnder');
 assert.equal(s.pending.kind,'effect-recover-any');
 s=act(s,a=>a.uid===rei.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===rei.uid),true);
 assert.equal(s.pending.kind,'effect-may-hand-ap');
 s=act(s,a=>a.uid===paid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=act(s,a=>a.uid===s.players[0].apCards[0].uid);
 assert.equal(s.players[0].apCards[0].ready,true);
});

test('retiring the front character discounts the next matching hand play',()=>{
 let s=main(10);
 for(const ap of s.players[0].apCards)ap.ready=false;
 seat(s,'PLAIN','energy',0);
 const card=seat(s,'ZERO','front',0);
 const foe=seat(s,'FOE','front',0,1);
 const hand=s.players[0].hand.length;
 s=act(s,a=>a.mode==='retireGrant'&&a.uid===card.uid);
 assert.equal(s.players[0].hand.length,hand+2);
 assert.equal(s.pending.kind,'effect-retire-one-front');
 s=act(s,a=>a.uid===foe.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),true);
 const unit=pull(s,'UNIT');
 const purple=pull(s,'SHINJI');
 s.players[0].hand.push(unit,purple);
 const legal=()=>legalUniversalActions(pack,s);
 assert.equal(legal().some(a=>a.type==='play'&&a.uid===unit.uid),true);
 assert.equal(legal().some(a=>a.type==='play'&&a.uid===purple.uid),true);
 s=dispatchUniversalAction(pack,s,legal().find(a=>a.type==='play'&&a.uid===unit.uid));
 assert.equal(s.players[0].nextNameOrIncludesCut,null);
 assert.equal(legal().some(a=>a.type==='play'&&a.uid===purple.uid),false);
 assert.equal(s.players[0].energy.some(c=>c?.uid===unit.uid)||s.players[0].front.some(c=>c?.uid===unit.uid),true);
});

test('attack damage 2 offers a triggerless payment at that attack end',()=>{
 let s=main(11);
 const card=seat(s,'BEAST','front',0);
 seat(s,'FOE','front',0,1);
 const blanks=[s.players[0].deck.pop(),s.players[0].deck.pop()];
 const trigger=pull(s,'TRIG');
 s.players[0].hand.push(...blanks,trigger);
 s.phase='attack';
 assert.equal(universalAttackDamage(pack,s,card),2);
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:card.uid});
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 let guard=0;
 while(s.pending?.kind!=='effect-triggerless-pair'&&guard<8){
  if(!s.pending)break;
  const legal=legalUniversalActions(pack,s);
  const skip=legal.find(a=>a.uid===null);
  if(s.pending.kind==='effect-triggerless-pair')break;
  s=dispatchUniversalAction(pack,s,skip||legal[0]);
  guard++;
 }
 assert.equal(s.pending.kind,'effect-triggerless-pair');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===trigger.uid),false);
 s=act(s,a=>a.uid===blanks[0].uid);
 s=act(s,a=>a.uid===blanks[1].uid);
 assert.equal(live(s,card.uid).ready,true);
 assert.equal(bpOf(s,card.uid),6000);
});

test('the event needs the printed name or a name fragment, then tucks a named outside card',()=>{
 let s=main(12);
 s.players[0].hand.push(pull(s,'COME'));
 const event=s.players[0].hand.at(-1);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===event.uid),false);
 seat(s,'UNIT','energy',0);
 const shinji=seat(s,'SHINJI','front',0);
 const rei=pull(s,'REI');
 s.players[0].outside.push(rei);
 const foe=seat(s,'FOE','front',0,1);
 s=dispatchUniversalAction(pack,s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 s=act(s,a=>a.uid===foe.uid);
 assert.equal(s.pending.kind,'effect-tuck-outside-host');
 s=act(s,a=>a.uid===rei.uid&&a.hostUid===shinji.uid);
 assert.equal(live(s,shinji.uid).under.some(c=>c.uid===rei.uid&&c.faceDown),true);
 assertUniversalMatch(pack,s);
});
