const { securevm, HexString, BoolValue, HashValue, NullValue, NumberType, NumberValue, PublicKeyValue, ScriptInstanceData, SigScriptExecutionResults, AllowedScriptSignerPublicKeys, AlternativeBlockchainAddressValue, compareValues } = require('./obj_types');
const blockchain_crypto = require('blckcrypto');
const excpetions = require('./exceptions');
const op_codes = require('./opcodes');
let { bech32 } = require('bech32');


// Wird als Basis oder 0 Wert verwendet
const BASE_VALUE = "0000000000000000000000000000000000000000000000000000000000000000";

// Gibt an, weiviele Elemente sich Maximal auf dem Parren Cube Stack befunden dürfens
const MAX_PARREN_ITEMS = 256;

// Gibt die Maximale Skriptgröße an
const MAX_SCRIPT_SIZE = 2048;

// Gibt die Maximale Anzahl an möglichen Öffentlichen Schlüsseln an
const MAX_PUBLIC_KEY_SIZES = {
    SECP256K1_SCHNORR:32,
    CURVE25519_SCHNORR:32,
    BLS12_381:48
};

// Speichert alle NOP_CODES ab welche eine Länge von nicht verwendetbaren Daten angeben
const NOP_OP_VALUE_CODES = [

];

// Speichert alle nicht verwendeten NOP OP_CODES ab
const NOP_OP_CODES = [
    op_codes.op_nop15,
    op_codes.op_nop14,
    op_codes.op_nop13,
    op_codes.op_nop12,
    op_codes.op_nop11,
    op_codes.op_nop10,
    op_codes.op_nop9,
    op_codes.op_nop8,
    op_codes.op_nop7,
    op_codes.op_nop6,
    op_codes.op_nop5,
    op_codes.op_nop4,
    op_codes.op_nop3,
    op_codes.op_nop2,
    op_codes.op_nop1,
    op_codes.op_nop0
];

// Speichert die Möglichen Skripttypen ab
const script_types = {
    LOCKING:0,
    UNLOCKING:1,
};

// Wird verwendet um eine Value Object Liste auszugeben
const extract_obj_values = (items) => items.map((value) => {
    if(value.constructor.name === 'NumberValue') { return value.value; }
    else if(value.constructor.name === 'HexString') { return value.value; }
    else if(value.constructor.name === 'BoolValue') { return value.value; }
    else if(value.constructor.name === 'HashValue') { return value.value; }
    else if(value.constructor.name === 'NullValue') { return '00'; }
    else {
        throw new Error('Unallowed Item')
    }
});

