const { CoinbaseInput, UnspentOutput } = require('./utxos');
const { CandidatePoWBlock, PoWBlock } = require('./block');
const { CoinbaseTransaction } = require('./transaction');
const { ramSwiftyHash } = require('./hash_algo');
const { Blockchain } = require('./chain');
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

    // Das Finale Blockobjekt wird erstellt
    let final_block = new PoWBlock(new_block.prv_block_hash, [genesis_coinbase_tx], bits, hash_algo, timestamp, nonce);

    // Der neue Block wird zurückgegeben
    return final_block;
};

// Erstellt die Rickchain # Hauptnetzwerk
function RickcoinMainnet(callback) {
    // Gibt die Basisparameter der Aktuellen Blockchain an
    let pow_diff_adjust = 0;                                                                                            // Gibt an, aller wieviel Blöcke das Halvening Durchgeführt werden soll
    let block_time_ms = 0;                                                                                          // Gibt die Blockzeit an (3 Minuten) weialnge es im Schnitt dauern soll bist ein neuer Block erstellt wird
    let pow_halvening_period = 0;                                                                                       // Gibt die Anzahl der Blöcke an, wann das Halvening durchgeführt werden soll
    let hash_algo = ramSwiftyHash;                                                                                     // Gibt den zu verwendeten Mining Algorithmus an
    let rickcoin = new Coin(8, "3eecf85c306b5c", 110700, 800);                                                      // Gibt den Coin an, welcher verwendet werden soll
    let start_pow_target = "00000ffff0000000000000000000000000000000000000000000000000000000";                      // Gibt Startschwierigkeit für das Mining an

    // Gibt die Netzwerkparameter an, welche verwendet werden um Verbindungen mit anderen Node herzustellen
    let transaction_header = "";
    let block_header = "";

    // Gibt die Statischen Parameter, Forks, etc an
    const chainparms = {
        // Speichert allgemeine Parameter ab
        "$":{
            consensus:'pow',
            pow_target:start_pow_target,
            pow_diff_adjust:pow_diff_adjust,
            pow_hash_algo:hash_algo,
            block_header:block_header,
            finally_block_tpye:PoWBlock,
            block_time_ms:block_time_ms,
            tx_header:transaction_header,
            pow_halvening_period:pow_halvening_period,
            candidate_block:CandidatePoWBlock,
        },
    };

    // Der Genesis Block wird gebaut
    let genesis_block = generateGenesisMainnetBlock("1e00ffff", 1668007569924, 703222, hash_algo, "9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b", rickcoin);

    // Das Chain Objekt wird start_target
    let chain_object = new Blockchain(genesis_block, rickcoin, chainparms);

    // Das Chain Objekt wird zurückgegeben
    callback(null, chain_object);
};


// Exportiert die einzelenen Funktionen
module.exports = {
    mainnet:RickcoinMainnet
};