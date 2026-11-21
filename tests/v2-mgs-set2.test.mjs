import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MGS2_CARDS,MGS2_VOL1_PARALLELS} from '../dist/mgs-vol2.mjs';
import {MGS_CARDS} from '../dist/mgs-cards.mjs';
import {createMgsV2Pack,MGS2_ENGINE_IDS} from '../dist/universal-v2/mgs-pack.mjs';
import {mgs2EngineKind} from '../dist/universal-v2/mgs2-classify.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {dispatchUniversalAction,effectiveHandRequiredEnergy,effectiveRequiredEnergy,legalUniversalActions,newUniversalMatch,universalBp,universalImpact,universalImpactNull,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const pack=createMgsV2Pack();
const packs=[pack,pack];
const byId=new Map(MGS2_CARDS.map(card=>[card.id,card]));
const RAID=[];
const engine=readFileSync(new URL('../dist/universal-v2/engine.mjs',import.meta.url),'utf8');
const packSource=readFileSync(new URL('../dist/universal-v2/mgs-pack.mjs',import.meta.url),'utf8');

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
function readyAp(s,n=2){
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<n;
  s.players[0].apCards[i].ready=i<n;
 }
}
function playLine(s,uid,line){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line===line);
 if(!action)throw Error('No '+line+' play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
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
 s.players[player][line][slot(s.players[player],line)]=physical;
 return physical;
}
function act(s,action,actor){
 return dispatchUniversalAction(packs,s,action,{actor:actor??(s.pending?s.pending.player:0)});
}
function deckWith(extra){
 const counts={'MGS-1-001':4,'MGS-1-003':4,'MGS-1-004':4,'MGS-1-006':4,'MGS-1-007':4,
  'MGS-1-009':4,'MGS-1-052':4,'MGS-1-105':2,'MGS-2-002':2,'MGS-2-014':2,'MGS-2-030':2,
  'MGS-2-038':2,'MGS-2-040':2,'MGS-2-044':2,'MGS-2-045':4,'MGS-2-051':2,'MGS-2-052':2};
 let added=0;
 for(const [id,n] of Object.entries(extra||{})){counts[id]=(counts[id]||0)+n;added+=n;}
 for(const filler of ['MGS-1-004','MGS-1-003','MGS-1-007']){
  if(!added)break;
  const cut=Math.min(counts[filler]||0,added);
  counts[filler]-=cut;added-=cut;
  if(!counts[filler])delete counts[filler];
 }
 if(added)throw Error('Deck filler');
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 if(total!==50)throw Error('Deck is '+total);
 for(const n of Object.values(counts))if(n>4)throw Error('More than 4 copies');
 return counts;
}
function open(seed,extra){
 const deck=deckWith(extra);
 return toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed,first:0}),'main');
}
function playEvent(s,uid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='event'&&item.uid===uid);
 if(!action)throw Error('No event play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}
function fresh(seed){
 const deck=deckWith();
 return toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed,first:0}),'main');
}

test('EX18BT catalogues 73 identities and registers only whole shared prints',()=>{
 assert.equal(MGS2_CARDS.length,73);
 assert.deepEqual(MGS2_CARDS.map(card=>card.id),Array.from({length:73},(_,i)=>'MGS-2-'+String(i+1).padStart(3,'0')));
 assert.equal(MGS2_CARDS.some(card=>card.id.includes('_p')||card.rarity==='AP'),false);
 assert.equal(MGS2_CARDS.every(card=>card.auto===false&&card.title==='mgs'&&card.set==='EX18BT'),true);
 assert.equal(MGS2_CARDS.every(card=>card.nameJa&&card.effectJa&&card.nameHk&&card.effectHk&&card.triggerTextHk&&card.sourceHk&&card.sourceTc===null),true);
 assert.equal(MGS2_CARDS.every(card=>card.name===card.nameHk&&card.effect===card.effectHk&&card.triggerText===card.triggerTextHk),true);
 assert.equal(MGS2_CARDS.some(card=>/[\u3040-\u30ff]/.test(card.effect)||/[\u3040-\u30ff]/.test(card.name)),false);
 assert.equal(MGS2_CARDS.every(card=>card.engineKind===mgs2EngineKind(card)),true);
 assert.deepEqual([...MGS2_ENGINE_IDS],[...MGS2_CARDS.filter(card=>card.engineKind).map(card=>card.id)]);
 assert.equal(MGS2_ENGINE_IDS.length,73);
 assert.equal(raidBoxListed('MGS-2-053','passive'),true);
 assert.equal(raidBoxListed('MGS-2-053','onPlay'),true);
 assert.equal(raidBoxListed('MGS-2-053','main'),false);
 assert.equal(raidBoxListed('MGS-2-005','fieldLeave'),true);
 assert.equal(raidBoxListed('MGS-2-011','onAttackBlocked'),false);
 assert.equal(raidBoxListed('MGS-2-023','phase'),true);
 assert.equal(raidBoxListed('MGS-2-026','main'),true);
 assert.equal(raidBoxListed('MGS-2-032','onPlay'),true);
 assert.equal(raidBoxListed('MGS-2-037','onPlay'),true);
 for(const card of MGS2_CARDS)
  assert.equal(Boolean(pack.cards[card.id]),Boolean(card.engineKind));
 assert.equal(RAID.every(id=>byId.get(id).raidFrame&&byId.get(id).engineKind===null&&!raidBoxListed(byId.get(id))),true);
 assert.equal(engine.includes('"op":"mgs"'),false);
 assert.equal(packSource.includes('"op":"mgs"'),false);
 assert.equal(V2_TITLE_IDS.includes('mgs'),false);
 assert.equal(TITLES.find(title=>title.id==='mgs').cards.length,MGS_CARDS.length+MGS2_CARDS.length);
 assert.equal(TITLES.find(title=>title.id==='mgs').playable,false);
 const suruga=byId.get('MGS-2-002');
 assert.equal(suruga.gen,2);
 assert.match(suruga.image,/EX18BT_MGS-2-002\.png$/);
 assert.deepEqual(MGS2_VOL1_PARALLELS.map(card=>card.identity),['MGS-1-028','MGS-1-064']);
 const packed028=MGS_CARDS.find(card=>card.id==='MGS-1-028').printings.map(row=>row.number);
 const packed064=MGS_CARDS.find(card=>card.id==='MGS-1-064').printings.map(row=>row.number);
 assert.equal(packed028.includes('EX18BT/MGS-1-028_p1'),true);
 assert.equal(packed064.includes('EX18BT/MGS-1-064_p2'),true);
});

test('MGS-2-002 draws only when 千石撫子 is on the field',()=>{
 let present=fresh(218002);
 readyAp(present);
 sit(present,0,'MGS-1-001','energy');
 sit(present,0,'MGS-1-001','energy');
 sit(present,0,'MGS-1-009','front');
 const card=take(present,0,'MGS-2-002');
 present.players[0].hand.push(card);
 const before=present.players[0].deck.length;
 present=playLine(present,card.uid,'energy');
 assert.equal(present.pending,null);
 assert.equal(present.players[0].deck.length,before-1);
 const played=present.players[0].energy.find(row=>row?.uid===card.uid);
 assert.equal(played.entryTurn,present.turn);

 let absent=fresh(218003);
 readyAp(absent);
 sit(absent,0,'MGS-1-001','energy');
 sit(absent,0,'MGS-1-001','energy');
 const other=take(absent,0,'MGS-2-002');
 absent.players[0].hand.push(other);
 const still=absent.players[0].deck.length;
 absent=playLine(absent,other.uid,'energy');
 assert.equal(absent.pending,null);
 assert.equal(absent.players[0].deck.length,still);
});

