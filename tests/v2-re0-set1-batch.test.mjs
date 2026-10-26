import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_CARDS,REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,REZERO_ENGINE_IDS,rezeroEngineKind,rezeroPackCard} from '../dist/universal-v2/rezero-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 effectiveHandRequiredEnergy,universalPrivateChoices,handCharacterBpMayAmount,
 universalPublicView
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

test('all one hundred thirteen whole prints enter the V2 pack',()=>{
 assert.equal(REZERO_ENGINE_IDS.length,113);
 assert.equal(Object.keys(pack.cards).length,113);
 assert.equal(REZERO_CARDS.filter(c=>!c.engineKind).length,0);
 assert.equal(pack.cards['REZ-1-001'].alsoEvent,true);
 assert.equal(pack.cards['REZ-1-001'].impactNull,true);
 assert.equal(pack.cards['REZ-1-001'].name,'パック');
 assert.equal(pack.cards['REZ-1-001'].type,'character');
 assert.equal(pack.cards['REZ-1-001'].trigger,'active');
 assert.equal(pack.cards['REZ-1-001'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-001'].effects,{});
 assert.deepEqual(pack.cards['REZ-1-097'].effects.onPlay,[
  {op:'inspectTopAnyOutside',count:3,rest:'top'},
  {op:'revealTopHandOrAffordableNamed',names:['ナツキ・スバル','ベアトリス']}]);
 assert.deepEqual(pack.cards['REZ-1-070'].effects.onPlay,[{op:'chooseOne',optional:false,options:[
  {id:'drawPlace',label:'抽1張，再將1張手牌放到牌頂或場外',turn:'any',then:[{op:'drawThenPlaceHand'}]},
  {id:'revealBeatrice',label:'可支付1AP，公開牌頂的碧翠絲',turn:'any',then:[
   {op:'optionalPayApThen',ap:1,optional:true,then:[
    {op:'revealTopHandOrAffordableNamed',names:['ベアトリス']}]}]}
 ]}]);
 assert.equal(pack.cards['REZ-1-071'].raidName,'ナツキ・スバル');
 assert.deepEqual(pack.cards['REZ-1-071'].effects.onPlay,[
  {op:'inspectTopArrange',count:2,toOutside:true,rest:'top'},{op:'draw',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-071'].effects.onAttack,[{
  op:'optionalPayApThen',ap:1,optional:true,oncePerAttackTurn:true,then:[
   {op:'revealTopHandOrAffordableNamed',names:['ベアトリス']}]}]);
 assert.deepEqual(pack.cards['REZ-1-112'].effects.onPlay,[{op:'activeSelfIf',entry:'ownEffect'}]);
 assert.deepEqual(pack.cards['REZ-1-112'].passiveBonuses,[{
  bp:500,condition:{kind:'ownDeckCharacterEntryThisTurn',turn:'own'}}]);
 assert.equal(pack.cards['REZ-1-002'].alsoEvent,true);
 assert.equal(pack.cards['REZ-1-002'].impactNull,false);
 assert.equal(pack.cards['REZ-1-002'].name,'パック');
 assert.deepEqual(pack.cards['REZ-1-002'].passiveBonuses,[{
  bp:1000,condition:{kind:'ownNameAndOutsideEvents',turn:'own',name:'エミリア',min:4}}]);
 assert.deepEqual(pack.cards['REZ-1-002'].effects.onPlay,[{
  op:'optionalHandOutsideActiveIf',name:'エミリア',minEvents:6}]);
 assert.deepEqual(pack.cards['REZ-1-032'].effects.onPlay,[{
  op:'buffNamedImpactDuration',name:'パック',bp:2000,impact:1,optional:true,otherOutsideEvents:6}]);
 assert.equal(pack.cards['REZ-1-032'].trigger,'active');
 assert.equal(pack.cards['REZ-1-032'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-058'].raidName,'クルシュ・カルステン');
 assert.equal(pack.cards['REZ-1-058'].handBpMayWhileFront,1000);
 assert.deepEqual(pack.cards['REZ-1-058'].effects.onPlay,[{op:'takeTopHandRestOutside',count:2}]);
 assert.deepEqual(pack.cards['REZ-1-058'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'buffEitherField',bp:1000,optional:true}]});
 assert.equal(pack.cards['REZ-1-044'].raidName,'フェリス');
 assert.equal(pack.cards['REZ-1-044'].trigger,'get');
 assert.deepEqual(pack.cards['REZ-1-044'].effects.onPlay,[{
  op:'revealHandBottomOutsideCharacter',optional:true,excludeName:'フェリス',color:'blue',ap:1}]);
 assert.equal(pack.cards['REZ-1-060'].type,'field');
 assert.deepEqual(pack.cards['REZ-1-060'].effects,{});
 assert.deepEqual(pack.cards['REZ-1-060'].mainAbility,{op:'restLeaveRevealRetire',oncePerName:true});
 assert.deepEqual(pack.cards['REZ-1-107'].effects.onPlay,[{op:'optionalPayApThen',ap:1,optional:true,then:[
  {op:'chooseOne',optional:false,options:[
   {id:'oppDiscardDraw',label:'對手將1張手牌放到場外，自己抽1張',turn:'any',
    then:[{op:'discardOppHand',count:1},{op:'draw',count:1}]},
   {id:'activeBadge',label:'使這張角色活動，並將場外徽章加入手牌',turn:'any',
    then:[{op:'activeSelf'},{op:'recoverOutsideOne',filter:{field:'name',value:'徽章'},optional:true}]}
  ]}]}]);
 assert.deepEqual(pack.cards['REZ-1-107'].mainAbility,{
  op:'handOutsideBlockAtLeast',oncePerTurn:true,bp:4000});
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
 assert.equal(pack.cards['REZ-1-011'].raidName,'ラム');
 assert.equal(pack.cards['REZ-1-011'].trigger,'raid');
 assert.deepEqual(pack.cards['REZ-1-011'].substituteOppRetire,{name:'レム'});
 assert.deepEqual(pack.cards['REZ-1-011'].effects.onPlay,[{op:'chooseOne',optional:false,options:[
  {id:'allDown',label:'所有對手前線BP1500以上本回合BP-1000',turn:'any',
   then:[{op:'enemyFrontAllBpDown',bp:1000,minBp:1500}]},
  {id:'oneDown',label:'最多1張對手前線BP2500以上本回合BP-2000',turn:'any',
   then:[{op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}]}
 ]}]);
 assert.equal(pack.cards['REZ-1-020'].raidName,'レム');
 assert.deepEqual(pack.cards['REZ-1-020'].effects.onPlay,[{op:'impactIfEveryOwnTraitless'}]);
 assert.deepEqual(pack.cards['REZ-1-020'].mainAbility,{
  op:'sniperThenRaidBaseOutside',oncePerTurn:true,maxBp:4000});
 assert.equal(pack.cards['REZ-1-052'].ap,2);
 assert.equal(pack.cards['REZ-1-052'].trigger,'get');
 assert.deepEqual(pack.cards['REZ-1-052'].effects.onPlay,[{op:'chooseOne',optional:false,options:[
  {id:'activeZero',label:'使場外能源0的藍色菜月昴以活動狀態登場',turn:'any',
   then:[{op:'deployOutsidePrintedActive',name:'ナツキ・スバル',color:'blue',energy:0,optional:true}]},
  {id:'bounceRaid',label:'可將1張場上角色放回手牌，再休息登場或突襲菜月昴',turn:'any',
   then:[{op:'bounceThenAffordableSubaru',name:'ナツキ・スバル',color:'blue',ap:1}]}
 ]}]);
 assert.equal(pack.cards['REZ-1-074'].trigger,'active');
 assert.equal(pack.cards['REZ-1-074'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-074'].effects.onPlay,[{
  op:'grantBounceInstead',name:'ナツキ・スバル',optional:true}]);
 assert.equal(pack.cards['REZ-1-101'].trigger,'get');
 assert.equal(pack.cards['REZ-1-101'].effects.onPlay,undefined);
 assert.deepEqual(pack.cards['REZ-1-101'].effects.onRetire,[{
  op:'handOutsideReenterFaceDown',name:'エミリア'}]);
 assert.deepEqual(pack.cards['REZ-1-101'].passiveBonuses,[{
  bp:1000,condition:{kind:'ownTurnFacedownUnder',turn:'own'}}]);
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
 assert.equal(pack.cards['REZ-1-106'].trigger,'raid');
 assert.equal(pack.cards['REZ-1-106'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-106'].color,'yellow');
 assert.equal(pack.cards['REZ-1-106'].energy,4);
 assert.equal(pack.cards['REZ-1-106'].raidName,'エミリア');
 assert.equal(pack.cards['REZ-1-022'].raidName,null);
 assert.deepEqual(pack.cards['REZ-1-106'].effects.onAttack,[
  {op:'peekTopOne'},{op:'drawIfOwnEventUsed',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-106'].passiveBonuses,[{
  impact:1,condition:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:6}}]);
 assert.equal(pack.cards['REZ-1-078'].trigger,'raid');
 assert.equal(pack.cards['REZ-1-078'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-078'].color,'purple');
 assert.equal(pack.cards['REZ-1-078'].energy,4);
 assert.equal(pack.cards['REZ-1-078'].raidName,'ベアトリス');
 assert.equal(pack.cards['REZ-1-072'].raidName,null);
 assert.deepEqual(pack.cards['REZ-1-078'].effects.onPlay,[
  {op:'activeOwnNamed',name:'ナツキ・スバル',max:1,optional:true},
  {op:'draw',count:1,entry:'ownEffect'}]);
 assert.deepEqual(pack.cards['REZ-1-078'].passiveBonuses,[{
  impact:1,condition:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,
   name:'ナツキ・スバル'}}]);
 assert.equal(pack.cards['REZ-1-051'].trigger,'get');
 assert.equal(pack.cards['REZ-1-051'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-051'].color,'blue');
 assert.equal(pack.cards['REZ-1-051'].energy,5);
 assert.equal(pack.cards['REZ-1-051'].raidName,'レム');
 assert.equal(pack.cards['REZ-1-014'].raidName,null);
 assert.deepEqual(pack.cards['REZ-1-051'].effects.onPlay,[{
  op:'retireOppFrontScaledBp',base:1000,step:1000,name:'ナツキ・スバル',
  color:'blue',energy:0,optional:true}]);
 assert.equal(pack.cards['REZ-1-027'].trigger,'raid');
 assert.equal(pack.cards['REZ-1-027'].triggerEffect,null);
 assert.equal(pack.cards['REZ-1-027'].color,'yellow');
 assert.equal(pack.cards['REZ-1-027'].energy,5);
 assert.equal(pack.cards['REZ-1-027'].raidName,'エミリア');
 assert.equal(pack.cards['REZ-1-022'].raidName,null);
 assert.deepEqual(pack.cards['REZ-1-027'].effects.onPlay,[
  {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'event',printedRequiredEnergyAtMost:3}},
  {op:'restOppFrontByOutsideEvents',min:4,skipMin:8,optional:true}]);
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
 assert.equal(pack.cards['REZ-1-101'].name,'ナツキ・スバル');
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

const maidCounts={
 ...Object.fromEntries(['REZ-1-106','REZ-1-022','REZ-1-007','REZ-1-033','REZ-1-017','REZ-1-012',
  'REZ-1-008','REZ-1-014','REZ-1-043','REZ-1-016','REZ-1-024','REZ-1-081'].map(id=>[id,4])),
 'REZ-1-029':2
};
const maid=seed=>newUniversalMatch(packs,{decks:[maidCounts,maidCounts],first:0,seed});
test('Emilia raids onto Emilia, gains impact from six outside events, and peeks then draws after an event',()=>{
 assert.equal(Object.values(maidCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,maidCounts),[]);
 const shell={id:'MAID',name:'エミリア',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:'raid',raidName:'エミリア',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-maid',cards:[{...shell,type:'event',bp:0,gen:0,raidName:null,trigger:null,effects:{onPlay:[
  {op:'drawIfOwnEventUsed',count:1}]}}]}),/onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-maid',cards:[{...shell,passiveBonuses:[{
  impact:1,condition:{kind:'ownOutsideEventCountAtLeast',turn:'any'}}]}]}),/passive condition/);

 let live=maid(7001);
 fuel(live,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const base=pull(live,0,'REZ-1-022');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-008');
 live.players[0].front[1]=stranger;
 const decoy=pull(live,0,'REZ-1-106');
 live.players[0].front[2]=decoy;
 const blocker=pull(live,1,'REZ-1-012');
 blocker.ready=true;
 live.players[1].front[0]=blocker;
 live=ownMain(live,2);
 live.players[0].front[0].ready=false;
 live.players[0].front[1].ready=false;
 live.players[0].front[2].ready=false;
 assert.equal(universalEnergyByColor(packs,live,0).yellow,4);
 const waiting=pull(live,0,'REZ-1-106');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===decoy.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.players[0].deck.length,before);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),0);
 for(const id of ['REZ-1-033','REZ-1-033','REZ-1-033','REZ-1-033','REZ-1-029'])
  live.players[0].outside.push(pull(live,0,id));
 const bystander=pull(live,0,'REZ-1-017');
 live.players[0].outside.push(bystander);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),0);
 let five=structuredClone(live);
 const sixth=pull(live,0,'REZ-1-029');
 live.players[0].outside.push(sixth);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),1);
 assert.equal(universalImpact(pack,five,at(five,0,waiting.uid)),0);
 const blankFive=pull(five,1,'REZ-1-014');
 five.players[1].life.unshift(blankFive);
 const blankSix=pull(live,1,'REZ-1-014');
 live.players[1].life.unshift(blankSix);
 five=toAttack(five,0);
 live=toAttack(live,0);
 const lifeFive=five.players[1].life.length;
 const deckFive=five.players[0].deck.length;
 five=dispatchUniversalAction(packs,five,{type:'attack',uid:waiting.uid});
 assert.equal(five.pending.kind,'private-top-choice');
 five=dispatchUniversalAction(packs,five,{type:'chooseTopCard',mode:'top'});
 assert.equal(five.pending.kind,'block');
 assert.equal(five.players[0].deck.length,deckFive);
 five=dispatchUniversalAction(packs,five,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.ok(five.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(five.players[1].life.length,lifeFive);
 const lifeSix=live.players[1].life.length;
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:waiting.uid});
 assert.equal(live.pending.kind,'private-top-choice');
 const marker=live.players[0].deck[0];
 live=dispatchUniversalAction(packs,live,{type:'chooseTopCard',mode:'outside'});
 assert.ok(live.players[0].outside.some(c=>c.uid===marker.uid));
 assert.equal(live.pending.kind,'block');
 live=dispatchUniversalAction(packs,live,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(live.players[1].life.length,lifeSix-1);
 assert.equal(live.pending,null);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,five),true);

 let cast=maid(7002);
 fuel(cast,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const home=pull(cast,0,'REZ-1-081');
 cast.players[0].front[0]=home;
 cast=ownMain(cast,2);
 cast.players[0].front[0].ready=false;
 const event=pull(cast,0,'REZ-1-029');
 cast.players[0].hand.push(event);
 cast=dispatchUniversalAction(packs,cast,legalUniversalActions(packs,cast).find(a=>a.type==='event'&&a.uid===event.uid));
 if(cast.pending?.kind==='effect-recover-ap')
  cast=dispatchUniversalAction(packs,cast,{type:'chooseApRecovery',uid:null});
 assert.ok(cast.players[0].outside.some(c=>c.uid===event.uid));
 const topCard=pull(cast,0,'REZ-1-106');
 cast.players[0].hand.push(topCard);
 const played=legalUniversalActions(packs,cast).find(a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===home.uid);
 assert.ok(played);
 cast=dispatchUniversalAction(packs,cast,played);
 cast=toAttack(cast,0);
 const deck=cast.players[0].deck.length;
 cast=dispatchUniversalAction(packs,cast,{type:'attack',uid:topCard.uid});
 assert.equal(cast.pending.kind,'private-top-choice');
 cast=dispatchUniversalAction(packs,cast,{type:'chooseTopCard',mode:'top'});
 assert.equal(cast.players[0].deck.length,deck-1);
 assert.equal(cast.pending.kind,'block');
 cast=dispatchUniversalAction(packs,cast,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(assertUniversalMatch(packs,cast),true);
});

const beaCounts={
 ...Object.fromEntries(['REZ-1-078','REZ-1-072','REZ-1-068','REZ-1-086','REZ-1-014','REZ-1-043',
  'REZ-1-016','REZ-1-024','REZ-1-091','REZ-1-081','REZ-1-003','REZ-1-109'].map(id=>[id,4])),
 'REZ-1-029':2
};
const bea=seed=>newUniversalMatch(packs,{decks:[beaCounts,beaCounts],first:0,seed});
test('Beatrice raids onto Beatrice, gains impact from Subaru, and draws only after an own-effect entry',()=>{
 assert.equal(Object.values(beaCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,beaCounts),[]);
 const shell={id:'BEA',name:'ベアトリス',color:'purple',type:'character',energy:4,ap:1,bp:4000,gen:0,
  traits:[],trigger:'raid',raidName:'ベアトリス',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-bea',cards:[{...shell,type:'event',bp:0,gen:0,raidName:null,trigger:null,effects:{onPlay:[
  {op:'activeOwnNamed',name:'ナツキ・スバル',max:1,optional:true}]}}]}),/onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-bea',cards:[{...shell,effects:{onAttack:[
  {op:'draw',count:1,entry:'ownEffect'}]}}]}),/onPlay/);

 let live=bea(7101);
 fuel(live,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(live,0,'REZ-1-072');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-081');
 live.players[0].front[1]=stranger;
 const decoy=pull(live,0,'REZ-1-078');
 live.players[0].front[2]=decoy;
 const subaru=pull(live,0,'REZ-1-068');
 subaru.ready=false;
 live.players[0].front[3]=subaru;
 live=ownMain(live,2);
 for(const card of live.players[0].front)if(card)card.ready=false;
 assert.equal(universalEnergyByColor(packs,live,0).purple,4);
 const waiting=pull(live,0,'REZ-1-078');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.baseUid===decoy.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 const before=live.players[0].deck.length;
 let quiet=bea(7102);
 fuel(quiet,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const quietBase=pull(quiet,0,'REZ-1-072');
 quiet.players[0].front[0]=quietBase;
 quiet=ownMain(quiet,2);
 quiet.players[0].front[0].ready=false;
 const quietTop=pull(quiet,0,'REZ-1-078');
 quiet.players[0].hand.push(quietTop);
 const quietDeck=quiet.players[0].deck.length;
 quiet=dispatchUniversalAction(packs,quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='raid'&&a.uid===quietTop.uid&&a.baseUid===quietBase.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,quietDeck);
 assert.equal(universalImpact(pack,quiet,at(quiet,0,quietTop.uid)),0);
 const parked=quiet.players[0].energy[0];
 quiet.players[0].deck.push(parked);
 const later=pull(quiet,0,'REZ-1-068');
 later.ready=true;
 quiet.players[0].energy[0]=later;
 assert.equal(universalImpact(pack,quiet,at(quiet,0,quietTop.uid)),1);

 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.players[0].deck.length,before);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),1);
 assert.equal(live.pending.kind,'effect-active-own-named');
 let skipped=structuredClone(live);
 const deckNow=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,{type:'chooseActiveOwnNamed',uid:subaru.uid});
 assert.equal(at(live,0,subaru.uid).ready,true);
 assert.equal(live.players[0].deck.length,deckNow);
 assert.equal(live.pending,null);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseActiveOwnNamed',uid:null});
 assert.equal(at(skipped,0,subaru.uid).ready,false);
 assert.equal(skipped.players[0].deck.length,deckNow);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);

 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'beatrice-entry-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-078']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-072']),
  {id:'LAB-SUB',name:'ナツキ・スバル',color:'purple',type:'character',energy:0,ap:1,bp:1500,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-DEPLOY-BEA',name:'Deploy Beatrice',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'dsl',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
    color:'purple',maxEnergy:4,ap:1,max:1,optional:true,names:['ベアトリス']}]}},
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I'].map(id=>lab(id,'purple'))
 ]});
 const fixtureCounts={
  'REZ-1-078':4,'REZ-1-072':4,'LAB-SUB':4,'LAB-DEPLOY-BEA':4,
  'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':4,'LAB-G':4,'LAB-H':4,
  'LAB-I':2
 };
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let own=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:7103});
 const home=pull(own,0,'REZ-1-072');
 own.players[0].front[0]=home;
 const named=pull(own,0,'LAB-SUB');
 named.ready=false;
 own.players[0].front[1]=named;
 own=dispatchUniversalAction(fp,own,{type:'next'});
 own=dispatchUniversalAction(fp,own,{type:'next'});
 assert.equal(own.phase,'main');
 const top=pull(own,0,'REZ-1-078');
 own.players[0].hand.push(top);
 const caster=pull(own,0,'LAB-DEPLOY-BEA');
 own.players[0].hand.push(caster);
 own=dispatchUniversalAction(fp,own,{type:'event',uid:caster.uid});
 assert.equal(own.pending.kind,'effect-hand-rest-or-raid');
 const played=legalUniversalActions(fp,own).find(a=>a.type==='chooseHandRestOrRaid'&&
  a.mode==='raid'&&a.uid===top.uid&&a.baseUid===home.uid);
 assert.ok(played);
 own=dispatchUniversalAction(fp,own,played);
 assert.equal(own.pending.kind,'effect-active-own-named');
 assert.equal(at(own,0,top.uid).ready,false);
 const drawn=own.players[0].deck.length;
 own=dispatchUniversalAction(fp,own,{type:'chooseActiveOwnNamed',uid:named.uid});
 assert.equal(at(own,0,named.uid).ready,true);
 assert.equal(own.players[0].deck.length,drawn-1);
 assert.equal(at(own,0,top.uid).stack[0].uid,home.uid);
 assert.equal(assertUniversalMatch(fp,own),true);
});

const remCounts={
 ...Object.fromEntries(['REZ-1-051','REZ-1-014','REZ-1-038','REZ-1-068','REZ-1-040','REZ-1-043',
  'REZ-1-003','REZ-1-016','REZ-1-024','REZ-1-054','REZ-1-086','REZ-1-091'].map(id=>[id,4])),
 'REZ-1-029':2
};
const rem=seed=>newUniversalMatch(packs,{decks:[remCounts,remCounts],first:0,seed});
test('Rem raids onto Rem and retires one front scaled by blue zero-cost Subaru',()=>{
 assert.equal(Object.values(remCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,remCounts),[]);
 const shell={id:'REM',name:'レム',color:'blue',type:'character',energy:5,ap:1,bp:4000,gen:0,
  traits:[],trigger:'get',raidName:'レム',implementation:'dsl',effects:{}};
 const scaled={op:'retireOppFrontScaledBp',base:1000,step:1000,name:'ナツキ・スバル',
  color:'blue',energy:0,optional:true};
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,type:'event',bp:0,gen:0,raidName:null,trigger:null,effects:{onPlay:[scaled]}}]}),/onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,effects:{onPlay:[{...scaled,optional:undefined}]}}]}),/scaled front/);

 let quiet=rem(7202);
 fuel(quiet,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const quietBase=pull(quiet,0,'REZ-1-014');
 quiet.players[0].front[0]=quietBase;
 const purple=pull(quiet,0,'REZ-1-068');
 quiet.players[0].front[1]=purple;
 const costly=pull(quiet,0,'REZ-1-040');
 quiet.players[0].front[2]=costly;
 const decoy=pull(quiet,0,'REZ-1-051');
 quiet.players[0].front[3]=decoy;
 const low=pull(quiet,1,'REZ-1-038');
 quiet.players[1].front[0]=low;
 quiet=ownMain(quiet,2);
 quiet.players[0].energy[0].buffs=[{energy:1,untilTurn:quiet.turn}];
 assert.equal(universalEnergyByColor(packs,quiet,0).blue,5);
 const quietTop=pull(quiet,0,'REZ-1-051');
 quiet.players[0].hand.push(quietTop);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.type==='raid'&&a.uid===quietTop.uid&&a.baseUid===purple.uid),false);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.type==='raid'&&a.uid===quietTop.uid&&a.baseUid===costly.uid),false);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.type==='raid'&&a.uid===quietTop.uid&&a.baseUid===decoy.uid),false);
 const quietDeck=quiet.players[0].deck.length;
 quiet=dispatchUniversalAction(packs,quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='raid'&&a.uid===quietTop.uid&&a.baseUid===quietBase.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,quietDeck);
 assert.equal(at(quiet,1,low.uid).uid,low.uid);
 assert.equal(assertUniversalMatch(packs,quiet),true);

 let live=rem(7201);
 fuel(live,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const base=pull(live,0,'REZ-1-014');
 live.players[0].front[0]=base;
 const qualifier=pull(live,0,'REZ-1-038');
 live.players[0].front[1]=qualifier;
 const exact=pull(live,1,'REZ-1-038');
 live.players[1].front[0]=exact;
 const over=pull(live,1,'REZ-1-038');
 live.players[1].front[1]=over;
 const tall=pull(live,1,'REZ-1-014');
 live.players[1].front[2]=tall;
 const aside=pull(live,1,'REZ-1-068');
 live.players[1].energy[0]=aside;
 live=ownMain(live,2);
 const liveExact=at(live,1,exact.uid);
 const liveOver=at(live,1,over.uid);
 live.players[0].energy[0].buffs=[{energy:1,untilTurn:live.turn}];
 liveExact.buffs=[{bp:500,untilTurn:live.turn}];
 liveOver.buffs=[{bp:1000,untilTurn:live.turn}];
 assert.equal(universalBp(pack,live,liveExact),2000);
 assert.equal(universalBp(pack,live,liveOver),2500);
 assert.equal(universalEnergyByColor(packs,live,0).blue,5);
 const waiting=pull(live,0,'REZ-1-051');
 live.players[0].hand.push(waiting);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.players[0].deck.length,before);
 assert.equal(live.pending.kind,'effect-retire-scaled');
 assert.equal(live.pending.ceiling,2000);
 assert.equal(live.pending.optional,true);
 assert.equal(Object.keys(live.pending).length,6);
 assert.deepEqual(live.pending.choices,[exact.uid]);
 assert.equal(V2_PENDING_LABELS['effect-retire-scaled'],'選擇是否使對手前線退場');
 assert.equal(uiActionLabel({type:'chooseRetireScaled',uid:null},{pack,state:live}),'不使角色退場');
 assert.equal(uiActionLabel({type:'chooseRetireScaled',uid:exact.uid},{pack,state:live}),'使 ナツキ・スバル 退場');
 assert.equal(chooseUniversalAiAction(packs,live).uid,exact.uid);
 let skipped=structuredClone(live);
 let retired=structuredClone(live);
 const stale=structuredClone(live);
 const slot=stale.players[0].front.findIndex(c=>c?.uid===qualifier.uid);
 stale.players[0].outside.push(stale.players[0].front[slot]);
 stale.players[0].front[slot]=null;
 assert.throws(()=>legalUniversalActions(packs,stale),/Invalid scaled front retirement pending/);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseRetireScaled',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(at(skipped,1,exact.uid).uid,exact.uid);
 assert.equal(skipped.players[0].deck.length,before);
 retired=dispatchUniversalAction(packs,retired,{type:'chooseRetireScaled',uid:exact.uid});
 assert.equal(retired.pending,null);
 assert.equal(at(retired,1,exact.uid).uid,exact.uid);
 assert.ok(retired.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(retired.players[1].front[0],null);
 assert.equal(retired.players[0].deck.length,before);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,retired),true);
});

