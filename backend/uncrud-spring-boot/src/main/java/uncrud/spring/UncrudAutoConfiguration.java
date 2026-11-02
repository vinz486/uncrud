package uncrud.spring;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import uncrud.core.CommandFailure;
import uncrud.core.DocumentStore;
import uncrud.core.Identity;
import uncrud.firestore.FirestoreDocumentStore;

import java.io.IOException;
import java.util.Date;
import java.util.UUID;

@AutoConfiguration
@EnableConfigurationProperties(UncrudProperties.class)
@Import(ApiErrors.class)
public class UncrudAutoConfiguration {

    @Bean
    GoogleCredentials uncrudCredentials(UncrudProperties properties) throws IOException {

        properties.validate(System.getenv());
        return properties.local()
                ? GoogleCredentials.create(new AccessToken("emulator-only", new Date(Long.MAX_VALUE)))
                : GoogleCredentials.getApplicationDefault();
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean(Firestore.class)
    Firestore uncrudFirestore(UncrudProperties properties, GoogleCredentials credentials) {

        var builder = FirestoreOptions.newBuilder().setProjectId(properties.projectId())
                .setDatabaseId(properties.databaseId()).setCredentials(credentials);
        if (properties.local()) {

            builder.setEmulatorHost(System.getenv("FIRESTORE_EMULATOR_HOST"));
        }
        return builder.build().getService();
    }

    @Bean(destroyMethod = "delete")
    FirebaseApp uncrudFirebaseApp(UncrudProperties properties, GoogleCredentials credentials) {

        return FirebaseApp.initializeApp(FirebaseOptions.builder().setProjectId(properties.projectId())
                .setCredentials(credentials).build(), "uncrud-" + UUID.randomUUID());
    }

    @Bean
    @ConditionalOnMissingBean(TokenVerifier.class)
    TokenVerifier uncrudTokenVerifier(FirebaseApp app) {

        return token -> {

            try {

                return new Identity(FirebaseAuth.getInstance(app).verifyIdToken(token, true).getUid());
            }
            catch (FirebaseAuthException | IllegalArgumentException error) {

                throw new CommandFailure(401, "INVALID_TOKEN", "The Firebase session is invalid or expired; sign in again");
            }
        };
    }

    @Bean
    FirebaseIdentity uncrudIdentity(TokenVerifier verifier) {

        return new FirebaseIdentity(verifier);
    }

    @Bean
    @ConditionalOnMissingBean(DocumentStore.class)
    DocumentStore uncrudDocumentStore(Firestore firestore) {

        return new FirestoreDocumentStore(firestore);
    }

    @Bean
    WebMvcConfigurer uncrudCors(UncrudProperties properties) {

        return new WebMvcConfigurer() {

            @Override
            public void addCorsMappings(CorsRegistry registry) {

                if (properties.allowedOrigins() != null && !properties.allowedOrigins().isEmpty()) {

                    registry.addMapping("/api/**").allowedOrigins(properties.allowedOrigins().toArray(String[]::new))
                            .allowedMethods("POST", "GET", "OPTIONS")
                            .allowedHeaders("Authorization", "Content-Type", "Idempotency-Key").maxAge(600);
                }
            }
        };
    }
}
