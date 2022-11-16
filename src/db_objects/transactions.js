const { CoinbaseTransaction } = require('../transaction');


class DB_CoinbaseTransaction extends CoinbaseTransaction {
    constructor(blockHight, inputs, outputs, confirmations) {
        super(blockHight, inputs, outputs);
        this.confirmations = confirmations;
    }
}


module.exports = {
    DB_CoinbaseTransaction:DB_CoinbaseTransaction
}