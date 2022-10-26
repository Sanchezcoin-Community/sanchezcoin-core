const workerFarm = require('worker-farm');



// Proof of Work Consensus Object
class ProofOfWorkConsensus {
    constructor(threads, miner_algo) {
        this.workers = workerFarm(require.resolve('./miner'));
        this.miner_algo = miner_algo;
        this.threads = threads;
    }

    // Startet den Mining vorgang
    startMine(target, block_header, callback) {
        // Die Ranges werden ermittelt
        let max_value = 2147483647 - 1;
        let totaled = Math.floor(max_value/ this.threads);
        let start = 0, end = totaled, found = false;

        // Die Miner Threads werden gestartet
        for (let i = 0; i < this.threads; i++) {
            // Der Worker wird gestartet
            let pushData = { start:start, end:end, block_header:block_header, target:target, i:i};
            this.workers(pushData, (err, outp) => {
                // Es wird geprüft ob ein Fehler aufgetretn ist
                if(err !== null) {
                    console.log(err);
                    return;
                }

                // Es wird geprüft ob bereits eine Antwort gemeldet wurde
                if(found !== true) {
                    // Es wird Markeirt dass bereis ein Block gefunden wurde
                    found = true;

                    // Die gefunde Nonce wird zurückgegeben
                    (async() => {
                        callback(null, outp);
                    })();

                    // Es werden alle Threads beendet
                    workerFarm.end(this.workers);
                }
            });

            // Die Werte werden nach oben gezählt
            start += totaled;
            if(i=== 0) start += 1
            end += totaled;
        }
    };
}


module.exports = ProofOfWorkConsensus;