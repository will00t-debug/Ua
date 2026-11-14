// Round 14 D. Full sentences for the shared operations A unlocked.
// 076 stays pending: a full front does not remove a card before the move.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMhaV2Pack,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';

const base=createMhaV2Pack();
const readyShells=mhaEditorCards().map(card=>{
 const program=mhaProgramFor(card.id);
 return program?.ready===true?mhaBattleCard(card,program):null;
}).filter(Boolean);

function body(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'green',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??1500,gen:extra.gen??1,traits:extra.traits||[],
  trigger:extra.trigger??null,implementation:extra.implementation||'vanilla',
  effects:extra.effects||{},
  ...(extra.raidName?{raidName:extra.raidName}:{})
 };
}
function open(want,seed,extras=[]){
 const pack=extras.length?createUniversalPack({
  id:'mha-d14',version:'d14-'+seed,
  cards:[...readyShells,...extras.map(body)]
 }):base;
 const counts={...want};
 for(const extra of extras)if(!counts[extra.id])counts[extra.id]=1;
 let total=Object.values(counts).reduce((a,b)=>a+b,0);
 const triggers={color:0,special:0,final:0};
 for(const [id,num] of Object.entries(counts)){
  const kind=pack.cards[id]?.trigger;
  if(triggers[kind]!=null)triggers[kind]+=num;
 }
 for(const id of Object.keys(pack.cards)){
  if(total>=50)break;
  const printed=pack.cards[id];
  const kind=printed.trigger;
  const room=Math.min(4-(counts[id]||0),50-total,
   triggers[kind]!=null?4-triggers[kind]:4);
  if(room<=0)continue;
  counts[id]=(counts[id]||0)+room;
  total+=room;
  if(triggers[kind]!=null)triggers[kind]+=room;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error(s.pending.kind+' before main');
  s=dispatchUniversalAction(pack,s,{type:'next'});
 }
 return {pack,s};
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','life','lifeRevealed','outside','removed']){
  const list=pl[zone];
  if(!Array.isArray(list))continue;
  const index=list.findIndex(c=>c?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function hold(s,owner,id){
 const card=s.players[owner].hand.find(c=>c.cardId===id)||pull(s,owner,id);
 if(!s.players[owner].hand.includes(card))s.players[owner].hand.push(card);
 return card;
}
function seat(s,owner,id,line,slot,ready=true){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function fuel(s,owner,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,owner,id);
  card.ready=false;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner].energy[i]=card;
 });
}
function readyAp(s,n){
 s.players[0].apCards.forEach((card,index)=>{
  if(index<n){card.inPlay=true;card.ready=true;}
 });
}
function reach(pack,s,phase){
 for(let i=0;i<8&&s.phase!==phase;i++){
  if(s.pending)throw Error(s.pending.kind+' before '+phase);
  s=act(pack,s,{type:'next'});
 }
 if(s.phase!==phase)throw Error('Stopped in '+s.phase);
 return s;
}
function play(pack,s,id,line='front',slot){
 const card=hold(s,0,id);
 const action=legal(pack,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line&&
  (slot===undefined||a.slot===slot));
 assert.ok(action,'no play '+id+' '+line);
 return act(pack,s,action);
}
function keep(s,ids,owner=0){
 const kept=ids.map(id=>hold(s,owner,id));
 s.players[owner].deck.push(...s.players[owner].hand.filter(c=>!kept.includes(c)));
 s.players[owner].hand=kept;
 return kept;
}

