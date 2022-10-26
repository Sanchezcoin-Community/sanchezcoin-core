class Blockchain {
    constructor(genesis_block, target, hash_algo, coin, options) {
        this.genesis_block = genesis_block;
        this.blocks = [];
        this.db = null;
    };

    // Fügt der Kette einen neuen Block hinzu
    addNewBlock(...block) {

    };

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        // Es wird geprüft ob die Blockchain Benutzbar ist
        if(this.useable() !== true) return "0000000000000000000000000000000000000000000000000000000000000000";

        // Der Hash des Genesisblock wird zurückgegeben
        return this.genesis_block.blockHash();
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