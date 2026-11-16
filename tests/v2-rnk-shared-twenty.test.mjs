import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_SHARED_TWENTY} from '../dist/rnk/jp-evidence-shared-twenty.mjs';
import {RNK_PROGRAMS_SHARED_TWENTY} from '../dist/universal-v2/rnk/programs-shared-twenty.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalCardEnergy,universalPrivateChoices,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const IDS=['RNK-1-005','RNK-1-007','RNK-1-017','RNK-1-026','RNK-1-028','RNK-1-034','RNK-1-042','RNK-1-045','RNK-1-052','RNK-1-058','RNK-1-060','RNK-1-062','RNK-1-066','RNK-1-067','RNK-1-072','RNK-1-075','RNK-1-082','RNK-1-084','RNK-1-094','RNK-1-100'];
const source=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const packs=[pack,pack];
function deck(){
 const counts={
  'RNK-1-091':4,'RNK-1-035':4,'RNK-1-006':4,'RNK-1-002':2,'RNK-1-015':2,
  'RNK-1-014':2,'RNK-1-053':2,'RNK-1-055':2,'RNK-1-074':2,'RNK-1-112':2,'RNK-1-073':1,
  'RNK-1-045':1,'RNK-1-017':2
 };
 for(const id of IDS)counts[id]=(counts[id]||0)+1;
 assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toMain(s){
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function fresh(seed=16){
 const s=toMain(newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false}));
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 return s;
}
const GEN={blue:'RNK-1-006',purple:'RNK-1-035',red:'RNK-1-091'};
function fuel(s,color='red',slots=4){for(let i=0;i<slots;i++)seat(s,0,GEN[color],'energy',i);return s;}
function play(s,id,line,slot){
 const c=take(s,0,id);s.players[0].hand.push(c);
 const type=pack.cards[id].type==='event'?'event':'play';
 return dispatchUniversalAction(packs,s,type==='event'?{type,uid:c.uid}:{type,uid:c.uid,line,slot});
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function act(s,pred){
 const a=legalUniversalActions(packs,s).find(pred);
 assert.ok(a,JSON.stringify(legalUniversalActions(packs,s)[0]));
 return dispatchUniversalAction(packs,s,a);
}
const topWindow=s=>universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid);

test('twenty official Japanese prints stage on the shared pack and stay out of battle',()=>{
 assert.equal(RNK_BATCH_STAGING_IDS.length,114);
 assert.equal(IDS.length,20);
 for(const id of IDS){
  const jp=RNK_JP_EVIDENCE_SHARED_TWENTY[id],tc=source[id],v2=pack.cards[id];
  assert.equal(jp.print,tc.number);
  assert.equal(v2.name,jp.nameJa);
  assert.equal(v2.energy,tc.energy);
  assert.equal(tc.battleReady,false);
  assert.equal(RNK_IDENTITY_INVENTORY.find(c=>c.id===id).effectImplemented,false);
  assert.ok(jp.sourceJa.includes('/jp/cardlist/'));
  assert.equal(RNK_PROGRAMS_SHARED_TWENTY[id].ready,true);
 }
 assert.equal(source['RNK-1-062'].nameZhTw,'大型甲鐵艦煉獄');
 assert.equal(source['RNK-1-075'].nameZhTw,'相樂左之助');
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
});

