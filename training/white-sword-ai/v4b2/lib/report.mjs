// Traditional Chinese report. A weight change is not a strength result.
import {BUCKET_LABEL,DECK_LABEL} from './protocol.mjs';

const TYPE={
 next:'通過',activate:'啟動',move:'移動',play:'打出',chooseHandLimit:'選擇手牌',
 attack:'攻擊',raid:'突襲',chooseBlock:'阻擋',event:'事件',extraDraw:'額外抽牌',
 chooseDiscardGate:'棄牌',chooseLineSlot:'選擇格子'
};
const LINE={front:'前線',energy:'能量區'};
const STATUS={
 pass:'採用',trust:'信任域未過',short:'單步無法改選',identical:'特徵相同',
 clipped:'權重已貼著邊界',already:'更新前已符合',conflict:'同輪方向相反',
 queued:'可通過但本輪不疊加',missing:'缺少局面'
};
function deck(id){return DECK_LABEL[id]||id;}
function bucket(id){return BUCKET_LABEL[id]||id;}
function describe(key,card){
 try{
  const parsed=JSON.parse(key);
  const parts=[TYPE[parsed.type]||parsed.type];
  if(parsed.mode)parts.push(parsed.mode);
  if(parsed.line)parts.push(LINE[parsed.line]||parsed.line);
  if(Number.isInteger(parsed.slot))parts.push('格 '+parsed.slot);
  if(card)parts.push(card);
  return parts.join(' ');
 }catch{return card||String(key);}
}
function table(rows){
 const lines=['| 類型 | 白劍 | 我拒絕 | 戀露 |'];
 lines.push('| --- | ---: | ---: | ---: |');
 for(const [name,cells] of Object.entries(rows||{})){
  lines.push('| '+bucket(name)+' | '+(cells['white-sword']||0)+' | '+(cells['reject-blue']||0)+' | '+(cells.renruki||0)+' |');
 }
 return lines;
}
function countLine(items){
 return Object.entries(items||{}).map(([key,count])=>((BUCKET_LABEL[key]||DECK_LABEL[key]||key)+' '+count)).join('、')||'沒有';
}
export function renderReport(report){
 const lines=[];
 lines.push('# 白劍 AI v4-B.2 平衡挖掘','');
 lines.push('這一輪用全新種子，輪流對白劍、我拒絕、戀露挖掘局面，七種類型都保留。更新只沿具名特徵走能改選目標的最小一步，雜湊桶不動。連帶改動分成相似、不相關、以及推翻已確認偏好。不相關或推翻已確認偏好的更新不採用。證據不足的比較繼續留著。BLC-4-060 這類過不了信任域的偏好只保存，不強迫學會。5,000 場完整對戰沒有開跑。');
 lines.push('');
 lines.push('## 挖掘');
 lines.push('- 版本：'+(report.codeVersion||''));
 lines.push('- 停止點：'+(report.stopped||'沒有寫入'));
 if(report.stopReasons?.length)lines.push('- 說明：'+report.stopReasons.join('；'));
 lines.push('- 正式限制：Hard Search 2 節點 '+(report.limits?.nodes??'')+'，Hard cap '+(report.limits?.hardCap??'')+'，權重範圍 ±'+(report.limits?.clip??'')+'，單步 '+(report.limits?.stepCap??'')+'，混合倍率 '+(report.limits?.scale??''));
 if(report.mined){
  lines.push('- 挖掘對局：'+report.mined.games+' 場，可見決策 '+report.mined.decisions+'，收錄 '+report.mined.stored+' 個帶內局面');
  lines.push('- 種子：每種對手 '+report.mined.seedsPerOpponent+' 個，從 '+report.mined.firstSeed+' 起，不與 v4-B 重疊');
 }
 lines.push('');
 lines.push('### 收錄局面');
 lines.push(...table(report.mined?.table));
 lines.push('');
 lines.push('### 進入分支估計的局面');
 if(report.selected)lines.push('選入 '+report.selected.n+' 個，涵蓋 '+report.selected.buckets+' 類。對手：'+countLine(report.selected.opponents)+'。');
 lines.push(...table(report.selected?.table));
 if(report.replayable)lines.push('', '可重現 '+report.replayable.n+' 個，重現時動作已不合法而剔除 '+report.replayable.dropped+' 個。');
 lines.push('');
 lines.push('## 偏好');
 if(report.rollouts){
  lines.push('- 分支對局：'+report.rollouts.games+'。完成配對比例 '+((report.rollouts.finishedRate||0)*100).toFixed(1)+'%。證據足夠 '+report.rollouts.usable+'，證據不足 '+report.rollouts.insufficient);
 }
 if(!report.preferences?.length)lines.push('沒有區間排除 0 的比較。這些局面留在證據不足，沒有進入更新。');
 else{
  lines.push('區間含 0 的比較沒有進入更新。下面每一筆都是完成的配對延續。');
  for(const row of report.preferences){
   lines.push('- '+bucket(row.bucket)+'／'+deck(row.opponent)+'：偏好 '+describe(row.preferred,row.preferredCard)+'，另一邊 '+describe(row.other,row.otherCard)+'，平均差 '+row.mean.toFixed(2)+'，區間 '+row.low.toFixed(2)+' 到 '+row.high.toFixed(2)+'，完成 '+row.n+' 次');
  }
 }
 lines.push('');
 lines.push('## 更新');
 if(!report.updates?.length)lines.push('沒有可以評估的已確認偏好。');
 for(const row of report.updates||[]){
  lines.push('### '+(row.id?row.id.slice(0,8):row.pair)+'（'+(STATUS[row.status]||row.status)+'）');
  if(row.preferred)lines.push('- 偏好：'+describe(row.preferred,row.preferredCard)+'；另一邊：'+describe(row.other,row.otherCard));
  if(row.mean!=null)lines.push('- 平均差 '+row.mean.toFixed(2)+'，完成 '+row.n+' 次。同對比的其他確認：'+(row.confirmations?.length||0)+' 筆');
  if(row.alpha!=null)lines.push('- 沿具名特徵的比例：'+row.alpha.toFixed(4)+'，最大座標改變 '+(row.maxAbs||0).toFixed(4)+'，雜湊桶移動 '+(row.hashMoved||0));
  if(row.contradiction!=null)lines.push('- 連帶：相似 '+row.similar+'、不相關 '+row.unrelated+'、推翻已確認 '+row.contradiction);
  if(row.legacy)lines.push('- 舊基準（選中除了目標最多 1、未選入 0）：選中 '+row.legacy.selectedChanges+'、未選入 '+row.legacy.holdoutChanges+'，'+(row.legacy.pass?'通過對照':'對照未過'));
  if(row.deltas?.length)lines.push('- 會動到的權重：'+row.deltas.slice(0,4).map(delta=>delta.name+' '+(delta.delta>0?'+':'')+delta.delta.toFixed(3)).join('、'));
  if(row.reasons?.length)lines.push('- '+row.reasons.join('；'));
  const shown=(row.changes||[]).slice(0,8);
  for(const change of shown){
   const where=change.source==='prior'?'上一輪':'這一輪';
   lines.push('  - '+change.relation+'／'+change.evidence+'／'+where+'：'+bucket(change.bucket)+'／'+deck(change.opponent)+' '+change.id.slice(0,8)+' '+describe(change.before,change.beforeCard)+' → '+describe(change.after,change.afterCard));
  }
  if((row.changes||[]).length>shown.length)lines.push('  - 其餘 '+(row.changes.length-shown.length)+' 筆記在 update.json');
 }
 lines.push('');
 if(report.adopted){
  lines.push('## 採用的一步');
  lines.push('採用 '+report.adopted.id.slice(0,8)+'。權重有差 '+report.adopted.deltas.length+' 個。這只表示選牌變了，不表示棋力提升。沒有跑開發驗證，也沒有跑正式挑戰。');
  for(const delta of report.adopted.deltas.slice(0,8)){
   lines.push('- '+delta.name+'：'+delta.before.toFixed(3)+' → '+delta.after.toFixed(3));
  }
 }else{
  lines.push('## 採用的一步');
  lines.push('這一輪沒有採用任何權重。過不了信任域、單步改不了、或證據不足的偏好都留在資料裡，之後可以重新評估。');
 }
 lines.push('');
 lines.push('正式 v2、Hard Search 2、Hard cap 7、權重範圍、單步限制都沒有改。沒有合併 main，沒有部署。');
 lines.push('');
 return lines.join('\n');
}
