import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice} from '../dist/ttg-green-life.mjs';
import {ttgRedStarterBpBonus,ttgRedStarterImpactNull,beginTtgRed044Unblocked,legalTtgRed044Search,resolveTtgRed044Search} from '../dist/ttg-red-first-three.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const c=(uid,id,props={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...props});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],
 life:[],outside:[],removed:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:true}]});
const fixture=()=>({turn:5,phase:'attack',active:0,status:'playing',players:[pl(),pl()],pending:null,log:[]});
const total=(p)=>[...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.hand,...p.deck,...p.life,...p.outside,...p.removed]
 .flatMap(function recur(x){return [x.uid,...(x.stack||[]).flatMap(recur),...(x.under||[]).flatMap(recur)]}).sort();
test('red 042 printed ACTIVE life wakes character and adds 3000 BP, red 043 printed DRAW transfers exactly one physical card',()=>{
 const s=fixture();s.players[0].front[0]=c('kamina','TTG-1-044',{ready:false});
 s.players[0].life=[c('a','TTG-1-042'),c('b','TTG-1-005')];
 const ready=beginTtgLifeTrigger(s,{player:0,lifeUid:'a'});
 const option=legalTtgLifeChoices(ready).find(o=>o.mode==='active'&&o.targetUid==='kamina');
 assert.ok(option);
 const done=resolveTtgLifeChoice(ready,option);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(done.players[0].front[0].currentBp,6500);
 assert.equal(done.players[0].outside[0].uid,'a');
 assert.equal(done.pendingTtgLife,null);
 assert.equal(s.players[0].front[0].ready,false);
 const d=fixture();d.players[0].life=[c('draw','TTG-1-043'),c('ordinary','TTG-1-005')];
 d.players[0].deck=[c('top','TTG-1-006')];
 const next=beginTtgLifeTrigger(d,{player:0,lifeUid:'draw'});
 assert.deepEqual(next.players[0].hand.map(x=>x.uid),[]);
 assert.deepEqual(next.players[0].outside.map(x=>x.uid),['draw']);
 assert.equal(next.pendingTtgLife?.trigger,'draw');
 assert.deepEqual(legalTtgLifeChoices(next).map(x=>x.mode),['draw','decline']);
 const drawn=resolveTtgLifeChoice(next,legalTtgLifeChoices(next)[0]);
 assert.deepEqual(drawn.players[0].hand.map(x=>x.uid),['top']);
 const skipped=resolveTtgLifeChoice(next,legalTtgLifeChoices(next)[1]);
 assert.deepEqual(skipped.players[0].hand,[]);
 assert.deepEqual(skipped.players[0].deck.map(x=>x.uid),['top']);
 assert.equal(ttgRedStarterImpactNull(c('k','TTG-1-043')),true);
 assert.equal(ttgRedStarterImpactNull(c('other','TTG-1-042')),false);
});
test('044 +500 BP continuously checks own turn and Simon on field or Raid base',()=>{
 const s=fixture(),k=c('k','TTG-1-044');
 s.players[0].front[0]=k;
 assert.equal(ttgRedStarterBpBonus(s,0,k),0);
 s.players[0].energy[0]=c('sim','TTG-1-009');
 assert.equal(ttgRedStarterBpBonus(s,0,k),500);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=c('raid','TTG-1-027',{stack:[c('sim2','TTG-1-009')]});
 assert.equal(ttgRedStarterBpBonus(s,0,k),500);
 s.active=1;
 assert.equal(ttgRedStarterBpBonus(s,0,k),0);
});
test('044 Q2285 optional search: skip preserves top, reveal 7 + take Gurren requires discard and order validation',()=>{
 const s=fixture(),p=s.players[0];p.front[0]=c('k','TTG-1-044',{attackTurn:5});
 p.hand=[c('hand','TTG-1-042')];
 p.deck=[c('one','TTG-1-005'),c('g','TTG-1-072'),c('two','TTG-1-006'),
  c('three','TTG-1-007'),c('four','TTG-1-008'),c('five','TTG-1-009'),c('six','TTG-1-010'),c('rest','TTG-1-011')];
 const before=total(p),opened=beginTtgRed044Unblocked(s,{player:0,attackerUid:'k'});
 assert.equal(opened.pending.kind,'ttgRed044Search');
 assert.deepEqual(opened.players[0].deck.map(x=>x.uid),p.deck.map(x=>x.uid));
 const options=legalTtgRed044Search(opened);
 const skipped=resolveTtgRed044Search(opened,options.find(x=>x.mode==='skip'));
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.map(x=>x.uid),p.deck.map(x=>x.uid),'skip is NOT a search or move-to-bottom');
 const chosen=options.find(x=>x.takeUid==='g'&&x.discardUid==='hand');
 assert.ok(chosen);
 assert.throws(()=>resolveTtgRed044Search(opened,{...chosen,discardUid:null}),/Illegal 044/);
 assert.throws(()=>resolveTtgRed044Search(opened,{...chosen,bottomOrderUids:['one','one']}),/bottom order/);
 const resolved=resolveTtgRed044Search(opened,{...chosen,bottomOrderUids:[...chosen.bottomOrderUids].reverse()});
 assert.deepEqual(resolved.players[0].hand.map(x=>x.uid),['g']);
 assert.deepEqual(resolved.players[0].outside.map(x=>x.uid),['hand']);
 assert.deepEqual(resolved.players[0].deck.map(x=>x.uid),['rest',...chosen.bottomOrderUids].slice(0,1).concat([...chosen.bottomOrderUids].reverse()));
 assert.deepEqual(total(resolved.players[0]),before,'physical cards conserved');
 assert.equal(resolved.pending,null);
 assert.deepEqual(p.deck.map(x=>x.uid).slice(0,2),['one','g'],'pure reducer');
});
test('042/043/044: 50-card restricted match defers unblocked 044 life damage until search skip is resolved',()=>{
 const counts=Object.fromEntries(['042','043','044','047','048','064','065','066','005','006','019','002'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 let s=newTtgCoreMatch({decks:[counts,counts],seed:13});
 const p=s.players[0];
 const locations=['hand','deck','life','outside'];
 let found;
 for(const z of locations){
  const i=p[z].findIndex(x=>x.cardId==='TTG-1-044');
  if(i>=0){found=p[z].splice(i,1)[0];break;}
 }
 assert.ok(found);
 p.front[0]={...found,ready:true,attackTurn:-1};
 p.turnCount=2;s.phase='attack';
 s=withTtgDerivedEnergy(s,0);
 assert.ok(assertTtgCoreState(s));
 const attacking=dispatchTtgCoreAction(s,{type:'attack',uid:found.uid});
 assert.equal(attacking.pending.kind,'block');
 const blocked=dispatchTtgCoreAction(attacking,{type:'block',blockUid:null});
 assert.equal(blocked.pending.kind,'ttgRed044Search');
 assert.equal(blocked.players[1].life.length,7,'no damage before search resolves');
 const skip=legalTtgCoreActions(blocked).find(x=>x.mode==='skip');
 assert.ok(skip);
 const after=dispatchTtgCoreAction(blocked,skip);
 assert.equal(after.players[1].life.length,6);
 assert.ok(assertTtgCoreState(after));
});
