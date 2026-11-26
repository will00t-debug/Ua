import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {requireRegisteredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalAttackDamage,universalImpact} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {activationLabelBanned} from '../dist/universal-v2/activation-labels.mjs';
import {renderCardEffectText} from '../dist/card-effect-display.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const TITLES=['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei','rezero','steins-gate','madoka','inuyasha','kjn','aot','kmr','csm','imc','mha','rnk','eva','toriko','dgm','mgs','mcr','gim'];
const REGISTERED=new Set(['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei']);
const WRONG='主要能力：先 ACTIVE 自己，再指定符合條件的角色 BP＋1000';

function packOf(title){
 return REGISTERED.has(title)?requireRegisteredV2TitlePack(title):officialV2Pack(title);
}
function deck(pack,focus){
 const card=pack.cards[focus];
 const color=pack.restrictColors?card.color:null;
 const pool=Object.values(pack.cards).filter(c=>{
  if(c.trigger==='final'||c.trigger==='color'||c.trigger==='special')return false;
  if(color&&c.color!==color)return false;
  return true;
 });
 const counts={};let n=0;
 for(const c of [card,...pool.filter(c=>c.id!==focus)]){
  if(n>=50)break;
  const takeCount=Math.min(c.maxCopies||4,50-n);
  if(takeCount>0){counts[c.id]=(counts[c.id]||0)+takeCount;n+=takeCount;}
 }
 return counts;
}
function pull(s,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 return null;
}
function reachMain(packs,s){
 let guard=0;
 while(s.phase!=='main'&&guard++<10){
  if(s.pending)return null;
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 return s.phase==='main'?s:null;
}
function modesOf(card){
 if(card.printedMains?.length)return card.printedMains.map(mode=>mode.id);
 const op=card.mainAbility?.op;
 const fixed={
  onceAbovePrintedKeywords:'abovePrinted',readyFrontProgram:'readyFront',
  entryTurnLifeChoice:'entryLife',frontOnceLifeThen:'frontLife',
  restDiscardNameDown:'restDiscardDown',restNameOnceChoose:'restNameOnce',
  frontHandLifeMenu:'frontHandLife',restNamedOption:'restNamedOption',
  frontChooseImpact:'frontChooseImpact',frontUidChoice:'frontUidChoice',
  readyBpChoice:'readyBpChoice',restPrintedGrantBottom:'restPrintedGrant',
  sniperIfImpact:'sniperIfImpact',
  kurisuFrontDual:'discount',
  retireOwnFieldThen:'retireFieldThen',crowdFrontDown:'printCrowd',
  printReadyGate:'printReadyGate',gainSameLineMains:'gainLineMains',
  frontDrawOrHandTrigger:'frontDraw',characterDualMain:'kindsActive',
  fieldRestMillOrOutsideEvent:'fieldMill',fieldRestTuckOrRelease:'fieldTuck',
  restChooseIfEventUsed:'eventRestBuff',gunmenModeSubset:'gunmenModes'
 };
 if(op==='chooseTwoAfterOwnRaid')return ['ready','buff','readyAndBuff'];
 if(fixed[op])return op==='kurisuFrontDual'?['discount','restedBuff']:
  op==='frontDrawOrHandTrigger'?['frontDraw','handTrigger']:
  op==='characterDualMain'?['kindsActive','selfRestBuff']:
  op==='fieldRestMillOrOutsideEvent'?['fieldMill','fieldOutsideEvent']:
  op==='fieldRestTuckOrRelease'?['fieldTuck','fieldRelease']:
  op==='restChooseIfEventUsed'?['eventRestBuff','eventRestDraw']:[fixed[op]];
 if(op==='kmrMain')return ['kmr:'+card.id];
 if(op==='kmr2Main')return ['kmr2:'+card.id];
 if(op==='csmMain')return ['csm:0'];
 if(op==='iysMain')return ['iys:0'];
 if(op==='kjnMain')return ['kjn:0'];
 if(op==='aotMain')return ['aot:'+card.id];
 if(op==='aot2Main')return ['aot2:'+card.id];
 if(op==='mmm2Main')return ['mmm2:0'];
 return ['main'];
}

test('every implemented title main activation has a specific label',()=>{
 const failures=[];
 const seenModes=new Set();
 let cards=0,legalCards=0,legalActions=0;
 for(const title of TITLES){
  const pack=packOf(title);
  const packs=[pack,pack];
  for(const card of Object.values(pack.cards)){
   if(!card.mainAbility&&!card.printedMains?.length)continue;
   cards++;
   const counts=deck(pack,card.id);
   const issues=validateUniversalDeck(pack,counts);
   if(issues.length){failures.push(card.id+' deck '+issues[0]);continue;}
   let s;
   try{s=newUniversalMatch(packs,{decks:[counts,counts],seed:21,first:0});}
   catch(error){failures.push(card.id+' match '+error.message);continue;}
   s=reachMain(packs,s);
   if(!s){failures.push(card.id+' did not reach main');continue;}
   const physical=pull(s,card.id);
   if(!physical){failures.push(card.id+' was not in the dealt deck');continue;}
   physical.ready=true;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   physical.entryTurn=s.turn;
   const energy=card.mainAbility?.energyOnly===true||card.mainAbility?.line==='energy'||card.type!=='character';
   s.players[0][energy?'energy':'front'][0]=physical;
   const allyId=Object.keys(counts).find(id=>id!==card.id&&pack.cards[id].type==='character');
   const ally=allyId?pull(s,allyId):null;
   if(ally){
    ally.ready=true;ally.fieldEntryStamp=s.nextFieldEntryStamp++;ally.entryTurn=s.turn;
    s.players[0].front[energy?0:1]=ally;
   }
   const labels=new Map();
   for(const mode of modesOf(card)){
    const action={type:'activate',uid:physical.uid,mode,effects:mode==='gunmenModes'?['bp','impactNull','doubleBlock']:undefined,grant:mode==='rukaGrant'?'block':undefined};
    let label='';
    try{label=uiActionLabel(action,{pack:packs,state:s});}
    catch(error){failures.push(card.id+' '+mode+' threw '+error.message);continue;}
    const ban=activationLabelBanned(label);
    if(ban)failures.push(card.id+' '+mode+' '+ban+' '+label.slice(0,80));
    if(label===WRONG)failures.push(card.id+' used the Priscilla fallback');
    if([...label].length>480)failures.push(card.id+' label exceeds the online cap');
    labels.set(mode,label);
   }
   if(labels.size>1&&new Set(labels.values()).size!==labels.size)
    failures.push(card.id+' branches are not distinct');
   let actions=[];
   try{actions=legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.uid===physical.uid);}
   catch{actions=[];}
   if(actions.length)legalCards++;
   const legalLabels=new Map();
   for(const action of actions){
    legalActions++;
    seenModes.add(action.mode);
    const label=uiActionLabel(action,{pack:packs,state:s});
    const ban=activationLabelBanned(label);
    if(ban)failures.push(card.id+' legal '+action.mode+' '+ban);
    if(label===WRONG&&action.mode!=='readyAndBuff')failures.push(card.id+' legal wrong fallback');
    if([...label].length>480)failures.push(card.id+' legal label too long');
    const key=action.mode+'|'+(action.grant||'');
    if(legalLabels.has(key)&&legalLabels.get(key)!==label)
     failures.push(card.id+' '+key+' drifted');
    legalLabels.set(key,label);
   }
   if(legalLabels.size>1&&new Set(legalLabels.values()).size!==legalLabels.size)
    failures.push(card.id+' legal branches are not distinct');
  }
 }
 assert.equal(TITLES.length,22);
 assert.ok(cards>=488, 'checked '+cards+' main cards');
 assert.ok(legalCards>=250, 'legal activations covered '+legalCards+' cards');
 assert.ok(legalActions>=270);
 assert.ok(seenModes.size>=100, 'modes '+seenModes.size);
 assert.deepEqual(failures,[]);
});