test('MHA-1-056 tucks one hand card under a named host and buffs only after stripping it',()=>{
 const named=body({id:'AMAJIKI',name:'天喰 環'});
 const other=body({id:'BYSTANDER',name:'路人'});
 let opened=open({'MHA-1-056':2,'MHA-1-057':4,'MHA-1-078':2},5601,[named,other]);
 fuel(opened.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(opened.s,1);
 const host=seat(opened.s,0,'AMAJIKI','front',1,true);
 seat(opened.s,0,'BYSTANDER','front',2,true);
 const pay=hold(opened.s,0,'MHA-1-078');
 let s=play(opened.pack,opened.s,'MHA-1-056');
 assert.equal(s.pending.kind,'effect-tuck-facedown');
 assert.equal(s.pending.step,'host');
 const hosts=legal(opened.pack,s).filter(a=>a.type==='chooseTuckFacedown'&&a.uid);
 assert.equal(hosts.some(a=>a.uid===s.players[0].front[0].uid),true);
 assert.equal(hosts.some(a=>a.uid===host.uid),true);
 assert.equal(hosts.some(a=>a.uid===s.players[0].front[2].uid),false);
 const deck=s.players[0].deck.length;
 s=act(opened.pack,s,a=>a.uid===host.uid);
 s=act(opened.pack,s,a=>a.type==='chooseTuckFacedown'&&a.uid===pay.uid);
 assert.equal(s.players[0].front[1].under[0].cardId,'MHA-1-078');
 assert.equal(s.players[0].front[1].under[0].faceDown,true);
 assert.equal(s.players[0].deck.length,deck-1);
 const mine=universalPublicView(opened.pack,s,0).players[0].front[1].underLayers[0];
 const theirs=universalPublicView(opened.pack,s,1).players[0].front[1].underLayers[0];
 assert.equal(mine.cardId,'MHA-1-078');
 assert.equal(theirs.faceDown,true);
 assert.equal(theirs.cardId,undefined);
 const skipped=open({'MHA-1-056':1,'MHA-1-057':4,'MHA-1-078':1},5602);
 fuel(skipped.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(skipped.s,1);
 hold(skipped.s,0,'MHA-1-078');
 const before=skipped.s.players[0].deck.length;
 s=play(skipped.pack,skipped.s,'MHA-1-056');
 s=act(skipped.pack,s,a=>a.type==='chooseTuckFacedown'&&a.uid===null);
 assert.equal((s.players[0].front[0].under||[]).length,0);
 assert.equal(s.players[0].deck.length,before);
 const empty=open({'MHA-1-056':1,'MHA-1-057':4},5603);
 fuel(empty.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(empty.s,1);
 keep(empty.s,['MHA-1-056']);
 const quietDeck=empty.s.players[0].deck.length;
 s=play(empty.pack,empty.s,'MHA-1-056');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,quietDeck);
 const gone=open({'MHA-1-056':1,'MHA-1-057':4,'MHA-1-078':1},5604);
 fuel(gone.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(gone.s,1);
 hold(gone.s,0,'MHA-1-078');
 s=play(gone.pack,gone.s,'MHA-1-056');
 const left=s.players[0].front[0];
 s.players[0].front[0]=null;
 s.players[0].outside.push(left);
 assert.deepEqual(legal(gone.pack,s).filter(a=>a.type==='chooseTuckFacedown'),
  [{type:'chooseTuckFacedown',uid:null}]);
 s=act(gone.pack,s,a=>a.uid===null);
 assert.equal(s.players[0].hand.some(c=>c.cardId==='MHA-1-078'),true);
 const attack=open({'MHA-1-056':1,'MHA-1-057':4,'MHA-1-078':1},5605);
 fuel(attack.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(attack.s,1);
 const buried=hold(attack.s,0,'MHA-1-078');
 s=play(attack.pack,attack.s,'MHA-1-056');
 s=act(attack.pack,s,a=>a.uid===buried.uid);
 const self=s.players[0].front[0];
 self.ready=true;
 s=reach(attack.pack,s,'attack');
 s=act(attack.pack,s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-strip-facedown');
 const layer=self.under[0];
 const stranger=s.players[0].hand[0];
 assert.equal(legal(attack.pack,s).some(a=>a.uid===layer.uid),true);
 assert.equal(legal(attack.pack,s).some(a=>a.uid===stranger?.uid),false);
 assert.throws(()=>dispatchUniversalAction(attack.pack,s,
  {type:'chooseStripFacedown',uid:stranger?stranger.uid:'missing'}),/not currently legal/);
 s=act(attack.pack,s,a=>a.type==='chooseStripFacedown'&&a.uid===null);
 assert.equal(universalBp(attack.pack,s,self),3000);
 const paid=open({'MHA-1-056':1,'MHA-1-057':4,'MHA-1-078':1},5606);
 fuel(paid.s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(paid.s,1);
 const cost=hold(paid.s,0,'MHA-1-078');
 s=play(paid.pack,paid.s,'MHA-1-056');
 s=act(paid.pack,s,a=>a.uid===cost.uid);
 const fighter=s.players[0].front[0];
 fighter.ready=true;
 s=reach(paid.pack,s,'attack');
 s=act(paid.pack,s,{type:'attack',uid:fighter.uid});
 const under=s.players[0].front[0].under[0].uid;
 s=act(paid.pack,s,a=>a.type==='chooseStripFacedown'&&a.uid===under);
 assert.equal(s.players[0].outside.some(c=>c.uid===under),true);
 assert.equal(universalBp(paid.pack,s,s.players[0].front[0]),5000);
});

test('MHA-1-059 deploys one affordable green AP-1 character active or by raid',()=>{
 const child=body({id:'CHILD',name:'子',energy:1,raidName:'親',implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1}]}});
 const parent=body({id:'PARENT',name:'親'});
 const heavy=body({id:'HEAVY',energy:4});
 const wide=body({id:'WIDE',ap:2});
 const red=body({id:'RED-ONE',color:'red'});
 const cost3=body({id:'COST3',energy:3});
 const extras=[child,parent,heavy,wide,red,cost3];
 let opened=open({'MHA-1-059':1,'MHA-1-057':4,'CHILD':1,'PARENT':1,'HEAVY':1,
  'WIDE':1,'RED-ONE':1,'COST3':1},5901,extras);
 fuel(opened.s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(opened.s,2);
 const base=seat(opened.s,0,'PARENT','energy',3,false);
 for(const id of ['CHILD','HEAVY','WIDE','RED-ONE','COST3','MHA-1-057'])hold(opened.s,0,id);
 let s=play(opened.pack,opened.s,'MHA-1-059');
 assert.equal(s.pending.kind,'effect-hand-active-or-raid');
 const shown=legal(opened.pack,s).filter(a=>a.uid).map(a=>s.players[0].hand.find(c=>c.uid===a.uid).cardId);
 for(const id of ['CHILD','MHA-1-057','COST3'])assert.equal(shown.includes(id),true,id);
 for(const id of ['HEAVY','WIDE','RED-ONE'])assert.equal(shown.includes(id),false,id);
 assert.equal(legal(opened.pack,s).some(a=>a.mode==='enter'),false);
 const childUid=s.players[0].hand.find(c=>c.cardId==='CHILD').uid;
 const deck=s.players[0].deck.length;
 s=act(opened.pack,s,a=>a.type==='chooseHandActiveOrRaid'&&a.mode==='active'&&
  a.uid===childUid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===childUid).ready,true);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].front.filter(c=>c?.cardId==='COST3').length,0);
 const skipped=open({'MHA-1-059':1,'MHA-1-057':4,'COST3':1},5907,extras);
 fuel(skipped.s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(skipped.s,2);
 hold(skipped.s,0,'COST3');
 s=play(skipped.pack,skipped.s,'MHA-1-059');
 s=act(skipped.pack,s,a=>a.type==='chooseHandActiveOrRaid'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal([...s.players[0].front,...s.players[0].energy].some(c=>c?.cardId==='COST3'),false);
 const raided=open({'MHA-1-059':1,'MHA-1-057':4,'CHILD':1,'PARENT':1},5902,extras);
 fuel(raided.s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(raided.s,2);
 const raidBase=seat(raided.s,0,'PARENT','front',1,true);
 hold(raided.s,0,'CHILD');
 s=play(raided.pack,raided.s,'MHA-1-059');
 const raid=legal(raided.pack,s).find(a=>a.mode==='raid'&&a.baseUid===raidBase.uid);
 assert.ok(raid);
 s=act(raided.pack,s,raid);
 assert.equal([...s.players[0].front,...s.players[0].energy].some(c=>
  c?.cardId==='CHILD'&&c.stack?.[0]?.cardId==='PARENT'),true);
 const broke=open({'MHA-1-059':1,'MHA-1-057':4,'COST3':1},5903,extras);
 fuel(broke.s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(broke.s,2);
 hold(broke.s,0,'COST3');
 s=play(broke.pack,broke.s,'MHA-1-059');
 const costly=s.players[0].hand.find(c=>c.cardId==='COST3');
 for(const line of ['front','energy']){
  s.players[0][line].forEach((card,index)=>{
   if(!card||card.cardId==='MHA-1-059')return;
   s.players[0][line][index]=null;
   s.players[0].outside.push(card);
  });
 }
 assert.equal(legal(broke.pack,s).some(a=>a.uid===costly.uid),false);
 assert.throws(()=>dispatchUniversalAction(broke.pack,s,{type:'chooseHandActiveOrRaid',
  mode:'active',uid:costly.uid,line:'front',slot:1}),/not currently legal/);
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==costly.uid);
 s.players[0].outside.push(costly);
 assert.throws(()=>dispatchUniversalAction(broke.pack,s,{type:'chooseHandActiveOrRaid',
  mode:'active',uid:costly.uid,line:'front',slot:1}),/not currently legal/);
 const trigger=open({'MHA-1-059':1,'MHA-1-057':1,'COST3':1,'MHA-1-078':1},5904,extras);
 const revealed=pull(trigger.s,1,'MHA-1-059');
 trigger.s.players[1].deck.push(trigger.s.players[1].life[0]);
 trigger.s.players[1].life[0]=revealed;
 const legalChild=hold(trigger.s,1,'MHA-1-057');
 const tooMuch=hold(trigger.s,1,'COST3');
 const redCard=hold(trigger.s,1,'MHA-1-078');
 const attacker=seat(trigger.s,0,'MHA-1-078','front',0,true);
 s=reach(trigger.pack,trigger.s,'attack');
 s=act(trigger.pack,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')s=act(trigger.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'color');
 assert.equal(legal(trigger.pack,s).some(a=>a.mode==='color'&&a.uid===legalChild.uid),true);
 assert.equal(legal(trigger.pack,s).some(a=>a.uid===tooMuch.uid),false);
 assert.equal(legal(trigger.pack,s).some(a=>a.uid===redCard.uid),false);
 s=act(trigger.pack,s,a=>a.mode==='color'&&a.uid===legalChild.uid&&a.line==='front');
 assert.equal(s.players[1].front.find(c=>c?.uid===legalChild.uid).ready,true);
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 void base;
});

test('MHA-1-071 must put one hand card outside and does not draw',()=>{
 let opened=open({'MHA-1-071':1,'MHA-1-078':4,'MHA-1-082':1},7101);
 fuel(opened.s,0,['MHA-1-078','MHA-1-078','MHA-1-078']);
 readyAp(opened.s,1);
 const kept=hold(opened.s,0,'MHA-1-082');
 const paid=hold(opened.s,0,'MHA-1-078');
 keep(opened.s,['MHA-1-071',kept.cardId,paid.cardId]);
 const deck=opened.s.players[0].deck.length;
 let s=play(opened.pack,opened.s,'MHA-1-071');
 assert.equal(s.pending.kind,'effect-place-hand-outside');
 assert.equal(legal(opened.pack,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'choosePlaceHandOutside',uid:'missing'}),/not currently legal/);
 const moved=s.players[0].hand.find(c=>c.uid===paid.uid);
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==moved.uid);
 s.players[0].deck.push(moved);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'choosePlaceHandOutside',uid:moved.uid}),/not currently legal/);
 opened=open({'MHA-1-071':1,'MHA-1-078':4,'MHA-1-082':1},7102);
 fuel(opened.s,0,['MHA-1-078','MHA-1-078','MHA-1-078']);
 readyAp(opened.s,1);
 const stay=hold(opened.s,0,'MHA-1-082');
 const cost=hold(opened.s,0,'MHA-1-078');
 keep(opened.s,['MHA-1-071','MHA-1-082','MHA-1-078']);
 const keptDeck=opened.s.players[0].deck.length;
 s=play(opened.pack,opened.s,'MHA-1-071');
 s=act(opened.pack,s,a=>a.type==='choosePlaceHandOutside'&&a.uid===cost.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===cost.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===stay.uid),true);
 assert.equal(s.players[0].deck.length,keptDeck);
 const bare=open({'MHA-1-071':1,'MHA-1-078':4},7103);
 fuel(bare.s,0,['MHA-1-078','MHA-1-078','MHA-1-078']);
 readyAp(bare.s,1);
 keep(bare.s,['MHA-1-071']);
 const bareDeck=bare.s.players[0].deck.length;
 s=play(bare.pack,bare.s,'MHA-1-071');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].deck.length,bareDeck);
});