test('named-card use is a successful event play, and 007 gains Impact only then',()=>{
 const printed=c=>c.cardId==='EV'?{type:'event',name:'九頭龍閃',nameAliases:[]}:{type:'character',name:'比古',nameAliases:[]};
 const base={turn:1,active:0,players:[{},{}]};
 const used={...base,zoneMoveEvents:[{turn:1,owner:0,controller:0,from:'hand',to:'outside',reason:'rule',uid:'0-1',cardId:'EV'}]};
 const cond={kind:'ownNamedCardsUsedThisTurn',turn:'own',names:['九頭龍閃','生きようとする意志']};
 assert.equal(matchesV2LiveCondition(used,0,'0-h',cond,printed),true);
 const paid={...base,zoneMoveEvents:[{turn:1,owner:0,controller:0,from:'hand',to:'outside',reason:'payment',uid:'0-1',cardId:'EV'}]};
 assert.equal(matchesV2LiveCondition(paid,0,'0-h',cond,printed),false);
 const filler=(id,name)=>({id,name,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null,implementation:'vanilla',maxCopies:12});
 const mini=createUniversalPack({id:'lab',cards:[
  {id:'EV',name:'九頭龍閃',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,trigger:'draw',implementation:'vanilla',maxCopies:4},
  {id:'HI',name:'比古 清十郎',color:'blue',type:'character',energy:0,ap:1,bp:4000,gen:1,trigger:null,implementation:'dsl',maxCopies:12,
   passiveBonuses:[{impact:1,condition:cond}]},
  filler('PA','pad'),filler('PB','pad two'),filler('PC','pad three')
 ]});
 const miniCounts={'EV':2,'HI':12,'PA':12,'PB':12,'PC':12};
 assert.deepEqual(validateUniversalDeck(mini,miniCounts),[]);
 let s=newUniversalMatch(mini,{decks:[miniCounts,miniCounts],seed:7,first:0,openingMulligan:false});
 const packs2=[mini,mini];
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs2,s,legalUniversalActions(packs2,s).find(a=>a.type==='next'));
 const seatHi=s.players[0].hand.find(c=>c.cardId==='HI')||s.players[0].deck.find(c=>c.cardId==='HI');
 const hiZone=s.players[0].hand.includes(seatHi)?'hand':'deck';
 s.players[0][hiZone].splice(s.players[0][hiZone].indexOf(seatHi),1);
 seatHi.ready=true;seatHi.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[3]=seatHi;
 assert.equal(universalImpact(mini,s,seatHi),0);
 const eventZone=['hand','deck','life'].find(z=>s.players[0][z].some(c=>c.cardId==='EV'));
 const event=s.players[0][eventZone].splice(s.players[0][eventZone].findIndex(c=>c.cardId==='EV'),1)[0];
 s.players[0].hand.push(event);
 s=dispatchUniversalAction(packs2,s,{type:'event',uid:event.uid});
 const live=s.players[0].energy.find(c=>c?.cardId==='HI');
 assert.equal(universalImpact(mini,s,live),1);
});

