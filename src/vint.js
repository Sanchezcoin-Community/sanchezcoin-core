// Gibt an ob es sich um einen BigInteger handelt
function isBigInt(obj_data) {
    if(typeof obj_data === 'bigint') return true;
    if(typeof obj_data !== 'object') return false;
    if(obj_data.constructor === undefined) return false;
    if(obj_data.constructor.name === undefined) return false;
    return obj_data.constructor.name === 'Integer';
};

// Wandelt ein Integer in ein vint um
function intToVInt(intv) {
    const hexed_amount = intv.toString(16);
    const amount_len_hex = hexed_amount.length.toString(16).toLowerCase().padStart(4, 0);
    return `${amount_len_hex}${hexed_amount}`.toLowerCase();
};


module.exports = {
    intToVInt:intToVInt,
    isBigInt:isBigInt,
}