/*
    Unabhängig von Hashfunktion, Signaturfunktionen oder anderen Crypto Funtkionen,
    alle Endgültigen Ergebnisse werden als Hexadezimal String ausgegeben.
*/

// Die Bibliotheken werden Importiert
const { sha3_256, sha3_384, sha3_512, keccak_256, keccak_384, keccak_512 } = require('@noble/hashes/sha3');
const { is_validate_hex_string, is_validate_string } = require('./validate');
const { validate, getAddressInfo } = require('bitcoin-address-validation');
const { sha512, sha512_256, sha384 } = require('@noble/hashes/sha512');
const { schnorr, utils, Point, CURVE } = require('@noble/secp256k1');
const bitcoinMessage = require('bitcoinjs-message');
const { sha256 } = require('@noble/hashes/sha256');
const { pbkdf2 } = require('@noble/hashes/pbkdf2');
const rust_lib = require('./index.node');
const bls = require('@noble/bls12-381');
const crypto = require('crypto');
const bip39 = require('bip39');
const web3 = require('ethers');


/**
 * Creates a hash from a file
 * 
 * @param {...items} items Specifies the elements to be merged into a string.
 * @return {string} Returns the full string.
*/
const inputs_to_string_block = (...items) => items.map((value) => {
    if(typeof value === 'bigint' || typeof value === 'number') {
        return value.toString(16).toLowerCase();
    }
    else if(typeof value === 'string') {
        if(is_validate_hex_string(value) === true) return value.toLowerCase();
        else return value;
    }
    else if(typeof value === 'boolean') {
        let i = value ? 1 : 0;
        return i.toString(16).toLowerCase();
    }
    else if(typeof value === 'object') {
        if(Buffer.isBuffer(value) === true) {
            return Buffer.from(value).toString('hex').toLowerCase();
        }
        else {
            throw new Error('Invalid data input')
        }
    }
    else {
        throw new Error('Invalid ')
    }
}).join('');

/**
 * Creates a hash from a file
 * 
 * @param {string} hash_function Specifies the hash function to use to create the hash of the file.
 * @param {string} file Specifies the path for the file to be hashed.
 * @return {string} Returns the hash value of the file as a hex string.
*/
async function getHashOfFileF(hash_function, file) {
    // Es wird ein Hash aus der Datei erzeugt
    let result = await new Promise((resolveOuter, reject) => {
        try {
            var fd = fs.createReadStream('database/blocks.db');
            var hash = crypto.createHash('sha1');
            hash.setEncoding('hex');
            fd.on('end', function() { hash.end(); resolveOuter(hash.read()); });
            fd.pipe(hash);
        }
        catch(e) {
            reject(e);
        }
    });

    // Die Daten werden zurückgegeben
    return Buffer.from(result).reverse().toString('hex');
};

