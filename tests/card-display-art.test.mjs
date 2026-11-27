import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fallbackCardArtUrl,installCardArtFallback} from '../dist/card-display-art.mjs';
import {TITLES} from '../dist/title-registry.mjs';

const JP='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
const TC='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const RUGIA='https://rugiacreation.com/ua/cardlist/small/';
const version='?v=20261016';

test('exact set and print number survive regular, starter, promo, AP and expansion mapping',()=>{
 for(const [base,file,query] of [
  [JP,'UA50BT_IYS-1-002',''],
  [JP,'UA54BT_MST-1-018','?v9='],
  [JP,'EX10BT_AOT-2-073','?v9'],
  [JP,'UA10ST_MHA-1-106',''],
  [JP,'UAPR_MHA-P-001','?v9'],
  [JP,'UA05NC_MHA-3-AP01',''],
  [TC,'UA49BT_RNK-1-001','']
 ]){
  assert.equal(fallbackCardArtUrl(base+file+'.png'+query),RUGIA+file+'.jpg'+version);
 }
});

test('never rewrite local, existing Rugia, logos, card backs, unknown hosts or unverified alternate art',()=>{
 for(const source of [
  null,'','assets/cards/001.png','assets/mark.svg','assets/card-back.png',
  RUGIA+'UA36BT_MCR-1-001.jpg?v=20261126',
  'https://upload.wikimedia.org/wikipedia/commons/logo.svg',
  JP+'UA50BT_IYS-1-007_p1.png',
  JP+'UA50BT_IYS-1-007_2.png',
  JP+'UA50BT_IYS-1-007.jpg',
  JP+'../UA50BT_IYS-1-002.png',
  'https://www.unionarena-tcg.com.evil.test/jp/images/cardlist/card/UA50BT_IYS-1-002.png'
 ])assert.equal(fallbackCardArtUrl(source),'',String(source));
});

test('capturing image error tries the alternative once before the existing placeholder',()=>{
 const handlers=[];
 const doc={addEventListener(type,fn,capture){handlers.push({type,fn,capture});}};
 assert.equal(installCardArtFallback(doc),true);
 assert.equal(installCardArtFallback(doc),false);
 assert.equal(handlers.length,1);
 assert.equal(handlers[0].type,'error');
 assert.equal(handlers[0].capture,true);
 const image={localName:'img',src:JP+'UA50BT_IYS-1-002.png',getAttribute(name){assert.equal(name,'src');return this.src;}};
 let stopped=0;
 const fail=target=>{
  const before=stopped;
  handlers[0].fn({target,stopImmediatePropagation(){stopped++;}});
  if(before===stopped&&target===image)target.src='assets/mark.svg';
 };
 fail(image);
 assert.equal(stopped,1);
 assert.equal(image.src,RUGIA+'UA50BT_IYS-1-002.jpg'+version);
 fail(image);
 assert.equal(stopped,1);
 assert.equal(image.src,'assets/mark.svg');
 fail({localName:'script',getAttribute:()=>JP+'UA50BT_IYS-1-002.png'});
 assert.equal(stopped,1);
 fail({localName:'img',getAttribute:()=> 'https://upload.wikimedia.org/wikipedia/commons/logo.svg'});
 assert.equal(stopped,1);
});

test('all currently used official catalogue art across every title has an exact same-print fallback',()=>{
 const affected=new Set();
 let mapped=0,untouched=0;
 for(const title of TITLES){
  for(const card of title.cards){
   const source=card.onlineImage||card.image;
   assert.ok(source,title.id+' '+card.id+' lacks source');
   const alt=fallbackCardArtUrl(source);
   if(source.startsWith(JP)||source.startsWith(TC)){
    assert.ok(alt,title.id+' '+card.id+' lacks exact-print fallback: '+source);
    assert.equal(alt,RUGIA+source.split('/').at(-1).split('?')[0].replace(/\.png$/,'.jpg')+version);
    affected.add(title.id);
    mapped++;
   }else{
    assert.equal(alt,'',title.id+' '+card.id+' must retain existing source');
    untouched++;
   }
  }
 }
 for(const id of ['sword-art-online','mushoku-tensei','rezero','steins-gate','madoka','inuyasha','kjn','aot','kmr','csm','imc','mha','rnk','eva','toriko','dgm','mgs'])assert.ok(affected.has(id),id);
 assert.ok(mapped>0&&untouched>0);
 console.log('Card art audit: '+TITLES.length+' titles, '+mapped+' official-source fallbacks, '+untouched+' existing sources preserved.');
});

test('every public card-rendering page installs the fallback before its UI module',()=>{
 for(const [page,entry] of [
  ['index.html','v2-deck-editor.mjs'],
  ['online.html','online-bootstrap.mjs'],
  ['universal-v2-preview.html','universal-v2-preview.mjs'],
  ['universal-v2-battle.html','universal-v2-preview.mjs'],
  ['coach.html','coach.mjs']
 ]){
  const html=readFileSync(new URL('../dist/'+page,import.meta.url),'utf8');
  const hook=html.indexOf('src="card-display-art.mjs?v=20261127cardart1"');
  assert.ok(hook>=0&&hook<html.indexOf('src="'+entry),page);
 }
});
