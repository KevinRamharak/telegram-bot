// simple helper to prevent boilerplate
import gracefullExit from "../src/modules/gracefull-exit";

// exec
import { exec, execSync } from "child_process";

// eval
import * as vm from "vm";
import * as util from "util";

// file system
import * as fs from "fs";
// http
import * as http from "http";

// Bot is used to create the bot
// Api contains type declarations used for the bot class
import { TelegramBot, TelegramApi } from "../src/classes/TelegramBot";

// need a token to send messages
// need a webhook url to enable webhook
// need a server object to create a server listening on specified port to create "on(<command>, callback)" events
let bot : TelegramBot = new TelegramBot({
    webhookUrl : "<PERSONAL_ENDPOINT>",
    token : "<BOT_TOKEN>",
    maxConnections : 5,
    server : {
        port : <PORT> // NOTE: Telegram only supports these ports 443, 80, 88, 8443. // I use Nginx to reroute my 'webhookUrl' to a localhost:<PORT>
    }
});

// <command> will respond to messages that start with "/<command>"
// bot.on('${<command>}', callback(message : TelegramApi.Message) {
//      // do whatever
// });
bot.on('echo', (message : TelegramApi.Message) => {
    bot.sendTextMessage(message.from.id, message.text.substring(6));
});

bot.on('exec', (message : TelegramApi.Message) => {
    let command = message.text.substring(6);

    exec(command, (error, stdout, stderr) => {
        let responseMessage = `<em>Command:</em> <b>${command}</b>\n`;

        if(error) {
            responseMessage += `<pre>${error.stack}</pre>\n`;
        }

        bot.sendHtmlMessage(message.from.id, responseMessage);

        let step = 4076;
        for(let i = 0; i < stdout.length; i += step) {
            bot.sendHtmlMessage(message.from.id, `stdout:\n<pre>${stdout.substring(i, i + step)}</pre>`);
        }
        for(let i = 0; i < stderr.length; i += step) {
            bot.sendHtmlMessage(message.from.id, `stderr:\n<pre>${stderr.substring(i, i + step)}</pre>`);
        }
    });
});

let sandbox = vm.createContext();

bot.on('eval', (message : TelegramApi.Message) => {
    let code = message.text.substring(6);

    let result : string;
    try {
        result = `<pre>${vm.runInContext(code, sandbox)}</pre>`;
    } catch (e) {
        result = `<pre>${e.message}</pre>`;
    }

    bot.sendHtmlMessage(message.from.id, `result: ${result}\n<pre>context: ${util.inspect(sandbox)}</pre>`);
});

interface Alarm {
    id : number;
    time : number;
    person : number;
    message : string;
}

interface Agenda {
    uniq : number;
    Alarms : Array<Alarm>;
    add(time : number, person : number, message : string) : number;
    remove(id : number) : void;
    format : RegExp;
}

let Agenda : Agenda = {
    uniq : 0,
    Alarms : [],
    add : function add(time : number, person : number, message : string, id : number | false = false) {
        if(id == false) {
            id = this.uniq++;
        }
        let alarm : Alarm = {
            id : id,
            person: person,
            time : time,
            message : message
        };
        this.Alarms.push(alarm);
        return id;
    },
    remove : function remove(id : number) {
        this.Alarms = this.Alarms.filter( (alarm : Alarm) => {
            return alarm.id != id;
        });
    },
    format : /(?:(?:(?:(0[1-9]|1[0-2]|[1-9]))-)?(?:(3[0-1]|[1-2][0-9]|0?[1-9])) )?((?:(?:[0-1][0-9])|(?:2[0-3]))):([0-5][0-9]) (.+)/m
};

bot.on('alarm', (message : TelegramApi.Message) => {
    let msg = message.text.substring(7);
    if(Agenda.format.test(msg)) {
        let matches : Array<string> = Agenda.format.exec(msg);

        let today = new Date(Date.now());

        let year = today.getFullYear();
        let month = (matches[1]) ? (parseInt(matches[1]) - 1) : today.getMonth();
        let day = parseInt(matches[2]) || today.getDate();
        let hour = parseInt(matches[3]);
        let minutes = parseInt(matches[4]);
        let seconds = today.getSeconds();
        let milliseconds = today.getMilliseconds();
        let text = matches[5];

        let date = new Date(year, month, day, hour, minutes, seconds, milliseconds);

        if(date.getTime() > today.getTime()) {
            let alarmId = Agenda.add(date.valueOf(), message.from.id, text);
            bot.sendHtmlMessage(message.from.id, `<pre>set alarm:\n${date.toString()}\nwith message:\n${text}\nalarm id: ${alarmId}</pre>`);
        } else {
            bot.sendHtmlMessage(message.from.id, `<pre>Error: Alarm cannot set alarm in the past</pre>`);
        }
    } else { console.error(message.text); }
});

