import { cp, lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flags = new Map();
for (const argument of process.argv.slice(2)) {
  const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argument);
  if (!match || !['name', 'dest', 'dev-project', 'prod-project', 'region', 'auth', 'dry-run'].includes(match[1]))
    throw new Error('Use --name=app-name --dest=/empty/path [--region=REGION --dev-project=ID --prod-project=ID --auth=anonymous|email-password --dry-run]');
  if (flags.has(match[1])) throw new Error(`Duplicate option: ${match[1]}`);
  flags.set(match[1], match[2] ?? true);
}
const name = flags.get('name');
if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{1,62}$/.test(name)) throw new Error('Provide a lowercase app name (2..63 characters)');
const destination = flags.get('dest');
if (typeof destination !== 'string' || !isAbsolute(destination)) throw new Error('--dest must be an absolute path');
const target = resolve(destination);
const parent = await realpath(dirname(target));
if (parent !== dirname(target)) throw new Error('Destination parent must not use symlinks');
const offset = relative(root, target);
if (!offset.startsWith('..') || target === root) throw new Error('Create the application outside this source repository');
try {
  const stats = await lstat(target);
  if (!stats.isDirectory() || stats.isSymbolicLink() || (await readdir(target)).length) throw new Error('Destination must be an empty real directory');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const project = key => {
  const value = flags.get(key) ?? null;
  if (value !== null && (typeof value !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value) || value.startsWith('demo-')))
    throw new Error(`${key}: provide a real-format project ID or omit it; no resources will be created`);
  return value;
};
const devProjectId = project('dev-project');
const prodProjectId = project('prod-project');
if (devProjectId && devProjectId === prodProjectId) throw new Error('DEV and PROD must use separate projects');
const auth = flags.get('auth') ?? 'anonymous';
if (!['anonymous', 'email-password'].includes(auth)) throw new Error('Unsupported auth preference');
const region = flags.get('region') ?? null;
if (region !== null && (typeof region !== 'string' || !/^[a-z]+-[a-z]+[0-9]+$/.test(region))) throw new Error('Invalid region format');
const config = { name, stack: 'java-spring-react', region, devProjectId, prodProjectId, auth,
  hosting: 'firebase-hosting-with-cloud-run-rewrite', localProjectId: 'demo-uncrud' };
const excluded = new Set(['.git', '.serena', '.gradle', '.local', 'node_modules', 'build', 'dist',
  'playwright-report', 'test-results', 'coverage', '.firebase', '.secrets', 'app.config.json']);
const filter = async path => {
  const parts = relative(root, path).split('/');
  const base = parts.at(-1);
  if (parts.some(part => excluded.has(part)) || base.endsWith('.log') || base.endsWith('.tsbuildinfo')
    || /\.(?:pem|key)$/.test(base) || /(?:credentials|gha-creds-).*\.json$/.test(base)
    || (base.startsWith('.env') && base !== '.env.example')) return false;
  if ((await lstat(path)).isSymbolicLink()) throw new Error(`Refusing source symlink: ${relative(root, path)}`);
  return true;
};
const files = [];
async function list(path = root) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const candidate = join(path, entry.name);
    if (!(await filter(candidate))) continue;
    if (entry.isDirectory()) await list(candidate); else files.push(relative(root, candidate));
  }
}
await list();
if (flags.has('dry-run')) {
  console.log(JSON.stringify({ destination: target, config, files, cloudMutations: [] }, null, 2));
} else {
  await mkdir(target, { recursive: false }).catch(error => { if (error.code !== 'EEXIST') throw error; });
  for (const file of files) {
    const output = join(target, file);
    await mkdir(dirname(output), { recursive: true });
    await cp(join(root, file), output, { force: false, errorOnExist: true });
  }
  await writeFile(join(target, 'app.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  manifest.name = `${name}-workspace`;
  await writeFile(join(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  // Preserve lockfile consistency for npm ci after renaming the workspace root.
  const lockPath = join(target, 'package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  lock.name = manifest.name;
  lock.packages[''].name = manifest.name;
  await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log(`Created ${target}. Run npm ci, then npm run dev. Cloud preferences are recorded, not applied.`);
  if (auth !== 'anonymous') console.log('Email/password is a recorded preference: implement its UI/provider with uncrud-firebase-auth before cloud use.');
}
