import { expect, test } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

test('a verified command updates two realtime clients and direct database access is denied', async ({ browser }) => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Local emulator required');
  const admin = initializeApp({ projectId: 'demo-uncrud' }, 'e2e');
  const db = getFirestore(admin);
  // Reset only this synthetic fixture. New browser contexts have new anonymous UIDs.
  const source = db.doc('privatePolls/weekend');
  const snapshot = await source.get();
  const poll = snapshot.data()!;
  const counts = { outdoors: 0, books: 0, friends: 0 };
  const version = Number(poll.version) + 1;
  const batch = db.batch();
  batch.update(source, { counts, version });
  batch.set(db.doc('pollViews/weekend'), { id: 'weekend', title: poll.title, options: poll.options, counts,
    meta: { sourceVersion: version, schemaVersion: 1, updatedAt: Date.now() } });
  await batch.commit();
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const alice = await first.newPage();
    const bob = await second.newPage();
    const pageErrors: string[] = [];
    for (const page of [alice, bob]) page.on('pageerror', error => pageErrors.push(error.message));
    await Promise.all([alice.goto('/'), bob.goto('/')]);
    await expect(alice.getByRole('button', { name: /Read a book/ })).toBeEnabled();
    await expect(bob.getByRole('button', { name: /Meet friends/ })).toBeEnabled();
    await alice.getByRole('button', { name: /Read a book/ }).click();
    await expect(alice.getByTestId('count-books')).toHaveText('1');
    await expect(bob.getByTestId('count-books')).toHaveText('1');
    await bob.getByRole('button', { name: /Meet friends/ }).click();
    await expect(alice.getByTestId('total')).toHaveText('2');
    await expect(bob.getByTestId('total')).toHaveText('2');
    await alice.getByRole('button', { name: /Explore outdoors/ }).click();
    await expect(bob.getByTestId('count-books')).toHaveText('0');
    await expect(bob.getByTestId('count-outdoors')).toHaveText('1');
    const session = await alice.evaluate(async () => {
      const modulePath = '/src/firebase.ts';
      const { auth } = await import(modulePath);
      return { token: await auth.currentUser.getIdToken(), uid: auth.currentUser.uid };
    });
    const otherUid = await bob.evaluate(async () => {
      const modulePath = '/src/firebase.ts';
      return (await import(modulePath)).auth.currentUser.uid;
    });
    expect(session.uid).not.toBe(otherUid);
    const base = 'http://127.0.0.1:8180/v1/projects/demo-uncrud/databases/(default)/documents';
    const headers = { Authorization: `Bearer ${session.token}` };
    expect((await alice.request.get(`${base}/privatePolls/weekend`, { headers })).status()).toBe(403);
    expect((await alice.request.get(`${base}/userPollViews/${otherUid}/polls/weekend`, { headers })).status()).toBe(403);
    expect((await alice.request.patch(`${base}/pollViews/weekend`, { headers,
      data: { fields: { title: { stringValue: 'forged' } } } })).status()).toBe(403);
    expect((await alice.request.post('/api/v1/polls/weekend/vote', {
      headers: { 'Idempotency-Key': 'unauthorized-e2e' }, data: { optionId: 'books', expectedVoteVersion: 0 },
    })).status()).toBe(401);
    await alice.screenshot({ path: '.local/starter-desktop.png', fullPage: true });
    await alice.setViewportSize({ width: 390, height: 844 });
    await expect(alice.getByRole('button', { name: /Read a book/ })).toBeVisible();
    expect(await alice.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await alice.screenshot({ path: '.local/starter-mobile.png', fullPage: true });
    expect(pageErrors).toEqual([]);
  } finally {
    await first.close(); await second.close(); await deleteApp(admin);
  }
});
