import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {soloBp,soloGen,canPlaceSolo,soloEnter,soloChoose,soloUseMain,canUseDemonCastleHigh,activateSoloCard,soloRetire,soloEndMain,assertSoloConservation,soldierTopOptions,resolveSoldierTop} from '../dist/solo-phase-effects.mjs';
const fixture=()=>({active:0,turn:5,phase:'main',pending:null,players:[0,1].map(()=>({field:[],hand:[],deck:[],outside:[],removed:[],life:[],ap:3}))});
const add=(s,id,zone='field',owner=0,uid=id)=>{let c={uid,cardId:id,owner,ready:true};s.players[owner][zone].push(c);return c;};
const card=(id)=>SOLO_LEVELING_CARDS.find(c=>c.id===id);
test('80 sourced SLG base cards have distinct ids, card types and no unsupported auto status',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.equal(new Set(SOLO_LEVELING_CARDS.map(c=>c.id)).size,80);
 assert.equal(card('SLG-1-034').type,'field');
 assert.equal(card('SLG-1-035').type,'field');
 assert.equal(card('SLG-1-036').type,'event');
 assert.equal(card('SLG-1-075').type,'field');
 assert.equal(card('SLG-1-080').type,'event');
 assert.equal(card('SLG-1-030').maxCopies,12);
 assert.deepEqual(card('SLG-1-030').aliases,['UAPR/SLG-1-030']);
 assert.equal(card('SLG-1-042').nameJa,'馬渕 勲');
 assert.ok(SOLO_LEVELING_CARDS.every(c=>c.auto===false&&c.artStatus==='rugia-external'));
});
test('001, 004, 010 passive BP and 003, 006 conditional generated energy',()=>{
 const s=fixture();const a=add(s,'SLG-1-001'),b=add(s,'SLG-1-004'),c=add(s,'SLG-1-010'),d=add(s,'SLG-1-003'),e=add(s,'SLG-1-006');
 assert.equal(soloBp(s,a),2500);assert.equal(soloBp(s,b),3500);assert.equal(soloBp(s,c),3000);
 assert.equal(soloGen(s,d),1);assert.equal(soloGen(s,e),2);e.ready=false;assert.equal(soloGen(s,e),1);
 for(let i=0;i<10;i++)add(s,'SLG-1-005','outside',0,'o'+i);
 assert.equal(soloBp(s,a),3000);assert.equal(soloBp(s,c),4000);assert.equal(soloGen(s,d),2);
 s.players[0].discardByOwnEffectTurn=s.turn;assert.equal(soloBp(s,b),4000);
 s.active=1;assert.equal(soloBp(s,a),2500);assert.equal(soloBp(s,b),3500);
});
test('002 choose draw/discard: drawn card can be chosen, identities conserved',()=>{
 const s=fixture();add(s,'SLG-1-002');add(s,'SLG-1-005','hand',0,'old');add(s,'SLG-1-007','deck',0,'new');
 assert.throws(()=>soloEnter(s,'SLG-1-002'),/choose/);
 soloEnter(s,'SLG-1-002',{mode:'drawDiscard'});
 assert.equal(s.players[0].hand.length,2);assert.equal(s.pending.kind,'discard');
 assert.throws(()=>soloChoose(s,{uid:'bad'}),/illegal/);
 assert.equal(s.pending.kind,'discard');
 soloChoose(s,{uid:'new'});assert.equal(s.players[0].outside[0].uid,'new');
 assert.equal(s.players[0].hand[0].uid,'old');assertSoloConservation(s,3);
});
test('002 alternative buff validates other own character, and is not treated as a draw',()=>{
 const s=fixture(),source=add(s,'SLG-1-002'),friend=add(s,'SLG-1-005','field',0,'friend'),enemy=add(s,'SLG-1-005','field',1,'enemy');
 assert.throws(()=>soloEnter(s,source.uid,{mode:'buff',targetUid:enemy.uid}),/illegal/);
 assert.throws(()=>soloEnter(s,source.uid,{mode:'buff',targetUid:source.uid}),/illegal/);
 soloEnter(s,source.uid,{mode:'buff',targetUid:friend.uid});
 assert.equal(soloBp(s,friend),3000);assert.equal(s.pending,null);assertSoloConservation(s,3);
});
test('004 entry draws then discards; 012 needs a Sung Jinwoo on field',()=>{
 let s=fixture();add(s,'SLG-1-004');add(s,'SLG-1-005','deck',0,'draw');
 soloEnter(s,'SLG-1-004');assert.equal(s.pending.kind,'discard');
 soloChoose(s,{uid:'draw'});assert.equal(soloBp(s,s.players[0].field[0]),4000);
 assertSoloConservation(s,2);
 s=fixture();add(s,'SLG-1-012');add(s,'SLG-1-007','deck',0,'top');
 soloEnter(s,'SLG-1-012');assert.equal(s.players[0].hand.length,0);
 add(s,'SLG-1-015');soloEnter(s,'SLG-1-012');
 assert.equal(s.players[0].hand[0].uid,'top');
});
test('014 cannot be placed or moved to front, mills 1; 016 mills exactly 2',()=>{
 const s=fixture(),a=add(s,'SLG-1-014'),b=add(s,'SLG-1-016');
 add(s,'SLG-1-005','deck',0,'t1');add(s,'SLG-1-005','deck',0,'t2');add(s,'SLG-1-005','deck',0,'t3');
 assert.equal(canPlaceSolo(a,'front'),false);assert.equal(canPlaceSolo(a,'energy'),true);
 soloEnter(s,a.uid);assert.equal(s.players[0].outside.length,1);
 soloEnter(s,b.uid);assert.equal(s.players[0].outside.length,3);assert.equal(s.players[0].deck.length,0);
 assertSoloConservation(s,5);
});
test('017 top inspection requires explicit owner choice, maintains UID count',()=>{
 const s=fixture();add(s,'SLG-1-017');add(s,'SLG-1-005','deck',0,'top');
 soloEnter(s,'SLG-1-017');assert.equal(s.pending.kind,'peekTop');
 assert.throws(()=>soloChoose(s,{destination:'removed'}),/illegal/);
 soloChoose(s,{destination:'outside'});assert.equal(s.players[0].outside[0].uid,'top');
 assertSoloConservation(s,2);
});
test('009 paid main ability: invalid cost cannot be spent, valid cost once per turn',()=>{
 const s=fixture(),c=add(s,'SLG-1-009');add(s,'SLG-1-005','hand',0,'pay');add(s,'SLG-1-005','hand',0,'next');
 assert.throws(()=>soloUseMain(s,c.uid,{discardUid:'none'}),/legal cost/);
 soloUseMain(s,c.uid,{discardUid:'pay'});assert.equal(soloBp(s,c),3000);
 assert.throws(()=>soloUseMain(s,c.uid,{discardUid:'next'}),/used/);
 assert.equal(s.players[0].hand.length,1);assertSoloConservation(s,3);
});
test('013 REST and temporary energy then retires at Main end, single UID',()=>{
 const s=fixture(),c=add(s,'SLG-1-013');
 assert.equal(soloGen(s,c),1);
 soloUseMain(s,c.uid);assert.equal(c.ready,false);assert.equal(soloGen(s,c),2);
 assert.throws(()=>soloUseMain(s,c.uid),/REST/);
 soloEndMain(s);assert.equal(s.players[0].field.length,0);assert.equal(s.players[0].outside[0].uid,c.uid);assertSoloConservation(s,1);
});
test('007 retirement draws one and never duplicates retired card',()=>{
 const s=fixture(),c=add(s,'SLG-1-007');add(s,'SLG-1-005','deck',0,'drawn');
 soloRetire(s,c.uid);assert.equal(s.players[0].outside[0].uid,c.uid);assert.equal(s.players[0].hand[0].uid,'drawn');assertSoloConservation(s,2);
});
test('FAQ Q2038 Demon Castle 19 outside cannot activate after discard, 20 can check threshold',()=>{
 const s=fixture(),c=add(s,'SLG-1-034');
 s.players[0].hand.push({uid:'pay',cardId:'SLG-1-005',owner:0});
 for(let i=0;i<19;i++)add(s,'SLG-1-005','outside',0,'o'+i);
 assert.equal(canUseDemonCastleHigh(s,c.uid),false);
 add(s,'SLG-1-005','outside',0,'o19');assert.equal(canUseDemonCastleHigh(s,c.uid),true);
 soloUseMain(s,c.uid);assert.equal(c.ready,false);assert.equal(s.players[0].outside.length,20);
 assertSoloConservation(s,22);
});
test('FAQ Q2055 next ACTIVE is consumed without actually activating',()=>{
 const c={ready:false,skipActive:1};
 assert.equal(activateSoloCard(c),false);assert.equal(c.ready,false);assert.equal(c.skipActive,0);
 assert.equal(activateSoloCard(c),true);assert.equal(c.ready,true);
});

