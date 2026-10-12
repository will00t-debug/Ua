// SOLO LEVELING / UA51BT dedicated training-match engine.
// IMPORTANT: this deliberately admits ONLY independently implemented card profiles.
// Full UA51BT coverage requires 80 tested profiles; never turn on unsupported cards.
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {normalizeSoloDeck} from './solo-decks.mjs';
const DB=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
export const SOLO_MATCH_SUPPORTED=Object.freeze([
 'SLG-1-041','SLG-1-042','SLG-1-043','SLG-1-045','SLG-1-052','SLG-1-055','SLG-1-056',
 'SLG-1-062','SLG-1-065','SLG-1-066','SLG-1-069','SLG-1-070','SLG-1-072','SLG-1-074'
]);
const SUPPORTED=new Set(SOLO_MATCH_SUPPORTED);
export const SOLO_TRAINING_PRESET=Object.fromEntries(SOLO_MATCH_SUPPORTED.filter(x=>x!=='SLG-1-070').map((id,i)=>[id,i===12?2:4]));
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
const addLog=(s,text)=>{s.log.push({turn:s.turn,text});if(s.log.length>120)s.log.shift();};
const fresh=(uid,cardId)=>({uid,cardId,ready:false,stack:[],under:[],buffs:[]});
const draw=(s,p,n=1)=>{for(let i=0;i<n;i++){if(!p.deck.length){s.status='finished';s.winner=1-s.players.indexOf(p);return;}p.hand.push(p.deck.shift());}};
const produced=(s,c)=>d(c).gen+((c.ready&&c.cardId==='SLG-1-041')||c.boostTurn===s.turn?1:0);
export function soloEnergy(s,p=s.active){return s.players[p].energy.reduce((n,c)=>n+(c?produced(s,c):0),0);}
export function soloMatchBp(s,c){
 if(!c)return 0;
 let value=d(c).bp||0;
 if(c.owner===s.active){
  const p=s.players[c.owner];
  if(c.cardId==='SLG-1-062'&&field(p).filter(x=>d(x).traits?.includes('第四次架南島Raid')).length>=5)value+=1500;
  if(c.cardId==='SLG-1-065'&&p.hand.length>=5)value+=1000;
  if(c.cardId==='SLG-1-069'&&p.hand.length>=5)value+=1500;
 }
 value+=(c.buffs||[]).filter(b=>b.turn===s.turn).reduce((n,b)=>n+b.bp,0);
 return value;
}
const impact=(s,c)=>c.cardId==='SLG-1-056'||(c.cardId==='SLG-1-065'&&s.players[c.owner].hand.length>=5)||(c.grants||[]).some(g=>g.kind==='impact'&&g.turn===s.turn);
const impactImmune=c=>c.cardId==='SLG-1-052';
function startTurn(s){
 const p=player(s);p.ownTurns++;s.turn++;s.phase='start';s.moved=false;s.extraDraw=false;
 for(const c of field(p)){if((c.skipActive||0)>0){c.skipActive--;continue;}c.ready=true;c.buffs=(c.buffs||[]).filter(b=>b.turn===s.turn);}
 p.maxAp=p.ownTurns>=3?3:(p.ownTurns===1&&s.active===s.first?1:2);p.ap=p.maxAp;
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
function position(c,p,line,slot){c.owner=p;c.ready=false;c.line=line;c.slot=slot;}
function retire(s,p,c){let arr=s.players[p][c.line],old=arr[c.slot];if(old?.uid!==c.uid)throw Error('retire lost field slot');arr[c.slot]=null;s.players[p].outside.push(c);}
function hurt(s,defender,amount=1){
 const p=s.players[defender];
 for(let i=0;i<amount&&s.status==='playing';i++){
  if(!p.life.length){s.status='finished';s.winner=1-defender;break;}
  const c=p.life.shift(),t=d(c).trigger;
  if(t==='get')p.hand.push(c);
  else {p.outside.push(c);if(t==='draw')draw(s,p);}
  if(t==='active'){
   const choices=field(p).map(x=>x.uid);
   if(choices.length){s.pending={kind:'activeTrigger',p:defender,choices,from:c.uid};break;}
  }
 }
}
function combat(s,blockUid){
 const a=byUid(s.players[s.active].front,s.combat?.attacker);
 if(!a)throw Error('attack card absent');
 if(blockUid==null)hurt(s,1-s.active);
 else{
  const opp=s.players[1-s.active],b=byUid(opp.front,blockUid);
  if(!b||!b.ready)throw Error('illegal block');
  b.ready=false;
  const ab=soloMatchBp(s,a),bb=soloMatchBp(s,b);
  if(ab>=bb)retire(s,1-s.active,b);
  if(bb>=ab)retire(s,s.active,a);
  if(ab>=bb&&impact(s,a)&&!impactImmune(b))hurt(s,1-s.active);
 }
 s.combat=null;
}
function choose(s,action){
 const q=s.pending;if(!q)throw Error('no choice');
 if(q.kind==='discard'){
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
  if(c)c.extraTargetAp=1;
  s.pending=null;
 }else if(q.kind==='activeTrigger'){
  const p=s.players[q.p],c=field(p).find(x=>x.uid===action.uid);
  if(action.uid!=null&&!c)throw Error('illegal trigger target');
  if(c){if((c.skipActive||0)>0)c.skipActive--;else c.ready=true;c.buffs.push({turn:s.turn,bp:3000});}
  s.pending=null;
 }else if(q.kind==='block'){
  if(action.uid!=null&&!q.choices.includes(action.uid))throw Error('illegal block');
  s.pending=null;combat(s,action.uid);
 }else throw Error('unknown choice type');
}
function onEnter(s,c){
 const p=s.players[c.owner];
 if(c.cardId==='SLG-1-043'){draw(s,p);if(p.hand.length)s.pending={kind:'discard',p:c.owner,source:c.uid};}
 if(c.cardId==='SLG-1-072'&&field(p).filter(x=>d(x).traits?.includes('DFN')).length>=3)draw(s,p);
 if(c.cardId==='SLG-1-074')s.pending={kind:'entryImpact',p:c.owner,source:c.uid};
 if(c.cardId==='SLG-1-070')s.pending={kind:'entryProtect',p:c.owner,source:c.uid};
}
export function soloTrainingLegalActions(s){
 if(s.status!=='playing')return [];
 if(s.pending){
  const q=s.pending;
  if(q.kind==='discard')return s.players[q.p].hand.map(c=>({type:'choose',uid:c.uid}));
  if(q.kind==='activeTrigger')return [{type:'choose',uid:null},...field(s.players[q.p]).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='entryImpact'||q.kind==='entryProtect')return [{type:'choose',uid:null},...field(s.players[q.p]).filter(c=>c.uid!==q.source&&d(c).traits?.includes('DFN')).map(c=>({type:'choose',uid:c.uid}))];
  if(q.kind==='block')return [{type:'choose',uid:null},...q.choices.map(uid=>({type:'choose',uid}))];
  return [];
 }
 const p=player(s),actions=[{type:'next'}];
 if(s.phase==='start'){
  if(p.ap>0&&p.deck.length)actions.push({type:'extraDraw'});
 }else if(s.phase==='move'&&!s.moved){
  for(const c of p.energy.filter(Boolean))if(d(c).type==='character')
   for(let slot=0;slot<4;slot++)if(!p.front[slot])actions.push({type:'move',uid:c.uid,slot});
 }else if(s.phase==='main'){
  for(const c of p.hand){
   const data=d(c);if(!SUPPORTED.has(c.cardId)||p.ap<data.ap||soloEnergy(s)<data.energy)continue;
   for(const line of data.type==='field'?['energy']:['front','energy']){
    const slots=p[line];for(let slot=0;slot<4;slot++)if(!slots[slot])actions.push({type:'play',uid:c.uid,line,slot});
   }
  }
  for(const c of field(p))if(c.cardId==='SLG-1-042'&&c.ready&&c.usedTurn!==s.turn)
   actions.push({type:'ability',uid:c.uid});
 }else if(s.phase==='attack'){
  for(const c of living(p))if(c.ready)actions.push({type:'attack',uid:c.uid});
 }
 return actions;
}
export function soloTrainingDispatch(original,action){
 const s=structuredClone(original),legal=soloTrainingLegalActions(s);
 if(!legal.some(a=>a.type===action?.type&&a.uid===action.uid&&a.line===action.line&&a.slot===action.slot))throw Error('illegal SOLO action '+JSON.stringify(action));
 if(s.pending){choose(s,action);assertSoloTrainingMatch(s);return s;}
 const p=player(s);
 if(action.type==='next'){
  if(s.phase==='start')s.phase='move';
  else if(s.phase==='move')s.phase='main';
  else if(s.phase==='main'){
   for(const c of [...field(p)])if(c.retireAtMainEnd)retire(s,s.active,c);
   s.phase='attack';
  }else if(s.phase==='attack'){s.active=1-s.active;startTurn(s);}
 }else if(action.type==='extraDraw'){p.ap--;s.extraDraw=true;draw(s,p);}
 else if(action.type==='move'){
  const index=p.energy.findIndex(c=>c?.uid===action.uid);
  const c=p.energy[index];p.energy[index]=null;p.front[action.slot]=c;c.line='front';c.slot=action.slot;s.moved=true;
 }else if(action.type==='play'){
  const i=p.hand.findIndex(c=>c.uid===action.uid),c=p.hand.splice(i,1)[0],data=d(c);
  p.ap-=data.ap;position(c,s.active,action.line,action.slot);
  p[action.line][action.slot]=c;
  onEnter(s,c);
 }else if(action.type==='ability'){
  const c=own(s,action.uid);c.ready=false;c.boostTurn=s.turn;c.usedTurn=s.turn;c.retireAtMainEnd=true;
 }else if(action.type==='attack'){
  const a=byUid(p.front,action.uid);a.ready=false;
  const blockers=s.players[1-s.active].front.filter(c=>c?.ready&&!((a.grants||[]).some(g=>g.kind==='unblockable')));
  s.combat={attacker:a.uid};
  if(blockers.length)s.pending={kind:'block',p:1-s.active,choices:blockers.map(c=>c.uid)};
  else combat(s,null);
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
