import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy,universalEnergy,
 effectiveHandRequiredEnergy,universalImpact,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// UA56BT/TTG-1-004, 012, 027, 031, 032, 033, 034, 056, 061, 062, 074.
// Registration plus the scenarios below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const featured=['TTG-1-004','TTG-1-012','TTG-1-027','TTG-1-031','TTG-1-032','TTG-1-033','TTG-1-034','TTG-1-056','TTG-1-061','TTG-1-062','TTG-1-074'];
const fillers=['TTG-1-009','TTG-1-002','TTG-1-029','TTG-1-076','TTG-1-058','TTG-1-044','TTG-1-053'];
const deck=Object.fromEntries(featured.map(id=>[id,2]));
for(const id of fillers)deck[id]=4;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const c=take(s,p,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function aside(s,p,id){
 const c=take(s,p,id);s.players[p].outside.push(c);return c;
}
function act(s,pred){
 const found=legalUniversalActions(ttg,s).find(pred);
 assert.ok(found,s.phase+' '+(s.pending?.kind||'')+' '+s.active);
 return found;
}
function go(s,action){
 const before=structuredClone(s);
 const next=dispatchUniversalAction(ttg,s,action);
 assert.deepEqual(s,before,'pure reducer');
 return next;
}
function toPhase(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++)s=go(s,act(s,a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
}
function endTurn(s){
 s=toPhase(s,'attack');
 while(s.pending?.kind==='effect-attack-end-raid')s=go(s,act(s,a=>a.uid===null));
 return go(s,act(s,a=>a.type==='next'));
}
function fresh(seed,first=0){
 return newUniversalMatch(ttg,{decks:[deck,deck],first,seed});
}
function silence(s,uid,player=0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:player,sourceUid:uid,
  targetUid:uid,until:{player,phase:'attack',edge:'start'},sourceLinked:false});
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function fuel(s,p,n=4,bonus=40){
 for(let i=0;i<n;i++){
  const c=place(s,p,'TTG-1-002','energy',i);
  c.buffs=[{energy:bonus,untilTurn:s.turn}];
 }
}
function fuelRed(s,p,ids=['TTG-1-076','TTG-1-058','TTG-1-053'],bonus=10){
 ids.forEach((id,i)=>{
  const c=place(s,p,id,'energy',i);
  c.buffs=[{energy:bonus,untilTurn:s.turn}];
 });
}
function apReady(s,p=s.active){
 return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;
}
function nest(top,base,facedown){
 base.stack=[];base.under=facedown?[facedown]:[];base.ready=false;
 if(facedown){facedown.faceDown=true;facedown.stack=[];facedown.under=[];}
 top.stack=[base];top.under=[];top.ready=true;
 return top;
}

test('the last eleven TTG cards keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 assert.equal(Object.keys(ttg.cards).length,81);
 const expect={
  'TTG-1-004':['ヴィラル','green',4,1,4000,1,'get','character'],
  'TTG-1-012':['シモン','green',6,2,4000,1,'get','character'],
  'TTG-1-027':['アークグレンラガン','green',7,1,4000,1,'raid','character'],
  'TTG-1-031':['超銀河グレンラガン','green',10,1,4000,1,'raid','character'],
  'TTG-1-032':['天元突破グレンラガン','green',100,1,50000,1,'special','character'],
  'TTG-1-033':['アークグレン','green',2,1,0,1,'color','field'],
  'TTG-1-034':['超銀河ダイグレン','green',8,1,0,2,'get','field'],
  'TTG-1-056':['シモン','red',3,1,4000,1,'get','character'],
  'TTG-1-061':['ニア','red',3,2,2000,2,'draw','character'],
  'TTG-1-062':['ニア','red',3,1,2500,2,'color','character'],
  'TTG-1-074':['グレンラガン','red',4,1,4000,1,'raid','character']
 };
 for(const [id,row] of Object.entries(expect)){
  const c=ttg.cards[id],src=TTG_BY_ID[id];
  assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.type],row);
  assert.equal(src.effect.includes(id==='TTG-1-033'?'突襲':'IMPACT')||src.identity===id,true);
  assert.equal(c.energy,src.energy);
 }
 assert.deepEqual(ttg.cards['TTG-1-027'].traits,['大グレン団','ガンメン']);
 assert.deepEqual(ttg.cards['TTG-1-074'].traits,['大グレン団','ガンメン']);
 assert.equal(JSON.stringify(TTG_BY_ID['TTG-1-027'].traits),'["大グレン団／ガンメン"]');
 assert.equal(JSON.stringify(TTG_BY_ID['TTG-1-074'].traits),'["大グレン団／ガンメン"]');
 assert.deepEqual(ttg.cards['TTG-1-032'].raidFromRaid,['超銀河グレンラガン']);
 assert.equal(ttg.cards['TTG-1-032'].chainRaidOnly,true);
 assert.equal(ttg.cards['TTG-1-074'].raidRequiresNames[0],'ニア');
});

