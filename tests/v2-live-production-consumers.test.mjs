import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalCardEnergy,universalEnergyByColor,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const md=Object.fromEntries(['002','010','012','013','016','017','019','050','055','063','070'].map(n=>['MST-1-'+n,4]));
Object.assign(md,{'MST-1-001':2,'MST-1-057':2,'MST-1-029':2});
const sd=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(n=>['SLG-1-'+n,4]));sd['SLG-1-041']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function setup(owner){
 assert.deepEqual(validateUniversalDeck(mst,md),[]);assert.deepEqual(validateUniversalDeck(slg,sd),[]);
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[md,sd]:[sd,md],first:owner,seed:570630+owner});
 while(s.phase!=='main')s=dispatchUniversalAction(packs,s,{type:'next'});
 return {packs,s};
}
function put(s,p,id,line,slot){const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;return c;}
for(const owner of [0,1])test('live production resolves current MST029 READY/identity/buffs from UID, seat '+owner,()=>{
 const {packs,s}=setup(owner),c=put(s,owner,'MST-1-029','energy',0),stale=structuredClone(c);
 assert.equal(universalCardEnergy(packs,s,owner,stale),2);
 c.ready=false;
 assert.equal(universalCardEnergy(packs,s,owner,stale),1);
 c.buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalCardEnergy(packs,s,owner,stale),2);
 c.buffs[0].untilTurn=s.turn-1;
 assert.equal(universalCardEnergy(packs,s,owner,stale),1);
 assert.equal(universalCardEnergy(packs,s,owner,{...stale,cardId:'NOT-A-CARD',ready:true,buffs:[{energy:99,untilTurn:s.turn}]}),1);
 assert.equal(universalCardEnergy(packs,s,1-owner,stale),0);
 s.players[owner].energy[0]=null;s.players[owner].outside.push(c);
 assert.equal(universalCardEnergy(packs,s,owner,stale),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