// Wird ausgeführt um ein einfaches Skript auszuführen
const hexed_script_interpreter = async(tx_check_data, chain_data, debug=true) => {
    // Es wird geprüft ob es sich um zulässige Parameter handelt welche überheben wurden
    if(tx_check_data.constructor.name !== 'TxScriptCheckData' && tx_check_data.constructor.name !== 'ExtentedTxScriptCheckData') throw new Error('Invalid unlocking script data');
    if(chain_data.constructor.name !== 'ChainScriptCheckData') throw new Error('Invalid unlocking script data');

    // Es wird ein Hash aus dem Unlocking Skript erstellt
    let unlocking_script_hash = blockchain_crypto.sha3(256, tx_check_data.getUnlockScriptHexStr());

    // Es wird ein Hash aus dem Locking Skript erstellt,
    let locking_script_hash = blockchain_crypto.sha3(256, tx_check_data.getLockingScriptHexStr());

    // Speichert die Erlaubten Public Keys ab, welcher berechtigt sind diese Transaktion zu Entseprren
    let allowed_signature_public_keys = new AllowedScriptSignerPublicKeys();

    // Gibt an ob das Locking und oder das Unlocking Script eine Signatur Prüfung durchgeführt haben
    let locking_was_check_sigs = false, unlocking_was_check_sigs = false;

    // Es wird ein Number Objekt aus der Aktuellen Schwierigkeit erzeugt
    let current_block_diff = new NumberValue(0n, true, NumberType.bit64);

    // Es wird geprüft ob die Einträge auf dem Script Sigs Array korrekt ist
    for await(let sig_item of tx_check_data.signatures) {
        // Es wird geprüft ob es sich um ein Zulässiges Objekt handelt
        if(typeof sig_item !== 'object') throw new Error('Invalid script sig item');
        if(sig_item.constructor.name !== 'SingleSignatureValue') throw new Error('Invalid script sig object type');

        // Führt eine Schnellprüfung durch
        if(sig_item.quickCheck() === false) throw new Error('Invalid signature for this script');
    }

    // Speichert das Aktuelle Data Stack ab
    let y_stack_array = [];

    // Wird ausgeführt um den DEBUG Text auszzgeben
    function print(...text) {
        if(debug === false) return;
        console.log(...text)
    };

    // Zeigt die Basis Informationen über die Skripte an
    function printBaseInformations() {
        // DEBUG MAIN Informationen
        print('--- SCRIPT_META_INFORMATION_START ---');
        print('Unlocking Script hex:', tx_check_data.getUnlockScriptHexStr());
        print('Locking Script hex:', tx_check_data.getLockingScriptHexStr());
        print('Unlocking Script hash:', unlocking_script_hash);
        print('Locking Script hash:', locking_script_hash)
        print('--- SCRIPT_META_INFORMATION_END ---');
    };

    // Wird verwendet um zu überprüfen ob sich 2x True werte befinden
    function yStackIsFinallyTrue() {
        // Es wird geprüft ob sich mindestens 2 Objekte auf dem Stack befinden
        if(y_stack_array.length < 2) return false;

        // Es werden 2 Objekte aus dem Stack abgerufen
        let first_obj = y_stack_array.shift(), second_obj = y_stack_array.shift();

        // Es wird geprüft ob es sich bei beiden werten um ein VM True handelt
        if(securevm.true.equal(first_obj) !== true) return false;
        if(securevm.true.equal(second_obj) !== true) return false;

        // Es wird geprüft ob es sich 0 Elemente auf dem Stack befinden
        if(y_stack_array.length !== 0) return false;

        // Es handelt sich um ein gültiges Finales Y-Stack
        return true;
    };

    // Wird ausgeführt wenn das Skript aufgrund eines Fehlers abgebrochen werden soll
    function abort_without_error(script_result_obj, ...exception_text) {
        if(script_result_obj === null || script_result_obj.constructor.name !== 'ScriptInstanceData') throw new Error('Invalid data type');
        script_result_obj.signalAbort();
        print(...exception_text);
        print('script aborted');
    };

    // Wird ausgeführt wenn das Skript aufgrund eines Fehlers abgebrochen werden soll
    function close_by_error(script_result_obj, ...exception_text) {
        if(script_result_obj === null || script_result_obj.constructor.name !== 'ScriptInstanceData') throw new Error('Invalid data type');
        script_result_obj.signalAbortScriptByError();
        print(...exception_text);
        print('script aborted');
    };

    // Wird verwendet um Zusammenhängende Daten zu Extrahieren
    async function extract_n2_bytes(hex_str_lst, byte_size) {
        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Die Schleife wird ausgeführt
        let array_sz = ``;
        while(array_sz.length < byte_size) array_sz += copyed_item.shift();

        // Die Daten werden zurückgegeben
        return { hex_str_list:copyed_item, value:array_sz };
    };

    // Wird verwendet um die Verwendeten Signaturen zu überprüfen
    async function validate_unlockscript_sig(script_result_obj=null) {
        // Es wird geprüft ob mehr Signaturen als PublicKeys vorhanden sind
        if(tx_check_data.signatures.length > allowed_signature_public_keys.totalPublicKeys()) return false;

        // Es wird geprüft für welche PublicKeys eine Signatur vorhanden ist
        let avail_pkey_signatures = [];
        for(let otems of tx_check_data.signatures) {
            // Es wird geprüft ob es sich um einen Zulässigen Datentypen handelt
            if(typeof otems !== 'object') throw new Error('Invalid script');
            if(otems.constructor.name !== 'SingleSignatureValue') throw new Error('Invalid signature object');

            // Es wird geprüft ob es sich um einen Zulässigen Öffentlichen Schlüssel handelt
            if(allowed_signature_public_keys.isKnownPublicKey(otems.value.toLowerCase()) !== true) return false;

            // Es wird geprüft ob eine Signatur vorhanden ist
            if(otems.sig === undefined || otems.sig === null) return false;

            // Der Öffentliche Schlüssel wird für diesen Vorgang verwendet
            avail_pkey_signatures.push(otems);
        }

        // Es wird geprüft ob die Benötigte Mindestanzahl von Signaturen vorhanden ist
        if(BigInt(avail_pkey_signatures.length) < 1n) return false;
        if(BigInt(avail_pkey_signatures.length) > 16n) return false;
        if(BigInt(avail_pkey_signatures.length) !== BigInt(tx_check_data.signatures.length)) return false;

        // Es wird geprüft ob die Benötigte Anzahl von Signaturen vorhanden sind
        if(BigInt(avail_pkey_signatures.length) < allowed_signature_public_keys.needed_sigs) {
            return false;
        }

        // Die Öffentlichen Schlüssel werden Sortiert
        let sorted_key_pairs = avail_pkey_signatures.sort((a, b) => {
            let pkey_hash_a = blockchain_crypto.sha3(256, a.value, a.type), pkey_hash_b = blockchain_crypto.sha3(256, b.value, b.type);
            let pkey_hash_num_a = BigInt(`0x${pkey_hash_a}`), pkey_hash_num_b = BigInt(`0x${pkey_hash_b}`);
            if(pkey_hash_num_a > pkey_hash_num_b) return 1;
            if(pkey_hash_num_a < pkey_hash_num_b) return -1;
            return 0;
        });

        // Die Signaturen werden geprüft
        try {
            for(let ssig of sorted_key_pairs) {
                // Die Signatur wird geprüft
                if((await ssig.fullSignatureCheck()) !== true) {
                    print('crypto_signature_verify', ssig.value, ssig.sig, false);
                    return false;
                }

                // Es wird geprüft ob es sich um eine secp256k1 Signatur handelt
                if(ssig.type === 'secp256k1') {
                    let vresult = await blockchain_crypto.ecc.secp256k1.verifySignature(ssig.value, ssig.sig, ssig.msg_hash);
                    if(vresult !== true) continue;
                }
                // Es wird geprüft ob es sich um eine ristretto255 Signatur handelt
                else if(ssig.type === 'curve25519') {
                    let vresult = await blockchain_crypto.ecc.curve25519.verifySignature(ssig.value, ssig.sig, ssig.msg_hash);
                    if(vresult !== true) continue;
                }
                // Es wird geprüft ob es sich um eine BLS Signatur handelt
                else if(ssig.type === 'bls12381') {
                    let vresult = await blockchain_crypto.ecc.bls1231.verifySignature(ssig.value, ssig.sig, ssig.msg_hash);
                    if(vresult !== true) continue;
                }
                // Es wird geprüft ob es sich um eine Bitcoin Signatur handelt
                else if(ssig.type === 'btcadr') {
                    let vresult = await blockchain_crypto.altchain.validateBitcoinSegwitMessageSignature(ssig.value, ssig.sig, ssig.msg_hash);
                    if(vresult !== true) continue;
                }
                // Es wird geprüft ob es sich um eine Ethereum Signatur handelt
                else if(ssig.type === 'ethadr') {
                    let prep_sig = `0x${ssig.sig}`;
                    let vresult = await blockchain_crypto.altchain.validateWeb3EthereumMessageSignature(ssig.value, prep_sig, ssig.msg_hash);
                    if(vresult !== true) continue;
                }
                // Es handelt sich um einen Unbekannten Adresstypen
                else {
                    close_by_error(script_result_obj, 'Invalid script, unkown address type on stack');
                    return false;
                }

                // Der Öffentliche Schlüssel für diese Signatur wird als verwendet Makiert
                if(allowed_signature_public_keys.markAddressAsUsed(ssig.value) !== true) {
                    close_by_error(script_result_obj, 'Invalid script, cant mark public key for using');
                    return false;
                }
    
                //console.log(last_unlocking_script_hash_signature);
                print('crypto_signature_verify', ssig.value, ssig.sig, true);
            }
        }
        catch(e) {
            close_by_error(script_result_obj, 'crypto_signature_verify exception_called', e);
            return false;
        }

        // Es wird geprüft ob genausoviele Signaturen geprüft wurden wie benötigt werden
        if(allowed_signature_public_keys.totalMarketPublicKeys() != allowed_signature_public_keys.needs_sigs) return false;

        // Es handelt sich um ein gültiges Skript
        return true;
    };

    // Diese Funktion wird verwendet um ein Bool einzulesen
    async function next_read_bool(hex_str_list, script_result_obj=null) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry === op_codes.op_true) {
            let reconstructed_bool = new BoolValue(true, false);
            return { hex_str_list:copyed_item, value:reconstructed_bool };
        }
        else if(script_stack_entry === op_codes.op_false) {
            let reconstructed_bool = new BoolValue(false, false);
            return { hex_str_list:copyed_item, value:reconstructed_bool };
        }
        else {
            return false;
        }
    };

    // Diese Funktion wird verwendet um eine Zahl einzulesen
    async function next_read_number(hex_str_lst, script_result_obj=null) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 1) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_uint_8) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 2);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit8) };
        }
        else if(extracted_item === op_codes.op_uint_16) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 4);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit16) };
        }
        else if(extracted_item === op_codes.op_uint_32) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 8);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit32) };
        }
        else if(extracted_item === op_codes.op_uint_64) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 16);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit64) };
        }
        else if(extracted_item === op_codes.op_uint_128) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 32);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit128) };   
        }
        else if(extracted_item === op_codes.op_uint_256) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 64);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit256) };
        }
        else {
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob es sich um ein CHAIN_STATE Wert handelt
    async function next_is_inter_chain_state(hex_str_list, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry !== op_codes.op_chain_state_value) return false;

        // Gibt den Hash des Unlock Scripts aus
        script_stack_entry = copyed_item.shift();
        if(script_stack_entry === op_codes.op_unlock_script_hash) {
            return { hex_str_list:copyed_item, value:new HashValue(unlocking_script_hash, 'sha3_256', true)  };
        }
        // Gibt den Hash des Locking Skripts aus
        else if(script_stack_entry === op_codes.op_lock_script_hash) {
            return { hex_str_list:copyed_item, value:new HashValue(locking_script_hash, 'sha3_256', true) };
        }
        // Gibt die Aktuelle Blockhöhe an
        else if(script_stack_entry === op_codes.op_current_block_hight) {
            return { hex_str_list:copyed_item, value:new NumberValue(chain_data.current_block_hight, true, NumberType.bit256) };
        }
        // Gibt den Hash des letzten Blocks aus
        else if(script_stack_entry === op_codes.op_last_block_hash) {
            return { hex_str_list:copyed_item, value:chain_data.last_block_hash };
        }
        // Gibt die Aktuelle Mining Schwierigkeit an
        else if(script_stack_entry === op_codes.op_current_block_diff) {
            return { hex_str_list:copyed_item, value:current_block_diff };
        }
        // Gibt die Anzahl der Signaturen aus
        else if(script_stack_entry === op_codes.op_total_signatures) {
            return { hex_str_list:copyed_item, value:new NumberValue(BigInt(tx_check_data.signatures.length), true, NumberType.bit8) };
        }
        // Gibt die gesamtzahlen aller Signaturen an
        else {
            close_by_error(script_result_obj, 'Invalid script, unkown chainstate value on stack');
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob es sich um einen Hex String handelt
    async function next_is_inter_hex_str(hex_str_list, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen oder beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 3) return false;

        // Das Stack Array wird kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom Stack wird genommen und geprüft, es wird geprüft, um was für einen ChainState wert es sich handelt
        let script_stack_entry = copyed_item.shift();
        if(script_stack_entry !== op_codes.op_code_hex_value) return false;

        // Die Größe des Hexwertes wird abgerufen
        script_stack_entry = copyed_item.shift();

        // Die Länge des Hexwertes wird abgerufen
        let hex_str_len = parseInt(script_stack_entry, 16);

        // Es wird geprüft ob die Länge des Hexstringes größer als 256 Zeichen ist
        if(hex_str_len > 256) {
            close_by_error(script_result_obj, 'Invalid script, hex size is too big');
            return false;
        }

        // Der String wird aus dem Stack extrahiert
        var hex_str = '';
        while(hex_str.length !== hex_str_len) { hex_str = hex_str + copyed_item.shift(); }
        if(hex_str.length !== hex_str_len) {
            close_by_error(script_result_obj, 'Invalid script, unkown interpreter error');
            return false;
        }

        // Die neue Daten Liste wird zurückgegeben
        return { hex_str_list:copyed_item, value:new HexString(hex_str, false) };
    };

    // Wird verwendet um nachfolgende Werte einzulesen ohne genau zu Spizalisieren um was für einen Datentypen es sich handelt
    async function next_is_unspefic_value(hex_str_lst, script_type=null, filter_blocked_types=[], script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_lst === undefined || hex_str_lst === null || typeof hex_str_lst !== 'object' || Array.isArray(hex_str_lst) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Prüft ob es sich um einen Chainstate Wert handelt
        let chain_state_value = await next_is_inter_chain_state(hex_str_lst, script_type, script_result_obj);
        if(chain_state_value !== false) {
            return { hex_str_list:chain_state_value.hex_str_list, value:chain_state_value.value };
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Prüft ob es sich um einen
        let intepr_hex_value = await next_is_inter_hex_str(hex_str_lst, script_type, script_result_obj);
        if(intepr_hex_value !== false) {
            return { hex_str_list:intepr_hex_value.hex_str_list, value:intepr_hex_value.value };
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Prüft ob es sich um eine Nummer handelt
        let intepr_number_value = await next_read_number(hex_str_lst, script_result_obj);
        if(intepr_number_value !== false) {
            return { hex_str_list:intepr_number_value.hex_str_list, value:intepr_number_value.value };
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Prüft ob es sich um ein Boolean Handelt
        let interpr_bool_value = await next_read_bool(hex_str_lst, script_result_obj);
        if(interpr_bool_value !== false) {
            return { hex_str_list:interpr_bool_value.hex_str_list, value:interpr_bool_value.value };
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob es sich um eine Value Funktion handelt
        let interpr_value_function = await next_read_value_function(hex_str_lst, script_type, script_result_obj);
        if(interpr_value_function !== false) {
            return { hex_str_list:interpr_value_function.hex_str_list, value:interpr_value_function.value};
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel handelt
        let read_public_key_declaration = await next_read_public_key_defination(hex_str_lst, script_type, script_result_obj);
        if(read_public_key_declaration !== false) {
            return { hex_str_list:read_public_key_declaration.hex_str_lst, value:read_public_key_declaration.value};
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob es sich um eine AlternateBlockchainAddress handelt
        let readed_address_declaration = await next_read_altchain_address(hex_str_lst, script_type, script_result_obj);
        if(readed_address_declaration !== false) {
            return { hex_str_list:readed_address_declaration.hex_str_lst, value:readed_address_declaration.value};
        }

        // Es handelt sich nicht um einen Wert
        return false;
    };

    // Wird verwendet um ParrentCube Werte auszuwerten
    async function next_read_parren_cube(hex_str_lst, script_type, is_emit_call=false, script_result_obj=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('It is an illegal data type, invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_parren_fnc_cube) return false;

        // Die Anzahl der Verfügbaren 
        let total_parameters = parseInt(`0x${copyed_item.shift()}`);

        // Es wird geprüft ob Mindestens 1 Wert im Parren Cube vorhanden ist
        if(total_parameters === 0) return { hex_str_list:copyed_item, items:[]};

        // Die Einzelnen Parameter werden ausgewertet
        let readed_parameters = [];
        while(readed_parameters.length !== total_parameters) {
            // Sofern es sich um ein EMIT CALL Handelt, werden bestimmte Werte blockiert
            let blocked_op_codes = [];

            // Es wird versucht den Aktuellen Wert auszulesen
            let usnpec_value_result = await next_is_unspefic_value(copyed_item, script_type, blocked_op_codes, script_result_obj);
            if(usnpec_value_result !== false) {
                copyed_item = usnpec_value_result.hex_str_list;
                readed_parameters.push(usnpec_value_result.value);
                continue;
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(script_result_obj.isClosedOrAborted() === true) return false;

            // Das Skript wird agebrochen
            abort_without_error(script_result_obj, 'invalid parren cube');
            return false;
        };

        // Gibt die Ürbirgen Daten zurück
        return { hex_str_list:copyed_item, items:readed_parameters};
    };

    // Diese Funktion wird verwendet um eine Value Funktion auszuführen
    async function next_read_value_function(hex_str_lst, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('It is an illegal data type, invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_value_function) return false;

        // Der Aktuelle Wert wird abgerufen
        let current_item = copyed_item.shift();

        // Wird verwendet um die Parren Cube Werte einzulesen
        let readed_parren_cube = await next_read_parren_cube(copyed_item, script_type, false, script_result_obj);
        if(readed_parren_cube === false) {
            if(script_result_obj.isClosedOrAborted() === true) return false;
            close_by_error(script_result_obj, 'Invalid script, no paren data');
            return false; 
        }

        // Der Aktuelle Code wird geupdated
        copyed_item = readed_parren_cube.hex_str_list;

        try {
            // Diese Skript Funktion wird verwendet um zu zu ermitteln ob genau 1 Signierer vorhanden ist
            // Diese Funktion erwartet keine Argumente, sollten dennoch welche verwendet werden, bricht das Skript mti einem Fehler ab.
            // Sollten mehr als 1 oder weniger als 1 Signierer vorhanden sein, wird ein False zurückgegeben anderersseits ein true.
            if(current_item === op_codes.op_is_one_signer) {
                // Es wird geprüft ob keine Werte in dem Parrn Cube vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, has more then zero items for parren on stack');
                    return false; 
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'is_one_signer', tx_check_data.signatures.length === 1);
                return { hex_str_list:copyed_item, value:new BoolValue((tx_check_data.signatures.length === 1), true) };
            }
            // Diese Skript Funktion wird verwendet um einen SHA256 Hash zu ersellen
            // Die Funktion erwartet mindestens ein Argument, sollten keine Argumente oder
            // mehr als 255 Parameter vorhanden sein, wird das Skript mit einem Fehler abgebrochen.
            else if(current_item === op_codes.op_sha256d) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'Invalid script, to little parren stack value');
                    return false; 
                }

                // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
                let final_value_hash = blockchain_crypto.sha2d(256, ...extract_obj_values(readed_parren_cube.items));

                // Die Daten werden zurückgegeben
                print('value_function', 'compute_sha256d_hash', final_value_hash);
                return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d', false) };
            }
            // Diese Skript Funktion wird verwendet um einen SHA3_256 Bit Hash zu erstellen
            // Die Funktion erwartet mindestens ein Argument, sollten keine Argumente oder
            // mehr als 255 Parameter vorhanden sein, wird das Skript mit einem Fehler abgebrochen.
            else if(current_item === op_codes.op_sha3) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'Invalid script, to little parren stack value');
                    return false; 
                }

                // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
                let final_value_hash = blockchain_crypto.sha3(256, ...extract_obj_values(readed_parren_cube.items));

                // Die Daten werden zurückgegeben
                print('value_function', 'compute_sha3_256_hash', final_value_hash);
                return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha3_256', false) };
            }
            // Diese Skript Funktion wird verwendet um einen Swifty256 Bit Hash zu erstellen
            // Die Funktion erwartet mindestens ein Argument, sollten keine Argumente oder
            // mehr als 255 Parameter vorhanden sein, wird das Skript mit einem Fehler abgebrochen.
            else if(current_item === op_codes.op_swifty_h) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'Invalid script, to little parren stack value');
                    return false; 
                }

                // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
                let final_value_hash = blockchain_crypto.swiftyHash(256, ...extract_obj_values(readed_parren_cube.items));

                // Die Daten werden zurückgegeben
                print('value_function', 'compute_swiftyh_256_hash', final_value_hash);
                return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'swiftyh_256', false) };
            }
            // Diese Skript Funktion gibt den ersten Eintrag zurück welcher dezreit auf dem Stack liegt
            // Diese Funktion erwartet keine Argumente, sollten dennoch Argumente verwendet werden,
            // wird das Skript mit einem Fehler abgebrochen.
            else if(current_item === op_codes.op_pop_from_y) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, the pop from y stack function dosent need parameters');
                    return false;
                }

                // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
                if(y_stack_array.length === 0) return { hex_str_list:copyed_item, value:new NullValue() };

                // Die Daten werden zurückgegeben
                print('value_function', 'pop_from_y');
                return { hex_str_list:copyed_item, value:y_stack_array.shift() };
            }
            // Diese Skript Funktion gibt die Gesamtzahl aller Signaturen aus
            // Diese Funktion erwartet keine Argumente, sollten dennoch welche verwendet werden, bricht dass Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_total_signatures) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, total signature function dosent need parameters');
                    return false;
                }

                // Die Daten werden zurückgegeben
                let allowed_pkey_len = allowed_signature_public_keys.totalPublicKeys();
                print('value_function', 'total_signers', allowed_pkey_len);
                return { hex_str_list:copyed_item, value:new NumberValue(BigInt(allowed_pkey_len), true, NumberType.bit8) };
            }
            // Diese Skript Funktion gibt den Hash des letzten Blocks aus
            // Diese Funktion erwartet keine Argumente, sollten dennoch welche verwendet werden, bricht dass Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_last_block_hash) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, last block hash function dosent need parameters');
                    return false;
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'last_block_hash', chain_data.last_block_hash);
                return { hex_str_list:copyed_item, value:chain_data.last_block_hash };
            }
            // Diese Skript Funktion gibt die Aktuelle Block Schwierigkeit aus
            // Diese Funktion erwartet keine Argumente, sollten dennoch welche verwendet werden, bricht dass Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_current_block_diff) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, current block diff dosent need a parameter');
                    return false;
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'current_block_diff', current_block_diff.value);
                return { hex_str_list:copyed_item, value:current_block_diff };
            }
            // Diese Skript Funktion gibt den Aktuellen Hash des Locking Skriptes zurück
            // Diese Funktion erwaretet keine Argumente, sollten dennoch welche verwendet werden, bricht das Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_lock_script_hash) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, locking script hash doesnt need a parameter');
                    return false;
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'lock_script_hash', locking_script_hash);
                return { hex_str_list:copyed_item, value:new HashValue(locking_script_hash, 'sha3_256', true) };
            }
            // Diese Skript Funktion gibt den Aktuellen hash des Unlocking Skriptes zurück
            // Diese Funktion erwaret keine Argumente, sollten dennoch welche verwendet werden, bricht das Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_unlock_script_hash) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, unlocking script hash function dosent need a parameters');
                    return false;
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'unlock_script_hash', unlocking_script_hash);
                return { hex_str_list:copyed_item, value:new HashValue(unlocking_script_hash, 'sha3_256', true) };
            }
            // Diese Skript Funktion gibt die Aktuelle Blockhöhe zurück
            // Diese Funktion erwartet keine Argumente, sollten dennoch welche verwendet werden, bricht das Skript mit einem Fehler ab.
            else if(current_item === op_codes.op_current_block_hight) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'Invalid script, current block hight function dosent need a parameter');
                    return false;
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'current_block_highgt', chain_data.current_block_hight.toString());
                return { hex_str_list:copyed_item, value:new NumberValue(chain_data.current_block_hight, true, NumberType.bit256) };
            }
            // Diese Skript Funktion gibt an ob eine Spizielle Konstelation von PublicKeys / Adressen verwendet wird um dieses Skript zu Signieren.
            // Diese Funktion erwartet mindestens 1 Parameter oder Maximal 16. Sollten mehr als 16 oder Weniger als 1 Parameter angegeben werden, bricht das Skript mit einem Fehler ab.
            // Die Funktion prüft ob alle Public Keys welche angebenen wurden, auch zum überpüfen der Signaturen verwendet wurden, wenn ja gibt die Funktion ein True zurück, wenn nicht ein False.
            else if(current_item === op_codes.op_eq_signers) {
                // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'Invalid script, eq signers need minimum one parameter');
                    return false;
                }

                // Es wird geprüft ob es sich um gültige Parameter handelt
                let is_ok = true;
                for(let otem of readed_parren_cube.items) {
                    let arrv = tx_check_data.signatures.map((r) => r.value.toLowerCase());
                    if(arrv.includes(otem.value) !== true) {
                        is_ok = false;
                        break;
                    }
                }

                // Die Daten werden zurückgegeben
                print('value_function', 'eq_verify_signatures', is_ok);
                return { hex_str_list:copyed_item, value:new BoolValue(is_ok, true) };
            }
            // Es wird geprüft ob es sich um eine NOP Operation handelt
            // diese Operation haben keine Auswikung auf die Ausführung des Skriptes und machen es nicht ungültigt
            else if(NOP_OP_CODES.includes(current_item) === true) {
                return { hex_str_list:copyed_item };
            }
            // Der Aktuelle OP_CODE konnte keiner Funktion zugeordnet werden, dass Skript wird aufgrund eines Fehler abgebrochen.
            else {
                close_by_error(script_result_obj, 'It is an invalid op code in combination with the value function op code, invalid script');
                return false;
            }
        }
        catch(e) {
            // Es ist ein Schwerwiegender Fehler aufgetreten, dass Skript wird abgebrochen
            close_by_error(script_result_obj, 'emit_call', 'exception', e);
            return false;
        }
    };

    // Diese Funktion wird verwendet um ein ELSE Block auszulesen
    async function next_is_else_block(hex_str_list, script_type=null, erase=false, current_sub_call=0, script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_list === undefined || hex_str_list === null || typeof hex_str_list !== 'object' || Array.isArray(hex_str_list) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('It is an illegal data type, invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft ob es sich Aktuell um einen ELSE Block handelt
        if(script_stack_entry !== op_codes.op_else) return false;

        // Die Länge des Codeblocks wird ermittelt
        let code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16);

        // Die Schleife wird solange ausgeführt bis genau die Anzahl an Element aus dem Stack extrahiert wurde,
        // 'code_block_len' gibt dabri die Gesamtlänge des Codeblocks an
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Es wird geprüft ob der Codeblock ausgeführt werden soll
        // wenn der Codeblock nicht ausgeführt werden soll, wird der Codeblock einfach verworfen
        // andernfalls Startet das Skript ein neuen Durchgang
        if(erase === false) {
            // Es wird geprüft ob mehr als 32 Codeblöcke ausgeführt wurden, wenn ja wird das Skript abgebrochen
            if(current_sub_call >= 32) {
                close_by_error(script_result_obj, 'Invalid script, invalid else code block');
                return false; 
            }

            // Der Hexcode wird ausgeführt
            let resva_lst = null;
            try { resva_lst = await interpr_hex_string(x_chars, current_sub_call+1, script_type, script_result_obj); }
            catch(e) {
                close_by_error(script_result_obj, 'Invalid script, invalid else code block');
                return false; 
            }

            // Es wird geprüft ob der Code ausgeführt wurde
            if(resva_lst === false) {
                if(script_result_obj.isClosedOrAborted() === true) return false;
                close_by_error(script_result_obj, 'Invalid script, invalid else code block');
                return false; 
            }
        }

        // Die Übrigen Daten werden zurückgegeben
        return { hex_str_list:copyed_item };
    };

    // Die Funktion wird ausgeführt wenn es sich um ein IF Statemant handelt
    async function next_inter_if_function(hex_str_lst, script_type=null, is_else_if=false, erase=false, current_sub_call=0, script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_lst === undefined || hex_str_lst === null || typeof hex_str_lst !== 'object' || Array.isArray(hex_str_lst) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich um eine IF oder ELIF Anweisung handelt, wenn nicht wird der Vorgang abgebrochen.
        let extracted_item = copyed_item.shift();
        if(is_else_if === true) {
            if(extracted_item !== op_codes.op_elif) return false;
        }
        else {
            if(extracted_item !== op_codes.op_if) return false;
        }

        // Es wird geprüft ob es sich um eine Zulässige IF Opertion handelt,
        // wenn nicht wird das Skript mit einem Fehler abgebrochen.
        let if_conditions = copyed_item.shift();
        if(if_conditions !== op_codes.op_match && if_conditions !== op_codes.op_ibigger && if_conditions !== op_codes.op_ismall && if_conditions !== op_codes.op_nmatch) {
            close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.invalid_operations);
            return false;
        }

        // Es werden Zwei Elemente abgerufen
        let l_rounds = 0;
        while(l_rounds != 2) {
            // Der Eintrag wird abgerufen
            let c_element = await next_is_unspefic_value(copyed_item, script_type, [], script_result_obj);
            if(c_element === false) {
                if(script_result_obj.isClosedOrAborted() === true) return false;
                close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.invalid_if_stack);
                return false;
            }

            // Der Wert wird hinzugefügt
            y_stack_array.push(c_element.value);
            copyed_item = c_element.hex_str_list;

            // Es wird eine Rounder Hochgezählt
            l_rounds++;
        }

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob Mindestens 2 Werte auf dem Y Stack liegen, andernfalls wird das Skript mit einem Fehler abgebrochen.
        if(y_stack_array.length < 2) {
            close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.invalid_y_stack);
            return false;
        }

        // Die letzten 2 Einträge auf dem Stack werden extrahiert
        let item_a = y_stack_array.pop(), item_b = y_stack_array.pop();

        // Es wird geprüft ob einer der beiden Werte kein Zulässiger Datentyp ist
        if(item_a === undefined || item_a === null || item_b === undefined || item_b === null) {
            close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.invalid_dtype);
            return false; 
        }

        // Es wird geprüft, welche Operation durchgeführt werden soll
        let script_stack_result = false;
        if(if_conditions === op_codes.op_match) {
            script_stack_result = compareValues(item_a, item_b);
            print('IF:', '==', item_a.value, item_b.value, script_stack_result);
        }
        else if(if_conditions === op_codes.op_nmatch) {
            script_stack_result = compareValues(item_a, item_b);
            print('IF:', '!=', item_a.value, item_b.value, script_stack_result);
        }
        else if(if_conditions === op_codes.op_ismall) {
            script_stack_result = compareValues(item_a, item_b);
            print('IF:', '<', item_a.value, item_b.value, script_stack_result);
        }
        else if(if_conditions === op_codes.op_ibigger) {
            script_stack_result = compareValues(item_a, item_b);
            print('IF:', '>', item_a.value, item_b.value, script_stack_result);
        }
        else {
            close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.unkown_operation);
            return false;
        }

        // Die Länge des IF / ELIF Codeblocks wird ermittelt
        let code_block_len = null;
        try{ code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16); }
        catch{e} {

        }

        // Die Schleife wird solange ausgeführt bis genau die Anzahl an Element aus dem Stack extrahiert wurde,
        // 'code_block_len' gibt dabri die Gesamtlänge des Codeblocks an
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Es wird geprüft ob der Block ausgeführt werden soll ein Codeblock wird nur ausgeführt wenn das Ergebniss der Operation gleich True ist,
        // andernfalls läuft der Code weiter und prüft ob ein ELIF oder ELSE Block vorhanden ist
        if(script_stack_result === true) {
            // Es wird geprüft ob der Code nur gelöscht werden soll
            if(erase === false) {
                // Es wird geprüft ob bereits 32 Codeblock ausgeführt werden, wenn ja wird der Vorgang abgebrochen
                if(current_sub_call >= 32) {
                    close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.to_many_code_blocks);
                    return false; 
                }

                // Der Code wird ausgeführt
                let resva_lst = await interpr_hex_string(x_chars, current_sub_call+1, script_type, script_result_obj);
                if(resva_lst === false) {
                    if(script_result_obj.isClosedOrAborted() === true) return false;
                    close_by_error(script_result_obj, 'IF:', excpetions.error_messages.interpreter.if.code_block_error);
                    return false; 
                }

                // Das Ergebniss wird zurückgegeben
                return { hex_str_list:resva_lst.hex_str_list, was_used:true, direct:false };
            }
        }

        // Es wird geprüft ob es sich um einen ELSE_IF Block handelt
        if(is_else_if === true) return { hex_str_list:copyed_item, was_used:true, direct:false };

        // Diese Schleife extrahiert alle ELSE_IF oder ELSE bedingungen
        // Eine IF Anwesiung kann immer nur eine ELSE Anweisung beseitzen
        while(copyed_item.length > 0) {
            // Es wird geprüft ob es sich um einen ELSE_IF Statement handelt
            let else_block_checks = await next_inter_if_function(copyed_item, script_type, true, ((script_stack_result === true) ? true : false), current_sub_call, script_result_obj);
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
                continue;
            }

            // Es wird geprüft ob das Skript beendet
            if(script_result_obj.isClosedOrAborted() === true) return false;

            // Es wird geprüft ob es sich um ein ELSE Statement handelt
            else_block_checks = await next_is_else_block(copyed_item, script_type, ((script_stack_result === true) ? true : false), current_sub_call, script_result_obj);
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
            }

            // Die Schleife wird beendet, keine der beiden Funktionen war zutreffend
            break;
        };

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Gibt die Ergebnisse zurück
        return { hex_str_list:copyed_item, was_used:true, direct:false };
    };

    // Diese Funktion wird ausgeführt um definerite Öffentliche Schlüssel einzuelesen
    async function next_read_public_key_defination(hex_str_lst, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_lst === undefined || hex_str_lst === null || typeof hex_str_lst !== 'object' || Array.isArray(hex_str_lst) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_public_key_defination) return false;

        // Es wird geprüft ob es sich um einen Secp256k1 Schnorr Public Key handelt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_secp256k1_schnorr) {
            // Es wird geprüft ob sich noch 32 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < MAX_PUBLIC_KEY_SIZES.SECP256K1_SCHNORR) {
                close_by_error(script_result_obj, 'PublicKeyReading:', 'SECP256K1_SCHNORR ->', excpetions.error_messages.interpreter.reading_functions.pk_read.secp256k1_schnorr.invalid_len);
                return false; 
            }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('PublicKeyReading:', 'SECP256K1_SCHNORR ->', full_str, 'done');
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'secp256k1', false) };
        }
        // Es wird geprüft ob es sich um einen Curve25519 Schnorr Public Key handelt
        else if(extracted_item === op_codes.op_curve25519) {
            // Es wird geprüft ob sich noch 32 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < MAX_PUBLIC_KEY_SIZES.CURVE25519_SCHNORR) {
                close_by_error(script_result_obj, 'PublicKeyReading:', 'CURVE25519_SCHNORR ->', excpetions.error_messages.interpreter.reading_functions.pk_read.curve25519_schnorr.invalid_len);
                return false; 
            }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('PublicKeyReading:', 'CURVE25519_SCHNORR ->', full_str, 'done');
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'curve25519', false) };
        }
        // Es wird geprüft ob es sich um einen BLS12-381 Public Key handelt
        else if(extracted_item === op_codes.op_bls12381) {
            // Es wird geprüft ob sich noch 48 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < MAX_PUBLIC_KEY_SIZES.BLS12_381) {
                close_by_error(script_result_obj, 'PublicKeyReading:', 'BLS12_381 ->', excpetions.error_messages.interpreter.reading_functions.pk_read.bls12.invalid_len);
                return false; 
            }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 96) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('PublicKeyReading:', 'BLS12_381 ->', full_str, 'done');
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'bls12381', false) };
        }
        // Es handelt sich um ein Unbekanntes verfahren
        else {
            close_by_error(script_result_obj, 'PublicKeyReading:', excpetions.error_messages.interpreter.reading_functions.pk_read.invalid_key_type);
            return false; 
        }
    };

    // Diese Funktion wird ausgeführt um eine definierte Altchain Adresse einzulesen
    async function next_read_altchain_address(hex_str_lst, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_lst === undefined || hex_str_lst === null || typeof hex_str_lst !== 'object' || Array.isArray(hex_str_lst) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_address_defination) return false;

        // Es wird geprüft ob es sich um eine Bitcoin Adresse handelt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_btc_address_32) {
            // Es wird geprüft ob sich noch 33 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 33) {
                close_by_error(script_result_obj, 'AltChainReading:', 'Bitcoin ->', excpetions.error_messages.interpreter.reading_functions.altchain_read.bitcoin.invalid_len);
                return false; 
            }

            // Die Adresse wird eingelesen
            let full_str = '';
            while(full_str.length !== 66) full_str = full_str + copyed_item.shift();

            // Die Adresse wird wiederhergestellt
            let recoded_address = bech32.encode('bc', Buffer.from(full_str, 'hex'));

            // Es wird geprüft ob es sich um eine Zulässige Bitcoin Adresse handelt
            if((await blockchain_crypto.altchain.isValidateBitcoinAddress(recoded_address)) !== true) {
                close_by_error(script_result_obj ,'AltChainReading:', 'Bitcoin ->', excpetions.error_messages.interpreter.reading_functions.altchain_read.bitcoin.reading_error);
                return false;
            }

            // Die Daten werden zurückgegeben
            print('AltChainReading:', 'Bitcoin ->', recoded_address);
            return { hex_str_lst:copyed_item, value:new AlternativeBlockchainAddressValue(recoded_address, 'btcadr', false) };
        }
        // Es wird geprüft ob es sich um eine Ethereum Web3 Adresse handelt
        else if(extracted_item === op_codes.op_eth_address) {
            // Es wird geprüft ob sich noch 33 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 20) {
                close_by_error(script_result_obj, 'AltChainReading:', 'EthereumWeb3 ->', excpetions.error_messages.interpreter.reading_functions.altchain_read.ethereum.invalid_len);
                return false; 
            }

            // Die Adresse wird ausgelesen
            let full_str = '0x';
            while(full_str.length !== 42) full_str = full_str + copyed_item.shift();

            // Es wird geprüft ob es sich um eine Ethereum Adresse handelt
            if((await blockchain_crypto.altchain.isValidateEthereumAddress(full_str)) !== true) {
                close_by_error(script_result_obj ,'AltChainReading:', 'EthereumWeb3 ->', excpetions.error_messages.interpreter.reading_functions.altchain_read.ethereum.reading_error);
                return false;
            }

            // Die Daten werden zurückgegeben
            print('AltChainReading:', 'EthereumWeb3 ->', full_str);
            return { hex_str_lst:copyed_item, value:new AlternativeBlockchainAddressValue(full_str, 'ethadr', false) };
        }
        // Es handelt sich um einen Unbekannten Adresstypen
        else {
            close_by_error('AltChainReading:', excpetions.error_messages.interpreter.reading_functions.altchain_read.unkown_address_type);
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob als nächstes ein EMIT Call kommt
    async function next_inter_emit_call(hex_str_lst, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um ein Array handelt
        if(hex_str_lst === undefined || hex_str_lst === null || typeof hex_str_lst !== 'object' || Array.isArray(hex_str_lst) !== true) throw new Error('Hardcore internal error, invalid stack element');

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript beendet wurde
        if(script_result_obj.isClosedOrAborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_emit_function) return false;

        // Das Aktuelle Item wird abgerufen
        let current_item = copyed_item.shift();

        // Wird verwendet um die Parren Cube Werte einzulesen
        let readed_parren_cube = await next_read_parren_cube(copyed_item, script_type, true, script_result_obj);
        if(readed_parren_cube === false) {
            if(script_result_obj.isClosedOrAborted() === true) return false;
            close_by_error(script_result_obj, 'Invalid script', excpetions.error_messages.interpreter.emit_functions.parren_cube_error);
            return false; 
        }

        // Es wird geprüft ob das Skript beendet wurde,
        // wenn nicht wird das Aktuelle Kopierte Item überschrieben und mit der Ausführung wird fortgefahren
        if(script_result_obj.isClosedOrAborted() === true) return false;
        copyed_item = readed_parren_cube.hex_str_list;

        try {
            // Es wird geprüft ob der Ausgang entsperrt werden soll
            // sollte es einen Fehler gegeben haben wird der Vorgang abgebrochen
            if(current_item === op_codes.op_unlock) {
                // Es wird geprüft ob 0 Argumente Vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_unlock #', excpetions.error_messages.interpreter.emit_functions.unlock_functions.parameter_error);
                    return false;
                }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(script_result_obj.signalUnlock() !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_unlock #', excpetions.error_messages.interpreter.emit_functions.unlock_functions.signal_unlocking_error);
                    return false;
                }

                // Es wird ein VM True auf den Y Stack geschoben
                y_stack_array.push(securevm.true);

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'op_unlock #', true);
                return { hex_str_list:copyed_item };
            }
            // Diese OP_CODE weist die VM an eine Signaturprüfung durchzuführen
            // führt eine Prüfung der Signaturen durch, sollte hierbei ein Fehler auftreten wird der Skript abgebrochen
            else if(current_item === op_codes.op_check_sig) {
                // Es wird geprüft ob 0 Argumente Vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.parameter_error);
                    return false;
                }

                // Es wird geprüft ob bereits eine Signaturprüfung innerhalb dieses Skriptes durchgeührt wurde
                if(script_type === script_types.LOCKING && locking_was_check_sigs === true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.sig_always_checked);
                    return false; 
                }
                else if(script_type === script_types.UNLOCKING && unlocking_was_check_sigs === true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.sig_always_checked);
                    return false; 
                }

                // Es wird geprüft ob die Signaturen korrekt sind
                if((await validate_unlockscript_sig(script_result_obj)) !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.sig_result_not_correct);
                    return { hex_str_list:[] }; 
                }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(script_result_obj.signalUnlock() !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.signal_unlocking_error);
                    return false; 
                }

                // Es wird ein VM True auf den Y Stack geschoben
                y_stack_array.push(securevm.true);

                // Es wird Signalisiert dass eine Signaturprüfung durchgeführt wurde
                if(script_type === script_types.LOCKING) locking_was_check_sigs = true
                else if(script_type === script_types.UNLOCKING) unlocking_was_check_sigs = true;

                // Es wird Signalisiert dass keine Weiteren änderungen an dem PublicKeyWhiteList Objekt zulässig sind
                if(allowed_signature_public_keys.setAsFinallyAndLock() !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_check_sig', excpetions.error_messages.interpreter.emit_functions.check_sig.finally_unlocked_error);
                    return false; 
                }

                // Das Skript ist erfolgreich durchgeführt wurden
                print('EmitCall:', 'op_unlock #', true, '&', 'and unlock');
                return { hex_str_list:copyed_item };
            }
            // Fügt einen neuen Berechtigen Schlüssel in die Verifyer liste hinzu
            // sollte ein Schlüssel bereits auf der Schlüssel liste sich befinden, wir der Vorgang abgebrochen
            else if(current_item === op_codes.op_add_verify_key) {
                // Es wird geprüft ob Mindestens 1 Schlüssel auf dem Stack ist
                if(readed_parren_cube.items.length < 1 || readed_parren_cube.items.length > 255) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_add_verify_key', excpetions.error_messages.interpreter.emit_functions.add_verify_key.parameter_error);
                    return false; 
                }

                // Die Einzelnen Schlüssel werden Hinzugefügt
                for(let obj of readed_parren_cube.items) {
                    // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel oder um eine Adresse handelt
                    if(obj.constructor.name !== 'PublicKeyValue' && obj.constructor.name !== 'AlternativeBlockchainAddressValue') {
                        close_by_error(script_result_obj, 'EmitCall:', 'op_add_verify_key', excpetions.error_messages.interpreter.emit_functions.add_verify_key.data_type_error);
                        return false; 
                    }

                    // Es wird versucht den Öffentlichen Schlüssel hinzuzufügen
                    if(allowed_signature_public_keys.addPkey(obj) !== true) {
                        close_by_error(script_result_obj, 'EmitCall:', 'op_add_verify_key', excpetions.error_messages.interpreter.emit_functions.add_verify_key.public_key_adding_error);
                        return false; 
                    }

                    // Debug Log
                    print('EmitCall:', 'op_add_verify_key', obj.value, true);
                }

                // Die anzahl der benötigten Signaturen wird neu festgelegt
                print('EmitCall:', 'op_add_verify_key', allowed_signature_public_keys.needs_sigs.toString());
                return { hex_str_list:copyed_item };
            }
            // Fügt erst einen Öffentlichen Schlüssel hinzu und führt dann eine Signatur prüffung durch
            // wenn die Prüfung fehlschlägt wird der Vorgang abgebrochen
            else if(current_item === op_codes.op_add_pk_sverify) {
                // Es wird geprüft ob bereits ein Öffentlicher Schlüssel auf dem PublicKey Stack liegt
                if(allowed_signature_public_keys.totalPublicKeys() !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.parameter_error);
                    return false; 
                }

                /* Die Öffentlichen Schlüssel werden hinzugefügt */

                // Es wird geprüft ob Mindestens 1 Schlüssel auf dem Stack ist
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.minimum_keys_available);
                    return false; 
                }

                // Die Einzelnen Schlüssel werden Hinzugefügt
                for(let obj of readed_parren_cube.items) {
                    // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel oder um eine Adresse handelt
                    if(obj.constructor.name !== 'PublicKeyValue' && obj.constructor.name !== 'AlternativeBlockchainAddressValue') {
                        close_by_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.data_type_error);
                        return false; 
                    }

                    // Es wird versucht den Öffentlichen Schlüssel hinzuzufügen
                    if(allowed_signature_public_keys.addPkey(obj) !== true) {
                        close_by_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.key_adding_error);
                        return false; 
                    }

                    // Debug Log
                    print('EmitCall:', 'op_add_pk_sverify', obj.value);
                }

                // Die anzahl der benötigten Signaturen wird neu festgelegt
                print('EmitCall:', 'op_add_pk_sverify', 'SubEmitCall:', 'set_needed_sigs', allowed_signature_public_keys.needs_sigs.toString());

                /* Die Signaturen werden geprüft */

                // Es wird geprüft ob die Signaturen korrekt sind
                if((await validate_unlockscript_sig(script_result_obj)) !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.sig_check_error);
                    return false; 
                }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(script_result_obj.signalUnlock() !== true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.signal_unlocking_error);
                    return false; 
                }

                // Es wird Signalisiert dass keine Weiteren änderungen an dem PublicKeyWhiteList Objekt zulässig sind
                if(allowed_signature_public_keys.setAsFinallyAndLock() !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_add_pk_sverify', excpetions.error_messages.interpreter.emit_functions.add_verify_key_and_check_sigs.finally_unlocked_error);
                    return false; 
                }

                // Es wird ein VM True auf den Y Stack geschoben
                print('EmitCall:', 'op_add_pk_sverify', 'ok');
                y_stack_array.push(securevm.true);
                return { hex_str_list:copyed_item };
            }
            // Setzt die Anzahl der Mindestens benötigten Signaturen an
            // wenn nicht wird das Skript mit einem Ungültig abgebrochen
            else if(current_item === op_codes.op_set_n_of_m) {
                // Es wird geprüft ob 1 Argument vorhanden ist
                if(readed_parren_cube.items.length !== 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_set_n_of_m', excpetions.error_messages.interpreter.emit_functions.set_n_of_m_signatures.parameter_error);
                    return false;
                }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = readed_parren_cube.items.shift();
                if(typeof number_read_result !== 'object' || number_read_result.constructor.name !== 'NumberValue') {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_set_n_of_m', excpetions.error_messages.interpreter.emit_functions.set_n_of_m_signatures.invalid_parameter);
                    return false; 
                }

                // Es wird geprüft ob die Zahl größer oder gleich 0 ist
                if(BigInt(0) >= number_read_result.value) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_set_n_of_m', excpetions.error_messages.interpreter.emit_functions.set_n_of_m_signatures.invalid_number);
                    return false; 
                }

                // Es wird geprüft ob die Anzahl der Verfügabren PublicKeys größer ist als die Anzahl der Zulässigen
                if(BigInt(allowed_signature_public_keys.totalPublicKeys()) < number_read_result.value) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_set_n_of_m', excpetions.error_messages.interpreter.emit_functions.set_n_of_m_signatures.not_entrought_public_keys); 
                    return false; 
                }

                // Die Zahl der benötigten Signaturen wird festgelegt
                if(allowed_signature_public_keys.setNeededSignatures(Number(number_read_result.value)) !== true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_set_n_of_m', excpetions.error_messages.interpreter.emit_functions.set_n_of_m_signatures.invalid_signatures_seted); 
                    return false; 
                }

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'set_needed_sigs', number_read_result.value.toString(), 'ok');
                return { hex_str_list:copyed_item };
            }
            // Wird ausgeführt wenn das Skript fehlerhaft abgebrochen werden soll
            // selbst wenn das Skript vorher ein Unlock ausgeführt hat, wird es mit dem Aufruf dieser Funktion ungültig
            else if(current_item === op_codes.op_script_abort) {
                // Es wird geprüft ob 0 Argumente Vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_script_abort', excpetions.error_messages.interpreter.emit_functions.abort.parameter_error);
                    return false;
                }

                // Es wird Signalisiert dass das Skript abgebrochen werden soll
                script_result_obj.signalAbort();

                // Das Skript ist erfolgreich durchgeführt wurden
                print('EmitCall:', 'op_script_abort', 'ok');
                return { hex_str_list:[] };
            }
            // Wird ausgeführt um einen Wert auf das Y Stack zu legen
            // es dürfen keine Chainstate wertte auf das Y Stakc gelegt werden
            else if(current_item === op_codes.op_push_to_y) {
                // Es wird versucht die ParrenCube werte auszulesen
                if(readed_parren_cube === false) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_push_to_y', excpetions.error_messages.interpreter.emit_functions.push_to_y.parameter_error);
                    return false; 
                }
                if(readed_parren_cube.items < 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_push_to_y', excpetions.error_messages.interpreter.emit_functions.push_to_y.to_small_items);
                    return false; 
                }

                // Es wird versucht dein Eintrag auf das Stack zu legen
                for(let citem of push_function_parren.items) {
                    print('MemoryStack:', 'add', citem.value);
                    y_stack_array.push(citem);
                }

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'op_push_to_y', push_function_parren.items.length, 'items', 'ok');
                return { hex_str_list:push_function_parren.hex_str_list };
            }
            // Wird ausführt um zu Überprüfen ob die Angegebene Sperrzeit erreicht wurde
            // die Sperrzeit wird ab der Zeit gezählt wo die Transaktion in den Block aufgenommen wurde
            else if(current_item === op_codes.op_check_locktimeverify) {
                // Es wird geprüft ob 1 Argument Vorhanden ist
                if(readed_parren_cube.items.length !== 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_locktimeverify', excpetions.error_messages.interpreter.emit_functions.check_lock_verify_time.parameter_error);
                    return false;
                }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = readed_parren_cube.items.shift();
                if(typeof number_read_result !== 'object' || number_read_result.constructor.name !== 'NumberValue') {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_locktimeverify', excpetions.error_messages.interpreter.emit_functions.check_lock_verify_time.invalid_parameter);
                    return false; 
                }

                // Es wird geprüft ob es sich um einen Zulässigen Typen von Nummer handelt
                if([NumberType.bit8, NumberType.bit16, NumberType.bit32, NumberType.bit64].includes(number_read_result.value.n_type) !== true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_locktimeverify', excpetions.error_messages.interpreter.emit_functions.check_lock_verify_time.invalid_number_type);
                    return false; 
                }

                // Es wird geprüft ob die Benötigte Zeit erreicht wurde
                let timestamp = number_read_result.value;
                if(chain_data.current_block_time.toNumber() >= timestamp) {
                    print('EmitCall:', 'op_check_locktimeverify', true, timestamp.toNumber());
                    return { hex_str_list:copyed_item };
                }

                // Das Skript wird abgebrochen
                print('EmitCall:', 'op_check_locktimeverify', false, timestamp.toNumber());
                script_result_obj.signalAbort();
                return false;
            }
            // Wird ausgeführt um zu überprüfen ob die angegebene Sperrzeit in Form der Blockhöhe erreicht wurde
            // die Blockhöhe wird ab dem Block gemessen wo die Transaktion in einen Block geschrieben wurde
            else if(current_item === op_codes.op_check_blockblockverify) {
                // Es wird geprüft ob 1 Argument Vorhanden ist
                if(readed_parren_cube.items.length !== 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_blockblockverify', excpetions.error_messages.interpreter.emit_functions.check_lock_block_time.parameter_error);
                    return false;
                }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = readed_parren_cube.items.shift();
                if(typeof number_read_result !== 'object' || number_read_result.constructor.name !== 'NumberValue') {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_blockblockverify', excpetions.error_messages.interpreter.emit_functions.check_lock_block_time.invalid_parameter);
                    return false; 
                }

                // Es wird geprüft ob es sich um einen Zulässigen Typen von Nummer handelt
                if([NumberType.bit8, NumberType.bit16, NumberType.bit32].includes(number_read_result.value.n_type) !== true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_check_blockblockverify', excpetions.error_messages.interpreter.emit_functions.check_lock_block_time.invalid_number_type);
                    return false; 
                }

                // Es wird geprüft ob die Benötigte Blockzeit erreicht wurde
                let unlock_hight = number_read_result.value + tx_check_data.input_tx_block_hight;
                if(chain_data.current_block_hight >= unlock_hight) {
                    print('EmitCall:', 'op_check_blockblockverify', true, unlock_hight.toNumber());
                    return { hex_str_list:copyed_item };
                }

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'op_check_blockblockverify', false, unlock_hight.toNumber());
                script_result_obj.signalAbort();
                return false;
            }
            // Wird verwendet um zu überprüfen ob der Hash des Unlocking Skriptes mit dem Angegeben Hash übereinstimmt
            // vergleicht den Hash des Unlocking Skriptes mit einem 64 Zeichen großen wert, sollten die Werte nicht übereinstimmen, wird das Skript abgebrochen
            else if(current_item === op_codes.op_eq_unlock_script_hash) {
                // Es wird geprüft ob 1 Argument vorhanden ist
                if(readed_parren_cube.items.length !== 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_eq_unlock_script_hash', excpetions.error_messages.interpreter.emit_functions.unlocking_script_hash.parameter_error);
                    return false;
                }

                // Es wird geprüft ob nachfolgend ein Hexwert kommt
                let hex_str_readed_result = readed_parren_cube.items.shift();
                if(typeof hex_str_readed_result !== 'object' || hex_str_readed_result.constructor.name !== 'HexString') {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_eq_unlock_script_hash', excpetions.error_messages.interpreter.emit_functions.unlocking_script_hash.invalid_parameter);
                    return false; 
                }

                // Es wird geprüft ob der Hash 64 Zeichen groß ist
                if(hex_str_readed_result.value.length !== 64) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_eq_unlock_script_hash', excpetions.error_messages.interpreter.emit_functions.unlocking_script_hash.invalid_hex_str_size);
                    return false; 
                }

                // Der Hash des Unlocking Skriptes wird mit dem Angegebene Hash verglichen
                if(unlocking_script_hash.toLowerCase() !== hex_str_readed_result.value.toLowerCase()) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_eq_unlock_script_hash', unlocking_script_hash.toLowerCase(), hex_str_readed_result.value.toLowerCase(), false);
                    return false; 
                }

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'op_eq_unlock_script_hash', unlocking_script_hash.toLowerCase(), hex_str_readed_result.value.toLowerCase(), true);
                return { hex_str_list:copyed_item };
            }
            // Wird verwendet um zu überprüfen ob Spizielle Public Keys verwendet wurde um die Transaktion zu Signieren
            // sollten mehr als 1 Public Key vorhanden sein oder die Signatur nicht übereinstimmen, wird das Skript abgebrochen
            else if(current_item === op_codes.op_eq_signers) {
                // Es wird geprüft ob sich mindestens 1 Element au dem Stack befindet
                if(readed_parren_cube.items.length < 1) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_eq_signers', excpetions.error_messages.interpreter.emit_functions.er_signers.parameter_error);
                    return false; 
                }

                // Es wird geprüft ob das Maximum für Parren Elemente überschritten wurde
                if(readed_parren_cube.items.length > MAX_PARREN_ITEMS) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_eq_signers', excpetions.error_messages.interpreter.emit_functions.er_signers.max_parameter);
                    return false; 
                }

                // Es werden alle Öffentlichen Schlüssel extrahiert welche verwendet wurden
                let extracted_used_public_keys = allowed_signature_public_keys.getUsedSignaturesPublicKeys().map((r) => r.value.toLowerCase());

                // Die Items auf dem Stack werden abgearbeitet und geprüft
                for(let obj of readed_parren_cube.items) {
                    // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel oder um eine Adresse handelt
                    if(obj.constructor.name !== 'PublicKeyValue' && obj.constructor.name !== 'AlternativeBlockchainAddressValue') {
                        close_by_error(script_result_obj, 'EmitCall:', 'op_eq_signers', excpetions.error_messages.interpreter.emit_functions.er_signers.public_key_type_error);
                        return false; 
                    }

                    // Es wird geprüft ob der Schlüssel verwendet wird
                    if(extracted_used_public_keys.includes(obj.value) !== true) {
                        abort_without_error(script_result_obj, 'EmitCall:', 'op_eq_signers', excpetions.error_messages.interpreter.emit_functions.er_signers.used_key_error);
                        return false; 
                    }
                }

                // Die Daten werden zurückgegeben
                print('EmitCall:', 'op_eq_signers', obj.value, true);
                return { hex_str_list:readed_parren_cube.hex_str_list };
            }
            // Wird verwendet um zu überprüfen ob die Signaturen erfolgreich geprüft wurden
            // wenn nicht wird das Skript abgebrochen
            else if(current_item === op_codes.op_unlock_when_sig_verify) {
                // Es wird geprüft ob 0 Argumente Vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_unlock_when_sig_verify', excpetions.error_messages.interpreter.emit_functions.unlock_then_eq_sig.parameter_error);
                    return false;
                }

                // Es wird geprüft ob die Signatur Prüfung erfolgreich abgeschlossen wurde
                if(allowed_signature_public_keys.isFinallyTrueLocked() !== true) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_unlock_when_sig_verify', excpetions.error_messages.interpreter.emit_functions.unlock_then_eq_sig.is_finally_true); 
                    return false; 
                }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(script_result_obj.signalUnlock() !== true) {
                    abort_without_error(script_result_obj, 'EmitCall:', 'op_unlock_when_sig_verify', excpetions.error_messages.interpreter.emit_functions.unlock_then_eq_sig.signal_unlock_error);
                    return false; 
                }

                // Die Daten werden zurückgegeben
                // Es wird ein VM True auf den Y Stack geschoben
                y_stack_array.push(securevm.true);
                print('EmitCall:', 'op_unlock_when_sig_verify', true);
                return { hex_str_list:copyed_item };
            }
            // Es wird geprüft ob es sich um eine NOP Operation handelt
            // diese Operation haben keine Auswikung auf die Ausführung des Skriptes und machen es nicht ungültigt
            else if(NOP_OP_CODES.includes(current_item) === true) {
                print('EmitCall:', 'nop_op_code_call');
                return { hex_str_list:copyed_item };
            }
            // Beendet die ausführung des gesamten Skriptes ohne es Ungültig zu machen
            else if(current_item === op_codes.op_exit) {
                // Es wird geprüft ob 0 Argumente Vorhanden sind
                if(readed_parren_cube.items.length !== 0) {
                    close_by_error(script_result_obj, 'EmitCall:', 'op_exit', excpetions.error_messages.interpreter.emit_functions.exit.parameter_error);
                    return false;
                }

                // Es wird Signalisiert dass das Skript beendet werden soll
                script_result_obj.signalExit();

                // Das Skript ist erfolgreich durchgeführt wurden
                print('EmitCall:', 'op_exit');
                return { hex_str_list:[] };
            }
            // Es handelt sich um einen unbekannten emit OP_CODE
            else {
                close_by_error(script_result_obj, 'EmitCall:', '???', excpetions.error_messages.interpreter.emit_functions.unkown_function);
                return false;
            }
        }
        catch(e) {
            // Es ist ein Schwerwiegender Fehler aufgetreten, dass Skript wird abgebrochen
            close_by_error(script_result_obj, 'EmitCall:', 'Exception ->', e);
            return false;
        }
    };

    // Führt ein Hex String aus
    async function interpr_hex_string(hex_string, sub_call=0, script_type=null, script_result_obj=null) {
        // Es wird geprüft ob es sich um einen String handelt
        if(typeof hex_string !== 'string') throw new Error('Invalid data');
        if(hex_string.length < 2) return { hex_str_list:[] };

        // Es wird geprüft ob das Stack die Maximalgröße von 1024 Einträgen übersteigt
        if(hex_string.length > MAX_SCRIPT_SIZE) throw new Error('Invalid data');

        // Der String wird in 2 Zeichen aufgedrennt
        let splited_hex_string = hex_string.toLowerCase().match(/.{2}/g);

        // Das Stack wird abgearbeitet bis er leer ist
        try {
            while(splited_hex_string.length > 0) {
                // Es wird geprüft ob das Skript beendet wurde
                if(script_result_obj.isClosedOrAborted() === true) break;

                // Es wird geprüft ob es sich um einen EMIT Funktionsaufruf handelt
                let sitc_intrpr = await next_inter_if_function(splited_hex_string, script_type, false, false, sub_call, script_result_obj);
                if(sitc_intrpr !== false) {
                    splited_hex_string = sitc_intrpr.hex_str_list;
                    continue;
                }

                // Es wird geprüft ob das Skript beendet wurde
                if(script_result_obj.isClosedOrAborted() === true) break;

                // Es wird geprüft ob es sich um einen EMIT Call handelt
                sitc_intrpr = await next_inter_emit_call(splited_hex_string, script_type, script_result_obj);
                if(sitc_intrpr !== false) {
                    splited_hex_string = sitc_intrpr.hex_str_list;
                    continue;
                }

                // Es wird geprüft ob das Skript beendet wurde
                if(script_result_obj.isClosedOrAborted() === true) break;

                // Es handelt sich um ein ungültes Skript
                close_by_error(script_result_obj, 'This is an invalid script, an unknown command was found on the script stack.');
                return { hex_str_list:[] }; 
            }
        }
        catch(e) {
            close_by_error(script_result_obj, e);
            return { hex_str_list:[] }; 
        }

        // Die Hexliste wird zurückgegeben
        return { hex_str_list:splited_hex_string };
    };

    // Wird verwendet um dass Unlocking Skript auszuführen
    async function run_unlocking_script() {
        print('--- UNLOCKING_SCRIPT_DEBUG_START ---');
        let instance = new ScriptInstanceData();
        try {
            await interpr_hex_string(tx_check_data.getUnlockScriptHexStr(), 0, script_types.UNLOCKING, instance);
        }
        catch(e) {
            instance.abort_by_error(e);
        }
        print('--- UNLOCKING_SCRIPT_DEBUG_END ---');
        return instance;
    };

    // Wird verwendet um dass Locking Skript auszuführen
    async function run_locking_script() {
        print('--- LOCKING_SCRIPT_DEBUG_START ---');
        let instance = new ScriptInstanceData();
        try {
            await interpr_hex_string(tx_check_data.getLockingScriptHexStr(), 0, script_types.LOCKING, instance);
        }
        catch(e) {
            abort_by_error(e);
        }
        print('--- LOCKING_SCRIPT_DEBUG_END ---');
        return instance;
    };

    // Diese Funktion führt Input sowie Output Script parallel voneinander aus
    async function main_ioscript() {
        // Die Basis Informationen werden angezeigt
        printBaseInformations();
        print();

        // Das Unlocking Script wird ausgeführt
        let unlocking_script_result = await run_unlocking_script();
        print();

        // Das Locking Script wird eingelesen
        let locking_script_result = await run_locking_script();

        // Die Ergebnisse werden zusammengeführt
        let final_value = new SigScriptExecutionResults(
            unlocking_script_result, locking_script_result, unlocking_script_hash, locking_script_hash, yStackIsFinallyTrue(), allowed_signature_public_keys.getUsedSignaturesPublicKeys()
        );

        // Das Finale Objekt wird zurückgegeben
        return final_value;
    };

    // Führt beide Skripte aus und gibt die Ergebnisse zurück
    return (await main_ioscript());
};

// Exportiert den Interpreter
module.exports = hexed_script_interpreter;