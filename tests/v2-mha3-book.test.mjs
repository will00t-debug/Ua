import test from 'node:test';
import assert from 'node:assert/strict';
import {UA05NC_MHA3_CARDS} from '../dist/mha/ua05nc-cards.mjs';
import {UA05NC_MHA3_PROGRAMS} from '../dist/universal-v2/mha/programs-ua05nc.mjs';
import {createMha3Pack} from '../dist/universal-v2/mha3-pack.mjs';
import {mhaBattleCard} from '../dist/universal-v2/mha-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalImpact} from '../dist/universal-v2/engine.mjs';

const book=createMha3Pack();
const shigaraki=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-002');

function filler(id, extra={}){
 return {id, name:id, color:'purple', type:'character', energy:0, ap:1, bp:1000,
  gen:1, trigger:null, traits:[], implementation:'vanilla', ...extra};
}
function labPack(card){
 const cards=[card];
 cards.push(filler('LAB-BASE',{name:'死柄木 弔', bp:2000}));
 cards.push(filler('LAB-1500',{bp:1500}));
 cards.push(filler('LAB-2000',{bp:2000}));
 cards.push(filler('LAB-1000',{bp:1000}));
 cards.push(filler('LAB-GEN',{gen:1}));
 cards.push(filler('LAB-Y',{color:'yellow', gen:1}));
 cards.push(filler('LAB-OTHER',{name:'敵', bp:2500}));
 cards.push(filler('LAB-A',{traits:['A組'], bp:2000}));
 cards.push(filler('LAB-DEKU',{name:'緑谷 出久', bp:1000}));
 cards.push(filler('LAB-TRAIT',{traits:['敵'], bp:2000}));
 cards.push(filler('LAB-3000',{bp:3000}));
 cards.push(filler('LAB-COPY',{implementation:'dsl', effects:{},
  mainAbility:{op:'gainSameLineMains', oncePerTurn:true, excludeNames:[]}}));
 for(let i=0;i<5;i++)cards.push(filler('LAB-F'+i));
 return createUniversalPack({id:'mha3-lab', version:'lab', cards});
}
function deck(extraId){
 const counts={'LAB-BASE':4,'LAB-1500':4,'LAB-2000':4,'LAB-1000':4,
  'LAB-GEN':4,'LAB-Y':4,'LAB-OTHER':4,'LAB-A':2,'LAB-DEKU':2,'LAB-TRAIT':2,
  'LAB-3000':2,'LAB-COPY':2};
 for(let i=0;i<5;i++)counts['LAB-F'+i]=2;
 counts[extraId]=2;
 return counts;
}
function match(pack, id, seed){
 const counts=deck(id);
 return newUniversalMatch([pack,pack],{decks:[counts,counts], seed, first:0, openingMulligan:false});
}
function act(pack, s, action){
 const next=dispatchUniversalAction([pack,pack], s, action);
 assert.equal(assertUniversalMatch([pack,pack], next), true);
 return next;
}
function legal(pack, s){return legalUniversalActions([pack,pack], s);}
function take(s, p, id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s, p, id, line, slot, ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toPhase(pack, s, phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=act(pack, s, {type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function untilActive(pack, s, player, phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=act(pack, s, {type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function live(s, p, uid){
 return [...s.players[p].front, ...s.players[p].energy].find(c=>c?.uid===uid)||null;
}

test('the book pack holds the five finished cards', ()=>{
 assert.deepEqual(UA05NC_MHA3_CARDS.map(card=>card.number),[
  'UA05NC/MHA-3-001','UA05NC/MHA-3-002','UA05NC/MHA-3-003',
  'UA05NC/MHA-3-004','UA05NC/MHA-3-006','UA05NC/MHA-3-009'
 ]);
 assert.equal(shigaraki.color,'purple');
 assert.equal(shigaraki.energy,4);
 assert.equal(shigaraki.ap,1);
 assert.equal(shigaraki.bp,4000);
 assert.equal(shigaraki.gen,1);
 assert.equal(shigaraki.trigger,'raid');
 assert.equal(UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-009').energyDiscount,null);
 assert.equal(book.version,'mha3-ua05nc-ready-5');
 assert.deepEqual(Object.keys(book.cards),[
  'MHA-3-001','MHA-3-002','MHA-3-003','MHA-3-004','MHA-3-006'
 ]);
 assert.equal(book.cards['MHA-3-002'].battleRemoveInstead,true);
 assert.equal(book.cards['MHA-3-002'].printedImpact,1);
 assert.equal(book.cards['MHA-3-002'].raidName,'死柄木 弔');
 assert.equal(createMhaV2Pack().cards['MHA-3-002'],undefined);
 assert.equal(createMha2Pack().cards['MHA-3-002'],undefined);
 for(const id of ['MHA-3-001','MHA-3-002','MHA-3-003','MHA-3-004','MHA-3-006'])
  assert.equal(UA05NC_MHA3_PROGRAMS[id].ready,true);
 assert.equal(UA05NC_MHA3_PROGRAMS['MHA-3-009'].ready,false);
 assert.equal(UA05NC_MHA3_PROGRAMS['MHA-3-009'].effects.onAttack[0].op,
  'drawBottomSkipNextActive');
});

test('002 lowers up to two fronts of BP 1500 or more, once, and only from the front', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',2);
 const actor=put(s,0,'MHA-3-002','front',0,true);
 const low=put(s,1,'LAB-1000','front',0,true);
 const mid=put(s,1,'LAB-1500','front',1,true);
 const high=put(s,1,'LAB-2000','front',2,true);
 const rear=put(s,1,'LAB-2000','energy',0,true);
 s=toPhase(pack,s,'main');
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),true);
 let energy=match(pack,'MHA-3-002',3);
 const back=put(energy,0,'MHA-3-002','energy',0,true);
 put(energy,1,'LAB-2000','front',0,true);
 energy=toPhase(pack,energy,'main');
 assert.equal(legal(pack,energy).some(a=>a.type==='activate'&&a.uid===back.uid),false);

 let none=match(pack,'MHA-3-002',4);
 const waiting=put(none,0,'MHA-3-002','front',0,true);
 put(none,1,'LAB-1000','front',0,true);
 none=toPhase(pack,none,'main');
 assert.equal(legal(pack,none).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);

 s=act(pack,s,legal(pack,s).find(a=>a.type==='activate'&&a.uid===actor.uid));
 assert.equal(s.pending.kind,'effect-target-many');
 assert.equal(s.pending.maxTargets,2);
 const choices=legal(pack,s).filter(a=>a.type==='chooseTargetMany');
 assert.equal(choices.some(a=>a.uid===low.uid),false);
 assert.equal(choices.some(a=>a.uid===rear.uid),false);
 assert.equal(choices.some(a=>a.uid===mid.uid),true);
 assert.equal(choices.some(a=>a.uid===high.uid),true);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.throws(()=>act(pack,s,{type:'chooseTargetMany',uid:low.uid}),/not currently legal|Illegal/);
 s=act(pack,s,{type:'chooseTargetMany',uid:mid.uid});
 s=act(pack,s,{type:'chooseTargetMany',uid:null});
 assert.equal(universalBp(pack,s,live(s,1,mid.uid)),500);
 assert.equal(universalBp(pack,s,live(s,1,high.uid)),2000);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
});

test('002 sends an opponent who loses on its turn to removed and still hits with impact', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',5);
 const winner=put(s,0,'MHA-3-002','front',0,true);
 const blocker=put(s,1,'LAB-1500','front',0,true);
 const life=s.players[1].life.length;
 s=toPhase(pack,s,'attack');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===winner.uid));
 s=act(pack,s,legal(pack,s).find(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 assert.equal(s.players[1].removed.some(c=>c.uid===blocker.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===blocker.uid),false);
 assert.equal(universalImpact(pack,s,winner),1);
 if(s.pending){
  assert.equal(s.players[1].life.length<life||s.pending.kind==='life-trigger'||s.pending.kind==='attack-life-target',true);
 }else{
  assert.equal(s.players[1].life.length,life-1);
 }
});

test('002 does not remove a character who loses on the opponent turn', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',6);
 const body=put(s,0,'MHA-3-002','front',0,true);
 s=untilActive(pack,s,1,'main');
 const attacker=put(s,1,'LAB-1000','front',0,true);
 attacker.ready=true;
 s=toPhase(pack,s,'attack');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===attacker.uid));
 s=act(pack,s,legal(pack,s).find(a=>a.type==='chooseBlock'&&a.uid===body.uid));
 assert.equal(live(s,1,attacker.uid)?.cardId,'LAB-1000');
 assert.equal(s.players[1].removed.some(c=>c.uid===attacker.uid),false);
 assert.equal(s.players[1].outside.some(c=>c.uid===attacker.uid),false);
 assert.equal(live(s,0,body.uid)?.cardId,'MHA-3-002');
});

test('002 raids only a Shigaraki', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',7);
 for(let slot=0;slot<4;slot++)put(s,0,'LAB-GEN','energy',slot,true);
 const base=put(s,0,'LAB-BASE','front',0,false);
 const wrong=put(s,0,'LAB-OTHER','front',1,false);
 const raider=take(s,0,'MHA-3-002');
 s.players[0].hand.push(raider);
 s=toPhase(pack,s,'main');
 const raids=legal(pack,s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid),true);
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 s=act(pack,s,raids.find(a=>a.baseUid===base.uid));
 const top=s.players[0].front.find(c=>c?.cardId==='MHA-3-002');
 assert.equal(top.stack[0].cardId,'LAB-BASE');
});

