import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_CARDS,REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,REZERO_ENGINE_IDS,rezeroEngineKind,rezeroPackCard} from '../dist/universal-v2/rezero-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 effectiveHandRequiredEnergy
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const fours=['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-013','REZ-1-014',
 'REZ-1-016','REZ-1-022','REZ-1-023','REZ-1-024','REZ-1-043','REZ-1-056'];
const twos=['REZ-1-003','REZ-1-017','REZ-1-029'];
const counts={
 ...Object.fromEntries(fours.map(id=>[id,4])),
 ...Object.fromEntries(twos.map(id=>[id,2]))
};
const fresh=(seed=4001)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function reach(s,phase){
 for(let i=0;i<4&&s.phase!==phase;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function at(s,p,uid){
 const pl=s.players[p];
 for(const zone of ['front','energy','hand','deck','life','outside','removed']){
  const cards=zone==='front'||zone==='energy'?pl[zone].filter(Boolean):pl[zone];
  const card=cards.find(c=>c.uid===uid);
  if(card)return card;
 }
 return null;
}

test('UA40BT and UA40ST share one catalogue and keep parallel art out',()=>{
 assert.equal(REZERO_CARDS.length,113);
 assert.equal(new Set(REZERO_CARDS.map(c=>c.id)).size,113);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.includes('UA40BT')).length,100);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.includes('UA40ST')).length,22);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.length===2).length,9);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.join()==='UA40ST').length,13);
 assert.ok(REZERO_CARDS.every(c=>c.type!=='ap'&&!c.id.includes('AP')));
 assert.equal(REZERO_BY_ID['REZ-1-001'].name,'帕克');
 assert.deepEqual(REZERO_BY_ID['REZ-1-001'].altNames,['卡包']);
 assert.deepEqual(REZERO_BY_ID['REZ-1-001'].sets,['UA40BT','UA40ST']);
 assert.equal(REZERO_BY_ID['REZ-1-103'].sets.join(),'UA40ST');
 assert.equal(REZERO_BY_ID['REZ-1-103'].nameJa,'レム');
 for(const c of REZERO_CARDS){
  assert.equal(c.identity,c.id);
  assert.equal(c.title,'rezero');
  assert.equal(c.auto,false);
  assert.equal(rezeroEngineKind(c.effectJa),c.engineKind,c.id);
  assert.ok(c.source.includes('unionarena-tcg.com/jp/cardlist/'),c.id);
  assert.ok(c.effect.length>0&&c.effectJa.length>0,c.id);
 }
});

test('eighty-seven whole prints enter the V2 pack and the other twenty-six stay out',()=>{
 assert.equal(REZERO_ENGINE_IDS.length,87);
 assert.equal(Object.keys(pack.cards).length,87);
 assert.equal(pack.cards['REZ-1-001'],undefined);
 assert.equal(pack.cards['REZ-1-008'].step,true);
 assert.equal(pack.cards['REZ-1-008'].implementation,'vanilla');
 assert.equal(pack.cards['REZ-1-013'].impactNull,true);
 assert.deepEqual(pack.cards['REZ-1-023'].effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-024'].effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.deepEqual(pack.cards['REZ-1-056'].effects.onPlay,[{op:'draw',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-029'].effects.onPlay,[{op:'recoverAp',count:2}]);
 assert.equal(pack.cards['REZ-1-016'].activeExtraEnergy,1);
 assert.equal(pack.cards['REZ-1-016'].gen,0);
 assert.deepEqual(pack.cards['REZ-1-003'].opponentFieldColorsHandEnergyDiscount,
  {amount:1,colors:['blue','purple']});
 assert.equal(pack.cards['REZ-1-028'].step,true);
 assert.equal(pack.cards['REZ-1-028'].emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(pack.cards['REZ-1-006'].mainAbility,{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1});
 assert.equal(pack.cards['REZ-1-037'].color,'blue');
 assert.equal(pack.cards['REZ-1-082'].color,'purple');
 assert.deepEqual(pack.cards['REZ-1-102'].passiveBonuses,[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'フェルト'},bp:1000}]);
 assert.deepEqual(pack.cards['REZ-1-105'].passiveBonuses,[{
  condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]);
 assert.deepEqual(pack.cards['REZ-1-110'].passiveBonuses,[{
  condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'ナツキ・スバル'},
  extraEnergy:1}]);
 assert.deepEqual(pack.cards['REZ-1-005'].effects.onPlay,[{
  op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]);
 assert.deepEqual(pack.cards['REZ-1-018'].effects.onPlay,[{
  op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}]);
 assert.deepEqual(pack.cards['REZ-1-018'].triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.deepEqual(pack.cards['REZ-1-025'].effects.onPlay,[{
  op:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-083'].effects.onPlay,[{
  op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-050'].effects.onPlay,[{
  op:'inspectTopAnyOutside',count:2,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-050'].triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(pack.cards['REZ-1-111'].nameAliases,['クルシュ・カルステン','フェリス']);
 assert.equal(pack.cards['REZ-1-111'].name,'クルシュ＆フェリス');
 assert.equal(pack.cards['REZ-1-111'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-009'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'ラム'},{field:'name',value:'レム'},
   {field:'name',value:'ロズワール・L・メイザース'}]}]);
 assert.equal(pack.cards['REZ-1-049'].effects.onPlay[0].count,3);
 assert.equal(pack.cards['REZ-1-049'].effects.onPlay[0].filters.length,2);
 assert.equal(pack.cards['REZ-1-069'].effects.onPlay[0].filters[2].value,'禁書庫');
 assert.equal(pack.cards['REZ-1-057'].effects.onPlay[0].count,4);
 assert.deepEqual(pack.cards['REZ-1-057'].triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(pack.cards['REZ-1-010'].effects.onPlay,[{op:'drawIfOwnName',count:1,
  names:['レム','ロズワール・L・メイザース']}]);
 assert.deepEqual(pack.cards['REZ-1-026'].effects.onPlay,[{op:'drawIfOwnEventUsed',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-026'].triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.deepEqual(pack.cards['REZ-1-075'].effects.onPlay,[{op:'draw',count:1,entry:'ownEffect'}]);
 assert.deepEqual(pack.cards['REZ-1-004'].effects.onPlay,[
  {op:'draw',count:1},{op:'recoverAp',count:1,require:'ownEventUsed'}]);
 assert.deepEqual(pack.cards['REZ-1-091'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:7,
  filter:{field:'name',value:REZERO_BY_ID['REZ-1-098'].nameJa}}]);
 assert.deepEqual(pack.cards['REZ-1-021'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireAllNames:['ラム','レム'],
  then:[{op:'drawDiscard',count:1}]});
 assert.equal(pack.cards['REZ-1-108'].type,'field');
 assert.deepEqual(pack.cards['REZ-1-108'].mainAbility,{
  op:'restSelfThen',frontOnly:false,oncePerTurn:true,then:[{op:'peekTopOrBottom'}]});
 assert.deepEqual(pack.cards['REZ-1-042'].effects.onPlay,[{
  op:'buffEitherOther',bp:1000,optional:true}]);
 assert.equal(pack.cards['REZ-1-042'].trigger,'active');
 assert.equal(pack.cards['REZ-1-042'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-041'].passiveBonuses,[{
  condition:{kind:'ownPrintedCharacter',turn:'own',zone:'front',excludeSelf:false,
   name:'ナツキ・スバル',color:'blue',energy:0},bp:1000}]);
 assert.equal(pack.cards['REZ-1-041'].trigger,'active');
 assert.deepEqual(pack.cards['REZ-1-045'].mainAbility,{
  op:'revealHandBottomBuff',oncePerTurn:true,minPrintedBp:4000,bp:2500});
 assert.equal(pack.cards['REZ-1-045'].trigger,'active');
 assert.equal(pack.cards['REZ-1-045'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-046'].effects.onPlay,[{
  op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0,bp:1000}]);
 assert.equal(pack.cards['REZ-1-046'].trigger,null);
 assert.equal(pack.cards['REZ-1-052'],undefined);
 assert.deepEqual(pack.cards['REZ-1-087'].effects.onPlay,[{
  op:'removeNamedOutsideActive',name:REZERO_BY_ID['REZ-1-098'].nameJa}]);
 assert.equal(pack.cards['REZ-1-087'].ownTurnBp,1000);
 assert.deepEqual(pack.cards['REZ-1-031'].effects.onPlay,[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'レム',bonusBp:5000}]);
 assert.deepEqual(pack.cards['REZ-1-031'].triggerEffect,{op:'retireOppFront'});
 assert.equal(pack.cards['REZ-1-031'].type,'event');
 assert.deepEqual(pack.cards['REZ-1-063'].effects.onPlay,pack.cards['REZ-1-031'].effects.onPlay);
 assert.deepEqual(pack.cards['REZ-1-063'].triggerEffect,{op:'retireOppFront'});
 assert.equal(pack.cards['REZ-1-063'].color,'blue');
 assert.deepEqual(pack.cards['REZ-1-100'].effects.onPlay,[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'エミリア',bonusBp:5000}]);
 assert.deepEqual(pack.cards['REZ-1-100'].triggerEffect,{op:'retireOppFront'});
 assert.equal(pack.cards['REZ-1-100'].color,'purple');
 assert.equal(pack.cards['REZ-1-096'].type,'event');
 assert.equal(pack.cards['REZ-1-096'].trigger,'special');
 assert.deepEqual(pack.cards['REZ-1-096'].triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(pack.cards['REZ-1-096'].effects.onPlay,[{
  op:'retireOppFrontTiered',bp:3000,tiers:[
   {names:['ベアトリス'],bp:4000},
   {names:['ベアトリス','ナツキ・スバル'],bp:5000}]}]);
 assert.equal(pack.cards['REZ-1-062'].type,'event');
 assert.equal(pack.cards['REZ-1-062'].color,'blue');
 assert.equal(pack.cards['REZ-1-062'].trigger,'active');
 assert.equal(pack.cards['REZ-1-062'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-062'].effects.onPlay,[{
  op:'buffNamedImpactDraw',name:'レム',bp:1000,impactPlus:1,draw:1}]);
 assert.equal(pack.cards['REZ-1-109'].type,'event');
 assert.equal(pack.cards['REZ-1-109'].color,'yellow');
 assert.equal(pack.cards['REZ-1-109'].trigger,null);
 assert.equal(pack.cards['REZ-1-109'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-109'].effects.onPlay,[{
  op:'searchTopTraitOrEventAp',count:5,trait:'王選候補者'}]);
 assert.equal(pack.cards['REZ-1-085'].color,'purple');
 assert.equal(pack.cards['REZ-1-085'].trigger,'draw');
 assert.equal(pack.cards['REZ-1-085'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-085'].effects.onPlay,undefined);
 assert.deepEqual(pack.cards['REZ-1-085'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
  then:[{op:'discountNextNamedHandEnergy',name:'エミリア',color:'purple',amount:1}]});
 assert.equal(pack.cards['REZ-1-065'].type,'event');
 assert.equal(pack.cards['REZ-1-065'].color,'blue');
 assert.equal(pack.cards['REZ-1-065'].energy,4);
 assert.equal(pack.cards['REZ-1-065'].trigger,'draw');
 assert.equal(pack.cards['REZ-1-065'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-065'].handRevealCharacterBp,4000);
 assert.deepEqual(pack.cards['REZ-1-065'].effects.onPlay,[{
  op:'retireOppFrontAtLeastBp',bp:4500}]);
 assert.equal(pack.cards['REZ-1-104'].enterAlwaysActive,true);
 assert.equal(pack.cards['REZ-1-104'].trigger,'active');
 assert.equal(pack.cards['REZ-1-104'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-104'].ap,2);
 assert.deepEqual(pack.cards['REZ-1-104'].effects.onPlay,[{
  op:'enemyBpDown',bp:1000,optional:true,minBp:1500,maxTargets:2,zone:'front'}]);
 assert.deepEqual(pack.cards['REZ-1-104'].effects.onAttack,[{
  op:'drawIfOppFrontBelowPrinted',count:1}]);
 assert.equal(pack.cards['REZ-1-066'].type,'event');
 assert.equal(pack.cards['REZ-1-066'].color,'blue');
 assert.equal(pack.cards['REZ-1-066'].energy,4);
 assert.equal(pack.cards['REZ-1-066'].trigger,'special');
 assert.deepEqual(pack.cards['REZ-1-066'].triggerEffect,{op:'retireOppFront'});
 assert.equal(pack.cards['REZ-1-066'].playRequiresOwnName,'クルシュ・カルステン');
 assert.deepEqual(pack.cards['REZ-1-066'].effects.onPlay,[
  {op:'retireOppFrontAtMostBp',bp:5000},
  {op:'grantHandCharacterBpMay',amount:1000}]);
 assert.equal(pack.cards['REZ-1-034'].trigger,'active');
 assert.equal(pack.cards['REZ-1-034'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-034'].color,'blue');
 assert.equal(pack.cards['REZ-1-034'].energy,4);
 assert.deepEqual(pack.cards['REZ-1-034'].effects.onPlay,[{
  op:'optionalPayApThen',ap:1,optional:true,ownTurn:true,
  then:[{op:'retireOppFrontAtLeastBp',bp:4500,optional:true}]}]);
 assert.deepEqual(pack.cards['REZ-1-034'].mainAbility,{
  op:'revealHandBottomImpact',oncePerTurn:true,minPrintedBp:4000,impact:1});
 assert.equal(pack.cards['REZ-1-047'].trigger,'active');
 assert.equal(pack.cards['REZ-1-047'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-047'].color,'blue');
 assert.equal(pack.cards['REZ-1-047'].energy,3);
 assert.equal(pack.cards['REZ-1-047'].bp,3000);
 assert.equal(pack.cards['REZ-1-047'].ap,1);
 assert.equal(pack.cards['REZ-1-047'].effects.onPlay,undefined);
 assert.deepEqual(pack.cards['REZ-1-047'].mainAbility,{
  op:'handPayRevealDeploy',payAp:1,minReferencedBp:4000});
 assert.equal(pack.cards['REZ-1-093'].trigger,'raid');
 assert.equal(pack.cards['REZ-1-093'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-093'].color,'purple');
 assert.equal(pack.cards['REZ-1-093'].energy,4);
 assert.equal(pack.cards['REZ-1-093'].raidName,'エキドナ');
 assert.deepEqual(pack.cards['REZ-1-093'].effects.onPlay,[{op:'draw',count:1}]);
 assert.equal(pack.cards['REZ-1-040'].trigger,'raid');
 assert.equal(pack.cards['REZ-1-040'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-040'].color,'blue');
 assert.equal(pack.cards['REZ-1-040'].energy,4);
 assert.equal(pack.cards['REZ-1-040'].raidName,'ナツキ・スバル');
 assert.equal(pack.cards['REZ-1-068'].raidName,null);
 assert.deepEqual(pack.cards['REZ-1-040'].effects.onPlay,[{op:'draw',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-040'].effects.onRetire,[{op:'deployOwnRaidBaseRest',optional:true}]);
 assert.equal(pack.cards['REZ-1-033'].trigger,'special');
 assert.equal(pack.cards['REZ-1-033'].color,'yellow');
 assert.equal(pack.cards['REZ-1-033'].energy,4);
 assert.deepEqual(pack.cards['REZ-1-033'].triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(pack.cards['REZ-1-033'].effects.onPlay,[
  {op:'restOrRetireFrontAtMost',bp:5000,retireIfName:'エミリア'},
  {op:'peekTopOneIfFieldNames',names:['エミリア','パック']}]);
 assert.deepEqual(pack.cards['REZ-1-093'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'restOwnActiveFrontDraw'}]});
 assert.equal(pack.cards['REZ-1-091'].raidName,null);
 assert.equal(pack.cards['REZ-1-067'].enterAlwaysActive,true);
 assert.equal(pack.cards['REZ-1-067'].impactNull,true);
 assert.equal(pack.cards['REZ-1-067'].trigger,'active');
 assert.equal(pack.cards['REZ-1-067'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-067'].effects.onPlay,[{
  op:'enemyBpDown',bp:2500,optional:true,zone:'front'}]);
 assert.deepEqual(pack.cards['REZ-1-067'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[{op:'activeSelf'}]});
 assert.deepEqual(pack.cards['REZ-1-113'].effects.onPlay,[{
  op:'payHandOrRestForNamed',name:REZERO_BY_ID['REZ-1-098'].nameJa}]);
 assert.equal(pack.cards['REZ-1-113'].color,'purple');
 assert.equal(pack.cards['REZ-1-113'].trigger,'draw');
 assert.equal(pack.cards['REZ-1-076'].impactNull,true);
 assert.equal(pack.cards['REZ-1-076'].trigger,'color');
 assert.deepEqual(pack.cards['REZ-1-076'].triggerEffect,{
  op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true});
 assert.deepEqual(pack.cards['REZ-1-076'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'handTopBuffSelf',bp:1000}]});
 assert.equal(pack.cards['REZ-1-076'].effects.onPlay,undefined);
 assert.equal(pack.cards['REZ-1-098'].type,'event');
 assert.equal(pack.cards['REZ-1-098'].trigger,'color');
 assert.deepEqual(pack.cards['REZ-1-098'].triggerEffect,pack.cards['REZ-1-076'].triggerEffect);
 assert.deepEqual(pack.cards['REZ-1-098'].effects.onPlay,[
  {op:'drawDiscard',count:2,discardCount:1},{op:'optionalRestFrontRecoverAp'}]);
 assert.equal(pack.cards['REZ-1-094'].type,'field');
 assert.equal(pack.cards['REZ-1-094'].trigger,'get');
 assert.equal(pack.cards['REZ-1-094'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-094'].effects.onPlay,[{op:'optionalDiscardActiveSelf'}]);
 assert.deepEqual(pack.cards['REZ-1-094'].mainAbility,{
  op:'restSelfThen',frontOnly:false,oncePerTurn:true,then:[{op:'drawHandTop'}]});
 assert.equal(pack.cards['REZ-1-088'].trigger,'active');
 assert.equal(pack.cards['REZ-1-088'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-088'].effects.onPlay,undefined);
 assert.deepEqual(pack.cards['REZ-1-088'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
  then:[{op:'activeSelf'},{op:'buffSelfUntilNextOwnStart',bp:1000}]});
 assert.equal(pack.cards['REZ-1-101'],undefined);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const s=fresh();
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('step, draw-discard, bounce, active energy, hand discount and two AP recovery resolve',()=>{
 let s=fresh(4002);
 const stepCard=pull(s,0,'REZ-1-008');
 s.players[0].front[0]=stepCard;
 s=reach(s,'move');
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===stepCard.uid);
 assert.ok(step);
 s=dispatchUniversalAction(packs,s,step);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===stepCard.uid),true);

 s=fresh(4003);
 s=reach(s,'main');
 const emilia=pull(s,0,'REZ-1-023');
 s.players[0].hand.push(emilia);
 const before=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-discard');
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,discard);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(s.players[0].hand.some(c=>c.uid===emilia.uid),false);

 s=fresh(4004);
 const payer=pull(s,0,'REZ-1-024');
 payer.ready=false;
 s.players[0].energy[0]=payer;
 const low=pull(s,0,'REZ-1-013'),heavy=pull(s,0,'REZ-1-003');
 s.players[0].front[0]=low;
 s.players[0].front[1]=heavy;
 s=reach(s,'main');
 const bouncer=pull(s,0,'REZ-1-024');
 s.players[0].hand.push(bouncer);
 const bounce=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===bouncer.uid);
 assert.ok(bounce);
 s=dispatchUniversalAction(packs,s,bounce);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front[0],null);

 s=fresh(4005);
 const solo=pull(s,0,'REZ-1-003');
 solo.ready=false;
 s.players[0].energy[0]=solo;
 const wall=pull(s,0,'REZ-1-003');
 s.players[0].front[0]=wall;
 s=reach(s,'main');
 const self=pull(s,0,'REZ-1-024');
 s.players[0].hand.push(self);
 const selfPlay=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid);
 s=dispatchUniversalAction(packs,s,selfPlay);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===self.uid),true);

 s=fresh(4006);
 const rem=pull(s,0,'REZ-1-016'),ram=pull(s,0,'REZ-1-007');
 rem.ready=true;ram.ready=false;
 s.players[0].energy[0]=rem;
 s.players[0].energy[1]=ram;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);
 rem.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,1);

 s=fresh(4007);
 const blue=pull(s,1,'REZ-1-043');
 s.players[1].energy[0]=blue;
 const frederica=pack.cards['REZ-1-003'];
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,frederica),2);
 s.players[1].energy[0]=null;
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,frederica),3);

 s=fresh(4008);
 const yellowA=pull(s,0,'REZ-1-024'),yellowB=pull(s,0,'REZ-1-007');
 yellowA.ready=false;yellowB.ready=false;
 s.players[0].energy[0]=yellowA;
 s.players[0].energy[1]=yellowB;
 const felisA=pull(s,0,'REZ-1-043'),felisB=pull(s,0,'REZ-1-043');
 felisA.ready=true;felisB.ready=true;
 s.players[0].energy[2]=felisA;
 s.players[0].energy[3]=felisB;
 s=reach(s,'main');
 const crusch=pull(s,0,'REZ-1-056');
 s.players[0].hand.push(crusch);
 const draw=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===crusch.uid);
 assert.ok(draw,'blue energy from two active Felix cards pays Crusch');
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,draw);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);

 s=fresh(4009);
 const genA=pull(s,0,'REZ-1-024'),genB=pull(s,0,'REZ-1-007');
 genA.ready=false;genB.ready=false;
 s.players[0].energy[0]=genA;
 s.players[0].energy[1]=genB;
 s=reach(s,'main');
 const event=pull(s,0,'REZ-1-029');
 s.players[0].hand.push(event);
 const cast=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(cast);
 s=dispatchUniversalAction(packs,s,cast);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 assert.ok(rested);
 s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(s.pending,null);
});

const batchCounts={
 ...Object.fromEntries(['REZ-1-006','REZ-1-028','REZ-1-037','REZ-1-068','REZ-1-082',
  'REZ-1-102','REZ-1-105','REZ-1-110','REZ-1-007','REZ-1-024','REZ-1-012'].map(id=>[id,4])),
 'REZ-1-029':2,'REZ-1-008':2,'REZ-1-013':2
};
const batch=seed=>newUniversalMatch(packs,{decks:[batchCounts,batchCounts],first:0,seed});
test('empty-field Step, rest energy, Felt, events and front Subaru resolve',()=>{
 assert.deepEqual(validateUniversalDeck(pack,batchCounts),[]);
 let s=batch(4101);
 const felt=pull(s,0,'REZ-1-028');
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028']),0);
 s.players[0].energy[0]=felt;
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028']),2);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=felt;
 felt.ready=true;
 s=reach(s,'move');
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===felt.uid);
 assert.ok(step);
 s=dispatchUniversalAction(packs,s,step);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===felt.uid),true);

 for(const id of ['REZ-1-006','REZ-1-037','REZ-1-082']){
  s=batch(4102);
  const battery=pull(s,0,id);
  battery.ready=true;
  s.players[0].energy[0]=battery;
  s=reach(s,'main');
  const color=pack.cards[id].color;
  assert.equal(universalEnergyByColor(packs,s,0)[color]||0,0);
  const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===battery.uid&&a.mode==='selfRestEnergyRetire');
  assert.ok(act,id);
  s=dispatchUniversalAction(packs,s,act);
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(universalEnergyByColor(packs,s,0)[color],1);
  s.players[0].energy[0].ready=true;
  assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===battery.uid&&a.type==='activate'),false);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.players[0].energy[0],null);
  assert.equal(s.players[0].outside.some(c=>c.uid===battery.uid),true);
  assert.equal(universalEnergyByColor(packs,s,0)[color]||0,0);
 }

 s=batch(4103);
 const frontRam=pull(s,0,'REZ-1-006');
 frontRam.ready=true;
 s.players[0].front[0]=frontRam;
 s=reach(s,'main');
 const frontAct=legalUniversalActions(packs,s).find(a=>a.uid===frontRam.uid&&a.mode==='selfRestEnergyRetire');
 assert.ok(frontAct);
 s=dispatchUniversalAction(packs,s,frontAct);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(universalEnergyByColor(packs,s,0).yellow||0,0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===frontRam.uid),true);

 s=batch(4104);
 const reinhard=pull(s,0,'REZ-1-102');
 s.players[0].front[0]=reinhard;
 assert.equal(universalBp(packs,s,reinhard),3000);
 const named=pull(s,0,'REZ-1-028');
 s.players[0].energy[0]=named;
 assert.equal(universalBp(packs,s,reinhard),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,reinhard),3000);
 s.active=0;
 s.players[0].energy[0]=pull(s,0,'REZ-1-007');
 assert.equal(universalBp(packs,s,reinhard),3000);

 s=batch(4105);
 const emilia=pull(s,0,'REZ-1-105');
 s.players[0].front[0]=emilia;
 const payA=pull(s,0,'REZ-1-024'),payB=pull(s,0,'REZ-1-007');
 payA.ready=false;payB.ready=false;
 s.players[0].energy[0]=payA;
 s.players[0].energy[1]=payB;
 assert.equal(universalBp(packs,s,emilia),3000);
 s=reach(s,'main');
 const event=pull(s,0,'REZ-1-029');
 s.players[0].hand.push(event);
 const cast=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(cast);
 s=dispatchUniversalAction(packs,s,cast);
 if(s.pending?.kind==='effect-recover-ap')
  s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:null});
 assert.equal(s.pending,null);
 const live=s.players[0].front.find(c=>c?.uid===emilia.uid);
 assert.equal(universalBp(packs,s,live),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,live),3000);

 s=batch(4106);
 const rem=pull(s,0,'REZ-1-110');
 rem.ready=false;
 s.players[0].energy[0]=rem;
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 const subaru=pull(s,0,'REZ-1-068');
 s.players[0].front[0]=subaru;
 assert.equal(universalEnergyByColor(packs,s,0).blue,1);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=subaru;
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
});

const thirdCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086'].map(id=>[id,4])),
 ...Object.fromEntries(['REZ-1-005','REZ-1-009','REZ-1-025','REZ-1-083'].map(id=>[id,2])),
 ...Object.fromEntries(['REZ-1-018','REZ-1-049','REZ-1-050','REZ-1-057','REZ-1-069','REZ-1-111'].map(id=>[id,1]))
};
const third=seed=>newUniversalMatch(packs,{decks:[thirdCounts,thirdCounts],first:0,seed});
function fuel(s,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,0,id);
  card.ready=true;
  s.players[0].energy[i]=card;
 });
}
function playHand(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid);
 assert.ok(action,id);
 return [dispatchUniversalAction(packs,s,action),card];
}
function setTop(s,p,ids){
 const pl=s.players[p];
 const cards=ids.map(id=>{
  let index=pl.deck.findIndex(c=>c.cardId===id);
  if(index<0){
   for(const zone of ['hand','life','outside']){
    const atZone=pl[zone].findIndex(c=>c.cardId===id);
    if(atZone<0)continue;
    const swap=pl.deck.findIndex(c=>!ids.includes(c.cardId));
    const moved=pl[zone][atZone];
    pl[zone][atZone]=pl.deck[swap];
    pl.deck[swap]=moved;
    index=swap;
    break;
   }
  }
  if(index<0)throw Error('deck missing '+id);
  return pl.deck.splice(index,1)[0];
 });
 pl.deck.unshift(...cards);
 return cards;
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}

test('buffs, top windows, name search and the Crusch alias resolve',()=>{
 assert.deepEqual(validateUniversalDeck(pack,thirdCounts),[]);
 let s=third(4201);
 const ally=pull(s,0,'REZ-1-007');
 s.players[0].front[0]=ally;
 s=reach(s,'main');
 let [buffed,petra]=playHand(s,'REZ-1-005');
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.ok(buffed.pending.choices.includes(ally.uid));
 assert.equal(buffed.pending.choices.includes(petra.uid),false);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,buffed,at(buffed,0,ally.uid)),3000);
 let skipped=third(4202);
 const other=pull(skipped,0,'REZ-1-007');
 skipped.players[0].front[0]=other;
 skipped=reach(skipped,'main');
 [skipped]=playHand(skipped,'REZ-1-005');
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,at(skipped,0,other.uid)),2000);
 let alone=third(4203);
 alone=reach(alone,'main');
 [alone,petra]=playHand(alone,'REZ-1-005');
 assert.equal(alone.pending,null);
 assert.equal(universalBp(packs,alone,at(alone,0,petra.uid)),500);

 s=third(4204);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-012']);
 const low=pull(s,1,'REZ-1-007'),high=pull(s,1,'REZ-1-014');
 s.players[1].front[0]=low;
 s.players[1].front[1]=high;
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-018');
 assert.equal(s.pending.kind,'effect-target');
 assert.deepEqual(s.pending.choices,[high.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(packs,s,at(s,1,high.uid)),500);
 assert.equal(universalBp(packs,s,at(s,1,low.uid)),2000);
 let passed=third(4205);
 fuel(passed,['REZ-1-007','REZ-1-008','REZ-1-012']);
 const wall=pull(passed,1,'REZ-1-014');
 passed.players[1].front[0]=wall;
 passed=reach(passed,'main');
 [passed]=playHand(passed,'REZ-1-018');
 passed=dispatchUniversalAction(packs,passed,{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,passed,at(passed,1,wall.uid)),2500);

 s=third(4206);
 fuel(s,['REZ-1-007']);
 const window=setTop(s,0,['REZ-1-022','REZ-1-043','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-025');
 assert.equal(s.pending.kind,'effect-top-inspect');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:window[0].uid});
 s=order(s,[window[2].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 let kept=third(4207);
 fuel(kept,['REZ-1-007']);
 const all=setTop(kept,0,['REZ-1-022','REZ-1-068','REZ-1-072']);
 kept=reach(kept,'main');
 [kept]=playHand(kept,'REZ-1-025');
 kept=dispatchUniversalAction(packs,kept,{type:'chooseInspectedOutside',uid:null});
 kept=order(kept,[all[1].uid,all[0].uid,all[2].uid]);
 assert.equal(kept.players[0].outside.some(c=>all.some(card=>card.uid===c.uid)),false);
 assert.deepEqual(kept.players[0].deck.slice(0,3).map(c=>c.uid),[all[1].uid,all[0].uid,all[2].uid]);

 s=third(4208);
 s=reach(s,'main');
 const pair=setTop(s,0,['REZ-1-022','REZ-1-068']);
 [s]=playHand(s,'REZ-1-083');
 assert.equal(s.pending.kind,'effect-top-inspect');
 assert.equal(s.pending.uids.length,2);
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:pair[1].uid});
 s=order(s,[pair[0].uid]);
 assert.equal(s.players[0].deck[0].uid,pair[0].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===pair[1].uid),true);

 s=third(4209);
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const seen=setTop(s,0,['REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-050');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:seen[0].uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 s=order(s,[seen[1].uid]);
 assert.equal(s.players[0].outside.some(c=>c.uid===seen[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,seen[1].uid);
 let both=third(4210);
 fuel(both,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const gone=setTop(both,0,['REZ-1-022','REZ-1-072']);
 both=reach(both,'main');
 [both]=playHand(both,'REZ-1-050');
 both=dispatchUniversalAction(packs,both,{type:'chooseInspectedOutside',uid:gone[0].uid});
 both=dispatchUniversalAction(packs,both,{type:'chooseInspectedOutside',uid:gone[1].uid});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].outside.filter(c=>gone.some(card=>card.uid===c.uid)).length,2);

 s=third(4211);
 fuel(s,['REZ-1-043']);
 const alias=pack.cards['REZ-1-111'];
 assert.equal(cardHasName(alias,'クルシュ・カルステン'),true);
 assert.equal(cardHasName(alias,'フェリス'),true);
 assert.equal(cardHasName(alias,'ラム'),false);
 const top=setTop(s,0,['REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 let crusch;
 [s,crusch]=playHand(s,'REZ-1-111');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 s=order(s,[top[1].uid,top[0].uid]);
 assert.equal(at(s,0,crusch.uid).cardId,'REZ-1-111');
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[top[1].uid,top[0].uid]);

 s=third(4212);
 fuel(s,['REZ-1-014']);
 const names=setTop(s,0,['REZ-1-007','REZ-1-022','REZ-1-043']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-009');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[names[0].uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=order(s,[names[2].uid,names[1].uid,names[0].uid]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===names[0].uid),false);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[names[2].uid,names[1].uid,names[0].uid]);
 let added=third(4213);
 fuel(added,['REZ-1-014']);
 const found=setTop(added,0,['REZ-1-022','REZ-1-007','REZ-1-043']);
 added=reach(added,'main');
 [added]=playHand(added,'REZ-1-009');
 added=dispatchUniversalAction(packs,added,{type:'chooseTopFiltered',uid:found[1].uid});
 added=order(added,[found[0].uid,found[2].uid]);
 assert.equal(added.pending.kind,'effect-discard');
 assert.equal(added.publicReveals.at(-1).cardId,'REZ-1-007');
 const dumped=added.players[0].hand.find(c=>c.uid!==found[1].uid);
 added=dispatchUniversalAction(packs,added,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(added.players[0].hand.some(c=>c.uid===found[1].uid),true);
 assert.equal(added.players[0].outside.some(c=>c.uid===dumped.uid),true);

 s=third(4214);
 fuel(s,['REZ-1-043']);
 const rem=setTop(s,0,['REZ-1-068','REZ-1-022','REZ-1-012']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-049');
 assert.deepEqual(s.pending.choices.slice().sort(),[rem[0].uid,rem[2].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:rem[2].uid});
 s=order(s,[rem[1].uid,rem[0].uid]);
 assert.equal(s.pending.kind,'effect-discard');

 s=third(4215);
 fuel(s,['REZ-1-086']);
 const library=setTop(s,0,['REZ-1-072','REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-069');
 assert.deepEqual(s.pending.choices.slice().sort(),[library[0].uid,library[2].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=order(s,[library[1].uid,library[0].uid,library[2].uid]);
 assert.equal(s.pending,null);

 s=third(4216);
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const aliasWindow=setTop(s,0,['REZ-1-111','REZ-1-043','REZ-1-022','REZ-1-007']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-057');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices.slice().sort(),[aliasWindow[0].uid,aliasWindow[1].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:aliasWindow[0].uid});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-111');
 s=order(s,[aliasWindow[3].uid,aliasWindow[2].uid,aliasWindow[1].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.some(c=>c.uid===aliasWindow[0].uid),true);
});

const gateCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-010','REZ-1-075'].map(id=>[id,4])),
 'REZ-1-026':1,'REZ-1-029':1
};
const gate=seed=>newUniversalMatch(packs,{decks:[gateCounts,gateCounts],first:0,seed});
test('name union, event-used draw and own-effect entry draw resolve',()=>{
 assert.equal(Object.values(gateCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,gateCounts),[]);
 let s=gate(4301);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 const rem=pull(s,0,'REZ-1-012');
 s.players[0].front[0]=rem;
 s=reach(s,'main');
 const deck=s.players[0].deck.length;
 [s]=playHand(s,'REZ-1-010');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-2);
 let quiet=gate(4302);
 fuel(quiet,['REZ-1-007','REZ-1-008','REZ-1-022']);
 quiet.players[0].front[0]=pull(quiet,0,'REZ-1-036');
 quiet=reach(quiet,'main');
 const quietDeck=quiet.players[0].deck.length;
 [quiet]=playHand(quiet,'REZ-1-010');
 assert.equal(quiet.players[0].deck.length,quietDeck-1);

 s=gate(4303);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 s=reach(s,'main');
 const beforeEvent=s.players[0].deck.length;
 [s]=playHand(s,'REZ-1-026');
 assert.equal(s.players[0].deck.length,beforeEvent-1);
 let used=gate(4304);
 fuel(used,['REZ-1-007','REZ-1-008','REZ-1-022']);
 used=reach(used,'main');
 const event=pull(used,0,'REZ-1-029');
 used.players[0].hand.push(event);
 used=dispatchUniversalAction(packs,used,legalUniversalActions(packs,used).find(a=>a.type==='event'&&a.uid===event.uid));
 if(used.pending?.kind==='effect-recover-ap'){
  const rested=used.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:rested.uid});
 }
 const afterEvent=used.players[0].deck.length;
 [used]=playHand(used,'REZ-1-026');
 assert.equal(used.pending,null);
 assert.equal(used.players[0].deck.length,afterEvent-2);

 s=gate(4305);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 const paidDeck=s.players[0].deck.length;
 let beatrice;
 [s,beatrice]=playHand(s,'REZ-1-075');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,paidDeck-1);
 assert.equal(at(s,0,beatrice.uid).ready,false);

 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-entry-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-010']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-075']),
  lab('LAB-YEL','yellow'),lab('LAB-PUR','purple'),
  {id:'LAB-ROS',name:'ロズワール・L・メイザース',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-DEPLOY-BEA',name:'Deploy Beatrice',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'ベアトリス',color:'purple',energy:4,ap:1,optional:true}]}},
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G'].map(id=>lab(id,'yellow'))
 ]});
 const fixtureCounts={
  'REZ-1-010':4,'REZ-1-075':4,'LAB-YEL':4,'LAB-PUR':4,'LAB-ROS':4,'LAB-DEPLOY-BEA':4,
  'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':4,'LAB-G':2
 };
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let own=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4306});
 const outside=pull(own,0,'REZ-1-075');
 own.players[0].outside.push(outside);
 own=dispatchUniversalAction(fp,own,{type:'next'});
 own=dispatchUniversalAction(fp,own,{type:'next'});
 assert.equal(own.phase,'main');
 const caster=pull(own,0,'LAB-DEPLOY-BEA');
 own.players[0].hand.push(caster);
 const ownDeck=own.players[0].deck.length;
 own=dispatchUniversalAction(fp,own,{type:'event',uid:caster.uid});
 assert.equal(own.pending.kind,'effect-outside-rest');
 own=dispatchUniversalAction(fp,own,{type:'chooseOutsideRest',uid:outside.uid,line:'energy',slot:0});
 assert.equal(own.players[0].energy.some(c=>c?.uid===outside.uid),true);
 assert.equal(own.players[0].deck.length,ownDeck-1);

 let named=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4307});
 const yellows=['LAB-YEL','LAB-YEL','LAB-A'].map(id=>pull(named,0,id));
 yellows.forEach((card,i)=>{card.ready=true;named.players[0].energy[i]=card;});
 const roswaal=pull(named,0,'LAB-ROS');
 named.players[0].front[0]=roswaal;
 named=dispatchUniversalAction(fp,named,{type:'next'});
 named=dispatchUniversalAction(fp,named,{type:'next'});
 assert.equal(named.phase,'main');
 const namedDeck=named.players[0].deck.length;
 const ram=pull(named,0,'REZ-1-010');
 named.players[0].hand.push(ram);
 const play=legalUniversalActions(fp,named).find(a=>a.type==='play'&&a.uid===ram.uid);
 assert.ok(play);
 named=dispatchUniversalAction(fp,named,play);
 assert.equal(named.players[0].deck.length,namedDeck-2);
});

const apCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-010'].map(id=>[id,4])),
 'REZ-1-004':4,'REZ-1-029':2
};
const apDeck=seed=>newUniversalMatch(packs,{decks:[apCounts,apCounts],first:0,seed});
function ownMain(s,turn){
 let guard=0;
 while(!(s.active===0&&s.players[0].ownTurns>=turn&&s.phase==='main'&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
  }else{
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=dispatchUniversalAction(packs,s,next);
  }
  assert.ok(++guard<48,'turn did not reach main');
 }
 return s;
}
test('draw plus event-gated AP recovery resolves only after an event',()=>{
 assert.equal(Object.values(apCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,apCounts),[]);
 const shell={id:'AP-GATE',name:'Gate',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...shell,effects:{onPlay:[
  {op:'recoverAp',count:2,require:'ownEventUsed'}]}}]}),/invalid AP recovery/);
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'recoverAp',count:1,require:'ownEventUsed'}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-top',cards:[{...shell,effects:{onPlay:[
  {op:'searchTopOneBottomDiscard',count:8,filter:{field:'name',value:'x'}}]}}]}),/invalid top-N/);

 let quiet=apDeck(4401);
 fuel(quiet,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014']);
 quiet=ownMain(quiet,3);
 assert.equal(quiet.players[0].apCards.filter(c=>c.ready).length,3);
 const before=quiet.players[0].deck.length;
 let beatrice;
 [quiet,beatrice]=playHand(quiet,'REZ-1-004');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,before-2);
 assert.equal(at(quiet,0,beatrice.uid).ready,false);

 let used=apDeck(4402);
 fuel(used,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014']);
 used=ownMain(used,3);
 const event=pull(used,0,'REZ-1-029');
 used.players[0].hand.push(event);
 used=dispatchUniversalAction(packs,used,legalUniversalActions(packs,used).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(used.pending.kind,'effect-recover-ap');
 assert.equal(used.pending.remaining,2);
 used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:null});
 assert.equal(used.players[0].apCards.filter(c=>c.ready).length,2);
 const drawn=used.players[0].deck.length;
 [used]=playHand(used,'REZ-1-004');
 assert.equal(used.pending.kind,'effect-recover-ap');
 assert.equal(used.pending.remaining,1);
 assert.equal(used.players[0].deck.length,drawn-2);
 const rested=used.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
});

const sevenCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086'].map(id=>[id,4])),
 'REZ-1-091':4,'REZ-1-010':4,'REZ-1-075':2
};
const seven=seed=>newUniversalMatch(packs,{decks:[sevenCounts,sevenCounts],first:0,seed});
test('top seven name search orders a miss and takes the printed trial name',()=>{
 assert.equal(Object.values(sevenCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,sevenCounts),[]);
 let s=seven(4411);
 const missed=setTop(s,0,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072']);
 s=reach(s,'main');
 const top=s.players[0].deck.slice(0,7).map(c=>c.uid);
 [s]=playHand(s,'REZ-1-091');
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,top);
 assert.deepEqual(missed.map(c=>c.uid),top);
 s=order(s,top);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-7).map(c=>c.uid),top);

 const trialName=REZERO_BY_ID['REZ-1-098'].nameJa;
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I','LAB-J','LAB-K'];
 const fixture=createUniversalPack({id:'rezero-trial-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-091']),
  {id:'LAB-TRIAL',name:trialName,color:'purple',type:'event',energy:2,ap:1,bp:0,gen:0,
   traits:[],trigger:'draw',implementation:'vanilla',effects:{}},
  ...labs.map(id=>lab(id,'purple'))
 ]});
 const fixtureCounts={'REZ-1-091':4,'LAB-TRIAL':4,
  ...Object.fromEntries(labs.slice(0,10).map(id=>[id,4])),'LAB-K':2};
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let hit=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4412});
 const found=setTop(hit,0,['LAB-TRIAL','LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F']);
 hit=dispatchUniversalAction(fp,hit,{type:'next'});
 hit=dispatchUniversalAction(fp,hit,{type:'next'});
 assert.equal(hit.phase,'main');
 const echidna=pull(hit,0,'REZ-1-091');
 hit.players[0].hand.push(echidna);
 const play=legalUniversalActions(fp,hit).find(a=>a.type==='play'&&a.uid===echidna.uid);
 assert.ok(play);
 hit=dispatchUniversalAction(fp,hit,play);
 assert.equal(hit.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(hit.pending.choices,[found[0].uid]);
 hit=dispatchUniversalAction(fp,hit,{type:'chooseTopFiltered',uid:found[0].uid});
 assert.equal(hit.publicReveals.at(-1).cardId,'LAB-TRIAL');
 for(const card of found.slice(1)){
  assert.equal(hit.pending.kind,'effect-top-order');
  hit=dispatchUniversalAction(fp,hit,{type:'chooseTopOrder',uid:card.uid});
 }
 assert.equal(hit.pending.kind,'effect-discard');
 const dumped=hit.players[0].hand.find(c=>c.uid!==found[0].uid);
 hit=dispatchUniversalAction(fp,hit,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(hit.players[0].hand.some(c=>c.uid===found[0].uid),true);
 assert.equal(hit.players[0].outside.some(c=>c.uid===dumped.uid),true);
});

const pairCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-021'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-075':2
};
const pair=seed=>newUniversalMatch(packs,{decks:[pairCounts,pairCounts],first:0,seed});
function frontOnce(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='frontOnce'&&a.uid===uid);
}
function playFront(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(action,id+' front');
 return [dispatchUniversalAction(packs,s,action),card];
}
test('Roswaal draws and discards only while Ram and Rem are both on the field',()=>{
 assert.equal(Object.values(pairCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,pairCounts),[]);
 let onlyRem=pair(4501);
 fuel(onlyRem,['REZ-1-014','REZ-1-022','REZ-1-022','REZ-1-036']);
 onlyRem=reach(onlyRem,'main');
 let roswaal;
 [onlyRem,roswaal]=playFront(onlyRem,'REZ-1-021');
 assert.equal(at(onlyRem,0,roswaal.uid)&&onlyRem.players[0].front.some(c=>c?.uid===roswaal.uid),true);
 assert.equal(frontOnce(onlyRem,roswaal.uid),false);
 const ram=pull(onlyRem,0,'REZ-1-007');
 onlyRem.players[0].front[1]=ram;
 assert.equal(frontOnce(onlyRem,roswaal.uid),true);

 let onlyRam=pair(4502);
 fuel(onlyRam,['REZ-1-007','REZ-1-008','REZ-1-022','REZ-1-022']);
 onlyRam=reach(onlyRam,'main');
 [onlyRam,roswaal]=playFront(onlyRam,'REZ-1-021');
 assert.equal(frontOnce(onlyRam,roswaal.uid),false);

 let both=pair(4503);
 fuel(both,['REZ-1-014','REZ-1-007','REZ-1-022','REZ-1-008']);
 both=reach(both,'main');
 const deck=both.players[0].deck.length;
 [both,roswaal]=playFront(both,'REZ-1-021');
 assert.equal(frontOnce(both,roswaal.uid),true);
 both=dispatchUniversalAction(packs,both,{type:'activate',uid:roswaal.uid,mode:'frontOnce'});
 assert.equal(both.pending.kind,'effect-discard');
 assert.equal(both.players[0].deck.length,deck-2);
 const dumped=both.players[0].hand[0];
 both=dispatchUniversalAction(packs,both,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(frontOnce(both,roswaal.uid),false);

 let foe=pair(4504);
 fuel(foe,['REZ-1-014','REZ-1-022','REZ-1-022','REZ-1-036']);
 foe.players[1].front[0]=pull(foe,1,'REZ-1-007');
 foe=reach(foe,'main');
 [foe,roswaal]=playFront(foe,'REZ-1-021');
 assert.equal(frontOnce(foe,roswaal.uid),false);
});

const manorCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-108'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-075':2
};
const manor=seed=>newUniversalMatch(packs,{decks:[manorCounts,manorCounts],first:0,seed});
function playEnergy(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 assert.ok(action,id+' energy');
 return [dispatchUniversalAction(packs,s,action),card];
}
test('Roswaal mansion rests once and places the top card on top or bottom',()=>{
 assert.equal(Object.values(manorCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,manorCounts),[]);
 let s=manor(4601);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 s=reach(s,'main');
 let house;
 [s,house]=playEnergy(s,'REZ-1-108');
 assert.equal(s.players[0].energy.some(c=>c?.uid===house.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===house.uid),false);
 assert.equal(at(s,0,house.uid).ready,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);
 s=ownMain(s,2);
 assert.equal(at(s,0,house.uid).ready,true);
 const seen=s.players[0].deck[0].uid;
 const next=s.players[0].deck[1].uid;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===house.uid&&a.mode==='selfRestThen');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(at(s,0,house.uid).ready,false);
 assert.equal(s.pending.kind,'private-top-place');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,seen);
 assert.equal(s.players[0].deck[1].uid,next);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);
 at(s,0,house.uid).ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);

 let bottom=manor(4602);
 fuel(bottom,['REZ-1-007','REZ-1-008','REZ-1-022']);
 bottom=reach(bottom,'main');
 [bottom,house]=playEnergy(bottom,'REZ-1-108');
 bottom=ownMain(bottom,2);
 const first=bottom.players[0].deck[0].uid;
 bottom=dispatchUniversalAction(packs,bottom,{type:'activate',uid:house.uid,mode:'selfRestThen'});
 assert.equal(bottom.pending.kind,'private-top-place');
 const before=bottom.players[0].deck.map(c=>c.uid);
 bottom=dispatchUniversalAction(packs,bottom,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(bottom.pending,null);
 assert.equal(bottom.players[0].deck.at(-1).uid,first);
 assert.deepEqual(bottom.players[0].deck.map(c=>c.uid),[...before.slice(1),before[0]]);

 let empty=manor(4603);
 fuel(empty,['REZ-1-007','REZ-1-008','REZ-1-022']);
 empty=reach(empty,'main');
 [empty,house]=playEnergy(empty,'REZ-1-108');
 empty=ownMain(empty,2);
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty=dispatchUniversalAction(packs,empty,{type:'activate',uid:house.uid,mode:'selfRestThen'});
 assert.equal(empty.pending,null);
 assert.equal(at(empty,0,house.uid).ready,false);
});

const eitherCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-037','REZ-1-068','REZ-1-086','REZ-1-042'].map(id=>[id,4])),
 'REZ-1-041':4,'REZ-1-010':2
};
const either=seed=>newUniversalMatch(packs,{decks:[eitherCounts,eitherCounts],first:0,seed});
test('Felix buffs one other character on either field and Patrasche needs a blue zero-cost Subaru',()=>{
 assert.equal(Object.values(eitherCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,eitherCounts),[]);
 const shell={id:'EITHER',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-either',cards:[{...shell,effects:{onPlay:[
  {op:'buffEitherOther',bp:1000}]}}]}),/invalid either-field/);
 assert.throws(()=>createUniversalPack({id:'bad-either',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'buffEitherOther',bp:1000,optional:true}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-print',cards:[{...shell,passiveBonuses:[{
  condition:{kind:'ownPrintedCharacter',turn:'own',zone:'front',excludeSelf:false,
   name:'ナツキ・スバル',color:'blue'},bp:1000}]}]}),/invalid or cyclic passive condition/);

 let alone=either(4701);
 alone=reach(alone,'main');
 let felix;
 [alone,felix]=playHand(alone,'REZ-1-042');
 assert.equal(alone.pending,null);
 assert.equal(universalBp(packs,alone,at(alone,0,felix.uid)),500);

 let sided=either(4702);
 const ally=pull(sided,0,'REZ-1-007');
 const energyAlly=pull(sided,0,'REZ-1-008');
 const enemy=pull(sided,1,'REZ-1-014');
 const enemyEnergy=pull(sided,1,'REZ-1-012');
 sided.players[0].front[0]=ally;
 sided.players[0].energy[0]=energyAlly;
 sided.players[1].front[0]=enemy;
 sided.players[1].energy[0]=enemyEnergy;
 sided=reach(sided,'main');
 [sided,felix]=playHand(sided,'REZ-1-042');
 assert.equal(sided.pending.kind,'effect-buff-either');
 assert.equal(sided.pending.optional,true);
 assert.equal(sided.pending.bp,1000);
 for(const uid of [ally.uid,energyAlly.uid,enemy.uid,enemyEnergy.uid])
  assert.ok(sided.pending.choices.includes(uid),uid);
 assert.equal(sided.pending.choices.includes(felix.uid),false);
 assert.equal(sided.players[0].energy.some(c=>c?.uid===energyAlly.uid),true);
 const allyBp=universalBp(packs,sided,at(sided,0,ally.uid));
 const energyBp=universalBp(packs,sided,at(sided,0,energyAlly.uid));
 const enemyBp=universalBp(packs,sided,at(sided,1,enemy.uid));
 const enemyEnergyBp=universalBp(packs,sided,at(sided,1,enemyEnergy.uid));
 sided=dispatchUniversalAction(packs,sided,{type:'chooseEitherBuff',uid:energyAlly.uid});
 assert.equal(sided.pending,null);
 assert.equal(universalBp(packs,sided,at(sided,0,energyAlly.uid)),energyBp+1000);
 assert.equal(universalBp(packs,sided,at(sided,0,ally.uid)),allyBp);
 assert.equal(universalBp(packs,sided,at(sided,1,enemy.uid)),enemyBp);
 assert.equal(universalBp(packs,sided,at(sided,1,enemyEnergy.uid)),enemyEnergyBp);

 let foe=either(4703);
 const wall=pull(foe,1,'REZ-1-014');
 const friend=pull(foe,0,'REZ-1-007');
 foe.players[1].front[0]=wall;
 foe.players[0].front[0]=friend;
 foe=reach(foe,'main');
 [foe,felix]=playHand(foe,'REZ-1-042');
 const wallBp=universalBp(packs,foe,at(foe,1,wall.uid));
 const friendBp=universalBp(packs,foe,at(foe,0,friend.uid));
 foe=dispatchUniversalAction(packs,foe,{type:'chooseEitherBuff',uid:wall.uid});
 assert.equal(universalBp(packs,foe,at(foe,1,wall.uid)),wallBp+1000);
 assert.equal(universalBp(packs,foe,at(foe,0,friend.uid)),friendBp);

 let skipped=either(4704);
 const kept=pull(skipped,0,'REZ-1-007');
 const keptFoe=pull(skipped,1,'REZ-1-014');
 skipped.players[0].front[0]=kept;
 skipped.players[1].front[0]=keptFoe;
 skipped=reach(skipped,'main');
 [skipped]=playHand(skipped,'REZ-1-042');
 const keptBp=universalBp(packs,skipped,at(skipped,0,kept.uid));
 const keptFoeBp=universalBp(packs,skipped,at(skipped,1,keptFoe.uid));
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseEitherBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,at(skipped,0,kept.uid)),keptBp);
 assert.equal(universalBp(packs,skipped,at(skipped,1,keptFoe.uid)),keptFoeBp);

 let patrasche=either(4705);
 fuel(patrasche,['REZ-1-043','REZ-1-043','REZ-1-043']);
 patrasche=reach(patrasche,'main');
 let horse;
 [patrasche,horse]=playFront(patrasche,'REZ-1-041');
 assert.equal(patrasche.pending,null);
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 const handSubaru=pull(patrasche,0,'REZ-1-037');
 patrasche.players[0].hand.push(handSubaru);
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[0].hand.pop();
 patrasche.players[0].front[1]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 patrasche.players[0].front[1]=null;
 patrasche.players[0].energy[3]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[0].energy[3]=null;
 patrasche.players[1].front[0]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[1].front[0]=null;
 patrasche.players[0].front[1]=handSubaru;
 patrasche.active=1;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.active=0;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 const purple=pull(patrasche,0,'REZ-1-068');
 patrasche.players[0].front[2]=purple;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 patrasche.players[0].front[1]=null;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);

 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I','LAB-J'];
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-printed-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-041']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-043']),
  {id:'LAB-SUBARU',name:'ナツキ・スバル',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...labs.map(id=>lab(id,'blue'))
 ]});
 const fixtureCounts={'REZ-1-041':4,'REZ-1-043':4,'LAB-SUBARU':2,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let mismatch=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4706});
 ['REZ-1-043','REZ-1-043','REZ-1-043'].forEach((id,i)=>{
  const card=pull(mismatch,0,id);
  card.ready=true;
  mismatch.players[0].energy[i]=card;
 });
 mismatch=dispatchUniversalAction(fp,mismatch,{type:'next'});
 mismatch=dispatchUniversalAction(fp,mismatch,{type:'next'});
 assert.equal(mismatch.phase,'main');
 const heavy=pull(mismatch,0,'LAB-SUBARU');
 mismatch.players[0].front[0]=heavy;
 const printed=pull(mismatch,0,'REZ-1-041');
 mismatch.players[0].hand.push(printed);
 const play=legalUniversalActions(fp,mismatch).find(a=>a.type==='play'&&a.uid===printed.uid&&a.line==='front');
 assert.ok(play);
 mismatch=dispatchUniversalAction(fp,mismatch,play);
 assert.equal(universalBp(fp,mismatch,at(mismatch,0,printed.uid)),3000);
 assert.equal(mismatch.players[0].front.some(c=>c?.uid===heavy.uid),true);
});

const mimiCounts={
 ...Object.fromEntries(['REZ-1-045','REZ-1-075','REZ-1-014','REZ-1-029','REZ-1-007',
  'REZ-1-022','REZ-1-012','REZ-1-036','REZ-1-043','REZ-1-086','REZ-1-008'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-056':2
};
const mimi=seed=>newUniversalMatch(packs,{decks:[mimiCounts,mimiCounts],first:0,seed});
function revealAct(s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='revealBottomBuff'&&a.uid===uid);
}
test('Mimi reveals one hand card to the bottom and buffs only a 4000 character',()=>{
 assert.equal(Object.values(mimiCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,mimiCounts),[]);
 const shell={id:'REVEAL',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-reveal',cards:[{...shell,mainAbility:{
  op:'revealHandBottomBuff',oncePerTurn:true,bp:2500}}]}),/unsupported main/);

 let high=mimi(4801);
 high=reach(high,'main');
 let actor;
 [high,actor]=playFront(high,'REZ-1-045');
 assert.equal(at(high,0,actor.uid).ready,false);
 const big=pull(high,0,'REZ-1-075');
 high.players[0].hand.push(big);
 const before=high.players[0].deck.map(c=>c.uid);
 const act=revealAct(high,actor.uid);
 assert.ok(act);
 high=dispatchUniversalAction(packs,high,act);
 assert.equal(high.pending.kind,'effect-reveal-bottom');
 assert.ok(high.pending.choices.includes(big.uid));
 assert.equal(revealAct(high,actor.uid),undefined);
 high=dispatchUniversalAction(packs,high,{type:'chooseRevealBottom',uid:big.uid});
 assert.equal(high.pending,null);
 assert.equal(high.players[0].deck.at(-1).uid,big.uid);
 assert.deepEqual(high.players[0].deck.slice(0,-1).map(c=>c.uid),before);
 assert.equal(high.players[0].hand.some(c=>c.uid===big.uid),false);
 assert.equal(high.publicReveals.at(-1).cardId,'REZ-1-075');
 assert.equal(high.publicReveals.at(-1).kind,'hand-to-bottom');
 assert.equal(universalBp(packs,high,at(high,0,actor.uid)),4000);
 assert.equal(revealAct(high,actor.uid),undefined);
 high=ownMain(high,2);
 const again=pull(high,0,'REZ-1-075');
 high.players[0].hand.push(again);
 assert.ok(revealAct(high,actor.uid));

 let low=mimi(4802);
 low=reach(low,'main');
 [low,actor]=playFront(low,'REZ-1-045');
 const small=pull(low,0,'REZ-1-014');
 low.players[0].hand.push(small);
 low=dispatchUniversalAction(packs,low,revealAct(low,actor.uid));
 low=dispatchUniversalAction(packs,low,{type:'chooseRevealBottom',uid:small.uid});
 assert.equal(low.players[0].deck.at(-1).uid,small.uid);
 assert.equal(low.publicReveals.at(-1).cardId,'REZ-1-014');
 assert.equal(universalBp(packs,low,at(low,0,actor.uid)),1500);

 let event=mimi(4803);
 event=reach(event,'main');
 [event,actor]=playEnergy(event,'REZ-1-045');
 assert.equal(event.players[0].energy.some(c=>c?.uid===actor.uid),true);
 const spell=pull(event,0,'REZ-1-029');
 event.players[0].hand.push(spell);
 event=dispatchUniversalAction(packs,event,revealAct(event,actor.uid));
 event=dispatchUniversalAction(packs,event,{type:'chooseRevealBottom',uid:spell.uid});
 assert.equal(event.players[0].deck.at(-1).cardId,'REZ-1-029');
 assert.equal(universalBp(packs,event,at(event,0,actor.uid)),1500);

 let empty=mimi(4804);
 empty=reach(empty,'main');
 [empty,actor]=playFront(empty,'REZ-1-045');
 empty.players[0].outside.push(...empty.players[0].hand.splice(0));
 assert.equal(revealAct(empty,actor.uid),undefined);
});

const juliusCounts={
 ...Object.fromEntries(['REZ-1-046','REZ-1-037','REZ-1-038','REZ-1-039','REZ-1-068',
  'REZ-1-042','REZ-1-043','REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014'].map(id=>[id,4])),
 'REZ-1-022':2,'REZ-1-108':2,'REZ-1-036':2
};
const julius=seed=>newUniversalMatch(packs,{decks:[juliusCounts,juliusCounts],first:0,seed});
test('Julius may return one blue zero-cost Subaru, then readies and gains 1000 BP',()=>{
 assert.equal(Object.values(juliusCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,juliusCounts),[]);
 const shell={id:'RETURN',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-return',cards:[{...shell,effects:{onPlay:[
  {op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0}]}}]}),
  /invalid printed return/);
 assert.throws(()=>createUniversalPack({id:'bad-return',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0,bp:1000}]}}]}),
  /character onPlay/);

 let none=julius(4901);
 fuel(none,['REZ-1-043','REZ-1-043','REZ-1-043']);
 none=reach(none,'main');
 let actor;
 [none,actor]=playFront(none,'REZ-1-046');
 assert.equal(none.pending,null);
 assert.equal(at(none,0,actor.uid).ready,false);
 assert.equal(universalBp(packs,none,at(none,0,actor.uid)),3000);
 assert.equal(none.turnRetireEvents.length,0);

 let mixed=julius(4902);
 fuel(mixed,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const frontSubaru=pull(mixed,0,'REZ-1-037');
 const energySubaru=pull(mixed,0,'REZ-1-038');
 const purple=pull(mixed,0,'REZ-1-068');
 const felix=pull(mixed,0,'REZ-1-042');
 const buried=pull(mixed,0,'REZ-1-039');
 const handed=pull(mixed,0,'REZ-1-037');
 const foe=pull(mixed,1,'REZ-1-037');
 const house=pull(mixed,0,'REZ-1-108');
 felix.stack=[buried];
 mixed.players[0].front[0]=frontSubaru;
 mixed.players[0].front[1]=purple;
 mixed.players[0].front[2]=felix;
 mixed.players[0].energy[3]=energySubaru;
 mixed.players[0].hand.push(handed,house);
 mixed.players[1].front[0]=foe;
 mixed=reach(mixed,'main');
 [mixed,actor]=playFront(mixed,'REZ-1-046');
 const deckBefore=mixed.players[0].deck.length;
 assert.equal(mixed.pending.kind,'effect-return-printed');
 assert.equal(mixed.pending.optional,true);
 assert.equal(mixed.pending.energy,0);
 assert.equal(mixed.pending.color,'blue');
 assert.deepEqual(mixed.pending.choices.slice().sort(),[frontSubaru.uid,energySubaru.uid].sort());
 for(const uid of [purple.uid,felix.uid,buried.uid,handed.uid,foe.uid,house.uid,actor.uid])
  assert.equal(mixed.pending.choices.includes(uid),false,uid);
 assert.throws(()=>dispatchUniversalAction(packs,mixed,{type:'chooseReturnPrinted',uid:felix.uid}),
  /not currently legal/);
 at(mixed,0,actor.uid).ready=false;
 const retireBefore=mixed.turnRetireEvents.length;
 mixed=dispatchUniversalAction(packs,mixed,{type:'chooseReturnPrinted',uid:energySubaru.uid});
 assert.equal(mixed.pending,null);
 assert.equal(mixed.players[0].hand.some(c=>c.uid===energySubaru.uid),true);
 assert.equal(mixed.players[0].energy.some(c=>c?.uid===energySubaru.uid),false);
 assert.equal(mixed.players[0].outside.some(c=>c.uid===energySubaru.uid),false);
 assert.equal(mixed.players[0].front.some(c=>c?.uid===frontSubaru.uid),true);
 assert.equal(mixed.players[0].deck.length,deckBefore);
 assert.equal(mixed.turnRetireEvents.length,retireBefore);
 assert.ok(mixed.zoneMoveEvents.some(e=>e.uid===energySubaru.uid&&e.from==='energy'&&
  e.to==='hand'&&e.reason==='own-effect'));
 assert.equal(at(mixed,0,actor.uid).ready,true);
 assert.equal(universalBp(packs,mixed,at(mixed,0,actor.uid)),4000);
 mixed=ownMain(mixed,2);
 assert.equal(universalBp(packs,mixed,at(mixed,0,actor.uid)),3000);

 let skipped=julius(4903);
 fuel(skipped,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const kept=pull(skipped,0,'REZ-1-037');
 skipped.players[0].front[0]=kept;
 skipped=reach(skipped,'main');
 [skipped,actor]=playFront(skipped,'REZ-1-046');
 at(skipped,0,actor.uid).ready=false;
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseReturnPrinted',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===kept.uid),true);
 assert.equal(at(skipped,0,actor.uid).ready,false);
 assert.equal(universalBp(packs,skipped,at(skipped,0,actor.uid)),3000);

 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I'];
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-return-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-046']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-043']),
  {id:'LAB-HEAVY',name:'ナツキ・スバル',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-ALIAS',name:'別スバル',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'dsl',effects:{},nameAliases:['ナツキ・スバル']},
  ...labs.map(id=>lab(id,'blue'))
 ]});
 const fixtureCounts={'REZ-1-046':4,'REZ-1-043':4,'LAB-HEAVY':4,'LAB-ALIAS':2,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 function open(seed){
  let s=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed});
  ['REZ-1-043','REZ-1-043','REZ-1-043'].forEach((id,i)=>{
   const card=pull(s,0,id);card.ready=true;s.players[0].energy[i]=card;
  });
  s=dispatchUniversalAction(fp,s,{type:'next'});
  s=dispatchUniversalAction(fp,s,{type:'next'});
  assert.equal(s.phase,'main');
  return s;
 }
 let heavy=open(4904);
 const costOne=pull(heavy,0,'LAB-HEAVY');
 heavy.players[0].front[0]=costOne;
 const printed=pull(heavy,0,'REZ-1-046');
 heavy.players[0].hand.push(printed);
 const play=legalUniversalActions(fp,heavy).find(a=>a.type==='play'&&a.uid===printed.uid&&a.line==='front');
 assert.ok(play);
 heavy=dispatchUniversalAction(fp,heavy,play);
 assert.equal(heavy.pending,null);
 assert.equal(universalBp(fp,heavy,at(heavy,0,printed.uid)),3000);

 let alias=open(4905);
 const named=pull(alias,0,'LAB-ALIAS');
 alias.players[0].energy[3]=named;
 const juliusCard=pull(alias,0,'REZ-1-046');
 alias.players[0].hand.push(juliusCard);
 const aliasPlay=legalUniversalActions(fp,alias).find(a=>a.type==='play'&&a.uid===juliusCard.uid&&a.line==='front');
 alias=dispatchUniversalAction(fp,alias,aliasPlay);
 assert.ok(alias.pending.choices.includes(named.uid));
 alias.players[0].front.find(c=>c?.uid===juliusCard.uid).ready=false;
 alias=dispatchUniversalAction(fp,alias,{type:'chooseReturnPrinted',uid:named.uid});
 assert.equal(alias.players[0].hand.some(c=>c.uid===named.uid),true);
 assert.equal(alias.players[0].energy.some(c=>c?.uid===named.uid),false);
 assert.equal(at(alias,0,juliusCard.uid).ready,true);
 assert.equal(universalBp(fp,alias,at(alias,0,juliusCard.uid)),4000);
});

const emiliaCounts={
 ...Object.fromEntries(['REZ-1-087','REZ-1-086','REZ-1-007','REZ-1-008','REZ-1-012',
  'REZ-1-014','REZ-1-022','REZ-1-036','REZ-1-043','REZ-1-037','REZ-1-068','REZ-1-042'].map(id=>[id,4])),
 'REZ-1-046':2
};
const emilia=seed=>newUniversalMatch(packs,{decks:[emiliaCounts,emiliaCounts],first:0,seed});
test('Emilia gains 1000 BP on her turn and readies only after removing the sanctuary trial',()=>{
 assert.equal(Object.values(emiliaCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaCounts),[]);
 const shell={id:'REMOVE',name:'Gate',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-remove',cards:[{...shell,effects:{onPlay:[
  {op:'removeNamedOutsideActive'}]}}]}),/invalid named outside/);
 assert.throws(()=>createUniversalPack({id:'bad-remove',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'removeNamedOutsideActive',name:'”聖域”の”試練”'}]}}]}),/character onPlay/);

 let bare=emilia(5001);
 fuel(bare,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 bare=reach(bare,'main');
 let actor;
 [bare,actor]=playFront(bare,'REZ-1-087');
 assert.equal(bare.pending,null);
 assert.equal(at(bare,0,actor.uid).ready,false);
 assert.equal(universalBp(packs,bare,at(bare,0,actor.uid)),4000);
 const generator=bare.players[0].energy[3];
 bare.players[0].outside.push(generator);
 bare.players[0].energy[3]=bare.players[0].front.find(c=>c?.uid===actor.uid);
 bare.players[0].front[bare.players[0].front.findIndex(c=>c?.uid===actor.uid)]=null;
 assert.equal(universalBp(packs,bare,at(bare,0,actor.uid)),4000);
 bare.active=1;
 assert.equal(universalBp(packs,bare,at(bare,0,actor.uid)),3000);

 const trialName=REZERO_BY_ID['REZ-1-098'].nameJa;
 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H'];
 const lab=(id)=>({id,name:id,color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const event=(id,name,extra)=>({id,name,color:'purple',type:'event',energy:3,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:extra?.nameAliases?'dsl':'vanilla',effects:{},...extra});
 const fixture=createUniversalPack({id:'rezero-trial-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-087']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-086']),
  event('LAB-TRIAL',trialName),
  event('LAB-OTHER','別イベント'),
  event('LAB-ALIAS','別名',{nameAliases:[trialName]}),
  ...labs.map(lab)
 ]});
 const fixtureCounts={'REZ-1-087':4,'REZ-1-086':4,'LAB-TRIAL':4,'LAB-OTHER':2,'LAB-ALIAS':4,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 function open(seed){
  let s=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed});
  ['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086'].forEach((id,i)=>{
   const card=pull(s,0,id);card.ready=true;s.players[0].energy[i]=card;
  });
  s=dispatchUniversalAction(fp,s,{type:'next'});
  s=dispatchUniversalAction(fp,s,{type:'next'});
  assert.equal(s.phase,'main');
  return s;
 }
 let moved=open(5002);
 const trial=pull(moved,0,'LAB-TRIAL');
 const other=pull(moved,0,'LAB-OTHER');
 const alias=pull(moved,0,'LAB-ALIAS');
 const handed=pull(moved,0,'LAB-TRIAL');
 const foeTrial=pull(moved,1,'LAB-TRIAL');
 moved.players[0].outside.push(trial,other,alias);
 moved.players[0].hand.push(handed);
 moved.players[1].outside.push(foeTrial);
 const printed=pull(moved,0,'REZ-1-087');
 moved.players[0].hand.push(printed);
 const play=legalUniversalActions(fp,moved).find(a=>a.type==='play'&&a.uid===printed.uid&&a.line==='front');
 assert.ok(play);
 moved=dispatchUniversalAction(fp,moved,play);
 assert.equal(moved.pending.kind,'effect-remove-named');
 assert.equal(moved.pending.optional,true);
 assert.deepEqual(moved.pending.choices.slice().sort(),[trial.uid,alias.uid].sort());
 for(const uid of [other.uid,handed.uid,foeTrial.uid,printed.uid])
  assert.equal(moved.pending.choices.includes(uid),false,uid);
 assert.throws(()=>dispatchUniversalAction(fp,moved,{type:'chooseRemoveNamed',uid:other.uid}),
  /not currently legal/);
 moved=dispatchUniversalAction(fp,moved,{type:'chooseRemoveNamed',uid:trial.uid});
 assert.equal(moved.pending,null);
 assert.equal(moved.players[0].removed.some(c=>c.uid===trial.uid),true);
 assert.equal(moved.players[0].outside.some(c=>c.uid===trial.uid),false);
 assert.equal(moved.players[0].outside.some(c=>c.uid===alias.uid),true);
 assert.ok(moved.zoneMoveEvents.some(e=>e.uid===trial.uid&&e.from==='outside'&&
  e.to==='removed'&&e.reason==='own-effect'));
 assert.equal(at(moved,0,printed.uid).ready,true);
 assert.equal(universalBp(fp,moved,at(moved,0,printed.uid)),4000);

 let skipped=open(5003);
 const kept=pull(skipped,0,'LAB-TRIAL');
 skipped.players[0].outside.push(kept);
 const skippedCard=pull(skipped,0,'REZ-1-087');
 skipped.players[0].hand.push(skippedCard);
 const skipPlay=legalUniversalActions(fp,skipped).find(a=>a.type==='play'&&a.uid===skippedCard.uid&&a.line==='front');
 skipped=dispatchUniversalAction(fp,skipped,skipPlay);
 skipped=dispatchUniversalAction(fp,skipped,{type:'chooseRemoveNamed',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===kept.uid),true);
 assert.equal(skipped.players[0].removed.some(c=>c.uid===kept.uid),false);
 assert.equal(at(skipped,0,skippedCard.uid).ready,false);
 assert.equal(universalBp(fp,skipped,at(skipped,0,skippedCard.uid)),4000);
});

