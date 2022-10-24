class UnspentOutput {
    constructor(reciver_address, amount) {
        this.reciver_address = reciver_address;
        this.amount = amount;
    }
}

class MessageOutput {
    constructor(inner_hight) {

    }
}


// Exportiert die Klassen
module.exports = { UnspentOutput:UnspentOutput, MessageOutput:MessageOutput }