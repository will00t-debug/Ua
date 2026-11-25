// Labels for legal MAIN activations. The text follows the printed ability
// parameters on the pack card. A Traditional Chinese catalogue clause is used
// only when it still contains those parameters, so two cards that share a mode
// do not inherit each other's effect.
import {universalBp} from './engine.mjs';
import {cardHasName} from './field-conditions.mjs';
import {cleanCardEffectText} from '../card-effect-display.mjs';
import {TITLES} from '../title-registry.mjs';

const COLOR={yellow:'黃',blue:'藍',green:'綠',red:'紅',purple:'紫',white:'白',black:'黑'};
const BY_ID=new Map();
const NAME_ZH=new Map();
for(const title of TITLES){
 for(const card of title.cards||[]){
  if(card?.id)BY_ID.set(card.id,{title:title.label,titleId:title.id,name:card.name||'',effect:card.effect||''});
  if(card?.nameJa&&card?.name&&card.name!==card.nameJa&&/[\u4e00-\u9fff]/.test(card.name))
   NAME_ZH.set(card.nameJa,card.name);
 }
}
const BANNED=['完成這個選擇','選擇這個效果','發動主要能力','請參考卡面效果','請參考卡面','選擇第一項','選擇第二項','選擇第三項'];
const MARK=/【(?:主[啟起]動|主起動|[啟起]動主要)】|啟動・主要|起動・主要|另一個主要階段|另一啟動能力|(?:^|[\n。\s])主起動(?!】)|(?:^|[\n。])\s*(?:主要階段|主階段)(?!結束)/g;
const ENDER=/【(?:登場時|攻擊時|退場時|自己的回合中|自己回合中|對手回合中)】/g;

