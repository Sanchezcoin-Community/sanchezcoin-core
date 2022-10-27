//add this script in myWorker.js file
const {parentPort, workerData} = require("worker_threads");
const { sha256dBTC } = require('../../hash_algo');
const bigInt = require("big-integer");



// Speichert den Akuellen Zusatand ab
const current_state = {
    process_data:null
}

// Wird Asynchrone ausgeführt
async function worker() {
    console.log('STARTED_MINING');

    // Wird ausgeführt um einen Hash zu finden
    async function winner() {
        // Es wird geprüft ob ein Prozess vorhanden ist
        if(current_state.process_data !== null) {
            // Es wird versucht einen Block zu Minen
            let cnonce = workerData.start, found = false, last_hash = null, cround = 0;
            try{
                while(cnonce <= workerData.end && found === false && cround < 10000) {
                    // Wandelt die Nonce um
                    let nonce = Buffer.from(cnonce.toString(16).padStart(8, 0), 'hex').reverse().toString('hex');

                    // Fügt die Daten zusammen
                    let merged_data = `${current_state.process_data.block_header}${nonce}`;

                    // Es wird ein Hash aus dem Wert erzeugt
                    let reval_hash = sha256dBTC.compute(Buffer.from(merged_data, 'hex'));
                    if(reval_hash === last_hash) {
                        console.log(reval_hash, 'error', cnonce, merged_data);
                        return;
                    }

                    // Der Letze Hash wird gesetzt
                    last_hash = reval_hash;

                    // Es wird geprüft ob es ein gültiger Wer ist
                    if(bigInt(reval_hash, 16) < bigInt(current_state.process_data.target, 16)) {
                        parentPort.postMessage({ cmd:'found_hash', nonce:cnonce });
                        current_state.process_data = null;
                        console.log('FOUND');
                        found = true;
                        return; 
                    }

                    // Die Nonce wird hochgezählt
                    cnonce += 1;
                    cround += 1;
                }
            }
            catch(e) {
                console.log(e);
            }
        }
    }

    // Prüft ob ein Auftrag vorhanden ist, wenn nicht wird der Thread wartend gehalten
    async function checker() {
        if(current_state.process_data !== null) {
            await winner();
        }
        setTimeout(checker);
    }

    // Der Checker wird gestartet
    setTimeout(checker);
}


// Dem Hauptprozess wird mitgeteilt dass der Vorgang erfolgreich war
parentPort.on('message', (data) => {
    if(typeof data === 'object') {
        if(data.cmd === 'start') {
            current_state.process_data = data;
        }
    }
    else if(typeof data === 'string') {
        if(data === 'CLEAR') {
            console.log('PROCESS_CLEARED');
        }
    }
    
});

// Die Worker Schleife wird gestartet
worker().then(()=>null);

// Es wird Signalisiert das der Thread gestattet wurde
console.log(`MINER_THREAD_${workerData.i}_STARTED`);
parentPort.postMessage('STARTED');