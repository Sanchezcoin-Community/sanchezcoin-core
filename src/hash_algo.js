const cryptolib = require('sanchez-crypto');


// Die Module werden exportiert
module.exports = {
    sha256dBTC:{
        name:"sha256d_pow",
        compute:(byteValue) => cryptolib.sha2d(256, byteValue)
    },
    ramSwiftyHash:{
        name:"swiftyh256_pow",
        compute:(byteValue) => cryptolib.swiftyHash(byteValue).toString('hex') 
    }
}