import test from 'node:test';
import assert from 'node:assert/strict';
import {r53FiveDirectionLiveAudit} from '../scripts/v2-r53-five-direction-candidate-report.mjs';
import {countOwnOutsidePhysicalGroups} from '../dist/universal-v2/field-conditions.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const sao=registeredV2TitlePack('sword-art-online'),packs=[sao,sao];
const ids=['SAO-2-063','SAO-1-100','SAO-1-070','SAO-2-068',
 'SAO-2-069','SAO-1-078','SAO-1-079','SAO-1-068','SAO-1-069',
 'SAO-1-005','SAO-1-057','SAO-1-051','SAO-1-019'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(sao,deck),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing real printed physical '+id);
}
test('R53 five-direction census checks all 700 source identities, not keyword READY',()=>{
 const {report,focused,sao:saos,unreviewed}=r53FiveDirectionLiveAudit();
 assert.equal(report.catalogue,700);
 assert.equal(report.registered+report.unportedSearched,700);
 assert.equal(report.titles,5);
 assert.equal(report.officialReviewedPartial,0);
 assert.equal(report.officialReviewedRegistered,4);
 assert.equal(report.readyInferredFromText,0);
 assert.equal(Object.values(report.byTitle).reduce((n,x)=>n+x.unported,0),
  report.unportedSearched);
 assert.ok(focused.some(x=>x.id==='SLG-1-021'&&x.status==='REGISTERED'&&x.missing.length===0));
 assert.ok(focused.some(x=>x.id==='MST-1-009'&&x.status==='REGISTERED'&&x.missing.length===0));
 assert.ok(focused.some(x=>x.id==='TTG-1-067'&&x.status==='REGISTERED'&&x.missing.length===0));
 assert.ok(focused.some(x=>x.id==='SAO-1-071'&&x.status==='REGISTERED'&&x.missing.length===0));
 assert.ok(saos.find(x=>x.id==='SAO-2-063'&&x.registered&&x.status==='REGISTERED'));
 assert.equal(saos.length,12);
 assert.ok(unreviewed.every(x=>x.status==='REVIEW PENDING'));
});
test('R53 real 50-card own OUTSIDE groups at 0/4/5/9/10: no cached or opponent cards',()=>{
 const s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:53021});
 const tally=()=>countOwnOutsidePhysicalGroups(s,0,5);
 assert.equal(tally(),0);
 // Four copies is the actual deck cap; use 4+4+2 distinct registered
 // cards and do not place a card back in a source zone before taking the next.
 const physical=[
  ...Array.from({length:4},()=>take(s,0,'SAO-1-078')),
  ...Array.from({length:4},()=>take(s,0,'SAO-1-079')),
  ...Array.from({length:2},()=>take(s,0,'SAO-2-068'))
 ];
 const takeNumber=n=>s.players[0].outside.push(...physical.splice(0,n));
 takeNumber(4);assert.equal(tally(),0);
 takeNumber(1);assert.equal(tally(),1);
 takeNumber(4);assert.equal(tally(),1);
 takeNumber(1);assert.equal(tally(),2);
 for(let i=0;i<2;i++)s.players[1].outside.push(take(s,1,'SAO-1-078'));
 assert.equal(tally(),2,'opponent named OUTSIDE does not affect own groups');
 const top=take(s,0,'SAO-1-005'),below=take(s,0,'SAO-1-051');
 top.stack=[below];top.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=top;
 assert.equal(tally(),2,'RAID buried layer is not an OUTSIDE physical card');
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R53 physical groups reject forged owner, UID duplicates, invalid divisor',()=>{
 const state={players:[{outside:[{uid:'0-1'},{uid:'0-2'}]},
  {outside:[{uid:'1-1'}]}]};
 assert.equal(countOwnOutsidePhysicalGroups(state,0,5),0);
 assert.equal(countOwnOutsidePhysicalGroups(state,1,1),1);
 for(const u of [0,-1,201,1.5,null])
  assert.throws(()=>countOwnOutsidePhysicalGroups(state,0,u));
 assert.throws(()=>countOwnOutsidePhysicalGroups(state,2,5));
 assert.throws(()=>countOwnOutsidePhysicalGroups({players:[{outside:[
  {uid:'0-1'},{uid:'0-1'}]}]},0,1));
 assert.throws(()=>countOwnOutsidePhysicalGroups({players:[{outside:[
  {uid:'1-1'}]}]},0,1));
});
