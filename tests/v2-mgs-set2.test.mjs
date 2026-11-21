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
import {dispatchUniversalAction,effectiveHandRequiredEnergy,legalUniversalActions,newUniversalMatch,universalBp,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const pack=createMgsV2Pack();
const packs=[pack,pack];
const byId=new Map(MGS2_CARDS.map(card=>[card.id,card]));
const RAID=['MGS-2-005','MGS-2-011','MGS-2-023','MGS-2-026','MGS-2-032','MGS-2-037','MGS-2-053'];
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
 for(const [id,n] of Object.entries(extra||{}))counts[id]=(counts[id]||0)+n;
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 if(total!==50)throw Error('Deck is '+total);
 return counts;
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
 assert.equal(MGS2_CARDS.every(card=>card.name===card.nameJa&&card.effect.replace(/\s/g,'')===card.effectJa&&card.sourceTc===null),true);
 assert.equal(MGS2_CARDS.every(card=>card.engineKind===mgs2EngineKind(card)),true);
 assert.deepEqual([...MGS2_ENGINE_IDS],[...MGS2_CARDS.filter(card=>card.engineKind).map(card=>card.id)]);
 assert.equal(MGS2_ENGINE_IDS.length,18);
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
