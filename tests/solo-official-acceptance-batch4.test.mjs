import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloEnergy,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
// Official Japanese print, checked 2026-10-14:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-011
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-012
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT/SLG-1-013
// Series FAQ https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT
// No card-specific FAQ for 011-013 was present in that listing. Not full certification.
function game(){
 const counts={...SOLO_SHADOW_TRAINING_PRESET};
 for(const id of ['001','009','010','029','031'])delete counts['SLG-1-'+id];
 for(const id of ['011','012','013','026','037'])counts['SLG-1-'+id]=4;
 const s=newSoloTrainingMatch({decks:[counts,counts],seed:1410,first:0});
 s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;
}
function take(p,id){for(const z of ['hand','deck','life']){const i=p[z].findIndex(c=>c.cardId==='SLG-1-'+id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('missing '+id);}
function put(s,id,line='energy',slot=0,owner=0,ready=true){const c=take(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});s.players[owner][line][slot]=c;return c;}
function hand(s,id){const c=take(s.players[0],id);s.players[0].hand.push(c);return c;}
function act(s,f){const a=soloTrainingLegalActions(s).find(f);assert.ok(a,'expected legal action');const n=soloTrainingDispatch(s,a);assertSoloTrainingMatch(n);return n;}
function play(s,c,line='front',slot=0){return act(s,a=>a.type==='play'&&a.uid===c.uid&&a.line===line&&a.slot===slot);}
function energy(s){put(s,'006','energy',0);put(s,'006','energy',1);}
function life011(){const s=game(),p=s.players[1],c=take(p,'011');p.deck.push(p.life.shift());p.life.unshift(c);const attacker=put(s,'015','front',0);s.phase='attack';return {s,p,attacker};}

test('011 COLOR uses outside only, front only, no AP/energy cost',()=>{
 let {s,p,attacker}=life011();const target=take(p,'013');p.outside.push(target);
 const wrongZone=take(p,'006');p.hand.push(wrongZone);p.outside.push(take(p,'012'),take(p,'037'));
 const ap=p.ap;s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(s.pending?.kind,'colorTrigger');
 const options=soloTrainingLegalActions(s);assert.ok(options.length);
 assert.ok(options.some(a=>a.uid===null),'official Q99 decline is allowed');
 assert.ok(options.filter(a=>a.uid!==null).every(a=>a.uid===target.uid&&a.line==='front'));
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',uid:wrongZone.uid,line:'front',slot:0}),/illegal/);
 s=act(s,a=>a.uid===target.uid&&a.slot===0);
 assert.equal(s.players[1].front[0].ready,true);assert.equal(s.players[1].ap,ap);
 assert.equal(s.players[1].outside.some(c=>c.uid===target.uid),false);
 assert.equal(s.pending,null);
});
test('011 COLOR never bypasses front-only placement via hand/energy (full-line replacement remains a core limitation)',()=>{
 for(const full of [false,true]){let {s,p,attacker}=life011();p.hand.push(take(p,'006'));
  if(full){p.outside.push(take(p,'013'));for(let i=0;i<4;i++)put(s,'030','front',i,1,false);}
  s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);assert.equal(s.pending,null);
 }
});
test('011 recovery may decline; energy threshold rechecked; accepted REST entry can skip or mill exactly one',()=>{
 for(const enough of [false,true]){let s=game();energy(s);
  const c=take(s.players[0],'011');s.players[0].outside.push(c);const potion=hand(s,'037');
  s=act(s,a=>a.type==='playEvent'&&a.uid===potion.uid);
  if(!enough)s.players[0].energy[0].ready=false; // Energy re-evaluated at recovery resolution.
  s=act(s,a=>a.uid===c.uid);
  if(!enough){assert.equal(s.pending,null);assert.ok(s.players[0].hand.some(x=>x.uid===c.uid));continue;}
  assert.equal(s.pending.kind,'slgRecoveredDeploy');const ap=s.players[0].ap;
  const declined=act(s,a=>a.uid===null);assert.ok(declined.players[0].hand.some(x=>x.uid===c.uid));
  const reduced=structuredClone(s);reduced.players[0].energy[0].ready=false;
  assert.deepEqual(soloTrainingLegalActions(reduced),[{type:'choose',uid:null}]);
  s=act(s,a=>a.uid===c.uid&&a.line==='front'&&a.slot===0);
  assert.equal(s.players[0].front[0].ready,false);assert.equal(s.players[0].ap,ap);
  const top=s.players[0].deck[0].uid;
  const skip=act(s,a=>a.mill===false);assert.equal(skip.players[0].deck[0].uid,top);
  const mill=act(s,a=>a.mill===true);assert.equal(mill.players[0].outside.at(-1).uid,top);
 }
});
test('012 paid entry draws only for own Sung in either line, not hand or opposing field',()=>{
 for(const where of ['front','energy','hand','opponent','absent']){let s=game();energy(s);
  if(where==='front'||where==='energy')put(s,'015',where,2);
  if(where==='hand')hand(s,'015');if(where==='opponent')put(s,'015','front',0,1);
  const c=hand(s,'012'),before=s.players[0].hand.length,deck=s.players[0].deck.length;
  s=play(s,c);const draws=['front','energy'].includes(where)?1:0;
  assert.equal(s.players[0].hand.length,before-1+draws);assert.equal(s.players[0].deck.length,deck-draws);
  assert.equal(s.players[0].ap,2);assert.equal(s.pending,null);
 }
});
test('013 REST cost, once per turn, energy increase and retirement occur before attack actions',()=>{
 let s=game();const c=put(s,'013');assert.equal(soloEnergy(s),1);
 s=act(s,a=>a.type==='ability'&&a.uid===c.uid);assert.equal(soloEnergy(s),2);assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),false);
 s.players[0].energy[0].ready=true;assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid),false);
 s=act(s,a=>a.type==='next');assert.equal(s.phase,'attack');assert.equal(soloEnergy(s),0);
 assert.equal(s.players[0].energy[0],null);assert.equal(s.players[0].outside.filter(x=>x.uid===c.uid).length,1);
});
test('013 leaving field and reentering loses its granted energy and delayed retirement',()=>{
 let s=game();const aoi=put(s,'013');put(s,'006','energy',1);
 s=act(s,a=>a.type==='ability'&&a.uid===aoi.uid);
 const bounce=hand(s,'026');s=play(s,bounce);assert.equal(s.pending.kind,'entryBounce');
 s=act(s,a=>a.uid===aoi.uid);const before=soloEnergy(s);
 s=play(s,aoi,'energy',0);assert.equal(soloEnergy(s),before+1,'new field instance must not retain boost');
 s=act(s,a=>a.type==='next');assert.equal(s.players[0].energy[0]?.uid,aoi.uid,'old delayed retirement must not affect new instance');
});

test('011 COLOR browser action labels the actual outside card and dispatches the selected front slot',async()=>{
 let s=game();s.active=1;s.phase='attack';s.players[1].ownTurns=2;
 const attacker=put(s,'015','front',0,1),p=s.players[0],life=take(p,'011'),target=take(p,'013');
 p.deck.push(p.life.shift());p.life.unshift(life);p.outside.push(target);
 s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 const old={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const app={innerHTML:''},data=new Map([['ua-slg-training-v1',JSON.stringify(s)]]),toast={classList:{add(){},remove(){}}};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null};globalThis.window={scrollTo(){}};
 globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 try{
  await import('../dist/app.mjs?color-acceptance');
  const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({view:'soloArena'});
  assert.match(app.innerHTML,/水篠 葵 → 前線1/);
  const action=soloTrainingLegalActions(s).find(a=>a.uid===target.uid&&a.slot===0);
  click({soloAct:encodeURIComponent(JSON.stringify(action))});
  const saved=JSON.parse(data.get('ua-slg-training-v1'));assert.equal(saved.players[0].front[0].uid,target.uid);
  assert.equal(saved.players[0].front[0].ready,true);assertSoloTrainingMatch(saved);
 }finally{Object.assign(globalThis,old);}
});
