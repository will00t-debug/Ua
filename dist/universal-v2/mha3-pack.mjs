// UA05NC / MHA-3 battle pack. Set 1, set 2, and the point cards stay
// in their own packs. A program that is not ready does not enter.
import {createUniversalPack} from './pack.mjs';
import {mhaBattleCard} from './mha-pack.mjs';
import {UA05NC_MHA3_CARDS} from '../mha/ua05nc-cards.mjs';
import {UA05NC_MHA3_PROGRAMS} from './mha/programs-ua05nc.mjs';

export function mha3ProgramFor(id){
 return UA05NC_MHA3_PROGRAMS[id]||null;
}

export function createMha3Pack(){
 const ready=[];
 const seen=new Set();
 for(const card of UA05NC_MHA3_CARDS){
  if(seen.has(card.id))throw Error('Duplicate MHA-3 id '+card.id);
  seen.add(card.id);
  if(card.id.startsWith('MHA-1-')||card.id.startsWith('MHA-2-')||card.id.startsWith('MHA-P-'))
   throw Error(card.id+' is not a book card');
  const program=mha3ProgramFor(card.id);
  if(!program)throw Error(card.id+' has no program');
  const battle=mhaBattleCard(card,program);
  if(program.ready===true&&!battle)throw Error(card.id+' ready program did not enter');
  if(program.ready!==true&&battle)throw Error(card.id+' pending program entered the pack');
  if(battle)ready.push(battle);
 }
 if(!ready.length)throw Error('MHA-3 has no ready card');
 return createUniversalPack({
  id:'mha3', version:'mha3-ua05nc-ready-'+ready.length, cards:ready
 });
}