const emiliaRaidCounts={
 ...Object.fromEntries(['REZ-1-027','REZ-1-022','REZ-1-007','REZ-1-029','REZ-1-033','REZ-1-109',
  'REZ-1-014','REZ-1-043','REZ-1-016','REZ-1-003','REZ-1-054','REZ-1-091'].map(id=>[id,4])),
 'REZ-1-086':2
};
const emiliaRaid=seed=>newUniversalMatch(packs,{decks:[emiliaRaidCounts,emiliaRaidCounts],first:0,seed});
function reachStart(s,player,turn){
 let guard=0;
 while(!(s.active===player&&s.players[player].ownTurns>=turn&&s.phase==='start'&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
  }else if(s.pending)throw Error('unexpected pending '+s.pending.kind);
  else{
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'stuck before start');
   s=dispatchUniversalAction(packs,s,next);
  }
  assert.ok(++guard<48,'did not reach the next start');
 }
 return s;
}
test('Emilia raids onto Emilia, discounts the next cheap event, and rests from outside events',()=>{
 assert.equal(Object.values(emiliaRaidCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaRaidCounts),[]);
 const shell={id:'EMI',name:'エミリア',color:'yellow',type:'character',energy:5,ap:1,bp:4000,gen:1,
  traits:['王選候補者'],trigger:'raid',raidName:'エミリア',implementation:'dsl',effects:{}};
 const rest={op:'restOppFrontByOutsideEvents',min:4,skipMin:8,optional:true};
 assert.throws(()=>createUniversalPack({id:'bad-emi',cards:[{...shell,type:'event',bp:0,gen:0,raidName:null,trigger:null,effects:{onPlay:[rest]}}]}),/onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-emi',cards:[{...shell,effects:{onPlay:[{...rest,optional:undefined}]}}]}),/outside-event/);
 const discount=s=>s.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount');
 const skipOn=(s,uid)=>s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===uid&&!e.consumed);
 function prepare(seed,eventIds,extraId){
  let s=emiliaRaid(seed);
  fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
  const base=pull(s,0,'REZ-1-022');
  s.players[0].front[0]=base;
  const stranger=pull(s,0,'REZ-1-014');
  s.players[0].front[1]=stranger;
  const decoy=pull(s,0,'REZ-1-027');
  s.players[0].front[2]=decoy;
  const victim=pull(s,1,'REZ-1-014');
  victim.ready=true;
  s.players[1].front[0]=victim;
  const aside=pull(s,1,'REZ-1-043');
  s.players[1].energy[0]=aside;
  for(const id of eventIds)s.players[0].outside.push(pull(s,0,id));
  if(extraId)s.players[0].outside.push(pull(s,0,extraId));
  s=ownMain(s,2);
  s.players[0].energy[0].buffs=[{energy:1,untilTurn:s.turn}];
  return {s,base,stranger,decoy,victim,aside};
 }
 function raidOnto(prepared){
  const top=pull(prepared.s,0,'REZ-1-027');
  prepared.s.players[0].hand.push(top);
  const action=legalUniversalActions(packs,prepared.s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===prepared.base.uid);
  assert.ok(action);
  assert.equal(action.line,undefined);
  const deck=prepared.s.players[0].deck.length;
  prepared.s=dispatchUniversalAction(packs,prepared.s,action);
  assert.equal(prepared.s.players[0].deck.length,deck);
  assert.equal(at(prepared.s,0,top.uid).ready,true);
  assert.equal(at(prepared.s,0,top.uid).stack[0].uid,prepared.base.uid);
  return prepared.s;
 }

 let low=prepare(7301,['REZ-1-029','REZ-1-029','REZ-1-029'],'REZ-1-014');
 assert.equal(universalEnergyByColor(packs,low.s,0).yellow,5);
 const waiting=pull(low.s,0,'REZ-1-027');
 low.s.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,low.s).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===low.stranger.uid),false);
 assert.equal(legalUniversalActions(packs,low.s).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===low.decoy.uid),false);
 low.s.players[0].hand.pop();
 low.s.players[0].deck.push(waiting);
 low.s=raidOnto(low);
 assert.equal(low.s.pending,null);
 assert.equal(low.s.players[0].outside.filter(c=>pack.cards[c.cardId].type==='event').length,3);
 assert.deepEqual(discount(low.s).filter,{cardType:'event',printedRequiredEnergyAtMost:3});
 let priced=structuredClone(low.s);
 for(const ap of priced.players[0].apCards)ap.ready=false;
 const cheap=pull(priced,0,'REZ-1-109');
 priced.players[0].hand.push(cheap);
 const pricey=pull(priced,0,'REZ-1-033');
 priced.players[0].hand.push(pricey);
 assert.equal(legalUniversalActions(packs,priced).some(a=>a.type==='event'&&a.uid===cheap.uid),true);
 assert.equal(legalUniversalActions(packs,priced).some(a=>a.type==='event'&&a.uid===pricey.uid),false);
 const afforded=structuredClone(priced);
 afforded.players[0].apCards.find(c=>c.inPlay).ready=true;
 assert.equal(legalUniversalActions(packs,afforded).some(a=>a.type==='event'&&a.uid===pricey.uid),true);
 priced=dispatchUniversalAction(packs,priced,{type:'event',uid:cheap.uid});
 assert.equal(discount(priced),undefined);
 assert.equal(assertUniversalMatch(packs,priced),true);

 let mid=prepare(7302,['REZ-1-029','REZ-1-029','REZ-1-029','REZ-1-029']);
 mid.s=raidOnto(mid);
 assert.equal(mid.s.pending.kind,'effect-rest-outside-events');
 assert.equal(mid.s.pending.min,4);
 assert.equal(mid.s.pending.skipMin,8);
 assert.equal(Object.keys(mid.s.pending).length,7);
 assert.deepEqual(mid.s.pending.choices,[mid.victim.uid]);
 assert.equal(V2_PENDING_LABELS['effect-rest-outside-events'],'選擇是否使對手前線休息');
 assert.equal(uiActionLabel({type:'chooseRestOutsideEvents',uid:null},{pack,state:mid.s}),'不使角色休息');
 assert.equal(uiActionLabel({type:'chooseRestOutsideEvents',uid:mid.victim.uid},{pack,state:mid.s}),'使 レム 休息');
 assert.equal(chooseUniversalAiAction(packs,mid.s).uid,mid.victim.uid);
 let declined=structuredClone(mid.s);
 let faded=structuredClone(mid.s);
 declined=dispatchUniversalAction(packs,declined,{type:'chooseRestOutsideEvents',uid:null});
 assert.equal(at(declined,1,mid.victim.uid).ready,true);
 assert.equal(skipOn(declined,mid.victim.uid),false);
 faded.players[0].deck.push(...faded.players[0].outside.splice(0));
 faded=dispatchUniversalAction(packs,faded,{type:'chooseRestOutsideEvents',uid:mid.victim.uid});
 assert.equal(at(faded,1,mid.victim.uid).ready,true);
 assert.equal(skipOn(faded,mid.victim.uid),false);
 mid.s=dispatchUniversalAction(packs,mid.s,{type:'chooseRestOutsideEvents',uid:mid.victim.uid});
 assert.equal(at(mid.s,1,mid.victim.uid).ready,false);
 assert.equal(skipOn(mid.s,mid.victim.uid),false);
 mid.s=reachStart(mid.s,1,2);
 assert.equal(at(mid.s,1,mid.victim.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,mid.s),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,faded),true);

 let high=prepare(7303,[...Array(4).fill('REZ-1-029'),...Array(4).fill('REZ-1-109')]);
 high.s=raidOnto(high);
 assert.equal(high.s.players[0].outside.filter(c=>pack.cards[c.cardId].type==='event').length,8);
 high.s=dispatchUniversalAction(packs,high.s,{type:'chooseRestOutsideEvents',uid:high.victim.uid});
 assert.equal(at(high.s,1,high.victim.uid).ready,false);
 assert.equal(skipOn(high.s,high.victim.uid),true);
 high.s=reachStart(high.s,1,2);
 assert.equal(at(high.s,1,high.victim.uid).ready,false);
 assert.equal(skipOn(high.s,high.victim.uid),false);
 assert.equal(assertUniversalMatch(packs,high.s),true);
 assert.equal(assertUniversalMatch(packs,low.s),true);
});

const remTurnCounts={
 ...Object.fromEntries(['REZ-1-015','REZ-1-014','REZ-1-007','REZ-1-006','REZ-1-024',
  'REZ-1-016','REZ-1-043','REZ-1-086','REZ-1-003','REZ-1-091','REZ-1-054','REZ-1-029'].map(id=>[id,4])),
 'REZ-1-033':2
};
const remTurn=seed=>newUniversalMatch(packs,{decks:[remTurnCounts,remTurnCounts],first:0,seed});
function parkLine(s,player,uid){
 const pl=s.players[player];
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.uid===uid);
  if(index<0)continue;
  pl.outside.push(pl[line][index]);
  pl[line][index]=null;
  return;
 }
 throw Error('missing field card '+uid);
}
test('Rem raids onto Rem, gains 500 BP on her turn, and draws on attack only when every character is Rem',()=>{
 assert.equal(Object.values(remTurnCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,remTurnCounts),[]);
 const printed=pack.cards['REZ-1-015'];
 assert.equal(printed.raidName,'レム');
 assert.equal(printed.ownTurnBp,500);
 assert.equal(printed.trigger,'get');
 assert.deepEqual(printed.effects,{
  onPlay:[{op:'drawDiscard',count:1}],
  onAttack:[{op:'drawDiscardIfEveryOwnCharacterNamed',count:1,name:'レム'}]});
 assert.deepEqual(printed.mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'enemyBpDown',bp:1000,minBp:1500,zone:'front'}]});
 const shell={id:'REM15',name:'レム',color:'yellow',type:'character',energy:3,ap:1,bp:3500,gen:1,
  traits:[],trigger:'get',raidName:'レム',ownTurnBp:500,implementation:'dsl',effects:{}};
 const named={op:'drawDiscardIfEveryOwnCharacterNamed',count:1,name:'レム'};
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,effects:{onPlay:[named]}}]}),/onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-rem',cards:[{...shell,type:'event',bp:0,gen:0,raidName:null,trigger:null,ownTurnBp:undefined,effects:{onAttack:[named]}}]}),/onAttack/);

 let live=remTurn(7401);
 fuel(live,['REZ-1-007','REZ-1-007','REZ-1-007']);
 const base=pull(live,0,'REZ-1-014');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-024');
 live.players[0].front[1]=stranger;
 const decoy=pull(live,0,'REZ-1-015');
 live.players[0].front[2]=decoy;
 const exact=pull(live,1,'REZ-1-024');
 live.players[1].front[0]=exact;
 const small=pull(live,1,'REZ-1-006');
 live.players[1].front[1]=small;
 live=ownMain(live,2);
 assert.equal(universalEnergyByColor(packs,live,0).yellow,3);
 const waiting=pull(live,0,'REZ-1-015');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===decoy.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.players[0].deck.length,before-1);
 assert.equal(live.pending.kind,'effect-discard');
 assert.equal(universalBp(pack,live,at(live,0,waiting.uid)),4000);
 live.active=1;
 assert.equal(universalBp(pack,live,at(live,0,waiting.uid)),3500);
 live.active=0;
 const dumped=live.players[0].hand.find(c=>c.uid!==waiting.uid);
 live=dispatchUniversalAction(packs,live,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(live.pending,null);
 assert.ok(live.players[0].outside.some(c=>c.uid===dumped.uid));

 const parked=structuredClone(live);
 const from=parked.players[0].front.findIndex(c=>c?.uid===waiting.uid);
 parked.players[0].energy[3]=parked.players[0].front[from];
 parked.players[0].front[from]=null;
 assert.equal(frontOnce(parked,waiting.uid),false);
 const bare=structuredClone(live);
 const foe=bare.players[1].front.findIndex(c=>c?.uid===exact.uid);
 bare.players[1].deck.push(bare.players[1].front[foe]);
 bare.players[1].front[foe]=null;
 assert.equal(frontOnce(bare,waiting.uid),false);
 assert.equal(frontOnce(live,waiting.uid),true);
 live=dispatchUniversalAction(packs,live,{type:'activate',uid:waiting.uid,mode:'frontOnce'});
 assert.equal(live.pending.kind,'effect-target');
 assert.equal(live.pending.optional,false);
 assert.equal(live.pending.bp,1000);
 assert.deepEqual(live.pending.choices,[exact.uid]);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='chooseTarget'&&a.uid===null),false);
 live=dispatchUniversalAction(packs,live,{type:'chooseTarget',uid:exact.uid});
 assert.equal(live.pending,null);
 assert.equal(universalBp(pack,live,at(live,1,exact.uid)),500);
 assert.equal(universalBp(pack,live,at(live,1,small.uid)),1000);
 assert.equal(frontOnce(live,waiting.uid),false);

 for(const card of live.players[0].energy.filter(Boolean))parkLine(live,0,card.uid);
 parkLine(live,0,stranger.uid);
 const buried=pull(live,0,'REZ-1-006');
 at(live,0,waiting.uid).stack.push(buried);
 assert.equal(at(live,0,waiting.uid).stack.some(c=>c.uid===buried.uid),true);
 assert.equal(assertUniversalMatch(packs,live),true);
 let mixed=structuredClone(live);
 const ram=pull(mixed,0,'REZ-1-007');
 mixed.players[0].energy[0]=ram;
 const cleanDeck=live.players[0].deck.length;
 const mixedDeck=mixed.players[0].deck.length;
 live=toAttack(live,0);
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:waiting.uid});
 assert.equal(live.pending.kind,'effect-discard');
 assert.equal(live.pending.player,0);
 assert.equal(live.players[0].deck.length,cleanDeck-1);
 let kept=structuredClone(mixed);
 kept.players[0].energy[0]=null;
 kept.players[0].deck.push(ram);
 kept=toAttack(kept,0);
 kept=dispatchUniversalAction(packs,kept,{type:'attack',uid:waiting.uid});
 assert.equal(kept.pending.kind,'effect-discard');
 mixed=toAttack(mixed,0);
 mixed=dispatchUniversalAction(packs,mixed,{type:'attack',uid:waiting.uid});
 assert.equal(mixed.pending.kind,'block');
 assert.equal(mixed.players[0].deck.length,mixedDeck);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,mixed),true);
 assert.equal(assertUniversalMatch(packs,kept),true);
});

const emiliaDownCounts={
 ...Object.fromEntries(['REZ-1-090','REZ-1-081','REZ-1-086','REZ-1-067','REZ-1-024',
  'REZ-1-014','REZ-1-006','REZ-1-016','REZ-1-043','REZ-1-003','REZ-1-091','REZ-1-033'].map(id=>[id,4])),
 'REZ-1-054':2
};
const emiliaDown=seed=>newUniversalMatch(packs,{decks:[emiliaDownCounts,emiliaDownCounts],first:0,seed});
function restedMain(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='restedRetireImpact'&&a.uid===uid);
}
test('Emilia raids onto Emilia, may drop one front by 3500, and retires only while rested',()=>{
 assert.equal(Object.values(emiliaDownCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaDownCounts),[]);
 const printed=pack.cards['REZ-1-090'];
 assert.equal(printed.raidName,'エミリア');
 assert.equal(printed.energy,6);
 assert.equal(printed.trigger,'raid');
 assert.deepEqual(printed.effects.onPlay,[{op:'enemyBpDown',bp:3500,optional:true,zone:'front'}]);
 assert.deepEqual(printed.mainAbility,{
  op:'restedFrontRetireReadyImpact',frontOnly:true,oncePerTurn:true,bp:1500});
 const shell={id:'EMI90',name:'エミリア',color:'purple',type:'character',energy:6,ap:1,bp:4000,gen:0,
  traits:['王選候補者'],trigger:'raid',raidName:'エミリア',implementation:'dsl',
  effects:{onPlay:[{op:'enemyBpDown',bp:3500,optional:true,zone:'front'}]},
  mainAbility:{op:'restedFrontRetireReadyImpact',frontOnly:true,oncePerTurn:true,bp:1000}};
 assert.throws(()=>createUniversalPack({id:'bad-emi90',cards:[shell]}),/rested front/);

 let live=emiliaDown(7501);
 fuel(live,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(live,0,'REZ-1-081');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-014');
 live.players[0].front[1]=stranger;
 const decoy=pull(live,0,'REZ-1-090');
 live.players[0].front[2]=decoy;
 const tall=pull(live,1,'REZ-1-067');
 live.players[1].front[0]=tall;
 const exact=pull(live,1,'REZ-1-024');
 live.players[1].front[1]=exact;
 const over=pull(live,1,'REZ-1-014');
 live.players[1].front[2]=over;
 live=ownMain(live,2);
 live.players[0].energy[0].buffs=[{energy:1,untilTurn:live.turn}];
 live.players[0].energy[1].buffs=[{energy:1,untilTurn:live.turn}];
 assert.equal(universalEnergyByColor(packs,live,0).purple,6);
 const waiting=pull(live,0,'REZ-1-090');
 live.players[0].hand.push(waiting);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===decoy.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 const before=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.players[0].deck.length,before);
 assert.equal(live.pending.kind,'effect-target');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.bp,3500);
 assert.deepEqual(live.pending.choices,[tall.uid,exact.uid,over.uid]);
 let skipped=structuredClone(live);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseTarget',uid:null});
 assert.equal(universalBp(pack,skipped,at(skipped,1,tall.uid)),4000);
 let lowered=structuredClone(live);
 lowered=dispatchUniversalAction(packs,lowered,{type:'chooseTarget',uid:tall.uid});
 assert.equal(lowered.pending,null);
 assert.equal(universalBp(pack,lowered,at(lowered,1,tall.uid)),500);
 assert.equal(at(lowered,1,tall.uid).uid,tall.uid);
 live=skipped;
 assert.equal(restedMain(live,waiting.uid),false);
 at(live,0,waiting.uid).ready=false;
 const parked=structuredClone(live);
 const from=parked.players[0].front.findIndex(c=>c?.uid===waiting.uid);
 const held=parked.players[0].front[from];
 const displaced=parked.players[0].energy[3];
 parked.players[0].front[from]=displaced;
 parked.players[0].energy[3]=held;
 assert.equal(restedMain(parked,waiting.uid),false);
 let bare=structuredClone(live);
 const foe=bare.players[1].front.findIndex(c=>c?.uid===exact.uid);
 bare.players[1].deck.push(bare.players[1].front[foe]);
 bare.players[1].front[foe]=null;
 assert.equal(restedMain(bare,waiting.uid),true);
 bare=dispatchUniversalAction(packs,bare,{type:'activate',uid:waiting.uid,mode:'restedRetireImpact'});
 assert.equal(bare.pending,null);
 assert.equal(at(bare,0,waiting.uid).ready,true);
 assert.equal(universalImpact(pack,bare,at(bare,0,waiting.uid)),1);
 assert.equal(restedMain(live,waiting.uid),true);
 live=dispatchUniversalAction(packs,live,{type:'activate',uid:waiting.uid,mode:'restedRetireImpact'});
 assert.equal(live.pending.kind,'effect-rested-retire-impact');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.ceiling,1500);
 assert.equal(Object.keys(live.pending).length,7);
 assert.deepEqual(live.pending.choices,[exact.uid]);
 assert.equal(V2_PENDING_LABELS['effect-rested-retire-impact'],'選擇是否使對手前線退場');
 assert.equal(uiActionLabel({type:'chooseRestedRetire',uid:null},{pack,state:live}),'不使角色退場');
 assert.equal(uiActionLabel({type:'chooseRestedRetire',uid:exact.uid},{pack,state:live}),'使 エミリア 退場');
 assert.equal(chooseUniversalAiAction(packs,live).uid,exact.uid);
 const stale=structuredClone(live);
 const slot=stale.players[1].front.findIndex(c=>c?.uid===exact.uid);
 stale.players[1].deck.push(stale.players[1].front[slot]);
 stale.players[1].front[slot]=null;
 assert.throws(()=>legalUniversalActions(packs,stale),/Invalid rested front retirement pending/);
 let declined=structuredClone(live);
 declined=dispatchUniversalAction(packs,declined,{type:'chooseRestedRetire',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(at(declined,1,exact.uid).uid,exact.uid);
 assert.equal(at(declined,0,waiting.uid).ready,true);
 assert.equal(universalImpact(pack,declined,at(declined,0,waiting.uid)),1);
 at(declined,0,waiting.uid).ready=false;
 assert.equal(restedMain(declined,waiting.uid),false);
 live=dispatchUniversalAction(packs,live,{type:'chooseRestedRetire',uid:exact.uid});
 assert.equal(live.pending,null);
 assert.ok(live.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(live.players[1].front[1],null);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),1);
 live=reachStart(live,0,3);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),0);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,lowered),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

