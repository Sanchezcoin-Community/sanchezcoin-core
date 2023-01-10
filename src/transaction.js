const { TxInput, CoinbaseInput, UnspentOutput } = require('./utxos')
const blockchain_crypto = require('sanchez-crypto');
const { intToVInt, isBigInt } = require('./vint');
const { tx_parms } = require('./constants');
const scriptvm = require('./condscript');
const utxos = require('./utxos');


// Wird verwendet um die Eingänge einer Transaktion zu überprüfen
function validateTxInputs(tx_inputs, coinabse=false) {
    let checked_objects = [], has_alw_coinbase_input = false;
    for(let input_item of tx_inputs) {
        if(typeof input_item !== 'object') return false;
        if(input_item.constructor.name !== 'CoinbaseInput' && input_item.constructor.name !== 'TxInput') return false;
        if(input_item.constructor.name === 'CoinbaseInput') {
            if(has_alw_coinbase_input === true) {
                return false;
            }
            has_alw_coinbase_input = true;
        }
        checked_objects.push(input_item);
    }
    if(coinabse === true && has_alw_coinbase_input !== true) return false;
    return tx_inputs.length === checked_objects.length;
};

// Wird verwendet um die Ausgänge einer Transaktion zu überprüfen
function validateTxOutput(tx_outputs, coinbase=false) {
    let checked_output = [];
    for(let output_item of tx_outputs) {
        if(typeof output_item !== 'object') throw new Error('Invalid tx input type');
        if(output_item.constructor.name === 'UnspentOutput' || output_item.constructor.name === 'UnspentPhantomOutput') {
            if(coinbase === false) {
                if(output_item.amount < 1n) return false;
            }
            else {
                if(output_item.amount < 0n) return false;
            }
        }
        else {
            throw new Error('Invalid tx input object');
        }
        checked_output.push(output_item);
    }
    return checked_output.length !== tx_outputs;
};

// Wird verwendet um die Unlocking Skripte einer Transaktion zu überprüfen
function validateTxUnlockingScripts(tx_scripts, coinabse=false) {
    if(coinabse === true) return false;
    let unlocking_script_tx_checked = [];
    for(let otem of tx_scripts) {
        if(typeof otem !== 'object') return false;
        if(otem.constructor.name !== 'UnlockingScriptLink') return false;
        unlocking_script_tx_checked.push(otem);
    }
    return unlocking_script_tx_checked.length === tx_scripts.length;
};


// Stellt eine Coinbase Transaktion dar
// diese Transaktion wird verwendet um die Gebühren sowie den Reward an den Block ersteller zu übergeben
class CoinbaseTransaction {
    constructor(blockHight, inputs, outputs) {
        // Es wird geprüft ob es sich bei der Angabe um die Blockhöhe um eine Korrekte angabe handelt
        if(isBigInt(blockHight) !== true) throw Error('Invalid current block hight');

        // Es wird geprüft ob es sich um einen Zulässigen Input Parameter handelt
        if(typeof inputs !== 'object' || Array.isArray(inputs) !== true) throw new Error('Invalid Input parameter data type');

        // Es wird geprüft ob es sich um einen Zulässigen Output Parameter handelt
        if(typeof outputs !== 'object' || Array.isArray(outputs) !== true) throw new Error('Invalid Output parameter data type');

        // Es wird geprüft ob die Eingänge für eine Coinbase Transaktion korrekt sind
        if(validateTxInputs(inputs, true) !== true) throw new Error('Invalid transaction inputs');

        // Es wird geprüft ob die Ausgänge für eine Coinbase Transaktion korrekt sind
        if(validateTxOutput(outputs, true) !== true) throw new Error('Invalid transaction outputs');

        // Wird geprüft ob die Anzahl der Erlaubten Eingänge überschritten wurde
        if(inputs.length > tx_parms.max_inputs) throw new Error('To many inputs for transaction');

        // Wird geprüft ob die Anzahl der Erlaubten Ausgänge überschritten wurde
        if(outputs.length > tx_parms.max_outputs) throw new Error('To many outputs for transaction');

        // Es wird geprüft ob die Mindestanzahl an Eingängen vorhanden ist
        if(inputs.length < 1n) throw new Error('To low inputs for transaction');

        // Es wird geprüft ob die Mindestanzahl an Ausgängen vorhanden ist
        if(outputs.length < 1n) throw new Error('To low outputs for transaction');

        // Es wird geprüft ob der Block größer oder gleich 0 ist
        if(blockHight < 0n) throw new Error('Invalid block hight');

        // Speichert die Daten zwischen
        this.blockHight = blockHight;           // <-- Gibt die Aktuelle Blockhöhe an
        this.outputs = outputs;                 // <-- Gibt alle Ausgänge an, die Verwendet wurden
        this.inputs = inputs;                   // <-- Gibt alle Eingänge an, die Verwendet wurden
    };

