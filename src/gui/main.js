const { app, BrowserWindow } = require('electron');
const { createMainChain } = require('../node');
const path = require('path');



// Erzeugt dass neue Fenster welches angezeigt werden soll
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
        preload: path.join(__dirname, 'preload.js')
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

// Wird ausgeführt, wenn die Datei als Modul ausgeführt wird
if (require.main === module) {
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
    `);

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

    // Das Fenster wird angezeigt
    app.whenReady().then(() => {
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        });
    });
}
else {
    throw new Error('Rickcoin gui dosent support library mode');
}