const { intToVInt, isBigInt } = require('./vint');
const { SHA3 } = require('sha3');




// Stellt eine Coinbase Transaktion dar
// diese Transaktion wird verwendet um die Gebühren sowie den Reward an den Block ersteller zu übergeben
class CoinbaseTransaction {
    constructor(blockHight, inputs, outputs) {
        // Es wird geprüft ob es sich bei der Angabe um die Blockhöhe um eine Korrekte angabe handelt
        if(isBigInt(blockHight) !== true) throw Error('Invalid current block hight');

        // Speichert die Daten zwischen
        this.blockHight = blockHight;
        this.inputs = inputs;
        this.outputs = outputs;
    };

    // Gibt die Transaktion als RAW Bytes aus
    getRawData() {
        // Es werden alle Eingänge abgerufen
        let totalInputHexStringed = '';
        for(const otem of this.inputs) { totalInputHexStringed += otem.getRawData(); }

        // Die Gesamtanzahl aller Eingänge wird umgewandelt
        const hexed_total_inputs = this.inputs.length.toString(16);
        const total_inputs_hex_len = hexed_total_inputs.toString(16).toUpperCase().padStart(2, 0);

        // Es werden alle ausgänge abgerufen
        let totalRawHexString = '';
        for(const otem of this.outputs) { totalRawHexString += otem.getRawData(); }

        // Die Anzahl aller Ausgänge wird ermittelt
        const hexed_total_output = this.outputs.length.toString(16);
        const total_output_hex_len = hexed_total_output.toString(16).toUpperCase().padStart(2, 0);

        // Aus der Blockhöhe wird in ein vInt umgewandelt
        let current_block_hight = intToVInt(this.blockHight);

        // Die Daten werden zusammengeführt
        return`01000000${hexed_total_inputs}${total_inputs_hex_len}${totalInputHexStringed}${hexed_total_output}${total_output_hex_len}${totalRawHexString}${current_block_hight}`;
    };

    // Erzeugt einen Hash aus der Coinbase Transaktion
    computeHash() {
        const hash = new SHA3(256).update(Buffer.from(this.getRawData(), 'ascii').reverse()).digest('hex');
        return hash;
    };
};


// Stellt eine Coinstake Transaktion dar, eine Coinstake Transaktion ist mit einer Coinbase Transaktion vergleichbar
class CoinstakeTransaction {
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
};


// Stellt eine nicht Signierte Transaktion dar
class UnsignatedTransaction {
    constructor(inputs, outputs) {
        // Speichert die Daten zwischen
        this.outputs = outputs;
        this.inputs = inputs;
    };

    // Gibt die Transaktion als RAW Bytes aus
    getRawData() {
        // Es werden alle Eingänge abgerufen
        let totalInputHexStringed = '';
        for(const otem of this.inputs) { totalInputHexStringed += otem.getRawData(); }

        // Die Gesamtanzahl aller Eingänge wird umgewandelt
        const hexed_total_inputs = this.inputs.length.toString(16);
        const total_inputs_hex_len = hexed_total_inputs.toString(16).toUpperCase().padStart(2, 0);

        // Es werden alle ausgänge abgerufen
        let totalRawHexString = '';
        for(const otem of this.outputs) { totalRawHexString += otem.getRawData(); }

        // Die Anzahl aller Ausgänge wird ermittelt
        const hexed_total_output = this.outputs.length.toString(16);
        const total_output_hex_len = hexed_total_output.toString(16).toUpperCase().padStart(2, 0);

        // Aus der Blockhöhe wird in ein vInt umgewandelt
        let current_block_hight = intToVInt(this.blockHight);

        // Die Daten werden zusammengeführt
        return`01000000${hexed_total_inputs}${total_inputs_hex_len}${totalInputHexStringed}${hexed_total_output}${total_output_hex_len}${totalRawHexString}${current_block_hight}`;
    };

    // Erzeugt einen Hash aus der Coinbase Transaktion
    computeHash() {
        const hash = new SHA3(256).update(Buffer.from(this.getRawData(), 'ascii').reverse()).digest('hex');
        return hash;
    };

    // Gibt alle Verwendeten Adressen aus
    getAllAddresses() {
        return [];
    };
};




// Datenbank Coinbase Transaktion
class DB_CoinbaseTransaction extends CoinbaseTransaction {
    constructor(blockHight, inputs, outputs, confirmations) {
        super(blockHight, inputs, outputs);
        this.confirmations = confirmations;
    }
}


// Exportiert die Klassen
module.exports = {
    DB_CoinbaseTransaction:DB_CoinbaseTransaction,
    UnsignatedTransaction:UnsignatedTransaction,
    CoinstakeTransaction:CoinstakeTransaction,
    CoinbaseTransaction:CoinbaseTransaction 
}