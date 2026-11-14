import test from 'node:test';
import assert from 'node:assert/strict';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {MHA_EFFECTS_ZH_TW,MHA_NAMES_ZH_TW,MHA_COLOR_TRIGGER_ZH_TW} from '../dist/mha/zh-tw.mjs';
import {MHA_CARDS_001_050} from '../dist/mha/cards-001-050.mjs';
import {MHA_CARDS_051_100} from '../dist/mha/cards-051-100.mjs';
import {MHA2_CARDS_001_036} from '../dist/mha/cards-mha2-001-036.mjs';
import {MHA2_CARDS_037_073} from '../dist/mha/cards-2-037-073.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const booster=[...MHA_CARDS_001_050,...MHA_CARDS_051_100,
 ...MHA2_CARDS_001_036,...MHA2_CARDS_037_073];
const catalog=mhaEditorCards();
const byId=new Map(catalog.map(card=>[card.id,card]));

test('all 173 MHA booster cards have card-specific Traditional Chinese effect text',()=>{
 assert.equal(booster.length,173);
 assert.equal(Object.keys(MHA_EFFECTS_ZH_TW).filter(id=>/^MHA-[12]-/.test(id)).length,173);
 for(const printed of booster){
  const translated=byId.get(printed.id);
  assert.ok(translated,printed.id+' missing from editor');
  assert.equal(translated.effectJa,printed.effectJa,printed.id+' Japanese printing changed');
  assert.equal(translated.nameJa,printed.nameJa,printed.id+' Japanese name changed');
  assert.equal(translated.number,printed.number,printed.id+' printed number changed');
  assert.equal(translated.image,printed.image,printed.id+' art changed');
  assert.equal(translated.energy,printed.energy,printed.id+' energy changed');
  assert.equal(translated.ap,printed.ap,printed.id+' AP changed');
  assert.equal(translated.bp,printed.bp,printed.id+' BP changed');
  assert.equal(translated.trigger,printed.trigger,printed.id+' trigger changed');
  assert.equal(translated.effect,MHA_EFFECTS_ZH_TW[printed.id]==='－'?'-':MHA_EFFECTS_ZH_TW[printed.id]);
  assert.doesNotMatch(translated.effect,/[ぁ-んァ-ン]/,printed.id+' untranslated Japanese kana');
  if(printed.effectJa!=='-')assert.notEqual(translated.effect,printed.effectJa,printed.id+' translation missing');
  assert.ok(translated.name&&translated.name.length>0,printed.id+' no Chinese name');
  assert.equal(translated.playable,false);
  assert.equal(translated.battleReady,false);
 }
});

test('the deck editor title and offline catalog are consistently translated',()=>{
 const title=getTitle('mha');
 assert.ok(title);
 assert.equal(title.cards.length,191);
 assert.equal(catalog.length,191);
 for(const card of title.cards){
  assert.equal(card.name,byId.get(card.id)?.name);
  assert.equal(card.effect,byId.get(card.id)?.effect);
 }
 assert.equal(byId.get('MHA-1-001').name,'壞理');
 assert.equal(byId.get('MHA-2-002').name,'歐爾麥特');
 assert.equal(byId.get('MHA-3-001').name,'麗日御茶子');
 assert.equal(byId.get('MHA-3-001').effect,MHA_EFFECTS_ZH_TW['MHA-3-001']);
 assert.equal(byId.get('MHA-3-009').effect,byId.get('MHA-3-009').effectJa,
  'unverified MHA-3-009 must keep visible original rather than fabricated translation');
 for(const type of ['draw','get','active','raid']){
  const hits=booster.filter(card=>card.trigger===type);
  assert.ok(hits.length>0);
  for(const printed of hits){
   assert.doesNotMatch(byId.get(printed.id).triggerText,/[ぁ-んァ-ン]/,printed.id+' trigger untranslated');
  }
 }
 for(const id of Object.keys(MHA_COLOR_TRIGGER_ZH_TW))
  assert.equal(byId.get(id).triggerText,MHA_COLOR_TRIGGER_ZH_TW[id]);
});

test('same-name Japanese identity, source and battle legality are untouched',()=>{
 assert.ok(Object.keys(MHA_NAMES_ZH_TW).length>=70);
 assert.equal(byId.get('MHA-1-060').name,'綠谷出久');
 assert.equal(byId.get('MHA-1-060').nameJa,'緑谷 出久');
 assert.ok(byId.get('MHA-1-060').source.includes('unionarena-tcg.com'));
 assert.equal(catalog.filter(card=>card.id.startsWith('MHA-1-')).length,109);
 assert.equal(catalog.filter(card=>card.id.startsWith('MHA-2-')).length,73);
 assert.equal(catalog.filter(card=>card.id.startsWith('MHA-P-')).length,3);
 assert.equal(catalog.filter(card=>card.id.startsWith('MHA-3-')).length,6);
});
