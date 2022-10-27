const { sha256dBTC } = require('../../hash_algo');
const bigInt = require("big-integer");


// Wird als Miner ausgeführt
module.exports = (data, callback) => {
    // Es wird versucht einen Block zu Minen
    let cnonce = data.start, found = false, last_hash = null;
    try{
        while(cnonce <= data.end && found === false) {
            // Wandelt die Nonce um
            let nonce = Buffer.from(cnonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

            // Fügt die Daten zusammen
            let merged_data = `${data.block_header}${nonce}`;

            // Es wird ein Hash aus dem Wert erzeugt
            let reval_hash = sha256dBTC.compute(Buffer.from(merged_data, 'hex'));
            if(reval_hash === last_hash) {
                console.log(reval_hash, 'error', cnonce, merged_data);
                return;
            }

            // Der Letze Hash wird gesetzt
            last_hash = reval_hash;

            // Es wird geprüft ob es ein gültiger Wer ist
            if(bigInt(reval_hash, 16) < bigInt(data.target, 16)) {
                found = true; callback(null, cnonce); return; 
            }

            // Die Nonce wird hochgezählt
            cnonce += 1;
        }
    }
    catch(e) {
        console.log(e);
    }
}