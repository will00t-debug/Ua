// Shared IMC helpers execute through the existing V2 reducer.
// Unfinished cards stay out of the pack, and the series stays closed
// to official matches.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createImcV2Pack,imcBattleCard,IMC_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/imc-pack.mjs';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_PROGRAMS_STARTER} from '../dist/universal-v2/imc/programs-starter.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {countOwnPrintedTrait,matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor,universalImpact,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {officialV2Pack,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {prepareSoloBattle} from '../dist/universal-v2/solo-battle-session.mjs';
import {imcCatalog} from '../dist/imc/catalog.mjs';
import {createService} from '../server/domain.mjs';
import {openDatabase} from '../server/sqlite.mjs';

const readyOf=programs=>Object.entries(programs).filter(([,program])=>program.ready===true).map(([id])=>id);
const READY=[
 ...readyOf(IMC_PROGRAMS_001_050),
 ...readyOf(IMC_PROGRAMS_051_100),
 ...readyOf(IMC_PROGRAMS_STARTER)
];

function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'red',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??2000,gen:extra.gen??1,traits:extra.traits||[],trigger:null,
  implementation:extra.implementation||'dsl',effects:extra.effects||{},...extra
 };
}
function fillers(n){
 return Array.from({length:n},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
}
function countsOf(cards,spec){
 const counts={};
 let total=0;
 for(const [id,n] of Object.entries(spec)){counts[id]=n;total+=n;}
 const each=Math.floor((50-total)/fillers(1).length)||0;
 void each;
 let left=50-total;
 for(const card of cards.filter(card=>card.id.startsWith('FILL-'))){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;left-=n;
 }
 assert.equal(left,0);
 return counts;
}
function match(cards,spec,seed=1){
 const bodies=[...cards,...fillers(13)];
 const pack=createUniversalPack({id:'probe',version:'imc-shared-'+seed,cards:bodies});
 const counts=countsOf(bodies,spec);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const state=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0});
 return {pack,state};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function seat(s,p,id,line,slot){
 const card=pull(s,p,id);
 card.ready=false;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function legalReadyCounts(pack){
 const counts={};
 const caps={final:0,color:0,special:0};
 let total=0;
 for(const id of Object.keys(pack.cards)){
  if(total>=50)break;
  const card=pack.cards[id];
  let copies=Math.min(4,50-total);
  if(Object.prototype.hasOwnProperty.call(caps,card.trigger))
   copies=Math.min(copies,4-caps[card.trigger]);
  if(copies<=0)continue;
  counts[id]=copies;total+=copies;
  if(Object.prototype.hasOwnProperty.call(caps,card.trigger))caps[card.trigger]+=copies;
 }
 assert.equal(total,50);
 return counts;
}
function fuel(s,n=1,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function main(pack,s){
 for(let i=0;i<6&&s.phase!=='main';i++){
  const next=legalUniversalActions(pack,s).find(a=>a.type==='next');
  assert.ok(next,s.phase);
  s=dispatchUniversalAction(pack,s,next);
 }
 assert.equal(s.phase,'main');
 return s;
}
function play(pack,s,id,line='front'){
 const card=hold(s,id);
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line+' '+(s.pending?.kind||s.phase));
 return [dispatchUniversalAction(pack,s,action),card];
}
function printed(card){return {name:card.name,traits:card.traits,type:'character',bp:card.bp,energy:card.energy};}

test('a match saved before trait entry grants revives with an empty ledger',()=>{
 const pack=createImcV2Pack();
 const counts=legalReadyCounts(pack);
 const s=newUniversalMatch(pack,{decks:[counts,counts],seed:19,first:0});
 delete s.traitEntryGrants;
 assert.equal(assertUniversalMatch(pack,s),true);
 assert.deepEqual(s.traitEntryGrants,[]);
 s.traitEntryGrants='forged';
 assert.throws(()=>assertUniversalMatch(pack,s),/Missing trait entry grants/);
});

test('the integrated pack executes exactly the ready cards',()=>{
 const pack=createImcV2Pack();
 const expected=[
  'IMC-1-001','IMC-1-002','IMC-1-005','IMC-1-006','IMC-1-007','IMC-1-008','IMC-1-010','IMC-1-013','IMC-1-014','IMC-1-015',
  'IMC-1-017','IMC-1-018','IMC-1-019','IMC-1-021','IMC-1-022','IMC-1-023','IMC-1-025',
  'IMC-1-026','IMC-1-027','IMC-1-030','IMC-1-031','IMC-1-034','IMC-1-035','IMC-1-038',
  'IMC-1-040','IMC-1-041','IMC-1-042','IMC-1-044','IMC-1-045','IMC-1-046','IMC-1-047','IMC-1-048','IMC-1-049',
  'IMC-1-050','IMC-1-053','IMC-1-055','IMC-1-056','IMC-1-058','IMC-1-059','IMC-1-060','IMC-1-062','IMC-1-063','IMC-1-066',
  'IMC-1-067','IMC-1-069','IMC-1-070','IMC-1-071','IMC-1-076','IMC-1-077','IMC-1-079','IMC-1-081',
  'IMC-1-082','IMC-1-083','IMC-1-084','IMC-1-085','IMC-1-086','IMC-1-087','IMC-1-088','IMC-1-089','IMC-1-090','IMC-1-091',
  'IMC-1-092','IMC-1-095','IMC-1-096','IMC-1-098','IMC-1-099','IMC-1-100','IMC-1-101','IMC-1-102',
  'IMC-1-103','IMC-1-104','IMC-1-105','IMC-1-106','IMC-1-108','IMC-1-109','IMC-1-110'
 ];
 const unfinished=['IMC-1-003','IMC-1-016','IMC-1-051','IMC-1-080','IMC-1-107','IMC-1-113'];
 assert.deepEqual(Object.keys(pack.cards),expected);
 assert.deepEqual(READY,expected);
 for(const id of unfinished)assert.equal(pack.cards[id],undefined,id);
 const nine=pack.cards['IMC-1-098'].effects.onPlay[2];
 assert.equal(nine.op,'ifLiveThen');
 assert.equal(nine.when.min,9);
 assert.equal(nine.then[0].scope,'all');
 assert.equal(nine.else[0].when.min,6);
 assert.equal(nine.else[0].then[0].scope,'next');
 assert.equal(pack.cards['IMC-1-017'].effects.onPlay[0].op,'peekTopOne');
 assert.equal(pack.cards['IMC-1-023'].effects.onPlay[0].sourceLine,'front');
 assert.equal(pack.cards['IMC-1-023'].effects.onPlay[0].line,undefined);
 const counts=legalReadyCounts(pack);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(editorV2Status('imc',counts).ready,false);
 assert.match(editorV2Status('imc',counts).issues.join('\n'),/尚未開放正式對戰/);
 assert.equal(v2DeckReport('imc',counts).ok,false);
 assert.throws(()=>prepareSoloBattle({
  mine:{pack:officialV2Pack('imc'),counts,label:'灰姑娘'},
  foe:{pack:officialV2Pack('imc'),counts,label:'灰姑娘'},
  first:0,difficulty:'easy'
 }),new RegExp(IMC_OFFICIAL_MATCH_CLOSED));
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:19,first:0});
 assert.equal(assertUniversalMatch(pack,s),true);
 s=main(pack,s);
 fuel(s);
 let entered;
 [s,entered]=play(pack,s,'IMC-1-001','energy');
 assert.equal(s.players[0].energy.find(c=>c.uid===entered.uid).ready,false);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 s.players[0].energy.find(c=>c.uid===entered.uid).ready=true;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>
  a.type==='activate'&&a.uid===entered.uid&&a.mode==='selfRestEnergyRetire'));
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===entered.uid),true);
 assert.equal(universalEnergyByColor(pack,s,0).yellow||0,0);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('printed trait counts ignore live BP and can include outside names',()=>{
 const state={players:[
  {front:[{uid:'0-1',name:'自己',traits:['STAR'],type:'character',bp:4000,energy:2,buffs:[{bp:3000}]}],
   energy:[{uid:'0-2',name:'能源',traits:['STAR'],type:'character',bp:2000,energy:0,buffs:[{bp:3000}]}],
   outside:[
    {uid:'0-3',name:'自己',traits:['STAR'],type:'character'},
    {uid:'0-4',name:'場外',traits:['STAR'],type:'character'}
   ]},
  {front:[],energy:[],outside:[]}
 ]};
 const read=c=>c;
 assert.equal(countOwnPrintedTrait(state,0,'0-9',{
  zone:'field',excludeSelf:true,trait:'STAR',printedBp:4000
 },read),1);
 assert.equal(countOwnPrintedTrait(state,0,'0-1',{
  zone:'field',excludeSelf:true,trait:'STAR',printedBp:4000
 },read),0);
 assert.equal(countOwnPrintedTrait(state,0,null,{
  zone:'field',excludeSelf:false,trait:'STAR',printedBp:5000
 },read),0);
 assert.equal(matchesV2LiveCondition(state,0,null,{
  kind:'ownPrintedTraitCount',turn:'any',min:1,zone:'front',excludeSelf:false,
  trait:'STAR',printedEnergy:2
 },printed),true);
 assert.equal(matchesV2LiveCondition(state,0,null,{
  kind:'ownDistinctTraitNames',turn:'any',min:3,zone:'field',excludeSelf:false,trait:'STAR'
 },printed),false);
 assert.equal(matchesV2LiveCondition(state,0,null,{
  kind:'ownDistinctTraitNames',turn:'any',min:3,zone:'fieldOutside',excludeSelf:false,trait:'STAR'
 },printed),true);
 assert.equal(matchesV2LiveCondition(state,0,'0-1',{
  kind:'ownDistinctTraitNames',turn:'any',min:2,zone:'field',excludeSelf:true,trait:'STAR'
 },printed),false);
});

