import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {TTG_RED_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel,uiActionGroup,visibleActionsForCard,isExactLegal,
 V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

const pack=registeredV2TitlePack('gurren-lagann'),packs=[pack,pack];
const counts={...TTG_RED_V2_PILOT_COUNTS,'TTG-1-042':0,'TTG-1-067':4};
function take(s,p,id){
 for(const z of ['hand','deck','life']){
  const pool=s.players[p][z],i=pool.findIndex(c=>c.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }
 throw Error('No physical '+id);
}
test('R55 Human preview displays SNIPER actual opponent FRONT target, unlike ordinary attack',()=>{
 const s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:55069});
 const attacker=take(s,0,'TTG-1-067'),target=take(s,1,'TTG-1-072');
 attacker.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=attacker;
 target.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=target;
 const ordinary={type:'attack',uid:attacker.uid};
 const sniper={type:'attack',uid:attacker.uid,targetUid:target.uid,targetStamp:target.fieldEntryStamp};
 const actions=[ordinary,sniper];
 assert.equal(uiActionGroup(sniper),'card');
 assert.match(uiActionLabel(sniper,{pack:packs,state:s}),/狙擊攻擊：ヨーコ.*グレン/);
 assert.match(uiActionLabel(ordinary,{pack:packs,state:s}),/宣告攻擊：ヨーコ/);
 assert.ok(!uiActionLabel(ordinary,{pack:packs,state:s}).includes('グレン'));
 assert.equal(visibleActionsForCard(actions,attacker.uid).length,2);
 assert.equal(isExactLegal(sniper,actions),true);
 assert.equal(isExactLegal({...sniper,targetStamp:99999},actions),false);
});
test('R54 + R55 preview optional named OUTSIDE draw choices are human readable',()=>{
 assert.equal(V2_PENDING_LABELS['effect-optional-draw'],'攻擊時可抽 0 或 1 張');
 assert.equal(uiActionLabel({type:'chooseOptionalDraw',mode:'skip'}),'不抽牌');
 assert.equal(uiActionLabel({type:'chooseOptionalDraw',mode:'draw'}),'攻擊時抽 1 張');
});
