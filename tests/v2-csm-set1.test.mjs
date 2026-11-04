import test from 'node:test';
import assert from 'node:assert/strict';
import {CSM_CARDS} from '../dist/csm-cards.mjs';
import {createCsmV2Pack,csmImplements} from '../dist/universal-v2/csm-pack.mjs';
import {csmEngineKind} from '../dist/universal-v2/csm-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {csmPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {csmEventUseCount,csmAlsoEventAuraLive,csmCardCountsAsEvent}
 from '../dist/universal-v2/csm-continuous.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];
const def=(p,c)=>pack.cards[c.cardId];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to place under '+card.cardId);
 const under=deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
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
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return use(s,action);
}
function fuel(s){
 // Energy line is fixed length 4. CSM-1-008 generates 2, so four slots cover 5.
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}

test('UA53BT registers all 80 playable identities outside the five-title census',()=>{
 assert.equal(CSM_CARDS.length,80);
 assert.deepEqual(CSM_CARDS.map(c=>c.id),Array.from({length:80},(_,i)=>'CSM-1-'+String(i+1).padStart(3,'0')));
 assert.equal(Object.keys(pack.cards).length,80);
 assert.equal(pack.version,'csm-ua53-full-20261104');
 assert.equal(pack.id,'csm');
 assert.equal(V2_TITLE_IDS.includes('csm'),false);
 const colors={purple:0,red:0};
 for(const card of CSM_CARDS){
  assert.equal(csmEngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa);
  colors[card.color]++;
  assert.equal(Array.isArray(card.traits)?card.traits.length:0,0,card.id);
 }
 assert.equal(colors.purple,40);
 assert.equal(colors.red,40);
 const plusGen=CSM_CARDS.filter(c=>c.genMark==='+');
 assert.deepEqual(plusGen.map(c=>c.id),['CSM-1-003','CSM-1-005','CSM-1-049','CSM-1-059','CSM-1-069']);
 for(const card of plusGen)assert.equal(card.gen,1);
 assert.equal(pack.cards['CSM-1-008'].gen,2);
 assert.equal(pack.cards['CSM-1-024'].gen,1);
 assert.equal(pack.cards['CSM-1-017'].raidName,'レゼ');
 assert.equal(pack.cards['CSM-1-047'].nameAliases.includes('デンジ'),true);
 assert.equal(pack.cards['CSM-1-047'].impactNull,false);
 assert.equal(pack.cards['CSM-1-047'].raidImpactNull,true);
 assert.deepEqual(pack.cards['CSM-1-021'].effects.onPlay,[{
  op:'inspectTopAnyOutside',count:3,rest:'top',maxOutside:1}]);
 assert.deepEqual(pack.cards['CSM-1-057'].effects.onPlay,[{
  op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1}]);
 assert.equal(pack.cards['CSM-1-053'].effects.onPlay[0].op,'searchTopOneBottomDiscard');
 assert.equal(pack.cards['CSM-1-053'].effects.onPlay[0].discard,undefined);
 assert.equal(pack.cards['CSM-1-052'].nameAliases.includes('早川アキ'),true);
 assert.equal(raidBoxListed('CSM-1-017','main'),true);
 assert.equal(raidBoxListed('CSM-1-024','onPlay'),false);
 const practice=csmPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='purple'),true);
 const status=editorV2Status('csm',practice.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,80);
 assert.equal(csmImplements('CSM-1-017','main'),true);
 assert.equal(csmImplements('CSM-1-008','onPlay'),true);
});

test('Makima alsoEvent aura is live on front and Q2079 is use-time',()=>{
 const counts=countsFor(['CSM-1-022','CSM-1-001','CSM-1-004','CSM-1-008']);
 let s=toPhase(fresh(counts,2079),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const kobeni=toHand(s,0,'CSM-1-001');
 s=play(s,kobeni.uid);
 assert.equal(csmEventUseCount(s,0,c=>def(pack,c)),0);
 const makima=toHand(s,0,'CSM-1-022');
 s=play(s,makima.uid);
 assert.equal(csmAlsoEventAuraLive(s,0,c=>def(pack,c)),true);
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-001'],c=>def(pack,c)),true);
 assert.equal(csmEventUseCount(s,0,c=>def(pack,c)),0);
 assertUniversalMatch(packs,s);
});

test('top-N look windows keep the full inspected UID list',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-001','CSM-1-002','CSM-1-003','CSM-1-009']);
 let s=toPhase(fresh(counts,8),'main');
 readyAp(s);dumpHand(s);
 put(s,0,'CSM-1-001','energy',0);
 put(s,0,'CSM-1-002','energy',1);
 put(s,0,'CSM-1-003','energy',2);
 put(s,0,'CSM-1-009','energy',3);
 while(s.players[0].deck.length)s.players[0].outside.push(s.players[0].deck.pop());
 const a=take(s,0,'CSM-1-001');
 const b=take(s,0,'CSM-1-009');
 const c=take(s,0,'CSM-1-003');
 s.players[0].deck.unshift(a,b,c);
 const looker=toHand(s,0,'CSM-1-008');
 s=play(s,looker.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.ok(Array.isArray(s.pending.data?.window));
 assert.equal(s.pending.data.window.length,3);
 assert.deepEqual(s.pending.data.window,[a.uid,b.uid,c.uid]);
 assertUniversalMatch(packs,s);
});

test('CSM-1-017 raid-frame main is gated on ordinary non-raid play',()=>{
 const counts=countsFor(['CSM-1-017','CSM-1-016','CSM-1-008','CSM-1-001']);
 let s=toPhase(fresh(counts,17),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const bomb=toHand(s,0,'CSM-1-017');
 s=play(s,bomb.uid);
 assert.equal(s.pending?.kind,'csm');
 s=choose(s,a=>a.mode==='debuff');
 if(s.pending)s=choose(s,a=>a.mode==='skip');
 const live=s.players[0].front.find(c=>c?.cardId==='CSM-1-017');
 assert.ok(live);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===live.uid),false);
 bury(s,0,live);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===live.uid&&
  a.mode==='csm:0'),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-004 empty-field discount and drawDiscard settle',()=>{
 const counts=countsFor(['CSM-1-004','CSM-1-001','CSM-1-008']);
 let s=toPhase(fresh(counts,4),'main');
 readyAp(s);dumpHand(s);
 assert.equal(pack.cards['CSM-1-004'].emptyOwnFieldHandEnergyDiscount,2);
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
 const card=toHand(s,0,'CSM-1-004');
 s=play(s,card.uid);
 if(s.pending?.actions?.length)s=choose(s,a=>true);
 assertUniversalMatch(packs,s);
});

test('CSM practice deck and public view stay coherent',()=>{
 const practice=csmPracticeDeck();
 const match=newUniversalMatch([practice.pack,practice.pack],
  {decks:[practice.counts,practice.counts],seed:53,first:0});
 const view=universalPublicView([practice.pack,practice.pack],match,0);
 assert.equal(view.players.length,2);
 assertUniversalMatch([practice.pack,practice.pack],match);
});