test('printed-BP retirement compares the opponent live BP and can be declined',()=>{
 const actor=face({id:'ACT',name:'來源',bp:4000,traits:['STAR'],effects:{onPlay:[{
  op:'retireOppFrontUnderBp',optional:true,
  printedBpTraitCount:{trait:'STAR',printedBp:4000,per:1000,excludeSelf:true}
 }]}});
 const other=face({id:'OTHER',name:'其他',bp:4000,traits:['STAR'],implementation:'vanilla'});
 const inflated=face({id:'LOW',name:'加值',bp:2000,traits:['STAR'],implementation:'vanilla'});
 const small=face({id:'SMALL',name:'低',bp:1000,implementation:'vanilla'});
 const tall=face({id:'TALL',name:'高',bp:1500,implementation:'vanilla'});
 const {pack,state}=match([actor,other,inflated,small,tall],
  {ACT:1,OTHER:1,LOW:1,SMALL:1,TALL:1},7);
 let s=state;
 const mine=seat(s,0,'OTHER','energy',0);
 mine.buffs.push({bp:5000,untilTurn:s.turn});
 const boosted=seat(s,0,'LOW','front',1);
 boosted.buffs.push({bp:3000,untilTurn:s.turn});
 const foeSmall=seat(s,1,'SMALL','front',0);
 const foeTall=seat(s,1,'TALL','front',1);
 s=main(pack,s);fuel(s);
 const life=s.players[1].life.length;
 [s]=play(pack,s,'ACT');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,1000);
 assert.deepEqual(s.pending.choices,[foeSmall.uid]);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),true);
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:foeSmall.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===foeSmall.uid),true);
 assert.equal(s.players[1].life.length,life);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a front-only turn buff leaves the energy line unchanged',()=>{
 const actor=face({id:'ACT',name:'前線',type:'event',energy:0,ap:1,bp:0,gen:0,effects:{onPlay:[
  {op:'buffOwnCharactersAll',bp:1000,zone:'front'}]}});
 const front=face({id:'FRONT',implementation:'vanilla',bp:2000});
 const energy=face({id:'ENERGY',implementation:'vanilla',bp:2000});
 const {pack,state}=match([actor,front,energy],{ACT:1,FRONT:1,ENERGY:1},8);
 let s=state;
 seat(s,0,'FRONT','front',0);
 seat(s,0,'ENERGY','energy',0);
 s=main(pack,s);fuel(s);
 const cast=hold(s,'ACT');
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='event'&&a.uid===cast.uid));
 const frontCard=s.players[0].front.find(c=>c?.cardId==='FRONT');
 const energyCard=s.players[0].energy.find(c=>c?.cardId==='ENERGY');
 assert.equal(universalBp(pack,s,frontCard),3000);
 assert.equal(universalBp(pack,s,energyCard),2000);
 assert.equal(s.players[0].outside.some(c=>c.uid===cast.uid),true);
});

