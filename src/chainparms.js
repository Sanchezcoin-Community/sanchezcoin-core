const { CoinbaseInput, UnspentOutput } = require('./utxos')
const { CoinbaseTransaction } = require('./transaction');
const { ProofOfWorkBlockchain } = require('./chain');
const { CandidatePoWBlock } = require('./block');
const { sha256dBTC } = require('./hash_algo');
const { Coin } = require('./coin');



// Erstellt den Genesis Block
function generateGenesisMainnetBlock(bits, timestamp, nonce, hash_algo, reciver, coin) {
    // Der Betrag für den Aktuellen Block wird abgerufen
    let current_reward = coin.current_reward;

    // Die Genesis Transaktion für den Empfänger wird erstellt
    let new_input = new CoinbaseInput();
    let new_output = new UnspentOutput(reciver, current_reward);
    let genesis_coinbase_tx = new CoinbaseTransaction(0, [new_input], [new_output]);

    // Der Block wird gebaut
    let new_block = new CandidatePoWBlock('0000000000000000000000000000000000000000000000000000000000000000', [genesis_coinbase_tx.computeHash()], bits, hash_algo, timestamp, nonce);

    // Der neue Block wird zurückgegeben
    return new_block;
};

// Erstellt die Rickchain # Hauptnetzwerk
function RickcoinMainnet(callback) {
    // Die Chainparms für den Rickcoin wird erzeugt
    let rickcoin = new Coin(8, "3eecf85c306b5c", 110700, 800);

    // Speichert den Verwendeten Hash Algo ab (Bitcoin - SHA256)
    let hash_algo = sha256dBTC;

    // Speichert die Start Schwiergkeit ab
    let target = "00000ffff0000000000000000000000000000000000000000000000000000000";

    // Der Genesis Block wird gebaut
    let genesis_block = generateGenesisMainnetBlock("1b04864c", 1666748793, 1431881882, hash_algo, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", rickcoin);

    // Gibt die Statischen Einstellungen, Forks, etc an
    const chain_config_inner = {

    };

    // Das Chain Objekt wird erstellt
    let chain_object = new ProofOfWorkBlockchain(genesis_block, target, hash_algo, rickcoin, chain_config_inner, "");

    // Es wird versucht die Lokale Blockchain zu laden
    (async() => chain_object.loadBlockchainDatabase((error, result) => {

    }))();
}


RickcoinMainnet();