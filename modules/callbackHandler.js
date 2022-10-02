const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

const CATEGORIES=["🦁 Animals & Pets","🎎 Anime","🎨 Art & Paintings","📚 Books","🏎 Cars","💼 Career","💃🏼 Celebrity","👨‍👨‍👧‍👦 Community","⛓ Cryptocurrency","👩‍❤️‍👨 Dating","🎓 Educational","🎭 Entertainment","🧐 Facts","💰 Finance","😂 Funny","🎮 Gaming","🃏 GIFs","💻 Hacking","👩‍⚕️ Health","🧛 Horror","🧠 Knowledge","🔮 Life Hacks","💅🏻 Lifestyle","😂 Memes","🎬 Movies","🌞 Motivational","🏕 Nature","📰 News","🤵🏻 Political","🙋🏼 Personal","🖼 Photography","🏋️ Productive","💻 Programming","🔗 Promotion","🌐 Proxy","🗺 Regional","🥰 Relationship","🔬 Science","🎧 Song","📱 Social","🛒 Shopping","🕉 Spiritual","🏀 Sports","🚀 Startup","🏙 Stickers","📈 Stocks","🤴 Stories","📲 Technical","📨 Telegram","💭 Thoughts","💫 Tips & tricks","✈️ Travelling","🧵 Utility","📹 Videos","🎲 Others"];
const LANGUAGES=[{'ar' : 'اللغة العربية'},{ 'bn' : 'বাংলা'},{  'cn' : '中国人'},{'de' : 'Deutsche'},{ 'en' : 'English'},{ 'es' : 'Español'},{ 'fr' : 'Français'},{'gu' : 'ગુજરાતી'},{ 'hi' : 'हिंदी'},{ 'id' : 'Indonesian'},{ 'it' : 'Italiano'},{ 'ja' : '日本語'},{ 'kn' : 'ಕನ್ನಡ'},{ 'ko' : '한국어'},{ 'ky' : 'Кыргызча'},{ 'la' : 'Latine'},{ 'ms' : 'Melayu'},{ 'ml' : 'മലയാളം'},{ 'mr' : 'मराठी'},{ 'ne' : 'नेपाली'},{ 'nl' : 'Deutsch'},{ 'no' : 'norsk'},{ 'pa' : 'ਪੰਜਾਬੀ'},{ 'fa' : 'فارسی'},{ 'pt' : 'Português'},{ 'ru' : 'Pусский'},{ 'sa' : 'संस्कृत'},{ 'sv' : 'svenska'},{ 'ta' : 'தமிழ்'},{ 'te' : 'తెలుగు'},{ 'th' : 'ภาษาไทย'},{ 'tr' : 'Türk'},{ 'uk' : 'Український'},{ 'ur' : 'اردو'},{ 'uz' : 'O\'zbek'},{ 'vi' : 'tiếng Việt'},{ 'mt' : 'multiple'},{'' : 'Other'}];

