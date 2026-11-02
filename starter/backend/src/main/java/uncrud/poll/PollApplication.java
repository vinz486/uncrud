package uncrud.poll;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import uncrud.spring.UncrudProperties;

@SpringBootApplication
public class PollApplication {

    public static void main(String[] args) {

        SpringApplication.run(PollApplication.class, args);
    }

    @Bean
    @ConditionalOnProperty(name = "uncrud.seed-local", havingValue = "true", matchIfMissing = true)
    ApplicationRunner localSeed(UncrudProperties properties, PollService service) {

        return args -> {

            if (properties.local()) {

                service.seedLocal();
            }
        };
    }
}
