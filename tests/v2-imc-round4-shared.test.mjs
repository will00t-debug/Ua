// Round 4 shared rules. Synthetic cards exercise the new ops.
// Unfinished IMC cards stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {ownEffectRaidCause,matchesV2LiveCondition,countOwnPrintedTrait} from '../dist/universal-v2/field-conditions.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';

function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed=4){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe',version:'imc-r4-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++){
  const next=legalUniversalActions(pack,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(pack,s,next);
 }
 assert.equal(s.phase,'main');
 return {pack,s};
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
function play(pack,s,id,line='front'){
 const card=hold(s,id);
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [dispatchUniversalAction(pack,s,action),card];
}
function playEvent(pack,s,id){
 const card=hold(s,id);
 const action=legalUniversalActions(pack,s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id);
 return [dispatchUniversalAction(pack,s,action),card];
}
function live(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const found=p[line].find(c=>c?.uid===uid);
  if(found)return found;
 }
 return null;
}
function choose(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,JSON.stringify(s.pending&&{kind:s.pending.kind,choices:s.pending.choices}));
 return dispatchUniversalAction(pack,s,action);
}
const union={op:'chooseFrontOrOwnTrait',bp:500,optional:false,trait:'LiPPS',excludeName:'速水奏'};
const unionMay={...union,optional:true};

test('one choice covers an opponent front or an own trait, and can drop a name',()=>{
 const {pack,s:start}=open([
  face({id:'GEN',name:'能源',color:'blue',gen:1,energy:0}),
  face({id:'SELF',name:'其他',traits:['LiPPS'],effects:{onPlay:[union]}}),
  face({id:'ALLY',name:'同伴',traits:['LiPPS']}),
  face({id:'NAMED',name:'速水奏',traits:['LiPPS']}),
  face({id:'PLAIN',name:'無特徵'}),
  face({id:'FOE',name:'前線',bp:3000}),
  face({id:'BACK',name:'能量區',bp:2500})
 ],11);
 let s=start;
 fuel(s);
 const ally=seat(s,0,'ALLY','energy',0,true);
 const named=seat(s,0,'NAMED','front',1);
 const plain=seat(s,0,'PLAIN','front',2);
 const foe=seat(s,1,'FOE','front',0,true);
 const back=seat(s,1,'BACK','energy',0,true);
 [s]=play(pack,s,'SELF','front');
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.optional,false);
 const ids=s.pending.choices;
 assert.ok(ids.includes(ally.uid));
 assert.ok(ids.includes(foe.uid));
 const self=s.players[0].front.find(c=>c?.cardId==='SELF');
 assert.ok(ids.includes(self.uid));
 assert.equal(ids.includes(named.uid),false);
 assert.equal(ids.includes(plain.uid),false);
 assert.equal(ids.includes(back.uid),false);
 const actions=legalUniversalActions(pack,s);
 assert.equal(actions.some(a=>a.uid===null),false);
 assert.equal(actions.every(a=>a.type==='chooseAnyBuff'),true);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseAnyBuff',uid:null}),/not currently legal|Mandatory buff/);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseAnyBuff',uid:back.uid}),/not currently legal/);
 s=choose(pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===foe.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,live(s,foe.uid)),3500);
 assert.equal(universalBp(pack,s,live(s,ally.uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('an optional union can be declined, and no target opens nothing',()=>{
 const {pack,s:start}=open([
  face({id:'MAY',name:'可選',traits:['LiPPS'],effects:{onPlay:[unionMay]}}),
  face({id:'NONE',name:'落空',effects:{onPlay:[union]}}),
  face({id:'FOE',name:'前線'})
 ],12);
 let s=start;
 fuel(s);
 const foe=seat(s,1,'FOE','front',0,true);
 [s]=play(pack,s,'MAY');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),true);
 s=choose(pack,s,a=>a.type==='chooseAnyBuff'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,live(s,foe.uid)),2000);
 const empty=open([
  face({id:'NONE',name:'落空',effects:{onPlay:[union]}}),
  face({id:'BACK',name:'能量區'})
 ],121);
 fuel(empty.s);
 seat(empty.s,1,'BACK','energy',0,true);
 let quiet=empty.s;
 [quiet]=play(empty.pack,quiet,'NONE');
 assert.equal(quiet.pending,null);
 assert.equal(assertUniversalMatch(empty.pack,quiet),true);
});

