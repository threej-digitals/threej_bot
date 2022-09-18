module.exports.handleCallback = async function (ctx, bot, tgbot, Markup){
    ctx.answerCbQuery();
    const key = ctx.callbackQuery.data || '';

    switch (true) {
        //menu handlers
        case 'menu_listChat' === key:
            await ctx.sendMessage('Okay send me the 🔗 link or username of a public chat...');
            break;
        case 'menu_listSticker' === key:
            // await ctx.sendMessage('Okay reply with a sticker or send me the name of sticker set following with $.\n\nFor example: $UtyaD');
            await ctx.sendMessage('Feature under development.');
            break;
        case 'menu_help' === key:
            const {help} = require('../messages/help');
            await ctx.editMessageText(help[tgbot.user.LANGCODE || 'en'],{
                reply_markup : Markup.inlineKeyboard([[Markup.button.callback('◀️ Back','show_mainMenu')]]).reply_markup
            });
            break;
        case 'menu_faq' === key:
            const {faq} = require('../messages/faq');
            await ctx.editMessageText(faq[tgbot.user.LANGCODE || 'en'],{
                reply_markup : Markup.inlineKeyboard([[Markup.button.callback('◀️ Back','show_mainMenu')]]).reply_markup
            });
            break;
        case 'show_mainMenu' === key:
            const {menu} = require('../keyboards/primaryMenu');
            await ctx.editMessageText(`List or explore Telegram chats available in the <a href="https://threej.in/">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,{
                parse_mode: 'HTML',
                disable_web_page_preview:true,
                reply_markup : Markup.inlineKeyboard(menu(Markup)).reply_markup
            });
            break;

        //Update chat details
        case /^chooseCategory#{.*}$/.test(key):
            //Send category keyboard
            const {category} = require('../keyboards/category');
            const cid = JSON.parse(key.substr(15)).cid;

            await ctx.answerCbQuery('Choose category for this chat.');
            await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(category(cid, Markup)).reply_markup);
            break;
        case /^updateCategory#{.*}$/.test(key):
            //update category and send language keyboard
            const {language} = require('../keyboards/language');
            var result = JSON.parse(key.substr(15));

            var response = await tgbot.updateChat(result.cid, result.cat);
            if(response){
                ctx.editMessageReplyMarkup(Markup.inlineKeyboard(language(result.cid, Markup)).reply_markup);
            }else{
                ctx.sendMessage('Internal error occurred!');
            }
            break;
        case /^updateLanguage#{.*}$/.test(key):
            //update category and send language keyboard
            var result = JSON.parse(key.substr(15));
            console.log(result);
            // var response = await tgbot.updateChat(result.cat);
            // if(response){
            //     ctx.editMessageReplyMarkup(Markup.inlineKeyboard(language(Markup)).reply_markup);
            // }else{
            //     ctx.sendMessage('Internal error occurred!');
            // }
            break;
        default:
            await ctx.sendMessage('Unkown error occurred!');
            tgbot.logError(ctx.callbackQuery);
            break;
    }
    return true;
}