test('chain raid tucks the previous top and enforces the 032 raid restrictions',()=>{
 let s=fresh(9001);
 s=endTurn(s);
 fuel(s,1,4,40);
 const simon=place(s,1,'TTG-1-009','front',0);
 const gurren=hold(s,1,'TTG-1-029');
 const arc=hold(s,1,'TTG-1-027');
 s=toPhase(s,'main');
 assert.equal(apReady(s,1),2);
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===gurren.uid&&a.baseUid===simon.uid));
 assert.equal(s.pending,null);
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===arc.uid&&a.baseUid===gurren.uid));
 assert.equal(s.pending.kind,'effect-facedown-scale');
 const decline=act(s,a=>a.type==='chooseFacedownScale'&&a.retireUid===null&&a.activeAp===false);
 assert.match(uiActionLabel(decline,{pack:ttg,state:s}),/不退場/);
 s=go(s,decline);
 const top=live(s,1,arc.uid);
 assert.equal(top.stack[0].uid,simon.uid);
 assert.equal(top.stack[0].under.some(c=>c.uid===gurren.uid&&c.faceDown),true);
 assert.equal(universalBp(ttg,s,top),5000);
 assert.equal(universalImpact(ttg,s,top),1);
 const again=hold(s,1,'TTG-1-029');
 s.players[1].apCards.find(c=>c.inPlay).ready=true;
 const follow=legalUniversalActions(ttg,s).filter(a=>a.type==='raid'&&a.uid===again.uid);
 assert.equal(follow.some(a=>a.baseUid===top.uid),false);
 assert.ok(follow.some(a=>s.players[1].energy.some(c=>c?.uid===a.baseUid)));
 assertUniversalMatch(ttg,s);

 let closed=fresh(9002);
 fuel(closed,0,4,40);
 const bare=place(closed,0,'TTG-1-009','front',0);
 const galaxy=nest(take(closed,0,'TTG-1-031'),take(closed,0,'TTG-1-009'));
 galaxy.fieldEntryStamp=closed.nextFieldEntryStamp++;
 galaxy.raidedTurn=closed.turn;
 closed.players[0].front[1]=galaxy;
 const tt=hold(closed,0,'TTG-1-032');
 closed=toPhase(closed,'main');
 const raids=()=>legalUniversalActions(ttg,closed).filter(a=>a.type==='raid'&&a.uid===tt.uid);
 assert.equal(raids().some(a=>a.baseUid===bare.uid),false);
 assert.equal(raids().some(a=>a.baseUid===galaxy.uid),false);
 delete live(closed,0,galaxy.uid).raidedTurn;
 assert.ok(raids().some(a=>a.baseUid===galaxy.uid));
 place(closed,0,'TTG-1-032','front',2);
 assert.equal(raids().some(a=>a.baseUid===galaxy.uid),false);
 assertUniversalMatch(ttg,closed);
});