test('MHA-1-074 stays once for an opponent effect on its own turn, and battle does not spend that stay',()=>{
 let opened=open({'MHA-1-074':1,'MHA-1-078':4,'MHA-1-064':1,'MHA-1-097':1},7401);
 const self=seat(opened.s,0,'MHA-1-074','front',1,true);
 const first=seat(opened.s,0,'MHA-1-078','front',0,true);
 const second=seat(opened.s,0,'MHA-1-078','front',2,true);
 const life=[pull(opened.s,1,'MHA-1-064'),pull(opened.s,1,'MHA-1-097')];
 opened.s.players[1].life.unshift(...life);
 let s=reach(opened.pack,opened.s,'attack');
 s=act(opened.pack,s,{type:'attack',uid:first.uid});
 if(s.pending?.kind==='block')s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 s=act(opened.pack,s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===self.uid);
 assert.equal(s.players[0].front[1].uid,self.uid);
 assert.equal(s.mainAbilityUsedUids.includes(self.uid+'|oppLeave'),true);
 s=act(opened.pack,s,{type:'attack',uid:second.uid});
 if(s.pending?.kind==='block')s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'special');
 s=act(opened.pack,s,a=>a.mode==='special'&&a.uid===self.uid);
 assert.equal(s.players[0].front[1],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===self.uid),true);
 const wallCard=body({id:'WALL',bp:5000});
 const battle=open({'MHA-1-074':2,'WALL':1,'MHA-1-078':2},7402,[wallCard]);
 const loser=seat(battle.s,0,'MHA-1-074','front',0,true);
 const wall=seat(battle.s,1,'WALL','front',0,true);
 const smaller=seat(battle.s,1,'MHA-1-078','front',1,true);
 const winner=seat(battle.s,0,'MHA-1-074','front',1,true);
 s=reach(battle.pack,battle.s,'attack');
 s=act(battle.pack,s,{type:'attack',uid:loser.uid});
 s=act(battle.pack,s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.players[0].front[0].uid,loser.uid);
 assert.equal(s.players[1].front[0].uid,wall.uid);
 assert.equal(s.mainAbilityUsedUids.includes(loser.uid+'|oppLeave'),false);
 s=act(battle.pack,s,{type:'attack',uid:winner.uid});
 s=act(battle.pack,s,a=>a.type==='chooseBlock'&&a.uid===smaller.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===smaller.uid),true);
 assert.equal(s.players[0].front[1].uid,winner.uid);
 assert.equal(s.mainAbilityUsedUids.includes(winner.uid+'|oppLeave'),false);
 const hit=body({id:'HIT-074',effects:{onPlay:[{op:'retireOppFrontOne'}]},implementation:'dsl'});
 const away=open({'MHA-1-074':1,'HIT-074':1,'MHA-1-078':2},7403,[hit]);
 const kirishima=seat(away.s,0,'MHA-1-074','front',0,true);
 s=passTo(away.pack,away.s,1,'main');
 hold(s,1,'HIT-074');
 const played=legal(away.pack,s).find(a=>a.type==='play'&&a.uid===s.players[1].hand.find(c=>c.cardId==='HIT-074').uid);
 assert.ok(played);
 s=act(away.pack,s,played);
 s=act(away.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===kirishima.uid);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===kirishima.uid),true);
 assert.equal(s.mainAbilityUsedUids.includes(kirishima.uid+'|oppLeave'),false);
});

