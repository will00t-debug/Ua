import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA56BT/TTG-1-008, 025, 030, 039, 044, 050, 029. Registration plus the
// scenarios below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const featured=['TTG-1-008','TTG-1-025','TTG-1-030','TTG-1-039','TTG-1-044','TTG-1-050','TTG-1-029'];
const fillers=['TTG-1-019','TTG-1-063','TTG-1-007','TTG-1-013','TTG-1-005','TTG-1-010','TTG-1-002'];
const deck=Object.fromEntries(featured.map(id=>[id,3]));
for(const id of fillers)deck[id]=4;
deck['TTG-1-035']=1;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const c=take(s,p,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function act(s,pred){
 const found=legalUniversalActions(ttg,s).find(pred);
 assert.ok(found,s.phase+' '+(s.pending?.kind||'')+' '+s.active);
 return found;
}
function go(s,action){
 const before=structuredClone(s);
 const next=dispatchUniversalAction(ttg,s,action);
 assert.deepEqual(s,before,'pure reducer');
 return next;
}
function toPhase(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++)s=go(s,act(s,a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
}
function endTurn(s){
 s=toPhase(s,'attack');
 return go(s,act(s,a=>a.type==='next'));
}
function nullLife(s,p,id){
 const card=take(s,p,id),old=s.players[p].life.pop();
 s.players[p].life.unshift(card);if(old)s.players[p].deck.push(old);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function fresh(seed,first=0){
 return newUniversalMatch(ttg,{decks:[deck,deck],first,seed});
}

test('seven TTG cards keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 const expect={
  'TTG-1-008':['グラパール','green',4,1,4000,1,'get','character'],
  'TTG-1-025':['ロージェノム','green',2,1,4000,1,null,'character'],
  'TTG-1-030':['スペースキングキタン','green',4,1,4000,1,'get','character'],
  'TTG-1-039':['ラガンインパクト','green',6,1,0,0,'active','event'],
  'TTG-1-044':['カミナ','red',3,1,3500,1,null,'character'],
  'TTG-1-050':['キヨウ＆キノン＆キヤル','red',3,1,3000,1,null,'character'],
  'TTG-1-029':['グレンラガン','green',5,1,4000,1,'raid','character']
 };
 const match={
  'TTG-1-008':'大紅蓮團','TTG-1-025':'能源6以上','TTG-1-030':'底板',
  'TTG-1-039':'最高 BP','TTG-1-044':'查看牌庫頂7張','TTG-1-050':'基坦',
  'TTG-1-029':'需求能源3'
 };
 for(const [id,printed] of Object.entries(expect)){
  const src=TTG_BY_ID[id],card=ttg.cards[id];
  assert.equal(src.number,'UA56BT/'+id);
  assert.ok(src.effect.includes(match[id]));
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],printed);
 }
 const grapearl=ttg.cards['TTG-1-008'];
 assert.equal(grapearl.raidTrait,'大グレン団');
 assert.equal(grapearl.raidName,null);
 assert.equal(grapearl.enterAlwaysActive,false);
 assert.equal(grapearl.triggerEffect,null);
 const lord=ttg.cards['TTG-1-025'];
 assert.equal(lord.attackEnergyMin,6);
 assert.equal(lord.blockEnergyMin,6);
 assert.equal(lord.effects.onRetire,undefined);
 assert.equal(lord.mainAbility.op,'buffNamedEnergyActiveAp');
 assert.equal(lord.mainAbility.extraEnergy,3);
 const king=ttg.cards['TTG-1-030'];
 assert.equal(king.raidName,'キタン');
 assert.equal(king.impactNull,true);
 assert.deepEqual(king.traits,['大グレン団','ガンメン']);
 assert.equal(king.effects.onRetire[0].op,'replayRaidBase');
 const impact=ttg.cards['TTG-1-039'];
 assert.equal(impact.triggerEffect,null);
 assert.equal(impact.effects.onPlay[0].op,'buffMaxOwnBpImpact');
 const kamina=ttg.cards['TTG-1-044'];
 assert.equal(kamina.passiveBonuses[0].condition.kind,'ownNameOrRaidBase');
 assert.equal(kamina.passiveBonuses[0].condition.turn,'any');
 assert.equal(kamina.passiveBonuses[0].bp,500);
 assert.equal(kamina.unblockedAttack.optional,true);
 const trio=ttg.cards['TTG-1-050'];
 assert.deepEqual(trio.printedMains.map(m=>m.id),['active','energy','bp']);
 assert.equal(trio.mainAbility,null);
 const gurren=ttg.cards['TTG-1-029'];
 assert.equal(gurren.raidName,'シモン');
 assert.deepEqual(gurren.raidBaseNames,['シモン','ヴィラル']);
 assert.deepEqual(gurren.traits,['大グレン団','ガンメン']);
 assert.notDeepEqual(gurren.traits,TTG_BY_ID['TTG-1-029'].traits);
 assert.equal(gurren.enterAlwaysActive,false);
 assert.equal(JSON.stringify(TTG_BY_ID['TTG-1-029'].traits),'["大グレン団／ガンメン"]');
});

