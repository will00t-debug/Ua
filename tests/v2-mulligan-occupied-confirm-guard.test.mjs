import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');

// Execute the EXACT pre-submit confirmation snippet used by the real browser,
// not a copied reimplementation. This used to throw on openingMulligan:
// displaced=null => displaced?.uid===a.replaceUid was undefined===undefined.
function confirmStep(action,{front=[null,null],energy=[null,null],confirm=()=>true}={}){
 const entry=source.indexOf('function applyAction(a){');
 assert.ok(entry>=0);
 const start=source.indexOf('  const replacementLine=',entry);
 const end=source.indexOf('  app.undo=',start);
 assert.ok(start>entry&&end>start,'capture pre-submit source block');
 const snippet=source.slice(start,end);
 const invoke=new Function('a','app','cardDef','window',snippet+"\nreturn 'proceed';");
 const app={state:{players:[{front,energy}]}};
 return invoke(action,app,()=>({name:'原角色'}),{confirm});
}

test('keep / redraw / next without replaceUid never inspect null cardId or request replacement',()=>{
 let confirmations=0;
 const options=[
  {type:'openingMulligan',mode:'keep'},
  {type:'openingMulligan',mode:'redraw'},
  {type:'next'},
  {type:'event',uid:'0-6'},
  {type:'play',uid:'0-6',line:'energy',slot:0}
 ];
 for(const option of options)
  assert.equal(confirmStep(option,{confirm:()=>{confirmations++;return true;}}),'proceed',
   option.type+' must bypass occupied-slot confirmation');
 assert.equal(confirmations,0,'no confirmation for missing replaceUid');
});

test('actual occupied replacement still confirms and cancelled confirmation does not submit',()=>{
 const occupied={uid:'0-5',cardId:'BLC-1-034'};
 const a={type:'raid',uid:'0-9',line:'front',slot:1,replaceUid:occupied.uid};
 let count=0;
 assert.equal(confirmStep(a,{front:[null,occupied],confirm:()=>{count++;return false;}}),undefined);
 assert.equal(confirmStep(a,{front:[null,occupied],confirm:()=>{count++;return true;}}),'proceed');
 assert.equal(count,2);
 assert.equal(confirmStep({...a,replaceUid:'0-other'},{front:[null,occupied],
  confirm:()=>{throw Error('should not confirm wrong UID');}}),'proceed');
});
