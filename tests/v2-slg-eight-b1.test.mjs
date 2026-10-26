import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalImpact,universalBp,
 effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Catalogue Chinese is the registration anchor. Official pages were not re-read
// in this batch: UA51BT/SLG-1-017, 074, 050, 071.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-017','SLG-1-074','SLG-1-050','SLG-1-071','SLG-1-070',
 'SLG-1-069','SLG-1-015','SLG-1-056','SLG-1-065','SLG-1-062','SLG-1-072','SLG-1-045'];
const filler=Object.values(slg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
 !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
const ids=[...required,filler[0]];
const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
assert.deepEqual(validateUniversalDeck(slg,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card: '+id);
}
function main(s){
 for(let i=0;i<6&&s.phase!=='main';i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function fresh(){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:8017,first:0});
}
test('batch 1 prints and shared programs',()=>{
 const cat=id=>SOLO_LEVELING_CARDS.find(c=>c.id===id);
 assert.equal(cat('SLG-1-017').nameJa,'水篠 旬');
 assert.equal(cat('SLG-1-074').nameJa,'ルノー');
 assert.equal(cat('SLG-1-050').nameJa,'観月 絵里');
 assert.equal(cat('SLG-1-071').nameJa,'マリー');
 const a=slg.cards['SLG-1-017'];
 assert.equal(a.emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(a.effects.onPlay,[{op:'peekTopOne'}]);
 assert.deepEqual(slg.cards['SLG-1-074'].effects.onPlay,[{
  op:'grantOtherImpactThisTurn',trait:'DFN',amount:1,optional:true}]);
 assert.deepEqual(slg.cards['SLG-1-074'].traits,['DFN／第四次架南島レイド']);
 assert.equal(slg.cards['SLG-1-050'].mainAbility.op,'restRetireRecoverName');
 assert.equal(slg.cards['SLG-1-071'].mainAbility.op,'restBuffOtherThenHand');
 for(const id of ['SLG-1-017','SLG-1-074','SLG-1-050','SLG-1-071'])
  assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes(id),true);
});
test('017 reduces purple cost only on an empty own field, then peeks the top card',()=>{
 let s=fresh();
 const sung=take(s,0,'SLG-1-017');s.players[0].hand.push(sung);
 s=main(s);
 const live=s.players[0].hand.find(c=>c.uid===sung.uid);
 assert.equal(effectiveHandRequiredEnergy(slg,s,0,slg.cards[live.cardId]),0);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===sung.uid&&
  a.line==='front'&&a.slot===0);
 assert.ok(play);
 const top=s.players[0].deck[0].uid,deck=s.players[0].deck.length,ap=s.players[0].apCards.filter(c=>c.ready).length;
 let kept=dispatchUniversalAction(packs,s,play);
 assert.equal(kept.pending.kind,'private-top-choice');
 const hidden=universalPublicView(packs,kept,1);
 assert.equal(hidden.pending.kind,'private-top-choice');
 assert.equal(hidden.players[0].hand,null);
 assert.equal(JSON.stringify(hidden).includes(top),false);
 assert.equal(uiActionLabel({type:'chooseTopCard',mode:'top'},{pack:slg,state:kept}).length>0,true);
 kept=dispatchUniversalAction(packs,kept,{type:'chooseTopCard',mode:'top'});
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].deck[0].uid,top);
 assert.equal(kept.players[0].deck.length,deck);
 assert.equal(kept.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(assertUniversalMatch(packs,kept),true);
 let milled=dispatchUniversalAction(packs,s,play);
 milled=dispatchUniversalAction(packs,milled,{type:'chooseTopCard',mode:'outside'});
 assert.equal(milled.players[0].outside.at(-1).uid,top);
 assert.equal(milled.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(packs,milled),true);
});
test('017 costs 2 once any own field card exists',()=>{
 let s=fresh();
 const sung=take(s,0,'SLG-1-017');s.players[0].hand.push(sung);
 const gen=take(s,0,'SLG-1-015');gen.ready=true;s.players[0].energy[0]=gen;
 s=main(s);
 assert.equal(effectiveHandRequiredEnergy(slg,s,0,slg.cards['SLG-1-017']),2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===sung.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('074 grants this-turn Impact to one other own DFN and may decline',()=>{
 let s=fresh();
 const reno=take(s,0,'SLG-1-074');s.players[0].hand.push(reno);
 const shima=take(s,0,'SLG-1-070');shima.ready=true;s.players[0].energy[0]=shima;
 const ken=take(s,0,'SLG-1-069');ken.ready=true;s.players[0].energy[1]=ken;
 const shizuku=take(s,0,'SLG-1-056');shizuku.ready=true;s.players[0].energy[2]=shizuku;
 s=main(s);
 for(const c of s.players[0].energy.filter(Boolean))
  if(!Number.isInteger(c.fieldEntryStamp))c.fieldEntryStamp=s.nextFieldEntryStamp++;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===reno.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 let next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending.kind,'effect-grant-other-impact');
 const choices=legalUniversalActions(packs,next);
 assert.ok(choices.some(a=>a.uid===shima.uid));
 assert.ok(choices.some(a=>a.uid===ken.uid));
 assert.equal(choices.some(a=>a.uid===shizuku.uid||a.uid===reno.uid),false);
 assert.ok(choices.some(a=>a.uid===null));
 assert.equal(uiActionLabel({type:'chooseOtherImpact',uid:shima.uid},{pack:slg,state:next}).includes('Impact'),true);
 const granted=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===shima.uid));
 const ally=granted.players[0].energy.find(c=>c?.uid===shima.uid);
 assert.equal(universalImpact(packs,granted,ally),1);
 assert.equal(ally.impactGranted.amount,1);
 assert.equal(ally.impactGranted.sourceUid,reno.uid);
 const skipped=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===null));
 assert.equal(skipped.players[0].energy.find(c=>c?.uid===shima.uid).impactGranted,undefined);
 assert.equal(assertUniversalMatch(packs,granted),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});