test('TTG-008 trait-raids Grapearl, grants impact or an unblocked draw, and refuses a raider base',()=>{
 let s=fresh(8008);
 const gimme=place(s,0,'TTG-1-007','front',0);
 const raider=place(s,0,'TTG-1-029','front',1);
 for(let i=0;i<2;i++)place(s,0,'TTG-1-019','energy',i);
 const grapearl=hold(s,0,'TTG-1-008');
 place(s,1,'TTG-1-063','front',0);
 nullLife(s,1,'TTG-1-063');
 s=toPhase(s,'main');
 const legal=legalUniversalActions(ttg,s);
 assert.ok(legal.some(a=>a.type==='raid'&&a.baseUid===gimme.uid));
 assert.equal(legal.some(a=>a.type==='raid'&&a.baseUid===raider.uid),false);
 const handBefore=s.players[0].hand.length;
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===grapearl.uid&&a.baseUid===gimme.uid));
 const top=s.players[0].front.find(c=>c?.uid===grapearl.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,gimme.uid);
 assert.equal(top.impactGranted.amount,1);
 assert.equal(top.impactGranted.turn,s.turn);
 assert.equal(top.unblockedDrawGranted,undefined);
 assert.equal(s.players[0].hand.length,handBefore);
 s=toPhase(s,'attack');
 const life=s.players[1].life.length;
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===grapearl.uid));
 assert.equal(s.pending.kind,'block');
 const blocker=s.players[1].front[0];
 s=go(s,act(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 assert.equal(s.players[1].life.length,life-1);
 assert.equal(s.players[1].front[0],null);
 assertUniversalMatch(ttg,s);

 let darry=fresh(8013);
 const base=place(darry,0,'TTG-1-013','front',0);
 for(let i=0;i<2;i++)place(darry,0,'TTG-1-019','energy',i);
 const rider=hold(darry,0,'TTG-1-008');
 nullLife(darry,1,'TTG-1-013');
 darry=toPhase(darry,'main');
 const before=darry.players[0].hand.length;
 darry=go(darry,act(darry,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid));
 const gained=live(darry,0,rider.uid);
 assert.equal(gained.impactGranted,undefined);
 assert.equal(gained.unblockedDrawGranted.turn,darry.turn);
 assert.equal(darry.players[0].hand.length,before);
 darry=toPhase(darry,'attack');
 const lifeBefore=darry.players[1].life.length;
 const handAfterRaid=darry.players[0].hand.length;
 darry=go(darry,act(darry,a=>a.type==='attack'&&a.uid===rider.uid));
 darry=go(darry,act(darry,a=>a.type==='chooseBlock'&&a.uid===null));
 assert.equal(darry.pending.kind,'life-trigger');
 assert.equal(darry.players[0].hand.length,handAfterRaid+1);
 assert.equal(darry.players[1].life.length,lifeBefore-1);

 let blocked=fresh(8014);
 const darryBase=place(blocked,0,'TTG-1-013','front',0);
 for(let i=0;i<2;i++)place(blocked,0,'TTG-1-019','energy',i);
 const again=hold(blocked,0,'TTG-1-008');
 place(blocked,1,'TTG-1-063','front',0);
 blocked=toPhase(blocked,'main');
 blocked=go(blocked,act(blocked,a=>a.type==='raid'&&a.uid===again.uid));
 blocked=toPhase(blocked,'attack');
 const hand=blocked.players[0].hand.length;
 const blockedLife=blocked.players[1].life.length;
 blocked=go(blocked,act(blocked,a=>a.type==='attack'&&a.uid===again.uid));
 blocked=go(blocked,act(blocked,a=>a.type==='chooseBlock'&&a.uid===blocked.players[1].front[0].uid));
 assert.notEqual(blocked.pending?.kind,'effect-may-then');
 assert.equal(blocked.players[0].hand.length,hand);
 assert.equal(blocked.players[1].life.length,blockedLife);
 assertUniversalMatch(ttg,blocked);
});

