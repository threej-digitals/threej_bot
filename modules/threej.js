/**
 * Helper class contains common usefull functions
 */
class Threej{
    constructor(){}

    /**
     * Converts K M B format to int
     * 
     * @param {string} str Possible int
     * @return {int|false} int or false on failure
     */
    stringToInt(str){
        const format = {
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
        let lastChar = str.slice(-1);
        lastChar.match('[a-zA-Z]') ? '' : lastChar = '';
        const int = parseFloat(str) * format[lastChar];
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

module.exports = {Threej, threej};