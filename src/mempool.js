class Mempool {
    constructor() {
        this.tx_pool = new Map();
    }

    // Wird verwendet um den Mempool zu Starten
    async loadAndStartMempool(file_path) {
        console.log('Mempool loading...');
        console.log('Mempool loaded...');
    };

    // Gibt X Transaktionen aus, die Transaktioenen dürfen die Insgesamte Größe von X Byts nicht überschreiten
    async getAllUseableTransactions(max_total_byte_size=null) {
        return [];
    };

    // Wird verwendet um eine neue Transaktion in dem Mempool hinzuzufügen
    async addTransaction(tx) {

    };
}



module.exports = { Mempool:Mempool };