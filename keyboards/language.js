const languages = [{'ar' : 'اللغة العربية'},{ 'bn' : 'বাংলা'},{  'cn' : '中国人'},{'de' : 'Deutsche'},{ 'en' : 'English'},{ 'es' : 'Español'},{ 'fr' : 'Français'},{'gu' : 'ગુજરાતી'},{ 'hi' : 'हिंदी'},{ 'id' : 'Indonesian'},{ 'it' : 'Italiano'},{ 'ja' : '日本語'},{ 'kn' : 'ಕನ್ನಡ'},{ 'ko' : '한국어'},{ 'ky' : 'Кыргызча'},{ 'la' : 'Latine'},{ 'ms' : 'Melayu'},{ 'ml' : 'മലയാളം'},{ 'mr' : 'मराठी'},{ 'ne' : 'नेपाली'},{ 'nl' : 'Deutsch'},{ 'no' : 'norsk'},{ 'pa' : 'ਪੰਜਾਬੀ'},{ 'fa' : 'فارسی'},{ 'pt' : 'Português'},{ 'ru' : 'Pусский'},{ 'sa' : 'संस्कृत'},{ 'sv' : 'svenska'},{ 'ta' : 'தமிழ்'},{ 'te' : 'తెలుగు'},{ 'th' : 'ภาษาไทย'},{ 'tr' : 'Türk'},{ 'uk' : 'Український'},{ 'ur' : 'اردو'},{ 'uz' : 'O\'zbek'},{ 'vi' : 'tiếng Việt'},{ 'mt' : 'multiple'},{'' : 'Other'}];;
module.exports.language = function (cid, Markup){ 
    var keyboard = [];
    while (i < languages.length) {

        keyboard.push([
            Markup.button.callback(languages[i][Object.keys(languages[i])[0]],`updateLanguage#{"cid":${cid}, "lang":"${Object.keys(languages[i++])[0]}"}`),
            Markup.button.callback(languages[i][Object.keys(languages[i])[0]],`updateLanguage#{"cid":${cid}, "lang":"${Object.keys(languages[i++])[0]}"}`),
            Markup.button.callback(languages[i][Object.keys(languages[i])[0]],`updateLanguage#{"cid":${cid}, "lang":"${Object.keys(languages[i++])[0]}"}`)
        ])
    }
    keyboard.push([
        Markup.button.callback('◀️ Back',`chooseCategory#{"cid":${cid}}`)
    ])
    return keyboard;
};