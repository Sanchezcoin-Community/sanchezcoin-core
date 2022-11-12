const swiftyHash = require('./swiftyh');
const crypto = require('crypto');



// Wird verwendet um SHA256d Blöcke abzubauen
function sha256dBTC(byteValue) {
    const shaUnit = crypto.createHash('sha256').update(byteValue);
    return crypto.createHash('sha256').update(shaUnit.digest()).digest().reverse().toString('hex');
};

// Wird verwendet um SwiftyHash Blöcke abzubauen
function ramSwiftyHash(byteValue) {
    const shaUnit = swiftyHash(byteValue);
    return shaUnit.toString('hex');
};


// Die Module werden exportiert
module.exports = {
    sha256dBTC:{ name:"sha256d_pow", compute:sha256dBTC },
    ramSwiftyHash:{ name:"swiftyh256_pow", compute:ramSwiftyHash }
}