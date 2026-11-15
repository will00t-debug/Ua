// Twelve independently JP-verified blue cards implemented using existing V2 ops.
// Canonical printed JP names/traits are runtime data, never title-private opcodes.
const dsl=(effects={},other={})=>Object.freeze({
 ready:true,implementation:'dsl',effects:Object.freeze(effects),...other
});
const onPlay=e=>Object.freeze({onPlay:Object.freeze([Object.freeze(e)])});
const onRetire=e=>Object.freeze({onRetire:Object.freeze([Object.freeze(e)])});
const buffKenshin=Object.freeze({op:'buffOwnField',
 filter:Object.freeze({field:'name',value:'緋村 剣心'}),
 bp:1000,optional:true,excludeSelf:false});
const temporaryEnergy=Object.freeze({op:'restSelfGainEnergyRetireEndMain',
 lines:'field',oncePerTurn:true,extraEnergy:1});
export const RNK_PROGRAMS_BLUE_COMMON=Object.freeze({
 'RNK-1-003':dsl({}, {mainAbility:temporaryEnergy}),
 'RNK-1-004':dsl(onPlay({op:'bounceOwnOtherUnderEnergy',energy:1})),
 'RNK-1-006':dsl(onPlay(buffKenshin)),
 'RNK-1-009':dsl(onPlay({op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}),{impactNull:true}),
 'RNK-1-012':dsl({}, {opponentFieldColorsHandEnergyDiscount:Object.freeze({
   colors:Object.freeze(['purple','red']),amount:1
 })}),
 'RNK-1-014':dsl(onPlay({op:'drawDiscard',count:1})),
 'RNK-1-015':dsl({}, {ownTurnBp:1000}),
 'RNK-1-020':dsl(onRetire({op:'drawIfOwnName',name:'四乃森 蒼紫',count:1})),
 'RNK-1-021':dsl(onPlay({op:'searchTopOneBottomDiscard',count:3,logic:'any',
   filters:Object.freeze([
     Object.freeze({field:'name',value:'高荷 恵'}),
     Object.freeze({field:'trait',value:'御庭番衆'})
   ])
 })),
 'RNK-1-022':dsl({}, {impactNull:true}),
 'RNK-1-023':dsl({}, {activeExtraEnergy:1}),
 'RNK-1-027':dsl(onPlay({op:'recoverAp',count:2}))
});