test('001 draws two when it enters', ()=>{
 const printed=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-001');
 const card={
  id:printed.id, name:printed.nameJa, color:printed.color, type:'character',
  energy:printed.energy, ap:printed.ap, bp:printed.bp, gen:printed.gen,
  trigger:printed.trigger, traits:[...printed.traits], implementation:'dsl',
  effects:UA05NC_MHA3_PROGRAMS['MHA-3-001'].effects
 };
 const pack=labPack(card);
 let s=match(pack,'MHA-3-001',8);
 for(let slot=0;slot<3;slot++)put(s,0,'LAB-Y','energy',slot,true);
 const hand=take(s,0,'MHA-3-001');
 s.players[0].hand.push(hand);
 s.players[0].apCards.forEach((card,index)=>{
  if(index<2){card.inPlay=true;card.ready=true;}
 });
 const before=s.players[0].hand.length;
 const deckBefore=s.players[0].deck.length;
 s=toPhase(pack,s,'main');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front'));
 assert.equal(s.players[0].hand.length,before-1+2);
 assert.equal(s.players[0].deck.length,deckBefore-2);
 assert.equal(book.cards['MHA-3-001'].mainAbility.op,'cardOnceChoose');
});

test('009 gains 500 BP on its own turn only', ()=>{
 const printed=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-009');
 const card={
  id:printed.id, name:printed.nameJa, color:printed.color, type:'character',
  energy:printed.energy, ap:printed.ap, bp:printed.bp, gen:printed.gen,
  trigger:printed.trigger, traits:[], implementation:'dsl',
  ownTurnBp:UA05NC_MHA3_PROGRAMS['MHA-3-009'].ownTurnBp,
  effects:UA05NC_MHA3_PROGRAMS['MHA-3-009'].effects
 };
 const pack=labPack(card);
 let s=match(pack,'MHA-3-009',9);
 const body=put(s,0,'MHA-3-009','front',0,true);
 s=toPhase(pack,s,'main');
 assert.equal(universalBp(pack,s,live(s,0,body.uid)),3500);
 s=untilActive(pack,s,1,'main');
 assert.equal(universalBp(pack,s,live(s,0,body.uid)),3000);
 assert.equal(book.cards['MHA-3-009'],undefined);
 assert.equal(printed.energyDiscount,null);
});

