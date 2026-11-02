package uncrud.core;

import java.util.Map;

/** Confirmation of commit, never a replacement read model. */
public record CommandReceipt(String commandId, Map<String, Long> versions) {

    public CommandReceipt {

        versions = Map.copyOf(versions);
    }
}
