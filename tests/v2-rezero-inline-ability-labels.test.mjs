import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES} from '../dist/title-registry.mjs';
import {renderCardEffectText,cardEffectDisplayText} from '../dist/card-effect-display.mjs';
import {readFileSync} from 'node:fs';

const imageLabel=(name,type)=>'ua-effect-'+type+'" role="img" aria-label="'+name+'"';

test('REZ-2-065 prints Raid, own turn, main, once, Damage 2, Impact 1 and attack headers',()=>{
 const card=TITLES.find(t=>t.id==='rezero').cards.find(c=>c.id==='REZ-2-065');
 assert.ok(card,'the Priscilla card is available');
 assert.match(card.effectJa,/\[ダメージ（2）\]/);
 assert.match(card.effectJa,/\[インパクト（1）\]/);
 assert.match(card.effectJa,/\[ターン1\]/);
 const original=card.effect;
 const html=renderCardEffectText(cardEffectDisplayText(card));
 assert.ok(html.includes(imageLabel('突襲','raid')));
 assert.match(html,/aria-label="自己回合中"/);
 assert.ok(html.includes(imageLabel('主啟動','main')));
 assert.ok(html.includes(imageLabel('每回合一次','limit')));
 assert.ok(html.includes(imageLabel('傷害二','damage')));
 assert.ok(html.includes(imageLabel('貫通（1）','impact')));
 assert.match(html,/aria-label="攻擊時"/);
 assert.match(html,/3 張以上獲得/);
 assert.match(html,/5 張以上再獲得/);
 assert.match(html,/%23ffe500/,'combat badges are yellow image labels');
 assert.match(html,/%23fff/,'once-per-turn badge is white image label');
 assert.equal(card.effect,original,'the source / match data is unchanged');
 assert.doesNotMatch(html,/獲得傷害\s*2|獲得 Impact\s*1/,'ability names must be rendered as images');
});

test('shorthand normalization is safe and does not convert normal prose',()=>{
 const html=renderCardEffectText('【啟動主要】每回合 1 次：3張以上獲得傷害 ２；5張以上再獲得 IMPACT１。');
 assert.ok(html.includes(imageLabel('主啟動','main')));
 assert.ok(html.includes(imageLabel('每回合一次','limit')));
 assert.ok(html.includes(imageLabel('傷害二','damage')));
 assert.ok(html.includes(imageLabel('貫通（1）','impact')));
 const plain='此角色造成傷害 2 點後抽一張卡。每回合抽 1 次。攻擊造成 Impact 1 點。';
 assert.equal(renderCardEffectText(plain),plain,'numeric prose is not silently rewritten');
 assert.equal(renderCardEffectText('已獲得傷害 2 點。'),'已獲得傷害 2 點。');
 assert.equal((renderCardEffectText('獲得【傷害（2）】。').match(/ua-effect-damage/g)||[]).length,1,'no double labels');
 assert.ok(renderCardEffectText('Raid〈角色〉：轉為 ACTIVE。').includes(imageLabel('突襲','raid')));
 assert.doesNotMatch(renderCardEffectText('<img onerror=alert(1)>'),/<img onerror/);
});

test('editor loads the new shared formatter with cache-busted module URLs',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const editor=read('dist/v2-deck-editor.mjs');
 const visual=read('dist/visual-deck-builder.mjs');
 const index=read('dist/index.html');
 assert.match(editor,/card-effect-display\.mjs\?v=.*rez065badges1/);
 assert.match(visual,/card-effect-display\.mjs\?v=.*rez065badges1/);
 assert.match(index,/v2-deck-editor\.mjs\?v=.*rez065badges1/);
});
