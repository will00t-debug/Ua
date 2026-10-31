import test from 'node:test';
import assert from 'node:assert/strict';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalImpactNull,
 universalAttackDamage}
 from '../dist/universal-v2/engine.mjs';

// Official Q51 / Q552: Raid-box text needs a face-up card under a Raid top.
// 登場時 outside the box still fires on ordinary play. Not full FAQ certification.
const ttg=createTtgV2Pack();
const deck={
 'TTG-1-074':2,'TTG-1-072':4,'TTG-1-071':2,'TTG-1-073':2,'TTG-1-027':2,
 'TTG-1-030':2,'TTG-1-031':2,
 'TTG-1-058':4,'TTG-1-042':4,'TTG-1-051':4,'TTG-1-005':2,
 'TTG-1-063':4,'TTG-1-053':4,'TTG-1-064':2,'TTG-1-065':2,'TTG-1-049':4,
 'TTG-1-070':4
};
assert.equal(Object.values(deck).reduce((n,c)=>n+c,0),50);
assert.deepEqual(validateUniversalDeck(ttg,deck),[]);

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function stage(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function next(s,action){
 const before=structuredClone(s);
 const after=dispatchUniversalAction(ttg,s,action);
 assert.deepEqual(s,before,'reducer must not mutate the input state');
 assert.equal(assertUniversalMatch(ttg,after),true);
 return after;
}
function legal(s,predicate){
 const action=legalUniversalActions(ttg,s).find(predicate);
 assert.ok(action,JSON.stringify({phase:s.phase,pending:s.pending?.kind,
  types:legalUniversalActions(ttg,s).map(a=>a.type)}));
 return action;
}
function toMain(s){
 for(let i=0;i<5&&s.phase!=='main';i++)s=next(s,legal(s,a=>a.type==='next'));
 assert.equal(s.phase,'main');
 return s;
}
function fuel(s,p){
 for(let i=0;i<4;i++)stage(s,p,'TTG-1-063','energy',i,true);
}
function clearPending(s){
 for(let i=0;i<25&&s.pending;i++){
  const actions=legalUniversalActions(ttg,s);
  const candidate=actions.find(a=>a.uid===null)||
   actions.find(a=>a.mode==='skip'||a.mode==='decline')||
   actions[0];
  assert.ok(candidate,s.pending.kind);
  s=next(s,candidate);
 }
 assert.equal(s.pending,null);
 return s;
}

test('TTG-074 ordinary play stays REST and skips the Raid-frame entry',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7401});
 fuel(s,0);
 const card=hold(s,0,'TTG-1-074');
 s=toMain(s);
 const before=s.players[0].hand.length;
 s=next(s,legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const entered=live(s,0,card.uid);
 assert.equal(entered.ready,false);
 assert.equal((entered.stack||[]).length,0);
 assert.equal(universalImpact(ttg,s,entered),0);
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(s.pending,null);
 assertUniversalMatch(ttg,s);
});

test('TTG-074 Raid enters ACTIVE and turns on Raid-box IMPACT',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7402});
 fuel(s,0);
 stage(s,0,'TTG-1-058','front',1,true);
 const simon=stage(s,0,'TTG-1-051','front',0,true);
 const card=hold(s,0,'TTG-1-074');
 s=toMain(s);
 s=clearPending(next(s,legal(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===simon.uid)));
 const top=live(s,0,card.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,simon.uid);
 assert.equal(universalImpact(ttg,s,top),1);
 assertUniversalMatch(ttg,s);
});

test('TTG-072 ordinary play skips the Raid-frame entry and own-turn BP',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7201});
 fuel(s,0);
 const card=hold(s,0,'TTG-1-072');
 s=toMain(s);
 const before=s.players[0].hand.length;
 s=next(s,legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const entered=live(s,0,card.uid);
 assert.equal(entered.ready,false);
 assert.equal((entered.stack||[]).length,0);
 assert.equal(universalBp(ttg,s,entered),3500);
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(s.pending,null);
 assertUniversalMatch(ttg,s);
});

