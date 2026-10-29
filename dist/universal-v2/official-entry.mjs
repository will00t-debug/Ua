// Official V2 battle entry for decks built in the picture deck editor.
// A card that is not in the shared pack is reported and cannot start a match.
// Re:Zero set 1 and all 73 regular EX17BT Vol.2 cards share one pack.
// AP cards are not deck cards and stay out of this pack.
// This module does not add Re:Zero to the five-title census.
import {requireRegisteredV2TitlePack} from './title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from './pack.mjs';
import {REZERO_CARDS} from '../rezero-cards.mjs';
import {createRezeroV2Pack,rezeroPackCard} from './rezero-pack.mjs';
import {rezV2RawCards} from './rez-pack.mjs';
import {createStgV2Pack} from './stg-pack.mjs';
import {createMadokaV2Pack} from './mmm-pack.mjs';

const CENSUS=['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei'];
let rezeroBattlePack=null;

export function createRezeroBattlePack(){
 if(rezeroBattlePack)return rezeroBattlePack;
 const set1=REZERO_CARDS.filter(c=>c.engineKind).map(rezeroPackCard);
 const vol2=rezV2RawCards();
 const seen=new Set();
 for(const card of [...set1,...vol2]){
  if(seen.has(card.id))throw Error('Duplicate Re:Zero battle id '+card.id);
  seen.add(card.id);
 }
 rezeroBattlePack=createUniversalPack({
  id:'rezero',version:'v2-rezero-set1-plus-vol2',cards:[...set1,...vol2]
 });
 return rezeroBattlePack;
}

let stgBattlePack=null;
export function createSteinsGateBattlePack(){
 if(!stgBattlePack)stgBattlePack=createStgV2Pack();
 return stgBattlePack;
}

let madokaBattlePack=null;
export function createMadokaBattlePack(){
 if(!madokaBattlePack)madokaBattlePack=createMadokaV2Pack();
 return madokaBattlePack;
}

export function officialV2Pack(title){
 if(title==='rezero')return createRezeroBattlePack();
 if(title==='steins-gate')return createSteinsGateBattlePack();
 if(title==='madoka')return createMadokaBattlePack();
 if(!CENSUS.includes(title))throw Error('作品尚未提供正式 V2 牌組：'+String(title));
 return requireRegisteredV2TitlePack(title);
}

function positiveCounts(counts){
 if(!counts||typeof counts!=='object'||Array.isArray(counts))return [];
 return Object.entries(counts).filter(([,n])=>Number(n)>0);
}

export function v2UnsupportedIds(title,counts){
 const pack=officialV2Pack(title);
 return positiveCounts(counts).map(([id])=>id).filter(id=>!pack.cards[id]);
}

export function v2DeckReport(title,counts){
 let pack;
 try{pack=officialV2Pack(title);}catch(error){
  return {ok:false,issues:[error.message],warnings:[],pack:null,counts:{}};
 }
 const unsupported=v2UnsupportedIds(title,counts);
 const warnings=unsupported.length?[
  '尚未支援的效果：'+unsupported.slice(0,8).join('、')+
  (unsupported.length>8?' 等 '+unsupported.length+' 種':'')+
  '。這些卡不能進入 V2 對戰，效果也不會被略過。'
 ]:[];
 const issues=[...warnings];
 // Catalogue drafts store every card at 0. A zero is not in the deck, so an
 // A zero-count catalogue id is not in the deck and must not block a legal list.
 const listed=Object.fromEntries(positiveCounts(counts));
 if(!unsupported.length)issues.push(...validateUniversalDeck(pack,listed));
 else issues.push('包含尚未支援的卡片，目前不能開始對戰。');
 const playable={};
 for(const [id,n] of positiveCounts(counts))if(pack.cards[id])playable[id]=n;
 return {ok:issues.length===0,issues,warnings,pack,counts:playable};
}

export function practiceDeck(pack,{color=null}={}){
 const pool=Object.values(pack.cards).filter(c=>!color||c.color===color);
 const counts={},triggers={final:0,color:0,special:0};
 let total=0;
 const ordered=[...pool].sort((a,b)=>a.energy-b.energy||String(a.id).localeCompare(String(b.id)));
 for(const card of ordered){
  if(total>=50)break;
  let copies=Math.min(card.maxCopies||4,50-total);
  if(Object.prototype.hasOwnProperty.call(triggers,card.trigger))
   copies=Math.min(copies,4-triggers[card.trigger]);
  if(copies<=0)continue;
  counts[card.id]=copies;
  total+=copies;
  if(Object.prototype.hasOwnProperty.call(triggers,card.trigger))triggers[card.trigger]+=copies;
 }
 if(total!==50)throw Error((color||pack.id)+' cannot fill a legal 50-card deck');
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length)throw Error(problems.join('; '));
 return Object.freeze(counts);
}

export function steinsGatePracticeDeck(){
 const pack=createSteinsGateBattlePack();
 const counts=practiceDeck(pack,{color:'blue'});
 const green=Object.keys(counts).filter(id=>pack.cards[id].color!=='blue');
 if(green.length)throw Error('Steins;Gate blue practice deck included another color');
 return {pack,counts};
}

export function madokaPracticeDeck(){
 const pack=createMadokaBattlePack();
 const counts=practiceDeck(pack,{color:'red'});
 const other=Object.keys(counts).filter(id=>pack.cards[id].color!=='red');
 if(other.length)throw Error('Madoka red practice deck included another color');
 return {pack,counts};
}

export function rezeroSet1PracticeDeck(){
 const pack=createRezeroBattlePack();
 const set1=createRezeroV2Pack();
 const counts=practiceDeck(set1,{color:'yellow'});
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length)throw Error('Set-1 practice deck left the shared Re:Zero pack: '+problems.join('; '));
 const vol2=Object.keys(counts).filter(id=>id.startsWith('REZ-2-'));
 if(vol2.length)throw Error('Set-1 practice deck included Vol.2 cards');
 return {pack,counts};
}
