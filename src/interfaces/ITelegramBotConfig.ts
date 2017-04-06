interface ITelegramBotConfig {
    apiUrl? : string,
    webhookUrl? : string,
    token : string,
    maxConnections? : number,
    server? : {
        port : number
    }
}

export default ITelegramBotConfig;