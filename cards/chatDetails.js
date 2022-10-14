const { Markup } = require('telegraf');
const {MEMBERSTATUS, CHATSTATUS, CHATFLAG} = require('../modules/tgbot');
module.exports.chatDetailsCard = function (chatDetails, tgbot) {
    //----Format chat details as text message----//
    var text = '<b>Verify chat details</b>\n\n';
    const values = {
        TITLE:'Title      :',
        DESCRIPTION :'Description:',
        SUBSCOUNT:'Subscribers:',
        USERNAME:'Username   :',
        LINK:'Link       :',
        CTYPE:'Type       :',
        FLAG:'Flag       :'
    }
    for(const e in values){
        //strip html tags from description
        if(e === 'DESCRIPTION') chatDetails[e] = (chatDetails[e] || '').replace(/<[^>]*>?/gm, '');
        if(e === 'USERNAME' && chatDetails[e] !== '' && chatDetails[e] !== null) chatDetails[e] = '@' + chatDetails[e];
        if(e === 'FLAG') chatDetails[e] = CHATFLAG[chatDetails[e] || 0];
        text += `<code>${values[e]}</code> ${(chatDetails[e] || '').toString()}\n`;
    }

    //-----Prepare inline keyboard-----//
    var keyboardArray = [];

    //Keyboard with general options for all user
    if(chatDetails.STATUS == CHATSTATUS.listed){
        keyboardArray.push(Markup.button.callback((chatDetails.UPVOTES || 0) + ' 👍', `👍#{"cid":${chatDetails.CID}}`));
        keyboardArray.push(Markup.button.callback((chatDetails.DOWNVOTES || 0) + ' 👎', `👎#{"cid":${chatDetails.CID}}`));
    }

    //Keyboard for user other then lister if lister is not creator
    if(chatDetails.LISTERROLE != MEMBERSTATUS['creator'] && tgbot.user.TUID !== chatDetails.LISTERID){

        text += `<b><i>\n\n🛑 NOTE 🛑\nChat is already listed by other user. To claim this chat add the bot to your chat as admin by clicking on the "claim ownership" button below 👇</i></b>`;
        keyboardArray.push(Markup.button.url('👮 Claim ownership', `https://t.me/${process.env.BOT_USERNAME.substring(1)}?startgroup=claimchat`));
    }

    //keyboard for existing chats only visible to lister & bot admin
    if(CHATSTATUS.listed == chatDetails.STATUS && (tgbot.user.TUID == chatDetails.LISTERID || tgbot.user.TGID == process.env.BOT_ADMIN)){
        keyboardArray.push(Markup.button.callback('📣 Promote', `📣#{"cid":${chatDetails.CID}}`));
        keyboardArray.push(Markup.button.callback('🗑 Remove chat', `unlist#{"cid":${chatDetails.CID}}`));
    }

    if(chatDetails.STATUS == CHATSTATUS.listed){
        keyboardArray.push(Markup.button.url('💬 Similar chats', `${process.env.TGPAGELINK}?tgcontentid=${chatDetails.CID}&username=${(chatDetails.USERNAME || '').replace('@','')}`));
        keyboardArray.push(Markup.button.switchToChat('↗️ Share', `cid#${chatDetails.CID}`));
        keyboardArray.push(Markup.button.callback('🚫 Report', `🚫#{"cid":${chatDetails.CID}}`));
        keyboardArray.push(Markup.button.callback('❌ Cancel', '💠'));
    }

    //keyboard for new chats only visible to lister
    if([CHATSTATUS.new, CHATSTATUS.unlisted].includes(parseInt(chatDetails.STATUS)) && tgbot.user.TUID == chatDetails.LISTERID){
        keyboardArray = [Markup.button.callback('✅ List this chat to Telegram Directory', `chooseCategory#{"cid":${chatDetails.CID}}`)];
    }
    var markup = []; var i = 0;
    keyboardArray.forEach(e =>{
        var index = Math.floor(i/2);
        if(markup[index] == undefined)
            (markup[index]=[]).push(e);
        else
            markup[index].push(e);
        i++;
    })
    return {text, markup, Markup};
}