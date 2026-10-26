// Official UA56BT rulings that had no executable Q-number check.
// These assertions drive the resolver that currently handles each card.
// A passing file is not certification of every printed interaction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
import {legalGreen016,resolveGreen016} from '../dist/ttg-green-main.mjs';
import {legalGreen012Double,resolveGreen012Double} from '../dist/ttg-green-012.mjs';
import {legalGreenEventActions,resolveGreenEvent,legalGreen040RemovedActions,resolveGreen040Removed} from '../dist/ttg-green-events.mjs';
import {legalGreenHighRaids,resolveGreenHighRaid,legalGreenHighRaidChoices,resolveGreenHighRaidChoice,greenHighRaidCombatValue} from '../dist/ttg-green-high-raid.mjs';
import {greenTtgCurrentBp} from '../dist/ttg-green-passives.mjs';
import {legalTtgGreen028Raids,dispatchTtgGreen028Raid,legalTtgGreen028EntryChoices} from '../dist/ttg-green-028.mjs';
import {legalRedHighRaids,resolveRedHighRaid} from '../dist/ttg-red-eleventh-three.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction} from '../dist/ttg-core-match.mjs';

const c=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...extra});
const player=()=>({
 front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],
 turnCount:2,apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:true},{uid:'AP2',ready:false}],
 energyProduced:{green:0,red:0}
});
const game=()=>({active:0,phase:'main',status:'playing',turn:4,energyMode:'derive',players:[player(),player()],log:[],pending:null});
const ownerSees=(top,ids)=>assert.deepEqual(inspectFacedownUnder(top,{viewer:0,owner:0}).map(x=>x.cardId),ids);
const opponentSees=(top,n)=>assert.deepEqual(inspectFacedownUnder(top,{viewer:1,owner:0}),Array.from({length:n},()=>({faceDown:true})));

test('Q2268 two Nia 016 copies share one 20-energy draw',()=>{
 const s=game(),pl=s.players[0];
 pl.energy[0]=c('n1','TTG-1-016');
 pl.energy[1]=c('n2','TTG-1-016');
 pl.energy[2]=c('gen','TTG-1-017',{gen:20});
 pl.deck=[c('drawn','TTG-1-005')];
 const first=resolveGreen016(s,{player:0,uid:'n1'});
 assert.equal(first.players[0].energy[0].ready,false);
 assert.deepEqual(first.players[0].hand.map(x=>x.uid),['drawn']);
 assert.deepEqual(legalGreen016(first,{player:0,uid:'n2'}),[]);
 assert.throws(()=>resolveGreen016(first,{player:0,uid:'n2'}));
});

test('Q2274 the once-per-turn clause is only 031 on-play; continuous BP and damage stay',()=>{
 const s=game(),pl=s.players[0];
 pl.energy[0]=c('gen','TTG-1-017',{gen:50});
 pl.front[0]=c('simon','TTG-1-009');
 pl.hand=[c('galaxy','TTG-1-031')];
 pl.deck=[c('d1','TTG-1-005'),c('d2','TTG-1-006'),c('d3','TTG-1-014')];
 const raid=legalGreenHighRaids(s,0).find(x=>x.cardId==='TTG-1-031'&&x.raidKind==='base');
 const entered=resolveGreenHighRaid(s,{...raid,payApUids:['AP0']});
 const choice=legalGreenHighRaidChoices(entered).find(x=>x.step==='entry031'&&x.apUid==='AP0');
 assert.ok(choice);
 const done=resolveGreenHighRaidChoice(entered,choice);
 const top=done.players[0].front[0];
 assert.equal(done.players[0].green031UsedTurn,s.turn);
 assert.equal(top.currentBp,TTG_BY_ID['TTG-1-031'].bp+5000);
 assert.equal(greenTtgCurrentBp(done,0,top),TTG_BY_ID['TTG-1-031'].bp+6000);
 assert.equal(done.players[0].apCards[0].ready,true);
 assert.deepEqual(done.players[0].hand.map(x=>x.uid),['d1','d2']);
 assert.equal(greenHighRaidCombatValue(done,0,top).damage,2);
 assert.equal(top.protectedFromEffects,true);
});