function passTo(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending){
   const skip=legal(pack,s).find(a=>a.uid===null||a.mode==='skip'||a.mode==='decline');
   if(!skip)throw Error('Pending '+s.pending.kind+' blocked '+player+' '+phase);
   s=act(pack,s,skip);
  }else s=act(pack,s,{type:'next'});
  if(++guard>40)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}

test('MHA-1-087 draws on retirement until the hand has two cards',()=>{
 const hit=body({id:'HIT-087',effects:{onPlay:[{op:'retireOppFrontOne'}]},implementation:'dsl'});
 function retire(seed,handIds,deckLeft){
  const opened=open({'MHA-1-087':1,'HIT-087':1,'MHA-1-078':4},seed,[hit]);
  const victim=seat(opened.s,1,'MHA-1-087','front',0,true);
  const kept=handIds.map(id=>pull(opened.s,1,id));
  opened.s.players[1].deck.push(...opened.s.players[1].hand.splice(0));
  opened.s.players[1].hand=kept;
  if(deckLeft!==undefined){
   const rest=opened.s.players[1].deck.splice(deckLeft);
   opened.s.players[1].outside.push(...rest);
  }
  readyAp(opened.s,1);
  let s=play(opened.pack,opened.s,'HIT-087');
  s=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===victim.uid);
  return s;
 }
 let s=retire(8701,[],undefined);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.players[1].outside.some(c=>c.cardId==='MHA-1-087'),true);
 s=retire(8702,['MHA-1-078','MHA-1-078'],undefined);
 const deck=s.players[1].deck.length;
 assert.equal(s.players[1].hand.length,2);
 s=retire(8703,[],0);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].deck.length,0);
 s=retire(8704,['MHA-1-078'],1);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.players[1].deck.length,0);
 void deck;
});

