const { sha3, keccak } = require('sanchez-crypto');
const { bech32m} = require('bech32');


// Gibt die Möglichen Kryptographischen Verfahren für Adressen an
const ADDRESS_CRYPTO_CURVE25519 = 1;
const ADDRESS_CRYPTO_SECP256K1 = 2;

// Speichert den Header für die Adresstypen und zugehörige verfahren ab
const ADDRESS_HEADER_CONTRACT_HASH_ADDRESS = 'cn';
const ADDRESS_HEADER_CURVE25519_ADDRESS = 'c';
const ADDRESS_HEADER_SECP256K1_ADDRESS = 's';


// Die Normale Adresse 
class ConditionHashAddress {
    // Erzeugt ein neues Addressobjekt
    constructor(n, ...public_key_hashes) {
        this.public_key_hashes = public_key_hashes;
        this.n = n;
    };

    // Erzeugt aus der Adresse einen Hexblock
    getAddressHexBlock() {
        // Die benötigte Anzahl von den benötigten Signaturen wird ermittelt
        let hexed_n = this.n.toString(16);
        let hexed_m = this.public_key_hashes.length.toString(16);

        // Es wird geprüft ob sich nur ein Wert in der Liste befindet
        if(this.public_key_hashes.length <= 1) {
            hexed_n = 1; hexed_m = 1;
        }

        // Die PublicKeys / Hashes werden sortiert
        let sorted_address_list = this.public_key_hashes.sort();

        // Die Sortierten Keys werden zusammengeführt
        let merged_public_keys = sorted_address_list.join('');

        // Die Daten werden zusammengeführt
        let full_merged_public_keys_and_n_m = [ hexed_n, merged_public_keys, hexed_m ].join('');

        // Die Hexbytes werden erzeugt
        let byted_hex = Buffer.from(full_merged_public_keys_and_n_m, 'ascii');

        // Der Hexblock wird zurückgegeben
        return byted_hex.toString('hex').toLowerCase();
    };

    // Erzeugt einen Hash aus der Adresse
    computeHash() {
        // Es wird ein Hexblock aus der Adresse erstellt
        let hex_block = this.getAddressHexBlock();

        // Es wird ein Keccak-512 Hash erstellt
        let keccak_hash = keccak(512, hex_block);

        // Der Hash wird zurückgegeben
        return sha3(256, keccak_hash);
    };

    // Gibt die Adresse als String aus
    toString(header="rick") {
        let words = bech32m.toWords(Buffer.from(this.computeHash(), 'hex'));
        return bech32m.encode(`${header}${ADDRESS_HEADER_CONTRACT_HASH_ADDRESS}`, words);
    };

    // Gibt den Plainwert der Adresse aus
    getPlainHexValue() {
        return this.computeHash();
    };

    // Gibt den Hash der Bech32 Adresse aus
    computeAddressHash(header="rick") {
        return sha3(this.this.toString(header).toLowerCase());
    };
};

// Wird verwendet um eine PlainKey als Adresse dazustellen
class PlainKeyAddress {
    constructor(calgo, pkey, by_spend_hash=false) {
        this.by_spend_hash = by_spend_hash;
        this.calgo = calgo;
        this.pkey = pkey;
    };

    // Gibt die Adresse als String aus
    toString(header='rick') {
        // Der RAW Hexblock wird abgerufen
        let raw_bytes_hex_block = Buffer.from(this.pkey, 'hex');

        // Die Finale Adresse wird erstellt
        let words = bech32m.toWords(raw_bytes_hex_block);
        if(this.calgo === ADDRESS_CRYPTO_CURVE25519) {
            return bech32m.encode(`${header}${ADDRESS_HEADER_CURVE25519_ADDRESS}`, words);
        }
        else if(this.calgo === ADDRESS_CRYPTO_SECP256K1) {
            return bech32m.encode(`${header}${ADDRESS_HEADER_SECP256K1_ADDRESS}`, words);
        }
        else {
            throw new Error('Unkown crypto alg');
        }
    };

    // Gibt den Plainwert der Adresse aus
    getPlainHexValue() {
        return this.pkey;
    };

    // Gibt einen Hash der Fertigen Adresse aus
    computeAddressHash(header='rick') {
        return sha3(256, this.toString(header).toLowerCase());
    };
};

