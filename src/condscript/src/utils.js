// Wird verwendet um zu überprüfen ob es sich um einen gültigen Hexstring handelt
module.exports.is_validate_hex_str = function(hex_str) {
    try { let a = Buffer.from(hex_str, 'hex').toString('hex'); return hex_str.toLowerCase() === a.toLowerCase(); }
    catch(e) { return false; }
};