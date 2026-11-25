import {BUCKET_LABEL} from '../../v4b2/lib/protocol.mjs';
import {signatureKey} from '../../v5d/lib/compare.mjs';

const NAMES={'white-sword':'白劍鏡像','reject-blue':'我拒絕',renruki:'戀露'};
function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function prob(value){
 if(!Number.isFinite(value))return '—';
 if(value>0&&value<0.001)return value.toExponential(2);
 return value.toFixed(3);
}
function count(value){
 return Number.isFinite(value)?String(value):'—';
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
 return entries.map(([kind,times])=>kind+' '+times+' 次').join('，')+'。';
}
function favor(row){
 if(row.favor==='B')return '較好的是 '+(row.labelB||'B');
 if(row.favor==='A')return '較好的是 '+(row.labelA||'A');
 return '沒有方向';
}
function line(row){
 const place=[BUCKET_LABEL[row.bucket]||row.bucket,NAMES[row.opponent]||row.opponent].filter(Boolean).join('，');
 const gate=row.confirmed?'，已確認。':'，未確認。';
 return '- '+row.id+'（'+row.role+'，對局 '+row.seed+(place?'，'+place:'')+'）：'+row.labelA+' → '+row.labelB
  +'，平均差 '+num(row.mean)+'，區間 ['+num(row.low)+', '+num(row.high)+']，雙尾 p '+prob(row.pTwo)+'，'+favor(row)+gate;
}
function contrast(block){
 if(!block)return '這 8 個局面的平均差沒有同時出現兩個方向。';
 const keys=[['energy','可用能量'],['apReady','剩餘 AP'],['hand','自己的手牌張數'],['life','自己的生命'],['oppLife','對手生命'],['oppFront','對手前線張數']];
 const bits=keys.map(([key,label])=>{
  const row=block.table[key];
  return label+' '+num(row.end)+' / '+num(row.activate);
 });
 return '平均差為負的 '+block.end+' 個局面，對平均差為正的 '+block.activate+' 個：'+bits.join('，')+'。數字是結束行動較好 / 起動較好。這是事後描述，不用來安裝新規則。';
}
export function renderReport(study){
 const rows=study.rows||[];
 const lines=rows.map(line);
 const games=study.gameInterval;
 const gameText=games?'驗證組以原始對局為單位的平均差 '+num(games.mean)+'，95% 區間 ['+num(games.low)+', '+num(games.high)+']，對局 '+count(games.n)+'。區間含 0 只表示這幾個對局看不出穩定差距。':'驗證組的對局數還不夠算區間。';
 const match=study.matches;
 const decks=match?Object.entries(match.decks||{}).map(([id,deck])=>[
  '### '+(NAMES[id]||id),
  '決策層先攻 '+record(deck.residualFirst)+'，決策層後攻 '+record(deck.residualSecond)+'。',
  'v2 先攻 '+record(deck.v2First)+'，v2 後攻 '+record(deck.v2Second)+'。',
  deck.kind==='paired'?'決策層全場 '+record(deck.residual)+'，v2 全場 '+record(deck.v2)+'。':'決策層全場 '+record(deck.residual)+'。',
  interval(deck.delta)
 ].join('\n')).join('\n\n'):'沒有打 192 場。'+(study.installed?'規則已建立，但診斷沒有完成。':'沒有通過獨立驗證的規則，就不打診斷，也不新增權重。');
 const fair=match?['## 公平診斷','192 場打完 '+study.finished+' 場，非法 '+study.illegal+'。實際改選：'+kinds(study.kinds),decks].join('\n\n'):'## 公平診斷\n\n'+decks;
 const ruleText=study.installed&&study.rules?.length
  ?'已凍結並安裝 '+study.rules.map(rule=>signatureKey(rule.loser)+' → '+signatureKey(rule.winner)).join('；')+'。這條規則只在兩個動作都在 Hard cap 7 裡、而且 v2 選了較差的那個時才改選。它不會在沒有比較過的其他動作上禁止起動。'
  :(study.reason?'這次沒有安裝規則：'+study.reason+'。':'這次沒有安裝規則。');
 return [
  '# 白劍 AI v5-D.1：高密度獨立泛化驗證',
  '比較層沿用 v5-D，沒有換成新的學習架構。正式 v2 的 115 個權重維持凍結，雜湊 '+study.official+'。070 殘差維持權重 '+study.frozenWeight+'，沒有重調，也沒有算進診斷。沒有規則時，選擇和 v2 相同。',
  '事先登記：每個對手最多 80 場。湊滿 8 個不同原始對局，而且至少兩個對手各有 2 場，就停止挖掘。同一對局只留一個局面，並且只進一個分組。每個對手內部偶數訓練、奇數驗證。沒有 8 組篩選，也沒有 -0.25 門檻。每個局面直接 66 組，分支 '+count(study.games)+' 場，不含挖掘。雙尾精確符號檢定，Holm 分別作用在訓練組和驗證組。不因結果追加場次。',
  '挖掘 '+((study.mined||{}).games||0)+' 場，這類局面 '+count((study.mined||{}).positions)+' 個，不同對局 '+count((study.mined||{}).gamesDistinct)+' 個，列入名單 '+count((study.mined||{}).selected)+' 個。只有一個對局的對手：'+((study.singletonOpponents||[]).join('、')||'沒有')+'。',
  '## 每個局面',
  lines.length?lines.join('\n'):'沒有進入名單的局面。',
  '訓練組已確認 '+count(study.trainConfirmed)+' 個，其中支持結束行動 '+count(study.trainEnd)+' 個、支持起動 '+count(study.trainActivate)+' 個。驗證組已確認 '+count(study.validationConfirmed)+' 個，其中支持結束行動 '+count(study.validationEnd)+' 個、支持起動 '+count(study.validationActivate)+' 個。未確認只表示證據不足，不表示兩個動作等價。',
  '## 泛化',
  gameText,
  '驗證組平均差為負 '+count(study.validationNegative)+' 個，為正 '+count(study.validationPositive)+' 個，為 0 '+count(study.validationTie)+' 個。',
  contrast(study.contrast),
  ruleText,
  '## 和殘差的比較',
  (study.leads||[]).map(row=>'- '+row.id+'：v2 領先 '+num(row.lead)+' 分，殘差最多移動 36 分，'+(row.canFlip?'殘差有機會改選。':'殘差到邊界仍選不到。')).join('\n')||'沒有可比較的局面。',
  '權重上限沒有放寬。沒有為 BLC-4-060 寫無條件禁令。',
  fair,
  '沒有規則時與 v2 一致。Hard cap、合法動作、隱藏視窗和非比較過的其他候選動作維持 v5-D 的測試。這一輪不採用、不部署，沒有寫入權重，也沒有啟動 5,000 場。'
 ].filter(Boolean).join('\n\n')+'\n';
}
