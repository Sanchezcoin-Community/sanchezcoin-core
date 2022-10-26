const { sha256dBTC } = require('../../hash_algo');
const bigInt = require("big-integer");


// Wird als Miner ausgeführt
module.exports = (data, callback) => {
    // Es wird versucht einen Block zu Minen
    let cnonce = data.start;
    while(cnonce <= data.end) {
        // Wandelt die Nonce um
        const nonce = Buffer.from(cnonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

        // Fügt die Daten zusammen
        const merged_data = `${data.block}${nonce}`;

        // Es wird ein Hash aus dem Wert erzeugt
        const reval_hash = sha256dBTC.compute(Buffer.from(merged_data, 'hex'));

        // Es wird geprüft ob es ein gültiger Wer ist
        if(bigInt(reval_hash, 16) < bigInt(data.target, 16)) {
            console.log('FOUND');
            return;
        }

        if(reval_hash.startsWith('00000') === true) {
            console.log(reval_hash, data.i);
            return;
        }

        // Die Nonce wird hochgezählt
        cnonce += 1;
    }
}