/**
 * Used to create a SHA2 hash.
 * 
 * @param {number} size Specifies the bit size of the hash. 256 | 384 | 523
 * @param {item} items Specifies the items to be hashed.
 * @return {string} Outputs the generated hash value as a hex string.
*/
function sha2F(size, ...items) {
    // Es wird geprüft ob es sich um zulässige Parameter handelt
    if(size === undefined || size === null) throw new Error('Invalid size data type');
    if(items === undefined || items === null) throw new Error('Invalid items data array');
    if(typeof items !== 'object' || Array.isArray(items) !== true) throw new Error('Invalid items data array')
    if(typeof size !== 'number') throw new Error('Invalid size data type');

    // Der Hash in der gewählten größe wird erstellt
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

/**
 * Used to create a SHA2d hash.
 * 
 * @param {number} size Specifies the bit size of the hash. 256 | 384 | 523
 * @param {item} items Specifies the items to be hashed.
 * @return {string} Outputs the generated hash value as a hex string.
*/
function sha2dF(size, ...items) {
    // Es wird geprüft ob es sich um zulässige Parameter handelt
    if(size === undefined || size === null) throw new Error('Invalid size data type');
    if(items === undefined || items === null) throw new Error('Invalid items data array');
    if(typeof items !== 'object' || Array.isArray(items) !== true) throw new Error('Invalid items data array')
    if(typeof size !== 'number') throw new Error('Invalid size data type');

    // Der Hash in der gewählten größe wird erstellt
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

/**
 * Used to create a SHA3 hash.
 * 
 * @param {number} size Specifies the bit size of the hash. 256 | 384 | 523
 * @param {item} items Specifies the items to be hashed.
 * @return {string} Outputs the generated hash value as a hex string.
*/
function sha3F(size, ...items) {
    // Es wird geprüft ob es sich um zulässige Parameter handelt
    if(size === undefined || size === null) throw new Error('Invalid size data type');
    if(items === undefined || items === null) throw new Error('Invalid items data array');
    if(typeof items !== 'object' || Array.isArray(items) !== true) throw new Error('Invalid items data array')
    if(typeof size !== 'number') throw new Error('Invalid size data type');

    // Der Hash in der gewählten größe wird erstellt
    if(size === 256) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_256(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_384(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = sha3_512(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

/**
 * Used to create a Keccak hash.
 * 
 * @param {number} size Specifies the bit size of the hash. 256 | 384 | 523
 * @param {item} items Specifies the items to be hashed.
 * @return {string} Outputs the generated hash value as a hex string.
*/
function keccakF(size, ...items) {
    // Es wird geprüft ob es sich um zulässige Parameter handelt
    if(size === undefined || size === null) throw new Error('Invalid size data type');
    if(items === undefined || items === null) throw new Error('Invalid items data array');
    if(typeof items !== 'object' || Array.isArray(items) !== true) throw new Error('Invalid items data array')
    if(typeof size !== 'number') throw new Error('Invalid size data type');

    // Der Hash in der gewählten größe wird erstellt
    if(size === 256) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_256(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 384) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_384(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else if(size === 512) {
        // Es wird ein Hash aus den Daten erzeugt
        let hashed_data = keccak_512(inputs_to_string_block(...items));

        // Die Daten werden Reverst und als Hex zurückgegeben
        return Buffer.from(hashed_data).toString('hex');
    }
    else {
        throw new Error('Invalid hash size')
    }
};

/**
 * Used to derive a ristretto25519 schnorr key pair from a seed and a path.
 * This is not an official procedure, it is not compatible with standardized procedures.
 * 
 * @param {string} seed_hex_str Specifies the seed to use to derive the keys.
 * @param {string} path Specifies the path to use in combination with the seed to create a key pair.
 * @return {number} Returns a key pair object, this object consists of a public key and a private key.
*/
function getRistretto25519KeyPairFromSeedF(seed_hex_str, path) {
    // Es wird geprüft ob es sich um einen Zulässigen Hexstring handelt
    if(is_validate_hex_string(seed_hex_str) !== true) throw new Error('Invalid seed hex');

    // Es wird geprüft ob es sich um einen Zulässigen Path handelt
    if(is_validate_string(path) !== true) throw new Error('Invalid path');

    try{
        // Es wird mittels pbkdf2 ein Schlüssel aus dem Seed erezugt
        const pbkdf2_seed = pbkdf2(sha256, path, seed_hex_str, { c: 40, dkLen: 40 });

        // Die Aufagbe wird an die Rustlib übergeben
        let rust_lib_result = rust_lib.get_key_pair_from_hash_sr25519(sha3F(256, Buffer.from(pbkdf2_seed)));

        // Das Ergebnis wird zurückgegeben
        return { public_key:rust_lib_result.public_key, private_key:rust_lib_result.private_key, type:'ed25519_schnorr' };
    }
    catch(e) {
        throw e;
    }
};

/**
 * Used to derive a secp256k1 schnorr key pair from a seed and a path.
 * This is not an official procedure, it is not compatible with standardized procedures.
 * 
 * @param {string} seed_hex_str Specifies the seed to use to derive the keys.
 * @param {string} path Specifies the path to use in combination with the seed to create a key pair.
 * @return {number} Returns a key pair object, this object consists of a public key and a private key.
*/
function getSecp256k1SchnorrKeyPairFromSeedF(seed_hex_str, path) {
    // Es wird geprüft ob es sich um einen Zulässigen Hexstring handelt
    if(is_validate_hex_string(seed_hex_str) !== true) throw new Error('Invalid seed hex');

    // Es wird geprüft ob es sich um einen Zulässigen Path handelt
    if(is_validate_string(path) !== true) throw new Error('Invalid path');

    try {
        // Es wird mittels pbkdf2 ein Schlüssel aus dem Seed erezugt
        const pbkdf2_seed = pbkdf2(sha256, path, seed_hex_str, { c: 40, dkLen: 40 });

        // Es wird versucht einen Privaten Schlüssel zu erstellen
        const priv_key = utils.hashToPrivateKey(pbkdf2_seed);

        // Es wird ein Öffentlicher Schnorr Schlüssel abgeleitet
        const public_shnorr_key = schnorr.getPublicKey(priv_key);

        // Das Schlüsselpaar wird zurückgegeben
        return { public_key:Buffer.from(public_shnorr_key).toString('hex'), private_key:Buffer.from(priv_key).toString('hex'), type:"secp256k1_schnorr" };
    }
    catch(e) {
        throw e;
    }
};

/**
 * Used to derive a bls12-381 key pair from a seed and a path.
 * This is not an official procedure, it is not compatible with standardized procedures.
 * 
 * @param {string} seed_hex_str Specifies the seed to use to derive the keys.
 * @param {string} path Specifies the path to use in combination with the seed to create a key pair.
 * @return {number} Returns a key pair object, this object consists of a public key and a private key.
*/
function getBLS12381KeyPairFromSeedF(seed_hex_str, path) {
    // Es wird geprüft ob es sich um einen Zulässigen Hexstring handelt
    if(is_validate_hex_string(seed_hex_str) !== true) throw new Error('Invalid seed hex');

    // Es wird geprüft ob es sich um einen Zulässigen Path handelt
    if(is_validate_string(path) !== true) throw new Error('Invalid path');

    try {
        // Es wird mittels pbkdf2 ein Schlüssel aus dem Seed erezugt
        const pbkdf2_seed = pbkdf2(sha256, path, seed_hex_str, { c: 40, dkLen: 40 });

        // Es wird versucht einen Privaten Schlüssel zu erstellen
        const priv_key = bls.utils.hashToPrivateKey(pbkdf2_seed);

        // Es wird ein Öffentlicher Schnorr Schlüssel abgeleitet
        let public_shnorr_key = bls.getPublicKey(priv_key); 

        // Das Schlüsselpaar wird zurückgegeben
        return { public_key:Buffer.from(public_shnorr_key).toString('hex'), private_key:Buffer.from(priv_key).toString('hex'), type:"bls12_381" };
    }
    catch(e) {
        throw e;
    }
};

/**
 * Creates a cryptographic hex value, also known as a seed, from a mnemonic.
 * 
 * @param {string} bip_39_mnemonic Specifies the mnemonic to convert to the seed.
 * @return {string} Outputs the seed in hex from.
*/
function getSeedFromBip39MnemonicF(bip_39_mnemonic) {
    // Es wird geprüft ob es sich um den String handelt
    if(is_validate_string(bip_39_mnemonic) !== true) throw new Error('Invalid mnemonic');

    try {
        return bip39.mnemonicToSeedSync(bip_39_mnemonic).toString('hex');
    }
    catch(e) {
        throw e;
    }
};

/**
 * Used to create a 256-bit strong BIP32 mnemonic.
 * https://en.bitcoin.it/wiki/Seed_phrase
 * 
 * @param {array} wordlist Specifies an optional word list which can be used to construct the mnemonic, otherwise an English word list is used to construct the mnemonic.
 * @return {string} Returns a 24-word string.
*/
function generateBip39MnemonicF(wordlist=undefined) {
    return bip39.generateMnemonic(256, undefined, wordlist);
};

/**
 * Used to create a secp256k1 Schnorr signature
 * 
 * @param {string} private_key_hex Specifies the private key to be used for signing.
 * @param {string} digest_value Specifies the hash value to be signed.
 * @return {string} Outputs the signature in hex form.
*/
async function signDigestWithSecp256k1SchnorrF(private_key_hex, digest_value) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(private_key_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_hex_string(digest_value, 64) !== true) throw new Error('Invalid digest value');

    // Es wird eine Schnorr Signatur erstellt
    try {
        let signature = await schnorr.sign(new Uint8Array(Buffer.from(digest_value, 'utf8')), new Uint8Array(Buffer.from(private_key_hex, 'hex')));

        // Die Signatur wird in Bytes umgewandelt und zurückgegeben
        return Buffer.from(signature).toString('hex');
    }
    catch(e) {
        throw e; 
    }    
};

/**
 * Used to verify a secp256k1 Schnorr signature
 * 
 * @param {string} public_key_hex Specifies the public key to use for verification.
 * @param {string} signature_hex Specifies the signature in hex form.
 * @param {string} digest_value Indicates the value that was signed
 * @return {bool} Returns True if the signature is correct, False otherwise.
*/
async function verfiySecp256k1SchnorrSignatureF(public_key_hex, signature_hex, digest_value) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(public_key_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_hex_string(signature_hex, 128) !== true) throw new Error('Invalid signature value');
    if(is_validate_hex_string(digest_value, 64) !== true) throw new Error('Invalid digest value');

    try {
        // Der Öffentliche Schlüssel wird von einem Hex String in Bytes umgewandet
        let byted_public_key = Buffer.from(public_key_hex, 'hex');

        // Die Signatur wird von einem Hex String in Bytes umgewandelt
        let byted_signature = Buffer.from(signature_hex, 'hex');

        // Der Hashwert wird eingelesen
        let r_hash_value = Buffer.from(digest_value, 'utf8');

        // Das Ergebniss wird geprüft
        let result = await schnorr.verify(new Uint8Array(byted_signature), new Uint8Array(r_hash_value), new Uint8Array(byted_public_key));

        // Das Ergebnis wird zurückgegeben
        return (result === true);
    }
    catch(e) {
        throw e;
    }
};

/**
 * Used to create a Ristretto 25519 Schnorr signature
 * 
 * @param {string} private_key_hex Specifies the private Ristretto 25519 key.
 * @param {string} digest_value Specifies the hash value to be signed.
 * @return {string} Returns the Ristretto 25519 signature.
*/
async function signDigestWithRistretto25519SchnorrF(private_key_hex, digest_value) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(private_key_hex, 128) !== true) throw new Error('Invalid private key');
    if(is_validate_hex_string(digest_value, 64) !== true) throw new Error('Invalid digest value');

    // Wird Asynchrone ausgeführt
    let async_result = await new Promise((resolveOuter, reject) => {
        try{
            let sig = rust_lib.sign_digest_sr25519(private_key_hex, digest_value);
            resolveOuter(sig);
        }
        catch(e) {
            reject(e);
        }
    });

    // Die Signatur wird zurückgegeben
    return async_result;
};

/**
 * Used to verify a Ristretto 25519 Schnorr signature
 * 
 * @param {string} signature_hex Specifies the signature in hex format to be used for signature verification.
 * @param {string} public_key_hex Specifies the public key to be used for verification.
 * @param {string} digest_value Specifies the hash value to be used to verify the signature.
 * @return {bool} Returns True if the signature is correct, False otherwise.
*/
async function verfiyRistretto25519SchnorrSignatureF(signature_hex, public_key_hex, digest_value) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(public_key_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_hex_string(signature_hex, 128) !== true) throw new Error('Invalid signature value');
    if(is_validate_hex_string(digest_value, 64) !== true) throw new Error('Invalid digest value');

    // Wird Asynchrone ausgeführt
    let async_result = await new Promise((resolveOuter, reject) => {
        try {
            let sig = rust_lib.verfiy_digest_sign_sr25519(public_key_hex, digest_value, signature_hex);
            resolveOuter(sig);
        }
        catch(e) {
            reject(e);
        }
    });

    // Die Signatur wird zurückgegeben
    return async_result;
};

/**
 * Used to generate a BLS12-381 signature.
 * 
 * @param {string} priv_key_hex Specifies the private BLS key to be used to create a signature.
 * @param {string} digest_hex Specifies the hash value to be signed by the private key.
 * @return {string} Returns the BLS12-381 signature as a hex value.
*/
async function signDigestWithBLS12381PrivateKey(priv_key_hex, digest_hex) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(priv_key_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_hex_string(digest_hex, 64) !== true) throw new Error('Invalid digest value');

    // Die Signatur wird erzeugt
    try{
        let signature = await bls.sign(digest_hex, priv_key_hex);

        // Die Signatur wird zurückgegeben
        return Buffer.from(signature).toString('hex');
    }
    catch(e) {
        throw e;
    }
};

/**
 * Used to verify BLS12-381 signatures.
 * 
 * @param {string} public_key_hex Specifies the public BLS12-381 key to be used to verify the signature.
 * @param {string} signature_hex Specifies the hex value to be used for signature verification.
 * @param {string} digest_hex Specifies the hash value which was signed and should be used for the check.
 * @return {bool} Returns True if the signature is valid, False otherwise.
*/
async function verifyBLS12381Signature(public_key_hex, signature_hex, digest_hex) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(public_key_hex, 96) !== true) throw new Error('Invalid public key');
    if(is_validate_hex_string(signature_hex, 192) !== true) throw new Error('Invalid signature value');
    if(is_validate_hex_string(digest_hex, 64) !== true) throw new Error('Invalid digest value');

    // Die Signatur wird geprüft
    try {
        let verify_result = await bls.verify(Buffer.from(signature_hex, 'hex'), Buffer.from(digest_hex, 'hex'), Buffer.from(public_key_hex, 'hex'));

        // Das Ergebniss wird zurückgegeben
        return verify_result;
    }
    catch(e) {
        throw e; 
    }
};

