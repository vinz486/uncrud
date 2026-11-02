import { describe, expect, it, vi } from 'vitest';
import { ApiError, createClient, ProjectionStore } from '@uncrud/client';
import { fakeAuth, fakeProjection } from './support';

describe('HTTP command client', () => {
  it('refreshes a rejected token once and preserves body and idempotency key', async () => {
    const auth = fakeAuth();
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(Response.json({ commandId: 'command-123', versions: { vote: 1 } }));
    const client = createClient({ endpoint: '/api/v1', auth, fetch: transport });
    const receipt = await client.command('/poll/vote', { option: 'a' }, { commandId: 'command-123' });
    expect(auth.getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0]?.[1]?.body).toBe(transport.mock.calls[1]?.[1]?.body);
    expect(transport.mock.calls[1]?.[1]?.headers).toMatchObject({ 'Idempotency-Key': 'command-123' });
    expect(receipt.versions.vote).toBe(1);
  });
  it('stops after two 401 responses', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}', { status: 401 }));
    await expect(createClient({ endpoint: '', auth: fakeAuth(), fetch: transport }).command('/vote', {}))
      .rejects.toMatchObject({ status: 401, outcome: 'rejected' });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('reports network failure after dispatch as unknown without automatic resend', async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network lost'));
    await expect(createClient({ endpoint: '', auth: fakeAuth(), fetch: transport })
      .command('/vote', {}, { commandId: 'unknown-command' })).rejects.toMatchObject({
      commandId: 'unknown-command', outcome: 'unknown', code: 'COMMAND_OUTCOME_UNKNOWN',
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('aborts a dispatched request on timeout and keeps an uncertain outcome', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    await expect(createClient({ endpoint: '', auth: fakeAuth(), fetch: transport })
      .command('/vote', {}, { timeoutMs: 5 })).rejects.toMatchObject({ outcome: 'unknown' });
  });
  it('does not dispatch when identity changes during token acquisition', async () => {
    const auth = fakeAuth();
    auth.getIdToken.mockImplementationOnce(async () => { auth.set('bob'); return 'old-token'; });
    const transport = vi.fn<typeof fetch>();
    await expect(createClient({ endpoint: '', auth, fetch: transport }).command('/vote', {}))
      .rejects.toMatchObject({ code: 'COMMAND_NOT_SENT' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('times out a stalled token request without dispatching', async () => {
    const auth = fakeAuth();
    auth.getIdToken.mockImplementationOnce(() => new Promise(() => {}));
    const transport = vi.fn<typeof fetch>();
    await expect(createClient({ endpoint: '', auth, fetch: transport }).command('/vote', {}, { timeoutMs: 5 }))
      .rejects.toMatchObject({ code: 'COMMAND_NOT_SENT' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects a completion after an identity change during dispatch', async () => {
    const auth = fakeAuth();
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_, init) => {
      auth.set('bob');
      return Response.json({ commandId: (init?.headers as Record<string, string>)['Idempotency-Key'], versions: {} });
    });
    await expect(createClient({ endpoint: '', auth, fetch: transport }).command('/vote', {}))
      .rejects.toMatchObject({ outcome: 'unknown' });
  });
  it('rejects receipts with a different command ID as uncertain', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ commandId: 'wrong', versions: {} }));
    await expect(createClient({ endpoint: '', auth: fakeAuth(), fetch: transport }).command('/vote', {}))
      .rejects.toBeInstanceOf(ApiError);
  });
});

describe('shared projection store', () => {
  it('shares one listener, preserves cache metadata, and ignores late callbacks', () => {
    const store = new ProjectionStore(fakeAuth());
    const source = fakeProjection<{ count: number }>();
    const off1 = store.subscribe(source.ref, vi.fn());
    const off2 = store.subscribe(source.ref, vi.fn());
    source.next({ count: 1 }, true);
    expect(source.ref.subscribe).toHaveBeenCalledTimes(1);
    expect(store.snapshot(source.ref)).toMatchObject({ data: { count: 1 }, fromCache: true });
    off1();
    expect(source.stop).not.toHaveBeenCalled();
    off2();
    source.next({ count: 99 });
    expect(source.stop).toHaveBeenCalledTimes(1);
    expect(store.snapshot(source.ref).status).toBe('loading');
  });
  it('distinguishes missing documents from terminal errors', () => {
    const store = new ProjectionStore(fakeAuth());
    const source = fakeProjection();
    const off = store.subscribe(source.ref, vi.fn());
    source.next(null);
    expect(store.snapshot(source.ref).status).toBe('missing');
    source.fail(new Error('permission-denied'));
    expect(store.snapshot(source.ref)).toMatchObject({ status: 'error', data: null });
    off();
  });
});