const remHandCounts={
 ...Object.fromEntries(['REZ-1-019','REZ-1-014','REZ-1-008','REZ-1-080','REZ-1-024',
  'REZ-1-079','REZ-1-003','REZ-1-043','REZ-1-086','REZ-1-091','REZ-1-054'].map(id=>[id,4])),
 'REZ-1-007':3,'REZ-1-017':1,'REZ-1-016':1,'REZ-1-033':1
};
const remHand=seed=>newUniversalMatch(packs,{decks:[remHandCounts,remHandCounts],first:0,seed});
function grantMain(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='grantNamedImpact'&&a.uid===uid);
}
test('Rem raids onto Rem, rests one cheap yellow Ram or Rem, and grants impact to another',()=>{
 assert.equal(Object.values(remHandCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,remHandCounts),[]);
 const printed=pack.cards['REZ-1-019'];
 assert.equal(printed.raidName,'レム');
 assert.equal(printed.energy,4);
 assert.deepEqual(printed.effects.onPlay,[{op:'deployOwnHandNamedRest',color:'yellow',
  maxEnergy:3,ap:1,names:['ラム','レム'],max:1,optional:true}]);
 assert.deepEqual(printed.mainAbility,{op:'frontOnceGrantImpactNamed',frontOnly:true,
  oncePerTurn:true,excludeSelf:true,names:['ラム','レム']});
 const named={op:'deployOwnHandNamedRest',color:'yellow',maxEnergy:3,ap:1,
  names:['ラム','レム'],max:1,optional:true};
 const shell={id:'REM19',name:'レム',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:'raid',raidName:'レム',implementation:'dsl',effects:{onPlay:[named]},
  mainAbility:{op:'frontOnceGrantImpactNamed',frontOnly:true,oncePerTurn:true,
   excludeSelf:false,names:['ラム','レム']}};
 assert.throws(()=>createUniversalPack({id:'bad-rem19',cards:[shell]}),/named impact/);
 assert.throws(()=>createUniversalPack({id:'bad-rem19',cards:[{...shell,type:'event',bp:0,gen:0,
  raidName:null,trigger:null,mainAbility:null,effects:{onPlay:[named]}}]}),/onPlay/);

 let live=remHand(7601);
 fuel(live,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-016']);
 const base=pull(live,0,'REZ-1-014');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-003');
 live.players[0].front[1]=stranger;
 const decoy=pull(live,0,'REZ-1-019');
 live.players[0].front[2]=decoy;
 live=ownMain(live,2);
 assert.equal(universalEnergyByColor(packs,live,0).yellow,4);
 const waiting=pull(live,0,'REZ-1-019');
 const ram=pull(live,0,'REZ-1-008');
 const other=pull(live,0,'REZ-1-014');
 const expensive=pull(live,0,'REZ-1-017');
 const purple=pull(live,0,'REZ-1-080');
 const emilia=pull(live,0,'REZ-1-024');
 live.players[0].hand.push(waiting,ram,other,expensive,purple,emilia);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===decoy.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(live.pending.kind,'effect-hand-named-rest');
 assert.equal(live.pending.optional,true);
 assert.ok(live.pending.choices.includes(ram.uid));
 assert.ok(live.pending.choices.includes(other.uid));
 assert.equal(live.pending.choices.includes(expensive.uid),false);
 assert.equal(live.pending.choices.includes(purple.uid),false);
 assert.equal(live.pending.choices.includes(emilia.uid),false);
 for(const uid of live.pending.choices){
  const printedChoice=pack.cards[live.players[0].hand.find(c=>c.uid===uid).cardId];
  assert.equal(printedChoice.color,'yellow');
  assert.ok(printedChoice.energy<=3);
  assert.equal(printedChoice.ap,1);
  assert.ok(printedChoice.name==='ラム'||printedChoice.name==='レム');
 }
 assert.equal(legalUniversalActions(packs,live).some(a=>a.mode==='raid'),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.uid===expensive.uid||a.uid===purple.uid||a.uid===emilia.uid),false);
 assert.equal(V2_PENDING_LABELS['effect-hand-named-rest'],'選擇是否以休息狀態登場');
 assert.equal(uiActionLabel({type:'chooseHandNamedRest',uid:null},{pack,state:live}),'不登場');
 assert.equal(uiActionLabel({type:'chooseHandNamedRest',uid:ram.uid},{pack,state:live}),'使 ラム 以休息狀態登場');
 assert.notEqual(chooseUniversalAiAction(packs,live).uid,null);
 let skipped=structuredClone(live);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseHandNamedRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===ram.uid));
 const enter=legalUniversalActions(packs,live).find(a=>a.type==='chooseHandNamedRest'&&a.uid===ram.uid&&a.line==='front');
 assert.ok(enter);
 live=dispatchUniversalAction(packs,live,enter);
 assert.equal(live.pending,null);
 assert.equal(at(live,0,ram.uid).ready,false);
 assert.equal(live.players[0].front[enter.slot].uid,ram.uid);
 parkLine(live,0,stranger.uid);
 const handOther=live.players[0].hand.findIndex(c=>c.uid===other.uid);
 live.players[0].front[1]=live.players[0].hand.splice(handOther,1)[0];
 const held=live.players[0].energy[3];
 live.players[0].outside.push(held);
 const handPurple=live.players[0].hand.findIndex(c=>c.uid===purple.uid);
 live.players[0].energy[3]=live.players[0].hand.splice(handPurple,1)[0];
 for(const gen of live.players[0].energy.slice(0,3).filter(Boolean))parkLine(live,0,gen.uid);
 assert.equal(grantMain(live,waiting.uid),true);
 const parked=structuredClone(live);
 const from=parked.players[0].front.findIndex(c=>c?.uid===waiting.uid);
 const swap=parked.players[0].energy[0];
 parked.players[0].energy[0]=parked.players[0].front[from];
 parked.players[0].front[from]=swap;
 assert.equal(grantMain(parked,waiting.uid),false);
 const lonely=structuredClone(live);
 for(const uid of [other.uid,decoy.uid,ram.uid,purple.uid])parkLine(lonely,0,uid);
 assert.equal(grantMain(lonely,waiting.uid),false);
 live=dispatchUniversalAction(packs,live,{type:'activate',uid:waiting.uid,mode:'grantNamedImpact'});
 assert.equal(live.pending.kind,'effect-grant-named-impact');
 assert.equal(live.pending.optional,true);
 assert.equal(Object.keys(live.pending).length,7);
 assert.deepEqual(live.pending.choices,[other.uid,decoy.uid,ram.uid,purple.uid]);
 assert.equal(V2_PENDING_LABELS['effect-grant-named-impact'],'選擇是否賦予衝擊');
 assert.equal(uiActionLabel({type:'chooseGrantNamedImpact',uid:null},{pack,state:live}),'不賦予衝擊');
 assert.equal(uiActionLabel({type:'chooseGrantNamedImpact',uid:purple.uid},{pack,state:live}),'使 ラム 獲得衝擊 1');
 assert.equal(chooseUniversalAiAction(packs,live).uid,other.uid);
 const stale=structuredClone(live);
 parkLine(stale,0,purple.uid);
 assert.throws(()=>legalUniversalActions(packs,stale),/Invalid named impact grant pending/);
 let declined=structuredClone(live);
 declined=dispatchUniversalAction(packs,declined,{type:'chooseGrantNamedImpact',uid:null});
 assert.equal(universalImpact(pack,declined,at(declined,0,purple.uid)),0);
 assert.equal(universalImpact(pack,declined,at(declined,0,waiting.uid)),0);
 assert.equal(grantMain(declined,waiting.uid),false);
 live=dispatchUniversalAction(packs,live,{type:'chooseGrantNamedImpact',uid:purple.uid});
 assert.equal(live.pending,null);
 assert.equal(universalImpact(pack,live,at(live,0,purple.uid)),1);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),0);
 live=reachStart(live,0,3);
 assert.equal(universalImpact(pack,live,at(live,0,purple.uid)),0);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

const remImpactCounts={
 ...Object.fromEntries(['REZ-1-014','REZ-1-043','REZ-1-037','REZ-1-068','REZ-1-086',
  'REZ-1-016','REZ-1-024','REZ-1-091','REZ-1-006','REZ-1-003','REZ-1-054'].map(id=>[id,4])),
 'REZ-1-053':3,'REZ-1-040':1,'REZ-1-029':2
};
const remImpact=seed=>newUniversalMatch(packs,{decks:[remImpactCounts,remImpactCounts],first:0,seed});
test('Rem raids onto Rem, rests a blue zero-cost Subaru, and grants a 4000 block ceiling',()=>{
 assert.equal(Object.values(remImpactCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,remImpactCounts),[]);
 const printed=pack.cards['REZ-1-053'];
 assert.equal(printed.raidName,'レム');
 assert.equal(printed.energy,5);
 assert.equal(printed.printedImpact,1);
 assert.deepEqual(printed.effects.onPlay,[{op:'deployOutsidePrintedRest',name:'ナツキ・スバル',
  color:'blue',energy:0,optional:true}]);
 assert.deepEqual(printed.effects.onAttack,[{op:'grantPrintedBlockAtLeast',name:'ナツキ・スバル',
  color:'blue',energy:0,bp:4000,optional:true}]);
 const rest={op:'deployOutsidePrintedRest',name:'ナツキ・スバル',color:'blue',energy:0,optional:true};
 const ceiling={op:'grantPrintedBlockAtLeast',name:'ナツキ・スバル',color:'blue',energy:0,bp:4000,optional:true};
 const shell={id:'REM53',name:'レム',color:'blue',type:'character',energy:5,ap:1,bp:4000,gen:0,
  traits:[],trigger:'raid',raidName:'レム',printedImpact:1,implementation:'dsl',
  effects:{onPlay:[rest],onAttack:[ceiling]}};
 assert.throws(()=>createUniversalPack({id:'bad-rem53',cards:[{...shell,effects:{
  onPlay:[{...rest,energy:1}],onAttack:[ceiling]}}]}),/exact outside/);
 assert.throws(()=>createUniversalPack({id:'bad-rem53',cards:[{...shell,effects:{onPlay:[ceiling]}}]}),/onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-rem53',cards:[{...shell,type:'event',bp:0,gen:0,
  raidName:null,trigger:null,printedImpact:undefined,effects:{onPlay:[rest]}}]}),/onPlay/);

 let live=remImpact(7701);
 fuel(live,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const base=pull(live,0,'REZ-1-014');
 live.players[0].front[0]=base;
 const stranger=pull(live,0,'REZ-1-003');
 live.players[0].front[1]=stranger;
 live=ownMain(live,2);
 live.players[0].energy[0].buffs=[{energy:1,untilTurn:live.turn}];
 assert.equal(universalEnergyByColor(packs,live,0).blue,5);
 const waiting=pull(live,0,'REZ-1-053');
 const cheap=pull(live,0,'REZ-1-037');
 const costly=pull(live,0,'REZ-1-040');
 const purple=pull(live,0,'REZ-1-068');
 const readySubaru=stamp(live,pull(live,0,'REZ-1-037'));
 live.players[0].hand.push(waiting);
 live.players[0].outside.push(cheap,costly);
 live.players[0].front[2]=purple;
 live.players[0].front[3]=readySubaru;
 const small=stamp(live,pull(live,1,'REZ-1-006'));
 const mid=stamp(live,pull(live,1,'REZ-1-024'));
 const tall=stamp(live,pull(live,1,'REZ-1-040'));
 live.players[1].front[0]=small;
 live.players[1].front[1]=mid;
 live.players[1].front[2]=tall;
 quietLife(live);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===stranger.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===purple.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(universalImpact(pack,live,at(live,0,waiting.uid)),1);
 assert.equal(live.pending.kind,'effect-outside-printed-rest');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.energy,0);
 assert.equal(Object.keys(live.pending).length,8);
 assert.ok(live.pending.choices.includes(cheap.uid));
 assert.equal(live.pending.choices.includes(costly.uid),false);
 assert.equal(live.pending.choices.includes(purple.uid),false);
 assert.equal(live.pending.choices.includes(readySubaru.uid),false);
 for(const uid of live.pending.choices){
  const choice=pack.cards[live.players[0].outside.find(c=>c.uid===uid).cardId];
  assert.equal(choice.color,'blue');
  assert.equal(choice.energy,0);
  assert.equal(choice.name,'ナツキ・スバル');
 }
 assert.equal(V2_PENDING_LABELS['effect-outside-printed-rest'],'選擇是否以休息狀態登場');
 assert.equal(uiActionLabel({type:'chooseOutsidePrintedRest',uid:null},{pack,state:live}),'不登場');
 assert.equal(uiActionLabel({type:'chooseOutsidePrintedRest',uid:cheap.uid},{pack,state:live}),'使 ナツキ・スバル 以休息狀態登場');
 assert.notEqual(chooseUniversalAiAction(packs,live).uid,null);
 const staleDeploy=structuredClone(live);
 const outsideAt=staleDeploy.players[0].outside.findIndex(c=>c.uid===cheap.uid);
 staleDeploy.players[0].deck.push(staleDeploy.players[0].outside.splice(outsideAt,1)[0]);
 assert.throws(()=>legalUniversalActions(packs,staleDeploy),/Invalid exact outside REST pending/);
 let skippedDeploy=structuredClone(live);
 skippedDeploy=dispatchUniversalAction(packs,skippedDeploy,{type:'chooseOutsidePrintedRest',uid:null});
 assert.equal(skippedDeploy.pending,null);
 assert.ok(skippedDeploy.players[0].outside.some(c=>c.uid===cheap.uid));
 parkLine(live,0,stranger.uid);
 const enter=legalUniversalActions(packs,live).find(a=>a.type==='chooseOutsidePrintedRest'&&
  a.uid===cheap.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(enter);
 live=dispatchUniversalAction(packs,live,enter);
 assert.equal(live.pending,null);
 assert.equal(at(live,0,cheap.uid).ready,false);
 assert.equal(live.players[0].front[enter.slot].uid,cheap.uid);
 live=toAttack(live,0);
 const bare=structuredClone(live);
 const bareSwing=legalUniversalActions(packs,bare).find(a=>a.type==='attack'&&a.uid===readySubaru.uid);
 assert.ok(bareSwing);
 const opened=dispatchUniversalAction(packs,bare,bareSwing);
 assert.equal(opened.pending.kind,'block');
 assert.equal(legalUniversalActions(packs,opened).some(a=>a.type==='chooseBlock'&&a.uid===tall.uid),true);
 const quiet=structuredClone(live);
 parkLine(quiet,0,readySubaru.uid);
 parkLine(quiet,0,cheap.uid);
 const direct=dispatchUniversalAction(packs,quiet,{type:'attack',uid:waiting.uid});
 assert.equal(direct.pending.kind,'block');
 const lifeBefore=live.players[1].life.length;
 live=dispatchUniversalAction(packs,live,{type:'attack',uid:waiting.uid});
 assert.equal(live.pending.kind,'effect-grant-printed-block');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.bp,4000);
 assert.equal(Object.keys(live.pending).length,9);
 assert.ok(live.pending.choices.includes(readySubaru.uid));
 assert.ok(live.pending.choices.includes(cheap.uid));
 assert.equal(live.pending.choices.includes(purple.uid),false);
 assert.equal(live.pending.choices.includes(costly.uid),false);
 assert.equal(V2_PENDING_LABELS['effect-grant-printed-block'],'選擇是否賦予防禦下限');
 assert.equal(uiActionLabel({type:'chooseGrantPrintedBlock',uid:null},{pack,state:live}),'不賦予防禦下限');
 assert.equal(uiActionLabel({type:'chooseGrantPrintedBlock',uid:readySubaru.uid},{pack,state:live}),
  '使 ナツキ・スバル 不會被 BP4000 以上的角色阻擋');
 assert.notEqual(chooseUniversalAiAction(packs,live).uid,null);
 const staleGrant=structuredClone(live);
 parkLine(staleGrant,0,readySubaru.uid);
 assert.throws(()=>legalUniversalActions(packs,staleGrant),/Invalid printed blocker ceiling pending/);
 let skipped=structuredClone(live);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseGrantPrintedBlock',uid:null});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(at(skipped,0,readySubaru.uid).blockAtLeastGranted,undefined);
 live=dispatchUniversalAction(packs,live,{type:'chooseGrantPrintedBlock',uid:readySubaru.uid});
 assert.equal(live.pending.kind,'block');
 assert.equal(at(live,0,readySubaru.uid).blockAtLeastGranted.bp,4000);
 assert.equal(at(live,0,cheap.uid).blockAtLeastGranted,undefined);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='chooseBlock'&&a.uid===tall.uid),true);
 live=dispatchUniversalAction(packs,live,{type:'chooseBlock',uid:small.uid});
 assert.equal(live.pending,null);
 assert.ok(live.players[1].outside.some(c=>c.uid===small.uid));
 assert.equal(live.players[1].life.length,lifeBefore-1);
 const second=legalUniversalActions(packs,live).find(a=>a.type==='attack'&&a.uid===readySubaru.uid);
 assert.ok(second);
 live=dispatchUniversalAction(packs,live,second);
 assert.equal(live.pending.kind,'block');
 const blocks=legalUniversalActions(packs,live).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===tall.uid),false);
 assert.equal(blocks.some(a=>a.uid===mid.uid),true);
 assert.equal(blocks.some(a=>a.uid===null),true);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,skippedDeploy),true);
 assert.equal(assertUniversalMatch(packs,opened),true);
 assert.equal(assertUniversalMatch(packs,direct),true);
});

const beatriceMoveCounts={
 ...Object.fromEntries(['REZ-1-077','REZ-1-072','REZ-1-086','REZ-1-068','REZ-1-014','REZ-1-006',
  'REZ-1-016','REZ-1-024','REZ-1-043','REZ-1-091','REZ-1-003','REZ-1-054'].map(id=>[id,4])),
 'REZ-1-029':2
};
const beatriceMove=seed=>newUniversalMatch(packs,{decks:[beatriceMoveCounts,beatriceMoveCounts],first:0,seed});
function untilPhase(bundle,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(bundle,s,{type:'chooseHandLimit',uid:hand.uid});
  }else if(s.pending)throw Error('unexpected pending '+s.pending.kind);
  else{
   const next=legalUniversalActions(bundle,s).find(a=>a.type==='next');
   assert.ok(next,'stuck before '+phase);
   s=dispatchUniversalAction(bundle,s,next);
  }
  assert.ok(++guard<64,'did not reach '+phase);
 }
 return s;
}
test('Beatrice raids onto Beatrice, moves one front to energy, and locks movement only after an own-effect entry',()=>{
 assert.equal(Object.values(beatriceMoveCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,beatriceMoveCounts),[]);
 const printed=pack.cards['REZ-1-077'];
 assert.equal(printed.raidName,'ベアトリス');
 assert.equal(printed.energy,3);
 assert.equal(printed.bp,3500);
 assert.deepEqual(printed.effects.onPlay,[{op:'moveOppFrontToEnergy',optional:true,lockIfEntry:'ownEffect'}]);
 assert.deepEqual(printed.passiveBonuses,[{bp:500,condition:{kind:'ownNameExists',turn:'own',
  zone:'field',excludeSelf:false,name:'ナツキ・スバル'}}]);
 const move={op:'moveOppFrontToEnergy',optional:true,lockIfEntry:'ownEffect'};
 const shell={id:'BEA77',name:'ベアトリス',color:'purple',type:'character',energy:3,ap:1,bp:3500,gen:0,
  traits:[],trigger:'raid',raidName:'ベアトリス',implementation:'dsl',effects:{onPlay:[move]}};
 assert.throws(()=>createUniversalPack({id:'bad-bea77',cards:[{...shell,effects:{onPlay:[
  {...move,optional:undefined}]}}]}),/front move/);
 assert.throws(()=>createUniversalPack({id:'bad-bea77',cards:[{...shell,type:'event',bp:0,gen:0,
  raidName:null,trigger:null,effects:{onPlay:[move]}}]}),/onPlay/);

 let live=beatriceMove(7801);
 fuel(live,['REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(live,0,'REZ-1-072');
 live.players[0].front[0]=base;
 const decoy=pull(live,0,'REZ-1-077');
 live.players[0].front[1]=decoy;
 live=ownMain(live,2);
 assert.equal(universalEnergyByColor(packs,live,0).purple,3);
 const subaru=pull(live,0,'REZ-1-068');
 subaru.ready=true;
 live.players[0].energy[3]=subaru;
 const waiting=pull(live,0,'REZ-1-077');
 live.players[0].hand.push(waiting);
 const victim=stamp(live,pull(live,1,'REZ-1-014'));
 const aside=stamp(live,pull(live,1,'REZ-1-006'));
 live.players[1].front[0]=victim;
 live.players[1].energy[0]=aside;
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===decoy.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===subaru.uid),false);
 const empty=structuredClone(live);
 empty.players[1].deck.push(empty.players[1].front[0]);
 empty.players[1].front[0]=null;
 const emptyRaid=legalUniversalActions(packs,empty).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 const emptied=dispatchUniversalAction(packs,empty,emptyRaid);
 assert.equal(emptied.pending,null);
 assert.equal(universalBp(pack,emptied,at(emptied,0,waiting.uid)),4000);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(universalBp(pack,live,at(live,0,waiting.uid)),4000);
 const side=live.active;
 live.active=1;
 assert.equal(universalBp(pack,live,at(live,0,waiting.uid)),3500);
 live.active=side;
 assert.equal(live.pending.kind,'effect-move-opp-front');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.lock,false);
 assert.equal(Object.keys(live.pending).length,6);
 assert.deepEqual(live.pending.choices,[victim.uid]);
 assert.equal(V2_PENDING_LABELS['effect-move-opp-front'],'選擇是否將對手前線移至能源線');
 assert.equal(uiActionLabel({type:'chooseMoveOppFront',uid:null},{pack,state:live}),'不移動');
 assert.equal(uiActionLabel({type:'chooseMoveOppFront',uid:victim.uid},{pack,state:live}),'將 レム 移至能源線');
 assert.notEqual(chooseUniversalAiAction(packs,live).uid,null);
 const stale=structuredClone(live);
 stale.players[1].deck.push(stale.players[1].front[0]);
 stale.players[1].front[0]=null;
 assert.throws(()=>legalUniversalActions(packs,stale),/Invalid opponent front move pending/);
 let skipped=structuredClone(live);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseMoveOppFront',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(at(skipped,1,victim.uid),skipped.players[1].front.find(c=>c?.uid===victim.uid));
 assert.equal(skipped.continuousStates.some(e=>e.kind==='cannotMove'),false);
 const shift=legalUniversalActions(packs,live).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===victim.uid&&a.replaceUid===undefined);
 assert.ok(shift);
 live=dispatchUniversalAction(packs,live,shift);
 assert.equal(live.pending,null);
 assert.equal(live.players[1].energy[shift.slot].uid,victim.uid);
 assert.equal(live.players[1].front[0],null);
 assert.equal(live.continuousStates.some(e=>e.kind==='cannotMove'),false);
 const host=at(live,0,waiting.uid);
 const buriedSlot=live.players[0].energy.findIndex(c=>c?.uid===subaru.uid);
 const buried=live.players[0].energy[buriedSlot];
 live.players[0].energy[buriedSlot]=null;
 host.stack.push(buried);
 assert.equal(universalBp(pack,live,host),3500);
 live=untilPhase(packs,live,1,'move');
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='move'&&a.uid===victim.uid),true);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,emptied),true);

 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:0,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'beatrice-move-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-077']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-072']),
  {id:'LAB-STEP',name:'Step',color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:0,
   traits:[],trigger:null,step:true,implementation:'vanilla',effects:{}},
  {id:'LAB-DEPLOY-BEA',name:'Deploy Beatrice',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'dsl',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
    color:'purple',maxEnergy:4,ap:1,max:1,optional:true,names:['ベアトリス']}]}},
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H'].map(id=>lab(id,'purple')),
  lab('LAB-I','purple')
 ]});
 const fixtureCounts={
  'REZ-1-077':4,'REZ-1-072':4,'LAB-STEP':4,'LAB-DEPLOY-BEA':4,
  'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':4,'LAB-G':4,'LAB-H':4,'LAB-I':2
 };
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let own=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:7802});
 const home=pull(own,0,'REZ-1-072');
 own.players[0].front[0]=home;
 const locked=pull(own,1,'LAB-STEP');
 locked.ready=true;
 own.players[1].front[0]=locked;
 own=dispatchUniversalAction(fp,own,{type:'next'});
 own=dispatchUniversalAction(fp,own,{type:'next'});
 assert.equal(own.phase,'main');
 const top=pull(own,0,'REZ-1-077');
 own.players[0].hand.push(top);
 const caster=pull(own,0,'LAB-DEPLOY-BEA');
 own.players[0].hand.push(caster);
 own=dispatchUniversalAction(fp,own,{type:'event',uid:caster.uid});
 assert.equal(own.pending.kind,'effect-hand-rest-or-raid');
 const played=legalUniversalActions(fp,own).find(a=>a.type==='chooseHandRestOrRaid'&&
  a.mode==='raid'&&a.uid===top.uid&&a.baseUid===home.uid);
 assert.ok(played);
 own=dispatchUniversalAction(fp,own,played);
 assert.equal(own.pending.kind,'effect-move-opp-front');
 assert.equal(own.pending.lock,true);
 assert.deepEqual(own.pending.choices,[locked.uid]);
 const moved=legalUniversalActions(fp,own).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===locked.uid&&a.slot===0);
 assert.ok(moved);
 own=dispatchUniversalAction(fp,own,moved);
 assert.equal(own.pending,null);
 assert.equal(own.players[1].energy[0].uid,locked.uid);
 assert.equal(own.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===locked.uid&&
  e.until.player===0&&e.until.phase==='start'),true);
 own=untilPhase(fp,own,1,'move');
 assert.equal(legalUniversalActions(fp,own).some(a=>a.type==='move'&&a.uid===locked.uid),false);
 const held=own.players[1].energy[0];
 own.players[1].energy[0]=null;
 own.players[1].front[0]=held;
 assert.equal(legalUniversalActions(fp,own).some(a=>a.type==='step'&&a.uid===locked.uid),false);
 own=untilPhase(fp,own,0,'start');
 assert.equal(own.players[0].ownTurns,2);
 assert.equal(own.continuousStates.some(e=>e.kind==='cannotMove'),false);
 assert.equal(assertUniversalMatch(fp,own),true);
});