function battle(id){
 return mhaBattleCard(UA05NC_MHA3_CARDS.find(card=>card.id===id), UA05NC_MHA3_PROGRAMS[id]);
}
function lower(card, amount, turn){
 card.buffs=[{bp:-amount, untilTurn:turn}];
}

test('001 chooses one other A組 buff or up to one Deku active, once', ()=>{
 const pack=labPack(battle('MHA-3-001'));
 let s=match(pack,'MHA-3-001',11);
 const actor=put(s,0,'MHA-3-001','energy',0,true);
 const ally=put(s,0,'LAB-A','front',0,true);
 const plain=put(s,0,'LAB-TRAIT','front',1,true);
 const deku=put(s,0,'LAB-DEKU','front',2,false);
 s=toPhase(pack,s,'main');
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='cardOnceChoose'),true);
 s=act(pack,s,{type:'activate',uid:actor.uid,mode:'cardOnceChoose'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['trait','active']);
 s=act(pack,s,{type:'chooseEffectMode',mode:'trait'});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(actor.uid),false);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 assert.equal(legal(pack,s).some(a=>a.uid===null),false);
 s=act(pack,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,live(s,0,ally.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,0,actor.uid)),2500);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 let again=match(pack,'MHA-3-001',12);
 const solo=put(again,0,'MHA-3-001','front',0,true);
 put(again,0,'LAB-TRAIT','front',1,true);
 const named=put(again,0,'LAB-DEKU','energy',0,false);
 again=toPhase(pack,again,'main');
 again=act(pack,again,{type:'activate',uid:solo.uid,mode:'cardOnceChoose'});
 assert.deepEqual(again.pending.options.map(o=>o.id),['active']);
 again=act(pack,again,{type:'chooseEffectMode',mode:'active'});
 assert.equal(again.pending.kind,'effect-active-own-named');
 assert.equal(legal(pack,again).some(a=>a.uid===null),true);
 again=act(pack,again,{type:'chooseActiveOwnNamed',uid:named.uid});
 assert.equal(live(again,0,named.uid).ready,true);
});

