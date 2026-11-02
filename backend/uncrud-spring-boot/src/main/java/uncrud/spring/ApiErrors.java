package uncrud.spring;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import uncrud.core.CommandFailure;

@RestControllerAdvice
public class ApiErrors {

    public record Problem(String code, String message) {}

    @ExceptionHandler(CommandFailure.class)
    ResponseEntity<Problem> command(CommandFailure error) {

        return ResponseEntity.status(error.status()).header("Cache-Control", "no-store")
                .body(new Problem(error.code(), error.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<Problem> invalid(Exception error) {

        return ResponseEntity.badRequest().header("Cache-Control", "no-store")
                .body(new Problem("INVALID_INPUT", "Check the command fields and identifiers"));
    }
}
