const { Mempool } = require('./mempool');


class Blockchain {
    constructor(genesis_block, coin, chainparms) {
        // Es wird geprüft ob es sich um einen gültigen Genesisblock handelt
        if(genesis_block.prv_block_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            console.log('INVLAID_GENESIS_BLOCK');
            return;
        }

        // Speichert die Daten ab
        this.genesis_block = genesis_block;
        this.chainparms = chainparms;
        this.mempool = new Mempool();
        this.coin = coin;
        this.blocks = [];
        this.db = null;
    };

    // Fügt der Kette einen neuen Block hinzu
    addNewBlock(...block) {

    };

    // Gibt einen Spiziellen Block aus
    getBlock(hight) {
        if(hight === 0) { return this.genesis_block; }
    };

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        // Der Hash des Genesisblock wird zurückgegeben
        return this.genesis_block.blockHash();
    };

    // Gibt die Mining Vorlage für den Aktuellen Block aus
    getBlockTemplate(reciverPublicKeyHash) {

    };

    // Wird verwendet um die Blockchain Datenbank zu laden
    loadBlockchainDatabase(file_path, callback) {
        
    };

    // Gibt die Aktuelle Blocköhe an
    blockHight() {
        // Es wird geprüft ob die Blockchain benutzbar ist
        if(this.useable() === false) return false;

        // Die Aktuelle Blockhöhe wird ausgegeben
        return 1 + this.blocks.length;
    };

    // Gibt an, ob das Objekt einsatzbereit ist
    useable() {
        return this.db !== null;
    };
}


module.exports = {
    Blockchain:Blockchain
}