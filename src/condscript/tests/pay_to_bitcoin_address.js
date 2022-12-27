const { SingleSignatureValue, DateTimestamp, TxScriptCheckData, ChainScriptCheckData, HashValue } = require('../src/obj_types');
const { parseScript, runScript } = require('../src/index');



// Wird verwendet um zu überprüfen ob Skripte welche eine Bitcoin Signatur verwenden korrekt sind
async function btc_sig_true_test() {
    // Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
    let btc_sig_locking_script = `
    equal_spefic_signature_pkey(BtcAddress(bc1qfp7fkf095pae5xlmf9u6pzh29mz9sgh6tvudm9));
    unlock_when_sig_verify();
    exit();
    `

    // Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
    let btc_sig_unlocking_script = `
    add_verify_key(BtcAddress(bc1qfp7fkf095pae5xlmf9u6pzh29mz9sgh6tvudm9));
    verify_sig();
    exit();
    `

    // Speichert die Verfügbaren Signaturen ab
    let eth_sig_avail_sigs = [
        new SingleSignatureValue(
            'bc1qfp7fkf095pae5xlmf9u6pzh29mz9sgh6tvudm9', 'btcadr', 'IGW9p7+BTuxLDktMWxpGUPZNkZgZci7g6tdtxTvnuwq+ZF/o7xvWDoro0WEzSJw5qlHhFYon5CFm+FBI724h+e4=', '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502'
        ),
    ];

    // Die Skripte werden in Hexcode umgewandelt
    let p_unlocking_script = await parseScript(btc_sig_unlocking_script);
    let p_locking_script = await parseScript(btc_sig_locking_script);

    // Die Aktuelle Blockhöhe wird abgespeichert
    let block_hight = BigInt(1);

    // Gibt an ob der Debug Modus verwendet werden soll
    let use_debug_mode = false;

    // Die Uhrzeit wann die Transaktion in dem Block abgespeichert wurde wird abgespeichert
    let timestamp = new DateTimestamp('00000000000000000000018521093f4f', true);

    // Speichert den Hash des letzten Blocks ab
    let last_block_hash = new HashValue('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha3_256', true);

    // Die Daten welche für die Überprüfung der Blockchain Benötigt werden, werden zusammengefasst
    let tx_chain_data = new ChainScriptCheckData(block_hight, DateTimestamp.getCurrent(), last_block_hash, '');

    // Die Daten welche für die Prüfung der Verwendeteten Inputs benötigt werden, werden zusammengefasst
    let tx_check_data = new TxScriptCheckData(p_locking_script, p_unlocking_script, BigInt(0), timestamp, '0xffff', eth_sig_avail_sigs);

    // Die Skripte werden Interpretiert
    let test_result = await runScript(tx_check_data, tx_chain_data, null, true);
    if(use_debug_mode === true) console.log()
    console.log(test_result.finallyObject());
    console.log('Check validate btc signature:', test_result.isFinallyTrue());
};


(async() => {
    await btc_sig_true_test();
})();