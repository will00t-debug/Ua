// Browser and server share the dist copy. Static hosting only publishes dist/,
// so the preview must not import this file by its /server URL.
export {publicCardResults} from '../dist/universal-v2/public-card-results.mjs';
