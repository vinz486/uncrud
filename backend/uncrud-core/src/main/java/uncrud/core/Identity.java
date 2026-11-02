package uncrud.core;

/** Construct only after verifying an app user's credentials. */
public record Identity(String uid) {

    public Identity {

        if (uid == null || uid.isBlank() || uid.length() > 128 || uid.contains("/")) {

            throw new IllegalArgumentException("Invalid user identity");
        }
    }
}
