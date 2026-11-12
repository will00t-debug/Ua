// Local battle-page positions for the effect audit. A normal match never
// loads this module. The board is a real V2 match; the browser then uses the
// same legal buttons as a player.
import {createAotV2Pack} from './aot-pack.mjs';
import {createBleachV2Pack} from './bleach-pack.mjs';
import {createCsmV2Pack} from './csm-pack.mjs';
import {createIysV2Pack} from './iys-pack.mjs';
import {createKmrV2Pack} from './kmr-pack.mjs';
import {createStgV2Pack} from './stg-pack.mjs';
import {createKmrBattlePack} from './official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalEnergyByColor,universalPublicView}
 from './engine.mjs';
import {createUniversalPack,validateUniversalDeck} from './pack.mjs';
import {makeUniversalPreviewReplay} from './preview-replay.mjs';

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
function counts(pack,required,extras={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},out={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=extras[id]||1;
  if(Object.prototype.hasOwnProperty.call(caps,trigger)){
   copies=Math.min(copies,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  out[id]=copies;
 }
 let total=Object.values(out).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(pack.cards[id].maxCopies||4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  out[id]=(out[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 if(total!==50)throw Error('Audit deck is '+total);
 const issues=validateUniversalDeck(pack,out);
 if(issues.length)throw Error(issues.join('; '));
 return out;
}
function open(pack,seed,required,extras){
 const decks=[counts(pack,required,extras),counts(pack,required,extras)];
 return {pack,decks,seed,state:newUniversalMatch([pack,pack],{decks,seed,first:0})};
}
function finish(pack,built,label){
 const packs=[pack,pack];
 assertUniversalMatch(packs,built.state);
 return {packs,state:built.state,label,
  replay:makeUniversalPreviewReplay(packs,{decks:built.decks,seed:built.seed,first:0})};
}

export function loadAuditFixture(name){
 if(name==='kmr054')return heatMetal();
 if(name==='csm008')return denji();
 if(name==='csm056')return hayakawaFacedown();
 if(name==='csm056raid')return hayakawaRaidReady();
 if(name==='csm055act')return akiActivateReady();
 if(name==='iys028')return narakuLeave();
 if(name==='iys028energy')return energySqueeze();
 if(name==='iys046')return inuyashaDouble();
 if(name==='aot010')return leviTrigger();
 if(name==='aot011')return leviSniper();
 if(name==='aot2017')return jawStep();
 if(name==='aot2016')return falcoLook();
 if(name==='stg006')return rukaActivate();
 if(name==='blc067dual')return kenpachiDual();
 if(name==='kmr085')return faizTopFacedown();
 if(name==='aot2008')return mikasaImpactLife();
 if(name==='iys044')return inuyashaActiveEntry();
 throw Error('Unknown audit fixture '+name);
}
function rukaActivate(){
 const pack=createStgV2Pack();
 const built=open(pack,6006,['STG-1-006','STG-1-001'],{'STG-1-006':2,'STG-1-001':2});
 const s=built.state;
 ready(s);
 const source=put(s,0,'STG-1-006','energy',0,true);
 const ally=put(s,0,'STG-1-001','front',0,true);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 const packs=[pack,pack];
 const acts=legalUniversalActions(packs,s).filter(a=>a.type==='activate');
 if(acts.length!==1||acts[0].uid!==source.uid||acts[0].mode!=='selfRestBuff')
  throw Error('STG-1-006 audit activate is '+JSON.stringify(acts));
 if(!source.ready||universalBp(packs,s,ally)!==2000)
  throw Error('STG-1-006 audit board is not ready to activate');
 const readyAp=s.players[0].apCards.filter(card=>card.ready).length;
 if(readyAp!==3)throw Error('STG-1-006 audit AP is '+readyAp);
 built.audit={source:source.uid,ally:ally.uid};
 return finish(pack,built,
  '稽核 STG-1-006：點能源線漆原琉華，按「啟動」，再按「確認發動」。然後指定阿萬音鈴羽。漆原轉為休息，阿萬音本回合 BP＋1000，AP 維持 3。之後可按下一階段。');
}
function kenpachiDual(){
 const pack=createBleachV2Pack();
 const built=open(pack,2067,['BLC-2-067','BLC-4-070','BLC-1-083'],
  {'BLC-2-067':2,'BLC-4-070':4,'BLC-1-083':2});
 const s=built.state;
 ready(s);
 const bases=[];
 for(let slot=0;slot<4;slot++)bases.push(put(s,0,'BLC-4-070','energy',slot,true));
 const occupant=put(s,0,'BLC-1-083','front',0,true);
 const incoming=take(s,0,'BLC-2-067');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(incoming);
 const packs=[pack,pack];
 const legal=legalUniversalActions(packs,s).filter(a=>a.uid===incoming.uid);
 const normal=legal.find(a=>a.type==='play'&&a.line==='front'&&a.slot===1&&a.replaceUid===undefined);
 const raid=legal.find(a=>a.type==='raid'&&a.baseUid===bases[0].uid&&a.slot===1&&a.line!=='energy');
 const squeeze=legal.find(a=>a.type==='play'&&a.line==='energy'&&a.slot===0&&a.replaceUid===bases[0].uid);
 if(!normal||!raid||!squeeze)throw Error('BLC-2-067 does not have both entry modes');
 if(legal.some(a=>a.line==='front'&&a.slot===0))
  throw Error('The occupied non-base front cell is selectable');
 const green=universalEnergyByColor(packs,s,0).green||0;
 if(green!==4)throw Error('BLC-2-067 audit energy is '+green);
 built.audit={hand:incoming.uid,base:bases[0].uid,occupant:occupant.uid};
 return finish(pack,built,
  '稽核 BLC-2-067：同一張手牌可普通登場或突襲。能源線 4 張更木剣八是合法底板。前線第 1 格的日番谷冬獅郎不能當底板，也不能被這張手牌佔用。');
}
function heatMetal(){
 const pack=createKmrBattlePack();
 const built=open(pack,54054,['KMR-2-054','KMR-2-020','KMR-1-010','KMR-2-059']);
 const s=built.state;
 s.pending=null;s.phase='attack';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 const heat=put(s,0,'KMR-2-054','front',0,true);
 const wall=put(s,1,'KMR-1-010','front',0,true);
 wall.buffs=[{bp:4000,untilTurn:s.turn}];
 heat.kmr2EnteredBy={id:'KMR-2-059',name:'メモリチェンジ',turn:s.turn};
 const seen=take(s,0,'KMR-2-020');
 s.players[0].deck.unshift(seen);
 return finish(pack,built,
  '稽核 KMR-2-054：宣告假面騎士W 炙熱金屬攻擊。電腦會阻擋。再選查看牌頂或抽牌。阻擋者 BP 較高，戰鬥後雙方都留在場上，且只結算一次。');
}
function denji(){
 const pack=createCsmV2Pack();
 const built=open(pack,1008,[
  'CSM-1-008','CSM-1-022','CSM-1-036','CSM-1-038','CSM-1-001','CSM-1-025','CSM-1-003','CSM-1-002'
 ],{'CSM-1-008':2,'CSM-1-001':2});
 const s=built.state;
 s.pending=null;s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
 put(s,0,'CSM-1-001','front',0,true);
 const looked=['CSM-1-036','CSM-1-022','CSM-1-038'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...looked);
 const looker=take(s,0,'CSM-1-008');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(looker);
 const play=legalUniversalActions([pack,pack],s).find(a=>a.type==='play'&&a.uid===looker.uid);
 if(!play)throw Error('CSM-1-008 cannot be played from this audit position');
 return finish(pack,built,
  '稽核 CSM-1-008：普通登場淀治。查看三張、選真紀真加入手牌、排列其餘、放到場外，再選擇後續效果。');
}
function playHayakawa(pack,s,owner){
 s.active=owner;
 s.phase='main';
 s.pending=null;
 for(const ap of s.players[owner].apCards){ap.inPlay=true;ap.ready=true;}
 put(s,owner,'CSM-1-060','energy',0,true);
 put(s,owner,'CSM-1-060','energy',1,true);
 const tucked=['CSM-1-062','CSM-1-067','CSM-1-057'].map(id=>take(s,owner,id));
 s.players[owner].deck.unshift(...tucked);
 const aki=take(s,owner,'CSM-1-056');
 s.players[owner].hand.push(aki);
 const packs=[pack,pack];
 const play=legalUniversalActions(packs,s).find(action=>action.type==='play'&&
  action.uid===aki.uid&&action.line==='front'&&action.slot===0);
 if(!play)throw Error('CSM-1-056 cannot be played from this audit position');
 const next=dispatchUniversalAction(packs,s,play,{actor:owner});
 if(next.pending)throw Error('CSM-1-056 on-play opened an unexpected choice');
 const host=next.players[owner].front.find(card=>card?.uid===aki.uid);
 if(!host?.under||host.under.length!==3)throw Error('CSM-1-056 did not tuck three cards');
 return next;
}
function hayakawaFacedown(){
 const pack=createCsmV2Pack();
 const built=open(pack,56056,[
  'CSM-1-056','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-057'
 ],{'CSM-1-056':2,'CSM-1-060':4});
 built.state=playHayakawa(pack,built.state,0);
 built.state=playHayakawa(pack,built.state,1);
 built.state.active=0;
 built.state.phase='main';
 built.state.pending=null;
 return finish(pack,built,
  '稽核鍊鋸人裡向卡：雙方都已用早川秋的登場時，從牌組頂蓋三張。控制者看得到卡名與卡圖，對手只看到卡背。');
}
function act(pack,built,action){
 built.state=dispatchUniversalAction([pack,pack],built.state,action);
 return built.state;
}
function pick(pack,built,pred){
 const packs=[pack,pack];
 const action=legalUniversalActions(packs,built.state).find(pred);
 if(!action)throw Error('No audit action '+(built.state.pending?.step||built.state.phase)+' '+
  JSON.stringify(legalUniversalActions(packs,built.state).slice(0,6)));
 return act(pack,built,action);
}
function ready(s){
 s.pending=null;s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function hayakawaRaidReady(){
 const pack=createCsmV2Pack();
 const built=open(pack,56112,[
  'CSM-1-056','CSM-1-052','CSM-1-057','CSM-1-060','CSM-1-062','CSM-1-067'
 ],{'CSM-1-056':2,'CSM-1-057':2,'CSM-1-060':4});
 const s=built.state;
 ready(s);
 put(s,0,'CSM-1-060','energy',0);
 put(s,0,'CSM-1-060','energy',1);
 const base=put(s,0,'CSM-1-052','front',0,true);
 const decoy=put(s,0,'CSM-1-057','front',1,true);
 const tucked=['CSM-1-062','CSM-1-067','CSM-1-057'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...tucked);
 const aki=take(s,0,'CSM-1-056');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(aki);
 const packs=[pack,pack];
 const legal=legalUniversalActions(packs,s);
 const raids=legal.filter(action=>action.type==='raid'&&action.uid===aki.uid);
 if(!raids.some(action=>action.baseUid===base.uid&&action.slot===0&&action.line!=='energy'))
  throw Error('CSM-1-056 cannot raid onto CSM-1-052');
 if(raids.some(action=>action.baseUid===decoy.uid))
  throw Error('CSM-1-057 was treated as an Aki raid base');
 if(!legal.some(action=>action.type==='play'&&action.uid===aki.uid))
  throw Error('Ordinary play should stay available beside the raid');
 if((universalEnergyByColor(pack,s,0).red||0)<4)
  throw Error('CSM-1-056 raid does not have four red energy');
 if(!s.players[0].apCards.some(card=>card.inPlay&&card.ready))
  throw Error('CSM-1-056 raid does not have a ready AP');
 return finish(pack,built,
  '稽核 CSM-1-056：手牌早川秋可突襲到場上的 CSM-1-052。帕瓦不是底板。突襲支付 1 AP，疊放並活動，框外登場時使 BP+1000 並蓋三張；框內的攻擊時效果此時不發動。');
}
function akiActivateReady(){
 const pack=createCsmV2Pack();
 const built=open(pack,55155,[
  'CSM-1-055','CSM-1-052','CSM-1-001','CSM-1-049','CSM-1-057','CSM-1-041'
 ],{'CSM-1-057':2});
 const s=built.state;
 ready(s);
 const aki=put(s,0,'CSM-1-055','front',0,true);
 const decoy=put(s,0,'CSM-1-052','front',1,true);
 const looked=['CSM-1-001','CSM-1-049','CSM-1-057'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...looked);
 const payment=take(s,0,'CSM-1-041');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(payment);
 const packs=[pack,pack];
 const legal=legalUniversalActions(packs,s);
 const activations=legal.filter(action=>action.type==='activate');
 if(activations.length!==1||activations[0].uid!==aki.uid||activations[0].mode!=='csm:0')
  throw Error('CSM-1-055 activation is not the only legal activate');
 if(legal.some(action=>action.type==='activate'&&action.uid===decoy.uid))
  throw Error('CSM-1-052 offered an activation');
 return finish(pack,built,
  '稽核 CSM-1-055：只點場上的早川秋會出現啟動。支付手牌後選擇查看三張，小紅不能選，帕瓦可以加入手牌。同一張不能再啟動。');
}
function narakuLeave(){
 const pack=createIysV2Pack();
 const built=open(pack,28028,[
  'IYS-1-028','IYS-1-013','IYS-1-034','IYS-1-004','IYS-1-029','IYS-1-026','IYS-1-001','IYS-1-010'
 ]);
 const s=built.state;
 ready(s);
 const host=put(s,0,'IYS-1-028','front',0,true);
 const base=take(s,0,'IYS-1-013');
 host.stack=[base];
 host.under=['IYS-1-034','IYS-1-004'].map(id=>{const card=take(s,0,id);card.faceDown=true;return card;});
 for(const [slot,id] of [[1,'IYS-1-026'],[2,'IYS-1-001'],[3,'IYS-1-010']])put(s,0,id,'front',slot,true);
 const incoming=take(s,0,'IYS-1-029');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(incoming);
 const play=legalUniversalActions([pack,pack],s).find(a=>a.type==='play'&&
  a.uid===incoming.uid&&a.replaceUid===host.uid&&a.line==='front');
 if(!play)throw Error('IYS-1-029 cannot replace IYS-1-028 from this audit position');
 return finish(pack,built,
  '稽核 IYS-1-028：點手牌白童子，再點前線第 1 格的奈落。離場代替出現後按「加入手牌」。奈落應進手牌，白童子佔該格，AP 少 1。');
}
function energySqueeze(){
 const pack=createIysV2Pack();
 const built=open(pack,28028,[
  'IYS-1-028','IYS-1-004','IYS-1-029','IYS-1-026','IYS-1-034','IYS-1-031'
 ],{'IYS-1-028':2,'IYS-1-026':2});
 const s=built.state;
 ready(s);
 const host=put(s,0,'IYS-1-028','energy',0,true);
 const base=take(s,0,'IYS-1-026');
 host.stack=[base];
 host.under=['IYS-1-034','IYS-1-031'].map(id=>{const card=take(s,0,id);card.faceDown=true;return card;});
 put(s,0,'IYS-1-004','energy',1,true);
 put(s,0,'IYS-1-029','energy',2,true);
 put(s,0,'IYS-1-026','energy',3,true);
 const incoming=take(s,0,'IYS-1-028');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(incoming);
 const packs=[pack,pack];
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===incoming.uid&&a.replaceUid===host.uid&&a.line==='energy'&&a.slot===0);
 if(!play)throw Error('Hand IYS-1-028 cannot replace the energy-line copy');
 const purple=universalEnergyByColor(packs,s,0).purple||0;
 if(purple!==4)throw Error('Purple energy is '+purple);
 return finish(pack,built,
  '稽核 IYS-1-028：能源恰好 4 紫。點手牌奈落。先按「改為突襲進場」，再按「改為普通進場」。然後點能源線最左邊 BP 4000 的奈落，確認擠位，再按「加入手牌」。新奈落休息佔該格，舊奈落進手牌，AP 少 1。');
}
function inuyashaDouble(){
 const pack=createIysV2Pack();
 const built=open(pack,46046,[
  'IYS-1-046','IYS-1-049','IYS-1-042','IYS-1-041','IYS-1-045','IYS-1-062','IYS-1-050','IYS-1-053'
 ],{'IYS-1-050':2});
 let s=built.state;
 ready(s);
 put(s,0,'IYS-1-041','energy',0,true);
 put(s,0,'IYS-1-045','energy',1,true);
 put(s,0,'IYS-1-062','energy',2,true);
 const base=put(s,0,'IYS-1-042','front',0,true);
 const raider=take(s,0,'IYS-1-046');
 s.players[0].hand.push(raider);
 const raidAction=legalUniversalActions([pack,pack],s).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===base.uid&&a.slot===0);
 if(!raidAction)throw Error('No in-place raid');
 act(pack,built,raidAction);
 s=built.state;
 const actor=take(s,0,'IYS-1-049');
 s.players[0].hand.push(actor);
 pick(pack,built,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'&&a.replaceUid===undefined);
 s=built.state;
 pick(pack,built,a=>a.type==='activate'&&a.uid===actor.uid);
 pick(pack,built,a=>a.uid===raider.uid);
 pick(pack,built,a=>a.mode==='skip');
 pick(pack,built,a=>a.type==='activate'&&a.uid===raider.uid);
 s=built.state;
 if(s.pending?.step!=='replaceKit')throw Error('046 did not offer double attack');
 const fillers=['IYS-1-053','IYS-1-050'];
 let filler=0;
 for(let slot=0;slot<4;slot++){
  if(s.players[0].front[slot])continue;
  put(s,0,fillers[filler++],'front',slot,true);
 }
 const kirara=take(s,0,'IYS-1-050');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(kirara);
 const readyAp=s.players[0].apCards.filter(c=>c.ready).length;
 if(readyAp!==1)throw Error('046 audit AP is '+readyAp);
 if(!s.players[0].front.every(Boolean))throw Error('046 audit front is not full');
 const choice=legalUniversalActions([pack,pack],s).find(a=>a.mode==='double');
 if(!choice)throw Error('046 audit is not waiting on double attack');
 return finish(pack,built,
  '稽核 IYS-1-046：先按「獲得再次攻擊」。再點手牌雲母，點前線犬夜叉那格，普通登場擠掉它。不應出現錯誤。犬夜叉進移除區，雲母佔該格。');
}
function setLife(s,p,ids){
 const life=ids.map(id=>take(s,p,id));
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=life;
}
function leviTrigger(){
 const pack=createAotV2Pack();
 const built=open(pack,10010,[
  'AOT-1-010','AOT-1-001','AOT-1-003','AOT-1-009','AOT-1-002'
 ],{'AOT-1-001':2,'AOT-1-003':2});
 const s=built.state;
 ready(s);
 s.phase='attack';
 const source=put(s,0,'AOT-1-010','front',0,true);
 const ally=put(s,0,'AOT-1-001','front',1,false);
 const other=put(s,0,'AOT-1-003','front',2,true);
 put(s,1,'AOT-1-001','front',0,false);
 setLife(s,1,['AOT-1-009','AOT-1-003']);
 const attack=legalUniversalActions([pack,pack],s).find(a=>a.type==='attack'&&a.uid===source.uid&&!a.targetUid);
 if(!attack)throw Error('AOT-1-010 cannot attack from this audit position');
 built.audit={source:source.uid,ally:ally.uid,other:other.uid};
 return finish(pack,built,
  '稽核 AOT-1-010：宣告利威爾攻擊。按「支付」，再按艾爾文的「給予這個回合的能力」。對手不能阻擋。顏色觸發應可將韓吉返回手牌，不能選休息的艾爾文。');
}
function leviSniper(){
 const pack=createAotV2Pack();
 const built=open(pack,10011,[
  'AOT-1-011','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001','AOT-1-003'
 ],{'AOT-1-003':4});
 const s=built.state;
 ready(s);
 for(const [slot,id] of [[0,'AOT-1-002'],[1,'AOT-1-006'],[2,'AOT-1-015'],[3,'AOT-1-016']])
  put(s,0,id,'energy',slot,true);
 const host=put(s,0,'AOT-1-007','front',0,true);
 const wall=put(s,1,'AOT-1-001','front',0,true);
 setLife(s,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
 const raider=take(s,0,'AOT-1-011');
 s.players[0].hand.push(raider);
 pick(pack,built,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid);
 const levi=built.state.players[0].front.find(c=>c?.uid===raider.uid);
 if(!levi?.ready||levi.aotThirdSniper?.done!==true)throw Error('Raided Levi did not gain the third-attack sniper');
 built.state.phase='attack';
 built.state.pending=null;
 const attack=legalUniversalActions([pack,pack],built.state).find(a=>a.type==='attack'&&a.uid===raider.uid&&!a.targetUid);
 if(!attack)throw Error('Raided Levi cannot attack');
 built.audit={levi:raider.uid,wall:wall.uid};
 return finish(pack,built,
  '稽核 AOT-1-011：利威爾已突襲。第一次攻擊後按「不發動」。第二次攻擊後按「支付」。第三次按「狙擊攻擊」打艾爾文，沒有阻擋，結束後不再出現支付。');
}
function falcoLook(){
 const pack=createAotV2Pack();
 const built=open(pack,20016,['AOT-2-001','AOT-2-004','AOT-2-016','AOT-2-020'],
  {'AOT-2-001':4,'AOT-2-020':4});
 const s=built.state;
 ready(s);
 put(s,0,'AOT-2-001','energy',0,true);
 const cards=['AOT-2-020','AOT-2-004','AOT-2-020'].map(id=>take(s,0,id));
 for(const card of [...cards].reverse())s.players[0].deck.unshift(card);
 const payment=take(s,0,'AOT-2-001');
 s.players[0].hand.push(payment);
 const falco=take(s,0,'AOT-2-016');
 s.players[0].hand.push(falco);
 pick(pack,built,a=>a.type==='play'&&a.uid===falco.uid&&a.line==='front'&&a.replaceUid===undefined);
 if(built.state.pending?.step!=='lookPick')throw Error('Falco did not open the private look');
 const packs=[pack,pack];
 const reveals=universalPublicView(packs,built.state,1).publicReveals;
 if(reveals.some(entry=>cards.some(card=>card.uid===entry.uid)))
  throw Error('The private look published its window');
 built.audit={window:cards.map(card=>card.uid),take:cards[1].uid,payment:payment.uid};
 return finish(pack,built,
  '稽核 AOT-2-016：查看牌組頂三張。不能選的卡留在畫面上。選完之後，對手只看得到公開的那張。');
}
function jawStep(){
 const pack=createAotV2Pack();
 const built=open(pack,20017,[
  'AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-015','AOT-2-017'
 ],{'AOT-2-001':2,'AOT-2-017':2});
 const s=built.state;
 ready(s);
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-003','energy',1,true);
 put(s,0,'AOT-2-001','energy',2,true);
 const ordinary=take(s,0,'AOT-2-017');
 s.players[0].hand.push(ordinary);
 pick(pack,built,a=>a.type==='play'&&a.uid===ordinary.uid&&a.line==='front'&&a.slot===2&&a.replaceUid===undefined);
 if(built.state.pending)throw Error('Ordinary Jaw Falco opened an effect');
 const base=put(built.state,0,'AOT-2-015','front',0,true);
 const raider=take(built.state,0,'AOT-2-017');
 built.state.players[0].hand.push(raider);
 pick(pack,built,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 if(built.state.pending?.step!=='tuck')throw Error('Raided Jaw Falco did not offer the tuck');
 pick(pack,built,a=>a.mode==='done');
 if(built.state.pending)throw Error('Skipping the tuck left a choice open');
 built.state.phase='move';
 const packs=[pack,pack];
 const legal=legalUniversalActions(packs,built.state);
 if(legal.some(a=>a.type==='step'&&a.uid===ordinary.uid))
  throw Error('Ordinary Jaw Falco still offers STEP');
 if(!legal.some(a=>a.type==='step'&&a.uid===raider.uid))
  throw Error('Raided Jaw Falco does not offer STEP');
 built.audit={ordinary:ordinary.uid,raider:raider.uid};
 return finish(pack,built,
  '稽核 AOT-2-017：普通登場的顎之巨人沒有 STEP。突襲的那張有「STEP 移至能源線 4」。點下去後，人應在能源線最右邊，離開前線。');
}
function usePacks(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No audit action '+(s.pending?.kind||s.phase)+'/'+(s.pending?.step||''));
 return dispatchUniversalAction(packs,s,action);
}
function reach(packs,s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase+' from '+s.phase);
 }
 return s;
}
function faizTopFacedown(){
 const pack=createKmrV2Pack();
 const built=open(pack,85086,[
  'KMR-1-085','KMR-1-084','KMR-1-008','KMR-1-098','KMR-1-082','KMR-1-006',
  'KMR-1-070','KMR-1-083','KMR-1-087'
 ],{});
 const packs=[pack,pack];
 let s=built.state;
 ['KMR-1-070','KMR-1-083','KMR-1-087'].forEach((id,i)=>put(s,0,id,'energy',i,true));
 const base=put(s,0,'KMR-1-084','front',0,true);
 put(s,0,'KMR-1-008','front',1,true);
 const body=take(s,0,'KMR-1-085');
 const gear=take(s,0,'KMR-1-098');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(body,gear);
 ready(s);
 s=usePacks(packs,s,a=>a.type==='raid'&&a.uid===body.uid&&a.baseUid===base.uid);
 const live=s.players[0].front.find(c=>c?.uid===body.uid);
 put(s,1,'KMR-1-082','front',0,true);
 put(s,1,'KMR-1-006','front',1,true);
 s=reach(packs,s,'attack');
 s=usePacks(packs,s,a=>a.type==='attack'&&a.uid===live.uid);
 s=usePacks(packs,s,a=>a.type==='kmr'&&a.mode==='discard'&&a.uid===gear.uid);
 s=usePacks(packs,s,a=>a.type==='kmr'&&a.mode==='skip');
 s=usePacks(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
 if(s.pending?.kind==='life-trigger'){
  const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='skip');
  if(skip)s=dispatchUniversalAction(packs,s,skip);
 }
 const top=s.players[0].front.find(c=>c?.uid===live.uid);
 top.ready=false;
 top.buffs=[{bp:500,untilTurn:s.turn}];
 const hidden=s.players[0].deck.pop();
 hidden.faceDown=true;hidden.ready=false;hidden.fieldEntryStamp=null;
 top.under=[hidden];
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=usePacks(packs,s,a=>a.type==='choosePhaseOrder'&&a.key.startsWith(live.uid+':'));
 const stayed=s.players[0].front.find(c=>c?.uid===base.uid);
 if(!stayed||stayed.ready!==false||stayed.buffs.length!==0||
  s.pending?.step!=='revive'||
  !stayed.under.some(c=>c.uid===hidden.uid&&c.faceDown===true))
  throw Error('KMR-1-085 audit did not keep the facedown on the base '+
   JSON.stringify({card:stayed?.cardId,ready:stayed?.ready,buffs:stayed?.buffs?.length,
    under:stayed?.under?.map(c=>c.cardId),pending:s.pending?.kind+'/'+s.pending?.step,
    outside:s.players[0].outside.map(c=>c.cardId)}));
 if(s.players[0].outside.some(c=>c.uid===hidden.uid)||
  !s.players[0].outside.some(c=>c.uid===live.uid&&c.under.length===0))
  throw Error('KMR-1-085 audit moved the wrong card outside');
 if(JSON.stringify(universalPublicView(packs,s,1)).includes(hidden.uid))
  throw Error('KMR-1-085 audit showed the facedown to the opponent');
 built.state=s;
 built.audit={base:base.uid,top:live.uid,hidden:hidden.uid};
 return finish(pack,built,
  '稽核 KMR-1-085：攻擊階段結束後，突襲頂的法伊茲已在場外。留下的角色是休息，正下方有 1 張裏向卡。先按「查看場面與手牌」，再點「裏向 1」。這個視窗是 008 的另一個效果，還沒結算。');
}
function mikasaImpactLife(){
 const aot=createAotV2Pack();
 const katsura={
  id:'GNT-1-054',name:'桂 小太郎',color:'purple',type:'character',energy:3,ap:1,
  bp:4000,gen:1,traits:['松下村塾'],trigger:'get',implementation:'dsl',
  effects:{onRetire:[{op:'ownLifeToOutside'}]}
 };
 const fillers=Array.from({length:12},(_,i)=>({
  id:'GNT-F-'+String(i).padStart(3,'0'),name:'銀魂填充 '+i,color:'purple',
  type:'character',energy:1,ap:1,bp:i===3?5000:1000,gen:1,
  trigger:i<2?'get':null,implementation:'vanilla'
 }));
 const gnt=createUniversalPack({id:'gnt-q1551',cards:[katsura,...fillers]});
 const required=['AOT-2-008','AOT-2-001'];
 const pool=Object.values(aot.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const aotDeck={};
 const caps={special:0,color:0,final:0};
 for(const id of required){
  const trigger=aot.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  aotDeck[id]=copies;
 }
 let total=Object.values(aotDeck).reduce((n,x)=>n+x,0);
 for(const id of pool){
  if(total>=50)break;
  const trigger=aot.cards[id].trigger;
  let add=Math.min(4,50-total);
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  aotDeck[id]=add;total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 const gntDeck=Object.fromEntries([katsura,...fillers].map((c,i)=>[c.id,i===12?2:4]));
 const packs=[gnt,aot];
 const decks=[gntDeck,aotDeck];
 let s=newUniversalMatch(packs,{decks,seed:1551,first:1});
 s=reach(packs,s,'attack');
 put(s,1,'AOT-2-001','energy',0,true);
 const mikasa=put(s,1,'AOT-2-008','front',0,true);
 const wall=put(s,0,'GNT-1-054','front',0,true);
 put(s,0,'GNT-F-003','front',1,true);
 const first=take(s,0,'GNT-F-000');
 const second=take(s,0,'GNT-F-001');
 s.players[0].deck.push(...s.players[0].life.splice(0));
 s.players[0].life.push(first,second);
 s=usePacks(packs,s,a=>a.type==='attack'&&a.uid===mikasa.uid);
 s=usePacks(packs,s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 if(s.pending?.kind!=='effect-own-life-outside'||s.pending.player!==0||
  s.players[0].life.length!==2)
  throw Error('Q1551 audit did not ask for an own life card');
 assertUniversalMatch(packs,s);
 return {packs,state:s,label:
  '稽核 AOT-2-008／Q1551：桂小太郎擋下三笠並退場。選 1 張自己的生命放到場外。生命會從 2 變成 1，這次沒有衝擊。',
  replay:makeUniversalPreviewReplay(packs,{decks,seed:1551,first:1}),
  audit:{life:[first.uid,second.uid],wall:wall.uid,mikasa:mikasa.uid}};
}
function inuyashaActiveEntry(){
 const pack=createIysV2Pack();
 const built=open(pack,4406,['IYS-1-044','IYS-1-001','IYS-1-036'],{});
 const s=built.state;
 s.pending=null;s.phase='main';
 const source=take(s,0,'IYS-1-001');
 s.players[0].outside.push(source);
 const asked=take(s,0,'IYS-1-044');
 s.players[0].outside.push(asked);
 s.pending={kind:'iys',player:0,sourceUid:source.uid,id:'IYS-1-036',step:'deploy',
  data:{follow:null},actions:[
   {type:'iys',mode:'skip'},
   {type:'iys',mode:'deploy',uid:asked.uid,line:'front',slot:0}
  ]};
 const legal=legalUniversalActions([pack,pack],s);
 if(!legal.some(a=>a.mode==='deploy'&&a.uid===asked.uid&&a.line==='front'&&a.slot===0))
  throw Error('IYS-1-044 audit did not offer the effect entry');
 built.audit={inu:asked.uid,source:source.uid};
 return finish(pack,built,
  '稽核 IYS-1-044：這個效果要求犬夜叉以休息狀態登場。點「讓犬夜叉登場」之後，場上的犬夜叉是活動，沒有橫置。');
}