test('MGS-2-014 draws for Kiss-shot and nulls impact',()=>{
 assert.equal(pack.cards['MGS-2-014'].impactNull,true);
 let present=fresh(218014);
 readyAp(present);
 for(let i=0;i<4;i++)sit(present,0,'MGS-1-052','energy');
 sit(present,0,'MGS-1-105','front');
 const before=present.players[0].deck.length;
 const card=take(present,0,'MGS-2-014');
 present.players[0].hand.push(card);
 present=playLine(present,card.uid,'front');
 assert.equal(present.players[0].deck.length,before-1);

 let absent=fresh(218015);
 readyAp(absent);
 for(let i=0;i<4;i++)sit(absent,0,'MGS-1-052','energy');
 const still=absent.players[0].deck.length;
 const other=take(absent,0,'MGS-2-014');
 absent.players[0].hand.push(other);
 absent=playLine(absent,other.uid,'front');
 assert.equal(absent.players[0].deck.length,still);
});

test('MGS-2-030 and MGS-2-044 cut two green energy only on an empty field',()=>{
 let empty=fresh(218030);
 const hand=take(empty,0,'MGS-2-030');
 empty.players[0].hand.push(hand);
 assert.equal(effectiveHandRequiredEnergy(pack,empty,0,pack.cards['MGS-2-030'],hand),0);
 sit(empty,0,'MGS-2-045','front');
 assert.equal(effectiveHandRequiredEnergy(pack,empty,0,pack.cards['MGS-2-030'],hand),2);
 const yotsugi=take(empty,0,'MGS-2-044');
 empty.players[0].hand.push(yotsugi);
 assert.equal(effectiveHandRequiredEnergy(pack,empty,0,pack.cards['MGS-2-044'],yotsugi),2);
});

test('MGS-2-038 draws and discards a hand card when the winning attacker retires it',()=>{
 assert.equal(pack.cards['MGS-2-038'].impactNull,true);
 let s=fresh(218038);
 const attacker=sit(s,0,'MGS-2-014','front');
 const shinobu=sit(s,1,'MGS-2-038','front');
 s=toPhase(s,'attack');
 s=act(s,{type:'attack',uid:attacker.uid});
 const before=s.players[1].hand.length;
 s=act(s,{type:'chooseBlock',uid:shinobu.uid},1);
 assert.equal(s.players[1].front.some(card=>card?.uid===shinobu.uid),false);
 assert.equal(s.players[1].outside.some(card=>card.uid===shinobu.uid),true);
 assert.equal(s.players[1].hand.length,before+1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.player,1);
 const handBefore=s.players[1].hand.length;
 s=act(s,{type:'chooseDiscard',uid:s.players[1].hand[0].uid});
 assert.equal(s.players[1].hand.length,handBefore-1);
});

test('MGS-2-040 gives one remaining character BP+1000 after the winning attacker retires it',()=>{
 let s=fresh(218040);
 const attacker=sit(s,0,'MGS-2-014','front');
 const source=sit(s,1,'MGS-2-040','front');
 const ally=sit(s,1,'MGS-2-038','front');
 s=toPhase(s,'attack');
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:source.uid},1);
 assert.equal(s.players[1].outside.some(card=>card.uid===source.uid),true);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[ally.uid]);
 s=act(s,{type:'chooseOwnBuff',uid:ally.uid});
 const live=s.players[1].front.flat().find(card=>card?.uid===ally.uid);
 assert.equal(universalBp(pack,s,live),pack.cards['MGS-2-038'].bp+1000);
});

test('MGS-2-051 rests one green AP-1 character of energy 2 or less from hand',()=>{
 let s=fresh(218051);
 readyAp(s);
 for(let i=0;i<3;i++)sit(s,0,'MGS-2-045','energy');
 const match=take(s,0,'MGS-2-030');
 const miss=take(s,0,'MGS-2-002');
 s.players[0].hand.push(match,miss);
 const card=take(s,0,'MGS-2-051');
 s.players[0].hand.push(card);
 s=playLine(s,card.uid,'energy');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(match.uid),true);
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(s.pending.choices.every(uid=>{
  const physical=s.players[0].hand.find(card=>card.uid===uid);
  const printed=pack.cards[physical.cardId];
  return printed.type==='character'&&printed.color==='green'&&printed.ap===1&&printed.energy<=2;
 }),true);
 const rest=legalUniversalActions(packs,s).find(action=>action.type==='chooseHandRest'&&action.uid===match.uid);
 if(!rest)throw Error('No rest entry for '+match.uid);
 s=act(s,rest);
 const entered=s.players[0].front.flat().find(row=>row?.uid===match.uid)||
  s.players[0].energy.flat().find(row=>row?.uid===match.uid);
 assert.equal(Boolean(entered),true);
 assert.equal(entered.ready,false);
 assert.equal(entered.entryTurn,s.turn);
});

test('MGS-2-052 keeps every looked card and only the energy-3 character is selectable',()=>{
 let s=fresh(218052);
 readyAp(s);
 for(let i=0;i<3;i++)sit(s,0,'MGS-2-045','energy');
 const match=take(s,0,'MGS-2-030');
 const miss=take(s,0,'MGS-2-014');
 const extra=take(s,0,'MGS-1-052');
 s.players[0].deck.unshift(match,miss,extra);
 const card=take(s,0,'MGS-2-052');
 s.players[0].hand.push(card);
 s=playLine(s,card.uid,'energy');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[match.uid,miss.uid,extra.uid]);
 assert.deepEqual(s.pending.choices,[match.uid]);
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(row=>row.uid),s.pending.uids);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(row=>s.pending.uids.includes(row.uid)),false);
});

function pay(s,colors){
 readyAp(s,2);
 for(const [id,n] of Object.entries(colors))for(let i=0;i<n;i++)sit(s,0,id,'energy');
}
function hand(s,id){
 const card=take(s,0,id);
 s.players[0].hand.push(card);
 return card;
}
function top(s,ids){
 const cards=ids.map(id=>take(s,0,id));
 s.players[0].deck.unshift(...cards);
 return cards;
}
function live(s,uid){
 return s.players[0].front.flat().find(card=>card?.uid===uid)||
  s.players[0].energy.flat().find(card=>card?.uid===uid);
}

test('MGS-2-003 and MGS-2-004 keep impact and step without the missing name',()=>{
 let s=open(218003,{'MGS-2-003':2,'MGS-2-004':2});
 const body=sit(s,0,'MGS-2-003','front');
 const rope=sit(s,0,'MGS-2-004','front');
 assert.equal(universalImpactNull(pack,s,body),true);
 assert.equal(universalBp(pack,s,body),pack.cards['MGS-2-003'].bp);
 assert.equal(pack.cards['MGS-2-004'].step,true);
 assert.equal(universalBp(pack,s,rope),pack.cards['MGS-2-004'].bp);
});

