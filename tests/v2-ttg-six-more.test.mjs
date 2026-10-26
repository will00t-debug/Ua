import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA56BT/TTG-1-003, 017, 040, 068, 070, 080. Registration plus the
// scenarios below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const featured=['TTG-1-003','TTG-1-017','TTG-1-040','TTG-1-068','TTG-1-070','TTG-1-080'];
const fillers=['TTG-1-019','TTG-1-063','TTG-1-010','TTG-1-044','TTG-1-076','TTG-1-029','TTG-1-005','TTG-1-002'];
const deck=Object.fromEntries(featured.map(id=>[id,3]));
for(const id of fillers)deck[id]=4;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function takeExcept(s,p,id,except){
 for(const zone of ['deck','life','outside','hand']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id&&!except.includes(c.uid));
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
function holdTwo(s,p,id){
 const cards=[take(s,p,id),take(s,p,id)];
 s.players[p].hand.push(...cards);return cards;
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
 return go(s,act(s,a=>a.type==='next'));
}
function nullLife(s,p,id){
 const card=take(s,p,id),old=s.players[p].life.pop();
 s.players[p].life.unshift(card);if(old)s.players[p].deck.push(old);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function fresh(seed,first=0){
 return newUniversalMatch(ttg,{decks:[deck,deck],first,seed});
}
function apReady(s,p=s.active){
 return s.players[p].apCards.filter(c=>c.ready).length;
}
function energyOf(s,p,uid){
 return universalCardEnergy(ttg,s,p,live(s,p,uid));
}
function settle(s){
 for(let i=0;i<8&&s.pending;i++)s=go(s,legalUniversalActions(ttg,s)[0]);
 assert.equal(s.pending,null);
 return s;
}

test('six more TTG cards keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 const expect={
  'TTG-1-003':['ヴィラル','green',5,1,4000,1,'draw','character'],
  'TTG-1-017':['ニア','green',3,1,2000,2,'color','character'],
  'TTG-1-040':['俺達を誰だと思っていやがる!!','green',8,1,0,0,'get','event'],
  'TTG-1-068':['ヨーコ','red',3,1,2000,2,'draw','character'],
  'TTG-1-070':['ロシウ','red',1,1,2000,1,'draw','character'],
  'TTG-1-080':['俺を誰だと思っていやがる!!','red',3,1,0,0,null,'event']
 };
 const match={
  'TTG-1-003':'能源6以上','TTG-1-017':'需求能源8以上','TTG-1-040':'產能本回合加倍',
  'TTG-1-068':'Raid','TTG-1-070':'カミナ','TTG-1-080':'カミナ'
 };
 for(const [id,printed] of Object.entries(expect)){
  const src=TTG_BY_ID[id],card=ttg.cards[id];
  assert.equal(src.number,'UA56BT/'+id);
  assert.ok(src.effect.includes(match[id]));
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],printed);
  assert.deepEqual(card.traits,src.traits||[]);
 }
 const viral=ttg.cards['TTG-1-003'];
 assert.deepEqual(viral.printedMains.map(m=>m.id),['front','ready20']);
 assert.equal(viral.printedMains[0].minEnergy,6);
 assert.equal(viral.printedMains[0].highEnergy,8);
 assert.equal(viral.printedMains[1].minEnergy,20);
 assert.equal(viral.printedMains[1].once,'name');
 const nia=ttg.cards['TTG-1-017'];
 assert.deepEqual(nia.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 assert.equal(nia.effects.onPlay[1].op,'gainSelfEnergyIfAtLeast');
 assert.equal(nia.effects.onPlay[1].amount,2);
 const shout=ttg.cards['TTG-1-040'];
 assert.equal(shout.handUseOncePerName,true);
 assert.equal(shout.removeUnlessUsed,true);
 assert.equal(shout.useToRemoved,true);
 assert.equal(shout.removedMain.op,'doubleGeneratedEnergy');
 const yoko=ttg.cards['TTG-1-068'];
 assert.equal(yoko.bpPerOwnRaid,1000);
 assert.equal(yoko.printedMains[0].attackCap,4);
 assert.equal(yoko.printedMains[0].discard,1);
 assert.equal(yoko.printedMains[0].once,'name');
 const rossiu=ttg.cards['TTG-1-070'];
 assert.deepEqual(rossiu.extraRaidHost.names,['グレン','グレンラガン']);
 assert.equal(rossiu.extraRaidHost.blockedByName,'カミナ');
 const me=ttg.cards['TTG-1-080'];
 assert.equal(me.playRequiresNameOrRaidBase,'カミナ');
 assert.deepEqual(me.effects.onPlay[0].names,['ラガン','グレン','グレンラガン']);
});