test('050 rests, retires, and may recover one outside 水篠 旬',()=>{
 let s=fresh();
 const eri=take(s,0,'SLG-1-050');eri.ready=false;s.players[0].front[0]=eri;
 const sung=take(s,0,'SLG-1-015');s.players[0].outside.push(sung);
 const other=take(s,0,'SLG-1-056');s.players[0].outside.push(other);
 s=main(s);
 s.players[0].front[0].ready=true;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='restRetireName'&&a.uid===eri.uid);
 assert.ok(act);
 assert.equal(uiActionLabel(act,{pack:slg,state:s}).includes('退場'),true);
 let next=dispatchUniversalAction(packs,s,act);
 assert.equal(next.players[0].front[0],null);
 assert.ok(next.players[0].outside.some(c=>c.uid===eri.uid));
 assert.equal(next.pending.kind,'effect-recover-outside');
 const choices=legalUniversalActions(packs,next);
 assert.ok(choices.some(a=>a.uid===sung.uid));
 assert.equal(choices.some(a=>a.uid===other.uid||a.uid===eri.uid),false);
 const recovered=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===sung.uid));
 assert.equal(recovered.pending,null);
 assert.ok(recovered.players[0].hand.some(c=>c.uid===sung.uid));
 assert.ok(recovered.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(assertUniversalMatch(packs,recovered),true);
 const declined=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===null));
 assert.ok(declined.players[0].outside.some(c=>c.uid===sung.uid));
 assert.equal(assertUniversalMatch(packs,declined),true);
});
test('071 rests, buffs another character, then returns itself to hand once',()=>{
 let s=fresh();
 const marie=take(s,0,'SLG-1-071');marie.ready=false;s.players[0].front[0]=marie;
 const ally=take(s,0,'SLG-1-056');ally.ready=true;s.players[0].front[1]=ally;
 s=main(s);
 s.players[0].front[0].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restBuffHand'&&a.uid===marie.uid),true);
 s.players[0].front[0].ready=false;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restBuffHand'),false);
 s.players[0].front[0].ready=true;
 const alone=s.players[0].front[1];s.players[0].front[1]=null;s.players[0].outside.push(alone);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restBuffHand'),false);
 s.players[0].front[1]=s.players[0].outside.pop();
 const act=legalUniversalActions(packs,s).find(a=>a.mode==='restBuffHand'&&a.uid===marie.uid);
 let next=dispatchUniversalAction(packs,s,act);
 assert.equal(next.pending.kind,'effect-buff-own');
 assert.equal(legalUniversalActions(packs,next).some(a=>a.uid===marie.uid),false);
 next=dispatchUniversalAction(packs,next,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(next.pending,null);
 assert.equal(next.players[0].front[0],null);
 assert.ok(next.players[0].hand.some(c=>c.uid===marie.uid));
 const buffed=next.players[0].front[1];
 assert.equal(universalBp(packs,next,buffed),slg.cards['SLG-1-056'].bp+1000);
 assert.equal(legalUniversalActions(packs,next).some(a=>a.mode==='restBuffHand'&&a.uid===marie.uid),false);
 assert.equal(assertUniversalMatch(packs,next),true);
});
