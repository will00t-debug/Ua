import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy,effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// UA56BT/TTG-1-060, 059, 058, 069, 024, 075, 021. Registration plus the
// scenarios below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const featured=['TTG-1-060','TTG-1-059','TTG-1-058','TTG-1-069','TTG-1-024','TTG-1-075','TTG-1-021'];
const fillers=['TTG-1-009','TTG-1-044','TTG-1-029','TTG-1-077','TTG-1-019','TTG-1-010','TTG-1-050','TTG-1-068','TTG-1-017'];
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
 return go(s,act(s,a=>a.type==='next'));
}
function fresh(seed,first=0){
 return newUniversalMatch(ttg,{decks:[deck,deck],first,seed});
}
function silence(s,uid,player=0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:player,sourceUid:uid,
  targetUid:uid,until:{player,phase:'attack',edge:'start'},sourceLinked:false});
}
function pile(top,base){
 top.stack=[base];top.ready=true;top.fieldEntryStamp=top.fieldEntryStamp||1;
 return top;
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function plays(s,id){
 return legalUniversalActions(ttg,s).filter(a=>a.type==='play'&&
  s.players[s.active].hand.some(c=>c.uid===a.uid&&c.cardId===id));
}
const greenField={type:'field',color:'green',energy:3};

test('seven more TTG cards keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 const expect={
  'TTG-1-060':['ニア','red',2,1,2000,1,'draw','character'],
  'TTG-1-059':['ニア','red',1,1,1000,1,null,'character'],
  'TTG-1-058':['ニア','red',0,1,500,1,'active','character'],
  'TTG-1-069':['リーロン','red',0,1,1000,1,null,'character'],
  'TTG-1-024':['レイテ','green',2,1,2500,1,null,'character'],
  'TTG-1-075':['大グレン団ガンメン','red',4,1,4000,1,'draw','character'],
  'TTG-1-021':['ヨーコ','green',3,1,3000,2,'active','character']
 };
 const match={
  'TTG-1-060':'卡米那','TTG-1-059':'REST','TTG-1-058':'登場','TTG-1-069':'退場',
  'TTG-1-024':'場域卡','TTG-1-075':'妮亞','TTG-1-021':'STEP'
 };
 for(const [id,printed] of Object.entries(expect)){
  const src=TTG_BY_ID[id],card=ttg.cards[id];
  assert.equal(src.number,'UA56BT/'+id);
  assert.ok(src.effect.includes(match[id]));
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],printed);
  assert.deepEqual(card.traits,src.traits||[]);
 }
 assert.equal(ttg.cards['TTG-1-060'].mutualPlayBan,'カミナ');
 assert.equal(ttg.cards['TTG-1-060'].passiveBonuses[0].extraEnergy,1);
 assert.equal(ttg.cards['TTG-1-059'].mainAbility.name,'シモン');
 assert.equal(ttg.cards['TTG-1-058'].effects.onPlay[0].scaledBp,1500);
 assert.equal(ttg.cards['TTG-1-069'].mainAbility.trait,'ガンメン');
 assert.equal(ttg.cards['TTG-1-024'].handFieldEnergyAura.color,'green');
 assert.deepEqual(ttg.cards['TTG-1-075'].mainAbility.modes,['bp','impactNull','doubleBlock']);
 assert.equal(ttg.cards['TTG-1-021'].step,true);
 assert.equal(ttg.cards['TTG-1-017'].mutualPlayBan,null);
});

