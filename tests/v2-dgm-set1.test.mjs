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
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,universalCardEnergy} from '../dist/universal-v2/engine.mjs';

const pack=createDgmV2Pack();
const packs=[pack,pack];
const byId=new Map(DGM_CARDS.map(card=>[card.id,card]));
const REGISTERED=[
 'DGM-1-002','DGM-1-006','DGM-1-007','DGM-1-017','DGM-1-023','DGM-1-025',
 'DGM-1-028','DGM-1-029','DGM-1-030','DGM-1-031','DGM-1-034','DGM-1-036',
 'DGM-1-042','DGM-1-043','DGM-1-045','DGM-1-048','DGM-1-051','DGM-1-052',
 'DGM-1-054','DGM-1-070','DGM-1-071','DGM-1-072','DGM-1-076','DGM-1-079'
];
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
 assert.equal(allen.engineKind,null);
 for(const id of RAID_FRAMES){
  const card=byId.get(id);
  assert.ok(card.raidFrame&&card.raidFrame.inside);
  assert.equal(card.engineKind,null);
  assert.equal(pack.cards[id],undefined);
 }
 assert.doesNotMatch(readFileSync(new URL('../dist/universal-v2/raid-box.mjs',import.meta.url),'utf8'),/DGM-1-/);

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
 assert.equal(faqIds.some(id=>pack.cards[id]),false);
 assert.equal(byId.get('DGM-1-003').faq.some(entry=>entry.id==='Q2436'),true);
});

test('the mixed supported practice deck is a legal 50, and a catalogue-only card stays out of a match',()=>{
 const practice=dgmPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((sum,n)=>sum+n,0),50);
 const colors=new Set(Object.keys(practice.counts).map(id=>pack.cards[id].color));
 assert.deepEqual([...colors].sort(),['blue','purple']);
 const ready=editorV2Status('dgm',practice.counts,pack);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.registered,24);
 const mixed={...practice.counts};
 const donor=Object.keys(mixed).find(id=>mixed[id]>1);
 mixed[donor]-=1;
 mixed['DGM-1-009']=1;
 const blocked=editorV2Status('dgm',mixed,pack);
 assert.equal(blocked.ready,false);
 assert.match(blocked.issues.join('\n'),/DGM-1-009/);
});

test('energy 0 can be played, a private search keeps the whole window, and generated energy retires at the end of main',()=>{
 const counts=dgmPracticeDeck().counts;
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
