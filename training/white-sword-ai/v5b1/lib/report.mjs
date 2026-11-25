// The fair-match report. A positive difference is the residual minus v2.
const NAMES={
 'white-sword':'白劍鏡像',
 'reject-blue':'我拒絕的 Hard Search',
 renruki:'戀露的 Hard Search'
};
function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function percent(rate){
 return Number.isFinite(rate)?(rate*100).toFixed(2)+'%':'—';
}
function record(rate){
 if(!rate)return '—';
 return rate.wins+'/'+rate.games+'（'+percent(rate.rate)+'）';
}
function interval(row){
 if(!row||row.low==null)return '樣本不足';
 return '配對差 '+num(row.mean)+'，95% 區間 ['+num(row.low)+', '+num(row.high)+']，種子 '+row.n+'、自由度 '+row.df;
}
function effects(row){
 if(!row)return '';
 return '改選 '+row.changes+' 次，發生在 '+row.gamesWithChange+' 場。沒有改選而獲勝 '+row.unchangedWin+' 場，沒有改選而落敗 '+row.unchangedLoss+' 場，改選後獲勝 '+row.changedWin+' 場，改選後落敗 '+row.changedLoss+' 場。指標亮過但選擇沒變的決策有 '+(row.indicated-row.changes)+' 次。';
}
function deckBlock(id,deck){
 const lines=[
  '### '+NAMES[id],
  '',
  '殘差先攻 '+record(deck.residualFirst)+'，殘差後攻 '+record(deck.residualSecond)+'。',
  'v2 先攻 '+record(deck.v2First)+'，v2 後攻 '+record(deck.v2Second)+'。'
 ];
 if(deck.kind==='paired'){
  lines.push('v2 全場 '+record(deck.v2)+'，殘差全場 '+record(deck.residual)+'。完成配對 '+deck.pairs+' 組，未完成 '+deck.dropped+' 組。');
  lines.push('勝者相同的配對有 '+deck.sameOutcome+' 組。有改選的配對 '+deck.changedPairs+' 組，其中勝者仍相同的有 '+deck.changedSame+' 組。');
 }else lines.push('鏡像裡殘差全場 '+record(deck.residual)+'。未完成 '+deck.dropped+' 場。沒有改選是 '+deck.effects.unchangedWin+' 勝 '+deck.effects.unchangedLoss+' 敗，有改選是 '+deck.effects.changedWin+' 勝 '+deck.effects.changedLoss+' 敗。');
 lines.push('全部：'+interval(deck.delta)+'。');
 if(deck.delta?.low===0&&deck.delta?.high===0)lines.push('每個種子的配對差都是 0，區間因此沒有寬度。這只代表這一批種子沒有勝負差。');
 lines.push('只看先攻：'+interval(deck.firstDelta)+'。只看後攻：'+interval(deck.secondDelta)+'。');
 lines.push(effects(deck.effects));
 return lines.join('\n');
}
export function renderReport(study){
 const identity=study.identity||{};
 const matches=study.matches;
 const decks=matches?Object.entries(matches.decks||{}).map(([id,deck])=>deckBlock(id,deck)).join('\n\n'):'診斷對局還沒有彙整。';
 return `# 白劍 AI v5-B.1：修正完整對戰診斷

上一輪 96 場把座位和先攻設成同一個值，殘差每場都先手。那一批不能用來判斷棋力。這一輪不重跑 1,056 場分支驗證，也不改凍結權重 ${study.weight}。

正式 v2、Hard Search 2、Hard cap 7、遊戲規則、單步 1.5、權重夾限 6 和部署都沒有改。這批診斷不拿來調權重，也不套用冠軍晉級。

## 權重 0 的實際對局

已保存局面的零權重檢查仍是離線結果。另外用 12 場實際對局比較權重 0 的殘差執行器和正式 v2。鏡像用 176800 和 176803，各先攻、後攻一場，兩個座位都比較。我拒絕用 176801，戀露用 176802，各含四個座位與先後攻。這些種子和診斷種子分開。

比較了 ${identity.decisions||0} 個白劍決策，不一致 ${identity.mismatches||0} 個。開局 ${identity.openings||0} 個，不一致 ${identity.openingMismatches||0} 個。特殊順序 ${identity.orders||0} 個，不一致 ${identity.orderMismatches||0} 個。政策分數平手 ${identity.ties||0} 個，不一致 ${identity.tieMismatches||0} 個。fallback ${identity.fallbacks||0} 個，不一致 ${identity.fallbackMismatches||0} 個。${identity.stopped?'有 '+identity.stopped+' 場在決策都一致的情況下提前停止。':''}

${identity.ties? '平手時沿用 v2 的規則，取動作 JSON 較小的那個。':'這 12 場沒有出現政策分數平手。平手規則和 v2 相同，單元測試用相等分數鎖住較小 JSON 的那個動作。'}
${identity.fallbacks? '實際對局出現 fallback 時，兩邊選了同一個動作。':'這 12 場沒有走到 fallback。強制模型失敗時，權重 0 的殘差和 v2 都改走同一個參考動作。'}

## 公平對局

三種對手共用 16 個新種子，每個種子 4 場，合計 192 場。鏡像的四場是座位 0 或 1、先攻或後攻的四種組合，殘差對上 v2。其他對手的四場是 v2 先攻、殘差先攻、v2 後攻、殘差後攻；同一個種子用同一個座位。16 個種子交替座位 0 和座位 1，所以先攻不只發生在座位 0。

配對差是殘差勝場減 v2 勝場。同一個種子裡的對局先平均，再對 16 個種子做雙尾 95% t 區間。區間含 0 表示這一批看不出穩定差距。

完成 ${matches?.finished??0} 場，非法 ${matches?.illegal??0} 場。v2 場次的改選次數是 ${matches?.v2Changes??0}。

${decks}

全部殘差場次：${effects(matches?.effects)}

不採用，不部署，也不啟動 5,000 場冠軍挑戰。正式 v2 雜湊 ${study.official||''}。這一輪沒有寫入權重。
`;
}
