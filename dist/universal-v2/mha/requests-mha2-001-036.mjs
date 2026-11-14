// EX06BT MHA-2-001 through 036 sentences that are not an existing shared
// operation. This file does not approximate a missing sentence and does not
// add an engine op. 037–073 stay in requests-2-037-073.mjs.
// FAQ ids are the official EX06BT list already stored on the catalog row.
// A request is not an FAQ acceptance.
export const MHA2_REQUESTS_001_036=Object.freeze({
 'MHA-2-020':Object.freeze({
  missing:'登場時二選一：退場最多 1 張 BP 3000 以下的對手前排，或把這張卡活動。前排、休息、每回合一次：給 1 張〈緑谷 出久〉本回合 BP+1000 與衝擊 1，做到之後最多把這張卡或 1 張 AP 活動。兩句都沒有完整的共用起動。'
 }),
 'MHA-2-024':Object.freeze({
  missing:'場上有其他 A組 時不能從手牌登場。登場時本回合獲得「每回合一次，自己的ワン・フォー・オール退場時最多抽 1」。攻擊時若不同卡名的該特徵合計 3 種以上，可付 1 AP，本回合獲得衝擊 1。顏色觸發已有共用句。登場禁止已有 playBanOtherTrait。退場抽牌與攻擊付費沒有對得上的整句。'
 }),
 'MHA-2-030':Object.freeze({
  missing:'自己回合、不同卡名的ワン・フォー・オール合計 3 種以上，而且〈緑谷 出久〉會因對手觸發離場時，可改退這張場域並把那張〈緑谷 出久〉休息。沒有觸發離場替代。'
 }),
 'MHA-2-036':Object.freeze({
  faq:Object.freeze(['Q1005','Q1006']),
  missing:'場上要有 3 張其他 A組 才能使用。最多選兩個不同句子，依印刷順序結算，不能選同一句兩次。Q1005、Q1006。三句是：休息最多 1 張對手前排；從手牌把付得起的黃 A組、AP 1 最多 1 張活動登場或突襲；自己場上全部角色本回合 BP+1000。現有二選項形狀對不上這三句。'
 })
});
