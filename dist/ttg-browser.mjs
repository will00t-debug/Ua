// Browser-facing adapter for the independently-tested TTG experimental match core.
// Deliberately does not mark official cards auto:true or the title officially playable.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {validateTtgCoreDeck,legalTtgCoreActions,TTG_CORE_SMOKE_IDS} from './ttg-core-match.mjs';
export const TTG_BETA_IDS=TTG_CORE_SMOKE_IDS;
export const TTG_GREEN_BETA_PRESET=Object.freeze(Object.fromEntries([...['003','005','006','009','010','011','014','015','016','017','018','019'].map(n=>['TTG-1-'+n,4]),['TTG-1-035',2]]));
export const TTG_RED_BETA_PRESET=Object.freeze(Object.fromEntries([...['042','043','044','046','047','048','051','052','059','066','075','077'].map(n=>['TTG-1-'+n,4]),['TTG-1-078',1],['TTG-1-079',1]]));
export function ttgBetaDeckIssues(counts){return validateTtgCoreDeck(counts);}
export function ttgChoiceActor(s){
 if(s?.pendingTtgLife&&Number.isInteger(s.pendingTtgLife.player))return s.pendingTtgLife.player;
 if(s?.pendingTtgTrigger&&Number.isInteger(s.pendingTtgTrigger.player))return s.pendingTtgTrigger.player;
 if(s?.pending&&Number.isInteger(s.pending.player))return s.pending.player;
 if(s?.pending?.kind==='block')return 1-s.active;
 return s?.active??0;
}
export function ttgCardByUid(s,uid){
 if(uid==null)return null;
 const scan=c=>c&&((c.uid===uid&&c)||[...(c.stack||[]),...(c.under||[])].map(scan).find(Boolean));
 for(const p of s.players||[])for(const zone of ['hand','life','outside','removed','deck','front','energy'])
  for(const c of p[zone]||[]){const found=scan(c);if(found)return found;}
 return null;
}
const label=(s,uid)=>{const c=ttgCardByUid(s,uid);return c?(TTG_BY_ID[c.cardId]?.nameZh||TTG_BY_ID[c.cardId]?.nameJa||c.cardId)+'（'+c.cardId.slice(-3)+'）':String(uid??'—');};
export function ttgActionLabel(s,a){
 const names={next:'進入下一階段／結束回合',extraDraw:'額外抽牌',play:'普通登場',move:'移動角色',attack:'宣告攻擊',block:'選擇阻擋',resolveGreenEntry:'結算綠色登場效果'};
 if(a.type==='ttgLifeChoice'){
  const options={decline:'不發動生命 Trigger',draw:'發動 DRAW：抽 1 張',final:'發動 FINAL：恢復 1 點生命',get:'發動 GET：將觸發卡加入手牌',active:'發動 ACTIVE：選擇角色',special:'發動 SPECIAL：使敵方角色退場',color:'發動 COLOR：登場角色',colorRed:'發動紅色 COLOR：選擇對手角色',raid:'發動 Raid 生命 Trigger',raidHand:'將 Raid 觸發卡加入手牌'};
  let result=options[a.mode]||('生命觸發：'+String(a.mode));
  if(a.targetUid!=null)result+=' → '+label(s,a.targetUid);
  if(a.handUid!=null)result+=' · '+label(s,a.handUid);
  if(a.line!=null&&a.slot!=null)result+=' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
  return result;
 }
 const key=names[a.type]||a.type;
 const primary=a.handUid??a.raidUid??a.cardUid??a.uid??a.sourceUid??a.siteUid;
 let title=key+(primary!=null?' · '+label(s,primary):'');
 if(a.type==='block')title=a.blockUid==null?'不阻擋':'阻擋 · '+label(s,a.blockUid);
 if(Array.isArray(a.payApUids)&&a.payApUids.length){
  const cards=s.players?.[s.active]?.apCards||[];
  title+=' · 支付 '+a.payApUids.map(uid=>'AP'+(cards.findIndex(c=>c.uid===uid)+1)).join('＋');
 }
 if(a.type==='playTtgEvent'&&Array.isArray(a.readyApUids)){
  const cards=s.players?.[s.active]?.apCards||[];
  title+=' · 回復 '+(a.readyApUids.length?a.readyApUids.map(uid=>'AP'+(cards.findIndex(c=>c.uid===uid)+1)).join('＋'):'0張AP');
 }
 if(a.type==='green012Search')title+=' · '+(a.takeUid?'拿 '+label(s,a.takeUid):'不拿牌')+'，牌庫底順序'+a.bottomOrderUids?.map(uid=>label(s,uid)).join('→');
 if(a.type==='green012Discard')title+=' · 棄 '+(a.discardUids||[]).map(uid=>label(s,uid)).join('、')+'，回復 AP';
 if(a.type==='attack'&&a.targetUid!=null)title+=' → 狙擊 '+label(s,a.targetUid);
 if(a.targetUid!=null&&a.type!=='attack')title+=' → '+label(s,a.targetUid);
 if(a.baseUid!=null)title+=' · Raid底板 '+label(s,a.baseUid);
 if(a.line!=null&&Number.isInteger(a.slot))title+=' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
 else if(Number.isInteger(a.slot))title+=' → 位置'+(a.slot+1);
 if(a.mode!=null)title+=' · '+String(a.mode);
 for(const key of ['takeUid','recoverUid','discardUid','returnUid','outsideUid'])if(a[key]!=null)title+=' · '+({takeUid:'加入',recoverUid:'回收',discardUid:'棄牌',returnUid:'返回',outsideUid:'場外'}[key])+' '+label(s,a[key]);
 if(a.type!=='block'&&a.uid==null&&primary==null&&a.type==='next')return key;
 return title;
}
// The core exposes legal *templates* for events/raids. Before displaying
// player buttons we must choose actual physical AP cards and, where necessary,
// expand a legal target list. An unfilled template is not an executable click.
export function ttgExecutableActions(s){
 const offered=legalTtgCoreActions(s);
 const ap=s.players?.[s.active]?.apCards||[];
 const ready=ap.filter(c=>c.ready).map(c=>c.uid);
 const combinations=(arr,max,from=0,used=[],result=[[]])=>{
  for(let i=from;i<arr.length&&used.length<max;i++){
   const next=[...used,arr[i]];result.push(next);
   combinations(arr,max,i+1,next,result);
  }
  return result;
 };
 // Payment must be a player decision when multiple ACTIVE AP cards are
 // available. The previous UI silently spent the FIRST ready AP card even
 // though its identity affects which REST AP can be readied by hand events.
 const paymentOptions=a=>{
  if(a.payApUids!==undefined)return [a];
  const cost=Number.isInteger(a.requiredAp)?a.requiredAp:
   a.type==='green012Play'?2:
   ['ttgGreenSitePlay','ttgRed077Play'].includes(a.type)?1:null;
  if(cost===null)return [a];
  if(!Number.isInteger(cost)||cost<0||cost>ready.length)return [];
  return combinations(ready,cost).filter(ids=>ids.length===cost)
   .map(payApUids=>({...a,payApUids}));
 };
 return offered.flatMap(original=>paymentOptions(original).flatMap(a=>{
  if(a.type==='playTtgEvent'){
   // TTG-1-081 requires an opposing-front target; AP-ready hand events do not.
   if(Array.isArray(a.targetUids)&&a.targetUids.length)
    return a.targetUids.map(targetUid=>({...a,targetUid}));
   if(Number.isInteger(a.maxReadyAp)){
    const exhausted=ap.filter(c=>!c.ready||a.payApUids.includes(c.uid)).map(c=>c.uid);
    return combinations(exhausted,Math.min(2,a.maxReadyAp)).map(readyApUids=>({...a,readyApUids}));
   }
   return [a];
  }
  if(a.type==='green012Search'){
   const takes=[null,...(a.candidates||[])];
   return takes.flatMap(takeUid=>{
    const remaining=(a.revealed||[]).filter(uid=>uid!==takeUid);
    return [{...a,takeUid,bottomOrderUids:remaining},
     ...(remaining.length>1?[{...a,takeUid,bottomOrderUids:[...remaining].reverse()}]:[])];
   });
  }
  if(a.type==='green012Discard'){
   const uid=(a.handUids||[])[0];
   if(!uid)return [{...a,discardUids:[],mode:'readyAP',apUid:ap[0]?.uid,targetUid:null}];
   return ap.map(card=>({...a,discardUids:[uid],mode:'readyAP',apUid:card.uid,targetUid:null}));
  }
  return [a];
 }));
}
// TTG-1-012: a player's Q2266 discard choice is a true multi-card
// selection, potentially unlocking the 15+ total printed-cost retirement
// alternative. Construct the exact action from the core legal template.
// Simon 012: the player (not a preset or AI) selects zero/one eligible top
// card and an arbitrary exact ordering of every remaining physical UID.
export function ttg012SearchChoice(s,{takeUid=null,bottomOrderUids=[]}={}){
 const legal=legalTtgCoreActions(s).find(x=>x.type==='green012Search');
 if(!legal)throw new Error('目前沒有西蒙012的牌頂搜尋效果待結算');
 if(takeUid!==null&&!legal.candidates.includes(takeUid))
  throw new Error('僅可選擇合法的妮亞或需求能源8以上的角色');
 if(!Array.isArray(bottomOrderUids))throw new Error('請依序指定所有剩餘牌庫底卡片');
 const remaining=legal.revealed.filter(uid=>uid!==takeUid);
 if(bottomOrderUids.length!==remaining.length||new Set(bottomOrderUids).size!==bottomOrderUids.length||
  bottomOrderUids.some(uid=>!remaining.includes(uid)))
  throw new Error('牌庫底順序須包含所有剩餘的不同實體卡，不能增減或重複');
 return {type:'green012Search',player:legal.player,uid:legal.uid,takeUid,bottomOrderUids};
}
export function ttg012ManualChoice(s,{discardUids=[],mode='readyAP',apUid=null,targetUid=null}={}){
 const legal=legalTtgCoreActions(s).find(x=>x.type==='green012Discard');
 if(!legal)throw new Error('目前沒有西蒙012的棄牌效果待結算');
 if(!Array.isArray(discardUids)||new Set(discardUids).size!==discardUids.length)
  throw new Error('不能重複選擇同一張棄牌');
 const hand=s.players[legal.player].hand;
 if(discardUids.some(uid=>!legal.handUids.includes(uid)))throw new Error('只能棄掉合法的自己手牌');
 if(legal.handUids.length&&discardUids.length===0)throw new Error('手牌存在時必須至少棄一張');
 const total=discardUids.reduce((n,uid)=>n+(TTG_BY_ID[hand.find(c=>c.uid===uid)?.cardId]?.energy||0),0);
 if(mode==='readyAP'){
  if(targetUid!==null||!s.players[legal.player].apCards.some(c=>c.uid===apUid))
   throw new Error('請指定自己一張 AP 卡回復');
 }else if(mode==='retire'){
  if(total<15)throw new Error('選擇退場效果時，棄牌需求能源合計須至少 15');
  if(apUid!==null)throw new Error('退場效果不能同時回復 AP');
  if(targetUid!==null&&!s.players[1-legal.player].front.some(c=>c?.uid===targetUid&&!c.cannotBeChosen&&!c.protectedFromEffects))
   throw new Error('只能選擇未受效果保護的對手前線角色');
 }else throw new Error('未知的西蒙012效果選項');
 return {type:'green012Discard',player:legal.player,uid:legal.uid,discardUids,mode,apUid,targetUid};
}
// Ordinary player deployment can be made by selecting a hand card and
// tapping its destination slot. Return ONLY a currently legal exact play
// action; never synthesize AP payments or bypass source-engine checks.
export function ttgNormalPlacementAction(s,handUid,line,slot){
 if(!s||s.status!=='playing'||s.pending||s.pendingTtgLife||
    s.pendingTtgTrigger||s.phase!=='main'||!['front','energy'].includes(line)||
    !Number.isInteger(slot)||slot<0||slot>3||typeof handUid!=='string')
  return null;
 const actor=ttgChoiceActor(s),player=s.players?.[actor];
 if(actor!==s.active||!player?.hand.some(c=>c.uid===handUid)||
    player[line]?.[slot]!=null)return null;
 return legalTtgCoreActions(s).find(a=>a.type==='play'&&a.handUid===handUid&&
    a.line===line&&a.slot===slot)||null;
}
export function ttgActionKinds(s){
 const by=new Map();for(const a of ttgExecutableActions(s))by.set(a.type,(by.get(a.type)||0)+1);return [...by].map(([type,count])=>({type,count}));
}
export function ttgFilteredActions(s,{kind='all',cardUid=null,offset=0,limit=100}={}){
 const all=ttgExecutableActions(s);
 const list=all.filter(a=>(kind==='all'||a.type===kind)&&(!cardUid||a.handUid===cardUid||a.uid===cardUid||a.sourceUid===cardUid||a.raidUid===cardUid||a.cardUid===cardUid||a.targetUid===cardUid||a.baseUid===cardUid||a.type==='next'));
 return {total:list.length,actions:list.slice(offset,offset+limit)};
}
export const TTG_BETA_NOTICE='81/81 種卡已接上獨立測試核心；不是正式完整規則認證。跨卡連鎖、隱藏資訊及例外時序仍須測試。';
