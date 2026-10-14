// SOLO LEVELING / UA51BT dedicated training-match engine.
// IMPORTANT: this deliberately admits ONLY independently implemented card profiles.
// Full UA51BT coverage requires 80 tested profiles; never turn on unsupported cards.
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {normalizeSoloDeck} from './solo-decks.mjs';
const DB=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
export const SOLO_MATCH_SUPPORTED=Object.freeze([
 'SLG-1-001','SLG-1-002','SLG-1-003','SLG-1-008','SLG-1-011','SLG-1-018','SLG-1-019','SLG-1-020','SLG-1-021','SLG-1-022','SLG-1-004','SLG-1-005','SLG-1-017','SLG-1-012','SLG-1-025','SLG-1-026','SLG-1-006','SLG-1-007','SLG-1-009','SLG-1-010','SLG-1-013','SLG-1-014','SLG-1-015','SLG-1-016','SLG-1-023','SLG-1-024','SLG-1-027','SLG-1-028','SLG-1-034','SLG-1-036','SLG-1-037','SLG-1-038','SLG-1-039','SLG-1-040','SLG-1-029','SLG-1-030','SLG-1-031','SLG-1-032','SLG-1-033','SLG-1-035',
 'SLG-1-041','SLG-1-042','SLG-1-047','SLG-1-048','SLG-1-049','SLG-1-051','SLG-1-060','SLG-1-061','SLG-1-064','SLG-1-044','SLG-1-046','SLG-1-059','SLG-1-063','SLG-1-077','SLG-1-050','SLG-1-053','SLG-1-054','SLG-1-068','SLG-1-070','SLG-1-073','SLG-1-043','SLG-1-045','SLG-1-052','SLG-1-055','SLG-1-056',
 'SLG-1-062','SLG-1-065','SLG-1-066','SLG-1-069','SLG-1-057','SLG-1-067','SLG-1-071','SLG-1-072','SLG-1-074','SLG-1-075','SLG-1-076','SLG-1-078','SLG-1-079','SLG-1-080','SLG-1-058'
]);
const SUPPORTED=new Set(SOLO_MATCH_SUPPORTED);
const greenDeckIds=['041','042','043','045','075','055','056','062','065','066','067','072','074'].map(x=>'SLG-1-'+x);
export const SOLO_TRAINING_PRESET={...Object.fromEntries(greenDeckIds.map((id,i)=>[id,i===12?2:i===5?2:4])),'SLG-1-058':2};
export const SOLO_SHADOW_TRAINING_PRESET=Object.fromEntries([
 ['SLG-1-030',12],...['001','029','006','031','009','010','035','015','033'].map(x=>['SLG-1-'+x,4]),['SLG-1-027',2]
]);
export const SOLO_MATCH_VERSION=1;
export function soloTrainingDeckIssues(counts){
 let deck;try{deck=normalizeSoloDeck(counts);}catch(e){return [e.message];}
 const errors=[],items=Object.entries(deck).filter(([,n])=>n>0);
 const total=items.reduce((n,[,v])=>n+v,0);
 if(total!==50)errors.push('需要50張卡片（目前'+total+'張）');
 const unsupported=items.filter(([id])=>!SUPPORTED.has(id)).map(([id])=>id);
 if(unsupported.length)errors.push('下列效果尚未接入完整試玩引擎：'+unsupported.join(', '));
 const colors=new Set(items.map(([id])=>DB[id]?.color));
 if(colors.size!==1)errors.push('試玩牌組需使用同一種能源顏色');
 return errors;
}
const rng=s=>{let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;};
const shuffle=(s,arr)=>{for(let i=arr.length-1;i>0;i--){let j=Math.floor(rng(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
const player=s=>s.players[s.active];
const byUid=(arr,uid)=>arr.find(c=>c?.uid===uid);
const d=c=>DB[c.cardId];
const field=(p)=>[...p.front,...p.energy].filter(Boolean);
const living=(p)=>p.front.filter(Boolean);
const own=(s,uid)=>field(player(s)).find(c=>c.uid===uid);
function returnSoloToHand(s,p,c){
 const owner=s.players[p],slot=owner[c.line];
 if(slot?.[c.slot]?.uid!==c.uid)throw Error('not own character in expected slot');
 slot[c.slot]=null;
 for(const attached of c.under||[])owner.outside.push({...attached,faceDown:false});
 if(c.stack?.length){for(const base of c.stack)owner.outside.push({...base,stack:[],under:[]});}
 const {stack,under,...single}=c;owner.hand.push({...single,stack:[],under:[]});
}
const addLog=(s,text)=>{s.log.push({turn:s.turn,text});if(s.log.length>120)s.log.shift();};
const fresh=(uid,cardId)=>({uid,cardId,ready:false,stack:[],under:[],buffs:[]});
const draw=(s,p,n=1)=>{for(let i=0;i<n;i++){if(!p.deck.length){s.status='finished';s.winner=1-s.players.indexOf(p);return;}p.hand.push(p.deck.shift());}};
const produced=(s,c)=>{const data=d(c);if(!data)throw Error('Energy card ID not registered: '+String(c.cardId)+' uid='+String(c.uid));return data.gen+((c.ready&&['SLG-1-006','SLG-1-041'].includes(c.cardId))||c.boostTurn===s.turn?1:0)+(c.cardId==='SLG-1-003'&&s.players[c.owner]?.outside.length>=10?1:0);};
export function soloEnergy(s,p=s.active){return s.players[p].energy.reduce((n,c)=>n+(c?produced(s,c):0),0);}
export function soloMatchBp(s,c){
 if(!c)return 0;
 let value=d(c).bp||0;
 if(c.owner===s.active){
  const p=s.players[c.owner];
  if(c.cardId==='SLG-1-001'&&p.outside.length>=5)value+=500;
  if(c.cardId==='SLG-1-004'&&(p.discardByOwnEffectTurn===s.turn||p.recoveredByOwnEffectTurn===s.turn))value+=500;
  if(c.cardId==='SLG-1-010'&&p.outside.length>=10)value+=1000;
  if(c.cardId==='SLG-1-059'&&c.mightyThisTurn===s.turn)value+=1000;
  if(c.cardId==='SLG-1-049')value+=500;
  if(['SLG-1-020','SLG-1-021'].includes(c.cardId)&&c.attackBpTurn===s.turn)value+=500*Math.floor(p.outside.length/5);
  if(c.cardId==='SLG-1-027')value+=500*field(p).filter(x=>!x.ready&&d(x).type==='character'&&d(x).traits?.includes('影之軍團')&&d(x).bp<=2500).length;
  if(c.cardId==='SLG-1-062'&&field(p).filter(x=>d(x).traits?.includes('第四次架南島Raid')).length>=5)value+=1500;
  if(c.cardId==='SLG-1-065'&&p.hand.length>=5)value+=1000;
  if(c.cardId==='SLG-1-069'&&p.hand.length>=5)value+=1500;
 }
 value+=(c.buffs||[]).filter(b=>b.turn===s.turn||(b.expiresOwnTurn!=null&&s.players[c.owner].ownTurns<b.expiresOwnTurn)).reduce((n,b)=>n+b.bp,0);
 return value;
}
const impact=(s,c)=>c.cardId==='SLG-1-022'||c.cardId==='SLG-1-049'||(c.cardId==='SLG-1-021'&&soloMatchBp(s,c)>=6000)||c.cardId==='SLG-1-056'||(c.cardId==='SLG-1-065'&&s.players[c.owner].hand.length>=5)||(c.grants||[]).some(g=>g.kind==='impact'&&g.turn===s.turn);
const impactImmune=c=>['SLG-1-060','SLG-1-016','SLG-1-032','SLG-1-052','SLG-1-053'].includes(c.cardId);
const shizukuOrSung=(c)=>d(c)?.nameJa==='水篠 旬'||d(c)?.nameJa==='向坂 雫';
const isSung=(c)=>d(c)?.nameJa==='水篠 旬';
function enqueue(s,q){if(s.pending){s.pendingStack??=[];s.pendingStack.unshift(q);}else s.pending=q;}
function searchStart(s,p,source,amount,maxPicks,predicate,after){
 const top=s.players[p].deck.slice(0,amount);
 if(!top.length)return;
 const options=top.filter(predicate).map(c=>c.uid);
 s.pending={kind:'slgSearch',p,source,topUids:top.map(c=>c.uid),eligible:options,maxPicks,after};
}
function recoverSolo(s,p,uid,sourceName){
 const owner=s.players[p],i=owner.outside.findIndex(c=>c.uid===uid);
 if(i<0)throw Error('recovery target not in outside');
 const [c]=owner.outside.splice(i,1);owner.hand.push(c);owner.recoveredByOwnEffectTurn=s.turn;
 if(c.cardId==='SLG-1-003')enqueue(s,{kind:'slgRecoveredBuff',p,source:c.uid});
 if(c.cardId==='SLG-1-008'){draw(s,owner);if(owner.hand.length)enqueue(s,{kind:'slgDiscard',p,source:c.uid});}
 if(c.cardId==='SLG-1-011'&&soloEnergy(s,p)>=d(c).energy&&owner.front.concat(owner.energy).some(x=>!x))
  enqueue(s,{kind:'slgRecoveredDeploy',p,uid:c.uid,active:isSung({cardId:sourceName})||sourceName==='水篠 旬'});
 // SLG-1-014: on recovery by OWN effect, she may immediately enter only
 // the energy line REST, without paying AP or meeting printed energy.
 // Official UA51BT/SLG-1-014 and Q2025 prohibit all front-line movement.
 if(c.cardId==='SLG-1-014'&&owner.energy.some(slot=>!slot))
  enqueue(s,{kind:'slgRecoveredDeploy',p,uid:c.uid,active:false});
 return c;
}
const shadow=(c)=>d(c)?.type==='character'&&d(c)?.traits?.includes('影之軍團');
const isIsland=c=>d(c)?.traits?.includes('第四次架南島Raid');
const raidIds=new Set(['SLG-1-020','SLG-1-021','SLG-1-022','SLG-1-047','SLG-1-048','SLG-1-049','SLG-1-058','SLG-1-064']);
const usableEnergy=(s,p,c)=>{
 const printed=d(c).energy;
 // Official SLG-1-017: its hand-play energy cost is reduced by 2 only if
 // its controller has NO cards on either own field line (not just FRONT).
 if(c.cardId==='SLG-1-017'&&!field(s.players[p]).length)return Math.max(0,printed-2);
 if(c.cardId==='SLG-1-022')return Math.max(0,printed-field(s.players[p]).filter(shadow).length);
 return printed;
};
function canRaid(s,p,c,base){return base&&d(base).type==='character'&&d(base).nameJa===d(c).nameJa&&raidIds.has(c.cardId)&&soloEnergy(s,p)>=usableEnergy(s,p,c);}
function raidReplace(s,p,c,base,line,slot,chargeAp=true,raidSource='hand'){
 if(!canRaid(s,p,c,base)||s.players[p][line][slot]&&s.players[p][line][slot].uid!==base.uid||chargeAp&&s.players[p].ap<d(c).ap)throw Error('illegal Raid base or destination');
 const owner=s.players[p],origin=raidSource==='outside'?owner.outside:owner.hand,index=origin.findIndex(x=>x.uid===c.uid);
 if(index<0)throw Error('Raid card not in source zone');
 origin.splice(index,1);if(chargeAp)owner.ap-=d(c).ap;
 owner[base.line][base.slot]=null;position(c,p,line,slot);
 c.stack=[base,...(base.stack||[])];delete base.stack;c.ready=true;owner[line][slot]=c;onEnter(s,c);
}
// Q2032 / Q2062: effects that explicitly choose an opposing character
// cannot bypass protection or additional AP requirements.
const canSelectEnemy=(s,choosingPlayer,c,ap=s.players[choosingPlayer].ap)=>
 !!c&&c.untargetableTurn!==s.turn&&(c.extraTargetAp||0)<=ap;
const groupUsed=(s,p,key)=>s.groupUsed?.[p+':'+key]===s.turn;
const markGroup=(s,p,key)=>{s.groupUsed??={};s.groupUsed[p+':'+key]=s.turn;};
function readySolo(c){
 if((c.skipActive||0)>0){c.skipActive--;return false;}
 c.ready=true;return true;
}
export function inspectSoloAttached(s,{viewer,owner,hostUid}){
 if(![0,1].includes(viewer)||![0,1].includes(owner))throw Error('invalid viewer');
 const host=field(s.players[owner]).find(c=>c.uid===hostUid);
 return (host?.under||[]).map(c=>viewer===owner||!c.faceDown
 ?{uid:c.uid,cardId:c.cardId,faceDown:!!c.faceDown}:{faceDown:true});
}
function startTurn(s){
 const p=player(s);p.ownTurns++;s.turn++;s.phase='start';s.moved=false;s.extraDraw=false;
 for(const c of field(p)){readySolo(c);c.buffs=(c.buffs||[]).filter(b=>b.turn===s.turn||(b.expiresOwnTurn!=null&&p.ownTurns<b.expiresOwnTurn));}
 p.maxAp=p.ownTurns>=3?3:(p.ownTurns===1&&s.active===s.first?1:2);p.ap=p.maxAp;
 clearExpired(s);
 if(!(p.ownTurns===1&&s.active===s.first))draw(s,p);
 addLog(s,p.name+'開始第'+p.ownTurns+'回合，AP '+p.ap);
}
export function newSoloTrainingMatch({decks=[SOLO_TRAINING_PRESET,SOLO_TRAINING_PRESET],first=0,mode='solo',seed=1}={}){
 if(![0,1].includes(first))throw Error('invalid first player');
 for(const x of decks){const errors=soloTrainingDeckIssues(x);if(errors.length)throw Error(errors.join('；'));}
 const s={version:SOLO_MATCH_VERSION,title:'solo-leveling',rng:(seed>>>0)||1,first,active:first,turn:0,status:'playing',phase:'start',mode,
  moved:false,extraDraw:false,pending:null,combat:null,winner:null,log:[],players:[]};
 for(let i=0;i<2;i++){
  const ids=Object.entries(normalizeSoloDeck(decks[i])).flatMap(([id,count])=>Array(count).fill(id));
  const cards=shuffle(s,ids.map((id,index)=>fresh('slg-'+i+'-'+index,id)));
  const hand=cards.splice(0,7),life=cards.splice(0,7);
  s.players.push({name:mode==='solo'?(i===0?'你':'電腦'):'玩家'+(i+1),deck:cards,hand,life,front:Array(4).fill(null),
   energy:Array(4).fill(null),outside:[],removed:[],ap:0,maxAp:0,ownTurns:0});
 }
 startTurn(s);assertSoloTrainingMatch(s);return s;
}
function position(c,p,line,slot){delete c.boostTurn;delete c.usedTurn;delete c.retireAtMainEnd;c.owner=p;c.ready=false;c.line=line;c.slot=slot;c.buffs=[];c.grants=[];delete c.extraTargetAp;delete c.untargetableTurn;delete c.grantBlockLimitTurn;}
function retire(s,p,c){
 let arr=s.players[p][c.line],old=arr[c.slot];if(old?.uid!==c.uid)throw Error('retire lost field slot');
 const printed=d(c);
 const ryuuIsPresent=s.players[p].front.some(x=>x&&x.uid!==c.uid&&x.cardId==='SLG-1-073');
 const retiredIsland=printed.traits?.includes('第四次架南島Raid')&&!printed.traits?.includes('DFN');
 if(ryuuIsPresent&&retiredIsland){
  for(const x of field(s.players[p]).filter(x=>d(x).traits?.includes('DFN'))){
   x.grants??=[];x.grants.push({kind:'returnOnRetire',turn:s.turn});
  }
 }
 const returnOnRetire=printed.traits?.includes('DFN')&&c.grants?.some(x=>x.kind==='returnOnRetire'&&x.turn===s.turn);
 if(c.cardId==='SLG-1-024'){
  const other=1-p,choices=field(s.players[other]).filter(x=>d(x).type==='character').map(x=>x.uid);
  if(choices.length){
   s.pendingStack??=[];
   const q={kind:'taiseiGrant',p:other,options:choices};
   if(s.pending)s.pendingStack.push(q);
   else s.pending=q;
  }
 }
 arr[c.slot]=null;
 const layers=[c,...(c.stack||[])];for(const layer of layers){
  for(const under of layer.under||[])s.players[p].outside.push({...under,faceDown:false});
  const {stack,under,...single}=layer;
  if(returnOnRetire&&layer.uid===c.uid)s.players[p].hand.push({...single,buffs:[],grants:[],under:[]});
  else s.players[p].outside.push({...single,under:[]});
 }
 if(c.cardId==='SLG-1-007'&&s.players[p].deck.length)draw(s,s.players[p]);
}
// Official general FAQ Q99: life triggers may always be declined.
// Keep each revealed physical card in outside until its controller chooses;
// do not draw, put in hand, or restore FINAL life before that decision.
function hurt(s,defender,amount=1){
 const p=s.players[defender];
 for(let i=0;i<amount&&s.status==='playing';i++){
  if(!p.life.length){s.status='finished';s.winner=1-defender;break;}
  const c=p.life.shift(),t=d(c).trigger;
  // Publicly revealed information only: never expose a hidden life card or deck order.
  s.revealedLife={owner:defender,cardId:c.cardId,trigger:t||null,turn:s.turn};
  p.outside.push(c);
  if(['get','draw','raid'].includes(t)||(t==='final'&&p.life.length===0)){
   s.pending={kind:'soloOptionalLife',p:defender,cardUid:c.uid,trigger:t};
  }else if(t==='color'){
   // Purple COLOR revives from outside into front; green COLOR deploys from hand.
   const sourceZone=d(c).color==='purple'?'outside':'hand';
   const lines=sourceZone==='outside'?['front']:['front','energy'];
   const choices=p[sourceZone].filter(x=>d(x).type==='character'&&d(x).color===d(c).color&&d(x).energy<=2&&d(x).ap===1);
   if(choices.length&&lines.some(line=>p[line].some(x=>!x)))
    s.pending={kind:'colorTrigger',p:defender,sourceZone,lines,choices:choices.map(x=>x.uid)};
  }else if(t==='special'){
   const targets=s.players[1-defender].front.filter(x=>canSelectEnemy(s,defender,x));
   if(targets.length)s.pending={kind:'specialTrigger',p:defender,choices:targets.map(x=>x.uid)};
  }else if(t==='active'){
   const choices=field(p).map(x=>x.uid);
   if(choices.length)s.pending={kind:'activeTrigger',p:defender,choices,from:c.uid};
  }
  if(s.pending){
   if(amount-i-1>0)s.pendingLifeDamage={p:defender,remaining:amount-i-1};
   break;
  }
 }
 if(!s.pending&&!s.pendingLifeDamage&&s.status==='playing'&&!p.life.length){
  s.status='finished';s.winner=1-defender;
 }
}
function continueAttackEffects(s){
 const p=s.active,a=byUid(s.players[p].front,s.combat?.attacker);
 if(!a)throw Error('missing attacking character');
 s.combat.windows??={};
 if(!s.combat.windows.cardAttack){
  s.combat.windows.cardAttack=true;
  if(a.cardId==='SLG-1-003'&&s.players[p].deck.length){
   const top=s.players[p].deck.slice(0,1);s.pending={kind:'peekTop',p,source:a.uid,topUids:top.map(x=>x.uid),eligible:top.map(x=>x.uid),afterAttack:true};return;
  }
  if(a.cardId==='SLG-1-059'){
   searchStart(s,p,a.uid,4,2,x=>d(x).traits?.includes('第四次架南島Raid'),'attack');if(s.pending)return;
  }
  if(['SLG-1-020','SLG-1-021'].includes(a.cardId)){
   a.attackBpTurn=s.turn;
   if(a.cardId==='SLG-1-020'){
    draw(s,s.players[p]);
    if(s.status==='playing'&&s.players[p].hand.length){s.pending={kind:'slg020AttackDiscard',p,source:a.uid};return;}
   }
  }
  if(['SLG-1-047','SLG-1-048','SLG-1-049'].includes(a.cardId)){
   draw(s,s.players[p]);if(s.status==='playing'&&s.players[p].hand.length){s.pending={kind:'slg048Under',p,source:a.uid};return;}
  }
  if(a.cardId==='SLG-1-064'){
   a.skipActive=(a.skipActive||0)+1;
   s.pending={kind:'slg064Attack',p,source:a.uid};return;
  }
 }
 const grantCount=(a.grants||[]).filter(g=>g.kind==='attackDraw'&&g.turn===s.turn).length;
 s.combat.windows.attackDrawIndex??=0;
 if(s.combat.windows.attackDrawIndex<grantCount){
  s.pending={kind:'attackDraw',p,source:a.uid};
  s.combat.windows.attackDrawIndex++;return;
 }
 if(!s.combat.windows.kaiser){
  s.combat.windows.kaiser=true;
  if(shadow(a)&&d(a).bp<=2000){
   const options=field(s.players[p]).filter(c=>c.cardId==='SLG-1-029'&&c.ready&&(['block','untargetable'].some(mode=>!groupUsed(s,p,'kaiser:'+mode))));
   if(options.length){s.pending={kind:'kaiserPick',p,options:options.map(c=>c.uid)};return;}
  }
 }
 if(!s.combat.windows.kiba){
  s.combat.windows.kiba=true;
  if(shadow(a)&&d(a).bp<=2000){
   const options=field(s.players[p]).filter(c=>c.cardId==='SLG-1-031'&&c.ready&&(['buff','draw'].some(mode=>!groupUsed(s,p,'kiba:'+mode))));
   if(options.length){s.pending={kind:'kibaPick',p,options:options.map(c=>c.uid)};return;}
  }
 }
 if(!s.combat.windows.bel){
  s.combat.windows.bel=true;
  const pfield=field(s.players[p]);
  if(a.cardId==='SLG-1-033'&&!groupUsed(s,p,'bel')&&s.players[p].hand.length&&
    pfield.filter(c=>!c.ready&&shadow(c)&&d(c).bp<=3000).length>=4){
   s.pending={kind:'belDiscard',p,source:a.uid};return;
  }
 }
 beginBlock(s);
}
function beginBlock(s){
 const a=byUid(s.players[s.active].front,s.combat?.attacker);
 if(!a)throw Error('attacker not on front line');
 const defenders=s.players[1-s.active].front.filter(x=>x?.ready);
 const attacker=s.combat&&byUid(s.players[s.active].front,s.combat.attacker);
 const legal=defenders.filter(c=>!((attacker?.grantBlockLimitTurn===s.turn||attacker?.cardId==='SLG-1-024'||attacker?.unblockableHighTurn===s.turn||(attacker?.cardId==='SLG-1-011'&&s.players[s.active].outside.length>=10))&&soloMatchBp(s,c)>=4000));
 if(legal.length)s.pending={kind:'block',p:1-s.active,choices:legal.map(x=>x.uid),mandatory:a.cardId==='SLG-1-021'&&a.mustBlockTurn===s.turn};
 else combat(s,null);
}
function clearExpired(s){
 const p=player(s);
 for(const c of field(p))c.buffs=(c.buffs||[]).filter(b=>b.expiresOwnTurn==null||p.ownTurns<b.expiresOwnTurn);
}
function advanceAttackEnd(s){
 if(s.pending)return;
 const p=s.players[s.active];
 while(s.endSources?.length){
  const {uid,type}=s.endSources.shift(),c=field(p).find(x=>x.uid===uid);
  if(!c)continue;
  if((type==='047'||type==='048')&&c.stack?.length){
   const amount=type==='047'?2:3;
   const available=field(p).flatMap(x=>(x.under||[]).filter(q=>q.faceDown).map(q=>q.uid));
   if(available.length>=amount){s.pending={kind:'slgEndRaid',p:s.active,source:uid,amount};return;}
  }else if(type==='061'&&p.hand.length){s.pending={kind:'slg061End',p:s.active,source:uid};return;}
 }
 const leaving=s.active;
 for(const who of s.players)for(const c of field(who)){
  if(c.targetProtectionExpiresAfterPlayer===leaving&&s.players[leaving].ownTurns>=c.targetProtectionExpiresTurn){
   delete c.extraTargetAp;delete c.targetProtectionExpiresAfterPlayer;delete c.targetProtectionExpiresTurn;
  }
 }
 s.endSources=null;s.phase='attack';s.active=1-s.active;startTurn(s);
}
function scheduleAttackAfter(s){
 if(s.pending){s.afterAttackPending=true;return;}
 s.afterAttackPending=false;
 const p=s.players[s.active];
 const machidas=p.energy.filter(c=>c?.cardId==='SLG-1-060');
 const frozen=p.front.filter(c=>c&&(c.skipActive||0)>0);
 if(machidas.length&&frozen.length){s.pending={kind:'slg060Swap',p:s.active,options:machidas.map(c=>c.uid)};return;}
 const monarch=p.energy.find(c=>c?.cardId==='SLG-1-022');
 if(monarch&&p.front.some(shadow))s.pending={kind:'slg022Swap',p:s.active,source:monarch.uid};
}
function combat(s,blockUid){
 const a=byUid(s.players[s.active].front,s.combat?.attacker);
 if(!a)throw Error('attack card absent');
 if(blockUid==null)hurt(s,1-s.active,1+(a.grants||[]).filter(x=>x.kind==='damagePlus'&&x.turn===s.turn).length);
 else{
  const opp=s.players[1-s.active],b=byUid(opp.front,blockUid);
  if(!b||!b.ready)throw Error('illegal block');
  b.ready=false;
  const ab=soloMatchBp(s,a),bb=soloMatchBp(s,b);
  if(ab>=bb)retire(s,1-s.active,b);
  if(bb>=ab)retire(s,s.active,a);
  if(ab>=bb&&impact(s,a)&&!impactImmune(b))hurt(s,1-s.active);
  if(ab>=bb&&byUid(s.players[s.active].front,a.uid)&&a.cardId==='SLG-1-021'){
   const limit=2000+Math.floor(s.players[s.active].outside.length/5)*500;
   enqueue(s,{kind:'slg021Win',p:s.active,options:s.players[s.active].outside.filter(c=>d(c).type==='character'&&!isSung(c)&&d(c).bp<=limit).map(c=>c.uid)});
  }
  if(b.cardId==='SLG-1-023'&&ab<bb&&b.firstBlockTurn!==s.turn){
   const survives=byUid(opp.front,b.uid);
   if(survives){survives.firstBlockTurn=s.turn;readySolo(survives);}
  }
 }
 s.combat=null;scheduleAttackAfter(s);
}
function choose(s,action){
 const q=s.pending;if(!q)throw Error('no choice');
 if(q.kind==='soloOptionalLife'){
  const p=s.players[q.p],i=p.outside.findIndex(c=>c.uid===q.cardUid);
  if(i<0)throw Error('revealed life card missing');
  if(action.mode==='skip'){s.pending=null;}
  else if(q.trigger==='get'&&action.mode==='get'){
   p.hand.push(p.outside.splice(i,1)[0]);s.pending=null;
  }else if(q.trigger==='raid'&&action.mode==='get'){
   p.hand.push(p.outside.splice(i,1)[0]);s.pending=null;
  }else if(q.trigger==='raid'&&action.mode==='raid'){
   const c=p.outside[i];
   if(soloEnergy(s,q.p)<usableEnergy(s,q.p,c)||!field(p).some(base=>canRaid(s,q.p,c,base)))
    throw Error('cannot activate illegal Raid life trigger');
   p.hand.push(p.outside.splice(i,1)[0]);s.pending={kind:'raidTrigger',p:q.p,uid:c.uid};
  }else if(q.trigger==='draw'&&action.mode==='draw'){
   s.pending=null;draw(s,p);
  }else if(q.trigger==='final'&&action.mode==='final'){
   s.pending=null;
   if(!p.life.length&&p.deck.length)p.life.unshift(p.deck.shift());
  }else throw Error('illegal life trigger activation');
 }else  if(q.kind==='discard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('hand discard must be chosen');
  p.outside.push(p.hand.splice(i,1)[0]);s.pending=null;
 }else if(q.kind==='entryImpact'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&(!c||!d(c).traits.includes('DFN')||c.uid===q.source))throw Error('target must be another DFN');
  if(c){c.grants??=[];c.grants.push({kind:'impact',turn:s.turn});}s.pending=null;
 }else if(q.kind==='entryProtect'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&(!c||!d(c).traits.includes('DFN')||c.uid===q.source))throw Error('target must be another DFN');
  if(c){
   c.extraTargetAp=1;
   c.targetProtectionExpiresAfterPlayer=1-q.p;
   c.targetProtectionExpiresTurn=s.players[1-q.p].ownTurns+1;
  }
  s.pending=null;
 }else if(q.kind==='kaiserPick'||q.kind==='kibaPick'){
  if(action.uid==null){s.pending=null;continueAttackEffects(s);}
  else{
   const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid);
   if(!c||!c.ready||!q.options.includes(c.uid))throw Error('illegal helper selection');
   s.pending={kind:q.kind==='kaiserPick'?'kaiserMode':'kibaMode',p:q.p,source:c.uid};
  }
 }else if(q.kind==='kaiserMode'||q.kind==='kibaMode'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===q.source),a=byUid(p.front,s.combat?.attacker);
  const prefix=q.kind==='kaiserMode'?'kaiser':'kiba';
  const valid=prefix==='kaiser'?['block','untargetable']:['buff','draw'];
  if(!c||!c.ready||!a||!valid.includes(action.mode)||groupUsed(s,q.p,prefix+':'+action.mode))throw Error('illegal shared effect selection');
  markGroup(s,q.p,prefix+':'+action.mode);c.ready=false;
  if(prefix==='kaiser'){
   if(action.mode==='block')a.grantBlockLimitTurn=s.turn;
   else a.untargetableTurn=s.turn;
   s.pending=null;continueAttackEffects(s);
  }else if(action.mode==='buff'){
   a.buffs.push({turn:s.turn,bp:1500});
   s.pending=null;continueAttackEffects(s);
  }else{
   draw(s,p);
   if(s.status!=='playing')s.pending=null;
   else if(p.hand.length)s.pending={kind:'kibaDiscard',p:q.p};
   else{s.pending=null;continueAttackEffects(s);}
  }
 }else if(q.kind==='kibaDiscard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('invalid hand discard');
  p.outside.push(p.hand.splice(i,1)[0]);s.pending=null;continueAttackEffects(s);
 }else if(q.kind==='belDiscard'){
  const p=s.players[q.p],a=byUid(p.front,q.source);
  if(action.uid!=null){
   const i=p.hand.findIndex(c=>c.uid===action.uid);if(i<0||!a||a.cardId!=='SLG-1-033')throw Error('illegal Bel discard');
   p.outside.push(p.hand.splice(i,1)[0]);markGroup(s,q.p,'bel');readySolo(a);
  }
  s.pending=null;continueAttackEffects(s);
 }else if(q.kind==='colorTrigger'){
  if(action.uid===null){s.pending=null;}
  else{
  const p=s.players[q.p],source=p[q.sourceZone||'hand'],i=source.findIndex(c=>c.uid===action.uid);
  if(i<0||!q.choices.includes(action.uid)||!(q.lines||['front','energy']).includes(action.line)||p[action.line][action.slot])throw Error('illegal color trigger deployment');
  const c=source.splice(i,1)[0];position(c,q.p,action.line,action.slot);c.ready=true;p[action.line][action.slot]=c;
  s.pending=null;onEnter(s,c);
  }
 }else if(q.kind==='specialTrigger'){
  if(action.uid===null){s.pending=null;}
  else{
  const opponent=1-q.p,target=s.players[opponent].front.find(x=>x?.uid===action.uid);
  if(!target||!q.choices.includes(target.uid)||!canSelectEnemy(s,q.p,target))throw Error('illegal special trigger target');
  s.players[q.p].ap-=target.extraTargetAp||0;
  retire(s,opponent,target);s.pending=null;
  }
 }else if(q.kind==='ryuuBuff'){
  const p=s.players[q.p],c=action.uid==null?null:field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&!c)throw Error('illegal Ryuu buff target');
  if(c)c.buffs.push({turn:s.turn,bp:1000});
  if(p.hand.length>=7)s.pending={kind:'ryuuAp',p:q.p};
  else s.pending=null;
 }else if(q.kind==='ryuuAp'){
  const p=s.players[q.p],max=Math.min(2,p.maxAp-p.ap);
  if(!Number.isInteger(action.count)||action.count<0||action.count>max)throw Error('illegal Ryuu AP activation');
  p.ap+=action.count;s.pending=null;
 }else if(q.kind==='attackDraw'){
  const p=s.players[q.p];
  if(action.draw)draw(s,p);
  s.pending=null;if(s.status==='playing')continueAttackEffects(s);
 }else if(q.kind==='slgSearch'){
  const p=s.players[q.p],top=p.deck.slice(0,q.topUids.length);
  if(top.map(c=>c.uid).join(',')!==q.topUids.join(','))throw Error('top deck changed during search');
  const picks=action.picks;
  if(!Array.isArray(picks)||picks.length>q.maxPicks||new Set(picks).size!==picks.length||picks.some(uid=>!q.eligible.includes(uid)))throw Error('illegal top-deck pick');
  const leftovers=q.topUids.filter(uid=>!picks.includes(uid));
  if(!Array.isArray(action.order)||action.order.length!==leftovers.length||new Set(action.order).size!==leftovers.length||action.order.some(uid=>!leftovers.includes(uid)))throw Error('illegal bottom-deck order');
  const held=p.deck.splice(0,q.topUids.length),lookup=Object.fromEntries(held.map(c=>[c.uid,c]));
  p.hand.push(...picks.map(uid=>lookup[uid]));
  p.deck.push(...action.order.map(uid=>lookup[uid]));
  if(q.source&&['SLG-1-059'].includes(field(p).find(c=>c.uid===q.source)?.cardId||'')&&picks.length){
   const source=field(p).find(c=>c.uid===q.source);source.skipActive=(source.skipActive||0)+1;
  }
  s.pending=null;
  if(picks.length&&q.after==='discard')s.pending={kind:'slgDiscard',p:q.p,source:q.source};
  else if(q.after==='attack')continueAttackEffects(s);
 }else if(q.kind==='slgMill'){
  const p=s.players[q.p];
  if(action.mill&&p.deck.length)p.outside.push(p.deck.shift());
  s.pending=null;
 }else if(q.kind==='slgDiscard'){
  const p=s.players[q.p],idx=p.hand.findIndex(c=>c.uid===action.uid);
  if(idx<0)throw Error('not your hand card to discard');
  p.outside.push(p.hand.splice(idx,1)[0]);p.discardByOwnEffectTurn=s.turn;s.pending=null;
  if(q.after==='attack')continueAttackEffects(s);
 }else if(q.kind==='slgRecoveredBuff'){
  const p=s.players[q.p],target=action.uid==null?null:field(p).find(c=>c.uid===action.uid&&d(c).type==='character');
  if(action.uid!=null&&!target)throw Error('illegal recovered Rin BP target');
  if(target)target.buffs.push({turn:s.turn,bp:1000});s.pending=null;
 }else if(q.kind==='slgRecoveredDeploy'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===q.uid&&['SLG-1-011','SLG-1-014'].includes(c.cardId));
  if(action.uid===null){s.pending=null;}
  else{
   const recovered=p.hand[i],satoko=recovered?.cardId==='SLG-1-014';
   if(i<0||(!satoko&&soloEnergy(s,q.p)<4)||!(satoko?action.line==='energy':['front','energy'].includes(action.line))||p[action.line]?.[action.slot])throw Error('illegal recovered character deployment');
   const [c]=p.hand.splice(i,1);position(c,q.p,action.line,action.slot);c.ready=satoko?false:q.active;p[action.line][action.slot]=c;
   s.pending=null;onEnter(s,c);
  }
 }else if(q.kind==='slg019Entry'){
  const p=s.players[q.p];
  if(action.uid!=null){
   const i=p.hand.findIndex(c=>c.uid===action.uid&&shadow(c));if(i<0)throw Error('must discard Shadow Army');
   p.outside.push(p.hand.splice(i,1)[0]);draw(s,p);
  }
  s.pending=null;
 }else if(q.kind==='slg019Recover'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid&&shadow(c));
  if(i<0||groupUsed(s,q.p,'sung019'))throw Error('illegal shared Sung recovery cost');
  p.outside.push(p.hand.splice(i,1)[0]);markGroup(s,q.p,'sung019');
  s.pending=null;recoverSolo(s,q.p,q.source,'水篠 旬');
 }else if(q.kind==='slg044Target'){
  const p=s.players[q.p],host=field(p).find(c=>c.uid===action.uid&&isSung(c));
  if(!host)throw Error('illegal face-down host');
  if(action.attach){if(!p.deck.length)throw Error('cannot attach from empty deck');const top=p.deck.shift();host.under??=[];host.under.push({...top,faceDown:true});}
  host.grants??=[];host.grants.push({kind:'damagePlus',turn:s.turn});s.pending=null;
 }else if(q.kind==='slg059Entry'){
  const p=s.players[q.p],source=field(p).find(c=>c.uid===q.source);
  if(action.uid!=null){
   const i=p.hand.findIndex(c=>c.uid===action.uid);if(i<0||!source)throw Error('illegal 059 entry discard');
   p.outside.push(p.hand.splice(i,1)[0]);readySolo(source);source.mightyThisTurn=s.turn;
  }s.pending=null;
 }else if(q.kind==='slg077Target'){
  const p=s.players[q.p],opp=s.players[1-q.p],i=opp.front.findIndex(c=>c?.uid===action.uid);
  if(i<0||!q.options.includes(action.uid)||!canSelectEnemy(s,q.p,opp.front[i]))throw Error('illegal island event target');
  const target=opp.front[i];p.ap-=target.extraTargetAp||0;
  retire(s,1-q.p,target);
  const names=new Set(field(p).filter(c=>d(c).traits?.includes('第四次架南島Raid')).map(c=>d(c).nameJa));
  s.pending=names.size>=5?{kind:'slg077Buff',p:q.p}:null;
 }else if(q.kind==='slg077Buff'){
  const p=s.players[q.p],target=action.uid==null?null:field(p).find(c=>c.uid===action.uid&&d(c).type==='character');
  if(action.uid!=null&&!target)throw Error('illegal island BP target');
  if(target)target.buffs.push({turn:s.turn,bp:1000});
  s.pending=null;
 }else if(q.kind==='slgEndRaid'){
  const p=s.players[q.p],host=field(p).find(c=>c.uid===q.source);
  if(!host)throw Error('Raid top missing before chained replacement');
  if(action.uid==null){s.pending=null;advanceAttackEnd(s);}
  else{
   const card=p.hand.find(c=>c.uid===action.uid),expected=host.cardId==='SLG-1-047'?'SLG-1-048':'SLG-1-049';
   if(action.uid!=='peel'&&(!card||card.cardId!==expected)||!Array.isArray(action.used)||action.used.length!==q.amount||new Set(action.used).size!==q.amount)throw Error('illegal chain Raid');
   const owned=field(p).flatMap(c=>(c.under||[]).filter(x=>x.faceDown).map(x=>x.uid));
   if(action.used.some(uid=>!owned.includes(uid)))throw Error('cannot pay another player facedown cards');
   for(const uid of action.used){
    const container=field(p).find(c=>(c.under||[]).some(x=>x.uid===uid));
    const i=container.under.findIndex(x=>x.uid===uid),[under]=container.under.splice(i,1);p.outside.push({...under,faceDown:false});
   }
   const base=host.stack?.[0];if(!base)throw Error('no raid base');
   const deeper=host.stack.slice(1),{line,slot,ready}=host;
   base.stack=deeper;base.line=line;base.slot=slot;base.owner=q.p;base.ready=ready;
   base.under=[...(base.under||[]),...(host.under||[])];host.under=[];host.stack=[];
   p[line][slot]=base;p.outside.push(host);
   s.pending=null;
   if(action.uid!=='peel'){
    const i=p.hand.findIndex(x=>x.uid===card.uid);p.hand.splice(i,1);
    position(card,q.p,line,slot);card.stack=[base,...deeper];delete base.stack;card.ready=true;p[line][slot]=card;
    onEnter(s,card);
   }
   if(!s.pending)advanceAttackEnd(s);
  }
 }else if(q.kind==='slg061End'){
  const p=s.players[q.p];
  if(action.uid==null){s.pending=null;advanceAttackEnd(s);}
  else{
   const i=p.hand.findIndex(c=>c.uid===action.uid);if(i<0)throw Error('invalid endphase discard');
   p.outside.push(p.hand.splice(i,1)[0]);s.pending={kind:'slg061Active',p:q.p};
  }
 }else if(q.kind==='slg061Active'){
  const p=s.players[q.p],c=action.uid==null?null:field(p).find(c=>c.uid===action.uid&&isIsland(c));
  if(action.uid!=null&&!c)throw Error('invalid active island target');
  if(c)readySolo(c);
  s.pending=null;advanceAttackEnd(s);
 }else if(q.kind==='slg061Enter'){
  const p=s.players[q.p],source=field(p).find(c=>c.uid===q.source),target=action.uid==null?null:field(p).find(c=>c.uid===action.uid&&c.uid!==q.source&&isIsland(c));
  if(action.uid!=null&&!target)throw Error('illegal Minobu entry BP target');
  if(target)target.buffs.push(target.cardId==='SLG-1-059'?{bp:1000,expiresOwnTurn:p.ownTurns+1}:{bp:1000,turn:s.turn});
  s.pending=null;
 }else if(q.kind==='slg064Attack'){
  if(action.mode==='repeat'){
   s.pending=null;apply064Debuff(s,q.p);
   continueAttackEffects(s);
  }else if(action.mode==='destroy'){
   const opp=s.players[1-q.p],p=s.players[q.p],targets=opp.front.filter(c=>soloMatchBp(s,c)<=2000&&canSelectEnemy(s,q.p,c));
   s.pending={kind:'slg064Destroy',p:q.p,options:targets.map(x=>x.uid)};
   if(!targets.length){s.pending=null;continueAttackEffects(s);}
  }else throw Error('invalid Mogami attack mode');
 }else if(q.kind==='slg064Destroy'){
  const opp=s.players[1-q.p],p=s.players[q.p],target=action.uid==null?null:opp.front.find(c=>c?.uid===action.uid);
  if(action.uid!=null&&(!target||!q.options.includes(action.uid)||!canSelectEnemy(s,q.p,target)))throw Error('invalid Mogami retire target');
  if(target){p.ap-=target.extraTargetAp||0;retire(s,1-q.p,target);}
  s.pending=null;continueAttackEffects(s);
 }else if(q.kind==='slg051Mode'){
  if(action.mode==='recover'){
   const p=s.players[q.p];s.pending={kind:'slg051Recover',p:q.p,options:p.outside.filter(c=>d(c).type==='character'&&d(c).energy<=2).map(c=>c.uid)};
  }else if(action.mode==='raid'){
   const p=s.players[q.p];if(p.ap<1||!p.hand.length)throw Error('not enough AP or hand for Eri Raid');
   p.ap--;s.pending={kind:'slg051Discard',p:q.p};
  }else throw Error('unknown Eri mode');
 }else if(q.kind==='slg051Recover'){
  if(action.uid!=null&&!q.options.includes(action.uid))throw Error('invalid Eri recovery');
  s.pending=null;if(action.uid!=null)recoverSolo(s,q.p,action.uid,'観月 絵里');
 }else if(q.kind==='slg051Discard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('invalid Eri cost');
  const [discarded]=p.hand.splice(i,1);p.outside.push(discarded);
  s.pending={kind:'slg051Raid',p:q.p};
 }else if(q.kind==='slg051Raid'){
  if(action.uid==null){s.pending=null;}
  else{
   const p=s.players[q.p],c=p.outside.find(x=>x.uid===action.uid&&x.cardId==='SLG-1-047');
   const base=field(p).find(x=>x.uid===action.target);
   if(!c||!base||!canRaid(s,q.p,c,base))throw Error('invalid Eri outside Raid');
   s.pending=null;raidReplace(s,q.p,c,base,action.line,action.slot,false,'outside');
  }
 }else if(q.kind==='slg048Deploy'){
  if(action.uid==null)s.pending=null;
  else{
   const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid),c=p.hand[i];
   if(!c||d(c).color!=='green'||d(c).type!=='character'||d(c).energy>3||d(c).ap!==1||!['front','energy'].includes(action.line)||p[action.line][action.slot])throw Error('invalid 048 deployment');
   p.hand.splice(i,1);position(c,q.p,action.line,action.slot);p[action.line][action.slot]=c;
   s.pending=null;onEnter(s,c);
  }
 }else if(q.kind==='slg049Destroy'){
  if(action.uid==null)s.pending=null;
  else{
   const p=s.players[q.p],target=s.players[1-q.p].front.find(c=>c?.uid===action.uid);
   if(!canSelectEnemy(s,q.p,target))throw Error('illegal Raid 049 destroy target');
   p.ap-=target.extraTargetAp||0;s.pending=null;retire(s,1-q.p,target);
  }
 }else if(q.kind==='slg020EntryDiscard'){
  const p=s.players[q.p];
  if(action.uid==null){s.pending=null;}
  else{
   const i=p.hand.findIndex(c=>c.uid===action.uid);if(i<0)throw Error('illegal 020 discard');
   p.outside.push(p.hand.splice(i,1)[0]);p.discardByOwnEffectTurn=s.turn;
   s.pending={kind:'slg020Recover',p:q.p,options:p.outside.filter(c=>d(c).type==='character'&&!isSung(c)&&d(c).bp<=3000).map(c=>c.uid)};
  }
 }else if(q.kind==='slg020Recover'||q.kind==='slg021Win'){
  if(action.uid!=null&&!q.options.includes(action.uid))throw Error('illegal Sung recovery');
  s.pending=null;
  if(action.uid!=null)recoverSolo(s,q.p,action.uid,'水篠 旬');
 }else if(q.kind==='slg020AttackDiscard'||q.kind==='slg048Under'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('illegal Sung attack hand cost');
  const [card]=p.hand.splice(i,1);
  if(q.kind==='slg048Under'){
   const host=field(p).find(c=>c.uid===q.source);if(!host)throw Error('missing attack Raid host');
   host.under??=[];host.under.push({...card,faceDown:true});
  }else p.outside.push(card);
  s.pending=null;continueAttackEffects(s);
 }else if(q.kind==='slg022Enter'){
  const p=s.players[q.p],c=action.uid==null?null:field(p).find(c=>c.uid===action.uid&&shadow(c)&&c.line===q.line);
  if(action.uid!=null&&!c)throw Error('not own matching shadow-line target');
  if(c)readySolo(c);
  if(q.line==='front')s.pending={kind:'slg022Enter',p:q.p,line:'energy'};
  else s.pending=null;
 }else if(q.kind==='slg060Swap'){
  if(action.uid==null){s.pending=null;return;}
  const p=s.players[q.p],source=p.energy.find(c=>c?.uid===action.uid);
  if(!source||source.cardId!=='SLG-1-060')throw Error('invalid Machida');
  s.pending={kind:'slg060Target',p:q.p,source:source.uid};
 }else if(q.kind==='slg060Target'||q.kind==='slg022Swap'){
  const p=s.players[q.p],source=p.energy.find(c=>c?.uid===q.source),target=p.front.find(c=>c?.uid===action.uid);
  if(action.uid===null){s.pending=null;}
  else{
   if(!source||!target||(q.kind==='slg060Target'?source.cardId!=='SLG-1-060'||!(target.skipActive>0):source.cardId!=='SLG-1-022'||!shadow(target)))throw Error('illegal swap targets');
   const a=source.slot,b=target.slot;p.energy[a]=target;p.front[b]=source;
   source.line='front';source.slot=b;target.line='energy';target.slot=a;s.pending=null;
  }
 }else if(q.kind==='entry002Mode'){
  const p=s.players[q.p];
  if(action.mode==='drawDiscard'){
   draw(s,p);
   s.pending=p.hand.length?{kind:'entry002Discard',p:q.p}:null;
  }else if(action.mode==='buff'){
   s.pending={kind:'entry002Buff',p:q.p,source:q.source};
  }else throw Error('invalid 002 choice mode');
 }else if(q.kind==='entry002Buff'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid&&x.uid!==q.source&&d(x).type==='character');
  if(action.uid!=null&&!c)throw Error('buff must target another own character');
  if(c)c.buffs.push({turn:s.turn,bp:1000});
  s.pending=null;
 }else if(q.kind==='entry002Discard'||q.kind==='entry004Discard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('invalid required hand discard');
  p.outside.push(p.hand.splice(i,1)[0]);p.discardByOwnEffectTurn=s.turn;s.pending=null;
 }else if(q.kind==='taiseiGrant'){
  const p=s.players[q.p],target=action.uid==null?null:field(p).find(c=>c.uid===action.uid);
  if(action.uid!=null&&(!target||!q.options.includes(target.uid)))throw Error('illegal Taisei target');
  if(target)target.unblockableHighTurn=s.turn;
  s.pending=null;
 }else if(q.kind==='igrisDeploy'){
  const p=s.players[q.p];
  if(action.uid==null){s.pending=null;}
  else{
   const area=['hand','outside'].find(zone=>p[zone].some(c=>c.uid===action.uid&&c.cardId==='SLG-1-030'));
   if(!area||!['front','energy'].includes(action.line)||!Number.isInteger(action.slot)||action.slot<0||action.slot>3||p[action.line][action.slot])throw Error('illegal Igris summon position');
   const i=p[area].findIndex(c=>c.uid===action.uid),[soldier]=p[area].splice(i,1);
   position(soldier,q.p,action.line,action.slot);soldier.ready=false;p[action.line][action.slot]=soldier;
   s.pending=null;onEnter(s,soldier);
  }
 }else if(q.kind==='castleCost'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('illegal Demon Castle discard');
  p.outside.push(p.hand.splice(i,1)[0]);
  s.pending={kind:'castlePotion',p:q.p};
 }else if(q.kind==='castlePotion'){
  const p=s.players[q.p];
  if(action.uid!=null){
   const i=p.outside.findIndex(c=>c.uid===action.uid&&c.cardId==='SLG-1-037');
   if(i<0||p.ap<1||soloEnergy(s,q.p)<4)throw Error('illegal Demon Castle potion');
   p.ap--;p.removed.push(p.outside.splice(i,1)[0]);
   s.pending={kind:'castleRecover',p:q.p,options:p.outside.filter(c=>d(c).type==='character'&&d(c).bp!=null&&d(c).bp<=4000).map(c=>c.uid)};
  }else s.pending=null;
 }else if(q.kind==='castleRecover'){
  const p=s.players[q.p];
  if(action.uid!=null){
   const i=p.outside.findIndex(c=>c.uid===action.uid);
   if(i<0||!q.options.includes(action.uid))throw Error('illegal Demon Castle recovery');
   s.pending=null;recoverSolo(s,q.p,action.uid,'悪魔の城');
  }else s.pending=null;
  draw(s,p);
 }else if(q.kind==='shadowSummonMode'){
  if(!['oneActive','twoRest'].includes(action.mode))throw Error('illegal shadow resurrection mode');
  s.pending={kind:'shadowSummonCard',p:q.p,mode:action.mode,left:action.mode==='oneActive'?1:2};
 }else if(q.kind==='shadowSummonCard'){
  const p=s.players[q.p];
  if(action.uid==null){s.pending=null;}
  else{
   const index=p.outside.findIndex(c=>c.uid===action.uid&&d(c).type==='character'&&shadow(c)&&
     (q.mode==='oneActive'||d(c).energy<=3));
   if(index<0||!['energy','front'].includes(action.line)||!Number.isInteger(action.slot)||action.slot<0||action.slot>3||p[action.line][action.slot])throw Error('illegal shadow resurrection target or position');
   const [c]=p.outside.splice(index,1);
   position(c,q.p,action.line,action.slot);
   c.ready=q.mode==='oneActive';p[action.line][action.slot]=c;
   const remaining=q.left-1;
   s.pending=null;onEnter(s,c);
   if(remaining>0&&s.status==='playing'){
    const continuation={kind:'shadowSummonCard',p:q.p,mode:q.mode,left:remaining};
    if(s.pending){s.pendingStack??=[];s.pendingStack.push(continuation);}
    else s.pending=continuation;
   }
  }
 }else if(q.kind==='eventDiscard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('invalid event discard');
  p.outside.push(p.hand.splice(i,1)[0]);q.left--;
  if(q.left===0||!p.hand.length)s.pending=null;
 }else if(q.kind==='eventRecover'){
  const p=s.players[q.p];
  if(action.uid!=null){
   const i=p.outside.findIndex(c=>c.uid===action.uid);
   if(i<0||!q.options.includes(action.uid))throw Error('illegal event recovery');
   s.pending=null;recoverSolo(s,q.p,action.uid,'命の神水');
  }else s.pending=null;
  draw(s,p);
 }else if(q.kind==='eventRestoreAp'){
  const p=s.players[q.p],max=Math.min(2,p.maxAp-p.ap);
  if(!Number.isInteger(action.count)||action.count<0||action.count>max)throw Error('invalid event AP restore');
  p.ap+=action.count;s.pending=null;
 }else if(q.kind==='eventDestroy'){
  const target=s.players[1-q.p].front.find(x=>x?.uid===action.uid);
  if(!target||!q.options.includes(target.uid)||!canSelectEnemy(s,q.p,target))throw Error('illegal event target');
  s.players[q.p].ap-=target.extraTargetAp||0;
  retire(s,1-q.p,target);s.pending=null;
 }else if(q.kind==='eventDance'){
  const p=s.players[q.p],c=action.uid==null?null:field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&(!c||d(c).nameJa!=='向坂 雫'))throw Error('舞姫 target must be Shizuku');
  if(c){c.grants??=[];c.grants.push({kind:'attackDraw',turn:s.turn});}
  s.pending=null;
 }else if(q.kind==='marieBuff'){
  const p=s.players[q.p],target=field(p).find(c=>c.uid===action.uid);
  const marie=field(p).find(c=>c.uid===q.source);
  if(!target||!marie||target.uid===marie.uid)throw Error('Marie needs other friendly character');
  target.buffs.push({turn:s.turn,bp:1000});
  returnSoloToHand(s,q.p,marie);s.pending=null;
 }else if(q.kind==='entryDrawMode'){
  const p=s.players[q.p];
  if(action.mode==='draw2'){draw(s,p,2);s.pending=null;}
  else if(action.mode==='drawRecover'){draw(s,p);s.pending={kind:'entryRecover',p:q.p,options:p.outside.filter(x=>d(x)?.type==='character'&&d(x).energy<=3&&d(x).traits.length===0).map(x=>x.uid)};}
  else throw Error('illegal draw or recovery selection');
 }else if(q.kind==='entryRecover'||q.kind==='sungRecovery'){
  if(action.uid!=null){
   const p=s.players[q.p],i=p.outside.findIndex(c=>c.uid===action.uid);
   if(i<0||!q.options.includes(action.uid))throw Error('illegal outside recovery');
   s.pending=null;recoverSolo(s,q.p,action.uid,'観月 絵里');
  }else s.pending=null;
 }else if(q.kind==='entryBounce'){
  const p=s.players[q.p],c=field(p).find(c=>c.uid===action.uid);
  if(!c||!q.options.includes(action.uid))throw Error('illegal return target');
  returnSoloToHand(s,q.p,c);s.pending=null;
 }else if(q.kind==='dailyDiscard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('illegal daily cost');
  p.outside.push(p.hand.splice(i,1)[0]);
  s.pending={kind:'dailyUnder',p:q.p,options:field(p).flatMap(c=>(c.under||[]).filter(x=>x.faceDown).map(x=>x.uid))};
 }else if(q.kind==='dailyUnder'){
  const p=s.players[q.p];
  if(action.uid==null){s.pending=null;}
  else{
   const host=field(p).find(c=>(c.under||[]).some(x=>x.uid===action.uid&&x.faceDown));
   if(!host||!q.options.includes(action.uid))throw Error('not your own facedown attachment');
   const i=host.under.findIndex(x=>x.uid===action.uid),[under]=host.under.splice(i,1);
   p.outside.push({...under,faceDown:false});
   s.pending={kind:'dailyRecover',p:q.p,options:p.outside.filter(c=>d(c).type==='character'&&d(c).energy===0&&d(c).nameJa==='水篠 旬').map(c=>c.uid)};
  }
 }else if(q.kind==='dailyRecover'){
  if(action.uid!=null){
   const p=s.players[q.p],i=p.outside.findIndex(c=>c.uid===action.uid);
   if(i<0||!q.options.includes(action.uid))throw Error('illegal daily recovery');
   s.pending=null;recoverSolo(s,q.p,action.uid,'デイリークエスト');
  }else s.pending=null;
 }else if(q.kind==='raidTrigger'){
  if(action.uid!=null){
   const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===q.uid),c=p.hand[i];
   const base=field(p).find(x=>x.uid===action.uid);
   if(i<0||!canRaid(s,q.p,c,base))throw Error('illegal life Raid');
   s.pending=null;raidReplace(s,q.p,c,base,action.line,action.slot,false);
  }else s.pending=null;
 }else if(q.kind==='raid058Discard'){
  const p=s.players[q.p];
  if(action.uid!=null){
   const i=p.hand.findIndex(c=>c.uid===action.uid);if(i<0)throw Error('illegal Raid discard');
   p.outside.push(p.hand.splice(i,1)[0]);
   const a=byUid(p.front,q.source);a.raid058Used=s.turn;
   s.pending={kind:'raid058Unfreeze',p:q.p,source:q.source};
  }else{s.pending=null;continueAttackEffects(s);}
 }else if(q.kind==='raid058Unfreeze'){
  const p=s.players[q.p],a=byUid(p.front,q.source),c=action.uid==null?null:byUid(p.front,action.uid);
  if(action.uid!=null&&(!c||(c.skipActive||0)===0))throw Error('only a frozen friendly front character can be chosen');
  for(const char of [c,a].filter((x,i,list)=>x&&list.findIndex(y=>y?.uid===x.uid)===i)){
   if((char.skipActive||0)>0)char.skipActive--;
   else char.ready=true;
  }
  s.pending=null;continueAttackEffects(s);
 }else if(q.kind==='mainDiscard'){
  const p=s.players[q.p],i=p.hand.findIndex(c=>c.uid===action.uid);
  if(i<0)throw Error('main action must choose a hand card');
  p.outside.push(p.hand.splice(i,1)[0]);
  const c=field(p).find(x=>x.uid===q.source);
  if(!c)throw Error('ability source gone');
  c.buffs.push({turn:s.turn,bp:1500});c.usedTurn=s.turn;s.pending=null;
 }else if(q.kind==='soldierTop'||q.kind==='peekTop'){
  const p=s.players[q.p],top=p.deck.slice(0,q.topUids.length);
  if(top.map(c=>c.uid).join()!==q.topUids.join())throw Error('deck changed during selection');
  const selected=action.outsideUid;
  if(selected!=null&&!q.eligible.includes(selected))throw Error('not eligible shadow or Sung card');
  const remaining=q.topUids.filter(uid=>uid!==selected);
  if(action.order.length!==remaining.length||new Set(action.order).size!==remaining.length||action.order.some(uid=>!remaining.includes(uid)))throw Error('invalid deck top order');
  const cards=p.deck.splice(0,q.topUids.length),lookup=Object.fromEntries(cards.map(c=>[c.uid,c]));
  if(selected!=null)p.outside.push(lookup[selected]);
  p.deck.unshift(...action.order.map(uid=>lookup[uid]));
  s.pending=null;if(q.afterAttack)continueAttackEffects(s);
 }else if(q.kind==='activeTrigger'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&!c)throw Error('illegal trigger target');
  if(c){if((c.skipActive||0)>0)c.skipActive--;else c.ready=true;c.buffs.push({turn:s.turn,bp:3000});}
  s.pending=null;
 }else if(q.kind==='block'){
  if(action.uid!=null&&!q.choices.includes(action.uid))throw Error('illegal block');
  s.pending=null;combat(s,action.uid);
 }else throw Error('unknown choice type');
 if(!s.pending&&s.pendingStack?.length)s.pending=s.pendingStack.pop();
 if(!s.pending&&s.pendingLifeDamage&&s.status==='playing'){
  const {p,remaining}=s.pendingLifeDamage;s.pendingLifeDamage=null;
  if(remaining>0)hurt(s,p,remaining);
 }
 if(!s.pending&&s.status==='playing'&&s.phase==='attack'&&!s.pendingLifeDamage){
  // A player at zero life loses only after the final life trigger has resolved.
  const defender=s.players.findIndex(p=>p.life.length===0);
  if(defender>=0){s.status='finished';s.winner=1-defender;}
 }
 if(!s.pending&&s.afterAttackPending&&s.status==='playing')scheduleAttackAfter(s);
 if(!s.pending&&s.phase==='attackEnd')advanceAttackEnd(s);
}
function apply064Debuff(s,p){
 const own=s.players[p],opp=s.players[1-p];
 if(field(own).filter(isIsland).length<5)return;
 for(const enemy of opp.front.filter(c=>c&&soloMatchBp(s,c)>=1500))
  enemy.buffs.push({turn:s.turn,bp:-1000});
}
function onEnter(s,c){
 const p=s.players[c.owner];
 if(c.cardId==='SLG-1-014'||c.cardId==='SLG-1-016'){
  const n=c.cardId==='SLG-1-014'?1:2;for(let i=0;i<n&&p.deck.length;i++)p.outside.push(p.deck.shift());
 }
 if(c.cardId==='SLG-1-002')s.pending={kind:'entry002Mode',p:c.owner,source:c.uid};
 if(c.cardId==='SLG-1-004'){
  draw(s,p);
  s.pending=p.hand.length?{kind:'entry004Discard',p:c.owner,source:c.uid}:null;
 }
 if(c.cardId==='SLG-1-017'&&p.deck.length){
  const top=p.deck.slice(0,1);
  s.pending={kind:'peekTop',p:c.owner,source:c.uid,topUids:top.map(x=>x.uid),eligible:top.map(x=>x.uid)};
 }
 if(c.cardId==='SLG-1-054'&&p.deck.length){
  const top=p.deck.slice(0,2);
  s.pending={kind:'peekTop',p:c.owner,source:c.uid,topUids:top.map(x=>x.uid),
   eligible:top.filter(x=>d(x).traits?.includes('第四次架南島Raid')).map(x=>x.uid)};
 }
 if(c.cardId==='SLG-1-008')searchStart(s,c.owner,c.uid,4,1,x=>isSung(x)||d(x).nameJa==='悪魔の城','discard');
 if(c.cardId==='SLG-1-018')searchStart(s,c.owner,c.uid,3,1,x=>isSung(x)||shadow(x),'discard');
 if(c.cardId==='SLG-1-046')searchStart(s,c.owner,c.uid,4,1,x=>isSung(x)||d(x).nameJa==='デイリークエスト','discard');
 if(c.cardId==='SLG-1-063')searchStart(s,c.owner,c.uid,3,1,x=>d(x).traits?.includes('第四次架南島Raid'),'discard');
 if(c.cardId==='SLG-1-011'&&p.deck.length)enqueue(s,{kind:'slgMill',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-019'&&p.hand.some(shadow))enqueue(s,{kind:'slg019Entry',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-044'){
  draw(s,p);if(p.hand.length)enqueue(s,{kind:'slgDiscard',p:c.owner,source:c.uid});
 }
 if(c.cardId==='SLG-1-020'){draw(s,p);if(p.hand.length)enqueue(s,{kind:'slg020EntryDiscard',p:c.owner,source:c.uid});}
 if(c.cardId==='SLG-1-047')draw(s,p);
 if(c.cardId==='SLG-1-048'){
  enqueue(s,{kind:'slg048Deploy',p:c.owner,source:c.uid});
  if(s.active===c.owner&&s.status==='playing')draw(s,p);
 }
 if(c.cardId==='SLG-1-049'&&s.active===c.owner)
  enqueue(s,{kind:'slg049Destroy',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-051')enqueue(s,{kind:'slg051Mode',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-061')enqueue(s,{kind:'slg061Enter',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-064')apply064Debuff(s,c.owner);
 if(c.cardId==='SLG-1-021')c.mustBlockTurn=s.turn;
 if(c.cardId==='SLG-1-022'){c.grants??=[];c.grants.push({kind:'snipe',turn:s.turn});enqueue(s,{kind:'slg022Enter',p:c.owner,line:'front'});}
 if(c.cardId==='SLG-1-059'&&p.hand.length)enqueue(s,{kind:'slg059Entry',p:c.owner,source:c.uid});
 if(c.cardId==='SLG-1-030'&&field(p).some(x=>x.uid!==c.uid&&d(x).traits?.includes('影之軍團'))){
  const top=p.deck.slice(0,2);
  const eligible=top.filter(x=>d(x).traits?.includes('影之軍團')||d(x).nameJa==='水篠 旬');
  if(top.length)s.pending={kind:'soldierTop',p:c.owner,source:c.uid,topUids:top.map(x=>x.uid),eligible:eligible.map(x=>x.uid)};
 }
 if(['SLG-1-028','SLG-1-034','SLG-1-035','SLG-1-073'].includes(c.cardId))c.ready=true;
 if(c.cardId==='SLG-1-028'&&[...p.hand,...p.outside].some(x=>x.cardId==='SLG-1-030'))s.pending={kind:'igrisDeploy',p:c.owner};
 if(c.cardId==='SLG-1-057'&&!groupUsed(s,c.owner,'shizuku057Entry')&&field(p).filter(x=>d(x).traits?.includes('第四次架南島Raid')).length>=5){
  markGroup(s,c.owner,'shizuku057Entry');readySolo(c);c.freezeSelfOnAttackTurn=s.turn;
 }
 if(c.cardId==='SLG-1-073'&&!groupUsed(s,c.owner,'ryuuEntry')){
  markGroup(s,c.owner,'ryuuEntry');s.pending={kind:'ryuuBuff',p:c.owner,source:c.uid};
 }
 if(c.cardId==='SLG-1-067'&&!groupUsed(s,c.owner,'kana')&&field(p).filter(x=>d(x).traits?.includes('DFN')).length>=3){
  markGroup(s,c.owner,'kana');draw(s,p);readySolo(c);c.buffs.push({turn:s.turn,bp:1000});
 }
 if(c.cardId==='SLG-1-058')c.buffs.push({turn:s.turn,bp:1000});
 if(['SLG-1-012','SLG-1-053'].includes(c.cardId)&&field(p).some(x=>d(x).nameJa==='水篠 旬'))draw(s,p);
 if(c.cardId==='SLG-1-025')s.pending={kind:'entryDrawMode',p:c.owner};
 if(['SLG-1-026','SLG-1-068'].includes(c.cardId)){
  const eligible=field(p).filter(x=>x.uid!==c.uid&&d(x).type==='character'&&d(x).energy<=1).map(x=>x.uid);
  if(eligible.length)s.pending={kind:'entryBounce',p:c.owner,source:c.uid,options:eligible};
  else returnSoloToHand(s,c.owner,c);
 }
 if(c.cardId==='SLG-1-043'){draw(s,p);if(p.hand.length)s.pending={kind:'discard',p:c.owner,source:c.uid};}
 if(c.cardId==='SLG-1-072'&&field(p).filter(x=>d(x).traits?.includes('DFN')).length>=3)draw(s,p);
 if(c.cardId==='SLG-1-074')s.pending={kind:'entryImpact',p:c.owner,source:c.uid};
 if(c.cardId==='SLG-1-070')s.pending={kind:'entryProtect',p:c.owner,source:c.uid};
}
export function soloTrainingLegalActions(s){
 if(s.status!=='playing')return [];
 if(s.pending){
  const q=s.pending;
  if(q.kind==='discard'||q.kind==='mainDiscard'||q.kind==='belDiscard'||q.kind==='dailyDiscard'||q.kind==='kibaDiscard')
   return [...(q.kind==='belDiscard'? [{type:'choose',uid:null}]:[]),...s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='kaiserPick'||q.kind==='kibaPick')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='kaiserMode')return ['block','untargetable'].filter(mode=>!groupUsed(s,q.p,'kaiser:'+mode)).map(mode=>({type:'choose',mode}));
  if(q.kind==='kibaMode')return ['buff','draw'].filter(mode=>!groupUsed(s,q.p,'kiba:'+mode)).map(mode=>({type:'choose',mode}));
  if(q.kind==='attackDraw')return [{type:'choose',draw:false},{type:'choose',draw:true}];
  if(q.kind==='slgSearch'){
   const p=s.players[q.p],results=[];
   const perm=a=>a.length<2?[a]:a.flatMap((x,i)=>perm(a.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));
   const pickSubsets=[[]];
   const visit=(from,selected)=>{if(selected.length>=q.maxPicks)return;for(let i=from;i<q.eligible.length;i++){const subset=[...selected,q.eligible[i]];pickSubsets.push(subset);visit(i+1,subset);}};
   visit(0,[]);
   for(const picks of pickSubsets){const remaining=q.topUids.filter(uid=>!picks.includes(uid));
    for(const order of perm(remaining))results.push({type:'choose',picks,order});
   }
   return results;
  }
  if(q.kind==='slgMill')return [{type:'choose',mill:false},{type:'choose',mill:true}];
  if(q.kind==='slgDiscard'||q.kind==='slg019Recover')return s.players[q.p].hand.filter(c=>q.kind==='slgDiscard'||shadow(c)).map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='slgRecoveredBuff')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>d(c).type==='character').map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slgRecoveredDeploy'){
   const p=s.players[q.p],actions=[{type:'choose',uid:null}],card=p.hand.find(c=>c.uid===q.uid);
   if(card&&(card.cardId==='SLG-1-014'||soloEnergy(s,q.p)>=4))
    for(const line of (card.cardId==='SLG-1-014'?['energy']:['front','energy']))
     for(let slot=0;slot<4;slot++)if(!p[line][slot])actions.push({type:'choose',uid:q.uid,line,slot});
   return actions;
  }
  if(q.kind==='slg019Entry'||q.kind==='slg059Entry')return [{type:'choose',uid:null},...s.players[q.p].hand.filter(c=>q.kind==='slg059Entry'||shadow(c)).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg044Target'){const p=s.players[q.p];return field(p).filter(isSung).flatMap(c=>[{type:'choose',uid:c.uid,attach:false},...(p.deck.length?[{type:'choose',uid:c.uid,attach:true}]:[])]);}
  if(q.kind==='slg077Target')return q.options.map(uid=>({type:'choose',uid}));
  if(q.kind==='slg077Buff')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>d(c).type==='character').map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slgEndRaid'){
   const p=s.players[q.p],source=field(p).find(c=>c.uid===q.source),expected=source?.cardId==='SLG-1-047'?'SLG-1-048':'SLG-1-049';
   const cards=p.hand.filter(c=>c.cardId===expected);
   const attached=field(p).flatMap(c=>(c.under||[]).filter(x=>x.faceDown).map(x=>x.uid));
   const combinations=(arr,n,i=0,taken=[])=>n===0?[taken]:arr.flatMap((x,j)=>j<i?[]:combinations(arr,n-1,j+1,[...taken,x]));
   return [{type:'choose',uid:null},...combinations(attached,q.amount).map(used=>({type:'choose',uid:'peel',used})),...cards.flatMap(c=>combinations(attached,q.amount).map(used=>({type:'choose',uid:c.uid,used})))];
  }
  if(q.kind==='slg061End')return [{type:'choose',uid:null},...s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg061Active')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(isIsland).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg061Enter')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>c.uid!==q.source&&isIsland(c)).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg064Attack')return [{type:'choose',mode:'repeat'},{type:'choose',mode:'destroy'}];
  if(q.kind==='slg064Destroy')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='slg051Mode'){
   const p=s.players[q.p];
   return [{type:'choose',mode:'recover'},...(p.ap>0&&p.hand.length?[{type:'choose',mode:'raid'}]:[])];
  }
  if(q.kind==='slg051Recover')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='slg051Discard')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='slg051Raid'){
   const p=s.players[q.p],candidates=p.outside.filter(c=>c.cardId==='SLG-1-047');
   return [{type:'choose',uid:null},...candidates.flatMap(c=>field(p).filter(base=>canRaid(s,q.p,c,base)).flatMap(base=>
    [{type:'choose',uid:c.uid,target:base.uid,line:base.line,slot:base.slot},...(base.line==='energy'?p.front.flatMap((x,slot)=>x?[]:[{type:'choose',uid:c.uid,target:base.uid,line:'front',slot}]):[])]))];
  }
  if(q.kind==='slg048Deploy'){
   const p=s.players[q.p],cards=p.hand.filter(c=>d(c).type==='character'&&d(c).color==='green'&&d(c).energy<=3&&d(c).ap===1);
   return [{type:'choose',uid:null},...cards.flatMap(c=>['front','energy'].flatMap(line=>p[line].flatMap((x,slot)=>x?[]:[{type:'choose',uid:c.uid,line,slot}])))];
  }
  if(q.kind==='slg049Destroy'){
   const p=s.players[q.p],front=s.players[1-q.p].front;
   return [{type:'choose',uid:null},...front.filter(c=>canSelectEnemy(s,q.p,c)).map(c=>({type:'choose',uid:c.uid}))];
  }
  if(q.kind==='slg020EntryDiscard')return [{type:'choose',uid:null},...s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg020Recover'||q.kind==='slg021Win')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='slg020AttackDiscard'||q.kind==='slg048Under')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='slg022Enter')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>shadow(c)&&c.line===q.line).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg060Swap')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='slg060Target')return [{type:'choose',uid:null},...s.players[q.p].front.filter(c=>c&&(c.skipActive||0)>0).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='slg022Swap')return [{type:'choose',uid:null},...s.players[q.p].front.filter(shadow).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='entry002Mode')return [{type:'choose',mode:'drawDiscard'},{type:'choose',mode:'buff'}];
  if(q.kind==='entry002Buff')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(x=>x.uid!==q.source&&d(x).type==='character').map(x=>({type:'choose',uid:x.uid}))];
  if(q.kind==='entry002Discard'||q.kind==='entry004Discard')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='taiseiGrant')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='igrisDeploy'){
   const p=s.players[q.p],candidates=[...p.hand,...p.outside].filter(c=>c.cardId==='SLG-1-030');
   return [{type:'choose',uid:null},...candidates.flatMap(c=>['front','energy'].flatMap(line=>p[line].flatMap((slotCard,slot)=>slotCard?[]:[{type:'choose',uid:c.uid,line,slot}])))];
  }
  if(q.kind==='castleCost')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='castlePotion')return [{type:'choose',uid:null},...s.players[q.p].outside.filter(c=>c.cardId==='SLG-1-037'&&s.players[q.p].ap>=1&&soloEnergy(s,q.p)>=4).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='castleRecover')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='shadowSummonMode')return [{type:'choose',mode:'oneActive'},{type:'choose',mode:'twoRest'}];
  if(q.kind==='shadowSummonCard'){
   const p=s.players[q.p],available=p.outside.filter(c=>d(c).type==='character'&&shadow(c)&&(q.mode==='oneActive'||d(c).energy<=3));
   return [{type:'choose',uid:null},...available.flatMap(c=>['front','energy'].flatMap(line=>p[line].flatMap((v,slot)=>v?[]:[{type:'choose',uid:c.uid,line,slot}])) )];
  }
  if(q.kind==='eventDiscard')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='eventRecover'||q.kind==='eventDance')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='eventRestoreAp'){
   const p=s.players[q.p],max=Math.min(2,p.maxAp-p.ap);return Array.from({length:max+1},(_,count)=>({type:'choose',count}));
  }
  if(q.kind==='eventDestroy'||q.kind==='marieBuff')return q.options.map(uid=>({type:'choose',uid}));
  if(q.kind==='ryuuBuff')return [{type:'choose',uid:null},...field(s.players[q.p]).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='ryuuAp'){
   const p=s.players[q.p],max=Math.min(2,p.maxAp-p.ap);return Array.from({length:max+1},(_,count)=>({type:'choose',count}));
  }
  if(q.kind==='entryDrawMode')return [{type:'choose',mode:'draw2'},{type:'choose',mode:'drawRecover'}];
  if(q.kind==='entryRecover'||q.kind==='sungRecovery')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='entryBounce')return q.options.map(uid=>({type:'choose',uid}));
  if(q.kind==='dailyUnder')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='dailyRecover')return [{type:'choose',uid:null},...q.options.map(uid=>({type:'choose',uid}))];
  if(q.kind==='raid058Discard')return [{type:'choose',uid:null},...s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='raid058Unfreeze')return [{type:'choose',uid:null},...s.players[q.p].front.filter(c=>c&&(c.skipActive||0)>0).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='raidTrigger'){
   const p=s.players[q.p],c=byUid(p.hand,q.uid),actions=[{type:'choose',uid:null}];
   if(c&&soloEnergy(s,q.p)>=usableEnergy(s,q.p,c))for(const base of field(p).filter(x=>canRaid(s,q.p,c,x))){
    actions.push({type:'choose',uid:base.uid,line:base.line,slot:base.slot});
    if(base.line==='energy')for(let slot=0;slot<4;slot++)if(!p.front[slot])actions.push({type:'choose',uid:base.uid,line:'front',slot});
   }
   return actions;
  }
  if(q.kind==='soldierTop'||q.kind==='peekTop'){
   const orders=x=>x.length===2?[x,[x[1],x[0]]]:[x];
   const result=[];
   for(const outsideUid of [null,...q.eligible]){
    const remaining=q.topUids.filter(uid=>uid!==outsideUid);
    for(const order of orders(remaining))result.push({type:'choose',outsideUid,order});
   }
   return result;
  }
  if(q.kind==='soloOptionalLife'){
   const p=s.players[q.p],actions=[{type:'choose',mode:'skip'}];
   if(q.trigger==='get'||q.trigger==='raid')actions.push({type:'choose',mode:'get'});
   if(q.trigger==='draw')actions.push({type:'choose',mode:'draw'});
   if(q.trigger==='final'&&p.deck.length)actions.push({type:'choose',mode:'final'});
   if(q.trigger==='raid'){
    const c=p.outside.find(c=>c.uid===q.cardUid);
    if(c&&soloEnergy(s,q.p)>=usableEnergy(s,q.p,c)&&field(p).some(base=>canRaid(s,q.p,c,base)))
     actions.push({type:'choose',mode:'raid'});
   }
   return actions;
  }
  if(q.kind==='colorTrigger'){
   const p=s.players[q.p];return [{type:'choose',uid:null},...q.choices.flatMap(uid=>(q.lines||['front','energy']).flatMap(line=>p[line].flatMap((c,slot)=>c?[]:[{type:'choose',uid,line,slot}])) )];
  }
  if(q.kind==='specialTrigger')return [{type:'choose',uid:null},...q.choices.map(uid=>({type:'choose',uid}))];
  if(q.kind==='activeTrigger')return [{type:'choose',uid:null},...field(s.players[q.p]).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='entryImpact'||q.kind==='entryProtect')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>c.uid!==q.source&&d(c).traits?.includes('DFN')).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='block')return [...(q.mandatory?[]:[{type:'choose',uid:null}]),...q.choices.map(uid=>({type:'choose',uid}))];
  return [];
 }
 const p=player(s),actions=[{type:'next'}];
 if(s.phase==='start'){
  if(!s.extraDraw&&p.ap>0&&p.deck.length)actions.push({type:'extraDraw'});
 }else if(s.phase==='move'&&!s.moved){
  for(const c of p.energy.filter(Boolean))if(d(c).type==='character'&&c.cardId!=='SLG-1-014')
   for(let slot=0;slot<4;slot++)if(!p.front[slot])actions.push({type:'move',uid:c.uid,slot});
 }else if(s.phase==='main'){
  for(const c of p.hand){
   const data=d(c);if(!SUPPORTED.has(c.cardId)||p.ap<data.ap||soloEnergy(s)<usableEnergy(s,s.active,c))continue;
   if(data.type==='event'){
    if(c.cardId==='SLG-1-077'){
     const islands=field(p).filter(x=>d(x).traits?.includes('第四次架南島Raid'));
     const limit=islands.length>=5?5000:2000;
     if(!s.players[1-s.active].front.some(x=>canSelectEnemy(s,s.active,x,p.ap-data.ap)&&soloMatchBp(s,x)<=limit))continue;
   }
   if(['SLG-1-040','SLG-1-076'].includes(c.cardId)){
     const limit=field(p).some(x=>d(x).nameJa==='水篠 旬')?5000:3000;
     if(!s.players[1-s.active].front.some(x=>canSelectEnemy(s,s.active,x,p.ap-data.ap)&&soloMatchBp(s,x)<=limit))continue;
    }
    actions.push({type:'playEvent',uid:c.uid});continue;
   }
   if(raidIds.has(c.cardId)){
    for(const base of field(p).filter(x=>canRaid(s,s.active,c,x))){
     actions.push({type:'raid',uid:c.uid,target:base.uid,line:base.line,slot:base.slot});
     if(base.line==='energy')for(let slot=0;slot<4;slot++)if(!p.front[slot])actions.push({type:'raid',uid:c.uid,target:base.uid,line:'front',slot});
    }
    continue;
   }
   for(const line of data.type==='field'||c.cardId==='SLG-1-014'?['energy']:['front','energy']){
    const slots=p[line];for(let slot=0;slot<4;slot++)if(!slots[slot])actions.push({type:'play',uid:c.uid,line,slot});
   }

  }
  if(!groupUsed(s,s.active,'sung019')&&p.hand.some(shadow))
   for(const c of p.outside.filter(c=>c.cardId==='SLG-1-019'))actions.push({type:'abilityOutside',uid:c.uid});
  for(const c of field(p)){
   if(c.cardId==='SLG-1-044'&&c.ready&&c.line==='front'&&field(p).some(isSung))
    actions.push({type:'ability',uid:c.uid,mode:'attachDamage'});
   if(c.cardId==='SLG-1-019'&&c.ready){ /* activation belongs to the outside zone only */ }
   if(c.cardId==='SLG-1-034'&&c.ready){
    actions.push({type:'ability',uid:c.uid,mode:'mill'});
    if(p.outside.length>=20&&p.hand.length&&p.ap>=1&&soloEnergy(s)>=4&&p.outside.some(x=>x.cardId==='SLG-1-037'))
     actions.push({type:'ability',uid:c.uid,mode:'potion'});
   }
   if(c.cardId==='SLG-1-071'&&c.ready&&c.usedTurn!==s.turn&&field(p).some(x=>x.uid!==c.uid&&d(x).type==='character'))actions.push({type:'ability',uid:c.uid,mode:'marie'});
   if(c.cardId==='SLG-1-050'&&c.ready)actions.push({type:'ability',uid:c.uid,mode:'retireRecover'});
   if(c.cardId==='SLG-1-035'&&c.ready)actions.push({type:'ability',uid:c.uid,mode:'boost'});
   if(c.cardId==='SLG-1-075'&&c.ready){
    if(p.deck.length&&field(p).some(x=>d(x).nameJa==='水篠 旬'))actions.push({type:'ability',uid:c.uid,mode:'attach'});
    if(p.hand.length)actions.push({type:'ability',uid:c.uid,mode:'recover'});
   }
   if(['SLG-1-042','SLG-1-013'].includes(c.cardId)&&c.ready&&c.usedTurn!==s.turn)actions.push({type:'ability',uid:c.uid});
   if(c.cardId==='SLG-1-009'&&c.usedTurn!==s.turn&&p.hand.length)actions.push({type:'ability',uid:c.uid});
  }
 }else if(s.phase==='attack'){
  for(const c of living(p))if(c.ready){
   actions.push({type:'attack',uid:c.uid});
   if((c.grants||[]).some(g=>g.kind==='snipe'&&g.turn===s.turn))
    for(const target of s.players[1-s.active].front.filter(Boolean))actions.push({type:'attackTarget',uid:c.uid,target:target.uid});
  }
 }
 return actions;
}
export function soloTrainingDispatch(original,action){
 const s=structuredClone(original),legal=soloTrainingLegalActions(s);
 if(!legal.some(a=>JSON.stringify(a)===JSON.stringify(action)))throw Error('illegal SOLO action '+JSON.stringify(action));
 if(s.pending){choose(s,action);assertSoloTrainingMatch(s);return s;}
 const p=player(s);
 if(action.type==='next'){
  if(s.phase==='start')s.phase='move';
  else if(s.phase==='move')s.phase='main';
  else if(s.phase==='main'){
   for(const c of [...field(p)])if(c.retireAtMainEnd)retire(s,s.active,c);
   s.phase='attack';
  }else if(s.phase==='attack'){
    s.phase='attackEnd';
    s.endSources=field(p).flatMap(c=>['SLG-1-047','SLG-1-048','SLG-1-061'].includes(c.cardId)?[{uid:c.uid,type:c.cardId.slice(-3)}]:[]);
    advanceAttackEnd(s);
  }
 }else if(action.type==='extraDraw'){p.ap--;s.extraDraw=true;draw(s,p);}
 else if(action.type==='move'){
  const index=p.energy.findIndex(c=>c?.uid===action.uid);
  const c=p.energy[index];p.energy[index]=null;p.front[action.slot]=c;c.line='front';c.slot=action.slot;s.moved=true;
 }else if(action.type==='playEvent'){
  const i=p.hand.findIndex(c=>c.uid===action.uid),c=p.hand.splice(i,1)[0],data=d(c);
  p.ap-=data.ap;p.outside.push(c);
  if(c.cardId==='SLG-1-036'){
   draw(s,p,3);
   if(s.status==='playing'&&p.hand.length)s.pending={kind:'eventDiscard',p:s.active,left:Math.min(2,p.hand.length)};
  }else if(c.cardId==='SLG-1-039'){
   s.pending={kind:'shadowSummonMode',p:s.active};
  }else if(c.cardId==='SLG-1-037'){
   s.pending={kind:'eventRecover',p:s.active,options:p.outside.filter(x=>d(x).type==='character'&&d(x).bp!==null&&d(x).bp<=4000).map(x=>x.uid)};
  }else if(['SLG-1-038','SLG-1-078','SLG-1-079'].includes(c.cardId)){
   s.pending={kind:'eventRestoreAp',p:s.active};
  }else if(['SLG-1-040','SLG-1-076'].includes(c.cardId)){
   const limit=field(p).some(x=>d(x).nameJa==='水篠 旬')?5000:3000;
   s.pending={kind:'eventDestroy',p:s.active,options:s.players[1-s.active].front.filter(x=>canSelectEnemy(s,s.active,x)&&soloMatchBp(s,x)<=limit).map(x=>x.uid)};
  }else if(c.cardId==='SLG-1-077'){
    const islands=field(p).filter(x=>d(x).traits?.includes('第四次架南島Raid'));
    const limit=islands.length>=5?5000:2000;
    s.pending={kind:'slg077Target',p:s.active,options:s.players[1-s.active].front.filter(x=>canSelectEnemy(s,s.active,x)&&soloMatchBp(s,x)<=limit).map(x=>x.uid)};
  }else if(c.cardId==='SLG-1-080'){
   draw(s,p);
   if(s.status==='playing')s.pending={kind:'eventDance',p:s.active,options:field(p).filter(x=>d(x).nameJa==='向坂 雫').map(x=>x.uid)};
  }
 }else if(action.type==='abilityOutside'){
   s.pending={kind:'slg019Recover',p:s.active,source:action.uid};
 }else if(action.type==='play'){
  const i=p.hand.findIndex(c=>c.uid===action.uid),c=p.hand.splice(i,1)[0],data=d(c);
  p.ap-=data.ap;position(c,s.active,action.line,action.slot);
  p[action.line][action.slot]=c;
  onEnter(s,c);
  }else if(action.type==='raid'){
  const c=byUid(p.hand,action.uid),base=field(p).find(x=>x.uid===action.target);
  raidReplace(s,s.active,c,base,action.line,action.slot);
  }else if(action.type==='ability'){
  const c=own(s,action.uid);
  if(c.cardId==='SLG-1-044'){
    if(c.line!=='front'||!c.ready||!p.deck.length)throw Error('Aoi must be active in front');
    c.ready=false;s.pending={kind:'slg044Target',p:s.active,source:c.uid};
  }else if(c.cardId==='SLG-1-071'){
   c.ready=false;c.usedTurn=s.turn;
   s.pending={kind:'marieBuff',p:s.active,source:c.uid,options:field(p).filter(x=>x.uid!==c.uid&&d(x).type==='character').map(x=>x.uid)};
  }else if(c.cardId==='SLG-1-050'){
   c.ready=false;retire(s,s.active,c);
   s.pending={kind:'sungRecovery',p:s.active,options:p.outside.filter(x=>d(x).type==='character'&&d(x).nameJa==='水篠 旬').map(x=>x.uid)};
  }else if(c.cardId==='SLG-1-034'){
   c.ready=false;
   if(action.mode==='mill'){if(p.deck.length)p.outside.push(p.deck.shift());}
   else s.pending={kind:'castleCost',p:s.active};
  }else if(c.cardId==='SLG-1-035'){
   c.ready=false;
   const amount=field(p).filter(x=>d(x).traits?.includes('影之軍團')).length>=5?1000:500;
   for(const target of field(p).filter(shadow))target.buffs.push({turn:s.turn,bp:amount});
  }else if(c.cardId==='SLG-1-075'){
   c.ready=false;
   if(action.mode==='attach'){
    const top=p.deck.shift();c.under??=[];c.under.push({...top,faceDown:true});
   }else s.pending={kind:'dailyDiscard',p:s.active,source:c.uid};
  }else if(c.cardId==='SLG-1-009')s.pending={kind:'mainDiscard',p:s.active,source:c.uid};
  else {c.ready=false;c.boostTurn=s.turn;c.usedTurn=s.turn;c.retireAtMainEnd=true;}
 }else if(action.type==='attackTarget'){
  const a=byUid(p.front,action.uid);
  if(!a||(a.grants||[]).every(g=>g.kind!=='snipe'||g.turn!==s.turn))throw Error('cannot snipe without current grant');
  a.ready=false;s.combat={attacker:a.uid};
  const b=byUid(s.players[1-s.active].front,action.target);if(!b)throw Error('no snipe target');
  const ab=soloMatchBp(s,a),bb=soloMatchBp(s,b);
  if(ab>=bb)retire(s,1-s.active,b);
  if(bb>=ab)retire(s,s.active,a);
  s.combat=null;scheduleAttackAfter(s);
 }else if(action.type==='attack'){
  const a=byUid(p.front,action.uid);a.ready=false;
  if(a.freezeSelfOnAttackTurn===s.turn)a.skipActive=(a.skipActive||0)+1;
  s.combat={attacker:a.uid};
  if(a.cardId==='SLG-1-058'&&a.raid058Used!==s.turn&&p.hand.length)
   s.pending={kind:'raid058Discard',p:s.active,source:a.uid};
  else continueAttackEffects(s);
 }
 assertSoloTrainingMatch(s);return s;
}
export function assertSoloTrainingMatch(s){
 if(s.title!=='solo-leveling'||s.version!==SOLO_MATCH_VERSION)throw Error('wrong title state');
 const seen=new Set;
 const visit=c=>{if(!c||!DB[c.cardId]||seen.has(c.uid))throw Error('invalid/duplicate card UID');seen.add(c.uid);for(const q of c.stack||[])visit(q);for(const q of c.under||[])visit(q);};
 for(let i=0;i<2;i++){
  const p=s.players[i];if(!p||p.front.length!==4||p.energy.length!==4||p.ap<0||p.ap>p.maxAp)throw Error('invalid zones/AP');
  for(const zone of ['front','energy','hand','deck','life','outside','removed'])for(const c of p[zone])if(c)visit(c);
  const n=[...seen].filter(uid=>uid.startsWith('slg-'+i+'-')).length;
  if(n!==50)throw Error('player '+i+' card conservation '+n+'/50');
 }
 return true;
}
export function soloTrainingBotAction(s){
 const legal=soloTrainingLegalActions(s);if(!legal.length)throw Error('no legal actions');
 if(s.pending){
  if(s.pending.kind==='kaiserPick'||s.pending.kind==='kibaPick')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='kaiserMode'||s.pending.kind==='kibaMode')return legal[0];
  if(s.pending.kind==='belDiscard')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='attackDraw')return legal[legal.length-1];
  if(s.pending.kind==='igrisDeploy')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='taiseiGrant')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='castleCost'||s.pending.kind==='castlePotion'||s.pending.kind==='castleRecover')
   return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='shadowSummonMode')return legal[0];
  if(s.pending.kind==='shadowSummonCard')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='eventRestoreAp')return legal[legal.length-1];
  if(s.pending.kind==='eventDestroy'||s.pending.kind==='eventDiscard'||s.pending.kind==='marieBuff')return legal[0];
  if(s.pending.kind==='eventRecover'||s.pending.kind==='eventDance')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='ryuuAp')return legal[legal.length-1];
  if(s.pending.kind==='ryuuBuff')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='colorTrigger'||s.pending.kind==='specialTrigger')return legal[0];
  if(s.pending.kind==='slgSearch')return legal.find(a=>a.picks?.length)||legal[0];
  if(s.pending.kind==='slgMill')return legal[legal.length-1];
  if(s.pending.kind==='slgDiscard'||s.pending.kind==='slg019Recover'||s.pending.kind==='slg044Target'||s.pending.kind==='slg077Target')return legal[0];
  if(s.pending.kind==='slgRecoveredBuff'||s.pending.kind==='slgRecoveredDeploy'||s.pending.kind==='slg019Entry'||s.pending.kind==='slg059Entry'||s.pending.kind==='slg077Buff')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='slgEndRaid')return legal.find(a=>a.uid!=null&&a.uid!=='peel')||legal[0];
  if(s.pending.kind==='slg051Mode')return legal.find(a=>a.mode==='raid'&&s.players[s.pending.p].outside.some(c=>c.cardId==='SLG-1-047'))||legal[0];
  if(s.pending.kind==='slg051Discard')return legal.find(a=>s.players[s.pending.p].hand.some(c=>c.uid===a.uid&&c.cardId==='SLG-1-047'))||legal[0];
  if(['slg022Enter','slg051Raid','slg048Deploy','slg061Enter','slg061Active','slg049Destroy','slg020Recover','slg021Win'].includes(s.pending.kind))return legal.find(a=>a.uid!=null)||legal[0];
  if(['slg061Enter','slg064Attack','slg064Destroy','slg051Mode','slg051Recover','slg051Discard','slg051Raid','slg048Deploy','slg049Destroy','slgEndRaid','slg061End','slg061Active','slg020EntryDiscard','slg020Recover','slg021Win','slg022Enter','slg060Swap','slg060Target','slg022Swap'].includes(s.pending.kind))return legal[0];
  if(['slg020AttackDiscard','slg048Under'].includes(s.pending.kind))return legal[0];
  if(s.pending.kind==='entry002Mode')return legal[0];
  if(s.pending.kind==='entry002Buff')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='entry002Discard'||s.pending.kind==='entry004Discard')return legal[0];
  if(s.pending.kind==='entryDrawMode')return legal[0];
  if(s.pending.kind==='entryBounce')return legal[0];
  if(s.pending.kind==='entryRecover'||s.pending.kind==='sungRecovery')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='dailyUnder'||s.pending.kind==='dailyRecover')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='soloOptionalLife')return legal.find(a=>a.mode==='final'||a.mode==='draw'||a.mode==='get'||a.mode==='raid')||legal[0];
  if(s.pending.kind==='raidTrigger')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='raid058Discard')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='raid058Unfreeze')return legal.find(a=>a.uid!=null)||legal[0];
  if(s.pending.kind==='soldierTop'||s.pending.kind==='peekTop'){
   return legal.find(a=>a.outsideUid!=null)||legal[0];
  }
  if(s.pending.kind==='block'){
   const enemyAttacker=byUid(s.players[1-s.pending.p].front,s.combat.attacker);
   const candidates=legal.filter(a=>a.uid!=null).filter(a=>{
    let c=byUid(s.players[s.pending.p].front,a.uid);return soloMatchBp(s,c)>=soloMatchBp(s,enemyAttacker);
   });
   return candidates[0]||legal[0];
  }
  return legal.find(a=>a.uid!=null)||legal[0];
 }
 const p=player(s),plays=legal.filter(a=>a.type==='play');
 const raids=legal.filter(a=>a.type==='raid');
 if(s.phase==='main'&&raids.length)return raids[0];
 const outsideActions=legal.filter(a=>a.type==='abilityOutside');
 if(s.phase==='main'&&outsideActions.length)return outsideActions[0];
 const resourceAbilities=legal.filter(a=>a.type==='ability'&&a.mode!=='potion');
 if(s.phase==='main'&&resourceAbilities.length&&p.ap<=1)return resourceAbilities[0];
 const events=legal.filter(a=>a.type==='playEvent');
 if(s.phase==='main'&&events.length&&(p.ap>=2||!plays.length)){
  // Only previously validated event commands enter this branch.
  return events[0];
 }
 if(s.phase==='main'&&plays.length){
  const needEnergy=soloEnergy(s)<4;
  const choices=plays.filter(a=>a.line===(needEnergy?'energy':'front'));
  return (choices.length?choices:plays).sort((a,b)=>{
   const ea=d(byUid(p.hand,a.uid)).energy,eb=d(byUid(p.hand,b.uid)).energy;
   return needEnergy?ea-eb:eb-ea;
  })[0];
 }
 if(s.phase==='move'&&soloEnergy(s)>=3){
  const move=legal.find(a=>a.type==='move');if(move)return move;
 }
 if(s.phase==='attack'){const attacks=legal.filter(a=>a.type==='attack');if(attacks.length)return attacks[0];}
 return legal.find(a=>a.type==='next')||legal[0];
}
export function simulateSoloTraining(seed=1,maxActions=2500){
 let s=newSoloTrainingMatch({seed});
 for(let i=0;i<maxActions&&s.status==='playing';i++)s=soloTrainingDispatch(s,soloTrainingBotAction(s));
 return {state:s,finished:s.status==='finished'};
}
