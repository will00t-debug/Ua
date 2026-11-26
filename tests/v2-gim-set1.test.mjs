// Gakuen Idolmaster set 1 lands through the shared V2 pack. The catalog stays
// unverified. A print enters only when its Japanese text matches a shared op.
// Raid-frame cards stay out until every framed keyword is listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gimCatalog,GIM_BOOSTER_RARITIES,GIM_RAID_FRAME_NUMBERS} from '../dist/gim/catalog.mjs';
import {gimDisplayImage} from '../dist/gim/art.mjs';
import {gimSharedProgram} from '../dist/universal-v2/gim/programs.mjs';
import {GIM_STAGING_IDS,createGimStagingPack} from '../dist/universal-v2/gim-staging-pack.mjs';
import {createGimBattlePack,gimPracticeDeck,officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

const READY=[
 '001','003','005','007','012','013','014','015','017','018','021','022','023','025','026',
 '030','031','032','034','038','041','042','043','045','046','047','049','050','052','055',
 '056','058','059','060','061','062','064','065','066','067','069','070','073','076','079'
].map(n=>'GIM-1-'+n);
const pack=createGimStagingPack();

function id(n){return 'GIM-1-'+n;}
function deckOf(extra={}){
 const counts={...extra};
 let total=Object.values(counts).reduce((n,v)=>n+v,0);
 const caps={final:0,color:0,special:0};
 for(const [cardId,num] of Object.entries(counts)){
  const trigger=pack.cards[cardId].trigger;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=num;
 }
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  const trigger=card.trigger;
  const capped=Object.prototype.hasOwnProperty.call(caps,trigger);
  if(capped&&caps[trigger]>=4)continue;
  const have=counts[card.id]||0;
  const room=Math.min(4-have,50-total,capped?4-caps[trigger]:4);
  if(room<=0)continue;
  counts[card.id]=have+room;
  total+=room;
  if(capped)caps[trigger]+=room;
 }
 return counts;
}
function take(s,player,cardId){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[player][zone];
  const index=pile.findIndex(c=>c.cardId===cardId);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+cardId);
}
function reach(counts,seed){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error('Unexpected pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
 }
 assert.equal(s.phase,'main');
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function seat(s,player,cardId,line,slot){
 const card=take(s,player,cardId);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.entryTurn=s.turn;
 s.players[player][line][slot]=card;
 return card;
}
function act(s,pred){
 const found=legalUniversalActions(pack,s).find(pred);
 assert.ok(found,JSON.stringify(s.pending||s.phase));
 return dispatchUniversalAction(pack,s,found);
}
function play(s,cardId,line){
 const card=take(s,0,cardId);
 s.players[0].hand.push(card);
 return act(s,a=>(a.type==='play'||a.type==='event')&&a.uid===card.uid&&(!line||a.line===line)&&
  (a.type!=='play'||s.players[0][a.line][a.slot]==null));
}
function finishOrder(s){
 while(s.pending?.kind==='effect-top-order'){
  const next=legalUniversalActions(pack,s)[0];
  s=dispatchUniversalAction(pack,s,next);
 }
 return s;
}

test('Gakuen Idolmaster catalog keeps the official 80 and does not claim battle support',()=>{
 const catalog=gimCatalog();
 assert.equal(catalog.deck.length,80);
 assert.equal(catalog.ap.length,19);
 assert.equal(catalog.ap.every(card=>card.deckLegal===false&&card.effectJa==='-'),true);
 const rarity={};
 for(const card of catalog.deck)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 assert.deepEqual(rarity,GIM_BOOSTER_RARITIES);
 const colors={};
 for(const card of catalog.deck)colors[card.color]=(colors[card.color]||0)+1;
 assert.deepEqual(colors,{blue:40,red:40});
 assert.deepEqual(catalog.deck.filter(card=>card.raidFrame).map(card=>Number(card.id.slice(6))),
  [...GIM_RAID_FRAME_NUMBERS]);
 assert.equal(catalog.deck.every(card=>card.battleReady===false&&card.playable===false&&
  card.effectImplemented===false&&card.confirmedTc===false),true);
 const mao=catalog.byId.get(id('001'));
 assert.equal(mao.energy,1);
 assert.equal(mao.gen,2);
 assert.match(gimDisplayImage(mao),/^https:\/\/rugiacreation\.com\/ua\/cardlist\/small\/UA27BT_GIM-1-001\.jpg/);
 const title=TITLES.find(row=>row.id==='gim');
 assert.equal(title.label,'學園偶像大師');
 assert.equal(title.cards.length,80);
 assert.equal(title.cards.every(card=>card.battleReady===false&&card.onlineImage),true);
});

test('only an exact shared print enters the battle pack',()=>{
 assert.deepEqual([...GIM_STAGING_IDS],READY);
 assert.equal(createGimBattlePack(),officialV2Pack('gim'));
 assert.equal(Object.keys(pack.cards).length,READY.length);
 for(const number of GIM_RAID_FRAME_NUMBERS)assert.equal(pack.cards[id(String(number).padStart(3,'0'))],undefined);
 for(const card of gimCatalog().deck){
  const program=gimSharedProgram(card);
  assert.equal(program.ready,READY.includes(card.id));
  if(!program.ready)assert.equal(program.reason,'pending-shared-program');
 }
 const practice=gimPracticeDeck();
 assert.equal(editorV2Status('gim',practice.counts,practice.pack).ready,true);
 const mixed={...practice.counts,[id('006')]:1,[id('041')]:3};
 assert.equal(editorV2Status('gim',mixed,practice.pack).ready,false);
});

test('energy 0 is playable and a lone low-energy character returns itself',()=>{
 const counts=deckOf({[id('041')]:4,[id('001')]:4,[id('014')]:4});
 let drawn=reach(counts,11);
 const zero=take(drawn,0,id('041'));
 drawn.players[0].hand.push(zero);
 drawn=act(drawn,a=>a.type==='play'&&a.uid===zero.uid&&a.line==='front');
 assert.equal(drawn.players[0].front.some(card=>card?.uid===zero.uid),true);
 assert.equal(drawn.pending,null);
 let bounced=reach(counts,12);
 seat(bounced,0,id('014'),'energy',0);
 const mao=take(bounced,0,id('001'));
 bounced.players[0].hand.push(mao);
 bounced=act(bounced,a=>a.type==='play'&&a.uid===mao.uid&&a.line==='front');
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[0].hand.some(card=>card.uid===mao.uid),true);
 assert.equal(bounced.players[0].front.some(card=>card?.uid===mao.uid),false);
 assert.equal(assertUniversalMatch(pack,bounced),true);
});

