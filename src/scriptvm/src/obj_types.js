class ValueObject {
    constructor(value, type, acepted_d_types) {
        this.dtypes = acepted_d_types;
        this.value = value;
        this.type = type;
    }
}

class ChainStateValue extends ValueObject {
    constructor(value) {
        super(value, "cst", ['cst', 'hxstr', 'num', 'bool', 'hashv']);
    }
}

class HexString extends ValueObject {
    constructor(value) {
        super(value, "hxstr", ['cst', 'hxstr', 'num', 'hashv']);
    }
}

class NumberValue extends ValueObject {
    constructor(value) {
        super(value, "num", ['cst', 'hxstr', 'num', 'bool', 'hashv']);
    }
}

class BoolValue extends ValueObject {
    constructor(value) {
        super(value, "bool", ['cst', 'hxstr', 'num', 'bool', 'hashv']);
    }
}

class HashValue extends ValueObject {
    constructor(value, algo) {
        super(value, "hashv", ['cst', 'hxstr', 'num', 'bool', 'hashv']);
        this.algo = algo;
    }
}

function compare(obj_a, obj_b) {
    if(obj_a.dtypes.includes(obj_b.type) !== true) return false;
    return obj_a.value === obj_b.value;
}


// Exportiert die Klassen
module.exports = {
    ChainStateValue:ChainStateValue,
    BoolValue:BoolValue,
    NumberValue:NumberValue,
    compareValues:compare,
    HexString:HexString,
    HashValue:HashValue
}