test('Q2275 a second 031 the same turn does not activate on-play',()=>{
 const s=game(),pl=s.players[0];
 pl.energy[0]=c('gen','TTG-1-017',{gen:50});
 pl.front[0]=c('simon','TTG-1-009');
 pl.front[1]=c('simon2','TTG-1-010');
 pl.hand=[c('first','TTG-1-031'),c('second','TTG-1-031')];
 pl.deck=[c('d1','TTG-1-005'),c('d2','TTG-1-006')];
 const firstRaid=legalGreenHighRaids(s,0).find(x=>x.handUid==='first'&&x.sourceUid==='simon');
 let state=resolveGreenHighRaid(s,{...firstRaid,payApUids:['AP0']});
 state=resolveGreenHighRaidChoice(state,legalGreenHighRaidChoices(state).find(x=>x.step==='entry031'&&x.apUid==='AP0'));
 const secondRaid=legalGreenHighRaids(state,0).find(x=>x.handUid==='second');
 assert.ok(secondRaid);
 state=resolveGreenHighRaid(state,{...secondRaid,payApUids:['AP0']});
 const beforeDeck=state.players[0].deck.map(x=>x.uid);
 const beforeAp=state.players[0].apCards.map(x=>x.ready);
 const choices=legalGreenHighRaidChoices(state).filter(x=>x.step==='entry031');
 assert.deepEqual(choices.map(x=>x.mode),['skipped']);
 state=resolveGreenHighRaidChoice(state,choices[0]);
 const copy=state.players[0].front.find(x=>x?.uid==='second');
 assert.equal(copy.currentBp,undefined);
 assert.equal(copy.protectedFromEffects,undefined);
 assert.equal(greenTtgCurrentBp(state,0,copy),TTG_BY_ID['TTG-1-031'].bp+1000);
 assert.equal(greenHighRaidCombatValue(state,0,copy).damage,2);
 assert.deepEqual(state.players[0].deck.map(x=>x.uid),beforeDeck);
 assert.deepEqual(state.players[0].apCards.map(x=>x.ready),beforeAp);
});

test('Q2273 Q2277 Q2279 Q2281 owner can identify facedown cards under 027 031 032 and 033',()=>{
 const s=game(),pl=s.players[0];
 pl.energy[0]=c('gen','TTG-1-017',{gen:100});
 pl.front[0]=c('gurren','TTG-1-029',{stack:[c('base','TTG-1-009')]});
 pl.hand=[c('arc','TTG-1-027')];
 let state=resolveGreenHighRaid(s,{...legalGreenHighRaids(s,0).find(x=>x.handUid==='arc'&&x.raidKind==='chain'&&x.line==='front'),payApUids:['AP0']});
 ownerSees(state.players[0].front[0],['TTG-1-029']);
 opponentSees(state.players[0].front[0],1);
 state.pending=null;state.players[0].apCards[0].ready=true;
 state.players[0].hand.push(c('galaxy','TTG-1-031'));
 state=resolveGreenHighRaid(state,{...legalGreenHighRaids(state,0).find(x=>x.handUid==='galaxy'&&x.raidKind==='chain'),payApUids:['AP0']});
 ownerSees(state.players[0].front[0],['TTG-1-029','TTG-1-027']);
 opponentSees(state.players[0].front[0],2);
 state.pending=null;state.players[0].apCards[0].ready=true;state.turn++;
 state.players[0].front[1]=c('other','TTG-1-005');
 state.players[0].hand.push(c('final','TTG-1-032'));
 state=resolveGreenHighRaid(state,{...legalGreenHighRaids(state,0).find(x=>x.handUid==='final'),payApUids:['AP0']});
 const absorb=legalGreenHighRaidChoices(state).find(x=>x.step==='entry032'&&JSON.stringify(x.takeUids)==='["other"]');
 state=resolveGreenHighRaidChoice(state,absorb);
 ownerSees(state.players[0].front[0],['TTG-1-029','TTG-1-027','TTG-1-031','TTG-1-005']);
 opponentSees(state.players[0].front[0],4);

 const site=game();
 site.players[0].energy[0]=c('gen2','TTG-1-017',{gen:10});
 site.players[0].energy[1]=c('arkSite','TTG-1-033');
 site.players[0].front[0]=c('simon','TTG-1-009');
 site.players[0].hand=[c('arc2','TTG-1-027')];
 site.players[0].deck=[c('a','TTG-1-005'),c('b','TTG-1-006')];
 let attached=resolveGreenHighRaid(site,{...legalGreenHighRaids(site,0)[0],payApUids:['AP0']});
 const place=legalGreenHighRaidChoices(attached).find(x=>x.step==='site033'&&x.siteUid==='arkSite');
 attached=resolveGreenHighRaidChoice(attached,place);
 ownerSees(attached.players[0].front[0],['TTG-1-033']);
 opponentSees(attached.players[0].front[0],1);
 assert.equal(attached.players[0].energy[1],null);
});