const emiliaSwapCounts={
 ...Object.fromEntries(['REZ-1-081','REZ-1-086','REZ-1-068','REZ-1-014','REZ-1-006',
  'REZ-1-016','REZ-1-024','REZ-1-091','REZ-1-003','REZ-1-054','REZ-1-043'].map(id=>[id,4])),
 'REZ-1-089':3,'REZ-1-053':1,'REZ-1-029':2
};
const emiliaSwap=seed=>newUniversalMatch(packs,{decks:[emiliaSwapCounts,emiliaSwapCounts],first:0,seed});
function energySwap(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='energySwap'&&a.uid===uid);
}
test('Emilia raids onto Emilia, blocks low BP, rests an unblocked front, and swaps from energy',()=>{
 assert.equal(Object.values(emiliaSwapCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,emiliaSwapCounts),[]);
 const printed=pack.cards['REZ-1-089'];
 assert.equal(printed.raidName,'エミリア');
 assert.equal(printed.energy,5);
 assert.equal(printed.bp,4000);
 assert.equal(printed.impactNull,true);
 assert.equal(printed.unblockedRestFront,true);
 assert.deepEqual(printed.blockBpRestriction,{relation:'atMost',bp:2000,condition:null});
 assert.deepEqual(printed.mainAbility,{op:'energySwapOwnFront',line:'energy',oncePerTurn:true});
 assert.deepEqual(printed.effects,{});
 const shell={id:'EMI89',name:'エミリア',color:'purple',type:'character',energy:5,ap:1,bp:4000,gen:0,
  traits:['王選候補者'],trigger:'raid',raidName:'エミリア',implementation:'dsl',impactNull:true,
  unblockedRestFront:true,blockBpRestriction:{relation:'atMost',bp:2000,condition:null},
  mainAbility:{op:'energySwapOwnFront',line:'energy',oncePerTurn:true},effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-emi89',cards:[{...shell,mainAbility:{
  op:'energySwapOwnFront',line:'front',oncePerTurn:true}}]}),/energy-line swap/);
 assert.throws(()=>createUniversalPack({id:'bad-emi89',cards:[{...shell,unblockedRestFront:false}]}),
  /unblocked front rest/);
 assert.throws(()=>createUniversalPack({id:'bad-emi89',cards:[{...shell,type:'event',bp:0,gen:0,
  raidName:null,trigger:null,mainAbility:null,impactNull:undefined,blockBpRestriction:null}]}),
  /unblocked front rest/);

 let live=emiliaSwap(7901);
 fuel(live,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(live,0,'REZ-1-081');
 live.players[0].front[0]=base;
 const decoy=pull(live,0,'REZ-1-089');
 live.players[0].front[1]=decoy;
 const stranger=pull(live,0,'REZ-1-003');
 live.players[0].front[2]=stranger;
 live=ownMain(live,2);
 live.players[0].energy[0].buffs=[{energy:1,untilTurn:live.turn}];
 assert.equal(universalEnergyByColor(packs,live,0).purple,5);
 const waiting=pull(live,0,'REZ-1-089');
 live.players[0].hand.push(waiting);
 const partner=stamp(live,pull(live,0,'REZ-1-068'));
 live.players[0].front[3]=partner;
 const low=stamp(live,pull(live,1,'REZ-1-006'));
 const even=stamp(live,pull(live,1,'REZ-1-068'));
 const tall=stamp(live,pull(live,1,'REZ-1-014'));
 live.players[1].front[0]=low;
 live.players[1].front[1]=even;
 live.players[1].front[2]=tall;
 quietLife(live);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===decoy.uid),false);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===stranger.uid),false);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 assert.equal(raid.line,undefined);
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(live.pending,null);
 assert.equal(at(live,0,waiting.uid).ready,true);
 assert.equal(at(live,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(energySwap(live,waiting.uid),false);
 const onFront=structuredClone(live);

 let impact=structuredClone(live);
 const hitter=stamp(impact,pull(impact,1,'REZ-1-053'));
 impact.players[1].front[3]=hitter;
 const shield=pull(impact,0,'REZ-1-016');
 while(impact.players[0].life.length>5)impact.players[0].deck.push(impact.players[0].life.pop());
 impact.players[0].life.unshift(shield);
 impact=toAttack(impact,1);
 const ownLife=impact.players[0].life.length;
 impact=dispatchUniversalAction(packs,impact,{type:'attack',uid:hitter.uid});
 assert.equal(impact.pending.kind,'block');
 let nulled=structuredClone(impact);
 nulled=dispatchUniversalAction(packs,nulled,{type:'chooseBlock',uid:waiting.uid});
 assert.equal(nulled.pending,null);
 assert.equal(nulled.players[0].life.length,ownLife);
 assert.ok(nulled.players[0].outside.some(c=>c.uid===waiting.uid));
 assert.ok(nulled.players[0].outside.some(c=>c.uid===base.uid));
 let plain=structuredClone(impact);
 plain=dispatchUniversalAction(packs,plain,{type:'chooseBlock',uid:partner.uid});
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].life.length,ownLife-1);
 assert.ok(plain.players[0].outside.some(c=>c.uid===partner.uid));
 assert.equal(at(plain,0,waiting.uid).uid,waiting.uid);

 live=toAttack(live,0);
 const swing=dispatchUniversalAction(packs,live,{type:'attack',uid:waiting.uid});
 assert.equal(swing.pending.kind,'block');
 const blocks=legalUniversalActions(packs,swing).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===even.uid),false);
 assert.equal(blocks.some(a=>a.uid===tall.uid),true);
 assert.equal(blocks.some(a=>a.uid===null),true);
 const boosted=structuredClone(swing);
 boosted.players[1].front[0].buffs=[{bp:1500,untilTurn:boosted.turn}];
 assert.equal(universalBp(pack,boosted,boosted.players[1].front[0]),2500);
 assert.equal(legalUniversalActions(packs,boosted).some(a=>a.type==='chooseBlock'&&a.uid===low.uid),true);
 const shortened=structuredClone(swing);
 shortened.players[1].front[2].buffs=[{bp:-1000,untilTurn:shortened.turn}];
 assert.equal(legalUniversalActions(packs,shortened).some(a=>a.type==='chooseBlock'&&a.uid===tall.uid),false);
 const emptyFront=structuredClone(swing);
 for(const card of emptyFront.players[1].front.filter(Boolean))
  emptyFront.players[1].deck.push(card);
 emptyFront.players[1].front=[null,null,null,null];
 const emptied=dispatchUniversalAction(packs,emptyFront,{type:'chooseBlock',uid:null});
 assert.equal(emptied.pending,null);
 assert.equal(emptied.players[1].life.length,swing.players[1].life.length-1);
 let blocked=structuredClone(swing);
 const lifeBefore=blocked.players[1].life.length;
 blocked=dispatchUniversalAction(packs,blocked,{type:'chooseBlock',uid:tall.uid});
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[1].life.length,lifeBefore);
 assert.ok(blocked.players[1].outside.some(c=>c.uid===tall.uid));
 assert.equal(at(blocked,1,low.uid).ready,true);
 assert.equal(at(blocked,1,even.uid).ready,true);
 let open=structuredClone(swing);
 open=dispatchUniversalAction(packs,open,{type:'chooseBlock',uid:null});
 assert.equal(open.pending.kind,'effect-unblocked-rest');
 assert.equal(open.pending.optional,true);
 assert.equal(Object.keys(open.pending).length,6);
 assert.deepEqual(open.pending.choices,[low.uid,even.uid,tall.uid]);
 assert.equal(open.players[1].life.length,lifeBefore);
 assert.equal(V2_PENDING_LABELS['effect-unblocked-rest'],'選擇是否使對手前線休息');
 assert.equal(uiActionLabel({type:'chooseUnblockedRest',uid:null},{pack,state:open}),'不使角色休息');
 assert.equal(uiActionLabel({type:'chooseUnblockedRest',uid:low.uid},{pack,state:open}),'使 ラム 休息');
 assert.notEqual(chooseUniversalAiAction(packs,open).uid,null);
 const stale=structuredClone(open);
 stale.players[1].deck.push(stale.players[1].front[0]);
 stale.players[1].front[0]=null;
 assert.throws(()=>legalUniversalActions(packs,stale),/Invalid unblocked front rest pending/);
 let skipped=structuredClone(open);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseUnblockedRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].life.length,lifeBefore-1);
 assert.equal(at(skipped,1,low.uid).ready,true);
 open=dispatchUniversalAction(packs,open,{type:'chooseUnblockedRest',uid:low.uid});
 assert.equal(open.pending,null);
 assert.equal(open.players[1].life.length,lifeBefore-1);
 assert.equal(at(open,1,low.uid).ready,false);
 assert.equal(at(open,1,even.uid).ready,true);
 assert.equal(at(open,1,tall.uid).ready,true);

 const lined=structuredClone(onFront);
 assert.equal(energySwap(lined,waiting.uid),false);
 const from=lined.players[0].front.findIndex(c=>c?.uid===waiting.uid);
 const held=lined.players[0].front[from];
 const displaced=lined.players[0].energy[0];
 lined.players[0].front[from]=displaced;
 lined.players[0].energy[0]=held;
 assert.equal(energySwap(lined,waiting.uid),true);
 const bare=structuredClone(lined);
 for(const card of bare.players[0].front.filter(Boolean))bare.players[0].deck.push(card);
 bare.players[0].front=[null,null,null,null];
 assert.equal(energySwap(bare,waiting.uid),false);
 lined.players[0].energy[0].buffs=[{energy:1,untilTurn:lined.turn}];
 let swapping=dispatchUniversalAction(packs,lined,{type:'activate',uid:waiting.uid,mode:'energySwap'});
 assert.equal(swapping.pending.kind,'effect-energy-swap');
 assert.equal(Object.keys(swapping.pending).length,5);
 assert.ok(swapping.pending.choices.includes(partner.uid));
 assert.ok(swapping.pending.choices.includes(displaced.uid));
 assert.equal(swapping.pending.choices.includes(waiting.uid),false);
 assert.equal(swapping.pending.choices.includes(base.uid),false);
 assert.equal(V2_PENDING_LABELS['effect-energy-swap'],'選擇要交換位置的己方前線');
 assert.equal(uiActionLabel({type:'chooseEnergySwap',uid:partner.uid},{pack,state:swapping}),
  '與 ナツキ・スバル 交換位置');
 assert.equal(uiActionLabel({type:'activate',uid:waiting.uid,mode:'energySwap'},{pack,state:lined}),
  '起動主要：與 1 張己方前線角色交換位置');
 assert.equal(chooseUniversalAiAction(packs,swapping).type,'chooseEnergySwap');
 const staleSwap=structuredClone(swapping);
 parkLine(staleSwap,0,partner.uid);
 assert.throws(()=>legalUniversalActions(packs,staleSwap),/Invalid energy-line swap pending/);
 const energySlot=swapping.players[0].energy.findIndex(c=>c?.uid===waiting.uid);
 swapping=dispatchUniversalAction(packs,swapping,{type:'chooseEnergySwap',uid:partner.uid});
 assert.equal(swapping.pending,null);
 assert.equal(swapping.players[0].front[3].uid,waiting.uid);
 assert.equal(swapping.players[0].energy[energySlot].uid,partner.uid);
 assert.equal(at(swapping,0,waiting.uid).stack[0].uid,base.uid);
 assert.equal(energySwap(swapping,waiting.uid),false);
 const backFrom=swapping.players[0].front.findIndex(c=>c?.uid===waiting.uid);
 const backHeld=swapping.players[0].front[backFrom];
 const backEnergy=swapping.players[0].energy.findIndex(c=>c?.uid===partner.uid);
 const backDisplaced=swapping.players[0].energy[backEnergy];
 swapping.players[0].front[backFrom]=backDisplaced;
 swapping.players[0].energy[backEnergy]=backHeld;
 assert.equal(energySwap(swapping,waiting.uid),false);
 swapping=untilPhase(packs,swapping,1,'move');
 swapping=untilPhase(packs,swapping,0,'main');
 assert.equal(swapping.players[0].ownTurns,3);
 assert.equal(energySwap(swapping,waiting.uid),true);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,swing),true);
 assert.equal(assertUniversalMatch(packs,boosted),true);
 assert.equal(assertUniversalMatch(packs,shortened),true);
 assert.equal(assertUniversalMatch(packs,emptied),true);
 assert.equal(assertUniversalMatch(packs,blocked),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,open),true);
 assert.equal(assertUniversalMatch(packs,nulled),true);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,swapping),true);
});

const waveCounts={
 ...Object.fromEntries(['REZ-1-086','REZ-1-016','REZ-1-072','REZ-1-068','REZ-1-029','REZ-1-007'].map(id=>[id,4])),
 ...Object.fromEntries(['REZ-1-076','REZ-1-077','REZ-1-040','REZ-1-081','REZ-1-112',
  'REZ-1-070','REZ-1-071','REZ-1-097','REZ-1-001','REZ-1-109'].map(id=>[id,2])),
 'REZ-1-105':1,'REZ-1-106':1,'REZ-1-053':1,'REZ-1-008':3
};
const wave=seed=>newUniversalMatch(packs,{decks:[waveCounts,waveCounts],first:0,seed});
function shelf(s,player=0){
 const pl=s.players[player];
 pl.outside.push(...pl.hand.splice(0));
 return s;
}
function onlyTop(s,player,ids){
 const cards=setTop(s,player,ids);
 s.players[player].outside.push(...s.players[player].deck.splice(cards.length));
 return cards;
}
function quietOwn(s){
 const first=pull(s,0,'REZ-1-016'),second=pull(s,0,'REZ-1-016');
 while(s.players[0].life.length>5)s.players[0].deck.push(s.players[0].life.pop());
 s.players[0].life.unshift(first,second);
}
function keepMany(s){
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 const uids=[...s.pending.uids];
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 return order(s,uids);
}
function keepInspect(s){
 assert.equal(s.pending.kind,'effect-top-inspect');
 const uids=[...s.pending.uids];
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 return order(s,uids);
}
function purpleFuel(s,count){
 fuel(s,Array.from({length:count},()=>'REZ-1-086'));
 return s;
}
function castReveal(seed,ids,{purple=3,turn=1}={}){
 let s=wave(seed);
 purpleFuel(s,purple);
 s=turn===1?reach(s,'main'):ownMain(s,turn);
 const tops=onlyTop(s,0,ids);
 let spell;
 [s,spell]=castEvent(s,'REZ-1-097');
 return {s,tops,spell};
}

test('named reveal, hand placement, attack AP and also-event shells fail closed',()=>{
 assert.equal(Object.values(waveCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,waveCounts),[]);
 const shell={id:'REVEAL',name:'Reveal',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 const event={id:'ALSO',name:'Also',color:'yellow',type:'event',energy:2,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-reveal',cards:[{...shell,effects:{onPlay:[
  {op:'revealTopHandOrAffordableNamed',names:[]}]}}]}),/affordable named/);
 assert.throws(()=>createUniversalPack({id:'bad-reveal',cards:[{...shell,effects:{onPlay:[
  {op:'revealTopHandOrAffordableNamed',names:['ア','イ','ウ']}]}}]}),/affordable named/);
 assert.throws(()=>createUniversalPack({id:'bad-place',cards:[{...shell,effects:{onPlay:[
  {op:'drawThenPlaceHand',count:1}]}}]}),/hand placement/);
 assert.throws(()=>createUniversalPack({id:'bad-once',cards:[{...shell,effects:{onPlay:[
  {op:'optionalPayApThen',ap:1,optional:true,oncePerAttackTurn:true,then:[{op:'draw',count:1}]}]}}]}),
  /once per attack/);
 assert.throws(()=>createUniversalPack({id:'bad-also',cards:[{...event,alsoEvent:true}]}),/also-event/);
 assert.throws(()=>createUniversalPack({id:'bad-also',cards:[{...shell,alsoEvent:false,effects:{}}]}),/also-event/);
 assert.throws(()=>createUniversalPack({id:'bad-vanilla',cards:[{...shell,implementation:'vanilla',alsoEvent:true,effects:{}}]}),
  /vanilla/);
});

