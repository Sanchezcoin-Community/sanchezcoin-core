const { intToVInt, isBigInt } = require('./vint');
const bigInt = require("big-integer");
const { SHA3 } = require('sha3');
const cbor = require('cbor');



// Wird verendet um ein Unspent Output zu übertragen
class TxInput {
    constructor(txId, outputHight) {
        // Die Parameter werden überprüft
        if(typeof outputHight !== 'number' || outputHight < 0 || outputHight > 4294967295) throw new Error('Invalid output transaction hight');
        if(typeof txId !== 'string' || txId.length !== 64) throw new Error('Invalid transaction id');

        // Die Parameter werden abgeseichert
        this.outputHight = outputHight;
        this.txId = txId;
    };

    // Gibt das Input als RAW Daten aus
    getRawData(start_prefix='01') {
        // Die Höhe wird in HEX umgewandelt
        const fixed_length_hight = this.outputHight.toString(16).toLowerCase().padStart(8, 0);

        // Das Output wird zurückgegeben
        return `${start_prefix}${this.txId}${fixed_length_hight}`.toLowerCase();
    };
};

// Wird verwendet um neue Coins zu Generieren
class CoinbaseInput extends TxInput{
    constructor() { super("0000000000000000000000000000000000000000000000000000000000000000", 4294967295); }
    getRawData() { return super.getRawData('00'); }
};

