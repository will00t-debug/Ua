// The v5-A comparison. Numbers come from the offline analysis; no weights are proposed as adopted.
function pct(value){
 return `${(Number(value)*100).toFixed(1)}%`;
}
function num(value){
 if(value==null||Number.isNaN(Number(value)))return '沒有';
 return Number(value).toFixed(2);
}
function count(tiers,name){
 return tiers[name]?.count||0;
}
export function renderReport(analysis){
 const pressure=analysis.pressure;
 const eight=analysis.occupancy.eight;
 const wide=analysis.occupancy.thirtyTwo;
 const collisions=analysis.collisions;
 const leadLines=analysis.leads.map(item=>`- ${item.id}：v2 目前領先 ${num(item.lead)} 分，一個新動作欄位要累積 ${item.steps} 步才蓋過。`).join('\n');
 const preserveLines=analysis.accumulation.preserve.map(item=>`- ${item.id}：${item.text}。在這個加分下${item.flipped?'選擇會被帶走':'選擇留在 v2'}。`).join('\n');
 const preferenceOk=analysis.accumulation.preference.every(item=>item.cleared);
 const fits=analysis.accumulation.fits&&preferenceOk&&analysis.accumulation.preserve.every(item=>!item.flipped&&!item.missing);
 return `# 白劍 AI v5-A：學習架構可行性評估

這一輪沒有新對局，沒有擬合權重，也沒有改正式 v2。正式 v2、Hard Search 2（48 個節點）、Hard cap 7、步長 1.5、權重夾限 6、遊戲規則、冠軍晉級和部署都保持原狀。BLC-4-060 和其他已保存的比較都還在。

## 方向

既有結果已經說明，繼續在同一組共用權重上逐筆搜尋，會把三筆可靠的 070 能量線偏好和別的選擇綁在一起。v4-B.9 的共同一步可以改掉那三筆，但每一個守住三筆和錨點的合法解都必須放開 067 突襲，而且驗證裡 ${analysis.uses.find(row=>row.harm)?.id||'0d035ea8a0b2be16'} 是一筆已確認的退步。

這一輪改問另一件事：哪一種表示能把已經確認的結果累積起來，同時讓新欄位從 0 開始，使第一步的選擇和 v2 完全相同。新架構先保留 v2 已經有的選擇。

## 八個雜湊桶是不是主要干擾

白劍 13 張卡、每張卡的前線和能量線，一共 ${eight.plays} 個打出動作，放進 8 個桶。最多的一桶有 ${eight.max} 個，有 ${eight.shared} 個桶裝了兩個以上。070 打前線是 ${analysis.lineBins.front070.text}，落在 h${analysis.lineBins.front070.bin}；打能量線是 ${analysis.lineBins.energy070.text}，落在 h${analysis.lineBins.energy070.bin}。兩個桶都還裝著別的卡、別的動作。同一個權重因此會同時推動這些動作。

在 ${pressure.linePairs} 個同卡前線對能量線的已保存局面裡，政策分差平均有 ${num(pressure.lineHashMean)} 分來自雜湊、${num(pressure.lineOtherMean)} 分來自其餘政策特徵，雜湊佔 ${pct(pressure.lineHashShare)}。這 ${pressure.linePairs} 筆的雜湊絕對值都大於其餘政策特徵。同卡兩線的向量只差兩條線和各一個雜湊桶，所以對這種決策，八個桶是主要干擾。

對全部 ${pressure.comparable} 個有次佳動作的局面，雜湊絕對值大於其餘政策特徵的佔 ${pct(pressure.hashLargerShare)}，中位數份額是 ${pct(pressure.medianHashShare)}。把八個雜湊權重清成 0，會改掉 ${pressure.hashFlips} 個選擇，佔 ${pct(pressure.flipShare)}。這就是 v2 已經學會、不能直接拿掉的部分。

v4-B.9 的候選只動了 ${analysis.candidateNames.join('、')||'沒有欄位'}，${analysis.candidateMovesHash?'包含雜湊':'八個雜湊權重都沒動'}。退步局面的兩個動作是 ${analysis.lineBins.front085.text}（h${analysis.lineBins.front085.bin}）和 ${analysis.lineBins.energy009.text}（h${analysis.lineBins.energy009.bin}）。${analysis.lineBins.samePair?'兩者落在同一個桶。':'兩者不在同一個桶。'}${analysis.lineBins.front085.bin===analysis.lineBins.energy070.bin?'085 打前線和 070 打能量線共用 h7，只是這次退步沒有靠改這個桶發生。':''}帶走 085 的是前線、能量線和手牌缺口這類會作用在很多張卡上的欄位。

把桶加到 32 個，26 個打出動作的最大碰撞變成 ${wide.max}，其中 ${wide.shared} 個桶仍有兩個打出動作。已觀察的 ${collisions.thirtyTwo.signatures} 個簽名放進 32 桶，最多一桶有 ${collisions.thirtyTwo.max} 個，${collisions.thirtyTwo.shared} 個桶仍然裝著兩個以上；沿用八桶時，最多的一桶有 ${collisions.eight.max} 個簽名。新桶的權重若從 0 開始、舊的八個權重不動，初始選擇和 v2 相同。桶變大以後，同一個動作仍然共用一個權重，分不出「這個局面打能量線、另一個局面留在前線」。以目前的確認筆數，32 個新桶也認不出來。擴大雜湊留作以後的對照，這一輪不把它當實驗。

可還原動作的雜湊桶和向量一致。另外 ${analysis.unresolved} 筆選擇動作的向量沒有可還原卡號，分類沿用 v4-B.9，檢查了 ${analysis.checked} 筆。

## 已保存的比較怎麼用

比較按證據分層，不把沒有通過 Holm 的結果當成答案。收縮先驗是 8，等於一次篩選的對局數：軟權重是平均差乘上「決定性對局數 /（決定性對局數 + 8）」。平手留在平均差裡，不另當成支持。

- 已確認偏好：${count(analysis.evidence.tiers,'confirmed-preference')} 筆，分別是 ${preferenceText(analysis)}。這是約束，不進入軟權重。
- 已確認退步：${count(analysis.evidence.tiers,'confirmed-harm')} 筆。這是必須避開的約束。
- 已完成確認對局、但沒有通過 Holm：${count(analysis.evidence.tiers,'paired-inconclusive')} 筆。${pairText(analysis.softPairs)}可以當軟項，不能推翻約束。
- 16 對短檢查：${count(analysis.evidence.tiers,'short-check')} 筆。權重是 0，先不進目標。
- 只有 8 對篩選：${count(analysis.evidence.tiers,'screen-only')} 筆。權重是 0。d8a4 的篩選方向在 66 對之後沒有站住，所以篩選不能當標籤。

全部去重後是 ${analysis.evidence.records} 筆。060 的兩筆 66 對比較留在未確認那一層，沒有拿來擬合。

## 不想忘的選擇

三筆能量線偏好是同一個具名動作，所以這一輪的規則只會產生一個新特徵：${analysis.feature}。結束行動沒有卡號，不為它新增特徵，否則會把所有結束動作一起加權。退步局面和 067 突襲只要求留在 v2，不因為它們再造一條卡號規則。

${leadLines}

一步的新欄位最多貢獻 ${num(oneStepRoom())} 分。權重夾限 6 除以步長 1.5，最多累積 ${analysis.accumulation.maxSteps} 步，合計 ${num(analysis.accumulation.maxSteps*oneStepRoom())} 分。三筆裡最遠的需要 ${analysis.accumulation.need} 步、${num(analysis.accumulation.points)} 分。${analysis.accumulation.fits?'這個距離在夾限裡。':'這個距離超出夾限，單靠這一個欄位不夠。'}

把這個分數加到每一個「070 打能量線」之後，${analysis.accumulation.exposed} 個看得到這個動作的局面裡有 ${analysis.accumulation.flips} 個選擇會變。其中 ${analysis.accumulation.preference.filter(item=>item.cleared).length} 筆是要改的能量線，另外 ${analysis.accumulation.outside} 筆是同一個動作在其他局面被一起帶走。這些局面還沒有新的對局。影響停在這一個動作，不再靠前線權重去拉其他卡。

必須留住的局面：

${preserveLines}

三筆能量線${preferenceOk?'都會改到能量線':'還沒有全部改到能量線'}。${fits?'以現有局面計算，這個殘差同時完成三筆改選，並且留住了上面三個必須保持的選擇。':'以現有局面計算，這個殘差還沒有同時滿足改選和保留。'}這只代表分數加總在已保存局面上過得去。還沒有新的對局，這一輪也不採用。

## 三種模型

推論成本都遠低於 48 個節點的 Hard Search。一個決策通常只有幾十個合法動作：線性是每個動作 115 次乘加，加上交互特徵後約 120 次，小型網路若是 115 維進 32 維再出 1 維，大約 3,700 次。三種模型的速度都夠用，取捨在表示能力和資料量。

改良現有線性模型，表示能力就是現在的 115 維。v4-B.9 已經量過，這 115 維在單步方盒裡連三筆能量線都放不進去。再調同一組權重，干擾還在共用欄位上。它適合當凍結的先驗，不適合當下一輪要訓練的物件。

加上局面和動作的交互特徵，可以表達「手牌還缺色、這張卡補得上」這類可轉移的關係。五個已經登記的交互特徵做得到三筆能量線，但守不住突襲，而且驗證出一筆退步。交互特徵會作用在每一張符合條件的卡上。資料少的時候，這正是連帶改選的來源。等有了不會碰到其他動作的殘差之後，才值得拿它們做對照。

小型非線性模型的表示能力最高，也能在凍結線性分數之外加一個從 0 開始的殘差，初始選擇就和 v2 相同。目前可以當真的約束只有上面幾筆，其餘大多是平手或證據不足。這個資料量會讓網路記住個別局面。長期累積時，每一次更新要說得出是哪一個具名動作在動；115 進 32 再出 1 的網路做不到這件事。所以下一輪先不做它。

## 下一輪值得做的實驗

下一輪只做這一條，而且仍然不採用、不打 5,000 場、不改 v2：

凍結 v2 的全部 115 個權重，包含八個雜湊。新增 ${analysis.feature} 這一個欄位，權重從 0 開始。每一步仍是 1.5，最多累積到夾限。目標是讓三筆已確認的能量線改打能量線。每一步之後檢查：ee6c 的選擇不變、0d035ea8a0b2be16 的選擇不變、067 突襲不變，以及其他已保存局面的改選名單。66 對但未通過 Holm 的比較只以收縮後的軟權重加入，不能把約束鬆掉。8 對篩選和 16 對短檢查不進目標。

這個實驗記住的是「070 打能量線」這一個動作。它因此不會去改其他卡，也還不能套用到下一張卡的能量線偏好。若累積到夾限仍蓋不過三筆分差，或任何一個必須留住的選擇被帶走，就停，也不改去訓練網路。

正式 v2 雜湊 ${analysis.official}。這一輪沒有寫入權重。
`;
}
function oneStepRoom(){
 return 1.5*6;
}
function preferenceText(analysis){
 return (analysis.uses||[]).filter(row=>row.tier==='confirmed-preference').map(row=>`${row.id.slice(0,8)} ${row.labelB}`).join('、');
}
function pairText(pairs){
 const list=pairs||[];
 const known=list.filter(value=>value!=null);
 const sixty=known.filter(value=>value===66).length;
 const missing=list.length-known.length;
 if(sixty===known.length&&missing===0)return '全部是 66 對。';
 if(sixty===known.length)return `對得上對局數的 ${sixty} 筆是 66 對，另外 ${missing} 筆目錄沒有留下對局數。`;
 return `對局數分別是 ${known.join('、')||'沒有留下'}。`;
}
