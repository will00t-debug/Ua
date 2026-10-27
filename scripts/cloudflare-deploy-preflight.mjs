#!/usr/bin/env node
// Fail closed before any Cloudflare deploy. Keeps the existing Worker name and
// Durable Object bindings; never prints secret values.
import fs from 'node:fs';

const WORKER_NAME = 'ua-arena';
const REQUIRED_BINDINGS = Object.freeze({
  ACCOUNTS: 'AccountBook',
  ROOMS: 'MatchRoom',
});

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function readConfig(path) {
  let raw;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch {
    fail(`Missing ${path}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${path} must be JSON / JSONC without comments for deploy preflight`);
  }
}

const token = process.env.CLOUDFLARE_API_TOKEN || '';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
if (!token) fail('Set repository secret CLOUDFLARE_API_TOKEN before deploy');
if (!accountId) fail('Set repository secret CLOUDFLARE_ACCOUNT_ID before deploy');
// Presence only. Never log token or account id values.
console.log('Cloudflare credentials: present (values not printed)');

const config = readConfig('wrangler.jsonc');
if (config.name !== WORKER_NAME) {
  fail(`Refusing deploy: wrangler name must stay "${WORKER_NAME}" (got ${JSON.stringify(config.name)})`);
}
if (config.assets?.html_handling !== 'none') {
  fail('Refusing deploy: assets.html_handling must be "none"');
}
if (config.assets?.run_worker_first !== true) {
  fail('Refusing deploy: assets.run_worker_first must be true');
}

const bindings = Array.isArray(config.durable_objects?.bindings)
  ? config.durable_objects.bindings
  : [];
for (const [name, className] of Object.entries(REQUIRED_BINDINGS)) {
  const hit = bindings.find((b) => b?.name === name);
  if (!hit || hit.class_name !== className) {
    fail(`Refusing deploy: Durable Object binding ${name} must stay class ${className}`);
  }
}
if (bindings.length !== Object.keys(REQUIRED_BINDINGS).length) {
  fail('Refusing deploy: unexpected Durable Object bindings (would risk new/removed DO namespaces)');
}

const exports = config.exports && typeof config.exports === 'object' ? config.exports : {};
for (const className of Object.values(REQUIRED_BINDINGS)) {
  if (exports[className]?.type !== 'durable-object' || exports[className]?.storage !== 'sqlite') {
    fail(`Refusing deploy: exports.${className} must remain durable-object with sqlite storage`);
  }
}

const migrations = Array.isArray(config.migrations) ? config.migrations : [];
for (const migration of migrations) {
  for (const key of ['deleted_classes', 'renamed_classes', 'transferred_classes']) {
    const value = migration?.[key];
    if (Array.isArray(value) && value.length) {
      fail(`Refusing deploy: wrangler migrations.${key} would alter or drop Durable Object data`);
    }
    if (value && !Array.isArray(value) && Object.keys(value).length) {
      fail(`Refusing deploy: wrangler migrations.${key} would alter or drop Durable Object data`);
    }
  }
}

console.log(`Preflight OK for existing Worker "${WORKER_NAME}" with preserved Durable Object bindings`);
