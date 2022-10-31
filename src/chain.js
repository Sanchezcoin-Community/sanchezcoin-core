const { CoinbaseInput, UnspentOutput } = require('./utxos')
const { CoinbaseTransaction } = require('./transaction');
const { targetToBits, PoWBlock } = require('./block');
const BlockcahinDatabase = require('./dbchain');
const { Mempool } = require('./mempool');
const bigInt = require("big-integer");



// Stellt das Blockchain Objekt dar,
// diees wird verwendet um die Blockchain mit allen Konsensus Regeln zu verwenden
class Blockchain {
    constructor(genesis_block, coin, chainparms) {
        // Es wird geprüft ob es sich um einen gültigen Genesisblock handelt
        if(genesis_block.prv_block_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            console.log('INVLAID_GENESIS_BLOCK', genesis_block);
            return;
        }

        // Die Chainparms werden eingelesen
        this.main_parms = chainparms['$'];

        // Speichert die Parameter ab welche zum Betrieb des Peers benötigt werden
        this.blockchain_db = new BlockcahinDatabase(genesis_block, chainparms['$']);
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

    // Fügt der Kette neue Blöcke hinzu
    async addBlocks(...block) {
        // Die einzelnen Blöcke werden abgeabreitet und gepürft
        let validated_blocks = [];
        for await(const block_obj of block){
            // Es wird geprüft ob der Eintreffende Block die Aktuelle Schwiergikeit erfüllt,
            // sollte ein eintreffender Block nicht das Aktuelel Ziel erreichen wird der Block verworfen
            if((bigInt(block_obj.workProofHash(), 16) < bigInt(this.current_target, 16)) !== true) {
                console.log('INVALID_BLOCK_NOT_ACCEPTED');
                continue; 
            }

            // Es wird geprüft ob die Verwendeten Ausgänge der Transaktionen bereits verwenden werden
            let current_transaction_hight = 0, ignored = false;
            for(const tx_obj of block_obj.transactions) {
                // Es wird geprüft ob es sich um die Coinbase Transaktion handelt
                if(tx_obj.constructor.name === 'CoinbaseTransaction' && current_transaction_hight === 0) {
                    // Es wird geprüft wieviele Inputs und wieviele Outputs vorhanden sind
                    if(tx_obj.inputs.length !== 1 || tx_obj.outputs.length !== 1) {
                        console.log('INVALID_COINBASE_TRANSACTION');
                        ignored = true;
                        break;
                    }
                }

                // Der Zähler wird nach oben gezähltl
                current_transaction_hight += 1;
            }

            // Es wird geprüft ob es eine Üngpltige Transaktion gibt
            if(ignored === true) continue;

            // Der Block wird der Datenabnk hinzugefügt
            this.blocks.push(block_obj);
            validated_blocks.push(block_obj);
        }

        // Die Einträge werden der Datenbank hinzugefügt
        await this.blockchain_db.addBlock(...validated_blocks);

        // Es wird ermittelt ob eine Kettenreorganisation durchgeführt werden soll
        // es wird geprüft ob es zwei Blöcke gibt welche auf den selben Previous Hash zeigen,
        // wenn wird geprüft welche von beiden Kettten länger ist und in welche mehr Arbeit gesteckt wurde.
        // Wenn beide Ketten gleichlang sind, wird nichts unternommen, es wird auf den nächsten Block gewartet

        // Es werden alle Potenziellen Orphan Blocks abgerufen
        let recived_orphan_blocks = await this.blockchain_db.getPreviousOrphanBlocks();

        // Es wird geprüft Orphan Blocks vorhanden sind, wenn nicht wird der Vorgang übersprungen
        if(recived_orphan_blocks.length === 0) return;

        // Die Nachfolgerblöcke werden abgerufen
    };

    // Gibt alle Orphan Blöcke an, welche diesem Knotenpunkt bekannt sind
    async getOrphanBlocks() {

    };

    // Deaktivieren und Aktivieren von Blöcken, um eine neue längste Kette anzunehmen
    async chainReorganisation() {

    };

    // Gibt die Aktuelle Blockbelohnung aus
    currentBlockReward() {

    };

    // Gibt einen Spiziellen Block aus
    getBlock(hight) {
        if(hight === 0) { return this.genesis_block; }
        else {
            // Es wird geprüft ob genügend Blöcke vorhanden sind
            return;
        }
    };

    // Gibt den Letzten Block aus
    getLastBlock() {
        return this.blockchain_db.getCurrentBlock();
    };

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        return this.genesis_block.blockHash();
    };

