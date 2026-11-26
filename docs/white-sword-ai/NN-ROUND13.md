# 白劍神經網路第十三輪

產生時間：2026/11/26 10:53（台北時間）。

接受第十二輪：抽樣順序對本次訓練結果有影響，不能把原因單獨歸於最後 715 次 other。這一輪只對已提交的全局洗牌終點補齊離線評估。沒有重訓、沒有改參數、沒有新資料、沒有新對局。第十一輪失敗與第十二輪診斷的原始判定維持不變。

判定：既有模仿評估條件成立。這只是開發保留資料上的模仿改善，權重不採用。

## 五個問題

① 有。28 個未參與更新的保留種子，精確教師一致率相對 A 的種子等權配對差是 平均 4.40 個百分點，標準誤 0.58 個百分點，95% 區間 3.20 個百分點 到 5.60 個百分點，28 個種子，臨界值 2.086。下限高於 0。決策加權是 61.5% 到 65.8%。這兩個總比例相減是 4.33 個百分點，不是種子等權配對差。這些種子是既有開發資料，不是新的獨立確認。

② 沒有。教師不擋的保持率從 100.0% 降到 83.0%，同時教師有擋時的任意阻擋從 6.7% 增到 40.3%。這是更常擋，不是把情境和阻擋者分開。教師阻擋者的精確一致是 6.7% 到 29.4%。精確改善的原始種子：188626、188627、188862、188864、188872、188873。

③ 保留組有退步：block 343 筆，67.6% 到 64.4%。第十一輪事先要求完整揭露，不要求零退步，也不允許用總一致率上升把退步抵消。這個代價只留在模仿紀錄裡，日後若另行對局，要分開看這些類型。這一輪不採用權重。

④ 符合。四條都沿用第十一輪的既有條件，看完分數後沒有改門檻。它只支持這份開發保留資料上的模仿改善。

⑤ 值得另行登記一場固定這份權重的對局驗證。這一輪不開打、不採用、不部署。即使條件成立，也不證明棋力、自主成長或超越 v2。

## 固定終點

受測檔是 `training/white-sword-nn/weights/round12/actor-shuffle.json`。版本 nn-diag-r12-shuffle，更新次數 94974。檔案雜湊更新前 35fb34e17f1b6c2fdca54f9c1fd14f28569f94f69ae4d285c7c3554d384f00c2，更新後 35fb34e17f1b6c2fdca54f9c1fd14f28569f94f69ae4d285c7c3554d384f00c2。參數雜湊更新前 6c9307830f6f84848e32c31fa01134ef401b165fa83d95cd9379b384331cac23，更新後 6c9307830f6f84848e32c31fa01134ef401b165fa83d95cd9379b384331cac23。
原 A 檔案雜湊更新前 542a774f6c42775e20ce1aa1a59235eb9cfe1909b6c8f92dde16a5b5fe90718e，更新後 542a774f6c42775e20ce1aa1a59235eb9cfe1909b6c8f92dde16a5b5fe90718e。參數雜湊更新前 02a05d1ef93e849ea3b5af9e0f420d700c679b9646bde93921b903f2f6da594d，更新後 02a05d1ef93e849ea3b5af9e0f420d700c679b9646bde93921b903f2f6da594d。版本 nn-a-r2，更新次數 9030。
零更新副本 `training/white-sword-nn/weights/round11/actor-imitate-0.json`。版本 nn-imitate-r11-0，更新次數 9030。檔案雜湊更新前 b3c737b8ae93d8bb92a10201c69d6c9ba4ecd5183dcf4518c7b1ffb69b9156ad，更新後 b3c737b8ae93d8bb92a10201c69d6c9ba4ecd5183dcf4518c7b1ffb69b9156ad。與 A 的參數相同：是。動作相同：是。
原 B 版本 nn-ppo-actor-r6-l2，更新次數 27546。檔案雜湊更新前 a81631278ebd030fd4755369efe7da91add338459cfd0bd8b8e0c7b1e67da236，更新後 a81631278ebd030fd4755369efe7da91add338459cfd0bd8b8e0c7b1e67da236。與 B 的教師一致率只作模仿參考，不能據此說棋力高於 B。
正式 v2 檔案雜湊更新前 a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa，更新後 a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa。
沒有改版本字串，沒有重存權重，沒有挑其他檢查點。
推論分數和訓練前向的最高分動作一致。第十二輪公布的 61.5% 與 65.8% 來自訓練前向；這次重算相符，而且和推論選擇相同。

## 固定條件

保留組的每個原始種子先把該種子全部非強制決策的精確教師一致率算成一個比例，再減去 A 在同種子的比例。95% 區間沿用 pairedDelta：樣本標準差用 n-1，除以種子數的平方根，臨界值用 tCritical。種子數大於 30 時臨界值是 1.96。區間不截斷到 [0,1]。下限高於 0 才算整體改善。精確一致不把只差 uid、只差卡號，或沒有公開快照證明的動作算進去。

