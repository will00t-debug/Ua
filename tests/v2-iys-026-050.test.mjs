import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {inspectedPendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalEnergyByColor,
 zoneRequiredEnergy, universalImpact, universalImpactNull, universalPrivateChoices,
 universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createIysV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function bury(s,p,card){
 const under=s.players[p].deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify(legalUniversalActions(packs,s).slice(0,6)));
 return use(s,action);
}
function legal(s,pred){return legalUniversalActions(packs,s).some(pred);}
function payPurple(s){
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
}
function payRed(s){
 put(s,0,'IYS-1-041','energy',0);
 put(s,0,'IYS-1-045','energy',1);
 put(s,0,'IYS-1-062','energy',2);
}
function crown(s,p,id){
 const card=take(s,p,id);
 s.players[p].life.unshift(card);
 return card;
}
function onlyLife(s,p,id){
 const card=take(s,p,id);
 const old=s.players[p].life.splice(0);
 s.players[p].deck.push(...old);
 s.players[p].life.unshift(card);
 return card;
}
function topDeck(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.slice().reverse())s.players[p].deck.unshift(card);
 return cards;
}
function passTo(s,player,phase){
 const startTurn=s.turn,startActive=s.active,startPhase=s.phase;
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&(s.turn>startTurn||s.active!==startActive||s.phase!==startPhase))){
  if(s.pending?.kind==='end-hand-limit')s=choose(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('Turn blocked by '+s.pending.kind+' '+(s.pending.step||''));
  else s=use(s,{type:'next'});
  if(++guard>40)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function purple(s,p=0){return universalEnergyByColor(pack,s,p).purple||0;}
function host028(s,slot,baseId,underIds,line='front'){
 const host=put(s,0,'IYS-1-028',line,slot);
 const base=take(s,0,baseId);
 host.stack=[base];
 const under=underIds.map(id=>{const card=take(s,0,id);card.faceDown=true;return card;});
 host.under=under;
 return {host,base,under};
}
function fillLine(s,line,ids){
 let i=0;
 for(let slot=0;slot<4;slot++){
  if(s.players[0][line][slot])continue;
  if(i>=ids.length)throw Error('Need a card for '+line+' '+slot);
  put(s,0,ids[i++],line,slot);
 }
}
function onto(s,uid,occupantUid,type='play'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  a.replaceUid===occupantUid);
 if(!action)throw Error('No '+type+' onto '+occupantUid+' '+
  JSON.stringify(legalUniversalActions(packs,s).filter(a=>a.uid===uid).slice(0,4)));
 return action;
}
function roundTrip(s){
 const next=JSON.parse(JSON.stringify(s));
 assertUniversalMatch(packs,next);
 return next;
}
function moved(s,uid,to){return s.zoneMoveEvents.filter(e=>e.uid===uid&&e.to===to);}
function facedown(s,owner,host){
 const mine=universalPublicView(packs,s,owner);
 const theirs=universalPublicView(packs,s,1-owner);
 const side=view=>[...view.players[owner].front,...view.players[owner].energy].find(c=>c?.uid===host.uid);
 return {mine:side(mine).underLayers,theirs:side(theirs).underLayers};
}

test('IYS-1-026 counts only direct facedowns, and the color trigger deploys 013 from outside',()=>{
 const counts=countsFor(['IYS-1-026','IYS-1-025','IYS-1-029','IYS-1-013','IYS-1-004','IYS-1-001','IYS-1-047']);
 let s=toPhase(fresh(counts,2601),'main');
 const naraku=put(s,0,'IYS-1-026','front',0);
 assert.equal(universalImpactNull(pack,s,naraku),false);
 assert.equal(universalBp(pack,s,naraku),3000);
 const base=take(s,0,'IYS-1-025');
 base.faceDown=false;
 naraku.stack=[base];
 assert.equal(universalImpactNull(pack,s,naraku),false);
 assert.equal(universalBp(pack,s,naraku),3000);
 const hidden=take(s,0,'IYS-1-029');
 hidden.faceDown=true;
 naraku.under=[hidden];
 assert.equal(universalImpactNull(pack,s,naraku),true);
 assert.equal(universalBp(pack,s,naraku),4000);
 const view=facedown(s,0,naraku);
 assert.equal(view.mine[0].cardId,'IYS-1-029');
 assert.deepEqual(view.theirs[0],{faceDown:true});
 s=passTo(s,1,'main');
 const later=s.players[0].front.find(c=>c?.uid===naraku.uid);
 assert.equal(universalImpactNull(pack,s,later),true);
 assert.equal(universalBp(pack,s,later),3000);
 assertUniversalMatch(packs,s);

 let color=toPhase(fresh(counts,2602),'attack');
 const attacker=put(color,0,'IYS-1-047','front',0,true);
 const sess=put(color,1,'IYS-1-004','front',0,false);
 const recruit=take(color,1,'IYS-1-013');
 const heavy=take(color,1,'IYS-1-001');
 color.players[1].outside.push(recruit,heavy);
 const life=crown(color,1,'IYS-1-026');
 color=use(color,{type:'attack',uid:attacker.uid});
 color=choose(color,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(color.pending.kind,'life-trigger');
 assert.equal(color.pending.trigger,'color');
 assert.equal(legal(color,a=>a.mode==='colorOutside'&&a.uid===recruit.uid&&a.line==='front'),true);
 assert.equal(legal(color,a=>a.uid===heavy.uid),false);
 assert.equal(legal(color,a=>a.mode==='colorOutside'&&a.line==='energy'),false);
 color=choose(color,a=>a.mode==='skip');
 assert.equal(color.pending,null);
 assert.equal(color.players[1].outside.some(c=>c.uid===life.uid),true);
 assert.equal(color.players[1].outside.some(c=>c.uid===recruit.uid),true);
 assert.equal(color.players[1].front.find(c=>c?.uid===sess.uid).ready,false);

 let entered=toPhase(fresh(counts,2603),'attack');
 const swinger=put(entered,0,'IYS-1-047','front',0,true);
 const rested=put(entered,1,'IYS-1-004','front',0,false);
 const rin=take(entered,1,'IYS-1-013');
 entered.players[1].outside.push(rin);
 crown(entered,1,'IYS-1-026');
 entered=use(entered,{type:'attack',uid:swinger.uid});
 entered=choose(entered,a=>a.type==='chooseBlock'&&a.uid===null);
 entered=choose(entered,a=>a.mode==='colorOutside'&&a.uid===rin.uid&&a.line==='front');
 const body=entered.players[1].front.find(c=>c?.uid===rin.uid);
 assert.equal(body.ready,true);
 assert.equal(entered.pending.step,'activeName');
 entered=choose(entered,a=>a.mode==='pick'&&a.uid===rested.uid);
 assert.equal(entered.players[1].front.find(c=>c?.uid===rested.uid).ready,true);
 assert.equal(entered.players[1].front.find(c=>c?.uid===rin.uid).ready,true);
 assertUniversalMatch(packs,entered);
});

test('IYS-1-027 pays the printed order, and BP 0 leaves by the rule',()=>{
 const counts=countsFor(['IYS-1-027','IYS-1-029','IYS-1-042','IYS-1-048','IYS-1-047']);
 let skipped=toPhase(fresh(counts,2701),'main');
 const self=put(skipped,0,'IYS-1-027','front',0,false);
 put(skipped,0,'IYS-1-029','front',1);
 const front=put(skipped,1,'IYS-1-042','front',0);
 const energy=put(skipped,1,'IYS-1-047','energy',0);
 skipped=use(skipped,{type:'activate',uid:self.uid,mode:'iys:0'});
 assert.equal(skipped.pending.step,'debuffOptional');
 assert.equal(legal(skipped,a=>a.uid===front.uid),true);
 assert.equal(legal(skipped,a=>a.uid===energy.uid),false);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(universalBp(pack,skipped,skipped.players[1].front[0]),1500);
 const readySelf=skipped.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(readySelf.ready,true);
 assert.equal(universalImpact(pack,skipped,readySelf),1);
 assert.equal(skipped.pending.step,'retireNaraku');
 skipped=choose(skipped,a=>a.uid===skipped.players[0].front.find(c=>c?.cardId==='IYS-1-029').uid);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===self.uid),true);
 assertUniversalMatch(packs,skipped);

 let zero=toPhase(fresh(counts,2702),'main');
 const caster=put(zero,0,'IYS-1-027','front',0,false);
 const other=put(zero,0,'IYS-1-029','front',1);
 const frail=put(zero,1,'IYS-1-048','front',0);
 zero=use(zero,{type:'activate',uid:caster.uid,mode:'iys:0'});
 zero=choose(zero,a=>a.mode==='pick'&&a.uid===frail.uid);
 assert.equal(zero.pending.step,'retireNaraku');
 assert.equal(zero.players[1].front.some(c=>c?.uid===frail.uid),true);
 assert.equal(zero.players[1].outside.some(c=>c.uid===frail.uid),false);
 assert.equal(universalBp(pack,zero,zero.players[1].front.find(c=>c.uid===frail.uid))<=0,true);
 assert.equal(zero.players[0].front.find(c=>c?.uid===caster.uid).ready,true);
 assert.equal(universalImpact(pack,zero,zero.players[0].front.find(c=>c?.uid===caster.uid)),1);
 zero=choose(zero,a=>a.uid===other.uid);
 assert.equal(zero.players[1].front.some(c=>c?.uid===frail.uid),false);
 assert.equal(zero.players[1].outside.some(c=>c.uid===frail.uid),true);
 assert.equal(zero.players[1].removed.some(c=>c.uid===frail.uid),false);
 assert.equal(zero.zoneMoveEvents.filter(e=>e.uid===frail.uid&&e.to==='outside'&&e.reason==='retirement').length,1);
 assert.equal(zero.turnRetireEvents.filter(e=>e.uid===frail.uid).length,1);
 assertUniversalMatch(packs,zero);

 let alone=toPhase(fresh(counts,2703),'main');
 const only=put(alone,0,'IYS-1-027','front',0,false);
 alone=use(alone,{type:'activate',uid:only.uid,mode:'iys:0'});
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].outside.some(c=>c.uid===only.uid),true);
 assertUniversalMatch(packs,alone);
});

test('an open IYS-1-027 choice does not rule-retire, and the leave follow-up settles once',()=>{
 const counts=countsFor(['IYS-1-027','IYS-1-028','IYS-1-015','IYS-1-029','IYS-1-034','IYS-1-001','IYS-1-004']);
 let s=toPhase(fresh(counts,2715),'main');
 const caster=put(s,0,'IYS-1-027','front',0,false);
 const naraku=put(s,0,'IYS-1-028','front',1);
 const base=take(s,0,'IYS-1-029');
 naraku.stack=[base];
 const buried=['IYS-1-034','IYS-1-001','IYS-1-004'].map(id=>{
  const card=take(s,0,id);card.faceDown=true;return card;
 });
 naraku.under=buried;
 const frail=put(s,1,'IYS-1-015','front',0);
 const deck=s.players[1].deck.length;
 const hand=s.players[1].hand.length;
 s=use(s,{type:'activate',uid:caster.uid,mode:'iys:0'});
 s=choose(s,a=>a.mode==='pick'&&a.uid===frail.uid);
 assert.equal(s.pending.step,'retireNaraku');
 assert.equal(s.players[1].front.some(c=>c?.uid===frail.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===frail.uid),false);
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(s.players[1].hand.length,hand);
 s=choose(s,a=>a.uid===naraku.uid);
 assert.equal(s.pending.step,'leave');
 assert.equal(s.players[1].front.some(c=>c?.uid===frail.uid),true);
 assert.equal(s.players[1].deck.length,deck);
 s=choose(s,a=>a.mode==='hand');
 assert.equal(s.players[0].hand.filter(c=>c.uid===naraku.uid).length,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===naraku.uid),false);
 assert.equal(s.players[0].removed.some(c=>c.uid===naraku.uid),false);
 assert.equal(s.pending.step,'deploy');
 assert.equal(legalUniversalActions(packs,s).filter(a=>a.mode==='deploy'&&a.uid===base.uid).length>0,true);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===base.uid&&a.line==='energy');
 assert.equal(s.pending,null);
 const returned=[...s.players[0].front,...s.players[0].energy].filter(c=>c?.uid===base.uid);
 assert.equal(returned.length,1);
 assert.equal(returned[0].ready,false);
 assert.equal(s.players[1].outside.filter(c=>c.uid===frail.uid).length,1);
 assert.equal(s.players[1].removed.some(c=>c.uid===frail.uid),false);
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===frail.uid&&e.to==='outside'&&e.reason==='retirement').length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===frail.uid).length,1);
 assert.equal(s.players[1].deck.length,deck-1);
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===naraku.uid&&e.to==='hand').length,1);
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===base.uid&&(e.to==='front'||e.to==='energy')).length,1);
 assert.equal(buried.every(card=>s.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
 assertUniversalMatch(packs,s);

 let pair=toPhase(fresh(counts,2716),'main');
 const actor=put(pair,0,'IYS-1-027','front',0,false);
 const host=put(pair,0,'IYS-1-028','front',1);
 host.under=['IYS-1-034','IYS-1-001'].map(id=>{
  const card=take(pair,0,id);card.faceDown=true;return card;
 });
 const target=put(pair,1,'IYS-1-015','front',0);
 const before=pair.players[1].deck.length;
 pair=use(pair,{type:'activate',uid:actor.uid,mode:'iys:0'});
 pair=choose(pair,a=>a.uid===target.uid);
 pair=choose(pair,a=>a.uid===host.uid);
 assert.equal(pair.pending.step,'leave');
 assert.equal(pair.players[1].front.some(c=>c?.uid===target.uid),true);
 assert.equal(pair.players[1].deck.length,before);
 pair=choose(pair,a=>a.mode==='hand');
 assert.equal(pair.pending,null);
 assert.equal(pair.players[0].hand.filter(c=>c.uid===host.uid).length,1);
 assert.equal(pair.players[1].outside.filter(c=>c.uid===target.uid).length,1);
 assert.equal(pair.players[1].deck.length,before-1);
 assert.equal(pair.zoneMoveEvents.filter(e=>e.uid===host.uid&&e.to==='hand').length,1);
 assert.equal(pair.zoneMoveEvents.filter(e=>e.uid===target.uid&&e.to==='outside'&&e.reason==='retirement').length,1);
 assert.equal(pair.turnRetireEvents.filter(e=>e.uid===target.uid).length,1);
 assertUniversalMatch(packs,pair);
});

