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
    constructor(value, is_vm_value=false) {
        // Es wird geprüft ob der value Parameter vorhanden ist
        if(value === undefined || value === null) throw Error('INVALID_HEX_STRING_VALUE');

        // Es wird geprüft ob es sich um ein BigInt handelt, wenn nicht wird der Vorgang abgebrochen
        if(typeof value !== 'bigint') throw new Error('INVALID_NUMBER_VALUE');

        // Es wird geprüft ob die Zahl größer oder gleich 0 ist
        if(value < BigInt(0)) throw new Error('INVALID_NUMBER_VALUE');

        // Das Mutter Objekt wird erstellt
        super(value, "num", ['cst', 'hxstr', 'num', 'bool'], is_vm_value);
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

// Wird verwender um Extrem Erweiterte Bedingunden an die Transaktion anzuhängen
class CommitmentValue {

};


// Wird verwendet um 2 Objekte miteinander zu vergleichen
function compare(obj_a, obj_b) {
    if(obj_a.dtypes.includes(obj_b.type) !== true) return false;
    return obj_a.value === obj_b.value;
};


// Exportiert die Klassen
module.exports = {
    BoolValue:BoolValue,
    NullValue:NullValue,
    NumberValue:NumberValue,
    compareValues:compare,
    HexString:HexString,
    HashValue:HashValue,
    PublicKeyValue:PublicKeyValue,
    SingleSignatureValue:SingleSignatureValue,
    AlternativeBlockchainAddressValue:AlternativeBlockchainAddressValue,

}