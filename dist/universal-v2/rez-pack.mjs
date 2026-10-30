// EX17BT Re:Zero Vol.2 on the shared universal V2 engine.
// Only cards whose entire printed body is covered are registered.
// Japanese nameJa is the rules identity. This pack is not part of the
// five-title 700-card census, and auto stays false in the catalogue.
// Batches 25–34 add the printed bodies for 003, 006, 008, 013, 023, 026, 038, 044, 068 and 070.
// Batches 35–44 add 007, 019, 021, 027, 051, 053, 057, 069, 072 and 073.
// Batch 45 adds 010 and 011: a name-locked hand AP discount, scaled by
// outside events for Emilia and armed by an all-Rem bounce for Rem.
// Batch 51 adds 054: look at one top card per distinct green printed name,
// add up to one character of energy 5 or less, bottom the rest and discard,
// or give up to two other characters BP+500.
// Batch 53 adds 058: Raid Emilia, this-turn double attack and selection
// immunity, once-per-turn attack BP+1000, and an attack-end rest of one
// own front ACTIVE character with printed BP 2500 to set her ACTIVE.
// Batch 54 adds 062: Raid Felt. On play, draw one or activate up to one
// other character. Front once per turn: until next own start, BP+1000 and
// characters of BP 4000 or more cannot block her; or grant one other
// character front-line energy generation this turn.
// Batch 60 adds 032: a facedown under-card gives BP+500, Impact null, and a
// BP 500 leave replacement that sends one under-card outside. On play, if
// Priscilla is on the field, one other character who is neither Priscilla
// nor Al may retire; only that card goes facedown underneath, then this
// character becomes active. Q2411 leaves Raid subordinates outside. Q2412
// lets only the controller see those facedown cards.
// Batch 59 adds 030: on play, up to one own character with a trait cannot
// attack this turn and moves to the other line. Q2410 removes one card
// when that line is full. The main rests one active front character only
// on the turn this character entered, then lowers one enemy front of
// BP 2000 or more by 1500, or raises one other own character by 2000.
// Batch 58 adds 018: a name-locked onPlay choice shared by the printed
// name レム. One branch rests a blue energy-0 Subaru from outside and
// retires that entry when this main phase ends. The other grants one
// field copy a this-turn ready that applies only if that character is
// still present after losing a battle.
// Batch 57 adds 025: this-turn player aura that taxes an effect choosing
// a field Subaru, then either draw if Subaru is on the field or ready
// one AP at this turn's attack-phase start. Q2409.
// Batch 56 adds 024: empty-field purple energy −2, and a once-per-turn
// main that pays 1 AP, puts one hand card on top of the deck, then
// gives this character BP+2000 and readies one AP at attack-phase start.
// Batch 55 adds 047: printed Impact 1, a per-card front draw, and a
// name-shared front main that puts one green hand card outside and may
// activate that card's existing trigger. Q2418 shares the second main.
// Batch 49 adds 039: COLOR may use printed BP 2500 instead of energy 2,
// and onPlay rests one other green printed-BP 2500 character, then actives
// that character or this one. Q2414 is an OR. Q2415 uses the printed BP.
import {REZERO_VOL2_BY_ID} from '../rezero-vol2.mjs';
import {createUniversalPack} from './pack.mjs';

const REM_OR_ROSWAAL={
 kind:'ownAnyNameExists',turn:'own',zone:'field',excludeSelf:false,
 names:['レム','ロズワール・L・メイザース']
};
const BELOW_PRINTED={kind:'oppFrontCurrentBpBelowPrinted',turn:'own'};

const ANASTASIA_OR_FOUR_GREEN={
 kind:'ownNameOrDistinctPrintedColorNames',turn:'own',zone:'field',
 name:'アナスタシア・ホーシン',color:'green',min:4
};

