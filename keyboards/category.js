const categories = ["🦁 Animals","🎎 Anime","🎨 Art","📚 Books","🏎 Cars","💼 Career","💃🏼 Celebrity","👨‍👨‍👧‍👦 Community","⛓ Cryptocurrency","👩‍❤️‍👨 Dating","🎓 Educational","🎭 Entertainment","🧐 Facts","💰 Finance","😂 Funny","🎮 Gaming","🃏 GIFs","💻 Hacking","👩‍⚕️ Health","🧛 Horror","🧠 Knowledge","🔮 Life Hacks","💅🏻 Lifestyle","😂 Memes","🎬 Movies","🌞 Motivational","🏕 Nature","📰 News","🤵🏻 Political","🙋🏼 Personal","🏋️ Productive","💻 Programming","🔗 Promotion","🌐 Proxy","🗺 Regional","🥰 Relationship","🔬 Science","🎧 Song","📱 Social","🛒 Shopping","🕉 Spiritual","🏀 Sports","🚀 Startup","🏙 Stickers","📈 Stocks","🤴 Stories","📲 Technical","📨 Telegram","💭 Thoughts","💫 Tips & tricks","✈️ Travelling","🧵 Utility","📹 Videos","🎲 Others"];
module.exports.category = function (cid, Markup){ 
    var keyboard = [];
    let i = 0;
    while (i < categories.length) {
        keyboard.push([
            Markup.button.callback(categories[i],`updateCategory#{"cid":${cid}, "cat":${i++}}`),
            Markup.button.callback(categories[i],`updateCategory#{"cid":${cid}, "cat":${i++}}`),
            Markup.button.callback(categories[i],`updateCategory#{"cid":${cid}, "cat":${i++}}`)
        ])
    }
    return keyboard;
};