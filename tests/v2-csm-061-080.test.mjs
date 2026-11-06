import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalEnergyByColor,universalImpactNull,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {controllerChoiceArt,controllerDeckWindowCards,uiActionLabel,V2_PENDING_LABELS}
 from '../dist/universal-v2/preview-actions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {dispatchRoom} from '../server/domain.mjs';
import {facedownGallery,facedownInspectModel}
 from '../dist/universal-v2/facedown-inspect.mjs';
import {csmFacedowns} from '../dist/universal-v2/csm-continuous.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {runCsmJob} from '../dist/universal-v2/csm-runtime.mjs';

const pack=createCsmV2Pack();
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
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function redFuel(s,p=0,ids=['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-057']){
 ids.forEach((id,slot)=>put(s,p,id,'energy',slot));
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined&&a.baseUid===undefined);
 if(!action)throw Error('No '+type+' '+line+' for '+uid+' pending '+s.pending?.kind);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify((s.pending?.actions||[]).slice(0,8)));
 return use(s,action);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function passToOwnAttack(s,seat=0){
 const startTurn=s.turn;
 let guard=0;
 while(!(s.phase==='attack'&&s.active===seat&&s.turn>startTurn)){
  if(s.pending)throw Error('Unexpected pending '+s.pending.kind+' '+(s.pending.step||''));
  s=use(s,{type:'next'});
  if(++guard>24)throw Error('No later attack');
 }
 return s;
}
function open(seed,required){
 const counts=countsFor(required);
 let s=toPhase(fresh(counts,seed),'main');
 readyAp(s);dumpHand(s);
 return s;
}
function buryRaid(host,base){
 base.faceDown=false;base.ready=false;base.fieldEntryStamp=null;base.stack=[];base.under=[];
 host.stack=[base];
 return host;
}
function revealLife(s,defender,id){
 const trigger=take(s,defender,id);
 const buried=s.players[defender].life[0];
 s.players[defender].life[0]=trigger;
 s.players[defender].deck.push(buried);
 return trigger;
}
function galleryText(model){
 const bits=[];
 const el=(tag,attrs,...kids)=>{
  const node={tag,attrs:attrs||{},kids:[...kids],src:attrs?.src||''};
  node.append=(...more)=>{node.kids.push(...more);};
  node.addEventListener=()=>{};
  if(attrs?.text)bits.push(String(attrs.text));
  for(const value of Object.values(attrs||{}))if(typeof value==='string')bits.push(value);
  return node;
 };
 const images=[];
 facedownGallery(el,model,{
  imageOf:id=>{images.push(id);return 'art/'+id+'.png';},
  effectOf:()=>'printed effect',
  nameOf:id=>pack.cards[id]?.name||id
 });
 return {text:bits.join('\n'),images};
}

test('CSM-1-061 raid box is attack win and leave replacement; ordinary entry does not draw on a battle win',()=>{
 assert.deepEqual(raidBoxListed('CSM-1-061','attackWin')&&raidBoxListed('CSM-1-061','leaveReplace'),true);
 assert.equal(raidBoxListed('CSM-1-061','onPlay'),false);
 let s=open(6101,['CSM-1-061','CSM-1-057','CSM-1-060','CSM-1-062']);
 redFuel(s);
 const power=toHand(s,0,'CSM-1-061');
 const deck=s.players[0].deck.length;
 s=play(s,power.uid);
 assert.equal(s.pending,null);
 const entered=live(s,0,power.uid);
 assert.equal(universalBp(pack,s,entered),4000);
 const foe=put(s,1,'CSM-1-062','front',0,true);
 s=passToOwnAttack(s);
 const beforeBattle=s.players[0].deck.length;
 s=use(s,{type:'attack',uid:entered.uid});
 s=use(s,{type:'chooseBlock',uid:foe.uid});
 assert.equal(s.players[0].deck.length,beforeBattle);
 assert.equal(s.players[1].front[0],null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-061 face-up raid draws one after winning a character battle and spends the once on the offer',()=>{
 let s=open(6102,['CSM-1-061','CSM-1-057','CSM-1-058','CSM-1-060','CSM-1-062','CSM-1-052','CSM-1-049']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const base=put(s,0,'CSM-1-057','front',0);
 const power=toHand(s,0,'CSM-1-061');
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===power.uid&&a.baseUid===base.uid));
 const raided=live(s,0,power.uid);
 assert.equal(raided.stack.some(c=>c.uid===base.uid&&c.faceDown!==true),true);
 const deck=s.players[0].deck.length;
 const foe=put(s,1,'CSM-1-062','front',0,true);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:raided.uid});
 s=use(s,{type:'chooseBlock',uid:foe.uid});
 assert.equal(s.players[0].deck.length,deck-1);
 assertUniversalMatch(packs,s);

 let once=open(6103,['CSM-1-061','CSM-1-057','CSM-1-058','CSM-1-060','CSM-1-049','CSM-1-052','CSM-1-077']);
 redFuel(once,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const host=buryRaid(put(once,1,'CSM-1-061','front',0),take(once,1,'CSM-1-057'));
 const standIn=put(once,1,'CSM-1-058','front',1);
 put(once,0,'CSM-1-049','front',0);
 put(once,0,'CSM-1-052','front',1);
 once=play(once,toHand(once,0,'CSM-1-077').uid,'event');
 assert.equal(once.pending?.step,'retireFoe');
 once=choose(once,a=>a.uid===host.uid);
 assert.equal(once.pending?.step,'leaveReplace');
 once=choose(once,a=>a.mode==='pick'&&a.uid===standIn.uid);
 assert.equal(live(once,1,host.uid)?.uid,host.uid);
 assert.equal(once.players[1].front.some(c=>c?.uid===standIn.uid),false);
 once=play(once,toHand(once,0,'CSM-1-077').uid,'event');
 assert.notEqual(once.pending?.step,'leaveReplace');
 once=choose(once,a=>a.uid===host.uid);
 assert.equal(once.players[1].outside.some(c=>c.uid===host.uid),true);
 assert.equal(live(once,1,host.uid),undefined);
 assertUniversalMatch(packs,once);
});

test('CSM-1-061 on-play Denji gate writes BP and must-block without a raid',()=>{
 let plain=open(6104,['CSM-1-061','CSM-1-060']);
 redFuel(plain,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 const alone=toHand(plain,0,'CSM-1-061');
 plain=play(plain,alone.uid);
 assert.equal(universalBp(pack,plain,live(plain,0,alone.uid)),4000);
 assert.equal(live(plain,0,alone.uid).mustBlockGranted,undefined);
 assertUniversalMatch(packs,plain);

 let s=open(6105,['CSM-1-061','CSM-1-049','CSM-1-060']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 const denji=put(s,0,'CSM-1-049','front',1);
 const power=toHand(s,0,'CSM-1-061');
 s=play(s,power.uid);
 const entered=live(s,0,power.uid);
 assert.equal(universalBp(pack,s,entered),5000);
 assert.equal(entered.mustBlockGranted?.turn,s.turn);
 assert.equal(entered.mustBlockGranted?.stamp,entered.fieldEntryStamp);
 assert.equal(entered.mustBlockGranted?.sourceUid,entered.uid);
 assert.equal(entered.mustBlockGranted?.beneficiaryUid,entered.uid);
 assert.equal(entered.mustBlockGranted?.witnessUid,denji.uid);
 assertUniversalMatch(packs,s);
});

test('CSM-1-062 retires as a cost and may decline the Denji grant',()=>{
 let s=open(6201,['CSM-1-062','CSM-1-049']);
 const beam=put(s,0,'CSM-1-062','front',0);
 const denji=put(s,0,'CSM-1-049','front',1);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===beam.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===beam.uid),true);
 assert.equal(s.pending?.step,'grantAttackDraw');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='pick'&&a.uid===denji.uid),true);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(denji.attackDrawGranted,undefined);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let none=open(6202,['CSM-1-062','CSM-1-057']);
 const solo=put(none,0,'CSM-1-062','front',0);
 none=use(none,legalUniversalActions(packs,none).find(a=>a.type==='activate'&&a.uid===solo.uid));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.uid===solo.uid),true);
 assertUniversalMatch(packs,none);

 let granted=open(6203,['CSM-1-062','CSM-1-049']);
 const cost=put(granted,0,'CSM-1-062','front',0);
 const target=put(granted,0,'CSM-1-049','front',1);
 granted=use(granted,legalUniversalActions(packs,granted).find(a=>
  a.type==='activate'&&a.uid===cost.uid));
 granted=choose(granted,a=>a.mode==='pick'&&a.uid===target.uid);
 const receiver=live(granted,0,target.uid);
 assert.equal(receiver.attackDrawGranted?.turn,granted.turn);
 assert.equal(receiver.attackDrawGranted?.stamp,target.fieldEntryStamp);
 assert.equal(receiver.attackDrawGranted?.sourceUid,cost.uid);
 assert.equal(receiver.attackDrawGranted?.beneficiaryUid,target.uid);
 assert.equal(receiver.attackDrawGranted?.upTo,1);
 assert.equal(granted.players[0].outside.some(c=>c.uid===cost.uid),true);
 assert.equal(granted.pending,null);
 assertUniversalMatch(packs,granted);
});

