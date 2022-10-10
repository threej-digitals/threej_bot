const { Telegraf, Markup } = require('telegraf');
const { CATEGORIES } = require('./tgbot');
const bot = new Telegraf(process.env.BOT_TOKEN);

const LANGUAGES=[{'ar' : 'اللغة العربية'},{ 'bn' : 'বাংলা'},{  'cn' : '中国人'},{'de' : 'Deutsche'},{ 'en' : 'English'},{ 'es' : 'Español'},{ 'fr' : 'Français'},{'gu' : 'ગુજરાતી'},{ 'hi' : 'हिंदी'},{ 'id' : 'Indonesian'},{ 'it' : 'Italiano'},{ 'ja' : '日本語'},{ 'kn' : 'ಕನ್ನಡ'},{ 'ko' : '한국어'},{ 'ky' : 'Кыргызча'},{ 'la' : 'Latine'},{ 'ms' : 'Melayu'},{ 'ml' : 'മലയാളം'},{ 'mr' : 'मराठी'},{ 'ne' : 'नेपाली'},{ 'nl' : 'Deutsch'},{ 'no' : 'norsk'},{ 'pa' : 'ਪੰਜਾਬੀ'},{ 'fa' : 'فارسی'},{ 'pt' : 'Português'},{ 'ru' : 'Pусский'},{ 'sa' : 'संस्कृत'},{ 'sv' : 'svenska'},{ 'ta' : 'தமிழ்'},{ 'te' : 'తెలుగు'},{ 'th' : 'ภาษาไทย'},{ 'tr' : 'Türk'},{ 'uk' : 'Український'},{ 'ur' : 'اردو'},{ 'uz' : 'O\'zbek'},{ 'vi' : 'tiếng Việt'},{ 'mt' : 'multiple'},{'' : 'Other'}];

