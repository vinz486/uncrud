import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ProjectionStore, type AuthSource, type CommandOptions, type CommandReceipt,
  type ProjectionRef, type UncrudClient } from "@uncrud/client";

const Context = createContext<{ auth: AuthSource; client: UncrudClient; projections: ProjectionStore } | null>(null);

export function UncrudProvider({ auth, client, children }: { auth: AuthSource; client: UncrudClient; children: ReactNode }) {
  const projections = useMemo(() => new ProjectionStore(auth), [auth]);
  useEffect(() => {
    let uid = auth.getSnapshot().uid;
    const stop = auth.subscribe(() => {
      const next = auth.getSnapshot().uid;
      if (next !== uid) { uid = next; projections.clear(); }
    });
    return () => { stop(); projections.clear(); };
  }, [auth, projections]);
  const value = useMemo(() => ({ auth, client, projections }), [auth, client, projections]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function useUncrud() {
  const context = useContext(Context);
  if (!context) throw new Error("Wrap your application in UncrudProvider");
  return context;
}

export function useAuth() {
  const { auth } = useUncrud();
  return useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getSnapshot);
}

export function useProjection<T>(reference: ProjectionRef<T>) {
  const { projections } = useUncrud();
  const identity = useAuth();
  // Resource identity is explicit; callers may recreate equivalent reference objects.
  const ref = useMemo(() => reference, [reference.key]);
  const subscribe = useCallback((notify: () => void) => projections.subscribe(ref, notify),
    [projections, ref, identity.uid, identity.status]);
  const snapshot = useCallback(() => projections.snapshot(ref), [projections, ref, identity.uid, identity.status]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const useProjectionQuery = useProjection;

export function useCommand<I, R extends CommandReceipt = CommandReceipt>(path: string) {
  const { client } = useUncrud();
  const identity = useAuth();
  const contextKey = JSON.stringify([identity.uid, path]);
  const [state, setState] = useState<{ pending: boolean; receipt: R | null; error: Error | null; owner: string }>(
    { pending: false, receipt: null, error: null, owner: contextKey });
  const generation = useRef(0);
  const active = useRef<AbortController | null>(null);
  const owner = useRef(contextKey);
  if (owner.current !== contextKey) {
    owner.current = contextKey;
    generation.current++;
  }
  useEffect(() => {
    setState({ pending: false, receipt: null, error: null, owner: contextKey });
    return () => { generation.current++; active.current?.abort(); };
  }, [identity.uid, path, client]);
  const execute = useCallback(async (input: I, options: CommandOptions = {}) => {
    const current = ++generation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ pending: true, receipt: null, error: null, owner: contextKey });
    try {
      const receipt = await client.command<I, R>(path, input, {
        ...options, signal: options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal,
      });
      if (generation.current === current) setState({ pending: false, receipt, error: null, owner: contextKey });
      return receipt;
    } catch (error) {
      if (generation.current === current) setState({ pending: false, receipt: null,
        error: error instanceof Error ? error : new Error("Command failed"), owner: contextKey });
      throw error;
    }
  }, [client, path, contextKey]);
  const visible = state.owner === contextKey ? state : { pending: false, receipt: null, error: null };
  return { pending: visible.pending, receipt: visible.receipt, error: visible.error, execute };
}