test('the next matching character enters active once, and all-scope lasts the turn',()=>{
 const next=face({id:'NEXT',traits:['STAR'],effects:{onPlay:[
  {op:'grantTraitActiveEntryThisTurn',trait:'STAR',scope:'next'}]}});
 const star=face({id:'STAR',name:'星',traits:['STAR'],implementation:'vanilla'});
 const plain=face({id:'PLAIN',name:'普通',implementation:'vanilla'});
 let built=match([next,star,plain],{NEXT:1,STAR:4,PLAIN:2},9);
 let s=main(built.pack,built.state);fuel(s,3);
 let entered;
 [s,entered]=play(built.pack,s,'NEXT');
 assert.equal(s.players[0].front.find(c=>c.uid===entered.uid).ready,false);
 [s,entered]=play(built.pack,s,'STAR');
 assert.equal(s.players[0].front.find(c=>c.uid===entered.uid).ready,true);
 [s,entered]=play(built.pack,s,'STAR','energy');
 assert.equal(s.players[0].energy.find(c=>c.uid===entered.uid).ready,false);
 assert.equal(s.traitEntryGrants.length,0);

 const all=face({id:'ALL',effects:{onPlay:[
  {op:'grantTraitActiveEntryThisTurn',trait:'STAR',scope:'all'},
  {op:'deployOwnHandRest',type:'character',color:'yellow',energy:5,ap:null,
   max:1,trait:'STAR',line:'front'}]}});
 const yellowStar=face({id:'STAR',name:'星',color:'yellow',traits:['STAR'],implementation:'vanilla'});
 built=match([all,yellowStar,plain],{ALL:1,STAR:4,PLAIN:2},10);
 s=main(built.pack,built.state);fuel(s,3);
 const rested=hold(s,'STAR');
 [s]=play(built.pack,s,'ALL');
 assert.equal(s.pending.kind,'effect-hand-rest');
 s=dispatchUniversalAction(built.pack,s,legalUniversalActions(built.pack,s).find(a=>
  a.type==='chooseHandRest'&&a.uid===rested.uid&&a.line==='front'));
 assert.equal(s.players[0].front.find(c=>c.uid===rested.uid).ready,true);
 [s,entered]=play(built.pack,s,'STAR');
 assert.equal(s.players[0].front.find(c=>c.uid===entered.uid).ready,true);
 [s,entered]=play(built.pack,s,'PLAIN');
 assert.equal(s.players[0].front.find(c=>c.uid===entered.uid).ready,false);
 assert.equal(s.traitEntryGrants.length,1);
 assert.equal(s.traitEntryGrants[0].consumed,false);
 const turn=s.turn;
 for(let i=0;i<8&&s.turn===turn;i++){
  const step=legalUniversalActions(built.pack,s).find(a=>a.type==='next');
  assert.ok(step,s.phase);
  s=dispatchUniversalAction(built.pack,s,step);
 }
 assert.notEqual(s.turn,turn);
 assert.deepEqual(s.traitEntryGrants,[]);
});