/**
 * Used to verify an Ethereum based signature
 * 
 * @param {string} address Specifies the Web3 Ethereum address to verify the signature.
 * @param {string} signature_hex Specifies the signature in hex format.
 * @param {string} digest_hex Specifies the hash value used for signing.
 * @return {bool} Returns True if the signature is valid, False in any other case.
*/
async function validateWeb3EthereumMessageSignature(address, signature_hex, digest_hex) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(digest_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_string(signature_hex) !== true) throw new Error('Invalid digest value');
    if(is_validate_string(address) !== true) throw new Error('Invalid public key');

    try{
        // Es wird geprüft ob die Signatur übereinstimmt
        let check_value = web3.utils.verifyMessage(digest_hex, signature_hex); 

        // Es wird geprüft ob es sich um die selben Adressen handelt
        return web3.utils.getAddress(address) === check_value;
    }
    catch(e) {
        throw e; 
    }
};

/**
 * Used to verify a Bitcoin based signature
 * 
 * @param {string} address Specifies the bitcoin p2wpkh address to use.
 * @param {string} base64_signature Specifies the signature as a Base64 string.
 * @return {bool} If the signature is valid, a True is returned, otherwise a False is returned.
*/
async function validateBitcoinSegwitMessageSignature(address, base64_signature, digest_hex) {
    // Es wird geprüft ob die Verwendeten Parameter korrekt sind
    if(is_validate_hex_string(digest_hex, 64) !== true) throw new Error('Invalid public key');
    if(is_validate_string(base64_signature) !== true) throw new Error('Invalid digest value');
    if(is_validate_string(address) !== true) throw new Error('Invalid public key');

    try{ 
        // Es wird geprüft ob die Signatur korrekt ist
        let btc_m_result = bitcoinMessage.verify(digest_hex, address, base64_signature, undefined, true);
        return btc_m_result;
    } 
    catch(e) {
        throw e;
    }
};