- 保留資料的整體精確教師一致率相對 A 改善，配對差的 95% 區間下限高於 0。
- 阻擋的精確一致改善出現在至少兩個不同的原始種子，而且不能只靠第 118 步。
- 終點沒有新增已核對的明顯戰術錯誤。非法動作算錯誤。已保持的較高 BP 阻擋，在公開傷害不少於生命且 impact 為 0 時，終點不得改成不擋，也不得改成公開 BP 不高於攻擊者的阻擋。A 原本就有的同樣錯誤不算新增。
- 其他決策類型的退步逐類列出樣本數與一致率。列出本身是條件。退步不會被損失下降、訓練一致率或權重距離抵消。
- 四條都成立只支持模仿起點改善。它不證明對局變強，也不放寬晉級標準。

條件在計分前寫進計畫檔。看完分數後沒有改門檻、學習率、輪數或權重。

## 資料

來源：第十二輪已保存的快照。資料雜湊與第十二輪相符：是。逐場紀錄相符：是。分布相符：是。阻擋教師統計相符：是。
訓練雜湊 186e5f1279f52b8fa6709f837bab879fdda1631e8a5ef95c1d864191c6715a89，7162 筆，只供描述。
保留雜湊 87ff9e58547dfd37a00c4744ba52b2314efae55de57a8ab464361205eeeb3f4d，3395 筆、28 個未參與更新的種子。這是主要評估。
A 曾訓練過的資料雜湊 e7e61b723099e1cf0529fcf08246f2eff0eb9bad52a1a6bfbef298cc8e8b1e05，3010 筆，只檢查行為保持。
三份沒有合併。隔離 0 筆。未完成場次 0。

這些資料已多次檢視。這一輪全部稱為開發保留評估，不稱為全新獨立確認。重建或讀取快照都不計為新驗證樣本。

## 種子等權

方向：改善 23，持平 4，退步 1。

| 種子 | 決策 | A | 終點 | 配對差 |
| --- | --- | --- | --- | --- |
| 188624 | 145 | 55.2% | 58.6% | 3.45 個百分點 |
| 188625 | 166 | 55.4% | 62.7% | 7.23 個百分點 |
| 188626 | 143 | 52.4% | 58.7% | 6.29 個百分點 |
| 188627 | 152 | 64.5% | 64.5% | 0.00 個百分點 |
| 188628 | 134 | 67.2% | 67.9% | 0.75 個百分點 |
| 188629 | 142 | 54.9% | 61.3% | 6.34 個百分點 |
| 188630 | 91 | 53.8% | 56.0% | 2.20 個百分點 |
| 188631 | 111 | 62.2% | 69.4% | 7.21 個百分點 |
| 188860 | 123 | 61.0% | 61.0% | 0.00 個百分點 |
| 188861 | 114 | 66.7% | 70.2% | 3.51 個百分點 |
| 188862 | 138 | 65.2% | 65.2% | 0.00 個百分點 |
| 188863 | 122 | 67.2% | 71.3% | 4.10 個百分點 |
| 188864 | 129 | 63.6% | 74.4% | 10.85 個百分點 |
| 188865 | 103 | 64.1% | 68.9% | 4.85 個百分點 |
| 188866 | 112 | 66.1% | 68.8% | 2.68 個百分點 |
| 188867 | 109 | 70.6% | 68.8% | -1.83 個百分點 |
| 188868 | 135 | 60.0% | 65.2% | 5.19 個百分點 |
| 188869 | 112 | 62.5% | 68.8% | 6.25 個百分點 |
| 188870 | 77 | 51.9% | 57.1% | 5.19 個百分點 |
| 188871 | 126 | 65.1% | 72.2% | 7.14 個百分點 |
| 188872 | 140 | 57.9% | 65.0% | 7.14 個百分點 |
| 188873 | 102 | 64.7% | 72.5% | 7.84 個百分點 |
| 188874 | 131 | 73.3% | 73.3% | 0.00 個百分點 |
| 188875 | 168 | 57.1% | 60.7% | 3.57 個百分點 |
| 188876 | 136 | 59.6% | 64.0% | 4.41 個百分點 |
| 188877 | 69 | 49.3% | 55.1% | 5.80 個百分點 |
| 188878 | 75 | 68.0% | 73.3% | 5.33 個百分點 |
| 188879 | 90 | 63.3% | 71.1% | 7.78 個百分點 |

## 分類比較

精確一致只計教師索引。已證明等效、同卡號未證明、未證明碰撞分開列，不併進精確一致。同卡號或不同 uid 本身不算等效。

