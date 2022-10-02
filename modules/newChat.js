const { Telegraf } = require('telegraf');
const scrapper = require('./scrapper');

const bot = new Telegraf(process.env.BOT_TOKEN);

async function getChatDetails(username, tgbot){

    //scrap public chat details
    if(typeof username == 'string'){
        var chatDetails = await scrapper.scrapChat(username);
        if(typeof chatDetails['photo'] == 'string' && chatDetails['photo'].length > 10){
            chatDetails['photo'] = await tgbot.saveRemoteFile(chatDetails['photo'], process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+(chatDetails['id'] || chatDetails['username'])) || '';
        }else{
            chatDetails['photo'] = '';
        }
    }

    //request chat details from telegram api
    if(!chatDetails){
        try {
            if(typeof username == 'string') username = '@' + username;

            const result = await bot.telegram.getChat(username);

            var chatDetails = tgbot.chatDetailsFormat;
            chatDetails['id'] = result.id;
            chatDetails['title'] = result.title;
            chatDetails['description'] = result.description;
            chatDetails['username'] = result.username || '';
            chatDetails['type'] = result.type || '';
            chatDetails['link'] = result.invite_link || '';

            chatDetails['subscribers'] = await bot.telegram.getChatMembersCount(result.id);

            if(typeof result.photo == 'object'){

                const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
                // Download profile pic and store it in server
                chatDetails.photo = await tgbot.saveRemoteFile(fileLink.href, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+result.id) || '';
                chatDetails.photo = chatDetails.photo.replace(process.env.ABS_HOMEPATH,'');
            }
        } catch (error) {
            tgbot.logError(error)
            return 'Chat not found!';
        }
    }
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

        const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en');
        var chatDetails = await tgbot.getChatFromDB(chat.username || chat.id);

        //new chat
        if(!chatDetails || chatDetails.length == 0){
            
            const chatDetails = await getChatDetails(chat.username || chat.id, tgbot);
            if(typeof chatDetails != 'object') return chatDetails;
            chatDetails.id = chat.id || chatDetails.id;

            //-----Check for eligibility-------//
            if(chatDetails.type !== 'bot' && parseInt(chatDetails.subscribers) < 1){
                return commands['ineligibleForListing'];
            }

            //-----Store chat details to DB------//
            const response = await tgbot.newChat(chatDetails, listerRole);
            if(response && response.affectedRows){
                return await tgbot.getChatFromDB(chatDetails.username || chatDetails.id);
            }else{
                tgbot.logError(response);
                return commands['chatListingFailed'];
            }
        }

        //update chat if 24hr passed
        if((Date.now()/1000 - chatDetails.LISTEDON) > 86400){
            // const chatDetails = getChatDetails(username);
            console.log('ok');
        }

        return chatDetails;
    } catch (error) {
        return tgbot.logError(error);
    }
}