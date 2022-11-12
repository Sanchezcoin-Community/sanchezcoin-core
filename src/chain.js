const { CoinbaseInput, UnspentOutput } = require('./utxos')
const { CoinbaseTransaction } = require('./transaction');
const { targetToBits, PoWBlock } = require('./block');
const BlockcahinDatabase = require('./dbchain');
const { PoWMinerClass } = require('./pow');
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

        // Speichert die Akutelle Gearbeitete Leistung
        this.chain_work = 0;

        // Speichert die Parameter ab welche zum Betrieb des Peers benötigt werden
        this.blockchain_db = new BlockcahinDatabase(genesis_block, chainparms['$']);
        this.genesis_block = genesis_block;
        this.chainparms = chainparms;
        this.mempool = new Mempool();
        this.cblock = null;
        this.chight = 0;
        this.coin = coin;
        this.blocks = [];
        this.db = null;

        // Speichert das Aktuelle Target ab
        this.current_pow_target = this.#consensusForHight(0).pow_target;

        // Speichert den Aktuellen Miner ab
        this.miner = null;
    };

    // Gibt die Aktiven Regeln für die Aktuelle Blockhöhe aus
    #consensusForHight(hight) {
        // Es werden alle Blockeinstellungen für diese Blockhöhe aufgelistet
        let temp_chain_pamrs = { ...this.chainparms };
        let main_parms = temp_chain_pamrs["$"];
        delete temp_chain_pamrs["$"];
        let temp_chain_pamrs_keys = Object.keys(temp_chain_pamrs);
        for(const otem of temp_chain_pamrs_keys) {
            if(hight >= otem) main_parms = { ...main_parms, ...temp_chain_pamrs[otem] };
        }
        return main_parms;
    };

    // Gibt das Konsensusverfahren für den Nächstenblock aus
    #nextBlockConsensus() {
        return this.#consensusForHight(this.cblock.hight + 1);
    };

    // Fügt der Kette neue Blöcke hinzu
    async addBlock(block_obj, full_block=true) {
        // Die Atuellen Consensusregeln werden abgerufen
        let current_consens_rules = this.#nextBlockConsensus();

        // Es wird geprüft ob es sich um einen Proof of Work Block handelt
        if(block_obj.constructor.name === 'PoWBlock' && current_consens_rules.consensus === 'pow') {
            // Es wird geprüft ob der Eintreffende Block die Aktuelle Schwiergikeit erfüllt,
            // sollte ein eintreffender Block nicht das Aktuelel Ziel erreichen wird der Block verworfen
            if((bigInt(block_obj.workProofHash(), 16) < bigInt(this.current_pow_target, 16)) !== true) {
                console.log('INVALID_BLOCK_NOT_ACCEPTED');
                return false;
            }
        }
        else {
            throw new Error('Unknown block type');
        }

        // Der Vorgängerblock wird abgerufen
        let previous_block = await this.blockchain_db.loadBlockFromDatabase(block_obj.prv_block_hash);
        if(previous_block.block.blockHash(false) !== block_obj.prv_block_hash) {
            console.log('INVALIV_BLOCK_RETURNED_FROM_DB')
        }

        // Es wird geprüft ob die Blochöhe korrekt angegeben wurde
        let next_block_hight = previous_block.hight + 1;
        if(next_block_hight !== block_obj.coinbaseBlockHight()) {
            console.log('INVALID_BLOCK_HIGHT', previous_block.hight +1, block_obj.coinbaseBlockHight());
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
            else if(tx_obj.constructor.name === 'SignatedTransaction' && current_transaction_hight > 0) {
                // Es handelt sich um eine Signierte Transaktion
            }
            else {
                // Es handelt sich um einen Unbekannten Transaktionstypen
            }

            // Der Zähler wird nach oben gezähltl
            current_transaction_hight += 1;
        };

        // Es wird geprüft ob es eine Üngpltige Transaktion gibt
        if(ignored === true) return false;

        // Der Aktuelle Block wird in der Datenbank hinzugefügt
        await this.blockchain_db.addBlock(block_obj, previous_block.hight + 1);

        // Es wird geprüft ob es sich um den Nachfolgeblock des Aktuellen Blocks handelt, wenn ja wird dieser Geupdated
        if(this.cblock.block.blockHash(false) === block_obj.prv_block_hash && next_block_hight === this.cblock.hight + 1) {
            // Die Kopie des letzten Blocks, sowie die Aktuelle Höhe wird zwischengespeichert
            this.cblock = { block:block_obj, hight:next_block_hight };

            // Der Datenbank wird Signalisiert, was der Aktuelleste Block ist
            await this.blockchain_db.setChainStateLastBlock(block_obj.blockHash(false), next_block_hight);

            // Es wird geprüft ob die Aktuelle Blockhöhe in der Datenbank mit der Aktuellen Blockhöhe übereinstimmt
            let current_block_hight = await this.blockchain_db.cleanedBlockHight();
            if(current_block_hight !== next_block_hight) {
                console.log('INVALID_BLOCK_CHAIN_REGO');
            }
        }

        // Der Block wird der Datenabnk hinzugefügt
        this.blocks.push(block_obj);

        // Die Aktive Kette wird ausgewählt
        await this.selectActiveChain();

        // Der Vorgang wurde erfolgreich durchgeführt
        return true;
    };

    // Wird verwendet um die Aktuelle Kette auszuwählen
    async selectActiveChain() {

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

    // Gibt den Hash des Ersten Blocks aus
    hashOfFirstBlock() {
        return this.genesis_block.blockHash();
    };

    // Gibt die Mining Vorlage für den Aktuellen Block aus
    getBlockTemplate(reciverPublicKeyHash) {
        // Der Letzte Block sowie die Blockhöhe werden abgerufen
        let current_block_and_hight = this.cblock;

        // Das Aktuelle Consensusverfahren wird abgerufen
        let current_consens = this.#consensusForHight(current_block_and_hight.hight + 1);

        // Die Genesis Transaktion für den Empfänger wird erstellt
        let new_input = new CoinbaseInput();
        let next_block_hight = current_block_and_hight.hight + 1;
        let new_output = new UnspentOutput(reciverPublicKeyHash, this.coin.current_reward);
        let genesis_coinbase_tx = new CoinbaseTransaction(next_block_hight, [new_input], [new_output]);

        // Aus dem Target werden die Target Bits abgeleitet
        let target_bits = targetToBits(this.current_pow_target);

        // Es wird ein neuer Candidate Block erstellt
        let new_candidate_block = new current_consens.candidate_block(current_block_and_hight.block.blockHash(false), [genesis_coinbase_tx.computeHash()], target_bits, current_consens.pow_hash_algo, Date.now());

        // Der Block wird zurückgegeben
        return { cblock:new_candidate_block, txns:[genesis_coinbase_tx], hight:current_block_and_hight.hight + 1, type:current_consens.consensus };
    };

    // Startet den Mining Vorgang
    startMiner(reciverPublicKeyHash, threads=2, total=null, callback=null) {
        // Es wird geprüft ob bereits ein neuer Miner vorhanden ist
        if(this.miner !== null) return;

        // Das Aktuelle Consensusverfahren wird abgerufen
        let current_consens_prog = this.#nextBlockConsensus()

        // Es wird geprüft ob das Mining für diesen Block zur verfüung steht
        if(current_consens_prog.consensus !== 'pow') {
            throw new Error('Mining its not available');
        }

        // Es wird ein neuer MultiThread Miner erstellt
        this.miner = new PoWMinerClass(threads, current_consens_prog.pow_hash_algo);

        // Speichert alle Blöcke ab
        let current_round = 0;

        // Diese Funktion wird ausgeführt um den Mining Vorgang durchzuführen
        const ___mine = () => {
            // Der Aktuelle Template Block wird abgerufen
            let c_template = this.getBlockTemplate(reciverPublicKeyHash);
            let current_template_block = c_template.cblock;

            // Es wird geprüft ob es sich um einen Mineable Block handelt
            if(c_template.type !== 'pow') {
                console.log('Mining stoped, consesnus changed');
                this.miner.clearCurrentProcess();
                return;
            }

            // Der Mining vorgang wird gestartet
            this.miner.startMine(this.current_pow_target, current_template_block.blockTemplate(), (error, found_nonce) => {
                // Es wird geprüft ob ein Fehler aufgetreten ist
                if(error !== null) {
                    console.log(error);
                    return;
                }

                // Die Nonce des Blocks wird angepasst
                current_template_block.setNonce(found_nonce);

                // Es wird geprüft ob der Block die Aktuelle Diff erfüllt
                if((bigInt(current_template_block.getCandidateBlockHash(), 16) < bigInt(this.current_pow_target, 16)) !== true) {
                    console.log('INVALID_BLOCK_NOT_ACCEPTED');
                    return; 
                }

                // Die Gefundenen Daten werden angezeigt
                console.log(current_template_block.blockHash(), `0x${current_template_block.target_bits}`, c_template.hight);

                // Das Finale Blockobjekt wird erstellt
                let final_block = new PoWBlock(current_template_block.prv_block_hash, c_template.txns, current_template_block.target_bits, current_template_block.hash_algo, current_template_block.timestamp, found_nonce);

                // Es wird geprüft ob es sich um einen gültigen Block handelt
                if(final_block.blockHash() !== current_template_block.blockHash()) {
                    console.log('INVALID_BLOCK_WAS_DROPPED');
                }

                // Es wird eine Runde hochgezählt
                current_round += 1;

                // Der Block wird der Kette Hinzugefügt
                this.addBlock(final_block).then(() => {
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

    // Wird verwendet um dass Staking zu Starten
    startBlockMinting(staker_private_key) {
        // Das Aktuelle Consensusverfahren wird abgerufen
        let current_consens_prog = this.#nextBlockConsensus()

        // Es wird geprüft ob das Mining für diesen Block zur verfüung steht
        if(current_consens_prog.consensus !== 'posm') {
            throw new Error('Mining its not available');
        }

        // 
    };

    // Wird verwendet um die Blockchain Datenbank zu laden
    loadBlockchainDatabase(file_path, callback) {
        // Die Datenbank wird geladen
        this.blockchain_db.loadDatabase().then(async (result) => {
            // Der Aktuelle Block wird abgerufen und zwischengspeichert
            this.cblock = await this.blockchain_db.getChainStateLastBlock();

            // Es wird geprüft ob die Höhe mit dem letzten Block übereinstimmt
            let clean_hight = await this.blockchain_db.cleanedBlockHight();
            if(clean_hight !== this.cblock.hight) {
                throw new Error('INVALID_BLOCKCHAIN_DB');
            }

            // Der Block wird in die Liste der Aktuellen Blöcke aufgenommen
            this.blocks.push(this.cblock);

            // Der Vorgang wurde erfolgreich durchgeführt
            callback(result);
        })
        .catch((c) => {
            console.log(c);
            callback(c);
        })
    };

    // Gibt die Anzahl aller im Moment exestierenden Blöcke an
    getCurrentSupply() {
        // Es wird eine Liste aus den Cacheblöcken sowie den
        let total_list = [this.genesis_block, ...this.blocks];
    };

    // Gibt den letzten Block aus
    getLastBlock() {
        return this.cblock;
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