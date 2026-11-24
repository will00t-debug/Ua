import {BUCKET_LABEL,DECK_LABEL} from '../../v4b2/lib/protocol.mjs';
import {CLASS_LABEL} from '../../v4b7/lib/catalog.mjs';
import {BRANCH_BUDGET,JOINT_RULE,LEARNABLE_SLOTS,OPPOSITE_RULE,RESERVED_SLOTS} from './protocol.mjs';

function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function deck(name){
 return DECK_LABEL[name]||name||'—';
}
function bucket(name){
 return BUCKET_LABEL[name]||name||'—';
}
function brief(rows){
 if(!rows?.length)return '沒有。';
 return rows.map(row=>{
  const confirm=row.confirmMean==null?'':'，確認 '+num(row.confirmMean)+'，單尾 p '+num(row.pOne,4);
  return row.id+'（'+bucket(row.bucket)+'／'+deck(row.opponent)+'，'+row.labelA+' → '+row.labelB+'，篩選 '+num(row.screenMean)+confirm+'）';
 }).join('；');
}
function weightText(rows){
 if(!rows?.length)return '沒有';
 return rows.map(row=>row.name+' '+num(row.delta)).join('、');
}
function stageText(stage){
 if(!stage)return '沒有執行。';
 if(stage.status==='unmeasured')return '有保護局面缺實測值，這一步中止，沒有把缺值補成 0。';
 if(stage.status==='zero-shifted')return '新欄位在權重 0 時就改了選擇，這一步中止。';
 if(!stage.ok)return '無解（'+stage.status+'）。';
 const raid=stage.releasedRaid?'會放開 067 突襲。':'保存局面裡的 067 突襲維持原選擇。';
 return '有一組合法步，狀態 '+stage.status+'，L1 '+num(stage.objective)+'。動到的權重：'+weightText(stage.weights)+'。改選 '+((stage.changed||[]).length)+' 個保存局面。'+raid+'沒有採用。';
}
function partOf(gap,pattern){
 return (gap?.parts||[]).filter(row=>pattern.test(row.name)).reduce((sum,row)=>sum+row.part,0);
}
export function renderReport(study){
 const lines=[];
 const catalog=study.catalog||[];
 const comparison=study.comparison||[];
 lines.push('# 白劍 AI v4-B.8 多筆可靠偏好的共同策略','');
 lines.push(study.verdict||'');
 lines.push('正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重範圍、雜湊凍結、兩階段確認、固定 66 組、精確符號檢定、Holm、冠軍晉級和部署都沒有改。兩筆可靠偏好不代表棋力提升。');
 lines.push('');
 lines.push('## 事先登記的條件');
 lines.push(JOINT_RULE.text);
 lines.push(OPPOSITE_RULE.text);
 lines.push('');
 lines.push('## 兩筆已確認偏好');
 lines.push('兩筆都是白劍鏡像、中盤進場，v2 目前把 BLC-4-070 打到前線，已確認的偏好是改打能量線。');
 lines.push('');
 lines.push('| 項目 | '+comparison.map(row=>row.id).join(' | ')+' |');
 lines.push('| --- | '+comparison.map(()=>'---').join(' | ')+' |');
 const fact=(label,read)=>'| '+label+' | '+comparison.map(row=>read(row)).join(' | ')+' |';
 lines.push(fact('能源',row=>num(row.facts?.energyTotal,0)));
 lines.push(fact('手牌張數',row=>num(row.facts?.handCount,0)));
 lines.push(fact('手牌還缺的色能源',row=>num(row.facts?.unmet,0)));
 lines.push(fact('能量線能補上的缺口',row=>row.energy?num(row.energy.pay_relief*8):'—'));
 lines.push(fact('剩餘 AP',row=>num(row.facts?.apReady,0)));
 lines.push(fact('我方前線 BP',row=>num(row.facts?.myBp,0)));
 lines.push(fact('對方前線 BP',row=>num(row.facts?.oppBp,0)));
 lines.push(fact('前線空格',row=>row.facts?row.facts.frontEmpty+'/'+row.facts.frontSlots:'—'));
 lines.push(fact('能量線空格',row=>row.facts?row.facts.energyEmpty+'/'+row.facts.energySlots:'—'));
 lines.push(fact('Hard：前線減能量線',row=>num(row.gap?.hard)));
 lines.push(fact('既有權重的差距',row=>num(row.gap?.policy)));
 lines.push(fact('其中凍結雜湊',row=>num(partOf(row.gap,/^h[0-7]$/))));
 lines.push(fact('其中兩條路線權重',row=>num(partOf(row.gap,/^line_(front|energy)$/))));
 lines.push(fact('混合評分差距',row=>num(row.gap?.blend)));
 lines.push(fact('雜湊凍結後的單步上限',row=>num(row.gap?.swing)));
 lines.push(fact('還差',row=>num(row.gap?.shortfall)));
 lines.push('');
 const second=comparison[1];
 if(second?.gap){
  const first=comparison[0];
  const shared=['energyTotal','apReady','handCount','myBp','oppBp','frontEmpty','frontSlots','energyEmpty','energySlots'];
  const same=shared.every(name=>comparison.every(row=>row.facts?.[name]===first?.facts?.[name]));
  if(same){
   lines.push('兩筆的可見局面在這些欄位上相同：能源 '+num(first?.facts?.energyTotal,0)+'、剩餘 AP '+num(first?.facts?.apReady,0)+'、手牌 '+num(first?.facts?.handCount,0)+' 張、我方前線 BP '+num(first?.facts?.myBp,0)+'、對方前線 BP '+num(first?.facts?.oppBp,0)+'、前線空格 '+first?.facts?.frontEmpty+'/'+first?.facts?.frontSlots+'、能量線空格 '+first?.facts?.energyEmpty+'/'+first?.facts?.energySlots+'。手牌還缺的色能源分別是 '+num(first?.facts?.unmet,0)+' 和 '+num(second.facts?.unmet,0)+'。能量線能補上的缺口都是 '+num((first?.energy?.pay_relief||0)*8)+'。');
  }
  lines.push('第二筆 '+second.id+' 的混合評分差距是 '+num(second.gap.blend)+'。Hard 已經讓能量線高 '+num(-second.gap.hard)+' 分。既有權重把前線拉高 '+num(second.gap.policy)+' 分，其中凍結的 h2、h7 佔 '+num(partOf(second.gap,/^h[0-7]$/))+'，line_front 和 line_energy 只淨佔 '+num(partOf(second.gap,/^line_(front|energy)$/))+'。單步不能改雜湊，兩個路線權重最多各移動 1.5，混合評分最多拉近 '+num(second.gap.swing)+'。第二筆還差 '+num(second.gap.shortfall)+'。動作帶只有 '+second.gap.bandSize+' 個動作。第一筆的 Hard 讓能量線高 '+num(-first?.gap?.hard)+'，同樣的權重差距是 '+num(first?.gap?.blend)+'，落在單步上限裡。');
 }
 if(comparison.some(row=>row.diffs)){
  lines.push('能量線減前線的交互差：');
  for(const row of comparison){
   if(!row.diffs)continue;
   lines.push('- '+row.id+'：'+Object.entries(row.diffs).map(([name,value])=>name+' '+num(value)).join('、'));
  }
 }
 lines.push('');
 lines.push('## 共同權重');
 lines.push('保護集合沿用先前保存的局面，錨點仍是硬約束。兩筆目標不在保護集合裡互相打架。');
 lines.push('既有 115 維：'+stageText(study.joint?.stages?.existing));
 lines.push('五個局面交互：'+stageText(study.joint?.stages?.position));
 lines.push('七個已登記交互：'+stageText(study.joint?.stages?.full));
 if(!study.candidate)lines.push('沒有留下實驗候選。');
 else{
  const effects=study.joint?.effects;
  const saved=effects?.saved?.changed||[];
  lines.push('實驗候選使用 '+study.joint.representation+'，狀態 '+study.candidate.status+'，沒有採用，也沒有寫入 v2。');
  if(saved.length){
   lines.push('保存局面裡改選的是：'+saved.map(row=>row.id+'（'+row.beforeLabel+' → '+row.afterLabel+'）').join('；')+'。');
  }
  if(effects?.mine){
  lines.push('v4-B.5 已有挖掘裡，實測覆蓋 '+effects.mine.covered+' 個局面，其中 '+effects.mine.changed+' 個會改選。'+(effects.mine.examples?.length?effects.mine.examples.map(row=>row.id+'（'+row.beforeLabel+' → '+row.afterLabel+'）').join('；')+'。':'')+'這次沒有為這個候選再打新對局。');
 }
 }
 lines.push('');
 lines.push('## 新局面');
 lines.push('對手仍是白劍、我拒絕、戀露。決策類型仍是七個桶。挖掘 '+study.mined.games+' 場，種子是 175500、175520、175540 各 10 個。同一張卡的路線比較先占名額：v2 目前選前線最多 3 個，v2 目前選能量線最多 3 個。某一邊不夠不會用另一邊補。這次前線方向 '+((study.lines?.available||{})['front-kept']??0)+' 個可選、取 '+((study.lines?.taken||{})['front-kept']||0)+' 個；能量線方向 '+((study.lines?.available||{})['energy-kept']??0)+' 個可選、取 '+((study.lines?.taken||{})['energy-kept']||0)+' 個。其餘名額按桶平衡，篩選總數 '+study.screened+'，沒有超過 42，也沒有用舊局面回填。');
 if(study.table){
  for(const [name,counts] of Object.entries(study.table)){
   lines.push('- '+bucket(name)+'：'+Object.entries(counts).map(([opp,count])=>deck(opp)+' '+count).join('、'));
  }
  const thick=[];
  const thin=[];
  for(const [name,counts] of Object.entries(study.table)){
   const values=Object.values(counts);
   if(values.some(count=>count>2))thick.push(bucket(name));
   if(values.length&&values.every(count=>count<=1))thin.push(bucket(name));
  }
  if(thick.length||thin.length)lines.push('路線配額占掉 6 個篩選名額，所以'+(thick.length?thick.join('、')+'有格子超過 2 個':'')+(thick.length&&thin.length?'，':'')+(thin.length?thin.join('、')+'各留 1 個':'')+'。沒有用舊局面把格子補滿。');
 }
 lines.push('');
 lines.push('## 確認');
 lines.push('每個新局面固定篩選 8 組，門檻 −0.25。確認固定 66 組，單尾精確符號檢定，Holm 校正。篩選鹽 '+study.screenSalt+'，確認鹽 '+study.confirmSalt+'。可學名額最多 '+LEARNABLE_SLOTS+' 個，方盒無解的保留名額最多 '+RESERVED_SLOTS+' 個。空名額留空。');
 lines.push('過篩 '+study.qualified+' 個。進入確認 '+study.candidates+' 個，其中可學 '+(study.roles?.learnable||0)+'、保留 '+(study.roles?.reserved||0)+'。確認留下 '+study.confirmed+' 個。新局面分支 '+study.games+' 場，上限 '+BRANCH_BUDGET+'。');
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
 const oppositeRows=catalog.filter(row=>row.class==='opposite');
 const confirmedOpposite=oppositeRows.filter(row=>row.confirmed);
 const screenOpposite=oppositeRows.filter(row=>!row.confirmed);
 if(confirmedOpposite.length&&screenOpposite.length){
  lines.push('相反分類用這一輪的篩選平均判斷。通過 Holm 的是 '+brief(confirmedOpposite)+'。只有篩選、還沒有獨立確認的是 '+brief(screenOpposite)+'。負的平均代表第二個動作更好，正的平均代表目前的第一個動作仍更好。單邊通過還不能稱為可靠的相反偏好，所以沒有進入權重搜尋。');
 }
 lines.push('');
 lines.push('## BLC-4-060 的相反方向');
 const pending=study.opposite||{};
 if(!pending.ran){
  lines.push('兩筆仍只有篩選：a8ea32166942bc90 平均 '+num(pending.rows?.[0]?.screenMean??-0.25)+'，5f868c674f2e1fee 平均 '+num(pending.rows?.[1]?.screenMean??0.25)+'。新局面結算後剩餘 '+num(pending.leftover,0)+' 場，不夠兩筆各 66 組，所以這輪沒有做獨立確認。它們不是可靠的相反偏好。');
 }else if(pending.both){
  lines.push('獨立確認後，兩筆都在各自預先登記的方向上通過 Holm。這是局面相關的相反選擇，可以用來檢查現有模型是否需要交互特徵。這一輪仍不因此建立權重。');
 }else{
  lines.push('有做獨立確認，但兩筆沒有同時在預先登記的方向上通過 Holm。它們仍不是可靠的相反偏好，也不建立權重。');
 }
 const freshEnd=catalog.filter(row=>row.confirmed&&row.role==='reserved'&&String(row.labelA||'').includes('BLC-4-060'));
 if(freshEnd.length)lines.push('保留名額另外確認了新局面 '+brief(freshEnd)+'。方向是結束行動，單步方盒學不會。它不取代上面那兩筆尚未獨立確認的篩選。');
 lines.push('');
 lines.push('## 權重');
 lines.push(study.candidate?'共同策略的實驗候選沒有採用。':'沒有把共同策略寫成實驗權重。');
 if(study.newCandidate)lines.push('新確認的可學偏好另有一個未採用的實驗搜尋，狀態 '+study.newCandidate.status+'。它沒有寫入 v2。');
 else lines.push('新局面沒有產生要採用的權重。');
 lines.push('');
 return lines.join('\n');
}
