const { CHATFLAG } = require("./tgbot");

module.exports.handleReport = async (ctx, tgbot) => {
    const match = ctx.poll.question.match(/^#(\d+) .*$/);
    const options = ctx.poll.options;
    if(match && options){
        var max = 0;
        var flag = 0;
        for (const key in options) {
            if(options[key].voter_count > max){
                flag = parseInt(key);
                max = options[key].voter_count;
            }
        }
        if(++flag > 0){
            return await tgbot.updateChatFlag(match[1], CHATFLAG[flag]);
        }
    }
    return true;
}