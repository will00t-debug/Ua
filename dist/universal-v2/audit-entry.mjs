// Test-only gate for ?audit= boards. The public battle page ignores the
// parameter. Local acceptance and Chrome runs on localhost still load the
// named fixture through the same legal V2 actions.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function auditFixtureName(search, hostname) {
 const name = new URLSearchParams(String(search || '')).get('audit');
 if (!name) return '';
 const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
 return LOCAL_HOSTS.has(host) ? name : '';
}
