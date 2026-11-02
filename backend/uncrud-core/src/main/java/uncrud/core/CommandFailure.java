package uncrud.core;

public final class CommandFailure extends RuntimeException {

    private final String code;
    private final int status;

    public CommandFailure(int status, String code, String message) {

        super(message);
        this.status = status;
        this.code = code;
    }

    public String code() {

        return code;
    }

    public int status() {

        return status;
    }
}
