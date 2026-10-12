// UA51BT shared mechanics. Separate from BLEACH engine until fully integrated.
// Official FAQ Q2053/Q2064: face-down attachments are visible only to their controller.
// Q2054: green Sung Jinwoo discarded as cost may Raid if a legal base exists.
// Q2063: Ryuu's entry ability is shared by same-name cards for the turn.
export const SOLO_SHARED_FAQ={
 facedown:['Q2053','Q2064'],raidFromOutside:['Q2054'],ryuuOnce:['Q2063']
};
const belongs=(s,owner)=>Number.isInteger(owner)&&owner>=0&&owner<s.players.length;
export function attachFacedown(s,{owner,hostUid,cardUid,sourceZone='deck'}){
 if(!belongs(s,owner))throw Error('invalid owner');
 const p=s.players[owner],host=p.field.find(c=>c.uid===hostUid);
 if(!host)throw Error('not your host');
 const pile=p[sourceZone];
 if(!Array.isArray(pile))throw Error('invalid source');
 const idx=pile.findIndex(c=>c.uid===cardUid);
 if(idx<0)throw Error('not owned card in source');
 const [attached]=pile.splice(idx,1);
 host.under??=[];host.under.push({uid:attached.uid,cardId:attached.cardId,faceDown:true});
 return attached.uid;
}
export function visibleAttached(s,{viewer,owner,hostUid}){
 if(!belongs(s,viewer)||!belongs(s,owner))throw Error('invalid player');
 const host=s.players[owner].field.find(c=>c.uid===hostUid);
 if(!host)return [];
 return (host.under||[]).map(c=>viewer===owner||!c.faceDown
  ?{uid:c.uid,cardId:c.cardId,faceDown:!!c.faceDown}
  :{faceDown:true});
}
export function removeAttached(s,{owner,hostUid,cardUid,destination='outside'}){
 if(!belongs(s,owner))throw Error('invalid owner');
 if(!['outside','removed','hand'].includes(destination))throw Error('illegal destination');
 const p=s.players[owner],host=p.field.find(c=>c.uid===hostUid);
 const i=host?.under?.findIndex(x=>x.uid===cardUid)??-1;
 if(i<0)throw Error('no attachment');
 const [c]=host.under.splice(i,1);
 p[destination].push({uid:c.uid,cardId:c.cardId});
 return c.uid;
}
export function legalOutsideRaid(s,{player,raidUid,baseUid,requiredEnergy=4,raidName='水篠 旬',color='green'}){
 if(!belongs(s,player))return false;
 const p=s.players[player],raid=p.outside.find(c=>c.uid===raidUid),base=p.field.find(c=>c.uid===baseUid);
 return !!(raid&&base&&raid.type==='character'&&raid.raidName===raidName&&raid.color===color
   &&base.name===raidName&&p.availableEnergy>=requiredEnergy&&base.canBeRaided!==false);
}
export function resolveOutsideRaid(s,{player,raidUid,baseUid,requiredEnergy=4}){
 if(!legalOutsideRaid(s,{player,raidUid,baseUid,requiredEnergy}))throw Error('illegal outside Raid');
 const p=s.players[player],idx=p.outside.findIndex(c=>c.uid===raidUid),[raid]=p.outside.splice(idx,1);
 const baseIndex=p.field.findIndex(c=>c.uid===baseUid),base=p.field[baseIndex];
 raid.stack=[base,...(raid.stack||[])];
 raid.ready=true;
 raid.owner=player;raid.uid=raidUid;
 p.field[baseIndex]=raid;
 return raid;
}
export function canTriggerRyuu(s,{player,uid}){
 const p=s.players[player],c=p?.field.find(c=>c.uid===uid);
 return !!(c&&c.cardId==='SLG-1-073'&&s.sharedOnce?.[player]?.['ryuu-entry']!==s.turn);
}
export function claimRyuuEntry(s,{player,uid}){
 if(!canTriggerRyuu(s,{player,uid}))return false;
 s.sharedOnce??={};s.sharedOnce[player]??={};s.sharedOnce[player]['ryuu-entry']=s.turn;return true;
}

/**
 * FAQ Q2026: the "from outside" Sung Jinwoo recovery is shared once per turn.
 * Cost must be an actual [Shadow Army] card in the active player's hand.
 * Changes hand/outside in one transaction after all prerequisites are checked.
 */
export function recoverOutsideSung(s,{player,sourceUid,costUid}){
 if(!belongs(s,player)||s.active!==player||s.phase!=='main'||s.pending)throw Error('wrong phase or controller');
 const p=s.players[player],i=p.outside.findIndex(c=>c.uid===sourceUid&&c.cardId==='SLG-1-019');
 const j=p.hand.findIndex(c=>c.uid===costUid&&c.traits?.includes('影之軍團'));
 if(i<0||j<0||s.sharedOnce?.[player]?.['sung019-recovery']===s.turn)throw Error('invalid Sung recovery');
 s.sharedOnce??={};s.sharedOnce[player]??={};s.sharedOnce[player]['sung019-recovery']=s.turn;
 const [cost]=p.hand.splice(j,1);p.outside.push(cost);
 const [source]=p.outside.splice(p.outside.findIndex(c=>c.uid===sourceUid),1);p.hand.push(source);
 return s;
}
/** FAQ Q2043–Q2046/Q2049–Q2052. Stripping the Raid top is NOT retiring
 * that top or bringing the next base onto the field. No entry/exit triggers.
 * The exposed base inherits REST/ACTIVE, never pre-Raid transient buffs.
 */
export function stripRaidTop(s,{player,topUid}){
 if(!belongs(s,player))throw Error('invalid player');
 const p=s.players[player],i=p.field.findIndex(c=>c.uid===topUid);
 if(i<0)throw Error('not on field');
 const top=p.field[i];
 if(!top.stack?.length)throw Error('not Raid');
 const [base,...others]=top.stack;
 const ready=top.ready;
 delete top.stack;
 p.outside.push(top);
 // All buffs on the underlying base from before its previous Raid are gone.
 const next={...base,stack:others,ready,buffs:[],granted:[]};
 p.field[i]=next;
 return next;
}
/** FAQ Q2062: selection tax is paid ONLY for a chosen target. */
export function selectEnemyTarget(s,{controller,targetUid,allowEmpty=false}){
 if(!belongs(s,controller))throw Error('invalid controller');
 if(targetUid==null){if(allowEmpty)return null;throw Error('target required');}
 const enemy=s.players[1-controller].field.find(c=>c.uid===targetUid);
 if(!enemy)throw Error('illegal target');
 const cost=enemy.extraTargetAp||0;
 if(s.players[controller].ap<cost)throw Error('not enough AP to select target');
 s.players[controller].ap-=cost;
 return enemy;
}
