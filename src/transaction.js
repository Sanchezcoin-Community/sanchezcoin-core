const { SHA3 } = require('sha3');



// Wird für eine Vollständig neue Transaktion verwendet
class CoinbaseTransaction {
    constructor(blockHight, inputs, outputs) {
        this.blockHight = blockHight;
        this.outputs = outputs;
        this.inputs = inputs;
    };

    // Gibt die Transaktion als RAW Bytes aus
    getRawData() {
        // Es werden alle Eingänge abgerufen
        let totalInputHexStringed = '';
        for(const otem of this.inputs) { totalInputHexStringed += otem.getRawData(); }
        const hexed_total_inputs = this.inputs.length.toString(16);
        const total_inputs_hex_len = hexed_total_inputs.toString(16).toUpperCase().padStart(2, 0);

        // Es werden alle ausgänge abgerufen
        let totalRawHexString = '';
        for(const otem of this.outputs) { totalRawHexString += otem.getRawData(); }
        const hexed_total_output = this.outputs.length.toString(16);
        const total_output_hex_len = hexed_total_output.toString(16).toUpperCase().padStart(2, 0);

        // Die Daten werden zusammengeführt
        return`01000000${hexed_total_inputs}${total_inputs_hex_len}${totalInputHexStringed}${hexed_total_output}${total_output_hex_len}${totalRawHexString}`;
    };

    // Erzeugt einen Hash aus der Coinbase Transaktion
    computeHash() {
        const hash = new SHA3(256).update(Buffer.from(this.getRawData(), 'ascii').reverse()).digest('hex');
        return hash;
    };

    // Gibt die Transaktion so aus, dass sie in die Datenbank gechrieben werden kann
    toDbElement() {
        // Die Inputs werden vorbereitet
        let prepared_inputs = [];
        for(const otem of this.inputs) prepared_inputs.push(Buffer.from(otem.getRawData(), 'hex'));

        // Die Outputs werden vorbereitet
        let prepared_outputs = [];
        for(const otem of this.outputs) prepared_outputs.push(Buffer.from(otem.getRawData(), 'hex'));

        // Die Outputs werden vorbereitet
        return {
            0:1,
            1:this.blockHight,
            2:prepared_inputs,
            3:prepared_outputs
        }
    }
}


// Exportiert die Klassen
module.exports = { 
    CoinbaseTransaction:CoinbaseTransaction 
}