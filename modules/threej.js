const scrapChat = require('./scrapper');
class Threej{
    constructor(){

    }
    /**
     * Converts K M B format to int
     * 
     * @param {string} str Possible int
     * @return {int|false} int or false on failure
     */
    stringToInt(str){
        format = {
            "":1,
            k: 1e3,
            K: 1e3,
            m: 1e6,
            M: 1e6,
            b: 1e9,
            B: 1e9,
            t: 1e12,
            T: 1e12,
        }
        lastChar = str.slice(-1);
        lastChar.match('[a-zA-Z]') ? '' : lastChar = '';
        int = parseFloat(str) * format[lastChar];
        return int || false;
    }

    /**
     * 
     * @param {string} str csv string
     * @param {char} delimiter 
     * @returns {Array}
     */
    parseCSV(str, delimiter = ','){
    if(str.match('\\r\\n')){
        str = str.replaceAll('\r\n','\n');
    }
    const rows = str.split('\n');
    var parsed = [];
    rows.map((row)=>{
        parsed.push(row.split(delimiter));
    })
    return parsed;
  }

}

const threej = new Threej();

class Tgbot extends {Threej, } {
    constructor(db){
        this.db = db;
    }

    logUser(uid) {
        console.log("🚀 ~ file: threej.js ~ line 7 ~ Tgbot ~ logUser ~ uid", uid)
    }

    async scrapChat(username){
        return await scrapChat(username);
    }
}

module.exports = { threej, Tgbot }