bot.on('removeAlarm', (message : TelegramApi.Message) => {
    let Sid : string = message.text.substring(12);
    let Nid :number = parseInt(Sid);
    if(isNaN(Nid)) {
        bot.sendHtmlMessage(message.from.id, `${Sid} is not a valid number`);
    } else {
        let alarm = Agenda.Alarms.find((alarm : Alarm) => {
            return alarm.id === Nid;
        });
        if (alarm) {
            Agenda.remove(Nid);
            bot.sendHtmlMessage(message.from.id, `Remove alarm with id: ${Nid}\nand message: ${alarm.message}`);
        } else {
            bot.sendHtmlMessage(message.from.id, `Could not find an alarm with id: ${Nid}`);
        }
    }
});

let alarmChecker : NodeJS.Timer = setInterval( () => {
    if(Agenda.Alarms.length > 0) {
        let time = Date.now();
        let done : Array<number> = [];

        Agenda.Alarms.forEach((alarm : Alarm) => {
            if (time > alarm.time && time < alarm.time + 60000) {
                bot.sendHtmlMessage(alarm.person, `ALARM: ${alarm.message}`);
                done.push(alarm.id);
            }
        });

        done.forEach((id) => {
            Agenda.remove(id);
        });
    }
}, 1000);

const alarmSaveFile = "/srv/telegram-bot/config/alarm.save.json";

let saveAlarms = (message? : TelegramApi.Message) => {
    let success : boolean = true;
    try {
        fs.writeFileSync(alarmSaveFile, JSON.stringify(Agenda.Alarms), "utf8");
    } catch (e) {
        success = false;
        if(message) bot.sendHtmlMessage(message.from.id, `<pre>Error: ${e.stack}</pre>`);
    }
    if(success) {
        if(message) bot.sendTextMessage(message.from.id, "Saved successfully");
    }
};

let loadAlarms = (message? : TelegramApi.Message) => {
    let success : boolean = true;
    try {
        let content : string = fs.readFileSync(alarmSaveFile, "utf8");
        Agenda.Alarms = JSON.parse(content);
        Agenda.uniq = Agenda.Alarms.length;
    } catch (e) {
        success =  false;
        if(message) bot.sendHtmlMessage(message.from.id, `<pre>Error: ${e.stack}</pre>`);
    }
    if(success) {
        if(message) bot.sendTextMessage(message.from.id, "Loaded successfully")
    }
};

bot.on('saveAlarms', saveAlarms);

bot.on('loadAlarms', loadAlarms);

let serverRegex = /^\/server (create|kill) (\d{1,5})(?: (.*))?/m;

interface ServerBox {
    [port : number] : { server : http.Server, message : string };
}

let serverBox : ServerBox = {};

// this spawns a server that responds with an 'text/plain' document of whatever message you put in
// My server only supports ports 10.000 to 10.010
// you could always extend this to some sort of temporary file hosting
bot.on('server', (message : TelegramApi.Message) => {
    if(serverRegex.test(message.text)) {
        let matches = serverRegex.exec(message.text);
        let command = matches[1];
        let port = parseInt(matches[2]);
        let serverMessage = matches[3];

        if (port <= 1024 || port >= 49151) {
            bot.sendHtmlMessage(message.from.id, `<pre>Error: cannot create a server on port: ${port}</pre>`);
            return;
        }
        if (port <= 10000 || port > 10010) {
            bot.sendHtmlMessage(message.from.id, `<pre>Warning: any packets to any other port then 10001-10010 will be dropped by nginx\ngiven port: ${port}</pre>`);
        }

        switch(command) {
            case "create":
                if(serverBox[port]) {
                    bot.sendHtmlMessage(message.from.id, `<pre>Error: server is already running on that port with message: ${serverBox[port].message}</pre>`);
                } else {
                    let server = http.createServer((req, res) => {
                        res.writeHead(200, {
                            'Content-Type' : 'text/plain'
                        });
                        res.end(serverMessage);
                    });

                    server.listen(port, '0.0.0.0').once('error', (err : Error) => {
                        bot.sendHtmlMessage(message.from.id, `<pre>Error: Could not listen on port: ${port}\n${err.stack}</pre>`);
                    });

                    server.on('listening', () => {
                        serverBox[port] = {
                            message : serverMessage,
                            server : server
                        };

                        bot.sendHtmlMessage(message.from.id, `<pre>Succesfully created server with message: ${serverMessage}\non port: ${port}</pre>`);

                        server.on('error', (err : Error) => {
                            let msg = serverBox[port].message;
                            serverBox[port].server.close(() => {
                                delete serverBox[port];
                            });
                            bot.sendHtmlMessage(message.from.id, `<pre>Error: deleted port: ${port}\n with message: ${serverBox[port].message}\nbecause of emited error: ${err.stack}</pre>`)
                        });
                    });
                }
                return;
            case "kill":
                if(serverBox[port]) {
                    let msg = serverBox[port].message;
                    serverBox[port].server.close(() => {
                        delete serverBox[port];
                    });
                    bot.sendHtmlMessage(message.from.id, `<pre>Deleted http server on port: ${port}\n with message: ${msg}</pre>`)
                } else {
                    bot.sendHtmlMessage(message.from.id, `<pre>Error: there is no server running on that port: ${port}</pre>`);
                }
                return;
            default:
                bot.sendHtmlMessage(message.from.id, `<pre>Error: Not sure how you got here: ${command}</pre>`);
                return;
        }

    }
});

