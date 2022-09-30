const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
const { CHATFLAG } = require('../modules/tgbot');

/**
 * Forwards poll to report a chat
 * @param {object} chatDetails 
 * @param {integer} userId user chat id where poll will be forwarded
 */
module.exports.reportChat = async (chatDetails, userId) => {
    if(chatDetails.REPORT > 0){
        await bot.telegram.forwardMessage(
            userId,
            process.env.MODSCHATID,
            chatDetails.REPORT
        );
    }else{
        var [i, ...flags] = CHATFLAG;
        const result = await bot.telegram.sendPoll(
            process.env.MODSCHATID,
            `#${chatDetails.CID} Report ${chatDetails.USERNAME || chatDetails.TITLE}`,
            flags
        );
        await bot.telegram.forwardMessage(
            userId,
            process.env.MODSCHATID,
            result.message_id
        );
    }
}