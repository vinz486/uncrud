package uncrud.core;

/** updatedAt is epoch milliseconds, not a global ordering guarantee. */
public record ProjectionMeta(long sourceVersion, int schemaVersion, long updatedAt) {

    public ProjectionMeta {

        if (sourceVersion < 0 || schemaVersion < 1 || updatedAt < 0) {

            throw new IllegalArgumentException("Invalid projection metadata");
        }
    }
}