/**
 * Used to check if it is an Ethereum address (SYNC)
 * 
 * @param {string} eth_addr_str Specifies the ethereum address to be checked.
 * @return {bool} True if it is a ethereum address. False if it is not a ethereum address.
*/
async function isValidateEthereumAddress(eth_addr_str) {
    // Es wird geprüft ob es sich um einen String handelt
    if(eth_addr_str === undefined || eth_addr_str === null || typeof eth_addr_str !== 'string') return false;
    try {
        let w3_value = web3.utils.isAddress(eth_addr_str);
        if(w3_value !== true) return false;
        return true;
    }
    catch(e) {
        return false;
    }
};

/**
 * Used to check if it is an Ethereum address (SYNC)
 * 
 * @param {string} eth_addr_str Specifies the ethereum address to be checked.
 * @return {bool} True if it is a ethereum address. False if it is not a ethereum address.
*/
function isValidateEthereumAddressSync(eth_addr_str) {
    // Es wird geprüft ob es sich um einen String handelt
    if(eth_addr_str === undefined || eth_addr_str === null || typeof eth_addr_str !== 'string') return false;
    try {
        let w3_value = web3.utils.isAddress(eth_addr_str);
        if(w3_value !== true) return false;
        return true;
    }
    catch(e) {
        return false;
    }
};

