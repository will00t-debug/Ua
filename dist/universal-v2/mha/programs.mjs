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
 'MHA-1-104':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]},
  notes:'查看牌頂 3 張，全部依選擇順序放回牌頂。不能放到場外或牌底。'}
});
