const axios = require('axios');
const cheerio = require('cheerio');
const { Threej } = require('./threej');

class Scrapper extends Threej{
    constructor(){
        super()
        // Format for chatDetails object
        this.chatDetails = {
            'listerId' : -1,
            'listerRole' : -1,
            'id' : false,
            'username' : false,
            'title' : '',
            'description' : '',
            'link': '',
            'photo' : '',
            'type': '',
            'status': 0,
            'postCount':false,
            'views' : false,
            'subscribers' : false,
            'photos' : false,
            'videos' : false,
            'links' : false,
            'files' : false,
        }
    }

    /**
     * 
     * @param {string} username 
     * @returns {object} Object containing chat details
     */
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
     * @param {string} html
     * @returns {object|false} with chat details
     */
    scrapChatDetailsAndViews(html, username){
        try {
            // console.log(res)
            const $ = cheerio.load(html);

            let chatDetails = this.chatDetails;
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
                views += this.rkFormat(t) || 0;
            }
            chatDetails["views"] = Math.round(views/i) || views/i;

            //type
            chatDetails['type'] = 'channel';
            
            //username
            chatDetails['username'] = username;
            
            //title
            chatDetails['title'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > div.tgme_channel_info_header_title_wrap > div.tgme_channel_info_header_title > span').text() || '';
            
            //description
            chatDetails['description'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_description').html() || '';
            
            //photo
            chatDetails['photo'] = $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_header > i > img').attr('src') || '';

            //link
            chatDetails['link'] = 'https://telegram.me/' + username;

            //chat counters
            $('body > header > div > div.tgme_header_right_column > section > div > div.tgme_channel_info_counters > div').each((k,v)=>{
                const type = $(v).find('span.counter_type').text();
                const value = $(v).find('span.counter_value').text();
                chatDetails[type] = this.rkFormat(value);
            })
            if(chatDetails.file){
                chatDetails.files = chatDetails.file;
                chatDetails.file = undefined;
            }
            return chatDetails;
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * scraps telegram chat details from provided dom element
     * @param {string} html
     * @returns {object|false} with chat details
     */
    scrapChatDetails(html, username){
        try {
            // console.log(res)
            const $ = cheerio.load(html);

            let chatDetails = this.chatDetails;
            
            //username
            chatDetails['username'] = username;

            //title
            chatDetails['title'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_title > span').text() || '';

            //description
            chatDetails['description'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_description').html() || '';

            //photo
            chatDetails['photo'] = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_photo > a > img').attr('src') || '';

            //link
            chatDetails['link'] = 'https://telegram.me/' + username;

            //chat counters
            const match = $('body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_extra').text().split(',')[0].replace(/ /g,'').match(/(\d+)([a-z]+)/);
            if(!match){
                chatDetails['type'] = 'bot';
            }else{
                chatDetails['type'] = (match[2] == 'members' ? 'group' : (match[2] == 'subscribers' ? 'channel' : 'bot'));
                if(chatDetails['type'] !== 'bot'){
                    chatDetails['subscribers'] = match[1]++
                }
            }
            if(chatDetails['title'] === '' && chatDetails['title'] === ''){
                return false;
            }

            return chatDetails;
        } catch (error) {
            this.logError(error);
            return false;
        }
    }
}

scrapper = new Scrapper();
module.exports = scrapper;