test('075 draws exactly one card when the attack is not blocked, and none when it is',()=>{
 let open=fuel(fresh());
 const attacker=seat(open,0,'RNK-1-075','front',0,true);
 const before=open.players[0].hand.length,top=open.players[0].deck[0].uid;
 open=dispatchUniversalAction(packs,open,legalUniversalActions(packs,open).find(a=>a.type==='next'));
 open=dispatchUniversalAction(packs,open,{type:'attack',uid:attacker.uid});
 open=act(open,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(open.players[0].hand.some(c=>c.uid===top),true);
 assert.equal(open.players[0].hand.length,before+1);
 assert.equal(assertUniversalMatch(packs,open),true);

 let blocked=fuel(fresh(17));
 const fighter=seat(blocked,0,'RNK-1-075','front',0,true);
 const wall=seat(blocked,1,'RNK-1-007','front',0,true);
 const hand=blocked.players[0].hand.length,kept=blocked.players[0].deck[0].uid;
 blocked=dispatchUniversalAction(packs,blocked,legalUniversalActions(packs,blocked).find(a=>a.type==='next'));
 blocked=dispatchUniversalAction(packs,blocked,{type:'attack',uid:fighter.uid});
 blocked=act(blocked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(blocked.players[0].hand.some(c=>c.uid===kept),false);
 assert.equal(blocked.players[0].hand.length,hand);
});

test('052 counts other Shishio, Yumi or Ten Swords once each, and 060 cannot buff itself',()=>{
 let s=fresh();
 const self=seat(s,0,'RNK-1-052','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,self),pack.cards['RNK-1-052'].gen);
 seat(s,0,'RNK-1-034','front',0);
 seat(s,0,'RNK-1-058','front',1);
 assert.equal(universalCardEnergy(pack,s,0,self),pack.cards['RNK-1-052'].gen);
 seat(s,0,'RNK-1-060','front',2);
 assert.equal(universalCardEnergy(pack,s,0,self),pack.cards['RNK-1-052'].gen+1);

 let buff=fuel(fresh(18),'purple');
 const actor=seat(buff,0,'RNK-1-058','front',2);
 const yumi=seat(buff,0,'RNK-1-034','front',0);
 buff=play(buff,'RNK-1-060','front',1);
 assert.equal(buff.pending.kind,'effect-buff-own');
 assert.equal(buff.pending.choices.includes(actor.uid),true);
 assert.equal(buff.pending.choices.includes(yumi.uid),true);
 assert.equal(buff.pending.choices.includes(buff.players[0].front[1].uid),false);
 aiOk(buff);
 buff=act(buff,a=>a.type==='chooseOwnBuff'&&a.uid===yumi.uid);
 assert.equal(universalBp(pack,buff,buff.players[0].front.find(c=>c.uid===yumi.uid)),pack.cards['RNK-1-034'].bp+1000);
});

test('066 adds the three categories and 028 adds 1000 per Aoshi',()=>{
 let low=fuel(fresh(19),'blue');
 const small=seat(low,1,'RNK-1-005','front',0);
 const big=seat(low,1,'RNK-1-007','front',1);
 low=play(low,'RNK-1-028');
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,3000);
 assert.deepEqual(low.pending.choices,[small.uid]);
 assert.equal(low.pending.optional,false);
 seat(low,0,'RNK-1-017','front',0);seat(low,0,'RNK-1-017','front',1);
 let scaled=fuel(fresh(20),'blue');
 seat(scaled,0,'RNK-1-017','front',0);seat(scaled,0,'RNK-1-017','front',1);
 const wide=seat(scaled,1,'RNK-1-007','front',0);
 scaled=play(scaled,'RNK-1-028');
 assert.equal(scaled.pending.limit,5000);
 assert.equal(scaled.pending.choices.includes(wide.uid),true);

 let sum=fuel(fresh(21),'purple');
 const yumi=seat(sum,0,'RNK-1-034','front',0);
 const sword=seat(sum,0,'RNK-1-060','front',1);
 const victim=seat(sum,1,'RNK-1-045','front',0);
 const categories=(pack.cards[yumi.cardId].name==='駒形 由美'?1:0)+(pack.cards[yumi.cardId].traits||[]).includes('十本刀')
  +(pack.cards[sword.cardId].traits||[]).includes('十本刀');
 sum=play(sum,'RNK-1-066');
 assert.equal(sum.pending.limit,categories*1000);
 assert.equal(sum.pending.optional,false);
 assert.equal(sum.pending.choices.includes(victim.uid),universalBp(pack,sum,victim)<=sum.pending.limit);
 aiOk(sum);
});

test('026 discards only a 4-energy add, and 094 discards every add that is not Sanosuke',()=>{
 let hi=fuel(fresh(22),'blue',3);
 const hiko=take(hi,0,'RNK-1-007'),low=take(hi,0,'RNK-1-035'),rest=take(hi,0,'RNK-1-014');
 hi.players[0].deck.unshift(hiko,low,rest);
 hi=play(hi,'RNK-1-026','energy',3);
 assert.deepEqual(topWindow(hi),[hiko.uid,low.uid,rest.uid]);
 assert.deepEqual(hi.pending.choices,[hiko.uid]);
 hi=act(hi,a=>a.type==='chooseTopFiltered'&&a.uid===hiko.uid);
 while(hi.pending?.kind==='effect-top-order')hi=act(hi,a=>a.type==='chooseTopOrder');
 assert.equal(hi.pending.kind,'effect-discard');
 assert.equal(hi.players[0].hand.some(c=>c.uid===hiko.uid),true);

 let keep=fuel(fresh(23),'blue',3);
 const ken=take(keep,0,'RNK-1-045'),pad=take(keep,0,'RNK-1-035'),pad2=take(keep,0,'RNK-1-006');
 keep.players[0].deck.unshift(ken,pad,pad2);
 keep=play(keep,'RNK-1-026','energy',3);
 keep=act(keep,a=>a.type==='chooseTopFiltered'&&a.uid===ken.uid);
 while(keep.pending?.kind==='effect-top-order')keep=act(keep,a=>a.type==='chooseTopOrder');
 assert.equal(keep.pending,null);

 let other=fuel(fresh(24),'red',3);
 const character=take(other,0,'RNK-1-045'),a=take(other,0,'RNK-1-035'),b=take(other,0,'RNK-1-006');
 other.players[0].deck.unshift(character,a,b);
 other=play(other,'RNK-1-094','energy',3);
 assert.equal(other.pending.choices.includes(character.uid),true);
 other=act(other,a=>a.type==='chooseTopFiltered'&&a.uid===character.uid);
 while(other.pending?.kind==='effect-top-order')other=act(other,a=>a.type==='chooseTopOrder');
 assert.equal(other.pending.kind,'effect-discard');

 let sano=fuel(fresh(25),'red',3);
 const sanosuke=take(sano,0,'RNK-1-075'),c=take(sano,0,'RNK-1-035'),d=take(sano,0,'RNK-1-006');
 sano.players[0].deck.unshift(sanosuke,c,d);
 sano=play(sano,'RNK-1-094','energy',3);
 sano=act(sano,a=>a.type==='chooseTopFiltered'&&a.uid===sanosuke.uid);
 while(sano.pending?.kind==='effect-top-order')sano=act(sano,a=>a.type==='chooseTopOrder');
 assert.equal(sano.pending,null);
 assert.equal(sano.players[0].hand.some(c=>c.uid===sanosuke.uid),true);
});

test('045 shows both top cards and can put only a traitless purple card outside',()=>{
 let s=fuel(fresh(26),'purple');
 const played=take(s,0,'RNK-1-045'),purple=take(s,0,'RNK-1-045'),traited=take(s,0,'RNK-1-060');
 s.players[0].hand.push(played);
 s.players[0].deck.unshift(traited,purple);
 s=dispatchUniversalAction(packs,s,{type:'play',uid:played.uid,line:'front',slot:0});
 assert.deepEqual(topWindow(s),[traited.uid,purple.uid]);
 assert.deepEqual(s.pending.choices,[purple.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,a=>a.type==='chooseTopTraitOutside'&&a.uid===purple.uid);
 if(s.pending?.kind==='effect-top-order')s=act(s,a=>a.type==='chooseTopOrder');
 assert.equal(s.players[0].outside.some(c=>c.uid===purple.uid),true);
 assert.equal(s.players[0].deck[0].uid,traited.uid);
});

test('058 looks at one card and places it on top or outside, only from the front',()=>{
 let s=fuel(fresh(27));
 const look=seat(s,0,'RNK-1-058','front',0,true);
 const top=s.players[0].deck[0].uid;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===look.uid),true);
 s=act(s,a=>a.type==='activate'&&a.uid===look.uid);
 assert.equal(s.pending.kind,'private-top-or-outside');
 assert.equal(universalPrivateChoices(packs,s,0).options[0].card.cardId,s.players[0].deck[0].cardId);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,a=>a.mode==='outside');
 assert.equal(s.players[0].outside.at(-1).uid,top);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===look.uid),false);
 let energy=fuel(fresh(28),'red',3);
 const back=seat(energy,0,'RNK-1-058','energy',3,true);
 assert.equal(legalUniversalActions(packs,energy).some(a=>a.uid===back.uid&&a.type==='activate'),false);
});

