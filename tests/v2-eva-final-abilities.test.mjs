// The last eight EVA prints. Probes use the shared abilities, not a private engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalImpact,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

function face(extra){
 const printed=extra.effects||extra.mainAbility||extra.fieldLeaveThenDeploy||
  extra.getInsteadRestDeploy||extra.triggerSwapToGet||extra.raidTopRetireInstead||
  extra.facedownCountGrants||extra.triggerEffect||extra.printedImpact||extra.phaseEffects;
 const card={
  id:extra.id,name:extra.name||extra.id,color:extra.color||'purple',type:extra.type||'character',
  energy:extra.energy??1,ap:extra.ap??1,bp:extra.bp??3000,gen:extra.gen??1,
  traits:extra.traits||[],trigger:extra.trigger===undefined?null:extra.trigger,
  effects:extra.effects||{},...extra
 };
 card.implementation=extra.implementation||(printed?'dsl':'vanilla');
 return card;
}
const probes=[
 face({id:'LEAVE',color:'yellow',bp:1000,fieldLeaveThenDeploy:{color:'yellow',name:'綾波 レイ',maxEnergy:2,ready:true}}),
 face({id:'REI',name:'綾波 レイ',color:'yellow',energy:2}),
 face({id:'REIHI',name:'綾波 レイ',color:'red',energy:3}),
 face({id:'RED2',name:'綾波 レイ',color:'red',energy:2}),
 face({id:'GETTER',name:'ミサト',getInsteadRestDeploy:{once:'name'}}),
 face({id:'PAY',name:'支付',color:'yellow',trigger:'get'}),
 face({id:'SWAP',triggerSwapToGet:{turn:'opp',line:'front',from:['draw','active']}}),
 face({id:'DRAW',trigger:'draw'}),
 face({id:'ASUKA',color:'yellow',effects:{onPlay:[
  {op:'activeSelf'},
  {op:'chooseOne',optional:false,options:[
   {id:'rest',label:'使對方前線最多 1 張角色休息',turn:'any',then:[{op:'restOppFrontOne',optional:true}]},
   {id:'retire',label:'退場自己 1 張，再退場對方並減少下次費用',turn:'own',then:[
    {op:'optionalOwnRetireFrontDiscount',then:[
     {op:'retireOppFrontOneUnderBp',bp:5000,optional:true},
     {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',color:'yellow',printedRequiredEnergyAtMost:2}}
    ]}
   ]}
  ]}
 ]},mainAbility:{op:'payHandSelfKit',hand:2,oncePerTurn:true,bp:1000,impact:1}}),
 face({id:'MARI',name:'真希波・マリ・イラストリアス',effects:{onAttack:[{
  op:'optionalPayApThen',ap:1,optional:true,then:[
   {op:'draw',count:1},
   {op:'activeOwnExceptName',name:'真希波・マリ・イラストリアス',optional:true,max:1}
  ]
 }]}}),
 face({id:'SPEAR',raidName:'碇 シンジ',printedImpact:1,effects:{onPlay:[
  {op:'draw',count:1},
  {op:'deployOwnHandActiveNoRaid',type:'character',color:'purple',ap:1,optional:true}
 ]},mainAbility:{op:'retireOtherFrontReplay',oncePerTurn:true,frontOnly:true}}),
 face({id:'NORAID',color:'purple',ap:1,energy:4}),
 face({id:'RAIDTOP',raidName:'式波・アスカ・ラングレー',raidTopRetireInstead:true,
  effects:{onPlay:[{op:'enemyBpDown',bp:1000,optional:true}]}}),
 face({id:'BASE',name:'式波・アスカ・ラングレー'}),
 face({id:'SHINJI',name:'碇 シンジ'}),
 face({id:'NEW2',raidName:'式波・アスカ・ラングレー',traits:['WILLE'],effects:{onPlay:[
  {op:'grantDoubleAttackIfOppBelowPrinted',min:2}
 ]},phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
  {op:'optionalRemoveTraitKit',trait:'WILLE',count:4,bp:3000,blockAtMost:3000,sendBase:true}
 ]}]}),
 face({id:'WILLE',name:'維勒',traits:['WILLE']}),
 face({id:'ZERO',raidName:'碇 シンジ',facedownCountGrants:[{count:0,turn:'own',bp:5000,impact:3}],
  facedownTriggerImmuneAt:4,phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
   {op:'revealFacedownUpTo',count:2,activateIf:2}
  ]}],effects:{onPlay:[{op:'tuckOutsideNamedPerEnergy',color:'red',name:'綾波 レイ'}]}}),
 face({id:'YEL',name:'黃二',color:'yellow',energy:1,ap:1}),
 face({id:'GEN',name:'黃源',color:'yellow'}),
 face({id:'BOUNCE',effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:9}]}}),
 face({id:'DOWN',effects:{onPlay:[{op:'enemyBpDown',bp:1000,optional:false}]}}),
 face({id:'RETIRE',effects:{onPlay:[{op:'retireOwnCharacterOne',optional:true,after:[{op:'draw',count:1}]}]}}),
 face({id:'SPECIAL',trigger:'special',triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'draw',count:1}]}}),
 ...Array.from({length:6},(_,i)=>face({id:'FILL-'+i,implementation:'vanilla'}))
];
const pack=createUniversalPack({id:'probe',version:'eva-final',cards:probes});
function deck(){
 const spec={};
 for(const card of probes)if(!card.id.startsWith('FILL-')&&card.id!=='WILLE')spec[card.id]=1;
 spec.WILLE=4;
 for(let i=0;i<6;i++)spec['FILL-'+i]=4;
 spec['FILL-5']=3;
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
function fuel(s,player=0,slot=3){
 if(s.players[player].energy[slot])return;
 return seat(s,'FILL-4','energy',slot,player);
}
function bury(s,host,player=0){
 const c=s.players[player].deck.pop();
 c.faceDown=true;c.ready=false;c.stack=[];c.under=[];c.buffs=[];
 host.under??=[];
 host.under.push(c);
 return c;
}

test('leaving by an effect can discard one card and deploy a cheap active Rei',()=>{
 let s=main(1);
 const leave=seat(s,'LEAVE','front',0);
 const rei=pull(s,'REI');
 s.players[0].outside.push(rei);
 fuel(s);
 const bounce=pull(s,'BOUNCE');
 s.players[0].hand.push(bounce);
 const before=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,{type:'play',uid:bounce.uid,line:'energy',slot:0});
 if(s.pending?.kind==='effect-bounce-own')s=act(s,a=>a.uid===leave.uid);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.pending?.kind,'effect-field-leave-deploy');
 const discarded=s.players[0].hand.find(c=>c.uid!==bounce.uid);
 s=act(s,a=>a.mode==='discard'&&a.uid===discarded.uid);
 assert.equal(s.pending.step,'deploy');
 s=act(s,a=>a.mode==='deploy'&&a.uid===rei.uid);
 const entered=live(s,rei.uid);
 assert.equal(entered.ready,true);
 assert.ok(s.players[0].hand.some(c=>c.uid===leave.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a rule retirement does not offer the field-leave deploy',()=>{
 let s=main(2);
 const leave=seat(s,'LEAVE','front',0,1);
 leave.bp=1000;
 fuel(s);
 const down=pull(s,'DOWN');
 s.players[0].hand.push(down);
 s=dispatchUniversalAction(pack,s,{type:'play',uid:down.uid,line:'energy',slot:0});
 if(s.pending)s=act(s,a=>a.uid===leave.uid);
 assert.equal(s.players[1].front[0],null);
 assert.notEqual(s.pending?.kind,'effect-field-leave-deploy');
 assert.equal(s.players[1].outside.some(c=>c.uid===leave.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('on the opponent turn a payable GET may enter rested, then discards one hand card',()=>{
 let s=main(3);
 seat(s,'GETTER','front',0,1);
 seat(s,'GEN','energy',0,1);
 const pay=pull(s,'PAY',1);
 s.players[1].life.unshift(pay);
 const hitter=seat(s,'FILL-0','front',0);
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 const deploy=legalUniversalActions(pack,s).find(a=>a.mode==='getDeploy');
 assert.ok(deploy);
 const ordinary=dispatchUniversalAction(pack,structuredClone(s),{type:'chooseTrigger',mode:'get'});
 assert.equal(ordinary.onceEffectUses[1].includes('ミサト|getInstead'),false);
 assert.ok(ordinary.players[1].hand.some(c=>c.uid===pay.uid));
 s=dispatchUniversalAction(pack,s,deploy);
 const entered=s.players[1].front.find(c=>c?.uid===pay.uid)||s.players[1].energy.find(c=>c?.uid===pay.uid);
 assert.equal(entered.ready,false);
 assert.equal(s.pending.kind,'effect-discard-one');
 assert.equal(s.onceEffectUses[1].includes('ミサト|getInstead'),true);
 s=act(s,a=>a.type==='chooseDiscardOne');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a front character can turn its controller draw trigger into a GET on the opponent turn',()=>{
 let s=main(4);
 seat(s,'SWAP','front',0,1);
 const drawn=pull(s,'DRAW',1);
 s.players[1].life.unshift(drawn);
 const deck=s.players[1].deck.length;
 const hitter=seat(s,'FILL-0','front',0);
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 assert.ok(legalUniversalActions(pack,s).some(a=>a.mode==='swapGet'));
 s=act(s,a=>a.mode==='swapGet');
 assert.ok(s.players[1].hand.some(c=>c.uid===drawn.uid));
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('the entry choice rests an opponent or retires an ally and discounts the next yellow play',()=>{
 let s=main(5);
 const foe=seat(s,'FILL-0','front',0,1);
 foe.ready=true;
 const ally=seat(s,'FILL-1','front',1);
 seat(s,'GEN','energy',0);
 const asuka=pull(s,'ASUKA');
 s.players[0].hand.push(asuka);
 s=dispatchUniversalAction(pack,s,{type:'play',uid:asuka.uid,line:'front',slot:0});
 assert.equal(live(s,asuka.uid).ready,true);
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=act(s,a=>a.mode==='rest');
 if(s.pending)s=act(s,a=>a.uid===foe.uid);
 assert.equal(live(s,foe.uid).ready,false);
 const again=main(6);
 const other=seat(again,'FILL-1','front',1);
 const victim=seat(again,'FILL-0','front',0,1);
 seat(again,'GEN','energy',0);
 const card=pull(again,'ASUKA');
 again.players[0].hand.push(card);
 let played=dispatchUniversalAction(pack,again,{type:'play',uid:card.uid,line:'front',slot:0});
 played=act(played,a=>a.mode==='retire');
 played=act(played,a=>a.uid===other.uid);
 if(played.pending)played=act(played,a=>a.uid===victim.uid||a.uid===null);
 for(const ap of played.players[0].apCards)ap.ready=false;
 const yellow=pull(played,'YEL');
 played.players[0].hand.push(yellow);
 if(!played.players[0].energy[0])seat(played,'GEN','energy',0);
 const legal=legalUniversalActions(pack,played);
 assert.ok(legal.some(a=>a.type==='play'&&a.uid===yellow.uid));
 assert.equal(assertUniversalMatch(pack,played),true);
});

test('paying two hand cards grants BP and impact, and an attack can ready another name',()=>{
 let s=main(7);
 const asuka=seat(s,'ASUKA','front',0);
 const first=s.players[0].hand[0],second=s.players[0].hand[1];
 s=act(s,a=>a.mode==='payHandKit'&&a.uid===asuka.uid);
 s=act(s,a=>a.uid===first.uid);
 s=act(s,a=>a.uid===second.uid);
 assert.equal(bpOf(s,asuka.uid),4000);
 assert.equal(universalImpact(pack,s,live(s,asuka.uid)),1);
 const mari=seat(s,'MARI','front',1);
 const other=seat(s,'FILL-0','energy',0);
 other.ready=false;
 const deck=s.players[0].deck.length;
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:mari.uid});
 s=act(s,a=>a.type==='choosePayAp'||a.mode==='pay');
 if(s.pending?.kind==='effect-active-name-except'){
  const names=legalUniversalActions(pack,s).map(a=>a.uid);
  assert.equal(names.includes(mari.uid),false);
  s=act(s,a=>a.uid===other.uid);
 }
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(live(s,other.uid).ready,true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a purple no-raid hand character enters active, and retiring another front replays the entry',()=>{
 let s=main(8);
 const shinji=seat(s,'SHINJI','front',1);
 fuel(s);
 const spear=pull(s,'SPEAR');
 const purple=pull(s,'NORAID');
 s.players[0].hand.push(spear,purple);
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='raid'&&a.uid===spear.uid&&a.baseUid===shinji.uid);
 if(s.pending?.kind==='effect-hand-active-noraid')s=act(s,a=>a.uid===purple.uid);
 assert.equal(live(s,purple.uid).ready,true);
 assert.equal(s.players[0].deck.length,deck-1);
 const top=live(s,spear.uid);
 s.phase='main';
 s=act(s,a=>a.mode==='retireReplay'&&a.uid===top.uid);
 const other=s.players[0].front.find(c=>c&&c.uid!==top.uid);
 s=act(s,a=>a.uid===other.uid);
 assert.equal(s.players[0].deck.length<=deck-2,true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a raid top may be put outside instead of retiring the whole character',()=>{
 let s=main(9);
 const base=seat(s,'BASE','front',0);
 const top=pull(s,'RAIDTOP');
 top.ready=true;
 top.fieldEntryStamp=s.nextFieldEntryStamp++;
 top.stack=[base];
 s.players[0].front[0]=top;
 fuel(s);
 const retire=pull(s,'RETIRE');
 s.players[0].hand.push(retire);
 s=dispatchUniversalAction(pack,s,{type:'play',uid:retire.uid,line:'energy',slot:0});
 s=act(s,a=>a.uid===top.uid);
 assert.equal(s.pending.kind,'effect-raid-top-instead');
 s=act(s,a=>a.mode==='strip');
 assert.equal(s.players[0].front[0].uid,base.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('four WILLE cards at attack end ready the raider, raise BP, and send the base outside',()=>{
 let s=main(10);
 for(let slot=0;slot<2;slot++){
  const foe=seat(s,'FILL-'+slot,'front',slot,1);
  foe.buffs=[{bp:-1000,untilTurn:s.turn}];
 }
 const base=seat(s,'BASE','front',0);
 fuel(s);
 const card=pull(s,'NEW2');
 s.players[0].hand.push(card);
 s=act(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===base.uid);
 const raider=live(s,card.uid);
 assert.equal(raider.readyOnAttackGranted.turn,s.turn);
 for(let i=0;i<4;i++)s.players[0].outside.push(pull(s,'WILLE'));
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:raider.uid});
 assert.equal(live(s,raider.uid).ready,true);
 let guard=0;
 while(s.pending?.kind!=='effect-remove-trait-kit'&&guard<12){
  const legal=legalUniversalActions(pack,s);
  const skip=legal.find(a=>a.uid===null||a.mode==='skip'||a.mode==='decline');
  s=dispatchUniversalAction(pack,s,skip||legal[0]);
  guard++;
 }
 assert.equal(s.pending.kind,'effect-remove-trait-kit');
 while(s.pending?.kind==='effect-remove-trait-kit')s=act(s,a=>a.mode==='pick');
 assert.equal(live(s,raider.uid).ready,true);
 assert.equal(bpOf(s,raider.uid),6000);
 assert.equal(s.players[0].outside.some(c=>c.uid===base.uid),true);
 assert.equal(s.players[0].removed.filter(c=>c.cardId==='WILLE').length,4);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('zero facedown cards grant own-turn BP and impact, and four hide the character from an opponent trigger',()=>{
 let s=main(11);
 const card=seat(s,'ZERO','front',0);
 assert.equal(bpOf(s,card.uid),8000);
 assert.equal(universalImpact(pack,s,card),3);
 s.active=1;
 assert.equal(bpOf(s,card.uid),3000);
 s.active=0;
 const under=[];
 for(let i=0;i<4;i++)under.push(bury(s,card));
 const special=pull(s,'SPECIAL',1);
 s.players[1].life.unshift(special);
 const other=seat(s,'FILL-0','front',1);
 const hitter=seat(s,'FILL-1','front',2);
 s.phase='attack';
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='block')s=act(s,a=>a.uid===null);
 const targets=legalUniversalActions(pack,s).map(a=>a.uid);
 assert.equal(targets.includes(card.uid),false);
 assert.equal(targets.includes(other.uid),true);
 s=act(s,a=>a.uid===other.uid);
 const fresh=main(12);
 const shinji=seat(fresh,'SHINJI','front',1);
 const low=pull(fresh,'RED2');
 const high=pull(fresh,'REIHI');
 fresh.players[0].outside.push(low,high);
 fuel(fresh);
 const zero=pull(fresh,'ZERO');
 fresh.players[0].hand.push(zero);
 let played=act(fresh,a=>a.type==='raid'&&a.uid===zero.uid&&a.baseUid===shinji.uid);
 const energies=new Set();
 while(played.pending?.kind==='effect-tuck-per-energy'){
  const choice=legalUniversalActions(pack,played).find(a=>a.uid);
  const physical=played.players[0].outside.find(c=>c.uid===choice.uid);
  energies.add(pack.cards[physical.cardId].energy);
  played=dispatchUniversalAction(pack,played,choice);
 }
 assert.equal(energies.size,2);
 assert.equal(live(played,zero.uid).under.length,2);
 const looked=live(played,zero.uid).under.slice(0,2);
 played.phase='attack';
 played=dispatchUniversalAction(pack,played,{type:'attack',uid:zero.uid});
 let steps=0;
 while(played.pending?.kind!=='effect-facedown-up-to'&&steps<12){
  const legal=legalUniversalActions(pack,played);
  const skip=legal.find(a=>a.uid===null||a.mode==='skip');
  played=dispatchUniversalAction(pack,played,skip||legal[0]);
  steps++;
 }
 assert.equal(played.pending.kind,'effect-facedown-up-to');
 played=act(played,a=>a.mode==='take'&&a.uid===looked[0].uid);
 played=act(played,a=>a.mode==='take'&&a.uid===looked[1].uid);
 assert.equal(played.players[0].hand.filter(c=>looked.some(x=>x.uid===c.uid)).length,2);
 assert.equal(live(played,zero.uid).ready,true);
 assert.equal(assertUniversalMatch(pack,played),true);
});
