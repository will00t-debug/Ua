import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,effectiveHandRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const ADDED=['SAO-1-036','SAO-1-059','SAO-1-101','SAO-1-108','SAO-2-009','SAO-2-014',
 'SAO-2-025','SAO-2-033','SAO-2-038','SAO-2-039','SAO-2-070','SAO-2-071'];

function deckOf(required){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function spot(s,uid){
 for(const pl of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents']){
   const c=(pl[zone]||[]).find(x=>x?.uid===uid);
   if(c)return c;
  }
  for(const line of ['front','energy']){
   const c=pl[line].find(x=>x?.uid===uid);
   if(c)return c;
  }
 }
 throw Error('lost '+uid);
}
function census(player){
 const ids=[];
 const walk=c=>{
  if(!c)return;
  ids.push(c.uid);
  for(const x of [...(c.stack||[]),...(c.under||[])])walk(x);
 };
 for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
  for(const c of player[zone]||[])walk(c);
 for(const line of ['front','energy'])for(const c of player[line])walk(c);
 return ids.sort();
}
function act(s,pred){
 const legal=legalUniversalActions(packs,s);
 const found=legal.find(pred);
 assert.ok(found,'no legal action; pending '+(s.pending?.kind||'none'));
 return dispatchUniversalAction(packs,s,found);
}
function until(s,player,phase){
 for(let n=0;n<24&&!(s.active===player&&s.phase===phase&&!s.pending);n++){
  assert.equal(s.pending,null);
  s=act(s,a=>a.type==='next');
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 assert.equal(s.pending,null);
 return s;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function fresh(required,seed,first=0){
 const counts=deckOf(required);
 return newUniversalMatch(packs,{decks:[counts,counts],first,seed});
}
function shiftLine(s,moverUid,destLine){
 s=act(s,a=>a.type==='chooseLineMove'&&a.uid===moverUid);
 const slot=s.players[s.pending.player][destLine].findIndex(c=>!c);
 assert.ok(slot>=0);
 return act(s,a=>a.type==='chooseLineSlot'&&a.slot===slot&&!a.replaceUid);
}

test('eight shared batches register twelve whole SAO prints',()=>{
 assert.equal(EXPECTED_V2_TOTAL,674);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],177);
 for(const id of ADDED){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  const card=sao.cards[id];
  assert.ok(source.source.includes('unionarena-tcg.com'),id);
  assert.equal(card.name,source.nameJa);
  assert.equal(card.energy,source.energy);
  assert.equal(card.bp,source.bp);
  assert.equal(card.color,source.color);
  assert.equal(card.implementation,'dsl');
 }
 assert.equal(sao.cards['SAO-1-059'].triggerEffect.op,'bounceOppFrontUnderBp');
 assert.equal(sao.cards['SAO-1-059'].triggerEffect.bp,3500);
});

