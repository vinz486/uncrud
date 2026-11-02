import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180' || process.env.GCLOUD_PROJECT !== 'demo-uncrud')
  throw new Error('Run npm run test:integration: isolated demo-uncrud emulators are required');
let environment;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-uncrud', firestore: {
    host: '127.0.0.1', port: 8180, rules: await readFile('deploy/firebase/firestore.rules', 'utf8'),
  } });
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'privatePolls/rules-poll'), { secret: 'synthetic-private-state' }),
      setDoc(doc(db, 'pollViews/rules-poll'), { title: 'Shared view', counts: { yes: 1 } }),
      setDoc(doc(db, 'userPollViews/alice/polls/rules-poll'), { optionId: 'yes' }),
      setDoc(doc(db, 'userPollViews/bob/polls/rules-poll'), { optionId: 'no' }),
      setDoc(doc(db, 'privateCommands/alice/receipts/example'), { receipt: {} }),
    ]);
  });
});
after(async () => {
  if (!environment) return;
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all(['privatePolls/rules-poll', 'pollViews/rules-poll', 'userPollViews/alice/polls/rules-poll',
      'userPollViews/bob/polls/rules-poll', 'privateCommands/alice/receipts/example'].map(path => deleteDoc(doc(db, path))));
  });
  await environment.cleanup();
});
test('unauthenticated readers cannot read projections or private state', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'pollViews/rules-poll')));
  await assertFails(getDoc(doc(db, 'privatePolls/rules-poll')));
});
test('authenticated users can read shared views and bounded queries', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'pollViews/rules-poll')));
  await assertSucceeds(getDocs(query(collection(db, 'pollViews'), limit(25))));
  await assertFails(getDocs(collection(db, 'pollViews')));
  await assertFails(getDocs(query(collection(db, 'pollViews'), limit(101))));
});
test('personal views isolate users, including absent documents and queries', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'userPollViews/alice/polls/rules-poll')));
  await assertSucceeds(getDoc(doc(db, 'userPollViews/alice/polls/absent')));
  await assertSucceeds(getDocs(query(collection(db, 'userPollViews/alice/polls'), limit(25))));
  await assertFails(getDoc(doc(db, 'userPollViews/bob/polls/rules-poll')));
  await assertFails(getDocs(query(collection(db, 'userPollViews/bob/polls'), limit(25))));
});
test('even an admin claim cannot read private sources or receipts', async () => {
  const db = environment.authenticatedContext('alice', { admin: true }).firestore();
  await assertFails(getDoc(doc(db, 'privatePolls/rules-poll')));
  await assertFails(getDoc(doc(db, 'privateCommands/alice/receipts/example')));
});
test('create, update and delete are denied for views, private state and unknown paths', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  for (const path of ['pollViews/rules-poll', 'userPollViews/alice/polls/rules-poll', 'privatePolls/rules-poll', 'unknown/example']) {
    await assertFails(setDoc(doc(db, path), { forged: true }));
    await assertFails(updateDoc(doc(db, path), { forged: true }));
    await assertFails(deleteDoc(doc(db, path)));
  }
});
