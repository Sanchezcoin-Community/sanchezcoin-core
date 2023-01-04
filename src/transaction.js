const { TxInput, CoinbaseInput, UnspentOutput } = require('./utxos');
const blockchain_crypto = require('sanchez-crypto');
const { intToVInt, isBigInt } = require('./vint');
const scriptvm = require('./condscript');
const base32 = require('base32');
const utxos = require('./utxos');



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

    computeTxId() {
        return blockchain_crypto.sha3(384, this.computeHash());
    };

    getTotalOutputAmount() {
        let total_amount = 0n;
        for(let otem of this.outputs) total_amount += otem.amount;
        return total_amount;
    };
};

// Stellt eine Signatur in Kombination mit einem Skript bereit
class UnlockingScriptLink {
    constructor(input_no, unlocking_script) {
        this.unlocking_script = unlocking_script;
        this.input_nos = input_no;
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
    constructor(inputs, outputs, sig_scripts) {
        // Speichert die Daten zwischen
        this.unlocking_scripts = sig_scripts;
        this.outputs = outputs;
        this.inputs = inputs;
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
        for(let otem of this.unlocking_scripts) { total_unlocking_scripts_str += otem.toRaw(); }

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
        this.public_key = public_key;
        this.signature = signature;
        this.type = type;
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

        return `${type}${public_key_len}${recon_address}${sig_len}${recon_signated}`.toLowerCase();
    };
};

// Stellt ein Kombination an Signaturen bereit
class SignatureBox {
    constructor(linked_unlock_script_sigs, signatures) {
        this.linked_unlock_script_sigs = linked_unlock_script_sigs;
        this.signatures = signatures;
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

// Gibt alle Unlocking Skripte zusammen mit allen Signaturen und den verwendeten Eingängen aus
class ScriptSigBundle {
    constructor(tx_input_hash, tx_input_hight, unlocking_scripts, sig_msg_digest, signatures) {
        this.signatures = signatures;
        this.unlocking_script = unlocking_scripts;
        this.sig_msg_digest = sig_msg_digest;
        this.tx_input_hash = tx_input_hash;
        this.tx_input_hight = tx_input_hight;
    };
};

// Gibt ein Signiertes Objekt aus
class SignatedTransaction extends UnsignatedTransaction {
    constructor(inputs, outputs, sig_scripts, signatures) {
        super(inputs, outputs, sig_scripts);
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
        return `${raw_tx_data}${total_signatures_hex_int}${total_hex_str}`.toLowerCase();
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

    computeTxId() {
        return blockchain_crypto.sha3(384, this.computeHash())
    };
};

// Wird verwendet um eine Transaktion in Hexform einzulesen
function readFromHexString(tx_hex_str) {
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
    while(tx_inputs.length < total_inputs) {
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
    while(tx_outputs.length < total_outputs) {
        // Es wird geprüft ob es sich um einen Zulässigen Typen handelt
        if(cleared_tx_hex_str.substring(0, 2) !== '01') throw new Error('Invalid tx output');
        cleared_tx_hex_str = cleared_tx_hex_str.substring(2);

        // Der Ausgegebene Wert wird eingelesen
        let amount_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let amount = BigInt(`0x${cleared_tx_hex_str.substring(0, amount_size)}`, 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(amount_size);

        // Die Sperrzeit in form der Blockhöhe wird eingelesen
        let block_hight_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let block_lock_hight = BigInt(`0x${cleared_tx_hex_str.substring(0, block_hight_size)}`, 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(block_hight_size);

        // Die Sperrzeit in form der UnixTime wird eingelesen
        let n_lock_time_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let n_lock_time = BigInt(`0x${cleared_tx_hex_str.substring(0, n_lock_time_size)}`, 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(n_lock_time_size);

        // Das Locking Skript wird eingelesen
        let locking_script_size = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
        let script_size = parseInt(cleared_tx_hex_str.substring(0, locking_script_size), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(locking_script_size);
        let locking_script = cleared_tx_hex_str.substring(0, script_size);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(script_size);

        // Das Ausgangsobjekt wird erstellt
        let output_obj = new UnspentOutput(locking_script, amount, block_lock_hight, n_lock_time);
        tx_outputs.push(output_obj);
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

    // Die Unlocking Skripte werden eingelesen
    let recovered_unlocking_scripts = [];
    while(recovered_unlocking_scripts.length < total_unlocking_scripts) {
        // Die Anzahl der Verlinkten Eingänge wird ermittelt
        let total_linked_inputs = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(4);

        // Die Eingänge werden eingelesen
        let readed_inputs = [];
        while(readed_inputs.length < total_linked_inputs) {
            let readed_input_hight = parseInt(cleared_tx_hex_str.substring(0, 4), 16);
            cleared_tx_hex_str = cleared_tx_hex_str.substring(4);
            readed_inputs.push(readed_input_hight);
        }

        // Die Länge des Skriptes wird eingelesen
        let vint_script_len = parseInt(cleared_tx_hex_str.substring(0, 2), 16);
        cleared_tx_hex_str = cleared_tx_hex_str.substring(2);

        
    }
};

// Wird verwendet um ScriptSig in zusammenhang mit dem Locking Skript zu überprüfen
async function validateSigScriptBundle(sig_script_object, locking_script, current_block_hight, current_block_hash, current_block_hash_algo, current_block_diff, current_block_timestamp, tx_block_hight, tx_timestamp, debug=false) {
    // Die Signaturen werden vorbereitet
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
    scriptvm.getPayToEthereumAddress('0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB').then((locking_script) => {
        let cb_input = new utxos.CoinbaseInput();
        let cb_output = new utxos.UnspentOutput(locking_script, 100000000n, 0n, 0n)
        let coinbase_transaction = new CoinbaseTransaction(0n, [cb_input], [cb_output]);

        // Das Unlocking Test Skript wird erzeugt
        let eth_sig_unlocking_script = `
        add_verify_key(EthAddress(0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB));
        verify_sig();
        exit();
        `

        // Das Skript wird geparsr
        scriptvm.parseScript(eth_sig_unlocking_script).then(async (parsed_unlocking_script) => {
            // Die Verwendete Transaktion wird angegeben
            let script_input = new utxos.TxInput(coinbase_transaction.computeTxId(), 0);

            // Die Outputs werden erzeugt
            let script_output = new utxos.UnspentOutput(locking_script, 40000000n, 0n, 0n);
            let script_output1 = new utxos.UnspentOutput(locking_script, 50000000n, 0n, 0n);

            // Die Unlocking Skripte für die Verwendeten Transaktionen werden erzeugt
            let unlocking_script_link = new UnlockingScriptLink([0], parsed_unlocking_script);

            // Das Transaktionsobejekt wird erzeugt
            let unsignated_transaction = new UnsignatedTransaction([script_input], [script_output, script_output1], [unlocking_script_link]);

            // Die Signatur für die Transaktion wird erzeugt
            let tx_signature = new SignatureObject('ethadr', '0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB', '5ad2a9b34297664ed07aba559219ff5f9f19f6e2fb08033b8b30e2a6e8208b7c51634784f66dfb6b631c2c7d8d044ac4d06c48aba2adbeb0919e2035419f8b571c');
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

            for(let otem of final_transaction.getScriptSigPairs()) {
                let rvar = await validateSigScriptBundle(otem, locking_script, 1n, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha3_256', '', '1672342440', 1n, '1672322440');
                if(rvar !== true) {
                    console.log('Invalid tx scriptsig');
                }
                else {
                    console.log('Validate tx scriptsig');
                }
            }

            readFromHexString(final_transaction.getRawData());
        });
    });
})();