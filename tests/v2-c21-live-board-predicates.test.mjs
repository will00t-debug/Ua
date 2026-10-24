import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages fetched 2026-10-24.
// BLC-1-003: 相手のフロントLのレストのキャラ1枚につき、BP+1000。
// Q535: a blocker who rests during the attack is included.
// COLOR rests one opposing front character and skips its next ACTIVE.
// BLC-1-019: 相手の場にBP4000以上のキャラが2枚以上なら BP+500. Current BP.
// BLC-2-062: 他の［特徴：護廷十三隊］が合計3枚以上なら発生エナジー+1. Fields count.
// BLC-4-038: 自分のフロントLに元々の消費APが2以上のキャラ. Q2319. Not own-turn-only.
// BLC-2-054: このターン中に自分の手札を場外に置いている. Not own-turn-only.
// The Chinese catalogue adds an own-turn limit on 038 and 054; the program follows Japanese.

const bleach=registeredV2TitlePack('bleach');
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const yellow=realDeck(['BLC-1-003','BLC-1-019','BLC-1-023','BLC-1-006','BLC-1-005'],'yellow');
const green=realDeck(['BLC-2-062','BLC-1-070','BLC-1-071','BLC-1-083','BLC-1-086','BLC-2-066','BLC-1-089','BLC-1-084','BLC-2-068'],'green');
const purple=realDeck(['BLC-2-054','BLC-1-109','BLC-1-054'],'purple');
const blue=realDeck(['BLC-4-038'],'blue');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function main(deck,seed){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 return {packs,s};
}
function idWith(deck,pred){
 const id=Object.keys(deck).find(pred);
 assert.ok(id);
 return id;
}

test('BLC-1-003 adds 1000 per opposing front REST character, including a new blocker',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-003'));
 const printed=CARDS.find(c=>c.identity==='BLC-1-003');
 assert.equal(printed.effect,'敵方前線每有 1 個 REST 角色，此角色 BP +1000。');
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-1-003'];
 assert.equal(card.passiveBonuses[0].bpEach,1000);
 assert.equal(card.triggerEffect.op,'restOppFrontSkipNextActive');
 const {packs,s}=main(yellow,3003);
 const self=put(s,0,'BLC-1-003','front',0);
 const restedEnergy=put(s,1,idWith(yellow,id=>bleach.cards[id].type==='character'&&id!=='BLC-1-003'),'energy',0,false);
 const active=put(s,1,idWith(yellow,id=>bleach.cards[id].bp===3000),'front',0,true);
 assert.equal(universalBp(packs,s,self),2000);
 const big=put(s,1,idWith(yellow,id=>bleach.cards[id].bp===4000),'front',1,true);
 assert.equal(universalBp(packs,s,self),2000);
 const life=s.players[0].life.length;
 let battle=s;
 for(let n=0;n<4&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 assert.equal(battle.phase,'attack');
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:self.uid});
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:active.uid},{actor:1});
 assert.equal(battle.players[1].front.some(c=>c?.uid===active.uid),false);
 assert.equal(battle.players[0].front.some(c=>c?.uid===self.uid),true);
 assert.equal(battle.players[0].life.length,life);
 assert.equal(battle.players[1].energy.some(c=>c?.uid===restedEnergy.uid),true);
 assert.equal(battle.turnRetireEvents.some(e=>e.uid===self.uid),false);
 const lost=main(yellow,3004);
 const attacker=put(lost.s,0,'BLC-1-003','front',0);
 put(lost.s,1,idWith(yellow,id=>bleach.cards[id].type==='character'),'energy',0,false);
 const wall=put(lost.s,1,idWith(yellow,id=>bleach.cards[id].bp===4000),'front',0,true);
 assert.equal(universalBp(lost.packs,lost.s,attacker),2000);
 for(let n=0;n<4&&lost.s.phase!=='attack';n++)
  lost.s=dispatchUniversalAction(lost.packs,lost.s,{type:'next'});
 lost.s=dispatchUniversalAction(lost.packs,lost.s,{type:'attack',uid:attacker.uid});
 lost.s=dispatchUniversalAction(lost.packs,lost.s,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(lost.s.players[0].front.some(c=>c?.uid===attacker.uid),false);
 assert.equal(lost.s.players[1].front.some(c=>c?.uid===wall.uid),true);
 assert.equal(lost.s.players[1].front.find(c=>c?.uid===wall.uid).ready,false);
 assert.equal(assertUniversalMatch(lost.packs,lost.s),true);
});

