import {BY_ID, PRESETS, expandDeck, validateDeck,pendingCards} from './cards.mjs?v=9.1.0';

export const VERSION=1;
export const PHASE_NAMES={start:'開始階段',move:'移動階段',main:'主要階段',attack:'攻擊階段',end:'結束階段',mulligan:'起手確認'};
export const cardOf=c=>BY_ID[c.cardId];
const characters=(s,p)=>[...s.players[p].front,...s.players[p].energy].filter(c=>c&&cardOf(c).type==='character');
const allField=(s,p)=>[...s.players[p].front,...s.players[p].energy].filter(Boolean);
export function locate(s,uid){
 for(let p=0;p<2;p++)for(const line of ['front','energy']){const slot=s.players[p][line].findIndex(c=>c?.uid===uid);if(slot>=0)return {p,line,slot,card:s.players[p][line][slot]};}
 return null;
}
const matchingName=(c,name)=>!!c&&(cardOf(c).name===name||cardOf(c).name.includes(name)||cardOf(c).rules?.alsoName===name);
const traitsOf=c=>{const t=cardOf(c).traits||[];return (Array.isArray(t)?t:[t]).filter(x=>x&&x!=='無'&&x!=='無特徵'&&x!=='なし'&&x!=='-');};
const withTrait=(c,trait)=>!!c&&traitsOf(c).some(t=>String(t).includes(trait));
const ownHas=(s,p,name)=>allField(s,p).some(c=>matchingName(c,name));
const isRaided=c=>(c?.stack?.length||0)>0;
// Q51: test physical Raid state, not whether the card prints a Raid keyword.
// Legacy card profiles explicitly declare which effect blocks lie inside Raid.
const raidBoxEnabled=(c,kind)=>!cardOf(c)?.rules?.raidBox?.[kind]||isRaided(c);
const mayMoveToEnergy=c=>!!c&&!cardOf(c)?.rules?.cannotMoveToEnergy;
const hasRaidPrinted=c=>!!cardOf(c)?.raid || /^(?:Raid[〈《 ]|突襲[〈《])/.test(cardOf(c)?.effect||'');
const raidBaseMatches=(raid,base)=>{const want=String(cardOf(raid).raid||'').replaceAll(/\s/g,'');const d=cardOf(base);
 return !!want&&(want===String(d.key||'').replaceAll(/\s/g,'')||want===String(d.nameJa||'').replaceAll(/\s/g,'')||want===String(d.name||'').replaceAll(/\s/g,'')||want===String(d.rules?.alsoName||'')) || !!d.rules?.wildRaidBase;
};
const ruleEnabled=(s,p,c,r)=>!r?.raidOnly||isRaided(c);
const protectedByEffect=(s,c,origin='character')=>!!(c?.protectedUntilSource&&s.players[c.protectedUntilSource.p].turnCount<c.protectedUntilSource.turnCount&&!(c.protectedUntilSource.scope==='characterTrigger'&&origin==='event'));
const silenced=(s,c)=>!!(c?.silencedUntilSource&&s.players[c.silencedUntilSource.p].turnCount<c.silencedUntilSource.turnCount);
// Printed continuous abilities obey both text loss and their printed Raid box.
const printedRuleActive=(s,c,key)=>!!cardOf(c)?.rules?.[key]&&!silenced(s,c)&&raidBoxEnabled(c,key);

const remainingBuff=(s,c)=>(c.buffs||[]).filter(b=>b.turn===s.turn || b.untilTurn!=null&&s.players[locate(s,c.uid)?.p??s.active].turnCount<=b.untilTurn).reduce((n,b)=>n+(b.bp||0),0);
function passiveBp(s,c){const r=silenced(s,c)?{}:cardOf(c).rules?.passive||{};
 const l=locate(s,c.uid);if(!l)return 0;const p=l.p,opp=s.players[1-p];let n=0;
 if(r.bpPerOppRestFront)n+=opp.front.filter(x=>x&&!x.ready).length*r.bpPerOppRestFront;
 if(r.bpOwnTurn&&s.active===p)n+=r.bpOwnTurn;
 if(r.bpIfOppBig&&(!r.bpIfOppBig.ownTurn||s.active===p)&&(r.bpIfOppBig.frontOnly?opp.front.filter(Boolean):allField(s,1-p)).filter(x=>cardOf(x).bp+remainingBuff(s,x)>=r.bpIfOppBig.bp).length>=r.bpIfOppBig.count)n+=r.bpIfOppBig.amount;
 if(r.bpIfOwnOtherTrait&&allField(s,p).filter(x=>x.uid!==c.uid&&withTrait(x,r.bpIfOwnOtherTrait.trait)).length>=r.bpIfOwnOtherTrait.count)n+=r.bpIfOwnOtherTrait.amount;
 if(r.bpIfFrontAlone&&l.line==='front'&&s.players[p].front.filter(x=>x&&x.uid!==c.uid).length===0)n+=r.bpIfFrontAlone;
 if(r.bpPerOwnFrontAp2)n+=s.players[p].front.filter(x=>x&&cardOf(x).ap>=2).length*r.bpPerOwnFrontAp2;
 if(r.bpIfOwnFrontAp2&&s.active===p&&s.players[p].front.some(x=>x&&cardOf(x).ap>=2))n+=r.bpIfOwnFrontAp2;
 if(r.bpIfOwnDiscardedThisTurn&&s.active===p&&s.players[p].discardTurn===s.turn)n+=r.bpIfOwnDiscardedThisTurn;
 if(r.bpIfOwnRetiredThisTurn&&s.players[p].retiredTurn===s.turn)n+=r.bpIfOwnRetiredThisTurn;
 if(r.bpIfOppDebuffedFront&&opp.front.some(x=>x&&remainingBuff(s,x)<0))n+=r.bpIfOppDebuffedFront;
 if(r.bpIfOwnName&&s.active===p&&ownHas(s,p,r.bpIfOwnName.name))n+=r.bpIfOwnName.amount;
 if(r.bpIfOwnNames&&s.active===p&&r.bpIfOwnNames.names.some(n=>ownHas(s,p,n)))n+=r.bpIfOwnNames.amount;
 if(r.bpIfOwnEnergyName&&s.players[p].energy.some(x=>matchingName(x,r.bpIfOwnEnergyName.name)))n+=r.bpIfOwnEnergyName.amount;
 if(r.bpIfPurpleApPaid&&s.active===p&&s.players[p].purpleApPaidTurn===s.turn)n+=r.bpIfPurpleApPaid;
 if(r.bpIfOwnNameAndNoOutsideName&&ownHas(s,p,r.bpIfOwnNameAndNoOutsideName.name)&&!s.players[p].outside.some(x=>matchingName(x,r.bpIfOwnNameAndNoOutsideName.outside)))n+=r.bpIfOwnNameAndNoOutsideName.amount;
 const rr=cardOf(c).rules;
 if(!silenced(s,c)&&rr?.raidPassive&&isRaided(c)&&s.active===p&&(s.retireCountTurn===s.turn?s.retireCount||0:0)>=rr.raidPassive.bpIfOwnRetireCount)n+=rr.raidPassive.bp;
 return n;
}
export const bp=(s,c)=>cardOf(c).bp+remainingBuff(s,c)+passiveBp(s,c);

export const generated=(s,c)=>{const d=cardOf(c),r=d.rules||{},p=locate(s,c.uid)?.p??s.active,printedActive=!silenced(s,c);
 // FAQ Q2329–Q2332: losing original effects stops printed continuous abilities,
 // but does not remove bonuses already granted by a resolved effect.
 let amount=d.gen+(printedActive&&c.under?.length?r.underEnergy||0:0)+(printedActive&&(c.cardId==='037'||r.activeEnergy)&&c.ready?1:0)+((c.energyBoostTurn===s.turn||c.energyBoostUntilSource&&s.players[p].turnCount<c.energyBoostUntilSource)?(c.energyBoostAmount||1):0);
 if(printedActive&&r.raidEnergy&&isRaided(c))amount+=r.raidEnergy;
 if(printedActive&&r.passive?.genIfOwnOtherTrait&&allField(s,p).filter(x=>x.uid!==c.uid&&withTrait(x,r.passive.genIfOwnOtherTrait.trait)).length>=r.passive.genIfOwnOtherTrait.count)amount+=r.passive.genIfOwnOtherTrait.amount;
 return amount;};
export const energy=(s,p,color=null)=>[...s.players[p].energy,...s.players[p].front.filter(c=>c&&cardOf(c).rules?.frontEnergy&&!silenced(s,c))].reduce((n,c)=>n+(c&&(!color||cardOf(c).color===color)?generated(s,c):0),0);
function needEnergy(s,p,d){const discount=d.rules?.discount;let amount=0;
 if(d.type==='character'&&s.active===p&&s.players[p].front.some(c=>c&&isRaided(c)&&!silenced(s,c)&&cardOf(c).rules?.raidTaxOwnOther))amount-=2;
 if(discount?.flat)amount+=discount.flat;
 if(discount?.oppColors&&allField(s,1-p).some(c=>discount.oppColors.includes(cardOf(c).color)))amount+=discount.amount;
 if(discount?.whenOwnEmpty&&allField(s,p).length===0)amount+=discount.amount;
 return Math.max(0,d.energy-amount);
}
function needAp(s,p,d,{raid=false}={}){const rule=d.rules?.discountAp,bonus=s.players[p].nextApDiscount;
 const specialRaid=raid&&d.rules?.discountApRaidPurplePaid&&s.players[p].purpleApPaidTurn===s.turn&&s.players[p].paidPurpleWithoutApRenjiTurn!==s.turn?1:0;
 const next=bonus?.turn===s.turn&&d.type==='character'&&(bonus.trait&&traitsOf({cardId:d.id}).some(t=>t.includes(bonus.trait))||bonus.names?.some(n=>d.name.includes(n))||bonus.maxEnergy!=null&&d.energy<=bonus.maxEnergy)?bonus.amount:0;
 return Math.max(0,d.ap-(rule&&ownHas(s,p,rule.ownName)?rule.amount:0)-next-specialRaid);
}