test('TTG-003 grants front energy at 6, the whole front at 8, and one ACTIVE at 20',()=>{
 let low=fresh(8003);
 for(let i=0;i<2;i++)place(low,0,'TTG-1-019','energy',i);
 const early=place(low,0,'TTG-1-003','front',0);
 low=toPhase(low,'main');
 assert.equal(legalUniversalActions(ttg,low).some(a=>a.type==='activate'&&a.uid===early.uid),false);

 let six=fresh(8004);
 for(let i=0;i<3;i++)place(six,0,'TTG-1-019','energy',i);
 const parked=place(six,0,'TTG-1-003','energy',3);
 six=toPhase(six,'main');
 assert.equal(universalCardEnergy(ttg,six,0,parked),1);
 assert.equal(legalUniversalActions(ttg,six).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 six.players[0].energy[3]=null;six.players[0].front[0]=parked;
 assert.equal(energyOf(six,0,parked.uid),0);
 const frontMain=act(six,a=>a.type==='activate'&&a.uid===parked.uid&&a.mode==='front');
 assert.match(uiActionLabel(frontMain,{pack:ttg,state:six}),/前線/);
 six=go(six,frontMain);
 assert.equal(energyOf(six,0,parked.uid),1);
 assert.equal(six.allFrontEnergy[0],null);
 const quiet=place(six,0,'TTG-1-068','front',1);
 assert.equal(energyOf(six,0,quiet.uid),0);
 assert.equal(legalUniversalActions(ttg,six).some(a=>a.type==='activate'&&a.uid===parked.uid&&a.mode==='front'),false);

 let reach=fresh(8005);
 for(let i=0;i<3;i++)place(reach,0,'TTG-1-019','energy',i);
 place(reach,0,'TTG-1-002','energy',3);
 const viral=place(reach,0,'TTG-1-003','front',0);
 const kittan=hold(reach,0,'TTG-1-005');
 reach=toPhase(reach,'main');
 assert.equal(energyOf(reach,0,viral.uid),0);
 reach=go(reach,act(reach,a=>a.type==='activate'&&a.uid===viral.uid&&a.mode==='front'));
 assert.equal(reach.allFrontEnergy[0],viral.uid);
 assert.equal(energyOf(reach,0,viral.uid),1);
 reach=go(reach,act(reach,a=>a.type==='play'&&a.uid===kittan.uid&&a.line==='front'));
 const entered=live(reach,0,kittan.uid);
 assert.equal(universalCardEnergy(ttg,reach,0,entered),1);
 const shown=universalPublicView(ttg,reach,0).players[0].front.find(c=>c?.uid===kittan.uid);
 assert.equal(shown.produces,1);

 let high=fresh(8006);
 const yokos=[];
 for(let i=0;i<4;i++)yokos.push(place(high,0,'TTG-1-019','energy',i));
 const source=place(high,0,'TTG-1-003','front',0);
 const yoko=place(high,0,'TTG-1-068','front',1);
 const other=place(high,0,'TTG-1-003','front',2);
 other.ready=false;
 const spell=hold(high,0,'TTG-1-040');
 high=toPhase(high,'main');
 assert.equal(energyOf(high,0,yokos[0].uid),2);
 assert.equal(energyOf(high,0,yoko.uid),0);
 const hand=high.players[0].hand.length;
 high=go(high,act(high,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(high.players[0].hand.length,hand+1);
 assert.ok(high.players[0].removed.some(c=>c.uid===spell.uid));
 assert.equal(high.players[0].outside.some(c=>c.uid===spell.uid),false);
 assert.equal(high.allFrontEnergy[0],spell.uid);
 assert.equal(energyOf(high,0,yoko.uid),2);
 assert.equal(energyOf(high,0,source.uid),1);
 const doubled=act(high,a=>a.type==='activateRemoved'&&a.uid===spell.uid);
 assert.match(uiActionLabel(doubled,{pack:ttg,state:high}),/2 倍/);
 high=go(high,doubled);
 assert.equal(high.energyDoubles[0],1);
 assert.equal(energyOf(high,0,yokos[0].uid),4);
 assert.equal(energyOf(high,0,source.uid),2);
 assert.equal(energyOf(high,0,yoko.uid),4);
 const produced=[...high.players[0].front,...high.players[0].energy].filter(Boolean)
  .reduce((n,c)=>n+universalCardEnergy(ttg,high,0,c),0);
 assert.equal(produced,24);
 const ready=act(high,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='ready20');
 assert.match(uiActionLabel(ready,{pack:ttg,state:high}),/ACTIVE/);
 high=go(high,ready);
 assert.equal(high.pending.kind,'effect-active-character');
 assert.ok(high.pending.choices.length>1);
 const label=act(high,a=>a.type==='chooseActiveCharacter'&&a.uid===other.uid);
 assert.match(uiActionLabel(label,{pack:ttg,state:high}),/ACTIVE/);
 high=go(high,label);
 assert.equal(live(high,0,other.uid).ready,true);
 assert.equal(legalUniversalActions(ttg,high).some(a=>a.type==='activate'&&a.uid===other.uid&&a.mode==='ready20'),false);
 assert.equal(legalUniversalActions(ttg,high).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='ready20'),false);
 assertUniversalMatch(ttg,high);
});

test('TTG-017 looks at four cards or the outside, then gains energy only at 8',()=>{
 let s=fresh(8017);
 for(let i=0;i<2;i++)place(s,0,'TTG-1-019','energy',i);
 const nia=hold(s,0,'TTG-1-017');
 const simon=take(s,0,'TTG-1-010'),eight=take(s,0,'TTG-1-040');
 const boota=take(s,0,'TTG-1-063'),kittan=take(s,0,'TTG-1-005');
 const outsideSimon=take(s,0,'TTG-1-010'),outsideEight=take(s,0,'TTG-1-040');
 const outsideBoota=take(s,0,'TTG-1-063');
 s.players[0].deck.unshift(simon,eight,boota,kittan);
 s.players[0].outside.push(outsideSimon,outsideEight,outsideBoota);
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='play'&&a.uid===nia.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['top','outside']);
 const opened=s;
 let top=go(opened,{type:'chooseEffectMode',mode:'top'});
 assert.equal(top.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(top.pending.choices.slice().sort(),[simon.uid,eight.uid].sort());
 const hand=top.players[0].hand.map(c=>c.uid);
 top=go(top,{type:'chooseTopFiltered',uid:simon.uid});
 assert.ok(top.players[0].hand.some(c=>c.uid===simon.uid));
 assert.equal(top.pending.kind,'effect-top-order');
 assert.equal(top.pending.discardAfter,true);
 const order=[eight.uid,boota.uid,kittan.uid];
 for(const uid of order)top=go(top,act(top,a=>a.type==='chooseTopOrder'&&a.uid===uid));
 assert.equal(top.pending.kind,'effect-discard');
 const discard=top.players[0].hand.find(c=>c.uid!==simon.uid);
 top=go(top,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(top.pending,null);
 assert.ok(top.players[0].hand.some(c=>c.uid===simon.uid));
 assert.ok(top.players[0].outside.some(c=>c.uid===discard.uid));
 assert.deepEqual(top.players[0].deck.slice(-3).map(c=>c.uid),order);
 assert.equal(live(top,0,nia.uid).buffs.some(b=>b.energy),false);
 let skipped=go(opened,{type:'chooseEffectMode',mode:'top'});
 skipped=go(skipped,{type:'chooseTopFiltered',uid:null});
 assert.equal(skipped.pending.kind,'effect-top-order');
 assert.equal(skipped.pending.discardAfter,undefined);
 while(skipped.pending?.kind==='effect-top-order')
  skipped=go(skipped,legalUniversalActions(ttg,skipped)[0]);
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].hand.map(c=>c.uid),hand);
 assert.deepEqual(skipped.players[0].deck.slice(-4).map(c=>c.uid).sort(),
  [simon.uid,eight.uid,boota.uid,kittan.uid].sort());
 let outside=go(opened,{type:'chooseEffectMode',mode:'outside'});
 assert.equal(outside.pending.kind,'effect-outside-deck-top');
 assert.deepEqual(outside.pending.choices.slice().sort(),[outsideSimon.uid,outsideEight.uid].sort());
 const deckLabel=act(outside,a=>a.type==='chooseOutsideDeckTop'&&a.uid===outsideSimon.uid);
 assert.match(uiActionLabel(deckLabel,{pack:ttg,state:outside}),/牌庫頂/);
 outside=go(outside,deckLabel);
 assert.equal(outside.players[0].deck[0].uid,outsideSimon.uid);
 assert.ok(outside.players[0].outside.some(c=>c.uid===outsideBoota.uid));
 assert.equal(outside.pending,null);

 let fueled=fresh(8018);
 const line=[];
 for(let i=0;i<4;i++)line.push(place(fueled,0,'TTG-1-019','energy',i));
 const replacement=hold(fueled,0,'TTG-1-017');
 fueled=toPhase(fueled,'main');
 fueled=go(fueled,act(fueled,a=>a.type==='play'&&a.uid===replacement.uid&&a.line==='energy'&&a.replaceUid===line[0].uid));
 assert.equal(fueled.pending.kind,'effect-choice-mode');
 fueled=go(fueled,{type:'chooseEffectMode',mode:'outside'});
 const landed=live(fueled,0,replacement.uid);
 assert.equal(landed.buffs.some(b=>b.energy===2&&b.untilTurn===fueled.turn),true);
 assert.equal(universalCardEnergy(ttg,fueled,0,landed),4);
 assert.ok(fueled.players[0].removed.some(c=>c.uid===line[0].uid));
 assert.equal(fueled.players[0].energy.filter(Boolean).length,4);

 let front=fresh(8019);
 for(let i=0;i<4;i++)place(front,0,'TTG-1-019','energy',i);
 const ahead=hold(front,0,'TTG-1-017');
 front=toPhase(front,'main');
 front=go(front,act(front,a=>a.type==='play'&&a.uid===ahead.uid&&a.line==='front'));
 front=go(front,{type:'chooseEffectMode',mode:'outside'});
 const still=live(front,0,ahead.uid);
 assert.equal(still.buffs.some(b=>b.energy===2),true);
 assert.equal(universalCardEnergy(ttg,front,0,still),0);

 let life=fresh(8020);
 const green=hold(life,1,'TTG-1-019'),red=hold(life,1,'TTG-1-063');
 nullLife(life,1,'TTG-1-017');
 const attacker=place(life,0,'TTG-1-005','front',0);
 life=toPhase(life,'attack');
 life=go(life,act(life,a=>a.type==='attack'&&a.uid===attacker.uid));
 life=go(life,act(life,a=>a.type==='chooseBlock'&&a.uid===null));
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'color');
 const colors=legalUniversalActions(ttg,life).filter(a=>a.type==='chooseTrigger'&&a.mode==='color');
 assert.ok(colors.some(a=>a.uid===green.uid));
 assert.equal(colors.some(a=>a.uid===red.uid),false);
 life=go(life,act(life,a=>a.type==='chooseTrigger'&&a.mode==='color'&&a.uid===green.uid&&a.line==='front'));
 assert.equal(live(life,1,green.uid).ready,true);
 assert.ok(life.players[1].hand.some(c=>c.uid===red.uid));
 assertUniversalMatch(ttg,life);
});

