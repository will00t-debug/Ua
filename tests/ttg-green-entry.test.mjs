import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_ENTRY_IDS,legalTtgGreenEntryDecisions,resolveTtgGreenEntry} from '../dist/ttg-green-entry.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const card=(uid,id,extra={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id]?.nameJa,ready:true,stack:[],under:[],...extra});
const state=(id)=>({turn:4,active:0,phase:'main',players:[
 {front:[card('src',id),null,null,null],energy:[null,null,null,null],hand:[],deck:[],outside:[],life:[]},
 {front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],outside:[],life:[]}
 ],log:[],pending:{kind:'ttgGreenEntry',player:0,sourceUid:'src'}});
const all=(pl)=>{
 const recur=c=>[c.uid,...(c.stack||[]).flatMap(recur),...(c.under||[]).flatMap(recur)];
 return [...pl.front.filter(Boolean),...pl.energy.filter(Boolean),...pl.hand,...pl.deck,...pl.outside,...pl.life].flatMap(recur).sort();
};
const effect=(s,payload)=>resolveTtgGreenEntry(s,{player:0,sourceUid:'src',...payload});
test('green entry effect registry contains only the six independently implemented IDs',()=>{
 assert.deepEqual(TTG_GREEN_ENTRY_IDS,['TTG-1-001','TTG-1-009','TTG-1-010','TTG-1-014','TTG-1-023','TTG-1-026']);
 assert.ok(TTG_GREEN_ENTRY_IDS.every(id=>TTG_BY_ID[id]?.color==='green'));
});
test('001 Viral may inspect top: keep physical top or move to outside without drawing',()=>{
 const s=state('TTG-1-001');s.players[0].deck=[card('d','TTG-1-005'),card('d2','TTG-1-042')];
 const original=JSON.stringify(s),list=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(list.map(x=>x.mode),['keepTop','outsideTop']);
 assert.throws(()=>effect(s,{mode:'outsideTop',takeUid:'d'}));
 const kept=effect(s,{mode:'keepTop'});assert.deepEqual(kept.players[0].deck.map(c=>c.uid),['d','d2']);
 const outside=effect(s,{mode:'outsideTop'});
 assert.deepEqual(outside.players[0].outside.map(c=>c.uid),['d']);
 assert.deepEqual(outside.players[0].deck.map(c=>c.uid),['d2']);
 assert.deepEqual(all(outside.players[0]),all(s.players[0]));
 assert.equal(outside.pending,null);
 assert.equal(JSON.stringify(s),original);
});
test('009 Simon draws 1 then discards ANY hand card, including just-drawn card',()=>{
 const s=state('TTG-1-009');s.players[0].hand=[card('h','TTG-1-042')];
 s.players[0].deck=[card('top','TTG-1-005'),card('next','TTG-1-006')];
 const original=all(s.players[0]),options=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(options[0].discardUids,['h','top']);
 assert.throws(()=>effect(s,{mode:'drawThenDiscard',discardUid:'other'}));
 const a=effect(s,{mode:'drawThenDiscard',discardUid:'top'});
 assert.deepEqual(a.players[0].hand.map(x=>x.uid),['h']);assert.deepEqual(a.players[0].outside.map(x=>x.uid),['top']);
 const b=effect(s,{mode:'drawThenDiscard',discardUid:'h'});
 assert.deepEqual(b.players[0].hand.map(x=>x.uid),['top']);
 assert.deepEqual(all(a.players[0]),original);
 assert.deepEqual(all(b.players[0]),original);
});
test('010 Simon looks at exactly top 3, selects only Great Gurren, discards and orders remaining bottom',()=>{
 const s=state('TTG-1-010');s.players[0].hand=[card('h','TTG-1-042')];
 s.players[0].deck=[card('a','TTG-1-006'),card('b','TTG-1-081'),card('c','TTG-1-023'),card('rest','TTG-1-005')];
 const before=all(s.players[0]),options=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(options[0].candidateUids,['a','c']);
 assert.throws(()=>effect(s,{mode:'search',takeUid:'b',discardUid:'h',bottomOrderUids:['a','c']}));
 assert.throws(()=>effect(s,{mode:'search',takeUid:'a',bottomOrderUids:['b','c']}));
 assert.throws(()=>effect(s,{mode:'search',takeUid:'a',discardUid:'h',bottomOrderUids:['b','b']}));
 const out=effect(s,{mode:'search',takeUid:'a',discardUid:'h',bottomOrderUids:['c','b']});
 assert.deepEqual(out.players[0].hand.map(x=>x.uid),['a']);
 assert.deepEqual(out.players[0].outside.map(x=>x.uid),['h']);
 assert.deepEqual(out.players[0].deck.map(x=>x.uid),['rest','c','b']);
 assert.deepEqual(all(out.players[0]),before);
});
test('023 Leeron only adds Gunmen from top 5, discards only on adding',()=>{
 const s=state('TTG-1-023');s.players[0].hand=[card('h','TTG-1-042')];
 s.players[0].deck=[card('a','TTG-1-009'),card('b','TTG-1-029'),card('c','TTG-1-036'),card('d','TTG-1-019'),card('e','TTG-1-027'),card('f','TTG-1-005')];
 const options=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(options[0].candidateUids,['b','e']);
 const skip=effect(s,{mode:'search',bottomOrderUids:['e','d','c','b','a']});
 assert.deepEqual(skip.players[0].deck.map(x=>x.uid),['f','e','d','c','b','a']);
 assert.deepEqual(skip.players[0].hand.map(x=>x.uid),['h']);
 const take=effect(s,{mode:'search',takeUid:'e',discardUid:'h',bottomOrderUids:['d','b','c','a']});
 assert.deepEqual(take.players[0].hand.map(x=>x.uid),['e']);
 assert.deepEqual(take.players[0].deck.map(x=>x.uid),['f','d','b','c','a']);
 assert.deepEqual(all(take.players[0]),all(s.players[0]));
});
test('014 Nia mandatory return own <=1-cost other; if none return self',()=>{
 const s=state('TTG-1-014');
 s.players[0].energy[0]=card('cheap','TTG-1-005');
 s.players[1].front[0]=card('enemy','TTG-1-005');
 const choice=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(choice[0].candidateUids,['cheap']);
 assert.throws(()=>effect(s,{mode:'mandatoryBounce',returnUid:'enemy'}));
 assert.throws(()=>effect(s,{mode:'mandatoryBounce'}));
 const out=effect(s,{mode:'mandatoryBounce',returnUid:'cheap'});
 assert.deepEqual(out.players[0].hand.map(x=>x.uid),['cheap']);
 assert.equal(out.players[0].energy[0],null);
 const empty=state('TTG-1-014');
 const self=effect(empty,{mode:'mandatoryBounce'});
 assert.equal(self.players[0].front[0],null);
 assert.deepEqual(self.players[0].hand.map(x=>x.uid),['src']);
 assert.deepEqual(all(self.players[0]),all(empty.players[0]));
});
test('026 Rossiu chooses top-7 Ark search OR outside recovery, never both',()=>{
 const s=state('TTG-1-026');
 s.players[0].deck=[card('a','TTG-1-005'),card('ark','TTG-1-033'),card('other','TTG-1-023'),card('d','TTG-1-042')];
 s.players[0].outside=[card('recovery','TTG-1-033')];
 const op=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:'src'});
 assert.deepEqual(op[0].candidateUids,['ark']);assert.deepEqual(op[0].outsideUids,['recovery']);
 assert.throws(()=>effect(s,{mode:'arkChoice',takeUid:'ark',bottomOrderUids:['a','a','other']}));
 const fromDeck=effect(s,{mode:'arkChoice',takeUid:'ark',bottomOrderUids:['other','a','d']});
 assert.deepEqual(fromDeck.players[0].hand.map(x=>x.uid),['ark']);
 assert.deepEqual(fromDeck.players[0].deck.map(x=>x.uid),['other','a','d']);
 const fromOutside=effect(s,{mode:'arkChoice',takeUid:'recovery'});
 assert.deepEqual(fromOutside.players[0].hand.map(x=>x.uid),['recovery']);
 assert.deepEqual(fromOutside.players[0].deck.map(x=>x.uid),['a','ark','other','d']);
 assert.deepEqual(all(fromDeck.players[0]),all(s.players[0]));
 assert.deepEqual(all(fromOutside.players[0]),all(s.players[0]));
});
test('entry cannot be resolved by opponent or replayed after its pending resolution',()=>{
 const s=state('TTG-1-001');s.players[0].deck=[card('d','TTG-1-005')];
 assert.throws(()=>resolveTtgGreenEntry(s,{player:1,sourceUid:'src',mode:'keepTop'}));
 const first=effect(s,{mode:'keepTop'});
 assert.equal(first.pending,null);
 // Entry completion is controlled by a pending effect in a match.
 assert.deepEqual(legalTtgGreenEntryDecisions({...first,pending:{kind:'ttgGreenEntry',player:1,sourceUid:'src'}},{player:0,sourceUid:'src'}),[]);
});