test('MGS-2-006 rests itself to buff another sister only after its side loses an attack',()=>{
 let lost=open(218006,{'MGS-2-006':2,'MGS-1-022':2});
 const sister=sit(lost,0,'MGS-2-006','front');
 const other=sit(lost,0,'MGS-1-022','front');
 const weak=sit(lost,0,'MGS-2-038','front');
 const wall=sit(lost,1,'MGS-2-014','front');
 lost=toPhase(lost,'attack');
 lost=act(lost,{type:'attack',uid:weak.uid});
 lost=act(lost,{type:'chooseBlock',uid:wall.uid},1);
 assert.equal(lost.players[0].front.some(card=>card?.uid===weak.uid),true);
 assert.equal(lost.pending.kind,'effect-buff-own');
 assert.deepEqual(lost.pending.choices,[other.uid]);
 lost=act(lost,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(live(lost,sister.uid).ready,false);
 assert.equal(universalBp(pack,lost,live(lost,other.uid)),pack.cards['MGS-1-022'].bp+1000);

 let won=open(218007,{'MGS-2-006':2,'MGS-1-022':2});
 sit(won,0,'MGS-2-006','front');
 const ally=sit(won,0,'MGS-1-022','front');
 const attacker=sit(won,0,'MGS-2-014','front');
 const blocker=sit(won,1,'MGS-2-038','front');
 won=toPhase(won,'attack');
 won=act(won,{type:'attack',uid:attacker.uid});
 won=act(won,{type:'chooseBlock',uid:blocker.uid},1);
 assert.equal(won.pending.player,1);
 assert.equal(live(won,ally.uid).ready,true);
});

test('MGS-2-007 looks at the top and draws only after a hand card goes outside',()=>{
 let skipped=open(218008,{'MGS-2-007':2});
 pay(skipped,{});
 const card=hand(skipped,'MGS-2-007');
 const before=skipped.players[0].deck.length;
 skipped=playLine(skipped,card.uid,'front');
 assert.equal(skipped.pending.kind,'effect-optional-hand-outside');
 skipped=act(skipped,{type:'chooseOptionalHandOutside',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,before);

 let paid=open(218009,{'MGS-2-007':2});
 const extra=hand(paid,'MGS-2-038');
 const played=hand(paid,'MGS-2-007');
 const looked=top(paid,['MGS-1-009'])[0];
 paid=playLine(paid,played.uid,'front');
 paid=act(paid,{type:'chooseOptionalHandOutside',uid:extra.uid});
 assert.equal(paid.players[0].outside.some(row=>row.uid===extra.uid),true);
 assert.equal(paid.pending.kind,'private-top-place');
 assert.equal(paid.players[0].deck[0]?.uid,looked.uid);
 assert.equal(universalPrivateChoices(packs,paid,1),null);
 const drawn=paid.players[0].deck.length;
 paid=act(paid,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(paid.players[0].deck.at(-1).uid,looked.uid);
 assert.equal(paid.players[0].hand.some(row=>row.uid===looked.uid),false);
 assert.equal(paid.players[0].deck.length,drawn-1);
});

test('MGS-2-008 gains BP after another character loses, and the sister buff can be declined',()=>{
 let s=open(218010,{'MGS-2-008':2,'MGS-1-022':2});
 const self=sit(s,0,'MGS-2-008','front');
 const sister=sit(s,0,'MGS-1-022','front');
 const weak=sit(s,0,'MGS-2-038','front');
 const wall=sit(s,1,'MGS-2-014','front');
 s=toPhase(s,'attack');
 s=act(s,{type:'attack',uid:weak.uid});
 s=act(s,{type:'chooseBlock',uid:wall.uid},1);
 assert.equal(s.pending,null);
 s=act(s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[sister.uid]);
 s=act(s,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,s,live(s,sister.uid)),pack.cards['MGS-1-022'].bp);
 assert.equal(universalBp(pack,s,live(s,self.uid)),pack.cards['MGS-2-008'].bp+1000);
});

test('MGS-2-010 may clear one front card by the line rule, then move',()=>{
 let s=open(218011,{'MGS-2-010':2,'MGS-2-070':1,'MGS-2-050':1});
 const mover=sit(s,0,'MGS-2-010','energy');
 const removed=sit(s,0,'MGS-2-070','front');
 const mayoi=take(s,0,'MGS-2-050');
 s.players[0].outside.push(mayoi);
 sit(s,0,'MGS-2-038','front');
 sit(s,0,'MGS-2-040','front');
 sit(s,0,'MGS-1-001','front');
 s=toPhase(s,'attack');
 s=act(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-next');
 assert.equal(s.pending.mode,'clear');
 assert.equal(s.pending.optional,true);
 s=act(s,{type:'nextPrint',mode:'clear',uid:removed.uid});
 assert.equal(s.players[0].removed.some(card=>card.uid===removed.uid),true);
 assert.equal(s.players[0].front.some(card=>card?.uid===mover.uid),true);
 assert.equal(s.players[0].outside.some(card=>card.uid===mayoi.uid),true);
 assert.equal(s.pending,null);
});

test('MGS-2-013 draws and discards on retirement, and does not deploy on the opponent turn',()=>{
 let s=open(218013,{'MGS-2-013':2,'MGS-1-035':2});
 const koyomi=sit(s,0,'MGS-2-013','front');
 const purple=hand(s,'MGS-1-035');
 const attacker=sit(s,1,'MGS-2-014','front');
 s=toPhase(s,'attack');
 let guard=0;
 while(s.phase!=='attack'||s.active!==1){
  if(s.pending)throw Error(s.pending.kind+' during '+s.phase);
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:s.active});
  if(++guard>16)throw Error('Did not reach the opponent attack');
 }
 s=act(s,{type:'attack',uid:attacker.uid},1);
 s=act(s,{type:'chooseBlock',uid:koyomi.uid});
 assert.equal(s.players[0].outside.some(card=>card.uid===koyomi.uid),true);
 assert.equal(s.pending.kind,'effect-discard');
 s=act(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(card=>card.uid===purple.uid)||
  s.players[0].outside.some(card=>card.uid===purple.uid),true);
 assert.equal(live(s,purple.uid),undefined);
});

function reach(s,phase,who=0){
 let guard=0;
 while(s.phase!==phase||s.active!==who){
  if(s.pending)throw Error(s.pending.kind+' during '+s.phase+' active '+s.active);
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:s.active});
  if(++guard>20)throw Error('Stuck in '+s.phase+' active '+s.active);
 }
 return s;
}

test('MGS-2-016 becomes active on the energy line and rests only to lower a high front',()=>{
 let quiet=open(218016,{'MGS-2-016':2});
 pay(quiet,{'MGS-1-052':3});
 const card=hand(quiet,'MGS-2-016');
 quiet=playLine(quiet,card.uid,'energy');
 assert.equal(live(quiet,card.uid).ready,true);
 assert.equal(legalUniversalActions(packs,quiet).some(action=>action.mode==='selfRestThen'),false);
 sit(quiet,1,'MGS-2-014','front');
 assert.equal(legalUniversalActions(packs,quiet).some(action=>action.mode==='selfRestThen'),false);

 let s=open(218017,{'MGS-2-016':2});
 pay(s,{'MGS-1-052':3});
 const source=hand(s,'MGS-2-016');
 s=playLine(s,source.uid,'energy');
 const target=sit(s,1,'MGS-1-105','front');
 const use=legalUniversalActions(packs,s).find(action=>action.mode==='selfRestThen'&&action.uid===source.uid);
 if(!use)throw Error('No rest main');
 s=act(s,use);
 assert.equal(s.pending.kind,'effect-target');
 s=act(s,{type:'chooseTarget',uid:target.uid});
 assert.equal(live(s,source.uid).ready,false);
 const foe=s.players[1].front.find(row=>row?.uid===target.uid);
 assert.equal(universalBp(pack,s,foe),pack.cards['MGS-1-105'].bp-1000);
});

test('MGS-2-018 wakes beside Kiss-shot and recovers the blade when it leaves',()=>{
 let asleep=open(218018,{'MGS-2-018':2});
 pay(asleep,{'MGS-1-052':4});
 const plain=hand(asleep,'MGS-2-018');
 asleep=playLine(asleep,plain.uid,'front');
 assert.equal(live(asleep,plain.uid).ready,false);

 let s=open(218019,{'MGS-2-018':2,'MGS-1-067':1});
 pay(s,{'MGS-1-052':4});
 sit(s,0,'MGS-1-105','front');
 const card=hand(s,'MGS-2-018');
 s=playLine(s,card.uid,'front');
 assert.equal(live(s,card.uid).ready,true);
 const blade=take(s,0,'MGS-1-067');
 s.players[0].outside.push(blade);
 const attacker=sit(s,1,'MGS-1-105','front');
 s=reach(s,'attack',1);
 s=act(s,{type:'attack',uid:attacker.uid},1);
 s=act(s,{type:'chooseBlock',uid:card.uid});
 assert.equal(s.players[0].outside.some(row=>row.uid===card.uid),true);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.choices.includes(blade.uid),true);
 s=act(s,{type:'chooseOutsideRecovery',uid:blade.uid});
 assert.equal(s.players[0].hand.some(row=>row.uid===blade.uid),true);
});

