package uncrud.poll;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uncrud.core.CommandReceipt;
import uncrud.spring.FirebaseIdentity;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public final class PollController {

    public record VoteRequest(@NotBlank @Size(max = 64) String optionId, @NotNull @Min(0) Long expectedVoteVersion) {}

    private final PollService service;
    private final FirebaseIdentity identity;

    public PollController(PollService service, FirebaseIdentity identity) {

        this.service = service;
        this.identity = identity;
    }

    @GetMapping("/health")
    public Map<String, String> health() {

        return Map.of("status", "UP");
    }

    @PostMapping("/polls/{pollId}/vote")
    public ResponseEntity<CommandReceipt> vote(@PathVariable String pollId, @Valid @RequestBody VoteRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "Idempotency-Key", required = false) String commandId) {

        var actor = identity.require(authorization);
        var receipt = service.handle(actor, new PollModels.CastVote(pollId, request.optionId(), request.expectedVoteVersion(), commandId));
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(receipt);
    }
}
