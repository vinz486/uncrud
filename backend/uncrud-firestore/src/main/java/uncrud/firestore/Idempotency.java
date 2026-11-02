package uncrud.firestore;

import uncrud.core.CommandFailure;
import uncrud.core.CommandReceipt;
import uncrud.core.DocumentKey;
import uncrud.core.DocumentStore;
import uncrud.core.Identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.function.Supplier;

public final class Idempotency {

    public record Saved(String payloadHash, CommandReceipt receipt) {}

    private Idempotency() {}

    public static CommandReceipt execute(DocumentStore.Transaction transaction, Identity identity, String operation,
            String key, String canonicalPayload, Supplier<CommandReceipt> work) {

        if (key == null || !key.matches("[A-Za-z0-9_-]{8,128}")) {

            throw new CommandFailure(400, "INVALID_COMMAND_ID", "Idempotency-Key must contain 8..128 safe characters");
        }
        var document = new DocumentKey<>("privateCommands/" + digest(identity.uid()) + "/receipts/" + digest(operation + "\n" + key),
                Saved.class);
        String hash = digest(canonicalPayload);
        Saved previous = transaction.get(document);
        if (previous != null) {

            if (!previous.payloadHash().equals(hash)) {

                throw new CommandFailure(409, "IDEMPOTENCY_CONFLICT", "This key was already used for a different payload");
            }
            return previous.receipt();
        }
        CommandReceipt receipt = work.get();
        transaction.put(document, new Saved(hash, receipt));
        return receipt;
    }

    public static String digest(String text) {

        try {

            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        }
        catch (NoSuchAlgorithmException error) {

            throw new IllegalStateException(error);
        }
    }
}