test('IYS-1-028 separates the raid frame from the facedown leave, and reenters 013 from outside',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-027','IYS-1-013','IYS-1-004','IYS-1-029','IYS-1-034','IYS-1-001','IYS-1-025']);
 let closed=toPhase(fresh(counts,2801),'main');
 const plain=put(closed,0,'IYS-1-028','front',0);
 const shard=take(closed,0,'IYS-1-029');
 closed.players[0].outside.push(shard);
 put(closed,0,'IYS-1-025','front',1);
 assert.equal(legal(closed,a=>a.type==='activate'&&a.uid===plain.uid),false);
 bury(closed,0,plain);
 assert.equal(legal(closed,a=>a.type==='activate'&&a.uid===plain.uid&&a.mode==='iys:0'),true);
 closed=use(closed,{type:'activate',uid:plain.uid,mode:'iys:0'});
 closed=choose(closed,a=>a.mode==='card'&&a.uid===shard.uid);
 assert.equal(closed.pending.step,'tuckHost');
 closed=choose(closed,a=>a.mode==='host'&&a.uid===plain.uid);
 const host=closed.players[0].front.find(c=>c?.uid===plain.uid);
 assert.equal(host.under.some(c=>c.uid===shard.uid&&c.faceDown===true),true);
 assert.deepEqual(facedown(closed,0,host).theirs.at(-1),{faceDown:true});
 assert.equal(legal(closed,a=>a.type==='activate'&&a.uid===plain.uid),false);
 assertUniversalMatch(packs,closed);

 let one=toPhase(fresh(counts,2802),'main');
 const single=put(one,0,'IYS-1-028','front',0);
 const caster=put(one,0,'IYS-1-027','front',1);
 const piled=take(one,0,'IYS-1-025');
 single.stack=[piled];
 const layer=take(one,0,'IYS-1-029');
 layer.faceDown=true;
 single.under=[layer];
 one=use(one,{type:'activate',uid:caster.uid,mode:'iys:0'});
 one=choose(one,a=>a.uid===single.uid);
 assert.equal(one.pending,null);
 assert.equal(one.players[0].outside.some(c=>c.uid===single.uid),true);
 assert.equal(one.players[0].hand.some(c=>c.uid===single.uid),false);
 assert.equal(one.players[0].outside.some(c=>c.uid===layer.uid),true);
 assertUniversalMatch(packs,one);

 let declined=toPhase(fresh(counts,2803),'main');
 const pair=put(declined,0,'IYS-1-028','front',0);
 const source=put(declined,0,'IYS-1-027','front',1);
 const raidBase=take(declined,0,'IYS-1-025');
 pair.stack=[raidBase];
 pair.under=['IYS-1-029','IYS-1-034'].map(id=>{
  const card=take(declined,0,id);card.faceDown=true;return card;
 });
 declined=use(declined,{type:'activate',uid:source.uid,mode:'iys:0'});
 declined=choose(declined,a=>a.uid===pair.uid);
 assert.equal(declined.pending.step,'leave');
 declined=choose(declined,a=>a.mode==='skip');
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===pair.uid),true);
 assert.equal(declined.players[0].hand.some(c=>c.uid===pair.uid),false);
 assert.equal(declined.players[0].outside.some(c=>c.uid===raidBase.uid),true);
 assertUniversalMatch(packs,declined);

 let back=toPhase(fresh(counts,2804),'main');
 const naraku=put(back,0,'IYS-1-028','front',0);
 const actor=put(back,0,'IYS-1-027','front',1);
 const sess=put(back,0,'IYS-1-004','front',2,false);
 const rin=take(back,0,'IYS-1-013');
 naraku.stack=[rin];
 const buried=['IYS-1-029','IYS-1-034','IYS-1-001'].map(id=>{
  const card=take(back,0,id);card.faceDown=true;return card;
 });
 naraku.under=buried;
 const hidden=facedown(back,0,naraku);
 assert.equal(hidden.mine.every(layer=>layer.cardId),true);
 assert.equal(hidden.theirs.every(layer=>layer.cardId===undefined&&layer.faceDown===true),true);
 back=use(back,{type:'activate',uid:actor.uid,mode:'iys:0'});
 back=choose(back,a=>a.uid===naraku.uid);
 assert.equal(back.pending.step,'leave');
 back=choose(back,a=>a.mode==='hand');
 assert.equal(back.players[0].hand.some(c=>c.uid===naraku.uid),true);
 assert.equal(buried.every(card=>back.players[0].outside.some(c=>c.uid===card.uid)),true);
 const revealed=universalPublicView(packs,back,1).players[0].outside.map(c=>c.uid);
 assert.equal(buried.every(card=>revealed.includes(card.uid)),true);
 assert.equal(back.pending.step,'deploy');
 assert.equal(legal(back,a=>a.mode==='deploy'&&a.uid===rin.uid),true);
 assert.equal(legal(back,a=>a.mode==='skip'),true);
 back=choose(back,a=>a.mode==='deploy'&&a.uid===rin.uid&&a.line==='front');
 const returned=back.players[0].front.find(c=>c?.uid===rin.uid);
 assert.equal(returned.ready,false);
 assert.equal(back.pending.step,'activeName');
 back=choose(back,a=>a.mode==='pick'&&a.uid===sess.uid);
 assert.equal(back.players[0].front.find(c=>c?.uid===sess.uid).ready,true);
 assert.equal(back.players[0].front.find(c=>c?.uid===rin.uid).ready,false);
 assertUniversalMatch(packs,back);

 let trigger=toPhase(fresh(counts,2805),'attack');
 const swinger=put(trigger,0,'IYS-1-004','front',0,true);
 const life=crown(trigger,1,'IYS-1-028');
 trigger=use(trigger,{type:'attack',uid:swinger.uid});
 trigger=choose(trigger,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(trigger.pending.trigger,'raid');
 assert.equal(legal(trigger,a=>a.mode==='get'),true);
 trigger=choose(trigger,a=>a.mode==='get');
 assert.equal(trigger.players[1].hand.some(c=>c.uid===life.uid),true);
 assertUniversalMatch(packs,trigger);
});

test('a full front asks IYS-1-028 before the line replacement removes it',()=>{
 const counts=countsFor(['IYS-1-001','IYS-1-013','IYS-1-028','IYS-1-010','IYS-1-026','IYS-1-029','IYS-1-034','IYS-1-004']);
 let handBack=toPhase(fresh(counts,2811),'main');
 readyAp(handBack);
 put(handBack,0,'IYS-1-010','energy',0);
 put(handBack,0,'IYS-1-026','energy',1);
 const mover=put(handBack,0,'IYS-1-013','energy',2);
 const occupant=put(handBack,0,'IYS-1-028','front',0);
 const base=take(handBack,0,'IYS-1-029');
 occupant.stack=[base];
 const layers=['IYS-1-034','IYS-1-004'].map(id=>{
  const card=take(handBack,0,id);card.faceDown=true;return card;
 });
 occupant.under=layers;
 put(handBack,0,'IYS-1-029','front',1);
 put(handBack,0,'IYS-1-026','front',2);
 put(handBack,0,'IYS-1-010','front',3);
 const event=take(handBack,0,'IYS-1-001');
 handBack.players[0].hand.push(event);
 handBack=play(handBack,event.uid,'play','energy');
 handBack=choose(handBack,a=>a.type==='chooseLineMove'&&a.uid===mover.uid);
 assert.equal(handBack.pending.kind,'effect-line-slot');
 handBack=choose(handBack,a=>a.type==='chooseLineSlot'&&a.replaceUid===occupant.uid);
 assert.equal(handBack.pending.step,'leave');
 assert.equal(handBack.players[0].front.some(c=>c?.uid===occupant.uid),true);
 assert.equal(handBack.players[0].energy.some(c=>c?.uid===mover.uid),true);
 handBack=choose(handBack,a=>a.mode==='hand');
 assert.equal(handBack.pending,null);
 assert.equal(handBack.players[0].hand.filter(c=>c.uid===occupant.uid).length,1);
 assert.equal(handBack.players[0].removed.some(c=>c.uid===occupant.uid),false);
 assert.equal(handBack.players[0].outside.some(c=>c.uid===occupant.uid),false);
 assert.equal(handBack.players[0].front.filter(c=>c?.uid===mover.uid).length,1);
 assert.equal(layers.every(card=>handBack.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
 assert.equal(handBack.zoneMoveEvents.filter(e=>e.uid===occupant.uid&&e.to==='hand').length,1);
 assert.equal(handBack.zoneMoveEvents.filter(e=>e.uid===mover.uid&&e.to==='front').length,1);
 assertUniversalMatch(packs,handBack);

 let kept=toPhase(fresh(counts,2812),'main');
 readyAp(kept);
 put(kept,0,'IYS-1-010','energy',0);
 put(kept,0,'IYS-1-026','energy',1);
 const body=put(kept,0,'IYS-1-013','energy',2);
 const staying=put(kept,0,'IYS-1-028','front',0);
 staying.under=['IYS-1-034','IYS-1-004'].map(id=>{
  const card=take(kept,0,id);card.faceDown=true;return card;
 });
 put(kept,0,'IYS-1-029','front',1);
 put(kept,0,'IYS-1-026','front',2);
 put(kept,0,'IYS-1-010','front',3);
 const aunn=take(kept,0,'IYS-1-001');
 kept.players[0].hand.push(aunn);
 kept=play(kept,aunn.uid,'play','energy');
 kept=choose(kept,a=>a.type==='chooseLineMove'&&a.uid===body.uid);
 kept=choose(kept,a=>a.type==='chooseLineSlot'&&a.replaceUid===staying.uid);
 assert.equal(kept.pending.step,'leave');
 kept=choose(kept,a=>a.mode==='skip');
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].removed.filter(c=>c.uid===staying.uid).length,1);
 assert.equal(kept.players[0].hand.some(c=>c.uid===staying.uid),false);
 assert.equal(kept.players[0].front.filter(c=>c?.uid===body.uid).length,1);
 assert.equal(kept.zoneMoveEvents.filter(e=>e.uid===staying.uid&&e.to==='removed').length,1);
 assert.equal(kept.zoneMoveEvents.filter(e=>e.uid===body.uid&&e.to==='front').length,1);
 assertUniversalMatch(packs,kept);
});

