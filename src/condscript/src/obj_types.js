// Gibt an um was für eine Nummer es sich handelt
const NumberType = {
    bit8:0,
    bit16:1,
    bit32:2,
    bit64:3,
    bit128:4,
    bit256:5
};


class ValueObject {
    constructor(value, type, acepted_d_types, is_vm_value=false) {
        // Die Werte werden abgespeichert
        this.is_vm_value = is_vm_value;
        this.dtypes = acepted_d_types;
        this.value = value;
        this.type = type;
    }
};

// Dieses Objekt wird verwendet um Hexwerte abzuspeicherrn
class HexString extends ValueObject {
    constructor(value, is_vm_value=false) {
        // Es wird geprüft ob der value Parameter vorhanden ist
        if(value === undefined || value === null) throw Error('INVALID_HEX_STRING_VALUE');

        // Es wird geprüft ob es sich um einen String handelt
        if(typeof value !== 'string') throw new Error('INVALID_DATA_TYPE_FOR_HEX_VALUE');

        // Es wird geprüft ob der String größer als 256 Zeichen ist
        if(value.length > 256) throw new Error('TO_BIG_HEX_VALUE');

        // Das Mutterobjekt wird gebaut
        super(value, "hxstr", ['cst', 'hxstr', 'num', 'hash'], is_vm_value);
    };
};

// Wird verwendet wenn es sich um eine 
class NumberValue extends ValueObject {
    constructor(value, is_vm_value=false, type=null) {
        // Es wird geprüft ob der value Parameter vorhanden ist
        if(value === undefined || value === null) throw Error('INVALID_HEX_STRING_VALUE');

        // Es wird geprüft ob es sich um ein BigInt handelt, wenn nicht wird der Vorgang abgebrochen
        if(typeof value !== 'bigint') throw new Error('INVALID_NUMBER_VALUE');

        // Es wird geprüft ob die Zahl größer oder gleich 0 ist
        if(value < BigInt(0)) throw new Error('INVALID_NUMBER_VALUE');

        // Das Mutter Objekt wird erstellt
        super(value, "num", ['cst', 'hxstr', 'num', 'bool'], is_vm_value);

        // Speichert den Typen der Nummer ab
        this.n_type = type;
    };
};

// Wird verwendet wenn es sich um einen Bool Wert handelt
class BoolValue extends ValueObject {
    constructor(value, is_vm_value=false) {
        // Es wird geprüft ob der value Parameter vorhanden ist
        if(value === undefined || value === null) throw Error('INVALID_HEX_STRING_VALUE');

        // Es wird geprüft ob es sich um ein BigInt handelt, wenn nicht wird der Vorgang abgebrochen
        if(typeof value !== 'boolean') throw new Error('INVALID_NUMBER_VALUE');

        // Das Mutter Objekt wird erstellt
        super(value, "bool", ['cst', 'hxstr', 'num', 'bool'], is_vm_value);
    };
};

// Wird verwendet wenn es sich um einen Hashwert handelt
class HashValue extends HexString {
    constructor(value, algo, is_vm_value=false) {
        // Es wird geprüft ob es sich um einen Zulässigen Algo handelt
        if(algo !== 'sha256d' && algo !== 'sha3_256' && algo !== 'swiftyh_256') throw new Error('INVALID_HASH_ALGO');

        // Das Mutter Objekt wird erzeugt
        super(value, is_vm_value);

        // Der Hash Algo wird abgespeichert
        this.algo = algo;

        // Der Type wird angepasst
        this.type = 'hash';
        this.dtypes.push('hash');
    };
};

// Wird verwendet wenn es sich um einen Leeren Wert handelt
class NullValue extends ValueObject {
    constructor() {
        super(null, "null", ['null']);
    };
};

// Wird verwendet wenn es sich um einen Öffentlichen Schlüssel handelt
class PublicKeyValue extends HexString {
    constructor(value, algo, is_vm_value=false) {
        // Es wird geprüft ob es sich um einen Zulässigen Algo handelt
        if(algo !== 'curve25519' && algo !== 'bls12381' && algo !== 'secp256k1') throw new Error('INVLAID_PUBLIC_KEY_VALUE');

        // Das Mutter Objekt wird erzeugt
        super(value, is_vm_value);

        // Der Hash Algo wird abgespeichert
        this.algo = algo;

        // Gibt an ob mit diesem Schlüssel eine Signatur geprüft wurde
        this.was_used_sig_check = false;

        // Der Type wird angepasst
        this.type = 'pkey';
        this.dtypes.push('pkey');
    };

