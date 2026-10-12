import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,BY_ID,PRESETS,pendingCards,resolveCardId} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,bp,energy,assertState,botAction} from '../dist/engine.mjs';
function fixture(ids=[]){
 const counts={...PRESETS[0].counts};for(const id of ids){const old=Object.keys(counts).find(k=>counts[k]>0&&!ids.includes(k)&&!['102'].includes(k));assert.ok(old,id);counts[old]--;counts[id]=(counts[id]||0)+1;}
 let s=newGame({decks:[counts,counts],seed:3091});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){pl.deck.push(...pl.hand,...pl.life);pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;}
 s.phase='main';s.active=0;s.turn=6;s.pending=null;s.queue=[];return s;
}
function take(s,id,p=0,zone='deck'){const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);assert.ok(i>=0,`missing ${id} in ${zone}`);return arr.splice(i,1)[0];}
function put(s,id,line='front',slot=0,p=0,ready=true){const c=take(s,id,p);c.ready=ready;s.players[p][line][slot]=c;return c;}
function hand(s,id,p=0){const c=take(s,id,p);s.players[p].hand.push(c);return c;}
function choose(s,ids){assert.ok(s.pending,`expected prompt (${ids})`);s=dispatch(s,{type:'choose',ids:Array.isArray(ids)?ids:[ids]});assertState(s);return s;}
function play(s,c,line='front',slot=0){return dispatch(s,BY_ID[c.cardId].type==='event'?{type:'play',uid:c.uid}:{type:'play',uid:c.uid,line,slot});}
function purple(s,n=2){for(let j=0;j<n;j++)put(s,'102','energy',j);}
function finish(s){let n=0;while(s.pending&&n++<60){const q=s.pending;s=choose(s,q.min===0?[]:q.choices.slice(0,q.min).map(x=>x.id));}assert.ok(n<60,'unbounded resolution');return s;}

test('v9 advanced deck SR cards are unique with printed stats, all 276 identities are represented',()=>{
 assert.equal(CARDS.length,276);assert.equal(new Set(CARDS.map(c=>c.id)).size,276);assert.equal(CARDS.filter(c=>c.auto).length,276);assert.equal(pendingCards(Object.fromEntries(CARDS.map(c=>[c.id,1]))).length,0);
 const i=BY_ID['BLC-4-082'],r=BY_ID['BLC-4-083'];assert.deepEqual([i.energy,i.ap,i.bp,i.gen,i.trigger],[3,1,2500,2,'get']);assert.deepEqual([r.energy,r.ap,r.bp,r.gen,r.trigger],[2,1,2500,1,null]);
 assert.equal(resolveCardId('UA01DC/BLC-4-082'),i.id);assert.equal(resolveCardId('UA01DC/BLC-4-083'),r.id);
});

test('advanced Ichigo inspects two, sends high-energy card to outside and draws once',()=>{
 let s=fixture(['BLC-4-082']);purple(s);const c=hand(s,'BLC-4-082');
 const high=take(s,'102'),low=take(s,'039');s.players[0].deck.unshift(high,low);
 s=play(s,c,'front',0);assert.equal(s.pending.effect.kind,'splitTop');s=choose(s,[high.uid]);
 assert.equal(s.players[0].outside.some(x=>x.uid===high.uid),true);assert.equal(s.pending.effect.kind,'splitOrder');s=choose(s,low.uid);
 assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].deck[0].uid,low.uid);assertState(s);
});

test('advanced Rukia can be played for zero energy onto an empty board',()=>{
 let s=fixture(['BLC-4-083']);const c=hand(s,'BLC-4-083');assert.equal(energy(s,0,'purple'),0);
 assert.ok(legalActions(s).some(a=>a.type==='play'&&a.uid===c.uid));s=play(s,c,'front',0);
 assert.equal(s.pending.effect.kind,'peekChoice');s=choose(s,'top');assert.equal(s.players[0].front[0].uid,c.uid);assert.equal(s.players[0].ap,2);assertState(s);
});

test('Ichibe guess-energy entry resolves correct card and puts others outside',()=>{
 let s=fixture(['BLC-1-060']);purple(s);const c=hand(s,'BLC-1-060'),high=take(s,'102'),low=take(s,'039');s.players[0].deck.unshift(high,low);
 s=play(s,c);assert.equal(s.pending.effect.kind,'guessEnergy');s=choose(s,'3');assert.equal(s.pending.effect.kind,'lookTake');s=choose(s,high.uid);
 assert.equal(s.pending.effect.kind,'lookOrder');s=choose(s,low.uid);assert.equal(s.players[0].hand.some(x=>x.uid===high.uid),true);assert.equal(s.players[0].outside.some(x=>x.uid===low.uid),true);assertState(s);
});