test('an event discount survives outside and is consumed by the next matching hand play',()=>{
 const event=face({id:'EVT',name:'事件',type:'event',energy:0,ap:1,bp:0,gen:0,effects:{onPlay:[
  {op:'draw',count:1},
  {op:'nextEligibleHandPlayApDiscount',fromUsedEvent:true,filter:{trait:'STAR'}}
 ]}});
 const star=face({id:'STAR',name:'星',traits:['STAR'],implementation:'vanilla'});
 const plain=face({id:'PLAIN',name:'普通',implementation:'vanilla'});
 const {pack,state}=match([event,star,plain],{EVT:2,STAR:4,PLAIN:2},11);
 let s=main(pack,state);fuel(s);
 const cast=hold(s,'EVT');
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='event'&&a.uid===cast.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===cast.uid),true);
 s.players[0].apCards.forEach(c=>{c.inPlay=false;c.ready=false;});
 const starCard=hold(s,'STAR');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='play'&&a.uid===starCard.uid),true);
 const plainCard=hold(s,'PLAIN');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='play'&&a.uid===plainCard.uid),false);
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===starCard.uid));
 const second=hold(s,'STAR');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='play'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('hand REST can require color, printed energy and trait without a printed AP',()=>{
 const actor=face({id:'ACT',effects:{onPlay:[{
  op:'deployOwnHandRest',type:'character',color:'yellow',energy:2,ap:null,
  max:1,trait:'STAR',line:'front'
 }]}});
 const yes=face({id:'YES',name:'符合',color:'yellow',ap:2,energy:2,traits:['STAR'],implementation:'vanilla'});
 const costly=face({id:'COST',name:'太貴',color:'yellow',ap:1,energy:3,traits:['STAR'],implementation:'vanilla'});
 const blue=face({id:'BLUE',name:'藍',color:'blue',ap:1,energy:1,traits:['STAR'],implementation:'vanilla'});
 const {pack,state}=match([actor,yes,costly,blue],{ACT:1,YES:1,COST:1,BLUE:1},12);
 let s=main(pack,state);fuel(s);
 hold(s,'YES');hold(s,'COST');hold(s,'BLUE');
 [s]=play(pack,s,'ACT');
 assert.equal(s.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(pack,s).filter(a=>a.type==='chooseHandRest'&&a.uid);
 assert.equal(new Set(choices.map(a=>a.uid)).size,1);
 assert.equal(choices.every(a=>a.line==='front'),true);
 const chosen=s.players[0].hand.find(c=>c.uid===choices[0].uid);
 assert.equal(chosen.cardId,'YES');
 s=dispatchUniversalAction(pack,s,choices[0]);
 assert.equal(s.players[0].front.find(c=>c.uid===chosen.uid).ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a printed-BP gate draws, and a live BP buff does not open it',()=>{
 const when={kind:'ownPrintedTraitCount',turn:'any',min:1,zone:'field',excludeSelf:true,
  trait:'STAR',printedBp:4000};
 const actor=face({id:'ACT',bp:2000,traits:['STAR'],effects:{onPlay:[
  {op:'ifLiveThen',when,then:[{op:'draw',count:1}]}]}});
 const high=face({id:'HIGH',bp:4000,traits:['STAR'],implementation:'vanilla'});
 const low=face({id:'LOW',bp:2000,traits:['STAR'],implementation:'vanilla'});
 createUniversalPack({id:'probe',version:'imc-follow',cards:[
  face({id:'DISC',effects:{onPlay:[{op:'ifLiveThen',when,then:[{op:'drawDiscard',count:1}]}]}}),
  face({id:'WAKE',effects:{onPlay:[{op:'ifLiveThen',when,then:[
   {op:'activeOwnTrait',optional:true,max:1,trait:'STAR'}]}]}})
 ]});
 let built=match([actor,high,low],{ACT:1,HIGH:1,LOW:1},13);
 let s=built.state;
 seat(s,0,'HIGH','front',0);
 s=main(built.pack,s);fuel(s);
 hold(s,'ACT');
 const before=s.players[0].hand.length;
 [s]=play(built.pack,s,'ACT');
 assert.equal(s.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(built.pack,s),true);
 built=match([actor,low],{ACT:1,LOW:1},14);
 s=built.state;
 const boosted=seat(s,0,'LOW','front',0);
 boosted.buffs.push({bp:3000,untilTurn:s.turn});
 s=main(built.pack,s);fuel(s);
 hold(s,'ACT');
 const quiet=s.players[0].hand.length;
 [s]=play(built.pack,s,'ACT');
 assert.equal(s.players[0].hand.length,quiet-1);
});

test('an existing active-energy field can pass through an IMC battle card',()=>{
 const card=imcCatalog().byId.get('IMC-1-005');
 const battle=imcBattleCard(card,{
  ready:true,implementation:'dsl',activeExtraEnergy:1,
  notes:'測試轉送，不把這張卡標進對戰包。'
 });
 const pack=createUniversalPack({id:'probe',version:'imc-forward',cards:[battle]});
 assert.equal(pack.cards['IMC-1-005'].activeExtraEnergy,1);
 assert.equal(createImcV2Pack().cards['IMC-1-005'].activeExtraEnergy,1);
 const gated=face({id:'GATE',name:'門檻',bp:2000,energy:0,gen:0,traits:['STAR'],passiveBonuses:[
  {condition:{kind:'ownPrintedTraitCount',turn:'any',min:2,zone:'field',excludeSelf:true,
   trait:'STAR',printedEnergy:2},bp:1500},
  {condition:{kind:'ownDistinctTraitNames',turn:'any',min:2,zone:'fieldOutside',excludeSelf:false,
   trait:'STAR'},bp:1000},
  {condition:{kind:'ownCardTraitCount',turn:'any',min:2,zone:'field',excludeSelf:false,
   trait:'STAR'},extraEnergy:1}
 ]});
 const other=face({id:'TWO',name:'另一名',energy:2,traits:['STAR'],implementation:'vanilla'});
 const built=match([gated,other],{GATE:1,TWO:2},15);
 let s=built.state;
 const host=seat(s,0,'GATE','energy',0);
 assert.equal(universalBp(built.pack,s,host),2000);
 seat(s,0,'TWO','front',0);
 assert.equal(universalBp(built.pack,s,host),3000);
 assert.equal(universalEnergyByColor(built.pack,s,0).red,1);
 seat(s,0,'TWO','front',1);
 assert.equal(universalBp(built.pack,s,host),4500);
 assert.equal(createImcV2Pack().cards['IMC-1-027'].passiveBonuses[0].extraEnergy,1);
 assert.equal(createImcV2Pack().cards['IMC-1-070'].passiveBonuses[0].condition.zone,'fieldOutside');
 assert.equal(createImcV2Pack().cards['IMC-1-081'].passiveBonuses[0].condition.printedEnergy,2);
});

test('a public trait reveal is visible to both players and a private look is not',()=>{
 const actor=face({id:'ACT',energy:0,effects:{onPlay:[
  {op:'revealTopTraitOptionalHand',trait:'STAR'}]}});
 const star=face({id:'STAR',name:'星',traits:['STAR'],implementation:'vanilla'});
 const plain=face({id:'PLAIN',name:'普通',traits:[],implementation:'vanilla'});
 const open=()=>{
  const built=match([actor,star,plain],{ACT:1,STAR:2,PLAIN:2},21);
  let s=main(built.pack,built.state);
  fuel(s);
  return {built,s};
 };
 let {built,s}=open();
 const hidden=pull(s,0,'PLAIN');
 s.players[0].deck.unshift(hidden);
 [s]=play(built.pack,s,'ACT');
 assert.equal(s.pending.kind,'effect-reveal-trait-choice');
 assert.equal(s.pending.mayHand,false);
 assert.deepEqual(legalUniversalActions(built.pack,s).map(a=>a.mode),['top','bottom']);
 assert.equal(universalPrivateChoices(built.pack,s,1),null);
 const shown=universalPublicView(built.pack,s,1);
 assert.equal(shown.publicReveals.some(row=>row.cardId==='PLAIN'&&row.uid===hidden.uid),true);
 assert.equal(JSON.stringify(shown.pending).includes(hidden.uid),false);
 s=dispatchUniversalAction(built.pack,s,{type:'chooseRevealTrait',mode:'bottom'});
 assert.equal(s.players[0].deck.at(-1).uid,hidden.uid);
 assert.equal(assertUniversalMatch(built.pack,s),true);

 ({built,s}=open());
 const matchCard=pull(s,0,'STAR');
 s.players[0].deck.unshift(matchCard);
 [s]=play(built.pack,s,'ACT');
 assert.equal(s.pending.mayHand,true);
 assert.deepEqual(legalUniversalActions(built.pack,s).map(a=>a.mode),['hand','top','bottom']);
 s=dispatchUniversalAction(built.pack,s,{type:'chooseRevealTrait',mode:'top'});
 assert.equal(s.players[0].deck[0].uid,matchCard.uid);
 assert.equal(assertUniversalMatch(built.pack,s),true);

 ({built,s}=open());
 const taken=pull(s,0,'STAR');
 s.players[0].deck.unshift(taken);
 [s]=play(built.pack,s,'ACT');
 s=dispatchUniversalAction(built.pack,s,{type:'chooseRevealTrait',mode:'hand'});
 assert.ok(s.players[0].hand.some(c=>c.uid===taken.uid));
 assert.equal(s.publicReveals.some(row=>row.kind==='searched-to-hand'&&row.uid===taken.uid),true);
 assert.equal(assertUniversalMatch(built.pack,s),true);
});

test('a legal ready IMC deck can be saved and cannot open a room',async()=>{
 const pack=createImcV2Pack();
 const counts=legalReadyCounts(pack);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const dir=await mkdtemp(join(tmpdir(),'ua-imc-shared-'));
 const sql=openDatabase(join(dir,'account.sqlite'));
 const service=createService({sql,now:()=>Date.parse('2026-11-12T03:00:00Z')});
 try{
  const {token}=await service.register({username:'imcshare',password:'correct-horse-123'},{ip:'127.0.0.1'});
  const saved=await service.saveDeck(token,{name:'灰姑娘完成卡',title:'imc',counts});
  assert.equal(saved.deck.playable,false);
  await assert.rejects(()=>service.createRoom(token,{deckId:saved.deck.id,first:'me'}),
   error=>error?.status===400);
 }finally{
  sql.close();
  await rm(dir,{recursive:true,force:true});
 }
});

function advance(pack,s,active,phase){
 const turn=s.turn;
 for(let i=0;i<20&&(s.turn===turn||s.active!==active||s.phase!==phase);i++){
  const legal=legalUniversalActions(pack,s);
  const step=s.pending
   ?legal.find(a=>a.uid==null||a.mode==='skip'||a.mode==='decline')
   :legal.find(a=>a.type==='next');
  assert.ok(step,(s.pending?.kind||s.phase)+' active '+s.active);
  s=dispatchUniversalAction(pack,s,step);
 }
 assert.equal(s.active,active);
 assert.equal(s.phase,phase);
 assert.notEqual(s.turn,turn);
 return s;
}
function ownMainAgain(pack,s){return advance(pack,s,0,'main');}
function opponentMain(pack,s){return advance(pack,s,1,'main');}
function attacksOf(pack,s,uid){
 return legalUniversalActions(pack,s).filter(a=>a.type==='attack'&&a.uid===uid);
}

test('another character current BP opens one self buff per turn',()=>{
 const actor=face({id:'ACT',name:'來源',bp:2000,mainAbility:{
  op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,
  when:{kind:'otherOwnCharacterBpAtLeast',turn:'any',zone:'field',excludeSelf:true,minBp:5000}}});
 const high=face({id:'HIGH',name:'高',bp:4000,implementation:'vanilla'});
 const printed=face({id:'PRINT',name:'印刷',bp:5000,implementation:'vanilla'});
 const {pack,state}=match([actor,high,printed],{ACT:1,HIGH:1,PRINT:1},31);
 let s=main(pack,state);
 const self=seat(s,0,'ACT','energy',0);
 self.ready=true;
 const other=seat(s,0,'HIGH','front',0);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 other.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,other),5000);
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>
  a.mode==='onceBuffSelf'&&a.uid===self.uid));
 assert.equal(universalBp(pack,s,s.players[0].energy.find(c=>c?.uid===self.uid)),3000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 s=ownMainAgain(pack,s);
 const back=s.players[0].energy.find(c=>c?.uid===self.uid);
 assert.equal(universalBp(pack,s,back),2000);
 const lowered=seat(s,0,'PRINT','front',1);
 lowered.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,lowered),4000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 lowered.buffs=[];
 assert.equal(universalBp(pack,s,lowered),5000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===back.uid&&a.mode==='onceBuffSelf'),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('an opponent current BP of 4500 opens one self buff',()=>{
 const actor=face({id:'ACT',name:'來源',bp:2000,mainAbility:{
  op:'onceBuffSelfWhen',oncePerTurn:true,bp:2000,
  when:{kind:'oppCharacterBpAtLeast',turn:'any',zone:'field',minBp:4500}}});
 const foe=face({id:'FOE',name:'對手',bp:4000,implementation:'vanilla'});
 const tall=face({id:'TALL',name:'能源',bp:5000,implementation:'vanilla'});
 const {pack,state}=match([actor,foe,tall],{ACT:1,FOE:1,TALL:1},32);
 let s=main(pack,state);
 const self=seat(s,0,'ACT','front',0);
 const front=seat(s,1,'FOE','front',0);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 front.buffs=[{bp:500,untilTurn:s.turn}];
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.mode==='onceBuffSelf'));
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===self.uid)),4000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 s=ownMainAgain(pack,s);
 const back=s.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(universalBp(pack,s,back),2000);
 const energy=seat(s,1,'TALL','energy',0);
 energy.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,energy),4000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='onceBuffSelf'),false);
 energy.buffs=[];
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===back.uid&&a.mode==='onceBuffSelf'),true);
});

