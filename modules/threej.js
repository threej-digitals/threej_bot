'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Helper class contains common usefull functions
 */
class Threej{
    constructor(){
        this.kformat = {
            t: 1e12,
            T: 1e12,
            b: 1e9,
            B: 1e9,
            m: 1e6,
            M: 1e6,
            k: 1e3,
            K: 1e3,
            "":1
        };
    }

    /**
     * 
     * @param {string} error 
     */
    logError(error){
        if(error instanceof Error)
            error = `[${new Date().toLocaleString()}] ` + error.stack.toString() + '\n\n';
        else if(typeof error == 'string')
            error = `[${new Date().toLocaleString()}] ` + error + '\n\n';
        else
            return;

        try {
            fs.appendFileSync(path.resolve('errorByThreej.txt'), error);
        } catch (error) {
            fs.writeFileSync(path.resolve('errorByThreej.txt'), error)
        }
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
    
    /**
     * kFormatter - converts int to K M B format
     * @param {integer|double} data 
     */
    kFormat(number){
        //check for numerical value
        if(!Math.round(number)) return false;

        for (const key in this.kformat) {
            let div = number / this.kformat[key];
            if(div >= 1){
                div = (Math.round(div * 100)) / 100;
                return (div + key).toUpperCase();
            }
        }
    }
    /**
     * Reverse kFormat
     * Converts K M B format to int
     * 
     * @param {string} str Possible int
     * @return {int|false} int or false on failure
     */
    rkFormat(str){
        let lastChar = str.slice(-1);
        lastChar.match('[a-zA-Z]') ? '' : lastChar = '';
        const int = parseFloat(str) * this.kformat[lastChar];
        return int || false;
    }

    async saveRemoteFile(url, storagePath, filename = 'F' + Date.now()){
        try {
            const writer = fs.createWriteStream(path.resolve(storagePath , filename + path.extname(url)))

            const response = await axios.get(url, {responseType:'stream'});
                
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve(storagePath + filename + path.extname(url)));
                writer.on('error', reject);
            })
        } catch (error) {
            this.logError(error);
        }
    }

}
const threej = new Threej();

module.exports = {Threej, threej};