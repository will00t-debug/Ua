// Screen-only opposite directions stay unconfirmed until a fresh 66-pair test.
import {binomialUpper,holm,signTest} from '../../v4b4/lib/exact.mjs';
import {OPPOSITE_RULE} from './protocol.mjs';

export function directedP(diffs,screenMean){
 const exact=signTest(diffs);
 const negative=screenMean<0;
 const positive=screenMean>0;
 const p=!exact.decisive||(!negative&&!positive)
  ?1
  :negative?exact.pOne:binomialUpper(exact.plus,exact.decisive,0.5);
 const aligned=negative?exact.mean<0:positive?exact.mean>0:false;
 return {mean:exact.mean,plus:exact.plus,minus:exact.minus,tie:exact.tie,p,aligned};
}
export function judgeOpposite(pairs){
 if(!Array.isArray(pairs)||pairs.length!==2)throw Error('相反偏好要剛好兩筆一起確認');
 const judged=pairs.map(pair=>({id:pair.id,screenMean:pair.screenMean,...directedP(pair.diffs,pair.screenMean)}));
 const kept=holm(judged.map(row=>row.p));
 const rows=judged.map((row,index)=>({
  ...row,holm:kept.has(index),confirmed:kept.has(index)&&row.aligned
 }));
 return {rule:OPPOSITE_RULE.id,both:rows.every(row=>row.confirmed),rows};
}