test('TTG-1-060 blocks Kamina by name and adds energy only for a front Simon',()=>{
 let banned=fresh(1);
 const kamina=place(banned,0,'TTG-1-044','front',0);
 place(banned,0,'TTG-1-069','energy',0);
 place(banned,0,'TTG-1-059','energy',1);
 const nia=hold(banned,0,'TTG-1-060');
 banned=toPhase(banned,'main');
 assert.equal(plays(banned,'TTG-1-060').length,0);
 silence(banned,kamina.uid);
 banned=toPhase(banned,'main');
 assert.equal(plays(banned,'TTG-1-060').length,0,'silenced Kamina keeps its printed name');
 assert.throws(()=>dispatchUniversalAction(ttg,banned,{type:'play',uid:nia.uid,line:'energy',slot:2},{actor:1}),/Wrong player/);

 let buried=fresh(2);
 const hidden=place(buried,0,'TTG-1-044','front',0);
 const cover=take(buried,0,'TTG-1-050');
 cover.ready=true;cover.fieldEntryStamp=buried.nextFieldEntryStamp++;
 cover.stack=[hidden];buried.players[0].front[0]=cover;
 place(buried,0,'TTG-1-068','energy',0);
 hold(buried,0,'TTG-1-060');
 buried=toPhase(buried,'main');
 assert.equal(plays(buried,'TTG-1-060').length,0,'buried Kamina still blocks Nia');

 let reverse=fresh(3);
 const topNia=place(reverse,0,'TTG-1-060','front',0);
 place(reverse,0,'TTG-1-075','energy',0);
 place(reverse,0,'TTG-1-069','energy',1);
 place(reverse,0,'TTG-1-068','energy',2);
 hold(reverse,0,'TTG-1-044');
 reverse=toPhase(reverse,'main');
 assert.equal(plays(reverse,'TTG-1-044').length,0);
 silence(reverse,topNia.uid);
 assert.ok(plays(reverse,'TTG-1-044').length>0,'silenced Nia no longer stops Kamina');

 let under=fresh(4);
 const buriedNia=place(under,0,'TTG-1-060','front',0);
 const hat=take(under,0,'TTG-1-050');
 hat.ready=true;hat.fieldEntryStamp=under.nextFieldEntryStamp++;
 hat.stack=[buriedNia];under.players[0].front[0]=hat;
 place(under,0,'TTG-1-075','energy',0);
 place(under,0,'TTG-1-069','energy',1);
 place(under,0,'TTG-1-068','energy',2);
 hold(under,0,'TTG-1-044');
 under=toPhase(under,'main');
 assert.ok(plays(under,'TTG-1-044').length>0,'buried Nia does not stop Kamina');

 let other=fresh(5);
 place(other,1,'TTG-1-044','front',0);
 place(other,0,'TTG-1-069','energy',0);
 place(other,0,'TTG-1-059','energy',1);
 hold(other,0,'TTG-1-060');
 other=toPhase(other,'main');
 assert.ok(plays(other,'TTG-1-060').length>0,'opponent Kamina does not ban');

 let green=fresh(6);
 place(green,0,'TTG-1-017','front',0);
 place(green,0,'TTG-1-075','energy',0);
 place(green,0,'TTG-1-069','energy',1);
 place(green,0,'TTG-1-068','energy',2);
 hold(green,0,'TTG-1-044');
 green=toPhase(green,'main');
 assert.ok(plays(green,'TTG-1-044').length>0,'green Nia does not print the ban');

 let energy=fresh(7);
 const source=place(energy,0,'TTG-1-060','energy',0);
 assert.equal(universalCardEnergy(ttg,energy,0,source),1);
 const simon=place(energy,0,'TTG-1-009','front',0);
 assert.equal(universalCardEnergy(ttg,energy,0,source),2);
 energy.players[0].front[0]=null;energy.players[0].energy[1]=simon;
 assert.equal(universalCardEnergy(ttg,energy,0,source),1,'Simon on the energy line is not the front');
 const host=place(energy,0,'TTG-1-050','front',1);
 host.stack=[simon];energy.players[0].energy[1]=null;
 assert.equal(universalCardEnergy(ttg,energy,0,source),2,'front raid base Simon counts');
 energy.players[0].energy[0]=null;energy.players[0].front[0]=source;
 assert.equal(universalCardEnergy(ttg,energy,0,source),0,'front Nia still generates 0');
 energy.players[0].front[0]=null;energy.players[0].energy[0]=source;
 silence(energy,source.uid);
 assert.equal(universalCardEnergy(ttg,energy,0,source),1);
 assert.equal(assertUniversalMatch(ttg,energy),true);
});

