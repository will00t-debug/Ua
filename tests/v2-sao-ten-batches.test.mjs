import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const ADDED=['SAO-1-002','SAO-1-024','SAO-1-029','SAO-1-064','SAO-1-080','SAO-1-086',
 'SAO-1-096','SAO-1-099','SAO-2-012','SAO-2-062'];

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
function setHand(s,p,ids){
 const pl=s.players[p];
 pl.deck.push(...pl.hand.splice(0));
 return ids.map(id=>hold(s,p,id));
}
function topDeck(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function quietLife(s,p,n=2){
 const pl=s.players[p],quiet=[];
 for(let i=pl.deck.length-1;i>=0&&quiet.length<n;i--){
  if(!sao.cards[pl.deck[i].cardId].trigger)quiet.push(pl.deck.splice(i,1)[0]);
 }
 assert.equal(quiet.length,n);
 pl.life.unshift(...quiet);
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
function orderBottoms(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
 }
 return s;
}

test('ten shared batches register ten whole SAO prints',()=>{
 assert.equal(EXPECTED_V2_TOTAL,674);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],177);
 assert.equal(Object.keys(sao.cards).length,177);
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
 assert.equal(sao.cards['SAO-1-064'].trigger,'special');
 assert.equal(sao.cards['SAO-1-064'].triggerEffect.op,'retireOppFront');
 assert.deepEqual(sao.cards['SAO-1-002'].doubleAttackIfFrontNames,['アリス','ユージオ']);
 assert.equal(sao.cards['SAO-1-080'].impactNull,true);
});

test('SAO-1-096 discards one hand card once and adds two green energy',()=>{
 let s=fresh(['SAO-1-096','SAO-1-074'],8096);
 const before=census(s.players[0]).concat(census(s.players[1]));
 const field=place(s,0,'SAO-1-096','energy',0);
 s=until(s,0,'main');
 const pay=hold(s,0,'SAO-1-074');
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 s=act(s,a=>a.type==='activate'&&a.uid===field.uid&&a.mode==='discardEnergy');
 assert.equal(s.pending.kind,'main-discard-buff');
 aiOk(s);
 s=act(s,a=>a.type==='chooseMainDiscard'&&a.uid===pay.uid);
 assert.equal(universalEnergyByColor(packs,s,0).green,4);
 assert.equal(spot(s,pay.uid).cardId,'SAO-1-074');
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='discardEnergy'&&a.uid===field.uid),false);
 assert.equal(s.status,'playing');
 assert.deepEqual(census(s.players[0]).concat(census(s.players[1])),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-024 pays one hand card for sniper that cannot designate BP 2500',()=>{
 let s=fresh(['SAO-1-024','SAO-1-001','SAO-1-003'],8024);
 const sinon=place(s,0,'SAO-1-024','front',0);
 const low=place(s,1,'SAO-1-001','front',0);
 const high=place(s,1,'SAO-1-003','front',1);
 s=until(s,0,'main');
 const pay=hold(s,0,'SAO-1-001');
 s=act(s,a=>a.type==='activate'&&a.uid===sinon.uid&&a.mode==='oncePay');
 assert.equal(s.pending.kind,'effect-discard-gate');
 aiOk(s);
 s=act(s,a=>a.type==='chooseDiscardGate'&&a.uid===pay.uid);
 assert.equal(spot(s,sinon.uid).sniperGranted.maxBp,2500);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='oncePay'),false);
 s=act(s,a=>a.type==='next');
 assert.equal(s.phase,'attack');
 const snipes=legalUniversalActions(packs,s).filter(a=>a.type==='attack'&&a.uid===sinon.uid&&a.targetUid);
 assert.deepEqual(snipes.map(a=>a.targetUid),[low.uid]);
 s=act(s,a=>a.type==='attack'&&a.uid===sinon.uid&&a.targetUid===low.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===low.uid),false);
 assert.equal(s.players[1].front.some(c=>c?.uid===high.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-002 enters active and double attacks only while Alice and Eugeo are on the front',()=>{
 let s=fresh(['SAO-1-002','SAO-1-010','SAO-1-004','SAO-1-001'],8002,1);
 for(let i=0;i<4;i++)place(s,0,'SAO-1-001','energy',i,false);
 const alice=place(s,0,'SAO-1-010','front',0,false);
 const eugeo=place(s,0,'SAO-1-004','front',1,false);
 s=until(s,0,'main');
 const kirito=hold(s,0,'SAO-1-002');
 s=act(s,a=>a.type==='play'&&a.uid===kirito.uid&&a.line==='front'&&a.slot===2);
 assert.equal(spot(s,kirito.uid).ready,true);
 spot(s,alice.uid).ready=false;
 spot(s,eugeo.uid).ready=false;
 quietLife(s,1);
 s=act(s,a=>a.type==='next');
 s=act(s,a=>a.type==='attack'&&a.uid===kirito.uid);
 assert.equal(spot(s,kirito.uid).ready,true);
 assert.equal(s.attacksByUid[kirito.uid],1);
 assert.equal(s.pending.kind,'block');
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(s.phase,'attack');
 s=act(s,a=>a.type==='attack'&&a.uid===kirito.uid);
 assert.equal(spot(s,kirito.uid).ready,false);
 assert.equal(s.attacksByUid[kirito.uid],2);
 assert.equal(assertUniversalMatch(packs,s),true);

 let missing=fresh(['SAO-1-002','SAO-1-004','SAO-1-001'],8003,1);
 for(let i=0;i<4;i++)place(missing,0,'SAO-1-001','energy',i,false);
 place(missing,0,'SAO-1-004','front',0,false);
 missing=until(missing,0,'main');
 const lone=hold(missing,0,'SAO-1-002');
 missing=act(missing,a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front');
 assert.equal(spot(missing,lone.uid).ready,true);
 quietLife(missing,1);
 missing=act(missing,a=>a.type==='next');
 missing=act(missing,a=>a.type==='attack'&&a.uid===lone.uid);
 assert.equal(spot(missing,lone.uid).ready,false);

 let silenced=fresh(['SAO-1-002','SAO-1-010','SAO-1-004','SAO-1-001'],8004);
 const quiet=place(silenced,0,'SAO-1-002','front',0);
 place(silenced,0,'SAO-1-010','front',1,false);
 place(silenced,0,'SAO-1-004','front',2,false);
 const source=place(silenced,0,'SAO-1-001','energy',0,false);
 silenced=until(silenced,0,'main');
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:source.uid,targetUid:quiet.uid,until:{player:1,phase:'attack',edge:'end'}});
 silenced=act(silenced,a=>a.type==='next');
 silenced=act(silenced,a=>a.type==='attack'&&a.uid===quiet.uid);
 assert.equal(spot(silenced,quiet.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,silenced),true);
});

