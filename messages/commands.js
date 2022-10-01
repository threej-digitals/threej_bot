const { helpMessage } = require('./help');
const { faqMessage } = require('./faq');

const messages = {
    "en" : {
        "addNewChat" : "Okay send me the 🔗 link or username of a public chat...",
        "addNewGroup" : "Okay send me the 🔗 link or username of a public group chat...",
        "addNewBot" : "Okay send me the 🔗 link or username of Bot...",
        "addNewSticker" : "Feature under development.",
        "chatListingFailed" : "Failed to list your chat. Please report this issue to our support chat @threej_discuss",
        "chooseCategory" : "Choose category for this chat.",
        "chooseLanguage" : "Choose language for this chat.",
        "claimOwnership" : "To claim this chat add me to your chat as an admin. For more infor see /faqs.",
        "default" : "Unknown command. Send /help to see the list of available commands",
        "ineligibleForListing":"❌ Chat is not eligible for listing. See /faqs for more details.",
        "ineligibleForPromotion":"❌ Chat is not eligible for promotion. See /faqs for more details.",
        "internalError" : "Internal error occurred!",
        "promotionAccepted" : "✅ Your promotion request has been accepted.",
        "promotionRequested" : "✅ Promotion request sent to moderators.",
        "start" : `Add or explore Telegram chats available in the <a href="${process.env.TGPAGELINK}">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,
        "unknownError" : "Unkown error occurred!"
    }
}


module.exports.commands = (langCode) => {
    if(Object.keys(messages).includes(langCode)){
        return Object.assign(messages[langCode], helpMessage[langCode], faqMessage[langCode]);
    }else{
        return Object.assign(messages['en'], helpMessage['en'], faqMessage['en']);
    }
}