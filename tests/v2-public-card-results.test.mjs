import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicCardResults} from '../server/public-card-results.mjs';

const physical=(uid,cardId)=>({uid,cardId});
function state(){
 return {
  pending:null,
  players:[
   {deck:[physical('0-secret','HIDDEN-1'),physical('0-take','GET-1')],
    hand:[],outside:[],removed:[]},
   {deck:[physical('1-private','HIDDEN-2')],hand:[],outside:[],removed:[]}
  ],
  publicReveals:[],zoneMoveEvents:[]
 };
}
function move(order,owner,uid,cardId,from,to){
 return {order,owner,uid,cardId,from,to,reason:'own-effect'};
}
test('server publishes a chosen full-deck search card, never the rest of the inspected deck',()=>{
 const before=state();
 before.pending={kind:'effect-search-deck',player:0,choices:['0-take']};
 const after=structuredClone(before);
 after.players[0].deck=after.players[0].deck.filter(c=>c.uid!=='0-take');
 after.players[0].hand.push(physical('0-take','GET-1'));
 after.zoneMoveEvents.push(move(17,0,'0-take','GET-1','deck','hand'));
 assert.deepEqual(publicCardResults(before,after,{type:'chooseDeckSearch',uid:'0-take'}),
  [{owner:0,cardId:'GET-1',kind:'hand',label:'檢索公開加入手牌'}]);
 assert.equal(publicCardResults(before,after,{type:'chooseTopOrder',uid:'0-take'}).length,0);
 assert.equal(publicCardResults(before,after,{type:'chooseDeckSearch',uid:'0-secret'}).length,0);
 assert.equal(publicCardResults({...before,pending:null},after,{type:'draw'}).length,0);
});
test('a revealed TOP-N result is public, but a private peek and ordinary draw are not',()=>{
 const before=state(),after=structuredClone(before);
 after.publicReveals.push({kind:'revealed-window',owner:0,uid:'0-secret',
  cardId:'HIDDEN-1',turn:1});
 assert.deepEqual(publicCardResults(before,after,{type:'chooseTopFiltered',uid:'0-take'}),
  [{owner:0,cardId:'HIDDEN-1',kind:'reveal',label:'公開查看'}]);
 const hidden=structuredClone(before);
 hidden.zoneMoveEvents.push(move(7,0,'0-take','GET-1','deck','hand'));
 assert.deepEqual(publicCardResults(before,hidden,{type:'draw'}),[]);
});
test('moving card from deck or hand into outside or removed is visible to both, not a hidden-zone disclosure',()=>{
 const before=state(),after=structuredClone(before);
 after.zoneMoveEvents=[
  move(41,0,'0-secret','HIDDEN-1','deck','outside'),
  move(42,1,'1-private','HIDDEN-2','hand','removed'),
  move(43,0,'0-take','GET-1','deck','hand')
 ];
 assert.deepEqual(publicCardResults(before,after,{type:'chooseTopFiltered',uid:null}),[
  {owner:0,cardId:'HIDDEN-1',kind:'outside',label:'送至場外'},
  {owner:1,cardId:'HIDDEN-2',kind:'removed',label:'送至移除區'}
 ]);
 const nextBefore=structuredClone(before);
 nextBefore.zoneMoveEvents=[move(41,0,'0-secret','HIDDEN-1','deck','outside')];
 assert.deepEqual(publicCardResults(nextBefore,after,{}),[
  {owner:1,cardId:'HIDDEN-2',kind:'removed',label:'送至移除區'}
 ],'old events in a turn must not be replayed');
});
test('public-reveal ring wrap does not leak older identities or replay existing choices',()=>{
 const before=state();
 before.publicReveals=[{kind:'searched-to-hand',owner:0,uid:'0-take',cardId:'GET-1',turn:5}];
 const after=structuredClone(before);
 after.publicReveals.push({kind:'searched-to-hand',owner:1,uid:'1-private',
  cardId:'HIDDEN-2',turn:5});
 assert.deepEqual(publicCardResults(before,after,{}),[
  {owner:1,cardId:'HIDDEN-2',kind:'hand',label:'公開加入手牌'}
 ]);
 const unchanged=publicCardResults(before,before,{type:'draw'});
 assert.deepEqual(unchanged,[]);
});
test('online log uses real authoritative results and renders card images for the opponent',()=>{
 const server=readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8');
 const online=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 assert.match(server,/publicCardResults\(live\.match,next,action\)/);
 assert.match(server,/\{cards:publicCards\}/);
 assert.match(online,/line\.cards/);
 assert.match(online,/cardSrc\(\{cardId:card\.cardId\}\)/);
 assert.match(online,/card\.owner===room\.seat\?'你':'對手'/);
});

test('durable room storage retains only public card fields across reloads',()=>{
 const repo=readFileSync(new URL('../server/repos.mjs',import.meta.url),'utf8');
 assert.match(repo,/Array\.isArray\(entry\.cards\)/);
 assert.match(repo,/\['hand','reveal','outside','removed'\]\.includes\(card\.kind\)/);
 assert.match(repo,/owner:card\.owner,cardId:card\.cardId,kind:card\.kind/);
 assert.match(repo,/\.\.\.\(cards\.length\?\{cards\}:\{\}\)/);
 assert.doesNotMatch(repo,/JSON\.stringify\(room\.log\.map\(entry=>\(\{text:/);
});

test('direct public-zone arrivals and two identical physical copies are each visible',()=>{
 const before=state(),after=structuredClone(before);
 after.players[0].outside=[
  physical('0-copy-a','CARD-X'),physical('0-copy-b','CARD-X')];
 after.players[1].removed=[physical('1-removed','CARD-Y')];
 assert.deepEqual(publicCardResults(before,after,{}),[
  {owner:0,cardId:'CARD-X',kind:'outside',label:'送至場外'},
  {owner:0,cardId:'CARD-X',kind:'outside',label:'送至場外'},
  {owner:1,cardId:'CARD-Y',kind:'removed',label:'送至移除區'}
 ]);
 after.zoneMoveEvents.push(move(10,0,'0-copy-a','CARD-X','deck','outside'));
 assert.equal(publicCardResults(before,after,{}).length,3,
  'the same arrival via both ledger and visible destination is shown once');
});
