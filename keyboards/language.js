module.exports.language = function (cid, Markup, languages){ 
    //add back & close buttons
    languages.push({'◀️':'◀️ Back'},{'💠':'❌ Cancel'});

    var keyboard = [];
    var i = 0;
    while (i < languages.length) {
        var index = Math.floor(i/3);
        var code = Object.keys(languages[i])[0];
        //condition for choosing back & close button callback
        var callback = '💠' == code ? '💠' : ('◀️' == code ? `chooseCategory#{"cid":${cid}}` : `updateLanguage#{"cid":${cid}, "lang":"${code}"}`);
        
        if(keyboard[index] == undefined)
            (keyboard[index]=[]).push(Markup.button.callback(languages[i][code], callback));
        else
            keyboard[index].push(Markup.button.callback(languages[i][code], callback));
        i++;
    }

    return keyboard;
};