// UA10ST programs. A card is ready only when the whole printed sentence is
// an existing shared operation and the dedicated test accepts it.
// Do not add a title-specific engine here.

const energyRetire={op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1};

function vanilla(note){
 return {ready:true,implementation:'vanilla',notes:note};
}

export const MHA_UA10ST_PROGRAMS=Object.freeze({
 'MHA-1-034':{ready:true,implementation:'dsl',activeExtraEnergy:1,
  notes:'活動時，這張卡的發生能量 +1 綠。休息時只有印刷的 1 點。前線不產生能量。'},
 'MHA-1-036':{ready:true,implementation:'dsl',step:true,
  notes:'只有移步：自己的移動階段可從前線移到能量線。沒有其他效果。'},
 'MHA-1-041':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]},
  notes:'登場時，必要能量 1 以下的其他自己角色回手。沒有合格對象時回自己。'},
 'MHA-1-044':{ready:true,implementation:'dsl',mainAbility:energyRetire,
  notes:'起動：休息，每回合一次。這個回合發生能量 +1 綠。主要階段結束時退場。前線與能量線都可以。'},
 'MHA-1-052':{ready:true,implementation:'dsl',
  effects:{onAttack:[{op:'enemyBpDown',bp:500,optional:true,minBp:1000,zone:'field'}]},
  notes:'攻擊時最多選 1 張目前 BP 1000 以上的對手場上角色，本回合 BP-500。可以不選。BP 不足與非角色不能選。'},
 'MHA-1-057':vanilla('効果欄は「-」。ゲットトリガーはカード表の trigger。'),
 'MHA-1-061':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1}]},
  notes:'登場時抽 1。沒有其他句子。'},
 'MHA-1-065':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'recoverAp',count:2}]},
  notes:'最多使 2 張自己的行動值卡活動。可以少選。最終觸發是卡表。'},
 'MHA-1-103':vanilla('効果欄は「-」。トリガーも「-」。'),
 'MHA-1-063':{ready:true,implementation:'dsl',
  triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'grantOwnFieldAttackKit',bp:2500,optional:false,
   sniperNames:['オールマイト','緑谷 出久']}]},
  notes:'UA10ST 與 UA10BT 共用這一個定義。選自己場上 1 張角色，本回合 BP+2500，並在攻擊戰鬥勝利時抽 1。名字是オールマイト或緑谷 出久才再給狙擊。不能跳過。場上沒有角色就結束。特殊觸發仍是退場對手前線 1 張。'},
 'MHA-1-101':vanilla('効果欄は「-」。アクティブは既存の生命觸發：選自己場上 1 張角色，使其活動並本回合 BP+3000。Q101：已經活動的角色可以選，維持活動，仍得 +3000。不寫進登場效果，也不另寫 triggerEffect。'),
 'MHA-1-102':{ready:true,implementation:'dsl',printedAttackDamage:2,ownTurnBp:1000,
  effects:{onPlay:[{op:'buffSelfUntilNextOwnStart',bp:1000,line:'front'}]},
  notes:'傷害 2。自己回合 BP+1000。登場時只有在前線才獲得直到自己下一個回合開始的 BP+1000。能量線登場不加。'},
 'MHA-1-104':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]},
  notes:'查看牌頂 3 張，全部依選擇順序放回牌頂。不能放到場外或牌底。'},
 'MHA-1-105':{ready:true,implementation:'dsl',
  effects:{onAttack:[{op:'retireOppFrontUnderBp',bp:2500,optional:true}]},
  notes:'攻擊時最多退場 1 張目前 BP 2500 以下的對手前線角色。可以不選。能量線與更高 BP 不能選。'},
 'MHA-1-106':{ready:true,implementation:'dsl',
  passiveBonuses:[{bp:1000,condition:{kind:'oppFrontCountAtLeast',turn:'any',min:3}}],
  notes:'對手正面朝上的前線角色有 3 張以上時，這張卡 BP+1000。能量線、蓋放與自己的前線不算。'},
 'MHA-1-107':{ready:true,implementation:'dsl',raidName:'緑谷 出久',printedImpact:1,
  effects:{onPlay:[{op:'ifLiveThen',when:{kind:'oppFrontCountAtLeast',turn:'any',min:3},
   then:[{op:'draw',count:1}]}]},
  notes:'可突襲名字是緑谷 出久的角色。突襲到前線時活動。衝擊 1。登場時對手前線有 3 張以上角色才抽 1。'},
 'MHA-1-108':{ready:true,implementation:'dsl',
  passiveBonuses:[{extraEnergy:1,condition:{kind:'ownFrontCountAtLeast',turn:'any',min:2}}],
  notes:'自己正面朝上的前線角色有 2 張以上時，這張場域的發生能量 +1，顏色沿用印刷的綠。不足 2 張時只有印刷的 1 點。對手回合也算。'},
 'MHA-1-109':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'lookTopScript',count:5,rest:'bottom',takes:[{
   to:'hand',max:1,publish:true,type:'character',thenDrawIfName:'緑谷 出久'}]}]},
  notes:'看牌頂 5 張。公開最多 1 張角色到手牌，其餘依選擇順序放牌底。公開的是緑谷 出久才再抽 1。事件與場域留在畫面上但不能選。不公開就不抽。'}
});
