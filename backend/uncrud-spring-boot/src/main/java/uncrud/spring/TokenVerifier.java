package uncrud.spring;

import uncrud.core.Identity;

/** Injectable boundary for Firebase ID tokens (not Cloud Run IAM tokens). */
@FunctionalInterface
public interface TokenVerifier {

    Identity verify(String idToken);
}
