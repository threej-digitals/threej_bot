const { helpMessage } = require('./help');
const { faqMessage } = require('./faq');
const { Markup } = require('telegraf');

const messages = {
    en : {
        addNewChat : `Okay send me the 🔗 link or username of a public chat, or click on the below button to add a private chat. 👇`,
        addNewGroup : `Okay send me the 🔗 link or username of a public group chat, , or click on the below button to add a private chat. 👇`,
        addNewBot : `Okay send me the 🔗 link or username of Bot...`,
        addNewSticker : `Feature under development.`,
        chatListingFailed : `Failed to list your chat. Please report this issue to our support chat @threej_discuss`,
        chatRemoved : `Chat removed from Telegram directory.`,
        chooseCategory : `Choose category for this chat.`,
        chooseLanguage : `Choose language for this chat.`,
        claimOwnership : `To claim this chat add me to your chat as an admin. For more infor see /faqs.`,
        default : `Unknown command. Send /help to see the list of available commands`,
        ineligibleForListing : `❌ Chat is not eligible for listing. See /faqs for more details.`,
        ineligibleForPromotion : `❌ Chat is not eligible for promotion. See /faqs for more details.`,
        internalError : `Internal error occurred!`,
        promoteChat : `📣 Promote chat for free`,
        promotionAccepted : `✅ Your promotion request has been accepted.`,
        promotionRequested : `✅ Promotion request sent to moderators.`,
        rateChat : `⭐️ Ask subsribers to rate this chat`,
        removeChat: `🗑 Remove this chat from Telegram Directory`,
        start : `Add or explore Telegram chats available in the <a href="${process.env.TGPAGELINK}">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,
        unknownCommand : `Unknown command. Send /help to see the list of available commands`,
        unknownError : `Unkown error occurred! Please report this issue to our support chat @threej_discuss`,
        reply_markup : {
            addNewChat : [
                [Markup.button.url('🔐 Add private chat',`https://t.me/${process.env.BOT_USERNAME.substring(1)}?startgroup=claimchat`)]
            ],
            addNewGroup : [
                [Markup.button.url('🔐 Add private chat',`https://t.me/${process.env.BOT_USERNAME.substring(1)}?startgroup=claimchat`)]
            ]
        }
    }
}


module.exports.commands = (langCode) => {
    // Returning an object result into emoji parsing error on server, Hence returning as array.
    if(Object.keys(messages).includes(langCode)){
        return [Object.assign(messages[langCode], helpMessage[langCode], faqMessage[langCode])];
    }else{
        return [Object.assign(messages['en'], helpMessage['en'], faqMessage['en'])];
    }
}