module.exports.handleCallback = async (ctx, tgbot) => {
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];
    const key = ctx.callbackQuery.data || '';

    try {
        switch (true) {
            //menu handlers

            //List chat
            case '💬' === key:
                await ctx.editMessageText(commands['addNewChat'], {
                    reply_markup : Markup.inlineKeyboard(commands.reply_markup['addNewChat']).reply_markup
                });
            break;
            //list stickers
            case '🏞' === key:
                // await ctx.sendMessage('Okay reply with a sticker or send me the name of sticker set following with $.\n\nFor example: $UtyaD');
                await ctx.answerCbQuery(commands['addNewSticker']);
            break;
            //Advance search options
            case '🕵️‍♂️' === key:
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(
                    [
                        [
                            Markup.button.switchToCurrentChat("📢 Search channels","c "),
                            Markup.button.switchToCurrentChat("👥 Search groups","g ")
                        ],
                        [
                            Markup.button.switchToCurrentChat("🤖 Search bots","b "),
                            Markup.button.callback('◀️ Back','💠')
                        ]
                    ]
                ).reply_markup);
            break;
            //FAQ's
            case '❓' === key:
                await ctx.editMessageText(
                    commands['faqs'],
                    {
                        parse_mode :'HTML',
                        disable_web_page_preview:true,
                        reply_markup : Markup.inlineKeyboard(
                            [
                                [
                                    Markup.button.callback('◀️ Back','💠')
                                ]
                            ]
                        ).reply_markup
                    }
                );
            break;
            //Cancel previous actions & show Main menu
            case '💠' === key:
                try {
                    await ctx.editMessageText(
                        commands['start'],
                        tgbot.keyboards.primaryMenu(Markup)
                    );
                } catch (error) {
                    await ctx.deleteMessage();
                    await ctx.reply(
                        commands['start'],
                        tgbot.keyboards.primaryMenu(Markup)
                    );
                }
            break;
            // show secondary menu
            case '💠💠' === key:
                await ctx.editMessageReplyMarkup(tgbot.keyboards.secondaryMenu(Markup));
            break;
            //Claim ownership
            case '👮' === key:
                await ctx.answerCbQuery(commands['claimOwnership'], {show_alert:true});
            break;

            //Send category keyboard
            case /^chooseCategory#{.*}$/.test(key):
                const cid = JSON.parse(key.substr(15)).cid;
                var chatDetails = await tgbot.getChatFromDB(cid);

                // return if neither lister nor admin
                if(chatDetails.LISTERID != tgbot.user.TUID && tgbot.user.TGID != process.env.BOT_ADMIN) return;

                await ctx.answerCbQuery(commands['chooseCategory']);
                await ctx.editMessageReplyMarkup(
                    tgbot.keyboards.category(cid, CATEGORIES)
                );
            break;

            //update category and send language keyboard
            case /^updateCategory#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(15));

                if(cbData.cid){
                    var response = await tgbot.updateChat(cbData.cid, {CATEGORY:cbData.cat});
                }else if(cbData.setId){
                    var response = await tgbot.updateSticker(cbData.setId, {CATEGORY:cbData.cat});
                }

                if(response){
                    await ctx.answerCbQuery(commands['chooseLanguage']);
                    ctx.editMessageReplyMarkup(
                        Markup.inlineKeyboard(
                            tgbot.keyboards.language(cbData.cid || cbData.setId, LANGUAGES, true)
                        ).reply_markup
                    );
                }else{
                    ctx.sendMessage(commands['internalError']);
                }
            break;

            //update language, send chat for moderation and reply user with sharing link
            case /^updateLanguage#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(15));

                if(cbData.cid){
                    var response = await tgbot.updateChat(cbData.cid, {CLANGUAGE: cbData.lang, STATUS: 'listed'});
                    if(response){
                        sendChatConfirmation(cbData, ctx, tgbot);
                    }
                }else if(cbData.setId){
                    var response = await tgbot.updateSticker(cbData.setId, {LANGUAGE: cbData.lang});
                    if(response){
                        sendStickerConfirmation(cbData, ctx, tgbot);
                    }
                }
                throw new Error(response);
            break;

            //Remove/Unlist the chat
            case /^unlist#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(7));

                //No need to verify if requested by moderator
                if(tgbot.user.TGID != process.env.BOT_ADMIN){
                    if((tgbot.getChatFromDB(cbData.cid)).LISTERID != tgbot.user.TGID) return;
                }

                await tgbot.updateChat(cbData.cid, {STATUS:'unlisted'});
                await ctx.answerCbQuery(commands['chatRemoved']);
                ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup);
            break

            //Handle votes
            case /^👍#{.*}$/.test(key) || /^👎#{.*}$/.test(key) || /"action":"(up|down)"/.test(key):
                var cbData = {};
                var action = '';

                //compatibility for prev version
                if(/"action":"(up|down)"/.test(key)){
                    cbData = JSON.parse(key);
                    action = cbData.action === 'up' ? 'UPVOTE' : 'DOWNVOTE';
                }else{
                    cbData = JSON.parse(key.substr(3));
                    action = key.substr(0,2) === '👍' ? 'UPVOTE' : 'DOWNVOTE';
                }

                await tgbot.insertChatAction(cbData.cid, action);
                var chatDetails = await tgbot.getChatFromDB(cbData.cid);
                var ik = [];
                if(ctx.callbackQuery.message){
                    ik = ctx.callbackQuery.message.reply_markup.inline_keyboard;
                    //update vote counters of inline keyboard
                    ik = ik.map(rows => {
                        return rows.map(row => {
                            row.text = /.*👍$/.test(row.text) ? chatDetails.UPVOTES + ' 👍'
                            : /.*👎$/.test(row.text) ? chatDetails.DOWNVOTES + ' 👎'
                            : row.text;
                            return row;
                        })
                    });
                }else{
                    ik = [
                        [
                            Markup.button.callback(chatDetails.UPVOTES + ' 👍', `👍#{"cid":${chatDetails.CID}}`),
                            Markup.button.callback(chatDetails.DOWNVOTES + ' 👎', `👎#{"cid":${chatDetails.CID}}`)
                        ],
                        [
                            Markup.button.url('👤 Subscribe', chatDetails.LINK || 'https://telegram.me/' + chatDetails.USERNAME),
                            Markup.button.callback('🚫 Report', `🚫#{"cid":${chatDetails.CID}}`)
                        ]
                    ];
                }
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(ik).reply_markup);
            break;

            //Mark chat as NSFW
            case /^🔞#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(3));

                if(tgbot.user.TGID != process.env.BOT_ADMIN) return;
                //update flag
                if("cid" in cbData){
                    await tgbot.updateChatFlag(cbData.cid, 'NSFW');
                }else if("setId" in cbData){
                    await tgbot.updateSticker(cbData.setId, {FLAG: 'NSFW'});
                }

                //update reply markup
                var ik = ctx.callbackQuery.message.reply_markup.inline_keyboard;
                ik.pop();
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(ik).reply_markup);
            break;

            case /^🚫#{.*}$/.test(key):
                // return if not private chat
                if(ctx.chat?.type != 'private') return;

                var cbData = JSON.parse(key.substr(3));
                var chatDetails = await tgbot.getChatFromDB(cbData?.cid);

                await require('../modules/report').reportChat(chatDetails, ctx.from.id);
            break;

            //Promotion
            case /^📣#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(3));
                var chatDetails = await tgbot.getChatFromDB(cbData.cid);

                // Only lister & admin can request for promotion
                if(chatDetails.LISTERID != tgbot.user.TUID && process.env.BOT_ADMIN != tgbot.user.TGID) return;

                if(chatDetails.UPVOTES + chatDetails.DOWNVOTES < 5){
                    return await ctx.answerCbQuery(commands['ineligibleForPromotion'], {show_alert:true});
                }
                await ctx.answerCbQuery(commands['promotionRequested'], {show_alert:true});
                await bot.telegram.sendMessage(process.env.BOT_ADMIN, `New promotion request for chat ${chatDetails.TITLE}[@${chatDetails.USERNAME}][${chatDetails.LINK}]`,{
                    reply_markup: Markup.inlineKeyboard([
                        [
                            Markup.button.callback('Approve',`📣✅#{"uid":${tgbot.user.TGID}}`),
                            Markup.button.switchToChat('Promote',`cid#${chatDetails.CID}`)
                        ],
                        [
                            Markup.button.callback('Post to Reddit',`📣reddit#{"cid":${chatDetails.CID}}`),
                        ]
                    ]).reply_markup
                });
            break;

            //promotion confirmation to user
            case /^📣✅#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(4));
                await bot.telegram.sendMessage(cbData.uid, commands['promotionAccepted']);
            break;

            //post to reddit
            case /^📣reddit#{.*}$/.test(key):
                //return If not requested by admin
                if(process.env.BOT_ADMIN != tgbot.user.TGID) return;

                var cbData = JSON.parse(key.substr(9));
                var chatDetails = await tgbot.getChatFromDB(cbData.cid);
                sharingLink = `${process.env.TGPAGELINK}?tgcontentid=${cbData.cid}&username=${(chatDetails.USERNAME || '')}`;

                await tgbot.postLinkToReddit(
                    `${chatDetails.TITLE} · 👥 ${chatDetails.SUBSCOUNT || ''} · ${CATEGORIES[chatDetails.CATEGORY]}`,
                    sharingLink
                );
            break;

            default:
                tgbot.logError(ctx.callbackQuery);
                await ctx.reply(commands['unknownError']);
            break;
        }
    } catch (error) {
        ctx.answerCbQuery();
        if(!tgbot.knownErrors(error))
            tgbot.logError(error + JSON.stringify(ctx.update));
    }
    return true;
}

