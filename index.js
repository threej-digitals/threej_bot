require('dotenv').config();
const { Telegraf, Markup, Context} = require('telegraf');
const {Tgbot, CHATFLAG} = require('./modules/tgbot');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();

bot.on('poll', async (ctx) => {
    const match = ctx.poll.question.match(/^#(\d+) .*$/);
    const options = ctx.poll.options;
    if(match && options){
        var max = 0;
        var flag = 0;
        for (const key in options) {
            if(options[key].voter_count > max){
                flag = key++;
                max = options[key].voter_count;
            }
        }
        if(flag > 0){
            return await tgbot.updateChatFlag(match[1], CHATFLAG[flag]);
        }
    }
})

bot.use(async (ctx, next)=>{
    try {
        // fs.appendFileSync('./t.json',"\n\n\n\n" + JSON.stringify(ctx));
        //Decide when to respond
        if(
            typeof ctx.from == 'undefined' &&
            typeof ctx.callbackQuery == 'undefined'
        ){
            return true;
        }
        // Log user details to DB when bot is started by new user.
        if(!(await tgbot.logUser(ctx.from || ctx.callbackQuery.from))) return;

        // Handle bot commands
        if(ctx?.message?.entities && ctx.message.entities[0].type == 'bot_command'){
            const {handleCommands} = require('./modules/commands');
            return handleCommands(ctx.update, tgbot);
        }
        return next();
    } catch (error) {
        tgbot.logError(error);
    }
})

bot.on('callback_query',(ctx)=>{
    const {handleCallback} = require('./modules/callbackHandler');
    handleCallback(ctx, tgbot);
})

bot.on('inline_query',(ctx)=>{
    const {handleInlineQueries} = require('./modules/inlineQueryHandler');
    handleInlineQueries(ctx, bot, tgbot, Markup);
})

bot.on('text', async (ctx)=>{
    // Do not process message if not received from private chat
    if(ctx.message.chat.type != 'private') return true;

    ctx.sendChatAction('typing');
    var text = ctx.message.text;
    var username = false;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        if(!username){
            //-----Check for username-----//
            match = text.match(/@([0-9a-zA-Z-_]*).*$/);
            if(match && match.length == 2){
                username = match[1];
            }
        }
        //----- If username found then user is requesting for a chat ----//
        if(username){

            var chatDetails = await tgbot.getChatFromDB(username);

            //---- Process new chat ----//
            if(!chatDetails || chatDetails.length == 0){
                //-----Scrap chat details from telegram website----------//
                const scrapper = require('./modules/scrapper');
                chatDetails = await scrapper.scrapChat(username);
                if(typeof chatDetails['photo'] == 'string' && chatDetails['photo'].length > 10){
                    chatDetails['photo'] = await tgbot.saveRemoteFile(chatDetails['photo'], process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+(chatDetails['id'] || chatDetails['username'])) || '';
                }

                //-----If unable to scrap chat details request it from telegram api-----//
                if(!chatDetails){
                    try {
                        const result = await bot.telegram.getChat('@'+username);

                        chatDetails = tgbot.chatDetails;
                        chatDetails['id'] = result.id;
                        chatDetails['title'] = result.title;
                        chatDetails['description'] = result.description;
                        chatDetails['username'] = result.username || '';
                        chatDetails['type'] = result.type || '';

                        chatDetails['subscribers'] = await bot.telegram.getChatMembersCount(result.id);

                        const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
                        // Download profile pic and store it in server
                        chatDetails['photo'] = await tgbot.saveRemoteFile(fileLink.href, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+result.id) || '';
                    } catch (error) {
                        tgbot.logError(error)
                        ctx.reply('Chat not found!');
                        return true;
                    }
                }

                //-----Check for eligibility-------//
                if(chatDetails.type !== 'bot' && parseInt(chatDetails.subscribers) < 100){
                    ctx.reply('Chat is not eligible for listing. See /FAQs');
                    return true;
                }

                //-----Store chat details to DB------//
                chatDetails.photo = chatDetails.photo.replace(process.env.ABS_HOMEPATH,'');
                const response = await tgbot.newChat(chatDetails, ctx.from.id);
                if(response && response.affectedRows){
                    chatDetails = await tgbot.getChatFromDB(chatDetails.username);
                }else{
                    await ctx.reply('Failed to list your chat. Please report this issue to our support chat @threej_discuss');
                    return true;
                }
            }

            //---- Get chat details card -----//
            const {chatDetailsCard} = require('./cards/chatDetails');
            const {text, markup} = chatDetailsCard(chatDetails, Markup, tgbot);

            //----reply---//
            if(!chatDetails.PHOTO){
                return await ctx.reply(text,{
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard(markup).reply_markup
                });
            }else{
                await ctx.replyWithPhoto(process.env.HOMEURI + chatDetails.PHOTO, {
                    caption: text,
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard(markup).reply_markup
                });
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

bot.on('sticker',(ctx)=>{
    console.log(ctx.message)
})

bot.catch((err)=>{tgbot.logError(err)});

bot.launch({
    polling:{
        allowed_updates: [
            'callback_query',
            'inline_query',
            'message',
            'chat_member',
            'chat_join_request',
            'my_chat_member',
            'poll'
        ]
    }
});
// Production
/*
bot.launch({
    webhook:{
        domain: process.env.webhookDomain,
        hookPath: process.env.WEBHOOKPATH,
        secretToken: process.env.SECRETTOKEN,
        port: 443,
        allowed_updates: [
            'callback_query',
            'inline_query',
            'message',
            'chat_member',
            'chat_join_request',
            'my_chat_member',
            'poll'
        ]
    }
})
*/

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));