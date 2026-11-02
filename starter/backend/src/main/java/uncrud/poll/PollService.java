package uncrud.poll;

import org.springframework.stereotype.Service;
import uncrud.core.CommandFailure;
import uncrud.core.CommandHandler;
import uncrud.core.CommandReceipt;
import uncrud.core.DocumentKey;
import uncrud.core.DocumentStore;
import uncrud.core.Identity;
import uncrud.core.Projection;
import uncrud.core.ProjectionMeta;
import uncrud.firestore.Idempotency;
import uncrud.firestore.ProjectionReconciler;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static uncrud.poll.PollModels.*;

@Service
public final class PollService implements CommandHandler<CastVote, CommandReceipt> {

    public static final int SCHEMA_VERSION = 1;
    public static final String SAMPLE_ID = "weekend";
    private final DocumentStore store;

    public PollService(DocumentStore store) {

        this.store = store;
    }

    public static DocumentKey<Poll> poll(String id) {

        requireId(id);
        return new DocumentKey<>("privatePolls/" + id, Poll.class);
    }

    public static DocumentKey<Vote> vote(String id, String uid) {

        return new DocumentKey<>(poll(id).path() + "/votes/" + new Identity(uid).uid(), Vote.class);
    }

    public static DocumentKey<PollView> view(String id) {

        requireId(id);
        return new DocumentKey<>("pollViews/" + id, PollView.class);
    }

    public static DocumentKey<VoteView> personalView(String id, String uid) {

        requireId(id);
        return new DocumentKey<>("userPollViews/" + new Identity(uid).uid() + "/polls/" + id, VoteView.class);
    }

    public static Projection<Poll, PollView> projector(String id) {

        return (read, source) -> new PollView(id, source.title(), source.options(), source.counts(),
                new ProjectionMeta(source.version(), SCHEMA_VERSION, source.updatedAt()));
    }

    public static Projection<Vote, VoteView> voteProjector() {

        return (read, source) -> new VoteView(source.optionId(),
                new ProjectionMeta(source.version(), SCHEMA_VERSION, source.updatedAt()));
    }

    @Override
    public CommandReceipt handle(Identity identity, CastVote command) {

        requireId(command.pollId());
        requireId(command.optionId());
        if (command.expectedVoteVersion() < 0) {

            throw new CommandFailure(400, "INVALID_VERSION", "Vote version must be nonnegative");
        }
        long now = System.currentTimeMillis();
        return store.transaction(transaction -> Idempotency.execute(transaction, identity, "vote:" + command.pollId(),
                command.commandId(), command.optionId() + ":" + command.expectedVoteVersion(), () -> {

                    Poll current = transaction.get(poll(command.pollId()));
                    Vote previous = transaction.get(vote(command.pollId(), identity.uid()));
                    if (current == null) {

                        throw new CommandFailure(404, "POLL_NOT_FOUND", "This poll does not exist");
                    }
                    if (!current.open()) {

                        throw new CommandFailure(403, "POLL_CLOSED", "Voting is closed");
                    }
                    if (current.options().stream().noneMatch(option -> option.id().equals(command.optionId()))) {

                        throw new CommandFailure(400, "INVALID_OPTION", "Choose an option from this poll");
                    }
                    long version = previous == null ? 0 : previous.version();
                    PollView existingView = transaction.get(view(command.pollId()));
                    VoteView existingPersonal = transaction.get(personalView(command.pollId(), identity.uid()));
                    if ((existingView != null && (existingView.meta().schemaVersion() > SCHEMA_VERSION
                            || existingView.meta().sourceVersion() > current.version()))
                            || (existingPersonal != null && (existingPersonal.meta().schemaVersion() > SCHEMA_VERSION
                                    || existingPersonal.meta().sourceVersion() > version))) {

                        throw new CommandFailure(409, "PROJECTION_AHEAD", "A newer projection exists; stop and verify server/schema versions");
                    }
                    if (version != command.expectedVoteVersion()) {

                        throw new CommandFailure(409, "VOTE_VERSION_CONFLICT", "Wait for your current vote, then submit a new command");
                    }
                    if (previous != null && previous.optionId().equals(command.optionId())) {

                        return receipt(command.commandId(), current.version(), previous.version());
                    }
                    var counts = new LinkedHashMap<>(current.counts());
                    if (previous != null) {

                        counts.compute(previous.optionId(), (key, count) -> count - 1);
                    }
                    counts.compute(command.optionId(), (key, count) -> count + 1);
                    var next = new Poll(current.title(), current.options(), Map.copyOf(counts), current.version() + 1, true, now);
                    var nextVote = new Vote(command.optionId(), version + 1, now);
                    PollView nextView = projector(command.pollId()).build(transaction, next);
                    VoteView nextPersonal = voteProjector().build(transaction, nextVote);
                    transaction.put(poll(command.pollId()), next);
                    transaction.put(vote(command.pollId(), identity.uid()), nextVote);
                    transaction.put(view(command.pollId()), nextView);
                    transaction.put(personalView(command.pollId(), identity.uid()), nextPersonal);
                    return receipt(command.commandId(), next.version(), nextVote.version());
                }));
    }

    private static CommandReceipt receipt(String id, long aggregate, long personal) {

        return new CommandReceipt(id, Map.of("poll", aggregate, "vote", personal));
    }

    public void seedLocal() {

        long now = System.currentTimeMillis();
        store.transaction(transaction -> {

            if (transaction.get(poll(SAMPLE_ID)) == null) {

                var sample = new Poll("How would you spend a free afternoon?",
                        List.of(new Option("outdoors", "Explore outdoors"), new Option("books", "Read a book"),
                                new Option("friends", "Meet friends")),
                        Map.of("outdoors", 0L, "books", 0L, "friends", 0L), 1, true, now);
                var projected = projector(SAMPLE_ID).build(transaction, sample);
                transaction.put(poll(SAMPLE_ID), sample);
                transaction.put(view(SAMPLE_ID), projected);
            }
            return null;
        });
    }

    public ProjectionReconciler.Status reconcilePoll(String id, boolean apply) {

        return new ProjectionReconciler(store).reconcile(poll(id), view(id), Poll::version,
                PollView::meta, SCHEMA_VERSION, projector(id), apply);
    }

    public ProjectionReconciler.Status reconcileVote(String id, String uid, boolean apply) {

        return new ProjectionReconciler(store).reconcile(vote(id, uid), personalView(id, uid), Vote::version,
                VoteView::meta, SCHEMA_VERSION, voteProjector(), apply);
    }

    private static void requireId(String id) {

        if (id == null || !id.matches("[a-z0-9][a-z0-9-]{0,63}")) {

            throw new CommandFailure(400, "INVALID_ID", "Use 1..64 lowercase letters, digits or hyphens");
        }
    }
}
