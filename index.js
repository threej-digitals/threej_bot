require('dotenv').config();
const { default: axios } = require('axios');
const { Telegraf } = require('telegraf');
const Tgbot = require('./modules/tgbot');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();

// Log user details to DB when bot is started by new user.
bot.start((ctx)=>{
    tgbot.logUser(ctx.from.id);
    ctx.reply('hello');
})

bot.on('text', async (ctx)=>{
    var text = ctx.message.text;
    var username = false;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        if(!username){
            //-----Check for username-----//
            match = text.match(/@([0-9a-zA-Z-_]*)/);
            if(match && match.length == 2){
                username = match[1];
            }
        }
        
        if(username){
            //-----Scrap chat details from telegram website----------//
            let chatDetails = await tgbot.scrapChat(username);
            
            //-----If unable to scrap chat details request it from telegram api-----//
            if(!chatDetails){
                try {
                    const result = await bot.telegram.getChat('@'+username);
                    
                    chatDetails = tgbot.chatDetails;
                    chatDetails['id'] = result.id;
                    chatDetails['title'] = result.title;
                    chatDetails['description'] = result.description;
                    chatDetails['username'] = result.username || '';

                    chatDetails['subscribers'] = await bot.telegram.getChatMembersCount(result.id);
                    
                    const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
                    // Download profile pic and store it in server
                    chatDetails['photo'] = await tgbot.saveRemoteFile(fileLink.href, 'assets/img/','chat'+result.id) || '';
                } catch (error) {
                    tgbot.logError(error)
                    ctx.reply('Chat not found!');
                    return true;
                }
            }
            //-----Store chat details to DB------//
            const response = await tgbot.newChat(chatDetails, ctx.from.id);
            if(response.affectedRows){
                await ctx.reply('Chat listed successfully! checkout ' + process.env.TGPAGELINK + '?tgcontentid=' + response.insertId + '&username=' + username);
            }else{
                await ctx.reply('Failed to list your chat. Please report this issue to our support chat @threej_discuss');
            }
            return true;
        }

        //-----default error message------//
        await ctx.reply('Unknown command. Send /help to see the list of available commands');
        return true;
    } catch (error) {
        tgbot.logError(error);
        ctx.reply('Unknown error occured! Please report this issue to our support chat @threej_discuss')
        bot.telegram.sendMessage(process.env.BOT_ADMIN, text + '; Err: ' + error.message);
    }
})

bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));