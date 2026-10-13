import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {legalRed075,resolveRed075,red075ImpactNull,expireRed075OwnStart,
 legalRed076Raids,resolveRed076Raid,legalRed076Look,resolveRed076Look,
 legalRed076Main,resolveRed076Main,legalRed076Discard,resolveRed076Discard,
 legalRed077Fields,resolveRed077Field,legalRed077Recover,resolveRed077Recover} from '../dist/ttg-red-twelfth-three.mjs';
const c=(uid,id,x={})=>({uid,cardId:id,ready:true,stack:[],under:[],...x});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],
 apCards:[{uid:'A',ready:true},{uid:'B',ready:true}],turnCount:2});
const start=()=>({turn:8,phase:'main',active:0,status:'playing',players:[pl(),pl()]});
const ids=p=>[...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.hand,...p.deck,...p.life,...p.outside,...p.removed].flatMap(function f(c){return [c.uid,...(c.stack||[]).flatMap(f),...(c.under||[]).flatMap(f)]}).sort();
test('075 Nia + 2 Gunmen permit 2 distinct effects but not duplicated; own-start expires null',()=>{
 const s=start(),p=s.players[0];
 p.front[0]=c('g','TTG-1-075');p.front[1]=c('nia','TTG-1-059');
 p.energy[0]=c('gun','TTG-1-076',{stack:[c('sim','TTG-1-051')]});
 const offered=legalRed075(s,0);
 assert.ok(offered.some(x=>x.effects.join(',')==='bp,impactNull'));
 assert.equal(offered.some(x=>x.effects.join(',')==='bp,bp'),false);
 assert.equal(offered.some(x=>x.effects.length===3),false);
 let r=resolveRed075(s,offered.find(x=>x.effects.join(',')==='bp,impactNull'));
 assert.equal(r.players[0].front[0].currentBp,5000);
 assert.equal(red075ImpactNull(r,0,r.players[0].front[0]),true);
 assert.deepEqual(legalRed075(r,0),[]);
 r.players[0].turnCount=3;
 assert.equal(red075ImpactNull(expireRed075OwnStart(r,0),0,r.players[0].front[0]),false);
});
test('076 Simon Raid uses one real AP then selects one top2 to hand and sends other outside',()=>{
 const s=start(),p=s.players[0];p.energy[0]=c('power','TTG-1-066',{gen:10});
 p.front[0]=c('simon','TTG-1-051');p.hand=[c('lagan','TTG-1-076')];
 p.deck=[c('top1','TTG-1-042'),c('top2','TTG-1-043'),c('rest','TTG-1-064')];
 const before=ids(p),a=legalRed076Raids(s,0).find(x=>x.line==='front');
 assert.ok(a);
 let r=resolveRed076Raid(s,{...a,payApUids:['A']});
 assert.equal(r.players[0].front[0].ready,true);
 assert.equal(r.players[0].front[0].stack[0].uid,'simon');
 const option=legalRed076Look(r).find(x=>x.takeUid==='top2');
 r=resolveRed076Look(r,option);
 assert.deepEqual(r.players[0].hand.map(x=>x.uid),['top2']);
 assert.deepEqual(r.players[0].outside.map(x=>x.uid),['top1']);
 assert.deepEqual(r.players[0].deck.map(x=>x.uid),['rest']);
 assert.deepEqual(ids(r.players[0]),before);
});
test('076 MAIN REST/mandatory draw then discard and 077 field outside Gunmen recover',()=>{
 const s=start(),p=s.players[0];
 p.front[0]=c('lagan','TTG-1-076');p.deck=[c('draw','TTG-1-042')];
 const a=legalRed076Main(s,0)[0],initial=ids(p);
 let r=resolveRed076Main(s,a);
 assert.equal(r.players[0].front[0].ready,false);
 assert.equal(r.pending.kind,'ttgRed076Discard');
 r=resolveRed076Discard(r,legalRed076Discard(r)[0]);
 assert.deepEqual(r.players[0].outside.map(x=>x.uid),['draw']);
 assert.deepEqual(ids(r.players[0]),initial);
 const t=start(),owner=t.players[0];
 owner.energy[0]=c('power','TTG-1-066',{gen:10});
 owner.hand=[c('field','TTG-1-077')];owner.outside=[c('outside','TTG-1-072')];
 const before=ids(owner),fieldChoice=legalRed077Fields(t,0)[0];
 let entered=resolveRed077Field(t,{...fieldChoice,payApUids:['A']});
 assert.ok(entered.players[0].energy.some(x=>x?.uid==='field'));
 entered=resolveRed077Recover(entered,legalRed077Recover(entered).find(x=>x.recoverUid==='outside'));
 assert.deepEqual(entered.players[0].hand.map(x=>x.uid),['outside']);
 assert.deepEqual(ids(entered.players[0]),before);
});