function blockChoices(s){
 return legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock');
}
function throwsForged(s,message){
 assert.throws(()=>assertUniversalMatch(packs,s),error=>error instanceof Error&&error.message===message);
}
function loseOriginal(s,target){
 const source=put(s,1,'CSM-1-060','front',1,true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:target.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(originalEffectsDisabled(s,target),true);
 return source;
}
function drawChoice(s,mode){
 return choose(s,a=>a.type==='chooseAcquiredAttackDraw'&&a.mode===mode);
}

test('CSM-1-061 keeps this-turn must-block after the printed Denji leaves',()=>{
 let s=open(6110,['CSM-1-061','CSM-1-049','CSM-1-060','CSM-1-062']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 const denji=put(s,0,'CSM-1-049','front',1);
 const power=toHand(s,0,'CSM-1-061');
 s=play(s,power.uid);
 const entered=live(s,0,power.uid);
 assert.equal(entered.mustBlockGranted?.witnessUid,denji.uid);
 const foe=put(s,1,'CSM-1-062','front',0,true);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&
  a.uid===denji.uid&&a.mode==='selfRestEnergyRetire'));
 s=toPhase(s,'attack');
 assert.equal(live(s,0,denji.uid),undefined);
 assert.equal(s.players[0].outside.some(c=>c.uid===denji.uid),true);
 const still=live(s,0,power.uid);
 assert.equal(universalBp(pack,s,still),5000);
 assert.equal(still.mustBlockGranted?.turn,s.turn);
 assert.equal(still.mustBlockGranted?.stamp,still.fieldEntryStamp);
 assert.equal(still.mustBlockGranted?.witnessUid,denji.uid);
 assertUniversalMatch(packs,s);
 // Ordinary entry is rested. Ready this body so the same-turn block window
 // can show the grant is still live after Denji has left.
 still.ready=true;
 s=use(s,{type:'attack',uid:still.uid});
 const blocks=blockChoices(s);
 assert.equal(blocks.some(a=>a.uid===null),false);
 assert.equal(blocks.some(a=>a.uid===foe.uid),true);
 s=use(s,{type:'chooseBlock',uid:foe.uid});
 assertUniversalMatch(packs,s);
});

test('CSM-1-061 ordinary play accepts an alias Denji and still rejects a forged grant',()=>{
 let s=open(6111,['CSM-1-061','CSM-1-048','CSM-1-060']);
 redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 const alias=put(s,0,'CSM-1-048','front',1);
 const power=toHand(s,0,'CSM-1-061');
 s=play(s,power.uid);
 const entered=live(s,0,power.uid);
 assert.equal(universalBp(pack,s,entered),5000);
 assert.equal(entered.mustBlockGranted?.witnessUid,alias.uid);
 assert.equal(pack.cards['CSM-1-048'].name.includes('デンジ'),false);
 assertUniversalMatch(packs,s);

 let forged=open(6112,['CSM-1-061','CSM-1-049','CSM-1-060']);
 redFuel(forged,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 const alone=toHand(forged,0,'CSM-1-061');
 forged=play(forged,alone.uid);
 const body=live(forged,0,alone.uid);
 const buried=forged.players[0].deck.find(c=>c.cardId==='CSM-1-049');
 body.mustBlockGranted={turn:forged.turn,stamp:body.fieldEntryStamp,sourceUid:body.uid,
  beneficiaryUid:body.uid,witnessUid:buried.uid};
 throwsForged(forged,'Forged temporary physical battle grant');
});

test('CSM-1-061 must-block expires next turn and a new entry does not keep the old grant',()=>{
 let s=open(6113,['CSM-1-061','CSM-1-049','CSM-1-060','CSM-1-062','CSM-1-038','CSM-1-030','CSM-1-001']);
 redFuel(s,0,['CSM-1-001','CSM-1-060','CSM-1-060','CSM-1-060']);
 const denji=put(s,0,'CSM-1-049','front',1);
 put(s,0,'CSM-1-030','front',2);
 const power=toHand(s,0,'CSM-1-061');
 s=play(s,power.uid);
 const entered=live(s,0,power.uid);
 assert.equal(entered.mustBlockGranted?.stamp,entered.fieldEntryStamp);
 const foe=put(s,1,'CSM-1-062','front',0,true);
 let later=passToOwnAttack(s);
 const expired=live(later,0,power.uid);
 assert.equal(expired.mustBlockGranted,undefined);
 assert.equal(universalBp(pack,later,expired),4000);
 assertUniversalMatch(packs,later);
 later=use(later,{type:'attack',uid:expired.uid});
 assert.equal(blockChoices(later).some(a=>a.uid===null),true);
 assert.equal(blockChoices(later).some(a=>a.uid===foe.uid),true);

 let again=open(6114,['CSM-1-061','CSM-1-049','CSM-1-060','CSM-1-038','CSM-1-030','CSM-1-001']);
 redFuel(again,0,['CSM-1-001','CSM-1-060','CSM-1-060','CSM-1-060']);
 const witness=put(again,0,'CSM-1-049','front',1);
 put(again,0,'CSM-1-030','front',2);
 const first=toHand(again,0,'CSM-1-061');
 again=play(again,first.uid);
 const grantedBody=live(again,0,first.uid);
 const grantedStamp=grantedBody.fieldEntryStamp;
 const eventCard=toHand(again,0,'CSM-1-038');
 again=play(again,eventCard.uid,'event');
 assert.equal(again.pending?.step,'retireOwn');
 again=choose(again,a=>a.mode==='pick'&&a.uid===first.uid);
 const retired=again.players[0].outside.find(c=>c.uid===first.uid);
 assert.equal(retired.mustBlockGranted,undefined);
 assert.equal(retired.fieldEntryStamp,null);
 while(again.pending)again=choose(again,()=>true);
 const outsideIndex=again.players[0].outside.findIndex(c=>c.uid===first.uid);
 again.players[0].hand.push(again.players[0].outside.splice(outsideIndex,1)[0]);
 again=play(again,first.uid);
 const returned=live(again,0,first.uid);
 assert.notEqual(returned.fieldEntryStamp,grantedStamp);
 assert.equal(returned.mustBlockGranted?.stamp,returned.fieldEntryStamp);
 assert.equal(returned.mustBlockGranted?.witnessUid,witness.uid);
 assert.equal(returned.mustBlockGranted?.turn,again.turn);
 assertUniversalMatch(packs,again);
 returned.mustBlockGranted={...returned.mustBlockGranted,stamp:grantedStamp};
 throwsForged(again,'Forged temporary physical battle grant');
});

test('CSM-1-062 grants the attack draw to an alias Denji after the source leaves outside',()=>{
 let s=open(6210,['CSM-1-062','CSM-1-048','CSM-1-049','CSM-1-060']);
 const beam=put(s,0,'CSM-1-062','front',0);
 const alias=put(s,0,'CSM-1-048','front',1);
 const printed=put(s,0,'CSM-1-049','front',2);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===beam.uid));
 assert.equal(s.pending.actions.some(a=>a.mode==='pick'&&a.uid===alias.uid),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='pick'&&a.uid===printed.uid),true);
 s=choose(s,a=>a.mode==='pick'&&a.uid===alias.uid);
 const receiver=live(s,0,alias.uid);
 assert.equal(receiver.attackDrawGranted?.sourceUid,beam.uid);
 assert.equal(receiver.attackDrawGranted?.beneficiaryUid,alias.uid);
 assert.equal(receiver.attackDrawGranted?.stamp,alias.fieldEntryStamp);
 assert.equal(receiver.attackDrawGranted?.upTo,1);
 assertUniversalMatch(packs,s);
 const retired=s.players[0].outside.find(c=>c.uid===beam.uid);
 s.players[0].outside=s.players[0].outside.filter(c=>c.uid!==beam.uid);
 s.players[0].hand.push(retired);
 assert.equal(s.players[0].outside.some(c=>c.uid===beam.uid),false);
 assertUniversalMatch(packs,s);
 const foe=put(s,1,'CSM-1-060','front',0,true);
 const before=s.players[0].deck.length;
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:alias.uid});
 assert.equal(s.pending?.kind,'effect-acquired-attack-draw');
 assert.equal(s.players[0].deck.length,before);
 s=drawChoice(s,'draw');
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending?.kind,'block');
 assert.equal(s.attacksByUid[alias.uid],1);
 assert.equal(blockChoices(s).some(a=>a.uid===foe.uid),true);
 assertUniversalMatch(packs,s);

 let skipped=open(6211,['CSM-1-062','CSM-1-048']);
 const cost=put(skipped,0,'CSM-1-062','front',0);
 const denji=put(skipped,0,'CSM-1-048','front',1);
 skipped=use(skipped,legalUniversalActions(packs,skipped).find(a=>
  a.type==='activate'&&a.uid===cost.uid));
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(live(skipped,0,denji.uid).attackDrawGranted,undefined);
 const standing=put(skipped,1,'CSM-1-048','front',0,true);
 skipped=toPhase(skipped,'attack');
 const untouchedDeck=skipped.players[0].deck.length;
 skipped=use(skipped,{type:'attack',uid:denji.uid});
 assert.equal(skipped.pending?.kind,'block');
 assert.equal(skipped.players[0].deck.length,untouchedDeck);
 assert.equal(blockChoices(skipped).some(a=>a.uid===null),true);
 assert.equal(blockChoices(skipped).some(a=>a.uid===standing.uid),true);
 const untouched=live(skipped,0,denji.uid);
 untouched.attackDrawGranted={turn:skipped.turn,stamp:untouched.fieldEntryStamp,
  sourceUid:cost.uid,beneficiaryUid:untouched.uid,upTo:1};
 throwsForged(skipped,'Forged this-turn attack draw');
});

