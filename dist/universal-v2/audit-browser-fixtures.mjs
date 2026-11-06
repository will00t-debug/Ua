// Local battle-page positions for the effect audit. A normal match never
// loads this module. The board is a real V2 match; the browser then uses the
// same legal buttons as a player.
import {createCsmV2Pack} from './csm-pack.mjs';
import {createKmrBattlePack} from './official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch}
 from './engine.mjs';
import {validateUniversalDeck} from './pack.mjs';
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
 throw Error('Unknown audit fixture '+name);
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