    // Gibt die Transaktion als RAW Bytes aus
    getRawData() {
        // Es werden alle Eingänge abgerufen
        let totalInputHexStringed = '';
        for(let otem of this.inputs) { totalInputHexStringed += otem.getRawData(); }

        // Die Gesamtanzahl aller Eingänge wird umgewandelt
        let total_inputs_hex_len = this.inputs.length.toString(16).padStart(4, 0).toLowerCase();

        // Es werden alle ausgänge abgerufen
        let totalRawHexString = '';
        for(let otem of this.outputs) { totalRawHexString += otem.getRawData(); }

        // Die Anzahl aller Ausgänge wird ermittelt
        let total_output_hex_len = this.outputs.length.toString(16).padStart(4, 0).toUpperCase();

        // Aus der Blockhöhe wird in ein vInt umgewandelt
        let current_block_hight = intToVInt(this.blockHight);

        // Die Daten werden zusammengeführt
        return`01000000${total_inputs_hex_len}${totalInputHexStringed}${total_output_hex_len}${totalRawHexString}${current_block_hight}`.toLowerCase();
    };

    // Erzeugt einen Hash aus der Coinbase Transaktion
    computeHash() {
        let imageh = blockchain_crypto.sha3(256, this.getRawData());
        return imageh.toLowerCase();
    };

    // Gibt die Vollständige TransaktionsID aus
    computeTxId() {
        return blockchain_crypto.sha3(384, this.computeHash());
    };

    // Gibt die Insgesamte Menge an ausgängen aus
    getTotalOutputAmount() {
        let total_amount = 0n;
        for(let otem of this.outputs) total_amount += otem.amount;
        return total_amount;
    };
};

// Stellt eine Signatur in Kombination mit einem Skript bereit
class UnlockingScriptLink {
    constructor(input_no, unlocking_script) {
        // Es wird geprüft ob es sich um einen Gültigen Input Array Parameter handelt
        if(typeof input_no !== 'object' || Array.isArray(input_no) !== true) throw new Error('Invalid inputs parameter data type');

        // Die Einzelnen Verlinkungen werden geprüft
        for(let otem of input_no) {
            if(typeof otem !== 'number') throw new Error('Invalid input hight data type');
            if(otem < 0) throw new Error('Invalid number hight')
            if(otem > BigInt(tx_parms.max_inputs)) throw new Error('Invalid tx item');
        }

        // Es wird geprüft ob die größe des Unlocking Skriptes
        if(unlocking_script.length > tx_parms.unlocking_script_max_size) throw new Error('Invalid unlocking script size');

        // Speichert das Unlocking Skript sowie die verwendeten Inputs Höhen ab
        this.unlocking_script = unlocking_script;           // <-- Speichert das Locking Skript ab, welches verwendet werden soll
        this.input_nos = input_no;                          // <-- Speichert die Höhe des Inputs ab
    };

    toRaw() {
        // Die Anzahl der Insgesamt verwendeten Eingänge wird ermittelt
        let total_inputs = this.input_nos.length.toString(16).padStart(4, 0);

        // Die Höhen der Verwendeten Eingänge wird ermittelt
        let used_inputs = '';
        for(let otem of this.input_nos) { used_inputs += otem.toString(16).padStart(4, 0); }

        // Die Gesamtlänge des Skriptes wird ermittelt
        let total_script_len = intToVInt(this.unlocking_script.length);

        // Das Skript wird umgewandelt
        return`${total_inputs}${used_inputs}${total_script_len}${this.unlocking_script}`.toLowerCase();
    };
};

