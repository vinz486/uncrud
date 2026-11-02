package uncrud.core;

@FunctionalInterface
public interface CommandHandler<C extends Command<R>, R> {

    R handle(Identity identity, C command);
}