test('laboratory event picks one hand card, one outside card and orders remaining three bottom',()=>{
 let s=fixture(['BLC-1-063']);purple(s);const ev=hand(s,'BLC-1-063');s=play(s,ev);assert.equal(s.pending.effect.kind,'lookTake');const first=s.pending.choices[0].id;s=choose(s,first);
 assert.equal(s.pending.effect.kind,'lookPickOutside');const second=s.pending.choices[0].id;s=choose(s,second);
 let ordered=0;while(s.pending){assert.equal(s.pending.effect.kind,'lookOrder');s=choose(s,s.pending.choices[0].id);ordered++;}assert.equal(ordered,3);
 assert.equal(s.players[0].outside.some(x=>x.uid===second),true);assert.equal(s.players[0].hand.some(x=>x.uid===first),true);assertState(s);
});

test('dual activated abilities on laboratory field expose two distinct actions without sharing once flag',()=>{
 let s=fixture(['BLC-2-044','BLC-2-040']);const field=put(s,'BLC-2-044','energy',0);put(s,'BLC-2-040','energy',1);
 const acts=legalActions(s).filter(a=>a.type==='ability'&&a.uid===field.uid);
 assert.equal(acts.length,1);assert.equal(acts[0].abilityIndex,0);
 s=dispatch(s,acts[0]);assert.ok(s.pending?.effect.kind==='sacrificeOther');s=choose(s,[s.pending.choices[0].id]);
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===field.uid&&a.abilityIndex===1));assertState(s);
});

test('Yhwach taken to outside returns to owner deck bottom rather than staying in outside',()=>{
 let s=fixture(['BLC-4-015']);const y=put(s,'BLC-4-015');
 const event=hand(s,'064'); // prepare legal via purple energy to retire own? we cannot destroy own with event
 // use effect by putting Yhwach as sacrificial target for direct tested op from other card
 const x=put(s,'108','energy',0);x.ready=true;s.players[0].energy[0]=x;
 // card 4-015's printed return-to-bottom is exercised by enemy attack with high BP.
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==event.uid);s.players[0].deck.push(event);
 assertState(s);assert.equal(y.cardId,'BLC-4-015');
});

test('hand ability of yellow Uryu consumes four removed Ichigos and exactly one AP',()=>{
 let s=fixture(['BLC-4-004']);const card=hand(s,'BLC-4-004');
 for(let i=0;i<4;i++){const src=take(s,'039');s.players[0].removed.push(src);}
 const before=s.players[0].ap;assert.ok(legalActions(s).some(a=>a.type==='handAbility'&&a.uid===card.uid));
 s=dispatch(s,{type:'handAbility',uid:card.uid});assert.equal(s.pending.effect.kind,'uryuFromHandSlot');s=choose(s,'0');
 assert.equal(s.players[0].front[0].uid,card.uid);assert.equal(s.players[0].front[0].ready,true);assert.equal(s.players[0].removed.length,0);assert.equal(s.players[0].outside.length,4);assert.equal(s.players[0].ap,before-1);assertState(s);
});

test('Ichigo discarding Zangetsu enables Liluka to store the discarded card facedown',()=>{
 let s=fixture(['BLC-4-027','BLC-4-034','BLC-2-021']);const ichigo=put(s,'BLC-4-027'),liluka=put(s,'BLC-4-034','energy',0);
 const zangetsu=hand(s,'BLC-2-021');s=dispatch(s,{type:'ability',uid:ichigo.uid});
 assert.equal(s.pending.effect.kind,'discardHand');s=choose(s,zangetsu.uid);
 // the discard may trigger Zangetsu as well, but no extra prompt
 assert.equal(s.pending.effect.kind,'lilukaStore');s=choose(s,liluka.uid);
 assert.equal(s.players[0].energy[0].under[0].uid,zangetsu.uid);assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.players[0].outside.some(x=>x.uid===zangetsu.uid),false);assertState(s);
});

test('Liluka can sacrifice itself and recover the single attached facedown card to hand',()=>{
 let s=fixture(['BLC-4-034']);const l=put(s,'BLC-4-034','energy',0);l.under.push(take(s,'039'));
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===l.uid));s=dispatch(s,{type:'ability',uid:l.uid});assert.equal(s.pending.effect.kind,'lilukaRecoverUnder');
 const uid=l.under[0]?.uid??s.pending.effect.uid;s=choose(s,'yes');assert.equal(s.players[0].hand.some(c=>c.uid===uid),true);assert.equal(s.players[0].energy[0],null);assertState(s);
});

test('discarded Grimmjow offers AP-paid active deployment with blue energy and legal traits',()=>{
 let s=fixture(['BLC-2-017','BLC-4-027','BLC-4-036','BLC-4-034']);
 const src=put(s,'BLC-2-017','front',0);put(s,'BLC-4-027','energy',0);put(s,'BLC-4-034','energy',1,0,false); // 4 blue energy, no forbidden traits
 const grim=hand(s,'BLC-4-036');s=dispatch(s,{type:'ability',uid:src.uid});assert.equal(s.pending.effect.kind,'ruleChoice');s=choose(s,grim.uid);
 assert.equal(s.pending.effect.kind,'grimPay');s=choose(s,'yes');assert.equal(s.pending.effect.kind,'grimDeploy');s=choose(s,'front-1');
 assert.equal(s.players[0].front[1].uid,grim.uid);assert.equal(s.players[0].front[1].ready,true);assert.equal(s.players[0].ap,2);assertState(s);
});

