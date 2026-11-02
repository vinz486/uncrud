package uncrud.firestore;

import com.google.cloud.firestore.FieldPath;
import com.google.cloud.firestore.Firestore;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import uncrud.core.CommandFailure;
import uncrud.core.DocumentKey;
import uncrud.core.DocumentStore;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

/** All writes are staged until the handler and all projection builders have finished reading. */
public final class FirestoreDocumentStore implements DocumentStore {

    private static final Object DELETE = new Object();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    private final Firestore firestore;
    private final ObjectMapper mapper = new ObjectMapper();

    public FirestoreDocumentStore(Firestore firestore) {

        this.firestore = firestore;
    }

    @Override
    public <R> R transaction(Function<Transaction, R> work) {

        try {

            return firestore.runTransaction(nativeTransaction -> {

                Map<String, Object> writes = new LinkedHashMap<>();
                Transaction transaction = new Transaction() {

                    @Override
                    public <T> T get(DocumentKey<T> key) {

                        if (writes.containsKey(key.path())) {

                            Object staged = writes.get(key.path());
                            return staged == DELETE ? null : key.type().cast(staged);
                        }
                        try {

                            var snapshot = nativeTransaction.get(firestore.document(key.path())).get();
                            return snapshot.exists() ? mapper.convertValue(snapshot.getData(), key.type()) : null;
                        }
                        catch (InterruptedException error) {

                            Thread.currentThread().interrupt();
                            throw new IllegalStateException("Firestore read interrupted", error);
                        }
                        catch (ExecutionException error) {

                            throw new IllegalStateException("Firestore read failed", error);
                        }
                    }

                    @Override
                    public <T> void put(DocumentKey<T> key, T value) {

                        if (value == null) {

                            throw new IllegalArgumentException("Use delete for missing documents");
                        }
                        writes.put(key.path(), key.type().cast(value));
                    }

                    @Override
                    public void delete(DocumentKey<?> key) {

                        writes.put(key.path(), DELETE);
                    }
                };
                R result = work.apply(transaction);
                if (writes.size() > 400) {

                    throw new CommandFailure(422, "TRANSACTION_TOO_LARGE", "Split this operation into bounded units");
                }
                for (var entry : writes.entrySet()) {

                    var reference = firestore.document(entry.getKey());
                    if (entry.getValue() == DELETE) {

                        nativeTransaction.delete(reference);
                    }
                    else {

                        if (mapper.writeValueAsString(entry.getValue()).getBytes(StandardCharsets.UTF_8).length > 900_000) {

                            throw new CommandFailure(422, "DOCUMENT_TOO_LARGE", "Move growing data into child documents");
                        }
                        nativeTransaction.set(reference, mapper.convertValue(entry.getValue(), MAP));
                    }
                }
                return result;
            }).get(60, TimeUnit.SECONDS);
        }
        catch (Exception error) {

            Throwable cause = error;
            while (cause != null) {

                if (cause instanceof CommandFailure failure) {

                    throw failure;
                }
                cause = cause.getCause();
            }
            if (error instanceof InterruptedException) {

                Thread.currentThread().interrupt();
            }
            var failure = new CommandFailure(503, "COMMIT_OUTCOME_UNKNOWN",
                    "Retry with the same idempotency key; the outcome may be committed");
            failure.initCause(error);
            throw failure;
        }
    }

    @Override
    public <T> T get(DocumentKey<T> key) {

        return transaction(transaction -> transaction.get(key));
    }

    @Override
    public Page page(String collection, String afterId, int limit) {

        if (limit < 1 || limit > 100 || collection.split("/").length % 2 != 1) {

            throw new IllegalArgumentException("Expected a collection path and limit 1..100");
        }
        try {

            var query = firestore.collection(collection).orderBy(FieldPath.documentId());
            if (afterId != null) {

                query = query.startAfter(firestore.document(collection + "/" + afterId));
            }
            var documents = query.limit(limit + 1).get().get(30, TimeUnit.SECONDS).getDocuments();
            var paths = documents.stream().limit(limit).map(document -> document.getReference().getPath()).toList();
            String cursor = documents.size() > limit ? documents.get(limit - 1).getId() : null;
            return new Page(paths, cursor);
        }
        catch (Exception error) {

            if (error instanceof InterruptedException) {

                Thread.currentThread().interrupt();
            }
            throw new CommandFailure(503, "READ_UNAVAILABLE", "Unable to read the reconciliation page");
        }
    }
}
