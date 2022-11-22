const { Keccak, SHA3 } = require('sha3');
const crypto = require('crypto');


// Erzeugt einen Keccak hash
function keccak_hash(size, ...data) {
    let final_hash = new Keccak(size);
    final_hash.update(...data);
    return final_hash.digest();
};

// Erzeugt einen SHA3_Hash
function sha3_hash(size, ...data) {
    let final_hash = new SHA3(size);
    final_hash.update(...data);
    return final_hash.digest();
};

// Erzeugt einen 256 Bit swiftyHash
function computeSwiftyH(...value) {
    // Es wird geprüft ob der Wert vorhanden ist
    if(value === undefined || value === null) throw new Error('Invalid data type for value parameter');
    if(typeof value !== 'object') throw new Error('Invalid data type for value parameter');

    // Die PreImages werden erstellt
    let pre_image = sha3_hash(384, keccak_hash(512, ...value));
    let pre_image_l = pre_image.subarray(0, 32).reverse()
    let pre_image_r = pre_image.subarray(32, 48).reverse();

    // Die AES Verschlüsselte Nachricht wird erstellt
    let cipher = crypto.createCipheriv('aes-256-cbc', pre_image_l, pre_image_r);
    let hased_value = keccak_hash(512, ...value);
    let aes_encrypted_data = Buffer.concat([cipher.update(hased_value), cipher.final()]);

    // Der Finale Hash wird zurückgegeben
    return sha3_hash(256, keccak_hash(384, aes_encrypted_data, pre_image, pre_image_l, pre_image_r).reverse());
};

module.exports = computeSwiftyH;