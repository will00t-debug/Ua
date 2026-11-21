// Whole-print classifier for 〈物語〉系列 Vol.2 / EX18BT.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Raid-frame text is not registered until the Rugia HK span.raidBorder split
// is listed in raid-box.mjs. This file does not import the engine. There is
// no monogatari opcode.
import {mgsKnownTrigger,mgsProfile} from './mgs-classify.mjs';

const KISS='キスショット・アセロラオリオン・ハートアンダーブレード';
const IMPACT_PLAIN='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）';
const open={allowTrigger:true};

function extra(card,effect){
 if(effect==='【登場時】自分の場に〈千石撫子〉がある場合、カードを1枚引く。')
  return {kind:'drawIfNadeko',...open,program:{effects:{onPlay:[{op:'drawIfOwnName',name:'千石撫子',count:1}]}}};
 if(effect===IMPACT_PLAIN+'【登場時】自分の場に〈'+KISS+'〉がある場合、カードを1枚引く。')
  return {kind:'impactDrawKiss',...open,program:{effects:{onPlay:[{op:'drawIfOwnName',name:KISS,count:1}]},impactNull:true}};
 if(effect==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【緑×2】減らす。'&&
  card.color==='green'&&card.energy>=2)
  return {kind:'emptyGreen',...open,program:{effects:{},emptyOwnFieldHandEnergyDiscount:2}};
 if(effect===IMPACT_PLAIN+'【退場時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return {kind:'impactRetireDraw',...open,program:{effects:{onRetire:[{op:'drawDiscard',count:1}]},impactNull:true}};
 if(effect==='【退場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。')
  return {kind:'retireBuff',...open,program:{effects:{onRetire:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:false}]}}};
 if(effect==='【登場時】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚まで自分の場にレストで登場させる。')
  return {kind:'greenRest',...open,program:{effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'green',energy:2,ap:1,max:1}]}}};
 return null;
}

export function mgs2Profile(card){
 const shared=mgsProfile(card);
 if(shared)return shared;
 const gate=mgsKnownTrigger(card);
 if(!gate||gate.triggerEffect)return null;
 if(card?.raidFrame)return null;
 return extra(card,String(card?.effectJa||''));
}

export function mgs2EngineKind(card){
 return mgs2Profile(card)?.kind||null;
}