test('MHA-1-089 draws on play only at three or fewer cards, and its trigger retires 2500',()=>{
 function enter(seed,handCount){
  const opened=open({'MHA-1-089':1,'MHA-1-078':4},seed);
  fuel(opened.s,0,['MHA-1-078','MHA-1-078','MHA-1-078']);
  readyAp(opened.s,1);
  const self=pull(opened.s,0,'MHA-1-089');
  const fillers=[];
  for(let i=0;i<handCount-1;i++)fillers.push(opened.s.players[0].deck.pop());
  opened.s.players[0].deck.push(...opened.s.players[0].hand.splice(0));
  opened.s.players[0].hand=[self,...fillers];
  const deck=opened.s.players[0].deck.length;
  const s=play(opened.pack,opened.s,'MHA-1-089');
  return {s,deck,pack:opened.pack};
 }
 let drawn=enter(8901,4);
 assert.equal(drawn.s.pending,null);
 assert.equal(drawn.s.players[0].hand.length,4);
 assert.equal(drawn.s.players[0].deck.length,drawn.deck-1);
 let quiet=enter(8902,5);
 assert.equal(quiet.s.players[0].hand.length,4);
 assert.equal(quiet.s.players[0].deck.length,quiet.deck);
 const trigger=open({'MHA-1-089':1,'MHA-1-078':2,'MHA-1-080':1},8903);
 const revealed=pull(trigger.s,1,'MHA-1-089');
 trigger.s.players[1].deck.push(trigger.s.players[1].life[0]);
 trigger.s.players[1].life[0]=revealed;
 const low=seat(trigger.s,0,'MHA-1-078','front',0,true);
 const high=seat(trigger.s,0,'MHA-1-080','front',1,true);
 const attacker=seat(trigger.s,0,'MHA-1-078','front',2,true);
 let s=reach(trigger.pack,trigger.s,'attack');
 s=act(trigger.pack,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')s=act(trigger.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'color');
 assert.equal(legal(trigger.pack,s).some(a=>a.mode==='colorRetire'&&a.uid===low.uid),true);
 assert.equal(legal(trigger.pack,s).some(a=>a.uid===high.uid),false);
 s=act(trigger.pack,s,a=>a.mode==='colorRetire'&&a.uid===low.uid);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front[1].uid,high.uid);
});

