import test from 'node:test';
import assert from 'node:assert/strict';
import {legalTtgChainRaids,dispatchTtgChainRaid} from '../dist/ttg-chain-raid.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';

const card=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id]?.nameJa,ready:false,stack:[],under:[],...extra});
const player=()=>({front:[null,null,null,null],energy:[null,null,null,null],outside:[],hand:[],deck:[],energyProduced:{green:100,red:5},apCards:[{uid:'A',ready:true},{uid:'B',ready:true}]});
const game=()=>({phase:'main',active:0,turn:3,players:[player(),player()],log:[]});
const ids=c=>c?[c.uid,...(c.stack||[]).flatMap(ids),...(c.under||[]).flatMap(ids)]:[];
const all=p=>[...p.hand,...p.deck,...p.outside,...p.front.filter(Boolean),...p.energy.filter(Boolean)].flatMap(ids).sort();
const start=()=>{
 const s=game();
 s.players[0].energy[0]=card('g','TTG-1-029',{ready:true,stack:[card('s','TTG-1-009')]});
 s.players[0].hand=[card('arc','TTG-1-027'),card('super','TTG-1-031'),card('ultimate','TTG-1-032')];
 return s;
};
const act=(s,handUid,sourceUid,line='energy',slot=0)=>dispatchTtgChainRaid(s,{player:0,handUid,sourceUid,line,slot,payApUids:['A']});
test('Q2393 Arc Gurren Lagann moves previous Raid top face-down but preserves base UID',()=>{
 const s=start(),before=JSON.stringify(s),physical=all(s.players[0]);
 const options=legalTtgChainRaids(s,0).filter(x=>x.cardId==='TTG-1-027');
 assert.ok(options.some(x=>x.sourceUid==='g'&&x.line==='front'));
 const r=act(s,'arc','g','front',0);
 assert.equal(JSON.stringify(s),before,'pure cloned state');
 const x=r.players[0].front[0];
 assert.equal(x.cardId,'TTG-1-027');assert.equal(x.ready,true);
 assert.equal(x.stack[0].uid,'s');assert.deepEqual(x.under,[{uid:'g',cardId:'TTG-1-029',faceDown:true}]);
 assert.equal(r.players[0].energy[0],null);
 assert.equal(r.players[0].apCards[0].ready,false);
 assert.deepEqual(all(r.players[0]),physical,'all printed cards conserved');
 assert.equal(r.pending.kind,'ttgUnimplementedRaidEntry','do not silently skip mandatory on-entry effects');
 assert.deepEqual(inspectFacedownUnder(x,{viewer:1,owner:0}),[{faceDown:true}]);
 assert.deepEqual(inspectFacedownUnder(x,{viewer:0,owner:0}).map(c=>c.uid),['g']);
});
test('Q2394 Super Galaxy upgrade preserves ordered older facedown cards',()=>{
 let s=start();s=act(s,'arc','g');
 s.pending=null;s.players[0].apCards[0].ready=true;
 const before=all(s.players[0]);
 const next=act(s,'super','arc');
 const top=next.players[0].energy[0];
 assert.equal(top.uid,'super');assert.equal(top.stack[0].uid,'s');
 assert.deepEqual(top.under.map(x=>x.uid),['g','arc']);
 assert.ok(top.under.every(x=>x.faceDown));
 assert.deepEqual(all(next.players[0]),before);
});
test('Q2395 final Ultimate can only upgrade old Super Galaxy Raider not from this turn',()=>{
 let s=start();s=act(s,'arc','g');
 s.pending=null;s.players[0].apCards[0].ready=true;
 s=act(s,'super','arc');
 s.pending=null;s.players[0].apCards[0].ready=true;
 assert.deepEqual(legalTtgChainRaids(s,0).filter(x=>x.cardId==='TTG-1-032'),[]);
 assert.throws(()=>act(s,'ultimate','super'),/Illegal special RAID/);
 s.turn++;
 const opts=legalTtgChainRaids(s,0).filter(x=>x.cardId==='TTG-1-032');
 assert.equal(opts.length,5,'existing energy position plus four empty front slots');
 const final=act(s,'ultimate','super');
 assert.deepEqual(final.players[0].energy[0].under.map(x=>x.uid),['g','arc','super']);
 assert.equal(final.players[0].energy[0].stack[0].uid,'s');
 assert.equal(final.players[0].energy[0].cardId,'TTG-1-032');
 assert.equal(final.pending.cardId,'TTG-1-032');
 assert.deepEqual(all(final.players[0]),all(s.players[0]));
});
test('special chain RAID refuses wrong base, AP, color energy, opponent target or occupied front',()=>{
 for(const mutate of [
  x=>{x.players[0].energy[0].stack=[card('other','TTG-1-042')];},
  x=>{x.players[0].energyProduced.green=6;},
  x=>{x.players[0].apCards.forEach(c=>c.ready=false);},
  x=>{x.phase='attack';},
  x=>{x.active=1;},
  x=>{x.players[0].energy[0].stack=[];},
  x=>{x.players[0].front[0]=card('block','TTG-1-005');}
 ]){
  const x=start();mutate(x);
  const original=JSON.stringify(x);
  assert.throws(()=>act(x,'arc','g','front',0));
  assert.equal(JSON.stringify(x),original);
 }
});
test('cannot upgrade with copied UID, unexpected non-facedown extras, or another Ultimate on field',()=>{
 const s=start();
 s.players[0].energy[0].under=[{uid:'fake',cardId:'TTG-1-009',faceDown:false}];
 assert.equal(legalTtgChainRaids(s,0).filter(x=>x.cardId==='TTG-1-027').length,0);
 let next=start();next=act(next,'arc','g');
 next.pending=null;next.players[0].apCards[0].ready=true;
 next=act(next,'super','arc');
 next.pending=null;next.players[0].apCards[0].ready=true;next.turn++;
 next.players[0].front[0]=card('otherUltimate','TTG-1-032');
 assert.equal(legalTtgChainRaids(next,0).filter(x=>x.cardId==='TTG-1-032').length,0);
});
test('all 50 card identities conserved after three chained special RAID upgrades',()=>{
 let s=start();
 for(let i=0;i<43;i++)s.players[0].deck.push(card('d'+i,i%2?'TTG-1-042':'TTG-1-005'));
 s.players[0].hand.push(card('h45','TTG-1-019'),card('h46','TTG-1-064'));
 assert.equal(all(s.players[0]).length,50);
 const initial=all(s.players[0]);
 s=act(s,'arc','g');
 s.pending=null;s.players[0].apCards[0].ready=true;
 s=act(s,'super','arc');
 s.pending=null;s.players[0].apCards[0].ready=true;s.turn++;
 s=act(s,'ultimate','super');
 assert.equal(all(s.players[0]).length,50);
 assert.deepEqual(all(s.players[0]),initial);
 assert.equal(new Set(all(s.players[0])).size,50);
});
