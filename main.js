const { createMainChain } = require('./src/node');

// Willkommenstext
console.log(`
  8"""8                 8""""8                      
  8   8  e  eeee e   e  8    " e   e eeeee e  eeeee 
  8eee8e 8  8  8 8   8  8e     8   8 8   8 8  8   8 
  88   8 8e 8e   8eee8e 88     8eee8 8eee8 8e 8e  8 
  88   8 88 88   88   8 88   e 88  8 88  8 88 88  8 
  88   8 88 88e8 88   8 88eee8 88  8 88  8 88 88  8 
                                                  
                ⣄    ⢀⣴⡀                  
                ⣿⣷⣄ ⣠⣾⣿⡇           ⠈⢆     
           ⢀⡀   ⢸⠿⣛⣛⣛⡻⢿⣇⣤⣤⣶⠆        ⠈⡳⣴⡄  
            ⠻⣿⣿⡟⣵⣿⣿⣿⣿⣿⣷⡝⣿⣿⠃         ⡴⢿⣿⣷  
  ⢰          ⠹⣿⢱⡿⣟⡿⣿⢟⣭⣭⡛⣸⣧⣤⣤        ⠈⠁⢿⣿  
⢀⣠⠏        ⠠⢶⣿⣿⠈⣾⣟⣿⣞⡸⣿⣽⡟⡇⣿⠟⠁          ⠰⠶⣀ 
⢸⣿⣾⡤⡀        ⣨⣿⡜⣮⠟⠯⡾⣿⣶⣒⣺⣿⢙⢦⡄          ⢸⣿⣿ 
 ⣿⣿⠈        ⠈⠛⠛⢥⡻⠋⠍⠟⡉⠛⠙⠈ ⠁⡄           ⢸⣿⣿ 
 ⢘⣯           ⠘⠓⠡⡀  ⠰⡂⡀⢀⡴⠁            ⠈⣿⣿ 
 ⢲⣾⡇              ⠙⠒⢓⣛⣛⠉               ⣿⣿ 
 ⢸⣿⣿            ⢀⣠⣤⣶⢰⣿⣶⢹⣿⣿⣿⣿⣿⣷⣶⣶⣶⣶⣶⣦⣤⣤⣤⣽⣿⡆
  ⣿⣿⡀       ⣀⣠⣴⣾⣿⣿⡟⣿⡟⣿⣿⢸⣿⣿⡇ ⠉⠉⠉⠉⠉⠙⠛⠛⠛⠛⠛⠛⠛⠁
  ⢸⣿⣇   ⣀⣤⣶⣿⡿⠟⠋⠁ ⡟⣼⣿⡇⣿⣿⢸⣿⣿⡇               
   ⢿⣿⣤⣶⣿⠿⠛⠉      ⣿⣶⢝⡇⣿⣿⣾⣿⣿⡇               
   ⠈⠛⠛⠉          ⣿⢱⣿⣿⣿⣿⡇⣿⣿⣷               
                 ⣿⣯⢿⣿⢸⣿⣇⠿⠿⠻               

                Just do a Die Hard!

|------------------------------------------------------------------------|
|  Version: 22.10.00                                                     |
|  Build Year: 2022                                                      |
|  Total supply: 177,119,999.00 Ricks                                    |
|  Github Page: https://github.com/silentium-official/RickChain          |
|------------------------------------------------------------------------|
`)

// Die Mainchain wird geladen
createMainChain((error, node_object) => {
    // Es wird geprüft ob ein Fehler aufgetreten ist
    if(error !== null) {
        console.log(error);
        return;
    }

    // Die Aktuelle Wallet wird geladen
    node_object.loadWallet();

    // Die Blockchain wird geladen
    node_object.loadChain("/Volumes/Daten/RickChain/database", (state) => {
        // Der Aktuelle Block wird abgerufen
        let reconstrived_block = node_object.getLastBlock();
        let block = reconstrived_block.block;

        // Info Text
        console.log('Current block hash', block.blockHash());
        console.log('Current block hight', reconstrived_block.hight.toString());

        // Das Mining wird gestartet
        node_object.startMiner('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 2, 5, (error, result) => { });
        //node_object.startBlockMinting('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', 1, (error, result) => { });
    });
});

