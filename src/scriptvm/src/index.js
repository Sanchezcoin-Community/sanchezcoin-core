const script_token_parser = require('./parser');
const interpreter = require('./interpreter');
const lexer = require('./lexer');



// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(get_unlocking_script_hash() == 2ab2f00252d1a1cf7f30fa109d41796429ba88ef18bb20515fe7808a59ee109b) {
    unlock();
    exit();
}
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key( PublicKey(secp256k1, 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2) );
add_verify_key( PublicKey(bls12381, 86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4) );
set_n_of_m(1);
verify_sig();
exit();
`

// Speichert die Verfügbaren Signaturen ab
let avail_sigs = [
    {
        type: 'secp256k1',
        pkey: '384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2'
    },
    {
        type: 'bls12381',
        pkey: '86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4'
    }
];


// Das Skript wird Gelext
lexer(unlocking_script).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await interpreter(p_lock_script, p_unlock_script, 0, avail_sigs, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    console.log(test_result)
});
