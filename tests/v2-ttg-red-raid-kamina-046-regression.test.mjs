import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {boardEntrySelection,entryClickPlan,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const {pack,counts}=verifiedTtgRedPilotDeck();
const packs=[pack,pack];
function newMatch(seed){return newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});}
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing physical card '+id);
}
function stage(s,id,line,slot,ready=true){
 const c=take(s,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;return c;
}
function hold(s,id){const c=take(s,id);s.players[0].hand.push(c);return c;}
function next(s,action){
 const before=structuredClone(s);
 const after=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.deepEqual(s,before,'reducer must not mutate the input state');
 assert.equal(assertUniversalMatch(packs,after),true);
 return after;
}
function legal(s,predicate){
 const action=legalUniversalActions(packs,s).find(predicate);
 assert.ok(action,JSON.stringify({phase:s.phase,pending:s.pending?.kind,
  types:legalUniversalActions(packs,s).map(a=>a.type)}));
 return action;
}
function main(s){
 for(let i=0;i<5&&s.phase!=='main';i++)s=next(s,legal(s,a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function clearPending(s){
 for(let i=0;i<25&&s.pending;i++){
  const actions=legalUniversalActions(packs,s);
  const candidate=actions.find(a=>a.uid===null)||
   actions.find(a=>a.mode==='skip'||a.mode==='entryFirst'||a.mode==='decline')||
   actions.find(a=>a.mode==='baseFirst')||actions[0];
  assert.ok(candidate,s.pending.kind);
  s=next(s,candidate);
 }
 assert.equal(s.pending,null,'every printed optional red raid effect must resolve');
 return s;
}
function fuel(s){
 for(let i=0;i<4;i++)stage(s,'TTG-1-042','energy',i,true);
}
test('TTG-046 printed 4/1 Kamina has front-only own-Raid-conditioned main and recognizable action text',()=>{
 const c=pack.cards['TTG-1-046'];
 assert.deepEqual([c.name,c.energy,c.ap,c.bp,c.color],['カミナ',4,1,4000,'red']);
 assert.equal(c.mainAbility.op,'chooseTwoAfterOwnRaid');
 let s=newMatch(4601);fuel(s);
 const kamina=stage(s,'TTG-1-046','front',0,false);
 const base=stage(s,'TTG-1-045','front',1,true);
 const raider=hold(s,'TTG-1-072');
 s=main(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kamina.uid),
  false,'without an own Raid Kamina must not become ACTIVE');
 const raid=legal(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.slot===1);
 const selection=boardEntrySelection(legalUniversalActions(packs,s),raider.uid);
 assert.ok(selection.raid.length);
 assert.ok(selection.normal.length);
 assert.equal(selection.needsMode,true);
 assert.deepEqual(entryClickPlan({selectedUid:raider.uid,entryMode:'raid',
  line:'front',slot:raid.slot,slotUid:base.uid,legal:legalUniversalActions(packs,s)}).actions[0],raid);
 assert.match(uiActionLabel(raid,{pack:packs,state:s}),/底板/);
 s=clearPending(next(s,raid));
 assert.equal(s.players[0].front[1].ready,true,'a Raid character is ACTIVE even if its base was REST');
 assert.equal(s.raidedThisTurn[0],true);
 const ready=legal(s,a=>a.type==='activate'&&a.uid===kamina.uid&&a.mode==='ready');
 const both=legal(s,a=>a.type==='activate'&&a.uid===kamina.uid&&a.mode==='readyAndBuff');
 const buff=legal(s,a=>a.type==='activate'&&a.uid===kamina.uid&&a.mode==='buff');
 for(const action of [ready,both,buff])assert.match(uiActionLabel(action,{pack:packs,state:s}),/主要能力/);
 s=next(s,both);
 assert.equal(s.players[0].front[0].ready,true,'4/1 Kamina must stand when chosen');
 assert.equal(s.pending?.kind,'main-two-buff');
 const buffAction=legal(s,a=>a.type==='chooseMainBuff'&&a.uid===raider.uid);
 assert.match(uiActionLabel(buffAction,{pack:packs,state:s}),/BP/);
 s=next(s,buffAction);
 assert.equal(s.players[0].front[1].buffs.some(x=>x.bp===1000),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kamina.uid),false);
});

test('TTG-046 per-name ACTIVE cannot be reused by a second Kamina but its BP mode remains available',()=>{
 let s=newMatch(4602);fuel(s);
 const first=stage(s,'TTG-1-046','front',0,false);
 const second=stage(s,'TTG-1-046','front',1,false);
 const base=stage(s,'TTG-1-045','front',2,true);
 const raider=hold(s,'TTG-1-072');
 s=main(s);
 s=clearPending(next(s,legal(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid)));
 s=next(s,legal(s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='ready'));
 const other=legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.uid===second.uid);
 assert.deepEqual(other.map(a=>a.mode),['buff']);
 s=next(s,other[0]);
 s=next(s,legal(s,a=>a.type==='chooseMainBuff'&&a.uid===first.uid));
 assert.equal(first.ready,false,'input physical card must stay unmodified');
 assert.equal(s.players[0].front[1].ready,false);
});

test('red Gurren 072 and chained Gurren Lagann 073 must both allow legal Raid and enter ACTIVE',()=>{
 let s=newMatch(4603);fuel(s);
 const kamina=stage(s,'TTG-1-045','front',0,true);
 stage(s,'TTG-1-051','front',1,true);
 const first=hold(s,'TTG-1-072');
 const second=hold(s,'TTG-1-073');
 // A chained second Raid needs a second live AP; the first player starts with only one.
 s.players[0].apCards.forEach((ap,i)=>{ap.inPlay=i<2;ap.ready=i<2;});
 s=main(s);
 s=clearPending(next(s,legal(s,a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===kamina.uid)));
 const gurren=s.players[0].front[0];
 assert.equal(gurren.cardId,'TTG-1-072');
 assert.equal(gurren.ready,true);
 const raid=legal(s,a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===gurren.uid);
 assert.match(uiActionLabel(raid,{pack:packs,state:s}),/底板/);
 s=clearPending(next(s,raid));
 const lagann=s.players[0].front[0];
 assert.equal(lagann.cardId,'TTG-1-073');
 assert.equal(lagann.ready,true);
 assert.equal(lagann.raidBaseUid,kamina.uid);
 assert.equal(lagann.stack[0].uid,kamina.uid);
 assert.equal(lagann.stack[0].under[0].cardId,'TTG-1-072');
 assert.equal(lagann.stack[0].under[0].faceDown,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