const ghostCounts={
 'REZ-1-031':2,'REZ-1-063':2,
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-009','REZ-1-022','REZ-1-012',
  'REZ-1-017','REZ-1-014','REZ-1-013','REZ-1-043','REZ-1-005','REZ-1-103'].map(id=>[id,4])),
 'REZ-1-028':2
};
const ghost=seed=>newUniversalMatch(packs,{decks:[ghostCounts,ghostCounts],first:0,seed});
function castEvent(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id+' event');
 return [dispatchUniversalAction(packs,s,action),card];
}
function placeFront(s,owner,cards){
 cards.forEach((card,i)=>{s.players[owner].front[i]=card;});
}
test('Oni Power and Rem privilege retire BP 3000, or 5000 while Rem is on the field',()=>{
 assert.equal(Object.values(ghostCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,ghostCounts),[]);
 let bare=ghost(5101);
 fuel(bare,['REZ-1-007','REZ-1-008','REZ-1-009','REZ-1-022']);
 bare=reach(bare,'main');
 assert.equal(universalEnergyByColor(packs,bare,0).yellow,4);
 const low=pull(bare,1,'REZ-1-012');
 const exact=pull(bare,1,'REZ-1-008');
 const mid=pull(bare,1,'REZ-1-017');
 const over=pull(bare,1,'REZ-1-017');
 over.buffs=[{bp:2000,untilTurn:bare.turn}];
 placeFront(bare,1,[low,exact,mid,over]);
 const foeRem=pull(bare,1,'REZ-1-014');
 bare.players[1].energy[0]=foeRem;
 const handRem=pull(bare,0,'REZ-1-012');
 bare.players[0].hand.push(handRem);
 const outsideRem=pull(bare,0,'REZ-1-014');
 bare.players[0].outside.push(outsideRem);
 let spell;
 [bare,spell]=castEvent(bare,'REZ-1-031');
 assert.equal(bare.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.ok(bare.zoneMoveEvents.some(e=>e.uid===spell.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='rule'));
 assert.equal(bare.pending.kind,'effect-retire-bp');
 assert.equal(bare.pending.limit,3000);
 assert.equal(bare.pending.optional,undefined);
 assert.deepEqual(legalUniversalActions(packs,bare).map(a=>a.uid).sort(),
  [low.uid,exact.uid].sort());
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,bare,{type:'chooseRetireBp',uid:mid.uid}),
  /not currently legal/);
 bare=dispatchUniversalAction(packs,bare,{type:'chooseRetireBp',uid:exact.uid});
 assert.equal(bare.pending,null);
 assert.equal(bare.players[1].front[1],null);
 assert.ok(bare.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(bare.players[1].front[0]?.uid,low.uid);
 assert.equal(bare.players[1].front[2]?.uid,mid.uid);
 assert.equal(assertUniversalMatch(packs,bare),true);

 let named=ghost(5102);
 fuel(named,['REZ-1-007','REZ-1-008','REZ-1-009','REZ-1-022']);
 named=reach(named,'main');
 const rem=pull(named,0,'REZ-1-012');
 named.players[0].front[0]=rem;
 const low2=pull(named,1,'REZ-1-005');
 const mid2=pull(named,1,'REZ-1-017');
 const cap=pull(named,1,'REZ-1-017');
 cap.buffs=[{bp:1000,untilTurn:named.turn}];
 const over2=pull(named,1,'REZ-1-017');
 over2.buffs=[{bp:1001,untilTurn:named.turn}];
 placeFront(named,1,[low2,mid2,cap,over2]);
 [named,spell]=castEvent(named,'REZ-1-031');
 assert.equal(named.pending.limit,5000);
 const namedChoices=legalUniversalActions(packs,named).map(a=>a.uid);
 assert.deepEqual(namedChoices.slice().sort(),[low2.uid,mid2.uid,cap.uid].sort());
 assert.equal(namedChoices.includes(over2.uid),false);
 assert.equal(namedChoices.includes(null),false);
 named=dispatchUniversalAction(packs,named,{type:'chooseRetireBp',uid:cap.uid});
 assert.equal(named.players[1].front[2],null);
 assert.ok(named.players[1].outside.some(c=>c.uid===cap.uid));
 assert.equal(named.players[1].front[3]?.uid,over2.uid);
 assert.equal(assertUniversalMatch(packs,named),true);

 let lined=ghost(5103);
 fuel(lined,['REZ-1-007','REZ-1-008','REZ-1-009']);
 const energyRem=pull(lined,0,'REZ-1-012');
 energyRem.ready=true;
 lined.players[0].energy[3]=energyRem;
 lined=reach(lined,'main');
 assert.equal(universalEnergyByColor(packs,lined,0).yellow,4);
 const mid3=pull(lined,1,'REZ-1-017');
 lined.players[1].front[0]=mid3;
 [lined]=castEvent(lined,'REZ-1-031');
 assert.equal(lined.pending.limit,5000);
 assert.deepEqual(legalUniversalActions(packs,lined),[{type:'chooseRetireBp',uid:mid3.uid}]);
 lined=dispatchUniversalAction(packs,lined,{type:'chooseRetireBp',uid:mid3.uid});
 assert.equal(lined.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,lined),true);

 let blue=ghost(5104);
 fuel(blue,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 blue=reach(blue,'main');
 assert.equal(universalEnergyByColor(packs,blue,0).blue,4);
 const blueMid=pull(blue,1,'REZ-1-017');
 const blueLow=pull(blue,1,'REZ-1-012');
 placeFront(blue,1,[blueLow,blueMid]);
 [blue]=castEvent(blue,'REZ-1-063');
 assert.equal(blue.pending.limit,3000);
 assert.deepEqual(legalUniversalActions(packs,blue).map(a=>a.uid),[blueLow.uid]);
 assert.equal(assertUniversalMatch(packs,blue),true);

 let raised=ghost(5114);
 fuel(raised,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 raised=reach(raised,'main');
 const raisedMid=pull(raised,1,'REZ-1-017');
 raised.players[1].front[0]=raisedMid;
 const blueRem=pull(raised,0,'REZ-1-013');
 raised.players[0].front[0]=blueRem;
 [raised]=castEvent(raised,'REZ-1-063');
 assert.equal(raised.pending.limit,5000);
 assert.deepEqual(legalUniversalActions(packs,raised),[{type:'chooseRetireBp',uid:raisedMid.uid}]);
 assert.equal(assertUniversalMatch(packs,raised),true);
});

function armLife(s,owner,id){
 const trigger=pull(s,owner,id);
 if(s.players[owner].life.length===7){
  s.players[owner].deck.push(s.players[owner].life.shift());
 }
 s.players[owner].life.unshift(trigger);
 assert.equal(s.players[owner].life.length,7);
 return trigger;
}
test('the printed special trigger retires any front character and can be declined',()=>{
 let s=newUniversalMatch(packs,{decks:[ghostCounts,ghostCounts],first:1,seed:5105});
 const attacker=pull(s,1,'REZ-1-007');
 attacker.ready=true;
 const high=pull(s,1,'REZ-1-017');
 s.players[1].front[0]=attacker;
 s.players[1].front[1]=high;
 const trigger=armLife(s,0,'REZ-1-031');
 s=reach(s,'attack');
 s.players[1].front[1].buffs=[{bp:3000,untilTurn:s.turn}];
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'special');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===high.uid));
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='skip'));
 const apBefore=s.players[0].apCards.filter(c=>c.ready).length;
 const retired=dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'special',uid:high.uid},{actor:0});
 assert.equal(retired.players[1].front[1],null);
 assert.ok(retired.players[1].outside.some(c=>c.uid===high.uid));
 assert.ok(retired.players[0].outside.some(c=>c.uid===trigger.uid));
 assert.equal(retired.players[0].apCards.filter(c=>c.ready).length,apBefore);
 assert.equal(assertUniversalMatch(packs,retired),true);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skipped.players[1].front[1]?.uid,high.uid);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

const holdCounts={
 ...Object.fromEntries(['REZ-1-100','REZ-1-086','REZ-1-087','REZ-1-075','REZ-1-072',
  'REZ-1-068','REZ-1-081','REZ-1-091','REZ-1-092','REZ-1-073','REZ-1-079','REZ-1-082'].map(id=>[id,4])),
 'REZ-1-083':2
};
const hold=seed=>newUniversalMatch(packs,{decks:[holdCounts,holdCounts],first:0,seed});
test('Emilia hold retires BP 5000 only while Emilia is on the field',()=>{
 assert.equal(Object.values(holdCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,holdCounts),[]);
 let s=hold(5106);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 const low=pull(s,1,'REZ-1-072');
 const mid=pull(s,1,'REZ-1-075');
 const cap=pull(s,1,'REZ-1-075');
 cap.buffs=[{bp:1000,untilTurn:s.turn}];
 const over=pull(s,1,'REZ-1-075');
 over.buffs=[{bp:1001,untilTurn:s.turn}];
 placeFront(s,1,[low,mid,cap,over]);
 const handEmilia=pull(s,0,'REZ-1-081');
 s.players[0].hand.push(handEmilia);
 [s]=castEvent(s,'REZ-1-100');
 assert.equal(s.pending.limit,5000);
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(choices.slice().sort(),[low.uid,mid.uid,cap.uid].sort());
 assert.equal(choices.includes(over.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:mid.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===mid.uid));
 assert.equal(s.players[1].front[3]?.uid,over.uid);
 assert.equal(assertUniversalMatch(packs,s),true);

 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H'];
 const gen=(id)=>({id,name:'燃料',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-hold-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-100']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-087']),
  {id:'LAB-ALIAS',name:'別名',color:'purple',type:'character',energy:0,ap:1,bp:4000,gen:0,
   traits:[],trigger:null,implementation:'dsl',effects:{},nameAliases:['エミリア']},
  {id:'LAB-TALL',name:'高昂',color:'purple',type:'character',energy:0,ap:1,bp:4000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-SHORT',name:'低昂',color:'purple',type:'character',energy:0,ap:1,bp:3000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...labs.map(gen)
 ]});
 const fixtureCounts={'REZ-1-100':4,'REZ-1-087':2,'LAB-ALIAS':4,'LAB-TALL':4,'LAB-SHORT':4,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 function open(seed){
  let state=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed});
  ['LAB-A','LAB-B','LAB-C','LAB-D'].forEach((id,i)=>{
   const card=pull(state,0,id);card.ready=true;state.players[0].energy[i]=card;
  });
  state=dispatchUniversalAction(fp,state,{type:'next'});
  state=dispatchUniversalAction(fp,state,{type:'next'});
  assert.equal(state.phase,'main');
  return state;
 }
 let missed=open(5107);
 const tall=pull(missed,1,'LAB-TALL');
 const short=pull(missed,1,'LAB-SHORT');
 const foe=pull(missed,1,'REZ-1-087');
 missed.players[1].front[0]=tall;
 missed.players[1].front[1]=short;
 missed.players[1].front[2]=foe;
 const handed=pull(missed,0,'REZ-1-087');
 missed.players[0].hand.push(handed);
 const event=pull(missed,0,'REZ-1-100');
 missed.players[0].hand.push(event);
 missed=dispatchUniversalAction(fp,missed,
  legalUniversalActions(fp,missed).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(missed.pending.limit,3000);
 assert.deepEqual(legalUniversalActions(fp,missed).map(a=>a.uid).sort(),
  [short.uid,foe.uid].sort());
 assert.equal(legalUniversalActions(fp,missed).some(a=>a.uid===tall.uid),false);
 assert.equal(assertUniversalMatch(fp,missed),true);

 let alias=open(5108);
 const body=pull(alias,1,'LAB-TALL');
 alias.players[1].front[0]=body;
 const standIn=pull(alias,0,'LAB-ALIAS');
 alias.players[0].front[0]=standIn;
 const cast=pull(alias,0,'REZ-1-100');
 alias.players[0].hand.push(cast);
 alias=dispatchUniversalAction(fp,alias,
  legalUniversalActions(fp,alias).find(a=>a.type==='event'&&a.uid===cast.uid));
 assert.equal(alias.pending.limit,5000);
 assert.deepEqual(legalUniversalActions(fp,alias),[{type:'chooseRetireBp',uid:body.uid}]);
 alias=dispatchUniversalAction(fp,alias,{type:'chooseRetireBp',uid:body.uid});
 assert.equal(alias.players[1].front[0],null);
 assert.equal(assertUniversalMatch(fp,alias),true);
});

const garfielCounts={
 ...Object.fromEntries(['REZ-1-067','REZ-1-086','REZ-1-068','REZ-1-069','REZ-1-072',
  'REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-081','REZ-1-091','REZ-1-092'].map(id=>[id,4])),
 'REZ-1-082':2
};
const garfiel=seed=>newUniversalMatch(packs,{decks:[garfielCounts,garfielCounts],first:0,seed});
test('Garfiel enters active, may reduce one front character, and readies once from the front',()=>{
 assert.equal(Object.values(garfielCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,garfielCounts),[]);
 let s=garfiel(5201);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=ownMain(s,2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 const victim=pull(s,1,'REZ-1-075');
 const parked=pull(s,1,'REZ-1-072');
 s.players[1].front[0]=victim;
 s.players[1].energy[0]=parked;
 let actor;
 [s,actor]=playFront(s,'REZ-1-067');
 assert.equal(at(s,0,actor.uid).ready,true);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[victim.uid]);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTarget'&&a.uid===null));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:parked.uid}),
  /not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:victim.uid});
 assert.equal(universalBp(packs,s,at(s,1,victim.uid)),1500);
 at(s,0,actor.uid).ready=false;
 const ready=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='frontOnce'&&a.uid===actor.uid);
 assert.ok(ready);
 assert.equal(uiActionLabel(ready,{pack,state:s}),'起動主要：將這張角色置為活動');
 s=dispatchUniversalAction(packs,s,ready);
 assert.equal(at(s,0,actor.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 s=ownMain(s,3);
 assert.equal(universalBp(packs,s,at(s,1,victim.uid)),4000);
 assert.equal(assertUniversalMatch(packs,s),true);

 let lined=garfiel(5202);
 fuel(lined,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 lined=ownMain(lined,2);
 let energyCard;
 [lined,energyCard]=playEnergy(lined,'REZ-1-067');
 assert.equal(lined.pending,null);
 assert.equal(at(lined,0,energyCard.uid).ready,true);
 at(lined,0,energyCard.uid).ready=false;
 assert.equal(legalUniversalActions(packs,lined).some(a=>a.uid===energyCard.uid&&a.type==='activate'),false);
 assert.equal(assertUniversalMatch(packs,lined),true);

 let open=garfiel(5203);
 fuel(open,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 open=ownMain(open,2);
 let lone;
 [open,lone]=playFront(open,'REZ-1-067');
 assert.equal(open.pending,null);
 assert.equal(at(open,0,lone.uid).ready,true);
 at(open,0,lone.uid).ready=false;
 open=dispatchUniversalAction(packs,open,{type:'activate',uid:lone.uid,mode:'frontOnce'});
 assert.equal(at(open,0,lone.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,open),true);
});

test('Echidna may discard or rest, then adds one sanctuary trial from outside',()=>{
 const trialName=REZERO_BY_ID['REZ-1-098'].nameJa;
 const shell={id:'PAY',name:'Gate',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-pay',cards:[{...shell,effects:{onPlay:[
  {op:'payHandOrRestForNamed'}]}}]}),/invalid hand-or-rest/);
 assert.throws(()=>createUniversalPack({id:'bad-pay',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'payHandOrRestForNamed',name:trialName}]}}]}),/character onPlay/);
 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H'];
 const gen=(id)=>({id,name:'燃料',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const event=(id,name,extra)=>({id,name,color:'purple',type:'event',energy:2,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:extra?.nameAliases?'dsl':'vanilla',effects:{},...extra});
 const fixture=createUniversalPack({id:'rezero-echidna-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-113']),
  event('LAB-TRIAL',trialName),
  event('LAB-OTHER','別イベント'),
  event('LAB-ALIAS','別名',{nameAliases:[trialName]}),
  {id:'LAB-FRONT',name:'前線',color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...labs.map(gen)
 ]});
 const fixtureCounts={'REZ-1-113':4,'LAB-TRIAL':4,'LAB-OTHER':2,'LAB-ALIAS':4,'LAB-FRONT':4,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 function open(seed){
  let s=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed});
  ['LAB-A','LAB-B','LAB-C'].forEach((id,i)=>{
   const card=pull(s,0,id);card.ready=true;s.players[0].energy[i]=card;
  });
  s=dispatchUniversalAction(fp,s,{type:'next'});
  s=dispatchUniversalAction(fp,s,{type:'next'});
  assert.equal(s.phase,'main');
  assert.equal(universalEnergyByColor(fp,s,0).purple,3);
  return s;
 }
 function play(s){
  const card=pull(s,0,'REZ-1-113');
  s.players[0].hand.push(card);
  const action=legalUniversalActions(fp,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
  assert.ok(action);
  return [dispatchUniversalAction(fp,s,action),card];
 }
 let bare=open(5301);
 let actor;
 [bare,actor]=play(bare);
 assert.equal(bare.pending,null);
 assert.equal(at(bare,0,actor.uid).ready,false);
 assert.equal(assertUniversalMatch(fp,bare),true);

 let missed=open(5302);
 const onlyHand=pull(missed,0,'LAB-TRIAL');
 missed.players[0].hand.push(onlyHand);
 const foeTrial=pull(missed,1,'LAB-TRIAL');
 missed.players[1].outside.push(foeTrial);
 [missed,actor]=play(missed);
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>c.uid===onlyHand.uid),true);
 assert.equal(missed.players[1].outside.some(c=>c.uid===foeTrial.uid),true);

 let paid=open(5303);
 const trial=pull(paid,0,'LAB-TRIAL');
 const other=pull(paid,0,'LAB-OTHER');
 paid.players[0].outside.push(trial);
 paid.players[0].hand.push(other);
 const front=pull(paid,0,'LAB-FRONT');
 front.ready=true;
 paid.players[0].front[0]=front;
 const rested=pull(paid,0,'LAB-FRONT');
 rested.ready=false;
 paid.players[0].front[1]=rested;
 const energyBody=paid.players[0].energy[0];
 [paid,actor]=play(paid);
 assert.equal(paid.pending.kind,'effect-pay-named');
 assert.equal(paid.pending.optional,true);
 assert.equal(Object.keys(paid.pending).includes('hand'),false);
 const actions=legalUniversalActions(fp,paid);
 assert.ok(actions.some(a=>a.mode==='skip'));
 assert.ok(actions.some(a=>a.mode==='hand'&&a.uid===other.uid));
 assert.ok(actions.some(a=>a.mode==='rest'&&a.uid===front.uid));
 assert.equal(actions.some(a=>a.uid===actor.uid),false);
 assert.equal(actions.some(a=>a.uid===rested.uid),false);
 assert.equal(actions.some(a=>a.uid===energyBody.uid),false);
 assert.equal(actions.some(a=>a.uid===trial.uid),false);
 assert.throws(()=>dispatchUniversalAction(fp,paid,{type:'choosePayNamed',mode:'rest',uid:energyBody.uid}),
  /not currently legal/);
 const label=uiActionLabel(actions.find(a=>a.mode==='hand'&&a.uid===other.uid),{pack:fixture,state:paid});
 assert.equal(label,'將 別イベント 放到場外，並回收指定卡');
 paid=dispatchUniversalAction(fp,paid,{type:'choosePayNamed',mode:'hand',uid:other.uid});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(paid.players[0].hand.some(c=>c.uid===trial.uid),true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===trial.uid),false);
 assert.equal(at(paid,0,front.uid).ready,true);
 assert.ok(paid.zoneMoveEvents.some(e=>e.uid===other.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='own-effect'));
 assert.ok(paid.zoneMoveEvents.some(e=>e.uid===trial.uid&&e.from==='outside'&&
  e.to==='hand'&&e.reason==='own-effect'));
 assert.equal(assertUniversalMatch(fp,paid),true);

 let restedPay=open(5304);
 const kept=pull(restedPay,0,'LAB-ALIAS');
 restedPay.players[0].outside.push(kept);
 const stand=pull(restedPay,0,'LAB-FRONT');
 stand.ready=true;
 restedPay.players[0].front[0]=stand;
 [restedPay,actor]=play(restedPay);
 restedPay=dispatchUniversalAction(fp,restedPay,{type:'choosePayNamed',mode:'rest',uid:stand.uid});
 assert.equal(restedPay.pending,null);
 assert.equal(at(restedPay,0,stand.uid).ready,false);
 assert.equal(restedPay.players[0].hand.some(c=>c.uid===kept.uid),true);
 assert.equal(assertUniversalMatch(fp,restedPay),true);

 let skipped=open(5305);
 const stays=pull(skipped,0,'LAB-TRIAL');
 skipped.players[0].outside.push(stays);
 const quiet=pull(skipped,0,'LAB-FRONT');
 quiet.ready=true;
 skipped.players[0].front[0]=quiet;
 const dumped=pull(skipped,0,'LAB-OTHER');
 skipped.players[0].hand.push(dumped);
 [skipped]=play(skipped);
 skipped=dispatchUniversalAction(fp,skipped,{type:'choosePayNamed',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===stays.uid),true);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===dumped.uid),true);
 assert.equal(at(skipped,0,quiet.uid).ready,true);

 let many=open(5306);
 const first=pull(many,0,'LAB-TRIAL');
 const second=pull(many,0,'LAB-ALIAS');
 const payment=pull(many,0,'LAB-OTHER');
 many.players[0].outside.push(first,second);
 many.players[0].hand.push(payment);
 [many]=play(many);
 many=dispatchUniversalAction(fp,many,{type:'choosePayNamed',mode:'hand',uid:payment.uid});
 assert.equal(many.pending.kind,'effect-add-named');
 assert.equal(many.pending.optional,undefined);
 assert.deepEqual(many.pending.choices.slice().sort(),[first.uid,second.uid].sort());
 assert.equal(legalUniversalActions(fp,many).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(fp,many,{type:'chooseAddNamed',uid:payment.uid}),
  /not currently legal/);
 many=dispatchUniversalAction(fp,many,{type:'chooseAddNamed',uid:second.uid});
 assert.equal(many.pending,null);
 assert.equal(many.players[0].hand.some(c=>c.uid===second.uid),true);
 assert.equal(many.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(many.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(assertUniversalMatch(fp,many),true);

 let unpaid=open(5307);
 unpaid.players[0].outside.push(...unpaid.players[0].hand.splice(0));
 const lonely=pull(unpaid,0,'LAB-TRIAL');
 unpaid.players[0].outside.push(lonely);
 const last=pull(unpaid,0,'REZ-1-113');
 unpaid.players[0].hand.push(last);
 unpaid=dispatchUniversalAction(fp,unpaid,
  legalUniversalActions(fp,unpaid).find(a=>a.type==='play'&&a.uid===last.uid&&a.line==='front'));
 assert.equal(unpaid.pending,null);
 assert.equal(unpaid.players[0].outside.some(c=>c.uid===lonely.uid),true);
 assert.equal(unpaid.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(fp,unpaid),true);
});

