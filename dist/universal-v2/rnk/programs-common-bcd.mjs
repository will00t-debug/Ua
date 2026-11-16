// Reused common V2 operation profiles, never proprietary RNK runtime jobs.
// Seven Japanese-checked B/C/D cards share three exact existing common operations.
const recoverAp2=Object.freeze({
 ready:true,implementation:'dsl',
 effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({op:'recoverAp',count:2})
 ])})
});
const vanilla=Object.freeze({ready:true,implementation:'vanilla',effects:Object.freeze({})});
export const RNK_PROGRAMS_COMMON_BCD=Object.freeze({
 'RNK-1-053':Object.freeze({ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({op:'drawDiscard',count:1})])})
 }),
 'RNK-1-055':vanilla,
 'RNK-1-063':recoverAp2,
 'RNK-1-065':recoverAp2,
 'RNK-1-073':vanilla,
 'RNK-1-096':recoverAp2,
 'RNK-1-097':recoverAp2
});
