// Round 9 A. Shared engine only. Synthetic cards, no ready flags.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';

const OPEN=['IMC-1-011','IMC-1-012','IMC-1-039','IMC-1-051','IMC-1-061','IMC-1-075','IMC-1-107'];
const MHA_OPEN=['MHA-1-063','MHA-1-101','MHA-1-102','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108','MHA-1-109'];

function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,implementation:implementation||(Object.keys(effects).length||rest.passiveBonuses||rest.mainAbility?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed=91){
 const fillers=Array.from({length:Math.max(12,13-cards.length)},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe',version:'r9a-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
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
function stackTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
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
 assert.throws(()=>createUniversalPack({id:'bad',version:'r9a',cards:[card]}),pattern);
}
const frontWhen=min=>({kind:'oppFrontCountAtLeast',turn:'any',min});
const ownFront=min=>({kind:'ownFrontCountAtLeast',turn:'any',min});
const lasting={op:'buffSelfUntilNextOwnStart',bp:1000,line:'front'};
const lookTake={to:'hand',max:1,publish:true,type:'character',thenDrawIfName:'緑谷 出久'};
const kit={op:'grantOwnFieldAttackKit',bp:2500,optional:false,sniperNames:['オールマイト','緑谷 出久']};

test('the seven IMC cards and the eight MHA starter cards are in the battle packs',()=>{
 const imc=createImcV2Pack();
 for(const id of OPEN)assert.equal(imc.cards[id].id,id);
 assert.equal(imc.cards['IMC-1-011'].bpGainFollow.bp,1000);
 assert.equal(imc.cards['IMC-1-012'].effects.onPlay[0].op,'grantConditionalSniperThisTurn');
 assert.equal(imc.cards['IMC-1-039'].mainAbility.op,'discardExactFrontMove');
 assert.equal(imc.cards['IMC-1-051'].mainAbility.op,'restRetireSequence');
 assert.equal(imc.cards['IMC-1-061'].unblockedAttack.optional,true);
 assert.equal(imc.cards['IMC-1-075'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.equal(imc.cards['IMC-1-107'].mainAbility.draw,1);
 const mha=createMhaV2Pack();
 for(const id of MHA_OPEN)assert.equal(mha.cards[id].id,id);
 assert.equal(mha.cards['MHA-1-063'].triggerEffect.op,'retireOppFront');
 assert.equal(mha.cards['MHA-1-107'].raidName,'緑谷 出久');
});

test('front character counts reject a bad minimum and ignore the other line',()=>{
 const bonus=condition=>({bp:1000,condition});
 const shell=face({id:'ME',name:'自己',bp:3000,passiveBonuses:[bonus(frontWhen(3))]});
 reject(face({id:'BAD',name:'自己',passiveBonuses:[bonus(frontWhen(0))]}),/invalid front character count/);
 reject(face({id:'BAD',name:'自己',passiveBonuses:[bonus(frontWhen(5))]}),/invalid front character count/);
 reject(face({id:'BAD',name:'自己',passiveBonuses:[bonus({kind:'oppFrontCountAtLeast',turn:'any'})]}),/invalid front character count/);
 const {pack,s}=open([
  shell,
  face({id:'A',name:'甲',implementation:'vanilla'}),
  face({id:'B',name:'乙',implementation:'vanilla'}),
  face({id:'C',name:'丙',implementation:'vanilla'}),
  face({id:'BACK',name:'能量',implementation:'vanilla'}),
  face({id:'MINE',name:'自己前線',implementation:'vanilla'})
 ],92);
 const me=seat(s,0,'ME','front',0,true);
 seat(s,1,'A','front',0,true);
 seat(s,1,'B','front',1,true);
 seat(s,0,'MINE','front',1,true);
 seat(s,1,'BACK','energy',0,true);
 assert.equal(universalBp(pack,s,me),3000);
 const hidden=seat(s,1,'C','front',2,true);
 hidden.faceDown=true;
 assert.equal(matchesV2LiveCondition(s,0,me.uid,frontWhen(3),()=>({type:'character'})),false);
 hidden.faceDown=false;
 assert.equal(universalBp(pack,s,me),4000);
 s.players[1].front[2]=null;
 s.players[1].energy[1]=hidden;
 assert.equal(universalBp(pack,s,me),3000);
});

test('a field gains one extra pip only while two own front characters are present',()=>{
 const school=face({id:'SCHOOL',name:'雄英',type:'field',color:'green',gen:1,bp:0,
  passiveBonuses:[{extraEnergy:1,condition:ownFront(2)}]});
 const ownTurn=face({id:'TURN',name:'回合',type:'field',color:'green',gen:1,bp:0,
  passiveBonuses:[{extraEnergy:1,condition:{kind:'ownFrontCountAtLeast',turn:'own',min:2}}]});
 reject(face({id:'BAD',name:'場域',type:'field',color:'green',gen:1,bp:0,
  passiveBonuses:[{extraEnergy:1,condition:ownFront(5)}]}),/invalid front character count/);
 const {pack,s}=open([
  school,ownTurn,
  face({id:'A',name:'甲',implementation:'vanilla'}),
  face({id:'B',name:'乙',implementation:'vanilla'}),
  face({id:'C',name:'丙',implementation:'vanilla'})
 ],93);
 const field=seat(s,0,'SCHOOL','energy',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).green,1);
 seat(s,0,'A','front',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).green,1);
 seat(s,0,'B','energy',1,true);
 seat(s,1,'C','front',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).green,1);
 seat(s,0,'B','front',1,true);
 assert.equal(universalEnergyByColor(pack,s,0).green,2);
 const gated=open([ownTurn,
  face({id:'A',name:'甲',implementation:'vanilla'}),
  face({id:'B',name:'乙',implementation:'vanilla'})
 ],94);
 seat(gated.s,0,'TURN','energy',0,true);
 seat(gated.s,0,'A','front',0,true);
 seat(gated.s,0,'B','front',1,true);
 assert.equal(universalEnergyByColor(gated.pack,gated.s,0).green,2);
 const opp=passTo(gated.pack,gated.s,1,'main');
 assert.equal(universalEnergyByColor(gated.pack,opp,0).green,1);
 assert.equal(field.cardId,'SCHOOL');
});