/**
 * Used to check if it is a bitcoin address
 * it must be a p2wpkh address, otherwise it is invalid
 * 
 * @param {string} btc_addr_str Specifies the p2wpkh bitcoin address to be checked.
 * @return {bool} True if it is a bitcoin address. False if it is not a bitcoin address.
*/
async function isValidateBitcoinAddress(btc_addr_str) {
    // Es wird geprüft ob es sich um einen String handelt
    if(btc_addr_str === undefined || btc_addr_str === null || typeof btc_addr_str !== 'string') return false;
    try {
        if(validate(btc_addr_str) !== true) return false;
        let info = getAddressInfo(btc_addr_str);
        if(info.type !== 'p2wpkh') return false;
        return true;
    }
    catch(e) {
        return false;
    }
};

/**
 * Warning: I have no idea if that is safe, do not use !!! EXPERIMENTAL!!!!
 * Used to generate a public phantom key (SECP256K1)
 * Source: https://qurasofficial.medium.com/what-are-stealth-address-and-how-do-they-work-334f155f16fc :: (ISAP)
 * 
 * @param {string} origin_reciver_pk Specifies the recipient's public key in hex form.
 * @return {number} If successful, returns an object with a one-time public key.
*/
async function computePublicPhantomKeyForRecivingSecp256k1F(origin_reciver_pk) {
    // Es wird ein Einmaliges Schlüsselpaar erzeugt
    let one_time_priv_key = utils.randomPrivateKey();
    let one_time_priv_key_int = BigInt('0x' + utils.bytesToHex(one_time_priv_key));
    let one_time_pub_key = Point.fromPrivateKey(one_time_priv_key);

    // Der Öffentliche Schlüssel wird eingelesen
    let readed_reciver_pkey = Point.fromHex(origin_reciver_pk);

    // Der DH Schlüssel wird erzeugt
    let dh_secret = readed_reciver_pkey.multiply(one_time_priv_key_int);

    // Es wird ein Hash aus dem DH Schlüssel erzeugt
    let dh_hash = BigInt('0x' + keccakF(256, dh_secret.toHexX(true)));

    // Die Empfänger Adresse wird erzeugt
    let phantom_pkey = Point.BASE.multiply(dh_hash).add(readed_reciver_pkey);

    // Es wird ein Image Hash aus dem OneTimePublicKey sowie dem PublicPhantomKey erzeugt
    let image_hash = keccakF(256, phantom_pkey.toHexX(), one_time_pub_key.toHexX())

    // Die neue Adresse sowie der Öffentliche Schlüssel werden verwendet
    return { image:image_hash, spnd_pkey:phantom_pkey.toHexX(), ot_pkey:one_time_pub_key.toHexX(true) };
};