| 類型 | 樣本 | A 精確 | 終點精確 | A 對終點錯 | A 錯終點對 | 其他動作變化 | 已證明等效 A | 已證明等效終點 | 同卡號未證明 A | 同卡號未證明終點 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| play | 516 | 50.2% | 61.2% | 32 | 89 | 74 | 0 | 0 | 3 | 2 |
| attack | 449 | 71.9% | 76.4% | 35 | 55 | 15 | 0 | 0 | 0 | 0 |
| block | 343 | 67.6% | 64.4% | 38 | 27 | 13 | 0 | 0 | 0 | 0 |
| trigger | 193 | 65.8% | 65.8% | 4 | 4 | 8 | 0 | 0 | 2 | 1 |
| effect | 792 | 61.0% | 69.2% | 39 | 104 | 88 | 0 | 0 | 3 | 4 |
| other | 1102 | 60.3% | 61.7% | 85 | 101 | 40 | 0 | 0 | 5 | 4 |

保留阻擋 343 筆，26 個種子。教師不擋 224，A 保持 224，終點保持 186。
教師有擋 119。任意阻擋 A 8、終點 48。指定阻擋者的精確一致 A 8、終點 35。
已證明等效的阻擋選擇不計入上面的精確一致。至少兩個合法阻擋者 279。
精確一致上升的原始種子：188626、188627、188862、188864、188872、188873。新對上教師 27 筆，其中第 118 步 0 筆。
動作有變的阻擋決策 78 筆，完整列在結果檔。

### 退步

block 343 筆，67.6% 到 64.4%

訓練集 block 精確一致 66.9% 到 77.8%。訓練上升不拿來抵消保留組的下降。A 曾看過的資料 block 64.1% 到 60.2%，只作行為保持，不進入四條條件。

## 其他分割

訓練 7162 筆只作描述。A 61.6%，終點 71.0%，B 55.2%。
訓練各類 A 到終點：play 48.3% 到 64.2%、attack 73.9% 到 80.5%、block 66.9% 到 77.8%、trigger 67.0% 到 70.3%、effect 63.5% 到 75.5%、other 58.9% 到 65.1%。
A 曾看過的 3010 筆只檢查行為保持。A 62.4%，終點 66.0%，B 54.4%。
這組各類 A 到終點：play 49.0% 到 59.6%、attack 75.2% 到 77.4%、block 64.1% 到 60.2%、trigger 69.7% 到 70.2%、effect 64.1% 到 70.3%、other 60.1% 到 62.5%。
保留組上 B 的教師精確一致是 54.2%。這是模仿參考。終點高於或低於這個數字，都不能說棋力高於 B。
決策加權的保留比例是 61.5% 到 65.8%。種子等權配對差另行計算，不把這兩個比例相減當成配對結果。

## 停止攻擊

保留組裡，終點嚴格選停止攻擊的有 11 筆。第十二輪訓練前向紀錄是 11 筆。同分另計，不放進這份清單。

其中 A、B 與教師選擇相同、只有終點改停的有 9 筆。A 與 B 相同但和教師不同、終點也改停的有 2 筆。這些都沒有進入既有已核對錯誤判準，也不因總一致率上升而略過。

A 的攻擊分類：精確 323，停止 0，其他角色 114，同分 12。

終點的攻擊分類：精確 343，停止 11，其他角色 83，同分 12。

B 的攻擊分類只作參考：精確 330，停止 0，其他角色 107，同分 12。

imitate-clean:188626:1:0:132，種子 188626，步 132，分類 stop。
教師 attack 1-18。A attack 1-18。B attack 1-18。終點 停止攻擊。
教師攻擊減停止：A 2.4954，B 3.3702，終點 -0.1287。終點所選減教師 0.1287。
回合 12，階段 attack，待處理 無，行動方 1，我方生命 4，對手生命 5，手牌 8／7，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：1-28 BLC-1-072 BP 2000 橫置；1-4 BLC-4-060 BP 4000 橫置；1-18 BLC-2-069 BP 2500 可動；1-35 BLC-1-083 BP 1500 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

imitate-clean:188628:0:0:41，種子 188628，步 41，分類 stop。
教師 attack 0-21。A attack 0-21。B attack 0-21。終點 停止攻擊。
教師攻擊減停止：A 5.2635，B 3.6007，終點 -0.6562。終點所選減教師 0.6562。
回合 5，階段 attack，待處理 無，行動方 0，我方生命 6，對手生命 7，手牌 7／5，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-21 BLC-4-070 BP 4000 可動；0-22 BLC-4-070 BP 4000 可動。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

