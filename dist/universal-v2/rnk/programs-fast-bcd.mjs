// RNK source IDs and Japanese print checks are title-specific DATA.
// Executable behavior is 100% existing Universal V2 DSL, no RNK jobs.
const bounce=Object.freeze({ready:true,implementation:'dsl',
 effects:Object.freeze({onPlay:Object.freeze([{op:'bounceOwnOtherUnderEnergy',energy:1}])})});
const readyEnergy=Object.freeze({ready:true,implementation:'dsl',activeExtraEnergy:1,effects:Object.freeze({})});
const drawDiscard=Object.freeze({ready:true,implementation:'dsl',
 effects:Object.freeze({onPlay:Object.freeze([{op:'drawDiscard',count:1}])})});
const otherBp=Object.freeze({ready:true,implementation:'dsl',
 effects:Object.freeze({onPlay:Object.freeze([{
   op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true
 }])})});
const vanilla=Object.freeze({ready:true,implementation:'vanilla',effects:Object.freeze({})});
export const RNK_PROGRAMS_FAST_BCD=Object.freeze({
 'RNK-1-041':bounce,
 'RNK-1-047':readyEnergy,
 'RNK-1-068':drawDiscard,
 'RNK-1-069':otherBp,
 'RNK-1-074':vanilla,
 'RNK-1-078':bounce,
 'RNK-1-080':otherBp,
 'RNK-1-081':readyEnergy,
 'RNK-1-091':vanilla
});
