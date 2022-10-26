class Blockchain {
    constructor(genesis_block, target, hash_algo, coin, options) {
        this.genesis_block = genesis_block;
        this.blocks = [];
        this.db = null;
    }

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        return this.genesis_block.blockHash();
    }

    // Wird verwendet um die Blockchain Datenbank zu laden
    loadBlockchainDatabase(file_path, callback) {

    }

    // Gibt die Aktuelle Blocköhe an
    blockHight() {
        if(this.useable() === false) return false;
        return 1 + this.blocks.length;
    }

    // Gibt an, ob das Objekt einsatzbereit ist
    useable() {
        return this.db !== null;
    }
}


module.exports = {
    Blockchain:Blockchain
}