test('Q2278 a raided 032 cannot be chosen by an opponent effect that says choose',()=>{
 const s=game();
 s.active=1;
 s.players[1].energy[0]=c('gen','TTG-1-017',{gen:100});
 s.players[1].front[0]=c('prior','TTG-1-031',{stack:[c('base','TTG-1-009')],raidedTurn:1});
 s.players[1].front[1]=c('open','TTG-1-005');
 s.players[1].hand=[c('final','TTG-1-032')];
 let state=resolveGreenHighRaid(s,{...legalGreenHighRaids(s,1).find(x=>x.handUid==='final'),payApUids:['AP0']});
 assert.equal(state.players[1].front[0].protectedFromEffects,true);
 state=resolveGreenHighRaidChoice(state,legalGreenHighRaidChoices(state).find(x=>x.step==='entry032'&&x.takeUids.length===0));
 state.active=0;state.pending=null;
 state.players[0].energy[0]=c('green','TTG-1-017',{gen:4});
 state.players[0].front[0]=c('simon','TTG-1-009');
 state.players[0].hand=[c('raid','TTG-1-028')];
 state.players[0].deck=[c('draw','TTG-1-006')];
 const play=legalTtgGreen028Raids(state,0).find(x=>x.baseUid==='simon'&&x.line==='front');
 assert.ok(play);
 state=dispatchTtgGreen028Raid(state,{...play,payApUids:['AP0']});
 const targets=legalTtgGreen028EntryChoices(state).map(x=>x.targetUid);
 assert.ok(targets.includes('open'));
 assert.ok(!targets.includes('final'));
});

test('Q2283 removed 040 and 012 each double produced energy, together four times',()=>{
 const s=game(),pl=s.players[0];
 pl.energy[0]=c('gen','TTG-1-017',{gen:8});
 pl.front[0]=c('simon','TTG-1-012',{enteredTurn:1});
 pl.removed=[c('event','TTG-1-040')];
 pl.energyProduced={green:8,red:0};
 assert.equal(calculateTtgEnergyByColor(s,0).green,8);
 const doubled=resolveGreen012Double(s,{player:0,uid:'simon'});
 assert.equal(calculateTtgEnergyByColor(doubled,0).green,16);
 const quad=resolveGreen040Removed(doubled,{player:0,uid:'event'});
 assert.equal(quad.players[0].energyDoublings,2);
 assert.equal(calculateTtgEnergyByColor(quad,0).green,32);
 assert.deepEqual(legalGreen012Double(quad,0),[]);
 assert.deepEqual(legalGreen040RemovedActions(quad,0),[]);
});

test('Q2284 three chosen Dai-Gurren characters each gain BP+3000 this turn',()=>{
 const s=game();
 s.players[0].energyProduced={green:8,red:0};
 s.players[0].hand=[c('event','TTG-1-041')];
 s.players[0].front=[c('a','TTG-1-009'),c('b','TTG-1-006'),c('c','TTG-1-023'),c('same','TTG-1-010')];
 const legal=legalGreenEventActions(s,0);
 assert.ok(!legal.some(x=>x.targetUids?.includes('a')&&x.targetUids?.includes('same')));
 const action=legal.find(x=>JSON.stringify([...(x.targetUids||[])].sort())==='["a","b","c"]');
 assert.ok(action);
 const done=resolveGreenEvent(s,{player:0,handUid:'event',cardId:'TTG-1-041',targetUids:action.targetUids,payApUids:['AP0']});
 for(const uid of ['a','b','c']){
  const card=done.players[0].front.find(x=>x.uid===uid);
  assert.equal(card.currentBp,TTG_BY_ID[card.cardId].bp+3000);
 }
 assert.equal(done.players[0].front.find(x=>x.uid==='same').currentBp,undefined);
});