test('TTG-004 attaches the counterpart from hand or outside and can resolve before the raid entry',()=>{
 let s=fresh(9004);
 s=endTurn(s);
 fuel(s,1,3,40);
 const simon=place(s,1,'TTG-1-009','front',0);
 const viral=place(s,1,'TTG-1-004','front',1);
 const handViral=hold(s,1,'TTG-1-002');
 const raider=hold(s,1,'TTG-1-029');
 s=toPhase(s,'main');
 const handBefore=s.players[1].hand.length;
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===simon.uid));
 assert.equal(s.pending.kind,'effect-raid-witness-order');
 const now=act(s,a=>a.type==='chooseRaidWitness'&&a.when==='now');
 assert.match(uiActionLabel(now,{pack:ttg,state:s}),/先結算/);
 s=go(s,now);
 assert.equal(s.pending.kind,'effect-raid-attach');
 s=go(s,act(s,a=>a.type==='chooseRaidAttach'&&a.uid===handViral.uid));
 const host=live(s,1,raider.uid);
 assert.equal(host.under.some(c=>c.uid===handViral.uid&&c.faceDown),true);
 assert.equal(s.players[1].hand.length,handBefore-1);
 assert.ok(s.onceEffectUses[1].includes('ヴィラル|raidAttach'));
 const red=place(s,1,'TTG-1-058','energy',3);
 red.buffs=[{energy:10,untilTurn:s.turn}];
 const lagann=hold(s,1,'TTG-1-076');
 const bare=place(s,1,'TTG-1-009','front',2);
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===lagann.uid&&a.baseUid===bare.uid));
 assert.notEqual(s.pending?.kind,'effect-raid-witness-order');
 assertUniversalMatch(ttg,s);

 let later=fresh(9005);
 later=endTurn(later);
 fuel(later,1,3,40);
 place(later,1,'TTG-1-009','front',0);
 place(later,1,'TTG-1-004','front',1);
 const outside=aside(later,1,'TTG-1-002');
 const second=hold(later,1,'TTG-1-027');
 const base=place(later,1,'TTG-1-009','front',2);
 const buried=take(later,1,'TTG-1-053');
 buried.faceDown=true;buried.stack=[];buried.under=[];
 base.under=[buried];
 later=toPhase(later,'main');
 const outsideBefore=later.players[1].outside.length;
 later=go(later,act(later,a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===base.uid));
 assert.equal(later.pending.kind,'effect-raid-witness-order');
 later=go(later,act(later,a=>a.when==='skip'));
 assert.equal(later.onceEffectUses[1].includes('ヴィラル|raidAttach'),false);
 assert.equal(later.pending.kind,'effect-facedown-scale');
 later=go(later,act(later,a=>a.retireUid===null&&a.activeAp===false));
 later=endTurn(later);
 later=endTurn(later);
 for(const c of later.players[1].energy)if(c)c.buffs=[{energy:40,untilTurn:later.turn}];
 const host2=place(later,1,'TTG-1-009','front',3);
 const again=hold(later,1,'TTG-1-029');
 later=toPhase(later,'main');
 const deckNow=later.players[1].deck.length;
 later=go(later,act(later,a=>a.type==='raid'&&a.uid===again.uid&&a.baseUid===host2.uid));
 later=go(later,act(later,a=>a.when==='now'));
 later=go(later,act(later,a=>a.type==='chooseRaidAttach'&&a.uid===outside.uid));
 assert.equal(later.players[1].deck.length,deckNow);
 assert.equal(later.players[1].outside.length,outsideBefore-1);
 assert.equal(live(later,1,again.uid).under.some(c=>c.uid===outside.uid),true);
 assertUniversalMatch(ttg,later);
});

