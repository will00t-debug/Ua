import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const slg=registeredV2TitlePack('solo-leveling');
const saoIds=['SAO-1-001','SAO-1-016','SAO-1-019','SAO-1-023','SAO-1-035',
 'SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-054','SAO-1-055',
 'SAO-1-058','SAO-2-021'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));
saoDeck['SAO-1-061']=2;
const slgDeck=Object.fromEntries(['004','005','006','008','009','015','016','018',
 '025','032','041','043'].map(id=>['SLG-1-'+id,4]));
slgDeck['SLG-1-037']=2;
assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
function fixture(seed=2021,reverse=false,firstOverride=null){
 const packs=reverse?[slg,sao]:[sao,slg],p=reverse?1:0;
 const decks=reverse?[slgDeck,saoDeck]:[saoDeck,slgDeck];
 return {packs,p,s:newUniversalMatch(packs,{decks,first:firstOverride===null?p:firstOverride,seed})};
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],index=list.findIndex(c=>c.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Physical registered card unavailable '+id);
}
function main(pack,s){
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function entered(line='front',reverse=false,seed=2021){
 const f=fixture(seed,reverse),{packs,p}=f;
 let s=f.s,unit=take(s,p,'SAO-2-021');s.players[p].hand.push(unit);
 s=main(packs,s);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===unit.uid&&a.line===line&&a.slot===0);
 assert.ok(action,'zero blue required, printed 1 AP');
 s=dispatchUniversalAction(packs,s,action,{actor:p});
 assert.equal(s.players[p][line][0].uid,unit.uid);
 assert.equal(s.players[p][line][0].ready,false);
 return {packs,p,s,unit};
}
const activate=(packs,s,uid)=>legalUniversalActions(packs,s)
 .find(a=>a.type==='activate'&&a.uid===uid&&a.mode==='discardSelfBuff');

