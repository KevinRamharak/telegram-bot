/**
 * @name ITelegramBotCommand
 */
interface ITelegramBotCommand {
    /**
     * command
     */
    command : string;
    /**
     * callback - should take TelegramApi.Message as its first parameter
     */
    callback : Function;
}

export default ITelegramBotCommand;