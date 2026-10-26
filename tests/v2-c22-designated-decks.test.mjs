import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,effectiveHandRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';
import {DESIGNATED_BLEACH_DECKS,summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const byId=new Map(CARDS.map(c=>[c.identity,c]));
const counts={
 'BLC-3-008':4,'BLC-4-070':4,'BLC-2-073':4,'BLC-2-069':4,'BLC-3-001':4,'BLC-2-016':4,
 'BLC-1-067':4,'BLC-1-072':4,'BLC-2-066':4,'BLC-1-076':4,'BLC-1-009':4,
 'BLC-1-083':2,'BLC-2-068':4
};
const fresh=(first=0,seed=2201)=>newUniversalMatch(packs,{decks:[counts,counts],first,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function uids(s){
 const out=[];
 const walk=c=>{out.push(c.uid);for(const x of c.stack||[])walk(x);for(const x of c.under||[])walk(x);};
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed'])
   for(const c of p[zone])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
function phase(s,target){
 for(let i=0;i<6&&s.phase!==target;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,target);return s;
}
function sit(card,ready=true){card.ready=ready;return card;}
test('three designated lists stay exact and are not offered as playable 50-card presets',()=>{
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(EXPECTED_V2_COUNTS.bleach,160);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(EXPECTED_V2_TOTAL,489);
 const registered=id=>!!pack.cards[id];
 const report=summarizeDesignatedDecks(registered);
 assert.equal(report.length,3);
 const playableKeys=new Set(Object.keys(createAllV2PreviewRealDecks()));
 for(const row of report){
  assert.equal(row.copies,50);
  assert.equal(playableKeys.has(row.key),false);
  if(!row.playable)assert.throws(()=>designatedPlayableCounts(row),/not a complete playable deck/);
  const seen=new Set();
  for(const entry of row.entries){
   assert.equal(seen.has(entry.cardId),false);
   seen.add(entry.cardId);
   assert.ok(entry.copies>=1&&entry.copies<=4);
   const source=byId.get(entry.cardId);
   assert.equal(source.name,entry.name);
   const pinned=[source.number,...(source.aliases||[])].includes(entry.source);
   assert.equal(pinned,entry.sourcePinned);
   if(!entry.registered)assert.equal(typeof entry.gap,'string');
  }
 }
 const byKey=Object.fromEntries(report.map(r=>[r.key,r]));
 assert.equal(byKey['reject-blue'].playable,true);
 assert.deepEqual(byKey['reject-blue'].missing,[]);
 assert.equal(byKey['reject-blue'].registeredKinds,13);
 assert.deepEqual(validateUniversalDeck(pack,designatedPlayableCounts(byKey['reject-blue'])),[]);
 assert.equal(byKey['white-sword'].playable,true);
 assert.deepEqual(byKey['white-sword'].missing,[]);
 assert.equal(byKey['white-sword'].registeredKinds,13);
 assert.deepEqual(validateUniversalDeck(pack,designatedPlayableCounts(byKey['white-sword'])),[]);
 assert.equal(byKey.renruki.playable,true);
 assert.deepEqual(byKey.renruki.missing,[]);
 assert.equal(byKey.renruki.registeredKinds,13);
 assert.equal(byKey.renruki.entries[0].source,'UA08BT/BLC-1-039');
 assert.equal(byKey.renruki.entries[0].sourcePinned,true);
 assert.deepEqual(validateUniversalDeck(pack,designatedPlayableCounts(byKey.renruki)),[]);
 const page=readFileSync(new URL('../dist/universal-v2-preview.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.ok(page.includes('id="designated-decks"'));
 assert.match(script,/不可完整對局/);
 assert.match(script,/designatedReady/);
 assert.equal(script.includes("decks['reject-blue']"),false);
});
test('BLC-3-008 reduces hand energy by 1, ignores BP reductions, and gains 1000 only on its turn',()=>{
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=fresh();
 const ken=sit(take(s,0,'BLC-3-008'));
 const foe=sit(take(s,1,'BLC-4-070'));
 s.players[0].front[0]=ken;s.players[1].front[0]=foe;
 ken.buffs=[{bp:-1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,ken),4000);
 const plain=sit(take(s,0,'BLC-1-083'));
 s.players[0].front[1]=plain;plain.buffs=[{bp:-1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,plain),0);
 s.active=1;
 assert.equal(universalBp(pack,s,ken),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
 s.active=0;s.players[1].deck.push(foe);s.players[1].front[0]=null;
 assert.equal(universalBp(pack,s,ken),3000);
 s.players[0].front[0]=null;
 s.players[0].energy[0]=sit(take(s,0,'BLC-1-067'));
 s.players[0].energy[1]=sit(take(s,0,'BLC-1-067'));
 s.players[0].hand.push(ken);
 s=phase(s,'main');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['BLC-3-008']),3);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===ken.uid),false);
 s.players[0].energy[2]=sit(take(s,0,'BLC-1-067'));
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===ken.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const before=uids(s);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0].front[0].uid,ken.uid);
 assert.deepEqual(uids(s),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC-4-070 must block with a mandatory character and that battle removes Impact',()=>{
 let s=phase(fresh(1,2202),'attack');
 const must=sit(take(s,0,'BLC-4-070')),other=sit(take(s,0,'BLC-4-070')),
  vanilla=sit(take(s,0,'BLC-1-083')),attacker=sit(take(s,1,'BLC-1-009'));
 attacker.buffs=[{bp:3000,untilTurn:s.turn}];
 s.players[0].front[0]=must;s.players[0].front[1]=other;s.players[0].front[2]=vanilla;
 s.players[1].front[0]=attacker;
 const life=s.players[0].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock');
 assert.deepEqual(blocks.map(a=>a.uid).sort(),[must.uid,other.uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:must.uid},{actor:0});
 assert.equal(s.players[0].life.length,life);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===must.uid),true);
 let open=phase(fresh(1,2203),'attack');
 const rested=sit(take(open,0,'BLC-4-070'),false),plain=sit(take(open,0,'BLC-1-083')),
  hitter=sit(take(open,1,'BLC-1-009'));
 hitter.buffs=[{bp:3000,untilTurn:open.turn}];
 open.players[0].front[0]=rested;open.players[0].front[1]=plain;open.players[1].front[0]=hitter;
 open=dispatchUniversalAction(packs,open,{type:'attack',uid:hitter.uid},{actor:1});
 const choice=legalUniversalActions(packs,open).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.deepEqual(choice.sort(),[null,plain.uid].sort());
 open=dispatchUniversalAction(packs,open,{type:'chooseBlock',uid:plain.uid},{actor:0});
 assert.equal(open.pending?.kind,'life-trigger');
 assert.equal(open.players[0].life.length,life-1);
});
test('BLC-2-073 raises the retire cap for Kenpachi on the field or Yachiru outside',()=>{
 let s=fresh();
 for(let i=0;i<4;i++)s.players[0].energy[i]=sit(take(s,0,'BLC-1-067'));
 const event=take(s,0,'BLC-2-073'),low=sit(take(s,1,'BLC-1-067')),high=sit(take(s,1,'BLC-4-070'));
 s.players[0].hand.push(event);s.players[1].front[0]=low;s.players[1].front[1]=high;
 s=phase(s,'main');
 let q=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===event.uid&&a.type==='event'));
 assert.equal(q.pending?.kind,'effect-retire-bp');
 assert.deepEqual(q.pending.choices,[low.uid]);
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseRetireBp',uid:high.uid}),/not currently legal/);
 const yachiru=take(s,0,'BLC-1-076');
 s.players[0].outside.push(yachiru);
 q=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===event.uid&&a.type==='event'));
 assert.ok(q.pending.choices.includes(high.uid));
 s.players[1].front.find(c=>c.uid===high.uid).buffs=[{bp:2000,untilTurn:s.turn}];
 q=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===event.uid&&a.type==='event'));
 assert.equal(q.pending.choices.includes(high.uid),false);
 assert.equal(q.pending.choices.includes(low.uid),true);
 let named=fresh(0,2204);
 for(let i=0;i<4;i++)named.players[0].energy[i]=sit(take(named,0,'BLC-1-067'));
 const again=take(named,0,'BLC-2-073'),ken=sit(take(named,0,'BLC-2-066')),
  tall=sit(take(named,1,'BLC-4-070'));
 named.players[0].hand.push(again);named.players[0].front[0]=ken;named.players[1].front[0]=tall;
 named=phase(named,'main');
 named=dispatchUniversalAction(packs,named,legalUniversalActions(packs,named).find(a=>a.uid===again.uid&&a.type==='event'));
 assert.deepEqual(named.pending.choices,[tall.uid]);
 const before=uids(named);
 named=dispatchUniversalAction(packs,named,{type:'chooseRetireBp',uid:tall.uid});
 assert.equal(named.players[1].outside.some(c=>c.uid===tall.uid),true);
 assert.deepEqual(uids(named),before);
});
test('BLC-2-069 discards only with six other Squad cards, then recovers one Hitsugaya',()=>{
 let s=fresh(0,2205);
 const squad=['BLC-1-067','BLC-1-072','BLC-2-066','BLC-1-076','BLC-4-070','BLC-2-068'];
 squad.forEach((id,i)=>{
  const card=sit(take(s,0,id));
  if(i<4)s.players[0].front[i]=card;else s.players[0].energy[i-4]=card;
 });
 const self=take(s,0,'BLC-2-069'),hitsugaya=take(s,0,'BLC-1-083'),pay=s.players[0].hand[0];
 s.players[0].hand.push(self);s.players[0].outside.push(hitsugaya);
 s=phase(s,'main');
 let q=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='energy'));
 assert.equal(q.pending?.kind,'effect-discard-gate');
 const skipped=dispatchUniversalAction(packs,q,{type:'chooseDiscardGate',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===hitsugaya.uid),true);
 q=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='energy'));
 q=dispatchUniversalAction(packs,q,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(q.pending?.kind,'effect-recover-outside');
 assert.deepEqual(q.pending.choices,[hitsugaya.uid]);
 const before=uids(q);
 q=dispatchUniversalAction(packs,q,{type:'chooseOutsideRecovery',uid:hitsugaya.uid});
 assert.equal(q.players[0].hand.some(c=>c.uid===hitsugaya.uid),true);
 assert.equal(q.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.deepEqual(uids(q),before);
 s.players[0].deck.push(s.players[0].energy[1]);s.players[0].energy[1]=null;
 const quiet=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='energy'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===hitsugaya.uid),true);
});
test('BLC-3-001 readies after the first block and gains 1000 only on its own turn after a hand leaves',()=>{
 let s=phase(fresh(1,2206),'attack');
 const ichigo=sit(take(s,0,'BLC-3-001')),a=sit(take(s,1,'BLC-2-068')),b=sit(take(s,1,'BLC-2-068'));
 s.players[0].front[0]=ichigo;s.players[1].front[0]=a;s.players[1].front[1]=b;
 assert.equal(universalBp(pack,s,ichigo),3000);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:a.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:ichigo.uid},{actor:0});
 assert.equal(s.players[0].front[0].uid,ichigo.uid);
 assert.equal(s.players[0].front[0].ready,true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:b.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:ichigo.uid},{actor:0});
 assert.equal(s.players[0].front[0].ready,false);
 let own=fresh(0,2207);
 const body=sit(take(own,0,'BLC-3-001')),entry=take(own,0,'BLC-2-016');
 own.players[0].front[0]=body;own.players[0].hand.push(entry);
 own=phase(own,'main');
 assert.equal(universalBp(pack,own,body),3000);
 let paid=dispatchUniversalAction(packs,own,legalUniversalActions(packs,own).find(a=>a.type==='play'&&a.uid===entry.uid&&a.line==='energy'&&a.slot===0));
 assert.equal(paid.pending?.kind,'effect-discard');
 const discarded=paid.players[0].hand.find(c=>c.uid!==entry.uid);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseDiscard',uid:discarded.uid});
 assert.equal(universalBp(pack,paid,body),4000);
 paid.active=1;
 assert.equal(universalBp(pack,paid,body),3000);
 assert.equal(assertUniversalMatch(packs,paid),true);
});
