const defaults = {
    API_URL : "api.telegram.org",
    MAX_CONNECTIONS : 40
};

// node modules
import * as https from "https";
import * as http from "http";

// project interfaces
import ITelegramBotConfig from "../interfaces/ITelegramBotConfig";
import IWebhookOptions from "../interfaces/IWebhookOptions";
import ITelegramBotCommand from "../interfaces/ITelegramBotCommand";

// type declarations for the API
import TelegramApi from "../types/telegram-api";

/**
 * @name TelegramBot
 */
class TelegramBot {
    /**
     * the host of the Bot API url
     */
    private readonly apiHostname : string;

    /**
     * the path of the Bot API url
     */
    private readonly apiPath : string;

    /**
     * @default false
     * @type {boolean}
     */
    private webhookEnabled : boolean = false;

    /**
     *
     */
    private readonly webhookServer : http.Server;

    /**
     * array of bot commands with associated callbacks
     * @type {Array<ITelegramBotCommand>}
     */
    private listeners : Array<ITelegramBotCommand> = [];

    /**
     * makes the request to the Telegram API and catches the response. response is passed to callback if provided
     * @param {string} method
     * @param {} body?
     * @param {Function} callback?
     */
    private makeRequest(method : string, body? : any, callback? : Function) : void {
        // do some argument parsing
        body = (body) ? JSON.stringify(body) : "{}";

        // create the options field for http.request
        let options : https.RequestOptions = {
            hostname : this.apiHostname,
            port : 443,
            path : `${this.apiPath}/${method}`,
            method : "POST",
            headers : {
                "Content-Type" : "application/json",
                "Content-Length" : Buffer.byteLength(body)
            }
        };

        // create the client request
        let request : http.ClientRequest = https.request(options, (response : http.IncomingMessage) => {
            response.on('error', console.error);

            if(callback) {
                let responseBody : string = "";

                response.on('data', (data) => {
                    responseBody += data;
                });

                response.on('end', () => {
                    callback(responseBody);
                })
            }
        });

        // write the (JSON) body and end the request
        request.write(body);
        request.end();
    }

    private makeRequestWithFileAttached(method : string, body? : any, callback? : Function) : void {

        let options : https.RequestOptions = {
            hostname : this.apiHostname,
            port : 443,
            path : `${this.apiPath}/${method}`,
            method : "POST",
            headers : {
                "Content-Type" : "multipart/form-data",
                "Content-Length" : Buffer.byteLength("")
            }
        };

        let request : http.ClientRequest = https.request(options, (response : http.IncomingMessage) => {
            response.on('error', console.error);

            if(callback) {
                let responseBody : string = "";

                response.on('data', (data) => {
                    responseBody += data;
                });

                response.on('end', () => {
                    callback(responseBody);
                })
            }
        });
    }

    /**
     * sends a request to the Telegram API to start the webhook
     * @param {IWebhookOptions} options
     */
    private enableWebhook(options : IWebhookOptions) : void {
        this.makeRequest("setWebhook", options);
    }

    /**
     * sends a request to the Telegram API to stop the webhook
     */
    private disableWebhook() : void {
        this.makeRequest("deleteWebhook", undefined);
    }

    /**
     * @constructor
     * @param {ITelegramBotConfig} config
     */
    constructor(config : ITelegramBotConfig) {
        this.apiHostname = config.apiUrl || defaults.API_URL;
        this.apiPath = `/bot${config.token}`;

        if(config.webhookUrl) {
            this.webhookEnabled = true;
            this.enableWebhook({
                "url" : config.webhookUrl,
                "max_connections" : config.maxConnections || defaults.MAX_CONNECTIONS
            });
        }

        if(config.server) {
            this.webhookServer = http.createServer((request, response) => {
                let body : string = "";

                request.on('data', (data) => {
                    body += data;
                });

                request.on('end', () => {
                    let update : TelegramApi.Update = JSON.parse(body);

                    if(update.message && update.message.entities) {
                        let botCommand = update.message.entities.find((entity : TelegramApi.MessageEntity) => {
                            return entity.type == "bot_command";
                        });

                        if(botCommand) {
                            let command = update.message.text.substring(botCommand.offset + 1, botCommand.length);

                            this.listeners.forEach((listener : ITelegramBotCommand) => {
                                if (listener.command == command) {
                                    listener.callback(update.message);
                                }
                            });
                        }
                    }
                });

                response.statusCode = 200;
                response.end();
            });
            this.webhookServer.listen(config.server.port, '127.0.0.1');
        }
    }

    /**
     * custom destructor
     */
    public destructor() : void {
        // close any interactive conversation
        // close any pending operations
        if(this.webhookEnabled) this.disableWebhook();
    }

    /**
     * send a text message
     * @param {number} id
     * @param {string} message
     */
    public sendTextMessage(id : number, message : string) : void {
        this.makeRequest("sendMessage", {
            chat_id : id,
            text : message
        });
    }

    /**
     * send a markdown message
     * @param {number} id
     * @param {string} message
     */
    public sendMarkdownMessage(id : number, message : string) : void {
        this.makeRequest("sendMessage", {
            chat_id : id,
            text : message,
            parse_mode : "Markdown"
        });
    }

    /**
     * send a html message
     * @param id
     * @param message
     */
    public sendHtmlMessage(id : number, message : string) : void {
        this.makeRequest("sendMessage", {
            chat_id : id,
            text : message,
            parse_mode : "HTML"
        });
    }

    public sendAudioFile(id : number, file) : void {

    }

    /**
     * Add a listener
     * @param {string} command
     * @param {Function} callback
     */
    public on(command : string, callback : Function) : void {
        this.listeners.push({
            command : command,
            callback : callback
        });
    }
}

export { TelegramBot, TelegramApi };
