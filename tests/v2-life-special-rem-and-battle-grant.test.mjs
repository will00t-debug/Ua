import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRezeroBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

// EX17BT/REZ-2-021 SPECIAL retires any opposing front character.
// UA40BT/REZ-1-053 (the other 5-energy / 1-AP Rem) grants a blue energy-0
// Subaru 「このターン中、BP4000以上のキャラにブロックされない」 when it attacks
// in a face-up Raid. Retiring that Rem must keep the ceiling for the turn.
// SAO-1-024 and KJN-1-069 sniper grants are this turn only; ending the attack
// used to throw "Forged temporary physical battle grant" and freeze the turn.

const rez=createRezeroBattlePack();
const rezPacks=[rez,rez];
const rezIds=['REZ-1-053','REZ-1-051','REZ-1-048','REZ-1-038','REZ-1-040','REZ-1-020',
 'REZ-2-021','REZ-1-012','REZ-1-016','REZ-1-043','REZ-1-014','REZ-1-037','REZ-2-032'];
const rezCounts=Object.fromEntries(rezIds.map((id,i)=>[id,i===rezIds.length-1?2:4]));

function take(pack,s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' in '+pack.id);
}
function stamp(s,card){
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.stack||=[];card.under||=[];card.buffs||=[];
 return card;
}
function act(packs,s,pred){
 const legal=legalUniversalActions(packs,s);
 const found=typeof pred==='function'?legal.find(pred):
  legal.find(a=>Object.entries(pred).every(([k,v])=>a[k]===v));
 assert.ok(found,'no legal action; pending '+(s.pending?.kind||'none')+
  ' phase '+s.phase);
 return dispatchUniversalAction(packs,s,found);
}
function toPhase(packs,s,player,phase){
 for(let n=0;n<12&&!(s.active===player&&s.phase===phase&&!s.pending);n++){
  assert.equal(s.pending,null,s.pending?.kind);
  s=act(packs,s,{type:'next'});
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 assert.equal(s.pending,null);
 return s;
}
function topLife(s,p,id){
 const card=take(rez,s,p,id);
 const pl=s.players[p];
 if(pl.life.length>=7)pl.deck.push(pl.life.pop());
 pl.life.unshift(card);
 return card;
}
function freshRez(seed){
 assert.deepEqual(validateUniversalDeck(rez,rezCounts),[]);
 return newUniversalMatch(rezPacks,{decks:[rezCounts,rezCounts],first:0,seed});
}
function raidRem(s,id){
 const base=stamp(s,take(rez,s,0,'REZ-1-048'));
 const rem=stamp(s,take(rez,s,0,id));
 base.faceDown=false;base.ready=false;
 rem.stack=[base];rem.under=[];rem.raidBaseUid=base.uid;rem.raidedTurn=s.turn;rem.ready=true;
 s.players[0].front[0]=rem;
 return {rem,base};
}

test('REZ-2-021 life SPECIAL can retire the REZ-1-053 that granted the block ceiling',()=>{
 let s=freshRez(21021);
 const {rem}=raidRem(s,'REZ-1-053');
 const cheap=stamp(s,take(rez,s,0,'REZ-1-038'));
 const tall=stamp(s,take(rez,s,0,'REZ-1-040'));
 s.players[0].front[1]=cheap;
 s.players[0].front[2]=tall;
 topLife(s,1,'REZ-2-021');
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 s=toPhase(rezPacks,s,0,'attack');
 s=act(rezPacks,s,a=>a.type==='attack'&&a.uid===rem.uid&&a.targetUid===undefined);
 assert.equal(s.pending.kind,'effect-grant-printed-block');
 assert.ok(s.pending.choices.includes(cheap.uid));
 s=act(rezPacks,s,{type:'chooseGrantPrintedBlock',uid:cheap.uid});
 assert.equal(s.players[0].front[1].blockAtLeastGranted.bp,4000);
 assert.equal(s.pending.kind,'block');
 s=act(rezPacks,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 assert.equal(s.effectQueue.length,0);
 const targets=legalUniversalActions(rezPacks,s).filter(a=>a.type==='chooseTrigger'&&a.mode==='special');
 assert.deepEqual(targets.map(a=>a.uid).sort(),[rem.uid,cheap.uid,tall.uid].sort());

 const retireRem=act(rezPacks,structuredClone(s),{type:'chooseTrigger',mode:'special',uid:rem.uid});
 assert.equal(retireRem.pending,null);
 assert.equal(retireRem.players[0].front.some(c=>c?.uid===rem.uid),false);
 assert.ok(retireRem.players[0].outside.some(c=>c.uid===rem.uid));
 const kept=retireRem.players[0].front.find(c=>c?.uid===cheap.uid);
 assert.equal(kept.blockAtLeastGranted.bp,4000);
 assert.equal(kept.blockAtLeastGranted.turn,retireRem.turn);
 assert.equal(assertUniversalMatch(rezPacks,retireRem),true);

 const retireCheap=act(rezPacks,structuredClone(s),{type:'chooseTrigger',mode:'special',uid:cheap.uid});
 assert.equal(retireCheap.pending,null);
 assert.ok(retireCheap.players[0].front.some(c=>c?.uid===rem.uid));
 assert.equal(retireCheap.players[0].outside.find(c=>c.uid===cheap.uid).blockAtLeastGranted,undefined);
 assert.equal(assertUniversalMatch(rezPacks,retireCheap),true);

 const retireTall=act(rezPacks,structuredClone(s),{type:'chooseTrigger',mode:'special',uid:tall.uid});
 assert.equal(retireTall.pending,null);
 assert.equal(retireTall.players[0].front.find(c=>c?.uid===cheap.uid).blockAtLeastGranted.bp,4000);
 assert.equal(assertUniversalMatch(rezPacks,retireTall),true);
});

test('REZ-2-021 life SPECIAL can retire a raided REZ-1-051',()=>{
 let s=freshRez(21051);
 const {rem}=raidRem(s,'REZ-1-051');
 topLife(s,1,'REZ-2-021');
 s=toPhase(rezPacks,s,0,'attack');
 s=act(rezPacks,s,a=>a.type==='attack'&&a.uid===rem.uid);
 assert.equal(s.pending.kind,'block');
 s=act(rezPacks,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 s=act(rezPacks,s,{type:'chooseTrigger',mode:'special',uid:rem.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===rem.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('a departed REZ-1-053 proves the ceiling only after that physical attacked',()=>{
 let s=freshRez(21053);
 const rem=take(rez,s,0,'REZ-1-053');
 s.players[0].outside.push(rem);
 const cheap=stamp(s,take(rez,s,0,'REZ-1-038'));
 s.players[0].front[0]=cheap;
 cheap.blockAtLeastGranted={turn:s.turn,stamp:cheap.fieldEntryStamp,bp:4000};
 assert.throws(()=>assertUniversalMatch(rezPacks,s),/Forged blocker ceiling/);
 s.attacksByUid[rem.uid]=1;
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

const sao=registeredV2TitlePack('sword-art-online');
const saoPacks=[sao,sao];
function saoDeck(required){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function saoFresh(required,seed){
 return newUniversalMatch(saoPacks,{decks:[saoDeck(required),saoDeck(required)],first:0,seed});
}
function saoTake(s,p,id){return take(sao,s,p,id);}
function saoPlace(s,p,id,line,slot,ready=true){
 const card=saoTake(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function saoHold(s,p,id){
 const card=saoTake(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function saoSpot(s,uid){
 for(const pl of s.players){
  const walk=c=>{
   if(!c)return null;
   if(c.uid===uid)return c;
   for(const layer of [...(c.stack||[]),...(c.under||[])]){
    const hit=walk(layer);if(hit)return hit;
   }
   return null;
  };
  for(const zone of ['hand','deck','life','outside','removed']){
   for(const c of pl[zone]||[]){const hit=walk(c);if(hit)return hit;}
  }
  for(const line of ['front','energy']){
   for(const c of pl[line]){const hit=walk(c);if(hit)return hit;}
  }
 }
 throw Error('lost '+uid);
}

test('SAO-1-024 sniper expires when the attack phase ends',()=>{
 let s=saoFresh(['SAO-1-024','SAO-1-001'],8024);
 const sinon=saoPlace(s,0,'SAO-1-024','front',0);
 s=toPhase(saoPacks,s,0,'main');
 const pay=saoHold(s,0,'SAO-1-001');
 s=act(saoPacks,s,a=>a.type==='activate'&&a.uid===sinon.uid&&a.mode==='oncePay');
 s=act(saoPacks,s,a=>a.type==='chooseDiscardGate'&&a.uid===pay.uid);
 assert.equal(saoSpot(s,sinon.uid).sniperGranted.maxBp,2500);
 s=act(saoPacks,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=act(saoPacks,s,{type:'next'});
 assert.equal(s.pending,null);
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(saoSpot(s,sinon.uid).sniperGranted,undefined);
 assert.equal(assertUniversalMatch(saoPacks,s),true);
});

test('raiding over SAO-1-024 drops its sniper grant instead of carrying it under',()=>{
 let s=saoFresh(['SAO-1-024','SAO-1-025','SAO-1-001','SAO-1-003'],8025);
 const sinon=saoPlace(s,0,'SAO-1-024','front',0);
 for(let i=0;i<4;i++)saoPlace(s,0,'SAO-1-001','energy',i,false);
 s=toPhase(saoPacks,s,0,'main');
 const pay=saoHold(s,0,'SAO-1-003');
 s=act(saoPacks,s,a=>a.type==='activate'&&a.uid===sinon.uid&&a.mode==='oncePay');
 s=act(saoPacks,s,a=>a.type==='chooseDiscardGate'&&a.uid===pay.uid);
 assert.equal(saoSpot(s,sinon.uid).sniperGranted.maxBp,2500);
 const cover=saoHold(s,0,'SAO-1-025');
 s=act(saoPacks,s,a=>a.type==='raid'&&a.uid===cover.uid&&a.baseUid===sinon.uid);
 const top=s.players[0].front.find(c=>c?.uid===cover.uid);
 assert.equal(top.stack[0].uid,sinon.uid);
 assert.equal(top.stack[0].sniperGranted,undefined);
 assert.equal(top.sniperGranted,undefined);
 s=toPhase(saoPacks,s,1,'start');
 assert.equal(saoSpot(s,sinon.uid).sniperGranted,undefined);
 assert.equal(assertUniversalMatch(saoPacks,s),true);
});

const kjn=createKjnV2Pack();
const kjnPacks=[kjn,kjn];
function kjnCounts(required){
 const fillers=Object.values(kjn.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(kjn,counts),[]);
 return counts;
}
test('a rejected life-trigger choice is shown inside the pending dialog',()=>{
 const js=fs.readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const dialog=js.split('function pendingDialog(')[1]?.split('function finishMessage(')[0]||'';
 const headline=dialog.indexOf("class:'headline'");
 const error=dialog.indexOf("if(app.error)dialog.append(el('p',{class:'v2-error',role:'alert',text:app.error}))");
 const note=dialog.indexOf("class:'note'");
 assert.ok(headline>=0&&error>headline&&note>error);
});

test('KJN-1-069 sniper expires when the attack phase ends',()=>{
 const counts=kjnCounts(['KJN-1-069','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-071','KJN-1-043']);
 let s=toPhase(kjnPacks,newUniversalMatch(kjnPacks,{decks:[counts,counts],seed:69,first:0}),0,'main');
 const put=(id,line,slot)=>{
  const card=take(kjn,s,0,id);
  card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0][line][slot]=card;
  return card;
 };
 put('KJN-1-052','energy',0);
 put('KJN-1-057','energy',1);
 put('KJN-1-059','energy',2);
 put('KJN-1-065','energy',3);
 put('KJN-1-062','front',0);
 put('KJN-1-071','front',1);
 const delta=take(kjn,s,0,'KJN-1-069');
 s.players[0].hand.push(delta);
 s=act(kjnPacks,s,a=>a.type==='play'&&a.uid===delta.uid&&a.line==='front'&&a.replaceUid===undefined);
 const sniper=s.players[0].front.find(c=>c?.uid===delta.uid);
 assert.equal(sniper.sniperGranted.turn,s.turn);
 s=toPhase(kjnPacks,s,0,'attack');
 s=act(kjnPacks,s,{type:'next'});
 assert.equal(s.pending,null);
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(s.players[0].front.find(c=>c?.uid===delta.uid).sniperGranted,undefined);
 assert.equal(assertUniversalMatch(kjnPacks,s),true);
});
