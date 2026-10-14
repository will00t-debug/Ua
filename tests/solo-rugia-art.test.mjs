import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {SOLO_SHADOW_TRAINING_PRESET,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
import {SOLO_ART_FALLBACK,SOLO_ART_CREDIT,soloArtSource,soloArtErrorFallback} from '../dist/solo-art.mjs';

test('all 80 original-print SLG-1 cards have exact Rugia non-variant URLs and no AP/parallel art',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 for(let i=1;i<=80;i++){
  const id='SLG-1-'+String(i).padStart(3,'0');
  const c=SOLO_LEVELING_CARDS.find(c=>c.id===id);
  assert.ok(c,id);
  assert.equal(c.image,soloArtSource(id));
  assert.equal(c.image,'https://rugiacreation.com/ua/cardlist/small/UA51BT_'+id+'.jpg?v=20261013');
  assert.ok(!c.image.includes('_2.jpg')&&!c.image.includes('_3.jpg'));
 }
 for(const invalid of ['SLG-1-000','SLG-1-081','SLG-1-AP01','SLG-2-001','',undefined])assert.equal(soloArtSource(invalid),SOLO_ART_FALLBACK);
 assert.match(SOLO_ART_CREDIT,/路基亞/);
});
test('broken third-party images safely fall back once and do not change unrelated sources',()=>{
 const img={src:soloArtSource('SLG-1-001'),dataset:{soloArt:'1'}};
 assert.equal(soloArtErrorFallback(img),true);
 assert.equal(img.src,SOLO_ART_FALLBACK);
 assert.equal(soloArtErrorFallback(img),false);
 const other={src:'https://example.invalid/foo',dataset:{ttgArt:'1'}};
 assert.equal(soloArtErrorFallback(other),false);
 assert.equal(other.src,'https://example.invalid/foo');
});
test('builder 80 artworks, battle own hand, public board/life; opponent private cards remain hidden',async()=>{
 const old={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const memory=new Map([['ua-slg-draft-v1',JSON.stringify(SOLO_SHADOW_TRAINING_PRESET)]]);
 const handlers=[];
 const app={innerHTML:'',onclick:null,addEventListener(type,fn,capture){if(type==='error'){assert.equal(capture,true);handlers.push(fn);}}};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.window={scrollTo(){},open(){}};
 globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/app.mjs?solo-rugia-builder-'+Date.now());
  click({view:'builder'});click({title:'solo-leveling'});
  let html=app.innerHTML;
  assert.equal((html.match(/data-solo-art='1'/g)||[]).length,80,'all card tiles have real external images');
  assert.match(html,/UA51BT_SLG-1-001.jpg/);
  assert.match(html,/UA51BT_SLG-1-080.jpg/);
  assert.match(html,/卡圖：路基亞/);
  click({action:'soloTrainingStartShadow'});
  html=app.innerHTML;
  const started=JSON.parse(memory.get('ua-slg-training-v1'));
  assert.ok(assertSoloTrainingMatch(started));
  assert.equal((html.match(/soloHandCard/g)||[]).length,7,'own opening 7 hand cards should have images');
  assert.equal((html.match(/data-solo-art='1'/g)||[]).length,7,'hidden life and opponent hand must not render');
  const player=started.players[0],opponent=started.players[1];
  const c=player.hand.pop();
  Object.assign(c,{owner:0,line:'energy',slot:0,ready:false});
  player.energy[0]=c;
  const revealed=opponent.life.shift();
  opponent.outside.push(revealed);
  started.revealedLife={owner:1,cardId:revealed.cardId,trigger:'draw',turn:started.turn};
  assert.ok(assertSoloTrainingMatch(started));
  memory.set('ua-slg-training-v1',JSON.stringify(started));
  await import('../dist/app.mjs?solo-rugia-board-'+Date.now());
  click({view:'soloArena'});
  html=app.innerHTML;
  assert.match(html,/soloLifeReveal/);
  assert.match(html,/soloBoardCell/);
  assert.match(html,/soloHandCard/);
  assert.ok(html.includes(soloArtSource(c.cardId)));
  assert.ok(html.includes(soloArtSource(revealed.cardId)));
  assert.equal((html.match(/data-solo-art='1'/g)||[]).length,player.hand.length+2,
   'only 6 human hand cards, one public field card and one revealed life card can show images');
  const broken={src:soloArtSource('SLG-1-002'),dataset:{soloArt:'1'}};
  handlers.forEach(fn=>fn({target:broken}));
  assert.equal(broken.src,SOLO_ART_FALLBACK);
 }finally{Object.assign(globalThis,old);}
});
