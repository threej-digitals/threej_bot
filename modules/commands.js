const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports.handleCommands = function(update, tgbot){
    bot.handleUpdate(update);

    // /start in groups
    bot.command('start' + process.env.BOT_USERNAME, async (ctx)=>{
        //send menu for interaction
        await ctx.reply(`Search Telegram chats, groups & stickers 👇`,{
            reply_markup : Markup.inlineKeyboard([
                [Markup.button.switchToCurrentChat('🔎 Search chats','')],
                [Markup.button.url('➕ Add your chat','telegram.me/' + ctx.botInfo.username)]
            ]).reply_markup
        });
    })

    // /start in private chat with bot
    bot.command('start', async (ctx)=>{

        if (ctx.chat?.type !== 'private') return;
            

        ctx.startPayload = ctx.message.text.substring(7);

        // Handle start payload
        if(ctx.startPayload && typeof ctx.startPayload == 'string'){
            try {
                var payload = {};
                Buffer.from(ctx.startPayload,'base64').toString().split('&').forEach(e=>{
                    var t = e.split('=');
                    payload[t[0]] = t[1]
                });
                if(payload['cid']){
                    const chatDetails = await tgbot.getChatFromDB(payload['cid']);
                    const {chatDetailsCard} = require('../cards/chatDetails');
                    const {text, markup} = chatDetailsCard(chatDetails, Markup, tgbot);
                    return await ctx.reply(text,{
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard(markup).reply_markup
                    });
                }
            } catch (error) {
                tgbot.logError(error);
            }
        }

        const {stickers} = require('../messages/sticker');
        const {menu} = require('../keyboards/primaryMenu');
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

    // /faqs
    bot.command('faqs', async (ctx)=>{
        if(ctx.chat?.type != 'private' && ctx.message.text != '/faqs@' + ctx.botInfo.username){
            return;
        }
        const {faq} = require('../messages/faq');
        await ctx.reply(faq[tgbot.user.LANGCODE || 'en'],{
            parse_mode: 'HTML'
        });
    });

    // /help in private chat
    bot.command('help', async (ctx)=>{
        if(ctx.chat?.type != 'private' && ctx.message.text != '/help@' + ctx.botInfo.username){
            return;
        }

        const {help} = require('../messages/help');
        await ctx.reply(help[tgbot.user.LANGCODE || 'en']);
    });

    // /stats - statistics for admin
    bot.command('stats', async (ctx)=>{
        if(tgbot.user.TUID != process.env.BOT_ADMIN) return;
        const stats = await tgbot.getBotStats();
        return await ctx.reply(`New users: ${stats.newUsers}\n\nTotal: ${stats.total}`);
    })

}