function shell(id){
 const printed=REZERO_VOL2_BY_ID[id];
 if(!printed)throw Error('Missing EX17BT catalogue card '+id);
 return {
  id,name:printed.nameJa,color:printed.color,type:printed.type,
  energy:printed.energy,ap:printed.ap,bp:printed.bp??0,gen:printed.gen,
  traits:[...printed.traits],trigger:printed.trigger,maxCopies:printed.maxCopies
 };
}

const PROFILES={
 'REZ-2-014':{implementation:'vanilla',effects:{}},
 'REZ-2-015':{implementation:'dsl',effects:{onAttack:[
  {op:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]}},
 'REZ-2-031':{implementation:'dsl',effects:{onPlay:[
  {op:'draw',count:1},
  {op:'recoverOutsideOne',filter:{field:'name',value:'ベアトリス'},optional:true}]}},
 'REZ-2-033':{implementation:'dsl',effects:{},activeExtraEnergy:1},
 'REZ-2-035':{implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2},
 'REZ-2-040':{implementation:'dsl',effects:{onRetire:[
  {op:'restOppFrontBpAtLeast',bp:4500,optional:true}]}},
 'REZ-2-041':{implementation:'dsl',effects:{},nameAliases:['シルフィ']},
 'REZ-2-042':{implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2,impactNull:true},
 'REZ-2-043':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{...ANASTASIA_OR_FOUR_GREEN},bp:1500}]},
 'REZ-2-046':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-049':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{...ANASTASIA_OR_FOUR_GREEN},bp:1000}]},
 'REZ-2-050':{implementation:'dsl',templateEffects:{onPlay:[{template:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}},
 'REZ-2-055':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-056':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-059':{implementation:'dsl',templateEffects:{onPlay:[
  {template:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]}},
 'REZ-2-060':{implementation:'dsl',effects:{},opponentTurnBp:-1500},
 'REZ-2-063':{implementation:'vanilla',effects:{}},
 'REZ-2-066':{implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:1}]}},
 'REZ-2-067':{implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]}},
 'REZ-2-071':{implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]}},
 'REZ-2-004':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{...BELOW_PRINTED},bp:1500}]},
 'REZ-2-005':{implementation:'dsl',effects:{},impactNull:true,passiveBonuses:[
  {condition:{...REM_OR_ROSWAAL,names:[...REM_OR_ROSWAAL.names]},bp:1000}]},
 'REZ-2-009':{implementation:'dsl',effects:{onPlay:[{op:'peekTopOne'}]},
  emptyOwnFieldHandEnergyDiscount:2},
 'REZ-2-017':{implementation:'dsl',effects:{onPlay:[
  {op:'inspectTopNamesOutside',count:2,rest:'top',max:1,
   names:['ナツキ・スバル','レム']}]}},
 'REZ-2-022':{implementation:'dsl',effects:{onPlay:[
  {op:'inspectTopNamesOutside',count:2,rest:'top',max:1,
   names:['ナツキ・スバル','ベアトリス','禁書庫']}]}},
 'REZ-2-045':{implementation:'dsl',effects:{onRetire:[
  {op:'drawIfNameOrDistinctColorNames',name:'アナスタシア・ホーシン',
   color:'green',min:4,count:1}]}},
 'REZ-2-048':{implementation:'dsl',effects:{onPlay:[
  {op:'bounceOwnOtherUnderEnergy',energy:1}]}},
 'REZ-2-061':{implementation:'dsl',effects:{onPlay:[
  {op:'buffOwnField',filter:{field:'bp',value:2500},bp:1500,
   optional:true,excludeSelf:false}]}},
 'REZ-2-002':{implementation:'dsl',effects:{onPlay:[
  {op:'activeSelfIf',line:'energy',when:{kind:'ownEventUsedThisTurn',turn:'own'}}]},
  mainAbility:{op:'restSelfBuffOther',bp:1000}},
 'REZ-2-028':{implementation:'dsl',effects:{},templateEffects:{onPlay:[
  {template:'drawIfOwnTraitCount',trait:'魔女',zone:'field',excludeSelf:false,min:1,count:1}]},
  mainAbility:{op:'discardHandGainEnergy',oncePerTurn:true,discardCount:1,extraEnergy:1}},
 'REZ-2-029':{implementation:'dsl',effects:{},templateEffects:{onPlay:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'peekTopOrBottom'},{template:'draw',count:1}]}]}},
 'REZ-2-034':{implementation:'dsl',effects:{},attackWinDraw:{count:1,condition:{
  kind:'ownDistinctPrintedColorNames',turn:'any',zone:'field',color:'green',min:4}}},
 'REZ-2-036':{implementation:'dsl',effects:{},mainAbility:{
  op:'frontOnceActiveNamed',frontOnly:true,oncePerTurn:true,name:'リリアナ・マスカレード'}},
 'REZ-2-037':{implementation:'dsl',effects:{onPlay:[
  {op:'buffOwnOthersUpTo',bp:500,count:1,upgradeName:'プリシラ・バーリエル',upgradeCount:2}]}},
 'REZ-2-052':{implementation:'dsl',effects:{},mainAbility:{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}},
 'REZ-2-064':{implementation:'dsl',triggerEffect:{
  op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},effects:{onPlay:[
  {op:'inspectTopArrange',count:2,toOutside:true,rest:'top',
   whenDistinct:{color:'green',min:4,count:4}}]}},
 'REZ-2-003':{implementation:'dsl',effects:{onPlay:[{op:'chooseOne',optional:false,options:[
  {id:'drawDiscard',label:'抽1張，並將1張手牌放到場外',turn:'any',
   then:[{op:'drawDiscard',count:1}]},
  {id:'subaru',label:'從場外將最多1張黃色菜月昴加入手牌',turn:'any',then:[
   {op:'recoverOutsideNameColor',name:'ナツキ・スバル',color:'yellow',optional:true}]}]}]}},
 'REZ-2-006':{implementation:'dsl',effects:{
  onPlay:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'front'}],
  onAttack:[{op:'chooseOneIfBelowPrinted',options:[
   {id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]},
   {id:'buff',label:'此角色本回合BP+1000',turn:'any',then:[{op:'buffSelf',bp:1000}]}]}]}},
 'REZ-2-008':{implementation:'dsl',effects:{onPlay:[
  {op:'drawDiscardOrDrawIfBelowPrinted',count:1}]}},
 'REZ-2-013':{implementation:'dsl',effects:{},impactNull:true,mainAbility:{
  op:'onceActiveSelfGate',oncePerTurn:true,requiresName:'クルシュ・カルステン',
  selfBp:5000,oppFrontBp:4500}},
 'REZ-2-023':{implementation:'dsl',effects:{
  onPlay:[{op:'activeSelf'},{op:'banSelfAttackThisTurn'}],
  onRetire:[{op:'discardGate',optional:true,then:[
   {op:'deployOutsideNameColorEnergy',name:'エミリア',color:'purple',
    maxEnergy:0,line:'energy',optional:true}]}]}},
 'REZ-2-026':{implementation:'dsl',effects:{},mainAbility:{
  op:'restRetireRecoverPlainEvent',names:['エキドナ','ベアトリス'],
  color:'purple',maxEnergy:3}},
 'REZ-2-038':{implementation:'dsl',effects:{onPlay:[
  {op:'deployOwnHandFreshName',type:'character',color:'green',energy:3,ap:1,max:1}]}},
 'REZ-2-044':{implementation:'dsl',effects:{},mainAbility:{
  op:'onceChooseProgram',oncePerTurn:true,when:{...ANASTASIA_OR_FOUR_GREEN},
  then:[{op:'chooseOne',optional:false,options:[
   {id:'attackDraw',label:'攻擊時抽1張',turn:'any',then:[{op:'grantSelfAttackDrawThisTurn'}]},
   {id:'buff',label:'本回合BP+500',turn:'any',then:[{op:'buffSelf',bp:500}]}]}]}},
 'REZ-2-068':{implementation:'dsl',effects:{onPlay:[
  {op:'grantNamedReadyOnAttack',name:'エミリア'}]}},
 'REZ-2-070':{implementation:'dsl',effects:{onPlay:[
  {op:'grantNamedBuffSniper',name:'ガーフィール・ティンゼル',bp:3000}]}},
 'REZ-2-007':{implementation:'dsl',effects:{onRaided:[
  {op:'drawIfAllOwnFieldNamed',name:'レム',count:1}]}},
 'REZ-2-019':{implementation:'dsl',effects:{},mainAbility:{
  op:'onceGrantBlockImpact',oncePerTurn:true,minBp:5000}},
 'REZ-2-021':{implementation:'dsl',playRequiresAllNames:['ナツキ・スバル','レム'],
 triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontUnderBp',bp:5000},
  {op:'buffEnergyNamedIfRaidedFront',name:'ナツキ・スバル',raidedName:'レム',
   energy:0,bp:1500,optional:true}]}},
 'REZ-2-027':{implementation:'dsl',effects:{},mainAbility:{
  op:'onceActiveIfOwnEffectRested',oncePerTurn:true,frontOnly:true}},
 'REZ-2-051':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{kind:'ownDistinctPrintedColorNames',turn:'any',zone:'field',color:'green',min:4},
   extraEnergy:1}],mainAbility:{op:'characterDualMain',
  active:{op:'energyOnceActiveIfKinds',oncePerTurn:true,energyOnly:true,color:'green',min:6},
  rest:{op:'restSelfBuffOther',bp:500}}},
 'REZ-2-053':{implementation:'dsl',effects:{},frontForbidden:true,mainAbility:{
  op:'onceDiscardDrawIfEntered',oncePerTurn:true,name:'ナツキ・スバル',discard:1,draw:1}},
 'REZ-2-057':{implementation:'dsl',effects:{onPlay:[
  {op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'エミリア'},
   {field:'name',value:'水門都市 プリステラ'},
   {field:'printedBp',value:2500}]}]}},
 'REZ-2-069':{implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'chooseOne',optional:false,options:[
   {id:'oneAp2',label:'場外最多1張原本BP2500、AP2的綠色角色以REST登場',turn:'any',then:[
    {op:'deployOutsidePrinted',color:'green',printedBp:2500,ap:2,max:1,ready:false}]},
   {id:'twoAp1',label:'場外最多2張原本BP2500、AP1的綠色角色以REST登場',turn:'any',then:[
    {op:'deployOutsidePrinted',color:'green',printedBp:2500,ap:1,max:2,ready:false}]}]}]}},
 'REZ-2-072':{implementation:'dsl',playRequiresOwnName:'プリシラ・バーリエル',
 triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontUnderBp',bp:5000},
  {op:'buffOwnIfAbovePrinted',min:4,bp:1000,optional:true}]}},
 'REZ-2-010':{implementation:'dsl',effects:{onPlay:[
  {op:'allNamedEnergyBounce',name:'レム',maxEnergy:3,once:'name',
   discountName:'レム',discountNoRaid:true}]}},
 'REZ-2-011':{implementation:'dsl',step:true,effects:{onPlay:[
  {op:'nextScaledEventApDiscount',once:'name',cardType:'event',
   baseEnergy:1,perOutsideEvents:2}]}},
 'REZ-2-012':{implementation:'dsl',playRequiresOwnName:'エミリア',
  outsideEventHandEnergyDiscount:{min:4,amount:1},effects:{onPlay:[
  {op:'draw',count:2},
  {op:'deployOwnHandSpecial',type:'character',color:'yellow',ap:1,trait:null,
   maxEnergy:3,ready:true,max:1,protectionScope:null,name:'ナツキ・スバル'},
  {op:'buffOwnField',filter:{field:'name',value:'ナツキ・スバル'},bp:1000,
   optional:true,excludeSelf:false}]}},
 'REZ-2-001':{implementation:'dsl',alsoEvent:true,effects:{},mainAbility:{
  op:'energyRestRetireThen',then:[{op:'deployOutsideNameColorEnergy',name:'エミリア',
   color:'yellow',maxEnergy:0,line:'energy',optional:true}]}},
 'REZ-2-039':{implementation:'dsl',impactNull:true,
  triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1,
   alternatePrintedBp:2500},effects:{onPlay:[
  {op:'deployOutsidePrintedExcept',color:'green',printedBp:2500,
   excludeName:'ナツキ・スバル',optional:true}]}},
 'REZ-2-016':{implementation:'dsl',effects:{onPlay:[
  {op:'activeSelfIf',line:'energy',when:{kind:'ownNameExists',turn:'any',zone:'field',
   excludeSelf:false,name:'クルシュ・カルステン'}}]},
 mainAbility:{op:'restSelfChoose',then:[{op:'chooseOne',optional:false,options:[
  {id:'buff',label:'其他1張角色本回合BP+1000',turn:'any',then:[
   {op:'buffAnyCharacter',bp:1000,optional:false,excludeSelf:true}]},
  {id:'bottom',label:'公開1張手牌並放到牌庫底',turn:'any',then:[
   {op:'revealHandBottom',thenBuffBp:2000,thenBuffOptional:true,
    excludeSelf:true,drawIfPrintedBp:4000}]}]}]}},
 'REZ-2-020':{implementation:'dsl',frontForbidden:true,effects:{onRaided:[
  {op:'draw',count:1}]},moveTriggers:[{
  when:{from:'hand',to:'deck',reasons:['own-effect'],deckPosition:'bottom',revealed:true},
  then:[{op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:false}]}]},
 'REZ-2-073':{implementation:'dsl',triggerEffect:{op:'retireOppFront'},
 effects:{onPlay:[{op:'retireOppFrontOne'}]},moveTriggers:[
  {when:{from:'hand',to:'outside',reasons:['own-effect'],sourceOnField:true,
   sourceName:'ラインハルト・ヴァン・アストレア',sourceColor:'green'},
   then:[{op:'activeOwnNamed',name:'ラインハルト・ヴァン・アストレア',max:1,optional:true}]}]},
 'REZ-2-065':{implementation:'dsl',raidName:'プリシラ・バーリエル',raidOwnTurnBp:1000,
  effects:{onAttack:[{op:'draw',count:1}]},
  mainAbility:{op:'onceAbovePrintedKeywords',oncePerTurn:true,
   damageAt:3,damage:2,impactAt:5,impact:1}},
 'REZ-2-054':{implementation:'dsl',effects:{onPlay:[{op:'chooseOne',optional:false,options:[
  {id:'kinds',label:'依綠色角色種類查看牌頂',turn:'any',then:[
   {op:'searchTopDistinctBottomDiscard',color:'green',maxEnergy:5}]},
  {id:'buff',label:'其他最多2張角色本回合BP+500',turn:'any',then:[
   {op:'buffOwnOthersFixed',bp:500,count:2}]}]}]}},
 'REZ-2-058':{implementation:'dsl',raidName:'エミリア',attackEndRestPrintedBp:2500,
  effects:{
   onPlay:[
    {op:'grantSelfDoubleAttackThisTurn'},
    {op:'grantSelfUnchosenThisTurn'}],
   onAttack:[{op:'oncePerTurnGate',scope:'card',optional:false,then:[{op:'buffSelf',bp:1000}]}]
  }},
 'REZ-2-062':{implementation:'dsl',raidName:'フェルト',effects:{onPlay:[
  {op:'chooseOne',optional:false,options:[
   {id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]},
   {id:'active',label:'使其他最多1張角色轉為ACTIVE',turn:'any',then:[
    {op:'activeOwnOther',optional:true}]}]}]},
  mainAbility:{op:'onceFrontChoose',oncePerTurn:true,frontOnly:true,then:[
   {op:'chooseOne',optional:false,options:[
    {id:'keywords',label:'直到下回合開始，BP+1000且不被BP4000以上阻擋',turn:'any',then:[
     {op:'buffSelfUntilNextOwnStart',bp:1000},
     {op:'grantSelfBlockAtLeastUntilNextOwnStart',bp:4000}]},
    {id:'energy',label:'其他1張角色本回合在前線也產生能源',turn:'any',then:[
     {op:'grantOtherFieldFrontEnergyThisTurn',optional:false}]}]}]}},
 'REZ-2-047':{implementation:'dsl',printedImpact:1,effects:{},
  mainAbility:{op:'frontDrawOrHandTrigger',frontOnly:true,drawOnce:'card',
   triggerOnce:'name',handColor:'green'}},
 'REZ-2-024':{implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2,
  mainAbility:{op:'payApHandTopBuffAttackAp',oncePerTurn:true,payAp:1,
   bp:2000,recoverAp:1}},
 'REZ-2-025':{implementation:'dsl',effects:{onPlay:[
  {op:'grantSubaruHandTaxThisTurn'},
  {op:'chooseOne',optional:false,options:[
   {id:'draw',label:'場上有菜月昴就抽1張',turn:'any',then:[
    {op:'drawIfOwnName',name:'ナツキ・スバル',count:1}]},
   {id:'ap',label:'攻擊階段開始時啟動1張AP卡',turn:'any',then:[
    {op:'scheduleAttackStartAp',count:1}]}]}]}},
 'REZ-2-018':{implementation:'dsl',effects:{onPlay:[
  {op:'chooseOne',optional:false,nameLock:'レム',options:[
   {id:'enter',label:'場外需求能源0的藍色菜月昴以REST登場',turn:'any',then:[
    {op:'deployOutsideNamedRestRetireEnd',name:'ナツキ・スバル',color:'blue',
     maxEnergy:0,optional:true}]},
   {id:'lose',label:'場上需求能源0的藍色菜月昴戰鬥落敗時轉為ACTIVE',turn:'any',then:[
    {op:'grantNamedLoseBattleReady',name:'ナツキ・スバル',color:'blue',
     maxEnergy:0,optional:true}]}]}]}}
