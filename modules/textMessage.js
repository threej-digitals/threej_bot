const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);

module.exports.handleText = async (ctx, tgbot) => {
    
    // Do not process message if not received from private chat
    if(ctx.message.chat.type != 'private') return true;
    
    // stop processing self inline query results
    if(typeof ctx.message.via_bot == 'object' && ctx.message.via_bot.username == ctx.me) return;
    
    // load regional messages
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];

    ctx.sendChatAction('typing');
    
    var text = ctx.message.text;
    var username = false;
    try {
        //check for sticker link
        var match = text.match(/t\.me\/addstickers\/([\S]+)$/)
        if(match && match.length === 2){
            ctx.message.sticker = {set_name : match[1]}
            return await require('./stickers').handleStickers(ctx, tgbot);
        }

        //----check for telegram chat link-----//
        match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        //-----Check for username-----//
        if(!username){
            match = text.match(/^.*@([0-9a-zA-Z-_]*).*$/);
            if(match && match.length == 2){
                username = match[1];
            }
        }

        //----- If username found then user is requesting for a chat ----//
        if(username){

            const chatDetails = await tgbot.updateAndGetChat({username: username}, tgbot);
            if(typeof chatDetails != 'object'){
                if(!chatDetails) return;
                if(!tgbot.knownErrors({message: chatDetails})){
                    tgbot.logError('error while handling ' + JSON.stringify(ctx.update));
                }
                return await ctx.reply(chatDetails);
            }

            return await tgbot.sendFormattedChatDetails(ctx, chatDetails);
        }

        //-----default error message------//
        return await ctx.reply(commands['unknownCommand']);
    } catch (error) {
        tgbot.logError(error.message + JSON.stringify(ctx.update) + error.stack.toString());
        await ctx.reply(commands['unknownError']);
        await bot.telegram.sendMessage(process.env.BOT_ADMIN, text + '; Err: ' + error.message);
    }
}