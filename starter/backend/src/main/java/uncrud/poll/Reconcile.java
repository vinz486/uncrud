package uncrud.poll;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import uncrud.core.DocumentStore;

import java.util.Arrays;

/** Local operator tool. Never an HTTP endpoint and never enabled implicitly in cloud. */
public final class Reconcile {

    private Reconcile() {}

    public static void main(String[] args) {

        var arguments = Arrays.asList(args);
        if (!arguments.contains("--project=demo-uncrud")
                || !"local".equals(System.getenv().getOrDefault("UNCRUD_ENV", "local"))
                || arguments.stream().anyMatch(argument -> !java.util.Set.of("--project=demo-uncrud", "--apply").contains(argument))) {

            throw new IllegalArgumentException("Local only: --project=demo-uncrud [--apply]; default is diagnostic");
        }
        boolean apply = arguments.contains("--apply");
        try (var context = new SpringApplicationBuilder(PollApplication.class).web(WebApplicationType.NONE)
                .run("--uncrud.seed-local=false")) {

            var store = context.getBean(DocumentStore.class);
            var service = context.getBean(PollService.class);
            String cursor = null;
            do {

                var page = store.page("privatePolls", cursor, 25);
                for (String path : page.paths()) {

                    String id = path.substring(path.lastIndexOf('/') + 1);
                    System.out.println(id + ": " + service.reconcilePoll(id, apply));
                    String voteCursor = null;
                    do {

                        var votes = store.page(path + "/votes", voteCursor, 25);
                        for (String vote : votes.paths()) {

                            String uid = vote.substring(vote.lastIndexOf('/') + 1);
                            System.out.println("personal view: " + service.reconcileVote(id, uid, apply));
                        }
                        voteCursor = votes.nextCursor();
                    } while (voteCursor != null);
                }
                cursor = page.nextCursor();
            } while (cursor != null);
        }
    }
}