test('on-play draw waits for three opposing front characters',()=>{
 const hero=face({id:'HERO',name:'綠谷',raidName:'緑谷 出久',effects:{onPlay:[{
  op:'ifLiveThen',when:frontWhen(3),then:[{op:'draw',count:1}]}]}});
 const bodies=[hero,
  face({id:'A',name:'甲',implementation:'vanilla'}),
  face({id:'B',name:'乙',implementation:'vanilla'}),
  face({id:'C',name:'丙',implementation:'vanilla'})];
 const low=open(bodies,95);
 fuel(low.s);
 seat(low.s,1,'A','front',0,true);
 seat(low.s,1,'B','front',1,true);
 hold(low.s,'HERO');
 const lowHand=low.s.players[0].hand.length,lowDeck=low.s.players[0].deck.length;
 let [s]=play(low.pack,low.s,'HERO');
 assert.equal(assertUniversalMatch(low.pack,s),true);
 assert.equal(s.players[0].hand.length,lowHand-1);
 assert.equal(s.players[0].deck.length,lowDeck);
 assert.equal(s.pending,null);
 const high=open(bodies,96);
 fuel(high.s);
 seat(high.s,1,'A','front',0,true);
 seat(high.s,1,'B','front',1,true);
 seat(high.s,1,'C','front',2,true);
 hold(high.s,'HERO');
 const highHand=high.s.players[0].hand.length,highDeck=high.s.players[0].deck.length;
 [s]=play(high.pack,high.s,'HERO');
 assert.equal(s.players[0].hand.length,highHand);
 assert.equal(s.players[0].deck.length,highDeck-1);
 assert.equal(assertUniversalMatch(high.pack,s),true);
});

test('lasting BP is gained on the front and skipped on the energy line',()=>{
 const printed=face({id:'MIGHT',name:'歐爾麥特',bp:4000,effects:{onPlay:[lasting]}});
 reject(face({id:'BAD',name:'線',effects:{onPlay:[{...lasting,line:'energy'}]}}),
  /invalid next-own-start/);
 reject(face({id:'BAD',name:'零',effects:{onPlay:[{...lasting,bp:0}]}}),
  /invalid next-own-start/);
 reject(face({id:'OLD',name:'舊形',effects:{onPlay:[
  {op:'buffSelfUntilNextOwnStart',bp:1000}]}}),/nested inside gated onPlay/);
 reject(face({id:'EVT',name:'事件',type:'event',bp:0,gen:0,effects:{onPlay:[lasting]}}),
  /character onPlay/);
 const front=open([printed],97);
 fuel(front.s);
 let [s,card]=play(front.pack,front.s,'MIGHT','front');
 let live=s.players[0].front.find(c=>c.uid===card.uid);
 assert.equal(universalBp(front.pack,s,live),5000);
 s=passTo(front.pack,s,1,'main');
 live=s.players[0].front.find(c=>c.uid===card.uid);
 assert.equal(universalBp(front.pack,s,live),5000);
 s=passTo(front.pack,s,0,'start');
 live=s.players[0].front.find(c=>c.uid===card.uid);
 assert.equal(universalBp(front.pack,s,live),4000);
 const energy=open([printed],98);
 fuel(energy.s);
 [s,card]=play(energy.pack,energy.s,'MIGHT','energy');
 live=s.players[0].energy.find(c=>c.uid===card.uid);
 assert.equal(universalBp(energy.pack,s,live),4000);
 assert.equal((live.buffs||[]).some(b=>Number.isInteger(b.untilOwnTurnStart)),false);
});