test('TTG-012 looks, discards, and doubles generated energy only after the entry turn',()=>{
 let s=fresh(9012);
 s=endTurn(s);
 fuel(s,1,3,10);
 const source=hold(s,1,'TTG-1-012');
 const nia=take(s,1,'TTG-1-058'),other=take(s,1,'TTG-1-053');
 s.players[1].outside.push(...s.players[1].deck.splice(0));
 s.players[1].deck.unshift(nia,other);
 s.players[1].outside.push(...s.players[1].hand.filter(c=>c.uid!==source.uid));
 s.players[1].hand=[source];
 s=toPhase(s,'main');
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy'),false);
 assert.equal(apReady(s,1),2);
 s=go(s,act(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.equal(live(s,1,source.uid).ready,true);
 assert.equal(live(s,1,source.uid).entryTurn,s.turn);
 assert.equal(s.pending.kind,'effect-look-take');
 s=go(s,act(s,a=>a.type==='chooseLookTake'&&a.uid===nia.uid));
 s=go(s,act(s,a=>a.type==='chooseLookOrder'&&a.uid===other.uid));
 assert.equal(s.pending.kind,'effect-discard-mode');
 assert.ok(s.players[1].hand.some(c=>c.uid===nia.uid));
 assert.equal(s.players[1].deck.at(-1).uid,other.uid);
 const pay=hold(s,1,'TTG-1-032');
 s=go(s,act(s,a=>a.type==='chooseDiscardPay'&&a.uid===pay.uid));
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.mode==='retire'));
 const rested=s.players[1].apCards.filter(c=>c.inPlay&&!c.ready).length;
 s=go(s,act(s,a=>a.mode==='activeAp'));
 assert.equal(s.players[1].apCards.filter(c=>c.inPlay&&!c.ready).length,rested-1);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='doubleEnergy'),false);
 assertUniversalMatch(ttg,s);

 let doubled=fresh(9013);
 doubled=endTurn(doubled);
 fuel(doubled,1,3,10);
 const simon=hold(doubled,1,'TTG-1-012');
 doubled.players[1].outside.push(...doubled.players[1].hand.filter(c=>c.uid!==simon.uid));
 doubled.players[1].hand=[simon];
 doubled.players[1].outside.push(...doubled.players[1].deck.splice(0));
 doubled=toPhase(doubled,'main');
 doubled=go(doubled,act(doubled,a=>a.type==='play'&&a.uid===simon.uid&&a.line==='front'));
 assert.equal(doubled.pending,null);
 doubled.players[1].deck.push(doubled.players[1].outside.pop());
 doubled=endTurn(doubled);
 doubled=endTurn(doubled);
 for(const c of doubled.players[1].energy)if(c)c.buffs=[{energy:10,untilTurn:doubled.turn}];
 doubled=toPhase(doubled,'main');
 const before=universalEnergy(ttg,doubled,1);
 doubled=go(doubled,act(doubled,a=>a.mode==='doubleEnergy'&&a.uid===simon.uid));
 assert.equal(universalEnergy(ttg,doubled,1),before*2);
 assert.equal(legalUniversalActions(ttg,doubled).some(a=>a.mode==='doubleEnergy'),false);
 assertUniversalMatch(ttg,doubled);
});

test('TTG-027 scales facedown entry and can spend two facedowns for damage 2',()=>{
 let s=fresh(9027);
 s=endTurn(s);
 fuel(s,1,4,40);
 const base=place(s,1,'TTG-1-009','front',0);
 const mid=take(s,1,'TTG-1-029');
 const extra=take(s,1,'TTG-1-053');
 const third=take(s,1,'TTG-1-053');
 mid.faceDown=true;extra.faceDown=true;third.faceDown=true;
 base.under=[mid,extra,third];
 const arc=hold(s,1,'TTG-1-027');
 const victim=place(s,0,'TTG-1-053','front',0);
 const huge=place(s,0,'TTG-1-032','front',1);
 silence(s,huge.uid,0);
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===arc.uid&&a.baseUid===base.uid));
 assert.equal(s.pending.kind,'effect-facedown-scale');
 assert.ok(s.pending.choices.includes(victim.uid));
 assert.equal(s.pending.choices.includes(huge.uid),false);
 assert.equal(s.pending.activeAp,true);
 const before=apReady(s,1);
 s=go(s,act(s,a=>a.retireUid===victim.uid&&a.activeAp===true));
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(apReady(s,1),before+1);
 s=toPhase(s,'attack');
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===arc.uid));
 assert.equal(s.pending.kind,'effect-spend-facedown');
 const pair=s.pending.pairs[0];
 s=go(s,act(s,a=>a.type==='chooseSpendFacedown'&&a.uids.length===2));
 assert.equal(live(s,1,arc.uid).attackDamageGranted.amount,2);
 assert.equal(universalAttackDamage(ttg,s,live(s,1,arc.uid)),2);
 assert.equal(pair.every(uid=>s.players[1].outside.some(c=>c.uid===uid)),true);
 silence(s,arc.uid,1);
 assert.equal(universalBp(ttg,s,live(s,1,arc.uid)),4000);
 assert.equal(universalImpact(ttg,s,live(s,1,arc.uid)),0);
 assertUniversalMatch(ttg,s);
});

