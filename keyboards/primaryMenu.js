module.exports.menu = function (Markup){ 
    return [
        [
            Markup.button.switchToCurrentChat('🔍 Search chats','news')
        ],
        [
            Markup.button.callback('💬 List chat','💬'),
            Markup.button.callback('🏞 List sticker','🏞')
        ],
        [
            Markup.button.callback('🚁 Help','🚁'),
            Markup.button.callback('🤔 FAQ','🤔')
        ]
    ]
};