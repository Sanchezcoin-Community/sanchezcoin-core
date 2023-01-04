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
    constructor(locking_script_hex, amount, bLockTime, dtLockTime) {
        // Die Parameter werden überprüft
        if(typeof locking_script_hex !== 'string' || locking_script_hex.length < 32 || locking_script_hex.length > 2048) throw new Error('Invalid unlocking script');
        if(isBigInt(bLockTime) !== true) throw new Error('Invalid locking block time data type');
        if(isBigInt(dtLockTime) !== true) throw new Error('Invalid locktimetamp data type');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(dtLockTime < BigInt("0")) throw new Error('Invalid amount value');
        if(bLockTime < BigInt("0")) throw new Error('Invalid amount value');
        if(amount <= BigInt("0")) throw new Error('Invalid amount value');

        this.locking_script_hex = locking_script_hex;
        this.dtLockTime = dtLockTime;
        this.bLockTime = bLockTime;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        let vint_amount = intToVInt(this.amount);

        // Die Locktime wird in ein VInt umgewandelt
        let vint_bLock_hight = intToVInt(this.bLockTime);

        // Der Zeitstempel wird umgewandelt
        let vint_lock_time = intToVInt(this.dtLockTime);

        // Die Länge des Ausgangs wird erzeugt
        let unlocking_script_len = intToVInt(this.locking_script_hex.length);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `01${vint_amount}${vint_bLock_hight}${vint_lock_time}${unlocking_script_len}${this.locking_script_hex}`.toLowerCase();
    };
};


// Die Klassen werden Exportiert
module.exports = {
    TxInput:TxInput,
    UnspentOutput:UnspentOutput,
    CoinbaseInput:CoinbaseInput
};
