const { HexString, NumberValue, BoolValue, HashValue, NullValue, PublicKeyValue, AlternativeBlockchainAddressValue, DateTimestamp, TxOutputMetaData, NumberType, compareValues } = require('./obj_types');
const blockchain_crypto = require('blckcrypto');
const op_codes = require('./opcodes');
let { bech32 } = require('bech32');
const web3 = require('web3');

// Gibt ein True an, dieses True wird nur Zurückgegeben wenn die Signaturen korrekt geprüft wurden
const SIG_CHECK_TRUE = 0;

// Speichert die Möglichen Skripttypen ab
const script_types = {
    LOCKING:0,
    UNLOCKING:1
};

// Speichert die Standardwerte für ein Skript ab
const DEFAULT_STATES = {
    verify_sig_checked:BigInt(0),               // <- Gibt an, weiviele Signaturen bereits georüft wurden
    script_sig_is_closed:false,                 // <- Gibt an ob die Signaturen dieses Skriptes beretis geprüft wurden
    total_op_codes_called:0,                    // <- Gibt an wieviele OP_Codes das aktuelle Skript hat
    needs_sigs:BigInt(0),                       // <- Gibt an, wieviele Signaturen geprüft werden sollen
    unlocked:false,                             // <- Gibt an ob das Skript feigegeben wurde
    aborted:false,                              // <- Bricht das Skript vollständig ab
    exit:false                                  // <- Das Skript wird Odnungsgemäß beendet
};

// Wird verwendet um ein Objekt zu Klonen
function clone_object(orig_obj) {
    return { ...orig_obj };
};