test('MHA-1-093 may spend one life for another character, and not for Midoriya or an event',()=>{
 const hit=body({id:'HIT-093',effects:{onPlay:[{op:'retireOppFrontOne'}]},implementation:'dsl'});
 const event=body({id:'EVT-093',type:'event',ap:1,energy:0,bp:0,gen:0,color:'red',
  effects:{onPlay:[{op:'retireOppFrontOne'}]},implementation:'dsl'});
 let opened=open({'MHA-1-093':1,'MHA-1-078':2,'HIT-093':2},9301,[hit,event]);
 const guard=seat(opened.s,1,'MHA-1-093','front',0,true);
 const ally=seat(opened.s,1,'MHA-1-078','front',1,true);
 const life=opened.s.players[1].life[0];
 readyAp(opened.s,1);
 let s=play(opened.pack,opened.s,'HIT-093');
 s=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===ally.uid);
 assert.equal(s.pending.kind,'effect-opp-life-leave');
 s=act(opened.pack,s,a=>a.type==='chooseOppLeave'&&a.mode==='life');
 assert.equal(s.players[1].front[1].uid,ally.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===life.uid),true);
 assert.equal(s.mainAbilityUsedUids.includes(guard.uid+'|oppLeave'),true);
 hold(s,0,'HIT-093');
 readyAp(s,1);
 s=play(opened.pack,s,'HIT-093','front',1);
 s=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===ally.uid);
 assert.equal(s.pending?.kind==='effect-opp-life-leave',false);
 assert.equal(s.players[1].front[1],null);
 const declined=open({'MHA-1-093':1,'MHA-1-078':1,'HIT-093':1},9302,[hit]);
 seat(declined.s,1,'MHA-1-093','front',0,true);
 const second=seat(declined.s,1,'MHA-1-078','front',1,true);
 const lifeCount=declined.s.players[1].life.length;
 readyAp(declined.s,1);
 s=play(declined.pack,declined.s,'HIT-093');
 s=act(declined.pack,s,a=>a.uid===second.uid);
 assert.equal(s.pending.kind,'effect-opp-life-leave');
 s=act(declined.pack,s,a=>a.mode==='decline');
 assert.equal(s.players[1].front[1],null);
 assert.equal(s.players[1].life.length,lifeCount);
 assert.equal(s.mainAbilityUsedUids.includes(s.players[1].front[0].uid+'|oppLeave'),false);
 const dry=open({'MHA-1-093':1,'MHA-1-078':1,'HIT-093':1},9303,[hit]);
 seat(dry.s,1,'MHA-1-093','front',0,true);
 const bare=seat(dry.s,1,'MHA-1-078','front',1,true);
 dry.s.players[1].deck.push(...dry.s.players[1].life.splice(0));
 readyAp(dry.s,1);
 s=play(dry.pack,dry.s,'HIT-093');
 s=act(dry.pack,s,a=>a.uid===bare.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[1],null);
 const back=open({'MHA-1-093':1,'MHA-1-078':1,'HIT-093':1},9304,[hit]);
 seat(back.s,1,'MHA-1-093','energy',0,true);
 const frontAlly=seat(back.s,1,'MHA-1-078','front',0,true);
 readyAp(back.s,1);
 s=play(back.pack,back.s,'HIT-093');
 s=act(back.pack,s,a=>a.uid===frontAlly.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0],null);
 const named=open({'MHA-1-093':1,'MHA-1-058':1,'HIT-093':1},9305,[hit]);
 const midoriya=seat(named.s,1,'MHA-1-058','front',1,true);
 seat(named.s,1,'MHA-1-093','front',0,true);
 readyAp(named.s,1);
 s=play(named.pack,named.s,'HIT-093');
 s=act(named.pack,s,a=>a.uid===midoriya.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[1],null);
 const cast=open({'MHA-1-093':1,'MHA-1-078':1,'EVT-093':1},9306,[event]);
 seat(cast.s,1,'MHA-1-093','front',0,true);
 const marked=seat(cast.s,1,'MHA-1-078','front',1,true);
 readyAp(cast.s,1);
 const evt=hold(cast.s,0,'EVT-093');
 s=act(cast.pack,cast.s,legal(cast.pack,cast.s).find(a=>a.type==='event'&&a.uid===evt.uid));
 s=act(cast.pack,s,a=>a.uid===marked.uid);
 assert.equal(s.pending?.kind==='effect-opp-life-leave',false);
 assert.equal(s.players[1].front[1],null);
});
