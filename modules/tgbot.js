const axios = require('axios');
const qs = require('qs');
const { Threej } = require('./threej');

const CATEGORIES = ["🦁 Animals & Pets","🎎 Anime","🎨 Art & Paintings","📚 Books","🏎 Cars","💼 Career","💃🏼 Celebrity","👨‍👨‍👧‍👦 Community","⛓ Cryptocurrency","👩‍❤️‍👨 Dating","🎓 Educational","🎭 Entertainment","🧐 Facts","💰 Finance","😂 Funny","🎮 Gaming","🃏 GIFs","💻 Hacking","👩‍⚕️ Health","🧛 Horror","🧠 Knowledge","🔮 Life Hacks","💅🏻 Lifestyle","😂 Memes","🎬 Movies","🌞 Motivational","🏕 Nature","📰 News","🤵🏻 Political","🙋🏼 Personal","🖼 Photography","🏋️ Productive","💻 Programming","🔗 Promotion","🌐 Proxy","🗺 Regional","🥰 Relationship","🔬 Science","🎧 Song","📱 Social","🛒 Shopping","🕉 Spiritual","🏀 Sports","🚀 Startup","🏙 Stickers","📈 Stocks","🤴 Stories","📲 Technical","📨 Telegram","💭 Thoughts","💫 Tips & tricks","✈️ Travelling","🧵 Utility","📹 Videos","🎲 Others",""];

/**
 * Chat action
 */
const CHATACTION = {
    'UPVOTE' : 1,
    'DOWNVOTE' : 2
}

/**
 * Flags for reporting contents
 */
const CHATFLAG = ['SFW','Copyright','NSFW','Spam','Scam','Illegal Activities','Violence','Child Abuse','Dead chat'];

/**
 * Chat status object
 */
const CHATSTATUS = {
    'new' : 1,
    'listed' : 2,
    'unlisted' : 3
}

/**
 * Chat member status as per telegram API
 */
 const MEMBERSTATUS = {
    'creator' : 1,
    'administrator' : 2,
    'member' : 3,
    'left' : 4,
    'restricted' : 5,
    'kicked' : 6,
}

const STICKERTYPE = {
    'regular' : 1,
    'mask' : 2,
    'custom_emoji' : 3
}

/**
 * User preferences
 */
 const USERPREFERENCES = {
    '' : 1,
    'NOUPDATES' : 2,
    'BLOCKED' : 3
}

class Tgbot extends Threej{

    // object to store chatDetails
    chatDetails = {};

    // Chat details schema
    chatDetailsFormat = {
        'LISTERID' : 0,
        'LISTERROLE' : 0,
        'CHATID' : false,
        'USERNAME' : false,
        'TITLE' : '',
        'DESCRIPTION' : '',
        'LINK': '',
        'PHOTO' : '',
        'CTYPE': '',
        'STATUS': 0,
        'POSTCOUNT':false,
        'VIEWS' : false,
        'SUBSCOUNT' : false,
        'PICSCOUNT' : false,
        'VIDEOSCOUNT' : false,
        'LINKSCOUNT' : false,
        'FILECOUNT' : false,
    };

    // Inline keyboards
    keyboards = {
        primaryMenu : require('../keyboards/primaryMenu').menu,
        secondaryMenu : require('../keyboards/secondaryMenu').menu,
        category : require('../keyboards/category').category,
        language : require('../keyboards/language').language
    };

    // Categorized stickers object
    stickers = require('../messages/sticker').stickers;

    // object to store user details when user is logged In
    user = {};


    // Broadcast function
    broadcast = require('./broadcast').broadcast;

    // Get new chat or update existing chat
    updateAndGetChat = require('./newChat').updateAndGetChat;

    // constructor
    constructor(adminId){
        super()

        if(typeof adminId != 'number')
            throw new Error('Invalid adminId');

        this.admin = adminId;
    }

    async getBotStats(){
        let stats = {};
        // Total user count
        let result = await this.query('SELECT COUNT(*) as TOTAL FROM ??',[process.env.USERSTABLE]);
        stats.total = result[0].TOTAL;

        // New users in last 24 hr
        result = await this.query('SELECT COUNT(*) as TOTAL FROM ?? WHERE REGDATE > ?',[
            process.env.USERSTABLE,
            ((Date.now()/1000) - 86400)
        ]);
        stats.newUsers = result[0].TOTAL;
        return stats;
    }

    /**
     * Get chat details from DB using cid or username
     * @param {string|number} CIDorUsername 
     * @returns {object}
     */
    async getChatFromDB(CIDorUsername){
        const column = !Math.round(CIDorUsername) ? 'USERNAME' : (CIDorUsername < 0 ? 'CHATID' : 'CID');
        const result = await this.query(
            'SELECT * FROM ?? WHERE ?? = ?',
            [process.env.CHATSTABLE, column, CIDorUsername]
        );
        return this.chatDetails = result[0];
    }