    markAsUsed() {
        this.was_used_sig_check = true;
    };
};

// Wird verwendet wenn es sich um eine Altchain Adresse handelt
class AlternativeBlockchainAddressValue extends ValueObject {
    constructor(value, algo, is_vm_value=false) {
        // Es wird geprüft ob es sich um einen Zulässigen Algo handelt
        if(algo !== 'ethadr' && algo !== 'btcadr') throw new Error('UNKOWN_ADDRESS_TYPE');

        // Das Mutter Objekt wird erzeugt
        super(value, "addr", ['cst', 'hxstr', 'num', 'addr'], is_vm_value);

        // Gibt an ob mit diesem Schlüssel eine Signatur geprüft wurde
        this.was_used_sig_check = false;

        // Der Hash Algo wird abgespeichert
        this.algo = algo;
    };

    markAsUsed() {
        this.was_used_sig_check = true;
    };
};

// Wird verwendet um zu Signalisieren dass es sich um eine Signle Signatur handelt
class SingleSignatureValue {
    constructor(pubkey, algo, sig, msg_hash) {
        // Speichert die Daten ab
        this.msg_hash = msg_hash;
        this.value = pubkey;
        this.type = algo;
        this.sig = sig;
    };

    async fullSignatureCheck() {
        return true;
    };

    quickCheck() {
        return true;
    };
};

// Wird verwendet um einen Zeitstempel darzustellen
class DateTimestamp extends ValueObject {
    static getCurrent() {
        let base_ts = Math.floor(new Date().getTime())
        return new DateTimestamp(base_ts.toString(16).padStart(32, '0'), true);
    };

    constructor(value, is_vm_value=false) {
        if(value === undefined || value === null) throw new Error('Invalid timestamp value');
        if(typeof value !== 'string') throw new Error('Invalid timestamp data type');
        if(value.length !== 32) throw new Error('Invalid timestamp length');

        // Der Hexstring wird in eine Zahl umgewandelt
        let converted_timestamp = BigInt(`0x${value}`);
        super(converted_timestamp, "dts", ['cst', 'hxstr', 'num', 'dts'], is_vm_value);
    };

    calcSub(item_b, is_vm_value=false) {
        let b = item_b.toNumber();
        let new_v = this.toNumber() - b;
        return new DateTimestamp(new_v.toString(16).padStart(32, '0'), is_vm_value);
    };

    calcAdd(item_b, is_vm_value=false) {
        let b = item_b.toNumber();
        let new_v = this.toNumber() + b;
        return new DateTimestamp(new_v.toString(16).padStart(32, '0'), is_vm_value);
    };

    toString(type='plain') {
        if(type === 'hex') return this.value.toString(16).toLowerCase().padStart(32, '0');
        else if(type === 'plain') return this.toDateTime().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        else throw new Error('Invalid type');
    };

    toDateTime() {
        return new Date(
            parseInt(
                (this.toNumber()).toString()
            )
        );
    };

    toNumber() {
        return this.value;
    };
};

// Wird verwender um Extrem Erweiterte Bedingunden an die Transaktion anzuhängen
class CommitmentValue {
    constructor(pkey, commitment_script) {
        // Es wird geprüft ob es sich um Zulässige Parameter handelt
        if(pkey === undefined || pkey === null || typeof pkey !== 'string') throw new Error('Invalid data type for public key');
        if(commitment_script === undefined || commitment_script === null || typeof commitment_script !== 'string') throw new Error('Invalid data type for commitment script');

        // Die Daten werden zwischengespeichert
        this.commitment_script = commitment_script;
        this.pkey = pkey;
    };

    // Gibt einen Datensaz des Commitments aus welcher verwendet wird um einen Signaturhash aus dem Commitment zu erstellen
    toFullyString() {
        return `${this.pkey}${this.commitment_script}`.toLowerCase();
    };
};

