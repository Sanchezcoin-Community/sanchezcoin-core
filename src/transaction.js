class CoinbaseTransaction {
    constructor(blockHight, inputs, outputs) {
        this.blockHight = blockHight;
        this.outputs = outputs;
        this.inputs = inputs;
    }
}


// Exportiert die Klassen
module.exports = { CoinbaseTransaction:CoinbaseTransaction }