// Shared mobile-friendly frame for isolated Beta battle arenas.
// Existing cards, hidden information and card-specific choice panels stay
// controlled by their original, independently-tested renderer.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
export const AI_LEVEL_TEXT=Object.freeze({
 easy:'簡單 · 基礎出牌',normal:'普通 · 現有策略',hard:'困難 · 能源規劃'
});
export function betaDifficultySelect(difficulty,{label='電腦難度'}={}){
 return `<label class='betaAiSetting'><span>${esc(label)}</span><select id='aiDifficultySelect' aria-label='AI 難度'>${Object.entries(AI_LEVEL_TEXT).map(([key,value])=>`<option value='${key}' ${difficulty===key?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
}
export function betaArenaHeader({title,turn,phase,actor,aiDifficulty,status,lifePlayer,lifeOpponent,energyPlayer,energyOpponent,apPlayer,apOpponent}){
 return `<header class='pageHeading betaMatchHeader'><div><h1>${esc(title)} · Beta 自動對戰</h1><p>第 ${esc(turn)} 回合 · ${esc(phase)} · ${status==='finished'?'對局結束':actor===1?'AI 思考中':'輪到你操作'}</p></div><button class='btn outline' data-view='builder'>返回牌組構築</button></header>
 <section class='panel betaMatchToolbar' aria-label='共用對戰資訊'>
  <div class='betaMatchStats'>
   <div><b>你的生命 ${esc(lifePlayer)}</b><small>能源 ${esc(energyPlayer)} · AP ${esc(apPlayer)}</small></div>
   <div><b>AI 生命 ${esc(lifeOpponent)}</b><small>能源 ${esc(energyOpponent)} · AP ${esc(apOpponent)}</small></div>
  </div>
  ${betaDifficultySelect(aiDifficulty)}
  <small class='betaMatchNote'>所有動作先經合法性驗證；卡片效果由原作品專屬 Beta 核心處理。切換難度從 AI 下一個動作生效。</small>
 </section>`;
}
