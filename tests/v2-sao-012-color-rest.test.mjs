import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';

// Official page UA15BT/SAO-1-012 checked 2026-10-22. No FAQ block.
// Body: alias 〈アリス〉, STEP, and own-turn BP+1000 while both 〈キリト〉 and
// 〈ユージオ〉 are on the own field. Generated energy alt is 黄黄, gen 2.
// COLOR trigger, separately from the body and from COLOR retirement/deploy:
// 相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。

const ID='SAO-1-012';
const body='このカードは〈アリス〉としても扱う。\n【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【自分のターン中】自分の場に〈キリト〉と〈ユージオ〉がある場合、このキャラはBP+1000。';
const colorText='相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');

function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function occupy(s,p,id,line,slot,{ready=true}={}){
 const card=take(s,p,id);
 card.ready=ready;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toPhase(packs,s,phase){
 while(s.phase!==phase)s=dispatchUniversalAction(packs,s,{type:'next'});
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}

test('SAO-1-012 registers alias, STEP, both-name BP, and a distinct COLOR rest',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id===ID);
 assert.equal(source.effectJa,body);
 assert.equal(source.gen,2);
 assert.equal(source.bp,3000);
 assert.equal(source.bpPrinted,'3000+');
 assert.equal(source.trigger,'color');
 assert.equal(colorText,'相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。');
 const card=sao.cards[ID];
 assert.equal(card.name,'アリス・シンセシス・サーティ');
 assert.deepEqual(card.nameAliases,['アリス']);
 assert.equal(cardHasName(card,'アリス',false),true);
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownFieldHasAllNames',turn:'own',
  zone:'field',excludeSelf:true,names:['キリト','ユージオ']},bp:1000}]);
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.notEqual(card.triggerEffect.op,'retireOppFrontUnderBp');
 const base={id:'QA-COLOR',name:'QA',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{},trigger:'color',nameAliases:['別名']};
 assert.doesNotThrow(()=>createUniversalPack({id:'color-rest-ok',cards:[
  {...base,triggerEffect:{op:'restOppFrontSkipNextActive'}}]}));
 assert.throws(()=>createUniversalPack({id:'color-rest-bad',cards:[
  {...base,triggerEffect:{op:'restOppFrontSkipNextActive',bp:1000}}]}),/COLOR requires/);
});

test('both printed names raise BP only on the owner turn, including one dual-name card',()=>{
 const counts=deck(sao,[ID,'SAO-1-051','SAO-1-004','SAO-2-003'],'yellow');
 const packs=[sao,sao];
 const s=newUniversalMatch(packs,{decks:[counts,counts],seed:1201,first:0});
 const alice=occupy(s,0,ID,'front',0);
 assert.equal(universalBp(packs,s,alice),3000);
 const kirito=occupy(s,0,'SAO-1-051','energy',0);
 assert.equal(universalBp(packs,s,alice),3000);
 const eugeo=occupy(s,0,'SAO-1-004','front',1);
 assert.equal(universalBp(packs,s,alice),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,alice),3000);
 s.active=0;
 s.players[0].energy[0]=null;
 s.players[0].outside.push(kirito);
 assert.equal(universalBp(packs,s,alice),3000);
 occupy(s,1,'SAO-1-051','front',0);
 occupy(s,1,'SAO-1-004','energy',0);
 assert.equal(universalBp(packs,s,alice),3000);
 const both=occupy(s,0,'SAO-2-003','energy',0);
 assert.equal(universalBp(packs,s,alice),4000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:both.uid,
  targetUid:both.uid,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
 assert.equal(universalBp(packs,s,alice),3000);
 assert.equal(eugeo.cardId,'SAO-1-004');
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('COLOR rests one enemy front and skips its next ACTIVE, not a retirement',()=>{
 const counts=deck(sao,[ID,'SAO-1-008','SAO-1-004','SAO-1-051'],'yellow');
 const foreign=deck(mst,['MST-1-016','MST-1-001'],'blue');
 const packs=[mst,sao];
 let s=newUniversalMatch(packs,{decks:[foreign,counts],seed:1202,first:0});
 const attacker=occupy(s,0,'MST-1-016','front',0);
 const energy=occupy(s,0,'MST-1-001','energy',0,{ready:true});
 const ally=occupy(s,1,'SAO-1-004','front',0,{ready:false});
 const life=s.players[1].life[0];
 const trigger=take(s,1,ID);
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(life);
 s=toPhase(packs,s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'color');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.mode==='skip'));
 assert.ok(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid));
 assert.equal(choices.some(a=>a.mode==='colorRetire'),false);
 assert.equal(choices.some(a=>a.mode==='color'),false);
 assert.equal(choices.some(a=>a.uid===energy.uid),false);
 assert.equal(choices.some(a=>a.uid===ally.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRestSkip',uid:energy.uid},{actor:1}),
  /not currently legal/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.equal(ai.mode,'colorRestSkip');
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const empty=structuredClone(s);
 const gone=empty.players[0].front[0];
 empty.players[0].front[0]=null;
 empty.players[0].outside.push(gone);
 assert.deepEqual(legalUniversalActions(packs,empty).map(a=>a.mode),['skip']);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid},{actor:1});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].uid,attacker.uid);
 assert.deepEqual(universalPublicView(packs,s,1).players[0].front[0].restrictions,[{kind:'skipNextActive',until:null}]);
 assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));
 assert.equal(s.players[1].front.some(c=>c?.cardId===ID),false);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.players[0].front[0].ready,false);
 assert.deepEqual(universalPublicView(packs,s,1).players[0].front[0].restrictions,[]);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'},{actor:s.active});
 assert.equal(s.active,0);
 assert.equal(s.players[0].front[0].uid,attacker.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('STEP moves SAO-1-012 once, and three yellow energy makes the printed cost legal',()=>{
 const counts=deck(sao,[ID,'SAO-1-008','SAO-1-004'],'yellow');
 const foreign=deck(mst,['MST-1-016'],'blue');
 const packs=[sao,mst];
 let s=toPhase(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1203,first:0}),'move');
 const alice=occupy(s,0,ID,'front',0);
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===alice.uid&&a.slot===0);
 s=dispatchUniversalAction(packs,s,step);
 assert.equal(s.players[0].energy[0].uid,alice.uid);
 assert.equal(s.players[0].front[0],null);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===alice.uid&&a.type==='step'),false);
 s=toPhase(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1204,first:0}),'main');
 const payer=hold(s,0,ID);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid),false);
 assert.equal(universalEnergyByColor(packs,s,0).yellow||0,0);
 for(const slot of [0,1,2])occupy(s,0,'SAO-1-008','energy',slot);
 assert.equal(universalEnergyByColor(packs,s,0).yellow,3);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid&&a.line==='front'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
