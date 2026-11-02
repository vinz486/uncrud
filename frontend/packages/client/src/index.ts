export interface CommandReceipt {
  commandId: string;
  versions: Readonly<Record<string, number>>;
}

export interface AuthSnapshot {
  status: "loading" | "signed-in" | "signed-out" | "error";
  uid: string | null;
  error?: Error;
}

export interface AuthSource {
  getSnapshot(): AuthSnapshot;
  subscribe(listener: () => void): () => void;
  getIdToken(forceRefresh: boolean): Promise<string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly commandId: string,
    readonly outcome: "rejected" | "unknown" = "rejected",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface CommandOptions {
  commandId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error("Operation cancelled");
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("Operation cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function createClient(config: { endpoint: string; auth: AuthSource; fetch?: typeof fetch }) {
  const transport = config.fetch ?? globalThis.fetch.bind(globalThis);
  return {
    async command<I, R extends CommandReceipt = CommandReceipt>(path: string, input: I, options: CommandOptions = {}): Promise<R> {
      if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Use an API-relative command path");
      const commandId = options.commandId ?? crypto.randomUUID();
      const identity = config.auth.getSnapshot().uid;
      if (!identity) throw new ApiError("Sign in before sending a command", 401, "AUTH_REQUIRED", commandId);
      const body = JSON.stringify(input);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
      const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
      const stop = config.auth.subscribe(() => {
        if (config.auth.getSnapshot().uid !== identity) controller.abort();
      });
      let sent = false;
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const token = await abortable(config.auth.getIdToken(attempt === 1), signal);
          if (signal.aborted || config.auth.getSnapshot().uid !== identity) throw new Error("Command cancelled");
          sent = true;
          const response = await abortable(transport(`${config.endpoint.replace(/\/$/, "")}${path}`, {
            method: "POST", body, signal, cache: "no-store",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": commandId },
          }), signal);
          if (signal.aborted || config.auth.getSnapshot().uid !== identity) throw new Error("Command context changed");
          if (response.status === 401 && attempt === 0) {
            await response.arrayBuffer();
            sent = false;
            continue;
          }
          if (!response.ok) {
            const problem = await response.json().catch(() => ({})) as { message?: string; code?: string };
            throw new ApiError(problem.message ?? "The command failed", response.status, problem.code ?? "HTTP_ERROR", commandId,
              response.status >= 500 ? "unknown" : "rejected");
          }
          const receipt: unknown = await abortable(response.json(), signal);
          if (!receipt || typeof receipt !== "object" || !("commandId" in receipt) || receipt.commandId !== commandId
            || !("versions" in receipt) || !receipt.versions || typeof receipt.versions !== "object") {
            throw new Error("Invalid command receipt");
          }
          return receipt as R;
        }
        throw new Error("Token refresh exhausted");
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(sent ? "The outcome is unknown. Retry the same command with the same key."
          : "The command was not sent. Check your session or connection.", 0,
          sent ? "COMMAND_OUTCOME_UNKNOWN" : "COMMAND_NOT_SENT", commandId, sent ? "unknown" : "rejected");
      } finally {
        clearTimeout(timeout);
        stop();
      }
    },
  };
}

export type UncrudClient = ReturnType<typeof createClient>;
export type ProjectionSnapshot<T> = Readonly<{
  status: "loading" | "ready" | "missing" | "error";
  data: T | null;
  fromCache: boolean;
  error: Error | null;
}>;
export interface ProjectionRef<T> {
  /** Include database identity and every query/decoder distinction in this key. */
  key: string;
  subscribe(next: (data: T | null, fromCache: boolean) => void, fail: (error: Error) => void): () => void;
}

interface Entry<T> {
  snapshot: ProjectionSnapshot<T>;
  listeners: Set<() => void>;
  stop?: () => void;
  active: boolean;
}

const LOADING: ProjectionSnapshot<never> = Object.freeze({ status: "loading", data: null, fromCache: false, error: null });

/** External store: one listener per identity + resource, no React dependency. */
export class ProjectionStore {
  private entries = new Map<string, Entry<unknown>>();
  constructor(private auth: AuthSource) {}

  private key<T>(ref: ProjectionRef<T>): string {
    const auth = this.auth.getSnapshot();
    return JSON.stringify([auth.uid, auth.status, ref.key]);
  }

  snapshot<T>(ref: ProjectionRef<T>): ProjectionSnapshot<T> {
    return (this.entries.get(this.key(ref))?.snapshot ?? LOADING) as ProjectionSnapshot<T>;
  }

  subscribe<T>(ref: ProjectionRef<T>, listener: () => void): () => void {
    const key = this.key(ref);
    let entry = this.entries.get(key) as Entry<T> | undefined;
    if (!entry) {
      entry = { snapshot: LOADING, listeners: new Set(), active: true };
      this.entries.set(key, entry as Entry<unknown>);
    }
    const current = entry;
    current.listeners.add(listener);
    if (!current.stop && this.auth.getSnapshot().status === "signed-in") {
      const update = (snapshot: ProjectionSnapshot<T>) => {
        if (!current.active || key !== this.key(ref)) return;
        current.snapshot = snapshot;
        current.listeners.forEach(notify => notify());
      };
      try {
        current.stop = ref.subscribe(
          (data, fromCache) => update({ status: data === null ? "missing" : "ready", data, fromCache, error: null }),
          error => update({ status: "error", data: null, fromCache: false, error }),
        );
      } catch (error) {
        update({ status: "error", data: null, fromCache: false, error: error instanceof Error ? error : new Error("Listener failed") });
      }
    }
    return () => {
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        current.active = false;
        current.stop?.();
        current.stop = undefined;
        if (this.entries.get(key) === current) this.entries.delete(key);
      }
    };
  }

  clear(): void {
    const previous = [...this.entries.values()];
    this.entries.clear();
    for (const entry of previous) {
      entry.active = false;
      entry.stop?.();
      entry.stop = undefined;
      entry.listeners.forEach(notify => notify());
    }
  }
}