test('resting the source buffs one other character of the printed trait',()=>{
 const actor=face({id:'ACT',name:'來源',bp:2000,traits:['STAR'],mainAbility:{
  op:'restSelfBuffOther',bp:1000,trait:'STAR'}});
 const star=face({id:'STAR',name:'星',bp:2000,traits:['STAR'],implementation:'vanilla'});
 const plain=face({id:'PLAIN',name:'普通',bp:2000,implementation:'vanilla'});
 const {pack,state}=match([actor,star,plain],{ACT:1,STAR:1,PLAIN:1},33);
 let s=main(pack,state);
 const source=seat(s,0,'ACT','energy',0);
 source.ready=true;
 const matchCard=seat(s,0,'STAR','front',0);
 const other=seat(s,0,'PLAIN','front',1);
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>
  a.mode==='selfRestBuff'&&a.uid===source.uid));
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[matchCard.uid]);
 s=dispatchUniversalAction(pack,s,{type:'chooseOwnBuff',uid:matchCard.uid});
 const rested=s.players[0].energy.find(c=>c?.uid===source.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===matchCard.uid)),3000);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===other.uid)),2000);
 rested.ready=true;
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='selfRestBuff'&&a.uid===source.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('an attack reveal and draw-discard follow the acting character current BP',()=>{
 const reveal=face({id:'REV',name:'公開',bp:4000,effects:{onAttack:[{
  op:'ifLiveThen',when:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:5000},
  then:[{op:'revealTopTraitOptionalHand',trait:'STAR'}]}]}});
 const draw=face({id:'DRAW',name:'抽棄',bp:2000,effects:{onAttack:[{
  op:'ifLiveThen',when:{kind:'otherOwnCharacterBpAtLeast',turn:'any',zone:'field',
   excludeSelf:true,minBp:5000},
  then:[{op:'drawDiscard',count:1}]}]}});
 const ally=face({id:'ALLY',name:'同伴',bp:2000,implementation:'vanilla'});
 const tallAlly=face({id:'TALL',name:'印刷高',bp:5000,implementation:'vanilla'});
 const top=face({id:'TOP',name:'牌頂',traits:['STAR'],implementation:'vanilla'});
 let built=match([reveal,top],{REV:1,TOP:1},34);
 let s=main(built.pack,built.state);
 const quiet=seat(s,0,'REV','front',0);
 quiet.ready=true;
 const hidden=pull(s,0,'TOP');
 s.players[0].deck.unshift(hidden);
 s=dispatchUniversalAction(built.pack,s,legalUniversalActions(built.pack,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(built.pack,s,{type:'attack',uid:quiet.uid});
 assert.notEqual(s.pending?.kind,'effect-reveal-trait-choice');
 assert.equal(s.players[0].deck[0]?.uid,hidden.uid);
 quiet.buffs=[{bp:1000,untilTurn:s.turn}];
 built=match([reveal,top],{REV:1,TOP:1},35);
 s=main(built.pack,built.state);
 const loud=seat(s,0,'REV','front',0);
 loud.ready=true;
 loud.buffs=[{bp:1000,untilTurn:s.turn}];
 const shown=pull(s,0,'TOP');
 s.players[0].deck.unshift(shown);
 s=dispatchUniversalAction(built.pack,s,legalUniversalActions(built.pack,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(built.pack,s,{type:'attack',uid:loud.uid});
 assert.equal(s.pending.kind,'effect-reveal-trait-choice');
 assert.equal(s.pending.mayHand,true);
 assert.equal(universalPrivateChoices(built.pack,s,1),null);
 const view=universalPublicView(built.pack,s,1);
 assert.equal(view.publicReveals.some(row=>row.uid===shown.uid),true);
 assert.equal(JSON.stringify(view.pending).includes(shown.uid),false);

 built=match([draw,ally],{DRAW:1,ALLY:1},36);
 s=main(built.pack,built.state);
 const actor=seat(s,0,'DRAW','front',0);
 actor.ready=true;
 const printed=seat(s,0,'ALLY','energy',0);
 printed.buffs=[{bp:3000,untilTurn:s.turn}];
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(built.pack,s,legalUniversalActions(built.pack,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(built.pack,s,{type:'attack',uid:actor.uid});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'effect-discard');
 built=match([draw,tallAlly],{DRAW:1,TALL:1},361);
 s=main(built.pack,built.state);
 const quietActor=seat(s,0,'DRAW','front',0);
 quietActor.ready=true;
 const reduced=seat(s,0,'TALL','front',1);
 reduced.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(built.pack,s,reduced),4000);
 const quietHand=s.players[0].hand.length;
 s=dispatchUniversalAction(built.pack,s,legalUniversalActions(built.pack,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(built.pack,s,{type:'attack',uid:quietActor.uid});
 assert.equal(s.players[0].hand.length,quietHand);
 assert.notEqual(s.pending?.kind,'effect-discard');
});

test('a BP band returns either low or high opposing front characters',()=>{
 const actor=face({id:'ACT',name:'回手',bp:2000,effects:{onPlay:[{
  op:'bounceOppFrontOneUnderBp',bp:2500,orAtLeast:4500,optional:true}]}});
 const low=face({id:'LOW',name:'低',bp:2000,implementation:'vanilla'});
 const mid=face({id:'MID',name:'中',bp:3000,implementation:'vanilla'});
 const high=face({id:'HIGH',name:'高',bp:4000,implementation:'vanilla'});
 const edge=face({id:'EDGE',name:'緣',bp:2500,implementation:'vanilla'});
 const {pack,state}=match([actor,low,mid,high,edge],{ACT:1,LOW:1,MID:1,HIGH:1,EDGE:1},37);
 let s=main(pack,state);fuel(s);
 const small=seat(s,1,'LOW','front',0);
 const middle=seat(s,1,'MID','front',1);
 const tall=seat(s,1,'HIGH','front',2);
 const bound=seat(s,1,'EDGE','front',3);
 tall.buffs=[{bp:500,untilTurn:s.turn}];
 small.buffs=[{bp:1000,untilTurn:s.turn}];
 [s]=play(pack,s,'ACT');
 assert.equal(s.pending.kind,'effect-bounce-bp');
 assert.equal(s.pending.choices.includes(bound.uid),true);
 assert.equal(s.pending.choices.includes(tall.uid),true);
 assert.equal(s.pending.choices.includes(small.uid),false);
 assert.equal(s.pending.choices.includes(middle.uid),false);
 const forged=structuredClone(s);
 forged.pending.orAtLeast=4500;
 forged.pending.choices.push(middle.uid);
 assert.throws(()=>dispatchUniversalAction(pack,forged,{type:'chooseBounceBp',uid:middle.uid}),
  /Forged BP band|Illegal BP-threshold return target/);
 s=dispatchUniversalAction(pack,s,{type:'chooseBounceBp',uid:null});
 assert.equal(s.players[1].front.some(c=>c?.uid===tall.uid),true);
 const source=s.players[0].front.find(c=>c?.cardId==='ACT');
 source.ready=true;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 assert.equal(source.attackBanned,undefined);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='attack'&&a.uid===source.uid),true);
});

test('a trait grant stops high current BP characters from blocking',()=>{
 const granter=face({id:'GRANT',name:'限制',bp:2000,traits:['STAR'],printedImpact:1,effects:{onPlay:[{
  op:'grantOwnTraitBlockAtLeast',trait:'STAR',bp:4000,optional:true}]}});
 const star=face({id:'STAR',name:'星',bp:3000,traits:['STAR'],implementation:'vanilla'});
 const plain=face({id:'PLAIN',name:'普通',bp:3000,implementation:'vanilla'});
 const low=face({id:'LOW',name:'低擋',bp:3500,implementation:'vanilla'});
 const mid=face({id:'MID',name:'中擋',bp:3000,implementation:'vanilla'});
 const high=face({id:'HIGH',name:'高擋',bp:4500,implementation:'vanilla'});
 const {pack,state}=match([granter,star,plain,low,mid,high],
  {GRANT:1,STAR:1,PLAIN:1,LOW:1,MID:1,HIGH:1},38);
 let s=main(pack,state);fuel(s,2);
 const granted=seat(s,0,'STAR','front',0);
 const open=seat(s,0,'PLAIN','front',1);
 const small=seat(s,1,'LOW','front',0);
 const middle=seat(s,1,'MID','front',1);
 const tall=seat(s,1,'HIGH','front',2);
 for(const card of [small,middle,tall])card.ready=true;
 middle.buffs=[{bp:1000,untilTurn:s.turn}];
 tall.buffs=[{bp:-1000,untilTurn:s.turn}];
 [s]=play(pack,s,'GRANT');
 assert.equal(s.pending.kind,'effect-block-ceiling');
 assert.equal(s.pending.choices.includes(granted.uid),true);
 assert.equal(s.pending.choices.includes(open.uid),false);
 assert.equal(universalPrivateChoices(pack,s,0),null);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const skipped=dispatchUniversalAction(pack,structuredClone(s),{type:'chooseBlockCeiling',uid:null});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===granted.uid).blockAtLeastGranted,undefined);
 s=dispatchUniversalAction(pack,s,{type:'chooseBlockCeiling',uid:granted.uid});
 assert.equal(universalImpact(pack,s,s.players[0].front.find(c=>c?.cardId==='GRANT')),1);
 s.players[0].front.find(c=>c?.uid===granted.uid).ready=true;
 s.players[0].front.find(c=>c?.uid===open.uid).ready=true;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='next'));
 assert.equal(attacksOf(pack,s,granted.uid).every(a=>a.targetUid===undefined),true);
 const restricted=dispatchUniversalAction(pack,structuredClone(s),attacksOf(pack,s,granted.uid)[0]);
 assert.equal(restricted.pending.kind,'block');
 const blocked=legalUniversalActions(pack,restricted).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocked.includes(small.uid),true);
 assert.equal(blocked.includes(tall.uid),true);
 assert.equal(blocked.includes(middle.uid),false);
 assert.equal(blocked.includes(null),true);
 const normal=dispatchUniversalAction(pack,structuredClone(s),attacksOf(pack,s,open.uid)[0]);
 const everyone=legalUniversalActions(pack,normal).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(everyone.includes(middle.uid),true);
 assert.equal(granted.sniperGranted,undefined);
 assert.equal(assertUniversalMatch(pack,restricted),true);
});

