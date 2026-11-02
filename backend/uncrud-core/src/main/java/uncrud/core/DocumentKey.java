package uncrud.core;

/** Typed document address; collection names and schemas belong to the application. */
public record DocumentKey<T>(String path, Class<T> type) {

    public DocumentKey {

        if (path == null || !path.matches("[^/]+(/[^/]+)+") || path.split("/").length % 2 != 0 || type == null) {

            throw new IllegalArgumentException("Expected a document path and type");
        }
    }
}
