import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['.git', '.serena', '.gradle', '.local', 'node_modules', 'build', 'dist', 'coverage',
  'playwright-report', 'test-results', '.firebase']);
async function inventory(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.endsWith('.log') || entry.name.endsWith('.tsbuildinfo')) continue;
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Unexpected source symlink: ${path}`);
    if (entry.isDirectory()) output.push(...await inventory(path)); else output.push(path);
  }
  return output;
}
const files = await inventory(root);
const skills = files.filter(path => path.endsWith('/SKILL.md'));
const expected = ['init-app', 'google-auth', 'gcp-setup', 'cloud-run', 'firebase-hosting', 'firestore', 'firebase-auth',
  'ci-cd', 'backend-development', 'client-development', 'local-testing'].map(name => `uncrud-${name}`);
assert.equal(skills.length, expected.length, 'Expected eleven real skills');
const found = [];
const remoteLinks = new Set();
for (const file of files) {
  if (/\.(?:png|jar)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  const relative = file.slice(root.length + 1);
  if (relative !== 'docs/extraction-map.md' && relative !== 'scripts/validate.mjs')
    assert(!/opinversa/i.test(content), `Reference-application contamination: ${relative}`);
  assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content), `Private key in ${relative}`);
  assert(!/"private_key"\s*:\s*"[^"\n]+/.test(content), `Credential JSON in ${relative}`);
  assert(!/AIza[0-9A-Za-z_-]{35}/.test(content), `Real-format API key in ${relative}`);
  assert(!/[\t ]+$/m.test(content), `Trailing whitespace in ${relative}`);
  if (file.endsWith('/SKILL.md')) {
    const match = /^---\n([\s\S]+?)\n---\n([\s\S]+)$/.exec(content);
    assert(match, `Missing skill frontmatter: ${relative}`);
    const metadata = parse(match[1]);
    assert(expected.includes(metadata.name), `Unexpected skill name: ${metadata.name}`);
    assert(file.endsWith(`/${metadata.name}/SKILL.md`), `Skill directory/name mismatch: ${relative}`);
    assert(typeof metadata.description === 'string' && metadata.description.length > 30 && metadata.description.length < 1024);
    assert(/prerequisites/i.test(match[2]) && /stop/i.test(match[2]) && /official references/i.test(match[2]),
      `Missing operational guidance: ${relative}`);
    assert(!/TODO|TBD|\[INSERT/.test(content), `Unfinished skill scaffold: ${relative}`);
    found.push(metadata.name);
  }
  if (file.endsWith('.md')) {
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const target = match[1];
      if (target.startsWith('https://')) { remoteLinks.add(target); continue; }
      if (target.startsWith('http://') || target.startsWith('#') || target.startsWith('mailto:')) continue;
      const local = decodeURIComponent(target.split('#')[0]);
      assert(existsSync(resolve(dirname(file), local)), `Broken local link in ${relative}: ${target}`);
    }
  }
  if (file.endsWith('.json')) JSON.parse(content);
  if (/\.ya?ml(?:\.example)?$/.test(file)) parse(content);
}
assert.deepEqual(found.sort(), [...expected].sort());
const firebase = JSON.parse(await readFile(join(root, 'firebase.json'), 'utf8'));
for (const [name, port] of Object.entries({ auth: 9199, firestore: 8180, ui: 4100, hub: 4401, logging: 4501 })) {
  assert.equal(firebase.emulators[name].host, '127.0.0.1');
  assert.equal(firebase.emulators[name].port, port);
}
const hosting = JSON.parse(await readFile(join(root, 'deploy/firebase/hosting.example.json'), 'utf8'));
assert.equal(hosting.hosting.rewrites[0].source, '/api/**');
assert.equal(hosting.hosting.rewrites.at(-1).destination, '/index.html');
assert(existsSync(resolve(root, 'deploy/firebase', hosting.hosting.public.replace('/dist', ''))), 'Bad Hosting output base');
for (const name of ['client', 'react']) {
  const manifest = JSON.parse(await readFile(join(root, `frontend/packages/${name}/package.json`), 'utf8'));
  assert.equal(manifest.private, true, 'Publication must remain disabled');
  assert.equal(manifest.license, 'Apache-2.0');
}
if (existsSync(join(root, '.github/workflows/cloud-deploy.yml'))) {
  const workflow = parse(await readFile(join(root, '.github/workflows/cloud-deploy.yml'), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch'], 'Cloud deployment must remain explicitly manual');
  assert(workflow.jobs.deploy.environment, 'Deploy job needs a protected environment');
  assert.equal(workflow.permissions['id-token'], 'write');
}
if (process.argv.includes('--remote-links')) {
  const failures = [];
  const pending = [...remoteLinks];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const url = pending.shift();
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
        await response.body?.cancel();
        if (!response.ok) failures.push(`${response.status} ${url}`);
      } catch (error) { failures.push(`${error.message} ${url}`); }
    }
  }));
  assert.deepEqual(failures, [], 'Official reference HTTP checks failed');
}
console.log(`Validated ${files.length} source files, ${skills.length} skills, local links, config and contamination boundaries.`);
console.log(`Official HTTPS references: ${remoteLinks.size}${process.argv.includes('--remote-links') ? ' checked over HTTP' : ' inventoried (use --remote-links to check online)'}.`);