test('SAO-1-108 enters active and can REST-buff again after it is readied',()=>{
 let s=fresh(['SAO-1-108','SAO-1-055','SAO-1-036'],8108);
 const before=census(s.players[0]).concat(census(s.players[1]));
 const ally=place(s,0,'SAO-1-055','front',0);
 place(s,0,'SAO-1-055','energy',0);
 place(s,0,'SAO-1-055','energy',1);
 const foe=place(s,1,'SAO-1-036','front',0);
 s=until(s,0,'main');
 const field=hold(s,0,'SAO-1-108');
 s=act(s,a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 assert.equal(spot(s,field.uid).ready,true);
 assert.equal(universalBp(packs,s,spot(s,ally.uid)),1500);
 s=act(s,a=>a.type==='activate'&&a.uid===field.uid&&a.mode==='selfRestBuff');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(foe.uid),false);
 assert.equal(s.pending.choices.includes(field.uid),false);
 aiOk(s);
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(spot(s,field.uid).ready,false);
 assert.equal(universalBp(packs,s,spot(s,ally.uid)),2500);
 spot(s,field.uid).ready=true;
 s=act(s,a=>a.type==='activate'&&a.uid===field.uid&&a.mode==='selfRestBuff');
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,spot(s,ally.uid)),3500);
 assert.equal(s.status,'playing');
 assert.deepEqual(census(s.players[0]).concat(census(s.players[1])),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-2-070 pays one hand card once per turn and blocks BP 4000 or higher',()=>{
 let s=fresh(['SAO-2-070','SAO-1-092','SAO-1-085','SAO-1-036'],8070);
 for(let i=0;i<2;i++)place(s,0,'SAO-1-092','energy',i);
 const leafa=place(s,0,'SAO-2-070','front',0);
 const pay=hold(s,0,'SAO-1-036');
 const high=place(s,1,'SAO-1-085','front',0,true);
 const low=place(s,1,'SAO-1-036','front',1,true);
 s=until(s,0,'main');
 s=act(s,a=>a.type==='activate'&&a.uid===leafa.uid&&a.mode==='oncePay');
 assert.equal(s.pending.kind,'effect-discard-gate');
 aiOk(s);
 s=act(s,a=>a.type==='chooseDiscardGate'&&a.uid===pay.uid);
 assert.equal(spot(s,leafa.uid).blockAtLeastGranted.bp,4000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='oncePay'&&a.uid===leafa.uid),false);
 s=act(s,a=>a.type==='next');
 s=act(s,a=>a.type==='attack'&&a.uid===leafa.uid);
 assert.equal(s.pending.kind,'block');
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.deepEqual(blocks.map(a=>a.uid).sort(),[low.uid]);
 assert.equal(blocks.some(a=>a.uid===high.uid),false);
 aiOk(s);
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.status,'playing');
});

test('歌 use is a hand play, and SAO-2-033/038/039 follow that ledger',()=>{
 let s=fresh(['SAO-2-060','SAO-2-047','SAO-2-033','SAO-2-038','SAO-2-039','SAO-2-070','SAO-1-092'],8033,1);
 for(let i=0;i<4;i++)place(s,0,'SAO-2-047','energy',i);
 const asuna=place(s,0,'SAO-2-033','front',0);
 const liz=place(s,0,'SAO-2-039','front',1);
 s=until(s,0,'main');
 assert.equal(universalImpact(packs,s,spot(s,asuna.uid)),0);
 assert.equal(universalBp(packs,s,spot(s,liz.uid)),2000);
 for(const c of [...s.players[0].hand]){
  if(['SAO-2-033','SAO-2-038','SAO-2-039'].includes(c.cardId)){
   s.players[0].hand.splice(s.players[0].hand.indexOf(c),1);
   s.players[0].deck.push(c);
  }
 }
 const song=hold(s,0,'SAO-2-060');
 assert.equal(s.players[0].hand.some(c=>['SAO-2-033','SAO-2-038','SAO-2-039'].includes(c.cardId)),false);
 s=act(s,a=>a.type==='event'&&a.uid===song.uid);
 assert.equal(s.pending,null);
 assert.equal(universalImpact(packs,s,spot(s,asuna.uid)),1);
 assert.equal(universalBp(packs,s,spot(s,liz.uid)),3000);
 const silica=hold(s,0,'SAO-2-038');
 const deckBefore=s.players[0].deck.length;
 s=act(s,a=>a.type==='play'&&a.uid===silica.uid&&a.line==='front');
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.pending,null);

 let quiet=fresh(['SAO-2-060','SAO-2-047','SAO-2-038','SAO-2-033'],8038);
 for(let i=0;i<4;i++)place(quiet,0,'SAO-2-047','energy',i);
 quiet=until(quiet,0,'main');
 const early=hold(quiet,0,'SAO-2-038');
 const quietDeck=quiet.players[0].deck.length;
 quiet=act(quiet,a=>a.type==='play'&&a.uid===early.uid&&a.line==='front');
 assert.equal(quiet.players[0].deck.length,quietDeck);
 assert.equal(quiet.pending,null);

 let paid=fresh(['SAO-2-039','SAO-2-060','SAO-2-070','SAO-1-092'],8039);
 for(let i=0;i<2;i++)place(paid,0,'SAO-1-092','energy',i);
 const stay=place(paid,0,'SAO-2-039','front',0);
 paid=until(paid,0,'main');
 const discarded=hold(paid,0,'SAO-2-060');
 const payer=place(paid,0,'SAO-2-070','front',1);
 paid=act(paid,a=>a.type==='activate'&&a.uid===payer.uid&&a.mode==='oncePay');
 paid=act(paid,a=>a.type==='chooseDiscardGate'&&a.uid===discarded.uid);
 assert.equal(universalBp(packs,paid,spot(paid,stay.uid)),2000);
 assert.equal(universalImpact(packs,s,asuna),1);
});