// Wird verwendet um zu überprüfen ob es sich um einen gültigen Hexstring handelt
function is_validate_hex_str(hex_str) {
    try { let a = Buffer.from(hex_str, 'hex').toString('hex'); return hex_str.toLowerCase() === a.toLowerCase(); }
    catch(e) { return false; }
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
const hexed_script_interpreter = async(locking_script, unlocking_data, c_block_hight=0n, script_sigs=[], last_block_value=null, current_chain_data=null, current_timest=new DateTimestamp("00000000000000000000000000000000"), commitment_data=null, debug=true) => {
    // Es wird geprüft ob es sich um gültige Hexstrings handelt
    if(unlocking_data.constructor.name !== 'TxOutputMetaData') throw new Error('Invalid unlocking script data');
    if(is_validate_hex_str(locking_script) !== true) throw new Error('Invalid locking script hex data');

    // Es wird geprüft ob es sich um eine gültige Blocknummer handelt
    if(c_block_hight === undefined || c_block_hight === null) throw new Error('No c_block_hight parameter found')
    if(typeof c_block_hight !== 'bigint' || c_block_hight < 0n) throw new Error('Invalid c_block_hight value');

    // Es wird geprüft ob es sich bei den Signaturen um ein Array handelt
    if(script_sigs === undefined || script_sigs === null) throw new Error('No script sigs parameter found')
    if(typeof script_sigs !== 'object' || Array.isArray(script_sigs) !== true) throw new Error('Invalid script sigs parameter value');

    // Es wird geprüft ob Mindestes eine Signatur und nicht mehr als 16 Signaturen vorhanden sind
    if(script_sigs.length < 1 || script_sigs.length > 16) throw new Error('Invalid script sigs length');

    // Es wird ein Hash aus dem Eingabe, sowie ausgabe Skript erstellt
    let unlocking_script_hash = blockchain_crypto.sha3(256, unlocking_data.getScript().toLowerCase());
    let locking_script_hash = blockchain_crypto.sha3(256, locking_script.toLowerCase());

    // Gibt an ob das Locking und oder das Unlocking Script eine Signatur Prüfung durchgeführt haben
    let locking_was_check_sigs = false, unlocking_was_check_sigs = false;

    // Es wird ein Number Objekt aus der Aktuellen Schwierigkeit erzeugt
    let current_block_diff = new NumberValue(0n, true, NumberType.bit64);

    // Es wird ein Hash Objekt des letzten Blocks erstetllt
    let last_block_hash = new HashValue("", 'sha3_256', true);

    // Es wird verwendet um zu Signalisieren dass das Commitment erfolgreich gepüft wurde
    let commitment_was_succs = false;

    // Es wird geprüft ob die Einträge auf dem Script Sigs Array korrekt ist
    for await(let sig_item of script_sigs) {
        // Es wird geprüft ob es sich um ein Zulässiges Objekt handelt
        if(typeof sig_item !== 'object') throw new Error('Invalid script sig item');
        if(sig_item.constructor.name !== 'SingleSignatureValue') throw new Error('Invalid script sig object type');

        // Führt eine Schnellprüfung durch
        if(sig_item.quickCheck() === false) throw new Error('Invalid signature for this script');
    }

    // Speichert spizielle Zustände des Aktuellen Skriptes ab
    let states = { ...DEFAULT_STATES };

    // Speichert alle PublicKeys ab, welche berechtigt sind mittels Signatur die Skripte zu überprüfen
    let allowed_public_key_array = [];

    // Speichert auftretende Exceptions ab
    let vm_inner_exceptions = null;

    // Speichert alle PublicKeys und die Signaturen ab, welche verwendet wurden um die beiden Skripte zu überprüfen
    let used_signatures = [];

    // Gibt an, gegen wieiviele Regeln verstoßen wurde
    let rule_cheatings = 0;

    // Speichert das Aktuelle Data Stack ab
    let y_stack_array = [];

    // Stellt die einzelnen EMIT Funktionen bereit welche dann aufgerufen werden vom Skript
    const emit_vm_functions = {
        // Fügt einen Öffentlichen Schlüssel oder eine Adresse zur VerifyerWhiteList hinzu
        add_verify_key: async(pkey_obj) => {
            print('script_adding_public_key', pkey_obj.value)
            allowed_public_key_array.push(pkey_obj);
            return true;
        },
        // Makiert das aktulelle Skript als Entsperrt
        unlock_script: () => {
            if(states.unlocked === true) return false;
            y_stack_array.push(SIG_CHECK_TRUE);
            states.unlocked = true;
            print('script_signaling', 'unlocked');
            return true;
        },
        // Signalisiert, dass das Commitment geprüft wurde
        signalCommitmentValidate: () => {
            commitment_was_succs = true;
        }
    };

    // Wird verwendet um einen neuen Vorgang vorzubereiten
    function new_reset_values() {
        return { ...DEFAULT_STATES };
    };

    // Wird ausgeführt wenn das Skript aufgrund eines Fehlers abgebrochen werden soll
    function close_by_error(...exception_text) {
        console.log(...exception_text);
        states.aborted = true;
    };

    // Wird ausgeführt wenn das Skript abgebrochen werden soll
    function abort_script() {
        states.aborted = true;
        return;
    };

    // Wird ausgeführt um den DEBUG Text auszzgeben
    function print(...text) {
        if(debug === false) return;
        console.log(...text)
    };

    // Gibt an ob die Ausführung des Skriptes abgebrochen wurde
    function script_running_aborted() {
        if(states.exit === true || states.aborted === true || vm_inner_exceptions !== null) return true;
        else return false;
    };

    // Wird verwendet um einen Öffentlichen Schlüssel zu Makrieren welcher erfolgreich für die Signaturprüfung verwendet wurden
    function mark_public_key_as_used_for_sig_check_true(public_key) {
        for(let otem of allowed_public_key_array) {
            if(otem.value === public_key) {
                otem.markAsUsed();
                break;
            }
        }
    };

    // Wird verwendet um zu überprüfen ob es sich um einen zulässigen Öffentlichen Schlüssel handelt
    async function is_allowed_public_key(public_key_str, algo) {
        for(let pkey of allowed_public_key_array) {
            if(pkey.value.toLowerCase() === public_key_str.toLowerCase()) return true;
        }
        return false;
    };

    // Wird verwendet um die Verwendeten Signaturen zu überprüfen
    async function validate_unlockscript_sig() {
        // Es wird geprüft ob mehr Signaturen als PublicKeys vorhanden sind
        if(script_sigs.length > allowed_public_key_array.length) return false;

        // Es wird geprüft für welche PublicKeys eine Signatur vorhanden ist
        let avail_pkey_signatures = [];
        for(let otems of script_sigs) {
            // Es wird geprüft ob es sich um einen Zulässigen Datentypen handelt
            if(typeof otems !== 'object') throw new Error('Invalid script');
            if(otems.constructor.name !== 'SingleSignatureValue') throw new Error('Invalid signature object');

            // Es wird geprüft ob es sich um einen Zulässigen Öffentlichen Schlüssel handelt
            if((await is_allowed_public_key(otems.value, null)) !== true) return false;

            // Es wird geprüft ob eine Signatur vorhanden ist
            if(otems.sig === undefined || otems.sig === null) return false;

            // Der Öffentliche Schlüssel wird für diesen Vorgang verwendet
            avail_pkey_signatures.push(otems);
        }

        // Es wird geprüft ob die Benötigte Mindestanzahl von Signaturen vorhanden ist
        if(BigInt(avail_pkey_signatures.length) < 1n || BigInt(avail_pkey_signatures.length) > 16n) {
            return false;
        }
        if(BigInt(avail_pkey_signatures.length) !== BigInt(script_sigs.length)) {
            return false;
        }

        // Es wird geprüft ob die Benötigte Anzahl von Signaturen vorhanden sind
        if(BigInt(avail_pkey_signatures.length) < states.needs_sigs) {
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
                // Der Öffentliche Schlüssel für diese Signatur wird als verwendet Makiert
                mark_public_key_as_used_for_sig_check_true(ssig.value);
    
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
                    let vresult = await blockchain_crypto.altchain.validateWeb3EthereumMessageSignature(ssig.value, ssig.sig, ssig.msg_hash);
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
                    close_by_error('Invalid script');
                    return false;
                }

                // Speichert die Verwendete Signaturen ab
                used_signatures.push(ssig);
    
                //console.log(last_unlocking_script_hash_signature);
                print('crypto_signature_verify', ssig.value, ssig.sig, true);
                states.verify_sig_checked++;
            }
        }
        catch(e) {
            print('crypto_signature_verify', ssig.value, ssig.sig, false, 'exception_called');
            close_by_error(e);
            return false;
        }

        // Es wird geprüft ob genausoviele Signaturen geprüft wurden wie benötigt werden
        if(states.verify_sig_checked !== states.needs_sigs) return false;
        if(used_signatures.length != states.needs_sigs) return false;

        // Es handelt sich um ein gültiges Skript
        return true;
    };

    // Diese Funktion wird verwendet um eine Zahl einzulesen
    async function next_read_number(hex_str_lst) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit8) };
        }
        else if(extracted_item === op_codes.op_uint_16) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 4);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit16) };
        }
        else if(extracted_item === op_codes.op_uint_32) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 8);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit32) };
        }
        else if(extracted_item === op_codes.op_uint_64) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 16);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit64) };
        }
        else if(extracted_item === op_codes.op_uint_128) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 32);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit128) };   
        }
        else if(extracted_item === op_codes.op_uint_256) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 64);

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:new NumberValue(BigInt(`0x${extracted.value}`), false, NumberType.bit256) };
        }
        else {
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob es sich um ein CHAIN_STATE Wert handelt
    async function next_is_inter_chain_state(hex_str_list, script_type=null) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
            return { hex_str_list:copyed_item, value:new NumberValue(c_block_hight, true, NumberType.bit256) };
        }
        // Gibt den Hash des letzten Blocks aus
        else if(script_stack_entry === op_codes.op_last_block_hash) {
            return { hex_str_list:copyed_item, value:last_block_hash };
        }
        // Gibt die Aktuelle Mining Schwierigkeit an
        else if(script_stack_entry === op_codes.op_current_block_diff) {
            return { hex_str_list:copyed_item, value:current_block_diff };
        }
        // Gibt die Anzahl der Signaturen aus
        else if(script_stack_entry === op_codes.op_total_signatures) {
            return { hex_str_list:copyed_item, value:new NumberValue(BigInt(script_sigs.length), true, NumberType.bit8) };
        }
        // Gibt die gesamtzahlen aller Signaturen an
        else {
            close_by_error('INVALID_CHAINSTATE_VALUE');
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob es sich um einen Hex String handelt
    async function next_is_inter_hex_str(hex_str_list, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen oder beendet wurde
        if(script_running_aborted() === true) return false;

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
            close_by_error('INVALID_HEX_STRING_SIZE');
            return false;
        }

        // Der String wird aus dem Stack extrahiert
        var hex_str = '';
        while(hex_str.length !== hex_str_len) { hex_str = hex_str + copyed_item.shift(); }
        if(hex_str.length !== hex_str_len) {
            close_by_error('INVALID_HEX_STRING_REPLIED');
            return false;
        }

        // Die neue Daten Liste wird zurückgegeben
        return { hex_str_list:copyed_item, value:new HexString(hex_str, false) };
    };

    // Wird verwendet um ParrentCube Werte auszuwerten
    async function next_read_parren_cube(hex_str_lst, script_type, is_emit_call=false) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_parren_fnc_cube) return false;

        // Die Anzahl der Verfügbaren Parameter werden extrahiert
        let total_parameters = parseInt(`0x${copyed_item.shift()}`);

        // Diese Funktion prüft ob der nächste Wert ein Chainstate, Nummer, String oder Hexwert ist
        const loop_arround_function = async() => {
            // Prüft ob es sich um einen Chainstate Wert handelt
            let chain_state_value = await next_is_inter_chain_state(copyed_item, script_type);
            if(chain_state_value !== false) {
                copyed_item = chain_state_value.hex_str_list;
                return chain_state_value;
            }

            // Prüft ob es sich um einen
            let intepr_hex_value = await next_is_inter_hex_str(copyed_item, script_type);
            if(intepr_hex_value !== false) {
                copyed_item = intepr_hex_value.hex_str_list;
                return intepr_hex_value; 
            }

            // Prüft ob es sich um eine Nummer handelt
            let intepr_number_value = await next_read_number(copyed_item);
            if(intepr_number_value !== false) {
                copyed_item = intepr_number_value.hex_str_list;
                return intepr_number_value; 
            }

            // Prüft ob es sich um ein Boolean Handelt
            let interpr_bool_value = await next_read_bool(copyed_item);
            if(interpr_bool_value !== false) {
                copyed_item = interpr_bool_value.hex_str_list;
                return interpr_bool_value; 
            }

            // Es wird geprüft ob es sich um eine Value Funktion handelt
            let interpr_value_function = await next_read_value_function(copyed_item, script_type);
            if(interpr_value_function !== false) {
                copyed_item = interpr_value_function.hex_str_list;
                return interpr_value_function; 
            }

            // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel handelt
            let read_public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
            if(read_public_key_declaration !== false) {
                copyed_item = read_public_key_declaration.hex_str_lst;
                return read_public_key_declaration; 
            }

            // Es wird geprüft ob es sich um eine AlternateBlockchainAddress handelt
            let readed_address_declaration = await next_read_altchain_address(copyed_item, script_type);
            if(readed_address_declaration !== false) {
                copyed_item = readed_address_declaration.hex_str_lst;
                return readed_address_declaration; 
            }

            // Es handelt sich um eine Unbeaknnte aufgabe
            close_by_error('INVALID_FUNCTION_PARREN_VALUE');
            return false;
        };

        // Die Einzelnen Parameter werden ausgewertet
        let readed_parameters = [];
        while(readed_parameters.length !== total_parameters) {
            let arround_functions = await loop_arround_function();
            readed_parameters.push(arround_functions);
        };

        // Gibt die Ürbirgen Daten zurück
        return { hex_str_list:copyed_item, items:readed_parameters};
    };

    // Diese Funktion wird verwendet um eine Value Funktion auszuführen
    async function next_read_value_function(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        let readed_parren_cube = await next_read_parren_cube(copyed_item, script_type, false);
        if(readed_parren_cube === false) {
            if(script_running_aborted() === true) return false;
            close_by_error('INVALID_PARREN_CUBE_VALUE');
            return false; 
        }

        // Der Aktuelle Code wird geupdated
        copyed_item = readed_parren_cube.hex_str_list;

        // Es wird geprüft um was für eine Funktion es sich handelt
        if(current_item === op_codes.op_is_one_signer) {
            // Es wird geprüft ob keine Werte in dem Parrn Cube vorhanden sind
            if(readed_parren_cube.items.length !== 0) { close_by_error('FUNCTION_DONT_ALLOWED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'is_one_signer', script_sigs.length === 1);
            return { hex_str_list:copyed_item, value:new BoolValue((script_sigs.length === 1), true) };
        }
        // Es wird geprüft ob es sich um eine SHA256d Funktion handelt
        else if(current_item === op_codes.op_sha256d) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SHA256D_FUNCTION_NEED_MINIMUM_ONE_VALUE'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.sha2d(256, ...extract_obj_values(readed_parren_cube.items));

            // Die Daten werden zurückgegeben
            print('value_function', 'compute_sha256d_hash', final_value_hash);
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d', false) };
        }
        // Es wird geprüft ob es sich um eine SHA3 Funktion handelt
        else if(current_item === op_codes.op_sha3) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SHA3_256_NEED_MINIMUM_ONE_PARAMETER'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.sha3(256, ...extract_obj_values(readed_parren_cube.items));

            // Die Daten werden zurückgegeben
            print('value_function', 'compute_sha3_256_hash', final_value_hash);
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha3_256', false) };
        }
        // Es wird geprüft ob es sich um einen SwiftyHash handelt
        else if(current_item === op_codes.op_swifty_h) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SWIFTYH_256_NEED_MINIMUM_ONE_PARAMETER'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.swiftyHash(256, ...extract_obj_values(readed_parren_cube.items));

            // Die Daten werden zurückgegeben
            print('value_function', 'compute_swiftyh_256_hash', final_value_hash);
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'swiftyh_256', false) };
        }
        // Wird verwendet um den letzten Eintrag vom Y Stack zurückzugeben
        else if(current_item === op_codes.op_pop_from_y) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('FUNCTION_DONT_ALLOWED_PARAMETERS'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            if(y_stack_array.length === 0) return { hex_str_list:copyed_item, value:new NullValue() };

            // Die Daten werden zurückgegeben
            print('value_function', 'pop_from_y');
            return { hex_str_list:copyed_item, value:y_stack_array.shift() };
        }
        // Wird verwendet um die Gesamtzahl aller Signaturen auszugeben
        else if(current_item === op_codes.op_total_signatures) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('TOTAL_SIGNERS_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'total_signers', allowed_public_key_array.length);
            return { hex_str_list:copyed_item, value:new NumberValue(BigInt(allowed_public_key_array.length), true, NumberType.bit8) };
        }
        // Wird verwendet um den Aktuellen Blockhash auszugeben
        else if(current_item === op_codes.op_last_block_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('LAST_BLOCK_HASH_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'last_block_hash', last_block_hash);
            return { hex_str_list:copyed_item, value:last_block_hash };
        }
        // Wird verwendet um die Aktuelle Block Schwierigkeit auszugeben
        else if(current_item === op_codes.op_current_block_diff) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('CURRENT_BLOCK_DIFF_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'current_block_diff', current_block_diff.value);
            return { hex_str_list:copyed_item, value:current_block_diff };
        }
        // Wird verwendet um den Hash des Locking Scripts auszugeben
        else if(current_item === op_codes.op_lock_script_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('GET_CURRENT_LOCKING_SCRIPT_HASH_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'lock_script_hash', locking_script_hash);
            return { hex_str_list:copyed_item, value:new HashValue(locking_script_hash, 'sha3_256', true) };
        }
        // Wird verwendet um den Hash des Locking Scripts auszugeben
        else if(current_item === op_codes.op_unlock_script_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('GET_CURRENT_UNLOCKING_SCRIPT_HASH_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'unlock_script_hash', unlocking_script_hash);
            return { hex_str_list:copyed_item, value:new HashValue(unlocking_script_hash, 'sha3_256', true) };
        }
        // Wird verwendet um die Aktuelle Block Höhe auszugeben
        else if(current_item === op_codes.op_current_block_hight) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('GET_CURRENT_BLOCK_HIGHT_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            print('value_function', 'current_block_highgt', c_block_hight.toString());
            return { hex_str_list:copyed_item, value:new NumberValue(c_block_hight, true, NumberType.bit256) };
        }
        // Wird verwendet um zu überprüfen ob ein oder mehrere bestimmte PublicKeys oder Adressen dieses Skript signiert haben
        else if(current_item === op_codes.op_eq_signers) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('EQ_SIGNERS_NEEDS_MINIMUM_ONE_VALUE'); return false; }

            // Es wird geprüft ob es sich um gültige Parameter handelt
            let is_ok = true;
            for(let otem of readed_parren_cube.items) {
                let arrv = script_sigs.map((r) => r.value);
                if(arrv.includes(otem.value.value) !== true) {
                    is_ok = false;
                    break;
                }
            }

            // Die Daten werden zurückgegeben
            print('value_function', 'eq_verify_signatures', is_ok);
            return { hex_str_list:copyed_item, value:new BoolValue(is_ok, true) };
        }
        // Es konnte kein gültiger Befehler gefunden werden
        else {
            throw new Error('Invalid script');
        }
    };

    // Diese Funktion wird verwendet um ein Bool einzulesen
    async function next_read_bool(hex_str_list) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry === op_codes.op_true) {
            let reconstructed_bool = new BoolValue(true, false);
            return { hex_str_list:copyed_item, bool_value:reconstructed_bool };
        }
        else if(script_stack_entry === op_codes.op_false) {
            let reconstructed_bool = new BoolValue(false, false);
            return { hex_str_list:copyed_item, bool_value:reconstructed_bool };
        }
        else {
            return false;
        }
    };

    // Diese Funktion wird verwendet um ein ELSE Block auszulesen
    async function next_is_else_block(hex_str_list, script_type=null, erase=false) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry !== op_codes.op_else) return false;

        // Die Länge des Codeblocks wird ermittelt
        let code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16);

        // Die Nächsten X Zeichen werden extrahiert
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Die Daten werden Interpretiert
        if(erase === false) {
            let resva_lst = await interpr_hex_string(x_chars, true, script_type);
            if(resva_lst === false) {
                if(script_running_aborted() === true) return false;
                close_by_error('INVALID_PARREN_CUBE_VALUE');
                return false; 
            }
        }

        // Die Übrigen Daten werden zurückgegeben
        return { hex_str_list:copyed_item };
    };

    // Die Funktion wird ausgeführt wenn es sich um ein IF Statemant handelt
    async function next_inter_if_function(hex_str_lst, script_type=null, is_else_if=false, erase=false) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(is_else_if === true) {
            if(extracted_item !== op_codes.op_elif) return false;
        }
        else {
            if(extracted_item !== op_codes.op_if) return false;
        }

        // Es wird geprüft um was für eine Anweisung es sich handelt
        let if_conditions = copyed_item.shift();
        if(if_conditions !== op_codes.op_match && if_conditions !== op_codes.op_ibigger && if_conditions !== op_codes.op_ismall && if_conditions !== op_codes.op_nmatch) {
            throw new Error('Invalid script');
        }

        // Diese Funktion prüft ob der nächste Wert ein Chainstate, Nummer, String oder Hexwert ist
        const loop_f = async() => {
            // Es wird geprüft ob das Skript abgebrochen wurde
            if(script_running_aborted() === true) return;

            // Prüft ob es sich um einen Chainstate Wert handelt
            let chain_state_value = await next_is_inter_chain_state(copyed_item, script_type);
            if(chain_state_value !== false) {
                y_stack_array.push(chain_state_value.value);
                copyed_item = chain_state_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um einen
            let intepr_hex_value = await next_is_inter_hex_str(copyed_item, script_type);
            if(intepr_hex_value !== false) {
                y_stack_array.push(intepr_hex_value.value);
                copyed_item = intepr_hex_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um eine Nummer handelt
            let intepr_number_value = await next_read_number(copyed_item);
            if(intepr_number_value !== false) {
                y_stack_array.push(intepr_number_value.int_value);
                copyed_item = intepr_number_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um ein Boolean Handelt
            let interpr_bool_value = await next_read_bool(copyed_item);
            if(interpr_bool_value !== false) {
                y_stack_array.push(interpr_bool_value.bool_value);
                copyed_item = interpr_bool_value.hex_str_list;
                return; 
            }

            // Es wird geprüft ob es sich um eine Value Funktion handelt
            let interpr_value_function = await next_read_value_function(copyed_item, script_type);
            if(script_running_aborted() === true) return;
            if(interpr_value_function !== false) {
                y_stack_array.push(interpr_value_function.value);
                copyed_item = interpr_value_function.hex_str_list;
                return; 
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(script_running_aborted() === true) return;

            // Es handelt sich um eine Unbeaknnte aufgabe
            throw new Error('Invalid script');
        };

        // Die Schleife wird 2x ausgeführt
        await loop_f(); await loop_f();

        // Es wird geprüft ob die Ausführung des Skriptes abgebrochen wurde
        if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

        // Es wird geprüft ob 2 Werte auf dem Y Stack liegen
        if(y_stack_array.length < 2) throw new Error('Invalid script');

        // Die Items auf dem Stack werden extrahiert
        let item_a = y_stack_array.pop(), item_b = y_stack_array.pop();

        // Es wird geprüft, welche Operation durchgeführt werden soll
        let script_stack_result = false;
        if(if_conditions === op_codes.op_match) {
            script_stack_result = compareValues(item_a, item_b);
            print('operation', 'if_compare', item_a.value, item_b.value, script_stack_result);
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else {
            throw new Error('Invalid script');
        }

        // Die Länge des Codeblocks wird ermittelt
        let code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16);

        // Die Nächsten X Zeichen werden extrahiert
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Es wird geprüft ob der Block ausgeführt werden soll
        if(script_stack_result === true) {
            // Es wird geprüft ob der Code nur gelöscht werden soll
            if(erase === false) {
                // Der Code wird ausgeführt
                let resva_lst = await interpr_hex_string(x_chars, true, script_type);
                if(resva_lst === false) throw new Error('Invalid script');
                return { hex_str_list:resva_lst.hex_str_list, was_used:true, direct:false };
            }
        }

        // Es wird geprüft ob es sich um einen ELSE_IF Block handelt
        if(is_else_if === true) {
            return { hex_str_list:copyed_item, was_used:false, direct:false };
        }

        // Die Schleife wird solange ausgeführt, bis kein ELSE_IF mehr kommt oder ein ELSE kommt oder nichts von beiden
        while(copyed_item.length > 0) {
            // Es wird geprüft ob es sich um einen ELSE_IF Statement handelt
            let else_block_checks = await next_inter_if_function(copyed_item, script_type, true, ((script_stack_result === true) ? true : false));
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
                continue;
            }

            // Es wird geprüft ob das Skript beendet
            if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

            // Es wird geprüft ob es sich um ein ELSE Statement handelt
            else_block_checks = await next_is_else_block(copyed_item, script_type, ((script_stack_result === true) ? true : false));
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
            }

            // Die Schleife wird beendet, keine der beiden Funktionen war zutreffend
            break;
        };

        // Es wird geprüft ob das Skript beendet wurde
        if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

        // Gibt die Ergebnisse zurück
        return { hex_str_list:copyed_item, was_used:true, direct:false };
    };

    // Diese Funktion wird ausgeführt um definerite Öffentliche Schlüssel einzuelesen
    async function next_read_public_key_defination(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_public_key_defination) return false;
        print('public_key_reading');

        // Es wird geprüft ob danach ein zulässiger Alrorithmns kommt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_secp256k1_schnorr) {
            // Es wird geprüft ob sich noch 32 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 32) { close_by_error('INVALID_SECP256K1_PUBLIC_KEY'); return false; }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('secp256k1_schnorr_32_byte_public_key_readed', full_str);
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'secp256k1', false) };
        }
        else if(extracted_item === op_codes.op_curve25519) {
            // Es wird geprüft ob sich noch 32 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 32) { close_by_error('INVALID_CURVE25519_PUBLIC_KEY'); return false; }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('curve25519_schnorr_32_byte_public_key_readed', full_str);
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'curve25519', false) };
        }
        else if(extracted_item === op_codes.op_bls12381) {
            // Es wird geprüft ob sich noch 48 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 48) { close_by_error('INVALID_CURVE25519_PUBLIC_KEY'); return false; }

            // Der String wird wird nachgebaut
            let full_str = '';
            while(full_str.length !== 96) full_str = full_str + copyed_item.shift();

            // Der Öffentliche Schlüssel wird zurückgegeben
            print('bls12_381_public_key_readed', full_str);
            return { hex_str_lst:copyed_item, value:new PublicKeyValue(full_str, 'bls12381', false) };
        }
        else {
            throw new Error('Invalid script');
        }
    };

    // Diese Funktion wird ausgeführt um eine definierte Altchain Adresse einzulesen
    async function next_read_altchain_address(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_address_defination) return false;

        // Es wird geprüft ob danach ein zulässiger Alrorithmns kommt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_btc_address_32) {
            // Es wird geprüft ob sich noch 33 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 33) { close_by_error('INVALID_BITCOIN_P2WPK_ADDRESS'); return false; }

            // Die Adresse wird eingelesen
            let full_str = '';
            while(full_str.length !== 66) full_str = full_str + copyed_item.shift();

            // Die Adresse wird wiederhergestellt
            let recoded_address = bech32.encode('bc', Buffer.from(full_str, 'hex'));

            // Die Daten werden zurückgegeben
            print('bitcoin_pkh_address_readed', recoded_address);
            return { hex_str_lst:copyed_item, value:new AlternativeBlockchainAddressValue(recoded_address, 'btcadr', false) };
        }
        else if(extracted_item === op_codes.op_eth_address) {
            // Es wird geprüft ob sich noch 33 Einträge auf dem Stack befinden
            // wenn nicht handelt es sich um ein ungültiges Skript.
            if(copyed_item.length < 20) { close_by_error('INVALID_ETHEREUM_ADDRESS'); return false; }

            // Die Adresse wird ausgelesen
            let full_str = '0x';
            while(full_str.length !== 42) full_str = full_str + copyed_item.shift();

            // Es wird geprüft ob es sich um eine Ethereum Adresse handelt
            if(web3.utils.isAddress(full_str) !== true) {
                states.aborted = true;
                return false;
            }

            // Die Daten werden zurückgegeben
            print('web3_ethereum_address_readed', full_str);
            return { hex_str_lst:copyed_item, value:new AlternativeBlockchainAddressValue(full_str, 'ethadr', false) };
        }
        else {
            throw new Error('Invalid script');
        }
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

    // Wird ausgeführt um zu überprüfen ob als nächstes ein EMIT Call kommt
    async function next_inter_emit_call(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript beendet wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_emit_function) return false;

        // Das Aktuelle Item wird abgerufen
        let current_item = copyed_item.shift();

        // Die Eigentlichen Funktionen werden in einem Try ausgeführt
        try {
            // Es wird geprüft ob der Ausgang entsperrt werden soll
            if(current_item === op_codes.op_unlock) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'unlock', 'invalid script'); return false; }

                // Es wird geprüft ob 0 Daten angegeben wurden
                current_item = copyed_item.shift();
                if(current_item !== '00') { close_by_error('emit_call', 'unlock', 'invalid script'); return false; }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                print('emit_call', 'unlock');
                if(emit_vm_functions.unlock_script() !== true) { close_by_error('emit_call', 'unlock', 'invalid script'); return false; }

                // Die Daten werden zurückgegeben
                return { hex_str_list:copyed_item };
            }
            // Diese OP_CODE weist die VM an eine Signaturprüfung durchzuführen
            else if(current_item === op_codes.op_check_sig) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'check_sig', 'invalid script'); return false; }

                // Es wird geprüft ob 0 Daten angegeben wurden
                current_item = copyed_item.shift();
                if(current_item !== '00') { close_by_error('emit_call', 'check_sig', 'invalid script'); return false; }

                // Es wird geprüft ob bereits eine Signaturprüfung innerhalb dieses Skriptes durchgeührt wurde
                if(script_type === script_types.LOCKING && locking_was_check_sigs === true) { close_by_error('emit_call', 'check_sig', 'invalid script'); return false; }
                else if(script_type === script_types.UNLOCKING && unlocking_was_check_sigs === true) { close_by_error('emit_call', 'check_sig', 'invalid script'); return false; }

                // Es wird geprüft ob die Signaturen korrekt sind
                if((await validate_unlockscript_sig()) !== true) {
                    close_by_error('emit_call', 'check_sig', 'failed');
                    return { hex_str_list:[] }; 
                }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(emit_vm_functions.unlock_script() !== true) {
                    close_by_error('emit_call', 'check_sig', 'internal error');
                    return false; 
                }

                // Es wird Signalisiert dass eine Signaturprüfung durchgeführt wurde
                if(script_type === script_types.LOCKING) locking_was_check_sigs = true
                else if(script_type === script_types.UNLOCKING) unlocking_was_check_sigs = true;

                // Das Skript ist erfolgreich durchgeführt wurden
                print('emit_call', 'check_sig', 'ok');
                return { hex_str_list:copyed_item };
            }
            // Fügt einen neuen Berechtigen Schlüssel in die Verifyer liste hinzu
            else if(current_item === op_codes.op_add_verify_key) {
                // Es wird geprüft ob es sich um einen Parren Inner handelt
                current_item = copyed_item.shift();

                // Es wird geprüft ob es sich um einen Parren Inner handelt
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'add_verify_key', 'invalid script'); return false; }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argumente vorhanden sind
                if(total_items !== 1) { close_by_error('emit_call', 'add_verify_key', 'invalid script'); return false; }

                // Es wird geprüft ob als nächsts ein Öffentlicher Schlüssel kommt
                print('emit_call', 'add_verify_key');
                let public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
                if(public_key_declaration === false){
                    public_key_declaration = await next_read_altchain_address(copyed_item, script_type);
                    if(public_key_declaration === false) { close_by_error('emit_call', 'add_verify_key', 'invalid script'); return false; }
                }

                // Die neue Stackliste wird geschrieben
                copyed_item = public_key_declaration.hex_str_lst;

                // Es wird versucht den Öffentlichen Schlüssel hinzuzufügen
                if((await emit_vm_functions.add_verify_key(public_key_declaration.value)) !== true) { close_by_error('emit_call', 'add_verify_key', 'invalid script'); return false; }

                // Die anzahl der benötigten Signaturen wird neu festgelegt
                states.needs_sigs = BigInt(allowed_public_key_array.length);
                print('emit_call', 'set_needed_sigs', states.needs_sigs.toString());

                // Die Daten werden zurückgegeben
                return { hex_str_list:copyed_item };
            }
            // Fügt erst einen Öffentlichen Schlüssel hinzu und führt dann eine Signatur prüffung durch
            else if(current_item === op_codes.op_add_pk_sverify) {
                // Es wird geprüft ob bereits ein Öffentlicher Schlüssel auf dem PublicKey Stack liegt
                if(allowed_public_key_array.length !== 0) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                /* Die Öffentlichen Schlüssel werden hinzugefügt */

                // Es wird geprüft ob es sich um einen Parren Inner handelt
                current_item = copyed_item.shift();

                // Es wird geprüft ob es sich um einen Parren Inner handelt
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argumente vorhanden sind
                if(total_items !== 1) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                // Es wird geprüft ob als nächsts ein Öffentlicher Schlüssel kommt
                let public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
                if(public_key_declaration === false){
                    // Es wird geprüft ob es sich um eine Adresse handelt
                    public_key_declaration = await next_read_altchain_address(copyed_item, script_type);
                    if(public_key_declaration === false) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }
                }

                // Die neue Stackliste wird geschrieben
                copyed_item = public_key_declaration.hex_str_lst;

                // Es wird versucht den Öffentlichen Schlüssel hinzuzufügen
                if((await emit_vm_functions.add_verify_key(public_key_declaration.value)) !== true) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                // Es wird Signalisiert dass genau 1ne Signatur vorhadnen sein muus
                states.needs_sigs = BigInt(1);
                print('emit_call', 'set_needed_sigs', states.needs_sigs.toString());

                /* Die Signaturen werden geprüft */

                // Es wird geprüft ob die Signaturen korrekt sind
                if((await validate_unlockscript_sig()) !== true) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                // Es wird versucht die Ein / Ausgabe zu entsperrent
                if(emit_vm_functions.unlock_script() !== true) { close_by_error('emit_call', 'add_pk_sverify', 'invalid script'); return false; }

                // Das Skript ist erfolgreich durchgeführt wurden
                return { hex_str_list:copyed_item };
            }
            // Setzt die Anzahl der Mindestens benötigten Signaturen an
            else if(current_item === op_codes.op_set_n_of_m) {
                // Es wird geprüft ob es sich um einen Parren Inner handelt
                current_item = copyed_item.shift();

                // Es wird geprüft ob es sich um einen Parren Inner handelt
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'set_n_of_m', 'invalid script'); return false; }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argument vorhanden ist
                if(total_items !== 1) { close_by_error('emit_call', 'set_n_of_m', 'invalid script'); return false; }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = await next_read_number(copyed_item);
                if(number_read_result === false) { close_by_error('emit_call', 'set_n_of_m', 'invalid script'); return false; }
                copyed_item = number_read_result.hex_str_list;

                // Es wird geprüft ob die Zahl größer oder gleich 0 ist
                if(BigInt(0) >= number_read_result.int_value.value) { close_by_error('emit_call', 'set_n_of_m', 'invalid script'); return false; }

                // Es wird geprüft ob die Anzahl der Verfügabren PublicKeys größer ist als die Anzahl der Zulässigen
                if(BigInt(allowed_public_key_array.length) < number_read_result.int_value.value) { close_by_error('emit_call', 'set_n_of_m', 'invalid script'); return false; }

                // Die Zahl der benötigten Signaturen wird festgelegt
                print('emit_call', 'set_needed_sigs', number_read_result.int_value.value.toString());
                states.needs_sigs = number_read_result.int_value.value;

                // Die Daten werden zurückgegeben
                return { hex_str_list:copyed_item };
            }
            // Beendet die ausführung des gesamten Skriptes
            else if(current_item === op_codes.op_exit) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'exit', 'invalid script'); return false; }

                // Es wird geprüft ob 0 Daten angegeben wurden
                current_item = copyed_item.shift();
                if(current_item !== '00') { close_by_error('emit_call', 'exit', 'invalid script'); return false; }

                // Es wird Signalisiert dass das Skript beendet werden soll
                print('emit_call', 'exit_script');
                states.exit = true;

                // Das Skript ist erfolgreich durchgeführt wurden
                return { hex_str_list:[] };
            }
            // Wird ausgeführt wenn das Skript fehlerhaft abgebrochen werden soll
            else if(current_item === op_codes.op_script_abort) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) { close_by_error('emit_call', 'script_abort', 'invalid script'); return false; }

                // Es wird geprüft ob 0 Daten angegeben wurden
                current_item = copyed_item.shift();
                if(current_item !== '00') { close_by_error('emit_call', 'script_abort', 'invalid script'); return false; }

                // Es wird Signalisiert dass das Skript abgebrochen werden soll
                print('emit_call', 'abort_script');
                abort_script();

                // Das Skript ist erfolgreich durchgeführt wurden
                return { hex_str_list:[] };
            }
            // Wird ausgeführt um einen Wert auf das Skript zu legen
            else if(current_item === op_codes.op_push_to_y) {
                // Es wird versucht die ParrenCube werte auszulesen
                let push_function_parren = await next_read_parren_cube(copyed_item, script_type, true);
                if(push_function_parren === false) { close_by_error('emit_call', 'push_to_y', 'invalid script'); return false; }
                if(push_function_parren.items < 1) { close_by_error('emit_call', 'push_to_y', 'invalid script'); return false; }

                // Es wird versucht dein Eintrag auf das Stack zu legen
                for(let citem of push_function_parren.items) y_stack_array.push(citem);
                print('emit_call', 'add_to_y_stack', push_function_parren.items.length, 'items');

                // Die Daten werden zurückgegeben
                return { hex_str_list:push_function_parren.hex_str_list };
            }
            // Wird ausführt um zu Überprüfen ob die Angegebene Sperrzeit erreicht wurde
            else if(current_item == op_codes.op_check_locktimeverify) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) {
                    close_by_error('emit_call', 'check_locktimeverify', 'invalid script');
                    return false; 
                }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argument vorhanden ist
                if(total_items !== 1) { 
                    close_by_error('emit_call', 'check_locktimeverify', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = await next_read_number(copyed_item);
                if(number_read_result === false) {
                    close_by_error('emit_call', 'check_locktimeverify', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob es sich um einen Zulässigen Typen von Nummer handelt
                if([NumberType.bit8, NumberType.bit16, NumberType.bit32, NumberType.bit64, NumberType.bit128].includes(number_read_result.int_value.n_type) !== true) {
                    close_by_error('emit_call', 'check_locktimeverify', 'invalid script');
                    return false; 
                }

                // Die Neue List wird zwischengespeichert
                copyed_item = number_read_result.hex_str_list;
    
                // Es wird geprüft ob die Benötigte Zeit erreicht wurde
                let timestamp = number_read_result.int_value.value;
                if(current_timest.toNumber() >= timestamp) {
                    print('emit_call', 'check_locktimeverify', true);
                    return { hex_str_list:copyed_item };
                }

                // Die Daten werden zurückgegeben
                print('emit_call', 'check_locktimeverify', false);
                abort_script();
                return false;
            }
            // Wird ausgeführt um zu überprüfen ob die angegebene Sperrzeit in Form der Blockzeit erreicht wurde
            else if(current_item == op_codes.op_check_blockblockverify) {
                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) {
                    close_by_error('emit_call', 'check_blockblockverify', 'invalid script');
                    return false; 
                }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argument vorhanden ist
                if(total_items !== 1) { 
                    close_by_error('emit_call', 'check_blockblockverify', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob nachfolgend eine Nummer kommt
                let number_read_result = await next_read_number(copyed_item);
                if(number_read_result === false) {
                    close_by_error('emit_call', 'check_blockblockverify', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob es sich um einen Zulässigen Typen von Nummer handelt
                if([NumberType.bit8, NumberType.bit16, NumberType.bit32, NumberType.bit64].includes(number_read_result.int_value.n_type) !== true) {
                    close_by_error('emit_call', 'check_blockblockverify', 'invalid script');
                    return false; 
                }

                // Die Neue List wird zwischengespeichert
                copyed_item = number_read_result.hex_str_list;

                // Es wird geprüft ob der Benötigte Block erreicht oder überschritten wurde
                let unlock_hight = number_read_result.int_value.value + unlocking_data.wr_block_hight;
                if(c_block_hight >= unlock_hight) {
                    print('emit_call', 'check_blockblockverify', true);
                    return { hex_str_list:copyed_item };
                }

                // Die Daten werden zurückgegeben
                print('emit_call', 'check_blockblockverify', false);
                abort_script();
                return false;
            }
            // Wird ausgeführt wenn ein Commitment geprüft werden soll
            else if(current_item == op_codes.op_check_commitment) {
                // Es wird Geprüft ob es sich um ein Locking Script handelt, wenn nein wird das Skript abgebrochen
                if(script_type !== script_types.LOCKING) {
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.op_parren_fnc_cube) {
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false; 
                }

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argument vorhanden ist
                if(total_items !== 1) { 
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob als nächstes ein 96 Byte (192 Hex) Langer Hexwert vorhanden ist
                let readed_hex_str = await next_is_inter_hex_str(copyed_item, script_type);
                if(readed_hex_str === false) {
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob der Hexwert die Länge von 192 Zeichen erfüllt
                copyed_item = readed_hex_str.hex_str_list;
                if(readed_hex_str.value.value.length !== 192) {
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false;
                }

                // Es wird geprüft ob ein Commitment vorhanden ist
                if(commitment_data === null) {
                    close_by_error('emit_call', 'check_commitment', 'invalid script');
                    return false;
                }

                // Es wird ein SHA3_SHA2_256 Bit Hash aus dem Commitment erstellt
                let commitment_fully_hash = blockchain_crypto.sha2(256, blockchain_crypto.sha3(256, commitment_data.toFullyString()));

                // Es wird geprüft ob bereits Commitment Daten geprüft wurden
                if(commitment_was_succs !== false) {
                    close_by_error('emit_call', 'check_commitment', commitment_fully_hash, false, 'double check abort');
                    return false;
                }

                // Es wird geprüft ob das Commitment passend ist
                if((await blockchain_crypto.ecc.bls1231.verifySignature(commitment_data.pkey, readed_hex_str.value.value, commitment_fully_hash)) !== true) {
                    close_by_error('emit_call', 'check_commitment', commitment_fully_hash, false);
                    return false;
                }

                // Es wird Signalisiert, dass es sich um ein gültiges Commitment handelt
                emit_vm_functions.signalCommitmentValidate();

                // Die Daten werden zurückgegeben
                print('emit_call', 'check_commitment', commitment_fully_hash, true);
                return { hex_str_list:readed_hex_str.hex_str_list };
            }
            // Wird verwendet um zu überprüfen ob die Sequenz Prüfung korrekt ist
            else if(current_item == op_codes.op_checksequenceverify) {

            }
            // Es konnte kein gültiger Befehler gefunden werden
            else {
                close_by_error('emit_call', 'unkown function call');
                return false;
            }
        }
        catch(e) {
            // Es ist ein Schwerwiegender Fehler aufgetreten, dass Skript wird abgebrochen
            close_by_error('emit_call', 'exception'); print(e);
            return false;
        }
    };

    // Führt ein Hex String aus
    async function interpr_hex_string(hex_string, sub_call=0, script_type=null) {
        // Es wird geprüft ob es sich um einen String handelt
        if(typeof hex_string !== 'string') throw new Error('Invalid data');
        if(hex_string.length < 2) return { hex_str_list:[] };

        // Es wird geprüft ob das Stack die Maximalgröße von 1024 Einträgen übersteigt
        if(hex_string.length > 1024) throw new Error('Invalid data');

        // Der String wird in 2 Zeichen aufgedrennt
        let splited_hex_string = hex_string.toLowerCase().match(/.{2}/g);

        // Das Stack wird abgearbeitet bis er leer ist
        try {
            while(splited_hex_string.length > 0) {
                // Es wird geprüft ob das Skript beendet wurde
                if(script_running_aborted() === true) break;
    
                // Es wird geprüft ob es sich um einen EMIT Funktionsaufruf handelt
                let sitc_intrpr = await next_inter_if_function(splited_hex_string, script_type);
                if(sitc_intrpr !== false) {
                    splited_hex_string = sitc_intrpr.hex_str_list;
                    continue;
                }
    
                // Es wird geprüft ob das Skript beendet wurde
                if(script_running_aborted() === true) break;
    
                // Es wird geprüft ob es sich um einen EMIT Call handelt
                sitc_intrpr = await next_inter_emit_call(splited_hex_string, script_type);
                if(sitc_intrpr !== false) {
                    splited_hex_string = sitc_intrpr.hex_str_list;
                    continue;
                }
    
                // Es wird geprüft ob das Skript beendet wurde
                if(script_running_aborted() === true) break;
    
                // Es handelt sich um ein ungültes Skript
                console.log(splited_hex_string)
                throw new Error('Invalid hex script')
            }
        }
        catch(e) {
            close_by_error(e);
            return { hex_str_list:[] }; 
        }

        // Die Hexliste wird zurückgegeben
        return { hex_str_list:splited_hex_string };
    };

    // Diese Funktion führt Input sowie Output Script parallel voneinander aus
    async function main_ioscript() {
        // DEBUG MAIN Informationen
        print('--- SCRIPT_META_INFORMATION_START ---');
        if(commitment_data !== null) print('Commitment Script hex:', commitment_data.toFullyString());
        print('Unlocking Script hex:', unlocking_data.getScript());
        print('Locking Script hex:', locking_script);
        print('Unlocking Script hash:', unlocking_script_hash);
        print('Locking Script hash:', locking_script_hash)
        if(commitment_data !== null) print('Commitment Script hash:', blockchain_crypto.sha2(256, blockchain_crypto.sha3(256, commitment_data.toFullyString())))
        print('--- SCRIPT_META_INFORMATION_END ---');
        print();

        // Wird verwendet um die Verwendung eines neuen Vorgangs vorzubereiten
        states = new_reset_values();

        // Das Unlocking Script wird ausgeführt
        print('--- UNLOCKING_SCRIPT_DEBUG_START ---');
        await interpr_hex_string(unlocking_data.getScript(), false, script_types.UNLOCKING);
        print('--- UNLOCKING_SCRIPT_DEBUG_END ---');
        print();

        // Es wird geprüft ob der Erste Eintrag des Y Stacks ein True ist
        if(y_stack_array.length > 0) {
            if(y_stack_array[y_stack_array.length - 1] === SIG_CHECK_TRUE) y_stack_array.pop();
            else rule_cheatings++;
        }
        else rule_cheatings++;

        // Wird verwendet um die Verwendung eines neuen Vorgangs vorzubereiten
        let unlocking_state = clone_object(states);
        states = new_reset_values();

        // Das Locking Script wird eingelesen
        print('--- LOCKING_SCRIPT_DEBUG_START ---');
        await interpr_hex_string(locking_script, false, script_types.LOCKING);
        print('--- LOCKING_SCRIPT_DEBUG_END ---');
        let locking_state = { ...states };

        // Es wird geprüft ob auf dem Y Stack ein True liegt
        if(y_stack_array.length === 1) {
            if(y_stack_array[0] !== SIG_CHECK_TRUE) rule_cheatings++;
        }
        else {
            rule_cheatings++;
        }

        // Das Finale Objekt wird zurückgegeben
        return {
            pkeys:allowed_public_key_array,
            hashes: { unlock_script:unlocking_script_hash, locking_script:locking_script_hash },
            unlocking_script_result:unlocking_state.unlocked,
            locking_script_result:locking_state.unlocked,
            total_unlocked: ((rule_cheatings === 0) ?  (unlocking_state.unlocked === true && locking_state.unlocked === true) : false),
            needed_sigs:parseInt(unlocking_state.needs_sigs.toString()),
            state:'done', 
        }
    };

    // Führt beide Skripte aus und gibt die Ergebnisse zurück
    return (await main_ioscript());
};

// Exportiert den Interpreter
module.exports = hexed_script_interpreter;