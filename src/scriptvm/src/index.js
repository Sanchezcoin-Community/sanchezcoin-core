const script_token_parser = require('./parser');
const interpreter = require('./interpreter');
const lexer = require('./lexer');



// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(#unlocking_script_hash == 2292c301c0e755aea47d74594098d8600946721c1311dcb54470637ffccbd6db) {
    unlock();
    exit();
}
else {
    exit();
}
`

let locking_script_a = `
if(sha256d(bbdd0eea7ea53876dbe37abadf790956d29d2e17b92b3c81625a0d00424553a9) == 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a9) {
    unlock();
}
push_to_y(
    sha256d(bbdd0eea7ea53876dbe37abadf790956d29d2e17b92b3c81625a0d00424553a9)
);
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key( PublicKey(curve25519, 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57) );
add_verify_key( PublicKey(curve25519, 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a9) );
set_n_of_m(1);
verify_sig();
`

// MultiSig Skript
let unlocking_script2 = `
add_verify_key(PublicKey(curve25519, 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57));
add_verify_key(PublicKey(curve25519, 50679e3ed1de04949eeccb928ba8b9495aa0613fe17ef127463f98f28def3db3));
set_n_of_m(1);
verify_sig();
unlock();
`

unlocking_script2 = `
push_to_y(
    sha256d(
        bbdd0eea7ea53876dbe37abadf790956d29d2e17b92b3c81625a0d00424553a9
    )
);
`

// Das Skript wird Gelext
lexer(unlocking_script2).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script_a);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await interpreter(p_lock_script, p_unlock_script);
    console.log(test_result)
});