test('TTG-1-059 rests itself and buffs only Simon or a Simon raid base',()=>{
 let s=fresh(8);
 const nia=place(s,0,'TTG-1-059','energy',0);
 const simon=place(s,0,'TTG-1-009','front',0);
 const other=place(s,0,'TTG-1-050','front',1);
 const host=place(s,0,'TTG-1-068','front',2);
 const base=take(s,0,'TTG-1-009');
 host.stack=[base];
 s=toPhase(s,'main');
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.type==='activate'&&a.mode==='selfRestBuff'&&a.uid===nia.uid),true);
 assert.match(uiActionLabel(act(s,a=>a.mode==='selfRestBuff'&&a.uid===nia.uid),{pack:ttg,state:s}),/REST/);
 s=go(s,act(s,a=>a.mode==='selfRestBuff'&&a.uid===nia.uid));
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(s.pending.choices.includes(simon.uid));
 assert.ok(s.pending.choices.includes(host.uid));
 assert.equal(s.pending.choices.includes(other.uid),false);
 assert.equal(live(s,0,nia.uid).ready,false);
 s=go(s,act(s,a=>a.type==='chooseOwnBuff'&&a.uid===host.uid));
 assert.equal(universalBp(ttg,s,live(s,0,host.uid)),ttg.cards['TTG-1-068'].bp+1000);
 assert.equal(universalBp(ttg,s,live(s,0,other.uid)),ttg.cards['TTG-1-050'].bp);
 live(s,0,nia.uid).ready=true;
 s=go(s,act(s,a=>a.mode==='selfRestBuff'&&a.uid===nia.uid));
 s=go(s,act(s,a=>a.type==='chooseOwnBuff'&&a.uid===simon.uid));
 assert.equal(universalBp(ttg,s,live(s,0,simon.uid)),ttg.cards['TTG-1-009'].bp+1000);
 live(s,0,nia.uid).ready=true;
 silence(s,nia.uid);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.uid===nia.uid&&a.mode==='selfRestBuff'),false);
 let empty=fresh(9);
 place(empty,0,'TTG-1-059','front',0);
 place(empty,0,'TTG-1-050','front',1);
 empty=toPhase(empty,'main');
 assert.equal(legalUniversalActions(ttg,empty).some(a=>a.mode==='selfRestBuff'),false);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('TTG-1-058 may buff another character for 1000, or 1500 for Simon',()=>{
 let s=fresh(10);
 const simon=place(s,0,'TTG-1-009','front',0);
 const other=place(s,0,'TTG-1-050','energy',0);
 const host=place(s,0,'TTG-1-068','front',1);
 host.stack=[take(s,0,'TTG-1-009')];
 const first=hold(s,0,'TTG-1-058');
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='play'&&a.uid===first.uid&&a.line==='energy'&&a.replaceUid===undefined));
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(first.uid),false);
 s=go(s,act(s,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 assert.equal(universalBp(ttg,s,live(s,0,other.uid)),ttg.cards['TTG-1-050'].bp+1000);
 const second=hold(s,0,'TTG-1-058');
 s=endTurn(s);s=endTurn(s);s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front'&&a.replaceUid===undefined));
 s=go(s,act(s,a=>a.type==='chooseOwnBuff'&&a.uid===simon.uid));
 assert.equal(universalBp(ttg,s,live(s,0,simon.uid)),ttg.cards['TTG-1-009'].bp+1500);
 const third=fresh(11);
 const raidHost=place(third,0,'TTG-1-068','front',0);
 raidHost.stack=[take(third,0,'TTG-1-009')];
 const card=hold(third,0,'TTG-1-058');
 let played=toPhase(third,'main');
 played=go(played,act(played,a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy'));
 played=go(played,act(played,a=>a.uid===raidHost.uid));
 assert.equal(universalBp(ttg,played,live(played,0,raidHost.uid)),ttg.cards['TTG-1-068'].bp+1500);

 let decline=fresh(12);
 place(decline,0,'TTG-1-050','front',0);
 const declining=hold(decline,0,'TTG-1-058');
 decline=toPhase(decline,'main');
 decline=go(decline,act(decline,a=>a.type==='play'&&a.uid===declining.uid&&a.line==='energy'));
 const before=universalBp(ttg,decline,decline.players[0].front[0]);
 decline=go(decline,act(decline,a=>a.type==='chooseOwnBuff'&&a.uid===null));
 assert.equal(decline.pending,null);
 assert.equal(universalBp(ttg,decline,decline.players[0].front[0]),before);

 let alone=fresh(13);
 const solo=hold(alone,0,'TTG-1-058');
 alone=toPhase(alone,'main');
 alone=go(alone,act(alone,a=>a.type==='play'&&a.uid===solo.uid&&a.line==='front'));
 assert.equal(alone.pending,null);

 let blocked=fresh(14);
 place(blocked,0,'TTG-1-044','front',0);
 hold(blocked,0,'TTG-1-058');
 blocked=toPhase(blocked,'main');
 assert.equal(plays(blocked,'TTG-1-058').length,0);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('TTG-1-069 retires itself only when an outside Gunmen can be recovered',()=>{
 let s=fresh(15);
 const leeron=place(s,0,'TTG-1-069','front',0);
 s=toPhase(s,'main');
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='restRetireTrait'),false);
 const fieldGunmen=aside(s,0,'TTG-1-077');
 const character=aside(s,0,'TTG-1-029');
 const choices=legalUniversalActions(ttg,s).filter(a=>a.mode==='restRetireTrait'&&a.uid===leeron.uid);
 assert.deepEqual(choices.map(a=>a.recoverUid).sort(),[fieldGunmen.uid,character.uid].sort());
 assert.match(uiActionLabel(choices[0],{pack:ttg,state:s}),/退場/);
 s=go(s,choices.find(a=>a.recoverUid===character.uid));
 assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===leeron.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===character.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===fieldGunmen.uid));
 assert.equal(s.pending,null);
 leeron.ready=false;
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='restRetireTrait'),false);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('TTG-1-024 discounts green field cards in hand and generates energy for Gunmen',()=>{
 let s=fresh(16);
 const one=place(s,0,'TTG-1-024','energy',0);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,greenField),2);
 const two=place(s,0,'TTG-1-024','front',0);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,greenField),1);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,{type:'field',color:'green',energy:1}),0);
 const redField=ttg.cards['TTG-1-077'];
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,redField),redField.energy);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,ttg.cards['TTG-1-009']),ttg.cards['TTG-1-009'].energy);
 silence(s,two.uid);
 assert.equal(effectiveHandRequiredEnergy(ttg,s,0,greenField),2);
 let foe=fresh(17);
 place(foe,1,'TTG-1-024','front',0);
 assert.equal(effectiveHandRequiredEnergy(ttg,foe,0,greenField),3);
 assert.equal(universalCardEnergy(ttg,s,0,one),1);
 const gunmen=place(s,0,'TTG-1-077','energy',1);
 assert.equal(universalCardEnergy(ttg,s,0,one),2);
 const cover=place(s,0,'TTG-1-050','front',1);
 cover.stack=[gunmen];s.players[0].energy[1]=null;
 assert.equal(universalCardEnergy(ttg,s,0,one),1,'buried Gunmen is not on the field');
 s.players[0].energy[0]=null;s.players[0].front[2]=one;
 place(s,0,'TTG-1-075','energy',2);
 assert.equal(universalCardEnergy(ttg,s,0,one),0);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('TTG-1-075 spends one use on a non-empty Gunmen-scaled subset',()=>{
 let s=fresh(18);
 const gunmen=place(s,0,'TTG-1-075','front',0);
 s=toPhase(s,'main');
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='gunmenModes'),false);
 const buried=place(s,0,'TTG-1-060','front',1);
 const hat=take(s,0,'TTG-1-050');
 hat.ready=true;hat.fieldEntryStamp=s.nextFieldEntryStamp++;
 hat.stack=[buried];s.players[0].front[1]=hat;
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.mode==='gunmenModes'),false);
 const nia=place(s,0,'TTG-1-058','energy',0);
 let singles=legalUniversalActions(ttg,s).filter(a=>a.mode==='gunmenModes'&&a.uid===gunmen.uid);
 assert.deepEqual(singles.map(a=>a.effects),[
  ['bp'],['bp','impactNull'],['bp','impactNull','doubleBlock'],['bp','doubleBlock'],
  ['impactNull'],['impactNull','doubleBlock'],['doubleBlock']
 ].filter(x=>x.length===1));
 const extra=place(s,0,'TTG-1-077','energy',1);
 place(s,0,'TTG-1-029','energy',2);
 const all=legalUniversalActions(ttg,s).filter(a=>a.mode==='gunmenModes'&&a.uid===gunmen.uid);
 assert.equal(all.some(a=>a.effects.length===0),false);
 assert.ok(all.some(a=>JSON.stringify(a.effects)===JSON.stringify(['bp','impactNull','doubleBlock'])));
 assert.match(uiActionLabel(all[0],{pack:ttg,state:s}),/顏面/);
 s=go(s,all.find(a=>a.effects.length===3));
 const granted=live(s,0,gunmen.uid);
 assert.equal(universalBp(ttg,s,granted),5000);
 assert.equal(granted.impactNullGranted.untilOwnTurnStart,s.players[0].ownTurns+1);
 assert.equal(granted.doubleBlockGranted.sourceUid,gunmen.uid);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.uid===gunmen.uid&&a.mode==='gunmenModes'),false);
 const copy=place(s,0,'TTG-1-075','front',2);
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.uid===copy.uid&&a.mode==='gunmenModes'));
 silence(s,copy.uid);
 assert.equal(legalUniversalActions(ttg,s).some(a=>a.uid===copy.uid&&a.mode==='gunmenModes'),false);
 s=endTurn(s);s=endTurn(s);s=toPhase(s,'main');
 assert.equal(live(s,0,gunmen.uid).impactNullGranted,undefined);
 assert.equal(live(s,0,gunmen.uid).doubleBlockGranted,undefined);
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.uid===gunmen.uid&&a.mode==='gunmenModes'));
 assert.equal(assertUniversalMatch(ttg,s),true);
 assert.ok(nia&&extra);
});

