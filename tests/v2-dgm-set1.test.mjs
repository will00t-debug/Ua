import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DGM_CARDS} from '../dist/dgm-cards.mjs';
import {createDgmV2Pack,DGM_ENGINE_IDS} from '../dist/universal-v2/dgm-pack.mjs';
import {dgmEngineKind} from '../dist/universal-v2/dgm-classify.mjs';
import {parseGen,parseNeed} from '../scripts/fetch-dgm-ua58.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {dgmPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,universalBp,universalCardEnergy,universalEnergyByColor,universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';

const pack=createDgmV2Pack();
const packs=[pack,pack];
const byId=new Map(DGM_CARDS.map(card=>[card.id,card]));
const REGISTERED=Array.from({length:80},(_,i)=>'DGM-1-'+String(i+1).padStart(3,'0'));
const RAID_FRAMES=['DGM-1-009','DGM-1-013','DGM-1-015','DGM-1-032','DGM-1-047','DGM-1-065','DGM-1-067','DGM-1-068','DGM-1-073'];

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
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

function fresh(counts,seed=58058){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}

function readyAp(s,n=2){
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<n;
  s.players[0].apCards[i].ready=i<n;
 }
}

function nextOwnMain(s,player=0){
 const turn=s.turn;
 let guard=0;
 while(!(s.active===player&&s.phase==='main'&&s.turn!==turn)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the next own main');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach the next own main');
 }
 return s;
}

