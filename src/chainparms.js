const { ProofOfWorkConsensus } = require('./consensus/pow/consensus');
const { BlockcahinDatabase } = require('./dbchain');
const { sha256dBTC } = require('./hash_algo');
const { Coin } = require('./coin');



function RickcoinMainnet() {
    // Die Chainparms für den Rickcoin wird erzeugt
    let rickcoin = new Coin(8, "3eecf85c306b5c", 110700, 800);

    // Der Proof of Work Consensus wird erstellt
    let proof_of_work_consensus = new ProofOfWorkConsensus();

    // Speichert alle Blöcke ab
    let chain_database = new BlockcahinDatabase();

    // Speichert den Verwendeten Hash Algo ab (Bitcoin - SHA256)
    let hash_algo = sha256dBTC;

    // Speichert die Start Schwiergkeit ab
    let target = "00000000ffff0000000000000000000000000000000000000000000000000000";

    // Der Genesis Block wird gebaut


}


console.log(BigInt("17711999998782300").toString(16))