import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalAttackDamage,universalCardEnergy,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages checked 2026-10-22:
// UA08BT/BLC-1-009 黄2 / AP1 / BP3000 / 星十字騎士団 / 発生黄1 / インパクト（1） / no trigger.
//   The imported trait token is 星十字騎士團, the same token already used by
//   registered 星十字 cards. The page has no separate FAQ.
// UA08BT/BLC-1-074 緑3 / AP1 / BP2500 / 護廷十三隊 / 発生は緑が二つ / ダメージ（2） / ドロー.
//   Parenthetical: direct attack damage becomes 2. A blocked attack does not
//   deal that life damage. No separate FAQ on the page.
const bleach=registeredV2TitlePack('bleach');
function deck(required){
 const color=bleach.cards[required[0]].color;
 const rest=Object.values(bleach.cards).filter(c=>c.type==='character'&&c.color===color&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const decks={
 'BLC-1-009':deck(['BLC-1-009','BLC-1-008','BLC-1-016']),
 'BLC-1-074':deck(['BLC-1-074','BLC-1-067','BLC-1-069'])
};
const packs=[bleach,bleach];
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function attackPhase(s){
 for(let n=0;n<4&&s.phase!=='attack';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'attack');
 return s;
}
function live(s,p){
 const card=s.players[p].deck.find(c=>['draw','get'].includes(bleach.cards[c.cardId].trigger));
 assert.ok(card);return take(s,p,card.cardId);
}

test('BLC-1-009 and BLC-1-074 keep the official keyword and no extra effect',()=>{
 const impact=bleach.cards['BLC-1-009'],damage=bleach.cards['BLC-1-074'];
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-009'));
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-074'));
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-009').nameJa,'ドリスコール・ベルチ');
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-074').nameJa,'京楽 春水');
 assert.deepEqual([impact.color,impact.energy,impact.ap,impact.bp,impact.gen,impact.trigger,impact.printedImpact,impact.printedAttackDamage,impact.traits],
  ['yellow',2,1,3000,1,null,1,1,['星十字騎士團']]);
 assert.deepEqual([damage.color,damage.energy,damage.ap,damage.bp,damage.gen,damage.trigger,damage.printedImpact,damage.printedAttackDamage,damage.traits],
  ['green',3,1,2500,2,'draw',0,2,['護廷十三隊']]);
 assert.deepEqual(impact.effects,{});
 assert.deepEqual(damage.effects,{});
 for(const id of ['BLC-1-009','BLC-1-074']){
  const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id===id);
  assert.throws(()=>checkedBleachAddonDefinition({...profile,bp:profile.bp+500}),/printed card changed/);
 }
});

test('BLC-1-009 impact is one life on a battle win, one when unblocked, and zero against BLC-1-008',()=>{
 let s=newUniversalMatch(packs,{decks:[decks['BLC-1-009'],decks['BLC-1-009']],seed:1009,first:0});
 const attacker=take(s,0,'BLC-1-009');attacker.ready=true;s.players[0].front[0]=attacker;
 const blocker=take(s,1,'BLC-1-016');blocker.ready=true;s.players[1].front[0]=blocker;
 const first=live(s,1);s.players[1].deck.push(...s.players[1].life.splice(0));s.players[1].life.unshift(first,live(s,1));
 s=attackPhase(s);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.pending?.uid,first.uid);
 assert.equal(s.players[1].life.length,lives-1);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.players[1].life.length,lives-1);
 let open=newUniversalMatch(packs,{decks:[decks['BLC-1-009'],decks['BLC-1-009']],seed:1010,first:0});
 const direct=take(open,0,'BLC-1-009');direct.ready=true;open.players[0].front[0]=direct;
 const a=live(open,1),b=live(open,1);
 open.players[1].deck.push(...open.players[1].life.splice(0));open.players[1].life.unshift(a,b);
 open=attackPhase(open);
 const before=open.players[1].life.length;
 open=dispatchUniversalAction(packs,open,{type:'attack',uid:direct.uid});
 open=dispatchUniversalAction(packs,open,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(open.pending?.uid,a.uid);
 assert.equal(open.players[1].life[0].uid,b.uid);
 open=dispatchUniversalAction(packs,open,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(open.pending,null);
 assert.equal(open.players[1].life.length,before-1);
 let nulled=newUniversalMatch(packs,{decks:[decks['BLC-1-009'],decks['BLC-1-009']],seed:1011,first:0});
 const winner=take(nulled,0,'BLC-1-009');winner.ready=true;nulled.players[0].front[0]=winner;
 const immune=take(nulled,1,'BLC-1-008');immune.ready=true;nulled.players[1].front[0]=immune;
 nulled=attackPhase(nulled);
 const stayed=nulled.players[1].life.length;
 nulled=dispatchUniversalAction(packs,nulled,{type:'attack',uid:winner.uid});
 nulled=dispatchUniversalAction(packs,nulled,{type:'chooseBlock',uid:immune.uid},{actor:1});
 assert.ok(nulled.players[1].outside.some(c=>c.uid===immune.uid));
 assert.equal(nulled.pending,null);
 assert.equal(nulled.players[1].life.length,stayed);
 assert.equal(assertUniversalMatch(packs,nulled),true);
});

test('BLC-1-074 direct attack simultaneously checks two LIFE; block deals none',()=>{
 let s=newUniversalMatch(packs,{decks:[decks['BLC-1-074'],decks['BLC-1-074']],seed:1074,first:0});
 const attacker=take(s,0,'BLC-1-074');
 s.players[0].energy[0]=attacker;
 assert.equal(universalCardEnergy(packs,s,0,attacker),2);
 s.players[0].energy[0]=null;attacker.ready=true;s.players[0].front[0]=attacker;
 const first=live(s,1),second=live(s,1);
 s.players[1].deck.push(...s.players[1].life.splice(0));s.players[1].life.unshift(first,second);
 s=attackPhase(s);
 assert.equal(universalAttackDamage(packs,s,attacker),2);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.deepEqual(s.publicReveals.map(e=>e.uid),[first.uid,second.uid]);
 assert.deepEqual(s.players[1].lifeRevealed.map(c=>c.uid),[first.uid,second.uid]);
 assert.equal(s.players[1].life.length,lives-2);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:first.uid},{actor:1});
 if(s.pending?.kind==='life-trigger'){
  const action=legalUniversalActions(packs,s).find(a=>a.mode==='draw'||a.mode==='get'||a.mode==='skip');
  s=dispatchUniversalAction(packs,s,action,{actor:1});
 }
 if(s.pending?.kind==='life-trigger')
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.publicReveals.length,2);
 let blocked=newUniversalMatch(packs,{decks:[decks['BLC-1-074'],decks['BLC-1-074']],seed:1075,first:0});
 const hitter=take(blocked,0,'BLC-1-074');hitter.ready=true;blocked.players[0].front[0]=hitter;
 const wall=take(blocked,1,'BLC-1-069');wall.ready=true;blocked.players[1].front[0]=wall;
 blocked=attackPhase(blocked);
 const stayed=blocked.players[1].life.length;
 blocked=dispatchUniversalAction(packs,blocked,{type:'attack',uid:hitter.uid});
 blocked=dispatchUniversalAction(packs,blocked,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[1].life.length,stayed);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

