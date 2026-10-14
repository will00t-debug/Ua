import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_RED_BETA_PRESET,ttgExecutableActions,ttgActionLabel,ttgFilteredActions} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';

// Official AP payment is an actual player decision. Distinct physical AP cards
// may have different subsequent ready/REST options on 078/079 events.
function prepared(){
 const s=newTtgCoreMatch({decks:[TTG_RED_BETA_PRESET,TTG_RED_BETA_PRESET],seed:912,first:0});
 s.phase='main';
 const p=s.players[0];
 const pull=id=>{
  for(const zone of ['hand','deck','life']){
   const idx=p[zone].findIndex(c=>c.cardId===id);
   if(idx>=0)return p[zone].splice(idx,1)[0];
  }
  throw Error('missing physical card '+id);
 };
 p.hand.push(pull('TTG-1-078'));
 const source=pull('TTG-1-042');
 source.ready=true;source.energyBonus=4;p.energy[0]=source;
 p.energyProduced.red=5;
 p.apCards[0].ready=true;p.apCards[1].ready=true;
 return s;
}
test('TTG AP payment UI expands every READY AP as an explicit option, not always first AP',()=>{
 const s=prepared(),p=s.players[0];
 const handUid=p.hand.find(c=>c.cardId==='TTG-1-078').uid;
 const options=ttgExecutableActions(s).filter(a=>a.type==='playTtgEvent'&&a.handUid===handUid&&a.readyApUids.length===0);
 const payments=new Set(options.map(a=>a.payApUids.join(',')));
 assert.ok(payments.has(p.apCards[0].uid));
 assert.ok(payments.has(p.apCards[1].uid));
 assert.ok(options.every(a=>a.payApUids.length===1));
 const ui=ttgFilteredActions(s,{kind:'playTtgEvent',limit:500}).actions;
 for(const pay of [p.apCards[0],p.apCards[1]]){
  const selected=ui.find(a=>a.handUid===handUid&&a.payApUids[0]===pay.uid&&a.readyApUids.length===0);
  assert.ok(selected,'AP choice must have a clickable action');
  assert.match(ttgActionLabel(s,selected),new RegExp('支付 AP'+(p.apCards.indexOf(pay)+1)));
  const click=JSON.parse(decodeURIComponent(encodeURIComponent(JSON.stringify(selected))));
  const next=dispatchTtgCoreAction(s,click);
  assert.ok(assertTtgCoreState(next));
  assert.equal(next.players[0].apCards[p.apCards.indexOf(pay)].ready,false,'selected AP is spent');
  assert.equal(next.players[0].apCards[1-p.apCards.indexOf(pay)].ready,true,'unselected AP stays ready');
  assert.equal(next.players[0].outside.some(c=>c.uid===handUid),true,'event moved to outside');
 }
});
test('TTG AP recovery event can spend chosen AP then restore an independently chosen REST AP',()=>{
 const s=prepared(),p=s.players[0],handUid=p.hand.find(c=>c.cardId==='TTG-1-078').uid;
 const first=p.apCards[0],second=p.apCards[1];
 const chosen=ttgExecutableActions(s).find(a=>a.type==='playTtgEvent'&&a.handUid===handUid&&
  a.payApUids.length===1&&a.payApUids[0]===second.uid&&a.readyApUids.length===1&&a.readyApUids[0]===second.uid);
 assert.ok(chosen,'Pay second AP then refresh same physical AP is a legal player choice');
 assert.match(ttgActionLabel(s,chosen),/支付 AP2.*回復 AP2/);
 const next=dispatchTtgCoreAction(s,chosen);
 assert.ok(assertTtgCoreState(next));
 assert.equal(next.players[0].apCards[1].ready,true,'selected AP was refreshed');
 assert.equal(next.players[0].apCards[0].ready,true,'unselected AP remained READY');
});
