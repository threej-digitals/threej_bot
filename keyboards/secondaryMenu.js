module.exports.menu = function (Markup){ 
    return Markup.inlineKeyboard([
            [
                Markup.button.switchToCurrentChat('📝 My contents',`myContents`),
                Markup.button.login('⚙️ Dashboard','https://threej.in/login?q=tg_user')
            ],
            [
                Markup.button.callback('❓ FAQ','❓'),
                Markup.button.url('🚁 Support','https://t.me/threej_discuss')
            ],
            [
                Markup.button.url('😺 Contribute', 'https://github.com/threej-digitals/threej_bot'),
                Markup.button.callback('◀️ Back','💠')
            ]
        ]).reply_markup
};