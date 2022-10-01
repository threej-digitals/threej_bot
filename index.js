require('dotenv').config();
const { Telegraf, Markup, Context} = require('telegraf');
const { Tgbot, CHATFLAG } = require('./modules/tgbot');
const { updateAndGetChat } = require('./modules/newChat');
const { chatDetailsCard } = require('./cards/chatDetails');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();


async function sendFormattedChatDetails(ctx, chatDetails){
    //---- Get chat details card -----//
    const {text, markup} = chatDetailsCard(chatDetails, Markup, tgbot);

    //----reply---//
    if(!chatDetails.PHOTO){
        await ctx.reply(text,{
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
}

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
        // console.log( JSON.stringify(ctx) );
        // fs.appendFileSync('./t.json',"\n\n\n\n" + JSON.stringify(ctx));
        //Decide when to respond
        if(
            typeof ctx.from == 'undefined' &&
            typeof ctx.callbackQuery == 'undefined' &&
            typeof ctx.myChatMember == 'undefined'
        ){
            return true;
        }
        // Log user details to DB when bot is started by new user.
        if(!(await tgbot.logUser(ctx.from || ctx.callbackQuery.from || ctx.myChatMember.from))) return;

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

bot.on('my_chat_member', async (ctx) => {
    const chatMember = await bot.telegram.getChatMember(ctx.myChatMember.chat.id, ctx.myChatMember.from.id)
    var chatDetails = {};
    if(typeof ctx.myChatMember.chat.username == 'string'){
        chatDetails = await updateAndGetChat(ctx.myChatMember.chat.username, tgbot, chatMember.status);
    }else{
        chatDetails = await updateAndGetChat(ctx.myChatMember.chat.username, tgbot, chatMember.status);
    }

    if(typeof chatDetails == 'string'){
        return tgbot.logError(chatDetails);
    }
    
    return await sendFormattedChatDetails(ctx, chatDetails);

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

            const chatDetails = await updateAndGetChat(username, tgbot);
            if(typeof chatDetails == 'string'){
                return await ctx.reply(chatDetails);
            }
            
            return await sendFormattedChatDetails();
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