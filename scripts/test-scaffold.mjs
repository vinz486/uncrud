import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temporary = await mkdtemp(join(tmpdir(), 'uncrud-scaffold-'));
const target = join(temporary, 'sample');
function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' });
  assert.equal(result.status, 0, `${command} failed`);
}
try {
  const preview = spawnSync('node', ['scripts/init-app.mjs', '--name=sample-app', `--dest=${target}`, '--dry-run'], { encoding: 'utf8' });
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.deepEqual(plan.cloudMutations, []);
  assert.equal(plan.config.name, 'sample-app');
  assert.deepEqual(await readdir(temporary), []);
  run('node', ['scripts/init-app.mjs', '--name=sample-app', `--dest=${target}`]);
  const refused = spawnSync('node', ['scripts/init-app.mjs', '--name=sample-app', `--dest=${target}`], { encoding: 'utf8' });
  assert.notEqual(refused.status, 0, 'must refuse overwriting an app');
  // No symlinks, published UnCRUD artifacts or source-repository dependencies.
  run('npm', ['ci', '--no-audit', '--no-fund'], target);
  run('npm', ['run', 'build'], target);
  run('./gradlew', ['build', '--console=plain'], target);
  console.log('Independent generated app: npm ci, frontend build and Java build passed.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
