const { CoinbaseInput, UnspentOutput, NotSpendlabelMessageOutput } = require('./utxos');
const { verfiyPoWBlockStructure, PoWBlock } = require('./block');
const { CoinbaseTransaction } = require('./transaction');
const { ramSwiftyHash } = require('./hash_algo');
const { Blockchain } = require('./chain');
const bigInt = require("big-integer");
const { Coin } = require('./coin');



// Erstellt den Genesis Block
function generateGenesisMainnetBlock(bits, timestamp, nonce, hash_algo, reciver, coin) {
    // Der Betrag für den Aktuellen Block wird abgerufen
    let current_reward = coin.current_reward;

    // Die Genesis Transaktion für den Empfänger wird erstellt
    let new_input = new CoinbaseInput();
    let new_output = new UnspentOutput(reciver, bigInt(current_reward), bigInt("100"), bigInt("0"));
    let message_output = new NotSpendlabelMessageOutput(Buffer.from("November 13, 2022 This coin has no claim to money, I like Rick And Morty and that's why I created it.", 'utf8'))
    let genesis_coinbase_tx = new CoinbaseTransaction(bigInt("0"), [new_input], [new_output, message_output]);

    // Das Finale Blockobjekt wird erstellt
    let final_block = new PoWBlock('0000000000000000000000000000000000000000000000000000000000000000', [genesis_coinbase_tx], bits, hash_algo, timestamp, nonce);

    // Der neue Block wird zurückgegeben
    return final_block;
};

// Erstellt die Rickchain # Hauptnetzwerk
function RickcoinMainnet(callback) {
    // Gibt die Basisparameter der Aktuellen Blockchain an
    let pow_diff_adjust = 0;                                                                                        // Gibt an, aller wieviel Blöcke das Halvening Durchgeführt werden soll
    let block_time_ms = 0;                                                                                          // Gibt die Blockzeit an (3 Minuten) weialnge es im Schnitt dauern soll bist ein neuer Block erstellt wird
    let pow_halvening_period = 0;                                                                                   // Gibt die Anzahl der Blöcke an, wann das Halvening durchgeführt werden soll
    let hash_algo = ramSwiftyHash;                                                                                  // Gibt den zu verwendeten Mining Algorithmus an
    let rickcoin = new Coin(8, "3eecf85c306b5c", 110700, 800);                                                      // Gibt den Coin an, welcher verwendet werden soll
    let start_pow_target = "0000ffff00000000000000000000000000000000000000000000000000000000";                      // Gibt Startschwierigkeit für das Mining an
    let block_size = bigInt("2097152");                                                                             // Gibt die Maxiamle Größe eines Blocks an

    // Gibt die Netzwerkparameter an, welche verwendet werden um Verbindungen mit anderen Node herzustellen
    let transaction_header = "";
    let block_header = "";

    // Gibt die Statischen Parameter, Forks, etc an
    const chainparms = {
        // Speichert allgemeine Parameter ab
        "$":{
            consensus:'pow',
            block_size:block_size,
            pow_hash_algo:hash_algo,
            block_header:block_header,
            block_time_ms:block_time_ms,
            tx_header:transaction_header,
            pow_target:start_pow_target,
            pow_diff_adjust:pow_diff_adjust,
            pow_halvening_period:pow_halvening_period,
        },
        130:{
            consensus:'posm',
        }
    };

    // Der Genesis Block wird gebaut
    let genesis_block = generateGenesisMainnetBlock("1e00ffff", 1668568992542, 716457350, hash_algo, "9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b", rickcoin);

    // Es wird geprüft ob der Aufbau des Blocks korrekt ist
    if(verfiyPoWBlockStructure(genesis_block) !== true) throw new Error('Invalid genesis block');

    // Das Chain Objekt wird start_target
    let chain_object = new Blockchain(genesis_block, rickcoin, chainparms);

    // Das Chain Objekt wird zurückgegeben
    callback(null, chain_object, 'mainnet');
};


// Exportiert die einzelenen Funktionen
module.exports = {
    mainnet:RickcoinMainnet
};