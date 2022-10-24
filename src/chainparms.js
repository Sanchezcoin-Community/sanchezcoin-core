class Chainparms {
    constructor(chain_id, start_consensus, coin){
        this.current_consensus = start_consensus;
        this.chain_id = chain_id;
        this.coin = coin;
    }
}

// Exportiert die Klasse
module.exports = { Chainparms:Chainparms };