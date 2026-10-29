import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {v2InventoryForTitle} from '../dist/universal-v2/title-packs/inventory.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const IDS=['MST-1-008','MST-1-025','MST-1-026','MST-1-032','MST-1-033',
 'MST-1-038','MST-1-039','MST-1-067','MST-1-068','MST-1-073'];
const deck={
 'MST-1-002':4,'MST-1-003':4,'MST-1-006':4,'MST-1-010':4,'MST-1-020':4,
 'MST-1-022':4,'MST-1-034':2,'MST-1-036':2,'MST-1-060':2,
 'MST-1-008':2,'MST-1-025':2,'MST-1-026':2,'MST-1-032':2,'MST-1-033':2,
 'MST-1-038':2,'MST-1-039':2,'MST-1-067':2,'MST-1-068':2,'MST-1-073':2
};
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing actual '+id);
}
function place(s,p,id,line,slot,ready=true){
 assert.equal(s.players[p][line][slot],null);
 const c=take(s,p,id);c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(mst.cards[id].ownEffectActiveOnly)c.ownEffectActiveOnly=true;
 s.players[p][line][slot]=c;
 return c;
}
function hold(s,p,id){
 const c=s.players[p].hand.find(x=>x.cardId===id)||take(s,p,id);
 if(!s.players[p].hand.includes(c))s.players[p].hand.push(c);
 return c;
}
function count(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line]){
  if(!c)continue;
  n+=1+(c.stack||[]).length+(c.under||[]).length;
 }
 return n;
}
function advance(packs,s,pred){
 for(let n=0;n<50&&!pred(s);n++){
  const legal=legalUniversalActions(packs,s);
  const step=s.pending
   ?legal.find(a=>a.uid===null||a.mode==='skip'||a.mode==='keep'||a.mode==='decline')||legal[0]
   :legal.find(a=>a.type==='next');
  assert.ok(step,s.phase+' '+(s.pending&&s.pending.kind));
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.ok(pred(s),s.phase+' active '+s.active+' '+(s.pending&&s.pending.kind));
 return s;
}
function toMain(packs,s,owner=0){
 return advance(packs,s,x=>x.active===owner&&x.phase==='main'&&!x.pending);
}
function match(){
 const packs=[mst,mst];
 return {packs,s:newUniversalMatch(packs,{decks:[deck,deck],seed:73028,first:0})};
}
function raidOnto(s,p,topId,base,line,slot){
 const top=take(s,p,topId);
 top.stack=[base];top.raidBaseUid=base.uid;top.ready=true;top.faceDown=false;
 top.fieldEntryStamp=s.nextFieldEntryStamp++;
 top.buffs=[];top.under=[];
 s.players[p][line][slot]=top;
 return top;
}

test('the remaining Mushoku Tensei prints are registered without FAQ certification',()=>{
 assert.deepEqual(validateUniversalDeck(mst,deck),[]);
 assert.equal(Object.keys(mst.cards).length,80);
 assert.equal(EXPECTED_V2_COUNTS['mushoku-tensei'],80);
 const inventory=v2InventoryForTitle('mushoku-tensei');
 assert.deepEqual(inventory.unportedIds,[]);
 assert.equal(inventory.pilotImplemented,80);
 assert.equal(inventory.fullyAccepted,0);
 for(const id of IDS){
  assert.equal(mst.cards[id].name,MST_V2_OFFICIAL_BY_ID[id].nameJa);
  assert.equal(mst.cards[id].implementation,'dsl');
 }
 assert.equal(mst.cards['MST-1-033'].color,'blue');
 assert.equal(mst.cards['MST-1-026'].frontForbidden,true);
 assert.equal(mst.cards['MST-1-026'].ownEffectMoveOnly,true);
 assert.equal(mst.cards['MST-1-073'].energyLineForbidden,true);
 assert.equal(mst.cards['MST-1-073'].ownEffectActiveOnly,true);
 assert.deepEqual(mst.cards['MST-1-067'].nameAliases,['シルフィエット']);
 // Q2162 asks about opponent CHARACTER effects. The print says opponent
 // effects, and that wider scope is what the engine grants. Not certified.
 assert.equal(mst.cards['MST-1-067'].effects.onPlay[0].op,'protectMinGenTrait');
});

test('MST-1-008 stays and gains BP once when it loses a battle',()=>{
 const {packs,s:opened}=match();
 const before=count(opened.players[0]);
 const eris=place(opened,0,'MST-1-008','front',0);
 const wall=place(opened,1,'MST-1-025','front',0);
 let s=advance(packs,opened,x=>x.phase==='attack'&&x.active===0&&!x.pending);
 // No printed MST character beats the post-stay 5000 BP. Official Q34
 // leaves both characters in place, so the second same-turn loss only
 // proves the printed once does not ready or grant BP again.
 s.players[1].front.find(c=>c?.uid===wall.uid).buffs.push({bp:2000,untilTurn:s.turn});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:eris.uid});
 const block=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.ok(block);
 s=dispatchUniversalAction(packs,s,block);
 const stayed=s.players[0].front.find(c=>c?.uid===eris.uid);
 assert.ok(stayed);
 assert.equal(stayed.ready,true);
 assert.equal(universalBp(packs,s,stayed),5000);
 assert.equal(count(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=advance(packs,s,x=>x.phase==='attack'&&x.active===0&&!x.pending);
 s.players[1].front.find(c=>c?.uid===wall.uid).ready=true;
 const again=s.players[0].front.find(c=>c?.uid===eris.uid);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:again.uid});
 const block2=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 s=dispatchUniversalAction(packs,s,block2);
 const still=s.players[0].front.find(c=>c?.uid===eris.uid);
 assert.ok(still);
 assert.equal(still.ready,false);
 assert.equal(universalBp(packs,s,still),5000);
 assert.equal(s.players[0].outside.some(c=>c.uid===eris.uid),false);
 assert.equal(count(s.players[0]),before);
});

