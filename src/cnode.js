const { PoWBlock } = require('./block');
const { mainnet } = require("./chainparms");
const { PoWMinerClass } = require('./pow');
const bigInt = require("big-integer");


// Wird als Node Objekt verwendet
class Node {
    constructor(block_chain_object) {
        // Speichert das Aktuelle Blockchain Objekt ab
        this.block_chain_object = block_chain_object;

        // Speichert das Miner Objekt ab
        this.miner = null;
    };

    // Wird verwendet um die Einstellungen zu laden
    loadChain(path, callback) {
        // Die Blockchaindatenbank wird geladen
        this.block_chain_object.loadBlockchainDatabase(path, callback);
    }

    // Startet den Mining Vorgang
    startMiner(reciverPublicKeyHash, threads=2, total=null, callback=null) {
        // Es wird geprüft ob bereits ein neuer Miner vorhanden ist
        if(this.miner !== null) return;

        // Das Aktuelle Consensusverfahren wird abgerufen
        let current_consens_prog = this.block_chain_object.nextBlockConsensus()

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
            let c_template = this.block_chain_object.getBlockTemplate(reciverPublicKeyHash);
            let current_template_block = c_template.cblock;

            // Es wird geprüft ob es sich um einen Mineable Block handelt
            if(c_template.type !== 'pow') {
                console.log('Mining stoped, consesnus changed');
                this.miner.clearCurrentProcess();
                return;
            }

            // Der Mining vorgang wird gestartet
            this.miner.startMine(this.block_chain_object.getPoWTarget(), current_template_block.blockTemplate(), (error, found_nonce) => {
                // Es wird geprüft ob ein Fehler aufgetreten ist
                if(error !== null) {
                    console.log(error);
                    return;
                }

                // Die Nonce des Blocks wird angepasst
                current_template_block.setNonce(found_nonce);

                // Es wird geprüft ob der Block die Aktuelle Diff erfüllt
                if((bigInt(current_template_block.getCandidateBlockHash(), 16) < bigInt(this.block_chain_object.getPoWTarget(), 16)) !== true) {
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
                this.block_chain_object.addBlock(final_block).then(() => {
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
        let current_consens_prog = this.nextBlockConsensus()

        // Es wird geprüft ob das Mining für diesen Block zur verfüung steht
        if(current_consens_prog.consensus !== 'posm') {
            throw new Error('Mining its not available');
        }

        // Diese Variable Gibt an, ob der Minting vorgang durchgefühhrt werden soll


        // Diese Schleife wird Asynchrone ausgeführt, es wird versucht einen neuen Block zu Minten
        (async() => {
            
        })();
    };

    // Gibt den Aktuellen Block aus
    getLastBlock() {
        return this.block_chain_object.getLastBlock();
    };
};


// Wird verwendet um eine Mainnet Blockchain zu erstellen
function createMainChain(callback) {
    mainnet((error, blockchain) => {
        // Es wird geprüft ob ein Fehler aufgetreten ist
        if(error !== null) { callback(error); return; }

        // Das Node Objekt wird erstellt
        const created_node_object = new Node(blockchain);

        // Das BLockchain Objekt wird zurückgegeben
        callback(null, created_node_object);
    });
};


// Exportiert die Funktionen
module.exports = {
    createMainChain:createMainChain
}