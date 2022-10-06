require('dotenv').config();
const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);
const { Tgbot, CHATFLAG } = require('./modules/tgbot');

const tgbot = new Tgbot(parseInt(process.env.BOT_ADMIN));
// load required modules
tgbot.updateAndGetChat = require('./modules/newChat').updateAndGetChat;
const commands = require('./messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];

// Update chat flag when new ANONYMOUS vote received from poll
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
    return true;
})

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

// handle change in chat memeber status
bot.on('my_chat_member', async (ctx) => {
    // bot removed from chat
    if(ctx.myChatMember.new_chat_member.status == 'left'){
        return;

    // User blocked the bot update user status
    }else if(
        ctx.myChatMember.chat.type == 'private' &&
        ctx.myChatMember.new_chat_member.status == 'kicked' &&
        ctx.myChatMember.new_chat_member.user.username == ctx.me
    ){
        return await tgbot.updateUserPreference('blocked');
    //Bot added to chat
    }else if(
        ctx.myChatMember.chat.type != 'private' &&
        ['administrator','member'].includes(ctx.myChatMember.new_chat_member.status)
    ){

        const chatMember = await bot.telegram.getChatMember(ctx.myChatMember.chat.id, ctx.myChatMember.from.id)
        var chatDetails = {};
        if(typeof ctx.myChatMember.chat.username == 'string'){
            chatDetails = await tgbot.updateAndGetChat(
                {
                    id: ctx.myChatMember.chat.id,
                    username: ctx.myChatMember.chat.username
                },
                tgbot,
                chatMember.status
            );
        }else{
            chatDetails = await tgbot.updateAndGetChat(
                { id: ctx.myChatMember.chat.id },
                tgbot,
                chatMember.status
            );
        }
    
        ctx.chat.id = ctx.myChatMember.from.id;
        if(typeof chatDetails == 'string'){
            return await ctx.reply(chatDetails, {parse_mode: 'HTML'});
        }
        return await tgbot.sendFormattedChatDetails(ctx, chatDetails);
    }

})

// handle callback queries
bot.on('callback_query',(ctx)=>{
    require('./modules/callbackHandler').handleCallback(ctx, tgbot);
})

// handle inline queries
bot.on('inline_query',(ctx)=>{
    require('./modules/inlineQueryHandler').handleInlineQueries(ctx, tgbot);
})

bot.on('sticker',(ctx)=>{
    console.log(ctx.message)
})

// handle text received from user
bot.on('text', async (ctx)=>{
    // Do not process message if not received from private chat
    if(ctx.message.chat.type != 'private') return true;

    // stop processing self inline query results
    if(typeof ctx.message.via_bot == 'object' && ctx.message.via_bot.username == ctx.me) return;

    ctx.sendChatAction('typing');
    var text = ctx.message.text;
    var username = false;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        if(!username){
            //-----Check for username-----//
            match = text.match(/^.*@([0-9a-zA-Z-_]*).*$/);
            if(match && match.length == 2){
                username = match[1];
            }
        }

        //----- If username found then user is requesting for a chat ----//
        if(username){

            const chatDetails = await tgbot.updateAndGetChat({username: username}, tgbot);
            if(typeof chatDetails == 'string' || chatDetails == false){
                tgbot.logError('error while handling ' + JSON.stringify(ctx.update));
                return await ctx.reply(chatDetails);
            }
            
            return await tgbot.sendFormattedChatDetails(ctx, chatDetails);
        }

        //-----default error message------//
        return await ctx.reply(commands['unknownCommand']);
    } catch (error) {
        tgbot.logError(error + JSON.stringify(ctx.update));
        await ctx.reply(commands['unknownError']);
        await bot.telegram.sendMessage(process.env.BOT_ADMIN, text + '; Err: ' + error.message);
    }
})

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