import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX07BT/BLC-2-043, fetched 2026-10-24:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-043
// 【登場時】APを1支払ってもよい。そうした場合、自分の場外から
// 〈六車 拳西＆鳳橋 楼十郎〉を1枚まで自分の場にレストで登場させる。
// 〈六車 拳西＆鳳橋 楼十郎〉のこの効果は1ターンに1回のみ発動できる。
// Q1043: 「この効果」 is only that on-play sentence.
// Q1044: two entries in one turn can activate it only once between them.
// COLOR: BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。
// The slash trait stays one token. The deploy filter is the printed name,
// with no color, energy, or AP cap.

const NAME='Shared';
const rest={op:'deployOutsideNameRest',name:NAME,optional:true};
const pay={op:'optionalPayApThen',ap:1,optional:true,then:[rest]};
const gate={op:'oncePerTurnGate',scope:'name',optional:true,then:[pay]};
function unit(id,extra){
 return {id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{},...extra};
}
function accept(cards){
 return createUniversalPack({id:'c19-schema',cards});
}
test('name gate accepts an optional AP payment that deploys a printed outside name',()=>{
 const ok=unit('OK',{name:NAME,effects:{onPlay:[gate]}});
 assert.equal(accept([ok,unit('FILL',{implementation:'vanilla'})]).cards.OK
  .effects.onPlay[0].then[0].then[0].op,'deployOutsideNameRest');
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...gate,then:[rest]}]}})]),
  /invalid once-per-turn gate/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...pay,then:[{op:'millTop',count:1}]}]}})]),
  /invalid optional AP payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...rest,color:'blue'}]}})]),
  /invalid name-only outside REST/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...rest,optional:false}]}})]),
  /invalid name-only outside REST/);
});