export function nameZh(name){
 if(typeof name!=='string'||!name)return '';
 return NAME_ZH.get(name)||name;
}
function usableChinese(text){
 if(typeof text!=='string'||!text.trim())return false;
 if(/【起動メイン】/.test(text)&&!/主[啟起]動|起動主要|主要階段|啟動主要|啟動・主要/.test(text))return false;
 const kana=(text.match(/[ぁ-んァ-ン]/g)||[]).length;
 const han=(text.match(/[\u4e00-\u9fff]/g)||[]).length;
 return han>=8&&han>=kana;
}
export function chineseMainClauses(effect){
 const text=cleanCardEffectText(effect);
 if(!usableChinese(text))return [];
 const starts=[];
 MARK.lastIndex=0;
 for(const match of text.matchAll(MARK))starts.push(match.index);
 if(!starts.length)return [];
 return starts.map((start,index)=>{
  let end=index+1<starts.length?starts[index+1]:text.length;
  ENDER.lastIndex=start+1;
  const cut=ENDER.exec(text);
  if(cut&&cut.index<end)end=cut.index;
  return text.slice(start,end).replace(/^[\n。\s]+/,'').trim();
 }).filter(clause=>usableChinese(clause)||/主[啟起]動|起動主要|主要階段|啟動/.test(clause));
}
function polish(text){
 let line=cleanCardEffectText(text);
 line=line.replace(/【主起動】/g,'【主啟動】');
 line=line.replace(/【(?:啟動主要|起動主要)】/g,'【主啟動】');
 line=line.replace(/\bACTIVE\b/g,'活動').replace(/\bREST\b/g,'休息');
 line=line.replace(/【每回合\s*[1１]\s*次?】/g,'【每回合一次】');
 line=line.replace(/每回合\s*[1１]\s*次/g,'【每回合一次】');
 line=line.replace(/獲得\s*(?:傷害|Damage)\s*([0-9０-９]+)/gi,'獲得【傷害（$1）】');
 line=line.replace(/獲得\s*(?:Impact|IMPACT|衝擊|貫通)\s*([0-9０-９]+)/gi,'獲得【貫通（$1）】');
 line=line.replace(/【衝擊（([0-9０-９]+)）】/g,'【貫通（$1）】');
 line=line.replace(/【衝擊無效】|Impact\s*無效|IMPACT\s*無效/gi,'【貫通無效】');
 line=line.replace(/【(?:二回阻擋|2次阻擋|兩次阻擋|二次阻擋|雙重阻擋|雙重防禦)】|(?:二回阻擋|2次阻擋|兩次阻擋|二次阻擋|雙重阻擋|雙重防禦)/g,'【二回阻擋】');
 line=line.replace(/\s+/g,' ').trim();
 if(!line.includes('【主啟動】'))line='【主啟動】'+line.replace(/^(?:啟動主要|起動主要|主要階段|主階段)\s*[・:：]?\s*/,'');
 return line;
}
function digitsOf(value){
 return [...String(value)].map(ch=>/[０-９]/.test(ch)?String(ch.charCodeAt(0)-0xff10):ch).join('');
}
function requiredNumbers(ability){
 const found=[];
 const walk=node=>{
  if(!node||typeof node!=='object')return;
  for(const [key,value] of Object.entries(node)){
   if(key==='op'||key==='id'||key==='label'||key==='turn'||key==='scope')continue;
   if(typeof value==='number'&&Number.isInteger(value)&&value>=100)found.push(value);
   else if(['damage','impact','damageAt','impactAt','min','amount','count','discard','discardCount','payAp','draw','extraEnergy','attackCap','outsideMin'].includes(key)&&
    Number.isInteger(value)&&value>1)found.push(value);
   else if(value&&typeof value==='object')walk(value);
  }
 };
 walk(ability);
 return [...new Set(found)];
}
function coversNumbers(text,ability){
 if(!ability)return true;
 const flat=digitsOf(text);
 return requiredNumbers(ability).every(n=>flat.includes(String(n)));
}
function locate(pack,state,uid){
 if(!pack||!state||typeof uid!=='string')return null;
 const owner=Number(uid.split('-')[0]);
 if(owner!==0&&owner!==1)return null;
 const player=state.players?.[owner];
 const source=Array.isArray(pack)?pack[owner]:pack;
 if(!player||!source?.cards)return null;
 const visit=entry=>{
  if(!entry)return null;
  if(entry.uid===uid)return entry;
  for(const layer of [...(entry.stack||[]),...(entry.under||[])]){
   const hit=visit(layer);
   if(hit)return hit;
  }
  return null;
 };
 const zones=[player.front,player.energy,player.hand,player.outside,player.removed,player.deck,player.life,player.lifeRevealed];
 for(const zone of zones){
  if(!Array.isArray(zone))continue;
  for(const card of zone){
   const hit=visit(card);
   if(hit)return {owner,physical:hit,printed:source.cards[hit.cardId]||null,source};
  }
 }
 return null;
}
function abilityFor(printed,action,pack,state){
 if(action?.gained){
  const source=locate(pack,state,action.gained);
  if(source?.printed?.mainAbility)return source.printed.mainAbility;
 }
 const listed=(printed?.printedMains||[]).find(mode=>mode?.id===action?.mode);
 if(listed)return listed;
 const ability=printed?.mainAbility;
 if(ability?.op==='characterDualMain'){
  if(action?.mode==='kindsActive')return ability.active||ability;
  if(action?.mode==='selfRestBuff')return ability.rest||ability;
 }
 return ability||null;
}
function qualifyingAbovePrinted(pack,state,uid){
 const found=locate(pack,state,uid);
 if(!found)return null;
 const player=state.players[found.owner];
 const cards=[...(player.front||[]),...(player.energy||[])].filter(Boolean);
 let count=0;
 try{
  for(const card of cards){
   const printed=found.source.cards[card.cardId];
   if(printed?.type!=='character')continue;
   if(universalBp(pack,state,card)>(printed.bp||0))count++;
  }
 }catch{return null;}
 return count;
}
const STEP={
 draw:s=>`抽 ${s.count||1} 張`,
 drawDiscard:s=>`抽 ${s.count||1} 張，再將 1 張手牌放到場外`,
 drawHandTop:()=>'抽 1 張，並將 1 張手牌放到牌組上面',
 millTop:s=>`將牌庫頂 ${s.count||1} 張放到場外`,
 peekTopOrBottom:()=>'查看牌庫頂 1 張，放回牌庫上面或下面',
 activeSelf:()=>'將此角色轉為活動',
 activeOwnOne:()=>'將 1 張己方角色轉為活動',
 activeOwnOther:()=>'將其他最多 1 張角色轉為活動',
 buffSelf:s=>`此角色本回合 BP＋${s.bp}`,
 buffSelfUntilNextOwnStart:s=>`直到下一個自己的回合開始，BP＋${s.bp}`,
 buffOwnField:s=>`${s.excludeSelf?'選擇其他角色':'選擇角色'}，本回合 BP＋${s.bp}`,
 buffAnyCharacter:s=>`${s.excludeSelf?'選擇其他 1 張角色':'選擇 1 張角色'}，本回合 BP＋${s.bp}`,
 buffEitherField:s=>`選擇最多 1 張場上角色，本回合 BP＋${s.bp||1000}`,
 enemyBpDown:s=>`選擇對手${s.zone==='front'?'前線':''} BP ${s.minBp||0} 以上的角色，本回合 BP－${s.bp}`,
 handTopBuffSelf:s=>`將 1 張手牌放到牌組上面，本回合 BP＋${s.bp}`,
 discountNextNamedHandEnergy:s=>`下一張從手牌使用的${nameZh(s.name)}，能源需求減少${COLOR[s.color]||''} ${s.amount}`,
 grantSelfFrontEnergyUntilNextOwnStart:()=>'直到下次自己的回合開始，此角色在前線也能產生能源',
 grantOtherFieldFrontEnergyThisTurn:()=>'選擇其他 1 張角色，本回合在前線也能產生能源',
 grantSelfBlockAtLeast:s=>`本回合不會被 BP ${s.bp} 以上的角色阻擋`,
 grantSelfBlockAtLeastUntilNextOwnStart:s=>`直到下一個自己的回合開始，不會被 BP ${s.bp} 以上的角色阻擋`,
 grantSelfImpactThisTurn:s=>`本回合獲得【貫通（${s.amount||s.impact||1}）】`,
 grantSelfAttackDamageThisTurn:s=>`本回合獲得【傷害（${s.amount||s.damage||2}）】`,
 grantSelfAttackDrawThisTurn:()=>'本回合攻擊時抽 1 張',
 grantSelfSniperThisTurn:()=>'本回合獲得【狙擊】',
 grantOtherImpactThisTurn:s=>`選擇其他角色，本回合獲得【貫通（${s.amount||s.impact||1}）】`,
 deployOutsideNameColorEnergy:s=>`可以從場外將最多 1 張需求能源 ${s.maxEnergy??0} 的${COLOR[s.color]||''}〈${nameZh(s.name)}〉以休息狀態登場到${s.line==='energy'?'能源線':'場上'}`,
 revealHandBottom:s=>`公開 1 張手牌並放到牌庫底${s.thenBuffBp?`，可以令其他角色本回合 BP＋${s.thenBuffBp}`:''}`,
 optionalPayApThen:s=>`可以支付 ${s.ap||1} AP`
};
function renderStep(step){
 if(!step||typeof step!=='object')return '';
 if(step.op==='chooseOne')return renderChoice(step);
 if(step.op==='oncePerTurnGate')return (step.then||[]).map(renderStep).filter(Boolean).join('，');
 if(step.op==='discardGate'){
  const nested=(step.then||[]).map(renderStep).filter(Boolean);
  return [`將 ${step.count||step.discard||1} 張手牌放到場外`,...nested].filter(Boolean).join('，');
 }
 if(step.op==='frontMillScaleBp')
  return `將牌庫頂 1 張放到場外，依該卡能源需求×${step.step||500} 提高自身 BP`;
 const known=STEP[step.op];
 if(known){
  const text=known(step);
  const more=(step.then||[]).map(renderStep).filter(Boolean);
  return [text,...more].filter(Boolean).join('，');
 }
 if(typeof step.label==='string'&&usableChinese(step.label))return step.label;
 const parts=[];
 if(Number.isInteger(step.bp))parts.push(`BP${step.bp>=0?'＋':'－'}${Math.abs(step.bp)}`);
 if(Number.isInteger(step.count)&&step.count>0)parts.push(`${step.count} 張`);
 if(Number.isInteger(step.draw))parts.push(`抽 ${step.draw} 張`);
 if(Number.isInteger(step.extraEnergy))parts.push(`產生能源＋${step.extraEnergy}`);
 if(Number.isInteger(step.impact))parts.push(`【貫通（${step.impact}）】`);
 if(Number.isInteger(step.damage))parts.push(`【傷害（${step.damage}）】`);
 return parts.join('，');
}
function renderChoice(node){
 if(node?.op!=='chooseOne'||!Array.isArray(node.options))return '';
 const options=node.options.map(option=>{
  const label=typeof option.label==='string'&&usableChinese(option.label)?option.label:'';
  const body=(option.then||[]).map(renderStep).filter(Boolean).join('，');
  return label||body;
 }).filter(Boolean);
 if(!options.length)return '';
 const must=node.optional===false?'必須選擇一項':'可以選擇一項';
 return must+'：'+options.join('；');
}
function renderSequence(list){
 if(!Array.isArray(list))return '';
 const choice=list.find(step=>step?.op==='chooseOne');
 if(choice)return renderChoice(choice);
 return list.map(renderStep).filter(Boolean).join('，然後');
}
function costWords(ability,action){
 const op=ability?.op||'';
 const mode=action?.mode||'';
 const words=[];
 if(ability?.payAp)words.push(`支付 ${ability.payAp} AP`);
 const discard=ability?.discardCount||ability?.discard||ability?.pay;
 if(Number.isInteger(discard)&&discard>0)words.push(`將 ${discard} 張手牌放到場外`);
 const rests=/^(restSelf|restRetire|restDiscard|restLeave|restPeek|restTuck|restBuff|restOnce|restFront|restNamed|restIf|restTwo|restUnion|fieldRest|gatedRest|readyOther)/.test(op)||
  /^(selfRest|rest|fieldMill|fieldTuck|fieldRelease|fieldOutside|restLeave|restPeek|restTuck)/.test(mode);
 if(rests&&!/readySelf|nameActive|cardOnceActive|kindsActive|abovePrinted|frontOnce|frontDraw|handTrigger/.test(op+mode))
  words.push('休息自身');
 if(/Retire/.test(op)&&!/RetireEnd|Recover|Sequence/.test(op))words.push('並使此卡退場');
 if(/RetireEnd/.test(op))words.push(ability?.end==='hand'?'主要階段結束時返回手牌':'主要階段結束時退場');
 return words;
}
function limitWords(ability,action){
 const words=[];
 const once=ability?.oncePerTurn||ability?.once==='turn'||ability?.once==='card'||ability?.drawOnce==='card';
 const mode=action?.mode||'';
 if(once||mode==='frontDraw'||mode==='abovePrinted'||mode==='handTopBuff')words.push('【每回合一次】');
 if(ability?.once==='name'||ability?.scope==='name'||ability?.triggerOnce==='name'||mode==='handTrigger')
  words.push('同名合計一次');
 return words;
}
function gateWords(ability){
 const words=[];
 if(ability?.frontOnly)words.push('僅限前線');
 if(ability?.energyOnly)words.push('僅限能源線');
 if(ability?.requiresName)words.push(`只有自己場上有〈${nameZh(ability.requiresName)}〉才能發動`);
 if(Array.isArray(ability?.requireAllNames)&&ability.requireAllNames.length)
  words.push('只有自己場上同時有'+ability.requireAllNames.map(name=>`〈${nameZh(name)}〉`).join('與')+'才能發動');
 if(ability?.requireOwnEffectRest)words.push('只有本回合此角色曾因自己的效果休息才能發動');
 if(Number.isInteger(ability?.minBp))words.push(`此角色 BP 在 ${ability.minBp} 以上才能發動`);
 if(Number.isInteger(ability?.minEnergy))words.push(`產生能源在 ${ability.minEnergy} 以上才能發動`);
 if(ability?.when?.kind==='ownEventUsedThisTurn')words.push('只有本回合已使用事件才能發動');
 if(ability?.when?.kind==='ownTraitUsedThisTurn')words.push(`只有本回合已使用過特徵「${ability.when.trait}」才能發動`);
 return words;
}
function effectWords(ability,action){
 const op=ability?.op||'';
 const mode=action?.mode||'';
 const bp=Number.isInteger(ability?.bp)?ability.bp:null;
 const energy=ability?.extraEnergy;
 const named=name=>name?`〈${nameZh(name)}〉`:'';
 if(op==='onceAbovePrintedKeywords'||mode==='abovePrinted')
  return `依自己場上 BP 高於原本 BP 的角色數量，此角色本回合獲得全部符合的效果：${ability?.damageAt??3} 張以上獲得【傷害（${ability?.damage??2}）】；${ability?.impactAt??5} 張以上再獲得【貫通（${ability?.impact??1}）】`;
 if(op==='restSelfBuffOther'||(mode==='selfRestBuff'&&bp!=null))
  return `選擇自己場上其他 1 張角色，本回合 BP＋${bp??1000}`;
 if(op==='restSelfGainEnergyRetireEndMain'||op==='restSelfGeneratedEnergyRetireEndMain')
  return `本回合產生能源＋${energy||1}`;
 if(op==='discardHandBuffSelf'||op==='discardHandBuff')
  return `本回合自身 BP＋${bp??ability?.amount??1000}`;
 if(op==='discardHandGainEnergy')return `本回合產生能源＋${energy||1}`;
 if(op==='discardHandThenActive'||op==='handOutsideActive')return '使此角色轉為活動';
 if(op==='restSelfEnergy')return `本回合產生能源＋${ability?.energy||energy||1}`;
 if(op==='payApDrawGainEnergy'||mode==='payApDrawEnergy')
  return `抽 ${ability?.draw||1} 張，本回合產生能源＋${energy||1}`;
 if(op==='payApDraw'||mode==='payApDraw')return `抽 ${ability?.draw||1} 張`;
 if(op==='restSelfRestFrontGainEnergy'||mode==='restFrontGainEnergy')
  return `再休息 1 張己方前線角色，本回合產生能源＋${energy||1}`;
 if(op==='restSelfThen'||mode==='selfRestThen')return renderSequence(ability?.then)||'執行後續效果';
 if(op==='frontOnceProgram'||op==='oncePayProgram'||op==='onceChooseProgram'||op==='onceFrontChoose'||mode==='frontOnce'||mode==='oncePay'||mode==='onceChoose'||mode==='frontChoose')
  return renderSequence(ability?.then)||renderChoice(ability);
 if(op==='kurisuFrontDual'){
  if(mode==='restedBuff')return `僅限此角色為休息狀態，選擇其他 1 張角色，本回合 BP＋${ability?.buffBp||2000}`;
  return '下一張從手牌使用、能源需求 3 以下且不具有最終觸發的事件，消費 AP－1';
 }
 if(op==='retireOwnFieldThen'||mode==='retireFieldThen'){
  const after=renderSequence(ability?.after);
  return '使 1 張己方場域退場'+(after?'，然後'+after:'');
 }
 if(op==='printReadyGate'||mode==='printReadyGate')
  return `自己牌庫在 ${ability?.deckAtMost??20} 張以下，且場上有${named(ability?.name)}時，將此角色轉為活動`;
 if(op==='crowdFrontDown'||mode==='printCrowd')
  return `場上特徵「${ability?.trait||''}」至少 ${ability?.minNames||0} 種，且對手前線有 BP ${ability?.minBp||0} 以上的角色時，選擇 1 張使其本回合 BP－${ability?.amount||0}，此角色本回合 BP＋${ability?.amount||0}`;
 if(op==='gainSameLineMains'||mode==='gainLineMains')
  return '本回合，此角色獲得同一條線上其他角色的主啟動能力';
 if(op==='readySelfIfOwnRetiredThisTurn')
  return '本回合己方有場域退場時，將此角色轉為活動';
 if(op==='frontActiveIfEvent')
  return `僅限前線，【每回合一次】，本回合已使用事件時，選擇 1 張能源需求 ${ability?.maxEnergy??3} 以下的己方角色，將其轉為活動`;
 if(op==='frontMoveNamed')
  return `僅限前線，【每回合一次】，選擇場上的${named(ability?.name)}，移到另一條線`;
 if(op==='kjnMain'&&ability?.id==='KJN-1-058')
  return '休息自身，選擇其他 1 張角色，本回合 BP＋1000。自己場上特徵「七陰」的卡名有 7 種以上時，可以改為選擇 2 張';
 if(op==='frontDrawOrHandTrigger'){
  if(mode==='handTrigger')return `可以將 1 張${COLOR[ability?.handColor]||''}手牌放到場外，並可以發動該卡的觸發`;
  return '抽 1 張';
 }
 if(op==='fieldRestMillOrOutsideEvent'){
  if(mode==='fieldOutsideEvent')return `場外至少 ${ability?.outsideMin??0} 張時，將 1 張手牌放到場外，之後可以使用場外事件`;
  return '將牌庫頂 1 張放到場外';
 }
 if(op==='fieldRestTuckOrRelease'){
  if(mode==='fieldRelease')return '將 1 張手牌放到場外後，可以放出 1 張裏向卡';
  return `場上有${named(ability?.requiresName)}時，將牌庫頂 1 張裏向放在此卡下方`;
 }
 if(op==='restChooseIfEventUsed'){
  if(mode==='eventRestDraw')return '抽 1 張，再將 1 張手牌放到場外';
  return '選擇 1 張己方角色，本回合 BP＋1000';
 }
 if(op==='fieldDualMain'){
  if(mode==='fieldRetireTrait')return `使 1 張具有「${ability?.retireTrait||''}」的己方角色退場`;
  return '本回合有角色退場後，休息此場域並給予後續 BP 效果';
 }
 if(op==='gunmenModeSubset'||mode==='gunmenModes'){
  const effects=action?.effects||ability?.options||['bp','impactNull','doubleBlock'];
  const text={bp:'本回合 BP＋1000',impactNull:'直到下次自己的回合開始，【貫通無效】',doubleBlock:'直到下次自己的回合開始，【二回阻擋】'};
  return '依場上顏面張數選擇：'+(Array.isArray(effects)?effects:[]).map(item=>text[item]||'').filter(Boolean).join('、');
 }
 if(op==='buffNamedEnergyActiveAp'||mode==='namedEnergyAp')
  return `休息並退場後，令${named(ability?.name)||'指定角色'}本回合產生能源＋${ability?.extraEnergy||3}，並將 1 張 AP 轉為活動`;
 if(op==='restTuckTopDamage'||mode==='restTuckDamage')
  return '將牌庫頂 1 張裏向放在指定角色下方，該角色本回合直接傷害變為 2';
 if(op==='revealHandBottomBuff'||mode==='revealBottomBuff')
  return `公開 1 張手牌放到牌庫底${bp!=null?`，可以令角色本回合 BP＋${bp}`:''}`;
 if(op==='revealHandBottomImpact'||mode==='revealBottomImpact')
  return `公開 1 張 BP ${ability?.minPrintedBp||0} 以上的手牌放到牌庫底，本回合獲得【貫通（${ability?.impact||1}）】`;
 if(op==='onceGrantBlockImpact'||mode==='grantBlockImpact')
  return `直到下一個自己的回合開始，獲得【二回阻擋】與【貫通無效】`;
 if(op==='nameOnceActive'||op==='activeSelfOnceByKey'||op==='cardOnceActive'||op==='cardOnceActiveIfBp'||op==='onceActiveIfOwnEffectRested'||op==='onceActiveSelfGate'||op==='printNameActive'||mode==='nameActive'||mode==='ready'||mode==='cardOnceActive'||mode==='ownRestActive'||mode==='onceActiveGate')
  return '將此角色轉為活動';
 if(op==='frontOnceActiveNamed'||mode==='nameOnceActive')
  return `將場上的${named(ability?.name)}轉為活動`;
 if(op==='restSelfChoose'||mode==='restSelfChoose'||op==='entryTurnRestFrontChoose'||mode==='entryRestFront')
  return renderSequence(ability?.then)||'休息後必須選擇一項後續效果';
 if(op==='energyRestRetireThen'||mode==='energyRestRetire')
  return '在能源線休息並退場。'+renderSequence(ability?.then);
 if(op==='restRetireRecoverPlainEvent'||op==='restRetireRecoverTrait'||op==='restRetireRecoverNamed'||op==='restRetireRecoverOutside'||mode==='restRetireTrait'||mode==='restRetireNamed'||mode==='restRetireRecover'){
  const what=ability?.trait?`特徵「${ability.trait}」`:ability?.name?named(ability.name):ability?.names?ability.names.map(nameZh).join('或'):'指定卡';
  return `從場外回收${what}`;
 }
 if(op==='payApHandTopBuffAttackAp'||mode==='handTopBuff')
  return `將 1 張手牌放到牌組上面，本回合 BP＋${bp??2000}，攻擊階段開始時將 1 張 AP 轉為活動`;
 if(op==='energySwapOwnFront'||mode==='energySwap')return '與 1 張己方前線角色交換位置';
 if(op==='handOutsideBlockAtLeast'||mode==='handBlock')
  return `將 1 張手牌放到場外，本回合不會被 BP ${ability?.bp||4000} 以上的角色阻擋`;
 if(op==='restLeaveRevealRetire'||mode==='restLeaveReveal')return '休息並退場，公開 1 張手牌放到牌庫底';
 if(op==='restPeekTop'||mode==='restPeek')return '查看牌庫頂 1 張';
 if(op==='lifeHandReenterGrant'||mode==='lifeReenter')return '將 1 張生命加入手牌，並獲得再登場或突襲';
 if(op==='outsideEventDiscardActive'||mode==='outsideActive')return '將 1 張手牌放到場外，使其他角色轉為活動';
 if(op==='frontDiscardNameTraitBuff'||mode==='frontDiscardBuff')
  return `將 1 張手牌放到場外，指定名稱或特徵的角色本回合 BP＋${bp??1000}`;
 if(op==='discardEventNamedEnergy'||mode==='discardEventEnergy')
  return '將 1 張事件放到場外，本回合指定角色的必要能源減少 1';
 if(op==='doubleEnergyIfNotEntry'||mode==='doubleEnergy')return '本回合產生能源變為 2 倍';
 if(op==='chooseEnergyModeUntilNextOwnStart'||mode==='energyMode')
  return '直到下次自己的回合開始，選擇產生能源＋1，或在前線也能產生能源';
 if(op==='restSelfDrawIfEnergy')return `產生能源在 ${ability?.minEnergy||0} 以上時抽 ${ability?.draw||1} 張`;
 if(op==='restSelfThenRestOppFrontOne'||mode==='selfRestEnemy')return '指定 1 張對手前線角色，將其轉為休息';
 if(op==='fieldRestDiscardDraw'||mode==='fieldDiscardDraw')return '將 1 張手牌放到場外，然後抽 1 張';
 if(op==='fieldRestBuffTrait'||mode==='fieldTraitBuff'||mode==='restTraitBuff')
  return `己方特徵「${ability?.trait||''}」的角色本回合 BP＋${bp??ability?.amount??500}`;
 if(op==='restBuffOtherReturnHand'||mode==='selfRestBuffHand')
  return `選擇其他 1 張角色，本回合 BP＋${bp??1000}，並將自身返回手牌`;
 if(op==='restBuffMayDiscardActive'||mode==='restBuffDiscard')
  return `選擇指定角色，本回合 BP＋${bp??1000}${action?.discardUid? '，並可以棄 1 張手牌使其轉為活動':'，可以不棄牌'}`;
 if(op==='gainSelfEnergyIfAtLeast'||mode==='plus2')
  return `產生能源在 ${ability?.min||8} 以上時，本回合產生能源＋${ability?.amount||2}`;
 if(op==='activeOneIfEnergy'||mode==='ready20')
  return `產生能源在 ${ability?.minEnergy||20} 以上時，將 1 張己方角色轉為活動`;
 if(op==='frontEnergyEscalation'||mode==='front')
  return `在前線，產生能源 ${ability?.minEnergy||6} 以上時可以發動後續產能效果`;
 if(op==='energyLineAttackCap'||mode==='line')
  return `將 ${ability?.discard||1} 張手牌放到場外，本回合可以從能源線攻擊，攻擊次數上限 ${ability?.attackCap||4}`;
 if(op==='restSelfBpImpact')return `本回合 BP＋${bp??1000}，並獲得【貫通（${ability?.impact||1}）】`;
 if(op==='restSelfAttackDraw')return '本回合攻擊時抽 1 張';
 if(op==='rukaFrontGrant'||mode==='rukaGrant')
  return action?.grant==='block'?'本回合不會被 BP 4000 以上的角色阻擋':'本回合 BP＋1000；若已使用事件，再獲得【貫通（1）】';
 if(op==='readyOtherRestedOnce'||mode==='readyRested')return '將本回合曾被自己效果休息的角色轉為活動';
 if(op==='restNamedFrontThenChoose'||mode==='restNamedChoose')return '休息前線的指定角色，然後必須選擇一項後續效果';
 if(op==='payHandMoveOrSwap'||mode==='payHandMove')return '支付 1 張手牌，移動或交換角色';
 if(op==='payHandMoveSelf'||mode==='payHandMoveSelf')return '支付 1 張手牌，將此角色移到另一條線';
 if(op==='payHandGrantImpact'||mode==='payHandImpact')return `支付 1 張手牌，本回合獲得【貫通（${ability?.impact||1}）】`;
 if(op==='onceTuckFacedown'||mode==='onceTuck')return '將牌庫頂 1 張裏向放在此角色下方';
 if(op==='fieldRestSacrificeReplay'||mode==='fieldRestSacrificeReplay')return '休息此場域，使 1 張己方角色退場並重新發動其登場時';
 if(op==='fieldRestRetire'||mode==='fieldRestRetire')return '休息此場域並使此卡退場';
 if(op==='fieldRestRetireThen'||mode==='fieldRestTrueRetireDeploy'||mode==='fieldRestRetireDraw')
  return '休息並退場。'+renderSequence(ability?.then);
 if(op==='outsideDiscardTraitToHand'||mode==='outsideTraitHand')
  return `在場外，將 1 張特徵「${ability?.trait||''}」的手牌放到場外，並將此卡加入手牌`;
 if(op==='sniperThenRaidBaseOutside'||mode==='sniperRaidBase')return '本回合獲得【狙擊】，並可以處理突襲底板';
 if(op==='repeatDiscardBattleKit'||mode==='repeatDiscardBattle')
  return '將 1 張手牌放到場外，本回合獲得【傷害（2）】，攻擊並贏得戰鬥時抽 1 張';
 if(op==='lifeToHandThenActive')return '將 1 張生命加入手牌。若如此做，可以將 1 張角色轉為活動';
 if(op==='entryTurnOtherImpact'||mode==='entryOtherImpact')
  return '只有此角色登場的回合才能發動。選擇其他 1 張角色，本回合獲得【貫通（1）】';
 if(op==='onceDiscardDrawIfEntered'||mode==='enteredDiscardDraw')
  return `本回合曾有${named(ability?.name)}登場時，將 ${ability?.discard||1} 張手牌放到場外，然後抽 ${ability?.draw||1} 張`;
 if(op==='restDiscardGrantAttackDraw'||mode==='restAttackDraw')
  return `選擇特徵「${ability?.trait||''}」的角色，本回合攻擊並贏得戰鬥時抽 1 張`;
 if(op==='restDiscardNextTraitAp'||mode==='restTraitAp')
  return `下一張從手牌使用的特徵「${ability?.trait||''}」，消費 AP－1`;
 if(op==='restIfTraitUsedDrawDiscard'||mode==='restTraitDraw')return '抽 1 張，再將 1 張手牌放到場外';
 if(op==='restDrawDiscard'||mode==='restDrawDiscard')return '休息，抽 1 張，然後將 1 張手牌放到場外';
 if(mode==='energyWake')return '在能源線將此角色轉為活動';
 if(op==='energyBottomNamedFront'||mode==='restBottom')
  return `將場外的${named(ability?.name)}放到牌庫底，並將此角色移到前線，本回合 BP＋${bp??1000}`;
 if(op==='discardMoveOtherLine'||mode==='restPayMove')
  return `將 ${ability?.pay||2} 張手牌放到場外，場上有${named(ability?.name)}時把此角色移到另一條線`;
 if(op==='deployRaidSourceLocked'||mode==='restRaidSource')return '將突襲底板以鎖定狀態登場到空位';
 if(op==='raidTopToOwnDeck'||mode==='restRaidTop')return '將突襲最上層放到自己的牌庫';
 if(op==='removeOutsideNamedAura'||mode==='restRemoveAura')return `將場外的${named(ability?.name)}移到移除區並抽 1 張`;
 if(op==='entryTurnSelectTax'||mode==='restSelectTax')return '直到下一個自己的回合開始，對手要選擇指定角色時必須額外棄牌';
 if(/^(?:kmr|kmr2|csm|iys|kjn|aot|aot2|mmm2)/.test(op))return '';
 const sequenced=renderSequence(ability?.then);
 if(sequenced)return sequenced;
 const parts=[];
 if(bp!=null)parts.push(`本回合 BP＋${bp}`);
 if(Number.isInteger(energy))parts.push(`產生能源＋${energy}`);
 if(Number.isInteger(ability?.draw))parts.push(`抽 ${ability.draw} 張`);
 if(Number.isInteger(ability?.impact))parts.push(`獲得【貫通（${ability.impact}）】`);
 if(Number.isInteger(ability?.damage))parts.push(`獲得【傷害（${ability.damage}）】`);
 if(/Active/.test(op))parts.push('轉為活動');
 if(/Mill|mill/.test(op))parts.push('將牌庫頂放到場外');
 if(/Tuck|tuck/.test(op))parts.push('將牌庫頂裏向放在角色下方');
 if(/Draw/.test(op)&&!ability?.draw)parts.push('抽牌');
 if(/Swap|swap/.test(op))parts.push('交換位置');
 if(/Block/.test(op))parts.push('獲得阻擋相關效果');
 return parts.join('，');
}
function parameterText(ability,action){
 if(!ability)return '';
 const limits=limitWords(ability,action);
 const gates=gateWords(ability);
 const costs=costWords(ability,action);
 const effect=effectWords(ability,action);
 const body=[...limits,...gates,...costs,effect].filter(Boolean);
 if(!effect&&!costs.length)return '';
 return polish(body.join('，'));
}
const HINT={
 frontDraw:['抽'],handTrigger:['觸發','手牌'],fieldMill:['牌庫','牌組','卡組'],
 fieldOutsideEvent:['事件'],fieldTuck:['裏'],fieldRelease:['放出','下方'],
 kindsActive:['活動','種類','能源線'],selfRestBuff:['休息','BP'],
 eventRestBuff:['BP'],eventRestDraw:['抽'],frontEnergyBp:['BP'],
 frontEnergyImpact:['貫通','衝擊'],fieldRetireTrait:['退場'],fieldRestBuffGroup:['BP']
};
function clauseIndex(mode,count){
 if(typeof mode!=='string')return null;
 if(/:(?:b|1)$/.test(mode))return 1;
 if(/:(?:c|2)$/.test(mode))return 2;
 if(/:out$/.test(mode))return count>1?count-1:0;
 if(/:(?:a|0)$/.test(mode))return 0;
 return null;
}
function pickClause(clauses,action){
 if(!clauses.length)return '';
 if(clauses.length===1)return clauses[0];
 const indexed=clauseIndex(action?.mode,clauses.length);
 if(indexed!=null&&clauses[indexed])return clauses[indexed];
 const hints=HINT[action?.mode]||[];
 if(!hints.length)return '';
 const scores=clauses.map(text=>hints.reduce((n,hint)=>n+(text.includes(hint)?1:0),0));
 const best=Math.max(...scores);
 if(best<=0||scores.filter(score=>score===best).length!==1)return '';
 return clauses[scores.indexOf(best)];
}
function branchCount(printed,action){
 const mains=printed?.printedMains?.length||0;
 if(mains>1)return mains;
 const op=printed?.mainAbility?.op;
 if(['frontDrawOrHandTrigger','characterDualMain','fieldRestMillOrOutsideEvent','fieldRestTuckOrRelease','restChooseIfEventUsed','fieldDualMain','gunmenModeSubset','kurisuFrontDual','rukaFrontGrant'].includes(op))
  return 2;
 if(typeof action?.mode==='string'&&/:(?:a|b|0|1|out)$/.test(action.mode))return 2;
 return 1;
}
export function activationLabelBanned(label){
 const text=String(label||'');
 if(!text.trim())return '空白';
 for(const word of BANNED)if(text.includes(word))return word;
 if(/&nbsp|&#\d+;/.test(text))return 'HTML 編碼';
 if(/\b(?:kmr|kmr2|csm|iys|kjn|aot2|mmm2):/i.test(text))return '未翻譯模式';
 return '';
}
// A button that stands for one physical card names that card and its place,
// so two copies of the same printed name stay apart.
function aimPlace(pack,state,uid){
 if(typeof uid!=='string')return null;
 const owner=Number(uid.split('-')[0]);
 const player=state?.players?.[owner];
 if(!player)return null;
 const lines=[['前線',player.front],['能源',player.energy],['手牌',player.hand],['場外',player.outside],['移除',player.removed]];
 for(const [line,zone] of lines){
  if(!Array.isArray(zone))continue;
  const index=zone.findIndex(card=>card?.uid===uid);
  if(index<0)continue;
  const printed=locate(pack,state,uid)?.printed;
  const name=printed?.name||'';
  if(!name)return null;
  const where=line==='手牌'||line==='場外'||line==='移除'?`${line}〈${name}〉`:`${line}${index+1}〈${name}〉`;
  return {name,where,printed};
 }
 return null;
}
// One printed MAIN can offer several different results. The button names the
// physical card and the result; the sentence after the first period keeps the
// printed condition.
function aimedChoiceLabel(ability,action,pack,state){
 const op=ability?.op||'';
 const mode=action?.mode||'';
 const target=aimPlace(pack,state,action?.targetUid);
 const recover=aimPlace(pack,state,action?.recoverUid);
 const rest=aimPlace(pack,state,action?.restUid);
 const discarded=aimPlace(pack,state,action?.discardUid);
 if(op==='frontOnceEnergyChoice'&&(mode==='frontEnergyBp'||mode==='frontEnergyImpact')){
  const who=target?.where||'這張角色';
  const amount=Number.isInteger(ability?.bp)?ability.bp:1000;
  const impact=Number.isInteger(ability?.impact)?ability.impact:1;
  const min=Number.isInteger(ability?.minEnergy)?ability.minEnergy:4;
  if(mode==='frontEnergyImpact')
   return `${who} 貫通 ${impact}。${polish(`前線，每回合一次，必要能源 ${min} 以上的其他角色，本回合獲得【貫通（${impact}）】。`)}`;
  return `${who} BP＋${amount}。${polish(`前線，每回合一次，必要能源 ${min} 以上的其他角色，本回合 BP＋${amount}。`)}`;
 }
 if(op==='frontOnceNameBuff'&&mode==='nameScaledBuff'){
  const who=target?.where||'這張角色';
  const named=!!(target?.printed&&ability?.name&&cardHasName(target.printed,ability.name,false));
  const amount=named?(ability?.namedBp??2000):(ability?.bp??1000);
  const extra=named?'，並獲得【狙擊】':'';
  return `${who} BP＋${amount}${named?' 並狙擊':''}。${polish(`前線，每回合一次，這張角色本回合 BP＋${amount}${extra}。`)}`;
 }
 if(op==='rukaFrontGrant'&&mode==='rukaGrant'){
  const who=target?.where||'這張角色';
  if(action?.grant==='block')
   return `${who} 不被高 BP 阻擋。${polish('每回合一次，僅限前線，本回合不會被 BP 4000 以上的角色阻擋。')}`;
  if(action?.grant==='eventImpact')
   return `${who} BP＋1000。${polish('每回合一次，僅限前線，本回合 BP＋1000；若已使用事件，再獲得【貫通（1）】。')}`;
 }
 if(op==='frontOnceGrantBpRules'&&mode==='grantBpRules'){
  const who=target?.where||'這張角色';
  const echo=Number.isInteger(ability?.echoBp)?ability.echoBp:500;
  return `${who} 受減再降。${polish(`前線，每回合一次，此角色本回合受到 BP 降低時再 BP－${echo}，BP 0 以下退場時改放進移除區。`)}`;
 }
 if(op==='frontOnceOppDownSelfUp'&&mode==='oppDownSelfUp'){
  const who=target?.where||'這張角色';
  const down=Number.isInteger(ability?.bp)?ability.bp:1000;
  const up=Number.isInteger(ability?.selfBp)?ability.selfBp:1000;
  return `${who} BP－${down}。${polish(`前線，每回合一次，該角色本回合 BP－${down}，此角色本回合 BP＋${up}。`)}`;
 }
 if(op==='restRetireRecoverTrait'&&mode==='restRetireTrait'&&recover)
  return `回收${recover.where}。${polish(`休息並退場，從場外回收特徵「${ability?.trait||''}」。`)}`;
 if(op==='restBuffMayDiscardActive'&&mode==='restBuffDiscard'){
  const who=target?.where||'這張角色';
  const amount=Number.isInteger(ability?.bp)?ability.bp:1000;
  if(discarded)
   return `支付${discarded.where}。${polish(`休息，${who}本回合 BP＋${amount}，並將其轉為活動。`)}`;
  return `${who} 只加 BP。${polish(`休息，${who}本回合 BP＋${amount}，可以不棄牌。`)}`;
 }
 if(op==='restNamedFrontThenChoose'&&mode==='restNamedChoose'&&rest)
  return `休息${rest.where}。${polish('休息前線的指定角色，然後必須選擇一項後續效果。')}`;
 return '';
}
function raidTwoChoiceLabel(ability,action){
 if(ability?.op!=='chooseTwoAfterOwnRaid')return '';
 const trait=typeof ability.trait==='string'&&ability.trait?ability.trait:'符合條件';
 const amount=Number.isInteger(ability.bp)?ability.bp:1000;
 const once=ability.readyOncePerName?'同名活動選項每回合一次。':'';
 const stand='將此角色轉為活動';
 const boost=`選擇 1 張己方特徵「${trait}」的角色，本回合 BP＋${amount}`;
 const gate='本回合自己有過突襲，且此角色在前線';
 if(action?.mode==='ready')
  return `只活動自身。${polish(`${gate}，${stand}。${once}`)}`;
 if(action?.mode==='buff')
  return `只給「${trait}」BP＋${amount}。${polish(`${gate}，${boost}。`)}`;
 if(action?.mode==='readyAndBuff')
  return `活動自身並 BP＋${amount}。${polish(`${gate}，${stand}，並${boost}。${once}`)}`;
 return '';
}
export function describeActivation(action,{pack,state}={}){
 if(action?.type!=='activate')return '';
 const found=locate(pack,state,action.uid);
 const printed=found?.printed||null;
 const catalogue=printed?.id?BY_ID.get(printed.id):null;
 const ability=abilityFor(printed,action,pack,state);
 const aimed=aimedChoiceLabel(ability,action,pack,state);
 if(aimed)return aimed;
 const choice=raidTwoChoiceLabel(ability,action);
 if(choice)return choice;
 if(!printed&&!catalogue)return '';
 const clauses=chineseMainClauses(catalogue?.effect||'');
 const chosen=pickClause(clauses,action);
 const generated=parameterText(ability,action);
 const split=branchCount(printed,action)>1;
 let text='';
 if(split&&generated)text=generated;
 else if(chosen&&coversNumbers(chosen,ability))text=polish(chosen);
 else if(generated)text=generated;
 else if(chosen)text=polish(chosen);
 else if(clauses.length>1&&/^(?:kmr2?|csm|iys|kjn|aot2?|mmm2):[^:]+$/.test(action?.mode||''))
  text=polish(clauses.join(' '));
 if(!text)return '';
 if(ability?.op==='onceAbovePrintedKeywords'||action.mode==='abovePrinted'){
  const live=qualifyingAbovePrinted(pack,state,action.uid);
  if(Number.isInteger(live))text+=`（目前符合 ${live} 張）`;
 }
 return text;
}