// Wird verwendet um die Daten der Transaktion an zu übergeben
class TxScriptCheckData {
    constructor(locking_script, unlocking_script, input_tx_block_hight, input_tx_block_timestamp, input_seq, signatures) {
        // Es wird geprüft ob es sich um gültige Parameter handelt
        if(unlocking_script === undefined || unlocking_script === null || typeof unlocking_script !== 'string') throw new Error('Invalid unlocking script');
        if(locking_script === undefined || locking_script == null || typeof locking_script !== 'string') throw new Error('Invalid locking script');
        if(input_tx_block_hight === undefined || input_tx_block_hight == null || typeof input_tx_block_hight !== 'bigint') throw new Error('Invalid block tx hight');
        if(input_tx_block_timestamp === undefined || input_tx_block_timestamp == null || typeof input_tx_block_timestamp !== 'object' || input_tx_block_timestamp.constructor.name !== 'DateTimestamp') throw new Error('Invalid block timestamp');
        if(signatures === undefined || signatures == null || typeof signatures !== 'object' || Array.isArray(signatures) !== true) throw new Error('Invalid signatures data type');

        // Die Daten werden zwischen gespeichert
        this.input_seq = input_seq;                                             // Gibt die Sequenz des Verwendeten Inputs an
        this.signatures = signatures;                                           // Speichert alle Verwendeten Signaturen ab
        this.locking_script = locking_script;                                   // Gibt das Locking Script an
        this.unlocking_script = unlocking_script;                               // Gibt das Unlocking Script an
        this.input_tx_block_hight = input_tx_block_hight;                       // Gibt die Blocköhe an, in welcher das Verwenete Input geschrieben wurde
        this.input_tx_block_timestamp = input_tx_block_timestamp                // Gibt die Blockzeit an, in welcher dass Verwendete Input gechrieben wurde
    };

    // Gibt die Gesamtzahl der Verwendeten Signaturen an
    getTotalSigantures() {
        return BigInt(this.signatures.length);
    };

    // Gibt den Unlockingscript String aus
    getUnlockScriptHexStr() {
        return this.unlocking_script.toLowerCase();
    };

    // Gibt den Lockingscript Sring aus
    getLockingScriptHexStr() {
        return this.locking_script.toLowerCase();
    };
};

// Wird verwendet um die Daten des Ausgeführten Skriptes zu Notieren
class ScriptInstanceData {
    constructor() {
        this.exit = false;
        this.aborted = false;
        this.unlocked = false;
        this.abort_by_error = false;
    };

    signalUnlock() {
        if(this.unlocked === true) return false;
        this.unlocked = true;
        return true;
    };

    signalExtensionBlockTransfer() {
        if(this.allow_spend_by_extension_block === true) return false;
        this.allow_spend_by_extension_block = true;
        return true;
    };

    signalAbortScriptByError() {
        if(this.abort_by_error === true) return false;
        this.abort_by_error = true;
        return true;
    };

    signalAbort() {
        if(this.aborted == true) return false;
        this.aborted = true;
        return true;
    };

    signalExit() {
        if(this.exit === true) return false;
        this.exit = true;
        return true;
    };

    isClosedOrAborted() {
        return this.aborted === true || this.exit === true || this.abort_by_error === true;
    };
};

// Wird verwendet um Erlaubte Öffentliche Schlüssel zwischen zu speichern
class AllowedScriptSignerPublicKeys {
    constructor() {
        this.pkeys = {};
        this.needs_sigs = 0;
        this.market_as_used = [];
    };

    // Fügt einen Öffentlichen Schlüssel auf der Liste hinzu
    addPkey(pkey_obj) {
        // Es wird geprüft ob es sich um ein zulässiges Objekt handelt
        if(pkey_obj === undefined || pkey_obj === null || typeof pkey_obj !== 'object') return false;
        if(pkey_obj.constructor.name !== 'AlternativeBlockchainAddressValue' && pkey_obj.constructor.name !== 'PublicKeyValue') return false;

        // Es wird geprüft ob der PublicKey bereits freigegeben wurde
        if(Object.keys(this.pkeys).includes(pkey_obj.value.toLowerCase()) !== false) return false;

        // Der Öffentliche Schlüssel wird hinzugefügt
        this.pkeys[pkey_obj.value.toLowerCase()] = pkey_obj;

        // Die Mindestanzahl der Signaturen wird Aktualisiert
        this.setNeededSignatures(this.totalPublicKeys());

        // Der Vorgang wurde erfolgreich druchgeführt
        return true;
    };

    // Gibt die Gesamtzahl der Berechtigten Public Keys an
    totalPublicKeys() {
        return Object.keys(this.pkeys).length;
    };

