const { sha256dBTC } = require('../../hash_algo');
const bigInt = require("big-integer");



// Wird als Miner ausgeführt
module.exports = (data, callback) => {
    console.log('START_THREAD_MINER', data.start, '-', data.end);

    // Es wird versucht einen Block zu Minen
    let cnonce = data.start;
    try{
        while(cnonce <= data.end) {
            // Wandelt die Nonce um
            const nonce = Buffer.from(cnonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

            // Fügt die Daten zusammen
            const merged_data = `${data.block}${nonce}`;

            // Es wird ein Hash aus dem Wert erzeugt
            const reval_hash = sha256dBTC.compute(Buffer.from(merged_data, 'hex'));

            // Es wird geprüft ob es ein gültiger Wer ist
            if(bigInt(reval_hash, 16) < bigInt(data.target, 16)) {
                callback(null, cnonce);
                return;
            }

            if(reval_hash.startsWith('00000000') === true) {
                console.log(reval_hash, data.i, cnonce);
            }

            // Die Nonce wird hochgezählt
            cnonce += 1;
        }
    }
    catch(e) {
        console.log(e);
    }
}