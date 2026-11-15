// Four RNK Japanese-verified common V2 passive/keyword effects.
// No RNK-specific runtime opcode; all reuse existing shared normalization.
const impactNull=Object.freeze({ready:true,implementation:'dsl',impactNull:true,effects:Object.freeze({})});
export const RNK_PROGRAMS_PASSIVE_BCD=Object.freeze({
 'RNK-1-051':Object.freeze({ready:true,implementation:'dsl',effects:Object.freeze({}),
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['blue','red']),amount:1})}),
 'RNK-1-061':impactNull,
 'RNK-1-079':Object.freeze({ready:true,implementation:'dsl',effects:Object.freeze({}),
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['blue','purple']),amount:1})}),
 'RNK-1-107':impactNull
});