test('the Beatrice call reveals an affordable Subaru or Beatrice and may rest or raid it',()=>{
 let queued=castReveal(8101,['REZ-1-068','REZ-1-007','REZ-1-008']);
 assert.equal(queued.s.pending.kind,'effect-top-inspect-many');
 assert.equal(queued.s.pending.uids.length,3);
 assert.ok(queued.s.effectQueue.some(e=>e.op==='revealTopHandOrAffordableNamed'&&
  e.names.join()==='ナツキ・スバル,ベアトリス'));
 assert.doesNotThrow(()=>legalUniversalActions(packs,queued.s));
 const dumped=castReveal(8102,['REZ-1-007','REZ-1-008','REZ-1-016']);
 const window=[...dumped.s.pending.uids];
 let emptied=dumped.s;
 emptied=dispatchUniversalAction(packs,emptied,{type:'chooseInspectedOutside',uid:window[0]});
 assert.equal(emptied.pending.kind,'effect-top-inspect-many');
 assert.ok(emptied.effectQueue.some(e=>e.op==='revealTopHandOrAffordableNamed'));
 emptied=dispatchUniversalAction(packs,emptied,{type:'chooseInspectedOutside',uid:window[1]});
 emptied=dispatchUniversalAction(packs,emptied,{type:'chooseInspectedOutside',uid:window[2]});
 assert.equal(emptied.pending,null);
 assert.equal(emptied.players[0].deck.length,0);
 assert.equal(assertUniversalMatch(packs,emptied),true);

 let affordable=keepMany(queued.s);
 assert.equal(affordable.pending.kind,'effect-deck-named-play');
 assert.equal(Object.keys(affordable.pending).length,6);
 assert.deepEqual(affordable.pending.names,['ナツキ・スバル','ベアトリス']);
 assert.equal(affordable.pending.uid,queued.tops[0].uid);
 assert.equal(affordable.publicReveals.at(-1).kind,'deck-top');
 assert.equal(affordable.publicReveals.at(-1).cardId,'REZ-1-068');
 assert.equal(V2_PENDING_LABELS['effect-deck-named-play'],'公開的卡片可加入手牌、休息登場或突襲');
 const namedActions=legalUniversalActions(packs,affordable);
 const hand=namedActions.find(a=>a.mode==='hand');
 const rest=namedActions.find(a=>a.mode==='enter'&&a.line==='front'&&!a.replaceUid);
 assert.equal(namedActions.some(a=>a.mode==='raid'),false);
 assert.equal(uiActionLabel(hand,{pack,state:affordable}),'將公開的卡片加入手牌');
 assert.equal(uiActionLabel(rest,{pack,state:affordable}),
  '以休息狀態登場：ナツキ・スバル · 前線 '+(rest.slot+1));
 assert.equal(universalPrivateChoices(packs,affordable,1),null);
 assert.ok(universalPrivateChoices(packs,affordable,0).options.some(o=>o.card&&o.card.cardId==='REZ-1-068'));
 const taken=dispatchUniversalAction(packs,structuredClone(affordable),hand);
 assert.ok(taken.players[0].hand.some(c=>c.uid===queued.tops[0].uid));
 assert.equal(taken.pending,null);
 let rested=dispatchUniversalAction(packs,affordable,rest);
 assert.equal(at(rested,0,queued.tops[0].uid).ready,false);
 assert.equal(rested.players[0].front.some(c=>c?.uid===queued.tops[0].uid),true);
 assert.equal(rested.pending,null);

 let beatrice=castReveal(8103,['REZ-1-072','REZ-1-007','REZ-1-008']);
 beatrice.s=keepMany(beatrice.s);
 assert.equal(beatrice.s.pending.kind,'effect-deck-named-play');
 assert.equal(legalUniversalActions(packs,beatrice.s).some(a=>a.mode==='raid'),false);
 const beatriceAi=chooseUniversalAiAction(packs,beatrice.s);
 assert.equal(beatriceAi.mode,'enter');
 assert.equal(beatriceAi.replaceUid,undefined);
 assert.equal(chooseUniversalAiAction(packs,beatrice.s,{difficulty:'easy'}).mode,'hand');

 let raid=wave(8104);
 purpleFuel(raid,3);
 raid=reach(raid,'main');
 const base=pull(raid,0,'REZ-1-072');
 base.ready=true;
 raid.players[0].front[0]=base;
 const raidTops=onlyTop(raid,0,['REZ-1-077','REZ-1-007','REZ-1-008']);
 [raid]=castEvent(raid,'REZ-1-097');
 raid=keepMany(raid);
 assert.equal(raid.pending.uid,raidTops[0].uid);
 const raidAction=legalUniversalActions(packs,raid).find(a=>a.mode==='raid'&&a.baseUid===base.uid&&!a.replaceUid);
 assert.ok(raidAction);
 assert.equal(uiActionLabel(raidAction,{pack,state:raid}),
  '以突襲登場：ベアトリス · 前線 '+(raidAction.slot+1));
 const raidAi=chooseUniversalAiAction(packs,raid);
 assert.equal(raidAi.mode,'raid');
 assert.equal(raidAi.replaceUid,undefined);
 assert.equal(chooseUniversalAiAction(packs,raid,{difficulty:'easy'}).mode,'hand');
 raid=dispatchUniversalAction(packs,raid,raidAction);
 assert.equal(at(raid,0,raidTops[0].uid).ready,false);
 assert.equal(at(raid,0,raidTops[0].uid).stack[0].uid,base.uid);
 assert.equal(raid.pending,null);

 let stranger=castReveal(8105,['REZ-1-040','REZ-1-007','REZ-1-008']);
 stranger.s=keepMany(stranger.s);
 assert.equal(stranger.s.pending,null);
 assert.ok(stranger.s.players[0].hand.some(c=>c.uid===stranger.tops[0].uid));
 assert.equal(stranger.s.publicReveals.at(-1).kind,'deck-top');
 assert.equal(stranger.s.publicReveals.at(-1).cardId,'REZ-1-040');
 let other=castReveal(8107,['REZ-1-081','REZ-1-007','REZ-1-008']);
 other.s=keepMany(other.s);
 assert.equal(other.s.pending,null);
 assert.ok(other.s.players[0].hand.some(c=>c.uid===other.tops[0].uid));
 assert.equal(other.s.publicReveals.at(-1).cardId,'REZ-1-081');

 let costly=castReveal(8106,['REZ-1-076','REZ-1-007','REZ-1-008']);
 costly.s=keepMany(costly.s);
 assert.equal(costly.s.pending.kind,'effect-deck-named-play');
 assert.equal(costly.s.pending.uid,costly.tops[0].uid);
 const moved=structuredClone(costly.s);
 moved.players[0].hand.push(moved.players[0].deck.shift());
 assert.throws(()=>legalUniversalActions(packs,moved),/Invalid revealed deck play pending/);
 const missing=structuredClone(costly.s);
 const sourceAt=missing.players[0].outside.findIndex(c=>c.uid===costly.s.pending.sourceUid);
 missing.players[0].outside.splice(sourceAt,1);
 assert.throws(()=>legalUniversalActions(packs,missing),/Invalid revealed deck play pending/);
 const broke=structuredClone(costly.s);
 for(const card of broke.players[0].energy)if(card)card.ready=false;
 assert.equal(universalEnergyByColor(packs,broke,0).purple||0,0);
 assert.throws(()=>legalUniversalActions(packs,broke),/Invalid revealed deck play pending/);
 assert.equal(assertUniversalMatch(packs,taken),true);
 assert.equal(assertUniversalMatch(packs,rested),true);
 assert.equal(assertUniversalMatch(packs,beatrice.s),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
 assert.equal(assertUniversalMatch(packs,stranger.s),true);
 assert.equal(assertUniversalMatch(packs,other.s),true);
 assert.equal(assertUniversalMatch(packs,costly.s),true);
});

test('Subaru chooses a mandatory hand placement or an optional Beatrice reveal',()=>{
 let placed=wave(8201);
 purpleFuel(placed,3);
 placed=ownMain(placed,2);
 shelf(placed);
 const low=pull(placed,0,'REZ-1-007');
 const mid=pull(placed,0,'REZ-1-008');
 const high=pull(placed,0,'REZ-1-016');
 placed.players[0].hand.push(low,mid,high);
 setTop(placed,0,['REZ-1-029']);
 let subaru;
 [placed,subaru]=playFront(placed,'REZ-1-070');
 assert.equal(placed.pending.kind,'effect-choice-mode');
 assert.equal(placed.pending.optional,false);
 assert.equal(legalUniversalActions(packs,placed).some(a=>a.mode==='skip'),false);
 assert.deepEqual(legalUniversalActions(packs,placed).map(a=>a.mode).sort(),['drawPlace','revealBeatrice']);
 assert.equal(uiActionLabel({type:'chooseEffectMode',mode:'drawPlace'},{pack,state:placed}),
  '選擇效果：抽1張，再將1張手牌放到牌頂或場外');
 assert.equal(uiActionLabel({type:'chooseEffectMode',mode:'revealBeatrice'},{pack,state:placed}),
  '選擇效果：可支付1AP，公開牌頂的碧翠絲');
 const beforeDraw=placed.players[0].hand.length;
 placed=dispatchUniversalAction(packs,placed,{type:'chooseEffectMode',mode:'drawPlace'});
 assert.equal(placed.pending.kind,'effect-place-hand');
 assert.equal(Object.keys(placed.pending).length,4);
 assert.equal(placed.players[0].hand.length,beforeDraw+1);
 assert.equal(legalUniversalActions(packs,placed).some(a=>a.uid===null),false);
 assert.equal(V2_PENDING_LABELS['effect-place-hand'],'將1張手牌放到牌頂或場外');
 assert.equal(uiActionLabel({type:'choosePlaceHand',mode:'deck',uid:low.uid},{pack,state:placed}),
  '將 ラム 放到牌組上面');
 assert.equal(uiActionLabel({type:'choosePlaceHand',mode:'outside',uid:low.uid},{pack,state:placed}),
  '將 ラム 放到場外');
 assert.equal(universalPrivateChoices(packs,placed,1),null);
 assert.ok(universalPrivateChoices(packs,placed,0).options.some(o=>o.card&&o.card.cardId==='REZ-1-007'));
 const ai=chooseUniversalAiAction(packs,placed);
 assert.equal(ai.mode,'outside');
 assert.equal(ai.uid,low.uid);
 const previous=placed.players[0].deck[0].uid;
 const topped=dispatchUniversalAction(packs,structuredClone(placed),{type:'choosePlaceHand',mode:'deck',uid:mid.uid});
 assert.equal(topped.players[0].deck[0].uid,mid.uid);
 assert.equal(topped.players[0].deck[1].uid,previous);
 assert.ok(topped.zoneMoveEvents.some(e=>e.uid===mid.uid&&e.from==='hand'&&e.to==='deck'&&e.reason==='own-effect'));
 assert.equal(topped.pending,null);
 const outside=dispatchUniversalAction(packs,placed,{type:'choosePlaceHand',mode:'outside',uid:low.uid});
 assert.ok(outside.players[0].outside.some(c=>c.uid===low.uid));
 assert.ok(outside.zoneMoveEvents.some(e=>e.uid===low.uid&&e.from==='hand'&&e.to==='outside'&&e.reason==='own-effect'));
 const lost=structuredClone(placed);
 const gone=lost.players[0].hand.findIndex(c=>c.uid===high.uid);
 lost.players[0].outside.push(...lost.players[0].hand.splice(gone,1));
 assert.throws(()=>dispatchUniversalAction(packs,lost,{type:'choosePlaceHand',mode:'outside',uid:high.uid}),
  /Action not currently legal/);
 const bare=structuredClone(placed);
 bare.players[0].outside.push(...bare.players[0].hand.splice(0));
 assert.throws(()=>legalUniversalActions(packs,bare),/Invalid hand placement pending/);
 const departed=structuredClone(placed);
 const slot=departed.players[0].front.findIndex(c=>c?.uid===subaru.uid);
 departed.players[0].front[slot]=null;
 assert.throws(()=>legalUniversalActions(packs,departed),/Invalid hand placement pending/);
 assert.equal(placed.onceEffectUses[0].some(k=>k.startsWith('attack-ap:')),false);

 let dry=wave(8202);
 purpleFuel(dry,3);
 dry=reach(dry,'main');
 dry.players[0].outside.push(...dry.players[0].hand.splice(0),...dry.players[0].deck.splice(0));
 [dry]=playFront(dry,'REZ-1-070');
 dry=dispatchUniversalAction(packs,dry,{type:'chooseEffectMode',mode:'drawPlace'});
 assert.equal(dry.pending,null);
 assert.equal(dry.players[0].hand.length,0);
 assert.equal(dry.players[0].deck.length,0);

 let poor=wave(8203);
 purpleFuel(poor,3);
 poor=reach(poor,'main');
 setTop(poor,0,['REZ-1-072']);
 const untouched=poor.players[0].deck[0].uid;
 [poor]=playFront(poor,'REZ-1-070');
 assert.equal(poor.players[0].apCards.filter(c=>c.ready).length,0);
 const reveals=poor.publicReveals.length;
 poor=dispatchUniversalAction(packs,poor,{type:'chooseEffectMode',mode:'revealBeatrice'});
 assert.equal(poor.pending,null);
 assert.equal(poor.players[0].deck[0].uid,untouched);
 assert.equal(poor.publicReveals.length,reveals);
 assert.equal(poor.onceEffectUses[0].some(k=>k.startsWith('attack-ap:')),false);

 let rich=wave(8204);
 purpleFuel(rich,3);
 rich=ownMain(rich,2);
 setTop(rich,0,['REZ-1-072']);
 [rich]=playFront(rich,'REZ-1-070');
 assert.equal(rich.players[0].apCards.filter(c=>c.ready).length,1);
 rich=dispatchUniversalAction(packs,rich,{type:'chooseEffectMode',mode:'revealBeatrice'});
 assert.equal(rich.pending.kind,'effect-optional-pay-ap');
 assert.equal(rich.pending.then[0].op,'revealTopHandOrAffordableNamed');
 assert.equal(Object.keys(rich.pending).length,6);
 let declined=dispatchUniversalAction(packs,structuredClone(rich),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(declined.players[0].deck[0].cardId,'REZ-1-072');
 assert.equal(declined.publicReveals.some(r=>r.kind==='deck-top'),false);
 rich=dispatchUniversalAction(packs,rich,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(rich.pending.kind,'effect-deck-named-play');
 assert.equal(rich.players[0].deck[0].cardId,'REZ-1-072');
 assert.equal(rich.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(rich.onceEffectUses[0].some(k=>k.startsWith('attack-ap:')),false);
 assert.equal(declined.onceEffectUses[0].some(k=>k.startsWith('attack-ap:')),false);

 let missed=wave(8205);
 purpleFuel(missed,3);
 missed=ownMain(missed,2);
 setTop(missed,0,['REZ-1-081']);
 [missed]=playFront(missed,'REZ-1-070');
 missed=dispatchUniversalAction(packs,missed,{type:'chooseEffectMode',mode:'revealBeatrice'});
 missed=dispatchUniversalAction(packs,missed,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(missed.pending,null);
 assert.equal(missed.publicReveals.at(-1).kind,'deck-top');
 assert.equal(missed.publicReveals.at(-1).cardId,'REZ-1-081');
 assert.ok(missed.players[0].hand.some(c=>c.cardId==='REZ-1-081'));
 assert.equal(assertUniversalMatch(packs,placed),true);
 assert.equal(assertUniversalMatch(packs,outside),true);
 assert.equal(assertUniversalMatch(packs,topped),true);
 assert.equal(assertUniversalMatch(packs,dry),true);
 assert.equal(assertUniversalMatch(packs,poor),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,rich),true);
 assert.equal(assertUniversalMatch(packs,missed),true);
});

test('raid Subaru peeks, draws, and offers the Beatrice reveal once per attack',()=>{
 function readyAttack(seed){
  let s=wave(seed);
  purpleFuel(s,4);
  s=ownMain(s,2);
  assert.equal(universalEnergyByColor(packs,s,0).purple,4);
  onlyTop(s,0,['REZ-1-007','REZ-1-008']);
  let subaru;
  [s,subaru]=playFront(s,'REZ-1-071');
  assert.equal(s.pending.kind,'effect-top-inspect');
  assert.ok(s.effectQueue.some(e=>e.op==='draw'&&e.count===1));
  assert.doesNotThrow(()=>legalUniversalActions(packs,s));
  const hand=s.players[0].hand.length;
  s=keepInspect(s);
  assert.equal(s.pending,null);
  assert.equal(s.players[0].hand.length,hand+1);
  at(s,0,subaru.uid).ready=true;
  quietLife(s);
  s=toAttack(s,0);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,1);
  return {s,subaru};
 }
 const first=readyAttack(8301);
 let skipped=dispatchUniversalAction(packs,first.s,
  legalUniversalActions(packs,first.s).find(a=>a.type==='attack'&&a.uid===first.subaru.uid));
 assert.equal(skipped.pending.kind,'effect-optional-pay-ap');
 assert.ok(skipped.onceEffectUses[0].includes('attack-ap:'+first.subaru.uid));
 const life=skipped.players[1].life.length;
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(skipped.publicReveals.some(r=>r.kind==='deck-top'),false);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].life.length,life-1);
 at(skipped,0,first.subaru.uid).ready=true;
 skipped=dispatchUniversalAction(packs,skipped,
  legalUniversalActions(packs,skipped).find(a=>a.type==='attack'&&a.uid===first.subaru.uid));
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.onceEffectUses[0].filter(k=>k.startsWith('attack-ap:')).length,1);

 let broke=readyAttack(8302);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 broke.s=dispatchUniversalAction(packs,broke.s,
  legalUniversalActions(packs,broke.s).find(a=>a.type==='attack'&&a.uid===broke.subaru.uid));
 assert.equal(broke.s.pending.kind,'block');
 assert.ok(broke.s.onceEffectUses[0].includes('attack-ap:'+broke.subaru.uid));
 broke.s=dispatchUniversalAction(packs,broke.s,{type:'chooseBlock',uid:null},{actor:1});
 at(broke.s,0,broke.subaru.uid).ready=true;
 broke.s.players[0].apCards.find(c=>c.inPlay).ready=true;
 broke.s=dispatchUniversalAction(packs,broke.s,
  legalUniversalActions(packs,broke.s).find(a=>a.type==='attack'&&a.uid===broke.subaru.uid));
 assert.equal(broke.s.pending.kind,'block');

 let paid=readyAttack(8303);
 setTop(paid.s,0,['REZ-1-072']);
 paid.s=dispatchUniversalAction(packs,paid.s,
  legalUniversalActions(packs,paid.s).find(a=>a.type==='attack'&&a.uid===paid.subaru.uid));
 paid.s=dispatchUniversalAction(packs,paid.s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.s.pending.kind,'effect-deck-named-play');
 assert.equal(paid.s.players[0].deck[0].cardId,'REZ-1-072');
 assert.equal(paid.s.publicReveals.at(-1).kind,'deck-top');
 paid.s=dispatchUniversalAction(packs,paid.s,{type:'chooseDeckNamedPlay',mode:'hand',uid:paid.s.pending.uid});
 assert.ok(paid.s.players[0].hand.some(c=>c.cardId==='REZ-1-072'));
 assert.equal(paid.s.pending.kind,'block');

 let plain=readyAttack(8304);
 setTop(plain.s,0,['REZ-1-007']);
 plain.s=dispatchUniversalAction(packs,plain.s,
  legalUniversalActions(packs,plain.s).find(a=>a.type==='attack'&&a.uid===plain.subaru.uid));
 plain.s=dispatchUniversalAction(packs,plain.s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(plain.s.pending.kind,'block');
 assert.equal(plain.s.publicReveals.at(-1).kind,'deck-top');
 assert.equal(plain.s.publicReveals.at(-1).cardId,'REZ-1-007');
 assert.ok(plain.s.players[0].hand.some(c=>c.cardId==='REZ-1-007'));

 let vacant=readyAttack(8305);
 vacant.s.players[0].outside.push(...vacant.s.players[0].deck.splice(0));
 const shown=vacant.s.publicReveals.length;
 vacant.s=dispatchUniversalAction(packs,vacant.s,
  legalUniversalActions(packs,vacant.s).find(a=>a.type==='attack'&&a.uid===vacant.subaru.uid));
 vacant.s=dispatchUniversalAction(packs,vacant.s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(vacant.s.pending.kind,'block');
 assert.equal(vacant.s.publicReveals.length,shown);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,broke.s),true);
 assert.equal(assertUniversalMatch(packs,paid.s),true);
 assert.equal(assertUniversalMatch(packs,plain.s),true);
 assert.equal(assertUniversalMatch(packs,vacant.s),true);
});

test('Beatrice gains 500 BP after an own deck entry and activates only from that entry',()=>{
 let paid=wave(8401);
 purpleFuel(paid,3);
 paid=ownMain(paid,2);
 let beatrice;
 [paid,beatrice]=playFront(paid,'REZ-1-112');
 assert.equal(at(paid,0,beatrice.uid).ready,false);
 assert.equal(universalBp(packs,paid,at(paid,0,beatrice.uid)),3500);
 assert.equal(paid.zoneMoveEvents.some(e=>e.from==='deck'&&e.reason==='own-effect'),false);
 const born=onlyTop(paid,0,['REZ-1-068','REZ-1-007','REZ-1-008']);
 [paid]=castEvent(paid,'REZ-1-097');
 paid=keepMany(paid);
 assert.equal(paid.pending.kind,'effect-deck-named-play');
 const enter=legalUniversalActions(packs,paid).find(a=>a.mode==='enter'&&a.line==='front'&&!a.replaceUid);
 paid=dispatchUniversalAction(packs,paid,enter);
 assert.equal(at(paid,0,born[0].uid).ready,false);
 assert.equal(universalBp(packs,paid,at(paid,0,beatrice.uid)),4000);

 let self=wave(8402);
 purpleFuel(self,3);
 self=reach(self,'main');
 const tops=onlyTop(self,0,['REZ-1-112','REZ-1-007','REZ-1-008']);
 [self]=castEvent(self,'REZ-1-097');
 self=keepMany(self);
 const action=legalUniversalActions(packs,self).find(a=>a.mode==='enter'&&a.line==='front'&&!a.replaceUid);
 self=dispatchUniversalAction(packs,self,action);
 assert.equal(at(self,0,tops[0].uid).ready,true);
 assert.equal(universalBp(packs,self,at(self,0,tops[0].uid)),4000);
 assert.ok(self.zoneMoveEvents.some(e=>e.uid===tops[0].uid&&e.from==='deck'&&
  e.to==='front'&&e.reason==='own-effect'));
 self=untilPhase(packs,self,1,'move');
 assert.equal(universalBp(packs,self,at(self,0,tops[0].uid)),3500);
 self=untilPhase(packs,self,0,'main');
 assert.equal(self.players[0].ownTurns,2);
 assert.equal(universalBp(packs,self,at(self,0,tops[0].uid)),3500);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,self),true);
});

test('Puck counts as an event card, nullifies impact, and playing him is not using an event',()=>{
 let battle=wave(8501);
 battle=reach(battle,'main');
 const puck=stamp(battle,pull(battle,0,'REZ-1-001'));
 const beatrice=stamp(battle,pull(battle,0,'REZ-1-072'));
 battle.players[0].front[0]=puck;
 battle.players[0].front[1]=beatrice;
 const rem=stamp(battle,pull(battle,1,'REZ-1-053'));
 battle.players[1].front[0]=rem;
 quietOwn(battle);
 battle=untilPhase(packs,battle,1,'attack');
 const life=battle.players[0].life.length;
 battle=dispatchUniversalAction(packs,battle,
  legalUniversalActions(packs,battle).find(a=>a.type==='attack'&&a.uid===rem.uid));
 assert.equal(battle.pending.kind,'block');
 const nulled=dispatchUniversalAction(packs,structuredClone(battle),{type:'chooseBlock',uid:puck.uid});
 assert.equal(nulled.players[0].life.length,life);
 assert.ok(nulled.players[0].outside.some(c=>c.uid===puck.uid));
 assert.equal(nulled.pending,null);
 const plain=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:beatrice.uid});
 assert.equal(plain.players[0].life.length,life-1);
 assert.ok(plain.players[0].outside.some(c=>c.uid===beatrice.uid));
 assert.equal(plain.pending,null);

 let used=wave(8502);
 fuel(used,['REZ-1-016','REZ-1-016']);
 used=ownMain(used,2);
 const emilia=pull(used,0,'REZ-1-105');
 used.players[0].front[0]=emilia;
 [used]=playFront(used,'REZ-1-001');
 assert.equal(universalBp(packs,used,at(used,0,emilia.uid)),3000);
 const offered=onlyTop(used,0,['REZ-1-001','REZ-1-007','REZ-1-008','REZ-1-016','REZ-1-068']);
 [used]=castEvent(used,'REZ-1-109');
 assert.equal(used.pending.kind,'effect-top-trait-event');
 assert.deepEqual(used.pending.choices,[offered[0].uid]);
 assert.equal(universalBp(packs,used,at(used,0,emilia.uid)),4000);
 used=dispatchUniversalAction(packs,used,{type:'chooseTopTraitEvent',uid:offered[0].uid});
 assert.equal(used.pending.recoverApAfter,undefined);
 used=order(used,offered.slice(1).map(c=>c.uid));
 assert.equal(used.pending,null);
 assert.equal(universalBp(packs,used,at(used,0,emilia.uid)),4000);

 let ranked=wave(8503);
 fuel(ranked,['REZ-1-016','REZ-1-016']);
 ranked=ownMain(ranked,2);
 const both=onlyTop(ranked,0,['REZ-1-001','REZ-1-081','REZ-1-007','REZ-1-008','REZ-1-016']);
 [ranked]=castEvent(ranked,'REZ-1-109');
 assert.deepEqual(ranked.pending.choices.slice().sort(),[both[0].uid,both[1].uid].sort());
 const ai=chooseUniversalAiAction(packs,ranked,{difficulty:'normal'});
 assert.equal(ai.uid,both[1].uid);
 ranked=dispatchUniversalAction(packs,ranked,ai);
 assert.equal(ranked.pending.recoverApAfter,true);

 let impact=wave(8504);
 const watcher=pull(impact,0,'REZ-1-106');
 impact.players[0].front[0]=watcher;
 const events=[];
 for(let i=0;i<4;i++)events.push(pull(impact,0,'REZ-1-029'));
 events.push(pull(impact,0,'REZ-1-109'));
 impact.players[0].outside.push(...events);
 assert.equal(universalImpact(packs,impact,at(impact,0,watcher.uid)),0);
 const extra=pull(impact,0,'REZ-1-001');
 impact.players[0].outside.push(extra);
 assert.equal(universalImpact(packs,impact,at(impact,0,watcher.uid)),1);
 impact.players[0].deck.push(impact.players[0].outside.pop());
 assert.equal(universalImpact(packs,impact,at(impact,0,watcher.uid)),0);
 impact.players[0].outside.push(pull(impact,0,'REZ-1-007'));
 assert.equal(universalImpact(packs,impact,at(impact,0,watcher.uid)),0);
 impact.players[0].deck.push(impact.players[0].outside.pop());
 impact.players[0].outside.push(pull(impact,0,'REZ-1-109'));
 assert.equal(universalImpact(packs,impact,at(impact,0,watcher.uid)),1);
 assert.equal(assertUniversalMatch(packs,nulled),true);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,used),true);
 assert.equal(assertUniversalMatch(packs,ranked),true);
 assert.equal(assertUniversalMatch(packs,impact),true);
});

const sixCounts={
 'REZ-1-016':4,'REZ-1-043':4,'REZ-1-081':4,'REZ-1-001':4,'REZ-1-109':4,'REZ-1-029':4,
 'REZ-1-002':2,'REZ-1-032':2,'REZ-1-058':2,'REZ-1-044':2,'REZ-1-060':2,'REZ-1-107':2,
 'REZ-1-045':2,'REZ-1-007':4,'REZ-1-068':4,'REZ-1-076':2,'REZ-1-053':1,'REZ-1-036':1
};
const six=seed=>newUniversalMatch(packs,{decks:[sixCounts,sixCounts],first:0,seed});
function parkHand(s,player=0){
 const pl=s.players[player];
 pl.deck.push(...pl.hand.splice(0));
 return s;
}
function act(s,type,extra){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&
  Object.entries(extra||{}).every(([k,v])=>a[k]===v));
 assert.ok(action,type+' '+(extra?JSON.stringify(extra):''));
 return dispatchUniversalAction(packs,s,action);
}
test('Emilia and outside events raise Puck, then six events can active him',()=>{
 assert.equal(Object.values(sixCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,sixCounts),[]);
 const shell={id:'SHELL',name:'Shell',color:'yellow',type:'character',energy:1,ap:1,bp:2000,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-active',cards:[{...shell,effects:{onPlay:[
  {op:'optionalHandOutsideActiveIf',name:'エミリア'}]}}]}),/invalid optional hand outside active/);
 assert.throws(()=>createUniversalPack({id:'bad-active',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'optionalHandOutsideActiveIf',name:'エミリア',minEvents:6}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-duration',cards:[{...shell,effects:{onPlay:[
  {op:'buffNamedImpactDuration',name:'パック',bp:2000,impact:1,optional:true,otherOutsideEvents:6}]}}]}),
  /event onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-top',cards:[{...shell,effects:{onPlay:[
  {op:'takeTopHandRestOutside',count:1}]}}]}),/invalid top take/);
 assert.throws(()=>createUniversalPack({id:'bad-either',cards:[{...shell,effects:{onPlay:[
  {op:'buffEitherField',bp:1000,optional:true}]}}]}),/front main ability/);
 assert.throws(()=>createUniversalPack({id:'bad-reveal',cards:[{...shell,effects:{onPlay:[
  {op:'revealHandBottomOutsideCharacter',optional:true,excludeName:'フェリス',ap:1}]}}]}),
  /invalid reveal then outside/);
 assert.throws(()=>createUniversalPack({id:'bad-leave',cards:[{...shell,mainAbility:{
  op:'restLeaveRevealRetire',oncePerName:true}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-block',cards:[{...shell,mainAbility:{
  op:'handOutsideBlockAtLeast',oncePerTurn:true,bp:3000}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-may',cards:[{...shell,handBpMayWhileFront:500,
  effects:{onPlay:[{op:'draw',count:1}]}}]}),/front hand BP/);

 let quiet=six(8601);
 quiet=reach(quiet,'main');
 const puck=stamp(quiet,pull(quiet,0,'REZ-1-002'));
 quiet.players[0].front[0]=puck;
 assert.equal(universalBp(packs,quiet,puck),3000);
 const emilia=stamp(quiet,pull(quiet,0,'REZ-1-081'));
 quiet.players[0].front[1]=emilia;
 for(let i=0;i<3;i++)quiet.players[0].outside.push(pull(quiet,0,'REZ-1-001'));
 assert.equal(universalBp(packs,quiet,puck),3000);
 quiet.players[0].outside.push(pull(quiet,0,'REZ-1-002'));
 assert.equal(universalBp(packs,quiet,at(quiet,0,puck.uid)),4000);
 let theirs=untilPhase(packs,quiet,1,'main');
 assert.equal(universalBp(packs,theirs,at(theirs,0,puck.uid)),3000);
 theirs=untilPhase(packs,theirs,0,'main');
 assert.equal(universalBp(packs,theirs,at(theirs,0,puck.uid)),4000);

 let paid=six(8602);
 fuel(paid,['REZ-1-016','REZ-1-016','REZ-1-016']);
 paid=reach(paid,'main');
 const witness=stamp(paid,pull(paid,0,'REZ-1-081'));
 paid.players[0].front[0]=witness;
 for(let i=0;i<4;i++)paid.players[0].outside.push(pull(paid,0,'REZ-1-001'));
 paid.players[0].outside.push(pull(paid,0,'REZ-1-029'),pull(paid,0,'REZ-1-029'));
 let entered;
 [paid,entered]=playFront(paid,'REZ-1-002');
 assert.equal(paid.pending.kind,'effect-hand-outside-active');
 assert.equal(V2_PENDING_LABELS[paid.pending.kind],'可將 1 張手牌放到場外，使這張角色活動');
 assert.equal(at(paid,0,entered.uid).ready,false);
 const dumped=paid.players[0].hand[0];
 assert.match(uiActionLabel({type:'chooseHandOutsideActive',uid:dumped.uid},{pack,state:paid}),/放到場外/);
 const ai=chooseUniversalAiAction(packs,paid);
 assert.equal(ai.type,'chooseHandOutsideActive');
 assert.notEqual(ai.uid,null);
 let declined=dispatchUniversalAction(packs,structuredClone(paid),{type:'chooseHandOutsideActive',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(at(declined,0,entered.uid).ready,false);
 assert.equal(declined.players[0].hand.some(c=>c.uid===dumped.uid),true);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseHandOutsideActive',uid:dumped.uid});
 assert.equal(paid.pending,null);
 assert.equal(at(paid,0,entered.uid).ready,true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(universalBp(packs,paid,at(paid,0,entered.uid)),4000);

 let short=six(8603);
 fuel(short,['REZ-1-016','REZ-1-016','REZ-1-016']);
 short=reach(short,'main');
 short.players[0].front[0]=stamp(short,pull(short,0,'REZ-1-081'));
 for(let i=0;i<4;i++)short.players[0].outside.push(pull(short,0,'REZ-1-029'));
 short.players[0].outside.push(pull(short,0,'REZ-1-109'));
 [short]=playFront(short,'REZ-1-002');
 assert.equal(short.pending,null);
 assert.equal(short.players[0].front.some(c=>c?.cardId==='REZ-1-002'&&c.ready===false),true);
 let absent=six(8604);
 fuel(absent,['REZ-1-016','REZ-1-016','REZ-1-016']);
 absent=reach(absent,'main');
 for(let i=0;i<4;i++)absent.players[0].outside.push(pull(absent,0,'REZ-1-001'));
 absent.players[0].outside.push(pull(absent,0,'REZ-1-029'),pull(absent,0,'REZ-1-029'));
 [absent]=playFront(absent,'REZ-1-002');
 assert.equal(absent.pending,null);
 let empty=six(8605);
 fuel(empty,['REZ-1-016','REZ-1-016','REZ-1-016']);
 empty=reach(empty,'main');
 empty.players[0].front[0]=stamp(empty,pull(empty,0,'REZ-1-081'));
 for(let i=0;i<4;i++)empty.players[0].outside.push(pull(empty,0,'REZ-1-001'));
 empty.players[0].outside.push(pull(empty,0,'REZ-1-029'),pull(empty,0,'REZ-1-029'));
 parkHand(empty);
 [empty]=playFront(empty,'REZ-1-002');
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(packs,quiet),true);
 assert.equal(assertUniversalMatch(packs,theirs),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,short),true);
 assert.equal(assertUniversalMatch(packs,absent),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('Beast of the End times Puck impact by the other outside events',()=>{
 let none=six(8611);
 fuel(none,['REZ-1-016','REZ-1-016','REZ-1-016']);
 none=reach(none,'main');
 [none]=castEvent(none,'REZ-1-032');
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.cardId==='REZ-1-032'),true);

 let brief=six(8612);
 fuel(brief,['REZ-1-016','REZ-1-016','REZ-1-016']);
 brief=reach(brief,'main');
 const puck=stamp(brief,pull(brief,0,'REZ-1-001'));
 const namesake=stamp(brief,pull(brief,0,'REZ-1-002'));
 brief.players[0].front[0]=puck;
 brief.players[0].front[1]=namesake;
 for(let i=0;i<4;i++)brief.players[0].outside.push(pull(brief,0,'REZ-1-029'));
 brief.players[0].outside.push(pull(brief,0,'REZ-1-109'));
 let spell;
 [brief,spell]=castEvent(brief,'REZ-1-032');
 assert.equal(brief.pending.kind,'effect-named-duration');
 assert.equal(brief.pending.longer,false);
 assert.deepEqual(brief.pending.choices.slice().sort(),[puck.uid,namesake.uid].sort());
 assert.equal(V2_PENDING_LABELS[brief.pending.kind],'選擇最多 1 張帕克，給予 BP+2000 與衝擊 1');
 const picked=chooseUniversalAiAction(packs,brief);
 assert.equal(picked.type,'chooseNamedDuration');
 assert.ok([puck.uid,namesake.uid].includes(picked.uid));
 let skipped=dispatchUniversalAction(packs,structuredClone(brief),{type:'chooseNamedDuration',uid:null});
 assert.equal(universalBp(packs,skipped,at(skipped,0,puck.uid)),2000);
 assert.equal(universalImpact(packs,skipped,at(skipped,0,puck.uid)),0);
 brief=dispatchUniversalAction(packs,brief,{type:'chooseNamedDuration',uid:puck.uid});
 assert.equal(universalBp(packs,brief,at(brief,0,puck.uid)),4000);
 assert.equal(universalImpact(packs,brief,at(brief,0,puck.uid)),1);
 assert.equal(universalBp(packs,brief,at(brief,0,namesake.uid)),3000);
 assert.equal(at(brief,0,puck.uid).impactGranted.turn,brief.turn);
 brief=untilPhase(packs,brief,1,'main');
 assert.equal(universalBp(packs,brief,at(brief,0,puck.uid)),2000);
 assert.equal(universalImpact(packs,brief,at(brief,0,puck.uid)),0);

 let lasting=six(8613);
 fuel(lasting,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lasting=reach(lasting,'main');
 const body=stamp(lasting,pull(lasting,0,'REZ-1-001'));
 lasting.players[0].front[0]=body;
 for(let i=0;i<4;i++)lasting.players[0].outside.push(pull(lasting,0,'REZ-1-029'));
 lasting.players[0].outside.push(pull(lasting,0,'REZ-1-109'),pull(lasting,0,'REZ-1-109'));
 [lasting,spell]=castEvent(lasting,'REZ-1-032');
 assert.equal(lasting.pending.longer,true);
 assert.equal(lasting.players[0].outside.filter(c=>c.uid!==spell.uid&&
  (pack.cards[c.cardId].type==='event'||pack.cards[c.cardId].alsoEvent)).length,6);
 lasting=dispatchUniversalAction(packs,lasting,{type:'chooseNamedDuration',uid:body.uid});
 assert.equal(at(lasting,0,body.uid).buffs[0].untilOwnTurnStart,lasting.players[0].ownTurns+1);
 assert.equal(at(lasting,0,body.uid).impactGranted.untilOwnTurnStart,lasting.players[0].ownTurns+1);
 lasting=untilPhase(packs,lasting,1,'main');
 assert.equal(universalBp(packs,lasting,at(lasting,0,body.uid)),4000);
 assert.equal(universalImpact(packs,lasting,at(lasting,0,body.uid)),1);
 lasting=untilPhase(packs,lasting,0,'main');
 assert.equal(lasting.players[0].ownTurns,2);
 assert.equal(universalBp(packs,lasting,at(lasting,0,body.uid)),2000);
 assert.equal(universalImpact(packs,lasting,at(lasting,0,body.uid)),0);
 assert.equal(assertUniversalMatch(packs,none),true);
 assert.equal(assertUniversalMatch(packs,brief),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,lasting),true);
});