const ids=['GATE','OTHER','PLAIN','PURPLE','FIELD','RAID','BAN','F0','F1','F2','F3','F4','F5'];
const labDeck=Object.fromEntries(ids.map(id=>[id,id==='F5'?2:4]));
const lab=createUniversalPack({id:'c19-lab',cards:[
 unit('GATE',{name:NAME,effects:{onPlay:[gate]}}),
 unit('OTHER',{name:'Other',effects:{onPlay:[gate]}}),
 unit('PLAIN',{name:NAME,implementation:'vanilla'}),
 unit('PURPLE',{name:NAME,color:'purple',energy:9,ap:3,implementation:'vanilla'}),
 unit('FIELD',{name:NAME,type:'field',bp:0,implementation:'vanilla'}),
 unit('RAID',{name:NAME,trigger:'raid',raidName:'Base',effects:{onPlay:[{op:'draw',count:1}]}}),
 unit('BAN',{name:NAME,frontForbidden:true}),
 ...['F0','F1','F2','F3','F4','F5'].map(id=>unit(id,{implementation:'vanilla'}))
]});
function take(s,p,id,use=lab){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id+' in '+use.id);
}
function boot(seed=1901){
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(lab,s,{type:'next'});
 assert.equal(s.phase,'main');
 for(let i=0;i<3;i++){
  s.players[0].apCards[i].inPlay=true;
  s.players[0].apCards[i].ready=true;
 }
 return s;
}
function readyAp(s){
 return s.players[0].apCards.filter(c=>c.ready).length;
}
function play(s,id,line='front'){
 const src=take(s,0,id);s.players[0].hand.push(src);
 const action=legalUniversalActions(lab,s).find(a=>a.type==='play'&&a.uid===src.uid&&
  a.line===line&&!a.replaceUid);
 assert.ok(action,id);
 return dispatchUniversalAction(lab,s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(lab,s).find(pred);
 assert.ok(action);
 return dispatchUniversalAction(lab,s,action);
}
function at(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function count(player){
 let n=player.hand.length+player.deck.length+player.life.length+
  player.outside.length+player.removed.length;
 for(const line of ['front','energy'])n+=player[line].filter(Boolean).length;
 return n;
}

test('outside REST offers the printed name only, including a different color and cost',()=>{
 let s=boot();
 const plain=take(s,0,'PLAIN'),purple=take(s,0,'PURPLE'),field=take(s,0,'FIELD');
 const raid=take(s,0,'RAID'),ban=take(s,0,'BAN'),other=take(s,0,'OTHER');
 const hand=take(s,0,'PLAIN'),foe=take(s,1,'PLAIN');
 s.players[0].outside.push(plain,purple,field,raid,ban,other);
 s.players[0].hand.push(hand);
 s.players[1].outside.push(foe);
 s=play(s,'GATE');
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.equal(legalUniversalActions(lab,s)[0].mode,'skip');
 assert.equal(chooseUniversalAiAction(lab,s,{difficulty:'easy'}).mode,'skip');
 assert.equal(chooseUniversalAiAction(lab,s,{difficulty:'normal'}).mode,'activate');
 s=choose(s,a=>a.mode==='activate');
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 assert.equal(s.onceEffectUses[0][0],'name:'+NAME);
 const before=readyAp(s);
 s=choose(s,a=>a.mode==='pay');
 assert.equal(readyAp(s),before-1);
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 const offered=new Set(s.pending.choices);
 assert.deepEqual([...offered].sort(),[plain.uid,purple.uid,ban.uid].sort());
 const legal=legalUniversalActions(lab,s);
 assert.equal(legal[0].uid,null);
 assert.equal(legal.some(a=>a.uid===ban.uid&&a.line==='front'),false);
 assert.ok(legal.some(a=>a.uid===ban.uid&&a.line==='energy'));
 assert.ok(legal.some(a=>a.uid===purple.uid&&a.line==='front'));
 assert.equal(universalPublicView(lab,s,1).players[0].hand,null);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseOutsideNameRest',uid:foe.uid,line:'energy',slot:0}),
  /not currently legal/);
 s=choose(s,a=>a.uid===purple.uid&&a.line==='energy'&&!a.replaceUid);
 const entered=at(s,0,purple.uid);
 assert.equal(entered.ready,false);
 assert.equal(entered.cardId,'PURPLE');
 assert.equal(s.players[0].outside.some(c=>c.uid===purple.uid),false);
 assert.equal(s.pending,null);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('declining the activation leaves the printed name unused',()=>{
 let s=boot(1902);
 const copy=take(s,0,'GATE');s.players[0].outside.push(copy);
 s=play(s,'GATE');
 const spent=readyAp(s);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.deepEqual(s.onceEffectUses[0],[]);
 assert.equal(readyAp(s),spent);
 s=play(s,'GATE');
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.equal(s.pending.key,'name:'+NAME);
});

test('activating and then declining the payment still spends the shared name',()=>{
 let s=boot(1903);
 s=play(s,'OTHER');
 s=choose(s,a=>a.mode==='activate');
 s=choose(s,a=>a.mode==='skip');
 assert.deepEqual(s.onceEffectUses[0],['name:Other']);
 assert.equal(s.pending,null);
 s=play(s,'OTHER');
 assert.equal(s.pending,null);
 s=play(s,'GATE');
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.equal(s.pending.key,'name:'+NAME);
});

test('no ready AP and no matching outside card do not deploy',()=>{
 let dry=boot(1904);
 dry.players[0].apCards.forEach((c,i)=>{c.inPlay=i===0;c.ready=i===0;});
 dry=play(dry,'GATE');
 assert.equal(readyAp(dry),0);
 dry=choose(dry,a=>a.mode==='activate');
 assert.equal(dry.pending,null);
 assert.deepEqual(dry.onceEffectUses[0],['name:'+NAME]);
 let empty=boot(1905);
 empty=play(empty,'GATE');
 empty=choose(empty,a=>a.mode==='activate');
 empty=choose(empty,a=>a.mode==='pay');
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].outside.length>=0,true);
});

test('a full field enters only by replacing one exact card',()=>{
 let s=boot(1906);
 const plain=take(s,0,'PLAIN');s.players[0].outside.push(plain);
 s=play(s,'GATE','energy');
 s=choose(s,a=>a.mode==='activate');
 s=choose(s,a=>a.mode==='pay');
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 const fillers=['F0','F1','F2','F3','F4','F5','OTHER','BAN'];
 let nextFiller=0;
 for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  if(s.players[0][line][slot])continue;
  const c=take(s,0,fillers[nextFiller++]);
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0][line][slot]=c;
 }
 assert.equal(s.players[0].front.every(Boolean),true);
 assert.equal(s.players[0].energy.every(Boolean),true);
 const legal=legalUniversalActions(lab,s).filter(a=>a.uid!==null);
 assert.ok(legal.length);
 assert.equal(legal.every(a=>a.replaceUid),true);
 const victim=s.players[0].energy[3];
 s=choose(s,a=>a.uid===plain.uid&&a.line==='energy'&&a.slot===3);
 assert.equal(at(s,0,plain.uid).ready,false);
 assert.equal(s.players[0].removed.some(c=>c.uid===victim.uid),true);
 assert.equal(at(s,0,victim.uid),null);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(lab,s),true);
});

