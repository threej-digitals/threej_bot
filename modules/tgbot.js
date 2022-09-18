const scrapper = require('./scrapper');
const { Threej } = require('./threej');

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

    async getChatFromDB(CIDorUsername){
        const column = !Math.round(CIDorUsername) ? 'USERNAME' : 'CHATID';
        const result = await this.query(
            'SELECT * FROM ?? WHERE ?? = ?',
            [process.env.CHATSTABLE, column, CIDorUsername]
        );
        return this.chatDetails = result[0];
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
                chatDetails.description || '',
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
     * 
     * @param {*} user 
     * @returns 
     */
    async logUser(user){
        var newUser = false;

        if(typeof user !== 'object' || user.id === undefined || user.is_bot === true){
            this.logError('Unexpected parameter: ' + user.toString())
            return false;
        }

        try {
            const res = await this.query('SELECT * FROM ?? WHERE TGID = ?',[process.env.USERSTABLE, user.id]);
            Object.keys(res).length == 0 ? newUser = true : this.user = res[0];
            if(newUser){
                if(user.username){
                    const res = await scrapper.getHTML('https://telegram.me/'+ user.username);
                    const userDetails = await scrapper.scrapChatDetails(res.data);
                    user.photo = userDetails.photo || '';
                }
                // Add user to DB
                const sql = 'INSERT INTO ??(`USERNAME`, `NAME`, `TGID`, `LANGCODE`, `PHOTO`, `REGDATE`) VALUES(?,?,?,?,?,?)';
                const values = [
                    process.env.USERSTABLE,
                    user.username || null,
                    user.first_name + ' ' + user.last_name,
                    user.id,
                    user.language_code,
                    user.photo || '',
                    Date.now()/1000
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
     * 
     * @param {object} values 
     * @returns 
     */
    async updateChat(chatId, category = null, language = null){
        const values = [
            process.env.CHATSTABLE,
            category,
            language,
            chatId
        ];
        const sql = 'UPDATE ?? SET CATEGORY = COALESCE(?, CATEGORY), CLANGUAGE = COALESCE(?, CLANGUAGE) WHERE CID = ?';
        try {
            return await this.query(sql, values);
        } catch (error) {
            this.logError(error);
            return false;
        }
    }
}
module.exports = { Tgbot, CHATSTATUS, MEMBERSTATUS};