test('line shifts outside the move phase are once per turn',()=>{
 let s=fresh(['SAO-1-036','SAO-1-103','SAO-1-055','SAO-1-101','SAO-2-014'],8036,1);
 for(let i=0;i<3;i++)place(s,0,'SAO-1-055','energy',i);
 const asuna=place(s,0,'SAO-1-036','energy',3);
 s=until(s,0,'move');
 s=act(s,a=>a.type==='move'&&a.uid===asuna.uid);
 assert.equal(universalBp(packs,s,spot(s,asuna.uid)),3000);
 assert.equal(spot(s,asuna.uid).lineShiftUsedTurn,undefined);
 s=until(s,0,'main');
 const mover=hold(s,0,'SAO-1-103');
 s=act(s,a=>a.type==='play'&&a.uid===mover.uid&&a.line==='front'&&a.slot===1);
 s=shiftLine(s,asuna.uid,'energy');
 assert.equal(universalBp(packs,s,spot(s,asuna.uid)),4000);
 assert.equal(spot(s,asuna.uid).lineShiftUsedTurn,s.turn);
 const again=hold(s,0,'SAO-1-103');
 s=act(s,a=>a.type==='play'&&a.uid===again.uid&&a.line==='front'&&a.slot===2);
 s=shiftLine(s,asuna.uid,'front');
 assert.equal(universalBp(packs,s,spot(s,asuna.uid)),4000);

 let impact=fresh(['SAO-1-101','SAO-1-103','SAO-1-055'],8101,1);
 for(let i=0;i<3;i++)place(impact,0,'SAO-1-055','energy',i);
 const tall=place(impact,0,'SAO-1-101','front',0);
 impact=until(impact,0,'main');
 const mover2=hold(impact,0,'SAO-1-103');
 impact=act(impact,a=>a.type==='play'&&a.uid===mover2.uid&&a.line==='front'&&a.slot===1);
 impact=shiftLine(impact,tall.uid,'energy');
 assert.equal(universalBp(packs,impact,spot(impact,tall.uid)),5000);
 assert.equal(universalImpact(packs,impact,spot(impact,tall.uid)),1);

 let draw=fresh(['SAO-2-014','SAO-1-103','SAO-1-055'],8014,1);
 for(let i=0;i<3;i++)place(draw,0,'SAO-1-055','energy',i);
 const attacker=place(draw,0,'SAO-2-014','energy',3);
 draw=until(draw,0,'move');
 draw=act(draw,a=>a.type==='move'&&a.uid===attacker.uid);
 assert.equal(spot(draw,attacker.uid).attackDrawGranted,undefined);
 draw=until(draw,0,'main');
 const mover3=hold(draw,0,'SAO-1-103');
 draw=act(draw,a=>a.type==='play'&&a.uid===mover3.uid&&a.line==='front'&&a.slot===1);
 draw=shiftLine(draw,attacker.uid,'energy');
 assert.ok(spot(draw,attacker.uid).attackDrawGranted);
 const back=hold(draw,0,'SAO-1-103');
 draw=act(draw,a=>a.type==='play'&&a.uid===back.uid&&a.line==='front'&&a.slot===2);
 draw=shiftLine(draw,attacker.uid,'front');
 assert.equal(spot(draw,attacker.uid).attackDrawGranted.turn,draw.turn);
 const deck=draw.players[0].deck.length;
 draw=act(draw,a=>a.type==='next');
 draw=act(draw,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(draw.players[0].deck.length,deck-1);
 if(draw.pending?.kind==='block'){
  aiOk(draw);
  draw=act(draw,a=>a.type==='chooseBlock'&&a.uid===null);
 }
 assert.equal(draw.status,'playing');

 let silenced=fresh(['SAO-1-036','SAO-1-103','SAO-1-055'],8037);
 for(let i=0;i<3;i++)place(silenced,0,'SAO-1-055','energy',i);
 const quiet=place(silenced,0,'SAO-1-036','front',0);
 const source=place(silenced,0,'SAO-1-055','front',1);
 silenced=until(silenced,0,'main');
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:source.uid,targetUid:quiet.uid,until:{player:1,phase:'attack',edge:'end'}});
 const mover4=hold(silenced,0,'SAO-1-103');
 silenced=act(silenced,a=>a.type==='play'&&a.uid===mover4.uid&&a.line==='front'&&a.slot===2);
 silenced=shiftLine(silenced,quiet.uid,'energy');
 assert.equal(universalBp(packs,silenced,spot(silenced,quiet.uid)),3000);
 assert.equal(spot(silenced,quiet.uid).lineShiftUsedTurn,undefined);
});

