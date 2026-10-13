import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS, BY_ID, validateDeck, pendingCards, deckColors} from '../dist/cards.mjs';
import {TRAINING_DECKS} from '../dist/training-decks.mjs';
import {newGame, dispatch, legalActions, controller, assertState} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

test('all three submitted PDF decks contain exactly 50 unique, canonical and legal cards', () => {
  assert.deepEqual(TRAINING_DECKS.map(d=>d.sourceCode),['eb05301f80','eb052afef7','eb052c890b']);
  assert.equal(TRAINING_DECKS.length,3);
  const used=new Set();
  for(const d of TRAINING_DECKS){
    assert.equal(Object.values(d.counts).reduce((a,b)=>a+b,0),50,d.name);
    assert.deepEqual(validateDeck(d.counts),[],d.name);
    assert.deepEqual(pendingCards(d.counts),[],d.name+' has unsupported card effects');
    assert.deepEqual(deckColors(d.counts),[d.color],d.name);
    for(const [id,count] of Object.entries(d.counts)){
      assert.ok(BY_ID[id],id+' not present in supported BLEACH collection');
      assert.ok(count>=1&&count<=4);
      assert.equal(BY_ID[id].identity,id);
    }
    assert.ok(!used.has(d.sourceCode));
    used.add(d.sourceCode);
  }
});

test('all ordered training deck matchups create legal states and both players can act',()=>{
  for(const [i,own] of TRAINING_DECKS.entries())
   for(const [j,other] of TRAINING_DECKS.entries()){
    let s=newGame({decks:[own.counts,other.counts],seed:1070+i*3+j,mode:'solo',first:i%2});
    s=dispatch(s,{type:'keep'});
    s=dispatch(s,{type:'keep'});
    assertState(s);
    for(let action=0;action<20&&s.status==='playing';action++){
      const p=controller(s),a=chooseAiAction(s,{difficulty:action%3===0?'hard':'normal'});
      assert.ok(a,own.name+' vs '+other.name);
      assert.ok(legalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
      s=dispatch(s,a,p);
      assertState(s);
    }
  }
});
