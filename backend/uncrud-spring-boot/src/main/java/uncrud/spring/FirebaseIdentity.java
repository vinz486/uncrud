package uncrud.spring;

import uncrud.core.CommandFailure;
import uncrud.core.Identity;

public final class FirebaseIdentity {

    private final TokenVerifier verifier;

    public FirebaseIdentity(TokenVerifier verifier) {

        this.verifier = verifier;
    }

    public Identity require(String authorization) {

        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() > 16_384
                || authorization.substring(7).isBlank()) {

            throw new CommandFailure(401, "AUTH_REQUIRED", "Sign in before sending this command");
        }
        return verifier.verify(authorization.substring(7));
    }
}