test('MGS-2-019 draws and discards when no 羽川翼 was added from the deck',()=>{
 let s=open(218020,{'MGS-2-019':2});
 pay(s,{'MGS-1-052':3});
 const card=hand(s,'MGS-2-019');
 const before=s.players[0].deck.length;
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,before-1);
});

test('MGS-2-021 looks at one more card for every two 羽川翼 and keeps one on top',()=>{
 let one=open(218021,{'MGS-2-021':2,'MGS-1-016':2});
 pay(one,{'MGS-1-052':3});
 const alone=hand(one,'MGS-2-021');
 one=playLine(one,alone.uid,'front');
 assert.equal(one.pending.kind,'effect-top-order');
 assert.equal(one.pending.uids.length,1);
 assert.equal(one.pending.maxTop,1);
 assert.equal(universalPrivateChoices(packs,one,1),null);
 one=act(one,{type:'chooseTopOrder',uid:one.pending.uids[0],place:'top'});
 assert.equal(one.pending,null);

 let two=open(218022,{'MGS-2-021':2,'MGS-1-016':2});
 pay(two,{'MGS-1-052':3});
 sit(two,0,'MGS-1-016','front');
 sit(two,0,'MGS-1-016','front');
 const card=hand(two,'MGS-2-021');
 const window=top(two,['MGS-1-006','MGS-1-009']);
 two=playLine(two,card.uid,'front');
 assert.deepEqual(two.pending.uids,window.map(row=>row.uid));
 assert.equal(legalUniversalActions(packs,two).some(action=>action.place==='bottom'),true);
 two=act(two,{type:'chooseTopOrder',uid:window[0].uid,place:'top'});
 assert.equal(legalUniversalActions(packs,two).some(action=>action.place==='top'),false);
 two=act(two,{type:'chooseTopOrder',uid:window[1].uid,place:'bottom'});
 assert.equal(two.players[0].deck[0].uid,window[0].uid);
 assert.equal(two.players[0].deck.at(-1).uid,window[1].uid);
});

test('MGS-2-029 gains step and BP only while a raid character is not raiding',()=>{
 let s=open(218029,{'MGS-2-029':2,'MGS-1-021':1});
 const self=sit(s,0,'MGS-2-029','front');
 const raid=sit(s,0,'MGS-1-021','front');
 assert.equal(raid.stack.length,0);
 assert.equal(universalBp(pack,s,self),pack.cards['MGS-2-029'].bp+500);
 s=reach(s,'move');
 assert.equal(legalUniversalActions(packs,s).some(action=>action.type==='step'&&action.uid===self.uid),true);
 const slot=s.players[0].front.findIndex(card=>card?.uid===raid.uid);
 s.players[0].outside.push(s.players[0].front[slot]);
 s.players[0].front[slot]=null;
 assert.equal(universalBp(pack,s,self),pack.cards['MGS-2-029'].bp);
 assert.equal(legalUniversalActions(packs,s).some(action=>action.type==='step'&&action.uid===self.uid),false);
});

test('MGS-2-033 can send one of two looked cards to the removed zone',()=>{
 let s=open(218033,{'MGS-2-033':2});
 readyAp(s);
 const card=hand(s,'MGS-2-033');
 const window=top(s,['MGS-1-006','MGS-1-009']);
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.maxRemoved,1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(row=>s.pending.uids.includes(row.uid)),false);
 s=act(s,{type:'chooseTopOrder',uid:window[0].uid,place:'removed'});
 s=act(s,{type:'chooseTopOrder',uid:window[1].uid,place:'top'});
 assert.equal(s.players[0].removed.some(row=>row.uid===window[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
});

test('MGS-2-041 gains BP while the front has required energy 2 and 3',()=>{
 let s=open(218041,{'MGS-2-041':2});
 const self=sit(s,0,'MGS-2-041','front');
 sit(s,0,'MGS-2-030','front');
 const high=sit(s,0,'MGS-1-001','front');
 assert.equal(universalBp(pack,s,self),pack.cards['MGS-2-041'].bp+1000);
 const slot=s.players[0].front.findIndex(card=>card?.uid===high.uid);
 s.players[0].front[slot]=null;
 assert.equal(universalBp(pack,s,self),pack.cards['MGS-2-041'].bp);
});

test('MGS-2-042 stops a high character from blocking while energy 2 and 3 are on the front',()=>{
 let open042=open(218042,{'MGS-2-042':2});
 const self=sit(open042,0,'MGS-2-042','front');
 sit(open042,0,'MGS-2-030','front');
 sit(open042,0,'MGS-1-001','front');
 const high=sit(open042,1,'MGS-2-014','front');
 const low=sit(open042,1,'MGS-2-038','front');
 open042=toPhase(open042,'attack');
 open042=act(open042,{type:'attack',uid:self.uid});
 assert.equal(open042.pending.kind,'effect-discard');
 open042=act(open042,{type:'chooseDiscard',uid:open042.players[0].hand[0].uid});
 const blocks=legalUniversalActions(packs,open042).filter(action=>action.type==='chooseBlock').map(action=>action.uid);
 assert.equal(blocks.includes(high.uid),false);
 assert.equal(blocks.includes(low.uid),true);

 let plain=open(218043,{'MGS-2-042':2});
 const attacker=sit(plain,0,'MGS-2-042','front');
 const wall=sit(plain,1,'MGS-2-014','front');
 plain=toPhase(plain,'attack');
 plain=act(plain,{type:'attack',uid:attacker.uid});
 plain=act(plain,{type:'chooseDiscard',uid:plain.players[0].hand[0].uid});
 assert.equal(legalUniversalActions(packs,plain).some(action=>action.type==='chooseBlock'&&action.uid===wall.uid),true);
});

test('MGS-2-043 grants impact only after the front has required energy 1 and 3',()=>{
 let s=open(218044,{'MGS-2-043':2,'MGS-2-041':1});
 pay(s,{'MGS-2-045':2});
 sit(s,0,'MGS-2-041','front');
 const high=sit(s,0,'MGS-1-001','front');
 const card=hand(s,'MGS-2-043');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.remaining,3);
 s=act(s,{type:'chooseOwnBuff',uid:null});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.impactOnly,1);
 s=act(s,{type:'chooseOwnBuff',uid:high.uid});
 assert.equal(live(s,high.uid).impactGranted.amount,1);
 assert.equal(universalBp(pack,s,live(s,high.uid)),pack.cards['MGS-1-001'].bp);

 let missing=open(218045,{'MGS-2-043':2});
 pay(missing,{'MGS-2-045':2});
 const other=hand(missing,'MGS-2-043');
 missing=playLine(missing,other.uid,'front');
 assert.equal(missing.pending.kind,'effect-buff-own');
 missing=act(missing,{type:'chooseOwnBuff',uid:null});
 assert.equal(missing.pending,null);
});

test('MGS-2-047 draws when an effect puts it on the field, not when it is paid from hand',()=>{
 let paid=open(218047,{'MGS-2-047':2});
 pay(paid,{'MGS-2-045':2});
 const card=hand(paid,'MGS-2-047');
 const before=paid.players[0].deck.length;
 paid=playLine(paid,card.uid,'front');
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck.length,before);
 assert.equal(live(paid,card.uid).ready,false);

 let entered=open(218048,{'MGS-2-047':2});
 pay(entered,{'MGS-2-045':3});
 const target=hand(entered,'MGS-2-047');
 const event=hand(entered,'MGS-2-051');
 const deck=entered.players[0].deck.length;
 entered=playLine(entered,event.uid,'energy');
 assert.equal(entered.pending.choices.includes(target.uid),true);
 const rest=legalUniversalActions(packs,entered).find(action=>action.type==='chooseHandRest'&&action.uid===target.uid);
 entered=act(entered,rest);
 assert.equal(live(entered,target.uid).ready,false);
 assert.equal(live(entered,target.uid).entryTurn,entered.turn);
 assert.equal(entered.players[0].deck.length,deck-1);
});