/**
 * Warning: I have no idea if that is safe, do not use !!! EXPERIMENTAL!!!!
 * Used to generate the private key for a corresponding public phantom key (SECP256K1)
 * Source: https://qurasofficial.medium.com/what-are-stealth-address-and-how-do-they-work-334f155f16fc :: (ISAP)
 * 
 * @param {string} local_priv_key Local Private Key.
 * @param {string} one_time_pky One-time public key.
 * @param {string} compare_image_hash Specifies the comparison hash, this represents the actual address to which funds are paid.
 * @return {object} If successful, returns an object with a private key { image:'', ot_pub_key:'', ot_prv_key:'' }
*/
async function computePublicPrivatePhantomKeyForSendingSecp256k1F(local_priv_key, one_time_pky, compare_image_hash=null) {
    // Der Private Schlüssel wird eingelesen
    let local_priv_key_int = BigInt('0x' + local_priv_key);

    // Der Einmalige Öffentliche Paarungs Schlüssel wird eingelesen
    let one_time_pair_key_points = Point.fromHex(one_time_pky)

    // Der DH Schlüssel wird nachgebaut
    let dh_secret = one_time_pair_key_points.multiply(local_priv_key_int);

    // Es wird ein Hash aus dem DH Schlüssel erzeugt
    let dh_hash = BigInt('0x' + keccakF(256, dh_secret.toHexX()));

    // Der Private Phantom Schlüssel wird erzeugt
    let phantom_pr_key_int = utils.mod(local_priv_key_int + dh_hash, CURVE.n);
    let phantom_pr_key_bytes = utils.hexToBytes(phantom_pr_key_int.toString(16).padStart(64, 0));

    // Es wird geprüft ob es sich um einen Gültigen Privaten Schlüssel handelt
    if(utils.isValidPrivateKey(phantom_pr_key_int) !== true) throw new Error('Invalid constructed private key');

    // Der Öffentliche Schnorschlüssel wird erstellt
    let public_schnorr_key = schnorr.getPublicKey(phantom_pr_key_bytes);

    // Es wird ein Image Hash aus dem OneTimePublicKey sowie dem PublicPhantomKey erzeugt
    let image_hash = keccakF(256, utils.bytesToHex(public_schnorr_key), one_time_pair_key_points.toHexX());

    // Es wird geprüft ob ein Image Hash zum überprüfen vorhanden ist
    if(compare_image_hash !== null) if(compare_image_hash !== image_hash) throw new Error('Not equal image hash')

    // Die Daten werden zurückgegen
    return { image:image_hash, ot_pub_key:utils.bytesToHex(public_schnorr_key), ot_prv_key:utils.bytesToHex(phantom_pr_key_bytes) }
};