test('CSM-1-062 draw expires, and the Denji does not keep it after leaving and re-entering',()=>{
 let expired=open(6212,['CSM-1-062','CSM-1-049','CSM-1-060']);
 const beam=put(expired,0,'CSM-1-062','front',0);
 const denji=put(expired,0,'CSM-1-049','front',1);
 const foe=put(expired,1,'CSM-1-060','front',0,true);
 expired=use(expired,legalUniversalActions(packs,expired).find(a=>
  a.type==='activate'&&a.uid===beam.uid));
 expired=choose(expired,a=>a.mode==='pick'&&a.uid===denji.uid);
 const saved={...live(expired,0,denji.uid).attackDrawGranted};
 expired=passToOwnAttack(expired);
 assert.equal(live(expired,0,denji.uid).attackDrawGranted,undefined);
 assertUniversalMatch(packs,expired);
 const before=expired.players[0].deck.length;
 expired=use(expired,{type:'attack',uid:denji.uid});
 assert.equal(expired.pending?.kind,'block');
 assert.equal(expired.players[0].deck.length,before);
 const replay=structuredClone(expired);
 const replayBody=live(replay,0,denji.uid);
 replayBody.attackDrawGranted={...saved,turn:replay.turn};
 throwsForged(replay,'Forged this-turn attack draw');
 expired=use(expired,{type:'chooseBlock',uid:foe.uid});
 assert.equal(expired.players[0].deck.length,before);
 assert.equal(expired.attacksByUid[denji.uid],1);
 assertUniversalMatch(packs,expired);

 let s=open(6213,['CSM-1-062','CSM-1-049','CSM-1-009','CSM-1-001','CSM-1-060']);
 redFuel(s,0,['CSM-1-001','CSM-1-060','CSM-1-060','CSM-1-060']);
 const cost=put(s,0,'CSM-1-062','front',0);
 const target=put(s,0,'CSM-1-049','front',1);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===cost.uid));
 s=choose(s,a=>a.mode==='pick'&&a.uid===target.uid);
 const oldStamp=live(s,0,target.uid).fieldEntryStamp;
 const oldGrant={...live(s,0,target.uid).attackDrawGranted};
 const bounce=toHand(s,0,'CSM-1-009');
 s=play(s,bounce.uid);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseOwnBounce'&&
  a.uid===target.uid),true);
 s=choose(s,a=>a.type==='chooseOwnBounce'&&a.uid===target.uid);
 const handed=s.players[0].hand.find(c=>c.uid===target.uid);
 assert.equal(handed.attackDrawGranted,undefined);
 assert.equal(handed.fieldEntryStamp,null);
 s=play(s,target.uid);
 const returned=live(s,0,target.uid);
 assert.notEqual(returned.fieldEntryStamp,oldStamp);
 assert.equal(returned.attackDrawGranted,undefined);
 assertUniversalMatch(packs,s);
 returned.ready=true;
 const freshDeck=s.players[0].deck.length;
 const laterFoe=put(s,1,'CSM-1-060','front',0,true);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:returned.uid});
 assert.equal(s.pending?.kind,'block');
 assert.equal(s.players[0].deck.length,freshDeck);
 assert.equal(blockChoices(s).some(a=>a.uid===laterFoe.uid),true);
 const body=live(s,0,target.uid);
 body.attackDrawGranted={...oldGrant,stamp:body.fieldEntryStamp,
  beneficiaryUid:body.uid};
 throwsForged(s,'Forged this-turn attack draw');
});

test('CSM-1-062 lets printed and alias Denji choose draw 0 or 1 before block',()=>{
 for(const [seed,id] of [[6220,'CSM-1-049'],[6221,'CSM-1-048']]){
  let s=open(seed,['CSM-1-062',id,'CSM-1-060']);
  const beam=put(s,0,'CSM-1-062','front',0);
  const denji=put(s,0,id,'front',1);
  const foe=put(s,1,'CSM-1-060','front',0,true);
  s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===beam.uid));
  s=choose(s,a=>a.mode==='pick'&&a.uid===denji.uid);
  assert.equal(live(s,0,denji.uid).attackDrawGranted.upTo,1);
  s=toPhase(s,'attack');
  const before=s.players[0].deck.length;
  const topUid=s.players[0].deck[0].uid;
  s=use(s,{type:'attack',uid:denji.uid});
  assert.equal(s.pending?.kind,'effect-acquired-attack-draw');
  assert.equal(s.players[0].deck.length,before);
  assert.equal(s.attacksByUid[denji.uid],1);
  assert.deepEqual(legalUniversalActions(packs,s).filter(a=>a.type==='chooseAcquiredAttackDraw')
   .map(a=>a.mode),['skip','draw']);
  assert.equal(V2_PENDING_LABELS[s.pending.kind],'已獲得的攻擊時抽牌，可抽 0 或 1 張');
  assert.equal(uiActionLabel({type:'chooseAcquiredAttackDraw',mode:'draw'},{pack,state:s}),
   '已獲得的攻擊時抽 1 張');
  assert.equal(uiActionLabel({type:'chooseAcquiredAttackDraw',mode:'skip'},{pack,state:s}),
   '不抽牌');
  const ai=chooseUniversalAiAction(packs,s);
  assert.equal(ai.type,'chooseAcquiredAttackDraw');
  assert.equal(ai.mode,'draw');
  const mine=universalPrivateChoices(packs,s,0);
  assert.equal(mine.options.every(option=>option.card===null),true);
  assert.equal(JSON.stringify(mine).includes('"'+topUid+'"'),false);
  assert.equal(universalPrivateChoices(packs,s,1),null);
  for(const viewer of [0,1])
   assert.equal(JSON.stringify(universalPublicView(packs,s,viewer)).includes('"'+topUid+'"'),false);
  const paused=structuredClone(s);
  const skipped=drawChoice(paused,'skip');
  assert.equal(skipped.players[0].deck.length,before);
  assert.equal(skipped.players[0].hand.some(c=>c.uid===topUid),false);
  assert.equal(skipped.pending?.kind,'block');
  assert.equal(skipped.attacksByUid[denji.uid],1);
  assert.equal(s.pending?.kind,'effect-acquired-attack-draw');
  const drew=drawChoice(s,'draw');
  assert.equal(drew.players[0].deck.length,before-1);
  assert.equal(drew.players[0].hand.some(c=>c.uid===topUid),true);
  assert.equal(drew.zoneMoveEvents.filter(e=>e.owner===0&&e.from==='deck'&&
   e.to==='hand'&&e.uid===topUid).length,1);
  assert.equal(drew.pending?.kind,'block');
  assert.equal(drew.attacksByUid[denji.uid],1);
  assert.throws(()=>use(drew,{type:'chooseAcquiredAttackDraw',mode:'draw'}),
   /Action not currently legal/);
  const blocked=use(drew,{type:'chooseBlock',uid:foe.uid});
  assert.equal(blocked.players[0].deck.length,before-1);
  assert.equal(blocked.attacksByUid[denji.uid],1);
  assert.notEqual(blocked.pending?.kind,'effect-acquired-attack-draw');
  assertUniversalMatch(packs,blocked);
  assertUniversalMatch(packs,skipped);
 }
 let empty=open(6224,['CSM-1-062','CSM-1-049','CSM-1-060']);
 const cost=put(empty,0,'CSM-1-062','front',0);
 const denji=put(empty,0,'CSM-1-049','front',1);
 put(empty,1,'CSM-1-060','front',0,true);
 empty=use(empty,legalUniversalActions(packs,empty).find(a=>a.type==='activate'&&a.uid===cost.uid));
 empty=choose(empty,a=>a.mode==='pick'&&a.uid===denji.uid);
 empty=toPhase(empty,'attack');
 const parked=empty.players[0].deck.length;
 empty.players[0].removed.push(...empty.players[0].deck.splice(0));
 empty=use(empty,{type:'attack',uid:denji.uid});
 assert.equal(empty.pending?.kind,'block');
 assert.equal(empty.players[0].deck.length,0);
 assert.equal(empty.players[0].removed.length>=parked,true);
 assert.equal(empty.attacksByUid[denji.uid],1);
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='chooseAcquiredAttackDraw'),false);
 assertUniversalMatch(packs,empty);
});

