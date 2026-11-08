// Node tests read the environment and pass it as options. Search does not.
import {normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
export function testVariant(explicit){
 if(explicit==='a'||explicit==='b'||explicit==='ab'||explicit==='ab-front')return explicit;
 const env=process.env.AI_V3_TEST_VARIANT;
 return env==='a'||env==='b'||env==='ab'||env==='ab-front'?env:null;
}
export function testFactors(explicit){
 const direct=normalizeFactors(explicit);
 if(direct)return direct;
 const env=process.env.AI_V3_TEST_FACTORS;
 if(!env)return null;
 try{return normalizeFactors(JSON.parse(env));}catch{return null;}
}
export function withTestVariant(options={}){
 if(options.factors){
  const factors=normalizeFactors(options.factors);
  if(factors){
   const next={...options,factors};
   delete next.variant;
   return next;
  }
 }
 if(options.variant){
  const variant=testVariant(options.variant);
  return variant?{...options,variant}:options;
 }
 const factors=testFactors();
 if(factors)return {...options,factors};
 const variant=testVariant();
 return variant?{...options,variant}:options;
}
