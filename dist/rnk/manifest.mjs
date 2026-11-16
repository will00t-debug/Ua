// Rurouni Kenshin (UA41) inventory contract, not a playable card catalog.
import {RNK_CARDS_001_007} from './cards-001-007.mjs';
import {RNK_CARDS_008_014} from './cards-008-014.mjs';
import {RNK_CARDS_015_021} from './cards-015-021.mjs';
import {RNK_CARDS_022_028} from './cards-022-028.mjs';
import {RNK_CARDS_029_035} from './cards-029-035.mjs';
import {RNK_CARDS_036_042} from './cards-036-042.mjs';
import {RNK_CARDS_043_049} from './cards-043-049.mjs';
import {RNK_CARDS_050_056} from './cards-050-056.mjs';
import {RNK_CARDS_057_063} from './cards-057-063.mjs';
import {RNK_CARDS_064_070} from './cards-064-070.mjs';
import {RNK_CARDS_071_077} from './cards-071-077.mjs';
import {RNK_CARDS_078_084} from './cards-078-084.mjs';
import {RNK_CARDS_085_091} from './cards-085-091.mjs';
import {RNK_CARDS_092_098} from './cards-092-098.mjs';
import {RNK_CARDS_099_105} from './cards-099-105.mjs';
import {RNK_CARDS_106_113} from './cards-106-113.mjs';
import {RNK_PROMO_CARD} from './promo-card.mjs';
// Card names/printed stats/effects must be verified separately before entering V2.
// Keep reprinted starter cards under their original RNK-1 id.
const freeze = value => Object.freeze(value);
const id = number => 'RNK-1-' + String(number).padStart(3, '0');

export const RNK_TITLE = 'rnk';
export const RNK_PRODUCT = freeze({
  title: RNK_TITLE,
  nameJa: 'るろうに剣心 －明治剣客浪漫譚－',
  booster: 'UA41BT',
  starter: 'UA41ST',
  boosterSource: 'https://www.unionarena-tcg.com/jp/products/boosters/rnk-1.php',
  starterCardListSource: 'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570041'
});

export const RNK_BOOSTER_IDS = freeze(
  Array.from({length: 100}, (_, index) => id(index + 1))
);

// Official UA41ST includes nine UA41BT reprints; these are not new effects.
export const RNK_STARTER_SHARED_IDS = freeze(
  [68, 70, 74, 78, 80, 81, 85, 96, 100].map(id)
);

// UA41ST numbers 101-113 are new cards, not a parallel-art count.
const starterOnlyNames = freeze([
  '神谷 薫', '斎藤 一', '相楽 左之助', '関原 妙＆三条 燕',
  '緋村 剣心', '緋村 剣心', '明神 弥彦', '神谷道場',
  '逆刃刀', '四乃森 蒼紫', '比古 清十郎',
  '志々雄 真実', '斎藤 一'
]);
export const RNK_STARTER_ONLY = freeze(starterOnlyNames.map((nameJa, index) =>
  freeze({id: id(index + 101), nameJa})
));
export const RNK_STARTER_IDS = freeze([
  ...RNK_STARTER_SHARED_IDS,
  ...RNK_STARTER_ONLY.map(card => card.id)
]);
export const RNK_DECK_IDS = freeze([
  ...RNK_BOOSTER_IDS,
  ...RNK_STARTER_ONLY.map(card => card.id)
]);

// UAPR/RNK-1-xxx are reprints. The separate UAPR/RNK-P-001 event
// is an additional playable card outside the 113 numbered BT/ST identities.
export const RNK_PROMO_REPRINT_IDS = freeze(
  [14, 57, 86, 90].map(id)
);
// UAPR RNK-1-086 has a different printed trigger from UA41BT RNK-1-086.
// Card-body ability otherwise corresponds to the base identity.
// Do not assume all reprints share trigger behavior when selecting card art.
export const RNK_PRINT_RULE_EXCEPTIONS=freeze({
  'UAPR/RNK-1-086':freeze({
    baseId:'RNK-1-086',
    triggerMark:'active',
    triggerEffect:'If no life remains, move top deck card into own life area',
    source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-1-086',
    needsPrintSpecificRulesReview:true
  })
});
export const RNK_PROMO_ONLY = freeze({
  id: 'RNK-P-001',
  nameJa: 'るろうに剣心 －明治剣客浪漫譚－',
  print: 'UAPR/RNK-P-001',
  source: 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001'
});
export const RNK_ALL_DECK_IDS = freeze([...RNK_DECK_IDS, RNK_PROMO_ONLY.id]);

