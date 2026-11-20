import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCardEffectText,renderCardEffectText,cardEffectDisplayText} from '../dist/card-effect-display.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {readFileSync} from 'node:fs';

test('malformed official entity spacing and double encoding are cleaned without interpreting HTML',()=>{
 assert.equal(cleanCardEffectText('&nbsp主起動&nbsp 休息&nbsp;此卡退場'),'主起動 休息 此卡退場');
 assert.equal(cleanCardEffectText('&amp;nbsp;A&#160;B&#xA0;C<br/>第二行'),'A B C\n第二行');
 assert.equal(cleanCardEffectText('&lt;角色&gt; &quot;效果&quot;'),' <角色> "效果"'.trim());
 assert.match(renderCardEffectText('&lt;img src=x onerror=alert(1)&gt; 主啟動'),/^&lt;img/);
 assert.doesNotMatch(renderCardEffectText('<script>bad</script>'),/<script>/);
});
test('main timing is blue-class label; other explicit headers are rendered inline without altering prose',()=>{
 const html=renderCardEffectText('&nbsp主起動&nbsp 休息 此卡退場。&nbsp攻擊時&nbsp 抽１張卡。\n【登場時】抽１張卡。');
 assert.match(html,/class="ua-effect-keyword ua-effect-main">主啟動<\/span> 休息 此卡退場/);
 assert.match(html,/class="ua-effect-keyword">攻擊時<\/span> 抽１張卡/);
 assert.match(html,/class="ua-effect-keyword">登場時<\/span>抽１張卡/);
 assert.doesNotMatch(html,/&(?:amp;)*nbsp/i);
 assert.equal(renderCardEffectText('選擇具有主啟動效果的角色。'),'選擇具有主啟動效果的角色。');
 assert.match(renderCardEffectText('主啟動：抽一張卡'),/ua-effect-main/);
});
test('actual DGM-1-069 card and all registered title imports use the shared text renderer',()=>{
 const actual=TITLES.find(t=>t.id==='dgm').cards.find(c=>c.id==='DGM-1-069');
 assert.ok(actual);
 const original=actual.effect;
 const html=renderCardEffectText(original);
 assert.match(html,/ua-effect-main">主啟動<\/span>/);
 assert.match(html,/此卡退場/);
 assert.doesNotMatch(html,/&(?:amp;)*nbsp/i);
 assert.equal(actual.effect,original,'presentation cannot mutate rules data');
 for(const title of TITLES){
  for(const card of title.cards){
   if(typeof card.effect!=='string'||!/&(?:amp;)*nbsp/i.test(card.effect))continue;
   assert.doesNotMatch(renderCardEffectText(card.effect),/&(?:amp;)*nbsp/i,title.id+': '+card.id);
  }
 }
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(read('dist/v2-deck-editor.mjs'),/renderCardEffectText\(translation\)/);
 assert.match(read('dist/visual-deck-builder.mjs'),/renderCardEffectText\(cardEffectDisplayText\(focusCard\)/);
 assert.match(read('dist/arena-deck-mockup.css'),/\.ua-effect-keyword\.ua-effect-main\{[^}]*background:#009bcd/);
});

test('impact and damage labels support catalogue aliases and keep numeric modifiers distinct',()=>{
 const html=renderCardEffectText('【貫通】【傷害二】\n【衝擊（1）】【傷害（2）】【傷害（3）】【傷害（+1）】');
 assert.match(html,/ua-effect-impact">貫通<\/span>/);
 assert.match(html,/ua-effect-impact">貫通（1）<\/span>/);
 assert.equal((html.match(/ua-effect-damage">傷害二<\/span>/g)||[]).length,2);
 assert.match(html,/ua-effect-damage">傷害（3）<\/span>/);
 assert.match(html,/ua-effect-damage">傷害（\+1）<\/span>/);
 assert.match(renderCardEffectText('&nbsp貫通&nbsp &nbsp傷害２&nbsp'),/ua-effect-impact">貫通<\/span>.*ua-effect-damage">傷害二<\/span>/);
 assert.match(renderCardEffectText('貫通（1）（攻擊勝利時）'),/ua-effect-impact">貫通（1）<\/span>/);
 assert.equal(renderCardEffectText('傷害2點時抽卡。'),'傷害2點時抽卡。');
 assert.equal(renderCardEffectText('此角色造成傷害二次後抽卡。'),'此角色造成傷害二次後抽卡。');
 const actual=TITLES.find(t=>t.id==='aot').cards.find(c=>typeof c.effect==='string'&&c.effect.includes('【傷害（2）】'));
 assert.ok(actual);
 assert.match(renderCardEffectText(actual.effect),/ua-effect-damage">傷害二<\/span>/);
 const css=readFileSync(new URL('../dist/arena-deck-mockup.css',import.meta.url),'utf8');
 assert.match(css,/\.ua-effect-keyword\.ua-effect-impact,/);
 assert.match(css,/\.ua-effect-keyword\.ua-effect-damage\{/);
});

test('Hiko summary has verified display-only timing labels and hand cost',()=>{
 const card=TITLES.find(t=>t.id==='rnk').cards.find(c=>c.id==='RNK-1-111');
 const original=card.effect;
 const html=renderCardEffectText(cardEffectDisplayText(card));
 assert.match(html,/ua-effect-keyword">登場時<\/span>/);
 assert.match(html,/ua-effect-main">主啟動<\/span>/);
 assert.match(html,/ua-effect-keyword">每回合一次<\/span>/);
 assert.match(html,/2張手牌/);
 assert.equal(card.effect,original);
 assert.match(renderCardEffectText('〖啟動主要〗〖每回合1〗'),/ua-effect-main">主啟動<\/span>.*每回合一次/);
 const sample=cardEffectDisplayText({title:'rnk',effect:'不能在前線登場；登場看牌庫頂2張；衝擊1；啟動主要：休息。'});
 assert.match(sample,/不能在前線登場；【登場時】看牌庫頂2張；【衝擊1】；【啟動主要】/);
 assert.equal(cardEffectDisplayText({title:'rnk',effect:'主階段開始時，抽卡。'}),'主階段開始時，抽卡。');
});

test('Emilia printed-card keywords use yellow impact, blue timing and red raid',()=>{
 const card=TITLES.find(t=>t.id==='rezero').cards.find(c=>c.id==='REZ-1-106');
 assert.ok(card);
 const html=renderCardEffectText(cardEffectDisplayText(card));
 assert.match(html,/ua-effect-raid">突襲<\/span>/);
 assert.match(html,/ua-effect-impact">貫通（1）<\/span>/);
 assert.match(html,/ua-effect-keyword">攻擊時<\/span>/);
 const css=readFileSync(new URL('../dist/arena-deck-mockup.css',import.meta.url),'utf8');
 assert.match(css,/\.ua-effect-keyword\{[^}]*color-scheme:only light;[^}]*background:#009bcd/);
 assert.match(css,/\.ua-effect-keyword\.ua-effect-damage\{[^}]*background:#ffe500;[^}]*color:#111/);
 assert.match(css,/\.ua-effect-keyword\.ua-effect-raid\{[^}]*background:#e60012/);
});