test('Q2070: Iron counts original-BP REST shadow characters only, not a field with the same trait',()=>{
 const s=fixture(),iron=add(s,'SLG-1-027');const soldier=add(s,'SLG-1-030','field',0,'soldier');soldier.ready=false;
 const field=add(s,'SLG-1-035','field',0,'field');field.ready=false;
 field.cardId='SLG-1-035';
 assert.equal(soloBp(s,iron),3500);
 add(s,'SLG-1-033','field',0,'big').ready=false;
 assert.equal(soloBp(s,iron),3500);
 add(s,'SLG-1-031','field',0,'qualifying').ready=false;
 assert.equal(soloBp(s,iron),4000);
});
test('062 fourth-island trait count and 065/069 hand-size conditional BP',()=>{
 const s=fixture(),a=add(s,'SLG-1-062'),b=add(s,'SLG-1-065'),c=add(s,'SLG-1-069');
 assert.equal(soloBp(s,a),1500);assert.equal(soloBp(s,b),4000);assert.equal(soloBp(s,c),2500);
 for(let i=0;i<5;i++)add(s,'SLG-1-005','hand',0,'h'+i);
 for(let i=0;i<4;i++)add(s,'SLG-1-054','field',0,'raid'+i);
 assert.equal(soloBp(s,a),3000);assert.equal(soloBp(s,b),5000);assert.equal(soloBp(s,c),4000);
 assert.equal(soloGen(s,add(s,'SLG-1-041')),2);
});
test('030 Shadow Soldier looks at top 2 and requires explicit legal ordering of remaining cards',()=>{
 const s=fixture(),soldier=add(s,'SLG-1-030');add(s,'SLG-1-029','field',0,'ally');
 add(s,'SLG-1-015','deck',0,'jinwoo');add(s,'SLG-1-005','deck',0,'nonshadow');add(s,'SLG-1-030','deck',0,'rest');
 const opts=soldierTopOptions(s,soldier.uid);
 assert.deepEqual(opts.topUids,['jinwoo','nonshadow']);assert.deepEqual(opts.eligibleUids,['jinwoo']);
 assert.throws(()=>resolveSoldierTop(s,soldier.uid,{sendOutsideUid:'nonshadow',remainingTopUids:['jinwoo']}),/not eligible/);
 assert.throws(()=>resolveSoldierTop(s,soldier.uid,{sendOutsideUid:'jinwoo',remainingTopUids:['jinwoo']}),/illegal top order/);
 assert.equal(s.players[0].deck[0].uid,'jinwoo');
 resolveSoldierTop(s,soldier.uid,{sendOutsideUid:'jinwoo',remainingTopUids:['nonshadow']});
 assert.equal(s.players[0].outside[0].uid,'jinwoo');assert.equal(s.players[0].deck[0].uid,'nonshadow');
 assertSoloConservation(s,5);
});
test('030 must have ANOTHER allied shadow army; no effect is offered otherwise',()=>{
 const s=fixture(),soldier=add(s,'SLG-1-030');
 add(s,'SLG-1-015','deck',0,'jinwoo');
 assert.equal(soldierTopOptions(s,soldier.uid).available,false);
 assert.throws(()=>resolveSoldierTop(s,soldier.uid,{remainingTopUids:['jinwoo']}),/missing other/);
 assertSoloConservation(s,2);
});
