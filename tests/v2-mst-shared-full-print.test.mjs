import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,zoneRequiredEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const deck={
 'MST-1-002':4,'MST-1-003':4,'MST-1-006':1,'MST-1-010':2,'MST-1-019':1,
 'MST-1-005':2,'MST-1-009':2,'MST-1-014':2,'MST-1-020':4,
 'MST-1-021':2,'MST-1-022':2,'MST-1-031':2,'MST-1-034':4,
 'MST-1-035':2,'MST-1-036':2,'MST-1-049':2,'MST-1-050':2,
 'MST-1-058':2,'MST-1-060':1,'MST-1-062':1,'MST-1-064':1,
 'MST-1-066':1,'MST-1-080':4
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
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;
 return c;
}
function hold(s,p,id){
 const c=s.players[p].hand.find(x=>x.cardId===id)||take(s,p,id);
 if(!s.players[p].hand.includes(c))s.players[p].hand.push(c);
 return c;
}
function top(s,p,ids){
 const deck=s.players[p].deck;
 for(const id of [...ids].reverse()){
  const i=deck.findIndex(c=>c.cardId===id);
  assert.ok(i>=0,id);
  deck.unshift(deck.splice(i,1)[0]);
 }
}
function advance(packs,s,pred){
 for(let n=0;n<40&&!pred(s);n++){
  const legal=legalUniversalActions(packs,s);
  const step=s.pending
   ?legal.find(a=>a.uid===null||a.mode==='skip'||a.mode==='keep')||legal[0]
   :legal.find(a=>a.type==='next');
  assert.ok(step,s.phase+' '+(s.pending&&s.pending.kind));
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.ok(pred(s),s.phase+' active '+s.active);
 return s;
}
function toMain(packs,s,owner=0){
 return advance(packs,s,x=>x.active===owner&&x.phase==='main'&&!x.pending);
}
function match(first=0){
 const packs=[mst,mst];
 return {packs,s:newUniversalMatch(packs,{decks:[deck,deck],seed:54021,first})};
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

test('MST-1-005/014/021/035/036/058 pin the official print on shared profiles',()=>{
 assert.deepEqual(validateUniversalDeck(mst,deck),[]);
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.equal(EXPECTED_V2_COUNTS['mushoku-tensei'],66);
 for(const id of ['MST-1-005','MST-1-014','MST-1-021','MST-1-035','MST-1-036','MST-1-058'])
  assert.equal(mst.cards[id].name,MST_V2_OFFICIAL_BY_ID[id].nameJa);
 assert.equal(mst.cards['MST-1-005'].impactNull,true);
 assert.equal(mst.cards['MST-1-005'].emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(mst.cards['MST-1-005'].passiveBonuses,[{
  condition:{kind:'ownEffectCharacterEntryOrRaidThisTurn',turn:'own'},bp:500}]);
 assert.equal(mst.cards['MST-1-014'].effects.onPlay[0].maxOutside,1);
 assert.deepEqual(mst.cards['MST-1-021'].mainAbility,{
  op:'onceActiveIfAllNames',oncePerTurn:true,names:['ルーデウス','エリス']});
 assert.deepEqual(mst.cards['MST-1-035'].effects.onPlay.map(e=>e.name),
  ['ルーデウス','エリス','ルイジェルド']);
 assert.equal(mst.cards['MST-1-036'].playRequiresOwnName,'ロキシー');
 assert.deepEqual(mst.cards['MST-1-036'].outsideEventPairEnergyDiscount,{per:2,amount:1});
 assert.deepEqual(mst.cards['MST-1-036'].triggerEffect,{op:'retireOppFront'});
 assert.equal(mst.cards['MST-1-058'].impactNull,true);
 assert.deepEqual(mst.cards['MST-1-058'].mainAbility,{
  op:'onceBuffUntilNextIfEnergyAllTrait',oncePerTurn:true,
  minEnergy:7,trait:'ラノア魔法大学',bp:500});
 assert.equal(MST_V2_OFFICIAL_BY_ID['MST-1-005'].effectJa.includes('BP+500'),true);
 assert.equal(MST_V2_OFFICIAL_BY_ID['MST-1-036'].source.includes('MST-1-036'),true);
});

test('MST-1-005 loses impact in battle and gains BP only after an own-effect character entry',()=>{
 const {packs,s:opened}=match();
 const eris=place(opened,1,'MST-1-005','front',0);
 const attacker=place(opened,0,'MST-1-009','front',0);
 let s=advance(packs,opened,x=>x.phase==='attack'&&x.active===0);
 const life=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:eris.uid});
 assert.equal(s.players[1].life.length,life);
 assert.ok(s.players[1].outside.some(c=>c.uid===eris.uid));
 assert.equal(assertUniversalMatch(packs,s),true);

 const paid=match();
 const self=place(paid.s,0,'MST-1-005','front',0);
 const vanilla=hold(paid.s,0,'MST-1-020');
 let quiet=toMain(paid.packs,paid.s);
 assert.equal(universalBp(paid.packs,quiet,self),2500);
 quiet=dispatchUniversalAction(paid.packs,quiet,{type:'play',uid:vanilla.uid,line:'front',slot:1});
 assert.equal(quiet.zoneMoveEvents.some(e=>e.uid===vanilla.uid&&e.reason==='rule'),true);
 assert.equal(universalBp(paid.packs,quiet,self),2500);

 const cast=match(1);
 place(cast.s,0,'MST-1-005','front',1);
 place(cast.s,0,'MST-1-010','energy',0);
 place(cast.s,0,'MST-1-019','energy',1);
 const ruijerd=hold(cast.s,0,'MST-1-021');
 const recruit=hold(cast.s,0,'MST-1-020');
 let live=toMain(cast.packs,cast.s,0);
 assert.equal(live.players[0].apCards.filter(c=>c.ready).length,2);
 const before=universalBp(cast.packs,live,live.players[0].front[1]);
 live=dispatchUniversalAction(cast.packs,live,{type:'play',uid:ruijerd.uid,line:'front',slot:0});
 assert.equal(live.pending?.kind,'effect-hand-rest-or-raid');
 assert.ok(legalUniversalActions(cast.packs,live).some(a=>a.uid===null));
 live=dispatchUniversalAction(cast.packs,live,{type:'chooseHandRestOrRaid',mode:'enter',
  uid:recruit.uid,line:'energy',slot:2});
 assert.equal(live.players[0].energy[2].uid,recruit.uid);
 assert.equal(live.players[0].energy[2].ready,false);
 assert.equal(live.zoneMoveEvents.some(e=>e.uid===recruit.uid&&e.reason==='own-effect'&&
  e.to==='energy'),true);
 assert.equal(universalBp(cast.packs,live,live.players[0].front[1]),before+500);
 assert.equal(count(live.players[0]),50);
 assert.equal(assertUniversalMatch(cast.packs,live),true);
});

test('MST-1-014 discounts an empty field, pairs a line with Rudeus after an event, and puts at most one of the top two outside',()=>{
 const {packs,s:opened}=match();
 const sylph=place(opened,0,'MST-1-014','front',0);
 const rude=place(opened,0,'MST-1-022','energy',0);
 place(opened,0,'MST-1-010','energy',1);
 place(opened,0,'MST-1-019','energy',2);
 const event=hold(opened,0,'MST-1-034');
 let s=toMain(packs,opened);
 assert.equal(universalBp(packs,s,sylph),1500);
 s=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===event.uid&&e.reason==='rule'&&e.to==='outside'),true);
 assert.equal(universalBp(packs,s,sylph),3000);
 const other=structuredClone(s);
 other.players[0].energy[0]=null;
 other.players[0].energy[2]=rude;
 assert.equal(universalBp(packs,other,sylph),1500);
 if(s.pending){
  const recover=legalUniversalActions(packs,s).find(a=>a.type==='chooseApRecovery')||
   legalUniversalActions(packs,s).find(a=>a.mode==='skip'||a.uid===null);
  assert.ok(recover);
  s=dispatchUniversalAction(packs,s,recover);
 }
 assert.equal(assertUniversalMatch(packs,s),true);

 const fresh=match();
 assert.equal(zoneRequiredEnergy(mst,fresh.s,0,mst.cards['MST-1-014'],'hand'),0);
 assert.equal(zoneRequiredEnergy(mst,fresh.s,0,mst.cards['MST-1-014'],'life'),2);
 const played=hold(fresh.s,0,'MST-1-014');
 let look=toMain(fresh.packs,fresh.s);
 top(look,0,['MST-1-002','MST-1-003']);
 look=dispatchUniversalAction(fresh.packs,look,{type:'play',uid:played.uid,line:'front',slot:0});
 assert.equal(look.pending?.kind,'effect-top-inspect-many');
 assert.equal(look.pending.maxOutside,1);
 const window=[...look.pending.uids];
 assert.equal(window.length,2);
 look=dispatchUniversalAction(fresh.packs,look,{type:'chooseInspectedOutside',uid:window[0]});
 assert.equal(look.pending?.kind,'effect-top-order');
 assert.ok(look.players[0].outside.some(c=>c.uid===window[0]));
 assert.equal(look.players[0].outside.some(c=>c.uid===window[1]),false);
 look=dispatchUniversalAction(fresh.packs,look,{type:'chooseTopOrder',uid:window[1]});
 assert.equal(look.players[0].deck[0].uid,window[1]);
 assert.equal(assertUniversalMatch(fresh.packs,look),true);

 const decline=match();
 const again=hold(decline.s,0,'MST-1-014');
 let skip=toMain(decline.packs,decline.s);
 top(skip,0,['MST-1-003','MST-1-002']);
 const outsideBefore=skip.players[0].outside.length;
 skip=dispatchUniversalAction(decline.packs,skip,{type:'play',uid:again.uid,line:'energy',slot:0});
 const both=[...skip.pending.uids];
 skip=dispatchUniversalAction(decline.packs,skip,{type:'chooseInspectedOutside',uid:null});
 assert.equal(skip.players[0].outside.length,outsideBefore);
 skip=dispatchUniversalAction(decline.packs,skip,{type:'chooseTopOrder',uid:both[1]});
 skip=dispatchUniversalAction(decline.packs,skip,{type:'chooseTopOrder',uid:both[0]});
 assert.deepEqual(skip.players[0].deck.slice(0,2).map(c=>c.uid),[both[1],both[0]]);
 assert.equal(assertUniversalMatch(decline.packs,skip),true);
});