export const controller=s=>s.pending?.player??s.mulliganPlayer??s.active;
export function log(s,message,kind='info'){s.log.push({id:++s.logSeq,turn:s.turn,message,kind});if(s.log.length>350)s.log.shift();}
function random(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
const fresh=(uid,cardId)=>({uid,cardId,ready:false,buffs:[],stack:[],under:[],usedTurn:-1,blockTurn:-1});
export function newGame({decks,mode='solo',first=0,seed=Date.now(),names=['你','練習對手']}={}){
 const d=decks||[PRESETS[0].counts,PRESETS[1].counts];
 for(const counts of d){const err=validateDeck(counts);if(err.length)throw new Error(err.join(' '));const pending=pendingCards(counts);if(pending.length)throw new Error(`${pending.length} 種卡片的自動判定尚未完成（${pending[0].name} ${pending[0].identity}）。牌組仍可編輯與儲存；請先使用已支援自動判定的卡片開局。`);}
 const s={version:VERSION,rng:(seed>>>0)||1,seed:seed>>>0,mode,first,active:first,turn:0,status:'mulligan',phase:'mulligan',mulliganPlayer:first,players:[],queue:[],pending:null,combat:null,revealed:[],resolving:[],winner:null,log:[],logSeq:0,extraDrawn:false};
 for(let p=0;p<2;p++){
  const deck=shuffle(s,expandDeck(d[p]).map((id,i)=>fresh(`${p}-${i}`,id)));
  s.players.push({name:names[p],deck,hand:deck.splice(0,7),life:[],front:[null,null,null,null],energy:[null,null,null,null],outside:[],removed:[],ap:0,maxAp:0,turnCount:0,redrawn:false,kept:false});
 }
 log(s,'對局建立。雙方各抽 7 張，確認起手後才放置生命卡。');
 return s;
}
function fail(s,loser,reason){if(s.status==='finished')return;s.status='finished';s.winner=1-loser;s.pending=null;s.queue=[];s.combat=null;log(s,`${s.players[loser].name}${reason}，${s.players[1-loser].name}獲勝。`,'win');}
function draw(s,p,n){let actual=0;for(let i=0;i<n&&s.players[p].deck.length;i++){s.players[p].hand.push(s.players[p].deck.shift());actual++;}log(s,`${s.players[p].name}抽 ${actual} 張牌。`,'draw');return actual;}
function flattenStack(c){return [c,...(c.stack||[]).flatMap(flattenStack)];}
function plain(c){return fresh(c.uid,c.cardId);}
function takeField(s,uid,dest='outside'){
 const l=locate(s,uid);if(!l)return null;
 s.players[l.p][l.line][l.slot]=null;
 if(dest==='outside'){const pp=s.players[l.p];pp.retiredTurn=s.turn;pp.retireCount=pp.retireCountTurn===s.turn?pp.retireCount+1:1;pp.retireCountTurn=s.turn;s.retireCount=s.retireCountTurn===s.turn?(s.retireCount||0)+1:1;s.retireCountTurn=s.turn;}
 const [top,...under]=flattenStack(l.card);
 s.players[l.p].outside.push(...(l.card.under||[]).map(plain));
 s.players[l.p][dest].push(plain(top));
 if(dest==='outside'&&cardOf(top).rules?.toDeckBottomOnOutside){const moved=s.players[l.p].outside.pop();s.players[l.p].deck.push(moved);}
 s.players[l.p].outside.push(...under.map(plain));
 log(s,`${s.players[l.p].name}的${cardOf(top).name}${dest==='removed'?'因換位除外':dest==='hand'?'返回手牌':'退場'}。`,dest==='outside'?'destroy':'info');
 if(dest==='outside'){
  if(cardOf(top).rules?.retireToRemoved){const i=s.players[l.p].outside.findIndex(x=>x.uid===top.uid);if(i>=0)s.players[l.p].removed.push(s.players[l.p].outside.splice(i,1)[0]);}
  if(!silenced(s,top))queueRules(s,l.p,top.uid,cardOf(top).rules?.retire);
  for(const friend of s.players[l.p].front.filter(x=>x&&x.uid!==uid&&isRaided(x)&&cardOf(x).rules?.raidRetireDraw)){
   const r=cardOf(friend).rules.raidRetireDraw;queueRules(s,l.p,friend.uid,[{op:'draw',count:1,groupOnce:r.groupOnce}],true);
  }
  if(isRaided(l.card)&&cardOf(l.card).rules?.raidRetireBaseIfName&&ownHas(s,l.p,cardOf(l.card).rules.raidRetireBaseIfName)){
   const first=under[0];if(first)s.queue.unshift({kind:'raidBaseRevive',p:l.p,card:first});
  }
 }

 return l.card;
}
function removeRaidTop(s,uid,{destination='outside'}={}){
 const l=locate(s,uid);if(!l||!isRaided(l.card))return false;
 const top=l.card,base=top.stack[0];
 s.players[l.p][destination].push(plain(top));
 const left=fresh(base.uid,base.cardId);left.ready=top.ready;left.enteredTurn=base.enteredTurn;
 // Q546/Q570: effects applied to a card before it became a Raid base do not reappear
 // when the Raid top card is later removed.
 left.buffs=[];
 s.players[l.p][l.line][l.slot]=left;
 // Keep extras distinct in case a future card allows unusual stacks.
 s.players[l.p].outside.push(...top.stack.slice(1).flatMap(flattenStack).map(plain));
 log(s,`將${cardOf(top).name}的 Raid 頂卡送到場外，${cardOf(base).name}留在場上。`,'effect');
 return true;
}
function canShieldRaid(s,uid,fromPlayer){
 const l=locate(s,uid);if(!l||!isRaided(l.card)||silenced(s,l.card)||fromPlayer===l.p||!s.players[l.p].hand.length)return false;
 const r=cardOf(l.card).rules?.raidHighBase;
 return !!(r?.shield&&cardOf(l.card.stack[0]).energy>=r.minEnergy);
}
function shieldOrRetire(s,uid,fromPlayer,{after='effect',attackerUid=null,dest='outside'}={}){
 const l=locate(s,uid);if(!l)return false;
 if(canShieldRaid(s,uid,fromPlayer)){
  const p=l.p;prompt(s,p,'更木劍八：棄 1 張手牌並移除 Raid 頂卡，代替離場？',
   [{id:'decline',label:'不使用替代退場'},...s.players[p].hand.map(c=>({id:c.uid,cardId:c.cardId,label:`棄 ${cardOf(c).name} 以保護`}))],
   {kind:'raidShield',p,uid,after,attackerUid,dest});return true;
 }
 takeField(s,uid,dest);return false;
}
function finishBlockedWin(s,p,attackerUid,blockerUid){
 const a=locate(s,attackerUid),b=locate(s,blockerUid);if(!a||!b)return;
 const atkRules=cardOf(a.card).rules;
 if(atkRules?.raidWinReadyGroup&&isRaided(a.card)){
  s.groupUsed||={};const group=`${p}:${atkRules.raidWinReadyGroup}`;
  if(s.groupUsed[group]!==s.turn){s.groupUsed[group]=s.turn;activate(s,a.card);}
 }
 const nullImpact=printedRuleActive(s,b.card,'impactNull'),banish=atkRules?.battleRemove&&s.active===p;
 takeField(s,blockerUid,banish?'removed':'outside');
 if(impactOf(s,a.card)&&!nullImpact){const n=impactOf(s,a.card);log(s,`IMPACT ${n}：穿透阻擋，造成 ${n} 點生命傷害。`,'effect');s.queue.push({kind:'impactDamage',p:1-p,count:n});}
 if(a.card.winDrawTurn===s.turn)s.queue.push({kind:'draw',p,count:1});
}
function stateCheck(s){for(let p=0;p<2;p++)for(const c of characters(s,p))if(bp(s,c)<=0)takeField(s,c.uid);}
function addBuff(s,uid,amount,duration){const l=locate(s,uid);if(l){if(amount<0&&!silenced(s,l.card)&&(cardOf(l.card).rules?.immuneDebuff||isRaided(l.card)&&cardOf(l.card).rules?.raidImmuneDebuff))return;l.card.buffs.push(duration==='nextTurn'?{untilTurn:s.players[l.p].turnCount+1,bp:amount}:{turn:s.turn,bp:amount});log(s,`${cardOf(l.card).name}本回合 BP ${amount>=0?'+':''}${amount}。`,'effect');}}
function activate(s,c){if(c.lockedBy&&locate(s,c.lockedBy)?.line==='front')return;if(c.freezeUntilAttackOwner!=null)return;if(c.skipActive>0){c.skipActive--;log(s,`${cardOf(c).name}跳過這次 ACTIVE。`,'effect');return;}c.ready=true;}
function readyOwnField(s,p){for(const c of allField(s,p))activate(s,c);}
function beginTurn(s){
 const pl=s.players[s.active];pl.turnCount++;s.turn++;s.phase='start';s.extraDrawn=false;pl.turnEvents=[];pl.enteredNames=[];const due=(s.delayed||[]).filter(x=>x.duePlayer===s.active&&x.dueTurnCount<=pl.turnCount);s.delayed=(s.delayed||[]).filter(x=>!due.includes(x));s.queue.unshift(...due.map(x=>({...x,kind:'soiFonResolve'})));
 for(const c of [...allField(s,s.active)])if(cardOf(c).rules?.retireAtOwnStart)takeField(s,c.uid);
 for(const c of [...allField(s,s.active)])if(isRaided(c)&&printedRuleActive(s,c,'startTurnRaidTop'))removeRaidTop(s,c.uid);

 for(const c of allField(s,s.active)){c.buffs=(c.buffs||[]).filter(b=>b.untilTurn==null||pl.turnCount<b.untilTurn);}
 readyOwnField(s,s.active);
 pl.maxAp=pl.turnCount>=3?3:pl.turnCount===1&&s.active===s.first?1:2;pl.ap=pl.maxAp;
 log(s,`${pl.name}的第 ${pl.turnCount} 回合・AP ${pl.ap}。`,'turn');
 if(pl.turnCount===1&&s.active===s.first)log(s,'先攻首回合不進行通常抽牌。');
 else if(!pl.deck.length)fail(s,s.active,'在開始階段無法抽牌');else draw(s,s.active,1);
}
function finishMulligans(s){for(const pl of s.players)pl.life=pl.deck.splice(0,7);s.status='playing';s.mulliganPlayer=null;log(s,'双方生命區各放置 7 張牌。');beginTurn(s);}
function eligibleEventTargets(s,p,c){
 if(c.id==='062')return characters(s,p);
 if(c.id==='064'){const limit=characters(s,p).some(x=>cardOf(x).key==='ichigo')?5000:3000;return s.players[1-p].front.filter(x=>x&&!protectedByEffect(s,x,'event')&&bp(s,x)<=limit);}
 const first=c.rules?.event?.find(e=>e.target&&!e.optional&&!e.all);
 return first?ruleTargets(s,p,null,effectiveRule(s,p,null,first),'event'):null;
}
function raidOptions(s,p,c){
 if(!cardOf(c).raid||energy(s,p,cardOf(c).color)<needEnergy(s,p,cardOf(c)))return [];
 const opts=[];
 for(const base of characters(s,p).filter(x=>raidBaseMatches(c,x)&&!hasRaidPrinted(x)&&!isRaided(x))){
  const l=locate(s,base.uid);if(cardOf(c).rules?.energyOnly&&l.line!=='energy')continue;opts.push({type:'raid',uid:c.uid,target:base.uid,line:l.line,slot:l.slot});
  // Official Raid: an Energy L base may remain in Energy L or move to Front L.
  // A Front L base stays in place; removing an unrelated Front L card is only
  // necessary when the destination line is already full (official Rules FAQ).
  if(l.line==='energy'&&!cardOf(c).rules?.energyOnly){
   const frontFull=s.players[p].front.every(Boolean);
   for(let slot=0;slot<4;slot++)if(frontFull||!s.players[p].front[slot])
    opts.push({type:'raid',uid:c.uid,target:base.uid,line:'front',slot});
  }
 }
 return opts;
}
export function legalActions(s){
 if(s.status==='finished')return [];
 if(s.pending){return s.pending.max===1?s.pending.choices.map(c=>({type:'choose',ids:[c.id]})).concat(s.pending.min===0?[{type:'choose',ids:[]}]:[]):[{type:'choose',ids:s.pending.choices.slice(0,s.pending.max).map(c=>c.id)}];}
 if(s.status==='mulligan')return [{type:'keep'},...(!s.players[s.mulliganPlayer].redrawn?[{type:'redraw'}]:[])];
 const p=s.active,pl=s.players[p],acts=[];
 if(s.phase==='start'){if(!s.extraDrawn&&pl.ap&&pl.deck.length)acts.push({type:'extraDraw'});acts.push({type:'next'});}
 if(s.phase==='move'){
  for(const c of pl.energy.filter(x=>x&&cardOf(x).type==='character'&&!cardOf(x).rules?.energyOnly))for(let slot=0;slot<4;slot++)acts.push({type:'move',uid:c.uid,slot});
  for(const c of pl.front.filter(x=>x&&cardOf(x).rules?.step))for(let slot=0;slot<4;slot++)acts.push({type:'step',uid:c.uid,slot});
  acts.push({type:'next'});
 }
 if(s.phase==='main'){
  for(const c of pl.hand){const d=cardOf(c),canNormal=pl.ap>=needAp(s,p,d),canRaid=d.raid&&pl.ap>=needAp(s,p,d,{raid:true});
   if(d.rules?.handAbility==='uryu'&&pl.ap>=1&&pl.removed.filter(x=>matchingName(x,'黑崎一護')).length>=4&&s.groupUsed?.[`${p}:handUryu`]!==s.turn)acts.push({type:'handAbility',uid:c.uid});
   if((!canNormal&&!canRaid)||energy(s,p,d.color)<needEnergy(s,p,d))continue;
   if(d.type==='event'){if(!canNormal)continue;if(d.rules?.playWhen&&!condition(s,p,c.uid,d.rules.playWhen))continue;const targets=eligibleEventTargets(s,p,d);if(targets===null||targets.length)acts.push({type:'play',uid:c.uid});}
   else{if(canNormal)for(const line of d.type==='field'?['energy']:d.rules?.frontOnly?['front']:d.rules?.energyOnly?['energy']:['energy','front'])for(let slot=0;slot<4;slot++)acts.push({type:'play',uid:c.uid,line,slot});if(canRaid)acts.push(...raidOptions(s,p,c));}
  }
  for(const c of allField(s,p)){
   const cr=cardOf(c).rules||{},abs=silenced(s,c)?[]:cr.abilities||[cr.ability].filter(Boolean);
   for(let j=0;j<abs.length;j++){
    const a=abs[j],used=cr.abilities?c.usedAbilities?.[j]:c.usedTurn;
    if(a&&raidBoxEnabled(c,'ability')&&ruleEnabled(s,p,c,a)&&(!a.groupOnce||s.groupUsed?.[`${p}:${a.groupOnce}`]!==s.turn)&&(!a.once||used!==s.turn)&&(!a.front||locate(s,c.uid).line==='front')&&(!a.energy||locate(s,c.uid).line==='energy')&&(!a.requiresTwoActiveFront||s.players[p].front.filter(x=>x?.ready).length>=2)&&(!a.rest||c.ready)&&(!a.when||condition(s,p,c.uid,a.when))&&(!a.ap||pl.ap>=a.ap)&&(!a.discard||pl.hand.length>=a.discard)&&(!a.discardFilter||pl.hand.some(x=>matchFilter(x,a.discardFilter))))acts.push(cr.abilities?{type:'ability',uid:c.uid,abilityIndex:j}:{type:'ability',uid:c.uid});
   }
   if(c.usedTurn===s.turn)continue;
   if(c.cardId==='104'&&isRaided(c)&&!silenced(s,c)||c.cardId==='046'&&locate(s,c.uid).line==='front'||(c.cardId==='042'||c.cardId==='108')&&c.ready)acts.push({type:'ability',uid:c.uid});
  }
  acts.push({type:'next'});
 }
 if(s.phase==='attack'){if(pl.turnCount>1)for(const c of pl.front.filter(x=>x&&x.ready&&!silenced(s,x))){acts.push({type:'attack',uid:c.uid});if(c.sniperTurn===s.turn&&c.attackTurn!==s.turn)for(const target of s.players[1-p].front.filter(Boolean))acts.push({type:'snipe',uid:c.uid,target:target.uid});}acts.push({type:'next'});}
 return acts;
}
const sameAction=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>a[k]===b[k]);
function targetChoices(s,arr){return arr.map(c=>({id:c.uid,label:`${cardOf(c).name} · BP ${bp(s,c)}`,cardId:c.cardId,uid:c.uid,where:locate(s,c.uid)?.line}));}
function prompt(s,player,title,choices,effect,min=1,max=1,allowedCounts=null){
 if(!choices.length){return false;}
 s.pending={player,title,choices,effect,min,max:Math.min(max,choices.length),allowedCounts};return true;
}
function queueRules(s,p,uid,rules,first=false){
 // Official FAQ Q51: normal deployment never activates rules inside the Raid box.
 // Keep ordinary [On Play]/[Main]/[Attack] rules outside that box available.
 const source=locate(s,uid)?.card;
 const events=(rules||[]).filter(rule=>ruleEnabled(s,p,source,rule)).map(rule=>({kind:'rule',p,uid,rule}));
 if(first)s.queue.unshift(...events);else s.queue.push(...events);
}
function ruleTargets(s,p,uid,r,origin){
 origin ||= r.fromTrigger?'trigger':s.resolving?.some(x=>x.card.uid===uid)?'event':'character';
 const own=r.target!=='oppFront'&&r.target!=='opp',pp=own?p:1-p;
 let cards=r.target==='self'?[locate(s,uid)?.card].filter(Boolean):r.target==='oppFront'?s.players[pp].front.filter(Boolean):r.target==='ownFront'?s.players[p].front.filter(Boolean):r.target==='ownField'?allField(s,p):characters(s,pp);
 return cards.filter(c=>(p===pp||!protectedByEffect(s,c,origin)||r.ignoreProtection)&&(!r.other||c.uid!==uid)&&(r.bpMax==null||bp(s,c)<=r.bpMax)&&(r.bpMin==null||bp(s,c)>=r.bpMin)&&(r.energyMax==null||cardOf(c).energy<=r.energyMax)&&(r.apMin==null||cardOf(c).ap>=r.apMin)&&(r.trait==null||withTrait(c,r.trait))&&(r.name==null||matchingName(c,r.name))&&(r.names==null||r.names.some(n=>matchingName(c,n)))&&(r.line==null||locate(s,c.uid)?.line===r.line)&&(r.color==null||cardOf(c).color===r.color)&&(r.ready==null||c.ready===r.ready)&&(r.raided==null||isRaided(c)===r.raided)&&(r.noTraits==null||traitsOf(c).length===0)&&(r.nameOrTrait==null||matchingName(c,r.nameOrTrait.name)||withTrait(c,r.nameOrTrait.trait))&&(r.type==null||cardOf(c).type===r.type)&&(!r.fromTrigger||c.immuneTriggerTurn!==s.turn));
}
function condition(s,p,uid,cond){if(!cond)return true;
 if(cond.op==='or')return cond.any.some(x=>condition(s,p,uid,x));
 const pl=s.players[p],opp=s.players[1-p],self=locate(s,uid)?.card;
 if(cond.ownTurn&&s.active!==p)return false;
 if(cond.noOutsideName&&pl.outside.some(c=>matchingName(c,cond.noOutsideName)))return false;
 if(cond.selfEnergyMin&&(!self||needEnergy(s,p,cardOf(self))<cond.selfEnergyMin))return false;
 if(cond.handFewer&&pl.hand.length>=opp.hand.length)return false;
 if(cond.opponentTriggeredThisTurn&&opp.triggerUsedTurn!==s.turn)return false;
 if(cond.onlySternritterTraits&&allField(s,p).some(c=>traitsOf(c).some(t=>!t.includes('星十字騎士團'))))return false;
 if(cond.ownNameEnteredThisTurn&&!((pl.enteredNamesTurn===s.turn)&&(pl.enteredNames||[]).some(n=>n.includes(cond.ownNameEnteredThisTurn))))return false;
 if(cond.purpleApPaidThisTurn&&pl.purpleApPaidTurn!==s.turn)return false;
 if(cond.ownEmpty&&allField(s,p).length>0)return false;
 if(cond.ownDiscardedThisTurn&&s.players[p].discardTurn!==s.turn)return false;
 if(cond.ownName&&!ownHas(s,p,cond.ownName))return false;
 if(cond.ownNameOrRemoved&&!ownHas(s,p,cond.ownNameOrRemoved)&&!pl.removed.some(c=>matchingName(c,cond.ownNameOrRemoved)))return false;
 if(cond.outsideName&&!pl.outside.some(c=>matchingName(c,cond.outsideName)))return false;
 if(cond.oppRest&&!allField(s,1-p).some(c=>!c.ready))return false;
 if(cond.oppBig&&!allField(s,1-p).some(c=>bp(s,c)>=cond.oppBig))return false;
 if(cond.oppRaided&&!allField(s,1-p).some(isRaided))return false;
 if(cond.oppRestOrDebuffed&&!opp.front.some(c=>c&&(!c.ready||remainingBuff(s,c)<0)))return false;
 if(cond.oppDebuffedFront&&!opp.front.some(c=>c&&remainingBuff(s,c)<0))return false;
 if(cond.handFewer&&pl.hand.length>=opp.hand.length)return false;
 if(cond.ownFrontAp2&&!pl.front.some(c=>c&&cardOf(c).ap>=2))return false;
 if(cond.ownFrontReady&&!pl.front.some(c=>c&&c.ready))return false;
 if(cond.enteredThisTurn&&self?.enteredTurn!==s.turn)return false;
 if(cond.playedEventName&&!(pl.turnEvents||[]).some(n=>n===cond.playedEventName))return false;
 if(cond.ownOtherFrontAp2&&!pl.front.some(c=>c&&c.uid!==uid&&cardOf(c).ap>=2))return false;
 if(cond.ownNameEnergyMin&&!allField(s,p).some(c=>matchingName(c,cond.ownNameEnergyMin.name)&&cardOf(c).energy>=cond.ownNameEnergyMin.energy))return false;
 if(cond.ownRetiredThisTurn&&pl.retiredTurn!==s.turn)return false;
 if(cond.attackerRaided&&!isRaided(locate(s,s.combat?.attacker)?.card))return false;
 if(cond.selfRest&&self?.ready!==false)return false;
 if(cond.deployedByOwnEffect&&!self?.deployedByOwnEffect)return false;
 if(cond.ownOtherTraitsAnyCount&&allField(s,p).filter(c=>c.uid!==uid&&(cond.ownOtherTraitsAnyCount.traits.some(t=>withTrait(c,t))||cond.ownOtherTraitsAnyCount.names.some(n=>matchingName(c,n)))).length<cond.ownOtherTraitsAnyCount.count)return false;
 if(cond.ownNameFront&&!pl.front.some(c=>matchingName(c,cond.ownNameFront)))return false;
 if(cond.ownOtherTrait&&!((allField(s,p).filter(c=>c.uid!==uid&&withTrait(c,cond.ownOtherTrait.trait))).length>=cond.ownOtherTrait.count))return false;
 return true;
}
function effectiveRule(s,p,uid,r){let x=r;
 if(r.bpMaxIf&&condition(s,p,uid,r.bpMaxIf))x={...x,bpMax:r.bpMaxIf.value};
 if(r.bpMaxOwnGroup){const g=r.bpMaxOwnGroup,n=allField(s,p).filter(c=>withTrait(c,g.trait)||matchingName(c,g.name)).length;x={...x,bpMax:n*g.multiply};}
 return x;
}
function matchFilter(c,f){if(!f)return true;const d=cardOf(c);
 if(f.color&&d.color!==f.color)return false;
 if(f.type&&d.type!==f.type)return false;
 if(f.types&&!f.types.includes(d.type))return false;
 if(f.energyIs!=null&&d.energy!==f.energyIs)return false;
 if(f.nameContains&&!f.nameContains.some(n=>d.name.includes(n)))return false;
 if(f.maxEnergy!=null&&d.energy>f.maxEnergy)return false;
 if(f.minAp!=null&&d.ap<f.minAp)return false;
 if(f.minEnergy!=null&&d.energy<f.minEnergy)return false;
 if(f.ap!=null&&d.ap!==f.ap)return false;
 if(f.noTraits&&traitsOf(c).length)return false;
 if(f.notRaid&&hasRaidPrinted(c))return false;
 const byName=f.names?.some(n=>matchingName(c,n));const byTrait=f.trait&&withTrait(c,f.trait);
 if(f.names||f.trait){if(!byName&&!byTrait&&!f.names?.some(n=>d.name.includes(n)))return false;}
 return true;
}
function remainingInspected(s,p,uids){return (s.inspecting||[]).filter(x=>x.p===p&&uids.includes(x.card.uid));}
function finishLook(s,e,taken){const p=e.p,r=e.rule;
 for(const uid of taken){const i=s.inspecting.findIndex(x=>x.card.uid===uid);if(i>=0)s.players[p].hand.push(s.inspecting.splice(i,1)[0].card);}
 const remain=remainingInspected(s,p,e.cards);
 if(remain.length&&r.thenOutsideCount){prompt(s,p,'選擇 1 張送到場外，其餘放回牌庫底',remain.map(x=>({id:x.card.uid,cardId:x.card.cardId,label:cardOf(x.card).name})),{kind:'lookPickOutside',p,original:e,takenCount:taken.length},1,Math.min(r.thenOutsideCount,remain.length));return;}
 if(remain.length)prompt(s,p,`依序選擇${r.rest==='outside'?'送至場外':`放到牌庫${r.rest==='top'?'頂':'底'}`}的卡`,remain.map(x=>({id:x.card.uid,label:cardOf(x.card).name,cardId:x.card.cardId})),{kind:'lookOrder',p,rule:r,originalUid:e.uid,cards:e.cards,taken:taken.length});
 else if(taken.length&&r.afterPick)queueRules(s,p,e.uid,r.afterPick,true);
}
function moveDiscard(s,p,uid,origin='hand',sourceUid=null){const arr=s.players[p][origin],i=arr.findIndex(c=>c.uid===uid);if(i<0)return;
 const c=arr.splice(i,1)[0];s.players[p].outside.push(plain(c));if(origin==='hand')s.players[p].discardTurn=s.turn;
 if(origin==='hand'&&sourceUid){const l=locate(s,sourceUid),r=cardOf(c).rules?.onBlueIchigoDiscard;if(l&&matchingName(l.card,'黑崎一護')&&cardOf(l.card).color==='blue'&&r){if(r==='blockLow')l.card.noBlockBelowTurn=s.turn;if(r==='protect')prompt(s,p,'織姬：選擇受保護的己方一護',targetChoices(s,allField(s,p).filter(x=>matchingName(x,'黑崎一護'))),{kind:'protectIchigo',p},0);}}
 if(origin==='hand'&&sourceUid){const src=locate(s,sourceUid)?.card;if(src&&(matchingName(src,'黑崎一護')||matchingName(src,'浦原喜助'))&&cardOf(src).color==='blue')s.queue.push({kind:'blueDiscardFollowup',p,uid:c.uid,sourceUid,skipLiluka:false});
  if(['BLC-2-046','BLC-2-047'].includes(cardOf(c).identity))s.queue.push({kind:'blueDiscardEvent',p,sourceUid,cardId:c.cardId});}
 log(s,`${s.players[p].name}將${cardOf(c).name}送到場外。`,'effect');}
