// Node tests and the benchmark read the environment. The browser entry does not.
export function testVariant(explicit){
 if(explicit==='a'||explicit==='b'||explicit==='ab'||explicit==='ab-front')return explicit;
 const env=process.env.AI_V3_TEST_VARIANT;
 return env==='a'||env==='b'||env==='ab'||env==='ab-front'?env:null;
}
export function withTestVariant(options={}){
 const variant=testVariant(options.variant);
 return variant?{...options,variant}:options;
}