test('CSM-1-062 draw choice remains after the beneficiary loses original effects',()=>{
 for(const [seed,id] of [[6222,'CSM-1-049'],[6223,'CSM-1-048']]){
  let s=open(seed,['CSM-1-062',id,'CSM-1-060']);
  const beam=put(s,0,'CSM-1-062','front',0);
  const denji=put(s,0,id,'front',1);
  const foe=put(s,1,'CSM-1-060','front',0,true);
  s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===beam.uid));
  s=choose(s,a=>a.mode==='pick'&&a.uid===denji.uid);
  const receiver=live(s,0,denji.uid);
  loseOriginal(s,receiver);
  assert.equal(receiver.attackDrawGranted.upTo,1);
  assertUniversalMatch(packs,s);
  s=toPhase(s,'attack');
  const before=s.players[0].deck.length;
  const topUid=s.players[0].deck[0].uid;
  s=use(s,{type:'attack',uid:denji.uid});
  assert.equal(s.pending?.kind,'effect-acquired-attack-draw');
  assert.equal(originalEffectsDisabled(s,live(s,0,denji.uid)),true);
  assert.equal(s.players[0].deck.length,before);
  s=drawChoice(s,'draw');
  assert.equal(s.players[0].deck.length,before-1);
  assert.equal(s.players[0].hand.some(c=>c.uid===topUid),true);
  assert.equal(s.pending?.kind,'block');
  assert.equal(s.attacksByUid[denji.uid],1);
  s=use(s,{type:'chooseBlock',uid:foe.uid});
  assert.equal(s.players[0].deck.length,before-1);
  assert.equal(s.attacksByUid[denji.uid],1);
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-061 must-block remains after the beneficiary loses original effects',()=>{
 for(const [seed,id] of [[6115,'CSM-1-049'],[6116,'CSM-1-048']]){
  let s=open(seed,['CSM-1-061',id,'CSM-1-060','CSM-1-062']);
  redFuel(s,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
  put(s,0,id,'front',1);
  const power=toHand(s,0,'CSM-1-061');
  s=play(s,power.uid);
  const entered=live(s,0,power.uid);
  assert.equal(universalBp(pack,s,entered),5000);
  const foe=put(s,1,'CSM-1-062','front',0,true);
  loseOriginal(s,entered);
  assert.equal(universalBp(pack,s,entered),5000);
  assert.equal(entered.mustBlockGranted?.witnessUid!==undefined,true);
  assertUniversalMatch(packs,s);
  entered.ready=true;
  s=toPhase(s,'attack');
  s=use(s,{type:'attack',uid:entered.uid});
  const blocks=blockChoices(s);
  assert.equal(blocks.some(a=>a.uid===null),false);
  assert.equal(blocks.some(a=>a.uid===foe.uid),true);
  s=use(s,{type:'chooseBlock',uid:foe.uid});
  assert.equal(s.attacksByUid[entered.uid],1);
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-062 online submit draws once and both seats keep the deck private',()=>{
 const required=['CSM-1-062','CSM-1-049','CSM-1-060'];
 const counts=countsFor(required);
 let match=open(6225,required);
 const beam=put(match,0,'CSM-1-062','front',0);
 const denji=put(match,0,'CSM-1-049','front',1);
 const foe=put(match,1,'CSM-1-060','front',0,true);
 match=use(match,legalUniversalActions(packs,match).find(a=>a.type==='activate'&&a.uid===beam.uid));
 match=choose(match,a=>a.mode==='pick'&&a.uid===denji.uid);
 match=toPhase(match,'attack');
 const before=match.players[0].deck.length;
 const topUid=match.players[0].deck[0].uid;
 match=use(match,{type:'attack',uid:denji.uid});
 assert.equal(match.pending?.kind,'effect-acquired-attack-draw');
 const paused=structuredClone(match);
 let room={code:'CSM06225',status:'playing',revision:1,first:0,match,log:[],updatedAt:1,
  seats:[0,1].map(side=>({userId:'user'+side,username:'玩家'+side,title:'csm',battleCounts:counts}))};
 const repos={pruneRooms(){},loadRoom:()=>structuredClone(room),saveRoom:r=>{room=structuredClone(r);}};
 const host=dispatchRoom(repos,{op:'view',code:room.code,userId:'user0'},2).public;
 const guest=dispatchRoom(repos,{op:'view',code:room.code,userId:'user1'},3).public;
 assert.equal(host.yourTurn,true);
 assert.equal(host.inspection,null);
 assert.equal(guest.yourTurn,false);
 assert.equal(guest.inspection,null);
 assert.equal(guest.choices.length,0);
 assert.equal(JSON.stringify(host).includes('"'+topUid+'"'),false);
 assert.equal(JSON.stringify(guest).includes('"'+topUid+'"'),false);
 const legal=legalUniversalActions(packs,room.match);
 const drawIndex=legal.findIndex(a=>a.type==='chooseAcquiredAttackDraw'&&a.mode==='draw');
 const skipIndex=legal.findIndex(a=>a.type==='chooseAcquiredAttackDraw'&&a.mode==='skip');
 assert.equal(host.choices.some(choice=>choice.index===drawIndex&&choice.mode==='draw'&&
  choice.label==='已獲得的攻擊時抽 1 張'),true);
 assert.equal(host.choices.some(choice=>choice.index===skipIndex&&choice.mode==='skip'&&
  choice.label==='不抽牌'),true);
 assert.throws(()=>dispatchRoom(repos,{op:'act',code:room.code,userId:'user1',index:drawIndex},4));
 dispatchRoom(repos,{op:'act',code:room.code,userId:'user0',index:drawIndex},5);
 assert.equal(room.match.players[0].deck.length,before-1);
 assert.equal(room.match.players[0].hand.some(c=>c.uid===topUid),true);
 assert.equal(room.match.pending?.kind,'block');
 assert.equal(room.match.attacksByUid[denji.uid],1);
 const afterGuest=dispatchRoom(repos,{op:'view',code:room.code,userId:'user1'},6).public;
 assert.equal(afterGuest.yourTurn,true);
 assert.equal(afterGuest.inspection,null);
 assert.equal(JSON.stringify(afterGuest).includes('"'+topUid+'"'),false);
 assert.equal(legalUniversalActions(packs,room.match).some(a=>a.type==='chooseAcquiredAttackDraw'),false);
 const blockIndex=legalUniversalActions(packs,room.match).findIndex(a=>
  a.type==='chooseBlock'&&a.uid===foe.uid);
 assert.equal(afterGuest.choices.some(choice=>choice.index===blockIndex&&choice.uid===foe.uid),true);
 assert.throws(()=>dispatchRoom(repos,{op:'act',code:room.code,userId:'user0',index:drawIndex},7),
  /現在不是你的回合/);
 assert.equal(room.match.players[0].deck.length,before-1);
 dispatchRoom(repos,{op:'act',code:room.code,userId:'user1',index:blockIndex},8);
 assert.equal(room.match.players[0].deck.length,before-1);
 assert.equal(room.match.attacksByUid[denji.uid],1);
 assert.notEqual(room.match.pending?.kind,'effect-acquired-attack-draw');
 const resumed=drawChoice(paused,'skip');
 assert.equal(resumed.players[0].deck.length,before);
 assert.equal(resumed.pending?.kind,'block');
 assert.equal(resumed.attacksByUid[denji.uid],1);
 assert.throws(()=>use(resumed,{type:'chooseAcquiredAttackDraw',mode:'skip'}),
  /Action not currently legal/);
 assertUniversalMatch(packs,room.match);
 assertUniversalMatch(packs,resumed);
});

test('CSM-1-063 draws one and then puts one hand card outside',()=>{
 let s=open(6301,['CSM-1-063','CSM-1-057','CSM-1-062']);
 const himeno=toHand(s,0,'CSM-1-063');
 const other=toHand(s,0,'CSM-1-057');
 const drawn=top(s,0,['CSM-1-062'])[0];
 s=play(s,himeno.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.pending?.kind,'effect-discard');
 s=choose(s,a=>a.uid===other.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-064 cuts hand energy only on an empty field and nullifies impact',()=>{
 let s=open(6401,['CSM-1-064','CSM-1-063']);
 const cheap=toHand(s,0,'CSM-1-064');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===cheap.uid),true);
 s=play(s,cheap.uid);
 assert.equal(universalImpactNull(pack,s,live(s,0,cheap.uid)),true);
 assertUniversalMatch(packs,s);

 let blocked=open(6402,['CSM-1-064','CSM-1-063']);
 put(blocked,0,'CSM-1-063','front',0);
 const full=toHand(blocked,0,'CSM-1-064');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='play'&&a.uid===full.uid),false);
 assert.equal(universalImpactNull(pack,blocked,live(blocked,0,blocked.players[0].front[0].uid)),false);
});