test('BLC-1-019 counts two opposing characters at current BP 4000 or more',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-019'));
 const {packs,s}=main(yellow,3019);
 const self=put(s,0,'BLC-1-019','front',0);
 const one=put(s,1,idWith(yellow,id=>bleach.cards[id].bp===4000),'front',0);
 assert.equal(universalBp(packs,s,self),3500);
 const low=put(s,1,idWith(yellow,id=>bleach.cards[id].bp===3000),'energy',0);
 low.buffs.push({bp:1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,low),4000);
 assert.equal(universalBp(packs,s,self),4000);
 low.buffs.length=0;
 assert.equal(universalBp(packs,s,self),3500);
 put(s,1,idWith(yellow,id=>bleach.cards[id].bp===4000&&id!==one.cardId),'front',1);
 assert.equal(universalBp(packs,s,self),4000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-062 counts other field cards with the printed trait, including a field',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-062'));
 const {packs,s}=main(green,3062);
 const self=put(s,0,'BLC-2-062','energy',0);
 put(s,0,'BLC-1-070','front',0);
 put(s,0,'BLC-1-071','front',1);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 put(s,0,'BLC-1-083','front',2);
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 const foe=put(s,1,'BLC-1-070','front',0);
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 const dropped=s.players[0].front[2];
 s.players[0].front[2]=null;s.players[0].hand.push(dropped);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(foe.cardId,'BLC-1-070');
 assert.equal(assertUniversalMatch(packs,s),true);
 const fillers=Array.from({length:9},(_,i)=>'F'+i);
 const lab=createUniversalPack({id:'trait-energy',cards:[
  {id:'SELF',name:'Self',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
   traits:['護廷十三隊'],trigger:null,implementation:'dsl',effects:{},
   passiveBonuses:[{condition:{kind:'ownCardTraitCount',turn:'any',min:3,zone:'field',
    excludeSelf:true,trait:'護廷十三隊'},extraEnergy:1}]},
  {id:'ALLY',name:'Ally',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:['護廷十三隊'],trigger:null,implementation:'vanilla',effects:{}},
  {id:'FIELD',name:'Field',color:'green',type:'field',energy:0,ap:1,bp:0,gen:1,
   traits:['護廷十三隊'],trigger:null,implementation:'vanilla',effects:{}},
  {id:'PLAIN',name:'Plain',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...fillers.map(id=>({id,name:id,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}}))
 ]});
 const counts={SELF:4,ALLY:4,FIELD:4,PLAIN:2,...Object.fromEntries(fillers.map(id=>[id,4]))};
 let g=newUniversalMatch(lab,{decks:[counts,counts],seed:3063,first:0});
 for(let n=0;n<8&&g.phase!=='main';n++)g=dispatchUniversalAction(lab,g,{type:'next'});
 const src=take(g,0,'SELF');src.ready=true;src.fieldEntryStamp=g.nextFieldEntryStamp++;
 g.players[0].energy[0]=src;
 for(const id of ['ALLY','ALLY','FIELD']){
  const c=take(g,0,id);c.ready=true;c.fieldEntryStamp=g.nextFieldEntryStamp++;
  const slot=g.players[0].front.findIndex(x=>!x);
  g.players[0].front[slot]=c;
 }
 assert.equal(universalEnergyByColor(lab,g,0).green,2);
 const field=g.players[0].front[2];
 g.players[0].front[2]=null;g.players[0].hand.push(field);
 assert.equal(field.cardId,'FIELD');
 assert.equal(universalEnergyByColor(lab,g,0).green,1);
 assert.equal(assertUniversalMatch(lab,g),true);
});