test('TTG-031 grants protection and energy gates once per printed name',()=>{
 let s=fresh(9031);
 s=endTurn(s);
 fuel(s,1,3,8);
 const copies=[];
 for(const zone of ['deck','life','hand','outside']){
  const z=s.players[1][zone];
  for(let i=z.length-1;i>=0&&copies.length<2;i--)
   if(z[i].cardId==='TTG-1-031')copies.push(z.splice(i,1)[0]);
 }
 const [first,second]=copies;
 s.players[1].hand.push(first,second);
 s.players[1].apCards.forEach((c,i)=>{c.inPlay=true;c.ready=i===0;});
 s=toPhase(s,'main');
 const deck=s.players[1].deck.length;
 s=go(s,act(s,a=>a.type==='play'&&a.uid===first.uid&&a.line==='front'));
 const entered=live(s,1,first.uid);
 assert.equal(universalBp(ttg,s,entered),10000);
 assert.equal(universalAttackDamage(ttg,s,entered),2);
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(apReady(s,1),1);
 assert.ok(s.onceEffectUses[1].includes('超銀河グレンラガン|galaxy'));
 s=go(s,act(s,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front'));
 assert.equal(universalBp(ttg,s,live(s,1,second.uid)),5000);
 assert.equal(s.players[1].deck.length,deck);
 assertUniversalMatch(ttg,s);

 let rich=fresh(9032);
 rich=endTurn(rich);
 fuel(rich,1,4,20);
 const card=hold(rich,1,'TTG-1-031');
 rich.players[1].apCards.forEach(c=>{c.inPlay=true;c.ready=false;});
 rich.players[1].apCards[0].ready=true;
 rich=toPhase(rich,'main');
 const before=rich.players[1].deck.length;
 rich=go(rich,act(rich,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 assert.equal(rich.players[1].deck.length,before-2);
 assert.equal(apReady(rich,1),1);
 assertUniversalMatch(ttg,rich);
});

test('TTG-032 impact, damage, absorb, chain raid, and opponent targeting follow the print',()=>{
 let s=fresh(9033);
 fuel(s,0,4,40);
 const body=place(s,0,'TTG-1-032','front',0);
 const other=place(s,0,'TTG-1-053','front',1);
 s=toPhase(s,'main');
 assert.equal(universalImpact(ttg,s,body),4);
 assert.equal(universalAttackDamage(ttg,s,body),7);
 s=endTurn(s);
 assert.equal(universalImpact(ttg,s,live(s,0,body.uid)),0);
 assert.equal(universalAttackDamage(ttg,s,live(s,0,body.uid)),1);
 s=endTurn(s);
 assert.equal(universalImpact(ttg,s,live(s,0,body.uid)),4);
 silence(s,body.uid,0);
 assert.equal(universalImpact(ttg,s,live(s,0,body.uid)),0);
 assert.equal(universalAttackDamage(ttg,s,live(s,0,body.uid)),1);
 assertUniversalMatch(ttg,s);

 let absorb=fresh(9034);
 absorb=endTurn(absorb);
 fuel(absorb,1,4,40);
 const tt=hold(absorb,1,'TTG-1-032');
 const ally=place(absorb,1,'TTG-1-053','front',0);
 absorb=toPhase(absorb,'main');
 absorb=go(absorb,act(absorb,a=>a.type==='play'&&a.uid===tt.uid&&a.line==='front'));
 assert.equal(absorb.pending.kind,'effect-absorb-front');
 absorb=go(absorb,act(absorb,a=>a.type==='chooseAbsorbFront'&&a.uids.includes(ally.uid)));
 assert.equal(live(absorb,1,tt.uid).under.some(c=>c.uid===ally.uid&&c.faceDown),true);
 live(absorb,1,tt.uid).ready=true;
 assert.equal(absorb.players[1].front.some(c=>c?.uid===ally.uid),false);
 const buried=take(absorb,1,'TTG-1-009');
 buried.faceDown=true;
 live(absorb,1,tt.uid).under.push(buried);
 absorb=toPhase(absorb,'attack');
 const foe=place(absorb,0,'TTG-1-053','front',0);
 const hidden=place(absorb,0,'TTG-1-032','front',1);
 absorb=go(absorb,act(absorb,a=>a.type==='attack'&&a.uid===tt.uid));
 assert.equal(absorb.pending.kind,'effect-spend-facedown');
 const targets=legalUniversalActions(ttg,absorb).filter(a=>a.uids?.length===2);
 assert.ok(targets.some(a=>a.targetUid===foe.uid));
 assert.equal(targets.some(a=>a.targetUid===hidden.uid),false);
 assert.ok(targets.some(a=>a.targetUid===null));
 absorb=go(absorb,act(absorb,a=>a.uids.length===2&&a.targetUid===foe.uid));
 assert.ok(absorb.players[0].outside.some(c=>c.uid===foe.uid));
 assert.equal(absorb.players[0].front[1].uid,hidden.uid);
 assertUniversalMatch(ttg,absorb);
});

test('TTG-033 adds active energy and can tuck itself under an Arc Gurren Lagann raid',()=>{
 let s=fresh(9035);
 const field=place(s,0,'TTG-1-033','energy',0);
 assert.equal(universalCardEnergy(ttg,s,0,field),2);
 field.ready=false;
 assert.equal(universalCardEnergy(ttg,s,0,field),1);
 s=endTurn(s);
 fuel(s,1,3,40);
 const watcher=place(s,1,'TTG-1-033','energy',3);
 const base=place(s,1,'TTG-1-009','front',0);
 const raider=hold(s,1,'TTG-1-027');
 s=toPhase(s,'main');
 const deck=s.players[1].deck.length;
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid));
 assert.equal(s.pending.kind,'effect-raid-witness-order');
 s=go(s,act(s,a=>a.when==='now'));
 assert.equal(s.pending.kind,'effect-raid-witness-move');
 s=go(s,act(s,a=>a.mode==='move'));
 const host=live(s,1,raider.uid);
 assert.equal(host.under.some(c=>c.uid===watcher.uid&&c.faceDown),true);
 assert.equal(s.players[1].deck.length,deck-2);
 assert.equal(s.pending.kind,'effect-facedown-scale');
 s=go(s,act(s,a=>a.retireUid===null));
 assert.ok(s.onceEffectUses[1].includes('アークグレン|raidWitness'));
 assertUniversalMatch(ttg,s);
});

test('TTG-034 discounts a missing field, counts direct facedowns, captures a retirement, and returns buried cards',()=>{
 let s=fresh(9036);
 const hand=hold(s,0,'TTG-1-034');
 s=toPhase(s,'main');
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,ttg.cards['TTG-1-034']),5);
 place(s,0,'TTG-1-033','energy',0);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,ttg.cards['TTG-1-034']),8);
 const field=place(s,0,'TTG-1-034','energy',1);
 const direct=take(s,0,'TTG-1-002');
 const nested=take(s,0,'TTG-1-053');
 direct.faceDown=true;direct.under=[{...nested,faceDown:true,stack:[],under:[]}];
 field.under=[direct];
 assert.equal(universalCardEnergy(ttg,s,0,live(s,0,field.uid)),3);
 const victim=place(s,0,'TTG-1-053','front',0);
 s=endTurn(s);
 fuel(s,1,3,20);
 const attacker=place(s,1,'TTG-1-029','front',0);
 s=toPhase(s,'attack');
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===attacker.uid));
 s=go(s,act(s,a=>a.type==='chooseBlock'&&a.uid===victim.uid));
 assert.equal(s.pending.kind,'effect-retire-capture');
 const skip=go(s,act(s,a=>a.type==='chooseRetireCapture'&&a.uid===null));
 assert.equal(skip.onceEffectUses[0].includes(field.uid+'|retireCapture'),false);
 assert.ok(skip.players[0].outside.some(c=>c.uid===victim.uid));
 assertUniversalMatch(ttg,s);
 s=go(s,act(s,a=>a.type==='chooseRetireCapture'&&a.uid===field.uid));
 assert.equal(live(s,0,field.uid).under.some(c=>c.uid===victim.uid&&c.faceDown),true);
 assert.ok(s.onceEffectUses[0].includes(field.uid+'|retireCapture'));
 assertUniversalMatch(ttg,s);

 let back=fresh(9037);
 back=endTurn(back);
 fuel(back,1,3,40);
 const site=place(back,1,'TTG-1-034','energy',3);
 const buried=take(back,1,'TTG-1-009');
 buried.faceDown=true;buried.stack=[];buried.under=[];
 site.under=[buried];
 const simon=place(back,1,'TTG-1-009','front',0);
 const galaxy=hold(back,1,'TTG-1-031');
 back=toPhase(back,'main');
 back=go(back,act(back,a=>a.type==='raid'&&a.uid===galaxy.uid&&a.baseUid===simon.uid));
 assert.equal(back.pending.kind,'effect-raid-witness-order');
 back=go(back,act(back,a=>a.when==='now'));
 back=go(back,act(back,a=>a.mode==='move'));
 assert.ok(back.players[1].hand.some(c=>c.uid===buried.uid));
 assert.equal(live(back,1,galaxy.uid).under.some(c=>c.uid===site.uid&&c.faceDown),true);
 assert.equal(back.players[1].energy[3],null);
 assertUniversalMatch(ttg,back);
});