test('MGS-2-049 enters only a line that already has 斧乃木余接 and cannot move',()=>{
 let s=open(218049,{'MGS-2-049':2});
 pay(s,{'MGS-2-045':3});
 const named=s.players[0].energy.find(card=>card&&pack.cards[card.cardId].energy===2);
 const card=hand(s,'MGS-2-049');
 const yellow=hand(s,'MGS-1-003');
 hand(s,'MGS-2-045');
 assert.equal(legalUniversalActions(packs,s).some(action=>action.type==='play'&&action.uid===card.uid&&action.line==='front'),false);
 s=playLine(s,card.uid,'energy');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(yellow.uid),false);
 const green=s.players[0].hand.find(row=>row.cardId==='MGS-2-045');
 assert.equal(s.pending.choices.includes(green.uid),true);
 const rest=legalUniversalActions(packs,s).find(action=>action.type==='chooseHandRest'&&action.uid===green.uid);
 s=act(s,rest);
 assert.equal(live(s,card.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,card.uid)),pack.cards['MGS-2-049'].bp+3000);
 s=reach(s,'move');
 assert.equal(legalUniversalActions(packs,s).some(action=>
  (action.type==='move'||action.type==='step')&&action.uid===card.uid),false);
 assert.equal(Boolean(named),true);
});

test('MGS-2-049 may remove the 斧乃木余接 when that line is full',()=>{
 let s=open(218050,{'MGS-2-049':1});
 readyAp(s,2);
 for(let i=0;i<4;i++)sit(s,0,'MGS-2-045','energy');
 const card=hand(s,'MGS-2-049');
 const replaced=s.players[0].energy.find(Boolean);
 const play=legalUniversalActions(packs,s).find(action=>
  action.type==='play'&&action.uid===card.uid&&action.replaceUid===replaced.uid);
 if(!play)throw Error('No full-line play');
 s=act(s,play);
 assert.equal(s.players[0].removed.some(row=>row.uid===replaced.uid),true);
 assert.equal(s.players[0].energy.some(row=>row?.uid===card.uid),true);
});

test('MGS-2-057 raises the retirement cap to 5000 while 老倉育 is on the field',()=>{
 let low=open(218057,{'MGS-2-057':2,'MGS-2-028':1});
 pay(low,{'MGS-2-045':4});
 const small=sit(low,1,'MGS-2-040','front');
 const large=sit(low,1,'MGS-2-014','front');
 const event=hand(low,'MGS-2-057');
 low=playEvent(low,event.uid);
 assert.equal(low.pending.choices.includes(small.uid),true);
 assert.equal(low.pending.choices.includes(large.uid),false);

 let high=open(218058,{'MGS-2-057':2,'MGS-2-028':1});
 pay(high,{'MGS-2-045':4});
 sit(high,0,'MGS-2-028','front');
 const target=sit(high,1,'MGS-2-014','front');
 const card=hand(high,'MGS-2-057');
 high=playEvent(high,card.uid);
 assert.equal(high.pending.choices.includes(target.uid),true);
});

test('MGS-2-059 adds 1000 to the cap for each front character of energy 1, 2 or 3',()=>{
 let plain=open(218059,{'MGS-2-059':2,'MGS-1-023':2});
 pay(plain,{'MGS-2-045':3});
 const small=sit(plain,1,'MGS-2-040','front');
 const huge=sit(plain,1,'MGS-1-105','front');
 const event=hand(plain,'MGS-2-059');
 plain=playEvent(plain,event.uid);
 assert.equal(plain.pending.choices.includes(small.uid),true);
 assert.equal(plain.pending.choices.includes(huge.uid),false);

 let scaled=open(218060,{'MGS-2-059':2,'MGS-1-023':2});
 pay(scaled,{'MGS-2-045':3});
 sit(scaled,0,'MGS-1-007','front');
 sit(scaled,0,'MGS-1-023','front');
 sit(scaled,0,'MGS-2-030','front');
 sit(scaled,0,'MGS-1-001','front');
 const target=sit(scaled,1,'MGS-1-105','front');
 const card=hand(scaled,'MGS-2-059');
 scaled=playEvent(scaled,card.uid);
 assert.equal(scaled.pending.limit,6000);
 assert.equal(scaled.pending.choices.includes(target.uid),true);
});

test('MGS-2-065 and MGS-2-066 use the energy left after the outside cut',()=>{
 let cut=open(218065,{'MGS-2-065':2,'MGS-2-066':2,'MGS-1-068':2});
 const low=sit(cut,0,'MGS-2-065','front');
 assert.equal(universalBp(pack,cut,low),pack.cards['MGS-2-065'].bp-1000);
 assert.equal(universalImpactNull(pack,cut,low),false);
 for(let i=0;i<10;i++)cut.players[0].outside.push(cut.players[0].deck.pop());
 assert.equal(universalBp(pack,cut,low),pack.cards['MGS-2-065'].bp);
 assert.equal(universalImpactNull(pack,cut,low),true);

 let cheap=open(218066,{'MGS-2-066':2,'MGS-1-068':4});
 pay(cheap,{'MGS-1-068':3});
 const free=hand(cheap,'MGS-2-066');
 cheap.players[0].outside.push(cheap.players[0].deck.pop());
 cheap=playLine(cheap,free.uid,'front');
 assert.equal(cheap.pending,null);

 let paid=open(218067,{'MGS-2-066':2,'MGS-1-068':4});
 pay(paid,{'MGS-1-068':3});
 for(let i=0;i<10;i++)paid.players[0].outside.push(paid.players[0].deck.pop());
 const koyomi=take(paid,0,'MGS-1-001');
 paid.players[0].outside.push(koyomi);
 const card=hand(paid,'MGS-2-066');
 paid=playLine(paid,card.uid,'front');
 assert.equal(paid.pending.kind,'effect-recover-outside');
 assert.equal(paid.pending.choices.includes(koyomi.uid),true);
});

test('MGS-2-069 sends the top card to the removed zone, and that is an own effect',()=>{
 let s=open(218069,{'MGS-2-069':2,'MGS-2-070':1,'MGS-2-050':1});
 readyAp(s);
 const removed=top(s,['MGS-2-070'])[0];
 const mayoi=take(s,0,'MGS-2-050');
 s.players[0].outside.push(mayoi);
 const card=hand(s,'MGS-2-069');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'private-top-or-outside');
 assert.equal(s.pending.to,'removed');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,{type:'chooseTopCard',mode:'removed'});
 assert.equal(s.players[0].removed.some(row=>row.uid===removed.uid),true);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.choices.includes(mayoi.uid),true);
});

test('MGS-2-072 keeps every looked card and then rests a red 神原駿河',()=>{
 let s=open(218072,{'MGS-2-072':2,'MGS-1-072':1,'MGS-1-092':1,'MGS-2-057':1});
 readyAp(s);
 const match=top(s,['MGS-1-006','MGS-2-002','MGS-1-092','MGS-2-057','MGS-1-001']);
 const red=hand(s,'MGS-1-072');
 const event=hand(s,'MGS-2-072');
 s=playEvent(s,event.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,match.map(row=>row.uid));
 assert.deepEqual(s.pending.choices,[match[0].uid,match[2].uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(row=>s.pending.uids.includes(row.uid)),false);
 s=act(s,{type:'chooseTopFiltered',uid:match[0].uid});
 while(s.pending?.kind==='effect-top-order')
  s=act(s,{type:'chooseTopOrder',uid:s.pending.uids.find(uid=>!s.pending.order.includes(uid))});
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(red.uid),true);
 assert.equal(s.pending.choices.includes(match[0].uid),false);
 const rest=legalUniversalActions(packs,s).find(action=>action.type==='chooseHandRest'&&action.uid===red.uid);
 s=act(s,rest);
 assert.equal(live(s,red.uid).ready,false);
 assert.equal(live(s,red.uid).entryTurn,s.turn);
});

