const { Telegraf, Markup } = require('telegraf');
const { updateAndGetChat } = require('./newChat');
const { reportChat } = require('./report');
const { USERPREFERENCES } = require('./tgbot');

const bot = new Telegraf(process.env.BOT_TOKEN);
const botUsername = process.env.BOT_USERNAME;

module.exports.handleCommands = function(update, tgbot){
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];
    bot.handleUpdate(update);

    // List of commands to reply for in groups
    bot.command(
        [
            'faqs' + botUsername,
            'help' + botUsername
        ],
        async ctx => {
            // return if not group chat
            if(ctx.chat?.type === 'private') return;

            // reply with corresponding message
            return await ctx.reply(
                commands[ctx.message.text.substring(1, ctx.message.text.length - botUsername.length)],
                {
                    parse_mode :'HTML',
                    disable_web_page_preview:true
                }
            );
        }
    )

    // List of commands to reply for in private msg with bot
    bot.command(
        [
            'addNewChat',
            'addNewGroup',
            'addNewBot',
            'addNewSticker',
            'faqs',
            'help'
        ],
        async ctx => {
            // return if not private chat
            if(ctx.chat?.type != 'private') return;
            
            // reply with corresponding message
            const command = ctx.message.text.substring(1);
            let options = {
                parse_mode :'HTML',
                disable_web_page_preview:true
            };
            if(commands.reply_markup[command]){
                options = Object.assign(options, {
                    reply_markup: Markup.inlineKeyboard(
                        commands.reply_markup[command].concat(
                            commands.reply_markup['backButton']
                        )
                    ).reply_markup
                });
            }else{
                options = Object.assign(options, {
                    reply_markup: Markup.inlineKeyboard(commands.reply_markup['backButton']).reply_markup
                });
            }
            return await ctx.reply(commands[command].toString(), options);
        }
    )

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
                    const chatDetails = await updateAndGetChat({id: payload.cid},tgbot);
                    if(!chatDetails) return await ctx.reply(commands['Chat not found!']);

                    // send poll to report a chat
                    if(payload['report']){
                        return await reportChat(chatDetails, ctx.from.id);
                    }

                    //send chat details
                    const {text, markup} = require('../cards/chatDetails').chatDetailsCard(chatDetails, tgbot);
                    return await ctx.reply(text,{
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard(markup).reply_markup
                    });
                }
            } catch (error) {
                tgbot.logError(error.message + JSON.stringify(ctx.update));
            }
        }

        //greet with sticker
        const stickers = tgbot.stickers.greetings;
        await ctx.sendSticker(
            stickers[tgbot.randomInt(stickers.length-1)],
            {
                reply_markup: Markup.removeKeyboard().reply_markup
            }
        );

        //send menu for interaction
        await ctx.reply(
            commands['start'],
            tgbot.keyboards.primaryMenu(Markup)
        );
        return true;
    })

    // broadcast command only for admin
    bot.command('broadcast', async (ctx, next)=>{
        if(tgbot.user.TGID != process.env.BOT_ADMIN) return next();
        if(!update.message.reply_to_message) return await ctx.reply('Broadcast message not found');

        //get broadcast message id
        const msgId = update.message.reply_to_message.forward_from_message_id || update.message.reply_to_message.message_id;
        const fromChatId = update.message.reply_to_message.forward_from_chat?.id || update.message.reply_to_message.chat.id;

        var uid = 1;
        var limit = 25;
        const matches = update.message.text.match(/\/broadcast (\d+) (\d+)/);
        if(matches != null){
            uid = matches[1] || uid;
            limit = matches[2] || limit;
        }

        // get users list and filter them according to their preference
        const users = await tgbot.getUsers(uid, limit);
        uid = users.at(-1).TUID;
        users = users.map(user => {
            if(!(
                user.PREFERENCES == USERPREFERENCES['BLOCKED'] ||
                user.PREFERENCES == USERPREFERENCES['NOUPDATES']
            )) return user.TGID;
        })


        await tgbot.broadcast(
            users,
            async (id) => {
                try {
                    await bot.telegram.forwardMessage(id, fromChatId, msgId, {disable_notification: true});
                } catch (error) {
                    // update user preference if bot is blocked by user
                    if(error.message == '403: Forbidden: bot was blocked by the user'){
                        tgbot.user.TGID = id;
                        return await tgbot.updateUserPreference('blocked');
                    }
                    tgbot.logError(error);
                }
            }
        )

        await ctx.reply(`Message broadcasted to ${users.length || 0} users and last UID was ${uid}`)
    })

    // statistics for admin
    bot.command('stats', async (ctx, next)=>{
        if(tgbot.user.TGID != process.env.BOT_ADMIN) return next();
        const stats = await tgbot.getBotStats();
        return await ctx.reply(`New users: ${stats.newUsers}\n\nTotal: ${stats.total}`);
    })

    // show error for unknown commands
    bot.command(update.message.text, async ctx=>{
        return await ctx.reply(commands['default']);
    })

    return true;
}