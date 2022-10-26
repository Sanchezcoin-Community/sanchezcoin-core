const { mainnet } = require("./src/chainparms");


// Die Mainchain wird geladen
mainnet((error, blockchain) => {
    console.log(blockchain.hashOfFirstBlock())
});