test('a hand-played IYS-1-013 does not use an older outside entry',()=>{
 const counts=countsFor(['IYS-1-013','IYS-1-004','IYS-1-001']);
 let s=toPhase(fresh(counts,1301),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 const sess=put(s,0,'IYS-1-004','front',0,false);
 const rin=take(s,0,'IYS-1-013');
 s.players[0].hand.push(rin);
 s=play(s,rin.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===rin.uid),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===sess.uid).ready,false);
 assertUniversalMatch(packs,s);
});

test('IYS-1-029 is vanilla, and its draw trigger draws one',()=>{
 const counts=countsFor(['IYS-1-029','IYS-1-047']);
 let s=toPhase(fresh(counts,2901),'main');
 const card=take(s,0,'IYS-1-029');
 s.players[0].hand.push(card);
 readyAp(s);
 s=play(s,card.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),true);
 assertUniversalMatch(packs,s);
 let life=toPhase(fresh(counts,2902),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const trigger=crown(life,1,'IYS-1-029');
 const before=life.players[1].deck.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].hand.length>0,true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),false);
 assertUniversalMatch(packs,life);
});

test('IYS-1-030 looks only while every character is naraku, and the top card stays private',()=>{
 const counts=countsFor(['IYS-1-030','IYS-1-029','IYS-1-042','IYS-1-028']);
 let mixed=toPhase(fresh(counts,3001),'main');
 readyAp(mixed);
 put(mixed,0,'IYS-1-029','front',0);
 put(mixed,0,'IYS-1-042','front',1);
 const blocked=take(mixed,0,'IYS-1-030');
 mixed.players[0].hand.push(blocked);
 const untouched=mixed.players[0].deck.length;
 mixed=play(mixed,blocked.uid);
 assert.equal(mixed.pending,null);
 assert.equal(mixed.players[0].deck.length,untouched);
 assertUniversalMatch(packs,mixed);

 let clean=toPhase(fresh(counts,3002),'main');
 readyAp(clean);
 const host=put(clean,0,'IYS-1-029','front',0);
 const top=take(clean,0,'IYS-1-042');
 clean.players[0].deck.unshift(top);
 const hitomi=take(clean,0,'IYS-1-030');
 clean.players[0].hand.push(hitomi);
 clean=play(clean,hitomi.uid);
 assert.equal(clean.pending.step,'topOrUnder');
 const seen=universalPrivateChoices(packs,clean,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),[top.uid]);
 assert.equal(universalPrivateChoices(packs,clean,1),null);
 assert.equal(JSON.stringify(universalPublicView(packs,clean,1)).includes(top.uid),false);
 clean=choose(clean,a=>a.mode==='top');
 assert.equal(clean.players[0].deck[0].uid,top.uid);
 assert.equal(clean.pending,null);
 assertUniversalMatch(packs,clean);

 let tucked=toPhase(fresh(counts,3003),'main');
 readyAp(tucked);
 const naraku=put(tucked,0,'IYS-1-028','front',0);
 const secret=take(tucked,0,'IYS-1-042');
 tucked.players[0].deck.unshift(secret);
 const actor=take(tucked,0,'IYS-1-030');
 tucked.players[0].hand.push(actor);
 tucked=play(tucked,actor.uid);
 assert.equal(legal(tucked,a=>a.mode==='host'&&a.uid===naraku.uid),true);
 assert.equal(legal(tucked,a=>a.mode==='host'&&a.uid===actor.uid),true);
 tucked=choose(tucked,a=>a.mode==='host'&&a.uid===naraku.uid);
 assert.equal(tucked.players[0].deck.some(c=>c.uid===secret.uid),false);
 assert.deepEqual(facedown(tucked,0,tucked.players[0].front.find(c=>c?.uid===naraku.uid)).theirs.at(-1),{faceDown:true});
 assertUniversalMatch(packs,tucked);
});

test('IYS-1-031 mills up to two cards when retired, and a removal does not',()=>{
 const counts=countsFor(['IYS-1-031','IYS-1-027','IYS-1-001','IYS-1-013','IYS-1-010','IYS-1-026','IYS-1-029']);
 let retired=toPhase(fresh(counts,3101),'main');
 const victim=put(retired,0,'IYS-1-031','front',0);
 const caster=put(retired,0,'IYS-1-027','front',1);
 const before=retired.players[0].deck.length;
 retired=use(retired,{type:'activate',uid:caster.uid,mode:'iys:0'});
 retired=choose(retired,a=>a.uid===victim.uid);
 assert.equal(retired.pending.kind,'effect-optional-mill');
 assert.equal(legal(retired,a=>a.mode==='skip'),true);
 retired=choose(retired,a=>a.mode==='mill');
 assert.equal(retired.pending.kind,'effect-optional-mill');
 retired=choose(retired,a=>a.mode==='skip');
 assert.equal(retired.players[0].deck.length,before-1);
 assert.equal(retired.players[0].outside.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,retired);

 let removed=toPhase(fresh(counts,3102),'main');
 readyAp(removed);
 put(removed,0,'IYS-1-010','energy',0);
 put(removed,0,'IYS-1-026','energy',1);
 const mover=put(removed,0,'IYS-1-013','energy',2);
 const occupant=put(removed,0,'IYS-1-031','front',0);
 put(removed,0,'IYS-1-029','front',1);
 put(removed,0,'IYS-1-026','front',2);
 put(removed,0,'IYS-1-010','front',3);
 const event=take(removed,0,'IYS-1-001');
 removed.players[0].hand.push(event);
 const deck=removed.players[0].deck.length;
 removed=play(removed,event.uid,'play','energy');
 assert.equal(removed.pending.kind,'effect-line-move');
 assert.equal(legal(removed,a=>a.uid===mover.uid),true);
 assert.equal(legal(removed,a=>a.uid===occupant.uid),false);
 removed=choose(removed,a=>a.type==='chooseLineMove'&&a.uid===mover.uid);
 assert.equal(removed.pending.kind,'effect-line-slot');
 removed=choose(removed,a=>a.type==='chooseLineSlot'&&a.replaceUid===occupant.uid);
 assert.equal(removed.pending,null);
 assert.equal(removed.players[0].removed.some(c=>c.uid===occupant.uid),true);
 assert.equal(removed.players[0].outside.some(c=>c.uid===occupant.uid),false);
 assert.equal(removed.players[0].deck.length,deck);
 assert.equal(removed.players[0].front.some(c=>c?.uid===mover.uid),true);
 assertUniversalMatch(packs,removed);
});

test('IYS-1-032 rests to tuck, then can tuck again after it is readied',()=>{
 const counts=countsFor(['IYS-1-032','IYS-1-028','IYS-1-029','IYS-1-034']);
 let s=toPhase(fresh(counts,3201),'main');
 const mirror=put(s,0,'IYS-1-032','energy',0,true);
 const host=put(s,0,'IYS-1-028','front',0);
 const first=take(s,0,'IYS-1-029');
 const second=take(s,0,'IYS-1-034');
 s.players[0].outside.push(first,second);
 s=use(s,{type:'activate',uid:mirror.uid,mode:'iys:0'});
 assert.equal(s.players[0].energy.find(c=>c?.uid===mirror.uid).ready,false);
 s=choose(s,a=>a.mode==='card'&&a.uid===first.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===host.uid).under.some(c=>c.uid===first.uid),true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===mirror.uid),false);
 s.players[0].energy.find(c=>c?.uid===mirror.uid).ready=true;
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===mirror.uid&&a.mode==='iys:0'),true);
 s=use(s,{type:'activate',uid:mirror.uid,mode:'iys:0'});
 s=choose(s,a=>a.mode==='card'&&a.uid===second.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===host.uid).under.filter(c=>c.faceDown).length,2);
 assert.deepEqual(facedown(s,0,s.players[0].front.find(c=>c?.uid===host.uid)).theirs.at(-1),{faceDown:true});
 assertUniversalMatch(packs,s);
});

test('IYS-1-033 draws before the opponent bottoms two events, first choice at the bottom',()=>{
 const counts=countsFor(['IYS-1-033','IYS-1-028','IYS-1-001','IYS-1-010','IYS-1-038','IYS-1-039','IYS-1-036']);
 let bare=toPhase(fresh(counts,3301),'main');
 readyAp(bare);
 payPurple(bare);
 const kept=take(bare,1,'IYS-1-038');
 bare.players[1].outside.push(kept);
 const event=take(bare,0,'IYS-1-033');
 bare.players[0].hand.push(event);
 const before=bare.players[0].deck.length;
 bare=play(bare,event.uid,'event');
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].deck.length,before-2);
 assert.equal(bare.players[1].outside.some(c=>c.uid===kept.uid),true);
 assertUniversalMatch(packs,bare);

 let ordered=toPhase(fresh(counts,3302),'main');
 readyAp(ordered);
 payPurple(ordered);
 put(ordered,0,'IYS-1-028','front',0);
 const first=take(ordered,1,'IYS-1-038');
 const second=take(ordered,1,'IYS-1-039');
 const third=take(ordered,1,'IYS-1-036');
 ordered.players[1].outside.push(first,second,third);
 const played=take(ordered,0,'IYS-1-033');
 ordered.players[0].hand.push(played);
 const deck=ordered.players[0].deck.length;
 ordered=play(ordered,played.uid,'event');
 assert.equal(ordered.players[0].deck.length,deck-2);
 assert.equal(ordered.pending.player,1);
 assert.equal(ordered.pending.step,'oppBottom');
 ordered=choose(ordered,a=>a.mode==='next'&&a.uid===first.uid);
 ordered=choose(ordered,a=>a.mode==='next'&&a.uid===second.uid);
 assert.equal(ordered.pending,null);
 assert.equal(ordered.players[1].deck.at(-1).uid,first.uid);
 assert.equal(ordered.players[1].deck.at(-2).uid,second.uid);
 assert.equal(ordered.players[1].outside.some(c=>c.uid===third.uid),true);
 assertUniversalMatch(packs,ordered);
});

test('IYS-1-034 recovers up to two AP, and its final trigger starts only at zero life',()=>{
 const counts=countsFor(['IYS-1-034','IYS-1-001','IYS-1-010','IYS-1-047']);
 let s=toPhase(fresh(counts,3401),'main');
 readyAp(s);
 payPurple(s);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 const event=take(s,0,'IYS-1-034');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(s,a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===s.players[0].apCards[0].uid);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===s.players[0].apCards[1].uid);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let last=toPhase(fresh(counts,3402),'attack');
 const attacker=put(last,0,'IYS-1-047','front',0,true);
 const life=onlyLife(last,1,'IYS-1-034');
 const top=last.players[1].deck[0];
 last=use(last,{type:'attack',uid:attacker.uid});
 last=choose(last,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(last.pending.trigger,'final');
 assert.equal(last.players[1].life.length,0);
 last=choose(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,top.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===life.uid),true);
 assert.equal(last.status,'playing');
 assertUniversalMatch(packs,last);
});

