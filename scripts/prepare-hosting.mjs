import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const options = Object.fromEntries(process.argv.slice(2).map(value => {
  const match = /^--(project|region|service|dry-run)(?:=(.+))?$/.exec(value);
  if (!match) throw new Error('Use --project=ID --region=REGION --service=SERVICE [--dry-run]');
  return [match[1], match[2] ?? true];
}));
if (typeof options.project !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(options.project)
  || options.project.startsWith('demo-')) throw new Error('Explicit non-demo --project required');
if (typeof options.region !== 'string' || !/^[a-z]+-[a-z]+[0-9]+$/.test(options.region)) throw new Error('Explicit --region required');
if (typeof options.service !== 'string' || !/^[a-z][a-z0-9-]{0,48}$/.test(options.service)) throw new Error('Explicit --service required');
const config = JSON.parse(await readFile('deploy/firebase/hosting.example.json', 'utf8'));
config.hosting.public = '../starter/frontend/dist';
config.hosting.rewrites[0].run.serviceId = options.service;
config.hosting.rewrites[0].run.region = options.region;
if (options['dry-run']) console.log(JSON.stringify({ targetProject: options.project, config, cloudMutations: [] }, null, 2));
else {
  await mkdir('.local', { recursive: true });
  await writeFile('.local/hosting.json', JSON.stringify(config, null, 2) + '\n');
  console.log(`Prepared ${resolve('.local/hosting.json')} for ${options.project}. No deployment performed.`);
}
