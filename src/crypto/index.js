/*
    Unabhängig von Hashfunktion, Signaturfunktionen oder anderen Crypto Funtkionen,
    alle Endgültigen Ergebnisse werden als Hexadezimal String ausgegeben.
*/

// Die Bibliotheken werden Importiert
const { sha3_256, sha3_384, sha3_512, keccak_256, keccak_384, keccak_512 } = require('@noble/hashes/sha3');
const { is_validate_hex_string, is_validate_string } = require('./validate');
const { validate, getAddressInfo } = require('bitcoin-address-validation');
const { sha512, sha512_256, sha384 } = require('@noble/hashes/sha512');
const { schnorr, utils } = require('@noble/secp256k1');
const bitcoinMessage = require('bitcoinjs-message');
const { sha256 } = require('@noble/hashes/sha256');
const { pbkdf2 } = require('@noble/hashes/pbkdf2');
const rust_lib = require('./index.node');
const bls = require('@noble/bls12-381');
const crypto = require('crypto');
const bip39 = require('bip39');
const web3 = require('ethers');


// Wird verwendet um eingabe Werte zu einem String Block zu erstellen
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

// Wird verwendet um einen Hash aus einer Datei zu erzeugen
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

// Wird erstellt um einen einfachen SHA256 Hash zu erstellen
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

// Wird verwendet um einen Doppelten SHA256 Hash zu estellen (sha256d)
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

// Wird verwendet um einen SHA3 Hash zu erstellen
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

// Wird verwendet um einen Keccak Hash zu erstellen
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

// Gibt ein rs25519 Schlüsselpaar aus dem Seed aus (Determenistisch)
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

// Wird verwendet um ein secp256k1 Schnlüsselpaar abzuleiten (Determenistisch)
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

// Wird verwendet um ein bls12-381 Schlüsselpaar abzuleiten (Determenistisch)
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

// Wird verwendet um aus einem Bip32 Mnemonic einen Seed zu erstellen
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

// Wird verwendet um einen neuen BIP32 Mnemonic zu erstelen
function generateBip39MnemonicF(wordlist=undefined) {
    return bip39.generateMnemonic(256, undefined, wordlist);
};

// Wird verwendet um eine secp256k1 Schnorr Signatur zu erstellen
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

// Wird verwendet um eine secp256k1 Schnorr Signatur zu überprüfen
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

// Wird verwendet um eine Ristretto25519 Schnorr Signatur zu erstellen
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

// Wird verwendet um eine Ristretto25519 Schnorr Signatur zu überprüfen
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

// Wird verwendet um eine BLS_Signatur zu erzeugen
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

// Wird verwendet um eine BLS_Signatur zu überprüfen
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

// Wird verwendet um eine Ethereum Basierende Signatur zu überprüfen
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

// Wird verwendet um eine Bitcoin Basierende Signatur zu überprüfen
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

// Wird verwendet um zu überprüfen ob es sich um eine Ethereum Adresse handelt
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

// Wird verwendet um zu überprüfen ob es sich um eine Bitcoin Adresse handelt
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
}


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