test('TTG-072 Raid onto Kamina is ACTIVE and gains Raid-box own-turn BP+500',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7202});
 fuel(s,0);
 const kamina=stage(s,0,'TTG-1-042','front',0,true);
 const card=hold(s,0,'TTG-1-072');
 s=toMain(s);
 s=clearPending(next(s,legal(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===kamina.uid)));
 const top=live(s,0,card.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,kamina.uid);
 assert.equal(universalBp(ttg,s,top),4000);
 assertUniversalMatch(ttg,s);
});

test('TTG-071 ordinary play keeps IMPACT null because that text is outside the frame',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7101});
 fuel(s,0);
 const card=hold(s,0,'TTG-1-071');
 s=toMain(s);
 s=next(s,legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const entered=live(s,0,card.uid);
 assert.equal(entered.ready,false);
 assert.equal(universalImpactNull(ttg,s,entered),true);
 assert.equal(ttg.cards['TTG-1-071'].effects.onAttack[0].op,'buffOtherIfFirstAttack');
 assertUniversalMatch(ttg,s);
});

test('TTG-071 Raid onto Kitan is ACTIVE and still nullifies IMPACT',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7102});
 fuel(s,0);
 const kitan=stage(s,0,'TTG-1-005','front',0,true);
 const card=hold(s,0,'TTG-1-071');
 s=toMain(s);
 s=next(s,legal(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===kitan.uid));
 const top=live(s,0,card.uid);
 assert.equal(top.ready,true);
 assert.equal(universalImpactNull(ttg,s,top),true);
 assertUniversalMatch(ttg,s);
});

test('TTG-073 ordinary play does not offer the facedown Raid-box retire',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:7301});
 fuel(s,0);
 const victim=stage(s,1,'TTG-1-049','front',0,true);
 const card=hold(s,0,'TTG-1-073');
 s=toMain(s);
 s=next(s,legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 const entered=live(s,0,card.uid);
 assert.equal(entered.ready,false);
 assert.equal(universalImpact(ttg,s,entered),0);
 assert.equal(universalBp(ttg,s,entered),4000);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].uid,victim.uid);
 assertUniversalMatch(ttg,s);
});

test('TTG-027 without a Raid base does not turn on Raid-box IMPACT or BP',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:2701});
 const card=stage(s,0,'TTG-1-027','front',0,false);
 s=toMain(s);
 assert.equal((card.stack||[]).length,0);
 assert.equal(universalImpact(ttg,s,card),0);
 assert.equal(universalBp(ttg,s,card),4000);
 assertUniversalMatch(ttg,s);
});

test('TTG-030 without a Raid base does not use Raid-box IMPACT null',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:3001});
 const card=stage(s,0,'TTG-1-030','front',0,false);
 s=toMain(s);
 assert.equal((card.stack||[]).length,0);
 assert.equal(universalImpactNull(ttg,s,card),false);
 assertUniversalMatch(ttg,s);
});

test('TTG-030 with a face-up Kitan under it uses Raid-box IMPACT null',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:3002});
 const kitan=take(s,0,'TTG-1-005');
 const card=stage(s,0,'TTG-1-030','front',0,true);
 card.stack=[kitan];
 s=toMain(s);
 assert.equal(universalImpactNull(ttg,s,card),true);
 assertUniversalMatch(ttg,s);
});

test('TTG-031 ordinary play does not use Raid-box BP or DAMAGE 2',()=>{
 let s=newUniversalMatch(ttg,{decks:[deck,deck],first:0,seed:3101});
 const card=stage(s,0,'TTG-1-031','front',0,false);
 s=toMain(s);
 assert.equal((card.stack||[]).length,0);
 assert.equal(universalBp(ttg,s,card),4000);
 assert.equal(universalAttackDamage(ttg,s,card),1);
 assertUniversalMatch(ttg,s);
});