test('a name search shows every looked card and discards only after an add',()=>{
 const counts=deckOf({[id('018')]:4,[id('025')]:4,[id('014')]:4,[id('049')]:4});
 let s=reach(counts,21);
 seat(s,0,id('014'),'energy',0);
 const named=take(s,0,id('025'));
 const other=take(s,0,id('014'));
 const third=take(s,0,id('049'));
 s.players[0].deck.unshift(named,other,third);
 s=play(s,id('018'));
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 const own=universalPrivateChoices(pack,s,0);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.deepEqual(own.inspected.map(card=>card.uid),[named.uid,other.uid,third.uid]);
 assert.equal(JSON.stringify(universalPublicView(pack,s,1)).includes(other.uid),false);
 const legal=legalUniversalActions(pack,s).map(a=>a.uid);
 assert.deepEqual(legal.sort(),[null,named.uid].sort());
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:other.uid}));
 s=dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:named.uid});
 s=finishOrder(s);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].hand.some(card=>card.uid===named.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('the six-card character look keeps the cards that were not added',()=>{
 const counts=deckOf({[id('073')]:4,[id('025')]:4,[id('007')]:4,[id('034')]:4,[id('041')]:4,[id('014')]:4,[id('042')]:4,[id('045')]:4});
 let s=reach(counts,31);
 seat(s,0,id('041'),'energy',0);
 seat(s,0,id('041'),'energy',1);
 const low=take(s,0,id('025'));
 const high=take(s,0,id('007'));
 const event=take(s,0,id('034'));
 const filler=[take(s,0,id('014')),take(s,0,id('042')),take(s,0,id('045'))];
 s.players[0].deck.unshift(low,high,event,...filler);
 s=play(s,id('073'));
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 const own=universalPrivateChoices(pack,s,0);
 assert.equal(own.inspected.length,6);
 assert.deepEqual(own.inspected.map(card=>card.uid),[low.uid,high.uid,event.uid,...filler.map(card=>card.uid)]);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(pack,s,1)).includes(high.uid),false);
 const legal=legalUniversalActions(pack,s).map(a=>a.uid);
 assert.equal(legal.includes(null),true);
 assert.equal(legal.includes(low.uid),true);
 assert.equal(legal.includes(high.uid),false);
 assert.equal(legal.includes(event.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:high.uid}));
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:event.uid}));
 s=dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:low.uid});
 s=finishOrder(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(card=>card.uid===low.uid),true);
 assert.equal(s.players[0].deck.slice(-5).map(card=>card.uid).includes(high.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('both printed names reduce this card in hand, and the event reduces only its two names',()=>{
 const counts=deckOf({[id('062')]:4,[id('064')]:4,[id('069')]:4,[id('041')]:4,[id('079')]:4,[id('045')]:4,[id('050')]:4});
 let discounted=reach(counts,41);
 seat(discounted,0,id('041'),'energy',0);
 seat(discounted,0,id('041'),'energy',1);
 seat(discounted,0,id('041'),'energy',2);
 seat(discounted,0,id('064'),'front',0);
 seat(discounted,0,id('069'),'front',1);
 const temari=take(discounted,0,id('062'));
 discounted.players[0].hand.push(temari);
 for(const ap of discounted.players[0].apCards)ap.ready=false;
 discounted.players[0].apCards[0].ready=true;
 assert.equal(legalUniversalActions(pack,discounted).some(a=>a.type==='play'&&a.uid===temari.uid),true);
 let full=reach(counts,42);
 seat(full,0,id('041'),'energy',0);
 seat(full,0,id('041'),'energy',1);
 seat(full,0,id('041'),'energy',2);
 const plain=take(full,0,id('062'));
 full.players[0].hand.push(plain);
 for(const ap of full.players[0].apCards)ap.ready=false;
 full.players[0].apCards[0].ready=true;
 assert.equal(legalUniversalActions(pack,full).some(a=>a.type==='play'&&a.uid===plain.uid),false);
 let named=reach(counts,43);
 seat(named,0,id('041'),'energy',0);
 seat(named,0,id('041'),'energy',1);
 named=play(named,id('079'));
 assert.equal(named.pending,null);
 for(const ap of named.players[0].apCards)ap.ready=false;
 const lilya=take(named,0,id('045'));
 const kiyoka=take(named,0,id('050'));
 const other=take(named,0,id('041'));
 named.players[0].hand.push(lilya,kiyoka,other);
 const legal=legalUniversalActions(pack,named);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===lilya.uid),true);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===kiyoka.uid),true);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===other.uid),false);
 assert.equal(assertUniversalMatch(pack,named),true);
});
