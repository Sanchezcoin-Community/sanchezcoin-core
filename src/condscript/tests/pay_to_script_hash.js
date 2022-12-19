const { SingleSignatureValue, DateTimestamp, TxScriptCheckData, ChainScriptCheckData, HashValue } = require('../src/obj_types');
const { parseScript, runScript } = require('../src/index');



// Wird verwendet um zu überprüfen ob Skripte welche eine Ethereum Signatur verwenden korrekt sind
async function eth_sig_true_test() {
    // Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
    let eth_sig_locking_script = `
    equal_unlocking_script_hash(654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502);
    unlock();
    exit();
    `

    // Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
    let eth_sig_unlocking_script = `
    add_verify_key(EthAddress(0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB));
    verify_sig();
    exit();
    `

    // Speichert die Verfügbaren Signaturen ab
    let eth_sig_avail_sigs = [
        new SingleSignatureValue(
            '0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB', 'ethadr', '1fe929f3bf9402eb2701601b725890f64ff00882b33a44437c4d0de6cda9cce40509f7dd48a1f7f64da57a2412672855e424d5cace8f3986ab7093e562c0e9ea1b', '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502'
        ),
    ];

    // Die Skripte werden in Hexcode umgewandelt
    let p_unlocking_script = await parseScript(eth_sig_unlocking_script);
    let p_locking_script = await parseScript(eth_sig_locking_script);

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
    let test_result = await runScript(tx_check_data, tx_chain_data, null, false);
    if(use_debug_mode === true) console.log()
    console.log('Check validate web3 signature:', test_result.isFinallyTrue());
};

// Wird verwendet um zu überprüfen ob Skripte welche eine Ethereum Signatur verwenden fehlerhaft sind
async function eth_sig_false_test() {
    // Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
    let eth_sig_locking_script = `
    equal_unlocking_script_hash(654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502);
    unlock();
    exit();
    `

    // Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
    let eth_sig_unlocking_script = `
    add_verify_key(EthAddress(0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB));
    verify_sig();
    exit();
    `

    // Speichert die Verfügbaren Signaturen ab
    let eth_sig_avail_sigs = [
        new SingleSignatureValue(
            '0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB', 'ethadr', '1fe929f3bf9402eb2701601b725890f64ff00882b33a44437c4d0de6cda9cce40509f7dd48a1f7f64da57a2412672855e424d5cace8f3986ab7093e562c0e9ea1b', '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd503'
        ),
    ];

    // Die Skripte werden in Hexcode umgewandelt
    let p_unlocking_script = await parseScript(eth_sig_unlocking_script);
    let p_locking_script = await parseScript(eth_sig_locking_script);

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
    let test_result = await runScript(tx_check_data, tx_chain_data, null, false);
    if(use_debug_mode === true) console.log()
    console.log('Check invalid web3 signature:', test_result.isFinallyTrue() === false);
};

// Wird verwendet um zu überprüfen ob Skripte welche eine Bitcoin Signatur verwenden korrekt sind
async function btc_sig_true_test() {
    // Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
    let btc_sig_locking_script = `
    equal_unlocking_script_hash(504cee03c91fc1158fa843e29147035d5fc4d0eeee9fa3303195703599a8a7f7);
    unlock();
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
    let test_result = await runScript(tx_check_data, tx_chain_data, null, false);
    if(use_debug_mode === true) console.log()
    console.log('Check validate btc signature:', test_result.isFinallyTrue());
};

// Wird verwendet um zu überprüfen ob Skripte welche eine Bitcoin Signatur verwenden korrekt sind
async function btc_sig_false_test() {
    // Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
    let btc_sig_locking_script = `
    equal_unlocking_script_hash(504cee03c91fc1158fa843e29147035d5fc4d0eeee9fa3303195703599a8a7f7);
    unlock();
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
            'bc1qfp7fkf095pae5xlmf9u6pzh29mz9sgh6tvudm9', 'btcadr', 'IGW9p7+BTuxLDktMWxpGUPZNkZgZci7g6tdtxTvnuwq+ZF/o7xvWDoro0WEzSJw5qlHhFYon5CFm+FBI724h+e4=', '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd503'
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
    let test_result = await runScript(tx_check_data, tx_chain_data, null, false);
    if(use_debug_mode === true) console.log()
    console.log('Check invalid btc signature:', test_result.isFinallyTrue() === false);
};



(async() => {
    await eth_sig_true_test();
    await eth_sig_false_test();
    await btc_sig_true_test();
    await btc_sig_false_test();
})();