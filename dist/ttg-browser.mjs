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
export function ttgActionKinds(s){
 const by=new Map();for(const a of legalTtgCoreActions(s))by.set(a.type,(by.get(a.type)||0)+1);return [...by].map(([type,count])=>({type,count}));
}
export function ttgFilteredActions(s,{kind='all',cardUid=null,offset=0,limit=100}={}){
 const all=legalTtgCoreActions(s);
 const list=all.filter(a=>(kind==='all'||a.type===kind)&&(!cardUid||a.handUid===cardUid||a.uid===cardUid||a.sourceUid===cardUid||a.raidUid===cardUid||a.cardUid===cardUid||a.targetUid===cardUid||a.baseUid===cardUid||a.type==='next'));
 return {total:list.length,actions:list.slice(offset,offset+limit)};
}
export const TTG_BETA_NOTICE='81/81 種卡已接上獨立測試核心；不是正式完整規則認證。跨卡連鎖、隱藏資訊及例外時序仍須測試。';
