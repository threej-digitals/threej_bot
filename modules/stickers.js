const { CATEGORIES } = require("./tgbot");
const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);

module.exports.handleStickers = async (ctx, tgbot) => {
    const commands = require('../messages/commands').commands(tgbot.user.LANGCODE || 'en')[0];

    if(!ctx.message.sticker?.set_name) return;

    //get sticker set from db
    var result = await tgbot.searchStickerSet(ctx.message.sticker.set_name);
    if(typeof result == 'object' && result.length > 0){
        return await ctx.reply('sticker is listed already');
    }

    //get sticker set from telegram
    const set = await bot.telegram.getStickerSet(ctx.message.sticker.set_name);

    //add sticker to db
    result = await tgbot.newStickerSet(set)
    if(typeof result == 'string' || result == false){
        //reply with error
        return await ctx.reply(result || commands['stickerListingFailed']);
    }

    //send category keyboard
    await ctx.reply('Choose category for this sticker');
    return await ctx.sendSticker(
        ctx.message.sticker.file_id || set.stickers[0].file_id,
        {
            reply_markup: tgbot.keyboards.category(result.setId, CATEGORIES, true)
        }
    );
}