test('CSM-1-065 rests and activates one rested energy card once per turn',()=>{
 let s=open(6501,['CSM-1-065','CSM-1-060','CSM-1-057']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const himeno=put(s,0,'CSM-1-065','front',0);
 const rested=put(s,0,'CSM-1-057','energy',2,false);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===himeno.uid));
 assert.equal(live(s,0,himeno.uid).ready,false);
 assert.equal(s.pending?.step,'activeEnergy');
 assert.deepEqual(s.pending.actions.map(a=>a.uid),[rested.uid]);
 s=choose(s,a=>a.uid===rested.uid);
 assert.equal(live(s,0,rested.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===himeno.uid),false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-066 raid attack-end and end-phase swap stay in the box; entry draw and retirement do not',()=>{
 assert.equal(raidBoxListed('CSM-1-066','attackEnd'),true);
 assert.equal(raidBoxListed('CSM-1-066','phase'),true);
 assert.equal(raidBoxListed('CSM-1-066','onPlay'),false);
 let raid=open(6601,['CSM-1-066','CSM-1-063','CSM-1-057','CSM-1-062','CSM-1-060']);
 redFuel(raid,0,['CSM-1-060','CSM-1-060']);
 const base=put(raid,0,'CSM-1-063','front',0);
 put(raid,0,'CSM-1-057','front',1);
 put(raid,0,'CSM-1-062','energy',2);
 const hand=raid.players[0].hand.length;
 const topCard=toHand(raid,0,'CSM-1-066');
 const blocker=put(raid,1,'CSM-1-062','front',0,true);
 raid=use(raid,legalUniversalActions(packs,raid).find(a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid));
 assert.equal(raid.players[0].hand.length,hand+1);
 const himeno=live(raid,0,topCard.uid);
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:himeno.uid});
 raid=use(raid,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(raid.pending?.step,'mayRetire');
 assert.equal(raid.pending.actions.some(a=>a.mode==='skip'),true);
 raid=choose(raid,a=>a.mode==='skip');
 assert.equal(live(raid,0,himeno.uid)?.uid,himeno.uid);
 raid=use(raid,{type:'next'});
 assert.equal(raid.pending?.step,'himenoSwap');
 const power=raid.players[0].front.find(c=>c?.cardId==='CSM-1-057');
 raid=choose(raid,a=>a.mode==='front'&&a.uid===power.uid);
 const beam=raid.players[0].energy.find(c=>c?.cardId==='CSM-1-062');
 raid=choose(raid,a=>a.mode==='energy'&&a.uid===beam.uid);
 assert.equal(raid.players[0].energy.some(c=>c?.uid===power.uid),true);
 assert.equal(raid.players[0].front.some(c=>c?.uid===beam.uid),true);
 assertUniversalMatch(packs,raid);

 let plain=open(6602,['CSM-1-066','CSM-1-060','CSM-1-057']);
 redFuel(plain,0,['CSM-1-060','CSM-1-060']);
 const played=toHand(plain,0,'CSM-1-066');
 const before=plain.players[0].hand.length;
 plain=play(plain,played.uid);
 assert.equal(plain.players[0].hand.length,before);
 plain=passToOwnAttack(plain);
 plain=use(plain,{type:'attack',uid:played.uid});
 plain=use(plain,{type:'chooseBlock',uid:null});
 assert.notEqual(plain.pending?.step,'mayRetire');
 assertUniversalMatch(packs,plain);
});