const beatriceCounts={
 ...Object.fromEntries(['REZ-1-076','REZ-1-086','REZ-1-068','REZ-1-069','REZ-1-072',
  'REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-081','REZ-1-091','REZ-1-092'].map(id=>[id,4])),
 'REZ-1-113':1,'REZ-1-007':1
};
const beatrice=seed=>newUniversalMatch(packs,{decks:[beatriceCounts,beatriceCounts],first:0,seed});
test('Beatrice places one hand card on the deck top and gains BP only from the front',()=>{
 assert.equal(Object.values(beatriceCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,beatriceCounts),[]);
 const shell={id:'TOP',name:'Top',color:'purple',type:'character',energy:0,ap:1,bp:3000,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-top',cards:[{...shell,effects:{onPlay:[
  {op:'handTopBuffSelf',bp:1000}]}}]}),/hand-to-top buff/);
 assert.throws(()=>createUniversalPack({id:'bad-top',cards:[{...shell,effects:{},mainAbility:{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[{op:'handTopBuffSelf',bp:0}]}}]}),
  /invalid hand-to-top/);
 let s=beatrice(5401);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 const marker=pull(s,0,'REZ-1-072');
 s.players[0].hand.push(marker);
 let actor;
 [s,actor]=playFront(s,'REZ-1-076');
 assert.equal(at(s,0,actor.uid).ready,false);
 assert.equal(s.pending,null);
 const previousTop=s.players[0].deck[0];
 const reveals=s.publicReveals.length;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===actor.uid);
 assert.equal(act.mode,'frontOnce');
 assert.equal(uiActionLabel(act,{pack,state:s}),'起動主要：將 1 張手牌放到牌組上面，本回合 BP+1000');
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending.kind,'effect-hand-top');
 assert.equal(s.pending.bp,1000);
 assert.equal(Object.hasOwn(s.pending,'hand'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseHandTop'&&a.uid===marker.uid));
 assert.equal(uiActionLabel({type:'chooseHandTop',uid:marker.uid},{pack,state:s}),
  '將 '+REZERO_BY_ID['REZ-1-072'].nameJa+' 放到牌組上面');
 s=dispatchUniversalAction(packs,s,{type:'chooseHandTop',uid:marker.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,marker.uid);
 assert.equal(s.players[0].deck[1].uid,previousTop.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===marker.uid),false);
 assert.equal(s.zoneMoveEvents.at(-1).from,'hand');
 assert.equal(s.zoneMoveEvents.at(-1).to,'deck');
 assert.equal(s.zoneMoveEvents.at(-1).reason,'own-effect');
 assert.equal(s.zoneMoveEvents.at(-1).uid,marker.uid);
 assert.equal(universalBp(packs,s,at(s,0,actor.uid)),4000);
 assert.equal(at(s,0,actor.uid).ready,false);
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 s=ownMain(s,2);
 assert.equal(universalBp(packs,s,at(s,0,actor.uid)),3000);
 assert.equal(assertUniversalMatch(packs,s),true);

 let empty=beatrice(5402);
 fuel(empty,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 empty=reach(empty,'main');
 let quiet;
 [empty,quiet]=playFront(empty,'REZ-1-076');
 empty.players[0].outside.push(...empty.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assert.equal(assertUniversalMatch(packs,empty),true);

 let lined=beatrice(5403);
 fuel(lined,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 lined=reach(lined,'main');
 let energyCard;
 [lined,energyCard]=playEnergy(lined,'REZ-1-076');
 assert.equal(lined.pending,null);
 assert.equal(at(lined,0,energyCard.uid).ready,false);
 assert.equal(legalUniversalActions(packs,lined).some(a=>a.type==='activate'&&a.uid===energyCard.uid),false);
 assert.equal(assertUniversalMatch(packs,lined),true);
});

test('Beatrice color trigger deploys one matching purple character from outside, active',()=>{
 let s=newUniversalMatch(packs,{decks:[beatriceCounts,beatriceCounts],first:1,seed:5404});
 const attacker=pull(s,1,'REZ-1-072');
 attacker.ready=true;
 s.players[1].front[0]=attacker;
 const match=pull(s,0,'REZ-1-072');
 const edge=pull(s,0,'REZ-1-086');
 const tall=pull(s,0,'REZ-1-113');
 const yellow=pull(s,0,'REZ-1-007');
 s.players[0].outside.push(match,edge,tall,yellow);
 const trigger=armLife(s,0,'REZ-1-076');
 s=reach(s,'attack');
 const apBefore=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.mode==='colorOutside'&&a.uid===match.uid&&a.line==='front'));
 assert.ok(legal.some(a=>a.mode==='colorOutside'&&a.uid===edge.uid));
 assert.equal(legal.some(a=>a.uid===tall.uid),false);
 assert.equal(legal.some(a=>a.uid===yellow.uid),false);
 assert.ok(legal.some(a=>a.mode==='skip'));
 const play=legal.find(a=>a.mode==='colorOutside'&&a.uid===match.uid&&a.replaceUid===undefined);
 const deployed=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(deployed.pending,null);
 assert.equal(deployed.players[0].front.some(c=>c?.uid===match.uid&&c.ready),true);
 assert.equal(deployed.players[0].outside.some(c=>c.uid===match.uid),false);
 assert.ok(deployed.players[0].outside.some(c=>c.uid===trigger.uid));
 assert.equal(deployed.players[0].apCards.filter(c=>c.ready).length,apBefore);
 assert.equal(assertUniversalMatch(packs,deployed),true);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skipped.players[0].outside.some(c=>c.uid===match.uid),true);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===match.uid),false);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

const trialCounts={
 ...Object.fromEntries(['REZ-1-098','REZ-1-086','REZ-1-068','REZ-1-069','REZ-1-072',
  'REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-081','REZ-1-091','REZ-1-092'].map(id=>[id,4])),
 'REZ-1-082':1,'REZ-1-113':1
};
const trial=seed=>newUniversalMatch(packs,{decks:[trialCounts,trialCounts],first:0,seed});
test('the sanctuary trial draws two, discards one, then may rest a front character to recover one AP',()=>{
 assert.equal(Object.values(trialCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,trialCounts),[]);
 const shell={id:'REST',name:'Rest',color:'purple',type:'event',energy:2,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-rest',cards:[{...shell,effects:{onPlay:[
  {op:'optionalRestFrontRecoverAp',count:1}]}}]}),/invalid optional front rest/);
 assert.throws(()=>createUniversalPack({id:'bad-rest',cards:[{...shell,type:'character',bp:3000,effects:{onPlay:[
  {op:'optionalRestFrontRecoverAp'}]}}]}),/event onPlay/);
 let s=trial(5501);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 const ready=pull(s,0,'REZ-1-072');
 ready.ready=true;
 const rested=pull(s,0,'REZ-1-068');
 rested.ready=false;
 s.players[0].front[0]=ready;
 s.players[0].front[1]=rested;
 const drawn=setTop(s,0,['REZ-1-075','REZ-1-081']);
 const event=pull(s,0,'REZ-1-098');
 s.players[0].hand.push(event);
 const deckAtPlay=s.players[0].deck.length;
 const dump=s.players[0].hand.find(c=>c.uid!==event.uid);
 assert.ok(dump);
 s=dispatchUniversalAction(packs,s,
  legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deckAtPlay-2);
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn[0].uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn[1].uid));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:dump.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===dump.uid));
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===dump.uid).at(-1).reason,'own-effect');
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===event.uid).at(-1).reason,'rule');
 assert.equal(s.pending.kind,'effect-rest-front-ap');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[ready.uid]);
 const restLegal=legalUniversalActions(packs,s);
 assert.ok(restLegal.some(a=>a.type==='chooseRestFrontAp'&&a.uid===null));
 assert.ok(restLegal.some(a=>a.uid===ready.uid));
 assert.equal(restLegal.some(a=>a.uid===rested.uid),false);
 assert.equal(restLegal.some(a=>s.players[0].energy.some(c=>c?.uid===a.uid)),false);
 assert.equal(uiActionLabel({type:'chooseRestFrontAp',uid:null},{pack,state:s}),'不休息前線');
 const branched=structuredClone(s);
 const skipped=dispatchUniversalAction(packs,branched,{type:'chooseRestFrontAp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(at(skipped,0,ready.uid).ready,true);
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontAp',uid:ready.uid});
 assert.equal(at(s,0,ready.uid).ready,false);
 assert.equal(at(s,0,rested.uid).ready,false);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,1);
 const spent=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseApRecovery'&&a.uid===null));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===spent.uid));
 const held=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseApRecovery',uid:null});
 assert.equal(held.pending,null);
 assert.equal(held.players[0].apCards.filter(c=>c.ready).length,0);
 s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:spent.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.find(c=>c.uid===spent.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let quiet=trial(5502);
 fuel(quiet,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 quiet=reach(quiet,'main');
 const asleep=pull(quiet,0,'REZ-1-072');
 asleep.ready=false;
 quiet.players[0].front[0]=asleep;
 const spare=quiet.players[0].hand[0];
 [quiet]=castEvent(quiet,'REZ-1-098');
 quiet=dispatchUniversalAction(packs,quiet,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(quiet.pending,null);
 assert.equal(at(quiet,0,asleep.uid).ready,false);
 assert.equal(quiet.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('the sanctuary trial color trigger deploys the same purple outside characters',()=>{
 let s=newUniversalMatch(packs,{decks:[trialCounts,trialCounts],first:1,seed:5503});
 const attacker=pull(s,1,'REZ-1-072');
 attacker.ready=true;
 s.players[1].front[0]=attacker;
 const match=pull(s,0,'REZ-1-072');
 const edge=pull(s,0,'REZ-1-086');
 const tall=pull(s,0,'REZ-1-113');
 const eventCopy=pull(s,0,'REZ-1-098');
 s.players[0].outside.push(match,edge,tall,eventCopy);
 const trigger=armLife(s,0,'REZ-1-098');
 s=reach(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.trigger,'color');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.mode==='colorOutside'&&a.uid===match.uid));
 assert.ok(legal.some(a=>a.mode==='colorOutside'&&a.uid===edge.uid));
 assert.equal(legal.some(a=>a.uid===tall.uid||a.uid===eventCopy.uid),false);
 const play=legal.find(a=>a.mode==='colorOutside'&&a.uid===match.uid&&a.replaceUid===undefined);
 const deployed=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(deployed.players[0].front.some(c=>c?.uid===match.uid&&c.ready),true);
 assert.ok(deployed.players[0].outside.some(c=>c.uid===trigger.uid));
 assert.equal(assertUniversalMatch(packs,deployed),true);
});

const libraryCounts={
 ...Object.fromEntries(['REZ-1-094','REZ-1-086','REZ-1-068','REZ-1-069','REZ-1-072',
  'REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-081','REZ-1-091','REZ-1-092'].map(id=>[id,4])),
 'REZ-1-082':2
};
const library=seed=>newUniversalMatch(packs,{decks:[libraryCounts,libraryCounts],first:0,seed});
test('Forbidden Library may discard to enter active, then rests to draw and top a hand card',()=>{
 assert.equal(Object.values(libraryCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,libraryCounts),[]);
 const shell={id:'LIB',name:'Library',color:'purple',type:'field',energy:3,ap:1,bp:0,gen:0,
  traits:[],trigger:'get',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-lib',cards:[{...shell,type:'character',bp:3000,effects:{onPlay:[
  {op:'optionalDiscardActiveSelf'}]}}]}),/field onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-lib',cards:[{...shell,effects:{onPlay:[
  {op:'drawHandTop'}]}}]}),/field main ability/);
 let blocked=library(5601);
 fuel(blocked,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 blocked=reach(blocked,'main');
 const frontOnly=pull(blocked,0,'REZ-1-094');
 blocked.players[0].hand.push(frontOnly);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='play'&&a.uid===frontOnly.uid&&a.line==='front'),false);
 assert.ok(legalUniversalActions(packs,blocked).some(a=>a.type==='play'&&a.uid===frontOnly.uid&&a.line==='energy'));

 let s=library(5602);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 const payment=pull(s,0,'REZ-1-072');
 const placed=pull(s,0,'REZ-1-068');
 s.players[0].hand.push(payment,placed);
 let field;
 [s,field]=playEnergy(s,'REZ-1-094');
 assert.equal(at(s,0,field.uid).ready,false);
 assert.equal(s.players[0].energy.some(c=>c?.uid===field.uid),true);
 assert.equal(s.pending.kind,'effect-discard-active');
 assert.equal(s.pending.optional,true);
 assert.equal(Object.hasOwn(s.pending,'choices'),false);
 const payLegal=legalUniversalActions(packs,s);
 assert.ok(payLegal.some(a=>a.type==='chooseDiscardActive'&&a.uid===null));
 assert.ok(payLegal.some(a=>a.uid===payment.uid));
 assert.equal(payLegal.some(a=>a.uid===field.uid),false);
 assert.equal(uiActionLabel({type:'chooseDiscardActive',uid:null},{pack,state:s}),'不棄牌，場域維持休息');
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseDiscardActive',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(at(declined,0,field.uid).ready,false);
 assert.equal(declined.players[0].hand.some(c=>c.uid===payment.uid),true);
 assert.equal(legalUniversalActions(packs,declined).some(a=>a.type==='activate'&&a.uid===field.uid),false);
 assert.equal(assertUniversalMatch(packs,declined),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardActive',uid:payment.uid});
 assert.equal(s.pending,null);
 assert.equal(at(s,0,field.uid).ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===payment.uid).at(-1).reason,'own-effect');
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===field.uid);
 assert.equal(act.mode,'selfRestThen');
 assert.equal(uiActionLabel(act,{pack,state:s}),'起動主要：休息這張場域，抽 1 張並將 1 張手牌放到牌組上面');
 const topBefore=s.players[0].deck[0];
 const second=s.players[0].deck[1];
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(at(s,0,field.uid).ready,false);
 assert.equal(s.pending.kind,'effect-hand-top');
 assert.equal(s.pending.bp,undefined);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.ok(s.players[0].hand.some(c=>c.uid===topBefore.uid));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseHandTop'&&a.uid===placed.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseHandTop',uid:placed.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,placed.uid);
 assert.equal(s.players[0].deck[1].uid,second.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===topBefore.uid),true);
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===placed.uid).at(-1).to,'deck');
 assert.equal(s.publicReveals.some(r=>r.uid===placed.uid),false);
 at(s,0,field.uid).ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===field.uid),false);
 s=ownMain(s,2);
 assert.equal(at(s,0,field.uid).ready,true);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='selfRestThen'&&a.uid===field.uid));
 assert.equal(assertUniversalMatch(packs,s),true);

 let bare=library(5603);
 fuel(bare,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 bare=reach(bare,'main');
 bare.players[0].outside.push(...bare.players[0].hand.splice(0));
 let quiet;
 [bare,quiet]=playEnergy(bare,'REZ-1-094');
 assert.equal(bare.pending,null);
 assert.equal(at(bare,0,quiet.uid).ready,false);
 at(bare,0,quiet.uid).ready=true;
 bare.players[0].outside.push(...bare.players[0].hand.splice(0),...bare.players[0].deck.splice(0));
 bare=dispatchUniversalAction(packs,bare,{type:'activate',uid:quiet.uid,mode:'selfRestThen'});
 assert.equal(bare.pending,null);
 assert.equal(at(bare,0,quiet.uid).ready,false);
 assert.equal(bare.players[0].deck.length,0);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

const emiliaRestCounts={
 ...Object.fromEntries(['REZ-1-088','REZ-1-098','REZ-1-086','REZ-1-068','REZ-1-069',
  'REZ-1-072','REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-081'].map(id=>[id,4])),
 'REZ-1-091':4,'REZ-1-092':2
};
const emiliaRest=seed=>newUniversalMatch(packs,{decks:[emiliaRestCounts,emiliaRestCounts],first:0,seed});
test('Emilia readies and gains BP only after an own effect rested her from active',()=>{
 assert.equal(Object.values(emiliaRestCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaRestCounts),[]);
 const shell={id:'EM',name:'Emilia',color:'purple',type:'character',energy:3,ap:1,bp:3000,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-em',cards:[{...shell,mainAbility:{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
  then:[{op:'activeSelf'}]}}]}),/unsupported main action/);
 let quiet=emiliaRest(5701);
 fuel(quiet,['REZ-1-086','REZ-1-086','REZ-1-086']);
 quiet=ownMain(quiet,2);
 let emilia;
 [quiet,emilia]=playFront(quiet,'REZ-1-088');
 assert.equal(at(quiet,0,emilia.uid).ready,false);
 assert.equal(frontOnce(quiet,emilia.uid),false);
 at(quiet,0,emilia.uid).ready=true;
 assert.equal(frontOnce(quiet,emilia.uid),false);
 at(quiet,0,emilia.uid).ready=false;
 assert.equal(quiet.ownEffectRests[0].length,0);
 assert.equal(frontOnce(quiet,emilia.uid),false);
 at(quiet,0,emilia.uid).ready=true;
 const trial=pull(quiet,0,'REZ-1-098');
 quiet.players[0].hand.push(trial);
 const deckAtPlay=quiet.players[0].deck.length;
 quiet=dispatchUniversalAction(packs,quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='event'&&a.uid===trial.uid));
 assert.equal(quiet.players[0].deck.length,deckAtPlay-2);
 assert.equal(quiet.pending.kind,'effect-discard');
 const dumped=quiet.players[0].hand[0];
 quiet=dispatchUniversalAction(packs,quiet,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(quiet.pending.kind,'effect-rest-front-ap');
 assert.ok(quiet.pending.choices.includes(emilia.uid));
 quiet=dispatchUniversalAction(packs,quiet,{type:'chooseRestFrontAp',uid:emilia.uid});
 if(quiet.pending?.kind==='effect-recover-ap')
  quiet=dispatchUniversalAction(packs,quiet,{type:'chooseApRecovery',uid:null});
 assert.equal(at(quiet,0,emilia.uid).ready,false);
 assert.ok(quiet.ownEffectRests[0].some(n=>n.uid===emilia.uid&&n.stamp===at(quiet,0,emilia.uid).fieldEntryStamp&&n.turn===quiet.turn));
 const slot=quiet.players[0].front.findIndex(c=>c?.uid===emilia.uid);
 const parked=quiet.players[0].front[slot];
 quiet.players[0].front[slot]=null;
 quiet.players[0].energy[3]=parked;
 assert.equal(frontOnce(quiet,emilia.uid),false);
 quiet.players[0].energy[3]=null;
 quiet.players[0].front[slot]=parked;
 const act=legalUniversalActions(packs,quiet).find(a=>a.type==='activate'&&a.uid===emilia.uid);
 assert.equal(act.mode,'frontOnce');
 assert.equal(uiActionLabel(act,{pack,state:quiet}),'起動主要：將這張角色置為活動，直到下一個我方回合開始前 BP+1000');
 quiet=dispatchUniversalAction(packs,quiet,act);
 assert.equal(quiet.pending,null);
 assert.equal(at(quiet,0,emilia.uid).ready,true);
 assert.equal(universalBp(packs,quiet,at(quiet,0,emilia.uid)),4000);
 assert.equal(frontOnce(quiet,emilia.uid),false);
 quiet=ownMain(quiet,3);
 assert.equal(universalBp(packs,quiet,at(quiet,0,emilia.uid)),3000);
 assert.equal(quiet.ownEffectRests[0].length,0);
 assert.equal(frontOnce(quiet,emilia.uid),false);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

const minaCounts={
 ...Object.fromEntries(['REZ-1-096','REZ-1-076','REZ-1-068','REZ-1-086','REZ-1-088',
  'REZ-1-072','REZ-1-073','REZ-1-075','REZ-1-079','REZ-1-080','REZ-1-091','REZ-1-081'].map(id=>[id,4])),
 'REZ-1-092':2
};
const mina=seed=>newUniversalMatch(packs,{decks:[minaCounts,minaCounts],first:0,seed});
test('El Minya retires 3000, 4000 with Beatrice, or 5000 with Beatrice and Subaru',()=>{
 assert.equal(Object.values(minaCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,minaCounts),[]);
 const shell={id:'MINA',name:'Mina',color:'purple',type:'event',energy:3,ap:1,bp:0,gen:0,
  traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-mina',cards:[{...shell,type:'character',bp:3000,effects:{onPlay:[
  {op:'retireOppFrontTiered',bp:3000,tiers:[
   {names:['ベアトリス'],bp:4000},{names:['ベアトリス','ナツキ・スバル'],bp:5000}]}]}}]}),
  /event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-mina',cards:[{...shell,effects:{onPlay:[
  {op:'retireOppFrontTiered',bp:3000,tiers:[{names:['レム'],bp:5000}]}]}}]}),
  /tiered front retirement/);
 let bare=mina(5801);
 fuel(bare,['REZ-1-086','REZ-1-086','REZ-1-086']);
 bare=reach(bare,'main');
 const low=pull(bare,1,'REZ-1-068');
 const at3=pull(bare,1,'REZ-1-088');
 const at4=pull(bare,1,'REZ-1-088');
 at4.buffs=[{bp:1000,untilTurn:bare.turn}];
 const at5=pull(bare,1,'REZ-1-088');
 at5.buffs=[{bp:2000,untilTurn:bare.turn}];
 placeFront(bare,1,[low,at3,at4,at5]);
 const handBeatrice=pull(bare,0,'REZ-1-076');
 bare.players[0].hand.push(handBeatrice);
 const subaruOnly=pull(bare,0,'REZ-1-068');
 bare.players[0].energy[3]=subaruOnly;
 let spell;
 [bare,spell]=castEvent(bare,'REZ-1-096');
 assert.equal(bare.pending.kind,'effect-retire-bp');
 assert.equal(bare.pending.limit,3000);
 assert.deepEqual(legalUniversalActions(packs,bare).map(a=>a.uid).sort(),[low.uid,at3.uid].sort());
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.uid===null),false);
 bare=dispatchUniversalAction(packs,bare,{type:'chooseRetireBp',uid:at3.uid});
 assert.equal(bare.players[1].front[1],null);
 assert.ok(bare.players[1].outside.some(c=>c.uid===at3.uid));
 assert.equal(bare.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.equal(assertUniversalMatch(packs,bare),true);

 let beatrice=mina(5802);
 fuel(beatrice,['REZ-1-086','REZ-1-086','REZ-1-086']);
 beatrice=reach(beatrice,'main');
 const beat=pull(beatrice,0,'REZ-1-076');
 beatrice.players[0].front[0]=beat;
 const outsideSubaru=pull(beatrice,0,'REZ-1-068');
 beatrice.players[0].outside.push(outsideSubaru);
 const mid=pull(beatrice,1,'REZ-1-088');
 mid.buffs=[{bp:1000,untilTurn:beatrice.turn}];
 const over4=pull(beatrice,1,'REZ-1-088');
 over4.buffs=[{bp:1500,untilTurn:beatrice.turn}];
 placeFront(beatrice,1,[mid,over4]);
 [beatrice]=castEvent(beatrice,'REZ-1-096');
 assert.equal(beatrice.pending.limit,4000);
 assert.deepEqual(legalUniversalActions(packs,beatrice).map(a=>a.uid),[mid.uid]);
 beatrice=dispatchUniversalAction(packs,beatrice,{type:'chooseRetireBp',uid:mid.uid});
 assert.equal(beatrice.players[1].front[0],null);
 assert.equal(beatrice.players[1].front[1]?.uid,over4.uid);
 assert.equal(assertUniversalMatch(packs,beatrice),true);

 let both=mina(5803);
 fuel(both,['REZ-1-086','REZ-1-086','REZ-1-086']);
 both=reach(both,'main');
 const beat2=pull(both,0,'REZ-1-076');
 const sub=pull(both,0,'REZ-1-068');
 both.players[0].energy[3]=beat2;
 both.players[0].front[0]=sub;
 const cap=pull(both,1,'REZ-1-088');
 cap.buffs=[{bp:2000,untilTurn:both.turn}];
 const over5=pull(both,1,'REZ-1-088');
 over5.buffs=[{bp:2001,untilTurn:both.turn}];
 placeFront(both,1,[cap,over5]);
 [both]=castEvent(both,'REZ-1-096');
 assert.equal(both.pending.limit,5000);
 assert.deepEqual(legalUniversalActions(packs,both).map(a=>a.uid),[cap.uid]);
 both=dispatchUniversalAction(packs,both,{type:'chooseRetireBp',uid:cap.uid});
 assert.equal(both.players[1].front[0],null);
 assert.equal(both.players[1].front[1]?.uid,over5.uid);
 assert.equal(assertUniversalMatch(packs,both),true);

 let blocked=mina(5804);
 fuel(blocked,['REZ-1-086','REZ-1-086','REZ-1-086']);
 blocked=reach(blocked,'main');
 const huge=pull(blocked,1,'REZ-1-088');
 huge.buffs=[{bp:3000,untilTurn:blocked.turn}];
 blocked.players[1].front[0]=huge;
 const card=pull(blocked,0,'REZ-1-096');
 blocked.players[0].hand.push(card);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===card.uid),false);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