test('an attack may retire one opposing front character at the printed BP ceiling',()=>{
 const may=face({id:'BLAST',name:'爆豪',bp:4000,effects:{onAttack:[
  {op:'retireOppFrontUnderBp',bp:2500,optional:true}]}});
 const must=face({id:'MUST',name:'必須',bp:4000,effects:{onAttack:[
  {op:'retireOppFrontUnderBp',bp:2500,optional:false}]}});
 const bodies=[may,must,
  face({id:'LOW',name:'低',bp:2500,implementation:'vanilla'}),
  face({id:'HIGH',name:'高',bp:3000,implementation:'vanilla'}),
  face({id:'BACK',name:'後',bp:1000,implementation:'vanilla'})];
 const skipped=open(bodies,100);
 const mine=seat(skipped.s,0,'BLAST','front',0,true);
 const low=seat(skipped.s,1,'LOW','front',0,true);
 const high=seat(skipped.s,1,'HIGH','front',1,true);
 seat(skipped.s,1,'BACK','energy',0,true);
 let s=passTo(skipped.pack,skipped.s,0,'attack');
 s=act(skipped.pack,s,a=>a.type==='attack'&&a.uid===mine.uid&&a.targetUid===undefined);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[low.uid]);
 assert.ok(legalUniversalActions(skipped.pack,s).some(a=>a.type==='chooseRetireBp'&&a.uid===null));
 assert.throws(()=>dispatchUniversalAction(skipped.pack,s,{type:'chooseRetireBp',uid:high.uid}),
  /not currently legal|Illegal BP/);
 s=act(skipped.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===null);
 assert.equal(s.players[1].front[0].uid,low.uid);
 const taken=open(bodies,101);
 const attacker=seat(taken.s,0,'BLAST','front',0,true);
 const victim=seat(taken.s,1,'LOW','front',0,true);
 seat(taken.s,1,'HIGH','front',1,true);
 s=passTo(taken.pack,taken.s,0,'attack');
 s=act(taken.pack,s,a=>a.type==='attack'&&a.uid===attacker.uid&&a.targetUid===undefined);
 s=act(taken.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===victim.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===victim.uid),true);
 const forced=open(bodies,102);
 const req=seat(forced.s,0,'MUST','front',0,true);
 seat(forced.s,1,'LOW','front',0,true);
 s=passTo(forced.pack,forced.s,0,'attack');
 s=act(forced.pack,s,a=>a.type==='attack'&&a.uid===req.uid&&a.targetUid===undefined);
 assert.equal(legalUniversalActions(forced.pack,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(forced.pack,s,{type:'chooseRetireBp',uid:null}),
  /not currently legal|cannot be skipped/);
 const none=open(bodies,103);
 const lone=seat(none.s,0,'BLAST','front',0,true);
 seat(none.s,1,'HIGH','front',0,true);
 s=passTo(none.pack,none.s,0,'attack');
 s=act(none.pack,s,a=>a.type==='attack'&&a.uid===lone.uid&&a.targetUid===undefined);
 assert.equal(s.pending.kind,'block');
});