test('BLC-1-009 and BLC-1-074 plays spend printed energy and AP',()=>{
 let pay=newUniversalMatch(packs,{decks:[decks['BLC-1-009'],decks['BLC-1-009']],seed:2010,first:0});
 const source=take(pay,0,'BLC-1-009');pay.players[0].hand.push(source);
 for(let i=0;i<2;i++){const g=take(pay,0,'BLC-1-016');g.ready=true;pay.players[0].energy[i]=g;}
 for(let n=0;n<3&&pay.phase!=='main';n++)pay=dispatchUniversalAction(packs,pay,{type:'next'});
 assert.equal(pay.phase,'main');
 const legal=legalUniversalActions(packs,pay).some(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.equal(legal,true);
 pay.players[0].outside.push(pay.players[0].energy[1]);pay.players[0].energy[1]=null;
 assert.equal(legalUniversalActions(packs,pay).some(a=>a.type==='play'&&a.uid===source.uid),false);
 let green=newUniversalMatch(packs,{decks:[decks['BLC-1-074'],decks['BLC-1-074']],seed:2074,first:0});
 const shunsui=take(green,0,'BLC-1-074');green.players[0].hand.push(shunsui);
 for(let i=0;i<3;i++){const g=take(green,0,'BLC-1-069');g.ready=true;green.players[0].energy[i]=g;}
 for(let n=0;n<3&&green.phase!=='main';n++)green=dispatchUniversalAction(packs,green,{type:'next'});
 assert.ok(legalUniversalActions(packs,green).some(a=>a.type==='play'&&a.uid===shunsui.uid&&a.line==='front'));
 green.players[0].outside.push(green.players[0].energy[2]);green.players[0].energy[2]=null;
 assert.equal(legalUniversalActions(packs,green).some(a=>a.type==='play'&&a.uid===shunsui.uid),false);
 assert.equal(assertUniversalMatch(packs,green),true);
});
