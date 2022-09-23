module.exports.menu = function (Markup){ 
    return [
        [
            Markup.button.switchToCurrentChat('🔍 Search chats','news'),
            Markup.button.callback('🕵️‍♂️ Advance search','🕵️‍♂️')
        ],
        [
            Markup.button.callback('💬 Add new chat','💬'),
            Markup.button.callback('🏞 Add new sticker','🏞')
        ],
        [
            Markup.button.switchToCurrentChat('📝 My contents',`myContents`),
            Markup.button.login('⚙️ Dashboard','https://threej.in/login?q=tg_user')
        ],
        [
            Markup.button.url('🗂 Full directory',process.env.TGPAGELINK),
            Markup.button.url('😺 Contribute', 'https://github.com/threej-digitals/threej_bot')
        ],
        [
            Markup.button.callback('❓ FAQ','❓'),
            Markup.button.url('🚁 Support','https://t.me/threej_discuss')
        ]
    ]
};