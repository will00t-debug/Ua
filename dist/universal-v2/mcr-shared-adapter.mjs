// Macross -> Universal V2 adapter. Shared ability DSL only.
// Title data is converted here. There is no second Macross effects engine.
import {createUniversalPack} from './pack.mjs?v=20261125mcr11';
import {mcrSharedProgram} from './mcr/programs.mjs?v=20261125mcr11';

const SHARED_KEYS=new Set([
 'ready','implementation','effects','mainAbility','activeExtraEnergy','impactNull',
 'opponentFieldColorsHandEnergyDiscount','ownTurnBp','triggerEffect',
 'battleLoseToHand','attackWinDraw','passiveBonuses','step','enterAlwaysActive',
 'emptyOwnFieldHandEnergyDiscount','playRequiresFrontName','raidName',
 'unblockedAttack','playRequiresNameIncludes','raidOnlyEntry','printedImpact',
 'allyRaidAttackEnd','attackEndRetireSelfThen','handApDiscountWhileNameIncludes',
 'handApDiscountWhileFrontNameIncludes','substituteOppRetire','outsideNameLeaveToHand',
 'raidHandApDiscount','effectDrawActive','attackEndMayRetire','raidLeaveWatch',
 'oppCharacterChooseImmune','mayReduceDamageToOne','battleLoseToOppDeckBottom',
 'rewriteBasaraHandLoss','playMinLiveBp','raidImpactNull','phaseEffects'
]);
const PRINT_TYPES=new Set(['character','event','field']);
const COLORS=new Set(['yellow','blue','red','purple']);
// Audited slash traits. The printed string stays one token. Components are
// the affinities the official feature text names separately.
const TRAIT_COMPONENTS=Object.freeze({
 'S.M.S／スカル小隊':Object.freeze(['S.M.S','スカル小隊']),
 'S.M.S／ピクシー小隊':Object.freeze(['S.M.S','ピクシー小隊']),
 'S.M.S／F形態':Object.freeze(['S.M.S','F形態']),
 'S.M.S／スカル小隊／B形態':Object.freeze(['S.M.S','スカル小隊','B形態']),
 'S.M.S／スカル小隊／F形態':Object.freeze(['S.M.S','スカル小隊','F形態']),
 'ウィンダミア王国／空中騎士団／B形態':Object.freeze(['ウィンダミア王国','空中騎士団','B形態']),
 'ウィンダミア王国／空中騎士団／G形態':Object.freeze(['ウィンダミア王国','空中騎士団','G形態']),
 'ケイオス／Δ小隊':Object.freeze(['ケイオス','Δ小隊']),
 'ケイオス／Δ小隊／B形態':Object.freeze(['ケイオス','Δ小隊','B形態']),
 'ケイオス／Δ小隊／F形態':Object.freeze(['ケイオス','Δ小隊','F形態']),
 'ケイオス／ワルキューレ':Object.freeze(['ケイオス','ワルキューレ']),
 '歌（シェリル）／歌（ランカ）':Object.freeze(['歌（シェリル）','歌（ランカ）']),
 '新統合軍／ダイアモンドフォース':Object.freeze(['新統合軍','ダイアモンドフォース'])
});

export function mcrSharedCard(card,program=mcrSharedProgram(card)){
 if(program?.ready!==true)return null;
 if(!card||card.title!=='mcr'||card.deckLegal!==true||card.battleReady!==false||
  card.cardDataVerified!==false)
  throw Error((card?.id||'unknown')+' source catalog must not claim battle readiness');
 if(!PRINT_TYPES.has(card.type)||!COLORS.has(card.color))
  throw Error(card.id+' invalid source type or color');
 if(typeof card.nameJa!=='string'||!card.nameJa.trim()||
  typeof card.effectJa!=='string'||!card.effectJa||
  !card.source?.startsWith('https://www.unionarena-tcg.com/jp/cardlist/'))
  throw Error(card.id+' requires the official Japanese printed card');
 if(program.implementation!=='vanilla'&&program.implementation!=='dsl')
  throw Error(card.id+' must provide Universal V2 DSL or vanilla');
 const printed=card.effectJa!=='-'&&card.effectJa!=='';
 if(!printed&&program.implementation!=='vanilla')
  throw Error(card.id+' no-effect print must use vanilla');
 if(printed&&program.implementation==='vanilla')
  throw Error(card.id+' printed effects cannot be vanilla');
 for(const key of Object.keys(program)){
  if(!SHARED_KEYS.has(key))throw Error(card.id+' unsupported Macross program field '+key);
 }
 const {ready,implementation,...shared}=program;
 const traits=[...(card.traits||[])];
 const parts=traits.length===1?TRAIT_COMPONENTS[traits[0]]:undefined;
 return Object.freeze({
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits,...(parts?{traitComponents:[...parts]}:{}),implementation,effects:{},...shared
 });
}

export function createMcrSharedStagingPack({cards,version}){
 if(!Array.isArray(cards)||typeof version!=='string')
  throw Error('Macross staging requires source cards and a version');
 const seen=new Set();
 const ready=[];
 for(const card of cards){
  if(seen.has(card.id))throw Error('Duplicate Macross numbered card '+card.id);
  seen.add(card.id);
  const compiled=mcrSharedCard(card);
  if(compiled)ready.push(compiled);
 }
 if(!ready.length)throw Error('No verified Macross programs');
 return createUniversalPack({id:'mcr',version,cards:ready});
}