const oathCounts={
 ...Object.fromEntries(['REZ-1-062','REZ-1-016','REZ-1-043','REZ-1-007','REZ-1-008',
  'REZ-1-012','REZ-1-013','REZ-1-014','REZ-1-022','REZ-1-023','REZ-1-024','REZ-1-056'].map(id=>[id,4])),
 'REZ-1-029':2
};
const oath=seed=>newUniversalMatch(packs,{decks:[oathCounts,oathCounts],first:0,seed});
function stamp(s,card){
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.ready=true;
 return card;
}
function quietLife(s){
 const first=pull(s,1,'REZ-1-016'),second=pull(s,1,'REZ-1-016');
 while(s.players[1].life.length>5)s.players[1].deck.push(s.players[1].life.pop());
 s.players[1].life.unshift(first,second);
}
test('Testimony gives one field Rem BP and impact +1, then draws',()=>{
 assert.equal(Object.values(oathCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,oathCounts),[]);
 const shell={id:'OATH',name:'Oath',color:'blue',type:'event',energy:2,ap:1,bp:0,gen:0,
  traits:[],trigger:'active',implementation:'dsl',effects:{}};
 const printed={op:'buffNamedImpactDraw',name:'レム',bp:1000,impactPlus:1,draw:1};
 assert.throws(()=>createUniversalPack({id:'bad-oath',cards:[{...shell,type:'character',bp:2500,effects:{onPlay:[printed]}}]}),
  /event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-oath',cards:[{...shell,effects:{onPlay:[
  {...printed,name:'ラム'}]}}]}),/named impact draw/);

 let missing=oath(5901);
 fuel(missing,['REZ-1-043','REZ-1-043']);
 missing=reach(missing,'main');
 const held=pull(missing,0,'REZ-1-016');
 missing.players[0].hand.push(held);
 const parked=pull(missing,0,'REZ-1-016');
 missing.players[0].outside.push(parked);
 const foe=stamp(missing,pull(missing,1,'REZ-1-016'));
 missing.players[1].front[0]=foe;
 const absent=pull(missing,0,'REZ-1-062');
 missing.players[0].hand.push(absent);
 assert.equal(legalUniversalActions(packs,missing).some(a=>a.type==='event'&&a.uid===absent.uid),false);

 let live=oath(5902);
 fuel(live,['REZ-1-043','REZ-1-043']);
 live=reach(live,'main');
 const front=stamp(live,pull(live,0,'REZ-1-016'));
 const energyRem=stamp(live,pull(live,0,'REZ-1-016'));
 live.players[0].front[0]=front;
 live.players[0].energy[2]=energyRem;
 const bystander=pull(live,0,'REZ-1-007');
 live.players[0].front[1]=bystander;
 const handRem=pull(live,0,'REZ-1-016');
 live.players[0].hand.push(handRem);
 const spell=pull(live,0,'REZ-1-062');
 live.players[0].hand.push(spell);
 const deckAtPlay=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(live.pending.kind,'effect-named-impact');
 assert.equal(live.pending.optional,undefined);
 assert.deepEqual(legalUniversalActions(packs,live).map(a=>a.uid).sort(),[front.uid,energyRem.uid].sort());
 assert.equal(legalUniversalActions(packs,live).some(a=>a.uid===null||a.uid===handRem.uid||a.uid===bystander.uid),false);
 const choice=legalUniversalActions(packs,live).find(a=>a.uid===front.uid);
 assert.match(uiActionLabel(choice,{pack,state:live}),/本回合 BP\+1000 並獲得衝擊\+1/);
 const ai=chooseUniversalAiAction(packs,live,{difficulty:'normal'});
 assert.equal(ai.type,'chooseNamedImpact');
 assert.ok([front.uid,energyRem.uid].includes(ai.uid));
 live=dispatchUniversalAction(packs,live,choice);
 assert.equal(live.pending,null);
 assert.equal(live.players[0].deck.length,deckAtPlay-1);
 assert.equal(universalBp(packs,live,at(live,0,front.uid)),3500);
 assert.equal(universalImpact(packs,live,at(live,0,front.uid)),1);
 assert.deepEqual(at(live,0,front.uid).impactPlus,{turn:live.turn,stamp:front.fieldEntryStamp,amount:1});
 assert.equal(at(live,0,energyRem.uid).impactPlus,undefined);
 assert.equal(live.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===spell.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='rule'));
 assert.ok(live.zoneMoveEvents.some(e=>e.from==='deck'&&e.to==='hand'&&
  e.reason==='own-effect'&&e.sourceUid===spell.uid));
 const silenced=structuredClone(live);
 const silencedRem=at(silenced,0,front.uid);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:silencedRem.uid,targetUid:silencedRem.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(packs,silenced,silencedRem),0);
 silencedRem.impactGranted={turn:silenced.turn,stamp:silencedRem.fieldEntryStamp,amount:1};
 assert.equal(universalImpact(packs,silenced,silencedRem),1);
 quietLife(live);
 const oneLife=live.players[1].life.length;
 const wall=stamp(live,pull(live,1,'REZ-1-043'));
 live.players[1].front[0]=wall;
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>a.type==='next'));
 assert.equal(live.phase,'attack');
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:front.uid});
 live=dispatchUniversalAction(packs,live,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(live.players[1].life.length,oneLife-1);
 assert.equal(live.pending,null);
 assert.equal(live.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 assert.equal(live.publicReveals.length,1);
 live=ownMain(live,2);
 assert.equal(universalBp(packs,live,at(live,0,front.uid)),2500);
 assert.equal(at(live,0,front.uid).impactPlus,undefined);
 assert.equal(universalImpact(packs,live,at(live,0,front.uid)),0);
 assert.equal(assertUniversalMatch(packs,live),true);

 let doubled=oath(5903);
 fuel(doubled,['REZ-1-043','REZ-1-043']);
 doubled=reach(doubled,'main');
 const striker=stamp(doubled,pull(doubled,0,'REZ-1-016'));
 doubled.players[0].front[0]=striker;
 const oathCard=pull(doubled,0,'REZ-1-062');
 doubled.players[0].hand.push(oathCard);
 doubled=dispatchUniversalAction(packs,doubled,legalUniversalActions(packs,doubled).find(a=>a.type==='event'&&a.uid===oathCard.uid));
 doubled=dispatchUniversalAction(packs,doubled,{type:'chooseNamedImpact',uid:striker.uid});
 const body=at(doubled,0,striker.uid);
 body.impactGranted={turn:doubled.turn,stamp:body.fieldEntryStamp,amount:1};
 assert.equal(universalImpact(packs,doubled,body),2);
 quietLife(doubled);
 const twoLife=doubled.players[1].life.length;
 const weak=stamp(doubled,pull(doubled,1,'REZ-1-043'));
 doubled.players[1].front[0]=weak;
 doubled=dispatchUniversalAction(packs,doubled,legalUniversalActions(packs,doubled).find(a=>a.type==='next'));
 doubled=dispatchUniversalAction(packs,doubled,{type:'attack',uid:striker.uid});
 doubled=dispatchUniversalAction(packs,doubled,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(doubled.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(doubled.players[1].life.length,twoLife-2);
 assert.equal(doubled.pending,null);
 assert.equal(doubled.publicReveals.length,2);
 assert.equal(doubled.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 assert.equal(assertUniversalMatch(packs,doubled),true);
});

const badgeCounts={
 ...Object.fromEntries(['REZ-1-109','REZ-1-016','REZ-1-022','REZ-1-062','REZ-1-007',
  'REZ-1-008','REZ-1-012','REZ-1-013','REZ-1-014','REZ-1-023','REZ-1-024','REZ-1-043'].map(id=>[id,4])),
 'REZ-1-056':2
};
const badge=seed=>newUniversalMatch(packs,{decks:[badgeCounts,badgeCounts],first:0,seed});
test('the candidate insignia takes one trait or event, then readies AP only for the trait',()=>{
 assert.equal(Object.values(badgeCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,badgeCounts),[]);
 const shell={id:'BADGE',name:'Badge',color:'yellow',type:'event',energy:2,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-badge',cards:[{...shell,type:'character',bp:1000,effects:{onPlay:[
  {op:'searchTopTraitOrEventAp',count:5,trait:'王選候補者'}]}}]}),/event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-badge',cards:[{...shell,effects:{onPlay:[
  {op:'searchTopTraitOrEventAp',count:5,trait:'ラム'}]}}]}),/trait or event search/);

 let none=badge(6001);
 fuel(none,['REZ-1-016','REZ-1-016']);
 none=reach(none,'main');
 const plain=setTop(none,0,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-013','REZ-1-014']);
 const handBefore=none.players[0].hand.length;
 [none]=castEvent(none,'REZ-1-109');
 assert.equal(none.pending.kind,'effect-top-order');
 assert.equal(none.pending.recoverApAfter,undefined);
 none=order(none,plain.map(c=>c.uid));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.length,handBefore);
 assert.deepEqual(none.players[0].deck.slice(-5).map(c=>c.uid),plain.map(c=>c.uid));
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,none),true);

 let spellOnly=badge(6002);
 fuel(spellOnly,['REZ-1-016','REZ-1-016']);
 spellOnly=reach(spellOnly,'main');
 const windowEvent=setTop(spellOnly,0,['REZ-1-062','REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-013']);
 [spellOnly]=castEvent(spellOnly,'REZ-1-109');
 assert.equal(spellOnly.pending.kind,'effect-top-trait-event');
 assert.deepEqual(spellOnly.pending.choices,[windowEvent[0].uid]);
 const skip=legalUniversalActions(packs,spellOnly).find(a=>a.type==='chooseTopTraitEvent'&&a.uid===null);
 assert.equal(uiActionLabel(skip,{pack,state:spellOnly}),'不加入手牌，將其餘卡排列至底部');
 spellOnly=dispatchUniversalAction(packs,spellOnly,{type:'chooseTopTraitEvent',uid:windowEvent[0].uid});
 assert.equal(spellOnly.pending.kind,'effect-top-order');
 assert.equal(spellOnly.pending.recoverApAfter,undefined);
 assert.ok(spellOnly.players[0].hand.some(c=>c.uid===windowEvent[0].uid));
 assert.equal(spellOnly.publicReveals.at(-1).uid,windowEvent[0].uid);
 spellOnly=order(spellOnly,windowEvent.slice(1).map(c=>c.uid));
 assert.equal(spellOnly.pending,null);
 assert.equal(spellOnly.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,spellOnly),true);

 let trait=badge(6003);
 fuel(trait,['REZ-1-016','REZ-1-016']);
 trait=reach(trait,'main');
 const windowTrait=setTop(trait,0,['REZ-1-022','REZ-1-062','REZ-1-007','REZ-1-008','REZ-1-012']);
 [trait]=castEvent(trait,'REZ-1-109');
 assert.deepEqual(trait.pending.choices.map(uid=>uid).sort(),[windowTrait[0].uid,windowTrait[1].uid].sort());
 const take=legalUniversalActions(packs,trait).find(a=>a.uid===windowTrait[0].uid);
 assert.match(uiActionLabel(take,{pack,state:trait}),/公開 .+ 並加入手牌/);
 assert.equal(chooseUniversalAiAction(packs,trait,'normal').uid,windowTrait[0].uid);
 trait=dispatchUniversalAction(packs,trait,take);
 assert.equal(trait.pending.recoverApAfter,true);
 trait=order(trait,windowTrait.slice(1).map(c=>c.uid));
 assert.equal(trait.pending.kind,'effect-recover-ap');
 const ap=trait.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 trait=dispatchUniversalAction(packs,trait,{type:'chooseApRecovery',uid:ap.uid});
 assert.equal(trait.pending,null);
 assert.equal(trait.players[0].apCards.find(c=>c.uid===ap.uid).ready,true);
 assert.equal(trait.players[0].deck.slice(-4).map(c=>c.uid).join(),windowTrait.slice(1).map(c=>c.uid).join());
 assert.equal(assertUniversalMatch(packs,trait),true);

 let declined=badge(6004);
 fuel(declined,['REZ-1-016','REZ-1-016']);
 declined=reach(declined,'main');
 const offered=setTop(declined,0,['REZ-1-022','REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-013']);
 [declined]=castEvent(declined,'REZ-1-109');
 declined=dispatchUniversalAction(packs,declined,{type:'chooseTopTraitEvent',uid:null});
 assert.equal(declined.pending.kind,'effect-top-order');
 assert.equal(declined.pending.recoverApAfter,undefined);
 declined=order(declined,offered.map(c=>c.uid));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===offered[0].uid),false);
 assert.equal(declined.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

const emiliaEnergyCounts={
 ...Object.fromEntries(['REZ-1-085','REZ-1-098','REZ-1-088','REZ-1-086','REZ-1-081',
  'REZ-1-068','REZ-1-105','REZ-1-016','REZ-1-072','REZ-1-073','REZ-1-079','REZ-1-080'].map(id=>[id,4])),
 'REZ-1-075':2
};
const emiliaEnergy=seed=>newUniversalMatch(packs,{decks:[emiliaEnergyCounts,emiliaEnergyCounts],first:0,seed});
function restEmilia(s,uid){
 const trial=pull(s,0,'REZ-1-098');
 s.players[0].hand.push(trial);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===trial.uid));
 const dumped=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:dumped.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontAp',uid});
 if(s.pending?.kind==='effect-recover-ap'){
  const ap=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:ap.uid});
 }
 return s;
}
test('Emilia discounts the next hand Emilia by one purple only after her own effect rests her',()=>{
 assert.equal(Object.values(emiliaEnergyCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaEnergyCounts),[]);
 const shell={id:'EM2',name:'Emilia',color:'purple',type:'character',energy:2,ap:1,bp:3000,gen:0,
  traits:['王選候補者'],trigger:'draw',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-em-energy',cards:[{...shell,effects:{onPlay:[
  {op:'discountNextNamedHandEnergy',name:'エミリア',color:'purple',amount:1}]}}]}),/front main ability/);
 assert.throws(()=>createUniversalPack({id:'bad-em-energy',cards:[{...shell,mainAbility:{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
  then:[{op:'discountNextNamedHandEnergy',name:'レム',color:'purple',amount:1}]}}]}),/unsupported main action/);
 let quiet=emiliaEnergy(6101);
 fuel(quiet,['REZ-1-086','REZ-1-086']);
 quiet=ownMain(quiet,2);
 let holder;
 [quiet,holder]=playFront(quiet,'REZ-1-085');
 const costly=pull(quiet,0,'REZ-1-088');
 quiet.players[0].hand.push(costly);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),3);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.uid===costly.uid),false);
 at(quiet,0,holder.uid).ready=true;
 assert.equal(frontOnce(quiet,holder.uid),false);
 at(quiet,0,holder.uid).ready=false;
 assert.equal(frontOnce(quiet,holder.uid),false);
 at(quiet,0,holder.uid).ready=true;
 quiet=restEmilia(quiet,holder.uid);
 assert.equal(at(quiet,0,holder.uid).ready,false);
 const heldSlot=quiet.players[0].front.findIndex(c=>c?.uid===holder.uid);
 const held=quiet.players[0].front[heldSlot];
 quiet.players[0].front[heldSlot]=null;
 quiet.players[0].energy[2]=held;
 assert.equal(frontOnce(quiet,holder.uid),false);
 quiet.players[0].energy[2]=null;
 quiet.players[0].front[heldSlot]=held;
 const act=legalUniversalActions(packs,quiet).find(a=>a.type==='activate'&&a.uid===holder.uid);
 assert.equal(uiActionLabel(act,{pack,state:quiet}),'起動主要：下一張從手牌使用的愛蜜莉雅，能源需求減少紫 1');
 quiet=dispatchUniversalAction(packs,quiet,act);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),2);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-105']),2);
 assert.ok(legalUniversalActions(packs,quiet).some(a=>a.type==='play'&&a.uid===costly.uid&&a.line==='front'));
 const zero=pull(quiet,0,'REZ-1-081');
 quiet.players[0].hand.push(zero);
 quiet=dispatchUniversalAction(packs,quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='play'&&a.uid===zero.uid&&a.line==='front'));
 assert.equal(quiet.players[0].nextNamedHandEnergy.length,0);
 assert.equal(effectiveHandRequiredEnergy(pack,quiet,0,pack.cards['REZ-1-088']),3);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.uid===costly.uid),false);
 assert.equal(assertUniversalMatch(packs,quiet),true);

 let kept=emiliaEnergy(6102);
 fuel(kept,['REZ-1-086','REZ-1-086']);
 kept=ownMain(kept,2);
 let source;
 [kept,source]=playFront(kept,'REZ-1-085');
 at(kept,0,source.uid).ready=true;
 kept=restEmilia(kept,source.uid);
 kept=dispatchUniversalAction(packs,kept,legalUniversalActions(packs,kept).find(a=>a.type==='activate'&&a.uid===source.uid));
 const yellow=pull(kept,0,'REZ-1-105');
 kept.players[0].hand.push(yellow);
 assert.equal(legalUniversalActions(packs,kept).some(a=>a.type==='play'&&a.uid===yellow.uid),false);
 const yellowFuel=pull(kept,0,'REZ-1-016');
 yellowFuel.ready=true;
 kept.players[0].energy[2]=yellowFuel;
 const yellowFuel2=pull(kept,0,'REZ-1-016');
 yellowFuel2.ready=true;
 kept.players[0].energy[3]=yellowFuel2;
 assert.equal(effectiveHandRequiredEnergy(pack,kept,0,pack.cards['REZ-1-105']),2);
 kept=dispatchUniversalAction(packs,kept,legalUniversalActions(packs,kept).find(a=>a.type==='play'&&a.uid===yellow.uid&&a.line==='front'));
 assert.equal(kept.players[0].nextNamedHandEnergy.length,0);
 const later=pull(kept,0,'REZ-1-088');
 kept.players[0].hand.push(later);
 assert.equal(effectiveHandRequiredEnergy(pack,kept,0,pack.cards['REZ-1-088']),3);
 assert.equal(assertUniversalMatch(packs,kept),true);

 let expired=emiliaEnergy(6103);
 fuel(expired,['REZ-1-086','REZ-1-086']);
 expired=ownMain(expired,2);
 let timed;
 [expired,timed]=playFront(expired,'REZ-1-085');
 at(expired,0,timed.uid).ready=true;
 expired=restEmilia(expired,timed.uid);
 expired=dispatchUniversalAction(packs,expired,legalUniversalActions(packs,expired).find(a=>a.type==='activate'&&a.uid===timed.uid));
 const bystander=pull(expired,0,'REZ-1-068');
 expired.players[0].hand.push(bystander);
 expired=dispatchUniversalAction(packs,expired,legalUniversalActions(packs,expired).find(a=>a.type==='play'&&a.uid===bystander.uid&&a.line==='front'));
 assert.equal(expired.players[0].nextNamedHandEnergy.length,1);
 assert.equal(effectiveHandRequiredEnergy(pack,expired,0,pack.cards['REZ-1-088']),2);
 expired=ownMain(expired,3);
 assert.equal(expired.players[0].nextNamedHandEnergy.length,0);
 assert.equal(effectiveHandRequiredEnergy(pack,expired,0,pack.cards['REZ-1-088']),3);
 const slot=expired.players[0].front.findIndex(c=>c?.uid===timed.uid);
 const parked=expired.players[0].front[slot];
 expired.players[0].front[slot]=null;
 expired.players[0].energy[2]=parked;
 assert.equal(frontOnce(expired,timed.uid),false);
 assert.equal(assertUniversalMatch(packs,expired),true);
});

const monsterCounts={
 ...Object.fromEntries(['REZ-1-065','REZ-1-045','REZ-1-043','REZ-1-014','REZ-1-007',
  'REZ-1-008','REZ-1-012','REZ-1-022','REZ-1-036','REZ-1-056','REZ-1-024'].map(id=>[id,4])),
 'REZ-1-017':2,'REZ-1-029':2,'REZ-1-075':2
};
const monster=seed=>newUniversalMatch(packs,{decks:[monsterCounts,monsterCounts],first:0,seed});
test('a revealed monster event counts as BP 4000 and retires only a front character of at least 4500',()=>{
 assert.equal(Object.values(monsterCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,monsterCounts),[]);
 const shell={id:'MIN',name:'Gate',color:'blue',type:'event',energy:4,ap:1,bp:0,gen:0,
  traits:[],trigger:'draw',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-min',cards:[{...shell,type:'character',bp:1000,effects:{onPlay:[
  {op:'retireOppFrontAtLeastBp',bp:4500}]}}]}),/event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-min',cards:[{...shell,effects:{onPlay:[
  {op:'retireOppFrontAtLeastBp',bp:3000}]}}]}),/unsupported minimum front retirement/);
 assert.equal(V2_PENDING_LABELS['effect-retire-at-least'],'選擇 BP 4500 以上的對手前線並使其退場');

 let shown=monster(6201);
 shown=reach(shown,'main');
 let actor;
 [shown,actor]=playFront(shown,'REZ-1-045');
 const revealed=pull(shown,0,'REZ-1-065');
 const small=pull(shown,0,'REZ-1-014');
 const kept=shown.players[0].hand.filter(c=>c.uid!==revealed.uid&&c.uid!==small.uid);
 shown.players[0].outside.push(...kept);
 shown.players[0].hand=[revealed,small];
 shown=dispatchUniversalAction(packs,shown,revealAct(shown,actor.uid));
 assert.equal(chooseUniversalAiAction(packs,shown).uid,revealed.uid);
 shown=dispatchUniversalAction(packs,shown,{type:'chooseRevealBottom',uid:revealed.uid});
 assert.equal(shown.players[0].deck.at(-1).uid,revealed.uid);
 assert.equal(shown.publicReveals.at(-1).cardId,'REZ-1-065');
 assert.equal(universalBp(packs,shown,at(shown,0,actor.uid)),4000);
 assert.equal(assertUniversalMatch(packs,shown),true);

 let plain=monster(6202);
 plain=reach(plain,'main');
 [plain,actor]=playFront(plain,'REZ-1-045');
 const spell=pull(plain,0,'REZ-1-029');
 plain.players[0].hand.push(spell);
 plain=dispatchUniversalAction(packs,plain,revealAct(plain,actor.uid));
 plain=dispatchUniversalAction(packs,plain,{type:'chooseRevealBottom',uid:spell.uid});
 assert.equal(plain.players[0].deck.at(-1).cardId,'REZ-1-029');
 assert.equal(universalBp(packs,plain,at(plain,0,actor.uid)),1500);

 let short=monster(6203);
 fuel(short,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 short=reach(short,'main');
 assert.equal(universalEnergyByColor(packs,short,0).blue,4);
 const low=pull(short,1,'REZ-1-017');
 short.players[1].front[0]=low;
 const waiting=pull(short,0,'REZ-1-065');
 short.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,short).some(a=>a.type==='event'&&a.uid===waiting.uid),false);
 low.buffs=[{bp:500,untilTurn:short.turn}];
 assert.equal(universalBp(packs,short,low),4500);
 const side=pull(short,1,'REZ-1-075');
 short.players[1].front[1]=side;
 assert.equal(universalBp(packs,short,side),4000);
 assert.ok(legalUniversalActions(packs,short).some(a=>a.type==='event'&&a.uid===waiting.uid));
 let paid;
 [paid]=castEvent(short,'REZ-1-065');
 assert.equal(paid.pending.kind,'effect-retire-at-least');
 assert.equal(paid.pending.floor,4500);
 assert.deepEqual(paid.pending.choices,[low.uid]);
 const choices=legalUniversalActions(packs,paid);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.equal(choices.length,1);
 const take=choices[0];
 assert.equal(uiActionLabel(take,{pack,state:paid}),'使 レム 退場');
 const forged=structuredClone(paid);
 forged.pending.floor=4000;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid minimum-BP retirement pending/);
 paid=dispatchUniversalAction(packs,paid,take);
 assert.equal(paid.pending,null);
 assert.ok(paid.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(paid.players[1].front[1]?.uid,side.uid);
 assert.ok(paid.players[0].outside.some(c=>c.cardId==='REZ-1-065'));
 assert.ok(paid.zoneMoveEvents.some(e=>e.cardId==='REZ-1-065'&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='rule'));
 assert.equal(assertUniversalMatch(packs,paid),true);
});

