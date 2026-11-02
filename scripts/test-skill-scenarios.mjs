import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';

// Execute the cloud-hosting skill's local preparation path, never its deploy path.
const result = spawnSync('node', ['scripts/prepare-hosting.mjs', '--project=sample-dev-project',
  '--region=europe-west1', '--service=sample-api', '--dry-run'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
const plan = JSON.parse(result.stdout);
assert.deepEqual(plan.cloudMutations, []);
assert.equal(plan.config.hosting.rewrites[0].run.serviceId, 'sample-api');
assert.equal(plan.config.hosting.rewrites[0].run.region, 'europe-west1');
assert.equal(plan.config.hosting.public, '../starter/frontend/dist');
const invalid = spawnSync('node', ['scripts/prepare-hosting.mjs', '--project=demo-uncrud',
  '--region=europe-west1', '--service=sample-api', '--dry-run'], { encoding: 'utf8' });
assert.notEqual(invalid.status, 0, 'cloud config must reject the demo project');
const missing = spawnSync('node', ['scripts/prepare-hosting.mjs', '--dry-run'], { encoding: 'utf8' });
assert.notEqual(missing.status, 0, 'cloud config must require explicit target');

// Execute the testing skill's occupied-port stop condition and preserve the existing owner.
const server = createServer();
await new Promise((yes, no) => { server.once('error', no); server.listen(8180, '127.0.0.1', yes); });
try {
  const blocked = spawnSync('node', ['scripts/local.mjs', 'integration'], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /8180 is occupied/);
  assert(server.listening, 'existing process must remain alive');
} finally { await new Promise(yes => server.close(yes)); }
console.log('Skill scenarios passed: Hosting preparation without cloud writes, explicit-target checks and occupied-port refusal.');
