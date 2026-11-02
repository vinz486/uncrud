package uncrud.core;

/** Pure builder. Read dependencies before staging writes; no external effects. */
@FunctionalInterface
public interface Projection<S, V> {

    V build(DocumentStore.ReadView read, S source);
}
