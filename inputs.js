class CoinbaseInput {
    constructor(blockHight, amount) {
        this.blockHight = blockHight;
        this.amount = amount;
    }
}

class TxInput {
    constructor(txId, outputHight, amount) {
        this.outputHight = outputHight;
        this.amount = amount;
        this.txId = txId;
    }
}