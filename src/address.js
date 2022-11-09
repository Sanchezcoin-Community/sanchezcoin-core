const { Keccak, SHA3 } = require('sha3');
let { bech32 } = require('bech32');


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
    toBech32String(header="ram") {
        // Der Hash wird mit Bech32 Umgewandelt
        let words = bech32.toWords(Buffer.from(this.computeHash(), 'hex'));
        return bech32.encode(header, words);
    };

    // Gibt den Hash der Bech32 Adresse aus
    bech32AddressHash(header="ram") {
        let adr_bech32_hash = new SHA3(256);
        adr_bech32_hash.update(Buffer.from(this.toBech32String(header), 'ascii'));
        return adr_bech32_hash.digest('hex');
    };
};



// Wird als Test ausgeführt
(() => {
    // Gibt die Liste der benötigten Schlüssel an
    let public_key_hashes = [
        "42a2be8a0221def13b6ba0665045ffca6a9f18754cb934e1f5c6a5f244eda684"
    ]

    // Erzeugt eine Test Adresse
    let address = new Address(1, ...public_key_hashes);
    console.log('Bech32 Address Hash: ',address.bech32AddressHash());
    console.log('Bech32 Adress:       ',address.toBech32String())
});


// Das Objekt wird exportiert
module.exports = Address;