// Stellt eine nicht Signierte Transaktion dar
class UnsignatedTransaction {
    constructor(inputs, outputs, unlockig_scripts) {
        // Es wird geprüft ob es sich um einen Zulässigen Input Parameter handelt
        if(typeof inputs !== 'object' || Array.isArray(inputs) !== true) throw new Error('Invalid Input parameter data type');

        // Es wird geprüft ob es sich um einen Zulässigen Output Parameter handelt
        if(typeof outputs !== 'object' || Array.isArray(outputs) !== true) throw new Error('Invalid Output parameter data type');

        // Es wird geprüft ob es sich um einen Zulässigen Skript Parameter handelt
        if(typeof unlockig_scripts !== 'object' || Array.isArray(unlockig_scripts) !== true) throw new Error('Invalid script transactions');

        // Es wird geprüft ob die Eingänge für eine Coinbase Transaktion korrekt sind
        if(validateTxInputs(inputs, false) !== true) throw new Error('Invalid transaction inputs');

        // Es wird geprüft ob die Ausgänge für eine Coinbase Transaktion korrekt sind
        if(validateTxOutput(outputs, false) !== true) throw new Error('Invalid transaction outputs');

        // Es wird geprüft ob es sich um gültige Unlocking Skripte handelt
        if(validateTxUnlockingScripts(unlockig_scripts, false) !== true) throw new Error('Invalid unlocking scripts');

        // Wird geprüft ob die Anzahl der Erlaubten Eingänge überschritten wurde
        if(inputs.length > tx_parms.max_inputs) throw new Error('To many inputs for transaction');

        // Wird geprüft ob die Anzahl der Erlaubten Ausgänge überschritten wurde
        if(outputs.length > tx_parms.max_outputs) throw new Error('To many outputs for transaction');

        // Es wird geprüft ob die Anzahl der Erlaubten Skripte überschritten wurde
        if(unlockig_scripts.length > tx_parms.max_unlocking_scripts) throw new Error('To many unlocking scripts for transaction');

        // Es wird geprüft ob die Mindestanzahl an Eingängen vorhanden ist
        if(inputs.length < 1n) throw new Error('To low inputs for transaction');

        // Es wird geprüft ob die Mindestanzahl an Ausgängen vorhanden ist
        if(outputs.length < 1n) throw new Error('To low outputs for transaction');

        // Es wird geprüft ob die Mindestanzahl der Skripte vorhanden sind
        if(unlockig_scripts.length < 1n) throw new Error('To low unlocking scripts');

        // Es wird geprüft ob Midnestens 1 Eingang sowie 1 Ausgang vorhanden ist
        if(inputs.length < 1 || outputs.length < 1) throw new Error('Invalid transaction, need minimum one input or output');

        // Speichert die Daten zwischen
        this.unlocking_scripts = unlockig_scripts;                                          // <-- Speichert die Verfügbaren Unlocking Skripte der Transaktion ab
        this.outputs = outputs;                                                             // <-- Speichert die Verfügbaren Eingänge der Transaktion ab
        this.inputs = inputs;                                                               // <-- Speichert die Verfügbaren Ausgänge der Transaktion ab
    };

    // Gibt die Transaktion als RAW Bytes aus
    getRawData() {
        // Die Gesamtanzahl aller Eingänge wird umgewandelt
        let total_inputs_hex_len = this.inputs.length.toString(16).padStart(4, 0).toLowerCase();

        // Es werden alle Eingänge abgerufen
        let totalInputHexStringed = '';
        for(let otem of this.inputs) { totalInputHexStringed += otem.getRawData(); }

        // Die Anzahl aller Ausgänge wird ermittelt
        let total_output_hex_len = this.outputs.length.toString(16).padStart(4, 0).toLowerCase();

        // Es werden alle ausgänge abgerufen
        let totalRawHexString = '';
        for(let otem of this.outputs) { totalRawHexString += otem.getRawData(); }

        // Es werden alle UnlockingScripts extrahiert
        let total_unlocking_scripts_str = '';
        let total_unlocking_scripts_total = this.unlocking_scripts.length.toString(16).padStart(4, 0).toLowerCase();
        for(let otem of this.unlocking_scripts) total_unlocking_scripts_str += otem.toRaw();

        // Die Daten werden zusammengeführt
        return`02000000${total_inputs_hex_len}${totalInputHexStringed}${total_output_hex_len}${totalRawHexString}${total_unlocking_scripts_total}${total_unlocking_scripts_str}`.toLowerCase();
    };

    // Erzeugt einen Hash aus der Coinbase Transaktion
    computeHash() {
        const hash = blockchain_crypto.sha3(256, this.getRawData());
        return hash;
    };

    // Gibt alle Verwendeten Adressen aus
    getAllAddresses() {
        return [];
    };

    // Gibt ein Signiertes Transaktions Objekt aus
    buildSignatedObject(...signatures) {
        let signated_obj = new SignatedTransaction(this.inputs, this.outputs, this.unlocking_scripts, [...signatures]);
        return signated_obj;
    };
};

// Stellt eine Signatur dar
class SignatureObject {
    constructor(type, public_key, signature) {
        // Es wird geprüft ob es sich um einen gültigen Datentypen der Type angabe handelt
        if(typeof type !== 'string') throw new Error('Invalid type parameter data type');

        // Es wird geprüft ob es sich um einen gültigen Datentypen des Öffentlichen Schlüssels handelt
        if(typeof public_key !== 'string') throw new Error('Invalid public key parameter data type');

        // Es wird geprüft ob es sich um einen einen gültigen Datentypen der Signatur handelt
        if(typeof signature !== 'string') throw new Error('Invalid signature data type');

        // Es wird geprüft ob es sich um eine gültige Type angabe der Transaktion handelt
        if(typeof type !== 'ethadr') {
            if(public_key.length === 40) {
                if(blockchain_crypto.alt_coin_crypto.isValidateEthereumAddressSync(`0x${public_key}`) !== true) throw new Error('Invalid ')
            }
            else if(public_key.length === 42) {
                if(blockchain_crypto.alt_coin_crypto.isValidateEthereumAddressSync(public_key) !== true) throw new Error('Invalid ')
            }
            else {
                throw new Error('Invalid Web3 Ethereum Address');
            }
        }
        else {
            throw new Error('Invalid signature type');
        }

        // Speichert die Daten ab
        this.public_key = public_key;                               // <-- Speichert den Öffentlichen Schlüssel / die Adresse ab, welche zum Signieren verwendet wurde
        this.signature = signature;                                 // <-- Speichert die verwendete Signatur ab
        this.type = type;                                           // <-- Speichert den Typen / Algorythmus des verwendeten Signaturverfahren ab
    };

