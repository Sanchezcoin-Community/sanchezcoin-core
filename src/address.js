const { Keccak, SHA3 } = require('sha3');
const { bech32m} = require('bech32');
const crc32 = require('crc/crc32');
const base32 = require('base32');



// Die Adresse 
class Address {
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
        let keccak_hash = new Keccak(512);
        keccak_hash.update(Buffer.from(hex_block, 'hex').reverse());

        // Es wird ein SHA3-256 Hash erzeugt
        let sha3_256_hash = new SHA3(256);
        sha3_256_hash.update(keccak_hash.digest().reverse());

        // Der Hash wird zurückgegeben
        return sha3_256_hash.digest().reverse().toString('hex');
    };

    // Gibt die Adresse als String aus
    toString(header="rick") {
        let words = bech32m.toWords(Buffer.from(this.computeHash(), 'hex'));
        return bech32m.encode(`${header}h`, words);
    };

    // Gibt den Hash der Bech32 Adresse aus
    computeAddressHash(header="rick") {
        let adr_bech32_hash = new SHA3(256);
        adr_bech32_hash.update(Buffer.from(this.toString(header).toLowerCase(), 'ascii'));
        return adr_bech32_hash.digest('hex');
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

        // Der Header wird in Bytes umgewandelt
        let header_bytes = Buffer.from(header.toLowerCase(), 'ascii');

        // Aus dem Header und dem PublicKey wird eine Checksume erstellt
        let compared_data = Buffer.from([ ...header_bytes, ...raw_bytes_hex_block]);
        let chsum = crc32(compared_data).toString(16);
        let bchsum = Buffer.from(chsum, 'hex');

        // Der PublicKey wird mit base32 umgewandelt
        let based_value = base32.encode(Buffer.from([ ...raw_bytes_hex_block, ...bchsum ]));

        // Die Finale Adresse wird erstellt
        return `${header}p1${this.calgo}b${based_value}`
    };

    // Gibt einen Hash der Fertigen Adresse aus
    computeAddressHash(header='rick') {
        let adr_bech32_hash = new SHA3(256);
        adr_bech32_hash.update(Buffer.from(this.toString(header).toLowerCase(), 'ascii'));
        return adr_bech32_hash.digest('hex');
    };
};

// Gibt einen Address HashOnlyWert 
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
        let new_h = new SHA3(256);
        let pre_str = `${this.crypto_alg.toUpperCase()}::${this.public_key.toLowerCase()}`;
        new_h.update(Buffer.from(pre_str, 'utf8'));
        return new_h.digest('hex').toLowerCase();
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
        return new Address(this.needed, ...filtered_items);
    };
};

// Erzeugt einen Hash aus einem Öffentlichen Schlüssel
function publicKeyToHash(algo, pkey) {
    let new_h = new SHA3(256);
    let pre_str = `${algo.toUpperCase()}::${pkey.toLowerCase()}`;
    new_h.update(Buffer.from(pre_str, 'utf8'));
    return new PublicKeyHashOnly(new_h.digest('hex').toLowerCase());
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
        //publicKeyToHash("ed25519", "207a067892821e25d770f1fba0c47c11ff4b813e54162ece9eb839e076231ab6")
    ];

    let public_key_a_box = new AddressSigBox(2, ...public_key_a);
    console.log('Bech32 Adress:       ', public_key_a_box.toAddress().toString());

    let public_key_b = [
        new PublicKeyHashOnly("42a2be8a0221def13b6ba0665045ffca6a9f18754cb934e1f5c6a5f244eda684"),
        new PublicKeySignaturePair('207a067892821e25d770f1fba0c47c11ff4b813e54162ece9eb839e076231ab6', 'e62e9842765ab06c3e2d55c5b2e18ab8f61934b13e457b9ae0fd5ebcba611249dc7ddd6a8e32a14ed3dac2bc288391715f2e5db747636c737cfd1fa870c40c0e', 'ed25519')
    ];

    let public_key_b_box = new AddressSigBox(2, ...public_key_b);
    console.log('Bech32 Adress:       ', public_key_b_box.toAddress().toString());

    let plain_public_key_ed = new PlainKeyAddress('ed', "207a067892821e25d770f1fba0c47c11ff4b813e54162ece9eb839e076231ab6");
    console.log('Bech32 Pkey-Adress:  ', plain_public_key_ed.toString());

    let plain_public_key_secp = new PlainKeyAddress('sp', "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff");
    console.log('Bech32 Pkey-Adress:  ', plain_public_key_secp.toString());

    let plain_public_key_bls = new PlainKeyAddress('bs', 'a427f64357561bffc7f21693e5fbe5436d9cfdda7683fb64747f781481265c950ed3250f127b156342073d7619ba102b');
    console.log('Bech32 Pkey-Adress:  ', plain_public_key_bls.toString());
})();


// Das Objekt wird exportiert
module.exports = {
    PublicKeySignaturePair:PublicKeySignaturePair,
    PlainKeyAddress:PlainKeyAddress,
    publicKeyToHash:publicKeyToHash,
    isPkhAOrIsPPK:isPkhAOrIsPPK,
    AddressSigBox:AddressSigBox,
    Address:Address,
};