// Stellt einen nicht Ausgegeben Wert dar
class UnspentOutput {
    constructor(reciver_address_hash, amount=bigInt("0"), bLockTime=bigInt("0"), dtLockTime=bigInt("0")) {
        // Die Parameter werden überprüft
        if(typeof reciver_address_hash !== 'string' || reciver_address_hash.length !== 64) throw new Error('Invalid reciver address hash');
        if(isBigInt(bLockTime) !== true) throw new Error('Invalid locking block time data type');
        if(isBigInt(dtLockTime) !== true) throw new Error('Invalid locktimetamp data type');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(dtLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(bLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(amount <= bigInt("0")) throw new Error('Invalid amount value');

        this.reciver_address_hash = reciver_address_hash;
        this.dtLockTime = dtLockTime;
        this.bLockTime = bLockTime;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        const vint_amount = intToVInt(this.amount);

        // Die Locktime wird in ein VInt umgewandelt
        const vint_bLock_hight = intToVInt(this.bLockTime);

        // Der Zeitstempel wird umgewandelt
        const vint_lock_time = intToVInt(this.dtLockTime);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `01${vint_amount}${vint_bLock_hight}${vint_lock_time}${this.reciver_address_hash}`.toLowerCase();
    };
};

// Stellt einen nicht Ausgegeben Wer dar, dieser Wert wird direkt an einen Öffentlichen Schlüssel gesendet
class UnspentPKeyOutput {
    constructor(cryp_algo, reciver_address, amount, bLockTime=bigInt("0"), dtLockTime=bigInt(0), is_minting_commitment=false) {
        // Die Parameter werden überprüft
        if(typeof is_minting_commitment !== 'boolean') throw new Error('Invalid data type for mintin commitment');
        if(isBigInt(bLockTime) !== true) throw new Error('Invalid locking block time data type');
        if(isBigInt(dtLockTime) !== true) throw new Error('Invalid locktimetamp data type');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(typeof cryp_algo !== 'number') throw new Error('Invalid crypto algo');
        if(cryp_algo !== 1 && cryp_algo !== 0) throw new Error('Invalid crypto');
        if(dtLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(bLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(amount <= bigInt("0")) throw new Error('Invalid amount value');

        // Die Werte werden zwischengespeichert
        this.is_minting_commitment = is_minting_commitment;
        this.reciver_address = reciver_address;
        this.dtLockTime = dtLockTime;
        this.bLockTime = bLockTime;
        this.cryp_algo = cryp_algo;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        const vint_amount = intToVInt(this.amount);

        // Die Locktime wird in ein VInt umgewandelt
        const vint_bLock_hight = intToVInt(this.bLockTime);

        // Der Zeitstempel wird umgewandelt
        const vint_lock_time = intToVInt(this.dtLockTime);

        // Die Länge des Öffentlichen Schlüssels wird ermittelt
        const public_key_len = intToVInt(this.reciver_address.length);

        // Es wird ermittelt ob es sich um ein Minting Commitment handelt oder nicht
        const is_minting_commitment = (this.is_minting_commitment === true) ? "00" : "11";

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `02${vint_amount}${vint_bLock_hight}${vint_lock_time}${this.cryp_algo.toString(16)}${public_key_len}${this.reciver_address}${is_minting_commitment}`.toLowerCase();
    };

    // Erzeugt das Stake Minting Commitment
    computeStakeMintingCommitment(included_tx_id) {
        // Es wird geprüft ob das Output als Minting Commitment verwendet werden soll
        if(this.is_minting_commitment !== true) return "0000000000000000000000000000000000000000000000000000000000000000"

        // Es wird ein SHA3 Hash aus den RAW Daten erzeugt
    };
};

// Wird verwendet um ein neues NFT zu Minten
class MintNftInput {
    constructor(tx_id, output_hight, nft_data) {
        // Die Parameter werden überprüft
        if(typeof output_hight !== 'number' || output_hight < 0 || output_hight > 4294967295) throw new Error('Invalid output transaction hight');
        if(typeof tx_id !== 'string' || tx_id.length !== 64) throw new Error('Invalid transaction id');
        if(typeof nft_data !== 'object') throw new Error('Only json objects allowed as nft data');

        // Die Daten werden zwischengespeichert
        this.output_hight = output_hight;
        this.nft_data = nft_data;
        this.tx_id = tx_id;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Die NFT Daten werden umgewandelt
        const converted_nft_data = Buffer.from(cbor.encode(this.nft_data)).toString('hex');

        // Die Länge der NFT Daten wird ermittelt
        const vint_nft_data_len = intToVInt(converted_nft_data.length);

        // Die Höhe wird in HEX umgewandelt
        const fixed_length_hight = this.output_hight.toString(16).toUpperCase().padStart(4, 0);

        // Das Output wird zurückgegeben
        return `02${this.tx_id}${fixed_length_hight}${vint_nft_data_len}${converted_nft_data}`.toLowerCase();
    };

    // Gibt das NFT Commitment Image aus
    getCommitmentImage() {
        const new_sha = new SHA3(256);
        new_sha.update(Buffer.from(this.getRawData(), 'ascii').reverse());
        return new_sha.digest('hex').toLowerCase();
    };

    // Gibt die Daten also Bytes aus
    cborData() {
        let cbored = cbor.encode(this.data);
        return cbored;
    };
};

// Wird verwendet um ein nicht ausgegebenes NFT auszugeben
class NftTxInput {
    constructor(tx_id, output_hight, nft_commitment_image) {
        // Die Parameter werden überprüft
        if(typeof output_hight !== 'number' || output_hight < 0 || output_hight > 4294967295) throw new Error('Invalid output transaction hight');
        if(typeof nft_commitment_image !== 'string' || nft_commitment_image.length !== 64) throw new Error('Invalid nft commitment image');
        if(typeof tx_id !== 'string' || tx_id.length !== 64) throw new Error('Invalid transaction id');

        // Die Parameter werden abgespeichert
        this.nft_commitment_image = nft_commitment_image;
        this.output_hight = output_hight;
        this.tx_id = tx_id;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Die Höhe wird in HEX umgewandelt
        const fixed_length_hight = this.output_hight.toString(16).toUpperCase().padStart(4, 0);

        // Das Output wird zurückgegeben
        return `03${this.tx_id}${fixed_length_hight}${this.nft_commitment_image}`.toLowerCase();
    };

    // Gibt das NFT Commitment Image aus
    getCommitmentImage() {
        return this.nft_commitment_image.toLowerCase();
    };
};

// Wird verwendet um nicht ausgegeben NFT's darzustellen
class NftUnspentOutput {
    constructor(nft_commitment_image, reciver_address_hash, amount, bLockTime=bigInt("0"), dtLockTime=bigInt("0")) {
        // Die Parameter werden überprüft
        if(typeof reciver_address_hash !== 'string' || reciver_address_hash.length !== 64) throw new Error('Invalid reciver address hash');
        if(typeof nft_commitment_image !== 'string' || nft_commitment_image.length !== 64) throw new Error('Invalid nft commitment image');
        if(isBigInt(bLockTime) !== true) throw new Error('Invalid locking block time data type');
        if(isBigInt(dtLockTime) !== true) throw new Error('Invalid locktimetamp data type');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(dtLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(bLockTime < bigInt("0")) throw new Error('Invalid amount value');
        if(amount <= bigInt("0")) throw new Error('Invalid amount value');

        // Die Daten werden zwischengespeichert
        this.nft_commitment_image = nft_commitment_image;
        this.reciver_address_hash = reciver_address_hash;
        this.dtLockTime = dtLockTime;
        this.bLockTime = bLockTime;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        const vint_amount = intToVInt(this.amount);

        // Die Locktime wird in ein VInt umgewandelt
        const vint_bLock_hight = intToVInt(this.bLockTime);

        // Der Zeitstempel wird umgewandelt
        const vint_lock_time = intToVInt(this.dtLockTime);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `03${vint_amount}${vint_bLock_hight}${vint_lock_time}${this.reciver_address_hash}${this.nft_commitment_image}`.toLowerCase();
    };

    // Gibt das NFT Commitment Image aus
    getCommitmentImage() {
        return this.nft_commitment_image.toLowerCase();
    };
};

// Wird verwendet um einen X Byte großen Datensatz in die Blockchain zu schreiben
class NotSpendlabelMessageOutput {
    constructor(data) {
        // Es wird geprüft ob es sich bei den Daten um einen Buffer handelt
        if(typeof data !== 'object') throw new Error('Invalid data type');
        if(Buffer.isBuffer(data) !== true) throw new Error('Invalid data type');

        // Die Daten werden zwischengespeichert
        this.data = data;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Datensatz wird in Hex umgewandelt
        let hexed_data = this.data.toString('hex');

        // Die Länge der Hexdaten wird ermittelt
        let hex_data_len = intToVInt(hexed_data.length);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `04${hex_data_len}${hexed_data}`.toLowerCase();
    };
};

// Wird verwendet um einen NFT zu vernichten
class BurnNftOutput {
    constructor(nft_commitment_image, amount) {
        // Die Parameter werden überprüft
        if(typeof nft_commitment_image !== 'string' || nft_commitment_image.length !== 64) throw new Error('Invalid nft commitment image');
        if(isBigInt(amount) !== true) throw new Error('Invalid amount data type');
        if(amount <= bigInt("0")) throw new Error('Invalid amount value');

        // Speichert die NFT Daten ab
        this.nft_commitment_image = nft_commitment_image;
        this.amount = amount;
    };

    // Gibt das Input als RAW Daten aus
    getRawData() {
        // Der Betrag wird in ein vInt umgewandelt
        const vint_amount = intToVInt(this.amount);

        // Das vollständige UTXO wird als Lowercase Hex ausgegeben
        return `05${vint_amount}${this.nft_commitment_image}`.toLowerCase();
    };

    // Gibt das NFT Commitment Image aus
    getCommitmentImage() {
        return this.nft_commitment_image.toLowerCase();
    };
};


// Die Klassen werden Exportiert
module.exports = {
    NotSpendlabelMessageOutput:NotSpendlabelMessageOutput,
    UnspentPKeyOutput:UnspentPKeyOutput,
    NftUnspentOutput:NftUnspentOutput,
    BurnNftOutput:BurnNftOutput,
    UnspentOutput:UnspentOutput,
    CoinbaseInput:CoinbaseInput,
    MintNftInput:MintNftInput,
    NftTxInput:NftTxInput,
    TxInput:TxInput
};


// Es wird geprüft ob die Datei direkt gestartet wird, wenn ja wird die Funktion ausgeführt
if (require.main === module) (() => {
    // Coinbase Transaction
    let test_coinbase_input = new CoinbaseInput();
    let test_unspent_output = new UnspentOutput("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", bigInt("10000000"), bigInt("0"), bigInt("0"));
    let test_pkey_utxo = new UnspentPKeyOutput(1, "574e22e8bf71e1a888f38ec31bf477a8a674906123a9037385c9d2bab6981902", bigInt("10000000"), bigInt("0"), bigInt("0"), false);

    // Nft Minting
    let test_nft_mint = new MintNftInput("1248712441dbbf43bb37f91d626a020e7e0f4486f050142034b8a267b06a2f0c", 1, { name:"first morty nft", url:"abcdefgssdfsfsd" });
    let nft_input = new NftTxInput("35669191c32a9cfb532e5d79b09f2b0926c0faf27e7543f1fbe433bd94ae78d7", 0, test_nft_mint.getCommitmentImage());
    let unspent_nft = new NftUnspentOutput(nft_input.getCommitmentImage(), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", bigInt("1"), bigInt("0"), bigInt("0"));
    let burn_nft = new BurnNftOutput(unspent_nft.getCommitmentImage(), bigInt("1"));

    // Not Spendlabel Outputs
    let message_input = new NotSpendlabelMessageOutput(Buffer.from("November 13, 2022 This coin has no claim to money, I like Rick And Morty and that's why I created it.", 'ascii'));

    // Coinbase Input
    console.log(test_coinbase_input.getRawData());
    console.log('000000000000000000000000000000000000000000000000000000000000000000ffffffff')

    // Infotext
    console.log()
    console.log('Coinbase input :      ',test_coinbase_input.getRawData());
    console.log('Unspent output :      ',test_unspent_output.getRawData());
    console.log('Unspent pkey output : ',test_pkey_utxo.getRawData());
    console.log('Nft minting input :   ',test_nft_mint.getRawData());
    console.log('Nft input :           ',nft_input.getRawData())
    console.log('Unspent nft output :  ',unspent_nft.getRawData());
    console.log('Burn nft output :     ',burn_nft.getRawData());
    console.log('Message output :      ',message_input.getRawData());
    console.log()
})();