test('MST-1-026 cannot be played to the front and draws on attack',()=>{
 const {packs,s:opened}=match();
 let s=toMain(packs,opened);
 place(s,0,'MST-1-006','energy',0);
 place(s,0,'MST-1-010','energy',1);
 const roxy=place(s,0,'MST-1-032','front',0);
 const card=hold(s,0,'MST-1-026');
 const legal=legalUniversalActions(packs,s).filter(a=>a.uid===card.uid&&a.type==='play');
 assert.ok(legal.length);
 assert.ok(legal.every(a=>a.line==='energy'));
 const spot=legal.find(a=>a.line==='energy');
 s=dispatchUniversalAction(packs,s,spot);
 assert.ok(s.players[0].energy.some(c=>c?.uid===card.uid));
 const mover=s.players[0].front.find(c=>c?.uid===roxy.uid);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===mover.uid&&a.mode==='move');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 s=dispatchUniversalAction(packs,s,{type:'chooseLineMove',uid:card.uid});
 const slot=legalUniversalActions(packs,s).find(a=>a.type==='chooseLineSlot'&&a.replaceUid===undefined);
 s=dispatchUniversalAction(packs,s,slot);
 const placed=s.players[0].front.find(c=>c?.uid===card.uid);
 assert.equal(placed.ownEffectFront,true);
 const playedTurn=s.turn;
 s=advance(packs,s,x=>x.phase==='attack'&&x.active===0&&!x.pending&&x.turn>playedTurn);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:placed.uid});
 const draw=legalUniversalActions(packs,s).find(a=>a.mode==='draw');
 assert.ok(draw,JSON.stringify(legalUniversalActions(packs,s).slice(0,4)));
 s=dispatchUniversalAction(packs,s,draw);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-073 ignores the refresh and its named main acts once',()=>{
 const {packs,s:opened}=match();
 const before=count(opened.players[0]);
 let s=toMain(packs,opened);
 const rudeus=place(s,0,'MST-1-073','front',0,false);
 place(s,0,'MST-1-068','energy',0);
 place(s,0,'MST-1-068','energy',1);
 place(s,0,'MST-1-026','energy',2);
 place(s,0,'MST-1-026','energy',3);
 s=advance(packs,s,x=>x.phase==='end'||x.active!==0||x.pending);
 s=advance(packs,s,x=>x.active===0&&x.phase==='main'&&!x.pending);
 const quiet=s.players[0].front.find(c=>c?.uid===rudeus.uid);
 assert.equal(quiet.ready,false);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===rudeus.uid&&
  a.mode==='energyNamedSuite');
 assert.ok(act);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.players[0].front.find(c=>c?.uid===rudeus.uid).ready,true);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending?.kind,'effect-buff-own');
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===null));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='energyNamedSuite'),false);
 assert.equal(count(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-033 pays the field and must play a legal blue character',()=>{
 const {packs,s:opened}=match();
 const before=count(opened.players[0]);
 let s=toMain(packs,opened);
 const field=place(s,0,'MST-1-033','energy',0,true);
 const blue=hold(s,0,'MST-1-008');
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:field.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid));
 assert.equal(s.pending?.kind,'effect-hand-rest-or-raid');
 assert.equal(s.pending.optional,false);
 const play=legalUniversalActions(packs,s).find(a=>a.uid===blue.uid&&a.mode==='enter');
 assert.ok(play);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=dispatchUniversalAction(packs,s,play);
 const entered=s.players[0][play.line][play.slot];
 assert.equal(entered.uid,blue.uid);
 assert.equal(entered.ready,false);
 assert.equal(count(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-038 buffs on play and returns from outside after a named raid',()=>{
 const {packs,s:opened}=match();
 const before=count(opened.players[0]);
 let s=advance(packs,opened,x=>x.active===0&&x.phase==='main'&&!x.pending&&
  x.players[0].ownTurns>=2);
 const ally=place(s,0,'MST-1-020','front',0);
 place(s,0,'MST-1-006','energy',0);
 place(s,0,'MST-1-010','energy',1);
 const event=hold(s,0,'MST-1-038');
 s=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),
  mst.cards['MST-1-020'].bp+1000);
 const gift=s.players[0].outside.find(c=>c.uid===event.uid);
 assert.ok(gift);
 const base=place(s,0,'MST-1-022','front',1);
 const top=hold(s,0,'MST-1-025');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&
  a.baseUid===base.uid);
 assert.ok(raid,JSON.stringify(legalUniversalActions(packs,s).filter(a=>a.uid===top.uid)));
 s=dispatchUniversalAction(packs,s,raid);
 for(let n=0;n<6&&s.pending;n++){
  const legal=legalUniversalActions(packs,s);
  const skip=legal.find(a=>a.uid===null||a.mode==='skip'||a.mode==='decline');
  s=dispatchUniversalAction(packs,s,skip||legal[0]);
 }
 const back=legalUniversalActions(packs,s).find(a=>a.mode==='outsideRaidReturn'&&a.uid===gift.uid);
 assert.ok(back);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,back);
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,discard);
 assert.ok(s.players[0].hand.some(c=>c.uid===gift.uid));
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(count(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-067 grants printed opponent-effect protection and can return the raid base',()=>{
 const {packs,s:opened}=match();
 const before=count(opened.players[0]);
 let s=toMain(packs,opened);
 place(s,0,'MST-1-068','energy',0);
 place(s,0,'MST-1-068','energy',1);
 const base=place(s,0,'MST-1-060','front',0);
 const fitz=hold(s,0,'MST-1-067');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===fitz.uid&&
  a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(packs,s,raid);
 if(s.pending?.kind==='effect-protect-gen'){
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid!==null));
 }
 const top=s.players[0].front.find(c=>c?.uid===fitz.uid);
 assert.ok(top);
 const protectedUid=s.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect')?.targetUid;
 assert.ok(protectedUid);
 assert.equal(s.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect').selectionScope,'any');
 // Official Q34: losing an attack does not retire Fitz. A lost block does.
 const rival=place(s,1,'MST-1-025','front',0);
 s=advance(packs,s,x=>x.phase==='attack'&&x.active===1&&!x.pending);
 const live=s.players[0].front.find(c=>c?.uid===fitz.uid);
 assert.ok(live);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:rival.uid});
 const block=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===live.uid);
 assert.ok(block);
 s=dispatchUniversalAction(packs,s,block);
 assert.equal(s.pending?.kind,'effect-raid-base-choice');
 const hand=legalUniversalActions(packs,s).find(a=>a.mode==='hand'&&a.uid===base.uid);
 assert.ok(hand);
 s=dispatchUniversalAction(packs,s,hand);
 assert.ok(s.players[0].hand.some(c=>c.uid===base.uid));
 assert.equal(count(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});
