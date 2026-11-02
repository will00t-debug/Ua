// esbuild injects these lexical bindings; no client state is stored globally.
import * as onlineBattleUiBootstrap from '../dist/universal-v2/online-battle-ui.mjs';
import {markOnlineRelease,watchOnlineRelease} from '../dist/online-updates.mjs';
const onlineClientBuild=/\/online-client-([A-Z0-9]{8})\.mjs$/.exec(new URL(import.meta.url).pathname)?.[1]||null;
export {onlineBattleUiBootstrap,onlineClientBuild,markOnlineRelease as onlineReleaseMarker,watchOnlineRelease as onlineReleaseWatcher};
