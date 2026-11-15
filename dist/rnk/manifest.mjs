// Rurouni Kenshin (UA41) inventory contract, not a playable card catalog.
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

// Identity-only inventory. Do NOT add to officialV2Pack / editor until each
// card has verified properties and independently accepted V2 effect programs.
export const RNK_IDENTITY_INVENTORY = freeze(RNK_ALL_DECK_IDS.map(cardId => {
  const starter = RNK_STARTER_ONLY.find(card => card.id === cardId);
  return freeze({
    id: cardId,
    title: RNK_TITLE,
    nameJa: cardId === RNK_PROMO_ONLY.id ? RNK_PROMO_ONLY.nameJa : (starter?.nameJa ?? null),
    prints: rnkPrintsFor(cardId),
    effectJa: null,
    effectZhTw: null,
    image: null,
    cardDataVerified: false,
    effectImplemented: false,
    battleReady: false
  });
}));
