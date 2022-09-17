module.exports.handleCallback = function (ctx, bot, tgbot, Markup){
    ctx.answerCbQuery();
    switch (ctx.callbackQuery.data || '') {
        case 'listChat':
            ctx.editMessageText('Okay send me the link or username of a public chat...',{reply_markup: Markup.inlineKeyboard([[]]).reply_markup})
            break;
    
        default:
            ctx.sendMessage('Unkown error occurred!');
            tgbot.logError(ctx.callbackQuery);
            break;
    }
    return true;
}