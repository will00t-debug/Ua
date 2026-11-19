// Q51 / Q552: the actual EVA Raid frame is not an ordinary play program.
import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalBp,universalImpact,universalAttackDamage} from '../dist/universal-v2/engine.mjs';

const pack=officialV2Pack('eva');
const frames={
 '033':['printedImpact','onPlay','main'],'034':['outsideCountGrants','main'],
 '035':['onPlay'],'036':['ownTurnBp','onPlay','onRetire'],'041':['onPlay'],
 '042':['bpPerDirectFacedown','onPlay','main'],'043':['phase','onPlay'],
 '053':['onPlay','onRetire'],'077':['onPlay','onRetire'],
 '079':['facedownCountGrants','facedownTriggerImmuneAt','phase','onPlay'],
 '080':['main','onRetire'],'081':['onPlay'],'082':['printedAttackDamage','phase'],
 '104':['printedImpact','onAttack'],'105':['readyOnBlockCount','onRetire']
};
const id=n=>'EVA-1-'+n;

test('all printed EVA Raid tops have their shared frame registered; non-Raid effects stay outside',()=>{
 const raidIds=Object.values(pack.cards).filter(c=>c.raidName||c.raidTrait).map(c=>c.id).sort();
 assert.deepEqual(raidIds,Object.keys(frames).map(id).sort());
 for(const [n,features] of Object.entries(frames))
  for(const feature of features)assert.ok(raidBoxListed(id(n),feature),n+' '+feature);
 assert.equal(raidBoxListed(id('113'),'onRaided'),false);
 assert.equal(raidBoxListed(id('025'),'onPlay'),false);
});

function deckFor(color,featured){
 const counts=Object.fromEntries(featured.map(n=>[id(n),4]));
 let left=50-Object.values(counts).reduce((a,b)=>a+b,0);
 for(const c of Object.values(pack.cards)){
  if(left<=0)break;
  if(c.color!==color||c.type!=='character'||c.energy>3||counts[c.id])continue;
  const n=Math.min(left,4);counts[c.id]=n;left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function main(color,featured){
 const d=deckFor(color,featured);
 let s=newUniversalMatch(pack,{decks:[d,d],first:0,seed:51});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function take(s,p,n){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id(n));
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('missing '+n);
}
function put(s,p,n,line,slot){
 const c=take(s,p,n);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;c.entryTurn=s.turn;
 s.players[p][line][slot]=c;return c;
}
function prepare(){
 const s=main('purple',['041','048','040','024']);
 for(let i=0;i<3;i++)put(s,0,'040','energy',i);
 put(s,0,'048','energy',3);
 const target=put(s,1,'024','front',0);
 const top=take(s,0,'041');s.players[0].hand.push(top);
 return {s,target,top};
}
test('EVA-1-041 ordinary play skips framed BP reduction; true Raid offers it',()=>{
 let {s,target,top}=prepare();
 const play=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===top.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const oldBp=universalBp(pack,s,target);
 s=dispatchUniversalAction(pack,s,play);
 assert.ok(!s.pending,'ordinary play must not prompt a Raid-box effect');
 assert.equal(universalBp(pack,s,s.players[1].front[0]),oldBp);
 assert.equal(assertUniversalMatch(pack,s),true);
 ({s,target,top}=prepare());
 const base=s.players[0].energy[3];
 const raid=legalUniversalActions(pack,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0&&a.line!=='energy');
 assert.ok(raid);
 s=dispatchUniversalAction(pack,s,raid);
 assert.ok(s.pending,'Raid must offer the BP reduction');
 const choose=legalUniversalActions(pack,s).find(a=>a.uid===target.uid);
 assert.ok(choose);
 s=dispatchUniversalAction(pack,s,choose);
 assert.equal(universalBp(pack,s,s.players[1].front[0]),oldBp-1000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

for(const row of [
 {color:'purple',n:'033',base:'027',impact:[0,1]},
 {color:'purple',n:'036',base:'024',bp:[3500,4000]},
 {color:'red',n:'079',base:'073',bp:[5000,10000],impact:[0,3]},
 {color:'red',n:'082',base:'090',damage:[1,2]},
 {color:'red',n:'104',base:'073',impact:[0,1]}
])test(row.n+' framed standing keywords depend on a face-up Raid base',()=>{
 const s=main(row.color,[row.n,row.base]);
 const top=put(s,0,row.n,'front',0);
 const base=take(s,0,row.base);
 for(const state of [0,1]){
  if(state===1)top.stack=[base];
  if(row.bp)assert.equal(universalBp(pack,s,top),row.bp[state]);
  if(row.impact)assert.equal(universalImpact(pack,s,top),row.impact[state]);
  if(row.damage)assert.equal(universalAttackDamage(pack,s,top),row.damage[state]);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
});

// The printed Raid retirement opens TOP-N from the defender's outside zone.
test('EVA-1-053 can block, retire in battle and finish its five-card search',()=>{
 let s=main('purple',['053','044','033']);
 const attacker=put(s,0,'053','front',0);
 const defender=put(s,1,'053','front',0);
 defender.stack=[take(s,1,'044')];
 const high=take(s,1,'033');
 s.players[1].deck.unshift(high);
 s.phase='attack';
 const attack=legalUniversalActions(pack,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(attack);
 s=dispatchUniversalAction(pack,s,attack);
 const block=legalUniversalActions(pack,s).find(a=>a.type==='chooseBlock'&&a.uid===defender.uid);
 assert.ok(block,'ready Raid character is a legal blocker');
 s=dispatchUniversalAction(pack,s,block);
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(s.pending?.kind,'effect-top-filter-many-choice');
 assert.equal(s.pending.player,1);
 assert.equal(s.pending.uids.length,5);
 assert.equal(assertUniversalMatch(pack,s),true);
 const pick=legalUniversalActions(pack,s).find(a=>a.type==='chooseTopFilteredMany'&&a.uid===high.uid);
 assert.ok(pick);
 s=dispatchUniversalAction(pack,s,pick);
 assert.ok(s.players[1].hand.some(c=>c.uid===high.uid));
 if(s.pending?.kind==='effect-top-filter-many-choice')s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.uid===null));
 while(s.pending?.kind==='effect-top-order')s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s)[0]);
 assert.equal(assertUniversalMatch(pack,s),true);
});
