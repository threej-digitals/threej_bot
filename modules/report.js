const { Telegraf } = require('telegraf');
const { CHATFLAG, Tgbot } = require('../modules/tgbot');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot(parseInt(process.env.BOT_ADMIN));

/**
 * Forwards poll to report a chat
 * @param {object} chatDetails 
 * @param {integer} userId user chat id where poll will be forwarded
 */
module.exports.reportChat = async (chatDetails, userId) => {
    try {
        if(chatDetails.REPORT > 0){
            await bot.telegram.forwardMessage(
                userId,
                process.env.MODSCHATID,
                chatDetails.REPORT
            );
        }else{
            var [sfw, ...flags] = CHATFLAG;
            const result = await bot.telegram.sendPoll(
                process.env.MODSCHATID,
                `#${chatDetails.CID} Report ${chatDetails.USERNAME || chatDetails.TITLE}`,
                flags
            );
            await tgbot.updateChat(chatDetails.CID, {report: result.message_id});
            await bot.telegram.forwardMessage(
                userId,
                process.env.MODSCHATID,
                result.message_id
            );
        }
    } catch (error) {
        return tgbot.logError(error);
    }
}