test('one chosen character gains BP and a battle-win draw, and sniper only for a listed name',()=>{
 const spell=face({id:'SMASH',name:'粉碎',type:'event',energy:0,ap:1,bp:0,gen:0,
  trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[kit]}});
 const cards=[spell,
  face({id:'ALL',name:'オールマイト',bp:2000,implementation:'vanilla'}),
  face({id:'OTHER',name:'爆豪',bp:2000,implementation:'vanilla'}),
  face({id:'ALIAS',name:'出久',nameAliases:['緑谷 出久'],bp:2000,implementation:'dsl'}),
  face({id:'LONG',name:'オールマイト先輩',bp:2000,implementation:'vanilla'}),
  face({id:'LOW',name:'低',bp:2000,implementation:'vanilla'}),
  face({id:'HIGH',name:'高',bp:6000,implementation:'vanilla'})];
 reject(face({id:'BAD',name:'自己',effects:{onPlay:[kit]}}),/event onPlay/);
 reject(face({...spell,effects:{onPlay:[{...kit,sniperNames:[]}]}}),/invalid own-field attack kit/);
 reject(face({...spell,effects:{onPlay:[{...kit,sniperName:'オールマイト'}]}}),/invalid own-field attack kit/);
 reject(face({...spell,effects:{onPlay:[{...kit,bp:1000}]}}),/invalid own-field attack kit/);
 const named=open(cards,104);
 fuel(named.s);
 const hero=seat(named.s,0,'ALL','front',0,true);
 const other=seat(named.s,0,'OTHER','front',1,true);
 const low=seat(named.s,1,'LOW','front',0,true);
 const high=seat(named.s,1,'HIGH','front',1,true);
 let [s]=playEvent(named.pack,named.s,'SMASH');
 assert.equal(s.pending.kind,'effect-own-attack-kit');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(s.pending.sniperNames,['オールマイト','緑谷 出久']);
 assert.ok(s.pending.choices.includes(hero.uid));
 assert.ok(s.pending.choices.includes(other.uid));
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(legalUniversalActions(named.pack,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(named.pack,s,{type:'chooseOwnAttackKit',uid:null}),
  /not currently legal|cannot be skipped/);
 assert.throws(()=>dispatchUniversalAction(named.pack,s,{type:'chooseOwnAttackKit',uid:low.uid}),
  /not currently legal|Illegal attack kit/);
 const hand=s.players[0].hand.length;
 s=act(named.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===hero.uid);
 const granted=s.players[0].front.find(c=>c.uid===hero.uid);
 assert.equal(universalBp(named.pack,s,granted),4500);
 assert.equal(granted.eventSniperGranted.bp,2500);
 assert.equal(granted.attackWinDrawGranted.sourceUid.startsWith('0-'),true);
 s=passTo(named.pack,s,0,'attack');
 const shots=legalUniversalActions(named.pack,s).filter(a=>a.type==='attack'&&a.uid===hero.uid&&a.targetUid);
 assert.deepEqual(shots.map(a=>a.targetUid).sort(),[low.uid,high.uid].sort());
 s=act(named.pack,s,a=>a.type==='attack'&&a.uid===hero.uid&&a.targetUid===low.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front.some(c=>c?.uid===low.uid),false);
 assert.equal(s.players[0].hand.length,hand+1);
 const plain=open(cards,105);
 fuel(plain.s);
 const guy=seat(plain.s,0,'OTHER','front',0,true);
 const foe=seat(plain.s,1,'LOW','front',0,true);
 foe.ready=true;
 [s]=playEvent(plain.pack,plain.s,'SMASH');
 const before=s.players[0].hand.length;
 s=act(plain.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===guy.uid);
 const picked=s.players[0].front.find(c=>c.uid===guy.uid);
 assert.equal(picked.eventSniperGranted,undefined);
 assert.equal(universalBp(plain.pack,s,picked),4500);
 s=passTo(plain.pack,s,0,'attack');
 assert.equal(legalUniversalActions(plain.pack,s).some(a=>a.uid===guy.uid&&a.targetUid),false);
 s=act(plain.pack,s,a=>a.type==='attack'&&a.uid===guy.uid&&a.targetUid===undefined);
 s=act(plain.pack,s,a=>a.type==='chooseBlock'&&a.uid===foe.uid);
 assert.equal(s.players[0].hand.length,before+1);
 const alias=open(cards,106);
 fuel(alias.s);
 const aka=seat(alias.s,0,'ALIAS','front',0,true);
 [s]=playEvent(alias.pack,alias.s,'SMASH');
 s=act(alias.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===aka.uid);
 assert.equal(s.players[0].front[0].eventSniperGranted.bp,2500);
 const miss=open(cards,107);
 fuel(miss.s);
 const senior=seat(miss.s,0,'LONG','front',0,true);
 [s]=playEvent(miss.pack,miss.s,'SMASH');
 s=act(miss.pack,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===senior.uid);
 assert.equal(s.players[0].front[0].eventSniperGranted,undefined);
 assert.equal(universalBp(miss.pack,s,s.players[0].front[0]),4500);
 const empty=open([spell],108);
 fuel(empty.s);
 [s]=playEvent(empty.pack,empty.s,'SMASH');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.cardId==='SMASH'),true);
});

