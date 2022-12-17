const { SingleSignatureValue, DateTimestamp, TxScriptCheckData } = require('../src/obj_types');
const interpreter = require('../src/interpreter');
const { parseScript } = require('../src/index');



// verify_commitment(931178fd6248c4d8650426537afd262c6407018f2d89f5aec1cf9dff7b281ce0c16ebf88d6f49ba33bdb502f69ef03580cad279b353051a6d8f4d6941da0634afc8a0ca6fe4119b8c042c93016c5237dd06b0b455f46e25b344ebe4e3c86ce19);
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


(async() => {
    // Die Skripte werden in Hexcode umgewandelt
    let p_unlocking_script = await parseScript(unlocking_script);
    let p_locking_script = await parseScript(locking_script);

    // Die Aktuelle Uhrzeit wird abgspeichert
    let timestamp = new DateTimestamp('00000000000000000000018521093f4f', true);

    // Die Aktuelle Blockhöhe wird abgespeichert
    let block_hight = BigInt(0);

    // Die Daten welche für die Prüfung der Verwendeteten Inputs benötigt werden, werden zusammengefasst
    let tx_check_data = new TxScriptCheckData(p_locking_script, p_unlocking_script, BigInt(0), timestamp, '0xffff', avail_sigs);

    // Die Skripte werden Interpretiert
    let test_result = await interpreter(tx_check_data, block_hight, DateTimestamp.getCurrent(), null, false);

    console.log();
    console.log(test_result);
    console.log();
    console.log('Tx is finally true', test_result.isFinallyTrue());
})();