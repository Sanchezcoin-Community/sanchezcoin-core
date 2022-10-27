const { CoinbaseInput, UnspentOutput } = require('./utxos')
const { CoinbaseTransaction } = require('./transaction');
const { targetToBits, PoWBlock } = require('./block');
const { Mempool } = require('./mempool');


class Blockchain {
    constructor(genesis_block, coin, chainparms) {
        // Es wird geprüft ob es sich um einen gültigen Genesisblock handelt
        if(genesis_block.prv_block_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            console.log('INVLAID_GENESIS_BLOCK', genesis_block);
            return;
        }

        // Die Chainparms werden eingelesen
        this.main_parms = chainparms['$'];

        // Speichert die Daten ab
        this.genesis_block = genesis_block;
        this.chainparms = chainparms;
        this.mempool = new Mempool();
        this.coin = coin;
        this.blocks = [];
        this.db = null;

        // Speichert die Consensus Funktionen sowie Parameter ab
        this.new_candidate_block = this.main_parms.candidate_block_type;

        // Speichert das Aktuelle Target ab
        this.current_target = this.main_parms.target;

        // Speichert den Aktuellen Miner ab
        this.miner = null;
    };

    // Fügt der Kette einen neuen Block hinzu
    addNewBlock(...block) {

    };

    // Gibt einen Spiziellen Block aus
    getBlock(hight) {
        if(hight === 0) { return this.genesis_block; }
    };

    // Gibt den Letzten Block aus
    getLastBlock() {
        return this.genesis_block;
    };

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        // Der Hash des Genesisblock wird zurückgegeben
        return this.genesis_block.blockHash();
    };

    // Gibt die Mining Vorlage für den Aktuellen Block aus
    getBlockTemplate(reciverPublicKeyHash) {
        // Die Genesis Transaktion für den Empfänger wird erstellt
        let new_input = new CoinbaseInput();
        let new_output = new UnspentOutput(reciverPublicKeyHash, this.coin.current_reward);
        let genesis_coinbase_tx = new CoinbaseTransaction(0, [new_input], [new_output]);

        // Aus dem Target werden die Target Bits abgeleitet
        let target_bits = targetToBits(this.current_target);

        // Der letzte Block wird abgerufen
        let last_block = this.getLastBlock();

        // Es wird ein neuer Candidate Block erstellt
        let new_candidate_block = new this.new_candidate_block(last_block.blockHash(false), [genesis_coinbase_tx.computeHash()], target_bits, this.main_parms.pow_hash_algo, Date.now());

        // Der Block wird zurückgegeben
        return { cblock:new_candidate_block, txns:[genesis_coinbase_tx] };
    };

    // Startet den Mining Vorgang
    startMiner(reciverPublicKeyHash, threads=2) {
        // Es wird geprüft ob bereits ein neuer Miner vorhanden ist
        if(this.miner !== null) return;

        // Es wird ein neuer MultiThread Miner erstellt
        this.miner = new this.main_parms.mt_miner(threads);

        // Der Aktuelle Template Block wird abgerufen
        let c_template = this.getBlockTemplate(reciverPublicKeyHash);
        let current_template_block = c_template.cblock;

        // Der Mining vorgang wird gestartet
        this.miner.startMine(this.current_target, current_template_block.blockTemplate(), (error, found_nonce) => {
            // Es wird geprüft ob ein Fehler aufgetreten ist
            if(error !== null) {
                console.log(error);
                return;
            }

            // Die Nonce des Blocks wird angepasst
            current_template_block.setNonce(found_nonce);

            // Die Gefundenen Daten werden angezeigt
            console.log(current_template_block.blockHash(), `0x${current_template_block.target_bits}`, current_template_block.blockHeader());

            // Das Finale Blockobjekt wird erstellt
            let final_block = new PoWBlock(current_template_block.prv_block_hash, c_template.txns, c_template.target_bits, c_template.hash_algo, c_template.timestamp, found_nonce);
        });
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