    // Gibt die Mining Vorlage für den Aktuellen Block aus
    getBlockTemplate(reciverPublicKeyHash) {
        // Der Letzte Block sowie die Blockhöhe werden abgerufen
        let current_block_and_hight = this.blockchain_db.getCurrentBlockAndHight();

        // Die Genesis Transaktion für den Empfänger wird erstellt
        let new_input = new CoinbaseInput();
        let new_output = new UnspentOutput(reciverPublicKeyHash, this.coin.current_reward);
        let genesis_coinbase_tx = new CoinbaseTransaction(current_block_and_hight.hight + 1, [new_input], [new_output]);

        // Aus dem Target werden die Target Bits abgeleitet
        let target_bits = targetToBits(this.current_target);

        // Es wird ein neuer Candidate Block erstellt
        let new_candidate_block = new this.new_candidate_block(current_block_and_hight.block.blockHash(false), [genesis_coinbase_tx.computeHash()], target_bits, this.main_parms.pow_hash_algo, Date.now());

        // Der Block wird zurückgegeben
        return { cblock:new_candidate_block, txns:[genesis_coinbase_tx] };
    };

    // Startet den Mining Vorgang
    startMiner(reciverPublicKeyHash, threads=2, total=null, callback=null) {
        // Es wird geprüft ob bereits ein neuer Miner vorhanden ist
        if(this.miner !== null) return;

        // Es wird ein neuer MultiThread Miner erstellt
        this.miner = new this.main_parms.mt_miner(threads);

        // Speichert alle Blöcke ab
        let current_round = 0;

        // Diese Funktion wird ausgeführt um den Mining Vorgang durchzuführen
        const ___mine = () => {
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

                // Es wird geprüft ob der Block die Aktuelle Diff erfüllt
                if((bigInt(current_template_block.getCandidateBlockHash(), 16) < bigInt(this.current_target, 16)) !== true) {
                    console.log('INVALID_BLOCK_NOT_ACCEPTED');
                    return; 
                }

                // Die Gefundenen Daten werden angezeigt
                console.log(current_template_block.blockHash(), `0x${current_template_block.target_bits}`, current_template_block.blockHeader());

                // Das Finale Blockobjekt wird erstellt
                let final_block = new PoWBlock(current_template_block.prv_block_hash, c_template.txns, current_template_block.target_bits, current_template_block.hash_algo, current_template_block.timestamp, found_nonce);

                // Es wird geprüft ob es sich um einen gültigen Block handelt
                if(final_block.blockHash() !== current_template_block.blockHash()) {
                    console.log('INVALID_BLOCK_WAS_DROPPED');
                }

                // Es wird eine Runde hochgezählt
                current_round += 1;

                // Der Block wird der Kette Hinzugefügt
                this.addBlocks(final_block).then(() => {
                    // Der nächste Block wird abgeabut
                    if(total !== null) {
                        if(total != current_round) {
                            ___mine();
                        }
                        else {
                            if(callback !== null) callback(null, final_block);
                        }
                    }
                    else {
                        ___mine();
                        if(callback !== null) callback(null, final_block);
                    }
                });
            });
        };

        // Started den Miningvorgang
        ___mine();
    };

    // Wird verwendet um die Blockchain Datenbank zu laden
    loadBlockchainDatabase(file_path, callback) {
        // Die Datenbank wird geladen
        this.blockchain_db.loadDatabase().then((result) => {
            // Der Block wird in die Liste der Aktuellen Blöcke aufgenommen
            this.blocks.push(this.blockchain_db.current_block);

            // Der Vorgang wurde erfolgreich durchgeführt
            callback(result);
        })
        .catch((c) => {
            console.log(c);
            callback(c);
        })
    };

    // Gibt die Aktuelle Blocköhe an
    blockHight() {
        // Die Aktuelle Blockhöhe wird ausgegeben
        return 1 + this.blocks.length;
    };

    // Gibt die Anzahl aller im Moment exestierenden Blöcke an
    getCurrentSupply() {
        // Es wird eine Liste aus den Cacheblöcken sowie den
        let total_list = [this.genesis_block, ...this.blocks];
    };

    // Gibt an, ob das Objekt einsatzbereit ist
    useable() {
        return this.db !== null;
    };
}


// Das Blockchain Objekt wird exportiert
module.exports = {
    Blockchain:Blockchain
}