function playLine(s,uid,line){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line===line);
 if(!action)throw Error('No '+line+' play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

function use(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No legal action');
 const actor=s.pending?s.pending.player:s.active;
 return dispatchUniversalAction(packs,s,action,{actor});
}

function slot(pl,line){
 const index=pl[line].findIndex(card=>!card);
 if(index<0)throw Error(line+' is full');
 return index;
}

function sit(s,player,id,line,extra={}){
 const physical=take(s,player,id);
 physical.ready=extra.ready!==false;
 physical.entryTurn=extra.entryTurn??(s.turn||1)-1;
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(extra.faceDown)physical.faceDown=true;
 s.players[player][line][slot(s.players[player],line)]=physical;
 return physical;
}

function fuel(s,player,color,need){
 const id=color==='blue'?'DGM-1-002':'DGM-1-043';
 while((universalEnergyByColor(pack,s,player)[color]||0)<need)sit(s,player,id,'energy');
}

const RICH=(()=>{
 const counts={
  'DGM-1-002':4,'DGM-1-012':4,'DGM-1-029':4,'DGM-1-043':4,
  'DGM-1-001':2,'DGM-1-004':2,'DGM-1-016':2,'DGM-1-018':2,'DGM-1-019':4,'DGM-1-027':1,
  'DGM-1-020':4,'DGM-1-021':1,'DGM-1-033':1,'DGM-1-035':1,'DGM-1-041':1,
  'DGM-1-044':1,'DGM-1-055':2,'DGM-1-057':2,'DGM-1-058':2,'DGM-1-059':2,
  'DGM-1-062':2,'DGM-1-077':1,'DGM-1-080':1
 };
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 if(total!==50)throw Error('rich deck is '+total);
 return counts;
})();

test('UA58BT is one identity per number, and only a whole Japanese print enters the shared pack',()=>{
 assert.equal(DGM_CARDS.length,80);
 assert.deepEqual(DGM_CARDS.map(card=>card.id),Array.from({length:80},(_,i)=>'DGM-1-'+String(i+1).padStart(3,'0')));
 assert.equal(DGM_CARDS.some(card=>card.id.includes('_p')||card.id.startsWith('AP')),false);
 assert.equal(DGM_CARDS.every(card=>card.auto===false&&card.traitComponents==null),true);
 assert.equal(DGM_CARDS.every(card=>card.engineKind===dgmEngineKind(card)),true);
 assert.deepEqual([...DGM_ENGINE_IDS],REGISTERED);
 assert.deepEqual(Object.keys(pack.cards),REGISTERED);
 assert.equal(JSON.stringify(pack).includes('"op":"dgm"'),false);
 assert.doesNotMatch(readFileSync(new URL('../dist/universal-v2/dgm-pack.mjs',import.meta.url),'utf8'),/from ['"][^'"]*engine\.mjs/);
 assert.equal(V2_TITLE_IDS.includes('dgm'),false);
 const title=TITLES.find(row=>row.id==='dgm');
 assert.equal(title.label,'驅魔少年');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,80);

 const allen=byId.get('DGM-1-009');
 assert.deepEqual(allen.printings.map(row=>row.number),[
  'UA58BT/DGM-1-009','UA58BT/DGM-1-009_p1','UA58BT/DGM-1-009_p2',
  'UAPR/DGM-1-009','UAPR/DGM-1-009_2'
 ]);
 assert.equal(allen.engineKind,'raidFrontWard');
 assert.equal(raidBoxListed('DGM-1-009','frontWard'),true);
 assert.equal(raidBoxListed('DGM-1-009','onPlay'),true);
 assert.equal(raidBoxListed('DGM-1-067','onAttack'),false);
 assert.equal(raidBoxListed('DGM-1-067','phase'),true);
 assert.equal(raidBoxListed('DGM-1-047','onPlay'),true);
 assert.equal(raidBoxListed('DGM-1-032','attackEnd'),true);
 for(const id of RAID_FRAMES){
  const card=byId.get(id);
  assert.ok(card.raidFrame&&card.raidFrame.inside);
  assert.equal(pack.cards[id].type,'character');
 }

 assert.equal(byId.get('DGM-1-017').gen,2);
 assert.deepEqual(parseGen('<img alt="青青" src="ico_resource_energy_blue3.png">'),{
  gen:2,genMark:'',color:'blue',alt:'青青',filenameNumber:3,filenameDisagrees:true
 });
 const retire=byId.get('DGM-1-023');
 assert.equal(retire.energy,0);
 assert.equal(retire.gen,1);
 assert.equal(retire.genMark,'+');
 assert.equal(parseNeed('<img alt="青-" src="ico_resource_energy_blue1.png">').energy,0);
 assert.equal(byId.get('DGM-1-025').energy,0);
 assert.equal(pack.cards['DGM-1-023'].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');
 assert.equal(pack.cards['DGM-1-042'].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');
 assert.deepEqual(pack.cards['DGM-1-072'].triggerEffect,{
  op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true
 });

 const faqIds=DGM_CARDS.filter(card=>card.faq.length).map(card=>card.id);
 const faqInPack=faqIds.filter(id=>pack.cards[id]);
 for(const id of ['DGM-1-003','DGM-1-016','DGM-1-058','DGM-1-080'])assert.equal(faqInPack.includes(id),true);
 assert.equal(pack.cards['DGM-1-003'].mainAbility.op,'printReadyGate');
 assert.equal(byId.get('DGM-1-003').faq.some(entry=>entry.id==='Q2436'),true);
});

test('the mixed supported practice deck is a legal 50, and a fifth copy stays out',()=>{
 const practice=dgmPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((sum,n)=>sum+n,0),50);
 const colors=new Set(Object.keys(practice.counts).map(id=>pack.cards[id].color));
 assert.deepEqual([...colors].sort(),['blue','purple']);
 const ready=editorV2Status('dgm',practice.counts,pack);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.registered,80);
 const mixed={...practice.counts};
 const four=Object.keys(mixed).find(id=>mixed[id]===4);
 const donor=Object.keys(mixed).find(id=>id!==four&&mixed[id]>0);
 mixed[four]+=1;
 mixed[donor]-=1;
 const blocked=editorV2Status('dgm',mixed,pack);
 assert.equal(blocked.ready,false);
 assert.match(blocked.issues.join('\n'),new RegExp(four));
});

test('energy 0 can be played, a private search keeps the whole window, and generated energy retires at the end of main',()=>{
 const counts={
  'DGM-1-002':4,'DGM-1-006':4,'DGM-1-023':4,'DGM-1-025':4,'DGM-1-029':4,
  'DGM-1-030':4,'DGM-1-042':4,'DGM-1-043':4,'DGM-1-048':4,'DGM-1-052':4,
  'DGM-1-070':4,'DGM-1-017':4,'DGM-1-051':2
 };
 let opened=toPhase(fresh(counts,58002),'main');
 readyAp(opened,2);
 const fuel=take(opened,0,'DGM-1-002');
 opened.players[0].hand.push(fuel);
 opened=playLine(opened,fuel.uid,'energy');
 assert.equal(opened.pending,null);
 assert.equal(opened.players[0].energy[0].uid,fuel.uid);
 assert.equal(opened.players[0].energy[0].entryTurn,opened.turn);
 assert.equal(universalCardEnergy(pack,opened,0,fuel),1);

 const match=take(opened,0,'DGM-1-006');
 const plain=take(opened,0,'DGM-1-002');
 const other=take(opened,0,'DGM-1-042');
 opened.players[0].deck.unshift(match,plain,other);
 const seeker=take(opened,0,'DGM-1-030');
 opened.players[0].hand.push(seeker);
 opened=playLine(opened,seeker.uid,'front');
 assert.equal(opened.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(opened.pending.uids,[match.uid,plain.uid,other.uid]);
 assert.deepEqual(opened.pending.choices,[match.uid]);
 assert.equal(opened.publicReveals.some(row=>[plain.uid,other.uid].includes(row.uid)),false);

 let drawn=toPhase(fresh(counts,58006),'main');
 readyAp(drawn,1);
 const discarder=take(drawn,0,'DGM-1-006');
 drawn.players[0].hand.push(discarder);
 const before=drawn.players[0].deck.length;
 drawn=playLine(drawn,discarder.uid,'front');
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(drawn.pending.kind,'effect-discard');
 assert.equal(drawn.players[0].front.some(card=>card&&card.uid===discarder.uid),true);

 let retiring=toPhase(fresh(counts,58023),'main');
 readyAp(retiring,1);
 const source=take(retiring,0,'DGM-1-023');
 retiring.players[0].hand.push(source);
 retiring=playLine(retiring,source.uid,'energy');
 assert.equal(retiring.players[0].energy[0].uid,source.uid);
 assert.equal(retiring.players[0].energy[0].entryTurn,retiring.turn);
 assert.equal(retiring.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(pack,retiring,0,source),1);
 retiring=nextOwnMain(retiring);
 assert.equal(retiring.players[0].energy[0].uid,source.uid);
 assert.equal(retiring.players[0].energy[0].ready,true);
 retiring=dispatchUniversalAction(packs,retiring,{
  type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'
 },{actor:0});
 assert.equal(retiring.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(pack,retiring,0,source),2);
 assert.equal(retiring.delayedEffects.some(row=>row.op==='retireAtMainEnd'&&row.sourceUid===source.uid),true);
 retiring=dispatchUniversalAction(packs,retiring,{type:'next'});
 assert.equal(retiring.phase,'attack');
 assert.equal(retiring.players[0].energy[0],null);
 assert.equal(retiring.players[0].outside.some(card=>card.uid===source.uid),true);
});

test('the next 30 prints use shared programs and keep the closed-window gates',()=>{
 let s=toPhase(fresh(RICH,58130),'main');
 readyAp(s,2);
 const alma=sit(s,0,'DGM-1-001','front');
 assert.equal(universalBp(pack,s,alma),3000);
 const hidden=sit(s,0,'DGM-1-012','front',{faceDown:true});
 assert.equal(universalBp(pack,s,alma),3000);
 hidden.faceDown=false;
 assert.equal(universalBp(pack,s,alma),4000);
 hidden.faceDown=true;

 const crowley=sit(s,0,'DGM-1-004','front');
 assert.equal(universalBp(pack,s,crowley),2000);
 sit(s,0,'DGM-1-016','energy');
 sit(s,0,'DGM-1-018','energy');
 assert.equal(universalBp(pack,s,crowley),2000);
 hidden.faceDown=false;
 assert.equal(universalBp(pack,s,crowley),3000);
 hidden.faceDown=true;
 assert.equal(universalBp(pack,s,crowley),2000);

 fuel(s,0,'blue',1);
 const look=take(s,0,'DGM-1-012');
 const kept=take(s,0,'DGM-1-002');
 const shown=take(s,0,'DGM-1-029');
 s.players[0].deck.unshift(kept,shown);
 s.players[0].hand.push(look);
 s=playLine(s,look.uid,'energy');
 assert.equal(s.pending.kind,'effect-print-look');
 assert.deepEqual(s.pending.uids,[kept.uid,shown.uid]);
 const view=universalPrivateChoices(packs,s,0);
 assert.deepEqual(view.inspected.map(card=>card.uid),s.pending.uids);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(row=>[kept.uid,shown.uid].includes(row.uid)),false);
 s=use(s,action=>action.type==='choosePrintLook'&&action.uid===shown.uid);
 assert.equal(s.players[0].hand.some(card=>card.uid===shown.uid),true);
 assert.equal(s.players[0].outside.some(card=>card.uid===kept.uid),true);
 assert.equal(s.publicReveals.some(row=>row.uid===shown.uid),true);
 assert.equal(s.publicReveals.some(row=>row.uid===kept.uid),false);
 assert.equal(s.pending.kind,'effect-discard');

 let declined=toPhase(fresh(RICH,58112),'main');
 readyAp(declined,1);
 fuel(declined,0,'blue',1);
 const second=take(declined,0,'DGM-1-012');
 const left=take(declined,0,'DGM-1-002');
 const right=take(declined,0,'DGM-1-029');
 declined.players[0].deck.unshift(left,right);
 declined.players[0].hand.push(second);
 declined=playLine(declined,second.uid,'energy');
 declined=use(declined,action=>action.type==='choosePrintLook'&&action.uid===null);
 assert.equal(declined.pending,null);
 assert.deepEqual(declined.players[0].outside.map(card=>card.uid).filter(uid=>[left.uid,right.uid].includes(uid)).sort(),
  [left.uid,right.uid].sort());

 let named=toPhase(fresh(RICH,58118),'main');
 readyAp(named,1);
 const one=sit(named,0,'DGM-1-012','front');
 fuel(named,0,'blue',3);
 const noise=take(named,0,'DGM-1-018');
 const handBefore=named.players[0].hand.length;
 named.players[0].hand.push(noise);
 named=playLine(named,noise.uid,'front');
 assert.equal(named.players[0].hand.length,handBefore);
 sit(named,0,'DGM-1-012','energy');
 const again=take(named,0,'DGM-1-018');
 named.players[0].hand.push(again);
 readyAp(named,2);
 const deckBefore=named.players[0].deck.length;
 named=playLine(named,again.uid,'front');
 assert.equal(named.players[0].hand.length,handBefore+1);
 assert.equal(named.players[0].deck.length,deckBefore-1);
 assert.notEqual(one.faceDown,true);

 let field=toPhase(fresh(RICH,58133),'main');
 readyAp(field,1);
 fuel(field,0,'blue',2);
 const board=take(field,0,'DGM-1-033');
 field.players[0].hand.push(board);
 field=playLine(field,board.uid,'energy');
 const played=field.players[0].energy.find(card=>card?.uid===board.uid);
 assert.equal(played.ready,true);
 assert.equal(played.entryTurn,field.turn);
 const guest=sit(field,0,'DGM-1-029','front');
 assert.equal(legalUniversalActions(packs,field).some(action=>action.uid===board.uid&&action.mode==='selfRestThen'),true);
 let lonely=toPhase(fresh(RICH,58134),'main');
 const lone=sit(lonely,0,'DGM-1-033','energy',{ready:true});
 assert.equal(legalUniversalActions(packs,lonely).some(action=>action.uid===lone.uid&&action.mode==='selfRestThen'),false);
 field=use(field,action=>action.uid===board.uid&&action.mode==='selfRestThen');
 assert.equal(field.pending.kind,'effect-buff-own');
 assert.equal(field.pending.optional,false);
 assert.equal(legalUniversalActions(packs,field).some(action=>action.uid===null),false);
 const buffAction=legalUniversalActions(packs,field).find(action=>action.uid===guest.uid);
 assert.equal(buffAction&&buffAction.type,'chooseOwnBuff',JSON.stringify(buffAction));
 field=use(field,action=>action.type==='chooseOwnBuff'&&action.uid===guest.uid);
 const buffed=field.players[0].front.find(card=>card?.uid===guest.uid);
 assert.equal(universalBp(pack,field,buffed),3000);

 let move=toPhase(fresh(RICH,58116),'main');
 const source=sit(move,0,'DGM-1-016','front',{ready:true});
 const linali=sit(move,0,'DGM-1-029','front',{ready:true});
 move.players[0].deck.unshift(take(move,0,'DGM-1-002'));
 assert.equal(legalUniversalActions(packs,move).some(action=>action.mode==='printMoveEnergy'),true);
 move=use(move,action=>action.uid===source.uid&&action.mode==='printMoveEnergy');
 move=use(move,action=>action.type==='choosePrintMove'&&action.uid===linali.uid);
 const cell=legalUniversalActions(packs,move).find(action=>action.type==='choosePrintMoveCell');
 move=use(move,action=>action.type==='choosePrintMoveCell'&&action.slot===cell.slot);
 assert.equal(move.players[0].energy.some(card=>card?.uid===linali.uid),true);
 assert.equal(legalUniversalActions(packs,move).some(action=>action.uid===source.uid&&action.mode==='printMoveEnergy'),false);
 const other=sit(move,0,'DGM-1-016','front');
 const secondLinali=sit(move,0,'DGM-1-029','front');
 assert.equal(legalUniversalActions(packs,move).some(action=>action.uid===other.uid&&action.mode==='printMoveEnergy'),true);
 for(const index of move.players[0].energy.keys())if(!move.players[0].energy[index]){
  move.players[0].energy[index]=take(move,0,'DGM-1-002');
 }
 const occupant=move.players[0].energy.find(card=>card);
 move=use(move,action=>action.uid===other.uid&&action.mode==='printMoveEnergy');
 move=use(move,action=>action.uid===secondLinali.uid);
 const full=legalUniversalActions(packs,move).find(action=>action.replaceUid);
 move=use(move,action=>action.replaceUid===full.replaceUid);
 assert.equal(move.players[0].removed.some(card=>card.uid===full.replaceUid),true);
 assert.equal(move.players[0].energy.some(card=>card?.uid===secondLinali.uid),true);
 const bare=toPhase(fresh(RICH,58117),'main');
 sit(bare,0,'DGM-1-016','front');
 assert.equal(legalUniversalActions(packs,bare).some(action=>action.mode==='printMoveEnergy'),false);

 let cap=toPhase(fresh(RICH,58135),'main');
 readyAp(cap,1);
 fuel(cap,0,'blue',4);
 const small=sit(cap,1,'DGM-1-001','front');
 const large=sit(cap,1,'DGM-1-058','front');
 const event=take(cap,0,'DGM-1-035');
 cap.players[0].hand.push(event);
 cap=use(cap,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(cap.pending.kind,'effect-retire-bp');
 assert.deepEqual(cap.pending.choices,[small.uid]);
 assert.equal(legalUniversalActions(packs,cap).some(action=>action.uid===null),false);
 let raised=toPhase(fresh(RICH,58136),'main');
 readyAp(raised,1);
 fuel(raised,0,'blue',4);
 const low=sit(raised,1,'DGM-1-001','front');
 const high=sit(raised,1,'DGM-1-058','front');
 sit(raised,0,'DGM-1-029','front');
 const sword=take(raised,0,'DGM-1-035');
 raised.players[0].hand.push(sword);
 raised=use(raised,action=>action.type==='event'&&action.uid===sword.uid);
 assert.deepEqual(raised.pending.choices.slice().sort(),[low.uid,high.uid].sort());

 let rested=toPhase(fresh(RICH,58141),'main');
 const tim=sit(rested,0,'DGM-1-041','energy',{ready:true});
 const allen=take(rested,0,'DGM-1-043');
 rested.players[0].outside.push(allen);
 rested=use(rested,action=>action.uid===tim.uid&&action.mode==='printRestRetire');
 assert.equal(rested.players[0].outside.some(card=>card.uid===tim.uid),true);
 rested=use(rested,action=>action.type==='choosePrintCard'&&action.uid===allen.uid);
 const energyCell=legalUniversalActions(packs,rested).find(action=>action.type==='choosePrintCell');
 assert.equal(energyCell.line,'energy');
 assert.equal(legalUniversalActions(packs,rested).some(action=>action.line==='front'),false);
 rested=use(rested,action=>action.type==='choosePrintCell'&&action.slot===energyCell.slot);
 const entered=rested.players[0].energy.find(card=>card?.uid===allen.uid);
 assert.equal(entered.ready,false);
 assert.equal(entered.entryTurn,rested.turn);

 let generated=toPhase(fresh(RICH,58157),'main');
 const cheryl=sit(generated,0,'DGM-1-057','energy');
 assert.equal(universalCardEnergy(pack,generated,0,cheryl),1);
 const noah=[sit(generated,0,'DGM-1-058','front'),sit(generated,0,'DGM-1-059','front')];
 assert.equal(universalCardEnergy(pack,generated,0,cheryl),1);
 const fourth=sit(generated,0,'DGM-1-062','energy');
 assert.equal(universalCardEnergy(pack,generated,0,cheryl),2);
 fourth.faceDown=true;
 assert.equal(universalCardEnergy(pack,generated,0,cheryl),1);
 fourth.faceDown=false;
 assert.equal(universalCardEnergy(pack,generated,0,cheryl),2);
 const frontCheryl=sit(generated,0,'DGM-1-057','front');
 assert.equal(universalCardEnergy(pack,generated,0,frontCheryl),0);
 assert.equal(noah.length,2);

 let jas=toPhase(fresh(RICH,58158),'main');
 readyAp(jas,1);
 fuel(jas,0,'purple',3);
 const otherChar=sit(jas,0,'DGM-1-043','front');
 const jasdevi=take(jas,0,'DGM-1-058');
 jas.players[0].hand.push(jasdevi);
 jas=playLine(jas,jasdevi.uid,'front');
 assert.equal(jas.pending.kind,'effect-print');
 assert.equal(jas.pending.step,'retire-other');
 assert.equal(legalUniversalActions(packs,jas).some(action=>action.uid===null),false);
 jas=use(jas,action=>action.uid===otherChar.uid);
 assert.equal(jas.players[0].outside.some(card=>card.uid===otherChar.uid),true);
 assert.equal(jas.players[0].front.some(card=>card?.uid===jasdevi.uid),true);
 assert.equal(jas.pending,null);

 let leave=toPhase(fresh(RICH,58159),'main');
 readyAp(leave,1);
 fuel(leave,0,'blue',4);
 const victim=sit(leave,1,'DGM-1-058','front');
 const recruit=take(leave,1,'DGM-1-059');
 leave.players[1].hand.push(recruit);
 leave.players[1].deck.unshift(take(leave,1,'DGM-1-002'),take(leave,1,'DGM-1-043'));
 sit(leave,0,'DGM-1-029','front');
 const remover=take(leave,0,'DGM-1-035');
 leave.players[0].hand.push(remover);
 leave=use(leave,action=>action.type==='event'&&action.uid===remover.uid);
 leave=use(leave,action=>action.uid===victim.uid);
 assert.equal(leave.pending.kind,'effect-print');
 assert.equal(leave.pending.player,1);
 leave=use(leave,action=>action.type==='choosePrintCard'&&action.uid===recruit.uid);
 const restCell=legalUniversalActions(packs,leave).find(action=>action.type==='choosePrintCell');
 leave=use(leave,action=>action.type==='choosePrintCell'&&action.line===restCell.line&&action.slot===restCell.slot);
 assert.equal(leave.pending.kind,'effect-print-look');
 leave=use(leave,action=>action.type==='choosePrintLook'&&action.uid===null);
 while(leave.pending?.kind==='effect-top-order'){
  const uid=leave.pending.uids.find(id=>!leave.pending.order.includes(id));
  leave=use(leave,action=>action.type==='chooseTopOrder'&&action.uid===uid);
 }
 const deployed=leave.players[1].field?null:[...leave.players[1].front,...leave.players[1].energy].find(card=>card?.uid===recruit.uid);
 assert.equal(deployed.ready,false);
 assert.equal(deployed.entryTurn,leave.turn);
 assert.equal(leave.continuousStates.some(row=>row.kind==='skipNextActive'&&row.targetUid===recruit.uid),true);
 leave=nextOwnMain(leave,1);
 const afterStart=[...leave.players[1].front,...leave.players[1].energy].find(card=>card?.uid===recruit.uid);
 assert.equal(afterStart.ready,false);

 let dance=toPhase(fresh(RICH,58180),'main');
 readyAp(dance,1);
 fuel(dance,0,'purple',4);
 const tiki=sit(dance,0,'DGM-1-062','front',{ready:true});
 const danceCard=take(dance,0,'DGM-1-080');
 dance.players[0].hand.push(danceCard);
 const hand=dance.players[0].hand.length;
 dance=use(dance,action=>action.type==='event'&&action.uid===danceCard.uid);
 assert.ok(dance.players[0].hand.length>=hand);
 assert.equal(dance.pending.step,'grant');
 dance=use(dance,action=>action.type==='choosePrintGrant'&&action.uid===null);
 const declinedTiki=dance.players[0].front.find(card=>card?.uid===tiki.uid);
 assert.equal(declinedTiki.mustBlockGranted,undefined);
 const encore=take(dance,0,'DGM-1-080');
 dance.players[0].hand.push(encore);
 readyAp(dance,2);
 dance=use(dance,action=>action.type==='event'&&action.uid===encore.uid);
 dance=use(dance,action=>action.type==='choosePrintGrant'&&action.uid===tiki.uid);
 const granted=dance.players[0].front.find(card=>card?.uid===tiki.uid);
 assert.equal(granted.mustBlockGranted.turn,dance.turn);
 assert.equal(granted.mustBlockGranted.stamp,granted.fieldEntryStamp);
 assert.equal(universalBp(pack,dance,granted),4000);

 let window=toPhase(fresh(RICH,58144),'main');
 readyAp(window,1);
 fuel(window,0,'purple',1);
 const top=[];
 for(const id of ['DGM-1-002','DGM-1-043','DGM-1-062','DGM-1-002','DGM-1-043','DGM-1-062','DGM-1-002'])
  top.push(take(window,0,id));
 window.players[0].deck.unshift(...top);
 const allenLook=take(window,0,'DGM-1-044');
 window.players[0].hand.push(allenLook);
 window=playLine(window,allenLook.uid,'front');
 assert.equal(window.pending.kind,'effect-top-inspect-many');
 assert.equal(window.pending.uids.length,3);
 assert.equal(window.pending.maxOutside,1);

 let gated=toPhase(fresh(RICH,58155),'main');
 readyAp(gated,1);
 sit(gated,0,'DGM-1-062','energy');
 sit(gated,0,'DGM-1-062','energy');
 const rabi=take(gated,0,'DGM-1-055');
 gated.players[0].deck.unshift(take(gated,0,'DGM-1-002'),take(gated,0,'DGM-1-043'));
 gated.players[0].hand.push(rabi);
 gated=playLine(gated,rabi.uid,'front');
 assert.equal(gated.pending,null);
 sit(gated,0,'DGM-1-043','energy');
 const rabi2=take(gated,0,'DGM-1-055');
 gated.players[0].hand.push(rabi2);
 readyAp(gated,2);
 gated=playLine(gated,rabi2.uid,'front');
 assert.equal(gated.pending.kind,'effect-top-inspect-many');
 assert.equal(gated.pending.uids.length,2);

 let none=toPhase(fresh(RICH,58177),'main');
 readyAp(none,1);
 fuel(none,0,'purple',4);
 const fourteenth=take(none,0,'DGM-1-077');
 none.players[0].hand.push(fourteenth);
 none=use(none,action=>action.type==='event'&&action.uid===fourteenth.uid);
 assert.equal(none.pending,null);
});

test('a seven-card look publishes only the chosen name and filters the later discard',()=>{
 let s=toPhase(fresh(RICH,58159),'main');
 readyAp(s,1);
 const window=[];
 for(const id of ['DGM-1-058','DGM-1-002','DGM-1-043','DGM-1-062','DGM-1-001','DGM-1-012','DGM-1-020'])
  window.push(take(s,0,id));
 s.players[0].deck.unshift(...window);
 const costly=take(s,0,'DGM-1-035');
 const seeker=take(s,0,'DGM-1-059');
 s.players[0].hand.push(costly,seeker);
 s=playLine(s,seeker.uid,'front');
 assert.equal(s.pending.kind,'effect-print-look');
 assert.deepEqual(s.pending.uids,window.map(card=>card.uid));
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(card=>card.uid),s.pending.uids);
 assert.equal(s.publicReveals.some(row=>window.some(card=>card.uid===row.uid)),false);
 s=use(s,action=>action.type==='choosePrintLook'&&action.uid===window[0].uid);
 assert.equal(s.publicReveals.some(row=>row.uid===window[0].uid),true);
 assert.equal(s.publicReveals.some(row=>row.uid===window[1].uid),false);
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=use(s,action=>action.type==='chooseTopOrder'&&action.uid===uid);
 }
 assert.equal(s.pending.kind,'effect-discard');
 const discards=legalUniversalActions(packs,s).map(action=>action.uid);
 assert.equal(discards.includes(costly.uid),false);
 assert.equal(discards.includes(window[0].uid),true);
});

test('effect entry chooses the card and then the shared cell',()=>{
 let s=toPhase(fresh(RICH,58127),'main');
 readyAp(s,2);
 fuel(s,0,'blue',3);
 const guest=take(s,0,'DGM-1-004');
 const other=take(s,0,'DGM-1-001');
 const host=take(s,0,'DGM-1-027');
 s.players[0].hand.push(guest,other,host);
 s=playLine(s,host.uid,'front');
 assert.equal(s.pending.kind,'effect-print');
 assert.equal(s.pending.step,'card');
 assert.deepEqual(s.pending.choices,[guest.uid]);
 const offered=legalUniversalActions(packs,s);
 assert.equal(offered.some(action=>action.line||action.slot!==undefined),false);
 s=use(s,action=>action.type==='choosePrintCard'&&action.uid===guest.uid);
 assert.equal(s.pending.step,'cell');
 const cells=legalUniversalActions(packs,s);
 assert.ok(cells.length>0);
 assert.equal(cells.every(action=>action.type==='choosePrintCell'&&action.uid===undefined),true);
 s=use(s,action=>action.type==='choosePrintCell'&&action.line==='front');
 const entered=[...s.players[0].front,...s.players[0].energy].find(card=>card?.uid===guest.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.entryTurn,s.turn);
});

test('the last 26 prints keep the shared gates',()=>{
 const gate={
  ...RICH,'DGM-1-012':1,'DGM-1-019':2,
  'DGM-1-009':1,'DGM-1-003':2,'DGM-1-056':1,'DGM-1-067':1
 };
 const eight=pack.cards['DGM-1-008'];
 const empty=newUniversalMatch(packs,{decks:[RICH,RICH],seed:58140,first:0});
 assert.equal(zoneRequiredEnergy(pack,empty,0,eight,'hand'),0);
 sit(empty,0,'DGM-1-002','energy');
 assert.equal(zoneRequiredEnergy(pack,empty,0,eight,'hand'),2);
 assert.equal(eight.effects.onRaided[0].op,'raidedOptionalBpDown');

 let s=toPhase(fresh(gate,58141),'main');
 readyAp(s,4);
 sit(s,0,'DGM-1-004','energy');
 sit(s,0,'DGM-1-029','energy');
 sit(s,0,'DGM-1-016','energy');
 sit(s,0,'DGM-1-018','front');
 sit(s,1,'DGM-1-002','front');
 const allen=take(s,0,'DGM-1-009');
 s.players[0].hand.push(allen);
 s=playLine(s,allen.uid,'front');
 assert.equal(s.pending,null);
 let raided=toPhase(fresh(gate,58145),'main');
 readyAp(raided,4);
 sit(raided,0,'DGM-1-004','energy');
 sit(raided,0,'DGM-1-029','energy');
 sit(raided,0,'DGM-1-016','energy');
 sit(raided,0,'DGM-1-018','energy');
 const target=sit(raided,1,'DGM-1-002','front');
 const base=sit(raided,0,'DGM-1-043','front');
 const rider=take(raided,0,'DGM-1-009');
 raided.players[0].hand.push(rider);
 const baseSlot=raided.players[0].front.findIndex(card=>card?.uid===base.uid);
 raided=dispatchUniversalAction(packs,raided,{type:'raid',uid:rider.uid,baseUid:base.uid,slot:baseSlot},{actor:0});
 assert.equal(raided.pending?.step,'bottom-37');
 assert.equal(raided.pending.choices.includes(target.uid),true);

 let named=toPhase(fresh(gate,58144),'main');
 const rested=sit(named,0,'DGM-1-003','front',{ready:false,entryTurn:named.turn});
 const other=sit(named,0,'DGM-1-003','energy',{ready:false,entryTurn:named.turn});
 sit(named,0,'DGM-1-012','energy');
 while(named.players[0].deck.length>20)named.players[0].removed.push(named.players[0].deck.pop());
 const first=legalUniversalActions(packs,named).filter(action=>action.mode==='printReadyGate');
 assert.equal(first.length,2);
 named=use(named,action=>action.mode==='printReadyGate'&&action.uid===rested.uid);
 const second=legalUniversalActions(packs,named).filter(action=>action.mode==='printReadyGate');
 assert.equal(second.length,0);
 assert.equal([...named.players[0].front,...named.players[0].energy].find(card=>card?.uid===rested.uid).ready,true);
 assert.equal([...named.players[0].front,...named.players[0].energy].find(card=>card?.uid===other.uid).ready,false);

 let look=toPhase(fresh(gate,58142),'main');
 readyAp(look,2);
 fuel(look,0,'purple',2);
 const linali=take(look,0,'DGM-1-056');
 const window=look.players[0].deck.slice(0,5);
 look.players[0].hand.push(linali);
 look=playLine(look,linali.uid,'front');
 assert.equal(look.pending.kind,'effect-print-look');
 assert.equal(look.pending.uids.length,5);
 assert.deepEqual(look.pending.uids,window.map(card=>card.uid));
 const allenInWindow=window.filter(card=>pack.cards[card.cardId].name==='アレン・ウォーカー').map(card=>card.uid);
 assert.deepEqual([...look.pending.choices].sort(),[...allenInWindow].sort());
 const seen=universalPrivateChoices(packs,look,0);
 assert.equal(seen.inspected.length,5);

 const nea=pack.cards['DGM-1-067'];
 assert.equal(nea.raidOnlyEntry,true);
 assert.equal(nea.effects.onAttack[0].op,'drawDiscard');
 assert.equal(raidBoxListed('DGM-1-067','onAttack'),false);
 let raid=toPhase(fresh(gate,58143),'main');
 readyAp(raid,4);
 fuel(raid,0,'purple',4);
 const body=take(raid,0,'DGM-1-067');
 raid.players[0].hand.push(body);
 assert.equal(legalUniversalActions(packs,raid).some(action=>action.type==='play'&&action.uid===body.uid),false);
});

// All catalogue identities have localized display text, independently of the engine print.
test('DGM catalogue has complete Traditional Chinese names and effects',()=>{
 const kana=/[\u3041-\u3096\u30a1-\u30fa]/u;
 for(const card of DGM_CARDS){
  assert.ok(card.name?.trim(),card.id+' missing display name');
  assert.ok(card.effect?.trim(),card.id+' missing display effect');
  assert.doesNotMatch(card.name,kana,card.id+' Japanese display name');
  assert.doesNotMatch(card.effect,kana,card.id+' Japanese display effect');
  assert.ok(card.effectJa?.trim(),card.id+' missing Japanese source');
 }
 const c=byId.get('DGM-1-038');
 assert.match(c.effect,/〈神田 由〉/);
 assert.match(c.effect,/自己或對手前線最多1張BP3000或以下/);
 assert.match(c.effect,/抽最多1張卡/);
 assert.match(c.effectJa,/手札に戻す/);
 assert.equal(c.effectHk,null);
 assert.equal(c.nameHk,null);
});
