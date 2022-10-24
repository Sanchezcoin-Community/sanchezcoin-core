// Wird verwendet um einen neuen Block zu bauen
class BlockConstruct {
    constructor(prv_block_hash, block_hight, transactions, consensus) {
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
        this.consensus = consensus;
    }
}


// Fertiger Block
class Block {
    constructor(prv_block_hash, block_hight, transactions, consensus_proof) {
        this.consensus_proof = consensus_proof;
        this.prv_block_hash = prv_block_hash;
        this.transactions = transactions;
        this.block_hight = block_hight;
    }
}


// Exportiert die Klassen
module.exports = { BlockConstruct:BlockConstruct, Block:Block }