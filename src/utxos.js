const { SHA3 } = require('sha3');


// Wird verwendet um neue Coins zu Generieren
class CoinbaseInput {
    constructor() {}

    // Gibt das Input als RAW Daten aus
    getRawData() {
        return `0000000000000000000000000000000000000000000000000000000000000000ffffffff`
    }
};

// Wird verendet um ein Unspent Output zu übertragen
class TxInput {
    constructor(txId, outputHight) {
        // Die Parameter werden überprüft
        if(typeof blockHight !== 'number' || blockHight < 0) throw new Error('Invalid output transaction hight');
        if(typeof txId !== 'string' || txId.length !== 64) throw new Error('Invalid transaction id');

        // Die Parameter werden abgeseichert
        this.outputHight = outputHight;
        this.txId = txId;
    }

    // Gibt das Input als RAW Daten aus
    getRawData() {
        const fixed_length_hight = this.outputHight.toString(16).toUpperCase().padStart(4, 0);
        return `${this.txId}${fixed_length_hight}`;
    }
};

// Stellt einen nicht Ausgegeben Wert dar
class UnspentOutput {
    constructor(reciver_address, amount, bLockTime, dtLockTime) {
        this.reciver_address = reciver_address;
        this.dtLockTime = dtLockTime;
        this.bLockTime = bLockTime;
        this.amount = amount;
    }

    // Gibt das Input als RAW Daten aus
    getRawData() {
        const hexed_amount = this.amount.toString(16);
        const amount_len_hex = hexed_amount.length.toString(16).toUpperCase().padStart(4, 0);
        return `${amount_len_hex}${hexed_amount}${this.reciver_address}`;
    }
};

// Stellt einen nicht Ausgegeben Wer dar, dieser wird als Minting Commitment bezeichnet
class UnspentMintingCommitmentOutput {
    constructor(c_algo, owner_public_key, amount) {
        this.owner_public_key = owner_public_key;
        this.amount = amount;
        this.c_algo = c_algo;
    };
};

// Wird verwendet um ein neues NFT zu Minten
class MintNftInput {
    constructor(tx_id, output_hight, nft_data, minter_pkey, minter_sig) {
        this.output_hight = output_hight;
        this.minter_pkey = minter_pkey;
        this.minter_sig = minter_sig;
        this.nft_data = nft_data;
        this.tx_id = tx_id;
    };
};

// Wird verwendet um ein IPFS basiertes NFT zu Minten
class MintIpfsNftInput {
    constructor(tx_id, output_hight, ipfs_data_hash, minter_pkey, minter_sig) {
        this.ipfs_data_hash = ipfs_data_hash;
        this.output_hight = output_hight;
        this.minter_pkey = minter_pkey;
        this.minter_sig = minter_sig;
        this.tx_id = tx_id;
    };
};

// Wird verwendet um ein nicht ausgegebenes NFT auszugeben
class NftTxInput {
    constructor(tx_id, output_hight, nft_commitment_image) {
        this.nft_commitment_image = nft_commitment_image;
        this.output_hight = output_hight;
        this.tx_id = tx_id;
    }
};

// Wird verwendet um nicht ausgegeben NFT's darzustellen
class NftUnspentOutput {
    constructor(nft_commitment_image, reciver_address, amount) {
        this.nft_commitment_image = nft_commitment_image;
        this.reciver_address = reciver_address;
        this.amount = amount;
    };
};

// Wird verwendet um einen X Byte großen Datensatz in die Blockchain zu schreiben
class NotSpendlabelMessageOutput {
    constructor(data) {
        this.data = data;
    };
};

// Wird verwendet um einen NFT zu vernichten
class BurnNftOutput {
    constructor(nft_commitment_image, amount) {
        this.nft_commitment_image = nft_commitment_image;
        this.amount = amount;
    };
};


// Die Klassen werden Exportiert
module.exports = {
    UnspentMintingCommitmentOutput:UnspentMintingCommitmentOutput,
    NotSpendlabelMessageOutput:NotSpendlabelMessageOutput,
    NftUnspentOutput:NftUnspentOutput,
    MintIpfsNftInput:MintIpfsNftInput,
    BurnNftOutput:BurnNftOutput,
    UnspentOutput:UnspentOutput,
    CoinbaseInput:CoinbaseInput,
    MintNftInput:MintNftInput,
    NftTxInput:NftTxInput,
    TxInput:TxInput
};