const remFrontCounts={
 ...Object.fromEntries(['REZ-1-104','REZ-1-007','REZ-1-005','REZ-1-012','REZ-1-014',
  'REZ-1-008','REZ-1-009','REZ-1-013','REZ-1-022','REZ-1-023','REZ-1-028','REZ-1-103'].map(id=>[id,4])),
 'REZ-1-024':2
};
const remFront=seed=>newUniversalMatch(packs,{decks:[remFrontCounts,remFrontCounts],first:0,seed});
test('Rem enters active, lowers up to two fronts of at least 1500, and draws when a front is below its printed BP',()=>{
 assert.equal(Object.values(remFrontCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,remFrontCounts),[]);
 const shell={id:'REM104',name:'Gate',color:'yellow',type:'character',energy:4,ap:2,bp:4000,gen:1,
  traits:[],trigger:'active',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,effects:{onPlay:[
  {op:'drawIfOppFrontBelowPrinted',count:1}]}}]}),/onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,effects:{onAttack:[
  {op:'drawIfOppFrontBelowPrinted',count:2}]}}]}),/front printed-BP/);
 assert.equal(pack.cards['REZ-1-005'].bp,500);
 assert.equal(pack.cards['REZ-1-012'].bp,1500);
 assert.equal(pack.cards['REZ-1-014'].bp,2500);

 let live=remFront(6301);
 fuel(live,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 live=ownMain(live,2);
 assert.equal(universalEnergyByColor(packs,live,0).yellow,4);
 assert.equal(live.players[0].apCards.filter(c=>c.ready).length,2);
 const small=pull(live,1,'REZ-1-005');
 const mid=pull(live,1,'REZ-1-012');
 const tall=pull(live,1,'REZ-1-014');
 const parked=pull(live,1,'REZ-1-014');
 mid.ready=true;
 live.players[1].front[0]=small;
 live.players[1].front[1]=mid;
 live.players[1].front[2]=tall;
 live.players[1].energy[0]=parked;
 let rem;
 [live,rem]=playFront(live,'REZ-1-104');
 assert.equal(at(live,0,rem.uid).ready,true);
 assert.equal(live.pending.kind,'effect-target-many');
 assert.equal(live.pending.maxTargets,2);
 assert.equal(live.pending.zone,'front');
 assert.deepEqual(live.pending.choices.slice().sort(),[mid.uid,tall.uid].sort());
 assert.equal(legalUniversalActions(packs,live).some(a=>a.uid===small.uid||a.uid===parked.uid),false);
 live=dispatchUniversalAction(packs,live,{type:'chooseTargetMany',uid:mid.uid});
 assert.equal(live.pending.kind,'effect-target-many');
 assert.deepEqual(live.pending.selected,[mid.uid]);
 live=dispatchUniversalAction(packs,live,{type:'chooseTargetMany',uid:tall.uid});
 assert.equal(live.pending,null);
 assert.equal(universalBp(packs,live,at(live,1,mid.uid)),500);
 assert.equal(universalBp(packs,live,at(live,1,tall.uid)),1500);
 assert.equal(universalBp(packs,live,at(live,1,small.uid)),500);
 assert.equal(universalBp(packs,live,parked),2500);
 const drawn=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>a.type==='next'));
 assert.equal(live.phase,'attack');
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:rem.uid});
 assert.equal(live.pending.kind,'block');
 assert.equal(live.players[0].deck.length,drawn-1);
 live=dispatchUniversalAction(packs,live,{type:'chooseBlock',uid:mid.uid},{actor:1});
 assert.equal(assertUniversalMatch(packs,live),true);

 let skipped=remFront(6302);
 fuel(skipped,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 skipped=ownMain(skipped,2);
 const printed=pull(skipped,1,'REZ-1-014');
 const line=pull(skipped,1,'REZ-1-012');
 line.buffs=[{bp:-500,untilTurn:skipped.turn}];
 skipped.players[1].front[0]=printed;
 skipped.players[1].energy[0]=line;
 let quiet;
 [skipped,quiet]=playFront(skipped,'REZ-1-104');
 assert.equal(at(skipped,0,quiet.uid).ready,true);
 assert.equal(skipped.pending.kind,'effect-target-many');
 assert.deepEqual(skipped.pending.choices,[printed.uid]);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseTargetMany',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,printed),2500);
 assert.equal(universalBp(packs,skipped,line),1000);
 const still=skipped.players[0].deck.length;
 skipped=dispatchUniversalAction(packs,skipped,legalUniversalActions(packs,skipped).find(a=>a.type==='next'));
 skipped=dispatchUniversalAction(packs,skipped,{type:'attack',uid:quiet.uid});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.players[0].deck.length,still);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let empty=remFront(6303);
 fuel(empty,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 empty=ownMain(empty,2);
 const under=pull(empty,1,'REZ-1-005');
 empty.players[1].front[0]=under;
 let alone;
 [empty,alone]=playFront(empty,'REZ-1-104');
 assert.equal(at(empty,0,alone.uid).ready,true);
 assert.equal(empty.pending,null);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

const bladeCounts={
 ...Object.fromEntries(['REZ-1-066','REZ-1-043','REZ-1-055','REZ-1-045','REZ-1-008',
  'REZ-1-014','REZ-1-007','REZ-1-012','REZ-1-022','REZ-1-065','REZ-1-024','REZ-1-075'].map(id=>[id,4])),
 'REZ-1-029':2
};
const blade=seed=>newUniversalMatch(packs,{decks:[bladeCounts,bladeCounts],first:0,seed});
test('Hundred-Man Slash requires Crusch, retires BP 5000 or less, and may add 1000 when a hand character BP is referenced',()=>{
 assert.equal(Object.values(bladeCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,bladeCounts),[]);
 const shell={id:'BLADE',name:'Gate',color:'blue',type:'event',energy:4,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-blade',cards:[{...shell,type:'character',bp:1000,effects:{onPlay:[
  {op:'retireOppFrontAtMostBp',bp:5000}]}}]}),/event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-blade',cards:[{...shell,effects:{onPlay:[
  {op:'retireOppFrontAtMostBp',bp:3000}]}}]}),/maximum front retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-blade',cards:[{...shell,effects:{onPlay:[
  {op:'grantHandCharacterBpMay',amount:500}]}}]}),/hand character BP option/);
 assert.equal(V2_PENDING_LABELS['effect-retire-at-most'],'選擇 BP 5000 以下的對手前線並使其退場');
 assert.equal(V2_PENDING_LABELS['effect-hand-bp-may'],'這次參照手牌角色 BP 時，是否視為 +1000');

 let locked=blade(6401);
 fuel(locked,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 locked=reach(locked,'main');
 const open=pull(locked,1,'REZ-1-014');
 locked.players[1].front[0]=open;
 const waiting=pull(locked,0,'REZ-1-066');
 locked.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,locked).some(a=>a.type==='event'&&a.uid===waiting.uid),false);
 const crusch=pull(locked,0,'REZ-1-055');
 locked.players[0].front[0]=crusch;
 const huge=pull(locked,1,'REZ-1-008');
 huge.buffs=[{bp:2500,untilTurn:locked.turn}];
 locked.players[1].deck.push(open);
 locked.players[1].front[0]=huge;
 assert.equal(universalBp(packs,locked,huge),5500);
 assert.equal(legalUniversalActions(packs,locked).some(a=>a.type==='event'&&a.uid===waiting.uid),false);

 let live=blade(6402);
 fuel(live,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 live=ownMain(live,2);
 const named=pull(live,0,'REZ-1-055');
 const readers=[0,1,2].map(()=>stamp(live,pull(live,0,'REZ-1-045')));
 placeFront(live,0,[named,...readers]);
 const exact=pull(live,1,'REZ-1-014');
 exact.buffs=[{bp:2500,untilTurn:live.turn}];
 const over=pull(live,1,'REZ-1-008');
 over.buffs=[{bp:2500,untilTurn:live.turn}];
 const lined=pull(live,1,'REZ-1-012');
 live.players[1].front[0]=exact;
 live.players[1].front[1]=over;
 live.players[1].energy[0]=lined;
 assert.equal(universalEnergyByColor(packs,live,0).blue,4);
 let paid;
 [paid]=castEvent(live,'REZ-1-066');
 assert.equal(paid.pending.kind,'effect-retire-at-most');
 assert.equal(paid.pending.ceiling,5000);
 assert.deepEqual(paid.pending.choices,[exact.uid]);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===null||a.uid===over.uid||a.uid===lined.uid),false);
 const take=legalUniversalActions(packs,paid).find(a=>a.uid===exact.uid);
 assert.equal(uiActionLabel(take,{pack,state:paid}),'使 レム 退場');
 assert.equal(chooseUniversalAiAction(packs,paid).uid,exact.uid);
 const forged=structuredClone(paid);
 forged.pending.ceiling=4000;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid maximum-BP retirement pending/);
 paid=dispatchUniversalAction(packs,paid,take);
 assert.equal(paid.pending,null);
 assert.ok(paid.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(paid.players[1].front[1]?.uid,over.uid);
 assert.equal(paid.players[0].handCharacterBpMay.amount,1000);
 assert.equal(paid.players[0].handCharacterBpMay.turn,paid.turn);
 const forgedFlag=structuredClone(paid);
 forgedFlag.players[0].handCharacterBpMay.amount=2000;
 assert.throws(()=>assertUniversalMatch(packs,forgedFlag),/Forged hand character BP option/);
 const lowCard=pull(paid,0,'REZ-1-014');
 const monster=pull(paid,0,'REZ-1-065');
 const border=pull(paid,0,'REZ-1-008');
 const kept=paid.players[0].hand.filter(c=>![lowCard.uid,monster.uid,border.uid].includes(c.uid));
 paid.players[0].outside.push(...kept,monster);
 paid.players[0].hand=[border,lowCard];
 paid=dispatchUniversalAction(packs,paid,revealAct(paid,readers[0].uid));
 assert.equal(chooseUniversalAiAction(packs,paid).uid,border.uid);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRevealBottom',uid:border.uid});
 assert.equal(paid.pending.kind,'effect-hand-bp-may');
 assert.equal(paid.pending.baseBp,3000);
 assert.equal(uiActionLabel(legalUniversalActions(packs,paid).find(a=>a.mode==='decline'),{pack,state:paid}),'維持原本 BP');
 assert.equal(chooseUniversalAiAction(packs,paid).mode,'accept');
 paid=dispatchUniversalAction(packs,paid,{type:'chooseHandBpMay',mode:'decline'});
 assert.equal(paid.pending,null);
 assert.equal(universalBp(packs,paid,at(paid,0,readers[0].uid)),1500);
 assert.equal(paid.players[0].deck.at(-1).uid,border.uid);
 paid=dispatchUniversalAction(packs,paid,revealAct(paid,readers[1].uid));
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRevealBottom',uid:lowCard.uid});
 assert.equal(paid.pending,null);
 assert.equal(universalBp(packs,paid,at(paid,0,readers[1].uid)),1500);
 const held=paid.players[0].outside.findIndex(c=>c.uid===monster.uid);
 paid.players[0].hand.push(paid.players[0].outside.splice(held,1)[0]);
 paid=dispatchUniversalAction(packs,paid,revealAct(paid,readers[2].uid));
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRevealBottom',uid:monster.uid});
 assert.equal(paid.pending,null);
 assert.equal(universalBp(packs,paid,at(paid,0,readers[2].uid)),4000);
 assert.equal(assertUniversalMatch(packs,paid),true);

 let accepted=blade(6403);
 fuel(accepted,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 accepted=ownMain(accepted,2);
 const lady=pull(accepted,0,'REZ-1-055');
 const reader=stamp(accepted,pull(accepted,0,'REZ-1-045'));
 placeFront(accepted,0,[lady,reader]);
 const victim=pull(accepted,1,'REZ-1-012');
 accepted.players[1].front[0]=victim;
 [accepted]=castEvent(accepted,'REZ-1-066');
 accepted=dispatchUniversalAction(packs,accepted,{type:'chooseRetireAtMost',uid:victim.uid});
 const shown=pull(accepted,0,'REZ-1-008');
 accepted.players[0].hand.push(shown);
 accepted=dispatchUniversalAction(packs,accepted,revealAct(accepted,reader.uid));
 accepted=dispatchUniversalAction(packs,accepted,{type:'chooseRevealBottom',uid:shown.uid});
 assert.equal(accepted.pending.kind,'effect-hand-bp-may');
 accepted=dispatchUniversalAction(packs,accepted,{type:'chooseHandBpMay',mode:'accept'});
 assert.equal(universalBp(packs,accepted,at(accepted,0,reader.uid)),4000);
 accepted=ownMain(accepted,3);
 assert.equal(accepted.players[0].handCharacterBpMay,null);
 const later=pull(accepted,0,'REZ-1-008');
 accepted.players[0].hand.push(later);
 accepted=dispatchUniversalAction(packs,accepted,revealAct(accepted,reader.uid));
 accepted=dispatchUniversalAction(packs,accepted,{type:'chooseRevealBottom',uid:later.uid});
 assert.equal(accepted.pending,null);
 assert.equal(universalBp(packs,accepted,at(accepted,0,reader.uid)),1500);
 assert.equal(assertUniversalMatch(packs,accepted),true);
});

const swordCounts={
 ...Object.fromEntries(['REZ-1-034','REZ-1-043','REZ-1-066','REZ-1-055','REZ-1-008',
  'REZ-1-014','REZ-1-012','REZ-1-065','REZ-1-075','REZ-1-007','REZ-1-022','REZ-1-024'].map(id=>[id,4])),
 'REZ-1-029':2
};
const sword=seed=>newUniversalMatch(packs,{decks:[swordCounts,swordCounts],first:0,seed});
function revealImpact(s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='revealBottomImpact'&&a.uid===uid);
}
test('Wilhelm may pay one AP on his turn to retire BP 4500, and gains impact from a revealed 4000 character',()=>{
 assert.equal(Object.values(swordCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,swordCounts),[]);
 const shell={id:'SWORD',name:'Gate',color:'blue',type:'character',energy:4,ap:1,bp:4000,gen:0,
  traits:[],trigger:'active',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-sword',cards:[{...shell,effects:{onPlay:[
  {op:'retireOppFrontAtLeastBp',bp:4500,optional:true}]}}]}),/paid follow-up/);
 assert.throws(()=>createUniversalPack({id:'bad-sword',cards:[{...shell,effects:{onPlay:[
  {op:'optionalPayApThen',ap:1,optional:true,ownTurn:false,then:[
   {op:'retireOppFrontAtLeastBp',bp:4500,optional:true}]}]}}]}),/optional AP payment/);
 assert.throws(()=>createUniversalPack({id:'bad-sword',cards:[{...shell,mainAbility:{
  op:'revealHandBottomImpact',oncePerTurn:true,minPrintedBp:4000,impact:2}}]}),/unsupported main/);

 let skipped=sword(6501);
 fuel(skipped,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 skipped=ownMain(skipped,2);
 const wall=pull(skipped,1,'REZ-1-075');
 wall.buffs=[{bp:500,untilTurn:skipped.turn}];
 skipped.players[1].front[0]=wall;
 let wilhelm;
 [skipped,wilhelm]=playFront(skipped,'REZ-1-034');
 assert.equal(skipped.pending.kind,'effect-optional-pay-ap');
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,1);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0]?.uid,wall.uid);
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,1);

 let empty=sword(6502);
 fuel(empty,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 empty=ownMain(empty,2);
 [empty]=playFront(empty,'REZ-1-034');
 empty=dispatchUniversalAction(packs,empty,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,empty),true);

 let paid=sword(6503);
 fuel(paid,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 paid=ownMain(paid,2);
 const tall=pull(paid,1,'REZ-1-075');
 tall.buffs=[{bp:500,untilTurn:paid.turn}];
 const short=pull(paid,1,'REZ-1-014');
 paid.players[1].front[0]=tall;
 paid.players[1].front[1]=short;
 [paid]=playFront(paid,'REZ-1-034');
 paid=dispatchUniversalAction(packs,paid,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.pending.kind,'effect-retire-at-least');
 assert.equal(paid.pending.optional,true);
 assert.deepEqual(paid.pending.choices,[tall.uid]);
 assert.equal(uiActionLabel(legalUniversalActions(packs,paid).find(a=>a.uid===null),{pack,state:paid}),'不使角色退場');
 const declined=dispatchUniversalAction(packs,structuredClone(paid),{type:'chooseRetireAtLeast',uid:null});
 assert.equal(declined.players[1].front[0]?.uid,tall.uid);
 const forged=structuredClone(paid);
 forged.pending.floor=4000;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid minimum-BP retirement pending/);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRetireAtLeast',uid:tall.uid});
 assert.ok(paid.players[1].outside.some(c=>c.uid===tall.uid));
 assert.equal(paid.players[1].front[1]?.uid,short.uid);
 assert.equal(assertUniversalMatch(packs,paid),true);

 let referenced=sword(6504);
 fuel(referenced,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 referenced=ownMain(referenced,2);
 const lady=pull(referenced,0,'REZ-1-055');
 referenced.players[0].front[0]=lady;
 const victim=pull(referenced,1,'REZ-1-012');
 referenced.players[1].front[0]=victim;
 [referenced]=castEvent(referenced,'REZ-1-066');
 referenced=dispatchUniversalAction(packs,referenced,{type:'chooseRetireAtMost',uid:victim.uid});
 let actor;
 [referenced,actor]=playFront(referenced,'REZ-1-034');
 assert.equal(referenced.pending,null);
 const border=pull(referenced,0,'REZ-1-008');
 referenced.players[0].hand.push(border);
 referenced=dispatchUniversalAction(packs,referenced,revealImpact(referenced,actor.uid));
 referenced=dispatchUniversalAction(packs,referenced,{type:'chooseRevealBottom',uid:border.uid});
 assert.equal(referenced.pending.kind,'effect-hand-bp-may');
 assert.equal(referenced.pending.impact,1);
 referenced=dispatchUniversalAction(packs,referenced,{type:'chooseHandBpMay',mode:'accept'});
 assert.equal(universalImpact(packs,referenced,at(referenced,0,actor.uid)),1);
 referenced=ownMain(referenced,3);
 assert.equal(universalImpact(packs,referenced,at(referenced,0,actor.uid)),0);
 assert.equal(assertUniversalMatch(packs,referenced),true);

 let plain=sword(6505);
 plain=ownMain(plain,2);
 const quiet=stamp(plain,pull(plain,0,'REZ-1-034'));
 plain.players[0].front[0]=quiet;
 const low=pull(plain,0,'REZ-1-008');
 plain.players[0].hand.push(low);
 plain=dispatchUniversalAction(packs,plain,revealImpact(plain,quiet.uid));
 plain=dispatchUniversalAction(packs,plain,{type:'chooseRevealBottom',uid:low.uid});
 assert.equal(plain.pending,null);
 assert.equal(universalImpact(packs,plain,at(plain,0,quiet.uid)),0);
 plain=ownMain(plain,3);
 const mid=pull(plain,0,'REZ-1-014');
 plain.players[0].hand.push(mid);
 plain=dispatchUniversalAction(packs,plain,revealImpact(plain,quiet.uid));
 plain=dispatchUniversalAction(packs,plain,{type:'chooseRevealBottom',uid:mid.uid});
 assert.equal(universalImpact(packs,plain,at(plain,0,quiet.uid)),0);
 plain=ownMain(plain,4);
 const monster=pull(plain,0,'REZ-1-065');
 plain.players[0].hand.push(monster);
 plain=dispatchUniversalAction(packs,plain,revealImpact(plain,quiet.uid));
 plain=dispatchUniversalAction(packs,plain,{type:'chooseRevealBottom',uid:monster.uid});
 assert.equal(plain.pending,null);
 assert.equal(universalImpact(packs,plain,at(plain,0,quiet.uid)),1);
 assert.equal(revealImpact(plain,quiet.uid),undefined);
 plain=ownMain(plain,5);
 assert.equal(universalImpact(packs,plain,at(plain,0,quiet.uid)),0);
 assert.equal(assertUniversalMatch(packs,plain),true);
});

