const sqlite3 = require('sqlite3').verbose();
const { PoWBlock } = require('./block');
const crypto = require('crypto');
const cbor = require('cbor');
const fs = require('fs');



// Stellt die Blockchain Datenabnk dar
// dieses Objekt ist die eigentliche Blockchain, alle Blöcke, Transaktionen sowie Daten im Mempool werden von diesem Objekt verwaltet
class BlockcahinDatabase {
    constructor(genesis_block, main_parms) {
        // Speichert die Main Parms ab
        this.main_parms = main_parms;

        // Speichert den Genesisblock ab
        this.genesis_block = genesis_block;

        // Speichert den Aktuellen Block ab
        this.current_block = genesis_block;

        // Speichert die Aktuelle Block Höhe ab
        this.current_block_hight = 0;

        // Speichert die letzten 4 Blöcke ab
        this.last_item_blocks = [];

        // Speichert die Aktuelle Datenbank ab
        this.block_db = null;
        this.tx_db = null;
    };

    // Gibt an ob das UTXO bereits ausgegeben wurde
    async getUnspentUtxo(txid, utxo_hight) {

    };

    // wird verwendet um die Chainstate auf den Aktuellen Stnad zu updaten
    async updateChainState() {
        // Die Hashes der Dateien werden erstellt
        let block_file_h = await new Promise((resolveOuter) => {
            var fd = fs.createReadStream('database/blocks.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        });
        let txdb_file_h = await new Promise((resolveOuter) => {
            var fd = fs.createReadStream('database/txdb.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        });

        // Die Chainsate wird angepasst
        let new_chain_state = {
            current_block:Buffer.from(this.current_block.blockHash(false), 'hex'),
            tx_db:Buffer.from(txdb_file_h, 'hex'),
            block_db:Buffer.from(block_file_h, 'hex')
        };

        // Die Daten werden mittels CBOR umgewandelt
        let cbored_data = cbor.encode(new_chain_state);

        // Die Datei wird geschrieben
        let state = await new Promise((resolved) => {
            fs.writeFile("database/chain.state", cbored_data, 'binary', function(err) {
                if(err) { resolved(err); return; }
                resolved(true);
            }); 
        });

        // Der Vorgang wird beendet
        return state;
    };

    // Wird verwendet um die Höhe der Blockchain anhand der PreviousBlockID zu ermitteln
    async #currentBlockHight() {
        // Es wird eine Anfrage an die Datenbank gestellt um die Aktuelle Blockhöhe zu ermitteln
        let current_block_hight = await new Promise((resolved, reject) => {
            // Es wird eine Anfrage an die Datenbank gestellt um den Block abzurufen
            this.block_db.get(`SELECT COUNT(DISTINCT prev_hash) as total_blocks FROM blocks;`, (err, row) => {
                resolved(row.total_blocks);
            });
        });

        // Die Anzahl der Gesamtwerte wird zurückgegeben
        return current_block_hight;
    };

    // Wird verwendet um einen Eintrag aus der Datenbank zu laden
    async #loadBlockFromDatabase(blockHash) {
        // Es wird geprüft ob es sich um den Genesisblock handelt
        if(this.genesis_block.blockHash(false) === blockHash) return this.genesis_block;

        // Der Block wird abgerufen
        let result = new Promise((resolved, reject) => {
            // Es wird eine Anfrage an die Datenbank gestellt um den Block abzurufen
            this.block_db.all(`SELECT prev_hash, type, block_hash, pre_header, transactions from blocks WHERE block_hash = '${blockHash}' LIMIT 1`, (err, row) => {
                // Es wird geprüft ob genau 1 Eintrag zugegeben wurde
                if(row.length !== 1) {
                    reject('Invalid system');
                    return;
                }

                // Es wird geprüft ob der Blockhash mit dem gesuchten Hash übereinstimmt
                const fBlock = row[0];
                if(fBlock.block_hash !== `${blockHash}`) {
                    reject('Invalid block response from database');
                    return;
                }

                // Es wird geprüft ob es sich um eien PoW Block handelt
                if(fBlock.type === 'sha256d_pow') {
                    // Es wird versucht den Block zu Rekonstruieren
                    const reconstructed_by_block_hash = PoWBlock.loadFromDbElements(fBlock.prev_hash, this.main_parms.pow_hash_algo, fBlock.transactions, fBlock.pre_header);

                    // Der Hash des Blocks wird mit dem Hash des Gesuchten Blocks verglichen
                    if(blockHash !== reconstructed_by_block_hash.blockHash(false)) {
                        reject('INVALID_BLOCK_RETRIVED');
                        return false;
                    }

                    // Der Block wird zurückgegeben
                    resolved(reconstructed_by_block_hash);
                    return;
                }
                else {
                    reject('UNKOWN_BLOCK_CONSENSUS_POW');
                    return;
                }
            });
        });

        // Die Daten werden zurückgegeben
        return result;
    };

    // Wird verwendet um zu überprüfen ob der Block bereits hinzugefügt wurde
    async #isAlwaysInDatabase(blockHash) {
        try{ await this.#loadBlockFromDatabase(blockHash); }
        catch(e) { return false; }
        return true;
    };

    // Gibt alle Blöcke aus, für die es mehrere Nachfolger gibt
    async getPreviousOrphanBlocks() {
        return [];
    };

    // Wird verwendet um den Aktuellen Block aus der Datenbank abzurufen
    async loadBlockFromDatabaseByBlockHash(blockHash) {
        // Es wird geprüft ob es sich bei dem Block um den Aktuellen Block handelt
        if(blockHash === this.current_block.blockHash(false)) {
            return true;
        }
        else {
            // Der Block wird aus der Datenbank geladen
            let loaded_from_db = await this.#loadBlockFromDatabase(blockHash);

            // Der Block wird abgespeichert
            this.current_block = loaded_from_db;

            // Der Vorgang wurde erfolgreich fertigestellt
            return true;
        }
    };

    // Lädt die Datenbank
    async loadDatabase() {
        // Speichert die Prüfwerte der Datenbanken ab
        let local_chsum_blocks = null, local_chsum_txdb = null;

        // Gibt an ob die Datenbanken geladen wurde
        let avail_blocks_db = false, avail_tx_db = false;

        // Speichert die Aktuellen Block lists ab
        let chain_state = null;

        // Erstellt einen Hash aus der Blocks Datei
        const __hash_block_file = async (safe=true) => {
            let resolved = await new Promise((resolveOuter) => {
                var fd = fs.createReadStream('database/blocks.db');
                var hash = crypto.createHash('sha1');
                hash.setEncoding('hex');
                fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
                fd.pipe(hash);
            });
            if(safe === true) local_chsum_blocks = resolved;
        };

        // Erstellt einen Hash aus der TxDB Datei
        const ___hash_txdb_file = async (safe=true) => {
            let resolved = await new Promise((resolveOuter) => {
                var fd = fs.createReadStream('database/txdb.db');
                var hash = crypto.createHash('sha1');
                hash.setEncoding('hex');
                fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
                fd.pipe(hash);
            });
            if(safe === true) local_chsum_txdb = resolved;
        };

        // Es wird geprüft ob die Chainsate Datei vorhanden ist
        if(fs.existsSync('database/chain.state')) chain_state = await new Promise((resolveOuter) => {
            fs.readFile('database/chain.state', function(status, fd) {
                if (status) {
                    console.log(status.message);
                    return;
                }
                let decoded = cbor.decode(fd);
                resolveOuter(decoded);
            });
        });

        // Es wird geprüft ob die Blocksdatei vorhanden ist
        if(fs.existsSync('database/blocks.db')) {
            // Es wird Signalisiert dass die BlocksDB vorhanden ist
            avail_blocks_db = true;

            // Es wird geprüft ob die Chainstate geladen wurde
            if(chain_state !== null) {
                // Es wird ein Hash aus der Blockdatenbank erstellt
                await __hash_block_file(); 
            }
        }

        // Es wird geprüft ob die Transaction Database vorhanden ist
        if(fs.existsSync('database/txdb.db')) {
            // Es wird Signalisiert dass eine Transaktionsdatenbank vorhanden ist
            avail_tx_db = true;

            // Es wird geprüft ob die Chainstate geladen wurde
            if(chain_state !== null) {
                // Es wird ein Hash aus der Transaktionsdatenbank erstellt
                await ___hash_txdb_file(); 
            }
        }

        // Es wird geprüft ob die Chainstate Datei korrekt ist, wenn nicht wird ein Exception ausgelöst
        if((avail_blocks_db == true || avail_tx_db === true) && chain_state === null) {
            // Wenn die Blocks Daten vorhanden sind werden diese Gelöscht
            if(avail_blocks_db === true) fs.unlinkSync('database/blocks.db');

            // Wenn die TxDB vorhanden ist, wird diese gelöscht
            if(avail_tx_db === true) fs.unlinkSync('database/txdb.db')

            // Debug
            console.log('Database directory cleared');
        }

        // Es wird geprüft ob die Chainstatedaten sowie Datenbankdaten korrekt sind
        if(avail_blocks_db === true && avail_tx_db === true && chain_state !== null) {
            // Es wird geprüft ob die Hashwerte der Blockdatenbank korrekt sind
            if(local_chsum_blocks !== null) {
                if(local_chsum_blocks !== chain_state.block_db.toString('hex')) {
                    console.log('Invalid blockchaind data, BLOCK_DB');
                    return;
                }
            }

            // Es wird geprüft ob die Daten der Transaktionsdaten korrekt sind
            if(local_chsum_txdb !== null) {
                if(local_chsum_txdb !== chain_state.tx_db.toString('hex')) {
                    console.log('Invalid blockchaind data, TX_DB');
                    return;
                }
            }
        }

        // Die Datenbanken werden geladen
        let block_db = null, tx_db = null;
        try{ block_db = new sqlite3.Database('database/blocks.db'); }
        catch(e) { console.log(e); return; }
        try { tx_db = new sqlite3.Database('database/txdb.db'); }
        catch(e) { console.log(e); return; }

        // Der Vorgang wird Asynchron ausgeführt
        let nblock_result = await new Promise((resolveOuter) => {
            // Wird ausgeführt wenn der Vorgang final fertigestellt wurde
            const ___totalf_finally = (newBlockCh) => {
                this.block_db = block_db;
                this.tx_db = tx_db;
                resolveOuter(newBlockCh);
            };

            // Wird verwendet um einen ChainReork durchzuführen
            const ___finally = () => {
                // Es wird geprüft ob die Chainstate Vorhanden ist, wenn nicht wird sie erzeugt
                if(chain_state === null) this.updateChainState().then((e) => {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(e !== true) { console.log(e); return; }

                    // Der Vorgang wurde erfolgreich geladen
                    ___totalf_finally(true);
                })
                else ___totalf_finally(false);
            };

            // Wird verwendet um zu überprüfen ob die Transaktionsdatenbank korrekt ist
            const ___verify_blocks_two = () => {
                // Es wird geprüft ob die benötigten Datenbanken vorhanden sind
                block_db.all("select name from sqlite_master where type='table'", function (err, tables) {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(err) {
                        console.log(err);
                        return;
                    }

                    // Es wird geprüft ob der Eintrag vorhanden ist
                    if(tables.map((value) => value.name).includes('blocks') !== true) {
                        // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                        // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                        if(chain_state !== null) {
                            console.log('INVALID_BLOCKCHAIN');
                            return;
                        }

                        // Die Tabelle wird erstellt
                        block_db.run('CREATE TABLE "blocks" ("block_id" INTEGER UNIQUE, "prev_hash"	BLOB, "type" TEXT, "block_hash" BLOB, "pre_header" BLOB, "transactions" BLOB, PRIMARY KEY("block_id" AUTOINCREMENT));', (error) => {
                            // Es wird geprüft ob der Block korrekt ist
                            if(error) {
                                console.log(error);
                                return;
                            }

                            // Der Nächste Schritt wird ausgeführt
                            ___finally();
                        });
                    }
                    else {
                        // Der Nächste Schritt wird ausgeführt
                        ___finally();
                    }
                });
            };

            // Wird ausgeführt um zu überprüfen ob die Blocksdatabase Korrekt ist
            const ___verify_blocks = () => {
                // Es wird geprüft ob die benötigten Datenbanken vorhanden sind
                block_db.all("select name from sqlite_master where type='table'", function (err, tables) {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(err) {
                        console.log(err);
                        return;
                    }

                    // Es wird geprüft ob der Eintrag vorhanden ist
                    if(tables.map((value) => value.name).includes('orphan') !== true) {
                        // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                        // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                        if(chain_state !== null) {
                            console.log('INVALID_BLOCKCHAIN');
                            return;
                        }

                        // Die Tabelle wird erstellt
                        block_db.run('CREATE TABLE "orphan" ("id" INTEGER UNIQUE, "type" TEXT, "block_hash" BLOB,"block_header" BLOB, PRIMARY KEY("id" AUTOINCREMENT));', (error) => {
                            // Es wird geprüft ob der Block korrekt ist
                            if(error) {
                                console.log(error);
                                return;
                            }

                            // Der Nächste Schritt wird ausgeführt
                            ___verify_blocks_two();
                        });
                    }
                    else {
                        // Der Nächste Schritt wird ausgeführt
                        ___verify_blocks_two();
                    }
                });
            };

            // Es wird geprüft ob die benötigten Datenbanken vorhanden sind
            tx_db.all("select name from sqlite_master where type='table'", (err, tables) => {
                // Es wird geprüft ob ein Fehler aufgetreten ist
                if(err) {
                    console.log(err);
                    return;
                }

                // Es wird geprüft ob die Tabelle vorhanden ist
                if(tables.map((value) => value.name).includes('utxos') !== true) {
                    // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                    // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                    if(chain_state !== null) {
                        console.log('INVALID_BLOCKCHAIN');
                        return;
                    }

                    // Die Tabelle wird erstellt
                    tx_db.run('CREATE TABLE "utxos" ("id" INTEGER, "txid" BLOB, "hight"	INTEGER, "reciver_address" BLOB, "amount" TEXT, PRIMARY KEY("id" AUTOINCREMENT));', (error) => {
                        // Es wird geprüft ob der Block korrekt ist
                        if(error) {
                            console.log(error);
                            return;
                        }

                        // Die Blockchain DB wird überprüft
                        ___verify_blocks();
                    });
                }
                else {
                    // Die Blockchain DB wird überprüft
                    ___verify_blocks();
                }
            });
        });

        // Es wird geprüft ob die Datenbank Objekte geladen wurden
        if(this.block_db === null || this.tx_db === null) {
            console.log('UNKOWN_INTERNAL_ERROR');
            return;
        }

        // Es wird geprüft ob ein Fehler aufgetreten ist
        if(typeof nblock_result !== 'boolean') {
            console.log(nblock_result);
            return;
        }

        // Es wird geprüft ob eine neue Blockchain erstellt wurde, wenn nicht wird der Aktuelle Block geladen
        if(nblock_result === false) {
            // Der Aktuelle Block wird aus der Datenbank abgerufen
            if((await this.loadBlockFromDatabaseByBlockHash(chain_state.current_block.toString('hex'))) !== true) {
                // Es ist ein Fehler aufgetreten
                console.log('ERROR_BY_LOADING_DATABASE');
                return;
            }

            // Es wird geprüft ob der Hash des Aktuellen Blocks mit dem Block aus der Chainstate übereinstimmt
            if(chain_state.current_block.toString('hex') !== this.current_block.blockHash(false)) {
                console.log('INVALID_CHAIN_STATE_LOADED');
                return false;
            }
        }

        // Die Aktuelle Blockhöhe wird abgerufen und abgespeichert
        this.current_block_hight = await this.#currentBlockHight();

        // Es wird geprüft ob die Blöckhöhe übereinstimmt
        if(this.current_block_hight !== this.current_block.coinbaseBlockHight()) {
            console.log('ERROR_INVALID_DATABASE');
            return;
        }

        // Gibt die Daten zurück
        console.log('Blockchain loaded:', this.current_block.blockHash(true), this.current_block_hight);
        return true;
    };

    // Wird verwendet um einen neuen Block hinzuzufügen
    async addBlock(...blockData) {
        // Die Blockdaten werden verabeitet
        for await(const otem of blockData) {
            // Es wird geprüft ob der Block bereits in der Datenbank vorhanden ist
            let is_invaited = await this.#isAlwaysInDatabase(otem.blockHash(false));
            if(is_invaited === true) { console.log('IGNORE_BLOCK_IS_ALWAYS_IN_DATABASE'); return; }

            // Es wird versucht den PreviosBlock abzurufen
            try{ var responded_block = await this.#loadBlockFromDatabase(otem.prv_block_hash); }
            catch(e) { console.log('IGNORE_BLOCK_UNKOWN_PREVIOUS_BLOCK', e); continue; }

            // Es wird geprüft ob der Block welcher Hinzugefügt werden soll eine Blocknummer größer als der Aktuelle Block ist
            if(responded_block.coinbaseBlockHight() + 1 !== otem.coinbaseBlockHight()) {
                console.log('INVALID_BLOCK_HIGHT', responded_block.coinbaseBlockHight(), otem.coinbaseBlockHight());
                return;
            }

            // Gibt die Daten an, welche in die Datenbank geschrieben werden sollen
            let total_inner = [otem.prv_block_hash, 'sha256d_pow', otem.blockHash(false), otem.txDbHeaderElement(), otem.txDbElement()];

            // Die Daten werden in die Datenbank geschrieben
            await new Promise((resolveOuter, reject) => {
                this.block_db.run('INSERT INTO blocks(prev_hash, type, block_hash, pre_header, transactions) VALUES(?, ?, ?, ?, ?)', total_inner, (err) => {
                    if(err) { reject(err.message); return; }
                    resolveOuter();
                });
            });

            // Die Aktuelle Blockhöhe sowie der Aktuelle Block werden Aktualisiert, sofern der Block neue als der letzet Block ist
            if(this.current_block.coinbaseBlockHight() +1 === otem.coinbaseBlockHight()) {
                this.current_block_hight = otem.coinbaseBlockHight();
                this.current_block = otem;
            }
        };

        // Die Chainstate wird geupdated
        await this.updateChainState();
    };

    // Gibt den Aktuellen Block aus
    getCurrentBlock() {
        return this.current_block;
    };

    // Gibt die Aktuelle Blockhöhe aus
    getCurrentBlockHight() {
        return this.current_block_hight;
    };

    // Gibt den Aktuellen Block sowie die Block Höhe aus
    getCurrentBlockAndHight() {
        return {
            block:this.current_block,
            hight:this.current_block_hight
        }
    };
}


// Die Klasse wird exportiert
module.exports = BlockcahinDatabase;