async function sendChatConfirmation(cbData, ctx, tgbot){
    var sharingLink='';
    const chatDetails = await tgbot.getChatFromDB(cbData.cid);
    sharingLink = `${process.env.TGPAGELINK}?tgcontentid=${cbData.cid}&username=${(chatDetails.USERNAME || '')}`;

    //Prepare chat to send for moderation
    var message = `New chat\nLink: ${chatDetails.LINK}\nCategory: ${CATEGORIES[chatDetails.CATEGORY]}\nLanguage: ${chatDetails.CLANGUAGE}\nSharing link: ${sharingLink}`;
    await bot.telegram.sendMessage(process.env.BOT_ADMIN, message, {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('Change category & language',`chooseCategory#{"cid":${cbData.cid}}`)],
            [Markup.button.callback('Remove this chat',`unlist#{"cid":${cbData.cid}}`)],
            [Markup.button.callback('🔞 Mark as NSFW',`🔞#{"cid":${cbData.cid}}`)],
        ]).reply_markup
    });

    //delete message
    await ctx.deleteMessage();

    // Do not send confirmation message if chat listed by moderators
    if(ctx.callbackQuery.from.id == process.env.BOT_ADMIN) return true;

    // Confirmation message reply with sticker & text
    const stickers = tgbot.stickers.celebration;
    await ctx.sendSticker(stickers[
        tgbot.randomInt(stickers.length-1)
    ]);

    message = `<b>Chat listed successfully!</b>\nSharing link: ${sharingLink}\n\n<code><i>Disclaimer:\nChat is sent for moderation and can be removed if any discrepancies found.</i></code>`;
    return await ctx.sendMessage(message, {
        parse_mode:'HTML',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.switchToChat(commands['rateChat'],`cid#${chatDetails.CID}`)],
            [Markup.button.callback(commands['promoteChat'],`📣#{"cid":${chatDetails.CID}}`)],
            [Markup.button.callback(commands['removeChat'], `unlist#{"cid":${chatDetails.CID}}`)]
        ]).reply_markup
    });
}

