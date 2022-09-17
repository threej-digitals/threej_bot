require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const {Tgbot, CHATSTATUS, MEMBERSTATUS} = require('./modules/tgbot');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();

// Log user details to DB when bot is started by new user.
bot.use(async (ctx, next)=>{
    await tgbot.logUser(ctx.from);
    return next();
})

bot.on('callback_query',(ctx)=>{
    const {handleCallback} = require('./modules/callbackHandler');
    handleCallback(ctx, bot, tgbot, Markup);
})

bot.start(async (ctx)=>{
    const stickers = require('./messages/sticker');
    // console.log(stickers.type.greetings[Math.floor(Math.random() * stickers.type.greetings.length + 1)]);return;
    await ctx.sendSticker(stickers.type.greetings[Math.floor(Math.random() * stickers.type.greetings.length + 1)])
    const inlineKeyboard = [
        [Markup.button.switchToCurrentChat('🔍 Search chats','news')],
        [Markup.button.callback('List chat','listChat'), Markup.button.callback('List sticker','c2')],
        [Markup.button.callback('Help','c3'), Markup.button.callback('FAQ','c4')]
    ]
    await ctx.reply(`List or explore Telegram chats available in the <a href="https://threej.in/">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,{
        parse_mode: 'HTML',
        disable_web_page_preview:true,
        reply_markup : Markup.inlineKeyboard(inlineKeyboard).reply_markup
    });
    return true;
})

bot.help(async (ctx) =>{
    const message = require('./messages/help');
    await ctx.reply(message.help[tgbot.user.LANGCODE || 'en']);
})

bot.on('text', async (ctx)=>{
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
            if(chatDetails.length == 0){
                //-----Scrap chat details from telegram website----------//
                const scrapper = require('./modules/scrapper');
                chatDetails = await scrapper.scrapChat(username);

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
                        chatDetails['photo'] = await tgbot.saveRemoteFile(fileLink.href, 'assets/img/','chat'+result.id) || '';
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
            if(CHATSTATUS.new == chatDetails.STATUS){
                keyboardArray = [Markup.button.callback('✅ List this chat to Telegram Directory',chatDetails.TUID + '')];
            }else if(CHATSTATUS.listed == chatDetails.STATUS){
                keyboardArray = [Markup.button.callback('❌ Unlist this chat from Telegram Directory',chatDetails.TUID + '')];
            }
            const keyboard = Markup.inlineKeyboard([keyboardArray]);

            //----reply---//
            await ctx.reply(text, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup
            });
            // await ctx.reply('Chat listed successfully! checkout ' + process.env.TGPAGELINK + '?tgcontentid=' + response.insertId + '&username=' + username);
            
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

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));