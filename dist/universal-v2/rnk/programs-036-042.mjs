// B batch 036-042: title-specific data, common Universal V2 DSL only.
// A program is ready only when ALL printed clauses are represented.
const pending=reason=>Object.freeze({ready:false,reason});
export const RNK_PROGRAMS_036_042=Object.freeze({
  'RNK-1-036':Object.freeze({
    ready:true,implementation:'dsl',
    effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
      op:'searchTopOneBottomDiscard',count:3,logic:'any',
      filters:Object.freeze([
        Object.freeze({field:'name',value:'緋村 剣心'}),
        Object.freeze({field:'name',value:'斎藤 一'}),
        Object.freeze({field:'name',value:'相楽 左之助'})
      ])
    })])})
  }),
  'RNK-1-037':pending('Unrestricted mayShiftOwnCharacter stays rejected here. The named onPlay shift is compiled from programs-shared-next.mjs.'),
  'RNK-1-038':pending('Requires exact hand discount, conditional named front bounce on attack and +1500 BP in the same payment chain.'),
  'RNK-1-039':pending('Raid, Impact null, BP<=2000 blocking restriction and top-five named search all required.'),
  'RNK-1-040':pending('Raid, Impact, no-trait gate and energy-line attack+move+sniper all required.'),
  'RNK-1-041':pending('Likely shares mandatory bounceOwnOtherUnderEnergy(1), but source must be checked against Japanese print before ready.'),
  'RNK-1-042':pending('Optional payment 1 AP followed by optional opposing FIELD retirement needs an exact shared DSL sequence.')
});
