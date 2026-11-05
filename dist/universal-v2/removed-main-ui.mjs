// Public-zone MAIN effects must be selected from engine/server-issued legal actions.
// Never infer eligibility from a visible card's print or from energy shown in the UI.
export function legalRemovedMainAction(actions,uid,enabled=true){
 if(!enabled||typeof uid!=='string'||!Array.isArray(actions))return null;
 return actions.find(action=>action?.type==='activateRemoved'&&action.uid===uid)||null;
}
export function removedMainActionText(action){
 if(action?.type!=='activateRemoved')return '';
 return action.mode==='double'?'起動主要｜本回合產生能源 ×2':'起動主要｜發動移除區效果';
}
