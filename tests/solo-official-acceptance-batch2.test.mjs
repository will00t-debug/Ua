import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {
 SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,
 soloTrainingDispatch,soloMatchBp,soloEnergy,assertSoloTrainingMatch
} from '../dist/solo-match.mjs';

// Japanese official printed card entries (not a declaration of complete coverage):
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-003
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-004
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-007
const cards=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const sample=Object.fromEntries(Object.entries(SOLO_SHADOW_TRAINING_PRESET));
function deck(add,remove=['009']){
 const d={...sample};
 for(const suffix of remove)d['SLG-1-'+suffix]=0;
 for(const suffix of add)d['SLG-1-'+suffix]=4;
 assert.equal(Object.values(d).reduce((a,b)=>a+b,0),50);
 return d;
}
function start(counts){const s=newSoloTrainingMatch({decks:[counts,counts],first:0,seed:731});return s;}
function take(pl,id){for(const zone of ['hand','life','deck']){const pos=pl[zone].findIndex(c=>c.cardId===id);if(pos>=0)return pl[zone].splice(pos,1)[0];}throw Error('fixture cannot find '+id);}
function place(s,id,{owner=0,line='front',slot=0,ready=true}={}){
 const c=take(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});s.players[owner][line][slot]=c;return c;
}
function readyHand(s,id){const card=take(s.players[0],id);s.players[0].hand.push(card);return card;}
function next(s,match){const a=soloTrainingLegalActions(s).find(match);assert.ok(a,'expected legal option');return soloTrainingDispatch(s,a);}

test('SLG-1-003: purple energy bonus only when outside >=10, including while REST (printed effect)',()=>{
 const s=start(deck(['003']));
 const rin=place(s,'SLG-1-003',{line:'energy',ready:false}),p=s.players[0];
 assert.equal(cards['SLG-1-003'].trigger,'active');
 assert.equal(soloEnergy(s,0),1);
 for(let i=0;i<9;i++)p.outside.push(p.deck.shift());
 assert.equal(soloEnergy(s,0),1);
 p.outside.push(p.deck.shift());
 assert.equal(soloEnergy(s,0),2);
 rin.ready=true;
 assert.equal(soloEnergy(s,0),2);
 assert.ok(assertSoloTrainingMatch(s));
});

test('SLG-1-003: attack-time top deck choice can keep secret top or send exactly that card outside',()=>{
 let s=start(deck(['003'])),p=s.players[0];
 const rin=place(s,'SLG-1-003',{line:'front'});
 s.phase='attack';p.ownTurns=2;
 const initialTop=p.deck[0].uid,originalOutside=p.outside.length;
 s=next(s,a=>a.type==='attack'&&a.uid===rin.uid);
 assert.equal(s.pending?.kind,'peekTop');
 assert.deepEqual(s.pending.topUids,[initialTop]);
 const choices=soloTrainingLegalActions(s);
 assert.ok(choices.some(a=>a.outsideUid===null));
 assert.ok(choices.some(a=>a.outsideUid===initialTop));
 const kept=soloTrainingDispatch(s,choices.find(a=>a.outsideUid===null));
 assert.equal(kept.players[0].deck[0].uid,initialTop);
 assert.equal(kept.players[0].outside.length,originalOutside);
 const sent=soloTrainingDispatch(s,choices.find(a=>a.outsideUid===initialTop));
 assert.equal(sent.players[0].outside.at(-1).uid,initialTop);
 assert.equal(sent.players[0].outside.length,originalOutside+1);
 assert.ok(assertSoloTrainingMatch(kept));assert.ok(assertSoloTrainingMatch(sent));
});

test('SLG-1-004: entry draws exactly one then requires one discard; owner BP +500 only this turn',()=>{
 const counts=deck(['004']);let s=start(counts),p=s.players[0];
 s.phase='main';p.maxAp=3;p.ap=3;
 place(s,'SLG-1-006',{line:'energy',slot:0,ready:true});
 place(s,'SLG-1-006',{line:'energy',slot:1,ready:true});
 const inu=readyHand(s,'SLG-1-004');
 assert.ok(soloEnergy(s,0)>=3);
 const handBefore=p.hand.length,oldOutside=p.outside.length;
 s=next(s,a=>a.type==='play'&&a.uid===inu.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending?.kind,'entry004Discard');
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].ap,2);
 s=next(s,a=>a.type==='choose'&&a.uid!=null);
 assert.equal(s.players[0].outside.length,oldOutside+1);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.equal(soloMatchBp(s,s.players[0].front[0]),4000);
 s.active=1;
 assert.equal(soloMatchBp(s,s.players[0].front[0]),3500);
 assert.ok(assertSoloTrainingMatch(s));
});

test('SLG-1-007: actual retirement by event draws exactly one for its owner, no double trigger',()=>{
 const counts=deck(['007','040'],['009','015']);
 let s=start(counts),p=s.players[0],def=s.players[1];
 s.phase='main';p.maxAp=3;p.ap=3;
 place(s,'SLG-1-006',{line:'energy',slot:0,ready:true});
 place(s,'SLG-1-006',{line:'energy',slot:1,ready:true});
 const es=place(s,'SLG-1-007',{owner:1,line:'front'});
 const e=readyHand(s,'SLG-1-040'),handBefore=def.hand.length,outBefore=def.outside.length,deckBefore=def.deck.length;
 s=next(s,a=>a.type==='playEvent'&&a.uid===e.uid);
 assert.equal(s.pending?.kind,'eventDestroy');
 s=next(s,a=>a.type==='choose'&&a.uid===es.uid);
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(c=>c.uid===es.uid));
 assert.equal(s.players[1].hand.length,handBefore+1);
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(s.players[1].outside.length,outBefore+1);
 assert.ok(assertSoloTrainingMatch(s));
});