test('SAO-1-064 retires by hand plus ALO, and Q762 is 4 hand + 3 ALO = 4500',()=>{
 let s=fresh(['SAO-1-064','SAO-1-055','SAO-1-017','SAO-1-087','SAO-1-008','SAO-1-006','SAO-1-001'],8064);
 for(let i=0;i<3;i++)place(s,0,'SAO-1-055','energy',i,false);
 const under=place(s,1,'SAO-1-017','front',0);
 const over=place(s,1,'SAO-1-087','front',1);
 s=until(s,0,'main');
 const [event]=setHand(s,0,['SAO-1-064','SAO-1-001','SAO-1-008','SAO-1-006','SAO-1-055']);
 assert.equal(s.players[0].hand.length,5);
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,4500);
 assert.equal(s.pending.choices.includes(under.uid),true);
 assert.equal(s.pending.choices.includes(over.uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 aiOk(s);
 s=act(s,a=>a.type==='chooseRetireBp'&&a.uid===under.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===under.uid),false);
 assert.equal(s.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let small=fresh(['SAO-1-064','SAO-1-036','SAO-1-008','SAO-1-006'],8065);
 for(let i=0;i<3;i++)place(small,0,'SAO-1-036','energy',i,false);
 const exact=place(small,1,'SAO-1-008','front',0);
 const above=place(small,1,'SAO-1-006','front',1);
 small=until(small,0,'main');
 const [only]=setHand(small,0,['SAO-1-064']);
 small=act(small,a=>a.type==='event'&&a.uid===only.uid);
 assert.equal(small.players[0].hand.length,0);
 assert.equal(small.pending.limit,1000);
 assert.deepEqual(small.pending.choices,[exact.uid]);
 assert.equal(small.pending.choices.includes(above.uid),false);
});

test('SAO-1-099 gives a front character BP +2000 and impact plus only while Kirito is on the field',()=>{
 let s=fresh(['SAO-1-099','SAO-1-092','SAO-1-074','SAO-1-085'],8099);
 place(s,0,'SAO-1-092','energy',0,false);
 const kirito=place(s,0,'SAO-1-085','energy',1,false);
 const target=place(s,0,'SAO-1-074','front',0);
 s=until(s,0,'main');
 const event=hold(s,0,'SAO-1-099');
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(s.pending.choices,[target.uid]);
 aiOk(s);
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===target.uid);
 assert.equal(universalBp(packs,s,spot(s,target.uid)),4500);
 assert.equal(universalImpact(packs,s,spot(s,target.uid)),1);
 assert.equal(spot(s,target.uid).impactPlus.amount,1);
 assert.equal(assertUniversalMatch(packs,s),true);

 let plain=fresh(['SAO-1-099','SAO-1-092','SAO-1-074'],8100);
 place(plain,0,'SAO-1-092','energy',0,false);
 const other=place(plain,0,'SAO-1-074','front',0);
 plain=until(plain,0,'main');
 const sword=hold(plain,0,'SAO-1-099');
 plain=act(plain,a=>a.type==='event'&&a.uid===sword.uid);
 plain=act(plain,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid);
 assert.equal(universalBp(packs,plain,spot(plain,other.uid)),4500);
 assert.equal(universalImpact(packs,plain,spot(plain,other.uid)),0);
 assert.equal(assertUniversalMatch(packs,plain),true);

 let empty=fresh(['SAO-1-099','SAO-1-092'],8101);
 place(empty,0,'SAO-1-092','energy',0,false);
 empty=until(empty,0,'main');
 const none=hold(empty,0,'SAO-1-099');
 empty=act(empty,a=>a.type==='event'&&a.uid===none.uid);
 assert.equal(empty.pending,null);
 assert.equal(spot(s,kirito.uid).cardId,'SAO-1-085');
});