// load alarms once to preload any saved alarms
loadAlarms();

bot.on('test', (message : TelegramApi.Message) => {
    bot.sendHtmlMessage(message.from.id, `<pre>${JSON.stringify(message, null, 2)}</pre>`);
});

// i use this to send a message to myself every morning
// need https://www.devmanuals.net/install/ubuntu/ubuntu-12-04-lts-precise-pangolin/install-verse.html on your server to work
function sendVerse() {
    exec("verse", (error, stdout, stderr) => {
        if(error) return;
        if(stderr) return;
        if(stdout) {
            bot.sendHtmlMessage(<TELEGRAM_USER_ID>, `<pre>${stdout}</pre>`);
        }
    });
}

let verseSpammer : NodeJS.Timer = setInterval( () => {
    let date : Date = new Date();
    if(date.getHours() == 5) {
        sendVerse();
    }
}, 3400000);

bot.on('verse', (message : TelegramApi.Message) => {
    sendVerse();    
});

let helpRegex = /^\/help(?: (.+))?/m;

interface IHelpMessage {
    [message : string] : string;
}

let helpMessage : IHelpMessage = {
    help   : "/help [command]                          \n\t- show help [for command]",
    echo   : "/echo thing                              \n\t- echo the thing",
    exec   : "/exec command                            \n\t- execute command and print output",
    eval   : "/eval script                             \n\t- evaluate script",
    alarm  : "/alarm [month][-day] hour-minute message \n\t- set an alarm for [date and] time with message",
    server : "/server create|kill port [message]       \n\t- spawn a server that returns the given message",
    test   : "/test                                    \n\t- print the TelegramApi.Message object",
};

let getTotalHelpMessage = function getTotalHelpMessage() {
    let string : string = "";
    Object.keys(helpMessage).forEach((key) => {
        if(helpMessage.hasOwnProperty(key))
            if(key !== "join") string += helpMessage[key] + "\n";
    });
    return string;
};

bot.on('help', (message : TelegramApi.Message) => {
    if(helpRegex.test(message.text)) {
        let matches = helpRegex.exec(message.text);

        let specific : string | false = (matches.length == 2) ? matches[1] : false;
        let msg : string;

        if(specific) {
            msg = helpMessage[specific];
        } else {
            msg = getTotalHelpMessage();
        }
        bot.sendHtmlMessage(message.from.id, `<pre>${msg}</pre>`);
    }
});

// create functionality on the fly
// probably really buggy if not handled correctly
let listenerRegex = /\/listener ([a-zA-Z][a-z-A-Z0-9]+) (.+)/m;
bot.on('listener', (message : TelegramApi.Message) => {
    if(listenerRegex.test(message.text)) {
        let matches = listenerRegex.exec(message.text);

        let listener : string = matches[1];
        let body : string = matches[2];

        try {
            let func : Function = new Function("message", "bot", body);
            bot.on(listener, (message : TelegramApi.Message) => {
                func(message, bot).bind(this);
            });
            bot.sendTextMessage(message.from.id, `listener for ${listener} is registered`);
        } catch(error) {
            bot.sendHtmlMessage(message.from.id, `<pre>${error}</pre>`);
            return;
        }
    }
});

// this is to make sure the webhook is disabled correctly
gracefullExit(() => {
    saveAlarms();
    bot.destructor()
});
