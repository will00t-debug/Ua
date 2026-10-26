import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,newUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezPacks,take} from './helpers/rez-v2-match.mjs';

const CONDITION={kind:'ownNameOrDistinctPrintedColorNames',turn:'own',zone:'field',
 name:'アナスタシア・ホーシン',color:'green',min:4};

test('REZ-2-043 and REZ-2-049 share one own-turn name-or-four-green-kinds bonus',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-043'].effectJa,/〈アナスタシア・ホーシン〉か異なるカード名の緑のキャラが4種類以上/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-043'].effectJa,/BP\+1500/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-049'].effectJa,/BP\+1000/);
 assert.deepEqual(rez.cards['REZ-2-043'].passiveBonuses,[{condition:CONDITION,bp:1500}]);
 assert.deepEqual(rez.cards['REZ-2-049'].passiveBonuses,[{condition:CONDITION,bp:1000}]);
 assert.equal(rez.cards['REZ-2-054'],undefined);
});

function place(s,player,id,line,slot){
 const card=take(s,player,id);card.ready=true;s.players[player][line][slot]=card;return card;
}

test('four printed green names turn the bonus on once, and an alias does not add a kind',()=>{
 const s=fresh(undefined,1043);
 const mimi=place(s,0,'REZ-2-043','front',0);
 const alias=place(s,0,'REZ-2-041','front',1);
 place(s,0,'REZ-2-033','energy',0);
 assert.equal(rez.cards['REZ-2-041'].nameAliases[0],'シルフィ');
 assert.equal(universalBp(rezPacks,s,mimi),2000,'184番 plus シルフィ is still one kind');
 const twin=take(s,0,'REZ-2-041');twin.ready=true;s.players[0].front[2]=twin;
 assert.equal(universalBp(rezPacks,s,mimi),2000,'two 184番 copies are one kind');
 s.players[0].front[2]=null;s.players[0].outside.push(twin);
 place(s,0,'REZ-2-035','energy',1);
 assert.equal(universalBp(rezPacks,s,mimi),3500);
 const ricardo=place(s,0,'REZ-2-049','front',2);
 assert.equal(universalBp(rezPacks,s,ricardo),4000);
 const other=structuredClone(s);other.active=1;
 assert.equal(universalBp(rezPacks,other,other.players[0].front[0]),2000);
 assert.equal(universalBp(rezPacks,other,other.players[0].front[2]),3000);
 const garfiel=s.players[0].energy[1];
 s.players[0].energy[1]=null;s.players[0].outside.push(garfiel,ricardo);
 s.players[0].front[2]=null;
 const blue=place(s,0,'REZ-2-014','energy',1);
 assert.equal(blue.cardId,'REZ-2-014');
 assert.equal(universalBp(rezPacks,s,mimi),2000);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('the name branch is Anastasia on the owner field, not an alias and not another zone',()=>{
 const unit=(id,extra={})=>({id,name:id,color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
  trigger:null,implementation:'vanilla',effects:{},...extra});
 const pack=createUniversalPack({id:'rez-kinds-fixture',cards:[
  unit('MEAS',{implementation:'dsl',passiveBonuses:[{condition:{...CONDITION},bp:1500}]}),
  unit('ANA',{name:'アナスタシア・ホーシン'}),
  unit('ALIAS',{name:'184番',nameAliases:['シルフィ'],implementation:'dsl'}),
  unit('A',{name:'オットー'}),unit('B',{name:'ベアトリス'}),unit('C',{name:'フェルト'}),
  unit('BLUE',{name:'スバル',color:'blue'}),
  unit('FIELD',{name:'アナスタシア・ホーシン',type:'field',bp:0}),
  ...Array.from({length:5},(_,i)=>unit('F'+i))
 ]});
 const ids=Object.keys(pack.cards);
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.F4=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:6043,first:0});
 const pull=(player,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[player][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const meas=pull(0,'MEAS');meas.ready=true;s.players[0].front[0]=meas;
 const ana=pull(0,'ANA');s.players[0].hand.push(ana);
 assert.equal(universalBp(packs,s,meas),2000);
 s.players[0].hand.pop();s.players[1].front[0]=ana;ana.ready=true;
 assert.equal(universalBp(packs,s,meas),2000);
 s.players[1].front[0]=null;s.players[0].energy[0]=ana;
 assert.equal(universalBp(packs,s,meas),3500);
 s.players[0].outside.push(ana);s.players[0].energy[0]=null;
 const alias=pull(0,'ALIAS');alias.ready=true;s.players[0].front[1]=alias;
 const a=pull(0,'A');a.ready=true;s.players[0].energy[0]=a;
 assert.equal(universalBp(packs,s,meas),2000,'printed 184番 is one kind even with a シルフィ alias');
 const field=pull(0,'FIELD');s.players[0].energy[2]=field;
 assert.equal(universalBp(packs,s,meas),2000,'a field is not a green character kind');
 const b=pull(0,'B');b.ready=true;s.players[0].energy[1]=b;
 assert.equal(universalBp(packs,s,meas),3500);
 const other=structuredClone(s);other.active=1;
 assert.equal(universalBp(packs,other,other.players[0].front[0]),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
