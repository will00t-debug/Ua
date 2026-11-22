// White Sword specialist. This module does not replace hard-search-2, AI v3,
// or Hybrid Main, and nothing here is imported by the live battle menu.
export const FORMAT='ua-white-sword-pv-v1';
export const MODEL_VERSION='white-sword-specialist-v1';
export const WHITE_SWORD_DECK='white-sword';
// Printed list order from bleach-designated-decks.mjs. Counts live there.
export const WHITE_SWORD_IDS=Object.freeze([
 'BLC-3-009','BLC-4-060','BLC-4-066','BLC-2-067','BLC-2-069','BLC-4-070',
 'BLC-1-070','BLC-1-072','BLC-1-083','BLC-1-085','BLC-3-008','BLC-2-073','BLC-4-080'
]);
export const KENPACHI_NAME='更木 剣八';
export const YACHIRU_NAME='草鹿 やちる';
export const UNOHANA_NAME='卯ノ花 烈';
export const AIZEN_NAME='藍染 惣右介';
export const GOTEI_TRAIT='護廷十三隊';
export const HARD_NODES=48;
// Node budget matches AI v3 MATCH_LIMITS. The clock is left unset so
// chooseStrengthenedHardAction stays on its clock-free 48-node tree.
// A 40ms soft deadline changes moves when the machine is busy and cannot
// be replayed from the seed alone.
export const HARD_OPTIONS=Object.freeze({nodes:HARD_NODES});
export const HYBRID_OPTIONS=Object.freeze({nodes:HARD_NODES,ms:40});
export const MAX_STEPS=600;
export const LOOP_LIMIT=12;
export const POLICY_TIMEOUT_MS=1000;
export const BLEND_TIMEOUT_MS=3000;
export const BLEND_SCALE=6;
export const EXPLORE=0.08;
export const NEGATIVES=4;
// Ordering windows stay on the existing hard reference. They are not
// fallbacks and they are not white-sword policy samples.
export const ORDER_KINDS=Object.freeze(new Set([
 'phase-order','retirement-order','effect-move-order','effect-top-order',
 'effect-raid-witness-order','effect-raid-witness-move','life-batch-order'
]));
export const CELLS=Object.freeze([
 Object.freeze({specialistSeat:0,first:0}),
 Object.freeze({specialistSeat:0,first:1}),
 Object.freeze({specialistSeat:1,first:1}),
 Object.freeze({specialistSeat:1,first:0})
]);
export function splitForSeed(seed){
 const n=Number(seed);
 if(n>=11000&&n<11020)return 'smoke';
 if(n>=12000&&n<12100)return 'full';
 if(n>=19000&&n<22000)return 'train';
 if(n>=30000&&n<31000)return 'validation';
 if(n>=50000&&n<51000)return 'final';
 return 'unassigned';
}
export function assertTrainableSeed(seed){
 const split=splitForSeed(seed);
 if(split!=='train')throw Error('Seed '+seed+' is in the '+split+' split and cannot be used for training');
}