test('MGS-2-046 moves from a full energy line only while front has energy 1 and 3',()=>{
 let s=open(218046,{'MGS-2-046':1,'MGS-2-070':1,'MGS-2-050':1});
 const body=sit(s,0,'MGS-2-046','energy');
 sit(s,0,'MGS-2-040','front');
 assert.equal(universalImpactNull(pack,s,body),true);
 assert.equal(pack.cards['MGS-2-046'].step,true);
 assert.equal(legalUniversalActions(packs,s).some(action=>action.mode==='pairMoveFront'),false);
 sit(s,0,'MGS-1-001','front');
 sit(s,0,'MGS-2-030','front');
 const removed=sit(s,0,'MGS-2-070','front');
 const mayoi=take(s,0,'MGS-2-050');
 s.players[0].outside.push(mayoi);
 const move=legalUniversalActions(packs,s).find(action=>action.mode==='pairMoveFront');
 s=act(s,move);
 assert.equal(s.pending.kind,'effect-next');
 assert.equal(s.pending.mode,'clear');
 assert.equal(legalUniversalActions(packs,s).some(action=>action.mode==='skip'),false);
 s=act(s,{type:'nextPrint',mode:'clear',uid:removed.uid});
 assert.equal(s.pending,null);
 assert.equal(live(s,body.uid).ready,true);
 assert.equal(s.players[0].front.some(card=>card?.uid===body.uid),true);
 assert.equal(universalBp(pack,s,live(s,body.uid)),3500);
 assert.equal(s.players[0].removed.some(card=>card.uid===removed.uid),true);
 assert.equal(s.players[0].outside.some(card=>card.uid===mayoi.uid),true);
});

test('MGS-2-020 rests onto its deck and then rests a purple energy-0 羽川翼',()=>{
 let s=open(218020,{'MGS-2-020':1,'MGS-1-054':1});
 readyAp(s);
 const body=sit(s,0,'MGS-2-020','energy');
 const wing=take(s,0,'MGS-1-054');
 s.players[0].outside.push(wing);
 s=act(s,legalUniversalActions(packs,s).find(action=>action.mode==='deckDeploy'));
 assert.equal(s.players[0].deck[0].uid,body.uid);
 assert.equal(s.players[0].energy.some(card=>card?.uid===body.uid),false);
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.equal(s.pending.choices.includes(wing.uid),true);
 const deploy=legalUniversalActions(packs,s).find(action=>action.type==='chooseOutsideNameRest'&&action.uid===wing.uid);
 s=act(s,deploy);
 assert.equal(live(s,wing.uid).ready,false);
 assert.equal(live(s,wing.uid).entryTurn,s.turn);
 assert.equal(s.pending.kind,'private-top-place');
 assert.equal(universalPrivateChoices(packs,s,1),null);
});

test('MGS-2-055 retires itself and actives an energy-2 斧乃木余接',()=>{
 let s=open(218055,{'MGS-2-055':1});
 const field=sit(s,0,'MGS-2-055','energy');
 const yotsugi=take(s,0,'MGS-2-045');
 s.players[0].outside.push(yotsugi);
 s=act(s,legalUniversalActions(packs,s).find(action=>action.mode==='fieldDeploy'));
 assert.equal(s.players[0].outside.some(card=>card.uid===field.uid),true);
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.equal(s.pending.line,'energy');
 assert.equal(s.pending.enterReady,true);
 const deploy=legalUniversalActions(packs,s).find(action=>action.uid===yotsugi.uid&&action.line==='energy');
 s=act(s,deploy);
 assert.equal(live(s,yotsugi.uid).ready,true);
 assert.equal(live(s,yotsugi.uid).entryTurn,s.turn);
 assert.equal(s.players[0].energy.some(card=>card?.uid===yotsugi.uid),true);
 assert.equal(s.pending,null);
});

test('MGS-2-034 shows the top card and both players place a card after removing a final trigger',()=>{
 let played=open(218034,{'MGS-2-034':1});
 readyAp(played);
 const peeked=hand(played,'MGS-2-034');
 played=playLine(played,peeked.uid,'front');
 assert.equal(played.pending.kind,'private-top-or-outside');
 assert.equal(played.pending.to,'removed');
 assert.equal(universalPrivateChoices(packs,played,1),null);
 played=act(played,{type:'chooseTopCard',mode:'top'});
 assert.equal(played.pending,null);
 let s=open(218134,{'MGS-2-034':1,'MGS-2-058':1});
 const body=sit(s,0,'MGS-2-034','front',{ready:true});
 const finalCard=take(s,0,'MGS-2-058');
 s.players[0].outside.push(finalCard);
 const before=s.players[0].hand.length;
 s=act(s,legalUniversalActions(packs,s).find(action=>action.mode==='finalPeek'));
 assert.equal(live(s,body.uid).ready,false);
 s=act(s,{type:'chooseRemoveFinal',uid:finalCard.uid});
 assert.equal(s.players[0].removed.some(card=>card.uid===finalCard.uid),true);
 assert.equal(s.pending.kind,'private-top-place');
 assert.equal(s.pending.player,0);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.pending.kind,'private-top-place');
 assert.equal(s.pending.player,1);
 assert.equal(universalPrivateChoices(packs,s,0),null);
 s=act(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before);
});

test('MGS-2-035 actives on the energy line and draws after both peeks on its entry turn',()=>{
 let s=open(218035,{'MGS-2-035':1,'MGS-2-058':1});
 pay(s,{'MGS-2-045':3});
 const body=hand(s,'MGS-2-035');
 s=playLine(s,body.uid,'energy');
 assert.equal(live(s,body.uid).ready,true);
 assert.equal(pack.cards['MGS-2-035'].triggerEffect.op,'deployHandCharacter');
 const finalCard=take(s,0,'MGS-2-058');
 s.players[0].outside.push(finalCard);
 const before=s.players[0].hand.length;
 s=act(s,legalUniversalActions(packs,s).find(action=>action.mode==='finalPeek'));
 s=act(s,{type:'chooseRemoveFinal',uid:finalCard.uid});
 s=act(s,{type:'chooseTopCard',mode:'top'});
 s=act(s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending,null);
});

test('MGS-2-054 actives the first 八九寺真宵 on play and can raise its attack buff to three',()=>{
 let s=open(218054,{'MGS-2-054':2});
 sit(s,0,'MGS-2-040','front');
 sit(s,0,'MGS-2-030','front');
 pay(s,{'MGS-2-045':3});
 const first=hand(s,'MGS-2-054');
 s=playLine(s,first.uid,'front');
 assert.equal(live(s,first.uid).ready,true);
 const second=hand(s,'MGS-2-054');
 s=playLine(s,second.uid,'front');
 assert.equal(live(s,second.uid).ready,false);
 assert.equal(s.onceEffectUses[0].includes('八九寺真宵|onPlayOnce'),true);
 let attack=open(218154,{'MGS-2-054':1});
 const attacker=sit(attack,0,'MGS-2-054','front');
 sit(attack,0,'MGS-2-040','front');
 sit(attack,0,'MGS-2-030','front');
 const paid=hand(attack,'MGS-2-038');
 attack=reach(attack,'attack');
 attack=act(attack,{type:'attack',uid:attacker.uid});
 assert.equal(attack.pending.kind,'effect-hand-raise');
 assert.equal(attack.pending.paidMax,3);
 attack=act(attack,{type:'chooseHandRaise',mode:'pay',uid:paid.uid});
 assert.equal(attack.players[0].outside.some(card=>card.uid===paid.uid),true);
 assert.equal(attack.pending.kind,'effect-buff-own');
 assert.equal(attack.pending.remaining,3);
 attack=act(attack,{type:'chooseOwnBuff',uid:null});
 assert.equal(attack.pending.kind,'block');
 let plain=open(218254,{'MGS-2-054':1});
 const lone=sit(plain,0,'MGS-2-054','front');
 plain=reach(plain,'attack');
 plain=act(plain,{type:'attack',uid:lone.uid});
 assert.equal(plain.pending.kind,'effect-buff-own');
 assert.equal(plain.pending.remaining,1);
});

