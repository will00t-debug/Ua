// Display-only difficulty for the lobby policy line.
// A started match keeps the difficulty it was launched with. The lobby
// select is used only before that match exists, so changing it cannot
// retarget a game already in progress.

const LOBBY_DIFFICULTIES=new Set(['easy','normal','hard','learned']);

export function policyDifficulty({matchStarted=false,matchDifficulty='',lobbyDifficulty=''}={}){
 if(matchStarted)return matchDifficulty||'normal';
 if(LOBBY_DIFFICULTIES.has(lobbyDifficulty))return lobbyDifficulty;
 return matchDifficulty||'normal';
}
