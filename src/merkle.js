// Erstellt einen Merkle Root
const computeMerkleRoot = (hashAlgo, txids) => {
    // Speichert die Ergebnisse ab
    let result = [];

    // Der Vorgang wird durchgeführt
    while (txids.length > 0) {
        let one = txids.pop();

        if(txids.length != 0) {
            let two = txids.pop();
            var ent_data = [Buffer.from(one, 'hex').reverse().toString('hex'), Buffer.from(two, 'hex').reverse().toString('hex')].join(''); 
        }
        else {
            var ent_data = [Buffer.from(one, 'hex').reverse().toString('hex'), Buffer.from(one, 'hex').reverse().toString('hex')].join(''); 
        }

        result.push(hashAlgo.compute(Buffer.from(ent_data, 'hex')));
        if(txids.length === 0) break
    }

    // Es wird geprüft ob nurnoch ein Eintrag auf der Liste liegt
    if(result.length === 1) return result[0]

    // Der Vorgang wird wiederholt
    console.log(result.reverse())
    return computeMerkleRoot(hashAlgo, result.reverse());
}


// Exportiert die Klasse
module.exports = {
    computeMerkleRoot:computeMerkleRoot 
};



txids = [
    "8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87",
    "fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4",
    "6359f0868171b1d194cbee1af2f16ea598ae8fad666d9b012c8ed2b79a236ec4",
    "e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d"
]

const tx = txids.reverse();
console.log(tx);

const {sha256dBTC} = require('./hash_algo');
const a = computeMerkleRoot(sha256dBTC, tx);
console.log(a);