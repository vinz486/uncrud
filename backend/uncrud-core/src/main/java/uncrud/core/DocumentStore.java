package uncrud.core;

import java.util.List;
import java.util.function.Function;

public interface DocumentStore {

    interface ReadView {

        <T> T get(DocumentKey<T> key);
    }

    interface Transaction extends ReadView {

        <T> void put(DocumentKey<T> key, T value);

        void delete(DocumentKey<?> key);
    }

    record Page(List<String> paths, String nextCursor) {

        public Page {

            paths = List.copyOf(paths);
        }
    }

    <R> R transaction(Function<Transaction, R> work);

    <T> T get(DocumentKey<T> key);

    Page page(String collection, String afterId, int limit);
}