test('TTG-056 attacks only with Nia and a short deck, then offers a free attack-end raid',()=>{
 let s=fresh(9056);
 const simon=place(s,0,'TTG-1-056','front',0);
 s=toPhase(s,'attack');
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='attack'),false);
 while(s.players[0].deck.length>20)s.players[0].outside.push(s.players[0].deck.pop());
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='attack'),false);
 place(s,0,'TTG-1-058','energy',0);
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.type==='attack'&&a.uid===simon.uid));
 silence(s,simon.uid,0);
 s.players[0].deck.push(...s.players[0].outside.splice(0));
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.type==='attack'&&a.uid===simon.uid));
 assertUniversalMatch(ttg,s);

 let end=fresh(9057);
 end=endTurn(end);
 const host=place(end,1,'TTG-1-056','energy',0);
 place(end,1,'TTG-1-058','front',0);
 const lagann=hold(end,1,'TTG-1-076');
 const green=hold(end,1,'TTG-1-029');
 const red=hold(end,1,'TTG-1-074');
 end=toPhase(end,'attack');
 end=go(end,act(end,a=>a.type==='next'));
 assert.equal(end.pending.kind,'effect-attack-end-raid');
 const offered=legalUniversalActions(ttg,end).filter(a=>a.uid&&a.uid!==null);
 assert.ok(offered.some(a=>a.uid===lagann.uid));
 assert.ok(offered.some(a=>a.uid===red.uid));
 assert.equal(offered.some(a=>a.uid===green.uid),false);
 const choice=act(end,a=>a.uid===lagann.uid&&a.line==='front');
 assert.match(uiActionLabel(choice,{pack:ttg,state:end}),/突襲/);
 const ap=apReady(end,1);
 end=go(end,choice);
 assert.equal(apReady(end,1),ap);
 const top=live(end,1,lagann.uid);
 assert.equal(top.stack[0].uid,host.uid);
 assert.ok(top.buffs.some(b=>b.bp===1000));
 assert.equal(end.players[1].energy[0],null);
 assertUniversalMatch(ttg,end);
});

