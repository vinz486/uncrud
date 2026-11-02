package uncrud.poll;

import org.junit.jupiter.api.Test;
import uncrud.core.*;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static uncrud.poll.PollModels.*;

class PollServiceTest {

    private static final String POLL = PollService.SAMPLE_ID;
    private static final Identity ALICE = new Identity("alice");

    @Test
    void shouldChangeOneVoteAndReturnTheSameReceiptOnRetry() {

        // Arrange
        var store = new MemoryStore();
        var service = new PollService(store);
        service.seedLocal();
        var first = new CastVote(POLL, "books", 0, "command-first");

        // Act
        var receipt = service.handle(ALICE, first);
        var duplicate = service.handle(ALICE, first);
        service.handle(ALICE, new CastVote(POLL, "friends", 1, "command-second"));

        // Assert
        assertEquals(receipt, duplicate);
        assertEquals(Map.of("books", 0L, "friends", 1L, "outdoors", 0L), store.get(PollService.poll(POLL)).counts());
        assertEquals("friends", store.get(PollService.personalView(POLL, ALICE.uid())).optionId());
    }

    @Test
    void shouldRejectOldIntentAndReusedKeysWithoutChangingState() {

        // Arrange
        var store = new MemoryStore();
        var service = new PollService(store);
        service.seedLocal();
        service.handle(ALICE, new CastVote(POLL, "books", 0, "command-first"));

        // Act
        var old = assertThrows(CommandFailure.class,
                () -> service.handle(ALICE, new CastVote(POLL, "friends", 0, "command-stale")));
        var reused = assertThrows(CommandFailure.class,
                () -> service.handle(ALICE, new CastVote(POLL, "friends", 1, "command-first")));

        // Assert
        assertEquals("VOTE_VERSION_CONFLICT", old.code());
        assertEquals("IDEMPOTENCY_CONFLICT", reused.code());
        assertEquals(1L, store.get(PollService.poll(POLL)).counts().get("books"));
    }

    @Test
    void shouldKeepOtherUsersIndependentAndAvoidNoOpVersionIncrements() {

        // Arrange
        var store = new MemoryStore();
        var service = new PollService(store);
        service.seedLocal();
        service.handle(ALICE, new CastVote(POLL, "books", 0, "command-first"));

        // Act
        service.handle(new Identity("bob"), new CastVote(POLL, "friends", 0, "command-bob"));
        var receipt = service.handle(ALICE, new CastVote(POLL, "books", 1, "command-noop"));

        // Assert
        assertEquals(1L, receipt.versions().get("vote"));
        assertEquals(3L, receipt.versions().get("poll"));
    }

    @Test
    void shouldRejectClosedPollsAndUnknownOptions() {

        // Arrange
        var store = new MemoryStore();
        var service = new PollService(store);
        service.seedLocal();
        var source = store.get(PollService.poll(POLL));

        // Act
        var invalid = assertThrows(CommandFailure.class,
                () -> service.handle(ALICE, new CastVote(POLL, "invalid", 0, "command-invalid")));
        store.transaction(transaction -> {

            transaction.put(PollService.poll(POLL), new Poll(source.title(), source.options(), source.counts(), 2, false, 1));
            return null;
        });
        var closed = assertThrows(CommandFailure.class,
                () -> service.handle(ALICE, new CastVote(POLL, "books", 0, "command-closed")));

        // Assert
        assertEquals(400, invalid.status());
        assertEquals(403, closed.status());
        assertNull(store.get(PollService.vote(POLL, ALICE.uid())));
    }

    private static final class MemoryStore implements DocumentStore {

        private Map<String, Object> documents = new HashMap<>();

        public synchronized <R> R transaction(Function<Transaction, R> work) {

            var staged = new HashMap<>(documents);
            R result = work.apply(new Transaction() {

                public <T> T get(DocumentKey<T> key) {

                    return key.type().cast(staged.get(key.path()));
                }

                public <T> void put(DocumentKey<T> key, T value) {

                    staged.put(key.path(), value);
                }

                public void delete(DocumentKey<?> key) {

                    staged.remove(key.path());
                }
            });
            documents = staged;
            return result;
        }

        public <T> T get(DocumentKey<T> key) {

            return key.type().cast(documents.get(key.path()));
        }

        public Page page(String collection, String afterId, int limit) {

            throw new UnsupportedOperationException("Not needed by these domain tests");
        }
    }
}
