// UA05NC / MHA-3 programs. Only sentences the shared V2 DSL already
// accepts are written here. A card stays ready:false until every printed
// sentence is one of those operations. Nothing here branches on a card id
// inside the engine.
function pending(gap, extra={}){
 return Object.freeze({ready:false, implementation:'dsl', gap, ...extra});
}

export const UA05NC_MHA3_PROGRAMS=Object.freeze({
 'MHA-3-001':pending(
  '登場時抽2張已有 draw。起動メイン的二選一（其他A組本回合 BP+1000，或最多1張〈綠谷 出久〉活動）沒有現成的同一個選擇。',
  {effects:Object.freeze({onPlay:Object.freeze([{op:'draw', count:2}])})}
 ),
 'MHA-3-002':Object.freeze({
  ready:true,
  implementation:'dsl',
  raidName:'死柄木 弔',
  printedImpact:1,
  battleRemoveInstead:true,
  mainAbility:Object.freeze({
   op:'frontOnceProgram',
   frontOnly:true,
   oncePerTurn:true,
   then:Object.freeze([Object.freeze({
    op:'enemyBpDown', bp:1000, optional:true, minBp:1500, maxTargets:2, zone:'front'
   })])
  })
 }),
 'MHA-3-003':pending(
  'BP1500以上かつ元々のBPより低い相手前線を1枚 BP-1000，而且〈荼毘〉同名含獲得此效果的角色一回合一次，沒有現成的同一句。'
 ),
 'MHA-3-004':pending(
  '休息、對手有低於原BP的角色才可發動、把「攻擊時最多抽1」交給無特徵角色，而且同名含獲得此效果的角色一回合一次，沒有現成的同一句。顏色觸發是既有的場外紫2/1。',
  {triggerEffect:Object.freeze({
   op:'deployOutsideCharacter', color:'purple', maxEnergy:2, ap:1, frontOnly:true
  })}
 ),
 'MHA-3-006':pending(
  '休息、對手前線3張以上、其他角色 BP+500，若是〈綠谷 出久〉再在 BP5000以上時給衝擊1，而且該句一回合一次，沒有現成的同一句。'
 ),
 'MHA-3-009':pending(
  '自己回合 BP+500 已有 ownTurnBp。空場減少的紅六角數字看不清。攻擊時抽1張、1張手牌放自己牌庫底、下一次不活動，沒有現成的同一句。',
  {ownTurnBp:500}
 )
});
