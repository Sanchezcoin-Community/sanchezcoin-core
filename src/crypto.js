/*
    Unabhängig von Hashfunktion, Signaturfunktionen oder anderen Crypto Funtkionen,
    alle Endgültigen Ergebnisse werden als Hexadezimal String ausgegeben.
*/

// Die Bibliotheken werden Importiert
const { sha3_256, sha3_384, sha3_512, keccak_256, keccak_384, keccak_512 } = require('@noble/hashes/sha3');
const { sha512, sha512_256, sha384 } = require('@noble/hashes/sha512');
const { ripemd160 } = require('@noble/hashes/ripemd160');
const { scryptAsync } = require('@noble/hashes/scrypt');
const HDKey = require('@ont-community/hdkey-secp256r1');
const { sha256 } = require('@noble/hashes/sha256');
const HDKeyED = require('micro-ed25519-hdkey');
const secp = require('@noble/secp256k1');
const bls = require('@noble/bls12-381');
const ed = require('@noble/ed25519');
const axlsign = require('axlsign');
const crypto = require('crypto');
const bip39 = require('bip39');



// Wird verwendet um eingabe Werte zu einem String Block zu erstellen
const inputs_to_string_block = (...items) => items.map((value) => {
    if(typeof value === 'bigint' || typeof value === 'number') {
        return value.toString(16);
    }
    else if(typeof value === 'string') {
        return value;
    }
    else if(typeof value === 'boolean') {
        let i = value ? 1 : 0;
        return i.toString(16);
    }
    else if(typeof value === 'object') {
        if(Buffer.isBuffer(value) === true) {
            return Buffer.from(value).toString('hex');
        }
        else {
            throw new Error('Invalid data input')
        }
    }
    else {
        throw new Error('Invalid ')
    }
}).join('');

// Wird verwendet um einen Scrypt Hash zu erstellen
async function scryptF(password, salt, N, r, p, dkLen) {
    // Es wird ein Scrypted Hash erstellt
    let scrypted_data = await scryptAsync(password, salt, { N:N, r:r, p:p, dkLen:dkLen });

    // Der Hash wird zurückgegeben
    return scrypted_data;
};

// Wird verwendet um einen Hash aus einer Datei zu erzeugen
async function getHashOfFileF(hash_function, file) {
    // Es wird ein Hash aus der Datei erzeugt
    let result = await new Promise((resolveOuter) => {
        var fd = fs.createReadStream('database/blocks.db');
        var hash = crypto.createHash('sha1');
        hash.setEncoding('hex');
        fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
        fd.pipe(hash);
    });

    // Die Daten werden zurückgegeben
    return Buffer.from(result).reverse().toString('hex');
};

// Wird erstellt um einen einfachen SHA256 Hash zu erstellen
function sha2F(size, ...items) {
    if(size === 256) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha256(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha384(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha512(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 768) {
        let hashed_data = sha512_256(inputs_to_string_block(...items));
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

// Wird verwendet um einen Doppelten SHA256 Hash zu estellen (sha256d)
function sha2dF(size, ...items) {
    if(size === 256) {
        let hashed_data = sha256(sha256(inputs_to_string_block(...items)));
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        let hashed_data = sha384(sha384(inputs_to_string_block(...items)));
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        let hashed_data = sha512(sha512(inputs_to_string_block(...items)));
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

// Wird verwendet um einen swiftyHash zu erstellen
function swiftyHashF(size, ...items) {
    // Es wird geprüft ob der Wert vorhanden ist
    if(items === undefined || items === null) throw new Error('Invalid data type for items parameter');
    if(typeof items !== 'object') throw new Error('Invalid data type for items parameter');

    // Die PreImages werden erstellt
    let pre_image = sha3_hash(384, keccak_hash(512, ...items));
    let pre_image_l = pre_image.subarray(0, 32).reverse()
    let pre_image_r = pre_image.subarray(32, 48).reverse();

    // Die AES Verschlüsselte Nachricht wird erstellt
    let cipher = crypto.createCipheriv('aes-256-cbc', pre_image_l, pre_image_r);
    let hased_value = keccak_hash(512, ...items);
    let aes_encrypted_data = Buffer.concat([cipher.update(hased_value), cipher.final()]);

    // Der Finale Hash wird zurückgegeben
    return sha3_hash(size, keccak_hash(384, aes_encrypted_data, pre_image, pre_image_l, pre_image_r).reverse());
};

// Wird verwendet um einen SHA3 Hash zu erstellen
function sha3F(size, ...itmes) {
    // Es wird gepürft ob es sich um eine gültige Götße handelt
    if(size === 256) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_256(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_384(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_512(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

// Wird verwendet um einen Keccak Hash zu erstellen
function keccakF(size, ...itmes) {
    // Es wird gepürft ob es sich um eine gültige Götße handelt
    if(size === 256) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_256(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_384(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_512(inputs_to_string_block(...itmes));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

// Wird verwendet um einen RIPEMD-160 Hash zu erstellen
function ripemd160F(...items) {
    // Es wird ein Hash aus den Daten erzeugt
    let hashed_data = ripemd160(inputs_to_string_block(...items));

    // Die Daten werden Reverst und als Hex zurückgegeben
    return Buffer.from(hashed_data).toString('hex');
};

// Wird verwendet um mittels BIP32 einen Determenistischen Seed zu erstellen
function genBip32WordsF(word_list=null) {
    return bip39.generateMnemonic(256, null, word_list);
};

// Wandelt einen BIP32 Seed in Wörter um
function bip32WordsToSeedF(lang_words) {
    return bip39.mnemonicToSeedSync(lang_words).toString('hex');
};

// Wird verwendet um einen Master ED25519 Schlüssel aus einem Seed abzuleiten
function getED25519MasterKeyFromSeed(seed) {
    let hdkey = HDKeyED.HDKey.fromMasterSeed(seed);
    return { pkey:hdkey.publicKeyRaw, privkey:hdkey.privateKey, hd:hdkey };
};

// Wird verwendet um einen Master SECP256K1 Schlüssel aus einem Seed abzuleiten
function getSECP256K1MasterKeyFromSeed(seed) {
    var hdkey = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'));
    return { pkey:hdkey.publicExtendedKey, privkey:hdkey.privateExtendedKey, hd:hdkey };
};

// Wird verwendet um eine Signatur zu erzeugen
function signDigesF(digest_hex_value, private_key, crypto_algo) {

};

// Wird verwendet um eine Signatur zu überprüfen
function verifyDigestF(digest_hex_value, signature_hex_value, public_key_hex, crypto_alg) {

};



// Die Funktionen werden Exportiert
module.exports = {
    sha2:sha2F,
    sha3:sha3F,
    sha2d:sha2dF,
    keccak:keccakF,
    scrypt:scryptF,
    ripemd160:ripemd160F,
    signDigest:signDigesF,
    swiftyHash:swiftyHashF,
    verifyDigest:verifyDigestF,
    getHashOfFile:getHashOfFileF,
    genBip32Words:genBip32WordsF,
    bip32WordsToSeed:bip32WordsToSeedF,
}

let test_words = genBip32WordsF();
let seed = bip32WordsToSeedF(test_words);
let secp256k1_master_keys = getSECP256K1MasterKeyFromSeed(seed);
let ed25519_master_keys = getED25519MasterKeyFromSeed(seed);

console.log(secp256k1_master_keys);
console.log(ed25519_master_keys);