test('CSM-1-066 retirement ignores printed BP 4500 and can move the chosen energy character',()=>{
 let blocked=open(6603,['CSM-1-066','CSM-1-048','CSM-1-060','CSM-1-049','CSM-1-080','CSM-1-062']);
 redFuel(blocked,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const himeno=put(blocked,1,'CSM-1-066','front',0);
 toOutside(blocked,1,'CSM-1-048');
 put(blocked,0,'CSM-1-049','front',0);
 put(blocked,1,'CSM-1-062','energy',0);
 blocked=play(blocked,toHand(blocked,0,'CSM-1-080').uid,'event');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.uid===himeno.uid),true);
 blocked=choose(blocked,a=>a.uid===himeno.uid);
 assert.notEqual(blocked.pending?.step,'buffMoveFront');
 assert.equal(blocked.players[1].outside.some(c=>c.uid===himeno.uid),true);
 assertUniversalMatch(packs,blocked);

 let openRetire=open(6604,['CSM-1-066','CSM-1-062','CSM-1-060','CSM-1-049','CSM-1-080','CSM-1-057']);
 redFuel(openRetire,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const body=put(openRetire,1,'CSM-1-066','front',0);
 put(openRetire,0,'CSM-1-049','front',0);
 const mover=put(openRetire,1,'CSM-1-062','energy',0);
 openRetire=play(openRetire,toHand(openRetire,0,'CSM-1-080').uid,'event');
 openRetire=choose(openRetire,a=>a.uid===body.uid);
 assert.equal(openRetire.pending?.step,'buffMoveFront');
 assert.equal(openRetire.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(openRetire.pending.actions.some(a=>a.uid===mover.uid),true);
 openRetire=choose(openRetire,a=>a.mode==='pick'&&a.uid===mover.uid);
 assert.equal(universalBp(pack,openRetire,live(openRetire,1,mover.uid)),3000);
 assert.equal(openRetire.pending?.step,'moveFront');
 openRetire=choose(openRetire,a=>a.mode==='move'&&a.slot===0);
 assert.equal(openRetire.players[1].front[0]?.uid,mover.uid);
 assertUniversalMatch(packs,openRetire);
});

test('CSM-1-066 end-phase swap is offered only while she is on the front',()=>{
 let energy=open(6605,['CSM-1-066','CSM-1-063','CSM-1-057','CSM-1-062']);
 const stored=buryRaid(put(energy,0,'CSM-1-066','energy',0),take(energy,0,'CSM-1-063'));
 put(energy,0,'CSM-1-057','front',0);
 put(energy,0,'CSM-1-062','energy',1);
 runCsmJob(pack,energy,{op:'csm',id:'CSM-1-066',slot:'endStart',owner:0,sourceUid:stored.uid});
 assert.equal(energy.pending,null);

 let front=open(6606,['CSM-1-066','CSM-1-063','CSM-1-057','CSM-1-062']);
 const himeno=buryRaid(put(front,0,'CSM-1-066','front',0),take(front,0,'CSM-1-063'));
 put(front,0,'CSM-1-057','front',1);
 put(front,0,'CSM-1-062','energy',0);
 front.phase='attack';
 front=use(front,{type:'next'});
 assert.equal(front.pending?.step,'himenoSwap');
 assert.equal(front.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(front.pending.actions.some(a=>a.mode==='front'&&a.uid!==himeno.uid),true);
 front=choose(front,a=>a.mode==='skip');
 assert.equal(front.pending,null);
 assert.equal(front.players[0].front[0]?.uid,himeno.uid);
 assertUniversalMatch(packs,front);
});

test('CSM-1-067 cannot enter the front and the controller alone sees the top card',()=>{
 let s=open(6701,['CSM-1-067','CSM-1-062']);
 const secret=top(s,0,['CSM-1-062'])[0];
 const pochita=toHand(s,0,'CSM-1-067');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===pochita.uid&&a.line==='front'),false);
 s=play(s,pochita.uid,'play','energy');
 assert.equal(s.pending?.kind,'private-top-choice');
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.options.every(option=>option.card?.cardId==='CSM-1-062'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const published=JSON.stringify(universalPublicView(pack,s,1).players[0]);
 assert.equal(published.includes(secret.uid),false);
 assert.equal(published.includes(secret.cardId),false);
 s=choose(s,a=>a.mode==='top');
 assert.equal(s.players[0].deck[0]?.uid,secret.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-068 returns from outside only after the hand payment',()=>{
 let paid=open(6801,['CSM-1-068','CSM-1-074','CSM-1-049','CSM-1-060','CSM-1-080']);
 redFuel(paid,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const makima=put(paid,1,'CSM-1-068','front',0);
 put(paid,0,'CSM-1-049','front',0);
 const event=toHand(paid,1,'CSM-1-074');
 paid=play(paid,toHand(paid,0,'CSM-1-080').uid,'event');
 paid=choose(paid,a=>a.uid===makima.uid);
 assert.equal(paid.pending?.step,'payReturn');
 assert.equal(paid.pending.actions.some(a=>a.mode==='event'&&a.uid===event.uid),true);
 paid=choose(paid,a=>a.mode==='event'&&a.uid===event.uid);
 assert.equal(paid.players[1].hand.some(c=>c.uid===makima.uid),true);
 assert.equal(paid.players[1].outside.some(c=>c.uid===event.uid),true);
 assertUniversalMatch(packs,paid);

 let skipped=open(6802,['CSM-1-068','CSM-1-074','CSM-1-049','CSM-1-060','CSM-1-080']);
 redFuel(skipped,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const body=put(skipped,1,'CSM-1-068','front',0);
 put(skipped,0,'CSM-1-049','front',0);
 toHand(skipped,1,'CSM-1-074');
 skipped=play(skipped,toHand(skipped,0,'CSM-1-080').uid,'event');
 skipped=choose(skipped,a=>a.uid===body.uid);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[1].outside.some(c=>c.uid===body.uid),true);
 assert.equal(skipped.players[1].hand.some(c=>c.uid===body.uid),false);
 assertUniversalMatch(packs,skipped);

 let pair=open(6803,['CSM-1-068','CSM-1-062','CSM-1-057','CSM-1-049','CSM-1-060','CSM-1-080']);
 redFuel(pair,0,['CSM-1-060','CSM-1-060','CSM-1-060','CSM-1-060']);
 const retired=put(pair,1,'CSM-1-068','front',0);
 put(pair,0,'CSM-1-049','front',0);
 const first=toHand(pair,1,'CSM-1-062');
 const second=toHand(pair,1,'CSM-1-057');
 pair=play(pair,toHand(pair,0,'CSM-1-080').uid,'event');
 pair=choose(pair,a=>a.uid===retired.uid);
 pair=choose(pair,a=>a.mode==='char'&&a.uid===first.uid);
 assert.equal(pair.pending?.step,'payReturn');
 assert.equal(pair.pending.actions.some(a=>a.mode==='skip'),false);
 pair=choose(pair,a=>a.mode==='char'&&a.uid===second.uid);
 assert.equal(pair.players[1].hand.some(c=>c.uid===retired.uid),true);
 assert.equal(pair.players[1].outside.some(c=>c.uid===first.uid),true);
 assert.equal(pair.players[1].outside.some(c=>c.uid===second.uid),true);
 assertUniversalMatch(packs,pair);
});

test('CSM-1-069 adds red energy only while active on the energy line',()=>{
 let s=open(6901,['CSM-1-069']);
 const makima=put(s,0,'CSM-1-069','energy',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 makima.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=makima;
 assert.equal(universalEnergyByColor(pack,s,0).red||0,0);
 assertUniversalMatch(packs,s);
});

test('CSM-1-070 swaps from the front only and must retire a non-Makima character',()=>{
 let s=open(7001,['CSM-1-070','CSM-1-067','CSM-1-062','CSM-1-068']);
 const makima=put(s,0,'CSM-1-070','front',0);
 const pochita=put(s,0,'CSM-1-067','energy',0);
 const beam=put(s,0,'CSM-1-062','energy',1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===makima.uid),true);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===makima.uid));
 assert.equal(s.pending.actions.some(a=>a.uid===pochita.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===beam.uid),true);
 s=choose(s,a=>a.uid===beam.uid);
 assert.equal(s.players[0].energy[1]?.uid,makima.uid);
 assert.equal(s.players[0].front[0]?.uid,beam.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===makima.uid),false);
 assertUniversalMatch(packs,s);

 let attack=open(7002,['CSM-1-070','CSM-1-068','CSM-1-062']);
 const copy=put(attack,0,'CSM-1-070','energy',0);
 assert.equal(legalUniversalActions(packs,attack).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 const striker=put(attack,0,'CSM-1-070','front',0);
 const other=put(attack,0,'CSM-1-062','front',1);
 attack=toPhase(attack,'attack');
 attack=use(attack,{type:'attack',uid:striker.uid});
 assert.equal(attack.pending?.step,'retireOwn');
 assert.equal(attack.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(attack.pending.actions.some(a=>a.uid===striker.uid),false);
 assert.equal(attack.pending.actions.some(a=>a.uid===other.uid),true);
 attack=choose(attack,a=>a.uid===other.uid);
 assert.equal(attack.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(attack.pending?.kind,'block');
 assertUniversalMatch(packs,attack);
});

test('CSM-1-071 shows the one looked-at card to its controller and can put it on the bottom',()=>{
 let s=open(7101,['CSM-1-071','CSM-1-060','CSM-1-062']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const devil=put(s,0,'CSM-1-071','front',0);
 const secret=top(s,0,['CSM-1-062'])[0];
 const below=s.players[0].deck[1];
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===devil.uid));
 assert.equal(live(s,0,devil.uid).ready,false);
 assert.equal(s.pending?.step,'topPlace');
 assert.deepEqual(s.pending.data.window,[secret.uid]);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-062']);
 const art=controllerChoiceArt(pack,s,{type:'csm',mode:'bottom'});
 assert.equal(art[0]?.cardId,'CSM-1-062');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const published=JSON.stringify(universalPublicView(pack,s,1).players[0]);
 assert.equal(published.includes(secret.uid),false);
 assert.equal(published.includes(secret.cardId),false);
 s=choose(s,a=>a.mode==='bottom');
 assert.equal(s.players[0].deck.at(-1)?.uid,secret.uid);
 assert.equal(s.players[0].deck[0]?.uid,below.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-072 recovers Aki only after an effect move outside the move phase',()=>{
 let moved=open(7201,['CSM-1-072','CSM-1-070','CSM-1-052','CSM-1-055']);
 const devil=put(moved,0,'CSM-1-072','energy',0);
 const makima=put(moved,0,'CSM-1-070','front',0);
 const cheap=toOutside(moved,0,'CSM-1-052');
 const costly=toOutside(moved,0,'CSM-1-055');
 moved=use(moved,legalUniversalActions(packs,moved).find(a=>a.type==='activate'&&a.uid===makima.uid));
 moved=choose(moved,a=>a.uid===devil.uid);
 assert.equal(moved.players[0].front[0]?.uid,devil.uid);
 assert.equal(moved.players[0].front[0].csmMovedOutsideMove,moved.turn);
 moved=toPhase(moved,'attack');
 moved=use(moved,{type:'attack',uid:devil.uid});
 assert.equal(moved.pending?.step,'recover');
 assert.equal(moved.pending.actions.some(a=>a.uid===cheap.uid),true);
 assert.equal(moved.pending.actions.some(a=>a.uid===costly.uid),false);
 moved=choose(moved,a=>a.mode==='take'&&a.uid===cheap.uid);
 assert.equal(moved.players[0].hand.some(c=>c.uid===cheap.uid),true);
 assert.equal(moved.pending?.kind,'block');
 assertUniversalMatch(packs,moved);

 const counts=countsFor(['CSM-1-072','CSM-1-052','CSM-1-057']);
 let step=toPhase(fresh(counts,7202),'move');
 readyAp(step);dumpHand(step);
 const walker=put(step,0,'CSM-1-072','energy',0);
 toOutside(step,0,'CSM-1-052');
 step=use(step,legalUniversalActions(packs,step).find(a=>a.type==='move'&&a.uid===walker.uid&&a.slot===0));
 assert.equal(step.players[0].front[0]?.uid,walker.uid);
 assert.equal(step.players[0].front[0].csmMovedOutsideMove,undefined);
 step=toPhase(step,'attack');
 step=use(step,{type:'attack',uid:walker.uid});
 assert.equal(step.pending?.kind,'block');
 assertUniversalMatch(packs,step);
});

test('CSM-1-073 shows all four cards, publishes only the added one, and does not discard',()=>{
 let s=open(7301,['CSM-1-073','CSM-1-060','CSM-1-052','CSM-1-062','CSM-1-067']);
 redFuel(s,0,['CSM-1-060']);
 const [aki,beam,pochita,extra]=top(s,0,['CSM-1-052','CSM-1-062','CSM-1-067','CSM-1-060']);
 const hand=s.players[0].hand.length;
 const reveals=s.publicReveals.length;
 s=play(s,toHand(s,0,'CSM-1-073').uid,'play','energy');
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[aki.uid,beam.uid,pochita.uid,extra.uid]);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-052','CSM-1-062','CSM-1-067','CSM-1-060']);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===aki.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===beam.uid),false);
 assert.equal(s.publicReveals.length,reveals,JSON.stringify(s.publicReveals.slice(reveals)));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=choose(s,a=>a.uid===aki.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===aki.uid),true);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.publicReveals.some(r=>r.cardId==='CSM-1-052'),true);
 assert.equal(s.publicReveals.some(r=>r.cardId==='CSM-1-062'),false);
 assert.equal(s.pending?.kind,'effect-top-order');
 s=choose(s,a=>a.uid===extra.uid);
 s=choose(s,a=>a.uid===pochita.uid);
 s=choose(s,a=>a.uid===beam.uid);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[extra.uid,pochita.uid,beam.uid]);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-074 and CSM-1-079 activate up to two AP cards',()=>{
 for(const [id,seed] of [['CSM-1-074',7401],['CSM-1-079',7901]]){
  let s=open(seed,[id,'CSM-1-060']);
  redFuel(s,0,['CSM-1-060','CSM-1-060']);
  s.players[0].apCards[0].ready=false;
  s.players[0].apCards[1].ready=false;
  s=play(s,toHand(s,0,id).uid,'event');
  assert.equal(s.pending?.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  const firstAp=s.players[0].apCards[0];
  const secondAp=s.players[0].apCards[1];
  s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===firstAp.uid);
  s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===secondAp.uid);
  assert.equal(s.players[0].apCards[0].ready,true);
  assert.equal(s.players[0].apCards[1].ready,true);
  assert.equal(s.players[0].apCards[2].ready,false);
  assert.equal(s.pending,null);
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-075 buffs first, peels the chosen facedown, then readies one AP and may grant impact',()=>{
 let s=open(7501,['CSM-1-075','CSM-1-056','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-057']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const [bottom,mid,topCard]=top(s,0,['CSM-1-062','CSM-1-067','CSM-1-057']);
 const aki=toHand(s,0,'CSM-1-056');
 s=play(s,aki.uid);
 assert.equal(csmFacedowns(live(s,0,aki.uid)).map(c=>c.uid).join(','),
  [bottom.uid,mid.uid,topCard.uid].join(','));
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 const before=universalBp(pack,s,live(s,0,aki.uid));
 s=play(s,toHand(s,0,'CSM-1-075').uid,'event');
 s=choose(s,a=>a.mode==='pick'&&a.uid===aki.uid);
 assert.equal(universalBp(pack,s,live(s,0,aki.uid)),before+2000);
 assert.equal(s.pending?.step,'peelAki');
 assert.equal(s.pending.actions.filter(a=>a.mode==='peel').length,3);
 s=choose(s,a=>a.mode==='peel'&&a.uid===bottom.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===bottom.uid),true);
 assert.equal(csmFacedowns(live(s,0,aki.uid)).some(c=>c.uid===topCard.uid),true);
 assert.equal(s.pending?.step,'ap');
 s=choose(s,a=>a.mode==='ap'&&a.index===0);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,false);
 assert.equal(s.pending?.step,'grantImpact');
 s=choose(s,a=>a.mode==='pick'&&a.uid===aki.uid);
 assert.equal(live(s,0,aki.uid).impactGranted?.amount,1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let skipped=open(7502,['CSM-1-075','CSM-1-056','CSM-1-060','CSM-1-062']);
 redFuel(skipped,0,['CSM-1-060','CSM-1-060']);
 top(skipped,0,['CSM-1-062']);
 const host=toHand(skipped,0,'CSM-1-056');
 skipped=play(skipped,host.uid);
 skipped.players[0].apCards[0].ready=false;
 skipped.players[0].apCards[1].ready=false;
 skipped=play(skipped,toHand(skipped,0,'CSM-1-075').uid,'event');
 skipped=choose(skipped,a=>a.uid===host.uid);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(csmFacedowns(live(skipped,0,host.uid)).length,3);
 assert.equal(skipped.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 assert.equal(live(skipped,0,host.uid).impactGranted,undefined);
 assert.equal(skipped.pending,null);
 assertUniversalMatch(packs,skipped);
});

