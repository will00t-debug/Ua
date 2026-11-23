// Traditional Chinese report. Training, weight changes and strength stay separate.
const DECK={
 'white-sword':'白劍','reject-blue':'我拒絕',renruki:'戀露',
 'hard-white':'Hard Search 2 白劍','hard-reject':'Hard Search 2 我拒絕','hard-renruki':'Hard Search 2 戀露',
 v2:'v2','v4a2':'v4-A.2 邊際槓桿',elite:'v4-A.1 精英'
};
function pct(value){
 return Number.isFinite(value)?(value*100).toFixed(1)+'%':'沒有數值';
}
function points(value){
 return Number.isFinite(value)?(value*100).toFixed(2)+' 個百分點':'沒有數值';
}
function interval(ci){
 if(!ci||!Number.isFinite(ci.low)||!Number.isFinite(ci.high))return '沒有區間';
 return points(ci.low)+' 到 '+points(ci.high);
}
const BUCKET={
 'early-energy':'前期能量',ap:'AP','line-move':'移動','mid-entry':'中盤進場',
 raid:'Raid','attack-defense':'攻防','late-pressure':'殘局'
};
function labelKey(key){
 if(DECK[key])return DECK[key];
 if(BUCKET[key])return BUCKET[key];
 if(typeof key==='string'&&key.includes('/')){
  const [kind,deck]=key.split('/');
  const left=DECK[kind]||BUCKET[kind]||kind;
  const right=DECK[deck]||deck;
  return left.endsWith(right)?left:left+'／'+right;
 }
 return key;
}
function line(items){
 return Object.entries(items||{}).map(([key,count])=>labelKey(key)+' '+count).join('、')||'沒有';
}
const TYPE={
 next:'通過',activate:'啟動',move:'移動',play:'打出',chooseHandLimit:'選擇手牌',
 attack:'攻擊',raid:'突襲',chooseBlock:'阻擋',event:'事件',extraDraw:'額外抽牌'
};
const LINE={front:'前線',energy:'能量區'};
function describe(key,card){
 try{
  const parsed=JSON.parse(key);
  const parts=[TYPE[parsed.type]||parsed.type];
  if(parsed.mode)parts.push(parsed.mode);
  if(parsed.line)parts.push(LINE[parsed.line]||parsed.line);
  if(Number.isInteger(parsed.slot))parts.push('格 '+parsed.slot);
  if(card)parts.push(card);
  else if(parsed.uid)parts.push(parsed.uid);
  return parts.join(' ');
 }catch{return card||key;}
}
export function renderReport(report){
 const lines=[];
 lines.push('# 白劍 AI v4-B 第一輪','');
 lines.push('這一輪先跑 200 場 pilot，再對最多 40 個不同類型的局面做配對分支估計，然後只做一次有界的線性權重更新。5,000 場是之後的訓練上限，這一輪沒有拿來加賽。正式冠軍門檻維持配對 +5 個百分點、信賴區間下限大於 0、120 場鏡像至少 55% 且 Wilson 下限高於 50%、任一基準牌組的點估計不低於 -3 個百分點，並且沒有異常或未完成對局。');
 lines.push('');
 lines.push('## 訓練是否跑完');
 lines.push('- 版本：'+(report.codeVersion||''));
 lines.push('- 停止點：'+(report.stopped||'沒有寫入'));
 if(report.stopReasons?.length)lines.push('- 停止原因：'+report.stopReasons.join('；'));
 lines.push('- pilot：'+(report.pilot?.games??0)+' 場，未完成比例 '+pct(report.pilot?.unfinishedRate)+'，平均 '+Math.round(report.pilot?.meanMs||0)+' 毫秒');
 lines.push('- 對手分布：'+line(report.pilot?.mix));
 if(report.mined)lines.push('- 挖掘：'+report.mined.games+' 場走過，'+report.mined.decisions+' 個可見決策，存下 '+report.mined.stored+' 個帶內局面。類型：'+line(report.mined.counts));
 if(report.selected)lines.push('- 選入估計的局面：'+report.selected.n+' 個，涵蓋 '+report.selected.buckets+' 類。類型：'+line(report.selected.counts)+'。對手：'+line(report.selected.opponents));
 if(report.replayable)lines.push('- 可重現並進入分支的局面：'+report.replayable.n+' 個，重現時動作已不合法而剔除 '+report.replayable.dropped+' 個');
 if(report.rollouts){
  lines.push('- rollout：'+report.rollouts.games+' 局。完成配對比例 '+pct(report.rollouts.finishedRate)+'。證據足夠 '+report.rollouts.usable+' 個，證據不足 '+report.rollouts.insufficient+' 個');
  lines.push('- 證據足夠的類型：'+line(report.rollouts.usableByBucket));
 }
 lines.push('- 實際用掉的對局：'+(report.budgetSpent??0)+'。後續上限 '+report.budgetCap+'，剩下的額度沒有自動續跑');
 lines.push('');
 lines.push('## 學到的動作偏好');
 if(!report.preferences?.length)lines.push('沒有任何局面的勝率差區間排除 0，所以沒有動作偏好進入更新。');
 else{
  lines.push('以下每個偏好都來自同一組隱藏資訊下的配對延續。第一步之後，兩邊的抽牌、觸發和局面各自演變。區間含 0 的比較留在證據不足，沒有拿來更新。');
  for(const row of report.preferences){
   lines.push('- '+labelKey(row.bucket)+' / '+labelKey(row.opponent)+'：偏好 '+describe(row.preferred,row.preferredCard)+'，另一邊 '+describe(row.other,row.otherCard)+'，平均差 '+row.mean.toFixed(2)+'，區間 '+row.low.toFixed(2)+' 到 '+row.high.toFixed(2)+'，完成 '+row.n+' 次');
  }
  const focus={};
  for(const row of report.preferences){
   const key=labelKey(row.bucket)+'／'+labelKey(row.opponent);
   focus[key]=(focus[key]||0)+1;
  }
  lines.push('- 進入更新的分布：'+line(focus)+'。證據不足的 '+(report.rollouts?.insufficient??0)+' 個局面沒有被拿來更新。');
 }
 lines.push('');
 lines.push('## 權重與出牌差異');
 if(!report.learning)lines.push('沒有產生新權重。');
 else{
  const labeled=report.learning.labeled;
  const meaningful=(report.learning.deltas||[]).filter(row=>Math.abs(row.delta)>1e-4).length;
  lines.push('- 有用樣本：'+report.learning.usable+'。權重座標有差 '+report.learning.changedWeights+' 個，其中 '+meaningful+' 個超過 0.001。L2：'+(report.learning.l2||0).toFixed(3));
  const controls=labeled.gaussian?.rates||[];
  const controlText=controls.length&&controls.every(value=>value===controls[0])
   ?'8 個等長隨機對照都是 '+pct(controls[0])
   :'8 個等長隨機對照的中位數是 '+pct(labeled.gaussian?.median);
  lines.push('- 這些樣本在更新前符合標籤 '+pct(labeled.before?.rate)+'，更新後 '+pct(labeled.after?.rate)+'。'+controlText);
  lines.push('- 選中局面的出牌改變：'+report.learning.selectedChoices.changed+' / '+report.learning.selectedChoices.n);
  lines.push('- 沒有拿來訓練的其餘局面，出牌改變：'+report.learning.untouchedChoices.changed+' / '+report.learning.untouchedChoices.n);
  const deltas=(report.learning.deltas||[]).slice(0,8);
  if(!deltas.length)lines.push('- 權重數值沒有變動。');
  else for(const row of deltas)lines.push('- 權重 '+row.name+'：'+row.before.toFixed(3)+' → '+row.after.toFixed(3));
  for(const row of report.learning.selectedChoices.rows||[]){
   lines.push('- 局面 '+row.id+'（'+labelKey(row.bucket)+' / '+labelKey(row.opponent)+'）由 '+describe(row.before,row.beforeCard)+' 改為 '+describe(row.after,row.afterCard));
  }
  for(const row of report.learning.untouchedChoices?.rows||[]){
   lines.push('- 未參與這次更新的局面 '+row.id+'（'+labelKey(row.bucket)+' / '+labelKey(row.opponent)+'）由 '+describe(row.before,row.beforeCard)+' 改為 '+describe(row.after,row.afterCard));
  }
 }
 lines.push('');
 lines.push('## 開發驗證');
 if(!report.dev)lines.push('新種子的開發驗證沒有開跑。');
 else{
  lines.push('- '+report.dev.games+' 場，完整配對 '+report.dev.paired.n+'，不完整 '+(report.dev.paired.incomplete||0)+'，缺少對照 '+(report.dev.paired.missing||0));
  lines.push('- 配對差 '+points(report.dev.paired.delta)+'，95% 區間 '+interval(report.dev.paired.ci));
  for(const deck of report.dev.decks||[])lines.push('- 對'+DECK[deck.id]+'：'+points(deck.delta)+'，區間 '+interval(deck.ci));
  for(const warning of report.dev.entry?.warnings||[])lines.push('- 退步警訊（'+DECK[warning.id]+'）：'+warning.text);
  lines.push(report.dev.entry?.enter?'- 開發驗證達到進入正式挑戰的條件。':'- 開發驗證沒有進入正式挑戰。');
 }
 lines.push('');
 lines.push('## 棋力');
 if(report.challenge){
  lines.push('- 正式挑戰 '+report.challenge.games+' 場。配對差 '+points(report.challenge.paired.delta)+'，區間 '+interval(report.challenge.paired.ci));
  lines.push('- 直接鏡像 '+pct(report.challenge.mirror?.p)+'（'+report.challenge.mirror?.wins+'/'+report.challenge.mirror?.n+'），Wilson 下限 '+pct(report.challenge.mirror?.low));
  for(const deck of report.challenge.decks||[])lines.push('- 對'+DECK[deck.id]+'：'+points(deck.delta));
  lines.push(report.promoted?'- 正式門檻通過。實驗冠軍寫在 v4-B 的實驗檔，正式 v2 沒有更換。':'- 正式門檻沒有通過。實驗冠軍仍是空的。');
 }else if(report.preliminaryStrength){
  lines.push('開發驗證有初步的正差，正式挑戰的結論寫在上面。');
 }else{
  lines.push('這一輪沒有足夠證據說新模型比 v2 更強。權重或出牌有變化，只代表模型變了，不代表棋力提升。實驗冠軍仍是空的，正式 v2 與 Hard Search 2 維持原樣。');
 }
 lines.push('');
 lines.push('沒有合併 main，沒有部署。');
 return lines.join('\n')+'\n';
}
