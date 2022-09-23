const CATEGORIES=["🦁 Animals & Pets","🎎 Anime","🎨 Art & Paintings","📚 Books","🏎 Cars","💼 Career","💃🏼 Celebrity","👨‍👨‍👧‍👦 Community","⛓ Cryptocurrency","👩‍❤️‍👨 Dating","🎓 Educational","🎭 Entertainment","🧐 Facts","💰 Finance","😂 Funny","🎮 Gaming","🃏 GIFs","💻 Hacking","👩‍⚕️ Health","🧛 Horror","🧠 Knowledge","🔮 Life Hacks","💅🏻 Lifestyle","😂 Memes","🎬 Movies","🌞 Motivational","🏕 Nature","📰 News","🤵🏻 Political","🙋🏼 Personal","🖼 Photography","🏋️ Productive","💻 Programming","🔗 Promotion","🌐 Proxy","🗺 Regional","🥰 Relationship","🔬 Science","🎧 Song","📱 Social","🛒 Shopping","🕉 Spiritual","🏀 Sports","🚀 Startup","🏙 Stickers","📈 Stocks","🤴 Stories","📲 Technical","📨 Telegram","💭 Thoughts","💫 Tips & tricks","✈️ Travelling","🧵 Utility","📹 Videos","🎲 Others"];
const LANGUAGES=[{'ar' : 'اللغة العربية'},{ 'bn' : 'বাংলা'},{  'cn' : '中国人'},{'de' : 'Deutsche'},{ 'en' : 'English'},{ 'es' : 'Español'},{ 'fr' : 'Français'},{'gu' : 'ગુજરાતી'},{ 'hi' : 'हिंदी'},{ 'id' : 'Indonesian'},{ 'it' : 'Italiano'},{ 'ja' : '日本語'},{ 'kn' : 'ಕನ್ನಡ'},{ 'ko' : '한국어'},{ 'ky' : 'Кыргызча'},{ 'la' : 'Latine'},{ 'ms' : 'Melayu'},{ 'ml' : 'മലയാളം'},{ 'mr' : 'मराठी'},{ 'ne' : 'नेपाली'},{ 'nl' : 'Deutsch'},{ 'no' : 'norsk'},{ 'pa' : 'ਪੰਜਾਬੀ'},{ 'fa' : 'فارسی'},{ 'pt' : 'Português'},{ 'ru' : 'Pусский'},{ 'sa' : 'संस्कृत'},{ 'sv' : 'svenska'},{ 'ta' : 'தமிழ்'},{ 'te' : 'తెలుగు'},{ 'th' : 'ภาษาไทย'},{ 'tr' : 'Türk'},{ 'uk' : 'Український'},{ 'ur' : 'اردو'},{ 'uz' : 'O\'zbek'},{ 'vi' : 'tiếng Việt'},{ 'mt' : 'multiple'},{'' : 'Other'}];
module.exports.handleCallback = async function (ctx, bot, tgbot, Markup){
    const key = ctx.callbackQuery.data || '';

    switch (true) {
        //menu handlers

        //List chat
        case '💬' === key:
            await ctx.sendMessage('Okay send me the 🔗 link or username of a public chat...');
            break;
        //list stickers
        case '🏞' === key:
            // await ctx.sendMessage('Okay reply with a sticker or send me the name of sticker set following with $.\n\nFor example: $UtyaD');
            await ctx.answerCbQuery('Feature under development.');
        break;
        //Advance search options
        case '🕵️‍♂️' === key:
            await ctx.answerCbQuery('Feature under development.');
        break;
        //FAQ's
        case '❓' === key:
            const {faq} = require('../messages/faq');
            await ctx.editMessageText(faq[tgbot.user.LANGCODE || 'en'],{
                reply_markup : Markup.inlineKeyboard([[Markup.button.callback('◀️ Back','💠')]]).reply_markup
            });
            break;
        //Main menu
        case '💠' === key:
            const {menu} = require('../keyboards/primaryMenu');
            await ctx.editMessageText(`List or explore Telegram chats available in the <a href="https://threej.in/">Telegram Directory</a>\n\nSubscribe to @directorygram and @threej_in`,{
                parse_mode: 'HTML',
                disable_web_page_preview:true,
                reply_markup : Markup.inlineKeyboard(menu(Markup, tgbot.user.TUID)).reply_markup
            });
            break;

        //Update chat details

        //Send category keyboard
        case /^chooseCategory#{.*}$/.test(key):
            const {category} = require('../keyboards/category');
            const cid = JSON.parse(key.substr(15)).cid;

            await ctx.answerCbQuery('Choose category for this chat.');
            await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(category(cid, Markup, CATEGORIES)).reply_markup);
            break;

        //update category and send language keyboard
        case /^updateCategory#{.*}$/.test(key):
            const {language} = require('../keyboards/language');
            var cbData = JSON.parse(key.substr(15));
            var response = await tgbot.updateChat(cbData.cid, cbData.cat);
            if(response){
                await ctx.answerCbQuery('Choose language for this chat.');
                ctx.editMessageReplyMarkup(Markup.inlineKeyboard(language(cbData.cid, Markup, LANGUAGES)).reply_markup);
            }else{
                ctx.sendMessage('Internal error occurred!');
            }
            break;

        //update language, send chat for moderation and reply user with sharing link
        case /^updateLanguage#{.*}$/.test(key):
            const {stickers} = require('../messages/sticker');
            var cbData = JSON.parse(key.substr(15));
            try {
                var response = await tgbot.updateChat(cbData.cid, null, cbData.lang, 'listed');
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
                    //reply with sticker
                    await ctx.sendSticker(stickers.celebration[tgbot.randomInt(stickers.celebration.length-1)]);
                    message = `<b>Chat listed successfully!</b>\nSharing link: ${sharingLink}\n\n<code><i>Disclaimer:\nChat is sent for moderation and can be removed if any discrepancies found.</i></code>`;
                    await ctx.sendMessage(message, {
                        parse_mode:'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.switchToChat('⭐️ Ask subsribers to rate this chat',`cid#${cbData.cid}`)],
                            [Markup.button.callback('📣 Promote chat for free.','📣')],
                            [Markup.button.callback('🗑 Remove this chat from Telegram Directory', `unlist#{"cid":${chatDetails.CID}}`)]
                        ]).reply_markup
                    });
                    return true;
                }
                throw new Error(response);
            } catch (error) {
                tgbot.logError(error);
                ctx.sendMessage('Internal error occurred!');
            }
            break;

        //Remove/Unlist the chat
        case /^unlist#{.*}$/.test(key):
            var cbData = JSON.parse(key.substr(7));
            await tgbot.updateChat(cbData.cid, null, null, 'unlisted');
            await ctx.answerCbQuery('Chat removed from Telegram directory.');
            ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[]]).reply_markup);
        break
        
        //Handle votes
        case /^👍#{.*}$/.test(key) || /^👎#{.*}$/.test(key):
            try {
                var cbData = JSON.parse(key.substr(3));
                var action = key.substr(0,2) === '👍' ? 'UPVOTE' : 'DOWNVOTE';
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
            } catch (error) {/*Ignore this error*/}
        break;
        
        //Mark chat as NSFW
        case /^🔞#{.*}$/.test(key):
            try {
                var cbData = JSON.parse(key.substr(3));
                await tgbot.updateChatFlag(cbData.cid, 'NSFW');
                var ik = ctx.callbackQuery.message.reply_markup.inline_keyboard;
                ik.pop();
                await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(ik).reply_markup);
            } catch (error) {
                tgbot.logError(error);
                return false;
            }
        break;

        case /^🚫#{.*}$/.test(key):
            var cbData = JSON.parse(key.substr(3));
            await ctx.answerCbQuery('Feature under development!');
        break;
        default:
            await ctx.sendMessage('Unkown error occurred!');
            tgbot.logError(ctx.callbackQuery);
            break;
    }
    return true;
}