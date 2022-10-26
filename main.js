const { mainnet } = require("./src/chainparms");



// Die Mainchain wird geladen
mainnet((error, blockchain) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    // Die Blockchain wird geladen
    console.log('Loading blk0.dat');
    console.log(blockchain.getBlock(0).workProofHash(), blockchain.getBlock(0).targetBits(), blockchain.getBlock(0).blockHeader())
    blockchain.loadBlockchainDatabase("", (state) => {

    });
});