// Die Funktionen werden Exportiert
module.exports = {
    sha2:sha2F,
    sha3:sha3F,
    sha2d:sha2dF,
    keccak:keccakF,
    getHashOfFile:getHashOfFileF,
    swiftyHash:require('./swiftyh'),
    alt_coin_crypto: {
        isValidateEthereumAddressSync:isValidateEthereumAddressSync
    },
    bip32:{
        generateBip39Mnemonic:generateBip39MnemonicF,
        getSeedFromBip39Mnemonic:getSeedFromBip39MnemonicF
    },
    ecc:{
        secp256k1:{
            computePublicPrivatePhantomKeyForSending:computePublicPrivatePhantomKeyForSendingSecp256k1F,
            computePublicPhantomKeyForRecivin:computePublicPhantomKeyForRecivingSecp256k1F,
            getKeyPairFromSeed:getSecp256k1SchnorrKeyPairFromSeedF,
            verifySignature:verfiySecp256k1SchnorrSignatureF,
            signDigest:signDigestWithSecp256k1SchnorrF,
        },
        curve25519:{
            getKeyPairFromSeed:getRistretto25519KeyPairFromSeedF,
            verifySignature:verfiyRistretto25519SchnorrSignatureF,
            signDigest:signDigestWithRistretto25519SchnorrF,
        },
        bls12381:{
            getKeyPairFromSeed:getBLS12381KeyPairFromSeedF,
            verifySignature:verifyBLS12381Signature,
            signDigest:signDigestWithBLS12381PrivateKey,
        }
    },
    altchain:{
        validateBitcoinSegwitMessageSignature:validateBitcoinSegwitMessageSignature,
        validateWeb3EthereumMessageSignature:validateWeb3EthereumMessageSignature,
        isValidateEthereumAddress:isValidateEthereumAddress,
        isValidateBitcoinAddress:isValidateBitcoinAddress
    }
};