// AP cards are physical Action Point prints, never 50-card deck entries.
export const RNK_AP_PRINTS = freeze([
  ...Array.from({length: 6}, (_, index) =>
    'UA41BT/RNK-1-AP' + String(index + 1).padStart(2, '0')),
  'UA41ST/RNK-1-AP01',
  'UAPR/RNK-AP01'
]);

export function rnkPrintsFor(idValue) {
  if (idValue === RNK_PROMO_ONLY.id) return freeze([RNK_PROMO_ONLY.print]);
  if (!RNK_DECK_IDS.includes(idValue)) return freeze([]);
  const prints = [];
  if (RNK_BOOSTER_IDS.includes(idValue)) prints.push('UA41BT/' + idValue);
  if (RNK_STARTER_IDS.includes(idValue)) prints.push('UA41ST/' + idValue);
  if (RNK_PROMO_REPRINT_IDS.includes(idValue)) prints.push('UAPR/' + idValue);
  return freeze(prints);
}

// Identity inventory shown in the picture deck builder. The live battle pack
// uses the staged programs; these rows stay battleReady and effectImplemented false.
export const RNK_TC_CATALOG = freeze([
  ...RNK_CARDS_001_007,
  ...RNK_CARDS_008_014,
  ...RNK_CARDS_015_021,
  ...RNK_CARDS_022_028,
  ...RNK_CARDS_029_035,
  ...RNK_CARDS_036_042,
  ...RNK_CARDS_043_049,
  ...RNK_CARDS_050_056,
  ...RNK_CARDS_057_063,
  ...RNK_CARDS_064_070,
  ...RNK_CARDS_071_077,
  ...RNK_CARDS_078_084,
  ...RNK_CARDS_085_091,
  ...RNK_CARDS_092_098,
  ...RNK_CARDS_099_105,
  ...RNK_CARDS_106_113
]);
export const RNK_SOURCE_CATALOG=freeze([...RNK_TC_CATALOG,RNK_PROMO_CARD]);
export const RNK_IDENTITY_INVENTORY = freeze(RNK_ALL_DECK_IDS.map(cardId => {
  const starter = RNK_STARTER_ONLY.find(card => card.id === cardId);
  const sourceRow = RNK_SOURCE_CATALOG.find(card => card.id === cardId);
  return freeze({
    id: cardId,
    title: RNK_TITLE,
    nameJa: sourceRow?.nameJa ?? (cardId === RNK_PROMO_ONLY.id ? RNK_PROMO_ONLY.nameJa : (starter?.nameJa ?? null)),
    nameZhTw: sourceRow?.nameZhTw ?? null,
    prints: rnkPrintsFor(cardId),
    color: sourceRow?.color ?? null,
    energy: sourceRow?.energy ?? null,
    ap: sourceRow?.ap ?? null,
    bp: sourceRow?.bp ?? null,
    gen: sourceRow?.gen ?? null,
    type: sourceRow?.type ?? null,
    trigger: sourceRow?.trigger ?? null,
    effectJa: null,
    effectZhTw: sourceRow?.effectZhTw ?? null,
    source: sourceRow?.source ?? null,
    image: sourceRow?.image ?? null,
    confirmedTc: Boolean(sourceRow?.confirmedTc),
    confirmedEn: Boolean(sourceRow?.confirmedEn),
    confirmedJa: Boolean(sourceRow?.confirmedJa),
    needsManualReview: Boolean(sourceRow?.needsManualReview),
    cardDataVerified: false,
    effectImplemented: false,
    battleReady: false
  });
}));
