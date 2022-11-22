/*
    Unabhängig von Hashfunktion, Signaturfunktionen oder anderen Crypto Funtkionen,
    alle Endgültigen Ergebnisse werden als Hexadezimal String ausgegeben.
*/

// Die Bibliotheken werden Importiert
const { sha3_256, sha3_384, sha3_512, keccak_256, keccak_384, keccak_512 } = require('@noble/hashes/sha3');
const { sha512, sha512_256, sha384 } = require('@noble/hashes/sha512');
const { schnorr, utils } = require('@noble/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { pbkdf2 } = require('@noble/hashes/pbkdf2');
const rust_lib = require('./index.node');
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

// Gibt ein rs25519 Schlüsselpaar aus dem Seed aus (Determenistisch)
function getRistretto25519KeyPairFromSeedF(seed_hex_str, path) {
    // Es wird geprüft ob die Länge des Seed genau 128 zeichen beträgt
    if(seed_hex_str.length !== 128) throw new Error('Invalid seed length');

    // Die Aufagbe wird an die Rustlib übergeben
    let rust_lib_result = rust_lib.get_key_pair_from_bip32_seed_sr25519(seed_hex_str, path)

    // Das Ergebnis wird zurückgegeben
    return { public_key:rust_lib_result.public_key, private_key:rust_lib_result.private_key, type:'ed25519_schnorr' };
};

// Wird verwendet um ein secp256k1 Schnlüsselpaar abzuleiten (BIP340)
function getSecp256k1SchnorrKeyPairFromSeedF(seed_hex_str, path) {
    // Es wird geprüft ob die Länge des Seed genau 128 zeichen beträgt
    if(seed_hex_str.length !== 128) throw new Error('Invalid seed length');

    // Es wird mittels pbkdf2 ein Schlüssel aus dem Seed erezugt
    const pbkdf2_seed = pbkdf2(sha256, path, seed_hex_str, { c: 40, dkLen: 40 });

    // Es wird versucht einen Privaten Schlüssel zu erstellen
    const priv_key = utils.hashToPrivateKey(Uint8Array.from(pbkdf2_seed));

    // Es wird ein Öffentlicher Schnorr Schlüssel abgeleitet
    const public_shnorr_key = schnorr.getPublicKey(priv_key);

    // Das Schlüsselpaar wird zurückgegeben
    return { public_key:Buffer.from(public_shnorr_key).toString('hex'), private_key:Buffer.from(priv_key).toString('hex'), type:"secp256k1_schnorr" };
};

// Wird verwendet um eine secp256k1 Schnorr Signatur zu erstellen
async function signDigestWithSecp256k1SchnorrF(private_key_hex, digest_value) {
    // Es wird eine Schnorr Signatur erstellt
    let signature = await schnorr.sign(Uint8Array.from(Buffer.from(digest_value, 'hex')), Uint8Array.from(Buffer.from(private_key_hex, 'hex')));

    // Die Signatur wird in Bytes umgewandelt und zurückgegeben
    return Buffer.from(signature).toString('hex');
};

// Wird verwendet um eine secp256k1 Schnorr Signatur zu überprüfen
async function verfiySecp256k1SchnorrSignatureF(signature_hex, public_key_hex, digest_value) {
    // Der Öffentliche Schlüssel wird von einem Hex String in Bytes umgewandet
    let byted_public_key = Uint8Array.from(Buffer.from(public_key_hex, 'hex'));

    // Die Signatur wird von einem Hex String in Bytes umgewandelt
    let byted_signature = Uint8Array.from(Buffer.from(signature_hex, 'hex'));

    // Der Hashwert wird eingelesen
    let r_hash_value = Uint8Array.from(Buffer.from(digest_value, 'hex'));

    // Das Ergebniss wird geprüft
    let result = await schnorr.verify(byted_signature, r_hash_value, byted_public_key);

    // Das Ergebnis wird zurückgegeben
    return result;
};

// Wird verwendet um eine Ristretto25519 Schnorr Signatur zu erstellen
async function signDigestWithRistretto25519SchnorrF(private_key_hex, digest_value) {
    // Wird Asynchrone ausgeführt
    let async_result = await new Promise((resolveOuter) => {
        // Der Vorgang wird an die Rust Lib übergeben
        let sig = rust_lib.sign_digest_sr25519(private_key_hex, digest_value);
        resolveOuter(sig);
    });

    // Die Signatur wird zurückgegeben
    return async_result;
};

// Wird verwendet um eine Ristretto25519 Schnorr Signatur zu überprüfen
async function verfiyRistretto25519SchnorrSignatureF(signature_hex, public_key_hex, digest_value) {
    // Wird Asynchrone ausgeführt
    let async_result = await new Promise((resolveOuter) => {
        // Der Vorgang wird an die Rust Lib übergeben
        let sig = rust_lib.verfiy_digest_sign_sr25519(public_key_hex, digest_value, signature_hex);
        resolveOuter(sig);
    });

    // Die Signatur wird zurückgegeben
    return async_result;
};

// Wird verwendet um einen neuen BIP32 Mnemonic zu erstelen
const generateBip39MnemonicF = (wordlist=undefined) => bip39.generateMnemonic(256, undefined, wordlist);

// Wird verwendet um aus einem Bip32 Mnemonic einen Seed zu erstellen
const getSeedFromBip39MnemonicF = (bip_39_mnemonic) => bip39.mnemonicToSeedSync(bip_39_mnemonic).toString('hex');


// Die Funktionen werden Exportiert
module.exports = {
    sha2:sha2F,
    sha3:sha3F,
    sha2d:sha2dF,
    keccak:keccakF,
    getHashOfFile:getHashOfFileF,
    swiftyHash:require('./swiftyh'),
    bip32:{
        generateBip39Mnemonic:generateBip39MnemonicF,
        getSeedFromBip39Mnemonic:getSeedFromBip39MnemonicF
    },
    ecc:{
        secp256k1:{
            getKeyPairFromSeed:getSecp256k1SchnorrKeyPairFromSeedF,
            verifySignature:verfiySecp256k1SchnorrSignatureF,
            signDigest:signDigestWithSecp256k1SchnorrF,
        },
        curve25519:{
            getKeyPairFromSeed:getRistretto25519KeyPairFromSeedF,
            verifySignature:verfiyRistretto25519SchnorrSignatureF,
            signDigest:signDigestWithRistretto25519SchnorrF,
        }
    }
}

/*
function test() {
    // Es wird Mnemoinic erzeugt und dann in seinen Seed umgewandelt
    const mnic = generateBip39MnemonicF();
    const rseed = getSeedFromBip39MnemonicF(mnic);

    // Die Schlüsselpaare werden erezugt
    const curve25519_kpair = getCurve25519KeyPairFromSeedF(rseed, "0/0/2");
    const secp256k1_kpair = getSecp256k1SchnorrKeyPairFromSeedF(rseed, "0/0/2");

    // Es wird eine Secp256k1 Schnorr Signatur erzeugt
    let message = Buffer.from('hallo', 'ascii');
    message = sha2F(256, message);
    signDigestWithSecp256k1SchnorrF(secp256k1_kpair.private_key, message).then((r) => {
        verfiySecp256k1SchnorrSignatureF(r, secp256k1_kpair.public_key, message).then((r) => {
            console.log(r);
        })
    });

    // Es wird eine Curve25519 Schnorr Signatur erzeugt
    signDigestWithRistretto25519SchnorrF(curve25519_kpair.private_key, message).then((r) => {
        verfiyRistretto25519SchnorrSignatureF(r, curve25519_kpair.public_key, message).then((r) => {
            console.log(r);
        });
    });

    // Die Öffentlichen Schlüssel werden ausgegeben
    console.log(curve25519_kpair.public_key);
    console.log(secp256k1_kpair.public_key);
};
*/