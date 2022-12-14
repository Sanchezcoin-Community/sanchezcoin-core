const { SingleSignatureValue } = require('../src/obj_types');
const script_token_parser = require('../src/parser');
const interpreter = require('../src/interpreter');
const lexer = require('../src/lexer');



// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(get_unlocking_script_hash() == 654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502) {
    unlock();
    exit();
}
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key( EthAddress(0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB) );
verify_sig();
exit();
`

// Speichert die Verfügbaren Signaturen ab
let avail_sigs = [
    new SingleSignatureValue('0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB', 'ethadr', '1fe929f3bf9402eb2701601b725890f64ff00882b33a44437c4d0de6cda9cce40509f7dd48a1f7f64da57a2412672855e424d5cace8f3986ab7093e562c0e9ea1b', '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502'),
];


// Das Skript wird Gelext
lexer(unlocking_script).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await interpreter(p_lock_script.hex_script, p_unlock_script.hex_script, BigInt(0), avail_sigs, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

    console.log();
    console.log(test_result);
    console.log();
});
