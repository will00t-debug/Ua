import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

// Japanese UNION ARENA general FAQ Q99 (2025-10-24):
// https://www.unionarena-tcg.com/jp/faq/list.php?type=0
// A printed life Trigger can be declined regardless of whether legal effect
// targets exist; this is independent from optional targets within an ability.
const ids=['001','009','010','029','031'];
const additions=['011','013','040','003','004'];
const counts={...SOLO_SHADOW_TRAINING_PRESET};
for(const id of ids)delete counts['SLG-1-'+id];
for(const id of additions)counts['SLG-1-'+id]=4;
function take(p,id){
 for(const z of ['hand','deck','life']){const i=p[z].findIndex(c=>c.cardId==='SLG-1-'+id);if(i>=0)return p[z].splice(i,1)[0];}
 throw Error('physical card not found '+id);
}
function make(trigger,{restedTarget=false,availableOutside=false}={}){
 const s=newSoloTrainingMatch({decks:[counts,counts],first:0,seed:2777}),def=s.players[1];
 const card=take(def,trigger),previous=def.life.shift();def.deck.push(previous);def.life.unshift(card);
 if(availableOutside)def.outside.push(take(def,'013'));
 if(restedTarget){const c=take(def,'013');Object.assign(c,{owner:1,line:'front',slot:0,ready:false});def.front[0]=c;}
 const attacker=take(s.players[0],'015');Object.assign(attacker,{owner:0,line:'front',slot:0,ready:true});s.players[0].front[0]=attacker;
 s.phase='attack';s.players[0].ownTurns=2;
 return {s,attacker,lifeUid:card.uid};
}
function attack(s,uid){const a=soloTrainingLegalActions(s).find(x=>x.type==='attack'&&x.uid===uid);assert.ok(a);return soloTrainingDispatch(s,a);}
function choose(s,f){const a=soloTrainingLegalActions(s).find(f);assert.ok(a,'legal defender choice expected');return soloTrainingDispatch(s,a);}

test('Q99 SLG-1-011 purple COLOR can decline even when own legal outside target and front slot exist',()=>{
 const {s,attacker,lifeUid}=make('011',{availableOutside:true});
 const after=attack(s,attacker.uid);assert.equal(after.pending?.kind,'colorTrigger');
 const originalOutside=after.players[1].outside.map(c=>c.uid);
 const legal=soloTrainingLegalActions(after);
 assert.ok(legal.some(x=>x.uid===null));
 assert.ok(legal.some(x=>x.uid!==null&&x.line==='front'));
 const declined=choose(after,x=>x.uid===null);
 assert.equal(declined.pending,null);
 assert.deepEqual(declined.players[1].outside.map(c=>c.uid),originalOutside);
 assert.ok(declined.players[1].outside.some(c=>c.uid===lifeUid));
 assert.equal(declined.players[1].front.filter(Boolean).length,0);
 assert.ok(assertSoloTrainingMatch(declined));
 const used=choose(after,x=>x.uid!==null&&x.line==='front');
 assert.equal(used.players[1].front.filter(Boolean).length,1);
 assert.equal(used.players[1].outside.length,originalOutside.length-1);
 assert.ok(assertSoloTrainingMatch(used));
});

test('Q99 SLG-1-040 SPECIAL can decline without destroying selected opponent front character',()=>{
 const {s,attacker,lifeUid}=make('040');
 const after=attack(s,attacker.uid);
 assert.equal(after.pending?.kind,'specialTrigger');
 assert.ok(soloTrainingLegalActions(after).some(x=>x.uid===attacker.uid));
 const declined=choose(after,x=>x.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front[0].uid,attacker.uid);
 assert.ok(declined.players[1].outside.some(x=>x.uid===lifeUid));
 assert.ok(assertSoloTrainingMatch(declined));
 const resolved=choose(after,x=>x.uid===attacker.uid);
 assert.equal(resolved.players[0].front[0],null);
 assert.ok(resolved.players[0].outside.some(x=>x.uid===attacker.uid));
 assert.ok(assertSoloTrainingMatch(resolved));
});

test('Q99 SLG-1-003 ACTIVE Trigger may be declined without readying or +3000BP',()=>{
 const {s,attacker,lifeUid}=make('003',{restedTarget:true});
 const after=attack(s,attacker.uid);
 assert.equal(after.pending?.kind,'activeTrigger');
 const target=after.players[1].front[0],oldBuffs=target.buffs?.length||0;
 assert.equal(target.ready,false);
 assert.ok(soloTrainingLegalActions(after).some(x=>x.uid===null));
 const declined=choose(after,x=>x.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[1].front[0].ready,false);
 assert.equal(declined.players[1].front[0].buffs?.length||0,oldBuffs);
 assert.ok(declined.players[1].outside.some(x=>x.uid===lifeUid));
 assert.ok(assertSoloTrainingMatch(declined));
 const activated=choose(after,x=>x.uid===target.uid);
 assert.equal(activated.players[1].front[0].ready,true);
 assert.equal(activated.players[1].front[0].buffs.at(-1).bp,3000);
 assert.ok(assertSoloTrainingMatch(activated));
});
