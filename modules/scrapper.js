const axios = require('axios');
const cheerio = require('cheerio');
const { threej } = require('./threej');

async function scrapChat(username) {
    
    const url = "https://telegram.me/s/" + username;
    const url2 = "https://telegram.me/" + username;

    const res = await getHTML(url);
    chatDetails = scrapChatDetailsAndViews(res.data);

    if(!chatDetails){
        const res2 = await getHTML(url2);
        chatDetails = scrapChatDetails(res2.data);
    }

    return chatDetails;
}

async function getHTML(url){
    const res = await axios({
        url : url,
        headers : {
            "accept": "text/html application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US;q=0.9"
        },
        gzip: true
    })
    return res;
}

/**
 * scraps telegram chat details from provided dom element
 * @param {*} res 
 * @returns {object} with chat details
 */
function scrapChatDetailsAndViews(html){
    try {
        // console.log(res)
        const $ = cheerio.load(html);

        let chatDetails = {};
        //total post loaded
        length = $('body > main > div > section > div').length;

        let views = 0;
        let i =1;
        // Avg post views & approx post count
        for(i;i<=10;i++){
            //store postcount
            i==1 ? chatDetails['postCount'] = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message').attr('data-post').split('/')[1] : '' ;
            t = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message.text_not_supported_wrap.js-widget_message > div.tgme_widget_message_bubble > div.tgme_widget_message_footer.compact.js-message_footer > div > span.tgme_widget_message_views').text();
            if(t == '') break;
            views += threej.stringToInt(t) || 0;
        }
        chatDetails["views"] = views/i;

        //img
        chatDetails['img'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > i > img').attr('src') || '';

        //name
        chatDetails['name'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > div.tgme_channel_info_header_title_wrap > div.tgme_channel_info_header_title > span').text() || '';

        //bio
        chatDetails['bio'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_description').text() || '';

        //chat counters
        let counters={};
        $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_counters > div').each((k,v)=>{
            type = $(v).find('span.counter_type').text();
            value = $(v).find('span.counter_value').text();
            counters[type] = value;
        })
        chatDetails['counters'] = counters;
        return chatDetails;
    } catch (error) {
        return false;
    }
}

function scrapChatDetails(html){
    try {
        // console.log(res)
        const $ = cheerio.load(html);

        let chatDetails = {};

        //img
        chatDetails['img'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_photo > a > img').attr('src') || '';

        //name
        chatDetails['name'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_title > span').text() || '';

        //bio
        chatDetails['bio'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_description').text() || '';

        //chat counters
        chatDetails['counters'] = {
            'subscribers' : $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_extra').text().split(' ')[0]++
        }
        return chatDetails;
    } catch (error) {
        console.log(error)
        return false;
    }
}

module.exports = scrapChat;