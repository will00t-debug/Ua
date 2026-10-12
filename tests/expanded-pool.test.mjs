import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {CARDS,BY_ID,PRESETS,validateDeck,pendingCards,resolveCardId} from '../dist/cards.mjs';
import {normalizeCounts,formatDeck,parseDeck,sameCounts,readSavedDecks} from '../dist/decks.mjs';
import {newGame,dispatch,legalActions,energy,bp,assertState} from '../dist/engine.mjs';

test('all requested base pools and four magazine reprints are complete and have local images',()=>{
 for(const [set,n] of [['b1',100],['b2',73],['b3',81],['nc',11],['book',4],['st',18]])assert.equal(CARDS.filter(c=>c.sets.includes(set)).length,n,set);
 assert.equal(CARDS.length,276);assert.equal(new Set(CARDS.map(c=>c.identity)).size,CARDS.length);
 for(const c of CARDS){assert.ok(c.name&&c.effect&&c.source);assert.ok(Number.isInteger(c.energy)&&Number.isInteger(c.bp)&&Number.isInteger(c.ap));assert.ok(existsSync(new URL('../dist/'+c.image,import.meta.url)),c.image);for(const v of c.variants||[])assert.ok(readFileSync(new URL('../dist/'+v.image,import.meta.url)).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),v.image);}
});
test('full series identities, reprints and verified parallel aliases share the four-card limit',()=>{
 assert.equal(resolveCardId('UA08BT/BLC-1-034'),'034');assert.equal(resolveCardId('UA08ST/BLC-1-034'),'034');
 assert.equal(resolveCardId('UAPR/BLC-1-103'),'103');assert.equal(resolveCardId('UAPR/BLC-2-032'),'BLC-2-032');assert.equal(resolveCardId('UAPR/BLC-4-032'),'BLC-4-032');
 assert.notEqual(resolveCardId('EX07BT/BLC-2-001'),resolveCardId('EX15BT/BLC-4-001'));
 assert.equal(resolveCardId('UA08BT/BLC-1-004_p1'),'BLC-1-004');
 assert.throws(()=>normalizeCounts({'034':3,'UA08BT/BLC-1-034':2}),/超過/);
 assert.throws(()=>normalizeCounts({'UAPR/BLC-4-032':3,'EX15BT/BLC-4-032':2}),/超過/);
 assert.throws(()=>normalizeCounts({'UA08BT/BLC-2-001':1}),/尚未支援/);
});
test('new cards can be saved, imported and exported while old saved constructions remain intact',()=>{
 const counts=normalizeCounts({...PRESETS[0].counts,'034':0,'EX15BT/BLC-4-004':4});
 assert.deepEqual(validateDeck(counts),[]);assert.equal(pendingCards(counts).length,0);
 assert.ok(sameCounts(parseDeck(formatDeck(counts,'第三彈測試')).counts,counts));
 const saved=readSavedDecks([{id:'old',name:'原有牌組',counts:PRESETS[0].counts},{id:'new',name:'新卡牌組',counts}]);assert.equal(saved.length,2);assert.ok(sameCounts(saved[0].counts,PRESETS[0].counts));
 assert.equal(newGame({decks:[counts,PRESETS[0].counts]}).status,'mulligan');
});
function fixture(extras={}){
 const counts={...PRESETS[0].counts};counts['034']-=Object.values(extras).reduce((a,b)=>a+b,0);Object.assign(counts,extras);
 let s=newGame({decks:[counts,counts],seed:17});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){pl.deck=[...pl.deck,...pl.hand,...pl.life];pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;}
 s.phase='main';s.turn=5;s.active=0;s.queue=[];s.pending=null;return s;
}
function take(s,p,id){const a=s.players[p].deck,i=a.findIndex(c=>c.cardId===id);assert.notEqual(i,-1,id);return a.splice(i,1)[0];}
function put(s,p,id,line,slot,ready=true){const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;}
const choose=(s,ids)=>dispatch(s,{type:'choose',ids});
test('mixed-color decks are legal but purple energy cannot pay a yellow requirement',()=>{
 let s=fixture({'BLC-1-010':1,'BLC-1-002':2});put(s,0,'102','energy',0);put(s,0,'102','energy',1);
 const c=take(s,0,'BLC-1-010');s.players[0].hand.push(c);assert.equal(energy(s,0),4);assert.equal(energy(s,0,'yellow'),0);assert.ok(!legalActions(s).some(a=>a.uid===c.uid));
 put(s,0,'BLC-1-002','energy',2);put(s,0,'BLC-1-002','energy',3);assert.ok(legalActions(s).some(a=>a.type==='play'&&a.uid===c.uid));assertState(s);
});
test('Step moves a front character to Energy for free and preserves its ready state',()=>{
 let s=fixture({'BLC-1-001':1});const c=put(s,0,'BLC-1-001','front',0,false);s.phase='move';const ap=s.players[0].ap;s=dispatch(s,{type:'step',uid:c.uid,slot:2});assert.equal(s.players[0].energy[2].uid,c.uid);assert.equal(s.players[0].energy[2].ready,false);assert.equal(s.players[0].ap,ap);assertState(s);
});
test('new entry debuffs and attack draw/discard effects resolve before the battle',()=>{
 let s=fixture({'BLC-1-049':1,'BLC-1-052':1});put(s,0,'102','energy',0);put(s,0,'102','energy',1);const target=put(s,1,'039','front',0),c=take(s,0,'BLC-1-049');s.players[0].hand.push(c);s=dispatch(s,{type:'play',uid:c.uid,line:'front',slot:0});assert.equal(s.pending.effect.kind,'ruleChoice');s=choose(s,[target.uid]);assert.equal(bp(s,s.players[1].front[0]),1000);
 const attacker=put(s,0,'BLC-1-052','front',1);s.phase='attack';const n=s.players[0].hand.length;s=dispatch(s,{type:'attack',uid:attacker.uid});assert.equal(s.players[0].hand.length,n+1);assert.equal(s.pending.effect.rule.op,'discard');s=choose(s,[s.players[0].hand[0].uid]);assert.equal(s.players[0].hand.length,n);assert.equal(s.pending.effect.kind,'block');assertState(s);
});
test('Damage 2 reveals simultaneously and the defender chooses Trigger order',()=>{
 let s=fixture({'BLC-1-074':1});const c=put(s,0,'BLC-1-074','front',0);s.players[1].life.push(take(s,1,'066'),take(s,1,'039'));s.phase='attack';s=dispatch(s,{type:'attack',uid:c.uid});s=choose(s,['pass']);assert.equal(s.revealed.length,2);assert.equal(s.pending.effect.kind,'triggerOrder');
 const final=s.revealed.find(x=>x.card.cardId==='066').card,other=s.revealed.find(x=>x.card.cardId==='039').card;s=choose(s,[final.uid]);s=choose(s,['activate']);assert.equal(s.players[1].life.length,1);s=choose(s,['activate']);assert.equal(s.players[1].life.length,1);assert.ok(s.players[1].hand.some(c=>c.uid===other.uid));assert.equal(s.status,'playing');assertState(s);
});
test('Impact immunity prevents life damage on a won blocked battle',()=>{
 let s=fixture({'BLC-1-009':1,'BLC-1-008':1});const a=put(s,0,'BLC-1-009','front',0),b=put(s,1,'BLC-1-008','front',0);a.buffs.push({turn:s.turn,bp:5000});s.players[1].life.push(take(s,1,'039'));s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,[b.uid]);assert.equal(s.players[1].life.length,1);assert.equal(s.players[1].front[0],null);assertState(s);
});
test('purple COLOR deploys an eligible outside character for free and resolves its entry',()=>{
 let s=fixture({'BLC-1-049':1});const trigger=take(s,1,'BLC-1-049'),target=take(s,1,'034');s.players[1].outside.push(target);s.players[1].life.push(trigger,take(s,1,'039'));const a=put(s,0,'103','front',0);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,['pass']);s=choose(s,['activate']);assert.equal(s.pending.effect.kind,'colorCard');s=choose(s,[target.uid]);s=choose(s,['front-0']);assert.equal(s.players[1].front[0].ready,true);assert.equal(s.pending.effect.kind,'discard');s=choose(s,[s.players[1].hand[0].uid]);assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));assertState(s);
});