test('TTG-040 draws, removes on use, redirects other removal, and stacks doubles',()=>{
 let s=fresh(8040);
 const yokos=[];
 for(let i=0;i<4;i++)yokos.push(place(s,0,'TTG-1-019','energy',i));
 const front=place(s,0,'TTG-1-005','front',0);
 const [spell,repeat]=holdTwo(s,0,'TTG-1-040');
 s=toPhase(s,'main');
 assert.equal(energyOf(s,0,front.uid),0);
 const hand=s.players[0].hand.length;
 s=go(s,act(s,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.ok(s.players[0].removed.some(c=>c.uid===spell.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===spell.uid),false);
 assert.equal(s.allFrontEnergy[0],spell.uid);
 assert.equal(energyOf(s,0,front.uid),1);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='event'&&a.uid===repeat.uid),false);
 assert.ok(s.players[0].hand.some(c=>c.uid===repeat.uid));
 s=go(s,act(s,a=>a.type==='activateRemoved'&&a.uid===spell.uid&&a.mode==='double'));
 assert.equal(energyOf(s,0,yokos[0].uid),4);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='activateRemoved'&&a.uid===spell.uid),false);
 const extra=takeExcept(s,0,'TTG-1-040',[spell.uid,repeat.uid]);
 s.players[0].removed.push(extra);
 s=go(s,act(s,a=>a.type==='activateRemoved'&&a.uid===extra.uid));
 assert.equal(s.energyDoubles[0],2);
 assert.equal(energyOf(s,0,yokos[0].uid),8);
 assert.equal(energyOf(s,0,front.uid),4);
 assertUniversalMatch(ttg,s);

 let limit=fresh(8042);
 const victim=hold(limit,0,'TTG-1-040');
 while(limit.players[0].hand.length<9){
  const card=limit.players[0].deck.pop();
  assert.ok(card);limit.players[0].hand.push(card);
 }
 limit=endTurn(limit);
 assert.equal(limit.pending.kind,'end-hand-limit');
 assert.equal(limit.active,0);
 limit=go(limit,act(limit,a=>a.type==='chooseHandLimit'&&a.uid===victim.uid));
 assert.ok(limit.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(limit.players[0].removed.some(c=>c.uid===victim.uid),false);
 assert.equal(limit.pending,null);
 assertUniversalMatch(ttg,limit);
});

