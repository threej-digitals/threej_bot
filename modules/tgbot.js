const mysql = require('mysql');
const Scrapper = require('./scrapper');

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


class Tgbot extends Scrapper{
    constructor(){
        super()
        //create connection to mysql db
        this.db = mysql.createConnection({
            host : process.env.HOST,
            port : process.env.MYSQLPORT,
            user : process.env.MYSQLUSER,
            password : process.env.MYSQLPASSWORD,
            database : process.env.MYSQLDATABASE,
            connectTimeout : 4000
        });
    }

    getChat(CIDorUsername){
        const column = !Math.round(CIDorUsername) ? 'USERNAME' : 'CHATID';
        const db = this.db;
        db.connect();

        return new Promise((resolve, reject)=>{
            db.query(
                'SELECT * FROM ?? WHERE ?? = ?',
                [process.env.CHATSTABLE, column, CIDorUsername],
                (err, res)=>{
                    if(err){
                        this.logError(err)
                        reject(err);
                    }
                    db.end();
                    resolve(res);
                }
            );
        })
    }

    /**
     * 
     * @param {object} chatDetails containing 17 values.
     * @returns 
     */
    insertChat(chatDetails){
        if(Object.keys(chatDetails).length !== 17){
            this.logError('Column count doesn\'t match:' + JSON.stringify(chatDetails));
            return false;
        }

        const db = this.db;

        return new Promise((resolve,reject)=>{
            const now = Date.now()/1000;
            db.query(
                'INSERT INTO ?? (`LISTERID`, `LISTERROLE`, `CHATID`, `TITLE`, `CHAT_DESC`, `USERNAME`, `CTYPE`, `LINK`, `PHOTO`, `SUBSCOUNT`, `STATUS`, `CUPDATE`, `VIEWS`, `LISTEDON`, `PICSCOUNT`, `VIDEOSCOUNT`, `LINKSCOUNT`, `POSTCOUNT`, `FILECOUNT`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [
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
                    Math.round(chatDetails.views || null),
                    now,
                    chatDetails.photos || null,
                    chatDetails.videos || null,
                    chatDetails.links || null,
                    chatDetails.postCount || null,
                    chatDetails.file || null
                ],
                (err, res)=>{
                    if(err){
                        this.logError(err);
                        reject(err);
                    }
                    resolve(res);
                }
            )
        })
    }

    /**
     * 
     * @param {object} chatDetails
     * @param {BigInteger} listerId
     * @returns {boolean}
     */
    async newChat(chatDetails, listerId){

        // lister is a person who list the chat to telegram directory
        chatDetails['listerId'] = listerId;
        chatDetails['listerRole'] = MEMBERSTATUS['member'];

        chatDetails['status'] = CHATSTATUS['new'];
        
        return await this.insertChat(chatDetails);
    }
}
module.exports = Tgbot;