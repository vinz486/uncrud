package uncrud.spring;

import org.junit.jupiter.api.Test;
import uncrud.core.CommandFailure;
import uncrud.core.Identity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuthenticationTest {

    @Test
    void shouldRequireBearerTokensAndPropagateVerificationFailure() {

        // Arrange
        var gate = new FirebaseIdentity(token -> {

            if (!token.equals("valid")) {

                throw new CommandFailure(401, "INVALID_TOKEN", "Invalid session");
            }
            return new Identity("verified-user");
        });

        // Act
        var viewer = gate.require("Bearer valid");
        var missing = assertThrows(CommandFailure.class, () -> gate.require(null));
        var expired = assertThrows(CommandFailure.class, () -> gate.require("Bearer expired"));

        // Assert
        assertEquals("verified-user", viewer.uid());
        assertEquals(401, missing.status());
        assertEquals(401, expired.status());
    }

    @Test
    void shouldRefusePartialEmulationAndCloudEmulatorMixes() {

        // Arrange
        var local = new UncrudProperties("local", "demo-uncrud", "(default)", List.of());
        var cloud = new UncrudProperties("prod", "example-project-id", "(default)", List.of());
        var emulators = Map.of("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9199", "FIRESTORE_EMULATOR_HOST", "127.0.0.1:8180");

        // Act / Assert
        assertDoesNotThrow(() -> local.validate(emulators));
        assertDoesNotThrow(() -> cloud.validate(Map.of()));
        assertThrows(IllegalStateException.class, () -> local.validate(Map.of()));
        assertThrows(IllegalStateException.class, () -> cloud.validate(emulators));
        assertThrows(IllegalStateException.class, () -> local.validate(Map.of(
                "FIREBASE_AUTH_EMULATOR_HOST", "remote.invalid:9199", "FIRESTORE_EMULATOR_HOST", "127.0.0.1:8180")));
    }
}