test('062 grants an optional unblocked draw, and resting the field retires it for two cards',()=>{
 let s=fuel(fresh(29),'purple',3);
 const shishio=seat(s,0,'RNK-1-112','front',0,true);
 const other=seat(s,0,'RNK-1-006','front',1,true);
 s=play(s,'RNK-1-062','energy',3);
 assert.equal(s.pending.kind,'effect-grant-unblocked-draw');
 assert.deepEqual(s.pending.choices,[shishio.uid]);
 s=act(s,a=>a.uid===shishio.uid);
 const granted=s.players[0].front.find(c=>c.uid===shishio.uid);
 assert.equal(granted.unblockedDrawGranted.upTo,1);
 assert.equal(s.players[0].front.find(c=>c.uid===other.uid).unblockedDrawGranted,undefined);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:shishio.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.kind,'effect-may-draw');
 s=act(s,a=>a.type==='chooseMayDraw'&&a.mode==='skip');
 assert.equal(s.players[0].hand.length,hand);

 let field=fuel(fresh(30),'purple',3);
 const site=seat(field,0,'RNK-1-062','energy',3,true);
 const before=field.players[0].hand.length;
 field=act(field,a=>a.type==='activate'&&a.uid===site.uid&&a.mode==='fieldRestRetire');
 assert.equal(field.players[0].energy[3],null);
 assert.equal(field.players[0].outside.some(c=>c.uid===site.uid),true);
 assert.equal(field.players[0].hand.length,before+2);
 assert.equal(assertUniversalMatch(packs,field),true);
});

