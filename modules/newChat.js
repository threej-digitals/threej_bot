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

            var chatDetails = tgbot.chatDetails;
            chatDetails['id'] = result.id;
            chatDetails['title'] = result.title;
            chatDetails['description'] = result.description;
            chatDetails['username'] = result.username || '';
            chatDetails['type'] = result.type || '';

            chatDetails['subscribers'] = await bot.telegram.getChatMembersCount(result.id);

            const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
            // Download profile pic and store it in server
            chatDetails.photo = await tgbot.saveRemoteFile(fileLink.href, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+result.id) || '';
            chatDetails.photo = chatDetails.photo.replace(process.env.ABS_HOMEPATH,'');
        } catch (error) {
            tgbot.logError(error)
            return 'Chat not found!';
        }
    }
    return chatDetails;
}

module.exports.updateAndGetChat = async (username, tgbot, listerRole = 'member') => {
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en');
    var chatDetails = await tgbot.getChatFromDB(username);

    //new chat
    if(!chatDetails || chatDetails.length == 0){
        
        const chatDetails = await getChatDetails(username, tgbot);
        if(typeof chatDetails != 'object') return chatDetails;

        //-----Check for eligibility-------//
        if(chatDetails.type !== 'bot' && parseInt(chatDetails.subscribers) < 100){
            return commands['ineligibleForListing'];
        }

        //-----Store chat details to DB------//
        const response = await tgbot.newChat(chatDetails, listerRole);
        if(response && response.affectedRows){
            return await tgbot.getChatFromDB(chatDetails.username);
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
}