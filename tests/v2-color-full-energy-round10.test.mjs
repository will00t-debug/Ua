import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Q22 full-line REMOVED; MST053 printed optional COLOR substitution.
// https://www.unionarena-tcg.com/jp/faq/list.php?number=22
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-053
const foe=createAllV2PreviewRealDecks()['bleach-green'];
const packs=[foe.pack,registeredV2TitlePack('mushoku-tensei')];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,'MST-1-050':2,'MST-1-053':2};
function take(s,p,id){for(const z of ['deck','hand','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function setup(){
 assert.deepEqual(validateUniversalDeck(packs[1],deck),[]);
 let s=newUniversalMatch(packs,{decks:[foe.counts,deck],first:0,seed:10053});
 const attacker=take(s,0,'BLC-1-071');attacker.ready=true;s.players[0].front[0]=attacker;
 const live=take(s,1,'MST-1-053');s.players[1].front[0]=live;
 const trigger=take(s,1,'MST-1-053');s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(trigger);
 const field=take(s,1,'MST-1-075'),char=take(s,1,'MST-1-050');s.players[1].hand.push(field,char);
 const displaced=take(s,1,'MST-1-075');s.players[1].energy[0]=displaced;
 for(let i=1;i<4;i++)s.players[1].energy[i]=take(s,1,'MST-1-070');
 s=act(act(act(s,{type:'next'}),{type:'next'}),{type:'next'});
 s=act(s,{type:'attack',uid:attacker.uid});s=act(s,{type:'chooseBlock',uid:null});
 return {s,field,char,displaced};
}
for(const mode of ['colorField','color'])test(`real BLEACH attack: ${mode} replaces full ENERGY exact UID, no onRetire/AP cost/private leak`,()=>{
 let {s,field,char,displaced}=setup();const picked=mode==='colorField'?field:char;
 const options=legalUniversalActions(packs,s),choice=options.find(a=>a.mode===mode&&a.uid===picked.uid&&a.line==='energy'&&a.replaceUid===displaced.uid);
 assert.ok(choice);assert.equal(choice.slot,0);
 for(const difficulty of ['normal','hard'])assert.ok(options.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 for(const forged of [{...choice,replaceUid:char.uid},{...choice,uid:'foreign'},{...choice,line:'front',replaceUid:displaced.uid}])assert.throws(()=>act(s,forged),/not currently legal/);
 const before=structuredClone(s),ap=s.players[1].apCards.filter(c=>c.ready).length,n=s.players[1].deck.length;
 assert.equal(universalPrivateChoices(packs,s,0),null);
 const view=JSON.stringify(universalPublicView(packs,s,0));assert.ok(!view.includes(field.uid));assert.ok(!view.includes(char.uid));
 s=act(s,choice);
 assert.equal(s.players[1].energy[0].uid,picked.uid);assert.equal(s.players[1].energy[0].ready,true);
 assert.ok(s.players[1].removed.some(c=>c.uid===displaced.uid));
 assert.ok(!s.players[1].outside.some(c=>c.uid===displaced.uid));assert.equal(s.turnRetireEvents.length,0);
 // MST075 onPlay draws once; its displaced copy's onRetire MUST NOT draw.
 assert.equal(s.players[1].deck.length,n-(mode==='colorField'?1:0));
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,ap);
 if(mode==='colorField'){assert.equal(s.pending.kind,'effect-discard');s=act(s,legalUniversalActions(packs,s)[0]);}
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(before.players[1].energy[0].uid,displaced.uid);
});
