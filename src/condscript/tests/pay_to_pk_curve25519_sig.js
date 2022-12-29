const { SingleSignatureValue, DateTimestamp, TxScriptCheckData, ChainScriptCheckData, HashValue } = require('../src/obj_types');
const { parseScript, runScript, getPayToPKeyCurve25519 } = require('../src/index');
const blockchain_crypto = require('blckcrypto');



// Wird verwendet um zu überprüfen ob Skripte welche eine Ethereum Signatur verwenden korrekt sind
async function eth_sig_true_test() {
    // Es wird ein Mnemonic erzeugt
    let mnic = blockchain_crypto.bip32.generateBip39Mnemonic();
    let seed = blockchain_crypto.bip32.getSeedFromBip39Mnemonic(mnic);
    let keypair = blockchain_crypto.ecc.curve25519.getKeyPairFromSeed(seed, '0/0/2');
    let sigk = '654924d66101913f317fe6f965de8ea67b13e6be6b0c804e8098e86ccafbd502';
    let fsig = await blockchain_crypto.ecc.curve25519.signDigest(keypair.private_key, sigk);

    // Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
    let unlocking_plain_script = `
    add_verify_key(PublicKey(curve25519, ${keypair.public_key}));
    verify_sig();
    exit();
    `

    // Das Unlocking Skript wird geparsr
    let p_unlocking_script = await parseScript(unlocking_plain_script);

    // Speichert die Verfügbaren Signaturen ab
    let eth_sig_avail_sigs = [
        new SingleSignatureValue(
            keypair.public_key, 'curve25519', fsig, sigk
        ),
    ];

    // Die Skripte werden in Hexcode umgewandelt
    let p_locking_script = await getPayToPKeyCurve25519(keypair.public_key);

    // Die Aktuelle Blockhöhe wird abgespeichert
    let block_hight = BigInt(1);

    // Die Uhrzeit wann die Transaktion in dem Block abgespeichert wurde wird abgespeichert
    let timestamp = new DateTimestamp('18521093f4f', true);

    // Speichert den Hash des letzten Blocks ab
    let last_block_hash = new HashValue('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha3_256', true);

    // Die Daten welche für die Überprüfung der Blockchain Benötigt werden, werden zusammengefasst
    let tx_chain_data = new ChainScriptCheckData(block_hight, DateTimestamp.getCurrent(), last_block_hash, '');

    // Die Daten welche für die Prüfung der Verwendeteten Inputs benötigt werden, werden zusammengefasst
    let tx_check_data = new TxScriptCheckData(p_locking_script, p_unlocking_script, BigInt(0), timestamp, '0xffff', eth_sig_avail_sigs);

    // Die Skripte werden Interpretiert
    let test_result = await runScript(tx_check_data, tx_chain_data, null, true);
    console.log(); console.log(test_result.finallyObject());
};


(async() => {
    await eth_sig_true_test();
})();