require('dotenv').config();
const { Client } = require('pg');
const { Telegraf } = require('telegraf');
const Tgbot = require('./modules/tgbot');

const db = new Client();
const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot(db);

// Log user details to db when bot is started by new user.
bot.start((ctx)=>{
    ctx.reply('hello');
})

bot.command('get',(ctx)=>{
    bot.telegram.getChat('@telegram').then(res=>{console.log(res)});
})
bot.on('text', async (ctx)=>{
    var text = ctx.message.text;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        if(match && match.length === 4){
            let chatDetails = await tgbot.scrapChat(match[3]);
            if(!chatDetails){
                bot.telegram.getChat('@'+match[3])
                .then(res=>{
                    ctx.reply(res);
                })
                .catch(err=>{
                    ctx.reply('Chat not found!');
                })
            }else{
                ctx.reply(chatDetails)
            }
            return true;
        }

        //-----check for username-----//
        match = text.match(/@([0-9a-zA-Z-_]*)/);
        if(match && match.length == 2){
            ctx.reply(match[1]);
            return true;
        }

        //-----default error message------//
        ctx.reply('Unknown command. Send /help to see the list of available commands');

    } catch (error) {
        bot.telegram.sendMessage(process.env.BOT_ADMIN, text + '; Err: ' + error.message);
    }
})

bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));