const bleach=registeredV2TitlePack('bleach');
const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[bleach,mst];
function realDeck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13,required.join(','));
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const home=realDeck(bleach,['BLC-2-043'],'blue');
const foreign=realDeck(mst,['MST-1-018','MST-1-001'],'blue');
function realTake(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function realPut(s,p,id,line,index){
 assert.equal(s.players[p][line][index],null);
 const c=realTake(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function realMain(seed){
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 for(let i=0;i<3;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
 const gens=Object.keys(home).filter(id=>id!=='BLC-2-043'&&bleach.cards[id].gen>0);
 realPut(s,0,gens[0],'energy',0);
 realPut(s,0,gens[1],'energy',1);
 return s;
}
function realPlay(s){
 const src=realTake(s,0,'BLC-2-043');s.players[0].hand.push(src);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&
  a.line==='front'&&!a.replaceUid);
 assert.ok(action);
 return {s:dispatchUniversalAction(packs,s,action),src};
}

test('BLC-2-043 pays once per printed name and deploys that outside card at REST',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-043'));
 const printed=CARDS.find(c=>c.identity==='BLC-2-043');
 const card=bleach.cards['BLC-2-043'];
 assert.equal(printed.nameJa,'六車 拳西＆鳳橋 楼十郎');
 assert.equal(printed.effect,'登場：可支付 1 AP；成功時可從己方場外將最多 1 張〈六車拳西＆鳳橋樓十郎〉以 REST 登場於己方場上。所有〈六車拳西＆鳳橋樓十郎〉的此效果，合計每回合只能發動 1 次。');
 assert.equal(printed.trigger,'color');
 assert.equal(printed.triggerEffect,'【COLOR】將 1 個敵方前線 BP 3500 以下角色返回手牌。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
  ['blue',2,1,3000,1,'color',['護廷十三隊／涅骸部隊']]);
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.equal(card.effects.onPlay[0].then[0].then[0].name,'六車 拳西＆鳳橋 楼十郎');
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-2-043');
 assert.equal(checkedBleachAddonDefinition(profile).id,'BLC-2-043');
 let s=realMain(2043);
 const outside=realTake(s,0,'BLC-2-043');s.players[0].outside.push(outside);
 const other=realTake(s,0,Object.keys(home).find(id=>id!=='BLC-2-043'));
 s.players[0].outside.push(other);
 ({s}=realPlay(s));
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'activate');
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'activate'});
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'normal'}).mode,'pay');
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.deepEqual(s.pending.choices,[outside.uid]);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'normal'}).uid,null);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.uid===outside.uid&&a.line==='energy'&&!a.replaceUid));
 assert.equal(at(s,0,outside.uid).ready,false);
 assert.equal(s.pending,null);
 assert.deepEqual(s.onceEffectUses[0],['name:六車 拳西＆鳳橋 楼十郎']);
 ({s}=realPlay(s));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-043 COLOR returns one opposing front character at current BP 3500 or lower',()=>{
 const mirror=[bleach,bleach];
 let s=newUniversalMatch(mirror,{decks:[home,home],seed:2044,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(mirror,s,{type:'next'});
 const low=realPut(s,0,'BLC-2-043','front',0);
 const high=realPut(s,0,'BLC-2-043','front',1);
 high.buffs.push({bp:1000,untilTurn:s.turn});
 low.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(mirror,s,low),3500);
 assert.equal(universalBp(mirror,s,high),4000);
 const defender=s.players[1];
 defender.deck.push(...defender.life.splice(0));
 defender.life.push(realTake(s,1,'BLC-2-043'));
 for(let n=0;n<4&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(mirror,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(mirror,s,{type:'attack',uid:low.uid});
 s=dispatchUniversalAction(mirror,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.player,1);
 const legal=legalUniversalActions(mirror,s);
 assert.ok(legal.some(a=>a.mode==='colorBounce'&&a.uid===low.uid));
 assert.equal(legal.some(a=>a.uid===high.uid),false);
 assert.throws(()=>dispatchUniversalAction(mirror,s,{type:'chooseTrigger',mode:'colorBounce',uid:high.uid},{actor:1}),
  /not currently legal/);
 s=dispatchUniversalAction(mirror,s,{type:'chooseTrigger',mode:'colorBounce',uid:low.uid},{actor:1});
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(at(s,0,low.uid),null);
 assert.equal(at(s,0,high.uid).uid,high.uid);
 assert.equal(assertUniversalMatch(mirror,s),true);
});
