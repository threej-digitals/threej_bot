/**
 * Function to broadcast message to users
 * @param {*} userIds 
 */
module.exports.broadcast = async (userIds, callback) => {
    if(!userIds instanceof Array) return;
    
    var i = 0;
    var time = Date.now();

    // Send atmost 28 message in 1 sec
    for(const id of userIds){
        if(i >= 28){
            i = 0;
            var timeDiff = (time + 1000) - Date.now();
            if(timeDiff > 0)
                await new Promise(r=> setTimeout(r, timeDiff));
        }
        i++;
        callback(id);
    };
}