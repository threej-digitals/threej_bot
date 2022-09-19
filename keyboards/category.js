module.exports.category = function (cid, Markup, categories){ 
    var keyboard = [];
    let i = 0;
    while (i < categories.length) {
        //return keyboard with 3 columns
        var index = Math.floor(i/3);
        if(keyboard[index] == undefined)
            (keyboard[index]=[]).push(Markup.button.callback(categories[i],`updateCategory#{"cid":${cid}, "cat":"${i}"}`));
        else
            keyboard[index].push(Markup.button.callback(categories[i],`updateCategory#{"cid":${cid}, "cat":"${i}"}`));
        i++;
    }

    //add cancel button
    var cancelBtn = Markup.button.callback("❌ Cancel",`💠`);
    if(keyboard[Math.floor(i/3)] == undefined)
        (keyboard[Math.floor(i/3)]=[]).push(cancelBtn);
    else
        keyboard[Math.floor(i/3)].push(cancelBtn);
    return keyboard;
};