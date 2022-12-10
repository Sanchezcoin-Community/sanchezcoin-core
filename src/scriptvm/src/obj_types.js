class ValueObject {
    constructor(value, type, acepted_d_types, is_vm_value=false) {
        this.is_vm_value = is_vm_value;
        this.dtypes = acepted_d_types;
        this.value = value;
        this.type = type;
    }
};

// Wird verwendet um Wert die die Blockchain zurückgibt zu verwenden
class ChainStateValue extends ValueObject {
    constructor(value) {
        super(value, "cst", ['cst', 'hxstr', 'num', 'bool', 'hashv']);
    }
}

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
        super(value, "hxstr", ['cst', 'hxstr', 'num', 'hashv'], is_vm_value);
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
        super(value, "num", ['cst', 'hxstr', 'num', 'bool', 'hashv'], is_vm_value);
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
        super(value, "bool", ['cst', 'hxstr', 'num', 'bool', 'hashv'], is_vm_value);
    }
};

// Wird verwendet wenn es sich um einen Hashwert handelt
class HashValue extends HexString {
    constructor(value, algo, is_vm_value=false) {
        // Es wird geprüft ob es sich um einen Zulässigen Algo handelt
        if(algo !== 'sha256d' && algo !== 'sha3_256' && algo !== 'swiftyh_256') throw new Error('INVALID_HASH_ALGO');

        // Der Hash Algo wird abgespeichert
        this.algo = algo;

        // Das Mutter Objekt wird erzeugt
        super(value, is_vm_value);

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
        if(algo !== 'curve25519' && algo !== 'bls12381' && algo !== 'secp256k1') throw new Error('INVALID_HASH_ALGO');

        // Der Hash Algo wird abgespeichert
        this.algo = algo;

        // Das Mutter Objekt wird erzeugt
        super(value, is_vm_value);

        // Der Type wird angepasst
        this.type = 'pkey';
        this.dtypes.push('pkey');
    }
};

// Wird verwendet wenn es sich um eine Altchain Adresse handelt
class AlternativeBlockchainAddressValue extends ValueObject {

};

// Wird verwendet um zu Signalisieren dass das Skript freigegeben wurde
class UnlockedScriptValue extends ValueObject {

};

// Wird verwendet um zu Signalisieren dass es sich um eine Signle Signatur handelt
class SingleSignatureValue extends ValueObject {

};

// Wird verwendet um den Aktuellen Block Cosnensus auszuegeben
class BlockchainConsensusValue extends ValueObject {

};


// Wird verwendet um 2 Objekte miteinander zu vergleichen
function compare(obj_a, obj_b) {
    if(obj_a.dtypes.includes(obj_b.type) !== true) return false;
    return obj_a.value === obj_b.value;
};

// Wird verwendet um zu Überprüfen ob 2 Objekte nicht Identisch sind


// Exportiert die Klassen
module.exports = {
    ChainStateValue:ChainStateValue,
    BoolValue:BoolValue,
    NullValue:NullValue,
    NumberValue:NumberValue,
    compareValues:compare,
    HexString:HexString,
    HashValue:HashValue,
    PublicKeyValue:PublicKeyValue,
    UnlockedScriptValue:UnlockedScriptValue,
    SingleSignatureValue:SingleSignatureValue,
    BlockchainConsensusValue:BlockchainConsensusValue,
    AlternativeBlockchainAddressValue:AlternativeBlockchainAddressValue,

}