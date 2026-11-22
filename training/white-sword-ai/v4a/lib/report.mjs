// Traditional Chinese round report. Every figure comes from the result object.
import {DECK_LABEL,METHOD_LABEL,PROMOTION} from './protocol.mjs';

function games(value){
 if(!Number.isInteger(value)||value<0)throw Error('報告缺少實際對戰場數');
 return value.toLocaleString('zh-Hant');
}
function signedPercent(value){
 if(!Number.isFinite(value))return '沒有獨立驗證';
 const points=value*100;
 const sign=points>0?'+':'';
 return sign+points.toFixed(1)+'%';
}
function percent(value){
 if(!Number.isFinite(value))return '尚無資料';
 return (value*100).toFixed(1)+'%';
}
function countLine(rate){
 if(!rate||!Number.isInteger(rate.n))return '尚無資料';
 return percent(rate.p)+'（'+rate.wins+'/'+rate.n+'）';
}
export function renderRound(result){
 const played=games(result.games);
 const cumulative=games(result.cumulativeGames);
 const title=result.profile==='smoke'
  ?'# 白劍 AI v4-A — smoke'
  :'# 白劍 AI v4-A — 第 '+result.round+' 輪';
 const challenger=result.challengerId||'沒有';
 const passed=result.promoted?'是':'否';
 const lines=[
  title,
  '',
  '- 累積對戰：'+cumulative+' 場',
  '- 本輪對戰：'+played+' 場',
  '- 本輪候選：'+result.candidateCount+' 個',
  '- 通過初選：'+result.screenKept+' 個',
  '- 冠軍挑戰者：'+challenger,
  '- 現任 Champion：'+result.championLabel,
  '- 新候選相對勝率差：'+signedPercent(result.paired?.delta),
  '- 95% 信賴區間：'+interval(result.paired?.ci),
  '- 是否通過晉級：'+passed,
  '- 下一輪訓練方向：'+result.nextDirection,
  '',
  '初選與複選只負責淘汰和決定誰進入獨立驗證。這份報告不把小樣本勝率當成變強。',
  '晉級只會寫進實驗冠軍。正式版 v2、對戰選單和正式站都不會被改。',
  ''
 ];
 lines.push('## 候選');
 lines.push('');
 for(const candidate of result.candidates||[]){
  lines.push('- '+candidate.id+'：'+(METHOD_LABEL[candidate.method]||candidate.method)
   +'，改了 '+candidate.changedWeights+' 個權重，最大絕對變化 '+Number(candidate.maxAbsDelta).toFixed(3)
   +'，與冠軍的 L2 距離 '+Number(candidate.deltaL2).toFixed(3));
 }
 lines.push('', '## 出牌分歧');
 lines.push('');
 const probe=result.probe||{};
 lines.push('- 可比較的可見局面：'+(probe.positions??'尚無資料'));
 lines.push('- 候選做出不同合法行動的局面：'+(probe.disagreed??'尚無資料'));
 lines.push('- 分歧率：'+percent(probe.rate));
 if(probe.regenerated)lines.push('- 第一代在上限內沒有分歧，已依事先登記把探索強度乘上 1.25 後再測一次。單項權重變化仍不超過 1.5。');
 if(probe.examples?.length){
  lines.push('- 分歧例子只記錄行動種類，不記錄手牌、血區或牌庫。');
  for(const example of probe.examples){
   const kinds=[...new Set(Object.values(example.choices))].length;
   lines.push('  - 種子 '+example.seed+' 第 '+example.step+' 步，硬搜尋容許帶 '+example.band+' 個行動，候選出現 '+kinds+' 種合法選擇。');
  }
 }
 lines.push('', '## 對戰結果');
 lines.push('');
 lines.push('- 初選對局：'+result.stageAGames);
 lines.push('- 複選對局：'+result.stageBGames);
 lines.push('- 獨立配對對局：'+result.stageCGames);
 const eliminated=result.eliminated||[];
 for(const row of eliminated)lines.push('- 淘汰 '+row.id+'：'+row.reason);
 const heldBack=(result.candidateCount||0)-result.screenKept-eliminated.length;
 if(heldBack>0)lines.push('- 另有 '+heldBack+' 個候選完賽且沒有被淘汰。複選名額只留 '+result.screenKept+' 個，這不是棋力結論。');
 lines.push('- 直接鏡像：'+countLine(result.mirror));
 if(result.byOpponent){
  lines.push('- 篩選階段的對手結果，不能當成獨立驗證：');
  for(const [kind,rate] of Object.entries(result.byOpponent))lines.push('  - '+opponentLabel(kind)+'：'+countLine(rate));
 }
 if(result.seat){
  lines.push('- 挑戰者先手：'+countLine(result.seat.first));
  lines.push('- 挑戰者後手：'+countLine(result.seat.second));
 }
 if(result.decks?.length){
  for(const deck of result.decks){
   lines.push('- 對'+(DECK_LABEL[deck.id]||deck.id)+'的配對勝率差：'+signedPercent(deck.delta)+'（'+deck.n+' 對）');
  }
 }
 if(result.tally){
  lines.push('- 挑戰者平均每場：能量登場 '+fixed(result.tally.energy)+'，前線登場 '+fixed(result.tally.front)
   +'，Raid '+fixed(result.tally.raid)+'，攻擊 '+fixed(result.tally.attack)+'，AP 消耗 '+fixed(result.tally.apSpent));
  lines.push('- 平均單次決策：'+fixed(result.tally.decisionMs)+' 毫秒');
 }
 if(result.championTally){
  lines.push('- 同組基準冠軍平均每場：能量登場 '+fixed(result.championTally.energy)+'，前線登場 '+fixed(result.championTally.front)
   +'，Raid '+fixed(result.championTally.raid)+'，攻擊 '+fixed(result.championTally.attack)+'，AP 消耗 '+fixed(result.championTally.apSpent));
 }
 lines.push('- 牆鐘：'+fixed((result.wallMs||0)/1000)+' 秒');
 if(result.replay)lines.push('- 同一規格重放兩次：'+(result.replay.same&&result.replay.finished?'行動一致':'不一致，這一輪已停止'));
 if(result.harnessNote)lines.push('- '+result.harnessNote);
 lines.push('', '## 晉級檢定');
 lines.push('');
 lines.push('事先登記的條件：配對勝率差至少 +'+points(PROMOTION.pairedDelta)+' 個百分點，95% 信賴區間下限大於 0，直接鏡像至少 '
  +PROMOTION.mirrorGames+' 場且勝率至少 '+points(PROMOTION.mirrorP)+'%、Wilson 下限高於 50%，任一基準牌組的勝率差不低於 '
  +points(PROMOTION.deckFloor)+' 個百分點，非法、洩漏、fallback、死循環和未完成對局都是 0。');
 if(result.judgment?.reasons?.length){
  for(const reason of result.judgment.reasons)lines.push('- '+reason);
 }else if(result.promoted){
  lines.push('- 全部條件通過。新的實驗冠軍已保存，正式版維持 v2。');
 }
 lines.push('', '## 種子');
 lines.push('');
 lines.push('- 探測：'+list(result.seeds?.probe));
 lines.push('- 初選：'+list(result.seeds?.stageA));
 lines.push('- 複選：'+list(result.seeds?.stageB));
 lines.push('- 獨立配對：'+list(result.seeds?.stageCPaired));
 lines.push('- 直接鏡像：'+list(result.seeds?.stageCMirror));
 lines.push('- 保留的最終 holdout 94000–94016 與 v4 holdout 130000–130016 沒有使用。');
 if(result.historicalNote)lines.push('- '+result.historicalNote);
 lines.push('', '## 停滯診斷');
 lines.push('');
 lines.push(result.diagnosis||'尚無診斷。');
 lines.push('');
 lines.push('重現這一輪只需要同一個冠軍快照、同一輪編號和 '+result.codeVersion+'。不需要手移權重。');
 lines.push('');
 return lines.join('\n');
}
function points(value){
 const rounded=Math.round(Math.abs(value)*1000)/10;
 const text=Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1);
 return (value<0?'-':'')+text;
}
function opponentLabel(kind){
 return {
  champion:'現任冠軍',historical:'歷代冠軍','hard-white':'Hard Search 2 白劍',
  'hard-reject':'Hard Search 2 我拒絕','hard-renruki':'Hard Search 2 戀露',peer:'其他候選'
 }[kind]||kind;
}
function interval(ci){
 if(!ci||!Number.isFinite(ci.low)||!Number.isFinite(ci.high))return '沒有獨立驗證';
 return signedPercent(ci.low)+'～'+signedPercent(ci.high);
}
function fixed(value){
 return Number.isFinite(value)?value.toFixed(2):'尚無資料';
}
function list(seeds){
 if(!seeds?.length)return '這一輪沒有配置';
 if(seeds.length>8)return seeds[0]+'–'+seeds[seeds.length-1]+'（'+seeds.length+' 個）';
 return seeds.join('、');
}
export function renderHistory(rows){
 const lines=[
  '# 白劍 AI v4-A 累積紀錄',
  '',
  '| 輪次 | 對戰 | 累積 | 分歧率 | 相對勝率差 | 95% 下限 | 晉級 | 冠軍 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |'
 ];
 for(const row of rows){
  lines.push('| '+(row.profile==='smoke'?'smoke':row.round)
   +' | '+row.games
   +' | '+row.cumulativeGames
   +' | '+percent(row.probe?.rate)
   +' | '+signedPercent(row.paired?.delta)
   +' | '+signedPercent(row.paired?.ci?.low)
   +' | '+(row.promoted?'是':'否')
   +' | '+row.championLabel+' |');
 }
 if(!rows.length)lines.push('| 尚無完成的輪次 |  |  |  |  |  |  |  |');
 lines.push('');
 return lines.join('\n');
}