test('IYS-1-035 scales BP from a real play and retires one front character from a real life flip',()=>{
 const counts=countsFor(['IYS-1-035','IYS-1-001','IYS-1-010','IYS-1-029','IYS-1-026','IYS-1-042','IYS-1-047','IYS-1-044']);
 let none=toPhase(fresh(counts,3501),'main');
 readyAp(none);
 payPurple(none);
 const stored=put(none,1,'IYS-1-042','energy',0);
 const event=take(none,0,'IYS-1-035');
 none.players[0].hand.push(event);
 assert.equal(legal(none,a=>a.type==='event'&&a.uid===event.uid),false);
 const target=put(none,1,'IYS-1-042','front',0);
 none=play(none,event.uid,'event');
 assert.equal(none.pending.step,'debuff');
 assert.equal(legal(none,a=>a.uid===target.uid),true);
 assert.equal(legal(none,a=>a.uid===stored.uid),false);
 none=choose(none,a=>a.uid===target.uid);
 assert.equal(universalBp(pack,none,none.players[1].front[0]),1500);
 assert.equal(none.players[1].front.some(c=>c?.uid===target.uid),true);
 assertUniversalMatch(packs,none);

 let one=toPhase(fresh(counts,3502),'main');
 readyAp(one);
 payPurple(one);
 put(one,0,'IYS-1-029','front',0);
 const mid=put(one,1,'IYS-1-042','front',0);
 const played=take(one,0,'IYS-1-035');
 one.players[0].hand.push(played);
 one=play(one,played.uid,'event');
 one=choose(one,a=>a.uid===mid.uid);
 assert.equal(universalBp(pack,one,one.players[1].front[0]),500);
 assertUniversalMatch(packs,one);

 let two=toPhase(fresh(counts,3503),'main');
 readyAp(two);
 payPurple(two);
 put(two,0,'IYS-1-029','front',0);
 put(two,0,'IYS-1-026','front',1);
 const frail=put(two,1,'IYS-1-042','front',0);
 const heavy=take(two,0,'IYS-1-035');
 two.players[0].hand.push(heavy);
 two=play(two,heavy.uid,'event');
 two=choose(two,a=>a.uid===frail.uid);
 assert.equal(two.players[1].outside.some(c=>c.uid===frail.uid),true);
 assert.equal(two.players[1].removed.some(c=>c.uid===frail.uid),false);
 assertUniversalMatch(packs,two);

 let life=toPhase(fresh(counts,3504),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const extra=put(life,0,'IYS-1-044','front',1,true);
 const trigger=crown(life,1,'IYS-1-035');
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'special');
 assert.equal(legal(life,a=>a.mode==='special'&&a.uid===extra.uid),true);
 assert.equal(legal(life,a=>a.mode==='special'&&a.uid===attacker.uid),true);
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 life=choose(life,a=>a.mode==='special'&&a.uid===extra.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===extra.uid),true);
 assert.equal(life.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(universalBp(pack,life,life.players[0].front.find(c=>c?.uid===attacker.uid)),2500);
 assertUniversalMatch(packs,life);

 let skipped=toPhase(fresh(counts,3505),'attack');
 const swinger=put(skipped,0,'IYS-1-047','front',0,true);
 const spared=put(skipped,0,'IYS-1-044','front',1,true);
 const ignored=crown(skipped,1,'IYS-1-035');
 skipped=use(skipped,{type:'attack',uid:swinger.uid});
 skipped=choose(skipped,a=>a.type==='chooseBlock'&&a.uid===null);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[0].front.some(c=>c?.uid===spared.uid),true);
 assert.equal(skipped.players[1].outside.some(c=>c.uid===ignored.uid),true);
 assertUniversalMatch(packs,skipped);
});

test('IYS-1-036 rest-deploys a legal outside character, and that character\'s on-play still runs',()=>{
 const counts=countsFor(['IYS-1-036','IYS-1-013','IYS-1-004','IYS-1-029','IYS-1-010','IYS-1-001','IYS-1-044']);
 let s=toPhase(fresh(counts,3601),'main');
 readyAp(s);
 payPurple(s);
 const sess=put(s,0,'IYS-1-004','front',0,false);
 const rin=take(s,0,'IYS-1-013');
 const trait=take(s,0,'IYS-1-029');
 const costly=take(s,0,'IYS-1-010');
 const inu=take(s,0,'IYS-1-044');
 s.players[0].outside.push(rin,trait,costly,inu);
 const event=take(s,0,'IYS-1-036');
 const spare=take(s,0,'IYS-1-001');
 s.players[0].hand.push(event,spare);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-discard');
 const handBefore=s.players[0].hand.length;
 s=choose(s,a=>a.uid===spare.uid);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(s.pending.step,'deploy');
 assert.equal(legal(s,a=>a.mode==='deploy'&&a.uid===rin.uid),true);
 assert.equal(legal(s,a=>a.uid===trait.uid),false);
 assert.equal(legal(s,a=>a.uid===costly.uid),false);
 assert.equal(legal(s,a=>a.uid===inu.uid),false);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===rin.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===rin.uid).ready,false);
 assert.equal(s.pending.step,'activeName');
 s=choose(s,a=>a.mode==='pick'&&a.uid===sess.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===sess.uid).ready,true);
 assert.equal(s.players[0].front.find(c=>c?.uid===rin.uid).ready,false);
 assertUniversalMatch(packs,s);

 let declined=toPhase(fresh(counts,3602),'main');
 readyAp(declined);
 payPurple(declined);
 const waiting=put(declined,0,'IYS-1-004','front',0,false);
 const held=take(declined,0,'IYS-1-013');
 declined.players[0].outside.push(held);
 const card=take(declined,0,'IYS-1-036');
 const dump=take(declined,0,'IYS-1-001');
 declined.players[0].hand.push(card,dump);
 declined=play(declined,card.uid,'event');
 declined=choose(declined,a=>a.uid===dump.uid);
 declined=choose(declined,a=>a.mode==='skip');
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===held.uid),true);
 assert.equal(declined.players[0].front.find(c=>c?.uid===waiting.uid).ready,false);
 assertUniversalMatch(packs,declined);
});

test('IYS-1-037 raises the cap only while Sesshomaru is on the field, and special ignores that cap',()=>{
 const counts=countsFor(['IYS-1-037','IYS-1-001','IYS-1-010','IYS-1-047','IYS-1-045','IYS-1-044','IYS-1-004','IYS-1-009']);
 let plain=toPhase(fresh(counts,3701),'main');
 readyAp(plain);
 payPurple(plain);
 const small=put(plain,1,'IYS-1-047','front',0);
 const exact=put(plain,1,'IYS-1-045','front',1);
 const high=put(plain,1,'IYS-1-044','front',2);
 const event=take(plain,0,'IYS-1-037');
 plain.players[0].hand.push(event);
 plain=play(plain,event.uid,'event');
 assert.equal(plain.pending.kind,'effect-retire-bp');
 assert.equal(legal(plain,a=>a.uid===small.uid),true);
 assert.equal(legal(plain,a=>a.uid===exact.uid),true);
 assert.equal(legal(plain,a=>a.uid===high.uid),false);
 plain=choose(plain,a=>a.uid===exact.uid);
 assert.equal(plain.players[1].outside.some(c=>c.uid===exact.uid),true);
 assert.equal(plain.players[1].front.some(c=>c?.uid===high.uid),true);
 assertUniversalMatch(packs,plain);

 let named=toPhase(fresh(counts,3702),'main');
 readyAp(named);
 payPurple(named);
 put(named,0,'IYS-1-004','front',0);
 const big=put(named,1,'IYS-1-009','front',0);
 const over=put(named,1,'IYS-1-044','front',1);
 const card=take(named,0,'IYS-1-037');
 named.players[0].hand.push(card);
 named=play(named,card.uid,'event');
 assert.equal(legal(named,a=>a.uid===big.uid),true);
 assert.equal(legal(named,a=>a.uid===over.uid),true);
 named=choose(named,a=>a.uid===big.uid);
 assert.equal(named.players[1].outside.some(c=>c.uid===big.uid),true);
 assertUniversalMatch(packs,named);

 let life=toPhase(fresh(counts,3703),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const tall=put(life,0,'IYS-1-044','front',1,true);
 const trigger=crown(life,1,'IYS-1-037');
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'special');
 life=choose(life,a=>a.mode==='special'&&a.uid===tall.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===tall.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-038 retires 3000 or less, and a null life trigger opens nothing',()=>{
 const counts=countsFor(['IYS-1-038','IYS-1-001','IYS-1-047','IYS-1-045','IYS-1-044']);
 let s=toPhase(fresh(counts,3801),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 const exact=put(s,1,'IYS-1-045','front',0);
 const high=put(s,1,'IYS-1-044','front',1);
 const event=take(s,0,'IYS-1-038');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(legal(s,a=>a.uid===exact.uid),true);
 assert.equal(legal(s,a=>a.uid===high.uid),false);
 s=choose(s,a=>a.uid===exact.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===exact.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===high.uid),true);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,3802),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const trigger=crown(life,1,'IYS-1-038');
 const lives=life.players[1].life.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].life.length,lives-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-039 readies one AP, draws, retires, then may tuck, in that order',()=>{
 const counts=countsFor(['IYS-1-039','IYS-1-032','IYS-1-028','IYS-1-029','IYS-1-001','IYS-1-010']);
 let blocked=toPhase(fresh(counts,3901),'main');
 readyAp(blocked);
 put(blocked,0,'IYS-1-032','energy',0);
 put(blocked,0,'IYS-1-032','energy',1);
 put(blocked,0,'IYS-1-032','energy',2);
 const illegal=take(blocked,0,'IYS-1-039');
 blocked.players[0].hand.push(illegal);
 assert.equal(legal(blocked,a=>a.type==='event'&&a.uid===illegal.uid),false);

 let asked=toPhase(fresh(counts,3902),'main');
 readyAp(asked);
 payPurple(asked);
 put(asked,0,'IYS-1-028','front',0);
 const other=put(asked,0,'IYS-1-029','front',1);
 asked.players[0].apCards[0].ready=false;
 asked.players[0].apCards[1].ready=false;
 const event=take(asked,0,'IYS-1-039');
 asked.players[0].hand.push(event);
 const deck=asked.players[0].deck.length;
 asked=play(asked,event.uid,'event');
 assert.equal(asked.pending.step,'ap');
 assert.equal(asked.players[0].deck.length,deck);
 assert.equal(legal(asked,a=>a.mode==='skip'),false);
 asked=choose(asked,a=>a.mode==='ap'&&a.index===0);
 assert.equal(asked.players[0].apCards[0].ready,true);
 assert.equal(asked.players[0].apCards[1].ready,false);
 assert.equal(asked.players[0].deck.length,deck-2);
 assert.equal(asked.pending.step,'retireOwn');
 asked=choose(asked,a=>a.uid===other.uid);
 assert.equal(asked.pending.step,'tuckEvent');
 assert.equal(legal(asked,a=>a.mode==='skip'),true);
 asked=choose(asked,a=>a.mode==='skip');
 assert.equal(asked.pending,null);
 assert.equal(asked.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(asked.players[0].front.find(c=>c?.cardId==='IYS-1-028').under.length,0);
 assertUniversalMatch(packs,asked);

 let singleAp=toPhase(fresh(counts,3904),'main');
 readyAp(singleAp);
 payPurple(singleAp);
 put(singleAp,0,'IYS-1-028','front',0);
 const oneEvent=take(singleAp,0,'IYS-1-039');
 singleAp.players[0].hand.push(oneEvent);
 const oneDeck=singleAp.players[0].deck.length;
 singleAp=play(singleAp,oneEvent.uid,'event');
 assert.equal(singleAp.pending.step,'retireOwn');
 assert.equal(singleAp.players[0].apCards.every(c=>c.ready),true);
 assert.equal(singleAp.players[0].apCards[0].ready,true);
 assert.equal(singleAp.players[0].deck.length,oneDeck-2);
 const lone=singleAp.players[0].front.find(c=>c?.cardId==='IYS-1-028');
 singleAp=choose(singleAp,a=>a.uid===lone.uid);
 assert.equal(singleAp.pending,null);
 assertUniversalMatch(packs,singleAp);

 let solo=toPhase(fresh(counts,3903),'main');
 readyAp(solo);
 payPurple(solo);
 const only=put(solo,0,'IYS-1-028','front',0);
 const card=take(solo,0,'IYS-1-039');
 solo.players[0].hand.push(card);
 solo=play(solo,card.uid,'event');
 assert.equal(solo.pending.step,'retireOwn');
 solo=choose(solo,a=>a.uid===only.uid);
 assert.equal(solo.pending,null);
 assert.equal(solo.players[0].outside.some(c=>c.uid===card.uid),true);
 assertUniversalMatch(packs,solo);
});