test('BLC-4-038 uses printed front AP on either turn, and BLC-2-054 uses this turn hand history',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-4-038'));
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-054'));
 const fillers=Array.from({length:6},(_,i)=>'F'+i);
 const lab=createUniversalPack({id:'ap-history',cards:[
  {id:'AP',name:'Ap',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,
   traits:[],trigger:'draw',implementation:'dsl',effects:{},
   passiveBonuses:[{condition:{kind:'ownPrintedApAtLeast',turn:'any',zone:'front',
    excludeSelf:false,minAp:2},bp:1500}]},
  {id:'HIGH',name:'High',color:'blue',type:'character',energy:0,ap:2,bp:2000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LOW',name:'Low',color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'HIST',name:'Hist',color:'purple',type:'character',energy:0,ap:1,bp:3000,gen:1,
   traits:[],trigger:null,implementation:'dsl',effects:{},
   passiveBonuses:[{condition:{kind:'ownHandToOutsideThisTurn',turn:'any'},bp:500}]},
  {id:'EV',name:'Ev',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'FOE',name:'Foe',color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:1,
   traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'discardOppHand',count:1}]}},
  {id:'FILL',name:'Fill',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...fillers.map(id=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}}))
 ]});
 const counts={AP:4,HIGH:4,LOW:4,HIST:4,EV:4,FOE:4,FILL:2,
  ...Object.fromEntries(fillers.map(id=>[id,4]))};
 let s=newUniversalMatch(lab,{decks:[counts,counts],seed:3038,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(lab,s,{type:'next'});
 const ap=take(s,0,'AP');ap.ready=true;ap.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=ap;
 assert.equal(universalBp(lab,s,ap),1500);
 const high=take(s,0,'HIGH');high.ready=true;high.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=high;
 assert.equal(universalBp(lab,s,ap),1500);
 s.players[0].energy[0]=null;s.players[0].front[1]=high;
 assert.equal(universalBp(lab,s,ap),3000);
 s.active=1;
 assert.equal(universalBp(lab,s,ap),3000);
 s.active=0;
 const hist=take(s,0,'HIST');hist.ready=true;hist.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[2]=hist;
 assert.equal(universalBp(lab,s,hist),3000);
 const event=take(s,0,'EV');s.players[0].hand.push(event);
 s=dispatchUniversalAction(lab,s,legalUniversalActions(lab,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(universalBp(lab,s,hist),3500);
 s.active=1;
 assert.equal(universalBp(lab,s,hist),3500);
 s.active=0;
 assert.equal(assertUniversalMatch(lab,s),true);
 const real=main(blue,3039);
 const live=put(real.s,0,'BLC-4-038','front',0);
 assert.equal(universalBp(real.packs,real.s,live),1500);
 assert.equal(bleach.cards['BLC-4-038'].trigger,'draw');
 assert.equal(bleach.cards['BLC-4-038'].triggerEffect,null);
});

test('an opponent discard does not satisfy BLC-2-054, and a new turn clears it',()=>{
 const {packs,s}=main(purple,3054);
 const self=put(s,0,'BLC-2-054','front',0);
 put(s,0,idWith(purple,id=>bleach.cards[id].gen>=1&&id!=='BLC-2-054'),'energy',0);
 assert.equal(universalBp(packs,s,self),3000);
 const event=take(s,0,'BLC-1-109');s.players[0].hand.push(event);
 let played=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='event'&&a.uid===event.uid));
 assert.equal(played.pending.kind,'effect-discard');
 const ownDump=played.players[0].hand[0];
 played=dispatchUniversalAction(packs,played,{type:'chooseDiscard',uid:ownDump.uid});
 assert.equal(universalBp(packs,played,played.players[0].front.find(c=>c?.uid===self.uid)),3500);
 for(let i=0;i<3;i++)put(played,1,'BLC-2-054','energy',i);
 for(let n=0;n<12&&!(played.active===1&&played.phase==='main');n++)
  played=dispatchUniversalAction(packs,played,{type:'next'});
 assert.equal(played.active,1);
 assert.equal(played.phase,'main');
 const again=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(universalBp(packs,played,again),3000);
 const foe=take(played,1,'BLC-1-054');played.players[1].hand.push(foe);
 const play=legalUniversalActions(packs,played).find(a=>a.type==='play'&&a.uid===foe.uid);
 assert.ok(play);
 played=dispatchUniversalAction(packs,played,play);
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.pending.player,0);
 const victim=played.players[0].hand[0];
 assert.ok(victim);
 played=dispatchUniversalAction(packs,played,{type:'chooseDiscard',uid:victim.uid},{actor:0});
 assert.equal(played.players[0].outside.some(c=>c.uid===victim.uid),true);
 assert.ok(played.zoneMoveEvents.some(e=>e.uid===victim.uid&&e.reason==='opponent-effect'&&e.controller===1));
 assert.equal(universalBp(packs,played,played.players[0].front.find(c=>c?.uid===self.uid)),3000);
 assert.equal(assertUniversalMatch(packs,played),true);
});

