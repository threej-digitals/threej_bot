module.exports.handleInlineQueries = async function (ctx, bot, tgbot, Markup){
    console.log(ctx.inlineQuery)
    const query = ctx.inlineQuery.query || '';

    switch (true) {
        case true:
            console.log(query);
        break;

        default:
            await ctx.sendMessage('Unkown error occurred!');
            tgbot.logError(ctx.callbackQuery);
            break;
    }
    return true;
}