test('TTG-025 gates attack, block, and the Simon energy main on six energy',()=>{
 let low=fresh(8025);
 const lord=place(low,0,'TTG-1-025','front',0);
 place(low,0,'TTG-1-019','energy',0);
 place(low,1,'TTG-1-063','front',0);
 low=toPhase(low,'attack');
 assert.equal(legalUniversalActions(ttg,low).some(a=>a.type==='attack'&&a.uid===lord.uid),false);
 low=go(low,act(low,a=>a.type==='next'));
 low=toPhase(low,'attack');
 low=go(low,act(low,a=>a.type==='attack'));
 assert.equal(low.pending.kind,'block');
 assert.equal(legalUniversalActions(ttg,low).some(a=>a.type==='chooseBlock'&&a.uid===lord.uid),false);
 assertUniversalMatch(ttg,low);

 let high=fresh(8026);
 const fighter=place(high,0,'TTG-1-025','front',0);
 for(let i=0;i<3;i++)place(high,0,'TTG-1-019','energy',i);
 high=toPhase(high,'main');
 assert.equal(legalUniversalActions(ttg,high).some(a=>a.type==='activate'&&a.uid===fighter.uid),false);
 high=toPhase(high,'attack');
 assert.ok(legalUniversalActions(ttg,high).some(a=>a.type==='attack'&&a.uid===fighter.uid));
 high=go(high,act(high,a=>a.type==='next'));
 place(high,1,'TTG-1-063','front',0);
 high=toPhase(high,'attack');
 high=go(high,act(high,a=>a.type==='attack'&&a.uid===high.players[1].front[0].uid));
 assert.ok(legalUniversalActions(ttg,high).some(a=>a.type==='chooseBlock'&&a.uid===fighter.uid));
 assertUniversalMatch(ttg,high);

 let paid=fresh(8027);
 paid=endTurn(paid);
 for(let i=0;i<3;i++)place(paid,1,'TTG-1-019','energy',i);
 const simon=place(paid,1,'TTG-1-010','energy',3);
 const body=hold(paid,1,'TTG-1-025');
 paid=toPhase(paid,'start');
 paid=go(paid,act(paid,a=>a.type==='extraDraw'));
 paid=toPhase(paid,'main');
 paid=go(paid,act(paid,a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 const source=live(paid,1,body.uid);
 assert.equal(universalCardEnergy(ttg,paid,1,live(paid,1,simon.uid)),1);
 paid=go(paid,act(paid,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='namedEnergyAp'));
 assert.equal(paid.pending?.kind,'effect-active-one-ap');
 const label=uiActionLabel(paid.pending?legalUniversalActions(ttg,paid)[0]:{type:'activate',uid:source.uid,mode:'namedEnergyAp'},{pack:ttg,state:paid});
 assert.equal(typeof label,'string');
 paid=go(paid,act(paid,a=>a.type==='chooseActiveAp'));
 const boosted=live(paid,1,simon.uid);
 assert.equal(universalCardEnergy(ttg,paid,1,boosted),4);
 assert.ok(boosted.buffs.some(b=>b.energy===3&&b.untilTurn===paid.turn));
 assert.equal(paid.players[1].apCards.filter(c=>c.inPlay&&c.ready).length,1);
 assert.equal(legalUniversalActions(ttg,paid).some(a=>a.type==='activate'&&a.uid===source.uid),false);

 let front=fresh(8028);
 for(let i=0;i<3;i++)place(front,0,'TTG-1-019','energy',i);
 const frontSimon=place(front,0,'TTG-1-010','front',1);
 const spell=hold(front,0,'TTG-1-025');
 front=toPhase(front,'main');
 front=go(front,act(front,a=>a.type==='play'&&a.uid===spell.uid&&a.line==='energy'));
 front=go(front,act(front,a=>a.type==='activate'&&a.mode==='namedEnergyAp'));
 assert.equal(universalCardEnergy(ttg,front,0,live(front,0,frontSimon.uid)),0);
 assert.ok(live(front,0,frontSimon.uid).buffs.some(b=>b.energy===3));
 assertUniversalMatch(ttg,front);
});

test('TTG-030 nulls impact and replays only its raid base on retirement',()=>{
 let s=fresh(8030,1);
 const kittan=place(s,1,'TTG-1-005','front',0);
 for(let i=0;i<3;i++)place(s,1,'TTG-1-019','energy',i);
 const king=hold(s,1,'TTG-1-030');
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===king.uid&&a.baseUid===kittan.uid));
 assert.equal(live(s,1,king.uid).ready,true);
 s=endTurn(s);
 const gimme=place(s,0,'TTG-1-007','front',0);
 for(let i=0;i<2;i++)place(s,0,'TTG-1-019','energy',i);
 const grapearl=hold(s,0,'TTG-1-008');
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='raid'&&a.uid===grapearl.uid&&a.baseUid===gimme.uid));
 s=toPhase(s,'attack');
 const life=s.players[1].life.length;
 s=go(s,act(s,a=>a.type==='attack'&&a.uid===grapearl.uid));
 s=go(s,act(s,a=>a.type==='chooseBlock'&&a.uid===king.uid));
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.pending.kind,'effect-replay-base');
 assert.equal(s.pending.baseUid,kittan.uid);
 assert.equal(s.pending.canActive,true);
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.mode==='active'));
 assert.ok(legalUniversalActions(ttg,s).some(a=>a.mode==='rest'));
 s=go(s,act(s,a=>a.type==='chooseReplayBase'&&a.mode==='skip'));
 assert.ok(s.players[1].outside.some(c=>c.uid===kittan.uid));
 assert.equal(s.players[1].front.some(c=>c?.uid===kittan.uid),false);
 assertUniversalMatch(ttg,s);

 let rest=fresh(8031,1);
 const base=place(rest,1,'TTG-1-005','front',0);
 for(let i=0;i<2;i++)place(rest,1,'TTG-1-019','energy',i);
 const top=hold(rest,1,'TTG-1-030');
 rest=toPhase(rest,'main');
 rest=go(rest,act(rest,a=>a.type==='raid'&&a.uid===top.uid));
 rest=endTurn(rest);
 const attacker=place(rest,0,'TTG-1-029','front',0);
 rest=toPhase(rest,'attack');
 rest=go(rest,act(rest,a=>a.type==='attack'&&a.uid===attacker.uid));
 rest=go(rest,act(rest,a=>a.type==='chooseBlock'&&a.uid===top.uid));
 assert.equal(rest.pending.canActive,false);
 assert.equal(legalUniversalActions(ttg,rest).some(a=>a.mode==='active'),false);
 rest=go(rest,act(rest,a=>a.type==='chooseReplayBase'&&a.mode==='rest'&&a.line==='energy'));
 const replayed=live(rest,1,base.uid);
 assert.equal(replayed.ready,false);
 assert.ok(rest.players[1].energy.includes(replayed));
 assertUniversalMatch(ttg,rest);

 let active=fresh(8032,1);
 const base2=place(active,1,'TTG-1-005','front',0);
 for(let i=0;i<3;i++)place(active,1,'TTG-1-019','energy',i);
 const top2=hold(active,1,'TTG-1-030');
 active=toPhase(active,'main');
 active=go(active,act(active,a=>a.type==='raid'&&a.uid===top2.uid));
 active=endTurn(active);
 const attacker2=place(active,0,'TTG-1-029','front',0);
 active=toPhase(active,'attack');
 active=go(active,act(active,a=>a.type==='attack'&&a.uid===attacker2.uid));
 active=go(active,act(active,a=>a.type==='chooseBlock'&&a.uid===top2.uid));
 active=go(active,act(active,a=>a.type==='chooseReplayBase'&&a.mode==='active'&&a.line==='front'));
 assert.equal(live(active,1,base2.uid).ready,true);
 assertUniversalMatch(ttg,active);

 let bare=fresh(8033);
 for(let i=0;i<2;i++)place(bare,0,'TTG-1-019','energy',i);
 const plain=hold(bare,0,'TTG-1-030');
 const foe=place(bare,1,'TTG-1-029','front',0);
 bare=toPhase(bare,'main');
 bare=go(bare,act(bare,a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front'));
 live(bare,0,plain.uid).ready=true;
 bare=endTurn(bare);
 bare=toPhase(bare,'attack');
 bare=go(bare,act(bare,a=>a.type==='attack'&&a.uid===foe.uid));
 bare=go(bare,act(bare,a=>a.type==='chooseBlock'&&a.uid===plain.uid));
 assert.notEqual(bare.pending?.kind,'effect-replay-base');
 assertUniversalMatch(ttg,bare);

 let removed=fresh(8035);
 for(let i=0;i<3;i++)place(removed,0,'TTG-1-019','energy',i);
 place(removed,0,'TTG-1-010','front',0);
 const victimBase=place(removed,1,'TTG-1-005','front',0);
 const victim=place(removed,1,'TTG-1-030','front',1);
 victim.stack=[victimBase];
 removed.players[1].front[0]=null;
 const spell=hold(removed,0,'TTG-1-035');
 removed=toPhase(removed,'main');
 removed=go(removed,act(removed,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(removed.pending.kind,'effect-retire-bp');
 removed=go(removed,act(removed,a=>a.type==='chooseRetireBp'&&a.uid===victim.uid));
 assert.ok(removed.players[1].removed.some(c=>c.uid===victim.uid));
 assert.ok(removed.players[1].outside.some(c=>c.uid===victimBase.uid));
 assert.notEqual(removed.pending?.kind,'effect-replay-base');
 assertUniversalMatch(ttg,removed);
});

test('TTG-039 adds the snapshotted maximum BP and grants impact to one Lagann or Simon',()=>{
 let blocked=fresh(8039);
 for(let i=0;i<3;i++)place(blocked,0,'TTG-1-019','energy',i);
 const spell=hold(blocked,0,'TTG-1-039');
 blocked=toPhase(blocked,'main');
 assert.equal(legalUniversalActions(ttg,blocked).some(a=>a.type==='event'&&a.uid===spell.uid),false);

 let s=fresh(8040);
 for(let i=0;i<3;i++)place(s,0,'TTG-1-019','energy',i);
 const gurren=place(s,0,'TTG-1-029','front',0);
 const simon=place(s,0,'TTG-1-010','front',1);
 const event=hold(s,0,'TTG-1-039');
 s=toPhase(s,'main');
 s=go(s,act(s,a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending.kind,'effect-max-bp-impact');
 assert.equal(s.pending.maxBp,4000);
 assert.deepEqual(s.pending.choices.slice().sort(),[gurren.uid,simon.uid].sort());
 assert.equal(s.pending.choices.includes(s.players[0].energy[0].uid),false);
 s=go(s,act(s,a=>a.type==='chooseMaxBpImpact'&&a.uid===gurren.uid));
 const boosted=live(s,0,gurren.uid);
 assert.equal(universalBp(ttg,s,boosted),8000);
 assert.equal(boosted.impactGranted.amount,1);
 assert.equal(boosted.impactGranted.sourceUid,event.uid);
 assert.equal(universalBp(ttg,s,live(s,0,simon.uid)),1500);
 assert.equal(ttg.cards['TTG-1-039'].trigger,'active');
 assert.equal(ttg.cards['TTG-1-039'].triggerEffect,null);

 let life=fresh(8041);
 const rested=place(life,1,'TTG-1-063','front',0);
 rested.ready=false;
 nullLife(life,1,'TTG-1-039');
 const attacker=place(life,0,'TTG-1-063','front',0);
 life=toPhase(life,'attack');
 life=go(life,act(life,a=>a.type==='attack'&&a.uid===attacker.uid));
 life=go(life,act(life,a=>a.type==='chooseBlock'&&a.uid===null));
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'active');
 life=go(life,act(life,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid));
 assert.equal(live(life,1,rested.uid).ready,true);
 assert.equal(universalBp(ttg,life,live(life,1,rested.uid)),4000);
 assertUniversalMatch(ttg,life);
});

test('TTG-044 gains BP from Simon on either turn and may look at the top 7 only when unblocked',()=>{
 let plain=fresh(8044);
 const kamina=place(plain,0,'TTG-1-044','front',0);
 assert.equal(universalBp(ttg,plain,kamina),3500);
 const simon=place(plain,0,'TTG-1-010','front',1);
 assert.equal(universalBp(ttg,plain,live(plain,0,kamina.uid)),4000);
 plain=endTurn(plain);
 assert.equal(plain.active,1);
 assert.equal(universalBp(ttg,plain,plain.players[0].front.find(c=>c?.uid===kamina.uid)),4000);

 let buried=fresh(8045);
 for(let i=0;i<2;i++)place(buried,0,'TTG-1-019','energy',i);
 const base=place(buried,0,'TTG-1-010','front',0);
 const rider=hold(buried,0,'TTG-1-008');
 const kamina2=place(buried,0,'TTG-1-044','front',1);
 assert.equal(universalBp(ttg,buried,kamina2),4000);
 buried=toPhase(buried,'main');
 buried=go(buried,act(buried,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid));
 buried.players[0].front.find(c=>c?.uid===rider.uid);
 const onlyBase=buried.players[0].front.find(c=>c?.stack?.[0]?.uid===base.uid);
 assert.ok(onlyBase);
 assert.equal(universalBp(ttg,buried,live(buried,0,kamina2.uid)),4000);
 assertUniversalMatch(ttg,buried);

 let look=fresh(8046);
 for(let i=0;i<2;i++)place(look,0,'TTG-1-063','energy',i);
 const reds=place(look,0,'TTG-1-063','energy',2);
 const fighter=place(look,0,'TTG-1-044','front',0);
 nullLife(look,1,'TTG-1-063');
 look=toPhase(look,'attack');
 assert.ok(look.players[0].deck.length>=7);
 const top7=look.players[0].deck.slice(0,7).map(c=>c.uid);
 const hand=look.players[0].hand.length;
 const life=look.players[1].life.length;
 look=go(look,act(look,a=>a.type==='attack'&&a.uid===fighter.uid));
 look=go(look,act(look,a=>a.type==='chooseBlock'&&a.uid===null));
 assert.equal(look.pending.kind,'effect-may-then');
 assert.equal(look.players[1].life.length,life);
 assert.deepEqual(look.players[0].deck.slice(0,7).map(c=>c.uid),top7);
 look=go(look,act(look,a=>a.type==='chooseMayThen'&&a.mode==='skip'));
 assert.deepEqual(look.players[0].deck.slice(0,7).map(c=>c.uid),top7);
 assert.equal(look.players[0].hand.length,hand);
 assert.equal(look.players[1].life.length,life-1);
 assert.equal(reds.cardId,'TTG-1-063');
 assertUniversalMatch(ttg,look);

 let accept=fresh(8047);
 for(let i=0;i<3;i++)place(accept,0,'TTG-1-063','energy',i);
 const fighter2=place(accept,0,'TTG-1-044','front',0);
 nullLife(accept,1,'TTG-1-063');
 accept=toPhase(accept,'attack');
 const window=accept.players[0].deck.slice(0,7).map(c=>c.uid);
 const handBefore=accept.players[0].hand.length;
 accept=go(accept,act(accept,a=>a.type==='attack'&&a.uid===fighter2.uid));
 accept=go(accept,act(accept,a=>a.type==='chooseBlock'&&a.uid===null));
 accept=go(accept,act(accept,a=>a.type==='chooseMayThen'&&a.mode==='do'));
 assert.equal(accept.pending.kind,'effect-top-order');
 assert.equal(accept.players[0].hand.length,handBefore);
 while(accept.pending?.kind==='effect-top-order')
  accept=go(accept,act(accept,a=>a.type==='chooseTopOrder'));
 assert.equal(accept.players[0].hand.length,handBefore);
 assert.deepEqual(accept.players[0].deck.slice(-7).map(c=>c.uid).sort(),window.slice().sort());
 assert.notEqual(accept.pending?.kind,'effect-discard');
 assertUniversalMatch(ttg,accept);

 let blockedAttack=fresh(8048);
 for(let i=0;i<3;i++)place(blockedAttack,0,'TTG-1-063','energy',i);
 const fighter3=place(blockedAttack,0,'TTG-1-044','front',0);
 place(blockedAttack,1,'TTG-1-063','front',0);
 blockedAttack=toPhase(blockedAttack,'attack');
 const deckBefore=blockedAttack.players[0].deck.map(c=>c.uid);
 blockedAttack=go(blockedAttack,act(blockedAttack,a=>a.type==='attack'&&a.uid===fighter3.uid));
 blockedAttack=go(blockedAttack,act(blockedAttack,a=>a.type==='chooseBlock'&&a.uid!==null));
 assert.notEqual(blockedAttack.pending?.kind,'effect-may-then');
 assert.deepEqual(blockedAttack.players[0].deck.map(c=>c.uid),deckBefore);
 assertUniversalMatch(ttg,blockedAttack);
});

test('TTG-050 draws for Kittan and uses three once-per-card mains',()=>{
 let quiet=fresh(8050);
 for(let i=0;i<3;i++)place(quiet,0,'TTG-1-063','energy',i);
 const solo=hold(quiet,0,'TTG-1-050');
 quiet=toPhase(quiet,'main');
 const hand=quiet.players[0].hand.length;
 quiet=go(quiet,act(quiet,a=>a.type==='play'&&a.uid===solo.uid&&a.line==='front'));
 assert.equal(quiet.players[0].hand.length,hand-1);

 let withField=fresh(8051);
 for(let i=0;i<3;i++)place(withField,0,'TTG-1-063','energy',i);
 place(withField,0,'TTG-1-005','front',0);
 const trio=hold(withField,0,'TTG-1-050');
 withField=toPhase(withField,'main');
 const before=withField.players[0].hand.length;
 withField=go(withField,act(withField,a=>a.type==='play'&&a.uid===trio.uid&&a.line==='energy'));
 assert.equal(withField.players[0].hand.length,before);
 const source=live(withField,0,trio.uid);
 assert.equal(source.ready,false);
 source.ready=true;
 const energyBefore=universalCardEnergy(ttg,withField,0,source);
 withField=go(withField,act(withField,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='energy'));
 assert.equal(live(withField,0,source.uid).ready,false);
 assert.equal(universalCardEnergy(ttg,withField,0,live(withField,0,source.uid)),energyBefore+1);
 assert.equal(legalUniversalActions(ttg,withField).some(a=>a.mode==='energy'&&a.uid===source.uid),false);
 withField=go(withField,act(withField,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='active'));
 if(withField.pending?.kind==='effect-mode-discard')
  withField=go(withField,act(withField,a=>a.type==='chooseModeDiscard'));
 assert.equal(live(withField,0,source.uid).ready,true);
 withField=go(withField,act(withField,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='bp'));
 if(withField.pending?.kind==='effect-mode-discard')
  withField=go(withField,act(withField,a=>a.type==='chooseModeDiscard'));
 assert.equal(universalBp(ttg,withField,live(withField,0,source.uid)),4000);
 assert.equal(legalUniversalActions(ttg,withField).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='bp'),false);
 assert.equal(legalUniversalActions(ttg,withField).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='active'),false);
 const copy=hold(withField,0,'TTG-1-050');
 withField.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=true;});
 withField=go(withField,act(withField,a=>a.type==='play'&&a.uid===copy.uid&&a.line==='front'));
 assert.ok(legalUniversalActions(ttg,withField).some(a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='bp'));
 assertUniversalMatch(ttg,withField);

 let empty=fresh(8052);
 for(let i=0;i<3;i++)place(empty,0,'TTG-1-063','energy',i);
 place(empty,0,'TTG-1-005','front',0);
 const card=hold(empty,0,'TTG-1-050');
 empty=toPhase(empty,'main');
 empty=go(empty,act(empty,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 empty.players[0].deck.push(...empty.players[0].hand.splice(0));
 const played=live(empty,0,card.uid);
 played.ready=true;
 const modes=legalUniversalActions(ttg,empty).filter(a=>a.type==='activate'&&a.uid===played.uid);
 assert.deepEqual(modes.map(a=>a.mode),['energy']);
 assertUniversalMatch(ttg,empty);

 let under=fresh(8053);
 for(let i=0;i<3;i++)place(under,0,'TTG-1-063','energy',i);
 const kittan=place(under,0,'TTG-1-005','front',0);
 const rider=place(under,0,'TTG-1-030','front',1);
 rider.stack=[kittan];
 under.players[0].front[0]=null;
 const late=hold(under,0,'TTG-1-050');
 under=toPhase(under,'main');
 const size=under.players[0].hand.length;
 under=go(under,act(under,a=>a.type==='play'&&a.uid===late.uid&&a.line==='front'));
 assert.equal(under.players[0].hand.length,size);
 assertUniversalMatch(ttg,under);
});