test('MST-1-021 may play nothing, then ACTIVES itself once while both names are on the field',()=>{
 const {packs,s:opened}=match(1);
 place(opened,0,'MST-1-010','energy',0);
 const actor=place(opened,0,'MST-1-021','front',0);
 const rude=place(opened,0,'MST-1-022','front',1);
 const eris=place(opened,0,'MST-1-006','energy',1);
 const recruit=hold(opened,0,'MST-1-020');
 let s=toMain(packs,opened,0);
 actor.ready=false;
 s=dispatchUniversalAction(packs,s,{type:'play',uid:hold(s,0,'MST-1-021').uid,line:'energy',slot:2});
 assert.equal(s.pending?.kind,'effect-hand-rest-or-raid');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===recruit.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseHandRestOrRaid',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===recruit.uid),true);
 const action={type:'activate',uid:actor.uid,mode:'namesActive'};
 assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 assert.match(uiActionLabel(action,{pack:mst,state:s}),/ACTIVE/);
 const missing=structuredClone(s);
 missing.players[0].energy[1]=null;
 missing.players[0].outside.push(eris);
 assert.equal(legalUniversalActions(packs,missing).some(a=>a.uid===actor.uid&&a.mode==='namesActive'),false);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===actor.uid&&a.mode==='namesActive'),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal|once per turn/);
 assert.equal(rude.cardId,'MST-1-022');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-035 offers each present name once and draws only the chosen ones',()=>{
 const {packs,s:opened}=match();
 place(opened,0,'MST-1-006','energy',0);
 place(opened,0,'MST-1-010','energy',1);
 place(opened,0,'MST-1-022','front',0);
 place(opened,0,'MST-1-021','front',1);
 const event=hold(opened,0,'MST-1-035');
 let s=toMain(packs,opened);
 const deckSize=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(s.pending?.kind,'effect-name-draw');
 assert.equal(s.pending.name,'ルーデウス');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'easy'}).mode,'skip');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'draw');
 assert.match(uiActionLabel({type:'chooseNameDraw',mode:'draw',name:'ルーデウス'},
  {pack:mst,state:s}),/抽 1 張/);
 s=dispatchUniversalAction(packs,s,{type:'chooseNameDraw',mode:'draw',name:'ルーデウス'});
 assert.equal(s.pending.name,'エリス');
 s=dispatchUniversalAction(packs,s,{type:'chooseNameDraw',mode:'skip',name:'エリス'});
 assert.equal(s.pending.name,'ルイジェルド');
 s=dispatchUniversalAction(packs,s,{type:'chooseNameDraw',mode:'draw',name:'ルイジェルド'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deckSize-2);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 const partial=match();
 place(partial.s,0,'MST-1-010','energy',0);
 place(partial.s,0,'MST-1-019','energy',1);
 place(partial.s,0,'MST-1-022','front',0);
 const one=hold(partial.s,0,'MST-1-035');
 let names=toMain(partial.packs,partial.s);
 names=dispatchUniversalAction(partial.packs,names,{type:'event',uid:one.uid});
 assert.equal(names.pending.name,'ルーデウス');
 names=dispatchUniversalAction(partial.packs,names,{type:'chooseNameDraw',mode:'skip',name:'ルーデウス'});
 assert.equal(names.pending,null);

 const none=match();
 place(none.s,0,'MST-1-010','energy',0);
 place(none.s,0,'MST-1-019','energy',1);
 const bare=hold(none.s,0,'MST-1-035');
 let empty=toMain(none.packs,none.s);
 const untouched=empty.players[0].deck.length;
 empty=dispatchUniversalAction(none.packs,empty,{type:'event',uid:bare.uid});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,untouched);
 assert.ok(empty.players[0].outside.some(c=>c.uid===bare.uid));
 assert.equal(assertUniversalMatch(none.packs,empty),true);
});

