const { CoinbaseInput, UnspentOutput } = require('./utxos')
const { CoinbaseTransaction } = require('./transaction');
const { computeMerkleRoot } = require('./merkle');
const { sha256dBTC } = require('./hash_algo');
const { Coin } = require('./coin');
const crypto = require('crypto');



// Wird verwendet um die Difficulty (das Target) in eine kleine Bit reihenfolge umzuwandeln
function targetToBits(target) {
    const dhexed = target.replace(/^0+/, '');
    const len_hex = dhexed.length.toString(16).padStart(1, 0)
    const total = `${len_hex}${dhexed.toString('hex')}`.split('').reverse().join('');
    const total2 = total.replace(/^0+/, '').split('').reverse().join('');
    return `${total2}`;
};


// Wird verwendet um einen neuen Proof of Work Block zu erstellen
class CandidatePoWBlock {
    constructor(prv_block_hash, transactions_ids, target_bits, hash_algo, timestamp, nonce=0) {
        this.transactions_ids = transactions_ids;
        this.prv_block_hash = prv_block_hash;
        this.target_bits = target_bits;
        this.timestamp = timestamp;
        this.hash_algo = hash_algo;
        this.nonce = nonce;
    };

    // Setzt die Aktuelle Nonce
    setNonce(cnonce) {
        this.nonce = cnonce;
    };

    // Dreht die Nonce um eins nach oben
    nonceAdd() {
        if(this.nonce +1 >= 2147483647) return false;
        this.nonce += 1;
        return true;
    };

    // Berechnet den MerkleRoot des Blocks
    computeMerkleRoot() {
        // Die Transaktions IDS werden Reverst
        const reversed = [];
        for(const otem of this.transactions_ids) reversed.push(otem)
        const a = computeMerkleRoot(this.hash_algo, reversed.reverse());
        return a;
    };

    // Gibt das Blocktemplate aus
    blockTemplate() {
        // Der neue Block wird erstellt
        const block_version = "01000000";
        const prev_block = Buffer.from(this.prv_block_hash, 'hex').reverse().toString('hex');
        const timestamp = Buffer.from(this.timestamp.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');
        const merkle_root = Buffer.from(this.computeMerkleRoot(), 'hex').reverse().toString('hex');
        const bits = Buffer.from(this.target_bits, 'hex').reverse().toString('hex');

        // Die Daten des Block Templates werden zurückgegeebn
        return `${block_version}${prev_block}${merkle_root}${timestamp}${bits}`;
    };

    // Gibt den Vollständigen Blockheader aus
    blockHeader() {
        // Block Template Header
        const blockTemplate_header = this.blockTemplate();

        // Wandelt die Nonce um
        const nonce = Buffer.from(this.nonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

        // Gibt den Vollständig String zurück
        return `${blockTemplate_header}${nonce}`;
    };

    // Gibt den Aktuellen Blockckhash aus
    getCandidateBlockHash() {
        return this.hash_algo.compute(Buffer.from(this.blockHeader(), 'hex'))
    };
};


// Fertiger Block
class PoWBlock {
    constructor(prv_block_hash, transactions, target_bits, hash_algo, timestamp, nonce) {
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.target_bits = target_bits;
        this.timestamp = timestamp;
        this.hash_algo = hash_algo;
        this.nonce = nonce;
    };

    // Gibt die Target Bits aus
    targetBits() {
        return `0x${this.target_bits}`
    };

    // Berechnet den MerkleRoot des Blocks
    computeMerkleRoot() {
        // Die Transaktions IDS werden Reverst
        const reversed = [];
        for(const otem of this.transactions) reversed.push(otem.computeHash());
        const a = computeMerkleRoot(this.hash_algo, reversed.reverse());
        return a;
    };

    // Gibt den Vollständigen Blockheader aus
    blockHeader() {
        // Der neue Block wird erstellt
        const block_version = "01000000";
        const prev_block = Buffer.from(this.prv_block_hash, 'hex').reverse().toString('hex');
        const timestamp = Buffer.from(this.timestamp.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');
        const merkle_root = Buffer.from(this.computeMerkleRoot(), 'hex').reverse().toString('hex');
        const bits = Buffer.from(this.target_bits, 'hex').reverse().toString('hex');

        // Block Template Header
        const blockTemplate_header = `${block_version}${prev_block}${merkle_root}${timestamp}${bits}`;

        // Wandelt die Nonce um
        const nonce = Buffer.from(this.nonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

        // Gibt den Vollständig String zurück
        return `${blockTemplate_header}${nonce}`;
    };

    // Gibt den Hash des Arbeitsnachweises aus
    workProofHash() {
        return this.hash_algo.compute(Buffer.from(this.blockHeader(), 'hex'))
    };

    // Gibt den Vollständigen Hash des Blocks aus
    blockHash() {
        const final = crypto.createHash('sha256').update(this.workProofHash()).digest('hex');
        return `0x${final}`;
    };
};


// Wird verwendet um einen Genesis Mining Block zu erstellen
function mineGenesisPoWBlock(reciver_address, target, coin, hash_algo) {
    // Der Betrag für den Aktuellen Block wird abgerufen
    let current_reward = coin.current_reward;

    // Die Genesis Transaktion für den Empfänger wird erstellt
    let new_input = new CoinbaseInput();
    let new_output = new UnspentOutput(reciver_address, current_reward);
    let genesis_coinbase_tx = new CoinbaseTransaction(0, [new_input], [new_output]);

    // Aus dem Target werden die Target Bits abgeleitet
    const target_bits = targetToBits(target);

    // Der Block wird gebaut
    let new_block = new CandidatePoWBlock('0000000000000000000000000000000000000000000000000000000000000000', [genesis_coinbase_tx.computeHash()], target_bits, hash_algo, 1666748793);

    var pow = require('./consensus/pow/consensus');
    const multi_thread_miner = new pow(3);
    multi_thread_miner.startMine(target, new_block.blockTemplate(), (error, found_nonce) => {
        // Es wird geprüft ob ein Fehler aufgetreten ist
        if(error !== null) {
            console.log(error);
            return;
        }

        // Die Nonce des Blocks wird angepasst
        new_block.setNonce(found_nonce);

        // Die Gefundenen Daten werden angezeigt
        console.log('Block proof:',new_block.getCandidateBlockHash());
        console.log('Block nonce:', found_nonce);
        console.log('Block target bits:', new_block.target_bits);
    });
};


// Der Genesisblock wird erzeugt
//const test_coin = new Coin(8, BigInt('17711999998782300'), 110700, 800);
//const test = mineGenesisPoWBlock('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '00000ffff0000000000000000000000000000000000000000000000000000000', test_coin, sha256dBTC)


// Exportiert die Klassen
module.exports = {
    mineGenesisPoWBlock:mineGenesisPoWBlock,
    CandidatePoWBlock:CandidatePoWBlock,
    targetToBits:targetToBits,
    PoWBlock:PoWBlock 
};


const atra = targetToBits("00000000000000000696f4000000000000000000000000000000000000000000");
console.log(`0x${atra}`)
console.log('0x180696f4')
console.log('0x3bffff')