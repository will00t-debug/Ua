// User-specified BLEACH battle lists. Counts and source codes are immutable.
// A cardId that exists under a different set code is not this print.
// sourcePinned false means the catalogue has no matching source code, so
// registering another print of the same identity does not complete the deck.
const line=(copies,source,name,sourcePinned=true)=>({
 copies,source,cardId:source.slice(source.indexOf('BLC-')),name,sourcePinned
});
export const DESIGNATED_DECK_VERSION='user-2026-10-24';
export const DESIGNATED_BLEACH_DECKS=Object.freeze([
 Object.freeze({
  key:'reject-blue',name:'我拒絕',color:'blue',colorLabel:'藍',
  entries:Object.freeze([
   line(4,'EX07BT/BLC-2-016','黑崎一護'),
   line(4,'EX15BT/BLC-4-034','毒峰莉露卡'),
   line(4,'EX07BT/BLC-2-021','斬月'),
   line(4,'EX15BT/BLC-4-026','黑崎一護'),
   line(4,'EX07BT/BLC-2-015','浦原喜助'),
   line(4,'UA04NC/BLC-3-001','黑崎一護'),
   line(4,'EX15BT/BLC-4-027','黑崎一護'),
   line(4,'EX07BT/BLC-2-019','黑崎一護'),
   line(4,'EX15BT/BLC-4-022','井上織姬'),
   line(2,'EX15BT/BLC-4-036','葛力姆喬・賈卡傑克'),
   line(4,'EX07BT/BLC-2-047','其名為斬月'),
   line(4,'EX07BT/BLC-2-046','月牙十字衝'),
   line(4,'EX07BT/BLC-2-049','卍解')
  ])
 }),
 Object.freeze({
  key:'white-sword',name:'白劍',color:'green',colorLabel:'綠',
  entries:Object.freeze([
   line(4,'UA04NC/BLC-3-009','日番谷冬獅郎'),
   line(4,'EX15BT/BLC-4-060','藍染惣右介'),
   line(4,'EX15BT/BLC-4-066','卯之花烈'),
   line(4,'EX07BT/BLC-2-067','更木劍八'),
   line(4,'EX07BT/BLC-2-069','日番谷冬獅郎'),
   line(4,'EX15BT/BLC-4-070','更木劍八'),
   line(4,'UA08BT/BLC-1-070','卯之花八千流'),
   line(4,'UA08BT/BLC-1-072','卯之花烈'),
   line(4,'UA08BT/BLC-1-083','日番谷冬獅郎'),
   line(4,'UA08BT/BLC-1-085','日番谷冬獅郎'),
   line(2,'UA04NC/BLC-3-008','更木劍八'),
   line(4,'EX07BT/BLC-2-073','野晒'),
   line(4,'EX15BT/BLC-4-080','卍解')
  ])
 }),
 Object.freeze({
  key:'renruki',name:'戀露',color:'purple',colorLabel:'紫',
  entries:Object.freeze([
   line(4,'UA08BT/BLC-1-039','黑崎一護'),
   line(4,'UA08BT/BLC-1-041','黑崎一護'),
   line(4,'UA08BT/BLC-1-047','阿散井戀次'),
   line(4,'EX15BT/BLC-4-048','阿散井戀次'),
   line(4,'EX15BT/BLC-4-049','阿散井戀次'),
   line(4,'EX15BT/BLC-4-050','阿散井戀次'),
   line(2,'EX07BT/BLC-2-052','阿散井戀次'),
   line(4,'UA08BT/BLC-1-053','朽木露琪亞'),
   line(4,'EX15BT/BLC-4-054','朽木露琪亞'),
   line(4,'UA01DC/BLC-4-082','黑崎一護'),
   line(4,'UA01DC/BLC-4-083','朽木露琪亞'),
   line(4,'EX15BT/BLC-4-058','雙王蛇尾丸'),
   line(4,'EX15BT/BLC-4-059','卍解')
  ])
 })
]);
// Why a still-unported print is not registered. Registered prints are omitted
// by the report. These notes are not an implementation.
export const DESIGNATED_GAP_NOTES=Object.freeze({
 'EX15BT/BLC-4-034':'裏向置於角色下、登場主動，以及啟動效果仍缺完整原語與 Q2315／Q2316 驗收。',
 'EX07BT/BLC-2-021':'被藍色黑崎一護送至場外時，要給那張一護「不能被 BP3000 以下阻擋」。',
 'EX07BT/BLC-2-015':'看頂 3 張、最多 1 張無特徵角色入手，其餘置底；入手後再棄 1 張。後段連鎖尚未登錄。',
 'EX15BT/BLC-4-027':'Impact 無效加上每回合一次的斬月／月牙棄牌、抽牌、BP 與兩段授予。',
 'EX07BT/BLC-2-019':'Raid、兩名敵方減 BP，以及斬月／月牙棄牌後的抽牌與攻擊授予仍是整卡缺口。',
 'EX15BT/BLC-4-022':'Active 登場、棄牌後回收或 REST 登場，以及登場回合的啟動效果。',
 'EX15BT/BLC-4-036':'被一護或浦原效果送出場外後的條件支付與 Active 登場，含全體葛力姆喬每回合一次。',
 'EX07BT/BLC-2-047':'使用時抽 2，另有被藍色一護效果送出場外後再抽 1。只做抽 2 不是整卡。Q1033 要求來源效果全部結束後才抽。',
 'EX07BT/BLC-2-046':'退場 BP3500 以下，另有被藍色一護送出場外後的牌底與兩次攻擊授予。',
 'EX15BT/BLC-4-060':'不能自行放上前線、登場移線並可能移除、能源線啟動 REST 兩名後移到前線、攻擊抽 1。',
 'EX07BT/BLC-2-067':'Raid、BP 減少免疫、Impact 1，以及基底需求 4 以上才有的離場替代與 Damage 2。',
 'UA08BT/BLC-1-085':'Raid 後可 REST 並限制主動；6 張其他護廷十三隊時改為連能源線一起 REST。',
});
function copiesOf(entries){
 return entries.reduce((n,e)=>n+e.copies,0);
}
export function summarizeDesignatedDecks(isRegistered){
 if(typeof isRegistered!=='function')throw Error('Registration predicate required');
 return DESIGNATED_BLEACH_DECKS.map(deck=>{
  const entries=deck.entries.map(entry=>{
   const identityRegistered=entry.sourcePinned&&isRegistered(entry.cardId)===true;
   return {...entry,registered:identityRegistered,
    gap:identityRegistered?null:(DESIGNATED_GAP_NOTES[entry.source]||'尚未整卡登錄')};
  });
  const missing=entries.filter(e=>!e.registered);
  return {
   key:deck.key,name:deck.name,color:deck.color,colorLabel:deck.colorLabel,
   version:DESIGNATED_DECK_VERSION,
   copies:copiesOf(deck.entries),kinds:deck.entries.length,
   registeredKinds:entries.length-missing.length,
   playable:missing.length===0,
   entries,missing
  };
 });
}
export function designatedPlayableCounts(summary){
 if(!summary?.playable)throw Error(summary?.name+' is not a complete playable deck');
 return Object.freeze(Object.fromEntries(summary.entries.map(e=>[e.cardId,e.copies])));
}
