import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. EX08BT/SAO-2-005 has no FAQ block.
// Generated energy alt is 黄 (gen 1). The impact sentence has no
// 自分のターン中 and is not an unconditional printed impact keyword.
// Four OTHER 整合騎士 are required. This card does not count itself.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const knight={kind:'ownTraitCount',turn:'any',min:4,zone:'field',excludeSelf:true,trait:'整合騎士'};

function deck(required){
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
const counts=deck(['SAO-2-005','SAO-2-006','SAO-1-008','SAO-2-008']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<6&&s.phase!==phase;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
const base={id:'LAB',name:'Lab',color:'yellow',type:'character',energy:0,ap:1,
 bp:1000,gen:1,implementation:'dsl',effects:{}};
const bonus={condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},impact:1};

test('SAO-2-005 keeps the official print and a conditional impact of exactly 1',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-005');
 assert.equal(source.effectJa,'自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。');
 assert.equal(source.gen,1);
 assert.equal(source.bp,3000);
 assert.equal(source.trigger,null);
 assert.deepEqual(source.traits,['整合騎士']);
 const card=sao.cards['SAO-2-005'];
 assert.equal(card.name,'シェータ・シンセシス・トゥエルブ');
 assert.equal(card.printedImpact,0);
 assert.equal(card.gen,1);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition:knight,impact:1}]);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-005'));
 assert.throws(()=>createUniversalPack({id:'bad-impact',cards:[{...base,
  passiveBonuses:[{...bonus,impact:2}]}]}),/invalid passive bonus/);
 assert.throws(()=>createUniversalPack({id:'bad-stack',cards:[{...base,
  printedImpact:1,passiveBonuses:[bonus]}]}),/does not stack/);
 assert.throws(()=>createUniversalPack({id:'bad-under',cards:[{...base,
  raidName:'Z',conditionalUnderFaceDown:{bp:500,impact:1,leaveReplacementMinBp:1000},
  passiveBonuses:[bonus]}]}),/does not stack/);
});

test('four other knights grant impact on either turn and either line; three, self, and silence do not',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2005,first:0});
 s=toPhase(s,'main');
 const self=place(s,0,'SAO-2-005','front',0,true);
 place(s,0,'SAO-2-006','energy',0);
 place(s,0,'SAO-2-006','energy',1);
 place(s,0,'SAO-2-006','energy',2);
 assert.equal(universalImpact(packs,s,self),0);
 assert.equal(universalBp(packs,s,self),3000);
 place(s,0,'SAO-2-006','front',1);
 assert.equal(universalImpact(packs,s,self),1);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalImpact(packs,enemy,enemy.players[0].front[0]),1);
 const energyLine=structuredClone(s);
 const moved=energyLine.players[0].front[0];
 energyLine.players[0].front[0]=null;
 energyLine.players[0].energy[3]=moved;
 assert.equal(universalImpact(packs,energyLine,moved),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'attack',uid:'0-missing'}),/not currently legal/);
});

test('winning a battle deals one life only while the four other knights are present',()=>{
 let hit=newUniversalMatch(packs,{decks:[counts,counts],seed:2006,first:0});
 hit=toPhase(hit,'attack');
 const striker=place(hit,0,'SAO-2-005','front',0,true);
 place(hit,0,'SAO-2-006','front',1);
 place(hit,0,'SAO-2-006','energy',0);
 place(hit,0,'SAO-2-006','energy',1);
 place(hit,0,'SAO-2-006','energy',2);
 const wall=place(hit,1,'SAO-1-008','front',0,true);
 const revealed=take(hit,1,'SAO-2-008');
 hit.players[1].deck.push(hit.players[1].life.shift());
 hit.players[1].life.unshift(revealed);
 const lives=hit.players[1].life.length;
 assert.equal(universalImpact(packs,hit,striker),1);
 hit=dispatchUniversalAction(packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.ok(hit.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(hit.players[1].life.length,lives-1);
 assert.equal(hit.pending?.kind,'life-trigger');
 aiLegal(hit);
 hit=dispatchUniversalAction(packs,hit,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(hit.pending,null);
 assert.equal(countCards(hit.players[0]),50);
 assert.equal(countCards(hit.players[1]),50);
 assert.equal(assertUniversalMatch(packs,hit),true);

 let miss=newUniversalMatch(packs,{decks:[counts,counts],seed:2007,first:0});
 miss=toPhase(miss,'attack');
 const quiet=place(miss,0,'SAO-2-005','front',0,true);
 place(miss,0,'SAO-2-006','energy',0);
 place(miss,0,'SAO-2-006','energy',1);
 place(miss,0,'SAO-2-006','energy',2);
 const weak=place(miss,1,'SAO-1-008','front',0,true);
 const before=miss.players[1].life.length;
 assert.equal(universalImpact(packs,miss,quiet),0);
 miss=dispatchUniversalAction(packs,miss,{type:'attack',uid:quiet.uid});
 miss=dispatchUniversalAction(packs,miss,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(miss.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(miss.players[1].life.length,before);
 assert.equal(miss.pending,null);
 assert.equal(assertUniversalMatch(packs,miss),true);
});
