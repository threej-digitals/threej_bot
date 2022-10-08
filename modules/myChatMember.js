module.exports.myChatMember = async (ctx, tgbot) => {
    // bot removed from chat
    if(ctx.myChatMember.new_chat_member.status == 'left'){
        return;

    // User blocked the bot update user status
    }else if(
        ctx.myChatMember.chat.type == 'private' &&
        ctx.myChatMember.new_chat_member.status == 'kicked' &&
        ctx.myChatMember.new_chat_member.user.username == ctx.me
    ){
        return await tgbot.updateUserPreference('blocked');
    //Bot added to chat
    }else if(
        ctx.myChatMember.chat.type != 'private' &&
        ['administrator','member'].includes(ctx.myChatMember.new_chat_member.status)
    ){

        const chatMember = await bot.telegram.getChatMember(ctx.myChatMember.chat.id, ctx.myChatMember.from.id)
        var chatDetails = {};
        if(typeof ctx.myChatMember.chat.username == 'string'){
            chatDetails = await tgbot.updateAndGetChat(
                {
                    id: ctx.myChatMember.chat.id,
                    username: ctx.myChatMember.chat.username
                },
                tgbot,
                chatMember.status
            );
        }else{
            chatDetails = await tgbot.updateAndGetChat(
                { id: ctx.myChatMember.chat.id },
                tgbot,
                chatMember.status
            );
        }
    
        ctx.chat.id = ctx.myChatMember.from.id;
        if(typeof chatDetails == 'string'){
            return await ctx.reply(chatDetails, {parse_mode: 'HTML'});
        }
        return await tgbot.sendFormattedChatDetails(ctx, chatDetails);
    }
}