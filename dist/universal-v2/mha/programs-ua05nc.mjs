// UA05NC / MHA-3 programs. Only sentences the shared V2 DSL already
// accepts are written here. A card stays ready:false until every printed
// sentence is one of those operations. Nothing here branches on a card id
// inside the engine.
function pending(gap, extra={}){
 return Object.freeze({ready:false, implementation:'dsl', gap, ...extra});
}

export const UA05NC_MHA3_PROGRAMS=Object.freeze({
 'MHA-3-001':Object.freeze({
  ready:true,
  implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{op:'draw', count:2}])}),
  mainAbility:Object.freeze({
   op:'cardOnceChoose',
   then:Object.freeze([Object.freeze({
    op:'chooseOne', optional:false,
    options:Object.freeze([
     Object.freeze({
      id:'trait', label:'其他A組 BP+1000', turn:'any',
      then:Object.freeze([Object.freeze({
       op:'buffOwnField', filter:Object.freeze({field:'trait', value:'A組'}),
       bp:1000, optional:false, excludeSelf:true
      })])
     }),
     Object.freeze({
      id:'active', label:'綠谷出久活動', turn:'any',
      then:Object.freeze([Object.freeze({
       op:'activeOwnNamed', name:'緑谷 出久', max:1, optional:true
      })])
     })
    ])
   })])
  })
 }),
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
 'MHA-3-003':Object.freeze({
  ready:true,
  implementation:'dsl',
  mainAbility:Object.freeze({
   op:'nameSharedProgram',
   scope:'nameIncludingGained',
   rest:false,
   then:Object.freeze([Object.freeze({
    op:'enemyBpDown', bp:1000, optional:false, minBp:1500,
    belowPrinted:true, zone:'front'
   })])
  })
 }),
 'MHA-3-004':Object.freeze({
  ready:true,
  implementation:'dsl',
  triggerEffect:Object.freeze({
   op:'deployOutsideCharacter', color:'purple', maxEnergy:2, ap:1, frontOnly:true
  }),
  mainAbility:Object.freeze({
   op:'nameSharedProgram',
   scope:'nameIncludingGained',
   rest:true,
   when:Object.freeze({kind:'oppFieldCurrentBpBelowPrinted', turn:'own'}),
   then:Object.freeze([Object.freeze({
    op:'grantOnAttack', target:'ownCharacter', traitless:true, optional:false,
    until:'endOfTurn', then:Object.freeze([Object.freeze({op:'draw', count:1})])
   })])
  })
 }),
 'MHA-3-006':Object.freeze({
  ready:true,
  implementation:'dsl',
  mainAbility:Object.freeze({
   op:'nameSharedProgram',
   scope:'name',
   rest:true,
   when:Object.freeze({kind:'oppFrontCountAtLeast', turn:'any', min:3}),
   then:Object.freeze([Object.freeze({
    op:'buffOwnField',
    filter:Object.freeze({field:'type', value:'character'}),
    bp:500, optional:false, excludeSelf:true,
    conditionalImpactName:'緑谷 出久', conditionalImpactMinBp:5000
   })])
  })
 }),
 'MHA-3-009':pending(
  '攻擊時抽1張、1張手牌放自己牌庫底、下一次不活動已寫成 drawBottomSkipNextActive。空場減少的紅六角數字在卡面上看不清，減免數值未確認前不能標 ready。',
  {
   ownTurnBp:500,
   effects:Object.freeze({onAttack:Object.freeze([{op:'drawBottomSkipNextActive'}])})
  }
 )
});
