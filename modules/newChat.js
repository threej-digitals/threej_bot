const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);
const scrapper = require('./scrapper');
const { MEMBERSTATUS } = require("./tgbot");

async function getChatDetails(username, tgbot, chatDetails = {}, update = false){

    //scrap public chat details
    if(typeof username == 'string'){
        Object.assign(chatDetails, await scrapper.scrapChat(username, tgbot.chatDetailsFormat));
        if(typeof chatDetails.PHOTO == 'string' && chatDetails.PHOTO.length > 10){
            chatDetails.PHOTO = await tgbot.saveRemoteFile(chatDetails.PHOTO, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+(chatDetails.CHATID || chatDetails.USERNAME)) || '';
        }
    }

    //request chat details from telegram api
    if(Object.keys(chatDetails).length == 0 || update){
        try {
            if(typeof username == 'string') username = '@' + username;

            var result = {};
            try {
                result = await bot.telegram.getChat(username);
            } catch (error) {
                if(typeof username == 'string' && chatDetails.CHATID < 0)
                    result = await bot.telegram.getChat(chatDetails.CHATID);
                else throw error;
            }

            var chatDetails = tgbot.chatDetailsFormat;
            chatDetails.CHATID = result.id;
            chatDetails.TITLE = result.title;
            chatDetails.DESCRIPTION = result.description;
            chatDetails.USERNAME = result.username || '';
            chatDetails.CTYPE = result.type || '';
            chatDetails.LINK = result.invite_link || '';

            chatDetails.SUBSCOUNT = await bot.telegram.getChatMembersCount(result.id);

            if(typeof result.photo == 'object'){

                const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
                // Download profile pic and store it in server
                chatDetails.PHOTO = await tgbot.saveRemoteFile(fileLink.href, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+result.id) || '';
            }
        } catch (error) {
            tgbot.logError(error)
            return 'Chat not found!';
        }
    }
    chatDetails.PHOTO = chatDetails.PHOTO.replace(process.env.ABS_HOMEPATH,'');
    return chatDetails;
}

/**
 * 
 * @param {object} chat 
 * @param {object} tgbot 
 * @param {string} listerRole 
 * @returns 
 */
module.exports.updateAndGetChat = async (chat, tgbot, listerRole = 'member') => {
    try {

        const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];
        var chatDetails = await tgbot.getChatFromDB(chat.username || chat.id);

        //new chat
        if(!chatDetails || Object.keys(chatDetails).length == 0){
            
            const chatDetails = await getChatDetails(chat.username || chat.id, tgbot);
            if(typeof chatDetails != 'object') return chatDetails;
            chatDetails.CHATID = chat.id || chatDetails.CHATID;

            //-----Check for eligibility-------//
            if(chatDetails.CTYPE !== 'bot' && parseInt(chatDetails.SUBSCOUNT) < 100){
                return commands['ineligibleForListing'];
            }

            //-----Store chat details to DB------//
            const response = await tgbot.newChat(chatDetails, listerRole);
            if(response && response.affectedRows){
                return await tgbot.getChatFromDB(chatDetails.USERNAME || chatDetails.CHATID);
            }else{
                if(response.indexOf('Duplicate entry') > -1 && response.indexOf('CHATID') > -1) {
                    return await tgbot.updateChat(chatDetails.CHATID, chatDetails);
                }
                tgbot.logError(response);
                return commands['chatListingFailed'];
            }
        }

        //update chat if 24hr passed
        if((Date.now()/1000 - chatDetails.CUPDATE) > 86400){
            var chatId = chatDetails.CID;
            chatDetails = await getChatDetails(chat.username || chat.id, tgbot, chatDetails, true);

            // Unlist dead chats
            if(chatDetails == 'Chat not found!'){
                await tgbot.updateChat(chatId, {
                    STATUS: 'unlisted'
                });
                return chatDetails;
            }

            //Get chat id if not available
            if(chatDetails.CHATID > -2 && typeof chat.id != 'undefined'){
                chatDetails.CHATID = chat.id;
            }else if(chatDetails.CHATID > -2 && typeof chat.username != 'undefined'){
                const res = await bot.telegram.getChat('@' + chat.username);
                chatDetails.CHATID = res.id;
            }

            //update chat with new details
            await tgbot.updateChat(chatId, chatDetails);
            chatDetails = await tgbot.getChatFromDB(chatId);
        }else if(listerRole != 'member' && chatDetails.LISTERROLE != MEMBERSTATUS['creator']){
            // update lister role
            await tgbot.updateChat(chatDetails.CID, {
                LISTERID: tgbot.user.TUID,
                LISTERROLE:listerRole
            });
            chatDetails.LISTERID = tgbot.user.TUID;
            chatDetails.LISTERROLE = MEMBERSTATUS[listerRole];
        }

        return chatDetails;
    } catch (error) {
        return tgbot.logError(error);
    }
}