function redRaidBoard(){
 const s=game();
 const pl=s.players[0];
 pl.energy[0]=c('red','TTG-1-064',{gen:4});
 pl.energy[1]=c('nia','TTG-1-015');
 pl.energy[3]=c('direct','TTG-1-051');
 pl.front[0]=c('gurenSimon','TTG-1-072',{stack:[c('simon','TTG-1-051')]});
 pl.front[1]=c('lagannSimon','TTG-1-076',{stack:[c('simon2','TTG-1-009')]});
 pl.front[2]=c('gurenRossiu','TTG-1-072',{stack:[c('rossiu','TTG-1-070')]});
 pl.front[3]=c('gurenYoko','TTG-1-072',{stack:[c('yoko','TTG-1-064')]});
 pl.energy[2]=c('gurenKamina','TTG-1-072',{stack:[c('kamina','TTG-1-042')]});
 pl.hand=[c('top','TTG-1-074')];
 pl.deck=[c('draw','TTG-1-065'),c('draw2','TTG-1-066')];
 return s;
}
test('Q2397 TTG074 chains onto Gurren or Lagann whose buried base is Simon',()=>{
 const s=redRaidBoard();
 const options=legalRedHighRaids(s,0).filter(x=>x.cardId==='TTG-1-074');
 const sources=options.map(x=>x.sourceUid);
 assert.ok(sources.includes('gurenSimon'));
 assert.ok(sources.includes('lagannSimon'));
 assert.ok(sources.includes('direct'));
 assert.ok(!sources.includes('gurenYoko'));
 assert.ok(!sources.includes('gurenKamina'));
 const noNia=redRaidBoard();
 noNia.players[0].energy[1]=c('notNia','TTG-1-065');
 assert.equal(legalRedHighRaids(noNia,0).filter(x=>x.cardId==='TTG-1-074').length,0);
 const choice=options.find(x=>x.sourceUid==='gurenSimon'&&x.line==='front');
 const done=resolveRedHighRaid(s,{...choice,payApUids:['AP0']});
 const top=done.players[0].front[0];
 assert.equal(top.cardId,'TTG-1-074');
 assert.equal(top.stack[0].cardId,'TTG-1-051');
 assert.equal(top.under[0].cardId,'TTG-1-072');
 assert.equal(top.under[0].faceDown,true);
});

test('Q2398 and Q2299 Rossiu under a raided Gurren is a legal 074 chain and stays private',()=>{
 const s=redRaidBoard();
 const choice=legalRedHighRaids(s,0).find(x=>x.sourceUid==='gurenRossiu'&&x.line==='front');
 assert.ok(choice,'Q2398 answer is yes');
 const done=resolveRedHighRaid(s,{...choice,payApUids:['AP0']});
 const top=done.players[0].front[2];
 assert.equal(top.cardId,'TTG-1-074');
 assert.equal(top.stack[0].cardId,'TTG-1-070');
 assert.equal(top.under[0].cardId,'TTG-1-072');
 assert.equal(top.under[0].faceDown,true);
 ownerSees(top,['TTG-1-072']);
 opponentSees(top,1);
});