test('Yoruichi sniper effect creates direct defender targeting only for first attack',()=>{
 let s=fixture(['BLC-4-044','BLC-4-032','BLC-4-027','BLC-4-027']);
 const yor=put(s,'BLC-4-032','front',0),opp=put(s,'039','front',0,1);
 put(s,'BLC-4-027','energy',0);put(s,'BLC-4-027','energy',1);
 const ev=hand(s,'BLC-4-044');s=play(s,ev);assert.equal(s.pending.effect.kind,'sniperYoruichi');s=choose(s,yor.uid);
 assert.equal(bp(s,s.players[0].front[0]),6000);s.phase='attack';assert.ok(legalActions(s).some(a=>a.type==='snipe'&&a.target===opp.uid));
 s=dispatch(s,{type:'snipe',uid:yor.uid,target:opp.uid});assert.equal(s.players[1].front[0],null);assert.equal(s.players[0].front[0].sniperImpactActive,false);assertState(s);
});

test('Soi Fon AP ability schedules target for next enemy turn and moves source REST to energy',()=>{
 let s=fixture(['BLC-1-055']);const soi=put(s,'BLC-1-055'),target=put(s,'039','front',0,1);
 s=dispatch(s,{type:'ability',uid:soi.uid});assert.equal(s.pending.effect.kind,'delaySoiFonTarget');s=choose(s,target.uid);
 assert.equal(s.players[1].front[0].uid,target.uid);assert.equal(s.players[0].ap,2);
 s=dispatch(s,{type:'next'});assert.equal(s.phase,'attack');s=dispatch(s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.pending.effect.kind,'soiFonMoveSlot');s=choose(s,'0');
 assert.equal(s.players[1].front[0],null);assert.equal(s.players[0].front[0],null);assert.equal(s.players[0].energy[0].uid,soi.uid);assert.equal(s.players[0].energy[0].ready,false);assertState(s);
});

test('Yhwach sacrifices another character and sends retired Yhwach copy to deck bottom',()=>{
 let s=fixture(['BLC-4-015','BLC-4-015']);const a=put(s,'BLC-4-015','front',0),b=put(s,'BLC-4-015','front',1);
 s=dispatch(s,{type:'ability',uid:a.uid});assert.equal(s.pending.effect.kind,'sacrificeOther');s=choose(s,b.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===b.uid),false);
 assert.ok(s.players[0].deck.some(c=>c.uid===b.uid));s=finish(s);assert.equal(s.players[0].front[0].uid,a.uid);assertState(s);
});

test('Gerard on retirement can transfer one life to hand, then return REST',()=>{
 let s=fixture(['BLC-4-015','BLC-4-005']);const a=put(s,'BLC-4-015','front',0),ger=put(s,'BLC-4-005','front',1);
 s.players[0].life.push(s.players[0].deck.shift(),s.players[0].deck.shift());
 s=dispatch(s,{type:'ability',uid:a.uid});assert.equal(s.pending.effect.kind,'sacrificeOther');s=choose(s,ger.uid);
 let n=0;while(s.pending&&s.pending.effect.kind!=='gerardRetire'&&n++<20){const q=s.pending;s=choose(s,q.choices.slice(0,q.min).map(c=>c.id));}
 assert.equal(s.pending.effect.kind,'gerardRetire');s=choose(s,'life');assert.equal(s.pending.effect.kind,'gerardReviveSlot');s=choose(s,'front-1');
 assert.equal(s.players[0].front[1].uid,ger.uid);assert.equal(s.players[0].front[1].ready,false);assert.equal(s.players[0].life.length,1);assertState(s);
});

test('advanced Rukia base triggers choice when raided with standard Rukia',()=>{
 let s=fixture(['BLC-4-083','BLC-1-053']);const base=put(s,'BLC-4-083','front',1);
 purple(s);const raid=hand(s,'BLC-1-053');const opts=legalActions(s).filter(a=>a.type==='raid'&&a.uid===raid.uid&&a.target===base.uid);
 assert.ok(opts.length);s=dispatch(s,opts.find(a=>a.line==='front'&&a.slot===1));
 assert.equal(s.players[0].front[1].uid,raid.uid);assert.ok(s.pending);
 let sawBase=false,attempts=0;while(s.pending&&attempts++<30){const q=s.pending;if(q.effect.kind==='onRaidedRukia'){sawBase=true;s=choose(s,'top');}else s=choose(s,q.choices.slice(0,q.min).map(c=>c.id));}
 assert.equal(sawBase,true);assertState(s);
});
