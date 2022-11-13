const { createMainChain } = require('./src/node');

// Willkommenstext
console.log(`Rickchain starting...
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣄⠀⠀⠀⠀⢀⣴⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣷⣄⠀⣠⣾⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢆⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⢸⠿⣛⣛⣛⡻⢿⣇⣤⣤⣶⠆⠀⠀⠀⠀⠀⠀⠀⠀⠈⡳⣴⡄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⣿⡟⣵⣿⣿⣿⣿⣿⣷⡝⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⡴⢿⣿⣷⠀⠀
⠀⠀⢰⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣿⢱⡿⣟⡿⣿⢟⣭⣭⡛⣸⣧⣤⣤⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⢿⣿⠀⠀
⢀⣠⠏⠀⠀⠀⠀⠀⠀⠀⠀⠠⢶⣿⣿⠈⣾⣟⣿⣞⡸⣿⣽⡟⡇⣿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠰⠶⣀⠀
⢸⣿⣾⡤⡀⠀⠀⠀⠀⠀⠀⠀⠀⣨⣿⡜⣮⠟⠯⡾⣿⣶⣒⣺⣿⢙⢦⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀
⠀⣿⣿⠈⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠛⢥⡻⠋⠍⠟⡉⠛⠙⠈⠀⠁⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀
⠀⢘⣯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠓⠡⡀⠀⠀⠰⡂⡀⢀⡴⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⠀
⠀⢲⣾⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠒⢓⣛⣛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⠀
⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⣶⢰⣿⣶⢹⣿⣿⣿⣿⣿⣷⣶⣶⣶⣶⣶⣦⣤⣤⣤⣽⣿⡆
⠀⠀⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣴⣾⣿⣿⡟⣿⡟⣿⣿⢸⣿⣿⡇⠀⠉⠉⠉⠉⠉⠙⠛⠛⠛⠛⠛⠛⠛⠁
⠀⠀⢸⣿⣇⠀⠀⠀⣀⣤⣶⣿⡿⠟⠋⠁⠀⡟⣼⣿⡇⣿⣿⢸⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢿⣿⣤⣶⣿⠿⠛⠉⠀⠀⠀⠀⠀⠀⣿⣶⢝⡇⣿⣿⣾⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠛⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⢱⣿⣿⣿⣿⡇⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣯⢿⣿⢸⣿⣇⠿⠿⠻⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

1 Rick = 100.000.000 Mortys`)

// Die Mainchain wird geladen
createMainChain((error, node_object) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    node_object.loadWallet();

    // Die Blockchain wird geladen
    node_object.loadChain("/Volumes/Daten/RickChain/database", (state) => {
        // Der Aktuelle Block wird abgerufen
        let reconstrived_block = node_object.getLastBlock();
        let block = reconstrived_block.block;

        // Gibt den Hash des Genesisblock aus
        console.log(block.blockHash(), block.targetBits(), reconstrived_block.hight.toString());

        // Das Mining wird gestartet
        //node_object.startMiner('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 2, 1, (error, result) => { });
        //node_object.startBlockMinting('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 1, (error, result) => { });
    });
});

