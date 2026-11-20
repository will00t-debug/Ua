import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCardEffectText,renderCardEffectText} from '../dist/card-effect-display.mjs';
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
 assert.match(read('dist/visual-deck-builder.mjs'),/renderCardEffectText\(focusCard\.effect/);
 assert.match(read('dist/arena-deck-mockup.css'),/\.ua-effect-keyword\.ua-effect-main\{[^}]*background:#0861ad/);
});
