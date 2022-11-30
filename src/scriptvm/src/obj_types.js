class ValueObject {
    constructor(value, type, acepted_d_types) {
        this.dtypes = acepted_d_types;
        this.value = value;
        this.type = type;
    }
}

class ChainStateValue extends ValueObject {
    constructor(value) {
        super(value, "cst", ['cst', 'hxstr']);
    }
}

class HexString extends ValueObject {
    constructor(value) {
        super(value, "hxstr", ['cst', 'hxstr']);
    }
}



function compare(obj_a, obj_b) {
    // Es wird geprüft ob die Datentypen zulässig sind
    if(obj_a.dtypes.includes(obj_b.type) !== true) return false;
    return obj_a.value === obj_b.value;
}

// Exportiert die Klassen
module.exports = {
    ChainStateValue:ChainStateValue,
    compareValues:compare,
    HexString:HexString,
}