const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');




class BlockcahinDatabase {
    constructor(genesis_block) {
        // Speichert den Genesisblock ab
        this.genesis_block = genesis_block;

        // Speichert die Aktuelle Datenbank ab
        this.block_db = null;
        this.tx_db = null;
    };

    // Lädt die Datenbank
    async loadDatabase() {
        // Speichert die Prüfwerte der Datenbanken ab
        let local_chsum_blocks = null, local_chsum_txdb = null;

        // Speichert die Aktuellen Block lists ab
        let chain_state = null;

        // Der Vorgang wird Asynchron ausgeführt
        let resolved = new Promise(async (resolveOuter) => {
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
            }

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

            // Es wird geprüft ob die Blocksdatei vorhanden ist
            if(fs.existsSync('database/blocks.db')) await __hash_block_file(); 

            // Es wird geprüft ob die Transaction Database vorhanden ist
            if(fs.existsSync('database/txdb.db')) await ___hash_txdb_file(); 

            // Die Datenbanken werden geladen
            let block_db = new sqlite3.Database('database/blocks.db');
            let tx_db = new sqlite3.Database('database/txdb.db');

            // Es wird geprüft ob die Chainsate Datei vorhanden ist
            if(fs.existsSync('database/chain.state')) chain_state = await new Promise((resolveOuter) => {
                fs.readFile('database/chain.state', 'utf8', (err, data) => {
                    if (err) throw err; resolveOuter(JSON.parse(data));
                });
            });

            // Wird verwendet um einen ChainReork durchzuführen
            const ___finally = () => {
                console.log('Blockchain loaded');
                this.block_db = block_db;
                this.tx_db = tx_db;
                resolveOuter(null);
            };

            // Wird verwendet um zu überprüfen ob die Daten korrekt sind
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
                        // Die Tabelle wird erstellt
                        block_db.run('CREATE TABLE "blocks" ("block_id" INTEGER UNIQUE, "prev_hash"	BLOB, "type" TEXT, "block_hash" BLOB, "header" BLOB, "transactions" BLOB, PRIMARY KEY("block_id" AUTOINCREMENT));', (error) => {
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

        // Gibt die Daten zurück
        return resolved;
    };

    // Wird verwendet um einen neuen Block hinzuzufügen
    async addBlock(...blockData) {
        // Der Vorgang wird Asyncrone ausgeführt
        (async() => {
            for await(const otem of blockData) {
                db.run("INSERT INTO Foo (name) VALUES ('bar')");
            };
        })();
    };
}

// Die Klasse wird exportiert
module.exports = BlockcahinDatabase;