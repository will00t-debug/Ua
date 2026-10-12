// UA51BT effects module, staged for integration with the title-specific game engine.
// No change to the BLEACH engine; do not set auto:true until action/timing integration exists.
// Operations mutate a *title-local* battle fixture. All choices are explicit; invalid actions throw.
export const SOLO_FAQ={kaisel:['Q2031','Q2032','Q2033'],beru:['Q2036','Q2037','Q2071'],kana:['Q2061']};
const field=s=>s.field||[];
const card=(s,uid)=>field(s).find(c=>c.uid===uid);
const countTrait=(s,trait,predicate=()=>true)=>field(s).filter(c=>c.type==='character'&&c.traits?.includes(trait)&&predicate(c)).length;
const mark=(s,key)=>{s.once??={};if(s.once[key]===s.turn)throw Error('本回合已發動');s.once[key]=s.turn;};
const own=(s,c)=>c&&c.owner===s.active;
export function kaiselOptions(s,uid,attackerUid){
 const k=card(s,uid),a=card(s,attackerUid);
 if(!own(s,k)||!k.ready||k.id!=='SLG-1-029'||!own(s,a)||!a.attacking||a.type!=='character'||!a.traits?.includes('影之軍團')||a.printedBp>2000)return [];
 return ['noHighBpBlock','untargetable'].filter(mode=>s.once?.['kaisel:'+mode]!==s.turn);
}
export function resolveKaisel(s,uid,attackerUid,mode){
 if(!kaiselOptions(s,uid,attackerUid).includes(mode))throw Error('凱賽爾選項或攻擊角色不合法');
 const k=card(s,uid),a=card(s,attackerUid);
 mark(s,'kaisel:'+mode);k.ready=false;
 a.granted??=[];a.granted.push({mode,turn:s.turn});return s;
}
export function isSelectableByEnemyEffect(s,uid){
 const c=card(s,uid);return !!c&&!c.granted?.some(x=>x.mode==='untargetable'&&x.turn===s.turn);
}
export function canBlock(s,attackerUid,defenderUid){
 const a=card(s,attackerUid),d=card(s,defenderUid);
 if(!a||!d)return false;
 const restrict=a.granted?.some(x=>x.mode==='noHighBpBlock'&&x.turn===s.turn)||(a.id==='SLG-1-011'&&(s.outside?.[a.owner]?.length||0)>=10);
 return !(restrict&&d.bp>=4000);
}
export function belCanActivate(s,uid){
 const b=card(s,uid);
 return !!(own(s,b)&&b.id==='SLG-1-033'&&b.attacking&&s.once?.bel!==s.turn&&s.hand?.[b.owner]?.length&&countTrait(s,'影之軍團',x=>x.owner===b.owner&&!x.ready&&x.printedBp<=3000)>=4);
}
export function resolveBel(s,uid,discardUid,{activate=true}={}){
 if(!belCanActivate(s,uid))throw Error('貝爾條件不成立');
 const b=card(s,uid),hand=s.hand[b.owner],i=hand.findIndex(c=>c.uid===discardUid);
 if(i<0)throw Error('未選擇合法棄牌');mark(s,'bel');
 const [discard]=hand.splice(i,1);s.outside[b.owner].push(discard);
 if(activate)b.ready=true;return s;
}
export function resolveKanaEntry(s,uid){
 const c=card(s,uid);if(!own(s,c)||c.id!=='SLG-1-067')throw Error('卡片或操作者不合法');
 if(s.once?.kana===s.turn||countTrait(s,'DFN',x=>x.owner===c.owner)<3)return false;
 mark(s,'kana');if(s.deck?.[c.owner]?.length)s.hand[c.owner].push(s.deck[c.owner].shift());
 c.ready=true;c.buffs??=[];c.buffs.push({turn:s.turn,bp:1000});
 return true;
}
export function chaeCanDeployFromRecovery(s,uid,sourceName){
 const c=s.hand?.[s.active]?.find(c=>c.uid===uid);
 return !!(c?.id==='SLG-1-011'&&c.fromOutsideByOwnEffect&&s.energy?.[s.active]>=4&&field(s).some(x=>x.owner===s.active&&x.uid===uid)===false);
}
export function resolveChaeRecovery(s,uid,slot,{sourceName='',deploy=false,mill=false}={}){
 if(!chaeCanDeployFromRecovery(s,uid,sourceName))throw Error('向坂雫回收登場條件不成立');
 if(!deploy)return s;
 if(field(s).some(x=>x.owner===s.active&&x.slot===slot))throw Error('指定位置已被佔用');
 const hand=s.hand[s.active],idx=hand.findIndex(c=>c.uid===uid);
 const [c]=hand.splice(idx,1);c.ready=sourceName==='水篠旬';c.owner=s.active;c.slot=slot;delete c.fromOutsideByOwnEffect;field(s).push(c);
 if(mill&&s.deck?.[s.active]?.length)s.outside[s.active].push(s.deck[s.active].shift());
 return s;
}
