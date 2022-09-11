const Scrapper = require('./scrapper');

class Tgbot extends Scrapper{
    constructor(db){
        super()
        this.db = db;
    }

    logUser(uid) {
        console.log("🚀 ~ file: threej.js ~ line 7 ~ Tgbot ~ logUser ~ uid", uid)
    }
}
module.exports = Tgbot;