,
 'REZ-2-030':{implementation:'dsl',effects:{onPlay:[
  {op:'noteEntryTurn'},
  {op:'banAttackMoveOtherLine',optional:true}]},
 mainAbility:{op:'entryTurnRestFrontChoose',oncePerTurn:true,then:[
  {op:'chooseOne',optional:false,options:[
   {id:'down',label:'對手前線BP2000以上，本回合BP-1500',turn:'any',then:[
    {op:'enemyBpDown',bp:1500,optional:true,minBp:2000,zone:'front'}]},
   {id:'up',label:'其他最多1張角色本回合BP+2000',turn:'any',then:[
    {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,
     optional:true,excludeSelf:true}]}]}]}}
,
 'REZ-2-032':{implementation:'dsl',
  facedownUnderStanding:{bp:500,impactNull:true,leaveReplacementMinBp:500},
  effects:{onPlay:[
   {op:'optionalRetireExceptNamesTuckActive',optional:true,
    requiresName:'プリシラ・バーリエル',
    exceptNames:['プリシラ・バーリエル','アル']}]}}
};

export const REZ_V2_IMPLEMENTED_IDS=Object.freeze(Object.keys(PROFILES));

export function rezV2RawCards(){
 return REZ_V2_IMPLEMENTED_IDS.map(id=>({...shell(id),...PROFILES[id]}));
}
export function createRezV2Pack(){
 return createUniversalPack({id:'rezero',version:'0.27.0',cards:rezV2RawCards()});
}
