const faqs = {
    "en": `<b>Frequently Asked Questions</b>

Q: How Free chat promotion works?
<code>
A: Previously all the newly listed chats were promoted to our different social media accounts. But due to low quality contents, we decided to change the promotion strategy.
And from 25th sept 2022, we are only promoting chats with atleast 5 community votes.
</code>

Q: In which platform chats will be promoted to?

<code>A: Eligible chats will be promoted to following places:</code>
<a href="https://t.me/directorygram">Telegram</a> · <a href="https://telegram.quora.com/">Quora</a> · <a href="https://www.reddit.com/r/Telegram_Directory/">Reddit</a> · <a href="https://www.facebook.com/3jdotin">Facebook</a> · <a href="https://twitter.com/threej_in">Twitter</a>
`
}

module.exports.sendFaqs = async function(ctx, langcode = 'en', method = 'reply', markup = {}) {
    await ctx[method](faqs[langcode || 'en'],{
        parse_mode: 'HTML',
        disable_web_page_preview:true,
        reply_markup: markup
    });
}