test('017 actives itself only after resting another front Oniwaban',()=>{
 let s=fuel(fresh(31),'blue');
 const other=seat(s,0,'RNK-1-017','front',0,true);
 s=play(s,'RNK-1-017','front',1);
 assert.equal(s.pending.kind,'effect-rest-other-trait');
 assert.deepEqual(s.pending.choices,[other.uid]);
 const declined=act(structuredClone(s),a=>a.uid===null);
 assert.equal(declined.players[0].front[0].ready,true);
 s=act(s,a=>a.uid===other.uid);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[1].ready,true);
});

test('042 retires an opponent field only after the AP is paid',()=>{
 let s=fuel(fresh(32),'purple');
 const site=seat(s,1,'RNK-1-026','energy',0,true);
 s=play(s,'RNK-1-042','front',0);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const skipped=act(structuredClone(s),a=>a.mode==='skip');
 assert.equal(skipped.players[1].energy[0].uid,site.uid);
 s=act(s,a=>a.mode==='pay');
 assert.equal(s.pending.kind,'effect-retire-opp-field');
 assert.deepEqual(s.pending.choices,[site.uid]);
 s=act(s,a=>a.uid===site.uid);
 assert.equal(s.players[1].energy[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===site.uid),true);
});

test('067 places one union card on top before readying an AP, and readies nothing the place did not start',()=>{
 let s=fuel(fresh(33),'purple');
 const yumi=take(s,0,'RNK-1-034');
 s.players[0].outside.push(yumi);
 s.players[0].apCards[0].ready=false;
 const deckTop=s.players[0].deck[0].uid;
 s=play(s,'RNK-1-067');
 assert.equal(s.pending.kind,'effect-outside-union-top');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=act(s,a=>a.uid===yumi.uid);
 assert.equal(s.players[0].deck[0].uid,yumi.uid);
 assert.equal(s.players[0].deck[1].uid,deckTop);
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=act(s,a=>a.uid===s.players[0].apCards[0].uid);
 assert.equal(s.players[0].apCards[0].ready,true);

 let empty=fuel(fresh(34),'purple');
 empty.players[0].outside.push(...empty.players[0].outside.splice(0).filter(()=>false));
 empty.players[0].apCards[0].ready=false;
 empty=play(empty,'RNK-1-067');
 assert.equal(empty.pending.kind,'effect-recover-ap');
});

test('072 suppresses only the chosen Kenshin own-turn text, including the Shinta alias',()=>{
 let s=fuel(fresh(35));
 const alias=seat(s,0,'RNK-1-002','front',0,true);
 const plain=seat(s,0,'RNK-1-015','front',1,true);
 const full=universalBp(pack,s,plain);
 s=play(s,'RNK-1-072','front',2);
 assert.deepEqual(s.pending.choices,[alias.uid]);
 s=act(s,a=>a.uid===alias.uid);
 const chosen=s.players[0].front.find(c=>c.uid===alias.uid);
 assert.equal(chosen.ownTurnTextSuppressed.turn,s.turn);
 const body=s.players[0].front.find(c=>c.uid===plain.uid);
 body.ownTurnTextSuppressed={turn:s.turn,stamp:body.fieldEntryStamp};
 assert.equal(universalBp(pack,s,body),full-(pack.cards['RNK-1-015'].ownTurnBp||0));
});

