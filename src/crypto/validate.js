// Es wird geprüft ob es sich um einen gültigen String handelt
const is_validate_string = function(str_value) {
    if(str_value === undefined) return false;
    if(str_value === null) return false;
    if(typeof str_value !== 'string') return false;
    return true;
};

// Es wird geprüft ob es sich um einen gültigen Hex String handelt
const is_validate_hex_string = function(hex_str_value, len=null) {
    // Es wird geprüft ob es sich um einen String handelt
    if(is_validate_string(hex_str_value) !== true) return false;

    // Es wird geprüft ob es sich um einen Hex String handelt
    try{ 
        let buffed_value = Buffer.from(hex_str_value, 'hex');
        let hexed_value = buffed_value.toString('hex').toLowerCase();
        if(hexed_value !== hex_str_value.toLowerCase()) return false;
    }
    catch(e) { return false; }

    // Sofern notwendig, wird geprüft ob die Länge gültig ist
    if(len !== undefined && len !== null) {
        if(typeof len !== 'number') throw new Error('Invalid len data type');
        if(hex_str_value.length !== len) return false;
    }

    // Es handelt sich um einen gültigen String
    return true;
};

// Die Module werden Exportiert
module.exports.is_validate_string = is_validate_string;
module.exports.is_validate_hex_string = is_validate_hex_string;