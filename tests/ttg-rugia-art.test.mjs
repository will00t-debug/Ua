import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_CARDS,TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {ttgArtSource,ttgArtErrorFallback,TTG_ART_FALLBACK} from '../dist/ttg-art.mjs';
test('all 81 TTG regular artworks map one-to-one to Rugia non-variant source URLs',()=>{
 assert.equal(TTG_CARDS.length,81);
 for(let n=1;n<=81;n++){
  const id='TTG-1-'+String(n).padStart(3,'0');
  assert.equal(TTG_BY_ID[id]?.image,ttgArtSource(id),id);
  assert.equal(TTG_BY_ID[id]?.image, 'https://rugiacreation.com/ua/cardlist/small/UA56BT_'+id+'.jpg?v=20261013',id);
  assert.ok(!TTG_BY_ID[id].image.includes('_2.jpg'),id+' should not use alternate art');
 }
 assert.equal(ttgArtSource('invalid'),TTG_ART_FALLBACK);
 assert.equal(ttgArtSource('TTG-1-AP01'),TTG_ART_FALLBACK);
});
test('image load errors swap once to local mark; no retry loop or cross-site change',()=>{
 const remote={src:ttgArtSource('TTG-1-032'),dataset:{ttgArt:'1'}};
 assert.equal(ttgArtErrorFallback(remote),true);
 assert.equal(remote.src,TTG_ART_FALLBACK);
 assert.equal(remote.dataset.ttgFallback,'1');
 assert.equal(ttgArtErrorFallback(remote),false);
 const other={src:'https://somewhere.invalid/image',dataset:{}};
 assert.equal(ttgArtErrorFallback(other),false);
 assert.equal(other.src,'https://somewhere.invalid/image');
});
test('actual website shows remote TTG artwork in catalogue, hand and board without exposing private piles',async()=>{
 const storage=new Map(),app={innerHTML:'',onclick:null,addEventListener(type,fn,capture){if(type==='error'){assert.equal(capture,true);this.onImageError=fn;}}};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.window={scrollTo(){},open(){}};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const press=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg-art-smoke');
  press({view:'builder'});press({title:'gurren-lagann'});
  const html=app.innerHTML;
  assert.equal((html.match(/data-ttg-art='1'/g)||[]).length,81,'every catalogue card should show remote art');
  assert.ok(html.includes(TTG_BY_ID['TTG-1-001'].image),'first TTG ordinary image');
  assert.ok(html.includes(TTG_BY_ID['TTG-1-081'].image),'last TTG ordinary image');
  assert.match(html,/卡圖：路基亞/);
  assert.doesNotMatch(html,/alt=".*佔位圖" loading="lazy"/);
  press({action:'ttgBetaStartGreen'});
  assert.match(app.innerHTML,/ttgHandCard/);
  assert.match(app.innerHTML,/ttgBoardCell/);
  assert.ok((app.innerHTML.match(/data-ttg-art='1'/g)||[]).length>=7,'human hand shows public card image');
  assert.ok(app.onImageError,'fallback handler attached');
  const broken={src:TTG_BY_ID['TTG-1-001'].image,dataset:{ttgArt:'1'}};
  app.onImageError({target:broken});
  assert.equal(broken.src,TTG_ART_FALLBACK);
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});