test('SAO-2-012 buffs every Integrity Knight, gives one front knight impact plus, then draws at four',()=>{
 let s=fresh(['SAO-2-012','SAO-1-010','SAO-1-011','SAO-2-008','SAO-2-006','SAO-1-001'],8012);
 const knights=[
  place(s,0,'SAO-1-010','front',0),
  place(s,0,'SAO-1-011','front',1),
  place(s,0,'SAO-2-008','front',2),
  place(s,0,'SAO-2-006','front',3)
 ];
 for(let i=0;i<3;i++)place(s,0,'SAO-1-001','energy',i,false);
 const printed=knights.map(c=>universalBp(packs,s,c));
 s=until(s,0,'main');
 const event=hold(s,0,'SAO-2-012');
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 knights.forEach((c,i)=>assert.equal(universalBp(packs,s,spot(s,c.uid)),printed[i]+1000));
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.pending.kind,'effect-buff-trait');
 assert.equal(s.pending.impactPlus,1);
 assert.deepEqual(s.pending.choices.map(uid=>uid).sort(),knights.map(c=>c.uid).sort());
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 aiOk(s);
 s=act(s,a=>a.type==='chooseTraitBuff'&&a.uid===knights[0].uid);
 assert.equal(universalImpact(packs,s,spot(s,knights[0].uid)),1);
 assert.equal(universalImpact(packs,s,spot(s,knights[1].uid)),0);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let three=fresh(['SAO-2-012','SAO-1-010','SAO-1-011','SAO-2-008','SAO-1-001'],8013);
 const few=[
  place(three,0,'SAO-1-010','front',0),
  place(three,0,'SAO-1-011','front',1),
  place(three,0,'SAO-2-008','front',2)
 ];
 for(let i=0;i<3;i++)place(three,0,'SAO-1-001','energy',i,false);
 three=until(three,0,'main');
 const shorter=hold(three,0,'SAO-2-012');
 const stayed=three.players[0].deck.length;
 three=act(three,a=>a.type==='event'&&a.uid===shorter.uid);
 three=act(three,a=>a.type==='chooseTraitBuff'&&a.uid===few[1].uid);
 assert.equal(three.players[0].deck.length,stayed);
 assert.equal(universalImpact(packs,three,spot(three,few[1].uid)),1);

 let back=fresh(['SAO-2-012','SAO-1-010','SAO-1-011','SAO-2-008','SAO-2-006'],8014);
 const energyKnights=[
  place(back,0,'SAO-1-010','energy',0,false),
  place(back,0,'SAO-1-011','energy',1,false),
  place(back,0,'SAO-2-008','energy',2,false),
  place(back,0,'SAO-2-006','energy',3,false)
 ];
 const beforeBp=energyKnights.map(c=>universalBp(packs,back,c));
 back=until(back,0,'main');
 const art=hold(back,0,'SAO-2-012');
 const backDeck=back.players[0].deck.length;
 back=act(back,a=>a.type==='event'&&a.uid===art.uid);
 assert.equal(back.pending,null);
 energyKnights.forEach((c,i)=>assert.equal(universalBp(packs,back,spot(back,c.uid)),beforeBp[i]+1000));
 assert.equal(energyKnights.every(c=>spot(back,c.uid).impactPlus===undefined),true);
 assert.equal(back.players[0].deck.length,backDeck-1);
 assert.equal(assertUniversalMatch(packs,back),true);
});

