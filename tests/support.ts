import { vi } from 'vitest';
import { type AuthSource, type AuthSnapshot, type ProjectionRef } from '@uncrud/client';

export function fakeAuth() {
  let snapshot: AuthSnapshot = { uid: 'alice', status: 'signed-in' };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    getIdToken: vi.fn(async (_force: boolean) => 'token'),
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set(uid: string | null) { snapshot = { uid, status: uid ? 'signed-in' : 'signed-out' }; listeners.forEach(listener => listener()); },
  } satisfies AuthSource & { set(uid: string | null): void };
}

export function fakeProjection<T>(key = 'poll') {
  let receive: (value: T | null, cache: boolean) => void = () => {};
  let fail: (error: Error) => void = () => {};
  const stop = vi.fn();
  const ref: ProjectionRef<T> = { key, subscribe: vi.fn((next, error) => { receive = next; fail = error; return stop; }) };
  return { ref, stop, next: (value: T | null, cache = false) => receive(value, cache), fail: (error: Error) => fail(error) };
}