test('looking at the top publishes at most one character and draws only for the named card',()=>{
 const event=face({id:'CLASS',name:'A班',type:'event',energy:0,ap:1,bp:0,gen:0,effects:{onPlay:[{
  op:'lookTopScript',count:5,rest:'bottom',takes:[lookTake]}]}});
 const cards=[event,
  face({id:'EVT',name:'事件',type:'event',bp:0,gen:0,implementation:'vanilla'}),
  face({id:'OTHER',name:'爆豪',implementation:'vanilla'}),
  face({id:'HERO',name:'緑谷 出久',implementation:'vanilla'}),
  face({id:'ZONE',name:'場域',type:'field',bp:0,gen:1,implementation:'vanilla'}),
  face({id:'PLAIN',name:'普通',implementation:'vanilla'}),
  face({id:'NEXT',name:'下一張',implementation:'vanilla'})];
 reject(face({...event,effects:{onPlay:[{op:'lookTopScript',count:5,rest:'bottom',takes:[
  {to:'hand',max:1,publish:true}]}]}}),/invalid look script/);
 reject(face({...event,effects:{onPlay:[{op:'lookTopScript',count:5,rest:'bottom',takes:[
  {...lookTake,type:'event'}]}]}}),/invalid look script/);
 reject(face({...event,effects:{onPlay:[{op:'lookTopScript',count:5,rest:'bottom',takes:[
  {...lookTake,thenDrawIfName:''}]}]}}),/invalid look script/);
 const hit=open(cards,109);
 fuel(hit.s);
 const window=stackTop(hit.s,0,['EVT','OTHER','HERO','ZONE','PLAIN','NEXT']);
 const next=window[5];
 let [s]=playEvent(hit.pack,hit.s,'CLASS');
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(universalPrivateChoices(hit.pack,s,1),null);
 const mine=universalPrivateChoices(hit.pack,s,0);
 assert.deepEqual(mine.inspected.map(c=>c.cardId),['EVT','OTHER','HERO','ZONE','PLAIN']);
 const picks=mine.options.filter(o=>o.action.mode==='pick').map(o=>o.card.cardId).sort();
 assert.deepEqual(picks,['HERO','OTHER','PLAIN']);
 const eventUid=mine.inspected.find(c=>c.cardId==='EVT').uid;
 assert.throws(()=>dispatchUniversalAction(hit.pack,s,{type:'chooseTopScript',mode:'pick',uid:eventUid}),
  /not currently legal|cannot take/);
 const pub=universalPublicView(hit.pack,s,1);
 assert.equal(JSON.stringify(pub.pending).includes('EVT'),false);
 assert.equal(pub.publicReveals.some(x=>x.cardId==='HERO'),false);
 const heroUid=mine.inspected.find(c=>c.cardId==='HERO').uid;
 s=act(hit.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='pick'&&a.uid===heroUid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.players[0].hand.some(c=>c.uid===next.uid),false);
 assert.equal(universalPublicView(hit.pack,s,1).publicReveals.some(x=>x.cardId==='HERO'),true);
 assert.equal(universalPublicView(hit.pack,s,1).publicReveals.some(x=>x.cardId==='EVT'),false);
 assert.equal(universalPrivateChoices(hit.pack,s,1),null);
 s=finishOrder(hit.pack,s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[2].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===next.uid),true);
 assert.equal(s.players[0].deck.slice(-4).some(c=>c.uid===window[0].uid),true);
 const miss=open(cards,110);
 fuel(miss.s);
 const missed=stackTop(miss.s,0,['EVT','OTHER','HERO','ZONE','PLAIN','NEXT']);
 [s]=playEvent(miss.pack,miss.s,'CLASS');
 s=act(miss.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='pick'&&a.uid===missed[1].uid);
 s=finishOrder(miss.pack,s);
 assert.equal(s.players[0].hand.some(c=>c.uid===missed[1].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===missed[5].uid),false);
 assert.equal(s.players[0].deck[0].uid,missed[5].uid);
 const skipped=open(cards,111);
 fuel(skipped.s);
 const kept=stackTop(skipped.s,0,['EVT','OTHER','HERO','ZONE','PLAIN','NEXT']);
 [s]=playEvent(skipped.pack,skipped.s,'CLASS');
 s=act(skipped.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='skip');
 s=finishOrder(skipped.pack,s);
 assert.equal(s.players[0].hand.some(c=>kept.some(card=>card.uid===c.uid)),false);
 assert.equal(s.players[0].deck[0].uid,kept[5].uid);
 assert.equal(universalPublicView(skipped.pack,s,1).publicReveals.some(x=>x.cardId==='HERO'),false);
});

