require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const {Tgbot, CHATSTATUS, MEMBERSTATUS} = require('./modules/tgbot');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();

// Log user details to DB when bot is started by new user.
bot.use(async (ctx, next)=>{
    try {
        await tgbot.logUser(ctx.from || ctx.callbackQuery.from);
    } catch (error) {
        tgbot.logError(error);
    }
    return next();
})

bot.on('callback_query',(ctx)=>{
    const {handleCallback} = require('./modules/callbackHandler');
    handleCallback(ctx, bot, tgbot, Markup);
})

bot.start(async (ctx)=>{
    const {stickers} = require('./messages/sticker');
    const {menu} = require('./keyboards/primaryMenu');
    
    //greet with sticker
    await ctx.sendSticker(stickers.greetings[tgbot.randomInt(stickers.greetings.length-1)]);

    //send menu for interaction
    await ctx.reply(`List or explore Telegram chats available in the <a href="https://threej.in/">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,{
        parse_mode: 'HTML',
        disable_web_page_preview:true,
        reply_markup : Markup.inlineKeyboard(menu(Markup)).reply_markup
    });
    return true;
})

bot.help(async (ctx) =>{
    const {msgHelp} = require('./messages/help');
    await ctx.reply(msgHelp[tgbot.user.LANGCODE || 'en']);
})

bot.on('text', async (ctx)=>{
    ctx.sendChatAction('typing');
    var text = ctx.message.text;
    var username = false;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        if(!username){
            //-----Check for username-----//
            match = text.match(/@([0-9a-zA-Z-_]*)/);
            if(match && match.length == 2){
                username = match[1];
            }
        }
        
        //----- If username found then user is requesting for a chat ----//
        if(username){

            var chatDetails = await tgbot.getChatFromDB(username);

            //---- Process new chat ----//
            if(!chatDetails || chatDetails.length == 0){
                //-----Scrap chat details from telegram website----------//
                const scrapper = require('./modules/scrapper');
                chatDetails = await scrapper.scrapChat(username);
                if(typeof chatDetails['photo'] == 'string' && chatDetails['photo'].length > 10){
                    chatDetails['photo'] = await tgbot.saveRemoteFile(chatDetails['photo'], process.env.ASSETS_FOLDER,'chat'+(chatDetails['id'] || chatDetails['username'])) || '';
                }

                //-----If unable to scrap chat details request it from telegram api-----//
                if(!chatDetails){
                    try {
                        const result = await bot.telegram.getChat('@'+username);

                        chatDetails = tgbot.chatDetails;
                        chatDetails['id'] = result.id;
                        chatDetails['title'] = result.title;
                        chatDetails['description'] = result.description;
                        chatDetails['username'] = result.username || '';
                        chatDetails['type'] = result.type || '';

                        chatDetails['subscribers'] = await bot.telegram.getChatMembersCount(result.id);

                        const fileLink = await bot.telegram.getFileLink(result.photo.small_file_id);
                        // Download profile pic and store it in server
                        chatDetails['photo'] = await tgbot.saveRemoteFile(fileLink.href, process.env.ASSETS_FOLDER,'chat'+result.id) || '';
                    } catch (error) {
                        tgbot.logError(error)
                        ctx.reply('Chat not found!');
                        return true;
                    }
                }

                //-----Check for eligibility-------//
                if(chatDetails.type !== 'bot' && parseInt(chatDetails.subscribers) < 100){
                    ctx.reply('Chat is not eligible for listing. See /FAQs');
                    return true;
                }

                //-----Store chat details to DB------//
                const response = await tgbot.newChat(chatDetails, ctx.from.id);
                if(response && response.affectedRows){
                    chatDetails = await tgbot.getChatFromDB(chatDetails.username);
                }else{
                    await ctx.reply('Failed to list your chat. Please report this issue to our support chat @threej_discuss');
                    return true;
                }
            }

            //----Format chat details as text message----//
            var text = '<b>Verify chat details</b>\n\n';
            const values = {
                TITLE:'Title      :',
                DESCRIPTION :'Description:',
                SUBSCOUNT:'Subscribers:',
                USERNAME:'Username   :',
                LINK:'Link       :',
                CTYPE:'Type       :'
            }
            for(const e in values){
                if(e === 'DESCRIPTION') chatDetails[e] = chatDetails[e].replaceAll('<br>','\n')
                if(e === 'USERNAME' && chatDetails[e] !== '') chatDetails[e] = '@' + chatDetails[e];
                text += `<code>${values[e]}</code> ` + chatDetails[e].toString() + '\n';
            }
            
            //-----Prepare inline keyboard-----//
            var keyboardArray = [];

            //Keyboard with general options for all user
            keyboardArray.push(Markup.button.callback((chatDetails.UPVOTES || 0) + ' 👍', `👍#{"cid":${chatDetails.CID}}`));
            keyboardArray.push(Markup.button.callback((chatDetails.DOWNVOTES || 0) + ' 👎', `👎#{"cid":${chatDetails.CID}}`));
            keyboardArray.push(Markup.button.url('👤 Subscribe', chatDetails.LINK || 'https://telegram.me'));
            
            //keyboard for new chats only visible to lister
            if([CHATSTATUS.new, CHATSTATUS.unlisted].includes(parseInt(chatDetails.STATUS)) && tgbot.user.TUID == chatDetails.LISTERID){
                keyboardArray.push(Markup.button.callback('✅ List this chat to Telegram Directory', `chooseCategory#{"cid":${chatDetails.CID}}`));
            Do s
            }else if([CHATSTATUS.new, CHATSTATUS.unlisted].includes(parseInt(chatDetails.STATUS))){
                
            //keyboard for existing chats only visible to lister
            }else if(CHATSTATUS.listed == chatDetails.STATUS && tgbot.user.TUID == chatDetails.LISTERID){
                keyboardArray.push(Markup.button.callback('📣 Promote', '📣'));
                keyboardArray.push(Markup.button.callback('🗑 Remove chat', 'unlist#{"cid":' + chatDetails.CID + '}'));
            }
            keyboardArray.push(Markup.button.callback('❌ Cancel', '💠'));

            //----reply---//
            await ctx.reply(text, {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(keyboardArray).reply_markup
            });
            return true;
        }

        //-----default error message------//
        await ctx.reply('Unknown command. Send /help to see the list of available commands');
        return true;
    } catch (error) {
        tgbot.logError(error);
        ctx.reply('Unknown error occured! Please report this issue to our support chat @threej_discuss')
        bot.telegram.sendMessage(process.env.BOT_ADMIN, text + '; Err: ' + error.message);
    }
})

bot.on('sticker',(ctx)=>{
    console.log(ctx.message)
})

// bot.catch((err)=>{tgbot.logError(err)});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));