function resolveRule(s,e){
 let r=e.rule;const p=e.p,c=locate(s,e.uid)?.card;
 if(silenced(s,c))return;
 if(r.raidOnly&&!isRaided(c)||r.frontOnly&&locate(s,e.uid)?.line!=='front'||r.when&&!condition(s,p,e.uid,r.when)||r.unless&&condition(s,p,e.uid,r.unless))return;
 if(r.groupOnce&&r.op!=='optionalPayAp'){s.groupUsed ||= {};if(s.groupUsed[`${p}:${r.groupOnce}`]===s.turn)return;s.groupUsed[`${p}:${r.groupOnce}`]=s.turn;}
 r=effectiveRule(s,p,e.uid,r);

 if(r.op==='removeRaidTop'){
  const targets=ruleTargets(s,p,e.uid,{...r,raided:true});
  prompt(s,p,'選擇敵方 Raid 角色，將頂卡送到場外',targetChoices(s,targets),{...e,kind:'raidTopChoice'},r.optional?0:1);return;
 }
 if(r.op==='millRemoveDebuff'){
  const milled=s.players[p].deck.splice(0,r.mill);s.players[p].outside.push(...milled.map(plain));
  const pool=s.players[p].outside;prompt(s,p,'選擇任意張場外卡除外（每張使一個敵方角色 BP −500）',pool.map(x=>({id:x.uid,cardId:x.cardId,label:cardOf(x).name})),{...e,kind:'millRaidRemove'},0,pool.length);return;
 }
 if(r.op==='frostRaid'){
  const targets=s.players[1-p].front.filter(Boolean);
  prompt(s,p,'選擇要凍結的敵方前線角色',targetChoices(s,targets),{...e,kind:'frostRaid'},0);return;
 }
 if(r.op==='rukiaRestLock'){
  const source=locate(s,e.uid);if(source?.line!=='front')return;
  const lock=s.active===p&&s.players[p].front.some(c=>c&&cardOf(c).ap>=2);
  prompt(s,p,'選擇敵方前線角色轉為 REST'+(lock?' 並持續鎖定':''),targetChoices(s,s.players[1-p].front.filter(Boolean)),{...e,kind:'rukiaRestLock',lock},0);return;
 }
 if(r.op==='moveTribeFront'){
  const opts=s.players[p].energy.filter(c=>c&&withTrait(c,r.trait)&&cardOf(c).type==='character'&&!cardOf(c).rules?.energyOnly);
  if(opts.length)prompt(s,p,'可選擇一個隊員移到前線，或結束移動',targetChoices(s,opts),{...e,kind:'raidMoveTribe'},0);return;
 }
 if(r.op==='buffImpact'){
  const targets=ruleTargets(s,p,e.uid,{target:'own',other:r.other||false}).filter(c=>matchFilter(c,r.filter));
  prompt(s,p,'選擇角色獲得 BP 與 IMPACT',targetChoices(s,targets),{...e,kind:'raidBuffImpact'},r.optional?0:1);return;
 }
 if(r.op==='zeroBanishDestroy'){
  const opts=s.players[p].hand.filter(c=>withTrait(c,'零番隊'));
  if(opts.length)prompt(s,p,'選擇任意張零番隊卡從手牌除外',opts.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{...e,kind:'zeroBanish'},0,opts.length);
  else s.queue.unshift({kind:'rule',p,uid:e.uid,rule:{op:'destroy',target:'oppFront',bpMax:r.base??2500,optional:true}});
  return;
 }
 if(r.op==='splitTop'){
  const cards=s.players[p].deck.splice(0,r.count);if(!cards.length)return;
  s.inspecting ||= [];s.inspecting.push(...cards.map(card=>({p,card})));
  prompt(s,p,r.title||`查看牌庫頂 ${cards.length} 張，選擇要送至${r.selectDest==='bottom'?'牌庫底':'場外'}的牌`,cards.map(x=>({id:x.uid,cardId:x.cardId,label:`${cardOf(x).name} · 能源${cardOf(x).energy}`})),{kind:'splitTop',p,rule:r,cards:cards.map(x=>x.uid),uid:e.uid},0,r.selectMax??cards.length);
  return;
 }
 if(r.op==='putUnder'){
  if(c&&s.players[p].deck.length){c.under??=[];c.under.push(s.players[p].deck.shift());}return;
 }
 if(r.op==='useUnder'){
  if(c?.under?.length){s.players[p].outside.push(plain(c.under.shift()));c.energyBoostTurn=s.turn;c.energyBoostAmount=r.amount;}return;
 }
 if(r.op==='lilukaSacrificeRecover'){
   const loc=locate(s,e.uid);if(!loc)return;
   const attached=(loc.card.under||[])[0];takeField(s,e.uid);
   if(attached&&s.players[p].outside.some(x=>x.uid===attached.uid))prompt(s,p,'莉露卡退場：是否把裏向卡拿回手牌？',[{id:'yes',label:'加入手牌'},{id:'no',label:'留在場外'}],{kind:'lilukaRecoverUnder',p,uid:attached.uid});return;
 }
 if(r.op==='delaySoiFon'){
   const targets=s.players[1-p].front.filter(x=>x&&bp(s,x)<=3500);
   if(!prompt(s,p,'碎蜂：選擇下個敵方回合開始退場的角色（可不選）',targetChoices(s,targets),{kind:'delaySoiFonTarget',p,uid:e.uid},0)){
    (s.delayed??=[]).push({p,uid:e.uid,targetUid:null,duePlayer:1-p,dueTurnCount:s.players[1-p].turnCount+1});
   }return;
 }
 if(r.op==='sniperYoruichi'){
   prompt(s,p,'選擇己方四楓院夜一，賦予 BP +2000 與首攻狙擊',targetChoices(s,allField(s,p).filter(c=>matchingName(c,'四楓院夜一'))),{kind:'sniperYoruichi',p},1);return;
 }
 if(r.op==='swapFrontEnergy'){
   prompt(s,p,'選擇要交換的己方前線角色',targetChoices(s,s.players[p].front.filter(mayMoveToEnergy)),{kind:'swapFrontPick',p,uid:e.uid},0);return;
 }
 if(r.op==='guessEnergySingle'){
   prompt(s,p,'宣告牌庫頂卡的需求能源值',Array.from({length:7},(_,i)=>({id:String(i),label:`需求能源 ${i}`})),{kind:'guessEnergySingle',p,uid:e.uid,rule:r});return;
 }
 if(r.op==='deployOrRaidHand'){
   const opts=s.players[p].hand.filter(c=>(matchingName(c,'阿散井戀次')||matchingName(c,'朽木露琪亞'))&&cardOf(c).ap===1&&energy(s,p,cardOf(c).color)>=needEnergy(s,p,cardOf(c)));
   prompt(s,p,'選擇免費 REST 登場或突襲的手牌',opts.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{kind:'deployOrRaidPick',p,uid:e.uid},0);return;
 }
 if(r.op==='deployRemovalIchibe'){
   const maxEnergy=removedZeroNames(s,p);
   queueRules(s,p,e.uid,[{op:'deployFrom',zone:'hand',filter:{color:'purple',ap:1,maxEnergy,names:['黑崎一護','靈王宮'],trait:'零番隊'},active:false,optional:true}],true);return;
 }
 if(r.op==='guessEnergy'){
   prompt(s,p,'指定需求能源（0–6）',Array.from({length:7},(_,i)=>({id:String(i),label:`需求能源 ${i}`})),{kind:'guessEnergy',p,uid:e.uid,rule:r});return;
 }
 if(r.op==='twoEqualDestroy'){
   const grouped=new Map();for(const c of s.players[1-p].front.filter(x=>x&&bp(s,x)<=r.bpMax)){const b=bp(s,c);grouped.set(b,[...(grouped.get(b)||[]),c]);}
   const groups=[...grouped].filter(([,list])=>list.length>=2);
   prompt(s,p,'選擇第一個 BP 2000 以下角色',groups.flatMap(([,list])=>list).map(c=>({id:c.uid,cardId:c.cardId,label:`${cardOf(c).name} · BP ${bp(s,c)}`})),{kind:'twoEqualFirst',p},0);return;
 }
 if(r.op==='retireGuard'){
   const targets=ruleTargets(s,p,e.uid,{target:'own',other:true,nameOrTrait:r.nameOrTrait});prompt(s,p,'選擇獲得效果免疫的己方角色',targetChoices(s,targets),{kind:'retireGuard',p,uid:e.uid,rule:r},0);return;
 }
 if(r.op==='reviveGerard'){
   const source=s.players[p].outside.find(x=>x.uid===e.uid);if(!source)return;
   prompt(s,p,'傑拉德退場：選擇效果或不發動',[{id:'skip',label:'不發動'},{id:'life',label:'生命加入手牌，REST 復活'},{id:'hand',label:'棄 2 張手牌，這張卡加入手牌'}],{kind:'gerardRetire',p,uid:e.uid});return;
 }
 if(r.op==='sacrificeOther'){
  const targets=allField(s,p).filter(x=>x.uid!==e.uid&&cardOf(x).type==='character'&&(!r.trait||withTrait(x,r.trait))&&(!r.notTrait||!withTrait(x,r.notTrait))&&(!r.name||matchingName(x,r.name))&&(!r.names||r.names.some(n=>matchingName(x,n))));
  prompt(s,p,'選擇另一個己方角色作為效果成本',targetChoices(s,targets),{kind:'sacrificeOther',p,uid:e.uid,rule:r},r.optional?0:1);return;
 }
 if(r.op==='aizenMoveFront'){
  const l=locate(s,e.uid),front=s.players[p].front.filter(x=>x&&x.ready);
  if(l?.line!=='energy'||front.length<2)return;
  prompt(s,p,'選擇 2 個 ACTIVE 前線角色轉為 REST',targetChoices(s,front),{kind:'aizenRestTwo',p,uid:e.uid},2,2);return;
 }
 if(r.op==='moveAcross'){
  const targets=ruleTargets(s,p,e.uid,{target:'ownField',other:r.other??true,noTraits:r.noTraits,name:r.name}).filter(c=>locate(s,c.uid)?.line!=='front'||mayMoveToEnergy(c));
  prompt(s,p,'選擇移動到另一條線的角色',targetChoices(s,targets),{kind:'moveAcrossPick',p,uid:e.uid,rule:r},r.optional?0:1);return;
 }
 if(r.op==='silence'){
  prompt(s,p,'選擇失去印刷能力且不能攻擊／阻擋的敵方前線角色',targetChoices(s,s.players[1-p].front.filter(Boolean)),{kind:'silenceChoice',p,uid:e.uid},0);return;
 }
 if(r.op==='conditionalPaidDrawDiscard'){
  if(s.players[p].purpleApPaidTurn===s.turn)queueRules(s,p,e.uid,[{op:'drawDiscard',draw:1,discard:1}],true);return;
 }
 if(r.op==='restToRecoverAp'){
  const opts=allField(s,p).filter(x=>x.ready&&['京樂春水','伊勢七緒'].some(n=>matchingName(x,n)));
  prompt(s,p,'可使京樂春水或伊勢七緒 REST，回復 1 AP',targetChoices(s,opts),{kind:'restToRecoverAp',p},0);return;
 }
 if(r.op==='optionalPayAp'){
  if(s.players[p].ap<r.amount||r.groupOnce&&s.groupUsed?.[`${p}:${r.groupOnce}`]===s.turn)return;
  prompt(s,p,`是否支付 ${r.amount} AP 發動後續效果？`,[{id:'yes',label:'支付 AP'},{id:'no',label:'不支付'}],{kind:'optionalPayAp',p,uid:e.uid,rule:r});return;
 }
 if(r.op==='restToBuff'){
  const targets=ruleTargets(s,p,e.uid,{target:'own',other:true});prompt(s,p,'選擇另一個角色 BP +1000',targetChoices(s,targets),{kind:'restToBuff',p,uid:e.uid},0);return;
 }
 if(r.op==='onRaidedRukia'){
  prompt(s,p,'基底露琪亞遭突襲：選擇 1 項',[{id:'top',label:'查看牌庫頂 1 張（可送場外）'},{id:'block',label:'使一個露琪亞不會被 BP 4000 以上角色阻擋'}],{kind:'onRaidedRukia',p,uid:e.uid});return;
 }
 if(r.op==='sacrificeBuff'){
  const opts=ruleTargets(s,p,e.uid,{target:'own',name:r.name});prompt(s,p,`選擇${r.name}獲得額外能力`,targetChoices(s,opts),{kind:'sacrificeBuff',p,uid:e.uid},0);return;
 }
 if(r.op==='draw'){
  if(r.optional){prompt(s,p,'是否抽牌？',[{id:'yes',label:`抽 ${r.count} 張牌`},{id:'no',label:'不抽牌'}],{...e,kind:'optionalDraw'});return;}
  draw(s,p,r.count);return;
 }
 if(r.op==='mill'){if(r.optional){if(s.players[p].deck.length>=r.count)prompt(s,p,`是否將牌堆頂 ${r.count} 張送到場外？`,[{id:'yes',label:'送到場外'},{id:'no',label:'不發動'}],{...e,kind:'optionalMill'});return;}const cards=s.players[p].deck.splice(0,r.count);s.players[p].outside.push(...cards.map(plain));log(s,`${s.players[p].name}將牌堆頂 ${cards.length} 張送到場外。`,'effect');if(r.then&&cards.length===r.count)queueRules(s,p,e.uid,r.then,true);return;}
 if(r.op==='chooseMode'){prompt(s,p,'選擇一項效果',r.modes.map((x,i)=>({id:String(i),label:x.label})).filter(x=>!r.modes[Number(x.id)].when||condition(s,p,e.uid,r.modes[Number(x.id)].when)),{...e,kind:'chooseMode'});return;}
 if(r.op==='look'){
  const shown=s.players[p].deck.splice(0,r.count);if(!shown.length)return;
  s.inspecting ||= [];s.inspecting.push(...shown.map(card=>({p,card})));
  const eligible=shown.filter(c=>matchFilter(c,r.filter));
  if(eligible.length&&r.takeMax){prompt(s,p,`查看牌庫頂 ${shown.length} 張，選擇最多 ${r.takeMax} 張加入手牌`,eligible.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{...e,kind:'lookTake',cards:shown.map(c=>c.uid)},r.takeMin||0,r.takeMax);}
  else finishLook(s,{...e,cards:shown.map(c=>c.uid),kind:'lookTake'},[]);
  return;
 }
 if(r.op==='peekTop'){
  const owner=r.deckOwner==='opponent'?1-p:p;const cards=s.players[owner].deck.slice(0,r.count);if(!cards.length)return;
  if(r.millMax){
   const eligible=cards.filter(c=>matchFilter(c,r.millFilter));
   if(eligible.length){
    prompt(s,p,`查看牌庫頂 ${cards.length} 張：選擇最多 ${r.millMax} 張符合條件的卡送至場外`,eligible.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{...e,kind:'peekMill',cards:cards.map(c=>c.uid)},0,r.millMax);
   }else if(cards.length>1){
    // Even with no legal card to mill, the owner must see the top cards and choose their order.
    prompt(s,p,'查看牌庫頂：沒有符合送場外條件的卡，請選擇放回順序',cards.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{...e,kind:'peekOrder',uids:cards.map(c=>c.uid),chosen:[]});
   }else{
    prompt(s,p,'查看牌庫頂：沒有符合送場外條件的卡', [{id:'done',label:'確認，維持原狀'}],{...e,kind:'peekNoMill',cards:cards.map(c=>c.uid)});
   }
  }
  else if(r.count===1)prompt(s,p,`查看 ${cardOf(cards[0]).name}，選擇去向`,(r.destinations||[]).filter(d=>d!=='hand'||matchFilter(cards[0],r.handFilter)).map(d=>({id:d,label:d==='top'?'放回牌堆頂':d==='bottom'?'放在牌堆底':d==='hand'?'加入手牌':'送到場外'})),{...e,kind:'peekChoice',cards:cards.map(c=>c.uid)});
  return;
 }
 if(r.op==='discardHand'){const opts=s.players[p].hand.filter(c=>matchFilter(c,r.filter));if(opts.length>=r.count)prompt(s,p,`選擇 ${r.count} 張手牌送至場外`,opts.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{...e,kind:'discardHand'},r.optional?0:r.count,r.count,r.optional?[0,r.count]:[r.count]);return;}
 if(r.op==='deployFrom'){const zone=r.zone,opts=s.players[p][zone].filter(c=>matchFilter(c,r.filter)&&(!r.requireEnergy||energy(s,p,cardOf(c).color)>=needEnergy(s,p,cardOf(c))));if(opts.length)prompt(s,p,'選擇要免費登場的卡片',opts.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{...e,kind:'deployCard'},r.optional?0:1);return;}
 if(r.op==='recoverOutside'){
  const opts=s.players[p].outside.filter(c=>matchFilter(c,r.filter));
  if(opts.length)prompt(s,p,'選擇從場外加入手牌的卡片',opts.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{...e,kind:'recoverOutside'},r.optional?0:1);return;
 }
 if(r.op==='removeOutside'){
  const opts=s.players[p].outside.filter(c=>matchFilter(c,r.filter));
  const n=Math.min(opts.length,r.count);
  if(n)prompt(s,p,`選擇 ${n} 張場外牌除外${n<r.count?'（不足需求，無後續效果）':''}`,opts.map(c=>({id:c.uid,cardId:c.cardId,label:cardOf(c).name})),{...e,kind:'removeOutside'},r.optional?0:n,n,r.optional?[0,n]:[n]);return;
 }
 if(r.op==='discardOpponent'){if(s.players[1-p].hand.length)prompt(s,1-p,'選擇 1 張手牌送至場外',s.players[1-p].hand.map(x=>({id:x.uid,cardId:x.cardId,label:cardOf(x).name})),{kind:'opponentDiscard',p:1-p});return;}
 if(r.op==='drawDiscard'){draw(s,p,r.draw);s.queue.unshift({kind:'rule',p,uid:e.uid,rule:{op:'discard',count:r.discard}});return;}
 if(r.op==='discard'){const n=Math.min(r.count,s.players[p].hand.length);if(n)prompt(s,p,`選擇 ${n} 張手牌送到場外`,s.players[p].hand.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{...e,kind:'ruleChoice'},r.optional?0:n,n);return;}
 if(r.op==='nextApDiscount'){s.players[p].nextApDiscount={maxEnergy:r.maxEnergy,names:r.names,trait:r.trait,amount:r.amount,turn:s.turn};return;}
 if(r.op==='recoverAp'){s.queue.unshift({kind:'recoverAp',p,count:r.count});return;}
 if(r.op==='bounceSmall'){s.queue.unshift({kind:'orihime',p,uid:e.uid});return;}
 if(r.op==='energyBoost'){if(c){c.energyBoostTurn=s.turn;c.energyBoostAmount=r.amount||1;if(r.duration==='nextTurn')c.energyBoostUntilSource=s.players[p].turnCount+1;if(r.retire)c.sacrificeTurn=s.turn;}return;}
 if(r.op==='keyword'||r.op==='addImpact'){if(r.target==='own'){const targets=ruleTargets(s,p,e.uid,r);prompt(s,p,'選擇獲得能力的角色',targetChoices(s,targets),{...e,kind:'ruleChoice'},r.optional?0:1);return;}if(c){if(r.op==='keyword')c[r.key+'Turn']=s.turn;else {c.impactBonusTurn=s.turn;c.impactBonusAmount=(c.impactBonusAmount||0)+(r.count||1);}}return;}
 const targets=ruleTargets(s,p,e.uid,r);
 if(r.target==='self'||r.all){for(const t of targets)applyRuleTarget(s,t.uid,r,p);return;}
 prompt(s,p,r.title||'選擇卡片效果的對象',targetChoices(s,targets),{...e,kind:'ruleChoice'},r.optional?0:1,r.maxTargets||1);
}
function applyRuleTarget(s,uid,r,sourcePlayer=null){const l=locate(s,uid);if(!l)return;
 if(r.op==='buff')addBuff(s,uid,r.amountIfName&&r.amountIfName.names.some(n=>matchingName(l.card,n))?r.amountIfName.amount:r.amount,r.duration);
 const cannotRest=sourcePlayer!=null&&l.p!==sourcePlayer&&printedRuleActive(s,l.card,'immuneEnemyRest');
 if(r.op==='rest'&&!cannotRest)l.card.ready=false;
 if(r.op==='freeze'){if(!cannotRest)l.card.ready=false;l.card.skipActive=(l.card.skipActive||0)+1;}
 if(r.op==='activate')activate(s,l.card);
 if(r.op==='keyword')l.card[r.key+'Turn']=s.turn;
 if(r.op==='addImpact'){l.card.impactBonusTurn=s.turn;l.card.impactBonusAmount=(l.card.impactBonusAmount||0)+(r.count||1);}
 if(r.op==='destroy')shieldOrRetire(s,uid,sourcePlayer??s.active);
 if(r.op==='bounce'&&!(sourcePlayer!=null&&l.p!==sourcePlayer&&printedRuleActive(s,l.card,'immuneEnemyBounce')))shieldOrRetire(s,uid,sourcePlayer??l.p,{dest:'hand'});
}
// A printed IMPACT outside the Raid box is always available; raidImpact is Raid-only (Q51).
const impactOf=(s,c)=>(c.impactTurn===s.turn||(!silenced(s,c)&&(!!cardOf(c).rules?.impact||isRaided(c)&&!!cardOf(c).rules?.raidImpact))?1:0)+(c.impactBonusTurn===s.turn?(c.impactBonusAmount||0):0)+(c.sniperImpactActive?1:0)+(!silenced(s,c)&&cardOf(c).rules?.passive?.impactIfRemovedZeroNames&&removedZeroNames(s,locate(s,c.uid)?.p)>=cardOf(c).rules.passive.impactIfRemovedZeroNames?1:0);
function removedZeroNames(s,p){if(p==null)return 0;return new Set(s.players[p].removed.filter(c=>withTrait(c,'零番隊')).map(c=>cardOf(c).name)).size;}
export const damageOf=(s,c)=>c.damageTurn===s.turn||isRaided(c)&&cardOf(c).rules?.raidPassive?.damage===2&&s.active===(locate(s,c.uid)?.p??s.active)&&(s.retireCountTurn===s.turn?s.retireCount||0:0)>=cardOf(c).rules.raidPassive.bpIfOwnRetireCount||isRaided(c)&&!silenced(s,c)&&cardOf(c).rules?.raidDamageIfOppReduced&&s.active===(locate(s,c.uid)?.p??s.active)&&s.players[1-(locate(s,c.uid)?.p??s.active)].front.filter(x=>x&&bp(s,x)<cardOf(x).bp).length>=3||cardOf(c).rules?.damage===2||cardOf(c).rules?.passive?.damageIfRemovedCount&&s.players[locate(s,c.uid)?.p??s.active].removed.length>=cardOf(c).rules.passive.damageIfRemovedCount||cardOf(c).rules?.passive?.damageIfRemovedZeroNames&&removedZeroNames(s,locate(s,c.uid)?.p)>=cardOf(c).rules.passive.damageIfRemovedZeroNames?2:1;
function enqueueEntry(s,p,c){const r=cardOf(c).rules;if(r?.entryReady===true||r?.entryReady&&(r.entryReady.line!=='energy'||locate(s,c.uid)?.line==='energy')&&condition(s,p,c.uid,r.entryReady))c.ready=true;if(c.cardId==='034')s.queue.unshift({kind:'drawDiscard',p,count:1});if(c.cardId==='035')s.queue.unshift({kind:'orihime',p,uid:c.uid});if(c.cardId==='105')s.queue.unshift({kind:'renjiDebuff',p});if(c.cardId==='106')s.queue.unshift({kind:'removeDraw',p,count:3,draw:2,optional:true});if(raidBoxEnabled(c,'entry'))queueRules(s,p,c.uid,cardOf(c).rules?.entry,true);if(isRaided(c)&&r?.raidHighBase&&cardOf(c.stack[0]).energy>=r.raidHighBase.minEnergy){
  queueRules(s,p,c.uid,r.raidHighBase.entry,true);
  // Damage (2) is a temporary combat keyword, not immediate life loss at entry.
  if(c.cardId==='BLC-2-067')log(s,'更木劍八突襲成功：需求能源 4 以上底板，本回合獲得 BP +1000 與 DAMAGE 2（未被阻擋的攻擊造成 2 點傷害）。','effect');
 }}
