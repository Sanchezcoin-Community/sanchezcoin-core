const { SingleSignatureValue, TxOutputMetaData, DateTimestamp, CommitmentValue } = require('../src/obj_types');
const script_token_parser = require('../src/parser');
const interpreter = require('../src/interpreter');
const lexer = require('../src/lexer');


// verify_commitment(931178fd6248c4d8650426537afd262c6407018f2d89f5aec1cf9dff7b281ce0c16ebf88d6f49ba33bdb502f69ef03580cad279b353051a6d8f4d6941da0634afc8a0ca6fe4119b8c042c93016c5237dd06b0b455f46e25b344ebe4e3c86ce19);
// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen 
let locking_script = `
check_blockverify(1);
verify_commitment(ac683879f2c3a5cdc97481bbe1e345667a7984976f4b067c3c2feb1f31eef7f30c791f7365aa29d229cf003fd416e78f10a2bd3b5adbe2e40826c97bad9c0835659340e932636d01ebe1c2c99b5a9315e44d1598a350f8c33a03732b7ccbeb82);
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
    let commitment = new CommitmentValue('86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4', '011a775441ecb14943130a16f00cdd41818a83dd04372f3259e3ca7237e3cdaa');

    // Die Skripte werden Interpretiert
    let test_result = await interpreter(
        p_lock_script.hex_script,
        new TxOutputMetaData(BigInt(1), DateTimestamp.getCurrent(), p_unlock_script.hex_script),
        BigInt(2),
        avail_sigs,
        DateTimestamp.getCurrent(),
        commitment
    );

    console.log();
    console.log(test_result);
    console.log();
});