    toRaw() {
        let recon_address = `${this.public_key}`;
        let recon_signated = `${this.signature}`;

        let type = '';
        if(this.type === 'ethadr') {
            if(recon_address.startsWith('0x') === true) recon_address = recon_address.substring(2);
            type = '00';
        }
        else throw new Error('Invalid public key type');

        let public_key_len = recon_address.length.toString(16).padStart(4, 0);
        let sig_len = recon_signated.length.toString(16).padStart(4, 0);

        let a = `${type}${public_key_len}${recon_address}${sig_len}${recon_signated}`.toLowerCase();
        return a;
    };
};

// Stellt ein Kombination an Signaturen bereit
class SignatureBox {
    constructor(linked_unlock_script, signatures) {
        // Es wird geprüft ob es sich um einen gültigen Linked Unlocking Skript Link Parameter handelt
        if(typeof linked_unlock_script !== 'object' || Array.isArray(linked_unlock_script) !== true) throw new Error('Invalid unlocking script link parameter');

        // Es wird geprüft ob es sich um einen gültigen Signatur Parameter handelt
        if(typeof signatures !== 'object' || Array.isArray(signatures) !== true) throw new Error('Invalid signatures parameter');

        // Es wird geprüft ob es sich um zulässige Linked Unlocking Scripte handelt
        for(let otem of linked_unlock_script) {
            if(typeof otem !== 'number') throw new Error('Invalid script link data type');
            if(otem < 0) throw new Error('Invalid script link data hight');
            if(otem > BigInt(tx_parms.max_inputs)) throw new Error('Invalid tx item');
        }

        // Es wird geprüft ob es sich um zulässige Signaturen handelt
        for(let otem of signatures) {
            if(typeof otem !== 'object') throw new Error('Invalid data type for signature');
            if(otem.constructor.name !== 'SignatureObject') throw new Error('Invalid data type, no signature object');
        }

        // Speichert die benötigten Objektdaten ab
        this.linked_unlock_script_sigs = linked_unlock_script;          // <-- Speichert ab, welche Unlocking Skripte diese Signatur verwenden
        this.signatures = signatures;                                   // <-- Speichert alle Signaturen ab, welche zu diesem Unlocking Skript gehören
    };

    toRaw() {
        // Die Anzahl der Insgesamt verwendeten Eingänge wird ermittelt
        let total_unlock_scripts = this.linked_unlock_script_sigs.length.toString(16).padStart(4, 0);

        // Die Höhen der Verwendeten Einagbe Skripte wird Iteriert
        let used_unlock_scripts = '';
        for(let otem of this.linked_unlock_script_sigs) { used_unlock_scripts += otem.toString(16).padStart(4, 0); }

        // Die Anzahl der verwendeten Signaturen wird geschrieben
        let total_signatures = this.signatures.length.toString(16).padStart(4, 0);

        // Die Einzelnen Signaturen werden werden Iteriert
        let used_signatures = '';
        for(let otem of this.signatures) used_signatures += otem.toRaw();

        // Die Strings werden zurückgegeben
        return `${total_unlock_scripts}${used_unlock_scripts}${total_signatures}${used_signatures}`.toLowerCase();
    };
};