test('TTG-061 chooses one or two Simon modes and shares the Kamina ban',()=>{
 let banned=fresh(9061);
 banned=endTurn(banned);
 place(banned,1,'TTG-1-044','front',0);
 fuelRed(banned,1,['TTG-1-076','TTG-1-058','TTG-1-053'],10);
 const nia=hold(banned,1,'TTG-1-061');
 const open=hold(banned,1,'TTG-1-056');
 banned=toPhase(banned,'main');
 assert.equal(apReady(banned,1),2);
 assert.equal(legalUniversalActions(ttg,banned).some(a=>a.type==='play'&&a.uid===nia.uid),false);
 assert.ok(legalUniversalActions(ttg,banned).some(a=>a.type==='play'&&a.uid===open.uid));
 assertUniversalMatch(ttg,banned);

 let s=fresh(9062);
 s=endTurn(s);
 fuelRed(s,1);
 const source=hold(s,1,'TTG-1-061');
 const green=aside(s,1,'TTG-1-009');
 const red=hold(s,1,'TTG-1-053');
 while(s.players[1].deck.length>20)s.players[1].outside.push(s.players[1].deck.pop());
 s=toPhase(s,'main');
 assert.equal(apReady(s,1),2);
 s=go(s,act(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-simon-low');
 assert.equal(s.pending.remaining,2);
 s=go(s,act(s,a=>a.mode==='recover'&&a.uid===green.uid));
 assert.ok(s.players[1].hand.some(c=>c.uid===green.uid));
 assert.equal(s.pending.kind,'effect-simon-low');
 s=go(s,act(s,a=>a.mode==='deploy'&&a.uid===red.uid&&a.line==='front'));
 assert.equal(live(s,1,red.uid).ready,true);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='play'&&
  s.players[1].hand.some(c=>c.uid===a.uid&&c.cardId==='TTG-1-044')),false);
 assertUniversalMatch(ttg,s);

 let one=fresh(9063);
 one=endTurn(one);
 fuelRed(one,1);
 const once=hold(one,1,'TTG-1-061');
 aside(one,1,'TTG-1-009');
 one=toPhase(one,'main');
 assert.ok(one.players[1].deck.length>20);
 one=go(one,act(one,a=>a.type==='play'&&a.uid===once.uid&&a.line==='front'));
 assert.equal(one.pending.remaining,1);
 one=go(one,act(one,a=>a.mode==='recover'&&a.uid===null));
 assert.equal(one.pending,null);
 assertUniversalMatch(ttg,one);
});

