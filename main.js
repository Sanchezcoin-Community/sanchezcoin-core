const { createMainChain } = require('./src/cnode');


// Die Mainchain wird geladen
createMainChain((error, node_object) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    // Die Blockchain wird geladen
    node_object.loadChain("", async (state) => {
        // Der Aktuelle Block wird abgerufen
        let reconstrived_block = node_object.getLastBlock();
        let block = reconstrived_block.block;

        // Gibt den Hash des Genesisblock aus
        console.log(block.blockHash(), block.targetBits(), reconstrived_block.hight);

        // Das Mining wird gestartet
        node_object.startMiner('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 2, 13, (error) => { });
    });
});