// Speichert alle Zugehörigen Daten für eine Signatur überprüfung aus
class ScriptSigBundle {
    constructor(tx_input_hash, tx_input_hight, unlocking_scripts, sig_msg_digest, signatures) {
        // Es wird geprüft ob der TxInputHash Parameter die Bedingungen erfüllt
        if(typeof tx_input_hash !== 'string') throw new Error('Invalid tx input hahs data type');
        if(tx_input_hash.length !== 96) throw new Error('Invalid length for tx input hash');

        // Es wird geprüft ob der TxInputHight Parameter die Bedingungen erfüllt
        if(typeof tx_input_hight !== 'number') throw new Error('Invalid tx input hight data type');
        if(tx_input_hight < 0) throw new Error('Invalid tx input hight');
        if(tx_input_hight > tx_parms.max_inputs) throw new Error('Invalid to hight tx input hight');

        // Es wird geprüft ob der Unlocking Script Parameter korrekt ist
        if(typeof unlocking_scripts !== 'string') throw new Error('Invalid UnlockingScript data type');

        // Es wird geprüft ob die Bedingungen für die Länge zutreffend sind
        if(unlocking_scripts.length < 12 || unlocking_scripts.length > tx_parms.unlocking_script_max_size) throw new Error('Invalid UnlockingScript data type length');

        // Es wird geprüft ob der SignMsgHash Parameter korrekt ist
        if(typeof sig_msg_digest !== 'string' || sig_msg_digest.length !== 64) throw new Error('Invalid sign msg digest data type');

        // Es wird geprüft ob der Signatur Parameter korrekt ist
        if(typeof signatures !== 'object' || Array.isArray(signatures) !== true) throw new Error('Invalid signatures parameter');

        // Es wird geprüft ob Mindestens 1 Signatur vorhaden ist
        if(signatures.length < 1) throw new Error('Invalid signatures size, to low');

        // Es wird geprüft ob die Maximale Anzahl von Signaturen erreicht wurden
        if(signatures.length > tx_parms.max_signatures) throw new Error('Invalid signatues, to many');

        // Es wird geprüft ob die Signatur Objekte korrekt sind
        for(let otem of signatures) {
            if(typeof otem !== 'object' || otem.constructor.name !== 'SignatureObject') throw new Error('Invalid signature object');
        }

        // Speichert die Objektdaten die zusammengehörig sind ab
        this.unlocking_script = unlocking_scripts;                          // <-- Gibt das Verwendete Unlocking Skript ab
        this.sig_msg_digest = sig_msg_digest;                               // <-- Speichert den Hash ab welcher zur überprüfung der Transaktion geprüft werden soll
        this.tx_input_hash = tx_input_hash;                                 // <-- Gibt den Hash des verwendeten Inputs an welches geprüft werden soll
        this.tx_input_hight = tx_input_hight;                               // <-- 
        this.signatures = signatures;
    };
};

// Gibt ein Signiertes Objekt aus
class SignatedTransaction extends UnsignatedTransaction {
    constructor(inputs, outputs, sig_scripts, signatures) {
        // Das Basis Objekt wird erstellt
        super(inputs, outputs, sig_scripts);

        // Es wird geprüft ob der Signatur Parameter korrekt ist
        if(typeof signatures !== 'object' || Array.isArray(signatures) !== true) throw new Error('Invalid signatures parameter');

        // Es wird geprüft ob die Mindestanzahl von 1ner Signatur oder der Maximalen Anzahl von Signaturen korrekt ist
        if(signatures.length < 1 || signatures.length > tx_parms.max_signatures) throw new Error('Invalid transaction, invalid signature field');

        // Es wird geprüft ob die Signaturen korrekt sind
        for(let otem of signatures) {
            if(typeof otem !== 'object' || otem.constructor.name !== 'SignatureBox') throw new Error('Invalid signature object type');
        }

        // Speichert die Signaturen ab
        this.signatures = signatures;
    };

    // Gibt den die RawDaten der Transaktion aus
    getRawData() {
        let raw_tx_data = super.getRawData();

        // Die gesamtzahl aller Signaturen wird angegeben
        let total_signatures_hex_int = this.signatures.length.toString(16).padStart(4, 0);

        // Alle Signaturen werden extrahiert
        let total_hex_str = '';
        for(let otem of this.signatures) total_hex_str += otem.toRaw();

        // Der String wird zusammengebaut
        return `${raw_tx_data}${total_signatures_hex_int}${total_hex_str}`
    };

    // Gibt Paarweise alle Eingänge, Ausgänge mit den Zugehörigen Signaturen aus
    getScriptSigPairs() {
        // Es werden alle Signaturen den Unlocking Skripten zusammengeführt
        let bundle_objects = [];
        for(let sig_item of this.signatures) {
            // Es werden alle SigScripts zugeorndet
            for(let sig_script_item_hight of sig_item.linked_unlock_script_sigs) {
                // Das Unlocking Skript wird abgerufen
                let unlocking_script = this.unlocking_scripts[sig_script_item_hight];

                // Die Verwendeten Eingänge werden abgerufen
                for(let unlocking_script_inputs of unlocking_script.input_nos) {
                    // Die Eingänge werden abgerufen
                    let retrive_input = this.inputs[unlocking_script_inputs];

                    // Das ScriptSigBundle wird erzeugt
                    let script_sig_bundle = new ScriptSigBundle(retrive_input.txId, retrive_input.outputHight, unlocking_script.unlocking_script, this.computeSigningHash(), [...sig_item.signatures]);

                    // Fügt das ScriptSigBundle hinzu
                    bundle_objects.push(script_sig_bundle);
                } 
            }
        }

        // Gibt die Bundle Daten zurück
        return bundle_objects;
    };

    // Gibt die Gesamtsumme der Gesendeten Summe
    getTotalOutputAmount() {
        let total_amount = 0n;
        for(let otem of this.outputs) total_amount += otem.amount;
        return total_amount;
    };

    // Gibt den Signing Hash aus
    computeHash() {
        return blockchain_crypto.sha3(256, this.getRawData());
    };