test('TTG-068 gains BP per own raid and attacks from the energy line at most four times',()=>{
 let s=fresh(8068);
 const yoko=place(s,0,'TTG-1-068','energy',0);
 const second=place(s,0,'TTG-1-068','energy',1);
 for(let i=0;i<2;i++)place(s,0,'TTG-1-063','energy',i+2);
 const front=place(s,0,'TTG-1-068','front',0);
 const simon=place(s,0,'TTG-1-010','front',1);
 place(s,0,'TTG-1-005','front',2);
 place(s,0,'TTG-1-002','front',3);
 const blocker=place(s,1,'TTG-1-063','front',0);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s=toPhase(s,'main');
 assert.equal(universalBp(ttg,s,live(s,0,yoko.uid)),2000);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='activate'&&a.uid===yoko.uid),false);
 const fodder=s.players[0].deck.pop(),spare=s.players[0].deck.pop();
 s.players[0].hand.push(fodder,spare);
 const line=act(s,a=>a.type==='activate'&&a.uid===yoko.uid&&a.mode==='line');
 assert.match(uiActionLabel(line,{pack:ttg,state:s}),/能源線/);
 s=go(s,line);
 assert.equal(s.pending.kind,'effect-mode-discard');
 s=go(s,act(s,a=>a.type==='chooseModeDiscard'&&a.uid===fodder.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(s.players[0].outside.some(c=>c.uid===fodder.uid));
 assert.equal(live(s,0,yoko.uid).energyAttackGranted.turn,s.turn);
 assert.equal(s.attackCap[0],4);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='line'),false);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='line'),false);
 const raider=hold(s,0,'TTG-1-076');
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===simon.uid));
 s=settle(s);
 assert.equal(s.raidCount[0],1);
 assert.equal(universalBp(ttg,s,live(s,0,yoko.uid)),3000);
 for(const id of ['TTG-1-003','TTG-1-040','TTG-1-070'])nullLife(s,1,id);
 s=toPhase(s,'attack');
 const attacks=legalUniversalActions(ttg,s).filter(a=>a.type==='attack');
 assert.ok(attacks.some(a=>a.uid===yoko.uid));
 assert.equal(attacks.some(a=>a.uid===second.uid),false);
 assert.ok(attacks.some(a=>a.uid===front.uid));
 const life=s.players[1].life.length;
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===yoko.uid));
 assert.equal(s.pending.kind,'block');
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 s=go(s,act(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 assert.equal(s.players[1].life.length,life);
 assert.equal(live(s,0,yoko.uid).ready,false);
 function unblock(state){
  const uid=state.players[0].front.find(c=>c?.ready).uid;
  state=go(state,act(state,a=>a.type==='attack'&&a.uid===uid));
  state=go(state,act(state,a=>a.type==='chooseBlock'&&a.uid===null));
  if(state.pending?.kind==='life-trigger')
   state=go(state,act(state,a=>a.type==='chooseTrigger'&&a.mode==='skip'));
  return state;
 }
 for(let i=0;i<3;i++)s=unblock(s);
 assert.equal(s.attacksThisTurn,4);
 assert.ok([...s.players[0].front,...s.players[0].energy].some(c=>c?.ready));
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='attack'),false);
 s=endTurn(s);
 assert.equal(s.raidCount[0],0);
 assert.equal(s.attackCap[0],null);
 assert.equal(live(s,0,yoko.uid).energyAttackGranted,undefined);
 assert.equal(universalBp(ttg,s,live(s,0,yoko.uid)),2000);
 assertUniversalMatch(ttg,s);
});