imitate-clean:188631:0:1:50，種子 188631，步 50，分類 stop。
教師 attack 0-16。A attack 0-31。B attack 0-31。終點 停止攻擊。
教師攻擊減停止：A 2.4954，B 1.7265，終點 -1.3428。終點所選減教師 1.3428。
回合 6，階段 attack，待處理 無，行動方 0，我方生命 7，對手生命 6，手牌 4／9，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-31 BLC-1-072 BP 2000 可動；0-16 BLC-2-069 BP 2500 可動；0-22 BLC-4-070 BP 4000 橫置；0-20 BLC-4-070 BP 4000 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188860:0:0:42，種子 188860，步 42，分類 stop。
教師 attack 0-21。A attack 0-21。B attack 0-21。終點 停止攻擊。
教師攻擊減停止：A 5.2635，B 4.1132，終點 -2.6102。終點所選減教師 2.6102。
回合 5，階段 attack，待處理 無，行動方 0，我方生命 7，對手生命 7，手牌 4／5，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-21 BLC-4-070 BP 4000 可動；0-33 BLC-1-083 BP 1500 可動；0-10 BLC-4-066 BP 1500 可動。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188865:1:0:74，種子 188865，步 74，分類 stop。
教師 attack 1-11。A attack 1-11。B attack 1-11。終點 停止攻擊。
教師攻擊減停止：A 1.6036，B 0.4213，終點 -1.9520。終點所選減教師 1.9520。
回合 10，階段 attack，待處理 無，行動方 1，我方生命 6，對手生命 7，手牌 10／8，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：1-11 BLC-4-066 BP 1500 可動。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188865:0:0:83，種子 188865，步 83，分類 stop。
教師 attack 0-23。A attack 0-23。B attack 0-23。終點 停止攻擊。
教師攻擊減停止：A 5.2635，B 3.6007，終點 -0.6890。終點所選減教師 0.6890。
回合 11，階段 attack，待處理 無，行動方 0，我方生命 7，對手生命 6，手牌 10／8，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-23 BLC-4-070 BP 4000 可動；0-16 BLC-2-069 BP 2500 可動。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188865:0:0:87，種子 188865，步 87，分類 stop。
教師 attack 0-16。A attack 0-16。B attack 0-16。終點 停止攻擊。
教師攻擊減停止：A 1.8521，B 1.7409，終點 -2.1333。終點所選減教師 2.1333。
回合 11，階段 attack，待處理 無，行動方 0，我方生命 7，對手生命 5，手牌 10／9，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-23 BLC-4-070 BP 4000 橫置；0-16 BLC-2-069 BP 2500 可動。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188868:1:0:51，種子 188868，步 51，分類 stop。
教師 attack 1-11。A attack 1-30。B attack 1-30。終點 停止攻擊。
教師攻擊減停止：A 2.1621，B 1.1015，終點 -1.4480。終點所選減教師 1.4480。
回合 6，階段 attack，待處理 無，行動方 1，我方生命 7，對手生命 7，手牌 6／4，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：1-23 BLC-4-070 BP 4000 橫置；1-30 BLC-1-072 BP 2000 可動；1-11 BLC-4-066 BP 1500 可動；1-16 BLC-2-069 BP 2500 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188868:1:0:77，種子 188868，步 77，分類 stop。
教師 attack 1-11。A attack 1-11。B attack 1-11。終點 停止攻擊。
教師攻擊減停止：A 2.2399，B 3.0927，終點 -1.4734。終點所選減教師 1.4734。
回合 8，階段 attack，待處理 無，行動方 1，我方生命 6，對手生命 7，手牌 7／4，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：1-30 BLC-1-072 BP 2000 橫置；1-11 BLC-4-066 BP 1500 可動；1-16 BLC-2-069 BP 2500 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188875:1:1:55，種子 188875，步 55，分類 stop。
教師 attack 1-18。A attack 1-18。B attack 1-18。終點 停止攻擊。
教師攻擊減停止：A 2.7338，B 2.6481，終點 -0.4875。終點所選減教師 0.4875。
回合 7，階段 attack，待處理 無，行動方 1，我方生命 6，對手生命 7，手牌 6／7，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：1-18 BLC-2-069 BP 2500 可動；1-14 BLC-2-067 BP 5000 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

replay-existing:188877:0:0:82，種子 188877，步 82，分類 stop。
教師 attack 0-32。A attack 0-32。B attack 0-32。終點 停止攻擊。
教師攻擊減停止：A 2.2961，B 1.9214，終點 -1.4956。終點所選減教師 1.4956。
回合 9，階段 attack，待處理 無，行動方 0，我方生命 7，對手生命 3，手牌 10／8，傷害 無，impact 無，攻擊者 尚未指定 BP 無。場上：0-31 BLC-1-072 BP 2000 橫置；0-32 BLC-1-083 BP 1500 可動；0-7 BLC-4-060 BP 4000 橫置；0-18 BLC-2-069 BP 2500 橫置。 這一步是在選攻擊者，戰鬥傷害還沒有結算。
沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。

## 保護案例