test('a mandatory union event cannot be played without a target',()=>{
 const event=face({id:'EVT',name:'必須',type:'event',bp:0,effects:{onPlay:[union]}});
 const {pack,s}=open([event,face({id:'HIGH',name:'過高',bp:9000})],13);
 fuel(s);
 seat(s,1,'HIGH','energy',0,true);
 const card=hold(s,'EVT');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='event'&&a.uid===card.uid),false);
});

test('the older either-side buff still reaches an energy character',()=>{
 const old={op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:true};
 const {pack,s:start}=open([
  face({id:'OLD',name:'舊句',effects:{onPlay:[old]}}),
  face({id:'BACK',name:'能量區'})
 ],14);
 let s=start;
 fuel(s);
 const back=seat(s,1,'BACK','energy',0,true);
 [s]=play(pack,s,'OLD');
 assert.ok(s.pending.choices.includes(back.uid));
 s=choose(pack,s,a=>a.uid===back.uid);
 assert.equal(universalBp(pack,s,live(s,back.uid)),3000);
});

test('outside recovery reads the printed face and raises only the character count',()=>{
 const board={players:[{front:[
  {uid:'src',type:'character',traits:['Starry'],energy:2},
  {uid:'field',type:'field',traits:['Starry'],energy:2}
 ],energy:[{uid:'mate',type:'character',traits:['Starry'],energy:2}]},{front:[],energy:[]}]};
 const printed=c=>c;
 assert.equal(countOwnPrintedTrait(board,0,'src',{trait:'Starry',printedEnergy:2,excludeSelf:false},printed),2);
 assert.equal(countOwnPrintedTrait(board,0,'src',{trait:'Starry',printedEnergy:2,excludeSelf:true},printed),1);
 const recover={op:'recoverOutsideFiltered',optional:true,max:1,trait:'Starry',energyExact:2,
  raiseMax:{trait:'Starry',energyExact:2,min:3,max:2}};
 const bodies=[
  face({id:'GET',name:'回收',type:'event',bp:0,effects:{onPlay:[recover]}}),
  face({id:'EXACT',name:'恰好',traits:['Starry'],energy:2}),
  face({id:'LOW',name:'較低',traits:['Starry'],energy:1,ap:3}),
  face({id:'HIGH',name:'較高',traits:['Starry'],energy:3,ap:1}),
  face({id:'OTHER',name:'異特徵',energy:2})
 ];
 const lowBoard=open(bodies,15);
 fuel(lowBoard.s);
 seat(lowBoard.s,0,'EXACT','front',0);
 seat(lowBoard.s,0,'EXACT','energy',0,true);
 const low=pull(lowBoard.s,0,'LOW'),high=pull(lowBoard.s,0,'HIGH'),other=pull(lowBoard.s,0,'OTHER');
 const exact=pull(lowBoard.s,0,'EXACT');
 lowBoard.s.players[0].outside.push(low,high,other,exact);
 let s=lowBoard.s;
 [s]=playEvent(lowBoard.pack,s,'GET');
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[exact.uid]);
 assert.equal(s.pending.remaining,undefined);
 s=choose(lowBoard.pack,s,a=>a.uid===null);
 assert.equal(s.players[0].outside.some(c=>c.uid===exact.uid),true);

 const highBoard=open(bodies,151);
 fuel(highBoard.s);
 seat(highBoard.s,0,'EXACT','front',0);
 seat(highBoard.s,0,'EXACT','front',1);
 seat(highBoard.s,0,'EXACT','energy',0,true);
 const first=pull(highBoard.s,0,'EXACT'),second=pull(highBoard.s,0,'LOW');
 const rejected=pull(highBoard.s,0,'HIGH');
 highBoard.s.players[0].outside.push(first,second,rejected);
 s=highBoard.s;
 [s]=playEvent(highBoard.pack,s,'GET');
 assert.equal(s.pending.remaining,2);
 assert.deepEqual(s.pending.choices,[first.uid]);
 s=choose(highBoard.pack,s,a=>a.uid===first.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===first.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===second.uid),true);

 const sourceCounts=open([
  face({id:'GEN',name:'能源',gen:2}),
  face({id:'SELF',name:'自己',traits:['Starry'],energy:2,effects:{onPlay:[recover]}}),
  face({id:'EXACT',name:'恰好',traits:['Starry'],energy:2})
 ],152);
 fuel(sourceCounts.s);
 seat(sourceCounts.s,0,'GEN','energy',0,true);
 seat(sourceCounts.s,0,'EXACT','front',0);
 seat(sourceCounts.s,0,'EXACT','front',1);
 const kept=pull(sourceCounts.s,0,'EXACT'),extra=pull(sourceCounts.s,0,'EXACT');
 sourceCounts.s.players[0].outside.push(kept,extra);
 s=sourceCounts.s;
 [s]=play(sourceCounts.pack,s,'SELF');
 assert.equal(s.pending.remaining,2);
 s=choose(sourceCounts.pack,s,a=>a.uid===kept.uid);
 assert.equal(s.pending.remaining,undefined);
 assert.ok(s.pending.choices.includes(extra.uid));
 s=choose(sourceCounts.pack,s,a=>a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(sourceCounts.pack,s),true);
});

