class Coin {
    constructor(decimal, total, max, halv_at_block, start_block_reward) {
        this.start_block_reward = start_block_reward;
        this.halv_at_block = halv_at_block;
        this.decimal = decimal;
        this.total = total;
        this.max = max;
    }
}

// 179.769.313,486 Mortys
// 1 Morty = 100.000.000 Jerrys


// Exportiert die Klasse
module.exports = { Coin:Coin }