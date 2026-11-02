package uncrud.poll;

import uncrud.core.Command;
import uncrud.core.CommandReceipt;
import uncrud.core.ProjectionMeta;

import java.util.List;
import java.util.Map;

public final class PollModels {

    public record Option(String id, String label) {}

    public record Poll(String title, List<Option> options, Map<String, Long> counts, long version, boolean open, long updatedAt) {}

    public record Vote(String optionId, long version, long updatedAt) {}

    public record PollView(String id, String title, List<Option> options, Map<String, Long> counts, ProjectionMeta meta) {}

    public record VoteView(String optionId, ProjectionMeta meta) {}

    public record CastVote(String pollId, String optionId, long expectedVoteVersion, String commandId) implements Command<CommandReceipt> {}

    private PollModels() {}
}
