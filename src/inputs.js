// Wird verwendet um neue Coins zu Generieren
class CoinbaseInput {
    constructor(blockHight, amount) {
        this.blockHight = blockHight;
        this.amount = amount;
    }
}


// Wird verendet um ein Unspent Output zu übertragen
class TxInput {
    constructor(txId, outputHight, amount) {
        this.outputHight = outputHight;
        this.amount = amount;
        this.txId = txId;
    }
}


// Wird verwendet um ein NFT zu übertragen
class NFTInput {
    constructor(txId, outputHight, nftItemId) {
        this.outputHight = outputHight;
        this.nftItemId = nftItemId;
        this.txId = txId;
    }
}


// Wird verwendet um ein Message Output neu zu Verlinken
class MessageOutputLinkInput {
    
}