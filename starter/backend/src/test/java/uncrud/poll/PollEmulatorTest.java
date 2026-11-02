package uncrud.poll;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.ObjectMapper;
import uncrud.core.*;
import uncrud.firestore.ProjectionReconciler;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;
import static uncrud.poll.PollModels.*;

@Tag("emulator")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PollEmulatorTest {

    @Autowired DocumentStore store;
    @Autowired PollService service;
    @Autowired FirebaseApp firebaseApp;
    @LocalServerPort int port;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newHttpClient();

    private String fixture() {

        String id = "test-" + UUID.randomUUID();
        store.transaction(transaction -> {

            var poll = new Poll("Test poll", List.of(new Option("yes", "Yes"), new Option("no", "No")),
                    Map.of("yes", 0L, "no", 0L), 1, true, 1);
            transaction.put(PollService.poll(id), poll);
            transaction.put(PollService.view(id), PollService.projector(id).build(transaction, poll));
            return null;
        });
        return id;
    }

    @Test
    void shouldCommitConcurrentVotesAndDeduplicateConcurrentRetries() throws Exception {

        // Arrange
        String id = fixture();
        var actor = new Identity("race-user");
        var command = new CastVote(id, "yes", 0, "concurrent-command");

        // Act
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {

            var first = pool.submit(() -> service.handle(actor, command));
            var second = pool.submit(() -> service.handle(actor, command));
            assertEquals(first.get(), second.get());
            var third = pool.submit(() -> service.handle(new Identity("second-user"), new CastVote(id, "yes", 0, "second-command")));
            var fourth = pool.submit(() -> service.handle(new Identity("third-user"), new CastVote(id, "no", 0, "third-command")));
            third.get();
            fourth.get();
        }

        // Assert
        Poll source = store.get(PollService.poll(id));
        assertEquals(Map.of("yes", 2L, "no", 1L), source.counts());
        assertEquals(source.counts(), store.get(PollService.view(id)).counts());
        assertEquals(source.version(), store.get(PollService.view(id)).meta().sourceVersion());
    }

    @Test
    void shouldRollbackAllWritesAndRebuildOnlyFromPrivateState() {

        // Arrange
        String id = fixture();
        var actor = new Identity("rebuild-user");
        service.handle(actor, new CastVote(id, "yes", 0, "before-rebuild"));

        // Act
        assertThrows(CommandFailure.class, () -> store.transaction(transaction -> {

            transaction.delete(PollService.poll(id));
            transaction.delete(PollService.view(id));
            throw new CommandFailure(422, "TEST_ROLLBACK", "Abort before flush");
        }));
        store.transaction(transaction -> {

            transaction.delete(PollService.view(id));
            transaction.delete(PollService.personalView(id, actor.uid()));
            return null;
        });
        var diagnostic = service.reconcilePoll(id, false);
        assertNull(store.get(PollService.view(id)));
        service.reconcilePoll(id, true);
        service.reconcileVote(id, actor.uid(), true);

        // Assert
        assertEquals(ProjectionReconciler.Status.MISSING, diagnostic);
        assertEquals(1L, store.get(PollService.view(id)).counts().get("yes"));
        assertEquals("yes", store.get(PollService.personalView(id, actor.uid())).optionId());
        assertEquals(ProjectionReconciler.Status.CURRENT, service.reconcilePoll(id, true));
    }

    @Test
    void shouldPaginateWithoutDuplicatesAndRefuseProjectionDowngrades() {

        // Arrange
        String id = fixture();
        store.transaction(transaction -> {

            var current = transaction.get(PollService.view(id));
            transaction.put(PollService.view(id), new PollView(current.id(), current.title(), current.options(), current.counts(),
                    new ProjectionMeta(999, 2, 1)));
            return null;
        });

        // Act
        var first = store.page("privatePolls", null, 1);
        var second = store.page("privatePolls", first.nextCursor(), 1);
        var status = service.reconcilePoll(id, true);

        // Assert
        assertNotNull(first.nextCursor());
        assertNotEquals(first.paths(), second.paths());
        assertEquals(ProjectionReconciler.Status.AHEAD, status);
        assertEquals(2, store.get(PollService.view(id)).meta().schemaVersion());
        var downgrade = assertThrows(CommandFailure.class,
                () -> service.handle(new Identity("old-writer"), new CastVote(id, "yes", 0, "old-writer-command")));
        assertEquals("PROJECTION_AHEAD", downgrade.code());
    }

    @Test
    void shouldRepairStaleMetadataAndDeleteAnExplicitlyLocatedOrphan() {

        // Arrange
        String id = fixture();
        store.transaction(transaction -> {

            var current = transaction.get(PollService.view(id));
            transaction.put(PollService.view(id), new PollView(current.id(), current.title(), current.options(), current.counts(),
                    new ProjectionMeta(0, 1, 0)));
            return null;
        });

        // Act
        var stale = service.reconcilePoll(id, true);
        store.transaction(transaction -> {

            transaction.delete(PollService.poll(id));
            return null;
        });
        var orphan = service.reconcilePoll(id, true);

        // Assert
        assertEquals(ProjectionReconciler.Status.STALE, stale);
        assertEquals(ProjectionReconciler.Status.ORPHANED, orphan);
        assertNull(store.get(PollService.view(id)));
    }

    @Test
    void shouldVerifyRealEmulatorTokensRejectInvalidSessionsAndAuthorizeCommands() throws Exception {

        // Arrange
        String id = fixture();
        var signup = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"returnSecureToken\":true}")).build();
        var session = mapper.readTree(http.send(signup, HttpResponse.BodyHandlers.ofString()).body());
        String token = session.get("idToken").asText();
        String uid = session.get("localId").asText();
        String payload = "{\"optionId\":\"yes\",\"expectedVoteVersion\":0}";

        // Act / Assert
        assertEquals(401, post(id, payload, null, "missing-token").statusCode());
        assertEquals(401, post(id, payload, "not-a-jwt", "invalid-token").statusCode());
        String[] parts = token.split("\\.", -1);
        var claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1])).deepCopy();
        ((tools.jackson.databind.node.ObjectNode) claims).put("exp", 1);
        String expired = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mapper.writeValueAsString(claims).getBytes(StandardCharsets.UTF_8)) + ".";
        assertEquals(401, post(id, payload, expired, "expired-token").statusCode());
        ((tools.jackson.databind.node.ObjectNode) claims).put("exp", System.currentTimeMillis() / 1000 + 3600).put("aud", "different-project");
        String wrongProject = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mapper.writeValueAsString(claims).getBytes(StandardCharsets.UTF_8)) + ".";
        assertEquals(401, post(id, payload, wrongProject, "wrong-project").statusCode());
        var success = post(id, payload, token, "valid-command");
        assertEquals(200, success.statusCode(), success.body());
        assertEquals(success.body(), post(id, payload, token, "valid-command").body());
        assertEquals(409, post(id, payload, token, "stale-command").statusCode());
        assertEquals(400, post(id, "{\"optionId\":\"no\",\"expectedVoteVersion\":-1}", token, "bad-input").statusCode());
        store.transaction(transaction -> {

            Poll current = transaction.get(PollService.poll(id));
            transaction.put(PollService.poll(id), new Poll(current.title(), current.options(), current.counts(), current.version(), false, 1));
            return null;
        });
        assertEquals(403, post(id, "{\"optionId\":\"no\",\"expectedVoteVersion\":1}", token, "closed-poll").statusCode());
        FirebaseAuth.getInstance(firebaseApp).updateUser(new com.google.firebase.auth.UserRecord.UpdateRequest(uid).setDisabled(true));
        assertEquals(401, post(id, payload, token, "disabled-user").statusCode());
    }

    private HttpResponse<String> post(String id, String body, String token, String key) throws Exception {

        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/polls/" + id + "/vote"))
                .header("Content-Type", "application/json").header("Idempotency-Key", key);
        if (token != null) {

            request.header("Authorization", "Bearer " + token);
        }
        return http.send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void shouldKeepOperatorDiagnosisReadOnlyWithoutSeedingMissingData() {

        // Arrange
        fixture();
        Poll original = store.get(PollService.poll(PollService.SAMPLE_ID));
        store.transaction(transaction -> {

            transaction.delete(PollService.poll(PollService.SAMPLE_ID));
            return null;
        });

        // Act
        try {

            Reconcile.main(new String[] {"--project=demo-uncrud"});

            // Assert
            assertNull(store.get(PollService.poll(PollService.SAMPLE_ID)), "Diagnostic startup must not seed or repair data");
        }
        finally {

            if (original != null) {

                store.transaction(transaction -> {

                    transaction.put(PollService.poll(PollService.SAMPLE_ID), original);
                    return null;
                });
            }
        }
    }
}