test('TTG-029 recovers a cheap green Great Gurren card, or REST-plays it at six energy',()=>{
 let low=fresh(8029);
 place(low,0,'TTG-1-019','energy',0);
 place(low,0,'TTG-1-019','energy',1);
 place(low,0,'TTG-1-002','energy',2);
 const simon=place(low,0,'TTG-1-010','front',0);
 const cheap=take(low,0,'TTG-1-007');
 const expensive=take(low,0,'TTG-1-008');
 const red=take(low,0,'TTG-1-063');
 low.players[0].outside.push(cheap,expensive,red);
 const rider=hold(low,0,'TTG-1-029');
 low=toPhase(low,'main');
 low=go(low,act(low,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===simon.uid));
 assert.equal(live(low,0,rider.uid).ready,true);
 assert.equal(low.pending.kind,'effect-outside-or-rest');
 assert.equal(low.pending.restPlay,false);
 assert.deepEqual(low.pending.choices,[cheap.uid]);
 assert.equal(legalUniversalActions(ttg,low).some(a=>a.mode==='rest'),false);
 low=go(low,act(low,a=>a.type==='chooseOutsideOrRest'&&a.mode==='skip'));
 assert.ok(low.players[0].outside.some(c=>c.uid===cheap.uid));
 assertUniversalMatch(ttg,low);

 let hand=fresh(8054);
 place(hand,0,'TTG-1-019','energy',0);
 place(hand,0,'TTG-1-019','energy',1);
 place(hand,0,'TTG-1-002','energy',2);
 const base=place(hand,0,'TTG-1-010','front',0);
 const target=take(hand,0,'TTG-1-013');
 hand.players[0].outside.push(target);
 const top=hold(hand,0,'TTG-1-029');
 hand=toPhase(hand,'main');
 hand=go(hand,act(hand,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 hand=go(hand,act(hand,a=>a.type==='chooseOutsideOrRest'&&a.mode==='hand'&&a.uid===target.uid));
 assert.ok(hand.players[0].hand.some(c=>c.uid===target.uid));
 assertUniversalMatch(ttg,hand);

 let viral=fresh(8055);
 for(let i=0;i<3;i++)place(viral,0,'TTG-1-019','energy',i);
 const foe=place(viral,0,'TTG-1-002','front',0);
 const outside=take(viral,0,'TTG-1-007');
 viral.players[0].outside.push(outside);
 const gurren=hold(viral,0,'TTG-1-029');
 viral=toPhase(viral,'main');
 viral=go(viral,act(viral,a=>a.type==='raid'&&a.uid===gurren.uid&&a.baseUid===foe.uid));
 assert.equal(viral.pending.restPlay,true);
 assert.equal(live(viral,0,gurren.uid).ready,true);
 viral=go(viral,act(viral,a=>a.type==='chooseOutsideOrRest'&&a.mode==='rest'&&a.line==='energy'));
 const played=live(viral,0,outside.uid);
 assert.equal(played.ready,false);
 assert.ok(viral.players[0].energy.includes(played));
 assertUniversalMatch(ttg,viral);

 let energyLine=fresh(8056);
 for(let i=0;i<3;i++)place(energyLine,0,'TTG-1-019','energy',i);
 const kept=take(energyLine,0,'TTG-1-010');
 energyLine.players[0].outside.push(kept);
 const stay=hold(energyLine,0,'TTG-1-029');
 energyLine=toPhase(energyLine,'main');
 energyLine=go(energyLine,act(energyLine,a=>a.type==='play'&&a.uid===stay.uid&&a.line==='energy'));
 assert.equal(energyLine.pending.kind,'effect-outside-or-rest');
 assert.ok(energyLine.players[0].energy.some(c=>c?.uid===stay.uid));
 assert.equal(energyLine.pending.restPlay,true);
 energyLine=go(energyLine,act(energyLine,a=>a.type==='chooseOutsideOrRest'&&a.mode==='skip'));
 assertUniversalMatch(ttg,energyLine);
});
