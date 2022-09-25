const scrapper = require('./scrapper');
const { Threej, threej } = require('./threej');

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

/**
 * Chat status object
 */
const CHATSTATUS = {
    'new' : 1,
    'listed' : 2,
    'unlisted' : 3
}

/**
 * Chat action
 */
const CHATACTION = {
    'UPVOTE' : 1,
    'DOWNVOTE' : 2
}

/**
 * Extras for reporting contents
 */
const CHATFLAG = ['SFW','NSFW','Spam','Scam','Violence','Child Abuse','Copyright','Illegal'];

class Tgbot extends Threej{
    constructor(){
        super()
        this.user = {};
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
        };
    }

    /**
     * Get chat details from DB using cid or username
     * @param {string|integer} CIDorUsername 
     * @returns {object}
     */
    async getChatFromDB(CIDorUsername){
        const column = !Math.round(CIDorUsername) ? 'USERNAME' : 'CID';
        const result = await this.query(
            'SELECT * FROM ?? WHERE ?? = ?',
            [process.env.CHATSTABLE, column, CIDorUsername]
        );
        return this.chatDetails = result[0];
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
        if(chatDetails.description){
            //strip HTML tags
            chatDetails.description = chatDetails.description.replace(/<[^>]*>?/gm, '');
        }
        this.chatDetails = chatDetails;

        try {
            const now = Date.now()/1000;
            const sql = 'INSERT INTO ?? (`LISTERID`, `LISTERROLE`, `CHATID`, `TITLE`, `DESCRIPTION`, `USERNAME`, `CTYPE`, `LINK`, `PHOTO`, `SUBSCOUNT`, `STATUS`, `CUPDATE`, `VIEWS`, `LISTEDON`, `PICSCOUNT`, `VIDEOSCOUNT`, `LINKSCOUNT`, `POSTCOUNT`, `FILECOUNT`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            const values = [
                process.env.CHATSTABLE,
                chatDetails.listerId,
                chatDetails.listerRole,
                chatDetails.id || null,
                chatDetails.title,
                chatDetails.description.replace(/<[^>]*>?/gm, '') || '',
                chatDetails.username || null,
                chatDetails.type,
                chatDetails.link || '',
                chatDetails.photo || '',
                chatDetails.subscribers || null,
                chatDetails.status,
                now,
                Math.round(chatDetails.views) || null,
                now,
                chatDetails.photos || null,
                chatDetails.videos || null,
                chatDetails.links || null,
                chatDetails.postCount || null,
                chatDetails.file || null
            ]
            return await this.query(sql, values);

        } catch (error) {
            this.logError(error);
            return false;
        }
    }
    /**
     * New action
     * @param {integer} chatId 
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
     * @param {*} user 
     * @returns 
     */
    async logUser(user){
        var newUser = false;

        if(typeof user !== 'object' || user.id === undefined || user.is_bot === true){
            throw new Error('Invalid parameter: ' + user.toString())
        }

        try {
            const res = await this.query('SELECT * FROM ?? WHERE TGID = ?',[process.env.USERSTABLE, user.id]);
            Object.keys(res).length == 0 ? newUser = true : this.user = res[0];

            if(newUser){
                // Add user to DB
                const sql = 'INSERT INTO ??(`USERNAME`, `NAME`, `TGID`, `LANGCODE`, `REGDATE`) VALUES(?,?,?,?,?)';
                const values = [
                    process.env.USERSTABLE,
                    user.username || null,
                    user.first_name + ' ' + user.last_name,
                    user.id,
                    user.language_code || 'en',
                    user.regdate || Date.now()/1000
                ]
                const result = await this.query(sql, values);
                if(result.affectedRows)
                    await this.logUser(user);
                else return false;
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
     * @param {BigInteger} listerId
     * @returns {boolean}
     */
    async newChat(chatDetails, listerId){

        // lister is a person who list the chat to telegram directory
        chatDetails['listerId'] = this.user.TUID;
        chatDetails['listerRole'] = MEMBERSTATUS['member'];

        chatDetails['status'] = CHATSTATUS['new'];
        return await this.insertChat(chatDetails);
    }

    /**
     * Get list of chats
     * @param {string} query 
     * @returns {object}
     */
    async searchChatsInDB(query){
        if(typeof query != 'string') throw new Error('Query is invalid');
        return await this.query(
            'SELECT * FROM ?? WHERE TITLE LIKE ? ORDER BY SUBSCOUNT DESC LIMIT 50',
            [
                process.env.CHATSTABLE,
                `%${query}%`
            ]
        );
    }

    /**
     * 
     * @param {object} values 
     * @returns 
     */
    async updateChat(chatId, category = null, language = null, status = null){
        const values = [
            process.env.CHATSTABLE,
            category,
            language,
            CHATSTATUS[status] || null,
            chatId
        ];
        const sql = `UPDATE ?? SET 
            CATEGORY = COALESCE(?, CATEGORY), 
            CLANGUAGE = COALESCE(?, CLANGUAGE), 
            STATUS = COALESCE(?, STATUS) 
            WHERE CID = ?`;
        try {
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }

    /**
     * Updates chat flag
     * @param {integer} chatId 
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
}
module.exports = { Tgbot, CHATSTATUS, MEMBERSTATUS};