    /**
     * Get list of user details from db
     * @param {number} offset userId as offset
     * @param {number} limit number of users to return
     */
    async getUsers(offset, limit){
        return await this.query('SELECT * FROM ?? WHERE TUID > ? LIMIT ?',
        [
            process.env.USERSTABLE,
            offset || 1,
            limit || 25
        ])
    }

    /**
     * Get user contents
     * @returns {object}
     */
     async getUserContents(){
        return await this.query(
            'SELECT * FROM ?? WHERE LISTERID = ? ORDER BY LISTEDON LIMIT 50',
            [
                process.env.CHATSTABLE,
                this.user.TUID
            ]
        );
    }

    /**
     * 
     * @param {object} chatDetails containing 17 values.
     * @returns 
     */
    async insertChat(chatDetails){
        if(Object.keys(chatDetails).length !== 17){
            this.logError('Column count doesn\'t match:' + JSON.stringify(chatDetails));
            return false;
        }
        if(chatDetails.DESCRIPTION){
            //strip HTML tags
            chatDetails.DESCRIPTION = chatDetails.DESCRIPTION.replace(/<[^>]*>?/gm, '');
        }
        this.chatDetails = chatDetails;

        try {
            const now = Date.now()/1000;
            const sql = `INSERT INTO ?? (LISTERID, LISTERROLE, CHATID, TITLE, DESCRIPTION, USERNAME, CTYPE, LINK, PHOTO, SUBSCOUNT, STATUS, CUPDATE, VIEWS, LISTEDON, PICSCOUNT, VIDEOSCOUNT, LINKSCOUNT, POSTCOUNT, FILECOUNT) VALUES (?)`;
            const values = [
                process.env.CHATSTABLE,
                [
                    chatDetails.LISTERID,
                    chatDetails.LISTERROLE,
                    chatDetails.CHATID || null,
                    chatDetails.TITLE,
                    chatDetails.DESCRIPTION?.replace(/<[^>]*>?/gm, '') || '',
                    chatDetails.USERNAME || null,
                    chatDetails.CTYPE,
                    chatDetails.LINK || '',
                    chatDetails.PHOTO || '',
                    chatDetails.SUBSCOUNT || null,
                    chatDetails.STATUS,
                    now,
                    Math.round(chatDetails.VIEWS) || null,
                    now,
                    chatDetails.PICSCOUNT || null,
                    chatDetails.VIDEOSCOUNT || null,
                    chatDetails.LINKSCOUNT || null,
                    chatDetails.POSTCOUNT || null,
                    chatDetails.FILECOUNT || null
                ]
            ];
            return await this.query(sql, values);

        } catch (error) {
            this.logError(error);
            return error.message;
        }
    }