test('Crusch takes one of the top two and adds hand BP only while on the front',()=>{
 let look=six(8621);
 fuel(look,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 look=reach(look,'main');
 const window=setTop(look,0,['REZ-1-068','REZ-1-007']);
 let crusch;
 [look,crusch]=playFront(look,'REZ-1-058');
 assert.equal(look.pending.kind,'effect-top-take-one');
 assert.deepEqual(look.pending.uids,[window[0].uid,window[1].uid]);
 assert.equal(legalUniversalActions(packs,look).some(a=>a.uid===null),false);
 assert.equal(universalPrivateChoices(packs,look,1),null);
 const seen=universalPrivateChoices(packs,look,0);
 assert.equal(seen.options.length,2);
 assert.equal(seen.options[0].card.cardId,'REZ-1-068');
 const taken=chooseUniversalAiAction(packs,look);
 assert.equal(taken.type,'chooseTopTakeOne');
 look=dispatchUniversalAction(packs,look,{type:'chooseTopTakeOne',uid:window[1].uid});
 assert.equal(look.pending,null);
 assert.equal(look.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(look.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(look.players[0].deck.some(c=>c.uid===window[0].uid||c.uid===window[1].uid),false);
 assert.equal(at(look,0,crusch.uid).ready,false);

 let single=six(8622);
 fuel(single,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 single=reach(single,'main');
 const only=onlyTop(single,0,['REZ-1-068']);
 [single]=playFront(single,'REZ-1-058');
 assert.equal(single.pending,null);
 assert.equal(single.players[0].hand.some(c=>c.uid===only[0].uid),true);
 assert.equal(single.players[0].outside.some(c=>c.uid===only[0].uid),false);
 let barren=six(8623);
 fuel(barren,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 barren=reach(barren,'main');
 barren.players[0].outside.push(...barren.players[0].deck.splice(0));
 [barren]=playFront(barren,'REZ-1-058');
 assert.equal(barren.pending,null);

 let front=six(8624);
 front=reach(front,'main');
 const leader=stamp(front,pull(front,0,'REZ-1-058'));
 front.players[0].front[0]=leader;
 const foe=stamp(front,pull(front,1,'REZ-1-007'));
 front.players[1].front[0]=foe;
 assert.equal(legalUniversalActions(packs,front).some(a=>a.type==='activate'&&
  a.mode==='frontOnce'&&a.uid===leader.uid),true);
 assert.match(uiActionLabel({type:'activate',uid:leader.uid,mode:'frontOnce'},{pack,state:front}),
  /場上角色/);
 front=act(front,'activate',{uid:leader.uid,mode:'frontOnce'});
 assert.equal(front.pending.kind,'effect-buff-either');
 assert.equal(front.pending.includeSelf,true);
 assert.ok(front.pending.choices.includes(leader.uid));
 assert.ok(front.pending.choices.includes(foe.uid));
 assert.equal(uiActionLabel({type:'chooseEitherBuff',uid:null},{pack,state:front}),'不指定角色');
 const boost=chooseUniversalAiAction(packs,front);
 assert.notEqual(boost.uid,null);
 let emptyFront=six(8625);
 emptyFront=reach(emptyFront,'main');
 const alone=stamp(emptyFront,pull(emptyFront,0,'REZ-1-058'));
 emptyFront.players[0].front[0]=alone;
 assert.equal(legalUniversalActions(packs,emptyFront).some(a=>a.mode==='frontOnce'&&a.uid===alone.uid),true);
 emptyFront=act(emptyFront,'activate',{uid:alone.uid,mode:'frontOnce'});
 emptyFront=dispatchUniversalAction(packs,emptyFront,{type:'chooseEitherBuff',uid:alone.uid});
 assert.equal(universalBp(packs,emptyFront,at(emptyFront,0,alone.uid)),5000);
 assert.equal(legalUniversalActions(packs,emptyFront).some(a=>a.mode==='frontOnce'&&a.uid===alone.uid),false);
 const line=stamp(emptyFront,pull(emptyFront,0,'REZ-1-058'));
 emptyFront.players[0].energy[0]=line;
 assert.equal(legalUniversalActions(packs,emptyFront).some(a=>a.mode==='frontOnce'&&a.uid===line.uid),false);

 front=dispatchUniversalAction(packs,front,{type:'chooseEitherBuff',uid:foe.uid});
 assert.equal(universalBp(packs,front,at(front,1,foe.uid)),3000);
 assert.equal(universalBp(packs,front,at(front,0,leader.uid)),4000);

 let plain=six(8626);
 plain=reach(plain,'main');
 const mimi=stamp(plain,pull(plain,0,'REZ-1-045'));
 plain.players[0].energy[0]=mimi;
 const shown=pull(plain,0,'REZ-1-076');
 plain.players[0].hand.push(shown);
 plain=act(plain,'activate',{uid:mimi.uid,mode:'revealBottomBuff'});
 plain=dispatchUniversalAction(packs,plain,{type:'chooseRevealBottom',uid:shown.uid});
 assert.equal(plain.pending,null);
 assert.equal(universalBp(packs,plain,at(plain,0,mimi.uid)),1500);

 let energyLine=six(8627);
 energyLine=reach(energyLine,'main');
 const parked=stamp(energyLine,pull(energyLine,0,'REZ-1-058'));
 const reader=stamp(energyLine,pull(energyLine,0,'REZ-1-045'));
 energyLine.players[0].energy[0]=parked;
 energyLine.players[0].energy[1]=reader;
 const low=pull(energyLine,0,'REZ-1-076');
 energyLine.players[0].hand.push(low);
 assert.equal(handCharacterBpMayAmount(packs,energyLine,0),0);
 energyLine=act(energyLine,'activate',{uid:reader.uid,mode:'revealBottomBuff'});
 energyLine=dispatchUniversalAction(packs,energyLine,{type:'chooseRevealBottom',uid:low.uid});
 assert.equal(energyLine.pending,null);
 assert.equal(universalBp(packs,energyLine,at(energyLine,0,reader.uid)),1500);

 let boosted=six(8628);
 boosted=reach(boosted,'main');
 const standing=stamp(boosted,pull(boosted,0,'REZ-1-058'));
 const other=stamp(boosted,pull(boosted,0,'REZ-1-058'));
 const gauge=stamp(boosted,pull(boosted,0,'REZ-1-045'));
 boosted.players[0].front[0]=standing;
 boosted.players[0].energy[0]=gauge;
 boosted.players[0].outside.push(other);
 const card=pull(boosted,0,'REZ-1-076');
 boosted.players[0].hand.push(card);
 assert.equal(handCharacterBpMayAmount(packs,boosted,0),1000);
 let silenced=structuredClone(boosted);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:standing.uid,targetUid:standing.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(handCharacterBpMayAmount(packs,silenced,0),0);
 silenced=act(silenced,'activate',{uid:gauge.uid,mode:'revealBottomBuff'});
 silenced=dispatchUniversalAction(packs,silenced,{type:'chooseRevealBottom',uid:card.uid});
 assert.equal(silenced.pending,null);
 assert.equal(universalBp(packs,silenced,at(silenced,0,gauge.uid)),1500);
 boosted=act(boosted,'activate',{uid:gauge.uid,mode:'revealBottomBuff'});
 boosted=dispatchUniversalAction(packs,boosted,{type:'chooseRevealBottom',uid:card.uid});
 assert.equal(boosted.pending.kind,'effect-hand-bp-may');
 assert.equal(boosted.pending.amount,1000);
 boosted=dispatchUniversalAction(packs,boosted,{type:'chooseHandBpMay',mode:'accept'});
 assert.equal(universalBp(packs,boosted,at(boosted,0,gauge.uid)),4000);
 const second=boosted.players[0].outside.find(c=>c.uid===other.uid);
 boosted.players[0].outside=boosted.players[0].outside.filter(c=>c.uid!==other.uid);
 boosted.players[0].front[1]=second;
 assert.equal(handCharacterBpMayAmount(packs,boosted,0),2000);
 assert.equal(assertUniversalMatch(packs,look),true);
 assert.equal(assertUniversalMatch(packs,single),true);
 assert.equal(assertUniversalMatch(packs,barren),true);
 assert.equal(assertUniversalMatch(packs,front),true);
 assert.equal(assertUniversalMatch(packs,emptyFront),true);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,energyLine),true);
 assert.equal(assertUniversalMatch(packs,boosted),true);
 assert.equal(assertUniversalMatch(packs,silenced),true);
});

test('Ferris reveals one hand card to the bottom, then takes a blue non-Ferris',()=>{
 let skipped=six(8631);
 fuel(skipped,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 skipped=reach(skipped,'main');
 const event=pull(skipped,0,'REZ-1-109');
 skipped.players[0].hand.push(event);
 let felix;
 [skipped,felix]=playFront(skipped,'REZ-1-044');
 assert.equal(skipped.pending.kind,'effect-reveal-optional');
 assert.equal(V2_PENDING_LABELS[skipped.pending.kind],'可公開 1 張手牌並放到牌底');
 assert.equal(at(skipped,0,felix.uid).ready,false);
 let passed=dispatchUniversalAction(packs,structuredClone(skipped),{type:'chooseRevealOptional',uid:null});
 assert.equal(passed.pending,null);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseRevealOptional',uid:event.uid});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.at(-1).uid,event.uid);
 assert.equal(skipped.publicReveals.at(-1).kind,'hand-to-bottom');
 assert.equal(skipped.publicReveals.at(-1).cardId,'REZ-1-109');

 let searched=six(8632);
 fuel(searched,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 searched=reach(searched,'main');
 const shown=pull(searched,0,'REZ-1-076');
 const theria=pull(searched,0,'REZ-1-036');
 const rem=pull(searched,0,'REZ-1-053');
 const yellow=pull(searched,0,'REZ-1-001');
 const otherFelix=pull(searched,0,'REZ-1-044');
 searched.players[0].hand.push(shown);
 searched.players[0].outside.push(theria,rem,yellow,otherFelix);
 [searched,felix]=playFront(searched,'REZ-1-044');
 const ferris=searched.players[0].energy[3];
 searched.players[0].energy[3]=null;
 searched.players[0].outside.push(ferris);
 searched=dispatchUniversalAction(packs,searched,{type:'chooseRevealOptional',uid:shown.uid});
 assert.equal(searched.pending.kind,'effect-outside-referenced');
 assert.equal(searched.pending.ceiling,3000);
 assert.deepEqual(searched.pending.choices,[theria.uid]);
 const outsideActions=legalUniversalActions(packs,searched);
 assert.equal(outsideActions.some(a=>a.uid===null||a.uid===ferris.uid||a.uid===rem.uid),false);
 assert.equal(chooseUniversalAiAction(packs,searched).mode,'hand');
 let rested=dispatchUniversalAction(packs,structuredClone(searched),
  outsideActions.find(a=>a.mode==='rest'&&a.uid===theria.uid&&!a.replaceUid));
 assert.equal(rested.pending,null);
 assert.equal(at(rested,0,theria.uid).ready,false);
 assert.equal(rested.players[0].hand.some(c=>c.uid===theria.uid),false);
 searched=dispatchUniversalAction(packs,searched,{type:'chooseOutsideReferenced',mode:'hand',uid:theria.uid});
 assert.equal(searched.players[0].hand.some(c=>c.uid===theria.uid),true);
 assert.equal(searched.pending,null);

 let widened=six(8633);
 fuel(widened,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 widened=reach(widened,'main');
 const crusch=stamp(widened,pull(widened,0,'REZ-1-058'));
 widened.players[0].front[0]=crusch;
 const beatrice=pull(widened,0,'REZ-1-076');
 const small=pull(widened,0,'REZ-1-036');
 const tall=pull(widened,0,'REZ-1-053');
 widened.players[0].hand.push(beatrice);
 widened.players[0].outside.push(small,tall);
 [widened]=playFront(widened,'REZ-1-044');
 widened=dispatchUniversalAction(packs,widened,{type:'chooseRevealOptional',uid:beatrice.uid});
 assert.equal(widened.pending.kind,'effect-referenced-bp');
 assert.equal(widened.pending.amount,1000);
 assert.equal(widened.pending.baseBp,3000);
 let declined=dispatchUniversalAction(packs,structuredClone(widened),{type:'chooseReferencedBp',mode:'decline'});
 assert.deepEqual(declined.pending.choices,[small.uid]);
 widened=dispatchUniversalAction(packs,widened,{type:'chooseReferencedBp',mode:'accept'});
 assert.deepEqual(widened.pending.choices.slice().sort(),[small.uid,tall.uid].sort());
 widened=dispatchUniversalAction(packs,widened,{type:'chooseOutsideReferenced',mode:'hand',uid:tall.uid});
 assert.equal(widened.players[0].hand.some(c=>c.uid===tall.uid),true);

 let narrow=six(8634);
 fuel(narrow,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 narrow=reach(narrow,'main');
 narrow.players[0].front[0]=stamp(narrow,pull(narrow,0,'REZ-1-058'));
 const tiny=pull(narrow,0,'REZ-1-045');
 const floor=pull(narrow,0,'REZ-1-036');
 const highRem=pull(narrow,0,'REZ-1-053');
 narrow.players[0].hand.push(tiny);
 narrow.players[0].outside.push(floor,highRem);
 [narrow]=playFront(narrow,'REZ-1-044');
 narrow=dispatchUniversalAction(packs,narrow,{type:'chooseRevealOptional',uid:tiny.uid});
 assert.equal(narrow.pending.kind,'effect-referenced-bp');
 assert.equal(narrow.pending.baseBp,1500);
 let faded=dispatchUniversalAction(packs,structuredClone(narrow),{type:'chooseReferencedBp',mode:'decline'});
 assert.equal(faded.pending,null);
 assert.equal(faded.players[0].outside.some(c=>c.uid===floor.uid),true);
 narrow=dispatchUniversalAction(packs,narrow,{type:'chooseReferencedBp',mode:'accept'});
 assert.deepEqual(narrow.pending.choices,[floor.uid]);

 let bare=six(8635);
 fuel(bare,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 bare=reach(bare,'main');
 parkHand(bare);
 [bare]=playFront(bare,'REZ-1-044');
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,passed),true);
 assert.equal(assertUniversalMatch(packs,searched),true);
 assert.equal(assertUniversalMatch(packs,rested),true);
 assert.equal(assertUniversalMatch(packs,widened),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,narrow),true);
 assert.equal(assertUniversalMatch(packs,faded),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

test('Flugel rests, leaves, then reveals a hand card that can retire a front',()=>{
 let once=six(8641);
 fuel(once,['REZ-1-043','REZ-1-043','REZ-1-043']);
 once=ownMain(once,2);
 let tree;
 const badge=pull(once,0,'REZ-1-109');
 once.players[0].hand.push(badge);
 [once,tree]=playHand(once,'REZ-1-060');
 assert.equal(once.players[0].energy.some(c=>c?.uid===tree.uid),true);
 at(once,0,tree.uid).ready=true;
 assert.match(uiActionLabel({type:'activate',uid:tree.uid,mode:'restLeaveReveal'},{pack,state:once}),
  /休息並退場/);
 once=act(once,'activate',{uid:tree.uid,mode:'restLeaveReveal'});
 assert.equal(once.pending.kind,'effect-reveal-retire');
 assert.equal(legalUniversalActions(packs,once).some(a=>a.uid===null),false);
 assert.equal(once.players[0].outside.some(c=>c.uid===tree.uid),true);
 assert.ok(once.mainReadyOnceByName[0].includes('フリューゲルの大樹'));
 once=dispatchUniversalAction(packs,once,{type:'chooseRevealRetire',uid:badge.uid});
 assert.equal(once.pending,null);
 assert.equal(once.players[0].deck.at(-1).uid,badge.uid);
 assert.equal(once.publicReveals.at(-1).kind,'hand-to-bottom');
 let second;
 [once,second]=playHand(once,'REZ-1-060');
 at(once,0,second.uid).ready=true;
 assert.equal(legalUniversalActions(packs,once).some(a=>a.mode==='restLeaveReveal'),false);

 let retired=six(8642);
 retired=reach(retired,'main');
 const field=stamp(retired,pull(retired,0,'REZ-1-060'));
 retired.players[0].energy[0]=field;
 const ram=stamp(retired,pull(retired,1,'REZ-1-007'));
 const beatrice=stamp(retired,pull(retired,1,'REZ-1-076'));
 retired.players[1].front[0]=ram;
 retired.players[1].front[1]=beatrice;
 const puck=pull(retired,0,'REZ-1-001');
 retired.players[0].hand.push(puck);
 assert.equal(legalUniversalActions(packs,retired).some(a=>a.mode==='restLeaveReveal'&&a.uid===field.uid),true);
 field.ready=false;
 assert.equal(legalUniversalActions(packs,retired).some(a=>a.mode==='restLeaveReveal'&&a.uid===field.uid),false);
 field.ready=true;
 retired=act(retired,'activate',{uid:field.uid,mode:'restLeaveReveal'});
 retired=dispatchUniversalAction(packs,retired,{type:'chooseRevealRetire',uid:puck.uid});
 assert.equal(retired.pending.kind,'effect-retire-referenced');
 assert.equal(retired.pending.ceiling,2000);
 assert.deepEqual(retired.pending.choices,[ram.uid]);
 let spared=dispatchUniversalAction(packs,structuredClone(retired),{type:'chooseRetireReferenced',uid:null});
 assert.equal(at(spared,1,ram.uid)&&spared.players[1].front.some(c=>c?.uid===ram.uid),true);
 retired=dispatchUniversalAction(packs,retired,{type:'chooseRetireReferenced',uid:ram.uid});
 assert.equal(retired.players[1].outside.some(c=>c.uid===ram.uid),true);
 assert.equal(retired.players[1].front.some(c=>c?.uid===beatrice.uid),true);

 let scaled=six(8643);
 scaled=reach(scaled,'main');
 const trunk=stamp(scaled,pull(scaled,0,'REZ-1-060'));
 const standing=stamp(scaled,pull(scaled,0,'REZ-1-058'));
 scaled.players[0].energy[0]=trunk;
 scaled.players[0].front[0]=standing;
 const small=stamp(scaled,pull(scaled,1,'REZ-1-007'));
 const high=stamp(scaled,pull(scaled,1,'REZ-1-076'));
 scaled.players[1].front[0]=small;
 scaled.players[1].front[1]=high;
 const emilia=pull(scaled,0,'REZ-1-081');
 scaled.players[0].hand.push(emilia);
 scaled=act(scaled,'activate',{uid:trunk.uid,mode:'restLeaveReveal'});
 scaled=dispatchUniversalAction(packs,scaled,{type:'chooseRevealRetire',uid:emilia.uid});
 assert.equal(scaled.pending.kind,'effect-referenced-bp');
 assert.equal(scaled.pending.next,'retire');
 assert.equal(scaled.pending.amount,1000);
 let base=dispatchUniversalAction(packs,structuredClone(scaled),{type:'chooseReferencedBp',mode:'decline'});
 assert.deepEqual(base.pending.choices,[small.uid]);
 scaled=dispatchUniversalAction(packs,scaled,{type:'chooseReferencedBp',mode:'accept'});
 assert.deepEqual(scaled.pending.choices.slice().sort(),[small.uid,high.uid].sort());
 scaled=dispatchUniversalAction(packs,scaled,{type:'chooseRetireReferenced',uid:high.uid});
 assert.equal(scaled.players[1].outside.some(c=>c.uid===high.uid),true);

 let quiet=six(8644);
 quiet=reach(quiet,'main');
 const asleep=stamp(quiet,pull(quiet,0,'REZ-1-060'));
 asleep.ready=false;
 quiet.players[0].energy[0]=asleep;
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.mode==='restLeaveReveal'),false);
 parkHand(quiet);
 asleep.ready=true;
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.mode==='restLeaveReveal'),false);
 assert.equal(assertUniversalMatch(packs,once),true);
 assert.equal(assertUniversalMatch(packs,retired),true);
 assert.equal(assertUniversalMatch(packs,spared),true);
 assert.equal(assertUniversalMatch(packs,scaled),true);
 assert.equal(assertUniversalMatch(packs,base),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('Felt pays 1 AP for one branch, then a hand card stops BP 4000 blockers',()=>{
 let early=six(8651);
 fuel(early,['REZ-1-016','REZ-1-016','REZ-1-016']);
 early=reach(early,'main');
 [early]=playFront(early,'REZ-1-107');
 assert.equal(early.pending,null);
 assert.equal(early.players[0].front.some(c=>c?.cardId==='REZ-1-107'&&c.ready===false),true);

 let paid=six(8652);
 fuel(paid,['REZ-1-016','REZ-1-016','REZ-1-016']);
 paid=ownMain(paid,2);
 let felt;
 [paid,felt]=playFront(paid,'REZ-1-107');
 assert.equal(paid.pending.kind,'effect-optional-pay-ap');
 let declined=dispatchUniversalAction(packs,structuredClone(paid),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(declined.pending,null);
 assert.equal(at(declined,0,felt.uid).ready,false);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.pending.kind,'effect-choice-mode');
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.mode==='skip'),false);
 assert.match(uiActionLabel({type:'chooseEffectMode',mode:'oppDiscardDraw'},{pack,state:paid}),/對手將1張手牌/);
 const victim=paid.players[1].hand[0];
 const before=paid.players[0].deck.length;
 paid=dispatchUniversalAction(packs,paid,{type:'chooseEffectMode',mode:'oppDiscardDraw'});
 assert.equal(paid.pending.kind,'effect-discard');
 assert.equal(paid.pending.player,1);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseDiscard',uid:victim.uid});
 assert.equal(paid.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.ok(paid.zoneMoveEvents.some(e=>e.uid===victim.uid&&e.reason==='opponent-effect'&&e.controller===0));
 assert.equal(paid.players[0].deck.length,before-1);
 assert.equal(at(paid,0,felt.uid).ready,false);

 let emptyHand=six(8653);
 fuel(emptyHand,['REZ-1-016','REZ-1-016','REZ-1-016']);
 emptyHand=ownMain(emptyHand,2);
 parkHand(emptyHand,1);
 [emptyHand]=playFront(emptyHand,'REZ-1-107');
 emptyHand=dispatchUniversalAction(packs,emptyHand,{type:'chooseOptionalPayAp',mode:'pay'});
 const drawnFrom=emptyHand.players[0].deck.length;
 emptyHand=dispatchUniversalAction(packs,emptyHand,{type:'chooseEffectMode',mode:'oppDiscardDraw'});
 assert.equal(emptyHand.pending,null);
 assert.equal(emptyHand.players[1].hand.length,0);
 assert.equal(emptyHand.players[0].deck.length,drawnFrom-1);

 let badge=six(8654);
 fuel(badge,['REZ-1-016','REZ-1-016','REZ-1-016']);
 badge=ownMain(badge,2);
 const token=pull(badge,0,'REZ-1-109');
 badge.players[0].outside.push(token);
 [badge,felt]=playFront(badge,'REZ-1-107');
 badge=dispatchUniversalAction(packs,badge,{type:'chooseOptionalPayAp',mode:'pay'});
 badge=dispatchUniversalAction(packs,badge,{type:'chooseEffectMode',mode:'activeBadge'});
 assert.equal(at(badge,0,felt.uid).ready,true);
 assert.equal(badge.pending.kind,'effect-recover-outside');
 let kept=dispatchUniversalAction(packs,structuredClone(badge),{type:'chooseOutsideRecovery',uid:null});
 assert.equal(kept.pending,null);
 assert.equal(at(kept,0,felt.uid).ready,true);
 assert.equal(kept.players[0].outside.some(c=>c.uid===token.uid),true);
 badge=dispatchUniversalAction(packs,badge,{type:'chooseOutsideRecovery',uid:token.uid});
 assert.equal(badge.players[0].hand.some(c=>c.uid===token.uid),true);
 assert.equal(at(badge,0,felt.uid).ready,true);

 let missing=six(8655);
 fuel(missing,['REZ-1-016','REZ-1-016','REZ-1-016']);
 missing=ownMain(missing,2);
 [missing,felt]=playFront(missing,'REZ-1-107');
 missing=dispatchUniversalAction(packs,missing,{type:'chooseOptionalPayAp',mode:'pay'});
 missing=dispatchUniversalAction(packs,missing,{type:'chooseEffectMode',mode:'activeBadge'});
 assert.equal(missing.pending,null);
 assert.equal(at(missing,0,felt.uid).ready,true);

 let guard=six(8656);
 guard=reach(guard,'main');
 const thief=stamp(guard,pull(guard,0,'REZ-1-107'));
 guard.players[0].energy[0]=thief;
 const payment=guard.players[0].hand[0];
 assert.match(uiActionLabel({type:'activate',uid:thief.uid,mode:'handBlock'},{pack,state:guard}),
  /BP4000/);
 guard=act(guard,'activate',{uid:thief.uid,mode:'handBlock'});
 assert.equal(guard.pending.kind,'effect-hand-block');
 assert.equal(legalUniversalActions(packs,guard).some(a=>a.uid===null),false);
 const ai=chooseUniversalAiAction(packs,guard);
 guard=dispatchUniversalAction(packs,guard,{type:'chooseHandBlock',uid:ai.uid||payment.uid});
 assert.equal(at(guard,0,thief.uid).blockAtLeastGranted.bp,4000);
 guard.players[0].hand.push(pull(guard,0,'REZ-1-007'));
 assert.equal(legalUniversalActions(packs,guard).some(a=>a.mode==='handBlock'&&a.uid===thief.uid),false);
 const twin=stamp(guard,pull(guard,0,'REZ-1-107'));
 guard.players[0].front[1]=twin;
 assert.equal(legalUniversalActions(packs,guard).some(a=>a.mode==='handBlock'&&a.uid===twin.uid),true);
 const slot=guard.players[0].energy.findIndex(c=>c?.uid===thief.uid);
 guard.players[0].front[0]=guard.players[0].energy[slot];
 guard.players[0].energy[slot]=null;
 const wall=stamp(guard,pull(guard,1,'REZ-1-053'));
 const ram=stamp(guard,pull(guard,1,'REZ-1-007'));
 guard.players[1].front[0]=wall;
 guard.players[1].front[1]=ram;
 guard=reach(guard,'attack');
 guard=act(guard,'attack',{uid:thief.uid});
 assert.equal(guard.pending.kind,'block');
 const blocks=legalUniversalActions(packs,guard).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===wall.uid),false);
 assert.equal(blocks.some(a=>a.uid===ram.uid),true);
 assert.equal(blocks.some(a=>a.uid===null),true);

 let quiet=six(8657);
 quiet=reach(quiet,'main');
 const rested=stamp(quiet,pull(quiet,0,'REZ-1-107'));
 quiet.players[0].front[0]=rested;
 parkHand(quiet);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.mode==='handBlock'),false);
 assert.equal(assertUniversalMatch(packs,early),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,emptyHand),true);
 assert.equal(assertUniversalMatch(packs,badge),true);
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,missing),true);
 assert.equal(assertUniversalMatch(packs,guard),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

const fiveCounts={
 'REZ-1-016':4,'REZ-1-043':4,'REZ-1-086':2,'REZ-1-081':2,'REZ-1-012':2,
 'REZ-1-007':4,'REZ-1-037':2,'REZ-1-040':1,'REZ-1-068':2,'REZ-1-031':2,
 'REZ-1-011':2,'REZ-1-020':2,'REZ-1-052':2,'REZ-1-074':2,'REZ-1-101':2,
 'REZ-1-008':4,'REZ-1-014':3,'REZ-1-022':3,'REZ-1-056':2,'REZ-1-050':1,
 'REZ-1-013':2
};
const five=seed=>newUniversalMatch(packs,{decks:[fiveCounts,fiveCounts],first:0,seed});
function lineEnergy(s,p,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=true;
  s.players[p].energy[i]=card;
 });
}
function put(s,p,id,line,slot){
 const card=stamp(s,pull(s,p,id));
 s.players[p][line][slot]=card;
 return card;
}
function castActive(s,id){
 const card=pull(s,s.active,id);
 s.players[s.active].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id+' for the active player');
 return [dispatchUniversalAction(packs,s,action),card];
}
function raidFront(s,id,baseUid,slot=0){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 return [act(s,'raid',{uid:card.uid,baseUid,slot}),card];
}
function silence(s,uid,untilPlayer){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,sourceLinked:false,until:{player:untilPlayer,phase:'attack',edge:'end'}});
}
// 016 is レム. Four of them on the caster would raise 鬼の力 from 3000 to 5000.
const ramFuel=['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007'];

