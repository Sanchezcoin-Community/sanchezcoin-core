const { intToVInt, isBigInt } = require('./vint');


/*
    Normale Klassen
*/

// Wird verendet um ein Unspent Output zu übertragen
class TxInput {
    constructor(txId, outputHight) {
        // Die Parameter werden überprüft
        if(typeof outputHight !== 'number' || outputHight < 0 || outputHight > 4294967295) throw new Error('Invalid output transaction hight');
        if(typeof txId !== 'string' || txId.length !== 96) throw new Error('Invalid transaction id');

        // Die Parameter werden abgeseichert
        this.outputHight = outputHight;
        this.txId = txId;
    };

    // Gibt das Input als RAW Daten aus
    getRawData(start_prefix='01') {
        // Die Höhe wird in HEX umgewandelt
        const fixed_length_hight = this.outputHight.toString(16).toLowerCase().padStart(8, 0);

        // Das Output wird zurückgegeben
        return `${start_prefix}${this.txId}${fixed_length_hight}`.toLowerCase();
    };
};

// Wird verwendet um neue Coins zu Generieren
class CoinbaseInput extends TxInput{
    constructor() { super("000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", 4294967295); }
    getRawData() { return super.getRawData('00'); }
};

// Stellt einen Transaktionsausgang dar, welcher noch nicht ausgegeben wurde
class UnspentOutput {
    constructor(locking_script_hex, amount) {
        // Die Parameter werden überprüft
        if(typeof locking_script_hex !== 'string' || locking_script_hex.length < 32 || locking_script_hex.length > 2048) throw new Error('Invalid unlocking script');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(amount <= BigInt("0")) throw new Error('Invalid amount value');

        this.locking_script_hex = locking_script_hex;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        let vint_amount = intToVInt(this.amount);

        // Die Länge des Ausgangs wird erzeugt
        let unlocking_script_len = intToVInt(this.locking_script_hex.length);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `01${vint_amount}${unlocking_script_len}${this.locking_script_hex}`.toLowerCase();
    };
};

// Wird verwendet um einen Output an eine Blind Adresse zu senden
class UnspentPhantomOutput {
    constructor(phantom_algorithmn, phantom_pkey, optional_data, amount) {
        this.phantom_algorithmn = phantom_algorithmn;
        this.optional_data = optional_data;
        this.phantom_pkey = phantom_pkey;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        let vint_amount = intToVInt(this.amount);

        // Dass Verwendete Verfahren wird umgewandelt
        let prepared_algorithmn = this.phantom_algorithmn.toString(16).padStart(2, 0);

        // Die Länge des Verwendeten Schlüssels wird umgewandelt
        let pkey_size = intToVInt(this.phantom_pkey.length);

        // Die Länge der Optionalen Daten wird umgewandelt
        let optional_data_size = intToVInt(this.optional_data.length);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `00${vint_amount}${prepared_algorithmn}${pkey_size}${this.phantom_pkey}${optional_data_size}${this.optional_data}`.toLowerCase();
    };
};



// Die Klassen werden Exportiert
module.exports = {
    TxInput:TxInput,
    UnspentOutput:UnspentOutput,
    CoinbaseInput:CoinbaseInput
};