test('paid outside recovery can require a raid keyword without reading AP',()=>{
 const pay={op:'optionalPayApThen',ap:1,optional:true,then:[
  {op:'recoverOutsideFiltered',optional:true,max:1,trait:'熱情',color:'yellow',raidKeyword:true}]};
 const old={op:'recoverOutsideUnderEnergy',energy:2,optional:true};
 const oldBoard=open([
  face({id:'OLD',name:'舊回收',effects:{onPlay:[old]}}),
  face({id:'LOW',name:'較低',energy:1,ap:3}),
  face({id:'HIGH',name:'較高',energy:3,ap:1})
 ],153);
 fuel(oldBoard.s);
 const low=pull(oldBoard.s,0,'LOW'),high=pull(oldBoard.s,0,'HIGH');
 oldBoard.s.players[0].outside.push(low,high);
 let oldState=oldBoard.s;
 [oldState]=play(oldBoard.pack,oldState,'OLD');
 const oldIds=oldState.pending.choices.map(uid=>oldState.players[0].outside.find(c=>c.uid===uid).cardId);
 assert.deepEqual(oldIds,['LOW']);
 const {pack,s:start}=open([
  face({id:'PAY',name:'付費',effects:{onPlay:[pay]}}),
  face({id:'RAID',name:'突襲黃',color:'yellow',traits:['熱情'],raidName:'突襲黃',
   raidBaseNames:['突襲黃','底板'],raidRequiresNames:['底板']}),
  face({id:'NORAID',name:'無突襲',color:'yellow',traits:['熱情']}),
  face({id:'BLUE',name:'藍熱情',traits:['熱情'],raidName:'藍熱情',
   raidBaseNames:['藍熱情','底板'],raidRequiresNames:['底板']})
 ],154);
 let s=start;
 fuel(s,3);
 const raid=pull(s,0,'RAID'),noraid=pull(s,0,'NORAID'),blue=pull(s,0,'BLUE');
 s.players[0].outside.push(raid,noraid,blue);
 [s]=play(pack,s,'PAY','energy');
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=choose(pack,s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(s.players[0].outside.some(c=>c.uid===raid.uid),true);
 [s]=play(pack,s,'PAY');
 s=choose(pack,s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[raid.uid]);
 s=choose(pack,s,a=>a.uid===raid.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===raid.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===noraid.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===blue.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a mandatory outside recovery cannot skip and stops when the cards run out',()=>{
 const must={op:'recoverOutsideFiltered',optional:false,max:2,trait:'LiPPS',energyAtMost:2};
 const {pack,s:start}=open([
  face({id:'MUST',name:'必拿',effects:{onPlay:[must]}}),
  face({id:'ONE',name:'一',traits:['LiPPS'],energy:2}),
  face({id:'TWO',name:'二',traits:['LiPPS'],energy:0}),
  face({id:'EVT',name:'空事件',type:'event',bp:0,effects:{onPlay:[must]}})
 ],16);
 let s=start;
 fuel(s);
 const one=pull(s,0,'ONE'),two=pull(s,0,'TWO');
 s.players[0].outside.push(one,two);
 [s]=play(pack,s,'MUST');
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),false);
 s=choose(pack,s,a=>a.uid===one.uid);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),false);
 s=choose(pack,s,a=>a.uid===two.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.filter(c=>c.uid===one.uid||c.uid===two.uid).length,2);

 const lonely=pull(s,0,'ONE');
 s.players[0].outside.push(lonely);
 [s]=play(pack,s,'MUST','energy');
 s=choose(pack,s,a=>a.uid===lonely.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 const empty=open([face({id:'EVT',name:'空事件',type:'event',bp:0,effects:{onPlay:[must]}})],17);
 fuel(empty.s);
 const event=hold(empty.s,'EVT');
 assert.equal(legalUniversalActions(empty.pack,empty.s).some(a=>a.type==='event'&&a.uid===event.uid),false);
});

