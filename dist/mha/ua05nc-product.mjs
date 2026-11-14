// UNION ARENA NEW CARD SELECTION 僕のヒーローアカデミア.
// This is the book card set UA05NC / MHA-3. It is not a magazine appendix
// and it does not reuse UA10BT/MHA-1 or EX06BT/MHA-2 numbers.
// Fetched 2026-11-14. The official product page lists 11 new effect cards
// and 1 action-point card. The official card list and card images had no
// UA05NC/MHA-3 row that day, so no number, picture, or printed sentence is
// stored as a card. A shop preview that marks four names as provisional is
// recorded only so it is not mistaken for an official printing.
export const UA05NC_MHA3_FETCHED='2026-11-14';

// Separate from battle cards. No number is invented while the card list
// has not published one.
export const UA05NC_MHA3_AP=Object.freeze({
 registered:false,
 type:'action-point',
 battleCard:false,
 deckLegal:false,
 number:null,
 name:null,
 image:null,
 reason:'2026-11-14 官方卡表與卡圖尚未公布這張 AP 的卡號。不建立假卡號，也不放進對戰或牌組。'
});

export const UA05NC_MHA3_PRODUCT=Object.freeze({
 id:'UA05NC',
 series:'MHA-3',
 kind:'new-card-selection',
 magazineAppendix:false,
 name:'NEW CARD SELECTION 我的英雄學院',
 nameJa:'UNION ARENA NEW CARD SELECTION 僕のヒーローアカデミア',
 release:'2026-12-11',
 releaseJa:'2026年12月11日(金)',
 priceYen:2640,
 priceJa:'2,640円(税込)',
 contentsJa:'カード：12枚',
 effectCards:11,
 actionPointCards:1,
 blurbJa:'特製台紙に、既存デッキを強化できる新カード11枚とアクションポイントカード1枚が入っている豪華アイテムです。',
 source:'https://www.unionarena-tcg.com/jp/products/other/new_card_selection/mha.php',
 sourceEn:'https://www.unionarena-tcg.com/en/products/other/new_card_selection/mha.php',
 cards:Object.freeze([]),
 ap:UA05NC_MHA3_AP
});

export const UA05NC_MHA3_UNOFFICIAL_PREVIEW=Object.freeze([
 Object.freeze({color:'green',nameJa:'緑谷 出久',note:'SP 0/1（仮）。非官方預覽，沒有卡號與全文。'}),
 Object.freeze({color:'red',nameJa:'爆豪 勝己',note:'SP 2/1（仮）。非官方預覽，沒有卡號與全文。'}),
 Object.freeze({color:'purple',nameJa:'死柄木 弔',note:'SP 4/1 レイド（仮）。非官方預覽，沒有卡號與全文。'}),
 Object.freeze({color:'yellow',nameJa:'麗日 お茶子',note:'SP 3/2（仮）。非官方預覽，沒有卡號與全文。'})
]);