test('TTG-1-075 double block is live in the next battle and expires on the next own start',()=>{
 let s=fresh(19);
 s=endTurn(s);
 const nia=place(s,1,'TTG-1-058','energy',0);
 const blocker=place(s,1,'TTG-1-075','front',0);
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.uid===blocker.uid&&a.mode==='gunmenModes'&&
  JSON.stringify(a.effects)===JSON.stringify(['doubleBlock'])));
 s=endTurn(s);
 const attacker=place(s,0,'TTG-1-058','front',0);
 s=toPhase(s,'attack');
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===attacker.uid));
 assert.equal(s.pending.kind,'block');
 s=go(s,act(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 const lived=[...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===blocker.uid);
 assert.equal(lived.ready,true);
 assert.ok(nia);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('TTG-1-021 steps to energy and may return at attack start',()=>{
 let stepped=fresh(20);
 const yoko=place(stepped,0,'TTG-1-021','front',0);
 stepped=toPhase(stepped,'move');
 stepped=go(stepped,act(stepped,a=>a.type==='step'&&a.uid===yoko.uid&&a.replaceUid===undefined));
 assert.equal(stepped.players[0].front[0],null);
 assert.equal(stepped.players[0].energy.find(c=>c?.uid===yoko.uid).uid,yoko.uid);
 let quiet=fresh(21);
 const silenced=place(quiet,0,'TTG-1-021','front',0);
 silence(quiet,silenced.uid);
 quiet=toPhase(quiet,'move');
 assert.equal(legalUniversalActions(ttg,quiet).some(a=>a.type==='step'),false);

 let plain=fresh(22);
 place(plain,0,'TTG-1-021','energy',0);
 place(plain,0,'TTG-1-029','front',0);
 plain=toPhase(plain,'attack');
 assert.equal(plain.pending,null);

 let moved=fresh(23);
 const mover=place(moved,0,'TTG-1-021','energy',0);
 const gurren=place(moved,0,'TTG-1-029','front',0);
 const under=take(moved,0,'TTG-1-010');
 under.faceDown=true;gurren.under=[under];
 moved=toPhase(moved,'attack');
 assert.equal(moved.pending.kind,'effect-facedown-front');
 assert.ok(legalUniversalActions(ttg,moved).some(a=>a.mode==='skip'));
 assert.match(uiActionLabel({type:'chooseFacedownFront',mode:'skip'},{pack:ttg,state:moved}),/不從能源線/);
 const slot=legalUniversalActions(ttg,moved).find(a=>a.mode==='move'&&a.replaceUid===null).slot;
 moved=go(moved,act(moved,a=>a.mode==='move'&&a.slot===slot));
 assert.equal(moved.players[0].front[slot].uid,mover.uid);
 assert.equal(universalBp(ttg,moved,live(moved,0,mover.uid)),4000);
 assert.equal(moved.pending,null);

 let declined=fresh(24);
 const first=place(declined,0,'TTG-1-021','energy',0);
 const second=place(declined,0,'TTG-1-021','energy',1);
 const lagann=place(declined,0,'TTG-1-029','front',0);
 const hidden=take(declined,0,'TTG-1-010');
 hidden.faceDown=true;lagann.under=[hidden];
 declined=toPhase(declined,'attack');
 if(declined.pending?.kind==='phase-order')
  declined=go(declined,act(declined,a=>a.type==='choosePhaseOrder'));
 assert.equal(declined.pending.kind,'effect-facedown-front');
 declined=go(declined,act(declined,a=>a.mode==='skip'));
 assert.equal(declined.pending.kind,'effect-facedown-front');
 const open=legalUniversalActions(ttg,declined).find(a=>a.mode==='move');
 declined=go(declined,open);
 assert.equal(declined.pending,null);
 assert.ok([first.uid,second.uid].includes(declined.players[0].front[open.slot].uid));

 let full=fresh(25);
 const returning=place(full,0,'TTG-1-021','energy',0);
 const kept=place(full,0,'TTG-1-029','front',0);
 const down=take(full,0,'TTG-1-010');
 down.faceDown=true;kept.under=[down];
 const displaced=place(full,0,'TTG-1-050','front',1);
 const simon=take(full,0,'TTG-1-009');
 displaced.stack=[simon];
 place(full,0,'TTG-1-019','front',2);
 place(full,0,'TTG-1-017','front',3);
 full=toPhase(full,'attack');
 assert.equal(legalUniversalActions(ttg,full).some(a=>a.mode==='move'&&a.replaceUid===null),false);
 full=go(full,act(full,a=>a.mode==='move'&&a.replaceUid===displaced.uid));
 assert.equal(full.players[0].front[1].uid,returning.uid);
 assert.equal(universalBp(ttg,full,live(full,0,returning.uid)),4000);
 assert.equal(full.players[0].outside.some(c=>c.uid===displaced.uid||c.uid===simon.uid),false);
 const removed=full.players[0].removed.find(c=>c.uid===displaced.uid);
 assert.ok(removed);
 assert.equal(removed.stack[0].uid,simon.uid);
 assert.equal(assertUniversalMatch(ttg,full),true);
});
