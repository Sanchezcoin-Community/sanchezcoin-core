// Wird verwendet um einen neuen Proof of Work Block zu erstellen
class CandidatePoWBlock {
    constructor(prv_block_hash, block_hight, transactions, coinbase_reciver_address, coinbase_amount, hash_algo) {
        this.coinbase_reciver_address = coinbase_reciver_address;
        this.coinbase_amount = coinbase_amount;
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
        this.hash_algo = hash_algo;
        this.nonce = 0;
    };

    // Dreht die Nonce um eins nach oben
    nonceAddOne() {
        this.nonce += 1;
    };

    // Gibt das Blocktemplate aus
    block_template() {

    };

    // Gibt den Aktuellen Blockckhash aus
    get_candidate_block_hash() {

    };
};


// Wird verwendet um einen neuen Proof Of Stake Block zu erstellen
class CandidatePoSBlock {
    constructor(prv_block_hash, block_hight, transactions, coinbase_reciver_address, coinbase_amount, pos_algo) {
        this.coinbase_reciver_address = coinbase_reciver_address;
        this.coinbase_amount = coinbase_amount;
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
        this.pos_algo = pos_algo;
        this.nonce = 0;
    };

    // Gibt das Blocktemplate aus
    block_template() {

    };

    // Gibt den Aktuellen Blockckhash aus
    get_candidate_block_hash() {

    };
};


// Wird verwendet um einen neuen Proof of Authority Bock zu erstellen
class CandidatePoABlock {
    constructor(prv_block_hash, block_hight, transactions, coinbase_reciver_address, coinbase_amount, poa_algo) {
        this.coinbase_reciver_address = coinbase_reciver_address;
        this.coinbase_amount = coinbase_amount;
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
        this.pos_algo = pos_algo;
        this.nonce = 0;
    };

    // Gibt das Blocktemplate aus
    block_template() {

    };

    // Gibt den Aktuellen Blockckhash aus
    get_candidate_block_hash() {

    };
};


// Fertiger Block
class FinallyBlock {
    constructor(prv_block_hash, block_hight, transactions, consensus_proof) {
        this.consensus_proof = consensus_proof;
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
    };
};


// Exportiert die Klassen
module.exports = {
    CandidatePoWBlock:CandidatePoWBlock,
    CandidatePoSBlock:CandidatePoSBlock,
    CandidatePoABlock:CandidatePoABlock,
    FinallyBlock:FinallyBlock 
};