const NAMES={'white-sword':'白劍鏡像','reject-blue':'我拒絕的 Hard Search',renruki:'戀露的 Hard Search'};
function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function prob(value){
 if(!Number.isFinite(value))return '—';
 if(value>0&&value<0.001)return value.toExponential(2);
 return value.toFixed(3);
}
function record(rate){
 if(!rate?.games)return '—';
 const pct=Number.isFinite(rate.rate)?(rate.rate*100).toFixed(2)+'%':'—';
 return rate.wins+'/'+rate.games+'（'+pct+'）';
}
function interval(row){
 if(!row||row.low==null)return '樣本不足';
 const flat=row.low===0&&row.high===0?' 每個種子的配對差都相同，區間沒有寬度，這只代表這一批種子沒有勝負差。':'';
 return '配對差 '+num(row.mean)+'，95% 區間 ['+num(row.low)+', '+num(row.high)+']，種子 '+row.n+'。'+flat;
}
function kinds(map){
 const entries=Object.entries(map||{});
 if(!entries.length)return '沒有記錄到改選。';
 return entries.map(([kind,count])=>kind+' '+count+' 次').join('，')+'。';
}
function direction(row){
 if(row.preferActivate)return '支持起動';
 if(row.preferEnd)return '不支持起動';
 return '其他對照';
}
export function renderReport(study){
 const rows=study.rows||[];
 const lines=rows.map(row=>'- '+row.id+'（'+row.role+'，'+direction(row)+'）：'+row.labelA+' → '+row.labelB
  +'，篩選 '+num(row.screenMean)+(row.confirmMean==null?'，未進確認。':'，確認 '+num(row.confirmMean)+'，p '+prob(row.pOne)+(row.confirmed?'，已確認。':'，未確認。')));
 const leads=(study.leads||[]).map(row=>'- '+row.id+'：v2 領先 '+num(row.lead)+' 分，殘差最多移動 '+num(row.maxMove)+' 分，'
  +(row.canFlip?'殘差有機會改選。':'殘差到邊界仍選不到。')+(row.controlSame?' 凍結的 070 欄位不改這個選擇。':' 凍結的 070 欄位會改這個選擇。'));
 const match=study.matches;
 const decks=match?Object.entries(match.decks||{}).map(([id,deck])=>[
  '### '+NAMES[id],
  '決策層先攻 '+record(deck.residualFirst)+'，決策層後攻 '+record(deck.residualSecond)+'。',
  'v2 先攻 '+record(deck.v2First)+'，v2 後攻 '+record(deck.v2Second)+'。',
  deck.kind==='paired'?'決策層全場 '+record(deck.residual)+'，v2 全場 '+record(deck.v2)+'。':'決策層全場 '+record(deck.residual)+'。',
  interval(deck.delta),
  '改選 '+deck.effects.changes+' 次，發生在 '+deck.effects.gamesWithChange+' 場。沒有改選而獲勝 '+deck.effects.unchangedWin+' 場，沒有改選而落敗 '+deck.effects.unchangedLoss+' 場，改選後獲勝 '+deck.effects.changedWin+' 場，改選後落敗 '+deck.effects.changedLoss+' 場。'
 ].join('\n')).join('\n\n'):'沒有打 192 場。'+(study.installed?' 規則已建立，但診斷沒有完成。':' 沒有通過驗證的規則，就不打診斷，也不新增權重。');
 const fair=match?[
  '## 公平診斷',
  '192 場都打完 '+study.finished+' 場，非法 '+study.illegal+'，v2 對照改選 '+study.v2Changes+'，後備 '+study.fallbacks+'，順序參考 '+study.orders+'，同分 '+study.ties+'。',
  '實際改選的種類：'+kinds(study.kinds)+' 區間含有 0 只表示這一批種子分辨不出差異，不表示兩個模型相同，也不表示已證明安全。',
  decks
 ].join('\n\n'):'## 公平診斷\n\n'+decks;
 return [
  '# 白劍 AI v5-D：獨立局面決策學習層',
  '正式 v2 的 115 個權重維持凍結，雜湊 '+study.official+'。070 殘差對照維持權重 '+study.frozenWeight+'，這一輪沒有重調，也沒有把它算進 192 場。比較層不把分數加進混合評分，所以不必抵消原始評分差。沒有可靠的學習結果時，選擇回到 v2。',
  '抽樣事先登記：每個對手最多 40 場，湊滿 8 個新的起動 BLC-4-060 對結束行動局面就停；不滿 4 個就不做分支。篩選 8 組、門檻 -0.25，確認固定 66 組，單尾精確符號檢定，Holm 作用在整批確認局面。偶數索引訓練，奇數索引驗證。不因結果追加場次。挖掘 '+((study.mined||{}).games||0)+' 場，找到這類局面 '+((study.mined||{}).family||0)+' 個，列入名單 '+((study.mined||{}).selected||0)+' 個。',
  '## 學習',
  study.reason?('這次沒有安裝規則：'+study.reason+'。'):'已安裝一條只含動作種類、自己的卡號和線路的比較規則。規則裡沒有局面編號。',
  lines.length?lines.join('\n'):'沒有進入名單的局面。',
  '支持起動的已確認局面 '+study.forActivate+' 個，不支持起動的已確認局面 '+study.againstActivate+' 個。未確認不表示兩個動作等價，也不表示 v2 的選擇是對的。',
  '## 和殘差的比較',
  leads.length?leads.join('\n'):'沒有可比較的局面。',
  '既有殘差仍受單欄 36 分的移動上限約束。這一輪沒有放寬那個上限，也沒有為 BLC-4-060 寫人工特例。',
  '## 連帶改選與保護',
  '在已保存的局面裡，比較層相對 v2 的硬分上限選擇改了 '+(study.collateral??'—')+' 個。保護局面被改到的有 '+((study.heldMoves||[]).join('、')||'沒有')+'。歷史局面 ee6c '+(study.ee6cMoved?(study.ee6cToNext?'改成結束行動，方向和「不支持起動」一致，但它不是這次的訓練或安裝依據。':'改到了結束行動以外的動作，所以不安裝。'):'維持 v2 的選擇。這不表示已經學會，也不表示已證明安全。'),
  fair,
  '頂端視窗的牌留在行動者牌庫並且維持蓋住。公開局面不列出那些牌，非行動者的觀察也不含那些編號；只有正在選擇的玩家會從私人選項看到視窗。測試鎖住這件事。',
  '這一輪不採用、不部署，沒有寫入權重，也沒有啟動 5,000 場。分支場數 '+study.games+'，不含挖掘。不顯著只表示證據不足。'
 ].join('\n\n')+'\n';
}
