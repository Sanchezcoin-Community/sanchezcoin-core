const { mainnet } = require("./src/chainparms");



// Die Mainchain wird geladen
mainnet((error, blockchain) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    // Die Blockchain wird geladen
    blockchain.loadBlockchainDatabase("", (state) => {
        // Der Aktuelle Block wird abgerufen
        let reconstrived_block = blockchain.getLastBlock();

        // Gibt den Hash des Genesisblock aus
        console.log(reconstrived_block.blockHash(), reconstrived_block.targetBits(), reconstrived_block.blockHeader())

        // Das Mining wird gestartet
        blockchain.startMiner('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 2, 10, (error) => { });
    });
});