八場既有敗局由原 B 對正式 v2 重播。洗牌終點只做影子評分，沒有接管任何一步。
軌跡與第十一輪紀錄相符 8 場。
新增已核對錯誤 0 筆。這個 0 或非 0 只回答既有判準，不代替上面的整體評估。
保護決策被終點改掉 103 筆。
protection:193501:0:0:0：A[1] openingMulligan redraw，終點[0] openingMulligan keep，B[1] openingMulligan redraw，教師[0] openingMulligan keep
protection:193501:0:0:2：A[0] 停止攻擊，終點[1] extraDraw，B[1] extraDraw，教師[1] extraDraw
protection:193501:0:0:20：A[2] chooseHandLimit 0-20，終點[3] chooseHandLimit 0-46，B[2] chooseHandLimit 0-20，教師[3] chooseHandLimit 0-46
protection:193501:0:0:21：A[4] chooseHandLimit 0-21，終點[2] chooseHandLimit 0-46，B[4] chooseHandLimit 0-21，教師[2] chooseHandLimit 0-46
protection:193501:0:0:81：A[3] play 0-31 列 front 格 0，終點[1] play 0-31 列 energy 格 2，B[1] play 0-31 列 energy 格 2，教師[3] play 0-31 列 front 格 0
protection:193502:0:0:0：A[1] openingMulligan redraw，終點[0] openingMulligan keep，B[1] openingMulligan redraw，教師[0] openingMulligan keep
protection:193502:0:0:2：A[0] 停止攻擊，終點[1] extraDraw，B[1] extraDraw，教師[1] extraDraw
protection:193502:0:0:18：A[1] chooseHandLimit 0-7，終點[8] chooseHandLimit 0-46，B[0] chooseHandLimit 0-20，教師[0] chooseHandLimit 0-20
protection:193502:0:0:31：A[0] chooseHandLimit 0-7，終點[6] chooseHandLimit 0-22，B[6] chooseHandLimit 0-22，教師[7] chooseHandLimit 0-46
protection:193502:0:0:45：A[0] chooseHandLimit 0-7，終點[6] chooseHandLimit 0-46，B[6] chooseHandLimit 0-46，教師[6] chooseHandLimit 0-46
protection:193502:0:0:83：A[4] play 0-18 列 front 格 0，終點[1] play 0-18 列 energy 格 1，B[1] play 0-18 列 energy 格 1，教師[1] play 0-18 列 energy 格 1
protection:193501:0:1:1：A[1] openingMulligan redraw，終點[0] openingMulligan keep，B[0] openingMulligan keep，教師[0] openingMulligan keep
protection:193501:0:1:12：A[1] chooseDiscardGate 0-4，終點[0] chooseDiscardGate，B[4] chooseDiscardGate 0-23，教師[0] chooseDiscardGate
protection:193501:0:1:15：A[1] chooseDiscardGate 0-4，終點[5] chooseDiscardGate 0-29，B[1] chooseDiscardGate 0-4，教師[5] chooseDiscardGate 0-29
protection:193501:0:1:42：A[24] play 0-22 列 front 格 0，終點[1] play 0-5 列 energy 格 3，B[24] play 0-22 列 front 格 0，教師[22] play 0-6 列 energy 格 3
protection:193501:0:1:43：A[1] play 0-5 列 energy 格 3，終點[6] play 0-0 列 energy 格 3，B[1] play 0-5 列 energy 格 3，教師[14] play 0-40 列 energy 格 3
protection:193501:0:1:57：A[1] extraDraw，終點[0] 停止攻擊，B[0] 停止攻擊，教師[0] 停止攻擊
protection:193501:0:1:60：A[22] raid 0-15 底 0-22 格 0，終點[17] play 0-6 列 energy 格 0，B[22] raid 0-15 底 0-22 格 0，教師[5] play 0-0 列 energy 格 0
protection:193501:0:1:96：A[44] play 0-31 列 front 格 1，終點[29] play 0-6 列 energy 格 0，B[12] play 0-0 列 front 格 1，教師[9] play 0-0 列 energy 格 1
protection:193501:0:1:118：A[0] 不阻擋，終點[1] 阻擋 0-15，B[0] 不阻擋，教師[2] 阻擋 0-0
protection:193501:0:1:121：A[0] 不阻擋，終點[1] 阻擋 0-15，B[0] 不阻擋，教師[2] 阻擋 0-0
protection:193501:0:1:124：A[0] chooseDiscardGate，終點[7] chooseDiscardGate 0-18，B[2] chooseDiscardGate 0-3，教師[0] chooseDiscardGate
protection:193501:0:1:127：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[1] extraDraw
protection:193501:0:1:133：A[0] 停止攻擊，終點[17] play 0-6 列 energy 格 0，B[0] 停止攻擊，教師[9] play 0-40 列 energy 格 0
protection:193501:0:1:134：A[2] attack 0-0，終點[1] attack 0-15，B[2] attack 0-0，教師[1] attack 0-15
protection:193501:0:1:137：A[2] attack 0-10，終點[1] attack 0-15，B[1] attack 0-15，教師[1] attack 0-15
protection:193502:0:1:1：A[1] openingMulligan redraw，終點[0] openingMulligan keep，B[0] openingMulligan keep，教師[0] openingMulligan keep
protection:193502:0:1:12：A[5] chooseDiscardGate 0-6，終點[0] chooseDiscardGate，B[5] chooseDiscardGate 0-6，教師[0] chooseDiscardGate
protection:193502:0:1:57：A[22] event 0-43，終點[30] raid 0-37 底 0-17 格 1，B[22] event 0-43，教師[22] event 0-43
protection:193502:0:1:83：A[11] play 0-31 列 front 格 2，終點[0] 停止攻擊，B[11] play 0-31 列 front 格 2，教師[1] play 0-35 列 energy 格 0
protection:193502:0:1:99：A[0] 不阻擋，終點[1] 阻擋 0-37，B[0] 不阻擋，教師[2] 阻擋 0-31
protection:193502:0:1:112：A[0] 停止攻擊，終點[3] move 0-17 格 0，B[0] 停止攻擊，教師[5] move 0-29 格 0
protection:193502:0:1:113：A[25] event 0-46，終點[23] play 0-19 列 front 格 0，B[25] event 0-46，教師[7] play 0-34 列 energy 格 0
protection:193502:0:1:116：A[29] event 0-48，終點[23] play 0-19 列 front 格 0，B[29] event 0-48，教師[7] play 0-34 列 energy 格 0
protection:193502:0:1:119：A[0] chooseDiscardGate，終點[7] chooseDiscardGate 0-5，B[7] chooseDiscardGate 0-5，教師[3] chooseDiscardGate 0-33
protection:193502:0:1:120：A[0] chooseOutsideRecovery，終點[1] chooseOutsideRecovery 0-2，B[1] chooseOutsideRecovery 0-2，教師[1] chooseOutsideRecovery 0-2
protection:193502:0:1:121：A[20] play 0-2 列 front 格 3，終點[0] 停止攻擊，B[20] play 0-2 列 front 格 3，教師[16] play 0-2 列 energy 格 0
protection:193502:0:1:137：A[0] 不阻擋，終點[1] 阻擋 0-31，B[2] 阻擋 0-2，教師[2] 阻擋 0-2
protection:193502:0:1:153：A[0] 停止攻擊，終點[2] move 0-17 格 0，B[0] 停止攻擊，教師[3] move 0-29 格 0
protection:193502:0:1:155：A[0] chooseDiscardGate，終點[7] chooseDiscardGate 0-16，B[0] chooseDiscardGate，教師[3] chooseDiscardGate 0-33
protection:193500:1:0:47：A[0] 停止攻擊，終點[4] move 1-22 格 1，B[0] 停止攻擊，教師[4] move 1-22 格 1
protection:193500:1:0:48：A[1] event 1-48，終點[6] play 1-7 列 energy 格 3，B[1] event 1-48，教師[6] play 1-7 列 energy 格 3
protection:193500:1:0:54：A[1] event 1-42，終點[2] play 1-17 列 energy 格 0，B[1] event 1-42，教師[1] event 1-42
protection:193500:1:0:73：A[0] 停止攻擊，終點[1] move 1-16 格 0，B[0] 停止攻擊，教師[1] move 1-16 格 0
protection:193500:1:0:75：A[2] play 1-19 列 front 格 0，終點[1] play 1-19 列 energy 格 1，B[1] play 1-19 列 energy 格 1，教師[2] play 1-19 列 front 格 0
protection:193500:1:0:100：A[9] play 1-41 列 front 格 0，終點[1] play 1-5 列 energy 格 0，B[9] play 1-41 列 front 格 0，教師[1] play 1-5 列 energy 格 0
protection:193500:1:0:113：A[13] event 1-46，終點[1] play 1-5 列 energy 格 0，B[13] event 1-46，教師[1] play 1-5 列 energy 格 0
protection:193500:1:0:116：A[9] play 1-13 列 front 格 0，終點[1] play 1-5 列 energy 格 0，B[10] play 1-13 列 front 格 1，教師[2] play 1-5 列 energy 格 1
protection:193500:1:0:124：A[0] 不阻擋，終點[1] 阻擋 1-13，B[1] 阻擋 1-13，教師[0] 不阻擋
protection:193500:1:0:140：A[0] 停止攻擊，終點[7] move 1-16 格 0，B[0] 停止攻擊，教師[7] move 1-16 格 0
protection:193500:1:0:161：A[0] 不阻擋，終點[1] 阻擋 1-13，B[0] 不阻擋，教師[0] 不阻擋
protection:193500:1:0:175：A[4] chooseRestLock，終點[1] chooseRestLock 0-2，B[1] chooseRestLock 0-2，教師[1] chooseRestLock 0-2
protection:193500:1:0:176：A[5] raid 1-39 底 1-17 格 2，終點[2] play 1-5 列 energy 格 2，B[5] raid 1-39 底 1-17 格 2，教師[5] raid 1-39 底 1-17 格 2
protection:193500:1:0:177：A[4] chooseRestLock，終點[1] chooseRestLock 0-2，B[1] chooseRestLock 0-2，教師[0] chooseRestLock 0-26
protection:193500:1:0:184：A[2] attack 1-30，終點[1] attack 1-13，B[1] attack 1-13，教師[1] attack 1-13
protection:193502:1:0:23：A[5] chooseDiscardGate 1-4，終點[0] chooseDiscardGate，B[9] chooseDiscardGate 1-20，教師[1] chooseDiscardGate 1-42
protection:193502:1:0:27：A[4] chooseHandLimit 1-4，終點[3] chooseHandLimit 1-46，B[6] chooseHandLimit 1-21，教師[4] chooseHandLimit 1-4
protection:193502:1:0:44：A[3] chooseLineMove，終點[1] chooseLineMove 1-16，B[1] chooseLineMove 1-16，教師[1] chooseLineMove 1-16
protection:193502:1:0:46：A[21] raid 1-36 底 1-16 格 0，終點[2] play 1-5 列 energy 格 1，B[13] play 1-36 列 energy 格 1，教師[1] event 1-42
protection:193502:1:0:63：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[0] 停止攻擊
protection:193502:1:0:65：A[5] move 1-36 格 0，終點[0] 停止攻擊，B[0] 停止攻擊，教師[5] move 1-36 格 0
protection:193502:1:0:91：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[0] 停止攻擊
protection:193502:1:0:94：A[23] event 1-49，終點[1] play 1-5 列 energy 格 0，B[23] event 1-49，教師[1] play 1-5 列 energy 格 0
protection:193502:1:0:97：A[20] play 1-40 列 front 格 1，終點[1] play 1-5 列 energy 格 0，B[13] play 1-12 列 front 格 1，教師[1] play 1-5 列 energy 格 0
protection:193502:1:0:98：A[13] play 1-40 列 front 格 2，終點[0] 停止攻擊，B[20] play 1-15 列 front 格 3，教師[0] 停止攻擊
protection:193502:1:0:99：A[13] play 1-40 列 front 格 2，終點[1] play 1-5 列 energy 格 0，B[13] play 1-40 列 front 格 2，教師[9] play 1-40 列 energy 格 0
protection:193502:1:0:111：A[0] 不阻擋，終點[1] 阻擋 1-12，B[0] 不阻擋，教師[0] 不阻擋
protection:193500:1:1:21：A[2] chooseHandLimit 1-4，終點[7] chooseHandLimit 1-46，B[8] chooseHandLimit 1-23，教師[2] chooseHandLimit 1-4
protection:193500:1:1:32：A[11] play 1-31 列 front 格 0，終點[1] play 1-4 列 energy 格 3，B[9] event 1-46，教師[1] play 1-4 列 energy 格 3
protection:193500:1:1:35：A[10] play 1-31 列 front 格 0，終點[1] play 1-4 列 energy 格 3，B[3] event 1-47，教師[1] play 1-4 列 energy 格 3
protection:193500:1:1:41：A[10] raid 1-37 底 1-32 格 1，終點[1] play 1-6 列 energy 格 2，B[10] raid 1-37 底 1-32 格 1，教師[18] play 1-31 列 energy 格 2
protection:193500:1:1:43：A[1] play 1-6 列 energy 格 0，終點[3] play 1-3 列 energy 格 0，B[1] play 1-6 列 energy 格 0，教師[9] play 1-31 列 front 格 2
protection:193500:1:1:44：A[1] chooseLineMove 1-37，終點[3] chooseLineMove，B[1] chooseLineMove 1-37，教師[2] chooseLineMove 1-34
protection:193500:1:1:62：A[13] play 1-31 列 front 格 0，終點[1] play 1-3 列 energy 格 0，B[5] play 1-3 列 front 格 0，教師[2] play 1-3 列 energy 格 1
protection:193500:1:1:63：A[33] raid 1-36 底 1-3 格 0，終點[29] raid 1-36 底 1-34 格 1，B[29] raid 1-36 底 1-34 格 1，教師[4] play 1-31 列 energy 格 3
protection:193500:1:1:64：A[0] chooseRestLock 0-21，終點[2] chooseRestLock 0-13，B[0] chooseRestLock 0-21，教師[2] chooseRestLock 0-13
protection:193500:1:1:89：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[0] 停止攻擊
protection:193500:1:1:91：A[0] 停止攻擊，終點[3] move 1-37 格 2，B[0] 停止攻擊，教師[1] move 1-12 格 2
protection:193500:1:1:93：A[5] play 1-31 列 front 格 3，終點[11] play 1-0 列 energy 格 0，B[15] play 1-0 列 front 格 3，教師[5] play 1-31 列 front 格 3
protection:193500:1:1:107：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[0] 停止攻擊
protection:193500:1:1:109：A[0] 停止攻擊，終點[3] move 1-37 格 1，B[3] move 1-37 格 1，教師[1] move 1-12 格 1
protection:193500:1:1:111：A[7] event 1-49，終點[3] play 1-31 列 energy 格 2，B[11] play 1-15 列 front 格 2，教師[0] 停止攻擊
protection:193500:1:1:112：A[11] event 1-49，終點[1] play 1-31 列 energy 格 2，B[11] event 1-49，教師[1] play 1-31 列 energy 格 2
protection:193500:1:1:116：A[0] 停止攻擊，終點[17] play 1-28 列 energy 格 0，B[0] 停止攻擊，教師[0] 停止攻擊
protection:193500:1:1:135：A[0] chooseTopFilteredMany，終點[1] chooseTopFilteredMany 1-14，B[0] chooseTopFilteredMany，教師[1] chooseTopFilteredMany 1-14
protection:193500:1:1:141：A[0] 不阻擋，終點[3] 阻擋 1-15，B[4] 阻擋 1-0，教師[2] 阻擋 1-25
protection:193500:1:1:143：A[0] 不阻擋，終點[3] 阻擋 1-15，B[1] 阻擋 1-3，教師[1] 阻擋 1-3
protection:193500:1:1:145：A[0] 不阻擋，終點[2] 阻擋 1-15，B[0] 不阻擋，教師[1] 阻擋 1-25
protection:193500:1:1:148：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[1] extraDraw
protection:193500:1:1:151：A[10] play 1-21 列 front 格 0，終點[7] play 1-28 列 energy 格 2，B[10] play 1-21 列 front 格 0，教師[10] play 1-21 列 front 格 0
protection:193500:1:1:153：A[0] chooseDiscardGate，終點[3] chooseDiscardGate 1-28，B[0] chooseDiscardGate，教師[3] chooseDiscardGate 1-28
protection:193500:1:1:157：A[1] attack 1-25，終點[2] attack 1-15，B[2] attack 1-15，教師[1] attack 1-25
protection:193500:1:1:173：A[0] 不阻擋，終點[2] 阻擋 1-15，B[3] 阻擋 1-0，教師[3] 阻擋 1-0
protection:193500:1:1:175：A[0] 不阻擋，終點[2] 阻擋 1-15，B[0] 不阻擋，教師[1] 阻擋 1-25
protection:193500:1:1:177：A[5] chooseTrigger active 1-11，終點[6] chooseTrigger active 1-4，B[0] chooseTrigger skip，教師[1] chooseTrigger active 1-25
protection:193500:1:1:183：A[1] extraDraw，終點[0] 停止攻擊，B[1] extraDraw，教師[1] extraDraw
protection:193500:1:1:186：A[19] play 1-28 列 front 格 0，終點[25] play 1-16 列 front 格 0，B[31] play 1-40 列 front 格 0，教師[31] play 1-40 列 front 格 0
protection:193500:1:1:187：A[17] play 1-28 列 front 格 3，終點[13] play 1-28 列 energy 格 0，B[17] play 1-28 列 front 格 3，教師[22] play 1-16 列 front 格 3
protection:193500:1:1:189：A[1] attack 1-25，終點[2] attack 1-15，B[2] attack 1-15，教師[1] attack 1-25
protection:193500:1:1:200：A[0] 不阻擋，終點[3] 阻擋 1-15，B[0] 不阻擋，教師[4] 阻擋 1-28
protection:193501:1:1:19：A[5] chooseDiscardGate 1-4，終點[0] chooseDiscardGate，B[4] chooseDiscardGate 1-39，教師[5] chooseDiscardGate 1-4
protection:193501:1:1:23：A[3] chooseHandLimit 1-4，終點[8] chooseHandLimit 1-21，B[8] chooseHandLimit 1-21，教師[3] chooseHandLimit 1-4
protection:193501:1:1:74：A[6] chooseHandLimit 1-7，終點[8] chooseHandLimit 1-48，B[8] chooseHandLimit 1-48，教師[6] chooseHandLimit 1-7

原 A、原 B、正式 v2、Hard Search 2、規則、網站和晉級標準都沒有改。沒有開打對局，沒有採用或部署權重，沒有重開 v4–v7，也沒有合併到 main。