// Gibt einen Address HashOnlyWert an
class PublicKeyHashOnly {
    constructor(address_hash) {
        this.address_hash = address_hash;
    };

    // Gibt den Aktuellen Hash aus
    pkeyHash() {
        return this.address_hash.toLowerCase();
    };
};

// Gibt einen Adress Hash mit einer Signatur zusammen an
class PublicKeySignaturePair {
    constructor(public_key, signature, crypto_alg) {
        this.public_key = public_key;
        this.crypto_alg = crypto_alg;
        this.signature = signature;
    };

    // Gibt den Hash der Öffentlichen Schlüssel aus
    pkeyHash() {
        return sha3(256, `${this.crypto_alg.toUpperCase()}::${this.public_key.toLowerCase()}`);
    };
};

// Wird verwendet um Adressen und Signaturen zusammenzuführen
class AddressSigBox {
    constructor(needed, ...items) {
        this.needed = needed;
        this.ins_items = [];
        for(const otem of items) {
            this.ins_items.push(otem);
        } 
    };

    // Gibt die fertige Adresse aus
    toAddress() {
        // Die einzelnen Hashes der 
        let filtered_items = this.ins_items.map(item => {
            if(item.constructor.name === 'PublicKeyHashOnly') return item.pkeyHash();
            else if(item.constructor.name === 'PublicKeySignaturePair') return item.pkeyHash();
            else throw new Error('Invalid type for adresssigbox');
        });

        // Die Adresse wird nachgebildet
        return new ConditionHashAddress(this.needed, ...filtered_items);
    };
};

// Erzeugt einen Hash aus einem Öffentlichen Schlüssel
function publicKeyToHash(algo, pkey) {
    return new PublicKeyHashOnly(sha3(256, `${algo.toUpperCase()}::${pkey.toLowerCase()}`));
};

// Gibt an ob es sich um eine Hash Adresse oder eine PublicKey Adresse handelt
function isPkhAOrIsPPK(adr_str_value, header) {
    // Es wird geprüft ob es sich um eine Hash basierende Adresse handelt

    // Es wird geprüft ob es sich um eine PublicKey basierende Adresse handelt

    // Es handelt sich um ein Unbekannten Adresstypen
};


// Wird als Test ausgeführt
(() => {
    let public_key_a = [
        new PublicKeyHashOnly("42a2be8a0221def13b6ba0665045ffca6a9f18754cb934e1f5c6a5f244eda684"),
        new PublicKeyHashOnly("1666509e0954795ba111c898ecd8ed2aafa051bf886aeea3653176c25b7290fb")
    ];
    let public_key_b = [
        new PublicKeyHashOnly("42a2be8a0221def13b6ba0665045ffca6a9f18754cb934e1f5c6a5f244eda684"),
        new PublicKeySignaturePair('207a067892821e25d770f1fba0c47c11ff4b813e54162ece9eb839e076231ab6', 'e62e9842765ab06c3e2d55c5b2e18ab8f61934b13e457b9ae0fd5ebcba611249dc7ddd6a8e32a14ed3dac2bc288391715f2e5db747636c737cfd1fa870c40c0e', 'ed25519')
    ];
    let public_key_a_box = new AddressSigBox(2, ...public_key_a);
    let public_key_b_box = new AddressSigBox(2, ...public_key_b);
    console.log('Bech32 Adress:       ', public_key_a_box.toAddress().toString());
    console.log('Bech32 Adress:       ', public_key_b_box.toAddress().toString());

    // Es wird geprüft ob die Adressen übereinstimmen
    if(public_key_a_box.toAddress().toString() !== public_key_b_box.toAddress().toString()) throw new Error('Unkown internal error')

    // Es wird eine Curve25519 Adresse erzeugt
    let plain_public_key_ed = new PlainKeyAddress(ADDRESS_CRYPTO_CURVE25519, "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff");
    console.log('Bech32 Pkey-Adress:  ', plain_public_key_ed.toString());
})();

// Das Objekt wird exportiert
module.exports = {
    PublicKeySignaturePair:PublicKeySignaturePair,
    PlainKeyAddress:PlainKeyAddress,
    publicKeyToHash:publicKeyToHash,
    isPkhAOrIsPPK:isPkhAOrIsPPK,
    AddressSigBox:AddressSigBox,
    ConditionHashAddress:ConditionHashAddress,
};