const coreDeck=()=>{
 const counts=Object.fromEntries(['042','043','005','006','047','048','064','065','019','066','002','068'].map(n=>['TTG-1-'+n,4]));
 counts['TTG-1-036']=1;counts['TTG-1-038']=1;
 return counts;
};
const takeCard=(pl,id)=>{
 for(const zone of ['deck','hand','life','outside']){
  const i=pl[zone].findIndex(x=>x.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw new Error('Missing '+id);
};
test('Q2296 an energy-line 068 attack still lets the opponent block or decline',()=>{
 let s=newTtgCoreMatch({decks:[coreDeck(),coreDeck()],seed:2296});
 s=dispatchTtgCoreAction(s,{type:'next'});
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'main');
 const yoko=takeCard(s.players[0],'TTG-1-068');
 const other=takeCard(s.players[0],'TTG-1-068');
 const blocker=takeCard(s.players[1],'TTG-1-005');
 const rested=takeCard(s.players[1],'TTG-1-064');
 const energyOnly=takeCard(s.players[1],'TTG-1-042');
 const plainLife=takeCard(s.players[1],'TTG-1-006');
 yoko.ready=true;other.ready=true;blocker.ready=true;rested.ready=false;energyOnly.ready=true;
 s.players[0].energy[0]=yoko;s.players[0].energy[1]=other;
 s.players[1].front[0]=blocker;s.players[1].front[1]=rested;s.players[1].energy[0]=energyOnly;
 s.players[1].deck.push(s.players[1].life[0]);s.players[1].life[0]=plainLife;
 s.players[0].turnCount=2;
 s=withTtgDerivedEnergy(s,0);
 const discard=s.players[0].hand[0];
 const main=legalTtgCoreActions(s).find(x=>x.type==='ttgRed068Main'&&x.uid===yoko.uid&&x.discardUid===discard.uid);
 assert.ok(main);
 s=dispatchTtgCoreAction(s,main);
 assert.equal(legalTtgCoreActions(s).some(x=>x.type==='ttgRed068Main'),false);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'attack');
 const attack=legalTtgCoreActions(s).find(x=>x.type==='attack'&&x.uid===yoko.uid);
 assert.ok(attack,'energy line can declare the attack');
 const swinging=dispatchTtgCoreAction(s,attack);
 assert.equal(swinging.pending?.kind,'block');
 const blocks=legalTtgCoreActions(swinging).filter(x=>x.type==='block').map(x=>x.blockUid);
 assert.ok(blocks.includes(null));
 assert.ok(blocks.includes(blocker.uid));
 assert.ok(!blocks.includes(rested.uid));
 assert.ok(!blocks.includes(energyOnly.uid));
 const blocked=dispatchTtgCoreAction(swinging,{type:'block',blockUid:blocker.uid});
 assert.equal(blocked.players[1].front[0],null);
 assert.equal(blocked.players[1].life.length,swinging.players[1].life.length);
 const declined=dispatchTtgCoreAction(swinging,{type:'block',blockUid:null});
 assert.equal(declined.players[1].front[0].uid,blocker.uid);
 assert.equal(declined.players[1].front[0].ready,true);
 assert.equal(declined.players[1].life.length,swinging.players[1].life.length-1);
 assert.equal(declined.pendingTtgLife ?? null,null);
 assert.equal(declined.publicLifeReveals.at(-1).cardId,'TTG-1-006');
 assert.equal(declined.publicLifeReveals.at(-1).outcome,'none');
});

test('Q2297 two Yoko 068 copies cannot both use Main in one turn',()=>{
 let s=newTtgCoreMatch({decks:[coreDeck(),coreDeck()],seed:2297});
 s=dispatchTtgCoreAction(s,{type:'next'});
 s=dispatchTtgCoreAction(s,{type:'next'});
 const first=takeCard(s.players[0],'TTG-1-068');
 const second=takeCard(s.players[0],'TTG-1-068');
 first.ready=true;second.ready=true;
 s.players[0].energy[0]=first;s.players[0].energy[1]=second;
 s.players[0].turnCount=2;
 s=withTtgDerivedEnergy(s,0);
 const discard=s.players[0].hand[0];
 s=dispatchTtgCoreAction(s,legalTtgCoreActions(s).find(x=>x.type==='ttgRed068Main'&&x.uid===first.uid&&x.discardUid===discard.uid));
 assert.equal(s.players[0].red068UsedTurn,s.turn);
 assert.equal(legalTtgCoreActions(s).some(x=>x.type==='ttgRed068Main'&&x.uid===second.uid),false);
});