test('TTG-070 hosts Gurren Lagann only while Kamina is absent, and chain raid stays closed',()=>{
 let s=fresh(8070);
 s=endTurn(s);
 for(let i=0;i<3;i++)place(s,1,'TTG-1-019','energy',i);
 const host=place(s,1,'TTG-1-070','front',0);
 const spare=place(s,1,'TTG-1-070','front',1);
 const [first,second]=holdTwo(s,1,'TTG-1-029');
 s=toPhase(s,'main');
 assert.equal(apReady(s,1),2);
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===host.uid));
 const top=live(s,1,first.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,host.uid);
 assert.equal(s.pending,null);
 const follow=legalUniversalActions(ttg,s).filter(a=>a.type==='raid'&&a.uid===second.uid);
 assert.equal(follow.some(a=>a.baseUid===top.uid),false);
 assert.ok(follow.some(a=>a.baseUid===spare.uid));
 assertUniversalMatch(ttg,s);

 let lagann=fresh(8071);
 for(let i=0;i<2;i++)place(lagann,0,'TTG-1-063','energy',i);
 const rossiu=place(lagann,0,'TTG-1-070','front',0);
 const simon=place(lagann,0,'TTG-1-010','front',1);
 const raider=hold(lagann,0,'TTG-1-076');
 lagann=toPhase(lagann,'main');
 const raids=legalUniversalActions(ttg,lagann).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===rossiu.uid),false);
 assert.ok(raids.some(a=>a.baseUid===simon.uid));

 let blocked=fresh(8072);
 for(let i=0;i<3;i++)place(blocked,0,'TTG-1-019','energy',i);
 place(blocked,0,'TTG-1-044','front',0);
 const closed=place(blocked,0,'TTG-1-070','front',1);
 const base=place(blocked,0,'TTG-1-010','front',2);
 const gurren=hold(blocked,0,'TTG-1-029');
 blocked=toPhase(blocked,'main');
 const open=legalUniversalActions(ttg,blocked).filter(a=>a.type==='raid'&&a.uid===gurren.uid);
 assert.equal(open.some(a=>a.baseUid===closed.uid),false);
 assert.ok(open.some(a=>a.baseUid===base.uid));
 blocked=go(blocked,act(blocked,a=>a.type==='raid'&&a.uid===gurren.uid&&a.baseUid===base.uid));
 assert.equal(live(blocked,0,gurren.uid).stack[0].uid,base.uid);
 assertUniversalMatch(ttg,blocked);
});

