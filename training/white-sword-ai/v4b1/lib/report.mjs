// Traditional Chinese feasibility report. Numbers come from the audit object.
const BUCKET={
 'early-energy':'前期能量',ap:'AP','line-move':'移動','mid-entry':'中盤進場',
 raid:'Raid','attack-defense':'攻防','late-pressure':'殘局'
};
const DECK={'white-sword':'白劍','reject-blue':'我拒絕',renruki:'戀露'};
function classText(verdict,methods){
 if(verdict.label==='已符合')return '不歸入這三類。更新前已經選中這個偏好。';
 if(verdict.class===2)return '第 2 類。'+verdict.reason;
 if(verdict.class===3)return '第 3 類。'+verdict.reason;
 const flipped=(methods||[]).some(method=>method.targetChanged&&method.changedWeights>0);
 if(flipped)return '不屬於第 1 類。特徵分得開，單筆更新也改了選牌。'+verdict.reason;
 return '第 1 類。'+verdict.reason+' 這次試過的更新沒有把選牌改成偏好。';
}
function num(value){
 return Number.isFinite(value)?value.toFixed(2):'沒有';
}
function describe(key,card){
 try{
  const parsed=JSON.parse(key);
  const type={next:'通過',activate:'啟動',move:'移動',play:'打出',chooseHandLimit:'選擇手牌'}[parsed.type]||parsed.type;
  const parts=[type,parsed.mode,parsed.line,Number.isInteger(parsed.slot)?'格 '+parsed.slot:null,card||parsed.uid];
  return parts.filter(value=>value!==null&&value!==undefined&&value!=='').join(' ');
 }catch{return card||key;}
}
function changeText(rows){
 if(!rows||!rows.length)return '沒有';
 return rows.map(row=>row.id.slice(0,8)+' '+BUCKET[row.bucket]+'/'+DECK[row.opponent]+'：'+describe(row.before,row.beforeCard)+' → '+describe(row.after,row.afterCard)).join('；');
}
function methodLine(method){
 const target=method.changedWeights===0&&method.targetChanged
  ?'更新前已是目標，權重沒有動'
  :method.targetChanged?'目標已改選':'目標沒有改選';
 return '- '+method.name+'：'+target
  +'。其他選中局面連帶 '+method.collateralSelected+'/'+method.collateralSelectedN+'（'+changeText(method.collateralSelectedRows)+'）'
  +'。沒有進入這 40 個的帶內局面連帶 '+method.collateralPool+'/'+method.collateralPoolN+'（'+changeText(method.collateralPoolRows)+'）'
  +'。雜湊座標變動 '+method.hashMoved+' 個，最大 '+num(method.largestHash)
  +'。變動權重 '+method.changedWeights+' 個，L2 '+num(method.l2);
}
export function renderAudit(audit){
 const lines=[];
 lines.push('# 白劍 AI v4-B.1 決策可學習性','');
 lines.push('這一輪沒有新的完整對局。四筆偏好、權重和局面都來自已經保存的 v4-B 結果。Hard cap 維持 7，權重範圍維持 [-6, 6]，單步上限維持 1.5。達不到的偏好只標記，不放寬這些限制。');
 lines.push('');
 lines.push('## 分類');
 lines.push('1. 現有特徵可以學會，但更新方法不足。');
 lines.push('2. 現有特徵無法充分分開局面或動作。');
 lines.push('3. Hard cap、權重範圍或單步上限使目前條件下無法學會。');
 lines.push('已經選中的偏好另外標成「已符合」，不算這次學到。');
 lines.push('');
 for(const row of audit.rows){
  const verdict=row.verdict;
  lines.push('## '+BUCKET[row.bucket]+' / '+DECK[row.opponent]+'（n='+row.n+'，平均差 '+num(row.mean)+'）');
  lines.push('- 偏好：'+describe(row.preferredKey,row.card));
  lines.push('- 分類：'+classText(verdict,row.methods));
  lines.push('- Hard cap 內：'+(verdict.inHardCap?'是':'否')+'。與帶內最高硬分的差距 '+num(verdict.hardGap)+'。');
  lines.push('- 相對目前較高的另一個動作，分差 '+num(verdict.gapToRival)+'，單步可調整上限 '+num(verdict.swingToRival)+'。');
  lines.push('- 帶內正式選牌：更新前 '+describe(verdict.current)+'。單步能達到的最佳選牌 '+describe(verdict.oneChoice)+'。權重在 [-6, 6] 內能達到的選牌 '+describe(verdict.wideChoice)+'。');
  if(row.live){
   lines.push('- 引擎選牌：v2 '+describe(row.live.v2,row.live.v2Card)+'。與保存帶內的選擇'+(row.live.agree?'一致':'不一致')+'。');
   lines.push('- 引擎上的單步最佳權重選到 '+describe(row.live.maximal,row.live.maximalCard)+'。權重放到 [-6, 6] 邊界後，引擎選到 '+describe(row.live.wide,row.live.wideCard)+'。原本單筆 logistic 選到 '+describe(row.live.original)+'。凍結雜湊後選到 '+describe(row.live.named)+'。');
  }
  for(const method of row.methods)lines.push(methodLine(method));
  if(row.verdict.label==='已符合'){
   lines.push('- 更新前的引擎選牌已經是偏好。這次 logistic 沒有梯度，不能把「目標仍是偏好」算成學到。');
  }else{
   lines.push('- 新特徵「啟動 BLC-4-060 restTwoMove」只看動作、不看局面。兩個動作的特徵差是 '+num(row.alone.diff)+'，它自己的單步最多 '+num(row.alone.swing)+' 分，分差 '+num(row.alone.gap)+'，'+(row.alone.clears?'可以跨過':'跨不過')+'。');
   if(row.interaction.jointChoice===row.preferredKey){
    lines.push('- 凍結雜湊後，具名特徵的單步極端可以改成偏好。'+(row.alone.diff?'':'這筆新特徵沒有差別，改選來自現有的具名特徵。'));
   }else if(row.interaction.openChoice===row.preferredKey){
    lines.push('- 凍結雜湊時，具名特徵加上新特徵仍然不行。把雜湊也推到單步極端（最大位移 '+num(row.interaction.openHash)+'）才改得了。不採用：新特徵不在正式模型裡，而且這次要靠雜湊位移 1.5。');
   }else{
    lines.push('- 連雜湊和新特徵都推到單步極端，選牌仍然不是偏好。');
   }
  }
  lines.push('');
 }
 const blocked=audit.rows.filter(row=>row.verdict.class===3);
 if(blocked.length){
  lines.push('## 單步上限');
  lines.push('兩筆啟動 BLC-4-060 的偏好，帶內都只有啟動與通過。線性分差就是選牌分差。單步上限用每個有差別的座標、以及該座標實際還能移動的距離加總。這兩筆每一格都能移動完整的 1.5，沒有一格先碰到 [-6, 6]。');
  for(const row of blocked){
   lines.push('- '+row.id+'：分差 '+num(row.verdict.gapToRival)+'，單步上限 '+num(row.verdict.swingToRival)+'，硬分差 '+num(row.verdict.hardGap)+'。單步選牌'+(row.verdict.oneFlips?'改成偏好':'沒有改成偏好')+'；權重放到邊界後'+(row.verdict.wideFlips?'可以改成偏好':'仍然不行')+'。');
  }
  const liveAgrees=audit.rows.every(row=>row.live?.agree);
 const liveBlocked=audit.rows.filter(row=>row.verdict.class===3).every(row=>row.live&&!row.live.maximalIsPreferred);
 lines.push('因此這兩筆是第 3 類：特徵分得開，Hard cap 也擋不住，是單步 1.5 不夠。不提高單步上限，不放寬 Hard cap。四筆裡沒有第 1 類，也沒有第 2 類。');
 const liveWide=audit.rows.filter(row=>row.verdict.class===3).every(row=>row.live?.wideIsPreferred);
 lines.push('引擎選牌'+(liveAgrees?'四筆都和保存的帶內選擇一致':'有局面和帶內選擇不一致')+'。單步最佳權重送進正式 blend 後，第 3 類'+(liveBlocked?'仍然沒有改成偏好':'出現改選，需另查')+'。權重放到邊界後，正式 blend '+(liveWide?'可以改成通過':'仍然不能改成通過')+'。這只說明特徵分得開，這次不把任何權重推到邊界。');
  lines.push('');
 }
 lines.push('## 下一步');
 lines.push('這一輪沒有挖掘，也沒有新對戰。下一輪若做，先用離線篩選，再輪流取樣。');
 lines.push('- 白劍、我拒絕、戀露輪流產生局面，避免白劍先填滿每一類。七種決策類型都保留。');
 lines.push('- 花分支對局之前，先看每個落後動作。若它的單步上限小於目前落後的分差，這局不可能靠合法的一步更新改選，就不花對局。平均差的信賴區間含 0 時仍標成證據不足，不強迫產生偏好。');
 lines.push('- 一次只更新一筆已確認、而且單步改得了選牌的偏好。凍結 h0–h7。目標決策沒有改選就不採用該次權重。這一輪的移動偏好是這種更新：目標會改，雜湊不動，其他選中局面只連帶 1 筆。');
 lines.push('- 兩筆 BLC-4-060 維持第 3 類。不為它們提高權重、單步上限或 Hard cap，也不把「啟動 restTwoMove」加進正式模型。');
 lines.push('- 使用新種子。170000–171003、172000–172229、100000–104999、160000–162229、94000–94016、130000–130016 都不重用。');
 lines.push('');
 lines.push('進入開發對戰前要同時看到四件事：確認過的偏好涵蓋至少三種決策類型和兩個對手；可學習的目標決策在更新後真的改選；非目標局面的連帶改動有上限；沒有單一雜湊特徵主導該次更新。這四項只決定要不要花開發對戰的場次，不代表棋力提升。正式冠軍門檻維持不變。');
 lines.push('');
 lines.push('正式 v2 與 Hard Search 2 沒有改。沒有合併 main，沒有部署。');
 return lines.join('\n')+'\n';
}
