const { CATEGORIES } = require("./tgbot");
const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);

module.exports.handleStickers = async (ctx, tgbot) => {
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];

    if(!ctx.message.sticker?.set_name) return;

    //get sticker set from db
    var result = await tgbot.searchStickerSet(ctx.message.sticker.set_name);
    if(typeof result == 'object' && result.length == 0){

        //get sticker set from telegram
        const set = await bot.telegram.getStickerSet(ctx.message.sticker.set_name);

        //add sticker to db
        result = await tgbot.newStickerSet(set)
        if(typeof result == 'string' || result == false){
            //reply with error
            return await ctx.reply(result || commands['stickerListingFailed']);
        }

        //get stickerset from db
        result = await tgbot.searchStickerSet(result.setId);
    }
    
    if(typeof result == 'object' && result.length > 0){
        result = result[0];

        if(
            result.LANGUAGE == '' ||
            result.POSTID == 0 ||
            ctx.chat.id == process.env.BOT_ADMIN
        ){
            //send keyboard for stickers configuration
            await ctx.reply('Choose category for this sticker');

            var stickerThumb = '';
            if(!(ctx.message.sticker.file_id || result.THUMB)){
                stickerThumb = await tgbot.query('SELECT FILEID FROM ?? WHERE SETID = ? LIMIT 1',[
                    process.env.STICKERSTABLE,
                    result.SETID
                ])
                stickerThumb = stickerThumb[0].FILEID
            }else{
                stickerThumb = ctx.message.sticker.file_id || result.THUMB;
            }

            return await ctx.sendSticker(
                stickerThumb,
                {
                    reply_markup: tgbot.keyboards.category(result.SETID, CATEGORIES, true)
                }
            );
        }else{
            return await ctx.reply('Sticker listed already');
        }
    }

    await ctx.reply(commands['stickerListingFailed']);
    return tgbot.logError(JSON.stringify(result) +  JSON.stringify(ctx.update));
}