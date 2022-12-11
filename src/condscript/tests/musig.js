const { SingleSignatureValue } = require('../src/obj_types');
const script_token_parser = require('../src/parser');
const interpreter = require('../src/interpreter');
const lexer = require('../src/lexer');



// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(get_unlocking_script_hash() == 500dffbfa038298f8b4ee0d88b65f22c77dad395cfd08da2cf7084bdda026de6) {
    unlock();
    exit();
}
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key( PublicKey(secp256k1, 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2) );
add_verify_key( PublicKey(bls12381, 86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4) );
add_verify_key( BtcAddress(bc1q76awjp3nmklgnf0yyu0qncsekktf4e3qj248t4) );
set_n_of_m(1);
verify_sig();
exit();
`

// Speichert die Verfügbaren Signaturen ab
let avail_sigs = [
    new SingleSignatureValue('384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2', 'secp256k1', 'ef368769e3bbe9006796aedf1810ff871e34fc70f395d302fbf45cd4c64fe01343b8516f272651084ac81d2296dfb81222054b8acdfa99211dcc9dc25d756416'),
    //new SingleSignatureValue('86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4', 'bls12381', '')
];


// Das Skript wird Gelext
lexer(unlocking_script).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await interpreter(p_lock_script.hex_script, p_unlock_script.hex_script, BigInt(0), avail_sigs, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    console.log(test_result)
});