test('a trait-count retire ceiling includes the source unless told not to',()=>{
 const scale={op:'retireOppFrontUnderBp',bp:3000,scaleTrait:'積極',scaleMin:3,scaleBp:5000};
 const dropped={...scale,scaleExcludeSelf:true};
 const {pack,s:start}=open([
  face({id:'CUT',name:'退場',traits:['積極'],effects:{onPlay:[scale]}}),
  face({id:'DROP',name:'排除',traits:['積極'],effects:{onPlay:[dropped]}}),
  face({id:'MATE',name:'同伴',traits:['積極']}),
  face({id:'SMALL',name:'小',bp:2500}),
  face({id:'MID',name:'中',bp:4500}),
  face({id:'BIG',name:'大',bp:5500}),
  face({id:'EVT',name:'必退',type:'event',bp:0,effects:{onPlay:[scale]}})
 ],18);
 let s=start;
 fuel(s);
 seat(s,0,'MATE','front',1);
 seat(s,0,'MATE','energy',0,true);
 const small=seat(s,1,'SMALL','front',0,true);
 const mid=seat(s,1,'MID','front',1,true);
 const big=seat(s,1,'BIG','front',2,true);
 [s]=play(pack,s,'CUT');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,5000);
 assert.equal(s.pending.optional,undefined);
 assert.ok(s.pending.choices.includes(small.uid));
 assert.ok(s.pending.choices.includes(mid.uid));
 assert.equal(s.pending.choices.includes(big.uid),false);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:null}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:big.uid}),/not currently legal/);
 s=choose(pack,s,a=>a.type==='chooseRetireBp'&&a.uid===mid.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[1],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===mid.uid),true);

 const low=open([
  face({id:'CUT',name:'退場',traits:['積極'],effects:{onPlay:[scale]}}),
  face({id:'MATE',name:'同伴',traits:['積極']}),
  face({id:'MID',name:'中',bp:4500}),
  face({id:'SMALL',name:'小',bp:2500})
 ],19);
 fuel(low.s);
 seat(low.s,0,'MATE','front',1);
 const still=seat(low.s,1,'MID','front',0,true);
 const tiny=seat(low.s,1,'SMALL','front',1,true);
 let narrow=low.s;
 [narrow]=play(low.pack,narrow,'CUT');
 assert.equal(narrow.pending.limit,3000);
 assert.equal(narrow.pending.choices.includes(still.uid),false);
 assert.ok(narrow.pending.choices.includes(tiny.uid));
 narrow=choose(low.pack,narrow,a=>a.uid===tiny.uid);
 assert.equal(narrow.pending,null);

 const without=open([
  face({id:'DROP',name:'排除',traits:['積極'],effects:{onPlay:[dropped]}}),
  face({id:'MATE',name:'同伴',traits:['積極']}),
  face({id:'MID',name:'中',bp:4500}),
  face({id:'SMALL',name:'小',bp:2500})
 ],20);
 fuel(without.s);
 seat(without.s,0,'MATE','front',1);
 seat(without.s,0,'MATE','energy',0,true);
 const kept=seat(without.s,1,'MID','front',0,true);
 const smallKept=seat(without.s,1,'SMALL','front',1,true);
 let excluded=without.s;
 [excluded]=play(without.pack,excluded,'DROP');
 assert.equal(excluded.pending.limit,3000);
 assert.equal(excluded.pending.choices.includes(kept.uid),false);
 assert.ok(excluded.pending.choices.includes(smallKept.uid));
 excluded=choose(without.pack,excluded,a=>a.uid===smallKept.uid);
 assert.equal(excluded.pending,null);
 assert.equal(excluded.players[1].front[0].uid,kept.uid);

 const none=open([
  face({id:'CUT',name:'退場',traits:['積極'],effects:{onPlay:[scale]}}),
  face({id:'BIG',name:'大',bp:5500})
 ],21);
 fuel(none.s);
 const stayed=seat(none.s,1,'BIG','front',0,true);
 let quiet=none.s;
 [quiet]=play(none.pack,quiet,'CUT');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].front[0].uid,stayed.uid);
 assert.equal(assertUniversalMatch(none.pack,quiet),true);

 const blocked=open([
  face({id:'EVT',name:'必退',type:'event',bp:0,effects:{onPlay:[scale]}}),
  face({id:'BIG',name:'大',bp:5500})
 ],22);
 fuel(blocked.s);
 seat(blocked.s,1,'BIG','front',0,true);
 const event=hold(blocked.s,'EVT');
 assert.equal(legalUniversalActions(blocked.pack,blocked.s).some(a=>a.type==='event'&&a.uid===event.uid),false);
});

