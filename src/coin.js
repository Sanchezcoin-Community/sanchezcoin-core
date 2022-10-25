class Coin {
    constructor(decimal, total, max, halv_at_block, start_block_reward) {
        this.start_block_reward = start_block_reward;
        this.halv_at_block = halv_at_block;
        this.decimal = decimal;
        this.total = total;
        this.max = max;
    };

    // Überprüft ob der Reward für den Block XYZ Korrekt ist
    validate_block_reward(amont, hight) {

    };

    // Gibt die Hähe der Aktuellen Blockbelonung an
    block_reward(hight) {

    };

    // Gibt die Anzahl aller Coins aus
    total_supply(hight=null) {

    };
}


// 179.768.400,00 Mortys
// 1 Morty = 100.000.000 Jerrys


// Exportiert die Klasse
module.exports = { Coin:Coin }