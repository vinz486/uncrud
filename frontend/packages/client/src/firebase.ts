import { onIdTokenChanged, type Auth } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, where,
  type Firestore, type DocumentData, type WhereFilterOp } from "firebase/firestore";
import type { AuthSnapshot, AuthSource, ProjectionRef } from "./index.js";

export function firebaseAuthSource(auth: Auth): AuthSource {
  let snapshot: AuthSnapshot = { status: "loading", uid: null };
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  return {
    getSnapshot: () => snapshot,
    getIdToken: async force => {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in first");
      return user.getIdToken(force);
    },
    subscribe(listener) {
      listeners.add(listener);
      stop ??= onIdTokenChanged(auth, user => {
        snapshot = { uid: user?.uid ?? null, status: user ? "signed-in" : "signed-out" };
        listeners.forEach(notify => notify());
      }, error => {
        snapshot = { status: "error", uid: null, error };
        listeners.forEach(notify => notify());
      });
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { stop?.(); stop = undefined; }
      };
    },
  };
}

/** Own this adapter per Firestore instance. Decoder IDs are explicit cache identities. */
const databaseKeys = new WeakMap<Firestore, number>();
let nextDatabaseKey = 0;
export function firestoreProjections(database: Firestore) {
  if (!databaseKeys.has(database)) databaseKeys.set(database, ++nextDatabaseKey);
  const namespace = `${database.app.name}:${database.app.options.projectId}:${databaseKeys.get(database)}`;
  return {
    document<T>(path: string, decode: (data: DocumentData) => T, decoderId: string): ProjectionRef<T> {
      return {
        key: JSON.stringify([namespace, "document", path, decoderId]),
        subscribe: (next, fail) => onSnapshot(doc(database, path), { includeMetadataChanges: true }, snapshot => {
          try { next(snapshot.exists() ? decode(snapshot.data()) : null, snapshot.metadata.fromCache); }
          catch (error) { fail(error instanceof Error ? error : new Error("Invalid projection")); }
        }, fail),
      };
    },
    query<T>(spec: { path: string; limit: number; orderBy: string; direction?: "asc" | "desc";
      where?: ReadonlyArray<readonly [string, WhereFilterOp, string | number | boolean]> },
    decode: (data: DocumentData, id: string) => T, decoderId: string): ProjectionRef<readonly T[]> {
      if (!Number.isInteger(spec.limit) || spec.limit < 1 || spec.limit > 100) throw new Error("Query limit must be 1..100");
      const constraints = [...(spec.where ?? []).map(([field, op, value]) => where(field, op, value)),
        orderBy(spec.orderBy, spec.direction ?? "asc"), limit(spec.limit)];
      return {
        key: JSON.stringify([namespace, "query", spec.path, spec.limit, spec.orderBy, spec.direction ?? "asc", spec.where ?? [], decoderId]),
        subscribe: (next, fail) => onSnapshot(query(collection(database, spec.path), ...constraints),
          { includeMetadataChanges: true }, snapshot => {
            try { next(snapshot.docs.map(document => decode(document.data(), document.id)), snapshot.metadata.fromCache); }
            catch (error) { fail(error instanceof Error ? error : new Error("Invalid projection")); }
          }, fail),
      };
    },
  };
}
