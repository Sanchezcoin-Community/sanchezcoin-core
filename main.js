const { mainnet } = require("./src/chainparms");



// Die Mainchain wird geladen
mainnet((error, blockchain) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    // Es wird ein neuer Candidate Block ausgegeben
    blockchain.startMiner('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 2);


    // Die Blockchain wird geladen
    console.log('Loading blk0.dat');
    console.log(blockchain.getBlock(0).blockHash(), blockchain.getBlock(0).targetBits(), blockchain.getBlock(0).blockHeader())
    blockchain.loadBlockchainDatabase("", (state) => {

    });
});