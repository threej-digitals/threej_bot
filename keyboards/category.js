const { Markup } = require("telegraf");

module.exports.category = function (id, categories, isSticker = false){ 
    var keyboard = [];
    let i = 0;
    while (i < categories.length) {
        //return keyboard with 3 columns
        var index = Math.floor(i/3);
        if(keyboard[index] == undefined)
            (keyboard[index]=[]).push(Markup.button.callback(categories[i],`updateCategory#{"${isSticker ? 'setId' : 'cid'}":${id}, "cat":"${i}"}`));
        else
            keyboard[index].push(Markup.button.callback(categories[i],`updateCategory#{"${isSticker ? 'setId' : 'cid'}":${id}, "cat":"${i}"}`));
        i++;
    }

    //add cancel button
    var cancelBtn = Markup.button.callback("❌ Cancel",`💠`);
    if(keyboard[Math.floor(i/3)] == undefined)
        (keyboard[Math.floor(i/3)]=[]).push(cancelBtn);
    else
        keyboard[Math.floor(i/3)].push(cancelBtn);
    return Markup.inlineKeyboard(keyboard).reply_markup;
};