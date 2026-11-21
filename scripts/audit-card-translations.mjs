// Read-only catalogue audit. Never write into the card database or match engine.
// Usage: node scripts/audit-card-translations.mjs
import {TITLES} from '../dist/title-registry.mjs';

const normalize=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'');
const rules=[
 {id:'impact-1',jp:/【インパクト\(1\)】/g,zh:/貫通(?:\(?1\)?)|衝擊(?:\(?1\)?)|インパクト\(?1\)?/},
 {id:'impact-2',jp:/【インパクト\(2\)】/g,zh:/貫通(?:\(?2\)?)|衝擊(?:\(?2\)?)|インパクト\(?2\)?/},
 {id:'damage-2',jp:/【ダメージ\(2\)】/g,zh:/傷害(?:\(?2\)?|二)|ダメージ\(?2\)?/},
 {id:'damage-3',jp:/【ダメージ\(3\)】/g,zh:/傷害(?:\(?3\)?|三)|ダメージ\(?3\)?/},
 {id:'damage-plus-one',jp:/【ダメージ\(\+1\)】/g,zh:/傷害(?:\(?\+1\)?|增加1)|ダメージ\(?\+1\)?/},
 {id:'impact-immunity',jp:/【インパクト無効】/g,zh:/貫通無效|衝擊無效|衝擊無効|インパクト無効|失去貫通|失去衝擊/},
 {id:'double-block',jp:/【2回ブロック】/g,zh:/二回阻擋|2次阻擋|兩次阻擋|二次阻擋|阻擋2次|雙重阻擋|雙重防禦|雙重防御|2回ブロック/},
 {id:'double-attack',jp:/【2回アタック】/g,zh:/2次攻擊|兩次攻擊|二次攻擊|雙重攻擊|攻擊2次|2回アタック/}
];
const distinct=entries=>[...new Map(entries.map(x=>[x.id+'|'+x.ability,x])).values()];
export function auditCardTranslations(titles=TITLES){
 const issues=[],statistics=[];
 for(const title of titles){
  let total=0,compared=0,japaneseOnly=0,noJapanese=0,emptyTranslated=0,marked=0;
  for(const card of title.cards??[]){
   total++;
   const jp=String(card.effectJa??'').trim();
   const translated=String(card.effect??card.effectZhTw??'').trim();
   if(!jp){noJapanese++;continue;}
   if(jp===translated){japaneseOnly++;continue;}
   if(!translated){emptyTranslated++;continue;}
   compared++;
   const j=normalize(jp),z=normalize(translated);
   for(const rule of rules){
    if(!rule.jp.test(j))continue;
    if(rule.jp.global)rule.jp.lastIndex=0;
    marked++;
    if(rule.zh.test(z))continue;
    const truncated=/(?:獲得|取得|給予|賦予)(?:。|．|！|!)/.test(z)
      && !(z.includes('以下的効果')||z.includes('以下的效果'));
    issues.push({
     title:title.id,id:card.id,ability:rule.id,
     priority:truncated?'high':'review',
     name:card.nameZh??card.name??card.nameJa??'',
     translatedExcerpt:translated.slice(0,180),
     japaneseExcerpt:jp.slice(0,180),
     source:card.source??null
    });
   }
  }
  statistics.push({title:title.id,total,compared,japaneseOnly,noJapanese,emptyTranslated,marked});
 }
 return {statistics,issues:distinct(issues)};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const report=auditCardTranslations();
 console.log(JSON.stringify(report,null,2));
}
