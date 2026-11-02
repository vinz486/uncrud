import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, open, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (!['dev', 'integration', 'e2e', 'verify'].includes(mode)) throw new Error('Use dev, integration, e2e or verify');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node 24: nvm use');
const env = { ...process.env, UNCRUD_ENV: 'local', UNCRUD_PROJECT_ID: 'demo-uncrud', UNCRUD_DATABASE_ID: '(default)',
  GCLOUD_PROJECT: 'demo-uncrud', GOOGLE_CLOUD_PROJECT: 'demo-uncrud',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180',
  FIREBASE_CLI_DISABLE_USAGE_REPORTING: 'true', JAVA_TOOL_OPTIONS: '-Xmx768m',
  UNCRUD_ALLOWED_ORIGINS: 'http://127.0.0.1:5174', PORT: '8181' };
delete env.GOOGLE_APPLICATION_CREDENTIALS;
const children = new Set();
let shuttingDown = false;
let unexpectedExit;
await mkdir(resolve(root, '.local'), { recursive: true });

function start(command, args, name, background = false) {
  const child = spawn(command, args, { cwd: root, env, detached: true, stdio: background ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  children.add(child);
  if (background) {
    const log = open(resolve(root, '.local', `${name}.log`), 'w');
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { void log.then(handle => handle.write(chunk)); });
    child.once('exit', code => {
      void log.then(handle => handle.close());
      if (!shuttingDown) unexpectedExit = new Error(`${name} exited (${code}); inspect .local/${name}.log`);
    });
  }
  child.once('error', error => { unexpectedExit = error; });
  child.once('exit', () => children.delete(child));
  return child;
}

async function run(command, args) {
  if (unexpectedExit) throw unexpectedExit;
  const child = start(command, args, command);
  await new Promise((yes, no) => {
    child.once('error', no);
    child.once('exit', (code, signal) => code === 0 ? yes() : no(new Error(`${command} failed: ${code ?? signal}`)));
  });
}

async function checkPorts(ports) {
  for (const port of ports) {
    const server = createServer();
    await new Promise((yes, no) => {
      server.once('error', () => no(new Error(`Port ${port} is occupied. Stop its owner; UnCRUD will not attach or kill it.`)));
      server.listen(port, '127.0.0.1', yes);
    });
    await new Promise((yes, no) => server.close(error => error ? no(error) : yes()));
  }
}

async function waitFor(url, label, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (unexpectedExit) throw unexpectedExit;
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); if (response.ok) return; } catch {}
    await new Promise(yes => setTimeout(yes, 300));
  }
  throw new Error(`${label} did not become ready. Inspect .local logs.`);
}

async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  const owned = [...children];
  for (const child of owned) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  await new Promise(yes => setTimeout(yes, 1500));
  for (const child of owned) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void cleanup().then(() => process.exit(0)); });

try {
  await checkPorts([8180, 9199, 4100, 4401, 4501, 9150, ...(mode === 'integration' ? [] : [8181, 5174])]);
  if (mode === 'verify') {
    await run('node', ['scripts/validate.mjs']);
    await run('./gradlew', ['build', '--console=plain']);
    await run('npm', ['run', 'build']);
    await run('node_modules/.bin/tsc', ['-p', 'tests/tsconfig.json']);
    await run('node_modules/.bin/vitest', ['run']);
    await run('node', ['scripts/test-scaffold.mjs']);
    await run('node', ['scripts/test-skill-scenarios.mjs']);
  } else if (mode !== 'integration') {
    await run('./gradlew', [':starter:backend:bootJar', '--console=plain']);
    await run('npm', ['run', 'build']);
  }
  start('node_modules/.bin/firebase', ['emulators:start', '--only', 'auth,firestore', '--project', 'demo-uncrud',
    '--config', 'firebase.json'], 'emulators', true);
  await waitFor('http://127.0.0.1:4401/emulators', 'Emulator hub');
  await waitFor('http://127.0.0.1:9199/', 'Auth emulator');
  await waitFor('http://127.0.0.1:8180/', 'Firestore emulator');
  if (mode === 'integration' || mode === 'verify') {
    await run('npm', ['run', 'test:rules']);
    await run('./gradlew', [':starter:backend:integrationTest', '--console=plain']);
  }
  if (mode !== 'integration') {
    const jars = (await readdir(resolve(root, 'starter/backend/build/libs'))).filter(name => name.endsWith('.jar')
      && !name.includes('-plain') && !name.includes('-sources') && !name.includes('-javadoc'));
    if (jars.length !== 1) throw new Error('Expected one executable starter jar');
    start('java', ['-jar', `starter/backend/build/libs/${jars[0]}`], 'backend', true);
    await waitFor('http://127.0.0.1:8181/api/v1/health', 'Backend');
    start('node_modules/.bin/vite', ['--config', 'starter/frontend/vite.config.ts', '--host', '127.0.0.1',
      '--port', '5174', '--strictPort', 'starter/frontend'], 'frontend', true);
    await waitFor('http://127.0.0.1:5174/', 'Frontend');
    if (mode === 'dev') {
      console.log('\nUnCRUD ready: http://127.0.0.1:5174 · Emulator UI: http://127.0.0.1:4100\nCtrl+C stops only this run.');
      // Rebuild workspace libraries when their TypeScript source changes.
      start('node_modules/.bin/tsc', ['-p', 'frontend/packages/client', '--watch'], 'client-watch', true);
      start('node_modules/.bin/tsc', ['-p', 'frontend/packages/react', '--watch'], 'react-watch', true);
      await new Promise((_, reject) => {
        const timer = setInterval(() => { if (unexpectedExit) { clearInterval(timer); reject(unexpectedExit); } }, 1000);
      });
    } else {
      await run('node_modules/.bin/playwright', ['test']);
      if (mode === 'verify' && existsSync(resolve(root, '.git'))) await run('git', ['diff', '--check']);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
