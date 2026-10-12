import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,CARDS,validateDeck} from '../dist/cards.mjs';
import {parseDeck,formatDeck,sameCounts,normalizeCounts,readSavedDecks} from '../dist/decks.mjs';

test('complete named decks round-trip through readable card-number lists',()=>{
 for(const p of PRESETS){const parsed=parseDeck(formatDeck(p.counts,p.name));assert.equal(parsed.name,p.name);assert.ok(sameCounts(parsed.counts,p.counts));assert.deepEqual(validateDeck(parsed.counts),[]);}
});
test('JSON supports short IDs and full IDs without mapping other products to this pool',()=>{
 const full=Object.fromEntries(Object.entries(PRESETS[0].counts).map(([id,n])=>['UA08ST/BLC-1-'+id,n]));
 assert.ok(sameCounts(parseDeck(JSON.stringify(full)).counts,PRESETS[0].counts));
 const named=parseDeck(JSON.stringify({name:'  一護練習  ',counts:PRESETS[0].counts}));assert.equal(named.name,'一護練習');
 assert.throws(()=>normalizeCounts({'UA08BT/BLC-1-104':4}),/尚未支援/);
});
test('count-first, card-first, short-code and CRLF lists all describe the same cards',()=>{
 const items=Object.entries(PRESETS[1].counts);
 for(const lines of [items.map(([id,n])=>`${n}xUA08ST/BLC-1-${id}`),items.map(([id,n])=>`UA08ST/BLC-1-${id} x ${n}`),items.map(([id,n])=>`${id} ${n}`)])assert.ok(sameCounts(parseDeck(lines.join('\r\n')).counts,PRESETS[1].counts));
});
test('invalid counts, unsupported cards and duplicate aliases cannot enter a legal deck',()=>{
 assert.throws(()=>parseDeck('4 UA08BT/BLC-1-104'),/尚未支援/);
 assert.throws(()=>normalizeCounts({'104':2,'UA08ST/BLC-1-104':3}),/超過/);
 assert.throws(()=>parseDeck(JSON.stringify({'104':4})),/50 張/);
 assert.throws(()=>normalizeCounts({'104':2.5}),/0–4/);
 assert.throws(()=>normalizeCounts({'104':true}),/0–4/);
 assert.throws(()=>parseDeck('5 UA08ST/BLC-1-104'),/1–4/);
 assert.throws(()=>parseDeck('not a card list'),/第 1 行/);
});
test('saved deck records are independent, unique and valid after reload',()=>{
 const a={id:'a',name:'一護',counts:PRESETS[0].counts},b={id:'b',name:'戀次',counts:PRESETS[1].counts};
 const records=readSavedDecks([a,b,{...a,name:'重複'},{id:'bad',name:'不合法',counts:{'104':4}},null]);
 assert.equal(records.length,2);assert.ok(sameCounts(records[0].counts,a.counts));records[0].counts['104']=0;assert.equal(a.counts['104'],4);
 const original=readSavedDecks(JSON.parse(JSON.stringify([a,b])));assert.deepEqual(original.map(x=>x.name),['一護','戀次']);assert.equal(Object.keys(original[0].counts).length,CARDS.length);
});