    // Makiert eine Adresse als verwendet
    markAddressAsUsed(address) {
        // Es wird geprüft ob es sich um eine gültige Adeesse handelt
        if(address === undefined || address === null || typeof address !== 'string') return false;

        // Es wird geprüft ob es sich um eine Adresse handelt
        if(this.isKnownPublicKey(address) === true) {
            if(Object.keys(this.market_as_used).includes(address.toLowerCase()) === false) {
                this.market_as_used.push(address.toLowerCase());
                return true;
            }
        }

        // Es handelt es sich um eine unebaknnte Adresse
        return false;
    };

    // Gibt an, ob es sich um einen Publickey handelt welcher bekannt ist
    isKnownPublicKey(pkey) {
        // Es wird geprüft ob der Parameter korrekt ist
        if(pkey === undefined || pkey === null) return false;
        if(typeof pkey !== 'string') return false;

        // Es wird geprüft ob es sich um einen bekannten Öffentlichen Schlüssel handelt
        return this.pkeys[pkey.toLowerCase()] !== undefined;
    };

    // Gibt alle Publickeys aus, welcher verwendet wurden
    getUsedSignaturesPublicKeys() {
        let reval_items = [];
        for(let otems of this.market_as_used) {
            reval_items.push(this.pkeys[otems]);
        }
        return reval_items;
    };

    // Gibt die Anazahl aller Verwendeten Public Keys aus, welche verwendeten wurden um Signaturen zu überprüfen
    totalMarketPublicKeys() {
        return this.market_as_used.length;
    };

    // Legt fest weiviele Signaturen benötigt werden
    setNeededSignatures(am) {
        // Es wird geprüft ob der Parameter korrekt ist
        if(am === undefined || am === null) return false;
        if(typeof am !== 'number') return false;

        // Legt die Anzahl benötiger Signaturen fest
        this.needs_sigs = am;

        // Der Vorgang wurde erfolgreich durchgeführt
        return true;
    };
};

// Wird verwendet um die Ergebnisse der Skript Ausführung zusammenzufassen
class SigScriptExecutionResults {
    constructor(unlocking_script, locking_script, unlocking_script_hash, locking_script_hash, is_validate_y_stack, used_pkey_signatures, has_commitment, commitment_is_checked) {
        // Es wird geprüft ob es sich um gültige Datentypen handelt
        if(unlocking_script === undefined || unlocking_script === null || typeof unlocking_script !== 'object' || unlocking_script.constructor.name !== 'ScriptInstanceData') throw new Error('Invalid unlocking script data type');
        if(locking_script === undefined || locking_script === null || typeof locking_script !== 'object' || locking_script.constructor.name !== 'ScriptInstanceData') throw new Error('Invalid locking script data type');
        if(unlocking_script_hash === undefined || unlocking_script_hash === null || typeof unlocking_script_hash !== 'string') throw new Error('Invalid unlocking script hash data type');
        if(locking_script_hash === undefined || locking_script_hash === null || typeof locking_script_hash !== 'string') throw new Error('Invalid locking script hash data type');
        if(is_validate_y_stack === undefined || is_validate_y_stack === null || typeof is_validate_y_stack !== 'boolean') throw new Error('Invalid validate y stack state data type');
        if(used_pkey_signatures === undefined || used_pkey_signatures === null || typeof used_pkey_signatures !== 'object' || Array.isArray(used_pkey_signatures) !== true) throw new Error('Invalid pkey signatures data type');
        if(has_commitment === undefined || has_commitment === null || typeof has_commitment !== 'boolean') throw new Error('Invalid has commitment data type');
        if(commitment_is_checked === undefined || commitment_is_checked === null || typeof commitment_is_checked !== 'boolean') throw new Error('Invalid commitment is checked data type');

        // Die Daten werden zwischengespeichert
        this.script_results = { unlocking:unlocking_script, locking:locking_script };
        this.used_pkey_signatures = used_pkey_signatures;
        this.unlocking_script_hash = unlocking_script_hash;
        this.locking_script_hash = locking_script_hash;
        this.commitment_is_checked = commitment_is_checked;
        this.is_validate_y_stack = is_validate_y_stack;
        this.has_commitment = has_commitment;
    };

