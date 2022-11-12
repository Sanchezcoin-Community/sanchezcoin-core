// Wird verwendet um neue Blöcke zu Minten
function mintNewBlock(wallet_obj, blockchain_obj, callback) {
    let run_loop = true;
    (async() => {
        while(run_loop) {
            // Es wird ein Blocktemplate abgerufen
            let block_template = blockchain_obj.getPoSMintingBlockTemplate('9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b', '9b65ac81d16a8cab6e07e31a7870bdcf966a7de0595dde0318de5e91b878ca5b');

            // Es wird X Sekunden gewartet um zu versuchen einen neuen Block zu erstellen
            await new Promise((resolve) => { setTimeout(resolve, 1600);});
        }
    })().then((r) => {

    });
};


// Exportiert die Module
module.exports = {
    mintNewBlock:mintNewBlock
}