/*
(async () => {
    // Es wird ein Hash aus dem Unlocking Key erstellt
    let sha3_value = sha3F(256, '122b1f012d1d2a627c97c15c43fa7692e9886eb805c8afa70dfb121a1f0012071f00');

    // Es wird ein Zufälliger Mnemonic erzeugt
    let mnic = 'draft brick reunion icon aim witness enroll soda lunch letter oil junior piece dream icon auto seed shoulder around embark world salt cupboard shift' //generateBip39MnemonicF();
    let seed = getSeedFromBip39MnemonicF(mnic);

    // Es wird ein BLS-12-381 Schlüssel erzeugt
    let key_pair_bls = getBLS12381KeyPairFromSeedF(seed, "1/0/1");

    // Es wird ein Curve25519 Schlüsselpaar erzeugt
    let key_pair_curve25519 = getRistretto25519KeyPairFromSeedF(seed, "2/0/1");

    // Es wird ein Secp256k1 Schnorr Schlüsselpaar erzeugt
    let key_pair_secp256k1 = getSecp256k1SchnorrKeyPairFromSeedF(seed, "3/0/1");

    // Es wird eine BLS Signatur erzeugt
    let bls_signature = await signDigestWithBLS12381PrivateKey(key_pair_bls.private_key, sha3_value);

    // Es wird eine Secp256k1 Schnorr Signatur erzeugt
    let secp256k1_signature = await signDigestWithSecp256k1SchnorrF(key_pair_secp256k1.private_key, sha3_value);

    // Es wird eine Risotto Curve erzeugt
    let curve25519_siganture = await signDigestWithRistretto25519SchnorrF(key_pair_curve25519.private_key, sha3_value);

    // Die Signaturen werden geprüft
    let bls_sig = await verifyBLS12381Signature(key_pair_bls.public_key, bls_signature, sha3_value);
    let curve25519_sig = await verfiyRistretto25519SchnorrSignatureF(curve25519_siganture, key_pair_curve25519.public_key, sha3_value);
    let secp256k1_sig = await verfiySecp256k1SchnorrSignatureF(key_pair_secp256k1.public_key, secp256k1_signature, sha3_value);

    // Die Ethereum / Bitcoin Signaturen werden geprüft
    let eth_sig = await validateWeb3EthereumMessageSignature("0x2a627c97c15c43Fa7692E9886EB805c8AfA70DfB", "0x1fe929f3bf9402eb2701601b725890f64ff00882b33a44437c4d0de6cda9cce40509f7dd48a1f7f64da57a2412672855e424d5cace8f3986ab7093e562c0e9ea1b", sha3_value);
    let btc_sig = await validateBitcoinSegwitMessageSignature("bc1qfp7fkf095pae5xlmf9u6pzh29mz9sgh6tvudm9", "IGW9p7+BTuxLDktMWxpGUPZNkZgZci7g6tdtxTvnuwq+ZF/o7xvWDoro0WEzSJw5qlHhFYon5CFm+FBI724h+e4=", sha3_value);

    console.log('Mnemonic:                                  ', mnic);
    console.log('');
    console.log('BLS-12-381 Publickey:                      ', key_pair_bls.public_key);
    console.log('Curve25519 Publickey:                      ', key_pair_curve25519.public_key);
    console.log('Secp256k1 Publickey:                       ', key_pair_secp256k1.public_key);
    console.log('SHA3_256-Bit message hash:                 ', sha3_value);
    console.log('Curve25519 Sig check result:               ', curve25519_sig);
    console.log('Secp256k1 Sig check result:                ' , secp256k1_sig);
    console.log('BLS-12-381 Sig check result:               ', bls_sig);
    console.log('Ethereum Address Sig check result:         ', eth_sig);
    console.log('Bitcoin Address Sig check result:          ', btc_sig);
})();*/