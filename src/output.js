// Stellt einen nicht Ausgegeben Wert dar
class UnspentOutput {
    constructor(reciver_address, amount, lock_date_time, lock_block_hight) {
        this.reciver_address = reciver_address;
        this.amount = amount;
    }
}


// Wird verwendet um eine Nachricht in die Blockcahin zu schreiben
class MessageOutput {
    constructor(inner_hight) {

    }
}


// Stellt einen nicht Ausgegeben NFT dar
class UnspentNFTOutput {
    constructor(inner_hight, lock_date_time, lock_block_hight) {

    }
};


// Stellt einen Ausgegeben UTXO dar
class SpendOutput {

};


// Stellt ein NFT Ausgabe UTXO dar
class SpendNFTOutput {

};


// Exportiert die Klassen
module.exports = {
    UnspentNFTOutput:UnspentNFTOutput,
    SpendNFTOutput:SpendNFTOutput,
    UnspentOutput:UnspentOutput,
    MessageOutput:MessageOutput,
    SpendOutput:SpendOutput,
}