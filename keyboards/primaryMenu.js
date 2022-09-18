module.exports.menu = function (Markup){ 
    return [
        [
            Markup.button.switchToCurrentChat('🔍 Search chats','news')
        ],
        [
            Markup.button.callback('💬 List chat','menu_listChat'),
            Markup.button.callback('🏞 List sticker','menu_listSticker')
        ],
        [
            Markup.button.callback('🚁 Help','menu_help'),
            Markup.button.callback('🤔 FAQ','menu_faq')
        ]
    ]
};