const cheerio = require('cheerio');
const { threej } = require('./threej');

/**
 * 
 * @param {string} username 
 * @returns {object} Object containing chat details
 */
async function scrapChat(username, chatDetailsFormat) {
    
    const url = "https://telegram.me/s/" + username;

    const res = await threej.getHTML(url);
    var chatDetails = scrapChatDetailsAndViews(res.data, username, chatDetailsFormat);

    if(!chatDetails){
        chatDetails = scrapChatDetails(res.data, username, chatDetailsFormat);
    }

    return chatDetails;
}

/**
 * scraps telegram chat details from provided dom element
 * @param {string} html
 * @returns {object|false} with chat details
 */
function scrapChatDetailsAndViews(html, username, chatDetailsFormat){
    try {
        const $ = cheerio.load(html);

        let chatDetails = chatDetailsFormat;
        //total post loaded
        const length = $('body > main > div > section > div').length;
        if(!length) return false;

        let views = 0;
        let i =1;
        // Avg post views & approx post count
        for(i;i<=10;i++){
            //store postcount
            i==1 ? chatDetails.POSTCOUNT = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message').attr('data-post').split('/')[1] : '' ;
            let t = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message.text_not_supported_wrap.js-widget_message > div.tgme_widget_message_bubble > div.tgme_widget_message_footer.compact.js-message_footer > div > span.tgme_widget_message_views').text();
            if(t == '') break;
            views += threej.rkFormat(t) || 0;
        }
        chatDetails.VIEWS = Math.round(views/i) || views/i;

        //type
        chatDetails.CTYPE = 'channel';
        
        //username
        chatDetails.USERNAME = username;
        
        //title
        chatDetails.TITLE = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > div.tgme_channel_info_header_title_wrap > div.tgme_channel_info_header_title > span').text() || '';
        
        //description
        chatDetails.DESCRIPTION = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_description').html() || '';
        
        //photo
        chatDetails.PHOTO = $('img').attr('src') || '';

        //link
        chatDetails.LINK = 'https://telegram.me/' + username;

        //chat counters
        $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_counters > div').each((k,v)=>{
            const type = $(v).find('span.counter_type').text();
            const value = $(v).find('span.counter_value').text();
            const key = 
                /photos?/i.test(type) ? 'PICSCOUNT'
                : /videos?/i.test(type) ? 'VIDEOSCOUNT'
                : /files?/i.test(type) ? 'FILECOUNT'
                : /links?/i.test(type) ? 'LINKSCOUNT'
                : /subscribers?/i.test(type) ? 'SUBSCOUNT'
                : '';
                chatDetails[key] = threej.rkFormat(value);
        })
        return chatDetails;
    } catch (error) {
        threej.logError(error);
        return false;
    }
}

/**
 * scraps telegram chat details from provided dom element
 * @param {string} html
 * @returns {object|false} with chat details
 */
function scrapChatDetails(html, username, chatDetailsFormat){
    try {
        const $ = cheerio.load(html);

        let chatDetails = chatDetailsFormat;
        
        //username
        chatDetails.USERNAME = username;

        //title
        chatDetails.TITLE = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_title > span').text() || '';

        //description
        chatDetails.DESCRIPTION = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_description').html() || '';

        //photo
        chatDetails.PHOTO = $('img').attr('src') || '';

        //link
        chatDetails.LINK = 'https://telegram.me/' + username;

        //chat counters
        const match = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_extra').text().split(',')[0].replace(/ /g,'').match(/(\d+)([a-z]+)/);
        if(!match){
            chatDetails.CTYPE = 'bot';
        }else{
            chatDetails.CTYPE = (match[2] == 'members' ? 'group' : (match[2] == 'subscribers' ? 'channel' : 'bot'));
            if(chatDetails.CTYPE !== 'bot'){
                chatDetails.SUBSCOUNT = match[1]++
            }
        }
        if(chatDetails.TITLE === '' && chatDetails.TITLE === ''){
            return false;
        }

        return chatDetails;
    } catch (error) {
        threej.logError(error);
        return false;
    }
}

module.exports = { scrapChat };