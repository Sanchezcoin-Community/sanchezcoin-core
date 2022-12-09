const script_token_parser = require('./parser');
const interpreter = require('./interpreter');
const lexer = require('./lexer');



// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(is_a_signer(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a)) == true) {
    verify_sig();
    exit();
}
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a));
verify_sig();
exit();
`

// Speichert die Verfügbaren Signaturen ab
let avail_sigs = [
    {
        type: 'ethadr',
        pkey: '0xac27b3da732a8753192ba3f9f90195c5922e7d0a'
    },
];

// Das Skript wird Gelext
lexer(unlocking_script).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await interpreter(p_lock_script.hex_script, p_unlock_script.hex_script, BigInt(0), avail_sigs, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    console.log(test_result)
});
