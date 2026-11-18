import {UA05NC_MHA3_CARDS} from './ua05nc-cards.mjs';

// UNION ARENA NEW CARD SELECTION 僕のヒーローアカデミア.
// This is the book card set UA05NC / MHA-3. It is not a magazine appendix
// and it does not reuse UA10BT/MHA-1 or EX06BT/MHA-2 numbers.
// Fetched 2026-11-18. The official product page lists 11 new effect cards
// and 1 action-point card. The card-list search still has no UA05NC row.
// Published faces read on 2026-11-18: 001–009. 010 and 011 still have no
// face. The action-point picture is public and its number is not.
export const UA05NC_MHA3_FETCHED='2026-11-18';

// Separate from battle cards. No number is invented while the card list
// has not published one.
export const UA05NC_MHA3_AP=Object.freeze({
 registered:false,
 type:'action-point',
 battleCard:false,
 deckLegal:false,
 number:null,
 name:null,
 image:'https://rugiacreation.com/ua/cardlist/UA05NC_MHA-3-AP01.png?v=20261110',
 reason:'2026-11-14 公開了一張 10 週年 AP 圖。檔名是 AP01，卡面角落的小字不能確認是這個編號，而且讀起來會和 MHA-3-001 角色卡衝突。不登錄卡號，也不放進對戰或牌組。'
});

// Two effect cards still have no public face and no number.
export const UA05NC_MHA3_UNPUBLISHED=Object.freeze({
 effectCards:2,
 numbers:null,
 reason:'公開卡圖是 001、002、003、004、005、006、007、008、009。010、011 沒有卡號、卡圖與效果，不補號。'
});

// What the official site actually published. Empty arrays are the card
// table: a retailer SKU is not a confirmed number, and a missing field
// stays pending.
export const UA05NC_MHA3_CHECK=Object.freeze({
 checked:'2026-11-18',
 confirmedNumbers:Object.freeze(UA05NC_MHA3_CARDS.map(card=>card.number)),
 completeNumbers:Object.freeze([
  'UA05NC/MHA-3-001','UA05NC/MHA-3-002','UA05NC/MHA-3-003',
  'UA05NC/MHA-3-004','UA05NC/MHA-3-005','UA05NC/MHA-3-006',
  'UA05NC/MHA-3-007','UA05NC/MHA-3-008','UA05NC/MHA-3-009'
 ]),
 effectSlots:11,
 apSlots:1,
 missing:'010、011 還沒有公開卡面。AP 卡圖已公開，卡號未確認。官方 FAQ 沒有 MHA-3 條目。',
 productImage:'https://www.unionarena-tcg.com/jp/images/products/other/new_card_selection/mha/img_item01.png',
 productImageNote:'官方商品圖是 NOW DESIGNING，不是單卡卡圖。',
 cardList:'https://www.unionarena-tcg.com/jp/cardlist/?search=true&keyword=UA05NC',
 news:'僕のヒーローアカデミア NEW CARD SELECTION 商品情報を公開',
 faq:'https://www.unionarena-tcg.com/jp/faq/',
 faqCount:0
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
 cards:UA05NC_MHA3_CARDS,
 ap:UA05NC_MHA3_AP,
 officialCheck:UA05NC_MHA3_CHECK
});

export const UA05NC_MHA3_UNOFFICIAL_PREVIEW=Object.freeze([]);
