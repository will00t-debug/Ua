import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, generated, energy} from '../dist/engine.mjs';
import {BY_ID} from '../dist/cards.mjs';

const fake=(id,uid=id)=>({uid,cardId:id,ready:true,stack:[],buffs:[],under:[],usedTurn:-1});
function fixture(id,line='energy'){
 const s=newGame({seed:2332});
 s.players[0].energy.fill(null);s.players[0].front.fill(null);
 s.players[1].turnCount=3;
 const c=fake(id,'target');
 s.players[0][line][0]=c;
 return {s,c};
}
const silence=c=>{c.silencedUntilSource={p:1,turnCount:4};};

test('FAQ Q2329–Q2332: printed ACTIVE extra energy ends when original text is lost',()=>{
 const {s,c}=fixture('BLC-1-010');
 assert.equal(generated(s,c),BY_ID[c.cardId].gen+1);
 silence(c);
 assert.equal(generated(s,c),BY_ID[c.cardId].gen);
});

test('FAQ Q2329–Q2332: printed underneath-card energy bonus is suppressed',()=>{
 const {s,c}=fixture('BLC-3-011');
 c.under=[fake('034','under')];
 assert.equal(generated(s,c),BY_ID[c.cardId].gen+1);
 silence(c);
 assert.equal(generated(s,c),BY_ID[c.cardId].gen);
});

test('FAQ Q2329–Q2332: printed trait-based extra energy is suppressed',()=>{
 const {s,c}=fixture('BLC-2-062');
 for(let i=0;i<3;i++)s.players[0].front[i]=fake(['BLC-3-008','BLC-3-009','BLC-3-010'][i],`trait${i}`);
 assert.equal(generated(s,c),BY_ID[c.cardId].gen+1);
 silence(c);
 assert.equal(generated(s,c),BY_ID[c.cardId].gen);
});

test('FAQ Q2329–Q2332: printed front-line generation must not continue after silence',()=>{
 const {s,c}=fixture('BLC-1-092','front');
 assert.equal(energy(s,0,'green'),1);
 silence(c);
 assert.equal(energy(s,0,'green'),0);
});

test('FAQ Q2332: bonus already granted by another effect remains after silence',()=>{
 const {s,c}=fixture('BLC-1-010');
 c.energyBoostTurn=s.turn;c.energyBoostAmount=2;
 silence(c);
 assert.equal(generated(s,c),BY_ID[c.cardId].gen+2);
});
