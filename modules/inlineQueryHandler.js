const { Markup } = require("telegraf");
const { CHATSTATUS, CATEGORIES } = require("./tgbot");

const LANGUAGES={'ar' : 'اللغة العربية', 'bn' : 'বাংলা',  'cn' : '中国人','de' : 'Deutsche', 'en' : 'English', 'es' : 'Español', 'fr' : 'Français','gu' : 'ગુજરાતી', 'hi' : 'हिंदी', 'id' : 'Indonesian', 'it' : 'Italiano', 'ja' : '日本語', 'kn' : 'ಕನ್ನಡ', 'ko' : '한국어', 'ky' : 'Кыргызча', 'la' : 'Latine', 'ms' : 'Melayu', 'ml' : 'മലയാളം', 'mr' : 'मराठी', 'ne' : 'नेपाली', 'nl' : 'Deutsch', 'no' : 'norsk', 'pa' : 'ਪੰਜਾਬੀ', 'fa' : 'فارسی', 'pt' : 'Português', 'ru' : 'Pусский', 'sa' : 'संस्कृत', 'sv' : 'svenska', 'ta' : 'தமிழ்', 'te' : 'తెలుగు', 'th' : 'ภาษาไทย', 'tr' : 'Türk', 'uk' : 'Український', 'ur' : 'اردو', 'uz' : 'O\'zbek', 'vi' : 'tiếng Việt', 'mt' : 'multiple','' : 'Other'};
module.exports.handleInlineQueries = async (ctx, tgbot) => {
    const query = ctx.inlineQuery.query || '';

    //No result for queries with length < 3
    if(query.length < 3){
        await ctx.answerInlineQuery([{
            type: 'article',
            id:1,
            title:'🛑 Please enter atleast 3 characters',
            input_message_content:{
                message_text :'No result'
            }
        }], {cache_time : 315360000});
    }

    switch (true) {
        case 'myContents' === query:
            try {
                const chats = await tgbot.getUserContents();
                var result = [];
                chats.forEach(chat =>{
                    //strip html tags
                    chat.DESCRIPTION = chat.DESCRIPTION.replace(/<[^>]*>?/gm, '');
                    if(typeof chat.CATEGORY != 'number' || chat.CATEGORY > (CATEGORIES.length-1)){
                        chat.CATEGORY = (CATEGORIES.length - 1);
                    }
                    result.push({
                        type : 'photo',
                        id: chat.CID,
                        photo_url: process.env.HOMEURI + chat.PHOTO || '',
                        thumb_url: process.env.HOMEURI + chat.PHOTO || '',
                        title: chat.TITLE || '',
                        description: `@${chat.USERNAME || ''} [${chat.SUBSCOUNT} Subscribers]`,
                        caption: `<b>${chat.TITLE || ''}</b>\n@${chat.USERNAME || ''}\n·\n👥 ${chat.SUBSCOUNT} · ${CATEGORIES[chat.CATEGORY].replace(' ',' #')} · 🗣 #${LANGUAGES[chat.CLANGUAGE]}\n ·\n<i>${chat.DESCRIPTION}</i>`,
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback((chat.UPVOTES || 0) + ' 👍', `👍#{"cid":${chat.CID}}`),
                                Markup.button.callback((chat.DOWNVOTES || 0) + ' 👎', `👎#{"cid":${chat.CID}}`)
                            ],
                            [
                                Markup.button.url('👤 Subscribe', chat.LINK || 'https://telegram.me/' + chat.USERNAME),
                                Markup.button.url('🚫 Report', `https://t.me/${process.env.BOT_USERNAME.substring(1)}?start=${Buffer.from('cid='+chat.CID+'&report=true').toString('base64')}`)
                            ]
                        ]).reply_markup,
                        parse_mode: 'HTML',
                    });
                })
                //show user contents
                await ctx.answerInlineQuery(result)
                
            } catch (error) {
                tgbot.logError(error);
            }
        break;
        case /^cid#\d+/.test(query):
            try {
                const chatid = query.substr(4);
                const chatDetails = await tgbot.getChatFromDB(chatid);
                if(chatDetails.STATUS != CHATSTATUS.listed){
                    return await ctx.answerInlineQuery([{
                        type: 'article',
                        id:1,
                        title:'🛑 Chat not found',
                        input_message_content:{
                            message_text :'No result'
                        }
                    }]);
                }
                //strip html tags
                chatDetails.DESCRIPTION = chatDetails.DESCRIPTION.replace(/<[^>]*>?/gm, '');
                const chatTypeEmoji = chatDetails.CTYPE == 'channel' ? '📢' : chatDetails.CTYPE == 'bot' ? '🤖' : '👥';
                //send chat detail with 1hr caching period
                await ctx.answerInlineQuery([
                    {
                        type : 'photo',
                        id: chatid,
                        photo_url: process.env.HOMEURI + chatDetails.PHOTO || '',
                        thumb_url: process.env.HOMEURI + chatDetails.PHOTO || '',
                        title: chatDetails.TITLE || '',
                        description: `@${chatDetails.USERNAME || ''} [${chatDetails.SUBSCOUNT} Subscribers]`,
                        caption: `${chatTypeEmoji}<b>${chatDetails.TITLE || ''}</b>\n@${chatDetails.USERNAME || ''}\n·\n👥 ${chatDetails.SUBSCOUNT} · ${CATEGORIES[chatDetails.CATEGORY].replace(' ',' #')} · 🗣 #${LANGUAGES[chatDetails.CLANGUAGE]}\n ·\n<i>${chatDetails.DESCRIPTION}</i>`,
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback((chatDetails.UPVOTES || 0) + ' 👍', `👍#{"cid":${chatDetails.CID}}`),
                                Markup.button.callback((chatDetails.DOWNVOTES || 0) + ' 👎', `👎#{"cid":${chatDetails.CID}}`)
                            ],
                            [
                                Markup.button.url('👤 Subscribe', chatDetails.LINK || 'https://telegram.me/' + chatDetails.USERNAME),
                                Markup.button.url('🚫 Report', `https://t.me/${process.env.BOT_USERNAME.substring(1)}?start=${Buffer.from('cid='+chatDetails.CID+'&report=true').toString('base64')}`)
                            ]
                        ]).reply_markup,
                        parse_mode: 'HTML',
                    }
                ],{
                    cache_time: 3600
                })
                
            } catch (error) {
                tgbot.logError(error);
            }
        break;
        //Handle simple queries
        case true:
            try {
                const chatTypes = {
                    "c":"channel",
                    "g":"group",
                    "b":"bot"
                }
                var qry = query;
                if(match = query.match(/^([a-z]) (.*)/)){
                    var chatType = chatTypes[match[1]] || '';
                    qry = match[2];
                }
                const chats = await tgbot.searchChatsInDB(qry, chatType);

                var result = [];
                chats.forEach(chat => {
                    //strip html tags
                    chat.DESCRIPTION = chat.DESCRIPTION.replace(/<[^>]*>?/gm, '');
                    if(typeof chat.CATEGORY != 'number' || chat.CATEGORY > (CATEGORIES.length-1)){
                        chat.CATEGORY = (CATEGORIES.length - 1);
                    }
                    result.push({
                        type : 'article',
                        id: chat.CID,
                        title: chat.TITLE || '',
                        description: `@${chat.USERNAME || ''} [${chat.SUBSCOUNT} Subscribers]`,
                        input_message_content: {
                            message_text: `\n\n<b>${chat.TITLE || ''}</b>\n@${chat.USERNAME || ''}\n\n👥 ${chat.SUBSCOUNT} · ${CATEGORIES[chat.CATEGORY].replace(' ',' #')} · 🗣 #${LANGUAGES[chat.CLANGUAGE]}\n\n<i>${chat.DESCRIPTION}</i><a href="${process.env.TGPAGELINK}?tgcontentid=${chat.CID}&username=${chat.USERNAME || ''}">.</a>`,
                            parse_mode: 'HTML'
                        },
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback((chat.UPVOTES || 0) + ' 👍', `👍#{"cid":${chat.CID}}`),
                                Markup.button.callback((chat.DOWNVOTES || 0) + ' 👎', `👎#{"cid":${chat.CID}}`)
                            ],
                            [
                                Markup.button.url('👤 Subscribe', chat.LINK || 'https://telegram.me/' + chat.USERNAME),
                                Markup.button.url('🚫 Report', `https://t.me/${process.env.BOT_USERNAME.substring(1)}?start=${Buffer.from('cid='+chat.CID+'&report=true').toString('base64')}`)
                            ]
                        ]).reply_markup,
                        thumb_url: process.env.HOMEURI + chat.PHOTO || '',
                        hide_url: true
                    })
                });
                //send reuslt with 1hr caching period
                await ctx.answerInlineQuery(result,{cache_time:3600});
                
            } catch (error) {
                if(!tgbot.knownErrors(error))
                    tgbot.logError(error + JSON.stringify(ctx.update));
            }
        break;
    }
    return true;
}