test('IYS-1-040 recovers AP, and final does nothing while life remains',()=>{
 const counts=countsFor(['IYS-1-040','IYS-1-001','IYS-1-010','IYS-1-047']);
 let s=toPhase(fresh(counts,4001),'main');
 readyAp(s);
 payPurple(s);
 s.players[0].apCards[0].ready=false;
 const event=take(s,0,'IYS-1-040');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards[0].ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,4002),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const trigger=crown(life,1,'IYS-1-040');
 const remaining=life.players[1].life.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].life.length,remaining-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-041 shows the whole top four, keeps unchosen cards in the chosen order, and discards only after a hit',()=>{
 const counts=countsFor(['IYS-1-041','IYS-1-080','IYS-1-042','IYS-1-047','IYS-1-050','IYS-1-045','IYS-1-062']);
 let s=toPhase(fresh(counts,4101),'main');
 readyAp(s);
 put(s,0,'IYS-1-045','energy',0);
 put(s,0,'IYS-1-062','energy',1);
 const window=topDeck(s,0,['IYS-1-080','IYS-1-042','IYS-1-047','IYS-1-050']);
 const event=take(s,0,'IYS-1-041');
 s.players[0].hand.push(event);
 s=play(s,event.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action.uid,window[0].uid);
 assert.equal(shown[1].action,null);
 assert.equal(shown[2].action,null);
 assert.equal(shown[3].action,null);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const hidden=JSON.stringify(universalPublicView(packs,s,1));
 assert.equal(window.every(card=>!hidden.includes(card.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[0].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid),false);
 assert.equal(s.pending.kind,'effect-top-order');
 s=choose(s,a=>a.uid===window[2].uid);
 s=choose(s,a=>a.uid===window[1].uid);
 s=choose(s,a=>a.uid===window[3].uid);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[window[2].uid,window[1].uid,window[3].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s,a=>a.uid===window[0].uid),true);
 const discard=s.players[0].hand.find(c=>c.uid!==window[0].uid);
 s=choose(s,a=>a.uid===discard.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let missed=toPhase(fresh(counts,4102),'main');
 readyAp(missed);
 put(missed,0,'IYS-1-045','energy',0);
 put(missed,0,'IYS-1-062','energy',1);
 const all=topDeck(missed,0,['IYS-1-080','IYS-1-042','IYS-1-047','IYS-1-050']);
 const actor=take(missed,0,'IYS-1-041');
 missed.players[0].hand.push(actor);
 missed=play(missed,actor.uid);
 const hand=missed.players[0].hand.length;
 missed=choose(missed,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 for(const card of all)missed=choose(missed,a=>a.uid===card.uid);
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.length,hand);
 assert.deepEqual(missed.players[0].deck.slice(-4).map(c=>c.uid),all.map(c=>c.uid));
 assertUniversalMatch(packs,missed);
});

test('IYS-1-042 has no printed effect, and its get trigger adds it to hand',()=>{
 const counts=countsFor(['IYS-1-042','IYS-1-047']);
 let s=toPhase(fresh(counts,4201),'main');
 readyAp(s);
 const card=take(s,0,'IYS-1-042');
 s.players[0].hand.push(card);
 s=play(s,card.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
 let life=toPhase(fresh(counts,4202),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const trigger=crown(life,1,'IYS-1-042');
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'get');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),false);
 assertUniversalMatch(packs,life);
});

test('IYS-1-043 discounts an empty field, and only an own-effect rest opens the activate',()=>{
 const counts=countsFor(['IYS-1-043','IYS-1-049','IYS-1-050','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-042']);
 let empty=toPhase(fresh(counts,4301),'main');
 const held=take(empty,0,'IYS-1-043');
 empty.players[0].hand.push(held);
 assert.equal(zoneRequiredEnergy(pack,empty,0,pack.cards['IYS-1-043'],'hand'),0);
 const body=put(empty,0,'IYS-1-050','front',0);
 assert.equal(zoneRequiredEnergy(pack,empty,0,pack.cards['IYS-1-043'],'hand'),2);
 assert.equal(body.cardId,'IYS-1-050');
 assertUniversalMatch(packs,empty);

 let rested=toPhase(fresh(counts,4302),'main');
 readyAp(rested);
 payRed(rested);
 const inu=put(rested,0,'IYS-1-043','front',0,true);
 assert.equal(legal(rested,a=>a.type==='activate'&&a.uid===inu.uid),false);
 inu.ready=false;
 assert.equal(legal(rested,a=>a.type==='activate'&&a.uid===inu.uid),false);
 inu.ready=true;
 const kikyo=take(rested,0,'IYS-1-049');
 rested.players[0].hand.push(kikyo);
 rested=play(rested,kikyo.uid);
 rested=use(rested,{type:'activate',uid:kikyo.uid,mode:'iys:0'});
 rested=choose(rested,a=>a.mode==='pick'&&a.uid===inu.uid);
 rested=choose(rested,a=>a.mode==='skip');
 assert.equal(rested.players[0].front.find(c=>c?.uid===inu.uid).ready,false);
 assert.equal(legal(rested,a=>a.type==='activate'&&a.uid===inu.uid&&a.mode==='iys:0'),true);
 rested=use(rested,{type:'activate',uid:inu.uid,mode:'iys:0'});
 const live=rested.players[0].front.find(c=>c?.uid===inu.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(pack,rested,live),3000);
 assert.equal(legal(rested,a=>a.type==='activate'&&a.uid===inu.uid),false);
 assertUniversalMatch(packs,rested);
});

test('IYS-1-044 deals two life, blocks only with a facedown, and tucks Tessaiga from the front',()=>{
 const counts=countsFor(['IYS-1-044','IYS-1-079','IYS-1-050','IYS-1-041','IYS-1-042','IYS-1-047','IYS-1-045','IYS-1-062','IYS-1-001']);
 let damage=toPhase(fresh(counts,4401),'attack');
 const attacker=put(damage,0,'IYS-1-044','front',0,true);
 const first=onlyLife(damage,1,'IYS-1-050');
 const second=take(damage,1,'IYS-1-041');
 damage.players[1].life.push(second);
 damage=use(damage,{type:'attack',uid:attacker.uid});
 assert.equal(universalAttackDamage(packs,damage,damage.players[0].front[0]),2);
 damage=choose(damage,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(damage.pending.kind,'life-batch-order');
 damage=choose(damage,a=>a.uid===first.uid);
 if(damage.pending?.kind==='life-batch-order')
  damage=choose(damage,a=>a.uid===second.uid);
 assert.equal(damage.players[1].life.length,0);
 assert.equal(damage.players[1].outside.some(c=>c.uid===first.uid),true);
 assert.equal(damage.players[1].outside.some(c=>c.uid===second.uid),true);
 assertUniversalMatch(packs,damage);

 let front=toPhase(fresh(counts,4402),'main');
 const self=put(front,0,'IYS-1-044','front',0,false);
 const sword=take(front,0,'IYS-1-079');
 front.players[0].outside.push(sword);
 assert.equal(legal(front,a=>a.mode==='iys:0'&&a.uid===self.uid),true);
 assert.equal(legal(front,a=>a.mode==='iys:1'&&a.uid===self.uid),true);
 front=use(front,{type:'activate',uid:self.uid,mode:'iys:1'});
 assert.equal(front.players[0].front[0].under.some(c=>c.uid===sword.uid&&c.faceDown===true),true);
 assert.deepEqual(facedown(front,0,front.players[0].front[0]).theirs[0],{faceDown:true});
 front=use(front,{type:'activate',uid:self.uid,mode:'iys:0'});
 assert.equal(front.players[0].front[0].ready,true);
 assert.equal(legal(front,a=>a.type==='activate'&&a.uid===self.uid),false);
 front=passTo(front,1,'attack');
 const striker=put(front,1,'IYS-1-042','front',0,true);
 front=use(front,{type:'attack',uid:striker.uid});
 assert.equal(legal(front,a=>a.type==='chooseBlock'&&a.uid===self.uid),true);
 assertUniversalMatch(packs,front);

 let energy=toPhase(fresh(counts,4403),'main');
 const line=put(energy,0,'IYS-1-044','energy',0,false);
 const other=take(energy,0,'IYS-1-079');
 energy.players[0].outside.push(other);
 assert.equal(legal(energy,a=>a.type==='activate'&&a.uid===line.uid),false);
 assertUniversalMatch(packs,energy);

 let played=toPhase(fresh(counts,4405),'main');
 readyAp(played);
 payRed(played);
 const fromHand=take(played,0,'IYS-1-044');
 played.players[0].hand.push(fromHand);
 played=play(played,fromHand.uid);
 assert.equal(played.players[0].front.find(c=>c?.uid===fromHand.uid).ready,true);
 assertUniversalMatch(packs,played);

 let rested=toPhase(fresh(counts,4406),'main');
 const source=take(rested,0,'IYS-1-001');
 rested.players[0].outside.push(source);
 const asked=take(rested,0,'IYS-1-044');
 rested.players[0].outside.push(asked);
 rested.pending={kind:'iys',player:0,sourceUid:source.uid,id:'IYS-1-036',step:'deploy',
  data:{follow:null},actions:[
   {type:'iys',mode:'skip'},
   {type:'iys',mode:'deploy',uid:asked.uid,line:'front',slot:0}
  ]};
 assert.equal(legal(rested,a=>a.mode==='deploy'&&a.uid===asked.uid&&a.line==='front'),true);
 rested=choose(rested,a=>a.mode==='deploy'&&a.uid===asked.uid&&a.line==='front'&&a.slot===0);
 const entered=rested.players[0].front.find(c=>c?.uid===asked.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.entryTurn,rested.turn);
 assert.equal(rested.pending,null);
 assert.equal(rested.players[0].outside.some(c=>c.uid===asked.uid),false);
 assertUniversalMatch(packs,rested);

 let bare=toPhase(fresh(counts,4404),'attack');
 const swinger=put(bare,0,'IYS-1-047','front',0,true);
 const wall=put(bare,1,'IYS-1-044','front',0,true);
 bare=use(bare,{type:'attack',uid:swinger.uid});
 assert.equal(legal(bare,a=>a.uid===wall.uid),false);
 assertUniversalMatch(packs,bare);
});

test('IYS-1-045 draws on attack only at BP 4000, and its activate does not raise BP',()=>{
 const counts=countsFor(['IYS-1-045','IYS-1-048','IYS-1-049','IYS-1-042','IYS-1-041','IYS-1-062']);
 let low=toPhase(fresh(counts,4501),'attack');
 const attacker=put(low,0,'IYS-1-045','front',0,true);
 const before=low.players[0].deck.length;
 low=use(low,{type:'attack',uid:attacker.uid});
 assert.equal(low.pending.kind,'block');
 assert.equal(low.players[0].deck.length,before);
 assertUniversalMatch(packs,low);

 let high=toPhase(fresh(counts,4502),'main');
 readyAp(high);
 const self=put(high,0,'IYS-1-045','front',0,true);
 const buff=take(high,0,'IYS-1-048');
 high.players[0].hand.push(buff);
 high=play(high,buff.uid);
 assert.equal(legal(high,a=>a.type==='chooseOwnBuff'&&a.uid===buff.uid),false);
 assert.equal(legal(high,a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 high=choose(high,a=>a.type==='chooseOwnBuff'&&a.uid===self.uid);
 assert.equal(universalBp(pack,high,high.players[0].front.find(c=>c?.uid===self.uid)),4000);
 high=toPhase(high,'attack');
 const deck=high.players[0].deck.length;
 high=use(high,{type:'attack',uid:self.uid});
 assert.equal(high.pending.kind,'block');
 assert.equal(high.players[0].deck.length,deck-1);
 assertUniversalMatch(packs,high);

 let active=toPhase(fresh(counts,4503),'main');
 readyAp(active);
 payRed(active);
 const inu=put(active,0,'IYS-1-045','front',0,true);
 const kikyo=take(active,0,'IYS-1-049');
 active.players[0].hand.push(kikyo);
 active=play(active,kikyo.uid);
 active=use(active,{type:'activate',uid:kikyo.uid,mode:'iys:0'});
 active=choose(active,a=>a.uid===inu.uid);
 active=choose(active,a=>a.mode==='skip');
 active=use(active,{type:'activate',uid:inu.uid,mode:'iys:0'});
 const live=active.players[0].front.find(c=>c?.uid===inu.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(pack,active,live),3000);
 assertUniversalMatch(packs,active);
});

test('IYS-1-046 keeps the unblocked draw outside the raid frame and offers double attack only for this turn\'s entry',()=>{
 const counts=countsFor(['IYS-1-046','IYS-1-049','IYS-1-042','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-047']);
 let open=toPhase(fresh(counts,4601),'attack');
 const swinger=put(open,0,'IYS-1-046','front',0,true);
 const life=crown(open,1,'IYS-1-047');
 open=use(open,{type:'attack',uid:swinger.uid});
 assert.equal(open.pending.kind,'block');
 const before=open.players[0].deck.length;
 assert.equal(legal(open,a=>a.type==='activate'),false);
 open=choose(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(open.players[0].deck.length,before-1);
 const draw=open.zoneMoveEvents.find(e=>e.from==='deck'&&e.to==='hand'&&e.sourceUid===swinger.uid);
 const flipped=open.zoneMoveEvents.find(e=>e.uid===life.uid&&e.from==='life'&&e.to==='outside');
 assert.ok(draw&&flipped&&draw.order<flipped.order);
 assertUniversalMatch(packs,open);

 let kit=toPhase(fresh(counts,4602),'main');
 readyAp(kit);
 payRed(kit);
 const older=put(kit,0,'IYS-1-046','front',0,true);
 assert.equal(legal(kit,a=>a.type==='activate'&&a.uid===older.uid),false);
 bury(kit,0,older);
 const kikyo=take(kit,0,'IYS-1-049');
 kit.players[0].hand.push(kikyo);
 kit=play(kit,kikyo.uid);
 kit=use(kit,{type:'activate',uid:kikyo.uid,mode:'iys:0'});
 kit=choose(kit,a=>a.uid===older.uid);
 kit=choose(kit,a=>a.mode==='skip');
 assert.equal(legal(kit,a=>a.type==='activate'&&a.uid===older.uid&&a.mode==='iys:0'),true);
 kit=use(kit,{type:'activate',uid:older.uid,mode:'iys:0'});
 assert.equal(kit.pending,null);
 const boosted=kit.players[0].front.find(c=>c?.uid===older.uid);
 assert.equal(boosted.ready,true);
 assert.equal(universalBp(pack,kit,boosted),5000);
 assert.equal(universalImpact(pack,kit,boosted),1);
 assertUniversalMatch(packs,kit);

 let doubled=toPhase(fresh(counts,4603),'main');
 readyAp(doubled);
 payRed(doubled);
 const base=put(doubled,0,'IYS-1-042','front',0,true);
 const raider=take(doubled,0,'IYS-1-046');
 doubled.players[0].hand.push(raider);
 const raid=legalUniversalActions(packs,doubled).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===base.uid&&a.line!=='energy');
 if(!raid)throw Error('No raid onto the named base');
 doubled=use(doubled,raid);
 assert.equal(doubled.players[0].front.some(c=>c?.uid===raider.uid&&c.ready===true),true);
 const actor=take(doubled,0,'IYS-1-049');
 doubled.players[0].hand.push(actor);
 doubled=play(doubled,actor.uid);
 doubled=use(doubled,{type:'activate',uid:actor.uid,mode:'iys:0'});
 doubled=choose(doubled,a=>a.uid===raider.uid);
 doubled=choose(doubled,a=>a.mode==='skip');
 doubled=use(doubled,{type:'activate',uid:raider.uid,mode:'iys:0'});
 assert.equal(doubled.pending.step,'replaceKit');
 assert.equal(legal(doubled,a=>a.mode==='kit'),true);
 assert.equal(legal(doubled,a=>a.mode==='double'),true);
 doubled=choose(doubled,a=>a.mode==='kit');
 const twice=doubled.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(twice.ready,true);
 assert.equal(universalBp(pack,doubled,twice),5000);
 assert.equal(universalImpact(pack,doubled,twice),1);
 assert.equal(twice.stack?.[0]?.uid,base.uid);
 doubled=toPhase(doubled,'attack');
 doubled=use(doubled,{type:'attack',uid:raider.uid});
 assert.equal(doubled.pending.kind,'block');
 const deck=doubled.players[0].deck.length;
 doubled=choose(doubled,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(doubled.players[0].deck.length,deck-1);
 assertUniversalMatch(packs,doubled);
});

test('IYS-1-046 double attack is not generated-energy doubling',()=>{
 const counts=countsFor(['IYS-1-046','IYS-1-049','IYS-1-042','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-050']);
 let s=toPhase(fresh(counts,4604),'main');
 readyAp(s);
 payRed(s);
 const base=put(s,0,'IYS-1-042','front',0,true);
 const raider=take(s,0,'IYS-1-046');
 s.players[0].hand.push(raider);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===base.uid&&a.line!=='energy');
 if(!raid)throw Error('No raid onto the named base');
 s=use(s,raid);
 const actor=take(s,0,'IYS-1-049');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 s=use(s,{type:'activate',uid:actor.uid,mode:'iys:0'});
 s=choose(s,a=>a.uid===raider.uid);
 s=choose(s,a=>a.mode==='skip');
 s=use(s,{type:'activate',uid:raider.uid,mode:'iys:0'});
 s=choose(s,a=>a.mode==='double');
 const body=s.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(body.ready,true);
 assert.equal(universalBp(pack,s,body),4000);
 assert.equal(universalImpact(pack,s,body),0);
 assert.deepEqual(s.energyDoubles,[0,0]);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|doubleAttack'),true);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|double'),false);
 assertUniversalMatch(packs,s);
 crown(s,1,'IYS-1-050');
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:raider.uid});
 s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 if(s.pending?.kind==='life-trigger')s=choose(s,a=>a.mode==='skip'||a.uid===null);
 const again=s.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(again.ready,true);
 assert.equal(legal(s,a=>a.type==='attack'&&a.uid===raider.uid),true);
 s=use(s,{type:'attack',uid:raider.uid});
 s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 if(s.pending?.kind==='life-trigger')s=choose(s,a=>a.mode==='skip'||a.uid===null);
 assert.equal(legal(s,a=>a.type==='attack'&&a.uid===raider.uid),false);
 assert.deepEqual(s.energyDoubles,[0,0]);
 assertUniversalMatch(packs,s);
});

