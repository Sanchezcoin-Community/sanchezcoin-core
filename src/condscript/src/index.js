const script_token_parser = require('../src/parser');
const interpreter = require('../src/interpreter');
const blockchain_crypto = require('blckcrypto');
const lexer = require('../src/lexer');



// Wird verwendet um ein Script zu Parsen
module.exports.parseScript = async function(script_string) {
    let tokenized_script = await lexer(script_string);
    let parsed_script = await script_token_parser(tokenized_script);
    return parsed_script.hex_script.toLowerCase();
};

// Wird verwendet um ein Script Auszuführen
module.exports.runScript = async function(tx_check_data, chain_check_data, commitment_check_data, debug_mode=false) {
    let result = await interpreter(tx_check_data, chain_check_data, debug_mode);
    return result;
};

// Wird verwendet um eine Finale Adresse zu erstellen
module.exports.getHashOfScript = async function(script_string) {
    // Das Skript wird in Hex umgewandelt
    let parsed_script = await module.exports.parseScript(script_string);

    // Es wird ein Hash aus dem String erstellt
    let script_hash = blockchain_crypto.sha3(256, converted_hash);

    // Der Finale Hash wird ausgegeben
    return script_hash.toLowerCase();
};

// Wird verwendet um aus einem Hash eine Pay2 To Hash Adresse zu erstellen
module.exports.getPayToScriptHashOutput = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um ein Pay 2 Bitcoin Address Output zu erstellen
module.exports.getPayToBitcoinAddress = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um ein Pay 2 Ethereum Address Output zu erstellen
module.exports.getPayToEthereumAddress = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um ein Pay 2 Secp256k1 PublicKey Output zu erstellen
module.exports.getPayToPKeySecp256k1 = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um ein Pay 2 Curve25519 PublicKey Output zu erstellen
module.exports.getPayToPKeyCurve25519 = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um ein Pay 2 BLS12-381 PublicKey Output zu erstellen
module.exports.getPayToPKeyBLS12381 = async function(reciver_address) {
    // Das Skript 
    let pre_hard_str = `
    equal_unlocking_script_hash(${reciver_address});
    unlock_when_sig_verify();
    exit();`;

    // Das Skript wird geparst
    let parsed_script = await module.exports.parseScript(pre_hard_str);

    // Der Fertige String wird zurückgegeben
    return parsed_script.toLowerCase();
};

// Wird verwendet um den Typen eines Ausgangs anzugeben
module.exports.getOutputAddressType = async function(output_hex_string) {

};