    // Gibt die Signatur Hash aus
    computeSigningHash() {
        return blockchain_crypto.sha3(256, super.getRawData());
    };

    // Gibt alle Eingänge aus
    getAllInputs() {
        let rsval = [];
        for(let otem of this.inputs) rsval.push({ txid:otem.txId, hight:otem.outputHight });
        return rsval;
    };

    // Gibt die Id der Transaktion aus
    computeTxId() {
        return blockchain_crypto.sha3(384, this.computeHash())
    };
};

// Wird verwendet um eine Transaktion in Hexform einzulesen
async function readFromHexString(tx_hex_str) {
    // Es wird geprüft ob es sich um eine Coinbase Transaktion handelt
    if(tx_hex_str.toLowerCase().startsWith('01000000') !== true && tx_hex_str.toLowerCase().startsWith('02000000') !== true) throw new Error('Invalid transaction type');
    let header = tx_hex_str.substring(0, 8);

    // Der Anfang wird entfernt
    let cleared_tx_hex_str = tx_hex_str.toLowerCase().substring(8);

    // Die Gesamtzahl der Eingänge wird extrahiert
    let total_inputs = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
    cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

    // Die Einzelnen Eingänge werden eingelesen
    let tx_inputs = [];
    while(tx_inputs.length < total_inputs && cleared_tx_hex_str.length > 0) {
        // Der Typ des UTXOS wird eingelesen
        let type = cleared_tx_hex_str.substring(0, 2);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(2);

        // Die TX-ID wird eingelesen
        let tx_id = cleared_tx_hex_str.substring(0, 96);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(96);

        // Die Höhe des Verwendeten Ausgangs wird eingelesen
        let tx_output_hight = parseInt(cleared_tx_hex_str.substring(0, 8), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(8);

        // Es wird geprügt ob es sich um ein Coinbase Input oder ein SigTX Input handelt
        if(type === '00') {
            // Es wird ein neues Coinbase Input erstellt
            let coinbase_input = new CoinbaseInput();

            // Es wird geprüft ob die TX ID sowie die Höhe mit der in der Transaktion angebenen übereinstimmt
            if(coinbase_input.txId !== tx_id) throw new Error('Invalid coinbase tx input');
            if(coinbase_input.outputHight !== tx_output_hight) throw new Error('Invalid coinbase tx hight');

            // Das Objekt wird hinzugefügt
            tx_inputs.push(coinbase_input);
        }
        else if(type === '01') {
            // Es wird ein neues Input erstellt
            let r_input = new TxInput(tx_id, tx_output_hight);

            // Es wird geprüft ob die TX ID sowie die Höhe mit der in der Transaktion angebenen übereinstimmt
            if(r_input.txId !== tx_id) throw new Error('Invalid coinbase tx input');
            if(r_input.outputHight !== tx_output_hight) throw new Error('Invalid coinbase tx hight');

            // Das Objekt wird hinzugefügt
            tx_inputs.push(r_input);
        }
        else {
            throw new Error('Invalid tx input type');
        }
    }

    // Die Gesamtzahl der Ausgänge wird extrahiert
    let total_outputs = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
    cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

    // Die Einzelnen Ausgänge werden eingelesen
    let tx_outputs = [];
    while(tx_outputs.length < total_outputs && cleared_tx_hex_str.length > 0) {
        // Es wird geprüft ob es sich um einen Zulässigen Typen handelt
        let c_item = cleared_tx_hex_str.substring(0, 2);
        if(c_item === '01') {
            cleared_tx_hex_str = cleared_tx_hex_str.substring(2);

            // Der Ausgegebene Wert wird eingelesen
            let amount_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
            let amount = BigInt(`0x${cleared_tx_hex_str.substring(0, amount_size)}`, 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(amount_size);

            // Das Locking Skript wird eingelesen
            let locking_script_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
            let script_size = parseInt(cleared_tx_hex_str.substring(0, locking_script_size), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(locking_script_size);
            let locking_script = cleared_tx_hex_str.substring(0, script_size);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(script_size);

            // Das Ausgangsobjekt wird erstellt
            let output_obj = new UnspentOutput(locking_script, amount);
            tx_outputs.push(output_obj);
        }
        else if(c_item === '02') {

        }
        else if(c_item === '03') {

        }
        else {
            throw new Error('Invalid tx output type');
        }
    }

    // Die Transaktion wird endgültig zusammen gebaut
    if(header === '01000000') {
        // Die Aktuelle Blockhöhe wird eingelesen
        let block_hight_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let block_hight = BigInt(`0x${cleared_tx_hex_str.substring(0, block_hight_size)}`);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(block_hight_size);

        // Das Finale Objekt wird erstellt
        let final_tx_object = new CoinbaseTransaction(block_hight, tx_inputs, tx_outputs);

        // Es wird geprüft ob das Rekonstruierte Objekt Identisch mit dem 
        if(tx_hex_str.toLowerCase() !== final_tx_object.getRawData().toLowerCase()) throw new Error('Invalid transaction');

        // Das Finale Objekt wird zurückgegeben
        return { new_hex_str:cleared_tx_hex_str, tx_obj:final_tx_object};
    }

    // Die Gesamtzahl aller Unlocking Skripte wird verwendet
    let total_unlocking_scripts = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
    cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

    // Es werden alle Unlocking Skripte eingelesen
    let readed_unlocking_scripts = [];
    while(readed_unlocking_scripts.length < total_unlocking_scripts && cleared_tx_hex_str.length > 0) {
        // Die Anzahl der Insgesamt verwendeten Eingänge wird automatisch ermittelt
        let total_linked_inputs = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

        // Die Einzelnen Eingänge werden eingelesen
        let readed_links = [];
        while(readed_links.length < total_linked_inputs) {
            readed_links.push(parseInt(cleared_tx_hex_str.substring(0, 4), 16));
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        }

        // Die Länge des Skriptes wird eingelesen
        let base_script_len_vint = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let script_size_int = parseInt(cleared_tx_hex_str.substring(0, base_script_len_vint), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(base_script_len_vint);

        // Das Skript wird eingelesen
        let readed_script = cleared_tx_hex_str.substring(0, script_size_int);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(script_size_int);

        // Der Unlocking Skript Link wird erstellt
        readed_unlocking_scripts.push(new UnlockingScriptLink(readed_links, readed_script));
    }

    // Die Block oder UnixTime Sperrzeiten werden eingelesen

    // Die Anzahl der Verfügbaren Signaturen wird ermittelt
    let total_signatures = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
    cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

    // Die Einzelnen Signaturen werden eingelesen
    let readed_signatures = [];
    while(readed_signatures.length < total_signatures && cleared_tx_hex_str.length > 0) {
        // Die Anzahl der Verlinkten Unlocking Skripte wird ermittelt
        let total_linked_unlocking_scripts = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

        // Die Verwendeten Skriptlinks werden eingelesen
        let unlocking_script_links = [];
        while(unlocking_script_links.length < total_linked_unlocking_scripts && cleared_tx_hex_str.length > 0) {
            let readed_number = parseInt(cleared_tx_hex_str.substring(0, 4));
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
            unlocking_script_links.push(readed_number);
        }

        // Die Anzahl der Verfügbaren Signaturen wird ermittelt
        let total_signatures_available = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

        // Die Verfügbaren Signaturen werden eingelesen
        let r_sigs = [];
        while(r_sigs.length < total_signatures_available && cleared_tx_hex_str.length > 0) {
            // Das Verwendete Verfahren wird ermittelt
            let td_mode = cleared_tx_hex_str.substring(0, 2);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(2);

            // Die Länge des Öffentlichen Schlüssel wird ermittelt
            let pkey_len = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

            // Der Öffentliche Schlüssel wird eingelesen
            let readed_pkey = cleared_tx_hex_str.substring(0, pkey_len);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(pkey_len);

            // Die Länge der Signatur wird ermittelt
            let readed_sig_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

            // Die Signatur wird eingelesen
            let readed_sig = cleared_tx_hex_str.substring(0, readed_sig_size);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(readed_sig_size);

            // Das Signatur Objekt wird erstellt
            if(td_mode == '00') r_sigs.push(new SignatureObject('ethadr', `0x${readed_pkey}`, readed_sig));
            else throw new Error('Unkwon crypto');
        }

        // Das SignaturBox Objekt wird erzeugt
        readed_signatures.push(new SignatureBox(unlocking_script_links, r_sigs));
    }

    // Das Transaktionsobjekt wird erstellt
    let final_tx_object = new SignatedTransaction(tx_inputs, tx_outputs, readed_unlocking_scripts, readed_signatures);

    // Es wird geprüft ob die Daten der Eingelesenen Transaktion übereinstimmen
    if(final_tx_object.getRawData() !== tx_hex_str) throw new Error('Unkown tx reading error');

    // Das Finale Objekt wird zurückgegeben
    return { new_hex_str:cleared_tx_hex_str, tx_obj:final_tx_object};
};

// Wird verwendet um ScriptSig in zusammenhang mit dem Locking Skript zu überprüfen
async function validateSigScriptBundle(sig_script_object, locking_script, current_block_hight, current_block_hash, current_block_hash_algo, current_block_diff, current_block_timestamp, tx_block_hight, tx_timestamp, debug=false) {
    // Die Signaturen werden für die Prüfung vorbereitet
    let pre_constructed_sigs = [];
    for(let tx_obj of sig_script_object.signatures) {
        let script_obj = scriptvm.buildSignatureBox(tx_obj.public_key, tx_obj.type, tx_obj.signature, sig_script_object.sig_msg_digest);
        pre_constructed_sigs.push(script_obj);
    }

    // Die Daten werden geprüft
    let validate_result = null;
    try{ validate_result = await scriptvm.validateTransactionScript(current_block_hight, current_block_hash, current_block_hash_algo, current_block_diff, current_block_timestamp, tx_block_hight, tx_timestamp, [...pre_constructed_sigs], locking_script, sig_script_object.unlocking_script, debug); }
    catch(e) { return false; }

    // Es wird geprüft ob das Ergebniss korrekt ist
    return (validate_result.is_finally_true === true);
};


// Exportiert die Klassen
module.exports = {
    UnsignatedTransaction:UnsignatedTransaction,
    CoinbaseTransaction:CoinbaseTransaction,
    readFromHexString:readFromHexString
}


// Es wird geprüft ob die Datei direkt gestartet wird, wenn ja wird die Funktion ausgeführt
if (require.main === module) (() => {
    // Es wird eiene Test Coinbase Transaktion zu bauen
    scriptvm.getPayToEthereumAddress('0x93d4AD008F1Ad8432F6Ea8944A2cebF3A0954CA7').then((locking_script) => {
        let cb_input = new utxos.CoinbaseInput();
        let cb_output = new utxos.UnspentOutput(locking_script, 100000000n, 0n, 0n)
        let coinbase_transaction = new CoinbaseTransaction(0n, [cb_input], [cb_output]);

        // Das Unlocking Test Skript wird erzeugt
        let eth_sig_unlocking_script = `
        add_verify_key(EthAddress(0x93d4AD008F1Ad8432F6Ea8944A2cebF3A0954CA7));
        verify_sig();
        exit();
        `

        // Das Skript wird geparst
        scriptvm.parseScript(eth_sig_unlocking_script).then(async (parsed_unlocking_script) => {
            // Die Verwendete Transaktion wird angegeben
            let script_input = new utxos.TxInput(coinbase_transaction.computeTxId(), 0);

            // Die Outputs werden erzeugt
            let script_output = new utxos.UnspentOutput(locking_script, 40000000n);
            let script_output1 = new utxos.UnspentOutput(locking_script, 50000000n);

            // Die Unlocking Skripte für die Verwendeten Transaktionen werden erzeugt
            let unlocking_script_link = new UnlockingScriptLink([0], parsed_unlocking_script);

            // Das Transaktionsobejekt wird erzeugt
            let unsignated_transaction = new UnsignatedTransaction([script_input], [script_output, script_output1], [unlocking_script_link]);

            // Die Signatur für die Transaktion wird erzeugt
            let tx_signature = new SignatureObject('ethadr', '0x93d4AD008F1Ad8432F6Ea8944A2cebF3A0954CA7', '9563592894205e43611ee5c00350bf3b78d01b575831afeb2fdcf82e05850d5c2d7dc5961f1645a51c3537f23782d96137e6ac15af9cd0bae69fcd9dc722e65e1b');
            let signature_box = new SignatureBox([0], [tx_signature]);

            // Die Signatur wird hinzugefügt
            let final_transaction = unsignated_transaction.buildSignatedObject(signature_box);

            console.log('Signated tx hash (txID)   :', final_transaction.computeTxId());
            console.log('Coinbase tx hash (txID)   :', coinbase_transaction.computeTxId());
            console.log('Unsignated tx hash        :', unsignated_transaction.computeHash());
            console.log('Signing tx hex            :', final_transaction.computeSigningHash());
            console.log('Total amount output       :', final_transaction.getTotalOutputAmount());
            console.log()
            console.log('Coinbase tx hex   :', coinbase_transaction.getRawData());
            console.log();
            console.log('Unsignated tx hex :', unsignated_transaction.getRawData());
            console.log()
            console.log('Signated tx hex   :', final_transaction.getRawData());
            console.log();

            // Die Signaturen der Transaktion werden geprüft
            for(let otem of final_transaction.getScriptSigPairs()) {
                let rvar = await validateSigScriptBundle(otem, locking_script, 1n, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha3_256', '', '1672342440', 1n, '1672322440');
                if(rvar !== true) {
                    console.log('Invalid tx scriptsig');
                }
                else {
                    console.log('Validate tx scriptsig');
                }
            }

            // Es wird versucht die Transaktionen einzulesen
            let readed_coinbase_tx = await readFromHexString(coinbase_transaction.getRawData());
            let readed_signated_tx = await readFromHexString(final_transaction.getRawData());

            // Es wird geprüft ob die Hashes der Eingelesenen Transaktionen korrekt sind
            if(readed_coinbase_tx.tx_obj.computeHash() !== coinbase_transaction.computeHash()) throw new Error('Invalid coinabse tx returned');
            if(readed_signated_tx.tx_obj.computeHash() !== final_transaction.computeHash()) throw new Error('Invalid coinabse tx returned');
        });
    });
})();