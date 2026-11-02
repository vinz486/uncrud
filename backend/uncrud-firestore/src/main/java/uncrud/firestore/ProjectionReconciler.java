package uncrud.firestore;

import uncrud.core.DocumentKey;
import uncrud.core.DocumentStore;
import uncrud.core.Projection;
import uncrud.core.ProjectionMeta;

import java.util.function.Function;
import java.util.function.ToLongFunction;

/** Bounded reconciliation from fresh private state, without replaying commands. */
public final class ProjectionReconciler {

    public enum Status { CURRENT, MISSING, STALE, ORPHANED, ABSENT, AHEAD }

    private final DocumentStore store;

    public ProjectionReconciler(DocumentStore store) {

        this.store = store;
    }

    public <S, V> Status reconcile(DocumentKey<S> source, DocumentKey<V> view, ToLongFunction<S> sourceVersion,
            Function<V, ProjectionMeta> metadata, int schemaVersion, Projection<S, V> projection, boolean apply) {

        return store.transaction(transaction -> {

            S current = transaction.get(source);
            V existing = transaction.get(view);
            Status status;
            if (current == null) {

                status = existing == null ? Status.ABSENT : Status.ORPHANED;
            }
            else if (existing == null) {

                status = Status.MISSING;
            }
            else {

                var meta = metadata.apply(existing);
                status = meta.schemaVersion() > schemaVersion || meta.sourceVersion() > sourceVersion.applyAsLong(current)
                        ? Status.AHEAD
                        : meta.schemaVersion() != schemaVersion || meta.sourceVersion() != sourceVersion.applyAsLong(current)
                                ? Status.STALE : Status.CURRENT;
            }
            if (apply && status == Status.ORPHANED) {

                transaction.delete(view);
            }
            else if (apply && (status == Status.MISSING || status == Status.STALE)) {

                transaction.put(view, projection.build(transaction, current));
            }
            return status;
        });
    }
}