test('sniper still chooses a target and does not open a block window',()=>{
 const sniper=face({id:'SNIPE',name:'狙擊',bp:2000,effects:{onPlay:[{op:'grantSelfSniperThisTurn'}]}});
 const wall=face({id:'WALL',name:'牆',bp:4000,implementation:'vanilla'});
 const {pack,state}=match([sniper,wall],{SNIPE:1,WALL:1},39);
 let s=main(pack,state);fuel(s);
 const target=seat(s,1,'WALL','front',0);
 target.ready=true;
 [s]=play(pack,s,'SNIPE');
 const attacker=s.players[0].front.find(c=>c.cardId==='SNIPE');
 attacker.ready=true;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.type==='next'));
 const shot=legalUniversalActions(pack,s).find(a=>a.type==='attack'&&a.uid===attacker.uid&&a.targetUid===target.uid);
 assert.ok(shot);
 s=dispatchUniversalAction(pack,s,shot);
 assert.notEqual(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('two named characters reduce one hand character AP and the cost stays at zero or above',()=>{
 const rin=face({id:'RIN',name:'渋谷 凛',implementation:'vanilla'});
 const mio=face({id:'MIO',name:'本田 未央',implementation:'vanilla'});
 const payer=face({id:'PAY',name:'降費',ap:2,handApDiscountWhileAllNames:{
  names:['渋谷 凛','本田 未央'],amount:1}});
 const cheap=face({id:'ONE',name:'一費',ap:1,handApDiscountWhileAllNames:{
  names:['渋谷 凛','本田 未央'],amount:1}});
 const plain=face({id:'PLAIN',name:'普通',ap:2,implementation:'vanilla'});
 const {pack,state}=match([rin,mio,payer,cheap,plain],{RIN:1,MIO:1,PAY:1,ONE:1,PLAIN:1},40);
 let s=main(pack,state);fuel(s);
 const first=seat(s,0,'RIN','front',0);
 const second=seat(s,0,'MIO','energy',0);
 const pay=hold(s,'PAY');
 const other=hold(s,'PLAIN');
 const one=hold(s,'ONE');
 const playable=()=>legalUniversalActions(pack,s).filter(a=>a.type==='play').map(a=>a.uid);
 assert.equal(playable().includes(pay.uid),true);
 assert.equal(playable().includes(other.uid),false);
 s.players[0].energy[0]=null;
 s.players[0].outside.push(second);
 assert.equal(playable().includes(pay.uid),false);
 s.players[0].outside.pop();
 s.players[0].energy[0]=second;
 assert.equal(playable().includes(pay.uid),true);
 fuel(s,0);
 assert.equal(playable().includes(one.uid),true);
 assert.equal(playable().includes(pay.uid),false);
 s.players[0].front[0]=null;
 s.players[0].outside.push(first);
 assert.equal(playable().includes(one.uid),false);
 fuel(s,1);
 assert.equal(playable().includes(one.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a front character at the current BP chooses one buff branch per turn',()=>{
 const actor=face({id:'ACT',name:'前線',bp:5000,mainAbility:{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,minSelfBp:4000,
  then:[{op:'chooseOne',optional:false,options:[
   {id:'flat',label:'這個回合 BP+1000',turn:'any',then:[
    {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false}]},
   {id:'high',label:'這個回合 BP+2000',turn:'any',then:[
    {op:'buffOwnCurrentBp',minBp:3000,bp:2000,optional:false,excludeSelf:false}]}
  ]}]}});
 const low=face({id:'LOW',name:'低',bp:2000,implementation:'vanilla'});
 const {pack,state}=match([actor,low],{ACT:1,LOW:1},41);
 let s=main(pack,state);
 const source=seat(s,0,'ACT','energy',0);
 const other=seat(s,0,'LOW','front',1);
 assert.equal(universalBp(pack,s,source),5000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='frontOnce'),false);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=source;
 source.buffs=[{bp:-1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,source),3500);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='frontOnce'),false);
 source.buffs=[{bp:-2000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,source),3000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='frontOnce'),false);
 source.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,source),4000);
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.mode==='frontOnce'));
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['flat','high']);
 s=dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'flat'});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.bp,1000);
 assert.equal(s.pending.choices.includes(other.uid),true);
 s=dispatchUniversalAction(pack,s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===other.uid)),3000);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===source.uid)),4000);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='frontOnce'),false);
 s=ownMainAgain(pack,s);
 const back=s.players[0].front.find(c=>c?.uid===source.uid);
 const ally=s.players[0].front.find(c=>c?.uid===other.uid);
 assert.equal(universalBp(pack,s,back),5000);
 assert.equal(universalBp(pack,s,ally),2000);
 back.buffs=[{bp:1000,untilTurn:s.turn}];
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.mode==='frontOnce'&&a.uid===back.uid));
 s=dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'high'});
 assert.equal(s.pending.bp,2000);
 assert.equal(s.pending.choices.includes(ally.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),true);
 s=dispatchUniversalAction(pack,s,{type:'chooseOwnBuff',uid:back.uid});
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===back.uid)),8000);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===ally.uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('an own-turn printed-energy count does not read live BP',()=>{
 const host=face({id:'HOST',name:'自己',bp:2000,energy:2,traits:['STAR'],passiveBonuses:[{
  condition:{kind:'ownPrintedTraitCount',turn:'own',min:3,zone:'field',excludeSelf:false,
   trait:'STAR',printedEnergy:2},bp:1000}]});
 const always=face({id:'ANY',name:'常駐',bp:2000,energy:2,traits:['STAR'],passiveBonuses:[{
  condition:{kind:'ownPrintedTraitCount',turn:'any',min:3,zone:'field',excludeSelf:false,
   trait:'STAR',printedEnergy:2},bp:1000}]});
 const ally=face({id:'ALLY',name:'同伴',bp:2000,energy:2,traits:['STAR'],implementation:'vanilla'});
 const costly=face({id:'COST',name:'三費',bp:2000,energy:3,traits:['STAR'],implementation:'vanilla'});
 const {pack,state}=match([host,always,ally,costly],{HOST:1,ANY:1,ALLY:1,COST:1},42);
 let s=main(pack,state);
 const mine=seat(s,0,'HOST','front',0);
 const stay=seat(s,0,'ANY','energy',0);
 assert.equal(universalBp(pack,s,mine),2000);
 const extra=seat(s,0,'COST','front',1);
 extra.buffs=[{bp:4000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,mine),2000);
 const third=seat(s,0,'ALLY','front',2);
 assert.equal(universalBp(pack,s,mine),3000);
 assert.equal(universalBp(pack,s,stay),3000);
 s=opponentMain(pack,s);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===mine.uid)),2000);
 assert.equal(universalBp(pack,s,s.players[0].energy.find(c=>c?.uid===stay.uid)),3000);
 s=ownMainAgain(pack,s);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===mine.uid)),3000);
});

test('a nested public reveal stays on a character play or attack effect',()=>{
 assert.throws(()=>createUniversalPack({id:'probe',version:'imc-reveal-event',cards:[
  face({id:'EVT',name:'事件',type:'event',energy:0,ap:1,bp:0,gen:0,effects:{onPlay:[{
   op:'ifLiveThen',when:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:5000},
   then:[{op:'revealTopTraitOptionalHand',trait:'STAR'}]}]}})
 ]}),/public trait reveal/);
});