test('Ram substitutes for Rem and lowers every qualifying front line',()=>{
 assert.equal(Object.values(fiveCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,fiveCounts),[]);
 const shell={id:'FIVE',name:'Five',color:'yellow',type:'character',energy:1,ap:1,bp:2000,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-traitless',cards:[{...shell,id:'BAD-T',type:'event',bp:0,
  effects:{onPlay:[{op:'impactIfEveryOwnTraitless'}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-sniper',cards:[{...shell,id:'BAD-S',mainAbility:{
  op:'sniperThenRaidBaseOutside',oncePerTurn:true,maxBp:3000}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-face',cards:[{...shell,id:'BAD-F',effects:{onPlay:[
  {op:'handOutsideReenterFaceDown',name:'エミリア'}]}}]}),/facedown reenter/);
 assert.throws(()=>createUniversalPack({id:'bad-sub',cards:[{...shell,id:'BAD-R',
  substituteOppRetire:{name:''}}]}),/invalid substitute retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-under',cards:[{...shell,id:'BAD-P',passiveBonuses:[
  {bp:1000,condition:{kind:'ownTurnFacedownUnder',turn:'any'}}]}]}),/facedown under/);

 let down=five(8701);
 fuel(down,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-016']);
 down=reach(down,'main');
 assert.equal(universalEnergyByColor(packs,down,0).yellow,4);
 const small=put(down,1,'REZ-1-037','front',0);
 const mid=put(down,1,'REZ-1-012','front',1);
 const tall=put(down,1,'REZ-1-016','front',2);
 [down]=playFront(down,'REZ-1-011');
 assert.equal(down.pending.kind,'effect-choice-mode');
 assert.equal(legalUniversalActions(packs,down).some(a=>a.mode==='skip'),false);
 assert.equal(chooseUniversalAiAction(packs,down).mode,'allDown');
 assert.match(uiActionLabel({type:'chooseEffectMode',mode:'allDown'},{pack,state:down}),/BP1500以上/);
 let one=structuredClone(down);
 down=dispatchUniversalAction(packs,down,{type:'chooseEffectMode',mode:'allDown'});
 assert.equal(down.pending,null);
 assert.equal(universalBp(packs,down,at(down,1,small.uid)),1000);
 assert.equal(universalBp(packs,down,at(down,1,mid.uid)),500);
 assert.equal(universalBp(packs,down,at(down,1,tall.uid)),1500);
 one=dispatchUniversalAction(packs,one,{type:'chooseEffectMode',mode:'oneDown'});
 assert.equal(one.pending.kind,'effect-target');
 assert.equal(one.pending.optional,true);
 assert.deepEqual(one.pending.choices,[tall.uid]);
 assert.equal(legalUniversalActions(packs,one).some(a=>a.uid===null),true);
 const kept=dispatchUniversalAction(packs,structuredClone(one),{type:'chooseTarget',uid:null});
 assert.equal(kept.pending,null);
 assert.equal(universalBp(packs,kept,at(kept,1,tall.uid)),2500);
 one=dispatchUniversalAction(packs,one,{type:'chooseTarget',uid:tall.uid});
 assert.equal(one.pending,null);
 assert.equal(universalBp(packs,one,at(one,1,tall.uid)),500);
 assert.equal(universalBp(packs,one,at(one,1,mid.uid)),1500);
 assert.equal(universalBp(packs,one,at(one,1,small.uid)),1000);
 down=untilPhase(packs,down,1,'main');
 assert.equal(universalBp(packs,down,at(down,1,small.uid)),1000);
 assert.equal(universalBp(packs,down,at(down,1,mid.uid)),1500);
 assert.equal(universalBp(packs,down,at(down,1,tall.uid)),2500);

 let gate=five(8702);
 const gateRam=put(gate,0,'REZ-1-011','front',0);
 const gateRem=put(gate,0,'REZ-1-012','front',1);
 gate=reach(gate,'attack');
 armLife(gate,1,'REZ-1-031');
 gate=act(gate,'attack',{uid:gateRam.uid});
 gate=dispatchUniversalAction(packs,gate,{type:'chooseBlock',uid:null});
 assert.equal(gate.pending.kind,'life-trigger');
 assert.equal(gate.pending.trigger,'special');
 gate=dispatchUniversalAction(packs,gate,{type:'chooseTrigger',mode:'special',uid:gateRem.uid});
 assert.equal(gate.pending,null);
 assert.equal(gate.players[0].outside.some(c=>c.uid===gateRem.uid),true);
 assert.equal(gate.players[0].front.some(c=>c?.uid===gateRam.uid),true);

 let swap=five(8703);
 lineEnergy(swap,1,ramFuel);
 const rem=put(swap,0,'REZ-1-012','front',0);
 const ramA=put(swap,0,'REZ-1-011','front',1);
 const ramB=put(swap,0,'REZ-1-011','front',2);
 swap=untilPhase(packs,swap,1,'main');
 assert.equal(universalEnergyByColor(packs,swap,1).yellow,4);
 [swap]=castActive(swap,'REZ-1-031');
 assert.equal(swap.pending.kind,'effect-retire-bp');
 assert.equal(swap.pending.limit,3000);
 assert.deepEqual(swap.pending.choices,[rem.uid]);
 swap=dispatchUniversalAction(packs,swap,{type:'chooseRetireBp',uid:rem.uid});
 assert.equal(swap.pending.kind,'effect-substitute-retire');
 assert.equal(swap.pending.optional,true);
 assert.equal(swap.pending.by,'opponent');
 assert.equal(swap.pending.name,'レム');
 assert.equal(Object.keys(swap.pending).length,10);
 assert.notEqual(swap.active,swap.pending.player);
 assert.deepEqual(swap.pending.choices.slice().sort(),[ramA.uid,ramB.uid].sort());
 assert.equal(V2_PENDING_LABELS['effect-substitute-retire'],'可改由前線的拉姆代替雷姆退場');
 assert.match(uiActionLabel({type:'chooseSubstituteRetire',uid:null},{pack,state:swap}),
  /不代替，讓原本的角色退場/);
 assert.notEqual(chooseUniversalAiAction(packs,swap).uid,null);
 const declined=dispatchUniversalAction(packs,structuredClone(swap),{type:'chooseSubstituteRetire',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===rem.uid),true);
 assert.equal(declined.players[0].front.some(c=>c?.uid===ramA.uid),true);
 assert.equal(declined.players[0].front.some(c=>c?.uid===ramB.uid),true);
 assert.equal(declined.turnRetireEvents.some(e=>e.uid===rem.uid),true);
 assert.equal(declined.turnRetireEvents.some(e=>e.uid===ramA.uid||e.uid===ramB.uid),false);
 swap=dispatchUniversalAction(packs,swap,{type:'chooseSubstituteRetire',uid:ramA.uid});
 assert.equal(swap.pending,null);
 assert.equal(swap.players[0].outside.some(c=>c.uid===ramA.uid),true);
 assert.equal(swap.players[0].front.some(c=>c?.uid===rem.uid),true);
 assert.equal(swap.players[0].front.some(c=>c?.uid===ramB.uid),true);
 assert.equal(swap.turnRetireEvents.some(e=>e.uid===ramA.uid),true);
 assert.equal(swap.turnRetireEvents.some(e=>e.uid===rem.uid),false);

 let energyRam=five(8704);
 lineEnergy(energyRam,1,ramFuel);
 const energyRem=put(energyRam,0,'REZ-1-012','front',0);
 const parked=put(energyRam,0,'REZ-1-011','energy',0);
 energyRam=untilPhase(packs,energyRam,1,'main');
 [energyRam]=castActive(energyRam,'REZ-1-031');
 assert.equal(energyRam.pending.limit,3000);
 energyRam=dispatchUniversalAction(packs,energyRam,{type:'chooseRetireBp',uid:energyRem.uid});
 assert.equal(energyRam.pending,null);
 assert.equal(energyRam.players[0].outside.some(c=>c.uid===energyRem.uid),true);
 assert.equal(energyRam.players[0].energy.some(c=>c?.uid===parked.uid),true);

 let quietRam=five(8705);
 lineEnergy(quietRam,1,ramFuel);
 const quietRem=put(quietRam,0,'REZ-1-012','front',0);
 const quiet=put(quietRam,0,'REZ-1-011','front',1);
 quietRam=untilPhase(packs,quietRam,1,'main');
 silence(quietRam,quiet.uid,1);
 [quietRam]=castActive(quietRam,'REZ-1-031');
 quietRam=dispatchUniversalAction(packs,quietRam,{type:'chooseRetireBp',uid:quietRem.uid});
 assert.equal(quietRam.pending,null);
 assert.equal(quietRam.players[0].outside.some(c=>c.uid===quietRem.uid),true);
 assert.equal(quietRam.players[0].front.some(c=>c?.uid===quiet.uid),true);

 let battle=five(8706);
 const blocker=put(battle,0,'REZ-1-012','front',0);
 const watcher=put(battle,0,'REZ-1-011','front',1);
 const attacker=put(battle,1,'REZ-1-040','front',0);
 battle=untilPhase(packs,battle,1,'attack');
 battle=act(battle,'attack',{uid:attacker.uid});
 assert.equal(battle.pending.kind,'block');
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(battle.pending,null);
 assert.equal(battle.players[0].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(battle.players[0].front.some(c=>c?.uid===watcher.uid),true);
 assert.equal(battle.turnRetireEvents.some(e=>e.uid===blocker.uid),true);
 assert.equal(battle.turnRetireEvents.some(e=>e.uid===watcher.uid),false);

 let bounced=five(8707);
 const homeRam=put(bounced,0,'REZ-1-011','front',0);
 const homeRem=put(bounced,0,'REZ-1-012','front',1);
 bounced=reach(bounced,'attack');
 armLife(bounced,1,'REZ-1-050');
 bounced=act(bounced,'attack',{uid:homeRam.uid});
 bounced=dispatchUniversalAction(packs,bounced,{type:'chooseBlock',uid:null});
 assert.equal(bounced.pending.kind,'life-trigger');
 assert.equal(bounced.pending.trigger,'color');
 const returns=legalUniversalActions(packs,bounced).filter(a=>a.mode==='colorBounce');
 assert.equal(returns.some(a=>a.uid===homeRem.uid),true);
 assert.equal(returns.some(a=>a.uid===homeRam.uid),false);
 bounced=dispatchUniversalAction(packs,bounced,{type:'chooseTrigger',mode:'colorBounce',uid:homeRem.uid});
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===homeRem.uid),true);
 assert.equal(bounced.players[0].front.some(c=>c?.uid===homeRam.uid),true);
 assert.equal(bounced.turnRetireEvents.some(e=>e.uid===homeRem.uid),false);

 let other=five(8708);
 lineEnergy(other,1,ramFuel);
 const otherRam=put(other,0,'REZ-1-011','front',0);
 const otherCard=put(other,0,'REZ-1-007','front',1);
 other=untilPhase(packs,other,1,'main');
 [other]=castActive(other,'REZ-1-031');
 assert.equal(other.pending.limit,3000);
 assert.deepEqual(other.pending.choices,[otherCard.uid]);
 other=dispatchUniversalAction(packs,other,{type:'chooseRetireBp',uid:otherCard.uid});
 assert.equal(other.pending,null);
 assert.equal(other.players[0].outside.some(c=>c.uid===otherCard.uid),true);
 assert.equal(other.players[0].front.some(c=>c?.uid===otherRam.uid),true);
 assert.equal(assertUniversalMatch(packs,down),true);
 assert.equal(assertUniversalMatch(packs,one),true);
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,gate),true);
 assert.equal(assertUniversalMatch(packs,swap),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,energyRam),true);
 assert.equal(assertUniversalMatch(packs,quietRam),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
 assert.equal(assertUniversalMatch(packs,bounced),true);
 assert.equal(assertUniversalMatch(packs,other),true);
});

test('traitless Rem gains this-turn impact and a sniper that cannot name BP 4000',()=>{
 let live=five(8711);
 lineEnergy(live,0,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-101']);
 const base=put(live,0,'REZ-1-012','front',0);
 live=ownMain(live,2);
 assert.equal(universalEnergyByColor(packs,live,0).yellow,5);
 assert.equal(live.players[0].apCards.filter(c=>c.ready).length,2);
 let top;
 [live,top]=raidFront(live,'REZ-1-020',base.uid,0);
 assert.equal(live.pending,null);
 assert.equal(at(live,0,top.uid).ready,true);
 assert.equal(at(live,0,top.uid).stack[0].uid,base.uid);
 assert.equal(universalImpact(packs,live,at(live,0,top.uid)),1);
 const second=pull(live,0,'REZ-1-020');
 live.players[0].hand.push(second);
 const fuelRem=live.players[0].energy.find(c=>c?.cardId==='REZ-1-016');
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===second.uid&&
  a.baseUid===fuelRem.uid),true);
 assert.equal(legalUniversalActions(packs,live).some(a=>a.type==='raid'&&a.uid===second.uid&&
  a.baseUid===top.uid),false);
 live.players[0].deck.push(live.players[0].hand.pop());
 live=act(live,'activate',{uid:top.uid,mode:'sniperRaidBase'});
 assert.equal(at(live,0,top.uid).stack.length,0);
 assert.equal(at(live,0,top.uid).sniperGranted.maxBp,4000);
 assert.equal(live.players[0].outside.some(c=>c.uid===base.uid),true);
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===base.uid&&e.from==='raid-under'&&
  e.to==='outside'&&e.reason==='own-effect'&&e.sourceUid===top.uid));
 assert.equal(legalUniversalActions(packs,live).some(a=>a.mode==='sniperRaidBase'),false);
 const prey=put(live,1,'REZ-1-013','front',0);
 const wall=put(live,1,'REZ-1-011','front',1);
 live=reach(live,'attack');
 const shots=legalUniversalActions(packs,live).filter(a=>a.type==='attack'&&a.uid===top.uid);
 assert.equal(shots.some(a=>a.targetUid===prey.uid),true);
 assert.equal(shots.some(a=>a.targetUid===wall.uid),false);
 assert.match(uiActionLabel(shots.find(a=>a.targetUid===prey.uid),{pack,state:live}),/狙擊攻擊/);
 const life=live.players[1].life.length;
 live=dispatchUniversalAction(packs,live,shots.find(a=>a.targetUid===prey.uid));
 assert.equal(live.pending,null);
 assert.equal(live.players[1].life.length,life);
 assert.equal(live.players[1].outside.some(c=>c.uid===prey.uid),true);
 assert.equal(live.players[1].front.some(c=>c?.uid===wall.uid),true);
 live=untilPhase(packs,live,1,'main');
 assert.equal(universalImpact(packs,live,at(live,0,top.uid)),0);

 let marked=five(8712);
 lineEnergy(marked,0,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-101']);
 put(marked,0,'REZ-1-086','front',1);
 const plain=put(marked,0,'REZ-1-012','front',0);
 marked=reach(marked,'main');
 let traited;
 [marked,traited]=raidFront(marked,'REZ-1-020',plain.uid,0);
 assert.equal(universalImpact(packs,marked,at(marked,0,traited.uid)),0);

 let bare=five(8713);
 fuel(bare,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-016']);
 bare=reach(bare,'main');
 assert.equal(universalEnergyByColor(packs,bare,0).yellow,4);
 const costly=pull(bare,0,'REZ-1-020');
 bare.players[0].hand.push(costly);
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.uid===costly.uid&&
  (a.type==='play'||a.type==='raid')),false);
 let open=five(8714);
 lineEnergy(open,0,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-101']);
 open=reach(open,'main');
 let played;
 [open,played]=playFront(open,'REZ-1-020');
 assert.equal(open.pending,null);
 assert.equal(at(open,0,played.uid).ready,false);
 assert.equal(universalImpact(packs,open,at(open,0,played.uid)),1);
 open=act(open,'activate',{uid:played.uid,mode:'sniperRaidBase'});
 assert.equal(at(open,0,played.uid).stack.length,0);
 assert.equal(at(open,0,played.uid).sniperGranted.maxBp,4000);
 at(open,0,played.uid).ready=true;
 const low=put(open,1,'REZ-1-013','front',0);
 const high=put(open,1,'REZ-1-040','front',1);
 open=reach(open,'attack');
 const aimed=legalUniversalActions(packs,open).filter(a=>a.type==='attack'&&a.uid===played.uid);
 assert.equal(aimed.some(a=>a.targetUid===low.uid),true);
 assert.equal(aimed.some(a=>a.targetUid===high.uid),false);

 let hidden=five(8715);
 lineEnergy(hidden,0,['REZ-1-016','REZ-1-016','REZ-1-016','REZ-1-101']);
 const host=put(hidden,0,'REZ-1-012','front',0);
 const buried=pull(hidden,0,'REZ-1-008');
 buried.faceDown=true;buried.ready=false;buried.fieldEntryStamp=null;
 buried.stack=[];buried.under=[];buried.buffs=[];
 host.under=[buried];
 hidden=reach(hidden,'main');
 let cover;
 [hidden,cover]=raidFront(hidden,'REZ-1-020',host.uid,0);
 hidden=act(hidden,'activate',{uid:cover.uid,mode:'sniperRaidBase'});
 assert.equal(at(hidden,0,cover.uid).stack.length,1);
 assert.equal(at(hidden,0,cover.uid).stack[0].under[0].uid,buried.uid);
 assert.equal(at(hidden,0,cover.uid).stack[0].under[0].faceDown,true);
 assert.equal(hidden.players[0].outside.some(c=>c.uid===host.uid),false);
 assert.equal(at(hidden,0,cover.uid).sniperGranted.maxBp,4000);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,marked),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
 assert.equal(assertUniversalMatch(packs,open),true);
 assert.equal(assertUniversalMatch(packs,hidden),true);
});

