require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const {Tgbot, CHATSTATUS, MEMBERSTATUS} = require('./modules/tgbot');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const tgbot = new Tgbot();

// Log user details to DB when bot is started by new user.
bot.use(async (ctx, next)=>{
    try {
        // fs.appendFileSync('./t.json',"\n\n\n\n" + JSON.stringify(ctx));
        if(
            typeof ctx.from == 'undefined' &&
            typeof ctx.callbackQuery == 'undefined'
        ){
            return true;
        }
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

bot.on('inline_query',(ctx)=>{
    const {handleInlineQueries} = require('./modules/inlineQueryHandler');
    handleInlineQueries(ctx, bot, tgbot, Markup);
})

bot.start(async (ctx, next)=>{
    // Handle start payload
    if(ctx.startPayload){
        if(typeof ctx.startPayload == 'string'){
            try {
                var payload = {};
                atob(ctx.startPayload).split('&').forEach(e=>{
                    var t = e.split('=');
                    payload[t[0]] = t[1]
                });
                if(payload['cid']){
                    const chatDetails = await tgbot.getChatFromDB(payload['cid']);
                    const {text, markup} = require('./cards/chatDetails');
                    return await ctx.reply(text(chatDetails),{
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard(
                            markup(chatDetails, Markup, tgbot, MEMBERSTATUS, CHATSTATUS)
                        ).reply_markup
                    })
                }
            } catch (error) {
                tgbot.logError(error);
            }
            
        }
    }

    const {stickers} = require('./messages/sticker');
    const {menu} = require('./keyboards/primaryMenu');
    //greet with sticker
    await ctx.sendSticker(stickers.greetings[tgbot.randomInt(stickers.greetings.length-1)],{
        reply_markup: Markup.removeKeyboard().reply_markup
    });

    //send menu for interaction
    await ctx.reply(`Add or explore Telegram chats available in the <a href="${process.env.TGPAGELINK}">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,{
        parse_mode: 'HTML',
        disable_web_page_preview:true,
        reply_markup : Markup.inlineKeyboard(menu(Markup)).reply_markup
    });
    return true;
})

bot.help(async (ctx) =>{
    const {faq} = require('./messages/faq');
    await ctx.reply(faq[tgbot.user.LANGCODE || 'en']);
})

bot.on('text', async (ctx)=>{
    // Do not process message if not received from private chat
    if(ctx.message.chat.type != 'private') return true;

    ctx.sendChatAction('typing');
    var text = ctx.message.text;
    var username = false;
    try {
        //----check for telegram chat link-----//
        var match = text.match(/([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/);
        (match && match.length === 4) ? username = match[3]:'';

        if(!username){
            //-----Check for username-----//
            match = text.match(/@([0-9a-zA-Z-_]*).*$/);
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
                    chatDetails['photo'] = await tgbot.saveRemoteFile(chatDetails['photo'], process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+(chatDetails['id'] || chatDetails['username'])) || '';
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
                        chatDetails['photo'] = await tgbot.saveRemoteFile(fileLink.href, process.env.ABS_HOMEPATH + process.env.ASSETS_FOLDER,'chat'+result.id) || '';
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
                chatDetails.photo = chatDetails.photo.replace(process.env.ABS_HOMEPATH,'');
                const response = await tgbot.newChat(chatDetails, ctx.from.id);
                if(response && response.affectedRows){
                    chatDetails = await tgbot.getChatFromDB(chatDetails.username);
                }else{
                    await ctx.reply('Failed to list your chat. Please report this issue to our support chat @threej_discuss');
                    return true;
                }
            }

            //---- Get chat details card -----//
            const {text, markup} = require('./cards/chatDetails');

            //----reply---//
            if(!chatDetails.PHOTO){
                await ctx.reply(text(chatDetails), {
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard(
                        markup(chatDetails, Markup, tgbot, MEMBERSTATUS, CHATSTATUS)
                    ).reply_markup
                });
            }else{
                await ctx.replyWithPhoto(process.env.HOMEURI + chatDetails.PHOTO, {
                    caption: text(chatDetails),
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard(
                        markup(chatDetails, Markup, tgbot, MEMBERSTATUS, CHATSTATUS)
                    ).reply_markup
                });
            }
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
// Production
// bot.launch({webhook:{domain: process.env.webhookDomain,hookPath: process.env.WEBHOOKPATH,secretToken: process.env.SECRETTOKEN,port: 443}})

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));