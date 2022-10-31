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
        blockchain.startMiner('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 4, 5, (error) => { });
    });
});