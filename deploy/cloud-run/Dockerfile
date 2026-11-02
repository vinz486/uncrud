# Build locally with: ./gradlew :starter:backend:bootJar
# Then: docker build -f deploy/cloud-run/Dockerfile -t uncrud-local .
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY starter/backend/build/libs/backend-0.1.0-SNAPSHOT.jar /app/application.jar
USER 10001:10001
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/application.jar"]