test('SAO-1-059 may give one own character a BP 3000 block floor',()=>{
 let s=fresh(['SAO-1-059','SAO-1-055','SAO-1-036','SAO-1-101'],8059);
 for(let i=0;i<2;i++)place(s,0,'SAO-1-055','energy',i);
 const ally=place(s,0,'SAO-1-036','front',1);
 const small=place(s,1,'SAO-1-036','front',0,true);
 const big=place(s,1,'SAO-1-101','front',1,true);
 s=until(s,0,'main');
 const leafa=hold(s,0,'SAO-1-059');
 s=act(s,a=>a.type==='play'&&a.uid===leafa.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending.kind,'effect-block-floor');
 assert.equal(s.pending.choices.includes(leafa.uid),true);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(small.uid),false);
 aiOk(s);
 s=act(s,a=>a.type==='chooseBlockFloor'&&a.uid===ally.uid);
 assert.equal(spot(s,ally.uid).blockFloorGranted.bp,3000);
 assert.equal(spot(s,leafa.uid).blockFloorGranted,undefined);
 s=act(s,a=>a.type==='next');
 s=act(s,a=>a.type==='attack'&&a.uid===ally.uid);
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.deepEqual(blocks.map(a=>a.uid),[big.uid]);
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===null);

 let skip=fresh(['SAO-1-059','SAO-1-055'],8060);
 for(let i=0;i<2;i++)place(skip,0,'SAO-1-055','energy',i);
 skip=until(skip,0,'main');
 const other=hold(skip,0,'SAO-1-059');
 skip=act(skip,a=>a.type==='play'&&a.uid===other.uid&&a.line==='front');
 skip=act(skip,a=>a.type==='chooseBlockFloor'&&a.uid===null);
 assert.equal(spot(skip,other.uid).blockFloorGranted,undefined);
 assert.equal(skip.pending,null);
});

test('SAO-2-009 may replace draw-and-discard with a draw at 4 life or less',()=>{
 let high=fresh(['SAO-2-009','SAO-1-001'],8009);
 place(high,0,'SAO-1-001','energy',0);
 place(high,0,'SAO-1-001','energy',1);
 high=until(high,0,'main');
 while(high.players[0].life.length>5)high.players[0].deck.push(high.players[0].life.pop());
 const five=hold(high,0,'SAO-2-009');
 const before=high.players[0].deck.length;
 high=act(high,a=>a.type==='play'&&a.uid===five.uid&&a.line==='front');
 assert.equal(high.pending.kind,'effect-discard');
 assert.equal(high.players[0].deck.length,before-1);
 aiOk(high);
 high=act(high,a=>a.type==='chooseDiscard');

 let low=fresh(['SAO-2-009','SAO-1-001'],8010);
 place(low,0,'SAO-1-001','energy',0);
 place(low,0,'SAO-1-001','energy',1);
 low=until(low,0,'main');
 while(low.players[0].life.length>4)low.players[0].deck.push(low.players[0].life.pop());
 const four=hold(low,0,'SAO-2-009');
 const lowDeck=low.players[0].deck.length;
 low=act(low,a=>a.type==='play'&&a.uid===four.uid&&a.line==='front');
 assert.equal(low.pending.kind,'effect-draw-instead');
 aiOk(low);
 const modes=legalUniversalActions(packs,low).map(a=>a.mode).sort();
 assert.deepEqual(modes,['discard','draw']);
 low=act(low,a=>a.type==='chooseDrawInstead'&&a.mode==='draw');
 assert.equal(low.pending,null);
 assert.equal(low.players[0].deck.length,lowDeck-1);
});