test('the ready trait ceiling stays on 030, and the pack is 92 cards',()=>{
 const job=IMC_PROGRAMS_001_050['IMC-1-030'].effects.onPlay[0];
 assert.equal(job.op,'retireOppFrontUnderBp');
 assert.equal(job.scaleExcludeSelf,undefined);
 assert.equal(job.bp,3000);
 assert.equal(job.scaleMin,3);
 assert.equal(job.scaleBp,5000);
 const pack=createImcV2Pack();
 assert.equal(Object.keys(pack.cards).length,92);
 assert.deepEqual(['IMC-1-028','IMC-1-033','IMC-1-036','IMC-1-065','IMC-1-078','IMC-1-080','IMC-1-112']
  .filter(id=>pack.cards[id]),['IMC-1-028','IMC-1-033','IMC-1-036','IMC-1-065','IMC-1-078','IMC-1-080','IMC-1-112']);
 assert.equal(pack.cards['IMC-1-030'].effects.onPlay[0].scaleExcludeSelf,undefined);
 assert.equal(pack.cards['IMC-1-062'].effects.onPlay[0].scaleBp,5000);
 assert.equal(pack.cards['IMC-1-087'].effects.onPlay[0].energyExact,2);
 assert.equal(pack.cards['IMC-1-099'].effects.onPlay[0].bp,2000);
 assert.equal(pack.cards['IMC-1-113'].effects.onPlay[0].optional,true);
 assert.equal(pack.cards['IMC-1-020'].mainAbility.then[0].op,'raidOwnHandNamed');
 assert.equal(pack.cards['IMC-1-024'].effects.onPlay[1].when.kind,'selfOwnEffectRaid');
 assert.equal(pack.cards['IMC-1-111'].effects.onAttack[0].op,'drawDiscard');
 assert.equal(pack.cards['IMC-1-028'].effects.onPlay[0].op,'choosePrintedOptions');
 assert.equal(pack.cards['IMC-1-051'],undefined);
});

test('own-effect raid is the effect or life raid, not a paid raid or a plain entry',()=>{
 for(const cause of ['handEffectRaid','outsideEffectRaid','deckEffectRaid','removedEffectRaid','lifeRaid'])
  assert.equal(ownEffectRaidCause(cause),true,cause);
 for(const cause of ['paidRaid','handEffect','outsideEffect','deckEffect','recoveredEffect','ownEffect','lifeColor',undefined,null])
  assert.equal(ownEffectRaidCause(cause),false,String(cause));
 const when={kind:'selfOwnEffectRaid',turn:'any'};
 const state={active:1,players:[{},{}]};
 assert.equal(matchesV2LiveCondition(state,0,'x',when,()=>({}),()=>0,()=>0,undefined,'lifeRaid'),true);
 assert.equal(matchesV2LiveCondition(state,0,'x',when,()=>({}),()=>0,()=>0,undefined,'paidRaid'),false);
 assert.equal(matchesV2LiveCondition(state,0,'x',when,()=>({}),()=>0,()=>0,undefined,'handEffect'),false);
 assert.throws(()=>createUniversalPack({id:'probe',version:'imc-r4-turn',cards:[face({
  id:'BAD',name:'回合',effects:{onPlay:[{op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'own'},
   then:[{op:'draw',count:1}]}]}
 })]}),/own-effect raid is not a turn gate/);
});