async function sendStickerConfirmation(cbData, ctx, tgbot){
    var sharingLink='';
    const stickerSet = (await tgbot.searchStickerSet(cbData.setId))[0];
    sharingLink = `${process.env.HOMEURI}telegram-sticker?setid=${cbData.setId}&name=${(stickerSet.NAME || '')}`;

    //delete message
    await ctx.deleteMessage();

    //Prepare chat to send for moderation
    var message = `New sticker\nLink: t.me/addstickers/${stickerSet.NAME}\nCategory: ${CATEGORIES[stickerSet.CATEGORY]}\nLanguage: ${stickerSet.LANGUAGE}\nSharing link: ${sharingLink}`;
    await bot.telegram.sendMessage(process.env.BOT_ADMIN, message, {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('Change category & language',`chooseCategory#{"setId":${cbData.setId}}`)],
            [Markup.button.callback('Remove this sticker',`unlist#{"setId":${cbData.setId}}`)],
            [Markup.button.callback('🔞 Mark as NSFW',`🔞#{"setId":${cbData.setId}}`)],
        ]).reply_markup
    });

    //promote sticker to @sticker3j channel
    try {
        const response = await bot.telegram.sendSticker(
            process.env.STICKERSWORLDCHANNEL,
            ctx.callbackQuery.message.sticker.file_id
        );
        if(response.message_id){
            await tgbot.updateSticker(cbData.setId, {POSTID: response.message_id});
        }
    } catch (error) {
        tgbot.logError(error);
    }

    // confirmation message for user
    message = `<b>Sticker added successfully and shared to @stickers3j channel.</b>\nSharing link: ${sharingLink}\n\n<code><i>Disclaimer:\nSticker is sent for moderation and can be removed if any discrepancies found.</i></code>`;
    return await ctx.sendMessage(message, {
        parse_mode:'HTML'
    });
}