    /**
     * New action
     * @param {number} chatId 
     * @param {string} action 
     * @returns 
     */
    async insertChatAction(chatId, action){
        if(!this.user.TUID) throw new Error('User not found');
        try {
            const sql = 'REPLACE INTO ?? (`UID`,`CID`,`ACTION`) VALUES (?,?,?)';
            const values = [
                process.env.CHATS_ACTION_TABLE,
                this.user.TUID,
                parseInt(chatId),
                CHATACTION[action]
            ]
            return await this.query(sql, values);

        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * 
     * @param {object} error Error object received from telegram api
     * @returns {boolean}
     */
    knownErrors(error){
        const dismissableErrors = [
            'not enough rights',
            'message to delete not found',
            'bot was kicked',
            'not in the chat',
            'need to be inviter of a user',
            'matching document found for id',
            'bot is not a member',
            'user is an administrator of the chat',
            'user_not_participant',
            'chat_admin_required',
            "message can't be deleted",
            'group chat was upgraded to a supergroup',
            'channel_private',
            'method is available only for supergroups',
            'have no rights to send a message',
            'chat_write_forbidden',
            'message identifier is not specified',
            'demote chat creator',
            'user_banned_in_channel',
            'too many requests',
            'message is not modified',
            'user not found',
            'webdocument_url_invalid',
            'bot was blocked by the user',
            'chat not found',
            'chat is not eligible for listing.',
            'bot can\'t initiate conversation with a user'
        ];
        for (const message of dismissableErrors) {
            if (error.message.toLowerCase().indexOf(message) > -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * 
     * @param {*} user 
     * @returns 
     */
    async logUser(user){
        var newUser = false;

        if(typeof user !== 'object' || user.id === undefined){
            var text = JSON.stringify(user) || user.toString();
            throw new Error('Invalid parameter: ' + text);
        }
        
        if(user.is_bot === true) return false;

        try {
            const res = await this.query('SELECT * FROM ?? WHERE TGID = ?',[process.env.USERSTABLE, user.id]);
            Object.keys(res).length == 0 ? newUser = true : this.user = res[0];

            if(newUser){
                // Add user to DB
                const sql = 'INSERT INTO ??(`USERNAME`, `NAME`, `TGID`, `LANGCODE`, `REGDATE`) VALUES(?)';
                const values = [
                    process.env.USERSTABLE,
                    [
                        user.username || null,
                        user.first_name + ' ' + user.last_name,
                        user.id,
                        user.language_code || 'en',
                        user.regdate || Date.now()/1000
                    ]
                ];
                const result = await this.query(sql, values);
                if(result.affectedRows)
                    await this.logUser(user);
                else return false;
            }else if(this.user.PREFERENCES == USERPREFERENCES['BLOCKED']){
                await this.updateUserPreference();
            }
            return true;
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * 
     * @param {object} chatDetails
     * @param {number} listerId
     * @returns {boolean}
     */
    async newChat(chatDetails, listerRole = 0){

        // lister is a person who list the chat to telegram directory
        chatDetails.LISTERID = this.user.TUID;
        chatDetails.LISTERROLE = MEMBERSTATUS[listerRole || 'member'];

        chatDetails.STATUS = CHATSTATUS['new'];
        return await this.insertChat(chatDetails);
    }

    /**
     * 
     * @param {object} stickerSet 
     */
    async newStickerSet(stickerSet){
        if(typeof stickerSet.name == 'undefined') return;

        try {
            var result = await this.query(
                'INSERT INTO ??(`NAME`, `TITLE`, `THUMB`, `ISANIMATED`, `ISVIDEO`, `TYPE`, `MASK`, `LISTERID`, `LISTEDON`) VALUES (?)',
                [
                    process.env.STICKERSETTABLE,
                    [
                        stickerSet.name,
                        stickerSet.title,
                        stickerSet?.thumb?.file_id || '',
                        stickerSet.is_animated,
                        stickerSet.is_video,
                        STICKERTYPE[stickerSet.sticker_type],
                        stickerSet.contains_masks,
                        this.user.TUID,
                        Date.now()
                    ]
                ]
            );
            if(result.affectedRows == 1){
                var setId = result.insertId;
    
                var sql = 'INSERT INTO ??(`SETID`, `EMOJI`, `FILEID`, `ISANIMATED`, `ISVIDEO`, `ISPREMIUM`) VALUES ';
                var stickers = [process.env.STICKERSTABLE];
                stickerSet.stickers.forEach(s => {
                    sql += '(?),';
                    stickers.push(
                        [
                            setId,
                            s.emoji,
                            s.file_id,
                            s.is_animated,
                            s.is_video,
                            s.premium_animation ? true : false
                        ]
                    )
                })
                result = await this.query(
                    sql.substring(0,sql.length-1),
                    stickers
                )
                if(result.affectedRows > 0)
                    return {SETID: setId};
            }
        } catch (error) {
            this.logError(error);
            return false;
        }
        return false;
    }

    async postLinkToReddit(title, link){
        try {
            var data = qs.stringify({
                'grant_type': 'password',
                'username': process.env.REDDIT_USERNAME,
                'password': process.env.REDDIT_PASSWORD
            });
            var config = {
                method: 'post',
                url: 'https://www.reddit.com/api/v1/access_token',
                headers: { 
                'Authorization': 'Basic ' + process.env.REDDIT_SECRET,
                'Content-Type': 'application/x-www-form-urlencoded'
                },
                data : data
            };
            var response = await axios(config)
            if(typeof response.data.access_token == 'undefined') return;

            data = qs.stringify({
                'title': title,
                'kind': 'link',
                'url': link,
                'sr': 'Telegram_Directory',
                'resubmit': true
            });
            config = {
                method: 'post',
                url: 'https://oauth.reddit.com/api/submit',
                headers: { 
                    'Authorization': 'Bearer ' + response.data.access_token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data : data
            };
            
            response = await axios(config);
            if(response?.data?.success == false){
                this.logError(JSON.stringify(response.data.query));
            }
        } catch (error) {
            this.logError(error);
        }
    }

    /**
     * Get list of chats
     * @param {string} query 
     * @returns {object}
     */
    async searchChatsInDB(query, chatType = '.*', status = CHATSTATUS['listed']){
        if(typeof query != 'string') throw new Error('Query is invalid');
        return await this.query(
            'SELECT * FROM ?? WHERE TITLE LIKE ? AND CTYPE REGEXP(?) AND STATUS = ? ORDER BY SUBSCOUNT DESC LIMIT 50',
            [
                process.env.CHATSTABLE,
                `%${query}%`,
                chatType.toLowerCase(),
                status
            ]
        );
    }

    async searchStickerSet(setName){
        try {
            return await this.query(
                'SELECT * FROM ?? WHERE ?? = ?',
                [
                    process.env.STICKERSETTABLE,
                    !Math.round(setName) ? 'NAME' : 'SETID',
                    setName || ''
                ]
            )
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    // Message formatting
    async sendFormattedChatDetails(ctx, chatDetails){
        //---- Get chat details card -----//
        const {text, markup, Markup} = require('../cards/chatDetails').chatDetailsCard(chatDetails, this);

        //----reply---//
        if(!chatDetails.PHOTO){
            await ctx.reply(text,{
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(markup).reply_markup
            });
        }else{
            await ctx.replyWithPhoto(process.env.HOMEURI + chatDetails.PHOTO, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(markup).reply_markup
            });
        }
    }

    /**
     * 
     * @param {object} values 
     * @returns 
     */
    async updateChat(chatId, options = {}){
        const sql = `UPDATE ?? SET 
            LISTERID = COALESCE(?, LISTERID), 
            LISTERROLE = COALESCE(?, LISTERROLE), 
            CHATID = COALESCE(?, CHATID), 
            TITLE = COALESCE(?, TITLE), 
            DESCRIPTION = COALESCE(?, DESCRIPTION), 
            USERNAME = COALESCE(?, USERNAME), 
            LINK = COALESCE(?, LINK), 
            SUBSCOUNT = COALESCE(?, SUBSCOUNT), 
            STATUS = COALESCE(?, STATUS),
            CATEGORY = COALESCE(?, CATEGORY), 
            CLANGUAGE = COALESCE(?, CLANGUAGE), 
            CUPDATE = COALESCE(?, CUPDATE), 
            VIEWS = COALESCE(?, VIEWS), 
            PICSCOUNT = COALESCE(?, PICSCOUNT), 
            VIDEOSCOUNT = COALESCE(?, VIDEOSCOUNT), 
            LINKSCOUNT = COALESCE(?, LINKSCOUNT), 
            POSTCOUNT = COALESCE(?, POSTCOUNT), 
            FILECOUNT = COALESCE(?, FILECOUNT), 
            REPORT = COALESCE(?, REPORT)
            WHERE CID = ?`;
        const values = [
            process.env.CHATSTABLE,
            options.LISTERID || null,
            MEMBERSTATUS[options.LISTERROLE] || null,
            options.CHATID || null,
            options.TITLE || null,
            options.DESCRIPTION || null,
            options.USERNAME || null,
            options.LINK || null,
            options.SUBSCOUNT || null,
            CHATSTATUS[options.STATUS] || null,
            options.CATEGORY || null,
            options.CLANGUAGE || null,
            Date.now()/1000,
            options.VIEWS || null,
            options.PICSCOUNT || null,
            options.VIDEOSCOUNT || null,
            options.LINKSCOUNT || null,
            options.POSTCOUNT || null,
            options.FILECOUNT || null,
            options.REPORT || null,
            chatId
        ];
        try {
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    async updateSticker(setId, options = {}){
        const sql = `UPDATE ?? SET 
            CATEGORY = COALESCE(?, CATEGORY), 
            LANGUAGE = COALESCE(?, LANGUAGE),
            FLAG = COALESCE(?, FLAG),
            POSTID = COALESCE(?, POSTID)
            WHERE SETID = ?`;
        const values = [
            process.env.STICKERSETTABLE,
            options.CATEGORY || null,
            options.LANGUAGE || null,
            CHATFLAG.indexOf(options.FLAG) || null,
            options.POSTID || null,
            setId
        ];
        try {
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * Updates chat flag
     * @param {number} chatId 
     * @param {string} flag 
     * @returns 
     */
    async updateChatFlag(chatId, flag){
        if(!CHATFLAG.includes(flag)) throw new Error('Flag not found');
        try {
            const sql = 'UPDATE ?? SET FLAG = ? WHERE CID = ?';
            const values = [
                process.env.CHATSTABLE,
                CHATFLAG.indexOf(flag),
                chatId
            ]
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * @param {string} preferences - send 'blocked' or 'noupdates'
     * @returns 
     */
    async updateUserPreference(preferences = ''){
        if(typeof preferences != 'string') return false;

        const sql = `UPDATE ?? SET 
            PREFERENCES = ?
            WHERE TGID = ?`;
        const values = [
            process.env.USERSTABLE,
            USERPREFERENCES[preferences.toUpperCase()] || 1,
            this.user.TGID
        ];
        try {
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }
}

module.exports = {
    Tgbot,
    CATEGORIES,
    CHATFLAG,
    CHATSTATUS,
    MEMBERSTATUS,
    USERPREFERENCES
};