test('IYS-1-047 active trigger readies one character and gives BP+3000',()=>{
 const counts=countsFor(['IYS-1-047','IYS-1-050']);
 let s=toPhase(fresh(counts,4701),'attack');
 const attacker=put(s,0,'IYS-1-050','front',0,true);
 const rested=put(s,1,'IYS-1-050','front',0,false);
 const trigger=crown(s,1,'IYS-1-047');
 s=use(s,{type:'attack',uid:attacker.uid});
 s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'active');
 s=choose(s,a=>a.mode==='active'&&a.uid===rested.uid);
 const live=s.players[1].front.find(c=>c?.uid===rested.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(pack,s,live),5000);
 assert.equal(s.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,s);
});

test('IYS-1-048 buffs another character and can be skipped',()=>{
 const counts=countsFor(['IYS-1-048','IYS-1-050']);
 let s=toPhase(fresh(counts,4801),'main');
 readyAp(s);
 const other=put(s,0,'IYS-1-050','front',0);
 const card=take(s,0,'IYS-1-048');
 s.players[0].hand.push(card);
 s=play(s,card.uid);
 assert.equal(legal(s,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid),true);
 assert.equal(legal(s,a=>a.type==='chooseOwnBuff'&&a.uid===card.uid),false);
 s=choose(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===other.uid)),2000);
 assertUniversalMatch(packs,s);
});

test('IYS-1-049 rests an active Inuyasha only on its entry turn, then forks, and nulls impact',()=>{
 const counts=countsFor(['IYS-1-049','IYS-1-042','IYS-1-027','IYS-1-029','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-047']);
 let late=toPhase(fresh(counts,4901),'main');
 const old=put(late,0,'IYS-1-049','front',0,true);
 put(late,0,'IYS-1-042','front',1,true);
 assert.equal(legal(late,a=>a.type==='activate'&&a.uid===old.uid),false);
 assert.equal(universalImpactNull(pack,late,old),true);
 assertUniversalMatch(packs,late);

 let fork=toPhase(fresh(counts,4902),'main');
 readyAp(fork);
 payRed(fork);
 const inu=put(fork,0,'IYS-1-042','front',0,true);
 const foe=put(fork,1,'IYS-1-047','front',0,true);
 const card=take(fork,0,'IYS-1-049');
 fork.players[0].hand.push(card);
 fork=play(fork,card.uid);
 assert.equal(legal(fork,a=>a.type==='activate'&&a.uid===card.uid),true);
 fork=use(fork,{type:'activate',uid:card.uid,mode:'iys:0'});
 assert.equal(fork.pending.step,'restInu');
 assert.equal(legal(fork,a=>a.mode==='skip'),false);
 fork=choose(fork,a=>a.uid===inu.uid);
 assert.equal(fork.players[0].front.find(c=>c?.uid===inu.uid).ready,false);
 assert.equal(fork.pending.step,'kikyoFork');
 fork=choose(fork,a=>a.mode==='buff');
 const self=fork.players[0].front.find(c=>c?.uid===card.uid);
 assert.equal(self.ready,true);
 assert.equal(universalBp(pack,fork,self),4000);
 assert.equal(fork.players[1].front.find(c=>c?.uid===foe.uid).ready,true);
 assertUniversalMatch(packs,fork);

 let rest=toPhase(fresh(counts,4903),'main');
 readyAp(rest);
 payRed(rest);
 const dog=put(rest,0,'IYS-1-042','front',0,true);
 const enemy=put(rest,1,'IYS-1-047','front',0,true);
 const actor=take(rest,0,'IYS-1-049');
 rest.players[0].hand.push(actor);
 rest=play(rest,actor.uid);
 rest=use(rest,{type:'activate',uid:actor.uid,mode:'iys:0'});
 rest=choose(rest,a=>a.uid===dog.uid);
 rest=choose(rest,a=>a.mode==='rest'&&a.uid===enemy.uid);
 assert.equal(rest.players[1].front.find(c=>c?.uid===enemy.uid).ready,false);
 assert.equal(universalBp(pack,rest,rest.players[0].front.find(c=>c?.uid===actor.uid)),3000);
 assert.equal((rest.players[0].front.find(c=>c?.uid===actor.uid).buffs||[]).some(b=>b.bp===1000),false);
 assertUniversalMatch(packs,rest);

 let battle=toPhase(fresh(counts,4904),'main');
 const striker=put(battle,0,'IYS-1-027','front',0,true);
 put(battle,0,'IYS-1-029','front',1);
 battle=use(battle,{type:'activate',uid:striker.uid,mode:'iys:0'});
 battle=choose(battle,a=>a.uid===battle.players[0].front.find(c=>c?.cardId==='IYS-1-029').uid);
 battle=toPhase(battle,'attack');
 const wall=put(battle,1,'IYS-1-049','front',0,true);
 const lives=battle.players[1].life.length;
 battle=use(battle,{type:'attack',uid:striker.uid});
 battle=choose(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].life.length,lives);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assertUniversalMatch(packs,battle);
});