test('MGS-2-053 keeps its framed text quiet until it is a face-up raid',()=>{
 let quiet=open(218053,{'MGS-2-053':1});
 sit(quiet,0,'MGS-2-040','front');
 sit(quiet,0,'MGS-2-030','front');
 pay(quiet,{'MGS-2-045':3});
 const ordinary=hand(quiet,'MGS-2-053');
 const waiting=hand(quiet,'MGS-2-038');
 quiet=playLine(quiet,ordinary.uid,'front');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.some(card=>card.uid===waiting.uid),true);
 assert.equal(universalBp(pack,quiet,live(quiet,ordinary.uid)),3500);
 let s=open(218153,{'MGS-2-053':1,'MGS-2-050':1});
 const base=sit(s,0,'MGS-2-050','front');
 sit(s,0,'MGS-2-040','front');
 sit(s,0,'MGS-2-030','front');
 pay(s,{'MGS-2-045':3});
 const raider=hand(s,'MGS-2-053');
 const summoned=hand(s,'MGS-2-038');
 const raid=legalUniversalActions(packs,s).find(action=>action.type==='raid'&&action.uid===raider.uid&&action.baseUid===base.uid);
 if(!raid)throw Error('No raid onto 八九寺真宵');
 s=act(s,raid);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(summoned.uid),true);
 assert.equal(universalBp(pack,s,live(s,raider.uid)),4000);
 const rest=legalUniversalActions(packs,s).find(action=>action.type==='chooseHandRest'&&action.uid===summoned.uid);
 s=act(s,rest);
 assert.equal(live(s,summoned.uid).ready,false);
 assert.equal(live(s,summoned.uid).entryTurn,s.turn);
});

function choose(s,mode,extra={}){
 return act(s,{type:'chooseVol2',mode,...extra});
}

test('MGS-2-001 may put a raiding nadeko top outside, then replay another nadeko',()=>{
 let s=open(218001,{'MGS-2-001':1});
 const host=sit(s,0,'MGS-1-009','front');
 const top=take(s,0,'MGS-1-001');
 top.faceDown=false;
 host.stack=[top];
 pay(s,{'MGS-1-001':2});
 const card=hand(s,'MGS-2-001');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-vol2');
 assert.equal(s.pending.choices.includes(host.uid),true);
 s=choose(s,'pick',{uid:host.uid});
 assert.equal(s.players[0].outside.some(item=>item.uid===host.uid),true);
 assert.equal(live(s,top.uid).cardId,'MGS-1-001');
 assert.equal(s.pending.mode,'restFront');
 s=choose(s,'skip',{uid:null});
 assert.equal(s.pending,null);
});

test('MGS-2-005 keeps the raid frame quiet until it is raiding',()=>{
 let quiet=open(218005,{'MGS-2-005':1});
 pay(quiet,{'MGS-1-001':4});
 const ordinary=hand(quiet,'MGS-2-005');
 const before=quiet.players[0].hand.length;
 quiet=playLine(quiet,ordinary.uid,'front');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.length,before-1);
 let s=open(218105,{'MGS-2-005':1});
 const base=sit(s,0,'MGS-1-009','front');
 pay(s,{'MGS-1-001':4});
 const raider=hand(s,'MGS-2-005');
 const raid=legalUniversalActions(packs,s).find(action=>action.type==='raid'&&action.uid===raider.uid&&action.baseUid===base.uid);
 if(!raid)throw Error('No raid onto 千石撫子');
 const handBefore=s.players[0].hand.length;
 s=act(s,raid);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(live(s,raider.uid).stack.some(card=>card.uid===base.uid),true);
 assert.equal(s.pending,null);
});

test('MGS-2-011 draws when an ordinary attack is blocked and returns only while raiding',()=>{
 let s=open(218011,{'MGS-2-011':1});
 const attacker=sit(s,0,'MGS-2-011','front');
 const blocker=sit(s,1,'MGS-1-001','front',{ready:true});
 s=reach(s,'attack');
 const drawn=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:blocker.uid},1);
 assert.equal(s.players[0].hand.length,drawn+1);
 assert.equal(s.players[0].outside.some(card=>card.uid===attacker.uid),false);
});

test('MGS-2-012 chooses a high-energy nadeko discount when it leaves on its turn',()=>{
 let s=open(218012,{'MGS-2-012':1,'MGS-2-005':1});
 const base=sit(s,0,'MGS-1-009','front');
 pay(s,{'MGS-1-001':4});
 const raider=hand(s,'MGS-2-005');
 const raid=legalUniversalActions(packs,s).find(action=>action.type==='raid'&&action.uid===raider.uid&&action.baseUid===base.uid);
 s=act(s,raid);
 if(s.pending)s=choose(s,'skip',{uid:null});
 const freed=s.players[0].energy.find(Boolean);
 s.players[0].energy[s.players[0].energy.indexOf(freed)]=null;
 s.players[0].outside.push(freed);
 const field=sit(s,0,'MGS-2-012','energy');
 const activate=legalUniversalActions(packs,s).find(action=>action.mode==='vol2:fieldImpact');
 s=act(s,activate);
 s=choose(s,'pick',{uid:field.uid});
 assert.equal(s.pending.mode,'nadekoChoice');
 s=choose(s,'discount',{uid:null});
 assert.equal(s.players[0].nextNamedHandEnergy.some(entry=>entry.name==='千石撫子'&&entry.amount===3&&entry.minEnergy===8),true);
});

test('MGS-2-017 can enter from outside by retiring a 4000 BP koyomi',()=>{
 let s=open(218017,{'MGS-2-017':1});
 sit(s,0,'MGS-2-014','front');
 const outside=take(s,0,'MGS-2-017');
 s.players[0].outside.push(outside);
 const activate=legalUniversalActions(packs,s).find(action=>action.mode==='vol2:outsideEnter'&&action.uid===outside.uid);
 if(!activate)throw Error('Outside entry was not offered');
 s=act(s,activate);
 s=choose(s,'pick',{uid:s.players[0].front.find(card=>card?.cardId==='MGS-2-014').uid});
 assert.equal(s.pending.mode,'reenter');
 const dest=s.pending.slots[0];
 s=choose(s,'enter',{uid:outside.uid,line:dest.line,slot:dest.slot});
 assert.equal(live(s,outside.uid).ready,false);
 assert.equal(live(s,outside.uid).entryTurn,s.turn);
});

test('MGS-2-022 names an energy when it is raided, in an order the player chooses',()=>{
 let s=open(218022,{'MGS-2-022':1,'MGS-2-023':1});
 const base=sit(s,0,'MGS-2-022','front');
 pay(s,{'MGS-1-052':4});
 const raider=hand(s,'MGS-2-023');
 const raid=legalUniversalActions(packs,s).find(action=>action.type==='raid'&&action.uid===raider.uid&&action.baseUid===base.uid);
 if(!raid)throw Error('No raid onto 羽川翼');
 s=act(s,raid);
 assert.equal(s.pending.kind,'raid-effect-order');
 s=act(s,{type:'chooseRaidOrder',mode:'baseFirst'});
 assert.equal(s.pending.mode,'energyNumber');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const top=s.players[0].deck[0];
 const energy=pack.cards[top.cardId].energy;
 s=choose(s,'energy',{energy});
 assert.equal(s.players[0].hand.some(card=>card.uid===top.uid),true);
});

test('MGS-2-024 draws three and stops effects from readying AP',()=>{
 let s=open(218024,{'MGS-2-024':1});
 pay(s,{'MGS-1-052':4});
 const event=hand(s,'MGS-2-024');
 const before=s.players[0].hand.length;
 s=playEvent(s,event.uid);
 assert.equal(s.players[0].hand.length,before-1+3);
 assert.equal(s.players[0].apEffectReadyBanTurn,s.turn);
});