test('003 lowers one front that is at least 1500 and below its printed BP, once per name', ()=>{
 const pack=labPack(battle('MHA-3-003'));
 let s=match(pack,'MHA-3-003',13);
 const actor=put(s,0,'MHA-3-003','front',0,true);
 const copy=put(s,0,'MHA-3-003','energy',0,true);
 const exact=put(s,1,'LAB-2000','front',0,true);
 const short=put(s,1,'LAB-2000','front',1,true);
 const legalOne=put(s,1,'LAB-3000','front',2,true);
 const rear=put(s,1,'LAB-3000','energy',0,true);
 lower(short,1000,s.turn);
 lower(legalOne,1000,s.turn);
 lower(rear,1000,s.turn);
 s=toPhase(pack,s,'main');
 assert.equal(universalBp(pack,s,live(s,1,short.uid)),1000);
 assert.equal(universalBp(pack,s,live(s,1,legalOne.uid)),2000);
 s=act(pack,s,{type:'activate',uid:actor.uid,mode:'nameShared'});
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,false);
 assert.equal(s.pending.choices.includes(exact.uid),false);
 assert.equal(s.pending.choices.includes(short.uid),false);
 assert.equal(s.pending.choices.includes(legalOne.uid),true);
 assert.equal(s.pending.choices.includes(rear.uid),false);
 s=act(pack,s,{type:'chooseTarget',uid:legalOne.uid});
 assert.equal(universalBp(pack,s,live(s,1,legalOne.uid)),1000);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 let gained=match(pack,'MHA-3-003',14);
 const source=put(gained,0,'MHA-3-003','front',0,true);
 const host=put(gained,0,'LAB-COPY','front',1,true);
 const victim=put(gained,1,'LAB-3000','front',0,true);
 lower(victim,1000,gained.turn);
 gained=toPhase(pack,gained,'main');
 gained=act(pack,gained,{type:'activate',uid:host.uid,mode:'gainLineMains'});
 const copied=legal(pack,gained).find(a=>a.type==='activate'&&a.uid===host.uid&&a.mode==='nameShared');
 assert.equal(copied.gained,source.uid);
 gained=act(pack,gained,copied);
 gained=act(pack,gained,{type:'chooseTarget',uid:victim.uid});
 assert.equal(universalBp(pack,gained,live(gained,1,victim.uid)),1000);
 assert.equal(legal(pack,gained).some(a=>a.type==='activate'&&a.uid===source.uid),false);
});

test('004 rests, requires a reduced opponent, and grants one traitless character an optional attack draw', ()=>{
 const pack=labPack(battle('MHA-3-004'));
 let closed=match(pack,'MHA-3-004',15);
 const waiting=put(closed,0,'MHA-3-004','front',0,true);
 put(closed,0,'LAB-1000','front',1,true);
 put(closed,1,'LAB-2000','front',0,true);
 closed=toPhase(pack,closed,'main');
 assert.equal(legal(pack,closed).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 let s=match(pack,'MHA-3-004',16);
 const actor=put(s,0,'MHA-3-004','front',0,true);
 const twin=put(s,0,'MHA-3-004','energy',1,true);
 const plain=put(s,0,'LAB-1000','front',1,true);
 const marked=put(s,0,'LAB-TRAIT','energy',0,true);
 const foe=put(s,1,'LAB-3000','energy',0,true);
 lower(foe,500,s.turn);
 s=toPhase(pack,s,'main');
 s=act(pack,s,{type:'activate',uid:actor.uid,mode:'nameShared'});
 assert.equal(live(s,0,actor.uid).ready,false);
 assert.equal(s.pending.kind,'effect-grant-attack');
 assert.equal(s.pending.choices.includes(plain.uid),true);
 assert.equal(s.pending.choices.includes(marked.uid),false);
 assert.equal(legal(pack,s).some(a=>a.uid===null),false);
 s=act(pack,s,{type:'chooseGrantAttack',uid:plain.uid});
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===twin.uid),false);
 s=toPhase(pack,s,'attack');
 const hand=s.players[0].hand.length;
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===plain.uid));
 assert.equal(s.pending.kind,'granted-attack-draw');
 assert.equal(legal(pack,s).some(a=>a.mode==='skip'),true);
 s=act(pack,s,{type:'chooseGrantedDraw',mode:'draw'});
 assert.equal(s.players[0].hand.length,hand+1);
});

