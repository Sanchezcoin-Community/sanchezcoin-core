const { intToVInt, isBigInt } = require('./vint');
const { tx_parms } = require('./constants');


/*
    Normale Klassen
*/

// Wird verendet um ein Unspent Output zu übertragen,
// ein Unspent Output kann nur 1x von einem TxInput Referenziert werden.
class TxInput {
    constructor(txId, outputHight) {
        // Die Parameter werden überprüft
        if(typeof outputHight !== 'number' || outputHight < 0 || outputHight > tx_parms.max_outputs) throw new Error('Invalid output transaction hight');
        if(typeof txId !== 'string' || txId.length !== 96) throw new Error('Invalid transaction id');

        // Die Parameter werden abgeseichert
        this.outputHight = outputHight;                     // <-- Speichert die Höhe des Verwendeten Eingangs ab
        this.txId = txId;                                   // <-- Speichert die Transaktions Id der Verwendeten Eingabe ab
    };

    // Gibt das Input als RAW Daten aus
    getRawData(start_prefix='01') {
        // Die Höhe wird in HEX umgewandelt
        const fixed_length_hight = this.outputHight.toString(16).toLowerCase().padStart(8, 0);

        // Das Output wird zurückgegeben
        return `${start_prefix}${this.txId}${fixed_length_hight}`.toLowerCase();
    };
};

// Wird verwendet um neue Coins zu Generieren,
// eine Coinbase Eingabe darf niemals auf eine Reale Transaktion verweisen
class CoinbaseInput extends TxInput{
    constructor() { super("000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", 4294967295); }
    getRawData() { return super.getRawData('00'); }
};

