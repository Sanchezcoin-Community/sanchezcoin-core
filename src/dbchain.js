const { ramSwiftyHash, sha256dBTC } = require('./hash_algo');
const { byteListToObjectList } = require('./utils');
const sqlite3 = require('sqlite3').verbose();
const { PoWBlock } = require('./block');
const bigInt = require("big-integer");
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

        // Speichert die Aktuelle Blockeinstellungen ab
        this.c_chain_state = {
            c_hight:0,
            c_block:genesis_block.blockHash(false),
        };

        // Speichert den Aktuelle Path der Dateien ab
        this.blocks_db_file = null;
        this.utxo_db_file = null;
        this.chain_state_file = null;

        // Speichert die Aktuelle Datenbank ab
        this.block_db = null;
        this.nft_db = null;
        this.tx_db = null;
    };

    // Gibt an ob das UTXO bereits ausgegeben wurde
    async getUnspentUtxo(txid, utxo_hight) {

    };

    // wird verwendet um die Chainstate auf den Aktuellen Stnad zu updaten
    async #updateChainState() {
        // Der Hash der Blockdatenbank wird erzeugt
        let block_file_h = await new Promise((resolveOuter) => {
            var fd = fs.createReadStream('database/blocks.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        });

        // Der Hahs der Transaktionsdatenbank wird erstellt
        let txdb_file_h = await new Promise((resolveOuter) => {
            var fd = fs.createReadStream('database/txdb.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        });

        // Der Hash der NFT Datenbank wird erstellt
        let nft_file_h = await new Promise((resolveOuter) => {
            var fd = fs.createReadStream('database/nftdb.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        });

        // Die Chainsate wird angepasst
        let new_chain_state = {
            config:this.c_chain_state,
            tx_db:Buffer.from(txdb_file_h, 'hex'),
            block_db:Buffer.from(block_file_h, 'hex'),
            nft_db:Buffer.from(nft_file_h, 'hex')
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

    // Wird verwendet um einen Block in die Datenbank zu schreiben
    async #WriteBlockToDb(block_obj, block_no, active) {
        // Gibt die Daten an, welche in die Datenbank geschrieben werden sollen
        let total_inner = [block_obj.prv_block_hash, block_obj.algorithmName(), block_obj.blockHash(false), block_obj.dbHeaderElement(), block_obj.txIdDbElement(), block_no, ((active === true)? 1: 0)];

        // Der Block wird in die Datenbank geschrieben
        let writed_block_id = await new Promise((resolveOuter, reject) => {
            this.block_db.run('INSERT INTO blocks(prev_hash, type, block_hash, pre_header, transactions, hight, active) VALUES(?, ?, ?, ?, ?, ?, ?)', total_inner, function(err)  {
                if(err) { reject(err.message); return; }
                resolveOuter(this.lastID);
            });
        });

        // Die ID des geschriebenen Blocks wird zurückgegeben
        return writed_block_id;
    };

    // Wird verwendet um eine Transaktion in die Datenbank zu schreiben
    async #WriteTxToDb(block_id, block_no, active_txn, ...txitem) {
        // Wird als Funktion verwendet um die Basisdaten der Transaktionen in die Datenbank zu schreiben
        const write_tx_obj = async(tx_obj) => {

        };

        // Die Transaktionen werden der Datenbank hinzugefügt, sofern diese nicht schon vorhanden sind
        for await(const otem of txitem) {
            let tx_base = await write_tx_obj(otem);
            if(tx_base === true) return false;
        };

        // Der Vorgang wurde erfolgreich durchgeführt
        return true;
    };

    // Wird verwendet um eine Transaktion aus der Datenbank abzurufen
    async #FetchTxFromDB(tx_hash, block_hash=null, block_no=null) {

    };

    // Wird verwendet um die Höhe der Blockchain anhand der PreviousBlockID zu ermitteln
    async cleanedBlockHight() {
        // Es wird eine Anfrage an die Datenbank gestellt um die Aktuelle Blockhöhe zu ermitteln
        let current_block_hight = await new Promise((resolved, reject) => {
            // Es wird eine Anfrage an die Datenbank gestellt um den Block abzurufen
            this.block_db.get(`SELECT COUNT(DISTINCT prev_hash) as total_blocks FROM blocks;`, (err, row) => {
                resolved(row.total_blocks);
            });
        });

        // Die Anzahl der Gesamtwerte wird zurückgegeben
        return bigInt(current_block_hight);
    };

    // Wird verwendet um einen Eintrag aus der Datenbank zu laden
    async loadBlockFromDatabase(blockHash) {
        // Es wird geprüft ob es sich um den Genesisblock handelt
        if(this.genesis_block.blockHash(false) === blockHash) return { block:this.genesis_block, hight:bigInt("0") };

        // Der Block wird abgerufen
        let result = await new Promise((resolved, reject) => {
            // Es wird eine Anfrage an die Datenbank gestellt um den Block abzurufen
            this.block_db.all(`SELECT prev_hash, type, block_hash, pre_header, transactions, hight from blocks WHERE block_hash = '${blockHash}' LIMIT 1`, (err, row) => {
                // Es wird geprüft ob beim Abrufen des Blocks ein Fehler aufgetreten ist
                if(err !== null) { throw new Error(err); }

                // Es wird geprüft ob genau 1 Eintrag zugegeben wurde
                if(row.length !== 1) { reject(false); return; }

                // Es wird geprüft ob der Blockhash mit dem gesuchten Hash übereinstimmt
                const fBlock = row[0];
                if(fBlock.block_hash !== `${blockHash}`) { throw new Error('INVALID_BLOCK_DB_RESULT'); }

                // Die Einzelenen Transaktionen werden geladen
                let tx_list = byteListToObjectList(fBlock.transactions), full_fetched_txns = [];
                for(const otem of tx_list) {
                    // Die Ausgewählte Transaktion wird aus der Datenbank abgerufen

                };

                // Es wird geprüft ob es sich um eien PoW Block handelt
                if(fBlock.type === 'sha256d_pow') {
                    // Es wird versucht den Block zu Rekonstruieren
                    const reconstructed_by_block_hash = PoWBlock.loadFromDbElements(fBlock.prev_hash, sha256dBTC, fBlock.transactions, fBlock.pre_header);

                    // Der Hash des Blocks wird mit dem Hash des Gesuchten Blocks verglichen
                    if(blockHash !== reconstructed_by_block_hash.blockHash(false)) throw new Error('REBUILDED_BLOCK_IS_INVALID');

                    // Der Block wird zurückgegeben
                    resolved({ block:reconstructed_by_block_hash, hight:bigInt(fBlock.hight) });
                    return;
                }
                else if(fBlock.type === 'swiftyh256_pow') {
                    // Es wird versucht den Block zu Rekonstruieren
                    const reconstructed_by_block_hash = PoWBlock.loadFromDbElements(fBlock.prev_hash, ramSwiftyHash, fBlock.transactions, fBlock.pre_header);

                    // Der Hash des Blocks wird mit dem Hash des Gesuchten Blocks verglichen
                    if(blockHash !== reconstructed_by_block_hash.blockHash(false)) throw new Error('REBUILDED_BLOCK_IS_INVALID');

                    // Der Block wird zurückgegeben
                    resolved({ block:reconstructed_by_block_hash, hight:bigInt(fBlock.hight) });
                    return;
                }
                else {
                    throw new Error('UNKOWN_INVALID_BLOCK_CONSENSUS');
                }
            });
        });

        // Die Daten werden zurückgegeben
        return result;
    };

    // Wird verwendet um zu überprüfen ob der Block bereits hinzugefügt wurde
    async isAlwaysInDatabase(blockHash) {
        try{ var result = await this.loadBlockFromDatabase(blockHash); }
        catch(e) { return false; }
        if(result === false) return false;
        return true;
    };

    // Gibt alle Blöcke aus, für die es mehrere Nachfolger gibt
    async getPreviousOrphanBlocks() {
        return [];
    };

    // Lädt die Datenbank
    async loadDatabase(blockahin_db_path) {
        // Speichert die Prüfwerte der Datenbanken ab
        let local_chsum_blocks = null, local_chsum_txdb = null, local_chsum_nftdb = null;

        // Gibt an ob die Datenbanken geladen wurde
        let avail_blocks_db = false, avail_tx_db = false, avail_nft_db = false;

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

        // Erstellt einen Hash aus der NftDB Datei
        const ___hash_nftdb_file = async (safe=true) => {
            let resolved = await new Promise((resolveOuter) => {
                var fd = fs.createReadStream('database/nftdb.db');
                var hash = crypto.createHash('sha1');
                hash.setEncoding('hex');
                fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
                fd.pipe(hash);
            });
            if(safe === true) local_chsum_nftdb = resolved;
        };

        // Es wird geprüft ob die Chainsate Datei vorhanden ist
        if(fs.existsSync('database/chain.state')) chain_state = await new Promise((resolveOuter) => {
            fs.readFile('database/chain.state', (status, fd) => {
                // Es wird geprüft ob die Datei erfolgreeich geladen wurde
                if (status) {
                    console.log(status.message);
                    return;
                }

                // Es wird versucht die Datei mittels CBOR zu Dekodierren
                let decoded = cbor.decode(fd);

                // Die Aktuelle Chainstate wird Extrahiert
                this.c_chain_state = decoded.config;

                // Info text
                console.log('Loading Blockchain databases...');

                // Der Vorgang wurde erfolgreich durchgeführt
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

        // Es wird geprüft ob die NFT Datenbank vorhanden ist
        if(fs.existsSync('database/nftdb.db')) {
            // Es wird Signalisiert dass eine Transaktionsdatenbank vorhanden ist
            avail_nft_db = true;

            // Es wird geprüft ob die Chainstate geladen wurde
            if(chain_state !== null) {
                // Es wird ein Hash aus der Transaktionsdatenbank erstellt
                await ___hash_nftdb_file(); 
            }
        }

        // Es wird geprüft ob die Chainstate Datei korrekt ist, wenn nicht wird ein Exception ausgelöst
        if((avail_blocks_db == true || avail_tx_db === true) && chain_state === null) {
            // Wenn die Blocks Daten vorhanden sind werden diese Gelöscht
            if(avail_blocks_db === true) fs.unlinkSync('database/blocks.db');

            // Wenn die TxDB vorhanden ist, wird diese gelöscht
            if(avail_tx_db === true) fs.unlinkSync('database/txdb.db')

            // Wenn die NftDB vorhanden ist, wird diese gelöscht
            if(avail_nft_db === true) fs.unlinkSync('database/nftdb.db')

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
                console.log('Blocks Database speedcheck ok', local_chsum_blocks);
            }

            // Es wird geprüft ob die Daten der Transaktionsdaten korrekt sind
            if(local_chsum_txdb !== null) {
                if(local_chsum_txdb !== chain_state.tx_db.toString('hex')) {
                    console.log('Invalid blockchaind data, TX_DB');
                    return;
                }
                console.log('Transactions Database speedcheck ok', local_chsum_txdb);
            }

            // Es wird geprüft ob die Daten der Nft Datenbank korrekt sind
            if(local_chsum_nftdb !== null) {
                if(local_chsum_nftdb !== chain_state.nft_db.toString('hex')) {
                    console.log('Invalid blockchaind data, NFT_DB');
                    return;
                }
                console.log('NFT Database speedcheck ok', local_chsum_nftdb);
            }
        }

        // Die Blockdatenbank wird geladen
        let block_db = null, tx_db = null, nft_db = null;
        try{ block_db = new sqlite3.Database('database/blocks.db'); }
        catch(e) { console.log(e); return; }

        // Die Transaktionsdatenbank wird geladen
        try { tx_db = new sqlite3.Database('database/txdb.db'); }
        catch(e) { console.log(e); return; }

        // Die Nft Datenbank wird geladen
        try { nft_db = new sqlite3.Database('database/nftdb.db'); }
        catch(e) { console.log(e); return; }

        // Der Vorgang wird Asynchron ausgeführt
        let new_db_writed = await new Promise((resolveOuter) => {
            // Wird ausgeführt wenn der Vorgang final fertigestellt wurde
            const ___totalf_finally = (newBlockCh) => {
                this.block_db = block_db;
                this.nft_db = nft_db;
                this.tx_db = tx_db;
                resolveOuter(newBlockCh);
            };

            // Wird verwendet um einen ChainReork durchzuführen
            const ___finally = () => {
                // Es wird geprüft ob die Chainstate Vorhanden ist, wenn nicht wird sie erzeugt
                if(chain_state === null) this.#updateChainState().then((e) => {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(e !== true) { console.log(e); return; }

                    // Der Vorgang wurde erfolgreich geladen
                    ___totalf_finally(true);
                })
                else ___totalf_finally(false);
            };

            // Wird verwendet um die NFT Datenbank zu überprüfen
            const ___verfiy_nft_db = () => {
                // Es wird geprüft ob die benötigten Datenbanken vorhanden sind
                nft_db.all("select name from sqlite_master where type='table'", function (err, tables) {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(err) {
                        console.log(err);
                        return;
                    }

                    // Es wird geprüft ob der Eintrag vorhanden ist
                    if(tables.map((value) => value.name).includes('nfts') !== true) {
                        // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                        // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                        if(chain_state !== null) {
                            console.log('INVALID_BLOCKCHAIN');
                            return;
                        }

                        // Die Tabelle für die Blöcke wird erstellt
                        nft_db.run('CREATE TABLE "nfts" ( "id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "txid" INTEGER, "type" TEXT, "commitment_hash" TEXT, "data" REAL, PRIMARY KEY("id" AUTOINCREMENT) );', (error) => {
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

            // Wird verwendet um zu überprüfen ob die Transaktionsdatenbank korrekt ist
            const ___verify_block_db = () => {
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

                        // Die Tabelle für die Blöcke wird erstellt
                        block_db.run('CREATE TABLE "blocks" ("block_id" INTEGER UNIQUE, "hight" INTEGER, "active" INTEGER, "prev_hash" BLOB, "type" TEXT, "block_hash" BLOB, "pre_header" BLOB, "transactions" BLOB, PRIMARY KEY("block_id" AUTOINCREMENT));', (error) => {
                            // Es wird geprüft ob der Block korrekt ist
                            if(error) {
                                console.log(error);
                                return;
                            }

                            // Der Nächste Schritt wird ausgeführt
                            ___verfiy_nft_db();
                        });
                    }
                    else {
                        // Der Nächste Schritt wird ausgeführt
                        ___verfiy_nft_db();
                    }
                });
            };

            // Wird verwendet um zu überprüfen ob die Ausgangstabelle in der Transaktionsdatenbank vorhadnen vorhanden ist
            const ___verify_txdb_output_db = () => {
                tx_db.all("select name from sqlite_master where type='table'", (err, tables) => {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(err) {
                        console.log(err);
                        return;
                    }
    
                    // Es wird geprüft ob die Tabelle vorhanden ist
                    if(tables.map((value) => value.name).includes('outputs') !== true) {
                        // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                        // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                        if(chain_state !== null) {
                            console.log('INVALID_BLOCKCHAIN');
                            return;
                        }
    
                        // Die Tabelle wird erstellt
                        tx_db.run('CREATE TABLE "outputs" ( "id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "tx_id" INTEGER, "type" TEXT, "coin_transfer" INTEGER, "is_spendlabel" INTEGER, "is_burnt" INTEGER, "reciver_is_hash" INTEGER, "reciver_is_pkey" INTEGER, "fully_reciver_data" TEXT, "is_minting_commitment" INTEGER, "n_block_time" INTEGER, "n_unix_lock_time" INTEGER, "retampted_commitment" INTEGER, "nft_db_id" INTEGER, "hexed_amount" TEXT, "data" BLOB, PRIMARY KEY("id" AUTOINCREMENT) );', (error) => {
                            // Es wird geprüft ob der Block korrekt ist
                            if(error) {
                                console.log(error);
                                return;
                            }
    
                            // Die Blockchain DB wird überprüft
                            ___verify_block_db();
                        });
                    }
                    else {
                        // Die Blockchain DB wird überprüft
                        ___verify_block_db();
                    }
                });
            };

            // Wird verwendet um zu überprüfen ob die Transaktionsdatenbank die Eingänge Tabelle enthält
            const ___verify_txdb_input_db = () => {
                tx_db.all("select name from sqlite_master where type='table'", (err, tables) => {
                    // Es wird geprüft ob ein Fehler aufgetreten ist
                    if(err) {
                        console.log(err);
                        return;
                    }
    
                    // Es wird geprüft ob die Tabelle vorhanden ist
                    if(tables.map((value) => value.name).includes('inputs') !== true) {
                        // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                        // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                        if(chain_state !== null) {
                            console.log('INVALID_BLOCKCHAIN');
                            return;
                        }
    
                        // Die Tabelle wird erstellt
                        tx_db.run('CREATE TABLE "inputs" ( "id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "tx_id" INTEGER, "type" TEXT, "coin_transfer" INTEGER, "token_transfer" INTEGER, "vout_txid" INTEGER, "vout_hight" INTEGER, "nft_db_id" INTEGER, PRIMARY KEY("id" AUTOINCREMENT) );', (error) => {
                            // Es wird geprüft ob der Block korrekt ist
                            if(error) {
                                console.log(error);
                                return;
                            }
    
                            // Die Blockchain DB wird überprüft
                            ___verify_txdb_output_db();
                        });
                    }
                    else {
                        // Die Blockchain DB wird überprüft
                        ___verify_txdb_output_db();
                    }
                });
            };

            // Es wird geprüft ob die Transaktionsdatendank die Transaktions Roots Tabelle enthält
            tx_db.all("select name from sqlite_master where type='table'", (err, tables) => {
                // Es wird geprüft ob ein Fehler aufgetreten ist
                if(err) {
                    console.log(err);
                    return;
                }

                // Es wird geprüft ob die Tabelle vorhanden ist
                if(tables.map((value) => value.name).includes('txn_roots') !== true) {
                    // Es wird geprüft ob die Chainstate vorhanden ist, wenn ja wird der Vorgang mit einem Fehler abgebrochen
                    // an dieser Stelle in diesem Zustand darf die Chainstate nicht vorhanden sein!
                    if(chain_state !== null) {
                        console.log('INVALID_BLOCKCHAIN');
                        return;
                    }

                    // Die Tabelle wird erstellt
                    tx_db.run('CREATE TABLE "txn_roots" ("id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "txid" TEXT, "tx_hight" INTEGER, "type" TEXT, "signatures" TEXT, PRIMARY KEY("id" AUTOINCREMENT));', (error) => {
                        // Es wird geprüft ob der Block korrekt ist
                        if(error) {
                            console.log(error);
                            return;
                        }

                        // Die Blockchain DB wird überprüft
                        ___verify_txdb_input_db();
                    });
                }
                else {
                    // Die Blockchain DB wird überprüft
                    ___verify_txdb_input_db();
                }
            });
        });

        // Es wird geprüft ob eine neue Blockchain erstellt wurde, wenn ja werden die Transaktionen aus dem Genesisblock in die Datenbank geschrieben
        if(new_db_writed === true) {
            console.log('New BLockchain databases created');
            console.log('Gebesisblock add to database');
        }

        // Es wird geprüft ob die Datenbank Objekte geladen wurden
        if(this.block_db === null || this.tx_db === null || this.nft_db === null) {
            console.log('UNKOWN_INTERNAL_ERROR');
            return;
        }

        // Gibt die Daten zurück
        return true;
    };

    // Wird verwendet um einen neuen Block hinzuzufügen
    async addBlock(blockData, block_hight, active_block) {
        // Es wird geprüft ob der Block bereits in der Datenbank vorhanden ist
        let is_invaited = await this.isAlwaysInDatabase(blockData.blockHash(false));
        if(is_invaited === true) { return 'is_always_in_db'; }

        // Der Block wird geschrieben
        let writed_block_id = await this.#WriteBlockToDb(blockData, block_hight, active_block);

        // Die Transaktionen werde in die Datenbank geschrieben
        await this.#WriteTxToDb(writed_block_id, block_hight, active_block, ...blockData.transactions);

        // Die Chainstate wird geupdated
        await this.#updateChainState();

        // Der Vorgang wurde erfolgreich durchgeführt
        return true;
    };

    // Gibt den Aktuellen Blockhash aus der Chainstate aus
    async getChainStateLastBlock() {
        let last_block_by_c_state = await this.loadBlockFromDatabase(this.c_chain_state.c_block);
        return last_block_by_c_state;
    };

    // Schreibt den Aktuellen Block sowie die Akuelle Blockhöhe in die Datenbank
    async setChainStateLastBlock(block_hash, hight) {
        // Der Aktuelle Block, sowie die Aktuelle Blockhöhe werden geschrieben
        this.c_chain_state = { c_hight:hight, c_block:block_hash, };

        // Die Änderungen werden gespeichert
        await this.#updateChainState();
    };
}


// Die Klasse wird exportiert
module.exports = BlockcahinDatabase;