// A fresh, browser-generated seed for each new V2 match.
// The existing engine still owns shuffle/order and uses this seed for reproducible
// debug replays; players do not have to enter or see a deck-order code.
export const MAX_MATCH_SEED=999999999;
const UINT32_RANGE=0x100000000;
const REJECTION_LIMIT=Math.floor(UINT32_RANGE/MAX_MATCH_SEED)*MAX_MATCH_SEED;

export function generateMatchSeed({cryptoSource=globalThis.crypto,random=Math.random}={}){
 if(cryptoSource?.getRandomValues){
  try{
   const values=new Uint32Array(1);
   // Rejection avoids modulo bias while remaining within the engine seed range.
   do{cryptoSource.getRandomValues(values);}while(values[0]>=REJECTION_LIMIT);
   return 1+(values[0]%MAX_MATCH_SEED);
  }catch{/* Fallback for environments without usable Web Crypto. */}
 }
 const fraction=random();
 if(typeof fraction!=='number'||!Number.isFinite(fraction))throw Error('無法產生新的牌序');
 return 1+Math.min(MAX_MATCH_SEED-1,Math.max(0,Math.floor(fraction*MAX_MATCH_SEED)));
}
