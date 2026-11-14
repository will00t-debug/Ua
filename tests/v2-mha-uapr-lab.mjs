import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {UAPR_MHA_POINT_CARDS} from '../dist/mha/uapr-point-cards.mjs';
import {mhaBattleCard} from '../dist/universal-v2/mha-pack.mjs';
import {UAPR_MHA_PROGRAMS} from '../dist/universal-v2/mha/programs-uapr.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const real=UAPR_MHA_POINT_CARDS.map(row=>mhaBattleCard(row,UAPR_MHA_PROGRAMS[row.id]));
function character(partial){
 return {energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,type:'character',
  implementation:'vanilla',effects:{},...partial};
}
const fixtures=[
 character({id:'LAB-Y',name:'黃能源',color:'yellow',gen:2}),
 character({id:'LAB-P',name:'紫能源',color:'purple',gen:2}),
 character({id:'LAB-R',name:'紅能源',color:'red',gen:2}),
 character({id:'LAB-A',name:'飯田 天哉',color:'yellow',traits:['A組']}),
 character({id:'LAB-DEKU',name:'緑谷 出久',color:'yellow',traits:['A組']}),
 character({id:'LAB-OFA-A',name:'オールマイト',color:'yellow',traits:['ワン・フォー・オール']}),
 character({id:'LAB-OFA-B',name:'八木 俊典',color:'yellow',traits:['ワン・フォー・オール']}),
 character({id:'LAB-HAWKS',name:'ホークス',color:'red',bp:2000}),
 character({id:'LAB-RAIDER',name:'敵襲',color:'purple',raidName:'死柄木 弔',
  implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}}),
 character({id:'LAB-2500',name:'高 BP',color:'green',bp:2500}),
 character({id:'LAB-2000',name:'低 BP',color:'green',bp:2000}),
 character({id:'LAB-3000',name:'能量線高 BP',color:'green',bp:3000}),
 character({id:'LAB-HIT',name:'試打',color:'blue',bp:5000,implementation:'dsl',
  printedImpact:1,effects:{}}),
 ...Array.from({length:8},(_,i)=>character({id:'LAB-FILL-'+i,name:'填充 '+i,color:'blue'}))
];
export const lab=createUniversalPack({
 id:'mha-uapr-lab',cards:[...real,...fixtures]
});

export function deck(required){
 const rest=fixtures.filter(c=>c.trigger===null&&!required.includes(c.id)).map(c=>c.id);
 const ids=[...required,...rest].slice(0,13);
 if(ids.length!==13)throw Error('deck needs 13 ids');
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 const errors=validateUniversalDeck(lab,counts);
 if(errors.length)throw Error(errors.join('; '));
 return counts;
}
export function match(seed,required){
 const counts=deck(required);
 return {pack:lab,s:newUniversalMatch(lab,{decks:[counts,counts],seed,first:0})};
}
export function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
export function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
export function occupy(s,p,id,line,slot,{ready=false}={}){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
export function toMain(pack,s){
 s=dispatchUniversalAction(pack,s,{type:'next'});
 s=dispatchUniversalAction(pack,s,{type:'next'});
 if(s.phase!=='main')throw Error('expected main, got '+s.phase);
 return s;
}
export function act(pack,s,action){
 s=dispatchUniversalAction(pack,s,action);
 assertUniversalMatch(pack,s);
 return s;
}
export function legal(pack,s){return legalUniversalActions(pack,s);}
export function play(pack,s,uid,line='front'){
 const action=legal(pack,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);
 if(!action)throw Error('play is not legal');
 return act(pack,s,action);
}
