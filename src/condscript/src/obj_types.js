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
    }
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
    }
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
    }
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
    }
};

// Wird verwendet wenn es sich um einen Leeren Wert handelt
class NullValue extends ValueObject {
    constructor() {
        super(null, "null", ['null']);
    }
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
    }

    markAsUsed() {
        this.was_used_sig_check = true;
    }
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
    }

    markAsUsed() {
        this.was_used_sig_check = true;
    }
};

// Wird verwendet um zu Signalisieren dass es sich um eine Signle Signatur handelt
class SingleSignatureValue {
    constructor(pubkey, algo, sig, msg_hash) {
        this.msg_hash = msg_hash;
        this.value = pubkey;
        this.type = algo;
        this.sig = sig;
    }

    async fullSignatureCheck() {
        return true;
    }

    quickCheck() {
        return true;
    }
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

// Wird verwendet um die Metadaten des Verwendeten Outputs anzugeben
class TxOutputMetaData {
    constructor(wr_block_hight, block_time, locking_script, n_lock_time, n_lock_block) {
        this.locking_script = locking_script;
        this.wr_block_hight = wr_block_hight;
        this.block_time = block_time;
    }

    getScript() {
        return this.locking_script;
    }
};

// Wird verwender um Extrem Erweiterte Bedingunden an die Transaktion anzuhängen
class CommitmentValue {
    constructor(pkey, commitment_script) {
        this.commitment_script = commitment_script;
        this.pkey = pkey;
    }

    // Gibt einen Datensaz des Commitments aus welcher verwendet wird um einen Signaturhash aus dem Commitment zu erstellen
    toFullyString() {
        return `${this.pkey}${this.commitment_script}`.toLowerCase();
    }
};

// Wird verwendet um die Daten der Transaktion an zu übergeben
class TxScriptCheckData {
    constructor(locking_script, unlocking_script, input_tx_block_hight, input_tx_block_timestamp, input_seq, signatures) {
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
    }
};

// Wird verwendet um die Daten des Ausgeführten Skriptes zu Notieren
class ScriptInstanceData {
    constructor() {
        this.exit = false;
        this.aborted = false;
        this.unlocked = false;
        this.abort_by_error = false;
        this.has_commitment = false;
        this.commitment_validate = false;
        this.allow_spend_by_extension_block = false;
    }

    signalUnlock() {
        this.unlocked = true;
        return true;
    }

    singalCommitmentValidate() {
        this.commitment_validate = true;
        return true;
    }

    signalExtensionBlockTransfer() {
        this.allow_spend_by_extension_block = true;
        return true;
    }

    signalAbortScriptByError() {
        this.abort_by_error = true;
    }

    signalAbort() {
        this.aborted = true;
    }

    signalExit() {
        this.exit = true;
    }

    isClosedOrAborted() {
        return this.aborted === true || this.exit === true || this.abort_by_error === true;
    }
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
        this.pkeys[pkey_obj.value.toLowerCase()] = pkey_obj;
        this.setNeededSignatures(this.totalPublicKeys());
        return true;
    };

    // Gibt die Gesamtzahl der Berechtigten Public Keys an
    totalPublicKeys() {
        return Object.keys(this.pkeys).length;
    };

    // Makiert eine Adresse als verwendet
    markAddressAsUsed(address) {
        if(this.isKnownPublicKey(address) === true) {
            if(Object.keys(this.market_as_used).includes(address.toLowerCase()) === false) {
                this.market_as_used.push(address.toLowerCase());
            }
        }
    };

    // Gibt an, ob es sich um einen Publickey handelt welcher bekannt ist
    isKnownPublicKey(pkey) {
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
        this.needs_sigs = am;
    };
};

// Wird verwendet um die Ergebnisse der Skript Ausführung zusammenzufassen
class SigScriptExecutionResults {
    constructor(unlocking_script, locking_script, unlocking_script_hash, locking_script_hash, is_validate_y_stack, used_pkey_signatures) {
        this.script_results = { unlocking:unlocking_script, locking:locking_script };
        this.unlocking_script_hash = unlocking_script_hash;
        this.used_pkey_signatures = used_pkey_signatures;
        this.locking_script_hash = locking_script_hash;
        this.is_validate_y_stack = is_validate_y_stack;
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

            // Es wird geprüft ob die Commitment Regeln für das Locking Skript korrekt sind
            if(this.script_results.locking.has_commitment === true && this.script_results.locking.commitment_validate !== true) return false;

            // Es wird geprüft ob die Commitment Regeln für das Unlocking Skript korrekt sind
            if(this.script_results.unlocking.has_commitment !== false) return false;
            if(this.script_results.unlocking.commitment_validate !== false) return false;

            // Es handelt sich um ein gültiges Skript
            return true;
        }
        else {
            // Es handelt sich um einen ungültigen Schlüssel
            return false;
        }
    };
};

// Wird verwendet um zu Signalisieren dass das Aktuelle Skript entwender gültig oder ungültig ist
class SecureVMValue {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    };

    equal(another_obj) {
        if(another_obj === undefined || another_obj === null) return false;
        if(typeof another_obj !== 'object') return false;
        if(another_obj.constructor.name !== 'SecureVMValue') return false;
        if(this.name !== another_obj.name) return false;
        if(this.value !== another_obj.value) return false;
        return true;
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
    TxOutputMetaData:TxOutputMetaData,
    TxScriptCheckData:TxScriptCheckData,
    securevm:secure_vm_value_operations,
    ScriptInstanceData:ScriptInstanceData,
    SingleSignatureValue:SingleSignatureValue,
    SigScriptExecutionResults:SigScriptExecutionResults,
    AllowedScriptSignerPublicKeys:AllowedScriptSignerPublicKeys,
    AlternativeBlockchainAddressValue:AlternativeBlockchainAddressValue,
}
