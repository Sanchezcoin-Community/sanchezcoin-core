// Gibt alle Parameter an, welche für eine Transaktion relevant sind an
module.exports.tx_parms = {
    max_signatures:32,
    max_inputs:(2**(8*4))-1,
    max_outputs:(2**(8*4))-1,
    max_unlocking_scripts:1000,
    locking_script_max_size:12288,
    unlocking_script_max_size:12288,
};

// Speichert die Verfügbaren Parameter als Hexwert ab
module.exports.phantom_crypto_alorithmn = {
    secp2561:(255).toString(16).padStart(2, 0)
};