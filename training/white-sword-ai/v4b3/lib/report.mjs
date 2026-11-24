// Traditional Chinese report for the constrained search. No weight is adopted.
import {BUCKET_LABEL,DECK_LABEL} from '../../v4b2/lib/protocol.mjs';
import {directedInterval} from './verify.mjs';

const TYPE={
 next:'通過',activate:'啟動',move:'移動',play:'打出',chooseHandLimit:'選擇手牌',
 attack:'攻擊',raid:'突襲',chooseBlock:'阻擋',event:'事件',extraDraw:'額外抽牌',
 chooseDiscardGate:'棄牌',chooseLineSlot:'選擇格子'
};
function deck(id){return DECK_LABEL[id]||id||'';}
function bucket(id){return BUCKET_LABEL[id]||id||'';}
function num(value,digits=2){
 if(value==null||Number.isNaN(value))return '沒有';
 return Number(value).toFixed(digits);
}
function signed(value){
 const text=num(value,3);
 return value>0?'+'+text:text;
}
function describe(key,card){
 try{
  const parsed=JSON.parse(key);
  const parts=[TYPE[parsed.type]||parsed.type];
  if(Number.isInteger(parsed.slot))parts.push('格 '+parsed.slot);
  if(card)parts.push(card);
  return parts.join(' ');
 }catch{return card||'通過';}
}
function preferenceLine(row){
 const name=describe(row.preferred,row.preferredCard)+'，另一邊 '+describe(row.other,row.otherCard||null);
 return bucket(row.bucket)+'／'+deck(row.opponent)+'：'+name;
}
function count(rows,kind,source){
 return rows.filter(row=>(!kind||row.kind===kind)&&(!source||row.source===source)).length;
}
function games(rows,kind,source){
 return rows.filter(row=>(!kind||row.kind===kind)&&(!source||row.source===source))
  .reduce((sum,row)=>sum+(row.games||0),0);
}
function weightLine(weights){
 if(!weights?.length)return '沒有移動座標';
 return weights.map(row=>row.name+' '+signed(row.delta)).join('、');
}
function changeLine(row){
 const card=(row.beforeCard||'通過')+' → '+(row.afterCard||'通過');
 return row.id.slice(0,8)+' '+bucket(row.bucket)+'／'+deck(row.opponent)+' '+card;
}
export function renderReport(study,verification){
 const lines=[];
 const targets=study.targets||[];
 const quiet=targets.filter(row=>row.search?.status==='zero-impact');
 const coupled=targets.filter(row=>row.search?.status==='impact');
 const blocked=targets.filter(row=>row.search?.status==='target-infeasible'||row.search?.status==='anchor-infeasible');
 lines.push('# 白劍 AI v4-B.3 受約束的策略更新','');
 lines.push('這一輪要分清的是：單步方盒裡還有沒有一組權重，能學會 v2 還沒選到的偏好，同時保住其他局面的實際選牌。搜尋範圍是 Hard cap 7、單步 1.5、權重 −6～6，雜湊桶維持凍結。正式權重仍是 v2，沒有採用任何更新，也沒有改 Hard Search 2。');
 lines.push('');
 lines.push('## 結論');
 if(quiet.length){
  lines.push('有 '+quiet.length+' 個偏好，沿特徵差的射線會改到別的局面，但方盒裡存在另一組權重，121 個已檢查局面裡只有目標本身換了選牌。這部分是更新演算法的問題，特徵還表達得了。');
 }
 if(coupled.length){
  lines.push('有 '+coupled.length+' 個偏好找得到權重，但每一個都有一個局面用到同一張卡的特徵，單步方盒裡任何能改選目標的權重都會連它一起改。射線上其他不相關的改動則可以避開。');
 }
 if(blocked.length){
  lines.push('有 '+blocked.length+' 個偏好在整個單步方盒裡都沒有解，雜湊桶放開之後仍然沒有。現有特徵加上單步 1.5 到不了這些對比。');
 }
 lines.push('權重沒有寫進模型。名義上區間排除 0 的比較，多數只靠 8 或 16 次，而且會在看起來顯著時停止抽樣。42 次比較裡，Benjamini-Hochberg 只留下 1 個 v2 本來就選對的阻擋。');
 if(verification?.rows?.length){
  const fresh=verification.rows.filter(row=>row.kind==='target').map(row=>({row,directed:directedInterval(row)}));
  const held=fresh.filter(item=>item.directed.low>0);
  const reversed=fresh.filter(item=>item.directed.high<0);
  const releases=(verification.rows||[]).filter(row=>row.kind==='release');
  const releaseOpen=releases.filter(row=>row.low<=0&&row.high>=0);
  const reversedText=reversed.map(item=>item.row.positionId.slice(0,8)+' 偏向 '+(item.row.otherCard||'通過')).join('、');
  lines.push('新種子固定再抽 16 次。'+fresh.length+' 個方盒學得會的原偏好裡，原方向再次排除 0 的有 '+held.length+' 個，方向反過來且排除 0 的有 '+reversed.length+' 個'+(reversedText?'（'+reversedText+'）':'')+'。連帶局面 '+releases.length+' 個，其中新區間含 0 的有 '+releaseOpen.length+' 個。');
 }
 lines.push('');
 lines.push('## 搜尋');
 lines.push('- 版本：'+(study.codeVersion||''));
 lines.push('- 正式限制：Hard Search 2 節點 '+(study.limits?.nodes??'')+'，Hard cap '+(study.limits?.hardCap??'')+'，權重範圍 ±'+(study.limits?.clip??'')+'，單步 '+(study.limits?.stepCap??'')+'，混合倍率 '+(study.limits?.scale??''));
 lines.push('- 檢查局面：'+study.watch+' 個。v4-B.2 的平衡池，加上 v4-B 選入的局面');
 lines.push('- 保護對象：除了正在學的那一個偏好，其餘局面的目前選牌都要保住。通過多重比較、而且 v2 已經選對的偏好不可放開');
 lines.push('- 每個約束都要求目標動作的分數高過帶內每一個其他動作。只保住兩個被點名動作的順序、讓第三個動作變成首選，算沒有通過');
 lines.push('- 採用：'+(study.adopted?'有':'沒有')+'。v2 檔案雜湊 '+(study.official||'').slice(0,12));
 if(study.anchors?.length){
  lines.push('- 不可放開的錨點：'+study.anchors.map(row=>row.id.slice(0,8)+' '+bucket(row.bucket)+'／'+deck(row.opponent)+' '+(row.card||'')).join('、'));
 }
 lines.push('');
 lines.push('## 多重比較');
 lines.push('同一輪的全部比較一起校正，含證據不足的那些。p 值用區間反推的常態近似，而且原始流程會在區間排除 0 時停抽，所以這些 p 值偏小。');
 for(const screen of study.screens||[]){
  const usable=screen.rows.filter(row=>row.usable);
  const kept=screen.rows.filter(row=>row.adjusted);
  lines.push('- '+(screen.source==='v4b2'?'v4-B.2':'v4-B')+'：'+screen.rows.length+' 次比較，名義上 '+usable.length+' 個區間排除 0，校正後留下 '+kept.length+' 個'+(kept.length?'（'+kept.map(row=>row.id.slice(0,8)+' z='+num(row.z,2)).join('、')+'）':''));
 }
 lines.push('');
 lines.push('## 逐個偏好');
 if(!targets.length)lines.push('沒有 v2 選錯、而且名義上有區間的偏好。');
 for(const row of targets){
  lines.push('### '+row.id.slice(0,8)+' '+preferenceLine(row));
  lines.push('- 原樣本：平均差 '+num(row.mean)+'，區間 '+num(row.low)+' 到 '+num(row.high)+'，完成 '+row.n+' 次，p='+num(row.p,4)+'，校正後'+(row.adjusted?'留下':'沒有留下'));
  lines.push('- v2 目前選 '+ (row.currentCard||'通過')+'。帶內 '+row.band+' 個動作');
  lines.push('- 單步最大能補的分差 '+num(row.swing?.named)+'，目前落後 '+num(row.swing?.gap)+'。雜湊桶放開後最大 '+num(row.swing?.open));
  const rayStatus={flipped:'已改選',short:'走完單步仍沒改選',already:'更新前已是這個選牌',identical:'特徵相同',clipped:'權重貼著邊界'}[row.ray?.status]||row.ray?.status||'';
  lines.push('- 射線：'+rayStatus+'，比例 '+(row.ray?.alpha==null?'沒有':num(row.ray.alpha,3))+'，改到 '+((row.ray?.changes||[]).length)+' 個其他局面'+(row.ray?.third?'，而且目標帶內冒出第三個動作':''));
  for(const change of row.ray?.changes||[])lines.push('  - 射線連帶：'+changeLine(change));
  if(row.search?.ok){
   lines.push('- 方盒：權重絕對值合計 '+num(row.search.objective,3)+'。'+weightLine(row.search.weights));
   lines.push('- 必須放開：'+(row.search.necessary.length?row.search.necessary.map(id=>id.slice(0,8)).join('、'):'沒有')+'。有條件才衝突：'+(row.search.conditional.length?row.search.conditional.map(id=>id.slice(0,8)).join('、'):'沒有'));
   if(row.changes?.length){
    for(const change of row.changes)lines.push('  - 方盒實際改到：'+changeLine(change));
   }else lines.push('- 方盒實際改到的其他選牌：沒有');
  }else{
   lines.push('- 方盒：無解。'+(row.hashFree?.ok?'放開雜湊桶之後有解，這一輪仍不採用':'放開雜湊桶之後仍然無解'));
  }
  lines.push('');
 }
 lines.push('## 新種子');
 if(!verification)lines.push('這一輪還沒有對有潛力的更新重抽。');
 else{
  lines.push('只重抽方盒找得到權重的偏好，以及它必須放開的局面。每個固定 16 組成對，鹽值是局面種子加 '+verification.salt+'。目標的平均差改成「原偏好那一邊減去另一邊」，所以正值才代表第一輪的方向又出現。連帶局面的平均差是「更新後的動作減去 v2 的動作」。這 '+verification.rows.length+' 筆是看到第一輪結果後才選的，固定樣本，不再加抽。五筆一起做 Benjamini-Hochberg。');
  if(verification.skipped?.length)lines.push('無法重現而跳過：'+verification.skipped.map(row=>row.checkId+' '+row.reason).join('、'));
  for(const row of verification.rows||[]){
   const directed=directedInterval(row);
   const title=row.kind==='target'
    ?'目標 '+row.positionId.slice(0,8)+'，原偏好 '+(row.preferredCard||'通過')+' 勝過 '+(row.otherCard||'通過')
    :'連帶 '+row.positionId.slice(0,8)+'，更新後的 '+(row.afterCard||'通過')+' 勝過 v2 的 '+(row.beforeCard||'通過');
   let screen='這一批校正後沒有留下';
   if(row.adjusted&&directed.high<0)screen='這一批校正後留下的是相反方向';
   else if(row.adjusted&&directed.low>0)screen='這一批校正後留下原方向';
   else if(row.adjusted)screen='這一批校正後留下';
   lines.push('- '+title+'：新平均差 '+num(directed.mean)+'，區間 '+num(directed.low)+' 到 '+num(directed.high)+'，完成 '+row.n+'／'+row.pairs+'，未完成配對 '+row.unfinished+'，p='+num(row.p,4)+'，'+screen);
  }
  lines.push('對局數 '+verification.games+'。完成配對比例 '+num((verification.finishedRate||0)*100,1)+'%。');
 }
 lines.push('');
 lines.push('## 樣本花在哪裡');
 const classes=study.classes||[];
 lines.push('兩個存檔裡有勝負的延續合計 '+games(classes)+' 場。v4-B.2 '+games(classes,null,'v4b2')+' 場，v4-B '+games(classes,null,'v4b')+' 場。v4-B.2 當輪分支記錄是 1200 場，其中含未完成的配對。');
 lines.push('v4-B.2 的 7 個名義偏好裡，v2 已經選對 '+count(classes,'aligned','v4b2')+' 個，方盒學得會 '+count(classes,'learnable','v4b2')+' 個，單步到不了 '+count(classes,'beyond-one-step','v4b2')+' 個。');
 const extended=classes.filter(row=>row.kind==='aligned'&&row.attempts>8);
 if(extended.length){
  const extra=extended.reduce((sum,row)=>sum+(row.attempts-8)*2,0);
  lines.push('v2 已經選對、卻仍從 8 次補到更多的有 '+extended.length+' 筆，多出來的分支對局 '+extra+' 場。');
 }
 lines.push('下一輪仍涵蓋白劍、我拒絕、戀露和七種類型。8 次之後，v2 已經選到區間支持的那一邊就停止。v2 沒選到時，先看單步方盒：無解就只把方向存下來，不再補到 24。方盒有解的，才用新種子重現，並對少數必須放開的局面做配對。');
 lines.push('');
 lines.push('## 沒有做的事');
 lines.push('沒有重跑 1,200 場平衡分支，沒有換神經網路，沒有 5,000 場完整對戰，沒有把實驗權重寫進 v2。BLC-4-060 的兩筆偏好繼續只保存。檢查範圍是這 121 個存檔局面，看不見的局面仍可能被同一組權重碰到。');
 lines.push('');
 return lines.join('\n');
}
