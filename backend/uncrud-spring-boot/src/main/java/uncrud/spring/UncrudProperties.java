package uncrud.spring;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

@ConfigurationProperties("uncrud")
public record UncrudProperties(String environment, String projectId, String databaseId, List<String> allowedOrigins) {

    public void validate(Map<String, String> variables) {

        if (projectId == null || databaseId == null || databaseId.isBlank() || databaseId.contains("/")) {

            throw new IllegalStateException("Configure uncrud.project-id and uncrud.database-id explicitly");
        }
        String auth = variables.get("FIREBASE_AUTH_EMULATOR_HOST");
        String firestore = variables.get("FIRESTORE_EMULATOR_HOST");
        if (local()) {

            if (!projectId.equals("demo-uncrud") || !loopback(auth) || !loopback(firestore)) {

                throw new IllegalStateException("Local mode requires demo-uncrud and both emulators on 127.0.0.1");
            }
        }
        else if (!List.of("dev", "prod").contains(environment == null ? "" : environment)
                || projectId.startsWith("demo-") || !projectId.matches("[a-z][a-z0-9-]{4,28}[a-z0-9]")
                || auth != null || firestore != null) {

            throw new IllegalStateException("Cloud mode requires dev/prod, an explicit real project, and no emulator variables");
        }
        if (allowedOrigins != null && allowedOrigins.stream().anyMatch(origin -> origin.equals("*"))) {

            throw new IllegalStateException("Use explicit CORS origins");
        }
    }

    public boolean local() {

        return "local".equals(environment);
    }

    private static boolean loopback(String host) {

        if (host == null || !host.matches("127\\.0\\.0\\.1:[0-9]{1,5}")) {

            return false;
        }
        int port = Integer.parseInt(host.substring(host.lastIndexOf(':') + 1));
        return port >= 1 && port <= 65535;
    }
}
