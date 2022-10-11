require('dotenv').config();
const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);
const tgbot = new (require('./modules/tgbot').Tgbot)(parseInt(process.env.BOT_ADMIN));

// Update chat flag when new ANONYMOUS vote received from poll
bot.on('poll', ctx => require('./modules/handleReport').handleReport(ctx, tgbot));

//return if received action is not performed by a user
bot.use(async (ctx, next)=>{
// console.log( JSON.stringify(ctx.update) );
    if(
        typeof ctx.from == 'undefined' &&
        typeof ctx.callbackQuery == 'undefined' &&
        typeof ctx.myChatMember == 'undefined'
    )
    return true;

    // log user and proceed
    try {
        if(!(await tgbot.logUser(ctx.from || ctx.callbackQuery.from || ctx.myChatMember.from)))
            return true;
    } catch (error) {
        tgbot.logError(error);
        return true;
    }

    return await next();
});

// handle bot commands
bot.use(async (ctx, next)=>{
    if(ctx?.message?.entities && ctx.message.entities[0].type == 'bot_command'){
        return await require('./modules/commands').handleCommands(ctx.update, tgbot);
    }
    return await next();
});

bot.on('sticker', ctx => require('./modules/stickers').handleStickers(ctx, tgbot));

// handle change in chat memeber status
bot.on('my_chat_member', ctx => require('./modules/myChatMember').myChatMember(ctx, tgbot));

// handle callback queries
bot.on('callback_query', ctx => require('./modules/callbackHandler').handleCallback(ctx, tgbot));

// handle inline queries
bot.on('inline_query', ctx => require('./modules/inlineQueryHandler').handleInlineQueries(ctx, tgbot));

// handle text message received from user
bot.on('text', ctx => require('./modules/textMessage').handleText(ctx, tgbot));

// handle errors
bot.catch((err)=>{tgbot.logError(err)});

// Launch bot
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