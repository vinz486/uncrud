import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type PropsWithChildren } from 'react';
import { UncrudProvider, useCommand, useProjection } from '@uncrud/react';
import { createClient } from '@uncrud/client';
import { fakeAuth, fakeProjection } from './support';

afterEach(cleanup);
describe('React lifecycle', () => {
  it('receives initial and subsequent snapshots and unsubscribes on unmount', () => {
    const auth = fakeAuth();
    const client = createClient({ endpoint: '', auth });
    const source = fakeProjection<{ count: number }>();
    const wrapper = ({ children }: PropsWithChildren) => <UncrudProvider auth={auth} client={client}>{children}</UncrudProvider>;
    const hook = renderHook(() => useProjection(source.ref), { wrapper });
    expect(hook.result.current.status).toBe('loading');
    act(() => source.next({ count: 1 }));
    expect(hook.result.current.data?.count).toBe(1);
    act(() => source.next({ count: 2 }));
    expect(hook.result.current.data?.count).toBe(2);
    act(() => source.fail(new Error('permission-denied')));
    expect(hook.result.current.status).toBe('error');
    hook.unmount();
    expect(source.stop).toHaveBeenCalledTimes(1);
  });
  it('clears data on identity and query changes and rejects stale callbacks', () => {
    const auth = fakeAuth();
    const client = createClient({ endpoint: '', auth });
    const first = fakeProjection<string>('alice-query');
    const second = fakeProjection<string>('bob-query');
    const wrapper = ({ children }: PropsWithChildren) => <UncrudProvider auth={auth} client={client}>{children}</UncrudProvider>;
    const hook = renderHook(({ ref }) => useProjection(ref), { wrapper, initialProps: { ref: first.ref } });
    act(() => first.next('private-alice'));
    expect(hook.result.current.data).toBe('private-alice');
    act(() => auth.set('bob'));
    expect(hook.result.current.data).toBeNull();
    hook.rerender({ ref: second.ref });
    act(() => first.next('late-private-alice'));
    expect(hook.result.current.data).toBeNull();
    act(() => second.next('private-bob'));
    expect(hook.result.current.data).toBe('private-bob');
  });
  it('exposes command receipts separately from projections', async () => {
    const auth = fakeAuth();
    const client = createClient({ endpoint: '', auth, fetch: async (_, init) => Response.json({
      commandId: (init?.headers as Record<string, string>)['Idempotency-Key'], versions: { vote: 1 },
    }) });
    const source = fakeProjection<number>();
    const wrapper = ({ children }: PropsWithChildren) => <UncrudProvider auth={auth} client={client}>{children}</UncrudProvider>;
    const hook = renderHook(() => ({ command: useCommand('/vote'), projection: useProjection(source.ref) }), { wrapper });
    act(() => source.next(0));
    await act(async () => { await hook.result.current.command.execute({}); });
    expect(hook.result.current.command.receipt?.versions.vote).toBe(1);
    expect(hook.result.current.projection.data).toBe(0);
    act(() => auth.set('bob'));
    await waitFor(() => expect(hook.result.current.command.receipt).toBeNull());
    expect(hook.result.current.projection.data).toBeNull();
  });
});