test('BLC-1-084 and BLC-2-068 gain BP only at six other cards of the printed trait',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-084'));
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-068'));
 const allies=['BLC-1-070','BLC-1-071','BLC-1-083','BLC-1-086','BLC-2-066','BLC-1-089'];
 for(const id of allies)assert.ok(bleach.cards[id].traits.includes('護廷十三隊'));
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-084').effect,
  '己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，此角色 BP +500。');
 assert.equal(CARDS.find(c=>c.identity==='BLC-2-068').effect,
  '己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，此角色 BP +1500。');
 const hits=bleach.cards['BLC-1-084'];
 assert.equal(hits.trigger,'color');
 assert.equal(hits.triggerEffect.op,'deployHandCharacter');
 assert.equal(hits.passiveBonuses[0].bp,500);
 assert.equal(bleach.cards['BLC-2-068'].trigger,'draw');
 assert.equal(bleach.cards['BLC-2-068'].triggerEffect,null);
 assert.equal(bleach.cards['BLC-2-068'].passiveBonuses[0].bp,1500);
 const {packs,s}=main(green,3084);
 const self=put(s,0,'BLC-1-084','energy',3);
 for(let i=0;i<4;i++)put(s,0,allies[i],'front',i);
 put(s,0,allies[4],'energy',0);
 assert.equal(universalBp(packs,s,self),3000);
 put(s,0,allies[5],'energy',1);
 assert.equal(universalBp(packs,s,self),3500);
 put(s,1,allies[0],'front',0);
 assert.equal(universalBp(packs,s,self),3500);
 const gone=s.players[0].front[3];
 s.players[0].front[3]=null;s.players[0].hand.push(gone);
 assert.equal(universalBp(packs,s,self),3000);
 const other=put(s,0,'BLC-2-068','energy',2);
 assert.equal(universalBp(packs,s,other),3000);
 const sixth=s.players[0].energy[1];
 s.players[0].energy[1]=null;s.players[0].hand.push(sixth);
 assert.equal(universalBp(packs,s,other),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-1-084 COLOR deploys a legal green hand character, and BLC-2-068 draws',()=>{
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[green,green],seed:3085,first:0});
 for(let n=0;n<8&&s.phase!=='attack';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const attacker=put(s,0,Object.keys(green).find(id=>bleach.cards[id].type==='character'&&id!=='BLC-1-084'),'front',0);
 const life=take(s,1,'BLC-1-084');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.push(life);
 const hand=take(s,1,'BLC-2-068');s.players[1].hand.push(hand);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'color');
 const deploy=legalUniversalActions(packs,s).find(a=>a.mode==='color'&&a.uid===hand.uid&&a.line==='front');
 assert.ok(deploy);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='skip'));
 s=dispatchUniversalAction(packs,s,deploy,{actor:1});
 assert.equal(s.players[1].front.some(c=>c?.uid===hand.uid&&c.ready),true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let draw=newUniversalMatch(packs,{decks:[green,green],seed:3086,first:0});
 for(let n=0;n<8&&draw.phase!=='attack';n++)draw=dispatchUniversalAction(packs,draw,{type:'next'});
 const striker=put(draw,0,'BLC-1-070','front',0);
 const drawn=take(draw,1,'BLC-2-068');
 draw.players[1].deck.push(...draw.players[1].life.splice(0));
 draw.players[1].life.push(drawn);
 const before=draw.players[1].hand.length;
 draw=dispatchUniversalAction(packs,draw,{type:'attack',uid:striker.uid});
 draw=dispatchUniversalAction(packs,draw,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(draw.pending.trigger,'draw');
 draw=dispatchUniversalAction(packs,draw,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(draw.players[1].hand.length,before+1);
 assert.equal(assertUniversalMatch(packs,draw),true);
});
