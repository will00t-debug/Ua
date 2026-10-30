import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=file=>readFileSync(fileURLToPath(new URL('../dist/'+file,import.meta.url)),'utf8');

test('solo private pending card choices can temporarily show full board and hand and resume exactly the same pending selection',()=>{
 const ui=read('universal-v2-preview.mjs');
 const css=read('universal-v2-legacy.css');
 const dialog=ui.split('function pendingDialog(')[1]?.split('function finishMessage(')[0];
 assert.ok(dialog);
 assert.match(dialog,/universalPrivateChoices\(app\.packs,s,0\)/);
 assert.match(dialog,/inspectedPendingChoiceCards\(privateChoices,legal\)/);
 assert.match(dialog,/const canPeek=!triggerChoice&&!blocking/);
 assert.match(dialog,/top\|search\|look\|inspect\|deck\|outside\|hand/);
 assert.match(dialog,/查看場面與手牌/);
 assert.match(dialog,/if\(canPeek&&app\.inspectionPaused\)/);
 assert.match(dialog,/返回選牌/);
 assert.match(dialog,/app\.inspectionPaused=true;render\(\)/);
 assert.match(dialog,/app\.inspectionPaused=false;render\(\)/);
 assert.doesNotMatch(dialog,/dispatchUniversalAction\(/);
 assert.match(ui,/const tableLegal=app\.inspectionPaused\?\[\]:legal/);
 assert.match(ui,/legacyPlayer\(v,1,tableLegal\),middle,legacyPlayer\(v,0,tableLegal\)/);
 assert.match(ui,/legacyHand\(v,tableLegal\),app\.inspectionPaused\?null:legacyCommands\(legal\)/);
 assert.match(ui,/app\.targetChoices=null;app\.inspectionPaused=false;app\.error=/);
 assert.match(css,/\.v2-inspection-peek-tools/);
 assert.match(css,/\.v2-inspection-return/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test('online private top/deck gallery can collapse for a read-only board view and return to card choices',()=>{
 const online=read('online.mjs'),css=read('online.css');
 const gallery=online.split('function onlineInspectionGallery(')[1]?.split('function matchView(')[0];
 assert.ok(gallery);
 assert.match(gallery,/room\?\.yourTurn\?room\.inspection:null/);
 assert.match(gallery,/if\(app\.inspectionPaused\)/);
 assert.match(gallery,/返回選牌/);
 assert.match(gallery,/查看場面與手牌/);
 assert.match(gallery,/app\.inspectionPaused=true;app\.inspectPick=null;render\(\)/);
 assert.match(gallery,/app\.inspectionPaused=false;render\(\)/);
 assert.match(gallery,/document\.querySelector\('\.online-table'\)\?\.scrollIntoView/);
 assert.doesNotMatch(gallery,/sendAction\(.*(?:inspect|Paused)/);
 assert.match(online,/next\?\.revision!==app\.room\.revision\)\{app\.pick=null;app\.inspectPick=null;app\.inspectionPaused=false/);
 assert.match(online,/const listed=\(app\.inspectionPaused\?\[\]:dockChoices\(room\)\)/);
 assert.match(css,/\.online-inspection-peek/);
 assert.match(css,/\.online-inspection-return/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});