test('IYS-1-050 nulls impact and a null life trigger does not open a choice',()=>{
 const counts=countsFor(['IYS-1-050','IYS-1-027','IYS-1-029','IYS-1-047']);
 let battle=toPhase(fresh(counts,5001),'main');
 const striker=put(battle,0,'IYS-1-027','front',0,true);
 put(battle,0,'IYS-1-029','front',1);
 battle=use(battle,{type:'activate',uid:striker.uid,mode:'iys:0'});
 battle=choose(battle,a=>a.uid===battle.players[0].front.find(c=>c?.cardId==='IYS-1-029').uid);
 battle=toPhase(battle,'attack');
 const wall=put(battle,1,'IYS-1-050','front',0,true);
 assert.equal(universalImpactNull(pack,battle,wall),true);
 const lives=battle.players[1].life.length;
 battle=use(battle,{type:'attack',uid:striker.uid});
 battle=choose(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].life.length,lives);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assertUniversalMatch(packs,battle);

 let life=toPhase(fresh(counts,5002),'attack');
 const attacker=put(life,0,'IYS-1-047','front',0,true);
 const trigger=crown(life,1,'IYS-1-050');
 life=use(life,{type:'attack',uid:attacker.uid});
 life=choose(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('paid play onto a full line asks IYS-1-028 before spending or moving',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-029','IYS-1-013','IYS-1-034','IYS-1-004','IYS-1-026','IYS-1-010','IYS-1-001']);
 let hand=toPhase(fresh(counts,2813),'main');
 readyAp(hand);
 const {host,base,under}=host028(hand,0,'IYS-1-013',['IYS-1-034','IYS-1-004']);
 fillLine(hand,'front',['IYS-1-026','IYS-1-010','IYS-1-001']);
 const incoming=take(hand,0,'IYS-1-029');
 hand.players[0].hand.push(incoming);
 const before=apReady(hand);
 hand=use(hand,onto(hand,incoming.uid,host.uid));
 assert.equal(hand.pending.step,'leave');
 assert.equal(hand.players[0].front.some(c=>c?.uid===host.uid),true);
 assert.equal(hand.players[0].hand.some(c=>c.uid===incoming.uid),true);
 assert.equal(apReady(hand),before);
 hand=roundTrip(hand);
 hand=choose(hand,a=>a.mode==='hand');
 assert.equal(hand.pending,null);
 assert.equal(hand.players[0].hand.filter(c=>c.uid===host.uid).length,1);
 assert.equal(hand.players[0].front.filter(c=>c?.uid===incoming.uid).length,1);
 assert.equal(hand.players[0].outside.filter(c=>c.uid===base.uid).length,1);
 assert.equal(under.every(card=>hand.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
 assert.equal(moved(hand,host.uid,'hand').length,1);
 assert.equal(moved(hand,incoming.uid,'front').length,1);
 assert.equal(apReady(hand),before-1);
 assert.ok(moved(hand,host.uid,'hand')[0].order<moved(hand,incoming.uid,'front')[0].order);
 assertUniversalMatch(packs,hand);

 let skipped=toPhase(fresh(counts,2814),'main');
 readyAp(skipped);
 const staying=host028(skipped,0,'IYS-1-013',['IYS-1-034','IYS-1-004']);
 fillLine(skipped,'front',['IYS-1-026','IYS-1-010','IYS-1-001']);
 const played=take(skipped,0,'IYS-1-029');
 skipped.players[0].hand.push(played);
 const ap=apReady(skipped);
 skipped=use(skipped,onto(skipped,played.uid,staying.host.uid));
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].removed.filter(c=>c.uid===staying.host.uid).length,1);
 assert.equal(skipped.players[0].front.filter(c=>c?.uid===played.uid).length,1);
 assert.equal(moved(skipped,staying.host.uid,'removed').length,1);
 assert.equal(moved(skipped,played.uid,'front').length,1);
 assert.equal(apReady(skipped),ap-1);
 assertUniversalMatch(packs,skipped);
});

test('exact energy still finishes when the replaced IYS-1-028 was generating it',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-004','IYS-1-029','IYS-1-026','IYS-1-034','IYS-1-031','IYS-1-041']);
 const board=(seed,fourthId='IYS-1-026')=>{
  let s=toPhase(fresh(counts,seed),'main');
  readyAp(s);
  const piled=host028(s,0,'IYS-1-026',['IYS-1-034','IYS-1-031'],'energy');
  put(s,0,'IYS-1-004','energy',1);
  put(s,0,'IYS-1-029','energy',2);
  const fourth=put(s,0,fourthId,'energy',3);
  const incoming=take(s,0,'IYS-1-028');
  s.players[0].hand.push(incoming);
  return {s,incoming,fourth,...piled};
 };
 const finish=(s,incoming,host,base,under,fourth,mode)=>{
  assert.equal(s.pending,null);
  assert.equal(s.players[0].energy.filter(c=>c?.uid===incoming.uid).length,1);
  assert.equal(s.players[0].energy.filter(c=>c?.cardId==='IYS-1-028').length,1);
  assert.equal(s.players[0].energy.find(c=>c?.uid===incoming.uid).ready,false);
  assert.equal(s.players[0].hand.some(c=>c.uid===incoming.uid),false);
  assert.equal(s.players[0].energy.some(c=>c?.uid===host.uid),false);
  assert.equal(s.players[0].front.some(c=>c?.uid===host.uid),false);
  assert.equal(moved(s,incoming.uid,'energy').length,1);
  assert.equal(s.players[0].outside.filter(c=>c.uid===base.uid).length,1);
  assert.equal(under.every(card=>s.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
  assert.equal(s.players[0].energy.some(c=>c?.uid===fourth.uid),true);
  assert.equal(purple(s),4);
  if(mode==='hand'){
   assert.equal(s.players[0].hand.filter(c=>c.uid===host.uid).length,1);
   assert.equal(s.players[0].removed.some(c=>c.uid===host.uid),false);
   assert.equal(moved(s,host.uid,'hand').length,1);
   assert.ok(moved(s,host.uid,'hand')[0].order<moved(s,incoming.uid,'energy')[0].order);
  }else{
   assert.equal(s.players[0].removed.filter(c=>c.uid===host.uid).length,1);
   assert.equal(s.players[0].hand.some(c=>c.uid===host.uid),false);
   assert.equal(moved(s,host.uid,'removed').length,1);
   assert.ok(moved(s,host.uid,'removed')[0].order<moved(s,incoming.uid,'energy')[0].order);
  }
  assertUniversalMatch(packs,s);
 };
 let {s,incoming,host,base,under,fourth}=board(2825);
 const before=apReady(s);
 assert.equal(purple(s),4);
 const action=onto(s,incoming.uid,host.uid);
 assert.equal(action.line,'energy');
 s=use(s,action);
 assert.equal(s.pending.step,'leave');
 assert.equal(s.players[0].energy.some(c=>c?.uid===host.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===incoming.uid),true);
 assert.equal(apReady(s),before);
 assert.equal(purple(s),4);
 const receipt=s.pending.data.declaredUse;
 assert.equal(receipt.kind,'hand-use');
 assert.equal(receipt.required,4);
 assert.equal(receipt.available,4);
 assert.equal(receipt.cost,1);
 assert.equal(receipt.cardId,'IYS-1-028');
 assert.equal(Object.hasOwn(receipt,'skipEnergy'),false);
 s=roundTrip(s);
 const handed=choose(s,a=>a.mode==='hand');
 finish(handed,incoming,host,base,under,fourth,'hand');
 assert.equal(apReady(handed),before-1);
 const skipped=choose(s,a=>a.mode==='skip');
 finish(skipped,incoming,host,base,under,fourth,'skip');
 assert.equal(apReady(skipped),before-1);

 let short=board(2826,'IYS-1-041');
 assert.equal(purple(short.s),3);
 assert.equal(legal(short.s,a=>a.type==='play'&&a.uid===short.incoming.uid),false);
 assert.throws(()=>use(short.s,{type:'play',uid:short.incoming.uid,line:'energy',slot:0,
  replaceUid:short.host.uid}),/Action not currently legal/);
 assert.equal(short.s.players[0].hand.some(c=>c.uid===short.incoming.uid),true);
 assert.equal(short.s.players[0].energy.some(c=>c?.uid===short.host.uid),true);

 let forged=board(2827);
 forged.s=use(forged.s,onto(forged.s,forged.incoming.uid,forged.host.uid));
 forged.s=roundTrip(forged.s);
 const inflated=JSON.parse(JSON.stringify(forged.s));
 inflated.pending.data.declaredUse.available=99;
 assert.throws(()=>assertUniversalMatch(packs,inflated),/Forged displaced continuation/);
 assert.throws(()=>use(inflated,{type:'iys',mode:'hand'}),/Forged displaced continuation/);
 const flagged=JSON.parse(JSON.stringify(forged.s));
 flagged.pending.data.declaredUse.skipEnergy=true;
 assert.throws(()=>assertUniversalMatch(packs,flagged),/Forged displaced continuation/);
 assert.throws(()=>use(flagged,{type:'iys',mode:'skip'}),/Forged displaced continuation/);
 const missing=JSON.parse(JSON.stringify(forged.s));
 missing.pending.data.declaredUse.action.uid='0-missing';
 assert.throws(()=>assertUniversalMatch(packs,missing),/Forged displaced continuation/);
 assert.throws(()=>use(forged.s,{type:'iys',mode:'hand',skipEnergy:true}),/Action not currently legal/);
 assert.equal(forged.s.pending.step,'leave');
 assert.equal(apReady(forged.s),before);
});

test('three facedowns resume the paid play before the rested raid base',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-048','IYS-1-013','IYS-1-029','IYS-1-034','IYS-1-001','IYS-1-026','IYS-1-010']);
 let s=toPhase(fresh(counts,2815),'main');
 readyAp(s);
 const {host,base,under}=host028(s,0,'IYS-1-013',['IYS-1-029','IYS-1-034','IYS-1-001']);
 fillLine(s,'front',['IYS-1-026','IYS-1-010','IYS-1-048']);
 const incoming=take(s,0,'IYS-1-048');
 s.players[0].hand.push(incoming);
 const before=apReady(s);
 s=use(s,onto(s,incoming.uid,host.uid));
 assert.equal(s.pending.step,'leave');
 assert.equal(apReady(s),before);
 assert.equal(s.players[0].hand.some(c=>c.uid===incoming.uid),true);
 s=choose(s,a=>a.mode==='hand');
 assert.equal(s.players[0].front.filter(c=>c?.uid===incoming.uid).length,1);
 assert.equal(s.players[0].hand.filter(c=>c.uid===host.uid).length,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===base.uid),true);
 assert.equal(legal(s,a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(s.pending.step==='deploy',false);
 s=choose(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(s.pending.step,'deploy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===base.uid),false);
 assert.equal(s.players[0].front.some(c=>c?.uid===base.uid),false);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===base.uid&&a.line==='energy'&&a.slot===0);
 const returned=s.players[0].energy.find(c=>c?.uid===base.uid);
 assert.equal(returned.ready,false);
 assert.equal(s.players[0].front.filter(c=>c?.uid===incoming.uid).length,1);
 assert.equal(under.every(card=>s.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
 assert.equal(moved(s,host.uid,'hand').length,1);
 assert.equal(moved(s,incoming.uid,'front').length,1);
 assert.equal(moved(s,base.uid,'energy').length,1);
 assert.ok(moved(s,host.uid,'hand')[0].order<moved(s,incoming.uid,'front')[0].order);
 assert.ok(moved(s,incoming.uid,'front')[0].order<moved(s,base.uid,'energy')[0].order);
 assert.equal(apReady(s),before-1);
 assertUniversalMatch(packs,s);
});

test('a silenced or single facedown IYS-1-028 is removed by the paid play',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-029','IYS-1-013','IYS-1-034','IYS-1-004','IYS-1-026','IYS-1-010','IYS-1-001']);
 let silent=toPhase(fresh(counts,2816),'main');
 readyAp(silent);
 const source=put(silent,0,'IYS-1-001','energy',0);
 const {host}=host028(silent,0,'IYS-1-013',['IYS-1-034','IYS-1-004']);
 fillLine(silent,'front',['IYS-1-026','IYS-1-010','IYS-1-029']);
 grantContinuousState(silent,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:host.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 const quiet=take(silent,0,'IYS-1-029');
 silent.players[0].hand.push(quiet);
 silent=use(silent,onto(silent,quiet.uid,host.uid));
 assert.equal(silent.pending,null);
 assert.equal(silent.players[0].removed.filter(c=>c.uid===host.uid).length,1);
 assert.equal(silent.players[0].front.filter(c=>c?.uid===quiet.uid).length,1);
 assertUniversalMatch(packs,silent);

 let thin=toPhase(fresh(counts,2817),'main');
 readyAp(thin);
 const {host:single}=host028(thin,0,'IYS-1-013',['IYS-1-034']);
 fillLine(thin,'front',['IYS-1-026','IYS-1-010','IYS-1-001']);
 const plain=take(thin,0,'IYS-1-029');
 thin.players[0].hand.push(plain);
 thin=use(thin,onto(thin,plain.uid,single.uid));
 assert.equal(thin.pending,null);
 assert.equal(thin.players[0].removed.filter(c=>c.uid===single.uid).length,1);
 assert.equal(thin.players[0].front.filter(c=>c?.uid===plain.uid).length,1);
 assertUniversalMatch(packs,thin);
});

test('paid raid, STEP and rule move wait for IYS-1-028, and moving 028 is not a leave',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-046','IYS-1-042','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-013','IYS-1-034','IYS-1-004','IYS-1-029','IYS-1-026','IYS-1-053','IYS-1-050']);
 let raid=toPhase(fresh(counts,2818),'main');
 readyAp(raid);
 payRed(raid);
 const base042=put(raid,0,'IYS-1-042','energy',3);
 const {host,base,under}=host028(raid,0,'IYS-1-013',['IYS-1-034','IYS-1-004']);
 fillLine(raid,'front',['IYS-1-029','IYS-1-026','IYS-1-050']);
 const raider=take(raid,0,'IYS-1-046');
 raid.players[0].hand.push(raider);
 const ap=apReady(raid);
 raid=use(raid,legalUniversalActions(packs,raid).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===base042.uid&&a.replaceUid===host.uid));
 assert.equal(raid.pending.step,'leave');
 assert.equal(raid.pending.data.declaredUse.kind,'hand-use');
 assert.ok(raid.pending.data.declaredUse.available>=raid.pending.data.declaredUse.required);
 assert.equal(raid.players[0].hand.some(c=>c.uid===raider.uid),true);
 assert.equal(raid.players[0].energy.some(c=>c?.uid===base042.uid),true);
 assert.equal(apReady(raid),ap);
 raid=choose(raid,a=>a.mode==='hand');
 const top=raid.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(top.stack?.[0]?.uid,base042.uid);
 assert.equal(raid.players[0].hand.filter(c=>c.uid===host.uid).length,1);
 assert.equal(raid.players[0].outside.filter(c=>c.uid===base.uid).length,1);
 assert.equal(under.every(card=>raid.players[0].outside.filter(c=>c.uid===card.uid).length===1),true);
 assert.equal(moved(raid,base042.uid,'raid-under').length,1);
 assert.equal(moved(raid,raider.uid,'front').length,1);
 assert.equal(apReady(raid),ap-1);
 assert.equal(raid.pending,null);
 assertUniversalMatch(packs,raid);

 let step=toPhase(fresh(counts,2819),'move');
 const stepped=put(step,0,'IYS-1-053','front',0);
 const energyHost=host028(step,0,'IYS-1-013',['IYS-1-034','IYS-1-004'],'energy');
 fillLine(step,'energy',['IYS-1-041','IYS-1-045','IYS-1-062']);
 step=use(step,onto(step,stepped.uid,energyHost.host.uid,'step'));
 assert.equal(step.pending.step,'leave');
 assert.equal(step.pending.data.declaredUse.kind,'line-shift');
 assert.equal(step.players[0].front.some(c=>c?.uid===stepped.uid),true);
 assert.equal(step.players[0].energy.some(c=>c?.uid===energyHost.host.uid),true);
 step=choose(step,a=>a.mode==='hand');
 assert.equal(step.pending,null);
 assert.equal(step.players[0].energy.filter(c=>c?.uid===stepped.uid).length,1);
 assert.equal(step.players[0].hand.filter(c=>c.uid===energyHost.host.uid).length,1);
 assert.equal(moved(step,stepped.uid,'energy').length,1);
 assert.equal(moved(step,energyHost.host.uid,'hand').length,1);
 assertUniversalMatch(packs,step);

 let shift=toPhase(fresh(counts,2820),'move');
 const mover=put(shift,0,'IYS-1-050','energy',0);
 const frontHost=host028(shift,0,'IYS-1-013',['IYS-1-034','IYS-1-004']);
 fillLine(shift,'front',['IYS-1-029','IYS-1-026','IYS-1-053']);
 shift=use(shift,onto(shift,mover.uid,frontHost.host.uid,'move'));
 assert.equal(shift.pending.step,'leave');
 assert.equal(shift.players[0].energy.some(c=>c?.uid===mover.uid),true);
 shift=choose(shift,a=>a.mode==='skip');
 assert.equal(shift.pending,null);
 assert.equal(shift.players[0].front.filter(c=>c?.uid===mover.uid).length,1);
 assert.equal(shift.players[0].removed.filter(c=>c.uid===frontHost.host.uid).length,1);
 assert.equal(moved(shift,mover.uid,'front').length,1);
 assert.equal(moved(shift,frontHost.host.uid,'removed').length,1);
 assertUniversalMatch(packs,shift);

 let own=toPhase(fresh(counts,2821),'move');
 const walking=host028(own,0,'IYS-1-013',['IYS-1-034','IYS-1-004'],'energy');
 own=use(own,legalUniversalActions(packs,own).find(a=>a.type==='move'&&a.uid===walking.host.uid&&
  a.slot===0&&a.replaceUid===undefined));
 assert.equal(own.pending,null);
 assert.equal(own.players[0].front.find(c=>c?.uid===walking.host.uid).under.length,2);
 assert.equal(own.players[0].hand.some(c=>c.uid===walking.host.uid),false);
 assert.equal(own.players[0].removed.some(c=>c.uid===walking.host.uid),false);
 assert.equal(moved(own,walking.host.uid,'front').length,1);
 assertUniversalMatch(packs,own);

 let crowded=toPhase(fresh(counts,2822),'move');
 const traveler=host028(crowded,1,'IYS-1-013',['IYS-1-034','IYS-1-004'],'energy');
 const vanilla=put(crowded,0,'IYS-1-050','front',0);
 fillLine(crowded,'front',['IYS-1-029','IYS-1-026','IYS-1-053']);
 crowded=use(crowded,onto(crowded,traveler.host.uid,vanilla.uid,'move'));
 assert.equal(crowded.pending,null);
 assert.equal(crowded.players[0].front.find(c=>c?.uid===traveler.host.uid).under.length,2);
 assert.equal(crowded.players[0].removed.filter(c=>c.uid===vanilla.uid).length,1);
 assert.equal(crowded.players[0].hand.some(c=>c.uid===traveler.host.uid),false);
 assertUniversalMatch(packs,crowded);
});

test('an effect entry onto IYS-1-028 spends the earlier play once',()=>{
 const counts=countsFor(['IYS-1-008','IYS-1-004','IYS-1-028','IYS-1-013','IYS-1-034','IYS-1-029','IYS-1-001','IYS-1-010','IYS-1-012','IYS-1-026']);
 let s=toPhase(fresh(counts,2823),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
 put(s,0,'IYS-1-012','energy',2);
 const {host}=host028(s,0,'IYS-1-013',['IYS-1-034','IYS-1-029']);
 fillLine(s,'front',['IYS-1-026','IYS-1-010','IYS-1-001']);
 const recruit=take(s,0,'IYS-1-004');
 s.players[0].outside.push(recruit);
 const sesshomaru=take(s,0,'IYS-1-008');
 s.players[0].hand.push(sesshomaru);
 s.players[0].nextPrintedEnergyApCut={turn:s.turn,amount:1};
 const before=apReady(s);
 s=use(s,onto(s,sesshomaru.uid,host.uid));
 assert.equal(s.pending.step,'leave');
 assert.equal(apReady(s),before);
 assert.equal(s.players[0].nextPrintedEnergyApCut.amount,1);
 assert.equal(s.players[0].hand.some(c=>c.uid===sesshomaru.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===recruit.uid),true);
 s=choose(s,a=>a.mode==='hand');
 assert.equal(s.pending.step,'deploy');
 assert.equal(s.players[0].front.filter(c=>c?.uid===sesshomaru.uid).length,1);
 assert.equal(s.players[0].hand.filter(c=>c.uid===host.uid).length,1);
 assert.equal(s.players[0].nextPrintedEnergyApCut,null);
 assert.equal(apReady(s),before-1);
 assert.equal(moved(s,sesshomaru.uid,'front').length,1);
 s=roundTrip(s);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===recruit.uid&&a.line==='energy');
 const entered=s.players[0].energy.find(c=>c?.uid===recruit.uid);
 assert.equal(entered.ready,false);
 assert.equal(moved(s,recruit.uid,'energy').length,1);
 assert.equal(s.players[0].front.filter(c=>c?.uid===sesshomaru.uid).length,1);
 assert.equal(apReady(s),before-1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let entry=toPhase(fresh(counts,2824),'main');
 readyAp(entry);
 put(entry,0,'IYS-1-001','energy',0);
 put(entry,0,'IYS-1-010','energy',1);
 put(entry,0,'IYS-1-012','energy',2);
 const occupied=host028(entry,0,'IYS-1-013',['IYS-1-034','IYS-1-029']);
 fillLine(entry,'front',['IYS-1-026','IYS-1-010','IYS-1-001']);
 const outside=take(entry,0,'IYS-1-004');
 entry.players[0].outside.push(outside);
 const played=take(entry,0,'IYS-1-008');
 entry.players[0].hand.push(played);
 const spent=apReady(entry);
 entry=play(entry,played.uid,'play','energy');
 assert.equal(entry.pending.step,'deploy');
 assert.equal(entry.players[0].energy.filter(c=>c?.uid===played.uid).length,1);
 assert.equal(apReady(entry),spent-2);
 entry=choose(entry,a=>a.mode==='deploy'&&a.uid===outside.uid&&a.replaceUid===occupied.host.uid);
 assert.equal(entry.pending.step,'leave');
 assert.equal(entry.players[0].front.some(c=>c?.uid===occupied.host.uid),true);
 assert.equal(entry.players[0].outside.some(c=>c.uid===outside.uid),true);
 assert.equal(apReady(entry),spent-2);
 entry=roundTrip(entry);
 entry=choose(entry,a=>a.mode==='hand');
 const rested=entry.players[0].front.find(c=>c?.uid===outside.uid);
 assert.equal(rested.ready,false);
 assert.equal(entry.players[0].hand.filter(c=>c.uid===occupied.host.uid).length,1);
 assert.equal(entry.players[0].energy.filter(c=>c?.uid===played.uid).length,1);
 assert.equal(moved(entry,outside.uid,'front').length,1);
 assert.equal(moved(entry,played.uid,'energy').length,1);
 assert.equal(apReady(entry),spent-2);
 assert.equal(entry.pending,null);
 assertUniversalMatch(packs,entry);
});

test('IYS-1-046 double attack survives a legal leave and does not return with the card',()=>{
 const counts=countsFor(['IYS-1-046','IYS-1-049','IYS-1-042','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-050','IYS-1-053']);
 let s=toPhase(fresh(counts,4605),'main');
 readyAp(s);
 payRed(s);
 const base=put(s,0,'IYS-1-042','front',0,true);
 const raider=take(s,0,'IYS-1-046');
 s.players[0].hand.push(raider);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===base.uid&&a.line!=='energy');
 if(!raid)throw Error('No raid onto the named base');
 s=use(s,raid);
 const actor=take(s,0,'IYS-1-049');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 s=use(s,{type:'activate',uid:actor.uid,mode:'iys:0'});
 s=choose(s,a=>a.uid===raider.uid);
 s=choose(s,a=>a.mode==='skip');
 s=use(s,{type:'activate',uid:raider.uid,mode:'iys:0'});
 s=choose(s,a=>a.mode==='double');
 const body=s.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(body.readyOnAttackGranted.stamp,body.fieldEntryStamp);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|doubleAttack'),true);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|main'),true);
 assert.deepEqual(s.energyDoubles,[0,0]);
 const forged=structuredClone(s);
 forged.mainAbilityUsedUids.push(raider.uid+'|double');
 assert.throws(()=>assertUniversalMatch(packs,forged),/Forged generated-energy doubling/);
 const missing=structuredClone(s);
 missing.mainAbilityUsedUids=missing.mainAbilityUsedUids.filter(k=>k!==raider.uid+'|doubleAttack');
 assert.throws(()=>assertUniversalMatch(packs,missing),/Forged double-attack grant/);
 fillLine(s,'front',['IYS-1-050','IYS-1-053','IYS-1-041']);
 const kirara=take(s,0,'IYS-1-050');
 s.players[0].hand.push(kirara);
 assert.equal(apReady(s),1);
 s=use(s,onto(s,kirara.uid,raider.uid));
 assert.equal(s.pending,null);
 const removed=s.players[0].removed.find(c=>c.uid===raider.uid);
 assert.equal(removed.readyOnAttackGranted,undefined);
 assert.equal(s.players[0].front.filter(c=>c?.uid===kirara.uid).length,1);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|doubleAttack'),true);
 assert.equal(s.mainAbilityUsedUids.includes(raider.uid+'|double'),false);
 assert.deepEqual(s.energyDoubles,[0,0]);
 assertUniversalMatch(packs,s);
 s.players[0].removed.splice(s.players[0].removed.indexOf(removed),1);
 s.players[0].hand.push(removed);
 readyAp(s);
 const inu=s.players[0].energy.find(c=>c?.cardId==='IYS-1-045');
 const replay=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===raider.uid&&
  a.baseUid===inu.uid&&a.line!=='energy');
 if(!replay)throw Error('046 cannot re-enter');
 s=use(s,replay);
 const again=s.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(again.readyOnAttackGranted,undefined);
 assert.equal(again.ready,true);
 assert.equal(again.stack?.[0]?.uid,inu.uid);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===raider.uid),false);
 assertUniversalMatch(packs,s);
 crown(s,1,'IYS-1-053');
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:raider.uid});
 s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 if(s.pending?.kind==='life-trigger')s=choose(s,a=>a.mode==='skip'||a.uid===null);
 const rested=s.players[0].front.find(c=>c?.uid===raider.uid);
 assert.equal(rested.ready,false);
 assert.equal(legal(s,a=>a.type==='attack'&&a.uid===raider.uid),false);
 assert.deepEqual(s.energyDoubles,[0,0]);
 assertUniversalMatch(packs,s);
});