module.exports.handleCallback = async function (ctx, tgbot){
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en');
    const key = ctx.callbackQuery.data || '';

    try {
        switch (true) {
            //menu handlers

            //List chat
            case '💬' === key:
                await ctx.reply(commands['addNewChat']);
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
            case '💠' === key:9
                const {menu} = require('../keyboards/primaryMenu');
                try {
                    await ctx.editMessageText(commands['start'],{
                        parse_mode: 'HTML',
                        disable_web_page_preview:true,
                        reply_markup : Markup.inlineKeyboard(menu(Markup)).reply_markup
                    });
                } catch (error) {
                    await ctx.deleteMessage();
                    await ctx.reply(commands['start'],{
                        parse_mode: 'HTML',
                        disable_web_page_preview:true,
                        reply_markup : Markup.inlineKeyboard(menu(Markup)).reply_markup
                    });
                }
                break;

            //Claim ownership
            case '👮' === key:
                await ctx.answerCbQuery(commands['claimOwnership'], {show_alert:true});
            break;

            //Update chat details

            //Send category keyboard
            case /^chooseCategory#{.*}$/.test(key):
                const {category} = require('../keyboards/category');
                const cid = JSON.parse(key.substr(15)).cid;
                var chatDetails = await tgbot.getChatFromDB(cid);

                // return if not lister
                if(chatDetails.LISTERID != tgbot.user.TUID) return;

                await ctx.answerCbQuery(commands['chooseCategory']);
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(category(cid, Markup, CATEGORIES)).reply_markup);
                break;

            //update category and send language keyboard
            case /^updateCategory#{.*}$/.test(key):
                const {language} = require('../keyboards/language');
                var cbData = JSON.parse(key.substr(15));
                var response = await tgbot.updateChat(cbData.cid, {category:cbData.cat});
                if(response){
                    await ctx.answerCbQuery(commands['chooseLanguage']);
                    ctx.editMessageReplyMarkup(Markup.inlineKeyboard(language(cbData.cid, Markup, LANGUAGES)).reply_markup);
                }else{
                    ctx.sendMessage(commands['internalError']);
                }
                break;

            //update language, send chat for moderation and reply user with sharing link
            case /^updateLanguage#{.*}$/.test(key):
                const {stickers} = require('../messages/sticker');
                var cbData = JSON.parse(key.substr(15));
                var response = await tgbot.updateChat(cbData.cid, {language: cbData.lang, status: 'listed'});
                if(response){
                    var sharingLink='';
                    const chatDetails = await tgbot.getChatFromDB(cbData.cid);
                    sharingLink = `${process.env.TGPAGELINK}?tgcontentid=${cbData.cid}&username=${(chatDetails['USERNAME'] || '')}`

                    //Prepare chat to send for moderation
                    var message = `New chat\nLink: ${chatDetails['LINK']}\nCategory: ${CATEGORIES[chatDetails['CATEGORY']]}\nLanguage: ${chatDetails['CLANGUAGE']}\nSharing link: ${sharingLink}`;
                    await bot.telegram.sendMessage(process.env.BOT_ADMIN, message, {
                        parse_mode: "HTML",
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('Change category & language',`chooseCategory#{"cid":${cbData.cid}}`)],
                            [Markup.button.callback('Remove this chat',`unlist#{"cid":${cbData.cid}}`)],
                            [Markup.button.callback('🔞 Mark as NSFW',`🔞#{"cid":${cbData.cid}}`)],
                        ]).reply_markup
                    });

                    //remove langauge keyboard
                    ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup);

                    // Do not send confirmation message if chat listed by moderators
                    if(ctx.callbackQuery.from.id == process.env.BOT_ADMIN) return true;

                    // Confirmation message reply with sticker & text
                    await ctx.sendSticker(stickers.celebration[tgbot.randomInt(stickers.celebration.length-1)]);
                    message = `<b>Chat listed successfully!</b>\nSharing link: ${sharingLink}\n\n<code><i>Disclaimer:\nChat is sent for moderation and can be removed if any discrepancies found.</i></code>`;
                    return await ctx.sendMessage(message, {
                        parse_mode:'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.switchToChat('⭐️ Ask subsribers to rate this chat',`cid#${cbData.cid}`)],
                            [Markup.button.callback('📣 Promote chat for free.','📣')],
                            [Markup.button.callback('🗑 Remove this chat from Telegram Directory', `unlist#{"cid":${chatDetails.CID}}`)]
                        ]).reply_markup
                    });
                }
                throw new Error(response);
            break;

            //Remove/Unlist the chat
            case /^unlist#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(7));
                await tgbot.updateChat(cbData.cid, {status:'unlisted'});
                await ctx.answerCbQuery('Chat removed from Telegram directory.');
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
                    //update counters in inline keyboard
                    for (const key in ik) {
                        for (const key2 in ik[key]) {
                            if(/.*👍$/.test(ik[key][key2].text)){
                                ik[key][key2].text = chatDetails.UPVOTES + ' 👍';
                            }
                            if(/.*👎$/.test(ik[key][key2].text)){
                                ik[key][key2].text = chatDetails.DOWNVOTES + ' 👎';
                            }
                        }
                    }
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
                    ]
                }
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(ik).reply_markup);
            break;
            
            //Mark chat as NSFW
            case /^🔞#{.*}$/.test(key):
                var cbData = JSON.parse(key.substr(3));

                if(tgbot.user.TGID != process.env.BOT_ADMIN) return;
                //update flag
                await tgbot.updateChatFlag(cbData.cid, 'NSFW');

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
                sharingLink = `${process.env.TGPAGELINK}?tgcontentid=${cbData.cid}&username=${(chatDetails['USERNAME'] || '')}`;
                
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
            tgbot.logError(error);
    }
    return true;
}