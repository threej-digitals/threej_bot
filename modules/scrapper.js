const axios = require('axios');
const cheerio = require('cheerio');
const { Threej } = require('./threej');

class Scrapper extends Threej{
    constructor(){super()}
    async scrapChat(username) {
        
        const url = "https://telegram.me/s/" + username;

        const res = await this.getHTML(url);
        var chatDetails = this.scrapChatDetailsAndViews(res.data, username);

        if(!chatDetails){
            chatDetails = this.scrapChatDetails(res.data, username);
        }

        return chatDetails;
    }

    async getHTML(url){
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
    scrapChatDetailsAndViews(html, username){
        try {
            // console.log(res)
            const $ = cheerio.load(html);

            let chatDetails = {};
            //total post loaded
            const length = $('body > main > div > section > div').length;
            if(!length) return false;

            let views = 0;
            let i =1;
            // Avg post views & approx post count
            for(i;i<=10;i++){
                //store postcount
                i==1 ? chatDetails['postCount'] = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message').attr('data-post').split('/')[1] : '' ;
                let t = $('body > main > div > section > div:nth-child('+(length-i)+')').find('div.tgme_widget_message.text_not_supported_wrap.js-widget_message > div.tgme_widget_message_bubble > div.tgme_widget_message_footer.compact.js-message_footer > div > span.tgme_widget_message_views').text();
                if(t == '') break;
                views += this.stringToInt(t) || 0;
            }
            chatDetails["views"] = views/i;

            //type
            chatDetails['type'] = 'channel';

            //id
            chatDetails['id'] = -1;
            
            //username
            chatDetails['username'] = username;
            
            //title
            chatDetails['title'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > div.tgme_channel_info_header_title_wrap > div.tgme_channel_info_header_title > span').text() || '';
            
            //description
            chatDetails['description'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_description').html() || '';
            
            //photo
            chatDetails['photo'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > i > img').attr('src') || '';

            //chat counters
            let counters={};
            $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_counters > div').each((k,v)=>{
                const type = $(v).find('span.counter_type').text();
                const value = $(v).find('span.counter_value').text();
                counters[type] = value;
            })
            chatDetails['counters'] = counters;
            return chatDetails;
        } catch (error) {
            console.log(error)
            return false;
        }
    }

    scrapChatDetails(html, username){
        try {
            // console.log(res)
            const $ = cheerio.load(html);

            let chatDetails = {};
            
            //id
            chatDetails['id'] = -1;
            
            //username
            chatDetails['username'] = username;

            //photo
            chatDetails['photo'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_photo > a > img').attr('src') || '';

            //title
            chatDetails['title'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_title > span').text() || '';

            //description
            chatDetails['description'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_description').html() || '';

            //chat counters
            const match = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_extra').text().split(',')[0].replace(/ /g,'').match(/(\d+)([a-z]+)/);
            if(!match){
                chatDetails['type'] = 'bot';
            }else{
                chatDetails['type'] = (match[2] == 'members' ? 'group' : 'channel');
                chatDetails['counters'] = {
                    'subscribers' : match[1]++
                }
            }

            return chatDetails;
        } catch (error) {
            console.log(error)
            return false;
        }
    }
}

module.exports = Scrapper;