function place(s,p,c,line,slot,{raidTarget=null}={}){
 let stack=[];
 if(raidTarget){const base=locate(s,raidTarget);
  // Raid discards the previous unit's received turn-based state. Only its physical identity stays below.
  const beneath=fresh(base.card.uid,base.card.cardId);beneath.enteredTurn=base.card.enteredTurn;
  stack=[beneath];s.players[p][base.line][base.slot]=null;}
 if(s.players[p][line][slot])takeField(s,s.players[p][line][slot].uid,'removed');
 const inst=fresh(c.uid,c.cardId);inst.stack=stack;
 // RAID is a new character state: readiness must never be inherited from a REST base.
 // Apply this before enqueueing entry effects, which may legitimately REST the new top.
 inst.ready=stack.length>0;inst.deployedByOwnEffect=!!c.deployedByOwnEffect;inst.enteredTurn=s.turn;s.players[p][line][slot]=inst;
 s.players[p].enteredNamesTurn=s.turn;(s.players[p].enteredNames??=[]).push(cardOf(inst).name);
 if(raidTarget&&stack[0]&&cardOf(stack[0]).rules?.onRaided)queueRules(s,p,inst.uid,cardOf(stack[0]).rules.onRaided,true);
 log(s,`${s.players[p].name}${raidTarget?' Raid ': '出場'}${cardOf(c).name}到${line==='front'?'前線':'能源線'}。`,'play');enqueueEntry(s,p,inst);
}
function queueEvent(s,p,c){
 s.resolving.push({p,card:c});const effects=[];
 if(c.cardId==='062')effects.push({kind:'bread',p},{kind:'recoverAp',p,count:1});
 if(c.cardId==='064')effects.push({kind:'getsuga',p});
 if(c.cardId==='066')effects.push({kind:'recoverAp',p,count:2});
 if(c.cardId==='109')effects.push({kind:'drawDiscard',p,count:2});
 effects.push(...(cardOf(c).rules?.event||[]).map(rule=>({kind:'rule',p,uid:c.uid,rule})));
 effects.push({kind:'finishEvent',p,uid:c.uid});s.queue.push(...effects);
}
function damage(s,p,count=1){
 const reveals=s.players[p].life.splice(0,count);
 log(s,`${s.players[p].name}受到 ${count} 點傷害，翻開 ${reveals.length} 張生命。`,'damage');
 for(const c of reveals){
  s.revealed.push({p,card:c});
  // Face-up life cards are public, even without a Trigger or when the AI
  // resolves it immediately. Hidden life/deck/hand cards are not included.
  const d=cardOf(c);
  s.triggerHistory ||= [];
  s.triggerHistory.push({uid:c.uid,player:p,turn:s.turn,cardId:c.cardId,trigger:d.trigger||null,outcome:d.trigger?'pending':'none'});
  if(s.triggerHistory.length>60)s.triggerHistory.shift();
 }
 s.queue.push({kind:'triggerOrder',p,uids:reveals.map(c=>c.uid)},{kind:'lifeCheck',p});
}