    // Gibt an ob das Unlocking + das Locking Skript erfolgreich und ohne fehler unlockt wurden
    isFinallyTrue(total_needed_signatures=1) {
        // Es wird geprüft ob die Benötigte Anzahl von Signaturen vorhanden ist
        if(this.used_pkey_signatures.length >= total_needed_signatures) {
            // Es wird geprüft ob eines der Skripte aufgrund eines Fehlers abgebrochen wurde
            if(this.script_results.unlocking.abort_by_error === true) return false;
            if(this.script_results.locking.abort_by_error === true) return false;
            if(this.script_results.unlocking.aborted === true) return false;
            if(this.script_results.locking.aborted === true) return false;

            // Es wird geprüft ob die Skripte Entsperrt wurden
            if(this.script_results.unlocking.unlocked !== true) return false;
            if(this.script_results.locking.unlocked !== true) return false;

            // Es wird geprüft ob es das Y Stack Korrekt Validiert wurde
            if(this.is_validate_y_stack !== true) return false;

            // Es wird geprüft ob das Commitment geprüft wurde
            if(this.has_commitment === true && this.commitment_is_checked !== true) return false;

            // Es handelt sich um ein gültiges Skript
            return true;
        }
        else {
            // Es handelt sich um einen ungültigen Schlüssel
            return false;
        }
    };

    // Gibt ein JSON Objekt aus, welches zusammnfest ob die Ausführung der Skripte erfolgreich war
    finallyObject() {
        return {
            commitment:{ has:this.has_commitment, validate:this.commitment_is_checked },
            hashes:{ unlocking_script_hash:this.unlocking_script_hash, locking_script:this.locking_script_hash },
            is_finally_true:this.isFinallyTrue(),
        };
    };
};

// Wird verwendet um zu Signalisieren dass das Aktuelle Skript entwender gültig oder ungültig ist
class SecureVMValue {
    constructor(name, value) {
        // Es wird geprüft ob es sich um gültige Parameter handelt
        if(name === undefined || name === null || typeof name !== 'string') throw new Error('Invalid name value data type');
        if(value === undefined || value === null || typeof value !== 'string') throw new Error('Invalid value data type');

        // Speichert die Parameter ab
        this.name = name;
        this.value = value;
    };

    equal(another_obj) {
        // Es wird geprüft ob es sich um ein zulässiges Objekt handelt
        if(another_obj === undefined || another_obj === null) return false;
        if(typeof another_obj !== 'object') return false;
        if(another_obj.constructor.name !== 'SecureVMValue') return false;

        // Es wird geprüft ob die Werte übereinstimmen
        if(this.name.toLowerCase() !== another_obj.name.toLowerCase()) return false;
        if(this.value.toLowerCase() !== another_obj.value.toLowerCase()) return false;

        // Es handelt sich um die selben werte
        return true;
    };
};

// Wird verwendet um die Aktuellen Chainstate Daten sowie die Aktuelle Uhrzeit zu übergeben
class ChainScriptCheckData {
    constructor(current_block_hight, current_block_time, last_block_hash, current_block_diff) {
        // Die Werte werden zwischengespeichert
        this.current_block_hight = current_block_hight;
        this.current_block_time = current_block_time;
        this.current_block_diff = current_block_diff;
        this.last_block_hash = last_block_hash;
    };
};



// Wird verwendet um 2 Objekte miteinander zu vergleichen
function compare(obj_a, obj_b) {
    if(obj_a.dtypes.includes(obj_b.type) !== true) return false;
    return obj_a.value === obj_b.value;
};

// Speichert alle SecureVMValue Werte ab
const secure_vm_value_operations = {
    true:new SecureVMValue('secure_bool', 'secure_true'),
    false:new SecureVMValue('secure_bool', 'secure_true'),
};

// Exportiert die Klassen
module.exports = {
    BoolValue:BoolValue,
    NullValue:NullValue,
    NumberValue:NumberValue,
    NumberType:NumberType,
    compareValues:compare,
    HexString:HexString,
    HashValue:HashValue,
    SecureVMValue:SecureVMValue,
    DateTimestamp:DateTimestamp,
    PublicKeyValue:PublicKeyValue,
    CommitmentValue:CommitmentValue,
    TxScriptCheckData:TxScriptCheckData,
    securevm:secure_vm_value_operations,
    ScriptInstanceData:ScriptInstanceData,
    ChainScriptCheckData:ChainScriptCheckData,
    SingleSignatureValue:SingleSignatureValue,
    SigScriptExecutionResults:SigScriptExecutionResults,
    AllowedScriptSignerPublicKeys:AllowedScriptSignerPublicKeys,
    AlternativeBlockchainAddressValue:AlternativeBlockchainAddressValue,
}
