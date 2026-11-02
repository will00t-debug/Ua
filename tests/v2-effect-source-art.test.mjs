import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {controllerChoiceArt,pendingEffectSourceCard,pendingTextChoiceClass,
 uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

const pack={cards:{
 'AOT-1-087':{name:'ミカサ・アッカーマン',color:'red',type:'character'},
 'AOT-1-069':{name:'ハンジ・ゾエ',color:'red',type:'character'},
 'EVT-1':{name:'公開事件',color:'red',type:'event'},
 SECRET:{name:'隱藏卡',color:'blue',type:'character'}
}};
const packs=[pack,pack];

function blank(extra={}){
 return {hand:[],front:[],energy:[],outside:[],removed:[],life:[],
  lifeRevealed:[],deck:[],resolvingEvents:[],...extra};
}
function pending(sourceUid,kind='effect-rest-tuck',player=0){
 return {kind,player,sourceUid,sourceStamp:3,movedUid:'0-moved'};
}
function look(state){
 return pendingEffectSourceCard(packs,state);
}

test('a character effect shows that character and keeps hidden cards closed',()=>{
 const mikasa={uid:'0-mikasa',cardId:'AOT-1-087',ready:true};
 const hange={uid:'1-hange',cardId:'AOT-1-069',faceDown:false};
 const secretUnder={uid:'1-secret',cardId:'SECRET',faceDown:true};
 const ownUnder={uid:'0-under',cardId:'AOT-1-087',faceDown:true};
 const state={
  pending:pending('0-mikasa'),
  players:[
   blank({
    front:[{uid:'0-host',cardId:'AOT-1-069',under:[ownUnder]}],
    energy:[mikasa],
    hand:[{uid:'0-hand',cardId:'AOT-1-069'}],
    deck:[{uid:'0-deck',cardId:'SECRET'}],
    life:[{uid:'0-life',cardId:'SECRET'}],
    resolvingEvents:[{uid:'0-event',cardId:'EVT-1'}]
   }),
   blank({
    hand:[{uid:'1-hand',cardId:'SECRET'}],
    deck:[{uid:'1-deck',cardId:'SECRET'}],
    life:[{uid:'1-life',cardId:'SECRET'}],
    front:[{...hange,under:[secretUnder],stack:[{uid:'1-stack',cardId:'SECRET',faceDown:true}]}],
    energy:[{uid:'1-down',cardId:'SECRET',faceDown:true}],
    resolvingEvents:[{uid:'1-event',cardId:'EVT-1',faceDown:false},
     {uid:'1-hidden-event',cardId:'SECRET',faceDown:true}]
   })
  ]
 };
 const shown=look(state);
 assert.equal(shown.cardId,'AOT-1-087');
 assert.equal(shown.uid,'0-mikasa');
 assert.equal(shown.name,'ミカサ・アッカーマン');
 assert.equal(shown.side,0);
 assert.equal(shown.zone,'發動中的角色');
 assert.equal(JSON.stringify(shown).includes('SECRET'),false);
 assert.equal(look({...state,pending:pending('0-hand')}).zone,'發動中的角色');
 assert.equal(look({...state,pending:pending('0-under')}).cardId,'AOT-1-087');
 assert.equal(look({...state,pending:pending('0-deck')}),null);
 assert.equal(look({...state,pending:pending('0-life')}),null);
 assert.equal(look({...state,pending:pending('0-event')}).zone,'發動中的卡');
 assert.equal(look({...state,pending:pending('1-hange')}).cardId,'AOT-1-069');
 assert.equal(look({...state,pending:pending('1-hand')}),null);
 assert.equal(look({...state,pending:pending('1-deck')}),null);
 assert.equal(look({...state,pending:pending('1-life')}),null);
 assert.equal(look({...state,pending:pending('1-secret')}),null);
 assert.equal(look({...state,pending:pending('1-stack')}),null);
 assert.equal(look({...state,pending:pending('1-down')}),null);
 assert.equal(look({...state,pending:pending('1-event')}).zone,'發動中的卡');
 assert.equal(look({...state,pending:pending('1-hidden-event')}),null);
 assert.equal(look({...state,pending:pending('0-mikasa','life-trigger')}),null);
 assert.equal(look({...state,pending:pending('0-mikasa','block')}),null);
 assert.equal(look({...state,pending:pending('0-mikasa','opening-mulligan')}),null);
 assert.equal(look({...state,pending:pending('0-mikasa','effect-rest-tuck',1)}),null);
 assert.equal(look({...state,pending:{kind:'effect-rest-tuck',player:0}}),null);
 assert.equal(look({...state,pending:pending('2-mikasa')}),null);
 assert.equal(pendingEffectSourceCard(packs,null),null);
 const deckChoice=controllerChoiceArt(packs,{
  pending:{player:0,kind:'effect-search-deck'},
  players:state.players
 },{uid:'0-deck'});
 assert.equal(deckChoice[0].cardId,'SECRET');
 assert.equal(JSON.stringify(deckChoice).includes('1-hand'),false);
 const ordering={
  pending:{kind:'effect-move-order',player:0,entries:[
   {key:'observer-0-mikasa',jobs:[{sourceUid:'0-mikasa'}]},
   {key:'moved-secret',jobs:[{sourceUid:'0-deck'}]},
   {key:'opp-hidden',jobs:[{sourceUid:'1-secret'}]}
  ]},
  players:state.players
 };
 assert.equal(controllerChoiceArt(packs,ordering,{type:'chooseMoveEffectOrder',key:'observer-0-mikasa'})[0].cardId,'AOT-1-087');
 assert.deepEqual(controllerChoiceArt(packs,ordering,{type:'chooseMoveEffectOrder',key:'moved-secret'}),[]);
 assert.deepEqual(controllerChoiceArt(packs,ordering,{type:'chooseMoveEffectOrder',key:'opp-hidden'}),[]);
 const raid={
  pending:{kind:'raid-effect-order',player:0,baseUid:'0-under',raidUid:'0-mikasa'},
  players:state.players
 };
 assert.equal(controllerChoiceArt(packs,raid,{type:'chooseRaidOrder',mode:'entryFirst'})[0].uid,'0-mikasa');
 assert.equal(controllerChoiceArt(packs,raid,{type:'chooseRaidOrder',mode:'baseFirst'})[0].uid,'0-under');
 const phase={
  pending:{kind:'phase-order',player:0,entries:[{key:'1-hange:0',sourceUid:'1-hange',jobs:[]}]},
  players:state.players
 };
 assert.equal(controllerChoiceArt(packs,phase,{type:'choosePhaseOrder',key:'1-hange:0'})[0].cardId,'AOT-1-069');
});

test('paying an active entry names the AP cost and the decline separately',()=>{
 const pay=uiActionLabel({type:'choosePayDeploy',mode:'pay'},{state:{pending:{ap:1}}});
 const skip=uiActionLabel({type:'choosePayDeploy',mode:'skip'},{state:{pending:{ap:1}}});
 assert.equal(pay,'支付 1 AP，以活動狀態登場');
 assert.equal(skip,'不支付，留在場外');
 assert.notEqual(pay,skip);
 assert.equal(pay.includes('完成這個選擇'),false);
 assert.equal(skip.includes('完成這個選擇'),false);
 assert.equal(V2_PENDING_LABELS['effect-pay-deploy-self'],'是否支付 AP，讓此角色以活動狀態登場');
 assert.equal(pendingTextChoiceClass({type:'choosePayDeploy',mode:'pay'}),'recommended');
 assert.equal(pendingTextChoiceClass({type:'choosePayDeploy',mode:'skip'}),'quiet');
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/是否支付 '\+payAp\+' AP，讓此角色以活動狀態登場/);
 assert.match(preview,/條件已經滿足。支付後再點亮起的格子/);
 assert.match(preview,/點下面的角色，再點亮起的前線或能源格/);
 assert.match(preview,/以活動狀態登場 · 再點格子/);
});

test('the battle dialog draws the effect source above the choice buttons',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/pendingEffectSourceCard\(app\.packs,s\)/);
 assert.match(preview,/source&&source\.uid!==focusUid\)dialog\.append\(revealFocusSheet\(source\)\)/);
 assert.match(preview,/revealFocusSheet\(focus\)/);
 assert.match(preview,/class:'v2-reveal-focus'/);
});