test('MGS-2-026 tucks a face-up koyomi only while it is not raiding',()=>{
 let s=open(218026,{'MGS-2-026':1,'MGS-2-025':1});
 const body=sit(s,0,'MGS-2-026','energy');
 const under=take(s,0,'MGS-2-025');
 s.players[0].outside.push(under);
 hand(s,'MGS-2-038');
 const activate=legalUniversalActions(packs,s).find(action=>action.mode==='vol2:tuck');
 if(!activate)throw Error('Unraided tuck was not offered');
 s=act(s,activate);
 s=choose(s,'pick',{uid:under.uid});
 assert.equal(live(s,body.uid).under.some(card=>card.uid===under.uid&&card.faceDown===false),true);
 live(s,body.uid).stack=[take(s,0,'MGS-1-001')];
 assert.equal(legalUniversalActions(packs,s).some(action=>action.mode==='vol2:restGen'),true);
});

test('MGS-2-031 shows both looked cards and can send the rest outside',()=>{
 let s=open(218031,{'MGS-2-031':1});
 const looked=top(s,['MGS-2-038','MGS-2-040']);
 pay(s,{'MGS-2-045':1});
 const card=hand(s,'MGS-2-031');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-vol2-look');
 assert.deepEqual(s.pending.uids,looked.map(item=>item.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const view=universalPrivateChoices(packs,s,0);
 assert.equal(view.inspected.length,2);
 s=choose(s,'done',{uid:null});
 assert.equal(s.players[0].outside.some(item=>item.uid===looked[0].uid),true);
 assert.equal(s.players[0].outside.some(item=>item.uid===looked[1].uid),true);
});

test('MGS-2-064 puts the drawn hand card outside and counts facedown cards on attack',()=>{
 let s=open(218064,{'MGS-2-064':1,'MGS-2-068':1,'MGS-1-072':4});
 pay(s,{'MGS-1-072':4});
 const card=hand(s,'MGS-2-064');
 const paid=hand(s,'MGS-2-038');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.mode,'handFlower');
 s=choose(s,'outside',{uid:paid.uid});
 assert.equal(s.players[0].outside.some(item=>item.uid===paid.uid),true);
 live(s,card.uid).ready=true;
 const flower=sit(s,0,'MGS-2-068','front');
 const hidden=take(s,0,'MGS-1-006');
 hidden.faceDown=true;
 flower.under=[hidden];
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:card.uid});
 assert.equal(s.pending.mode,'facedownMenu');
 assert.deepEqual(s.pending.options,['draw']);
});

test('MGS-2-067 keeps its hand cost and cuts required energy only on the field',()=>{
 let s=open(218067,{'MGS-2-067':1,'MGS-1-072':3});
 const card=hand(s,'MGS-2-067');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MGS-2-067'],card),3);
 pay(s,{'MGS-1-072':3});
 s=playLine(s,card.uid,'energy');
 assert.equal(s.pending.kind,'effect-vol2-look');
 assert.equal(s.pending.uids.length,3);
 assert.equal(effectiveRequiredEnergy(pack,s,live(s,card.uid))<=0,true);
 s=choose(s,'done',{uid:null});
});

test('MGS-2-068 gains 500 BP for each facedown card under it',()=>{
 let s=open(218068,{'MGS-2-068':1});
 const card=sit(s,0,'MGS-2-068','front');
 assert.equal(universalBp(pack,s,card),3000);
 const hidden=take(s,0,'MGS-1-006');
 hidden.faceDown=true;
 card.under=[hidden];
 assert.equal(universalBp(pack,s,card),3500);
});

test('MGS-2-071 spends one hand card to widen the next BP range',()=>{
 let s=open(218071,{'MGS-2-071':1});
 const card=sit(s,0,'MGS-2-071','front');
 const paid=hand(s,'MGS-2-038');
 const activate=legalUniversalActions(packs,s).find(action=>action.mode==='vol2:window');
 s=act(s,activate);
 s=choose(s,'pick',{uid:paid.uid});
 assert.equal(s.players[0].removed.some(item=>item.uid===paid.uid),true);
 s=choose(s,'window',{uid:null});
 assert.equal(s.bpWindowPlus[0],1000);
 assert.equal(legalUniversalActions(packs,s).some(action=>action.mode==='vol2:window'),false);
});

test('MGS-2-015 offers its entry menu only on the turn it entered',()=>{
 let s=open(218015,{'MGS-2-015':1});
 const card=sit(s,0,'MGS-2-015','front',{entryTurn:s.turn});
 sit(s,1,'MGS-1-001','front');
 const activate=legalUniversalActions(packs,s).find(action=>action.mode==='vol2:menu');
 if(!activate)throw Error('Entry menu was not offered');
 s=act(s,activate);
 assert.equal(s.pending.mode,'entryPay');
 let later=open(218115,{'MGS-2-015':1});
 sit(later,0,'MGS-2-015','front');
 sit(later,1,'MGS-1-001','front');
 assert.equal(legalUniversalActions(packs,later).some(action=>action.mode==='vol2:menu'),false);
});

test('MGS-2-023 keeps the raid frame quiet on an ordinary play',()=>{
 let s=open(218023,{'MGS-2-023':1});
 const wall=sit(s,1,'MGS-1-001','front');
 pay(s,{'MGS-1-052':4});
 const card=hand(s,'MGS-2-023');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,s.players[1].front.find(card=>card?.uid===wall.uid)),3000);
});

test('MGS-2-048 may retire one koyomi and put that card back active',()=>{
 let s=open(218048,{'MGS-2-048':1,'MGS-2-025':1});
 const koyomi=sit(s,0,'MGS-2-025','front');
 pay(s,{'MGS-2-045':3});
 const card=hand(s,'MGS-2-048');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.mode,'koyomiReenter');
 s=choose(s,'skip',{uid:null});
 assert.equal(s.players[0].front.some(card=>card?.uid===koyomi.uid),true);
});

test('MGS-2-056 gives a field yotsugi 2000 BP and impact 1',()=>{
 let s=open(218056,{'MGS-2-056':1});
 const yotsugi=sit(s,0,'MGS-2-045','front');
 pay(s,{'MGS-2-045':2});
 const event=hand(s,'MGS-2-056');
 s=playEvent(s,event.uid);
 assert.equal(s.pending.mode,'yotsugiBranch');
 const before=universalBp(pack,s,live(s,yotsugi.uid));
 s=choose(s,'buff',{uid:null});
 s=choose(s,'pick',{uid:yotsugi.uid});
 assert.equal(universalBp(pack,s,live(s,yotsugi.uid)),before+2000);
 assert.equal(universalImpact(pack,s,live(s,yotsugi.uid)),1);
});

test('MGS-2-060 retires an energy-3 mayoi before the optional entries',()=>{
 let s=open(218060,{'MGS-2-060':1,'MGS-2-053':1});
 const mayoi=sit(s,0,'MGS-2-053','front');
 pay(s,{'MGS-2-045':3});
 const event=hand(s,'MGS-2-060');
 s=playEvent(s,event.uid);
 assert.equal(s.pending.mode,'mayoiRetire');
 s=choose(s,'pick',{uid:mayoi.uid});
 assert.equal(s.players[0].outside.some(card=>card.uid===mayoi.uid),true);
 assert.equal(s.pending.mode,'mayoiDeploy');
});

test('MGS-2-062 shows the top two cards and only a suruga can leave',()=>{
 let s=open(218062,{'MGS-2-062':1});
 const looked=top(s,['MGS-1-006','MGS-2-045']);
 const card=hand(s,'MGS-2-062');
 s=playLine(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-vol2-look');
 assert.deepEqual(s.pending.choices,[looked[0].uid]);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,2);
 assert.equal(universalPrivateChoices(packs,s,1),null);
});