test('TTG-080 needs Kamina, adds one named card, and discounts only the next matching hand raid',()=>{
 let closed=fresh(8080);
 closed=endTurn(closed);
 for(let i=0;i<3;i++)place(closed,1,'TTG-1-063','energy',i);
 const spell=hold(closed,1,'TTG-1-080');
 closed=toPhase(closed,'main');
 assert.equal(apReady(closed,1),2);
 assert.equal(legalUniversalActions(ttg,closed).some(a=>a.type==='event'&&a.uid===spell.uid),false);
 place(closed,1,'TTG-1-044','front',0);
 const simon=place(closed,1,'TTG-1-010','front',1);
 const lagann=take(closed,1,'TTG-1-076'),gurren=take(closed,1,'TTG-1-029');
 const decoy=take(closed,1,'TTG-1-010');
 closed.players[1].outside.push(lagann,gurren,decoy);
 assert.ok(legalUniversalActions(ttg,closed).some(a=>a.type==='event'&&a.uid===spell.uid));
 closed=go(closed,act(closed,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(closed.pending.kind,'effect-outside-names');
 assert.equal(closed.handRaidCuts[1].length,1);
 assert.deepEqual(closed.pending.choices.slice().sort(),[lagann.uid,gurren.uid].sort());
 const add=act(closed,a=>a.type==='chooseOutsideName'&&a.uid===lagann.uid);
 assert.match(uiActionLabel(add,{pack:ttg,state:closed}),/手牌/);
 closed=go(closed,add);
 assert.ok(closed.players[1].hand.some(c=>c.uid===lagann.uid));
 assert.ok(closed.players[1].outside.some(c=>c.uid===decoy.uid));
 assert.equal(closed.handRaidCuts[1].length,1);
 const boota=hold(closed,1,'TTG-1-063');
 closed=go(closed,act(closed,a=>a.type==='play'&&a.uid===boota.uid&&a.line==='front'));
 assert.equal(closed.handRaidCuts[1].length,1);
 assert.equal(apReady(closed,1),0);
 assert.ok(legalUniversalActions(ttg,closed).some(a=>a.type==='raid'&&a.uid===lagann.uid&&a.baseUid===simon.uid));
 closed=go(closed,act(closed,a=>a.type==='raid'&&a.uid===lagann.uid&&a.baseUid===simon.uid));
 assert.equal(closed.handRaidCuts[1].length,0);
 assert.equal(apReady(closed,1),0);
 assert.equal(live(closed,1,lagann.uid).stack[0].uid,simon.uid);
 closed=settle(closed);
 assertUniversalMatch(ttg,closed);

 let plain=fresh(8081);
 plain=endTurn(plain);
 for(let i=0;i<3;i++)place(plain,1,'TTG-1-063','energy',i);
 place(plain,1,'TTG-1-044','front',0);
 const base=place(plain,1,'TTG-1-010','front',1);
 const event=hold(plain,1,'TTG-1-080');
 const [played,later]=holdTwo(plain,1,'TTG-1-076');
 plain.players[1].outside.push(take(plain,1,'TTG-1-029'));
 plain=toPhase(plain,'main');
 plain=go(plain,act(plain,a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(plain.pending.kind,'effect-outside-names');
 plain=go(plain,act(plain,a=>a.type==='chooseOutsideName'&&a.uid===null));
 assert.equal(plain.handRaidCuts[1].length,1);
 plain=go(plain,act(plain,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'));
 assert.equal(plain.handRaidCuts[1].length,1);
 plain=settle(plain);
 assert.equal(apReady(plain,1),0);
 plain=go(plain,act(plain,a=>a.type==='raid'&&a.uid===later.uid&&a.baseUid===base.uid));
 assert.equal(plain.handRaidCuts[1].length,0);
 assert.equal(apReady(plain,1),0);
 plain=settle(plain);
 assertUniversalMatch(ttg,plain);

 let buried=fresh(8082);
 buried=endTurn(buried);
 for(let i=0;i<3;i++)place(buried,1,'TTG-1-063','energy',i);
 const hidden=hold(buried,1,'TTG-1-080');
 buried=toPhase(buried,'main');
 assert.equal(legalUniversalActions(ttg,buried).some(a=>a.type==='event'&&a.uid===hidden.uid),false);
 const carrier=place(buried,1,'TTG-1-002','front',0);
 carrier.stack=[take(buried,1,'TTG-1-044')];
 assert.ok(legalUniversalActions(ttg,buried).some(a=>a.type==='event'&&a.uid===hidden.uid));
 buried=go(buried,act(buried,a=>a.type==='event'&&a.uid===hidden.uid));
 assert.equal(buried.pending,null);
 assert.equal(buried.handRaidCuts[1].length,1);
 assert.equal(buried.handRaidCuts[1][0].sourceUid,hidden.uid);
 assertUniversalMatch(ttg,buried);
});