test('MST-1-036 needs Roxy, cuts one blue per two outside events in every zone, and retires only BP 5000 or less',()=>{
 const {packs,s}=match();
 const card=mst.cards['MST-1-036'];
 const moveEvents=n=>{
  const sample=structuredClone(s);
  const events=['MST-1-034','MST-1-080','MST-1-036','MST-1-035'];
  while(sample.players[0].outside.filter(c=>mst.cards[c.cardId].type==='event').length<n){
   const id=events.find(x=>sample.players[0].deck.some(c=>c.cardId===x)||
    sample.players[0].hand.some(c=>c.cardId===x));
   sample.players[0].outside.push(take(sample,0,id));
  }
  return sample;
 };
 assert.equal(zoneRequiredEnergy(mst,s,0,card,'hand'),5);
 assert.equal(zoneRequiredEnergy(mst,s,0,card,'life'),5);
 assert.equal(zoneRequiredEnergy(mst,moveEvents(1),0,card,'energy'),5);
 assert.equal(zoneRequiredEnergy(mst,moveEvents(2),0,card,'hand'),4);
 assert.equal(zoneRequiredEnergy(mst,moveEvents(2),0,card,'life'),4);
 assert.equal(zoneRequiredEnergy(mst,moveEvents(4),0,card,'front'),3);
 assert.equal(zoneRequiredEnergy(mst,moveEvents(10),0,card,'outside'),0);

 place(s,0,'MST-1-031','front',0);
 place(s,0,'MST-1-006','energy',0);
 place(s,0,'MST-1-010','energy',1);
 const event=hold(s,0,'MST-1-036');
 s.players[0].outside.push(take(s,0,'MST-1-034'),take(s,0,'MST-1-034'));
 place(s,1,'MST-1-049','front',0);
 place(s,1,'MST-1-009','front',1);
 let live=toMain(packs,s);
 const low=live.players[1].front[0];
 const high=live.players[1].front[1];
 high.buffs=[{bp:2500,untilTurn:live.turn}];
 assert.ok(universalBp(packs,live,high)>5000);
 const play={type:'event',uid:event.uid};
 assert.ok(legalUniversalActions(packs,live).some(a=>a.type==='event'&&a.uid===event.uid));
 const blocked=structuredClone(live);
 const roxy=blocked.players[0].front[0];
 blocked.players[0].front[0]=null;
 blocked.players[0].outside.push(roxy);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===event.uid),false);
 live=dispatchUniversalAction(packs,live,play);
 assert.equal(live.pending?.kind,'effect-retire-bp');
 assert.deepEqual(live.pending.choices,[low.uid]);
 live=dispatchUniversalAction(packs,live,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(live.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(live.players[1].front[1].uid,high.uid);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('MST-1-058 buffs until the next own turn only when energy is 7 and every character is Ranoa',()=>{
 const {packs,s:opened}=match();
 const self=place(opened,0,'MST-1-058','front',0);
 place(opened,0,'MST-1-060','energy',0);
 place(opened,0,'MST-1-062','energy',1);
 place(opened,0,'MST-1-066','energy',2);
 place(opened,0,'MST-1-064','energy',3);
 let s=toMain(packs,opened);
 const action={type:'activate',uid:self.uid,mode:'traitBuff'};
 assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 assert.match(uiActionLabel(action,{pack:mst,state:s}),/BP＋500/);
 const short=structuredClone(s);
 for(const slot of [2,3]){
  const gone=short.players[0].energy[slot];
  short.players[0].energy[slot]=null;
  short.players[0].outside.push(gone);
 }
 assert.equal(legalUniversalActions(packs,short).some(a=>a.mode==='traitBuff'),false);
 const mixed=structuredClone(s);
 const plain=take(mixed,0,'MST-1-050');
 plain.ready=true;
 mixed.players[0].front[1]=plain;
 assert.equal(legalUniversalActions(packs,mixed).some(a=>a.mode==='traitBuff'),false);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4500);
 assert.equal(s.players[0].front[0].buffs[0].untilOwnTurnStart,s.players[0].ownTurns+1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===self.uid&&a.mode==='traitBuff'),false);
 const stamped=s.players[0].ownTurns;
 s=advance(packs,s,x=>x.active===1&&!x.pending);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4500);
 s=advance(packs,s,x=>x.active===0&&x.players[0].ownTurns>stamped);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});