function finishReveal(s,p,uid,dest='outside'){
 const i=s.revealed.findIndex(x=>x.card.uid===uid);if(i<0)return null;
 const c=s.revealed.splice(i,1)[0].card;
 if(dest)s.players[p][dest].push(plain(c));return c;
}
function askTrigger(s,e){
 const c=s.revealed.find(x=>x.card.uid===e.uid)?.card;if(!c)return;
 const d=cardOf(c);log(s,`${s.players[e.p].name}翻開${d.name}${d.trigger?`・${d.trigger.toUpperCase()} Trigger`:'・無 Trigger'}。`,'trigger');
 if(!d.trigger){finishReveal(s,e.p,c.uid);return;}
 const choices=[{id:'skip',label:'不發動，送到場外'}];
 if(d.trigger==='raid'){
  choices.push({id:'get',label:'加入手牌',cardId:c.cardId});
  for(const [i,a] of raidOptions(s,e.p,c).entries()){
   const target=locate(s,a.target),occupant=s.players[e.p][a.line][a.slot];
   choices.push({id:`raid-${i}`,label:`Raid ${cardOf(target.card).name} → ${a.line==='front'?'前線':'能源線'} ${a.slot+1}${occupant&&occupant.uid!==a.target?'（換位）':''}`,cardId:c.cardId,action:a});
  }
 }else choices.push({id:'activate',label:`發動 ${d.trigger.toUpperCase()} Trigger`,cardId:c.cardId});
 prompt(s,e.p,`${d.name}的生命 Trigger`,choices,{kind:'triggerChoice',p:e.p,uid:c.uid});
}
function pump(s){
 let steps=0;
 while(s.status==='playing'&&!s.pending&&s.queue.length){
  if(++steps>1000)throw new Error('效果結算超出限制');
  const e=s.queue.shift(),p=e.p;
  switch(e.kind){
   case 'rule':resolveRule(s,e);break;
   case 'soiFonResolve':{
    if(e.targetUid&&locate(s,e.targetUid)?.p===s.active)shieldOrRetire(s,e.targetUid,e.p);
    s.queue.unshift({kind:'soiFonMove',p:e.p,uid:e.uid});break;
   }
   case 'soiFonMove':{
    const l=locate(s,e.uid);if(!l||l.p!==p)break;
    if(l.line==='energy'){l.card.ready=false;break;}
    prompt(s,p,'碎蜂：指定移至能源線的位置',Array.from({length:4},(_,i)=>({id:String(i),label:`能源線 ${i+1}`})),{kind:'soiFonMoveSlot',p,uid:e.uid});break;
   }
   case 'blueDiscardFollowup':{
    const d=s.players[p].outside.find(x=>x.uid===e.uid),src=locate(s,e.sourceUid)?.card;
    if(!d||!src)break;
    if(!e.skipLiluka&&matchingName(src,'黑崎一護')){
     const targets=allField(s,p).filter(x=>x.cardId==='BLC-4-034'&&x.ready&&!(x.under||[]).length);
     if(targets.length){prompt(s,p,'莉露卡：可將剛送場外的牌裏向放至角色下',targetChoices(s,targets),{kind:'lilukaStore',p,uid:e.uid,sourceUid:e.sourceUid},0);break;}
    }
    if(cardOf(d).identity==='BLC-4-036'&&energy(s,p,'blue')>=4&&s.players[p].ap>=1&&!allField(s,p).some(x=>traitsOf(x).some(t=>!t.includes('破面')))&&s.groupUsed?.[`${p}:grimDiscard`]!==s.turn){
     prompt(s,p,'葛力姆喬：支付 1 AP 從場外 ACTIVE 登場？',[{id:'yes',label:'支付 1 AP 並登場'},{id:'no',label:'不發動'}],{kind:'grimPay',p,uid:e.uid});
    }break;
   }
   case 'blueDiscardEvent':{
    // Q1033/Q1045/Q1046/Q2315: a discarded event resolves AFTER the discarding ability,
    // even if Liluka has placed the event face-down under herself meanwhile.
    if(e.cardId==='BLC-2-047')draw(s,p,1);
    if(e.cardId==='BLC-2-046'&&locate(s,e.sourceUid)&&s.players[p].hand.length){
     prompt(s,p,'月牙十字衝：可將 1 張手牌放至牌庫底，讓一護獲得二次攻擊',s.players[p].hand.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{kind:'blueCrossDiscard',p,sourceUid:e.sourceUid},0);
    }break;
   }
   case 'snipeBattle':{
    const a=locate(s,e.uid),b=locate(s,e.target);
    if(a&&b){if(bp(s,a.card)>=bp(s,b.card))shieldOrRetire(s,b.card.uid,p,{attackerUid:a.card.uid,after:'combat'});}
    s.queue.push({kind:'endCombat',p},{kind:'postCombat',p,uid:e.uid});break;
   }

   case 'impactDamage':damage(s,p,e.count||1);break;
   case 'colorDeploy':{const r=e.rule,targets=s.players[p][r.zone].filter(c=>cardOf(c).type==='character'&&cardOf(c).color===r.color&&cardOf(c).energy<=2&&cardOf(c).ap===1);prompt(s,p,'COLOR：選擇要以 ACTIVE 登場的角色',targets.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{kind:'colorCard',p,rule:r});break;}
   case 'triggerOrder':if(e.uids.length===1)s.queue.unshift({kind:'trigger',p,uid:e.uids[0]});else if(e.uids.length>1)prompt(s,p,'選擇下一張要結算的生命卡',e.uids.map(uid=>{const c=s.revealed.find(x=>x.card.uid===uid).card;return {id:uid,cardId:c.cardId,label:cardOf(c).name};}),{kind:'triggerOrder',p,uids:e.uids});break;
   case 'draw':draw(s,p,e.count);break;
   case 'drawDiscard':draw(s,p,e.count);s.queue.unshift({kind:'discard',p});break;
   case 'discard':prompt(s,p,'選擇 1 張手牌送到場外',s.players[p].hand.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),{kind:'discard',p});break;
   case 'orihime':{
    const targets=characters(s,p).filter(c=>c.uid!==e.uid&&cardOf(c).energy<=1);
    if(targets.length)prompt(s,p,'織姬登場：返回另一個需求 1 以下的角色',targetChoices(s,targets),{kind:'bounce',p});else takeField(s,e.uid,'hand');break;
   }
   case 'renjiDebuff':prompt(s,p,'戀次登場：可讓一個敵方前線 BP −3000',targetChoices(s,s.players[1-p].front.filter(Boolean)),{kind:'buff',p,amount:-3000},0);break;
   case 'renjiMill':{
    if(s.players[p].deck.length){const c=s.players[p].deck.shift();s.players[p].outside.push(plain(c));log(s,`${cardOf(c).name}由牌堆頂送到場外。`,'effect');prompt(s,p,'可讓另一個己方角色本回合 BP +500',targetChoices(s,characters(s,p).filter(c=>c.uid!==e.uid)),{kind:'buff',p,amount:500},0);}else log(s,'牌堆沒有卡片，戀次的後續加成不結算。');break;
   }
   case 'bread':prompt(s,p,'麵包：選擇一個角色，本回合 BP +1000',targetChoices(s,characters(s,p)),{kind:'buff',p,amount:1000});break;
   case 'getsuga':prompt(s,p,'月牙天衝：選擇退場的敵方前線角色',targetChoices(s,eligibleEventTargets(s,p,BY_ID['064'])),{kind:'destroy',p});break;
   case 'special':prompt(s,p,'SPECIAL：選擇退場的敵方前線角色',targetChoices(s,s.players[1-p].front.filter(c=>c&&!protectedByEffect(s,c)&&c.immuneTriggerTurn!==s.turn)),{kind:'destroy',p});break;
   case 'active':prompt(s,p,'ACTIVE：選擇己方角色，轉為 ACTIVE 並 BP +3000',targetChoices(s,characters(s,p)),{kind:'activeBuff',p});break;
   case 'recoverAp':{
    const count=Math.min(e.count,s.players[p].maxAp-s.players[p].ap);
    if(count>0)prompt(s,p,'選擇要回復的 AP 數量',Array.from({length:count+1},(_,n)=>({id:String(n),label:n?`回復 ${n} AP`:'不回復'})),{kind:'recoverAp',p});break;
   }
   case 'removeDraw':{
    const n=Math.min(e.count,s.players[p].outside.length);
    if(n)prompt(s,p,`${e.optional?'可':''}選 ${n} 張場外牌除外${n<e.count?'（不足指定數量，不獲得後續效果）':''}`,s.players[p].outside.map(c=>({id:c.uid,label:cardOf(c).name,cardId:c.cardId})),e,e.optional?0:n,n,e.optional?[0,n]:[n]);
    else log(s,'場外沒有卡片，後續效果不結算。');break;
   }
   case 'finishEvent':{
    const i=s.resolving.findIndex(x=>x.card.uid===e.uid);if(i>=0)s.players[p].outside.push(plain(s.resolving.splice(i,1)[0].card));break;
   }
   case 'trigger':askTrigger(s,e);break;
   case 'finishReveal':finishReveal(s,p,e.uid);break;
   case 'lifeCheck':if(!s.players[p].life.length)fail(s,p,'的生命歸零');break;
   case 'block':{
    const a=locate(s,e.uid);if(!a){s.combat=null;break;}
    const attacker=cardOf(a.card),blockers=s.players[1-p].front.filter(c=>c&&c.ready&&!silenced(s,c)&&!((!silenced(s,a.card)&&attacker.rules?.noBlockBelow&&bp(s,c)<=attacker.rules.noBlockBelow)||(a.card.noBlockBelowTurn===s.turn&&bp(s,c)<=3000))&&!(a.card.noBlockHighTurn===s.turn&&bp(s,c)>=4000)&&!(a.card.noBlockHighTurn===s.turn&&a.card.noBlockHighThreshold&&bp(s,c)>=a.card.noBlockHighThreshold));const mandatory=blockers.filter(c=>(!silenced(s,c)&&cardOf(c).rules?.forcedBlock||c.forcedBlockTurn===s.turn));const choices=[...(!mandatory.length?[{id:'pass',label:'不阻擋，承受生命傷害'}]:[]),...targetChoices(s,mandatory.length?mandatory:blockers)];
    prompt(s,1-p,'選擇阻擋角色，或承受傷害',choices,{kind:'block',p,uid:e.uid});break;
   }
   case 'endCombat':s.combat=null;break;
   case 'postAttackRetire':if(locate(s,e.uid))takeField(s,e.uid);break;
   case 'raidBaseRevive':{
    const i=s.players[p].outside.findIndex(x=>x.uid===e.card.uid);if(i<0)break;
    prompt(s,p,'可把 Raid 底卡以 REST 登場',Array.from({length:8},(_,i)=>({id:`${i<4?'front':'energy'}-${i%4}`,label:`${i<4?'前線':'能源線'} ${i%4+1}`})),{kind:'raidBaseRevive',p,uid:e.card.uid},0);break;
   }
   case 'postCombat':{
    const sniper=locate(s,e.uid)?.card;if(sniper)sniper.sniperImpactActive=false;
    if(locate(s,e.uid)?.card.attackRetireTurn===s.turn)takeField(s,e.uid);
    const l=locate(s,e.uid),r=l&&cardOf(l.card).rules;
    if(l&&l.p===p&&isRaided(l.card)&&r?.raidAttackEndSwap){
     const distinct=new Set(s.players[p].outside.filter(c=>cardOf(c).color==='green'&&['event','field'].includes(cardOf(c).type)).map(c=>cardOf(c).name));
     if(distinct.size>=4)prompt(s,p,'可與己方能源線角色交換位置',targetChoices(s,s.players[p].energy.filter(c=>c&&cardOf(c).type==='character')),{kind:'raidAttackSwap',p,uid:e.uid},0);
    }
    if(!s.pending)for(const y of s.players[p].energy.filter(c=>c&&cardOf(c).rules?.attackAfterOwn&&c.usedTurn!==s.turn)){
      const choices=s.players[p].front.filter(x=>x&&x.attackTurn!==s.turn);
      if(choices.length){prompt(s,p,'夜一：攻擊結束後可與尚未攻擊的己方前線角色交換位置',targetChoices(s,choices),{kind:'yoruichiSwap',p,uid:y.uid},0);break;}
    }break;
   }
   case 'endTurn':{
    for(const c of allField(s,p))if(c.freezeUntilAttackOwner===p)delete c.freezeUntilAttackOwner;
    readyOwnField(s,p);for(let pp=0;pp<2;pp++)for(const c of allField(s,pp))c.buffs=c.buffs.filter(b=>b.turn!==s.turn);
    log(s,`${s.players[p].name}結束回合，己方角色與場域轉為 ACTIVE。`);s.active=1-p;beginTurn(s);break;
   }
  }
  stateCheck(s);
 }
}
function resolveChoice(s,ids){
 const q=s.pending;
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!q.choices.some(c=>c.id===id))||ids.length<q.min||ids.length>q.max||q.allowedCounts&&!q.allowedCounts.includes(ids.length))throw new Error('請選擇合法的效果對象與數量。');
 const e=q.effect,p=e.p,chosen=q.choices.filter(c=>ids.includes(c.id));s.pending=null;
 switch(e.kind){
  case 'colorCard':{const c=s.players[p][e.rule.zone].find(c=>c.uid===ids[0]);const lines=e.rule.front?['front']:['front','energy'];prompt(s,p,'選擇登場位置',lines.flatMap(line=>Array.from({length:4},(_,slot)=>({id:line+'-'+slot,label:(line==='front'?'前線':'能源線')+' '+(slot+1)+(s.players[p][line][slot]?'（換位）':''),line,slot}))),{kind:'colorSlot',p,zone:e.rule.zone,uid:c.uid});break;}
  case 'colorSlot':{const i=s.players[p][e.zone].findIndex(c=>c.uid===e.uid),c=s.players[p][e.zone].splice(i,1)[0],pos=chosen[0];place(s,p,c,pos.line,pos.slot);locate(s,c.uid).card.ready=true;break;}
  case 'optionalDraw':if(ids[0]==='yes')draw(s,p,e.rule.count);break;
  case 'raidShield':{
   if(ids[0]!=='decline'){
    moveDiscard(s,p,ids[0]);removeRaidTop(s,e.uid);
    log(s,'更木劍八使用手牌支付替代離場，Raid 底卡留在場上。','effect');
   }else if(e.after==='combat')finishBlockedWin(s,1-p,e.attackerUid,e.uid);
   else takeField(s,e.uid,e.dest);
   if(e.after==='combat')s.queue.push({kind:'endCombat',p:1-p},{kind:'postCombat',p:1-p,uid:e.attackerUid});
   break;
  }
  case 'raidTopChoice':if(ids.length)removeRaidTop(s,ids[0]);break;
  case 'millRaidRemove':{
   for(const uid of ids){const i=s.players[p].outside.findIndex(c=>c.uid===uid);if(i>=0)s.players[p].removed.push(s.players[p].outside.splice(i,1)[0]);}
   if(ids.length)prompt(s,p,`選擇敵方前線角色，本回合 BP ${e.rule.perCard*ids.length}`,targetChoices(s,s.players[1-p].front.filter(Boolean)),{kind:'raidMillDebuff',p,amount:e.rule.perCard*ids.length},0);break;
  }
  case 'raidMillDebuff':if(ids.length)addBuff(s,ids[0],e.amount);break;
  case 'frostRaid':{
   if(ids.length){const l=locate(s,ids[0]);if(l){if(!printedRuleActive(s,l.card,'immuneEnemyRest'))l.card.ready=false;l.card.freezeUntilAttackOwner=l.p;}
    if(allField(s,p).filter(c=>c.uid!==e.uid&&withTrait(c,'護廷十三隊')).length>=6)for(const c of s.players[1-p].energy.filter(Boolean)){if(!printedRuleActive(s,c,'immuneEnemyRest'))c.ready=false;c.freezeUntilAttackOwner=1-p;}
   }break;
  }
  case 'rukiaRestLock':if(ids.length){const l=locate(s,ids[0]);if(l){if(!printedRuleActive(s,l.card,'immuneEnemyRest'))l.card.ready=false;if(e.lock)l.card.lockedBy=e.uid;}}break;
  case 'raidMoveTribe':{
   if(ids.length){const l=locate(s,ids[0]);if(l){prompt(s,p,'選擇要移到的前線位置',Array.from({length:4},(_,n)=>({id:String(n),label:`前線 ${n+1}${s.players[p].front[n]?'（換位）':''}`})),{...e,kind:'raidMoveTribeSlot',selectedUid:ids[0]});}}break;
  }
  case 'raidMoveTribeSlot':{
   const l=locate(s,e.selectedUid),slot=Number(ids[0]);if(l){s.players[p].energy[l.slot]=null;if(s.players[p].front[slot])takeField(s,s.players[p].front[slot].uid,'removed');s.players[p].front[slot]=l.card;}
   s.queue.unshift({kind:'rule',p,uid:e.uid,rule:e.rule});break;
  }
  case 'raidBuffImpact':if(ids.length){addBuff(s,ids[0],e.rule.amount);const l=locate(s,ids[0]);if(l){l.card.impactTurn=s.turn;}}break;
  case 'zeroBanish':{
   for(const uid of ids){const i=s.players[p].hand.findIndex(x=>x.uid===uid);if(i>=0)s.players[p].removed.push(s.players[p].hand.splice(i,1)[0]);}
   if(e.rule.drawEach&&ids.length)draw(s,p,ids.length);
   s.queue.unshift({kind:'rule',p,uid:e.uid,rule:{op:'destroy',target:'oppFront',bpMax:(e.rule.base??2500)+1000*ids.length,optional:true}});break;
  }
  case 'raidBaseRevive':{
   if(ids.length){const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i>=0){const c=s.players[p].outside.splice(i,1)[0];const [line,slotText]=ids[0].split('-');place(s,p,c,line,Number(slotText));}}break;
  }
  case 'yoruichiSwap':if(ids.length){const a=locate(s,e.uid),b=locate(s,ids[0]);if(a?.line==='energy'&&b?.line==='front'&&mayMoveToEnergy(b.card)){s.players[p].energy[a.slot]=b.card;s.players[p].front[b.slot]=a.card;a.card.usedTurn=s.turn;}}break;
  case 'raidAttackSwap':if(ids.length){const a=locate(s,e.uid),b=locate(s,ids[0]);if(a&&b&&mayMoveToEnergy(a.card)){s.players[p].front[a.slot]=b.card;s.players[p].energy[b.slot]=a.card;}}break;
  case 'protectIchigo':if(ids.length){const l=locate(s,ids[0]);if(l)l.card.protectedUntilSource={p,turnCount:s.players[p].turnCount+1,scope:'characterTrigger'};}break;
  case 'lilukaRecoverUnder':if(ids[0]==='yes'){const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i>=0)s.players[p].hand.push(s.players[p].outside.splice(i,1)[0]);}break;
  case 'lilukaStore':{
   if(ids.length){const l=locate(s,ids[0]),i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(l&&i>=0&&l.card.ready&&!(l.card.under||[]).length){l.card.ready=false;l.card.under??=[];l.card.under.push(s.players[p].outside.splice(i,1)[0]);}}
   s.queue.unshift({kind:'blueDiscardFollowup',p,uid:e.uid,sourceUid:e.sourceUid,skipLiluka:true});break;
  }
  case 'blueCrossDiscard':{
   if(ids.length){const i=s.players[p].hand.findIndex(c=>c.uid===ids[0]),source=locate(s,e.sourceUid);
    if(i>=0&&source){s.players[p].deck.push(s.players[p].hand.splice(i,1)[0]);source.card.doubleAttackTurn=s.turn;}
   }break;
  }
  case 'grimPay':{
   if(ids[0]==='yes'&&s.players[p].ap>=1&&s.players[p].outside.some(x=>x.uid===e.uid)){
    s.players[p].ap--;s.groupUsed||={};s.groupUsed[`${p}:grimDiscard`]=s.turn;
    prompt(s,p,'葛力姆喬：選擇 ACTIVE 登場位置',Array.from({length:8},(_,i)=>({id:`${i<4?'front':'energy'}-${i%4}`,label:`${i<4?'前線':'能源線'} ${i%4+1}`})),{kind:'grimDeploy',p,uid:e.uid});
   }break;
  }
  case 'grimDeploy':{
   const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i<0)break;
   const c=s.players[p].outside.splice(i,1)[0],[line,slot]=ids[0].split('-');place(s,p,c,line,Number(slot));const placed=locate(s,c.uid);if(placed)placed.card.ready=true;break;
  }
  case 'delaySoiFonTarget':(s.delayed??=[]).push({p,uid:e.uid,targetUid:ids[0]||null,duePlayer:1-p,dueTurnCount:s.players[1-p].turnCount+1});break;
  case 'soiFonMoveSlot':{
   const loc=locate(s,e.uid);if(!loc||loc.p!==p||!mayMoveToEnergy(loc.card))break;
   if(loc.line==='energy'){loc.card.ready=false;break;}
   const slot=Number(ids[0]);s.players[p].front[loc.slot]=null;if(s.players[p].energy[slot])takeField(s,s.players[p].energy[slot].uid,'removed');s.players[p].energy[slot]=loc.card;loc.card.ready=false;break;
  }
  case 'sniperYoruichi':if(ids.length){addBuff(s,ids[0],2000);const y=locate(s,ids[0])?.card;if(y)y.sniperTurn=s.turn;}break;
  case 'uryuFromHandSlot':{
   const i=s.players[p].hand.findIndex(c=>c.uid===e.uid);if(i<0)break;const c=s.players[p].hand.splice(i,1)[0];place(s,p,c,'front',Number(ids[0]));const placed=locate(s,c.uid);if(placed)placed.card.ready=true;break;
  }
  case 'swapFrontPick':if(ids.length)prompt(s,p,'選擇要交換的己方能源線角色',targetChoices(s,s.players[p].energy.filter(x=>x&&cardOf(x).type==='character')),{kind:'swapEnergyPick',p,first:ids[0]});break;
  case 'swapEnergyPick':{const a=locate(s,e.first),b=locate(s,ids[0]);if(a?.line==='front'&&b?.line==='energy'&&a.p===p&&b.p===p&&mayMoveToEnergy(a.card)){s.players[p].front[a.slot]=b.card;s.players[p].energy[b.slot]=a.card;}break;}
  case 'guessEnergySingle':{
   const top=s.players[p].deck[0];if(top&&cardOf(top).energy===Number(ids[0])){s.players[p].hand.push(s.players[p].deck.shift());queueRules(s,p,e.uid,[{op:'discardHand',count:1,remove:true}],true);}break;
  }
  case 'deployOrRaidPick':{
   if(!ids.length)break;const c=s.players[p].hand.find(x=>x.uid===ids[0]);if(!c)break;
   const placements=Array.from({length:8},(_,i)=>({id:`normal-${i<4?'front':'energy'}-${i%4}`,label:`REST 登場：${i<4?'前線':'能源線'} ${i%4+1}`}));
   const raids=raidOptions(s,p,c).map((a,i)=>({id:`raid-${i}`,label:`RAID 至 ${a.line==='front'?'前線':'能源線'} ${a.slot+1}`,action:a}));
   prompt(s,p,'選擇免費登場的位置／RAID 角色', [...placements,...raids],{kind:'deployOrRaidSlot',p,uid:c.uid});break;
  }
  case 'deployOrRaidSlot':{
   const i=s.players[p].hand.findIndex(x=>x.uid===e.uid);if(i<0)break;const c=s.players[p].hand.splice(i,1)[0];
   const choice=chosen[0];if(choice.action){const a=choice.action;place(s,p,c,a.line,a.slot,{raidTarget:a.target});}
   else {const [,line,slot]=ids[0].split('-');place(s,p,c,line,Number(slot));const deployed=locate(s,c.uid);if(deployed)deployed.card.ready=false;}break;
  }
  case 'guessEnergy':queueRules(s,p,e.uid,[{op:'look',count:e.rule.count||2,takeMax:1,filter:{energyIs:Number(ids[0]),type:'character'},rest:'outside'}],true);break;
  case 'twoEqualFirst':{if(ids.length){const c=locate(s,ids[0])?.card;if(c){const choices=s.players[1-p].front.filter(x=>x&&x.uid!==c.uid&&bp(s,x)===bp(s,c)&&bp(s,x)<=2000);prompt(s,p,'選擇另一個 BP 相同的角色',targetChoices(s,choices),{kind:'twoEqualDestroy',p,first:ids[0]});}}break;}
  case 'twoEqualDestroy':if(ids.length===1){ids=[e.first,ids[0]];}if(ids.length===2){const a=locate(s,ids[0]),b=locate(s,ids[1]);if(a&&b&&bp(s,a.card)===bp(s,b.card)){for(const uid of ids)shieldOrRetire(s,uid,p);}}break;
  case 'retireGuard':if(ids.length){const l=locate(s,ids[0]);if(l){l.card.protectedUntilSource={p,turnCount:s.players[p].turnCount+1};}}break;
  case 'gerardRetire':{
   const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i<0)break;
   if(ids[0]==='life'&&s.players[p].life.length){s.players[p].hand.push(s.players[p].life.shift());prompt(s,p,'選擇傑拉德 REST 登場的位置',Array.from({length:8},(_,i)=>({id:`${i<4?'front':'energy'}-${i%4}`,label:`${i<4?'前線':'能源線'} ${i%4+1}`})),{kind:'gerardReviveSlot',p,uid:e.uid});}
   if(ids[0]==='hand'&&s.players[p].hand.length>=2)prompt(s,p,'選擇 2 張手牌送場外',s.players[p].hand.map(x=>({id:x.uid,cardId:x.cardId,label:cardOf(x).name})),{kind:'gerardDiscard2',p,uid:e.uid},2,2);
   break;
  }
  case 'gerardReviveSlot':{const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i<0)break;const card=s.players[p].outside.splice(i,1)[0],[line,slot]=ids[0].split('-');place(s,p,card,line,Number(slot));locate(s,card.uid).card.ready=false;if(!s.players[p].life.length)s.queue.unshift({kind:'lifeCheck',p});break;}
  case 'gerardDiscard2':{for(const uid of ids)moveDiscard(s,p,uid);const i=s.players[p].outside.findIndex(x=>x.uid===e.uid);if(i>=0)s.players[p].hand.push(s.players[p].outside.splice(i,1)[0]);break;}
  case 'sacrificeOther':{
   if(ids.length){const loc=locate(s,ids[0]),d=cardOf(loc.card),oldBp=bp(s,loc.card),en=d.energy;takeField(s,ids[0],e.rule.destination||'outside');if(e.rule.buffSourceIfSacrificeEnergyMin&&en>=e.rule.buffSourceIfSacrificeEnergyMin)addBuff(s,e.uid,1000,'nextTurn');if(e.rule.impactSourceIfSacrificeEnergyMin&&en>=e.rule.impactSourceIfSacrificeEnergyMin){const self=locate(s,e.uid)?.card;if(self)self.impactTurn=s.turn;}const next=(e.rule.then||[]).map(r=>r.bpMaxSacrifice?{...r,bpMax:oldBp}:r.bpMaxEnergyMultiply?{...r,bpMax:en*r.bpMaxEnergyMultiply}:r.keywordIfEnergyMin&&en<r.keywordIfEnergyMin?null:r).filter(Boolean);queueRules(s,p,e.uid,next,true);}break;
  }
  case 'aizenRestTwo':{
   for(const uid of ids){const l=locate(s,uid);if(l)l.card.ready=false;}
   const l=locate(s,e.uid);if(l){prompt(s,p,'選擇藍染移至前線的位置',Array.from({length:4},(_,i)=>({id:String(i),label:`前線 ${i+1}`})),{kind:'aizenFrontSlot',p,uid:e.uid});}break;
  }
  case 'aizenFrontSlot':{
   const l=locate(s,e.uid);if(l?.line!=='energy')break;const slot=Number(ids[0]);s.players[p].energy[l.slot]=null;
   if(s.players[p].front[slot])takeField(s,s.players[p].front[slot].uid,'removed');s.players[p].front[slot]=l.card;break;
  }
  case 'splitTop':{
    let outsideHigh=false;for(const uid of ids){const i=s.inspecting.findIndex(x=>x.card.uid===uid);if(i>=0){const x=s.inspecting.splice(i,1)[0].card; if(e.rule.selectDest==='bottom')s.players[p].deck.push(x);else {s.players[p].outside.push(plain(x));if(cardOf(x).energy>=3)outsideHigh=true;}}}
    if(outsideHigh&&e.rule.drawIfOutsideEnergy3)draw(s,p,1);
    const rem=(s.inspecting||[]).filter(x=>x.p===p&&e.cards.includes(x.card.uid));
    if(rem.length)prompt(s,p,'依序選擇放回牌庫頂的卡',rem.map(x=>({id:x.card.uid,cardId:x.card.cardId,label:cardOf(x.card).name})),{kind:'splitOrder',p,remaining:rem.map(x=>x.card.uid),placed:0});
    break;
  }
  case 'splitOrder':{
    const i=s.inspecting.findIndex(x=>x.card.uid===ids[0]);if(i<0)break;const x=s.inspecting.splice(i,1)[0];s.players[p].deck.splice(e.placed,0,x.card);
    const rest=e.remaining.filter(uid=>uid!==ids[0]);if(rest.length)prompt(s,p,'選擇下一張放回牌庫頂的卡',rest.map(uid=>{const c=s.inspecting.find(x=>x.card.uid===uid).card;return {id:uid,cardId:c.cardId,label:cardOf(c).name};}),{...e,remaining:rest,placed:e.placed+1});
    break;
  }
  case 'moveAcrossPick':{
    if(!ids.length)break;const l=locate(s,ids[0]);if(!l)break;const line=l.line==='energy'?'front':'energy';
    prompt(s,p,'選擇移動目的地',Array.from({length:4},(_,slot)=>({id:String(slot),label:`${line==='front'?'前線':'能源線'} ${slot+1}${s.players[p][line][slot]?'（目前有卡，該卡除外）':''}`})),{kind:'moveAcrossSlot',p,uid:ids[0],line});break;
  }
  case 'moveAcrossSlot':{
    const l=locate(s,e.uid);if(!l||l.line==='front'&&!mayMoveToEnergy(l.card))break;const slot=Number(ids[0]);s.players[p][l.line][l.slot]=null;
    if(s.players[p][e.line][slot])takeField(s,s.players[p][e.line][slot].uid,'removed');
    s.players[p][e.line][slot]=l.card;break;
  }
  case 'silenceChoice':{if(ids.length){const l=locate(s,ids[0]);if(l){l.card.silencedUntilSource={p,turnCount:s.players[p].turnCount+1};}}break;}
  case 'restToRecoverAp':if(ids.length){const l=locate(s,ids[0]);if(l?.card.ready){l.card.ready=false;s.players[p].ap=Math.min(s.players[p].maxAp,s.players[p].ap+1);}}break;
  case 'optionalPayAp':if(ids[0]==='yes'){if(e.rule.groupOnce){s.groupUsed ||= {};s.groupUsed[`${p}:${e.rule.groupOnce}`]=s.turn;}s.players[p].ap-=e.rule.amount;if(cardOf(locate(s,e.uid)?.card||{cardId:e.uid}).color==='purple')s.players[p].purpleApPaidTurn=s.turn;queueRules(s,p,e.uid,e.rule.then,true);}break;
  case 'restToBuff':if(ids.length){addBuff(s,ids[0],1000);const l=locate(s,ids[0]);if(l&&cardOf(l.card).ap>=2&&s.players[p].hand.length)prompt(s,p,'可棄 1 張手牌，將所選角色轉為 ACTIVE',s.players[p].hand.map(x=>({id:x.uid,cardId:x.cardId,label:cardOf(x).name})),{kind:'restBuffDiscard',p,target:ids[0]},0); }break;
  case 'restBuffDiscard':if(ids.length){moveDiscard(s,p,ids[0]);const l=locate(s,e.target);if(l)activate(s,l.card);}break;
  case 'onRaidedRukia':if(ids[0]==='top')queueRules(s,p,e.uid,[{op:'peekTop',count:1,destinations:['top','outside']}],true);else queueRules(s,p,e.uid,[{op:'keyword',target:'own',name:'朽木露琪亞',key:'noBlockHigh',optional:true}],true);break;
  case 'sacrificeBuff':if(ids.length)prompt(s,p,'選擇 Impact +1 或 Damage +1',[{id:'impact',label:'Impact +1'},{id:'damage',label:'Damage +1'}],{kind:'sacrificeBuffMode',p,uid:e.uid,target:ids[0]});break;
  case 'sacrificeBuffMode':{const l=locate(s,e.target);if(l){if(ids[0]==='impact'){l.card.impactBonusTurn=s.turn;l.card.impactBonusAmount=(l.card.impactBonusAmount||0)+1;}else l.card.damageTurn=s.turn;}break;}
  case 'ruleChoice':if(e.rule.op==='discard'){for(const uid of ids)moveDiscard(s,p,uid,'hand',e.uid);if(ids.length)queueRules(s,p,e.uid,e.rule.then,true);}else {for(const uid of ids)applyRuleTarget(s,uid,e.rule,p);if(ids.length&&e.rule.then){for(const t of e.rule.then.filter(t=>t.target==='chosen'))for(const uid of ids)if(!t.when||condition(s,p,e.uid,t.when))applyRuleTarget(s,uid,t,p);queueRules(s,p,e.uid,e.rule.then.filter(t=>t.target!=='chosen'),true);}}break;
  case 'lookTake':finishLook(s,e,ids);break;
  case 'lookPickOutside':{for(const uid of ids){const i=s.inspecting.findIndex(x=>x.card.uid===uid);if(i>=0)s.players[p].outside.push(plain(s.inspecting.splice(i,1)[0].card));}const o=e.original;finishLook(s,{...o,rule:{...o.rule,thenOutsideCount:0}},[]);break;}
  case 'lookOrder':{const i=s.inspecting.findIndex(x=>x.card.uid===ids[0]),x=s.inspecting.splice(i,1)[0];
   if(e.rule.rest==='top'){s.players[p].deck.splice(e.placed||0,0,x.card);}else if(e.rule.rest==='outside')s.players[p].outside.push(plain(x.card));else s.players[p].deck.push(x.card);
   const remainder=remainingInspected(s,p,e.cards);
   if(remainder.length)prompt(s,p,`依序選擇${e.rule.rest==='outside'?'送至場外':`放到牌庫${e.rule.rest==='top'?'頂':'底'}`}的卡`,remainder.map(x=>({id:x.card.uid,label:cardOf(x.card).name,cardId:x.card.cardId})),{...e,placed:(e.placed||0)+1});
   else if(e.taken&&e.rule.afterPick)queueRules(s,p,e.originalUid,e.rule.afterPick,true);break;
  }
  case 'chooseMode':queueRules(s,p,e.uid,e.rule.modes[Number(ids[0])].rules,true);break;
  case 'opponentDiscard':moveDiscard(s,p,ids[0]);break;
  case 'optionalMill':{if(ids[0]==='yes'){const r=e.rule,cards=s.players[p].deck.splice(0,r.count);s.players[p].outside.push(...cards.map(plain));if(r.then)queueRules(s,p,e.uid,r.then,true);}break;}
  case 'discardHand':{if(ids.length===e.rule.count){for(const uid of ids){if(e.rule.remove){const i=s.players[p].hand.findIndex(c=>c.uid===uid);if(i>=0)s.players[p].removed.push(s.players[p].hand.splice(i,1)[0]);}else moveDiscard(s,p,uid,'hand',e.uid);}queueRules(s,p,e.uid,e.rule.then,true);}break;}
  case 'deployCard':{if(!ids.length)break;const zone=e.rule.zone,c=s.players[p][zone].find(c=>c.uid===ids[0]);const lines=e.rule.line?[e.rule.line]:(cardOf(c).type==='field'?['energy']:['energy','front']);prompt(s,p,'選擇登場位置',lines.flatMap(line=>Array.from({length:4},(_,slot)=>({id:line+'-'+slot,label:(line==='front'?'前線':'能源線')+' '+(slot+1),line,slot}))),{...e,kind:'deploySlot',cardUid:c.uid});break;}
  case 'deploySlot':{const zone=e.rule.zone,from=s.players[p][zone],i=from.findIndex(c=>c.uid===e.cardUid);if(i<0)break;const c=from.splice(i,1)[0];c.deployedByOwnEffect=true;place(s,p,c,chosen[0].line,chosen[0].slot);locate(s,c.uid).card.ready=!!e.rule.active;break;}
  case 'recoverOutside':{if(ids.length){const i=s.players[p].outside.findIndex(c=>c.uid===ids[0]);s.players[p].hand.push(s.players[p].outside.splice(i,1)[0]);}break;}
  case 'removeOutside':{
   for(const uid of ids){const i=s.players[p].outside.findIndex(c=>c.uid===uid);if(i>=0)s.players[p].removed.push(s.players[p].outside.splice(i,1)[0]);}
   if(ids.length===e.rule.count)queueRules(s,p,e.uid,e.rule.then,true);
   break;}
  case 'peekChoice':{const owner=e.rule.deckOwner==='opponent'?1-p:p,deck=s.players[owner].deck,card=deck.find(x=>x.uid===e.cards[0]),dest=ids[0];if(!card)break;
   const i=deck.findIndex(c=>c.uid===card.uid);deck.splice(i,1);
   if(dest==='top')deck.unshift(card);else if(dest==='hand')s.players[p].hand.push(card);else if(dest==='bottom')deck.push(card);else if(dest==='outside')s.players[owner].outside.push(plain(card));break;}
  case 'peekNoMill':break;
  case 'peekMill':{const deck=s.players[p].deck;
   for(const uid of ids){const i=deck.findIndex(c=>c.uid===uid);if(i>=0){
    const moved=deck.splice(i,1)[0];s.players[p].outside.push(plain(moved));
    // Sideline is public; the looked-at cards that remain in the deck must stay private.
    log(s,`${s.players[p].name}將${cardOf(moved).name}從牌庫頂送至場外。`,'effect');
   }}
   const remain=e.cards.filter(uid=>!ids.includes(uid)&&deck.some(c=>c.uid===uid));
   if(remain.length>1)prompt(s,p,'依序選擇要放回牌堆頂的卡',remain.map(uid=>{const c=deck.find(x=>x.uid===uid);return {id:uid,cardId:c.cardId,label:cardOf(c).name};}),{kind:'peekOrder',p,uids:remain,chosen:[]});break;}
  case 'peekOrder':{const order=[...(e.chosen||[]),ids[0]],remain=e.uids.filter(uid=>!order.includes(uid)),deck=s.players[p].deck;
   if(remain.length>1)prompt(s,p,'選擇下一張放回牌堆頂的卡',remain.map(uid=>{const c=deck.find(x=>x.uid===uid);return {id:uid,cardId:c.cardId,label:cardOf(c).name};}),{...e,chosen:order});
   else {const finalOrder=[...order,...remain],pulled=finalOrder.map(uid=>{const i=deck.findIndex(c=>c.uid===uid);return deck.splice(i,1)[0];});deck.unshift(...pulled);}
   break;}
  case 'triggerOrder':s.queue.unshift({kind:'trigger',p,uid:ids[0]},{kind:'triggerOrder',p,uids:e.uids.filter(uid=>uid!==ids[0])});break;
  case 'discard':{moveDiscard(s,p,ids[0],'hand',e.uid);break;}
  case 'bounce':takeField(s,ids[0],'hand');break;
  case 'buff':if(ids.length)addBuff(s,ids[0],e.amount);break;
  case 'activeBuff':{const l=locate(s,ids[0]);if(l){activate(s,l.card);addBuff(s,ids[0],3000);}break;}
  case 'destroy':if(ids.length)shieldOrRetire(s,ids[0],p);break;
  case 'recoverAp':{const n=Number(ids[0]);s.players[p].ap=Math.min(s.players[p].maxAp,s.players[p].ap+n);log(s,`${s.players[p].name}回復 ${n} AP。`,'effect');break;}
  case 'removeDraw':{
   for(const uid of ids){const i=s.players[p].outside.findIndex(c=>c.uid===uid);s.players[p].removed.push(s.players[p].outside.splice(i,1)[0]);}
   if(ids.length)log(s,`${s.players[p].name}將場外 ${ids.length} 張牌除外。`,'effect');
   if(ids.length===e.count){draw(s,p,e.draw);if(e.impactUid){const l=locate(s,e.impactUid);if(l){l.card.impactTurn=s.turn;log(s,'一護本回合獲得 IMPACT 1。','effect');}}}
   else if(ids.length)log(s,'移動數量不足，沒有抽牌或額外能力。');break;
  }
  case 'triggerChoice':{
   const c=s.revealed.find(x=>x.card.uid===e.uid)?.card,d=cardOf(c),choice=chosen[0];
   s.triggerHistory ||= [];
   let publicTrigger=s.triggerHistory.findLast(x=>x.uid===e.uid&&x.player===p&&x.outcome==='pending');
   // Resume older saves that were paused on an already-public life card.
   if(!publicTrigger){publicTrigger={uid:e.uid,player:p,turn:s.turn,cardId:c.cardId,trigger:d.trigger||null};s.triggerHistory.push(publicTrigger);if(s.triggerHistory.length>60)s.triggerHistory.shift();}
   publicTrigger.outcome=choice.id==='skip'?'skipped':choice.id==='get'||d.trigger==='get'?'get':choice.action?'raid':'activated';
   if(choice.id==='skip'){finishReveal(s,p,e.uid);log(s,`${s.players[p].name}不發動 Trigger。`);}
   else if(choice.id==='get'||d.trigger==='get'){s.players[p].triggerUsedTurn=s.turn;finishReveal(s,p,e.uid,'hand');log(s,`${d.name}加入手牌。`,'effect');}
   else if(choice.action){s.players[p].triggerUsedTurn=s.turn;finishReveal(s,p,e.uid,null);place(s,p,c,choice.action.line,choice.action.slot,{raidTarget:choice.action.target});}
   else{
    s.players[p].triggerUsedTurn=s.turn;
    if(d.trigger==='draw')s.queue.unshift({kind:'draw',p,count:1},{kind:'finishReveal',p,uid:e.uid});
    if(d.trigger==='active'||d.trigger==='special')s.queue.unshift({kind:d.trigger,p},{kind:'finishReveal',p,uid:e.uid});
    if(d.trigger==='color'){const r=d.rules.color;if(r.zone)s.queue.unshift({kind:'colorDeploy',p,rule:r},{kind:'finishReveal',p,uid:e.uid});else s.queue.unshift({kind:'rule',p,uid:e.uid,rule:{...r,fromTrigger:true}},{kind:'finishReveal',p,uid:e.uid});}
    if(d.trigger==='final'){
     if(!s.players[p].life.length&&s.players[p].deck.length){s.players[p].life.push(s.players[p].deck.shift());log(s,'FINAL：從牌堆頂補回 1 張生命。','effect');}
     finishReveal(s,p,e.uid);
    }
   }break;
  }
  case 'block':{
   const attack=locate(s,e.uid);if(!attack)break;
   if(ids[0]==='pass'){damage(s,1-p,damageOf(s,attack.card));}
   else{
    const block=locate(s,ids[0]);block.card.ready=false;s.combat.blocker=block.card.uid;queueRules(s,1-p,block.card.uid,cardOf(block.card).rules?.block,true);pump(s);
    if(!silenced(s,block.card)&&cardOf(block.card).doubleBlock&&block.card.blockTurn!==s.turn){block.card.blockTurn=s.turn;activate(s,block.card);log(s,`${cardOf(block.card).name}第一次阻擋，立即轉為 ACTIVE。`,'effect');}
    const abp=bp(s,attack.card),bbp=bp(s,block.card);
    log(s,`${cardOf(attack.card).name} ${abp} BP 對 ${cardOf(block.card).name} ${bbp} BP。`,'battle');
    if(abp>=bbp){
     const pendingShield=shieldOrRetire(s,block.card.uid,p,{after:'combat',attackerUid:attack.card.uid,
      dest:cardOf(attack.card).rules?.battleRemove&&s.active===p?'removed':'outside'});
     // shieldOrRetire already retires normal targets: battle winner still gets IMPACT.
     if(!pendingShield){
      const atkRules=cardOf(attack.card).rules;
      if(atkRules?.raidWinReadyGroup&&isRaided(attack.card)){
       s.groupUsed||={};const group=`${p}:${atkRules.raidWinReadyGroup}`;
       if(s.groupUsed[group]!==s.turn){s.groupUsed[group]=s.turn;activate(s,attack.card);}
      }
      const nullImpact=printedRuleActive(s,block.card,'impactNull');
      if(impactOf(s,attack.card)&&!nullImpact){const n=impactOf(s,attack.card);log(s,`IMPACT ${n}：穿透阻擋，造成 ${n} 點生命傷害。`,'effect');s.queue.push({kind:'impactDamage',p:1-p,count:n});}
      if(attack.card.winDrawTurn===s.turn)s.queue.push({kind:'draw',p,count:1});
     }
     else break;
    }
    else log(s,'阻擋成功，双方角色都留在場上。','battle');
   }
   s.queue.push({kind:'endCombat',p},{kind:'postCombat',p,uid:e.uid});break;
  }
 }
 stateCheck(s);pump(s);
}
export function dispatch(source,action,actor=controller(source)){
 if(actor!==controller(source))throw new Error('現在輪到另一位玩家操作。');
 if(source.status==='finished')throw new Error('對局已結束。');
 const s=structuredClone(source);
 if(s.pending){if(action.type!=='choose')throw new Error('請先完成目前的效果選擇。');resolveChoice(s,action.ids);return s;}
 if(!legalActions(s).some(a=>sameAction(a,action)))throw new Error('目前不能執行這個操作。');
 const p=controller(s),pl=s.players[p];
 switch(action.type){
  case 'redraw':{const old=pl.hand;pl.hand=pl.deck.splice(0,7);pl.deck.push(...old);shuffle(s,pl.deck);pl.redrawn=true;log(s,`${pl.name}重抽 7 張，再將原手牌混回牌堆。`);break;}
  case 'keep':pl.kept=true;log(s,`${pl.name}保留起手。`);if(s.players.every(x=>x.kept))finishMulligans(s);else s.mulliganPlayer=1-p;break;
  case 'extraDraw':pl.ap--;s.extraDrawn=true;draw(s,p,1);log(s,`${pl.name}花費 1 AP 進行額外抽牌。`);break;
  case 'move':{const l=locate(s,action.uid);pl.energy[l.slot]=null;if(pl.front[action.slot])takeField(s,pl.front[action.slot].uid,'removed');pl.front[action.slot]=l.card;log(s,`${cardOf(l.card).name}移到前線 ${action.slot+1}。`);break;}
  case 'step':{const l=locate(s,action.uid);pl.front[l.slot]=null;if(pl.energy[action.slot])takeField(s,pl.energy[action.slot].uid,'removed');pl.energy[action.slot]=l.card;log(s,`${cardOf(l.card).name}使用 STEP 移到能源線 ${action.slot+1}。`);break;}
  case 'play':case 'raid':{
   const i=pl.hand.findIndex(c=>c.uid===action.uid),c=pl.hand.splice(i,1)[0];const paid=needAp(s,p,cardOf(c),{raid:action.type==='raid'});pl.ap-=paid;if(cardOf(c).name==='阿散井戀次'&&paid===0)pl.paidPurpleWithoutApRenjiTurn=s.turn;if(pl.nextApDiscount?.turn===s.turn&&cardOf(c).type==='character'&&(!pl.nextApDiscount.trait&&!pl.nextApDiscount.names||pl.nextApDiscount.trait&&traitsOf(c).some(t=>t.includes(pl.nextApDiscount.trait))||pl.nextApDiscount.names?.some(n=>cardOf(c).name.includes(n))))pl.nextApDiscount=null;
   if(cardOf(c).type==='event'){log(s,`${pl.name}使用${cardOf(c).name}。`,'play');(pl.turnEvents??=[]).push(cardOf(c).name);queueEvent(s,p,c);}
   else place(s,p,c,action.line,action.slot,{raidTarget:action.type==='raid'?action.target:null});pump(s);break;
  }
  case 'handAbility':{
   const card=pl.hand.find(c=>c.uid===action.uid),r=cardOf(card).rules;
   if(r?.handAbility!=='uryu')break;
   pl.ap--;s.groupUsed||={};s.groupUsed[`${p}:handUryu`]=s.turn;
   for(const c of pl.removed.filter(x=>matchingName(x,'黑崎一護')).slice(0,4)){
    const i=pl.removed.findIndex(x=>x.uid===c.uid);pl.outside.push(pl.removed.splice(i,1)[0]);
   }
   prompt(s,p,'從手牌以 ACTIVE 登場石田雨龍：選擇前線位置',Array.from({length:4},(_,i)=>({id:String(i),label:`前線 ${i+1}`})),{kind:'uryuFromHandSlot',p,uid:card.uid});break;
  }
  case 'ability':{
   const l=locate(s,action.uid),c=l.card;const defs=cardOf(c).rules||{},a=defs.abilities?defs.abilities[action.abilityIndex]:defs.ability;if(defs.abilities){c.usedAbilities||={};c.usedAbilities[action.abilityIndex]=s.turn;}else c.usedTurn=s.turn;if(a?.groupOnce){s.groupUsed ||= {};s.groupUsed[`${p}:${a.groupOnce}`]=s.turn;}log(s,`${pl.name}發動${cardOf(c).name}的能力。`,'effect');
   if(c.cardId==='042'){c.ready=false;c.energyBoostTurn=s.turn;c.sacrificeTurn=s.turn;}
   if(c.cardId==='046')s.queue.push({kind:'renjiMill',p,uid:c.uid});
   if(c.cardId==='104'&&isRaided(c)&&!silenced(s,c))s.queue.push({kind:'removeDraw',p,count:4,draw:1,optional:false,impactUid:c.uid});
   if(c.cardId==='108'){c.ready=false;takeField(s,c.uid);s.queue.push({kind:'drawDiscard',p,count:2});}
   if(a&&!silenced(s,c)&&ruleEnabled(s,p,c,a)){if(a.rest)c.ready=false;if(a.ap){pl.ap-=a.ap;if(cardOf(c).color==='purple')pl.purpleApPaidTurn=s.turn;}if(a.sacrifice)takeField(s,c.uid);if(a.discardFilter)s.queue.push({kind:'rule',p,uid:c.uid,rule:{op:'discardHand',count:1,filter:a.discardFilter,then:a.effects}});else if(a.discard)s.queue.push({kind:'rule',p,uid:c.uid,rule:{op:'discard',count:a.discard,then:a.effects}});else queueRules(s,p,c.uid,a.effects);}
   pump(s);break;
  }
  case 'attack':{
   const l=locate(s,action.uid);if(l.card.sniperTurn===s.turn&&l.card.attackTurn!==s.turn)l.card.sniperImpactActive=true;l.card.ready=false;if(l.card.cardId==='103')addBuff(s,l.card.uid,1000);if((!silenced(s,l.card)&&cardOf(l.card).rules?.doubleAttack||l.card.doubleAttackTurn===s.turn)&&l.card.attackTurn!==s.turn){l.card.ready=true;}l.card.attackTurn=s.turn;
   s.combat={attacker:l.card.uid,blocker:null};log(s,`${pl.name}以${cardOf(l.card).name}宣告攻擊。`,'attack');if(raidBoxEnabled(l.card,'attack'))queueRules(s,p,l.card.uid,cardOf(l.card).rules?.attack);if(l.card.attackDrawTurn===s.turn)s.queue.push({kind:'rule',p,uid:l.card.uid,rule:{op:'draw',count:1,optional:true}});s.queue.push({kind:'block',p,uid:l.card.uid});pump(s);break;
  }
  case 'snipe':{
   const l=locate(s,action.uid);l.card.ready=false;l.card.sniperImpactActive=true;l.card.attackTurn=s.turn;
   s.combat={attacker:l.card.uid,blocker:action.target,sniper:true};
   log(s,`${pl.name}以${cardOf(l.card).name}狙擊敵方前線角色。`,'attack');
   if(raidBoxEnabled(l.card,'attack'))queueRules(s,p,l.card.uid,cardOf(l.card).rules?.attack);
   s.queue.push({kind:'snipeBattle',p,uid:l.card.uid,target:action.target});pump(s);break;
  }
  case 'next':{
   if(s.phase==='start')s.phase='move';else if(s.phase==='move')s.phase='main';
   else if(s.phase==='main'){for(const c of [...allField(s,p)])if(c.sacrificeTurn===s.turn)takeField(s,c.uid);s.phase='attack';for(const c of [...pl.energy])if(c?.frontOnAttackTurn===s.turn){const free=pl.front.findIndex(x=>!x);if(free>=0){const l=locate(s,c.uid);if(l){pl.energy[l.slot]=null;pl.front[free]=c;}}}}
   else if(s.phase==='attack'){
    s.phase='end';for(const c of pl.front.filter(Boolean))if(raidBoxEnabled(c,'attackPhaseEnd'))queueRules(s,p,c.uid,cardOf(c).rules?.attackPhaseEnd);
    s.queue.push({kind:'endTurn',p});pump(s);
   }
   stateCheck(s);break;
  }
 }
 if(s.status==='playing'&&!s.pending)pump(s);
 return s;
}
export function assertState(s){
 for(let p=0;p<2;p++){
  const pl=s.players[p];if(pl.front.length!==4||pl.energy.length!==4||pl.ap<0||pl.ap>pl.maxAp)throw new Error('區域或 AP 狀態無效');
  const cards=[...pl.deck,...pl.hand,...pl.life,...pl.outside,...pl.removed,...(s.inspecting||[]).filter(x=>x.p===p).map(x=>x.card),...allField(s,p).flatMap(c=>flattenStack(c).flatMap(x=>[x,...(x.under||[])])),...s.revealed.filter(x=>x.p===p).map(x=>x.card),...s.resolving.filter(x=>x.p===p).map(x=>x.card)];
  if(cards.length!==50||new Set(cards.map(c=>c.uid)).size!==50||cards.some(c=>!BY_ID[c.cardId]))throw new Error(`玩家 ${p} 卡片守恆失敗：${cards.length}`);
  if(pl.front.some(c=>c&&cardOf(c).type!=='character'))throw new Error('前線只能放角色');
 }
 return true;
}