test('CSM-1-076 look keeps the window private, and the tuck readies an AP when Denji is not raided',()=>{
 let look=open(7601,['CSM-1-076','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-050']);
 redFuel(look,0,['CSM-1-060']);
 const [first,second]=top(look,0,['CSM-1-062','CSM-1-067']);
 const denji=toOutside(look,0,'CSM-1-050');
 const reveals=look.publicReveals.length;
 look=play(look,toHand(look,0,'CSM-1-076').uid,'event');
 assert.equal(look.pending.actions.some(a=>a.mode==='tuck'),false);
 look=choose(look,a=>a.mode==='look');
 assert.deepEqual(look.pending.data.window,[first.uid,second.uid]);
 const shown=controllerDeckWindowCards(look,packs,legalUniversalActions(packs,look));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-062','CSM-1-067']);
 assert.equal(look.publicReveals.length,reveals);
 assert.equal(universalPrivateChoices(packs,look,1),null);
 look=choose(look,a=>a.mode==='outside'&&a.uid===first.uid);
 look=choose(look,a=>a.mode==='done');
 assert.equal(look.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(look.players[0].deck[0]?.uid,second.uid);
 assert.equal(look.pending?.step,'denjiEnergy');
 look=choose(look,a=>a.mode==='skip');
 assert.equal(look.players[0].energy.some(c=>c?.uid===denji.uid),false);
 assert.equal(look.pending,null);
 assertUniversalMatch(packs,look);

 let tuck=open(7602,['CSM-1-076','CSM-1-060','CSM-1-049']);
 redFuel(tuck,0,['CSM-1-060']);
 const host=put(tuck,0,'CSM-1-049','front',0);
 tuck.players[0].apCards.forEach((c,i)=>{c.inPlay=i===0;c.ready=i===0;});
 const event=toHand(tuck,0,'CSM-1-076');
 tuck=play(tuck,event.uid,'event');
 assert.equal(tuck.pending.actions.some(a=>a.mode==='tuck'),true);
 tuck=choose(tuck,a=>a.mode==='tuck');
 assert.equal(tuck.pending?.step,'dreamTuck');
 tuck=choose(tuck,a=>a.mode==='host'&&a.uid===host.uid);
 assert.equal(csmFacedowns(live(tuck,0,host.uid)).some(c=>c.uid===event.uid),true);
 assert.equal(tuck.players[0].apCards[0].ready,true);
 assert.equal(tuck.pending,null);
 assertUniversalMatch(packs,tuck);
});

test('CSM-1-077 still offers the Aki peel when no front character is at 5000 or less',()=>{
 let s=open(7701,['CSM-1-077','CSM-1-052','CSM-1-060','CSM-1-058','CSM-1-062']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const aki=put(s,0,'CSM-1-052','front',0);
 const under=take(s,0,'CSM-1-062');
 under.faceDown=true;under.ready=false;under.fieldEntryStamp=null;
 aki.under=[under];
 const tall=put(s,1,'CSM-1-058','front',0);
 tall.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.ok(universalBp(pack,s,tall)>5000);
 s=play(s,toHand(s,0,'CSM-1-077').uid,'event');
 assert.equal(s.pending?.step,'peelAki');
 assert.equal(s.players[1].front[0]?.uid,tall.uid);
 s=choose(s,a=>a.mode==='peel'&&a.uid===under.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===under.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('CSM-1-078 draws three only for Hayakawa house or a facedown under Denji',()=>{
 let plain=open(7801,['CSM-1-078','CSM-1-060','CSM-1-062','CSM-1-067']);
 redFuel(plain,0,['CSM-1-060','CSM-1-060']);
 const two=top(plain,0,['CSM-1-062','CSM-1-067']);
 plain=play(plain,toHand(plain,0,'CSM-1-078').uid,'event');
 assert.equal(plain.players[0].hand.filter(c=>two.some(x=>x.uid===c.uid)).length,2);
 assert.equal(plain.players[0].hand.length,2);
 assertUniversalMatch(packs,plain);

 let house=open(7802,['CSM-1-078','CSM-1-073','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-057']);
 redFuel(house,0,['CSM-1-060','CSM-1-060','CSM-1-060']);
 put(house,0,'CSM-1-073','energy',3);
 const three=top(house,0,['CSM-1-062','CSM-1-067','CSM-1-057']);
 house=play(house,toHand(house,0,'CSM-1-078').uid,'event');
 assert.equal(house.players[0].hand.filter(c=>three.some(x=>x.uid===c.uid)).length,3);
 assert.equal(house.players[0].hand.length,3);
 assertUniversalMatch(packs,house);

 let otherHost=open(7803,['CSM-1-078','CSM-1-052','CSM-1-060','CSM-1-062','CSM-1-067']);
 redFuel(otherHost,0,['CSM-1-060','CSM-1-060']);
 const aki=put(otherHost,0,'CSM-1-052','front',0);
 const down=take(otherHost,0,'CSM-1-067');
 down.faceDown=true;down.ready=false;down.fieldEntryStamp=null;
 aki.under=[down];
 const pair=top(otherHost,0,['CSM-1-062','CSM-1-060']);
 otherHost=play(otherHost,toHand(otherHost,0,'CSM-1-078').uid,'event');
 assert.equal(otherHost.players[0].hand.filter(c=>pair.some(x=>x.uid===c.uid)).length,2);
 assertUniversalMatch(packs,otherHost);

 let denji=open(7804,['CSM-1-078','CSM-1-049','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-057']);
 redFuel(denji,0,['CSM-1-060','CSM-1-060']);
 const host=put(denji,0,'CSM-1-049','front',0);
 const real=take(denji,0,'CSM-1-067');
 real.faceDown=true;real.ready=false;real.fieldEntryStamp=null;
 host.under=[real];
 const triple=top(denji,0,['CSM-1-062','CSM-1-060','CSM-1-057']);
 denji=play(denji,toHand(denji,0,'CSM-1-078').uid,'event');
 assert.equal(denji.players[0].hand.filter(c=>triple.some(x=>x.uid===c.uid)).length,3);
 assertUniversalMatch(packs,denji);
});

test('CSM-1-080 retires current BP 3000, or 5000 while Denji is on the field',()=>{
 let s=open(8001,['CSM-1-080','CSM-1-060','CSM-1-072','CSM-1-058','CSM-1-049']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const small=put(s,1,'CSM-1-072','front',0);
 small.buffs=[{bp:1000,untilTurn:s.turn}];
 const big=put(s,1,'CSM-1-058','front',1);
 s=play(s,toHand(s,0,'CSM-1-080').uid,'event');
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front.some(c=>c?.uid===small.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===big.uid),true);
 assertUniversalMatch(packs,s);

 let raised=open(8002,['CSM-1-080','CSM-1-060','CSM-1-058','CSM-1-049','CSM-1-072']);
 redFuel(raised,0,['CSM-1-060','CSM-1-060']);
 put(raised,0,'CSM-1-049','front',0);
 const target=put(raised,1,'CSM-1-058','front',0);
 const over=put(raised,1,'CSM-1-072','front',1);
 over.buffs=[{bp:3000,untilTurn:raised.turn}];
 raised=play(raised,toHand(raised,0,'CSM-1-080').uid,'event');
 assert.equal(legalUniversalActions(packs,raised).some(a=>a.uid===target.uid),true);
 assert.equal(legalUniversalActions(packs,raised).some(a=>a.uid===over.uid),false);
 raised=choose(raised,a=>a.uid===target.uid);
 assert.equal(raised.players[1].outside.some(c=>c.uid===target.uid),true);
 assertUniversalMatch(packs,raised);
});

test('controller sees Chainsaw Man facedown cards and the opponent receives neither identity nor order',()=>{
 let s=open(7099,['CSM-1-056','CSM-1-060','CSM-1-062','CSM-1-067','CSM-1-057']);
 redFuel(s,0,['CSM-1-060','CSM-1-060']);
 const [bottom,mid,topCard]=top(s,0,['CSM-1-062','CSM-1-067','CSM-1-057']);
 const aki=toHand(s,0,'CSM-1-056');
 s=play(s,aki.uid);
 const host=live(s,0,aki.uid);
 const own=universalPublicView(pack,s,0).players[0].front.find(c=>c.uid===host.uid);
 const foe=universalPublicView(pack,s,1).players[0].front.find(c=>c.uid===host.uid);
 assert.deepEqual(own.underLayers.map(c=>c.cardId),[bottom.cardId,mid.cardId,topCard.cardId]);
 assert.deepEqual(foe.underLayers,[{faceDown:true},{faceDown:true},{faceDown:true}]);
 const foeJson=JSON.stringify(foe.underLayers);
 for(const id of [bottom.cardId,mid.cardId,topCard.cardId,bottom.uid,mid.uid,topCard.uid])
  assert.equal(foeJson.includes(id),false,id);
 const ownModel=facedownInspectModel(own);
 const foeModel=facedownInspectModel(foe);
 assert.equal(ownModel.private,true);
 assert.deepEqual(ownModel.cards.map(c=>c.cardId),[bottom.cardId,mid.cardId,topCard.cardId]);
 assert.equal(foeModel.cards.every(c=>c.hidden===true&&!c.cardId&&!c.name),true);
 const ownGallery=galleryText(ownModel);
 const foeGallery=galleryText(foeModel);
 assert.equal(ownGallery.images.join(','),[bottom.cardId,mid.cardId,topCard.cardId].join(','));
 assert.equal(ownGallery.text.includes('ビーム'),true);
 assert.deepEqual(foeGallery.images,[]);
 assert.equal(foeGallery.text.includes('卡背朝上'),true);
 for(const secret of ['CSM-1-062','CSM-1-067','CSM-1-057','ビーム','ポチタ'])
  assert.equal(foeGallery.text.includes(secret),false,secret);
 const before=JSON.stringify(universalPublicView(pack,s,1).players[0].front.find(c=>c.uid===host.uid).underLayers);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='reorderUnder'&&a.uid===host.uid&&a.index===0));
 const afterOwn=universalPublicView(pack,s,0).players[0].front.find(c=>c.uid===host.uid);
 const afterFoe=JSON.stringify(universalPublicView(pack,s,1).players[0].front.find(c=>c.uid===host.uid).underLayers);
 assert.deepEqual(afterOwn.underLayers.map(c=>c.cardId),[mid.cardId,bottom.cardId,topCard.cardId]);
 assert.equal(afterFoe,before);
 assertUniversalMatch(packs,s);
});

test('life triggers of CSM-1-061 through 080 stay on the printed trigger',()=>{
 const raidCases=[['CSM-1-061','CSM-1-057'],['CSM-1-066','CSM-1-063']];
 for(const [id,baseId] of raidCases){
  const counts=countsFor([id,baseId,'CSM-1-005','CSM-1-060']);
  let s=toPhase(fresh(counts,8100+Number(id.slice(-2))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const base=put(s,1,baseId,'front',0,true);
  redFuel(s,1,['CSM-1-060','CSM-1-060','CSM-1-060']);
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'raid',id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='get'),true);
  s=use(s,legalUniversalActions(packs,s).find(a=>a.mode==='raid'&&a.baseUid===base.uid));
  assert.equal(s.players[1].front.some(c=>c?.cardId===id&&c.stack.some(x=>x.uid===base.uid)),true);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-064','CSM-1-076']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-003','CSM-1-008']);
  let s=toPhase(fresh(counts,8200+Number(id.slice(-2))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const ally=put(s,1,'CSM-1-003','front',0,false);
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'active',id);
  s=use(s,{type:'chooseTrigger',mode:'active',uid:ally.uid});
  assert.equal(live(s,1,ally.uid).ready,true);
  assert.equal(universalBp(pack,s,live(s,1,ally.uid)),pack.cards['CSM-1-003'].bp+3000);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-065','CSM-1-067']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-062','CSM-1-008']);
  let s=toPhase(fresh(counts,8300+Number(id.slice(-2))),'attack');
  const victim=put(s,0,'CSM-1-062','front',0,true);
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:victim.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'color',id);
  s=use(s,{type:'chooseTrigger',mode:'colorRetire',uid:victim.uid});
  assert.equal(s.players[0].outside.some(c=>c.uid===victim.uid),true);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-063','CSM-1-068','CSM-1-071','CSM-1-075','CSM-1-078']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,8400+Number(id.slice(-2))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  revealLife(s,1,id);
  const hand=s.players[1].hand.length;
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'draw',id);
  s=use(s,{type:'chooseTrigger',mode:'draw'});
  assert.equal(s.players[1].hand.length,hand+1);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-070','CSM-1-073']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,8500+Number(id.slice(-2))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const life=revealLife(s,1,id);
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'get',id);
  s=use(s,{type:'chooseTrigger',mode:'get'});
  assert.equal(s.players[1].hand.some(c=>c.uid===life.uid),true);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-077','CSM-1-080']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-061','CSM-1-008']);
  let s=toPhase(fresh(counts,8600+Number(id.slice(-2))),'attack');
  const victim=put(s,0,'CSM-1-061','front',0,true);
  revealLife(s,1,id);
  s=use(s,{type:'attack',uid:victim.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'special',id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===victim.uid),true);
  s=use(s,{type:'chooseTrigger',mode:'special',uid:victim.uid});
  assert.equal(s.players[0].outside.some(c=>c.uid===victim.uid),true);
  assertUniversalMatch(packs,s);
 }
 for(const id of ['CSM-1-074','CSM-1-079']){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,8700+Number(id.slice(-2))),'attack');
  put(s,0,'CSM-1-005','front',0,true);
  const trigger=take(s,1,id);
  const topCard=s.players[1].deck[0];
  s.players[1].deck.push(...s.players[1].life.splice(0));
  s.players[1].life=[trigger];
  s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'final',id);
  s=use(s,{type:'chooseTrigger',mode:'final'});
  assert.equal(s.players[1].life[0]?.uid,topCard.uid);
  assertUniversalMatch(packs,s);
 }
});