test('006 rests when the opponent front has three characters, buffs another, and grants Deku conditional impact once', ()=>{
 const pack=labPack(battle('MHA-3-006'));
 let closed=match(pack,'MHA-3-006',17);
 const early=put(closed,0,'MHA-3-006','front',0,true);
 put(closed,1,'LAB-1000','front',0,true);
 put(closed,1,'LAB-1500','front',1,true);
 closed=toPhase(pack,closed,'main');
 assert.equal(legal(pack,closed).some(a=>a.type==='activate'&&a.uid===early.uid),false);
 let s=match(pack,'MHA-3-006',18);
 const actor=put(s,0,'MHA-3-006','front',0,true);
 const twin=put(s,0,'MHA-3-006','energy',0,true);
 const other=put(s,0,'LAB-1000','front',1,true);
 put(s,1,'LAB-1000','front',0,true);
 put(s,1,'LAB-1500','front',1,true);
 put(s,1,'LAB-2000','front',2,true);
 s=toPhase(pack,s,'main');
 s=act(pack,s,{type:'activate',uid:actor.uid,mode:'nameShared'});
 assert.equal(live(s,0,actor.uid).ready,false);
 assert.equal(s.pending.choices.includes(other.uid),true);
 assert.equal(s.pending.choices.includes(actor.uid),false);
 s=act(pack,s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,live(s,0,other.uid)),1500);
 assert.equal(live(s,0,other.uid).conditionalImpactGranted,undefined);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===twin.uid),false);
 let named=match(pack,'MHA-3-006',19);
 const dekuCard=put(named,0,'LAB-DEKU','front',0,true);
 const giver=put(named,0,'MHA-3-006','energy',0,true);
 put(named,1,'LAB-1000','front',0,true);
 put(named,1,'LAB-1500','front',1,true);
 put(named,1,'LAB-2000','front',2,true);
 named=toPhase(pack,named,'main');
 named=act(pack,named,{type:'activate',uid:giver.uid,mode:'nameShared'});
 named=act(pack,named,{type:'chooseOwnBuff',uid:dekuCard.uid});
 const granted=live(named,0,dekuCard.uid);
 assert.equal(universalBp(pack,named,granted),1500);
 assert.equal(universalImpact(pack,named,granted),0);
 granted.buffs.push({bp:4000, untilTurn:named.turn});
 assert.equal(universalBp(pack,named,live(named,0,dekuCard.uid)),5500);
 assert.equal(universalImpact(pack,named,live(named,0,dekuCard.uid)),1);
});

test('009 draws, puts one hand card on the bottom, and skips the next active', ()=>{
 const printed=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-009');
 const card={
  id:printed.id, name:printed.nameJa, color:printed.color, type:'character',
  energy:printed.energy, ap:printed.ap, bp:printed.bp, gen:printed.gen,
  trigger:printed.trigger, traits:[], implementation:'dsl',
  ownTurnBp:UA05NC_MHA3_PROGRAMS['MHA-3-009'].ownTurnBp,
  effects:UA05NC_MHA3_PROGRAMS['MHA-3-009'].effects
 };
 const pack=labPack(card);
 let s=match(pack,'MHA-3-009',20);
 const body=put(s,0,'MHA-3-009','front',0,true);
 const buried=take(s,0,'LAB-F0');
 s.players[0].hand.push(buried);
 const life=s.players[1].life;
 for(let i=0;i<life.length;i++){
  if(life[i].cardId!=='MHA-3-009')continue;
  const swap=s.players[1].deck.findIndex(c=>c.cardId!=='MHA-3-009');
  const [loud]=life.splice(i,1);
  const [quiet]=s.players[1].deck.splice(swap,1);
  life.splice(i,0,quiet);
  s.players[1].deck.push(loud);
 }
 s=toPhase(pack,s,'attack');
 const hand=s.players[0].hand.length;
 const deck=s.players[0].deck.length;
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===body.uid));
 assert.equal(s.pending.kind,'effect-hand-bottom');
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(legal(pack,s).some(a=>a.uid===null),false);
 s=act(pack,s,{type:'chooseHandBottom',uid:buried.uid});
 assert.equal(s.players[0].deck.at(-1).uid,buried.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===buried.uid),false);
 let guard=0;
 while(s.pending||s.active===0){
  if(s.pending?.kind==='block')s=act(pack,s,{type:'chooseBlock',uid:null});
  else if(s.pending)throw Error('Unexpected '+s.pending.kind);
  else s=act(pack,s,{type:'next'});
  if(++guard>8)throw Error('Attack did not finish');
 }
 const left=live(s,0,body.uid);
 assert.equal(left.ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===body.uid&&!e.consumed),false);
});