function value(s,c){const d=cardOf(c);return (d.bp||0)/1000+d.gen+(d.id==='104'?2:0)+(d.id==='064'?2:0);}
export function botAction(s){
 const p=controller(s),pl=s.players[p];
 if(s.pending){
  const q=s.pending,e=q.effect;let opts=[...q.choices];
  if(e.kind==='discard')opts.sort((a,b)=>{const ca=pl.hand.find(x=>x.uid===a.id),cb=pl.hand.find(x=>x.uid===b.id);const va=value(s,ca)+(cardOf(ca).energy===0&&energy(s,p)<3?5:0),vb=value(s,cb)+(cardOf(cb).energy===0&&energy(s,p)<3?5:0);return va-vb;});
  else if(e.kind==='removeDraw'){
   if(e.optional&&q.max<e.count)return {type:'choose',ids:[]};
  }else if(e.kind==='block'){
   const a=locate(s,e.uid),ap=bp(s,a.card);opts=opts.filter(c=>c.id!=='pass');
   opts.sort((a,b)=>{const ac=locate(s,a.id).card,bc=locate(s,b.id).card;const score=c=>bp(s,c)>ap?100-bp(s,c)/1000:pl.life.length<=2?20:cardOf(c).energy<2?8:0;return score(bc)-score(ac);});
   if(!opts.length||bp(s,locate(s,opts[0].id).card)<=ap&&pl.life.length>3&&cardOf(locate(s,opts[0].id).card).energy>=2)return {type:'choose',ids:['pass']};
  }else if(e.kind==='triggerChoice'){
   const raid=opts.find(c=>c.action?.line==='front'&&!s.players[p].front[c.action.slot]);return {type:'choose',ids:[raid?.id??opts.find(c=>c.id==='activate'||c.id==='get')?.id??'skip']};
  }else if(e.kind==='recoverAp')opts.sort((a,b)=>Number(b.id)-Number(a.id));
  else if(e.kind==='buff'||e.kind==='destroy'||e.kind==='activeBuff')opts.sort((a,b)=>{
   const score=c=>{const l=locate(s,c.id);return value(s,l.card)+(l.line==='front'?4:0)+(e.kind==='activeBuff'&&!l.card.ready?3:0);};return score(b)-score(a);
  });
  else if(e.kind==='bounce')opts.sort((a,b)=>value(s,locate(s,a.id).card)-value(s,locate(s,b.id).card));
  return {type:'choose',ids:opts.slice(0,q.max).map(c=>c.id)};
 }
 const actions=legalActions(s);
 if(s.status==='mulligan'){const zeros=pl.hand.filter(c=>cardOf(c).energy===0).length;return !zeros&&!pl.redrawn?{type:'redraw'}:{type:'keep'};}
 const scored=actions.map(a=>{
  let v=-10;
  if(a.type==='next')v=0;
  if(a.type==='extraDraw')v=pl.hand.length<3&&pl.ap>1?5:-5;
  if(a.type==='move'){
   const c=locate(s,a.uid).card,d=cardOf(c),remaining=energy(s,p)-generated(s,c),maxNeed=pl.hand.reduce((n,h)=>Math.max(n,cardOf(h).energy),0);
   v=s.players[p].front[a.slot]?-20:d.bp>=3000&&remaining>=Math.min(maxNeed,4)?5:d.bp>=1500&&remaining>=4?3:-5;
  }
  if(a.type==='attack')v=5+bp(s,locate(s,a.uid).card)/1000;
  if(a.type==='ability'){
   const c=locate(s,a.uid).card;v=c.cardId==='104'&&pl.outside.length>=4?7:c.cardId==='046'&&pl.deck.length?4:c.cardId==='108'&&pl.hand.length<4?2:-5;
   if(c.cardId==='042'&&pl.hand.some(h=>cardOf(h).energy===energy(s,p)+1&&cardOf(h).ap<=pl.ap))v=5;
  }
  if(a.type==='play'||a.type==='raid'){
   const c=pl.hand.find(c=>c.uid===a.uid),d=cardOf(c);v=2+value(s,c);
   if(d.type==='event')v=d.id==='066'?pl.ap<pl.maxAp?8:1:d.id==='064'?7:d.id==='062'?4:pl.hand.length<4?4:1;
   else if(a.type==='raid'){v=12+(a.line==='front'?4:0);if(s.players[p][a.line][a.slot]&&s.players[p][a.line][a.slot].uid!==a.target)v=-10;}
   else {
    const occupied=pl[a.line][a.slot];if(occupied)v=-8;
    else if(a.line==='energy')v+=(energy(s,p)<5?4:0)+(d.gen>1?2:0)-(d.bp>=4000?4:0);
    else v+=(d.bp>=3000?4:energy(s,p)>=4?1:-5);
    if(d.id==='035'&&!characters(s,p).some(x=>cardOf(x).energy<=1))v=-15;
    if(d.id==='108'&&energy(s,p)>=5)v-=3;
   }
  }
  return {a,v};
 });
 scored.sort((a,b)=>b.v-a.v);return scored[0]?.a;
}
