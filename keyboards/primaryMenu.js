module.exports.menu = function (Markup){ 
    return {
        parse_mode: 'HTML',
        disable_web_page_preview:true,
        reply_markup: Markup.inlineKeyboard([
            [
                Markup.button.switchToChat('🔍 Search chats',''),
                Markup.button.callback('🕵️‍♂️ Advance search','🕵️‍♂️')
            ],
            [
                Markup.button.callback('💬 Add new chat','💬'),
                Markup.button.callback('🏞 Add new sticker','🏞')
            ],
            [
                Markup.button.callback('⏩ More options',`💠💠`)
            ]
        ]).reply_markup
    };
};