test('EX08BT SAO-2-021 full Japanese print matches existing SLG-009 common MAIN schema, not title reducer',()=>{
 const official=SAO_OFFICIAL_CARDS.find(x=>x.number==='EX08BT/SAO-2-021'),
  a=sao.cards['SAO-2-021'],b=slg.cards['SLG-1-009'];
 assert.equal(official.nameJa,'キリト');
 assert.equal(official.id,'SAO-2-021');assert.equal(official.bpPrinted,'1500+');
 assert.equal(official.type,'character');
 assert.equal(official.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-021');
 assert.equal(official.effectJa,'【起動メイン】【手札を1枚場外に置く】 【ターン1】このキャラはこのターン中、BP+1500。');
 assert.deepEqual([a.color,a.energy,a.ap,a.bp,a.gen,a.trigger,a.type,a.traits],
  ['blue',0,1,1500,1,'active','character',['ALO']]);
 assert.deepEqual(a.mainAbility,b.mainAbility);
 assert.deepEqual(a.mainAbility,{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500});
 assert.deepEqual(a.effects,{});
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
});
test('SAO FIRST vs SLG: REST KIRITO may activate, exact own hand card pays before BP and once-used locks',()=>{
 const {packs,p,unit,s:before}=entered('front');
 assert.equal(p,0);
 const a=activate(packs,before,unit.uid),hand=before.players[p].hand.length,
  ap=before.players[p].apCards.filter(c=>c.ready).length;
 assert.ok(a);assert.match(uiActionLabel(a,{pack:packs,state:before}),/棄一張手牌/);
 const copy=structuredClone(before),pending=dispatchUniversalAction(packs,before,a,{actor:p});
 assert.deepEqual(before,copy,'pure reducer does not mutate match input');
 assert.equal(pending.pending.kind,'main-discard-buff');
 assert.equal(pending.players[p].hand.length,hand);
 assert.equal(pending.turnEffectZoneMoves[p].handToOutside,false);
 assert.equal(universalBp(packs,pending,pending.players[p].front[0]),1500,'no early buff or unpaid cost');
 assert.equal(pending.players[p].apCards.filter(c=>c.ready).length,ap);
 assert.equal(pending.mainAbilityUsedUids.includes(unit.uid),false);
 const options=legalUniversalActions(packs,pending);
 assert.ok(options.length&&options.every(x=>x.type==='chooseMainDiscard'&&
  pending.players[p].hand.some(c=>c.uid===x.uid)));
 const enemy=take(pending,1,'SLG-1-005');pending.players[1].outside.push(enemy);
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseMainDiscard',uid:enemy.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseMainDiscard',uid:unit.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,pending,options[0],{actor:1}),/Wrong player/);
 assert.deepEqual(universalPublicView(packs,pending,1).pending,{kind:'main-discard-buff',player:0});
 assert.equal(universalPublicView(packs,pending,1).players[0].hand,null);
 const out=dispatchUniversalAction(packs,pending,options[0],{actor:p});
 assert.equal(out.pending,null);
 assert.equal(out.players[p].hand.length,hand-1);
 assert.ok(out.players[p].outside.some(c=>c.uid===options[0].uid));
 assert.equal(universalBp(packs,out,out.players[p].front[0]),3000);
 assert.equal(out.players[p].front[0].ready,false,'printed MAIN does not REST or ACTIVE source');
 assert.equal(out.players[p].apCards.filter(c=>c.ready).length,ap,'no extra AP cost');
 assert.equal(out.turnEffectZoneMoves[p].handToOutside,true);
 assert.deepEqual(out.turnEffectZoneMoves[1],{handToOutside:false,outsideToHand:false});
 assert.deepEqual(out.mainAbilityUsedUids,[unit.uid]);
 assert.equal(activate(packs,out,unit.uid),undefined);
 assert.throws(()=>dispatchUniversalAction(packs,out,a,{actor:p}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,out),true);
});
test('SLG FIRST vs SAO SECOND: universal owner UID and hard AI choose OWN hand card, REST ENERGY legal',()=>{
 const {packs,p,s:before,unit}=entered('energy',true,22021);
 assert.equal(p,1);
 assert.ok(unit.uid.startsWith('1-'));
 const a=activate(packs,before,unit.uid);assert.ok(a);
 const ap=before.players[p].apCards.filter(c=>c.ready).length;
 let s=dispatchUniversalAction(packs,before,a,{actor:p});
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(legalUniversalActions(packs,s).some(x=>x.uid===ai.uid&&x.type==='chooseMainDiscard'));
 assert.ok(s.players[p].hand.some(c=>c.uid===ai.uid));
 const paid=dispatchUniversalAction(packs,s,ai,{actor:p});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[p].energy[0].uid,unit.uid);
 assert.equal(paid.players[p].energy[0].ready,false);
 assert.equal(universalBp(packs,paid,paid.players[p].energy[0]),3000);
 assert.equal(paid.players[p].apCards.filter(c=>c.ready).length,ap);
 assert.ok(paid.players[p].outside.some(x=>x.uid===ai.uid));
 assert.equal(paid.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(paid.turnEffectZoneMoves[1].handToOutside,true);
 assert.equal(assertUniversalMatch(packs,paid),true);
});
test('SAO MAIN source cannot activate with ZERO owned hand; separate second Kirito can pay independently',()=>{
 const {packs,p,s:input,unit}=entered();
 let s=structuredClone(input),second=take(s,p,'SAO-2-021');
 s.players[p].front[1]=second;
 assert.ok(activate(packs,s,unit.uid));assert.ok(activate(packs,s,second.uid));
 s=dispatchUniversalAction(packs,s,activate(packs,s,unit.uid));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 assert.ok(!activate(packs,s,unit.uid),'first physical source locked');
 assert.ok(activate(packs,s,second.uid),'different physical source remains legal');
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 assert.equal(s.players[p].hand.length,0);
 assert.equal(activate(packs,s,second.uid),undefined);
 assert.equal(universalBp(packs,s,s.players[p].front[1]),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SAO temporary +1500 disappears on next turn and once-use is rearmed, no discarded card duplication',()=>{
 const {packs,p,unit,s:input}=entered();
 let s=dispatchUniversalAction(packs,input,activate(packs,input,unit.uid));
 const paid=legalUniversalActions(packs,s)[0];s=dispatchUniversalAction(packs,s,paid);
 assert.equal(universalBp(packs,s,s.players[p].front[0]),3000);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(universalBp(packs,s,s.players[p].front[0]),1500);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=main(packs,s);
 assert.ok(activate(packs,s,unit.uid),'next own turn re-enables ability');
 assert.equal(universalBp(packs,s,s.players[p].front[0]),1500);
 assert.ok(s.players[p].outside.some(c=>c.uid===paid.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SAO ACTIVE life remains independently correct vs SLG attacker, without paying MAIN discard',()=>{
 const {packs,p,s:input}=fixture(21022,true,0); // SLG p0 attacks SAO p1.
 let s=input;
 const life=take(s,1,'SAO-2-021'),attacker=take(s,0,'SLG-1-005'),
  defender=take(s,1,'SAO-1-001');
 attacker.ready=true;defender.ready=false;
 s.players[0].front[0]=attacker;s.players[1].front[0]=defender;
 s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(life);
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'active');
 const opts=legalUniversalActions(packs,s);
 assert.ok(!opts.some(x=>x.uid===attacker.uid),'opponent character not eligible for ACTIVE Life');
 const a=opts.find(x=>x.type==='chooseTrigger'&&x.mode==='active'&&x.uid===defender.uid);
 assert.ok(a);
 const oldHand=s.players[1].hand.length;
 const out=dispatchUniversalAction(packs,s,a,{actor:1});
 assert.equal(out.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,out,out.players[1].front[0]),5000);
 assert.equal(out.players[1].hand.length,oldHand);
 assert.deepEqual(out.turnEffectZoneMoves[1],{handToOutside:false,outsideToHand:false});
 assert.equal(assertUniversalMatch(packs,out),true);
});
