const { CoinbaseInput, DB_UnspentOutput, DB_UtxCoinOutput } = require('./utxos');
const { ramSwiftyHash, sha256dBTC } = require('./hash_algo');
const { DB_CoinbaseTransaction } = require('./transaction');
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

    // Wird verwendet um ein neues NFT der Datenbank hinzuzufügen
    async #WriteNftToDb(block_id, block_no, active_nft, mint_input, tx_id) {
        // Das NFT wird in die Datenbank geschrieben
        let nft_commitment_id = await new Promise((resolveOuter, reject) => {
            // Der Wert ob der Block Aktiv ist, wird umgewandelt
            let active_value = (active_nft === true) ? 1 : 0;

            // Die Daten werden vorbereitet
            let inner_data = [active_value, block_no, block_id, tx_id, "pnft", mint_input.getCommitmentImage(), mint_input.cborData()];

            // Die Werte werden geschrieben
            this.nft_db.run(`INSERT INTO "nfts" ("active", "block_no", "block_db_id", "txid", "type", "commitment_hash", "data") VALUES (?, ?, ?, ?, ? ,?, ?);`, inner_data, function(err)  {
                if(err) { reject(err.message); return; }
                resolveOuter(this.lastID);
            });
        });

        // Die Daten werden zurückgegeben
        return nft_commitment_id;
    };

    // Wird verwendet um die DBID eines NFTs abzurufen
    async #GetNftDBId(commitment_id) {

    };

    // Wird verwenet um die DBID einer Transaktion abzurufen
    async #GetTxDbId(tx_hash) {
        // Es wird versucht den Eintrag aus der Datenbank abzurufen
        let tx_id_result = await new Promise((resolveOuter, reject) => {
            this.tx_db.get(`SELECT id FROM txn_roots WHERE txid = '${tx_hash}' AND active = 1 LIMIT 1`, function(err, data)  {
                if(err) { reject(err.message); return; }
                resolveOuter(data.id);
            });
        });

        // Die ID wird zurückgegeben
        return tx_id_result;
    };

    // Wird verwendet um eine Transaktion aus der Datenbank abzurufen
    async #FetchTxFromDB(tx_hash, current_block_hight=null) {
        // Die Aktuelle Block Höhe wird abgerufen
        let cblock_hight = null;
        if(current_block_hight === null) cblock_hight = await this.cleanedBlockHight();
        else cblock_hight = current_block_hight;

        // Der Transaktionsheader wird abgerufen
        let tx_header_data = await new Promise((resolveOuter, reject) => {
            this.tx_db.get(`SELECT id, txid, block_no, tx_hight, type, signatures FROM txn_roots WHERE txid = '${tx_hash.toLowerCase()}' AND active = 1 LIMIT 1`, function(err, data)  {
                if(err) { reject(err.message); return; }
                resolveOuter(data);
            });
        });

        // Die Anzahl der bestätigungen wird ermittelt
        let confirmations = bigInt(cblock_hight - tx_header_data.block_no).add("1");

        // Es wird geprüft ob eine Transaktion abgerufen werden konnte
        if(tx_header_data === null) throw new Error('Unkown transaction retrived from db');

        // Es wird geprüft ob die abgerufen TransaktionsID mit der Angeforderten ID übereinstimmt
        if(tx_header_data.txid.toLowerCase() !== tx_hash.toLowerCase()) throw new Error('Unkown db error');

        // Es wird geprüft ob es sich um einen gültigen Transaktionstypen handelt
        if(tx_header_data.type === undefined || tx_header_data.type === null || typeof tx_header_data.type !== 'string') throw new Error('Invalid return from database')
        if(tx_header_data.type.toLowerCase() !== 'cb') throw new Error('Unkown transaction type retrived from db');

        // Die Eingänge werden abgerufen
        let tx_inputs = await new Promise((resolveOuter, reject) => {
            this.tx_db.all(`SELECT t.txid, i.block_no, i.type, i.tx_id, i.coin_transfer, i.token_transfer, i.vout_txid, i.vout_hight, i.nft_db_id, i.hight FROM inputs i LEFT JOIN txn_roots t ON t.id = i.tx_id WHERE i.tx_id = ${tx_header_data.id} AND i.active = 1 ORDER BY i.hight ASC;`, function(err, data)  {
                if(err) { reject(err.message); return; }

                // Es wird versucht alle Eingänge wieder in ein Objekt umzuwandelnt
                let reconstructed_inputs = [], c_item_hight = 0;
                for(const otem of data) {
                    // Es wird geprüft ob die Transaktionsid übereinstimmt
                    if(otem.txid.toLowerCase() !== tx_hash.toLowerCase()) throw new Error('Internal db error');

                    // Es wird geprüft ob die Höhe er eingabe übereinstimmt
                    if(c_item_hight !== otem.hight) throw new Error('Invalid database');

                    // Es wird geprüft ob der Objekttyp korrekt ist
                    if(otem.type.toLowerCase() === 'cb') {
                        reconstructed_inputs.push(new CoinbaseInput())
                    }
                    else {
                        throw new Error('Invalid return');
                    }

                    // Es wird eine Runde hochgezählt
                    c_item_hight += 1;
                };

                // Die Eingänge werden zurückgegeben
                resolveOuter(reconstructed_inputs);
            });
        });

        // Es wird geprüft ob Mindestens 1 Input abgerufen wurde
        if(tx_inputs.length < 1) throw new Error('Unkown internal db error');

        // Die Ausgänge werden abgerufen
        let tx_outputs = await new Promise((resolveOuter, reject) => {
            // Die Anfrage wird verarbeitet
            let pre_cmd = `\
            SELECT t.txid, o.active, o.block_no, o.block_db_id, o.hight, o.tx_id, o.type, o.coin_transfer, o.token_transfer, o.is_spendlabel, o.is_burnt, o.reciver_is_hash, o.reciver_is_pkey, o.fully_reciver_data, o.is_minting_commitment, o.crypto_algo, o.n_block_time, o.n_unix_lock_time, o.nft_db_id, o.hexed_amount, o.data,
            IIF(coin_transfer = 1, (
                    SELECT COUNT(*) FROM inputs ins WHERE ins.vout_txid = o.tx_id AND ins.vout_hight = o.hight AND ins.active = 1
            ), NULL ) spend_count
            FROM outputs o LEFT JOIN txn_roots t 
            ON t.id = o.tx_id 
            WHERE o.tx_id = ${tx_header_data.id} AND o.active = 1 ORDER BY o.hight ASC;`

            // Die Anfrage wird an die Datenbank gestellt
            this.tx_db.all(pre_cmd, function(err, data)  {
                if(err) { reject(err.message); return; }

                // Es wird versucht alle Ausgänge wieder in ein Objekt umzuwandelnt
                let reconstructed_outputs = [], c_item_hight = 0;
                for(const otem of data) {
                    // Es wird geprüft ob die Transaktionsid übereinstimmt
                    if(otem.txid.toLowerCase() !== tx_hash.toLowerCase()) throw new Error('Internal db error');

                    // Es wird geprüft ob die Höhe er eingabe übereinstimmt
                    if(c_item_hight !== otem.hight) throw new Error('Invalid database');

                    // Es wird geprüft um was für einen Typen es sich handelt
                    if(otem.type === 'utxo') {
                        // Es wird geprüft ob es sich um eine Ausgabefähige Coin Transaktion handelt
                        if(otem.coin_transfer !== 1 || otem.is_spendlabel !== 1 || otem.reciver_is_hash !== 1) throw new Error('Invalid unspent output retrived from db');

                        // Es wird geprüft ob die benötigten Daten vorhanden sind
                        if(otem.fully_reciver_data === null) throw new Error('Invalid unspent output retrived from db');
                        if(otem.n_unix_lock_time === null) throw new Error('Invalid unspent output retrived from db');
                        if(otem.n_block_time === null) throw new Error('Invalid unspent output retrived from db');
                        if(otem.hexed_amount === null) throw new Error('Invalid unspent output retrived from db');

                        // Es wird ermittelt ob die Transaktion anhand der Blöcke gesperrt werden soll
                        let block_locked = false;
                        if(bigInt(otem.n_block_time, 16).greater(bigInt("0")) === true) {
                            // Die Transaktion wird gesperrt, sie wird entsperrt wenn die Blockanzahl erreich wurde
                            block_locked = true;

                            // Es wird geprüft ob die Anzahl der Benötigten Blöcke erreicht wurde um die Transaktion freizuschalten
                            if(confirmations.greaterOrEquals(bigInt(otem.n_block_time, 16)) === true) block_locked = false;
                        };

                        // Es wird geprüft ob ein Zeitwert vorhanden ist
                        let time_locked = false;
                        if(bigInt(otem.n_unix_lock_time, 16).greater(bigInt("0")) === true) {
                            // Die Transaktion wird gesperrt bis die Angegebene Zeit erreicht wurde
                            time_locked = true;

                            // Es wird geprüft ob die Zeit erreicht wurde
                            if(bigInt(new Date().getTime()).greaterOrEquals(bigInt(otem.n_unix_lock_time, 16)) === true) time_locked = false;
                        };

                        // Das UnspentOutput Objekt wird gebaut
                        let reconstructed_output = new DB_UnspentOutput(otem.fully_reciver_data, bigInt(otem.hexed_amount, 16), bigInt(otem.n_block_time, 16), bigInt(otem.n_unix_lock_time, 16), (time_locked === true || block_locked === true ? true : false), otem.spend_count);

                        // Das Objekt wird hinzugefügt
                        reconstructed_outputs.push(reconstructed_output);
                    }
                    else {
                        throw new Error('Unkown return from db');
                    }

                    // Es wird eine Runde hochgezählt
                    c_item_hight += 1;
                };

                // Die Daten werden zurückgegeben
                resolveOuter(reconstructed_outputs);
            });
        });

        // Es wird geprüft ob Mindestens 1 Ausgang abgerufen wurde
        if(tx_outputs.length < 1) throw new Error('Unkown internal db error');

        // Das Transaktionsobjekt wird wirderzusammengebaut
        if(tx_header_data.type === 'cb') {
            // Das Objekt wird zusammengebaut
            let reconstructed_transaction = new DB_CoinbaseTransaction(bigInt(tx_header_data.block_no), tx_inputs, tx_outputs, confirmations);

            // Es wird geprüft ob der Hash der Transaktion mit dem Hash der Angeforderten Transaktion überinstimmt
            if(reconstructed_transaction.computeHash().toLowerCase() !== tx_hash.toLowerCase()) throw new Error('Invalid transaction form database fetched');

            // Das Objekt wird zurückgegben
            return reconstructed_transaction;
        }
        else {
            throw new Error('Unkown db exception');
        }
    };

    // Wird verwendet um eine Transaktion in die Datenbank zu schreiben
    async #WriteTxToDb(block_id, block_no, active_txn, ...txitem) {
        // Speichert alle Nfts ab, welcher in der Aktuellen Transaktion erzeugt oder verwendet wurden
        let tx_genused_nfs = { };

        // Wird verwendet um die Eingänge in die Datenbank zu schreiben
        const write_tx_inputs = async(tx_db_id, hight, input) => {
            if(input.constructor.name === 'TxInput') {
                await new Promise(async (resolveOuter, reject) => {
                    // Die TxDbId der Verwendeten Transaktion wird abgerufen
                    let tx_db_id = await this.#GetTxDbId(input.txId);

                    // Es wird geprüft ob die Transaktion abgerufen werden konnte
                    if(tx_db_id === null || tx_db_id === false) {
                        throw new Error('Invalid ')
                    }

                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Die Daten werden vorbereitet
                    let inner_data = [active_value, block_no, block_id, hight, tx_db_id, 1, 0, tx_db_id, input.outputHight];

                    // Die Werte werden geschrieben
                    this.tx_db.run(`INSERT INTO "inputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "token_transfer", "vout_txid", "vout_hight") VALUES (?, ?, ?, ?, ?, 'txin', ?, ?, ?, ?);`, inner_data, function(err)  {
                        if(err) { reject(err.message); return; }
                        resolveOuter();
                    });
                });
            }
            else if(input.constructor.name === 'CoinbaseInput') {
                await new Promise((resolveOuter, reject) => {
                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Die Daten werden vorbereitet
                    let inner_data = [active_value, block_no, block_id, hight, tx_db_id, 'cb', 1, 0];

                    // Die Werte werden geschrieben
                    this.tx_db.run(`INSERT INTO "inputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "token_transfer") VALUES (?, ?, ?, ?, ?, ?, ?, ?);`, inner_data, function(err)  {
                        if(err) { reject(err.message); return; }
                        resolveOuter();
                    });
                });
            }
            else if(input.constructor.name === 'MintNftInput') {
                // Die DB-ID der Verwendeten Ausgabe wird ermittelt
                let tx_db_id = await this.#GetTxDbId(input.txId);

                // Es wird geprüft ob die Transaktion abgerufen werden konnte
                if(tx_db_id === null || tx_db_id === false) {
                    throw new Error('Invalid ')
                }

                // Es wird versucht das NFT in der Datenbank anzulegen
                let nft_db_write_result_id = await this.#WriteNftToDb(block_id, block_no, active_txn, input, tx_db_id);

                // Es wird geprüft ob das NFT Erfolgreich in die Datenbank geschrieben werden konnte
                if(nft_db_write_result_id === undefined || nft_db_write_result_id === null || nft_db_write_result_id === false) {
                    throw new Error('Unkown database error');
                }

                // Der Wert ob der Block Aktiv ist, wird umgewandelt
                let active_value = (active_txn === true) ? 1 : 0;

                // Die Daten werden vorbereitet
                let inner_data = [active_value, block_no, block_id, hight, tx_db_id, 'nftm', 0, 1, nft_db_write_result_id];

                // Die Werte werden geschrieben
                this.tx_db.run(`INSERT INTO "inputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "token_transfer", "nft_db_id") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, inner_data, function(err)  {
                    if(err) { reject(err.message); return; }

                    // Der Erzeugt NFT wird zwischengespeichert
                    tx_genused_nfs[input.getCommitmentImage()] = this.lastID;

                    // Der Vorgang wurde erfolgreich durcheführt
                    resolveOuter();
                });
            }
            else if(input.constructor.name === 'NftTxInput') {
                
            }
            else {
                throw new Error('Unkown transaction input type');
            }
        };

        // Wird verwendet um die Ausgänge in die Datenbank zu schreiben
        const write_tx_outputs = async(tx_db_id, hight, output) => {
            if(output.constructor.name === 'UnspentOutput') {
                await new Promise((resolveOuter, reject) => {
                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Es wird geprüft ob eine BlockID angegeben wurde
                    let inner_data = [active_value, block_no, block_id, hight, tx_db_id, 'utxo', 1, 0, 1, 0, 0, 1, 0, output.reciver_address_hash, output.bLockTime.toString(16), output.dtLockTime.toString(16), output.amount.toString(16)];

                    // Die Werte werden geschrieben
                    this.tx_db.run(`INSERT INTO "outputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "token_transfer", "is_spendlabel", "is_burnt", "is_minting_commitment", "reciver_is_hash", "reciver_is_pkey", "fully_reciver_data", "n_block_time", "n_unix_lock_time", "hexed_amount") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, inner_data, function(err)  {
                        if(err) { console.log(err); reject(err.message); return; }
                        resolveOuter();
                    });
                });
            }
            else if(output.constructor.name === 'UnspentPKeyOutput') {
                await new Promise((resolveOuter, reject) => {
                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Der Wert ob es sich um ein Minting Commitment handelt wird erzeugt
                    let is_minting_commitment = (output.is_minting_commitment === true) ? 1 : 0;

                    // Es wird geprüft ob eine BlockID angegeben wurde
                    let inner_data = [active_value, block_no, block_id, hight, tx_db_id, 'cb', 1, 0, 1, 0, is_minting_commitment, 0, 1, output.reciver_address, output.bLockTime.toString(16), output.dtLockTime.toString(16), output.amount.toString(16), output.cryp_algo];

                    // Die Werte werden geschrieben
                    this.tx_db.run(`INSERT INTO "outputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "token_transfer", "is_spendlabel", "is_burnt", "is_minting_commitment", "reciver_is_hash", "reciver_is_pkey", "fully_reciver_data", "n_block_time", "n_unix_lock_time", "hexed_amount", "crypto_algo") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, inner_data, function(err)  {
                        if(err) { console.log('A',err); reject(err.message); return; }
                        resolveOuter();
                    });
                });
            }
            else if(output.constructor.name === 'NftUnspentOutput') {
                
            }
            else if(output.constructor.name === 'NotSpendlabelMessageOutput') {
                await new Promise((resolveOuter, reject) => {
                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Bereitet die Daten vor welche Geschrieben werden sollen
                    let insert_data = [active_value, block_no, block_id, hight, tx_db_id, 'msgtxo', null, null, null, null, null, null, null, output.data];

                    // Die Werte werden geschrieben
                    this.tx_db.run(`INSERT INTO "outputs" ("active", "block_no", "block_db_id", "hight", "tx_id", "type", "coin_transfer", "coin_transfer", "is_spendlabel", "is_burnt", "reciver_is_hash", "reciver_is_pkey", "is_minting_commitment", "data") VALUES (?, ? ,?, ?, ?, ?, ?, ? ,?, ?, ?, ?, ?, ?);`, insert_data, function(err)  {
                        if(err) { reject(err.message); return; }
                        resolveOuter();
                    });
                });
            }
            else if(output.constructor.name === 'BurnNftOutput') {
                
            }
            else {
                throw new Error('Unkown transaction input type');
            }
        };

        // Wird als Funktion verwendet um die Basisdaten der Transaktionen in die Datenbank zu schreiben
        const write_tx_obj = async(hight, tx_obj) => {
            // Die Transaktion wird in die Datenbank geschrieben
            let writed_tx_id = await new Promise((resolveOuter, reject) => {
                // Es wird geprüft um was für einen Transaktionstypen es sich handelt
                if(tx_obj.constructor.name === 'CoinbaseTransaction') {
                    // Der Wert ob der Block Aktiv ist, wird umgewandelt
                    let active_value = (active_txn === true) ? 1 : 0;

                    // Es wird geprüft ob eine BlockID angegeben wurde
                    let c_value = null;
                    if(block_id !== null) c_value = `INSERT INTO "txn_roots" ("active", "block_no", "block_db_id", "txid", "tx_hight", "type") VALUES ('${active_value}', '${block_no}', '${block_id}', '${tx_obj.computeHash()}', '${hight}', 'cb');`;
                    else c_value = `INSERT INTO "txn_roots" ("active", "block_no", "txid", "tx_hight", "type") VALUES ('${active_value}', '${block_no}', '${tx_obj.computeHash()}', '${hight}', 'cb');`;

                    // Die Werte werden geschrieben
                    this.tx_db.run(c_value, function(err)  {
                        if(err) { reject(err.message); return; }
                        resolveOuter(this.lastID);
                    });
                }
                else {
                    throw new Error('Invalid transaction type');
                }
            });

            // Die Eingänge werden in die Datenbank geschrieben
            let input_hight = 0;
            for await(const input_item of tx_obj.inputs) {
                let wresult = await write_tx_inputs(writed_tx_id, input_hight, input_item);
                input_hight += 1;
            }

            // Es werden alle ausgänge in die Datenbank geschrieben
            let output_hight = 0;
            for await(const output_item of tx_obj.outputs) {
                let wresult = await write_tx_outputs(writed_tx_id, output_hight, output_item);
                output_hight += 1;
            };
        };

        // Die Transaktionen werden der Datenbank hinzugefügt, sofern diese nicht schon vorhanden sind
        let tHight = 0;
        for await(const otem of txitem) {
            let tx_base = await write_tx_obj(tHight, otem);
            if(tx_base === true) return false;
            tx_genused_nfs = {};
            tHight += 1;
        };

        // Der Vorgang wurde erfolgreich durchgeführt
        return true;
    };

    // Ruft alle nicht ausgeCoin Transaktionen für eine bestimmte Adresse
    async getUnspentCoinTransactions(address_hex_data, min_conf=1, max_conf=9999999, filter_locked=true) {
        // Die Aktuelle Blockhöhe wird abgerufen
        let c_block_hight = await this.cleanedBlockHight();

        // Die Anfrage wird vorbereitet
        let pre_cmd = `\
        SELECT o.block_no, o.n_block_time, o.n_unix_lock_time, o.hexed_amount, o.type, o.hight, t.txid, 
        IIF(coin_transfer = 1, (SELECT COUNT(*) FROM inputs ins WHERE ins.vout_txid = o.tx_id AND ins.vout_hight = o.hight AND ins.active = 1), NULL ) spend_count
        FROM outputs o
        LEFT JOIN txn_roots t
        ON t.id = o.tx_id
        WHERE o.fully_reciver_data = '${address_hex_data.toLowerCase()}' AND o.type = 'utxo' AND o.active = 1 AND spend_count = 0 ORDER BY o.hight ASC;`

        // Die Anfrage wird an die Datenbank übergeben
        let tx_data_results = await new Promise((resolveOuter, reject) => {
            this.tx_db.all(pre_cmd, function(err, data)  {
                if(err) { reject(err.message); return; }
                resolveOuter(data);
            });
        });

        // Die Einzelnen Transaktionen werden abgerufen
        let resolved_items = [];
        for await(const txitem of tx_data_results) {
            // Es wird geprüft ob es sich um ein UTXO handelt
            if(txitem.type !== 'utxo') throw new Error('Unkown database error');

            // Es wird geprüft ob die Sperrzeit für Blöcke vorhande ist
            if(txitem.n_block_time === null) throw new Error('Invalid block hight');

            // Es wird geprüft ob die Unix Zeit vorhanden ist
            if(txitem.n_unix_lock_time === null) throw new Error('Invalid unix timestamp');

            // Die Anzahl der Bestätigungen wird berechnet
            let confirmations = bigInt(c_block_hight).minus(bigInt(txitem.block_no)).add("1");

            // Es wird anhand der Blockhöhe geprüft, ob die Transaktion gesperrt ist
            let block_locked = false;
            if(bigInt(txitem.n_block_time, 16).greater(bigInt("0")) === true) {
                // Die Transaktion wird gesperrt, sie wird entsperrt wenn die Blockanzahl erreich wurde
                block_locked = true;

                // Es wird geprüft ob die Anzahl der Benötigten Blöcke erreicht wurde um die Transaktion freizuschalten
                if(confirmations.greaterOrEquals(bigInt(txitem.n_block_time, 16)) === true) block_locked = false;
            };

            // Es wird geprüft ob ein Zeitwert vorhanden ist
            let time_locked = false;
            if(bigInt(txitem.n_unix_lock_time, 16).greater(bigInt("0")) === true) {
                // Die Transaktion wird gesperrt bis die Angegebene Zeit erreicht wurde
                time_locked = true;

                // Es wird geprüft ob die Zeit erreicht wurde
                if(bigInt(new Date().getTime()).greaterOrEquals(bigInt(txitem.n_unix_lock_time, 16)) === true) time_locked = false;
            };

            // Es wird ermittelt ob der Ausgang Blockiert ist
            let is_locked = (time_locked === true || block_locked === true ? true : false);

            // Es wird geprüft ob der Ausgang herausgeiltert werden soll
            if(is_locked === true) if(filter_locked === true) continue;

            // Das DB_UtxCoinOutput wird erzeugt
            let new_utxo = new DB_UtxCoinOutput(bigInt(txitem.block_no), txitem.txid, txitem.hight, address_hex_data, bigInt(txitem.hexed_amount, 16), confirmations, bigInt(txitem.n_block_time, 16), bigInt(txitem.n_unix_lock_time, 16), is_locked, bigInt(txitem.spend_count));

            // Das Utxo wird zwischengespeichert
            resolved_items.push(new_utxo);
        };

        // Die ID wird zurückgegeben
        return resolved_items;
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

        // Die Aktuelle Blockhöhe wird abgerufen
        let current_block_hight = await this.cleanedBlockHight();

        // Der Block wird abgerufen
        let result = await new Promise((resolved, reject) => {
            // Es wird eine Anfrage an die Datenbank gestellt um den Block abzurufen
            this.block_db.all(`SELECT prev_hash, type, block_hash, pre_header, transactions, hight from blocks WHERE block_hash = '${blockHash}' LIMIT 1`, (err, row) => {
                // Es wird geprüft ob beim Abrufen des Blocks ein Fehler aufgetreten ist
                if(err !== null) { throw new Error(err); }

                // Speichert den Ersten und einzigen Eintrag ab
                let fBlock = row[0];

                // Es wird geprüft ob genau 1 Eintrag zugegeben wurde
                if(row.length !== 1) { reject(false); return; }

                // Es wird geprüft ob der Blockhash mit dem gesuchten Hash übereinstimmt
                if(fBlock.block_hash !== `${blockHash}`) { throw new Error('INVALID_BLOCK_DB_RESULT'); }

                // Die Einzelenen Transaktionen werden geladen
                let tx_list = byteListToObjectList(fBlock.transactions);

                // Die Daten werden zurückgegeben
                resolved({ ...row[0], transactions:tx_list });
            });
        });

        // Es wird Geprüft ob der Block abgerufen werden konnte
        if(result === undefined || result === null || result === false) {
            throw new Error('UNKOWN_BLOCK_DONT_IN_DATABASE');
        }

        // Es wird geprüft ob es sich um ein einen gültigen Block Typen handelt
        if(result.type !== 'sha256d_pow' && result.type !== 'swiftyh256_pow') throw new Error('UNKOWN_INVALID_BLOCK_CONSENSUS');

        // Die Einzelnen Transaktionen werden abgerufen
        let reconstructed_transactions = [];
        for await(const otem of result.transactions) {
            // Es wird versucht die Transaktion abzurufen
            let retrived_transactions = await this.#FetchTxFromDB(otem);

            // Es wird geprüft ob der Hash des Transaktionsobjektes mit dem Hash der Angefordert wurde übersintimmt
            if(retrived_transactions.computeHash().toLowerCase() !== otem.toLowerCase()) throw new Error('Invalid transaction retrived from db');

            // Das Objekt wird zwischegespeichert
            reconstructed_transactions.push(retrived_transactions);
        }

        // Es wird geprüft o
        if(result.type === 'sha256d_pow') {
            // Es wird versucht den Block zu Rekonstruieren
            const reconstructed_by_block_hash = PoWBlock.loadFromDbElements(result.prev_hash, sha256dBTC, reconstructed_transactions, result.pre_header);

            // Der Hash des Blocks wird mit dem Hash des Gesuchten Blocks verglichen
            if(blockHash !== reconstructed_by_block_hash.blockHash(false)) throw new Error('REBUILDED_BLOCK_IS_INVALID');

            // Der Block wird zurückgegeben
            return { block:reconstructed_by_block_hash, hight:bigInt(result.hight) };
        }
        else if(result.type === 'swiftyh256_pow') {
            // Es wird versucht den Block zu Rekonstruieren
            const reconstructed_by_block_hash = PoWBlock.loadFromDbElements(result.prev_hash, ramSwiftyHash, reconstructed_transactions, result.pre_header);

            // Der Hash des Blocks wird mit dem Hash des Gesuchten Blocks verglichen
            if(blockHash !== reconstructed_by_block_hash.blockHash(false)) throw new Error('REBUILDED_BLOCK_IS_INVALID');

            // Der Block wird zurückgegeben
            return { block:reconstructed_by_block_hash, hight:bigInt(result.hight) };
        }
        else {
            throw new Error('UNKOWN_INVALID_BLOCK_CONSENSUS');
        }
    };

    // Ruft einen Spiziellen Block anhand seiner Block Nummer ab
    async loadBlockFromDatabaseByHight(block_hight) {
        // Es wird geprüft ob es sich um den Genesis Block handelt
        if(block_hight === 0) {
            let retr_block = await this.loadBlockFromDatabase(this.genesis_block.blockHash(false));
            return retr_block;
        }

        // Der Block wird abgerufen
        let result = await new Promise((resolved, reject) => {
            this.block_db.get(`SELECT block_hash from blocks WHERE hight = ${block_hight} LIMIT 1`, (err, result) => {
                if(err !== null) { throw new Error(err); }
                resolved(result.block_hash)
            });
        });

        // Der Block wird anhand seines Hashes abgerufen
        let revl_block = await this.loadBlockFromDatabase(result);
        return revl_block;
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

            // Wird verwendet um zu überprüfen ob die Blockdatenbank korrekt ist
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
                        tx_db.run('CREATE TABLE "outputs" ( "id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "hight" INTEGER, "tx_id" INTEGER, "type" TEXT, "coin_transfer" INTEGER, "token_transfer" INTEGER, "is_spendlabel" INTEGER, "is_burnt" INTEGER, "reciver_is_hash" INTEGER, "reciver_is_pkey" INTEGER, "fully_reciver_data" TEXT, "is_minting_commitment" INTEGER, "crypto_algo" INTEGER, "n_block_time" INTEGER, "n_unix_lock_time" INTEGER, "nft_db_id" INTEGER, "hexed_amount" TEXT, "data" BLOB, PRIMARY KEY("id" AUTOINCREMENT) );', (error) => {
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
                        tx_db.run('CREATE TABLE "inputs" ( "id" INTEGER, "active" INTEGER, "block_no" INTEGER, "block_db_id" INTEGER, "hight" INTEGER, "tx_id" INTEGER, "type" TEXT, "coin_transfer" INTEGER, "token_transfer" INTEGER, "vout_txid" INTEGER, "vout_hight" INTEGER, "nft_db_id" INTEGER, PRIMARY KEY("id" AUTOINCREMENT) );', (error) => {
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
            // Infotext
            console.log('New BLockchain databases created');

            // Die Transaktionen des Blocks werden in die Datenbank geschrieben
            await this.#WriteTxToDb(null, 0, true, ...this.genesis_block.transactions);

            // Infotext
            console.log('Gebesisblock add to database');

            // Der Aktuelle Zustand der Blockchain wird gespeichert
            await this.#updateChainState();
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

        // Sofern es sich um einen Aktiven Block handelt, werden alle verwendeten Ausgänge als ausgegeben Markiert
        if(active_block === true) {

        }

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
};


// Die Klasse wird exportiert
module.exports = BlockcahinDatabase;