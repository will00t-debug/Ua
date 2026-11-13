// UA55 アイドルマスター シンデレラガールズ / 偶像大師 灰姑娘女孩.
// Counts come from the official product pages and the official card list
// fetched 2026-11-12. Copy counts inside the 50-card starter are not on
// those pages, so this module does not invent a deck list.
export const IMC_TITLE='imc';
export const IMC_FETCHED='2026-11-12';
export const IMC_BOOSTER={
 code:'UA55BT',
 series:'570155',
 url:'https://www.unionarena-tcg.com/jp/products/boosters/imc-1.php',
 list:'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570155',
 regular:100,
 rarities:Object.freeze({SR:13,R:18,U:34,C:35}),
 ap:13
};
export const IMC_STARTER={
 code:'UA55ST',
 series:'570055',
 url:'https://www.unionarena-tcg.com/jp/products/decks/imc-1.php',
 list:'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570055',
 deckCards:50,
 deckKinds:18,
 apCopies:3,
 apKinds:1,
 apId:'IMC-1-AP01',
 promoKinds:4
};
// 18 kinds on the starter card list that are not the promotion R pack.
// Nine are UA55BT illustration reprints. Nine are starter-only.
export const IMC_STARTER_DECK_IDS=Object.freeze([
 'IMC-1-088','IMC-1-089','IMC-1-090','IMC-1-091','IMC-1-092',
 'IMC-1-095','IMC-1-096','IMC-1-097','IMC-1-100',
 'IMC-1-101','IMC-1-102','IMC-1-103','IMC-1-104','IMC-1-105',
 'IMC-1-106','IMC-1-107','IMC-1-108','IMC-1-109'
]);
// Product images name these four as the promotion R pack.
export const IMC_PROMO_IDS=Object.freeze([
 'IMC-1-110','IMC-1-111','IMC-1-112','IMC-1-113'
]);
export const IMC_GROUPS=Object.freeze({
 b:Object.freeze({
  range:'IMC-1-001～050',
  cards:'dist/imc/cards-001-050.mjs',
  programs:'dist/universal-v2/imc/programs-001-050.mjs',
  runtime:'dist/universal-v2/imc/runtime-001-050.mjs',
  requests:'dist/universal-v2/imc/requests-001-050.mjs',
  tests:'tests/v2-imc-001-050.test.mjs'
 }),
 c:Object.freeze({
  range:'IMC-1-051～100',
  cards:'dist/imc/cards-051-100.mjs',
  programs:'dist/universal-v2/imc/programs-051-100.mjs',
  runtime:'dist/universal-v2/imc/runtime-051-100.mjs',
  requests:'dist/universal-v2/imc/requests-051-100.mjs',
  tests:'tests/v2-imc-051-100.test.mjs'
 }),
 d:Object.freeze({
  range:'UA55ST 101～113、推廣 R、AP、50 張預組',
  cards:'dist/imc/cards-starter.mjs',
  printings:'dist/imc/starter-printings.mjs',
  deck:'dist/imc/starter-deck.mjs',
  ap:'dist/imc/cards-ap.mjs',
  programs:'dist/universal-v2/imc/programs-starter.mjs',
  runtime:'dist/universal-v2/imc/runtime-starter.mjs',
  requests:'dist/universal-v2/imc/requests-starter.mjs',
  tests:'tests/v2-imc-starter.test.mjs'
 })
});