// Stellt einen Transaktionsausgang dar, welcher noch nicht ausgegeben wurde
// diese Ausgabe kann nur mit einem zulässigen Unlocking Skript ausgegeben werden
class UnspentOutput {
    constructor(locking_script_hex, amount) {
        // Die Parameter werden überprüft
        if(typeof locking_script_hex !== 'string' || locking_script_hex.length < 32 || locking_script_hex.length > 2048) throw new Error('Invalid unlocking script');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(amount < 0n) throw new Error('Invalid amount value');

        // Speichert die Daten der Transaktion ab
        this.locking_script_hex = locking_script_hex;       // <-- Speichert das Locking Skript ab, welches verwendet wird um die Bedingungen festzulegen wie das Geld ausgegeben werden kann
        this.amount = amount;                               // <-- Speichert den Betrag ab, welcher übertragen wird
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
// diese Ausgabe kann nur mit einem zulässigen Schlüssel ausgegeben werden
class UnspentPhantomOutput {
    constructor(keyset_algorithmn, phantom_pkey, reciver_pkey, amount) {
        // Überprüft ob der KeySet Algoritmus korrekt ist
        if(typeof keyset_algorithmn !== 'string') throw new Error('Invalid data type for keyset algorithmn');
        if(keyset_algorithmn.length !== 2) throw new Error('Invalid key algorithmn length');

        // Es wird geprüft ob das PhantomKey Argument korrekt ist
        if(typeof phantom_pkey !== 'string') throw new Error('Invalid data type for phantom key');

        // Es wird geprüft ob der EmpfängerKey / Hash korrekt ist
        if(typeof reciver_pkey !== 'string') throw new Error('Invalid data type for reciver / public key / hash');
        if(reciver_pkey.length !== 64) throw new Error('Invalid length for reciver');

        // Es wird geprüft ob der Betrag die benötigten Regeln erfüllt
        if(typeof amount !== 'bigint') throw new Error('Invalid data type for amount value');
        if(amount < 1n) throw new Error('Invalid amount value');

        // Speichert die Benötigten Daten des Ausgangs ab
        this.keyset_algorithmn = keyset_algorithmn;             // <-- Speichert den verwendeten Kryptographischen Algorithmus ab
        this.phantom_pkey = phantom_pkey;                       // <-- Speichert den Öffentlichen Phantom Schlüssel ab
        this.reciver_pkey = reciver_pkey;                       // <-- Speichert den Hash oder Öffentlichen Schlüssel des eigentlichen Empfängers ab
        this.amount = amount;                                   // <-- Speichert den Betrag ab welcher übertragen werden soll
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Key Algorithmus wird in Hex umgewandelt
        let hexed_keyset_algorithmn = this.keyset_algorithmn.toString(16).padStart(2, 0);

        // Die Länge des Phantom Keys wird umgewandelt
        let phantom_pkey_length = intToVInt(this.phantom_pkey.length);

        // Der Gesamte String wird erstellt
        let total_str = `${phantom_pkey_length}${this.phantom_pkey}`;

        // Die Länge des ReciverImages wird in vINT umgewandelt
        let reciver_image = intToVInt(this.reciver_pkey.length);

        // Der Gesamte ReciverImage String wird erstellt
        let total_reciver_str = `${reciver_image}${this.reciver_pkey}`;

        // Der zu Empfangende Betrag wird in Hex umgewandelt
        let hexed_amount = this.amount.toString(16);

        // Die Länge des Hex Betraged wird ermittelt
        let amount_len = intToVInt(hexed_amount.length);

        // Der Gesamte String für den Betrag wird zusammengesetzt
        let amount_total_str = `${amount_len}${hexed_amount}`;

        // Die Ausgabe wird Zusammengefasst
        return `02${hexed_keyset_algorithmn}${total_str}${total_reciver_str}${amount_total_str}`.toLowerCase();
    };
};

// Wird verwendet um Daten an eine Skript Ausgabe anzuhängen, das Skript kann nicht auf die Daten zugreifen.
// Die Daten werden mit der Transaktion in die Blockchain geschrieben und bleiben dort bestehen bis die Transaktion ausgegeben wurde
class UnspentOutputWithDataFields extends UnspentOutput {
    constructor(keyset_algorithmn, phantom_pkey, reciver_pkey, amount, data_field) {
        super(keyset_algorithmn, phantom_pkey, reciver_pkey, amount);

        // Die Datenfelder werden geprüft
        if(typeof data_field !== 'object') throw new Error('Invalid data field');

        // Das Datenfeld wird zwischengespeichert
        this.data_field = data_field;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        let vint_amount = intToVInt(this.amount);

        // Die Länge des Ausgangs wird erzeugt
        let unlocking_script_len = intToVInt(this.locking_script_hex.length);

        // Die Datenfelder werden in Hex umgewandelt
        let converted_data_hex_field = Buffer.from(this.data_field).toString('hex');

        // Die Länge des Hex Feldes wird umgewandelt
        let data_field_hex_len = intToVInt(converted_data_hex_field.length);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `03${vint_amount}${unlocking_script_len}${this.locking_script_hex}${data_field_hex_len}${converted_data_hex_field}`.toLowerCase();
    };
};

// Wird verwendet um Daten an ein PhantomOutput zu senden
// es besteht die Möglichkeit verschlüsselte Daten anzuhängen.
class UnspentPhantomOutputWithDataFields extends UnspentPhantomOutput {
    constructor(keyset_algorithmn, phantom_pkey, reciver_pkey, amount, data_field) {
        super(keyset_algorithmn, phantom_pkey, reciver_pkey, amount);

        // Die Datenfelder werden geprüft
        if(typeof data_field !== 'object') throw new Error('Invalid data field');

        // Das Datenfeld wird zwischengespeichert
        this.data_field = data_field;
    };
};


// Die Klassen werden Exportiert
module.exports = {
    UnspentPhantomOutputWithDataFields:UnspentPhantomOutputWithDataFields,
    UnspentOutputWithDataFields:UnspentOutputWithDataFields,
    UnspentPhantomOutput:UnspentPhantomOutput,
    UnspentOutput:UnspentOutput,
    CoinbaseInput:CoinbaseInput,
    TxInput:TxInput,
};