test('SAO-2-025 draws two, plus a draw and discard when Lizbeth is on the field',()=>{
 let plain=fresh(['SAO-2-025','SAO-1-055','SAO-1-083'],8025);
 for(let i=0;i<3;i++)place(plain,0,'SAO-1-055','energy',i);
 plain=until(plain,0,'main');
 const event=hold(plain,0,'SAO-2-025');
 const before=plain.players[0].deck.length;
 plain=act(plain,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(plain.players[0].deck.length,before-2);
 assert.equal(plain.pending,null);

 let named=fresh(['SAO-2-025','SAO-1-055','SAO-1-083'],8026);
 for(let i=0;i<3;i++)place(named,0,'SAO-1-055','energy',i);
 const liz=place(named,0,'SAO-1-083','front',0);
 named=until(named,0,'main');
 const event2=hold(named,0,'SAO-2-025');
 const namedDeck=named.players[0].deck.length;
 named=act(named,a=>a.type==='event'&&a.uid===event2.uid);
 assert.equal(named.players[0].deck.length,namedDeck-3);
 assert.equal(named.pending.kind,'effect-discard');
 assert.equal(liz.cardId,'SAO-1-083');
 aiOk(named);
 named=act(named,a=>a.type==='chooseDiscard');
 assert.equal(named.pending,null);
});

test('SAO-2-071 reduces printed green GGO energy of 6 or more while on the front',()=>{
 let s=fresh(['SAO-2-071','SAO-1-092','SAO-1-087','SAO-1-085','SAO-1-001'],8071,1);
 for(let i=0;i<3;i++)place(s,0,'SAO-1-092','energy',i);
 s=until(s,0,'main');
 const heavy=s.players[0].hand.find(c=>c.cardId==='SAO-1-087')||hold(s,0,'SAO-1-087');
 const light=s.players[0].hand.find(c=>c.cardId==='SAO-1-085')||hold(s,0,'SAO-1-085');
 const other=s.players[0].hand.find(c=>c.cardId==='SAO-1-001')||hold(s,0,'SAO-1-001');
 const energyOf=id=>effectiveHandRequiredEnergy(packs,s,0,sao.cards[id],
  id==='SAO-1-087'?heavy:id==='SAO-1-085'?light:other);
 assert.equal(energyOf('SAO-1-087'),7);
 assert.equal(energyOf('SAO-1-085'),4);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===heavy.uid),false);
 const first=hold(s,0,'SAO-2-071');
 s=act(s,a=>a.type==='play'&&a.uid===first.uid&&a.line==='front'&&a.slot===0);
 assert.equal(energyOf('SAO-1-087'),6);
 assert.equal(energyOf('SAO-1-085'),4);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===heavy.uid),true);
 const second=hold(s,0,'SAO-2-071');
 s=act(s,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front'&&a.slot===1);
 assert.equal(energyOf('SAO-1-087'),5);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:second.uid,targetUid:first.uid,until:{player:1,phase:'attack',edge:'end'}});
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:first.uid,targetUid:second.uid,until:{player:1,phase:'attack',edge:'end'}});
 assert.equal(energyOf('SAO-1-087'),7);
 const parked=fresh(['SAO-2-071','SAO-1-087','SAO-1-092'],8072);
 const bench=place(parked,0,'SAO-2-071','energy',0);
 parked.players[0].hand.push(take(parked,0,'SAO-1-087'));
 assert.equal(effectiveHandRequiredEnergy(packs,parked,0,sao.cards['SAO-1-087'],
  parked.players[0].hand.at(-1)),7);
 assert.equal(bench.cardId,'SAO-2-071');
});
