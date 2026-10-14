export function maskedSoftmax(logits,mask){
 if(logits.length!==mask.length||!mask.some(Boolean))throw Error('Invalid action mask');
 const m=Math.max(...logits.filter((_,i)=>mask[i]));
 const e=logits.map((x,i)=>mask[i]?Math.exp(x-m):0);
 const z=e.reduce((a,b)=>a+b,0);
 return e.map(x=>x/z);
}
export function advantages(steps,gamma=0.99,lambda=0.95){
 let gae=0,next=0;
 return steps.map(s=>s).reverse().map(s=>{
  const keep=s.done?0:1;
  gae=s.reward+gamma*next*keep-s.value+gamma*lambda*keep*gae;
  next=s.value;
  return {...s,advantage:gae,target:gae+s.value};
 }).reverse();
}
export function clippedObjective(oldP,newP,adv,clip=0.2){
 if(oldP<=0||newP<=0)throw Error('Invalid probability');
 const r=newP/oldP;
 return Math.min(r*adv,Math.max(1-clip,Math.min(1+clip,r))*adv);
}
