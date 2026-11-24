import {CLASS_LABEL} from './catalog.mjs';
import {BRANCH_BUDGET,LEARNABLE_SLOTS,RESERVED_SLOTS} from './protocol.mjs';

function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function brief(rows){
 if(!rows?.length)return '沒有。';
 return rows.map(row=>{
  const confirm=row.confirmMean==null?'': '，確認 '+num(row.confirmMean)+'，單尾 p '+num(row.pOne,4);
  return row.id+'（'+row.bucket+'／'+row.opponent+'，'+row.labelA+' → '+row.labelB+'，篩選 '+num(row.screenMean)+confirm+'）';
 }).join('；');
}
export function renderReport(study){
 const lines=[];
 const catalog=study.catalog||[];
 lines.push('# 白劍 AI v4-B.7 擴大可靠偏好探索','');
 lines.push(study.verdict||'');
 lines.push('這一輪挖掘全新局面，不再為 BLC-4-070 設計特徵或搜尋權重。正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重範圍、雜湊凍結、規則、冠軍標準和部署都沒有改。');
 lines.push('');
 lines.push('## 挖掘');
 lines.push('對手仍是白劍、我拒絕、戀露。決策類型仍是七個桶。挖掘 '+study.mined.games+' 場，種子和先前的挖掘範圍分開。選進篩選的新局面 '+study.screened+' 個，每個桶和對手最多 '+study.perCell+' 個，沒有用舊局面回填。');
 if(study.table){
  for(const [bucket,counts] of Object.entries(study.table)){
   lines.push('- '+bucket+'：'+Object.entries(counts).map(([name,count])=>name+' '+count).join('、'));
  }
 }
 lines.push('');
 lines.push('## 確認');
 lines.push('每個局面固定篩選 8 組，門檻 −0.25。確認固定 66 組，單尾精確符號檢定，Holm 校正。篩選鹽 '+study.screenSalt+'，確認鹽 '+study.confirmSalt+'，兩組種子分開。可學名額最多 '+LEARNABLE_SLOTS+' 個，方盒無解的保留名額最多 '+RESERVED_SLOTS+' 個。沒有符合條件的候選就不使用名額。');
 lines.push('過篩 '+study.qualified+' 個。進入確認 '+study.candidates+' 個，其中可學 '+(study.roles?.learnable||0)+'、保留 '+(study.roles?.reserved||0)+'。確認留下 '+study.confirmed+' 個。分支場數 '+study.games+'，上限 '+BRANCH_BUDGET+'。');
 lines.push('可學候選：'+brief(study.learnableCandidates));
 lines.push('保留的方盒無解候選：'+brief(study.reservedCandidates));
 lines.push('過篩但沒有拿到名額：'+brief(catalog.filter(row=>row.qualified&&!row.role&&!row.conflict)));
 lines.push('Holm 確認：'+brief(study.confirmedRows));
 lines.push('');
 lines.push('## 分類');
 for(const key of ['safe','collateral','unlearnable','opposite']){
  const rows=catalog.filter(row=>row.class===key);
  lines.push('- '+CLASS_LABEL[key]+'：'+rows.length+' 個'+(rows.length?'。'+brief(rows):'。'));
 }
 const weak=catalog.filter(row=>row.class==='insufficient');
 const seen=weak.filter(row=>row.qualified||row.role);
 lines.push('- '+CLASS_LABEL.insufficient+'：'+weak.length+' 個。其中進過篩選或確認、但沒有形成可靠偏好的是 '+(seen.length?brief(seen):'沒有')+'。');
 lines.push('方向相反的決策不拿來做這一輪的權重更新。之後要用多筆獨立偏好一起評估新特徵，不為單一局面設計例外。');
 lines.push('');
 lines.push('## 已保留的舊資料');
 for(const row of study.retained||[])lines.push('- '+row.id+'：'+row.label+'。'+row.note);
 if(study.feature)lines.push(study.feature.text);
 lines.push('');
 lines.push('## 權重');
 if(!study.candidate){
  lines.push('沒有新的、方向一致且可學的確認偏好，所以沒有建立實驗權重。');
 }else{
  lines.push('實驗候選來自 '+study.candidate.id+'，狀態 '+study.candidate.status+'，L1 '+num(study.candidate.objective)+'。動到的權重：'+((study.candidate.weights||[]).map(row=>row.name+' '+num(row.delta)).join('、')||'沒有')+'。必須放開 '+((study.candidate.necessary||[]).length)+' 個舊局面，改選 '+((study.candidate.changed||[]).length)+' 個。沒有採用，也沒有寫入 v2。');
 }
 lines.push('');
 return lines.join('\n');
}