const rickCounts={
 ...Object.fromEntries(['REZ-1-047','REZ-1-043','REZ-1-066','REZ-1-055','REZ-1-012','REZ-1-007',
  'REZ-1-008','REZ-1-014','REZ-1-022','REZ-1-024','REZ-1-075','REZ-1-065'].map(id=>[id,4])),
 'REZ-1-029':2
};
const rick=seed=>newUniversalMatch(packs,{decks:[rickCounts,rickCounts],first:0,seed});
function handPay(s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='handActivate'&&a.mode==='handPayReveal'&&a.uid===uid);
}
test('Ricardo pays one AP from hand, and rests into play only when the referenced BP reaches 4000',()=>{
 assert.equal(Object.values(rickCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,rickCounts),[]);
 const shell={id:'RICK',name:'Gate',color:'blue',type:'character',energy:3,ap:1,bp:3000,gen:0,
  traits:[],trigger:'active',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-rick',cards:[{...shell,mainAbility:{
  op:'handPayRevealDeploy',payAp:2,minReferencedBp:4000}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-rick',cards:[{...shell,mainAbility:{
  op:'handPayRevealDeploy',payAp:1,minReferencedBp:3000}}]}),/unsupported main/);
 assert.equal(V2_PENDING_LABELS['effect-hand-deploy-may'],'這次參照手牌角色 BP 時，是否視為 +1000 並休息登場');
 assert.equal(V2_PENDING_LABELS['effect-hand-rest-entry'],'選擇休息登場的位置');
 assert.equal(V2_PENDING_LABELS['effect-active-other'],'選擇最多 1 張其他己方角色並使其活動');

 let short=rick(6601);
 fuel(short,['REZ-1-043','REZ-1-043']);
 short=ownMain(short,1);
 const shortCard=pull(short,0,'REZ-1-047');
 short.players[0].hand.push(shortCard);
 assert.equal(universalEnergyByColor(packs,short,0).blue,2);
 assert.equal(handPay(short,shortCard.uid),undefined);

 let quiet=rick(6602);
 fuel(quiet,['REZ-1-043','REZ-1-043','REZ-1-043']);
 quiet=ownMain(quiet,1);
 const held=pull(quiet,0,'REZ-1-047');
 quiet.players[0].hand.push(held);
 assert.equal(quiet.players[0].apCards.filter(c=>c.ready).length,1);
 const pay=handPay(quiet,held.uid);
 assert.ok(pay);
 assert.equal(uiActionLabel(pay,{pack,state:quiet}),'支付 1 AP，公開這張手牌');
 const noAp=structuredClone(quiet);
 noAp.players[0].apCards.forEach(c=>{c.ready=false;});
 assert.equal(handPay(noAp,held.uid),undefined);
 quiet=dispatchUniversalAction(packs,quiet,pay);
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].hand.some(c=>c.uid===held.uid));
 assert.equal(quiet.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(quiet.publicReveals.at(-1).kind,'hand-activate');
 assert.equal(quiet.publicReveals.at(-1).cardId,'REZ-1-047');
 assert.ok(quiet.effectApPaidColors[0].includes('blue'));
 assert.equal(handPay(quiet,held.uid),undefined);
 assert.equal(assertUniversalMatch(packs,quiet),true);

 let twice=rick(6603);
 fuel(twice,['REZ-1-043','REZ-1-043','REZ-1-043']);
 twice=ownMain(twice,2);
 const repeat=pull(twice,0,'REZ-1-047');
 twice.players[0].hand.push(repeat);
 assert.equal(twice.players[0].apCards.filter(c=>c.ready).length,2);
 twice=dispatchUniversalAction(packs,twice,handPay(twice,repeat.uid));
 assert.equal(twice.pending,null);
 assert.ok(twice.players[0].hand.some(c=>c.uid===repeat.uid));
 assert.equal(twice.players[0].apCards.filter(c=>c.ready).length,1);
 twice=dispatchUniversalAction(packs,twice,handPay(twice,repeat.uid));
 assert.equal(twice.pending,null);
 assert.ok(twice.players[0].hand.some(c=>c.uid===repeat.uid));
 assert.equal(twice.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(twice.publicReveals.filter(r=>r.kind==='hand-activate'&&r.cardId==='REZ-1-047').length,2);
 assert.equal(assertUniversalMatch(packs,twice),true);

 let crowded=rick(6604);
 fuel(crowded,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-022']);
 crowded=ownMain(crowded,1);
 placeFront(crowded,0,[0,1,2,3].map(()=>pull(crowded,0,'REZ-1-007')));
 const boxed=pull(crowded,0,'REZ-1-047');
 crowded.players[0].hand.push(boxed);
 assert.ok(handPay(crowded,boxed.uid));
 crowded=dispatchUniversalAction(packs,crowded,handPay(crowded,boxed.uid));
 assert.equal(crowded.pending,null);
 assert.ok(crowded.players[0].hand.some(c=>c.uid===boxed.uid));
 assert.equal(crowded.players[0].front.filter(Boolean).length,4);
 assert.equal(assertUniversalMatch(packs,crowded),true);

 let offered=rick(6605);
 fuel(offered,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 offered=ownMain(offered,2);
 const lady=pull(offered,0,'REZ-1-055');
 lady.ready=false;
 offered.players[0].front[0]=lady;
 const victim=pull(offered,1,'REZ-1-012');
 offered.players[1].front[0]=victim;
 assert.equal(offered.players[0].apCards.filter(c=>c.ready).length,2);
 [offered]=castEvent(offered,'REZ-1-066');
 offered=dispatchUniversalAction(packs,offered,{type:'chooseRetireAtMost',uid:victim.uid});
 assert.equal(offered.players[0].handCharacterBpMay.amount,1000);
 assert.equal(offered.players[0].apCards.filter(c=>c.ready).length,1);
 const card=pull(offered,0,'REZ-1-047');
 offered.players[0].hand.push(card);
 const act=handPay(offered,card.uid);
 assert.ok(act);
 offered=dispatchUniversalAction(packs,offered,act);
 assert.equal(offered.pending.kind,'effect-hand-deploy-may');
 assert.equal(offered.pending.baseBp,3000);
 assert.equal(offered.pending.amount,1000);
 assert.equal(offered.pending.minBp,4000);
 assert.equal(offered.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(uiActionLabel(legalUniversalActions(packs,offered).find(a=>a.mode==='decline'),{pack,state:offered}),'維持原本 BP，留在手牌');
 assert.equal(uiActionLabel(legalUniversalActions(packs,offered).find(a=>a.mode==='accept'),{pack,state:offered}),'視為 BP+1000 並休息登場');
 assert.equal(chooseUniversalAiAction(packs,offered).mode,'accept');
 const forgedMay=structuredClone(offered);
 forgedMay.pending.baseBp=2000;
 assert.throws(()=>assertUniversalMatch(packs,forgedMay),/Invalid hand deployment option pending/);
 const declined=dispatchUniversalAction(packs,structuredClone(offered),{type:'chooseHandDeployMay',mode:'decline'});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].hand.some(c=>c.uid===card.uid));
 assert.equal(declined.players[0].front.some(c=>c?.uid===card.uid),false);
 assert.equal(handPay(declined,card.uid),undefined);
 offered=dispatchUniversalAction(packs,offered,{type:'chooseHandDeployMay',mode:'accept'});
 assert.equal(offered.pending.kind,'effect-hand-rest-entry');
 assert.equal(offered.pending.minBp,4000);
 const seats=legalUniversalActions(packs,offered);
 assert.ok(seats.some(a=>a.line==='front'&&a.replaceUid===undefined));
 assert.ok(seats.some(a=>a.line==='energy'&&a.replaceUid));
 assert.equal(uiActionLabel(seats[0],{pack,state:offered}),'休息登場');
 assert.equal(chooseUniversalAiAction(packs,offered).type,'chooseHandRestEntry');
 const forgedEntry=structuredClone(offered);
 forgedEntry.pending.minBp=3000;
 assert.throws(()=>assertUniversalMatch(packs,forgedEntry),/Invalid hand REST entry pending/);
 const seat=seats.find(a=>a.line==='front'&&a.replaceUid===undefined);
 offered=dispatchUniversalAction(packs,offered,seat);
 const entered=at(offered,0,card.uid);
 assert.equal(entered.ready,false);
 assert.ok(offered.players[0].front.some(c=>c?.uid===card.uid));
 assert.equal(offered.players[0].hand.some(c=>c.uid===card.uid),false);
 assert.equal(offered.pending.kind,'effect-active-other');
 assert.equal(offered.pending.optional,true);
 assert.equal(offered.pending.choices.includes(card.uid),false);
 assert.ok(offered.pending.choices.includes(lady.uid));
 assert.ok(offered.pending.choices.every(uid=>offered.players[0].energy.some(c=>c?.uid===uid)||uid===lady.uid));
 assert.equal(uiActionLabel(legalUniversalActions(packs,offered).find(a=>a.uid===null),{pack,state:offered}),'不使其他角色活動');
 assert.equal(uiActionLabel(legalUniversalActions(packs,offered).find(a=>a.uid===lady.uid),{pack,state:offered}),'使 クルシュ・カルステン 活動');
 assert.notEqual(chooseUniversalAiAction(packs,offered).uid,null);
 const forgedOther=structuredClone(offered);
 forgedOther.pending.optional=false;
 assert.throws(()=>assertUniversalMatch(packs,forgedOther),/Invalid other-character ACTIVE pending/);
 const skipped=dispatchUniversalAction(packs,structuredClone(offered),{type:'chooseActiveOther',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(at(skipped,0,lady.uid).ready,false);
 assert.equal(at(skipped,0,card.uid).ready,false);
 offered=dispatchUniversalAction(packs,offered,{type:'chooseActiveOther',uid:lady.uid});
 assert.equal(offered.pending,null);
 assert.equal(at(offered,0,lady.uid).ready,true);
 assert.equal(at(offered,0,card.uid).ready,false);
 assert.ok(offered.zoneMoveEvents.some(e=>e.uid===card.uid&&e.from==='hand'&&e.to==='front'&&e.reason==='own-effect'));
 assert.equal(assertUniversalMatch(packs,offered),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

const witchCounts={
 ...Object.fromEntries(['REZ-1-093','REZ-1-091','REZ-1-086','REZ-1-082','REZ-1-075','REZ-1-081',
  'REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022','REZ-1-043'].map(id=>[id,4])),
 'REZ-1-029':2
};
const witch=seed=>newUniversalMatch(packs,{decks:[witchCounts,witchCounts],first:0,seed});
test('Echidna raids onto Echidna, draws on entry, then rests one active front character to draw',()=>{
 assert.equal(Object.values(witchCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,witchCounts),[]);
 const shell={id:'WITCH',name:'エキドナ',color:'purple',type:'character',energy:4,ap:1,bp:4000,gen:0,
  traits:['魔女'],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-witch',cards:[{...shell,effects:{onPlay:[
  {op:'restOwnActiveFrontDraw'}]}}]}),/front main ability/);
 assert.throws(()=>createUniversalPack({id:'bad-witch',cards:[{...shell,trigger:'raid',raidName:'エキドナ',
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'restOwnActiveFrontDraw',count:1}]}}]}),/active front rest draw/);
 assert.equal(V2_PENDING_LABELS['effect-rest-own-front-draw'],'選擇 1 張自己的活動前線角色並使其休息');

 let live=witch(6701);
 [0,1,2].forEach(i=>{
  const gen=pull(live,0,'REZ-1-086');
  gen.ready=true;
  live.players[0].energy[i]=gen;
 });
 const base=pull(live,0,'REZ-1-091');
 live.players[0].energy[3]=base;
 const decoy=pull(live,0,'REZ-1-093');
 live.players[0].front[0]=decoy;
 const stranger=pull(live,0,'REZ-1-007');
 live.players[0].front[1]=stranger;
 live=ownMain(live,2);
 live.players[0].energy[3].ready=false;
 live.players[0].front[0].ready=false;
 live.players[0].front[1].ready=false;
 assert.equal(universalEnergyByColor(packs,live,0).purple,3);
 const waiting=pull(live,0,'REZ-1-093');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid),false);
 live.players[0].energy[0].buffs=[{energy:1,untilTurn:live.turn}];
 assert.equal(universalEnergyByColor(packs,live,0).purple,4);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===decoy.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===stranger.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 const top=at(live,0,waiting.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(top.stack[0].ready,false);
 assert.equal(live.players[0].energy[3],null);
 assert.equal(live.players[0].front.some(c=>c?.uid===waiting.uid),true);
 assert.equal(live.players[0].hand.some(c=>c.uid===waiting.uid),false);
 assert.equal(live.players[0].deck.length,before-1);
 assert.equal(live.pending,null);
 const quiet=structuredClone(live);
 at(quiet,0,waiting.uid).ready=false;
 assert.equal(frontOnce(quiet,waiting.uid),false);
 const other=stamp(live,pull(live,0,'REZ-1-081'));
 const open=live.players[0].front.findIndex(c=>!c);
 live.players[0].front[open]=other;
 const act=legalUniversalActions(packs,live).find(a=>a.type==='activate'&&a.mode==='frontOnce'&&a.uid===waiting.uid);
 assert.ok(act);
 const drawn=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,act);
 assert.equal(live.pending.kind,'effect-rest-own-front-draw');
 assert.deepEqual(live.pending.choices,[waiting.uid,other.uid]);
 assert.equal(uiActionLabel(legalUniversalActions(packs,live).find(a=>a.uid===waiting.uid),{pack,state:live}),'休息 エキドナ，然後抽 1 張');
 assert.ok([waiting.uid,other.uid].includes(chooseUniversalAiAction(packs,live).uid));
 const forged=structuredClone(live);
 forged.pending.choices=[waiting.uid];
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid own active front rest pending/);
 const restedOther=dispatchUniversalAction(packs,structuredClone(live),{type:'chooseRestOwnFrontDraw',uid:other.uid});
 assert.equal(at(restedOther,0,other.uid).ready,false);
 assert.equal(at(restedOther,0,waiting.uid).ready,true);
 assert.equal(restedOther.players[0].deck.length,drawn-1);
 assert.equal(frontOnce(restedOther,waiting.uid),false);
 assert.ok(restedOther.ownEffectRests[0].some(n=>n.uid===other.uid&&n.turn===restedOther.turn));
 live=dispatchUniversalAction(packs,live,{type:'chooseRestOwnFrontDraw',uid:waiting.uid});
 assert.equal(live.pending,null);
 assert.equal(at(live,0,waiting.uid).ready,false);
 assert.equal(at(live,0,other.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].ready,false);
 assert.equal(live.players[0].deck.length,drawn-1);
 assert.equal(frontOnce(live,waiting.uid),false);
 assert.ok(live.ownEffectRests[0].some(n=>n.uid===waiting.uid&&n.stamp===at(live,0,waiting.uid).fieldEntryStamp));
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,restedOther),true);

 let revealed=witch(6702);
 const attacker=pull(revealed,0,'REZ-1-007');
 attacker.ready=true;
 revealed.players[0].front[0]=attacker;
 [0,1,2,3].forEach(i=>{
  const gen=pull(revealed,1,'REZ-1-086');
  gen.ready=true;
  revealed.players[1].energy[i]=gen;
 });
 const buried=pull(revealed,1,'REZ-1-091');
 buried.ready=false;
 revealed.players[1].front[0]=buried;
 revealed.players[1].deck.push(revealed.players[1].life.pop());
 const trigger=pull(revealed,1,'REZ-1-093');
 revealed.players[1].life.unshift(trigger);
 revealed=ownMain(revealed,1);
 revealed=dispatchUniversalAction(packs,revealed,legalUniversalActions(packs,revealed).find(a=>a.type==='next'));
 assert.equal(revealed.phase,'attack');
 revealed=dispatchUniversalAction(packs,revealed,{type:'attack',uid:attacker.uid});
 assert.equal(revealed.pending.kind,'block');
 revealed=dispatchUniversalAction(packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.kind,'life-trigger');
 assert.equal(revealed.pending.trigger,'raid');
 const lifeActs=legalUniversalActions(packs,revealed);
 assert.ok(lifeActs.some(a=>a.mode==='get'));
 const lifeRaid=lifeActs.find(a=>a.mode==='raid'&&a.baseUid===buried.uid&&a.line==='front'&&a.slot===0);
 assert.ok(lifeRaid);
 const poor=structuredClone(revealed);
 poor.players[1].energy[0].ready=false;
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.mode==='raid'),false);
 assert.ok(legalUniversalActions(packs,poor).some(a=>a.mode==='get'));
 const apBefore=revealed.players[1].apCards.map(c=>c.ready);
 const lifeDeck=revealed.players[1].deck.length;
 const gained=dispatchUniversalAction(packs,structuredClone(revealed),{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(gained.players[1].hand.some(c=>c.uid===trigger.uid));
 assert.equal(gained.players[1].front[0].uid,buried.uid);
 assert.equal(gained.players[1].deck.length,lifeDeck);
 const skippedLife=dispatchUniversalAction(packs,structuredClone(revealed),{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.ok(skippedLife.players[1].outside.some(c=>c.uid===trigger.uid));
 revealed=dispatchUniversalAction(packs,revealed,lifeRaid,{actor:1});
 assert.equal(revealed.players[1].front[0].uid,trigger.uid);
 assert.equal(revealed.players[1].front[0].ready,true);
 assert.equal(revealed.players[1].front[0].stack[0].uid,buried.uid);
 assert.equal(revealed.players[1].deck.length,lifeDeck-1);
 assert.deepEqual(revealed.players[1].apCards.map(c=>c.ready),apBefore);
 assert.equal(frontOnce(revealed,trigger.uid),false);
 assert.equal(assertUniversalMatch(packs,revealed),true);
 assert.equal(assertUniversalMatch(packs,gained),true);
 assert.equal(assertUniversalMatch(packs,skippedLife),true);
});

function toAttack(s,player){
 let guard=0;
 while(!(s.active===player&&s.phase==='attack'&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
  }else{
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=dispatchUniversalAction(packs,s,next);
  }
  assert.ok(++guard<64,'attack did not open');
 }
 return s;
}
const subaruCounts={
 ...Object.fromEntries(['REZ-1-040','REZ-1-068','REZ-1-043','REZ-1-038','REZ-1-017','REZ-1-007',
  'REZ-1-012','REZ-1-014','REZ-1-022','REZ-1-008'].map(id=>[id,4])),
 'REZ-1-029':2,'REZ-1-016':4,'REZ-1-024':4
};
const subaru=seed=>newUniversalMatch(packs,{decks:[subaruCounts,subaruCounts],first:0,seed});
test('Subaru raids onto Subaru, draws, then may REST the raid base after retirement',()=>{
 assert.equal(Object.values(subaruCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,subaruCounts),[]);
 const shell={id:'SUBARU',name:'ナツキ・スバル',color:'blue',type:'character',energy:4,ap:1,bp:4000,gen:0,
  traits:[],trigger:'raid',raidName:'ナツキ・スバル',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-subaru',cards:[{...shell,effects:{onPlay:[
  {op:'deployOwnRaidBaseRest',optional:true}]}}]}),/character onRetire/);
 assert.throws(()=>createUniversalPack({id:'bad-subaru',cards:[{...shell,effects:{onRetire:[
  {op:'deployOwnRaidBaseRest'}]}}]}),/unsupported raid-base rest entry/);
 assert.equal(V2_PENDING_LABELS['effect-raid-base-rest'],'選擇是否將突襲來源以休息狀態登場');

 let live=subaru(6801);
 [0,1,2,3].forEach(i=>{
  const gen=pull(live,0,'REZ-1-043');
  gen.ready=true;
  live.players[0].energy[i]=gen;
 });
 const base=pull(live,0,'REZ-1-038');
 live.players[0].front[0]=base;
 const decoy=pull(live,0,'REZ-1-040');
 live.players[0].front[1]=decoy;
 const stranger=pull(live,0,'REZ-1-007');
 live.players[0].front[2]=stranger;
 const attacker=pull(live,1,'REZ-1-017');
 attacker.ready=true;
 live.players[1].front[0]=attacker;
 live=ownMain(live,2);
 live.players[0].front[0].ready=false;
 live.players[0].front[1].ready=false;
 live.players[0].front[2].ready=false;
 assert.equal(universalEnergyByColor(packs,live,0).blue,4);
 const waiting=pull(live,0,'REZ-1-040');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===decoy.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===stranger.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(at(live,0,waiting.uid).stack[0].ready,false);
 assert.equal(live.players[0].deck.length,before-1);
 assert.equal(live.pending,null);
 live=toAttack(live,1);
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:attacker.uid});
 assert.equal(live.pending.kind,'block');
 live=dispatchUniversalAction(packs,live,{type:'chooseBlock',uid:waiting.uid});
 assert.equal(live.pending.kind,'effect-raid-base-rest');
 assert.equal(live.pending.player,0);
 assert.equal(live.pending.baseUid,base.uid);
 assert.equal(live.pending.sourceUid,waiting.uid);
 const acts=legalUniversalActions(packs,live);
 assert.equal(uiActionLabel(acts.find(a=>a.uid===null),{pack,state:live}),'不使突襲來源登場');
 const deploy=acts.find(a=>a.type==='chooseRaidBaseRest'&&a.uid===base.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(deploy);
 assert.equal(uiActionLabel(deploy,{pack,state:live}),'將 ナツキ・スバル 以休息狀態放到前線 '+(deploy.slot+1));
 assert.notEqual(chooseUniversalAiAction(packs,live).uid,null);
 const forged=structuredClone(live);
 forged.pending.baseUid=waiting.uid;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid raid-base REST pending/);
 const skipped=dispatchUniversalAction(packs,structuredClone(live),{type:'chooseRaidBaseRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].outside.some(c=>c.uid===base.uid));
 assert.ok(skipped.players[0].outside.some(c=>c.uid===waiting.uid));
 assert.equal(at(skipped,0,base.uid).ready,false);
 const drawn=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,deploy);
 assert.equal(live.pending.kind,'effect-discard');
 assert.equal(live.pending.sourceUid,base.uid);
 assert.equal(at(live,0,base.uid).ready,false);
 assert.equal(live.players[0].front.some(c=>c?.uid===base.uid),true);
 assert.equal(live.players[0].deck.length,drawn-1);
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===base.uid&&e.from==='outside'&&e.to==='front'&&e.reason==='own-effect'));
 const handCard=live.players[0].hand[0];
 live=dispatchUniversalAction(packs,live,{type:'chooseDiscard',uid:handCard.uid});
 assert.equal(live.pending,null);
 assert.ok(live.players[0].outside.some(c=>c.uid===handCard.uid));
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let plain=subaru(6802);
 [0,1,2,3].forEach(i=>{
  const gen=pull(plain,0,'REZ-1-043');
  gen.ready=true;
  plain.players[0].energy[i]=gen;
 });
 const rival=pull(plain,1,'REZ-1-017');
 rival.ready=true;
 plain.players[1].front[0]=rival;
 plain=ownMain(plain,2);
 const played=pull(plain,0,'REZ-1-040');
 plain.players[0].hand.push(played);
 const play=legalUniversalActions(packs,plain).find(a=>a.type==='play'&&a.uid===played.uid&&a.line==='front');
 assert.ok(play);
 const deck=plain.players[0].deck.length;
 plain=dispatchUniversalAction(packs,plain,play);
 assert.equal(plain.players[0].deck.length,deck-1);
 assert.equal(at(plain,0,played.uid).ready,false);
 assert.equal(at(plain,0,played.uid).stack.length,0);
 at(plain,0,played.uid).ready=true;
 plain=toAttack(plain,1);
 plain=dispatchUniversalAction(packs,plain,{type:'attack',uid:rival.uid});
 plain=dispatchUniversalAction(packs,plain,{type:'chooseBlock',uid:played.uid});
 assert.notEqual(plain.pending?.kind,'effect-raid-base-rest');
 assert.ok(plain.players[0].outside.some(c=>c.uid===played.uid));
 assert.equal(assertUniversalMatch(packs,plain),true);
});

const spiritCounts={
 ...Object.fromEntries(['REZ-1-033','REZ-1-007','REZ-1-022','REZ-1-017','REZ-1-008','REZ-1-012',
  'REZ-1-014','REZ-1-043','REZ-1-016','REZ-1-024','REZ-1-105','REZ-1-081'].map(id=>[id,4])),
 'REZ-1-029':2
};
const spirit=seed=>newUniversalMatch(packs,{decks:[spiritCounts,spiritCounts],first:0,seed});
test('Spirit Arts rests BP 5000, retires that character while Emilia is on the field, and peeks only with Emilia and Puck',()=>{
 assert.equal(Object.values(spiritCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,spiritCounts),[]);
 const shell={id:'SPELL',name:'精霊術師',color:'yellow',type:'event',energy:4,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-spell',cards:[{...shell,type:'character',bp:2000,gen:1,effects:{onPlay:[
  {op:'restOrRetireFrontAtMost',bp:5000,retireIfName:'エミリア'}]}}]}),/event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-spell',cards:[{...shell,effects:{onPlay:[
  {op:'restOrRetireFrontAtMost',bp:3000,retireIfName:'エミリア'}]}}]}),/rest-or-retire front/);
 assert.throws(()=>createUniversalPack({id:'bad-spell',cards:[{...shell,effects:{onPlay:[
  {op:'peekTopOneIfFieldNames',names:['エミリア','レム']}]}}]}),/named top peek/);
 assert.equal(V2_PENDING_LABELS['effect-rest-or-retire'],'選擇 1 張 BP 5000 以下的對手前線');

 let live=spirit(6901);
 fuel(live,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 live=reach(live,'main');
 assert.equal(universalEnergyByColor(packs,live,0).yellow,4);
 const exact=pull(live,1,'REZ-1-017');
 const over=pull(live,1,'REZ-1-017');
 over.buffs=[{bp:1500,untilTurn:live.turn}];
 const side=pull(live,1,'REZ-1-008');
 live.players[1].front[0]=exact;
 live.players[1].front[1]=over;
 live.players[1].energy[0]=side;
 const blocked=structuredClone(live);
 blocked.players[1].outside.push(blocked.players[1].front[0]);
 blocked.players[1].front[0]=null;
 const hidden=pull(blocked,0,'REZ-1-033');
 blocked.players[0].hand.push(hidden);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===hidden.uid),false);
 const spell=pull(live,0,'REZ-1-033');
 live.players[0].hand.push(spell);
 const top=live.players[0].deck[0].uid;
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(live.pending.kind,'effect-rest-or-retire');
 assert.equal(live.pending.mode,'rest');
 assert.ok(live.pending.choices.includes(exact.uid));
 assert.equal(live.pending.choices.includes(over.uid),false);
 assert.equal(live.pending.choices.includes(side.uid),false);
 assert.equal(uiActionLabel(legalUniversalActions(packs,live).find(a=>a.uid===exact.uid),{pack,state:live}),'使 レム 休息');
 assert.equal(chooseUniversalAiAction(packs,live).type,'chooseRestOrRetire');
 const forged=structuredClone(live);
 forged.pending.mode='retire';
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid rest-or-retire pending/);
 live=dispatchUniversalAction(packs,live,{type:'chooseRestOrRetire',uid:exact.uid});
 assert.equal(live.pending,null);
 assert.equal(at(live,1,exact.uid).ready,false);
 assert.equal(live.players[1].front.some(c=>c?.uid===exact.uid),true);
 assert.equal(live.players[0].deck[0].uid,top);
 assert.equal(assertUniversalMatch(packs,live),true);

 let named=spirit(6902);
 fuel(named,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const emilia=pull(named,0,'REZ-1-022');
 named.players[0].front[0]=emilia;
 named=reach(named,'main');
 const victim=pull(named,1,'REZ-1-017');
 victim.buffs=[{bp:1000,untilTurn:named.turn}];
 named.players[1].front[0]=victim;
 const cast=pull(named,0,'REZ-1-033');
 named.players[0].hand.push(cast);
 const kept=named.players[0].deck[0].uid;
 named=dispatchUniversalAction(packs,named,legalUniversalActions(packs,named).find(a=>a.type==='event'&&a.uid===cast.uid));
 assert.equal(named.pending.mode,'retire');
 assert.ok(named.pending.choices.includes(victim.uid));
 assert.equal(uiActionLabel(legalUniversalActions(packs,named).find(a=>a.uid===victim.uid),{pack,state:named}),'使 レム 退場');
 named=dispatchUniversalAction(packs,named,{type:'chooseRestOrRetire',uid:victim.uid});
 assert.equal(named.pending,null);
 assert.ok(named.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(named.players[0].deck[0].uid,kept);
 assert.equal(assertUniversalMatch(packs,named),true);

 const unit=(id,name,extra)=>({id,name,color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const fixture=createUniversalPack({id:'spirit-lab',cards:[
  {id:'LAB-SPELL',name:'精霊術師',color:'yellow',type:'event',energy:4,ap:1,bp:0,gen:0,
   traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[
    {op:'restOrRetireFrontAtMost',bp:5000,retireIfName:'エミリア'},
    {op:'peekTopOneIfFieldNames',names:['エミリア','パック']}]}},
  unit('LAB-EMI','エミリア',{gen:0,bp:1500}),
  unit('LAB-PUCK','パック',{gen:0,bp:2000}),
  unit('LAB-FOE','標的',{gen:0,bp:2000}),
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I'].map(id=>unit(id,id))
 ]});
 const fixtureCounts={
  'LAB-SPELL':4,'LAB-EMI':4,'LAB-PUCK':4,'LAB-FOE':4,
  ...Object.fromEntries(['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H'].map(id=>[id,4])),
  'LAB-I':2
 };
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let both=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:6903});
 ['LAB-A','LAB-B','LAB-C','LAB-D'].forEach((id,i)=>{
  const gen=pull(both,0,id);gen.ready=true;both.players[0].energy[i]=gen;
 });
 const lady=pull(both,0,'LAB-EMI');
 const puck=pull(both,0,'LAB-PUCK');
 both.players[0].front[0]=lady;
 both.players[0].front[1]=puck;
 const foe=pull(both,1,'LAB-FOE');
 both.players[1].front[0]=foe;
 both=dispatchUniversalAction(fp,both,{type:'next'});
 both=dispatchUniversalAction(fp,both,{type:'next'});
 assert.equal(both.phase,'main');
 const marker=pull(both,0,'LAB-I');
 both.players[0].deck.unshift(marker);
 const mage=pull(both,0,'LAB-SPELL');
 both.players[0].hand.push(mage);
 both=dispatchUniversalAction(fp,both,{type:'event',uid:mage.uid});
 assert.equal(both.pending.mode,'retire');
 both=dispatchUniversalAction(fp,both,{type:'chooseRestOrRetire',uid:foe.uid});
 assert.equal(both.pending.kind,'private-top-choice');
 const keptTop=dispatchUniversalAction(fp,structuredClone(both),{type:'chooseTopCard',mode:'top'});
 assert.equal(keptTop.pending,null);
 assert.equal(keptTop.players[0].deck[0].uid,marker.uid);
 both=dispatchUniversalAction(fp,both,{type:'chooseTopCard',mode:'outside'});
 assert.equal(both.pending,null);
 assert.ok(both.players[0].outside.some(c=>c.uid===marker.uid));
 assert.equal(assertUniversalMatch(fp,both),true);
 assert.equal(assertUniversalMatch(fp,keptTop),true);
});