test('Rem chooses an active zero-energy Subaru or a bounce then a rested Subaru',()=>{
 let active=five(8721);
 fuel(active,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const zero=pull(active,0,'REZ-1-037');
 const purple=pull(active,0,'REZ-1-068');
 active.players[0].outside.push(zero,purple);
 active=ownMain(active,2);
 assert.equal(universalEnergyByColor(packs,active,0).blue,4);
 assert.equal(active.players[0].apCards.filter(c=>c.ready).length,2);
 let rem;
 [active,rem]=playFront(active,'REZ-1-052');
 assert.equal(active.pending.kind,'effect-choice-mode');
 active=dispatchUniversalAction(packs,active,{type:'chooseEffectMode',mode:'activeZero'});
 assert.equal(active.pending.kind,'effect-outside-printed-active');
 assert.deepEqual(active.pending.choices,[zero.uid]);
 const ai=chooseUniversalAiAction(packs,active);
 assert.notEqual(ai.uid,null);
 assert.equal(ai.replaceUid,undefined);
 const skipped=dispatchUniversalAction(packs,structuredClone(active),
  {type:'chooseOutsidePrintedActive',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===zero.uid),true);
 const entry=legalUniversalActions(packs,active).find(a=>a.type==='chooseOutsidePrintedActive'&&
  a.uid===zero.uid&&a.line==='front'&&a.replaceUid===undefined);
 active=dispatchUniversalAction(packs,active,entry);
 assert.equal(active.pending,null);
 assert.equal(at(active,0,zero.uid).ready,true);
 assert.equal(Number.isInteger(at(active,0,zero.uid).fieldEntryStamp),true);
 assert.equal(at(active,0,rem.uid).ready,false);

 let empty=five(8722);
 fuel(empty,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 empty=ownMain(empty,2);
 [empty]=playFront(empty,'REZ-1-052');
 empty=dispatchUniversalAction(packs,empty,{type:'chooseEffectMode',mode:'activeZero'});
 assert.equal(empty.pending,null);

 let raid=five(8723);
 fuel(raid,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const base=put(raid,0,'REZ-1-037','front',0);
 const other=put(raid,0,'REZ-1-007','front',1);
 const big=pull(raid,0,'REZ-1-040');
 raid.players[0].outside.push(big);
 raid=ownMain(raid,2);
 let source;
 [raid,source]=playFront(raid,'REZ-1-052');
 raid=dispatchUniversalAction(packs,raid,{type:'chooseEffectMode',mode:'bounceRaid'});
 assert.equal(raid.pending.kind,'effect-bounce-include-self');
 const energyUids=raid.players[0].energy.filter(Boolean).map(c=>c.uid);
 assert.deepEqual(raid.pending.choices.slice().sort(),
  [source.uid,base.uid,other.uid,...energyUids].sort());
 const left=dispatchUniversalAction(packs,structuredClone(raid),{type:'chooseBounceIncludeSelf',uid:null});
 assert.equal(left.pending,null);
 assert.equal(at(left,0,source.uid).ready,false);
 assert.equal(left.players[0].outside.some(c=>c.uid===big.uid),true);
 raid=dispatchUniversalAction(packs,raid,{type:'chooseBounceIncludeSelf',uid:other.uid});
 assert.equal(at(raid,0,source.uid).ready,true);
 assert.equal(raid.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(raid.pending.kind,'effect-outside-rest-or-raid');
 assert.ok(raid.pending.choices.includes(big.uid));
 const deck=raid.players[0].deck.length;
 const raidAction=legalUniversalActions(packs,raid).find(a=>a.type==='chooseOutsideRestOrRaid'&&
  a.mode==='raid'&&a.uid===big.uid&&a.baseUid===base.uid);
 raid=dispatchUniversalAction(packs,raid,raidAction);
 assert.equal(raid.pending,null);
 assert.equal(at(raid,0,big.uid).ready,false);
 assert.equal(at(raid,0,big.uid).stack[0].uid,base.uid);
 assert.equal(raid.players[0].deck.length,deck-1);

 let self=five(8724);
 fuel(self,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const rested=pull(self,0,'REZ-1-040');
 self.players[0].outside.push(rested);
 self=ownMain(self,2);
 let mirror;
 [self,mirror]=playFront(self,'REZ-1-052');
 self=dispatchUniversalAction(packs,self,{type:'chooseEffectMode',mode:'bounceRaid'});
 self=dispatchUniversalAction(packs,self,{type:'chooseBounceIncludeSelf',uid:mirror.uid});
 assert.equal(self.players[0].hand.some(c=>c.uid===mirror.uid),true);
 assert.equal(self.players[0].front.some(c=>c?.uid===mirror.uid),false);
 assert.equal(self.pending.kind,'effect-outside-rest-or-raid');
 const restEntry=legalUniversalActions(packs,self).find(a=>a.type==='chooseOutsideRestOrRaid'&&
  a.mode==='enter'&&a.uid===rested.uid&&a.line==='front'&&a.replaceUid===undefined);
 self=dispatchUniversalAction(packs,self,restEntry);
 assert.equal(self.pending,null);
 assert.equal(at(self,0,rested.uid).ready,false);
 assert.equal(self.players[0].front.some(c=>c?.uid===mirror.uid),false);

 let gated=five(8725);
 fuel(gated,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 const cheap=pull(gated,0,'REZ-1-037');
 const expensive=pull(gated,0,'REZ-1-040');
 gated.players[0].outside.push(cheap,expensive);
 gated=ownMain(gated,2);
 [gated]=playFront(gated,'REZ-1-052');
 gated=dispatchUniversalAction(packs,gated,{type:'chooseEffectMode',mode:'bounceRaid'});
 gated.players[0].energy.filter(c=>c?.cardId==='REZ-1-043').slice(0,2).forEach(c=>{c.ready=false;});
 assert.equal(universalEnergyByColor(packs,gated,0).blue,2);
 const bouncedSelf=gated.players[0].front.find(c=>c?.cardId==='REZ-1-052');
 gated=dispatchUniversalAction(packs,gated,{type:'chooseBounceIncludeSelf',uid:bouncedSelf.uid});
 assert.equal(gated.pending.kind,'effect-outside-rest-or-raid');
 assert.ok(gated.pending.choices.includes(cheap.uid));
 assert.equal(gated.pending.choices.includes(expensive.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,gated,{type:'chooseOutsideRestOrRaid',mode:'enter',
  uid:expensive.uid,line:'front',slot:1}),/not currently legal/);
 const cheapEntry=legalUniversalActions(packs,gated).find(a=>a.type==='chooseOutsideRestOrRaid'&&
  a.mode==='enter'&&a.uid===cheap.uid&&a.replaceUid===undefined);
 gated=dispatchUniversalAction(packs,gated,cheapEntry);
 assert.equal(at(gated,0,cheap.uid).ready,false);
 assert.equal(gated.players[0].outside.some(c=>c.uid===expensive.uid),true);
 assert.equal(assertUniversalMatch(packs,active),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
 assert.equal(assertUniversalMatch(packs,left),true);
 assert.equal(assertUniversalMatch(packs,self),true);
 assert.equal(assertUniversalMatch(packs,gated),true);
});

test('Beatrice makes one Subaru return to hand instead of an opponent retirement',()=>{
 let live=five(8731);
 fuel(live,['REZ-1-086']);
 const subaru=put(live,0,'REZ-1-068','front',0);
 put(live,0,'REZ-1-007','front',1);
 live=reach(live,'main');
 assert.equal(universalEnergyByColor(packs,live,0).purple,1);
 let beatrice;
 [live,beatrice]=playFront(live,'REZ-1-074');
 assert.equal(live.pending.kind,'effect-grant-bounce-instead');
 assert.deepEqual(live.pending.choices,[subaru.uid]);
 assert.equal(V2_PENDING_LABELS['effect-grant-bounce-instead'],
  '可指定 1 張菜月昴，對手效果退場時改回手牌');
 const skipped=dispatchUniversalAction(packs,structuredClone(live),
  {type:'chooseGrantBounceInstead',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(at(skipped,0,subaru.uid).bounceInsteadGranted,undefined);
 live=dispatchUniversalAction(packs,live,{type:'chooseGrantBounceInstead',uid:subaru.uid});
 assert.equal(live.pending,null);
 const grant=at(live,0,subaru.uid).bounceInsteadGranted;
 assert.deepEqual(Object.keys(grant).sort(),['sourceUid','stamp','untilOwnTurnStart']);
 assert.equal(grant.untilOwnTurnStart,live.players[0].ownTurns+1);
 assert.equal(grant.stamp,at(live,0,subaru.uid).fieldEntryStamp);
 assert.equal(grant.sourceUid,beatrice.uid);
 let lasting=structuredClone(live);
 lasting=untilPhase(packs,lasting,1,'main');
 assert.equal(at(lasting,0,subaru.uid).bounceInsteadGranted.untilOwnTurnStart,2);
 lasting=untilPhase(packs,lasting,0,'main');
 assert.equal(at(lasting,0,subaru.uid).bounceInsteadGranted,undefined);

 let none=five(8732);
 fuel(none,['REZ-1-086']);
 put(none,0,'REZ-1-007','front',0);
 none=reach(none,'main');
 [none]=playFront(none,'REZ-1-074');
 assert.equal(none.pending,null);

 let retired=five(8733);
 fuel(retired,['REZ-1-086']);
 lineEnergy(retired,1,ramFuel);
 const target=put(retired,0,'REZ-1-068','front',0);
 put(retired,0,'REZ-1-007','front',1);
 retired=reach(retired,'main');
 [retired]=playFront(retired,'REZ-1-074');
 retired=dispatchUniversalAction(packs,retired,{type:'chooseGrantBounceInstead',uid:target.uid});
 retired=untilPhase(packs,retired,1,'main');
 [retired]=castActive(retired,'REZ-1-031');
 assert.equal(retired.pending.limit,3000);
 assert.ok(retired.pending.choices.includes(target.uid));
 retired=dispatchUniversalAction(packs,retired,{type:'chooseRetireBp',uid:target.uid});
 assert.equal(retired.pending,null);
 assert.equal(retired.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.equal(retired.players[0].outside.some(c=>c.uid===target.uid),false);
 assert.equal(retired.turnRetireEvents.some(e=>e.uid===target.uid),false);
 assert.ok(retired.zoneMoveEvents.some(e=>e.uid===target.uid&&e.to==='hand'&&
  e.reason==='opponent-effect'));

 let fight=five(8734);
 fuel(fight,['REZ-1-086']);
 const guard=put(fight,0,'REZ-1-037','front',0);
 const foe=put(fight,1,'REZ-1-011','front',0);
 fight=reach(fight,'main');
 [fight]=playFront(fight,'REZ-1-074');
 fight=dispatchUniversalAction(packs,fight,{type:'chooseGrantBounceInstead',uid:guard.uid});
 fight=untilPhase(packs,fight,1,'attack');
 fight=act(fight,'attack',{uid:foe.uid});
 fight=dispatchUniversalAction(packs,fight,{type:'chooseBlock',uid:guard.uid});
 assert.equal(fight.pending,null);
 assert.equal(fight.players[0].outside.some(c=>c.uid===guard.uid),true);
 assert.equal(fight.players[0].hand.some(c=>c.uid===guard.uid),false);
 assert.equal(fight.turnRetireEvents.some(e=>e.uid===guard.uid),true);

 let hushed=five(8735);
 fuel(hushed,['REZ-1-086']);
 lineEnergy(hushed,1,ramFuel);
 const quiet=put(hushed,0,'REZ-1-068','front',0);
 hushed=reach(hushed,'main');
 [hushed]=playFront(hushed,'REZ-1-074');
 hushed=dispatchUniversalAction(packs,hushed,{type:'chooseGrantBounceInstead',uid:quiet.uid});
 hushed=untilPhase(packs,hushed,1,'main');
 silence(hushed,quiet.uid,1);
 [hushed]=castActive(hushed,'REZ-1-031');
 hushed=dispatchUniversalAction(packs,hushed,{type:'chooseRetireBp',uid:quiet.uid});
 assert.equal(hushed.pending,null);
 assert.equal(hushed.players[0].outside.some(c=>c.uid===quiet.uid),true);
 assert.equal(hushed.players[0].hand.some(c=>c.uid===quiet.uid),false);

 let sourceQuiet=five(8736);
 fuel(sourceQuiet,['REZ-1-086']);
 lineEnergy(sourceQuiet,1,ramFuel);
 const named=put(sourceQuiet,0,'REZ-1-068','front',0);
 sourceQuiet=reach(sourceQuiet,'main');
 let sourceCard;
 [sourceQuiet,sourceCard]=playFront(sourceQuiet,'REZ-1-074');
 sourceQuiet=dispatchUniversalAction(packs,sourceQuiet,{type:'chooseGrantBounceInstead',uid:named.uid});
 sourceQuiet=untilPhase(packs,sourceQuiet,1,'main');
 silence(sourceQuiet,sourceCard.uid,1);
 [sourceQuiet]=castActive(sourceQuiet,'REZ-1-031');
 sourceQuiet=dispatchUniversalAction(packs,sourceQuiet,{type:'chooseRetireBp',uid:named.uid});
 assert.equal(sourceQuiet.players[0].hand.some(c=>c.uid===named.uid),true);
 assert.equal(sourceQuiet.turnRetireEvents.some(e=>e.uid===named.uid),false);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,lasting),true);
 assert.equal(assertUniversalMatch(packs,none),true);
 assert.equal(assertUniversalMatch(packs,retired),true);
 assert.equal(assertUniversalMatch(packs,fight),true);
 assert.equal(assertUniversalMatch(packs,hushed),true);
 assert.equal(assertUniversalMatch(packs,sourceQuiet),true);
});

test('Subaru reenters rested with the paid hand card facedown underneath',()=>{
 let live=five(8741);
 fuel(live,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(live,1,ramFuel);
 const emilia=put(live,0,'REZ-1-081','front',0);
 live=reach(live,'main');
 assert.equal(universalEnergyByColor(packs,live,0).yellow,3);
 let subaru;
 [live,subaru]=playFront(live,'REZ-1-101');
 assert.equal(live.pending,null);
 assert.equal(at(live,0,subaru.uid).ready,false);
 assert.equal(universalBp(packs,live,at(live,0,subaru.uid)),3000);
 live=untilPhase(packs,live,1,'main');
 [live]=castActive(live,'REZ-1-031');
 assert.equal(live.pending.limit,3000);
 assert.ok(live.pending.choices.includes(subaru.uid));
 live=dispatchUniversalAction(packs,live,{type:'chooseRetireBp',uid:subaru.uid});
 assert.equal(live.pending.kind,'effect-hand-reenter-under');
 assert.equal(live.pending.optional,true);
 assert.equal(live.pending.name,'エミリア');
 assert.equal(Object.keys(live.pending).length,6);
 const handCard=live.players[0].hand[0];
 const seen=universalPrivateChoices(packs,live,0);
 assert.equal(seen.kind,'effect-hand-reenter-under');
 assert.ok(seen.options.some(o=>o.card&&o.card.cardId===handCard.cardId));
 assert.equal(universalPrivateChoices(packs,live,1),null);
 assert.equal(V2_PENDING_LABELS['effect-hand-reenter-under'],
  '可將 1 張手牌放到場外，讓菜月昴休息回到前線');
 assert.match(uiActionLabel({type:'chooseHandReenterUnder',uid:null},{pack,state:live}),
  /不將手牌放到場外/);
 const ai=chooseUniversalAiAction(packs,live);
 assert.notEqual(ai.uid,null);
 assert.equal(ai.replaceUid,undefined);
 const handBefore=live.players[0].hand.length;
 const declined=dispatchUniversalAction(packs,structuredClone(live),
  {type:'chooseHandReenterUnder',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(declined.players[0].hand.length,handBefore);
 const back=legalUniversalActions(packs,live).find(a=>a.type==='chooseHandReenterUnder'&&
  a.uid===handCard.uid&&a.replaceUid===undefined);
 live=dispatchUniversalAction(packs,live,back);
 assert.equal(live.pending,null);
 const returned=at(live,0,subaru.uid);
 assert.equal(returned.ready,false);
 assert.equal(Number.isInteger(returned.fieldEntryStamp),true);
 assert.equal(returned.under.length,1);
 assert.equal(returned.under[0].uid,handCard.uid);
 assert.equal(returned.under[0].faceDown,true);
 assert.equal(live.players[0].hand.some(c=>c.uid===handCard.uid),false);
 assert.equal(live.players[0].outside.some(c=>c.uid===handCard.uid),false);
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===handCard.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='own-effect'&&e.sourceUid===subaru.uid));
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===handCard.uid&&e.from==='outside'&&
  e.to==='raid-under'&&e.reason==='own-effect'&&e.sourceUid===subaru.uid));
 assert.ok(live.zoneMoveEvents.some(e=>e.uid===subaru.uid&&e.from==='outside'&&
  e.to==='front'&&e.reason==='own-effect'));
 assert.equal(universalBp(packs,live,returned),3000);
 const ownerView=universalPublicView(packs,live,0).players[0].front.find(c=>c?.uid===subaru.uid);
 const foeView=universalPublicView(packs,live,1).players[0].front.find(c=>c?.uid===subaru.uid);
 assert.equal(ownerView.underLayers[0].cardId,handCard.cardId);
 assert.equal(ownerView.underLayers[0].faceDown,true);
 assert.deepEqual(foeView.underLayers[0],{faceDown:true});
 assert.equal(live.players[0].front.some(c=>c?.uid===emilia.uid),true);
 live=untilPhase(packs,live,0,'main');
 assert.equal(universalBp(packs,live,at(live,0,subaru.uid)),4000);
 silence(live,subaru.uid,0);
 assert.equal(universalBp(packs,live,at(live,0,subaru.uid)),3000);
 live=untilPhase(packs,live,1,'main');
 [live]=castActive(live,'REZ-1-031');
 assert.equal(live.pending.limit,3000);
 live=dispatchUniversalAction(packs,live,{type:'chooseRetireBp',uid:subaru.uid});
 assert.equal(live.pending,null);
 assert.equal(live.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(live.players[0].outside.some(c=>c.uid===handCard.uid),true);

 let bareHand=five(8742);
 fuel(bareHand,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(bareHand,1,ramFuel);
 put(bareHand,0,'REZ-1-081','front',0);
 bareHand=reach(bareHand,'main');
 let lonely;
 [bareHand,lonely]=playFront(bareHand,'REZ-1-101');
 bareHand=untilPhase(packs,bareHand,1,'main');
 parkHand(bareHand,0);
 [bareHand]=castActive(bareHand,'REZ-1-031');
 bareHand=dispatchUniversalAction(packs,bareHand,{type:'chooseRetireBp',uid:lonely.uid});
 assert.equal(bareHand.pending,null);
 assert.equal(bareHand.players[0].outside.some(c=>c.uid===lonely.uid),true);

 let unnamed=five(8743);
 fuel(unnamed,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(unnamed,1,ramFuel);
 unnamed=reach(unnamed,'main');
 let plain;
 [unnamed,plain]=playFront(unnamed,'REZ-1-101');
 unnamed=untilPhase(packs,unnamed,1,'main');
 [unnamed]=castActive(unnamed,'REZ-1-031');
 unnamed=dispatchUniversalAction(packs,unnamed,{type:'chooseRetireBp',uid:plain.uid});
 assert.equal(unnamed.pending,null);
 assert.equal(unnamed.players[0].outside.some(c=>c.uid===plain.uid),true);

 let energyEmilia=five(8744);
 fuel(energyEmilia,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(energyEmilia,1,ramFuel);
 put(energyEmilia,0,'REZ-1-081','energy',3);
 energyEmilia=reach(energyEmilia,'main');
 let fromEnergy;
 [energyEmilia,fromEnergy]=playFront(energyEmilia,'REZ-1-101');
 energyEmilia=untilPhase(packs,energyEmilia,1,'main');
 [energyEmilia]=castActive(energyEmilia,'REZ-1-031');
 energyEmilia=dispatchUniversalAction(packs,energyEmilia,{type:'chooseRetireBp',uid:fromEnergy.uid});
 assert.equal(energyEmilia.pending.kind,'effect-hand-reenter-under');
 energyEmilia=dispatchUniversalAction(packs,energyEmilia,{type:'chooseHandReenterUnder',uid:null});
 assert.equal(energyEmilia.players[0].outside.some(c=>c.uid===fromEnergy.uid),true);

 let covered=five(8745);
 fuel(covered,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(covered,1,ramFuel);
 put(covered,0,'REZ-1-081','front',0);
 covered=reach(covered,'main');
 let already;
 [covered,already]=playFront(covered,'REZ-1-101');
 const prior=pull(covered,0,'REZ-1-008');
 prior.faceDown=true;prior.ready=false;prior.fieldEntryStamp=null;
 prior.stack=[];prior.under=[];prior.buffs=[];
 at(covered,0,already.uid).under=[prior];
 covered=untilPhase(packs,covered,1,'main');
 [covered]=castActive(covered,'REZ-1-031');
 covered=dispatchUniversalAction(packs,covered,{type:'chooseRetireBp',uid:already.uid});
 assert.equal(covered.pending,null);
 assert.equal(covered.players[0].outside.some(c=>c.uid===already.uid),true);
 assert.equal(covered.players[0].outside.some(c=>c.uid===prior.uid),true);

 let crowded=five(8746);
 fuel(crowded,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(crowded,1,ramFuel);
 const firstEmilia=put(crowded,0,'REZ-1-081','front',0);
 const secondEmilia=put(crowded,0,'REZ-1-081','front',1);
 put(crowded,0,'REZ-1-007','front',2);
 crowded=reach(crowded,'main');
 let crowdedSubaru;
 [crowded,crowdedSubaru]=playFront(crowded,'REZ-1-101');
 crowded=untilPhase(packs,crowded,1,'main');
 [crowded]=castActive(crowded,'REZ-1-031');
 crowded=dispatchUniversalAction(packs,crowded,{type:'chooseRetireBp',uid:crowdedSubaru.uid});
 assert.equal(crowded.pending.kind,'effect-hand-reenter-under');
 const hole=crowded.players[0].front.findIndex(c=>!c);
 put(crowded,0,'REZ-1-012', 'front', hole);
 const tucked=crowded.players[0].hand[0];
 const replaced=legalUniversalActions(packs,crowded).find(a=>a.type==='chooseHandReenterUnder'&&
  a.uid===tucked.uid&&a.replaceUid===firstEmilia.uid);
 crowded=dispatchUniversalAction(packs,crowded,replaced);
 assert.equal(crowded.pending,null);
 assert.equal(crowded.players[0].removed.some(c=>c.uid===firstEmilia.uid),true);
 assert.equal(crowded.players[0].front.some(c=>c?.uid===secondEmilia.uid),true);
 assert.equal(at(crowded,0,crowdedSubaru.uid).under[0].uid,tucked.uid);
 assert.equal(at(crowded,0,crowdedSubaru.uid).under[0].faceDown,true);
 assert.ok(crowded.zoneMoveEvents.some(e=>e.uid===firstEmilia.uid&&e.to==='removed'&&e.reason==='rule'));

 let only=five(8747);
 fuel(only,['REZ-1-016','REZ-1-016','REZ-1-016']);
 lineEnergy(only,1,ramFuel);
 const sole=put(only,0,'REZ-1-081','front',0);
 put(only,0,'REZ-1-007','front',1);
 put(only,0,'REZ-1-012','front',2);
 only=reach(only,'main');
 let onlySubaru;
 [only,onlySubaru]=playFront(only,'REZ-1-101');
 only=untilPhase(packs,only,1,'main');
 [only]=castActive(only,'REZ-1-031');
 only=dispatchUniversalAction(packs,only,{type:'chooseRetireBp',uid:onlySubaru.uid});
 const opened=only.players[0].front.findIndex(c=>!c);
 put(only,0,'REZ-1-008','front',opened);
 const payment=only.players[0].hand[0];
 const illegal=legalUniversalActions(packs,only).find(a=>a.type==='chooseHandReenterUnder'&&
  a.uid===payment.uid&&a.replaceUid===sole.uid);
 assert.ok(illegal);
 assert.throws(()=>dispatchUniversalAction(packs,only,illegal),/Emilia left/);
 assert.equal(only.pending.kind,'effect-hand-reenter-under');
 assert.equal(only.players[0].front.some(c=>c?.uid===sole.uid),true);
 only=dispatchUniversalAction(packs,only,{type:'chooseHandReenterUnder',uid:null});
 assert.equal(only.players[0].outside.some(c=>c.uid===onlySubaru.uid),true);
 assert.equal(assertUniversalMatch(packs,live),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,bareHand),true);
 assert.equal(assertUniversalMatch(packs,unnamed),true);
 assert.equal(assertUniversalMatch(packs,energyEmilia),true);
 assert.equal(assertUniversalMatch(packs,covered),true);
 assert.equal(assertUniversalMatch(packs,crowded),true);
 assert.equal(assertUniversalMatch(packs,only),true);
});