test('SAO-2-062 draws two, discards two, and may ready one AP only while Yuna is on the field',()=>{
 let s=fresh(['SAO-2-062','SAO-2-047','SAO-2-028','SAO-2-026'],8062);
 for(let i=0;i<3;i++)place(s,0,'SAO-2-047','energy',i,false);
 place(s,0,'SAO-2-028','front',0,false);
 s=until(s,0,'main');
 const event=hold(s,0,'SAO-2-062');
 hold(s,0,'SAO-2-026');
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.remaining,2);
 aiOk(s);
 s=act(s,a=>a.type==='chooseDiscard'&&a.uid===s.players[0].hand[0].uid);
 s=act(s,a=>a.type==='chooseDiscard'&&a.uid===s.players[0].hand[0].uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 assert.ok(rested);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 s=act(s,a=>a.type==='chooseApRecovery'&&a.uid===rested.uid);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let skipped=fresh(['SAO-2-062','SAO-2-047','SAO-2-028','SAO-2-026'],8063);
 for(let i=0;i<3;i++)place(skipped,0,'SAO-2-047','energy',i,false);
 place(skipped,0,'SAO-2-028','front',0,false);
 skipped=until(skipped,0,'main');
 const song=hold(skipped,0,'SAO-2-062');
 hold(skipped,0,'SAO-2-026');
 skipped=act(skipped,a=>a.type==='event'&&a.uid===song.uid);
 skipped=act(skipped,a=>a.type==='chooseDiscard'&&a.uid===skipped.players[0].hand[0].uid);
 skipped=act(skipped,a=>a.type==='chooseDiscard'&&a.uid===skipped.players[0].hand[0].uid);
 const waiting=skipped.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 skipped=act(skipped,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(skipped.players[0].apCards.find(c=>c.uid===waiting.uid).ready,false);
 assert.equal(skipped.pending,null);

 let quiet=fresh(['SAO-2-062','SAO-2-047','SAO-2-026'],8066);
 for(let i=0;i<3;i++)place(quiet,0,'SAO-2-047','energy',i,false);
 quiet=until(quiet,0,'main');
 const lone=hold(quiet,0,'SAO-2-062');
 hold(quiet,0,'SAO-2-026');
 quiet=act(quiet,a=>a.type==='event'&&a.uid===lone.uid);
 quiet=act(quiet,a=>a.type==='chooseDiscard'&&a.uid===quiet.players[0].hand[0].uid);
 quiet=act(quiet,a=>a.type==='chooseDiscard'&&a.uid===quiet.players[0].hand[0].uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].apCards.some(c=>c.inPlay&&c.ready),false);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('SAO-1-080 draws on attack only for Asuna, Siune or Sleeping Knights, and nullifies impact',()=>{
 let s=fresh(['SAO-1-080','SAO-1-036','SAO-1-087'],8080);
 const yuuki=place(s,0,'SAO-1-080','front',0);
 place(s,0,'SAO-1-036','front',1,false);
 s=until(s,0,'main');
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='next');
 s=act(s,a=>a.type==='attack'&&a.uid===yuuki.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 aiOk(s);
 s=act(s,a=>a.type==='chooseDiscard'&&a.uid===s.players[0].hand[0].uid);
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);

 let none=fresh(['SAO-1-080','SAO-1-001'],8081);
 const solo=place(none,0,'SAO-1-080','front',0);
 none=until(none,0,'main');
 const stayed=none.players[0].deck.length;
 none=act(none,a=>a.type==='next');
 none=act(none,a=>a.type==='attack'&&a.uid===solo.uid);
 assert.equal(none.players[0].deck.length,stayed);
 assert.equal(none.pending.kind,'block');

 let battle=fresh(['SAO-1-080','SAO-1-087'],8082);
 const defender=place(battle,0,'SAO-1-080','front',0,false);
 const attacker=place(battle,1,'SAO-1-087','front',0);
 battle=until(battle,1,'attack');
 const life=battle.players[0].life.length;
 battle=act(battle,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 assert.equal(battle.pending.kind,'block');
 battle=act(battle,a=>a.type==='chooseBlock'&&a.uid===defender.uid);
 assert.equal(battle.players[0].front.some(c=>c?.uid===defender.uid),false);
 assert.equal(battle.players[0].life.length,life);
 assert.equal(battle.players[0].outside.some(c=>c.uid===defender.uid),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('SAO-1-086 looks at the top four and may add one GGO that is not Kirito',()=>{
 let s=fresh(['SAO-1-086','SAO-1-092','SAO-1-074','SAO-1-085','SAO-1-036','SAO-1-055'],8086);
 place(s,0,'SAO-1-092','energy',0,false);
 place(s,0,'SAO-1-074','energy',1,false);
 s=until(s,0,'main');
 const window=topDeck(s,0,['SAO-1-085','SAO-1-092','SAO-1-036','SAO-1-055']);
 const kirito=hold(s,0,'SAO-1-086');
 s=act(s,a=>a.type==='play'&&a.uid===kirito.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.excludeName,'キリト');
 assert.deepEqual(s.pending.choices,[window[1].uid]);
 aiOk(s);
 s=act(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid);
 s=orderBottoms(s);
 assert.equal(s.pending.kind,'effect-discard');
 s=act(s,a=>a.type==='chooseDiscard'&&a.uid===s.players[0].hand[0].uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.players[0].deck.slice(-3).some(c=>c.uid===window[0].uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let skip=fresh(['SAO-1-086','SAO-1-092','SAO-1-074','SAO-1-085','SAO-1-036','SAO-1-055'],8087);
 place(skip,0,'SAO-1-092','energy',0,false);
 place(skip,0,'SAO-1-074','energy',1,false);
 skip=until(skip,0,'main');
 const seen=topDeck(skip,0,['SAO-1-085','SAO-1-092','SAO-1-036','SAO-1-055']);
 const played=hold(skip,0,'SAO-1-086');
 const handWithPlay=skip.players[0].hand.length;
 skip=act(skip,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front');
 skip=act(skip,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 skip=orderBottoms(skip);
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].hand.length,handWithPlay-1);
 assert.equal(skip.players[0].hand.some(c=>c.uid===seen[1].uid),false);
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('SAO-1-029 rests, truly retires, and draws two only while a BP 4000 Eugeo is on the field',()=>{
 let s=fresh(['SAO-1-029','SAO-1-108','SAO-2-007'],8029);
 const before=census(s.players[0]).concat(census(s.players[1]));
 const tree=place(s,0,'SAO-1-029','energy',0);
 const shop=place(s,0,'SAO-1-108','energy',1);
 const eugeo=place(s,0,'SAO-2-007','front',0);
 s=until(s,0,'main');
 assert.equal(universalBp(packs,s,spot(s,eugeo.uid)),2000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='fieldRestRetireDraw'),false);
 s=act(s,a=>a.type==='activate'&&a.uid===shop.uid&&a.mode==='selfRestBuff');
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===eugeo.uid);
 assert.equal(universalBp(packs,s,spot(s,eugeo.uid)),3000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='fieldRestRetireDraw'),false);
 spot(s,shop.uid).ready=true;
 s=act(s,a=>a.type==='activate'&&a.uid===shop.uid&&a.mode==='selfRestBuff');
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===eugeo.uid);
 assert.equal(universalBp(packs,s,spot(s,eugeo.uid)),4000);
 assert.equal(sao.cards['SAO-2-007'].nameAliases.includes('ユージオ'),true);
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=act(s,a=>a.type==='activate'&&a.uid===tree.uid&&a.mode==='fieldRestRetireDraw');
 assert.equal(s.players[0].energy.some(c=>c?.uid===tree.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===tree.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.players[0].hand.length,hand+2);
 assert.equal(s.pending,null);
 assert.equal(s.status,'playing');
 assert.deepEqual(census(s.players[0]).concat(census(s.players[1])),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});