test('shared activation modes stay specific to each card parameters',()=>{
 const pack=officialV2Pack('rezero');
 const packs=[pack,pack];
 const counts=deck(pack,'REZ-2-065');
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 s=reachMain(packs,s);
 const card=pull(s,'REZ-2-065');
 card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;card.entryTurn=s.turn;
 s.players[0].front[0]=card;
 const label=uiActionLabel({type:'activate',uid:card.uid,mode:'abovePrinted'},{pack:packs,state:s});
 assert.match(label,/3 張以上/);
 assert.match(label,/5 張以上/);
 assert.match(label,/傷害（2）/);
 assert.match(label,/貫通（1）/);
 assert.doesNotMatch(label,/先 ACTIVE/);
 const html=renderCardEffectText(label);
 assert.match(html,/ua-effect-limit/);
 assert.match(html,/aria-label="每回合一次"/);
 assert.match(html,/傷害二/);
 assert.match(html,/貫通/);
 assert.doesNotMatch(html,/&nbsp|&#160;/);
});

const prisDeck=rezDeck([
 'REZ-2-065','REZ-2-063','REZ-2-049','REZ-2-055','REZ-2-043','REZ-2-041',
 'REZ-2-056','REZ-2-014','REZ-2-033','REZ-2-035','REZ-2-046','REZ-2-050','REZ-2-040'
],'REZ-2-055');
function sit(s,id,line,slot){
 const c=take(s,0,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;return c;
}
test('REZ-2-065 shows and resolves every above-printed threshold',()=>{
 const extras=['REZ-2-056','REZ-2-043','REZ-2-055','REZ-2-041','REZ-2-049','REZ-2-014'];
 for(const count of [0,1,2,3,4,5,6]){
  let s=fresh(prisDeck,7000+count);
  const self=sit(s,'REZ-2-065','front',0);
  self.stack=[take(s,0,'REZ-2-063')];
  const placed=[];
  for(let i=0;i<Math.max(0,count-1);i++){
   const line=i<3?'front':'energy';
   const slot=i<3?i+1:i-3;
   placed.push(sit(s,extras[i],line,slot));
  }
  s=toPhase(rezPacks,s,'main');
  const liveOf=uid=>[...s.players[0].front,...s.players[0].energy].find(x=>x?.uid===uid);
  if(count===0)liveOf(self.uid).buffs=[{bp:-1000,untilTurn:s.turn}];
  for(const c of placed)liveOf(c.uid).buffs=[{bp:500,untilTurn:s.turn}];
  const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===self.uid);
  assert.equal(action?.mode,'abovePrinted','count '+count);
  const label=uiActionLabel(action,{pack:rezPacks,state:s});
  assert.match(label,new RegExp('目前符合 '+count+' 張'));
  assert.match(label,/3 張以上/);
  assert.match(label,/5 張以上/);
  s=dispatchUniversalAction(rezPacks,s,action,{actor:0});
  const granted=[...s.players[0].front,...s.players[0].energy].find(c=>c?.uid===self.uid);
  if(count>=3)assert.equal(universalAttackDamage(rez,s,granted),2,'damage '+count);
  else assert.equal(granted.attackDamageGranted,undefined,'damage '+count);
  if(count>=5)assert.equal(universalImpact(rez,s,granted),1,'impact '+count);
  else assert.equal(granted.impactGranted,undefined,'impact '+count);
 }
});

function quietPlayer(){
 return {front:[],energy:[],hand:[],outside:[],removed:[],deck:[],life:[],lifeRevealed:[]};
}
function placeAim(player,line,uid,cardId){
 player[line].push({uid,cardId,ready:true,fieldEntryStamp:1});
}
test('multi-result mains name the card and the result that button resolves',()=>{
 const mha=officialV2Pack('mha');
 const stg=officialV2Pack('steins-gate');
 const ttg=requireRegisteredV2TitlePack('gurren-lagann');
 const cases=[
  {pack:mha,source:'MHA-2-057',line:'front',actions:[
   {mode:'frontEnergyBp',target:'0-high',lead:/前線2〈.+〉 BP＋1000。/,body:/BP＋1000/,forbid:/貫通/},
   {mode:'frontEnergyImpact',target:'0-high',lead:/前線2〈.+〉 貫通 1。/,body:/貫通（1）/,forbid:/BP＋1000。$/}
  ],board:(p,q)=>{
   placeAim(p,'front','0-src','MHA-2-057');
   placeAim(p,'front','0-high','MHA-2-057');
  }},
  {pack:mha,source:'MHA-1-023',line:'front',actions:[
   {mode:'nameScaledBuff',target:'0-plain',lead:/前線2〈.+〉 BP＋1000。/,body:/BP＋1000/,forbid:/狙擊/},
   {mode:'nameScaledBuff',target:'0-gent',lead:/前線3〈ジェントル・クリミナル〉 BP＋2000 並狙擊。/,body:/狙擊/,forbid:/BP＋1000/}
  ],board:(p)=>{
   placeAim(p,'front','0-src','MHA-1-023');
   placeAim(p,'front','0-plain','MHA-1-023');
   placeAim(p,'front','0-gent','MHA-1-007');
  }},
  {pack:mha,source:'MHA-2-040',line:'front',actions:[
   {mode:'grantBpRules',target:'1-a',lead:/前線1〈.+〉 受減再降。/,body:/BP－500/},
   {mode:'grantBpRules',target:'1-b',lead:/前線2〈.+〉 受減再降。/,body:/移除區/}
  ],board:(p,q)=>{
   placeAim(p,'front','0-src','MHA-2-040');
   placeAim(q,'front','1-a','MHA-1-023');
   placeAim(q,'front','1-b','MHA-1-007');
  }},
  {pack:mha,source:'MHA-2-042',line:'front',actions:[
   {mode:'oppDownSelfUp',target:'1-a',lead:/前線1〈.+〉 BP－1000。/,body:/BP－1000/},
   {mode:'oppDownSelfUp',target:'1-b',lead:/前線2〈.+〉 BP－1000。/,body:/BP＋1000/}
  ],board:(p,q)=>{
   placeAim(p,'front','0-src','MHA-2-042');
   placeAim(q,'front','1-a','MHA-1-023');
   placeAim(q,'front','1-b','MHA-1-007');
  }},
  {pack:stg,source:'STG-1-050',line:'front',actions:[
   {mode:'rukaGrant',grant:'block',target:'0-a',lead:/前線2〈.+〉 不被高 BP 阻擋。/,body:/BP 4000/},
   {mode:'rukaGrant',grant:'eventImpact',target:'0-a',lead:/前線2〈.+〉 BP＋1000。/,body:/貫通（1）/},
   {mode:'rukaGrant',grant:'block',target:'0-b',lead:/能源1〈.+〉 不被高 BP 阻擋。/,body:/BP 4000/}
  ],board:(p)=>{
   placeAim(p,'front','0-src','STG-1-050');
   placeAim(p,'front','0-a','STG-1-050');
   placeAim(p,'energy','0-b','STG-1-050');
  }},
  {pack:ttg,source:'TTG-1-062',line:'front',actions:[
   {mode:'restBuffDiscard',target:'0-simon',lead:/前線2〈シモン〉 只加 BP。/,body:/可以不棄牌/,forbid:/轉為活動/},
   {mode:'restBuffDiscard',target:'0-simon',discard:'0-hand',lead:/支付手牌〈.+〉。/,body:/轉為活動/}
  ],board:(p)=>{
   placeAim(p,'front','0-src','TTG-1-062');
   placeAim(p,'front','0-simon','TTG-1-056');
   placeAim(p,'hand','0-hand','TTG-1-042');
  }}
 ];
 const seen=[];
 for(const row of cases){
  const packs=[row.pack,row.pack];
  const own=quietPlayer(),opp=quietPlayer();
  row.board(own,opp);
  const state={players:[own,opp]};
  const labels=[];
  for(const action of row.actions){
   const label=uiActionLabel({type:'activate',uid:'0-src',mode:action.mode,grant:action.grant,
    targetUid:action.target,discardUid:action.discard},{pack:packs,state});
   assert.match(label,action.lead,row.source+' '+action.mode+' '+label);
   assert.match(label,action.body,row.source+' '+label);
   if(action.forbid)assert.doesNotMatch(label,action.forbid,row.source+' '+label);
   assert.equal(activationLabelBanned(label),'',label);
   labels.push(label);
  }
  assert.equal(new Set(labels).size,labels.length,row.source+' buttons still share a label');
  seen.push(...labels);
 }
 assert.equal(new Set(seen).size,seen.length);
});

test('online action labels use the same activation text and a wider cap',()=>{
 const domain=readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8');
 assert.match(domain,/action\?\.type==='activate'\?480:180/);
 assert.match(domain,/uiActionLabel\(action,/);
});