test('005 and 084 resolve only the chosen branch, and the follow-up needs the optional cost',()=>{
 let low=fuel(fresh(36),'blue');
 const small=seat(low,1,'RNK-1-045','front',0);
 low=play(low,'RNK-1-005','front',0);
 low=act(low,a=>a.mode==='low');
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,2000);
 low=act(low,a=>a.uid===small.uid);
 assert.equal(low.players[1].front[0],null);

 let oni=fuel(fresh(37),'blue');
 const ally=seat(oni,0,'RNK-1-017','front',0,true);
 const hand=oni.players[0].hand.length;
 oni=play(oni,'RNK-1-005','front',1);
 oni=act(oni,a=>a.mode==='oni');
 assert.equal(oni.pending.kind,'effect-optional-own-trait-retire');
 const declined=act(structuredClone(oni),a=>a.uid===null);
 assert.equal(declined.players[0].hand.length,hand-1);
 assert.equal(declined.players[0].front[0].uid,ally.uid);
 oni=act(oni,a=>a.uid===ally.uid);
 assert.equal(oni.players[0].hand.length,hand);
 assert.equal(oni.players[0].front[0],null);

 let wake=fuel(fresh(38),'red');
 const resting=seat(wake,0,'RNK-1-075','front',0,false);
 wake=play(wake,'RNK-1-084','front',1);
 wake=act(wake,a=>a.mode==='wake');
 assert.equal(wake.pending.choices.includes(resting.uid),true);
 wake=act(wake,a=>a.uid===resting.uid);
 assert.equal(wake.players[0].front[0].ready,true);

 let rest=fuel(fresh(39),'red');
 const standing=seat(rest,0,'RNK-1-075','front',0,true);
 const foe=seat(rest,1,'RNK-1-045','front',0,true);
 rest=play(rest,'RNK-1-084','front',1);
 rest=act(rest,a=>a.mode==='rest');
 const no=act(structuredClone(rest),a=>a.uid===null);
 assert.equal(no.players[0].front[0].ready,true);
 assert.equal(no.players[1].front[0].ready,true);
 rest=act(rest,a=>a.uid===standing.uid);
 assert.equal(rest.players[0].front[0].ready,false);
 rest=act(rest,a=>a.uid===foe.uid);
 assert.equal(rest.players[1].front[0].ready,false);
});

test('082 offers the outside recovery or the other-character buff, and 100 can send the target under the deck',()=>{
 let s=fuel(fresh(40));
 const cheap=take(s,0,'RNK-1-060');
 s.players[0].outside.push(cheap);
 const other=seat(s,0,'RNK-1-015','front',0);
 s=play(s,'RNK-1-082','front',1);
 s=act(s,a=>a.mode==='bp');
 assert.equal(s.pending.choices.includes(other.uid),true);
 assert.equal(s.pending.choices.includes(s.players[0].front[1].uid),false);
 s=act(s,a=>a.uid===other.uid);
 assert.equal(universalBp(pack,s,s.players[0].front[0]),pack.cards['RNK-1-015'].bp+1500+ (pack.cards['RNK-1-015'].ownTurnBp||0));

 let moved=fuel(fresh(41));
 const target=seat(moved,1,'RNK-1-045','front',0);
 moved=play(moved,'RNK-1-100');
 assert.equal(moved.pending.kind,'effect-move-opp-cap');
 assert.equal(moved.pending.choices.includes(target.uid),true);
 moved=act(moved,a=>a.uid===target.uid);
 assert.equal(moved.pending.bottom,false);
 moved=act(moved,a=>a.type==='chooseMoveOppDest'&&a.place!=='bottom');
 assert.equal(moved.players[1].energy.some(c=>c?.uid===target.uid),true);

 let buried=fuel(fresh(42));
 seat(buried,0,'RNK-1-002','front',0);
 const piece=seat(buried,1,'RNK-1-045','front',0);
 const bottom=buried.players[1].deck.at(-1).uid;
 buried=play(buried,'RNK-1-100');
 buried=act(buried,a=>a.uid===piece.uid);
 assert.equal(buried.pending.bottom,true);
 buried=act(buried,a=>a.place==='bottom');
 assert.equal(buried.players[1].deck.at(-1).uid,piece.uid);
 assert.notEqual(piece.uid,bottom);
 assert.equal(assertUniversalMatch(packs,buried),true);
});