test('a paid raid and a plain effect entry do not count, and an effect raid does',()=>{
 const star={
  id:'STAR',name:'星',energy:1,raidName:'星',raidBaseNames:['星','底板'],raidRequiresNames:['底板'],
  effects:{
   onPlay:[{op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'any'},then:[{op:'draw',count:1}]}],
   onRaid:[{op:'buffSelf',bp:1000}]
  }
 };
 const cards=[
  face({id:'GEN',name:'能源',gen:1}),
  face(star),
  face({id:'BASE',name:'底板'}),
  face({id:'OTHER',name:'其他'}),
  face({id:'HOOK',name:'使之',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
   color:'blue',maxEnergy:2,ap:1,max:1,optional:true,names:['星']}]}})
 ];
 const paid=open(cards,31);
 fuel(paid.s);
 seat(paid.s,0,'GEN','energy',0,true);
 const base=seat(paid.s,0,'BASE','front',0,true);
 const other=seat(paid.s,0,'OTHER','front',1,true);
 const starCard=hold(paid.s,'STAR');
 const top=paid.s.players[0].deck[0].uid;
 assert.equal(legalUniversalActions(paid.pack,paid.s).some(a=>a.type==='raid'&&a.uid===starCard.uid&&a.baseUid===other.uid),false);
 let s=choose(paid.pack,paid.s,a=>a.type==='raid'&&a.uid===starCard.uid&&a.baseUid===base.uid);
 const lived=s.players[0].front.find(c=>c?.cardId==='STAR');
 assert.ok(lived);
 assert.equal(universalBp(paid.pack,s,lived),3000);
 assert.equal(s.players[0].deck.some(c=>c.uid===top)||s.players[0].hand.some(c=>c.uid===top),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===top),false);
 assert.equal(assertUniversalMatch(paid.pack,s),true);

 const rested=open(cards,32);
 fuel(rested.s);
 seat(rested.s,0,'BASE','front',0,true);
 hold(rested.s,'STAR');
 let rest=rested.s;
 [rest]=play(rested.pack,rest,'HOOK','energy');
 const handStar=rest.players[0].hand.find(c=>c.cardId==='STAR');
 const hookTop=rest.players[0].deck[0].uid;
 rest=choose(rested.pack,rest,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&a.uid===handStar.uid&&a.line==='front');
 const entered=rest.players[0].front.find(c=>c?.cardId==='STAR');
 assert.equal(entered.ready,false);
 assert.equal(universalBp(rested.pack,rest,entered),2000);
 assert.equal(rest.players[0].hand.some(c=>c.uid===hookTop),false);
 assert.equal(assertUniversalMatch(rested.pack,rest),true);

 const caused=open(cards,33);
 fuel(caused.s);
 const host=seat(caused.s,0,'BASE','front',0,true);
 hold(caused.s,'STAR');
 let raid=caused.s;
 [raid]=play(caused.pack,raid,'HOOK');
 const fromHand=raid.players[0].hand.find(c=>c.cardId==='STAR');
 const drawn=raid.players[0].deck[0].uid;
 raid=choose(caused.pack,raid,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&
  a.uid===fromHand.uid&&a.baseUid===host.uid&&a.line==='front');
 const topCard=raid.players[0].front.find(c=>c?.cardId==='STAR');
 assert.equal(universalBp(caused.pack,raid,topCard),3000);
 assert.equal(raid.players[0].hand.some(c=>c.uid===drawn),true);
 assert.equal(assertUniversalMatch(caused.pack,raid),true);
});

test('filtered recovery and the union choice reject mixed or empty shapes',()=>{
 const bad=(card,pattern)=>assert.throws(()=>createUniversalPack({
  id:'probe',version:'imc-r4-bad-'+card.id,cards:[face(card),...Array.from({length:12},(_,i)=>face({
   id:'FILL-'+i,name:'填充'+i,implementation:'vanilla'}))]
 }),pattern);
 bad(face({id:'BOTH',name:'混用',effects:{onPlay:[{op:'recoverOutsideFiltered',optional:true,max:1,
  energyAtMost:2,energyExact:2}]}}),/invalid filtered outside recovery/);
 bad(face({id:'EMPTY',name:'空',effects:{onPlay:[{op:'recoverOutsideFiltered',optional:true,max:1}]}}),/invalid filtered outside recovery/);
 bad(face({id:'NOTRAIT',name:'無特徵',effects:{onPlay:[{op:'chooseFrontOrOwnTrait',bp:500,optional:false}]}}),/invalid front-or-own-trait/);
});