test('the active life trigger readies one own character and grants BP plus 3000',()=>{
 const cards=[
  face({id:'ACT',name:'飯田',bp:3000,trigger:'active',implementation:'vanilla'}),
  face({id:'REST',name:'休息',bp:1500,implementation:'vanilla'}),
  face({id:'LIVE',name:'已活動',bp:2000,implementation:'vanilla'}),
  face({id:'ZONE',name:'場域',type:'field',bp:0,gen:1,implementation:'vanilla'}),
  face({id:'ATK',name:'攻擊',bp:4000,implementation:'vanilla'})
 ];
 const {pack,s:start}=open(cards,112);
 const atk=seat(start,0,'ATK','front',0,true);
 const rested=seat(start,1,'REST','front',0,false);
 const live=seat(start,1,'LIVE','front',1,true);
 seat(start,1,'ZONE','energy',0,true);
 const trig=pull(start,1,'ACT');
 start.players[1].life.unshift(trig);
 let s=passTo(pack,start,0,'attack');
 s=act(pack,s,a=>a.type==='attack'&&a.uid===atk.uid);
 s=act(pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 const modes=legalUniversalActions(pack,s).filter(a=>a.type==='chooseTrigger');
 assert.ok(modes.some(a=>a.mode==='skip'));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===rested.uid));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===live.uid));
 assert.equal(modes.some(a=>a.uid===s.players[1].energy[0].uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseTrigger',mode:'active',uid:atk.uid}),
  /not currently legal|Illegal ACTIVE/);
 s=act(pack,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 const ready=s.players[1].front.find(c=>c.uid===rested.uid);
 assert.equal(ready.ready,true);
 assert.equal(universalBp(pack,s,ready),4500);
 const again=open(cards,113);
 const striker=seat(again.s,0,'ATK','front',0,true);
 const already=seat(again.s,1,'LIVE','front',0,true);
 const second=pull(again.s,1,'ACT');
 again.s.players[1].life.unshift(second);
 s=passTo(again.pack,again.s,0,'attack');
 s=act(again.pack,s,a=>a.type==='attack'&&a.uid===striker.uid);
 s=act(again.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 s=act(again.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===already.uid);
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(universalBp(again.pack,s,s.players[1].front[0]),5000);
});

test('raiding a named energy character may enter active on the front',()=>{
 const cards=[
  face({id:'RAIDER',name:'綠谷',raidName:'緑谷 出久',implementation:'vanilla'}),
  face({id:'BASE',name:'緑谷 出久',implementation:'vanilla'})
 ];
 const moved=open(cards,114);
 fuel(moved.s);
 const base=seat(moved.s,0,'BASE','energy',0,false);
 const raider=hold(moved.s,'RAIDER');
 const raids=legalUniversalActions(moved.pack,moved.s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.ok(raids.some(a=>a.line!=='energy'&&a.baseUid===base.uid&&Number.isInteger(a.slot)));
 assert.ok(raids.some(a=>a.line==='energy'&&a.slot===0&&a.baseUid===base.uid));
 const s=act(moved.pack,moved.s,a=>a.type==='raid'&&a.uid===raider.uid&&a.line!=='energy');
 const top=s.players[0].front.find(Boolean);
 assert.equal(top.cardId,'RAIDER');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'BASE');
 assert.equal(s.players[0].energy[0],null);
 const stayed=open(cards,115);
 fuel(stayed.s);
 const front=seat(stayed.s,0,'BASE','front',0,false);
 const card=hold(stayed.s,'RAIDER');
 const fixed=legalUniversalActions(stayed.pack,stayed.s).filter(a=>a.type==='raid'&&a.uid===card.uid);
 assert.ok(fixed.length>0);
 assert.ok(fixed.every(a=>a.line!=='energy'&&a.slot===0));
 assert.throws(()=>dispatchUniversalAction(stayed.pack,stayed.s,
  {type:'raid',uid:card.uid,baseUid:front.uid,line:'front',slot:1}),/not currently legal/);
});
