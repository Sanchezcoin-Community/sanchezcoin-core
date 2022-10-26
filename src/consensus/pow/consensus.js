const workerFarm = require('worker-farm');



// Proof of Work Consensus Object
class ProofOfWorkConsensus {
    constructor(threads, miner_algo) {
        this.workers = workerFarm(require.resolve('./miner'));
        this.miner_algo = miner_algo;
        this.threads = threads;
    }

    // Startet den Mining vorgang
    startMine(target, block, callback) {
        // Die Ranges werden ermittelt
        let max_value = 2147483647 - 1;
        let totaled = Math.floor(max_value/ this.threads);
        let start = 0, end = totaled;

        // Die Miner Threads werden gestartet
        for (let i = 0; i < this.threads; i++) {
            // Der Worker wird gestartet
            let pushData = { start:start, end:end, block:block, target:target, i:i };
            this.workers(pushData, (err, outp) => {
                workerFarm.end(this.workers);
                console.log(err, outp);
            });

            // Die Werte werden nach oben gezählt
            start += totaled;
            if(i=== 0) start += 1
            end += totaled;
        }
    };
}


module.exports = ProofOfWorkConsensus;