test('TTG-062 replays a Simon entry and rests to buff one when the deck is short',()=>{
 let s=fresh(9064);
 s=endTurn(s);
 fuelRed(s,1,['TTG-1-076','TTG-1-076','TTG-1-058'],10);
 const nia=hold(s,1,'TTG-1-062');
 const simon=place(s,1,'TTG-1-056','front',0);
 simon.entryTurn=1;
 const plain=place(s,1,'TTG-1-053','front',1);
 s=toPhase(s,'main');
 const deck=s.players[1].deck.length;
 s=go(s,act(s,a=>a.type==='play'&&a.uid===nia.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-replay-entry');
 assert.ok(s.pending.choices.includes(simon.uid));
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=go(s,act(s,a=>a.uid===simon.uid));
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[1].deck.length,deck-1);
 assert.equal(live(s,1,simon.uid).entryTurn,1);
 assert.equal(live(s,1,simon.uid).fieldEntryStamp,simon.fieldEntryStamp);
 s=go(s,act(s,a=>a.type==='chooseDiscard'));
 live(s,1,nia.uid).ready=true;
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='restBuffDiscard'),false);
 while(s.players[1].deck.length>20)s.players[1].outside.push(s.players[1].deck.pop());
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.mode==='restBuffDiscard'&&a.targetUid===simon.uid));
 const discard=s.players[1].hand[0];
 s=go(s,act(s,a=>a.mode==='restBuffDiscard'&&a.targetUid===simon.uid&&a.discardUid===discard.uid));
 assert.equal(live(s,1,nia.uid).ready,false);
 assert.equal(live(s,1,simon.uid).ready,true);
 assert.ok(live(s,1,simon.uid).buffs.some(b=>b.bp===1000));
 assert.ok(s.players[1].outside.some(c=>c.uid===discard.uid));
 assertUniversalMatch(ttg,s);
 const ai=chooseUniversalAiAction(ttg,s,{difficulty:'hard'});
 assert.ok(ai);
});

test('TTG-074 raids only with Nia, chains from Lagann, and ladders draws with the deck',()=>{
 let closed=fresh(9074);
 closed=endTurn(closed);
 fuelRed(closed,1,['TTG-1-044','TTG-1-053'],20);
 const simon=place(closed,1,'TTG-1-009','front',0);
 const card=hold(closed,1,'TTG-1-074');
 closed=toPhase(closed,'main');
 assert.equal(legalUniversalActions(ttg,closed).some(a=>a.type==='raid'&&a.uid===card.uid),false);
 place(closed,1,'TTG-1-058','front',1);
 assert.ok(legalUniversalActions(ttg,closed).some(a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===simon.uid));
 const lagann=place(closed,1,'TTG-1-076','front',2);
 assert.equal(legalUniversalActions(ttg,closed).some(a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===lagann.uid),false);
 const stacked=nest(take(closed,1,'TTG-1-076'),take(closed,1,'TTG-1-009'));
 stacked.fieldEntryStamp=closed.nextFieldEntryStamp++;
 closed.players[1].front[3]=stacked;
 assert.ok(legalUniversalActions(ttg,closed).some(a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===stacked.uid));
 assert.equal(universalImpact(ttg,closed,card),1);
 assertUniversalMatch(ttg,closed);

 let ladder=fresh(9075);
 fuelRed(ladder,0,['TTG-1-076','TTG-1-044','TTG-1-053'],20);
 const body=hold(ladder,0,'TTG-1-074');
 while(ladder.players[0].deck.length>6)ladder.players[0].outside.push(ladder.players[0].deck.pop());
 ladder=toPhase(ladder,'main');
 const before=ladder.players[0].deck.length;
 ladder=go(ladder,act(ladder,a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 const entered=live(ladder,0,body.uid);
 assert.equal(ladder.players[0].deck.length,before-1);
 assert.ok(entered.buffs.some(b=>b.bp===1000));
 assert.ok(entered.buffs.some(b=>b.bp===3000));
 assert.equal(entered.attackDamageGranted.amount,2);
 assert.equal(universalAttackDamage(ttg,ladder,entered),2);
 assert.equal(universalBp(ttg,ladder,entered),8000);
 assertUniversalMatch(ttg,ladder);
});
